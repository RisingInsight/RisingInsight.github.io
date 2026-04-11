// 站点全局配置
export const SITE_TITLE = "RisingInsight's Blog";
export const SITE_DESCRIPTION = '分析一些个人的学习笔记 | 记录一些新鲜的技术';
export const SITE_AUTHOR = 'RisingInsight';
export const SITE_LANG = 'zh-cn';
export const SITE_URL = 'https://risinginsight.github.io';

// 社交链接
export const SOCIALS = [
  { name: 'GitHub', href: 'https://github.com/RisingInsight', icon: 'github', color: '#1e293b' },
  { name: '知乎', href: 'https://www.zhihu.com/people/zhang-zhang-jian-shi-26', icon: 'zhihu', color: '#0066ff' },
  { name: 'CSDN', href: 'https://blog.csdn.net/2203_75893174', icon: 'csdn', color: '#cf222e' },
  { name: 'Email', href: 'mailto:1668676243@qq.com', icon: 'mail', color: '#6366f1' },
];

// 导航菜单
export const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '文章', href: '/blog/' },
  { label: '归档', href: '/archives/' },
  { label: '时光机', href: '/moments/' },
  { label: '关于', href: '/about/' },
];

// 个人信息（用于 Hero 区域和关于页）
export const PROFILE = {
  name: 'RisingInsight',
  role: 'Deep Learning',
  tagline: 'Diffusion Model · Image-to-Image Translations',
  avatar: '/avatar.jpg',
  bio: 'Just Broaden My Horizons',
  location: 'China',
  school: "Master's Student",
};

// 统计数据
export const STATS = [
  { label: '文章', value: '4', icon: 'doc' },
  { label: '分类', value: '3', icon: 'folder' },
  { label: '标签', value: '12', icon: 'tag' },
  { label: '字数', value: '2.5w', icon: 'text' },
];
