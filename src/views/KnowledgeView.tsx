/**
 * 知识学习视图
 * - 加载结构化考点知识 knowledge.json（26 个一级分类，157 个子考点）
 * - 左侧章节目录导航（一级分类 + 子考点两级层次）
 * - 右侧内容渲染区（直接渲染结构化 JSON，无需 Markdown 解析）
 * - 搜索关键字高亮（按标题/正文匹配，仅显示命中子考点）
 * - 滚动联动高亮当前章节
 * - 移动端：单栏布局，目录抽屉
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { loadKnowledgeData } from '@/services/dataLoader';
import { useAsyncData, useIsMobile, useScrollSpy } from '@/hooks';
import type { KnowledgePoint, KnowledgeSubPoint } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import GeoBgDecor from '@/components/common/GeoBgDecor';
import SearchInput from '@/components/common/SearchInput';
import { Skeleton } from '@/components/common/Skeleton';

/** 目录节点：一级分类或子考点 */
interface TocNode {
  /** DOM 锚点 ID（用于滚动定位与高亮匹配） */
  id: string;
  /** 层级：1 = 一级分类，2 = 子考点 */
  level: 1 | 2;
  /** 节点显示文本 */
  text: string;
}

/** 搜索命中检测：在标题与正文中查找关键字（大小写不敏感） */
function matchesKeyword(sp: KnowledgeSubPoint, kw: string): boolean {
  if (!kw) return true;
  const lower = kw.toLowerCase();
  return sp.title.toLowerCase().includes(lower) || sp.content.toLowerCase().includes(lower);
}

/**
 * 关键字高亮渲染
 * 输入：原始文本、关键字
 * 返回：React 节点数组，命中片段用 <mark> 包裹
 * 实现：用转义后的正则切分文本，捕获组会作为独立片段插入数组（奇数索引位）
 */
function highlightText(text: string, kw: string): ReactNode {
  const trimmed = kw.trim();
  if (!trimmed) return text;
  // 转义正则元字符，避免关键字含 ( ) * 等导致正则编译失败
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  // split 配合捕获组：匹配片段落在奇数索引位，无需依赖 regex.test 的 lastIndex
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="kw search-hit">{part}</mark>
      : <span key={i}>{part}</span>
  );
}

export default function KnowledgeView() {
  const isMobile = useIsMobile();
  // 通过通用异步数据 Hook 加载考点知识，统一管理 loading / error / reload 三态
  // data 为 null 表示加载中，加载完成后为 KnowledgePoint[]（与原 useState 语义一致）
  const { data: knowledgePoints, error: loadError, loading, reload } = useAsyncData(
    () => loadKnowledgeData(),
    []
  );
  const [search, setSearch] = useState('');
  const [showToc, setShowToc] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 关键字（去空格，便于下游匹配）
  const keyword = search.trim();

  /**
   * 过滤后的考点列表
   * - 无关键字：返回完整 26 个分类
   * - 有关键字：仅保留包含命中子考点的一级分类，且 sub_points 仅保留命中项
   */
  const filteredPoints = useMemo<KnowledgePoint[]>(() => {
    if (!knowledgePoints) return [];
    if (!keyword) return knowledgePoints;
    return knowledgePoints
      .map((p) => {
        const hitSubs = p.sub_points.filter((sp) => matchesKeyword(sp, keyword));
        return hitSubs.length > 0 ? { ...p, sub_points: hitSubs } : null;
      })
      .filter((p): p is KnowledgePoint => p !== null);
  }, [knowledgePoints, keyword]);

  /**
   * 目录节点列表
   * 一级分类 → level-1 节点；其下子考点 → level-2 节点
   * DOM id 规则：
   *   level-1: `kp-${point.id}`
   *   level-2: `kp-${point.id}-${sub.index 替换点号}`
   */
  const chapters = useMemo<TocNode[]>(() => {
    return filteredPoints.flatMap((p) => {
      const head: TocNode = { id: `kp-${p.id}`, level: 1, text: p.category_name };
      const subs: TocNode[] = p.sub_points.map((sp) => ({
        id: `kp-${p.id}-${sp.index.replace('.', '-')}`,
        level: 2,
        text: sp.title
      }));
      return [head, ...subs];
    });
  }, [filteredPoints]);

  // 通过通用滚动监听 Hook 高亮当前章节并计算阅读进度
  // chapters 为 TocNode 数组，其 id 规则为 kp-${point.id} / kp-${point.id}-${sub.index}
  // useScrollSpy 内部按 chap-${id} 查找 DOM 元素，与本视图 DOM id 规则一致，无需调整
  // useScrollSpy 内部已使用 useRafThrottle 节流，无需手动 rAF 节流
  const { activeId: activeChapter, readingProgress } = useScrollSpy(
    chapters.map((c) => c.id),
    80
  );

  // 跳转到章节：手动滚动定位，滚动过程中 useScrollSpy 会通过 scroll 事件自动更新高亮
  const jumpTo = (id: string) => {
    const el = document.getElementById(`chap-${id}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setShowToc(false);
  };

  // 加载中（含首次加载与重载）
  if (loading) {
    return (
      <div className="view view-knowledge">
        <GeoBgDecor variant="loading" />
        <div className="view-container">
          <div className="knowledge-loading">
            <Skeleton width="40%" height={28} />
            <Skeleton width="100%" height={20} />
            <Skeleton width="100%" height={20} />
            <Skeleton width="80%" height={20} />
            <Skeleton width="100%" height={120} radius={8} />
            <Skeleton width="100%" height={20} />
            <Skeleton width="60%" height={20} />
          </div>
        </div>
      </div>
    );
  }

  // 加载错误
  if (loadError) {
    return (
      <div className="view view-knowledge">
        <GeoBgDecor variant="error" />
        <div className="view-container">
          <EmptyState
            title="考点知识加载失败"
            description={loadError}
            action={
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={reload}
              >
                {loading ? '加载中…' : '重试'}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view view-knowledge">
      {/* 构成主义几何背景装饰层 · 知识学习专题 */}
      <GeoBgDecor variant="knowledge" />
      {/* 阅读进度条 · 固定在视图顶部 */}
      <div className="reading-progress-bar" aria-hidden="true">
        <div
          className="reading-progress-fill-js"
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      <div className="view-container">
        {/* 标题区 */}
        <header className="section-header">
          <span className="section-eyebrow">Knowledge</span>
          <h1 className="section-title">系统<span className="title-accent">知识</span>学习</h1>
          <p className="section-desc">
            覆盖交通法规、违法处罚、车辆常识、安全驾驶等 26 大知识模块，系统化掌握必备考点
          </p>
        </header>

        {/* 搜索 */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="搜索考点关键字…"
          ariaLabel="搜索考点"
          containerClassName="knowledge-search-bar"
          clearClassName="knowledge-search-clear"
        />

        {/* 搜索结果统计 */}
        {keyword && (
          <div className="knowledge-search-summary" role="status" aria-live="polite">
            {filteredPoints.length === 0
              ? `未找到包含「${keyword}」的考点`
              : `命中 ${filteredPoints.length} 个分类、${chapters.filter((c) => c.level === 2).length} 个子考点`}
          </div>
        )}

        <div className="knowledge-layout">
          {/* 章节目录（桌面端常驻） */}
          {!isMobile && (
            <aside className="knowledge-toc" aria-label="章节目录">
              <div className="knowledge-toc-head">
                <h2 className="knowledge-toc-title">目录</h2>
                <span className="knowledge-toc-count">{chapters.filter((c) => c.level === 1).length}</span>
              </div>
              <nav className="knowledge-toc-list">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`knowledge-toc-item level-${c.level} ${
                      activeChapter === c.id ? 'active' : ''
                    }`}
                    onClick={() => jumpTo(c.id)}
                  >
                    {c.text}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* 移动端目录切换 */}
          {isMobile && (
            <button
              type="button"
              className="knowledge-toc-toggle"
              onClick={() => setShowToc(true)}
              aria-label="打开章节目录"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
              章节目录
              {activeChapter && (
                <span className="knowledge-toc-current">
                  {chapters.find((c) => c.id === activeChapter)?.text ?? ''}
                </span>
              )}
            </button>
          )}

          {/* 内容区 · 直接渲染结构化 JSON */}
          <main ref={contentRef} className="knowledge-content markdown-body">
            {filteredPoints.length === 0 ? (
              <p className="md-p knowledge-empty-inline">无匹配的考点内容，请调整关键字后重试。</p>
            ) : (
              filteredPoints.map((point) => (
                <section key={point.id} className="knowledge-section">
                  <h1 id={`chap-kp-${point.id}`}>{point.category_name}</h1>
                  {point.sub_points.map((sp) => {
                    const subId = `kp-${point.id}-${sp.index.replace('.', '-')}`;
                    const paragraphs = sp.content.split(/\n{2,}/);
                    return (
                      <article key={subId} className="knowledge-subpoint">
                        <h2 id={`chap-${subId}`}>
                          <span className="knowledge-sub-index">{sp.index}</span>
                          <span className="knowledge-sub-title">{highlightText(sp.title, keyword)}</span>
                        </h2>
                        {sp.question_count > 0 && (
                          <p className="knowledge-sub-meta">关联题目 {sp.question_count} 题</p>
                        )}
                        {paragraphs.map((para, i) => (
                          <p key={i} className="md-p">{highlightText(para, keyword)}</p>
                        ))}
                      </article>
                    );
                  })}
                </section>
              ))
            )}
          </main>
        </div>
      </div>

      {/* 移动端目录抽屉 */}
      {isMobile && showToc && (
        <motion.div
          className="knowledge-toc-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowToc(false)}
        >
          <motion.div
            className="knowledge-toc-drawer-body"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="knowledge-toc-drawer-head">
              <h2 className="knowledge-toc-title">目录</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowToc(false)}
                aria-label="关闭目录"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="knowledge-toc-list">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`knowledge-toc-item level-${c.level} ${
                    activeChapter === c.id ? 'active' : ''
                  }`}
                  onClick={() => jumpTo(c.id)}
                >
                  {c.text}
                </button>
              ))}
            </nav>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
