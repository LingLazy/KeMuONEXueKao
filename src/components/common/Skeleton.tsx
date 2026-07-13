/**
 * 骨架屏组件
 * - 卡片型骨架
 * - 文本型骨架
 * - 可自定义宽高与圆角
 */
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = 6, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** 题目卡片骨架 */
export function QuestionCardSkeleton() {
  return (
    <div className="qcard-skeleton" aria-hidden="true">
      <Skeleton width="60%" height={20} />
      <Skeleton width="100%" height={60} radius={12} />
      <Skeleton width="100%" height={44} radius={10} />
      <Skeleton width="100%" height={44} radius={10} />
      <Skeleton width="100%" height={44} radius={10} />
      <Skeleton width="100%" height={44} radius={10} />
    </div>
  );
}

/** 列表项骨架 */
export function ListItemSkeleton() {
  return (
    <div className="list-skeleton" aria-hidden="true">
      <Skeleton width={32} height={32} radius={8} />
      <div className="list-skeleton-text">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
  );
}
