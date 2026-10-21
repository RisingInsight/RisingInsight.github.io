# RisingInsight's Blog

个人技术博客，实验室终端风：记录生成模型、深度学习与工程实践。

## 技术栈

- Astro 6 + MDX
- Tailwind CSS 4
- Space Grotesk / Inter / JetBrains Mono
- KaTeX（remark-math / rehype-katex）
- Pagefind 全文搜索
- Giscus 评论与留言板（GitHub Discussions）
- GitHub Pages + GitHub Actions

## 主题

默认亮色（冷白 + 深海军蓝文字），右上角可切换暗色。终端固定使用深色表面和独立的 `--term-*` 颜色 token，亮色模式下不会复用页面文字色，避免低对比。

## 本地开发

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # 构建到 dist/，并生成 Pagefind 索引
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
```

文章图片放在 `public/posts/<slug>/` 下，正文中用绝对路径引用。

## 灵宠与开屏

- 每个会话首次进入时播放一次「终端唤醒」开屏：矢量橘猫从扫描线中出现，随后页面淡入；点击任意位置或按 Esc 可跳过，`prefers-reduced-motion` 下直接跳过。
- 左下角橘猫灵宠可点击互动、可隐藏；隐藏后从页脚 System →「灵宠」唤回，状态保存在 localStorage。
- 想重看开屏，在地址后加 `?intro=1`。

## 在线编辑与审核

- 文章页右上角提供 `edit ↗` / `history`，指向 GitHub 网页编辑器和提交历史。
- 非仓库协作者点击编辑会走 GitHub 的 fork + PR 流程；所有者审核并合并后自动部署。
- 文章列表提供 `new post ↗`，可在 GitHub 网页端新建 Markdown/MDX 并上传图片。
- 撤回已发布修改使用 GitHub 的 history/revert；未保存的编辑由浏览器/编辑器撤销。

留言板 `/guestbook/` 使用 Giscus（GitHub Discussions）。登录 GitHub 后可留言，所有者可在 GitHub 删除；先审后发与站内管理后台将使用 Cloudflare Worker + D1 实现。

## 热力图与统计

- 创作热力图在构建时读取 `git log`，按作者时区统计真实提交；Actions checkout 已设置 `fetch-depth: 0`。
- 首页 traffic 条使用 Busuanzi 的站点 PV/UV（localhost 不加载，避免统计开发预览）；后续可用 Cloudflare Worker + D1 替换为自建计数。
- 首页展示文章数、字数、提交数与运行天数，均为构建时真实数据。

## 资源生成

```sh
npm run generate:image-demo   # 从头像生成扩散帧
npm run generate:og           # 重新生成默认 OG 分享图
```

## 部署

推送到 `main` 后由 `.github/workflows/deploy-astro.yml` 自动构建并部署到 GitHub Pages。
