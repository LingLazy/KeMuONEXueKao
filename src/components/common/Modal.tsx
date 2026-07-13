/**
 * 通用模态对话框
 * - Portal 渲染至 body
 * - 遮罩层点击关闭
 * - ESC 键关闭
 * - 焦点陷阱（简易实现）
 * - aria-labelledby 关联标题，无障碍朗读
 * - 入场/退场动画
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: ReactNode;
  /** 子内容 */
  children: ReactNode;
  /** 尺寸：sm/md/lg */
  size?: 'sm' | 'md' | 'lg';
  /** 是否禁用遮罩点击关闭 */
  disableBackdropClose?: boolean;
  /** 是否禁用 ESC 关闭 */
  disableEscape?: boolean;
  /** 自定义类名 */
  className?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  disableBackdropClose = false,
  disableEscape = false,
  className = ''
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  // 生成唯一 ID 关联 dialog 与 title，供屏幕阅读器朗读
  const titleId = useId();

  // ESC 关闭 + 焦点管理
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscape) {
        e.preventDefault();
        onClose();
      }
      // 简易焦点陷阱：Tab 循环
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // 锁定 body 滚动
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // 自动聚焦对话框：优先聚焦第一个可聚焦子元素（如带 autoFocus 的按钮），无则聚焦对话框本身
    // 保存 timer id 以便清理，避免组件卸载后触发焦点
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const firstFocusable = dialog.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable ?? dialog).focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      lastFocused.current?.focus();
    };
  }, [open, onClose, disableEscape]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (!disableBackdropClose && e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            className={`modal modal-${size} ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <div className="modal-header">
                <h2 id={titleId} className="modal-title">{title}</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={onClose}
                  aria-label="关闭对话框"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
