/**
 * rAF 节流 Hook
 * - 确保回调函数在一帧内最多执行一次
 * - 适用于 scroll / resize 等高频事件，避免布局抖动与性能问题
 */
import { useCallback, useEffect, useRef } from 'react';

/**
 * rAF 节流 Hook
 * 确保回调函数在一帧内最多执行一次，避免高频事件（scroll / resize）导致性能问题
 *
 * @param fn 需要节流的回调函数
 * @returns 节流后的回调函数（引用稳定，可安全用于 effect 依赖）
 *
 * 核心执行流程：
 * 1. 调用时节流函数：若已有未执行的 rAF，则跳过本次调用
 * 2. 否则通过 requestAnimationFrame 安排一次执行，并在回调中重置 rAF 标记
 * 3. 使用 fnRef 保存最新的 fn，保证节流函数始终调用最新闭包
 * 4. 组件卸载时 cancelAnimationFrame 取消未执行的 rAF
 */
export function useRafThrottle<T extends (...args: never[]) => void>(fn: T): T {
  /** 未执行的 rAF ID，null 表示当前无待执行任务 */
  const rafIdRef = useRef<number | null>(null);
  /** 最新 fn 引用：每次渲染更新，保证节流函数调用最新闭包 */
  const fnRef = useRef(fn);
  fnRef.current = fn;

  /** 组件卸载时取消未执行的 rAF，避免回调在卸载后执行 */
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  /** 节流后的回调：引用稳定（useCallback 空依赖） */
  const throttled = useCallback((...args: Parameters<T>) => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      fnRef.current(...args);
    });
  }, []) as T;

  return throttled;
}
