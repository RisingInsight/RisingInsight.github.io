/**
 * 从 ACL Anthology 烤制 NLP 会议快照（COLING 等）。
 * Anthology 是纯静态站，events 页内联全部论文（标题/作者/PDF），
 * 摘要逐篇抓 landing 页。修复 Semantic Scholar 对 COLING 几乎无链接的问题。
 *
 * 用法：node scripts/fetch-acl.mjs <venueId> <event slug> <年份>
 * 例： node scripts/fetch-acl.mjs coling coling-2025 2025
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , venueIdArg, eventArg, yearArg] = process.argv;
const VENUE_ID = venueIdArg || 'coling';
const EVENT = eventArg || `coling-2025`;
const YEAR = Number(yearArg) || Number(EVENT.match(/(\d{4})$/)?.[1]) || 2025;
const BASE = 'https://aclanthology.org';
const UA = 'RisingInsight-blog-build (github.com/RisingInsight)';
const CONCURRENCY = 6;

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function strip(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function fetchText(url, retries = 2) {
  let last;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40000) });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.text();
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw last;
}

console.log(`抓取 ${BASE}/events/${EVENT}/ …`);
const html = await fetchText(`${BASE}/events/${EVENT}/`);

// 属性可能不带引号：<strong><a class=align-middle href=/2025.coling-main.1/>Title</a></strong>
const blocks = html.split(/<strong><a class="?align-middle"? href=/).slice(1);
const papers = [];
for (const block of blocks) {
  const idMatch = block.match(/^=?\/?([0-9]{4}\.[a-z0-9.-]+)\//);
  if (!idMatch) continue;
  const id = idMatch[1];
  if (/\.0$/.test(id)) continue; // 卷首 Proceedings 条目跳过
  if (!id.startsWith(String(YEAR))) continue; // 只留本年
  const title = strip(block.match(/^=?\/[^>]*>([\s\S]*?)<\/a>/)?.[1]);
  if (!title) continue;
  const authorBlock = block.match(/<\/strong>([\s\S]*?)<\/div>/)?.[1] || '';
  const authors = [...authorBlock.matchAll(/<a href=\/people\/[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => strip(m[1]))
    .filter(Boolean);
  const pdfMatch = block.match(new RegExp(`href="?(?:https://aclanthology\\.org)?/?${id.replace(/\./g, '\\.')}(\\.pdf)"?`));
  papers.push({
    id: `acl:${id}`,
    title,
    authors,
    landing: `${BASE}/${id}/`,
    pdf: pdfMatch ? `${BASE}/${id}.pdf` : '',
  });
}
console.log(`解析到 ${papers.length} 篇`);

let done = 0;
const queue = papers.slice();
async function worker() {
  while (queue.length > 0) {
    const paper = queue.shift();
    try {
      const page = await fetchText(paper.landing);
      const abs = page.match(/acl-abstract">([\s\S]*?)<span>([\s\S]*?)<\/span>/i);
      if (abs) paper.abstract = strip(abs[2]);
    } catch (error) {
      // 个别页面失败不影响整体
    }
    done++;
    if (done % 100 === 0) console.log(`  摘要 ${done} / ${papers.length}`);
    await new Promise((r) => setTimeout(r, 60));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const payload = {
  venueId: VENUE_ID,
  year: YEAR,
  provider: 'aclanthology',
  source: `${BASE}/events/${EVENT}/`,
  generatedAt: new Date().toISOString(),
  count: papers.length,
  papers: papers.map((paper) => ({
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    more: false,
    abstract: paper.abstract || '',
    cites: 0,
    year: YEAR,
    venueId: VENUE_ID,
    venueShort: 'COLING',
    venueFull: 'International Conference on Computational Linguistics',
    venueType: 'conference',
    doi: '',
    pdf: paper.pdf,
    oaUrl: paper.landing,
    link: paper.pdf || paper.landing,
    fulltext: Boolean(paper.pdf),
    source: 'aclanthology',
  })),
};

const outFile = path.resolve(`public/data/${VENUE_ID}-${YEAR}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(payload));
const withAbs = payload.papers.filter((p) => p.abstract).length;
console.log(`✓ ${outFile}（${papers.length} 篇，${withAbs} 篇有摘要）`);
