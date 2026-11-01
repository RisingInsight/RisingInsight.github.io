/**
 * 从 jmlr.org 官方站点烤制 JMLR 快照（OpenAlex 对 JMLR 收录近乎为 0）。
 * 卷页列出标题/作者/abs/pdf；摘要逐篇抓 abs 页 <p class="abstract">。
 * v25=2024, v26=2025, v27=2026（v27 随收录滚动增长）。
 *
 * 用法：npm run fetch:jmlr
 */
import fs from 'node:fs';
import path from 'node:path';

const VOLUMES = [
  { volume: 25, year: 2024 },
  { volume: 26, year: 2025 },
  { volume: 27, year: 2026 },
];
const BASE = 'https://jmlr.org';
const UA = 'RisingInsight-blog-build (github.com/RisingInsight)';
const CONCURRENCY = 6;

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&minus;/g, '-')
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
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  throw last;
}

function parseVolume(html, volume) {
  const papers = [];
  const blocks = html.split('<dl>').slice(1);
  for (const block of blocks) {
    const dt = block.match(/<dt>([\s\S]*?)<\/dt>/);
    const dd = block.match(/<dd>([\s\S]*?)(?:<\/dd>|<\/dl>)/);
    if (!dt || !dd) continue;
    const title = strip(dt[1]);
    if (!title) continue;
    const authors = strip(dd[1].match(/<b><i>([\s\S]*?)<\/i><\/b>/)?.[1] || '')
      .split(',').map((name) => name.trim()).filter(Boolean);
    const absMatch = dd[1].match(/href='(\/papers\/v\d+\/[^']+\.html)'/);
    const pdfMatch = dd[1].match(/href='(\/papers\/volume\d+\/[^']+\.pdf)'/);
    const absUrl = absMatch ? new URL(absMatch[1], BASE).href : '';
    const pdf = pdfMatch ? new URL(pdfMatch[1], BASE).href : '';
    papers.push({
      id: `jmlr:v${volume}:${papers.length + 1}`,
      title,
      authors,
      absUrl,
      pdf,
      url: absUrl || pdf,
    });
  }
  return papers;
}

for (const { volume, year } of VOLUMES) {
  const volumeUrl = `${BASE}/papers/v${volume}/`;
  console.log(`抓取 ${volumeUrl} …`);
  let html;
  try {
    html = await fetchText(volumeUrl);
  } catch (error) {
    console.warn(`  卷 ${volume} 不可用，跳过：${error.message}`);
    continue;
  }
  const papers = parseVolume(html, volume);
  console.log(`  解析到 ${papers.length} 篇`);

  let done = 0;
  const queue = papers.filter((paper) => paper.absUrl).slice();
  async function worker() {
    while (queue.length > 0) {
      const paper = queue.shift();
      try {
        const page = await fetchText(paper.absUrl);
        const abs = page.match(/<h3>Abstract<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
        if (abs) paper.abstract = strip(abs[1]);
      } catch (error) {
        // 个别页面失败不影响整体
      }
      done++;
      if (done % 200 === 0) console.log(`  摘要 ${done} / ${papers.length}`);
      await new Promise((r) => setTimeout(r, 60));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const payload = {
    venueId: 'jmlr',
    year,
    provider: 'jmlr',
    source: volumeUrl,
    generatedAt: new Date().toISOString(),
    count: papers.length,
    papers: papers.map((paper) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      more: false,
      abstract: paper.abstract || '',
      pdf: paper.pdf,
      url: paper.url,
      link: paper.pdf || paper.url,
    })),
  };
  const outFile = path.resolve(`public/data/jmlr-${year}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload));
  const withAbs = payload.papers.filter((paper) => paper.abstract).length;
  console.log(`✓ ${outFile}（${papers.length} 篇，${withAbs} 篇有摘要，${(fs.statSync(outFile).size / 1024 / 1024).toFixed(1)} MB）`);
}
