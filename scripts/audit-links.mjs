/**
 * 原文链接可用性审计：逐会议 × 年份统计每篇论文的链接情况
 * （PDF / DOI / OA / 仅列表页），找出「点不开原文」的重灾区。
 *
 * 用法：node scripts/audit-links.mjs
 */
const MAILTO = '1668676243%40qq.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let oaLast = 0;
let s2Last = 0;

async function oaJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = Math.max(0, 300 - (Date.now() - oaLast));
    if (wait) await sleep(wait);
    oaLast = Date.now();
    const res = await fetch(url);
    if (res.status === 429 || res.status === 403) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`OA ${res.status}`);
    return res.json();
  }
  throw new Error('OA rate limited');
}

async function s2Json(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = Math.max(0, 1200 - (Date.now() - s2Last));
    if (wait) await sleep(wait);
    s2Last = Date.now();
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`S2 ${res.status}`);
    return res.json();
  }
  throw new Error('S2 rate limited');
}

const { VENUES } = await import('../src/data/venues.ts');
const YEARS = [2024, 2025, 2026];

const rows = [];
for (const v of VENUES) {
  for (const year of YEARS) {
    const cap = v.maxYear ?? 2026;
    if (year > cap || year < (v.startYear ?? 2013)) continue;
    if (v.recurrence === 'odd' && year % 2 === 0) continue;
    if (v.recurrence === 'even' && year % 2 === 1) continue;
    let stat;
    if (v.oa) {
      const sid = v.oa.replace(/^https:\/\/openalex\.org\//, '');
      try {
        const d = await oaJson(
          `https://api.openalex.org/works?filter=primary_location.source.id:${sid},publication_year:${year}` +
          `&per-page=200&select=open_access,best_oa_location,doi&sample=200&mailto=${MAILTO}`
        );
        const works = d.results || [];
        stat = {
          total: d.meta?.count ?? works.length,
          sampled: works.length,
          pdf: 0, oa: 0, doi: 0, none: 0,
        };
        for (const w of works) {
          const pdf = w.best_oa_location?.pdf_url || '';
          const oa = w.open_access?.oa_url || '';
          const doi = w.doi || '';
          if (pdf) stat.pdf++;
          else if (oa) stat.oa++;
          else if (doi) stat.doi++;
          else stat.none++;
        }
      } catch (e) { stat = { error: e.message }; }
    } else if (v.s2) {
      try {
        const d = await s2Json(
          `https://api.semanticscholar.org/graph/v1/paper/search/bulk?query=*&venue=${encodeURIComponent(v.s2)}&year=${year}` +
          `&fields=externalIds,openAccessPdf&limit=500`
        );
        const works = d.data || [];
        stat = { total: d.total ?? works.length, sampled: works.length, pdf: 0, oa: 0, doi: 0, none: 0 };
        for (const w of works) {
          const pdf = w.openAccessPdf?.url || '';
          const doi = w.externalIds?.DOI || '';
          if (pdf) stat.pdf++;
          else if (doi) stat.doi++;
          else stat.none++;
        }
      } catch (e) { stat = { error: e.message }; }
    } else {
      continue;
    }
    rows.push({ short: v.short, year, provider: v.provider, ...stat });
    const s = stat.error ? `⚠ ${stat.error}` : `${String(stat.total).padStart(5)}篇 | PDF ${String(stat.pdf).padStart(4)} OA ${String(stat.oa).padStart(4)} 仅DOI ${String(stat.doi).padStart(4)} 无链接 ${String(stat.none).padStart(3)}`;
    console.log(`${v.short.padEnd(13)} ${year} ${s}`);
  }
}

console.log('\n=== 无任何直链(仅列表页)比例最高的 venue-year ===');
rows.filter((r) => !r.error && r.sampled > 20)
  .map((r) => ({ ...r, noneRate: r.none / r.sampled }))
  .sort((a, b) => b.noneRate - a.noneRate)
  .slice(0, 15)
  .forEach((r) => console.log(`${r.short} ${r.year}: ${(r.noneRate * 100).toFixed(1)}% 无直链 (${r.none}/${r.sampled})`));
