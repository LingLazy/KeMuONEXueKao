/**
 * 口诀总览视图
 * - 左侧：口诀分类导航（按小分类聚合）
 * - 右侧：选中分类的口诀列表
 * - 支持搜索关键字
 * - 虚拟滚动优化长列表性能
 * - 移动端：单栏布局，分类切换为顶部下拉
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { loadMnemonics, CATEGORIES } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS } from '@/data/categoryGroups';
import { useIsMobile } from '@/hooks';
import EmptyState from '@/components/common/EmptyState';
import { ListItemSkeleton } from '@/components/common/Skeleton';
import type { Mnemonic } from '@/types';

export default function MnemonicsView() {
  const isMobile = useIsMobile();
  const [mnemonics, setMnemonics] = useState<Mnemonic[] | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedMnemonic, setSelectedMnemonic] = useState<Mnemonic | null>(null);

  useEffect(() => {
    loadMnemonics().then(setMnemonics).catch(console.error);
  }, []);

  // 按分类聚合
  const grouped = useMemo(() => {
    const map: Record<string, Mnemonic[]> = {};
    mnemonics?.forEach((m) => {
      const arr = map[m.cat];
      if (arr) {
        arr.push(m);
      } else {
        map[m.cat] = [m];
      }
    });
    return map;
  }, [mnemonics]);

  // 分类列表（按大分类聚合）
  const catList = useMemo(() => {
    const list: Array<{ key: string; name: string; color: string; count: number; groupName: string }> = [];
    GROUP_KEYS.forEach((gk) => {
      const group = CATEGORY_GROUPS[gk];
      if (!group) return;
      group.cats.forEach((ck) => {
        const arr = grouped[ck];
        if (arr && arr.length > 0) {
          list.push({
            key: ck,
            name: CATEGORIES[ck]?.name ?? ck,
            color: group.color,
            count: arr.length,
            groupName: group.name
          });
        }
      });
    });
    return list;
  }, [grouped]);

  // 当前显示的口诀（按选中分类+搜索过滤）
  const filtered = useMemo(() => {
    if (!mnemonics) return [];
    let list = mnemonics;
    if (activeCat !== 'all') {
      list = list.filter((m) => m.cat === activeCat);
    }
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(kw) ||
          m.text.toLowerCase().includes(kw) ||
          m.explain.toLowerCase().includes(kw) ||
          m.details.some((d) => d.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [mnemonics, activeCat, search]);

  // 虚拟滚动
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5
  });

  const handleSelect = (m: Mnemonic | null) => {
    setSelectedMnemonic(m);
    if (isMobile && m) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!mnemonics) {
    return (
      <div className="view view-mnemonics">
        <div className="view-container">
          <div className="mnemonics-loading">
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view view-mnemonics">
      <div className="view-container">
        {/* 标题区 */}
        <header className="section-header">
          <span className="section-eyebrow">Mnemonics</span>
          <h1 className="section-title">速记<span className="title-accent">口诀</span>总览</h1>
          <p className="section-desc">
            共 {mnemonics.length} 条记忆口诀，覆盖 {catList.length} 个分类，按分类系统化记忆更高效
          </p>
        </header>

        {/* 搜索栏 */}
        <div className="mnemonics-search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="搜索口诀标题、内容、解释…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索口诀"
          />
          {search && (
            <button type="button" className="mnemonics-search-clear" onClick={() => setSearch('')} aria-label="清空搜索">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="mnemonics-layout">
          {/* 左侧分类导航（桌面） */}
          {!isMobile && (
            <aside className="mnemonics-aside" aria-label="口诀分类">
              <div className="mnemonics-aside-head">
                <h2 className="mnemonics-aside-title">分类</h2>
                <span className="mnemonics-aside-count">{catList.length}</span>
              </div>
              <nav className="mnemonics-cat-list">
                <button
                  type="button"
                  className={`mnemonics-cat-item ${activeCat === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCat('all')}
                >
                  <span className="mnemonics-cat-name">全部口诀</span>
                  <span className="mnemonics-cat-count">{mnemonics.length}</span>
                </button>
                {catList.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`mnemonics-cat-item ${activeCat === c.key ? 'active' : ''}`}
                    onClick={() => setActiveCat(c.key)}
                    style={{ '--cat-color': c.color } as React.CSSProperties}
                  >
                    <span className="mnemonics-cat-name">{c.name}</span>
                    <span className="mnemonics-cat-count">{c.count}</span>
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* 移动端分类切换 */}
          {isMobile && (
            <div className="mnemonics-mobile-cats">
              <select
                value={activeCat}
                onChange={(e) => setActiveCat(e.target.value)}
                aria-label="选择分类"
              >
                <option value="all">全部口诀 ({mnemonics.length})</option>
                {catList.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 右侧口诀列表 */}
          <main className="mnemonics-main">
            <div className="mnemonics-list-head">
              <h2 className="mnemonics-list-title">
                {activeCat === 'all'
                  ? '全部口诀'
                  : CATEGORIES[activeCat]?.name ?? '口诀'}
              </h2>
              <span className="mnemonics-list-count">{filtered.length} 条</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                title="未找到匹配的口诀"
                description={search ? '尝试更换关键字' : '该分类暂无口诀'}
              />
            ) : (
              <div
                ref={(el) => { parentRef.current = el; }}
                className="mnemonics-list"
                style={{ height: 'calc(100vh - 280px)', minHeight: '400px', overflow: 'auto' }}
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative'
                  }}
                >
                  {virtualizer.getVirtualItems().map((vi) => {
                    const m = filtered[vi.index];
                    if (!m) return null;
                    return (
                      <div
                        key={vi.key}
                        data-index={vi.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${vi.start}px)`
                        }}
                      >
                        <MnemonicCard
                          mnemonic={m}
                          expanded={selectedMnemonic === m}
                          onToggle={() => handleSelect(selectedMnemonic === m ? null : m)}
                          catName={CATEGORIES[m.cat]?.name ?? m.cat}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/** 单条口诀卡片 */
function MnemonicCard({
  mnemonic,
  expanded,
  onToggle,
  catName
}: {
  mnemonic: Mnemonic;
  expanded: boolean;
  onToggle: () => void;
  catName: string;
}) {
  return (
    <motion.div
      layout
      className={`mnemonic-card ${expanded ? 'expanded' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button type="button" className="mnemonic-card-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="mnemonic-card-head-left">
          <span className="mnemonic-card-cat">{catName}</span>
          <h3 className="mnemonic-card-title">{mnemonic.title}</h3>
        </div>
        <div className="mnemonic-card-head-right">
          <p className="mnemonic-card-text">{mnemonic.text}</p>
          <svg
            className={`mnemonic-card-chevron ${expanded ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="mnemonic-card-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {mnemonic.explain && (
              <div className="mnemonic-section">
                <span className="mnemonic-section-label">解释</span>
                <p className="mnemonic-explain">{mnemonic.explain}</p>
              </div>
            )}
            {mnemonic.details.length > 0 && (
              <div className="mnemonic-section">
                <span className="mnemonic-section-label">分条说明</span>
                <ul className="mnemonic-details">
                  {mnemonic.details.map((d, i) => (
                    <li key={i}>
                      <span className="mnemonic-detail-num">{i + 1}</span>
                      <span className="mnemonic-detail-text">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
