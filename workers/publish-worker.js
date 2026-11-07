/**
 * /write 的一键发布桥接（Cloudflare Worker，可选组件）。
 *
 * 为什么需要它：GitHub 的 Contents API 需要 token，而纯静态页面不能藏密钥。
 * Worker 只做一件事——校验「编辑器口令」，然后用服务端的 fine-grained PAT
 * 把 .md 与图片提交到 main，由现有 GitHub Actions 自动构建部署。
 * 不部署它，编辑器依然可以写作、预览、导入、复制、下载。
 *
 * ── 部署步骤 ──────────────────────────────────────────────
 * 1. GitHub → Settings → Developer settings → Personal access tokens
 *    → Fine-grained tokens → Generate new token
 *    - Repository access: 只选 RisingInsight/RisingInsight.github.io
 *    - Permissions → Repository permissions → Contents: Read and write
 *    （不要给任何其他权限；这个 token 只能改这一个仓库的内容）
 * 2. Cloudflare Dashboard → Workers & Pages → Create Worker，把本文件内容贴进去。
 * 3. Worker → Settings → Variables and Secrets 添加：
 *    - GITHUB_TOKEN   = 第 1 步的 PAT（设为 Secret / Encrypt）
 *    - EDITOR_TOKEN   = 自己想一个长口令（设为 Secret / Encrypt）
 *    - GITHUB_REPO    = RisingInsight/RisingInsight.github.io
 *    - GITHUB_BRANCH  = main（可选，默认 main）
 *    - ALLOWED_ORIGIN = https://risinginsight.github.io（可选，留空则不校验来源）
 * 4. 记下 Worker 地址，在 /write →「发布设置」里填地址和 EDITOR_TOKEN。
 *    口令只存在你自己的浏览器 localStorage，不写进仓库。
 * 5. 【可选：收藏夹跨设备同步】Worker → Settings → Variables → KV Namespace Bindings，
 *    绑定一个 KV，变量名必须是 LIBRARY。/ccf/ 的「我的收藏」会自动 PUT/GET /library，
 *    并支持想读 / 在读 / 已读三态。不绑定 KV 时该接口返回 503，收藏仍只存本机。
 * 6. 本地调试：wrangler dev（需在项目外建 .dev.vars），
 *    /write 的 Worker 地址填 http://127.0.0.1:8787。
 *
 * 安全说明：任何人拿到 Worker 地址也发不了内容，必须同时持有 EDITOR_TOKEN。
 * 建议再开启 Cloudflare 的速率限制；不要把 PAT 或口令提交进 git。
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_BODY = 12 * 1024 * 1024; // 12MB，含 base64 图片
const MD_PATH = /^src\/content\/blog\/[A-Za-z0-9._-]+\.(md|mdx)$/;
const ASSET_PATH = /^public\/posts\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function contentsUrl(env, path) {
  return `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
}

function apiHeaders(env) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'risinginsight-write-bridge',
  };
}

async function currentSha(env, path, branch) {
  const res = await fetch(`${contentsUrl(env, path)}?ref=${encodeURIComponent(branch)}`, {
    headers: apiHeaders(env),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`读取 ${path} 失败：GitHub ${res.status}`);
  const data = await res.json();
  return data.sha || null;
}

async function putFile(env, path, base64, message, branch) {
  const sha = await currentSha(env, path, branch);
  const body = { message, content: base64, branch };
  if (sha) body.sha = sha; // 更新已有文件必须带 sha
  const res = await fetch(contentsUrl(env, path), {
    method: 'PUT',
    headers: apiHeaders(env),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`提交 ${path} 失败：GitHub ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return { path, action: sha ? 'updated' : 'created', commit: data.commit?.sha || '' };
}

/**
 * 收藏夹云端同步（可选）。
 * 需要给 Worker 绑定一个 KV namespace，变量名 LIBRARY。
 * 未绑定时接口返回 503，前端会自动退回纯 localStorage，不影响使用。
 */
const LIBRARY_KEY = 'library:v1';

async function handleLibrary(request, env) {
  let payload = {};
  if (request.method === 'PUT') {
    const raw = await request.text();
    if (raw.length > 2 * 1024 * 1024) return json({ error: '收藏数据过大' }, 413);
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: '请求体不是合法 JSON' }, 400);
    }
  }
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '') || payload.token ||
    new URL(request.url).searchParams.get('token') || '';
  if (!env.EDITOR_TOKEN || token !== env.EDITOR_TOKEN) {
    return json({ error: '编辑器口令不正确' }, 401);
  }
  if (!env.LIBRARY) {
    return json({ error: 'Worker 未绑定 LIBRARY KV namespace' }, 503);
  }

  if (request.method === 'GET') {
    const raw = await env.LIBRARY.get(LIBRARY_KEY);
    if (!raw) return json({ ok: true, library: null, updatedAt: 0 });
    try {
      const parsed = JSON.parse(raw);
      return json({ ok: true, library: parsed.library || parsed, updatedAt: parsed.updatedAt || 0 });
    } catch {
      return json({ ok: true, library: null, updatedAt: 0 });
    }
  }
  if (request.method === 'PUT') {
    const library = payload.library;
    if (!library || typeof library !== 'object' || Array.isArray(library)) {
      return json({ error: 'library 格式不正确' }, 400);
    }
    const updatedAt = Date.now();
    await env.LIBRARY.put(LIBRARY_KEY, JSON.stringify({ library, updatedAt }));
    return json({ ok: true, updatedAt });
  }
  return json({ error: 'Method not allowed' }, 405);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({
        ok: true,
        repo: env.GITHUB_REPO || '(未设置)',
        tokenConfigured: Boolean(env.GITHUB_TOKEN),
        editorTokenConfigured: Boolean(env.EDITOR_TOKEN),
      });
    }
    if (url.pathname === '/library' && (request.method === 'GET' || request.method === 'PUT')) {
      return handleLibrary(request, env);
    }
    if (url.pathname !== '/publish' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404);
    }

    if (env.ALLOWED_ORIGIN) {
      const origin = request.headers.get('Origin');
      if (origin && origin !== env.ALLOWED_ORIGIN) {
        return json({ error: '来源不被允许' }, 403);
      }
    }
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO || !env.EDITOR_TOKEN) {
      return json({ error: 'Worker 缺少 GITHUB_TOKEN / GITHUB_REPO / EDITOR_TOKEN 配置' }, 500);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: '内容过大（上限 12MB）' }, 413);

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: '请求体不是合法 JSON' }, 400);
    }

    const { token, path, content, images = [], message } = payload;
    if (token !== env.EDITOR_TOKEN) return json({ error: '编辑器口令不正确' }, 401);
    if (typeof path !== 'string' || !MD_PATH.test(path)) {
      return json({ error: '文章路径不合法' }, 400);
    }
    if (typeof content !== 'string' || !content.trim()) {
      return json({ error: '文章内容为空' }, 400);
    }
    if (!Array.isArray(images) || images.length > 40) {
      return json({ error: '图片数量不合法' }, 400);
    }
    for (const img of images) {
      if (!img || typeof img.path !== 'string' || !ASSET_PATH.test(img.path)) {
        return json({ error: `图片路径不合法：${img?.path}` }, 400);
      }
      if (typeof img.content !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(img.content)) {
        return json({ error: `图片内容不是合法 base64：${img.path}` }, 400);
      }
    }

    const branch = env.GITHUB_BRANCH || 'main';
    const commitMessage = typeof message === 'string' && message.trim()
      ? message.slice(0, 160)
      : 'docs(blog): update via /write';

    try {
      const results = [];
      // 先提交图片，再提交文章，保证文章上线时图片已经在仓库里
      for (const img of images) {
        results.push(await putFile(env, img.path, img.content, commitMessage, branch));
      }
      results.push(await putFile(env, path, toBase64(content), commitMessage, branch));
      return json({
        ok: true,
        committed: results,
        note: '已推送到 main，GitHub Actions 会在约 1 分钟内部署到 GitHub Pages。',
      });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 502);
    }
  },
};
