var CACHE = "timetable-v3";
var FILES = ["./", "index.html", "style.css", "common.js", "ico.js", "syllabus-data.js", "annual-data.js",
  "timetable.js", "syllabus-view.js", "schedule.js", "annual.js", "notes.js", "firebase-config.js", "cloud-sync.js",
  "notify.js", "app.js",
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
// サーバー（GitHub Actions）からのプッシュ通知を受け取って表示する
self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { /* 本文が読めない場合は空のまま */ }
  var title = data.title || "時間割";
  e.waitUntil(self.registration.showNotification(title, { body: data.body || "", tag: data.tag || "tt-push", icon: "icons/icon-192.png" }));
});
// 通知をタップしたら、開いているタブがあればそれを前面に、なければ新しく開く
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function (list) {
      for (var i = 0; i < list.length; i++) { if ("focus" in list[i]) return list[i].focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
