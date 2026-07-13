/* ===================================================================
   科目一教考 · Service Worker
   - 离线缓存核心资源
   - 题目图片缓存
   - 版本化更新策略
   =================================================================== */
'use strict';

const SW_VERSION = 'v2.7.20260713';
const CORE_CACHE = `kemu1-core-${SW_VERSION}`;
const IMG_CACHE = `kemu1-img-${SW_VERSION}`;
const DATA_CACHE = `kemu1-data-${SW_VERSION}`;

// 核心资源列表（首次安装即缓存）
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data.js',
  './js/knowledge.js',
  './manifest.json'
];

// ============ 安装：预缓存核心资源 ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] 安装失败:', err))
  );
});

// ============ 激活：清理旧缓存 ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![CORE_CACHE, IMG_CACHE, DATA_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ============ 请求拦截策略 ============
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 仅处理 GET 请求
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 跳过跨域请求（除图片外）
  const isSameOrigin = url.origin === self.location.origin;

  // 策略1：核心资源 → 缓存优先（Cache First）
  if (CORE_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', '/')) || url.pathname === '/' || url.pathname.endsWith('/index.html'))) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CORE_CACHE).then(c => c.put(req, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 策略2：题目图片 → 缓存优先，回退网络
  if (isSameOrigin && url.pathname.includes('/assets/images/')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache => {
        return cache.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(resp => {
            if (resp.ok) {
              cache.put(req, resp.clone());
            }
            return resp;
          }).catch(() => cached);
        });
      })
    );
    return;
  }

  // 策略3：其他同源资源 → 网络优先，回退缓存
  if (isSameOrigin) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CORE_CACHE).then(c => c.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
});

// ============ 消息通信：控制页面刷新 ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
