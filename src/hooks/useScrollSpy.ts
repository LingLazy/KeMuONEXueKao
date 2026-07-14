/**
 * 滚动监听 Hook
 * - 根据章节 ID 列表自动高亮当前可视章节
 * - 计算页面阅读进度百分比
 * - 内部使用 rAF 节流，避免高频 scroll 事件导致性能问题
 */
import { useEffect, useState } from 'react';
import { useRafThrottle } from './useRafThrottle';

/** useScrollSpy 返回值 */
interface ScrollSpyResult {
  /** 当前活跃章节 ID（不含 'chap-' 前缀） */
  activeId: string;
  /** 阅读进度百分比（0-100） */
  readingProgress: number;
}

/**
 * 滚动监听 Hook
 * 根据章节 ID 列表自动高亮当前可视章节，并计算阅读进度
 *
 * @param chapterIds 章节元素 ID 列表（不含 'chap-' 前缀，DOM 中需存在 id 为 'chap-${id}' 的元素）
 * @param navHeight 导航栏高度（px），用于滚动偏移判定
 * @returns 当前活跃章节 ID 与阅读进度百分比
 *
 * 核心执行流程：
 * 1. 监听 window scroll 事件（passive: true，不阻塞滚动）
 * 2. 使用 useRafThrottle 节流，一帧内最多计算一次
 * 3. 遍历 chapterIds，找到 getBoundingClientRect().top <= navHeight 的最后一个元素作为活跃章节
 * 4. 阅读进度 = window.scrollY / (scrollHeight - innerHeight) * 100，限制在 0-100 范围内
 */
export function useScrollSpy(chapterIds: string[], navHeight: number): ScrollSpyResult {
  /** 当前活跃章节 ID，初始为列表首项或空字符串 */
  const [activeId, setActiveId] = useState<string>(chapterIds[0] ?? '');
  /** 阅读进度百分比 */
  const [readingProgress, setReadingProgress] = useState(0);

  /**
   * 节流后的滚动处理函数
   * 闭包捕获最新的 chapterIds 与 navHeight，保证每次滚动使用最新值
   */
  const onScroll = useRafThrottle(() => {
    /** 遍历章节元素，找到最后一个已滚过导航栏的章节 */
    let current = chapterIds[0] ?? '';
    for (const id of chapterIds) {
      const el = document.getElementById(`chap-${id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= navHeight) {
        current = id;
      }
    }
    setActiveId(current);

    /** 计算阅读进度：已滚动距离 / 可滚动总距离 */
    const docScrollMax = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docScrollMax > 0
      ? Math.min(100, Math.round((window.scrollY / docScrollMax) * 100))
      : 0;
    setReadingProgress(progress);
  });

  /** 注册 / 注销 scroll 监听，章节列表或导航高度变化时重新绑定并立即触发一次 */
  useEffect(() => {
    if (chapterIds.length === 0) return;

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [onScroll, chapterIds, navHeight]);

  return { activeId, readingProgress };
}
