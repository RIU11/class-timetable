(function () {
  "use strict";
  var store = window.TTCommon.store;
  function settings() { return store.get("notif", { enabled: false, minutes: 10 }); }
  function saveSettings(s) { store.set("notif", s); }
  function notifiedMap() { return store.get("notified", {}); }
  function saveNotified(m) { store.set("notified", m); }

  function fire(it, minutes) {
    var title = it.title + "（" + minutes + "分前）";
    var body = (it.date || "") + (it.time ? " " + it.time : "") + (it.note ? "\n" + it.note : "");
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(title, { body: body, icon: "icons/icon-192.png", tag: "sched-" + it.id });
      }).catch(function () { try { new Notification(title, { body: body }); } catch (e) { /* 通知が使えない環境では無視 */ } });
    } else {
      try { new Notification(title, { body: body }); } catch (e) { /* 通知が使えない環境では無視 */ }
    }
  }

  // 時間が設定されている予定だけを対象に、「何分前」から締切までの間に1回だけ通知する
  function checkOnce() {
    var s = settings();
    if (!s.enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var items = store.get("sched", []);
    var now = Date.now(), notified = notifiedMap(), changed = false;
    items.forEach(function (it) {
      if (!it.date || !it.time) return;
      var target = new Date(it.date + "T" + it.time + ":00").getTime();
      if (isNaN(target)) return;
      var notifyAt = target - s.minutes * 60000;
      if (now >= notifyAt && now < target && !notified[it.id]) { fire(it, s.minutes); notified[it.id] = true; changed = true; }
    });
    // 消えた予定ぶんの通知済み記録は間引く
    Object.keys(notified).forEach(function (id) {
      if (!items.some(function (x) { return x.id === id; })) { delete notified[id]; changed = true; }
    });
    if (changed) saveNotified(notified);
  }

  setInterval(checkOnce, 30000);
  checkOnce();
  window.TTNotify = { settings: settings, saveSettings: saveSettings };
})();
