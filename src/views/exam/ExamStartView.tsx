/**
 * 考试开始页
 * - 展示考试须知与科目选择
 * - 历史成绩统计卡片（次数/通过率/平均/最佳）
 * - 错题本与历史记录入口
 * - 调用 onStart 启动考试
 */
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { EXAM_CONFIG } from '@/constants/exam';
import { Icon } from '@/components/common/Icon';
import { useExamHistoryStore } from '@/stores/examHistoryStore';
import { useWrongStore } from '@/stores/wrongStore';
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
  /** 打开历史记录模态框 */
  onOpenHistory: () => void;
  /** 打开错题本模态框 */
  onOpenWrongBook: () => void;
}

/**
 * 考试开始页组件
 *
 * 展示考试须知、科目选择器、历史成绩统计、错题本入口与启动按钮。
 * 用户选择科目后点击开始按钮进入答题流程。
 *
 * @param selectedSubject - 当前选中的考试科目（ke1 或 ke4）
 * @param onSelectSubject - 切换科目回调
 * @param subjectTotal - 选中科目对应的题库题目总数
 * @param onStart - 点击开始考试按钮的回调
 * @param onOpenHistory - 打开历史记录模态框回调
 * @param onOpenWrongBook - 打开错题本模态框回调
 */
export default function ExamStartView({
  selectedSubject,
  onSelectSubject,
  subjectTotal,
  onStart,
  onOpenHistory,
  onOpenWrongBook
}: ExamStartViewProps) {
  const config = EXAM_CONFIG[selectedSubject];
  const subjectLabel = selectedSubject === 'ke1' ? '科目一' : '科目四';
  const fullScore = config.count * config.pointsPerQuestion;

  // 历史统计（按当前选中科目筛选）
  // 使用 useShallow 做浅比较，避免选择器返回新对象导致无限重渲染
  const historyStats = useExamHistoryStore(
    useShallow((s) => {
      const records = s.records.filter((r) => r.subject === selectedSubject);
      if (records.length === 0) {
        return { count: 0, passed: 0, passRate: 0, avg: 0, best: 0, latestScore: null, latestPassed: null, latestTime: null };
      }
      const count = records.length;
      const passed = records.filter((r) => r.passed).length;
      const scores = records.map((r) => r.score);
      const sum = scores.reduce((a, b) => a + b, 0);
      // noUncheckedIndexedAccess 下 records[0] 类型为 T | undefined，
      // 但前面已判断 length === 0 提前返回，此处一定存在，使用非空断言
      const latest = records[0]!;
      return {
        count,
        passed,
        passRate: Math.round((passed / count) * 100),
        avg: Math.round((sum / count) * 10) / 10,
        best: Math.max(...scores),
        latestScore: latest.score,
        latestPassed: latest.passed,
        latestTime: latest.timestamp
      };
    })
  );

  // 错题本统计（按当前选中科目筛选）
  // 使用 useShallow 做浅比较，避免选择器返回新对象导致无限重渲染
  const wrongStats = useWrongStore(
    useShallow((s) => {
      const items = Object.values(s.items).filter((item) => item.subject === selectedSubject);
      const now = Date.now();
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      return {
        count: items.length,
        recentCount: items.filter((item) => now - item.lastWrongTime < WEEK_MS).length,
        totalWrong: items.reduce((sum, item) => sum + item.wrongCount, 0)
      };
    })
  );

  const hasHistory = historyStats.count > 0;
  const hasWrong = wrongStats.count > 0;

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

          {/* 历史成绩统计卡片 */}
          <div className="exam-start-stats">
            <div className="stats-card stats-card-history" onClick={onOpenHistory} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenHistory(); } }}>
              <div className="stats-card-head">
                <span className="stats-card-title">
                  <Icon name="clock" size={14} />
                  历史成绩
                </span>
                {hasHistory && <span className="stats-card-more">查看 ›</span>}
              </div>
              {hasHistory ? (
                <>
                  <div className="stats-card-grid">
                    <div className="stats-cell">
                      <span className="stats-cell-num">{historyStats.count}</span>
                      <span className="stats-cell-label">考试次数</span>
                    </div>
                    <div className="stats-cell">
                      <span className="stats-cell-num passed">{historyStats.passed}</span>
                      <span className="stats-cell-label">通过次数</span>
                    </div>
                    <div className="stats-cell">
                      <span className="stats-cell-num">{historyStats.passRate}%</span>
                      <span className="stats-cell-label">通过率</span>
                    </div>
                    <div className="stats-cell">
                      <span className="stats-cell-num best">{historyStats.best}</span>
                      <span className="stats-cell-label">最高分</span>
                    </div>
                  </div>
                  <div className="stats-card-foot">
                    <span className="stats-foot-item">
                      平均 <strong>{historyStats.avg}</strong> 分
                    </span>
                    {historyStats.latestScore !== null && (
                      <span className={`stats-foot-item ${historyStats.latestPassed ? 'passed' : 'failed'}`}>
                        最近 <strong>{historyStats.latestScore}</strong> 分 · {historyStats.latestPassed ? '通过' : '未通过'}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="stats-card-empty">
                  <Icon name="info-circle" size={20} />
                  <span>暂无考试记录，完成一次模拟考试后这里会展示成绩统计</span>
                </div>
              )}
            </div>

            <div className="stats-card stats-card-wrong" onClick={onOpenWrongBook} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenWrongBook(); } }}>
              <div className="stats-card-head">
                <span className="stats-card-title">
                  <Icon name="book" size={14} />
                  错题本
                </span>
                {hasWrong && <span className="stats-card-more">查看 ›</span>}
              </div>
              {hasWrong ? (
                <>
                  <div className="stats-card-grid">
                    <div className="stats-cell">
                      <span className="stats-cell-num wrong">{wrongStats.count}</span>
                      <span className="stats-cell-label">错题数量</span>
                    </div>
                    <div className="stats-cell">
                      <span className="stats-cell-num">{wrongStats.totalWrong}</span>
                      <span className="stats-cell-label">累计错误</span>
                    </div>
                    <div className="stats-cell">
                      <span className="stats-cell-num warn">{wrongStats.recentCount}</span>
                      <span className="stats-cell-label">近7天新增</span>
                    </div>
                  </div>
                  <div className="stats-card-foot">
                    <span className="stats-foot-item">
                      <Icon name="lightbulb" size={11} />
                      点击查看完整错题与解析
                    </span>
                  </div>
                </>
              ) : (
                <div className="stats-card-empty">
                  <Icon name="check-circle" size={20} />
                  <span>错题本为空，考试中的错题会自动收录到这里</span>
                </div>
              )}
            </div>
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
