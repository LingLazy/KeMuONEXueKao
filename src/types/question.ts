/**
 * 科目一/科目四教考 · 题目业务域类型定义
 * 包含题型、科目、题目结构等核心数据定义
 * 对应 src/data/questions.json 数据结构
 */

/** 题目类型：单选题 / 判断题 / 多选题 */
export type QuestionType = 'single' | 'judge' | 'multi';

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
