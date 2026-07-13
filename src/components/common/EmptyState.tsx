/**
 * 空状态占位
 * - 友好的图标 + 文案 + 可选操作按钮
 */
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** 图标 */
  icon?: ReactNode;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 操作按钮 */
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">
        {icon ?? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        )}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
