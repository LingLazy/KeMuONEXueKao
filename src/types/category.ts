/**
 * 科目一/科目四教考 · 分类业务域类型定义
 * 包含小分类元数据、大分类组、分类 key 等数据结构
 * 对应 src/data/categories.json 数据结构
 */

/**
 * 小分类元数据
 * 对应 src/data/categories.json 中的单条记录
 * 26 个一级分类（cat01-cat26）
 */
export interface Category {
  /** 分类显示名 */
  name: string;
  /** 图标标识 */
  icon: string;
  /** 主题色（hex） */
  color: string;
  /** 题目数量 */
  count: number;
  /** 题目ID列表（题目 id，1-3494） */
  ids: number[];
}

/**
 * 大分类（分类组）结构
 * 聚合多个小分类，便于在分类页/首页按主题分组展示
 * 5 个大分类组：laws 法规常识 / penalty 违法处罚 / vehicle 车辆常识 / safety 安全驾驶 / misc 其他案例
 */
export interface CategoryGroup {
  /** 大分类显示名 */
  name: string;
  /** 图标标识 */
  icon: string;
  /** 主题色（hex） */
  color: string;
  /** 分类描述 */
  desc: string;
  /** 包含的小分类 key 数组（cat01-cat26） */
  cats: string[];
}

/** 大分类 key 类型：5 大分类组 */
export type GroupKey = 'laws' | 'penalty' | 'vehicle' | 'safety' | 'misc';
