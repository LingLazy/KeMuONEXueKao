/**
 * 分类导航视图
 * - 五大分类组完整索引
 * - 每组下展示其小分类列表
 * - 显示每分类题数与正确率
 * - 点击进入对应分类练习
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, loadQuestions, hexToRgba } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS } from '@/data/categoryGroups';
import { useProgressStore } from '@/stores/progressStore';
import { useAsyncData, useIsMobile } from '@/hooks';
import { calcAccuracy, calcProgress } from '@/utils';
import EmptyState from '@/components/common/EmptyState';
import GeoBgDecor from '@/components/common/GeoBgDecor';

export default function CategoriesView() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // 通过通用异步数据 Hook 加载题库，统一管理 loading / error / reload 三态
  // data 为 null 表示加载中（与原 useState null 语义一致），[] 表示已加载但为空
  const { data: questions, error, reload } = useAsyncData(() => loadQuestions(), []);
  const answered = useProgressStore((s) => s.answered);

  // 各分类的题数与正确率
  const catStats = useMemo(() => {
    const stats: Record<string, { count: number; answered: number; correct: number; accuracy: number }> = {};
    Object.keys(CATEGORIES).forEach((ck) => {
      const cat = CATEGORIES[ck];
      if (!cat) return;
      let answeredNum = 0;
      let correctNum = 0;
      cat.ids.forEach((id) => {
        const rec = answered[id];
        if (rec) {
          answeredNum++;
          if (rec.correct) correctNum++;
        }
      });
      stats[ck] = {
        count: cat.ids.length,
        answered: answeredNum,
        correct: correctNum,
        accuracy: calcAccuracy(correctNum, answeredNum)
      };
    });
    return stats;
  }, [answered]);

  // 大分类的整体统计
  const groupStats = useMemo(() => {
    return GROUP_KEYS.map((gk) => {
      const group = CATEGORY_GROUPS[gk];
      const ids = new Set<number>();
      group.cats.forEach((ck) => {
        CATEGORIES[ck]?.ids.forEach((id) => ids.add(id));
      });
      let answeredNum = 0;
      let correctNum = 0;
      ids.forEach((id) => {
        const rec = answered[id];
        if (rec) {
          answeredNum++;
          if (rec.correct) correctNum++;
        }
      });
      return {
        key: gk,
        name: group.name,
        color: group.color,
        icon: group.icon,
        desc: group.desc,
        total: ids.size,
        answered: answeredNum,
        correct: correctNum,
        accuracy: calcAccuracy(correctNum, answeredNum),
        progress: calcProgress(answeredNum, ids.size)
      };
    });
  }, [answered]);

  const enterCategory = (cat: string) => {
    navigate(`/practice/${cat}`);
  };

  // 错误态：优先于其他分支返回，提供重试入口
  if (error) {
    return (
      <div className="view view-categories">
        <GeoBgDecor variant="error" />
        <div className="view-container">
          <EmptyState
            title="数据加载失败"
            description={error}
            action={
              <button type="button" className="btn btn-primary" onClick={reload}>
                重试加载
              </button>
            }
          />
        </div>
      </div>
    );
  }

  // 加载中：题库未加载完成时显示骨架占位
  if (!questions) {
    return (
      <div className="view view-categories">
        <GeoBgDecor variant="loading" />
        <div className="view-container">
          <div
            className="cats-loading"
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '80px 24px',
              color: 'var(--text-secondary, #6b7280)'
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                border: '3px solid var(--border, rgba(0,0,0,0.08))',
                borderTopColor: 'var(--primary, #0d9488)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <p style={{ margin: 0, fontSize: 14 }}>正在加载分类数据…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view view-categories">
      {/* 分类视图装饰层 · 同心环 + 横竖虚线束 + 三角切片 */}
      <GeoBgDecor variant="categories" />
      <div className="view-container">
        <header className="section-header">
          <span className="section-eyebrow">Categories</span>
          <h1 className="section-title">分类<span className="title-accent">导航</span></h1>
          <p className="section-desc">
            大分类专题 · 小分类完整索引 · 共 {Object.values(CATEGORIES).reduce((s, c) => s + c.ids.length, 0)} 题分布
          </p>
        </header>

        {/* 大分类汇总卡片 */}
        <section className="cats-overview" aria-label="大分类汇总">
          {groupStats.map((g, i) => (
            <motion.button
              key={g.key}
              type="button"
              className={`group-card ${g.answered > 0 ? 'has-progress' : ''}`}
              style={{
                '--group-color': g.color,
                '--group-color-bg': hexToRgba(g.color, 0.1),
                '--group-color-border': hexToRgba(g.color, 0.25)
              } as React.CSSProperties}
              onClick={() => enterCategory(g.key)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              aria-label={`进入${g.name}，共${g.total}题`}
            >
              <div className="group-card-head">
                <GroupIcon name={g.icon} />
                <div className="group-card-head-text">
                  <h2 className="group-card-name">{g.name}</h2>
                  <span className="group-card-total">{g.total} 题</span>
                </div>
                <svg className="group-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <p className="group-card-desc">{g.desc}</p>
              <div className="group-card-stats">
                <div className="group-stat">
                  <span className="group-stat-label">已答</span>
                  <span className="group-stat-value">{g.answered}/{g.total}</span>
                </div>
                <div className="group-stat">
                  <span className="group-stat-label">正确率</span>
                  <span className="group-stat-value">{g.accuracy}%</span>
                </div>
                <div className="group-stat">
                  <span className="group-stat-label">进度</span>
                  <span className="group-stat-value">{g.progress}%</span>
                </div>
              </div>
              {g.progress > 0 && (
                <div className="group-card-progress" aria-hidden="true">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${g.progress}%`, background: g.color }}
                    />
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </section>

        {/* 小分类详细列表 */}
        <section className="cats-detail" aria-labelledby="cats-detail-title">
          <header className="section-header">
            <span className="section-eyebrow">Sub Categories</span>
            <h2 id="cats-detail-title" className="section-title">小分类<span className="title-accent">详细</span>索引</h2>
            <p className="section-desc">点击任意小分类进入对应练习</p>
          </header>

          <div className="cats-detail-list">
            {GROUP_KEYS.map((gk, gi) => {
              const group = CATEGORY_GROUPS[gk];
              const gStat = groupStats.find((g) => g.key === gk);
              if (!gStat) return null;
              return (
                <motion.div
                  key={gk}
                  className="cat-detail-group"
                  style={{ '--group-color': group.color } as React.CSSProperties}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: gi * 0.05 }}
                >
                  <div className="cat-detail-group-head">
                    <GroupIcon name={group.icon} />
                    <h3 className="cat-detail-group-name">{group.name}</h3>
                    <span className="cat-detail-group-count">{group.cats.length} 个小分类</span>
                  </div>
                  <div className={`cat-detail-items ${isMobile ? 'mobile' : ''}`}>
                    {group.cats.map((ck) => {
                      const cat = CATEGORIES[ck];
                      const stat = catStats[ck];
                      if (!cat || !stat) return null;
                      return (
                        <button
                          key={ck}
                          type="button"
                          className="cat-detail-item"
                          onClick={() => enterCategory(ck)}
                          aria-label={`进入${cat.name}，共${stat.count}题`}
                        >
                          <div className="cat-detail-item-head">
                            <span className="cat-detail-item-name">{cat.name}</span>
                            <span className="cat-detail-item-count">{stat.count}</span>
                          </div>
                          {stat.answered > 0 && (
                            <div className="cat-detail-item-meta">
                              <span className="meta-answered">已答 {stat.answered}</span>
                              <span className="meta-acc">正确率 {stat.accuracy}%</span>
                            </div>
                          )}
                          {stat.answered > 0 && (
                            <div className="cat-detail-item-progress" aria-hidden="true">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${(stat.answered / stat.count) * 100}%`,
                                  background: group.color
                                }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/** 大分类图标 */
function GroupIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    traffic: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <circle cx="12" cy="7" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="17" r="1.5" />
      </>
    ),
    star: <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />,
    car: (
      <>
        <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
        <circle cx="7.5" cy="17.5" r="2" />
        <circle cx="16.5" cy="17.5" r="2" />
      </>
    ),
    safety: (
      <>
        <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    other: (
      <>
        <path d="M3 7h18M3 12h18M3 17h18" />
      </>
    )
  };
  return (
    <div className="group-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icons[name] ?? icons.star}
      </svg>
    </div>
  );
}
