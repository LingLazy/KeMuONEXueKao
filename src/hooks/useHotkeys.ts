/**
 * 键盘快捷键 Hook
 * - 练习视图：← / → 切换题目，1-4 选择选项，A 显示解析，F 收藏
 * - 考试视图：← / → 切换，1-4 选择，M 标记，H 五五提示
 */
import { useEffect } from 'react';

export interface HotkeyHandlers {
  /** 上一题（←） */
  prev?: () => void;
  /** 下一题（→） */
  next?: () => void;
  /** 选择选项（1-4 或 1-2 判断题） */
  select?: (optionIdx: number) => void;
  /** 显示/隐藏解析（A） */
  toggleAnalysis?: () => void;
  /** 切换收藏（F） */
  toggleBookmark?: () => void;
  /** 标记题目（M，考试用） */
  toggleMark?: () => void;
  /** 五五提示（H，考试用） */
  hint?: () => void;
  /** 交卷（Ctrl+Enter，考试用） */
  submit?: () => void;
}

interface HotkeyOptions {
  /** 是否启用，默认 true */
  enabled?: boolean;
  /** 最大选项数（控制数字键 1-N），默认 4 */
  maxOptions?: number;
}

/** 判断目标是否为可输入元素 */
function isInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

/**
 * 绑定键盘快捷键
 * 输入：handlers 回调集合，options 配置
 */
export function useHotkeys(handlers: HotkeyHandlers, options: HotkeyOptions = {}) {
  const { enabled = true, maxOptions = 4 } = options;
  const handlersRef = { current: handlers };
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      // 输入框聚焦时不响应（除 Esc）
      if (isInputTarget(e.target)) return;
      const h = handlersRef.current;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          h.prev?.();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          h.next?.();
          break;
        case 'a':
        case 'A':
          h.toggleAnalysis?.();
          break;
        case 'f':
        case 'F':
          h.toggleBookmark?.();
          break;
        case 'm':
        case 'M':
          h.toggleMark?.();
          break;
        case 'h':
        case 'H':
          h.hint?.();
          break;
        default:
          // 数字键 1-9
          if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key, 10) - 1;
            if (idx < maxOptions) {
              e.preventDefault();
              h.select?.(idx);
            }
          }
          // Ctrl+Enter 交卷
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            h.submit?.();
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, maxOptions]);
}
