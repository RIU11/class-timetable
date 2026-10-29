var CACHE = "timetable-v1";
var FILES = ["./", "index.html", "style.css", "common.js", "ico.js", "syllabus-data.js", "annual-data.js",
  "timetable.js", "syllabus-view.js", "schedule.js", "annual.js", "notes.js", "app.js",
  "manifest.webmanifest", "icons/favicon-64.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }));
  self.clients.claim();
});
// ネットワーク優先（最新を見せる）。つながらないときは、保存してあるものを出す
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
