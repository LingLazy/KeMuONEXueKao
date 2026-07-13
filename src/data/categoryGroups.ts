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
    // 工业蚀刻色板 · 深电光蓝（与主色同色系，强化品牌识别）
    color: '#1e40af',
    desc: '交通标志、道路标线、交警手势、仪表信号等图像题目',
    cats: ['sign', 'mark', 'police'],
    dynamic: 'image'
  },
  penalty: {
    name: '记分处罚',
    icon: 'star',
    // 工业琥珀（与 accent 同色系，警示语义）
    color: '#b4530a',
    desc: '违法记分、罚款处罚、酒驾醉驾',
    cats: ['score', 'fine', 'drink']
  },
  scenario: {
    name: '驾驶情境',
    icon: 'road',
    // 深青绿（取代薄荷绿#14b8a6，降低卡通感）
    color: '#0f766e',
    desc: '高速公路、夜间、恶劣天气、紧急情况等场景题',
    cats: ['highway', 'night', 'weather', 'emergency', 'fault', 'accident']
  },
  rules: {
    name: '行车规则',
    icon: 'traffic',
    // 深森林绿（取代亮翠绿#10b981，加重质感）
    color: '#166534',
    desc: '限速、灯光、让行、超车、停车等通行规则',
    cats: ['speed', 'lights', 'yield', 'overtake', 'park']
  },
  vehicle: {
    name: '车辆常识',
    icon: 'car',
    // 深钢灰（加深原#64748b，工业金属感）
    color: '#475569',
    desc: '驾驶证、机动车基础、安全装置、安全行车、考试申领',
    cats: ['license', 'basic', 'install', 'safety', 'exam']
  },
  ev: {
    name: '新能源',
    icon: 'bolt',
    // 深紫电（取代亮草绿#22c55e，新能源科技感）
    color: '#6d28d9',
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
