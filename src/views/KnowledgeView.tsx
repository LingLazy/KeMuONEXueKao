/**
 * 知识学习视图
 * - 加载 docs/knowledge.md Markdown 内容
 * - 轻量级 Markdown 解析器
 * - 左侧章节目录导航（自动提取 h1/h2）
 * - 右侧内容渲染区
 * - 搜索关键字高亮
 * - 滚动联动高亮当前章节
 * - 移动端：单栏布局，目录折叠
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { loadKnowledge } from '@/services/dataLoader';
import { useIsMobile } from '@/hooks';
import { escapeHtml } from '@/utils';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';

interface Chapter {
  id: string;
  level: 1 | 2;
  text: string;
}

export default function KnowledgeView() {
  const isMobile = useIsMobile();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showToc, setShowToc] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // 加载知识内容（支持重试时的 loading 态）
  const load = useCallback(() => {
    setReloading(true);
    setLoadError(null);
    loadKnowledge()
      .then((md) => {
        setMarkdown(md);
        setReloading(false);
      })
      .catch((err) => {
        console.error('知识内容加载失败', err);
        setLoadError(err instanceof Error ? err.message : String(err));
        setReloading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 解析章节目录
  const chapters = useMemo<Chapter[]>(() => {
    if (!markdown) return [];
    const result: Chapter[] = [];
    const lines = markdown.split('\n');
    const usedIds = new Set<string>();
    lines.forEach((line) => {
      const m1 = /^#\s+(.+)$/.exec(line);
      const m2 = /^##\s+(.+)$/.exec(line);
      const text = (m1?.[1] ?? m2?.[1] ?? '').trim();
      const level = m1 ? 1 : m2 ? 2 : null;
      if (!level || !text) return;
      const id = text
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
      const uniqueId = usedIds.has(id) ? `${id}-${result.length}` : id;
      usedIds.add(uniqueId);
      result.push({ id: uniqueId, level, text });
    });
    return result;
  }, [markdown]);

  // 渲染 HTML
  // 关键：搜索高亮在 renderMarkdown 的 inline 函数内对已转义的文本节点做替换，
  // 而非在 raw markdown 上替换，避免破坏代码块、URL、表格分隔符等语法
  const html = useMemo(() => {
    if (!markdown) return '';
    const kw = search.trim();
    return renderMarkdown(markdown, kw || null);
  }, [markdown, search]);

  // 滚动监听：高亮当前章节 + 阅读进度（使用 rAF 节流避免长文档卡顿）
  useEffect(() => {
    if (!markdown || chapters.length === 0) return;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return; // 已有未执行的 rAF
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // 章节高亮：基于 heading 相对视口的位置判断
        const headings = chapters
          .map((c) => document.getElementById(`chap-${c.id}`))
          .filter((el): el is HTMLElement => el !== null);
        const navH = 80; // 导航栏高度 + 偏移量
        let current = chapters[0]?.id ?? '';
        headings.forEach((h) => {
          if (h.getBoundingClientRect().top <= navH) {
            current = h.id;
          }
        });
        setActiveChapter(current);
        // 阅读进度：基于整个文档的滚动比例
        const docScrollMax = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docScrollMax > 0 ? Math.min(100, Math.round((window.scrollY / docScrollMax) * 100)) : 0;
        setReadingProgress(progress);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [markdown, chapters]);

  // 跳转到章节
  const jumpTo = (id: string) => {
    const el = document.getElementById(`chap-${id}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveChapter(id);
    }
    setShowToc(false);
  };

  // 加载中
  if ((!markdown && !loadError) || reloading) {
    return (
      <div className="view view-knowledge">
        {/* 加载态装饰层 · 极简网格+小点阵 */}
        <div className="geo-bg-decor" aria-hidden="true">
          <div className="geo-bg-grid" />
          <div className="geo-dots-sm" />
        </div>
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
        {/* 错误态装饰层 · 网格+大点阵 */}
        <div className="geo-bg-decor" aria-hidden="true">
          <div className="geo-bg-grid" />
          <div className="geo-dots-lg" />
        </div>
        <div className="view-container">
          <EmptyState
            title="知识内容加载失败"
            description={loadError}
            action={
              <button
                type="button"
                className="btn btn-primary"
                disabled={reloading}
                onClick={load}
              >
                {reloading ? '加载中…' : '重试'}
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
      {/* 装饰主题：结构感 · 呼应章节层次与知识体系 */}
      <div className="geo-bg-decor" aria-hidden="true">
        <div className="geo-bg-grid" />
        <div className="geo-arc-tl" />
        <div className="geo-diag-line" />
        <div className="geo-square-br" />
        {/* 扩展装饰：嵌套方框呼应知识体系的层级结构 */}
        <div className="geo-nested-squares-tl" />
        {/* 扩展装饰：S 形曲线作为侧栏视觉引导线 */}
        <div className="geo-curve-s" />
        {/* 扩展装饰：竖排虚线束呼应章节分隔 */}
        <div className="geo-vline-bundle" />
        {/* 扩展装饰：强调色光晕营造阅读沉浸感 */}
        <div className="geo-glow-accent-br" />
        {/* 扩展装饰 v3.4 · 多位置动态元素 */}
        <div className="geo-cross-grid" />
        <div className="geo-spiral-ccw" />
        <div className="geo-float-block" />
      </div>
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
            全面覆盖交通法规、记分处罚、驾驶情境、车辆常识等十大章节，系统化掌握必备知识
          </p>
        </header>

        {/* 搜索 */}
        <div className="knowledge-search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="搜索知识点关键字…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索知识"
          />
          {search && (
            <button type="button" className="knowledge-search-clear" onClick={() => setSearch('')} aria-label="清空搜索">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="knowledge-layout">
          {/* 章节目录（桌面端常驻） */}
          {!isMobile && (
            <aside className="knowledge-toc" aria-label="章节目录">
              <div className="knowledge-toc-head">
                <h2 className="knowledge-toc-title">目录</h2>
                <span className="knowledge-toc-count">{chapters.length}</span>
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

          {/* 内容区 */}
          <main
            ref={contentRef}
            className="knowledge-content markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
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

/**
 * 轻量级 Markdown 渲染器
 * 支持标题、段落、列表、代码块、引用、表格、加粗、行内代码、链接、分割线
 * @param md 原始 Markdown 文本
 * @param searchKw 搜索关键字（可选）：在已转义的文本节点上做高亮，不破坏 Markdown 语法
 */
function renderMarkdown(md: string, searchKw: string | null = null): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let i = 0;
  let inList: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeBuf: string[] = [];
  let codeLang = '';
  let inTable = false;
  let tableBuf: string[][] = [];
  let chapterIdSet = new Set<string>();
  let chapterCount = 0;

  // 预编译搜索高亮正则（对已转义文本生效，避免破坏 markdown 语法）
  const kwRegex = searchKw
    ? new RegExp(`(${searchKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    : null;

  const inline = (s: string): string => {
    let r = escapeHtml(s);
    // 搜索高亮：在已转义的文本节点上替换，不会影响代码块/URL/表格等 markdown 结构
    if (kwRegex) {
      r = r.replace(kwRegex, '<mark class="kw search-hit">$1</mark>');
    }
    // 术语 tooltip：?[术语](解释)? → 悬停弹窗
    r = r.replace(/\?\[([^\]]+)\]\(([^)]+)\)\?/g, (_m, term: string, tip: string) => {
      return `<span class="term">${term}<span class="term-popup">${tip}</span></span>`;
    });
    // 加粗
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    r = r.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // 斜体
    r = r.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 行内代码
    r = r.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 链接 [text](url) - 仅允许安全协议（http/https/mailto/tel/相对路径/锚点）
    // 关键：对 url 做 HTML 属性转义，防止 " 闭合 href 注入任意属性（XSS）
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text: string, url: string) => {
      const trimmedUrl = url.trim();
      const isSafe = /^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(trimmedUrl);
      if (!isSafe) return match; // 不安全协议不转换，保留原文
      // 校验 url 不含可破坏属性的字符
      if (/["'<>]/.test(trimmedUrl)) return match;
      return `<a href="${trimmedUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    // 删除线
    r = r.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return r;
  };

  const closeList = () => {
    if (inList) {
      html.push(`</${inList}>`);
      inList = null;
    }
  };

  const closeTable = () => {
    if (inTable && tableBuf.length > 0) {
      const head = tableBuf[0];
      const rows = tableBuf.slice(2);
      if (head) {
        html.push('<div class="md-table-wrap"><table class="md-table">');
        html.push('<thead><tr>');
        head.forEach((c) => html.push(`<th>${inline(c)}</th>`));
        html.push('</tr></thead><tbody>');
        rows.forEach((row) => {
          html.push('<tr>');
          row.forEach((c) => html.push(`<td>${inline(c)}</td>`));
          html.push('</tr>');
        });
        html.push('</tbody></table></div>');
      }
      tableBuf = [];
      inTable = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // 代码块
    if (/^```/.test(line)) {
      if (inCode) {
        html.push(`<pre class="md-code"><code class="lang-${codeLang}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = [];
        inCode = false;
        codeLang = '';
      } else {
        closeList();
        closeTable();
        inCode = true;
        codeLang = line.replace(/^```/, '').trim();
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    // 表格
    if (line.includes('|') && line.trim().startsWith('|')) {
      closeList();
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length > 0) {
        // 分隔行
        if (i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1] ?? '')) {
          inTable = true;
          tableBuf.push(cells);
          i++;
          tableBuf.push((lines[i] ?? '').split('|').slice(1, -1).map((c) => c.trim()));
          i++;
          continue;
        }
        if (inTable) {
          tableBuf.push(cells);
          i++;
          continue;
        }
      }
    } else if (inTable) {
      closeTable();
    }

    // 标题
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      closeTable();
      const level = heading[1]?.length ?? 1;
      const text = (heading[2] ?? '').trim();
      // 生成唯一 ID
      let id = text
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
      if (chapterIdSet.has(id)) {
        id = `${id}-${chapterCount}`;
      }
      chapterIdSet.add(id);
      chapterCount++;
      html.push(`<h${level} id="chap-${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      closeTable();
      html.push('<hr />');
      i++;
      continue;
    }

    // 引用
    if (/^>\s+/.test(line)) {
      closeList();
      closeTable();
      const text = line.replace(/^>\s+/, '');
      html.push(`<blockquote class="md-quote">${inline(text)}</blockquote>`);
      i++;
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      if (inList !== 'ul') {
        closeList();
        html.push('<ul class="md-list">');
        inList = 'ul';
      }
      const text = line.replace(/^[-*+]\s+/, '');
      html.push(`<li>${inline(text)}</li>`);
      i++;
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        closeList();
        html.push('<ol class="md-list">');
        inList = 'ol';
      }
      const text = line.replace(/^\d+\.\s+/, '');
      html.push(`<li>${inline(text)}</li>`);
      i++;
      continue;
    }

    // 空行
    if (line.trim() === '') {
      closeList();
      closeTable();
      i++;
      continue;
    }

    // 普通段落
    closeList();
    closeTable();
    html.push(`<p class="md-p">${inline(line)}</p>`);
    i++;
  }
  closeList();
  closeTable();
  if (inCode && codeBuf.length > 0) {
    html.push(`<pre class="md-code"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  }
  return html.join('\n');
}
