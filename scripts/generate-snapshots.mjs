/**
 * 扫描 public/data/{venueId}-{year}.json，生成 src/data/snapshots.generated.ts，
 * 让快照在构建期自动接线到对应 venue（新增快照年份无需手工改 venues.ts）。
 *
 * 用法：node scripts/generate-snapshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('public/data');
const map = {};
for (const file of fs.readdirSync(DIR)) {
  const m = file.match(/^([a-z0-9]+)-(\d{4})\.json$/);
  if (!m) continue;
  const [, venueId, year] = m;
  try {
    const payload = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    if (!payload.papers || payload.papers.length === 0) continue; // 空快照不接线
  } catch {
    continue; // 半截文件跳过
  }
  (map[venueId] = map[venueId] || {})[Number(year)] = `/data/${file}`;
}

const entries = Object.entries(map)
  .map(([id, years]) => {
    const body = Object.entries(years)
      .map(([y, p]) => `    ${y}: '${p}',`)
      .join('\n');
    return `  ${id}: {\n${body}\n  },`;
  })
  .join('\n');

const out = `// 快照自动接线表：由 scripts/generate-snapshots.mjs 扫描 public/data 生成，请勿手工编辑。
// venues.ts 会在构建期把它合并进各 venue 的 snapshots 配置。

export const SNAPSHOT_MAP: Record<string, Record<number, string>> = {
${entries}
};
`;

fs.writeFileSync(path.resolve('src/data/snapshots.generated.ts'), out);
console.log(`✓ src/data/snapshots.generated.ts（${Object.keys(map).length} 个 venue 的快照自动接线）`);
