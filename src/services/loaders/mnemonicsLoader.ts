/**
 * 口诀数据加载器
 * 负责按需动态加载速记口诀 JSON 数据
 */
import type { Mnemonic } from '@/types';

/** 口诀数据缓存（避免重复加载） */
let mnemonicsCache: Mnemonic[] | null = null;

/**
 * 按需加载完整口诀列表
 * 首次调用动态 import mnemonics.json，后续返回缓存
 *
 * 返回值：
 * @returns Mnemonic[] 速记口诀列表
 */
export async function loadMnemonics(): Promise<Mnemonic[]> {
  if (mnemonicsCache) return mnemonicsCache;
  try {
    const module = await import('@/data/mnemonics.json');
    mnemonicsCache = module.default as Mnemonic[];
    return mnemonicsCache;
  } catch (err) {
    // 先记录原始错误便于开发者排查，再抛出友好提示供上层 UI 直接展示
    console.error('[mnemonicsLoader] 口诀加载失败', err);
    throw new Error('口诀加载失败，请稍后重试');
  }
}
