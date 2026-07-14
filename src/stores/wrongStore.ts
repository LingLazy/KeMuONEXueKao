/**
 * 错题本状态管理
 * - 累计记录每次考试中的错题（按 qid 去重，错误次数累加）
 * - 记录每道错题的最近错误时间、最近用户答案、所属科目
 * - 支持单题删除、清空、批量按科目删除
 * - 持久化至 localStorage（key: kemu1_wrong_book）
 * - 限制最大容量（2000 题），超出按最近错误时间剔除最旧条目
 */
import { create } from 'zustand';
import type { WrongBookItem, WrongBookStats, Subject } from '@/types';
import { Store, STORAGE_KEYS } from '@/services/storage';

/** 错题本最大容量，超出时按最近错误时间剔除最旧条目 */
const MAX_WRONG_BOOK_COUNT = 2000;
/** "最近"统计窗口（毫秒）：7 天 */
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** 错题本映射：qid → WrongBookItem（便于 O(1) 查询与更新） */
type WrongMap = Record<number, WrongBookItem>;

interface WrongBookState {
  /** 错题映射（qid → WrongBookItem） */
  items: WrongMap;
  /** 批量写入错题（同一题错误次数累加，更新最近错误时间与答案） */
  addWrong: (qid: number, selected: number | number[], subject: Subject) => void;
  /** 删除指定题目（用户已掌握） */
  removeWrong: (qid: number) => void;
  /** 清空全部错题 */
  clearAll: () => void;
  /** 按科目清空错题 */
  clearBySubject: (subject: Subject) => void;
  /** 判断是否为错题 */
  isWrong: (qid: number) => boolean;
  /** 获取所有错题 ID 数组（按最近错误时间倒序） */
  getWrongIds: () => number[];
  /** 计算统计指标 */
  getStats: () => WrongBookStats;
}

/**
 * 从 localStorage 读取错题本
 * - 校验失败时回退为空对象，避免脏数据导致崩溃
 */
function loadItems(): WrongMap {
  const data = Store.get<WrongMap | null>(STORAGE_KEYS.wrongBook, null);
  if (!data || typeof data !== 'object') return {};
  // 过滤掉结构非法的条目
  const valid: WrongMap = {};
  for (const [key, item] of Object.entries(data)) {
    const qid = Number(key);
    if (!Number.isFinite(qid) || !item || typeof item !== 'object') continue;
    if (typeof item.qid !== 'number' || typeof item.wrongCount !== 'number') continue;
    valid[qid] = item;
  }
  return valid;
}

const initialItems = loadItems();

export const useWrongStore = create<WrongBookState>((set, get) => ({
  items: initialItems,

  addWrong: (qid, selected, subject) => {
    const cur = get().items;
    const existing = cur[qid];
    const now = Date.now();
    const item: WrongBookItem = existing
      ? {
          ...existing,
          wrongCount: existing.wrongCount + 1,
          lastWrongTime: now,
          lastSelected: selected,
          subject
        }
      : {
          qid,
          wrongCount: 1,
          lastWrongTime: now,
          firstWrongTime: now,
          lastSelected: selected,
          subject
        };
    const next = { ...cur, [qid]: item };
    // 超出容量时剔除最旧条目（按 lastWrongTime 升序）
    const keys = Object.keys(next);
    if (keys.length > MAX_WRONG_BOOK_COUNT) {
      const sorted = keys.sort((a, b) => {
        const ta = next[Number(a)]?.lastWrongTime ?? 0;
        const tb = next[Number(b)]?.lastWrongTime ?? 0;
        return ta - tb;
      });
      const removeCount = keys.length - MAX_WRONG_BOOK_COUNT;
      for (let i = 0; i < removeCount; i++) {
        delete next[Number(sorted[i])];
      }
    }
    Store.set(STORAGE_KEYS.wrongBook, next);
    set({ items: next });
  },

  removeWrong: (qid) => {
    const cur = get().items;
    if (!cur[qid]) return;
    const next = { ...cur };
    delete next[qid];
    Store.set(STORAGE_KEYS.wrongBook, next);
    set({ items: next });
  },

  clearAll: () => {
    Store.remove(STORAGE_KEYS.wrongBook);
    set({ items: {} });
  },

  clearBySubject: (subject) => {
    const cur = get().items;
    const next: WrongMap = {};
    for (const [key, item] of Object.entries(cur)) {
      if (item.subject !== subject) {
        next[Number(key)] = item;
      }
    }
    Store.set(STORAGE_KEYS.wrongBook, next);
    set({ items: next });
  },

  isWrong: (qid) => Boolean(get().items[qid]),

  getWrongIds: () => {
    const items = Object.values(get().items);
    // 按最近错误时间倒序，最新错误的题目在前
    return items
      .sort((a, b) => b.lastWrongTime - a.lastWrongTime)
      .map((item) => item.qid);
  },

  getStats: () => {
    const items = Object.values(get().items);
    const now = Date.now();
    const recentCount = items.filter(
      (item) => now - item.lastWrongTime < RECENT_WINDOW_MS
    ).length;
    const totalWrong = items.reduce((sum, item) => sum + item.wrongCount, 0);
    return {
      count: items.length,
      totalWrong,
      recentCount
    };
  }
}));
