/**
 * 口诀总览视图
 * - 左侧：口诀分类导航（桌面）/ 顶部下拉（移动端）
 * - 右侧：选中分类的口诀列表
 * - 支持搜索关键字
 * - 桌面端：虚拟滚动优化长列表性能
 * - 移动端：全量渲染 + 整页自然滚动（不使用虚拟滚动）
 *   —— 虚拟滚动依赖「绝对定位 + 内部滚动容器」，在移动端会导致展开后的
 *      解释与分条说明被裁切、窗口滚动失效，表现为「口诀显示不全」
 * - 键盘快捷键：J/K 上下导航，Enter 展开/收起，/ 聚焦搜索，Esc 收起
 * - 学习模式：一键展开全部口诀用于通读复习
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { loadMnemonics, CATEGORIES } from '@/services/dataLoader';
import { CATEGORY_GROUPS, GROUP_KEYS } from '@/data/categoryGroups';
import { useAsyncData, useIsMobile, useMnemonicKeyboard } from '@/hooks';
import { Icon } from '@/components/common/Icon';
import EmptyState from '@/components/common/EmptyState';
import GeoBgDecor from '@/components/common/GeoBgDecor';
import SearchInput from '@/components/common/SearchInput';
import { ListItemSkeleton } from '@/components/common/Skeleton';
import { VIRT_ROW_HEIGHT, VIRT_OVERSCAN } from '@/constants/ui';
import { toast } from '@/stores/toastStore';
import type { Mnemonic } from '@/types';
import MnemonicCard from './mnemonics/MnemonicCard';

/** 移动端展开后滚动定位延迟（毫秒）：等待卡片高度过渡完成 */
const MOBILE_SCROLL_DELAY = 180;

export default function MnemonicsView() {
  const isMobile = useIsMobile();
  const { data: mnemonics, error } = useAsyncData(() => loadMnemonics(), []);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedMnemonic, setSelectedMnemonic] = useState<Mnemonic | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const searchRef = useRef<HTMLInputElement | null>(null);

  // 按分类聚合
  const grouped = useMemo(() => {
    const map: Record<string, Mnemonic[]> = {};
    mnemonics?.forEach((m) => {
      const arr = map[m.cat];
      if (arr) arr.push(m);
      else map[m.cat] = [m];
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
          list.push({ key: ck, name: CATEGORIES[ck]?.name ?? ck, color: group.color, count: arr.length, groupName: group.name });
        }
      });
    });
    return list;
  }, [grouped]);

  // 当前显示的口诀（按选中分类+搜索过滤）
  const filtered = useMemo(() => {
    if (!mnemonics) return [];
    let list = mnemonics;
    if (activeCat !== 'all') list = list.filter((m) => m.cat === activeCat);
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter((m) =>
        m.title.toLowerCase().includes(kw) || m.text.toLowerCase().includes(kw) ||
        m.explain.toLowerCase().includes(kw) || m.details.some((d) => d.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [mnemonics, activeCat, search]);

  // 移动端不使用虚拟滚动（详见文件头注释）
  const useVirtual = !isMobile;

  // 虚拟滚动（仅桌面端生效）
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: useVirtual ? filtered.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => VIRT_ROW_HEIGHT,
    overscan: VIRT_OVERSCAN
  });

  /**
   * 选中/取消选中口诀
   * - 移动端：展开后把该卡片滚动到视口顶部，确保解释与分条说明完整可见
   *   （此前用 window.scrollTo 无效，因为列表是内部滚动容器）
   */
  const handleSelect = (m: Mnemonic | null) => {
    setSelectedMnemonic(m);
    if (!isMobile || !m) return;
    const idx = filtered.indexOf(m);
    if (idx < 0) return;
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-mnemonic-index="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, MOBILE_SCROLL_DELAY);
  };

  /** 切换学习模式：开启时退出单选 */
  const toggleStudyMode = () => {
    setStudyMode((v) => {
      const next = !v;
      if (next) setSelectedMnemonic(null);
      return next;
    });
  };

  // 键盘导航：J/K 移动焦点，Enter 展开/收起，/ 聚焦搜索，Esc 收起（仅桌面虚拟列表）
  useMnemonicKeyboard({
    itemCount: useVirtual ? filtered.length : 0,
    selectedIndex: focusIndex,
    enabled: useVirtual && !studyMode && filtered.length > 0,
    onSelect: (index) => { setFocusIndex(index); virtualizer.scrollToIndex(index, { align: 'center' }); },
    onConfirm: (index) => { const m = filtered[index]; if (m) handleSelect(selectedMnemonic === m ? null : m); },
    onFocusSearch: () => { searchRef.current?.focus(); searchRef.current?.select(); },
    onEscape: () => { if (selectedMnemonic) setSelectedMnemonic(null); }
  });

  // 过滤结果变化时重置焦点索引
  useEffect(() => {
    setFocusIndex(0);
  }, [activeCat, search]);

  // 数据加载失败时通过 Toast 提示用户
  // 依赖数组仅含 error，同一错误值不会重复触发，确保同一错误只提示一次
  useEffect(() => {
    if (error) {
      toast.error('数据加载失败，请刷新重试');
    }
  }, [error]);

  if (!mnemonics) {
    return (
      <div className="view view-mnemonics">
        <GeoBgDecor variant="loading" />
        <div className="view-container">
          <div className="mnemonics-loading">
            <ListItemSkeleton /><ListItemSkeleton /><ListItemSkeleton /><ListItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`view view-mnemonics ${studyMode ? 'study-mode-active' : ''} ${useVirtual ? '' : 'mobile-flow'}`}>
      {/* 构成主义几何背景装饰层 · 口诀速记专题 */}
      <GeoBgDecor variant="mnemonics" />
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
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="搜索口诀标题、内容、解释…（按 / 快速聚焦）"
            ariaLabel="搜索口诀"
            containerClassName="mnemonics-search-bar"
            clearClassName="mnemonics-search-clear"
            inputRef={searchRef}
          />
          {/* 学习模式切换 · 一键展开/收起全部口诀 */}
          <button
            type="button"
            className={`study-mode-btn ${studyMode ? 'active' : ''}`}
            onClick={toggleStudyMode}
            aria-pressed={studyMode}
            title={studyMode ? '退出学习模式' : '学习模式：展开全部口诀'}
          >
            <Icon name="book-open" size={14} />
            <span>{studyMode ? '退出通读' : '通读模式'}</span>
          </button>
        </div>

        {/* 键盘快捷键提示（仅桌面虚拟列表模式） */}
        {useVirtual && !studyMode && filtered.length > 0 && (
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
                <button type="button" className={`mnemonics-cat-item ${activeCat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>
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
              <select value={activeCat} onChange={(e) => setActiveCat(e.target.value)} aria-label="选择分类">
                <option value="all">全部口诀 ({mnemonics.length})</option>
                {catList.map((c) => (
                  <option key={c.key} value={c.key}>{c.name} ({c.count})</option>
                ))}
              </select>
            </div>
          )}

          {/* 右侧口诀列表 */}
          <main className="mnemonics-main">
            <div className="mnemonics-list-head">
              <h2 className="mnemonics-list-title">
                {activeCat === 'all' ? '全部口诀' : CATEGORIES[activeCat]?.name ?? '口诀'}
              </h2>
              <span className="mnemonics-list-count">{filtered.length} 条</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState title="未找到匹配的口诀" description={search ? '尝试更换关键字' : '该分类暂无口诀'} />
            ) : studyMode ? (
              /* 通读模式：渲染全部口诀（展开态），不使用虚拟滚动 */
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
                      <MnemonicCard mnemonic={m} expanded={true} onToggle={() => {}} catName={CATEGORIES[m.cat]?.name ?? m.cat} studyMode />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : !useVirtual ? (
              /* 移动端：全量渲染 + 整页自然滚动，展开内容完整可见 */
              <div className="mnemonics-flow-list">
                {filtered.map((m, i) => (
                  <div key={`${m.title}-${i}`} data-mnemonic-index={i}>
                    <MnemonicCard
                      mnemonic={m}
                      expanded={selectedMnemonic === m}
                      onToggle={() => handleSelect(selectedMnemonic === m ? null : m)}
                      catName={CATEGORIES[m.cat]?.name ?? m.cat}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div ref={(el) => { parentRef.current = el; }} className="mnemonics-list">
                <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((vi) => {
                    const m = filtered[vi.index];
                    if (!m) return null;
                    return (
                      <div
                        key={vi.key}
                        data-index={vi.index}
                        ref={virtualizer.measureElement}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                      >
                        <MnemonicCard
                          mnemonic={m}
                          expanded={selectedMnemonic === m}
                          focused={vi.index === focusIndex}
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
