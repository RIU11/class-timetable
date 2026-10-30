// Firebaseへの同期（アプリを閉じていても通知を届けるための仕組み）。
// firebase-config.js に実際の設定値が入るまでは、何もしない（今まで通りローカルだけで動く）。
(function () {
  "use strict";
  var store = window.TTCommon.store;
  var ready = false, uid = null, db = null;

  function configured() {
    return window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey &&
      window.FIREBASE_CONFIG.apiKey.indexOf("YOUR_") !== 0;
  }

  function init() {
    if (!configured()) return;
    firebase.initializeApp(window.FIREBASE_CONFIG);
    db = firebase.firestore();
    firebase.auth().onAuthStateChanged(function (u) {
      if (u) { uid = u.uid; ready = true; syncAll(); }
    });
    firebase.auth().signInAnonymously().catch(function (e) { console.error("firebase auth error", e); });
  }

  var syncTimer = null;
  function syncAll() {
    if (!ready) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      db.collection("users").doc(uid).set({
        sched: store.get("sched", []),
        notif: store.get("notif", { enabled: false, minutes: 10 }),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function (e) { console.error("sync error", e); });
    }, 1500);
  }

  function urlBase64ToUint8Array(base64) {
    var s = base64.replace(/-/g, "+").replace(/_/g, "/");
    var bin = atob(s);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function subscribePush() {
    if (!configured()) return Promise.reject(new Error("firebase-not-configured"));
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return Promise.reject(new Error("push-not-supported"));
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) return existing;
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY) });
      });
    }).then(function (sub) {
      if (!ready) return sub;
      return db.collection("users").doc(uid).set({
        subs: firebase.firestore.FieldValue.arrayUnion(sub.toJSON())
      }, { merge: true }).then(function () { return sub; });
    });
  }

  window.TTCloud = { init: init, syncAll: syncAll, subscribePush: subscribePush, isReady: function () { return ready; } };
  init();
})();
