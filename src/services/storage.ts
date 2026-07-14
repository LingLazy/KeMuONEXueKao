/**
 * 存储服务：封装 localStorage 与 sessionStorage
 * - 统一异常处理，避免隐私模式或配额超限导致崩溃
 * - 支持泛型类型推断
 */

/** 安全读取 localStorage（JSON 解析） */
function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    // DEV 模式下输出警告，便于开发调试；生产环境静默降级
    if (import.meta.env.DEV) {
      console.warn('[storage] 读取本地存储失败', err);
    }
    return fallback;
  }
}

/** 安全写入 localStorage（JSON 序列化） */
function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // 配额超限或隐私模式，DEV 模式下输出警告便于排查
    if (import.meta.env.DEV) {
      console.warn('[storage] 写入本地存储失败', err);
    }
  }
}

/** 安全移除 localStorage 项 */
function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    // DEV 模式下输出警告，便于开发调试
    if (import.meta.env.DEV) {
      console.warn('[storage] 移除本地存储项失败', err);
    }
  }
}

/** 安全读取 sessionStorage（JSON 解析） */
function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    // DEV 模式下输出警告，便于开发调试；生产环境静默降级
    if (import.meta.env.DEV) {
      console.warn('[storage] 读取会话存储失败', err);
    }
    return fallback;
  }
}

/** 安全写入 sessionStorage（JSON 序列化） */
function writeSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // DEV 模式下输出警告，便于开发调试
    if (import.meta.env.DEV) {
      console.warn('[storage] 写入会话存储失败', err);
    }
  }
}

/** 安全移除 sessionStorage 项 */
function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    // DEV 模式下输出警告，便于开发调试
    if (import.meta.env.DEV) {
      console.warn('[storage] 移除会话存储项失败', err);
    }
  }
}

/** localStorage 持久化存储（适用于答题进度、收藏、主题等） */
export const Store = {
  get: readLocal,
  set: writeLocal,
  remove: removeLocal
};

/** sessionStorage 会话存储（适用于考试中途状态保持） */
export const SessionStore = {
  get: readSession,
  set: writeSession,
  remove: removeSession
};

/** 存储 key 常量集中管理，避免散落 */
export const STORAGE_KEYS = {
  theme: 'kemu1_theme',
  answered: 'kemu1_answered',
  bookmarks: 'kemu1_bookmarks',
  examState: 'kemu1_exam_state',
  practiceProgress: 'kemu1_practice_progress',
  lastView: 'kemu1_last_view',
  stats: 'kemu1_stats',
  // 考试历史记录：每次交卷后写入一条快照，用于成绩趋势与回顾
  examHistory: 'kemu1_exam_history',
  // 错题本：累计所有考试中的错题 ID 与错误次数，用于针对性复习
  wrongBook: 'kemu1_wrong_book'
} as const;
