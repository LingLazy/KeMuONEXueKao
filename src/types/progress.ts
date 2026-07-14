/**
 * 科目一/科目四教考 · 学习进度业务域类型定义
 * 包含答题记录、收藏记录、进度统计等数据结构
 */

/** 答题记录 */
export interface AnswerRecord {
  /** 是否正确 */
  correct: boolean;
  /** 用户选择的索引（单选/判断题为 number，多选题为 number[]；-1 或 [] 表示未答） */
  selected: number | number[];
  /** 答题时间戳 */
  time: number;
}

/** 书签（收藏）记录 */
export interface BookmarkRecord {
  /** 题目ID */
  id: number;
  /** 收藏时间戳 */
  time: number;
}

/** 学习进度统计 */
export interface ProgressStats {
  /** 已答题数 */
  answered: number;
  /** 答对数 */
  correct: number;
  /** 正确率 */
  accuracy: number;
  /** 总题数 */
  total: number;
  /** 进度百分比 */
  progress: number;
}
