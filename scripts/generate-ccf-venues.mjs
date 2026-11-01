/**
 * 把 expand-ccf.mjs 的解析结果生成 src/data/venues-ccf7.ts（CCF 第七版扩展 venue 列表）。
 * 只收录 OpenAlex 验证通过的条目；id 与现有 venues 冲突时加 -conf/-jour 后缀。
 *
 * 用法：node scripts/generate-ccf-venues.mjs
 */
import fs from 'node:fs';

const resolved = JSON.parse(fs.readFileSync('.tmp-patch/ccf7-resolved.json', 'utf8'));
const ok = resolved.filter((r) => r.ok && r.oa);

const usedIds = new Set();
const lines = [];
for (const r of ok) {
  let id = r.id;
  if (usedIds.has(id)) id = `${id}-${r.kind === 'journal' ? 'j' : 'c'}`;
  if (usedIds.has(id)) continue;
  usedIds.add(id);
  const short = (r.abbr || r.name).replace(/\s+/g, ' ').trim();
  const entry = [
    '  {',
    `    id: '${id}',`,
    `    short: '${short.replace(/\\/g, '').replace(/'/g, "\\'")}',`,
    `    full: '${r.name.replace(/\\/g, '').replace(/'/g, "\\'")}',`,
    `    type: '${r.kind}',`,
    `    area: '${r.area}',`,
    `    rank: '${r.rank}',`,
    `    provider: 'openalex',`,
    `    oa: '${r.oa}',`,
    `    recurrence: 'annual',`,
    `    startYear: 2018,`,
    `    dblp: '${r.dblp || ''}',`,
    '  },',
  ];
  lines.push(entry.join('\n'));
}

const out = `// CCF 第七版目录（2026 年 3 月发布）自动扩展的会议/期刊，
// 由 scripts/generate-ccf.mjs 从 .tmp-patch/ccf7-resolved.json 生成，请勿手工编辑。
// 只收录 OpenAlex 验证通过（近两年有收录）的条目；等级为第七版官方数据。

import type { Venue } from './venues';

export const CCF7_VENUES: Venue[] = [
${lines.join('\n')}
];
`;

fs.writeFileSync('src/data/venues-ccf7.ts', out);
console.log(`✓ src/data/venues-ccf7.ts（${usedIds.size} 个 venue）`);
