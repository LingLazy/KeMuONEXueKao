/**
 * 练习视图状态管理
 * - 当前分类（all / 大分类key / 小分类key）
 * - 当前题目列表（按分类筛选后）
 * - 当前题目索引
 * - 搜索关键字
 * - 乱序开关
 * - 仅错题模式
 * - 仅收藏模式
 *
 * 数据来源：通过 init() 在视图挂载时从 dataLoader 与 progressStore 自主加载，
 * 不再由视图层注入 allQuestions/wrongIds/bookmarkIds。
 */
import { create } from 'zustand';
import type { Question, Subject } from '@/types';
import { Store, STORAGE_KEYS } from '@/services/storage';
import { shuffle } from '@/utils';
import { CATEGORY_GROUPS, isGroupKey } from '@/data/categoryGroups';
import { loadQuestions } from '@/services/dataLoader';
import { useProgressStore } from '@/stores/progressStore';

/** 科目筛选类型：all 表示不按科目筛选 */
type SubjectFilter = Subject | 'all';

/**
 * 筛选所需的 state 快照
 * 将 allQuestions/wrongIds/bookmarkIds 与筛选条件聚合为单一对象，
 * 供 filterQuestions 纯函数消费，避免将数据作为参数逐个注入。
 */
interface FilterSnapshot {
  /** 全量题库（来自 init 加载） */
  allQuestions: Question[];
  /** 当前分类 key */
  currentCat: string;
  /** 搜索关键字 */
  search: string;
  /** 仅错题开关 */
  onlyWrong: boolean;
  /** 仅收藏开关 */
  onlyBookmark: boolean;
  /** 错题 ID 集合（来自 progressStore.answered 中 correct 为 false 的记录） */
  wrongIds: Set<number>;
  /** 收藏 ID 集合（来自 progressStore.bookmarks 的键） */
  bookmarkIds: Set<number>;
  /** 科目筛选 */
  subject: SubjectFilter;
}

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
  /** 科目筛选 */
  subject: SubjectFilter;
  /** 是否已显示解析 */
  analysisVisible: boolean;
  /** 全量题库（由 init 内部加载，不再由视图层注入） */
  allQuestions: Question[];
  /** 错题 ID 集合（由 init 内部从 progressStore 读取） */
  wrongIds: Set<number>;
  /** 收藏 ID 集合（由 init 内部从 progressStore 读取） */
  bookmarkIds: Set<number>;
  /** 是否已完成初始化（防重入标志） */
  initialized: boolean;
  /**
   * 初始化练习数据
   * 从 dataLoader 加载题目，从 progressStore 读取错题与收藏，
   * 仅需在视图挂载时调用一次；已初始化时直接返回（防重入）。
   * 失败时抛出错误，由调用方处理错误 UI。
   */
  init: () => Promise<void>;
  /** 设置分类并筛选 */
  setCategory: (cat: string) => void;
  /** 设置科目筛选 */
  setSubject: (subject: SubjectFilter) => void;
  /** 设置搜索 */
  setSearch: (q: string) => void;
  /** 切换乱序 */
  toggleShuffle: () => void;
  /** 切换仅错题 */
  toggleOnlyWrong: () => void;
  /** 切换仅收藏 */
  toggleOnlyBookmark: () => void;
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
  /** 持久化进度（分类+索引+科目） */
  persist: () => void;
  /** 恢复进度 */
  restore: () => { cat: string; index: number; subject: SubjectFilter } | null;
}

/**
 * 过滤器：基于 state 快照筛选题目
 *
 * 输入参数：
 * @param snapshot - 包含全量题库、筛选条件、错题/收藏集合的 state 快照
 *
 * 返回值：
 * @returns 按科目、分类、搜索、错题、收藏条件筛选后的题目列表
 *
 * 核心执行流程：
 * 1. 科目筛选（subject !== 'all' 时按 q.subject 过滤）
 * 2. 分类筛选（大分类聚合子分类，小分类匹配 category 或 tags）
 * 3. 搜索筛选（匹配题干或关键词）
 * 4. 仅错题筛选（保留 wrongIds 中的题目）
 * 5. 仅收藏筛选（保留 bookmarkIds 中的题目）
 */
function filterQuestions(snapshot: FilterSnapshot): Question[] {
  const { allQuestions: all, currentCat: cat, search, onlyWrong, onlyBookmark, wrongIds, bookmarkIds, subject } = snapshot;
  let result = all;
  // 科目筛选
  if (subject !== 'all') {
    result = result.filter((q) => q.subject === subject);
  }
  // 分类筛选
  if (cat !== 'all') {
    // 大分类（group key）：聚合其所有子分类，避免大分类入口在练习中返回空列表
    if (isGroupKey(cat)) {
      const subCats = new Set<string>(CATEGORY_GROUPS[cat].cats);
      result = result.filter((q) => subCats.has(q.category) || q.tags.some((t) => subCats.has(t)));
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
  subject: 'all',
  analysisVisible: false,
  allQuestions: [],
  wrongIds: new Set<number>(),
  bookmarkIds: new Set<number>(),
  initialized: false,

  /**
   * 初始化练习数据
   * 从 dataLoader 加载全量题目，从 progressStore 读取错题与收藏集合，
   * 写入 state 后标记 initialized，并基于当前筛选条件重算列表。
   * 已初始化时直接返回，避免重复加载（防重入）。
   */
  init: async () => {
    // 防重入：已初始化则跳过
    if (get().initialized) return;
    try {
      // 加载全量题库（loadQuestions 内部带缓存，重复调用代价低）
      const allQuestions = await loadQuestions();
      // 从 progressStore 读取答题记录与收藏
      const { answered, bookmarks } = useProgressStore.getState();
      // 提取错题 ID 集合（correct 为 false 的记录）
      const wrongIds = new Set<number>();
      Object.entries(answered).forEach(([id, rec]) => {
        if (!rec.correct) wrongIds.add(Number(id));
      });
      // 提取收藏 ID 集合（bookmarks 键为题目 ID）
      const bookmarkIds = new Set<number>(Object.keys(bookmarks).map((k) => Number(k)));
      // 写入 state 并标记初始化完成
      set({ allQuestions, wrongIds, bookmarkIds, initialized: true });
      // 基于当前筛选条件重算题目列表
      get().reapplyFilters();
    } catch (err) {
      // 初始化失败：保持未初始化状态，向上抛出由视图层展示错误
      set({ initialized: false });
      throw new Error(`练习数据初始化失败：${err instanceof Error ? err.message : String(err)}`);
    }
  },

  /**
   * 设置分类并重新筛选
   * 切换分类时重置搜索、错题、收藏开关，并回到第一题。
   */
  setCategory: (cat) => {
    set({ currentCat: cat, search: '', onlyWrong: false, onlyBookmark: false });
    const list = filterQuestions(get());
    const finalList = get().shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
    get().persist();
  },

  /**
   * 设置科目筛选并重新筛选
   * 切换科目时回到第一题。
   */
  setSubject: (subject) => {
    set({ subject });
    const list = filterQuestions(get());
    const finalList = get().shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
    get().persist();
  },

  /**
   * 设置搜索关键字并重新筛选
   * 搜索时不重置乱序状态，回到第一题。
   */
  setSearch: (q) => {
    set({ search: q });
    const list = filterQuestions(get());
    set({ list, index: 0, analysisVisible: false });
  },

  /**
   * 切换乱序模式
   * 开启时打乱当前列表；关闭时基于筛选条件重算有序列表。
   * 切换后回到第一题，避免题目突变导致体验割裂。
   */
  toggleShuffle: () => {
    const state = get();
    if (state.shuffled) {
      // 关闭乱序：基于当前筛选条件重算有序列表
      const list = filterQuestions(state);
      set({ shuffled: false, list, index: 0 });
    } else {
      // 开启乱序：打乱当前列表
      set({ shuffled: true, list: shuffle(state.list), index: 0 });
    }
  },

  /**
   * 切换仅错题模式并重新筛选
   */
  toggleOnlyWrong: () => {
    const nextOnlyWrong = !get().onlyWrong;
    set({ onlyWrong: nextOnlyWrong });
    const list = filterQuestions(get());
    const finalList = get().shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
  },

  /**
   * 切换仅收藏模式并重新筛选
   */
  toggleOnlyBookmark: () => {
    const nextOnlyBookmark = !get().onlyBookmark;
    set({ onlyBookmark: nextOnlyBookmark });
    const list = filterQuestions(get());
    const finalList = get().shuffled ? shuffle(list) : list;
    set({ list: finalList, index: 0, analysisVisible: false });
  },

  /**
   * 基于当前筛选条件重算列表
   * 用于数据源更新后或筛选条件变化时同步列表，并修正索引越界。
   */
  reapplyFilters: () => {
    const state = get();
    const list = filterQuestions(state);
    const finalList = state.shuffled ? shuffle(list) : list;
    const newIndex = Math.min(state.index, Math.max(0, finalList.length - 1));
    set({ list: finalList, index: newIndex });
  },

  /**
   * 跳到指定索引
   * 越界时忽略，并持久化进度。
   */
  setIndex: (i) => {
    const len = get().list.length;
    if (i >= 0 && i < len) {
      set({ index: i, analysisVisible: false });
      get().persist();
    }
  },

  /**
   * 下一题
   * 到达末尾时忽略，并持久化进度。
   */
  next: () => {
    const { index, list } = get();
    if (index < list.length - 1) {
      set({ index: index + 1, analysisVisible: false });
      get().persist();
    }
  },

  /**
   * 上一题
   * 到达首题时忽略，并持久化进度。
   */
  prev: () => {
    const { index } = get();
    if (index > 0) {
      set({ index: index - 1, analysisVisible: false });
      get().persist();
    }
  },

  /**
   * 跳转到指定题目 ID
   * 在当前列表中查找并跳转，未找到时忽略，并持久化进度。
   */
  jumpToId: (qid) => {
    const idx = get().list.findIndex((q) => q.id === qid);
    if (idx >= 0) {
      set({ index: idx, analysisVisible: false });
      get().persist();
    }
  },

  /**
   * 切换解析显示
   * 不传参时切换当前状态，传参时按指定值设置。
   */
  toggleAnalysis: (visible) => {
    set((s) => ({ analysisVisible: visible ?? !s.analysisVisible }));
  },

  /**
   * 持久化当前进度（分类 + 索引 + 科目）
   * allQuestions/wrongIds/bookmarkIds 不持久化，每次 init 重新加载。
   */
  persist: () => {
    const { currentCat, index, subject } = get();
    Store.set(STORAGE_KEYS.practiceProgress, { cat: currentCat, index, subject });
  },

  /**
   * 恢复持久化的进度
   * 仅恢复分类、索引、科目，不恢复题库数据。
   */
  restore: () => {
    const saved = Store.get<{ cat: string; index: number; subject: SubjectFilter } | null>(STORAGE_KEYS.practiceProgress, null);
    if (saved) {
      set({ currentCat: saved.cat, index: saved.index, subject: saved.subject ?? 'all' });
    }
    return saved;
  }
}));
