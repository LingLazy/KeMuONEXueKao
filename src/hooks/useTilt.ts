/**
 * 3D 倾斜卡片 Hook
 * - 监听鼠标移动，将归一化坐标写入 --tilt-x / --tilt-y CSS 变量（范围 -1 ~ 1）
 * - 鼠标进入时添加 .is-tilting 类（增强阴影偏移）
 * - 鼠标离开时归零并移除 .is-tilting 类
 * - 自动适配触控设备与 reduced-motion 偏好
 * - 配合 .tilt-card 工具类使用
 */
import { useEffect, type RefObject } from 'react';
import { useCanHover, usePrefersReducedMotion } from './useMediaQuery';

interface TiltOptions {
  /** 最大倾斜角度（默认 6deg，由 CSS 乘以该系数） */
  max?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

/**
 * 为元素附加 3D 倾斜效果
 * 输入：ref 目标元素引用，options 配置项
 * 返回：无（通过副作用驱动 CSS 变量）
 */
export function useTilt<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: TiltOptions = {}
): void {
  const { max = 1, enabled = true } = options;
  const canHover = useCanHover();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled || !canHover || reducedMotion) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;

    const flush = () => {
      rafId = 0;
      el.style.setProperty('--tilt-x', targetX.toFixed(3));
      el.style.setProperty('--tilt-y', targetY.toFixed(3));
    };

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      // 归一化到 -1 ~ 1（中心为 0）
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = Math.max(-0.5, Math.min(0.5, nx)) * 2 * max;
      targetY = Math.max(-0.5, Math.min(0.5, ny)) * 2 * max;
      if (!rafId) {
        rafId = requestAnimationFrame(flush);
      }
    };

    const handleEnter = () => {
      el.classList.add('is-tilting');
    };

    const handleLeave = () => {
      el.classList.remove('is-tilting');
      targetX = 0;
      targetY = 0;
      el.style.setProperty('--tilt-x', '0');
      el.style.setProperty('--tilt-y', '0');
    };

    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [ref, max, enabled, canHover, reducedMotion]);
}
