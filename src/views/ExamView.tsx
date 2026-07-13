/**
 * 模拟考试视图
 * - 三阶段：开始页 → 答题页 → 结果页
 * - 100题随机抽取，45分钟倒计时
 * - 答题卡：已答/标记/未答状态
 * - 五五提示：剔除两个错误选项
 * - 评分：每题1分，≥90分及格
 * - 中途刷新自动恢复（sessionStorage 持久化）
 * - 通过时撒花庆祝 + 震动反馈
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExamStore, EXAM_COUNT, EXAM_DURATION, EXAM_PASS_SCORE } from '@/stores/examStore';
import { toast } from '@/stores/toastStore';
import { useConfirm } from '@/components/feedback/ConfirmProvider';
import { useHotkeys, useVibrate, useConfetti, useIsMobile } from '@/hooks';
import { loadQuestions } from '@/services/dataLoader';
import { formatTime, formatDuration } from '@/utils';
import QuestionCard from '@/components/question/QuestionCard';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import type { Question } from '@/types';

export default function ExamView() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [restored, setRestored] = useState(false);

  const exam = useExamStore();
  const confirm = useConfirm();
  const vibrate = useVibrate();
  const { celebrate } = useConfetti();
  const isMobile = useIsMobile();

  // 加载题库
  useEffect(() => {
    loadQuestions().then(setQuestions).catch(console.error);
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
      toggleMark: () => exam.toggleMark(exam.currentIndex),
      hint: () => {
        const item = exam.questions[exam.currentIndex];
        if (!item) return;
        if (item.question.type === 'judge') {
          toast.info('判断题不支持五五提示');
          return;
        }
        if (item.hintUsed) {
          toast.info('已使用过提示或不可用');
          return;
        }
        exam.useHint(exam.currentIndex);
        toast.success('已剔除两个错误选项');
      },
      submit: async () => {
        const unanswered = exam.questions.filter((q) => q.selected < 0).length;
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
    exam.start(questions);
    toast.success('考试已开始，45分钟倒计时启动');
  };

  // 交卷
  const handleSubmit = async () => {
    const unanswered = exam.questions.filter((q) => q.selected < 0).length;
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

  // 加载中
  if (!questions) {
    return (
      <div className="view view-exam">
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
    return <ExamResultView result={exam.result} onRestart={handleRestart} onBack={() => exam.reset()} />;
  }

  // 开始页
  if (!exam.running) {
    return <ExamStartView onStart={handleStart} total={questions.length} />;
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

  const answeredCount = exam.questions.filter((q) => q.selected >= 0).length;
  const markedCount = exam.questions.filter((q) => q.marked).length;
  const remainingSec = Math.floor(exam.remaining / 1000);
  const lowTime = remainingSec <= 300;

  return (
    <div className="view view-exam">
      {/* 顶部固定栏 */}
      <header className={`exam-header ${lowTime ? 'low-time' : ''}`}>
        <div className="exam-header-left">
          <button type="button" className="icon-btn" onClick={handleBack} aria-label="退出考试">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="exam-timer" aria-label="剩余时间">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="exam-timer-text">{formatTime(remainingSec)}</span>
          </div>
        </div>
        <div className="exam-header-center">
          <span className="exam-progress-label">
            第 <strong>{exam.currentIndex + 1}</strong> / {exam.questions.length} 题
          </span>
        </div>
        <div className="exam-header-right">
          <button
            type="button"
            className="exam-sheet-btn"
            onClick={() => setShowSheet(true)}
            aria-label="打开答题卡"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span>答题卡</span>
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

      {/* 底部操作栏 */}
      <footer className="exam-footer">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={exam.prev}
          disabled={exam.currentIndex === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          上一题
        </button>

        <div className="exam-footer-center">
          <button
            type="button"
            className={`exam-mark-btn ${current.marked ? 'active' : ''}`}
            onClick={() => exam.toggleMark(exam.currentIndex)}
            aria-pressed={current.marked}
            title="标记本题"
          >
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
            </svg>
            {current.question.type === 'judge' ? '不可用' : current.hintUsed ? '已提示' : '提示'}
          </button>
        </div>

        {exam.currentIndex >= exam.questions.length - 1 ? (
          <button type="button" className="btn btn-primary exam-submit-btn" onClick={handleSubmit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            交卷
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={exam.next}>
            下一题
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
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
            const isAnswered = q.selected >= 0;
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

/** 考试开始页 */
function ExamStartView({ onStart, total }: { onStart: () => void; total: number }) {
  return (
    <div className="view view-exam">
      <div className="view-container">
        <motion.div
          className="exam-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="exam-start-hero">
            <div className="exam-start-icon" aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h1 className="exam-start-title">模拟考试</h1>
            <p className="exam-start-desc">
              全真模拟正式考试环境，{EXAM_COUNT}题随机抽取，{Math.floor(EXAM_DURATION / 60000)}分钟限时，及格分{EXAM_PASS_SCORE}分
            </p>
          </div>

          <div className="exam-start-rules">
            <h2 className="exam-rules-title">考试须知</h2>
            <ul className="exam-rules-list">
              <li>
                <span className="rule-num">01</span>
                <div className="rule-text">
                  <strong>题量与时长</strong>
                  <p>共 {EXAM_COUNT} 题，限时 {Math.floor(EXAM_DURATION / 60000)} 分钟，每题1分，满分100分</p>
                </div>
              </li>
              <li>
                <span className="rule-num">02</span>
                <div className="rule-text">
                  <strong>及格标准</strong>
                  <p>得分 ≥ {EXAM_PASS_SCORE} 分为及格，未达分数建议加强复习</p>
                </div>
              </li>
              <li>
                <span className="rule-num">03</span>
                <div className="rule-text">
                  <strong>五五提示</strong>
                  <p>每题可使用一次"五五提示"，系统将剔除两个错误选项（不扣分）</p>
                </div>
              </li>
              <li>
                <span className="rule-num">04</span>
                <div className="rule-text">
                  <strong>标记题目</strong>
                  <p>遇到不确定的题目可标记，稍后在答题卡中快速跳转回顾</p>
                </div>
              </li>
              <li>
                <span className="rule-num">05</span>
                <div className="rule-text">
                  <strong>中途退出</strong>
                  <p>考试进度自动保存，刷新页面可恢复，主动退出将丢失进度</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="exam-start-meta">
            <span className="exam-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              题库 {total} 题
            </span>
            <span className="exam-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {Math.floor(EXAM_DURATION / 60000)} 分钟
            </span>
            <span className="exam-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              及格 {EXAM_PASS_SCORE} 分
            </span>
          </div>

          <button type="button" className="btn btn-primary btn-lg exam-start-btn" onClick={onStart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            开始考试
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/** 考试结果页 */
function ExamResultView({
  result,
  onRestart,
  onBack
}: {
  result: NonNullable<ReturnType<typeof useExamStore.getState>['result']>;
  onRestart: () => void;
  onBack: () => void;
}) {
  const passed = result.passed;
  return (
    <div className="view view-exam">
      <div className="view-container">
        <motion.div
          className={`exam-result ${passed ? 'passed' : 'failed'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="exam-result-hero">
            <motion.div
              className={`exam-result-icon ${passed ? 'passed' : 'failed'}`}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
              aria-hidden="true"
            >
              {passed ? (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              ) : (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              )}
            </motion.div>
            <h1 className="exam-result-title">
              {passed ? '恭喜通过' : '未达及格线'}
            </h1>
            <p className="exam-result-desc">
              {passed
                ? '已通过模拟考试，可以预约正式考试了'
                : '继续努力，加强复习后再战'}
            </p>
          </div>

          <div className="exam-result-score">
            <span className="score-num">{result.score}</span>
            <span className="score-unit">分</span>
            <span className="score-pass">/ 及格 {EXAM_PASS_SCORE} 分</span>
          </div>

          <div className="exam-result-stats">
            <div className="result-stat correct">
              <span className="result-stat-num">{result.correct}</span>
              <span className="result-stat-label">答对</span>
            </div>
            <div className="result-stat wrong">
              <span className="result-stat-num">{result.wrong}</span>
              <span className="result-stat-label">答错</span>
            </div>
            <div className="result-stat unanswered">
              <span className="result-stat-num">{result.unanswered}</span>
              <span className="result-stat-label">未答</span>
            </div>
            <div className="result-stat time">
              <span className="result-stat-num">{formatDuration(result.usedTime)}</span>
              <span className="result-stat-label">用时</span>
            </div>
          </div>

          <div className="exam-result-actions">
            <button type="button" className="btn btn-ghost btn-lg" onClick={onBack}>
              返回主页
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onRestart}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9M3 3v6h6" />
              </svg>
              再考一次
            </button>
          </div>

          {result.wrongIds.length > 0 && (
            <div className="exam-result-wrong">
              <p className="wrong-title">本次错题 ({result.wrongIds.length} 题)</p>
              <p className="wrong-hint">建议在练习视图按分类复习相关题目</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
