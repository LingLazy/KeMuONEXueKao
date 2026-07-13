/**
 * React 应用入口
 * - 挂载根组件
 * - 注册全局错误处理
 * - 注入全局样式
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/views.css';
import '@/styles/responsive.css';
import '@/styles/animations.css';

// 全局错误处理：捕获未处理异常，避免白屏
window.addEventListener('error', (e) => {
  console.error('[全局错误]', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[未处理Promise]', e.reason);
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('根元素 #root 未找到');
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
