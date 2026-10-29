(function () {
  "use strict";
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("tt:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("tt:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function openSheet(html, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "sheet" + (opts.center ? " center" : "");
    el.innerHTML = '<div class="sbox" role="dialog" aria-modal="true">' + html + "</div>";
    function close() { el.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    el.addEventListener("click", function (e) {
      if (e.target === el) close();
      var x = e.target.closest("[data-sheet-close]");
      if (x) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(el);
    return { el: el, close: close };
  }
  window.TTCommon = { store: store, esc: esc, uid: uid, openSheet: openSheet };
})();
