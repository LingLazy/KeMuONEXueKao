/**
 * 科目一教考 · 全局类型定义
 * 覆盖题目、口诀、分类、考试、答题记录等核心数据结构
 */

/** 题目类型：单选题 / 判断题 / 多选题 */
export type QuestionType = 'single' | 'judge' | 'multi';

/** 视图名称 */
export type ViewName = 'home' | 'knowledge' | 'practice' | 'exam' | 'mnemonics' | 'categories';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark';

/**
 * 题目结构
 * 对应 src/data/questions.json 中的单条记录
 */
export interface Question {
  /** 题目ID（1~1861） */
  id: number;
  /** 原始题目ID */
  qid?: number;
  /** 章节编号 */
  chapter: number;
  /** 章节名称 */
  chapter_name: string;
  /** 所属小分类 key */
  category: string;
  /** 标签数组（可属多个分类） */
  tags: string[];
  /** 题型 */
  type: QuestionType;
  /** 题干文本 */
  question: string;
  /** 选项数组（判断题为2项，单选题为4项，多选题为4项） */
  options: string[];
  /** 正确答案索引（0-based，多选题为索引数组） */
  answer: number | number[];
  /** 解析文本 */
  analysis: string;
  /** 解析来源链接 */
  analysis_url?: string;
  /** 题目图片文件名（空字符串表示无图） */
  image: string;
  /** 是否为图像题 */
  is_image_question: boolean;
  /** 关键词数组（用于高亮） */
  keywords: string[];
  /** 难度等级 1-5 */
  difficulty?: number;
  /** 错误率 0-1 */
  wrong_rate?: number;
  /** 速记口诀 */
  mnemonic?: string;
  /** 通俗解析 */
  concise_analysis?: string;
}

/**
 * 速记口诀结构
 * 对应 src/data/mnemonics.json 中的单条记录
 */
export interface Mnemonic {
  /** 所属分类 key */
  cat: string;
  /** 口诀标题 */
  title: string;
  /** 口诀正文（简短记忆口诀） */
  text: string;
  /** 口诀解释 */
  explain: string;
  /** 详细分条说明 */
  details: string[];
}

/**
 * 小分类元数据
 * 对应 src/data/categories.json 中的单条记录
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
  /** 题目ID列表 */
  ids: number[];
}

/**
 * 大分类（分类组）结构
 * 聚合多个小分类，题目可在多分类出现（多对多关系）
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
  /** 包含的小分类 key 数组 */
  cats: string[];
  /** 动态匹配规则（'image' 表示额外包含所有图片题） */
  dynamic?: 'image';
}

/** 大分类 key 类型 */
export type GroupKey = 'image' | 'penalty' | 'scenario' | 'rules' | 'vehicle' | 'ev';

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

/** Toast 提示类型 */
export type ToastType = '' | 'success' | 'error' | 'info';

/** Toast 项 */
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
