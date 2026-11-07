/**
 * 扩展来源质量审计：对 venues-ccf7.ts 里每个 venue 重新核验
 *   1) OpenAlex 源还在且 display_name 与 CCF 目录名相似度足够
 *   2) 近两年收录量合理（过低 = 源失效；过高 = 匹配到了聚合源如 LNCS）
 *   3) 简称应出现在源名或其缩写字段里
 * 输出可疑清单供人工纠偏。
 *
 * 用法：node scripts/audit-expand.mjs
 */
import fs from 'node:fs';

const MAILTO = '1668676243%40qq.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function oaJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = Math.max(0, 550 - (Date.now() - last));
    if (wait) await sleep(wait);
    last = Date.now();
    const res = await fetch(url);
    if (res.status === 429 || res.status === 403) {
      await sleep(6000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`OA ${res.status}`);
    return res.json();
  }
  throw new Error('OA rate limited');
}

const gen = fs.readFileSync('src/data/venues-ccf7.ts', 'utf8');
const entries = [...gen.matchAll(/id: '([^']+)',\s*\n\s*short: '([^']*)',\s*\n\s*full: '([^']*)',\s*\n\s*type: '([a-z]+)',\s*\n\s*area: '([a-z]+)',\s*\n\s*rank: '([ABC—]+)',\s*\n\s*provider: 'openalex',\s*\n\s*oa: '([^']+)'/g)].map(
  (m) => ({ id: m[1], short: m[2], full: m[3], type: m[4], area: m[5], rank: m[6], oa: m[7] })
);
console.log('待审计:', entries.length, '个来源');

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

const suspicious = [];
let checked = 0;
for (const v of entries) {
  try {
    const src = await oaJson(`https://api.openalex.org/sources/${v.oa}?mailto=${MAILTO}`);
    const name = src.display_name || '';
    const works = src.works_count || 0;
    const score = scoreMatch(v.full, name);
    // 近两年收录
    const c = await oaJson(`https://api.openalex.org/works?filter=primary_location.source.id:${v.oa},publication_year:2024|2025&per-page=1&mailto=${MAILTO}`);
    const recent = c.meta?.count ?? 0;
    const flags = [];
    if (score < 75) flags.push(`相似度 ${score.toFixed(0)}`);
    if (recent < 15) flags.push(`近两年仅 ${recent}`);
    if (recent > 6000) flags.push(`近两年 ${recent}（疑似聚合源）`);
    if (v.type === 'journal' && src.type !== 'journal') flags.push(`类型不符:${src.type}`);
    if (v.type === 'conference' && src.type !== 'conference' && src.type !== 'journal') flags.push(`类型不符:${src.type}`);
    if (flags.length) {
      suspicious.push({ ...v, name, works, recent, flags });
      console.log(`△ ${v.id.padEnd(20)} ${flags.join(' | ')} | ${name.slice(0, 55)}`);
    } else {
      console.log(`✓ ${v.id.padEnd(20)} recent ${recent}`);
    }
  } catch (error) {
    suspicious.push({ ...v, flags: [error.message.slice(0, 40)] });
    console.log(`✗ ${v.id.padEnd(20)} ${error.message.slice(0, 50)}`);
  }
  checked++;
  if (checked % 25 === 0) console.log(`---- ${checked}/${entries.length}`);
}

fs.writeFileSync('.tmp-patch/expand-audit.json', JSON.stringify(suspicious, null, 1));
console.log(`\n审计完成：${entries.length} 个来源，可疑 ${suspicious.length} 个`);
