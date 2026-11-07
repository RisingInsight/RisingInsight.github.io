/**
 * CCF 第七版目录全量扩展：解析目录中尚未收录的会议/期刊的 OpenAlex source ID。
 * 输入 .tmp-patch/ccf7-official.json（官方结构化数据），
 * 输出 .tmp-patch/ccf7-resolved.json（含拟新增 venue 配置）与解析报告。
 *
 * 用法：node scripts/expand-ccf.mjs
 */
import fs from 'node:fs';

const STATE_DIR = '.tmp-patch';
fs.mkdirSync(STATE_DIR, { recursive: true }); // CI 全新 checkout 没有该目录
// 触发标记 2026-11-07：CI 全量扩展（OpenAlex 配额以 CI 出口 IP 计）
// --max N：单次最多解析 N 个新条目（CI 分块跑，超时也能保住进度）
const MAX_NEW = (() => {
  const i = process.argv.indexOf('--max');
  return i > -1 ? Number(process.argv[i + 1]) || Infinity : Infinity;
})();
const MAILTO = '1668676243%40qq.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let oaLast = 0;

async function oaJson(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = Math.max(0, 600 - (Date.now() - oaLast));
    if (wait) await sleep(wait);
    oaLast = Date.now();
    const res = await fetch(url);
    if (res.status === 429 || res.status === 403) {
      await sleep(8000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`OA ${res.status}`);
    return res.json();
  }
  throw new Error('OA rate limited');
}

// ---- 载入官方目录与现有 venue，求差集 ----
const CATALOG_FILE = fs.existsSync('scripts/data/ccf7-official.json')
  ? 'scripts/data/ccf7-official.json'
  : '.tmp-patch/ccf7-official.json'; // 本地旧路径兼容
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// 从源码直接抽取现有 venue 的 id/简称/全名（避免 Node 导入 .ts 的麻烦）
const venuesTs = fs.readFileSync('src/data/venues.ts', 'utf8');
const existingIds = new Set([...venuesTs.matchAll(/id: '([^']+)'/g)].map((m) => m[1]));
const existingSearch = new Set([
  ...[...venuesTs.matchAll(/(?:short|full): '([^']+)'/g)].map((m) => slug(m[1].toLowerCase())),
  ...existingIds,
]);

const AREA_BY_CATEGORY = {
  0: 'arch', 1: 'network', 2: 'security', 3: 'se', 4: 'data',
  5: 'theory', 6: 'multimedia', 7: 'ai', 8: 'hci', 9: 'cross',
};

function dblpKey(url) {
  const m = String(url || '').match(/dblp\.[a-z.]+\/db\/(journals|conf)\/([a-z0-9]+)/i);
  return m ? m[2] : '';
}

const worklist = [];
const skippedExisting = [];
for (const kindKey of ['journals', 'conferences']) {
  const kind = kindKey === 'journals' ? 'journal' : 'conference';
  for (const e of catalog[kindKey]) {
    const id = slug(e.abbr || e.name).slice(0, 24);
    if (!id) continue;
    if (existingIds.has(id) || existingSearch.has(slug(e.abbr)) || existingSearch.has(slug(e.name))) {
      skippedExisting.push(id);
      continue;
    }
    worklist.push({
      id,
      kind,
      area: AREA_BY_CATEGORY[e.category_id] || 'cross',
      rank: e.rank,
      abbr: e.abbr || '',
      name: e.name,
      dblp: dblpKey(e.url),
      category: catalog.category.find((c) => c.id === e.category_id)?.chinese || '',
    });
  }
}
// A/B 类优先解析（OpenAlex 配额有限时保证高价值 venue 先完成）
worklist.sort((a, b) => {
  const pri = { A: 0, B: 1, C: 2 };
  const byRank = (pri[a.rank] ?? 3) - (pri[b.rank] ?? 3);
  if (byRank !== 0) return byRank;
  return a.kind === 'conference' ? -1 : 1; // 会议优先补全（顶会浏览为主）
});
console.log(`目录 ${catalog.journals.length + catalog.conferences.length} 条，已收录 ${skippedExisting.length} 条，待解析 ${worklist.length} 条`);
fs.writeFileSync(STATE_DIR + '/ccf7-worklist.json', JSON.stringify(worklist, null, 1));

// ---- 名称匹配打分（与 resolve-openalex.mjs 同思路）----
const FILLER = new Set(['the', 'a', 'an', 'of', 'on', 'in', 'and', 'for', 'annual', 'international', 'conference', 'conferences', 'symposium', 'journal', 'journals', 'advances', 'proceedings', 'joint', 'acm', 'ieee', 'cvf', 'sig', 'european']);
function coreWords(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((w) => w && !FILLER.has(w));
}
function scoreMatch(query, display) {
  const a = coreWords(query).join(' ');
  const b = coreWords(display).join(' ');
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 80;
  const wa = a.split(' ');
  const wb = new Set(b.split(' '));
  let hit = 0;
  wa.forEach((w) => { if (wb.has(w)) hit++; });
  return wa.length ? (hit / wa.length) * 60 : 0;
}

const results = [];
const failed = [];
// 断点续跑：之前解析过的直接沿用
const RESULT_FILE = STATE_DIR + '/ccf7-resolved.json';
const prevResults = fs.existsSync(RESULT_FILE) ? JSON.parse(fs.readFileSync(RESULT_FILE, 'utf8')) : [];
const prevOk = new Map(prevResults.filter((r) => r.ok).map((r) => [r.id, r]));
const prevDone = new Set(prevResults.map((r) => r.id).concat(
  fs.existsSync(STATE_DIR + '/ccf7-failed.json')
    ? JSON.parse(fs.readFileSync(STATE_DIR + '/ccf7-failed.json', 'utf8')).map((r) => r.id)
    : []
));
results.push(...prevResults.filter((r) => r.ok));
let done = 0;
for (const item of worklist) {
  if (prevDone.has(item.id)) { done++; continue; }
  if (prevOk.has(item.id)) { done++; continue; }
  const query = item.name;
  try {
    const d = await oaJson(`https://api.openalex.org/sources?search=${encodeURIComponent(query)}&per-page=10&mailto=${MAILTO}`);
    const candidates = (d.results || []).filter((s) => (s.works_count || 0) >= 60);
    let best = null;
    for (const s of candidates) {
      const score = scoreMatch(query, s.display_name);
      if (score >= 55 && (!best || score > best.score || (score === best.score && (s.works_count || 0) > (best.s.works_count || 0)))) {
        best = { s, score };
      }
    }
    if (!best) throw new Error('无匹配');
    const sid = String(best.s.id).split('/').pop();
    // 验证近两年收录（一次调用，管道符 OR）
    const c = await oaJson(`https://api.openalex.org/works?filter=primary_location.source.id:${sid},publication_year:2024|2025&per-page=1&mailto=${MAILTO}`);
    const recent = c.meta?.count || 0;
    const ok = recent >= 15;
    results.push({ ...item, oa: ok ? sid : '', sid, works: best.s.works_count, recent, ok, score: best.score });
    console.log(`${ok ? '✓' : '△'} ${item.id.padEnd(20)} ${sid.padEnd(13)} 近两年 ${String(recent).padStart(5)} | ${String(best.s.display_name).slice(0, 50)}`);
  } catch (error) {
    failed.push({ ...item, error: error.message });
    console.log(`✗ ${item.id.padEnd(20)} ${error.message.slice(0, 40)}`);
  }
  done++;
  const newDone = done - prevDone.size;
  if (newDone >= MAX_NEW) {
    console.log(`---- 达到单次上限 ${MAX_NEW}，剩余下次续跑`);
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 1));
    break;
  }
  if (done % 25 === 0) {
    console.log(`---- ${done} / ${worklist.length}`);
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 1));
  }
  await sleep(1200);
}

fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 1));
fs.writeFileSync(STATE_DIR + '/ccf7-failed.json', JSON.stringify(failed, null, 1));
const okCount = results.filter((r) => r.ok).length;
console.log(`\n✓ 解析完成：可用 ${okCount}，数据不足 ${results.length - okCount}，失败 ${failed.length}`);
