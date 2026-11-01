/**
 * 从 PMLR 整卷 BibTeX 生成会议快照（含摘要、PDF、论文页）。
 * PMLR 每卷提供一个 assets/bib/bibliography.bib，BibTeX 自带 abstract 字段，
 * 无需逐篇请求。覆盖 ICML / AISTATS / CoRL / COLT。
 *
 * 用法：npm run fetch:pmlr
 */
import fs from 'node:fs';
import path from 'node:path';

const CLI_FILTER = process.argv.slice(2).map((s) => s.toLowerCase());
const ALL_TARGETS = [
  { venueId: 'icml', short: 'ICML', full: 'International Conference on Machine Learning', year: 2024, volume: 235 },
  { venueId: 'icml', short: 'ICML', full: 'International Conference on Machine Learning', year: 2025, volume: 267 },
  { venueId: 'icml', short: 'ICML', full: 'International Conference on Machine Learning', year: 2026, volume: 306 },
  { venueId: 'aistats', short: 'AISTATS', full: 'International Conference on Artificial Intelligence and Statistics', year: 2025, volume: 258 },
  { venueId: 'aistats', short: 'AISTATS', full: 'International Conference on Artificial Intelligence and Statistics', year: 2026, volume: 300 },
  { venueId: 'corl', short: 'CoRL', full: 'Conference on Robot Learning', year: 2024, volume: 270 },
  { venueId: 'corl', short: 'CoRL', full: 'Conference on Robot Learning', year: 2025, volume: 305 },
  { venueId: 'colt', short: 'COLT', full: 'Conference on Learning Theory', year: 2025, volume: 291 },
  { venueId: 'colt', short: 'COLT', full: 'Conference on Learning Theory', year: 2026, volume: 336 },
];
// 直接模式：--year 2027 --volume 321（供 auto-update 探测到新卷后调用）
const directYear = process.argv.includes('--year') ? Number(process.argv[process.argv.indexOf('--year') + 1]) : null;
const directVolume = process.argv.includes('--volume') ? Number(process.argv[process.argv.indexOf('--volume') + 1]) : null;
const TARGETS = directYear && directVolume
  ? ALL_TARGETS.filter((t) => t.venueId === CLI_FILTER[0]).map((t) => ({ ...t, year: directYear, volume: directVolume }))
  : CLI_FILTER.length > 0
    ? ALL_TARGETS.filter((t) => CLI_FILTER.includes(t.venueId))
    : ALL_TARGETS;

const UA = 'RisingInsight-blog-build (github.com/RisingInsight)';

function clean(value) {
  return String(value || '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

function parseEntries(bib) {
  const entries = [];
  let cursor = 0;
  const marker = '@InProceedings{';
  while ((cursor = bib.indexOf(marker, cursor)) !== -1) {
    let pos = cursor + marker.length;
    let key = '';
    while (pos < bib.length && bib[pos] !== ',') key += bib[pos++];
    if (bib[pos] === ',') pos++;
    const fields = {};
    while (pos < bib.length) {
      while (pos < bib.length && /[\s,]/.test(bib[pos])) pos++;
      if (pos >= bib.length || bib[pos] === '}') { pos++; break; }
      if (bib[pos] === '@') break;
      let name = '';
      while (pos < bib.length && bib[pos] !== '=') name += bib[pos++];
      if (pos >= bib.length) break;
      pos++;
      while (pos < bib.length && /\s/.test(bib[pos])) pos++;
      let value = '';
      if (bib[pos] === '{') {
        pos++;
        let depth = 1;
        while (pos < bib.length && depth > 0) {
          const ch = bib[pos++];
          if (ch === '{') { depth++; if (depth > 1) value += ch; }
          else if (ch === '}') { depth--; if (depth > 0) value += ch; }
          else value += ch;
        }
      } else {
        while (pos < bib.length && bib[pos] !== ',' && bib[pos] !== '}') value += bib[pos++];
      }
      fields[name.trim().toLowerCase()] = value.trim();
    }
    entries.push({ key: key.trim(), fields });
    cursor = pos;
  }
  return entries;
}

function bibAuthors(value) {
  return clean(value)
    .split(/\s+and\s+/i)
    .map((name) => {
      const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
      return parts.length >= 2 ? `${parts.slice(1).join(' ')} ${parts[0]}` : name.trim();
    })
    .filter(Boolean);
}

for (const target of TARGETS) {
  const volumeUrl = `https://proceedings.mlr.press/v${target.volume}/`;
  const bibUrl = `${volumeUrl}assets/bib/bibliography.bib`;
  console.log(`抓取 ${bibUrl} …`);
  const res = await fetch(bibUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${bibUrl}`);
  const bib = await res.text();
  const entries = parseEntries(bib);
  console.log(`  ${entries.length} 条 BibTeX`);
  const papers = [];
  for (const entry of entries) {
    const fields = entry.fields;
    const title = clean(fields.title);
    if (!title || !fields.abstract) continue;
    const pdf = fields.pdf || '';
    const url = fields.url || volumeUrl;
    papers.push({
      id: entry.key,
      title,
      authors: bibAuthors(fields.author),
      abstract: clean(fields.abstract),
      pdf,
      url,
      link: pdf || url,
    });
  }
  const payload = {
    venueId: target.venueId,
    venueShort: target.short,
    venueFull: target.full,
    venueType: 'conference',
    year: target.year,
    provider: 'pmlr',
    source: volumeUrl,
    generatedAt: new Date().toISOString(),
    count: papers.length,
    papers,
  };
  const outFile = path.resolve(`public/data/${target.venueId}-${target.year}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload));
  const size = fs.statSync(outFile).size;
  console.log(`✓ ${outFile}（${papers.length} 篇，${(size / 1024 / 1024).toFixed(1)} MB）`);
}
