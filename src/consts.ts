// 站点全局配置
export const SITE_TITLE = "RisingInsight's Blog";
export const SITE_DESCRIPTION = '记录生成模型、深度学习与工程实践 | Build in public';
export const SITE_URL = 'https://risinginsight.github.io';
export const GITHUB_USERNAME = 'RisingInsight';
export const GITHUB_REPO = 'RisingInsight/RisingInsight.github.io';
export const GITHUB_BRANCH = 'main';

// 社交链接
export const SOCIALS = [
  { name: 'GitHub', href: 'https://github.com/RisingInsight' },
  { name: '知乎', href: 'https://www.zhihu.com/people/zhang-zhang-jian-shi-26' },
  { name: 'CSDN', href: 'https://blog.csdn.net/2203_75893174' },
  { name: 'Email', href: 'mailto:1668676243@qq.com' },
];

// 导航菜单
export const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '文章', href: '/blog/' },
  { label: '系列', href: '/series/' },
  { label: '实验', href: '/lab/' },
  { label: '归档', href: '/archives/' },
  { label: '留言', href: '/guestbook/' },
  { label: '关于', href: '/about/' },
];

// 系列简介（键名与文章 frontmatter 的 series 一致）
export const SERIES_INFO: Record<string, string> = {
  生成模型笔记:
    '从 VAE、GAN、Flow 到 DDPM 的生成模型推导，并借助一个可交互实验观察扩散的加噪与去噪过程。',
};

// 个人信息（用于 Hero 区域和关于页）
export const PROFILE = {
  name: 'RisingInsight',
  role: 'Deep Learning',
  tagline: 'Generative Systems · Diffusion · Build in Public',
  avatar: '/avatar.jpg',
  bio: 'Just Broaden My Horizons',
  location: 'China',
  school: "Master's Student",
};
