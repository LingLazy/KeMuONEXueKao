/**
 * 搜索输入框通用组件
 * - 包含搜索图标（Icon 组件）+ input + 可选清除按钮
 * - 通过 containerClassName 适配各视图自定义容器样式（保持原 CSS 类名不变）
 * - 通过 clearClassName 控制是否渲染清除按钮（未传则不渲染，适配 PracticeView 无清除按钮场景）
 * - 通过 inputRef 转发 input 元素 ref，适配需要键盘快捷键聚焦的视图（如 MnemonicsView 按 / 聚焦）
 * - 支持 WAI-ARIA 无障碍标签
 */
import type { Ref } from 'react';
import { Icon } from './Icon';

interface SearchInputProps {
  /** 当前搜索值（受控） */
  readonly value: string;
  /** 值变化回调，接收最新的输入文本 */
  readonly onChange: (value: string) => void;
  /** 占位符文本，默认 "搜索…" */
  readonly placeholder?: string;
  /** input 元素的无障碍标签，默认 "搜索" */
  readonly ariaLabel?: string;
  /** 容器 div 类名（必传，各视图自定义样式：practice-search / knowledge-search-bar / mnemonics-search-bar） */
  readonly containerClassName: string;
  /** 清除按钮类名，传入则渲染清除按钮（knowledge-search-clear / mnemonics-search-clear）；未传则不渲染 */
  readonly clearClassName?: string;
  /** input 元素 ref 转发，用于外部键盘快捷键聚焦等场景 */
  readonly inputRef?: Ref<HTMLInputElement>;
}

/**
 * 搜索输入框组件
 *
 * 视觉结构：[搜索图标] [input 输入框] [清除按钮(可选)]
 * - 搜索图标与清除按钮均使用项目统一的 Icon 组件，保证 SVG 描边一致
 * - 容器与清除按钮的 CSS 类名由调用方传入，确保与各视图原有 CSS 选择器匹配
 *
 * @param value - 受控值
 * @param onChange - 值变化回调，接收 string
 * @param placeholder - 占位符，默认 "搜索…"
 * @param ariaLabel - 无障碍标签，默认 "搜索"
 * @param containerClassName - 容器 div 类名，各视图自定义
 * @param clearClassName - 清除按钮类名，传入则渲染清除按钮
 * @param inputRef - input 元素 ref，用于外部聚焦控制
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = '搜索…',
  ariaLabel = '搜索',
  containerClassName,
  clearClassName,
  inputRef
}: SearchInputProps) {
  // 仅当传入 clearClassName 且当前有值时渲染清除按钮，保持与原视图行为一致
  const showClear = Boolean(value && clearClassName);
  return (
    <div className={containerClassName}>
      <Icon name="search" size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      {showClear && clearClassName && (
        <button
          type="button"
          className={clearClassName}
          onClick={() => onChange('')}
          aria-label="清空搜索"
        >
          <Icon name="close" size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
