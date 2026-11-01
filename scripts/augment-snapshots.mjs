/**
 * 借鉴 hongsong-wang 的 Paper Portal：从快照摘要中提取论文代码链接，
 * 并为早期 CVF 快照补录 arXiv id（fetch-cvf 最初没把它写进 JSON）。
 * 纯本地处理 + 每个.CVF 会议一年一次列表页请求，幂等可重跑。
 *
 * 用法：node scripts/augment-snapshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('public/data');
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g;
const TRAILING = /[.,;)\]}>'"]+$/;

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

function normTitle(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ---- CVF 快照补录 arXiv id ----
const CVF_BASE = 'https://openaccess.thecvf.com';
const CVF_TARGETS = [
  { file: 'cvpr-2026.json', cvf: 'CVPR', year: 2026 },
  { file: 'iccv-2025.json', cvf: 'ICCV', year: 2025 },
  { file: 'wacv-2026.json', cvf: 'WACV', year: 2026 },
];

async function backfillCvfArxiv() {
  for (const target of CVF_TARGETS) {
    const file = path.join(DIR, target.file);
    if (!fs.existsSync(file)) continue;
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    const missing = (payload.papers || []).filter((p) => !p.arxiv).length;
    if (missing === 0) continue;
    process.stdout.write(`抓取 ${target.cvf} ${target.year} 列表页补录 arXiv id … `);
    const res = await fetch(`${CVF_BASE}/${target.cvf}${target.year}?day=all`, {
      headers: { 'User-Agent': 'RisingInsight-blog-build (github.com/RisingInsight)' },
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      console.log(`失败（${res.status}），跳过`);
      continue;
    }
    const html = await res.text();
    const map = new Map();
    for (const block of html.split('<dt class="ptitle">').slice(1)) {
      const titleMatch = block.match(/<a href="([^"]+)">([\s\S]*?)<\/a><\/dt>/);
      if (!titleMatch) continue;
      const arxivMatch = block.match(/https?:\/\/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/);
      if (arxivMatch) map.set(normTitle(stripTags(titleMatch[2])), arxivMatch[1]);
    }
    let filled = 0;
    for (const paper of payload.papers || []) {
      if (paper.arxiv) continue;
      const arxiv = map.get(normTitle(paper.title));
      if (arxiv) {
        paper.arxiv = arxiv;
        filled++;
      }
    }
    fs.writeFileSync(file, JSON.stringify(payload));
    console.log(`补录 ${filled} / ${missing}`);
  }
}

await backfillCvfArxiv();

// ---- 从摘要/标题提取 GitHub 代码链接 ----
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
let total = 0;
let withCode = 0;

for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  let added = 0;
  for (const paper of payload.papers || []) {
    total++;
    const text = `${paper.abstract || ''} ${paper.title || ''}`;
    const matches = text.match(GITHUB_RE) || [];
    // 过滤明显的非代码仓库路径（issues、blob、raw 等页面链回仓库主页）
    const cleaned = matches
      .map((url) => {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        return normalized.replace(/[#?].*$/, '').replace(TRAILING, '');
      })
      .filter((url) => !/\/(issues|pull|blob|tree|raw|releases|wiki|discussions)(\/|$)/.test(url));
    if (cleaned.length > 0) {
      paper.code = cleaned[0];
      added++;
    }
  }
  withCode += added;
  if (added > 0) {
    fs.writeFileSync(path.join(DIR, file), JSON.stringify(payload));
  }
  console.log(`${file.padEnd(24)} ${String(payload.papers?.length || 0).padStart(5)} 篇 · ${added} 篇有代码链接`);
}

console.log(`\n✓ 共 ${total} 篇，${withCode} 篇提取到 GitHub 代码链接`);
