/**
 * UI 交互相关常量
 * 集中管理视图层散落的魔法数字：考试倒计时阈值、复制反馈时长、虚拟滚动参数等
 */

/** 考试剩余时间低阈值（秒），低于此值触发紧迫提示样式（ExamView 顶部栏 low-time） */
export const LOW_TIME_THRESHOLD_SEC = 300;

/** 复制反馈 Toast 显示时长（毫秒），口诀卡片复制成功后 "已复制" 状态恢复时间 */
export const COPY_FEEDBACK_DURATION = 1500;

/** 虚拟滚动行高（px），MnemonicsView 口诀列表预估行高 */
export const VIRT_ROW_HEIGHT = 180;

/** 虚拟滚动 overscan 数量，视口外预渲染的行数 */
export const VIRT_OVERSCAN = 5;
