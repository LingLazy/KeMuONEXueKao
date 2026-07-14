/**
 * 考点知识数据加载器
 * 负责按需动态加载考点知识 JSON 数据
 */
import type { KnowledgePoint } from '@/types';

/** 考点知识缓存（避免重复加载） */
let knowledgeCache: KnowledgePoint[] | null = null;

/**
 * 按需加载考点知识（结构化 JSON）
 * 首次调用动态 import knowledge.json，后续返回缓存
 *
 * 返回值：
 * @returns KnowledgePoint[] 26 个一级分类的考点知识列表
 */
export async function loadKnowledgeData(): Promise<KnowledgePoint[]> {
  if (knowledgeCache) return knowledgeCache;
  try {
    const module = await import('@/data/knowledge.json');
    knowledgeCache = module.default as KnowledgePoint[];
    return knowledgeCache;
  } catch (err) {
    // 先记录原始错误便于开发者排查，再抛出友好提示供上层 UI 直接展示
    console.error('[knowledgeLoader] 考点知识加载失败', err);
    throw new Error('考点知识加载失败，请稍后重试');
  }
}
