/**
 * 移动端滑动手势 Hook
 * - 检测左右滑动切换题目
 * - 支持设定阈值，避免误触
 */
import { useEffect, useRef, useCallback } from 'react';

interface SwipeHandlers {
  /** 左滑（下一题） */
  onSwipeLeft?: () => void;
  /** 右滑（上一题） */
  onSwipeRight?: () => void;
  /** 上滑 */
  onSwipeUp?: () => void;
  /** 下滑 */
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  /** 触发阈值（像素），默认 50 */
  threshold?: number;
  /** 最大纵向偏移占比（避免上下滚动误触），默认 1（不限制） */
  maxVerticalRatio?: number;
  /** 是否启用，默认 true */
  enabled?: boolean;
}

/**
 * 使用滑动手势
 * 输入：handlers 各方向回调，options 配置
 * 返回：绑定至目标元素的 ref
 */
export function useSwipe<T extends HTMLElement = HTMLDivElement>(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const { threshold = 50, maxVerticalRatio = 1, enabled = true } = options;
  const ref = useRef<T>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const onStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const handleStart = useCallback(
    (x: number, y: number) => {
      if (!enabled) return;
      onStart.current = { x, y, t: Date.now() };
    },
    [enabled]
  );

  const handleEnd = useCallback(
    (x: number, y: number) => {
      if (!enabled || !onStart.current) return;
      const { x: sx, y: sy, t: st } = onStart.current;
      const dx = x - sx;
      const dy = y - sy;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      onStart.current = null;
      // 时间过长不视为滑动
      if (Date.now() - st > 800) return;
      // 主方向判定
      if (adx > ady && adx >= threshold) {
        // 横向滑动
        if (maxVerticalRatio < 1 && ady / adx > maxVerticalRatio) return;
        if (dx > 0) handlersRef.current.onSwipeRight?.();
        else handlersRef.current.onSwipeLeft?.();
      } else if (ady > adx && ady >= threshold) {
        if (dy > 0) handlersRef.current.onSwipeDown?.();
        else handlersRef.current.onSwipeUp?.();
      }
    },
    [enabled, threshold, maxVerticalRatio]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) handleStart(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (t) handleEnd(t.clientX, t.clientY);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleStart, handleEnd]);

  return ref;
}
