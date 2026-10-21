import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

// 统计中英文字数：CJK 按字，拉丁按词，忽略代码、标签和块级公式
export function getWordCount(content: string): number {
  const plain = content
    .replace(/^import\s.+$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, ' ');

  const cjk = plain.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g)?.length ?? 0;
  const latin = plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  return cjk + latin;
}

export function formatWordCount(count: number): string {
  return count.toLocaleString('zh-CN');
}

// 计算阅读时间（中文按字符数估算）
export function getReadTime(content: string): string {
  const minutes = Math.max(1, Math.ceil(content.length / 500));
  return `${minutes} min`;
}

// 统一日期格式：2026.01.02
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function seriesSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'series';
}

export interface SeriesGroup {
  name: string;
  slug: string;
  posts: BlogPost[];
  words: number;
  latest: Date;
}

export function getSeriesGroups(posts: BlogPost[]): SeriesGroup[] {
  const grouped = new Map<string, BlogPost[]>();
  for (const post of posts) {
    if (!post.data.series) continue;
    const existing = grouped.get(post.data.series);
    if (existing) existing.push(post);
    else grouped.set(post.data.series, [post]);
  }

  return [...grouped.entries()]
    .map(([name, seriesPosts]) => {
      seriesPosts.sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
      return {
        name,
        slug: seriesSlug(name),
        posts: seriesPosts,
        words: seriesPosts.reduce((sum, post) => sum + getWordCount(post.body || ''), 0),
        latest: seriesPosts[seriesPosts.length - 1].data.pubDate,
      };
    })
    .sort((a, b) => b.latest.valueOf() - a.latest.valueOf());
}
