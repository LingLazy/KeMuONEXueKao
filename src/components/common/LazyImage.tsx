/**
 * 图片懒加载组件
 * - 使用 IntersectionObserver 视口检测
 * - 加载中显示骨架屏
 * - 加载失败显示占位图
 * - 支持 loading="lazy" 原生懒加载兜底
 *
 * 关键设计：IntersectionObserver 观察外层容器 div 而非 img 元素，
 * 避免 nativeLazy=false 时 "img 未渲染 → ref 为 null → IO 不创建" 的死锁
 */
import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  /** 图片地址 */
  src: string;
  /** 替代文本 */
  alt: string;
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 自定义类名 */
  className?: string;
  /** 加载失败时的占位内容 */
  fallback?: React.ReactNode;
  /** 是否使用原生 lazy */
  nativeLazy?: boolean;
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallback,
  nativeLazy = true
}: LazyImageProps) {
  // 容器 ref：始终渲染，保证 IntersectionObserver 能观察到目标
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  // nativeLazy=true 时初始 inView=true，直接渲染让浏览器原生 lazy 处理；
  // nativeLazy=false 时初始 inView=false，等 IntersectionObserver 触发后置为 true
  const [inView, setInView] = useState(nativeLazy);

  // 视口检测（仅 nativeLazy=false 时启用）
  // 关键：观察容器 div（始终存在），而非 img（条件渲染可能不存在）
  useEffect(() => {
    if (nativeLazy) return;
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nativeLazy]);

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }
    setStatus('loading');
  }, [src]);

  const handleLoad = () => setStatus('loaded');
  const handleError = () => setStatus('error');

  const skeletonClass = status === 'loading' ? ' lazy-img-skeleton' : '';
  const statusClass = ` lazy-img-${status}`;

  // 无障碍：根据状态动态生成 aria-label
  const ariaLabel = status === 'error' ? `图片加载失败：${alt}` : alt;
  const ariaBusy = status === 'loading';

  return (
    <div
      ref={containerRef}
      className={`lazy-img${skeletonClass}${statusClass} ${className}`}
      style={{ width, height }}
      role="img"
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
    >
      {inView && src && status !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading={nativeLazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className="lazy-img-tag"
        />
      )}
      {status === 'loading' && (
        <div className="lazy-img-placeholder" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.5-3.5L9 20" />
          </svg>
        </div>
      )}
      {status === 'error' && (
        <div className="lazy-img-placeholder lazy-img-error" aria-hidden="true">
          {fallback ?? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
