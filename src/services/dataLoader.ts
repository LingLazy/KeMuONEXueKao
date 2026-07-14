/**
 * 数据加载服务兼容层
 *
 * 历史职责已按单一职责拆分至：
 * - @/services/loaders/*        4 个数据加载器（题库/口诀/考点/交通标志）
 * - @/services/image            图片 URL 处理（getImageUrl）
 * - @/utils/color               颜色工具（hexToRgba）
 *
 * 本文件保留对分类元数据（CATEGORIES）的同步加载与查询助手，
 * 并 re-export 上述模块的导出，确保现有 `@/services/dataLoader` 导入路径不变，
 * 所有消费方无需修改 import 语句。
 */
import type { Category } from '@/types';
import categoriesData from '@/data/categories.json';

/** 分类元数据（同步加载，体积小） */
export const CATEGORIES = categoriesData as Record<string, Category>;

// === 兼容层 re-export：保持现有导入路径不变 ===
export * from './loaders';
export { getImageUrl } from './image';
export { hexToRgba } from '@/utils/color';

/**
 * 获取分类总数
 *
 * 返回值：
 * @returns CATEGORIES 中分类条目数量
 */
export function getCategoriesCount(): number {
  return Object.keys(CATEGORIES).length;
}

/**
 * 获取小分类的题目ID列表
 *
 * 输入参数：
 * @param catKey - 分类 key（如 "cat01"）
 *
 * 返回值：
 * @returns 该分类下的题目 ID 数组；分类不存在时返回空数组
 */
export function getCategoryIds(catKey: string): number[] {
  return CATEGORIES[catKey]?.ids ?? [];
}
