/**
 * 涟漪点击反馈 Hook
 * - 监听元素的 pointerdown 事件，在点击位置生成 .ripple-wave 元素
 * - 动画结束后自动移除 DOM 节点，避免泄漏
 * - 自动适配 reduced-motion 偏好（关闭时不再生成涟漪）
 * - 配合 .ripple-host 工具类使用（容器需 overflow:hidden）
 */
import { useEffect, type RefObject } from 'react';
import { usePrefersReducedMotion } from './useMediaQuery';

interface RippleOptions {
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 涟漪最大半径倍数（默认 2.4，与 CSS keyframe 匹配） */
  maxScale?: number;
}

/**
 * 为元素附加涟漪点击反馈
 * 输入：ref 目标元素引用，options 配置项
 * 返回：无（通过副作用动态注入 DOM）
 */
export function useRipple<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: RippleOptions = {}
): void {
  const { enabled = true } = options;
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled || reducedMotion) return;

    // 计算涟漪尺寸：取元素对角线长度，确保覆盖整个元素
    const computeSize = (rect: DOMRect): number => {
      const diag = Math.sqrt(rect.width * rect.width + rect.height * rect.height);
      return Math.max(diag, 32);
    };

    const handlePointerDown = (e: PointerEvent) => {
      // 仅响应主键（左键）与触控
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const rect = el.getBoundingClientRect();
      const size = computeSize(rect);
      // 计算点击位置相对元素左上角
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.left = `${x}px`;
      wave.style.top = `${y}px`;
      el.appendChild(wave);

      // 动画结束后清理
      const cleanup = () => {
        wave.remove();
        el.removeEventListener('pointerup', cleanup);
        el.removeEventListener('pointerleave', cleanup);
      };
      el.addEventListener('pointerup', cleanup);
      el.addEventListener('pointerleave', cleanup);
      // 兜底：600ms 后强制清理
      window.setTimeout(cleanup, 650);
    };

    el.addEventListener('pointerdown', handlePointerDown);
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [ref, enabled, reducedMotion]);
}
