/**
 * 主页页脚（紧凑型）
 * - 仅在主页 HomeView 末尾渲染
 * - 单行布局：品牌 + 链接 + 版权
 * - 免责声明折叠为单行简短提示 + 查看完整链接
 * - 顶部构成主义四色装饰条带（3px 细带）
 */
const REPO_URL = 'https://github.com/fanquanpp/KeMuONEXueKao';
const SITE_URL = 'https://fanquanpp.github.io/KeMuONEXueKao/';
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
const README_URL = `${REPO_URL}#免责声明`;
const YEAR = new Date().getFullYear();

export default function GlobalFooter() {
  return (
    <footer id="global-footer" role="contentinfo">
      {/* 装饰条带 · 构成主义四色 3px 细带 */}
      <div className="footer-decor" aria-hidden="true">
        <span className="footer-decor-bar bar-ink" />
        <span className="footer-decor-bar bar-red" />
        <span className="footer-decor-bar bar-blue" />
        <span className="footer-decor-bar bar-accent" />
      </div>

      <div className="footer-inner">
        {/* 左侧：品牌标记 + 名称 */}
        <div className="footer-brand">
          <span className="footer-brand-mark" aria-hidden="true">K</span>
          <span className="footer-brand-name">
            KeMuONE<span className="brand-accent">Xue</span>Kao
          </span>
        </div>

        {/* 中间：链接组 */}
        <nav className="footer-links" aria-label="页脚导航">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
            </svg>
            仓库
          </a>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6M10 14 21 3" />
            </svg>
            在线
          </a>
          <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M9 13h6M9 17h6" />
            </svg>
            MIT
          </a>
        </nav>

        {/* 右侧：版权 */}
        <div className="footer-copy">
          © {YEAR} KeMuONEXueKao
        </div>
      </div>

      {/* 免责声明 · 单行简短提示 */}
      <div className="footer-disclaimer-row">
        <span className="footer-disclaimer-text">
          非官方学习工具 · 仅供学习参考 · 以公安交管部门最新官方资料为准
        </span>
        <a
          href={README_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-disclaimer-more"
        >
          完整声明 →
        </a>
      </div>
    </footer>
  );
}
