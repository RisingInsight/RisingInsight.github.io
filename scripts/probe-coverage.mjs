/**
 * 覆盖率探测：venues.ts 全部会议/期刊 × 2022-2026 逐年统计 OpenAlex / S2 收录量，
 * 并为候选新增会议解析 OpenAlex source ID。用于决定快照与 maxYear 配置。
 *
 * 用法：node scripts/probe-coverage.mjs
 */
import fs from 'node:fs';

const MAILTO = '1668676243%40qq.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let oaLast = 0;
let s2Last = 0;

async function oaJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = Math.max(0, 250 - (Date.now() - oaLast));
    if (wait) await sleep(wait);
    oaLast = Date.now();
    const res = await fetch(url);
    if (res.status === 429 || res.status === 403) {
      await sleep(1200 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`OA ${res.status}`);
    return res.json();
  }
  throw new Error('OA rate limited');
}

async function s2Total(venue, year) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = Math.max(0, 1100 - (Date.now() - s2Last));
    if (wait) await sleep(wait);
    s2Last = Date.now();
    try {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search/bulk?query=*&venue=${encodeURIComponent(venue)}&year=${year}&fields=paperId&limit=1`;
      const res = await fetch(url);
      if (res.status === 429) {
        await sleep(4000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`S2 ${res.status}`);
      const data = await res.json();
      return data.total ?? -1;
    } catch (e) {
      if (attempt === 2) return -1;
    }
  }
  return -1;
}

// ---- 现有会议逐年计数 ----
const { VENUES: venues } = await import('../src/data/venues.ts');

const rows = [];
for (const v of venues) {
  const years = [2023, 2024, 2025, 2026];
  const counts = {};
  if (v.oa) {
    const sid = v.oa.replace(/^https:\/\/openalex\.org\//, '');
    for (const y of years) {
      try {
        const d = await oaJson(`https://api.openalex.org/works?filter=primary_location.source.id:${sid},publication_year:${y}&per-page=1&mailto=${MAILTO}`);
        counts[y] = d.meta?.count ?? 0;
      } catch { counts[y] = -1; }
    }
  } else if (v.s2) {
    for (const y of years) counts[y] = await s2Total(v.s2, y);
  }
  rows.push({ short: v.short, provider: v.provider, id: v.oa || v.s2, counts });
  console.log(`${v.short.padEnd(12)} ${v.provider.padEnd(8)} ${years.map((y) => `${y}:${String(counts[y]).padStart(5)}`).join('  ')}`);
}

// ---- 候选新增会议：搜索 OpenAlex source 并验证 2024/2025 收录量 ----
const CANDIDATES = [
  { key: 'kdd', q: 'Knowledge Discovery and Data Mining' },
  { key: 'sigmod', q: 'SIGMOD Conference' },
  { key: 'vldb', q: 'Very Large Data Bases' },
  { key: 'icde', q: 'IEEE International Conference on Data Engineering' },
  { key: 'www', q: 'World Wide Web Conference' },
  { key: 'sigir', q: 'SIGIR Conference on Research and Development in Information Retrieval' },
  { key: 'ccs', q: 'Computer and Communications Security' },
  { key: 'sp', q: 'IEEE Symposium on Security and Privacy' },
  { key: 's_and_p', q: 'Security and Privacy', skip: true },
  { key: 'usenixsec', q: 'USENIX Security Symposium' },
  { key: 'ndss', q: 'Network and Distributed System Security' },
  { key: 'infocom', q: 'IEEE INFOCOM' },
  { key: 'mobicom', q: 'Mobile Computing and Networking' },
  { key: 'kr', q: 'Principles of Knowledge Representation and Reasoning' },
  { key: 'cp', q: 'Principles and Practice of Constraint Programming' },
  { key: 'ecai', q: 'European Conference on Artificial Intelligence' },
  { key: 'siggrapha', q: 'SIGGRAPH Asia' },
  { key: 'tmi', q: 'IEEE Transactions on Medical Imaging' },
  { key: 'media', q: 'Medical Image Analysis' },
  { key: 'ismb', q: 'Intelligent Systems for Molecular Biology', skip: true },
  { key: 'cikm', q: 'Conference on Information and Knowledge Management' },
  { key: 'wsdm', q: 'Web Search and Data Mining' },
];

console.log('\n===== 候选新增 =====');
for (const c of CANDIDATES) {
  if (c.skip) continue;
  try {
    const d = await oaJson(`https://api.openalex.org/sources?search=${encodeURIComponent(c.q)}&per-page=8&mailto=${MAILTO}`);
    const results = (d.results || []).filter((s) => (s.works_count || 0) > 200);
    if (results.length === 0) {
      console.log(`${c.key.padEnd(10)} ✗ 无结果`);
      continue;
    }
    const best = results[0];
    const sid = String(best.id).split('/').pop();
    const y24 = await oaJson(`https://api.openalex.org/works?filter=primary_location.source.id:${sid},publication_year:2024&per-page=1&mailto=${MAILTO}`);
    const y25 = await oaJson(`https://api.openalex.org/works?filter=primary_location.source.id:${sid},publication_year:2025&per-page=1&mailto=${MAILTO}`);
    console.log(`${c.key.padEnd(10)} ✓ ${sid.padEnd(12)} 24:${String(y24.meta?.count ?? 0).padStart(5)} 25:${String(y25.meta?.count ?? 0).padStart(5)}  ${String(best.display_name).slice(0, 60)} (${best.works_count})`);
  } catch (e) {
    console.log(`${c.key.padEnd(10)} ⚠ ${e.message}`);
  }
}

fs.writeFileSync('probe-report.json', JSON.stringify(rows, null, 2));
console.log('\n✓ probe-report.json');
