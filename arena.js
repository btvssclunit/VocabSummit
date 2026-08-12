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
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var STYLE_ID = "wsArenaStyle";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style"); s.id = STYLE_ID;
    s.textContent =
      ".arena-ov{position:fixed;inset:0;z-index:90;background:linear-gradient(160deg,#12213F,#0C1730);" +
      "color:#EAF2F8;font-family:'Noto Sans SC',system-ui,sans-serif;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;padding:20px;overflow:auto}" +
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
      ".arena-rk{width:26px;color:#FFE9B0;font-weight:800}.arena-sc{margin-left:auto;font-weight:800;color:#FFE9B0}";
    document.head.appendChild(s);
  }

  function open(ctx) {
    injectStyle();
    if (!db()) { alert("结伴登峰需要联网。请检查网络后再试。"); return; }
    ctx = ctx || {};
    var wordIndex = {};
    (ctx.words || []).forEach(function (w) { wordIndex[w.id] = w; });

    var ov = document.createElement("div");
    ov.className = "arena-ov";
    document.body.appendChild(ov);
    function close() { detach(); ov.remove(); }

    var myUid = null, code = null, roomUnsub = null, room = null;
    ctx.getUid ? ctx.getUid(function (u) { myUid = u; }) : null;

    function detach() { if (roomUnsub) { roomUnsub(); roomUnsub = null; } }

    /* ---------- join ---------- */
    function renderJoin(msg) {
      detach();
      ov.innerHTML =
        '<div class="arena-card"><div class="arena-t">🏔️ 加入结伴登峰</div>' +
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
        room = snap.data(); code = c;
        if (room.status === "ended") { renderJoin("这个擂台已经结束了。"); return; }
        var p = ctx.profile || {};
        return db().collection("rooms").doc(c).collection("players").doc(myUid).set({
          nickname: p.nickname || "无名登山客", mtlClass: p.mtlClass || "",
          joinedAt: ts(), answered: 0, correct: 0, score: 0, finished: false,
          late: room.status === "running", lastSeen: ts()
        }).then(function () { subscribeRoom(); });
      }).catch(function (e) { renderJoin("加入失败：" + (e.code || e.message) + "（老师需先发布 rooms 规则）。"); });
    }

    /* ---------- lobby / status watch ---------- */
    function subscribeRoom() {
      detach();
      roomUnsub = db().collection("rooms").doc(code).onSnapshot(function (snap) {
        if (!snap.exists) { detach(); renderJoin("擂台已被关闭。"); return; }
        var prev = room; room = snap.data();
        if (room.status === "lobby") renderLobby();
        else if (room.status === "running") { if (!started) startPlay(); }
        else if (room.status === "ended") { finishNow(true); }
      }, function () { /* snapshot error: keep last state */ });
    }

    function scopeLine() {
      var m = { cloze: "填空挑战", zhmcq: "华文解释", enmcq: "英文翻译", sprint: "攀山竞速", rain: "词雨灵露" };
      return (m[room.mode] || room.mode) + " · " + (room.qCount || (room.wordIds || []).length) + " 题 · " +
        Math.round((room.durationS || 0) / 60) + " 分钟";
    }
    function renderLobby() {
      ov.innerHTML =
        '<div class="arena-card"><div class="arena-t">⛺ 已加入：' + esc(code) + '</div>' +
        '<div class="arena-sub">主持：' + esc(room.hostName || "老师") + '<br>' + esc(scopeLine()) + '<br><br>' +
        '⏳ 等待老师开始…</div>' +
        '<div class="arena-sub" style="margin-top:12px">当前 <b id="arPc">' + (room.playerCount || 0) + '</b> 人已加入</div>' +
        '<button class="arena-btn ghost" id="arLeave" style="margin-top:16px">离开</button></div>';
      ov.querySelector("#arLeave").onclick = close;
    }

    /* ---------- play ---------- */
    var started = false, seq = [], qi = 0, myScore = 0, myCorrect = 0, myAnswered = 0, streak = 0;
    var correctIds = [], endMs = 0, tickTimer = null, writeTimer = null, lastWrite = 0, qStart = 0, done = false;

    function startPlay() {
      if (!(room.mode === "cloze" || room.mode === "zhmcq" || room.mode === "enmcq")) {
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
      return '<div class="arena-hud"><span>得分 <b id="arScore">' + myScore + '</b></span>' +
        '<span>答对 <b>' + myCorrect + '</b>/' + myAnswered + '</span>' +
        '<span class="arena-timer" id="arTimer">⏱ …</span></div>';
    }
    function distractors(correct, n) {
      var pool = (ctx.words || []).filter(function (w) { return w.id !== correct.id && w.w !== correct.w; });
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
      } else if (room.mode === "zhmcq") {
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
      if (correct) {
        var speed = Math.round(50 * Math.max(0, 1 - secs / 15));
        streak = streak + 1; var sb = Math.min(50, streak * 10);
        myScore += 100 + speed + sb; myCorrect++;
        if (correctIds.indexOf(w.id) === -1) correctIds.push(w.id);
      } else { streak = 0; }
      // reveal
      var fb = ov.querySelector("#arFb");
      if (opts && btn) {
        Array.prototype.forEach.call(ov.querySelectorAll(".arena-opt"), function (b, i) {
          if (opts[i].id === w.id) b.classList.add("right"); else if (b === btn) b.classList.add("wrong");
          b.onclick = null;
        });
      }
      if (fb) { fb.className = "arena-fb " + (correct ? "ok" : "bad"); fb.textContent = correct ? "✔ 正确 +" + (myScore) : "✘ 正确答案：" + w.w; }
      var sc = ov.querySelector("#arScore"); if (sc) sc.textContent = myScore;
      scheduleWrite();
      qi++;
      setTimeout(function () { if (!done) renderQ(); }, correct ? 550 : 1100);
    }

    /* ---------- score writes (throttled) ---------- */
    function playerDoc() { return db().collection("rooms").doc(code).collection("players").doc(myUid); }
    function writeNow(final) {
      lastWrite = Date.now();
      playerDoc().set({ answered: myAnswered, correct: myCorrect, score: myScore, finished: !!final, lastSeen: ts() }, { merge: true })
        .catch(function () {});
    }
    function scheduleWrite() {
      if (Date.now() - lastWrite >= 5000) { writeNow(false); return; }
      if (!writeTimer) writeTimer = setTimeout(function () { writeTimer = null; writeNow(false); }, 5000 - (Date.now() - lastWrite));
    }
    function finishNow(roomEnded) {
      if (done) return; done = true;
      if (tickTimer) clearInterval(tickTimer);
      if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
      writeNow(true);
      // confer mastery for every word answered correctly (海拔 only, no 历练值)
      if (ctx.conferMastery && correctIds.length) { try { ctx.conferMastery(correctIds); } catch (e) {} }
      renderResult(roomEnded);
    }

    /* ---------- result ---------- */
    function renderResult(roomEnded) {
      detach();
      ov.innerHTML = '<div class="arena-card"><div class="arena-t">🎉 本场结束</div>' +
        '<div class="arena-sub">你的得分 <b style="color:#FFE9B0;font-size:20px">' + myScore + '</b>　答对 ' + myCorrect + '/' + myAnswered + '<br>' +
        (correctIds.length ? '答对的词已计入「已掌握」（海拔 +' + correctIds.length + '，本场不计历练值）。' : '再接再厉！') + '</div>' +
        '<div class="arena-board" id="arBoard"><div class="arena-sub">读取排名…</div></div>' +
        '<button class="arena-btn" id="arDone" style="margin-top:14px">完成</button></div>';
      ov.querySelector("#arDone").onclick = close;
      // one-time read of the players board for the final ranking
      db().collection("rooms").doc(code).collection("players").get().then(function (qs) {
        var rows = []; qs.forEach(function (d) { rows.push(Object.assign({ uid: d.id }, d.data())); });
        rows.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
        var html = rows.slice(0, 20).map(function (r, i) {
          var me = r.uid === myUid;
          return '<div class="arena-row' + (me ? " me" : "") + '"><span class="arena-rk">' + (i + 1) + '</span>' +
            '<span>' + esc(r.nickname || "") + (r.late ? " ⏱" : "") + (me ? " · 你" : "") + '</span>' +
            '<span class="arena-sc">' + (r.score || 0) + '</span></div>';
        }).join("");
        var b = ov.querySelector("#arBoard"); if (b) b.innerHTML = html || '<div class="arena-sub">暂无排名。</div>';
      }).catch(function () { var b = ov.querySelector("#arBoard"); if (b) b.innerHTML = '<div class="arena-sub">排名读取失败。</div>'; });
    }

    renderJoin("");
  }

  window.WSArena = {
    open: open,
    isAvailable: function () { return !!db(); }
  };
})();
