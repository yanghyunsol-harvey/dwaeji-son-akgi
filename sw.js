// 돼지손악기 서비스 워커: 앱 파일은 네트워크 우선(업데이트 반영), 외부 모델/라이브러리는 캐시 우선(재방문 속도, 오프라인 일부 지원)
const VERSION = "v1";
const APP_CACHE = "app-" + VERSION;
const CDN_CACHE = "cdn-" + VERSION;
const APP_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];
const CDN_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![APP_CACHE, CDN_CACHE].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // 앱 파일: 네트워크 우선, 실패하면 캐시
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(APP_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  } else if (CDN_HOSTS.includes(url.hostname)) {
    // 외부 리소스: 캐시 우선
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CDN_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
