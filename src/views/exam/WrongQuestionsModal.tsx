/**
 * 错题查看模态框
 * - 通用模式：接收题目列表与用户答案映射，展示错题回顾
 * - 支持两种使用场景：
 *   1. 本次错题回顾（mode='review'）：仅展示，无删除操作
 *   2. 错题本（mode='book'）：可单题删除与清空
 * - 展示内容：题干、用户答案（错误高亮）、正确答案（高亮）、解析
 * - 支持图片题：点击图片放大查看
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LazyImage from '@/components/common/LazyImage';
import { Icon } from '@/components/common/Icon';
import { useConfirm } from '@/components/feedback/ConfirmProvider';
import { useWrongStore } from '@/stores/wrongStore';
import { highlightKeywords } from '@/services/highlight';
import { getImageUrl } from '@/services/dataLoader';
import { formatDuration } from '@/utils';
import type { Question } from '@/types';

/** 选项字母常量（模块级，避免每次渲染重建） */
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

interface WrongQuestionsModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 模态框标题 */
  title: string;
  /** 错题列表（已按展示顺序排列） */
  questions: Question[];
  /**
   * 用户答案映射：qid → 用户选择（单选/判断题为 number，多选题为 number[]）
   * 未提供时仅展示正确答案（错题本历史模式）
   */
  userAnswers: Map<number, number | number[]>;
  /** 模式：review=本次回顾（只读），book=错题本（可删除） */
  mode?: 'review' | 'book';
  /** 错题错误次数映射（仅 mode='book' 时使用，qid → 错误次数） */
  wrongCounts?: Map<number, number>;
  /** 最近错误时间映射（仅 mode='book' 时使用，qid → 时间戳） */
  wrongTimes?: Map<number, number>;
}

/**
 * 错题查看模态框组件
 *
 * 通用错题展示组件，支持本次错题回顾与错题本两种模式。
 * review 模式仅展示题目与答案对比；book 模式额外提供删除与清空操作。
 *
 * @param open - 是否显示
 * @param onClose - 关闭回调
 * @param title - 模态框标题
 * @param questions - 错题列表
 * @param userAnswers - 用户答案映射
 * @param mode - 模式（review / book）
 * @param wrongCounts - 错误次数映射
 * @param wrongTimes - 最近错误时间映射
 */
export default function WrongQuestionsModal({
  open,
  onClose,
  title,
  questions,
  userAnswers,
  mode = 'review',
  wrongCounts,
  wrongTimes
}: WrongQuestionsModalProps) {
  const confirm = useConfirm();
  const removeWrong = useWrongStore((s) => s.removeWrong);
  const clearAll = useWrongStore((s) => s.clearAll);
  // 当前展开解析的题目 ID 集合（默认全部展开，便于一次性查看）
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  // 图片放大查看模态框状态
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);

  // 题目 ID 集合（便于 O(1) 查询）
  const questionIds = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);

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

  // 切换某题解析展开/折叠
  const toggleCollapse = (qid: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next;
    });
  };

  // 删除单题（仅 book 模式）
  const handleRemove = async (q: Question) => {
    const ok = await confirm({
      title: '移出错题本',
      content: `确定将题目 ${q.id} 从错题本中移除？移除后该题不再计入错题统计`,
      danger: true,
      confirmText: '移除'
    });
    if (ok) {
      removeWrong(q.id);
    }
  };

  // 清空全部错题（仅 book 模式）
  const handleClearAll = async () => {
    const ok = await confirm({
      title: '清空错题本',
      content: '将永久清空全部错题记录，此操作不可恢复，是否继续？',
      danger: true,
      confirmText: '确认清空'
    });
    if (ok) {
      clearAll();
      onClose();
    }
  };

  // 渲染用户答案文本
  const renderUserAnswer = (q: Question): string => {
    const ans = userAnswers.get(q.id);
    if (ans === undefined || ans === null) return '未作答';
    if (Array.isArray(ans)) {
      if (ans.length === 0) return '未作答';
      return ans
        .slice()
        .sort((a, b) => a - b)
        .map((i) => OPTION_LETTERS[i] ?? String(i + 1))
        .join('、');
    }
    if (ans < 0) return '未作答';
    return OPTION_LETTERS[ans] ?? String(ans + 1);
  };

  // 渲染正确答案文本
  const renderCorrectAnswer = (q: Question): string => {
    const ans = q.answer;
    if (Array.isArray(ans)) {
      return ans
        .slice()
        .sort((a, b) => a - b)
        .map((i) => OPTION_LETTERS[i] ?? String(i + 1))
        .join('、');
    }
    return OPTION_LETTERS[ans] ?? String(ans + 1);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {questions.length === 0 ? (
        <EmptyState
          icon={<Icon name="check-circle" size={48} />}
          title={mode === 'book' ? '错题本为空' : '本次无错题'}
          description={
            mode === 'book'
              ? '错题本暂无错题，继续练习后会自动累计'
              : '恭喜你本次考试全部答对，无错题需要回顾'
          }
        />
      ) : (
        <div className="wrong-modal">
          {/* 顶部摘要栏 */}
          <div className="wrong-modal-summary">
            <div className="wrong-summary-count">
              <Icon name="info-circle" size={14} />
              <span>
                共 <strong>{questions.length}</strong> 道错题
                {mode === 'book' && wrongCounts && (
                  <span className="wrong-summary-sub">
                    · 累计错误{' '}
                    {/* 仅统计当前展示题目对应的错误次数总和 */}
                    {Array.from(wrongCounts.entries())
                      .filter(([qid]) => questionIds.has(qid))
                      .reduce((sum, [, cnt]) => sum + cnt, 0)}{' '}
                    次
                  </span>
                )}
              </span>
            </div>
            {mode === 'book' && (
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                onClick={handleClearAll}
              >
                <Icon name="close" size={14} />
                清空全部
              </button>
            )}
          </div>

          {/* 错题列表 */}
          <ol className="wrong-list">
            {questions.map((q, idx) => {
              const userAns = userAnswers.get(q.id);
              const isUnanswered = userAns === undefined || userAns === null ||
                (Array.isArray(userAns) ? userAns.length === 0 : userAns < 0);
              const userIsCorrect = !isUnanswered && isCorrectAnswer(userAns, q.answer);
              const isCollapsed = collapsedIds.has(q.id);
              const questionHtml = highlightKeywords(q.question, q.keywords);
              const analysisText = q.analysis.replace(/<br\s*\/?>/gi, '\n');
              const wrongCount = wrongCounts?.get(q.id) ?? 0;
              const wrongTime = wrongTimes?.get(q.id);

              return (
                <li key={q.id} className="wrong-item">
                  <article className="wrong-item-article">
                    {/* 题头：序号 + 类型 + 错误次数（错题本模式） */}
                    <header className="wrong-item-header">
                      <div className="wrong-item-meta">
                        <span className="wrong-item-index">{idx + 1}</span>
                        <span className={`wrong-item-type ${q.type}`}>
                          {q.type === 'judge' ? '判断题' : q.type === 'multi' ? '多选题' : '单选题'}
                        </span>
                        {q.subject === 'ke1' ? (
                          <span className="wrong-item-subject">科目一</span>
                        ) : (
                          <span className="wrong-item-subject">科目四</span>
                        )}
                        {mode === 'book' && wrongCount > 0 && (
                          <span className="wrong-item-count" title="累计错误次数">
                            错 {wrongCount} 次
                          </span>
                        )}
                        {mode === 'book' && wrongTime && (
                          <span className="wrong-item-time" title="最近错误时间">
                            {formatDuration(Math.floor((Date.now() - wrongTime) / 1000))}前
                          </span>
                        )}
                      </div>
                      {mode === 'book' && (
                        <button
                          type="button"
                          className="wrong-item-del"
                          onClick={() => handleRemove(q)}
                          aria-label="移出错题本"
                          title="移出错题本"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </header>

                    {/* 题干（高亮关键词） */}
                    <p
                      className="wrong-item-question"
                      dangerouslySetInnerHTML={{ __html: questionHtml }}
                    />

                    {/* 图片题：缩略图，点击放大 */}
                    {q.is_image_question && q.image && (
                      <button
                        type="button"
                        className="wrong-item-image"
                        onClick={() => {
                          setZoomImage({
                            src: getImageUrl(q.image),
                            alt: `题目 ${q.id} 配图`
                          });
                        }}
                        aria-label="点击放大查看图片"
                      >
                        <LazyImage
                          src={getImageUrl(q.image)}
                          alt={`题目 ${q.id} 配图`}
                          nativeLazy
                        />
                        <span className="wrong-item-zoom-hint" aria-hidden="true">
                          <Icon name="search-plus" size={12} />
                          点击放大
                        </span>
                      </button>
                    )}

                    {/* 答案对比 */}
                    <div className="wrong-item-answers">
                      <div className={`wrong-answer-row user ${userIsCorrect ? 'correct' : 'wrong'}`}>
                        <span className="wrong-answer-label">你的答案</span>
                        <span className="wrong-answer-val">
                          {renderUserAnswer(q)}
                          {!isUnanswered && (
                            <span className="wrong-answer-tag">
                              {userIsCorrect ? '答对' : '答错'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="wrong-answer-row correct">
                        <span className="wrong-answer-label">正确答案</span>
                        <span className="wrong-answer-val">{renderCorrectAnswer(q)}</span>
                      </div>
                    </div>

                    {/* 解析折叠区 */}
                    <div className="wrong-item-analysis-wrap">
                      <button
                        type="button"
                        className="wrong-item-analysis-toggle"
                        onClick={() => toggleCollapse(q.id)}
                        aria-expanded={!isCollapsed}
                      >
                        <Icon name="info-circle" size={14} />
                        <span>{isCollapsed ? '查看解析' : '收起解析'}</span>
                        <svg
                          className={`chevron ${isCollapsed ? '' : 'open'}`}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            className="wrong-item-analysis"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          >
                            <p className="wrong-item-analysis-text">{analysisText}</p>
                            {/* 速记口诀（若存在） */}
                            {q.mnemonic && (
                              <div className="wrong-item-mnemonic">
                                <Icon name="lightbulb" size={12} />
                                <span>{q.mnemonic}</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>

          {/* 底部提示 */}
          <p className="wrong-modal-hint">
            <Icon name="info-circle" size={12} />
            {mode === 'book'
              ? '错题本最多保留 2000 题，超出将自动剔除最旧条目'
              : '建议针对错题相关章节重点复习，巩固薄弱知识点'}
          </p>
        </div>
      )}

      {/* 图片放大查看模态框（嵌套） */}
      <Modal
        open={zoomImage !== null}
        onClose={() => setZoomImage(null)}
        title={zoomImage?.alt ?? '图片查看'}
        size="lg"
      >
        {zoomImage && (
          <div className="wrong-image-zoom">
            <img
              src={zoomImage.src}
              alt={zoomImage.alt}
              loading="eager"
              decoding="async"
            />
          </div>
        )}
      </Modal>
    </Modal>
  );
}
