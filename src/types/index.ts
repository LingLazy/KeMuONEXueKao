/**
 * 科目一/科目四教考 · 全局类型定义
 * 覆盖题目、口诀、分类、考点知识、交通标志、考试、答题记录等核心数据结构
 */

/** 题目类型：单选题 / 判断题 / 多选题 */
export type QuestionType = 'single' | 'judge' | 'multi';

/** 视图名称 */
export type ViewName = 'home' | 'knowledge' | 'practice' | 'exam' | 'mnemonics' | 'categories';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark';

/** 科目类型：ke1 科目一（法规基础）/ ke4 科目四（安全文明） */
export type Subject = 'ke1' | 'ke4';

/**
 * 题目结构
 * 对应 src/data/questions.json 中的单条记录
 */
export interface Question {
  /** 题目ID（1-3494，ke1: 1-1861，ke4: 1862-3494） */
  id: number;
  /** 原始题库题目ID（驾考宝典 qid） */
  qid?: number;
  /** 所属科目 */
  subject: Subject;
  /** 章节编号（对应一级分类序号 1-26） */
  chapter: number;
  /** 章节名称（一级分类名） */
  chapter_name: string;
  /** 所属小分类 key（cat01-cat26） */
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
  /** 题目图片相对路径（如 "questions/img_xxx.jpg" 或 "signs/01_prohibitory_sign/ps001_xxx.jpg"，空字符串表示无图） */
  image: string;
  /** 是否为图像题 */
  is_image_question: boolean;
  /** 关键词数组（用于高亮） */
  keywords: string[];
  /** 难度等级 1-5 */
  difficulty?: number;
  /** 错误率 0-1 */
  wrong_rate?: number;
  /** 速记口诀（来自原题库 concise_explain 提炼） */
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
