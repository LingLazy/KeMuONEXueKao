/**
 * 科目一/科目四教考 · 交通标志业务域类型定义
 * 包含交通标志图标结构
 * 对应 src/data/signs.json 数据结构
 */

/**
 * 交通标志图标结构
 * 对应 src/data/signs.json 中的单条记录
 * 719 个交通标志，覆盖 17 个子类别
 */
export interface TrafficSign {
  /** 标志ID（1-719） */
  id: number;
  /** 英文类别标识（如 "prohibitory_sign"） */
  category_en: string;
  /** 中文类别名（如 "禁令标志"） */
  category_name: string;
  /** 类别前缀（如 "ps"、"ws"） */
  category_prefix: string;
  /** 类内序号 */
  icon_id: number;
  /** 标志名称 */
  title: string;
  /** 标志含义说明 */
  content: string;
  /** 图片相对路径（如 "signs/01_prohibitory_sign/ps001_stop_and_yield.jpg"） */
  image: string;
  /** 关联科目一题目 qid 列表 */
  ke1_questions: number[];
  /** 关联科目四题目 qid 列表 */
  ke4_questions: number[];
}
