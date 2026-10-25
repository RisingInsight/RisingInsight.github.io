# RisingInsight Blog — Design System (MASTER)

> Source of truth for all UI work in this repo. Any page-specific file in
> `design-system/risinginsight-blog/pages/` overrides these rules.
> Visual identity: **工程手账 / editorial engineering journal** — 暖纸底、墨色正文、
> 朱橙 accent。站点叙事 =「RisingInsight / 黎明」：顶部一抹晨光、暖色纸面、
> 朱橙是朝阳。终端隐喻只做点睛（404 页、搜索、页脚签名行），不再是全站皮肤。

## Product & Audience
- Personal tech blog of a deep-learning researcher; audience is C-end developers/students.
- Tone: calm, literate, precise. Content-first — 首屏必须让读者看到真实文章。
- Stack: Astro 6 + Tailwind CSS 4 (`@theme` inline tokens), fonts self-hosted via @fontsource.

## Colors (semantic tokens — never hardcode hex in components)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | #faf9f7 | #151210 | page background (warm) |
| `--paper-alt` | #f4f1ec | #1a1613 | secondary band |
| `--surface` | #ffffff | #201c17 | cards |
| `--surface-alt` | #f6f4f0 | #2a251f | nested surfaces |
| `--ink` | #201b16 | #ece7df | primary text / primary button |
| `--ink-soft` | #45403a | #cfc8bd | prose body |
| `--muted` | #5d574f | #a59d90 | secondary text |
| `--muted-light` | #7a736a | #877f72 | micro-labels (≥4.5:1) |
| `--rule` / `--rule-soft` | #e7e2da / #efebe4 | #302a23 / #282320 | hairlines |
| `--accent` | #c2410c | #eda25f | links, active, key numbers |
| `--accent-strong` | #99360d | #f2b87e | hover/pressed |
| `--accent-soft` | #f8ece2 | rgba(237,162,95,.13) | tinted fills |

- 唯一环境光：body 顶部 `radial-gradient(…rgba(--accent-rgb,.045)…)` 晨光。禁止再叠网格/辉光/第二色相。
- Terminal chrome tokens `--term-*`（暖深底 + 琥珀 accent）仅用于 404 与代码块语境。

## Typography
- 标题：**Noto Serif SC**（`--font-serif`，400/600/700），中西文统一宋体气质；
  tracking 常规或 +0.01em（中文为主，禁用大负字距）。
- 正文：Inter + 系统中文 sans（`--font-sans`）；prose 1.06rem / 1.9，max-w-[68ch]。
- mono（`--font-mono` JetBrains Mono）：仅作调味 —— 日期、统计行、路径签名、
  TOC 标题、页脚签名。占全站文本 <10%，禁用于导航/按钮/正文标签。
- Hierarchy: 页面 H1 2.1–3.9rem serif；区块 H2 1.25–1.5rem serif；正文 14–15.5px。

## Layout & Spacing
- Shell: `max-w-6xl`；文章列 `max-w-3xl` + prose `max-w-[68ch]`；TOC ≥1400px 浮动于
  `left: calc(50% + 408px)`。
- Radius: `--r-xs 4 / --r-sm 6 / --r-md 10 / --r-lg 14`；pill 按钮与标签 999px。
- Elevation: `--elev-1/2/3` 暖色阴影；卡片默认 elev-1，hover 至多 elev-2 + translateY(-1px)。
- 分隔靠 hairline（`--rule`）与留白，禁止盒子套盒子（同屏最多一层带边框卡片）。

## Components
- `.btn`（pill，ghost）/ `.btn-primary`（墨色实心，hover 变 ink-soft）——不用 accent 做按钮底色。
- `.panel`：唯一卡片形态（surface + rule + elev-1），无伪元素装饰。
- `.sec-head`（衬线小标题 + 右侧动作 + hairline）、`.mono-label`、`.tag`（pill hairline）、
  `.status-dot`（静态）、`.terminal-window`（404 专用）、`.reading-progress`（纯 accent，无渐变）。
- 列表行语言：hairline 分隔，hover 仅标题变 accent；无底色填充、无左侧滑入竖条。

## Motion
- `--ease-out-expo`；150–300ms。入场 `.reveal`（14px 上移渐显）。
- hover 反馈只留一重（颜色或边框）。禁止：脉冲、无限循环动画、打字机循环
  （开场动画与 404 光标是仅有的例外）。

## Accessibility Rules (enforced)
- 文本对比 ≥4.5:1（两套主题），`--muted-light` 是允许的最浅文本色。
- 全局 `:focus-visible` 2px accent outline；modal 焦点圈禁 + 还原；Esc 关闭。
- `html scroll-padding-top`（5.5rem 移动 / 7rem md+）补偿粘性头部；prose 标题 7rem。
- `pointer: coarse` 下 `.btn ≥44px`、`.tag` 加大、图标按钮 ≥40px。
- 每页 `<main id="main">` + `.skip-link`。
- 装饰符号（→ ↗ $ ●）一律 `aria-hidden="true"`。
- `theme-color` meta 双声明（亮/暗），运行时同步全部实例。

## Signature Moves（站点的辨识度所在，勿删）
1. **片头字幕（Bienville 式，每会话一次）**：墨幕上 `BUILD. / BREAK. / DOCUMENT.`
   逐词砸入（scale+blur 收定）+ 底部朱橙进度线；2.3s 幕布上提交棒正片，
   中文巨字延迟到 2.42s 接棒升起。跳过：点击 / 滚轮 / 触摸 / Esc·Enter·Space·↓。
   纯 CSS 时间轴（JS 挂了也会自清）；会话标记 `sessionStorage['hero-title-seen']`；
   reduced-motion 完全跳过。
2. **影院式首屏**：全屏破晓实拍（夜空→银河→晨光，雪山镜湖延时）+ 奶白衬线巨字 +
   胶片颗粒（SVG feTurbulence，overlay）+ 滚动视差（画面下沉、内容淡出、底部溶入
   纸面——无闪光切换）。不锁滚动（片头 2.4s 内除外）。素材 `public/media/hero-dawn.mp4`
   （Pexels #857251，免费免署名；**弧线已反转为 蓝夜→银河→破晓暖光，播放一次停在
   末帧**，有 pause 守卫 + visibilitychange 续播）+ poster（蓝夜首帧）+
   `hero-dawn-end.jpg`（破晓帧，移动端/reduced-motion 静态兜底）。
3. **灵鸮 = 品牌标记**（CatMascot `static` 模式）：header logo、favicon.svg、404 页
   栖在终端上。静态、克制、每页最多一次。**禁止**再做漂浮挂件 / 跟随鼠标 / 像素替代品。
4. **Playground 去噪循环**（DenoiseLoop.astro）：首页第二屏，自动重播 t=200→0，
   悬停暂停；复用 /demo/image-reverse.webp 帧序列；完整交互版链到
   blog/image-diffusion-demo。**首页内容优先级：Playground > 文章列表 > 留言 CTA > 热力图。**
5. **访问统计卡**（VisitStats.astro，首页侧栏）：展示值 = `VISIT_SEED`（consts.ts，
   可控起始值）+ 不蒜子真实计数；SSR 直接渲染 seed，busuanzi 拉取失败/本地预览安静降级。
   改起始值只动 consts.ts。统计卡是唯一允许的"站点仪表"。
6. 文章页 `~/posts/…` 路径签名（唯一保留的终端元素之一）。
7. 页脚 `$ echo "keep building"▌` 签名行；404 页终端 + 搜索弹窗 grep 语汇。

## Content Rules（内容即设计）
- 首屏永远给真实内容，不摆站点仪表；**禁止** uptime 天数这类自曝数字。
- 热力图放页尾，不与文章列表争夺第二屏。
- 文章少于 10 篇之前，不要再加任何仪式性装饰——页面上的每一克注意力都欠着内容。

## Anti-patterns (avoid)
- **任何阻塞性开场**：遮罩层、锁滚动、强制点击、24h 门禁。动效跟着页面与滚动走，不跟着时钟走。
- **首屏全屏媒介上的辉光滥用**：颗粒用静态 SVG 噪声，遮罩只用渐变压暗；发光阴影（box-shadow glow）仍然禁止。
- 大面积 11px 大写 mono 标签；网格纸背景；双 accent。
- cursor-glow / 鼠标光效（触屏上是污渍）。
- 无衬线大标题混中文回落；中文标题用负字距。
- 面板内嵌面板；hover 三重反馈；无限循环的页面动效（Playground 的内容循环除外）。
- 首屏放站点统计仪表而非真实内容；多于一只的吉祥物。
- 主题切换时首屏风格翻转（影院首屏明暗两套主题下都是同一块暗色银幕，文字用奶白——见 VisitStats 外的 hero 专用色）。
