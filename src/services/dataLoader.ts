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
 * - 判断题：补齐选项、布尔答案转数字索引
 * - 单选题：原样返回
 * - 多选题：保证 answer 为数组、options 非空
 * 输入：原始题目（可能含布尔 answer / 空 options / 数组 answer）
 * 返回：与 Question 类型完全一致的题目
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
  // 单选题：原样返回
  return raw as Question;
}

/**
 * 按需加载完整题库
 * 首次调用动态 import questions.json，后续返回缓存
 * 加载后对判断题做归一化：补齐 ["正确","错误"] 选项、布尔答案转数字索引
 * 返回：Question[] 1964道题目
 */
export async function loadQuestions(): Promise<Question[]> {
  if (questionsCache) return questionsCache;
  try {
    const module = await import('@/data/questions.json');
    const rawList = module.default as RawQuestion[];
    questionsCache = rawList.map(normalizeQuestion);
    return questionsCache;
  } catch (err) {
    // 包裹更友好的错误信息，便于上层 UI 提示
    throw new Error(`题库数据加载失败：${err instanceof Error ? err.message : String(err)}`);
  }
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
 * 根据图片字段获取完整 URL
 * 输入：图片文件名，支持以下格式（容错性归一化）
 *   - "123.jpg"               （推荐格式，纯文件名）
 *   - "assets/images/123.jpg" （历史格式，自动剥离前缀避免双重拼接）
 *   - "/assets/images/123.jpg"
 *   - "https://example.com/a.jpg" （完整 URL，原样返回）
 * 返回：完整的图片资源路径
 *
 * 实现要点：自动剥离可能存在的 "assets/images/" 前缀，
 * 防止数据层与该函数同时拼接前缀导致 "/assets/images/assets/images/xxx.jpg" 双重前缀 bug
 */
export function getImageUrl(image: string): string {
  if (!image) return '';
  // 完整 URL（含协议头）直接返回，避免破坏外链
  if (/^https?:\/\//i.test(image) || image.startsWith('//')) return image;
  // 以 data: 开头的内联资源原样返回
  if (image.startsWith('data:')) return image;
  const base = import.meta.env.BASE_URL;
  // 归一化：剥离可能存在的前缀，统一为纯文件名
  let filename = image;
  const PREFIX = 'assets/images/';
  if (filename.startsWith(PREFIX)) {
    filename = filename.slice(PREFIX.length);
  } else if (filename.startsWith('/' + PREFIX)) {
    filename = filename.slice(('/' + PREFIX).length);
  }
  // 防御性处理：去除首部多余斜杠
  filename = filename.replace(/^\/+/, '');
  return `${base}images/${filename}`;
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
