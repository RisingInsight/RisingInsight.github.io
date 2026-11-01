/**
 * 从 Crossref 烤制期刊快照（标题/作者/摘要/被引/DOI）。
 * Elsevier / AIP / SIAM 等把摘要存进了 Crossref，可以补上 OpenAlex 缺失的期刊摘要。
 * 烤完建议再跑 enrich-s2 补 arXiv 链接、augment-snapshots 提取代码链接。
 *
 * 用法：node scripts/fetch-journal.mjs <venueId> <年份> [-y 起始年]
 */
import fs from 'node:fs';
import path from 'node:path';

const ISSNS = {
  jcp: '0021-9991',      // Journal of Computational Physics
  cpc: '0010-4655',      // Computer Physics Communications
  pof: '1089-7666',      // Physics of Fluids
  sisc: '1064-8275',     // SIAM Journal on Scientific Computing
  cmame: '0045-7825',    // Computer Methods in Applied Mechanics and Engineering
  jsc: '0885-7474',      // Journal of Scientific Computing
  cicp: '1815-2406',     // Communications in Computational Physics
};

const [, , venueIdArg, yearArg] = process.argv;
const VENUE_ID = venueIdArg || 'jcp';
const ISSN = ISSNS[VENUE_ID];
if (!ISSN) {
  console.error(`未收录 ${VENUE_ID} 的 ISSN，可选：${Object.keys(ISSNS).join(' / ')}`);
  process.exit(1);
}
const YEAR = Number(yearArg) || new Date().getFullYear();
const MAILTO = '1668676243%40qq.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stripJats(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const papers = [];
let cursor = '*';
for (let page = 0; page < 20; page++) {
  const url =
    `https://api.crossref.org/journals/${ISSN}/works?filter=from-pub-date:${YEAR}-01-01,until-pub-date:${YEAR}-12-31,type:journal-article` +
    `&rows=1000&cursor=${encodeURIComponent(cursor)}` +
    `&select=DOI,title,author,abstract,issued,is-referenced-by-count&mailto=${MAILTO}`;
  let items = [];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`Crossref ${res.status}`);
    const data = await res.json();
    items = data.message?.items || [];
    cursor = data.message?.['next-cursor'] || '';
  } catch (error) {
    if (page === 0) throw error;
    console.warn(`  第 ${page + 1} 页失败：${error.message}`);
    break;
  }
  for (const item of items) {
    const title = stripJats(item.title?.[0]);
    if (!title) continue;
    papers.push({
      id: `crossref:${item.DOI}`,
      title,
      authors: (item.author || [])
        .map((a) => [a.given, a.family].filter(Boolean).join(' ').trim())
        .filter(Boolean),
      abstract: stripJats(item.abstract),
      cites: item['is-referenced-by-count'] || 0,
      doi: `https://doi.org/${item.DOI}`,
    });
  }
  console.log(`  已拉取 ${papers.length} 篇（本页 ${items.length}）`);
  if (items.length < 1000 || !cursor) break;
  await sleep(1200);
}

// 按标题去重（Crossref 偶有重复 DOI 记录）
const seen = new Set();
const unique = papers.filter((p) => {
  const key = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
});

const { VENUES } = await import('../src/data/venues.ts');
const venue = VENUES.find((v) => v.id === VENUE_ID);

const payload = {
  venueId: VENUE_ID,
  year: YEAR,
  provider: 'crossref',
  source: `https://api.crossref.org/journals/${ISSN}/works`,
  generatedAt: new Date().toISOString(),
  count: unique.length,
  papers: unique.map((p) => ({
    id: p.id,
    title: p.title,
    authors: p.authors,
    more: false,
    abstract: p.abstract,
    cites: p.cites,
    year: YEAR,
    venueId: VENUE_ID,
    venueShort: venue?.short || VENUE_ID.toUpperCase(),
    venueFull: venue?.full || VENUE_ID,
    venueType: 'journal',
    doi: p.doi,
    pdf: '',
    oaUrl: p.doi,
    link: p.doi,
    fulltext: true,
    source: 'crossref',
  })),
};

const outFile = path.resolve(`public/data/${VENUE_ID}-${YEAR}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(payload));
const withAbs = payload.papers.filter((p) => p.abstract).length;
console.log(`✓ ${outFile}（${unique.length} 篇，${withAbs} 篇有摘要）`);
