/**
 * 主题状态管理
 * - 持久化至 localStorage
 * - 支持 light/dark 双主题
 * - 切换时同步 DOM data-theme 属性与 theme-color meta
 * - 使用 View Transitions API 实现圆形扩散过渡（现代浏览器）
 * - 降级方案：class 切换 + CSS transition（旧浏览器）
 */
import { create } from 'zustand';
import type { ThemeMode } from '@/types';
import { Store, STORAGE_KEYS } from '@/services/storage';

/** 初始主题：localStorage > 系统偏好 > 默认浅色 */
function getInitialTheme(): ThemeMode {
  const saved = Store.get<ThemeMode | null>(STORAGE_KEYS.theme, null);
  if (saved === 'light' || saved === 'dark') return saved;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

interface ThemeState {
  /** 当前主题 */
  theme: ThemeMode;
  /** 应用主题至 DOM 与 localStorage（支持可选的触发坐标用于圆形扩散） */
  apply: (theme: ThemeMode, origin?: { x: number; y: number }) => void;
  /** 切换主题（支持可选的触发坐标） */
  toggle: (origin?: { x: number; y: number }) => void;
}

/**
 * 同步 DOM 与 meta（实际执行主题切换的核心函数）
 * 输入：theme 目标主题
 * 返回：无
 */
function syncDom(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  root.setAttribute('data-theme', theme);
  // 更新 theme-color meta
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    const isLight = m.media?.includes('light');
    const isDark = m.media?.includes('dark');
    if (!m.media || (!isLight && !isDark)) {
      m.content = theme === 'dark' ? '#0b1120' : '#0d9488';
    }
  });
  window.setTimeout(() => root.classList.remove('theme-transitioning'), 360);
}

/**
 * 使用 View Transitions API 执行圆形扩散主题切换
 * - 在触发点为圆心，扩散至覆盖整个视口
 * - 不支持 VT API 时降级为直接 syncDom
 * 输入：theme 目标主题，origin 触发坐标
 * 返回：无
 */
function syncDomWithTransition(theme: ThemeMode, origin?: { x: number; y: number }): void {
  const root = document.documentElement;
  // 检查 View Transitions API 支持 + 用户未禁用动画
  const supportsVT = 'startViewTransition' in document;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!supportsVT || reducedMotion) {
    syncDom(theme);
    return;
  }

  // 注入触发坐标 CSS 变量（供 ::view-transition-new(root) 的 clip-path 圆心使用）
  if (origin) {
    root.style.setProperty('--theme-transition-x', `${origin.x}px`);
    root.style.setProperty('--theme-transition-y', `${origin.y}px`);
  } else {
    // 默认从右上角扩散（主题切换按钮所在位置）
    root.style.setProperty('--theme-transition-x', `${window.innerWidth - 40}px`);
    root.style.setProperty('--theme-transition-y', '40px');
  }

  // startViewTransition 是较新的 API，TS 类型定义可能未包含，使用类型断言兼容
  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  const transition = docWithVT.startViewTransition?.(() => syncDom(theme));
  transition?.finished.finally(() => {
    // 清理坐标变量
    root.style.removeProperty('--theme-transition-x');
    root.style.removeProperty('--theme-transition-y');
  });
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  apply: (theme, origin) => {
    Store.set(STORAGE_KEYS.theme, theme);
    syncDomWithTransition(theme, origin);
    set({ theme });
  },
  toggle: (origin) => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().apply(next, origin);
  }
}));
