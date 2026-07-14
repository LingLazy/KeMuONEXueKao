/**
 * 科目一/科目四教考 · UI 交互业务域类型定义
 * 包含 Toast 提示、视图名称、主题模式等界面相关类型
 */

/** Toast 提示类型 */
export type ToastType = '' | 'success' | 'error' | 'info';

/** Toast 项 */
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/** 视图名称 */
export type ViewName = 'home' | 'knowledge' | 'practice' | 'exam' | 'mnemonics' | 'categories';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark';
