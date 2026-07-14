/**
 * 考试历史记录模态框
 * - 展示历次考试的得分、对错统计、用时与时间
 * - 顶部聚合统计卡片：次数 / 通过率 / 平均分 / 最佳
 * - 最近 10 次成绩趋势条形可视化
 * - 支持清空全部历史与单条删除
 */
import { useMemo, useState } from 'react';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { useConfirm } from '@/components/feedback/ConfirmProvider';
import { useExamHistoryStore } from '@/stores/examHistoryStore';
import { formatDuration } from '@/utils';
import type { ExamHistoryRecord } from '@/types';

interface ExamHistoryModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/** 格式化时间戳为可读日期时间 */
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

/**
 * 考试历史记录模态框组件
 *
 * 展示用户历次考试记录与统计指标，提供清空全部与单条删除操作。
 *
 * @param open - 是否显示模态框
 * @param onClose - 关闭模态框回调
 */
export default function ExamHistoryModal({ open, onClose }: ExamHistoryModalProps) {
  const records = useExamHistoryStore((s) => s.records);
  const clearAll = useExamHistoryStore((s) => s.clearAll);
  const removeRecord = useExamHistoryStore((s) => s.removeRecord);
  const confirm = useConfirm();
  const [filterSubject, setFilterSubject] = useState<'all' | 'ke1' | 'ke4'>('all');

  // 按科目筛选后的记录
  const filteredRecords = useMemo(() => {
    if (filterSubject === 'all') return records;
    return records.filter((r) => r.subject === filterSubject);
  }, [records, filterSubject]);

  // 聚合统计指标（基于筛选后的记录）
  const stats = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { count: 0, passed: 0, passRate: 0, avg: 0, best: 0 };
    }
    const count = filteredRecords.length;
    const passed = filteredRecords.filter((r) => r.passed).length;
    const scores = filteredRecords.map((r) => r.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      count,
      passed,
      passRate: Math.round((passed / count) * 100),
      avg: Math.round((sum / count) * 10) / 10,
      best: Math.max(...scores)
    };
  }, [filteredRecords]);

  // 最近 10 次成绩趋势（按时间正序，便于从左到右展示）
  const trend = useMemo(() => {
    return [...filteredRecords].slice(0, 10).reverse();
  }, [filteredRecords]);

  // 清空全部历史
  const handleClearAll = async () => {
    const ok = await confirm({
      title: '清空考试历史',
      content: '将永久删除全部考试历史记录，此操作不可恢复，是否继续？',
      danger: true,
      confirmText: '确认清空'
    });
    if (ok) {
      clearAll();
    }
  };

  // 删除单条记录
  const handleRemove = async (record: ExamHistoryRecord) => {
    const ok = await confirm({
      title: '删除该记录',
      content: `删除 ${formatTimestamp(record.timestamp)} 的考试记录？`,
      danger: true,
      confirmText: '删除'
    });
    if (ok) {
      removeRecord(record.id);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="考试历史记录" size="lg">
      {records.length === 0 ? (
        <EmptyState
          icon={<Icon name="check-square" size={48} />}
          title="暂无考试记录"
          description="完成一次模拟考试后，将在此处展示历史成绩"
        />
      ) : (
        <div className="exam-history">
          {/* 科目筛选 */}
          <div className="history-filter" role="radiogroup" aria-label="按科目筛选">
            {(['all', 'ke1', 'ke4'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={filterSubject === s}
                className={`history-filter-btn ${filterSubject === s ? 'active' : ''}`}
                onClick={() => setFilterSubject(s)}
              >
                {s === 'all' ? '全部' : s === 'ke1' ? '科目一' : '科目四'}
              </button>
            ))}
          </div>

          {/* 统计概览 */}
          <div className="history-stats">
            <div className="history-stat">
              <span className="history-stat-num">{stats.count}</span>
              <span className="history-stat-label">考试次数</span>
            </div>
            <div className="history-stat">
              <span className="history-stat-num passed">{stats.passed}</span>
              <span className="history-stat-label">通过次数</span>
            </div>
            <div className="history-stat">
              <span className="history-stat-num">{stats.passRate}%</span>
              <span className="history-stat-label">通过率</span>
            </div>
            <div className="history-stat">
              <span className="history-stat-num">{stats.avg}</span>
              <span className="history-stat-label">平均分</span>
            </div>
            <div className="history-stat">
              <span className="history-stat-num best">{stats.best}</span>
              <span className="history-stat-label">最高分</span>
            </div>
          </div>

          {/* 成绩趋势条形图 */}
          {trend.length > 1 && (
            <div className="history-trend">
              <h4 className="history-trend-title">
                <Icon name="trending" size={14} />
                最近 {trend.length} 次成绩趋势
              </h4>
              <div className="history-trend-chart" aria-hidden="true">
                {trend.map((r) => {
                  // 条形高度按得分百分比映射，最低 10% 保证可见
                  const heightPct = Math.max(10, Math.min(100, (r.score / r.fullScore) * 100));
                  const isPass = r.passed;
                  return (
                    <div key={r.id} className="trend-bar-wrap" title={`${formatTimestamp(r.timestamp)}：${r.score}分`}>
                      <div className="trend-bar-track">
                        <div
                          className={`trend-bar ${isPass ? 'passed' : 'failed'}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="trend-bar-score">{r.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 记录列表 */}
          <div className="history-list">
            <div className="history-list-head">
              <h4 className="history-list-title">考试记录（{filteredRecords.length} 条）</h4>
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                onClick={handleClearAll}
              >
                <Icon name="close" size={14} />
                清空全部
              </button>
            </div>

            {filteredRecords.length === 0 ? (
              <p className="history-empty">所选科目暂无考试记录</p>
            ) : (
              <ul className="history-items">
                {filteredRecords.map((r) => (
                  <li key={r.id} className={`history-item ${r.passed ? 'passed' : 'failed'}`}>
                    <div className="history-item-main">
                      <div className="history-item-head">
                        <span className="history-item-subject">
                          {r.subject === 'ke1' ? '科目一' : '科目四'}
                        </span>
                        <span className={`history-item-badge ${r.passed ? 'passed' : 'failed'}`}>
                          {r.passed ? '通过' : '未通过'}
                        </span>
                      </div>
                      <div className="history-item-score">
                        <span className="num">{r.score}</span>
                        <span className="sep">/</span>
                        <span className="full">{r.fullScore}</span>
                        <span className="unit">分</span>
                      </div>
                      <div className="history-item-meta">
                        <span className="meta-item">答对 {r.correct}</span>
                        <span className="meta-sep">·</span>
                        <span className="meta-item wrong">答错 {r.wrong}</span>
                        <span className="meta-sep">·</span>
                        <span className="meta-item">未答 {r.unanswered}</span>
                        <span className="meta-sep">·</span>
                        <span className="meta-item">用时 {formatDuration(r.usedTime)}</span>
                        {r.wrongIds.length > 0 && (
                          <>
                            <span className="meta-sep">·</span>
                            <span className="meta-item wrong">错题 {r.wrongIds.length}</span>
                          </>
                        )}
                      </div>
                      <div className="history-item-time">{formatTimestamp(r.timestamp)}</div>
                    </div>
                    <button
                      type="button"
                      className="history-item-del"
                      onClick={() => handleRemove(r)}
                      aria-label="删除此记录"
                      title="删除此记录"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 错题 ID 索引（用于回顾，但不在此处展开题干） */}
          {filteredRecords.length > 0 && (
            <p className="history-hint">
              <Icon name="info-circle" size={12} />
              错题已自动收入错题本，可在开始页或结果页查看完整解析
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
