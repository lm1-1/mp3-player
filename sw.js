// Service Worker — MP3 听力播放器离线缓存

const CACHE_NAME = 'mp3-player-v1';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/player.js',
  './js/app.js',
  './manifest.json',
];

// 安装：预缓存所有核心文件
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', function (event) {
  // 不缓存本地文件的 blob URL
  if (event.request.url.startsWith('blob:')) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      // 缓存命中 → 直接返回
      if (cached) return cached;
      // 缓存未命中 → 网络请求并缓存
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        // 网络失败时的回退
        return new Response('离线状态下该资源不可用', { status: 503 });
      });
    })
  );
});
