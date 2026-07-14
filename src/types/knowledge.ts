/**
 * 科目一/科目四教考 · 考点知识业务域类型定义
 * 包含考点子节点、考点大类等数据结构
 * 对应 src/data/knowledge.json 数据结构
 */

/**
 * 考点知识子节点
 * 对应 src/data/knowledge.json 中 sub_points 数组的单条记录
 */
export interface KnowledgeSubPoint {
  /** 子考点序号（如 "1.1"） */
  index: string;
  /** 子考点标题 */
  title: string;
  /** 原始标签ID */
  label_id: number;
  /** 关联题目数 */
  question_count: number;
  /** 考点内容正文 */
  content: string;
}

/**
 * 考点知识大类
 * 对应 src/data/knowledge.json 中的单条记录
 * 26 个一级分类的考点知识聚合
 */
export interface KnowledgePoint {
  /** 大类ID（1-26） */
  id: number;
  /** 所属分类 key（cat01-cat26） */
  category: string;
  /** 分类名称 */
  category_name: string;
  /** 一级标签ID */
  label_id: number;
  /** 子考点列表 */
  sub_points: KnowledgeSubPoint[];
}
