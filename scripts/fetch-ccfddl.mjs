/**
 * 抓取 ccfddl/ccf-deadlines 社区仓库的会议截稿数据（MIT 许可），
 * 取每个会议最近一届的轮次信息，筛 CCF-A / CCF-B，
 * 写入 src/data/ccf-ddl.json 供 /ddl/ 页面静态使用。
 *
 * 用法：npm run fetch:ddl
 * 失败时保留旧快照（构建不因网络中断）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const AREAS = ['AI', 'MX']; // 人工智能 + 交叉/多媒体（深度学习研究者相关）
const RANKS = ['A', 'B'];
const OUT = path.resolve('src/data/ccf-ddl.json');
const UA = 'RisingInsight-blog-build (github.com/RisingInsight)';

async function ghJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const entries = [];

for (const area of AREAS) {
  const dir = await ghJson(`https://api.github.com/repos/ccfddl/ccf-deadlines/contents/conference/${area}`);
  for (const file of dir.filter((f) => f.type === 'file' && f.name.endsWith('.yml'))) {
    try {
      const text = await fetchText(file.download_url);
      const confs = parse(text);
      for (const c of Array.isArray(confs) ? confs : [confs]) {
        if (!c || !c.rank || !RANKS.includes(String(c.rank.ccf))) continue;
        // 取最近一届（year 最大）
        const latest = (c.confs || []).reduce((a, b) => ((b.year || 0) > (a?.year || 0) ? b : a), null);
        if (!latest || !latest.timeline) continue;
        const timelines = latest.timeline
          .filter((tl) => tl && (tl.deadline || tl.abstract_deadline))
          .map((tl) => ({
            comment: tl.comment || '',
            abstract: tl.abstract_deadline || null,
            deadline: tl.deadline || tl.abstract_deadline,
          }));
        if (timelines.length === 0) continue;
        entries.push({
          id: c.id || file.name.replace('.yml', ''),
          title: c.title || c.id,
          description: c.description || '',
          sub: c.sub || area,
          rank: String(c.rank.ccf),
          dblp: c.dblp || null,
          year: latest.year,
          confId: latest.id || '',
          link: latest.link || c.website || '',
          timezone: latest.timezone || 'UTC-12',
          date: latest.date || '',
          place: latest.place || '',
          timelines,
        });
      }
      console.log(`  ✓ ${area}/${file.name}`);
    } catch (e) {
      console.warn(`  ✗ ${area}/${file.name}: ${e.message}`);
    }
  }
}

// ---- OpenAlex source 解析：把会议映射到 OpenAlex 的 proceedings source ----
// 结果烤进快照（有缓存时复用，只解析缺失的），页面端用它实时拉历年中稿论文。
// OpenAlex 免费开放（CORS *），加 mailto 进 polite pool。
const MAILTO = '1668676243@qq.com';
const prevEntries = fs.existsSync(OUT)
  ? (JSON.parse(fs.readFileSync(OUT, 'utf8')).entries || [])
  : [];
const prevById = new Map(prevEntries.map((e) => [`${e.id}:${e.year}`, e]));

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function scoreMatch(confTitle, src) {
  const a = norm(confTitle);
  const b = norm(src.display_name);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 60;
  // 词级重合
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  let hit = 0;
  wa.forEach((w) => { if (wb.has(w) && w.length > 2) hit++; });
  return wa.size ? (hit / wa.size) * 40 : 0;
}

async function resolveOpenAlex(entry) {
  const q = entry.description || entry.title;
  const url = `https://api.openalex.org/sources?search=${encodeURIComponent(q)}&per-page=10&mailto=${MAILTO}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const data = await res.json();
    const best = (data.results || [])
      .map((s) => ({ s, score: scoreMatch(entry.title, s) }))
      .sort((x, y) => y.score - x.score)[0];
    if (best && best.score >= 40) return best.s.id; // e.g. "https://openalex.org/S123"
    return null;
  } catch (e) {
    return null;
  }
}

console.log('解析 OpenAlex source（有缓存则跳过）…');
for (const e of entries) {
  const cached = prevById.get(`${e.id}:${e.year}`)?.openalexId;
  if (cached !== undefined && cached !== null) {
    e.openalexId = cached;
    continue;
  }
  if (cached === null) { e.openalexId = null; continue; }
  e.openalexId = await resolveOpenAlex(e);
  console.log(`  ${e.rank} ${e.title}: ${e.openalexId || '(未匹配，页面走 DBLP 兜底)'}`);
  await new Promise((r) => setTimeout(r, 150)); // 轻限速
}

// 按最早一轮截止时间升序
const key = (e) => e.timelines.map((t) => t.deadline).sort()[0];
entries.sort((a, b) => String(key(a)).localeCompare(String(key(b))));

const payload = {
  fetchedAt: new Date().toISOString(),
  source: 'https://github.com/ccfddl/ccf-deadlines',
  count: entries.length,
  entries,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
if (entries.length === 0 && prev) {
  console.warn('抓取结果为空，保留旧快照');
} else {
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`✓ 写入 ${OUT}：${entries.length} 条（${AREAS.join(' + ')}，CCF-A/B）`);
}
