/**
 * 练习视图状态管理
 * - 当前分类（all / 大分类key / 小分类key）
 * - 当前题目列表（按分类筛选后）
 * - 当前题目索引
 * - 搜索关键字
 * - 乱序开关
 * - 仅错题模式
 * - 仅收藏模式
 */
import { create } from 'zustand';
import type { Question } from '@/types';
import { Store, STORAGE_KEYS } from '@/services/storage';
import { shuffle } from '@/utils';
import { CATEGORY_GROUPS, isGroupKey } from '@/data/categoryGroups';

interface PracticeState {
  /** 当前分类 key */
  currentCat: string;
  /** 当前题目列表（已筛选） */
  list: Question[];
  /** 当前题目索引 */
  index: number;
  /** 搜索关键字 */
  search: string;
  /** 是否乱序 */
  shuffled: boolean;
  /** 仅错题模式 */
  onlyWrong: boolean;
  /** 仅收藏模式 */
  onlyBookmark: boolean;
  /** 是否已显示解析 */
  analysisVisible: boolean;
  /** 全量题库引用（由视图层注入） */
  allQuestions: Question[];
  /** 错题 ID 集合引用（由视图层注入） */
  wrongIds: Set<number>;
  /** 收藏 ID 集合引用（由视图层注入） */
  bookmarkIds: Set<number>;
  /** 注入数据源并重新筛选 */
  setDataSource: (allQuestions: Question[], wrongIds: Set<number>, bookmarkIds: Set<number>) => void;
  /** 设置分类并筛选 */
  setCategory: (cat: string, allQuestions: Question[], wrongIds: Set<number>, bookmarkIds: Set<number>) => void;
  /** 设置搜索 */
  setSearch: (q: string, allQuestions: Question[]) => void;
  /** 切换乱序 */
  toggleShuffle: () => void;
  /** 切换仅错题 */
  toggleOnlyWrong: (allQuestions: Question[], wrongIds: Set<number>) => void;
  /** 切换仅收藏 */
  toggleOnlyBookmark: (allQuestions: Question[], bookmarkIds: Set<number>) => void;
  /** 基于当前筛选条件重算列表 */
  reapplyFilters: () => void;
  /** 跳到指定索引 */
  setIndex: (i: number) => void;
  /** 下一题 */
  next: () => void;
  /** 上一题 */
  prev: () => void;
  /** 跳到题目ID */
  jumpToId: (qid: number) => void;
  /** 切换解析显示 */
  toggleAnalysis: (visible?: boolean) => void;
  /** 持久化进度（分类+索引） */
  persist: () => void;
  /** 恢复进度 */
  restore: () => { cat: string; index: number } | null;
}

/** 过滤器：根据当前条件筛选题目 */
function filterQuestions(
  all: Question[],
  cat: string,
  search: string,
  onlyWrong: boolean,
  onlyBookmark: boolean,
  wrongIds: Set<number>,
  bookmarkIds: Set<number>
): Question[] {
  let result = all;
  // 分类筛选
  if (cat !== 'all') {
    // 大分类（group key）：聚合其所有子分类，避免大分类入口在练习中返回空列表
    if (isGroupKey(cat)) {
      const subCats = new Set<string>(CATEGORY_GROUPS[cat].cats);
      result = result.filter((q) => subCats.has(q.category) || q.tags.some((t) => subCats.has(t)));
    } else if (cat === 'image') {
      // 图片题大分类：dynamic 匹配所有 is_image_question=true 的题目
      result = result.filter((q) => q.is_image_question);
    } else {
      result = result.filter((q) => q.category === cat || q.tags.includes(cat));
    }
  }
  // 搜索筛选
  if (search.trim()) {
    const kw = search.trim().toLowerCase();
    result = result.filter(
      (q) => q.question.toLowerCase().includes(kw) || q.keywords.some((k) => k.toLowerCase().includes(kw))
    );
  }
  // 仅错题
  if (onlyWrong) {
    result = result.filter((q) => wrongIds.has(q.id));
  }
  // 仅收藏
  if (onlyBookmark) {
    result = result.filter((q) => bookmarkIds.has(q.id));
  }
  return result;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  currentCat: 'all',
  list: [],
  index: 0,
  search: '',
  shuffled: false,
  onlyWrong: false,
  onlyBookmark: false,
  analysisVisible: false,
  allQuestions: [],
  wrongIds: new Set<number>(),
  bookmarkIds: new Set<number>(),

  setDataSource: (allQuestions, wrongIds, bookmarkIds) => {
    set({ allQuestions, wrongIds, bookmarkIds });
    get().reapplyFilters();
  },

  setCategory: (cat, allQuestions, wrongIds, bookmarkIds) => {
    set({ allQuestions, wrongIds, bookmarkIds, currentCat: cat, search: '', onlyWrong: false, onlyBookmark: false });
    const list = filterQuestions(allQuestions, cat, '', false, false, wrongIds, bookmarkIds);
    const finalList = get().shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
    get().persist();
  },

  setSearch: (q, allQuestions) => {
    const state = get();
    set({ allQuestions, search: q });
    const list = filterQuestions(allQuestions, state.currentCat, q, state.onlyWrong, state.onlyBookmark, state.wrongIds, state.bookmarkIds);
    set({ list, index: 0, analysisVisible: false });
  },

  toggleShuffle: () => {
    const state = get();
    if (state.shuffled) {
      // 关闭乱序：基于当前筛选条件重算有序列表
      const list = filterQuestions(state.allQuestions, state.currentCat, state.search, state.onlyWrong, state.onlyBookmark, state.wrongIds, state.bookmarkIds);
      set({ shuffled: false, list, index: 0 });
    } else {
      // 开启乱序：重置 index 到 0，避免题目突变导致体验割裂
      set({ shuffled: true, list: shuffle(state.list), index: 0 });
    }
  },

  toggleOnlyWrong: (allQuestions, wrongIds) => {
    const state = get();
    const nextOnlyWrong = !state.onlyWrong;
    set({ allQuestions, wrongIds, onlyWrong: nextOnlyWrong });
    const list = filterQuestions(allQuestions, state.currentCat, state.search, nextOnlyWrong, state.onlyBookmark, wrongIds, state.bookmarkIds);
    const finalList = state.shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
  },

  toggleOnlyBookmark: (allQuestions, bookmarkIds) => {
    const state = get();
    const nextOnlyBookmark = !state.onlyBookmark;
    set({ allQuestions, bookmarkIds, onlyBookmark: nextOnlyBookmark });
    const list = filterQuestions(allQuestions, state.currentCat, state.search, state.onlyWrong, nextOnlyBookmark, state.wrongIds, bookmarkIds);
    const finalList = state.shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
  },

  reapplyFilters: () => {
    const state = get();
    const list = filterQuestions(state.allQuestions, state.currentCat, state.search, state.onlyWrong, state.onlyBookmark, state.wrongIds, state.bookmarkIds);
    const finalList = state.shuffled ? shuffle(list) : list;
    const newIndex = Math.min(state.index, Math.max(0, finalList.length - 1));
    set({ list: finalList, index: newIndex });
  },

  setIndex: (i) => {
    const len = get().list.length;
    if (i >= 0 && i < len) {
      set({ index: i, analysisVisible: false });
      get().persist();
    }
  },

  next: () => {
    const { index, list } = get();
    if (index < list.length - 1) {
      set({ index: index + 1, analysisVisible: false });
      get().persist();
    }
  },

  prev: () => {
    const { index } = get();
    if (index > 0) {
      set({ index: index - 1, analysisVisible: false });
      get().persist();
    }
  },

  jumpToId: (qid) => {
    const idx = get().list.findIndex((q) => q.id === qid);
    if (idx >= 0) {
      set({ index: idx, analysisVisible: false });
      get().persist();
    }
  },

  toggleAnalysis: (visible) => {
    set((s) => ({ analysisVisible: visible ?? !s.analysisVisible }));
  },

  persist: () => {
    const { currentCat, index } = get();
    Store.set(STORAGE_KEYS.practiceProgress, { cat: currentCat, index });
  },

  restore: () => {
    const saved = Store.get<{ cat: string; index: number } | null>(STORAGE_KEYS.practiceProgress, null);
    if (saved) {
      set({ currentCat: saved.cat, index: saved.index });
    }
    return saved;
  }
}));
