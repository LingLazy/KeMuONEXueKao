/**
 * 题目卡片组件
 * - 题干 + 图片 + 选项 + 解析 + 口诀
 * - 关键词高亮（mark.kw / .danger / .num）
 * - 选项点击反馈：正确/错误状态
 * - 答对撒花 + 震动反馈
 * - 解析折叠展开
 * - 收藏切换
 * - 移动端左右滑动切题
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question, Mnemonic } from '@/types';
import { highlightKeywords } from '@/services/highlight';
import { getImageUrl } from '@/services/dataLoader';
import { useProgressStore } from '@/stores/progressStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useVibrate, useConfetti, useSwipe, useRipple } from '@/hooks';
import LazyImage from '@/components/common/LazyImage';
import Modal from '@/components/common/Modal';

interface QuestionCardProps {
  /** 题目数据 */
  question: Question;
  /** 关联口诀（按分类匹配） */
  mnemonic?: Mnemonic | null;
  /** 当前题目序号（1-based） */
  index?: number;
  /** 总题数 */
  total?: number;
  /** 是否为考试模式（不立即显示对错） */
  examMode?: boolean;
  /** 已选答案索引（外部受控） */
  selected?: number;
  /** 已剔除选项（考试五五提示） */
  eliminated?: number[];
  /** 选项点击回调 */
  onSelect?: (optionIdx: number) => void;
  /** 下一题回调 */
  onNext?: () => void;
  /** 上一题回调 */
  onPrev?: () => void;
  /** 是否启用滑动切题 */
  swipeEnabled?: boolean;
}

export default function QuestionCard({
  question,
  mnemonic,
  index,
  total,
  examMode = false,
  selected,
  eliminated = [],
  onSelect,
  onNext,
  onPrev,
  swipeEnabled = false
}: QuestionCardProps) {
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const toggleBookmark = useProgressStore((s) => s.toggleBookmark);
  // 直接从状态读取布尔值，避免调用方法导致选择器返回值不稳定
  const isBookmarked = useProgressStore((s) => Boolean(s.bookmarks[question.id]));
  const analysisVisible = usePracticeStore((s) => s.analysisVisible);
  const toggleAnalysis = usePracticeStore((s) => s.toggleAnalysis);

  const vibrate = useVibrate();
  const { burst } = useConfetti();

  // 本地已选状态（非受控模式）
  const [localSelected, setLocalSelected] = useState<number>(-1);
  // 是否已答（用于显示解析）
  const [answered, setAnswered] = useState(false);
  // 图片放大查看模态框状态
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  const finalSelected = selected ?? localSelected;
  const isAnswered = examMode ? finalSelected >= 0 : answered;
  const showCorrect = isAnswered && !examMode;

  // 题目变化时重置
  useEffect(() => {
    setLocalSelected(-1);
    setAnswered(false);
  }, [question.id]);

  // 处理选项点击
  const handleSelect = (optionIdx: number) => {
    if (isAnswered && !examMode) return;
    // 已剔除的选项不可选
    if (eliminated.includes(optionIdx)) return;

    if (examMode) {
      // 考试模式：仅记录选择，不立即判断对错
      onSelect?.(optionIdx);
      return;
    }

    // 练习模式：立即判断对错
    setLocalSelected(optionIdx);
    setAnswered(true);
    const correct = optionIdx === question.answer;
    recordAnswer(question.id, optionIdx, correct);
    // 反馈
    if (correct) {
      vibrate('correct');
      burst();
    } else {
      vibrate('wrong');
    }
    // 自动展开解析
    if (!correct) {
      toggleAnalysis(true);
    }
    onSelect?.(optionIdx);
  };

  // 滑动手势
  const swipeRef = useSwipe<HTMLDivElement>(
    {
      onSwipeLeft: () => onNext?.(),
      onSwipeRight: () => onPrev?.()
    },
    { enabled: swipeEnabled, threshold: 60, maxVerticalRatio: 0.6 }
  );

  // 高亮题干HTML
  const questionHtml = useMemo(
    () => highlightKeywords(question.question, question.keywords),
    [question.question, question.keywords]
  );

  // 选项字母 A/B/C/D
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 收藏切换
  const handleBookmark = () => {
    toggleBookmark(question.id);
    vibrate('bookmark');
  };

  return (
    <article
      ref={swipeRef}
      className="qcard"
      data-id={question.id}
      data-type={question.type}
      aria-labelledby={`q-${question.id}-title`}
    >
      {/* 题头：题号 + 类型标签 + 收藏 */}
      <header className="qcard-header">
        <div className="qcard-meta">
          {typeof index === 'number' && typeof total === 'number' && (
            <span className="qcard-index">
              <span className="num">{index}</span>
              <span className="sep">/</span>
              <span className="total">{total}</span>
            </span>
          )}
          <span className={`qcard-type ${question.type}`}>
            {question.type === 'judge' ? '判断题' : '单选题'}
          </span>
          {question.is_image_question && <span className="qcard-badge">图片题</span>}
        </div>
        <div className="qcard-actions">
          <button
            type="button"
            className={`icon-btn ${isBookmarked ? 'active' : ''}`}
            onClick={handleBookmark}
            aria-label={isBookmarked ? '取消收藏' : '加入收藏'}
            aria-pressed={isBookmarked}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 题干 */}
      <h3 id={`q-${question.id}-title`} className="qcard-question" dangerouslySetInnerHTML={{ __html: questionHtml }} />

      {/* 图片 */}
      {question.is_image_question && question.image && (
        <div
          className="qcard-image qcard-image-clickable"
          onClick={() => {
            setImageZoomOpen(true);
            vibrate([10]);
          }}
          role="button"
          tabIndex={0}
          aria-label="点击放大查看图片"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setImageZoomOpen(true);
            }
          }}
        >
          <LazyImage
            src={getImageUrl(question.image)}
            alt={`题目 ${question.id} 配图`}
            nativeLazy
          />
          {/* 点击放大提示标识 */}
          <span className="qcard-image-zoom-hint" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
            </svg>
            <span>点击放大</span>
          </span>
        </div>
      )}

      {/* 图片放大查看模态框 */}
      <Modal
        open={imageZoomOpen}
        onClose={() => setImageZoomOpen(false)}
        title={`题目 ${question.id} 配图`}
        size="lg"
      >
        <div className="qcard-image-zoom">
          <img
            src={getImageUrl(question.image)}
            alt={`题目 ${question.id} 配图放大查看`}
            loading="eager"
            decoding="async"
          />
        </div>
      </Modal>

      {/* 选项 */}
      <div className="qcard-options" role="group" aria-label="选项列表">
        {question.options.map((opt, i) => {
          const isSelected = finalSelected === i;
          const isCorrect = i === question.answer;
          const isEliminated = eliminated.includes(i);
          // 状态判定
          let stateClass = '';
          if (showCorrect) {
            if (isCorrect) stateClass = 'correct';
            else if (isSelected) stateClass = 'wrong';
          } else if (examMode && isSelected) {
            stateClass = 'selected';
          }
          if (isEliminated) stateClass += ' eliminated';

          return (
            <OptionButton
              key={i}
              letter={optionLetters[i] ?? ''}
              text={opt}
              stateClass={stateClass}
              isSelected={isSelected}
              disabled={isAnswered && !examMode}
              showCorrect={showCorrect}
              isCorrect={isCorrect}
              isEliminated={isEliminated}
              onClick={() => handleSelect(i)}
            />
          );
        })}
      </div>

      {/* 答题反馈与解析 */}
      <AnimatePresence>
        {(showCorrect || (examMode && finalSelected >= 0)) && (
          <motion.div
            className="qcard-feedback"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {showCorrect && (
              <div className={`qcard-result ${finalSelected === question.answer ? 'correct' : 'wrong'}`}>
                {finalSelected === question.answer ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    <span>回答正确</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                    <span>回答错误，正确答案是 {optionLetters[question.answer]}</span>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 解析折叠区（练习模式） */}
      {!examMode && (
        <div className="qcard-analysis-wrap">
          <button
            type="button"
            className="qcard-analysis-toggle"
            onClick={() => toggleAnalysis()}
            aria-expanded={analysisVisible}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>查看解析</span>
            <svg className={`chevron ${analysisVisible ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <AnimatePresence>
            {analysisVisible && (
              <motion.div
                className="qcard-analysis"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <p className="qcard-analysis-text">{question.analysis}</p>
                {question.analysis_url && (
                  <a
                    href={question.analysis_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="qcard-analysis-link"
                  >
                    查看来源
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 口诀常驻显示 */}
      {mnemonic && (
        <aside className="qcard-mnemonic" aria-label="速记口诀">
          <div className="qcard-mnemonic-head">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
            </svg>
            <span className="qcard-mnemonic-title">{mnemonic.title}</span>
          </div>
          <p className="qcard-mnemonic-text">{mnemonic.text}</p>
          {mnemonic.explain && <p className="qcard-mnemonic-explain">{mnemonic.explain}</p>}
        </aside>
      )}
    </article>
  );
}

/**
 * 选项按钮子组件
 * - 封装涟漪点击反馈（ripple-host）
 * - 保留原有的 correct/wrong/selected/eliminated 状态样式
 * - framer-motion 弹性图标入场
 */
interface OptionButtonProps {
  /** 选项字母（A/B/C/D...） */
  letter: string;
  /** 选项文本 */
  text: string;
  /** 状态类名（correct/wrong/selected/eliminated 组合） */
  stateClass: string;
  /** 是否选中 */
  isSelected: boolean;
  /** 是否禁用 */
  disabled: boolean;
  /** 是否显示正确答案 */
  showCorrect: boolean;
  /** 是否为正确选项 */
  isCorrect: boolean;
  /** 是否已剔除 */
  isEliminated: boolean;
  /** 点击回调 */
  onClick: () => void;
}

function OptionButton({
  letter,
  text,
  stateClass,
  isSelected,
  disabled,
  showCorrect,
  isCorrect,
  isEliminated,
  onClick
}: OptionButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  // 选项按钮附加涟漪点击反馈（仅未作答时启用）
  useRipple(ref, { enabled: !disabled });

  return (
    <button
      ref={ref}
      type="button"
      className={`qcard-option ripple-host ${stateClass}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`选项 ${letter}：${text}`}
    >
      <span className="qcard-option-letter" aria-hidden="true">
        {letter}
      </span>
      <span className="qcard-option-text">{text}</span>
      {showCorrect && isCorrect && (
        <motion.span
          className="qcard-option-icon correct"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </motion.span>
      )}
      {showCorrect && isSelected && !isCorrect && (
        <motion.span
          className="qcard-option-icon wrong"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </motion.span>
      )}
      {isEliminated && (
        <span className="qcard-option-eliminated" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
}
