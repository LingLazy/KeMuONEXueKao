/**
 * 顶部导航
 * - 品牌 logo
 * - 六视图导航链接（含激活态下划线指示器）
 * - 顶部进度与正确率显示
 * - 主题切换按钮
 * - 移动端折叠菜单
 */
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { useProgressStore } from '@/stores/progressStore';
import { toast } from '@/stores/toastStore';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '主页', end: true },
  { to: '/knowledge', label: '知识' },
  { to: '/practice', label: '练习' },
  { to: '/exam', label: '考试' },
  { to: '/mnemonics', label: '口诀' },
  { to: '/categories', label: '分类' }
];

export default function TopNav() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const stats = useProgressStore((s) => s.getStats());
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleToggleTheme = () => {
    toggle();
    toast.show(theme === 'dark' ? '已切换浅色主题' : '已切换深色主题');
  };

  return (
    <header id="topnav" className={scrolled ? 'scrolled' : ''} role="banner">
      <div className="nav-inner">
        <NavLink to="/" className="brand" aria-label="科目一教考 返回主页">
          <span className="brand-mark" aria-hidden="true">科</span>
          <span className="brand-text">
            科目一<span className="brand-accent">·</span>教考
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
          <div className="nav-meta" aria-live="polite">
            <span className="nav-stat">
              <span id="nav-progress">{stats.progress}%</span>
              <span className="nav-stat-divider">·</span>
              <span className="nav-stat-accuracy">
                正确率 <span id="nav-accuracy">{stats.accuracy}%</span>
              </span>
            </span>
            <span className="nav-stat-sub">{stats.answered}/{stats.total} 题</span>
          </div>
          <button
            type="button"
            className="theme-toggle"
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
        </nav>
      )}
    </header>
  );
}
