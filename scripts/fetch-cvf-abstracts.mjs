/**
 * 补齐 CVF 快照里没有 arXiv 链接的论文摘要：
 * 逐篇抓取 openaccess.thecvf.com 的 paper.html，从 <div id="abstract"> 提取。
 *
 * 用法：node scripts/fetch-cvf-abstracts.mjs public/data/cvpr-2026.json
 */
import fs from 'node:fs';

const file = process.argv[2] || 'public/data/cvpr-2026.json';
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const missing = payload.papers.filter((paper) => !paper.abstract && paper.oaUrl);

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
      const res = await fetch(url, { headers: { 'User-Agent': 'RisingInsight-blog-build (github.com/RisingInsight)' } });
      if (!res.ok) throw new Error(String(res.status));
      return await res.text();
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw last;
}

console.log(`待补摘要 ${missing.length} / ${payload.papers.length} 篇`);
let done = 0;
const queue = missing.slice();

async function worker() {
  while (queue.length > 0) {
    const paper = queue.shift();
    try {
      const html = await fetchText(paper.oaUrl);
      const match = html.match(/<div id="abstract">([\s\S]*?)<\/div>/i);
      if (match) {
        paper.abstract = strip(match[1]);
      }
    } catch (error) {
      // 个别页面失败不影响整体
    }
    done++;
    if (done % 100 === 0) console.log(`  已处理 ${done} / ${missing.length}`);
    await new Promise((r) => setTimeout(r, 80));
  }
}

await Promise.all(Array.from({ length: 4 }, () => worker()));
const filled = payload.papers.filter((paper) => paper.abstract).length;
console.log(`有摘要 ${filled} / ${payload.papers.length} 篇`);
fs.writeFileSync(file, JSON.stringify(payload));
console.log(`✓ 写回 ${file}`);
