/**
 * 应用根组件
 * - HashRouter 路由配置
 * - 全局布局：TopNav + Toast + ConfirmDialog + 主内容区 + GlobalFooter
 * - 视图懒加载（按需 import）实现代码分割
 */
import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from '@/components/layout/TopNav';
import GlobalFooter from '@/components/layout/GlobalFooter';
import ToastContainer from '@/components/feedback/ToastContainer';
import ConfirmProvider from '@/components/feedback/ConfirmProvider';
import GlobalLoading from '@/components/feedback/GlobalLoading';
import { useThemeStore } from '@/stores/themeStore';
import { useProgressStore } from '@/stores/progressStore';
import { loadQuestions } from '@/services/dataLoader';

// 视图懒加载：首屏仅加载 Home，其余按路由按需加载
const HomeView = lazy(() => import('@/views/HomeView'));
const KnowledgeView = lazy(() => import('@/views/KnowledgeView'));
const PracticeView = lazy(() => import('@/views/PracticeView'));
const ExamView = lazy(() => import('@/views/ExamView'));
const MnemonicsView = lazy(() => import('@/views/MnemonicsView'));
const CategoriesView = lazy(() => import('@/views/CategoriesView'));

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const applyTheme = useThemeStore((s) => s.apply);
  const setTotal = useProgressStore((s) => s.setTotal);

  // 初始化：同步主题至 DOM
  // 拆分为独立 useEffect，避免主题切换时重复触发 loadQuestions
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 加载题库总数（仅在挂载时执行一次）
  useEffect(() => {
    loadQuestions()
      .then((qs) => setTotal(qs.length))
      .catch((err) => console.error('题库加载失败', err));
  }, [setTotal]);

  return (
    <HashRouter>
      <ConfirmProvider>
        <a href="#main-content" className="skip-link">跳到主要内容</a>
        <TopNav />
        <main id="main-content" className="app-main">
          <Suspense fallback={<GlobalLoading />}>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/knowledge" element={<KnowledgeView />} />
              <Route path="/practice" element={<PracticeView />} />
              <Route path="/practice/:cat" element={<PracticeView />} />
              <Route path="/exam" element={<ExamView />} />
              <Route path="/mnemonics" element={<MnemonicsView />} />
              <Route path="/categories" element={<CategoriesView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <GlobalFooter />
        <ToastContainer />
      </ConfirmProvider>
    </HashRouter>
  );
}
