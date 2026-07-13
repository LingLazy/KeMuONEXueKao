/**
 * 磁吸按钮 Hook
 * - 监听鼠标移动，将相对中心的偏移量写入 --magnet-x / --magnet-y CSS 变量
 * - 鼠标离开时归零，触发弹簧回弹动画
 * - 自动适配触控设备（hover:none 时禁用）与 reduced-motion 偏好
 * - 配合 .btn-magnetic 工具类使用
 */
import { useEffect, type RefObject } from 'react';
import { useCanHover, usePrefersReducedMotion } from './useMediaQuery';

interface MagneticOptions {
  /** 磁吸强度系数（默认 0.35，越大移动越远） */
  strength?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

/**
 * 为元素附加磁吸效果
 * 输入：ref 目标元素引用，options 配置项
 * 返回：无（通过副作用驱动 CSS 变量）
 */
export function useMagnetic<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: MagneticOptions = {}
): void {
  const { strength = 0.35, enabled = true } = options;
  const canHover = useCanHover();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 触控设备 / reduced-motion / 显式禁用 → 跳过
    if (!enabled || !canHover || reducedMotion) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      // 鼠标相对元素中心的归一化坐标（-0.5 ~ 0.5）
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      // 乘以强度系数得到像素位移
      targetX = relX * strength;
      targetY = relY * strength;
      if (!rafId) {
        rafId = requestAnimationFrame(flush);
      }
    };

    const flush = () => {
      rafId = 0;
      el.style.setProperty('--magnet-x', `${targetX.toFixed(2)}px`);
      el.style.setProperty('--magnet-y', `${targetY.toFixed(2)}px`);
    };

    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
      el.style.setProperty('--magnet-x', '0px');
      el.style.setProperty('--magnet-y', '0px');
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [ref, strength, enabled, canHover, reducedMotion]);
}
