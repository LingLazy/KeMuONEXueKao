/**
 * 科目一/科目四教考 · 考试业务域类型定义
 * 包含考试单题状态、考试整体状态、考试结果等数据结构
 * 依赖题目结构（Question），从 './question' 导入
 */
import type { Question, Subject } from './question';

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

/**
 * 考试历史记录条目
 * 每次交卷后写入一条快照，用于成绩趋势回顾与统计
 */
export interface ExamHistoryRecord {
  /** 记录唯一ID（自增） */
  id: number;
  /** 考试科目 */
  subject: Subject;
  /** 得分 */
  score: number;
  /** 满分 */
  fullScore: number;
  /** 及格分 */
  passScore: number;
  /** 是否及格 */
  passed: boolean;
  /** 答对数 */
  correct: number;
  /** 答错数 */
  wrong: number;
  /** 未答数 */
  unanswered: number;
  /** 题目总数 */
  total: number;
  /** 用时（秒） */
  usedTime: number;
  /** 错题ID列表（仅记录本次错题，便于回溯） */
  wrongIds: number[];
  /** 交卷时间戳 */
  timestamp: number;
}

/**
 * 考试历史统计聚合指标
 * 由历史记录数组计算得出，用于开始页与结果页展示
 */
export interface ExamHistoryStats {
  /** 考试总次数 */
  count: number;
  /** 通过次数 */
  passedCount: number;
  /** 通过率（0-100） */
  passRate: number;
  /** 平均分 */
  avgScore: number;
  /** 最高分 */
  bestScore: number;
  /** 最低分 */
  worstScore: number;
  /** 最近一次记录（无记录时为 null） */
  latest: ExamHistoryRecord | null;
  /** 最近 N 次记录（用于趋势展示，按时间倒序） */
  recent: ExamHistoryRecord[];
}

/**
 * 错题本条目
 * 累计记录每道错题的错误次数、最近错误时间、最近用户答案
 */
export interface WrongBookItem {
  /** 题目ID */
  qid: number;
  /** 错误次数（同一题多次答错累计） */
  wrongCount: number;
  /** 最近一次错误时间戳 */
  lastWrongTime: number;
  /** 最近一次用户选择（单选/判断题为 number，多选题为 number[]） */
  lastSelected: number | number[];
  /** 所属科目 */
  subject: Subject;
  /** 首次答错时间戳 */
  firstWrongTime: number;
}

/** 错题本统计指标 */
export interface WrongBookStats {
  /** 错题总数 */
  count: number;
  /** 累计错误次数 */
  totalWrong: number;
  /** 最近 7 天新增错题数 */
  recentCount: number;
}
