/**
 * 应用根组件（精简版）
 * - 仅保留「口诀总览」与「知识学习」两个视图
 * - 默认入口为口诀总览（/mnemonics）
 * - HashRouter 路由 + 视图懒加载
 * - 全局布局：TopNav + Toast + ConfirmDialog + 主内容区
 */
import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from '@/components/layout/TopNav';
import ToastContainer from '@/components/feedback/ToastContainer';
import ConfirmProvider from '@/components/feedback/ConfirmProvider';
import GlobalLoading from '@/components/feedback/GlobalLoading';
import { useThemeStore } from '@/stores/themeStore';

// 视图懒加载：按路由按需加载
const KnowledgeView = lazy(() => import('@/views/KnowledgeView'));
const MnemonicsView = lazy(() => import('@/views/MnemonicsView'));

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const applyTheme = useThemeStore((s) => s.apply);

  // 初始化：同步主题至 DOM
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  return (
    <HashRouter>
      <ConfirmProvider>
        <a href="#main-content" className="skip-link">跳到主要内容</a>
        <TopNav />
        <main id="main-content" className="app-main">
          <Suspense fallback={<GlobalLoading />}>
            <Routes>
              {/* 默认入口：速记口诀 */}
              <Route path="/" element={<Navigate to="/mnemonics" replace />} />
              <Route path="/mnemonics" element={<MnemonicsView />} />
              <Route path="/knowledge" element={<KnowledgeView />} />
              {/* 旧路径与未知路径统一回落至口诀 */}
              <Route path="*" element={<Navigate to="/mnemonics" replace />} />
            </Routes>
          </Suspense>
        </main>
        <ToastContainer />
      </ConfirmProvider>
    </HashRouter>
  );
}
