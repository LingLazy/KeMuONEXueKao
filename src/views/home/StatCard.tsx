/**
 * 数据统计卡片组件
 * - 展示单项统计指标（标签 + 数值 + 图标）
 * - 支持 primary / success / accent / info 四种主题色
 * - 含入场动画与悬停反馈
 */
import { motion } from 'framer-motion';
import { Icon } from '@/components/common/Icon';
import type { IconName } from '@/components/common/Icon';

/** StatCard 组件属性 */
interface StatCardProps {
  /** 指标标签 */
  label: string;
  /** 指标数值 */
  value: string | number;
  /** 总数（可选，展示为 value/total 格式） */
  total?: number;
  /** 图标名称 */
  icon: IconName;
  /** 主题色 */
  color: 'primary' | 'success' | 'accent' | 'info';
}

/**
 * 数据统计卡片
 *
 * 输入参数：
 * @param label - 指标标签文本
 * @param value - 指标数值
 * @param total - 总数，提供时以 value/total 格式展示
 * @param icon - 图标名称，对应 Icon 组件的 name 属性
 * @param color - 主题色，决定卡片的视觉色调
 *
 * @returns 渲染的统计卡片元素
 */
export function StatCard({ label, value, total, icon, color }: StatCardProps) {
  return (
    <motion.div
      className={`stat-card stat-${color} card-hover-target btn-shine`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <div className="stat-icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </div>
      <div className="stat-info">
        <span className="stat-value">{value}{total ? <span className="stat-total">/{total}</span> : null}</span>
        <span className="stat-label">{label}</span>
      </div>
    </motion.div>
  );
}
