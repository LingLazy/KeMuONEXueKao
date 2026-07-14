/**
 * 快捷入口卡片组件
 * - 展示快捷功能入口（标题 + 描述 + 图标）
 * - 桌面端悬停时附加 3D 倾斜效果
 * - 含入场动画与按钮高光
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/common/Icon';
import type { IconName } from '@/components/common/Icon';
import { useTilt } from '@/hooks';

/** QuickCard 组件属性 */
interface QuickCardProps {
  /** 卡片标题 */
  title: string;
  /** 卡片描述 */
  desc: string;
  /** 主题色（CSS 色值，注入为 --qc-color 变量） */
  color: string;
  /** 图标名称 */
  icon: IconName;
  /** 点击回调 */
  onClick: () => void;
}

/**
 * 快捷入口卡片
 *
 * 输入参数：
 * @param title - 卡片标题
 * @param desc - 卡片描述文本
 * @param color - 主题色，通过 CSS 变量 --qc-color 注入
 * @param icon - 图标名称，对应 Icon 组件的 name 属性
 * @param onClick - 点击回调函数
 *
 * 核心执行流程：
 * 1. 通过 useTilt 挂载 3D 倾斜效果（最大倾斜 0.7 度）
 * 2. 渲染图标、标题与描述，含入场动画
 *
 * @returns 渲染的快捷入口卡片按钮元素
 */
export function QuickCard({ title, desc, color, icon, onClick }: QuickCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  // 快捷卡片附加 3D 倾斜效果（桌面端悬停时跟随鼠标轻微倾斜）
  useTilt(ref, { max: 0.7 });
  return (
    <motion.button
      ref={ref}
      type="button"
      className="quick-card card-hover-target tilt-card btn-shine"
      style={{ '--qc-color': color } as React.CSSProperties}
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="quick-card-icon tilt-layer" aria-hidden="true">
        <Icon name={icon} size={20} />
      </div>
      <h3 className="quick-card-title">{title}</h3>
      <p className="quick-card-desc">{desc}</p>
    </motion.button>
  );
}
