/**
 * 全局加载占位
 * - 视图懒加载时的统一骨架
 * - 工业蚀刻风格的脉冲加载器（三层同心环 + 进度刻度）
 * - 搭配骨架屏文本提示
 */
export default function GlobalLoading() {
  return (
    <div className="global-loading" role="status" aria-live="polite">
      <div className="global-loading-pulse" aria-hidden="true">
        {/* 外环：刻度旋转 */}
        <svg className="pulse-ring-outer" width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" opacity="0.4" />
        </svg>
        {/* 中环：实线逆旋 */}
        <svg className="pulse-ring-mid" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="24 76" strokeLinecap="round" />
        </svg>
        {/* 内核：脉冲点 */}
        <span className="pulse-core" />
      </div>
      <p className="global-loading-text">加载中</p>
      <span className="global-loading-dots" aria-hidden="true">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </span>
    </div>
  );
}
