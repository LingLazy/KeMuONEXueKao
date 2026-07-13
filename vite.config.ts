/**
 * Vite 构建配置
 * - React 19 + TypeScript
 * - 路径别名 @ → src
 * - GitHub Pages 子路径 base
 * - PWA 自动生成（manifest + service worker）
 * - 代码分割与资源哈希
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  // GitHub Pages 子路径部署
  base: '/KeMuONEXueKao/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        // 预缓存核心资源
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json,md}'],
        // 单文件最大缓存体积（5MB，覆盖题库JSON）
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // 题目图片：Stale-While-Revalidate（缓存优先，后台更新）
            urlPattern: ({ url }) => url.pathname.includes('/images/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kemu1-img-cache',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // 题库数据JSON：Stale-While-Revalidate
            urlPattern: ({ url }) => url.pathname.endsWith('.json') && url.pathname.includes('/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kemu1-data-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      manifest: {
        name: '科目一教考 · 速记通',
        short_name: '科目一速记',
        description: '1861道完整题库 · 155条速记口诀 · 24分类 · 模拟考试 · 2026年7月最新版',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        // 工业蚀刻科技派 · 冷调钢灰背景 + 电光蓝主色
        background_color: '#eef1f5',
        theme_color: '#1456db',
        lang: 'zh-CN',
        dir: 'ltr',
        categories: ['education', 'productivity', 'utilities'],
        icons: [
          {
            // 几何方形 logo（rx=8 硬朗棱角，非 36 大圆角）
            src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="8" fill="%231456db"/%3E%3Ctext x="96" y="128" font-size="108" font-weight="700" fill="%23fff" text-anchor="middle" font-family="sans-serif"%3E科%3C/text%3E%3C/svg%3E',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Crect width="512" height="512" rx="16" fill="%231456db"/%3E%3Ctext x="256" y="340" font-size="288" font-weight="700" fill="%23fff" text-anchor="middle" font-family="sans-serif"%3E科%3C/text%3E%3C/svg%3E',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          { name: '题库练习', short_name: '练习', url: './#/practice', description: '1861道题目按分类练习' },
          { name: '模拟考试', short_name: '考试', url: './#/exam', description: '45分钟100题全真模拟' },
          { name: '口诀总览', short_name: '口诀', url: './#/mnemonics', description: '155条速记口诀' },
          { name: '知识学习', short_name: '知识', url: './#/knowledge', description: '系统化知识学习' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // 代码分割：将vendor与业务代码分离
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation-vendor': ['framer-motion', 'canvas-confetti']
        }
      }
    },
    // 资源内联阈值（4KB以下内联为base64）
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000
  }
});
