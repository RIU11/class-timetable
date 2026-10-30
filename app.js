(function () {
  "use strict";

  var store = window.TTCommon.store;

  /* ---------- タブ ---------- */
  var TABS = [
    { id: "timetable", name: "時間割", icon: "grid" },
    { id: "schedule", name: "スケジュール", icon: "cal" },
    { id: "annual", name: "年間予定表", icon: "flag" },
    { id: "notes", name: "メモ", icon: "note" }
  ];
  var MOD = { timetable: window.TTTimetable, schedule: window.TTSchedule, annual: window.TTAnnual, notes: window.TTNotes };
  var view = document.getElementById("view"), ttl = document.getElementById("ttl"), acts = document.getElementById("acts");
  var cur = store.get("tab", "timetable");
  if (!MOD[cur]) cur = "timetable";

  function renderTabs() {
    document.getElementById("btabs").innerHTML = TABS.map(function (t) {
      return '<button type="button" class="' + (t.id === cur ? "on" : "") + '" data-tab="' + t.id + '">' + window.TTIco.i(t.icon, 22) + "<span>" + t.name + "</span></button>";
    }).join("");
  }
  // ヘッダーと下タブの実際の高さを測って、時間割・年間予定表が
  // 画面にぴったり収まるようにする（機種やセーフエリアの違いでずれないように）
  var topEl = document.querySelector(".top"), btEl = document.getElementById("btabs");
  function syncChrome() {
    if (topEl) document.documentElement.style.setProperty("--tt-top", topEl.offsetHeight + "px");
    if (btEl) document.documentElement.style.setProperty("--tt-bottom", btEl.offsetHeight + "px");
  }
  window.addEventListener("resize", syncChrome);
  window.addEventListener("orientationchange", function () { setTimeout(syncChrome, 60); });

  function go(id) {
    if (!MOD[id]) return;
    cur = id; store.set("tab", id);
    renderTabs();
    ttl.textContent = TABS.filter(function (t) { return t.id === id; })[0].name;
    var termTop = document.getElementById("tt-term-top");
    if (termTop) termTop.hidden = id !== "timetable";
    acts.innerHTML = "";
    // #view を丸ごと新しい入れ物に差し替える。前のタブが付けた仕組み（クリックなど）を
    // 確実に消すため（同じ入れ物を使い回すと、前のタブぶんも一緒に反応してしまうことがあった）
    var fresh = view.cloneNode(false);
    view.parentNode.replaceChild(fresh, view);
    view = fresh;
    view.classList.toggle("scrollv", id === "schedule" || id === "notes");
    MOD[id].mount(view, acts);
    syncChrome();
    requestAnimationFrame(syncChrome);
  }
  document.getElementById("btabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (b) go(b.getAttribute("data-tab"));
  });

  syncChrome();
  go(cur);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { /* オフライン対応なしで動作 */ });
})();
