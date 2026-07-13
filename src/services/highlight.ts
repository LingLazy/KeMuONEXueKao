/**
 * 关键词高亮服务
 * 将题目文本中的关键词包裹为 <mark class="kw"> 标签
 * - danger（红色）：违法/吊销/逃逸等危险词
 * - num（蓝色）：纯数字+单位
 * - 默认（主色）：其余关键词
 */
import { escapeHtml } from '@/utils';

/** 危险词列表（红色高亮） */
const DANGER_WORDS = [
  '饮酒', '醉酒', '酒驾', '醉驾', '肇事逃逸', '逃逸',
  '违法', '伪造', '变造', '吊销', '撤销', '暂扣', '注销'
];

/** 数字+单位正则（蓝色高亮） */
const NUM_RE = /^(\d+)\s*(km\/h|公里|米|分|元|年|日|天|次)?$/i;

/**
 * 题目文本关键词高亮
 * 输入：text 原文，keywords 关键词数组
 * 返回：高亮后的 HTML 字符串（已转义，防 XSS）
 */
export function highlightKeywords(text: string, keywords?: string[]): string {
  if (!text) return '';
  let html = escapeHtml(text);
  if (!keywords || keywords.length === 0) return html;

  // 去重并按长度降序，避免短词覆盖长词
  const sorted = [...new Set(keywords)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  sorted.forEach((kw) => {
    if (!kw) return;
    const cls = DANGER_WORDS.includes(kw) ? 'danger' : (NUM_RE.test(kw) ? 'num' : '');
    const clsAttr = cls ? ` class="kw ${cls}"` : ' class="kw"';
    // 转义正则特殊字符
    const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 避免在已包裹的标签内再次替换
    const re = new RegExp(`(${safe})(?![^<]*</mark>)`, 'g');
    html = html.replace(re, `<mark${clsAttr}>$1</mark>`);
  });
  return html;
}
