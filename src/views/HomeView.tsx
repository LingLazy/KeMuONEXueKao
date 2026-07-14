/**
 * 主页视图
 * - Hero 区：品牌主标题 + 副标题 + 核心数据
 * - 学习进度卡片：已答/正确率/收藏/总题数
 * - 五大分类入口（大分类卡片）
 * - 快捷功能入口：开始练习 / 模拟考试 / 知识学习 / 口诀速记
 * - 学习雷达图（按大分类统计正确率）
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProgressStore } from '@/stores/progressStore';
import { toast } from '@/stores/toastStore';
import { CATEGORIES, loadQuestions, loadMnemonics } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS } from '@/data/categoryGroups';
import { useProgressStats, useAsyncData } from '@/hooks';
import { hexToRgba } from '@/utils/color';
import { Icon } from '@/components/common/Icon';
import GeoBgDecor from '@/components/common/GeoBgDecor';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { StatCard } from '@/views/home/StatCard';
import { QuickCard } from '@/views/home/QuickCard';
import { CatCard } from '@/views/home/CatCard';
import { RadarChart } from '@/components/charts/RadarChart';

export default function HomeView() {
  const navigate = useNavigate();
  // answered 原始引用用于雷达图统计（useProgressStats 仅返回派生数值）
  const answered = useProgressStore((s) => s.answered);
  const stats = useProgressStats();

  // 加载题库与口诀计数（useAsyncData 管理三态与卸载取消）
  const { data: loadData, error } = useAsyncData(async () => {
    const [qs, ms] = await Promise.all([loadQuestions(), loadMnemonics()]);
    return { questionCount: qs.length, mnemonicCount: ms.length };
  }, []);
  const questionCount = loadData?.questionCount ?? 0;
  const mnemonicCount = loadData?.mnemonicCount ?? 0;

  // 数据加载失败时通过 Toast 提示用户
  // 依赖数组仅含 error，同一错误值不会重复触发，确保同一错误只提示一次
  useEffect(() => {
    if (error) {
      toast.error('数据加载失败，请刷新重试');
    }
  }, [error]);

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
      map[gk] = count;
    });
    return map;
  }, []);

  // 雷达图数据：各大分类的正确率
  const radarData = useMemo(() => {
    return GROUP_KEYS.map((gk) => {
      const group = CATEGORY_GROUPS[gk];
      const ids = new Set<number>();
      group.cats.forEach((catKey) => {
        CATEGORIES[catKey]?.ids.forEach((id) => ids.add(id));
      });
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
  }, [answered]);

  // 入口分类卡片（按题目数降序）
  const sortedGroups = useMemo(() => {
    return GROUP_KEYS.filter((gk) => (groupCounts[gk] ?? 0) > 0)
      .sort((a, b) => (groupCounts[b] ?? 0) - (groupCounts[a] ?? 0));
  }, [groupCounts]);

  // 雷达图数据映射为 RadarChart 组件所需格式
  const radarChartData = useMemo(() => {
    return radarData.map((r) => ({
      label: r.name,
      value: r.accuracy,
      color: r.color
    }));
  }, [radarData]);

  // 进入分类练习
  const enterCategory = (cat: string) => {
    navigate(`/practice/${cat}`);
  };

  return (
    <div className="view view-home">
      {/* 主页装饰层 · 品牌光晕 + S 曲线 + 涟漪环 + 三角切片 (Hero 区已自带点阵/同心圆/虚线) */}
      <GeoBgDecor variant="home" />
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        {/* Hero 区扩展装饰 · 波浪线 + 大点阵 (独立层,避免 home-hero-bg 的 z-index:-1 影响) */}
        <div className="geo-wave-lines" aria-hidden="true" />
        <div className="home-hero-content">
          <motion.div
            className="home-hero-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="dot" /> 科目一 / 科目四在线学习与模拟考试平台
          </motion.div>
          <motion.h1
            className="home-hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            KeMuONE<span className="title-accent">Xue</span>Kao
          </motion.h1>
          <motion.p
            className="home-hero-desc"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {questionCount} 道完整题库 · {mnemonicCount} 条速记口诀 · 系统化分类学习 · 全真模拟考试 · 离线可用
          </motion.p>
          <motion.div
            className="home-hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <button type="button" className="btn btn-primary btn-lg btn-shine" onClick={() => navigate('/practice/all')}>
              <Icon name="arrow-right" size={18} />
              开始练习
            </button>
            <button type="button" className="btn btn-ghost btn-lg btn-shine" onClick={() => navigate('/exam')}>
              <Icon name="check-square" size={18} />
              模拟考试
            </button>
          </motion.div>
        </div>
      </section>

      {/* 数据统计卡片 */}
      <section className="home-stats" aria-label="学习进度概览">
        <StatCard label="已答题数" value={stats.answered} total={stats.total} icon="book" color="primary" />
        <StatCard label="正确率" value={`${stats.accuracy}%`} icon="check" color="success" />
        <StatCard label="收藏题目" value={stats.bookmarkCount} icon="star" color="accent" />
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
          <h2 id="home-cats-title" className="section-title">五大<span className="title-accent">分类</span>专题</h2>
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
            <RadarChart data={radarChartData} />
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
            desc="小分类完整索引"
            color="#0ea5e9"
            icon="grid"
            onClick={() => navigate('/categories')}
          />
          <QuickCard
            title="全真考试"
            desc="全真模拟考试"
            color="#0d9488"
            icon="check"
            onClick={() => navigate('/exam')}
          />
        </div>
      </section>
      {/* 主页页脚 · 品牌信息 + 仓库链接 + 免责声明（紧凑单行） */}
      <GlobalFooter />
    </div>
  );
}
