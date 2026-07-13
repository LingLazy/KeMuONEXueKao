/**
 * 撒花动画 Hook
 * - 答对：小撒花
 * - 考试通过：大撒花
 * - 调用 canvas-confetti 实现
 */
import { useCallback } from 'react';
import confetti from 'canvas-confetti';

/**
 * 撒花动画
 * 返回：触发撒花的函数
 */
export function useConfetti() {
  /** 答对小撒花：单次爆发 */
  const burst = useCallback(() => {
    const colors = ['#0d9488', '#14b8a6', '#ea580c', '#fb923c', '#fbbf24'];
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors,
      ticks: 150,
      gravity: 0.9,
      scalar: 0.9
    });
  }, []);

  /** 考试通过大撒花：双侧重叠爆发 */
  const celebrate = useCallback(() => {
    const colors = ['#0d9488', '#14b8a6', '#ea580c', '#fb923c', '#fbbf24', '#10b981'];
    const end = Date.now() + 1200;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.65 },
        colors,
        ticks: 200
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.65 },
        colors,
        ticks: 200
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    // 中心爆发
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      ticks: 200,
      gravity: 0.8
    });
  }, []);

  return { burst, celebrate };
}
