// アップデートのお知らせ。新しいお知らせを出したいときは、一番上にエントリを追加する
// （id を新しくすれば、前回見た人にも「新着」として一度だけ表示される）。
(function () {
  "use strict";
  var ENTRIES = [
    {
      id: "2026-10-31-2", title: "お知らせ", body: [
        "今回のアップデートでスケジュールを設定すると通知が来るようになりました。",
        "スケジュールの{bell}を押して通知設定をすると通知が来るようになります"
      ]
    }
  ];
  var CURRENT = ENTRIES[0] ? ENTRIES[0].id : "";

  function show() {
    var C = window.TTCommon;
    var e = ENTRIES[0]; if (!e) return;
    var html = '<div class="shead"><b>' + C.esc(e.title || "お知らせ") + "</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      '<ul class="whatsnew-list">' + (e.body || []).map(function (b) { return "<li>" + C.esc(b).replace("{bell}", '<span class="wn-ico">' + window.TTIco.i("bell", 16) + "</span>") + "</li>"; }).join("") + "</ul>" +
      '<button class="btn primary" type="button" id="wn-close" style="width:100%;margin-top:10px">閉じる</button>';
    var sh = C.openSheet(html, { center: true });
    sh.el.querySelector("#wn-close").addEventListener("click", sh.close);
  }

  function checkAndShow() {
    if (!CURRENT) return;
    var store = window.TTCommon.store;
    var seen = store.get("whatsnew_seen", null);
    if (seen !== CURRENT) { store.set("whatsnew_seen", CURRENT); show(); }
  }
  window.TTWhatsNew = { checkAndShow: checkAndShow };
})();
