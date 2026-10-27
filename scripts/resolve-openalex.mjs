/**
 * 为 src/data/ccf-ddl.json 中的会议补 OpenAlex source ID（幂等，可重复跑）。
 * 已有 openalexId（含 null=确认无匹配）的条目跳过；只解析缺失的。
 * 页面端用该 ID 实时拉取历年中稿论文（OpenAlex，CORS 开放，免 key）。
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('src/data/ccf-ddl.json');
const MAILTO = '1668676243@qq.com';
const UA = 'RisingInsight-blog-build (github.com/RisingInsight)';

const payload = JSON.parse(fs.readFileSync(OUT, 'utf8'));

// 填充词：会议全称与 OpenAlex source 名常只差这些前缀
// （Annual Conference on X ≡ Advances in X ≡ X）
const FILLER = new Set([
  'the', 'a', 'an', 'of', 'on', 'in', 'and', 'for',
  'annual', 'international', 'conference', 'conferences', 'symposium',
  'advances', 'proceedings', 'joint', 'acm', 'ieee', 'cvf', 'sig',
]);
// workshops 等衍生场不作为主源（CVPR Workshops ≠ CVPR 主会）
const EXCLUDE_RE = /workshops|demos/i;
function coreWords(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !FILLER.has(w));
}
function norm(s) {
  return coreWords(s).join(' ');
}
// 缩写 → 全称词首拼接；CVPR 等含主办方前缀的会议用尾部子序列匹配
function acronymOf(fullName) {
  return coreWords(fullName).map((w) => w[0]).join('');
}
function scoreMatch(confTitle, src) {
  const a = norm(confTitle);
  const b = norm(src.display_name);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 70;
  if (a.length >= 3) {
    const ac = acronymOf(src.display_name);
    if (ac === a) return 90;
    if (a.length >= 4 && ac.endsWith(a)) return 85;
  }
  const wa = new Set(a.split(' '));
  const wb = new Set(b.split(' '));
  let hit = 0;
  wa.forEach((w) => { if (wb.has(w)) hit++; });
  return wa.size ? (hit / wa.size) * 55 : 0;
}

async function searchSourcesWithRetry(q) {
  // OpenAlex 免费档限流明显：重试 + 指数退避，空结果也重试一次
  const url = `https://api.openalex.org/sources?search=${encodeURIComponent(q)}&per-page=10&mailto=${MAILTO}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 403) throw new Error('rate ' + res.status);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.results && data.results.length > 0) return data.results;
      // 空结果可能也是被限流的形态：短退避后再试一次
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  return [];
}

let resolved = 0;
let missing = 0;
for (const e of payload.entries) {
  if (e.openalexId !== undefined) continue; // 含 null：确认过无匹配
  const q = e.description || e.title;
  try {
    const results = await searchSourcesWithRetry(q);
    // 真正的会议系列源 works_count 都在数百以上；小数字多为残缺/重复记录
    const best = results
      .filter((s) => {
        if ((s.works_count || 0) < 300) return false;
        if (EXCLUDE_RE.test(String(s.display_name || ''))) return false;
        return true;
      })
      .map((s) => ({ s, score: scoreMatch(e.title, s) }))
      // 同分时取 works_count 更大的主源
      .sort((x, y) => y.score - x.score || (y.s.works_count || 0) - (x.s.works_count || 0))[0];
    e.openalexId = best && best.score >= 45 ? best.s.id : null;
  } catch (err) {
    console.warn(`  ✗ ${e.title}: ${err.message}`);
    continue; // 失败的下次再试（不写 null）
  }
  if (e.openalexId) resolved++; else missing++;
  console.log(`  ${e.rank} ${e.title} ${e.year}: ${e.openalexId || '(无匹配→页面走 DBLP 兜底)'}`);
  await new Promise((r) => setTimeout(r, 700));
}

payload.fetchedAt = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`✓ 完成：新解析 ${resolved} 个，无匹配 ${missing} 个，其余沿用缓存`);
