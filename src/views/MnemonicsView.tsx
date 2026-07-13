/**
 * 口诀总览视图
 * - 左侧：口诀分类导航（按小分类聚合）
 * - 右侧：选中分类的口诀列表
 * - 支持搜索关键字
 * - 虚拟滚动优化长列表性能
 * - 键盘快捷键：J/K 上下导航，Enter 展开/收起，/ 聚焦搜索，Esc 收起
 * - 学习模式：一键展开全部口诀用于通读复习
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

/** 判断目标是否为可输入元素（聚焦时屏蔽快捷键） */
function isInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

export default function MnemonicsView() {
  const isMobile = useIsMobile();
  const [mnemonics, setMnemonics] = useState<Mnemonic[] | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedMnemonic, setSelectedMnemonic] = useState<Mnemonic | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const searchRef = useRef<HTMLInputElement | null>(null);

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

  // 学习模式：切换全部展开，退出单选模式
  const toggleStudyMode = () => {
    setStudyMode((v) => {
      const next = !v;
      if (next) {
        setSelectedMnemonic(null);
      }
      return next;
    });
  };

  // 键盘快捷键：J/K 上下导航，Enter 展开/收起，/ 聚焦搜索，Esc 收起
  useEffect(() => {
    if (studyMode || filtered.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) {
        if (e.key === 'Escape' && document.activeElement === searchRef.current) {
          searchRef.current?.blur();
        }
        return;
      }
      switch (e.key) {
        case 'j':
        case 'J':
        case 'ArrowDown': {
          e.preventDefault();
          setFocusIndex((i) => {
            const next = Math.min(i + 1, filtered.length - 1);
            virtualizer.scrollToIndex(next, { align: 'center' });
            return next;
          });
          break;
        }
        case 'k':
        case 'K':
        case 'ArrowUp': {
          e.preventDefault();
          setFocusIndex((i) => {
            const next = Math.max(i - 1, 0);
            virtualizer.scrollToIndex(next, { align: 'center' });
            return next;
          });
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const m = filtered[focusIndex];
          if (m) handleSelect(selectedMnemonic === m ? null : m);
          break;
        }
        case '/': {
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
          break;
        }
        case 'Escape': {
          if (selectedMnemonic) {
            setSelectedMnemonic(null);
          }
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, focusIndex, selectedMnemonic, studyMode, virtualizer]);

  // 过滤结果变化时重置焦点索引
  useEffect(() => {
    setFocusIndex(0);
  }, [activeCat, search]);

  // 动态计算虚拟滚动容器高度：占满视口剩余空间，替代硬编码魔术数字
  // 监听窗口尺寸变化与上方元素高度变化，确保列表始终占满可用高度
  useEffect(() => {
    if (studyMode) return; // 学习模式使用页面滚动，无需固定高度
    const el = parentRef.current;
    if (!el) return;
    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      // 视口高度减去列表顶部偏移，再预留底部间距
      const available = window.innerHeight - rect.top - 24;
      el.style.height = `${Math.max(360, available)}px`;
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    // ResizeObserver 监听上方兄弟元素高度变化（如快捷键提示显示/隐藏）
    const layoutEl = el.closest('.mnemonics-layout');
    let observer: ResizeObserver | null = null;
    if (layoutEl && layoutEl.parentElement) {
      observer = new ResizeObserver(updateHeight);
      // 观察布局容器内的所有兄弟区块
      Array.from(layoutEl.parentElement.children).forEach((sib) => {
        if (sib !== layoutEl) observer?.observe(sib);
      });
    }
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      observer?.disconnect();
    };
  }, [studyMode, mnemonics]);

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
      {/* 构成主义几何背景装饰层 */}
      <div className="geo-bg-decor" aria-hidden="true">
        <div className="geo-bg-grid" />
        <div className="geo-arc-tr" />
        <div className="geo-diag-line" />
        <div className="geo-square-bl" />
      </div>
      <div className="view-container">
        {/* 标题区 */}
        <header className="section-header">
          <span className="section-eyebrow">Mnemonics</span>
          <h1 className="section-title">速记<span className="title-accent">口诀</span>总览</h1>
          <p className="section-desc">
            共 {mnemonics.length} 条记忆口诀，覆盖 {catList.length} 个分类，按分类系统化记忆更高效
          </p>
        </header>

        {/* 搜索栏 + 工具栏 */}
        <div className="mnemonics-toolbar">
          <div className="mnemonics-search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              placeholder="搜索口诀标题、内容、解释…（按 / 快速聚焦）"
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
          {/* 学习模式切换 · 一键展开/收起全部口诀 */}
          <button
            type="button"
            className={`study-mode-btn ${studyMode ? 'active' : ''}`}
            onClick={toggleStudyMode}
            aria-pressed={studyMode}
            title={studyMode ? '退出学习模式' : '学习模式：展开全部口诀'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span>{studyMode ? '退出通读' : '通读模式'}</span>
          </button>
        </div>

        {/* 键盘快捷键提示（桌面端，非学习模式时显示） */}
        {!isMobile && !studyMode && filtered.length > 0 && (
          <div className="mnemonics-shortcut-hint" aria-hidden="true">
            <kbd>J</kbd><kbd>K</kbd> 导航 · <kbd>Enter</kbd> 展开 · <kbd>/</kbd> 搜索 · <kbd>Esc</kbd> 收起
          </div>
        )}

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
            ) : studyMode ? (
              /* 学习模式：渲染全部口诀（展开态），不使用虚拟滚动 */
              <div className="mnemonics-study-list">
                <AnimatePresence mode="popLayout">
                  {filtered.map((m, i) => (
                    <motion.div
                      key={`${m.title}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                    >
                      <MnemonicCard
                        mnemonic={m}
                        expanded={true}
                        onToggle={() => {}}
                        catName={CATEGORIES[m.cat]?.name ?? m.cat}
                        studyMode
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div
                ref={(el) => { parentRef.current = el; }}
                className="mnemonics-list"
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
                    const isFocused = vi.index === focusIndex;
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
                          focused={isFocused}
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
  catName,
  focused = false,
  studyMode = false
}: {
  mnemonic: Mnemonic;
  expanded: boolean;
  onToggle: () => void;
  catName: string;
  focused?: boolean;
  studyMode?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // 复制口诀文本到剪贴板，1.5s 后恢复
  const handleCopy = async () => {
    const text = `${mnemonic.title}：${mnemonic.text}\n\n解释：${mnemonic.explain}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  const cardClass = [
    'mnemonic-card',
    expanded ? 'expanded' : '',
    focused ? 'focused' : '',
    studyMode ? 'study-mode' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
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
      {/* 展开内容：CSS grid-template-rows 0fr→1fr 过渡，GPU 友好，避免 height:auto 布局抖动 */}
      <div className={`mnemonic-card-body-wrap ${expanded ? 'open' : ''}`}>
        <div className="mnemonic-card-body">
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
            {/* 复制口诀按钮 · 1.5s 反馈 */}
            <div className="mnemonic-card-actions">
              <button
                type="button"
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                aria-label={copied ? '已复制' : '复制口诀'}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    复制口诀
                  </>
                )}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
