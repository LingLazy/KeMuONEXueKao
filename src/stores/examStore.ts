/**
 * 考试状态管理
 * - 随机抽取题目
 * - 限时倒计时
 * - 答题卡：已答/标记/未答
 * - 五五提示：剔除两个错误选项
 * - 评分：>=90分及格
 * - 中途状态持久化至 sessionStorage（支持刷新恢复）
 */
import { create } from 'zustand';
import type { ExamQuestionState, ExamResult, Question, Subject } from '@/types';
import { SessionStore, STORAGE_KEYS } from '@/services/storage';
import { shuffle, range } from '@/utils';

/** 各科目考试配置：题量 / 时长 / 及格分 / 每题分值 */
export const EXAM_CONFIG: Record<Subject, {
  /** 题目数量 */
  count: number;
  /** 考试时长（毫秒） */
  duration: number;
  /** 及格分数 */
  passScore: number;
  /** 每题分值 */
  pointsPerQuestion: number;
}> = {
  // 科目一：100题 × 1分 = 100分，45分钟，90分及格
  ke1: { count: 100, duration: 45 * 60 * 1000, passScore: 90, pointsPerQuestion: 1 },
  // 科目四：50题 × 2分 = 100分，30分钟，90分及格
  ke4: { count: 50, duration: 30 * 60 * 1000, passScore: 90, pointsPerQuestion: 2 }
};

/** 默认考试时长（向后兼容，取科目一配置） */
export const EXAM_DURATION = EXAM_CONFIG.ke1.duration;
/** 默认考试题数（向后兼容，取科目一配置） */
export const EXAM_COUNT = EXAM_CONFIG.ke1.count;
/** 默认及格分数（向后兼容，取科目一配置） */
export const EXAM_PASS_SCORE = EXAM_CONFIG.ke1.passScore;

interface ExamState {
  /** 是否正在考试 */
  running: boolean;
  /** 当前考试科目 */
  subject: Subject | null;
  /** 考试题目列表（含作答状态） */
  questions: ExamQuestionState[];
  /** 当前题目索引 */
  currentIndex: number;
  /** 开始时间戳 */
  startTime: number;
  /** 考试时长 */
  duration: number;
  /** 计时器ID */
  timerId: ReturnType<typeof setInterval> | null;
  /** 剩余毫秒数 */
  remaining: number;
  /** 考试结果 */
  result: ExamResult | null;
  /** 开始考试 */
  start: (questions: Question[], subject: Subject) => void;
  /** 选择答案 */
  select: (index: number, optionIdx: number) => void;
  /** 切换标记 */
  toggleMark: (index: number) => void;
  /** 使用五五提示：剔除两个错误选项 */
  useHint: (index: number) => number[];
  /** 下一题 */
  next: () => void;
  /** 上一题 */
  prev: () => void;
  /** 跳到指定题号 */
  jumpTo: (index: number) => void;
  /** 计时器tick */
  tick: () => void;
  /** 交卷 */
  submit: () => ExamResult;
  /** 重置 */
  reset: () => void;
  /** 持久化至 sessionStorage */
  persist: () => void;
  /** 从 sessionStorage 恢复 */
  restore: (allQuestions: Question[]) => boolean;
}

/** 评分：按每题分值计分，答错0分，未答0分 */
function gradeExam(
  questions: ExamQuestionState[],
  usedTimeSec: number,
  pointsPerQuestion: number,
  passScore: number
): ExamResult {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  const wrongIds: number[] = [];
  questions.forEach((q) => {
    // 判断是否未答：单选/判断题 -1，多选题空数组 []
    const isUnanswered = Array.isArray(q.selected)
      ? q.selected.length === 0
      : q.selected < 0;
    if (isUnanswered) {
      unanswered++;
      wrongIds.push(q.question.id);
      return;
    }
    // 比较答案：多选题排序后逐项比较，单选直接比较
    const correctAns = q.question.answer;
    const isCorrect = Array.isArray(correctAns)
      ? Array.isArray(q.selected) &&
        q.selected.length === correctAns.length &&
        (() => {
          // 将 correctAns 排序提取到 every 外部，避免每个元素比较都重复排序
          const sortedCorrect = [...correctAns].sort((a, b) => a - b);
          const sortedSelected = [...q.selected].sort((a, b) => a - b);
          return sortedSelected.every((v, i) => v === sortedCorrect[i]);
        })()
      : !Array.isArray(q.selected) && q.selected === correctAns;
    if (isCorrect) {
      correct++;
    } else {
      wrong++;
      wrongIds.push(q.question.id);
    }
  });
  // 按每题分值计算总分
  const score = correct * pointsPerQuestion;
  return {
    score,
    passed: score >= passScore,
    correct,
    wrong,
    unanswered,
    usedTime: usedTimeSec,
    wrongIds
  };
}

export const useExamStore = create<ExamState>((set, get) => ({
  running: false,
  subject: null,
  questions: [],
  currentIndex: 0,
  startTime: 0,
  duration: EXAM_DURATION,
  timerId: null,
  remaining: EXAM_DURATION,
  result: null,

  start: (questions, subject) => {
    // 清理已有计时器，避免重复 start 导致双倍速倒计时
    const { timerId: oldTimerId, running } = get();
    if (oldTimerId) clearInterval(oldTimerId);
    if (running) get().reset();
    const config = EXAM_CONFIG[subject];
    // 按科目筛选后随机抽取考试题目
    const subjectQuestions = questions.filter((q) => q.subject === subject);
    const picked = shuffle(subjectQuestions).slice(0, config.count);
    // 初始化作答状态：多选题初始为空数组 []，其他为 -1
    const examQuestions: ExamQuestionState[] = picked.map((q) => ({
      question: q,
      selected: q.type === 'multi' ? [] : -1,
      marked: false,
      hintUsed: false,
      eliminated: []
    }));
    const timerId = setInterval(() => get().tick(), 1000);
    set({
      running: true,
      subject,
      questions: examQuestions,
      currentIndex: 0,
      startTime: Date.now(),
      duration: config.duration,
      timerId,
      remaining: config.duration,
      result: null
    });
    get().persist();
  },

  select: (index, optionIdx) => {
    const questions = get().questions.slice();
    const item = questions[index];
    if (!item) return;
    // 多选题：在选中数组中切换 optionIdx
    if (item.question.type === 'multi') {
      const cur = Array.isArray(item.selected) ? item.selected : [];
      const next = cur.includes(optionIdx)
        ? cur.filter((i) => i !== optionIdx)
        : [...cur, optionIdx];
      questions[index] = { ...item, selected: next };
    } else {
      // 单选/判断题：直接覆盖
      questions[index] = { ...item, selected: optionIdx };
    }
    set({ questions });
    get().persist();
  },

  toggleMark: (index) => {
    const questions = get().questions.slice();
    const item = questions[index];
    if (!item) return;
    questions[index] = { ...item, marked: !item.marked };
    set({ questions });
    get().persist();
  },

  useHint: (index) => {
    const questions = get().questions.slice();
    const item = questions[index];
    if (!item || item.hintUsed) return item?.eliminated ?? [];
    // 正确答案可能是数组（多选题）或数字（单选/判断题）
    const correctArr = Array.isArray(item.question.answer)
      ? item.question.answer
      : [item.question.answer];
    // 从错误选项中随机剔除2个
    const wrongOptions = range(0, item.question.options.length - 1).filter(
      (i) => !correctArr.includes(i)
    );
    const eliminated = shuffle(wrongOptions).slice(0, 2);
    questions[index] = { ...item, hintUsed: true, eliminated };
    set({ questions });
    get().persist();
    return eliminated;
  },

  next: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
      get().persist();
    }
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
      get().persist();
    }
  },

  jumpTo: (index) => {
    const len = get().questions.length;
    if (index >= 0 && index < len) {
      set({ currentIndex: index });
      get().persist();
    }
  },

  tick: () => {
    // 基于时间戳计算剩余时间，避免后台标签页 setInterval 节流导致计时漂移
    const { startTime, duration, timerId } = get();
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    if (remaining <= 0) {
      // 时间到，自动交卷
      if (timerId) clearInterval(timerId);
      set({ remaining: 0 });
      get().submit();
      return;
    }
    set({ remaining });
  },

  submit: () => {
    const { questions, timerId, startTime, duration, subject } = get();
    if (timerId) clearInterval(timerId);
    const usedMs = Date.now() - startTime;
    const usedSec = Math.min(Math.floor(usedMs / 1000), Math.floor(duration / 1000));
    // 无科目时回退到科目一配置（理论上不会发生，防御性处理）
    const config = subject ? EXAM_CONFIG[subject] : EXAM_CONFIG.ke1;
    const result = gradeExam(questions, usedSec, config.pointsPerQuestion, config.passScore);
    set({ running: false, result, timerId: null });
    SessionStore.remove(STORAGE_KEYS.examState);
    return result;
  },

  reset: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    set({
      running: false,
      subject: null,
      questions: [],
      currentIndex: 0,
      startTime: 0,
      duration: EXAM_DURATION,
      timerId: null,
      remaining: EXAM_DURATION,
      result: null
    });
    SessionStore.remove(STORAGE_KEYS.examState);
  },

  persist: () => {
    const { questions, currentIndex, startTime, duration, remaining, subject } = get();
    // 仅持久化必要字段，避免保存函数
    const minimal = questions.map((q) => ({
      id: q.question.id,
      selected: q.selected,
      marked: q.marked,
      hintUsed: q.hintUsed,
      eliminated: q.eliminated
    }));
    SessionStore.set(STORAGE_KEYS.examState, {
      subject,
      questions: minimal,
      currentIndex,
      startTime,
      duration,
      remaining
    });
  },

  restore: (allQuestions) => {
    const saved = SessionStore.get<{
      subject: Subject | null;
      questions: Array<{ id: number; selected: number | number[]; marked: boolean; hintUsed: boolean; eliminated: number[] }>;
      currentIndex: number;
      startTime: number;
      duration: number;
      remaining: number;
    } | null>(STORAGE_KEYS.examState, null);
    if (!saved || !saved.questions || saved.questions.length === 0) return false;
    // 数据合法性校验：startTime 不能为未来、remaining 不能为负、currentIndex 不能越界
    if (saved.startTime > Date.now()) return false;
    if (saved.remaining < 0) return false;
    if (saved.currentIndex < 0 || saved.currentIndex >= saved.questions.length) return false;
    // 重建完整考试题目
    const qMap = new Map(allQuestions.map((q) => [q.id, q]));
    const examQuestions: ExamQuestionState[] = saved.questions
      .map((s) => {
        const q = qMap.get(s.id);
        if (!q) return null;
        return {
          question: q,
          selected: s.selected,
          marked: s.marked,
          hintUsed: s.hintUsed,
          eliminated: s.eliminated
        };
      })
      .filter((x): x is ExamQuestionState => x !== null);
    if (examQuestions.length === 0) return false;
    // 清理已有计时器，避免 restore 重复创建 interval 导致双倍速倒计时
    const { timerId: oldTimerId } = get();
    if (oldTimerId) clearInterval(oldTimerId);
    // 基于时间戳重算 remaining，避免恢复时使用过期的 remaining
    const elapsed = Date.now() - saved.startTime;
    const realRemaining = Math.max(0, saved.duration - elapsed);
    if (realRemaining <= 0) return false; // 已超时，不再恢复
    const timerId = setInterval(() => get().tick(), 1000);
    set({
      running: true,
      subject: saved.subject,
      questions: examQuestions,
      currentIndex: saved.currentIndex,
      startTime: saved.startTime,
      duration: saved.duration,
      remaining: realRemaining,
      timerId,
      result: null
    });
    return true;
  }
}));
