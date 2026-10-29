(function () {
  "use strict";
  var esc = window.TTCommon.esc;
  function fmt(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return d;
    var wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
    return +m[2] + "/" + +m[3] + "(" + wd + ")";
  }
  function mount(view, acts) {
    acts.innerHTML = "";
    var list = (window.ANNUAL || []).slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
    if (!list.length) {
      view.innerHTML = '<div class="empty">年間予定表は、まだ準備中です。<br>データが届いたら、ここに表示されます。</div>';
      return;
    }
    view.innerHTML = list.map(function (it) {
      return '<div class="litem"><div class="lmain"><div class="ld">' + esc(fmt(it.date)) + '</div><div class="lt">' + esc(it.label) + "</div></div></div>";
    }).join("");
  }
  window.TTAnnual = { mount: mount };
})();
