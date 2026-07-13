/**
 * 数据加载服务：按需加载题库、口诀、分类数据
 * - 分类元数据：体积小，同步 import
 * - 题库与口诀：体积大，动态 import 实现代码分割
 * - 知识学习内容：fetch 加载 Markdown
 */
import type { Question, Mnemonic, Category } from '@/types';
import categoriesData from '@/data/categories.json';

/** 分类元数据（同步加载，体积小） */
export const CATEGORIES = categoriesData as Record<string, Category>;

/** 题库数据缓存（避免重复加载） */
let questionsCache: Question[] | null = null;
/** 口诀数据缓存 */
let mnemonicsCache: Mnemonic[] | null = null;
/** 知识学习 Markdown 缓存 */
let knowledgeCache: string | null = null;

/**
 * 判断题选项归一化文本
 * 原始数据中判断题 options 为空数组、answer 为布尔值，
 * 这里统一补齐为 ["正确", "错误"]，并将布尔答案转换为 0/1 索引，
 * 保证下游组件（QuestionCard / examStore）按统一的数组+索引结构处理。
 */
const JUDGE_OPTIONS = ['正确', '错误'];

/**
 * 归一化单道题目
 * - 判断题：补齐选项、布尔答案转数字索引
 * - 单选题：原样返回
 * 输入：原始题目（可能含布尔 answer / 空 options）
 * 返回：与 Question 类型完全一致的题目
 */
function normalizeQuestion(raw: Question): Question {
  if (raw.type !== 'judge') return raw;
  // 仅当 options 缺失或为空时补齐，避免覆盖已有数据
  const options =
    Array.isArray(raw.options) && raw.options.length >= 2
      ? raw.options
      : JUDGE_OPTIONS.slice();
  // 布尔答案转索引：true → 0（正确），false → 1（错误）
  // 已为数字时保留原值
  let answer: number;
  if (typeof raw.answer === 'boolean') {
    answer = raw.answer ? 0 : 1;
  } else {
    answer = Number(raw.answer);
  }
  return { ...raw, options, answer };
}

/**
 * 按需加载完整题库
 * 首次调用动态 import questions.json，后续返回缓存
 * 加载后对判断题做归一化：补齐 ["正确","错误"] 选项、布尔答案转数字索引
 * 返回：Question[] 1964道题目
 */
export async function loadQuestions(): Promise<Question[]> {
  if (questionsCache) return questionsCache;
  const module = await import('@/data/questions.json');
  const rawList = module.default as Question[];
  questionsCache = rawList.map(normalizeQuestion);
  return questionsCache;
}

/**
 * 按需加载完整口诀列表
 * 首次调用动态 import mnemonics.json，后续返回缓存
 * 返回：Mnemonic[] 119条口诀
 */
export async function loadMnemonics(): Promise<Mnemonic[]> {
  if (mnemonicsCache) return mnemonicsCache;
  const module = await import('@/data/mnemonics.json');
  mnemonicsCache = module.default as Mnemonic[];
  return mnemonicsCache;
}

/**
 * 加载知识学习 Markdown 内容
 * 通过 fetch 异步获取 docs/knowledge.md
 * 内置 10 秒超时，避免网络异常时长时间挂起
 */
export async function loadKnowledge(): Promise<string> {
  if (knowledgeCache) return knowledgeCache;
  const base = import.meta.env.BASE_URL;
  // 使用 AbortController 控制超时，避免弱网或离线时无限挂起
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(`${base}docs/knowledge.md`, { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`知识内容加载失败: ${resp.status}`);
    }
    knowledgeCache = await resp.text();
    return knowledgeCache;
  } catch (err) {
    // 区分超时错误，便于上层提示
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('知识内容加载超时（10秒），请检查网络后重试');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * 根据题目ID获取图片URL
 * 输入：图片文件名（如 "123.jpg"）
 * 返回：完整的图片资源路径
 */
export function getImageUrl(image: string): string {
  if (!image) return '';
  const base = import.meta.env.BASE_URL;
  return `${base}assets/images/${image}`;
}

/** 获取分类总数 */
export function getCategoriesCount(): number {
  return Object.keys(CATEGORIES).length;
}

/**
 * 获取小分类的题目ID列表
 */
export function getCategoryIds(catKey: string): number[] {
  return CATEGORIES[catKey]?.ids ?? [];
}

/** 主题色 hex 转 rgba */
export function hexToRgba(hex: string, alpha = 1): string {
  const fallback = `rgba(13, 148, 136, ${alpha})`;
  if (!hex) return fallback;
  let m = String(hex).replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(m)) {
    m = m.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return fallback;
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
