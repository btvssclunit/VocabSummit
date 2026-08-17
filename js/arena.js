/* 词山学海 · arena.js — 结伴登峰 (teacher-hosted live in-class competition), STUDENT side.
   ================================================================================
   Loaded on stream pages BEFORE app.js. Owns a full-screen overlay and a minimal,
   self-contained question renderer. It deliberately does NOT call renderCloze /
   scoreCorrect / bankPts — arena awards NO 历练值 and NO 灵露 (locked decision
   2026-08-12). A correct answer DOES mark the word mastered (海拔), via the narrow
   ctx.conferMastery(ids) hook app.js hands in — nothing else of app.js is touched.

   Public API:
     window.WSArena.open(ctx)
       ctx = { stream, words:[{id,w,py,pos,zh,en,cloze}], profile:{nickname,mtlClass},
               getUid:fn(cb), conferMastery:fn([wordId]) }

   Firestore model (see DESIGN_ARENA_课堂擂台.md §5):
     rooms/{code}                 host-written config, status lobby→running→ended
     rooms/{code}/players/{uid}   one row per student, throttled writes

   v1 modes here: cloze | zhmcq | enmcq. The two real-time game modes
   (攀山竞速 / 词雨灵露) are a later pass. Unknown modes degrade gracefully. */
(function () {
  "use strict";

  function db() { return (window.firebase && firebase.apps && firebase.apps.length) ? firebase.firestore() : null; }
  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }
  /* rooms.expiresAt drives the Firestore TTL policy the owner set up for 结伴登峰;
     a student-hosted PK room gets the same 6-hour sweep so abandoned rooms die. */
  function expiryTs() {
    return firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 6 * 3600 * 1000));
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* same cache-busting version app.js uses, read off our own <script src=…?v=>.
     See the note at the top of app.js. */
  var ASSET_V = (function () {
    try {
      var src = (document.currentScript && document.currentScript.src) || "";
      var m = src.match(/[?&]v=([^&]+)/);
      return m ? "?v=" + m[1] : "";
    } catch (e) { return ""; }
  })();

  var STYLE_ID = "wsArenaStyle";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style"); s.id = STYLE_ID;
    s.textContent =
      ".arena-ov{position:fixed;inset:0;z-index:90;background:linear-gradient(160deg,#12213F,#0C1730);" +
      "background-size:cover;background-position:center;" +
      "color:#EAF2F8;font-family:'Noto Sans SC',system-ui,sans-serif;display:flex;flex-direction:column;" +
      /* ⚠️ NOT justify-content:center — that is what hid the top of the leaderboard
         (owner 2026-08-17:「Leaderboard cannot show top two, can't scroll up」).
         A centred flex column whose content is TALLER than the box overflows in BOTH
         directions, and the top overflow is unreachable: scrollTop bottoms out at 0,
         which is already below the first rows. The result card carries up to 20 rows
         plus a medal, so on a laptop or an iPad in landscape the two names everyone
         actually wants — 第一名 and 第二名 — were the ones cut off.
         ⚠️ The auto-margin pair below centres the content when it FITS and pins it to
         the top when it does not, which is the behaviour justify-content:center was
         reaching for. Auto margins absorb free space before justify-content runs, so
         one at each end splits it evenly; with no free space they resolve to 0 and
         everything scrolls normally. ⚠️ Do NOT「simplify」this back to safe center:
         old iPads are the G1/G2 fleet and the safe keyword does not reach them. */
      "align-items:center;justify-content:flex-start;padding:20px;overflow:auto}" +
      ".arena-ov::before{content:'';display:block;flex:0 0 0;margin-top:auto}" +
      ".arena-ov::after{content:'';display:block;flex:0 0 0;margin-bottom:auto}" +
      ".arena-card{width:100%;max-width:560px;background:rgba(20,40,70,.55);border:2px solid #D9A72B;" +
      "border-radius:18px;padding:24px;box-shadow:0 14px 40px rgba(8,18,40,.5)}" +
      ".arena-t{font-family:'Noto Serif SC',serif;font-weight:900;font-size:22px;color:#FFE9B0;margin-bottom:12px}" +
      ".arena-sub{font-size:14px;color:#CBD8EA;line-height:1.8}" +
      ".arena-code-in{width:100%;box-sizing:border-box;text-align:center;letter-spacing:.35em;font-size:30px;" +
      "font-weight:800;text-transform:uppercase;padding:14px;border-radius:12px;border:2px solid #8FD3FF;" +
      "background:rgba(12,24,48,.7);color:#FFF;margin:14px 0}" +
      ".arena-btn{width:100%;border:0;border-radius:13px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;" +
      "background:var(--gold,#E3A63C);color:#3A2A08;margin-top:8px}" +
      ".arena-btn.ghost{background:rgba(20,40,70,.7);color:#8FD3FF;border:1px solid #8FD3FF}" +
      ".arena-msg{font-size:13.5px;margin-top:10px;min-height:18px;color:#FFCF8F}" +
      ".arena-code-chip{background:rgba(255,233,176,.16);border:1px solid rgba(255,233,176,.5);border-radius:999px;padding:2px 10px}" +
      ".arena-code-chip b{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;color:#FFE9B0}" +
      /* B层 对战徽章, shown in the result card itself — NOT via app.js's
         cel-overlay, which sits at z-index 300 and would cover this board. */
      ".arena-medal{display:flex;align-items:center;gap:13px;margin:14px 0 0;padding:11px 14px;border-radius:14px;" +
      "background:rgba(255,233,176,.13);border:1px solid rgba(255,233,176,.45)}" +
      ".arena-medal.champ{background:rgba(217,167,43,.22);border-color:#D9A72B}" +
      ".arena-medal img{width:58px;height:58px;flex:none;border-radius:50%;object-fit:contain;background:rgba(255,255,255,.9)}" +
      ".arena-medal-txt{display:flex;flex-direction:column;gap:2px;min-width:0}" +
      ".arena-medal-txt b{font-family:'Noto Serif SC',serif;font-size:17px;color:#FFE9B0}" +
      ".arena-medal-txt span{font-size:12.5px;color:#CBD8EA}" +
      ".arena-hud{display:flex;gap:14px;align-items:center;width:100%;max-width:620px;margin-bottom:14px;font-size:14px}" +
      ".arena-hud b{color:#FFE9B0;font-size:18px}" +
      ".arena-timer{margin-left:auto;background:rgba(12,24,48,.7);border:1px solid #8FD3FF;border-radius:999px;padding:6px 16px;font-weight:800;color:#8FD3FF}" +
      ".arena-q{width:100%;max-width:620px}" +
      ".arena-qtext{font-family:'Noto Serif SC',serif;font-size:24px;line-height:1.7;color:#fff;background:rgba(20,40,70,.5);" +
      "border:1px solid rgba(143,211,255,.35);border-radius:14px;padding:20px;text-align:center;margin-bottom:14px}" +
      ".arena-qtext u{color:#FFE9B0;text-decoration-color:#D9A72B}" +
      ".arena-opts{display:grid;gap:10px}.arena-opts.n2{grid-template-columns:1fr 1fr}.arena-opts.n3,.arena-opts.n4{grid-template-columns:1fr 1fr}" +
      ".arena-opt{border:2px solid #B9CEDD;border-radius:13px;padding:16px;font-size:19px;background:rgba(255,255,255,.94);" +
      "color:#243B4A;cursor:pointer;font-weight:600;text-align:center}" +
      ".arena-opt.right{background:#E8F3EC;border-color:#3F9463;color:#1E5138}" +
      ".arena-opt.wrong{background:#F9E4E0;border-color:#C4553F;color:#7A3020}" +
      ".arena-ans{width:100%;box-sizing:border-box;font-size:22px;text-align:center;padding:14px;border-radius:12px;border:2px solid #B9CEDD}" +
      ".arena-fb{text-align:center;font-size:16px;margin-top:12px;min-height:22px;font-weight:700}" +
      ".arena-fb.ok{color:#8FE3AD}.arena-fb.bad{color:#FFB4A2}" +
      ".arena-board{width:100%;max-width:620px;margin-top:14px}" +
      ".arena-row{display:flex;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid rgba(143,211,255,.18);font-size:14px}" +
      ".arena-row.me{background:rgba(227,166,60,.18);border-radius:8px}" +
      ".arena-rk{width:26px;color:#FFE9B0;font-weight:800}.arena-sc{margin-left:auto;font-weight:800;color:#FFE9B0}" +
      ".arena-rain{position:relative;width:100%;max-width:620px;height:52vh;min-height:280px;overflow:hidden;" +
      "border:1px solid rgba(143,211,255,.3);border-radius:14px;margin-bottom:10px;" +
      "background-image:url('art/bg/rain_bg.png'),linear-gradient(180deg,rgba(234,244,250,.55),rgba(46,99,145,.55));" +
      "background-size:cover;background-position:center;image-rendering:pixelated}" +
      ".arena-rword{position:absolute;left:0;top:0;background:rgba(255,255,255,.95);color:#243B4A;border-radius:10px;" +
      "padding:6px 12px;text-align:center;font-weight:700;font-size:21px;will-change:transform}" +
      ".arena-rword .py{display:block;font-size:11px;color:#5A7080;font-weight:400}" +
      ".arena-rin{display:flex;gap:8px;width:100%;max-width:620px}" +
      ".arena-rin input{flex:1;font-size:20px;padding:12px;border-radius:12px;border:2px solid #B9CEDD;text-align:center}" +
      ".arena-rin button{border:0;border-radius:12px;padding:12px 20px;font-size:16px;font-weight:700;background:var(--gold,#E3A63C);color:#3A2A08;cursor:pointer}" +
      /* catch/miss feedback, ported from app.js's own 词雨灵露 (collectToBarrel/splashAt) so
         room-mode rain has the same satisfying feedback as solo practice — see 1.3. */
      ".arena-rword.collect{transition:transform .45s cubic-bezier(.4,.1,.7,1),opacity .45s;opacity:.15;z-index:3}" +
      ".arena-rainfx{position:absolute;background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none;z-index:3;" +
      "background-image:url(data:image/png;base64,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)}" +
      ".arena-barrel{position:absolute;right:10px;bottom:8px;width:46px;height:52px;z-index:4;" +
      "border:3px solid #6B4F3A;border-top-width:4px;border-radius:6px 6px 10px 10px;" +
      "background:rgba(255,255,255,.25);overflow:hidden;box-shadow:0 3px 10px rgba(23,58,90,.25)}" +
      ".arena-water{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(180deg,#7FB3D9,#2E6391);transition:height .4s ease}";
    document.head.appendChild(s);
  }

  function open(ctx) {
    injectStyle();
    if (!db()) { alert("结伴登峰需要联网。请检查网络后再试。"); return; }
    ctx = ctx || {};
    /* wordIndex normally comes from the joiner's own stream. 同伴挑战 rooms can be
       CROSS-STREAM (owner 2026-08-14: a form class holds mixed subject levels and
       they want to play together), so when the room's stream is not ours we fetch
       the host's word list instead — otherwise every room.wordIds lookup is
       undefined and the round renders blank. */
    var wordIndex = {}, wordPool = ctx.words || [];
    function indexWords(list) {
      wordIndex = {}; wordPool = list || [];
      wordPool.forEach(function (w) { wordIndex[w.id] = w; });
    }
    indexWords(ctx.words || []);
    var streamCache = {};
    function ensureStream(stream, cb) {
      if (!stream || stream === ctx.stream) { indexWords(ctx.words || []); return cb(); }
      if (streamCache[stream]) { indexWords(streamCache[stream]); return cb(); }
      fetch("data/" + stream + ".json" + ASSET_V).then(function (r) { return r.json(); }).then(function (j) {
        var list = [];
        j.levels.forEach(function (lv) {
          lv.units.forEach(function (u) {
            u.components.forEach(function (c) { c.words.forEach(function (w) { list.push(w); }); });
          });
        });
        streamCache[stream] = list; indexWords(list); cb();
      }).catch(function () { cb("词库载入失败，请检查网络。"); });
    }

    var ov = document.createElement("div");
    ov.className = "arena-ov";
    document.body.appendChild(ov);
    /* ⚠️ stopPodium too: the confetti runs on rAF and would outlive the overlay,
       burning GPU on a projector left open for the rest of the lesson. */
    var stopPodium = function () {};
    function close() { detach(); stopPodium(); ov.remove(); }

    /* Backdrop: reuse the app's own scenery instead of a flat gradient. The body
       already carries the student's earned ambience (bg-01..05 via applyAmbience),
       so lift that image and lay a dark scrim over it for text contrast. Falls back
       to the gradient if no image is found. Per-mode art is applied in setBackdrop. */
    var ambienceUrl = (function () {
      try {
        var bg = getComputedStyle(document.body).backgroundImage || "";
        var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        return m ? m[1] : null;
      } catch (e) { return null; }
    })();
    function setBackdrop(mode) {
      var art = ambienceUrl;
      if (mode === "sprint") art = "art/bg/sprint_bg.png";
      else if (mode === "rain") art = "art/bg/rain_bg.png";
      if (!art) return;                       // keep the CSS gradient fallback
      var scrim = (mode === "rain" || mode === "sprint")
        ? "linear-gradient(rgba(10,20,40,.72),rgba(10,20,40,.80))"   // gameplay: heavier, keeps HUD legible
        : "linear-gradient(rgba(10,20,40,.62),rgba(12,23,48,.74))";
      ov.style.backgroundImage = scrim + ',url("' + art + '")';
    }
    setBackdrop(null);

    /* 同伴挑战 caps (doc §2): a duel is the floor; past 6–8 a host who is also
       playing loses track of who joined, the single-line scoreboard stops fitting
       a landscape iPad, and a no-repeat pool pinches the smaller streams. */
    var PK_MIN = 2, PK_MAX = 8;
    var myUid = null, code = null, roomUnsub = null, room = null, isPk = false;
    ctx.getUid ? ctx.getUid(function (u) { myUid = u; }) : null;

    var lobbyPollTimer = null;
    function detach() {
      if (roomUnsub) { roomUnsub(); roomUnsub = null; }
      if (playersUnsub) { playersUnsub(); playersUnsub = null; }
      if (lobbyPollTimer) { clearInterval(lobbyPollTimer); lobbyPollTimer = null; }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    }

    /* ---------- join ---------- */
    function renderJoin(msg) {
      detach();
      ov.innerHTML =
        '<div class="arena-card"><div class="arena-t">🏔️ 结伴登峰</div>' +
        '<div class="arena-sub">请老师在白板上写出擂台码，输入 6 位码加入。</div>' +
        '<input class="arena-code-in" id="arCode" maxlength="6" autocomplete="off" placeholder="ABC123">' +
        '<button class="arena-btn" id="arJoin">加入</button>' +
        '<button class="arena-btn ghost" id="arCancel">返回</button>' +
        '<div class="arena-msg" id="arMsg">' + (msg || "") + '</div></div>';
      var input = ov.querySelector("#arCode");
      input.focus();
      input.oninput = function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
      ov.querySelector("#arCancel").onclick = close;
      ov.querySelector("#arJoin").onclick = function () { doJoin(input.value.trim()); };
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") doJoin(input.value.trim()); });
    }

    function doJoin(c) {
      var msg = ov.querySelector("#arMsg");
      if (!c || c.length !== 6) { if (msg) msg.textContent = "请输入 6 位擂台码。"; return; }
      if (!myUid) { if (msg) msg.textContent = "正在连接…请稍候再试。"; if (ctx.getUid) ctx.getUid(function (u) { myUid = u; }); return; }
      if (msg) msg.textContent = "加入中…";
      db().collection("rooms").doc(c).get().then(function (snap) {
        if (!snap.exists) { renderJoin("找不到这个擂台码，请再确认一次。"); return; }
        room = snap.data(); code = c; isPk = !!room.pk;
        if (room.status === "ended") { renderJoin(isPk ? "这个房间已经结束了。" : "这个擂台已经结束了。"); return; }
        var p = ctx.profile || {};
        var pdoc = db().collection("rooms").doc(c).collection("players").doc(myUid);
        /* RE-JOIN SAFE: a student who left (or was disconnected) already has a row.
           Carry their existing score forward instead of zeroing it, and merge so the
           original joinedAt/late flags survive. */
        return pdoc.get().then(function (ps) {
          var prev = ps.exists ? (ps.data() || {}) : null;
          /* 同伴挑战 is RECONNECTION-ONLY (owner sign-off 2026-08-14, doc §5.6):
             someone already in the room may come back and keep their score, but a
             brand-new player cannot join a round in progress — a latecomer answers
             fewer questions, and then "most correct" stops being a fair comparison.
             The teacher arena keeps its own ⏱ late-join behaviour, untouched. */
          if (isPk && !prev && room.status === "running") {
            renderJoin("这一局已经开始了，等下一局再加入吧。");
            return null;
          }
          if (isPk && !prev && (room.playerCount || 0) >= PK_MAX) {
            renderJoin("房间满了（最多 " + PK_MAX + " 人）。");
            return null;
          }
          if (prev) {
            myScore = prev.score || 0; myCorrect = prev.correct || 0; myAnswered = prev.answered || 0;
          }
          return pdoc.set({
            nickname: p.nickname || "无名登山客", mtlClass: p.mtlClass || "",
            /* ⚠️ the avatar FILE PATH, not the id: teacher.html has no avatar
               catalogue. No rules change needed — the players rules check uid
               ownership and room status, never the field names. */
            av: myAvatar(),
            joinedAt: prev ? (prev.joinedAt || ts()) : ts(),
            answered: myAnswered, correct: myCorrect, score: myScore, finished: false,
            late: prev ? !!prev.late : room.status === "running",
            lastSeen: ts()
          }, { merge: true });
        }).then(function (r) { if (r !== null) subscribeRoom(); });
      }).catch(function (e) { renderJoin("加入失败：" + (e.code || e.message) + "（老师需先发布 rooms 规则）。"); });
    }

    /* ---------- lobby / status watch ----------
       Mobile browsers throttle or fully suspend background WebSocket/network
       activity when a tab is backgrounded or the screen locks (very plausible
       for a student sitting in the lobby while the teacher sets up), which can
       leave onSnapshot silently stalled. Two belt-and-braces backstops on top
       of the live listener: re-fetch on tab-visible/focus, and a slow poll
       while still in the lobby. Both stop once play actually starts. */
    function applyRoomSnapshot(data) {
      if (!data) { detach(); renderJoin(isPk ? "房间已被关闭。" : "擂台已被关闭。"); return; }
      room = data;
      isPk = !!room.pk;
      if (room.status === "lobby") { if (!started) renderLobby(); }
      else if (room.status === "running") {
        if (started) return;
        /* the host's stream may not be ours (cross-stream PK), so the word list has
           to be in hand BEFORE the first question renders */
        ensureStream(room.stream, function (err) {
          if (err) { ov.innerHTML = '<div class="arena-card"><div class="arena-t">载入失败</div>' +
            '<div class="arena-sub">' + esc(err) + '</div>' +
            '<button class="arena-btn" id="arOk">返回</button></div>';
            ov.querySelector("#arOk").onclick = close; started = true; return; }
          startPlay();
        });
      } else if (room.status === "ended") { finishNow(true); }
    }
    function pollRoomOnce() {
      if (started || !code) return;
      db().collection("rooms").doc(code).get()
        .then(function (snap) { applyRoomSnapshot(snap.exists ? snap.data() : null); })
        .catch(function () { /* transient network error: next poll/listener retries */ });
    }
    var playersUnsub = null;
    function subscribeRoom() {
      detach();
      roomUnsub = db().collection("rooms").doc(code).onSnapshot(function (snap) {
        applyRoomSnapshot(snap.exists ? snap.data() : null);
      }, function () { /* snapshot error: keep last state, the poll/focus backstop covers it */ });
      /* PK host mirrors what teacher.html does for 结伴登峰: only the host may write
         the room doc, so the host's client is what keeps playerCount current for
         everyone else's lobby. */
      if (!playersUnsub) {
        playersUnsub = db().collection("rooms").doc(code).collection("players")
          .onSnapshot(function (qs) {
            /* ⚠️ roster first, and for EVERYONE. This listener used to bail out
               immediately unless you were the host, so non-hosts never learned who
               else was in the room. The playerCount write below is still host-only
               (only the host may write the room doc). */
            roster = [];
            qs.forEach(function (d) { roster.push(Object.assign({ uid: d.id }, d.data())); });
            roster.sort(function (a, b) { return (a.joinedAt && b.joinedAt) ? 0 : 0; });
            if (!started && room && room.status === "lobby") renderLobby();
            if (!room || !myUid || room.hostUid !== myUid) return;
            var n = qs.size;
            if ((room.playerCount || 0) !== n && room.status !== "ended") {
              db().collection("rooms").doc(code).set({ playerCount: n }, { merge: true }).catch(function () {});
            }
          }, function () {});
      }
      lobbyPollTimer = setInterval(pollRoomOnce, 4000);
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
    }
    function onVisible() { if (document.visibilityState === "visible") pollRoomOnce(); }

    function myAvatar() {
      var id = (ctx.profile && ctx.profile.avatarId) || null;
      if (!id) return "";
      return (window.WSProfile && window.WSProfile.avatarFile
        && window.WSProfile.avatarFile(id)) || "";
    }
    /* the lobby roster: everyone sees who else is in the room, with their avatar
       and nickname (owner 2026-08-16). Before this the lobby showed only a count,
       so a student had no way to tell whether their friend had actually joined. */
    var roster = [];
    function rosterHtml() {
      if (!roster.length) return '<div class="arena-sub">还没有人加入。</div>';
      return '<div class="arena-roster">' + roster.map(function (r) {
        var me = r.uid === myUid;
        return '<div class="arena-who' + (me ? " me" : "") + '">' +
          (r.av ? '<img src="' + esc(r.av) + '" alt="" onerror="this.style.display=\'none\'">'
                : '<span class="arena-who-none">👤</span>') +
          '<span>' + esc(r.nickname || "无名") + (me ? " · 你" : "") + "</span></div>";
      }).join("") + "</div>";
    }

    function scopeLine() {
      var m = { cloze: "填空挑战", zhmcq: "华文解释", enmcq: "英文翻译", sprint: "攀山竞速", rain: "词雨灵露" };
      return (m[room.mode] || room.mode) + " · " + (room.qCount || (room.wordIds || []).length) + " 题 · " +
        Math.round((room.durationS || 0) / 60) + " 分钟";
    }
    function amHost() { return !!(room && myUid && room.hostUid === myUid); }
    function renderLobby() {
      var n = room.playerCount || 0;
      var host = amHost();
      ov.innerHTML =
        '<div class="arena-card"><div class="arena-t">' + (isPk ? "⚔️ 房间号：" : "⛺ 已加入：") + esc(code) + '</div>' +
        '<div class="arena-sub">主持：' + esc(room.hostName || (isPk ? "同学" : "老师")) + '<br>' + esc(scopeLine()) + '<br><br>' +
        (host ? '把房间号告诉朋友，等大家都到齐就开始。' : (isPk ? "⏳ 等待房主开始…" : "⏳ 等待老师开始…")) + '</div>' +
        '<div class="arena-sub" style="margin-top:12px">当前 <b id="arPc">' + n + '</b> 人已加入' +
        (isPk ? '（至少 2 人，最多 ' + PK_MAX + ' 人）' : '') + '</div>' +
        rosterHtml() +
        (host ? '<button class="arena-btn" id="arStart"' + (n < PK_MIN ? " disabled" : "") + '>' +
          (n < PK_MIN ? "还需要一位朋友…" : "开始 (" + n + " 人)") + '</button>' : "") +
        '<button class="arena-btn ghost" id="arLeave" style="margin-top:16px">' + (host ? "解散房间" : "离开") + '</button></div>';
      ov.querySelector("#arLeave").onclick = host ? closeRoomAsHost : close;
      var sb = ov.querySelector("#arStart");
      if (sb) sb.onclick = function () {
        sb.disabled = true;
        db().collection("rooms").doc(code).set({ status: "running", startedAt: ts() }, { merge: true })
          .catch(function (e) { sb.disabled = false; alert("开始失败：" + (e.code || e.message)); });
      };
    }
    function closeRoomAsHost() {
      var c = code;
      detach();
      if (c) db().collection("rooms").doc(c).set({ status: "ended" }, { merge: true }).catch(function () {});
      close();
    }

    /* ---------- play ---------- */
    var started = false, seq = [], qi = 0, myScore = 0, myCorrect = 0, myAnswered = 0, streak = 0;
    var correctIds = [], correctTexts = [], msUsed = 0, endMs = 0, tickTimer = null, writeTimer = null, lastWrite = 0, qStart = 0, done = false;
    var stopGame = null;   // set by real-time modes (rain) so finishNow can halt their loop

    function startPlay() {
      setBackdrop(room.mode);                 // per-mode scenery once the room config is known
      if (room.mode === "rain") { started = true; startRainPlay(); return; }
      if (!(room.mode === "cloze" || room.mode === "zhmcq" || room.mode === "enmcq" || room.mode === "sprint")) {
        ov.innerHTML = '<div class="arena-card"><div class="arena-t">该模式即将推出</div>' +
          '<div class="arena-sub">「' + esc(scopeLine()) + '」的实时对战正在开发中。</div>' +
          '<button class="arena-btn" id="arOk">知道了</button></div>';
        ov.querySelector("#arOk").onclick = close; started = true; return;
      }
      started = true;
      seq = (room.wordIds || []).map(function (id) { return wordIndex[id]; }).filter(Boolean);
      var startedAt = room.startedAt && room.startedAt.toMillis ? room.startedAt.toMillis() : Date.now();
      endMs = startedAt + (room.durationS || 300) * 1000;
      qi = 0; done = false;
      renderQ();
      tickTimer = setInterval(tick, 500);
    }
    function tick() {
      var rem = Math.max(0, Math.round((endMs - Date.now()) / 1000));
      var el = ov.querySelector("#arTimer"); if (el) el.textContent = "⏱ " + rem + "s";
      if (rem <= 0 && !done) finishNow(false);
    }
    function hud() {
      /* §2: the code stays on screen through `running`, not only the lobby — a
         friend who drops can glance at any player's screen and rejoin without
         having to ask anyone. */
      return '<div class="arena-hud">' +
        (isPk ? '<span class="arena-code-chip">房间 <b>' + esc(code || "") + '</b></span>' : '') +
        '<span>得分 <b id="arScore">' + myScore + '</b></span>' +
        (room.mode === "sprint" ? '<span>⛰️ 高度 <b>' + myCorrect + '</b> 米</span>' : '') +
        '<span>答对 <b>' + myCorrect + '</b>/' + myAnswered + '</span>' +
        '<span class="arena-timer" id="arTimer">⏱ …</span></div>';
    }
    function distractors(correct, n) {
      var pool = wordPool.filter(function (w) { return w.id !== correct.id && w.w !== correct.w; });
      // prefer same part of speech first
      var same = pool.filter(function (w) { return w.pos && correct.pos && w.pos === correct.pos; });
      return shuffle(same.length >= n ? same : pool).slice(0, n);
    }
    function renderQ() {
      if (qi >= seq.length) { return finishNow(false); }
      var w = seq[qi];
      qStart = Date.now();
      var body, opts = null, tier = room.tier || "3";
      if (room.mode === "cloze") {
        body = esc(w.cloze || "").replace(/_{2,}|＿+/g, "<u>　　</u>");
        if (tier !== "type") {
          var n = parseInt(tier, 10) || 3;
          opts = shuffle([w].concat(distractors(w, n - 1)));
        }
      } else if (room.mode === "zhmcq" || room.mode === "sprint") {
        // sprint room = same-paper speed answering on 华文解释 prompts; 高度 = 答对数
        body = esc(w.zh || ""); opts = shuffle([w].concat(distractors(w, 3)));
      } else {
        body = esc(w.en || w.zh || ""); opts = shuffle([w].concat(distractors(w, 3)));
      }
      var html = hud() + '<div class="arena-q"><div class="arena-qtext">' + body + '</div>';
      if (opts) {
        html += '<div class="arena-opts n' + opts.length + '" id="arOpts">' +
          opts.map(function (o, i) { return '<button class="arena-opt" data-i="' + i + '">' + esc(o.w) + '</button>'; }).join("") + '</div>';
      } else {
        html += '<input class="arena-ans" id="arAns" autocomplete="off" placeholder="输入词语…">' +
          '<button class="arena-btn" id="arSubmit">提交</button>';
      }
      html += '<div class="arena-fb" id="arFb"></div><div class="arena-sub" style="text-align:center;margin-top:8px">第 ' + (qi + 1) + ' / ' + seq.length + ' 题</div></div>';
      ov.innerHTML = html;
      if (opts) {
        Array.prototype.forEach.call(ov.querySelectorAll(".arena-opt"), function (b) {
          b.onclick = function () { answer(opts[+b.getAttribute("data-i")].id === w.id, w, b, opts); };
        });
      } else {
        var ans = ov.querySelector("#arAns"); ans.focus();
        function sub() { answer((ans.value || "").trim() === w.w, w, null, null); }
        ov.querySelector("#arSubmit").onclick = sub;
        ans.addEventListener("keydown", function (e) { if (e.key === "Enter") sub(); });
      }
      tick();
    }
    function answer(correct, w, btn, opts) {
      if (done) return;
      myAnswered++;
      var secs = (Date.now() - qStart) / 1000;
      msUsed += Math.round(secs * 1000);   // PK tie-break: same 答对数, faster wins
      var gained = 0;
      if (correct) {
        var speed = Math.round(50 * Math.max(0, 1 - secs / 15));
        streak = streak + 1; var sb = Math.min(50, streak * 10);
        gained = 100 + speed + sb;
        myScore += gained; myCorrect++;
        if (correctIds.indexOf(w.id) === -1) { correctIds.push(w.id); correctTexts.push(w.w); }
        /* 历练值/灵露 + the reward chime. `streak - 1` is the 连对 count ENTERING
           this question, which is what scoreCorrect's contract expects. */
        reward(w, room.mode, streak - 1);       // plays the reward chime too
      } else {
        streak = 0;
        if (ctx.sfx) { try { ctx.sfx("bad"); } catch (e) {} }
      }
      // reveal
      var fb = ov.querySelector("#arFb");
      if (opts && btn) {
        Array.prototype.forEach.call(ov.querySelectorAll(".arena-opt"), function (b, i) {
          if (opts[i].id === w.id) b.classList.add("right"); else if (b === btn) b.classList.add("wrong");
          b.onclick = null;
        });
      }
      if (fb) { fb.className = "arena-fb " + (correct ? "ok" : "bad"); fb.textContent = correct ? "✔ 正确 +" + gained : "✘ 正确答案：" + w.w; }
      var sc = ov.querySelector("#arScore"); if (sc) sc.textContent = myScore;
      scheduleWrite();
      qi++;
      setTimeout(function () { if (!done) renderQ(); }, correct ? 550 : 1100);
    }

    /* ---------- 词雨灵露 room mode ----------
       Same frozen word POOL + same host config for everyone; fall order is
       per-device random (it recycles the pool), fairness = pool + config.
       Score = 字数×10×combo, the game's own formula. NO 灵露 is banked (D-2);
       correctly typed words DO confer mastery via correctIds. */
    /* 2026-08-14: progressive-only, mirroring app.js's rainCfgAt. Kept as its own
       copy because arena.js is deliberately isolated from app.js (§7) — if the
       solo curve is retuned, retune these five numbers to match. */
    var AR_BASE_FALL = 12, AR_MAX_FALL = 62, AR_BASE_SPAWN = 5600, AR_MIN_SPAWN = 2000, AR_RAMP_SECS = 90;
    function arRainCfg(playedS) {
      var p = Math.min(1, Math.max(0, playedS) / AR_RAMP_SECS);
      return [AR_BASE_FALL + (AR_MAX_FALL - AR_BASE_FALL) * p,
              AR_BASE_SPAWN - (AR_BASE_SPAWN - AR_MIN_SPAWN) * p];
    }
    /* same sprite-sheet crop coordinates as app.js's RAINFX_MAP */
    var ARENA_RAINFX_MAP = {"sp1": [0, 57, 37, 44], "sp2": [39, 56, 56, 45], "sp3": [97, 62, 52, 39], "bolt1": [151, 8, 26, 93], "bolt2": [179, 0, 40, 101], "rip1": [221, 83, 44, 18], "rip2": [267, 79, 60, 22]};
    function startRainPlay() {
      var cfg = room.gameCfg || {};
      var showPy = cfg.py !== false;
      var livesMax = cfg.lives || 0;                     // 0 = time-only
      /* cfg.speed / cfg.ramp are ignored: rooms created before 2026-08-14 may
         still carry them, but every room now runs the one progressive course. */
      var pool = (room.wordIds || []).map(function (id) { return wordIndex[id]; })
        .filter(Boolean).filter(function (w) { return w.w && w.w.length <= 4; });
      if (pool.length < 4) {
        ov.innerHTML = '<div class="arena-card"><div class="arena-t">词池不足</div>' +
          '<div class="arena-sub">本擂台的词雨词池太小，无法开始。请告知老师。</div>' +
          '<button class="arena-btn" id="arOk">知道了</button></div>';
        ov.querySelector("#arOk").onclick = close; return;
      }
      var startedAt = room.startedAt && room.startedAt.toMillis ? room.startedAt.toMillis() : Date.now();
      endMs = startedAt + (room.durationS || 300) * 1000;
      var lives = livesMax, combo = 1, cleared = 0, wave = 1;
      var liveW = [], bag = shuffle(pool), composing = false, lastT = null, spawnTimer = 0, raf = null, playedS = 0;

      ov.innerHTML =
        '<div class="arena-hud"><span>得分 <b id="arScore">' + myScore + '</b></span>' +   // carries a rejoin's score
        '<span>连击 <b id="arCombo">×1</b></span>' +
        (livesMax ? '<span id="arLives">' + "❤️".repeat(livesMax) + '</span>' : '') +
        '<span class="arena-timer" id="arTimer">⏱ …</span></div>' +
        '<div class="arena-rain" id="arRain"><div class="arena-barrel" id="arBarrel"><div class="arena-water" id="arWater"></div></div></div>' +
        '<div class="arena-rin"><input id="arRIn" autocomplete="off" placeholder="打出词语…">' +
        '<button id="arRFire">收集</button></div>';
      var area = ov.querySelector("#arRain"), input = ov.querySelector("#arRIn");
      input.focus();
      input.addEventListener("compositionstart", function () { composing = true; });
      input.addEventListener("compositionend", function () { composing = false; });
      input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !composing) fire(); });
      ov.querySelector("#arRFire").onclick = fire;

      /* Same fix as app.js's own 词雨灵露 (.rain-shell fitViewport): iOS keeps
         the layout viewport (and 52vh) fixed when the 拼音 keyboard opens —
         only the visual viewport shrinks — so the fixed-height rain area kept
         its full size while the visible area shrank underneath it, pushing
         the HUD off the top. Drive the actual pixel height off visualViewport
         so the whole overlay stays visible above the keyboard. */
      function fitRainArea() {
        if (!window.visualViewport) return;
        var top = area.getBoundingClientRect().top;
        area.style.height = Math.max(180, window.visualViewport.height - top - 8) + "px";
        area.style.minHeight = "0";
      }
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", fitRainArea);
        window.visualViewport.addEventListener("scroll", fitRainArea);
      }
      fitRainArea();

      /* catch/miss feedback ported from app.js's fxShow/fxSeq/collectToBarrel/splashAt (1.3) */
      var barrel = ov.querySelector("#arBarrel"), water = ov.querySelector("#arWater");
      function fxShow(name, x, y, ms) {
        var m = ARENA_RAINFX_MAP[name]; if (!m) return;
        var el = document.createElement("div");
        el.className = "arena-rainfx";
        el.style.width = m[2] + "px"; el.style.height = m[3] + "px";
        el.style.backgroundPosition = (-m[0]) + "px " + (-m[1]) + "px";
        el.style.left = Math.round(x - m[2] / 2) + "px";
        el.style.top = Math.round(y - m[3]) + "px";
        area.appendChild(el);
        setTimeout(function () { el.remove(); }, ms);
      }
      function fxSeq(names, x, y, stepMs) {
        names.forEach(function (n, i) {
          setTimeout(function () { if (area.isConnected) fxShow(n, x, y, stepMs + 40); }, i * stepMs);
        });
      }
      function splashAt(x) {
        fxSeq(["sp1", "rip1", "rip2"], x, area.clientHeight - 30, 120);
      }
      function collectToBarrel(o) {
        var bx = barrel.offsetLeft + barrel.offsetWidth / 2 - o.el.offsetWidth / 2;
        var by = barrel.offsetTop - 8;
        o.el.classList.add("collect");
        o.el.style.transform = "translate(" + bx + "px," + by + "px) scale(.25)";
        (function (el) { setTimeout(function () { el.remove(); }, 480); })(o.el);
        setTimeout(function () {
          if (!area.isConnected) return;
          fxSeq(["sp1", "sp2", "sp3"], barrel.offsetLeft + barrel.offsetWidth / 2, barrel.offsetTop + 10, 90);
        }, 430);
        water.style.height = Math.min(100, cleared * 3) + "%";
      }

      function speedNow() { return arRainCfg(playedS); }
      function nextWord() { if (!bag.length) bag = shuffle(pool); return bag.pop(); }
      function spawn() {
        var w = nextWord();
        var el = document.createElement("div");
        el.className = "arena-rword";
        el.innerHTML = esc(w.w) + (showPy ? '<span class="py">' + esc(w.py || "") + '</span>' : "");
        area.appendChild(el);
        var x = Math.random() * Math.max(10, area.clientWidth - el.offsetWidth - 10);
        liveW.push({ el: el, w: w, x: x, y: -el.offsetHeight, sway: 10 + Math.random() * 20, phase: Math.random() * 6.28 });
      }
      function step(t) {
        if (done || !area.isConnected) { if (raf) cancelAnimationFrame(raf); return; }
        if (lastT == null) lastT = t;
        var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
        spawnTimer += dt * 1000;
        playedS += dt;
        var sp = speedNow();
        if (spawnTimer >= sp[1] && liveW.length < 6) { spawnTimer = 0; spawn(); }
        var floorY = area.clientHeight - 8;
        for (var i = liveW.length - 1; i >= 0; i--) {
          var o = liveW[i];
          o.y += sp[0] * dt; o.phase += dt * 1.4;
          o.el.style.transform = "translate(" + (o.x + Math.sin(o.phase) * o.sway) + "px," + o.y + "px)";
          if (o.y > floorY) {
            splashAt(o.x + o.el.offsetWidth / 2);
            o.el.remove(); liveW.splice(i, 1);
            combo = 1; setCombo();
            if (livesMax) {
              lives--;
              var lv = ov.querySelector("#arLives");
              if (lv) lv.textContent = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(livesMax - Math.max(0, lives));
              if (lives <= 0) return finishNow(false);
            }
          }
        }
        raf = requestAnimationFrame(step);
      }
      function setCombo() { var c = ov.querySelector("#arCombo"); if (c) c.textContent = "×" + combo; }
      function fire() {
        if (done) return;
        var val = (input.value || "").trim(); input.value = "";
        if (!val) return;
        myAnswered++;
        var hit = -1;
        for (var i = 0; i < liveW.length; i++) if (liveW[i].w.w === val) { hit = i; break; }
        if (hit === -1) {
          if (ctx.sfx) { try { ctx.sfx("bad"); } catch (e) {} }
          scheduleWrite(); return;
        }
        var o = liveW[hit];
        liveW.splice(hit, 1);
        cleared++; myCorrect++;
        myScore += o.w.w.length * 10 * combo;
        if (correctIds.indexOf(o.w.id) === -1) { correctIds.push(o.w.id); correctTexts.push(o.w.w); }
        /* 词雨 earns 灵露 + the chime; 历练值 base is 0 for rain in rooms exactly
           as it is in solo play. cleared-1 = the run ENTERING this catch. */
        reward(o.w, "rain", cleared - 1);
        if (cleared % 3 === 0) combo = Math.min(5, combo + 1);
        setCombo();
        collectToBarrel(o);
        if (cleared % 10 === 0) wave++;
        var sc = ov.querySelector("#arScore"); if (sc) sc.textContent = myScore;
        scheduleWrite();
      }
      stopGame = function () {
        if (raf) cancelAnimationFrame(raf);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", fitRainArea);
          window.visualViewport.removeEventListener("scroll", fitRainArea);
        }
      };
      spawn();
      raf = requestAnimationFrame(step);
      tickTimer = setInterval(tick, 500);
      tick();
    }

    /* ---------- score writes (throttled) ---------- */
    function playerDoc() { return db().collection("rooms").doc(code).collection("players").doc(myUid); }
    function writeNow(final) {
      lastWrite = Date.now();
      playerDoc().set({ answered: myAnswered, correct: myCorrect, score: myScore, msUsed: msUsed, finished: !!final, lastSeen: ts() }, { merge: true })
        .catch(function () {});
    }
    function scheduleWrite() {
      if (Date.now() - lastWrite >= 5000) { writeNow(false); return; }
      if (!writeTimer) writeTimer = setTimeout(function () { writeTimer = null; writeNow(false); }, 5000 - (Date.now() - lastWrite));
    }
    /* 房间模式计分 (owner 2026-08-14) — REVERSES the old D-2 zero-reward rule.
       app.js owns the formula and the store; arena.js only reports that a word
       was answered correctly, so the §7 isolation is unchanged in shape: this is
       one more ctx hook, not a reach into app.js internals.
       ctx.roomCorrect also plays the reward chime, so a room sounds like the
       rest of the app even on the rare path where scoring is skipped. */
    function reward(w, mode, entering) {
      if (!ctx.roomCorrect || !w) return;
      try { ctx.roomCorrect(w, mode, entering, room && room.tier); } catch (e) {}
    }
    function finishNow(roomEnded) {
      if (done) return; done = true;
      if (tickTimer) clearInterval(tickTimer);
      if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
      if (stopGame) { try { stopGame(); } catch (e) {} stopGame = null; }
      writeNow(true);
      /* confer mastery for every word answered correctly (海拔 only, no 历练值).
         TEXTS are passed alongside ids because a cross-stream room serves the
         HOST's word ids, which mean nothing in the joiner's own store — ids are
         stream-scoped by design, word text is the cross-stream join key. */
      if (ctx.conferMastery && correctIds.length) {
        try { ctx.conferMastery(correctIds, correctTexts); } catch (e) {}
      }
      renderResult(roomEnded);
    }

    /* ---------- result ---------- */
    function renderResult(roomEnded) {
      detach();
      ov.innerHTML = '<div class="arena-card"><div class="arena-t">' + (isPk ? "⚔️ 对决结束" : "🎉 本场结束") + '</div>' +
        '<div class="arena-sub">' +
        (isPk ? '你答对 <b style="color:#FFE9B0;font-size:20px">' + myCorrect + '</b> 题（共答 ' + myAnswered + ' 题）<br>'
              : '你的得分 <b style="color:#FFE9B0;font-size:20px">' + myScore + '</b>　答对 ' + myCorrect + '/' + myAnswered + '<br>') +
        (correctIds.length ? '答对的词已计入「已掌握」（海拔 +' + correctIds.length + '，本场不计历练值）。' : '再接再厉！') + '</div>' +
        '<div id="arMedal"></div>' +
        '<div class="arena-board" id="arBoard"><div class="arena-sub">读取排名…</div></div>' +
        '<button class="arena-btn" id="arDone" style="margin-top:14px">完成</button></div>';
      ov.querySelector("#arDone").onclick = close;
      // one-time read of the players board for the final ranking
      db().collection("rooms").doc(code).collection("players").get().then(function (qs) {
        var rows = []; qs.forEach(function (d) { rows.push(Object.assign({ uid: d.id }, d.data())); });
        /* 结伴登峰 ranks on score. 同伴挑战 ranks on 答对数, ties broken by the
           time spent answering — the owner picked fixed-time/most-correct
           precisely so speed alone cannot win, so score must NOT be the key. */
        rows.sort(isPk
          ? function (a, b) {
              return ((b.correct || 0) - (a.correct || 0)) || ((a.msUsed || 0) - (b.msUsed || 0));
            }
          : function (a, b) { return (b.score || 0) - (a.score || 0); });
        awardMedal(rows);
        var html = rows.slice(0, 20).map(function (r, i) {
          var me = r.uid === myUid;
          return '<div class="arena-row' + (me ? " me" : "") + '"><span class="arena-rk">' + (i + 1) + '</span>' +
            (r.av ? '<img class="arena-av" src="' + esc(r.av) + '" alt="" onerror="this.style.display=\'none\'">'
                  : '<span class="arena-av none">👤</span>') +
            '<span>' + esc(r.nickname || "") + (r.late ? " ⏱" : "") + (me ? " · 你" : "") + '</span>' +
            '<span class="arena-sc">' + (isPk ? (r.correct || 0) + " 对" : (r.score || 0)) + '</span></div>';
        }).join("");
        var b = ov.querySelector("#arBoard"); if (b) b.innerHTML = html || '<div class="arena-sub">暂无排名。</div>';
        /* 颁奖台：学生自己的屏幕上也要有，不只是老师的投影（owner）。
           ⚠️ 排名口径必须跟着上面那次 sort 走 —— 同伴挑战按答对数，结伴登峰按分数。
           传 score 而不是名次，台上显示的才是学生刚刚看到的那个数字。 */
        if (window.WSPodium && rows.length) {
          stopPodium = window.WSPodium.show(rows.slice(0, 3).map(function (r) {
            return { uid: r.uid, name: r.nickname || "无名", av: r.av || "",
                     score: isPk ? (r.correct || 0) : (r.score || 0) };
          }), { unit: isPk ? "对" : "分", me: myUid, title: isPk ? "🏆 对决结果" : "🏆 本场前三" });
        }
      }).catch(function () { var b = ov.querySelector("#arBoard"); if (b) b.innerHTML = '<div class="arena-sub">排名读取失败。</div>'; });
    }

    /* B层 对战徽章 (DESIGN_徽章体系_对战与排行榜 §3). The ranking is only known
       here, after the final board read, so this is where the medal is awarded.
       app.js owns the badge store — arena.js just asks through ctx.awardBattle
       and renders whatever comes back, keeping the §7 isolation intact.

       Guards, both deliberate: a room with a single player is not a placing, and
       a player who never answered anything did not earn a medal by idling in a
       three-person room. */
    function awardMedal(rows) {
      if (!ctx.awardBattle || rows.length < 2 || myAnswered < 1) return;
      var rank = 0;
      for (var i = 0; i < rows.length && i < 3; i++) if (rows[i].uid === myUid) { rank = i + 1; break; }
      if (!rank) return;
      var m = null;
      try { m = ctx.awardBattle(isPk ? "peer" : "room", rank); } catch (e) {}
      if (!m) return;
      var box = ov.querySelector("#arMedal"); if (!box) return;
      box.innerHTML =
        '<div class="arena-medal"><img src="' + m.img + '" alt="" ' +
        'onerror="this.style.display=\'none\'">' +
        '<div class="arena-medal-txt"><b>' + m.icon + ' ' + esc(m.name) + '</b>' +
        '<span>第 ' + rank + ' 名' + (m.n > 1 ? ' · 已收下 ' + m.n + ' 面' : ' · 收入成就墙') + '</span></div></div>' +
        (m.champion
          ? '<div class="arena-medal champ"><img src="' + m.champion.img + '" alt="" ' +
            'onerror="this.style.display=\'none\'">' +
            '<div class="arena-medal-txt"><b>🏆 ' + esc(m.champion.name) + '</b>' +
            '<span>金牌满 5 面，称号永久解锁</span></div></div>'
          : "");
    }

    /* ---------- 同伴挑战 host path ----------
       The host is a PLAYER, not an observer (doc §2), so this creates the room and
       then falls straight into the ordinary join flow — no host-only state. */
    var PK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no O/0/I/1/L
    function pkCode() {
      var out = "";
      for (var i = 0; i < 6; i++) out += PK_ALPHABET[Math.floor(Math.random() * PK_ALPHABET.length)];
      return out;
    }
    function hostRoom(cfg, attempt) {
      attempt = attempt || 0;
      if (attempt >= 3) { renderJoin("生成房间号失败，请再试一次。"); return; }
      if (!myUid) {
        if (ctx.getUid) ctx.getUid(function (u) { myUid = u; hostRoom(cfg, attempt); });
        return;
      }
      var c = pkCode(), doc = db().collection("rooms").doc(c);
      doc.get().then(function (snap) {
        if (snap.exists) return hostRoom(cfg, attempt + 1);
        var p = ctx.profile || {};
        return doc.set({
          pk: true,                                  // what the Firestore rule keys on
          hostUid: myUid, hostName: p.nickname || "同学", school: p.school || "",
          stream: ctx.stream, mode: cfg.mode, tier: cfg.tier || "3",
          wordIds: cfg.wordIds, qCount: cfg.wordIds.length, durationS: cfg.durationS,
          status: "lobby", createdAt: ts(), startedAt: null, playerCount: 0,
          expiresAt: expiryTs()
        }).then(function () { doJoin(c); });
      }).catch(function (e) {
        renderJoin("创建失败：" + (e.code || e.message) + "（需要先发布 rooms 规则）。");
      });
    }

    if (ctx.hostCfg) { renderJoin("正在开房…"); hostRoom(ctx.hostCfg); }
    else renderJoin("");
  }

  window.WSArena = {
    open: open,
    /* host(ctx) = same overlay, but it opens a room first. cfg: {mode, tier,
       wordIds, durationS}. The caller (app.js) owns scope selection. */
    host: function (ctx, cfg) {
      ctx = ctx || {};
      ctx.hostCfg = cfg;
      return open(ctx);
    },
    isAvailable: function () { return !!db(); }
  };
})();
