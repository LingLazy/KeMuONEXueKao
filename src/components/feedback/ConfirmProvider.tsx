/**
 * 全局确认对话框 Provider
 * - 提供 useConfirm() Hook
 * - 调用 confirm({...}) 返回 Promise<boolean>
 * - 支持自定义标题、内容、按钮文案
 * - ESC 关闭视为取消
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '@/components/common/Modal';

interface ConfirmOptions {
  title?: string;
  content: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingItem {
  id: number;
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

let confirmId = 0;

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingItem[]>([]);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      const id = ++confirmId;
      setPending((cur) => [...cur, { id, opts, resolve }]);
    });
  }, []);

  const close = (id: number, value: boolean) => {
    setPending((cur) => {
      const item = cur.find((i) => i.id === id);
      item?.resolve(value);
      return cur.filter((i) => i.id !== id);
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {pending.map((item) => (
              <Modal
                key={item.id}
                open
                onClose={() => close(item.id, false)}
                title={item.opts.title ?? '请确认'}
                size="sm"
              >
                <motion.div
                  className="confirm-body"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="confirm-content">{item.opts.content}</div>
                  <div className="confirm-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => close(item.id, false)}
                    >
                      {item.opts.cancelText ?? '取消'}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.opts.danger ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => close(item.id, true)}
                    >
                      {item.opts.confirmText ?? '确定'}
                    </button>
                  </div>
                </motion.div>
              </Modal>
            ))}
          </AnimatePresence>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

/** 使用确认对话框 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm 必须在 ConfirmProvider 内使用');
  return ctx;
}
