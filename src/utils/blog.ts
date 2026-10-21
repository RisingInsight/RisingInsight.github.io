// 计算阅读时间（中文按字符数估算）
export function getReadTime(content: string): string {
  const minutes = Math.max(1, Math.ceil(content.length / 500));
  return `${minutes} min`;
}

// 统一日期格式：2026.01.02
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}
