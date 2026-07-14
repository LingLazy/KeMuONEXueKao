/**
 * 几何背景装饰层通用组件
 * - 根据视图变体渲染对应的构成主义几何装饰 div 组合
 * - 所有装饰层均设置 aria-hidden="true"，对辅助技术不可见
 * - 内部通过静态配置表 GEO_DECOR_CONFIG 维护各变体的装饰 div 列表，
 *   避免在各视图中重复书写冗长的装饰层 JSX
 * - 支持携带内联 style 的装饰元素（如带定位的 geo-hatch-block、geo-hline-dashed），
 *   以兼容原视图中带 inline style 的装饰 div
 */
import type { CSSProperties } from 'react';

/** 支持的视图变体类型 */
export type GeoBgVariant =
  // 通用状态变体（多视图共用，如加载中/错误态）
  | 'loading'
  | 'error'
  // 各视图正常态装饰
  | 'home'
  | 'practice'
  | 'practice-empty'
  | 'exam'
  | 'mnemonics'
  | 'categories'
  | 'knowledge';

/** 装饰层单项：可仅为类名字符串，或携带内联 style 的对象（适配带定位的装饰元素） */
type GeoDecorItem = string | { readonly className: string; readonly style?: CSSProperties };

/**
 * 各变体对应的装饰层 div 配置
 * - 数组顺序对应原视图中装饰 div 的书写顺序，保证视觉一致
 * - 'loading' / 'error' 为多视图共用的状态态装饰，避免重复定义
 */
const GEO_DECOR_CONFIG: Record<GeoBgVariant, GeoDecorItem[]> = {
  /** 通用加载态：网格底纹 + 小点阵（PracticeView/ExamView/MnemonicsView/CategoriesView/KnowledgeView 共用） */
  loading: ['geo-bg-grid', 'geo-dots-sm'],
  /** 通用错误态：网格底纹 + 大点阵（PracticeView/ExamView/CategoriesView/KnowledgeView 共用） */
  error: ['geo-bg-grid', 'geo-dots-lg'],
  /** 主页：品牌光晕 + S 曲线 + 涟漪环 + 三角切片等 10 项扩展装饰 */
  home: [
    'geo-glow-primary-tl',
    'geo-glow-accent-br',
    'geo-curve-s',
    'geo-ripple-tr',
    'geo-triangle-rt',
    'geo-cross-marks',
    'geo-spiral-ccw',
    'geo-pulse-ring',
    'geo-float-block',
    'geo-glow-info-bl'
  ],
  /** 练习正常态：网格底纹 + 平行斜线 + 十字坐标点 + 多位置动态元素 */
  practice: [
    'geo-bg-grid',
    'geo-parallel-lines',
    'geo-cross-marks',
    { className: 'geo-hatch-block', style: { top: '12%', right: '4%' } },
    'geo-dots-radial',
    'geo-chevron-stack',
    'geo-bezier-flow'
  ],
  /** 练习空题列表态：网格底纹 + 十字坐标点 */
  'practice-empty': ['geo-bg-grid', 'geo-cross-marks'],
  /** 考试答题页：网格底纹 + 品牌光晕 + 几何线条 + 动态元素
   *  克制使用 8 项装饰，营造专注但不单调的答题氛围
   *  所有装饰均为低饱和度/低透明度，不干扰文字阅读 */
  exam: [
    'geo-bg-grid',
    'geo-glow-primary-tl',
    'geo-curve-s',
    'geo-cross-marks',
    'geo-dots-radial',
    'geo-bezier-flow',
    'geo-pulse-ring',
    'geo-float-block'
  ],
  /** 口诀总览正常态：网格底纹 + 弧线 + 对角线 + 波浪线等 10 项装饰 */
  mnemonics: [
    'geo-bg-grid',
    'geo-arc-tr',
    'geo-diag-line',
    'geo-square-bl',
    'geo-wave-lines',
    'geo-curve-s',
    'geo-cross-marks',
    'geo-dots-tilt',
    'geo-bezier-flow',
    'geo-orbit-dots'
  ],
  /** 分类导航正常态：同心环 + 横竖虚线束 + 三角切片 + 两条带定位的虚线 */
  categories: [
    'geo-bg-grid',
    'geo-half-rings-br',
    'geo-vline-bundle',
    'geo-triangle-rt',
    'geo-cross-marks',
    { className: 'geo-hline-dashed', style: { top: '32%' } },
    { className: 'geo-hline-dashed', style: { top: '68%' } },
    'geo-dots-radial',
    'geo-chevron-stack',
    'geo-glow-info-bl'
  ],
  /** 知识学习正常态：网格底纹 + 弧线 + 嵌套方块 + 螺旋等 11 项装饰 */
  knowledge: [
    'geo-bg-grid',
    'geo-arc-tl',
    'geo-diag-line',
    'geo-square-br',
    'geo-nested-squares-tl',
    'geo-curve-s',
    'geo-vline-bundle',
    'geo-glow-accent-br',
    'geo-cross-grid',
    'geo-spiral-ccw',
    'geo-float-block'
  ]
};

interface GeoBgDecorProps {
  /** 视图变体，决定渲染哪些装饰层 */
  readonly variant: GeoBgVariant;
}

/**
 * 几何背景装饰层组件
 *
 * @param variant - 视图变体，根据变体从 GEO_DECOR_CONFIG 取对应装饰层组合
 * @returns 渲染 .geo-bg-decor 容器及其内部装饰 div 序列
 */
export default function GeoBgDecor({ variant }: GeoBgDecorProps) {
  const items = GEO_DECOR_CONFIG[variant];
  return (
    <div className="geo-bg-decor" aria-hidden="true">
      {items.map((item, idx) => {
        // 同一变体内可能出现重名 className（如 categories 的两条 geo-hline-dashed），
        // 用 index 拼接保证 key 唯一；装饰列表为静态配置，index 稳定不影响复用
        const className = typeof item === 'string' ? item : item.className;
        const style = typeof item === 'string' ? undefined : item.style;
        return <div key={`${className}-${idx}`} className={className} style={style} />;
      })}
    </div>
  );
}
