/**
 * 题库数据加载器
 * 负责按需动态加载题库 JSON 并对题目做归一化处理
 * - 判断题：补齐 ["正确","错误"] 选项、布尔答案转数字索引
 * - 单选题：保证 options 非空
 * - 多选题：保证 answer 为数组、options 非空
 */
import type { Question } from '@/types';

/** 题库数据缓存（避免重复加载） */
let questionsCache: Question[] | null = null;

/**
 * 判断题选项归一化文本
 * 原始数据中判断题 options 为空数组、answer 为布尔值，
 * 这里统一补齐为 ["正确", "错误"]，并将布尔答案转换为 0/1 索引，
 * 保证下游组件（QuestionCard / examStore）按统一的数组+索引结构处理。
 */
const JUDGE_OPTIONS = ['正确', '错误'];

/**
 * 原始题目类型（questions.json 中的实际结构）
 * - 判断题 answer 可能为 boolean
 * - 多选题 answer 为数字数组（number[]）
 * - options 可能为空数组
 * 与 Question 类型的区别在此显式声明，
 * 避免类型系统无法捕获数据层与消费层的不一致
 */
interface RawQuestion extends Omit<Question, 'answer' | 'options'> {
  answer: number | boolean | number[];
  options?: string[];
}

/**
 * 归一化单道题目
 *
 * 输入参数：
 * @param raw - 原始题目（可能含布尔 answer / 空 options / 数组 answer）
 *
 * 返回值：
 * @returns 与 Question 类型完全一致的题目
 *
 * 核心执行流程：
 * 1. 多选题：确保 answer 为 number[]，options 非空
 * 2. 判断题：补齐选项、布尔答案转数字索引
 * 3. 单选题：保证 options 非空，避免数据缺失导致下游 options.map 崩溃
 */
function normalizeQuestion(raw: RawQuestion): Question {
  // 多选题：确保 answer 为 number[]，options 非空
  if (raw.type === 'multi') {
    const options =
      Array.isArray(raw.options) && raw.options.length >= 2
        ? raw.options
        : [];
    const answer: number[] = Array.isArray(raw.answer)
      ? raw.answer.map((n) => Number(n))
      : typeof raw.answer === 'number'
        ? [Number(raw.answer)]
        : [];
    return { ...raw, options, answer } as Question;
  }
  // 判断题：补齐选项、布尔答案转数字索引
  if (raw.type === 'judge') {
    const options =
      Array.isArray(raw.options) && raw.options.length >= 2
        ? raw.options
        : JUDGE_OPTIONS.slice();
    let answer: number;
    if (typeof raw.answer === 'boolean') {
      answer = raw.answer ? 0 : 1;
    } else {
      answer = Number(raw.answer);
    }
    return { ...raw, options, answer } as Question;
  }
  // 单选题：保证 options 非空，避免数据缺失导致下游 options.map 崩溃
  const options = Array.isArray(raw.options) ? raw.options : [];
  const answer = typeof raw.answer === 'number' ? raw.answer : Number(raw.answer);
  return { ...raw, options, answer } as Question;
}

/**
 * 按需加载完整题库
 * 首次调用动态 import questions.json，后续返回缓存
 * 加载后对判断题做归一化：补齐 ["正确","错误"] 选项、布尔答案转数字索引
 *
 * 返回值：
 * @returns Question[] 完整题目列表（判断题 + 单选题 + 多选题，含科目一与科目四）
 */
export async function loadQuestions(): Promise<Question[]> {
  if (questionsCache) return questionsCache;
  try {
    const module = await import('@/data/questions.json');
    const rawList = module.default as RawQuestion[];
    questionsCache = rawList.map(normalizeQuestion);
    return questionsCache;
  } catch (err) {
    // 先记录原始错误便于开发者排查，再抛出友好提示供上层 UI 直接展示
    console.error('[questionsLoader] 题库加载失败', err);
    throw new Error('题库加载失败，请稍后重试');
  }
}
