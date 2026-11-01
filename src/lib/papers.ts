// 论文数据层：OpenAlex（覆盖面完整）+ Semantic Scholar（补齐 OpenAlex 缺失的会议）。
// 两个接口都免 key、允许浏览器跨域；S2 未认证限流约 1 req/s，这里做节流与 429 退避。

import type { Venue } from '../data/venues';

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  more: boolean;
  abstract: string;
  cites: number;
  year: number;
  venueId: string;
  venueShort: string;
  venueFull: string;
  venueType: 'conference' | 'journal';
  doi: string;
  pdf: string;
  oaUrl: string;
  /** 论文官方代码仓库（从摘要提取，快照数据才有） */
  code?: string;
  /** arXiv id（CVF 快照） */
  arxiv?: string;
  link: string;
  fulltext: boolean;
  source: 'openalex' | 's2' | 'cvf' | 'pmlr' | 'iclr' | 'jmlr' | 'dblp';
}

export type PaperProgress = (loaded: number, total: number, provider: Paper['source']) => void;

const OA = 'https://api.openalex.org';
const OA_MAILTO = '1668676243@qq.com';
const S2 = 'https://api.semanticscholar.org/graph/v1/paper/search/bulk';
const S2_FIELDS = 'title,abstract,authors,year,venue,citationCount,externalIds,openAccessPdf';

const cache = new Map<string, Paper[]>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let oaLast = 0;
let s2Last = 0;

// OpenAlex / S2 的 OA 字段里偶尔混入 sci-hub 镜像（多半已失效），一律丢弃，
// 让链接回退到 DOI / 官方页
const BAD_LINK_RE = /sci-hub/i;
function cleanUrl(url?: string): string {
  const value = String(url || '').trim();
  return value && !BAD_LINK_RE.test(value) ? value : '';
}

function abstractFromIndex(inv: Record<string, number[]> | null | undefined): string {
  if (!inv) return '';
  let max = 0;
  for (const positions of Object.values(inv)) {
    for (const pos of positions || []) {
      if (pos + 1 > max) max = pos + 1;
    }
  }
  if (!max) return '';
  const words = new Array<string>(max);
  for (const [word, positions] of Object.entries(inv)) {
    for (const pos of positions || []) words[pos] = word;
  }
  return words.filter(Boolean).join(' ');
}

async function oaJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = Math.max(0, 350 - (Date.now() - oaLast));
    if (wait) await sleep(wait);
    oaLast = Date.now();
    const res = await fetch(url);
    if (res.status === 429 || res.status === 403) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
    return res.json();
  }
  throw new Error('OpenAlex rate limited');
}

async function s2Json(url: string): Promise<any> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = Math.max(0, 1200 - (Date.now() - s2Last));
    if (wait) await sleep(wait);
    s2Last = Date.now();
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
    return res.json();
  }
  throw new Error('Semantic Scholar rate limited');
}

function normalizeBase(venue: Venue, year: number) {
  return {
    year,
    venueId: venue.id,
    venueShort: venue.short,
    venueFull: venue.full,
    venueType: venue.type,
  };
}

async function loadOpenAlex(venue: Venue, year: number, onProgress?: PaperProgress): Promise<Paper[]> {
  if (!venue.oa) throw new Error('missing OpenAlex source');
  const sourceId = venue.oa.replace(/^https:\/\/openalex\.org\//, '');
  const papers: Paper[] = [];
  let total = 0;
  for (let page = 1; page <= 50; page++) {
    const url =
      `${OA}/works?filter=primary_location.source.id:${sourceId},publication_year:${year}` +
      `&sort=cited_by_count:desc&per-page=200&page=${page}` +
      `&select=title,authorships,doi,cited_by_count,open_access,id,abstract_inverted_index,best_oa_location,locations` +
      `&mailto=${OA_MAILTO}`;
    const data = await oaJson(url);
    total = Number(data.meta?.count) || total;
    const batch = (data.results || []).map((work: any): Paper => {
      const oaId = work.id ? String(work.id).split('/').pop() : '';
      const pdf = cleanUrl(work.best_oa_location && work.best_oa_location.pdf_url);
      const oaUrl = cleanUrl(work.open_access && work.open_access.oa_url);
      const doi = work.doi || '';
      // 出版商付费墙后面的论文通常有免费的 arXiv 版本，从 locations 里挖出来
      const arxiv =
        (work.locations || [])
          .map((loc: any) => String(loc?.landing_page_url || ''))
          .map((u: string) => u.match(/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/))
          .find(Boolean)?.[1] || '';
      const authors = (work.authorships || [])
        .slice(0, 6)
        .map((a: any) => a.author && a.author.display_name)
        .filter(Boolean);
      return {
        ...normalizeBase(venue, year),
        id: `oa:${oaId || `${venue.id}-${year}-${papers.length + 1}`}`,
        title: work.title || '(untitled)',
        authors,
        more: (work.authorships || []).length > 6,
        abstract: abstractFromIndex(work.abstract_inverted_index),
        cites: work.cited_by_count || 0,
        doi,
        pdf,
        oaUrl,
        arxiv,
        link: pdf || oaUrl || doi || (oaId ? `https://openalex.org/${oaId}` : '#'),
        fulltext: Boolean(pdf || oaUrl || arxiv),
        source: 'openalex',
      };
    });
    papers.push(...batch);
    onProgress?.(papers.length, total, 'openalex');
    if (batch.length === 0) break;
  }
  return papers;
}

async function loadS2(venue: Venue, year: number, onProgress?: PaperProgress): Promise<Paper[]> {
  if (!venue.s2) throw new Error('missing Semantic Scholar venue');
  const papers: Paper[] = [];
  let token = '';
  let total = 0;
  for (let page = 0; page < 10; page++) {
    const url =
      `${S2}?query=*&venue=${encodeURIComponent(venue.s2)}&year=${year}` +
      `&fields=${S2_FIELDS}&limit=1000${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    const data = await s2Json(url);
    total = Number(data.total) || total;
    const batch = (data.data || []).map((item: any): Paper => {
      const doi = item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : '';
      const pdf = cleanUrl(item.openAccessPdf?.url);
      const arxiv = item.externalIds?.ArXiv || '';
      const paperId = item.paperId || `${venue.id}-${year}-${papers.length + 1}`;
      const authors = (item.authors || []).map((a: any) => a.name).filter(Boolean).slice(0, 6);
      return {
        ...normalizeBase(venue, year),
        id: `s2:${paperId}`,
        title: item.title || '(untitled)',
        authors,
        more: (item.authors || []).length > 6,
        abstract: item.abstract || '',
        cites: item.citationCount || 0,
        doi,
        pdf,
        oaUrl: '',
        arxiv,
        link: pdf || doi || arxiv || `https://www.semanticscholar.org/paper/${paperId}`,
        fulltext: Boolean(pdf || doi || arxiv),
        source: 's2',
      };
    });
    papers.push(...batch);
    onProgress?.(papers.length, total, 's2');
    token = data.token || '';
    if (!token || batch.length === 0) break;
  }
  return papers;
}

async function loadSnapshot(
  snapshotPath: string,
  venue: Venue,
  year: number,
  onProgress?: PaperProgress
): Promise<Paper[]> {
  // 静态文件在烤制进程重写时可能读到半截 JSON，失败重试一次
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(snapshotPath);
      if (!res.ok) throw new Error(`snapshot ${res.status}`);
      const data = await res.json();
      const source: Paper['source'] = data.provider || 'cvf';
      const papers: Paper[] = (data.papers || []).map((paper: any) => ({
        ...paper,
        id: paper.id,
        title: paper.title,
        authors: paper.authors || [],
        more: false,
        abstract: paper.abstract || '',
        cites: paper.cites || 0,
        year,
        venueId: venue.id,
        venueShort: venue.short,
        venueFull: venue.full,
        venueType: venue.type,
        doi: paper.doi || '',
        pdf: cleanUrl(paper.pdf),
        oaUrl: cleanUrl(paper.oaUrl || paper.url),
        code: paper.code || '',
        arxiv: paper.arxiv || '',
        link: cleanUrl(paper.link) || cleanUrl(paper.pdf) || cleanUrl(paper.url) ||
          (paper.doi ? `https://doi.org/${String(paper.doi).replace(/^https:\/\/doi\.org\//, '')}` : '#'),
        fulltext: Boolean(cleanUrl(paper.pdf) || cleanUrl(paper.url) || paper.doi),
        source,
      }));
      onProgress?.(papers.length, papers.length, source);
      return papers;
    } catch (error) {
      lastError = error;
      await sleep(400);
    }
  }
  throw lastError;
}

export async function loadVenuePapers(
  venue: Venue,
  year: number,
  onProgress?: PaperProgress
): Promise<Paper[]> {
  const key = `${venue.id}:${year}:${venue.provider}`;
  const cached = cache.get(key);
  if (cached) {
    const source = cached[0]?.source || venue.provider;
    onProgress?.(cached.length, cached.length, source);
    return cached;
  }

  let papers = await loadVenueYear(venue, year, onProgress);
  if (papers.length === 0) {
    // 主源没有收录（新会偏慢/源缺失）→ 换另一家 API 再试一次
    const alt = venue.provider === 's2' ? loadOpenAlex : loadS2;
    const hasAlt = venue.provider === 's2' ? Boolean(venue.oa) : Boolean(venue.s2);
    if (hasAlt) {
      try {
        papers = await alt(venue, year, onProgress);
      } catch {
        papers = [];
      }
    }
  }

  papers.sort((a, b) => b.cites - a.cites);
  cache.set(key, papers);
  return papers;
}

/** 快照优先，其次主 API；主 API 抛错时退到备 API，全失败才抛出。 */
async function loadVenueYear(
  venue: Venue,
  year: number,
  onProgress?: PaperProgress
): Promise<Paper[]> {
  const snapshot = venue.snapshots?.[year];
  if (snapshot) {
    try {
      const papers = await loadSnapshot(snapshot, venue, year, onProgress);
      if (papers.length > 0) return papers;
    } catch {
      // 快照缺失/网络失败 → 走 API
    }
  }

  const primary = venue.provider === 's2' ? loadS2 : loadOpenAlex;
  const secondary = venue.provider === 's2' ? loadOpenAlex : loadS2;
  try {
    return await primary(venue, year, onProgress);
  } catch (error) {
    const hasSecondary = venue.provider === 's2' ? Boolean(venue.oa) : Boolean(venue.s2);
    if (!hasSecondary) throw error;
    try {
      return await secondary(venue, year, onProgress);
    } catch {
      throw error;
    }
  }
}

export function bibtexKey(paper: Paper): string {
  const surname = (paper.authors[0] || 'paper').split(/\s+/).pop() || 'paper';
  const word = paper.title.split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, '');
  return `${surname}${paper.year}${word}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bibField(value: string): string {
  return String(value || '').replace(/[{}]/g, '');
}

export function toBibtex(paper: Paper): string {
  const isJournal = paper.venueType === 'journal';
  const type = isJournal ? 'article' : 'inproceedings';
  const field = isJournal ? 'journal' : 'booktitle';
  const lines = [
    `@${type}{${bibtexKey(paper)},`,
    `  title = {${bibField(paper.title)}},`,
    `  author = {${paper.authors.map(bibField).join(' and ')}},`,
    `  ${field} = {${bibField(paper.venueFull)}},`,
    `  year = {${paper.year}}`,
  ];
  const doi = paper.doi.replace(/^https:\/\/doi\.org\//, '');
  if (doi) lines[lines.length - 1] += ',';
  if (doi) lines.push(`  doi = {${doi}}`);
  if (paper.link && paper.link !== '#') {
    lines[lines.length - 1] += ',';
    lines.push(`  url = {${paper.link}}`);
  }
  lines.push('}');
  return lines.join('\n');
}
