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
  function checkBadges() {
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
    if (earned.length) { saveStore(); queueCelebrations(earned); }
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
  function queueCelebrations(items) {
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
  function distractorsFor(target, pool, n) {
    var same = pool.filter(function (w) {
      return w.id !== target.id && w.w !== target.w && w.pos === target.pos;
    });
    var any = pool.filter(function (w) { return w.id !== target.id && w.w !== target.w; });
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

    html += '<div class="section-label">复习范围 · 可多选</div><div class="card" id="scopeCard">';
    var byLevel = {};
    UNIT_LIST.forEach(function (u) { (byLevel[u.level] = byLevel[u.level] || []).push(u); });
    Object.keys(byLevel).forEach(function (lv) {
      html += '<div class="scope-level">' + esc(lv) + '</div><div class="units">';
      byLevel[lv].forEach(function (u) {
        var on = scope.has(u.key) ? " on" : "";
        html += '<button class="unit' + on + '" data-k="' + esc(u.key) + '">' + esc(u.unit) + ' · ' + u.count + '词</button>';
      });
      html += '</div>';
    });
    html += '<div class="units" style="margin-top:10px">' +
      '<button class="unit" id="selAll">全选</button>' +
      '<button class="unit" id="selNone">清空</button></div>' +
      '<div class="scope-sum" id="scopeSum"></div></div>';

    html += '</div><div class="home-right">' +
      '<div class="section-label">今日路线 · 选择你的营地</div><div class="camps">' +
      camp("flash", "📖", "词语闪卡", "看词认义，点读发音") +
      camp("cloze", "✍️", "填空挑战", "读句子，填出词语 · 可选难度") +
      camp("zhmcq", "🔎", "华文解释", "看释义，选出词语") +
      camp("enmcq", "🌐", "英文翻译", "看英译，选出词语") + '</div>';

    html += '<div class="section-label" style="margin-top:18px">词语游乐场</div><div class="camps">' +
      camp("rain", "🌧️", "词雨", "词语从天而降，打字消灭它们") +
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
      '<div><b>' + mastered + '</b><span>已掌握词语</span></div>' +
      '<div><b>' + t.c + '</b><span>累计答对</span></div>' +
      '<div><b>' + (t.a ? Math.round(100 * t.c / t.a) + "%" : "–") + '</b><span>正确率</span></div>' +
      '<div><b>🔥 ' + store.bestStreak + '</b><span>最高连对</span></div></div>' +
      '<div class="home-foot">测试版：进度仅保存在此设备。登入与排行榜稍后加入。</div></div></div>';

    view().innerHTML = html;

    Array.prototype.forEach.call(view().querySelectorAll(".unit[data-k]"), function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-k");
        if (scope.has(k)) scope.delete(k); else scope.add(k);
        btn.classList.toggle("on");
        updateScopeSum();
      };
    });
    document.getElementById("selAll").onclick = function () {
      UNIT_LIST.forEach(function (u) { scope.add(u.key); }); renderHome();
    };
    document.getElementById("selNone").onclick = function () { scope.clear(); renderHome(); };
    document.getElementById("badgeStrip").onclick = renderAchievements;
    Array.prototype.forEach.call(view().querySelectorAll(".camp[data-mode]"), function (btn) {
      btn.onclick = function () {
        if (!scopedWords().length) { alert("请先选择至少一个单元。"); return; }
        var mode = btn.getAttribute("data-mode");
        if (mode === "rain") return renderRainConfig();
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
      inner = '<div class="w">' + esc(w.w) + '</div><div class="py">' + esc(w.py) + '</div>' +
        '<div class="hinttap">点击卡片查看释义</div>';
    } else {
      inner = '<div class="w back-w">' + esc(w.w) + '</div>' +
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
      if (e.target.id === "ttsZh") return;
      state.revealed = !state.revealed; renderFlash(state);
    };
    document.getElementById("ttsW").onclick = function () { speak(w.w); };
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
            String.fromCharCode(65 + idx) + '</span>' + esc(o.w) + '</button>';
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
      if (right) { state.correct++; markMastered(w); sfxOk(); } else { sfxBad(); }
      speak(w.w);
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
          if (!ans.dataset.tried) { ans.dataset.tried = "1"; return; }
          done = true;
          fb.className = "feedback show bad";
          fb.innerHTML = "✘ 正确答案：<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
          finish(false);
        }
      }
      document.getElementById("chk").onclick = submit;
      ans.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    } else {
      var locked = false;
      Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
        btn.onclick = function () {
          if (locked) return; locked = true;
          var chosen = state._opts[parseInt(btn.getAttribute("data-i"), 10)];
          var right = chosen.id === w.id;
          Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
            var o = state._opts[bi];
            if (o.id === w.id) {
              b.classList.add("right");
              b.innerHTML += '<span class="py">' + esc(o.py) + '</span>';
            } else if (o === chosen) b.classList.add("wrong");
          });
          var fb = document.getElementById("fb");
          fb.className = "feedback show " + (right ? "ok" : "bad");
          fb.innerHTML = (right ? "✔ 正确！" : "✘ 正确答案：") + "<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
          finish(right);
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
          String.fromCharCode(65 + idx) + '</span>' + esc(o.w) + '</button>';
      }).join("") + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›</button></div></div></div>';

    var tp = document.getElementById("ttsP");
    if (tp) tp.onclick = function () { speak(w.zh); };
    var locked = false;
    Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
      btn.onclick = function () {
        if (locked) return; locked = true;
        var chosen = opts[parseInt(btn.getAttribute("data-i"), 10)];
        var right = chosen.id === w.id;
        noteStreak(state, right);
        if (right) { state.correct++; sfxOk(); } else { sfxBad(); }
        bump(state.mode, right);
        Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
          var o = opts[bi];
          if (o.id === w.id) {
            b.classList.add("right");
            b.innerHTML += '<span class="py">' + esc(o.py) + '</span>';
          } else if (o === chosen) b.classList.add("wrong");
        });
        speak(w.w);
        document.getElementById("nextRow").style.display = "flex";
        document.getElementById("next").onclick = function () { state.i++; renderStep(state); };
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
      '<div class="mode-desc">词语从天而降，在落入大海前把它打出来！<br>字数越多、消灭得越高、连击越长，得分越高。</div>' +
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
    var pool = scopedWords();
    setTopbar("home", "");
    view().innerHTML =
      '<div class="rain-shell">' +
      '<div class="rain-hud">' +
      '<span>得分 <b id="rScore">0</b></span>' +
      '<span>连击 <b id="rCombo">×1</b></span>' +
      '<span>波次 <b id="rWave">1</b></span>' +
      '<span id="rLives">❤️❤️❤️</span>' +
      '<button class="nav-btn" id="rPause" style="margin-left:auto;padding:6px 14px">⏸ 暂停</button></div>' +
      '<div class="rain-area" id="rArea"><div class="rain-sea"></div></div>' +
      '<div class="rain-input-row">' +
      '<input class="answer-input" id="rInput" autocomplete="off" placeholder="打出词语，按 Enter 消灭…">' +
      '<button class="check-btn" id="rFire">发射</button></div></div>';

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
      o.el.classList.add("pop");
      (function (el) { setTimeout(function () { el.remove(); }, 220); })(o.el);
      live.splice(hit, 1);
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
        '<div class="sub">词雨 · 消灭 ' + cleared + ' 个词语 · 第 ' + wave + ' 波</div>' +
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
      '<div class="streak">连胜 <b>' + streak + '</b> 🏮</div></div>' +
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

  /* ---------- boot ---------- */
  function boot() {
    app.innerHTML = '<div class="topbar"></div><div class="wrapper" id="view">' +
      '<div class="loading">正在装载词库…</div></div>' +
      '<div class="beta-chip">测试版 v0.2 · 未登入</div>';
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
