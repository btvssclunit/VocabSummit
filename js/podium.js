/* js/podium.js — 颁奖台 (owner 2026-08-16)
   前三名的动画颁奖台 + 彩带，比赛结束时同时出现在**老师的投影**和**每个学生自己的
   屏幕**上。Kahoot 那一幕之所以有用，是因为全班同时看到同一个画面。

   ⚠️ 这个文件刻意没有任何依赖：不读 store、不碰 Firestore、不 import 任何东西。
   给它一个容器和一份已排好序的名次，它只负责画。
   ⚠️ 也正因为如此，它是 `teacher.html` **唯一**加载的共享 JS。教师端「独立」这条约定
   针对的是 cs.css/cs.js/profile.js —— 那些带着学生状态与整套引擎；
   一个无状态的纯呈现模块不属于那一类，把 200 行颁奖台在两处各抄一份才是真的坏。

   用法：
     WSPodium.show(container, rows, { unit:"分", me:"<uid>", onDone:fn })
   rows = [{ uid, name, score, av }]  已按名次排好序，第 0 个是冠军。
   `av` 是头像**文件路径**，不是 id —— teacher.html 没有头像目录，给它 id 它查不出文件。 */

(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function reduced() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* 彩带：canvas 手写，不引外部库（CSP 与「自带一切」的约定都要求如此）。
     ⚠️ 会自己停：120 片落完就 cancelAnimationFrame 并移除 canvas，
     否则一个投影在教室里挂一节课，rAF 会一直烧 GPU。 */
  function confetti(host, ms) {
    if (reduced()) return function () {};
    var cv = document.createElement("canvas");
    cv.className = "pod-confetti";
    host.appendChild(cv);
    var ctx = cv.getContext("2d"), raf = 0, stopped = false;
    var COLS = ["#E3A63C", "#F5C443", "#2E6391", "#5B8A66", "#FFFFFF", "#C9452F"];
    var bits = [], W = 0, H = 0;
    function size() {
      var r = host.getBoundingClientRect();
      W = cv.width = Math.max(1, Math.round(r.width));
      H = cv.height = Math.max(1, Math.round(r.height));
    }
    size();
    for (var i = 0; i < 120; i++) {
      bits.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
        w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
        vy: 1.4 + Math.random() * 2.6, vx: -0.9 + Math.random() * 1.8,
        rot: Math.random() * Math.PI, vr: -0.12 + Math.random() * 0.24,
        c: COLS[(Math.random() * COLS.length) | 0]
      });
    }
    var t0 = Date.now();
    function frame() {
      if (stopped) return;
      ctx.clearRect(0, 0, W, H);
      var alive = 0;
      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.y += b.vy; b.x += b.vx; b.rot += b.vr;
        if (b.y < H + 30) alive++;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      if (!alive || Date.now() - t0 > (ms || 6000)) return stop();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (cv.parentNode) cv.parentNode.removeChild(cv);
    }
    raf = requestAnimationFrame(frame);
    return stop;
  }

  function avatarHtml(av, cls) {
    /* ⚠️ onerror hides the img rather than showing a broken icon — a student may
       have no avatar, or an old row may point at art that has since moved. */
    return av
      ? '<img class="' + cls + '" src="' + esc(av) + '" alt="" ' +
        "onerror=\"this.style.display='none'\">"
      : '<span class="' + cls + ' none">👤</span>';
  }

  /* show(rows, opts) — rows must already be in finishing order.
     ⚠️ IT BUILDS ITS OWN FULL-SCREEN OVERLAY on document.body rather than rendering
     into a caller-supplied box (owner 2026-08-16: the backdrop should fill the
     screen). Two reasons beyond the look: on a projector the celebration wants the
     whole frame, and rendering inside .arena-card would have meant fighting that
     overlay's own z-index and scrim to get a full-bleed image behind it.
     Dismissible, because behind it sit the teacher's 结束／导出／关闭 controls and
     the student's results board. Returns close(). */
  function show(rows, opts) {
    opts = opts || {};
    rows = (rows || []).slice(0, 3);
    if (!rows.length) return function () {};
    var host = document.createElement("div");
    host.className = "pod-overlay";
    document.body.appendChild(host);

    /* 视觉顺序是 2 · 1 · 3（真实颁奖台的样子），名次顺序仍是 rows 的顺序。
       ⚠️ 只有一两个人时不要留空台子 —— 一个人的房间摆三级台阶看着像出错。 */
    var order = rows.length >= 3 ? [1, 0, 2] : (rows.length === 2 ? [1, 0] : [0]);
    var TIER = ["gold", "silver", "bronze"], MEDAL = ["🥇", "🥈", "🥉"];

    var h = '<div class="pod-wrap"><div class="pod-title">' +
      esc(opts.title || "🎉 恭喜！") + "</div><div class='pod-stage'>";
    order.forEach(function (idx, slot) {
      var r = rows[idx];
      var me = opts.me && r.uid === opts.me;
      h += '<div class="pod-col ' + TIER[idx] + (me ? " me" : "") + '" style="--d:' +
        (slot * 0.45).toFixed(2) + 's">' +
        '<div class="pod-who">' + avatarHtml(r.av, "pod-av") +
          '<div class="pod-name">' + esc(r.name || "无名") + (me ? " · 你" : "") + "</div>" +
          '<div class="pod-score">' + esc(String(r.score == null ? "" : r.score)) +
          (opts.unit ? " " + esc(opts.unit) : "") + "</div></div>" +
        '<div class="pod-block"><span class="pod-medal">' + MEDAL[idx] + "</span>" +
          '<span class="pod-rank">' + (idx + 1) + "</span></div></div>";
    });
    h += "</div>" +
      '<button class="pod-x" type="button">' + esc(opts.closeLabel || "完成") + "</button></div>";
    host.innerHTML = h;

    function close() {
      clearTimeout(t); stopC();
      if (host.parentNode) host.parentNode.removeChild(host);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    host.querySelector(".pod-x").onclick = close;
    /* tapping the backdrop dismisses too, but NOT a tap on the podium itself */
    host.addEventListener("click", function (e) { if (e.target === host) close(); });

    /* the columns rise in 3rd → 2nd → 1st order via the --d stagger in CSS, so the
       winner lands last; fire the confetti when that has happened. */
    var stopC = function () {};
    var delay = reduced() ? 0 : (order.length * 450 + 250);
    var t = setTimeout(function () {
      stopC = confetti(host, 6500);
      if (opts.onDone) opts.onDone();
    }, delay);
    return close;
  }

  window.WSPodium = { show: show, confetti: confetti };
})();
