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
  link: string;
  fulltext: boolean;
  source: 'openalex' | 's2';
}

export type PaperProgress = (loaded: number, total: number, provider: 'openalex' | 's2') => void;

const OA = 'https://api.openalex.org';
const OA_MAILTO = '1668676243@qq.com';
const S2 = 'https://api.semanticscholar.org/graph/v1/paper/search/bulk';
const S2_FIELDS = 'title,abstract,authors,year,venue,citationCount,externalIds,openAccessPdf';

const cache = new Map<string, Paper[]>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let oaLast = 0;
let s2Last = 0;

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
  for (let page = 1; page <= 20; page++) {
    const url =
      `${OA}/works?filter=primary_location.source.id:${sourceId},publication_year:${year}` +
      `&sort=cited_by_count:desc&per-page=200&page=${page}` +
      `&select=title,authorships,doi,cited_by_count,open_access,id,abstract_inverted_index,best_oa_location` +
      `&mailto=${OA_MAILTO}`;
    const data = await oaJson(url);
    total = Number(data.meta?.count) || total;
    const batch = (data.results || []).map((work: any): Paper => {
      const oaId = work.id ? String(work.id).split('/').pop() : '';
      const pdf = (work.best_oa_location && work.best_oa_location.pdf_url) || '';
      const oaUrl = (work.open_access && work.open_access.oa_url) || '';
      const doi = work.doi || '';
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
        link: pdf || oaUrl || doi || (oaId ? `https://openalex.org/${oaId}` : '#'),
        fulltext: Boolean(pdf || oaUrl),
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
      const pdf = item.openAccessPdf?.url || '';
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
        link: pdf || doi || `https://www.semanticscholar.org/paper/${paperId}`,
        fulltext: Boolean(pdf || doi),
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

export async function loadVenuePapers(
  venue: Venue,
  year: number,
  onProgress?: PaperProgress
): Promise<Paper[]> {
  const key = `${venue.id}:${year}:${venue.provider}`;
  const cached = cache.get(key);
  if (cached) {
    onProgress?.(cached.length, cached.length, venue.provider);
    return cached;
  }
  const papers = venue.provider === 's2'
    ? await loadS2(venue, year, onProgress)
    : await loadOpenAlex(venue, year, onProgress);
  papers.sort((a, b) => b.cites - a.cites);
  cache.set(key, papers);
  return papers;
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
