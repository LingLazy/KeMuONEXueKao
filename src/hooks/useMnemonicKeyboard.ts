/**
 * 口诀视图键盘导航 Hook
 * - 支持 J/K（及方向键）上下导航
 * - Enter 展开/收起当前焦点口诀
 * - / 聚焦搜索框
 * - Esc 收起当前选中口诀
 * - 输入框聚焦时自动屏蔽导航快捷键
 */
import { useEffect, useRef } from 'react';

/** 判断目标是否为可输入元素（聚焦时屏蔽快捷键） */
function isInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

/** Hook 配置项 */
export interface UseMnemonicKeyboardOptions {
  /** 可导航的项目总数 */
  itemCount: number;
  /** 当前选中索引 */
  selectedIndex: number;
  /** 导航时更新选中索引（J/K/方向键），父组件同步状态并触发虚拟滚动 */
  onSelect: (index: number) => void;
  /** 确认选中项（Enter 键），父组件展开/收起对应口诀 */
  onConfirm: (index: number) => void;
  /** 聚焦搜索框（/ 键） */
  onFocusSearch: () => void;
  /** 退出/收起当前选中（Esc 键） */
  onEscape: () => void;
  /** 是否启用键盘导航 */
  enabled: boolean;
}

/**
 * 口诀视图键盘导航 Hook
 *
 * 绑定全局 keydown 事件，支持 J/K 上下移动、Enter 选中、/ 聚焦搜索、Esc 收起。
 * 内部使用 ref 保存最新索引与回调，避免快速连按时闭包过期，同时减少 effect 重绑次数。
 *
 * @param options - 配置项，包含项目总数、当前索引、各动作回调与启用状态
 */
export function useMnemonicKeyboard(options: UseMnemonicKeyboardOptions): void {
  const { itemCount, selectedIndex, onSelect, onConfirm, onFocusSearch, onEscape, enabled } = options;

  // 使用 ref 保存最新索引，支持快速连按时立即更新，避免闭包过期
  const indexRef = useRef(selectedIndex);
  indexRef.current = selectedIndex;

  // 使用 ref 保存最新回调，避免回调变化导致 effect 频繁重绑
  const callbacksRef = useRef({ onSelect, onConfirm, onFocusSearch, onEscape });
  callbacksRef.current = { onSelect, onConfirm, onFocusSearch, onEscape };

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    /** 全局键盘事件处理 */
    const onKey = (e: KeyboardEvent) => {
      // 输入框聚焦时屏蔽导航快捷键，仅保留 Esc 退出焦点
      if (isInputTarget(e.target)) {
        if (e.key === 'Escape' && isInputTarget(document.activeElement)) {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }
      const current = indexRef.current;
      switch (e.key) {
        case 'j':
        case 'J':
        case 'ArrowDown': {
          e.preventDefault();
          const next = Math.min(current + 1, itemCount - 1);
          indexRef.current = next;
          callbacksRef.current.onSelect(next);
          break;
        }
        case 'k':
        case 'K':
        case 'ArrowUp': {
          e.preventDefault();
          const next = Math.max(current - 1, 0);
          indexRef.current = next;
          callbacksRef.current.onSelect(next);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          callbacksRef.current.onConfirm(current);
          break;
        }
        case '/': {
          e.preventDefault();
          callbacksRef.current.onFocusSearch();
          break;
        }
        case 'Escape': {
          callbacksRef.current.onEscape();
          break;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, itemCount]);
}
