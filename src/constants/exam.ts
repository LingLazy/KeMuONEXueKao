/**
 * 考试配置常量
 * 集中管理各科目考试的题量、时长、及格分、每题分值等配置
 * 从 src/stores/examStore.ts 迁移，消除内联计算 `45 * 60 * 1000` 等魔法数字
 */
import type { Subject } from '@/types';

/** 科目一考试时长（毫秒）：45 分钟 */
export const EXAM_DURATION_KE1_MS = 45 * 60 * 1000;

/** 科目四考试时长（毫秒）：30 分钟 */
export const EXAM_DURATION_KE4_MS = 30 * 60 * 1000;

/** 按科目区分的考试配置：题量 / 时长 / 及格分 / 每题分值 */
export const EXAM_CONFIG: Record<
  Subject,
  {
    /** 题目数量 */
    count: number;
    /** 考试时长（毫秒） */
    duration: number;
    /** 及格分数 */
    passScore: number;
    /** 每题分值 */
    pointsPerQuestion: number;
  }
> = {
  // 科目一：100 题 × 1 分 = 100 分，45 分钟，90 分及格
  ke1: { count: 100, duration: EXAM_DURATION_KE1_MS, passScore: 90, pointsPerQuestion: 1 },
  // 科目四：50 题 × 2 分 = 100 分，30 分钟，90 分及格
  ke4: { count: 50, duration: EXAM_DURATION_KE4_MS, passScore: 90, pointsPerQuestion: 2 }
};

/** 向后兼容：默认考试时长（取科目一配置） */
export const EXAM_DURATION = EXAM_DURATION_KE1_MS;

/** 向后兼容：默认考试题数（取科目一配置） */
export const EXAM_COUNT = EXAM_CONFIG.ke1.count;

/** 向后兼容：默认及格分数（取科目一配置） */
export const EXAM_PASS_SCORE = EXAM_CONFIG.ke1.passScore;
