(function () {
  "use strict";
  var C = window.TTCommon, store = C.store, esc = C.esc;
  function items() { return store.get("sched", []); }
  function save(a) { store.set("sched", a); if (window.TTCloud) window.TTCloud.syncAll(); }
  // 同じ日の中では、時間がある予定を時間順に先へ。時間がない予定は、追加した順のまま後ろに続く
  function timeCmp(a, b) {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    return 0;
  }
  window.TTSchedCmp = timeCmp; // annual.js と共通で使う
  function sorted() { return items().slice().sort(function (a, b) { return (a.date || "9999").localeCompare(b.date || "9999") || timeCmp(a, b); }); }
  function fmt(d) {
    if (!d) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return d;
    var wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
    return +m[2] + "/" + +m[3] + "(" + wd + ")";
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  // iPhone標準のカレンダーに登録するための.icsファイルを作る（Web Pushが届かないとき用の保険）
  function icsFor(it) {
    var s = window.TTNotify.settings(), minutes = (s && s.minutes) || 10;
    var dt = it.date.replace(/-/g, "") + "T" + it.time.replace(":", "") + "00";
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad2(now.getUTCMonth() + 1) + pad2(now.getUTCDate()) + "T" +
      pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + "Z";
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//class-timetable//JP", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + it.id + "@class-timetable",
      "DTSTAMP:" + stamp,
      "DTSTART:" + dt,
      "SUMMARY:" + icsEscape(it.title),
      it.note ? "DESCRIPTION:" + icsEscape(it.note) : null,
      "BEGIN:VALARM",
      "TRIGGER:-PT" + minutes + "M",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + icsEscape(it.title),
      "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean);
    return lines.join("\r\n");
  }
  function downloadIcs(it) {
    var blob = new Blob([icsFor(it)], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = (it.title || "予定") + ".ics";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  var view = null;

  function render() {
    var list = sorted(), today = new Date().toISOString().slice(0, 10), prevDate = null;
    if (!list.length) { view.innerHTML = '<div class="empty">まだ予定がありません。右上の＋から追加できます。</div>'; return; }
    view.innerHTML = list.map(function (it) {
      var newDay = prevDate !== null && it.date !== prevDate; prevDate = it.date;
      return (newDay ? '<div class="daysep"></div>' : "") +
        '<div class="litem" data-id="' + it.id + '"><div class="lmain"><div class="ld">' + esc(fmt(it.date)) + (it.time ? " " + esc(it.time) : "") + (it.date && it.date < today ? '　<span class="muted">終了</span>' : "") + "</div><div class=\"lt\">" + esc(it.title) + "</div>" +
        (it.note ? '<div class="muted small" style="margin-top:4px;white-space:pre-wrap">' + esc(it.note) + "</div>" : "") + '</div>' +
        (it.time ? '<button type="button" data-ics="' + it.id + '" title="カレンダーに追加">' + window.TTIco.i("cal", 18) + "</button>" : "") +
        '<button type="button" data-del="' + it.id + '">' + window.TTIco.i("trash", 18) + "</button></div>";
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
  function openNotifSettings() {
    var s = window.TTNotify.settings();
    var opts = [5, 10, 15, 30, 60, 120, 180, 1440];
    var html = '<div class="shead"><b>通知設定</b><button type="button" data-sheet-close>' + window.TTIco.i("x", 18) + "</button></div>" +
      '<div class="srow"><span>通知する</span><label class="toggle"><input type="checkbox" id="nf-on"' + (s.enabled ? " checked" : "") + '><span class="trk"></span></label></div>' +
      '<label class="slab">何分前に通知する</label>' +
      '<select class="sfield" id="nf-min">' + opts.map(function (m) { return '<option value="' + m + '"' + (m === s.minutes ? " selected" : "") + '>' + (m >= 60 ? (m / 60) + "時間前" : m + "分前") + "</option>"; }).join("") + "</select>" +
      '<p class="muted small" style="margin-top:8px">時間が設定されている予定だけが対象です。iPhoneでアプリを完全に閉じてスリープ中だと、通知が届かないことがあります。確実に届けたい予定は、一覧のカレンダーアイコンから標準カレンダーにも追加しておくと安心です。</p>' +
      '<button class="btn primary" type="button" id="nf-save" style="width:100%;margin-top:6px">保存する</button>';
    var sh = C.openSheet(html, { center: true });
    sh.el.querySelector("#nf-save").addEventListener("click", function () {
      var enabled = sh.el.querySelector("#nf-on").checked;
      var minutes = +sh.el.querySelector("#nf-min").value;
      function finish() {
        window.TTNotify.saveSettings({ enabled: enabled, minutes: minutes });
        if (enabled && window.TTCloud) {
          window.TTCloud.subscribePush().catch(function () { alert("通知の登録に失敗しました。時間をおいて、もう一度お試しください。"); });
        }
        sh.close();
      }
      if (enabled && !("Notification" in window)) { alert("この環境では通知が使えません。"); enabled = false; finish(); return; }
      if (enabled && Notification.permission !== "granted") {
        Notification.requestPermission().then(function (perm) {
          if (perm !== "granted") { enabled = false; alert("通知が許可されなかったため、通知はオフのままにします。"); }
          finish();
        });
      } else {
        finish();
      }
    });
  }
  var onViewClick = null;
  function mount(v, acts) {
    view = v; view.innerHTML = "";
    acts.innerHTML = '<button type="button" id="sc-notif">' + window.TTIco.i("bell", 18) + "</button>" +
      '<button type="button" id="sc-add">' + window.TTIco.i("plus", 18) + "追加</button>";
    acts.querySelector("#sc-notif").addEventListener("click", openNotifSettings);
    acts.querySelector("#sc-add").addEventListener("click", function () { openAdd(null); });
    render();
    // タブを開くたびに view は使い回されるので、前回ぶんの仕組みを外してから付け直す（二重に反応しないように）
    if (onViewClick) view.removeEventListener("click", onViewClick);
    onViewClick = function (e) {
      var ic = e.target.closest("[data-ics]");
      if (ic) { var rec0 = items().filter(function (x) { return x.id === ic.getAttribute("data-ics"); })[0]; if (rec0) downloadIcs(rec0); return; }
      var d = e.target.closest("[data-del]");
      if (d) { if (confirm("この予定を削除しますか？")) { save(items().filter(function (x) { return x.id !== d.getAttribute("data-del"); })); render(); } return; }
      var it = e.target.closest(".litem");
      if (it && !e.target.closest("button")) { var rec = items().filter(function (x) { return x.id === it.getAttribute("data-id"); })[0]; if (rec) openAdd(rec); }
    };
    view.addEventListener("click", onViewClick);
  }
  window.TTSchedule = { mount: mount };
})();
