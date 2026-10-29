(function () {
  "use strict";
  var C = window.TTCommon, store = C.store, esc = C.esc;
  function items() { return store.get("notes", []); }
  function save(a) { store.set("notes", a); }
  function fmt(ts) { var d = new Date(ts); return (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  var view = null;

  function render() {
    var list = items().slice().sort(function (a, b) { return b.ts - a.ts; });
    if (!list.length) { view.innerHTML = '<div class="empty">まだメモがありません。右上の＋から書けます。</div>'; return; }
    view.innerHTML = list.map(function (it) {
      return '<div class="litem" data-id="' + it.id + '"><div class="lmain"><div class="ld">' + esc(fmt(it.ts)) + '</div><div class="lt">' + esc(it.body) + "</div></div><button type=\"button\" data-del=\"" + it.id + '">' + window.TTIco.i("trash", 18) + "</button></div>";
    }).join("");
  }
  function openEdit(existing) {
    var sh = C.openSheet(
      '<div class="shead"><b>' + (existing ? "メモを編集" : "メモを書く") + "</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      '<textarea class="sfield" id="nt-body" style="min-height:160px" placeholder="自由に書いてください">' + esc(existing ? existing.body : "") + "</textarea>" +
      '<button class="btn primary" type="button" id="nt-save" style="width:100%">保存する</button>'
    , { center: true });
    var ta = sh.el.querySelector("#nt-body"); ta.focus();
    sh.el.querySelector("#nt-save").addEventListener("click", function () {
      var body = ta.value.trim(); if (!body) { sh.close(); return; }
      var a = items();
      if (existing) a = a.map(function (x) { return x.id === existing.id ? { id: x.id, ts: x.ts, body: body } : x; });
      else a.push({ id: C.uid(), ts: Date.now(), body: body });
      save(a); sh.close(); render();
    });
  }
  function mount(v, acts) {
    view = v; view.innerHTML = "";
    acts.innerHTML = '<button type="button" id="nt-add">' + window.TTIco.i("plus", 18) + "追加</button>";
    acts.querySelector("#nt-add").addEventListener("click", function () { openEdit(null); });
    render();
    view.addEventListener("click", function (e) {
      var d = e.target.closest("[data-del]");
      if (d) { if (confirm("このメモを削除しますか？")) { save(items().filter(function (x) { return x.id !== d.getAttribute("data-del"); })); render(); } return; }
      var it = e.target.closest(".litem");
      if (it && !e.target.closest("button")) { var rec = items().filter(function (x) { return x.id === it.getAttribute("data-id"); })[0]; if (rec) openEdit(rec); }
    });
  }
  window.TTNotes = { mount: mount };
})();
