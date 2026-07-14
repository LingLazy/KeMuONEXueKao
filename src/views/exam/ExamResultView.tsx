/**
 * 考试结果页
 * - 展示得分、对错统计、用时与等级评定
 * - 通过/失败差异化视觉反馈
 * - 错题回顾、历史记录、错题本入口
 * - 提供再考一次与返回主页入口
 */
import { motion } from 'framer-motion';
import { EXAM_CONFIG } from '@/constants/exam';
import { Icon } from '@/components/common/Icon';
import { formatDuration } from '@/utils';
import { useExamHistoryStore } from '@/stores/examHistoryStore';
import type { ExamResult, Subject } from '@/types';

interface ExamResultViewProps {
  /** 考试结果数据 */
  result: ExamResult;
  /** 考试科目（可能为 null） */
  subject: Subject | null;
  /** 重新开始考试回调 */
  onRestart: () => void;
  /** 返回开始页回调 */
  onBack: () => void;
  /** 回顾本次错题回调 */
  onReviewWrong: () => void;
  /** 打开历史记录模态框 */
  onOpenHistory: () => void;
  /** 打开错题本模态框 */
  onOpenWrongBook: () => void;
}

/** 等级评定结果 */
interface GradeInfo {
  /** 等级字母 A/B/C/D */
  letter: string;
  /** 等级名称 */
  name: string;
  /** 等级描述 */
  desc: string;
  /** 等级样式类名 */
  cls: string;
}

/**
 * 根据得分评定等级
 * - A 卓越：≥95% 满分比
 * - B 优秀：90-94%
 * - C 合格：及格线至 89%
 * - D 不合格：低于及格线
 *
 * 输入参数：
 * @param score - 实际得分
 * @param fullScore - 满分
 * @param passScore - 及格分
 *
 * 返回值：
 * @returns GradeInfo 等级信息对象
 */
function getGrade(score: number, fullScore: number, passScore: number): GradeInfo {
  const pct = fullScore > 0 ? (score / fullScore) * 100 : 0;
  if (pct >= 95) {
    return { letter: 'A', name: '卓越', desc: '已全面掌握考点，可从容应对正式考试', cls: 'grade-a' };
  }
  if (pct >= 90) {
    return { letter: 'B', name: '优秀', desc: '掌握扎实，建议查漏补缺冲击满分', cls: 'grade-b' };
  }
  if (score >= passScore) {
    return { letter: 'C', name: '合格', desc: '已通过及格线，仍有提升空间', cls: 'grade-c' };
  }
  return { letter: 'D', name: '不合格', desc: '未达及格线，请加强复习后再战', cls: 'grade-d' };
}

/**
 * 考试结果页组件
 *
 * 根据考试结果展示得分、答题统计、等级评定（用时/答对/答错/未答），
 * 通过与失败采用差异化装饰与图标，并提供再考一次、返回主页、
 * 错题回顾、历史记录、错题本等操作入口。
 *
 * @param result - 考试结果数据，包含得分、对错统计、用时与错题列表
 * @param subject - 考试科目，用于查询及格分标准（null 时回退到科目一标准）
 * @param onRestart - 点击"再考一次"按钮的回调
 * @param onBack - 点击"返回主页"按钮的回调
 * @param onReviewWrong - 点击"错题回顾"按钮的回调
 * @param onOpenHistory - 点击"历史记录"按钮的回调
 * @param onOpenWrongBook - 点击"错题本"按钮的回调
 */
export default function ExamResultView({
  result,
  subject,
  onRestart,
  onBack,
  onReviewWrong,
  onOpenHistory,
  onOpenWrongBook
}: ExamResultViewProps) {
  const passed = result.passed;
  const passScore = subject ? EXAM_CONFIG[subject].passScore : EXAM_CONFIG.ke1.passScore;
  const fullScore = subject
    ? EXAM_CONFIG[subject].count * EXAM_CONFIG[subject].pointsPerQuestion
    : EXAM_CONFIG.ke1.count * EXAM_CONFIG.ke1.pointsPerQuestion;

  // 等级评定
  const grade = getGrade(result.score, fullScore, passScore);

  // 历史最佳成绩（用于本次与历史对比）
  const bestScore = useExamHistoryStore((s) => {
    if (!subject) return null;
    const records = s.records.filter((r) => r.subject === subject);
    if (records.length === 0) return null;
    return Math.max(...records.map((r) => r.score));
  });
  const isNewBest = bestScore !== null && result.score >= bestScore && result.score > 0;

  // 正确率
  const totalQuestions = result.correct + result.wrong + result.unanswered;
  const correctRate = totalQuestions > 0 ? Math.round((result.correct / totalQuestions) * 100) : 0;

  return (
    <div className="view view-exam">
      {/* 结果页装饰层 · 通过=成功光晕+同心环; 失败=危险光晕+对角线 */}
      <div className="geo-bg-decor" aria-hidden="true">
        <div className="geo-bg-grid" />
        {passed ? (
          <>
            <div className="geo-glow-success-mr" />
            <div className="geo-glow-primary-tl" />
            <div className="geo-half-rings-br" />
            <div className="geo-curve-s" />
            {/* 扩展装饰 v3.4 · 通过时漂浮方块与螺旋庆祝感 */}
            <div className="geo-float-block" />
            <div className="geo-spiral-ccw" />
          </>
        ) : (
          <>
            <div className="geo-glow-danger-ml" />
            <div className="geo-diag-line" />
            <div className="geo-triangle-rt" />
            <div className="geo-cross-marks" />
            {/* 扩展装饰 v3.4 · 失败时十字网格强化复盘感 */}
            <div className="geo-cross-grid" />
          </>
        )}
      </div>
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
                <Icon name="check-circle" size={64} />
              ) : (
                <Icon name="x-circle" size={64} />
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

          {/* 等级评定徽章 */}
          <div className={`exam-result-grade ${grade.cls}`} role="status">
            <div className="grade-badge">
              <span className="grade-letter">{grade.letter}</span>
            </div>
            <div className="grade-info">
              <span className="grade-name">{grade.name}</span>
              <span className="grade-desc">{grade.desc}</span>
            </div>
            {isNewBest && (
              <motion.span
                className="grade-new-best"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Icon name="star" size={12} />
                新纪录
              </motion.span>
            )}
          </div>

          <div className="exam-result-score">
            <span className="score-num">{result.score}</span>
            <span className="score-unit">分</span>
            <span className="score-pass">/ 及格 {passScore} 分</span>
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

          {/* 正确率进度条 */}
          <div className="exam-result-rate">
            <div className="rate-row">
              <span className="rate-label">正确率</span>
              <span className="rate-val">{correctRate}%</span>
            </div>
            <div className="rate-track">
              <motion.div
                className="rate-fill"
                initial={{ width: 0 }}
                animate={{ width: `${correctRate}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* 主要操作按钮 */}
          <div className="exam-result-actions">
            <button type="button" className="btn btn-ghost btn-lg" onClick={onBack}>
              返回主页
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onRestart}>
              <Icon name="refresh" size={18} />
              再考一次
            </button>
          </div>

          {/* 错题回顾与历史入口 */}
          {result.wrongIds.length > 0 && (
            <div className="exam-result-wrong">
              <div className="wrong-head">
                <p className="wrong-title">
                  <Icon name="info-circle" size={14} />
                  本次错题 {result.wrongIds.length} 题
                </p>
                <button
                  type="button"
                  className="btn btn-primary-ghost btn-sm"
                  onClick={onReviewWrong}
                >
                  <Icon name="search-plus" size={14} />
                  立即回顾
                </button>
              </div>
              <p className="wrong-hint">
                建议先查看错题解析理解知识点，再针对性复习相关章节
              </p>
            </div>
          )}

          {/* 次要入口：历史记录与错题本 */}
          <div className="exam-result-extra">
            <button type="button" className="extra-entry" onClick={onOpenHistory}>
              <span className="extra-entry-icon">
                <Icon name="clock" size={18} />
              </span>
              <span className="extra-entry-text">
                <span className="extra-entry-title">历史记录</span>
                <span className="extra-entry-desc">查看历次成绩与趋势</span>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
            <button type="button" className="extra-entry" onClick={onOpenWrongBook}>
              <span className="extra-entry-icon">
                <Icon name="book" size={18} />
              </span>
              <span className="extra-entry-text">
                <span className="extra-entry-title">错题本</span>
                <span className="extra-entry-desc">复习全部累计错题</span>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
