/**
 * 用 Semantic Scholar 批量接口为快照补摘要 / PDF / arXiv（按 DOI 匹配）。
 * 幂等；限流时自动退避。注意：不要与其他 S2 任务并行跑。
 *
 * 用法：node scripts/enrich-s2.mjs public/data/eccv-2026.json
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('用法: node scripts/enrich-s2.mjs <snapshot.json>');
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const targets = payload.papers.filter((p) => p.doi && (!p.abstract || !p.arxiv));
console.log(`待补全 ${targets.length} / ${payload.papers.length} 篇`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0;
for (let i = 0; i < targets.length; i += 100) {
  const batch = targets.slice(i, i + 100);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(
        'https://api.semanticscholar.org/graph/v1/paper/batch?fields=abstract,openAccessPdf,externalIds',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch.map((p) => 'DOI:' + p.doi.replace('https://doi.org/', '')) }),
          signal: AbortSignal.timeout(60000),
        }
      );
      if (res.status === 429 || res.status === 504) {
        await sleep(10000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`S2 ${res.status}`);
      const list = await res.json();
      list.forEach((item, j) => {
        const paper = batch[j];
        if (!item) return;
        if (item.abstract && !paper.abstract) paper.abstract = String(item.abstract).replace(/\s+/g, ' ').trim();
        if (item.openAccessPdf?.url && !paper.pdf) paper.pdf = item.openAccessPdf.url;
        if (item.externalIds?.ArXiv && !paper.arxiv) paper.arxiv = item.externalIds.ArXiv;
      });
      break;
    } catch (error) {
      if (attempt === 5) console.warn(`批次失败：${error.message?.slice(0, 80)}`);
      await sleep(8000);
    }
  }
  done += batch.length;
  console.log(`${done} / ${targets.length}`);
  await sleep(3000);
}

// 回填 link / fulltext
for (const paper of payload.papers) {
  if (paper.pdf) paper.link = paper.pdf;
  paper.fulltext = Boolean(paper.pdf || paper.link && paper.link !== '#');
}
fs.writeFileSync(file, JSON.stringify(payload));
const abs = payload.papers.filter((p) => p.abstract).length;
const arxiv = payload.papers.filter((p) => p.arxiv).length;
const pdf = payload.papers.filter((p) => p.pdf).length;
console.log(`✓ ${file}：摘要 ${abs}，arXiv ${arxiv}，PDF ${pdf}（共 ${payload.papers.length} 篇）`);
