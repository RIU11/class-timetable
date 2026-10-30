(function () {
  "use strict";
  var C = window.TTCommon, store = C.store, esc = C.esc;
  var DAYS_ALL = ["月", "火", "水", "木", "金", "土", "日"];
  var DAY_SETS = {
    weekday: { label: "平日のみ", days: ["月", "火", "水", "木", "金"] },
    weekday6: { label: "平日＋土曜日", days: ["月", "火", "水", "木", "金", "土"] },
    all: { label: "月〜日", days: DAYS_ALL }
  };
  var DEFAULT_TIMES = ["09:30-11:00", "11:10-12:40", "13:20-14:50", "15:00-16:30", "16:40-18:10", "18:20-19:50", "20:00-21:30", "21:40-23:10"];
  var SWATCH = ["#ef6f6f", "#f0a84e", "#e8c948", "#7fce7f", "#5cc8c0", "#6fa9f0", "#9f8ef0", "#e07fd0"];

  function settings() {
    var s = store.get("settings", null);
    if (!s) s = { periods: 6, dayset: "weekday6", times: DEFAULT_TIMES.slice() };
    if (!s.times) s.times = DEFAULT_TIMES.slice();
    while (s.times.length < s.periods) s.times.push(DEFAULT_TIMES[s.times.length] || "00:00-00:00");
    return s;
  }
  function saveSettings(s) { store.set("settings", s); }
  function daysOf(s) { return (DAY_SETS[s.dayset] || DAY_SETS.weekday6).days; }
  function regs() { return store.get("reg", []); }
  function saveRegs(r) { store.set("reg", r); }

  function colorOf(key) {
    var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return SWATCH[h % SWATCH.length];
  }
  function regFor(r, day, period) {
    for (var i = 0; i < r.length; i++) { var x = r[i]; if (x.day === day && x.periods.indexOf(period) >= 0) return x; }
    return null;
  }
  function labelOf(reg) {
    if (!reg) return null;
    if (reg.type === "syllabus") { var s = findSyl(reg.sylId); return s ? { subject: s.subject, teacher: s.teacher || "", room: reg.room || "" } : { subject: "（見つかりません）", teacher: "", room: reg.room || "" }; }
    return { subject: reg.subject || "（名称未設定）", teacher: reg.teacher || "", room: reg.room || "" };
  }
  function findSyl(id) { return (window.SYLLABI || []).filter(function (x) { return x.id === id; })[0] || null; }
  function candidatesFor(day, period) {
    return (window.SYLLABI || []).filter(function (x) { return x.day === day && x.periods && x.periods.indexOf(period) >= 0; });
  }

  var editMode = false, view = null, acts = null;

  function headerActs() {
    acts.innerHTML = '<button type="button" id="tt-settings">' + window.TTIco.i("cal", 18) + "設定</button>" +
      '<button type="button" id="tt-edit" class="' + (editMode ? "on" : "") + '">' + window.TTIco.i("edit", 18) + (editMode ? "完了" : "編集") + "</button>";
    document.getElementById("tt-settings").addEventListener("click", openSettings);
    document.getElementById("tt-edit").addEventListener("click", function () { editMode = !editMode; headerActs(); renderGrid(); });
  }

  function renderGrid() {
    var s = settings(), days = daysOf(s), r = regs();
    var box = document.getElementById("tt-box"); if (!box) return;
    var cols = "34px repeat(" + days.length + ", minmax(0,1fr))";
    var h = '<div class="ttwrap"><div class="ttgrid" style="--cols:' + cols + '">' +
      '<div class="ttrow"><div class="ttcorner"></div>' + days.map(function (d) { return '<div class="ttdh"><b>' + esc(d) + "</b></div>"; }).join("") + "</div>";
    for (var p = 1; p <= s.periods; p++) {
      var t = (s.times[p - 1] || "").split("-");
      h += '<div class="ttrow"><div class="ttph"><b>' + p + "</b><span>" + esc(t[0] || "") + "</span></div>";
      days.forEach(function (d) {
        var reg = regFor(r, d, p), lab = labelOf(reg);
        if (lab) {
          var col = colorOf((reg.type === "syllabus" ? reg.sylId : reg.key) || (d + p));
          h += '<button type="button" class="ttcell has' + (editMode ? " edit" : "") + '" style="border-color:' + col + ";background:" + col + "22" + '" data-day="' + d + '" data-p="' + p + '"><div class="tn">' + esc(lab.subject) + "</div>" + (lab.teacher ? '<div class="tt">' + esc(lab.teacher) + "</div>" : "") + (lab.room ? '<div class="tr">' + esc(lab.room) + "</div>" : "") + "</button>";
        } else {
          h += '<button type="button" class="ttcell' + (editMode ? " edit" : "") + '" data-day="' + d + '" data-p="' + p + '"></button>';
        }
      });
      h += "</div>";
    }
    h += "</div></div>" + (editMode ? '<p class="muted small" style="margin:8px 4px">コマをタップすると、授業を登録・変更できます。</p>' : '<p class="muted small" style="margin:8px 4px">登録したコマをタップすると、シラバスが見られます。右上の「編集」で、授業を登録できます。</p>');
    box.innerHTML = h;
  }

  function onCellClick(day, p) {
    var r = regs(), reg = regFor(r, day, p);
    if (!editMode) {
      if (reg) openDetail(reg); else openPicker(day, p, null);
      return;
    }
    openPicker(day, p, reg);
  }

  /* ---------- 候補選択シート（編集モード） ---------- */
  function openPicker(day, p, existing) {
    var cands = candidatesFor(day, p);
    var sh = C.openSheet(pickerHtml(day, p, cands, existing, ""));
    bindPicker(sh, day, p, cands, existing);
  }
  function pickerListHtml(cands, q) {
    var list = q ? cands.filter(function (c) { return (c.subject + c.teacher).indexOf(q) >= 0; }) : cands;
    return list.length ? list.map(function (c) {
      return '<button type="button" class="citem" data-id="' + esc(c.id) + '"><span class="ci-sw" style="background:' + colorOf(c.id) + '"></span><span class="ci-main"><div class="ci-t">' + esc(c.subject) + '</div><div class="ci-s">' + esc(c.teacher || "") + "　" + esc((c.periods || []).join("・")) + "限</div></span><span>" + window.TTIco.i("chev", 18) + "</span></button>";
    }).join("") : '<p class="muted small">このコマに一致する授業が見つかりません。「新規作成」で入力してください。</p>';
  }
  function pickerHtml(day, p, cands, existing, q) {
    return '<div class="shead"><b>' + esc(day) + "曜" + p + "限</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      '<input class="sfield" id="pk-q" placeholder="授業名または教員名で検索" value="' + esc(q) + '">' +
      (existing ? '<div style="display:flex;gap:8px;margin-bottom:8px"><button class="btn" type="button" id="pk-editreg" style="flex:1">' + window.TTIco.i("edit", 16) + "このコマを編集</button><button class=\"btn danger\" type=\"button\" id=\"pk-clear\" style=\"flex:1\">" + window.TTIco.i("trash", 16) + "削除</button></div>" : "") +
      '<button class="btn" type="button" id="pk-new" style="width:100%;margin-bottom:10px">' + window.TTIco.i("plus", 16) + "新規作成（自分で入力）</button>" +
      '<div class="clist" id="pk-list">' + pickerListHtml(cands, q) + "</div>";
  }
  function bindPicker(sh, day, p, cands, existing) {
    var box = sh.el.querySelector(".sbox");
    box.addEventListener("input", function (e) {
      if (e.target.id !== "pk-q") return;
      sh.el.querySelector("#pk-list").innerHTML = pickerListHtml(cands, e.target.value);
    });
    box.addEventListener("click", function (e) {
      var it = e.target.closest("[data-id]");
      if (it) { sh.close(); openRoomForm(day, findSyl(it.getAttribute("data-id")), existing); return; }
      if (e.target.closest("#pk-clear")) { clearReg(day, p); sh.close(); return; }
      if (e.target.closest("#pk-editreg")) { sh.close(); openEditForm(day, existing); return; }
      if (e.target.closest("#pk-new")) { sh.close(); openCustomForm(day, p, existing && existing.type === "custom" ? existing : null); return; }
    });
  }
  function openCustomForm(day, p, existing) {
    var sh = C.openSheet(
      '<div class="shead"><b>新規作成</b><button type="button" data-sheet-close>' + window.TTIco.i("x", 18) + "</button></div>" +
      '<label class="slab">授業名</label><input class="sfield" id="cf-subject" value="' + esc(existing ? existing.subject : "") + '" placeholder="例：キャラクターモデリング">' +
      '<label class="slab">先生</label><input class="sfield" id="cf-teacher" value="' + esc(existing ? existing.teacher : "") + '" placeholder="任意">' +
      '<label class="slab">教室</label><input class="sfield" id="cf-room" value="' + esc(existing ? existing.room : "") + '" placeholder="任意">' +
      '<label class="slab">メモ</label><textarea class="sfield" id="cf-note" placeholder="任意">' + esc(existing ? existing.note || "" : "") + "</textarea>" +
      '<button class="btn primary" type="button" id="cf-save" style="width:100%">' + esc(day) + "曜" + p + "限に登録</button>"
    , { center: true });
    sh.el.querySelector("#cf-save").addEventListener("click", function () {
      var subject = sh.el.querySelector("#cf-subject").value.trim();
      if (!subject) { sh.el.querySelector("#cf-subject").focus(); return; }
      register({ key: existing ? existing.key : C.uid(), day: day, periods: [p], type: "custom",
        subject: subject, teacher: sh.el.querySelector("#cf-teacher").value.trim(), room: sh.el.querySelector("#cf-room").value.trim(), note: sh.el.querySelector("#cf-note").value.trim() });
      sh.close();
    });
  }
  function openEditForm(day, existing) {
    var s = settings(), days = daysOf(s);
    var cur = existing.type === "syllabus" ? findSyl(existing.sylId) : null;
    var subject = cur ? cur.subject : (existing.subject || "");
    var teacher = cur ? cur.teacher : (existing.teacher || "");
    var note = cur ? "" : (existing.note || "");
    var pMin = Math.min.apply(null, existing.periods), pMax = Math.max.apply(null, existing.periods);
    var periodOpts = function (sel) {
      var h = "";
      for (var i = 1; i <= s.periods; i++) h += '<option value="' + i + '"' + (i === sel ? " selected" : "") + ">" + i + "限</option>";
      return h;
    };
    var sh = C.openSheet(
      '<div class="shead"><b>このコマを編集</b><button type="button" data-sheet-close>' + window.TTIco.i("x", 18) + "</button></div>" +
      '<p class="muted small">シラバスの内容が間違っているときは、ここで書き換えられます。書き換えると、このコマは自分で入力した内容になります（元のシラバスの詳細ページは見られなくなります）。</p>' +
      '<label class="slab">授業名</label><input class="sfield" id="cf-subject" value="' + esc(subject) + '" placeholder="例：キャラクターモデリング">' +
      '<label class="slab">先生</label><input class="sfield" id="cf-teacher" value="' + esc(teacher) + '" placeholder="任意">' +
      '<label class="slab">教室</label><input class="sfield" id="cf-room" value="' + esc(existing.room || "") + '" placeholder="任意">' +
      '<label class="slab">メモ</label><textarea class="sfield" id="cf-note" placeholder="任意">' + esc(note) + "</textarea>" +
      '<label class="slab">曜日</label><select class="sfield" id="cf-day">' + days.map(function (d) { return '<option value="' + d + '"' + (d === day ? " selected" : "") + ">" + d + "曜</option>"; }).join("") + "</select>" +
      '<label class="slab">授業時間</label><div style="display:flex;align-items:center;gap:8px"><select class="sfield" id="cf-ps" style="margin:0">' + periodOpts(pMin) + '</select><span class="muted">〜</span><select class="sfield" id="cf-pe" style="margin:0">' + periodOpts(pMax) + "</select></div>" +
      '<button class="btn primary" type="button" id="cf-save" style="width:100%;margin-top:4px">編集を登録</button>'
    , { center: true });
    sh.el.querySelector("#cf-save").addEventListener("click", function () {
      var newSubject = sh.el.querySelector("#cf-subject").value.trim();
      if (!newSubject) { sh.el.querySelector("#cf-subject").focus(); return; }
      var newDay = sh.el.querySelector("#cf-day").value;
      var ps = +sh.el.querySelector("#cf-ps").value, pe = +sh.el.querySelector("#cf-pe").value;
      if (pe < ps) { var t = ps; ps = pe; pe = t; }
      var periods = []; for (var i = ps; i <= pe; i++) periods.push(i);
      updateReg(existing.key, { key: existing.key, day: newDay, periods: periods, type: "custom",
        subject: newSubject, teacher: sh.el.querySelector("#cf-teacher").value.trim(), room: sh.el.querySelector("#cf-room").value.trim(), note: sh.el.querySelector("#cf-note").value.trim() });
      sh.close();
    });
  }
  function openRoomForm(day, syl, existing) {
    var pre = existing && existing.type === "syllabus" && existing.sylId === syl.id ? existing.room : "";
    var sh = C.openSheet(
      '<div class="shead"><b>' + esc(syl.subject) + "</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      '<p class="muted small">' + esc(syl.day) + "曜" + esc((syl.periods || []).join("・")) + "限　" + esc(syl.teacher || "") + "</p>" +
      '<label class="slab">教室（任意）</label><input class="sfield" id="rf-room" value="' + esc(pre) + '" placeholder="例：504">' +
      '<button class="btn primary" type="button" id="rf-save" style="width:100%">この内容で登録</button>'
    , { center: true });
    sh.el.querySelector("#rf-save").addEventListener("click", function () {
      register({ key: C.uid(), day: day, periods: syl.periods, type: "syllabus", sylId: syl.id, room: sh.el.querySelector("#rf-room").value.trim() });
      sh.close();
    });
  }
  function register(reg) {
    var r = regs().filter(function (x) { return !(x.day === reg.day && x.periods.some(function (pp) { return reg.periods.indexOf(pp) >= 0; })); });
    r.push(reg); saveRegs(r); renderGrid();
  }
  function updateReg(oldKey, reg) {
    var r = regs().filter(function (x) { return x.key !== oldKey && !(x.day === reg.day && x.periods.some(function (pp) { return reg.periods.indexOf(pp) >= 0; })); });
    r.push(reg); saveRegs(r); renderGrid();
  }
  function clearReg(day, p) {
    var r = regs().filter(function (x) { return !(x.day === day && x.periods.indexOf(p) >= 0); });
    saveRegs(r); renderGrid();
  }

  /* ---------- シラバス詳細（通常モード） ---------- */
  function openDetail(reg) {
    if (reg.type === "syllabus") {
      var s = findSyl(reg.sylId);
      if (!s) { alert("このシラバスは見つかりませんでした。"); return; }
      window.TTSyllabusView.open(s, reg.room);
    } else {
      C.openSheet(
        '<div class="shead"><b>' + esc(reg.subject) + "</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
        (reg.teacher ? '<div class="sylrow"><div class="sl">先生</div><div class="sv">' + esc(reg.teacher) + "</div></div>" : "") +
        (reg.room ? '<div class="sylrow"><div class="sl">教室</div><div class="sv">' + esc(reg.room) + "</div></div>" : "") +
        (reg.note ? '<div class="sylrow"><div class="sl">メモ</div><div class="sv">' + esc(reg.note) + "</div></div>" : "") +
        '<p class="muted small" style="margin-top:10px">自分で入力したコマです（シラバスPDFには、一致するものがありません）。</p>'
      , { center: true });
    }
  }

  /* ---------- 設定 ---------- */
  function openSettings() {
    var s = settings();
    var html = '<div class="shead"><b>時限・曜日・授業時間</b><button type="button" data-sheet-close>' + window.TTIco.i("x", 18) + "</button></div>" +
      '<label class="slab">時限数</label><select class="sfield" id="st-periods">' + [4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '"' + (n === s.periods ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select>" +
      '<label class="slab">表示する曜日</label><select class="sfield" id="st-days">' + Object.keys(DAY_SETS).map(function (k) { return '<option value="' + k + '"' + (k === s.dayset ? " selected" : "") + ">" + DAY_SETS[k].label + "</option>"; }).join("") + "</select>" +
      '<label class="slab">授業時間</label><div id="st-times">' + timesHtml(s) + "</div>" +
      '<button class="btn primary" type="button" id="st-save" style="width:100%;margin-top:10px">保存する</button>';
    var sh = C.openSheet(html, { center: true });
    sh.el.querySelector("#st-periods").addEventListener("change", function () {
      var n = +this.value; var t = s.times.slice(); while (t.length < n) t.push(DEFAULT_TIMES[t.length] || "00:00-00:00");
      sh.el.querySelector("#st-times").innerHTML = timesHtml({ periods: n, times: t });
    });
    sh.el.querySelector("#st-save").addEventListener("click", function () {
      var n = +sh.el.querySelector("#st-periods").value, dayset = sh.el.querySelector("#st-days").value, times = [];
      for (var i = 1; i <= n; i++) {
        var a = sh.el.querySelector("#st-s" + i).value || "00:00", b = sh.el.querySelector("#st-e" + i).value || "00:00";
        times.push(a + "-" + b);
      }
      saveSettings({ periods: n, dayset: dayset, times: times });
      sh.close(); renderGrid();
    });
  }
  function timesHtml(s) {
    var h = "";
    for (var i = 1; i <= s.periods; i++) {
      var t = (s.times[i - 1] || "00:00-00:00").split("-");
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="muted small" style="width:34px">' + i + "限</span>" +
        '<input type="time" class="sfield" style="margin:0" id="st-s' + i + '" value="' + esc(t[0]) + '">' +
        '<span class="muted">〜</span><input type="time" class="sfield" style="margin:0" id="st-e' + i + '" value="' + esc(t[1] || "") + '"></div>';
    }
    return h;
  }

  /* ---------- マウント ---------- */
  function mount(v, a) {
    view = v; acts = a; headerActs();
    view.innerHTML = '<div id="tt-box"></div>';
    renderGrid();
    view.addEventListener("click", function (e) {
      var c = e.target.closest(".ttcell"); if (!c) return;
      onCellClick(c.getAttribute("data-day"), +c.getAttribute("data-p"));
    });
  }
  window.TTTimetable = { mount: mount };
})();
