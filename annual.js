(function () {
  "use strict";
  var C = window.TTCommon, esc = C.esc;
  var MONTHS = [
    { y: 2026, m: 4 }, { y: 2026, m: 5 }, { y: 2026, m: 6 }, { y: 2026, m: 7 }, { y: 2026, m: 8 }, { y: 2026, m: 9 },
    { y: 2026, m: 10 }, { y: 2026, m: 11 }, { y: 2026, m: 12 }, { y: 2027, m: 1 }, { y: 2027, m: 2 }, { y: 2027, m: 3 }
  ];
  var WD = ["日", "月", "火", "水", "木", "金", "土"];
  var idx = 0; // MONTHS の何番目を表示中か
  (function initIdx() {
    var t = new Date();
    for (var i = 0; i < MONTHS.length; i++) { if (MONTHS[i].y === t.getFullYear() && MONTHS[i].m === t.getMonth() + 1) { idx = i; return; } }
  })();

  function byDate() {
    var m = {};
    (window.ANNUAL || []).forEach(function (e) { m[e.date] = e; });
    return m;
  }
  function schedByDate() {
    var m = {};
    (C.store.get("sched", []) || []).forEach(function (s) { if (!s.date) return; (m[s.date] = m[s.date] || []).push(s); });
    // 同じ日の中では、時間がある予定を時間順に先へ。時間がない予定は、追加した順のまま後ろに続く（スケジュールタブと同じ並び方）
    var cmp = window.TTSchedCmp || function () { return 0; };
    Object.keys(m).forEach(function (k) { m[k].sort(cmp); });
    return m;
  }
  function pad(n) { return ("0" + n).slice(-2); }
  var SHORT = 5; // この文字数以内なら「短い」とみなす

  // その日に書く項目（学校の行事・スケジュールで追加した予定）を、まとめて作る
  function itemsFor(e, schedToday) {
    var items = [];
    if (e && e.note) items.push(e.label);
    (schedToday || []).forEach(function (s) { items.push((s.time ? s.time + " " : "") + s.title); });
    return items;
  }
  // 項目数・長さに応じて、マスの中の表示を組み立てる
  //（短いものが2つなら、小さい文字で2行に2つ／長ければ1つを2行で書き、残りは件数で示す）
  function cellBodyHtml(items) {
    if (!items.length) return "";
    if (items.length === 1) return '<span class="anlb">' + esc(items[0]) + "</span>";
    if (items.length === 2 && items[0].length <= SHORT && items[1].length <= SHORT) {
      return items.map(function (t) { return '<span class="anlb sm">' + esc(t) + "</span>"; }).join("");
    }
    return '<span class="anlb">' + esc(items[0]) + "</span>" + '<span class="anmore">他' + (items.length - 1) + "件</span>";
  }

  function monthHtml() {
    if (!window.ANNUAL || !window.ANNUAL.length) return '<div class="empty">年間予定表は、まだ準備中です。<br>データが届いたら、ここに表示されます。</div>';
    var cur = MONTHS[idx], map = byDate(), sched = schedByDate();
    var first = new Date(cur.y, cur.m - 1, 1), days = new Date(cur.y, cur.m, 0).getDate(), startWd = first.getDay();
    var weeks = Math.ceil((startWd + days) / 7);
    var h = '<div class="anwrap"><div class="ancard">' +
      '<div class="anhead"><button type="button" id="an-prev" ' + (idx === 0 ? "disabled" : "") + ' style="transform:scaleX(-1)">' + window.TTIco.i("chev", 18) + '</button>' +
      "<b>" + cur.y + "年" + cur.m + "月</b>" +
      '<button type="button" id="an-next" ' + (idx === MONTHS.length - 1 ? "disabled" : "") + '>' + window.TTIco.i("chev", 18) + "</button></div>" +
      '<div class="anleg"><span><i class="lhol"></i>祝日・休日</span><span><i class="loff"></i>授業のない日</span></div>' +
      '<div class="ancal" style="--an-rows:' + weeks + '">' + WD.map(function (w, i) { return '<div class="anwd' + (i === 0 ? " sun" : i === 6 ? " sat" : "") + '">' + w + "</div>"; }).join("");
    for (var i = 0; i < startWd; i++) h += '<div class="anday empty2"></div>';
    for (var d = 1; d <= days; d++) {
      var ds = cur.y + "-" + pad(cur.m) + "-" + pad(d), e = map[ds], schedToday = sched[ds];
      var wd = (startWd + d - 1) % 7;
      var hasNum = e && /\d/.test(e.label); // 数字が書かれている日＝授業がある日
      var cls = "anday" + (wd === 0 ? " sun" : wd === 6 ? " sat" : "") + (e && e.holiday ? " hol" : !hasNum ? " off" : "") + (schedToday && schedToday.length ? " has-sc" : "");
      var today = new Date(); var isToday = today.getFullYear() === cur.y && today.getMonth() + 1 === cur.m && today.getDate() === d;
      h += '<button type="button" class="' + cls + (isToday ? " today" : "") + '" data-date="' + ds + '"><span class="andn">' + d + "</span>" +
        cellBodyHtml(itemsFor(e, schedToday)) + "</button>";
    }
    h += "</div></div>" + '<p class="muted small anfoot">学校配布の年間スケジュール（学内用）に、スケジュールタブで追加した予定を重ねて表示しています。最新は学校の案内を確認してください。</p></div>';
    return h;
  }
  function openDay(ds, e, schedToday) {
    var d = new Date(ds);
    var schedHtml = (schedToday || []).map(function (s) {
      return '<div class="sylrow"><div class="sl">' + (s.time ? esc(s.time) : "予定") + '</div><div class="sv">' + esc(s.title) + (s.note ? "\n" + s.note : "") + "</div></div>";
    }).join("");
    C.openSheet(
      '<div class="shead"><b>' + (d.getMonth() + 1) + "月" + d.getDate() + "日（" + WD[d.getDay()] + "）</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      (e && e.label ? '<p style="font-size:1rem;' + (e.holiday ? "color:var(--hot);font-weight:700" : "") + '">' + esc(e.label) + "</p>" : "") +
      (schedHtml || (!e || !e.label) ? schedHtml || '<p class="muted">この日は、特に記載がありません。</p>' : "")
    , { center: true });
  }

  var view = null, onClick = null;
  function render() { if (view) view.innerHTML = monthHtml(); }

  function mount(v, acts) {
    view = v; acts.innerHTML = "";
    render();
    // タブを開くたびに view は使い回されるので、前回ぶんの仕組みを外してから付け直す（二重に反応しないように）
    if (onClick) view.removeEventListener("click", onClick);
    onClick = function (e) {
      var b;
      if ((b = e.target.closest("#an-prev"))) { if (idx > 0) { idx--; render(); } return; }
      if ((b = e.target.closest("#an-next"))) { if (idx < MONTHS.length - 1) { idx++; render(); } return; }
      if ((b = e.target.closest("[data-date]"))) { var ds = b.getAttribute("data-date"); openDay(ds, byDate()[ds], schedByDate()[ds]); }
    };
    view.addEventListener("click", onClick);
  }
  window.TTAnnual = { mount: mount };
})();
