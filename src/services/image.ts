/**
 * 图片资源 URL 处理服务
 * 负责将题库与交通标志中的相对图片路径归一化为可访问的完整 URL
 */

/**
 * 根据图片字段获取完整 URL
 *
 * 输入参数：
 * @param image - 图片相对路径字符串，支持以下格式（容错性归一化）：
 *   - "questions/img_xxx.jpg"             （新数据格式，相对路径）
 *   - "signs/01_prohibitory_sign/ps001_xxx.jpg"
 *   - "123.jpg"                            （纯文件名，兼容旧格式）
 *   - "assets/images/123.jpg"              （历史格式，自动剥离前缀避免双重拼接）
 *   - "https://example.com/a.jpg"          （完整 URL，原样返回）
 *
 * 返回值：
 * @returns 完整的图片资源路径字符串；空输入返回空字符串
 *
 * 核心执行流程：
 * 1. 空值兜底：image 为空时返回空字符串
 * 2. 完整 URL 透传：含 http(s):// 协议头或以 // 开头的协议相对 URL 直接返回，避免破坏外链
 * 3. 内联资源透传：以 data: 开头的 base64 内联资源原样返回
 * 4. 前缀剥离：剥离可能存在的 "assets/images/" 历史前缀，防止与 BASE_URL 拼接时双重前缀
 * 5. 斜杠归一：去除首部多余斜杠，保证路径整洁
 * 6. 拼接 BASE_URL：以 Vite 的 BASE_URL 为根，拼接 images/ 子目录与归一化后的文件名
 */
export function getImageUrl(image: string): string {
  if (!image) return '';
  // 完整 URL（含协议头）直接返回，避免破坏外链
  if (/^https?:\/\//i.test(image) || image.startsWith('//')) return image;
  // 以 data: 开头的内联资源原样返回
  if (image.startsWith('data:')) return image;
  const base = import.meta.env.BASE_URL;
  // 归一化：剥离可能存在的历史前缀，统一为相对路径
  let filename = image;
  const PREFIX = 'assets/images/';
  if (filename.startsWith(PREFIX)) {
    filename = filename.slice(PREFIX.length);
  } else if (filename.startsWith('/' + PREFIX)) {
    filename = filename.slice(('/' + PREFIX).length);
  }
  // 防御性处理：去除首部多余斜杠
  filename = filename.replace(/^\/+/, '');
  return `${base}images/${filename}`;
}
