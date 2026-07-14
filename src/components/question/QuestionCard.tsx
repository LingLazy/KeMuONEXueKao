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
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question, Mnemonic } from '@/types';
import { highlightKeywords } from '@/services/highlight';
import { getImageUrl } from '@/services/dataLoader';
import { useProgressStore } from '@/stores/progressStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useVibrate, useConfetti, useSwipe, useRipple } from '@/hooks';
import LazyImage from '@/components/common/LazyImage';
import Modal from '@/components/common/Modal';

/** 选项字母常量（模块级，避免每次渲染重建） */
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/**
 * 安全 URL 校验：仅允许 http/https 协议
 * - 拒绝 javascript:/data:/vbscript: 等危险协议，防止 XSS
 * - 拒绝空白字符串与非法格式
 * @param url 待校验的 URL 字符串
 * @returns 是否为安全的可跳转 URL
 */
function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // 仅允许 http/https 协议，禁止任何可能注入脚本的协议
  return /^https?:\/\//i.test(trimmed);
}

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
  /** 已选答案索引（外部受控；单选/判断题为 number，多选题为 number[]） */
  selected?: number | number[];
  /** 已剔除选项（考试五五提示） */
  eliminated?: number[];
  /** 选项点击回调（考试模式使用，传递选项索引） */
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

  // 本地已选状态（非受控模式）：单选/判断题为 number（-1 未答），多选题为 number[]（[] 未答）
  const [localSelected, setLocalSelected] = useState<number | number[]>(
    question.type === 'multi' ? [] : -1
  );
  // 是否已答（用于显示解析）
  const [answered, setAnswered] = useState(false);
  // 图片放大查看模态框状态
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  const finalSelected = selected ?? localSelected;
  // 判断是否已作答：单选/判断题为 >=0，多选题为长度 > 0 的数组
  const isAnswered = examMode
    ? Array.isArray(finalSelected)
      ? finalSelected.length > 0
      : finalSelected >= 0
    : answered;
  const showCorrect = isAnswered && !examMode;

  // 是否为多选题
  const isMulti = question.type === 'multi';

  // 题目变化时重置（根据题型初始化选中状态）
  useEffect(() => {
    setLocalSelected(question.type === 'multi' ? [] : -1);
    setAnswered(false);
  }, [question.id, question.type]);

  /**
   * 比较用户答案与正确答案
   * - 单选/判断题：直接比较 number
   * - 多选题：排序后逐项比较数组
   */
  const isCorrectAnswer = (userAns: number | number[], correctAns: number | number[]): boolean => {
    if (Array.isArray(correctAns)) {
      if (!Array.isArray(userAns)) return false;
      if (userAns.length !== correctAns.length) return false;
      const sortedUser = [...userAns].sort((a, b) => a - b);
      const sortedCorrect = [...correctAns].sort((a, b) => a - b);
      return sortedUser.every((v, i) => v === sortedCorrect[i]);
    }
    return !Array.isArray(userAns) && userAns === correctAns;
  };

  // 处理选项点击
  const handleSelect = (optionIdx: number) => {
    if (isAnswered && !examMode) return;
    // 已剔除的选项不可选
    if (eliminated.includes(optionIdx)) return;

    // 多选题：切换选中状态（不立即判定对错，需用户点击"确认答案"）
    if (isMulti) {
      if (examMode) {
        // 考试模式：直接回调让 store 处理数组切换
        onSelect?.(optionIdx);
        return;
      }
      // 练习模式：本地维护选中数组
      const cur = Array.isArray(localSelected) ? localSelected : [];
      const next = cur.includes(optionIdx)
        ? cur.filter((i) => i !== optionIdx)
        : [...cur, optionIdx];
      setLocalSelected(next);
      return;
    }

    // 单选/判断题
    if (examMode) {
      // 考试模式：仅记录选择，不立即判断对错
      onSelect?.(optionIdx);
      return;
    }

    // 练习模式：立即判断对错
    setLocalSelected(optionIdx);
    setAnswered(true);
    const correct = isCorrectAnswer(optionIdx, question.answer);
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

  /**
   * 多选题确认答案
   * 练习模式下用户选择至少 2 项后可点击确认，立即判定对错
   */
  const handleConfirmMulti = () => {
    if (!isMulti || answered) return;
    const cur = Array.isArray(localSelected) ? localSelected : [];
    if (cur.length < 2) return;
    setAnswered(true);
    const correct = isCorrectAnswer(cur, question.answer);
    recordAnswer(question.id, cur, correct);
    if (correct) {
      vibrate('correct');
      burst();
    } else {
      vibrate('wrong');
    }
    if (!correct) {
      toggleAnalysis(true);
    }
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

  // 解析文本预处理：将 <br>/<br/> 标签转换为换行符，
  // 配合 CSS white-space: pre-wrap 渲染换行，避免使用 dangerouslySetInnerHTML，
  // 保留 React 自动转义能力以防范 XSS 注入
  const analysisText = useMemo(
    () => question.analysis.replace(/<br\s*\/?>/gi, '\n'),
    [question.analysis]
  );

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
            {question.type === 'judge' ? '判断题' : question.type === 'multi' ? '多选题' : '单选题'}
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

      {/* 图片 · 使用原生 button 包裹，确保键盘/触屏/屏幕阅读器一致体验 */}
      {question.is_image_question && question.image && (
        <button
          type="button"
          className="qcard-image qcard-image-clickable"
          onClick={() => {
            setImageZoomOpen(true);
            vibrate([10]);
          }}
          aria-label="点击放大查看图片"
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
        </button>
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

      {/* 选项 · 单选/判断题使用 radiogroup 语义，多选题使用 group + checkbox 语义 */}
      <div
        className={`qcard-options ${isMulti ? 'qcard-options-multi' : ''}`}
        role={isMulti ? 'group' : 'radiogroup'}
        aria-label={isMulti ? '多选选项列表（可选多项）' : '选项列表'}
      >
        {question.options.map((opt, i) => {
          // 多选题：选中状态基于数组包含判断；单选：基于严格相等
          const isSelected = isMulti
            ? Array.isArray(finalSelected) && finalSelected.includes(i)
            : finalSelected === i;
          // 正确选项判定：多选题基于数组包含，单选基于严格相等
          const isCorrect = Array.isArray(question.answer)
            ? question.answer.includes(i)
            : i === question.answer;
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
              key={`${OPTION_LETTERS[i] ?? i}-${opt.slice(0, 8)}`}
              letter={OPTION_LETTERS[i] ?? ''}
              text={opt}
              stateClass={stateClass}
              isSelected={isSelected}
              disabled={isAnswered && !examMode}
              showCorrect={showCorrect}
              isCorrect={isCorrect}
              isEliminated={isEliminated}
              isMulti={isMulti}
              onClick={() => handleSelect(i)}
            />
          );
        })}
      </div>

      {/* 多选题确认按钮 · 练习模式下选满 2 项及以上可确认 */}
      {isMulti && !examMode && !answered && (
        <button
          type="button"
          className="qcard-confirm-multi"
          onClick={handleConfirmMulti}
          disabled={!(Array.isArray(localSelected) && localSelected.length >= 2)}
        >
          确认答案（已选 {Array.isArray(localSelected) ? localSelected.length : 0} 项）
        </button>
      )}

      {/* 答题反馈与解析 · 使用 opacity + translateY 避免高度突变导致页面跳动 */}
      <AnimatePresence>
        {(showCorrect || (examMode && isAnswered)) && (
          <motion.div
            className="qcard-feedback"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {showCorrect && (
              <div className={`qcard-result ${isCorrectAnswer(finalSelected, question.answer) ? 'correct' : 'wrong'}`}>
                {isCorrectAnswer(finalSelected, question.answer) ? (
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
                    <span>回答错误，正确答案是 {Array.isArray(question.answer) ? question.answer.map((i) => OPTION_LETTERS[i]).join('') : OPTION_LETTERS[question.answer]}</span>
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
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="qcard-analysis-text">{analysisText}</p>
                {/* 安全校验：仅渲染 http/https 协议的链接，防止 javascript: 等协议注入 */}
                {question.analysis_url && isSafeUrl(question.analysis_url) && (
                  <a
                    href={question.analysis_url.trim()}
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
  /** 是否为多选题（决定 ARIA 角色：radio vs checkbox） */
  isMulti?: boolean;
  /** 点击回调 */
  onClick: () => void;
}

function OptionButtonImpl({
  letter,
  text,
  stateClass,
  isSelected,
  disabled,
  showCorrect,
  isCorrect,
  isEliminated,
  isMulti = false,
  onClick
}: OptionButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  // 选项按钮附加涟漪点击反馈（仅未作答时启用）
  useRipple(ref, { enabled: !disabled });

  return (
    <button
      ref={ref}
      type="button"
      className={`qcard-option ripple-host ${stateClass} ${isMulti ? 'qcard-option-multi' : ''}`}
      onClick={onClick}
      disabled={disabled}
      role={isMulti ? 'checkbox' : 'radio'}
      aria-checked={isSelected}
      aria-label={`选项 ${letter}：${text}${isMulti ? '（多选）' : ''}`}
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

// memo 包裹：父组件状态变化（收藏、解析展开）时避免所有选项重渲染
const OptionButton = memo(OptionButtonImpl);
