/**
 * 主页视图
 * - Hero 区：品牌主标题 + 副标题 + 核心数据
 * - 学习进度卡片：已答/正确率/收藏/总题数
 * - 六大分类入口（大分类卡片）
 * - 快捷功能入口：开始练习 / 模拟考试 / 知识学习 / 口诀速记
 * - 学习雷达图（按大分类统计正确率）
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProgressStore } from '@/stores/progressStore';
import { CATEGORIES, loadQuestions, loadMnemonics, hexToRgba } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS } from '@/data/categoryGroups';
import { useTilt } from '@/hooks';
import type { Question } from '@/types';

// 图标路径常量（模块级，避免每次渲染重建）
const STAT_ICONS: Record<string, React.ReactNode> = {
  book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />,
  check: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  star: <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />,
  trending: <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />
};

const QUICK_ICONS: Record<string, React.ReactNode> = {
  book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />,
  star: <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />,
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  check: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
};

export default function HomeView() {
  const navigate = useNavigate();
  // 选择原始状态引用，避免选择器返回新对象导致 React 19 useSyncExternalStore 无限重渲染
  const answered = useProgressStore((s) => s.answered);
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const total = useProgressStore((s) => s.total);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mnemonicCount, setMnemonicCount] = useState(0);

  // 由原始状态派生统计指标（useMemo 保证引用稳定）
  const stats = useMemo(() => {
    const answeredList = Object.values(answered);
    const answeredCount = answeredList.length;
    const correctCount = answeredList.filter((r) => r.correct).length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    return { answered: answeredCount, correct: correctCount, accuracy, total, progress };
  }, [answered, total]);

  // 加载题库与口诀（用于统计）
  useEffect(() => {
    loadQuestions().then(setQuestions).catch(console.error);
    loadMnemonics().then((m) => setMnemonicCount(m.length)).catch(console.error);
  }, []);

  // 各大分类的题目数
  const groupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    GROUP_KEYS.forEach((gk) => {
      const group = CATEGORY_GROUPS[gk];
      let count = 0;
      // 聚合小分类
      group.cats.forEach((catKey) => {
        count += CATEGORIES[catKey]?.ids.length ?? 0;
      });
      // 图片题动态匹配
      if (group.dynamic === 'image') {
        count += questions.filter((q) => q.is_image_question).length;
      }
      map[gk] = count;
    });
    return map;
  }, [questions]);

  // 雷达图数据：各大分类的正确率
  const radarData = useMemo(() => {
    return GROUP_KEYS.map((gk) => {
      const group = CATEGORY_GROUPS[gk];
      const ids = new Set<number>();
      group.cats.forEach((catKey) => {
        CATEGORIES[catKey]?.ids.forEach((id) => ids.add(id));
      });
      if (group.dynamic === 'image') {
        questions.forEach((q) => {
          if (q.is_image_question) ids.add(q.id);
        });
      }
      let correct = 0;
      let total = 0;
      ids.forEach((id) => {
        const rec = answered[id];
        if (rec) {
          total++;
          if (rec.correct) correct++;
        }
      });
      return {
        key: gk,
        name: group.name,
        color: group.color,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        answered: total,
        total: ids.size
      };
    });
  }, [answered, questions]);

  // 入口分类卡片
  const sortedGroups = useMemo(() => {
    return GROUP_KEYS.filter((gk) => (groupCounts[gk] ?? 0) > 0)
      .sort((a, b) => (groupCounts[b] ?? 0) - (groupCounts[a] ?? 0));
  }, [groupCounts]);

  // 进入分类练习
  const enterCategory = (cat: string) => {
    navigate(`/practice/${cat}`);
  };

  return (
    <div className="view view-home">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-content">
          <motion.div
            className="home-hero-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="dot" /> 2026年7月最新版 · 公安部令第163号
          </motion.div>
          <motion.h1
            className="home-hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            科目一<span className="title-accent">速记通</span>
          </motion.h1>
          <motion.p
            className="home-hero-desc"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {questions.length} 道完整题库 · {mnemonicCount} 条速记口诀 · 24 分类系统化学习 · 全真模拟考试 · 离线可用
          </motion.p>
          <motion.div
            className="home-hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <button type="button" className="btn btn-primary btn-lg btn-shine" onClick={() => navigate('/practice/all')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              开始练习
            </button>
            <button type="button" className="btn btn-ghost btn-lg btn-shine" onClick={() => navigate('/exam')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              模拟考试
            </button>
          </motion.div>
        </div>
      </section>

      {/* 数据统计卡片 */}
      <section className="home-stats" aria-label="学习进度概览">
        <StatCard label="已答题数" value={stats.answered} total={stats.total} icon="book" color="primary" />
        <StatCard label="正确率" value={`${stats.accuracy}%`} icon="check" color="success" />
        <StatCard label="收藏题目" value={Object.keys(bookmarks).length} icon="star" color="accent" />
        <StatCard label="学习进度" value={`${stats.progress}%`} icon="trending" color="info" />
      </section>

      {/* 学习进度条 */}
      {stats.progress > 0 && (
        <section className="home-progress" aria-label="学习进度">
          <div className="home-progress-head">
            <span className="home-progress-label">总学习进度</span>
            <span className="home-progress-value">{stats.answered} / {stats.total}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.progress}%` }} />
          </div>
        </section>
      )}

      {/* 分类入口 */}
      <section className="home-section" aria-labelledby="home-cats-title">
        <header className="section-header">
          <span className="section-eyebrow">Categories</span>
          <h2 id="home-cats-title" className="section-title">六大<span className="title-accent">分类</span>专题</h2>
          <p className="section-desc">按专题系统化练习，每个分类聚合相关题目，便于针对性强化</p>
        </header>
        <div className="home-cats-grid">
          {sortedGroups.map((gk, i) => {
            const group = CATEGORY_GROUPS[gk];
            const count = groupCounts[gk] ?? 0;
            const radar = radarData.find((r) => r.key === gk);
            const colorBg = hexToRgba(group.color, 0.1);
            return (
              <CatCard
                key={gk}
                gk={gk}
                index={i}
                group={group}
                count={count}
                radar={radar}
                colorBg={colorBg}
                onClick={() => enterCategory(gk)}
              />
            );
          })}
        </div>
      </section>

      {/* 学习雷达图 */}
      {radarData.some((r) => r.answered > 0) && (
        <section className="home-section" aria-labelledby="home-radar-title">
          <header className="section-header">
            <span className="section-eyebrow">Progress</span>
            <h2 id="home-radar-title" className="section-title">学习<span className="title-accent">雷达</span>图</h2>
            <p className="section-desc">实时展示各大分类的掌握程度，红色越满代表正确率越高</p>
          </header>
          <div className="home-radar">
            <RadarChart data={radarData} />
          </div>
        </section>
      )}

      {/* 快捷功能 */}
      <section className="home-section" aria-labelledby="home-quick-title">
        <header className="section-header">
          <span className="section-eyebrow">Quick Access</span>
          <h2 id="home-quick-title" className="section-title">快捷<span className="title-accent">入口</span></h2>
        </header>
        <div className="home-quick-grid">
          <QuickCard
            title="知识学习"
            desc="系统化交通法规知识体系"
            color="#10b981"
            icon="book"
            onClick={() => navigate('/knowledge')}
          />
          <QuickCard
            title="口诀速记"
            desc={`${mnemonicCount} 条速记口诀与详细解释`}
            color="#ea580c"
            icon="star"
            onClick={() => navigate('/mnemonics')}
          />
          <QuickCard
            title="分类导航"
            desc="24 小分类完整索引"
            color="#0ea5e9"
            icon="grid"
            onClick={() => navigate('/categories')}
          />
          <QuickCard
            title="全真考试"
            desc="100 题 45 分钟全真模拟"
            color="#0d9488"
            icon="check"
            onClick={() => navigate('/exam')}
          />
        </div>
      </section>
    </div>
  );
}

/** 数据统计卡片 */
function StatCard({
  label,
  value,
  total,
  icon,
  color
}: {
  label: string;
  value: string | number;
  total?: number;
  icon: 'book' | 'check' | 'star' | 'trending';
  color: 'primary' | 'success' | 'accent' | 'info';
}) {
  return (
    <motion.div
      className={`stat-card stat-${color} card-hover-target btn-shine`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <div className="stat-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {STAT_ICONS[icon]}
        </svg>
      </div>
      <div className="stat-info">
        <span className="stat-value">{value}{total ? <span className="stat-total">/{total}</span> : null}</span>
        <span className="stat-label">{label}</span>
      </div>
      {/* 底部三色彩带（hover 显示） */}
      <span className="card-strip" aria-hidden="true" />
    </motion.div>
  );
}

/** 快捷入口卡片 */
function QuickCard({
  title,
  desc,
  color,
  icon,
  onClick
}: {
  title: string;
  desc: string;
  color: string;
  icon: 'book' | 'star' | 'grid' | 'check';
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // 快捷卡片附加 3D 倾斜效果（桌面端悬停时跟随鼠标轻微倾斜）
  useTilt(ref, { max: 0.7 });
  return (
    <motion.button
      ref={ref}
      type="button"
      className="quick-card card-hover-target tilt-card btn-shine"
      style={{ '--qc-color': color, '--deco-opacity': 0.1 } as React.CSSProperties}
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 左上角菱形几何装饰（hover 透明度倍增） */}
      <svg
        className="deco-diamond"
        style={{ top: '14px', left: '14px', width: '20px', height: '20px', color }}
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <rect x="5" y="0" width="14.14" height="14.14" transform="rotate(45 5 0)" stroke="currentColor" strokeWidth="1" fill="none" />
        <rect x="9" y="4" width="5.66" height="5.66" transform="rotate(45 9 4)" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
      <div className="quick-card-icon tilt-layer" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {QUICK_ICONS[icon]}
        </svg>
      </div>
      <h3 className="quick-card-title">{title}</h3>
      <p className="quick-card-desc">{desc}</p>
      {/* 底部三色彩带（hover 显示） */}
      <span className="card-strip" aria-hidden="true" />
    </motion.button>
  );
}

/** 分类入口卡片（封装 tilt-card + btn-shine） */
interface CatCardProps {
  gk: string;
  index: number;
  group: typeof CATEGORY_GROUPS[keyof typeof CATEGORY_GROUPS];
  count: number;
  radar: { accuracy: number; answered: number } | undefined;
  colorBg: string;
  onClick: () => void;
}

function CatCard({ gk, index, group, count, radar, colorBg, onClick }: CatCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  // 分类大卡片附加 3D 倾斜（强度略大，呈现金属面板视差感）
  useTilt(ref, { max: 0.85 });
  return (
    <motion.button
      ref={ref}
      key={gk}
      type="button"
      className="cat-card card-hover-target tilt-card btn-shine"
      data-cat={gk}
      style={{
        '--cat-color': group.color,
        '--cat-color-bg': colorBg,
        '--deco-opacity': 0.1
      } as React.CSSProperties}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      aria-label={`进入${group.name}分类，共${count}题`}
    >
      {/* 右下角同心圆装饰（hover 透明度倍增） */}
      <svg
        className="deco-circles"
        style={{ right: '-24px', bottom: '-24px', width: '128px', height: '128px', color: group.color }}
        viewBox="0 0 128 128"
        aria-hidden="true"
      >
        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="64" cy="64" r="40" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="64" cy="64" r="24" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="64" cy="64" r="8" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
      <div className="cat-card-index tilt-layer">{String(index + 1).padStart(2, '0')}</div>
      <div className="cat-card-body tilt-layer">
        <h3 className="cat-card-name">{group.name}</h3>
        <p className="cat-card-desc">{group.desc}</p>
        <div className="cat-card-meta">
          <span className="cat-card-count">
            <span className="num">{count}</span> 题
          </span>
          {radar && radar.answered > 0 && (
            <span className="cat-card-acc">正确率 {radar.accuracy}%</span>
          )}
        </div>
      </div>
      <div className="cat-card-arrow" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      {/* 底部三色彩带（hover 显示） */}
      <span className="card-strip" aria-hidden="true" />
    </motion.button>
  );
}

/** 雷达图（SVG 自绘） */
function RadarChart({
  data
}: {
  data: Array<{ key: string; name: string; color: string; accuracy: number; answered: number; total: number }>;
}) {
  const size = 320;
  const center = size / 2;
  const maxRadius = 110;
  const count = data.length;
  const angleStep = (Math.PI * 2) / count;

  // 计算各点坐标
  const points = data.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (d.accuracy / 100) * maxRadius;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      labelX: center + Math.cos(angle) * (maxRadius + 30),
      labelY: center + Math.sin(angle) * (maxRadius + 30),
      ...d
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // 网格圈
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart" aria-label="分类正确率雷达图">
      {/* 网格 */}
      {gridLevels.map((level) => {
        const r = level * maxRadius;
        const polyPoints = data
          .map((_, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
          })
          .join(' ');
        return <polygon key={level} points={polyPoints} className="radar-grid" />;
      })}
      {/* 轴线 */}
      {data.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + Math.cos(angle) * maxRadius}
            y2={center + Math.sin(angle) * maxRadius}
            className="radar-axis"
          />
        );
      })}
      {/* 数据多边形 */}
      <polygon points={polygonPoints} className="radar-polygon" />
      {/* 数据点 */}
      {points.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r={4} fill={p.color} className="radar-point" />
      ))}
      {/* 标签 */}
      {points.map((p) => (
        <text
          key={p.key}
          x={p.labelX}
          y={p.labelY}
          className="radar-label"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {p.name}
          <tspan x={p.labelX} y={p.labelY + 14} className="radar-label-val">
            {p.accuracy}%
          </tspan>
        </text>
      ))}
    </svg>
  );
}
