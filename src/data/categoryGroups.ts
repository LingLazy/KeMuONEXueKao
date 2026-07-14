/**
 * 大分类（分类组）定义
 * 26 个一级分类按主题聚合为 5 个大分类组，便于在分类页/首页分组展示
 * - laws 法规常识：驾驶证/机动车登记/信号/通行/高速
 * - penalty 违法处罚：记分/强制措施/行政处罚/刑事处罚/事故处理
 * - vehicle 车辆常识：结构/操纵装置/安全装置/日常维护
 * - safety 安全驾驶：驾驶状态/危险源/操作/保护/共用道路/复杂环境/夜间/紧急/事故防范/急救
 * - misc 其他案例：其他/案例分析
 */
import type { CategoryGroup, GroupKey } from '@/types';

export const CATEGORY_GROUPS: Record<GroupKey, CategoryGroup> = {
  laws: {
    name: '法规常识',
    icon: 'traffic',
    // 深电光蓝（与主色同色系，强化法规权威感）
    color: '#1e40af',
    desc: '驾驶证申领、机动车登记、交通信号、道路通行规定',
    cats: ['cat01', 'cat02', 'cat04', 'cat05', 'cat06']
  },
  penalty: {
    name: '违法处罚',
    icon: 'star',
    // 工业琥珀（警示语义）
    color: '#b4530a',
    desc: '违法记分、行政强制、行政处罚、刑事处罚、事故处理',
    cats: ['cat03', 'cat07', 'cat08', 'cat09', 'cat10']
  },
  vehicle: {
    name: '车辆常识',
    icon: 'car',
    // 深钢灰（工业金属感）
    color: '#475569',
    desc: '车辆结构、操纵装置、安全装置、日常检查与维护',
    cats: ['cat11', 'cat12', 'cat13', 'cat14']
  },
  safety: {
    name: '安全驾驶',
    icon: 'safety',
    // 深森林绿（安全语义）
    color: '#166534',
    desc: '驾驶状态、危险源识别、安全操作、复杂环境、紧急避险、急救',
    cats: [
      'cat15', 'cat16', 'cat17', 'cat18', 'cat19',
      'cat20', 'cat21', 'cat22', 'cat23', 'cat24'
    ]
  },
  misc: {
    name: '其他案例',
    icon: 'other',
    // 深紫电（科技感）
    color: '#6d28d9',
    desc: '其他知识点与安全文明案例分析',
    cats: ['cat25', 'cat26']
  }
};

/** 大分类 key 列表（有序） */
export const GROUP_KEYS = Object.keys(CATEGORY_GROUPS) as GroupKey[];

/** 判断 key 是否为大分类 key */
export function isGroupKey(key: string): key is GroupKey {
  return key in CATEGORY_GROUPS;
}
