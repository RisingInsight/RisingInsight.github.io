/**
 * 构建后断言：Pagefind 索引必须存在。
 * 以前 `astro build && pagefind` 链式命令一旦前半段异常，索引会被静默跳过，
 * 搜索会悄悄降级成「只搜标题/标签」。这里让缺失索引直接构建失败。
 */
import { access, stat } from 'node:fs/promises';
import path from 'node:path';

const target = path.resolve('dist/pagefind/pagefind.js');
try {
  await access(target);
  const info = await stat(target);
  if (info.size < 100) throw new Error('pagefind.js 体积异常');
  console.log(`[search] 索引就绪：dist/pagefind/pagefind.js (${info.size} B)`);
} catch (err) {
  console.error('[search] 缺少 Pagefind 索引，全文搜索会降级。请检查 postbuild 是否执行成功。');
  throw err;
}
