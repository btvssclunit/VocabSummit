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

   Storage is one localStorage key, ws_xh. No Firestore, no login, no leaderboard. */
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
  function speak(text) {
    if (!window.speechSynthesis || !text) return;
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

  function subcats() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) {
      if (!seen[w.子类]) {
        seen[w.子类] = { 子类: w.子类, 组别: w.组别, n: 0, done: 0 };
        out.push(seen[w.子类]);
      }
      seen[w.子类].n++;
      if (store.done[w.词语]) seen[w.子类].done++;
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
    { id: "type", icon: "⌨️", zh: "拼音打字", en: "Type the pinyin" },
    { id: "match", icon: "🪢", zh: "连线", en: "Match them up" }
  ];
  var MATCH_SIZES = [3, 5, 8];   // 连线 difficulty: pairs on the board at once

  /* ---------- menu ---------- */
  function renderMenu() {
    state = null;
    var all = WORDS.length, done = WORDS.filter(function (w) { return store.done[w.词语]; }).length;
    var h = '<div class="xh-board xh-head">' +
      '<div class="xh-berth-title">启航码头 · 看图学词</div>' +
      '<div class="xh-sub">选一个玩法，再选一组词语。' +
      (store.en ? '<span class="xh-en">Pick a game, then a group of words.</span>' : "") + "</div>" +
      '<div class="xh-progress"><b>' + done + "</b> / " + all + " 个词语学过了" +
      (store.en ? ' <span class="xh-en">words learned</span>' : "") + "</div>" +
      '<div class="xh-toggles">' +
      '<button class="xh-tg' + (store.py ? " on" : "") + '" id="tgPy">拼音 pīn yīn</button>' +
      '<button class="xh-tg' + (store.en ? " on" : "") + '" id="tgEn">English</button></div></div>';

    h += '<div class="xh-modes">';
    MODES.forEach(function (m) {
      h += '<button class="xh-mode' + (store.mode === m.id ? " on" : "") + '" data-m="' + m.id + '">' +
        '<span class="xh-mi">' + m.icon + "</span><b>" + m.zh + "</b>" +
        (store.en ? '<span class="xh-en">' + m.en + "</span>" : "") + "</button>";
    });
    h += "</div>";

    /* 连线 is the one mode whose difficulty the student sets, so its control only
       appears when 连线 is the chosen mode — a size picker sitting over 看图识词
       would just be a control that does nothing. */
    if (store.mode === "match") {
      h += '<div class="xh-board xh-diff"><div class="xh-sec">一次连几组？' +
        (store.en ? ' <span class="xh-en">how many pairs at once</span>' : "") + "</div><div class=\"xh-sizes\">";
      MATCH_SIZES.forEach(function (n) {
        h += '<button class="xh-size' + (store.matchN === n ? " on" : "") + '" data-n="' + n + '">' +
          "<b>" + n + "</b><span>" + (n === 3 ? "容易 easy" : n === 5 ? "普通 normal" : "有挑战 hard") + "</span></button>";
      });
      h += "</div></div>";
    }

    h += '<div class="xh-board"><div class="xh-sec">选词语组' +
      (store.en ? ' <span class="xh-en">choose a group</span>' : "") + "</div><div class=\"xh-blocks\">";
    subcats().forEach(function (b) {
      h += '<button class="xh-block" data-b="' + esc(b.子类) + '">' +
        "<b>" + esc(b.子类) + "</b><span>" + b.done + " / " + b.n + "</span></button>";
    });
    h += "</div></div>";
    view().innerHTML = h;

    document.getElementById("tgPy").onclick = function () { store.py = !store.py; save(); renderMenu(); };
    document.getElementById("tgEn").onclick = function () { store.en = !store.en; save(); renderMenu(); };
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode"), function (el) {
      el.onclick = function () { store.mode = el.getAttribute("data-m"); save(); renderMenu(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-size"), function (el) {
      el.onclick = function () { store.matchN = parseInt(el.getAttribute("data-n"), 10); save(); renderMenu(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-block"), function (el) {
      el.onclick = function () { startRound(el.getAttribute("data-b")); };
    });
  }

  function startRound(sub, forceMode) {
    var mode = forceMode || store.mode || "pic";
    var pool = WORDS.filter(function (w) { return w.子类 === sub; });
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
    state = { sub: sub, mode: mode, seq: seq, i: 0, correct: 0, missed: [], firstTry: true };
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
      jetty() + '<span class="xh-block-tag">' + esc(state.sub) + "</span></div>";
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
      (store.py ? ' <span class="xh-py">' + esc(w.拼音) + "</span>" : "") +
      (store.en ? ' <span class="xh-en">' + esc(w.英文释义) + "</span>" : "");
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
  function noteRight(w) {
    if (state.firstTry) state.correct++;
    store.done[w.词语] = true;
    save();
    sfxOk();
    speak(w.词语);      // never the English (spec §3 of v1, unchanged)
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
      jetty() + '<span class="xh-block-tag">' + esc(state.sub) + " · 学词</span></div>" +
      '<div class="xh-board xh-stage xh-card">' +
      '<button class="xh-sprite big" id="xhSprite" title="点图听读音">' + img(w) + "</button>" +
      '<div class="xh-card-word"><b>' + esc(w.词语) + "</b>" +
      (store.py ? '<span class="xh-py">' + esc(w.拼音) + "</span>" : "") +
      (store.en ? '<span class="xh-en">' + esc(w.英文释义) + "</span>" : "") + "</div>" +
      '<button class="xh-btn xh-say" id="xhSay">🔊 再听一次' +
      (store.en ? ' <span class="xh-en">hear it again</span>' : "") + "</button>" +
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
      '<div class="xh-score">' + esc(state.sub) + ' · <b>' + state.seq.length + "</b> 个词语" +
      (store.en ? ' <span class="xh-en">words in this group</span>' : "") + "</div>" +
      '<div class="xh-sub">现在试试看，你记住了几个？' +
      (store.en ? '<span class="xh-en">Now see how many you remember.</span>' : "") + "</div>" +
      '<div class="xh-result-btns"><button class="xh-btn" id="xhTest">🖼️ 开始测验</button>' +
      '<button class="xh-btn ghost" id="xhAgain">再看一次</button>' +
      '<button class="xh-btn ghost" id="xhBack">换一组</button></div></div>';
    view().innerHTML = h;
    document.getElementById("xhTest").onclick = function () { startRound(state.sub, "pic"); };
    document.getElementById("xhAgain").onclick = function () { startRound(state.sub, "learn"); };
    document.getElementById("xhBack").onclick = renderMenu;
  }

  /* 4.1 看图识词 — picture → word */
  function renderPic() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var opts = shuffle(distractors(w).concat([w]));
    var h = bar() + '<div class="xh-board xh-stage">' +
      '<button class="xh-sprite" id="xhSprite" title="点图听读音">' + img(w) + "</button>" +
      '<div class="xh-hint" id="xhHint"></div><div class="xh-opts">';
    opts.forEach(function (o) {
      h += '<button class="xh-opt" data-w="' + esc(o.词语) + '"><span class="xh-word">' +
        esc(o.词语) + "</span>" + (store.py ? '<span class="xh-py">' + esc(o.拼音) + "</span>" : "") + "</button>";
    });
    view().innerHTML = h + "</div></div>";
    wireQuit();
    document.getElementById("xhSprite").onclick = function () { speak(w.词语); };
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
      (store.en ? '<span class="xh-en">tap to hear it again</span>' : "") + "</button>" +
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

  /* 4.4 拼音打字 — the only mode that trains production rather than recognition.
     Learners here cannot type Chinese (no IME, and using one already assumes
     pinyin), so pinyin itself is the input. */
  function tonelessPy(s) {
    // strip tone marks via NFD, fold ü/v to u, drop spaces — so "lao hu",
    // "laohu" and "lǎo hǔ" all match 老虎. Tones are taught later at 码头;
    // demanding them here would fail learners for something never taught.
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[üv]/gi, "u").replace(/\s+/g, "").toLowerCase();
  }
  function renderType() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    view().innerHTML = bar() + '<div class="xh-board xh-stage">' +
      '<button class="xh-sprite" id="xhSprite" title="点图听读音">' + img(w) + "</button>" +
      '<div class="xh-typerow">' +
      '<input class="xh-input" id="xhIn" type="text" autocomplete="off" autocapitalize="off" ' +
      'autocorrect="off" spellcheck="false" placeholder="用拼音打出来 · type the pinyin">' +
      '<button class="xh-btn" id="xhGo">检查</button></div>' +
      '<div class="xh-hint" id="xhHint"></div></div>';
    wireQuit();
    document.getElementById("xhSprite").onclick = function () { speak(w.词语); };
    var input = document.getElementById("xhIn");
    input.focus();
    var hint = document.getElementById("xhHint");

    function check() {
      var v = tonelessPy(input.value);
      if (!v) return;
      if (v !== tonelessPy(w.拼音)) {
        noteWrong(w, v);
        input.classList.add("wrong");
        setTimeout(function () { input.classList.remove("wrong"); }, 400);
        // show the pinyin after a miss, then let them retype it (spec §4.4)
        hint.className = "xh-hint show";
        hint.innerHTML = '再试一次 <span class="xh-py">' + esc(w.拼音) + "</span>";
        input.select();
        return;
      }
      input.disabled = true;
      document.getElementById("xhGo").disabled = true;
      document.getElementById("xhSprite").classList.add("pop");
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
      '<span class="xh-block-tag">' + esc(state.sub) + " · 连线 " + seq.length + "</span></div>" +
      '<div class="xh-board"><div class="xh-match" id="xhMatch">' +
      '<svg class="xh-links" id="xhLinks" aria-hidden="true"></svg><div class="xh-col">';
    left.forEach(function (w) {
      h += '<button class="xh-mitem xh-mpic" data-w="' + esc(w.词语) + '">' + img(w) + "</button>";
    });
    h += '</div><div class="xh-col">';
    right.forEach(function (w) {
      h += '<button class="xh-mitem xh-mword" data-w="' + esc(w.词语) + '"><b>' + esc(w.词语) + "</b>" +
        (store.py ? '<span class="xh-py">' + esc(w.拼音) + "</span>" : "") + "</button>";
    });
    h += '</div></div><div class="xh-matchfoot"><span class="xh-mhint" id="xhMHint"></span>' +
      '<button class="xh-btn" id="xhCheck" disabled>检查答案' +
      (store.en ? ' <span class="xh-en">check</span>' : "") + "</button></div></div>";
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
      if (side === "pic") speak(key);
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
        wrongLinks.forEach(function (L) {
          var w = seq.filter(function (x) { return x.词语 === L.pic; })[0];
          var s = stat(w);
          s.wrong++;
          s.confused[L.word] = (s.confused[L.word] || 0) + 1;
          if (state.missed.indexOf(w) < 0) state.missed.push(w);
        });
      }
      save();
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
      " 一次答对" + (store.en ? ' <span class="xh-en">correct first try</span>' : "") + "</div>";
    if (state.missed.length) {
      h += '<div class="xh-review"><div class="xh-review-h">再看看这几个' +
        (store.en ? ' <span class="xh-en">worth another look</span>' : "") + "</div><div class=\"xh-review-list\">";
      state.missed.forEach(function (w) {
        h += '<button class="xh-review-item" data-w="' + esc(w.词语) + '">' + img(w) +
          "<b>" + esc(w.词语) + "</b>" +
          (store.py ? '<span class="xh-py">' + esc(w.拼音) + "</span>" : "") +
          (store.en ? '<span class="xh-en">' + esc(w.英文释义) + "</span>" : "") + "</button>";
      });
      h += "</div></div>";
    }
    h += '<div class="xh-result-btns"><button class="xh-btn" id="xhAgain">再来一次</button>' +
      '<button class="xh-btn ghost" id="xhBack">换一组</button></div></div>';
    view().innerHTML = h;
    document.getElementById("xhAgain").onclick = function () { startRound(state.sub); };
    document.getElementById("xhBack").onclick = renderMenu;
    Array.prototype.forEach.call(view().querySelectorAll(".xh-review-item"), function (el) {
      el.onclick = function () { speak(el.getAttribute("data-w")); };
    });
  }

  /* ---------- boot ---------- */
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
