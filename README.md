# RisingInsight's Blog

个人技术博客，实验室终端风：记录生成模型、深度学习与工程实践。

## 技术栈

- Astro 6 + MDX
- Tailwind CSS 4
- Space Grotesk / Inter / JetBrains Mono
- KaTeX（remark-math / rehype-katex）
- Pagefind 全文搜索
- **CCF 论文门户 `/ccf`**：按 CCF 第七版官方目录浏览会议/期刊全卷论文——17 个领域分组、
  等级排序、摘要/被引/代码链接、收藏（想读/在读/已读）云同步、BibTeX 导出、写成笔记；
  数据来自 OpenAlex + Semantic Scholar + 官方 proceedings 快照，GitHub Actions 每周自动更新
- 站内写作台 `/write`（marked + DOMPurify + KaTeX 预览，可选 Cloudflare Worker 发布桥接）
- Giscus 评论与留言板（GitHub Discussions）
- GitHub Pages + GitHub Actions

## 主题

默认亮色（冷白 + 深海军蓝文字），右上角可切换暗色。终端固定使用深色表面和独立的 `--term-*` 颜色 token，亮色模式下不会复用页面文字色，避免低对比。

## 本地开发

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # prebuild 写作清单 → astro build → postbuild 生成并校验 Pagefind 索引
npm run write:manifest  # 单独重建 public/write-manifest.json
npm run index:search    # 单独重建并校验 Pagefind 索引
npm run preview   # 预览构建结果
```

## 内容

文章位于 `src/content/blog/`，支持 Markdown 与 MDX。常用 frontmatter：

```yaml
title: "文章标题"
description: "摘要"
pubDate: 2026-01-02
updatedDate: 2026-01-03   # 可选
tags: [扩散模型, DDPM]
categories: [深度学习理论]
series: "生成模型笔记"      # 可选
featured: true             # 可选，首页置顶标记
draft: true                # 可选，草稿不会构建
heroImage: "/posts/my-post/cover.jpg"  # 可选
ogImage: "/posts/my-post/og.png"       # 可选，分享图；默认 og-default.png
references:                          # 可选，由 /write 或 CCF「写成笔记」生成
  - key: vaswani2017attention
    title: Attention Is All You Need
    authors: [Ashish Vaswani, Noam Shazeer]
    year: "2017"
    venue: NeurIPS
    url: https://arxiv.org/abs/1706.03762
    bibtex: "@inproceedings{vaswani2017attention, ...}"
```

文章图片放在 `public/posts/<slug>/` 下，正文中用绝对路径引用。

**文献引用**：正文里写 `[@key]`，文章页会把它渲染成指向文末参考文献的上标，并按 `references` 顺序生成带原文 / PDF / DOI / BibTeX 复制的列表（`src/scripts/citations.ts`）。未登记的 key 保持原样，不影响阅读。

## 首屏与灵鸮

- 每会话首次进入时，首页首屏是**滚动驱动的「字幕擦洗」片头**（BUILD IT. → … → DOCUMENT IT.）：滚动距离即片头进度，可往返倒带；点击 / 滚轮 / Esc 可跳过，`prefers-reduced-motion` 下直接跳过。清掉 `sessionStorage['hero-intro-seen']` 可重看。
- 桌面端播放 `hero-dawn.mp4` 一次并停在末帧；移动端与减动效偏好使用静态破晓图。右上角可开关环境音、REPLAY 重播。
- 灵鸮是**静态品牌标记**（header logo / favicon / 404 页），没有漂浮挂件或跟随鼠标的灵宠。

## 在线写作与发布

- `/write/` 是站内编辑器：双栏 Markdown / 实时预览（GFM 表格 + KaTeX 公式）、frontmatter 表单、拖入 `.md` 导入、图片拖拽或粘贴自动归集到 `public/posts/<slug>/`、草稿自动存 localStorage、`Ctrl/⌘+S` 保存，可复制或下载完整 Markdown 离线带走。
- 入口：文章页「在站内编辑」、笔记列表「在站内写文章」、导航栏「写文章」；`?edit=<slug>` 直接打开已发布文章。构建期的 `npm run write:manifest` 生成 `public/write-manifest.json`（**只含非草稿文章**），编辑器据此离线载入原文。
- **一键发布（可选增强）**：把 `workers/publish-worker.js` 部署到 Cloudflare Workers，配置 `GITHUB_TOKEN`（fine-grained PAT，只授本仓库 Contents 读写）、`EDITOR_TOKEN`、`GITHUB_REPO`，然后在 `/write/` →「发布设置」填 Worker 地址和口令。发布时 Worker 通过 GitHub Contents API 把 `.md` 与图片提交到 `main`，由既有 Actions 自动构建部署。详细步骤见 Worker 文件头注释；口令只存在浏览器，不进仓库。
- **读文献 → 写笔记**：`/ccf/` 的每张论文卡片都有「写成笔记 ↗」，收藏面板有「用收藏写笔记」。点击后论文元数据与 BibTeX 会带到 `/write/`，自动生成含 `[@key]` 的笔记骨架。CCF 首屏的检索框搜本地快照 + 收藏，并在线查 OpenAlex（429 时自动降级到 Semantic Scholar）；截稿日已收进折叠区。
- **收藏三态与云同步**：收藏可标记想读 / 在读 / 已读；默认只存本机。给 Worker 绑定名为 `LIBRARY` 的 KV namespace 后，`/ccf/` 会自动 PUT/GET `/library` 跨设备同步（未配置时零网络请求）。
- 不部署 Worker 也能完整写作：用「下载 .md」/「复制」把内容放进仓库，或走文章页保留的 GitHub 编辑外链。撤回已发布修改用 GitHub 的 history/revert。

留言板 `/guestbook/` 使用 Giscus（GitHub Discussions）。登录 GitHub 后可留言，所有者可在 GitHub 删除。

## 热力图与统计

- 创作热力图在构建时读取 `git log`，按作者时区统计真实提交；Actions checkout 已设置 `fetch-depth: 0`。
- 首页 traffic 条使用 Busuanzi 的站点 PV/UV（localhost 不加载，避免统计开发预览）；后续可在同一个 Worker 上接自建计数替换。
- 首页展示文章数、字数、提交数与运行天数，均为构建时真实数据。

## 资源生成

```sh
npm run generate:image-demo   # 从头像生成扩散帧
npm run generate:og           # 重新生成默认 OG 分享图
```

## 部署

推送到 `main` 后由 `.github/workflows/deploy-astro.yml` 自动构建并部署到 GitHub Pages。
