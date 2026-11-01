/**
 * 抓取 CVF Open Access 的当前年份论文快照（CVPR / ICCV / WACV）。
 * OpenAlex、Semantic Scholar 对新一届会议常有数月滞后，CVF 官方页面一发布就有
 * 标题、作者、PDF 和 arXiv 链接；这里再把 arXiv 摘要补进来，烤成静态 JSON，
 * 页面在数据源返回 0 篇时自动回退到快照。
 *
 * 用法：npm run fetch:cvf
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://openaccess.thecvf.com';
const FULL_NAMES = {
  CVPR: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition',
  ICCV: 'IEEE/CVF International Conference on Computer Vision',
  WACV: 'IEEE/CVF Winter Conference on Applications of Computer Vision',
};
const args = process.argv.slice(2);
const TARGETS = args.length >= 2
  ? [{ id: args[0].toLowerCase(), cvf: args[0].toUpperCase(), year: Number(args[1]), full: FULL_NAMES[args[0].toUpperCase()] }]
  : [
      { id: 'cvpr', cvf: 'CVPR', year: 2026, full: FULL_NAMES.CVPR },
    ];

const UA = 'RisingInsight-blog-build (github.com/RisingInsight)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function fetchText(url, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await sleep(4000 * (attempt + 1));
    }
  }
  throw lastError;
}

async function fetchArxivAbstracts(ids) {
  const map = new Map();
  const batches = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const url = `https://export.arxiv.org/api/query?id_list=${batch.join(',')}&max_results=${batch.length}`;
    try {
      const xml = await fetchText(url, 4);
      for (const entry of xml.split('<entry>').slice(1)) {
        const idMatch = entry.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+?)(?:v\d+)?<\/id>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        if (idMatch && summaryMatch) {
          map.set(idMatch[1], decodeHtml(summaryMatch[1]).replace(/\s+/g, ' ').trim());
        }
      }
      console.log(`  arXiv 摘要 ${Math.min((bi + 1) * 50, ids.length)} / ${ids.length}`);
    } catch (error) {
      console.warn(`  arXiv 批次失败：${error.message}`);
    }
    await sleep(3000);
  }
  return map;
}

function parsePapers(html, target) {
  const blocks = html.split('<dt class="ptitle">').slice(1);
  const papers = [];
  for (const block of blocks) {
    const titleMatch = block.match(/<a href="([^"]+)">([\s\S]*?)<\/a><\/dt>/);
    if (!titleMatch) continue;
    const title = stripTags(titleMatch[2]);
    if (!title) continue;
    const paperUrl = new URL(titleMatch[1], BASE).href;
    const authors = [...block.matchAll(/name="query_author" value="([^"]*)"/g)]
      .map((match) => decodeHtml(match[1]).trim())
      .filter(Boolean);
    const pdfMatch = block.match(/href="([^"]+\.pdf[^"]*)"/);
    const arxivMatch = block.match(/https?:\/\/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/);
    const pdf = pdfMatch ? new URL(pdfMatch[1], BASE).href : '';
    const arxiv = arxivMatch ? arxivMatch[1] : '';
    const link = pdf || (arxiv ? `https://arxiv.org/abs/${arxiv}` : paperUrl);
    papers.push({
      id: `cvf:${target.id}-${target.year}-${papers.length + 1}`,
      title,
      authors,
      arxiv,
      pdf,
      paperUrl,
      link,
      abstract: '',
    });
  }
  return papers;
}

for (const target of TARGETS) {
  const url = `${BASE}/${target.cvf}${target.year}?day=all`;
  console.log(`抓取 ${url} …`);
  const html = await fetchText(url, 4);
  const papers = parsePapers(html, target);
  console.log(`  解析到 ${papers.length} 篇`);
  if (papers.length === 0) {
    console.warn('  没有论文，跳过');
    continue;
  }

  const arxivIds = [...new Set(papers.map((paper) => paper.arxiv).filter(Boolean))];
  console.log(`  需要补摘要的 arXiv 论文：${arxivIds.length} 篇（共 ${papers.length} 篇）`);
  const abstracts = await fetchArxivAbstracts(arxivIds);
  for (const paper of papers) {
    if (paper.arxiv && abstracts.has(paper.arxiv)) paper.abstract = abstracts.get(paper.arxiv);
  }

  const payload = {
    venueId: target.id,
    venueShort: target.cvf,
    venueFull: target.full,
    venueType: 'conference',
    year: target.year,
    source: url,
    generatedAt: new Date().toISOString(),
    count: papers.length,
    papers: papers.map((paper) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      more: paper.authors.length > 6,
      abstract: paper.abstract,
      cites: 0,
      year: target.year,
      venueId: target.id,
      venueShort: target.cvf,
      venueFull: target.full,
      venueType: 'conference',
      doi: '',
      pdf: paper.pdf,
      oaUrl: paper.paperUrl,
      arxiv: paper.arxiv || '',
      link: paper.link,
      fulltext: Boolean(paper.pdf),
      source: 'cvf',
    })),
  };

  const outFile = path.resolve(`public/data/${target.id}-${target.year}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload));
  const size = fs.statSync(outFile).size;
  console.log(`✓ 写入 ${outFile}（${papers.length} 篇，${(size / 1024 / 1024).toFixed(1)} MB，${payload.papers.filter((p) => p.abstract).length} 篇有摘要）`);
}
