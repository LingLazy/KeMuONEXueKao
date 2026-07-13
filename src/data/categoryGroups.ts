/**
 * 大分类（分类组）定义
 * 6大分类聚合24小分类，题目可在多分类出现（多对多关系）
 * 图片题大分类通过 dynamic 字段动态匹配所有 is_image_question=true 的题目
 */
import type { CategoryGroup, GroupKey } from '@/types';

export const CATEGORY_GROUPS: Record<GroupKey, CategoryGroup> = {
  image: {
    name: '图片题',
    icon: 'image',
    color: '#0ea5e9',
    desc: '交通标志、道路标线、交警手势、仪表信号等图像题目',
    cats: ['sign', 'mark', 'police'],
    dynamic: 'image'
  },
  penalty: {
    name: '记分处罚',
    icon: 'star',
    color: '#ea580c',
    desc: '违法记分、罚款处罚、酒驾醉驾',
    cats: ['score', 'fine', 'drink']
  },
  scenario: {
    name: '驾驶情境',
    icon: 'road',
    color: '#14b8a6',
    desc: '高速公路、夜间、恶劣天气、紧急情况等场景题',
    cats: ['highway', 'night', 'weather', 'emergency', 'fault', 'accident']
  },
  rules: {
    name: '行车规则',
    icon: 'traffic',
    color: '#10b981',
    desc: '限速、灯光、让行、超车、停车等通行规则',
    cats: ['speed', 'lights', 'yield', 'overtake', 'park']
  },
  vehicle: {
    name: '车辆常识',
    icon: 'car',
    color: '#64748b',
    desc: '驾驶证、机动车基础、安全装置、安全行车、考试申领',
    cats: ['license', 'basic', 'install', 'safety', 'exam']
  },
  ev: {
    name: '新能源',
    icon: 'bolt',
    color: '#22c55e',
    desc: '新能源车辆与智能辅助驾驶',
    cats: ['newenergy', 'intelligent']
  }
};

/** 大分类 key 列表（有序） */
export const GROUP_KEYS = Object.keys(CATEGORY_GROUPS) as GroupKey[];

/** 判断 key 是否为大分类 key */
export function isGroupKey(key: string): key is GroupKey {
  return key in CATEGORY_GROUPS;
}
