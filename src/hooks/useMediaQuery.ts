/**
 * 媒体查询 Hook
 * - 响应式断点检测
 * - 系统主题偏好监听
 */
import { useEffect, useState } from 'react';

/**
 * 监听媒体查询
 * 输入：query 媒体查询字符串
 * 返回：当前是否匹配
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    // 兼容旧版 Safari
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, [query]);

  return matches;
}

/** 是否为移动端（宽度 ≤ 768px） */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

/** 是否为平板（宽度 ≤ 1024px） */
export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 1024px)');
}

/** 是否为窄屏（宽度 ≤ 480px） */
export function useIsNarrow(): boolean {
  return useMediaQuery('(max-width: 480px)');
}

/** 是否支持 hover */
export function useCanHover(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

/** 是否为 reduced-motion 偏好 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
