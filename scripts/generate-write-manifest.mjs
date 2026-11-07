/**
 * 构建期生成「在线写作」用清单。
 *
 * /write 是纯静态页面，没有服务端可读仓库文件，因此把已发布文章的
 * 原始 Markdown（含 frontmatter）烤进一份 JSON，编辑器用 fetch 读取，
 * 即可在浏览器里「打开并修改已有文章」，再经发布桥接提交回 GitHub。
 *
 * 安全约定：draft: true 的草稿不写入清单，避免未发布内容被公开。
 * 本地草稿由编辑器的 localStorage 承担，同样不需要进入产物。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = path.join(root, 'src', 'content', 'blog');
const outFile = path.join(root, 'public', 'write-manifest.json');

function parseFrontmatter(raw) {
  const clean = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = clean.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fields: {}, content: clean };
  const fields = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return { fields, content: clean };
}

function isTrue(value) {
  return typeof value === 'string' && /^true$/i.test(value.replace(/["']/g, '').trim());
}

const files = (await readdir(blogDir))
  .filter((f) => /\.(md|mdx)$/i.test(f))
  .sort();

const posts = [];
for (const file of files) {
  const raw = await readFile(path.join(blogDir, file), 'utf8');
  const { fields, content } = parseFrontmatter(raw);
  if (isTrue(fields.draft)) continue;
  const slug = file.replace(/\.(md|mdx)$/i, '');
  posts.push({
    slug,
    file,
    title: (fields.title || slug).replace(/^["']|["']$/g, ''),
    content,
  });
}

await writeFile(
  outFile,
  JSON.stringify({ generatedAt: new Date().toISOString(), count: posts.length, posts }),
  'utf8'
);
console.log(`[write] manifest: ${posts.length} 篇已发布文章 -> public/write-manifest.json`);
