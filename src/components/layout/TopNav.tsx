/**
 * 顶部导航（精简版）
 * - 品牌标识
 * - 两个导航项：速记口诀 / 知识学习
 * - GitHub 仓库外链按钮（外链新窗口）
 * - 主题切换按钮（含 View Transitions 圆形扩散原点）
 * - 移动端折叠菜单
 */
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { toast } from '@/stores/toastStore';
import { useMagnetic } from '@/hooks';
import { REPO_URL } from '@/constants/navigation';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/mnemonics', label: '速记口诀' },
  { to: '/knowledge', label: '知识学习' }
];

export default function TopNav() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // 主题切换按钮磁吸 ref
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  useMagnetic(themeToggleRef, { strength: 0.4 });

  // 监听滚动添加阴影
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleToggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 将点击坐标传递给 themeStore，用于 View Transitions API 圆形扩散原点
    toggle({ x: e.clientX, y: e.clientY });
    toast.show(theme === 'dark' ? '已切换浅色主题' : '已切换深色主题');
  };

  return (
    <header id="topnav" className={scrolled ? 'scrolled' : ''} role="banner">
      <div className="nav-inner">
        <NavLink to="/mnemonics" className="brand" aria-label="速记口诀 返回首页">
          <span className="brand-mark" aria-hidden="true">科</span>
          <span className="brand-text">
            科目一<span className="brand-accent">速记</span>通
          </span>
        </NavLink>

        <nav className="nav-links" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {/* GitHub 仓库外链按钮：新窗口打开，rel noopener 防止反向 tabnabbing */}
          <a
            href={REPO_URL}
            className="nav-repo-link btn-shine"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="访问 GitHub 仓库源代码（新窗口打开）"
            title="GitHub 仓库源代码"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
            </svg>
          </a>
          <button
            type="button"
            ref={themeToggleRef}
            className="theme-toggle btn-shine btn-magnetic"
            onClick={handleToggleTheme}
            aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="nav-menu-toggle"
            aria-label="切换菜单"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <nav className="nav-mobile-menu" aria-label="移动端导航">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-mobile-link' + (isActive ? ' active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
          {/* 移动端菜单中的 GitHub 仓库入口 */}
          <a
            href={REPO_URL}
            className="nav-mobile-link nav-mobile-repo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginRight: 8 }}>
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
            </svg>
            GitHub 仓库
          </a>
        </nav>
      )}
    </header>
  );
}
