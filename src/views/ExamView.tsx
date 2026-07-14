/**
 * 模拟考试视图
 * - 三阶段：开始页 → 答题页 → 结果页
 * - 随机抽取题目，限时倒计时
 * - 答题卡：已答/标记/未答状态
 * - 五五提示：剔除两个错误选项
 * - 评分：每题1分，≥90分及格
 * - 中途刷新自动恢复（sessionStorage 持久化）
 * - 通过时撒花庆祝 + 震动反馈
 * - 交卷后自动写入历史记录与错题本
 * - 历史记录、错题本、错题回顾模态框统一管理
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExamStore } from '@/stores/examStore';
import { useWrongStore } from '@/stores/wrongStore';
import { toast } from '@/stores/toastStore';
import { useConfirm } from '@/components/feedback/ConfirmProvider';
import { useHotkeys, useVibrate, useConfetti, useIsMobile } from '@/hooks';
import { loadQuestions } from '@/services/dataLoader';
import { formatTime } from '@/utils';
import QuestionCard from '@/components/question/QuestionCard';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import { Icon } from '@/components/common/Icon';
import GeoBgDecor from '@/components/common/GeoBgDecor';
import ExamStartView from './exam/ExamStartView';
import ExamResultView from './exam/ExamResultView';
import ExamHistoryModal from './exam/ExamHistoryModal';
import WrongQuestionsModal from './exam/WrongQuestionsModal';
import type { Question, Subject } from '@/types';

export default function ExamView() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [restored, setRestored] = useState(false);
  /** 开始页选中的考试科目（默认科目一） */
  const [selectedSubject, setSelectedSubject] = useState<Subject>('ke1');
  /** 历史记录模态框 */
  const [showHistory, setShowHistory] = useState(false);
  /** 错题本模态框 */
  const [showWrongBook, setShowWrongBook] = useState(false);
  /** 本次错题回顾模态框 */
  const [showReview, setShowReview] = useState(false);

  const exam = useExamStore();
  const confirm = useConfirm();
  const vibrate = useVibrate();
  const { celebrate } = useConfetti();
  const isMobile = useIsMobile();

  // 加载题库（带错误状态，便于 UI 反馈与重试）
  const loadData = () => {
    setError(null);
    loadQuestions()
      .then(setQuestions)
      .catch((err) => {
        setError(err instanceof Error ? err.message : '题库加载失败');
      });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 恢复未完成考试
  useEffect(() => {
    if (!questions || restored) return;
    const ok = exam.restore(questions);
    if (ok) {
      toast.info('已恢复上次未完成的考试');
    }
    setRestored(true);
  }, [questions, restored]);

  // 通过时撒花
  useEffect(() => {
    if (exam.result?.passed) {
      celebrate();
      vibrate('submit');
    } else if (exam.result) {
      vibrate('warn');
    }
  }, [exam.result]);

  // 键盘快捷键
  useHotkeys(
    {
      prev: () => exam.prev(),
      next: () => exam.next(),
      select: (idx) => exam.select(exam.currentIndex, idx),
      toggleMark: () => exam.toggleMark(exam.currentIndex),
      hint: () => {
        const item = exam.questions[exam.currentIndex];
        if (!item) return;
        if (item.question.type === 'judge') {
          toast.info('判断题不支持五五提示');
          return;
        }
        if (item.hintUsed) {
          toast.info('本题已使用过提示');
          return;
        }
        exam.useHint(exam.currentIndex);
        toast.success('已剔除两个错误选项');
      },
      submit: async () => {
        // 多选题空数组 [] 视为未答
        const unanswered = exam.questions.filter((q) =>
          Array.isArray(q.selected) ? q.selected.length === 0 : q.selected < 0
        ).length;
        if (unanswered > 0) {
          const ok = await confirm({
            title: '确认交卷',
            content: `还有 ${unanswered} 题未作答，确定要交卷吗？`,
            danger: true,
            confirmText: '确认交卷'
          });
          if (!ok) return;
        }
        exam.submit();
      }
    },
    { enabled: exam.running }
  );

  // 开始考试
  const handleStart = async () => {
    if (!questions) return;
    if (exam.running) {
      const ok = await confirm({
        title: '已有进行中的考试',
        content: '开始新考试将放弃当前进度，是否继续？',
        danger: true,
        confirmText: '开始新考试'
      });
      if (!ok) return;
    }
    exam.reset();
    exam.start(questions, selectedSubject);
    toast.success(`${selectedSubject === 'ke1' ? '科目一' : '科目四'}考试已开始，倒计时启动`);
  };

  // 交卷
  const handleSubmit = async () => {
    // 多选题空数组 [] 视为未答
    const unanswered = exam.questions.filter((q) =>
      Array.isArray(q.selected) ? q.selected.length === 0 : q.selected < 0
    ).length;
    if (unanswered > 0) {
      const ok = await confirm({
        title: '确认交卷',
        content: `还有 ${unanswered} 题未作答，确定要交卷吗？`,
        danger: true,
        confirmText: '确认交卷'
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: '确认交卷',
        content: '已完成所有题目，确定要交卷吗？',
        confirmText: '确认交卷'
      });
      if (!ok) return;
    }
    exam.submit();
  };

  // 重新开始
  const handleRestart = () => {
    exam.reset();
    // reset 同步清理后立即开始新考试，避免 setTimeout 在组件卸载后触发
    handleStart();
  };

  // 返回开始
  const handleBack = async () => {
    const ok = await confirm({
      title: '退出考试',
      content: '退出后本次考试进度将丢失，是否确认退出？',
      danger: true,
      confirmText: '退出'
    });
    if (!ok) return;
    exam.reset();
  };

  // 缓存统计计算，避免每次渲染都对所有题目 filter
  // 关键：必须放在所有条件 return 之前，否则违反 Rules of Hooks
  // （exam.running 从 false 变 true 时 Hook 数量会变化，导致 React 崩溃）
  const { answeredCount, markedCount } = useMemo(() => {
    let answered = 0;
    let marked = 0;
    for (const q of exam.questions) {
      // 多选题空数组 [] 视为未答
      const isAnswered = Array.isArray(q.selected) ? q.selected.length > 0 : q.selected >= 0;
      if (isAnswered) answered++;
      if (q.marked) marked++;
    }
    return { answeredCount: answered, markedCount: marked };
  }, [exam.questions]);

  // 错题本数据：从 wrongStore 获取错题 ID 列表，匹配题库中的完整题目
  const { wrongQuestions, wrongUserAnswers, wrongCounts, wrongTimes } = useMemo(() => {
    if (!questions) {
      return {
        wrongQuestions: [] as Question[],
        wrongUserAnswers: new Map<number, number | number[]>(),
        wrongCounts: new Map<number, number>(),
        wrongTimes: new Map<number, number>()
      };
    }
    const wrongItems = useWrongStore.getState().items;
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const wq: Question[] = [];
    const wua = new Map<number, number | number[]>();
    const wc = new Map<number, number>();
    const wt = new Map<number, number>();
    // 按最近错误时间倒序排列
    const sorted = Object.values(wrongItems).sort((a, b) => b.lastWrongTime - a.lastWrongTime);
    for (const item of sorted) {
      const q = qMap.get(item.qid);
      if (!q) continue; // 题库中不存在该题（可能已被替换），跳过
      wq.push(q);
      wua.set(item.qid, item.lastSelected);
      wc.set(item.qid, item.wrongCount);
      wt.set(item.qid, item.lastWrongTime);
    }
    return { wrongQuestions: wq, wrongUserAnswers: wua, wrongCounts: wc, wrongTimes: wt };
  }, [questions, showWrongBook]); // eslint-disable-line react-hooks/exhaustive-deps

  // 本次考试错题回顾数据：从当前考试题目中提取错题
  const { reviewQuestions, reviewUserAnswers } = useMemo(() => {
    if (!exam.result) {
      return { reviewQuestions: [] as Question[], reviewUserAnswers: new Map<number, number | number[]>() };
    }
    const rq: Question[] = [];
    const rua = new Map<number, number | number[]>();
    for (const item of exam.questions) {
      // 错题 ID 列表包含未答与答错的题目
      if (exam.result.wrongIds.includes(item.question.id)) {
        rq.push(item.question);
        rua.set(item.question.id, item.selected);
      }
    }
    return { reviewQuestions: rq, reviewUserAnswers: rua };
  }, [exam.result, exam.questions]);

  // 加载失败：错误态优先于加载态
  if (error) {
    return (
      <div className="view view-exam">
        <GeoBgDecor variant="error" />
        <div className="view-container">
          <EmptyState
            title="题库加载失败"
            description={error}
            action={
              <button type="button" className="btn btn-primary" onClick={loadData}>
                重试加载
              </button>
            }
          />
        </div>
      </div>
    );
  }

  // 加载中
  if (!questions) {
    return (
      <div className="view view-exam">
        <GeoBgDecor variant="loading" />
        <div className="view-container">
          <div className="exam-loading">
            <div className="spinner" />
            <p>题库加载中…</p>
          </div>
        </div>
      </div>
    );
  }

  // 结果页
  if (exam.result) {
    return (
      <>
        <ExamResultView
          result={exam.result}
          subject={exam.subject}
          onRestart={handleRestart}
          onBack={() => exam.reset()}
          onReviewWrong={() => setShowReview(true)}
          onOpenHistory={() => setShowHistory(true)}
          onOpenWrongBook={() => setShowWrongBook(true)}
        />
        <ExamHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
        <WrongQuestionsModal
          open={showReview}
          onClose={() => setShowReview(false)}
          title="本次错题回顾"
          questions={reviewQuestions}
          userAnswers={reviewUserAnswers}
          mode="review"
        />
        <WrongQuestionsModal
          open={showWrongBook}
          onClose={() => setShowWrongBook(false)}
          title="错题本"
          questions={wrongQuestions}
          userAnswers={wrongUserAnswers}
          mode="book"
          wrongCounts={wrongCounts}
          wrongTimes={wrongTimes}
        />
      </>
    );
  }

  // 开始页
  if (!exam.running) {
    const subjectTotal = questions.filter((q) => q.subject === selectedSubject).length;
    return (
      <>
        <ExamStartView
          onStart={handleStart}
          subjectTotal={subjectTotal}
          selectedSubject={selectedSubject}
          onSelectSubject={setSelectedSubject}
          onOpenHistory={() => setShowHistory(true)}
          onOpenWrongBook={() => setShowWrongBook(true)}
        />
        <ExamHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
        <WrongQuestionsModal
          open={showWrongBook}
          onClose={() => setShowWrongBook(false)}
          title="错题本"
          questions={wrongQuestions}
          userAnswers={wrongUserAnswers}
          mode="book"
          wrongCounts={wrongCounts}
          wrongTimes={wrongTimes}
        />
      </>
    );
  }

  // 答题页
  const current = exam.questions[exam.currentIndex];
  if (!current) {
    return (
      <div className="view view-exam">
        <div className="view-container">
          <EmptyState title="考试数据异常" description="请重新开始考试" />
        </div>
      </div>
    );
  }

  // 统计已由上方 useMemo 计算（早返回前），此处直接使用
  const remainingSec = Math.floor(exam.remaining / 1000);
  const lowTime = remainingSec <= 300;
  const isLastQuestion = exam.currentIndex >= exam.questions.length - 1;

  return (
    <div className="view view-exam">
      {/* 答题页装饰层 · 极简网格底纹 (不干扰答题专注) */}
      <GeoBgDecor variant="exam" />
      {/* 顶部固定栏 · 紧凑型三段式布局 */}
      <header className={`exam-header ${lowTime ? 'low-time' : ''}`}>
        <div className="exam-header-left">
          <button type="button" className="icon-btn" onClick={handleBack} aria-label="退出考试">
            <Icon name="arrow-left" size={18} />
          </button>
          <div
            className="exam-timer"
            role="timer"
            aria-label={`剩余时间 ${formatTime(remainingSec)}`}
            aria-live="off"
          >
            <Icon name="clock" size={16} />
            <span className="exam-timer-text">{formatTime(remainingSec)}</span>
          </div>
          {/* 低时间无障碍提示：仅进入低时间状态时播报一次 */}
          {lowTime && (
            <span className="sr-only" aria-live="polite">
              剩余时间不足 5 分钟，请加快答题进度
            </span>
          )}
        </div>
        <div className="exam-header-center">
          <span className="exam-progress-label">
            第 <strong>{exam.currentIndex + 1}</strong> / {exam.questions.length} 题
          </span>
          {markedCount > 0 && (
            <span className="exam-header-marked" title="已标记题数">
              <Icon name="bookmark" size={12} />
              {markedCount}
            </span>
          )}
        </div>
        <div className="exam-header-right">
          <button
            type="button"
            className="exam-sheet-btn"
            onClick={() => setShowSheet(true)}
            aria-label="打开答题卡"
          >
            <Icon name="sheet" size={16} />
            <span className="exam-sheet-count">{answeredCount}/{exam.questions.length}</span>
          </button>
        </div>
      </header>

      {/* 进度条 */}
      <div className="exam-progress-track" aria-hidden="true">
        <div
          className="exam-progress-fill"
          style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
        />
      </div>

      {/* 题目区 */}
      <div className="exam-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={exam.currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <QuestionCard
              question={current.question}
              index={exam.currentIndex + 1}
              total={exam.questions.length}
              examMode
              selected={current.selected}
              eliminated={current.eliminated}
              onSelect={(idx) => exam.select(exam.currentIndex, idx)}
              onNext={exam.next}
              onPrev={exam.prev}
              swipeEnabled={isMobile}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部操作栏 · 三段式分组：导航 / 辅助 / 推进 */}
      <footer className="exam-footer">
        <div className="exam-footer-nav">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={exam.prev}
            disabled={exam.currentIndex === 0}
          >
            <Icon name="chevron-left" size={16} />
            上一题
          </button>
        </div>

        <div className="exam-footer-center">
          <button
            type="button"
            className={`exam-mark-btn ${current.marked ? 'active' : ''}`}
            onClick={() => exam.toggleMark(exam.currentIndex)}
            aria-pressed={current.marked}
            title="标记本题"
          >
            {/*
              标记按钮保留内联 SVG：marked 状态下需动态填充 fill="currentColor"，
              Icon 组件固定 fill="none" 无法表达该视觉态，CSS .active 也未设置 fill。
            */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill={current.marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {current.marked ? '已标记' : '标记'}
          </button>
          <button
            type="button"
            className="exam-hint-btn"
            onClick={() => {
              if (current.question.type === 'judge') {
                toast.info('判断题不支持五五提示');
                return;
              }
              if (current.hintUsed) {
                toast.info('本题已使用过提示');
                return;
              }
              exam.useHint(exam.currentIndex);
              toast.success('已剔除两个错误选项');
            }}
            disabled={current.hintUsed || current.question.type === 'judge'}
            title={current.question.type === 'judge' ? '判断题不支持五五提示' : '五五提示：剔除两个错误选项'}
          >
            <Icon name="lightbulb" size={16} />
            {current.question.type === 'judge' ? '不可用' : current.hintUsed ? '已提示' : '提示'}
          </button>
        </div>

        <div className="exam-footer-action">
          {isLastQuestion ? (
            <button type="button" className="btn btn-primary exam-submit-btn" onClick={handleSubmit}>
              <Icon name="check-square" size={16} />
              交卷
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={exam.next}>
              下一题
              <Icon name="chevron-right" size={16} />
            </button>
          )}
        </div>
      </footer>

      {/* 答题卡模态 */}
      <Modal open={showSheet} onClose={() => setShowSheet(false)} title="答题卡" size="md">
        <div className="sheet-summary">
          <div className="sheet-stat">
            <span className="sheet-stat-label">已答</span>
            <span className="sheet-stat-val answered">{answeredCount}</span>
          </div>
          <div className="sheet-stat">
            <span className="sheet-stat-label">未答</span>
            <span className="sheet-stat-val unanswered">{exam.questions.length - answeredCount}</span>
          </div>
          <div className="sheet-stat">
            <span className="sheet-stat-label">标记</span>
            <span className="sheet-stat-val marked">{markedCount}</span>
          </div>
        </div>
        <div className="sheet-grid">
          {exam.questions.map((q, i) => {
            // 多选题空数组 [] 视为未答
            const isAnswered = Array.isArray(q.selected) ? q.selected.length > 0 : q.selected >= 0;
            const isCurrent = i === exam.currentIndex;
            return (
              <button
                key={i}
                type="button"
                className={`sheet-cell ${isCurrent ? 'current' : ''} ${
                  isAnswered ? 'answered' : 'unanswered'
                } ${q.marked ? 'marked' : ''}`}
                onClick={() => {
                  exam.jumpTo(i);
                  setShowSheet(false);
                }}
                aria-label={`第${i + 1}题，${isAnswered ? '已答' : '未答'}${q.marked ? '，已标记' : ''}`}
              >
                {i + 1}
                {q.marked && <span className="sheet-cell-flag" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div className="sheet-actions">
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={async () => {
              const ok = await confirm({
                title: '确认交卷',
                content: `已答 ${answeredCount} / ${exam.questions.length} 题，确认交卷吗？`,
                danger: true,
                confirmText: '确认交卷'
              });
              if (ok) {
                setShowSheet(false);
                exam.submit();
              }
            }}
          >
            交卷
          </button>
        </div>
      </Modal>
    </div>
  );
}
