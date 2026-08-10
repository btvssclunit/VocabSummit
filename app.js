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

  /* ---------- 昵称词库 (nickname pools) ---------- */
  var DESC_CATS = {
    "坚毅拼搏": [{w:"百折不挠",zh:"无论遭受多少挫折都不屈服"},{w:"持之以恒",zh:"坚持做下去"},{w:"坚持不懈",zh:"坚定不移地做下去"},{w:"坚持到底",zh:"一直坚持到最后，不在中途放弃"},{w:"全力以赴",zh:"拿出全部力量去做"},{w:"孜孜不倦",zh:"勤奋不懈怠"},{w:"锲而不舍",zh:"坚持雕刻不放弃，比喻做事有恒心，不半途而废"},{w:"勇往直前",zh:"勇敢地一直往前走，不退缩"},{w:"脚踏实地",zh:"做事踏实，不浮夸不虚假"},{w:"迎难而上",zh:"面对困难毫不退缩，主动迎接挑战"},{w:"坚忍不拔",zh:"意志坚定，不可动摇"},{w:"自强不息",zh:"自己努力向上，永不懈怠"}],
    "智慧机敏": [{w:"高瞻远瞩",zh:"目光远大，考虑深远"},{w:"融会贯通",zh:"把知识综合理解"},{w:"入木三分",zh:"形容见解、议论深刻"},{w:"言简意赅",zh:"话语简短，内容完整"},{w:"足智多谋",zh:"智慧多，谋略广"},{w:"聪明伶俐",zh:"头脑灵活，反应敏捷"},{w:"博学多才",zh:"学识渊博，才能多样"},{w:"触类旁通",zh:"掌握一件事的知识，能推知同类的事物"},{w:"随机应变",zh:"根据情况灵活应对"},{w:"才思敏捷",zh:"思维敏锐，反应迅速"},{w:"见多识广",zh:"见闻广博，经验丰富"},{w:"举一反三",zh:"从一件事情类推而知道其他许多事情"},{w:"明察秋毫",zh:"观察极为敏锐，连极细微的事物都能看清"},{w:"满腹经纶",zh:"学识渊博，胸怀治国的才能"},{w:"冰雪聪明",zh:"形容人非常聪明"},{w:"才华横溢",zh:"才能出众，充分显露"}],
    "仁爱慷慨": [{w:"恻隐之心",zh:"看到他人遭受痛苦时自然产生的同情心"},{w:"海纳百川",zh:"形容气度宽广，能容纳各方"},{w:"慷慨解囊",zh:"毫不吝啬地拿出钱来帮助"},{w:"推己及人",zh:"从自己的处境推想到别人的处境，关心体谅他人"},{w:"雪中送炭",zh:"在别人困难时给予帮助"},{w:"乐善好施",zh:"乐于行善，喜欢施舍济助他人"},{w:"与人为善",zh:"善意帮助别人"},{w:"助人为乐",zh:"把帮助别人当作快乐的事"},{w:"古道热肠",zh:"待人真诚热情，富有同情心"},{w:"善解人意",zh:"善于体察、理解别人的心意"},{w:"宽宏大量",zh:"度量大，能容人"},{w:"体贴入微",zh:"关怀细致周到"}],
    "专注严谨": [{w:"聚精会神",zh:"集中精神"},{w:"专心致志",zh:"一心一意，集中注意力"},{w:"心无旁骛",zh:"专心一意，不受其他事情干扰"},{w:"一丝不苟",zh:"形容办事认真，一点儿不马虎"},{w:"有条不紊",zh:"有条理，有次序，一点儿不乱"},{w:"精益求精",zh:"已经很好了，还要求更好"},{w:"深思熟虑",zh:"深入细致地反复思考"},{w:"谨慎周全",zh:"做事小心细致，考虑周到"},{w:"认真负责",zh:"做事态度认真，对结果负责"},{w:"严谨细致",zh:"态度严肃周密，做事细心"}],
    "活力热忱": [{w:"生龙活虎",zh:"形容精力充沛，充满活力"},{w:"兴致勃勃",zh:"形容兴趣很高，精神饱满"},{w:"慷慨激昂",zh:"情绪激动高昂"},{w:"朝气蓬勃",zh:"精神振奋，充满生命力"},{w:"神采奕奕",zh:"精神饱满，容光焕发"},{w:"精神抖擞",zh:"形容精神振奋，情绪高涨"},{w:"意气风发",zh:"精神振奋，气概豪迈"},{w:"活力四射",zh:"充满活力，感染力强"},{w:"热情洋溢",zh:"充满热烈的情感"},{w:"斗志昂扬",zh:"战斗的意志高昂"},{w:"热血沸腾",zh:"情绪激动，充满干劲"},{w:"生气勃勃",zh:"富有生命力和活力"}],
    "正直担当": [{w:"光明磊落",zh:"心地光明坦白，做事正大光明"},{w:"刚正不阿",zh:"刚强正直，不偏袒，不逢迎"},{w:"正气凛然",zh:"态度严正，令人敬畏"},{w:"大公无私",zh:"办事公正，没有私心"},{w:"敢作敢当",zh:"敢于做事，也敢于承担责任"},{w:"正直无私",zh:"品行端正，没有私心"},{w:"勇于担当",zh:"勇敢地承担责任"},{w:"公正严明",zh:"处事公平，赏罚分明"}],
    "诚信真挚": [{w:"言出必行",zh:"说了就一定做到"},{w:"一诺千金",zh:"说话算数，守信用"},{w:"推心置腹",zh:"真诚地倾心相待，毫无保留地交谈"},{w:"以礼待人",zh:"用礼貌的态度对待别人"},{w:"诚实守信",zh:"待人诚恳，遵守承诺"},{w:"真心实意",zh:"心意真诚，没有虚假"},{w:"表里如一",zh:"内心与外表一致，言行一致"},{w:"坦诚相待",zh:"以真诚坦率的态度对待他人"},{w:"待人以诚",zh:"用真诚的态度对待别人"}],
    "团结情谊": [{w:"群策群力",zh:"大家一起想办法、出力"},{w:"同甘共苦",zh:"一起享受快乐，共同面对困难"},{w:"求同存异",zh:"保留共同点，保留不同意见"},{w:"兼容并蓄",zh:"同时容纳不同的事物"},{w:"同心协力",zh:"团结一致，共同努力"},{w:"齐心协力",zh:"大家一条心，共同努力"},{w:"和衷共济",zh:"同心协力，共同克服困难"},{w:"众志成城",zh:"大家团结一致，力量无比强大"},{w:"团结一心",zh:"大家一条心，紧密团结"},{w:"互帮互助",zh:"互相帮助，共同进步"}],
    "吉祥美好": [{w:"大吉大利",zh:"非常吉祥如意"},{w:"花好月圆",zh:"比喻美好幸福，多用于祝福婚姻或节日"},{w:"龙凤呈祥",zh:"比喻吉祥如意，常用于婚礼或喜庆场合"},{w:"一帆风顺",zh:"比喻非常顺利"},{w:"万事大吉",zh:"一切事情都很顺利"},{w:"诸事大吉",zh:"所有的事情都吉祥顺利"},{w:"繁荣昌盛",zh:"兴旺发达"}],
    "卓越非凡": [{w:"别具一格",zh:"具有独特的风格"},{w:"出类拔萃",zh:"才能超过一般人"},{w:"大显身手",zh:"充分显示自己的本领"},{w:"独树一帜",zh:"独特地树立自己的旗帜，形容有独特的风格或成就"},{w:"独一无二",zh:"没有相同的，唯一的"},{w:"凤毛麟角",zh:"比喻极为稀少珍贵的人才或事物"},{w:"举世无双",zh:"全世界找不到第二个"},{w:"脱颖而出",zh:"才能全部显露出来"}],
    "从容自在": [{w:"从容不迫",zh:"镇定沉着，不慌不忙"},{w:"悠然自得",zh:"心情闲适自在，从容满足"},{w:"泰然自若",zh:"遇事镇定，态度从容"},{w:"镇定自若",zh:"遇到事情沉着冷静，不慌乱"},{w:"气定神闲",zh:"心气平和，神态从容"},{w:"心平气和",zh:"心情平静，态度温和"},{w:"怡然自得",zh:"形容心情舒畅、满足的样子"},{w:"不慌不忙",zh:"从容镇定，不慌张"},{w:"淡定自如",zh:"态度从容镇定，应对自如"},{w:"安之若素",zh:"遇到不寻常的事仍像平常一样对待"},{w:"自得其乐",zh:"自己能从中得到乐趣"},{w:"随遇而安",zh:"能顺应环境，处处感到安适"}],
    "个性独特": [{w:"与众不同",zh:"跟大家不一样，有自己的特色"},{w:"独具匠心",zh:"具有独创性的巧妙心思"},{w:"卓尔不群",zh:"才德超出常人，与众不同"},{w:"不拘一格",zh:"不局限于一种规格或方式"},{w:"别出心裁",zh:"想出与众不同的巧妙办法"},{w:"独具一格",zh:"具有独特的风格"}]
  };

    var NOUN_CATS = {
    "神话异兽": ["麒麟","朱雀","玄武","青龙","白虎","九尾狐","貔貅","鲲"],
    "星宿天象": ["北斗","启明","织女","牵牛","太白","辰星","紫微"],
    "西游记人物": ["悟空","八戒","沙僧"],
    "三国人物": ["孔明","关羽","赵云","张飞","周瑜"],
    "文人游侠": ["墨客","行者","学士","旅人"],
    "红楼人物": ["宝玉","黛玉","宝钗","探春","湘云"],
    "经典故事人物": ["花木兰","愚公","精卫","夸父"],
    "身份泛称": ["状元","书生","侠客","樵夫","渔夫","匠人","商人","农夫"],
    "可爱动物": ["熊猫","狐狸","猫头鹰","水獭","松鼠","企鹅","考拉","刺猬","仓鼠","柴犬","兔子","锦鲤"],
    "花草植物": ["梅","兰","竹","松","荷","柳","榕","枫","桂","牡丹"],
    "自然元素": ["星辰","明月","流云","长风","雷霆","云霞","山雾","长虹","晨露"],
    "文化器物": ["玉盘","算盘","香囊","罗盘","折扇","灯笼","竹简","印玺","锦囊","铜镜"]
  };
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
  function sfxOk() { tone(660, 0, 0.10); tone(880, 0.08, 0.10); tone(1175, 0.16, 0.22); }  // rising 3-note reward chime
  function sfxBad() { tone(180, 0, 0.22, "square", 0.07); }
  function sfxBadge() { tone(523, 0, 0.14); tone(659, 0.12, 0.14); tone(784, 0.24, 0.14); tone(1047, 0.36, 0.3); }
  function sfxLife() { tone(240, 0, 0.14, "square", 0.08); tone(180, 0.12, 0.2, "square", 0.08); }
  function sfxThunder() { tone(85, 0, 0.22, "square", 0.05); tone(55, 0.1, 0.34, "square", 0.055); }
  /* 词雨 pixel FX strip (splash 3 · lightning 2 · ripple 2), base64-embedded */
  var RAINFX_MAP = {"sp1": [0, 57, 37, 44], "sp2": [39, 56, 56, 45], "sp3": [97, 62, 52, 39], "bolt1": [151, 8, 26, 93], "bolt2": [179, 0, 40, 101], "rip1": [221, 83, 44, 18], "rip2": [267, 79, 60, 22]};
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
    s.sprintMode = s.sprintMode || "zh"; // 攀山竞速 question mode: zh|en|cloze
    s.diff = s.diff || "3";            // cloze difficulty: 2|3|4|type
    s.goalMode = s.goalMode || { type: "unit", n: 20 }; // 我的词山 SDT goal
    s.bestStreak = s.bestStreak || 0;
    s.lingLu = s.lingLu || 0;          // 灵露 currency (number), earned in 词雨灵露
    s.deco = s.deco || {};             // 营地商店 decorations owned: shopKey -> 1
    s.gym = s.gym || {};               // 年度试炼 passed: level -> 1
    s.gymTodo = s.gymTodo || {};       // 试炼失手待巩固: level -> { wordId: 1 }
    s.homeTab = s.homeTab || "study";  // last home tab: study | play
    s.streak = s.streak || 0;          // 连续学习天数 (daily)
    s.lastActive = s.lastActive || ""; // last active local date "YYYY-MM-DD"
    s.lbScope = s.lbScope || "school"; // 排行榜 scope: school (校内) | all (跨校)
    return s;
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
    scheduleCloudSync();
  }

  /* ---------- cloud sync (Firestore backup, debounced) ---------- */
  var _cloudSyncTimer = null;
  function scheduleCloudSync() {
    if (!window.WSCloud || !window.WSCloud.isAvailable()) return;
    clearTimeout(_cloudSyncTimer);
    _cloudSyncTimer = setTimeout(function () {
      window.WSCloud.saveProgress(STREAM, store);
      pushLeaderboard();
    }, 2500);
  }
  function flushCloudSyncNow() {
    if (!window.WSCloud || !window.WSCloud.isAvailable()) return;
    clearTimeout(_cloudSyncTimer);
    window.WSCloud.saveProgress(STREAM, store);
    pushLeaderboard();
  }
  /* only 学生 profiles are published to the leaderboard (teachers/parents never are) */
  function pushLeaderboard() {
    if (!window.WSCloud || !window.WSCloud.saveLeaderboard) return;
    var p = loadProfile();
    if (!p || p.role !== "student") return;
    window.WSCloud.saveLeaderboard(STREAM, {
      nickname: p.nickname || "", school: p.school || "",
      altitude: Object.keys(store.mastered).length
    });
  }
  window.addEventListener("pagehide", flushCloudSyncNow);
  window.addEventListener("beforeunload", flushCloudSyncNow);

  /* merge cloud progress into local store — union only, mastery never
     decreases; used when a device's local storage has less than the cloud
     (e.g. fresh browser, cleared storage) */
  function mergeCloudProgress(cloud) {
    if (!cloud) return;
    var changed = false;
    Object.keys(cloud.mastered || {}).forEach(function (id) {
      if (!store.mastered[id]) { store.mastered[id] = 1; changed = true; }
    });
    Object.keys(cloud.badges || {}).forEach(function (k) {
      if (!store.badges[k]) { store.badges[k] = 1; changed = true; }
    });
    Object.keys(cloud.best || {}).forEach(function (k) {
      var v = Math.max(store.best[k] || 0, cloud.best[k] || 0);
      if (v !== store.best[k]) { store.best[k] = v; changed = true; }
    });
    if ((cloud.bestStreak || 0) > (store.bestStreak || 0)) { store.bestStreak = cloud.bestStreak; changed = true; }
    Object.keys(cloud.stats || {}).forEach(function (mode) {
      if (!store.stats[mode]) store.stats[mode] = { a: 0, c: 0 };
      var la = store.stats[mode].a || 0, lc = store.stats[mode].c || 0;
      var ca = (cloud.stats[mode] && cloud.stats[mode].a) || 0, cc = (cloud.stats[mode] && cloud.stats[mode].c) || 0;
      if (ca > la) { store.stats[mode].a = ca; changed = true; }
      if (cc > lc) { store.stats[mode].c = cc; changed = true; }
    });
    if (changed) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
    }
    return changed;
  }

  /* ---------- profile (nickname + school, shared across all 4 levels) ---------- */
  var PROFILE_KEY = "ws2_profile";
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch (e) { return null; }
  }
  function saveProfileLocal(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {}
    if (window.WSCloud && window.WSCloud.isAvailable()) window.WSCloud.saveProfile(p);
  }
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
    applyAmbience();
  }

  /* ---------- ambient backdrop: painterly progression art (bg-01..05) ----------
     The whole-app body backdrop evolves with overall mastery, shared across all
     four courses. bg-01..04 rotate by progression tier; bg-05 is the reward scene
     shown only once the course is complete (顶级词王). */
  var AMBIENCE = ["bg-01-staircase-sunrise.png", "bg-02-bamboo-forest.png",
                  "bg-03-ridge-clouds.png", "bg-04-snowpass-dusk.png"];
  function applyAmbience() {
    if (!WORDS.length) return;
    var img;
    if (store.badges && store.badges["t4"]) {
      img = "bg-05-summit-pavilion.png";                 // course complete: reward scene
    } else {
      var frac = Object.keys(store.mastered).length / WORDS.length;
      var i = Math.min(AMBIENCE.length - 1, Math.floor(frac * AMBIENCE.length));
      img = AMBIENCE[i];
    }
    document.body.style.backgroundImage =
      'linear-gradient(rgba(246,250,253,.5),rgba(246,250,253,.5)),url("' + img + '")';
  }

  /* ---------- daily streak (连续学习天数) — device-local ---------- */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function updateStreak() {
    var today = todayStr();
    if (store.lastActive === today) return;            // already counted today
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yesterday = y.getFullYear() + "-" + ("0" + (y.getMonth() + 1)).slice(-2) + "-" + ("0" + y.getDate()).slice(-2);
    store.streak = (store.lastActive === yesterday) ? (store.streak || 0) + 1 : 1;
    store.lastActive = today;
    saveStore();
  }

  /* ---------- 年度试炼 pets (四灵) + 待巩固 clearance ---------- */
  var PETS = [
    { emoji: "🐢", name: "灵龟" },   // 中一
    { emoji: "🦌", name: "麒麟" },   // 中二
    { emoji: "🐦", name: "凤凰" },   // 中三
    { emoji: "🐉", name: "神龙" }    // 中四
  ];
  function petFor(level) {
    var i = LEVELS.indexOf(level);
    if (i < 0) i = 0;
    return PETS[i] || PETS[PETS.length - 1];
  }
  /* any correct answer in a study mode clears that word from every level's
     待巩固 checklist, re-unlocking a relocked 年度试炼 (Option B recovery) */
  function gymNote(id) {
    var changed = false;
    Object.keys(store.gymTodo).forEach(function (lv) {
      if (store.gymTodo[lv] && store.gymTodo[lv][id]) { delete store.gymTodo[lv][id]; changed = true; }
    });
    if (changed) saveStore();
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
      '<img class="mh-img" src="landing_hero_bg.png" alt="">' +
      '<div class="app-zh">' + META.zh + '</div>' +
      '<span class="mtn-enter">⛰️ 我的词山 ›</span></div>';
  }

  /* ---------- home ---------- */
  /* home search bar: look up ANY word in this stream by 词/拼音(去声调)/释义 */
  function wireHomeSearch() {
    var hs = document.getElementById("homeSearch");
    if (!hs) return;
    ensureIdIndex();
    hs.oninput = function () {
      var q = hs.value.trim();
      var box = document.getElementById("hsResults");
      if (!box) return;
      if (!q) { box.innerHTML = ""; return; }
      var ql = q.toLowerCase();
      var matches = WORDS.filter(function (w) {
        if (w.w.indexOf(q) !== -1) return true;
        if (w.zh && w.zh.indexOf(q) !== -1) return true;
        var py = (w.py || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        return py.indexOf(ql) !== -1;
      }).slice(0, 30);
      if (!matches.length) { box.innerHTML = '<div class="hs-empty">没有找到相关词语。</div>'; return; }
      box.innerHTML = matches.map(function (w) {
        return '<button class="hs-row" data-id="' + esc(w.id) + '">' +
          '<div class="hs-w"><b>' + esc(w.w) + '</b> <span class="hs-py">' + esc(w.py) + '</span>' +
          ' <span class="hs-tag">' + esc(w.level) + '·' + esc(w.unit) + '</span></div>' +
          '<div class="hs-zh">' + esc(w.zh) + '</div></button>';
      }).join("");
      Array.prototype.forEach.call(box.querySelectorAll(".hs-row[data-id]"), function (r) {
        r.onclick = function () {
          var w = WORDS[_idIndex[r.getAttribute("data-id")]];
          if (w) speak(w.w);
        };
      });
    };
  }

  function renderHome() {
    setTopbar("landing", scopedWords().length + " 词在范围内");
    var t = totals();
    var mastered = Object.keys(store.mastered).length;
    var badgeCount = Object.keys(store.badges).length;
    var badgeTotal = COMP_LIST.length + UNIT_LIST.length + LEVELS.length + 1;

    var html = '<div class="home-grid"><div class="home-left">' + miniHorizon();

    html += '<div class="home-search card"><input type="text" id="homeSearch" class="hs-input" ' +
      'placeholder="🔎 搜索词语、拼音或释义…" autocomplete="off"><div class="hs-results" id="hsResults"></div></div>';

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
        html += '<button class="unit' + on + '" data-k="' + esc(u.key) + '"><b>' + esc(u.unit) + '</b>' +
          (u.theme ? '<span class="unit-theme">' + esc(u.theme) + '</span>' : '') +
          '<span class="unit-n">' + u.count + '词</span></button>';
      });
      html += '</div>';
    });
    html += '</div>';

    html += '</div><div class="home-right">' +
      '<div class="htabs">' +
      '<button class="htab' + (store.homeTab === "study" ? " on" : "") + '" data-tab="study">📖 修行</button>' +
      '<button class="htab' + (store.homeTab === "play" ? " on" : "") + '" data-tab="play">🎮 闯关</button></div>';

    if (store.homeTab === "play") {
      html += '<div class="section-label">词语游乐场</div><div class="camps">' +
        camp("rain", "🌧️", "词雨灵露", "词语化作灵雨落下，趁它落地前打出，收进宝缸得灵露") +
        camp("sprint", "⛰️", "攀山竞速", "90 秒登山冲刺 · 答对就攀升") +
        (STREAM === "g2" ? camp("assemble", "🧩", "组词挑战", "看释义点字，拼出词语") : "") +
        (STREAM !== "g1" ? camp("handle", "🀄", "词语汉兜", "四字词语猜猜看 · 六次机会") : "") + '</div>';
    } else {
      html += '<div class="section-label">今日路线 · 选择你的营地</div><div class="camps">' +
        camp("flash", "📖", "词语闪卡", "看词认义，点读发音") +
        camp("cloze", "✍️", "填空挑战", "读句子，填出词语 · 可选难度") +
        camp("zhmcq", "🔎", "华文解释", "看释义，选出词语") +
        camp("enmcq", "🌐", "英文翻译", "看英译，选出词语") + '</div>';
    }

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

    html += '<button class="wl-entry" id="wlEntry"><span class="flag">📋</span>' +
      '<div><b>我的词语表</b><span>看每个词的掌握情况 · 🔥 连续 ' + store.streak + ' 天</span></div>' +
      '<span class="go">查看 ›</span></button>';
    html += '<button class="wl-entry" id="lbEntry"><span class="flag">🏆</span>' +
      '<div><b>排行榜</b><span>看看你在本源流的排名（只显示学生）</span></div>' +
      '<span class="go">查看 ›</span></button>';

    html += '<div class="harbour">' +
      '<div id="masteryInfo" style="cursor:pointer"><b>' + mastered + '</b><span>已掌握词语 ⓘ</span></div>' +
      '<div><b>' + t.c + '</b><span>累计答对</span></div>' +
      '<div><b>' + (t.a ? Math.round(100 * t.c / t.a) + "%" : "–") + '</b><span>正确率</span></div>' +
      '<div><b>🔥 ' + store.bestStreak + '</b><span>最高连对</span></div></div>' +
      '<div class="home-foot">测试版：登入与排行榜稍后加入。<br>' +
      '<button class="code-link" id="nickDisplay">👤 ' + esc((loadProfile() || {}).nickname || "") + ' · 换昵称</button> · ' +
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
    Array.prototype.forEach.call(view().querySelectorAll(".htab[data-tab]"), function (btn) {
      btn.onclick = function () {
        var tab = btn.getAttribute("data-tab");
        if (store.homeTab === tab) return;
        store.homeTab = tab; saveStore(); renderHome();
      };
    });
    document.getElementById("badgeStrip").onclick = renderAchievements;
    document.getElementById("wlEntry").onclick = function () { renderWordList("all"); };
    document.getElementById("lbEntry").onclick = renderLeaderboard;
    wireHomeSearch();
    document.getElementById("masteryInfo").onclick = showMasteryInfo;
    var mh = view().querySelector(".mini-horizon");
    if (mh) mh.onclick = startMountain;
    document.getElementById("pcodeBtn").onclick = showProgressCode;
    document.getElementById("nickDisplay").onclick = function () {
      var cur = loadProfile() || {};
      renderNicknamePicker(function () { renderHome(); }, { dismissible: true, currentSchool: cur.school, currentRole: cur.role || "student", currentHeard: cur.heardFrom || "" });
    };
    Array.prototype.forEach.call(view().querySelectorAll(".camp[data-mode]"), function (btn) {
      btn.onclick = function () {
        if (!scopedWords().length) { alert("请先选择至少一个单元。"); return; }
        var mode = btn.getAttribute("data-mode");
        if (mode === "flash") return renderWordList("all");   // flashcards open the list-menu first
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
            (c.textTitle ? '<span class="ach-badge-title">' + esc(c.textTitle) + '</span>' : '') +
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

  /* ---------- 个人词语表 (personal word list) ----------
     Word-level visibility over the current 复习范围: 已掌握 (mastered) /
     待巩固 (in any gymTodo) / 未掌握. Tapping a row practises just that word.
     Read-only over the same store — no new per-word state invented. */
  var WL_LABEL = { done: "已掌握", todo: "待巩固", "new": "未掌握" };
  function wordStatus(w) {
    if (store.mastered[w.id]) return "done";
    var todo = false;
    Object.keys(store.gymTodo).forEach(function (lv) { if (store.gymTodo[lv] && store.gymTodo[lv][w.id]) todo = true; });
    return todo ? "todo" : "new";
  }
  function renderWordList(filter) {
    filter = filter || "all";
    ensureIdIndex();
    setTopbar("home", "");
    var words = scopedWords();
    var counts = { done: 0, todo: 0, "new": 0 };
    words.forEach(function (w) { counts[wordStatus(w)]++; });
    var chips = [["all", "全部", words.length], ["done", "已掌握", counts.done],
                 ["todo", "待巩固", counts.todo], ["new", "未掌握", counts["new"]]];
    var list = words.filter(function (w) { return filter === "all" || wordStatus(w) === filter; });
    var html = '<div class="wl-wrap">' +
      '<div class="wl-head"><div class="wl-title">📋 词语表</div>' +
      '<div class="wl-streak">🔥 连续学习 <b>' + store.streak + '</b> 天</div></div>' +
      '<div class="wl-sub">按年级 · 单元 · 板块排列。点单词单独练习，或用「闪卡」连续学习当前筛选的词。</div>' +
      '<div class="wl-filters">' + chips.map(function (c) {
        return '<button class="wl-chip' + (filter === c[0] ? " on" : "") + '" data-f="' + c[0] + '">' + c[1] + ' ' + c[2] + '</button>';
      }).join("") + '</div>' +
      '<div class="wl-actions"><button class="wl-flash" id="wlFlash">🃏 用闪卡学这 ' + list.length + ' 个词</button>' +
      '<span class="wl-hint">想只练不会的？先点上面的「未掌握」再开闪卡。</span></div>';
    if (!list.length) {
      html += '<div class="wl-empty">这个筛选下暂时没有词语。</div>';
    } else {
      html += '<div class="wl-list">';
      var curKey = "";
      list.forEach(function (w) {
        var gk = w.level + "·" + w.unit + "·" + w.component;
        if (gk !== curKey) {
          curKey = gk;
          html += '<div class="wl-group">' + esc(w.level) + ' · ' + esc(w.unit) + ' · ' + esc(w.component) + '</div>';
        }
        var st = wordStatus(w);
        html += '<button class="wl-row" data-id="' + esc(w.id) + '">' +
          '<div class="wl-w"><b>' + esc(w.w) + '</b><span class="wl-py">' + esc(w.py) + '</span></div>' +
          '<div class="wl-zh">' + esc(w.zh) + '</div>' +
          '<span class="wl-status s-' + st + '">' + WL_LABEL[st] + '</span></button>';
      });
      html += '</div>';
    }
    html += '</div>';
    view().innerHTML = html;
    Array.prototype.forEach.call(view().querySelectorAll(".wl-chip[data-f]"), function (b) {
      b.onclick = function () { renderWordList(b.getAttribute("data-f")); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".wl-row[data-id]"), function (r) {
      r.onclick = function () { practiceWord(r.getAttribute("data-id")); };
    });
    var wf = document.getElementById("wlFlash");
    if (wf) wf.onclick = function () { startFlashList(list); };
  }
  function startFlashList(words) {
    if (!words || !words.length) { alert("这个筛选下没有可学习的词语。"); return; }
    renderStep({ mode: "flash", seq: words.slice(), i: 0, correct: 0, revealed: false, streak: 0 });
  }
  function practiceWord(id) {
    ensureIdIndex();
    var w = WORDS[_idIndex[id]];
    if (!w) return;
    var hasCloze = w.cloze && w.cloze.indexOf("__") !== -1;
    var state = { mode: hasCloze ? "cloze" : "zhmcq", seq: [w], i: 0, correct: 0,
      revealed: false, streak: 0, fromWordList: true };
    renderStep(state);
  }

  /* ---------- 排行榜 (leaderboard) — per stream, students only ----------
     Ranked by altitude (mastered word count). 校内 filters to 百德中学; 跨校
     shows all schools. Tiers 1-10 金 / 11-20 银 / 21-30 铜. Own row highlighted;
     if outside top 30, a context window (±2) is shown after a divider. Every
     row shows the full UID so duplicate nicknames are never ambiguous. */
  var LB_BVSS = "百德中学 Bukit View Secondary School";
  function lbMedal(rank) { return rank <= 10 ? "🥇" : rank <= 20 ? "🥈" : rank <= 30 ? "🥉" : ""; }
  function lbTier(rank) { return rank <= 10 ? "gold" : rank <= 20 ? "silver" : rank <= 30 ? "bronze" : ""; }
  function renderLeaderboard() {
    setTopbar("home", "");
    var scope = store.lbScope || "school";
    view().innerHTML = '<div class="lb-wrap"><div class="wl-title">🏆 排行榜 · ' + esc(META.zh) + '</div>' +
      '<div class="wl-sub">按海拔（已掌握词数）排名 · 只显示「学生」</div>' +
      '<div class="lb-toggle">' +
      '<button class="lb-tab' + (scope === "school" ? " on" : "") + '" data-s="school">校内 · 百德中学</button>' +
      '<button class="lb-tab' + (scope === "all" ? " on" : "") + '" data-s="all">跨校 · 不限校</button></div>' +
      '<div id="lbBody"><div class="wl-empty">加载中…</div></div></div>';
    Array.prototype.forEach.call(view().querySelectorAll(".lb-tab[data-s]"), function (b) {
      b.onclick = function () { store.lbScope = b.getAttribute("data-s"); saveStore(); renderLeaderboard(); };
    });
    if (!window.WSCloud || !window.WSCloud.isAvailable()) {
      document.getElementById("lbBody").innerHTML = '<div class="wl-empty">排行榜需要联网，暂时无法加载。</div>';
      return;
    }
    if (!window.WSCloud.getLeaderboard) {
      document.getElementById("lbBody").innerHTML = '<div class="wl-empty">排行榜功能正在更新，请刷新页面后再试。</div>';
      return;
    }
    var getUid = window.WSCloud.getUid || function (cb) { cb(null); };
    getUid(function (myUid) {
      window.WSCloud.getLeaderboard(STREAM, function (rows) {
        var body = document.getElementById("lbBody");
        if (!body) return;
        if (!rows) { body.innerHTML = '<div class="wl-empty">加载失败，请稍后再试。</div>'; return; }
        if (scope === "school") rows = rows.filter(function (r) { return r.school === LB_BVSS; });
        if (!rows.length) { body.innerHTML = '<div class="wl-empty">还没有人上榜，快去成为第一个！</div>'; return; }
        var myIdx = -1, i;
        for (i = 0; i < rows.length; i++) { if (rows[i].uid === myUid) { myIdx = i; break; } }
        var TOP = 30, show = [];
        for (i = 0; i < Math.min(TOP, rows.length); i++) show.push(i);
        var winStart = -1;
        if (myIdx >= TOP) {
          winStart = Math.max(TOP, myIdx - 2);
          for (i = winStart; i <= Math.min(rows.length - 1, myIdx + 2); i++) show.push(i);
        }
        var out = "";
        show.forEach(function (idx) {
          if (idx === winStart) out += '<div class="lb-gap">· · ·</div>';
          var r = rows[idx], rank = idx + 1, tier = lbTier(rank), mine = (r.uid === myUid);
          out += '<div class="lb-row' + (tier ? " " + tier : "") + (mine ? " me" : "") + '">' +
            '<span class="lb-rank">' + lbMedal(rank) + ' ' + rank + '</span>' +
            '<div class="lb-id"><b>' + esc(r.nickname || "（无昵称）") + (mine ? " · 你" : "") + '</b>' +
            (scope === "all" && r.school ? '<span class="lb-school">' + esc(r.school) + '</span>' : "") +
            '<span class="lb-uid">' + esc(r.uid) + '</span></div>' +
            '<span class="lb-alt">' + r.altitude + ' 米</span></div>';
        });
        body.innerHTML = out;
      });
    });
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
      if (right) { state.correct++; markMastered(w); gymNote(w.id); sfxOk(); }
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
    var opts = shuffle([w].concat(distractorsFor(w, state.pool || scopedWords(), 3)));
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
          if (right) { state.correct++; sfxOk(); gymNote(w.id); }
          else if (state.gym) state.wrong[w.id] = 1;
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
    if (state.gym) return renderGymResult(state);
    if (state.fromWordList) {
      var w0 = state.seq[0];
      var ok = state.correct > 0;
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + (ok ? "✓ 已掌握" : "再接再厉") + '</div>' +
        '<div class="sub">' + esc(w0.w) + '　' + esc(w0.py) + '</div>' +
        '<div class="msg">' + esc(w0.zh) + '</div>' +
        '<div class="nav-row"><button class="nav-btn" id="again">再练一次</button>' +
        '<button class="nav-btn primary" id="home">‹ 回词语表</button></div></div>';
      document.getElementById("again").onclick = function () { practiceWord(w0.id); };
      document.getElementById("home").onclick = function () { renderWordList("all"); };
      return;
    }
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

  /* ---------- 年度试炼 (annual gym trial, meaning→word MCQ) ---------- */
  /* Cumulative trial (owner spec 2026-08-10): 30 words from the current year
     level, plus 10 random from EACH earlier level. So 中一 = 30, 中二 = 40,
     中三 = 50, 中四 = 60 — later trials review everything below them. */
  function buildGymSeq(level) {
    var idx = LEVELS.indexOf(level); if (idx < 0) idx = 0;
    var byLv = {};
    WORDS.forEach(function (w) { (byLv[w.level] = byLv[w.level] || []).push(w); });
    var involved = [level];
    var seq = shuffle((byLv[level] || []).slice()).slice(0, 30);
    for (var j = idx - 1; j >= 0; j--) {
      var lv = LEVELS[j];
      involved.push(lv);
      seq = seq.concat(shuffle((byLv[lv] || []).slice()).slice(0, 10));
    }
    var pool = [];   // distractor pool = every word from the involved levels
    involved.forEach(function (lv) { pool = pool.concat(byLv[lv] || []); });
    return { seq: shuffle(seq), pool: pool };
  }
  function startGym(level) {
    var g = buildGymSeq(level);
    if (g.seq.length < 4) { alert("本年级词语不足，暂时无法开启年度试炼。"); return; }
    var state = { mode: "zhmcq", seq: g.seq, i: 0, correct: 0, revealed: false,
      streak: 0, gym: level, pool: g.pool, wrong: {} };
    renderStep(state);
  }
  function renderGymResult(state) {
    ensureIdIndex();
    var level = state.gym, total = state.seq.length;
    var wrongIds = Object.keys(state.wrong);
    var passed = wrongIds.length === 0;
    setTopbar("home", "");
    if (passed) {
      store.gym[level] = 1; saveStore();
      var pet = petFor(level);
      sfxBadge();   // reward chime; the result screen below carries the celebration
      view().innerHTML = '<div class="result">' +
        '<div class="big">🏅 ' + esc(level) + ' 年度试炼通过！</div>' +
        '<div class="sub">' + state.correct + ' / ' + total + ' 全对</div>' +
        '<div class="msg">登山伙伴加入队伍：' + pet.emoji + ' <b>' + esc(pet.name) + '</b></div>' +
        '<div class="nav-row"><button class="nav-btn primary" id="home">回到词山</button></div></div>';
      document.getElementById("home").onclick = startMountain;
      return;
    }
    // Option B: never demote mastery/altitude; missed words enter 待巩固, trial relocks
    store.gymTodo[level] = store.gymTodo[level] || {};
    wrongIds.forEach(function (id) { store.gymTodo[level][id] = 1; });
    saveStore();
    var words = wrongIds.map(function (id) { var w = WORDS[_idIndex[id]]; return w ? esc(w.w) : null; }).filter(Boolean);
    view().innerHTML = '<div class="result">' +
      '<div class="big">' + state.correct + ' / ' + total + '</div>' +
      '<div class="sub">' + esc(level) + ' 年度试炼 · 还差一点</div>' +
      '<div class="msg">这些词进入「待巩固」，在修行中答对即可重开试炼：<br><b>' + words.join("、") + '</b><br>' +
      '<span style="font-size:12px">（掌握与海拔不受影响，只是试炼暂时上锁）</span></div>' +
      '<div class="nav-row"><button class="nav-btn" id="again">再试一次</button>' +
      '<button class="nav-btn primary" id="home">回到词山</button></div></div>';
    document.getElementById("again").onclick = function () { startGym(level); };
    document.getElementById("home").onclick = startMountain;
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
      '<div class="mode-name">🌧️ 词雨灵露</div>' +
      '<div class="mode-desc">词语化作灵雨随风而落，趁它落地前打出，化为灵露收进宝缸！<br>字数越多、接得越高、连击越长，得分越高。✨ 每接住一词得等同字数的灵露，可在「我的词山 · 你的营地」兑换营地装备。</div>' +
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
      alert("所选范围内适合词雨灵露的词语不足（需要至少 8 个 1–4 字的词语）。请扩大复习范围。");
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
      '<div class="rain-drops" id="rDrops">✨ 0</div></div></div>' +
      '<div class="rain-input-row">' +
      '<input class="answer-input" id="rInput" autocomplete="off" placeholder="打出词语，收集灵露…">' +
      '<button class="check-btn" id="rFire">收集</button></div></div>';

    var area = document.getElementById("rArea");
    var input = document.getElementById("rInput");
    var live = [];          // {el, w, x, y, sway, phase}
    var score = 0, combo = 1, cleared = 0, lives = 3, wave = 1, dew = 0;
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
      setTimeout(function () {
        if (!area.isConnected) return;
        fxSeq(["sp1", "sp2", "sp3"], b.offsetLeft + b.offsetWidth / 2, b.offsetTop + 10, 90);
      }, 430);
    }
    function fxShow(name, x, y, ms) {
      var m = RAINFX_MAP[name]; if (!m) return;
      var el = document.createElement("div");
      el.className = "rainfx";
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
    function splashAt(x) {                       // word lost to the water
      fxSeq(["sp1", "rip1", "rip2"], x, area.clientHeight - 30, 120);
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
      if (w.w.length === 4) {                    // 四字词语驾雷登场
        var lx = x + el.offsetWidth / 2;
        fxSeq(["bolt1", "bolt2", "bolt1", "bolt2"], lx, 118, 80);
        var fl = document.createElement("div");
        fl.className = "rain-flash"; area.appendChild(fl);
        setTimeout(function () { fl.remove(); }, 320);
        sfxThunder();
      }
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
      dew += o.w.w.length; // 灵露 = 字数，落袋为安
      cleared++; combo = Math.min(5, combo + (cleared % 3 === 0 ? 1 : 0));
      if (cleared % 10 === 0) { wave++; document.getElementById("rWave").textContent = wave; toast("🌊 第 " + wave + " 波来了！"); }
      sfxOk();
      collectToBarrel(o);
      live.splice(hit, 1);
      document.getElementById("rDrops").textContent = "✨ " + dew;
      document.getElementById("rWater").style.height = Math.min(100, dew * 2) + "%";
      document.getElementById("rScore").textContent = score;
      document.getElementById("rCombo").textContent = "×" + combo;
    }
    function gameOver() {
      over = true; running = false;
      cancelAnimationFrame(raf);
      live.forEach(function (o) { o.el.remove(); }); live = [];
      var best = store.best.rain || 0;
      var isBest = score > best;
      if (isBest) store.best.rain = score;
      store.lingLu += dew;          // bank the run's 灵露 into the wallet
      saveStore();
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + score + '</div>' +
        '<div class="sub">词雨灵露 · 接住 ' + cleared + ' 词 · 第 ' + wave + ' 波</div>' +
        '<div class="msg">✨ 收获灵露 ' + dew + ' · 现有 ' + store.lingLu + '（在词山营地兑换装备）</div>' +
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
    // Phones: drive the whole shell off the *visual* viewport so the game
    // stays fully visible above the on-screen keyboard (iOS keeps 100vh
    // fixed and scrolls the page instead — we pin scroll and shrink).
    function fitViewport() {
      var shell = view().querySelector(".rain-shell");
      if (!shell) return;
      if (window.visualViewport) {
        window.scrollTo(0, 0);
        var top = shell.getBoundingClientRect().top;
        shell.style.height = Math.max(300, window.visualViewport.height - top - 8) + "px";
        shell.style.minHeight = "0";
      }
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", fitViewport);
      window.visualViewport.addEventListener("scroll", fitViewport);
    }
    var _fitCleanup = setInterval(function () {
      if (!area.isConnected) {
        clearInterval(_fitCleanup);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", fitViewport);
          window.visualViewport.removeEventListener("scroll", fitViewport);
        }
      }
    }, 1500);
    fitViewport();
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
    /* starting hints: G2 = all four 声母 · G3 = 首字声母 · HCL = none */
    var startHints = STREAM === "g2" ? 4 : (STREAM === "g3" ? 1 : 0);
    var state = { answer: answer, rows: [], done: false, hintN: startHints, showDef: false };
    renderHandle(state);
  }
  function pyInitials(py) {
    return String(py).trim().split(/\s+/).map(function (s) {
      var m = s.toLowerCase().match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/);
      return m ? m[1] : s.charAt(0);
    });
  }
  function handleHintHtml(state) {
    /* 声母 chips live above the grid now; the rail only carries 释义 */
    var defOn = state.showDef || (!state.done && state.rows.length >= 2);
    if (!defOn) return "";
    return '<div class="handle-hints"><div class="hint-line">释义提示：' + esc(state.answer.zh) + '</div></div>';
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
      '<div class="stage">';
    var ini = pyInitials(state.answer.py);
    html += '<div class="handle-hintrow">';
    for (var hc = 0; hc < 4; hc++) {
      html += (hc < state.hintN)
        ? '<div class="handle-hint">' + esc(ini[hc]) + '</div>'
        : '<div class="handle-hint off">?</div>';
    }
    html += '</div><div class="handle-grid">';
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
      var hintsLeft = state.hintN < 4 || !state.showDef;
      html += '<div class="answer-row handle-input">' +
        '<input class="answer-input" id="hAns" autocomplete="off" maxlength="4" placeholder="输入四字词语…">' +
        '<button class="nav-btn" id="hHint"' + (hintsLeft ? "" : " disabled") + '>💡 提示</button>' +
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
    var hb = document.getElementById("hHint");
    if (hb) hb.onclick = function () {
      /* progressive: reveal the next 声母, then the 释义 */
      if (state.hintN < 4) state.hintN++;
      else state.showDef = true;
      tone(523, 0, 0.1); renderHandle(state);
    };
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
     攀山竞速 · 90-second climb sprint (all streams) — Phase 2
     Fixed viewport, camera-follow canvas world (no scrolling).
     Answering is the movement; altitude = mastered count (1 词 = 1 米).
     8-bit spritesheet climbers (4 attire rows) + tileset landmarks,
     all base64-embedded — no external requests.
     ================================================================== */
  /* draw full-image background; p = progress fraction 0-1 (unused, image shown full) */
  function drawPanorama(ctx, W, H, p) {
    if (!SPRINT_BG.complete || !SPRINT_BG.naturalWidth) return false;
    ctx.drawImage(SPRINT_BG, 0, 0, W, H);
    ctx.fillStyle = "rgba(12,24,48,.10)";
    ctx.fillRect(0, 0, W, H);
    return true;
  }
  /* frames: 0 idle · 1-2 walk · 3-4 climb A/B · 5 celebrate */
  var SPRITE_ROW = { g1: 0, g2: 1, g3: 2, hcl: 3 };
  var SPRITE_FW = 64, SPRITE_FH = 80;
  var TILE_MAP = {"slope": [0, 23, 64, 57], "rock": [66, 16, 61, 64], "steps": [129, 54, 42, 26], "pine": [173, 19, 40, 61], "cloud": [215, 48, 57, 32], "sign": [274, 32, 42, 48], "tent": [318, 44, 61, 36], "fire": [381, 40, 37, 40], "flag": [420, 33, 34, 47], "pavilion": [456, 0, 99, 80]};
  var SPRITE_IMG = new Image();
  SPRITE_IMG.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAFACAMAAACC8Vs5AAABg1BMVEUAAAAcISUxMEIAAAA1ACVQOiwzTl9XQFANACHypoz5wmcfIQA6BgBGZ3ZtTh9KLgAuKn+PQ0UxQxmkQCiCMimRaS7+5YnEjWYQImR3XVD/0LHVsWP0+vXbl0L1ri7DfSjqlABdGCqoYU/Yz4D4mFu7WyEeAEDVv6qRh31AS526m5lGG2CDNgD7zwy1lEMBFDxGZUNwWHyTi00dSaKuvK9peZMmJqje2cXAcAAVR3rocVv/39ZbTQDbaBezvXZnhGiUbAC7RgGlpV9hAAC81slUNn7DoQreSyr//8N6Ikz+cDDqz0CMobTi6abXvhmXVnbOUlLIuTo+QsgIQhqIcqD5cAgrAGPqy/SaDgDtusv861WXjxLqRgC8IwDLnsfGX3QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAj24GXAAAAYXRSTlMA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AyO6IgAAAbHhJREFUeNrtvQd727jyN2o0sQAmJUoUTdK0rC7LimwrTtzt9F52Tz//+v2/xZ0BKdvJOhGgPM99n/fe5dlNfLIBCUwfYDC/jY0/nz+fP58/nz+fP5//Dz6uS/j//atgzP0/SUPG2JpDqeNQ9otr57/GQO6yX10/dYQg6/PuVwkgHWfNrxNBScTw4dxdhw6uAwz8JQ0aCUcsx68nxFzAKgioAA63XYMrHSp/ifyOcCglDJSAoyjY0R9G4j/RIZAxImssnVIaSeZac4DK8ms8gjcwPXvuOiX1JLGfBDwgCs6hM7KT3UMkngu8YyCAzlrsj4D7hJTfd6iFDBHpliPhX5wGsRYe7iL/qHAcQR2+MTJmQzdr+4nAn6LodvYwA/0fEz/LjGWS4+jlK1AQ7YiH0kcq5jmE2lOfAQ2F/jzFF1hYc/x2OZBqFSIE5MfGBIyo0G8gS+lzHNOv837W9pIBl5L9tXoH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";
  var SPRINT_BG = new Image();
  SPRINT_BG.src = "sprint_bg.png";   // vertical panorama backdrop (separate repo file)
  var WALL_IMG = new Image();
  WALL_IMG.src = "climb-wall-tile.png";   // 攀山竞速 vertically-tiling rock wall
  /* Ledges (protruding shelves) traced on climb-wall-tile.png, ordered bottom→top
     within one tile: {x, y} as image fractions of each shelf's top surface. The
     climber lands on one of these every jump; the list repeats each tile. Re-trace
     if the wall image changes. */
  var SPRINT_LEDGES = [
    { x: 0.605, y: 0.804 }, { x: 0.332, y: 0.752 }, { x: 0.055, y: 0.586 },
    { x: 0.625, y: 0.583 }, { x: 0.107, y: 0.374 }, { x: 0.483, y: 0.326 },
    { x: 0.500, y: 0.156 }, { x: 0.850, y: 0.153 }
  ];
  var TILE_IMG = new Image();
  TILE_IMG.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAi0AAABQCAMAAADiFLV2AAABAlBMVEX/9qGibpzAY1v5//17kCuCwFW674X/y3+iP2sAAAAAAAA6AB9VV1SIgmx/RxQLIz0mNlgwTjSpbzBWOgDlrgAZOACEuxiftpzLsqvqKxkCZST0xbEmiyXAIgVbDAC6nHZYnABQKFAxXXbIfwDJ1+J/WUKtv8uv4gEzbQAmAEacCAD259L8pCbInCOhYgD/0Q1zFyRdsjPgyTuolkqwKzDuWTh0THSJp8PXUQCP3TLqqmBibyC55UhLhUtffp38fQDz+lUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACbDVwuAAAAQXRSTlP///////////8A/////////////////////////////////////////////////////////////////////////771nsgAAB5cSURBVHja7Z0JQyI5sMed1dl9pvogdEfAUaCFRlBuHEZ0HP3+n+pVVZI+oGnw2jdvh+wO9oEInV//60glHJ0e2n+8wQAGez4TQEDZE44OV/O/DosQIPalRQhxoOUPbmIxfxH70iJa83mZuhxo+a9Ly8lkAgpgj2ciLaPJ8EDLn0xLNQwnYbCHuoB4mYdheKDlT6YlDoeTyZ60TMJhWGa2DrT892mZ7EvLHGkZHmj5s3mBeehNm7CrCTEPAzjERAdavCkF0oxErukD9jA+D9SBlj87hhadztiLF7taHHc6gTpoyx9OC1TH1XEnpNiIGroxYVEbY2sesnN/PC0j1JbqaFfz4nHnQMuBFvRHfL/i72zs5Q4OtPzZfgtSsD8tcKDlT46IAMbjqCL9SqXiVxwHH/WPCm+Zhqw4lfnQi+NDLvePhqU1H48lkUL/rq40I/gD/zEtPj3iw9XV/HnseZ+cnculeA7987vZocfhJPCklRFLi972E4UhWion48AbwyfTkk33HLrn95IWIcbhUBkkUjquCmipVJQfD4ei5Kb/EFpub2u2HQTmd6MlHobKL6QF9/0cLb7/SLQI8am0dLuGlXpd7CrW+/DLcWCzzElYuJ6HdmiDlquMl2u8F3yQQeAtWvC5tLhuwgu16PTfkxc4GD+bVfHFZuwMo3CcQaJSQIuxR74laT4JNs0DaC/jQ2hZOhla6jVJlaD+vwNL6+REHUwf06JUtHEMFvNHQ4vxbAtoqeRoeXgINm9BHpD8MFrq1CwubhRJGf07yvL1bKZK049/jocyn3uQ61+hwjDwK1KmLNiYiBG5ujLaYkHBo5TEW1BJVFZfAF50ve47aLEhMwgH22232+2l1uiLSwJDTgx86iX6uTrrH1wXtjpIS+ZKcCVCOAxUmlhJaXEYka20hCH/dqan58M5vI8WGzJrWnpISzfRF2zCR1Z89al+BdJyfaDF9EbYqVZbX+y+03IXcYCw+IaWK22OrLZYTq4qeVpw+9HzFicLN7Yvha/U6Yze5bdAtPr582dKi+OgCfJFba3VP5UW9yvS0n5yDrBwFUsnDCc28TWah8Nw4Gs0rvjBOi/Wj7nKRNAsOpoWieeonDu0LzWZTDqd8bssEQTX16vrPC016a/D0vtEWgDOzq5XZ+2Lp4O6IC3V6mg4nNuauMV8Ph/5yk9ScamrW5TLvco6u9KfUwmDqatT+Erj6htp0R3T+vvn6vrsLEsLNl9kQ2k0Ta77iR0JsFqdYWvPDrScioEQEtscNWWIsgJKRpLl5KpigGFTk6MlDaqvkh0+qxCzYD7kNo9kRbw1gmbfFf2F+fWqvYOWXo9ogc/KibDXcqAlvRxkRP6ZP8yxm0NWFSMnWcfkaj31ktBiDJK1Tr5E15bacFCpmGDl6NX3M3orP/Gevubbeo0Wx5ESgyP2eElYXGfp+67jLj9FWVqrlaHlSR5yLkQLoqAAmgofjHOr3RUtKryX+LS53EuiLVdXnPi9opoGRfe5Cjzn7bSIa9POCmnx5fFt1zSDTw0jJVayj03Ygf+V38LZbDa7uDikdPH2MfGxblo0nKurq4SWjHawy5LkXjimTjJ41pHRBVQ8nGTi6dfSolD9S2lRt110d5GQeo/2l1JSVC2Rmkh+6KV5ekIHt43K0p8hMFIO/nR1wdvRz/oiRiuuEh2pZHIuJhCyIVOqN1fpb1YcswlvowWCnz81J8W0SMf3yVnRzWiLycH8qPf8jytqEOLiYrVSCqWlr9Rsdn7+Sery/6kSAwRpgU+9/+vXlaMtT4V3dDbuF6NDu2b/l/6RgIJPpY1fZqDRaFXy8V9Hi5DXhhb+0T5Ta7RIIbr1DVpM0q7+cRceiJazM+Lk6eJcPT3J80/xdEHGThwHIH8LP3qwyztjedGVCIk3y/iYkgS9gUQYMSFajCnCncRkZYelyRglPsTRa94qgLy+7mMzkWv/YoOWXnfprtHSy4RJPWwRfNBNr86p+fhPfdZYEcQP1YcHqj/8DWiBl/losEsIk9pJ68GknV6x/8wT7JH0rDnnp/vECsDrtYWqZHym5aJ/pu1Q+2I9gvY5EjJtqWnpduuZoLrbleIDaVFKfS4tVa9a9bzgN6AFFi9hWIVyb06k3Wxo8Cu5cv+09qmScLKDllTS9qdl8ZVikHa739ehSBs31brfIgkJx8moi/JtQI3tlp4CH0ELiBm+gYuLGT1gQ7/lU3rIW3iL34QWMUdaRmKniTaNRIEefX5glxH0D/Mo9FnwzRH9ICr6dGH57H60cD5uRYEQ0aI9F+wsJctpWTItvU+gBd/QjCNnjIcsLZ/RoeCNfhttEZ3nTseDXRdGz43f6PGtjdelKz07eCUtX133RMfN7fZsRo/ts7bqW1qklBYX163VsoYIjZObd2Qc9QG0CK1zK36caWCU+BRaqtXq+Leg5VQE+2bFQTRvms3m1M7EmGKf434THwE3eJvalB6giaeb+jS3JvCzp9Pp+p872utvW1JIW0hZHtukLErn9IkWZzst6sNpQTF7YloudCbXGCMplfiQGixaMhQb4KMIvCCgf0IM0vZ/RYuHHbrnFWIgLCT4axYHvctMZJqFSZnT6a+9gRb4SYHzNefCmBbeSmlJSZDuGhvMUZ6Wd1siDM0eLy4wMkNW+v3zGaVzyRadK/gYWjJK3Ay4NcW/Mg0GStPdMPLQEO0zcQvEX9/v7y7vmuDd3Xn4Hx3AfTHFXc+berl2yae/390JmFK7w3+Xl3d3dPy1tNC1k/InxUIX2D8rYkWpx3ZfKLrl6Am1OpJAA6BZWpbsx0hi5KO1xZfsqjAtF+dP9I40LR+iLeLhYfQwGj1k2uIh3R2N5p9mleA7lAZFFMn/pRuUx4tISwNpad5dXno3RMs9NqTl8vLmxrvBdklb1O5uiIrq/T3CpOikd9kM6PTdzc3rtYVuJtVfrfoX7b7O+DMtj30hAl54CkS9Z1mQWWXRGzXaXn6s30IEk4eLQZk691W/fYGkiI+xQ6d+a1Edjz1vPK6Oixq6vdNPMkaiMS3FGGlpftctKEc2aqLnMrUWB69XE8Gwlig7udRYnCmeNfaKHBtgv6e5PppytLNf0Ar9xHsYYyGTxkX1V6BIWVAYsecHpkyBcJBLm5yTztIWdtctOR9Ji/90Qfl+5UsUlXabhOWDLIRAWKrlLfgkdRk0GiWeiUCPW1w2dEPLUWrSyWNtpouEMRYgYHM1MQU+HuF16UwpdbrG2PqL7kMLQUIZXEsLupP0h1NabruupkWm2oJm6fNoOQVJeTlKzEmpc3S+9D9IW/BCBRmrXojLX6+tkNjz+Zf3je3GiPwWcWNoaVw20BxxKxxPFeSBYDQ0JeerCdojwU82BRGtLU+YOQ3oWwD9LIqIdtFCfP1kVlZ2HBHtkOBIgS+lYFocmk9UN2AYLqikW+OCj13Fxz9QW0hVKLnEyX/p+0iO/0H5XKKFP16wnZZqWUSNF3vdWw0m4V4so3LsosWKyyVuaKtRSKK4Y7+F+hxRQAemgX6KZmAZZdoSSUHZubtDN4UgEQN8Djoud2+gBQaCleXR0EKRc9uHIlqMjEjj4dIRGk8kYupd8aG0KIXu8zkRcs6JOal1BnH5KC93lHJhgPHWWlxiMY4eFmvgwn60AHMg9qTlssEeTONGFNJySTER9mBE83TI3b25IXsTRYOcskQRBOY0pVpwF83GlPzfV9DCEndyfTbr9yleNvnbfvtE9X02QnwFweZypamBqtelY1xcmmDEtHR7IkvLeyNotEJPDMkFZf51Zu7iXLePmLcoHjKsVBN94Zxu5kQ83fanxEs4grxaBcPRDlr4qojGfQktgmm5ubxMaOGf02Jt+f6d+jsiszMYgPiOv3BDRigqWioXvuML8emB5oWColfQwkMJj9c00JzS0u+ftPtSuyxejhanm6UFtaXm3t5qY/TBtICQfU3IrICWHdZon3Vm0Mvd0TxiaPtCxBBShj6TPZ9MOtVdFIs77uI9aGlkTBEjUPxk1ByiRTs2AHf81OVgsMkKHhINQ8tAP/t1tAiXyp6MW6vrE9hjUYoDZ6MsWVrq9cSRzYTPpDiORAc0oYXGifgdvZWVJxpJpBGiWZuGitrMDPFioCm9h/dJsInFqBQV00poAQy/F2nmaTEJO7tGA9EIgTFEREuxXORouTS0bIm5SVsuhfVoB/D9O9JSJCwExwC9nEbu9N1raIHFNU0X0iVPK+vfnmDcnNDi7UNLV9MisrT470mIEi0XnOmfnbVnPEiEezr3r+Vlez4XYLlPjIJGfs1HqW56u0FJEE1yMg4nE66Yf3mZTCbDcLjr84r7O/AajWcUFzGAO7GP33JDnitso6VxmdICmhYRbVu1nWi5S05TFm9/WkC4ae2t0RW0SUiKVIFEF89ex3QM2gwPJcPR9saq1SwtzpLGGLkmql7v1d6oLqAUcfGE1pGq57hsQdsjbYrUdlOE7nimR7f3WxzH1WwETbTkvdyguf3dw+N8/Fc47IRhJ1m4uIP7O/wWtAVweX//jDBgyNvYTovF5ZJMC27fwWfQ0mjsTQveHIYW7BOtLH15xh7LNAhsMoI2XkUL6Ypff++U14F46p+fk6z0z/UI9NMFEUS4qJIU3brh2PpM0RpVreti03Tj8Rou2ycwgDMZe+N5EKa4dFBbnneMYQnyWO4b4f19A+7uC2kRC9YWajfECrcGhrp70IKGqbGdlgH7LW+ghRZN+LpY8IBQRlmEoHw/DcfmrtretCB/S1f56SoM3benXtH9Rlr6F1TDTZao/eRrWvySRbA2bE8JLX/tyOWitJSI3+MEL9I8GIXhs+EFaQnLtYX9TORlOEFa7u8bJbRMeWznJqGF3JGiJ/+1TkuptuRh2p8WAeonzwFs91dJRg5t0GOfaNHKEltTZP0WmdCxNOULmbFoX5IJoukiy5qVlt4GLWUlOevPVOpcoT/r00jnBSuKKhcWvHpF1BX3XGuxM/G/fawYXuZhIGD44I0ZFJrLjrAMO1Wv5N2hZWsQJkPSFuJGFPwJHlW84aw8mo47dnMvefivkJbvr6Ul1RbYlxb37791dQI2pKWtR4aUomlrSgsLOrStWI/kJ7TIDC3c1mjhY7aeu0cz09beC3y73d5gbQyakrjyXAiMg56ezqkonV0WvyTDuj8tIl5zcoOsngbetKzbT+GfyaQpIHwxtCSuS2dc8ubwxiZInifIFXslUKAuHBOJ1FtAFwZlhvra35MW2E5L4y20iK92nLl9retHSFlIVYQvg4QW15FxaomkrWJZumSS0CjRkYQWybKCePS6ejCASy7X3ov4tr3VsyoOQCNDvvKV5Bwujxad4y5PANimF0UHb48LfVWIvaCsNUvHFMWcl7II557XyX1FR1kQzU4LwkLPG1JcdNnYRkvefG2PLRmP/Wl5m99ystBRM2XkDC1tskNRMmiyqDItThEt2oFBWnI1UKayTggdUXe7rt7NfnD39ltZq4lsdk6PI6L1oUfWFVP7f75NXQqPdo+Lnw27SlnLpGVOLgrSEs7n3jBHS2frL8I9Oy3P+kthhmyMCmId9lv2du7WvdzG7pgIXkeLEKsVzQFZrVYrU6itZlzaH6VqHLhujJaFki5eroqbBp6TpVBTWmwdJtXY0RlTg7lGSx0NTjEpeMJ1RGKFHJOGe7JBszSjRbqtzRMDH7Yu8oC0mMH5ktxLEMjIC/adfQYqtLSEoTfK01Ld9ocEKwvSMuGvEGqQn3t/KXZpy+to+f4KWtAS7ZFv+Up2aPXYpjHElSnr/3qG9y14QawTcigpSEssJSsNZGhZZmipFdAiuCKzXl/a3Q1a6tru1OvJo6blOE5pQWVZo+U8R4tao6VEDiwtJSSY4ehgzypuYEyIFoyZh16nk6NlLEpouR/ef6dvV50QLd/vGwVB9L60cHqW6ptuuKCFkvmCaZkKm7zN/KSxAMF+y6UwB9FFvWne3KiNIZKj7F0YXK+uV230VPQQ4qNSGDk/tZUI8KLFns3g4gWUZqQoSwutxnFr1/m5VX6+vtJZ+mAj6gJamK3j2+NvdfZ2j5md2+Pj2/ptneAUmby/ZcU2psX8kOz9pr13vNXHPT3FKN4pzsWkyR10z/g22Y8W9fKCWIyRlg72+lw0w9QYdZ47sCWWYlomz0P6WjJs34fD56Igem9aGAoqWBHEib5hSGqmehP83Jcq8j/2cnU5FJ+ZToMpwLobmNISPD6eaP/2WuNCU4cocm4rPYqIcCwWmhawDu8WWnrdY9+v5WlxNC3J/gYtcdxqtVyHHqnFrouPtbjlkuXL0DJL+CighXP/yStH1jsuXN6h15WuOb1t+QcIxiYbtw8tAATHmK631xkOJ+zoDhNanrcF0Tz0nNKCG894BN5DC9VOTm8MEawtmhZTGocaYoEBnnOmYyK9j+eo5oVYK9QWKrgz40LtMx0RUSQkVF8FupSMyzxGmTIPLl1dp8W4sT3fpxjaWdMWUU4L0xE7BpYW7Vl5SmlBJwWd26fZ7IzI4Iz/jCouCZcncnszcVH2o/a6m6z0esnO8ZYECsSj6v6zzxT5uCFJCyAt4WTM32Y4tJaoM97S2UDJfPJYJkdHZIoQmPt3+C0DqlOwMdEAIj9ix4QsUTQYfPlCRwfRl4hrXQY+eysmgh5EejegNI4YRFCkLRSHXpODS74t03LSblOAKqms344iUj48W4AYe3kvN6HlVkpOx61pi+9mi7k3tQX5cDO0ID2oN8RKnpZzogTf49M5Zf4vLtpECw8r6mn0iSXKftRub5OWbkrQMWylZe+5ihAIimiYFlrYuBPOX2DUydDS8XzYaopYVo6O5ojLZIhaA6dv15YBB0FmDDoiKETDxkRMCx79ArbWJcpF0PxgRhWjTW0BeDxbrVbpEGK/r1S/zYPNKp+bsrncsdbnarxBC/Eis7t2FhotSpfjJ0+LjFlbtMDo5rhsl/DpGISLjNfq+xoNIWZ67FmaikuSlYxj9opCmuMt37NiadnHbwniOWX4Q481nvL9w8m8GVhxIVo61eIxg4SWF6IFcbnfJ9+yXVuIlrvLmyn3d0UNuCSB9nHXXWpafqFwUK2UYp+Ya+fouPJZW3TtXDTYoEUI52yVHXAm9/ax/Ui0NLO06OSUZyIjdnPXLVFtOy2SlEVPCVinhWYsOXGu1AEVBQ+5dNShhaVSWmgZAcmMoAc+4/VbcMvSku108RpaigOnV9CiQDItw7GmhQOiicjT8gwKtmTnnllajo5eXibPz43G3eAdtGAvEy03rBsVGGRwGHwxtHzBo0nRZUqLFpwmTTai82uWyBb127oEWsKH5uawFUIsxtVcIlyP5VPSJA4K/JaanhxSqC3phPo8LQDf6ma4AORGAz7mOJC9GtaXF0ry1BDjuw3yOV/X7fX2g6Wnn7iJxN60kHvY4m9bHgf8XsZctBCOvObzcEjkMC0dWG5mgrnu/rJxHzItR+y0NAsq/PanhfrfzFjleR88n8hMdKYLR0D4oGMn/ZTMPOgBmJmtIrNyyzZazmZKBahIKlUSA0pS1hK/lhY80eOcPxVirnu5oL7VzUDS1ua4aj3jrYnhWn9hP3eWFl9ibLYfLNaB8aNNWh6q+2kLvqfRBO2QpWU0H3JA5FGc1BnhFtOCHRUVpY6bl/fPQ0sLJVsK8kCvoGVgrgiHQ3qlBD0JTaTBc/YyCp6Tlh4HsysKaDHDQTQe1OaaJ54ontOUKuf7dSBN2Vzs7lfR0uvxgmKU412jRfzNKbmyvH+dTm8aCsoKUCapKFcr3rIkYndjYFzsGRMpsfQnbG5Cm+AYsbbMR2MxtHaIWnODAYwdRrSKA3bRPfrIYw97NdClrOJNmf9k/lh2CKNg3pnIn84uzJE+t4iWx0cKL/pScZW2WJcVS4t2Vjibi7QE22iRZsK8lEttd6Sr14eqZ7TF6qwoHyGyvNwW0UIRG60yUUCL815aIpDWEtmVxKKtFU3BKdshdGxDe5lRTqhYYf6PB2NyXRJa8pU2GObR/RdAgH8HL2mTUjwxNPXKDvmpA9V9aAHBk3LM3BxurZrjilvccCOpTBzBN3KrVmthnyn6lboQLu4mv0fze1qt/LJvSAtPbBac4BfKKAvZHZoTsbC0tDg2kQahAI1DsEGLnQWdWVhM00KWpE6RNf5LV+9w8LoOiJbMABFSsWWsqLVJxMDUFgTeblo2PZjMEbuZK7qR8hHIEnnp+i2PT8WKBZE4FZMh+ifD9LsURsMJuSvDl7HoZGmB06y9jKRUHr4+AAWaeEU1LZwQDda+oApG+9GC11MPm9ST5iItuOvmSkmSBuKbpqVVq9WzrVaTuRvkaEC0nAjxta3QX1fSzv/QLm0rNkXMWVqSsfuC7FyOFpmhhVfQ7eGfl07q6lIfACX5k6YHi3gz+bQ8VFRACwg7nxDeR8tpIS39tjK0VJkW6bcfi/tnilgtkAikxURE2KodpIXqoCZjUbWsPHc6C/zM6tTMMgZFX0WJIhJUR/Q52Pzov0i6WW+l6oK2wdu9CD69biSd9Ybd2kVYYK1QzY0p5ozAaIvc/DWV83SP6OvD+n0fHvtKL7ERBEnNMipRHAeGEBp3JkHJujPVXbSYMoaktI7JcZZZWijDS/LCZU/faBqSaXVbH3Vcv/3mxkW0jEbGB908JzHO6SYWhtbS7K1FQfZIr/fjB/m5ve6P5BtP1ABOI7XwRZKdEzCbqf8pmHOMT8THv6lSoTOchInBh2Y4ZNdl0onFOKXlHv/EFB7+4VRVjcY6OCcm9Ngl/SaForQUGPZrHNs5kdDt1rFTWw7sqELF39tGSwtpidHa5JqLL2lpkQW0ZJ1toqWtME5FWkhUUBFTWlpcx6Jp8Wjcmetyq5mJEyktMilyyVoiyvhrbcmtAGR3LC2Uh9MZOScZJ3IpO8f/t3gQKUdEFPmDQRR0OmNyKgKpgOb05rzcDB970tJLaZEKYzB1pkQSQQs1O/OXSqqN4JeGLIES9uSmjDIrthlHZjKuQjyk8HSkwyIOb4Z86dgOALlut0DrhNEG4tIEtBsYB9CtD5aWOtFSW5aLi4jIQ8zpB19oxW4LOGtnzGkFrOsAmdNJKjVTmYe0mJVYlBER8mhNrhbJluncISP72SnBQSaXm5bjZmlZLjO0fKlprlJahKal1bI5XEdmBolsapc1M0cL18wFTRq5GntTqvikSrq1u+zHj55p6Va2JUd//PjFLfMnTmjg46yd0qL6vGyNquRdpxddEudzXg5lZGyiD1ILQoUHiiZVgHgyF5oWmrYozKDJcunGwKtR1Cn/HuH9j5Rgr5Gs4y/FkmmhV6u1lpS+lKUVFniX1GtFtLB6tIBXZNpQHnO6LsQmLbk0KtHCQZBSibtieSCyJVqetSnjxbQYFaNkbdYSOTk+3OSZWUsU84gQYxHrn0xL7NpxgE1tUZKqP6fjqqWFc3hrdipDw4/uJizdMlqm/ZNH9dhWgf60UyH6/b7s99c7h1wa7MwHXdgfAi/QwMuPgR6RRl46oyFamXEHaeHVguiaVbkGi8bSHCFbPHNPkJ9Ct4YifxOjTvxMTkRZbEF5KjQm2HESQaqXWCOQNPnCcTdoIS+wVawtsSPYB74VkHdqdOVjXlsCU/CTK1VOU/3ZA1kXl5uhRSa0WA6cDEE7aIlTWkyZgpGZZMeJ4wwt5xc8kV/BYgyAMhiQzYfH9iMG/0rJwopJ/0dhK6mgjNptSbR4oKuhBLKC6rJRW0dVugPOwFG+hdJaafnuPKnjHjdhXDW0BKdMS5pp1JUcMfjG74vwHseuQlqMjgikCSWni5ohbqmMtaTCV9bc7OJtiSWqU0ikHHOdW25mRI50myMKoXK/SB3gODKvLZL8FXRmY908MxUxjnVdvzmkz8VpDXyGFhrlJI3jBUHYJtGGztrTlu9blCLO5fOzokivns+s2dtBOppohjplTGZzv6qv+rMZ+hQLDOXiaky0BEISLWieKnmnwmQ0oVcES0/YJQb0Y8bCRGh5Zm1du3FmlyLpX6hoLeOCgS9kkstJWgtEZhlaegeqampN+HNk0UQ14uEwPBbToDv1D33gtJsEEtByUHnwSbUWeoIltERosZabtLBj8gVQ+7+0Wl++mBNfsCEtS+3m1tECRum6gfwqSyfK0wLiPS29hSG/KO9aqnDrTCGhR4cgN1DEs+szo0Yg09hRmSb5f9qQKm2yNL+5tnDwtmse4Qv1NxutEHy+8bqD/Sp2t6+yMGC1pbvILHADEX30NP4CbREo7yk4xBSlMdF644E0HvzbTOBiUyV9BGtrcb+PFaZlUDhvf3uzq0IMeNxMiD15hTVasi3lJdo26pfc9ZBeqJL+yzel/yEsb/2SpbKpAkmheXJN850E+886EB/fMmtx/y9+qWCGGxK56wAAAABJRU5ErkJggg==";
  var SPRINT_OPTS = [60, 90, 120];
  var SPRINT_MODES = [
    { k: "cloze", label: "✍️ 填空" },
    { k: "zh", label: "🔎 华文解释" },
    { k: "en", label: "🌐 英文翻译" }
  ];
  function altitudeNow() { return Object.keys(store.mastered).length; }
  function renderSprintConfig() {
    setTopbar("home", "");
    var best = store.best.sprint || 0;
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">⛰️ 攀山竞速</div>' +
      '<div class="mode-desc">登山冲刺：答对就向上攀登！<br>' +
      '第一次答对的新词会永久提升你的海拔（1 词 = 1 米）。优先出现你还没掌握的词。</div>' +
      '<div class="sprint-stats"><span>我的海拔 <b>' + altitudeNow() + ' 米</b></span>' +
      '<span>个人纪录 <b>' + best + ' 题</b></span></div>' +
      '<div class="diff-label">题目类型</div><div class="diff" id="modeSel">' +
      SPRINT_MODES.map(function (m) {
        return '<button class="dopt' + (m.k === store.sprintMode ? " on" : "") + '" data-m="' + m.k + '">' + m.label + '</button>';
      }).join("") + '</div>' +
      '<div class="diff-label">冲刺时长</div><div class="diff" id="secSel">' +
      SPRINT_OPTS.map(function (s) {
        return '<button class="dopt' + (s === store.sprintSecs ? " on" : "") + '" data-s="' + s + '">' + s + ' 秒</button>';
      }).join("") + '</div>' +
      '<div class="nav-row"><button class="nav-btn" id="back">‹ 回营地</button>' +
      '<button class="nav-btn primary" id="go">开始攀登 ›</button></div></div>';
    Array.prototype.forEach.call(view().querySelectorAll("#modeSel .dopt"), function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(view().querySelectorAll("#modeSel .dopt"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        store.sprintMode = b.getAttribute("data-m");
        saveStore();
      };
    });
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
    var smode = store.sprintMode || "zh";
    var all = scopedWords();
    if (smode === "cloze") all = all.filter(function (w) { return w.cloze && w.cloze.indexOf("__") !== -1; });
    if (all.length < 8) {
      alert(smode === "cloze"
        ? "所选范围内有填空句的词语不足（至少 8 个）。请扩大复习范围或改选其他题型。"
        : "请先选择足够的复习范围（至少 8 词）。");
      return;
    }
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
    var totalAlt = WORDS.length + 12;               // summit above last word
    var startAlt = altitudeNow();
    var climbAlt = startAlt;                        // rendered position (float)
    var targetAlt = startAlt;                       // moves +1 per correct answer
    var slipT = 0;                                  // wrong-answer wobble timer
    var celT = 0;                                   // celebrate-frame flash timer
    var best = store.best.sprint || 0;


    function resize() {
      var r = cv.getBoundingClientRect();
      cv.width = Math.max(280, Math.round(r.width));
      cv.height = Math.max(170, Math.round(r.height));
      ctx.imageSmoothingEnabled = false;
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
      var say = document.getElementById("spSay");
      if (smode === "en") {
        document.getElementById("spPrompt").textContent = cur.en;
        say.style.display = "none";   // English is never read aloud (TTS rule)
      } else if (smode === "cloze") {
        document.getElementById("spPrompt").textContent = cur.cloze;
        say.style.display = ""; say.onclick = function () { speakCloze(cur.cloze); };
      } else {
        document.getElementById("spPrompt").textContent = cur.zh;
        say.style.display = ""; say.onclick = function () { speak(cur.zh); };
      }
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
            ok++; combo++; celT = 0.55;
            targetAlt = Math.min(totalAlt, targetAlt + 1);
            gymNote(cur.id);
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

    /* ----- 8-bit sprite climber (falls back to blocks until image decodes) ----- */
    function drawClimber(x, y, moving, t, faceLeft) {
      var px = Math.round(x), py = Math.round(y);
      if (SPRITE_IMG.complete && SPRITE_IMG.naturalWidth) {
        var f = 0;
        if (celT > 0) f = 5;                            // celebrate flash
        else if (moving) f = 3 + (Math.floor(t * 5) % 2); // climb A/B alternate
        var row = SPRITE_ROW[STREAM] || 0;
        ctx.save();
        if (faceLeft) { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
        ctx.drawImage(SPRITE_IMG, f * SPRITE_FW, row * SPRITE_FH, SPRITE_FW, SPRITE_FH,
          px - SPRITE_FW / 2, py - SPRITE_FH + 6, SPRITE_FW, SPRITE_FH);
        ctx.restore();
        return;
      }
      var ff = moving ? (Math.floor(t * 6) % 2) : 0;
      ctx.fillStyle = "#2B2118"; ctx.fillRect(px - 5, py - 26, 10, 4);
      ctx.fillStyle = "#F2C9A0"; ctx.fillRect(px - 5, py - 22, 10, 7);
      ctx.fillStyle = streamAccent; ctx.fillRect(px - 6, py - 15, 12, 9);
      ctx.fillStyle = "#5A4636"; ctx.fillRect(px + 5, py - 16, 4, 8);
      ctx.fillStyle = "#33414D";
      if (ff === 0) { ctx.fillRect(px - 5, py - 6, 4, 7); ctx.fillRect(px + 1, py - 6, 4, 6); }
      else { ctx.fillRect(px - 5, py - 6, 4, 6); ctx.fillRect(px + 1, py - 6, 4, 7); }
    }
    /* draw a tileset object anchored at bottom-centre */
    function drawTile(name, x, y, s) {
      if (!TILE_IMG.complete || !TILE_IMG.naturalWidth) return;
      var m = TILE_MAP[name]; if (!m) return;
      var w = Math.round(m[2] * s), h = Math.round(m[3] * s);
      ctx.drawImage(TILE_IMG, m[0], m[1], m[2], m[3], Math.round(x - w / 2), Math.round(y - h), w, h);
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
      if (celT > 0) celT = Math.max(0, celT - dt);

      var W = cv.width, H = cv.height;
      var anchorY = H * 0.60;                   // the climber's feet rest here, on a ledge

      /* scrolling rock wall where the climber lands on a REAL ledge every jump.
         climbAlt is a ledge index (each correct answer = +1). SPRINT_LEDGES gives
         the shelves within one tile; the list repeats per tile so the wall tiles
         seamlessly and every landing sits on a shelf. */
      if (WALL_IMG.complete && WALL_IMG.naturalWidth) {
        var tileH = W * (WALL_IMG.naturalHeight / WALL_IMG.naturalWidth);
        var NL = SPRINT_LEDGES.length;
        var ledgeH = function (gi) {            // world art-height of ledge gi (up = larger)
          var tt = Math.floor(gi / NL), li = ((gi % NL) + NL) % NL;
          return (tt + 1 - SPRINT_LEDGES[li].y) * tileH;
        };
        var ledgeX = function (gi) {
          var li = ((Math.floor(gi) % NL) + NL) % NL;
          return SPRINT_LEDGES[li].x;
        };
        var i0 = Math.floor(climbAlt), fstep = climbAlt - i0;
        var curH = ledgeH(i0) + (ledgeH(i0 + 1) - ledgeH(i0)) * fstep;   // camera height

        var wLo = Math.floor((curH - (H - anchorY)) / tileH);
        var wHi = Math.floor((curH + anchorY) / tileH);
        for (var wt = wLo; wt <= wHi; wt++) {
          var sy = anchorY - ((wt + 1) * tileH - curH);
          ctx.drawImage(WALL_IMG, 0, Math.round(sy), W, Math.ceil(tileH) + 1);
        }
        ctx.fillStyle = "rgba(12,24,48,.12)"; ctx.fillRect(0, 0, W, H);   // depth wash

        if (best > 0) {                          // personal-record ledge line
          var recY = anchorY - (ledgeH(startAlt + best) - curH);
          if (recY > 14 && recY < H - 6) {
            ctx.strokeStyle = "rgba(255,220,120,.9)"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
            ctx.beginPath(); ctx.moveTo(0, recY); ctx.lineTo(W, recY); ctx.stroke(); ctx.setLineDash([]);
            ctx.font = "bold 11px sans-serif"; ctx.fillStyle = "#FFE9BD"; ctx.textAlign = "right";
            ctx.fillText("个人纪录", W - 10, recY - 6); ctx.textAlign = "left";
          }
        }

        var x0 = ledgeX(i0), x1 = ledgeX(i0 + 1);
        var slipX = slipT > 0 ? Math.sin(slipT * 25) * 3.5 : 0;
        var px = (x0 + (x1 - x0) * fstep) * W + slipX;
        var py = anchorY - Math.sin(fstep * Math.PI) * (tileH * 0.06);   // hop arc between ledges
        drawClimber(px, py, moving, t / 1000, x1 < x0);
      } else {
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#3B4A5A"); sky.addColorStop(1, "#6A7A88");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        drawClimber(W * 0.5, anchorY, moving, t / 1000, false);
      }
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
     我的词山 · persistent mountain world (Phase 3)
     One mountain per level app. Altitude = mastered count (1 词 = 1 米).
     Real curriculum landmarks: 板块驿站 (badge) · 单元营地 (tent+fire) ·
     年级峰 (flag) · 顶峰 (pavilion). Drag to pan, tap landmarks for
     details + word chip lists. SDT goal panel highlights the next target.
     ================================================================== */
  var _badgeImgCache = {};
  function badgeImgFor(component) {
    var src = BADGE_IMG[component] || "badge_hx.png";
    if (!_badgeImgCache[src]) { var im = new Image(); im.src = src; _badgeImgCache[src] = im; }
    return _badgeImgCache[src];
  }
  function buildMarks() {
    /* fixed map of the whole journey: cumulative word counts in WORDS order */
    var marks = [], cum = 0, i, c, side;
    marks.push({ t: "base", alt: 0 });   // 你的营地 — permanent landmark, always reachable
    var lastUnit = null, lastLevel = null, unitStartCum = 0, levelStartCum = 0;
    for (i = 0; i < COMP_LIST.length; i++) {
      c = COMP_LIST[i];
      if (lastUnit !== null && (c.level + "·" + c.unit) !== lastUnit.k) {
        marks.push({ t: "unit", alt: cum, level: lastUnit.level, unit: lastUnit.unit, fromAlt: unitStartCum });
        unitStartCum = cum;
      }
      if (lastLevel !== null && c.level !== lastLevel) {
        marks.push({ t: "level", alt: cum, level: lastLevel, fromAlt: levelStartCum });
        levelStartCum = cum;
      }
      cum += c.ids.length;
      side = (marks.length % 2 === 0) ? -1 : 1;
      marks.push({ t: "comp", alt: cum, comp: c, side: side });
      lastUnit = { k: c.level + "·" + c.unit, level: c.level, unit: c.unit };
      lastLevel = c.level;
    }
    if (lastUnit) marks.push({ t: "unit", alt: cum, level: lastUnit.level, unit: lastUnit.unit, fromAlt: unitStartCum });
    if (lastLevel) marks.push({ t: "level", alt: cum, level: lastLevel, fromAlt: levelStartCum });
    marks.push({ t: "summit", alt: cum });
    return marks;
  }
  function markDone(m) {
    if (m.t === "base") return true;
    if (m.t === "comp") return !!store.badges[badgeKeyC(m.comp)];
    if (m.t === "unit") return !!store.badges[badgeKeyU(m.level, m.unit)];
    if (m.t === "level") return !!store.badges[badgeKeyL(m.level)];
    return !!store.badges["t4"];
  }
  function markLabel(m) {
    if (m.t === "base") return "你的营地";
    if (m.t === "comp") return m.comp.unit + " · " + m.comp.component;
    if (m.t === "unit") return m.unit + " 营地";
    if (m.t === "level") return m.level + " 年级峰";
    return "顶峰";
  }
  function nextGoal(alt) {
    var g = store.goalMode, marks = buildMarks(), i, m;
    if (g.type === "count") {
      var n = g.n || 20;
      var next = (Math.floor(alt / n) + 1) * n;
      return { alt: next, label: "第 " + next + " 米里程碑", need: next - alt };
    }
    for (i = 0; i < marks.length; i++) {
      m = marks[i];
      if (m.alt > alt && (m.t === g.type || (g.type === "comp" && m.t === "comp") )) {
        return { alt: m.alt, label: markLabel(m), need: m.alt - alt, mark: m };
      }
    }
    return null;
  }
  function chipListHtml(ids) {
    var h = '<div class="chip-wrap">';
    ids.forEach(function (id) {
      var w = WORDS[_idIndex[id]];
      if (!w) return;
      h += '<span class="wchip ' + (store.mastered[id] ? "got" : "not") + '" data-say="' + esc(w.w) + '">' + esc(w.w) + '</span>';
    });
    return h + '</div><div class="pop-hint">金色 = 已掌握 · 虚线 = 待掌握 · 点词可发音</div>';
  }
  var _idIndex = {};
  function ensureIdIndex() {
    if (Object.keys(_idIndex).length) return;
    WORDS.forEach(function (w, i) { _idIndex[w.id] = i; });
  }
  function wireChips(ov) {
    Array.prototype.forEach.call(ov.querySelectorAll(".wchip"), function (ch) {
      ch.onclick = function () { speak(ch.getAttribute("data-say")); };
    });
  }
  /* 年度试炼 block shown inside the 年级峰 popover (folded in to avoid a
     second landmark colliding with the level flag at the same altitude) */
  function gymSectionHtml(m) {
    var level = m.level, pet = petFor(level);
    if (store.gym[level]) {
      return '<div class="gym-sec done">🏅 ' + esc(level) + ' 年度试炼已通过<br>登山伙伴：' +
        pet.emoji + ' ' + esc(pet.name) + '</div>';
    }
    var todo = store.gymTodo[level] || {}, todoIds = Object.keys(todo);
    if (todoIds.length) {
      var words = todoIds.map(function (id) {
        var w = WORDS[_idIndex[id]]; return w ? esc(w.w) : null;
      }).filter(Boolean);
      return '<div class="gym-sec lock">🔒 ' + esc(level) + ' 年度试炼 · 待巩固 ' + words.length + ' 词<br>' +
        '<span class="gym-todo">' + words.join("、") + '</span><br>' +
        '<span class="pop-hint">在「修行」中答对这些词即可重新开启试炼</span></div>';
    }
    var lvWords = WORDS.filter(function (w) { return w.level === level; });
    var lvGot = lvWords.filter(function (w) { return store.mastered[w.id]; }).length;
    var lvPct = lvWords.length ? Math.round(100 * lvGot / lvWords.length) : 0;
    if (lvPct < 80) {   // gate: master 80% of the year's words first
      return '<div class="gym-sec lock">🔒 先掌握本年级 80% 词语才能开启年度试炼<br>' +
        '<span class="gym-todo">当前进度 ' + lvPct + '%（' + lvGot + ' / ' + lvWords.length + ' 词）</span><br>' +
        '<span class="pop-hint">继续在「修行」中掌握本年级词语（赢取 ' + pet.emoji + ' ' + esc(pet.name) + '）</span></div>';
    }
    var n = buildGymSeq(level).seq.length;
    return '<div class="gym-sec">' +
      '<div class="pop-hint" style="margin-bottom:8px">共 ' + n + ' 题 · 含本级与以往各级词语 · 需全部答对方可通过</div>' +
      '<button class="nav-btn primary gym-go" id="gymGo">⚔️ 挑战 ' +
      esc(level) + ' 年度试炼（赢取 ' + pet.emoji + ' ' + esc(pet.name) + '）</button></div>';
  }
  function openMark(m) {
    ensureIdIndex();
    var html, ids, got, ov;
    if (m.t === "base") { return openCamp(); }
    if (m.t === "comp") {
      ids = m.comp.ids;
      got = ids.filter(function (id) { return store.mastered[id]; }).length;
      html = '<div class="pop-title"><img class="pop-badge" src="' + (BADGE_IMG[m.comp.component] || "badge_hx.png") + '" alt="">' +
        esc(m.comp.level + " · " + m.comp.unit + " · " + m.comp.component) + '</div>' +
        '<div class="pop-body">板块驿站 · 海拔 ' + m.alt + ' 米<br>已掌握 <b>' + got + '</b> / ' + ids.length + ' 词' +
        (markDone(m) ? " · 徽章已获得 🏅" : "") + '</div>' + chipListHtml(ids);
    } else if (m.t === "unit") {
      ids = [];
      COMP_LIST.forEach(function (c) { if (c.level === m.level && c.unit === m.unit) ids = ids.concat(c.ids); });
      got = ids.filter(function (id) { return store.mastered[id]; }).length;
      html = '<div class="pop-title">⛺ ' + esc(m.level + " · " + m.unit) + ' 营地</div>' +
        '<div class="pop-body">单元营地 · 海拔 ' + m.alt + ' 米<br>已掌握 <b>' + got + '</b> / ' + ids.length + ' 词' +
        (markDone(m) ? " · 单元徽章已获得 ✨" : "") + '</div>' + chipListHtml(ids);
    } else if (m.t === "level") {
      var units = UNIT_LIST.filter(function (u) { return u.level === m.level; });
      var uDone = units.filter(function (u) { return store.badges[badgeKeyU(u.level, u.unit)]; }).length;
      html = '<div class="pop-title">🚩 ' + esc(m.level) + ' 年级峰</div>' +
        '<div class="pop-body">海拔 ' + m.alt + ' 米<br>单元完成 <b>' + uDone + '</b> / ' + units.length +
        (markDone(m) ? " · 年级徽章已获得 🏅" : "") + '</div>' + gymSectionHtml(m);
    } else {
      html = '<div class="pop-title">🏯 顶峰</div>' +
        '<div class="pop-body">海拔 ' + m.alt + ' 米 · 全部词语的终点<br>已掌握 <b>' +
        Object.keys(store.mastered).length + '</b> / ' + WORDS.length + ' 词' +
        (markDone(m) ? "<br>你已登顶！👑" : "") + '</div>';
    }
    ov = popOverlay(html + '<div class="nav-row"><button class="nav-btn primary" id="popOk">知道了</button></div>');
    ov.querySelector("#popOk").onclick = function () { ov.remove(); };
    var gymGo = ov.querySelector("#gymGo");
    if (gymGo) gymGo.onclick = function () { ov.remove(); startGym(m.level); };
    wireChips(ov);
  }

  /* ---------- 你的营地 base camp popover (自由试炼 hub + shop entry) ---------- */
  var CAMP_MODES = [
    { mode: "cloze", label: "✍️ 填空挑战" },
    { mode: "zhmcq", label: "🔎 华文解释" },
    { mode: "enmcq", label: "🌐 英文翻译" },
    { mode: "rain", label: "🌧️ 词雨灵露" },
    { mode: "sprint", label: "⛰️ 攀山竞速" },
    { mode: "assemble", label: "🧩 组词挑战", only: "g2" },
    { mode: "handle", label: "🀄 词语汉兜", not: "g1" }
  ];
  function launchMode(mode) {
    if (!scopedWords().length) { alert("请先在「修行」页选择至少一个单元。"); return; }
    if (mode === "rain") return renderRainConfig();
    if (mode === "sprint") return renderSprintConfig();
    if (mode === "assemble") return startAssemble();
    if (mode === "handle") return startHandle();
    startMode(mode);
  }
  function openCamp() {
    var petLine = LEVELS.filter(function (lv) { return store.gym[lv]; })
      .map(function (lv) { var p = petFor(lv); return p.emoji + " " + esc(p.name); }).join(" · ");
    var n = scopedWords().length;
    var board = CAMP_MODES.filter(function (b) {
      if (b.only && STREAM !== b.only) return false;
      if (b.not && STREAM === b.not) return false;
      return true;
    }).map(function (b) {
      return '<button class="cb" data-mode="' + b.mode + '">' + b.label + '</button>';
    }).join("");
    var html = '<div class="pop-title">⛺ 你的营地</div>' +
      '<div class="camp-wallet">✨ 灵露 <b>' + store.lingLu + '</b> · 在词雨灵露中接住词语获得</div>' +
      (petLine ? '<div class="camp-pets">登山伙伴：' + petLine + '</div>' : "") +
      '<div class="pop-label">🎯 自由试炼 · 用「修行」页选定的复习范围（当前 ' + n + ' 词）</div>' +
      '<div class="camp-board">' + board + '</div>' +
      '<div class="camp-uid">识别码 <code id="campUid">载入中…</code>' +
      '<button class="uid-copy" id="uidCopy">复制</button>' +
      '<div class="pop-hint">如需向老师反映问题或核对排行榜身份，请提供此识别码。</div></div>' +
      '<div class="nav-row"><button class="nav-btn" id="campShop">🛒 营地商店</button>' +
      '<button class="nav-btn primary" id="campOk">知道了</button></div>';
    var ov = popOverlay(html);
    ov.querySelector("#campOk").onclick = function () { ov.remove(); };
    ov.querySelector("#campShop").onclick = function () { ov.remove(); openShop(); };
    Array.prototype.forEach.call(ov.querySelectorAll(".cb[data-mode]"), function (btn) {
      btn.onclick = function () { ov.remove(); launchMode(btn.getAttribute("data-mode")); };
    });
    var uidEl = ov.querySelector("#campUid");
    if (window.WSCloud && window.WSCloud.isAvailable() && window.WSCloud.getUid) {
      window.WSCloud.getUid(function (u) { if (uidEl) uidEl.textContent = u || "（离线）"; });
    } else if (uidEl) { uidEl.textContent = "（离线）"; }
    ov.querySelector("#uidCopy").onclick = function () {
      var txt = uidEl ? uidEl.textContent : "";
      if (!txt || txt === "载入中…" || txt === "（离线）") return;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("识别码已复制 ✓"); }, function () { toast(txt); });
      else toast(txt);
    };
  }

  /* ---------- 营地商店 camp shop (灵露兑换) ---------- */
  var SHOP = [
    { key: "fire", name: "篝火", price: 30, desc: "夜里暖手，词语更暖心" },
    { key: "flag", name: "营旗", price: 60, desc: "让全山都看见你的营地" },
    { key: "pine", name: "青松", price: 100, desc: "亲手栽下一片绿荫" },
    { key: "pavilion", name: "小亭", price: 200, desc: "营地的终极荣耀" }
  ];
  function openShop() {
    var rows = SHOP.map(function (it) {
      var owned = !!store.deco[it.key];
      var afford = store.lingLu >= it.price;
      var btn = owned
        ? '<span class="shop-owned">已拥有 ✓</span>'
        : '<button class="shop-buy" data-key="' + it.key + '"' + (afford ? "" : " disabled") + '>' +
          (afford ? "兑换" : "灵露不足") + '</button>';
      return '<div class="shop-row"><div class="shop-info"><b>' + esc(it.name) + '</b>' +
        '<span>' + esc(it.desc) + '</span></div>' +
        '<div class="shop-price">✨ ' + it.price + '</div>' + btn + '</div>';
    }).join("");
    var html = '<div class="pop-title">🛒 营地商店 · 灵露兑换</div>' +
      '<div class="camp-wallet">✨ 灵露 <b>' + store.lingLu + '</b></div>' +
      '<div class="shop-grid">' + rows + '</div>' +
      '<div class="nav-row"><button class="nav-btn" id="shopBack">‹ 回营地</button>' +
      '<button class="nav-btn primary" id="shopOk">知道了</button></div>';
    var ov = popOverlay(html);
    ov.querySelector("#shopOk").onclick = function () { ov.remove(); };
    ov.querySelector("#shopBack").onclick = function () { ov.remove(); openCamp(); };
    Array.prototype.forEach.call(ov.querySelectorAll(".shop-buy[data-key]"), function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute("data-key");
        var it = SHOP.filter(function (x) { return x.key === key; })[0];
        if (!it || store.deco[key] || store.lingLu < it.price) return;
        store.lingLu -= it.price; store.deco[key] = 1; saveStore();
        toast("已兑换：" + it.name + " ✨");
        ov.remove(); openShop();   // re-render with updated wallet + ownership
      };
    });
  }

  function showGoalPanel(onChange) {
    var g = store.goalMode;
    var ov = popOverlay(
      '<div class="pop-title">🎯 我现在朝哪个目标爬？</div>' +
      '<div class="pop-body">切换目标只改变高亮与提示，海拔永不重算、永不下降。</div>' +
      '<div class="goal-opts">' +
      '<button class="unit' + (g.type === "comp" ? " on" : "") + '" data-g="comp">按板块 · 下一个驿站</button>' +
      '<button class="unit' + (g.type === "unit" ? " on" : "") + '" data-g="unit">按单元 · 下一个营地</button>' +
      '<button class="unit' + (g.type === "count" ? " on" : "") + '" data-g="count">按词数里程碑</button></div>' +
      '<div class="goal-opts" id="goalN" style="' + (g.type === "count" ? "" : "display:none") + '">' +
      [10, 20, 50].map(function (n) {
        return '<button class="unit' + (g.type === "count" && g.n === n ? " on" : "") + '" data-n="' + n + '">每 ' + n + ' 词</button>';
      }).join("") + '</div>' +
      '<div class="nav-row"><button class="nav-btn primary" id="popOk">好</button></div>');
    Array.prototype.forEach.call(ov.querySelectorAll("[data-g]"), function (b) {
      b.onclick = function () {
        store.goalMode.type = b.getAttribute("data-g");
        if (store.goalMode.type === "count" && !store.goalMode.n) store.goalMode.n = 20;
        saveStore();
        ov.querySelector("#goalN").style.display = store.goalMode.type === "count" ? "" : "none";
        Array.prototype.forEach.call(ov.querySelectorAll("[data-g]"), function (x) {
          x.classList.toggle("on", x.getAttribute("data-g") === store.goalMode.type);
        });
        onChange();
      };
    });
    Array.prototype.forEach.call(ov.querySelectorAll("[data-n]"), function (b) {
      b.onclick = function () {
        store.goalMode.n = +b.getAttribute("data-n"); saveStore();
        Array.prototype.forEach.call(ov.querySelectorAll("[data-n]"), function (x) {
          x.classList.toggle("on", +x.getAttribute("data-n") === store.goalMode.n);
        });
        onChange();
      };
    });
    ov.querySelector("#popOk").onclick = function () { ov.remove(); };
  }
  /* ==================================================================
     我的词山 · static illustrated mountain (redesigned 2026-08-10)
     One fixed landscape image (mountain_bg.png) shared by all four streams;
     unit / 年级峰 / 你的营地 / 顶峰 pins placed along the painted path by
     altitude fraction; a "you are here" marker at current progress. No
     scroll / camera / joystick / render loop. Tapping a pin reuses openMark
     (unit words · 年度试炼 gym · 营地 camp+shop · summit), so all v0.4
     popovers carry over unchanged. The four painted terrain bands ARE the
     four altitude zones; the HUD just labels the current one.
     Pin positions come from MTN_PATH (hand-traced on this exact image); nudge
     those waypoints if a future image changes the path.
     ================================================================== */
  var MTN_PATH = [
    [0.613, 0.950], [0.598, 0.869], [0.580, 0.795], [0.562, 0.732],
    [0.551, 0.668], [0.553, 0.602], [0.555, 0.534], [0.549, 0.465],
    [0.542, 0.396], [0.536, 0.327], [0.529, 0.258], [0.523, 0.189],
    [0.519, 0.129], [0.517, 0.086]
  ];
  function mtnPathAt(frac) {
    var n = MTN_PATH.length - 1;
    var s = Math.max(0, Math.min(n - 0.0001, frac * n));
    var i = Math.floor(s), f = s - i, a = MTN_PATH[i], b = MTN_PATH[i + 1];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
  }
  function mtnPinIcon(m) {
    if (m.t === "base") return "⛺";
    if (m.t === "summit") return "🏯";
    if (m.t === "level") return store.gym[m.level] ? petFor(m.level).emoji : "🚩";
    return "";   // unit: a plain dot (gold when its badge is earned)
  }
  function startMountain() {
    setTopbar("home", "");
    ensureIdIndex();
    var alt = altitudeNow();
    var totalAlt = WORDS.length || 1;
    var marks = buildMarks();
    var pins = marks.filter(function (m) {
      return m.t === "base" || m.t === "unit" || m.t === "level" || m.t === "summit";
    });

    /* four altitude zones by year-level boundary (for the HUD label only) */
    var ZONES = ["🌿 山脚绿野", "☁️ 云海栈道", "❄️ 雪线冰崖", "🏯 天阶峰顶"];
    var bounds = [0];
    marks.forEach(function (m) { if (m.t === "level") bounds.push(m.alt); });
    if (bounds[bounds.length - 1] < totalAlt) bounds.push(totalAlt);
    function zoneName(a) {
      for (var z = 0; z < bounds.length - 1; z++) { if (a < bounds[z + 1]) return ZONES[Math.min(z, ZONES.length - 1)]; }
      return ZONES[Math.min(bounds.length - 2, ZONES.length - 1)];
    }

    var html = '<div class="mtn2-wrap"><div class="mtn2-stage" id="mtStage">';
    pins.forEach(function (m, i) {
      var frac = m.t === "base" ? 0 : (m.t === "summit" ? 1 : Math.min(1, m.alt / totalAlt));
      var p = mtnPathAt(frac);
      var cls = "mtn2-pin t-" + m.t + (markDone(m) ? " done" : "");
      html += '<button class="' + cls + '" data-i="' + i + '" title="' + esc(markLabel(m)) +
        '" style="left:' + (p.x * 100).toFixed(2) + '%;top:' + (p.y * 100).toFixed(2) + '%">' +
        mtnPinIcon(m) + '</button>';
    });
    var cp = mtnPathAt(Math.min(1, alt / totalAlt));
    html += '<div class="mtn2-hero" style="left:' + (cp.x * 100).toFixed(2) + '%;top:' + (cp.y * 100).toFixed(2) + '%" title="你在这里"></div>';
    html += '</div>';   // .mtn2-stage
    html += '<div class="mtn2-hud">' +
      '<span class="m2pill">⛰️ 已掌握 <b>' + alt + '</b> 米</span>' +
      '<span class="m2pill">' + zoneName(alt) + '</span>' +
      '<button class="m2pill" id="mtGoal">🎯 目标</button></div>';
    html += '<div class="mtn2-goalbar" id="mtGoalbar"></div>';
    html += '<div class="mtn2-tip">点地标查看进度 · ⛺ 你的营地 · 🚩 年度试炼 · 🏯 顶峰</div></div>';
    view().innerHTML = html;

    var goal = nextGoal(alt);
    var gb = document.getElementById("mtGoalbar");
    if (gb) gb.textContent = goal ? ("🎯 距「" + goal.label + "」还差 " + goal.need + " 词") : "🏯 全部目标已完成！";

    var stage = document.getElementById("mtStage");
    Array.prototype.forEach.call(stage.querySelectorAll(".mtn2-pin[data-i]"), function (btn) {
      btn.onclick = function () { openMark(pins[parseInt(btn.getAttribute("data-i"), 10)]); };
    });
    document.getElementById("mtGoal").onclick = function () { showGoalPanel(function () { startMountain(); }); };
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
  /* ---------- 昵称选择器 (nickname picker) ---------- */
  function renderNicknamePicker(onDone, opts) {
    opts = opts || {};
    var dismissible = !!opts.dismissible;
    var _bvss = "百德中学 Bukit View Secondary School";
    var _cs = opts.currentSchool || "";
    var st = { step: "descCat", descCat: null, desc: null, nounCat: null, noun: null,
      role: opts.currentRole || "student",
      schoolSel: (_cs && _cs !== _bvss) ? "other" : "bvss",
      schoolOther: (_cs && _cs !== _bvss) ? _cs : "",
      heardFrom: opts.currentHeard || "" };

    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.innerHTML = '<div class="pop-card" id="npCard"></div>';
    if (dismissible) {
      ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    }
    document.body.appendChild(ov);
    var card = ov.querySelector("#npCard");

    function chipGrid(items, onClick) {
      var html = '<div class="chip-wrap">';
      items.forEach(function (it) {
        var label = typeof it === "string" ? it : it.w;
        var title = typeof it === "string" ? "" : (' title="' + esc(it.zh) + '"');
        html += '<span class="wchip not" data-v="' + esc(label) + '"' + title + '>' + esc(label) + '</span>';
      });
      html += '</div>';
      return html;
    }
    function wireChips(root, onClick) {
      Array.prototype.forEach.call(root.querySelectorAll(".wchip"), function (el) {
        el.onclick = function () { onClick(el.getAttribute("data-v")); };
      });
    }

    function renderStep() {
      var html = "";
      var closeBtn = dismissible ? '<div class="nav-row"><button class="nav-btn" id="npCancel">取消</button></div>' : "";

      if (st.step === "descCat") {
        html = '<div class="pop-title">✨ 选一个昵称</div>' +
          '<div class="pop-body">昵称随时可在设置中更改，先选一个开始学习吧！<br>第一步：选一个大类（这是你的"性格气质"）</div>' +
          chipGrid(Object.keys(DESC_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npRandom">🎲 帮我随机抽一个</button></div>' + closeBtn;
      } else if (st.step === "descWord") {
        html = '<div class="pop-title">' + esc(st.descCat) + '</div>' +
          '<div class="pop-body">选一个具体的词语（点击可看意思）：</div>' +
          chipGrid(DESC_CATS[st.descCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类</button></div>' + closeBtn;
      } else if (st.step === "nounCat") {
        html = '<div class="pop-title">' + esc(st.desc) + '·？</div>' +
          '<div class="pop-body">第二步：选一个名词大类</div>' +
          chipGrid(Object.keys(NOUN_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 重选描述词</button></div>' + closeBtn;
      } else if (st.step === "nounWord") {
        html = '<div class="pop-title">' + esc(st.nounCat) + '</div>' +
          '<div class="pop-body">选一个具体的名词：</div>' +
          chipGrid(NOUN_CATS[st.nounCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类</button></div>' + closeBtn;
      } else if (st.step === "confirm") {
        var nickname = st.desc + "·" + st.noun;
        var role = st.role || "student";
        var roleBtns = [["student", "🎒 学生"], ["teacher", "🧑‍🏫 老师"], ["parent", "👪 家长"], ["public", "🌏 公众人士"]];
        var sel = st.schoolSel || "bvss";
        var detailHtml;
        if (role === "public") {
          detailHtml = '<div class="pop-label">您从何处得知本站？ How did you hear about us?</div>' +
            '<input type="text" id="npHeard" class="code-ta" style="height:44px;margin-top:8px" placeholder="例如：朋友介绍、社交媒体、报章… e.g. friend, social media, news" value="' + esc(st.heardFrom || "") + '">';
        } else {
          var schoolLabel = role === "parent" ? "孩子就读的学校 Child’s school"
            : role === "teacher" ? "你的学校 / 机构 Your school / organisation"
            : "你的学校 Your school";
          var otherPh = role === "teacher" ? "请输入学校 / 机构名称 School / organisation name" : "请输入学校名称 School name";
          detailHtml = '<div class="pop-label">' + schoolLabel + '</div>' +
            '<select id="npSchool" class="np-select">' +
            '<option value="bvss"' + (sel === "bvss" ? " selected" : "") + '>百德中学 Bukit View Secondary School</option>' +
            '<option value="other"' + (sel === "other" ? " selected" : "") + '>其他 Others</option></select>' +
            (sel === "other" ? '<input type="text" id="npSchoolOther" class="code-ta" style="height:44px;margin-top:8px" placeholder="' + otherPh + '" value="' + esc(st.schoolOther || "") + '">' : "");
        }
        html = '<div class="pop-title">🎉 你的昵称</div>' +
          '<div class="pop-body" style="font-size:19px;font-weight:700;color:var(--ink);text-align:center;margin:6px 0 12px">' +
          esc(nickname) + '</div>' +
          '<div class="pop-label">你的身份 I am a…</div>' +
          '<div class="np-roles">' + roleBtns.map(function (r) {
            return '<button class="np-role' + (role === r[0] ? " on" : "") + '" data-r="' + r[0] + '">' + r[1] + '</button>';
          }).join("") + '</div>' +
          '<div class="pop-note">🏆 只有「学生」的昵称会出现在排行榜上。</div>' +
          detailHtml +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 重新选择</button>' +
          '<button class="nav-btn primary" id="npConfirm">确认</button></div>' + closeBtn;
      }
      card.innerHTML = html;

      if (st.step === "descCat") {
        wireChips(card);
        document.getElementById("npRandom").onclick = function () {
          var dCats = Object.keys(DESC_CATS), nCats = Object.keys(NOUN_CATS);
          var dCat = dCats[Math.floor(Math.random() * dCats.length)];
          var nCat = nCats[Math.floor(Math.random() * nCats.length)];
          var dList = DESC_CATS[dCat], nList = NOUN_CATS[nCat];
          st.descCat = dCat; st.desc = dList[Math.floor(Math.random() * dList.length)].w;
          st.nounCat = nCat; st.noun = nList[Math.floor(Math.random() * nList.length)];
          st.step = "confirm"; renderStep();
        };
        Array.prototype.forEach.call(card.querySelectorAll(".wchip"), function (el) {
          el.onclick = function () { st.descCat = el.getAttribute("data-v"); st.step = "descWord"; renderStep(); };
        });
      } else if (st.step === "descWord") {
        Array.prototype.forEach.call(card.querySelectorAll(".wchip"), function (el) {
          el.onclick = function () { st.desc = el.getAttribute("data-v"); st.step = "nounCat"; renderStep(); };
        });
        document.getElementById("npBack").onclick = function () { st.step = "descCat"; renderStep(); };
      } else if (st.step === "nounCat") {
        Array.prototype.forEach.call(card.querySelectorAll(".wchip"), function (el) {
          el.onclick = function () { st.nounCat = el.getAttribute("data-v"); st.step = "nounWord"; renderStep(); };
        });
        document.getElementById("npBack").onclick = function () { st.step = "descWord"; renderStep(); };
      } else if (st.step === "nounWord") {
        Array.prototype.forEach.call(card.querySelectorAll(".wchip"), function (el) {
          el.onclick = function () { st.noun = el.getAttribute("data-v"); st.step = "confirm"; renderStep(); };
        });
        document.getElementById("npBack").onclick = function () { st.step = "nounCat"; renderStep(); };
      } else if (st.step === "confirm") {
        Array.prototype.forEach.call(card.querySelectorAll(".np-role"), function (b) {
          b.onclick = function () { st.role = b.getAttribute("data-r"); renderStep(); };
        });
        var selEl = document.getElementById("npSchool");
        if (selEl) selEl.onchange = function () { st.schoolSel = selEl.value; renderStep(); };
        var otherEl = document.getElementById("npSchoolOther");
        if (otherEl) otherEl.oninput = function () { st.schoolOther = otherEl.value; };
        var heardEl = document.getElementById("npHeard");
        if (heardEl) heardEl.oninput = function () { st.heardFrom = heardEl.value; };
        document.getElementById("npBack").onclick = function () { st.step = "nounCat"; renderStep(); };
        document.getElementById("npConfirm").onclick = function () {
          var role = st.role || "student";
          var profile;
          if (role === "public") {
            profile = { nickname: st.desc + "·" + st.noun, role: role, school: "",
              heardFrom: ((document.getElementById("npHeard") || {}).value || "").trim() };
          } else {
            var school = st.schoolSel === "other"
              ? ((document.getElementById("npSchoolOther") || {}).value || "").trim()
              : "百德中学 Bukit View Secondary School";
            if (st.schoolSel === "other" && !school) { alert("请输入学校名称 Please enter the school name。"); return; }
            profile = { nickname: st.desc + "·" + st.noun, role: role, school: school };
          }
          saveProfileLocal(profile);
          ov.remove();
          onDone(profile);
        };
      }
      if (dismissible && document.getElementById("npCancel")) {
        document.getElementById("npCancel").onclick = function () { ov.remove(); };
      }
    }
    renderStep();
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
              COMP_LIST.push({ key: lv.level + "·" + u.unit + "·" + c.component, level: lv.level, unit: u.unit, component: c.component, textTitle: c.textTitle || "", ids: ids });
            });
            UNIT_LIST.push({ key: lv.level + "·" + u.unit, level: lv.level, unit: u.unit, theme: u.theme || "", count: count });
          });
        });
        scope = new Set(UNIT_LIST.map(function (u) { return u.key; }));
        applyAmbience();
        updateStreak();

        function afterProfile() {
          if (window.WSCloud && window.WSCloud.isAvailable()) {
            window.WSCloud.getProgress(STREAM, function (cloud) {
              mergeCloudProgress(cloud);
              applyAmbience();   // cloud merge may raise the mastery tier
              renderHome();
            });
          } else {
            renderHome();
          }
        }
        var profile = loadProfile();
        if (!profile) {
          renderHome(); // show shell first so it isn't a blank screen
          renderNicknamePicker(function () { afterProfile(); }, { dismissible: false });
        } else {
          afterProfile();
        }
      })
      .catch(function (err) {
        view().innerHTML = '<div class="error-box"><b>词库装载失败</b><br>' +
          '<span style="font-size:12.5px;color:#5A7080">请通过网页服务器访问（GitHub Pages 或本地 server），' +
          '直接双击打开 HTML 文件无法读取词库。<br>技术信息：' + esc(err.message) + '</span></div>';
      });
  }

  boot();
})();
