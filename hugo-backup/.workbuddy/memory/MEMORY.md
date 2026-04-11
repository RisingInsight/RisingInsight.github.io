# MEMORY.md - 长期记忆

## 项目信息
- **博客框架**: Hugo v0.154.0 (Extended) + PaperMod 主题
- **部署方式**: GitHub Pages (RisingInsight.github.io)
- **配置文件**: hugo.yaml (单文件配置，非 config.toml)
- **自定义样式**: assets/css/extended.css (CSS 变量体系，学术蓝配色)
- **自定义布局**: layouts/_default/ 覆写 baseof/single/list，layouts/partials/ 覆写多个组件

## 用户偏好
- 偏工程导向，喜欢先深入分析再动手
- 沟通语言默认中文
- 明确要求过"直接改文件即可"，不喜欢空泛建议
- 不想碰代码，后续维护交给 AI
- 免费方案优先，不想为服务器付费
- 博客用途：学习笔记 + 学术展示 + 技术分享（综合）
- 不需要自建后端，接受静态站点 + 第三方服务（Giscus 评论等）

## 技术决策
- 2026-04-11: 配色从绿色系(#10b981)改为学术蓝(#1a56db)，CSS变量体系
- 2026-04-11: 字体方案：正文衬线(Lora)+UI无衬线(Inter)+代码等宽(JetBrains Mono)
- 2026-04-11: 首页从 GIF+打字机改为学术 CV 卡片风格
- 2026-04-11: footer.html 已精简，所有 JS 统一放在 baseof.html 中
- 2026-04-11: Giscus 评论已接入模板，但 repo-id/category-id 需确认

## 注意事项
- Giscus 评论的 repo-id/category-id 可能需要用户手动去 giscus.app 获取并替换
- extended.css 的 @import Google Fonts 在国内可能加载慢
- themes/PaperMod 通过 git submodule 引入，更新主题时需注意布局覆盖冲突
