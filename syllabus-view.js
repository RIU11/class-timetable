(function () {
  "use strict";
  var C = window.TTCommon, esc = C.esc;

  function row(label, val) { return val ? '<div class="sylrow"><div class="sl">' + esc(label) + '</div><div class="sv">' + esc(val) + "</div></div>" : ""; }

  function planTable(plan) {
    if (!plan || !plan.length) return "";
    return '<div class="slab" style="margin-top:14px">授業計画・授業内容</div><table class="plantbl"><thead><tr><th>授業日</th><th>授業内容</th><th>学習到達度目標</th></tr></thead><tbody>' +
      plan.map(function (p) {
        return "<tr><td class=\"pd\">" + esc(p.date || "") + (p.form ? "<br><span class=\"muted small\">" + esc(p.form) + "</span>" : "") + "</td><td>" + esc(p.content || "") + "</td><td>" + esc(p.target || "") + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function open(s, room) {
    var periods = (s.periods || []).join("・");
    var html = '<div class="shead"><b>' + esc(s.subject) + "</b><button type=\"button\" data-sheet-close>" + window.TTIco.i("x", 18) + "</button></div>" +
      '<div class="sylhead"><span class="chip acc">' + esc(s.day || "") + "曜" + esc(periods) + "限</span>" +
      (s.required ? '<span class="chip">' + esc(s.required) + "</span>" : "") +
      (s.credits ? '<span class="chip">' + esc(s.credits) + "</span>" : "") +
      (s.term ? '<span class="chip">' + esc(s.term) + "</span>" : "") +
      (room ? '<span class="chip">教室 ' + esc(room) + "</span>" : "") + "</div>" +
      row("担当教員", s.teacher) + row("年次", s.year) + row("学科・コース", s.track) + row("授業形態", s.form) +
      row("教員の略歴", s.bio) + row("学習内容", s.content) + row("到達目標", s.goal) + row("評価方法と基準", s.evalText) +
      row("準備学習／時間外学習", s.prep) + row("教科書・参考書等", s.textbook) + row("必要な機材", s.equipment) +
      planTable(s.plan);
    C.openSheet(html);
  }
  window.TTSyllabusView = { open: open };
})();
