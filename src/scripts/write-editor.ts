/**
 * /write 站内编辑器。
 *
 * 纯静态页面，没有服务端：
 *  - 已有文章从构建期生成的 /write-manifest.json 读取（草稿不进清单）
 *  - 草稿自动存 localStorage，图片以 dataURL 暂存在内存
 *  - 「下载 / 复制」可离线带走 Markdown
 *  - 配置发布桥接（Cloudflare Worker）后，一键把 .md 与图片提交到 GitHub
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import YAML from 'yaml';

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

type Fields = Record<string, any>;

const DRAFT_KEY = 'write:draft:v1';
const WORKER_KEY = 'write:worker';
const TOKEN_KEY = 'write:token';
/** CCF 门户「写成笔记」跨页传数据的临时通道 */
const PENDING_REFS_KEY = 'write:pending-refs';

type Ref = {
  key: string;
  title: string;
  authors: string[];
  year?: string;
  venue?: string;
  url?: string;
  doi?: string;
  arxiv?: string;
  pdf?: string;
  bibtex?: string;
};

const state = {
  fields: {} as Fields,
  body: '',
  slug: '',
  sourceFile: null as string | null,
  images: new Map<string, string>(),
  references: [] as Ref[],
  manifest: [] as { slug: string; file: string; title: string; content: string }[],
};

let katexMod: any = null;
try {
  const mod = await import('katex');
  katexMod = mod.default ?? mod;
} catch {
  katexMod = null;
}

/* ---------- 工具 ---------- */

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}

function setStatus(text: string, kind: 'ok' | 'warn' | 'idle' = 'idle') {
  const el = $('w-status');
  el.textContent = text;
  el.dataset.kind = kind;
}

function slugify(text: string) {
  const cleaned = (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned && !/[\u4e00-\u9fa5]/.test(cleaned)) return cleaned;
  return `post-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function splitFrontmatter(raw: string): { fields: Fields; body: string } {
  const clean = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = clean.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fields: {}, body: clean, };
  let fields: Fields = {};
  try {
    fields = YAML.parse(match[1]) || {};
  } catch {
    setStatus('frontmatter 解析失败，已按纯正文导入', 'warn');
  }
  return { fields, body: clean.slice(match[0].length).replace(/^\n+/, '') };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function listValue(v: string) {
  return v
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ---------- 表单 <-> 状态 ---------- */

const FIELD_IDS: Record<string, string> = {
  title: 'w-title',
  description: 'w-description',
  pubDate: 'w-pubdate',
  tags: 'w-tags',
  categories: 'w-categories',
  series: 'w-series',
  heroImage: 'w-hero',
};
const CHECK_IDS: Record<string, string> = {
  math: 'w-math',
  draft: 'w-draft',
  featured: 'w-featured',
};

function formToState() {
  const f: Fields = {};
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const value = ($(id) as HTMLInputElement).value.trim();
    if (!value) continue;
    if (key === 'tags' || key === 'categories') f[key] = listValue(value);
    else f[key] = value;
  }
  for (const [key, id] of Object.entries(CHECK_IDS)) {
    if (($(id) as HTMLInputElement).checked) f[key] = true;
  }
  state.fields = f;
  state.slug = ($('w-slug') as HTMLInputElement).value.trim() || slugify(f.title || '');
  state.body = ($('w-body') as HTMLTextAreaElement).value;
}

function stateToForm() {
  const f = state.fields;
  const set = (id: string, v: any) => {
    ($(id) as HTMLInputElement).value = v == null ? '' : String(v);
  };
  set('w-title', f.title || '');
  set('w-slug', state.slug);
  set('w-description', f.description || '');
  set('w-pubdate', f.pubDate ? String(f.pubDate).slice(0, 10) : today());
  set('w-tags', Array.isArray(f.tags) ? f.tags.join(', ') : f.tags || '');
  set('w-categories', Array.isArray(f.categories) ? f.categories.join(', ') : f.categories || '');
  set('w-series', f.series || '');
  set('w-hero', f.heroImage || '');
  for (const [key, id] of Object.entries(CHECK_IDS)) {
    ($(id) as HTMLInputElement).checked = Boolean(f[key]);
  }
  ($('w-body') as HTMLTextAreaElement).value = state.body;
}

function buildFile() {
  const f = { ...state.fields };
  if (!f.title) f.title = '未命名笔记';
  if (!f.description) {
    f.description = state.body
      .replace(/\[@[A-Za-z0-9_:-]+\]/g, '')
      .replace(/[#*`>\-\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 110);
  }
  if (!f.pubDate) f.pubDate = today();
  if (state.references.length) {
    f.references = state.references.map((ref) =>
      Object.fromEntries(Object.entries(ref).filter(([, v]) => v !== '' && v != null && (!Array.isArray(v) || v.length)))
    );
  }
  const yaml = YAML.stringify(f, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${state.body.replace(/^\n+/, '').trimEnd()}\n`;
}

/* ---------- 文献引用 ---------- */

function extractReferences(fields: Fields): Ref[] {
  const raw = Array.isArray(fields.references) ? fields.references : [];
  delete fields.references;
  return raw
    .map((r: any) => ({
      key: String(r.key || ''),
      title: String(r.title || ''),
      authors: Array.isArray(r.authors) ? r.authors.map(String) : [],
      year: r.year ? String(r.year) : '',
      venue: r.venue ? String(r.venue) : '',
      url: r.url ? String(r.url) : '',
      doi: r.doi ? String(r.doi) : '',
      arxiv: r.arxiv ? String(r.arxiv) : '',
      pdf: r.pdf ? String(r.pdf) : '',
      bibtex: r.bibtex ? String(r.bibtex) : '',
    }))
    .filter((r: Ref) => r.key && r.title);
}

function renderRefs() {
  const box = $('w-refs');
  if (!box) return;
  const counter = $('w-ref-count');
  if (counter) counter.textContent = String(state.references.length);
  box.innerHTML = '';
  if (!state.references.length) {
    box.innerHTML = '<p class="w-hint">还没有引用。在 CCF 论文卡片点「写成笔记」会自动带入，或在下方粘贴 BibTeX。</p>';
    return;
  }
  state.references.forEach((ref, index) => {
    const row = document.createElement('div');
    row.className = 'w-ref-row';
    const num = document.createElement('span');
    num.className = 'w-ref-num';
    num.textContent = `[${index + 1}]`;
    const info = document.createElement('div');
    info.className = 'w-ref-info';
    const title = document.createElement('div');
    title.className = 'w-ref-title';
    title.textContent = ref.title;
    const meta = document.createElement('div');
    meta.className = 'w-ref-meta';
    meta.textContent =
      [ref.authors?.slice(0, 3).join(', '), ref.venue, ref.year].filter(Boolean).join(' · ') +
      ` · @${ref.key}`;
    info.append(title, meta);
    const insert = document.createElement('button');
    insert.type = 'button';
    insert.className = 'w-mini';
    insert.textContent = '插入引用';
    insert.addEventListener('click', () => insertAtCursor(`[@${ref.key}]`));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'w-mini';
    remove.textContent = '移除';
    remove.addEventListener('click', () => {
      state.references.splice(index, 1);
      renderRefs();
      renderPreview();
      saveDraft();
    });
    row.append(num, info, insert, remove);
    box.append(row);
  });
}

function parseBibtex(raw: string): Ref | null {
  const text = raw.trim();
  const head = text.match(/@[A-Za-z]+\s*\{\s*([^,\s]+)\s*,/);
  if (!head) return null;
  const field = (name: string) => {
    const hit = text.match(new RegExp(`${name}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*,?`, 'i'));
    return hit ? hit[1].replace(/\s+/g, ' ').trim() : '';
  };
  const doiRaw = field('doi');
  return {
    key: head[1],
    title: field('title') || head[1],
    authors: field('author').split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean),
    year: field('year'),
    venue: field('booktitle') || field('journal'),
    url: field('url'),
    doi: doiRaw ? (doiRaw.startsWith('http') ? doiRaw : `https://doi.org/${doiRaw}`) : '',
    bibtex: text,
  };
}

function mergeRefs(refs: Ref[]) {
  let added = 0;
  for (const ref of refs) {
    if (!ref || !ref.key || !ref.title) continue;
    if (state.references.some((r) => r.key === ref.key)) continue;
    state.references.push(ref);
    added++;
  }
  return added;
}

function consumePendingRefs(): Ref[] {
  try {
    const raw = localStorage.getItem(PENDING_REFS_KEY);
    if (!raw) return [];
    localStorage.removeItem(PENDING_REFS_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildNoteSkeleton(refs: Ref[]) {
  const cites = refs.map((r) => `[@${r.key}]`).join(' ');
  const overview = refs.map((r) => `- [@${r.key}] ${r.title}`).join('\n');
  return `## 这篇论文想解决什么\n\n${cites}\n\n## 方法 / 关键结论\n\n\n\n## 我的疑问\n\n\n\n## 参考文献速览\n\n${overview}\n`;
}

/* ---------- 预览 ---------- */

function renderPreview() {
  let src = state.body;
  for (const [name, dataUrl] of state.images) {
    src = src.split(`/posts/${state.slug}/${name}`).join(dataUrl);
  }
  // [@key] 在预览里也显示为上标编号，与线上文章页一致
  src = src.replace(/\[@([A-Za-z0-9_:-]+)\]/g, (whole, key) => {
    const index = state.references.findIndex((r) => r.key === key);
    return index >= 0 ? `<sup class="cite-ref">[${index + 1}]</sup>` : whole;
  });

  const mathTokens: { display: boolean; tex: string }[] = [];
  const token = (display: boolean, tex: string) => {
    mathTokens.push({ display, tex });
    return `WBXMATH${mathTokens.length - 1}TOKENZ`;
  };
  src = src.replace(/\$\$([\s\S]*?)\$\$/g, (_, t) => `\n\n${token(true, t)}\n\n`);
  src = src.replace(/\$([^$\n]+?)\$/g, (_, t) => token(false, t));

  let html = marked.parse(src, { gfm: true, breaks: false }) as string;
  html = html.replace(/WBXMATH(\d+)TOKENZ/g, (_, i) => {
    const item = mathTokens[Number(i)];
    if (!item) return '';
    if (katexMod?.renderToString) {
      try {
        return katexMod.renderToString(item.tex, {
          displayMode: item.display,
          throwOnError: false,
        });
      } catch {
        /* 降级为原文 */
      }
    }
    return `<code class="w-math-fallback">${escapeHtml(item.tex)}</code>`;
  });

  // 站点构建期的 shiftHeadings 会把正文 h1~h6 整体降一级，预览保持一致，
  // 否则作者看到的层级与发布后的页面不一致。
  html = html
    .replace(/<h([1-6])(\s[^>]*)?>/g, (_, n, rest = '') => `<h${Math.min(6, Number(n) + 1)}${rest}>`)
    .replace(/<\/h([1-6])>/g, (_, n) => `</h${Math.min(6, Number(n) + 1)}>`);

  $('w-preview').innerHTML = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
  const text = state.body.replace(/[#*`>\-\[\]()]/g, ' ').trim();
  $('w-wordcount').textContent = `${text.replace(/\s/g, '').length} 字 · ${state.body.split('\n').length} 行`;
}

/* ---------- 草稿 ---------- */

let saveTimer: number | undefined;
function saveDraft(showLabel = true) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const payload = {
      fields: state.fields,
      body: state.body,
      slug: state.slug,
      sourceFile: state.sourceFile,
      images: [...state.images] as [string, string][],
      references: state.references,
      savedAt: Date.now(),
    };
    const write = (withImages: boolean) => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify(withImages ? payload : { ...payload, images: [] })
      );
    };
    try {
      write(true);
    } catch {
      try {
        write(false);
        setStatus('图片较大，草稿仅保存了文字；图片请在本次会话内发布', 'warn');
        return;
      } catch {
        setStatus('草稿保存失败（本地存储空间不足）', 'warn');
        return;
      }
    }
    if (showLabel) {
      $('w-saved').textContent = `草稿已保存 ${new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
  }, 500);
}

function readDraft(): any | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function restoreDraft(d: any) {
  state.fields = d.fields || {};
  state.body = d.body || '';
  state.slug = d.slug || '';
  state.sourceFile = d.sourceFile || null;
  state.images = new Map((d.images || []) as [string, string][]);
  state.references = (d.references || []) as Ref[];
  stateToForm();
  renderPreview();
  renderImages();
  renderRefs();
  ($('w-open') as HTMLSelectElement).value = state.sourceFile || '';
  $('w-draft-banner').hidden = true;
  setStatus('已恢复本地草稿', 'ok');
}

/* ---------- 图片 ---------- */

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function insertAtCursor(text: string) {
  const ta = $('w-body') as HTMLTextAreaElement;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? start;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + text.length;
  ta.focus();
  onBodyChange();
}

async function addImages(files: FileList | File[]) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  for (const file of images) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const name = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    state.images.set(name, await fileToDataUrl(file));
    insertAtCursor(`\n![${file.name.replace(/\.[^.]+$/, '')}](/posts/${state.slug}/${name})\n`);
  }
  renderImages();
  setStatus(`已加入 ${images.length} 张图片，发布时会一并上传`, 'ok');
}

function renderImages() {
  const box = $('w-images');
  box.innerHTML = '';
  if (!state.images.size) {
    box.innerHTML = '<p class="w-hint">还没有本地图片。拖入 / 粘贴图片会自动归到 /posts/&lt;slug&gt;/。</p>';
    return;
  }
  for (const [name, dataUrl] of state.images) {
    const row = document.createElement('div');
    row.className = 'w-img-row';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = name;
    const label = document.createElement('span');
    label.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '移除';
    remove.className = 'w-mini';
    remove.addEventListener('click', () => {
      state.images.delete(name);
      renderImages();
      saveDraft();
    });
    row.append(img, label, remove);
    box.append(row);
  }
}

/* ---------- 载入 / 新建 / 导入 ---------- */

function loadPost(entry: { slug: string; file: string; content: string }) {
  const { fields, body } = splitFrontmatter(entry.content);
  state.references = extractReferences(fields);
  state.fields = fields;
  state.body = body;
  state.slug = entry.slug;
  state.sourceFile = entry.file;
  state.images.clear();
  stateToForm();
  renderPreview();
  renderImages();
  renderRefs();
  setStatus(`已载入 ${entry.file}，修改后可直接发布`, 'ok');
}

function newPost(skipSave = false) {
  state.fields = { pubDate: today(), tags: [], categories: [] };
  state.body = '';
  state.slug = slugify('');
  state.sourceFile = null;
  state.images.clear();
  state.references = [];
  stateToForm();
  renderPreview();
  renderImages();
  renderRefs();
  ($('w-open') as HTMLSelectElement).value = '';
  setStatus('新建空白笔记', 'idle');
  if (!skipSave) saveDraft(false);
  setTab('edit');
}

async function importMarkdown(file: File) {
  const text = await file.text();
  const { fields, body } = splitFrontmatter(text);
  const hasFrontmatter = Object.keys(fields).length > 0;
  state.references = extractReferences(fields);
  state.fields = hasFrontmatter
    ? fields
    : { title: file.name.replace(/\.(md|mdx)$/i, ''), pubDate: today() };
  state.body = hasFrontmatter ? body : text;
  state.slug = slugify(state.fields.title || file.name);
  state.sourceFile = null;
  state.images.clear();
  stateToForm();
  renderPreview();
  renderImages();
  renderRefs();
  ($('w-open') as HTMLSelectElement).value = '';
  setStatus(`已导入 ${file.name}，检查元数据后即可发布`, 'ok');
}

/* ---------- 导出 ---------- */

function download(name: string, content: string, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- 发布 ---------- */

async function publish() {
  formToState();
  const worker = (localStorage.getItem(WORKER_KEY) || '').trim();
  const token = (localStorage.getItem(TOKEN_KEY) || '').trim();
  if (!worker) {
    ($('w-settings') as HTMLDetailsElement).open = true;
    setStatus('请先在「发布设置」里填写 Worker 地址（或先用下载 / 复制离线带走）', 'warn');
    return;
  }
  if (!state.fields.title) {
    setStatus('请先填写标题', 'warn');
    return;
  }
  const btn = $('w-publish') as HTMLButtonElement;
  btn.disabled = true;
  setStatus('正在提交到 GitHub…', 'idle');
  const path = state.sourceFile
    ? `src/content/blog/${state.sourceFile}`
    : `src/content/blog/${state.slug}.md`;
  const images = [...state.images].map(([name, dataUrl]) => ({
    path: `public/posts/${state.slug}/${name}`,
    content: dataUrl.split(',')[1] || '',
  }));
  try {
    const res = await fetch(worker.replace(/\/+$/, '') + '/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        path,
        content: buildFile(),
        images,
        message: `docs(blog): ${state.fields.title} (via /write)`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setStatus('已提交，GitHub Actions 正在部署（约 1 分钟）', 'ok');
    state.images.clear();
    renderImages();
    saveDraft(false);
  } catch (err) {
    setStatus(`发布失败：${err instanceof Error ? err.message : String(err)}`, 'warn');
  } finally {
    btn.disabled = false;
  }
}

/* ---------- 事件绑定 ---------- */

function onBodyChange() {
  state.body = ($('w-body') as HTMLTextAreaElement).value;
  renderPreview();
  saveDraft();
}

function init() {
  if (!$('w-body')) return;

  ($('w-worker') as HTMLInputElement).value = localStorage.getItem(WORKER_KEY) || '';
  ($('w-token') as HTMLInputElement).value = localStorage.getItem(TOKEN_KEY) || '';

  $('w-settings-save').addEventListener('click', () => {
    localStorage.setItem(WORKER_KEY, ($('w-worker') as HTMLInputElement).value.trim());
    localStorage.setItem(TOKEN_KEY, ($('w-token') as HTMLInputElement).value.trim());
    setStatus('发布设置已保存在本机浏览器', 'ok');
  });

  fetch('/write-manifest.json')
    .then((r) => r.json())
    .then((data) => {
      state.manifest = data.posts || [];
      const select = $('w-open') as HTMLSelectElement;
      for (const p of state.manifest) {
        const opt = document.createElement('option');
        opt.value = p.file;
        opt.textContent = `${p.title}  (${p.file})`;
        select.append(opt);
      }
      const params = new URLSearchParams(location.search);
      const edit = params.get('edit');
      if (edit) {
        const found = state.manifest.find((p) => p.slug === edit || p.file === edit);
        if (found) loadPost(found);
        else setStatus(`清单里没有找到 ${edit}`, 'warn');
      }
    })
    .catch(() => setStatus('文章清单加载失败，仍可新建 / 导入 / 下载', 'warn'));

  $('w-open').addEventListener('change', (e) => {
    const file = (e.target as HTMLSelectElement).value;
    if (!file) return;
    const found = state.manifest.find((p) => p.file === file);
    if (found) loadPost(found);
  });

  $('w-new').addEventListener('click', () => newPost());
  $('w-import').addEventListener('click', () => $('w-file').click());
  $('w-file').addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) importMarkdown(file);
    (e.target as HTMLInputElement).value = '';
  });
  $('w-image').addEventListener('click', () => $('w-image-file').click());
  $('w-image-file').addEventListener('change', (e) => {
    addImages((e.target as HTMLInputElement).files || []);
    (e.target as HTMLInputElement).value = '';
  });

  $('w-body').addEventListener('input', onBodyChange);
  $('w-body').addEventListener('paste', (e) => {
    const items = (e as ClipboardEvent).clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      addImages(files);
    }
  });

  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const dt = (e as DragEvent).dataTransfer;
    if (!dt?.files?.length) return;
    const md = [...dt.files].find((f) => /\.(md|mdx)$/i.test(f.name));
    if (md) importMarkdown(md);
    else addImages(dt.files);
  });

  $('w-title').addEventListener('input', () => {
    const title = ($('w-title') as HTMLInputElement).value;
    const slugEl = $('w-slug') as HTMLInputElement;
    if (!slugEl.dataset.touched && !state.sourceFile) slugEl.value = slugify(title);
    formToState();
    saveDraft();
  });
  $('w-slug').addEventListener('input', (e) => {
    (e.target as HTMLInputElement).dataset.touched = '1';
    formToState();
    saveDraft();
  });
  for (const id of [...Object.values(FIELD_IDS), ...Object.values(CHECK_IDS)]) {
    if (id === 'w-title') continue;
    $(id).addEventListener('input', () => {
      formToState();
      saveDraft();
    });
    $(id).addEventListener('change', () => {
      formToState();
      saveDraft();
    });
  }

  $('w-copy').addEventListener('click', async () => {
    formToState();
    try {
      await navigator.clipboard.writeText(buildFile());
      setStatus('完整 Markdown（含 frontmatter）已复制到剪贴板', 'ok');
    } catch {
      setStatus('复制失败，请改用「下载 .md」', 'warn');
    }
  });
  $('w-download').addEventListener('click', () => {
    formToState();
    download(`${state.slug || 'post'}.md`, buildFile());
    setStatus('已下载 .md，放到 src/content/blog/ 即可', 'ok');
  });
  $('w-download-images').addEventListener('click', () => {
    if (!state.images.size) {
      setStatus('没有待下载的本地图片', 'warn');
      return;
    }
    let i = 0;
    for (const [name, dataUrl] of state.images) {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = name;
        a.click();
      }, i++ * 350);
    }
    setStatus(`正在下载 ${i} 张图片，请放入 public/posts/${state.slug}/`, 'ok');
  });
  $('w-publish').addEventListener('click', publish);

  $('w-bib-add').addEventListener('click', () => {
    const input = $('w-bib-input') as HTMLTextAreaElement;
    const raw = input.value.trim();
    if (!raw) {
      setStatus('请先粘贴 BibTeX', 'warn');
      return;
    }
    const ref = parseBibtex(raw);
    if (!ref || !ref.title) {
      setStatus('BibTeX 解析失败，需要 @article{key, ...} 这种格式', 'warn');
      return;
    }
    if (!mergeRefs([ref])) {
      setStatus(`引用 @${ref.key} 已经在列表里了`, 'warn');
      return;
    }
    input.value = '';
    renderRefs();
    renderPreview();
    saveDraft();
    setStatus(`已添加引用 @${ref.key}，点「插入引用」可插入 [@key]`, 'ok');
  });

  $('w-tab-edit').addEventListener('click', () => setTab('edit'));
  $('w-tab-preview').addEventListener('click', () => setTab('preview'));

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      formToState();
      saveDraft();
      setStatus('草稿已保存（Ctrl+S）', 'ok');
    }
  });

  const draft = readDraft();
  const hasDraft = Boolean(draft && (draft.body || draft.fields?.title));
  const pendingRefs = consumePendingRefs();

  if (pendingRefs.length) {
    // 从 CCF 点「写成笔记」过来：先保住未发布草稿，再把引用并进来，
    // 任何时候都不覆盖用户已经写下的正文。
    if (hasDraft) restoreDraft(draft);
    else newPost(true);
    const added = mergeRefs(pendingRefs);
    if (!state.body.trim()) {
      state.body = buildNoteSkeleton(state.references);
      const first = state.references[0];
      if (first?.venue && !state.fields.title) {
        state.fields.title = `${first.venue} ${first.year || ''} 阅读笔记`.trim();
      }
      if (first?.venue) state.fields.tags = [first.venue];
    }
    stateToForm();
    renderPreview();
    renderRefs();
    saveDraft(false);
    setStatus(`已从 CCF 带入 ${added} 篇文献，生成了笔记骨架`, 'ok');
  } else {
    if (hasDraft) {
      $('w-draft-banner').hidden = false;
      $('w-draft-time').textContent = draft.savedAt
        ? new Date(draft.savedAt).toLocaleString('zh-CN')
        : '未知时间';
      $('w-draft-restore').addEventListener('click', () => restoreDraft(draft));
      $('w-draft-discard').addEventListener('click', () => {
        localStorage.removeItem(DRAFT_KEY);
        $('w-draft-banner').hidden = true;
      });
    }
    newPost(hasDraft);
    renderImages();
  }
}

function setTab(which: 'edit' | 'preview') {
  const root = $('w-editor');
  root.dataset.tab = which;
  for (const [id, value] of [
    ['w-tab-edit', 'edit'],
    ['w-tab-preview', 'preview'],
  ] as const) {
    $(id).classList.toggle('is-active', value === which);
    $(id).setAttribute('aria-selected', String(value === which));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
