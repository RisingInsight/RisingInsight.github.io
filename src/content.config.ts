import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * 文献引用：由 /write 编辑器或 CCF 门户的「写成笔记」写入。
 * 正文用 [@key] 引用，BlogPost 会在文末渲染参考文献列表，
 * src/scripts/citations.ts 负责把 [@key] 变成可跳转的上标。
 */
const referenceSchema = z.object({
  key: z.string(),
  title: z.string(),
  authors: z.array(z.string()).default([]),
  year: z.coerce.string().optional(),
  venue: z.string().optional(),
  url: z.string().optional(),
  doi: z.string().optional(),
  arxiv: z.string().optional(),
  pdf: z.string().optional(),
  bibtex: z.string().optional(),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.string().optional(),
      ogImage: z.string().optional(),
      tags: z.array(z.string()).default([]),
      categories: z.array(z.string()).default([]),
      math: z.boolean().default(false),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      series: z.string().optional(),
      references: z.array(referenceSchema).default([]),
    }),
});

export const collections = { blog };
