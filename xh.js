/* 学海启航 · 启航码头 — 看图识词 MVP
   Spec: SPEC_XH_看图识词_MVP.md (2026-08-15)

   DELIBERATELY STANDALONE. This never loads app.js/app.css and shares no state
   with g1/g2/g3/hcl. The reasons are in the spec: this tier inverts the
   platform's display defaults (拼音 and English default ON here, OFF there),
   it is outside the 灵露 / 历练值 / 海拔 economy entirely, and it is unproven —
   a mode that later gets pulled must be removable without touching anything the
   four streams depend on. The only thing copied across is the TTS stack, and
   that is copied rather than shared for the same reason.

   Storage is one localStorage key, ws_xh. No Firestore, no login, no leaderboard. */
(function () {
  "use strict";

  var STORE_KEY = "ws_xh";
  var ROUND_N = 10;

  /* the cache-bust version off our own <script src>, so a data or sprite update
     can never be served stale beside new code (same trick as app.js/arena.js) */
  var ASSET_V = (function () {
    try {
      var m = (document.currentScript && document.currentScript.src || "").match(/\?v=[^&]+/);
      return m ? m[0] : "";
    } catch (e) { return ""; }
  })();

  var WORDS = [];
  var BY_TEXT = {};
  var store = load();
  var state = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function view() { return document.getElementById("xhView"); }

  /* ---------- store ----------
     `done` is the Band 1 -> Band 2 promotion record AND the only progress this
     mode keeps: a word the student has answered correctly at least once. */
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { s = {}; }
    if (typeof s.py !== "boolean") s.py = true;   // both default ON: the point of
    if (typeof s.en !== "boolean") s.en = true;   // this tier (spec, display toggles)
    if (!s.done || typeof s.done !== "object") s.done = {};
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }

  /* ---------- TTS ----------
     Chinese only, and hanzi only — never pass 拼音 to the engine, it is read as
     toneless English. Voices are SCORED rather than taking the first zh-*: managed
     Chromebooks ship eSpeak-NG, which reports zh but speaks toneless Mandarin and
     is ordered first. cancel() then speak() in the same tick is silently dropped
     on ChromeOS and Samsung, hence the 50ms guard. Ported verbatim from app.js. */
  var _zhVoice = null, _warnedNoZh = false;
  function scoreVoice(v) {
    var lang = (v.lang || "").toLowerCase(), name = v.name || "";
    var isZhLang = lang.indexOf("zh") === 0 || lang.indexOf("cmn") === 0;
    var nameZh = /普通话|中文|chinese|mandarin/i.test(name);
    if (!isZhLang && !nameZh) return -1000;
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
    var vs = speechSynthesis.getVoices() || [], best = null, bestScore = -1000;
    for (var i = 0; i < vs.length; i++) {
      var sc = scoreVoice(vs[i]);
      if (sc <= -1000) continue;
      if (sc > bestScore) { bestScore = sc; best = vs[i]; }
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
      speechSynthesis.cancel();
      setTimeout(function () { speechSynthesis.speak(u); }, 50);
    };
    if (!(speechSynthesis.getVoices() || []).length) { setTimeout(go, 200); } else { go(); }
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "xh-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  /* ---------- distractor selection (spec §4) ----------
     Not "pick three at random". Band 1 draws from DIFFERENT 组别 so a first
     encounter is winnable from the picture alone and teaches the interface;
     Band 2 draws from the SAME 组别 so the student must actually know the word
     rather than the category. A word is in Band 2 once answered correctly. */
  var BLACKLIST = [
    ["忙", "紧张", "难过"],          // three near-identical yellow faces
    ["包子", "饺子"],                // both pale steamed dough on a plate
    ["椅子", "桌子"],                // both brown wooden furniture
    ["猪肉", "牛肉"],                // both slabs of red-pink meat
    ["饭", "米饭"],                  // near-identical bowls, near-identical meanings
    ["早上", "中午", "下午", "晚上", "太阳", "月亮"],   // all sun-or-sky images
    ["车", "德士"],                  // taxi differs only by its roof sign
    ["哥哥", "弟弟"],                // same figure at different ages
    ["姐姐", "妹妹"]
  ];
  function blacklistMates(text) {
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
  function distractors(w) {
    var band2 = !!store.done[w.词语];
    function pool(sameGroup) {
      return WORDS.filter(function (o) {
        if (o.词语 === w.词语) return false;
        return sameGroup ? o.组别 === w.组别 : o.组别 !== w.组别;
      });
    }
    /* The blacklist is a rule about the OPTION SET, not about the answer: 早上
       against 中午 is just as unanswerable from the art when neither is the
       correct one. So candidates are admitted one at a time and rejected if
       they collide with anything already in the set, the answer included.
       (Filtering only the answer's mates up front left ~5% of sets holding two
       confusable distractors — measured, not assumed.) */
    var picked = [];
    var banned = blacklistMates(w.词语);
    function admit(list) {
      for (var i = 0; i < list.length && picked.length < 3; i++) {
        var o = list[i];
        if (banned[o.词语] || picked.indexOf(o) >= 0) continue;
        picked.push(o);
        var mates = blacklistMates(o.词语);
        for (var t in mates) banned[t] = true;
      }
    }
    admit(shuffle(pool(band2).slice()));
    // a small 组别 cannot fill a Band 2 set on its own; top up from outside it
    if (picked.length < 3) admit(shuffle(pool(!band2).slice()));
    return picked;
  }

  /* ---------- round building ----------
     Spec §5 asks for ten questions from one 单元板块 so the round has a theme.
     Six of the seventeen 板块 hold fewer than ten words (买东西 and 求助 hold
     one), so a strict reading would produce one-question rounds. The 板块 is
     still what the student picks and what the round is named after; a short one
     is topped up from its own 单元, which is the nearest thing thematically. */
  function buildRound(block) {
    var inBlock = WORDS.filter(function (w) { return w.单元板块 === block.板块 && w.单元 === block.单元; });
    var seq = shuffle(inBlock.slice());
    if (seq.length < ROUND_N) {
      var rest = shuffle(WORDS.filter(function (w) {
        return w.单元 === block.单元 && seq.indexOf(w) < 0;
      }));
      seq = seq.concat(rest);
    }
    return seq.slice(0, Math.min(ROUND_N, seq.length));
  }

  function blocks() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) {
      var k = w.单元 + "|" + w.单元板块;
      if (!seen[k]) {
        seen[k] = { 单元: w.单元, 板块: w.单元板块, 主题: w.单元主题, n: 0, done: 0 };
        out.push(seen[k]);
      }
      seen[k].n++;
      if (store.done[w.词语]) seen[k].done++;
    });
    return out;
  }

  /* ---------- screens ---------- */
  function pyHtml(w) { return store.py ? '<span class="xh-py">' + esc(w.拼音) + "</span>" : ""; }

  function renderMenu() {
    state = null;
    var all = WORDS.length, done = WORDS.filter(function (w) { return store.done[w.词语]; }).length;
    var h = '<div class="xh-head">' +
      '<div class="xh-berth-title">🖼️ 看图识词 <span class="xh-en">Picture &amp; word</span></div>' +
      '<div class="xh-sub">看图，选出正确的词语。' +
      (store.en ? '<span class="xh-en">Look at the picture, choose the word.</span>' : "") + "</div>" +
      '<div class="xh-progress"><b>' + done + "</b> / " + all + " 个词语已学过" +
      (store.en ? ' <span class="xh-en">words learned</span>' : "") + "</div></div>";

    h += '<div class="xh-toggles">' +
      '<button class="xh-tg' + (store.py ? " on" : "") + '" id="tgPy">拼音 pīn yīn</button>' +
      '<button class="xh-tg' + (store.en ? " on" : "") + '" id="tgEn">English</button></div>';

    var byUnit = {};
    blocks().forEach(function (b) { (byUnit[b.单元] = byUnit[b.单元] || []).push(b); });
    Object.keys(byUnit).forEach(function (u) {
      h += '<div class="xh-unit"><div class="xh-unit-h">' + esc(u) +
        ' <span class="xh-theme">' + esc(byUnit[u][0].主题 || "") + "</span></div><div class=\"xh-blocks\">";
      byUnit[u].forEach(function (b) {
        h += '<button class="xh-block" data-u="' + esc(b.单元) + '" data-b="' + esc(b.板块) + '">' +
          "<b>" + esc(b.板块) + "</b><span>" + b.done + " / " + b.n + "</span></button>";
      });
      h += "</div></div>";
    });
    view().innerHTML = h;

    document.getElementById("tgPy").onclick = function () { store.py = !store.py; save(); renderMenu(); };
    document.getElementById("tgEn").onclick = function () { store.en = !store.en; save(); renderMenu(); };
    Array.prototype.forEach.call(view().querySelectorAll(".xh-block"), function (el) {
      el.onclick = function () {
        startRound({ 单元: el.getAttribute("data-u"), 板块: el.getAttribute("data-b") });
      };
    });
  }

  function startRound(block) {
    var seq = buildRound(block);
    if (!seq.length) return;
    state = { block: block, seq: seq, i: 0, correct: 0, missed: [], firstTry: true };
    /* warm the whole round's sprites up front. Each question swaps img.src, and
       an undecoded sprite shows as an empty frame for a beat — the picture IS
       the question here, so a flicker is not cosmetic. ~10 KB each, ten of them. */
    seq.forEach(function (w) { (new Image()).src = "art/xh/" + w.图档 + ASSET_V; });
    renderQuestion();
  }

  function renderQuestion() {
    var w = state.seq[state.i];
    var opts = shuffle(distractors(w).concat([w]));
    state.firstTry = true;

    var h = '<div class="xh-round-bar">' +
      '<button class="xh-quit" id="xhQuit">‹ 返回</button>' +
      '<span class="xh-count">' + (state.i + 1) + " / " + state.seq.length + "</span>" +
      '<span class="xh-block-tag">' + esc(state.block.板块) + "</span></div>";

    h += '<div class="xh-stage">' +
      '<button class="xh-sprite" id="xhSprite" title="点图听读音">' +
      '<img src="art/xh/' + esc(w.图档) + ASSET_V + '" alt=""></button>' +
      '<div class="xh-hint" id="xhHint"></div>' +
      '<div class="xh-opts">';
    opts.forEach(function (o, i) {
      h += '<button class="xh-opt" data-i="' + i + '" data-w="' + esc(o.词语) + '">' +
        '<span class="xh-word">' + esc(o.词语) + "</span>" + pyHtml(o) + "</button>";
    });
    h += "</div></div>";
    view().innerHTML = h;

    document.getElementById("xhQuit").onclick = renderMenu;
    // the sprite is tappable to hear the word again: the learner cannot decode
    // the characters, so the sound is half the content (spec §3)
    document.getElementById("xhSprite").onclick = function () { speak(w.词语); };

    Array.prototype.forEach.call(view().querySelectorAll(".xh-opt"), function (el) {
      el.onclick = function () { answer(el, w); };
    });
  }

  function answer(el, w) {
    if (el.classList.contains("wrong") || el.classList.contains("right")) return;
    var chosen = el.getAttribute("data-w");
    if (chosen !== w.词语) {
      /* Wrong: mark the option, keep the question on screen, let them try again.
         No penalty, no life, no score deduction — this is first contact with a
         writing system they cannot read, so a wrong tap must cost nothing. */
      el.classList.add("wrong");
      el.disabled = true;
      if (state.firstTry) {
        state.firstTry = false;
        if (state.missed.indexOf(w) < 0) state.missed.push(w);
      }
      return;
    }
    el.classList.add("right");
    Array.prototype.forEach.call(view().querySelectorAll(".xh-opt"), function (b) { b.disabled = true; });
    speak(w.词语);                                   // never the English (spec §3)
    if (state.firstTry) state.correct++;
    store.done[w.词语] = true;                       // promotes this word to Band 2
    save();

    var hint = document.getElementById("xhHint");
    hint.className = "xh-hint show";
    hint.innerHTML = '<b>' + esc(w.词语) + "</b>" +
      (store.py ? ' <span class="xh-py">' + esc(w.拼音) + "</span>" : "") +
      (store.en ? ' <span class="xh-en">' + esc(w.英文释义) + "</span>" : "");

    setTimeout(function () {
      state.i++;
      if (state.i >= state.seq.length) renderResult(); else renderQuestion();
    }, 1150);
  }

  function renderResult() {
    var h = '<div class="xh-result"><div class="xh-berth-title">🎉 这一轮完成了</div>' +
      '<div class="xh-score"><b>' + state.correct + "</b> / " + state.seq.length +
      " 一次答对" + (store.en ? ' <span class="xh-en">correct first try</span>' : "") + "</div>";
    if (state.missed.length) {
      h += '<div class="xh-review"><div class="xh-review-h">再看看这几个' +
        (store.en ? ' <span class="xh-en">worth another look</span>' : "") + "</div><div class=\"xh-review-list\">";
      state.missed.forEach(function (w) {
        h += '<button class="xh-review-item" data-w="' + esc(w.词语) + '">' +
          '<img src="art/xh/' + esc(w.图档) + ASSET_V + '" alt="">' +
          "<b>" + esc(w.词语) + "</b>" + pyHtml(w) +
          (store.en ? '<span class="xh-en">' + esc(w.英文释义) + "</span>" : "") + "</button>";
      });
      h += "</div></div>";
    }
    h += '<div class="xh-result-btns">' +
      '<button class="xh-btn" id="xhAgain">再来一次</button>' +
      '<button class="xh-btn ghost" id="xhBack">选别的板块</button></div></div>';
    view().innerHTML = h;

    document.getElementById("xhAgain").onclick = function () { startRound(state.block); };
    document.getElementById("xhBack").onclick = renderMenu;
    Array.prototype.forEach.call(view().querySelectorAll(".xh-review-item"), function (el) {
      el.onclick = function () { speak(el.getAttribute("data-w")); };
    });
  }

  /* ---------- boot ---------- */
  fetch("data/xh_mvp.json" + ASSET_V)
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      WORDS = rows;
      WORDS.forEach(function (w) { BY_TEXT[w.词语] = w; });
      renderMenu();
    })
    .catch(function () {
      view().innerHTML = '<div class="xh-err">词语资料加载失败，请检查网络后重新整理页面。<br>' +
        '<span class="xh-en">Could not load the word list. Please refresh.</span></div>';
    });
})();
