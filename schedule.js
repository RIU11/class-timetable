(function () {
  "use strict";
  var C = window.TTCommon, store = C.store, esc = C.esc;
  function items() { return store.get("sched", []); }
  function save(a) { store.set("sched", a); }
  function sorted() { return items().slice().sort(function (a, b) { return (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "").localeCompare(b.time || ""); }); }
  function fmt(d) {
    if (!d) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return d;
    var wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
    return +m[2] + "/" + +m[3] + "(" + wd + ")";
  }
  var view = null;

  function render() {
    var list = sorted(), today = new Date().toISOString().slice(0, 10);
    if (!list.length) { view.innerHTML = '<div class="empty">まだ予定がありません。右上の＋から追加できます。</div>'; return; }
    view.innerHTML = list.map(function (it) {
      return '<div class="litem" data-id="' + it.id + '"><div class="lmain"><div class="ld">' + esc(fmt(it.date)) + (it.time ? " " + esc(it.time) : "") + (it.date && it.date < today ? '　<span class="muted">終了</span>' : "") + "</div><div class=\"lt\">" + esc(it.title) + "</div>" +
        (it.note ? '<div class="muted small" style="margin-top:4px;white-space:pre-wrap">' + esc(it.note) + "</div>" : "") + '</div><button type="button" data-del="' + it.id + '">' + window.TTIco.i("trash", 18) + "</button></div>";
    }).join("");
  }
  function openAdd(existing) {
    var sh = C.openSheet(
      '<div class="shead"><b>' + (existing ? "予定を編集" : "予定を追加") + "</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      '<label class="slab">日付</label><input class="sfield" type="date" id="sc-date" value="' + esc(existing ? existing.date : "") + '">' +
      '<label class="slab">時間（任意）</label><input class="sfield" type="time" id="sc-time" value="' + esc(existing ? existing.time || "" : "") + '">' +
      '<label class="slab">内容</label><input class="sfield" id="sc-title" value="' + esc(existing ? existing.title : "") + '" placeholder="例：課題提出締切">' +
      '<label class="slab">メモ</label><textarea class="sfield" id="sc-note" placeholder="任意">' + esc(existing ? existing.note || "" : "") + "</textarea>" +
      '<button class="btn primary" type="button" id="sc-save" style="width:100%">保存する</button>'
    , { center: true });
    sh.el.querySelector("#sc-save").addEventListener("click", function () {
      var title = sh.el.querySelector("#sc-title").value.trim(); if (!title) { sh.el.querySelector("#sc-title").focus(); return; }
      var a = items();
      var rec = { id: existing ? existing.id : C.uid(), date: sh.el.querySelector("#sc-date").value, time: sh.el.querySelector("#sc-time").value, title: title, note: sh.el.querySelector("#sc-note").value.trim() };
      if (existing) a = a.map(function (x) { return x.id === existing.id ? rec : x; }); else a.push(rec);
      save(a); sh.close(); render();
    });
  }
  var onViewClick = null;
  function mount(v, acts) {
    view = v; view.innerHTML = "";
    acts.innerHTML = '<button type="button" id="sc-add">' + window.TTIco.i("plus", 18) + "追加</button>";
    acts.querySelector("#sc-add").addEventListener("click", function () { openAdd(null); });
    render();
    // タブを開くたびに view は使い回されるので、前回ぶんの仕組みを外してから付け直す（二重に反応しないように）
    if (onViewClick) view.removeEventListener("click", onViewClick);
    onViewClick = function (e) {
      var d = e.target.closest("[data-del]");
      if (d) { if (confirm("この予定を削除しますか？")) { save(items().filter(function (x) { return x.id !== d.getAttribute("data-del"); })); render(); } return; }
      var it = e.target.closest(".litem");
      if (it && !e.target.closest("button")) { var rec = items().filter(function (x) { return x.id === it.getAttribute("data-id"); })[0]; if (rec) openAdd(rec); }
    };
    view.addEventListener("click", onViewClick);
  }
  window.TTSchedule = { mount: mount };
})();
