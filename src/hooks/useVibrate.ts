/**
 * 震动反馈 Hook
 * - 答对：轻震动
 * - 答错：长震动
 * - 通用模式：自定义震动序列
 * - 自动检测 navigator.vibrate 可用性
 */
import { useCallback } from 'react';

/** 预定义震动模式 */
export const VIBRATE_PATTERNS = {
  /** 答对：短促一次 */
  correct: [20],
  /** 答错：长震一次 */
  wrong: [80],
  /** 收藏：双击 */
  bookmark: [15, 30, 15],
  /** 提交：三连震 */
  submit: [30, 40, 30, 40, 60],
  /** 警告：长震 */
  warn: [120]
} as const;

/**
 * 震动反馈
 * 返回：触发震动的函数（pattern 可为预定义 key 或数字数组）
 */
export function useVibrate() {
  const vibrate = useCallback(
    (
      pattern:
        | keyof typeof VIBRATE_PATTERNS
        | number[]
    ) => {
      if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
      const p = typeof pattern === 'string' ? VIBRATE_PATTERNS[pattern] : pattern;
      try {
        navigator.vibrate(p);
      } catch {
        /* 静默忽略 */
      }
    },
    []
  );
  return vibrate;
}
