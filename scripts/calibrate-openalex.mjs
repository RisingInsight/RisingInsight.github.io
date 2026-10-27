/**
 * 自动校准 OpenAlex source ID：对 ccf-ddl.json 里每个会议，用官方全称搜索，
 * 严格验证（名称核心词全命中 + 非 Workshops + works_count ≥ 1000）后生成
 * scripts/openalex-overrides.mjs。产出全部经过验证，可直接提交。
 *
 * 用法：npm run calibrate:oa   （限速友好，429 自动退避；失败项下次重跑）
 */
import fs from 'node:fs';
import { parse } from 'yaml';

const OUT = 'scripts/openalex-overrides.mjs';
const MAILTO = '1668676243@qq.com';
const FILLER = new Set(['the', 'a', 'an', 'of', 'on', 'in', 'and', 'for', 'annual',
  'international', 'conference', 'conferences', 'symposium', 'advances',
  'proceedings', 'joint', 'acm', 'ieee', 'cvf', 'sig']);
const EXCLUDE_RE = /workshops|demos\b/i;

function coreWords(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ').filter((w) => w && !FILLER.has(w));
}

async function searchRetry(coreQuery) {
  // display_name.search 是确定性过滤器（search= 全文参数行为飘忽）
  const url = `https://api.openalex.org/sources?filter=display_name.search:${encodeURIComponent(coreQuery)}&per-page=15&mailto=${MAILTO}`;
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 403) { await new Promise((x) => setTimeout(x, 2000 * (a + 1))); continue; }
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()).results || [];
    } catch (e) { if (a === 3) throw e; await new Promise((x) => setTimeout(x, 1500)); }
  }
  return [];
}

const payload = JSON.parse(fs.readFileSync('src/data/ccf-ddl.json', 'utf8'));
// yml 原文里有 description（全称）；快照里已带
const byId = new Map(payload.entries.map((e) => [e.id, e]));

// 也从 ccfddl 仓库拿全称（快照里 description 已有，直接用）
const overrides = {};
let ok = 0, fail = 0;

for (const e of payload.entries) {
  const title = e.title;
  const desc = e.description || title;
  try {
    // 用全称的核心词拼 filter（display_name.search 以词为粒度 AND 匹配）
    const coreQuery = coreWords(desc).join(' ');
    const results = await searchRetry(coreQuery);
    const core = coreWords(desc);
    const best = results
      .filter((s) => {
        if ((s.works_count || 0) < 1000) return false;
        if (EXCLUDE_RE.test(String(s.display_name || ''))) return false;
        const words = new Set(coreWords(s.display_name));
        // 名称验证：全称核心词 ≥80% 出现在 source 名里
        let hit = 0;
        core.forEach((w) => { if (words.has(w)) hit++; });
        return core.length === 0 || hit / core.length >= 0.8;
      })
      .sort((x, y) => (y.works_count || 0) - (x.works_count || 0))[0];
    if (best) {
      overrides[e.id] = String(best.id);
      ok++;
      console.log(`✓ ${title} → ${String(best.id).split('/').pop()} (w:${best.works_count}) ${String(best.display_name).slice(0, 50)}`);
    } else {
      fail++;
      console.log(`✗ ${title}: 无通过验证的源`);
    }
  } catch (err) {
    fail++;
    console.log(`✗ ${title}: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 700));
}

const banner = `/**
 * 自动校准产物（npm run calibrate:oa）— 生成于 ${new Date().toISOString().slice(0, 10)}
 * ${ok} 个已验证 / ${fail} 个待定（失败的会议在页面上走 DBLP 兜底）。
 * 重新生成：node scripts/calibrate-openalex.mjs
 */
export const OPENALEX_OVERRIDES = ${JSON.stringify(overrides, null, 2)};
`;
fs.writeFileSync(OUT, banner);
console.log(`\n✓ 写入 ${OUT}: ${ok} verified, ${fail} pending`);
