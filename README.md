# RisingInsight's Blog

个人科研笔记与技术博客，基于 Astro 构建。

## 技术栈

- Astro 6 + MDX
- Tailwind CSS 4
- KaTeX（remark-math / rehype-katex）
- Pagefind 全文搜索
- Giscus 评论
- GitHub Pages + GitHub Actions

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
featured: true             # 可选，显示在首页推荐
draft: true                # 可选，草稿不会构建
heroImage: "/posts/my-post/cover.jpg"  # 可选
ogImage: "/posts/my-post/og.png"       # 可选，分享图；默认 og-default.png
```

文章图片放在 `public/posts/<slug>/` 下，正文中用绝对路径引用。

## 交互 Demo

`npm run generate:image-demo` 会从 `public/avatar.jpg` 生成 `public/demo/*.webp` 的扩散帧，供 `/lab` 和图像扩散文章使用。

## 部署

推送到 `main` 后由 `.github/workflows/deploy-astro.yml` 自动构建并部署到 GitHub Pages。
