/**
 * Toast 提示队列
 * - 多条排队显示
 * - 自动消失（默认 2.5 秒）
 * - 类型区分样式（success/error/info）
 */
import { create } from 'zustand';
import type { ToastItem, ToastType } from '@/types';

interface ToastState {
  /** Toast 队列 */
  items: ToastItem[];
  /** 添加 Toast */
  push: (message: string, type?: ToastType, durationMs?: number) => number;
  /** 移除指定 Toast */
  remove: (id: number) => void;
  /** 清空队列 */
  clear: () => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (message, type = '', durationMs = 2500) => {
    const id = ++toastId;
    const item: ToastItem = { id, message, type };
    set((s) => ({ items: [...s.items, item] }));
    if (durationMs > 0) {
      window.setTimeout(() => get().remove(id), durationMs);
    }
    return id;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] })
}));

/** 便捷函数 */
export const toast = {
  success: (msg: string, ms?: number) => useToastStore.getState().push(msg, 'success', ms),
  error: (msg: string, ms?: number) => useToastStore.getState().push(msg, 'error', ms),
  info: (msg: string, ms?: number) => useToastStore.getState().push(msg, 'info', ms),
  show: (msg: string, ms?: number) => useToastStore.getState().push(msg, '', ms)
};
