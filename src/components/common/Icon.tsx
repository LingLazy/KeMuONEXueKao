/**
 * 统一图标组件
 * - 集中管理项目内所有内联 SVG 图标，替换 70+ 处重复的 <svg> 标签
 * - 统一 viewBox、stroke、fill 等属性，保证视觉一致性
 * - 支持自定义尺寸、颜色、类名与无障碍标签
 * - GitHub 等填充类图标通过 path 级别 fill/stroke 覆盖实现
 *
 * 设计说明：
 * - 默认采用 stroke 描边模式（fill="none" stroke="currentColor"），与项目现有 SVG 风格一致
 * - color 属性通过 inline style 设置 CSS color，同时影响 stroke="currentColor" 与 fill="currentColor"
 * - ariaLabel 提供时设置 aria-label 与 role="img"；未提供时设置 aria-hidden="true"
 * - GitHub 图标为填充类图标，在 path 元素上显式声明 fill="currentColor" stroke="none" 覆盖 svg 默认值
 */
import type { ReactNode } from 'react';

/**
 * 支持的图标名称联合类型
 * - 每个名称对应 ICON_PATHS 字典中的一个图标定义
 * - 命名规则：高频图标使用单词（close/check/star），组合图标使用 kebab-case（check-circle/x-circle）
 */
export type IconName =
  | 'close'
  | 'bookmark'
  | 'check'
  | 'arrow-right'
  | 'arrow-down'
  | 'menu'
  | 'search'
  | 'github'
  | 'star'
  | 'traffic'
  | 'car'
  | 'safety'
  | 'other'
  | 'arrow-left'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'check-circle'
  | 'x-circle'
  | 'info-circle'
  | 'check-square'
  | 'book'
  | 'trending'
  | 'grid'
  | 'play'
  | 'shuffle'
  | 'lightbulb'
  | 'sheet'
  | 'refresh'
  | 'search-plus'
  | 'book-open'
  | 'copy'
  | 'external-link'
  | 'file-text'
  | 'sun'
  | 'moon'
  | 'image'
  | 'image-broken';

/**
 * 图标路径字典
 * - 键为 IconName，值为 SVG 子元素（path/circle/rect/polygon 等）
 * - 默认使用 stroke 描边模式，由 Icon 组件的 svg 元素统一设置 fill="none" stroke="currentColor"
 * - 需要填充效果的图标（如 github）在 path 级别声明 fill="currentColor" stroke="none" 覆盖默认值
 */
export const ICON_PATHS: Record<IconName, ReactNode> = {
  /** 关闭 X */
  close: <path d="M18 6 6 18M6 6l12 12" />,
  /** 收藏书签 */
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  /** 对勾 */
  check: <path d="M20 6 9 17l-5-5" />,
  /** 右箭头（含横线） */
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" />,
  /** 下箭头（V 形） */
  'arrow-down': <path d="m6 9 6 6 6-6" />,
  /** 菜单（三横线） */
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  /** 搜索（放大镜） */
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  /** GitHub 标志（填充类图标，path 级别覆盖 fill/stroke） */
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"
    />
  ),
  /** 星形 */
  star: <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />,
  /** 交通信号灯 */
  traffic: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
    </>
  ),
  /** 汽车 */
  car: (
    <>
      <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
      <circle cx="7.5" cy="17.5" r="2" />
      <circle cx="16.5" cy="17.5" r="2" />
    </>
  ),
  /** 安全盾牌（含对勾） */
  safety: (
    <>
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  /** 其他（三横线变体，间距与 menu 不同） */
  other: <path d="M3 7h18M3 12h18M3 17h18" />,
  /** 左箭头（含横线） */
  'arrow-left': <path d="M19 12H5M12 19l-7-7 7-7" />,
  /** 左 V 箭头（chevron） */
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  /** 右 V 箭头（chevron） */
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  /** 时钟 */
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  /** 对勾圆圈 */
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  /** 关闭圆圈 */
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  /** 信息圆圈 */
  'info-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  /** 对勾方框（含文件边框） */
  'check-square': (
    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  ),
  /** 书本 */
  book: (
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  ),
  /** 上升趋势 */
  trending: <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  /** 网格（四宫格） */
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  /** 播放（三角形） */
  play: <polygon points="5 3 19 12 5 21 5 3" />,
  /** 随机乱序 */
  shuffle: <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  /** 灯泡提示 */
  lightbulb: <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />,
  /** 答题卡（网格含分隔线） */
  sheet: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  /** 刷新 */
  refresh: <path d="M3 12a9 9 0 1 0 9-9M3 3v6h6" />,
  /** 搜索放大（放大镜含加号） */
  'search-plus': (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
    </>
  ),
  /** 打开的书（双页） */
  'book-open': (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  /** 复制（前后叠层） */
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  /** 外部链接 */
  'external-link': (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </>
  ),
  /** 文件文本（含内容线） */
  'file-text': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </>
  ),
  /** 太阳 */
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  /** 月亮 */
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  /** 图片（含山与太阳） */
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </>
  ),
  /** 图片损坏（含 X） */
  'image-broken': (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  )
};

/**
 * Icon 组件属性
 */
interface IconProps {
  /** 图标名称，对应 ICON_PATHS 字典的键 */
  name: IconName;
  /** 图标尺寸（像素），默认 24 */
  size?: number;
  /** 图标颜色，支持任意合法 CSS 颜色值，未指定时使用 currentColor 继承父级文本色 */
  color?: string;
  /** 自定义类名，附加到 svg 元素 */
  className?: string;
  /** 无障碍标签，提供时设置 aria-label 与 role="img"；未提供时设置 aria-hidden="true" */
  ariaLabel?: string;
}

/**
 * 统一图标组件
 *
 * 根据 name 从 ICON_PATHS 字典中获取 SVG 子元素，统一设置 viewBox、stroke、fill 等属性后渲染。
 * 默认采用 stroke 描边模式，color 属性通过 inline style 控制 currentColor 实现着色。
 *
 * @param name - 图标名称，必须为 IconName 联合类型中定义的值
 * @param size - 图标尺寸（像素），默认 24，同时设置 svg 的 width 与 height
 * @param color - 图标颜色，未指定时使用 currentColor 继承父级文本色；指定时通过 style.color 覆盖
 * @param className - 自定义类名，附加到 svg 元素的 class 列表
 * @param ariaLabel - 无障碍标签，提供时设置 aria-label 与 role="img"；未提供时设置 aria-hidden="true" 对屏幕阅读器隐藏
 * @returns 渲染的 SVG 图标元素
 */
export function Icon({ name, size = 24, color, className, ariaLabel }: IconProps) {
  // 从字典获取图标子元素；noUncheckedIndexedAccess 下可能为 undefined，使用 null 兜底
  const path = ICON_PATHS[name] ?? null;
  // color 指定时通过 inline style 设置 CSS color，同时影响 stroke="currentColor" 与 fill="currentColor"
  const style = color ? { color } : undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {path}
    </svg>
  );
}
