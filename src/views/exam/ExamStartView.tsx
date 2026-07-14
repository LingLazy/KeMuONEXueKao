/**
 * 考试开始页
 * - 展示考试须知与科目选择
 * - 调用 onStart 启动考试
 */
import { motion } from 'framer-motion';
import { EXAM_CONFIG } from '@/constants/exam';
import { Icon } from '@/components/common/Icon';
import type { Subject } from '@/types';

interface ExamStartViewProps {
  /** 当前选中的考试科目 */
  selectedSubject: Subject;
  /** 切换考试科目 */
  onSelectSubject: (s: Subject) => void;
  /** 选中科目的题库总量 */
  subjectTotal: number;
  /** 开始考试回调 */
  onStart: () => void;
}

/**
 * 考试开始页组件
 *
 * 展示考试须知、科目选择器与启动入口，用户选择科目后点击开始按钮进入答题流程。
 *
 * @param selectedSubject - 当前选中的考试科目（ke1 或 ke4）
 * @param onSelectSubject - 切换科目回调
 * @param subjectTotal - 选中科目对应的题库题目总数
 * @param onStart - 点击开始考试按钮的回调
 */
export default function ExamStartView({
  selectedSubject,
  onSelectSubject,
  subjectTotal,
  onStart
}: ExamStartViewProps) {
  const config = EXAM_CONFIG[selectedSubject];
  const subjectLabel = selectedSubject === 'ke1' ? '科目一' : '科目四';
  const fullScore = config.count * config.pointsPerQuestion;
  return (
    <div className="view view-exam">
      {/* 开始页装饰层 · 品牌光晕 + 涟漪环 + 三角切片 + S 曲线 */}
      <div className="geo-bg-decor" aria-hidden="true">
        <div className="geo-bg-grid" />
        <div className="geo-glow-primary-tl" />
        <div className="geo-ripple-tr" />
        <div className="geo-triangle-bl" />
        <div className="geo-curve-s" />
        <div className="geo-cross-marks" />
        {/* 扩展装饰 v3.4 · 考试开始页动态元素 */}
        <div className="geo-orbit-dots" />
        <div className="geo-pulse-ring" />
      </div>
      <div className="view-container">
        <motion.div
          className="exam-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="exam-start-hero">
            <div className="exam-start-icon" aria-hidden="true">
              <Icon name="check-square" size={56} />
            </div>
            <h1 className="exam-start-title">{subjectLabel}模拟考试</h1>
            <p className="exam-start-desc">
              全真模拟正式考试环境，{config.count}题随机抽取，{Math.floor(config.duration / 60000)}分钟限时，及格分{config.passScore}分
            </p>
          </div>

          {/* 科目选择器 */}
          <div className="exam-subject-selector" role="radiogroup" aria-label="选择考试科目">
            {(['ke1', 'ke4'] as Subject[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={selectedSubject === s}
                className={`exam-subject-btn ${selectedSubject === s ? 'active' : ''}`}
                onClick={() => onSelectSubject(s)}
              >
                <span className="exam-subject-label">{s === 'ke1' ? '科目一' : '科目四'}</span>
                <span className="exam-subject-desc">
                  {EXAM_CONFIG[s].count}题 · {Math.floor(EXAM_CONFIG[s].duration / 60000)}分钟
                </span>
              </button>
            ))}
          </div>

          <div className="exam-start-rules">
            <h2 className="exam-rules-title">考试须知</h2>
            <ul className="exam-rules-list">
              <li>
                <span className="rule-num">01</span>
                <div className="rule-text">
                  <strong>题量与时长</strong>
                  <p>共 {config.count} 题，限时 {Math.floor(config.duration / 60000)} 分钟，每题{config.pointsPerQuestion}分，满分{fullScore}分</p>
                </div>
              </li>
              <li>
                <span className="rule-num">02</span>
                <div className="rule-text">
                  <strong>及格标准</strong>
                  <p>得分 ≥ {config.passScore} 分为及格，未达分数建议加强复习</p>
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
              <Icon name="book" size={14} />
              {subjectLabel}题库 {subjectTotal} 题
            </span>
            <span className="exam-meta-item">
              <Icon name="clock" size={14} />
              {Math.floor(config.duration / 60000)} 分钟
            </span>
            <span className="exam-meta-item">
              <Icon name="check-square" size={14} />
              及格 {config.passScore} 分
            </span>
          </div>

          <button type="button" className="btn btn-primary btn-lg exam-start-btn" onClick={onStart}>
            <Icon name="play" size={20} />
            开始{subjectLabel}考试
          </button>
        </motion.div>
      </div>
    </div>
  );
}
