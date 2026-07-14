/**
 * 数据加载服务：按需加载题库、口诀、分类、考点知识、交通标志数据
 * - 分类元数据：体积小，同步 import
 * - 题库、口诀、考点知识、交通标志：体积大，动态 import 实现代码分割
 */
import type { Question, Mnemonic, Category, KnowledgePoint, TrafficSign } from '@/types';
import categoriesData from '@/data/categories.json';

/** 分类元数据（同步加载，体积小） */
export const CATEGORIES = categoriesData as Record<string, Category>;

/** 题库数据缓存（避免重复加载） */
let questionsCache: Question[] | null = null;
/** 口诀数据缓存 */
let mnemonicsCache: Mnemonic[] | null = null;
/** 考点知识缓存 */
let knowledgeCache: KnowledgePoint[] | null = null;
/** 交通标志缓存 */
let signsCache: TrafficSign[] | null = null;

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
  // 单选题：保证 options 非空，避免数据缺失导致下游 options.map 崩溃
  const options = Array.isArray(raw.options) ? raw.options : [];
  const answer = typeof raw.answer === 'number' ? raw.answer : Number(raw.answer);
  return { ...raw, options, answer } as Question;
}

/**
 * 按需加载完整题库
 * 首次调用动态 import questions.json，后续返回缓存
 * 加载后对判断题做归一化：补齐 ["正确","错误"] 选项、布尔答案转数字索引
 * 返回：Question[] 完整题目列表（判断题 + 单选题 + 多选题，含科目一与科目四）
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
 * 返回：Mnemonic[] 速记口诀列表
 */
export async function loadMnemonics(): Promise<Mnemonic[]> {
  if (mnemonicsCache) return mnemonicsCache;
  try {
    const module = await import('@/data/mnemonics.json');
    mnemonicsCache = module.default as Mnemonic[];
    return mnemonicsCache;
  } catch (err) {
    throw new Error(`口诀数据加载失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 按需加载考点知识（结构化 JSON）
 * 首次调用动态 import knowledge.json，后续返回缓存
 * 返回：KnowledgePoint[] 26 个一级分类的考点知识列表
 */
export async function loadKnowledgeData(): Promise<KnowledgePoint[]> {
  if (knowledgeCache) return knowledgeCache;
  try {
    const module = await import('@/data/knowledge.json');
    knowledgeCache = module.default as KnowledgePoint[];
    return knowledgeCache;
  } catch (err) {
    throw new Error(`考点知识加载失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 按需加载交通标志图标库
 * 首次调用动态 import signs.json，后续返回缓存
 * 返回：TrafficSign[] 719 个交通标志列表
 */
export async function loadSigns(): Promise<TrafficSign[]> {
  if (signsCache) return signsCache;
  try {
    const module = await import('@/data/signs.json');
    signsCache = module.default as TrafficSign[];
    return signsCache;
  } catch (err) {
    throw new Error(`交通标志数据加载失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 根据图片字段获取完整 URL
 * 输入：图片相对路径，支持以下格式（容错性归一化）
 *   - "questions/img_xxx.jpg"             （新数据格式，相对路径）
 *   - "signs/01_prohibitory_sign/ps001_xxx.jpg"
 *   - "123.jpg"                            （纯文件名，兼容旧格式）
 *   - "assets/images/123.jpg"              （历史格式，自动剥离前缀避免双重拼接）
 *   - "https://example.com/a.jpg"          （完整 URL，原样返回）
 * 返回：完整的图片资源路径
 *
 * 实现要点：
 * - 新数据格式已含子目录（questions/ 或 signs/），直接拼接 `${base}images/${filename}`
 * - 自动剥离可能存在的 "assets/images/" 前缀，防止双重前缀 bug
 */
export function getImageUrl(image: string): string {
  if (!image) return '';
  // 完整 URL（含协议头）直接返回，避免破坏外链
  if (/^https?:\/\//i.test(image) || image.startsWith('//')) return image;
  // 以 data: 开头的内联资源原样返回
  if (image.startsWith('data:')) return image;
  const base = import.meta.env.BASE_URL;
  // 归一化：剥离可能存在的历史前缀，统一为相对路径
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
