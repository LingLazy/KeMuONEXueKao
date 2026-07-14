/**
 * 分类入口卡片组件
 * - 展示大分类入口（序号 + 名称 + 描述 + 题数 + 正确率 + 箭头）
 * - 桌面端悬停时附加 3D 倾斜效果（金属面板视差感）
 * - 含入场动画与按钮高光
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/common/Icon';
import { useTilt } from '@/hooks';
import type { CategoryGroup } from '@/types';

/** 分类卡片雷达数据（仅取展示所需字段） */
interface CatCardRadar {
  /** 正确率（0-100） */
  accuracy: number;
  /** 已答题数 */
  answered: number;
}

/** CatCard 组件属性 */
interface CatCardProps {
  /** 分类组键名 */
  gk: string;
  /** 卡片序号（用于入场延迟与序号展示） */
  index: number;
  /** 分类组数据 */
  group: CategoryGroup;
  /** 该分类下的题目总数 */
  count: number;
  /** 雷达统计（正确率与已答数），无数据时为 undefined */
  radar: CatCardRadar | undefined;
  /** 背景色（带透明度的色值，注入为 --cat-color-bg 变量） */
  colorBg: string;
  /** 点击回调 */
  onClick: () => void;
}

/**
 * 分类入口卡片
 *
 * 输入参数：
 * @param gk - 分类组键名
 * @param index - 卡片序号，影响序号展示与入场动画延迟
 * @param group - 分类组数据，包含名称、描述、颜色等
 * @param count - 该分类下的题目总数
 * @param radar - 雷达统计数据（正确率与已答数），无数据时为 undefined
 * @param colorBg - 背景色，通过 CSS 变量 --cat-color-bg 注入
 * @param onClick - 点击回调函数
 *
 * 核心执行流程：
 * 1. 通过 useTilt 挂载 3D 倾斜效果（最大倾斜 0.85 度）
 * 2. 渲染序号、名称、描述、题数与正确率
 * 3. 已答题数大于 0 时展示正确率
 *
 * @returns 渲染的分类入口卡片按钮元素
 */
export function CatCard({ gk, index, group, count, radar, colorBg, onClick }: CatCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  // 分类大卡片附加 3D 倾斜（强度略大，呈现金属面板视差感）
  useTilt(ref, { max: 0.85 });
  return (
    <motion.button
      ref={ref}
      key={gk}
      type="button"
      className="cat-card card-hover-target tilt-card btn-shine"
      data-cat={gk}
      style={{
        '--cat-color': group.color,
        '--cat-color-bg': colorBg
      } as React.CSSProperties}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      aria-label={`进入${group.name}分类，共${count}题`}
    >
      <div className="cat-card-index tilt-layer">{String(index + 1).padStart(2, '0')}</div>
      <div className="cat-card-body tilt-layer">
        <h3 className="cat-card-name">{group.name}</h3>
        <p className="cat-card-desc">{group.desc}</p>
        <div className="cat-card-meta">
          <span className="cat-card-count">
            <span className="num">{count}</span> 题
          </span>
          {radar && radar.answered > 0 && (
            <span className="cat-card-acc">正确率 {radar.accuracy}%</span>
          )}
        </div>
      </div>
      <div className="cat-card-arrow" aria-hidden="true">
        <Icon name="arrow-right" size={20} />
      </div>
    </motion.button>
  );
}
