/**
 * 学习进度统计 Hook
 * - 从 progressStore 读取原始数据（answered / bookmarks / total）
 * - 派生计算已答数、答对数、正确率、进度、收藏数
 * - 消除 HomeView / TopNav / CategoriesView 中重复的统计计算逻辑
 */
import { useProgressStore } from '@/stores/progressStore';
import { calcAccuracy, calcProgress } from '@/utils';

/** 进度统计返回值 */
interface ProgressStats {
  /** 已答题数 */
  answered: number;
  /** 答对数 */
  correct: number;
  /** 正确率（0-100） */
  accuracy: number;
  /** 总题数 */
  total: number;
  /** 进度百分比（0-100） */
  progress: number;
  /** 收藏数 */
  bookmarkCount: number;
}

/**
 * 学习进度统计 Hook
 * 从 progressStore 读取数据并计算已答数、正确率、进度等派生指标
 *
 * @returns 统计指标对象（answered / correct / accuracy / total / progress / bookmarkCount）
 *
 * 核心执行流程：
 * 1. 通过三个独立选择器读取 answered（对象引用）、bookmarks（对象引用）、total（基本类型）
 *    选择器仅返回原始引用或基本类型，避免返回新对象导致无限重渲染
 * 2. 由 answered 派生 answeredCount（键数）与 correctCount（correct 为 true 的记录数）
 * 3. 由 bookmarks 派生 bookmarkCount（键数）
 * 4. 使用 calcAccuracy / calcProgress 计算正确率与进度百分比
 */
export function useProgressStats(): ProgressStats {
  /** 答题记录映射（qid → AnswerRecord），引用稳定，仅答题时变更 */
  const answered = useProgressStore((s) => s.answered);
  /** 收藏映射（qid → 时间戳），引用稳定，仅收藏变更时变更 */
  const bookmarks = useProgressStore((s) => s.bookmarks);
  /** 题库总数，由 App 加载题库后注入 */
  const total = useProgressStore((s) => s.total);

  /** 已答题数：取 answered 映射的键数 */
  const answeredCount = Object.keys(answered).length;
  /** 答对数：累加 correct 为 true 的记录 */
  const correctCount = Object.values(answered).filter((r) => r.correct).length;
  /** 收藏数：取 bookmarks 映射的键数 */
  const bookmarkCount = Object.keys(bookmarks).length;

  return {
    answered: answeredCount,
    correct: correctCount,
    accuracy: calcAccuracy(correctCount, answeredCount),
    total,
    progress: calcProgress(answeredCount, total),
    bookmarkCount
  };
}
