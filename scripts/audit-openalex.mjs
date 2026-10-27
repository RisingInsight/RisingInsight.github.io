/**
 * 全量审计：28 个 CCF-A/B 会议逐一走页面端同款级联解析，
 * 报告每个会的源解析结果 + 2024/2025 论文量（覆盖评估）。
 *
 * 用法：npm run audit:oa   （OpenAlex 额度 UTC 午夜重置，超限时改日再跑）
 * 产出：audit-report.txt（同步用于决定是否需要把某会加入人工覆盖表）
 */
import fs from 'node:fs';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

// 与页面端一致：走系统代理（若配置了 HTTP(S)_PROXY），否则直连
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));

const FILLER = new Set(['the','a','an','of','on','in','and','for','annual','international','conference','conferences','symposium','advances','proceedings','joint','acm','ieee','cvf','sig']);
const EXCLUDE_RE = /workshops|demos\b/i;
const MAILTO = '1668676243%40qq.com';

function coreWords(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w && !FILLER.has(w));
}
function normName(s) { return coreWords(s).join(' '); }
function acronymOf(fullName) { return coreWords(fullName).map(w => w[0]).join(''); }
function scoreSource(confTitle, src) {
  const a = normName(confTitle), b = normName(src.display_name);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.indexOf(a) !== -1 || a.indexOf(b) !== -1) return 70;
  if (a.length >= 3) {
    const ac = acronymOf(src.display_name);
    if (ac === a) return 90;
    if (a.length >= 4 && ac.endsWith(a)) return 85;
  }
  const wa = a.split(' '), wb = b.split(' ');
  let hit = 0; wa.forEach(w => { if (wb.indexOf(w) !== -1) hit++; });
  return wa.length ? (hit / wa.length) * 55 : 0;
}

const ddl = JSON.parse(fs.readFileSync('src/data/ccf-ddl.json', 'utf8'));
const report = [];
let resolved = 0, missing = 0, errored = 0;

for (const e of ddl.entries) {
  try {
    const r = await fetch('https://api.openalex.org/sources?filter=display_name.search:' + encodeURIComponent(e.title) + '&per-page=15');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const best = (j.results || [])
      .filter(s => {
        if ((s.works_count || 0) < 300) return false;
        if (EXCLUDE_RE.test(String(s.display_name || ''))) return false;
        return true;
      })
      .map(s => ({ s, score: scoreSource(e.title, s) }))
      .sort((x, y) => y.score - x.score || (y.s.works_count || 0) - (x.s.works_count || 0))[0];
    if (best && best.score >= 45) {
      resolved++;
      const sid = String(best.s.id).split('/').pop();
      const years = {};
      for (const y of [2024, 2025, 2026]) {
        try {
          const c = await (await fetch(`https://api.openalex.org/works?filter=primary_location.source.id:${sid},publication_year:${y}&per-page=1`)).json();
          years[y] = c.meta.count;
        } catch { years[y] = '?'; }
        await new Promise(r2 => setTimeout(r2, 400));
      }
      report.push(`✓ ${e.rank} ${e.title.padEnd(9)} → ${sid} (score ${best.score}) | 2024:${years[2024]} 2025:${years[2025]} 2026:${years[2026]} | ${String(best.s.display_name).slice(0, 45)}`);
    } else {
      missing++;
      report.push(`✗ ${e.rank} ${e.title.padEnd(9)} → 无通过验证的源（页面走 DBLP 兜底）`);
    }
  } catch (err) {
    errored++;
    report.push(`⚠ ${e.rank} ${e.title.padEnd(9)} → ${err.message}（额度超限，改日重跑）`);
  }
  console.log(report[report.length - 1]);
  await new Promise(r => setTimeout(r, 900));
}

report.push('');
report.push(`覆盖率: ${resolved}/${ddl.entries.length} 解析成功, ${missing} 无源(走DBLP), ${errored} 限流未测`);
fs.writeFileSync('audit-report.txt', report.join('\n') + '\n');
console.log(`\n报告已写入 audit-report.txt`);
