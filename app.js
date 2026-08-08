/* Word Summit · 词山学海 · shared app engine (v0.2 test build, no login)
   Landscape-first. Progress, mastery, badges and game high scores live in
   localStorage only (device-local, nothing leaves the device). Firebase later.
   TTS is Chinese-only by policy (LC app). 课文例句 removed pending CPDD
   written permission; 填空句 are self-authored and remain. */
(function () {
  "use strict";

  var STREAM = window.STREAM || "g3";
  var APP_META = {
    g1: { zh: "词星大冒险", sub: "G1 基础华文" },
    g2: { zh: "词将竞技场", sub: "G2 普通学术华文" },
    g3: { zh: "词王淬炼坊", sub: "G3 快捷华文" },
    hcl: { zh: "词圣鸿文苑", sub: "高级华文" }
  };
  var META = APP_META[STREAM];
  var QUIZ_LEN = 10;
  var BADGE_IMG = {
    "生活空间": "badge_shkj.png",
    "核心": "badge_hx.png",
    "巩固": "badge_gg.png",
    "进阶": "badge_jj.png",
    "文化站": "badge_whz.png"
  };

  var DATA = null;
  var WORDS = [];
  var UNIT_LIST = [];   // [{key, level, unit, count}]
  var COMP_LIST = [];   // [{key, level, unit, component, ids:[]}]
  var LEVELS = [];      // ordered level names
  var scope = null;
  var app = document.getElementById("app");

  /* ---------- tiny helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function unitKey(w) { return w.level + "·" + w.unit; }
  function compKey(w) { return w.level + "·" + w.unit + "·" + w.component; }
  function view() { return document.getElementById("view"); }

  /* ==================================================================
     TTS — Chinese only. Lessons from VocabKing field testing:
     1. Never feed pinyin strings to the engine (Android reads them as
        toneless English). Pass hanzi; fix polyphonic words via POLY_MAP.
     2. ChromeOS two-pass voice lookup: lang match, then voice-NAME
        keywords, because managed Chromebooks misreport lang fields.
     3. ChromeOS drops utterances when cancel() and speak() run in the
        same tick — 50ms setTimeout guard.
     4. voiceschanged listener + 200ms retry (voices load async).
     5. Loud failure: one-time toast when no Chinese voice exists.
     ================================================================== */
  var POLY_MAP = [
    ["行为", "xíng wéi"], ["行驶", "xíng shǐ"], ["行当", "háng dang"],
    ["银行", "yín háng"], ["行业", "háng yè"], ["自行车", "zì xíng chē"],
    ["便宜", "pián yi"], ["方便", "fāng biàn"],
    ["音乐", "yīn yuè"], ["快乐", "kuài lè"],
    ["觉得", "jué de"], ["睡觉", "shuì jiào"],
    ["重要", "zhòng yào"], ["重复", "chóng fù"], ["重新", "chóng xīn"]
  ];
  function applyPoly(t) {
    POLY_MAP.forEach(function (p) { t = t.split(p[0]).join(p[1]); });
    return t;
  }
  var _zhVoice = null, _warnedNoZh = false;
  function loadVoiceCache() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices() || [];
    // Pass 1: lang metadata
    for (var i = 0; i < vs.length; i++) {
      if (vs[i].lang && vs[i].lang.toLowerCase().indexOf("zh") === 0) { _zhVoice = vs[i]; return; }
    }
    // Pass 2: voice name keywords (ChromeOS managed devices)
    var kws = ["普通话", "中文", "Chinese", "Mandarin"];
    for (var j = 0; j < vs.length; j++) {
      for (var k = 0; k < kws.length; k++) {
        if ((vs[j].name || "").indexOf(kws[k]) !== -1) { _zhVoice = vs[j]; return; }
      }
    }
    _zhVoice = null;
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
      var u = new SpeechSynthesisUtterance(applyPoly(String(text)));
      u.lang = (_zhVoice && _zhVoice.lang) || "zh-CN";
      if (_zhVoice) u.voice = _zhVoice;
      u.rate = 0.9;
      speechSynthesis.cancel();
      setTimeout(function () { speechSynthesis.speak(u); }, 50); // ChromeOS guard
    };
    if (!(speechSynthesis.getVoices() || []).length) { setTimeout(go, 200); } else { go(); }
  }
  // Cloze sentence: blank becomes a pause, never the answer.
  function speakCloze(sentence) {
    speak(String(sentence).replace(/_{2,}|＿+/g, "，"));
  }

  /* ---------- sound effects (Web Audio, synthesized, no files) ---------- */
  var _actx = null;
  function actx() {
    if (!_actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _actx = new AC();
    }
    if (_actx && _actx.state === "suspended") _actx.resume();
    return _actx;
  }
  function tone(freq, start, dur, type, gain) {
    var c = actx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(gain || 0.12, c.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  }
  function sfxOk() { tone(660, 0, 0.12); tone(880, 0.1, 0.18); }
  function sfxBad() { tone(180, 0, 0.22, "square", 0.07); }
  function sfxBadge() { tone(523, 0, 0.14); tone(659, 0.12, 0.14); tone(784, 0.24, 0.14); tone(1047, 0.36, 0.3); }
  function sfxLife() { tone(240, 0, 0.14, "square", 0.08); tone(180, 0.12, 0.2, "square", 0.08); }
  /* iOS/iPadOS unlock: WebAudio + speech must be primed inside a user gesture */
  document.addEventListener("pointerdown", function () {
    actx();
    try {
      if (window.speechSynthesis && !speechSynthesis.speaking) {
        var u = new SpeechSynthesisUtterance(" ");
        u.volume = 0; speechSynthesis.speak(u);
      }
    } catch (e) {}
  }, { once: true });

  /* ---------- local store (device only) ---------- */
  var STORE_KEY = "ws2_" + STREAM;
  var store = loadStore();
  function loadStore() {
    var s;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { s = {}; }
    s.mastered = s.mastered || {};     // wordId -> 1
    s.stats = s.stats || {};           // mode -> {a,c}
    s.badges = s.badges || {};         // badgeKey -> 1
    s.best = s.best || {};             // rain: score, handle: streak
    s.accOpen = s.accOpen || {};       // scope accordion: level -> bool
    s.sprintSecs = s.sprintSecs || 90; // 攀山竞速 timer preference
    s.diff = s.diff || "3";            // cloze difficulty: 2|3|4|type
    s.bestStreak = s.bestStreak || 0;
    return s;
  }
  function saveStore() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
  function bump(mode, correct) {
    if (!store.stats[mode]) store.stats[mode] = { a: 0, c: 0 };
    store.stats[mode].a += 1; if (correct) store.stats[mode].c += 1;
    saveStore();
  }
  function totals() {
    var a = 0, c = 0;
    Object.keys(store.stats).forEach(function (k) { a += store.stats[k].a; c += store.stats[k].c; });
    return { a: a, c: c };
  }

  /* ---------- toast ---------- */
  var _toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div"); t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ==================================================================
     MASTERY + BADGES
     Gate: a correct answer in 填空挑战 at ANY difficulty tier marks the
     word mastered (beta decision: generous and motivating).
     Tiers: T1 板块章 (component) → T2 单元章 (unit) → T3 年级章 (level)
            → T4 顶级词王 (all).
     ================================================================== */
  function isCompDone(c) {
    for (var i = 0; i < c.ids.length; i++) if (!store.mastered[c.ids[i]]) return false;
    return true;
  }
  function badgeKeyC(c) { return "c·" + c.key; }
  function badgeKeyU(level, unit) { return "u·" + level + "·" + unit; }
  function badgeKeyL(level) { return "l·" + level; }
  function checkBadges(silent) {
    var earned = [];
    COMP_LIST.forEach(function (c) {
      if (!store.badges[badgeKeyC(c)] && isCompDone(c)) {
        store.badges[badgeKeyC(c)] = 1;
        earned.push({ tier: 1, level: c.level, unit: c.unit, component: c.component });
      }
    });
    UNIT_LIST.forEach(function (u) {
      var comps = COMP_LIST.filter(function (c) { return c.level === u.level && c.unit === u.unit; });
      var all = comps.length && comps.every(function (c) { return store.badges[badgeKeyC(c)]; });
      if (all && !store.badges[badgeKeyU(u.level, u.unit)]) {
        store.badges[badgeKeyU(u.level, u.unit)] = 1;
        earned.push({ tier: 2, level: u.level, unit: u.unit });
      }
    });
    LEVELS.forEach(function (lv) {
      var units = UNIT_LIST.filter(function (u) { return u.level === lv; });
      var all = units.length && units.every(function (u) { return store.badges[badgeKeyU(u.level, u.unit)]; });
      if (all && !store.badges[badgeKeyL(lv)]) {
        store.badges[badgeKeyL(lv)] = 1;
        earned.push({ tier: 3, level: lv });
      }
    });
    var allLv = LEVELS.length && LEVELS.every(function (lv) { return store.badges[badgeKeyL(lv)]; });
    if (allLv && !store.badges["t4"]) {
      store.badges["t4"] = 1;
      earned.push({ tier: 4 });
    }
    if (earned.length) { saveStore(); if (!silent) queueCelebrations(earned); }
  }
  function markMastered(w) {
    if (store.mastered[w.id]) { saveStore(); return; }
    store.mastered[w.id] = 1;
    saveStore();
    checkBadges();
  }

  /* ---------- celebrations (T1–T4, literary quotes) ---------- */
  var CEL_T1 = [
    { q: "千里之行，始于足下。", s: "《荀子》" },
    { q: "不积跬步，无以至千里。", s: "《荀子·劝学》" },
    { q: "滴水穿石，非一日之功。", s: "民间俗语" },
    { q: "一分耕耘，一分收获。", s: "民间俗语" },
    { q: "学如逆水行舟，不进则退。", s: "民间俗语" }
  ];
  var CEL_T2 = [
    { q: "宝剑锋从磨砺出，梅花香自苦寒来。", s: "民间谚语" },
    { q: "书山有路勤为径，学海无涯苦作舟。", s: "韩愈（传）" },
    { q: "业精于勤，荒于嬉；行成于思，毁于随。", s: "韩愈《进学解》" },
    { q: "天才是百分之一的灵感加上百分之九十九的汗水。", s: "爱迪生 Thomas Edison" },
    { q: "机会偏爱有准备的头脑。", s: "路易·巴斯德 Louis Pasteur" }
  ];
  var CEL_T3 = {
    "中一": { q: "知之者不如好之者，好之者不如乐之者。", s: "《论语》" },
    "中二": { q: "故天将降大任于斯人也，必先苦其心志，劳其筋骨。", s: "《孟子》" },
    "中三": { q: "业精于勤，荒于嬉；行成于思，毁于随。", s: "韩愈" },
    "中四": { q: "学而不思则罔，思而不学则殆。", s: "《论语》" }
  };
  var CEL_T4 = { q: "锲而不舍，金石可镂。", s: "《荀子·劝学》" };
  var _celQueue = [], _t1i = Math.floor(Math.random() * CEL_T1.length), _t2i = Math.floor(Math.random() * CEL_T2.length);
  var _deferCel = false, _pendingCel = [];
  function flushCelebrations() {
    _deferCel = false;
    if (_pendingCel.length) { var p = _pendingCel; _pendingCel = []; queueCelebrations(p); }
  }
  function queueCelebrations(items) {
    if (_deferCel) { _pendingCel = _pendingCel.concat(items); return; }
    var wasEmpty = _celQueue.length === 0;
    _celQueue = _celQueue.concat(items);
    if (wasEmpty) showNextCel();
  }
  function showNextCel() {
    if (!_celQueue.length) return;
    var it = _celQueue[0];
    var ov = document.getElementById("cel-overlay");
    if (!ov) {
      ov = document.createElement("div"); ov.id = "cel-overlay"; ov.className = "cel-overlay";
      document.body.appendChild(ov);
    }
    var badgeHtml, cls, title, sub, q;
    if (it.tier === 1) {
      cls = "t1"; title = "板块章解锁！";
      sub = it.level + " · " + it.unit + " · " + it.component;
      badgeHtml = '<img class="cel-img" src="' + (BADGE_IMG[it.component] || "badge_hx.png") + '" alt="">';
      q = CEL_T1[_t1i++ % CEL_T1.length];
    } else if (it.tier === 2) {
      cls = "t2"; title = "单元章达成！";
      sub = it.level + " · " + it.unit + " · 全部板块完成";
      badgeHtml = '<div class="cel-emoji">✨</div>';
      q = CEL_T2[_t2i++ % CEL_T2.length];
    } else if (it.tier === 3) {
      cls = "t3"; title = it.level + " 登顶！";
      sub = "整个年级的词语已全部掌握";
      badgeHtml = '<div class="cel-emoji">🏅</div>';
      q = CEL_T3[it.level] || CEL_T2[0];
    } else {
      cls = "t4"; title = "顶级词王！";
      sub = META.zh + " 全部词语登顶";
      badgeHtml = '<div class="cel-emoji">👑</div>';
      q = CEL_T4;
    }
    ov.innerHTML =
      '<div class="cel-card ' + cls + '"><div class="cel-band"></div><div class="cel-body">' +
      badgeHtml +
      '<div class="cel-title">' + esc(title) + '</div>' +
      '<div class="cel-sub">' + esc(sub) + '</div>' +
      '<div class="cel-quote">"' + esc(q.q) + '"</div>' +
      '<div class="cel-src">—— ' + esc(q.s) + '</div>' +
      '<button class="cel-btn" id="cel-next">继续加油！</button></div></div>';
    ov.style.display = "flex";
    sfxBadge();
    document.getElementById("cel-next").onclick = function () {
      _celQueue.shift();
      if (_celQueue.length) { showNextCel(); }
      else { ov.style.display = "none"; }
    };
  }

  /* ---------- scoping ---------- */
  function scopedWords() {
    return WORDS.filter(function (w) { return scope.has(unitKey(w)); });
  }
  function _bigrams(s) {
    var t = String(s || "").replace(/[，。、！？；：""''（）\s]/g, "");
    var set = {};
    for (var i = 0; i < t.length - 1; i++) set[t.substr(i, 2)] = 1;
    return set;
  }
  function _defSim(a, b) {
    var A = _bigrams(a.zh), B = _bigrams(b.zh);
    var ka = Object.keys(A), inter = 0;
    for (var i = 0; i < ka.length; i++) if (B[ka[i]]) inter++;
    var union = ka.length + Object.keys(B).length - inter;
    return union ? inter / union : 0;
  }
  /* Manually curated synonym groups: words in the same group never appear
     as each other's distractors, because both would be defensible answers.
     Add new groups here as teachers spot them (word text, works across
     levels; missing words are simply ignored). */
  var SYNONYM_GROUPS = [
    ["只要功夫深，铁棒磨成针", "世上无难事，只怕有心人",
     "不经一番寒彻骨，怎得梅花扑鼻香", "有志者，事竟成"]
  ];
  var _synMap = {};
  SYNONYM_GROUPS.forEach(function (g, gi) { g.forEach(function (w) { _synMap[w] = gi; }); });
  function _tooSimilar(target, cand) {
    // Synonym guard 1: curated groups (semantic synonyms worded differently).
    if (_synMap[target.w] !== undefined && _synMap[target.w] === _synMap[cand.w]) return true;
    // Synonym guard 2: definitions that overlap heavily (paraphrase pairs
    // like 除夕×大年三十, 褐色×棕) — both would be defensible answers.
    return _defSim(target, cand) > 0.25;
  }
  function distractorsFor(target, pool, n) {
    var same = pool.filter(function (w) {
      return w.id !== target.id && w.w !== target.w && w.pos === target.pos && !_tooSimilar(target, w);
    });
    var any = pool.filter(function (w) { return w.id !== target.id && w.w !== target.w && !_tooSimilar(target, w); });
    var picked = shuffle(same).slice(0, n);
    var i = 0, extra = shuffle(any);
    while (picked.length < n && i < extra.length) {
      var cand = extra[i++];
      if (picked.indexOf(cand) === -1 && cand.id !== target.id) picked.push(cand);
    }
    return picked;
  }

  /* ---------- shell ---------- */
  function setTopbar(backTo, right) {
    var tb = document.querySelector(".topbar");
    tb.innerHTML =
      '<button class="back" id="tbBack">‹</button>' +
      '<div><div class="tb-name">' + META.zh + '</div>' +
      '<div class="tb-sub">词山学海 Vocab Summit · ' + META.sub + '</div></div>' +
      '<div class="tb-right">' + (right || "") + '</div>';
    document.getElementById("tbBack").onclick = function () {
      if (backTo === "landing") { location.href = "index.html"; } else { renderHome(); }
    };
  }

  function miniHorizon() {
    return '<div class="mini-horizon horizon">' +
      '<div class="sun"></div>' +
      '<svg viewBox="0 0 400 120" preserveAspectRatio="none" style="height:62%">' +
      '<defs><linearGradient id="mh1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC0A6"/><stop offset="1" stop-color="#6FA07E"/></linearGradient>' +
      '<linearGradient id="mh2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79AB89"/><stop offset="1" stop-color="#4F8560"/></linearGradient>' +
      '<linearGradient id="mh3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#57906B"/><stop offset="1" stop-color="#2F5A3F"/></linearGradient></defs>' +
      '<polygon points="0,120 0,74 70,58 160,76 260,52 330,70 400,50 400,120" fill="#A9C9B1" opacity=".7"/>' +
      '<polygon points="150,120 288,32 430,120" fill="url(#mh1)"/><polygon points="288,32 288,120 430,120" fill="#5E8F70" opacity=".45"/>' +
      '<polygon points="-40,120 116,24 250,120" fill="url(#mh2)"/><polygon points="116,24 116,120 250,120" fill="#3F704F" opacity=".5"/>' +
      '<polygon points="55,120 205,8 360,120" fill="url(#mh3)"/><polygon points="205,8 205,120 360,120" fill="#274A34" opacity=".55"/>' +
      '</svg>' +
      '<svg viewBox="0 0 400 34" preserveAspectRatio="none" style="height:19%">' +
      '<path d="M0,12 Q50,3 100,12 T200,12 T300,12 T400,12 L400,34 L0,34 Z" fill="#2E6391"/>' +
      '<path d="M0,23 Q50,15 100,23 T200,23 T300,23 T400,23 L400,34 L0,34 Z" fill="#1F4A70"/></svg>' +
      '<div class="app-zh">' + META.zh + '</div></div>';
  }

  /* ---------- home ---------- */
  function renderHome() {
    setTopbar("landing", scopedWords().length + " 词在范围内");
    var t = totals();
    var mastered = Object.keys(store.mastered).length;
    var badgeCount = Object.keys(store.badges).length;
    var badgeTotal = COMP_LIST.length + UNIT_LIST.length + LEVELS.length + 1;

    var html = '<div class="home-grid"><div class="home-left">' + miniHorizon();

    html += '<div class="section-label">复习范围 · 可多选</div><div class="card" id="scopeCard">' +
      '<div class="scope-top">' +
      '<button class="unit" id="selAll">全选</button>' +
      '<button class="unit" id="selNone">清空</button>' +
      '<span class="scope-sum" id="scopeSum"></span></div>';
    var byLevel = {};
    UNIT_LIST.forEach(function (u) { (byLevel[u.level] = byLevel[u.level] || []).push(u); });
    Object.keys(byLevel).forEach(function (lv, li) {
      var open = (store.accOpen[lv] !== undefined) ? store.accOpen[lv] : (li === 0);
      html += '<button class="scope-acc' + (open ? " open" : "") + '" data-lv="' + esc(lv) + '">' +
        esc(lv) + '<span class="cnt" data-cnt="' + esc(lv) + '"></span><span class="chev">›</span></button>' +
        '<div class="units' + (open ? "" : " collapsed") + '" data-lvbody="' + esc(lv) + '">';
      byLevel[lv].forEach(function (u) {
        var on = scope.has(u.key) ? " on" : "";
        html += '<button class="unit' + on + '" data-k="' + esc(u.key) + '">' + esc(u.unit) + ' · ' + u.count + '词</button>';
      });
      html += '</div>';
    });
    html += '</div>';

    html += '</div><div class="home-right">' +
      '<div class="section-label">今日路线 · 选择你的营地</div><div class="camps">' +
      camp("flash", "📖", "词语闪卡", "看词认义，点读发音") +
      camp("cloze", "✍️", "填空挑战", "读句子，填出词语 · 可选难度") +
      camp("zhmcq", "🔎", "华文解释", "看释义，选出词语") +
      camp("enmcq", "🌐", "英文翻译", "看英译，选出词语") + '</div>';

    html += '<div class="section-label" style="margin-top:18px">词语游乐场</div><div class="camps">' +
      camp("rain", "🌧️", "词雨", "词语随雨落下，打字接住，收集雨水") +
      camp("sprint", "⛰️", "攀山竞速", "90 秒登山冲刺 · 答对就攀升") +
      (STREAM === "g2" ? camp("assemble", "🧩", "组词挑战", "看释义点字，拼出词语") : "") +
      (STREAM !== "g1" ? camp("handle", "🀄", "词语汉兜", "四字词语猜猜看 · 六次机会") : "") + '</div>';

    html += '<button class="badge-strip" id="badgeStrip">';
    var shown = 0;
    COMP_LIST.forEach(function (c) {
      if (shown >= 4) return;
      var got = store.badges[badgeKeyC(c)];
      html += '<span class="badge-chip' + (got ? "" : " locked") + '"><img src="' +
        (BADGE_IMG[c.component] || "badge_hx.png") + '" alt=""></span>';
      shown++;
    });
    html += '<span class="badge-note">成就徽章 · ' + badgeCount + '/' + badgeTotal +
      '<br><span style="font-size:11px">查看成就墙 ›</span></span></button>';

    html += '<div class="harbour">' +
      '<div id="masteryInfo" style="cursor:pointer"><b>' + mastered + '</b><span>已掌握词语 ⓘ</span></div>' +
      '<div><b>' + t.c + '</b><span>累计答对</span></div>' +
      '<div><b>' + (t.a ? Math.round(100 * t.c / t.a) + "%" : "–") + '</b><span>正确率</span></div>' +
      '<div><b>🔥 ' + store.bestStreak + '</b><span>最高连对</span></div></div>' +
      '<div class="home-foot">测试版：进度仅保存在此设备。登入与排行榜稍后加入。<br>' +
      '<button class="code-link" id="pcodeBtn">💾 进度码 · 备份与恢复</button></div></div></div>';

    view().innerHTML = html;

    Array.prototype.forEach.call(view().querySelectorAll(".unit[data-k]"), function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-k");
        if (scope.has(k)) scope.delete(k); else scope.add(k);
        btn.classList.toggle("on");
        updateScopeSum();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".scope-acc"), function (b) {
      b.onclick = function () {
        var lv = b.getAttribute("data-lv");
        var body = view().querySelector('.units[data-lvbody="' + lv + '"]');
        var nowOpen = !body.classList.toggle("collapsed");
        b.classList.toggle("open", nowOpen);
        store.accOpen[lv] = nowOpen; saveStore();
      };
    });
    document.getElementById("selAll").onclick = function () {
      UNIT_LIST.forEach(function (u) { scope.add(u.key); }); renderHome();
    };
    document.getElementById("selNone").onclick = function () { scope.clear(); renderHome(); };
    document.getElementById("badgeStrip").onclick = renderAchievements;
    document.getElementById("masteryInfo").onclick = showMasteryInfo;
    document.getElementById("pcodeBtn").onclick = showProgressCode;
    Array.prototype.forEach.call(view().querySelectorAll(".camp[data-mode]"), function (btn) {
      btn.onclick = function () {
        if (!scopedWords().length) { alert("请先选择至少一个单元。"); return; }
        var mode = btn.getAttribute("data-mode");
        if (mode === "rain") return renderRainConfig();
        if (mode === "sprint") return renderSprintConfig();
        if (mode === "assemble") return startAssemble();
        if (mode === "handle") return startHandle();
        startMode(mode);
      };
    });
    updateScopeSum();

    function camp(mode, icon, name, desc) {
      return '<button class="camp" data-mode="' + mode + '"><span class="flag">' + icon + '</span>' +
        '<div><b>' + name + '</b><span>' + desc + '</span></div><span class="go">出发 ›</span></button>';
    }
    function updateScopeSum() {
      var n = scopedWords().length;
      document.getElementById("scopeSum").textContent = "已选 " + scope.size + " 个单元 · 共 " + n + " 词";
      document.querySelector(".tb-right").textContent = n + " 词在范围内";
      Object.keys(byLevel).forEach(function (lv) {
        var el = view().querySelector('.cnt[data-cnt="' + lv + '"]');
        if (!el) return;
        var sel = byLevel[lv].filter(function (u) { return scope.has(u.key); }).length;
        el.textContent = sel ? "· 已选 " + sel + "/" + byLevel[lv].length : "· " + byLevel[lv].length + " 个单元";
      });
    }
  }

  /* ---------- achievements wall ---------- */
  function renderAchievements() {
    setTopbar("home", "");
    var html = '<div class="ach-wrap"><div class="section-label">成就墙 · 板块章 → 单元章 → 年级章 → 顶级词王</div>';
    LEVELS.forEach(function (lv) {
      var lvDone = store.badges[badgeKeyL(lv)];
      html += '<div class="ach-level"><div class="ach-level-head">' +
        '<b>' + esc(lv) + '</b>' + (lvDone ? '<span class="ach-seal">🏅 年级登顶</span>' : "") + '</div>';
      UNIT_LIST.filter(function (u) { return u.level === lv; }).forEach(function (u) {
        var uDone = store.badges[badgeKeyU(u.level, u.unit)];
        html += '<div class="ach-unit card"><div class="ach-unit-name">' + esc(u.unit) +
          (uDone ? '<span class="ach-seal">✨ 全部完成</span>' : "") + '</div><div class="ach-badges">';
        COMP_LIST.filter(function (c) { return c.level === lv && c.unit === u.unit; }).forEach(function (c) {
          var got = store.badges[badgeKeyC(c)];
          var done = c.ids.filter(function (id) { return store.mastered[id]; }).length;
          html += '<div class="ach-badge' + (got ? "" : " locked") + '">' +
            '<img src="' + (BADGE_IMG[c.component] || "badge_hx.png") + '" alt="">' +
            '<span class="ach-badge-name">' + esc(c.component) + '</span>' +
            '<span class="ach-badge-count">' + done + '/' + c.ids.length + '</span></div>';
        });
        html += '</div></div>';
      });
      html += '</div>';
    });
    html += '<div class="ach-t4' + (store.badges["t4"] ? " got" : "") + '">👑 顶级词王 · ' +
      (store.badges["t4"] ? "已达成！锲而不舍，金石可镂。" : "掌握全部词语后解锁") + '</div></div>';
    view().innerHTML = html;
  }

  /* ---------- study mode shared ---------- */
  function startMode(mode) {
    var pool = scopedWords();
    if (mode === "cloze") {
      var bad = pool.filter(function (w) { return !(w.cloze && w.cloze.indexOf("__") !== -1); });
      if (bad.length) {
        // Never show a question that leaks its own answer; skip and warn.
        console.warn("填空挑战: " + bad.length + " word(s) skipped, no valid cloze:", bad.map(function (w) { return w.w; }).join("、"));
        pool = pool.filter(function (w) { return w.cloze && w.cloze.indexOf("__") !== -1; });
      }
      if (!pool.length) { alert("所选范围内没有可用的填空句。"); return; }
    }
    var seq = shuffle(pool);
    if (mode !== "flash") seq = seq.slice(0, Math.min(QUIZ_LEN, seq.length));
    var state = { mode: mode, seq: seq, i: 0, correct: 0, revealed: false, streak: 0 };
    renderStep(state);
  }

  function railHtml(state, name, desc, extra) {
    var total = state.seq.length;
    return '<div class="rail card">' +
      '<div class="mode-name">' + name + '</div>' +
      '<div class="mode-desc">' + desc + '</div>' +
      '<div class="prog-big">' + (state.i + 1) + ' <small>/ ' + total + '</small></div>' +
      '<div class="prog-track"><div class="prog-fill" style="width:' + Math.round(100 * state.i / total) + '%"></div></div>' +
      '<div class="streak">连对 <b>' + state.streak + '</b> 🔥</div>' +
      (extra || "") + '</div>';
  }
  function noteStreak(state, right) {
    if (right) {
      state.streak++;
      if (state.streak > store.bestStreak) { store.bestStreak = state.streak; saveStore(); }
    } else state.streak = 0;
  }

  function renderStep(state) {
    setTopbar("home", "");
    if (state.i >= state.seq.length) { return renderResult(state); }
    if (state.mode === "flash") return renderFlash(state);
    if (state.mode === "cloze") return renderCloze(state);
    return renderMcq(state);
  }

  /* ---------- flashcards ---------- */
  function renderFlash(state) {
    var w = state.seq[state.i];
    var back = state.revealed;
    var inner;
    if (!back) {
      inner = '<div class="w-row"><div class="w">' + esc(w.w) + '</div>' +
        '<button class="tts sm" id="ttsWF">🔊</button></div>' +
        '<div class="py">' + esc(w.py) + '</div>' +
        '<div class="hinttap">点击卡片查看释义</div>';
    } else {
      inner = '<div class="w-row"><div class="w back-w">' + esc(w.w) + '</div>' +
        '<button class="tts sm" id="ttsWB">🔊</button></div>' +
        '<div class="py back-py">' + esc(w.py) + '</div>' +
        (w.pos ? '<span class="pos">' + esc(w.pos) + '</span>' : "") +
        '<div class="zh-row"><div class="zh">' + esc(w.zh) + '</div>' +
        '<button class="tts sm" id="ttsZh">🔊</button></div>' +
        '<div class="en">' + esc(w.en) + '</div>' +
        '<div class="hinttap">课文例句请翻阅课本 · 点击卡片返回</div>';
    }
    view().innerHTML = '<div class="study">' +
      railHtml(state, "词语闪卡", esc(w.level) + " · " + esc(w.unit),
        '<button class="tts sm rail-tts" id="ttsW">🔊 点读词语</button>') +
      '<div class="stage"><div class="flash-stage">' +
      '<button class="arrow" id="prev">‹</button>' +
      '<div class="flashcard" id="fc">' + inner + '</div>' +
      '<button class="arrow" id="next">›</button></div>' +
      '<div class="nav-row">' +
      '<button class="nav-btn" id="prev2">‹ 上一张</button>' +
      '<button class="nav-btn primary" id="next2">' + (state.i + 1 >= state.seq.length ? "完成复习 ✓" : "下一张 ›") + '</button>' +
      '</div></div></div>';

    document.getElementById("fc").onclick = function (e) {
      if (e.target.closest && e.target.closest(".tts")) return;
      state.revealed = !state.revealed; renderFlash(state);
    };
    document.getElementById("ttsW").onclick = function () { speak(w.w); };
    ["ttsWF", "ttsWB"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.onclick = function (e) { e.stopPropagation(); speak(w.w); };
    });
    var zhBtn = document.getElementById("ttsZh");
    if (zhBtn) zhBtn.onclick = function (e) { e.stopPropagation(); speak(w.zh); };
    function next() {
      state.revealed = false;
      state.i++;
      if (state.i >= state.seq.length) return renderFlashDone(state);
      renderFlash(state);
    }
    function prev() {
      state.revealed = false;
      state.i = (state.i - 1 + state.seq.length) % state.seq.length;
      renderFlash(state);
    }
    document.getElementById("next").onclick = next;
    document.getElementById("next2").onclick = next;
    document.getElementById("prev").onclick = prev;
    document.getElementById("prev2").onclick = prev;
  }
  function renderFlashDone(state) {
    view().innerHTML = '<div class="result">' +
      '<div class="big">📖</div>' +
      '<div class="sub">复习完成 · 共 ' + state.seq.length + ' 张闪卡</div>' +
      '<div class="msg">词语看熟了，就去填空挑战里检验一下吧！</div>' +
      '<div class="nav-row">' +
      '<button class="nav-btn" id="again">再看一轮</button>' +
      '<button class="nav-btn primary" id="home">回到营地</button></div></div>';
    document.getElementById("again").onclick = function () { startMode("flash"); };
    document.getElementById("home").onclick = renderHome;
  }

  /* ---------- cloze with difficulty ladder ---------- */
  var DIFF_OPTS = [
    { k: "2", stars: "⭐", label: "两个选项" },
    { k: "3", stars: "⭐⭐", label: "三个选项" },
    { k: "4", stars: "⭐⭐⭐", label: "四个选项" },
    { k: "type", stars: "⭐⭐⭐⭐", label: "打字输入" }
  ];
  function diffSelector() {
    var html = '<div class="diff-label">挑战难度</div><div class="diff">';
    DIFF_OPTS.forEach(function (d) {
      html += '<button class="dopt' + (store.diff === d.k ? " on" : "") + '" data-d="' + d.k + '">' +
        '<span class="stars">' + d.stars + '</span>' + d.label + '</button>';
    });
    return html + '</div>';
  }
  function wireDiff(state) {
    Array.prototype.forEach.call(view().querySelectorAll(".dopt"), function (b) {
      b.onclick = function () {
        store.diff = b.getAttribute("data-d");
        saveStore();
        renderCloze(state); // takes effect on the current question, mid-round switching allowed
      };
    });
  }
  function renderCloze(state) {
    var w = state.seq[state.i];
    var qtext = esc(w.cloze).replace(/_{2,}/g, "<u></u>");
    var typing = store.diff === "type";
    var html = '<div class="study">' +
      railHtml(state, "填空挑战", "读句子，填出空格里的词语", diffSelector()) +
      '<div class="stage"><div class="q-card">' +
      '<span class="q-tag">' + (typing ? "读句子，打出空格里的词语" : "选出最适当的词语填入空格") + '</span>' +
      '<div class="q-text">' + qtext + '</div>' +
      '<div class="q-foot"><button class="tts" id="ttsS">🔊 朗读句子</button></div></div>';

    if (typing) {
      html += '<div class="answer-row">' +
        '<input class="answer-input" id="ans" autocomplete="off" placeholder="输入词语…">' +
        '<button class="check-btn" id="chk">检查</button></div>' +
        '<button class="hint-btn" id="hint">提示：显示拼音</button>';
    } else {
      var n = parseInt(store.diff, 10);
      var opts = shuffle([w].concat(distractorsFor(w, scopedWords(), n - 1)));
      state._opts = opts;
      html += '<div class="opts n' + n + '" id="opts">' +
        opts.map(function (o, idx) {
          return '<button class="opt" data-i="' + idx + '"><span class="letter">' +
            String.fromCharCode(65 + idx) + '</span>' + esc(o.w) +
            '<span class="opt-tts" title="朗读">🔊</span></button>';
        }).join("") + '</div>';
    }
    html += '<div class="feedback" id="fb"></div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›</button></div></div></div>';
    view().innerHTML = html;

    wireDiff(state);
    document.getElementById("ttsS").onclick = function () { speakCloze(w.cloze); };
    function finish(right) {
      noteStreak(state, right);
      bump("cloze", right);
      if (right) { state.correct++; markMastered(w); sfxOk(); }
      document.getElementById("nextRow").style.display = "flex";
      var nx = document.getElementById("next");
      nx.onclick = function () { state.i++; renderStep(state); };
      nx.focus();
    }
    if (typing) {
      var ans = document.getElementById("ans");
      var done = false;
      ans.focus();
      document.getElementById("hint").onclick = function () { this.textContent = "拼音：" + w.py; };
      function submit() {
        if (done) return;
        var val = ans.value.trim();
        if (!val) return;
        var fb = document.getElementById("fb");
        if (val === w.w) {
          done = true;
          fb.className = "feedback show ok";
          fb.innerHTML = "✔ 正确！<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
          finish(true);
        } else {
          ans.classList.remove("shake"); void ans.offsetWidth; ans.classList.add("shake");
          sfxBad();
          if (!ans.dataset.tried) { ans.dataset.tried = "1"; return; }
          done = true;
          setTimeout(function () {
            if (!fb.isConnected) return;
            fb.className = "feedback show bad";
            fb.innerHTML = "✘ 正确答案：<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
            speak("正确答案：" + w.w);
            finish(false);
          }, 900);
        }
      }
      document.getElementById("chk").onclick = submit;
      ans.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    } else {
      var locked = false;
      Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
        btn.onclick = function (e) {
          if (e.target.classList && e.target.classList.contains("opt-tts")) {
            speak(state._opts[parseInt(btn.getAttribute("data-i"), 10)].w);
            return;
          }
          if (locked) return; locked = true;
          var chosen = state._opts[parseInt(btn.getAttribute("data-i"), 10)];
          var right = chosen.id === w.id;
          var fb = document.getElementById("fb");
          function reveal() {
            Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
              var o = state._opts[bi];
              if (o.id === w.id) {
                b.classList.add("right");
                b.innerHTML += '<span class="py">' + esc(o.py) + '</span>';
              } else if (o === chosen) b.classList.add("wrong");
            });
            fb.className = "feedback show " + (right ? "ok" : "bad");
            fb.innerHTML = (right ? "✔ 正确！" : "✘ 正确答案：") + "<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
            finish(right);
          }
          if (right) { reveal(); }
          else {
            btn.classList.add("wrong");
            sfxBad();
            setTimeout(function () { if (!fb.isConnected) return; reveal(); speak("正确答案：" + w.w); }, 900);
          }
        };
      });
    }
  }

  /* ---------- MCQ (华文解释 / 英文翻译) ---------- */
  function renderMcq(state) {
    var w = state.seq[state.i];
    var isZh = state.mode === "zhmcq";
    var prompt = isZh ? w.zh : w.en;
    var opts = shuffle([w].concat(distractorsFor(w, scopedWords(), 3)));
    view().innerHTML = '<div class="study">' +
      railHtml(state, isZh ? "华文解释" : "英文翻译", isZh ? "看释义，选出词语" : "看英译，选出词语") +
      '<div class="stage"><div class="q-card">' +
      '<span class="q-tag">' + (isZh ? "看释义，选出词语" : "看英文，选出词语") + '</span>' +
      '<div class="q-text mcq">' + esc(prompt) + '</div>' +
      (isZh ? '<div class="q-foot"><button class="tts" id="ttsP">🔊 朗读释义</button></div>' : "") +
      '</div>' +
      '<div class="opts n4" id="opts">' +
      opts.map(function (o, idx) {
        return '<button class="opt" data-i="' + idx + '"><span class="letter">' +
          String.fromCharCode(65 + idx) + '</span>' + esc(o.w) +
          '<span class="opt-tts" title="朗读">🔊</span></button>';
      }).join("") + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›</button></div></div></div>';

    var tp = document.getElementById("ttsP");
    if (tp) tp.onclick = function () { speak(w.zh); };
    var locked = false;
    Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
      btn.onclick = function (e) {
        if (e.target.classList && e.target.classList.contains("opt-tts")) {
          speak(opts[parseInt(btn.getAttribute("data-i"), 10)].w);
          return;
        }
        if (locked) return; locked = true;
        var chosen = opts[parseInt(btn.getAttribute("data-i"), 10)];
        var right = chosen.id === w.id;
        var fb = document.getElementById("fb");
        function reveal() {
          noteStreak(state, right);
          if (right) { state.correct++; sfxOk(); }
          bump(state.mode, right);
          Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
            var o = opts[bi];
            if (o.id === w.id) {
              b.classList.add("right");
              b.innerHTML += '<span class="py">' + esc(o.py) + '</span>';
            } else if (o === chosen) b.classList.add("wrong");
          });
          fb.className = "feedback show " + (right ? "ok" : "bad");
          fb.innerHTML = (right ? "✔ 正确！" : "✘ 正确答案：") + "<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
          document.getElementById("nextRow").style.display = "flex";
          document.getElementById("next").onclick = function () { state.i++; renderStep(state); };
        }
        if (right) { reveal(); }
        else {
          btn.classList.add("wrong");
          sfxBad();
          setTimeout(function () { if (!fb.isConnected) return; reveal(); speak("正确答案：" + w.w); }, 900);
        }
      };
    });
  }

  /* ---------- result ---------- */
  function renderResult(state) {
    var total = state.seq.length;
    var pct = total ? Math.round(100 * state.correct / total) : 0;
    var msg = pct >= 90 ? "登顶了！旭日在你身后。" :
              pct >= 70 ? "快到山顶了，再攀一程！" :
              pct >= 50 ? "半山腰的风景也不错，继续加油。" :
                          "山脚是每个登山者的起点，再来一次！";
    view().innerHTML = '<div class="result">' +
      '<div class="big">' + state.correct + ' / ' + total + '</div>' +
      '<div class="sub">正确率 ' + pct + '%</div>' +
      '<div class="msg">' + msg + '</div>' +
      '<div class="nav-row">' +
      '<button class="nav-btn" id="again">再来一局</button>' +
      '<button class="nav-btn primary" id="home">回到营地</button></div></div>';
    document.getElementById("again").onclick = function () { startMode(state.mode); };
    document.getElementById("home").onclick = renderHome;
  }

  /* ==================================================================
     词雨 · falling-words typing game (all streams)
     Score per cleared word = 字数 × 10 × combo, plus altitude bonus
     (clear it high = more points). 3 lives; a word reaching the sea
     costs one. Waves speed up gently. Personal best only, this device.
     ================================================================== */
  var RAIN_SPEEDS = [
    { k: "slow", label: "慢 · 悠然登山", fall: 22, spawn: 4200 },
    { k: "mid", label: "中 · 稳步向前", fall: 34, spawn: 3200 },
    { k: "fast", label: "快 · 疾风骤雨", fall: 50, spawn: 2400 }
  ];
  function renderRainConfig() {
    setTopbar("home", "");
    var best = store.best.rain || 0;
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">🌧️ 词雨</div>' +
      '<div class="mode-desc">雨中词语落向大海，在落水前打出它，收进雨水收集缸！<br>字数越多、接得越高、连击越长，得分越高。</div>' +
      '<div class="diff-label">下落速度</div><div class="diff" id="speedSel">' +
      RAIN_SPEEDS.map(function (s, i) {
        return '<button class="dopt' + (i === 1 ? " on" : "") + '" data-i="' + i + '">' + s.label + '</button>';
      }).join("") + '</div>' +
      '<div class="diff-label">拼音辅助</div><div class="diff">' +
      '<button class="dopt on" id="pySel">在词语下方显示拼音</button></div>' +
      '<div class="rain-best">本机最高分：<b>' + best + '</b></div>' +
      '<div class="nav-row"><button class="nav-btn" id="back">‹ 回营地</button>' +
      '<button class="nav-btn primary" id="go">开始游戏 ›</button></div></div>';
    var speedIdx = 1, showPy = true;
    Array.prototype.forEach.call(view().querySelectorAll("#speedSel .dopt"), function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(view().querySelectorAll("#speedSel .dopt"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        speedIdx = parseInt(b.getAttribute("data-i"), 10);
      };
    });
    document.getElementById("pySel").onclick = function () {
      showPy = !showPy; this.classList.toggle("on", showPy);
    };
    document.getElementById("back").onclick = renderHome;
    document.getElementById("go").onclick = function () { startRain(speedIdx, showPy); };
  }
  function startRain(speedIdx, showPy) {
    var cfg = RAIN_SPEEDS[speedIdx];
    var pool = scopedWords().filter(function (w) { return w.w.length <= 4; });
    if (pool.length < 8) {
      alert("所选范围内适合词雨的词语不足（需要至少 8 个 1–4 字的词语）。请扩大复习范围。");
      return;
    }
    setTopbar("home", "");
    view().innerHTML =
      '<div class="rain-shell">' +
      '<div class="rain-hud">' +
      '<span>得分 <b id="rScore">0</b></span>' +
      '<span>连击 <b id="rCombo">×1</b></span>' +
      '<span>波次 <b id="rWave">1</b></span>' +
      '<span id="rLives">❤️❤️❤️</span>' +
      '<button class="nav-btn" id="rPause" style="margin-left:auto;padding:6px 14px">⏸ 暂停</button></div>' +
      '<div class="rain-area" id="rArea"><div class="rain-fx"></div><div class="rain-sea"></div>' +
      '<div class="rain-barrel" id="rBarrel"><div class="rain-water" id="rWater"></div>' +
      '<div class="rain-drops" id="rDrops">💧 0</div></div></div>' +
      '<div class="rain-input-row">' +
      '<input class="answer-input" id="rInput" autocomplete="off" placeholder="打出词语，收集雨水…">' +
      '<button class="check-btn" id="rFire">收集</button></div></div>';

    var area = document.getElementById("rArea");
    var input = document.getElementById("rInput");
    var live = [];          // {el, w, x, y, sway, phase}
    var score = 0, combo = 1, cleared = 0, lives = 3, wave = 1;
    var running = true, over = false, composing = false;
    var lastT = null, spawnTimer = 0, raf = null;
    var bag = shuffle(pool);

    function nextWord() {
      if (!bag.length) bag = shuffle(pool);
      return bag.pop();
    }
    function collectToBarrel(o) {
      var b = document.getElementById("rBarrel");
      var bx = b.offsetLeft + b.offsetWidth / 2 - o.el.offsetWidth / 2;
      var by = b.offsetTop - 8;
      o.el.classList.add("collect");
      o.el.style.transform = "translate(" + bx + "px," + by + "px) scale(.25)";
      (function (el) { setTimeout(function () { el.remove(); }, 480); })(o.el);
    }
    function splashAt(x) {
      var s = document.createElement("div");
      s.className = "rain-splash";
      s.style.left = (x - 14) + "px";
      s.textContent = "💦";
      area.appendChild(s);
      setTimeout(function () { s.remove(); }, 550);
    }
    function spawn() {
      var w = nextWord();
      var el = document.createElement("div");
      el.className = "rain-word";
      el.innerHTML = '<span class="rw">' + esc(w.w) + '</span>' +
        (showPy ? '<span class="rp">' + esc(w.py) + '</span>' : "");
      area.appendChild(el);
      var maxX = Math.max(20, area.clientWidth - el.offsetWidth - 20);
      var x = 20 + Math.random() * maxX;
      live.push({ el: el, w: w, x: x, y: -el.offsetHeight, sway: 14 + Math.random() * 26, phase: Math.random() * 6.28 });
      el.style.transform = "translate(" + x + "px,-40px)";
    }
    function step(t) {
      if (!area.isConnected) { cancelAnimationFrame(raf); return; }
      if (!running) { lastT = t; raf = requestAnimationFrame(step); return; }
      if (lastT == null) lastT = t;
      var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      spawnTimer += dt * 1000;
      var spawnEvery = Math.max(1200, cfg.spawn - (wave - 1) * 250);
      if (spawnTimer >= spawnEvery && live.length < 7) { spawnTimer = 0; spawn(); }
      var fall = cfg.fall * (1 + (wave - 1) * 0.12);
      var seaY = area.clientHeight - 46;
      for (var i = live.length - 1; i >= 0; i--) {
        var o = live[i];
        o.y += fall * dt;
        o.phase += dt * 1.4;
        var x = o.x + Math.sin(o.phase) * o.sway; // space-invader drift
        o.el.style.transform = "translate(" + x + "px," + o.y + "px)";
        if (o.y > seaY) {
          splashAt(o.x + o.el.offsetWidth / 2);
          o.el.remove(); live.splice(i, 1);
          lives--; combo = 1; sfxLife();
          document.getElementById("rLives").textContent = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(3 - Math.max(0, lives));
          document.getElementById("rCombo").textContent = "×1";
          if (lives <= 0) return gameOver();
        }
      }
      raf = requestAnimationFrame(step);
    }
    function fire() {
      var val = input.value.trim();
      input.value = "";
      if (!val) return;
      var hit = -1;
      for (var i = 0; i < live.length; i++) {
        if (live[i].w.w === val) { hit = i; break; }
      }
      if (hit === -1) { input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); combo = 1; document.getElementById("rCombo").textContent = "×1"; return; }
      var o = live[hit];
      var altBonus = Math.max(0, Math.round((1 - o.y / area.clientHeight) * 20)); // clear it high
      score += o.w.w.length * 10 * combo + altBonus;
      cleared++; combo = Math.min(5, combo + (cleared % 3 === 0 ? 1 : 0));
      if (cleared % 10 === 0) { wave++; document.getElementById("rWave").textContent = wave; toast("🌊 第 " + wave + " 波来了！"); }
      sfxOk();
      collectToBarrel(o);
      live.splice(hit, 1);
      document.getElementById("rDrops").textContent = "💧 " + cleared;
      document.getElementById("rWater").style.height = Math.min(100, cleared * 3) + "%";
      document.getElementById("rScore").textContent = score;
      document.getElementById("rCombo").textContent = "×" + combo;
    }
    function gameOver() {
      over = true; running = false;
      cancelAnimationFrame(raf);
      live.forEach(function (o) { o.el.remove(); }); live = [];
      var best = store.best.rain || 0;
      var isBest = score > best;
      if (isBest) { store.best.rain = score; saveStore(); }
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + score + '</div>' +
        '<div class="sub">词雨 · 收集 ' + cleared + ' 滴雨水 · 第 ' + wave + ' 波</div>' +
        '<div class="msg">' + (isBest ? "🎉 本机新纪录！" : "本机最高分：" + Math.max(best, score)) + '</div>' +
        '<div class="nav-row">' +
        '<button class="nav-btn" id="again">再来一局</button>' +
        '<button class="nav-btn primary" id="home">回到营地</button></div></div>';
      document.getElementById("again").onclick = function () { startRain(speedIdx, showPy); };
      document.getElementById("home").onclick = renderHome;
    }
    document.getElementById("rPause").onclick = function () {
      running = !running;
      this.textContent = running ? "⏸ 暂停" : "▶ 继续";
    };
    document.getElementById("rFire").onclick = fire;
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !composing) fire();
    });
    // Keep the input in view when an on-screen keyboard appears (phones).
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        if (!over) area.style.height = Math.max(220, window.visualViewport.height - 210) + "px";
      });
    }
    input.focus();
    spawn(); // first word immediately, don't make players stare at empty sky
    raf = requestAnimationFrame(step);
  }

  /* ==================================================================
     词语汉兜 · four-character word guessing (G2/G3/HCL)
     Wordle rules at the character level: 6 guesses, green = right
     character right position, amber = in the word elsewhere, grey =
     not in the word. Answer pool = 4-character words in scope.
     ================================================================== */
  function startHandle() {
    var pool = scopedWords().filter(function (w) { return w.w.length === 4; });
    if (pool.length < 8) {
      alert("所选范围内的四字词语不足（至少需要 8 个）。请扩大复习范围。");
      return;
    }
    var answer = pool[Math.floor(Math.random() * pool.length)];
    var state = { answer: answer, rows: [], done: false };
    renderHandle(state);
  }
  function pyInitials(py) {
    return String(py).trim().split(/\s+/).map(function (s) {
      var m = s.toLowerCase().match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/);
      return m ? m[1] : s.charAt(0);
    });
  }
  function handleHintHtml(state) {
    var ini = pyInitials(state.answer.py);
    var h = '<div class="handle-hints">';
    if (STREAM === "g2") {
      h += '<div class="hint-line">声母提示：<b>' + ini.map(esc).join(" · ") + '</b></div>';
    } else {
      h += '<div class="hint-line">首字声母：<b>' + esc(ini[0]) + '</b></div>';
    }
    if (!state.done && state.rows.length >= 2) {
      h += '<div class="hint-line">释义提示：' + esc(state.answer.zh) + '</div>';
    }
    return h + '</div>';
  }
  function gradeGuess(guess, answer) {
    var res = ["absent", "absent", "absent", "absent"];
    var remain = {};
    for (var i = 0; i < 4; i++) {
      if (guess[i] === answer[i]) res[i] = "exact";
      else remain[answer[i]] = (remain[answer[i]] || 0) + 1;
    }
    for (var j = 0; j < 4; j++) {
      if (res[j] === "exact") continue;
      if (remain[guess[j]]) { res[j] = "present"; remain[guess[j]]--; }
    }
    return res;
  }
  function renderHandle(state) {
    setTopbar("home", "");
    var streak = store.best.handle || 0;
    var html = '<div class="study"><div class="rail card">' +
      '<div class="mode-name">🀄 词语汉兜</div>' +
      '<div class="mode-desc">猜一个范围内的四字词语。<br>🟩 字对位置对 · 🟨 字对位置不对 · ⬜ 没有这个字</div>' +
      '<div class="prog-big">' + state.rows.length + ' <small>/ 6 次</small></div>' +
      '<div class="streak">连胜 <b>' + streak + '</b> 🏮</div>' +
      handleHintHtml(state) + '</div>' +
      '<div class="stage"><div class="handle-grid">';
    for (var r = 0; r < 6; r++) {
      html += '<div class="handle-row">';
      var row = state.rows[r];
      for (var c = 0; c < 4; c++) {
        if (row) html += '<div class="handle-tile ' + row.res[c] + '">' + esc(row.g[c]) + '</div>';
        else html += '<div class="handle-tile"></div>';
      }
      html += '</div>';
    }
    html += '</div>';
    if (!state.done) {
      html += '<div class="answer-row handle-input">' +
        '<input class="answer-input" id="hAns" autocomplete="off" maxlength="4" placeholder="输入四字词语…">' +
        '<button class="check-btn" id="hChk">猜！</button></div>' +
        '<div class="feedback" id="hFb"></div>';
    } else {
      var a = state.answer;
      html += '<div class="feedback show ' + (state.won ? "ok" : "bad") + '">' +
        (state.won ? "🎉 猜对了！" : "答案是：") + "<b>" + esc(a.w) + "</b>（" + esc(a.py) + "）" + esc(a.zh) + '</div>' +
        '<div class="nav-row"><button class="nav-btn" id="hAgain">再来一局</button>' +
        '<button class="nav-btn primary" id="hHome">回到营地</button></div>';
    }
    html += '</div></div>';
    view().innerHTML = html;
    if (state.done) {
      speak(state.answer.w);
      document.getElementById("hAgain").onclick = startHandle;
      document.getElementById("hHome").onclick = renderHome;
      return;
    }
    var input = document.getElementById("hAns");
    var composing = false;
    input.focus();
    function submit() {
      var val = input.value.trim();
      var fb = document.getElementById("hFb");
      if (!/^[\u4e00-\u9fff]{4}$/.test(val)) {
        fb.className = "feedback show bad";
        fb.textContent = "请输入四个汉字。";
        return;
      }
      state.rows.push({ g: val, res: gradeGuess(val, state.answer.w) });
      if (val === state.answer.w) {
        state.done = true; state.won = true;
        store.best.handle = (store.best.handle || 0) + 1; saveStore();
        sfxBadge();
      } else if (state.rows.length >= 6) {
        state.done = true; state.won = false;
        store.best.handle = 0; saveStore();
        sfxBad();
      } else { sfxOk(); }
      renderHandle(state);
    }
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !composing) submit(); });
    document.getElementById("hChk").onclick = submit;
  }


  /* ==================================================================
     组词挑战 · character-assembly game (G2)
     Show the definition, tap the word's characters in order among
     decoys. Playground game: does not mark mastery.
     ================================================================== */
  function startAssemble() {
    var pool = scopedWords().filter(function (w) { return w.w.length >= 2 && w.w.length <= 4; });
    if (pool.length < 10) {
      alert("所选范围内适合组词挑战的词语不足（需要至少 10 个 2–4 字词语）。请扩大复习范围。");
      return;
    }
    var charSet = {};
    pool.forEach(function (w) {
      for (var i = 0; i < w.w.length; i++) charSet[w.w.charAt(i)] = 1;
    });
    var state = {
      seq: shuffle(pool).slice(0, 10), i: 0, perfect: 0,
      chars: Object.keys(charSet)
    };
    renderAssemble(state);
  }
  function renderAssemble(state) {
    setTopbar("home", "");
    var w = state.seq[state.i];
    var target = w.w.split("");
    var inTarget = {};
    target.forEach(function (c) { inTarget[c] = 1; });
    var decoys = shuffle(state.chars.filter(function (c) { return !inTarget[c]; }))
      .slice(0, 9 - target.length);
    var chips = shuffle(target.concat(decoys));

    var html = '<div class="study"><div class="rail card">' +
      '<div class="mode-name">🧩 组词挑战</div>' +
      '<div class="mode-desc">看释义，按顺序点出词语的字。</div>' +
      '<div class="prog-big">' + (state.i + 1) + ' <small>/ ' + state.seq.length + '</small></div>' +
      '<div class="streak">拼对 <b>' + state.perfect + '</b> 🧩</div></div>' +
      '<div class="stage"><div class="q-card">' +
      '<span class="q-tag">按顺序点出这个词语的字</span>' +
      '<div class="q-text mcq">' + esc(w.zh) + '</div>' +
      '<div class="q-foot"><button class="tts" id="asmTts">🔊 朗读释义</button></div></div>' +
      '<div class="asm-slots" id="asmSlots">' +
      target.map(function () { return '<div class="asm-slot"></div>'; }).join("") + '</div>' +
      '<div class="asm-chips" id="asmChips">' +
      chips.map(function (c, i) {
        return '<button class="asm-chip" data-c="' + esc(c) + '" data-i="' + i + '">' + esc(c) + '</button>';
      }).join("") + '</div>' +
      '<div class="feedback" id="asmFb"></div>' +
      '<div class="nav-row" id="asmNextRow" style="display:none">' +
      '<button class="nav-btn primary" id="asmNext">' +
      (state.i + 1 >= state.seq.length ? "看成绩 ›" : "下一题 ›") + '</button></div></div></div>';
    view().innerHTML = html;

    document.getElementById("asmTts").onclick = function () { speak(w.zh); };
    var nextIdx = 0, wrongThis = false, done = false;
    var slots = view().querySelectorAll(".asm-slot");
    Array.prototype.forEach.call(view().querySelectorAll(".asm-chip"), function (chip) {
      chip.onclick = function () {
        if (done) return;
        var c = chip.getAttribute("data-c");
        if (c === target[nextIdx]) {
          chip.classList.add("used");
          slots[nextIdx].textContent = c;
          slots[nextIdx].classList.add("filled");
          tone(500 + nextIdx * 110, 0, 0.1);
          nextIdx++;
          if (nextIdx >= target.length) {
            done = true;
            if (!wrongThis) state.perfect++;
            bump("assemble", !wrongThis);
            sfxOk();
            var fb = document.getElementById("asmFb");
            fb.className = "feedback show " + (wrongThis ? "bad" : "ok");
            fb.innerHTML = (wrongThis ? "✔ 完成！（中途点错过）" : "✔ 一次拼对！") +
              "<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" +
              '<button class="tts sm" id="asmSay" style="margin-left:8px">🔊</button>';
            document.getElementById("asmSay").onclick = function () { speak(w.w); };
            document.getElementById("asmNextRow").style.display = "flex";
            var nx = document.getElementById("asmNext");
            nx.onclick = function () {
              state.i++;
              if (state.i >= state.seq.length) return renderAssembleDone(state);
              renderAssemble(state);
            };
            nx.focus();
          }
        } else {
          wrongThis = true;
          chip.classList.remove("shake"); void chip.offsetWidth; chip.classList.add("shake");
          sfxBad();
        }
      };
    });
  }
  function renderAssembleDone(state) {
    var best = store.best.assemble || 0;
    var isBest = state.perfect > best;
    if (isBest) { store.best.assemble = state.perfect; saveStore(); }
    var pct = Math.round(100 * state.perfect / state.seq.length);
    var msg = isBest ? "🎉 本机新纪录！" :
      pct >= 80 ? "字字到位，词将风范！" :
      pct >= 50 ? "越拼越顺，再来一局！" : "多看释义提示，慢慢来。";
    view().innerHTML = '<div class="result">' +
      '<div class="big">' + state.perfect + ' / ' + state.seq.length + '</div>' +
      '<div class="sub">组词挑战 · 一次拼对 ' + state.perfect + ' 题</div>' +
      '<div class="msg">' + msg + '</div>' +
      '<div class="nav-row">' +
      '<button class="nav-btn" id="again">再来一局</button>' +
      '<button class="nav-btn primary" id="home">回到营地</button></div></div>';
    document.getElementById("again").onclick = startAssemble;
    document.getElementById("home").onclick = renderHome;
  }

  /* ==================================================================
     攀山竞速 · 90-second climb sprint (all streams) — Phase 1
     Fixed viewport, camera-follow canvas world (no scrolling).
     Answering is the movement; altitude = mastered count (1 词 = 1 米).
     Placeholder pixel climber until Phase 2 spritesheets arrive.
     ================================================================== */
  var SPRINT_OPTS = [60, 90, 120];
  function altitudeNow() { return Object.keys(store.mastered).length; }
  function renderSprintConfig() {
    setTopbar("home", "");
    var best = store.best.sprint || 0;
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">⛰️ 攀山竞速</div>' +
      '<div class="mode-desc">90 秒登山冲刺：看释义选词语，答对就向上攀登！<br>' +
      '第一次答对的新词会永久提升你的海拔（1 词 = 1 米）。优先出现你还没掌握的词。</div>' +
      '<div class="sprint-stats"><span>我的海拔 <b>' + altitudeNow() + ' 米</b></span>' +
      '<span>个人纪录 <b>' + best + ' 题</b></span></div>' +
      '<div class="diff-label">冲刺时长</div><div class="diff" id="secSel">' +
      SPRINT_OPTS.map(function (s) {
        return '<button class="dopt' + (s === store.sprintSecs ? " on" : "") + '" data-s="' + s + '">' + s + ' 秒</button>';
      }).join("") + '</div>' +
      '<div class="nav-row"><button class="nav-btn" id="back">‹ 回营地</button>' +
      '<button class="nav-btn primary" id="go">开始攀登 ›</button></div></div>';
    Array.prototype.forEach.call(view().querySelectorAll("#secSel .dopt"), function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(view().querySelectorAll("#secSel .dopt"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        store.sprintSecs = parseInt(b.getAttribute("data-s"), 10);
        saveStore();
      };
    });
    document.getElementById("back").onclick = renderHome;
    document.getElementById("go").onclick = startSprint;
  }
  function startSprint() {
    var all = scopedWords();
    if (all.length < 8) { alert("请先选择足够的复习范围（至少 8 词）。"); return; }
    _deferCel = true;
    setTopbar("home", "");
    view().innerHTML = '<div class="sprint-shell">' +
      '<canvas class="sprint-canvas" id="spCv"></canvas>' +
      '<div class="sprint-hud">' +
      '<div class="sprint-timer"><div class="sprint-timer-fill" id="spTime"></div></div>' +
      '<span>答对 <b id="spOk">0</b></span>' +
      '<span>连对 <b id="spCombo">🔥0</b></span>' +
      '<span>海拔 <b id="spAlt">' + altitudeNow() + '</b> 米</span></div>' +
      '<div class="sprint-q card"><div class="sq-row">' +
      '<div class="sq-prompt" id="spPrompt"></div>' +
      '<button class="tts sm" id="spSay">🔊</button></div>' +
      '<div class="sopts" id="spOpts"></div></div></div>';

    var cv = document.getElementById("spCv");
    var ctx = cv.getContext("2d");
    var streamAccent = { g1: "#E3A63C", g2: "#3F5F8F", g3: "#B45A2E", hcl: "#4E6E58" }[STREAM] || "#E3A63C";

    /* ----- world ----- */
    var SEG = 26;                                   // px per metre of altitude
    var totalAlt = WORDS.length + 12;               // summit above last word
    var startAlt = altitudeNow();
    var climbAlt = startAlt;                        // rendered position (float)
    var targetAlt = startAlt;                       // moves +1 per correct answer
    var slipT = 0;                                  // wrong-answer wobble timer
    var camY = 0, camInit = false;
    var best = store.best.sprint || 0;

    function worldH() { return totalAlt * SEG + 140; }
    function yOf(alt) { return worldH() - alt * SEG - 90; }
    function xOf(alt) { return cv.width * 0.5 + Math.sin(alt * 0.35) * cv.width * 0.26; }

    function resize() {
      var r = cv.getBoundingClientRect();
      cv.width = Math.max(280, Math.round(r.width));
      cv.height = Math.max(170, Math.round(r.height));
    }
    resize();
    window.addEventListener("resize", resize);

    /* ----- session state ----- */
    var unm = shuffle(all.filter(function (w) { return !store.mastered[w.id]; }));
    var mas = shuffle(all.filter(function (w) { return store.mastered[w.id]; }));
    var queue = unm.concat(mas), qi = 0;
    function nextWordS() {
      if (qi >= queue.length) { queue = shuffle(queue); qi = 0; }
      return queue[qi++];
    }
    var ok = 0, combo = 0, newMastered = 0, over = false, locked = false;
    var sprintMs = (store.sprintSecs || 90) * 1000;
    var endAt = performance.now() + sprintMs;
    var cur = null;

    function askNext() {
      if (over || !document.getElementById("spPrompt")) return;
      locked = false;
      cur = nextWordS();
      document.getElementById("spPrompt").textContent = cur.zh;
      document.getElementById("spSay").onclick = function () { speak(cur.zh); };
      var opts = shuffle([cur].concat(distractorsFor(cur, all, 3)));
      var box = document.getElementById("spOpts");
      box.innerHTML = opts.map(function (o, i) {
        return '<button class="sopt" data-i="' + i + '"><span class="letter">' +
          String.fromCharCode(65 + i) + '</span>' + esc(o.w) +
          '<span class="opt-tts" title="朗读">🔊</span></button>';
      }).join("");
      Array.prototype.forEach.call(box.querySelectorAll(".sopt"), function (b) {
        b.onclick = function (e) {
          if (e.target.classList && e.target.classList.contains("opt-tts")) {
            speak(opts[parseInt(b.getAttribute("data-i"), 10)].w);
            return;
          }
          if (locked || over) return; locked = true;
          var chosen = opts[parseInt(b.getAttribute("data-i"), 10)];
          var right = chosen.id === cur.id;
          bump("sprint", right);
          if (right) {
            ok++; combo++;
            targetAlt = Math.min(totalAlt, targetAlt + 1);
            if (!store.mastered[cur.id]) { newMastered++; markMastered(cur); }
            document.getElementById("spOk").textContent = ok;
            document.getElementById("spCombo").textContent = "🔥" + combo;
            document.getElementById("spAlt").textContent = altitudeNow();
            var p = Math.min(combo, 8);
            tone(520 + p * 55, 0, 0.09); tone(700 + p * 55, 0.07, 0.11);
            b.classList.add("right");
            setTimeout(askNext, 260);
          } else {
            combo = 0; slipT = 0.5;
            document.getElementById("spCombo").textContent = "🔥0";
            sfxBad();
            b.classList.add("wrong");
            Array.prototype.forEach.call(box.querySelectorAll(".sopt"), function (bb, bi) {
              if (opts[bi].id === cur.id) bb.classList.add("right");
            });
            setTimeout(askNext, 800);
          }
        };
      });
    }

    /* ----- placeholder pixel climber (Phase 2: spritesheet swap) ----- */
    function drawClimber(x, y, moving, t) {
      var f = moving ? (Math.floor(t * 6) % 2) : 0;
      var px = Math.round(x), py = Math.round(y);
      ctx.fillStyle = "#2B2118";                        // hair
      ctx.fillRect(px - 5, py - 26, 10, 4);
      ctx.fillStyle = "#F2C9A0";                        // face
      ctx.fillRect(px - 5, py - 22, 10, 7);
      ctx.fillStyle = streamAccent;                     // shirt (level colour)
      ctx.fillRect(px - 6, py - 15, 12, 9);
      ctx.fillStyle = "#5A4636";                        // backpack
      ctx.fillRect(px + 5, py - 16, 4, 8);
      ctx.fillStyle = "#33414D";                        // legs
      if (f === 0) { ctx.fillRect(px - 5, py - 6, 4, 7); ctx.fillRect(px + 1, py - 6, 4, 6); }
      else { ctx.fillRect(px - 5, py - 6, 4, 6); ctx.fillRect(px + 1, py - 6, 4, 7); }
    }

    /* ----- render loop ----- */
    var lastT = null, raf = null;
    function frame(t) {
      if (!cv.isConnected) { cancelAnimationFrame(raf); _deferCel = false; window.removeEventListener("resize", resize); return; }
      if (lastT == null) lastT = t;
      var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;

      /* timer */
      var remain = Math.max(0, endAt - t);
      document.getElementById("spTime").style.width = (100 * remain / sprintMs) + "%";
      if (remain <= 0 && !over) { endSprint(); return; }

      /* movement */
      var moving = climbAlt < targetAlt - 0.01;
      if (moving) climbAlt = Math.min(targetAlt, climbAlt + dt * (3.2 + Math.min(combo, 6) * 0.5));
      if (slipT > 0) slipT = Math.max(0, slipT - dt);

      var px = xOf(climbAlt);
      var py = yOf(climbAlt) + (slipT > 0 ? Math.sin(slipT * 25) * 3.5 : 0);

      /* camera */
      var camTarget = Math.max(0, Math.min(worldH() - cv.height, py - cv.height * 0.62));
      if (!camInit) { camY = camTarget; camInit = true; }
      camY += (camTarget - camY) * Math.min(1, dt * 5);

      /* draw */
      var W = cv.width, H = cv.height;
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#DFEDF7"); sky.addColorStop(1, "#C6DAE9");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      /* sun anchored high in the world */
      var sunY = yOf(totalAlt) - camY - 30;
      if (sunY > -60 && sunY < H + 60) {
        ctx.fillStyle = "rgba(245,196,67,.35)"; ctx.beginPath(); ctx.arc(W * 0.78, sunY, 30, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#F5C443"; ctx.beginPath(); ctx.arc(W * 0.78, sunY, 19, 0, 6.3); ctx.fill();
      }

      /* far ridge parallax */
      ctx.fillStyle = "rgba(169,201,177,.5)";
      ctx.beginPath();
      var rBase = H * 0.9 - (camY * 0.22) % 400;
      for (var rx = -40; rx <= W + 40; rx += 60) {
        var ry = rBase - 200 + Math.sin((rx + camY * 0.22) * 0.02) * 46;
        if (rx === -40) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.lineTo(W + 40, H + 40); ctx.lineTo(-40, H + 40); ctx.closePath(); ctx.fill();

      /* mountain path band + stone steps */
      ctx.strokeStyle = "#57906B"; ctx.lineWidth = 44; ctx.lineCap = "round";
      ctx.beginPath();
      var a0 = Math.max(0, Math.floor((worldH() - camY - H) / SEG) - 4);
      var a1 = Math.min(totalAlt, Math.ceil((worldH() - camY) / SEG) + 4);
      for (var a = a0; a <= a1; a++) {
        var sx = xOf(a), sy = yOf(a) - camY;
        if (a === a0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.fillStyle = "#EFE6D2";
      for (var s = a0; s <= a1; s++) {
        ctx.fillRect(Math.round(xOf(s)) - 7, Math.round(yOf(s) - camY) - 2, 14, 4);
      }

      /* personal-record line */
      if (best > 0 && startAlt + best <= totalAlt) {
        var ly = yOf(startAlt + best) - camY;
        if (ly > -20 && ly < H + 20) {
          ctx.strokeStyle = "rgba(183,121,31,.75)"; ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
          ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = "13px sans-serif"; ctx.fillStyle = "#B7791F";
          ctx.fillText("🚩 个人纪录", 10, ly - 6);
        }
      }

      drawClimber(px, py - camY, moving, t / 1000);
      raf = requestAnimationFrame(frame);
    }

    function endSprint() {
      over = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      var isBest = ok > best;
      if (isBest) { store.best.sprint = ok; saveStore(); }
      sfxBadge();
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + ok + ' 题</div>' +
        '<div class="sub">攀山竞速 · 新掌握 ' + newMastered + ' 词 · 海拔 +' + newMastered + ' 米</div>' +
        '<div class="msg">' + (isBest ? "🚩 个人新纪录！" : "我的海拔：" + altitudeNow() + " 米") + '</div>' +
        '<div class="nav-row">' +
        '<button class="nav-btn" id="again">再来一局</button>' +
        '<button class="nav-btn primary" id="home">回到营地</button></div></div>';
      document.getElementById("again").onclick = startSprint;
      document.getElementById("home").onclick = renderHome;
      flushCelebrations();
    }

    askNext();
    raf = requestAnimationFrame(frame);
  }

  /* ==================================================================
     shared lightweight popover
     ================================================================== */
  function popOverlay(innerHtml) {
    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.innerHTML = '<div class="pop-card">' + innerHtml + '</div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    return ov;
  }
  function showMasteryInfo() {
    var ov = popOverlay(
      '<div class="pop-title">什么算「已掌握」？</div>' +
      '<div class="pop-body">在 <b>填空挑战、华文解释、英文翻译、攀山竞速</b> 中第一次答对某个词语，' +
      '它就记为已掌握。<br><br>词语闪卡与游乐场游戏（词雨、组词挑战、词语汉兜）帮助你练习，但不计入掌握。<br><br>' +
      '掌握数只增不减，它也是你的登山海拔：<b>1 词 = 1 米</b>。</div>' +
      '<div class="nav-row"><button class="nav-btn primary" id="popOk">知道了</button></div>');
    ov.querySelector("#popOk").onclick = function () { ov.remove(); };
  }

  /* ==================================================================
     进度码 · offline backup/restore (bitmask over WORDS order, which is
     append-only by project rule, so codes survive vocab additions)
     ================================================================== */
  function encodeProgress() {
    var bytes = [];
    for (var i = 0; i < Math.ceil(WORDS.length / 8); i++) bytes.push(0);
    WORDS.forEach(function (w, wi) { if (store.mastered[w.id]) bytes[wi >> 3] |= (1 << (wi & 7)); });
    var bin = "";
    for (var b = 0; b < bytes.length; b++) bin += String.fromCharCode(bytes[b]);
    var b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    var meta = [store.bestStreak || 0, store.best.rain || 0, store.best.handle || 0,
      store.best.assemble || 0, store.best.sprint || 0].join("-");
    return "VS1." + STREAM + "." + WORDS.length + "." + b64 + "." + meta;
  }
  function decodeProgress(code) {
    var p = String(code).trim().split(".");
    if (p.length !== 5 || p[0] !== "VS1") return { err: "进度码格式不正确，请检查是否完整复制。" };
    if (p[1] !== STREAM) return { err: "这个进度码属于其他 subject level（" + esc(p[1]).toUpperCase() + "），请到对应的 app 恢复。" };
    var n = parseInt(p[2], 10);
    if (!(n > 0) || n > WORDS.length) return { err: "进度码与当前词库不匹配。" };
    var b64 = p[3].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin;
    try { bin = atob(b64); } catch (e) { return { err: "进度码无法解析，请检查是否完整复制。" }; }
    var added = 0;
    for (var i = 0; i < n; i++) {
      if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) {
        var w = WORDS[i];
        if (w && !store.mastered[w.id]) { store.mastered[w.id] = 1; added++; }
      }
    }
    var meta = p[4].split("-").map(function (x) { return parseInt(x, 10) || 0; });
    store.bestStreak = Math.max(store.bestStreak || 0, meta[0] || 0);
    store.best.rain = Math.max(store.best.rain || 0, meta[1] || 0);
    store.best.handle = Math.max(store.best.handle || 0, meta[2] || 0);
    store.best.assemble = Math.max(store.best.assemble || 0, meta[3] || 0);
    store.best.sprint = Math.max(store.best.sprint || 0, meta[4] || 0);
    saveStore();
    checkBadges(true); // restore badges silently, no celebration replay
    return { added: added };
  }
  function showProgressCode() {
    var code = encodeProgress();
    var ov = popOverlay(
      '<div class="pop-title">💾 进度码</div>' +
      '<div class="pop-body">复制这段进度码，用邮件发给自己保存。换设备或换浏览器时，把它粘贴到下方即可恢复。<br>' +
      '<span class="pop-note">进度码包含：已掌握词语、最高连对、各游戏纪录。</span></div>' +
      '<div class="pop-label">我的进度码</div>' +
      '<textarea class="code-ta" id="codeOut" readonly>' + code + '</textarea>' +
      '<div class="nav-row"><button class="nav-btn" id="codeCopy">📋 复制进度码</button></div>' +
      '<div class="pop-label" style="margin-top:14px">恢复进度</div>' +
      '<textarea class="code-ta" id="codeIn" placeholder="把进度码粘贴到这里…"></textarea>' +
      '<div class="feedback" id="codeFb"></div>' +
      '<div class="nav-row"><button class="nav-btn" id="popClose">关闭</button>' +
      '<button class="nav-btn primary" id="codeRestore">恢复进度</button></div>');
    ov.querySelector("#codeCopy").onclick = function () {
      var ta = ov.querySelector("#codeOut");
      ta.select(); ta.setSelectionRange(0, 99999);
      var done = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { toast("已复制进度码"); });
        done = true;
      }
      if (!done) { try { document.execCommand("copy"); toast("已复制进度码"); } catch (e) {} }
    };
    ov.querySelector("#popClose").onclick = function () { ov.remove(); };
    ov.querySelector("#codeRestore").onclick = function () {
      var val = ov.querySelector("#codeIn").value;
      var fb = ov.querySelector("#codeFb");
      if (!val.trim()) { fb.className = "feedback show bad"; fb.textContent = "请先粘贴进度码。"; return; }
      var r = decodeProgress(val);
      if (r.err) { fb.className = "feedback show bad"; fb.textContent = r.err; return; }
      ov.remove();
      toast("✅ 恢复成功：新增 " + r.added + " 个已掌握词语");
      renderHome();
    };
  }

  /* ---------- boot ---------- */
  function boot() {
    app.innerHTML = '<div class="topbar"></div><div class="wrapper" id="view">' +
      '<div class="loading">正在装载词库…</div></div>' +
      '<div class="beta-chip">测试版 v0.3 · 未登入</div>';
    setTopbar("landing", "");

    fetch(STREAM + ".json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (json) {
        DATA = json;
        json.levels.forEach(function (lv) {
          LEVELS.push(lv.level);
          lv.units.forEach(function (u) {
            var count = 0;
            u.components.forEach(function (c) {
              var ids = [];
              c.words.forEach(function (w) {
                WORDS.push({
                  id: w.id, w: w.w, py: w.py, pos: w.pos, zh: w.zh, en: w.en,
                  cloze: w.cloze,
                  level: lv.level, unit: u.unit, component: c.component
                });
                ids.push(w.id);
                count++;
              });
              COMP_LIST.push({ key: lv.level + "·" + u.unit + "·" + c.component, level: lv.level, unit: u.unit, component: c.component, ids: ids });
            });
            UNIT_LIST.push({ key: lv.level + "·" + u.unit, level: lv.level, unit: u.unit, count: count });
          });
        });
        scope = new Set(UNIT_LIST.map(function (u) { return u.key; }));
        renderHome();
      })
      .catch(function (err) {
        view().innerHTML = '<div class="error-box"><b>词库装载失败</b><br>' +
          '<span style="font-size:12.5px;color:#5A7080">请通过网页服务器访问（GitHub Pages 或本地 server），' +
          '直接双击打开 HTML 文件无法读取词库。<br>技术信息：' + esc(err.message) + '</span></div>';
      });
  }

  boot();
})();
