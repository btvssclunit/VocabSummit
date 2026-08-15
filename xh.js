/* 学海启航 · 启航码头 — MVP v2
   Spec: SPEC_XH_MVP_v2.md (2026-08-15), which supersedes the 看图识词 v1 spec.

   DELIBERATELY STANDALONE. This never loads app.js/app.css and shares no state
   with g1/g2/g3/hcl. The reasons are in the spec: this tier inverts the
   platform's display defaults (拼音 and English default ON here, OFF there), it
   is outside the 灵露 / 历练值 / 海拔 economy entirely, and it is unproven — a
   mode that later gets pulled must be removable without touching anything the
   four streams depend on. The TTS stack is COPIED from app.js rather than
   shared, for the same reason.

   ⚠️ SCOPE IS 36 WORDS, NOT 142 (spec §1). Sheets 07/09/10 were extracted with a
   proximity merge that joined the wrong pairs, so every assignment after the
   merge point shifted by one and 36 sprites show the wrong word. Only sheets
   01/02/06 — 动物 and 日常用品 — matched counts without a merge and have been
   verified file by file. The other sprites were removed from the repo rather
   than left sitting unreferenced; they are in git history when re-extracted.
   Standing rule: a matching count is not evidence of correct mapping.

   Storage is one localStorage key, ws_xh. No Firestore, no login, no leaderboard.

   ⚠️ ONE thing IS shared, added 2026-08-15 on the owner's request: IDENTITY.
   XH_index.html loads firebase-init.js + profile.js + nickname.js so the topbar
   shows the student's own nickname and avatar and opens the same 我的档案 panel
   as a stream page. Being someone else at the dock than on the mountain would
   have been worse than the duplication it avoids. Progress is still sealed —
   nothing in this file reads or writes ws2_*, and 航程 never becomes 海拔. */
(function () {
  "use strict";

  var STORE_KEY = "ws_xh";
  var ROUND_N = 5;      // spec §6: five, not ten — 日常用品 only holds 12 words

  var ASSET_V = (function () {
    try {
      var m = (document.currentScript && document.currentScript.src || "").match(/\?v=[^&]+/);
      return m ? m[0] : "";
    } catch (e) { return ""; }
  })();

  var WORDS = [];
  var store = load();
  var state = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function view() { return document.getElementById("xhView"); }
  function img(w, cls) {
    return '<img class="' + (cls || "") + '" src="art/xh/' + esc(w.图档) + ASSET_V + '" alt="">';
  }

  /* ---------- store ---------- */
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { s = {}; }
    if (typeof s.py !== "boolean") s.py = true;   // both default ON: the point of
    if (typeof s.en !== "boolean") s.en = true;   // this tier (spec, display toggles)
    if (!s.done || typeof s.done !== "object") s.done = {};
    /* spec §7 — instrumentation, built in from the start because it is nearly
       free now and is the single most valuable output of the MVP: which sprites
       get misread, and what they get confused with. Read it off a test device
       with localStorage.getItem("ws_xh").
       stats[词语] = { shown, wrong, confused: { chosenWord: n } } */
    if (!s.stats || typeof s.stats !== "object") s.stats = {};
    /* 连线 difficulty = how many pairs are on the board at once (owner 2026-08-15).
       The allowed values are MATCH_SIZES, but they are NOT referenced here: load()
       runs at module init, long before that var is assigned, so touching it would
       throw on every boot. */
    if (s.matchN !== 3 && s.matchN !== 5 && s.matchN !== 8) s.matchN = 5;
    /* 学习范围 + the two-button 学词/闯关 split (owner 2026-08-16), mirroring the
       mountain's ①复习范围 ②选择学习方式 ③cards. scope is a list of 组别; an empty
       or unrecognised list is repaired to "everything" at first use, because a
       scope of nothing would silently produce empty rounds. */
    if (!(s.scope instanceof Array)) s.scope = null;      // null = all groups
    if (s.tab !== "play") s.tab = "learn";
    if (typeof s.scopeOpen !== "boolean") s.scopeOpen = false;
    /* 航海值 — the dock's effort metric (SPEC_XH_dock_economy_and_TTS §1).
       ⚠️ It must NEVER merge with 航程: 航程 is what you know, 航海值 is what you
       did. A student who plays 连线 all week raises 航海值 while 航程 does not
       move, and that distinction is the honest one. No composite score, ever —
       same reason 海拔 and 历练值 stay apart on the mountain. */
    if (typeof s.sail !== "number") s.sail = 0;
    if (s.lbScope !== "all") s.lbScope = "school";
    if (s.lbTab !== "pts") s.lbTab = "sailed";
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  function stat(w) {
    var k = w.词语;
    if (!store.stats[k]) store.stats[k] = { shown: 0, wrong: 0, confused: {} };
    return store.stats[k];
  }

  /* ---------- 顶栏：拼音 / 中EN / 我的档案 (owner 2026-08-15) ----------
     The dock now carries the same three controls a stream page carries, in the
     same corner, so nothing has to be relearned when a student moves to G1. Two
     deliberate differences: both aids DEFAULT ON here (this tier exists for
     students who cannot read the interface yet), and they were previously buried
     on the menu screen, so a student mid-round could not reach them at all.

     ⚠️ Toggling is a CSS CLASS FLIP, never a re-render (see the .xh-py/.xh-en
     block in xh.css for why: re-rendering a question redraws its distractors,
     and the answer is the only option that survives a redraw).

     ⚠️ IDENTITY IS THE ONE THING SHARED with the four streams — the same
     ws2_profile via profile.js, so the nickname and avatar are the student's own
     rather than a second, dock-only persona. PROGRESS IS STILL SEALED: nothing
     here reads or writes ws2_*, 航程 never becomes 海拔, and the dock's own state
     stays in ws_xh. */
  function applyAids() {
    document.body.classList.toggle("xh-py-on", !!store.py);
    document.body.classList.toggle("xh-en-on", !!store.en);
  }
  function profileOf() {
    return (window.WSProfile && window.WSProfile.load()) || {};
  }
  function avatarHtml() {
    var p = profileOf();
    return (window.WSProfile && window.WSProfile.avatarImgHtml)
      ? window.WSProfile.avatarImgHtml(p.avatarId) : "👤";
  }
  function renderTop() {
    var el = document.getElementById("xhTools");
    if (!el) return;
    var nick = profileOf().nickname || "我的档案";
    el.innerHTML =
      '<button class="xh-tg' + (store.py ? " on" : "") + '" id="xhTgPy" ' +
        'aria-pressed="' + (store.py ? "true" : "false") + '" title="拼音">' +
        '<span class="xh-tg-ic">拼</span><span class="xh-tg-lab">拼音</span></button>' +
      '<button class="xh-tg' + (store.en ? " on" : "") + '" id="xhTgEn" ' +
        'aria-pressed="' + (store.en ? "true" : "false") + '" title="English">' +
        '<span class="xh-tg-ic">中</span><span class="xh-tg-lab">EN</span></button>' +
      '<button class="xh-prof" id="xhProf" title="我的档案" aria-label="我的档案">' +
        '<span class="xh-av">' + avatarHtml() + '</span>' +
        '<span class="xh-nick">' + esc(nick) + '</span></button>';

    function aid(id, key) {
      var b = document.getElementById(id);
      b.onclick = function () {
        store[key] = !store[key];
        save();
        applyAids();                     // one class flip; nothing re-renders
        b.classList.toggle("on", !!store[key]);
        b.setAttribute("aria-pressed", store[key] ? "true" : "false");
      };
    }
    aid("xhTgPy", "py");
    aid("xhTgEn", "en");
    document.getElementById("xhProf").onclick = openProfile;
  }
  function openProfile() {
    if (!window.WSProfile) return;
    window.WSProfile.open({
      onChangeNickname: function (done) {
        if (!window.WSNickname) return;   // nickname.js absent: leave the panel be
        var cur = profileOf();
        window.WSNickname.picker(function () { renderTop(); if (done) done(); },
          { dismissible: true, currentSchool: cur.school || "",
            currentRole: cur.category || "student", currentHeard: cur.heardFrom || "" });
      },
      onChanged: renderTop                // nickname / avatar may have changed
    });
  }

  /* ---------- audio ----------
     Chinese only, and hanzi only — never pass 拼音 to the engine, it is read as
     toneless English. Voices are SCORED rather than taking the first zh-*:
     managed Chromebooks ship eSpeak-NG, which reports zh but speaks toneless
     Mandarin and is ordered first. cancel() then speak() in the same tick is
     silently dropped on ChromeOS and Samsung, hence the 50ms guard. */
  var _zhVoice = null, _warnedNoZh = false;
  function scoreVoice(v) {
    var lang = (v.lang || "").toLowerCase(), name = v.name || "";
    var isZhLang = lang.indexOf("zh") === 0 || lang.indexOf("cmn") === 0;
    if (!isZhLang && !/普通话|中文|chinese|mandarin/i.test(name)) return -1000;
    var s = 0;
    if (lang === "zh-cn" || lang === "zh_cn") s += 40;
    else if (lang.indexOf("zh") === 0) s += 20;
    else if (isZhLang) s += 15;
    if (/普通话/.test(name)) s += 25;
    if (/google/i.test(name)) s += 30;
    if (/中文|chinese|mandarin/i.test(name)) s += 8;
    if (/espeak/i.test(name)) s -= 100;
    return s;
  }
  function loadVoiceCache() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices() || [], best = null, bs = -1000;
    for (var i = 0; i < vs.length; i++) {
      var sc = scoreVoice(vs[i]);
      if (sc > -1000 && sc > bs) { bs = sc; best = vs[i]; }
    }
    _zhVoice = best;
  }
  if (window.speechSynthesis) {
    loadVoiceCache();
    speechSynthesis.onvoiceschanged = loadVoiceCache;
  }
  /* ⚠️ iOS/iPadOS hands the page a speech session ONLY if the first utterance is
     issued SYNCHRONOUSLY inside a user gesture. The 50ms cancel→speak deferral
     below — which ChromeOS needs, or the utterance is silently dropped — severs
     that gesture chain, so on an iPad every word was discarded with no error and
     no onerror. 听音识图 was worse: it speaks during render, never inside a
     gesture at all, so its first word could never sound.
     The fix is a one-time SILENT primer on the first tap anywhere at the dock.
     Once the session exists, deferring is safe on every platform, so both
     platforms get what they need. (SPEC_XH_dock_economy_and_TTS.md §2.) */
  var _ttsReady = false;
  function primeTTS() {
    if (_ttsReady || !window.speechSynthesis) return;
    _ttsReady = true;
    try {
      var u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);        // SYNCHRONOUS — never wrap this in a timer
    } catch (e) {}
  }
  document.addEventListener("pointerdown", primeTTS, true);
  document.addEventListener("keydown", primeTTS, true);

  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    primeTTS();
    var go = function () {
      if (!_zhVoice) loadVoiceCache();
      if (!_zhVoice && !_warnedNoZh) {
        _warnedNoZh = true;
        toast("⚠️ 未找到中文语音，请在设备语言设置中安装普通话语音包");
      }
      var u = new SpeechSynthesisUtterance(String(text));   // hanzi only
      u.lang = (_zhVoice && _zhVoice.lang) || "zh-CN";
      if (_zhVoice) u.voice = _zhVoice;
      u.rate = 0.85;                                        // slower: absolute beginners
      u.onend = revive; u.onerror = revive;
      speechSynthesis.cancel();
      setTimeout(function () { speechSynthesis.speak(u); }, 50);
    };
    if (!(speechSynthesis.getVoices() || []).length) setTimeout(go, 200); else go();
  }

  /* Wooden knock (correct) and rope creak (wrong), synthesized — spec §5.5.
     ⚠️ Apple platforms give the page ONE audio session and speechSynthesis takes
     it, pushing the context into WebKit's "interrupted" state where it renders
     nothing and resume() may never settle. Same defence app.js arrived at: never
     wait on resume alone, and rebuild the context if it will not run. */
  var _ac = null, _acFails = 0;
  function ac() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!_ac) { try { _ac = new C(); } catch (e) { return null; } }
    return _ac;
  }
  function revive() {
    var c = _ac;
    if (c && c.state !== "running" && c.resume) { try { c.resume(); } catch (e) {} }
  }
  function blip(freqs, type, vol, dur) {
    var c = ac();
    if (!c) return;
    function play() {
      var t0 = c.currentTime;
      freqs.forEach(function (f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(vol, t0 + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.05 + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t0 + i * 0.05); o.stop(t0 + i * 0.05 + dur);
      });
    }
    if (c.state === "running") { play(); return; }
    try { c.resume(); } catch (e) {}
    setTimeout(function () {
      if (_ac && _ac.state !== "running" && _acFails < 6) {
        _acFails++;
        try { _ac.close(); } catch (e) {}
        _ac = null;
        if (!ac()) return;
      }
      play();
    }, 120);
  }
  function sfxOk() { blip([420, 640], "triangle", 0.22, 0.13); }   // wooden knock
  function sfxNo() { blip([150, 110], "sawtooth", 0.10, 0.2); }    // rope creak
  document.addEventListener("pointerdown", revive);

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "xh-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  /* ---------- distractors (spec §3, CHANGED from v1) ----------
     All distractors come from the SAME 组别 as the answer, always. The old
     Band 1 / Band 2 progression is gone: cross-group distractors let a question
     be answered by category alone (an animal picture against three household
     objects), which taught nothing. 动物 may draw freely across 陆上 and 水中 —
     猫 against 鲨鱼 is still a real question. */
  var BLACKLIST = [["椅子", "桌子"]];   // the only collision left in this scope
  function mates(text) {
    var out = {};
    BLACKLIST.forEach(function (set) {
      if (set.indexOf(text) >= 0) set.forEach(function (t) { if (t !== text) out[t] = true; });
    });
    return out;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function distractors(w, n) {
    n = n || 3;
    var picked = [], banned = mates(w.词语);
    var pool = shuffle(WORDS.filter(function (o) {
      return o.词语 !== w.词语 && o.组别 === w.组别;
    }));
    // admitted one at a time: the blacklist is a rule about the whole option
    // set, not just about the answer
    for (var i = 0; i < pool.length && picked.length < n; i++) {
      if (banned[pool[i].词语]) continue;
      picked.push(pool[i]);
      var m = mates(pool[i].词语);
      for (var t in m) banned[t] = true;
    }
    return picked;
  }

  /* ⚠️ The menu groups by 组别, NOT 子类 (PATCH_category_hierarchy, 2026-08-15).
     Listing 水中与空中 beside 日常用品 read as a riddle: two of the three were
     animals, so the player saw a hierarchy the ENGINE DOES NOT USE — distractors
     have always been drawn from the whole 组别, across both 子类. Rounds now draw
     from 组别 too, which is more variety at identical difficulty.
     子类 stays in the data and resurfaces in 航海图鉴 as chapter sections, where a
     field guide is exactly the right place for 陆上 vs 水中与空中.
     Rule: if something is worth being a top-level choice it is worth being a
     组别. When scope grows, add 组别 values rather than promoting 子类. */
  /* ---------- 学习范围 (owner 2026-08-16) ----------
     The dock's 复习范围. A round now draws from the SELECTED groups rather than
     from whichever group the student happened to tap, which is what lets the menu
     collapse to two buttons.
     ⚠️ distractors() still draws from the answer's OWN 组别 (PATCH_category_hierarchy),
     so widening the scope adds variety without changing difficulty — that rule is
     untouched and must stay that way. */
  function allGroupNames() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) { if (!seen[w.组别]) { seen[w.组别] = 1; out.push(w.组别); } });
    return out;
  }
  function scopeNames() {
    var all = allGroupNames();
    if (!store.scope) return all.slice();
    var ok = store.scope.filter(function (g) { return all.indexOf(g) >= 0; });
    return ok.length ? ok : all.slice();          // never let the scope be empty
  }
  function scopedWords() {
    var sel = {}; scopeNames().forEach(function (g) { sel[g] = 1; });
    return WORDS.filter(function (w) { return sel[w.组别]; });
  }
  function scopeLabel() {
    var n = scopeNames();
    return n.length === allGroupNames().length ? "全部" : n.join(" · ");
  }
  function toggleScope(g) {
    var cur = scopeNames(), i = cur.indexOf(g);
    if (i >= 0) { if (cur.length === 1) return; cur.splice(i, 1); }   // never empty
    else cur.push(g);
    store.scope = cur; save();
  }

  function groups() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) {
      if (!seen[w.组别]) {
        seen[w.组别] = { 组别: w.组别, n: 0, done: 0 };
        out.push(seen[w.组别]);
      }
      seen[w.组别].n++;
      if (store.done[w.词语]) seen[w.组别].done++;
    });
    return out;
  }

  /* ---------- modes (spec §4) ----------
     看图学词 is FIRST and is not a test: owner 2026-08-15, "needs a flashcard
     option for the users to learn the words before getting tested". Everything
     else here asks a beginner to pick the right word out of four before anyone
     has told them what any of them are. The flashcard deals with that, so it
     leads the list and every other mode reads as「now check yourself」. */
  var MODES = [
    { id: "learn", icon: "📖", zh: "看图学词", en: "Learn the words", learn: true },
    { id: "pic", icon: "🖼️", zh: "看图识词", en: "Picture → word" },
    { id: "listen", icon: "🔊", zh: "听音识图", en: "Listen → picture" },
    { id: "type", icon: "🎣", zh: "词海垂钓", en: "Reel it in — type the pinyin" },
    { id: "match", icon: "🪢", zh: "连线", en: "Match them up" }
  ];
  var MATCH_SIZES = [3, 5, 8];   // 连线 difficulty: pairs on the board at once

  /* 动线编号 — the same gold numerals app.js puts on multi-step decision flows.
     Numbering restarts per screen, and optional settings are never numbered. */
  var STEP_N = ["①", "②", "③", "④"];
  function stepNo(n) { return '<span class="xh-step">' + (STEP_N[n - 1] || n) + "</span>"; }

  function sailStats() {
    var met = 0, shown = 0, wrong = 0;
    WORDS.forEach(function (w) {
      if (store.done[w.词语]) met++;
      var st = store.stats[w.词语];
      if (st) { shown += st.shown || 0; wrong += st.wrong || 0; }
    });
    var full = 0, gs = groups();
    gs.forEach(function (g) { if (g.done === g.n) full++; });
    return { met: met, all: WORDS.length, shown: shown, wrong: wrong,
             acc: shown ? Math.round((shown - wrong) / shown * 100) : null,
             full: full, groups: gs.length };
  }
  function statCell(n, unit, zh, en) {
    return '<div class="xh-stat"><b>' + n + (unit ? "<i>" + unit + "</i>" : "") + "</b>" +
      "<span>" + zh + '<span class="xh-en">' + en + "</span></span></div>";
  }

  /* ---------- menu ---------- */
  function renderMenu() {
    state = null;
    /* PATCH_liquid_glass listed five structural gaps behind「it looks boring」,
       measured against the G2 arena screen. Four are here: a HERO CARD with art
       instead of an opening text panel, PROGRESSION as real numbers instead of a
       lone「3 / 36」, 动线编号 ①② on the flow, and an ENTRY TILE for 图鉴 with its
       own cover art. The fifth (top-bar parity) is the topbar block above.
       ⚠️ Only the 图鉴 tile exists: 泊位, badges and boards are not built, and the
       patch says to ship the hero with 图鉴 progress alone rather than block on
       the economy. Add tiles beside it as those land. */
    var st = sailStats();
    var pct = st.all ? Math.round(st.met / st.all * 100) : 0;

    var h = '<div class="xh-hero">' +
      '<img class="xh-hero-bg" src="art/xh/dock_bg.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
      '<div class="xh-hero-in">' +
        '<div class="xh-hero-t">启航码头</div>' +
        '<div class="xh-hero-sub">看图学词 · 零基础起航' +
        '<span class="xh-en">Start here. Pictures first, characters second.</span></div>' +
        '<div class="xh-stats">' +
          statCell(st.met, "海里", "航程", "words met") +
          statCell(st.acc === null ? "—" : st.acc + "%", "", "一次答对", "first-try correct") +
          statCell(st.full + " / " + st.groups, "", "集齐的组", "chapters complete") +
        "</div></div></div>";

    /* 航海图鉴 tile. 航程 (1 词 = 1 海里) is the dock's own distance metric and is
       deliberately NOT 海拔 — nothing crosses the waterline. */
    h += '<button class="xh-tile" id="xhLog">' +
      '<img class="xh-tile-art" src="art/xh/xh_atlas_cover.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
      '<span class="xh-tile-txt"><b>航海图鉴</b>' +
      '<span class="xh-en">the words you have met</span>' +
      '<span class="xh-bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="xh-tile-n">' + st.met + " / " + st.all + ' 海里</span></span>' +
      '<span class="xh-tile-go">›</span></button>';

    h += '<button class="xh-tile slim" id="xhBoards">' +
      '<span class="xh-tile-ic">🏆</span>' +
      '<span class="xh-tile-txt"><b>码头风云榜</b>' +
      '<span class="xh-en">the dock boards</span>' +
      '<span class="xh-tile-n">航海值 ' + (store.sail || 0) + " · 航程 " + st.met + ' 海里</span></span>' +
      '<span class="xh-tile-go">›</span></button>';

    /* ---------- ① 学习范围 ② 学词/闯关 ③ 玩法 (owner 2026-08-16) ----------
       Was: a flat row of five modes, then「选词语组」as a second step where tapping
       a group also STARTED the round. The owner asked for the mountain's shape —
       two main buttons and a toggleable scope — so scope is now a persistent
       setting at the top, the two buttons pick the kind of activity, and the mode
       cards below are only the ones that belong to the chosen kind. */
    var sel = scopeNames(), selWords = scopedWords();
    h += '<div class="xh-board"><button class="xh-sec xh-sec-t" id="xhScopeT">' + stepNo(1) +
      '学习范围 · 可多选 <span class="xh-en">what to study</span>' +
      '<span class="xh-sum">' + esc(scopeLabel()) + " · " + selWords.length + ' 词</span>' +
      '<span class="xh-caret">' + (store.scopeOpen ? "▾" : "▸") + "</span></button>";
    if (store.scopeOpen) {
      h += '<div class="xh-scope">';
      groups().forEach(function (b) {
        var on = sel.indexOf(b.组别) >= 0;
        h += '<button class="xh-gchip' + (on ? " on" : "") + '" data-g="' + esc(b.组别) + '"' +
          ' aria-pressed="' + (on ? "true" : "false") + '">' +
          "<b>" + esc(b.组别) + "</b><span>" + b.done + " / " + b.n + "</span></button>";
      });
      h += "</div>";
    }
    h += "</div>";

    h += '<div class="xh-board"><div class="xh-sec">' + stepNo(2) +
      '选择学习方式 <span class="xh-en">learn or play</span></div>' +
      '<div class="xh-tabs">' +
      '<button class="xh-tab' + (store.tab === "learn" ? " on" : "") + '" data-t="learn">' +
        '<span class="xh-mi">📖</span><b>学词</b><span class="xh-en">Learn</span></button>' +
      '<button class="xh-tab' + (store.tab === "play" ? " on" : "") + '" data-t="play">' +
        '<span class="xh-mi">🎮</span><b>闯关</b><span class="xh-en">Play</span></button>' +
      "</div></div>";

    var tabModes = MODES.filter(function (m) { return !!m.learn === (store.tab === "learn"); });
    if (tabModes.length && !tabModes.some(function (m) { return m.id === store.mode; })) {
      store.mode = tabModes[0].id; save();     // keep the selection inside the visible tab
    }
    h += '<div class="xh-board"><div class="xh-sec">' + stepNo(3) +
      (store.tab === "learn" ? "看图学词" : "词语游乐场") +
      ' <span class="xh-en">' + (store.tab === "learn" ? "study the pictures" : "pick a game") +
      "</span></div>";
    h += '<div class="xh-modes">';
    tabModes.forEach(function (m) {
      h += '<button class="xh-mode' + (store.mode === m.id ? " on" : "") + '" data-m="' + m.id + '">' +
        '<span class="xh-mi">' + m.icon + "</span><b>" + m.zh + "</b>" +
        '<span class="xh-en">' + m.en + "</span>" + "</button>";
    });
    h += "</div>";

    /* 连线 is the one mode whose difficulty the student sets, so its control only
       appears when 连线 is the chosen mode — a size picker sitting over 看图识词
       would just be a control that does nothing. It is deliberately NOT numbered:
       it is a setting on the game just chosen, not a further step. */
    if (store.mode === "match") {
      h += '<div class="xh-subsec">一次连几组？' +
        ' <span class="xh-en">how many pairs at once</span>' + "</div><div class=\"xh-sizes\">";
      MATCH_SIZES.forEach(function (n) {
        h += '<button class="xh-size' + (store.matchN === n ? " on" : "") + '" data-n="' + n + '">' +
          "<b>" + n + "</b><span>" + (n === 3 ? "容易 easy" : n === 5 ? "普通 normal" : "有挑战 hard") + "</span></button>";
      });
      h += "</div>";
    }
    h += '<button class="xh-go" id="xhGoRound">出发 ›<span class="xh-en">start</span></button>';
    h += "</div>";
    view().innerHTML = h;

    document.getElementById("xhLog").onclick = function () { renderLog(); };
    document.getElementById("xhBoards").onclick = function () { renderBoards(); };
    document.getElementById("xhScopeT").onclick = function () {
      store.scopeOpen = !store.scopeOpen; save(); renderMenu();
    };
    Array.prototype.forEach.call(view().querySelectorAll(".xh-gchip"), function (el) {
      el.onclick = function () { toggleScope(el.getAttribute("data-g")); renderMenu(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-tab"), function (el) {
      el.onclick = function () { store.tab = el.getAttribute("data-t"); save(); renderMenu(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode"), function (el) {
      el.onclick = function () { store.mode = el.getAttribute("data-m"); save(); renderMenu(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-size"), function (el) {
      el.onclick = function () { store.matchN = parseInt(el.getAttribute("data-n"), 10); save(); renderMenu(); };
    });
    document.getElementById("xhGoRound").onclick = function () { startRound(scopeLabel()); };
  }

  /* ---------- 航海图鉴 (addendum §2) ----------
     The dock's collection surface, and the answer to「what is all this for?」.
     One chapter per 组别, sectioned by 子类. A word not yet met is a dark
     SILHOUETTE of its own
     sprite, not an empty slot: the learner can see the shape of what is still out
     there, which an empty box cannot show.

     UNLOCK = FIRST CORRECT ANSWER, which store.done already records — so this
     screen adds no storage at all. Deliberately weaker than the mountain's
     mastery gate: 图鉴 is a record of what has been MET, not a claim of mastery,
     and a beginner needs visible progress inside their first session.

     航程 (1 词 = 1 海里) is the dock's distance metric. It is NOT 海拔 and never
     converts into it — 贝壳/航程/航海值 all stop at the waterline. */
  function logPages() {
    /* chapters = 组别 (the menu's own unit), sections = 子类 INSIDE a chapter.
       PATCH_category_hierarchy puts 子类 here rather than on the menu: a field
       guide is exactly where 陆上动物 vs 水中与空中 is meaningful and visual. */
    var seen = {}, out = [];
    WORDS.forEach(function (w) {
      if (!seen[w.组别]) { seen[w.组别] = { 组别: w.组别, words: [], secs: [], byS: {} }; out.push(seen[w.组别]); }
      var p = seen[w.组别];
      p.words.push(w);
      if (!p.byS[w.子类]) { p.byS[w.子类] = []; p.secs.push(w.子类); }
      p.byS[w.子类].push(w);
    });
    return out;
  }
  /* Open 看图学词 over an arbitrary list — the dock's answer to the mountain's
     startFlashList. `grp` stays the REAL 组别 (never a filter label) because
     renderLearnEnd's 开始测验 starts a round on it, and a label would find no words. */
  function startLearnList(words, grp, at) {
    if (!words || !words.length) return;
    state = { grp: grp, mode: "learn", seq: words.slice(), i: at || 0,
              correct: 0, missed: [], firstTry: true, pool: words.slice() };
    words.forEach(function (w) { (new Image()).src = "art/xh/" + w.图档 + ASSET_V; });
    render();
  }

  /* ⚠️ Rebuilt 2026-08-16 (owner: 「航海图鉴 does not respond to tapping at all」).
     It was right that nothing responded: locked cells were rendered `disabled`, so
     on a fresh account — 0 / 36 — EVERY cell on the page was dead, and the only
     promise on screen (「tap a word you have met」) applied to nothing.
     This is the dock's 我的词语表, so it now carries the same three controls that
     page has and this one lacked: status FILTERS, a tap on ANY row (a word you have
     not met is the most worth opening, not the least), and a BULK action over the
     current filter. Revealing a locked word gives nothing away — 看图学词 already
     walks every word in the group, met or not. */
  function renderLog(page, filter) {
    state = null;
    var pages = logPages();
    if (!pages.length) return renderMenu();
    var cur = null;
    pages.forEach(function (p) { if (p.组别 === page) cur = p; });
    if (!cur) cur = pages[0];
    /* the filter is a PARAMETER, never stored — same as the mountain's
       renderWordList. Persisting it meant a student who last looked at 已认得
       came back to「这个筛选下暂时没有词语」and an empty page, which at 0/36 is
       every new student. Each visit opens on 全部. */
    var f = filter || "all";
    function keep(w) { return f === "all" || (f === "got") === !!store.done[w.词语]; }
    var shown = cur.words.filter(keep);
    var sailed = WORDS.filter(function (w) { return store.done[w.词语]; }).length;
    var got = cur.words.filter(function (w) { return store.done[w.词语]; }).length;

    var h = '<div class="xh-round-bar"><button class="xh-quit" id="xhQuit">‹ 返回</button>' +
      '<span class="xh-block-tag">航海图鉴</span></div>' +
      '<div class="xh-board"><div class="xh-log-head">' +
      '<div class="xh-berth-title">🧭 航海图鉴<span class="xh-en">Your word log</span></div>' +
      '<span class="xh-log-sail"><b>' + sailed + "</b> / " + WORDS.length + " 海里" +
      '<span class="xh-en">words met</span></span></div>' +
      '<div class="xh-log-pages">';
    pages.forEach(function (p) {
      var n = p.words.filter(function (w) { return store.done[w.词语]; }).length;
      h += '<button class="xh-log-page' + (p === cur ? " on" : "") + '" data-p="' + esc(p.组别) + '">' +
        esc(p.组别) + " " + n + "/" + p.words.length + "</button>";
    });
    h += "</div></div>";

    h += '<div class="xh-board"><div class="xh-sec">' + esc(cur.组别) +
      (got === cur.words.length ? '<span class="xh-log-stamp">全部集齐</span>' : "") +
      '<span class="xh-en">tap any word to open it as a flashcard</span></div>';
    h += '<div class="xh-log-sub">点任何一个词语都能打开图卡，还没认得的也可以先看。' +
      '<span class="xh-en">Tap any word to study it — including ones you have not met.</span></div>';
    var fc = [["all", "全部", cur.words.length], ["got", "已认得", got],
              ["miss", "还没认得", cur.words.length - got]];
    h += '<div class="xh-log-filters">' + fc.map(function (c) {
      return '<button class="xh-log-chip' + (f === c[0] ? " on" : "") + '" data-f="' + c[0] + '">' +
        c[1] + " " + c[2] + "</button>";
    }).join("") + "</div>";
    h += '<div class="xh-log-act"><button class="xh-btn" id="xhLogLearn"' +
      (shown.length ? "" : " disabled") + '>📖 看图学词 · 学这 ' + shown.length + ' 个' +
      '<span class="xh-en">study these</span></button></div>';
    if (!shown.length) h += '<div class="xh-log-empty">这个筛选下暂时没有词语。</div>';
    cur.secs.forEach(function (sec) {
      if (!cur.byS[sec].filter(keep).length) return;   // hide a section the filter emptied
      // a one-section chapter (日常用品) needs no divider — the chapter title
      // already says it, and an identical subtitle underneath reads as a bug
      if (cur.secs.length > 1) h += '<div class="xh-log-sec">' + esc(sec) + "</div>";
      h += '<div class="xh-log-grid">';
      cur.byS[sec].filter(keep).forEach(function (w) {
        var have = !!store.done[w.词语];
        /* ⚠️ never `disabled` any more — a locked cell that cannot be tapped is
           what made the whole page inert at 0/36. Locked keeps its silhouette and
           ？ so the collecting still means something; it is simply reachable. */
        h += '<button class="xh-log-cell ' + (have ? "got" : "miss") + '" data-w="' + esc(w.词语) + '">' +
          img(w) +
          (have
            ? "<b>" + esc(w.词语) + "</b>" +
              '<span class="xh-py">' + esc(w.拼音) + "</span>" +
              '<span class="xh-en">' + esc(w.英文释义) + "</span>"
            : "<b>？</b>") +
          "</button>";
      });
      h += "</div>";
    });
    h += "</div>";
    view().innerHTML = h;
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".xh-log-page"), function (el) {
      el.onclick = function () { renderLog(el.getAttribute("data-p")); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-log-chip"), function (el) {
      el.onclick = function () { renderLog(cur.组别, el.getAttribute("data-f")); };
    });
    /* tap ANY word — met or not — and it opens as a flashcard, positioned at that
       word inside the current filter so 上一个/下一个 walk the rest of it. The
       mountain does the same: a row is a way in, not a reward for having got it. */
    Array.prototype.forEach.call(view().querySelectorAll(".xh-log-cell"), function (el) {
      el.onclick = function () {
        var k = el.getAttribute("data-w"), at = 0;
        shown.forEach(function (w, i) { if (w.词语 === k) at = i; });
        startLearnList(shown, cur.组别, at);
      };
    });
    var lb = document.getElementById("xhLogLearn");
    if (lb) lb.onclick = function () { startLearnList(shown, cur.组别, 0); };
  }

  /* ---------- 码头风云榜 (SPEC_XH_dock_economy_and_TTS §1) ----------
     Two boards that are never summed and never merged with 词山风云榜:
       识词数 = 航程, what you know;  航海值, what you did.
     ⚠️ Scope is 校内 / 跨校 (owner 2026-08-15). The spec said「same-stream peers」,
     but a dock student has no stream yet — some may not take CL at all — so
     stream is not a scope that exists here. 校内 is the meaningful small cohort
     and 跨校 is the whole dock; both are read off the SAME fetched set. */
  function renderBoards() {
    state = null;
    var tab = store.lbTab, scope = store.lbScope;
    var me = profileOf();
    var meSail = WORDS.filter(function (w) { return store.done[w.词语]; }).length;

    function tabBtn(id, zh, en) {
      return '<button class="xh-lb-tab' + (tab === id ? " on" : "") + '" data-t="' + id + '">' +
        zh + '<span class="xh-en">' + en + "</span></button>";
    }
    function scopeBtn(id, zh, en) {
      return '<button class="xh-lb-scope' + (scope === id ? " on" : "") + '" data-s="' + id + '">' +
        zh + '<span class="xh-en">' + en + "</span></button>";
    }
    view().innerHTML =
      '<div class="xh-round-bar"><button class="xh-quit" id="xhQuit">‹ 返回</button>' +
      '<span class="xh-block-tag">码头风云榜</span></div>' +
      '<div class="xh-board"><div class="xh-sec">🏆 码头风云榜' +
      '<span class="xh-en">the dock boards</span></div>' +
      '<div class="xh-lb-tabs">' + tabBtn("sailed", "识词数", "words met") +
        tabBtn("pts", "航海值", "effort") + "</div>" +
      '<div class="xh-lb-tabs sm">' + scopeBtn("school", "校内", "my school") +
        scopeBtn("all", "跨校", "everyone") + "</div>" +
      /* the two numbers are shown side by side but NEVER added together */
      '<div class="xh-lb-me"><span>我的' + (tab === "pts" ? "航海值" : "航程") + "：</span><b>" +
        (tab === "pts" ? (store.sail || 0) : meSail) + "</b>" +
        (tab === "pts" ? "" : " 海里") + "</div>" +
      '<div class="xh-lb-list" id="xhLbList"><div class="xh-lb-msg">正在读取…' +
      '<span class="xh-en">loading</span></div></div>' +
      '<div class="xh-lb-note">只有身份是「学生」的同学会上榜。' +
      '<span class="xh-en">Only profiles set to 学生 appear here.</span></div></div>';
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".xh-lb-tab"), function (el) {
      el.onclick = function () { store.lbTab = el.getAttribute("data-t"); save(); renderBoards(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-lb-scope"), function (el) {
      el.onclick = function () { store.lbScope = el.getAttribute("data-s"); save(); renderBoards(); };
    });

    var box = document.getElementById("xhLbList");
    function msg(t, en) {
      box.innerHTML = '<div class="xh-lb-msg">' + esc(t) + '<span class="xh-en">' + esc(en) + "</span></div>";
    }
    if (!window.WSCloud || !window.WSCloud.topDock || !window.WSCloud.isAvailable()) {
      return msg("现在连不上网络，榜单待会儿再看。", "Offline — the board needs a connection.");
    }
    pushDock(true);      // make sure my own row is fresh before I read the board
    /* ⚠️ A read that never answers is the failure mode to defend against, not a
       read that fails. On a managed school network Firestore's get() can hang
       PENDING rather than reject — the same thing that used to leave every stream
       page stuck on 正在装载词库 — so the board gets its own deadline instead of
       waiting forever on a spinner. A late answer is still allowed to paint. */
    var done = false;
    setTimeout(function () {
      if (!done) msg("榜单一直读不到，可能是网络挡住了。", "The board is not answering — network?");
    }, 6000);
    window.WSCloud.topDock(tab, function (rows) {
      done = true;
      if (!rows) return msg("读取失败，请稍后再试。", "Could not load the board.");
      if (scope === "school" && me.school) {
        rows = rows.filter(function (r) { return r.school === me.school; });
      }
      rows = rows.slice(0, 20);
      if (!rows.length) return msg("这里还没有人上榜，你可以是第一个。", "No one here yet — be the first.");
      var uid = null;
      try { if (window.WSProfile && window.WSProfile.uid) uid = window.WSProfile.uid(); } catch (e) {}
      var h = "";
      rows.forEach(function (r, i) {
        var mine = uid && r.uid === uid;
        h += '<div class="xh-lb-row' + (mine ? " me" : "") + '">' +
          '<span class="xh-lb-rank">' + (i + 1) + "</span>" +
          '<span class="xh-lb-nick">' + esc(r.nickname || "—") + "</span>" +
          '<span class="xh-lb-v">' + (tab === "pts" ? r.pts : r.sailed) + "</span></div>";
      });
      box.innerHTML = h;
    });
  }

  /* startRound(label, forceMode, poolOverride)
     ⚠️ `label` is now only what the round is CALLED. The words come from the
     current 学习范围, or from poolOverride when the caller already has a list
     (the atlas hands one over). Rounds used to be keyed to a single 组别, which
     is why every caller passed one. */
  function startRound(sub, forceMode, poolOverride) {
    var mode = forceMode || store.mode || "pic";
    var pool = poolOverride || scopedWords();
    if (!pool.length) return;
    var seq;
    if (mode === "learn") {
      // the flashcard walks the WHOLE group in data order: it is a lesson, not a
      // sample, and a stable order means the second visit is the same lesson
      seq = pool.slice();
    } else {
      seq = shuffle(pool.slice()).slice(0,
        Math.min(mode === "match" ? (store.matchN || 5) : ROUND_N, pool.length));
    }
    if (!seq.length) return;
    state = { grp: sub || scopeLabel(), mode: mode, seq: seq, i: 0, correct: 0,
              missed: [], firstTry: true, pool: pool };
    // warm the round's sprites: each question swaps the image, and an undecoded
    // sprite shows as an empty frame for a beat — the picture IS the question
    var warm = (mode === "match" || mode === "learn") ? seq : seq.concat(distractors(seq[0], 3));
    warm.forEach(function (w) { (new Image()).src = "art/xh/" + w.图档 + ASSET_V; });
    render();
  }

  /* jetty progress bar — spec §5.3: a round should feel like a journey, not a
     counter. The boat advances along the jetty as answers land. */
  function jetty() {
    var n = state.seq.length;
    var frac = n ? state.i / n : 0;
    return '<div class="xh-jetty"><div class="xh-jetty-line"></div>' +
      '<img class="xh-jetty-boat" style="left:' + (frac * 100).toFixed(1) + '%" ' +
      'src="art/seamap/boat_broadside.png' + ASSET_V + '" alt="">' +
      '<span class="xh-jetty-n">' + (state.i + 1) + " / " + n + "</span></div>";
  }
  function bar() {
    return '<div class="xh-round-bar"><button class="xh-quit" id="xhQuit">‹ 返回</button>' +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) + "</span></div>";
  }

  function render() {
    if (state.mode === "learn") {
      if (state.i >= state.seq.length) return renderLearnEnd();
      return renderLearn();
    }
    if (state.i >= state.seq.length) return renderResult();
    if (state.mode === "listen") return renderListen();
    if (state.mode === "type") return renderType();
    if (state.mode === "match") return renderMatch();
    return renderPic();
  }
  function wireQuit() {
    document.getElementById("xhQuit").onclick = renderMenu;
  }
  function advance(ms) {
    setTimeout(function () { state.i++; render(); }, ms || 1150);
  }
  function reveal(w) {
    return '<b>' + esc(w.词语) + "</b>" +
      ' <span class="xh-py">' + esc(w.拼音) + "</span>" +
      ' <span class="xh-en">' + esc(w.英文释义) + "</span>";
  }
  /* Wrong answers cost nothing anywhere in this tier: mark it, keep the question
     up, let them try again. This is first contact with a writing system they
     cannot read, so a wrong tap must be free. */
  function noteWrong(w, chosen) {
    var s = stat(w);
    if (state.firstTry) {
      state.firstTry = false;
      s.wrong++;
      if (chosen) s.confused[chosen] = (s.confused[chosen] || 0) + 1;
      if (state.missed.indexOf(w) < 0) state.missed.push(w);
    }
    save();
    sfxNo();
  }
  /* ⚠️ THESE NUMBERS ARE MINE, not the spec's — it gives the metric and the rule
     that it never merges with 航程, but no rates. They scale with how much
     production a mode demands: recognising a picture is worth less than typing
     the pinyin from memory. A repeat after a miss still earns, at half, because
     the tier's whole premise is that a wrong answer costs nothing.
     Retune freely: they are four numbers and a multiplier. */
  var SAIL_PTS = { pic: 2, listen: 3, match: 3, type: 4, learn: 0 };
  function awardSail(mode, firstTry) {
    var base = SAIL_PTS[mode] || 0;
    if (!base) return 0;                      // 看图学词 asks nothing, so earns nothing
    var n = firstTry ? base : Math.max(1, Math.round(base * 0.5));
    store.sail += n;
    return n;
  }

  function noteRight(w) {
    if (state.firstTry) state.correct++;
    awardSail(state.mode, state.firstTry);
    store.done[w.词语] = true;
    save();
    pushDock();
    sfxOk();
    speak(w.词语);      // never the English (spec §3 of v1, unchanged)
  }

  /* Publish to the dock boards. Students only — teachers, parents and 公众 browse
     but never rank, exactly as on the mountain. Throttled to one write every 20s
     so a fast 连线 round does not fire a write per pair. */
  var _dockAt = 0;
  function pushDock(force) {
    var p = profileOf();
    if (p.category !== "student" || !p.nickname) return;
    if (!window.WSCloud || !window.WSCloud.isAvailable() || !window.WSCloud.saveDock) return;
    var now = (new Date()).getTime();
    if (!force && now - _dockAt < 20000) return;
    _dockAt = now;
    var met = WORDS.filter(function (w) { return store.done[w.词语]; }).length;
    window.WSCloud.saveDock({ nickname: p.nickname, school: p.school || "",
      avatarId: p.avatarId || "", sailed: met, pts: store.sail || 0 });
  }

  /* 4.0 看图学词 — the flashcard (owner 2026-08-15). Nothing is asked and nothing
     can be got wrong: picture, word, 拼音, English, read aloud, and a way forward
     and back. It walks the whole group rather than a five-item sample, because it
     is what a student does BEFORE a round rather than instead of one.
     It deliberately does NOT write store.done — 学过了 on the menu counts words a
     student has actually produced an answer for. Looking at a card is not that,
     and letting it count would let someone finish the whole 码头 without ever
     being asked a question. */
  function renderLearn() {
    var w = state.seq[state.i], n = state.seq.length;
    var h = '<div class="xh-round-bar"><button class="xh-quit" id="xhQuit">‹ 返回</button>' +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) + " · 学词</span></div>" +
      '<div class="xh-board xh-stage xh-card">' +
      '<button class="xh-sprite big" id="xhSprite" title="点图听读音">' + img(w) + "</button>" +
      '<div class="xh-card-word"><b>' + esc(w.词语) + "</b>" +
      '<span class="xh-py">' + esc(w.拼音) + "</span>" +
      '<span class="xh-en">' + esc(w.英文释义) + "</span>" + "</div>" +
      '<button class="xh-btn xh-say" id="xhSay">🔊 再听一次' +
      ' <span class="xh-en">hear it again</span>' + "</button>" +
      '<div class="xh-cardnav">' +
      '<button class="xh-btn ghost" id="xhPrev"' + (state.i ? "" : " disabled") + '>‹ 上一个</button>' +
      '<button class="xh-btn" id="xhNext">' + (state.i === n - 1 ? "学完了 ›" : "下一个 ›") + "</button></div></div>";
    view().innerHTML = h;
    wireQuit();
    speak(w.词语);
    document.getElementById("xhSprite").onclick = function () { speak(w.词语); };
    document.getElementById("xhSay").onclick = function () { speak(w.词语); };
    document.getElementById("xhPrev").onclick = function () { if (state.i) { state.i--; render(); } };
    document.getElementById("xhNext").onclick = function () { state.i++; render(); };
  }
  /* end of the flashcard: the point of it is the round that follows, so the
     primary button starts one on the SAME group rather than returning to a menu */
  function renderLearnEnd() {
    var h = '<div class="xh-board xh-result"><div class="xh-berth-title">📖 这一组看完了</div>' +
      '<div class="xh-score">' + esc(state.grp) + ' · <b>' + state.seq.length + "</b> 个词语" +
      ' <span class="xh-en">words in this group</span>' + "</div>" +
      '<div class="xh-sub">现在试试看，你记住了几个？' +
      '<span class="xh-en">Now see how many you remember.</span>' + "</div>" +
      '<div class="xh-result-btns"><button class="xh-btn" id="xhTest">🖼️ 开始测验</button>' +
      '<button class="xh-btn ghost" id="xhAgain">再看一次</button>' +
      '<button class="xh-btn ghost" id="xhBack">换一组</button></div></div>';
    view().innerHTML = h;
    document.getElementById("xhTest").onclick = function () { startRound(state.grp, "pic", state.pool); };
    document.getElementById("xhAgain").onclick = function () { startRound(state.grp, "learn", state.pool); };
    document.getElementById("xhBack").onclick = renderMenu;
  }

  /* 4.1 看图识词 — picture → word */
  function renderPic() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var opts = shuffle(distractors(w).concat([w]));
    /* ⚠️ the picture is the QUESTION here, so it must stay silent (owner 2026-08-16,
       same defect as 连线): speaking it named the answer, and with 拼音 on by default
       the student only had to match the sound to the printed pinyin. The 🔊 lives on
       each OPTION instead — every option speaks, so hearing one reveals nothing —
       which is exactly what the main app does in all its MCQ modes. Sibling buttons,
       never nested, per the 可及性 pass. */
    var h = bar() + '<div class="xh-board xh-stage">' +
      '<span class="xh-sprite quiet" id="xhSprite">' + img(w) + "</span>" +
      '<div class="xh-hint" id="xhHint"></div><div class="xh-opts">';
    opts.forEach(function (o) {
      h += '<div class="xh-optrow"><button class="xh-opt" data-w="' + esc(o.词语) + '"><span class="xh-word">' +
        esc(o.词语) + "</span>" + '<span class="xh-py">' + esc(o.拼音) + "</span>" + "</button>" +
        '<button class="xh-otts" data-w="' + esc(o.词语) + '" title="朗读" aria-label="朗读 ' +
        esc(o.词语) + '">🔊</button></div>';
    });
    view().innerHTML = h + "</div></div>";
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".xh-otts"), function (el) {
      el.onclick = function () { speak(el.getAttribute("data-w")); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-opt"), function (el) {
      el.onclick = function () {
        if (el.disabled) return;
        if (el.getAttribute("data-w") !== w.词语) {
          noteWrong(w, el.getAttribute("data-w"));
          el.classList.add("wrong"); el.disabled = true;
          return;
        }
        el.classList.add("right");
        Array.prototype.forEach.call(view().querySelectorAll(".xh-opt"), function (b) { b.disabled = true; });
        document.getElementById("xhSprite").classList.add("pop");
        noteRight(w);
        var hint = document.getElementById("xhHint");
        hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
        advance();
      };
    });
  }

  /* 4.2 听音识图 — audio → picture. Mode 4.1 with prompt and options swapped;
     forces listening rather than shape-matching. */
  function renderListen() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var opts = shuffle(distractors(w).concat([w]));
    var h = bar() + '<div class="xh-board xh-stage">' +
      '<button class="xh-play" id="xhPlay">🔊 <span>再听一次</span>' +
      '<span class="xh-en">tap to hear it again</span>' + "</button>" +
      '<div class="xh-hint" id="xhHint"></div><div class="xh-pics">';
    opts.forEach(function (o) {
      h += '<button class="xh-pic" data-w="' + esc(o.词语) + '">' + img(o) + "</button>";
    });
    view().innerHTML = h + "</div></div>";
    wireQuit();
    speak(w.词语);
    document.getElementById("xhPlay").onclick = function () { speak(w.词语); };
    Array.prototype.forEach.call(view().querySelectorAll(".xh-pic"), function (el) {
      el.onclick = function () {
        if (el.disabled) return;
        if (el.getAttribute("data-w") !== w.词语) {
          noteWrong(w, el.getAttribute("data-w"));
          el.classList.add("wrong"); el.disabled = true;
          return;
        }
        el.classList.add("right");
        Array.prototype.forEach.call(view().querySelectorAll(".xh-pic"), function (b) { b.disabled = true; });
        noteRight(w);
        var hint = document.getElementById("xhHint");
        hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
        advance();
      };
    });
  }

  /* 4.4 词海垂钓 (拼音打字) — the only mode that trains production rather than recognition.
     Learners here cannot type Chinese (no IME, and using one already assumes
     pinyin), so pinyin itself is the input. */
  function tonelessPy(s) {
    // strip tone marks via NFD, fold ü/v to u, drop spaces — so "lao hu",
    // "laohu" and "lǎo hǔ" all match 老虎. Tones are taught later at 码头;
    // demanding them here would fail learners for something never taught.
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[üv]/gi, "u").replace(/\s+/g, "").toLowerCase();
  }
  /* ---------- 角色精灵 (owner 2026-08-16) ----------
     The student's avatar, drawn from the SAME 6-frame strips 攀山竞速 uses.
     ⚠️ THIRD ASSET FAMILY — never point this at art/avatar/*.png (square, faces
     LEFT, for the picker) or art/camp/pet_*.png (the campsite). Only
     art/sprite/avatar/*_sprite.png faces RIGHT and is a strip.
     Frames: 0 idle · 1-2 walk · 3-4 climb · 5 celebrate.
     ⚠️ Cell WIDTH is per creature (鼠 128px, 唐僧 76px) so the aspect ratio is
     derived from naturalWidth/6 at load — never transcribed. Height is a uniform
     104, which is why background-size:600% 100% slices the strip correctly. */
  function avatarSpriteId() {
    try {
      var p = (window.WSProfile && window.WSProfile.load) ? window.WSProfile.load() : null;
      return (p && p.avatarId) || null;
    } catch (e) { return null; }      // no avatar chosen, or profile.js absent
  }
  function anglerHtml(cls) {
    var id = avatarSpriteId();
    if (!id) return "";               // nothing chosen: the scene simply has no angler
    return '<div class="xh-angler ' + (cls || "") + '" id="xhAngler" style="background-image:url(' +
      "'art/sprite/avatar/" + id + "_sprite.png" + ASSET_V + "')\"></div>";
  }
  function wireAngler() {
    var el = document.getElementById("xhAngler");
    if (!el) return { cheer: function () {}, frame: function () {} };
    var id = avatarSpriteId(), im = new Image();
    im.onload = function () { el.style.aspectRatio = (im.naturalWidth / 6) + " / " + im.naturalHeight; };
    im.onerror = function () { el.style.display = "none"; };   // 404 degrades, never a broken box
    im.src = "art/sprite/avatar/" + id + "_sprite.png" + ASSET_V;
    var t = null;
    function frame(n) { el.style.backgroundPositionX = (n * 20) + "%"; }   // 6 frames -> 0..100% in 20% steps
    frame(0);
    return {
      frame: frame,
      cheer: function () {
        frame(5);
        el.classList.remove("cheer");
        void el.offsetWidth;                 // restart the hop; re-adding a class alone will not
        el.classList.add("cheer");
        if (t) clearTimeout(t);
        t = setTimeout(function () { frame(0); el.classList.remove("cheer"); }, 1100);
      }
    };
  }

  function renderType() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    /* 词海垂钓 (addendum §5) — a fishing FRAME on the typing mode, not a new mode.
       The catch rises and breaks the surface (词雨 falls; this rises, and the two
       should feel like opposites), you type the pinyin to reel it in, and round
       progress is the creel filling rather than a counter.
       ⚠️ The sprite stays visible on the catch. A shadow-under-water variant is
       more atmospheric but removes the picture cue beginners depend on.
       ⚠️ dock_ripple / dock_splash are white LINE ART — they are invisible on a
       light panel, so the water here is a real dark surface, not a glass card.
       That is scenery, which the dock is allowed; the input below it is chrome,
       which stays platform glass. */
    var n = state.seq.length, caught = state.i;
    var creel = caught === 0 ? "empty" : (caught >= n - 1 ? "full" : "half");
    view().innerHTML = bar() + '<div class="xh-board xh-stage">' +
      '<div class="xh-sea" id="xhSea">' +
        anglerHtml() +
        '<img class="xh-rod" src="art/xh/dock_rod.png' + ASSET_V + '" alt="" ' +
          "onerror=\"this.style.display='none'\">" +
        '<img class="xh-creel" id="xhCreel" src="art/xh/dock_creel_' + creel + '.png' + ASSET_V +
          '" alt="" onerror="this.style.display=\'none\'">' +
        '<img class="xh-fx" id="xhFx" src="" alt="" aria-hidden="true">' +
        '<button class="xh-catch" id="xhSprite" title="答对或看过拼音后可以点图听读音">' + img(w) + "</button>" +
      "</div>" +
      '<div class="xh-typerow">' +
      '<input class="xh-input" id="xhIn" type="text" autocomplete="off" autocapitalize="off" ' +
      'autocorrect="off" spellcheck="false" placeholder="用拼音打出来 · type the pinyin">' +
      '<button class="xh-btn" id="xhGo">收线' +
      '<span class="xh-en">reel it in</span></button></div>' +
      '<div class="xh-hint" id="xhHint"></div></div>';
    wireQuit();
    /* ⚠️ 词海垂钓 is the one mode with no text option to hang the 🔊 on, and it is
       also the mode where speaking leaks MOST: the answer IS the pinyin, so hearing
       the word simply hands it over. This is the only production mode at the dock
       (SPEC_XH_MVP_v2 §3) and reading it aloud would erase what it teaches.
       So the picture stays silent until the pinyin is on screen — which §4.4 already
       does on a miss — and after that it is free to replay. */
    var said = false;
    document.getElementById("xhSprite").onclick = function () { if (said) speak(w.词语); };
    var angler = wireAngler();
    var input = document.getElementById("xhIn");
    input.focus();
    var hint = document.getElementById("xhHint");
    var catchEl = document.getElementById("xhSprite");
    var fx = document.getElementById("xhFx");
    function showFx(name) {
      fx.src = "art/xh/dock_" + name + ".png" + ASSET_V;
      fx.className = "xh-fx show " + name;
      setTimeout(function () { fx.className = "xh-fx"; }, 700);
    }

    function check() {
      var v = tonelessPy(input.value);
      if (!v) return;
      if (v !== tonelessPy(w.拼音)) {
        noteWrong(w, v);
        input.classList.add("wrong");
        setTimeout(function () { input.classList.remove("wrong"); }, 400);
        /* it slips under and resurfaces after a beat — NOTHING is lost, which is
           the tier's rule, so there is no lost-catch state to recover from */
        catchEl.classList.add("dive");
        showFx("ripple");
        setTimeout(function () { catchEl.classList.remove("dive"); }, 900);
        // show the pinyin after a miss, then let them retype it (spec §4.4)
        hint.className = "xh-hint show";
        /* .xh-always: this reveal is the point of the miss (spec §4.4), so it
           shows even when the 拼音 display toggle is off — unlike every other
           .xh-py on the page, which the topbar pill gates. */
        hint.innerHTML = '再试一次 <span class="xh-py xh-always">' + esc(w.拼音) + "</span>";
        said = true;          // pinyin is on screen now, so the 🔊 can no longer leak
        input.select();
        return;
      }
      input.disabled = true;
      document.getElementById("xhGo").disabled = true;
      showFx("splash");
      /* ⚠️ measure the arc, do not assume it. The creel now sits on the deck at the
         far left while the catch rises at 60%, so the old fixed percentage offset
         would only ever land correctly at one panel width. */
      var creelEl = document.getElementById("xhCreel");
      if (creelEl) {
        var bc = catchEl.getBoundingClientRect(), bk = creelEl.getBoundingClientRect();
        catchEl.style.setProperty("--landx",
          Math.round(bk.left + bk.width / 2 - (bc.left + bc.width / 2)) + "px");
        catchEl.style.setProperty("--landy",
          Math.round(bk.top + bk.height * 0.30 - (bc.top + bc.height / 2)) + "px");
      }
      catchEl.classList.add("land");        // arcs into the creel
      said = true;                          // answered: noteRight speaks it, replay is fine
      angler.cheer();                       // frame 5 + a hop, on every catch (owner)
      noteRight(w);
      hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
      advance(1250);
    }
    document.getElementById("xhGo").onclick = check;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") check();
    });
  }

  /* 4.3 连线 — pictures down the left, the same words shuffled down the right.
     Owner 2026-08-15, three changes to the original:
       · a real LINE is drawn between the two items, not just a green tint. A
         matching game where nothing joins up is a memory test with extra steps;
       · NO right/wrong until the board is full. Every pairing is accepted and
         drawn in rope brown; 检查答案 grades the lot at once. Instant marking made
         it a four-way guess with immediate confirmation, which is a different
         (and much easier) exercise than committing to a whole set;
       · how many pairs are on the board is the student's choice (store.matchN),
         which is what「difficulty」means in this mode.
     Links are held by 词语 text, not by element, so a redraw after a resize or a
     late-decoding sprite never loses them. */
  function renderMatch() {
    var seq = state.seq;
    state.i = 0;
    seq.forEach(function (w) { stat(w).shown++; });
    save();
    var left = shuffle(seq.slice()), right = shuffle(seq.slice());
    var links = [];          // [{pic:"老虎", word:"鲨鱼", ok:null}]
    var sel = null;          // {side:"pic"|"word", key:"老虎"}
    var graded = false;

    var h = '<div class="xh-round-bar"><button class="xh-quit" id="xhQuit">‹ 返回</button>' +
      '<span class="xh-block-tag">' + esc(state.grp) + " · 连线 " + seq.length + "</span></div>" +
      '<div class="xh-board"><div class="xh-match" id="xhMatch">' +
      '<svg class="xh-links" id="xhLinks" aria-hidden="true"></svg><div class="xh-col">';
    left.forEach(function (w) {
      h += '<button class="xh-mitem xh-mpic" data-w="' + esc(w.词语) + '">' + img(w) + "</button>";
    });
    h += '</div><div class="xh-col">';
    /* ⚠️ the 🔊 belongs to the WORD, never to the picture (owner 2026-08-16).
       Speaking on a picture tap hands over the answer: 拼音 is ON by default at the
       dock, so hearing 「dà xiàng」 while touching the elephant maps straight onto the
       pinyin printed under 大象. On this side the word is already visible, so reading
       it aloud teaches pronunciation and reveals no pairing.
       ⚠️ It is a SIBLING button, never nested inside .xh-mword — a 🔊 inside an answer
       button is the near-miss trap the 可及性 pass removed from every MCQ surface
       (a finger 2px off the circle joined the pair instead). It also sits on the OUTER
       edge so the rope, which anchors on the word's left, is never under it. */
    right.forEach(function (w) {
      h += '<div class="xh-mrow"><button class="xh-mitem xh-mword" data-w="' + esc(w.词语) + '"><b>' +
        esc(w.词语) + "</b>" + '<span class="xh-py">' + esc(w.拼音) + "</span></button>" +
        '<button class="xh-mtts" data-w="' + esc(w.词语) + '" title="朗读" aria-label="朗读 ' +
        esc(w.词语) + '">🔊</button></div>';
    });
    h += '</div></div><div class="xh-matchfoot"><span class="xh-mhint" id="xhMHint"></span>' +
      '<button class="xh-btn" id="xhCheck" disabled>检查答案' +
      ' <span class="xh-en">check</span>' + "</button></div></div>";
    view().innerHTML = h;
    wireQuit();

    var wrap = document.getElementById("xhMatch");
    var svg = document.getElementById("xhLinks");
    var checkBtn = document.getElementById("xhCheck");
    var hintEl = document.getElementById("xhMHint");

    function itemOf(side, key) {
      return wrap.querySelector("." + (side === "pic" ? "xh-mpic" : "xh-mword") +
        '[data-w="' + key.replace(/"/g, '\\"') + '"]');
    }
    function anchor(el, side) {
      var b = el.getBoundingClientRect(), box = wrap.getBoundingClientRect();
      return { x: (side === "pic" ? b.right : b.left) - box.left, y: b.top + b.height / 2 - box.top };
    }
    function linkOf(side, key) {
      for (var i = 0; i < links.length; i++) if (links[i][side] === key) return links[i];
      return null;
    }
    /* the rope is redrawn from the live element boxes every time, so a window
       resize or a sprite that decodes late can never leave a line hanging in
       mid-air. The listener removes ITSELF once the board is gone, which is the
       only teardown available when the whole view is replaced by innerHTML. */
    function draw(pointer) {
      if (!document.body.contains(svg)) { window.removeEventListener("resize", onResize); return; }
      var box = wrap.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
      var s = "";
      links.forEach(function (L) {
        var a = itemOf("pic", L.pic), b = itemOf("word", L.word);
        if (!a || !b) return;
        var p = anchor(a, "pic"), q = anchor(b, "word");
        var cls = L.ok === true ? "ok" : L.ok === false ? "bad" : "";
        s += '<line class="xh-link ' + cls + '" x1="' + p.x + '" y1="' + p.y +
          '" x2="' + q.x + '" y2="' + q.y + '"/>' +
          '<circle class="xh-lend ' + cls + '" cx="' + p.x + '" cy="' + p.y + '" r="5"/>' +
          '<circle class="xh-lend ' + cls + '" cx="' + q.x + '" cy="' + q.y + '" r="5"/>';
      });
      if (pointer && sel) {
        var el = itemOf(sel.side, sel.key);
        if (el) {
          var o = anchor(el, sel.side);
          s += '<line class="xh-link drag" x1="' + o.x + '" y1="' + o.y +
            '" x2="' + pointer.x + '" y2="' + pointer.y + '"/>';
        }
      }
      svg.innerHTML = s;
    }
    function onResize() { draw(); }
    window.addEventListener("resize", onResize);
    wrap.addEventListener("pointermove", function (e) {
      if (!sel) return;
      var box = wrap.getBoundingClientRect();
      draw({ x: e.clientX - box.left, y: e.clientY - box.top });
    });
    wrap.addEventListener("pointerleave", function () { draw(); });

    function paint() {
      Array.prototype.forEach.call(wrap.querySelectorAll(".xh-mitem"), function (el) {
        var side = el.classList.contains("xh-mpic") ? "pic" : "word";
        var L = linkOf(side, el.getAttribute("data-w"));
        el.classList.toggle("linked", !!L && L.ok === null);
        el.classList.toggle("ok", !!L && L.ok === true);
        el.classList.toggle("bad", !!L && L.ok === false);
        el.classList.toggle("sel", !!sel && sel.side === side && sel.key === el.getAttribute("data-w"));
      });
      var full = links.length === seq.length;
      checkBtn.disabled = !full;
      hintEl.textContent = full ? "都连好了，检查一下吧"
        : "已连 " + links.length + " / " + seq.length + " 组";
      draw();
    }

    function pick(side, key) {
      var mine = linkOf(side, key);
      if (mine) {
        if (mine.ok === true) return;             // graded correct: locked
        links.splice(links.indexOf(mine), 1);     // tap a joined item to unjoin it
        sel = null; paint(); return;
      }
      if (sel && sel.side !== side) {
        var L = { ok: null };
        L[side] = key; L[sel.side] = sel.key;
        links.push(L); sel = null; paint(); return;
      }
      sel = { side: side, key: key };
      paint();
    }
    Array.prototype.forEach.call(wrap.querySelectorAll(".xh-mitem"), function (el) {
      el.onclick = function () {
        pick(el.classList.contains("xh-mpic") ? "pic" : "word", el.getAttribute("data-w"));
      };
    });
    Array.prototype.forEach.call(wrap.querySelectorAll(".xh-mtts"), function (el) {
      el.onclick = function () { speak(el.getAttribute("data-w")); };   // sibling: never joins a pair
    });

    checkBtn.onclick = function () {
      if (links.length !== seq.length) return;
      var right2 = 0, wrongLinks = [];
      links.forEach(function (L) {
        L.ok = L.pic === L.word;
        if (L.ok) { right2++; store.done[L.pic] = true; }
        else wrongLinks.push(L);
      });
      if (!graded) {                    // only the FIRST check scores and records
        graded = true;
        state.correct = right2;
        for (var ai = 0; ai < right2; ai++) awardSail("match", true);
        wrongLinks.forEach(function (L) {
          var w = seq.filter(function (x) { return x.词语 === L.pic; })[0];
          var s = stat(w);
          s.wrong++;
          s.confused[L.word] = (s.confused[L.word] || 0) + 1;
          if (state.missed.indexOf(w) < 0) state.missed.push(w);
        });
      }
      save();
      pushDock();
      paint();
      checkBtn.disabled = true;
      if (!wrongLinks.length) {
        sfxOk();
        hintEl.textContent = "全部连对了！";
        state.i = seq.length;
        setTimeout(renderResult, 1000);
        return;
      }
      sfxNo();
      hintEl.textContent = "有 " + wrongLinks.length + " 组连错了，再试试";
      // wrong links are taken away rather than left red: nothing is lost by a
      // miss in this tier, so the board simply returns ready to be re-joined
      setTimeout(function () {
        wrongLinks.forEach(function (L) { links.splice(links.indexOf(L), 1); });
        paint();
      }, 1200);
    };

    paint();
    // sprites decode after the first paint and change the row heights with them
    setTimeout(draw, 60);
    setTimeout(draw, 400);
  }

  function renderResult() {
    var h = '<div class="xh-board xh-result"><div class="xh-berth-title">🎉 这一轮完成了</div>' +
      '<div class="xh-score"><b>' + state.correct + "</b> / " + state.seq.length +
      " 一次答对" + ' <span class="xh-en">correct first try</span>' + "</div>";
    if (state.missed.length) {
      h += '<div class="xh-review"><div class="xh-review-h">再看看这几个' +
        ' <span class="xh-en">worth another look</span>' + "</div><div class=\"xh-review-list\">";
      state.missed.forEach(function (w) {
        h += '<button class="xh-review-item" data-w="' + esc(w.词语) + '">' + img(w) +
          "<b>" + esc(w.词语) + "</b>" +
          '<span class="xh-py">' + esc(w.拼音) + "</span>" +
          '<span class="xh-en">' + esc(w.英文释义) + "</span>" + "</button>";
      });
      h += "</div></div>";
    }
    h += '<div class="xh-result-btns"><button class="xh-btn" id="xhAgain">再来一次</button>' +
      '<button class="xh-btn ghost" id="xhBack">换一组</button></div></div>';
    view().innerHTML = h;
    document.getElementById("xhAgain").onclick = function () { startRound(state.grp, null, state.pool); };
    document.getElementById("xhBack").onclick = renderMenu;
    Array.prototype.forEach.call(view().querySelectorAll(".xh-review-item"), function (el) {
      el.onclick = function () { speak(el.getAttribute("data-w")); };
    });
  }

  /* ---------- boot ---------- */
  applyAids();     // before the first paint, so neither aid flashes in or out
  renderTop();     // topbar works even if the word list never arrives

  fetch("data/xh_mvp2.json" + ASSET_V)
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      WORDS = rows;
      if (!store.mode) store.mode = "pic";
      renderMenu();
    })
    .catch(function () {
      view().innerHTML = '<div class="xh-board xh-err">词语资料加载失败，请检查网络后重新整理页面。<br>' +
        '<span class="xh-en">Could not load the word list. Please refresh.</span></div>';
    });
})();
