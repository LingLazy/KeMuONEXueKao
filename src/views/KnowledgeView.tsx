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
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { loadKnowledge } from '@/services/dataLoader';
import { useIsMobile } from '@/hooks';
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
  const [activeChapter, setActiveChapter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showToc, setShowToc] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadKnowledge()
      .then(setMarkdown)
      .catch((err) => {
        console.error('知识内容加载失败', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, []);

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
  const html = useMemo(() => {
    if (!markdown) return '';
    let result = markdown;
    if (search.trim()) {
      const kw = search.trim();
      // 仅在文本节点中高亮（避免破坏 markdown 语法）
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`(${escaped})`, 'g'), '==$1==');
    }
    return renderMarkdown(result);
  }, [markdown, search]);

  // 滚动监听：高亮当前章节
  useEffect(() => {
    if (!markdown || chapters.length === 0) return;
    const container = contentRef.current;
    if (!container) return;
    const onScroll = () => {
      const headings = chapters
        .map((c) => document.getElementById(`chap-${c.id}`))
        .filter((el): el is HTMLElement => el !== null);
      const scrollTop = container.scrollTop + 120;
      let current = chapters[0]?.id ?? '';
      headings.forEach((h) => {
        if (h.offsetTop <= scrollTop) {
          current = h.id;
        }
      });
      setActiveChapter(current);
    };
    container.addEventListener('scroll', onScroll);
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [markdown, chapters]);

  // 跳转到章节
  const jumpTo = (id: string) => {
    const el = document.getElementById(`chap-${id}`);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({
        top: el.offsetTop - 80,
        behavior: 'smooth'
      });
      setActiveChapter(id);
    }
    setShowToc(false);
  };

  // 加载中
  if (!markdown && !loadError) {
    return (
      <div className="view view-knowledge">
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
        <div className="view-container">
          <EmptyState
            title="知识内容加载失败"
            description={loadError}
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setLoadError(null);
                  setMarkdown(null);
                  loadKnowledge().then(setMarkdown).catch((e) => setLoadError(String(e)));
                }}
              >
                重试
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view view-knowledge">
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
 */
function renderMarkdown(md: string): string {
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

  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const inline = (s: string): string => {
    let r = escapeHtml(s);
    // 搜索高亮
    r = r.replace(/==(.+?)==/g, '<mark class="kw search-hit">$1</mark>');
    // 加粗
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    r = r.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // 斜体
    r = r.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 行内代码
    r = r.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 链接 [text](url)
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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
