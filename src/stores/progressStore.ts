/**
 * 学习进度状态管理
 * - 答题记录（qid → {selected, correct, time}）
 * - 收藏夹（qid → 时间戳）
 * - 全局统计（已答/答对/正确率）
 * - 持久化至 localStorage
 */
import { create } from 'zustand';
import type { AnswerRecord, ProgressStats } from '@/types';
import { Store, STORAGE_KEYS } from '@/services/storage';

/** 答题记录映射：qid → AnswerRecord */
type AnswerMap = Record<number, AnswerRecord>;
/** 收藏映射：qid → 收藏时间戳 */
type BookmarkMap = Record<number, number>;

interface ProgressState {
  /** 答题记录 */
  answered: AnswerMap;
  /** 收藏题目ID集合 */
  bookmarks: BookmarkMap;
  /** 总题数（首次加载后注入） */
  total: number;
  /** 设置题库总数 */
  setTotal: (total: number) => void;
  /** 记录一次作答 */
  recordAnswer: (qid: number, selected: number, correct: boolean) => void;
  /** 切换收藏 */
  toggleBookmark: (qid: number) => void;
  /** 判断是否已收藏 */
  isBookmarked: (qid: number) => boolean;
  /** 获取指定题目的答题记录 */
  getRecord: (qid: number) => AnswerRecord | undefined;
  /** 清空所有答题记录 */
  clearAnswered: () => void;
  /** 清空收藏 */
  clearBookmarks: () => void;
  /** 计算统计指标 */
  getStats: () => ProgressStats;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  answered: Store.get<AnswerMap>(STORAGE_KEYS.answered, {}),
  bookmarks: Store.get<BookmarkMap>(STORAGE_KEYS.bookmarks, {}),
  // 题库总数：初始为 0，由 App.tsx 加载题库后通过 setTotal 动态注入
  total: 0,

  setTotal: (total) => set({ total }),

  recordAnswer: (qid, selected, correct) => {
    const record: AnswerRecord = { selected, correct, time: Date.now() };
    const next = { ...get().answered, [qid]: record };
    Store.set(STORAGE_KEYS.answered, next);
    set({ answered: next });
  },

  toggleBookmark: (qid) => {
    const cur = get().bookmarks;
    const next = { ...cur };
    if (next[qid]) {
      delete next[qid];
    } else {
      next[qid] = Date.now();
    }
    Store.set(STORAGE_KEYS.bookmarks, next);
    set({ bookmarks: next });
  },

  isBookmarked: (qid) => Boolean(get().bookmarks[qid]),

  getRecord: (qid) => get().answered[qid],

  clearAnswered: () => {
    Store.remove(STORAGE_KEYS.answered);
    set({ answered: {} });
  },

  clearBookmarks: () => {
    Store.remove(STORAGE_KEYS.bookmarks);
    set({ bookmarks: {} });
  },

  getStats: () => {
    const { answered, total } = get();
    const answeredList = Object.values(answered);
    const answeredCount = answeredList.length;
    const correctCount = answeredList.filter((r) => r.correct).length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    return { answered: answeredCount, correct: correctCount, accuracy, total, progress };
  }
}));
