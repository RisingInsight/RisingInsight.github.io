# Hugo搭建个人博客

## Hexo和Hugo对比

- **Hexo (基于 Node.js):**
  - **原理：** 它是用 JavaScript 写的，依赖庞大的 node_modules 库。
  - **痛点：** “偶尔使用”，如果今天搭好了 Hexo，过了半年想写篇新文章，再次打开时，很可能因为 Node.js 版本更新、某个插件作者弃坑、或者依赖包冲突，导致**直接报错运行不起来**。
  - **现象：** 著名的“依赖地狱”。为了修好它，可能需要花一整天折腾环境，而不是写文章。
  - **编译速度**：Hexo随着文章数量增加（比如写了100篇笔记），生成一次静态网站可能需要几十秒甚至几分钟。
  - **代码块和数学公式**：Hexo原生对数学公式（LaTeX）支持较差。通常需要安装第三方渲染插件（如 hexo-renderer-pandoc 或 hexo-math），这些插件的配置非常繁琐，经常出现公式渲染不出来、和 Markdown 语法冲突的问题（比如下划线 _ 被转义）。
  - **主题风格**：Hexo 的生态比较偏向“二次元”、“花哨”、“社交化”。著名的 Next、Butterfly 主题功能极其强大，有很多动画特效、看板娘、复杂的侧边栏。这**不符合**想要的“简约、学术”风格。
- **Hugo (基于 Go 语言):**
  - **原理：** 它就是一个**单一的二进制文件** (hugo.exe)。
  - **优势：** 不需要安装任何依赖库。无论过了多久，只要这个 exe 文件还在，博客就能生成。**极其稳定，零维护成本**。
  - **编译速度**：Hugo是目前世界上最快的静态网站生成器。生成几百篇文章通常只需要 **几毫秒到几秒**。这种“修改即预览”的快感，对写作体验的提升是巨大的。
  - **代码块和数学公式**： Hugo虽然原生也需要配置，但 **PaperMod** 主题，已经**内置**了对 MathJax/KaTeX 的完美支持。只需要在配置文件里把 math: true 打开，就能直接写公式，非常省心。
  - **主题风格**：Hugo 的生态比较偏向“极客”、“技术文档”、“学术”。PaperMod、MemE 等主题都非常克制，排版干净，加载速度极快，非常适合阅读长篇的技术笔记。

| 特性         | Hexo                                      | Hugo (推荐)                      |
| ------------ | ----------------------------------------- | -------------------------------- |
| **安装难度** | 繁琐 (需装 Node.js, Git, npm install...)  | **极简 (仅需下载一个 exe 文件)** |
| **稳定性**   | 差 (依赖包容易过时报错，几个月不用容易崩) | **极高 (几乎不会坏)**            |
| **生成速度** | 较慢 (文章多了会卡)                       | **飞快 (闪电般的速度)**          |
| **主要风格** | 华丽、二次元、功能堆砌                    | **简约、学术、注重内容**         |
| **数学公式** | 需折腾插件，容易出错                      | **主题配合好，配置简单**         |

## Hugo介绍

Hugo 非常灵活，它的扩展性其实比 Hexo 更强，因为它允许你完全控制生成的 HTML 代码。只是它的“玩法”和 Hexo 稍微有点不一样。对于“偶尔使用 HTML/CSS”的情况，Hugo 其实更友好，因为它的逻辑很清晰。

### 1. 初级玩法：微调样式 (颜色、字体、间距)

如果觉得 PaperMod 默认的黑色/白色不够看，或者想改一下字号。

- **怎么做：** 不需要改动主题源代码。Hugo 有一个**“覆盖机制”**。
- **具体操作：** 在博客根目录下创建一个文件 assets/css/extended/custom.css (如果没有这个文件夹就自己建)。
- **效果：** 在这个文件里写的任何 CSS，都会自动覆盖掉主题的默认设置。
  - *比如：想把标题改成红色？就在 custom.css 里写个 .post-title { color: red; } 就行了。*

### 2. 中级玩法：加特效 (背景动画、点击爆炸效果、鼠标跟随)

“特效”本质上就是 **JavaScript** 代码。

- **怎么做：** PaperMod 主题预留了接口能够插入这些代码。
- **具体操作：** 在博客根目录下创建 layouts/partials/extend_head.html 或 extend_footer.html。
- **效果：** 把网上的特效代码（比如“看板娘”、“粒子背景”、“鼠标点击爱心”）复制粘贴到这个文件里，它们就会出现在网站上。
  - *比如：想加一个学术风的动态背景，只需要找一个 particles.js 的库，把引用代码贴进去即可。*

### 3. 高级玩法：自定义组件 (Shortcodes)

博客侧重“学习笔记、数学公式、图表”。Hugo 有一个超强功能叫 **Shortcodes (短代码)**。

- **场景：** 假设不仅想贴图片，还想在文章里直接插入一个“B站视频”、“网易云音乐播放器”或者“交互式数学图表”。
- **怎么做：** 可以写一个简单的模板文件。

### 总结与对比

- **Hexo:** 很多特效靠“安装插件”（npm install）。优点是傻瓜式，缺点是插件容易冲突，且容易把网站拖慢。
- **Hugo:** 特效靠“复制粘贴”代码到指定位置。**优点是清楚地知道加了什么，不会莫名其妙报错，且因为没有冗余代码，网站依然飞快。**
- 选择了 Hugo + PaperMod 只是打了一个**最稳固、最干净的地基**。等地基打好了，随时可以用 CSS 给墙面刷漆（改样式），或者用 JS 给屋里添置智能家电（加特效）。而且因为地基好，无论怎么装修，房子都不会塌（报错）。



## 软件安装

### 第一步：安装编辑器 (VS Code)

这是我们以后用来写文章的工具，像 Word 一样，但更适合写代码。

1. **下载：** 点击这里 [VS Code 官网下载](https://code.visualstudio.com/download)。
2. **安装：** 下载后双击安装包。
3. **注意：** 安装过程中，如果有看到“**添加到右键菜单**”或者“**Open with Code**”的选项，**请务必全部勾选**（这以后会很方便）。其他的一路点击“下一步”即可。

### 第二步：安装 Git

这是用来把您的文章传到网上的工具。

1. **下载：** 点击这里 [Git 官网下载](https://git-scm.cn/downloads/win)。
2. **安装：** 也就是一路点击“Next”（下一步），不用修改任何默认设置，直到安装完成。

### 第三步：安装 Hugo (这是最关键的一步)

这个步骤稍微有点不一样，请仔细看：

**1. 下载 Hugo (Extended 版本)**

- 点击这个链接进入下载页：[Hugo Releases (GitHub)](https://github.com/gohugoio/hugo/releases)
- 往下滑，找到 **Assets** 区域。
- **一定要找带 extended 字样的版本**！
  - **Windows 用户**请下载：hugo_extended_0.154.0_windows-amd64.zip (版本号可能更高，没关系)。
  - *注意：不要下载那个不带 extended 的，也不要下 linux/darwin 的。*

**2. 解压与放置**

- 把下载好的压缩包解压。
- 你会看到一个 hugo.exe 文件。
- 在您的 **C盘** 创建一个文件夹，命名为 Hugo。
- 在 Hugo 文件夹里再建一个文件夹，叫 bin。
- **把 hugo.exe 扔进去**。
  - 现在的路径应该是：C:\Hugo\bin\hugo.exe

**3. 配置环境变量 (让电脑认识 Hugo)**
这一步如果不做，电脑会说“找不到 hugo 命令”。

- 按键盘上的 **Win 键** (微软徽标键)，直接输入搜索：环境变量。
- 选择 **“编辑系统环境变量”**。
- 点击右下角的 **“环境变量”** 按钮。
- 在上面的框（用户变量）或者下面的框（系统变量）里，找到一行叫 **Path** 的文字，选中它，点击 **“编辑”**。
- 点击右边的 **“新建”**。
- 输入刚才存放 hugo 的路径：D:\Software\Hugo\bin
- **连续点击“确定”**，直到所有窗口关闭。

### 第四步：验证一下是否成功

做完上面三步后，请测试一下：

1. 按 Win + R 键，输入 cmd，回车打开黑色窗口。
2. 输入命令：hugo version
3. 如果出现一行类似 hugo v0.154.0-0b71db299a2bd89be876d7dc972ded03a222f560+extended windows/amd64 BuildDate=2025-12-31T12:45:55Z VendorInfo=gohugoio的字，说明**大功告成**！



## 创建博客

### 第一步：简单的 Git 身份设置

我“偶尔使用”Git，为了防止一会儿提交时报错，我们先告诉电脑“我是谁”。

在刚才那个黑色窗口（cmd）里，依次输入下面两行命令（把引号里的内容修改）：

```bash
git config --global user.name "RisingInsight"
git config --global user.email "1668676243@qq.com"
```



### 第二步：在 GitHub 创建“专用”仓库

这是博客在互联网上的“家”。

1. 登录 [GitHub](https://www.google.com/url?sa=E&q=https%3A%2F%2Fgithub.com%2F)。
2. 点击页面右上角的 **+** 号，选择 **New repository**。
3. **Repository name (仓库名)：** **【非常关键，请仔细看】**
   - 这个名字**必须**完全符合这个格式：用户名.github.io
   - *比如：我的 GitHub 用户名是 RisingInsight，仓库名就必须填 RisingInsight.github.io。如果填错了，博客就无法直接访问。*
4. **Public/Private：** 选 **Public** (公开)。
5. 其他都不用管，直接点最下面的绿色按钮 **Create repository**。
6. 创建好后，**不要关掉那个网页**，一会儿我们要用里面的链接。



### 第三步：在本地创建博客文件夹

现在回到电脑。为了管理方便，建议不要放在 C 盘深处。

1. 在电脑上找个风水宝地（比如 **D盘** 或者 **桌面**），新建一个文件夹，命名为 MyBlog。
2. 进入这个 Blog 文件夹。
3. 在这里打开终端： 在文件夹空白处右键 -> 选择 **"Open in Terminal"** (在终端打开)。

现在应该看到了黑色窗口，且路径是在 Blog 下面。依次复制粘贴执行以下命令：

**1. 生成博客骨架**

```bash
hugo new site . -f yaml
```

*(注意：site 后面有个空格，然后有个点 .，这表示“就在当前目录创建”。)*

**2. 初始化 Git 并关联 GitHub**

```bash
git init
git branch -M main
```

**3. 关联远程仓库**
还记得刚才 GitHub 网页上创建好的仓库吗？

- 复制那个网页里的 **HTTPS** 链接（通常是以 https://github.com/... 结尾的）。
- 回到黑色窗口，输入下面的命令（**把地址换成自己的**）：

```bash
git remote add origin https://github.com/RisingInsight/RisingInsight.github.io
```



### 第四步：安装 PaperMod 主题

我们要用最干净、学术风的主题 PaperMod。在黑色窗口继续输入：

```bash
git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod
```



### 验证一下

做完以上步骤后，请打开文件夹 Blog，应该能看到：

- 一个 themes 文件夹（里面有 PaperMod）。
- 一个 hugo.yaml 文件。
- 以及 content, layouts 等文件夹。

**如果都看到了，请回复我“就位”，我们就进入最好玩的环节：配置属于您的界面！**



## 上传到GIthub

### 第一步：检查“自动化部署脚本” (GitHub Actions)

这是最关键的一步。如果没有这个文件，您把代码推上去也只是“存了个网盘”，网站不会自动上线。

1. **检查文件是否存在：**
   - 在 VS Code 左侧文件列表，看看有没有一个叫 **.github** 的文件夹（注意前面有个点）。
   - 里面有没有 **workflows** 文件夹。
   - 里面有没有一个 .yaml 文件（比如 hugo.yaml 或 deploy.yaml）。
2. **如果没有（或者不确定对不对），请重新建一个：**
   - 在根目录新建文件夹：**.github**
   - 在里面新建文件夹：**workflows**
   - 在 workflows 里新建文件：**deploy.yaml** (为了和根目录的配置文件区分开，我们叫它 deploy)。
   - **复制粘贴**以下内容（这是适配您当前环境的标准自动化脚本）：

```yaml
# GitHub Actions 自动构建部署脚本
name: Deploy Hugo site to Pages

on:
  # 每次推送到 main 分支时触发
  push:
    branches: ["main"]
  # 允许手动在 GitHub 页面触发
  workflow_dispatch:

# 设置权限
permissions:
  contents: read
  pages: write
  id-token: write

# 并发控制
concurrency:
  group: "pages"
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  # 构建任务
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.121.1 # 指定 Hugo 版本
      HUGO_ENV: production
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
        with:
          submodules: recursive # 必须递归下载主题

      - name: 安装 Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true # 必须使用 extended 版本

      - name: 开始构建
        run: hugo --minify

      - name: 上传构建产物
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  # 部署任务
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: 部署到 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**保存文件。**



### 第二步：推送代码 (Git Push)

现在把所有的文件（配置、图片、文章、特效代码）一次性打包发给 GitHub。

1. **回到 VS Code 下方的终端**。
2. 依次输入以下命令（每输一行按一次回车）：

```bash
# 1. 把所有修改放入暂存区
git add .

# 2. 提交修改 (引号里写备注，比如 "博客最终版上线")
git commit -m "complete blog setup"

# 3. 推送到 GitHub (确保您的分支名是 main)
git push -u origin main

# 4. 拉取远程仓库的最新代码 (Git Pull)
git pull origin main --rebase

# 5. 再次推送本地代码 (Git Push)
git push -u origin main
```

*如果第 3 步报错说 src refspec main does not match any，请试一下 git push -u origin master。如果还不行，截图给我。*

------



### 第三步：去 GitHub 开启“开关” (最后一步)

代码推上去后，我们需要告诉 GitHub：“请用 Actions 来发布我的网站”。

1. 打开浏览器，登录您的 **GitHub 仓库页面**。
2. 点击上方的 **Settings** (设置) 选项卡。
3. 在左侧边栏，找到并点击 **Pages**。
4. 看右边的 **Build and deployment** 区域：
   - **Source** (来源)：请选择 **GitHub Actions**。
   - *(原本可能是 Deploy from a branch，一定要改成 GitHub Actions)*。
5. 修改完设置后，GitHub 可能不会立刻更新，我们需要手动触发一次更新，或者等待它自动反应。
   1. 点击顶部导航栏的 **Actions**。
   2. 您应该能看到左侧有一个 Deploy Hugo site to Pages。
   3. 点击它，查看右侧列表。
      - 如果有一个正在转圈的任务，请等待它变成**绿色对钩**。
      - 如果没有正在运行的任务，或者上一个任务是红色的（失败），我们需要手动触发一次：
        - 点击列表里最新的那次记录。
        - 右上角通常有个 **Re-run jobs** 按钮，点击它重新运行。




### 成功后的验证：

1. **Git 终端：** 看到类似 To https://github.com/RisingInsight/RisingInsight.github.io 和 main -> main 的字样，没有 [rejected] 就说明成功了。
2. **GitHub Actions：**
   - 登录您的 GitHub 仓库页面。
   - 点击上方的 **Actions** 选项卡。
   - 您应该会看到一个新的 GitHub Actions 任务正在运行（或者已经完成）。它会显示您刚刚提交的信息 complete blog setup。
   - 等待这个任务变成**绿色的对钩 (✅)**。
3. **博客上线：**
   - 任务成功后，回到 **Settings -> Pages**。
   - 查看您的博客网址 https://RisingInsight.github.io/ 是否已经更新，所有美化和功能是否都上线了。



## 美化

放弃CSS、直接完全使用HTML

绕开 CSS 加载问题，直接在各个模块写内联样式

## 后续更新

更新本地博客代码到 GitHub 仓库的核心是「Git 提交 + 推送」，以下是**分步详细操作**（适配新手，覆盖所有常见场景）：

### 前提准备

1. 确认本地已安装 Git（打开 PowerShell 执行 `git --version`，有版本号则已安装；无则下载：https://git-scm.com/download/win）；
2. 确认本地博客目录已关联 GitHub 仓库（执行 `git remote -v`，能看到 GitHub 仓库地址则已关联；无则先关联，见「补充场景 1」）；
3. 已登录 GitHub 账号（推荐用「个人访问令牌（PAT）」或 SSH 密钥认证，避免密码登录失效）。

------

### 核心步骤（PowerShell 操作，在博客根目录 E:\Blog 执行）

#### 步骤 1：进入博客根目录

```powershell
cd E:\Blog  # 切换到博客根目录（你的目录路径）
hugo server --ignoreCache --disableFastRender --cleanDestinationDir
```

#### 步骤 2：检查修改的文件（确认要提交的内容）

```powershell
git status
```

会列出所有修改 / 新增的文件（比如 `layouts/partials/footer.html`、`assets/css/extended.css` 等），确认是你要提交的内容。

#### 步骤 3：暂存所有修改（把文件加入提交队列）

```powershell
git add .  # 「.」代表暂存所有修改/新增文件；若只想暂存单个文件，比如 git add layouts/partials/footer.html
```

#### 步骤 4：提交修改（写提交说明，记录改动）

执行（替换提交信息为自己的描述，比如「更新分页样式 + 自定义页脚版权」）：

```powershell
git commit -m "更新博客：分页样式居中+页脚版权改为2026.1.1~至今"
```

✅ 提交信息建议清晰，比如：

- 改样式：`优化分页样式，实现数字居中`
- 改页脚：`自定义页脚版权时间为2026.1.1~动态日期`
- 综合修改：`更新分页样式+页脚版权信息`

#### 步骤 5：推送到 GitHub 仓库

执行（默认分支是 `main`，如果你的仓库分支是 `master`，替换为 `master`）：

```powershell
git push origin main
```

- 首次推送 / 认证失败：参考「补充场景 1/2」解决；
- 推送成功：打开 GitHub 仓库页面，能看到最新的提交记录和修改后的文件。

------

### 补充场景（解决常见问题）

#### 场景 1：本地目录未关联 GitHub 仓库（首次推送）

1. 先在 GitHub 新建一个空仓库（比如命名为 `blog`，不要勾选「Add a README file」）；

2. 回到本地 PowerShell，执行（替换为你的 GitHub 仓库地址）：

   ```powershell
   # 初始化本地仓库（仅首次执行）
   git init
   # 关联远程 GitHub 仓库（替换为你的仓库地址，HTTPS/SSH 均可）
   git remote add origin https://github.com/你的GitHub用户名/你的仓库名.git
   # 首次推送需设置上游分支
   git push -u origin main
   ```

   

#### 场景 2：推送时提示「认证失败」（GitHub 不再支持密码登录）

解决方法：用「个人访问令牌（PAT）」登录：

1. 生成 PAT：GitHub 官网 → 头像 → Settings → Developer settings → Personal access tokens → Generate new token（勾选 `repo` 权限，保存令牌）；

2. 推送时，用户名填 GitHub 账号，密码填生成的 PAT；

   

   ✅ 更便捷的方式：配置 SSH 密钥（参考 GitHub 文档：

   https://docs.github.com/zh/authentication/connecting-to-github-with-ssh

   ）。

#### 场景 3：推送时提示「本地分支落后于远程」

先拉取远程最新代码，再推送：

```powershell
git pull origin main  # 拉取远程main分支
git push origin main  # 再推送
```

------

#### 验证是否成功

打开 GitHub 仓库页面（https://github.com/你的用户名 / 你的仓库名）：

1. 能看到最新的「Commit」记录（和你写的提交信息一致）；
2. 点击对应文件（比如 `layouts/partials/footer.html`），能看到修改后的代码；
3. 若博客是「GitHub Pages」部署，推送后等待几分钟，访问 Pages 地址能看到修改后的效果。

------

#### 简化操作（后续更新可一键执行）

把步骤 2-5 合并为：

```powershell
cd E:\Blog
git add .
git commit -m "你的提交信息"
git push origin main
```

每次修改后，执行这 4 行即可快速更新到 GitHub。
