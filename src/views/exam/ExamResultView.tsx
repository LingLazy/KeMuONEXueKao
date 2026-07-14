/**
 * 考试结果页
 * - 展示得分、对错统计与用时
 * - 通过/失败差异化视觉反馈
 * - 提供再考一次与返回主页入口
 */
import { motion } from 'framer-motion';
import { EXAM_CONFIG } from '@/constants/exam';
import { Icon } from '@/components/common/Icon';
import { formatDuration } from '@/utils';
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
}

/**
 * 考试结果页组件
 *
 * 根据考试结果展示得分、答题统计（答对/答错/未答/用时），
 * 通过与失败采用差异化装饰与图标，并提供再考一次与返回主页操作入口。
 *
 * @param result - 考试结果数据，包含得分、对错统计、用时与错题列表
 * @param subject - 考试科目，用于查询及格分标准（null 时回退到科目一标准）
 * @param onRestart - 点击"再考一次"按钮的回调
 * @param onBack - 点击"返回主页"按钮的回调
 */
export default function ExamResultView({
  result,
  subject,
  onRestart,
  onBack
}: ExamResultViewProps) {
  const passed = result.passed;
  const passScore = subject ? EXAM_CONFIG[subject].passScore : EXAM_CONFIG.ke1.passScore;
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

          <div className="exam-result-actions">
            <button type="button" className="btn btn-ghost btn-lg" onClick={onBack}>
              返回主页
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onRestart}>
              <Icon name="refresh" size={18} />
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
