/**
 * 交通标志数据加载器
 * 负责按需动态加载交通标志图标库 JSON 数据
 */
import type { TrafficSign } from '@/types';

/** 交通标志缓存（避免重复加载） */
let signsCache: TrafficSign[] | null = null;

/**
 * 按需加载交通标志图标库
 * 首次调用动态 import signs.json，后续返回缓存
 *
 * 返回值：
 * @returns TrafficSign[] 719 个交通标志列表
 */
export async function loadSigns(): Promise<TrafficSign[]> {
  if (signsCache) return signsCache;
  try {
    const module = await import('@/data/signs.json');
    signsCache = module.default as TrafficSign[];
    return signsCache;
  } catch (err) {
    // 先记录原始错误便于开发者排查，再抛出友好提示供上层 UI 直接展示
    console.error('[signsLoader] 交通标志加载失败', err);
    throw new Error('交通标志加载失败，请稍后重试');
  }
}
