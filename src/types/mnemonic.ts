/**
 * 科目一/科目四教考 · 速记口诀业务域类型定义
 * 包含速记口诀结构
 * 对应 src/data/mnemonics.json 数据结构
 */

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
