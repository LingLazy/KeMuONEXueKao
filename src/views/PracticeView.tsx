/**
 * 题库练习视图
 * - 左侧栏：分类树（大分类 + 小分类）
 * - 主区：当前题目卡片
 * - 顶部：搜索 + 筛选（乱序/仅错题/仅收藏）
 * - 底部：上下题导航 + 题目跳转
 * - 移动端：滑动切题 + 底部快捷栏
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, loadQuestions, loadMnemonics } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS, isGroupKey } from '@/data/categoryGroups';
import { usePracticeStore } from '@/stores/practiceStore';
import { useProgressStore } from '@/stores/progressStore';
import { useHotkeys, useIsMobile } from '@/hooks';
import QuestionCard from '@/components/question/QuestionCard';
import EmptyState from '@/components/common/EmptyState';
import { QuestionCardSkeleton } from '@/components/common/Skeleton';
import Modal from '@/components/common/Modal';
import type { Question, Mnemonic } from '@/types';

export default function PracticeView() {
  const { cat } = useParams<{ cat?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [mnemonics, setMnemonics] = useState<Mnemonic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);

  const practice = usePracticeStore();
  const progress = useProgressStore();

  // 加载题库与口诀（带错误状态，便于 UI 反馈与重试）
  const loadData = () => {
    setError(null);
    Promise.all([
      loadQuestions().then(setQuestions),
      loadMnemonics().then(setMnemonics)
    ]).catch((err) => {
      setError(err instanceof Error ? err.message : '数据加载失败');
    });
  };

  useEffect(() => {
    // 卸载保护：避免组件卸载后仍 setState 触发警告
    let cancelled = false;
    setError(null);
    Promise.all([
      loadQuestions().then((qs) => { if (!cancelled) setQuestions(qs); }),
      loadMnemonics().then((ms) => { if (!cancelled) setMnemonics(ms); })
    ]).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : '数据加载失败');
    });
    return () => { cancelled = true; };
  }, []);

  // 错题ID集合
  const wrongIds = useMemo(() => {
    const set = new Set<number>();
    Object.entries(progress.answered).forEach(([id, rec]) => {
      if (!rec.correct) set.add(Number(id));
    });
    return set;
  }, [progress.answered]);

  // 收藏ID集合
  const bookmarkIds = useMemo(() => {
    return new Set(Object.keys(progress.bookmarks).map((k) => Number(k)));
  }, [progress.bookmarks]);

  // 当前分类变更或筛选条件变化时重新筛选
  useEffect(() => {
    if (!questions) return;
    const targetCat = cat ?? 'all';
    if (practice.currentCat !== targetCat || practice.list.length === 0) {
      practice.setCategory(targetCat, questions, wrongIds, bookmarkIds);
    } else {
      // 筛选条件（错题/收藏）变化时，仅更新数据源引用并重算列表
      practice.setDataSource(questions, wrongIds, bookmarkIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, questions, wrongIds, bookmarkIds]);

  // 当前题目
  const currentQuestion = practice.list[practice.index];
  // 匹配口诀
  const currentMnemonic = useMemo(() => {
    if (!currentQuestion) return null;
    return mnemonics.find((m) => m.cat === currentQuestion.category) ?? null;
  }, [currentQuestion, mnemonics]);

  // 键盘快捷键
  // 注：练习模式下选项选择逻辑封装在 QuestionCard 内部（含 localSelected/answered 状态），
  // 外部无法直接触发，因此未接入 select 快捷键；考试模式由 ExamView 接入 exam.select
  useHotkeys({
    prev: () => practice.prev(),
    next: () => practice.next(),
    toggleBookmark: () => currentQuestion && progress.toggleBookmark(currentQuestion.id)
  });

  // 切换分类
  const switchCategory = (newCat: string) => {
    navigate(`/practice/${newCat}`);
    setShowSidebar(false);
  };

  // 加载失败：错误态优先于其他分支
  if (error) {
    return (
      <div className="view view-practice">
        <div className="geo-bg-decor" aria-hidden="true">
          <div className="geo-bg-grid" />
          <div className="geo-dots-lg" />
        </div>
        <div className="view-container">
          <EmptyState
            title="数据加载失败"
            description={error}
            action={
              <button type="button" className="btn btn-primary" onClick={loadData}>
                重试加载
              </button>
            }
          />
        </div>
      </div>
    );
  }

  // 加载中
  if (!questions) {
    return (
      <div className="view view-practice">
        <div className="geo-bg-decor" aria-hidden="true">
          <div className="geo-bg-grid" />
          <div className="geo-dots-sm" />
        </div>
        <div className="view-container">
          <QuestionCardSkeleton />
        </div>
      </div>
    );
  }

  // 空题列表
  if (practice.list.length === 0) {
    return (
      <div className="view view-practice">
        <div className="geo-bg-decor" aria-hidden="true">
          <div className="geo-bg-grid" />
          <div className="geo-cross-marks" />
        </div>
        <div className="view-container">
          <EmptyState
            title="该分类暂无题目"
            description={practice.onlyWrong ? '当前没有错题记录，去做一些题吧' : '请选择其他分类'}
            action={
              <button type="button" className="btn btn-primary" onClick={() => switchCategory('all')}>
                查看全部题目
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view view-practice">
      {/* 练习模式装饰层 · 网格底纹 + 平行斜线 + 十字坐标点 */}
      <div className="geo-bg-decor" aria-hidden="true">
        <div className="geo-bg-grid" />
        <div className="geo-parallel-lines" />
        <div className="geo-cross-marks" />
        <div className="geo-hatch-block" style={{ top: '12%', right: '4%' }} />
      </div>
      {/* 移动端顶栏：分类切换按钮 */}
      {isMobile && (
        <div className="practice-mobile-bar">
          <button
            type="button"
            className="practice-cat-toggle"
            onClick={() => setShowSidebar(true)}
            aria-label="打开分类选择"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            <span>{getCatDisplayName(practice.currentCat)}</span>
          </button>
          <span className="practice-mobile-count">{practice.list.length} 题</span>
        </div>
      )}

      <div className="practice-layout">
        {/* 左侧栏（桌面端常驻，移动端模态） */}
        {isMobile ? (
          <Modal open={showSidebar} onClose={() => setShowSidebar(false)} title="选择分类" size="md">
            <CategoryTree
              currentCat={practice.currentCat}
              onSelect={switchCategory}
              counts={getCategoryCounts(questions)}
            />
          </Modal>
        ) : (
          <aside className="practice-sidebar" aria-label="分类导航">
            <div className="practice-sidebar-head">
              <h2 className="practice-sidebar-title">分类</h2>
              <button
                type="button"
                className={`mini-btn ${practice.currentCat === 'all' ? '' : 'ghost'}`}
                onClick={() => switchCategory('all')}
              >
                全部
              </button>
            </div>
            <CategoryTree
              currentCat={practice.currentCat}
              onSelect={switchCategory}
              counts={getCategoryCounts(questions)}
            />
          </aside>
        )}

        {/* 主区 */}
        <main className="practice-main">
          {/* 顶部工具栏 */}
          <div className="practice-toolbar">
            <div className="practice-toolbar-left">
              <h1 className="practice-title">{getCatDisplayName(practice.currentCat)}</h1>
              <span className="practice-count">
                <span className="num">{practice.list.length}</span> 题
              </span>
            </div>
            <div className="practice-toolbar-right">
              <div className="practice-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  placeholder="搜索题目关键词"
                  value={practice.search}
                  onChange={(e) => practice.setSearch(e.target.value, questions)}
                  aria-label="搜索题目"
                />
              </div>
              <button
                type="button"
                className={`toggle-chip ${practice.onlyWrong ? 'active' : ''}`}
                onClick={() => practice.toggleOnlyWrong(questions, wrongIds)}
                aria-pressed={practice.onlyWrong}
                title="仅显示错题"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                错题
              </button>
              <button
                type="button"
                className={`toggle-chip ${practice.onlyBookmark ? 'active' : ''}`}
                onClick={() => practice.toggleOnlyBookmark(questions, bookmarkIds)}
                aria-pressed={practice.onlyBookmark}
                title="仅显示收藏"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                收藏
              </button>
              <button
                type="button"
                className={`toggle-chip ${practice.shuffled ? 'active' : ''}`}
                onClick={() => practice.toggleShuffle()}
                aria-pressed={practice.shuffled}
                title="乱序"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
                乱序
              </button>
            </div>
          </div>

          {/* 题目卡片 */}
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <QuestionCard
                  question={currentQuestion}
                  mnemonic={currentMnemonic}
                  index={practice.index + 1}
                  total={practice.list.length}
                  onNext={practice.next}
                  onPrev={practice.prev}
                  swipeEnabled={isMobile}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 底部导航 */}
          <nav className="practice-nav" aria-label="题目导航">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={practice.prev}
              disabled={practice.index === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              上一题
            </button>
            <button
              type="button"
              className="practice-nav-jump"
              onClick={() => setShowJumpModal(true)}
              aria-label="跳转到指定题号"
            >
              <span className="practice-nav-current">{practice.index + 1}</span>
              <span className="practice-nav-sep">/</span>
              <span className="practice-nav-total">{practice.list.length}</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={practice.next}
              disabled={practice.index >= practice.list.length - 1}
            >
              下一题
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </nav>
        </main>
      </div>

      {/* 题目跳转模态 */}
      <Modal open={showJumpModal} onClose={() => setShowJumpModal(false)} title="跳转题目" size="md">
        <div className="jump-grid">
          {practice.list.map((q, i) => {
            const rec = progress.getRecord(q.id);
            const isAnswered = Boolean(rec);
            const isCorrect = rec?.correct;
            const isCurrent = i === practice.index;
            return (
              <button
                key={q.id}
                type="button"
                className={`jump-cell ${isCurrent ? 'current' : ''} ${
                  isAnswered ? (isCorrect ? 'correct' : 'wrong') : ''
                }`}
                onClick={() => {
                  practice.setIndex(i);
                  setShowJumpModal(false);
                }}
                aria-label={`跳转到第${i + 1}题`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

/** 分类树 */
function CategoryTree({
  currentCat,
  onSelect,
  counts
}: {
  currentCat: string;
  onSelect: (cat: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="category-tree" role="list">
      {GROUP_KEYS.map((gk) => {
        const group = CATEGORY_GROUPS[gk];
        const groupCount = group.cats.reduce((sum, ck) => sum + (counts[ck] ?? 0), 0);
        const isGroupActive = currentCat === gk;
        return (
          <div key={gk} className="cat-group" data-group={gk} role="listitem">
            <button
              type="button"
              className={`cat-group-head ${isGroupActive ? 'active' : ''}`}
              onClick={() => onSelect(gk)}
              aria-current={isGroupActive ? 'true' : undefined}
              style={{ '--cat-color': group.color } as React.CSSProperties}
            >
              <span className="cat-group-name">{group.name}</span>
              <span className="cat-group-count">{groupCount}</span>
            </button>
            <div className="cat-group-items">
              {group.cats.map((ck) => {
                const cat = CATEGORIES[ck];
                if (!cat) return null;
                const isCatActive = currentCat === ck;
                return (
                  <button
                    key={ck}
                    type="button"
                    className={`cat-item ${isCatActive ? 'active' : ''}`}
                    onClick={() => onSelect(ck)}
                    aria-current={isCatActive ? 'true' : undefined}
                  >
                    <span className="cat-item-name">{cat.name}</span>
                    <span className="cat-item-count">{cat.ids.length}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 获取分类显示名 */
function getCatDisplayName(cat: string): string {
  if (cat === 'all') return '全部题目';
  if (isGroupKey(cat)) return CATEGORY_GROUPS[cat].name;
  return CATEGORIES[cat]?.name ?? '分类';
}

/** 计算各分类题目数 */
function getCategoryCounts(questions: Question[]): Record<string, number> {
  const counts: Record<string, number> = {};
  questions.forEach((q) => {
    counts[q.category] = (counts[q.category] ?? 0) + 1;
    q.tags.forEach((t) => {
      counts[t] = (counts[t] ?? 0) + 1;
    });
  });
  return counts;
}
