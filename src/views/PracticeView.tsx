/**
 * 题库练习视图
 * - 左侧栏：分类树（大分类 + 小分类）
 * - 主区：当前题目卡片
 * - 顶部：搜索 + 筛选（乱序/仅错题/仅收藏）
 * - 底部：上下题导航 + 题目跳转
 * - 移动端：滑动切题 + 底部快捷栏
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, loadMnemonics } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS, isGroupKey } from '@/data/categoryGroups';
import { usePracticeStore } from '@/stores/practiceStore';
import { useProgressStore } from '@/stores/progressStore';
import { useAsyncData, useHotkeys, useIsMobile } from '@/hooks';
import QuestionCard from '@/components/question/QuestionCard';
import EmptyState from '@/components/common/EmptyState';
import { QuestionCardSkeleton } from '@/components/common/Skeleton';
import Modal from '@/components/common/Modal';
import GeoBgDecor from '@/components/common/GeoBgDecor';
import SearchInput from '@/components/common/SearchInput';
import type { Question, Mnemonic } from '@/types';

export default function PracticeView() {
  const { cat } = useParams<{ cat?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [showSidebar, setShowSidebar] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);

  const practice = usePracticeStore();
  const progress = useProgressStore();

  // 通过通用异步数据 Hook 加载口诀数据，同时并行执行 practice.init() 完成题库自加载
  // practice.init() 负责题库加载并通过 practice.initialized 状态驱动加载态 UI（init 内部有防重入）
  // useAsyncData 负责统一管理 Promise.all 的 error / reload 三态，替代原手动 cancelled + setState 模式
  // data 为 Mnemonic[] | null，null 时 mnemonics 回退为 []（与原 useState 初始值语义一致）
  const { data: mnemonicsData, error, reload } = useAsyncData(
    () => Promise.all([practice.init(), loadMnemonics()]).then(([, ms]) => ms),
    []
  );
  const mnemonics = mnemonicsData ?? [];

  // 当前分类变更时重新筛选（init 完成后驱动首次筛选）
  // 首次初始化时恢复持久化进度（分类 + 索引 + 科目），避免刷新后回到第一题
  // 后续路由参数变化时按路由指定的分类筛选
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!practice.initialized) return;
    // 首次完成初始化：尝试恢复持久化进度（仅恢复一次，避免路由切换时重复覆盖）
    if (!restoredRef.current) {
      restoredRef.current = true;
      const saved = practice.restore();
      // 若路由携带 cat 参数且与恢复的分类不同，优先采用路由参数（支持深链接分享）
      const targetCat = cat ?? 'all';
      if (saved && saved.cat !== targetCat && targetCat !== 'all') {
        practice.setCategory(targetCat);
      } else if (saved) {
        // 恢复成功后基于恢复的分类与科目重算列表，并修正索引越界
        practice.reapplyFilters();
      } else {
        // 无持久化进度时按路由参数筛选
        if (practice.currentCat !== targetCat) {
          practice.setCategory(targetCat);
        } else {
          practice.reapplyFilters();
        }
      }
      return;
    }
    // 后续路由参数变化：按新分类筛选
    const targetCat = cat ?? 'all';
    if (practice.currentCat !== targetCat) {
      practice.setCategory(targetCat);
    } else {
      practice.reapplyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, practice.initialized]);

  // 当前题目
  const currentQuestion = practice.list[practice.index];
  // 匹配口诀：优先使用题目自带的专属口诀（question.mnemonic），
  // 确保每道题显示针对性口诀而非同一分类下所有题目共用一条；
  // 题目无专属口诀时回退到 mnemonics.json 中按分类匹配的通用口诀
  const currentMnemonic = useMemo(() => {
    if (!currentQuestion) return null;
    // 优先：题目自带专属口诀（来自原题库 concise_explain 提炼）
    const qMnemonic = currentQuestion.mnemonic?.trim();
    if (qMnemonic) {
      return {
        cat: currentQuestion.category,
        title: '本题速记',
        text: qMnemonic,
        explain: currentQuestion.concise_analysis?.trim() || '',
        details: []
      } as Mnemonic;
    }
    // 回退：按分类匹配通用口诀
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

  // 加载中
  if (!practice.initialized) {
    return (
      <div className="view view-practice">
        <GeoBgDecor variant="loading" />
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
        <GeoBgDecor variant="practice-empty" />
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
      <GeoBgDecor variant="practice" />
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
              counts={getCategoryCounts(practice.allQuestions)}
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
              counts={getCategoryCounts(practice.allQuestions)}
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
              {/* 科目筛选器：全部 / 科目一 / 科目四 */}
              <div className="practice-subject-filter" role="radiogroup" aria-label="科目筛选">
                {([
                  { key: 'all', label: '全部' },
                  { key: 'ke1', label: '科一' },
                  { key: 'ke4', label: '科四' }
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={practice.subject === opt.key}
                    className={`subject-chip ${practice.subject === opt.key ? 'active' : ''}`}
                    onClick={() => practice.setSubject(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="practice-toolbar-right">
              <SearchInput
                value={practice.search}
                onChange={practice.setSearch}
                placeholder="搜索题目关键词"
                ariaLabel="搜索题目"
                containerClassName="practice-search"
              />
              <button
                type="button"
                className={`toggle-chip ${practice.onlyWrong ? 'active' : ''}`}
                onClick={() => practice.toggleOnlyWrong()}
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
                onClick={() => practice.toggleOnlyBookmark()}
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
