// 标签颜色映射
const tagColors = ['tag-blue', 'tag-purple', 'tag-pink', 'tag-green', 'tag-orange', 'tag-indigo', 'tag-cyan'];

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return tagColors[Math.abs(hash) % tagColors.length];
}

// 渐变封面色卡
const gradients = [
  'from-blue-500 to-purple-600',
  'from-emerald-400 to-cyan-500',
  'from-orange-400 to-pink-500',
  'from-violet-500 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-pink-400 to-rose-500',
];

export function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

// 计算阅读时间（中文按字符数估算）
export function getReadTime(content: string): string {
  const minutes = Math.ceil(content.length / 500);
  return `${minutes} min`;
}

// 一致性哈希工具
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

// 为标签分配随机的 Emoji 图标（趣味性）
const tagEmojis = ['🚀', '💡', '🔧', '📊', '🎯', '🔬', '🎨', '📱', '🌐', '⚙️', '📦', '🧪', '📝', '🔑', '🛠️', '🤖', '💻', '🧠', '📡', '🔮'];

export function getTagEmoji(tag: string): string {
  return tagEmojis[hashString(tag) % tagEmojis.length];
}
