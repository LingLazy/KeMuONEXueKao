/**
 * 科目一/科目四教考 · 考试业务域类型定义
 * 包含考试单题状态、考试整体状态、考试结果等数据结构
 * 依赖题目结构（Question），从 './question' 导入
 */
import type { Question } from './question';

/** 考试单题状态 */
export interface ExamQuestionState {
  /** 原始题目 */
  question: Question;
  /** 用户作答索引（单选/判断题为 number，-1 表示未答；多选题为 number[]，空数组表示未答） */
  selected: number | number[];
  /** 是否标记 */
  marked: boolean;
  /** 是否已使用五五提示 */
  hintUsed: boolean;
  /** 五五提示剔除的选项索引 */
  eliminated: number[];
}

/** 考试状态 */
export interface ExamState {
  /** 是否正在考试 */
  running: boolean;
  /** 考试题目列表 */
  questions: ExamQuestionState[];
  /** 当前题目索引 */
  currentIndex: number;
  /** 考试开始时间戳 */
  startTime: number;
  /** 考试时长（毫秒） */
  duration: number;
  /** 考试结果 */
  result: ExamResult | null;
}

/** 考试结果 */
export interface ExamResult {
  /** 得分 */
  score: number;
  /** 是否及格 */
  passed: boolean;
  /** 答对数 */
  correct: number;
  /** 答错数 */
  wrong: number;
  /** 未答数 */
  unanswered: number;
  /** 用时（秒） */
  usedTime: number;
  /** 错题ID列表 */
  wrongIds: number[];
}
