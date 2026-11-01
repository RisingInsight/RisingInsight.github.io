/**
 * 从 DBLP 烤制会议快照（DBLP 直连 Springer 数据，对新一届会议收录最快）。
 * DBLP 有 Anubis 反爬，用本机 Edge/Chrome 真实浏览器自动通过挑战后同源调 API。
 * 拿到 标题/作者/DOI 后，再用 Semantic Scholar 批量接口按 DOI 补摘要、PDF、arXiv id。
 *
 * 用法：node scripts/fetch-dblp.mjs <dblp键> <年份>   例：node scripts/fetch-dblp.mjs eccv 2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const [, , dblpKeyArg, yearArg] = process.argv;
const DBLP_KEY = dblpKeyArg || 'eccv';
const YEAR = Number(yearArg) || new Date().getFullYear();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normTitle(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ---- 第一步：Edge 过 Anubis，同源调 DBLP 搜索 API 分页拉全 ----
async function fetchDblpHits() {
  let browser;
  for (const channel of ['msedge', 'chrome']) {
    try {
      browser = await chromium.launch({
        channel,
        headless: false,
        args: ['--window-position=-32000,-32000'],
      });
      console.log(`✓ 启动 ${channel}`);
      break;
    } catch (error) {
      console.warn(`  ${channel} 启动失败：${error.message?.slice(0, 80)}`);
    }
  }
  if (!browser) throw new Error('没有可用的浏览器（msedge / chrome）');

  const papers = [];
  try {
    const page = await browser.newPage();
    await page.goto(`https://dblp.org/db/conf/${DBLP_KEY}/index.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    let passed = false;
    for (let i = 0; i < 40; i++) {
      await sleep(5000);
      const title = await page.title();
      if (/DBLP/i.test(title)) { passed = true; break; }
      process.stdout.write('.');
    }
    console.log(passed ? '\n✓ Anubis 挑战通过' : '\n✗ 挑战未通过');
    if (!passed) throw new Error('Anubis challenge failed');

    // 找出该年份的全部分卷页（conf/eccv/eccv2026-1.html …）
    const partUrls = await pageJson(page, `https://dblp.org/db/conf/${DBLP_KEY}/index.html`, (html) => {
      const urls = new Set();
      const re = new RegExp(`href="([^"]*db/conf/${DBLP_KEY}/${DBLP_KEY}${YEAR}[^"']*\\.html)"`, 'g');
      let m;
      while ((m = re.exec(html))) urls.add(new URL(m[1], 'https://dblp.org/').href);
      return [...urls];
    });
    console.log(`发现 ${partUrls.length} 个分卷页`);
    if (partUrls.length === 0) throw new Error('未找到分卷页');

    for (const partUrl of partUrls) {
      const count = await pageJson(page, partUrl, (html) => {
        // DBLP TOC 页：每条记录在 <cite class="data tts-content"> 标题 + authors + ee/doi
        const blocks = html.split('<li class="entry inproceedings"').slice(1);
        let n = 0;
        for (const block of blocks) {
          const title = block.match(/class="title"[^>]*>([\s\S]*?)<\/span>/);
          if (!title) continue;
          const authors = [...block.matchAll(/itemprop="author"[^>]*>([\s\S]*?)<\/a>/g)]
            .map((a) => a[1].replace(/<[^>]+>/g, '').trim());
          const doiMatch = block.match(/href="(https:\/\/doi\.org\/[^"]+)"/);
          const eeMatch = block.match(/href="(https:\/\/dblp\.org\/rec\/[^"]+\.html)"/);
          papers.push({
            key: (block.match(/href="https:\/\/dblp\.org\/rec\/([^"]+)\.html"/) || [])[1] || `${papers.length}`,
            title: title[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/\.$/, '').trim(),
            authors,
            doi: doiMatch ? doiMatch[1].replace('https://doi.org/', '') : '',
            ee: eeMatch ? eeMatch[1] : '',
          });
          n++;
        }
        return n;
      });
      console.log(`  ${partUrl.split('/').pop()} → ${count} 篇`);
      await sleep(1500);
    }
  } finally {
    await browser.close();
  }
  return papers;
}

/** 在页面上下文里取 URL 内容（字符串或经 pick 提取），自动等待 Anubis 重放 */
async function pageJson(page, url, pick) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const text = await page.evaluate(() => document.documentElement.outerHTML);
      const result = pick ? pick(text) : text.trim();
      if (pick || text.trim().startsWith('{')) return result;
      await sleep(6000);
    } catch (error) {
      await sleep(4000);
    }
  }
  throw new Error(`DBLP 页面重试失败: ${url}`);
}

// ---- 第二步：S2 批量接口按 DOI 补摘要 / PDF / arXiv ----
async function enrichWithS2(papers) {
  const withDoi = papers.filter((p) => p.doi);
  console.log(`S2 批量补全：${withDoi.length} / ${papers.length} 篇有 DOI`);
  let done = 0;
  for (let i = 0; i < withDoi.length; i += 100) {
    const batch = withDoi.slice(i, i + 100);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(
          'https://api.semanticscholar.org/graph/v1/paper/batch?fields=abstract,openAccessPdf,externalIds',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
            body: JSON.stringify({ ids: batch.map((p) => `DOI:${p.doi}`) }),
            signal: AbortSignal.timeout(60000),
          }
        );
        if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
        if (!res.ok) throw new Error(`S2 ${res.status}`);
        const list = await res.json();
        list.forEach((item, j) => {
          const paper = batch[j];
          if (!item) return;
          if (item.abstract) paper.abstract = String(item.abstract).replace(/\s+/g, ' ').trim();
          if (item.openAccessPdf?.url) paper.pdf = item.openAccessPdf.url;
          if (item.externalIds?.ArXiv) paper.arxiv = item.externalIds.ArXiv;
        });
        break;
      } catch (error) {
        if (attempt === 3) console.warn(`  批次失败：${error.message?.slice(0, 80)}`);
        await sleep(3000);
      }
    }
    done += batch.length;
    console.log(`  ${done} / ${withDoi.length}`);
    await sleep(1300);
  }
}

const papers = await fetchDblpHits();
console.log(`解析到 ${papers.length} 篇（去重后）`);
// 按标题去重（分卷页偶有交叉条目）
const seen = new Set();
const unique = papers.filter((p) => {
  const key = normTitle(p.title);
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
});

await enrichWithS2(unique);

const venueRow = await import('../src/data/venues.ts').then((m) =>
  m.VENUES.find((v) => v.dblp === DBLP_KEY && v.type === 'conference')
);
const payload = {
  venueId: venueRow?.id || DBLP_KEY,
  venueShort: venueRow?.short || DBLP_KEY.toUpperCase(),
  venueFull: venueRow?.full || DBLP_KEY,
  venueType: 'conference',
  year: YEAR,
  provider: 'dblp',
  source: `https://dblp.org/db/conf/${DBLP_KEY}/`,
  generatedAt: new Date().toISOString(),
  count: unique.length,
  papers: unique.map((p) => ({
    id: `dblp:${p.key}`,
    title: p.title,
    authors: p.authors,
    more: false,
    abstract: p.abstract || '',
    cites: 0,
    year: YEAR,
    venueId: venueRow?.id || DBLP_KEY,
    venueShort: venueRow?.short || DBLP_KEY.toUpperCase(),
    venueFull: venueRow?.full || DBLP_KEY,
    venueType: 'conference',
    doi: p.doi ? `https://doi.org/${p.doi}` : '',
    pdf: p.pdf || '',
    oaUrl: p.ee || '',
    arxiv: p.arxiv || '',
    link: p.pdf || p.ee || (p.doi ? `https://doi.org/${p.doi}` : '#'),
    fulltext: Boolean(p.pdf || p.ee || p.doi),
    source: 'dblp',
  })),
};

const outFile = path.resolve(`public/data/${payload.venueId}-${YEAR}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(payload));
const withAbs = payload.papers.filter((p) => p.abstract).length;
const withArxiv = payload.papers.filter((p) => p.arxiv).length;
console.log(`✓ ${outFile}`);
console.log(`  ${unique.length} 篇 | 摘要 ${withAbs} | arXiv ${withArxiv} | DOI ${payload.papers.filter((p) => p.doi).length}`);
