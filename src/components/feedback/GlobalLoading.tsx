/**
 * 全局加载占位
 * - 视图懒加载时的统一骨架
 */
export default function GlobalLoading() {
  return (
    <div className="global-loading" role="status" aria-live="polite">
      <div className="global-loading-spinner" aria-hidden="true" />
      <p className="global-loading-text">加载中…</p>
    </div>
  );
}
