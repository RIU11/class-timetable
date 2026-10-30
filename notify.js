// 通知のオン/オフ・何分前かの設定を保存する。実際に通知を送る処理は、
// サーバー側（GitHub Actionsの定期チェック）がWeb Pushで行う（cloud-sync.js参照）。
// Firebaseが未設定のときは、設定は保存されるだけで、通知自体は届かない。
(function () {
  "use strict";
  var store = window.TTCommon.store;
  function settings() { return store.get("notif", { enabled: false, minutes: 10 }); }
  function saveSettings(s) {
    store.set("notif", s);
    if (window.TTCloud) window.TTCloud.syncAll();
  }
  window.TTNotify = { settings: settings, saveSettings: saveSettings };
})();
