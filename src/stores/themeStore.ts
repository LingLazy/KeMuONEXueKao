/**
 * 主题状态管理
 * - 持久化至 localStorage
 * - 支持 light/dark 双主题
 * - 切换时同步 DOM data-theme 属性与 theme-color meta
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
  /** 应用主题至 DOM 与 localStorage */
  apply: (theme: ThemeMode) => void;
  /** 切换主题 */
  toggle: () => void;
}

/** 同步 DOM 与 meta */
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

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  apply: (theme) => {
    Store.set(STORAGE_KEYS.theme, theme);
    syncDom(theme);
    set({ theme });
  },
  toggle: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().apply(next);
  }
}));
