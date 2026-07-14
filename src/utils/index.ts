/**
 * 纯函数工具集
 * - HTML 转义（防 XSS）
 * - 数组乱序（Fisher-Yates）
 * - 数字范围生成
 * - 防抖与节流
 */

/** 安全转义 HTML，防止 XSS 注入 */
export function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fisher-Yates 洗牌算法，返回新数组（不修改原数组） */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 生成 [start, end] 的整数序列 */
export function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

/** 防抖：延迟执行，期间再次调用则重置计时器 */
export function debounce<T extends (...args: never[]) => void>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

/** 节流：固定时间间隔内最多执行一次 */
export function throttle<T extends (...args: never[]) => void>(fn: T, interval = 200): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn(...args);
    }
  }) as T;
}

/** 格式化秒数为 mm:ss */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 格式化用时（秒）为可读文本 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

/** 限制数值范围 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 计算正确率
 * @param correct 答对题数
 * @param total 总答题数
 * @returns 正确率百分比（0-100），total 为 0 时返回 0
 */
export function calcAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 计算学习进度
 * @param answered 已答题数
 * @param total 总题数
 * @returns 进度百分比（0-100），total 为 0 时返回 0
 */
export function calcProgress(answered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((answered / total) * 100);
}
