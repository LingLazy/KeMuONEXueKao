/**
 * 单条口诀卡片组件
 * - 展示口诀标题、内容、分类、解释与分条说明
 * - 支持展开/收起、复制口诀文本
 * - 学习模式下默认展开
 */
import { useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { COPY_FEEDBACK_DURATION } from '@/constants/ui';
import type { Mnemonic } from '@/types';

/** 口诀卡片组件属性 */
interface MnemonicCardProps {
  /** 口诀数据 */
  mnemonic: Mnemonic;
  /** 是否展开 */
  expanded: boolean;
  /** 切换展开/收起的回调 */
  onToggle: () => void;
  /** 分类名称 */
  catName: string;
  /** 是否聚焦（键盘导航高亮） */
  focused?: boolean;
  /** 是否为学习模式（默认展开、隐藏切换箭头交互） */
  studyMode?: boolean;
  /** 分类主题色（来自 categories.json，用于分类徽标着色） */
  catColor?: string;
}

/**
 * 单条口诀卡片
 *
 * @param mnemonic - 口诀数据对象
 * @param expanded - 当前是否展开
 * @param onToggle - 点击头部时的切换回调
 * @param catName - 所属分类名称
 * @param focused - 是否为键盘导航焦点项
 * @param studyMode - 是否处于学习模式
 * @returns 渲染的口诀卡片元素
 */
export default function MnemonicCard({
  mnemonic,
  expanded,
  onToggle,
  catName,
  focused = false,
  studyMode = false,
  catColor
}: MnemonicCardProps) {
  const [copied, setCopied] = useState(false);

  /**
   * 复制口诀文本到剪贴板
   * 拼接标题、内容与解释，复制成功后展示反馈，指定时长后恢复
   */
  const handleCopy = async () => {
    const text = `${mnemonic.title}：${mnemonic.text}\n\n解释：${mnemonic.explain}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  const cardClass = [
    'mnemonic-card',
    expanded ? 'expanded' : '',
    focused ? 'focused' : '',
    studyMode ? 'study-mode' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <button type="button" className="mnemonic-card-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="mnemonic-card-head-left">
          <span
            className="mnemonic-card-cat"
            style={catColor ? ({ '--cat-color': catColor } as React.CSSProperties) : undefined}
          >
            {catName}
          </span>
          <h3 className="mnemonic-card-title">{mnemonic.title}</h3>
        </div>
        <div className="mnemonic-card-head-right">
          <p className="mnemonic-card-text">{mnemonic.text}</p>
          <Icon
            name="arrow-down"
            size={16}
            className={`mnemonic-card-chevron ${expanded ? 'open' : ''}`}
          />
        </div>
      </button>
      {/* 展开内容：CSS grid-template-rows 0fr→1fr 过渡，GPU 友好，避免 height:auto 布局抖动 */}
      <div className={`mnemonic-card-body-wrap ${expanded ? 'open' : ''}`}>
        <div className="mnemonic-card-body">
          {mnemonic.explain && (
            <div className="mnemonic-section">
              <span className="mnemonic-section-label">解释</span>
              <p className="mnemonic-explain">{mnemonic.explain}</p>
            </div>
          )}
          {mnemonic.details.length > 0 && (
            <div className="mnemonic-section">
              <span className="mnemonic-section-label">分条说明</span>
              <ul className="mnemonic-details">
                {mnemonic.details.map((d, i) => (
                  <li key={i}>
                    <span className="mnemonic-detail-num">{i + 1}</span>
                    <span className="mnemonic-detail-text">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* 复制口诀按钮 · 反馈时长由 COPY_FEEDBACK_DURATION 控制 */}
          <div className="mnemonic-card-actions">
            <button
              type="button"
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              aria-label={copied ? '已复制' : '复制口诀'}
            >
              {copied ? (
                <>
                  <Icon name="check" size={12} />
                  已复制
                </>
              ) : (
                <>
                  <Icon name="copy" size={12} />
                  复制口诀
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
