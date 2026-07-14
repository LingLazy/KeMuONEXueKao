/**
 * 颜色工具模块
 * 提供 hex 色值到 rgba 色值的转换能力，供主题色叠加透明度使用
 */

/**
 * 将十六进制颜色字符串转换为 rgba 格式
 *
 * 输入参数：
 * @param hex - 十六进制色值字符串，支持 3 位（如 "#fff"）或 6 位（如 "#ffffff"）格式，带或不带 # 前缀
 * @param alpha - 透明度，取值范围 0-1，默认 1 表示完全不透明
 *
 * 返回值：
 * @returns rgba 格式字符串，如 "rgba(255, 255, 255, 1)"；输入非法时返回默认回退色 rgba(13, 148, 136, alpha)
 *
 * 核心执行流程：
 * 1. 空值兜底：hex 为空时直接返回回退色（带传入的 alpha）
 * 2. 去除前缀：剥离可能存在的 "#" 前缀
 * 3. 3 位简写扩展：将 "#fff" 形式扩展为 "#ffffff" 形式
 * 4. 格式校验：仅接受 6 位合法十六进制，否则返回回退色
 * 5. 解析 RGB 分量：分别从字符串切片解析出 r/g/b 三通道数值
 * 6. 拼接返回：组合成 rgba(r, g, b, alpha) 字符串
 */
export function hexToRgba(hex: string, alpha = 1): string {
  /** 非法输入时的回退色（主题青绿色） */
  const fallback = `rgba(13, 148, 136, ${alpha})`;
  if (!hex) return fallback;
  let m = String(hex).replace(/^#/, '');
  // 3 位简写扩展为 6 位：每位的字符重复一次
  if (/^[0-9a-fA-F]{3}$/.test(m)) {
    m = m.split('').map((c) => c + c).join('');
  }
  // 格式校验：仅接受 6 位合法十六进制
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return fallback;
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
