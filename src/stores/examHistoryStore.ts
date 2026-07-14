/**
 * 考试历史记录状态管理
 * - 每次交卷后写入一条 ExamHistoryRecord 快照
 * - 支持清空全部历史与单条删除
 * - 计算统计指标：次数 / 通过率 / 平均分 / 最高分 / 最近趋势
 * - 持久化至 localStorage（key: kemu1_exam_history）
 * - 限制最大保留条数（200 条），超出按时间倒序剔除最旧记录
 */
import { create } from 'zustand';
import type { ExamHistoryRecord, ExamHistoryStats, ExamResult, Subject } from '@/types';
import { Store, STORAGE_KEYS } from '@/services/storage';
import { EXAM_CONFIG } from '@/constants/exam';

/** 历史记录最大保留条数，超出时剔除最旧记录，避免 localStorage 无限增长 */
const MAX_HISTORY_COUNT = 200;
/** 趋势展示的最近记录条数 */
const RECENT_TREND_COUNT = 10;

interface ExamHistoryState {
  /** 历史记录列表（按时间倒序，最新在前） */
  records: ExamHistoryRecord[];
  /** 自增 ID 计数器（持久化） */
  seq: number;
  /** 写入一条考试记录 */
  addRecord: (result: ExamResult, subject: Subject, total: number) => ExamHistoryRecord;
  /** 删除指定 ID 的记录 */
  removeRecord: (id: number) => void;
  /** 清空全部历史记录 */
  clearAll: () => void;
  /** 计算统计指标 */
  getStats: () => ExamHistoryStats;
}

/**
 * 从 localStorage 读取并校验历史记录
 * - 校验失败时回退为空数组，避免脏数据导致崩溃
 */
function loadRecords(): { records: ExamHistoryRecord[]; seq: number } {
  const data = Store.get<ExamHistoryRecord[] | null>(STORAGE_KEYS.examHistory, null);
  if (!Array.isArray(data)) return { records: [], seq: 0 };
  // 过滤掉结构非法的记录，保证数据完整性
  const valid = data.filter(
    (r): r is ExamHistoryRecord =>
      r != null &&
      typeof r.id === 'number' &&
      typeof r.score === 'number' &&
      typeof r.timestamp === 'number'
  );
  // 计算下一个自增 ID：取现有最大 ID + 1
  const maxId = valid.reduce((m, r) => Math.max(m, r.id), 0);
  return { records: valid, seq: maxId };
}

const initial = loadRecords();

export const useExamHistoryStore = create<ExamHistoryState>((set, get) => ({
  records: initial.records,
  seq: initial.seq,

  addRecord: (result, subject, total) => {
    const config = EXAM_CONFIG[subject];
    const id = get().seq + 1;
    const record: ExamHistoryRecord = {
      id,
      subject,
      score: result.score,
      fullScore: config.count * config.pointsPerQuestion,
      passScore: config.passScore,
      passed: result.passed,
      correct: result.correct,
      wrong: result.wrong,
      unanswered: result.unanswered,
      total,
      usedTime: result.usedTime,
      wrongIds: [...result.wrongIds],
      timestamp: Date.now()
    };
    // 新记录插入头部（最新在前），超过上限剔除最旧记录
    const next = [record, ...get().records];
    if (next.length > MAX_HISTORY_COUNT) {
      next.length = MAX_HISTORY_COUNT;
    }
    Store.set(STORAGE_KEYS.examHistory, next);
    set({ records: next, seq: id });
    return record;
  },

  removeRecord: (id) => {
    const next = get().records.filter((r) => r.id !== id);
    Store.set(STORAGE_KEYS.examHistory, next);
    set({ records: next });
  },

  clearAll: () => {
    Store.remove(STORAGE_KEYS.examHistory);
    set({ records: [], seq: 0 });
  },

  getStats: () => {
    const records = get().records;
    if (records.length === 0) {
      return {
        count: 0,
        passedCount: 0,
        passRate: 0,
        avgScore: 0,
        bestScore: 0,
        worstScore: 0,
        latest: null,
        recent: []
      };
    }
    const count = records.length;
    const passedCount = records.filter((r) => r.passed).length;
    const scores = records.map((r) => r.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      count,
      passedCount,
      passRate: Math.round((passedCount / count) * 100),
      avgScore: Math.round((sum / count) * 10) / 10,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      // records 已按时间倒序，latest 即首条
      latest: records[0] ?? null,
      recent: records.slice(0, RECENT_TREND_COUNT)
    };
  }
}));
