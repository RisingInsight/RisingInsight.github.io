/**
 * 从 proceedings.iclr.cc 生成 ICLR 快照（标题、作者、摘要、PDF）。
 * ICLR 官方 proceedings 的摘要页逐篇提供完整摘要；Semantic Scholar 对
 * ICLR 2025/2026 收录严重不足，所以这里烤成静态 JSON，页面优先使用快照。
 *
 * 用法：npm run fetch:iclr
 */
import fs from 'node:fs';
import path from 'node:path';

const CLI_YEARS = process.argv.slice(2).map(Number).filter((year) => Number.isFinite(year) && year > 2000);
const YEARS = CLI_YEARS.length > 0 ? CLI_YEARS : [2024, 2025, 2026];
const BASE = 'https://proceedings.iclr.cc';
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

function parseList(html) {
  const papers = [];
  const blocks = html.split('<li class="conference"').slice(1);
  for (const block of blocks) {
    const match = block.match(/<a title="paper title" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<span class="paper-authors">([\s\S]*?)<\/span>/);
    if (!match) continue;
    const title = strip(match[2]);
    if (!title) continue;
    const authors = strip(match[3]).split(',').map((name) => name.trim()).filter(Boolean);
    papers.push({
      id: match[1].split('/').pop().replace('-Abstract-Conference.html', ''),
      title,
      authors,
      url: new URL(match[1], BASE).href,
    });
  }
  return papers;
}

for (const year of YEARS) {
  const listUrl = `${BASE}/paper_files/paper/${year}`;
  console.log(`抓取 ${listUrl} …`);
  const listHtml = await fetchText(listUrl, 3);
  const papers = parseList(listHtml);
  console.log(`  解析到 ${papers.length} 篇`);

  let done = 0;
  const queue = papers.slice();
  async function worker() {
    while (queue.length > 0) {
      const paper = queue.shift();
      try {
        const page = await fetchText(paper.url, 2);
        const abstract = page.match(/<p class="paper-abstract">([\s\S]*?)<\/section>/);
        const pdfMeta = page.match(/<meta name="citation_pdf_url" content="([^"]+)"/);
        const pdfLink = page.match(/href="([^"]+\.pdf[^"]*)"/);
        if (abstract) paper.abstract = strip(abstract[1]);
        if (pdfMeta) {
          paper.pdf = pdfMeta[1];
        } else if (pdfLink) {
          paper.pdf = new URL(pdfLink[1], paper.url).href;
        } else if (/\/hash\/.+-Abstract-Conference\.html$/.test(paper.url)) {
          paper.pdf = paper.url.replace('/hash/', '/file/').replace('-Abstract-Conference.html', '-Paper-Conference.pdf');
        }
      } catch (error) {
        // 个别页面失败不影响整体
      }
      paper.link = paper.pdf || paper.url;
      done++;
      if (done % 200 === 0) console.log(`  摘要 ${done} / ${papers.length}`);
      await new Promise((r) => setTimeout(r, 60));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const payload = {
    venueId: 'iclr',
    year,
    provider: 'iclr',
    source: listUrl,
    generatedAt: new Date().toISOString(),
    count: papers.length,
    papers: papers.map((paper) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract || '',
      pdf: paper.pdf || '',
      url: paper.url,
      link: paper.link,
    })),
  };
  const outFile = path.resolve(`public/data/iclr-${year}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload));
  const size = fs.statSync(outFile).size;
  const withAbs = payload.papers.filter((paper) => paper.abstract).length;
  console.log(`✓ ${outFile}（${papers.length} 篇，${withAbs} 篇有摘要，${(size / 1024 / 1024).toFixed(1)} MB）`);
}
