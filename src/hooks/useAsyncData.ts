/**
 * 通用异步数据加载 Hook
 * - 封装 load / error / loading 三态管理
 * - 组件卸载时取消未完成的 Promise（避免卸载后 setState 警告）
 * - 支持手动重载
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** useAsyncData 返回值 */
interface UseAsyncDataResult<T> {
  /** 已加载的数据，未加载或加载中时为 null */
  data: T | null;
  /** 错误信息，无错误时为 null */
  error: string | null;
  /** 是否正在加载（含首次加载与重载） */
  loading: boolean;
  /** 触发重新加载 */
  reload: () => void;
}

/**
 * 通用异步数据加载 Hook
 * 封装 load / error / loading 三态管理与组件卸载时的 Promise 取消
 *
 * @param loader 异步数据加载函数，返回 Promise<T>
 * @param deps 依赖数组，变化时重新加载（默认仅挂载时加载一次）
 * @returns 数据、错误、加载态、重载函数
 *
 * 核心执行流程：
 * 1. 挂载或 deps 变化时执行 loader
 * 2. 使用 cancelled ref 标记组件是否已卸载，卸载后不再 setState
 * 3. reload 通过递增内部 token 触发 effect 重新执行
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = []
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** 重载令牌：递增以触发 effect 重新执行 */
  const [reloadToken, setReloadToken] = useState(0);
  /** 卸载标记：为 true 时表示组件已卸载，禁止 setState */
  const cancelledRef = useRef(false);

  /** 触发重载：递增令牌以重新执行 effect */
  const reload = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    /** 异步执行加载逻辑，使用 try-catch 包裹保证异常可控 */
    const run = async () => {
      try {
        const result = await loader();
        if (cancelledRef.current) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    void run();

    return () => {
      cancelledRef.current = true;
    };
    // deps 由调用方传入，控制何时重新加载；loader 不纳入以避免内联函数导致的频繁重载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, ...deps]);

  return { data, error, loading, reload };
}
