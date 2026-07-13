/**
 * 图片懒加载组件
 * - 使用 IntersectionObserver 视口检测
 * - 加载中显示骨架屏
 * - 加载失败显示占位图
 * - 支持 loading="lazy" 原生懒加载兜底
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
  const ref = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [inView, setInView] = useState(!nativeLazy);

  // 视口检测
  useEffect(() => {
    if (!nativeLazy && ref.current) {
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
      io.observe(ref.current);
      return () => io.disconnect();
    }
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

  return (
    <div
      className={`lazy-img${skeletonClass}${statusClass} ${className}`}
      style={{ width, height }}
    >
      {inView && src && status !== 'error' && (
        <img
          ref={ref}
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
