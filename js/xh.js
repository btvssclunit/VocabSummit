/* 学海启航 · 启航码头 — MVP v2
   Spec: SPEC_XH_MVP_v2.md (2026-08-15), which supersedes the 看图识词 v1 spec.

   DELIBERATELY STANDALONE. This never loads app.js/app.css and shares no state
   with g1/g2/g3/hcl. The reasons are in the spec: this tier inverts the
   platform's display defaults (拼音 and English default ON here, OFF there), it
   is outside the 灵露 / 历练值 / 海拔 economy entirely, and it is unproven — a
   mode that later gets pulled must be removable without touching anything the
   four streams depend on. The TTS stack is COPIED from app.js rather than
   shared, for the same reason.

   ⚠️ SCOPE IS 100 WORDS in SIX 组别 (data/xh_v3.json), updated 2026-08-16. It was
   36 for one day: the original 142-word extraction used a proximity merge on
   sheets 07/09/10 that joined the wrong pairs, so every assignment after the merge
   point shifted by one and 36 sprites showed the wrong word. Everything that had
   been merged was cut, leaving the three sheets that matched counts without a
   merge (动物, 日常用品), and the pool was then rebuilt to 100.
   STANDING RULE, and the reason that incident is still written here: a matching
   count is NOT evidence of correct mapping. Anything merged, re-cut or re-ordered
   gets looked at, one image at a time, before it ships.
   ✅ All 100 pairings re-checked image-by-image on 2026-08-16 (rendered as labelled
   contact sheets, 词语 + 英文释义 under each sprite): no mismatches.

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
    /* ⚠️ literals, NOT ROUND_SIZES/OPT_TIERS — same trap the 连线 line above warns
       about: this normaliser runs at module init, before those vars are assigned. */
    if (s.roundN !== 5 && s.roundN !== 10 && s.roundN !== 15 && s.roundN !== 20) s.roundN = 5;
    if (s.optsN !== 2 && s.optsN !== 3 && s.optsN !== 4) s.optsN = 4;
    if (s.tab !== "play") s.tab = "learn";
    /* which of the four 词语挑战 question types was used last. It is remembered
       SEPARATELY from s.mode because 学词 now opens on two big cards (图卡 vs 挑战)
       and s.mode holds "learn" whenever the flashcard card is the selected one —
       without this, coming back from flashcards would forget the question type.
       ⚠️ literal, not a MODES lookup: load() runs before MODES is assigned. */
    /* ⚠️ `phrase` LEFT this whitelist (owner 2026-08-16): 看句选词 is a 句-level task
       and now lives under 学以致用, not among the three 词-level types. An old profile
       holding quizMode === "phrase" is reset to "pic" here, which is correct — the
       remembered 学以致用 side has its own slot below and starts on 看句选词 anyway. */
    if (["enmcq", "pic", "listen"].indexOf(s.quizMode) === -1) s.quizMode = "pic";
    /* the 学以致用 side's own memory. ⚠️ separate from quizMode for the same reason
       quizMode is separate from mode: the two containers must not overwrite each
       other's last-used type. */
    if (["phrase", "sort"].indexOf(s.useMode) === -1) s.useMode = "phrase";
    /* 重整句子 拼块盘总块数。⚠️ 自己的常量，不复用 OPT_TIERS（那是「屏幕上几个选项」，
       语义不同），仿 MATCH_SIZES 的先例。最低档 0 表示「刚好够，没有干扰词」。 */
    if ([0, 2, 4, 6].indexOf(s.sortExtra) === -1) s.sortExtra = 2;
    /* 闪卡 的两面（owner 2026-08-16 晚）：词语卡 走 xh_v3 的 150 个词，
       句子卡 走 xh_phrases 的生活句子。⚠️ 句子卡不记任何进度——航程 是「认得几个词」，
       读一句话不等于认得词，把它算进去就是把 §4 水线上那个数字掺水。 */
    if (s.cardKind !== "sentence") s.cardKind = "word";
    if (typeof s.scopeOpen !== "boolean") s.scopeOpen = false;
    /* 航海值 — the dock's effort metric (SPEC_XH_dock_economy_and_TTS §1).
       ⚠️ It must NEVER merge with 航程: 航程 is what you know, 航海值 is what you
       did. A student who plays 连线 all week raises 航海值 while 航程 does not
       move, and that distinction is the honest one. No composite score, ever —
       same reason 海拔 and 历练值 stay apart on the mountain. */
    if (typeof s.sail !== "number") s.sail = 0;
    /* ---------- 我的海滩 (SPEC_XH_berth_layout.md, owner 2026-08-16) ----------
       贝壳 is the dock's spendable currency. ⚠️ SEALED AT THE WATERLINE (economy
       spec §0): it never converts to 灵露 in either direction, and nothing on the
       mountain can be bought with it. Keeping it in ws_xh — a store app.js never
       reads — is what makes that structural rather than a rule to remember. */
    if (typeof s.shells !== "number") s.shells = 0;
    if (!s.owned || typeof s.owned !== "object") s.owned = {};   // purchased item keys
    if (!s.berth || typeof s.berth !== "object") s.berth = {};    // slot -> item key
    /* ⚠️ LEGACY FIELD, read once and never written again. store.boat was the pier's
       own 3-tier chain (舢板 1 / 渔船 2 / 帆船 3). Boats are now a 4-tier family owned
       GLOBALLY in ws2_profile, so this survives only to be migrated: the colourful
       sampan was inserted at tier 2, pushing the two PAID boats up (2 -> 3, 3 -> 4).
       Without the migration a student who spent 300 贝壳 on the ornate junk would
       quietly be holding the simple one. See migrateDockBoat in profile.js. */
    if (s.boat !== 2 && s.boat !== 3) s.boat = 1;
    if (s.lbScope !== "all") s.lbScope = "school";
    if (s.lbTab !== "pts") s.lbTab = "sailed";
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  /* ⚠️ Runs at boot, not in load(): load() is called during module init, and
     profile.js may not have finished evaluating. Idempotent — it only ever adds. */
  function migrateBoat() {
    if (window.WSBoats && window.WSBoats.migrateDockBoat) {
      window.WSBoats.migrateDockBoat(store.boat);
    }
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
  /* ---------- 界面拼音 (owner 2026-08-16: 「pinyin toggle doesn't work on pier」) ----
     It DID work — but only on word content (options, cards, the 拼音 under a 词语).
     The pier had no interface pinyin at all, so pressing 拼 on the menu, which is
     where a student first presses it, changed nothing visible. The four streams got
     full chrome coverage on 2026-08-15 (PY_LAB, 118 entries); this is the dock's.

     ⚠️ SAME CONTRACT AS THE MOUNTAIN, do not relax either half:
       · the KEY is exactly the Chinese on screen — a key that is a superset or
         subset annotates a phrase the student cannot see (the 拼音辅助 / 拼音
         mismatch the owner caught on the streams).
       · the pinyin is HAND-WRITTEN, never generated. These are fixed strings, so
         writing them by hand sidesteps every polyphone trap (的 de, 得分 dé, 长 cháng).
     ⚠️ Scope is navigation and button shell text ONLY. 题干/选项/词语 stay pure
     Chinese — same immersion logic as the Chinese-only TTS rule. */
  var XH_PY = {
    "启航码头": "qǐ háng mǎ tóu",
    "看图学词 · 看图听音，慢慢来": "kàn tú xué cí · kàn tú tīng yīn，màn màn lái",
    "学习范围 · 可多选": "xué xí fàn wéi · kě duō xuǎn",
    "选择学习方式": "xuǎn zé xué xí fāng shì",
    /* ⚠️ 学词 → 学习（owner 2026-08-16 晚）。旧名是「学词语」的缩写，可是这一边
       现在也放句子闪卡，「词」把它自己框死了；山上那一侧叫 修行，两边都不必逐字对齐，
       但都得说得通。旧 key 留着：`store.tab` 存的仍是 "learn"/"play"，与文案无关。 */
    "学习": "xué xí", "闯关": "chuǎng guān", "出发": "chū fā",
    "词语游乐场": "cí yǔ yóu lè chǎng", "今天学什么": "jīn tiān xué shén me",
    "英文选词": "yīng wén xuǎn cí",
    "题型": "tí xíng", "每次题数": "měi cì tí shù", "挑战难度": "tiǎo zhàn nán dù",
    "词语挑战": "cí yǔ tiǎo zhàn", "挑战方式": "tiǎo zhàn fāng shì",
    /* ⚠️ 传声筒 → 看句选词，并且它不再是一个并列的题型，而是收进 学以致用 这张容器卡
       （owner 2026-08-16）。旧名只留在 `PATCH_02` 与归档里，代码里的 id 仍是 "phrase"。
       ⚠️ 学以致用 是成语，单看比 传声筒 难读——这是**知情的取舍**：它现在与 词语挑战
       并列，**容器卡允许抽象，题型卡不允许**，拼音与英文副标承担实际释义。
       不要「顺手」把它改回大白话。
       ⚠️ 重整句子 的「重」读 chóng 不读 zhòng。 */
    "学以致用": "xué yǐ zhì yòng",
    "看句选词": "kàn jù xuǎn cí", "重整句子": "chóng zhěng jù zi",
    "一次连几组": "yī cì lián jǐ zǔ", "返回码头": "fǎn huí mǎ tóu",
    /* 看图学词 had no entry while every other mode name did — invisible until the
       学词 tab held two cards side by side and only one carried its 拼音.
       ⚠️ 2026-08-16 晚改名 词语闪卡：owner「rename learn the words to flashcards」。
       山上那张卡就叫 词语闪卡，码头本来也是同一件事，两个名字没有理由。
       旧 key 留着，句子闪卡的标题里还会用到「看图学词」这四个字吗？不会，
       但 hero 副标题「看图学词 · 看图听音，慢慢来」仍在用，所以不能删。 */
    "看图学词": "kàn tú xué cí",
    "词语闪卡": "cí yǔ shǎn kǎ", "闪卡": "shǎn kǎ",
    /* 闪卡 的两面：词语卡 与 句子卡（owner 2026-08-16 晚）。 */
    "看什么卡": "kàn shén me kǎ", "词语卡": "cí yǔ kǎ", "句子卡": "jù zi kǎ",
    "全选": "quán xuǎn", "清空": "qīng kōng",
    /* ⚠️ RENAMED 2026-08-16 evening (owner:「just make it simple … for easy
       understanding」). The screen once called 航海图鉴 is now 我的词语表 — the
       nautical name was a riddle to a zero-Chinese beginner, and it is literally the
       same screen the mountains call 我的词语表.
       ⚠️ 航海徽 became 航海徽章 in the same pass: 徽章 is the word the mountains use,
       and the one-character form read as an abbreviation. */
    "我的词语表": "wǒ de cí yǔ biǎo", "码头风云榜": "mǎ tóu fēng yún bǎng",
    "我的海滩": "wǒ de hǎi tān", "海滩小铺": "hǎi tān xiǎo pù",
    "船只 · 一艘一艘往上换": "chuán zhī · yī sōu yī sōu wǎng shàng huàn",
    "回海滩": "huí hǎi tān", "贝壳": "bèi ké", "海里": "hǎi lǐ",
    "航程": "háng chéng", "一次答对": "yī cì dá duì", "集齐的组": "jí qí de zǔ",
    "返回": "fǎn huí", "关闭": "guān bì",
    "看图识词": "kàn tú shí cí", "听音识图": "tīng yīn shí tú",
    "词海垂钓": "cí hǎi chuí diào", "连线": "lián xiàn",
    "再听一次": "zài tīng yī cì", "收线": "shōu xiàn", "检查答案": "jiǎn chá dá àn",
    "上一个": "shàng yī gè", "下一个": "xià yī gè", "学完了": "xué wán le",
    "开始测验": "kāi shǐ cè yàn", "再来一次": "zài lái yī cì",
    "再看一次": "zài kàn yī cì", "换一组": "huàn yī zǔ",
    "再看看这几个": "zài kàn kàn zhè jǐ gè",
    "全部": "quán bù", "已认得": "yǐ rèn de", "还不认得": "hái bù rèn de",
    "航海徽章": "háng hǎi huī zhāng",
    /* the nine 航海徽章 names (owner 2026-08-16 evening: they must answer the 拼音
       toggle like every other label on the dock). ⚠️ Add a line here whenever a rung
       is added — 600 and 800 are reserved, see SAIL_BADGES. */
    "贝壳徽": "bèi ké huī", "珊瑚徽": "shān hú huī", "珍珠徽": "zhēn zhū huī",
    "海星徽": "hǎi xīng huī", "罗盘徽": "luó pán huī", "龙舟徽": "lóng zhōu huī",
    "牵星板徽": "qiān xīng bǎn huī", "帆船徽": "fān chuán huī", "灯塔徽": "dēng tǎ huī",
    "岸左": "àn zuǒ", "岸右": "àn yòu", "木桩": "mù zhuāng",
    "沙地": "shā dì", "空中": "kōng zhōng",
    "动物": "dòng wù", "食物": "shí wù", "日常用品": "rì cháng yòng pǐn",
    "学校": "xué xiào", "天气与自然": "tiān qì yǔ zì rán", "交通": "jiāo tōng",
    "陆上动物": "lù shàng dòng wù", "水中与空中": "shuǐ zhōng yǔ kōng zhōng",
    "熟食": "shú shí", "肉与蛋": "ròu yǔ dàn",
    "水果与蔬菜": "shuǐ guǒ yǔ shū cài", "饮料": "yǐn liào",
    /* 组别 / 子类 —— 它们同时也是屏幕上的文字，所以两张表都要有 */
    "地点": "dì diǎn", "数字": "shù zì",
    "蔬菜与调料": "shū cài yǔ tiáo liào", "组屋区": "zǔ wū qū",
    "去处": "qù chù", "买东西": "mǎi dōng xī"
  };
  /* the interface gloss. Missing keys return "" — silent by design, same as the
     mountain's pyl(), which is why the syllable self-check below exists. */
  function xhPy(zh) {
    var t = XH_PY[zh];
    return t ? '<span class="xh-py xh-uipy">' + t + "</span>" : "";
  }
  /* dev self-check: one syllable per CJK character, or the annotation drifts off
     the word it explains. Runs once, logs only when something is wrong. */
  (function () {
    var bad = [];
    for (var k in XH_PY) {
      var cjk = (k.match(/[\u4e00-\u9fff]/g) || []).length;
      var syl = XH_PY[k].split(/\s+/).filter(function (t) { return t !== "\u00b7"; }).length;
      if (cjk !== syl) bad.push(k + " -> " + XH_PY[k] + " (" + cjk + " vs " + syl + ")");
    }
    if (bad.length && window.console) console.warn("XH_PY syllable mismatch:", bad);
  })();

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
      '<button class="xh-tg" id="xhTgFind" title="查词语" aria-label="查词语">' +
        '<span class="xh-tg-ic">🔎</span><span class="xh-tg-lab">查词</span></button>' +
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
    /* 五站查词 (§3.3) — the dock is the station this was built for, so the entry
       is permanent in the topbar rather than buried on one page. ⚠️ It is handed
       OUR speak(), which carries the iOS primer; search.js ships no TTS of its
       own on purpose. It is READ-ONLY: a result speaks and nothing else, so the
       waterline is untouched. */
    var find = document.getElementById("xhTgFind");
    if (find) find.onclick = function () {
      if (window.WSSearch) window.WSSearch.open({ speak: speak });
    };
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

  /* speak(text, onEnd) — onEnd fires exactly once when the utterance finishes,
     errors, or is cancelled by the next speak(). Callers use it to hold the
     screen until the sentence has actually been heard; it is NEVER the only
     timer, because onend is not guaranteed to arrive (a cancelled utterance on
     ChromeOS, a voice that never loads, a device with no zh voice at all). */
  function speak(text, py, onEnd) {
    if (typeof py === "function") { onEnd = py; py = null; }
    var fired = false;
    var done = function () { if (!fired) { fired = true; revive(); if (onEnd) onEnd(); } };
    if (!window.speechSynthesis || !text) { done(); return; }
    primeTTS();
    var go = function () {
      if (!_zhVoice) loadVoiceCache();
      if (!_zhVoice && !_warnedNoZh) {
        _warnedNoZh = true;
        toast("⚠️ 未找到中文语音，请在设备语言设置中安装普通话语音包");
      }
      /* ⚠️ 读音以数据里的 拼音 为准，不让引擎自己猜（js/tts.js）。
         码头的句子（生活空间）没有逐字拼音，那里 py 为空，维持引擎默认。 */
      var u = new SpeechSynthesisUtterance(window.WSTts ? WSTts.text(text, py) : String(text));
      u.lang = (_zhVoice && _zhVoice.lang) || "zh-CN";
      if (_zhVoice) u.voice = _zhVoice;
      u.rate = 0.85;                                        // slower: absolute beginners
      u.onend = done; u.onerror = done;
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
  var _ac = null, _keepAlive = null, _acBorn = 0, _acFails = 0, MAX_REBUILDS = 8;
  function buildCtx() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    var c;
    try { c = new C(); } catch (e) { return null; }
    _acBorn = (new Date()).getTime();
    /* 静音保活源：通道里一直有东西在播，就不容易被回收、也不容易被朗读夺走。
       gain 恒 0，听不见，每轮循环一个采样。app.js 早就有这个，码头漏了。 */
    try {
      var src = c.createBufferSource(), g0 = c.createGain();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.loop = true; g0.gain.value = 0;
      src.connect(g0); g0.connect(c.destination); src.start(0);
      _keepAlive = src;
    } catch (e) {}
    return c;
  }
  function ac() {
    if (!_ac) _ac = buildCtx();
    return _ac;
  }
  /* 卡住的 context 只能扔掉重建——新建出来的 context 是 running 的，
     而 interrupted 状态下 resume() 不保证会回来。限流：浏览器对一个页面能
     建几个 AudioContext 有上限，烧完就永远没声音了。 */
  function rebuildCtx() {
    if (_acFails >= MAX_REBUILDS) return _ac;
    if ((new Date()).getTime() - _acBorn < 1000) return _ac;
    _acFails++;
    var old = _ac;
    _ac = null; _keepAlive = null;
    if (old && old.close) { try { old.close(); } catch (e) {} }
    return (_ac = buildCtx());
  }
  function revive() {
    if (!_ac || _ac.state === "running") return;
    try { _ac.resume(); } catch (e) {}
    setTimeout(function () {
      if (_ac && _ac.state !== "running") rebuildCtx();
    }, 150);
  }
  function blip(freqs, type, vol, dur) {
    var c = ac();
    if (!c) return;
    /* ⚠️ play() 必须拿**当下**那个 context 当参数。原来它闭包引用外层的 c，
       兜底路径 close() 掉旧 context 再重建之后，play() 还在往那个已经关掉的
       context 上 createOscillator——直接抛异常，一声都没有。答对音效在
       iPad 上「时有时无」就是这里：朗读把通道拿走 → context 变 interrupted
       → 走兜底 → 兜底本身是坏的。 */
    function play(cc) {
      if (!cc || cc.state !== "running") return false;
      var t0 = cc.currentTime;
      freqs.forEach(function (f, i) {
        var o = cc.createOscillator(), g = cc.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(vol, t0 + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.05 + dur);
        o.connect(g); g.connect(cc.destination);
        o.start(t0 + i * 0.05); o.stop(t0 + i * 0.05 + dur);
      });
      return true;
    }
    if (play(c)) return;
    /* 照样叫一声 resume()，但**不等它的 promise**——interrupted 状态下它可能
       永远不兑现（CLAUDE.md §9）。120ms 之后还没起来就换一个新的。 */
    try { c.resume(); } catch (e) {}
    setTimeout(function () {
      if (play(_ac)) return;
      play(rebuildCtx());
    }, 120);
  }
  function sfxOk() { blip([420, 640], "triangle", 0.22, 0.13); }   // wooden knock
  function sfxNo() { blip([150, 110], "sawtooth", 0.10, 0.2); }    // rope creak
  /* 一次点击是我们能拿到的最好的时机：新建的 context 生来就是 running 的。 */
  document.addEventListener("pointerdown", function () {
    var c = ac();
    if (c && c.state !== "running") revive();
  });
  /* 切回这个标签页时，多数移动浏览器会把 context 留在 suspended。 */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) revive();
  });

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "xh-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  /* ⚠️ ONE definition for the back button (owner 2026-08-16 evening: 「pier 返回 …
     also need to respond to pinyin and english support … students who use the pier
     are beginners, they need strong scaffolding upfront」). It was hand-written in
     nine places with no gloss at all — the single most-used control on the pier and
     the one a zero-Chinese beginner is least able to read. Add new screens through
     this, never by copying the markup again. */
  function quitBtn() {
    return '<button class="xh-quit" id="xhQuit">‹ 返回' + xhPy("返回") +
      '<span class="xh-en">back</span></button>';
  }

  /* ⚠️ 组别 / 子类 are DATA, so their English lives here rather than in XH_PY,
     which is strictly an interface-label table. A beginner picking a study scope
     must be able to read what「天气与自然」means before they commit to it — owner
     2026-08-16: 「students who use the pier are beginners/very weak, they need
     strong scaffolding upfront」.
     ⚠️ Add a line here whenever data/xh_v3.json gains a 组别 or 子类. A missing key
     degrades to no English, silently — same contract as xhPy(). */
  var XH_GROUP_EN = {
    "动物": "Animals", "食物": "Food", "日常用品": "Everyday things",
    "学校": "School", "天气与自然": "Weather and nature", "交通": "Getting around",
    "地点": "Places", "数字": "Numbers",
    "陆上动物": "Land animals", "水中与空中": "Water and sky",
    "水果与蔬菜": "Fruit and vegetables", "熟食": "Cooked food",
    "肉与蛋": "Meat and eggs", "饮料": "Drinks",
    "蔬菜与调料": "Vegetables and seasonings", "组屋区": "Around the block",
    "去处": "Places to go", "买东西": "Shopping"
  };
  /* ⚠️ One icon per 组别. The scope chips are the FIRST thing a zero-Chinese
     student meets, before any round starts and before they can read 天气与自然 —
     so the emoji is not decoration here, it is the only cue that carries. Add a
     line whenever data/xh_v3.json gains a 组别; a missing key degrades to no icon,
     silently, same contract as xhPy(). */
  var XH_GROUP_IC = {
    "动物": "🐾", "食物": "🍜", "日常用品": "🧺", "学校": "🎒",
    "天气与自然": "🌦️", "交通": "🚌", "地点": "📍", "数字": "🔢"
  };
  /* ⚠️ COMPLETENESS SELF-CHECK. The syllable check below catches a WRONG pinyin;
     it cannot catch a MISSING one, and a missing key is silent (xhPy returns "").
     地点 and 数字 shipped with no pinyin and no English for exactly that reason.
     This walks the real data and warns for any 组别/子类 that either table lacks. */
  function checkGroupLabels() {
    var seen = {}, miss = [];
    WORDS.forEach(function (w) {
      [w.组别, w.子类].forEach(function (k) {
        if (!k || seen[k]) return;
        seen[k] = 1;
        if (!XH_PY[k] || !XH_GROUP_EN[k]) {
          miss.push(k + (XH_PY[k] ? "" : " (无拼音)") + (XH_GROUP_EN[k] ? "" : " (无英文)"));
        }
      });
    });
    if (miss.length) console.warn("[xh] 组别/子类 缺少拼音或英文：", miss.join(" · "));
  }
  function xhGroupIc(zh) {
    var ic = XH_GROUP_IC[zh];
    return ic ? '<span class="xh-gchip-ic">' + ic + "</span>" : "";
  }
  function xhGroupEn(zh) {
    var en = XH_GROUP_EN[zh];
    return en ? '<span class="xh-en">' + esc(en) + "</span>" : "";
  }

  /* ---------- distractors (spec §3, CHANGED from v1) ----------
     All distractors come from the SAME 组别 as the answer, always. The old
     Band 1 / Band 2 progression is gone: cross-group distractors let a question
     be answered by category alone (an animal picture against three household
     objects), which taught nothing. 动物 may draw freely across 陆上 and 水中 —
     猫 against 鲨鱼 is still a real question. */
  /* ⚠️ NEVER in the same option set. From XH_v3_blacklist.csv (SPEC_XH_vocab_v3 §4).
     ⚠️ 椅子/桌子 was REMOVED from this list on 2026-08-16: the owner compared the two
     sprites directly and the chair's tall upright back reads clearly against the
     table's flat empty top. It was a precaution, never a measured collision — and
     store.stats[].confused will catch it if the precaution was right after all.
     That instrumentation is how this list is maintained from here (spec §8). */
  var BLACKLIST = [
    ["包子", "饺子"],   // both pale steamed dough on a plate
    ["猪肉", "牛肉"],   // both slabs of red-pink meat
    ["汤", "面"],       // both bowls of soup-like food
    ["茶", "咖啡"],     // both cups with steam
    ["同学", "朋友"],   // both drawn as two figures
    ["车", "德士"]      // both side-view cars; the taxi differs only by its roof sign
  ];
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
  /* ③挑战难度 in question terms: how many buttons are on screen. Clamped so a tiny
     group can never ask for more distractors than it has (the 组别 rule stands —
     they always come from the answer's own group, never from another). */
  function optCount() {
    var n = store.optsN || 4;
    return Math.max(2, Math.min(n, 4));
  }
  /* ⚠️ `mode` is optional and defaults to the current round's: in 看图识词 /
     听音识图 the options ARE pictures, so a pictureless distractor renders as an
     empty button. */
  function distractors(w, n, mode) {
    n = n || 3;
    var picked = [], banned = mates(w.词语);
    var need = modeNeedsPic(mode || (state && state.mode) || store.mode);
    var pool = shuffle(WORDS.filter(function (o) {
      return o.词语 !== w.词语 && o.组别 === w.组别 && (!need || hasPic(o));
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
     子类 stays in the data and resurfaces in 我的词语表 as chapter sections, where a
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
  /* store.scope: null = every group (the fresh-profile default), otherwise EXACTLY
     the listed groups — and an empty list really is empty (owner 2026-08-16).
     ⚠️ It used to silently fall back to「all」whenever the list emptied, and
     toggleScope refused to remove the last chip. That made 清空 impossible: the
     student pressed clear and the dock either ignored them or quietly re-selected
     everything. Empty is a legitimate half-second on the way to「just 食物」, so it
     is allowed and shown honestly (未选 · 0 词); startRound is what says no. */
  function scopeNames() {
    var all = allGroupNames();
    if (!store.scope) return all.slice();
    return store.scope.filter(function (g) { return all.indexOf(g) >= 0; });
  }
  function scopedWords() {
    var sel = {}; scopeNames().forEach(function (g) { sel[g] = 1; });
    return WORDS.filter(function (w) { return sel[w.组别]; });
  }
  /* ⚠️ NEVER join the group names (owner 2026-08-16). The pill is nowrap and
     flex:none, so 「日常用品 · 动物 · 37 词」 ate the header and wrapped
     「学习范围 · 可多选」 onto three lines on a phone. A count says the same thing
     in two characters — the chips below already show WHICH groups. */
  function scopeLabel() {
    var n = scopeNames().length, all = allGroupNames().length;
    if (!n) return "未选";
    if (n === all) return "全部";
    if (n === 1) return scopeNames()[0];
    return n + " 组";
  }
  function setScope(list) { store.scope = list; save(); }
  function toggleScope(g) {
    var cur = scopeNames(), i = cur.indexOf(g);
    if (i >= 0) cur.splice(i, 1); else cur.push(g);
    setScope(cur);
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

  /* ---------- 图卡适用性 (HANDOFF_生活空间 §4.4) ----------
     ⚠️ NOT EVERY WORD HAS A PICTURE, and this is the one place that fact is
     enforced. 数字 (零-十、百、千、两) carry no sprite ON PURPOSE: a number is
     already a symbol, and drawing three apples to teach 三 teaches 苹果.

     STRUCTURAL CONSEQUENCE, spelled out because §4.4 warns it fails SILENTLY:
     看图识词 and 听音识图 both need a PICTURE AS THE ANSWER, so a pictureless word
     can never appear in them — not as the answer and not as a distractor.
     It is fine everywhere else: 拼音打字, 连线, 看图学词.
     ⚠️ Any future group without art (colours? directions?) inherits this for free
     by having an empty 图档 — do not add a second mechanism. */
  function hasPic(w) { return !!(w && w.图档); }
  function modeNeedsPic(mode) { return mode === "pic" || mode === "listen"; }
  /* the pool a given mode may draw from, answers AND distractors alike */
  function poolForMode(pool, mode) {
    /* ⚠️ 传声筒 draws from the SENTENCE library, not the word list, so a scope can
       be full of perfectly good words and still have nothing to ask (数字 has no
       sentences at all). Narrowing the pool here is what makes the mode grey
       itself out with a reason instead of dying on 出发. */
    if (isPhraseMode(mode)) {
      var ok = {};
      phrasesFor(pool, mode).forEach(function (p) { ok[p.ask] = 1; });
      return pool.filter(function (w) { return ok[w.词语]; });
    }
    return modeNeedsPic(mode) ? pool.filter(hasPic) : pool;
  }

  /* ---------- 传声筒 · 语句库 (PATCH_02) ----------
     ⚠️ NO DISTRACTORS ARE STORED. The original design demanded every sentence's
     distractors be hand-written and forbade drawing them from a pool. PATCH_02 §1
     retires that: it was written when the library held ten sentences, and at 92 the
     cost of honouring it was not「slightly worse quality」but 传声筒 never shipping.
     Distractors now come from the target word's own 组别, exactly like every other
     mode here — this REMOVES a special case rather than adding one. */
  var PHRASES = [];
  /* ⚠️ Scene backdrops (HANDOFF §2). A 传声筒 round is drawn from ONE scene so this
     image can stay put for the whole round — a backdrop that changed every question
     would be noise, and the scene is the reason the sentence sounds natural at all. */
  var SCENE_BG = {
    "学校": "scene_school", "交通": "scene_transport", "购物商场": "scene_mall",
    "菜市场": "scene_market", "便利店": "scene_minimart", "熟食中心": "scene_hawker",
    "组屋区": "scene_hdb", "动物园": "scene_zoo", "农场": "scene_farm",
    "水族馆": "scene_aquarium"
  };
  /* sentences that are shown for atmosphere but never asked (PATCH_02 §4.2/§4.3):
     the target is tile-only with no picture, or the line has no target at all. */
  function phraseAskable(p) { return p && !p.display && p.ask; }
  function wordByText(t) {
    for (var i = 0; i < WORDS.length; i++) if (WORDS[i].词语 === t) return WORDS[i];
    return null;
  }
  /* both sentence modes; §8.4 asked for one predicate rather than two `=== "phrase"`
     tests that would drift apart */
  function isPhraseMode(m) { return m === "phrase" || m === "sort"; }
  /* ---------- `seg` — 重整句子 的分块 (HANDOFF_学以致用 §3) ----------
     ⚠️ OPTIONAL, AND HAND-WRITTEN. A sentence with no `seg` is simply invisible to
     重整句子; nothing else in the codebase reads the field, so its absence cannot
     break 看句选词, 我的词语表 or the search index.
     ⚠️ NEVER SEGMENT AT RUNTIME. The dock ships flat files with no build step, and
     more importantly the cut IS the teaching decision: 我/每天/搭/巴士/去/学校 and
     我/每天/搭巴士/去学校 are two different lessons. That is not the program's call.
     The four checks below are §3.4's validator, run here rather than offline so a
     malformed row disqualifies its own sentence instead of shipping a broken round. */
  var SEG_END = /[。？！]$/;
  var SEG_PUNCT = /[，,、。．：:；;！!？?（）()“”"'’‘—…·\s]/;
  function segOK(p) {
    if (!p || !(p.seg instanceof Array) || p.seg.length < 3) return false;
    for (var i = 0; i < p.seg.length; i++) {
      if (typeof p.seg[i] !== "string" || !p.seg[i] || SEG_PUNCT.test(p.seg[i])) return false;
    }
    if (p.seg.join("") !== String(p.zh || "").replace(SEG_END, "")) return false;
    /* ask must be exactly one block: straddling two means the cut is wrong, and the
       whole 未认得优先 bucket key (§6.2) reads store.done[p.ask]. */
    if (p.ask && p.seg.indexOf(p.ask) === -1) return false;
    return true;
  }
  function phrasesFor(pool, mode) {
    var have = {};
    pool.forEach(function (w) { have[w.词语] = 1; });
    return PHRASES.filter(function (p) {
      if (!phraseAskable(p) || !have[p.ask]) return false;
      return mode === "sort" ? segOK(p) : true;
    });
  }

  /* ---------- modes (spec §4) ----------
     看图学词 is FIRST and is not a test: owner 2026-08-15, "needs a flashcard
     option for the users to learn the words before getting tested". Everything
     else here asks a beginner to pick the right word out of four before anyone
     has told them what any of them are. The flashcard deals with that, so it
     leads the list and every other mode reads as「now check yourself」. */
  /* ⚠️ `learn: true` places a mode in the ② 学词 tab; everything else is 闯关.
     看图学词 (id "learn") is the flashcard walk and is special-cased in startRound;
     every other mode, including 英文选词, runs the ordinary 5-question round. */
  var MODES = [
    /* ⚠️ 看图学词 → 词语闪卡 (owner 2026-08-16 evening). Same card, the name the
       mountains already use. It now has TWO faces, 词语卡 and 句子卡 — see
       store.cardKind and the sentence branch in startRound/renderLearn. */
    { id: "learn", icon: "📖", zh: "词语闪卡", en: "Flashcards", learn: true },
    /* 英文选词 — the plain meaning→词语 MCQ the rest of the platform has (owner
       2026-08-16: 学词 was flashcards and nothing else). Every other dock mode is
       picture- or sound-led, so this is the only one that makes the student read
       the characters. English prompt because it is the only meaning a beginner
       here can read — and it is TEXT ONLY: English is never spoken, anywhere. */
    { id: "enmcq", icon: "🔤", zh: "英文选词", en: "English → word", learn: true, opts: true },
    /* 看图识词 and 听音识图 moved OUT of 闯关 into 学词 (owner 2026-08-16). They are
       four-option questions, not games — the same shape as the mountain's 学习挑战,
       which is exactly what the owner asked this screen to look like. 闯关 keeps the
       two that really are games: typing against a rising fish, and the match board. */
    { id: "pic", icon: "🖼️", zh: "看图识词", en: "Picture → word", learn: true, opts: true },
    { id: "listen", icon: "🔊", zh: "听音识图", en: "Listen → picture", learn: true, opts: true },
    /* 看句选词（原名 传声筒）— a word from the scene is blanked out of a real sentence
       and the student picks it. ⚠️ IT IS NOT A SENTENCE TEST. PATCH_02 §0: the goal is
       to make a zero-start learner MEET these words again inside real language, not
       to make them master the sentence. Not understanding the whole line is the
       expected state; wherever「harder」and「more exposure」pull apart, take exposure.
       ⚠️ THE id STAYS "phrase". store.mode, remembered modes, SHELL_PTS, poolForMode
       and SCENE_BG all index on it; renaming the id would point every returning
       student's remembered mode at nothing. Only the LABEL changed. */
    { id: "phrase", icon: "📣", zh: "看句选词", en: "Fill the sentence", learn: true, opts: true },
    /* 重整句子 — the word-tile game the 2026-08-16 morning design specified and
       PATCH_02 replaced with an MCQ to get something shippable. This puts it back.
       ⚠️ It teaches WORD ORDER, so it is the one mode whose answer is a sequence.
       It needs the optional `seg` array; sentences without one are invisible to it
       and the mode greys itself out rather than failing on 出发. */
    { id: "sort", icon: "🧩", zh: "重整句子", en: "Put the words in order", learn: true },
    { id: "type", icon: "🎣", zh: "词海垂钓", en: "Reel it in — type the pinyin" },
    { id: "match", icon: "🪢", zh: "连线", en: "Match them up" }
  ];
  /* ---------- ③ 的入口 (owner 2026-08-16 evening) ----------
     The tiles on the front page. ⚠️ They are NOT the same list as MODES: 词语挑战
     is one door with four question types behind it, exactly as the mountain's
     学习挑战 holds 填空/华文解释/英文翻译. Keeping the four apart out here was the
     「clunky」the owner reported — a beginner had to tell 看图识词 from 听音识图
     before meeting a single word.
     `k` is the door, not a mode id: startRound is still driven by store.mode. */
  /* ⚠️ 学词 面分成 词 与 句 两层（owner 2026-08-16）：
     词语挑战 = 词的层面（三个题型）· 学以致用 = 句的层面（两个题型，把刚学的词拿去用）。
     原先 传声筒 混在四个词级题型里，是唯一考句子的那个，形状不一致。 */
  var ENTRIES = [
    { k: "cards", icon: "📖", zh: "词语闪卡", en: "Flashcards", learn: true,
      sub: "词语卡 · 句子卡", subEn: "words or sentences" },
    { k: "quiz", icon: "🎯", zh: "词语挑战", en: "Quiz yourself", learn: true,
      sub: "英文选词 · 看图识词 · 听音识图", subEn: "three question types" },
    { k: "use", icon: "💬", zh: "学以致用", en: "Put it to use", learn: true,
      sub: "看句选词 · 重整句子", subEn: "sentences, not single words" },
    { k: "type", icon: "🎣", zh: "词海垂钓", en: "Reel it in — type the pinyin", learn: false },
    { k: "match", icon: "🪢", zh: "连线", en: "Match them up", learn: false }
  ];
  /* which store slot remembers the last type used behind a multi-type door.
     ⚠️ One slot per door: quizMode and useMode must never overwrite each other. */
  var ENTRY_MEM = { quiz: "quizMode", use: "useMode" };
  function entryByKey(k) {
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].k === k) return ENTRIES[i];
    return ENTRIES[0];
  }
  /* the mode ids a door can start. 词语挑战 owns the four question types; every
     other door owns exactly one mode. */
  function entryModes(k) {
    if (k === "cards") return ["learn"];
    if (k === "quiz") return ["enmcq", "pic", "listen"];
    if (k === "use") return ["phrase", "sort"];
    return [k];
  }
  /* ⚠️ A door that cannot run under the current 学习范围 must SAY SO here rather
     than open onto a dead config screen. Same rule §4.4 already applies one level
     down: 看图识词/听音识图 need a picture, 传声筒 needs a sentence. */
  function entryUsable(pool, k) {
    return entryModes(k).some(function (m) { return poolForMode(pool, m).length > 0; });
  }
  function entryTilesHtml(isLearn) {
    var pool = scopedWords();
    return ENTRIES.filter(function (e) { return e.learn === isLearn; }).map(function (e) {
      var ok = entryUsable(pool, e.k);
      /* ⚠️ NOT `.big`. These sit in the left rail under ①学习范围 and ②, and at
         `.big`'s 20px padding the three boards ran to 1074px — taller than the hero
         column, which then stretched its tiles to fill and left the 我的词语表 cover
         floating in the middle of a 330px card. Two ordinary-sized tiles read as
         doors just as well and give the column back ~70px. */
      return '<button class="xh-mode' + (ok ? "" : " na") + '" data-e="' + e.k + '"' +
        (ok ? "" : " disabled") + '>' +
        '<span class="xh-mi">' + e.icon + "</span><b>" + e.zh + "</b>" + xhPy(e.zh) +
        '<span class="xh-en">' + e.en + "</span>" +
        (ok
          ? (e.sub ? '<span class="xh-mode-sub">' + e.sub +
                     '<span class="xh-en">' + e.subEn + "</span></span>" : "")
          : '<span class="xh-mode-na">这组没有图片<span class="xh-en">no pictures</span></span>') +
        "</button>";
    }).join("");
  }
  /* `opts:true` = the mode shows the ③挑战难度 slider (how many options are on
     screen). 看图学词 asks nothing, 词海垂钓 is typed, and 连线's difficulty is its
     board size — none of them have an option count to set. */
  function modeById(id) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i];
    return MODES[0];
  }
  var ROUND_SIZES = [5, 10, 15, 20];       // ②每次题数
  var OPT_TIERS = [2, 3, 4];               // ③挑战难度 — options on screen
  function optTierLabel(n) {
    return (n === 2 ? "⭐ " : n === 3 ? "⭐⭐ " : "⭐⭐⭐ ") + n + " 个选项";
  }
  var MATCH_SIZES = [3, 5, 8];   // 连线 difficulty: pairs on the board at once
  /* 重整句子 difficulty: how many DECOY word tiles join the sentence's own blocks.
     ⚠️ 0 is a real setting, not a placeholder — see the note at its slider. */
  var SORT_EXTRAS = [0, 2, 4, 6];
  function sortExtraLabel(n) {
    return n === 0 ? "刚好够 · 没有干扰词" : "+" + n + " 块 · " + (n === 2 ? "容易" : n === 4 ? "普通" : "有挑战");
  }

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
      "<span>" + zh + xhPy(zh) + '<span class="xh-en">' + en + "</span></span></div>";
  }

  /* ---------- menu ---------- */
  function renderMenu() {
    state = null;
    view().classList.add("two-col");        // the ONLY screen laid out in two columns
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

    /* ⚠️ TWO COLUMNS at >=900px (DESIGN_迭代规划_启航码头布局). The blocks are
       WRAPPED, never reordered, so the phone stack falls out of source order for
       free and the ①②③ numerals stay correct in both layouts. */
    var h = '<div class="xh-col-l">';

    var sel = scopeNames(), selWords = scopedWords();
    /* ⚠️ the label AND its glosses must live in ONE flex item. xhPy/xh-en are
       display:block, so left loose they each became a flex sibling of the summary
       pill and squeezed 「学习范围 · 可多选」 into three wrapped lines. */
    h += '<div class="xh-board"><button class="xh-sec xh-sec-t" id="xhScopeT">' + stepNo(1) +
      '<span class="xh-sec-lab">学习范围 · 可多选' + xhPy("学习范围 · 可多选") +
      '<span class="xh-en">what to study</span></span>' +
      '<span class="xh-sum">' + esc(scopeLabel()) + " · " + selWords.length + ' 词</span>' +
      '<span class="xh-caret">' + (store.scopeOpen ? "▾" : "▸") + "</span></button>";
    /* ⚠️ ALWAYS emitted now. At >=900px it is always visible (a rail with three
       groups gains nothing from collapsing and costs a tap before every round);
       below 900px .sc-closed hides it and the caret still toggles.
       store.scopeOpen is KEPT — saved profiles carry it, and the phone uses it. */
    h += '<div class="xh-scopewrap' + (store.scopeOpen ? "" : " sc-closed") + '">';
    {
      /* 全选 / 清空 — the mountain's 复习范围 has had these since day one and the
         dock did not, so「选全部」meant six taps and「只要食物」meant five (owner
         2026-08-16). 清空 really empties: 出发 then explains, rather than the dock
         silently re-selecting everything behind the student's back. */
      h += '<div class="xh-scope-acts">' +
        '<button class="xh-sbtn" id="xhScopeAll">全选' + xhPy("全选") +
          '<span class="xh-en">All</span></button>' +
        '<button class="xh-sbtn" id="xhScopeNone">清空' + xhPy("清空") +
          '<span class="xh-en">Clear</span></button></div>';
      h += '<div class="xh-scope">';
      groups().forEach(function (b) {
        var on = sel.indexOf(b.组别) >= 0;
        /* ⚠️ 图标·组名·进度 挤在同一行（owner 2026-08-16：「可以一行放更多组，
           省点竖向空间」）。原来是五行叠着放，八个组就是 ~760px，把 ②选择学习方式
           整个推到折线以下——iPad 上第一屏只看得到分类。拼音和英文照旧各占一行，
           但那两行本来就是闸门控制的，关掉之后卡片只剩一行高。 */
        h += '<button class="xh-gchip' + (on ? " on" : "") + '" data-g="' + esc(b.组别) + '"' +
          ' aria-pressed="' + (on ? "true" : "false") + '">' +
          '<span class="xh-gc-top">' + xhGroupIc(b.组别) + "<b>" + esc(b.组别) + "</b>" +
          '<span class="xh-gc-n">' + b.done + "/" + b.n + "</span></span>" +
          xhPy(b.组别) + xhGroupEn(b.组别) + "</button>";
      });
      h += "</div>";
    }
    h += "</div></div>";

    /* ⚠️ The four destination tiles moved OUT of the left rail (owner 2026-08-16:
       「the left side is too long and the right side too empty」). At >=900px the
       rail held hero + scope + four tiles (~1000px) while the right column ended
       at ~455px. They are built here, next to the code that computes their
       numbers, and emitted at the BOTTOM OF THE RIGHT COLUMN as a 2-up grid.
       On a phone both wrappers are plain blocks, so this also puts the
       destinations after 出发 in the stack, which is the better reading order. */
    /* ⚠️ THREE tiles, and 我的海滩 is NOT one of them (owner 2026-08-16 evening:
       「the big image already is the entry point」). The hero IS the beach — same
       artwork, same boat, same berth items — so a tile pointing at it was a second
       door onto the same room, directly underneath the first.
       Layout: 我的词语表 spans the full width (it is the one with cover art and a
       progress bar, and it is where a student goes most), 航海徽章 and 码头风云榜
       share the row below. */
    var tiles = '';
    /* 我的词语表 tile. 航程 (1 词 = 1 海里) is the dock's own distance metric and is
       deliberately NOT 海拔 — nothing crosses the waterline. */
    tiles += '<button class="xh-tile wide" id="xhLog">' +
      '<img class="xh-tile-art" src="art/xh/xh_atlas_cover.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
      '<span class="xh-tile-txt"><b>我的词语表</b>' + xhPy("我的词语表") +
      '<span class="xh-en">every word, and the ones you have met</span>' +
      '<span class="xh-bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="xh-tile-n">' + st.met + " / " + st.all + ' 海里</span></span>' +
      '<span class="xh-tile-go">›</span></button>';

    /* ⚠️ the badge ART, not a 🎖️ (owner 2026-08-16 evening). Nine mother-of-pearl
       medallions were drawn for this ladder and the front page was showing a system
       emoji instead. Earned ones are full colour, the rest carry the same greyscale
       lock the wall uses, so the strip reads as「how far along」at a glance. */
    tiles += '<button class="xh-tile slim" id="xhBadges">' +
      '<span class="xh-tile-txt"><b>航海徽章</b>' + xhPy("航海徽章") +
      '<span class="xh-en">your badges</span>' +
      /* ⚠️ 计数与徽章同一行（owner 2026-08-16 晚）：九枚放得下就一整行，
         「0 / 9」挪到旁边，美术不必再挤成两行。窄屏放不下时计数自己掉到下一行。 */
      '<span class="xh-badgerow"><span class="xh-badgestrip">' + SAIL_BADGES.map(function (b) {
        return '<img class="' + (sailBadgeGot(b) ? "got" : "") + '" src="art/xh/badges/' +
          b.img + '.png' + ASSET_V + '" alt="" title="' + esc(b.zh) + '" ' +
          "onerror=\"this.style.display='none'\">";
      }).join("") + '</span>' +
      '<span class="xh-tile-n">' + SAIL_BADGES.filter(sailBadgeGot).length + ' / ' +
        SAIL_BADGES.length + '</span></span></span>' +
      '<span class="xh-tile-go">›</span></button>';

    tiles += '<button class="xh-tile slim" id="xhBoards">' +
      '<span class="xh-tile-ic">🏆</span>' +
      '<span class="xh-tile-txt"><b>码头风云榜</b>' + xhPy("码头风云榜") +
      '<span class="xh-en">the dock boards</span>' +
      '<span class="xh-tile-n">航海值 ' + (store.sail || 0) + " · 航程 " + st.met + ' 海里</span></span>' +
      '<span class="xh-tile-go">›</span></button>';

    /* ---------- ① 学习范围 ② 学词/闯关 ③ 玩法 (owner 2026-08-16) ----------
       Was: a flat row of five modes, then「选词语组」as a second step where tapping
       a group also STARTED the round. The owner asked for the mountain's shape —
       two main buttons and a toggleable scope — so scope is now a persistent
       setting at the top, the two buttons pick the kind of activity, and the mode
       cards below are only the ones that belong to the chosen kind. */

    /* ⚠️ ② IS A TOGGLE AGAIN, AND ③ IS BACK ON THIS PAGE (owner 2026-08-16 evening:
       「follow the mountains — the selection shows the corresponding tiles, and only
       when the player clicks in do they get the difficulty controls. right now the
       pier interface is too clunky」).
       For one day ② was navigation: tapping 学词 opened a config screen that had to
       carry BOTH「which activity」and「how hard」, so the first thing a beginner met
       after two taps was a page of sliders. The mountain never does that: ② picks
       修行/闯关, ③ lays the activities out as tiles right there, and the settings
       live inside whichever activity you walk into.
       store.tab still remembers the side, and it is now what ③ renders from. */
    var isLearnTab = store.tab !== "play";
    h += '<div class="xh-board"><div class="xh-sec">' + stepNo(2) +
      '选择学习方式' + xhPy("选择学习方式") + ' <span class="xh-en">learn or play</span></div>' +
      '<div class="xh-tabs">' +
      '<button class="xh-tab' + (isLearnTab ? " on" : "") + '" data-t="learn">' +
        '<span class="xh-mi">📖</span><b>学习</b>' + xhPy("学习") +
        '<span class="xh-en">Learn</span></button>' +
      '<button class="xh-tab' + (isLearnTab ? "" : " on") + '" data-t="play">' +
        '<span class="xh-mi">🎮</span><b>闯关</b>' + xhPy("闯关") +
        '<span class="xh-en">Play</span></button>' +
      "</div></div>";

    /* ③ — the activities for whichever side ② is on. ⚠️ These are DOORS, not
       settings: one tap each, and the difficulty/round-length controls are on the
       other side of the door. A tile that cannot run under the current 学习范围
       greys out with the reason, exactly as the mode buttons did before. */
    h += '<div class="xh-board"><div class="xh-sec">' + stepNo(3) +
      (isLearnTab ? '今天学什么' + xhPy("今天学什么") + ' <span class="xh-en">pick an activity</span>'
                  : '词语游乐场' + xhPy("词语游乐场") + ' <span class="xh-en">pick a game</span>') +
      '</div><div class="xh-modes acts">' + entryTilesHtml(isLearnTab) + "</div></div>";

    h += '</div><div class="xh-col-r">';   // left rail ends, right column begins
    /* ⚠️ The hero IS the student's own beach, and it sits at the TOP OF THE RIGHT
       COLUMN (owner 2026-08-16 evening:「the pier must show the big picture on the
       right like the mountains」). It was in the left column for one day.
       This mirrors the stream pages exactly: 左 = 我要做什么 (the numbered flow),
       右 = 我走到哪了 (identity and progress, no numerals). Same artwork as
       我的海滩, the same boat and berth items at the same percentage coordinates,
       so what has been bought is visible from the front page, not two taps down.
       ⚠️ Keep it OUT of .xh-col-l: a numbered step and an identity banner in one
       column is the mix the stream-page handoff §0 exists to prevent. */
    h += '<button class="xh-hero" id="xhHero" title="我的海滩">' +
      '<img class="xh-hero-bg" src="art/xh/dock_bg.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
      '<span class="xh-hero-scene">' + beachSpritesHtml() + '</span>' +
      '<div class="xh-hero-in">' +
        '<div class="xh-hero-t">启航码头</div>' +
        '<div class="xh-hero-sub">看图学词 · 看图听音，慢慢来' + xhPy("看图学词 · 看图听音，慢慢来") +
        '<span class="xh-en">Pictures first, characters second. Go at your own pace.</span></div>' +
        '<div class="xh-stats">' +
          statCell(st.met, "海里", "航程", "words met") +
          statCell(st.acc === null ? "—" : st.acc + "%", "", "一次答对", "first-try correct") +
          statCell(st.full + " / " + st.groups, "", "集齐的组", "chapters complete") +
        "</div></div></button>";


    h += '<div class="xh-tiles">' + tiles + "</div>";  // destinations fill the column below
    h += "</div>";                                   // close .xh-col-r
    view().innerHTML = h;

    document.getElementById("xhHero").onclick = renderBeach;
    document.getElementById("xhLog").onclick = function () { renderLog(); };
    document.getElementById("xhBoards").onclick = function () { renderBoards(); };
    document.getElementById("xhBadges").onclick = renderBadges;
    document.getElementById("xhScopeT").onclick = function () {
      store.scopeOpen = !store.scopeOpen; save(); renderMenu();
    };
    Array.prototype.forEach.call(view().querySelectorAll(".xh-gchip"), function (el) {
      el.onclick = function () { toggleScope(el.getAttribute("data-g")); renderMenu(); };
    });
    document.getElementById("xhScopeAll").onclick = function () {
      setScope(allGroupNames()); renderMenu();
    };
    document.getElementById("xhScopeNone").onclick = function () { setScope([]); renderMenu(); };
    /* ② only switches which tiles ③ shows — it never leaves the page any more. */
    Array.prototype.forEach.call(view().querySelectorAll(".xh-tab"), function (el) {
      el.onclick = function () {
        store.tab = el.getAttribute("data-t"); save();
        renderMenu();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode[data-e]"), function (el) {
      el.onclick = function () {
        /* an empty 学习范围 is allowed as a state but obviously not as a round: say so
           at the door rather than letting them configure something unstartable */
        if (!scopedWords().length) { toast("请先选一组词语 · Pick a group first"); return; }
        renderModeConfig(el.getAttribute("data-e"));
      };
    });
  }

  /* ---------- ②学词 / ②闯关 的配置页 (owner 2026-08-16) ----------
     Deliberately the same three-step card the mountain uses for 学习挑战:
     ①题型 ②每次题数 ③挑战难度, then one start button. The dock had a flat mode grid
     with a separate 出发 on the menu; this puts the settings next to the thing they
     configure and leaves exactly one way to begin.
     ⚠️ ③ only renders for modes that HAVE an option count (MODES[].opts). For 连线
     the same slider position means board size, so it is relabelled rather than
     shown twice — and 看图学词 / 词海垂钓 have no difficulty at all. */
  function renderModeConfig(kind) {
    state = null;
    view().classList.remove("two-col");
    /* ⚠️ ONE DOOR PER SCREEN (owner 2026-08-16 evening). It used to take a
       "learn"/"play" SIDE and re-show the whole mode grid, so the student picked the
       activity twice: once on the front page, once again here. `kind` is now an
       ENTRIES key and this screen only asks the questions that活动 actually has.
       Old side values are still accepted so a stale call cannot land on nothing. */
    if (kind === "learn") kind = "cards";
    if (kind === "play") kind = "type";
    var ent = entryByKey(kind);
    var pool = scopedWords();
    var modes = entryModes(kind);

    /* which mode will actually run. 词语挑战 restores the remembered question type;
       every other door owns exactly one. ⚠️ If the scope has since blocked it (数字
       has no pictures) fall to the first usable sibling rather than opening on a
       dead selection. */
    var mem = ENTRY_MEM[kind];
    var want = mem ? store[mem] : modes[0];
    if (modes.indexOf(want) === -1) want = modes[0];
    if (!poolForMode(pool, want).length) {
      var alt = null;
      modes.forEach(function (m) { if (!alt && poolForMode(pool, m).length) alt = m; });
      want = alt || modes[0];
    }
    if (store.mode !== want) { store.mode = want; }
    if (mem) store[mem] = want;
    save();
    var cur = modeById(store.mode);

    var h = '<div class="xh-round-bar">' + quitBtn() +
      '<span class="xh-block-tag">' + esc(ent.zh) + '</span></div>';
    h += '<div class="xh-board xh-cfg">';
    h += '<div class="xh-berth-title">' + ent.icon + " " + ent.zh + xhPy(ent.zh) +
      '<span class="xh-en">' + ent.en + '</span></div>';
    h += '<div class="xh-cfg-scope">范围：' + esc(scopeLabel()) + " · " + pool.length + " 词" +
      '<span class="xh-en">' + pool.length + ' words in scope</span></div>';

    var step = 0;
    function sec(zh, en) {
      step++;
      return '<div class="xh-sec">' + stepNo(step) + zh + xhPy(zh) +
        ' <span class="xh-en">' + en + '</span></div>';
    }

    if (kind === "cards") {
      /* ⚠️ 词语卡 / 句子卡 (owner 2026-08-16 evening: 「in flashcards, divide into
         vocab and sentences」). The sentence side reads the 生活空间 lines the
         传声筒 asks about — the SAME library, with nothing blanked out. That is
         deliberate: §11 says wherever「harder」and「more exposure」pull apart, take
         exposure, and reading the line whole is the most exposure it can give.
         ⚠️ 句子卡 records NO progress. 航程 counts words a student recognises, and
         reading a sentence is not that. */
      var nPhr = phrasesFor(pool, "phrase").length;
      /* ⚠️ a remembered 句子卡 must not survive into a scope with no sentences
         (数字 has none at all): 出发 would call startRound, find an empty sequence
         and return, and the student would be left pressing a button that does
         nothing — the same silent failure §4.4 exists to prevent. */
      if (!nPhr && store.cardKind === "sentence") { store.cardKind = "word"; save(); }
      h += sec("看什么卡", "words or sentences") +
        '<div class="xh-modes two">' +
        '<button class="xh-mode big' + (store.cardKind === "word" ? " on" : "") +
          '" data-ck="word"><span class="xh-mi">🖼️</span><b>词语卡</b>' + xhPy("词语卡") +
          '<span class="xh-en">Word cards</span>' +
          '<span class="xh-mode-sub">' + pool.length + ' 张<span class="xh-en">' +
          pool.length + ' cards</span></span></button>' +
        '<button class="xh-mode big' + (store.cardKind === "sentence" ? " on" : "") +
          (nPhr ? "" : " na") + '" data-ck="sentence"' + (nPhr ? "" : " disabled") + '>' +
          '<span class="xh-mi">💬</span><b>句子卡</b>' + xhPy("句子卡") +
          '<span class="xh-en">Sentence cards</span>' +
          (nPhr ? '<span class="xh-mode-sub">' + nPhr + ' 句<span class="xh-en">' +
                  nPhr + ' sentences</span></span>'
                : '<span class="xh-mode-na">这组没有句子<span class="xh-en">no sentences</span></span>') +
        "</button></div>";
      h += '<div class="xh-cfg-note">' +
        (store.cardKind === "sentence"
          ? '句子卡会把选中范围里的句子一句一句读完（' + nPhr + ' 句）。句子卡不记航程。'
          : '词语卡会把选中的词一张一张看完（' + pool.length + ' 张）。') +
        '<span class="xh-en">' +
        (store.cardKind === "sentence"
          ? 'Sentence cards run through every sentence in scope. They do not count towards 航程.'
          : 'Word cards run through every word in scope.') + '</span></div>';
    } else if (modes.length > 1) {
      /* the question types behind a multi-type door (词语挑战 三个 · 学以致用 两个).
         ⚠️ Numbered: on this screen it really IS the first decision the student
         makes, not a refinement of a card they picked one screen earlier.
         ⚠️ The two 学以致用 types are two SEPARATE cards and there is no mid-round
         switch between them (owner 2026-08-16). 看句选词 prints the whole sentence on
         a correct answer, so switching to 重整句子 on that same sentence would hand
         over the complete word order — which is the only thing 重整句子 tests.
         ⚠️ Do NOT read that as「the dock forbids mid-round switching」: 组词挑战 on the
         mountain switches 释义/英文/填空 freely, and that is safe because it changes
         the PROMPT, not the mechanism, and the answer stays the same word. */
      h += sec(kind === "use" ? "学以致用的方式" : "挑战方式", "which question") +
        '<div class="xh-modes sub">';
      var blocked = 0, noSeg = false;
      modes.forEach(function (id) {
        var m = modeById(id), usable = poolForMode(pool, id).length > 0;
        if (!usable) { blocked++; if (id === "sort") noSeg = true; }
        var why = id === "sort" ? "这些句子还没有分块" : "这组没有图片";
        var whyEn = id === "sort" ? "sentences not split yet" : "no pictures";
        h += '<button class="xh-mode sm' + (store.mode === id ? " on" : "") +
          (usable ? "" : " na") + '" data-m="' + id + '"' + (usable ? "" : " disabled") + '>' +
          '<span class="xh-mi">' + m.icon + "</span><b>" + m.zh + "</b>" + xhPy(m.zh) +
          '<span class="xh-en">' + m.en + "</span>" +
          (usable ? "" : '<span class="xh-mode-na">' + why +
                         '<span class="xh-en">' + whyEn + "</span></span>") +
          "</button>";
      });
      h += "</div>";
      /* ⚠️ 重整句子 is blocked by MISSING DATA, not by the student's scope, so it needs
         its own sentence — 「这组没有图片」 would send them off changing 学习范围 for
         something no scope can fix. `seg` is hand-written per §3.3 and none exist yet. */
      if (noSeg) {
        h += '<div class="xh-cfg-note">重整句子 需要把句子先切成词块，这批句子还没有切。' +
          '<span class="xh-en">重整句子 needs its sentences split into word tiles first. ' +
          'That is written by hand, and none are ready yet.</span></div>';
      }
      if (blocked - (noSeg ? 1 : 0) > 0) {
        h += '<div class="xh-cfg-note">「数字」这一组没有图片，所以看图和听音的玩法用不上。' +
          '数字可以用 词语闪卡、词海垂钓 和 连线 来练。' +
          '<span class="xh-en">Numbers have no pictures, so picture and listening rounds are off ' +
          'for them. Use flashcards, typing or matching instead.</span></div>';
      }
    }

    if (kind === "match") {
      h += sec("一次连几组", "pairs on the board") +
        qtySlider("xhMatchN", MATCH_SIZES, store.matchN, function (n) {
          return n + " 组 · " + (n === 3 ? "容易" : n === 5 ? "普通" : "有挑战");
        });
    } else if (kind !== "cards") {
      h += sec("每次题数", "questions per round") +
        qtySlider("xhRoundN", ROUND_SIZES, store.roundN, function (n) { return n + " 题"; });
      if (cur.opts) {
        h += sec("挑战难度", "how many choices") +
          qtySlider("xhOptsN", OPT_TIERS, store.optsN, optTierLabel);
      }
      /* 重整句子's difficulty is how many EXTRA word tiles sit in the tray, the same
         shape as the mountain's 字块数量. ⚠️ Its own constant, never OPT_TIERS: that
         one means「how many options are on screen」and the two would drift.
         ⚠️ The lowest step really is 0 — exactly enough tiles, no decoys. PATCH_02 §0
         still rules: the dock takes more exposure over more difficulty, and a
         zero-start beginner ordering eight Chinese words is already the hard part. */
      if (cur.id === "sort") {
        h += sec("多几块干扰词", "extra word tiles") +
          qtySlider("xhSortX", SORT_EXTRAS, store.sortExtra, sortExtraLabel);
      }
    }

    /* ONE action. The 返回 in the round bar above already goes back to the dock, and
       a second back button beside 出发 is the same redundancy the owner cut from the
       menu (2026-08-16). */
    h += '<div class="xh-cfg-acts">' +
      '<button class="xh-go" id="xhGoRound">出发 ›' + xhPy("出发") +
      '<span class="xh-en">start</span></button></div></div>';
    view().innerHTML = h;
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode[data-m]"), function (el) {
      el.onclick = function () {
        store.mode = el.getAttribute("data-m");
        /* ⚠️ write the slot belonging to THIS door only. Before 学以致用 existed there
           was one slot and an unconditional write; with two doors that would let
           词语挑战 clobber what 学以致用 remembered and vice versa. */
        if (mem) store[mem] = store.mode;
        save();
        renderModeConfig(kind);           // re-render: the sliders differ per type
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode[data-ck]"), function (el) {
      el.onclick = function () {
        store.cardKind = el.getAttribute("data-ck"); save();
        renderModeConfig(kind);
      };
    });
    wireQtySlider("xhRoundN", ROUND_SIZES, function (n) { return n + " 题"; },
      function (n) { store.roundN = n; save(); });
    wireQtySlider("xhMatchN", MATCH_SIZES, function (n) {
      return n + " 组 · " + (n === 3 ? "容易" : n === 5 ? "普通" : "有挑战");
    }, function (n) { store.matchN = n; save(); });
    wireQtySlider("xhOptsN", OPT_TIERS, optTierLabel, function (n) { store.optsN = n; save(); });
    wireQtySlider("xhSortX", SORT_EXTRAS, sortExtraLabel, function (n) { store.sortExtra = n; save(); });
    document.getElementById("xhGoRound").onclick = function () {
      if (!scopedWords().length) { toast("请先选一组词语 · Pick a group first"); return; }
      startRound(scopeLabel());
    };
  }

  /* ⚠️ The readout sits ABOVE the track, never beside it — a readout as a flex
     sibling makes the track grow and shrink as the label's width changes, which is
     the exact bug the mountain's slider had to fix (CLAUDE.md 2026-08-14). Ticks
     mark the stops so no end labels are needed. Copied from app.js by design: this
     file never loads app.js. */
  function qtySlider(id, values, cur, fmt) {
    var i = values.indexOf(cur); if (i === -1) i = 0;
    var ticks = "";
    for (var k = 0; k < values.length; k++) ticks += "<i></i>";
    return '<div class="qty">' +
      '<b class="qty-val" id="' + id + 'Val">' + esc(fmt(cur)) + '</b>' +
      '<div class="qty-track"><div class="qty-ticks" aria-hidden="true">' + ticks + '</div>' +
      '<input type="range" class="qty-range" id="' + id + '" min="0" max="' + (values.length - 1) +
      '" step="1" value="' + i + '" aria-label="选择数量"></div></div>';
  }
  function wireQtySlider(id, values, fmt, onPick) {
    var el = document.getElementById(id); if (!el) return;
    var out = document.getElementById(id + "Val");
    el.oninput = function () {
      var v = values[parseInt(el.value, 10)];
      if (out) out.textContent = fmt(v);
      onPick(v);
    };
  }

  /* ================= 航海徽章 · 开放式里程表 (HANDOFF_生活空间_20260816 §5) ====
     ⚠️ REPLACES THE FIVE-BADGE "COLLECT THEM ALL" LADDER. The old spec said
     "lock these now, never redesign", and its top badge was 灯塔 = EVERY word in
     the tier. That was safe only while the tier was closed. It is not: the word
     list went 36 -> 100 in a single day and will keep growing. A finish line
     defined as "all of them" therefore RUNS AWAY — a student three words short of
     灯塔 becomes twenty-three short the moment vocabulary is added, and effort
     already spent is silently taken back. That is the harm this replaces.

     THE MODEL IS AN ODOMETER, NOT A PERCENTAGE (owner, §5.1). Rejected on the way:
       - percentage: 48% is still pushed backwards by new words, just less visibly;
       - 组别 集齐: groups differ wildly (食物 32 vs 交通 7), so badges are not
         comparable, and adding a word to a finished group either revokes a badge
         or leaves it asserting something false;
       - 场景 完成: owner vetoed. The beginner syllabus is not designed yet and
         scenes run 4-10 sentences, so it would mean renegotiating the promise
         every time a scene is added.

     THREE PROPERTIES THAT MUST SURVIVE ANY FUTURE EDIT (§5.3):
       1. ⚠️ THRESHOLDS ARE ABSOLUTE AND ARE NEVER RENUMBERED. Adding vocabulary
          must never move a badge further away. This is the whole point.
       2. ⚠️ THERE IS NO FINAL BADGE. The ladder is defined as extensible: when
          the word list passes 400, ADD A RUNG (600 and 800 are reserved). Do not
          redesign the scheme, and never re-point the top rung at "all words".
       3. 灯塔 no longer means "everything"; it is the 400-word far marker. That is
          the one deliberate semantic rewrite in this scheme.

     Counting still comes from store.done — which is exactly why §1.1 of the handoff
     insists that field must never be deleted. Earned badges are never revoked.
     Separate family from the mountain's A层 五枚里程碑 and B层 八枚对战奖牌:
     separate art, separate count, never folded into achBadgeCount(). */
  var SAIL_BADGES = [
    { k: "shell",      zh: "贝壳徽", en: "Shell",        img: "xh_badge_shell",      need: 10 },
    { k: "coral",      zh: "珊瑚徽", en: "Coral",        img: "xh_badge_coral",      need: 25 },
    { k: "pearl",      zh: "珍珠徽", en: "Pearl",        img: "xh_badge_pearl",      need: 50 },
    /* ⚠️ art not drawn yet (handoff §6.2). img:null renders a named plaque inside
       the same ring rather than a blank or broken slot, so the road ahead stays
       visible. Drop the PNG in and set img — nothing else needs to change. */
    { k: "starfish",   zh: "海星徽", en: "Starfish",     img: "xh_badge_starfish",   need: 75 },
    /* ⚠️ 罗盘 STAYS. The compass is a Chinese invention and 罗盘 is simply its
       Chinese name, so it carries none of the borrowed-motif problem below. */
    { k: "compass",    zh: "罗盘徽", en: "Compass",      img: "xh_badge_compass",    need: 100 },
    /* ⚠️ 船锚(150) AND 舵轮(200) WERE DISCARDED — PATCH_01 §1. An admiralty anchor
       and a spoked helm are both EUROPEAN forms; Chinese junks used stone/wood
       weights and a stern rudder, so there is no recognisable "Chinese anchor"
       silhouette to substitute. In a mother-of-pearl set they would have been the
       only two pieces that looked borrowed. The anchor art exists and is
       deliberately unused. Replaced by 龙舟 and 牵星板.
       ⚠️ THE ORDER IS DELIBERATE, do not reshuffle: 生物(75) → 器物(100) → 船(150)
       → 器物(200) → 船(300). No two adjacent rungs are the same kind, and 罗盘 and
       牵星板 are kept apart so the ladder never shows two navigation instruments
       side by side. */
    { k: "dragonboat", zh: "龙舟徽", en: "Dragon boat",  img: "xh_badge_dragonboat", need: 150 },
    /* 牵星板: a graduated SET of boards for fixing latitude by star altitude, which
       is what the art shows — historically righter than the single plate the brief
       first asked for. ⚠️ Known trade-off, accepted: at badge size it reads as a
       geometric ornament rather than an instrument. That is fine here because every
       other badge in the family is organic curves, so the angular silhouette is
       actually the most DISTINGUISHABLE one, and the name always appears with it. */
    { k: "starboard",  zh: "牵星板徽", en: "Star boards", img: "xh_badge_starboard",  need: 200 },
    { k: "sailship",   zh: "帆船徽", en: "Sailing ship", img: "xh_badge_sailship",   need: 300 },
    { k: "lighthouse", zh: "灯塔徽", en: "Lighthouse",   img: "xh_badge_lighthouse", need: 400 }
  ];
  /* ⚠️ No more null-means-every-word: every rung is an absolute number now. Kept
     as a function purely so the call sites did not have to change. */
  function sailBadgeNeed(b) { return b.need; }
  function sailBadgeGot(b) { return sailStats().met >= sailBadgeNeed(b); }

  function renderBadges() {
    view().classList.remove("two-col");
    state = null;
    var met = sailStats().met;
    var got = SAIL_BADGES.filter(sailBadgeGot).length;
    var h = '<div class="xh-round-bar">' + quitBtn() +
      '<span class="xh-block-tag">航海徽章' + xhPy("航海徽章") +
      '<span class="xh-en">badges</span></span></div>';
    h += '<div class="xh-board"><div class="beach-head">' +
      '<div class="xh-berth-title">🎖️ 航海徽章' + xhPy("航海徽章") +
      '<span class="xh-en">Your badges</span></div>' +
      '<span class="beach-purse"><b>' + got + '</b> / ' + SAIL_BADGES.length + '</span></div>' +
      /* ⚠️ ONE line (owner 2026-08-16 evening). It used to spell out「徽章只会往前加，
         不会往后退；以后加了新词，也不会把已经走到的路推远」— true, and the reason the
         ladder is built this way (see the block comment above SAIL_BADGES), but it is
         a promise about how the scheme cannot hurt you, and a pre-G1 student has no
         reason to worry about that yet. The guarantee stays in the code; the screen
         just says what to do. */
      '<div class="xh-log-sub">认得的词语越多，航行得越远。' +
      '<span class="xh-en">The more words you know, the further you sail.</span></div>';
    h += '<div class="sailbadge-wall">';
    SAIL_BADGES.forEach(function (b) {
      var need = sailBadgeNeed(b), have = met >= need;
      var pct = need ? Math.min(100, Math.round(met / need * 100)) : 0;
      h += '<div class="sailbadge' + (have ? " got" : "") + '">' +
        (b.img
          ? '<img src="art/xh/badges/' + b.img + '.png' + ASSET_V + '" alt="" ' +
            "onerror=\"this.style.display='none'\">"
          : '<span class="sailbadge-todo">' + esc(b.zh.charAt(0)) + '</span>') +
        '<b>' + esc(b.zh) + '</b>' + xhPy(b.zh) + '<span class="xh-en">' + esc(b.en) + '</span>' +
        (have ? '<span class="beach-tag on">已获得</span>'
              : '<span class="sailbadge-bar"><i style="width:' + pct + '%"></i></span>' +
                '<span class="beach-tag">' + met + ' / ' + need + ' 海里</span>') +
        '</div>';
    });
    h += '</div></div>';
    view().innerHTML = h;
    wireQuit();
  }

  /* ================= 我的海滩 · 泊位 (SPEC_XH_berth_layout.md) =================
     The dock's 营地. Same mechanism as the campsite in app.js, with sea names —
     but two deliberate differences, both from the spec:
       · FIXED SLOTS, not free placement. The camp earned dragging; the dock has
         not yet. Five hook points, one item each, swappable any time.
       · The BOAT is not a slot. It is the dwelling-tier chain's equivalent: one
         vessel, UPGRADED rather than swapped, and the tier shows here, on the
         round rail and on the 图鉴 cover from a single purchase.

     ⚠️ EVERY COORDINATE BELOW IS FROM THE SPEC, measured against dock_bg.png
     (1672x941 — the same dimensions as art/camp/camp_bg.png, which is why the
     camp's stage CSS transfers unchanged):
       sand line (top of placeable ground)  by 62%
       reserved: centre vista cx 35-65 above by 62 · jetty cx 78-100 · palms cx 0-10
     cx = centre-x %, by = bottom-y % from the bottom, w = width % of the stage.
     Re-measure if the backdrop is ever redrawn. */
  var BERTH_SLOTS = [
    { k: "shore_left",  zh: "岸左", en: "Left shore",  cx: 18, by: 8,  w: 9 },
    { k: "shore_right", zh: "岸右", en: "Right shore", cx: 70, by: 8,  w: 9 },
    /* ⚠️ by 6, NOT the spec's 12. The spec's 木桩 slot assumes something to hang
       from, but there is no painted post at cx 30 — composited against the real
       backdrop, a lantern at by 12 hangs in mid-air with a visible gap under it.
       All three candidates here (提灯/铜钟/玻璃浮球) read fine resting on the sand. */
    { k: "post",        zh: "木桩", en: "Post",        cx: 30, by: 6,  w: 7 },
    { k: "sand",        zh: "沙地", en: "Sand",        cx: 50, by: 5,  w: 8 },
    /* above the sand line on purpose: a gull belongs in the air, and this is the
       one slot that reads against sea rather than sand (spec) */
    { k: "sky",         zh: "空中", en: "Sky",         cx: 62, by: 46, w: 6 }
  ];
  /* ⚠️ PRICES ARE MINE. The spec fixes the catalogue and the currency but gives no
     numbers — same situation as the camp's GEAR list. They sit on one ladder so
     nothing costs more than the top boat. Single numbers, retune freely. */
  var BERTH_ITEMS = [
    { k: "crate",      slot: "shore_left",  zh: "木箱",   en: "Crate",        img: "dock_crate",      price: 25 },
    { k: "barrel",     slot: "shore_left",  zh: "木桶",   en: "Barrel",       img: "dock_barrel",     price: 30 },
    { k: "baskets",    slot: "shore_left",  zh: "鱼篓堆", en: "Baskets",      img: "dock_baskets",    price: 45 },
    { k: "bucket",     slot: "shore_right", zh: "水桶",   en: "Bucket",       img: "dock_bucket",     price: 25 },
    { k: "rope",       slot: "shore_right", zh: "缆绳",   en: "Coiled rope",  img: "dock_rope",       price: 30 },
    { k: "oars",       slot: "shore_right", zh: "船桨",   en: "Oars",         img: "dock_oars",       price: 40 },
    { k: "creel",      slot: "shore_right", zh: "满鱼篓", en: "Full creel",   img: "dock_creel_full", price: 55 },
    { k: "lantern",    slot: "post",        zh: "提灯",   en: "Lantern",      img: "dock_lantern",    price: 35 },
    { k: "bell",       slot: "post",        zh: "铜钟",   en: "Bell",         img: "dock_bell",       price: 50 },
    { k: "glassfloat", slot: "post",        zh: "玻璃浮球", en: "Glass float", img: "dock_glassfloat", price: 60 },
    { k: "shells",     slot: "sand",        zh: "贝壳堆", en: "Shells",       img: "dock_shells",     price: 20 },
    { k: "plant",      slot: "sand",        zh: "海边植物", en: "Shore plant", img: "dock_plant",     price: 35 },
    { k: "cat",        slot: "sand",        zh: "码头猫", en: "Dock cat",     img: "dock_cat",        price: 70 },
    { k: "flags",      slot: "sky",         zh: "彩旗",   en: "Bunting",      img: "dock_flags",      price: 30 },
    { k: "gull",       slot: "sky",         zh: "海鸥",   en: "Gull",         img: "dock_gull",       price: 45 }
  ];
  /* ⚠️ BOATS MOVED TO profile.js (owner 2026-08-16 evening). The catalogue is now
     FOUR tiers, ownership is GLOBAL (ws2_profile, beside avatarsOwned), and every
     boat is buyable with EITHER 贝壳 here or 灵露 on a stream page — because the
     boat now sails the landing sea map, and most CL students never enter the pier.
     Read the long note above WSBoats in profile.js before changing any of that.
     This shim keeps the dock rendering if profile.js somehow failed to load, the
     same graceful-degrade habit as every sprite onerror in this file. */
  function boatList() {
    return (window.WSBoats && window.WSBoats.list()) ||
      [{ t: 1, zh: "朴素舢板", en: "Plain sampan", shells: 0, ling: 0 }];
  }
  function boatPick() { return (window.WSBoats && window.WSBoats.pick()) || 1; }
  function ownsBoat(t) { return t === 1 || !!(window.WSBoats && window.WSBoats.owns(t)); }
  function boatName(t) {
    var l = boatList();
    for (var i = 0; i < l.length; i++) if (l[i].t === t) return l[i].zh;
    return "";
  }
  function itemByKey(k) {
    for (var i = 0; i < BERTH_ITEMS.length; i++) if (BERTH_ITEMS[i].k === k) return BERTH_ITEMS[i];
    return null;
  }
  function ownsItem(k) { return !!store.owned[k]; }
  function equipItem(it) {
    /* one item per slot: equipping replaces whatever was there, and the previous
       item stays OWNED so swapping back is free */
    store.berth[it.slot] = it.k; save();
  }
  function beachSprite(img, cx, by, w, extra) {
    return '<img class="beach-item' + (extra ? " " + extra : "") + '" src="art/xh/' + img +
      '.png' + ASSET_V + '" alt="" style="left:' + cx + '%;bottom:' + by + '%;width:' + w + '%" ' +
      "onerror=\"this.style.display='none'\">";
  }
  function shellIcon() {
    return '<img class="shell-icon" src="art/xh/dock_shell.png' + ASSET_V + '" alt="贝壳" ' +
      "onerror=\"this.replaceWith(document.createTextNode('🐚'))\">";
  }

  /* the boat + whatever is in each berth slot, as one absolutely-positioned layer.
     Shared by 我的海滩 and the menu hero so the two can never drift apart. */
  function beachSpritesHtml() {
    /* ⚠️ NO BOAT IN THIS SCENE (owner 2026-08-16 evening: 「remove boat from beach
       since it's now reflected on sea map」). The berth sprite used to be the only
       place a bought boat appeared; now it sails the landing sea map and rides the
       round progress bar, so drawing it here as well put a second hull on top of
       the painted stilt house and read as clutter rather than reward.
       The boat is still NAMED on the 我的海滩 tile and is bought/swapped in the shop
       below — this removes the sprite, not the feature. */
    var h = "";
    BERTH_SLOTS.forEach(function (sl) {
      var it = itemByKey(store.berth[sl.k]);
      if (it) h += beachSprite(it.img, sl.cx, sl.by, sl.w);
    });
    return h;
  }

  function renderBeach() {
    view().classList.remove("two-col");
    state = null;
    var h = '<div class="xh-round-bar">' + quitBtn() +
      '<span class="xh-block-tag">我的海滩' + xhPy("我的海滩") + '<span class="xh-en">your berth</span></span></div>';
    h += '<div class="xh-board"><div class="beach-head">' +
      '<div class="xh-berth-title">🏖️ 我的海滩' + xhPy("我的海滩") + '<span class="xh-en">Your berth</span></div>' +
      '<span class="beach-purse">' + shellIcon() + '<b>' + (store.shells || 0) + '</b> 贝壳' + xhPy("贝壳") +
      '<span class="xh-en">shells</span></span></div>';
    h += '<div class="beach-stage">' +
      '<img class="beach-bg" src="art/xh/dock_bg.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">";
    /* the moored boat: spec puts it at cx 88 / by 30 / w 26, broadside because the
       painted jetty runs left-to-right. ⚠️ ALL THREE TIERS SHARE ONE SCALE so the
       boat does not jump size when upgraded — do not re-normalise per sprite. */
    h += beachSpritesHtml();
    h += "</div>";
    h += '<div class="beach-acts"><button class="xh-btn" id="beachShop">🛒 海滩小铺' + xhPy("海滩小铺") +
      '<span class="xh-en">shop</span></button></div></div>';
    view().innerHTML = h;
    wireQuit();
    document.getElementById("beachShop").onclick = renderBeachShop;
  }

  function renderBeachShop() {
    view().classList.remove("two-col");
    state = null;
    var h = '<div class="xh-round-bar">' + quitBtn() +
      '<span class="xh-block-tag">海滩小铺' + xhPy("海滩小铺") + '<span class="xh-en">the shop</span></span></div>';
    h += '<div class="xh-board"><div class="beach-head">' +
      '<div class="xh-berth-title">🛒 海滩小铺' + xhPy("海滩小铺") + '<span class="xh-en">Beach shop</span></div>' +
      '<span class="beach-purse">' + shellIcon() + '<b>' + (store.shells || 0) + '</b> 贝壳' + xhPy("贝壳") +
      '<span class="xh-en">shells</span></span></div>' +
      '<div class="xh-log-sub">答对题目就能捡到贝壳。每个位置只能摆一样，随时可以换。' +
      '<span class="xh-en">Answer questions to find shells. One item per spot, swap any time.</span></div>';

    /* Boats first: it is the only purchase visible outside the pier — it sails the
       landing sea map (owner 2026-08-16). Two separate things on this shelf:
         BUYING is sequential, so the ladder still means something;
         WEARING is free among everything owned. */
    h += '<div class="xh-log-sec">船只 · 想开哪一艘都可以' + xhPy("船只 · 想开哪一艘都可以") +
      '<span class="xh-en">Your boats — buy in order, sail whichever you like</span></div>';
    h += '<div class="xh-log-sub">买下的船在海图上也看得见。贝壳买不起的话，也可以在学段的营地商店用灵露换。' +
      '<span class="xh-en">Your boat also sails the sea map. Buy with shells here, or with 灵露 at a level camp shop.</span></div>';
    h += '<div class="beach-shelf">';
    var pick = boatPick();
    boatList().forEach(function (b) {
      var owned = ownsBoat(b.t), on = pick === b.t;
      var prev  = b.t > 1 && !ownsBoat(b.t - 1);          // must climb in order
      var afford = (store.shells || 0) >= b.shells;
      h += '<div class="beach-card' + (on ? " on" : owned ? " owned" : "") + '">' +
        '<img src="art/xh/boat_t' + b.t + '_broadside.png' + ASSET_V + '" alt="" ' +
          "onerror=\"this.style.display='none'\">" +
        '<b>' + esc(b.zh) + '</b>' + xhPy(b.zh) + '<span class="xh-en">' + esc(b.en) + '</span>' +
        (on ? '<span class="beach-tag on">正在开' + xhPy("正在开") + '<span class="xh-en">sailing</span></span>'
            : owned ? '<button class="beach-buy own" data-boatpick="' + b.t + '">开这艘' + xhPy("开这艘") + '<span class="xh-en">sail this</span></button>'
            : prev ? '<span class="beach-tag">先买' + esc(boatName(b.t - 1)) + '</span>'
            : '<button class="beach-buy" data-boat="' + b.t + '"' + (afford ? "" : " disabled") +
              ' title="' + (afford ? "" : "贝壳不够，也可以到学段的营地商店用灵露换") + '">' +
              shellIcon() + b.shells + '</button>') +
        /* the other price is always shown, so a student who will never grind the
           dock can see the boat is still reachable from their own level */
        (owned ? "" : '<span class="beach-alt">或 ' + b.ling + ' 灵露</span>') +
        '</div>';
    });
    h += '</div>';

    BERTH_SLOTS.forEach(function (sl) {
      h += '<div class="xh-log-sec">' + esc(sl.zh) + xhPy(sl.zh) + '<span class="xh-en">' + esc(sl.en) + '</span></div>';
      h += '<div class="beach-shelf">';
      BERTH_ITEMS.filter(function (it) { return it.slot === sl.k; }).forEach(function (it) {
        var owned = ownsItem(it.k), on = store.berth[sl.k] === it.k;
        var afford = (store.shells || 0) >= it.price;
        h += '<div class="beach-card' + (on ? " on" : owned ? " owned" : "") + '">' +
          '<img src="art/xh/' + it.img + '.png' + ASSET_V + '" alt="" ' +
            "onerror=\"this.style.display='none'\">" +
          '<b>' + esc(it.zh) + '</b>' + xhPy(it.zh) + '<span class="xh-en">' + esc(it.en) + '</span>' +
          (on ? '<span class="beach-tag on">摆着' + xhPy("摆着") + '<span class="xh-en">placed</span></span>'
              : owned ? '<button class="beach-buy own" data-eq="' + it.k + '">摆上' + xhPy("摆上") + '<span class="xh-en">place it</span></button>'
              : '<button class="beach-buy" data-buy="' + it.k + '"' + (afford ? "" : " disabled") +
                (afford ? "" : ' title="贝壳不够，再去答几题"') + '>' + shellIcon() + it.price + '</button>') +
          '</div>';
      });
      h += '</div>';
    });
    h += '<div class="beach-acts"><button class="xh-btn" id="beachBack">‹ 回海滩' + xhPy("回海滩") +
      '<span class="xh-en">back to the beach</span></button></div></div>';
    view().innerHTML = h;
    wireQuit();
    document.getElementById("beachBack").onclick = renderBeach;
    Array.prototype.forEach.call(view().querySelectorAll("[data-buy]"), function (el) {
      el.onclick = function () {
        var it = itemByKey(el.getAttribute("data-buy"));
        if (!it || ownsItem(it.k) || (store.shells || 0) < it.price) return;
        store.shells -= it.price;          // deduct FIRST, then record, then equip
        store.owned[it.k] = 1;
        equipItem(it);                     // a new purchase goes straight on display
        save(); sfxOk(); renderBeachShop();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll("[data-eq]"), function (el) {
      el.onclick = function () {
        var it = itemByKey(el.getAttribute("data-eq"));
        if (!it || !ownsItem(it.k)) return;
        equipItem(it); renderBeachShop();
      };
    });
    /* 贝壳 purchase. ⚠️ deduct → verify the grant landed → save, the same order
       buyAvatar uses: a debit that fails to persist is the worst bug available
       here. Ownership itself is written by profile.js (it is GLOBAL), never by
       this file. */
    Array.prototype.forEach.call(view().querySelectorAll("[data-boat]"), function (el) {
      el.onclick = function () {
        var t = parseInt(el.getAttribute("data-boat"), 10);
        if (!window.WSBoats || !window.WSBoats.buyable(t)) return;
        var b = null, l = boatList();
        for (var i = 0; i < l.length; i++) if (l[i].t === t) b = l[i];
        if (!b || (store.shells || 0) < b.shells) return;
        store.shells -= b.shells;
        if (!window.WSBoats.grant(t)) { store.shells += b.shells; return; }  // roll back
        save(); sfxOk(); renderBeachShop();
      };
    });
    /* free swap among owned boats — no cost, no confirm: it is a hat, not a purchase */
    Array.prototype.forEach.call(view().querySelectorAll("[data-boatpick]"), function (el) {
      el.onclick = function () {
        var t = parseInt(el.getAttribute("data-boatpick"), 10);
        if (window.WSBoats && window.WSBoats.setPick(t)) { sfxOk(); renderBeachShop(); }
      };
    });
  }

  /* ---------- 我的词语表 (addendum §2) ----------
     The dock's 我的词语表: one chapter per 组别, sectioned by 子类, read as a LIST
     and used to start a 看图学词 run over whatever the filter shows. Exactly the
     two things every mountain offers, and nothing else.

     ⚠️ NOT a collection surface any more (owner 2026-08-16 evening). It used to
     black out an unmet word into a silhouette of its own sprite with a ？ for a
     name, and stamp 全部集齐 on a finished chapter. Both are gone: a word not yet
     met is the one most worth reading, and the dock已经 decided elsewhere (§航海徽章)
     that「集齐」is the wrong frame for an open-ended word list that grew 36 → 150
     in a day. Do not re-add either.

     认得 = FIRST CORRECT ANSWER, which store.done already records — so this screen
     adds no storage at all. Deliberately weaker than the mountain's mastery gate:
     图鉴 is a record of what has been MET, not a claim of mastery, and a beginner
     needs visible progress inside their first session.

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
    words.filter(hasPic).forEach(function (w) { (new Image()).src = "art/xh/" + w.图档 + ASSET_V; });
    render();
  }

  /* ⚠️ Rebuilt 2026-08-16 (owner: 「航海图鉴 does not respond to tapping at all」 —
     the screen was still called that then; it is 我的词语表 now).
     It was right that nothing responded: locked cells were rendered `disabled`, so
     on a fresh account — 0 / 36 — EVERY cell on the page was dead, and the only
     promise on screen (「tap a word you have met」) applied to nothing.
     This is the dock's 我的词语表, so it now carries the same three controls that
     page has and this one lacked: status FILTERS, a tap on ANY row (a word you have
     not met is the most worth opening, not the least), and a BULK action over the
     current filter. Revealing a locked word gives nothing away — 看图学词 already
     walks every word in the group, met or not. */
  function renderLog(page, filter) {
    view().classList.remove("two-col");
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

    var h = '<div class="xh-round-bar">' + quitBtn() +
      '<span class="xh-block-tag">我的词语表' + xhPy("我的词语表") + '<span class="xh-en">word list</span></span></div>' +
      '<div class="xh-board"><div class="xh-log-head">' +
      '<div class="xh-berth-title">📋 我的词语表' + xhPy("我的词语表") + '<span class="xh-en">Your word list</span></div>' +
      '<span class="xh-log-sail"><b>' + sailed + "</b> / " + WORDS.length + " 海里" + xhPy("海里") +
      '<span class="xh-en">words met</span></span></div>' +
      '<div class="xh-log-pages">';
    pages.forEach(function (p) {
      var n = p.words.filter(function (w) { return store.done[w.词语]; }).length;
      h += '<button class="xh-log-page' + (p === cur ? " on" : "") + '" data-p="' + esc(p.组别) + '">' +
        esc(p.组别) + " " + n + "/" + p.words.length + xhPy(p.组别) + xhGroupEn(p.组别) + "</button>";
    });
    h += "</div></div>";

    h += '<div class="xh-board"><div class="xh-sec">' + esc(cur.组别) + xhPy(cur.组别) +
      '<span class="xh-en">tap any word to open it as a flashcard</span></div>';
    h += '<div class="xh-log-sub">点任何一个词语都能打开图卡，还不认得的也可以先看。' +
      '<span class="xh-en">Tap any word to study it — including ones you have not met.</span></div>';
    /* ⚠️ ONE row: the three status filters AND the bulk 看图学词 button (owner
       2026-08-16 evening). The button had a row of its own, which pushed the words
       themselves below the fold on an iPad. It sits at the right end of the same
       flex row and drops under the chips only when the row runs out of width. */
    var fc = [["all", "全部", cur.words.length], ["got", "已认得", got],
              ["miss", "还不认得", cur.words.length - got]];
    h += '<div class="xh-log-filters">' + fc.map(function (c) {
      return '<button class="xh-log-chip' + (f === c[0] ? " on" : "") + '" data-f="' + c[0] + '">' +
        c[1] + " " + c[2] + xhPy(c[1]) + "</button>";
    }).join("") +
      '<button class="xh-btn sm xh-log-learn" id="xhLogLearn"' +
      (shown.length ? "" : " disabled") + '>📖 看图学词 · 学这 ' + shown.length + ' 个' + xhPy("看图学词") +
      '<span class="xh-en">study these</span></button></div>';
    if (!shown.length) h += '<div class="xh-log-empty">这个筛选下暂时没有词语。' +
        '<span class="xh-en">Nothing here under this filter.</span></div>';
    cur.secs.forEach(function (sec) {
      if (!cur.byS[sec].filter(keep).length) return;   // hide a section the filter emptied
      // a one-section chapter (日常用品) needs no divider — the chapter title
      // already says it, and an identical subtitle underneath reads as a bug
      if (cur.secs.length > 1) h += '<div class="xh-log-sec">' + esc(sec) + xhPy(sec) + xhGroupEn(sec) + "</div>";
      h += '<div class="xh-log-list">';
      cur.byS[sec].filter(keep).forEach(function (w) {
        var have = !!store.done[w.词语];
        /* ⚠️ NO SILHOUETTE AND NO ？ any more (owner 2026-08-16 evening: retire the
           collection format). A word not yet met now shows exactly like one that has
           been — picture, 词语, 拼音, 英文 — with a small status tag on the right.
           Hiding the word behind a blacked-out sprite is a collector's tease, and
           this page is the dock's 我的词语表: a list you read and a flashcard run you
           start from it, the same two things every mountain offers. Nothing was being
           protected anyway — 看图学词 has always walked the whole group, met or not. */
        h += '<button class="xh-log-row ' + (have ? "got" : "miss") + '" data-w="' + esc(w.词语) + '">' +
          (hasPic(w) ? img(w, "xh-log-thumb") : '<span class="xh-log-thumb xh-log-nopic">词</span>') +
          '<span class="xh-log-wrap"><b>' + esc(w.词语) + "</b>" +
            '<span class="xh-py">' + esc(w.拼音) + "</span>" +
            '<span class="xh-en">' + esc(w.英文释义) + "</span></span>" +
          '<span class="xh-log-st">' + (have ? "已认得" : "还不认得") + "</span></button>";
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
    Array.prototype.forEach.call(view().querySelectorAll(".xh-log-row"), function (el) {
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
    view().classList.remove("two-col");
    state = null;
    var tab = store.lbTab, scope = store.lbScope;
    var me = profileOf();
    var meSail = WORDS.filter(function (w) { return store.done[w.词语]; }).length;

    function tabBtn(id, zh, en) {
      return '<button class="xh-lb-tab' + (tab === id ? " on" : "") + '" data-t="' + id + '">' +
        zh + xhPy(zh) + '<span class="xh-en">' + en + "</span></button>";
    }
    function scopeBtn(id, zh, en) {
      return '<button class="xh-lb-scope' + (scope === id ? " on" : "") + '" data-s="' + id + '">' +
        zh + '<span class="xh-en">' + en + "</span></button>";
    }
    view().innerHTML =
      '<div class="xh-round-bar">' + quitBtn() +
      '<span class="xh-block-tag">码头风云榜' + xhPy("码头风云榜") + '<span class="xh-en">the boards</span></span></div>' +
      '<div class="xh-board"><div class="xh-sec">🏆 码头风云榜' + xhPy("码头风云榜") +
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

  /* ---------- 未认得优先 (HANDOFF_学以致用 §6) ----------
     ⚠️ THIS IS A DOCK-WIDE CHANGE, not something the new mode brought with it.
     startRound drew `shuffle(draw).slice(0, need)` — flat random — so a student who
     already recognised 80 words could play a five-question round without meeting a
     single new one, while the 航海徽章 thresholds (10/25/…/400) count rows in
     store.done and simply stopped moving. The mountain has had the fix since day one
     (app.js startQuiz,「WEAK-FIRST, RANDOM WITHIN BUCKET」); this is the same shape.
     ⚠️ SHUFFLED WITHIN EACH BUCKET, never curriculum order: otherwise a student can
     answer straight down the handbook without reading the questions.
     ⚠️ Exemptions, both deliberate: `learn` walks its whole set in data order (it is
     a lesson, not a sample — the mountain exempts `flash` for the same reason), and
     distractors() is untouched, because narrowing the decoy pool is what ruins a
     question (same warning as the 子类 note).
     ⚠️ 重整句子 teaches WORD ORDER but buckets on store.done[p.ask], which records
     WORDS. A student may well recognise 图书馆 and still have never ordered that
     sentence, and this will file it as review. That inaccuracy is accepted for now:
     fixing it means a second record of「sentences ordered correctly」, and CLAUDE.md
     is explicit that this tier adds words, not systems. THIS IS NOT A BUG — do not
     「fix」it by inventing a new store field. */
  function wordUnmet(w) { return !store.done[w.词语]; }
  function phraseUnmet(p) { return !(p && p.ask && store.done[p.ask]); }
  function weakFirst(list, unmet) {
    var fresh = [], seen = [];
    list.forEach(function (x) { (unmet(x) ? fresh : seen).push(x); });
    return shuffle(fresh).concat(shuffle(seen));
  }

  /* startRound(label, forceMode, poolOverride)
     ⚠️ `label` is now only what the round is CALLED. The words come from the
     current 学习范围, or from poolOverride when the caller already has a list
     (the atlas hands one over). Rounds used to be keyed to a single 组别, which
     is why every caller passed one. */
  function startRound(sub, forceMode, poolOverride) {
    var mode = forceMode || store.mode || "pic";
    /* ⚠️ filter BEFORE anything else reads the pool: state.pool is what
       distractors() and the replay buttons later draw from, so a pictureless word
       slipping through here would surface as a blank option several screens away */
    var pool = poolForMode(poolOverride || scopedWords(), mode);
    if (!pool.length) return;
    var seq;
    if (mode === "learn") {
      /* ⚠️ 句子卡 (owner 2026-08-16 evening) returns EARLY with a sentence sequence.
         It reuses the 传声筒 library with nothing blanked out, and it walks the whole
         set in data order for the same reason the word cards do: it is a lesson, not
         a sample. `cards:"sentence"` is what renderLearn branches on — the state
         shape is otherwise identical so quitBtn/jetty need no special case.
         ⚠️ NO PROGRESS IS WRITTEN from either face of the flashcard; that was already
         true of the word cards and stays true here. */
      if (store.cardKind === "sentence") {
        var ps = phrasesFor(pool);
        if (!ps.length) return;
        state = { grp: sub || scopeLabel(), mode: mode, cards: "sentence", seq: ps,
                  i: 0, correct: 0, missed: [], firstTry: true, pool: pool };
        ps.forEach(function (p) {
          var w = wordByText(p.ask), f = p.pic || (w && w.图档);
          if (f) (new Image()).src = "art/xh/" + f + ASSET_V;
        });
        return render();
      }
      // the flashcard walks the WHOLE group in data order: it is a lesson, not a
      // sample, and a stable order means the second visit is the same lesson
      seq = pool.slice();
    } else {
      /* SPEC_XH_vocab_v3 §6: with groups now 7-32 words, a flat draw from 食物 (32)
         gives a round with no theme. When the scope is a SINGLE 组别 that has real
         子类 subdivisions, draw the round from ONE 子类 so it hangs together.
         ⚠️ THE DISTRACTOR POOL IS UNTOUCHED — distractors() still draws from the
         answer's whole 组别. Narrowing them to the 子类 would turn a fruit question
         into a fruit-only quiz and defeat the point (§6, and PATCH_category_hierarchy). */
      var need = mode === "match" ? (store.matchN || 5) : (store.roundN || ROUND_N);
      /* ⚠️ 传声筒's sequence is SENTENCES, not words — everything below (子类
         theming, sprite prewarm) is about words and does not apply. Return early
         with the same state shape so render()/jetty()/renderResult() need no
         special cases. */
      if (isPhraseMode(mode)) {
        var all = phrasesFor(pool, mode);
        if (!all.length) return;
        /* ⚠️ ONE SCENE PER ROUND — same idea as the 子类 theming for the other modes:
           only scenes that can FILL the round are eligible, so a thin one (农场 has
           4 sentences) is never the theme rather than being the reason a round comes
           out mixed. If none can fill it, take the fullest and run a shorter round:
           still coherent, still one backdrop. */
        var byScene = {}, scenes = [];
        all.forEach(function (q) {
          if (!byScene[q.scene]) { byScene[q.scene] = []; scenes.push(q.scene); }
          byScene[q.scene].push(q);
        });
        var big = scenes.filter(function (k) { return byScene[k].length >= need; });
        /* ⚠️ SCENE FIRST, WEAK-FIRST INSIDE IT (§6.5). Sorting all sentences by
           「not met yet」and taking the top N would pull them from several scenes and
           break the single backdrop the whole mode is built around. So the scene is
           chosen among those that can fill a round, preferring the one with the most
           unmet sentences, and the bucketing happens within it. */
        var pickFrom = big.length ? big : scenes;
        var pickScene = pickFrom.slice().sort(function (a, b) {
          var ua = byScene[a].filter(phraseUnmet).length, ub = byScene[b].filter(phraseUnmet).length;
          if (ub !== ua) return ub - ua;
          return byScene[b].length - byScene[a].length;
        })[0];
        var ph = weakFirst(byScene[pickScene], phraseUnmet).slice(0, need);
        if (!ph.length) return;
        state = { grp: pickScene, mode: mode, seq: ph, i: 0, correct: 0,
                  missed: [], firstTry: true, pool: pool, scene: pickScene };
        /* ⚠️ 重整句子 shows no sticker (§8.4), so there is nothing to prewarm for it:
           every word is already on a tile and the answer has no ambiguity to resolve.
           A picture there would only crowd the tray and pull the eye off word order. */
        if (mode === "phrase") {
          ph.forEach(function (p) {
            var w = wordByText(p.ask), f = p.pic || (w && w.图档);
            if (f) (new Image()).src = "art/xh/" + f + ASSET_V;
          });
        }
        return render();
      }
      var draw = pool;
      var gs = {}; pool.forEach(function (w) { gs[w.组别] = 1; });
      if (Object.keys(gs).length === 1) {
        var bySub = {}, subs = [];
        pool.forEach(function (w) {
          if (!bySub[w.子类]) { bySub[w.子类] = []; subs.push(w.子类); }
          bySub[w.子类].push(w);
        });
        /* ⚠️ only 子类 that can FILL the round are eligible. Picking one that is too
           small (饮料 has 4 words, a 连线 board wants 5+) and then falling back to
           the whole group produced a mixed round — the exact thing §6 asks us to
           avoid. Excluding it up front means the small 子类 is simply never the
           theme, rather than being the cause of an unthemed round. */
        var big = subs.filter(function (k) { return bySub[k].length >= need; });
        if (big.length) draw = bySub[big[Math.floor(Math.random() * big.length)]];
      }
      /* ⚠️ WEAK-FIRST, INSIDE THE THEME (§6.4.1). The bucketing runs on `draw`, after
         the 子类 pick, never on `pool` — reversing the two would choose the round's
         words before its theme and undo SPEC_XH_vocab_v3 §6. */
      seq = weakFirst(draw, wordUnmet).slice(0, Math.min(need, draw.length));
    }
    if (!seq.length) return;
    state = { grp: sub || scopeLabel(), mode: mode, seq: seq, i: 0, correct: 0,
              missed: [], firstTry: true, pool: pool };
    // warm the round's sprites: each question swaps the image, and an undecoded
    // sprite shows as an empty frame for a beat — the picture IS the question
    var warm = (mode === "match" || mode === "learn") ? seq : seq.concat(distractors(seq[0], optCount() - 1));
    warm.filter(hasPic).forEach(function (w) { (new Image()).src = "art/xh/" + w.图档 + ASSET_V; });
    render();
  }

  /* jetty progress bar — spec §5.3: a round should feel like a journey, not a
     counter. The boat advances along the jetty as answers land. */
  function jetty() {
    var n = state.seq.length;
    var frac = n ? state.i / n : 0;
    return '<div class="xh-jetty"><div class="xh-jetty-line"></div>' +
      /* the CHOSEN boat here too — this is the third surface it shows on (beach,
         sea map, and now every round), which is the whole point of buying one */
      '<img class="xh-jetty-boat" style="left:' + (frac * 100).toFixed(1) + '%" ' +
      'src="art/xh/boat_t' + boatPick() + '_broadside.png' + ASSET_V + '" alt="">' +
      '<span class="xh-jetty-n">' + (state.i + 1) + " / " + n + "</span></div>";
  }
  function bar() {
    return '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) + "</span></div>";
  }

  function render() {
    view().classList.remove("two-col");     // round screens are a single centred column
    if (state.mode === "learn") {
      if (state.i >= state.seq.length) return renderLearnEnd();
      return renderLearn();
    }
    if (state.i >= state.seq.length) return renderResult();
    if (state.mode === "phrase") return renderPhrase();
    if (state.mode === "sort") return renderSort();
    if (state.mode === "enmcq") return renderEnMcq();
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
  /* advanceAfterSpeech — 答对之后先把话读完，再翻页。
     ⚠️ owner 2026-08-16：传声筒答对后画面立刻跳走，句子才读到一半。
     以前是 advance(1500) 一个死定时器，而 rate=0.85 的一句话要 2.5–3.5 秒。
     现在以**朗读结束**为准，但朗读永远不是唯一的闸门：
       · floor  —— 就算没有语音（设备没装中文音色、朗读被系统吞掉），
                   也要停够这么久，学生才看得清「✅ 整句」那一行
       · ceiling —— onend 不保证会来（被下一句 cancel、音色始终没加载、
                   ChromeOS 静默丢弃），到点就走，绝不把学生卡死在一题上
     两个闸门都只放行一次。 */
  function advanceAfterSpeech(text, py, floor, ceiling) {
    var went = false, t0 = (new Date()).getTime();
    floor = floor || 900;
    var go = function () {
      if (went) return;
      went = true;
      state.i++; render();
    };
    var after = function (ms) { setTimeout(go, ms > 0 ? ms : 0); };
    setTimeout(go, ceiling || 4200);
    /* ⚠️ 设备上根本没有中文音色时，onend 永远不会来，天花板就成了唯一的闸门——
       每题白等 5 秒。所以先探一下**朗读到底有没有开始**：speak() 里有 50ms 的
       ChromeOS 缓冲，350ms 之后还是既不 speaking 也不 pending，就是没在读，
       按没有语音的节奏走。 */
    setTimeout(function () {
      if (went || !window.speechSynthesis) return;
      if (!speechSynthesis.speaking && !speechSynthesis.pending) {
        after(floor - ((new Date()).getTime() - t0));
      }
    }, 350);
    speak(text, py, function () {
      after(floor - ((new Date()).getTime() - t0));
    });
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
  /* 英文选词 sits with 看图识词 at 2: both are 4-option recognition. It reads
     characters rather than pictures, but a wrong tap costs nothing in either, so
     the effort is comparable. */
  /* ⚠️ `phrase` WAS MISSING FROM THIS TABLE (found 2026-08-16 late, while adding
     `sort`). `SAIL_PTS[mode] || 0` then returned 0 and `awardSail` bailed on the
     next line, so 看句选词 has been paying NOTHING — not 航海值, not 贝壳 (it was
     absent from SHELL_PTS too) — since the day it shipped. It is silent because
     nothing throws: a missing key and a deliberate 0 look identical here.
     ⚠️ `learn: 0` is the only intentional zero in either table. Anything that asks a
     question must appear here explicitly; when a mode is added, add both rows.
     3 for 看句选词 (recognition, but inside a sentence — same tier as 听音识图) and
     4 for 重整句子 (production, same tier as 词海垂钓). */
  var SAIL_PTS = { pic: 2, enmcq: 2, listen: 3, match: 3, type: 4, phrase: 3, sort: 4, learn: 0 };
  function awardSail(mode, firstTry) {
    var base = SAIL_PTS[mode] || 0;
    if (!base) return 0;                      // 看图学词 asks nothing, so earns nothing
    var n = firstTry ? base : Math.max(1, Math.round(base * 0.5));
    store.sail += n;
    return n;
  }

  /* 贝壳 — spendable, and deliberately scarcer than 航海值 so a purchase means
     something. ⚠️ The rates are MINE: the spec fixes the currency and the
     "never converts" rule but gives no numbers (same situation as the camp's
     GEAR prices and LINGLU_BASE). One dial, retune freely after real use.
     Typing pays double because it is the only production mode here. */
  /* ⚠️ `sort` is 2, the same as 词海垂钓: both are PRODUCTION tasks (you build the
     answer) rather than recognition. `phrase` stays 1 and is not levelled up to
     match it — the two now share the 学以致用 card but they are two SEPARATE cards
     with no mid-round switch, so a student cannot pick the cheaper one and hop.
     ⚠️ If a mid-round switch is ever added, the two rates must be merged FIRST. */
  var SHELL_PTS = { pic: 1, enmcq: 1, listen: 1, match: 1, type: 2, phrase: 1, sort: 2, learn: 0 };
  function awardShells(mode, firstTry) {
    var base = SHELL_PTS[mode] || 0;
    if (!base) return 0;
    var n = firstTry ? base : Math.max(1, Math.round(base * 0.5));
    store.shells += n;
    return n;
  }

  /* quiet=true：由调用方自己朗读并据此翻页（advanceAfterSpeech）。
     ⚠️ 以前这里读词、调用方紧接着读句子，第二句 cancel() 掉第一句——
     学生听到半个词就被打断。 */
  function noteRight(w, quiet) {
    if (state.firstTry) state.correct++;
    awardSail(state.mode, state.firstTry);
    awardShells(state.mode, state.firstTry);
    store.done[w.词语] = true;
    save();
    pushDock();
    sfxOk();
    if (!quiet) speak(w.词语, w.拼音);   // never the English (spec §3 of v1, unchanged)
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
  /* ---------- 句子卡 (owner 2026-08-16 evening) ----------
     ⚠️ NOTHING IS BLANKED OUT. 传声筒 asks about these same lines; this face just
     shows them whole, with the target word's picture, its reading, and the English.
     §11: the goal is「meet these words again inside real language」— not understanding
     the whole line is the expected state, so the card gives every scaffold it has.
     ⚠️ The Chinese is read aloud; the English never is (§8). */
  function renderSentenceCard() {
    var p = state.seq[state.i], n = state.seq.length;
    var w = wordByText(p.ask);
    var file = p.pic || (w && w.图档);
    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) + " · 句子卡</span></div>" +
      '<div class="xh-board xh-stage xh-card">' +
      (file
        /* ⚠️ 图档 / pic already carry the .png — img() does not append one either. */
        ? '<button class="xh-sprite big" id="xhSprite" title="点一下听句子">' +
          '<img src="art/xh/' + esc(file) + ASSET_V + '" alt="" ' +
          "onerror=\"this.style.display='none'\"></button>"
        : "") +
      '<div class="xh-card-word"><b class="xh-card-sent">' + esc(p.zh) + "</b>" +
      /* ⚠️ .xh-always, same as the word card: this is the learn-before-you-are-tested
         surface, and hiding the English behind a toggle leaves a zero-Chinese beginner
         staring at a sentence they cannot read. */
      '<span class="xh-en xh-always">' + esc(p.en) + "</span>" +
      (w ? '<span class="xh-card-target">' + esc(w.词语) +
           '<span class="xh-py xh-always">' + esc(w.拼音) + "</span></span>" : "") +
      (p.insight_en ? '<span class="xh-card-note">' + esc(p.insight_en) + "</span>" : "") +
      "</div>" +
      '<button class="xh-btn xh-say" id="xhSay">🔊 再听一次' + xhPy("再听一次") +
      ' <span class="xh-en">hear it again</span>' + "</button>" +
      '<div class="xh-cardnav">' +
      '<button class="xh-btn ghost" id="xhPrev"' + (state.i ? "" : " disabled") + '>‹ 上一个' +
        xhPy("上一个") + '<span class="xh-en">previous</span></button>' +
      '<button class="xh-btn" id="xhNext">' +
        (state.i === n - 1
          ? '学完了 ›' + xhPy("学完了") + '<span class="xh-en">done</span>'
          : '下一个 ›' + xhPy("下一个") + '<span class="xh-en">next</span>') +
        "</button></div></div>";
    view().innerHTML = h;
    wireQuit();
    /* ⚠️ no per-character 拼音 for these lines (§8.8), so the engine's own reading
       stands — the same call 传声筒 makes for the identical sentence. */
    speak(p.zh);
    if (document.getElementById("xhSprite")) {
      document.getElementById("xhSprite").onclick = function () { speak(p.zh); };
    }
    document.getElementById("xhSay").onclick = function () { speak(p.zh); };
    document.getElementById("xhPrev").onclick = function () { if (state.i) { state.i--; render(); } };
    document.getElementById("xhNext").onclick = function () { state.i++; render(); };
  }
  function renderLearn() {
    if (state.cards === "sentence") return renderSentenceCard();
    var w = state.seq[state.i], n = state.seq.length;
    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) + " · 词语卡</span></div>" +
      '<div class="xh-board xh-stage xh-card">' +
      /* ⚠️ a pictureless word (数字) shows its ARABIC NUMERAL in the sprite's place,
         not an empty frame. §4.4: 汉字 + 阿拉伯数字 + 拼音 + 英文 is the complete card
         for a number — there is nothing to draw and nothing missing. */
      (hasPic(w)
        ? '<button class="xh-sprite big" id="xhSprite" title="点图听读音">' + img(w) + "</button>"
        : '<button class="xh-sprite big numeral" id="xhSprite" title="点一下听读音">' +
          esc(w.数码 || "") + "</button>") +
      /* ⚠️ .xh-always ON BOTH (owner 2026-08-16 evening: 「the pier's flashcards must
         have pinyin and english displayed by default, not only when the toggle is
         selected」). 看图学词 is the LEARN-BEFORE-YOU-ARE-TESTED surface, and the
         reading plus the meaning ARE its content — gate them behind a toggle and a
         zero-Chinese beginner is left staring at two characters they cannot read.
         Everywhere else on the pier the two gates still rule; this card and the
         拼音 revealed after a 词海垂钓 miss are the only exceptions. */
      '<div class="xh-card-word"><b>' + esc(w.词语) + "</b>" +
      '<span class="xh-py xh-always">' + esc(w.拼音) + "</span>" +
      '<span class="xh-en xh-always">' + esc(w.英文释义) + "</span>" +
      /* ⚠️ 两 is the most important card in the 数字 group and an English gloss alone
         cannot carry it: a student who learns 二 but never 两 says 二只猫 forever.
         §4.4 asks for an explicit note, so any word may carry 注记. */
      (w.注记 ? '<span class="xh-card-note">' + esc(w.注记) + "</span>" : "") + "</div>" +
      '<button class="xh-btn xh-say" id="xhSay">🔊 再听一次' + xhPy("再听一次") +
      ' <span class="xh-en">hear it again</span>' + "</button>" +
      /* the two nav buttons carried NO gloss at all while the button above them had
         both — so a student who could not read 上一个 had nothing to go on */
      '<div class="xh-cardnav">' +
      '<button class="xh-btn ghost" id="xhPrev"' + (state.i ? "" : " disabled") + '>‹ 上一个' +
        xhPy("上一个") + '<span class="xh-en">previous</span></button>' +
      '<button class="xh-btn" id="xhNext">' +
        (state.i === n - 1
          ? '学完了 ›' + xhPy("学完了") + '<span class="xh-en">done</span>'
          : '下一个 ›' + xhPy("下一个") + '<span class="xh-en">next</span>') +
        "</button></div></div>";
    view().innerHTML = h;
    wireQuit();
    speak(w.词语, w.拼音);
    document.getElementById("xhSprite").onclick = function () { speak(w.词语, w.拼音); };
    document.getElementById("xhSay").onclick = function () { speak(w.词语, w.拼音); };
    document.getElementById("xhPrev").onclick = function () { if (state.i) { state.i--; render(); } };
    document.getElementById("xhNext").onclick = function () { state.i++; render(); };
  }
  /* end of the flashcard: the point of it is the round that follows, so the
     primary button starts one on the SAME group rather than returning to a menu */
  function renderLearnEnd() {
    view().classList.remove("two-col");
    /* ⚠️ the follow-up test must match the face they just read: after 句子卡 that is
       传声筒 (the same sentences, with one word blanked), not a picture round the
       cards never showed. */
    var isSent = state.cards === "sentence";
    var h = '<div class="xh-board xh-result"><div class="xh-berth-title">📖 这一组看完了</div>' +
      '<div class="xh-score">' + esc(state.grp) + ' · <b>' + state.seq.length + "</b> " +
      (isSent ? "个句子" : "个词语") +
      ' <span class="xh-en">' + (isSent ? "sentences" : "words") + ' in this group</span>' + "</div>" +
      '<div class="xh-sub">现在试试看，你记住了几个？' +
      '<span class="xh-en">Now see how many you remember.</span>' + "</div>" +
      '<div class="xh-result-btns"><button class="xh-btn" id="xhTest">' +
      (isSent ? "📣 开始测验" : "🖼️ 开始测验") + "</button>" +
      '<button class="xh-btn ghost" id="xhAgain">再看一次</button>' +
      '<button class="xh-btn ghost" id="xhBack">换一组</button></div></div>';
    view().innerHTML = h;
    document.getElementById("xhTest").onclick = function () {
      startRound(state.grp, isSent ? "phrase" : "pic", state.pool);
    };
    document.getElementById("xhAgain").onclick = function () { startRound(state.grp, "learn", state.pool); };
    document.getElementById("xhBack").onclick = renderMenu;
  }

  /* 4.1 看图识词 — picture → word */
  function renderPic() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var opts = shuffle(distractors(w, optCount() - 1).concat([w]));
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
        noteRight(w, true);
        var hint = document.getElementById("xhHint");
        hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
        advanceAfterSpeech(w.词语, w.拼音, 1100, 3200);
      };
    });
  }

  /* ---------- 传声筒 (PATCH_02) ----------
     A real sentence from the scene with one word blanked out; pick the word.

     ⚠️ THE PICTURE IS PART OF THE QUESTION, NOT A HINT (PATCH_02 §2), and it is
     shown FROM THE START, never revealed after answering. Without it the question
     is often unanswerable:「这包＿＿多少钱？」admits 香料 · 龙虾 · 苹果 · 糖 equally.
     With a picture of sweets the answer is unique.
     ⚠️ EXACTLY ONE picture, the target's. Four would turn the sentence into a
     picture-guessing game and crowd the card.
     ⚠️ It also kills the accidental-correct failure of same-组别 distractors: if
     「我要买两个＿＿」draws 苹果, 两个苹果 is perfectly good Chinese and the student
     would be marked wrong for being right. The picture settles it — the picture IS
     the answer.

     ⚠️ MEASURE-WORD LEAKAGE IS DELIBERATE — DO NOT「fix」IT (PATCH_02 §3).
    「这台＿＿多少钱？」does narrow the answer to phone-like things. On the mountain
     that would be a giveaway; here it is the entire point of a measure word, and a
     student who reasons from 台 to the answer has just learned 台. Never strip the
     measure word out of the stem to make the question「harder」. */
  function phraseBlank(p) {
    /* the blank keeps the measure word and everything else intact */
    return esc(p.zh).replace(esc(p.ask), '<span class="xh-blank">＿＿</span>');
  }
  /* ---------- 重整句子 (HANDOFF_学以致用 §4–§5) ----------
     ⚠️ THE SAME GESTURE AS THE MOUNTAIN'S 组词挑战, ONE LEVEL UP: that one is「tap out
     the CHARACTERS of a word」, this is「tap out the WORDS of a sentence」. The layout
     and the interaction are copied deliberately so a student learns one gesture.
     ⚠️ TAP TO PLACE, NEVER DRAG. Touch drag on a tablet fights `touchmove` against
     page scroll, triggers long-press text selection, and has to handle a release
     halfway. Tapping is already proven here and on the avatar picker.
     ⚠️ EVERY TILE IS KEYED BY ITS INDEX, NEVER BY ITS TEXT. A sentence may repeat a
     word (我…我…), and de-duplicating by string would leave the student unable to
     build the answer. Validation compares the TEXT SEQUENCE, so two identical tiles
     are interchangeable, which is correct.
     ⚠️ NO PICTURE (§8.4). 看句选词 needs one because「这包＿＿多少钱？」 has several
     valid answers without it; here every word is on a tile and there is no ambiguity
     to resolve, so a sticker would only crowd the tray and pull the eye off order.
     ⚠️ NO PINYIN ON THE TILES (§8.2). These sentences carry no per-character reading
     (see the head of js/tts.js) and a generated fallback is exactly what §8 forbids.
     The 拼音 gate having nothing to show here is the normal state, not a defect. */
  function sortTiles(p) {
    /* [{i, t}] — `i` is identity, `t` is only what it says. */
    var tiles = p.seg.map(function (t, i) { return { i: i, t: t }; });
    var extra = store.sortExtra || 0;
    if (extra) {
      /* ⚠️ DECOYS COME FROM THE ask WORD'S OWN 组别 — the one distractor rule the
         whole dock shares, no exceptions. They are whole WORDS, matching the tray's
         granularity, and any that already appear in the sentence are dropped: a
         duplicate decoy would be indistinguishable from a real tile and could be
         placed correctly by accident. */
      var w = wordByText(p.ask);
      if (w) {
        var inSeg = {};
        p.seg.forEach(function (t) { inSeg[t] = 1; });
        var pool = distractors(w, extra + 4, "sort").filter(function (o) { return !inSeg[o.词语]; });
        pool.slice(0, extra).forEach(function (o, k) {
          tiles.push({ i: p.seg.length + k, t: o.词语, decoy: true });
        });
      }
    }
    return shuffle(tiles);
  }
  function renderSort() {
    var p = state.seq[state.i];
    var bg = SCENE_BG[state.scene || p.scene];
    /* the tray is drawn ONCE per question and cached, exactly as 组词挑战 caches its
       chips: re-drawing on any re-render would re-roll the decoys, and the sentence's
       own blocks survive every draw — the 选项重洗＝泄题 trap, one screen over. */
    var key = state.i + "|" + p.id;
    if (state._sortKey !== key) { state._sortKey = key; state._sortTiles = sortTiles(p); }
    var tiles = state._sortTiles;
    var end = String(p.zh || "").match(/[。？！]$/);

    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(p.scene) + " · 重整句子</span></div>" +
      (bg ? '<div class="xh-scene-bg" style="background-image:url(&quot;art/xh/' +
            esc(bg) + '.png' + ASSET_V + '&quot;)"></div>' : "") +
      '<div class="xh-board xh-stage xh-sort' + (bg ? " on-scene" : "") + '">' +
      /* ⚠️ .xh-always on the English: p.en IS THE PROMPT here — the student is
         building the Chinese for exactly this line. Gated behind body.xh-en-on it
         would leave them staring at a tray of unexplained word tiles. This extends
         the existing §10 exception (「the 传声筒 situation line」), it does not open
         a new one. */
      '<div class="xh-sort-ask"><span class="xh-en xh-always">' + esc(p.en) + "</span></div>" +
      '<div class="xh-slots" id="xhSlots">';
    p.seg.forEach(function (_, i) {
      h += '<span class="xh-slot" data-k="' + i + '"></span>';
    });
    /* ⚠️ 句末标点 is FIXED DECORATION, not a tile (§3.5). It has no word order to
       teach, so making it tappable would just add a square that must be pressed. */
    h += (end ? '<span class="xh-slot-end">' + esc(end[0]) + "</span>" : "") + "</div>";
    h += '<div class="xh-tray" id="xhTray">';
    tiles.forEach(function (t) {
      h += '<div class="xh-tilewrap"><button class="xh-tile-w" data-i="' + t.i + '">' +
        esc(t.t) + "</button>" +
        /* ⚠️ sibling speaker, never nested (§14「喇叭嵌在选项里」). It reads ONE block,
           which gives away nothing about the order. */
        '<button class="xh-ttts" data-s="' + t.i + '" title="朗读" aria-label="朗读">🔊</button></div>';
    });
    h += "</div>" +
      '<div class="xh-sort-acts">' +
      '<button class="xh-btn" id="xhSortGo">检查答案' + xhPy("检查答案") +
      '<span class="xh-en">check</span></button></div>' +
      '<div class="xh-hint" id="xhHint"></div></div>';
    view().innerHTML = h;
    wireQuit();

    var slots = [].slice.call(view().querySelectorAll(".xh-slot"));
    var placed = [];            // tile index per slot, or null
    var locked = 0;             // slots green-locked by a previous check
    p.seg.forEach(function () { placed.push(null); });
    var done = false;

    function tileById(i) {
      for (var k = 0; k < tiles.length; k++) if (tiles[k].i === i) return tiles[k];
      return null;
    }
    function btnFor(i) { return view().querySelector('.xh-tile-w[data-i="' + i + '"]'); }
    function paint() {
      slots.forEach(function (s, k) {
        var t = placed[k] === null ? null : tileById(placed[k]);
        s.textContent = t ? t.t : "";
        s.classList.toggle("filled", !!t);
        s.classList.toggle("lock", k < locked);
      });
      tiles.forEach(function (t) {
        var b = btnFor(t.i);
        /* the WRAPPER carries the class so the sibling speaker hides with the tile */
        if (b && b.parentNode) b.parentNode.classList.toggle("used", placed.indexOf(t.i) !== -1);
      });
      var go = document.getElementById("xhSortGo");
      if (go) go.disabled = placed.indexOf(null) !== -1;
    }
    function place(i) {
      if (done || placed.indexOf(i) !== -1) return;
      for (var k = locked; k < placed.length; k++) {
        if (placed[k] === null) { placed[k] = i; paint(); return; }
      }
    }
    function lift(k) {
      if (done || k < locked || placed[k] === null) return;
      placed[k] = null; paint();
    }
    Array.prototype.forEach.call(view().querySelectorAll(".xh-tile-w"), function (b) {
      b.onclick = function () { place(parseInt(b.getAttribute("data-i"), 10)); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".xh-ttts"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var t = tileById(parseInt(b.getAttribute("data-s"), 10));
        if (t) speak(t.t);
      };
    });
    slots.forEach(function (s, k) { s.onclick = function () { lift(k); }; });

    document.getElementById("xhSortGo").onclick = function () {
      if (done || placed.indexOf(null) !== -1) return;
      /* ⚠️ PREFIX LOCK, NOT ALL-OR-NOTHING (§5). Compare from the first slot; blocks
         in the right place go green and STAY; from the first wrong one, everything
         after it returns to the tray. The student sees WHERE the order broke, which
         is the whole assessment-for-learning value of the mode.
         ⚠️ Compared by TEXT, not by tile index: 我…我… swapped is still correct.
         ⚠️ A wrong answer costs nothing — no 贝壳, no 航程, no 海里 — as everywhere
         else in this tier. And no move-count scoring: that is a puzzle-player's
         metric, not a language learner's. */
      var i = 0;
      while (i < placed.length && tileById(placed[i]).t === p.seg[i]) i++;
      if (i >= placed.length) {
        done = true;
        locked = placed.length;
        paint();
        var w = wordByText(p.ask);
        /* ⚠️ ONLY p.ask IS RECORDED (§7.1). One question puts 4–8 words on screen, and
           store.done's ROW COUNT drives the nine 航海徽章 thresholds — marking every
           block would push a student through three badge levels in a single round and
           void the ladder. tileOnly / missing ask records nothing at all. */
        if (w && !p.tileOnly) noteRight(w, true);
        else sfxOk();
        document.getElementById("xhHint").innerHTML = "✅ " + esc(p.zh) +
          (p.insight_en ? '<span class="xh-ph-note">' + esc(p.insight_en) + "</span>" : "");
        /* the sentence is read whole before the page turns — same floor/ceiling as
           看句选词, which was tuned for exactly this length (§8.3). */
        advanceAfterSpeech(p.zh, null, 1200, 5500);
        return;
      }
      locked = i;
      for (var k = i; k < placed.length; k++) placed[k] = null;
      /* ⚠️ noteWrong flips state.firstTry itself and plays the sound — do NOT clear
         the flag first, or the miss is never recorded against the word. */
      var w2 = wordByText(p.ask);
      if (w2 && !p.tileOnly) noteWrong(w2, "");
      else { state.firstTry = false; sfxNo(); }
      paint();
      document.getElementById("xhHint").innerHTML = locked
        ? "前 " + locked + " 块对了，后面再想想。" +
          '<span class="xh-en xh-always">First ' + locked + ' in place — keep going.</span>'
        : "第一块就要换一个，再想想。" +
          '<span class="xh-en xh-always">Start with a different word.</span>';
    };
    paint();
  }

  function renderPhrase() {
    var p = state.seq[state.i];
    var w = wordByText(p.ask);
    var opts = shuffle([w].concat(distractors(w, optCount() - 1, "enmcq")));
    var pic = p.pic || (w && w.图档);

    /* ⚠️ THE SCENE IS AN AMBIENT BACKDROP, NOT A STAGE (HANDOFF §2, which retired the
       earlier model). Nothing is positioned against it: the target's sprite lives
       INSIDE the panel as a word-card illustration, so the art needs no clear ground
       area and all ten backgrounds are usable as delivered — including 熟食中心,
       whose big round table sits dead centre and was a defect under the old model.
       The dimming lives in CSS on ONE class, so a background that comes out too
       bright is a single knob, never an art re-export. */
    var bg = SCENE_BG[state.scene || p.scene];
    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(p.scene) + " · 看句选词</span></div>" +
      (bg ? '<div class="xh-scene-bg" style="background-image:url(&quot;art/xh/' +
            esc(bg) + '.png' + ASSET_V + '&quot;)"></div>' : "") +
      '<div class="xh-board xh-stage xh-phrase' + (bg ? " on-scene" : "") + '">' +
      (pic ? '<img class="xh-ph-pic" src="art/xh/' + esc(pic) + ASSET_V + '" alt="" ' +
             "onerror=\"this.style.display='none'\">" : "") +
      '<div class="xh-ph-zh">' + phraseBlank(p) + "</div>" +
      '<div class="xh-ph-en">' + esc(p.en) + "</div>" +
      '<div class="xh-opts">';
    opts.forEach(function (o, i) {
      /* ⚠️ .xh-optrow / .xh-otts are the pier's EXISTING option-row classes (see
         renderEnMcq). Inventing a parallel pair left the speakers unstyled and
         floating below the buttons. */
      h += '<div class="xh-optrow"><button class="xh-opt" data-i="' + i + '">' +
        '<span class="xh-word">' + esc(o.词语) + "</span>" +
        '<span class="xh-py">' + esc(o.拼音) + "</span></button>" +
        '<button class="xh-otts" data-s="' + i + '" title="朗读" aria-label="朗读">🔊</button></div>';
    });
    h += '</div><div class="xh-hint" id="xhHint"></div></div>';
    view().innerHTML = h;
    wireQuit();

    var done = false;
    function pick(i) {
      var o = opts[i];
      var btn = view().querySelector('.xh-opt[data-i="' + i + '"]');
      if (o.词语 === p.ask) {
        if (done) return;
        done = true;
        btn.classList.add("ok");
        /* ⚠️ a tile-only answer records NO progress: 素食摊 is not a word entry, so
           marking it would invent a 航程 entry for a word that does not exist. */
        if (!p.tileOnly) noteRight(w, true);
        var hint = document.getElementById("xhHint");
        /* ⚠️ insight_en is OPTIONAL (PATCH_02 §5). Most sentences have nothing worth
           saying and a forced note would be filler. Blank is the normal state. */
        hint.innerHTML = "✅ " + esc(p.zh) +
          (p.insight_en ? '<span class="xh-ph-note">' + esc(p.insight_en) + "</span>" : "");
        /* 整句在语境里读完再走。句子比词长，天花板给到 5.5 秒。
           ⚠️ 句子没有逐字拼音，所以这里没有 py 可传（见 js/tts.js 开头）。 */
        advanceAfterSpeech(p.zh, null, 1200, 5500);
      } else {
        /* answering wrong costs nothing anywhere in this tier: mark it, stay put */
        btn.classList.add("no");
        btn.disabled = true;
        if (!p.tileOnly) noteWrong(w, o.词语);
        sfxNo();
      }
    }
    Array.prototype.forEach.call(view().querySelectorAll(".xh-opt"), function (b) {
      b.onclick = function () { pick(parseInt(b.getAttribute("data-i"), 10)); };
    });
    /* ⚠️ sibling speaker buttons, never nested in the answer — and they read the
       OPTION, so hearing them all gives nothing away. */
    Array.prototype.forEach.call(view().querySelectorAll(".xh-otts"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        speak(opts[parseInt(b.getAttribute("data-s"), 10)].词语);
      };
    });
  }

  /* 英文选词 — meaning → 词语, the platform's traditional MCQ shape (owner
     2026-08-16). The picture is deliberately WITHHELD until the answer lands:
     showing it would turn this back into 看图识词 and the point is to read the
     characters. It arrives as the reward, together with the 拼音 and the reading.
     ⚠️ The prompt is English and therefore SILENT — the Chinese-only TTS rule is
     absolute. Every OPTION carries its own 🔊 (sibling button, never nested), so
     listening around the options reveals nothing. */
  function renderEnMcq() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var opts = shuffle(distractors(w, optCount() - 1).concat([w]));
    var h = bar() + '<div class="xh-board xh-stage">' +
      '<div class="xh-enq">' + esc(w.英文释义) + '</div>' +
      '<span class="xh-sprite hidden" id="xhSprite">' + img(w) + "</span>" +
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
        if (el.getAttribute("data-w") !== w.词语) {      // wrong costs nothing, as everywhere here
          noteWrong(w, el.getAttribute("data-w"));
          el.classList.add("wrong"); el.disabled = true;
          return;
        }
        el.classList.add("right");
        Array.prototype.forEach.call(view().querySelectorAll(".xh-opt"), function (b) { b.disabled = true; });
        var sp = document.getElementById("xhSprite");
        sp.classList.remove("hidden"); sp.classList.add("pop");
        noteRight(w, true);
        var hint = document.getElementById("xhHint");
        hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
        // a beat longer: the picture only appears now
        advanceAfterSpeech(w.词语, w.拼音, 1400, 3200);
      };
    });
  }

  /* 4.2 听音识图 — audio → picture. Mode 4.1 with prompt and options swapped;
     forces listening rather than shape-matching. */
  function renderListen() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var opts = shuffle(distractors(w, optCount() - 1).concat([w]));
    var h = bar() + '<div class="xh-board xh-stage">' +
      '<button class="xh-play" id="xhPlay">🔊 <span>再听一次</span>' + xhPy("再听一次") +
      '<span class="xh-en">tap to hear it again</span>' + "</button>" +
      '<div class="xh-hint" id="xhHint"></div><div class="xh-pics">';
    opts.forEach(function (o) {
      h += '<button class="xh-pic" data-w="' + esc(o.词语) + '">' + img(o) + "</button>";
    });
    view().innerHTML = h + "</div></div>";
    wireQuit();
    speak(w.词语, w.拼音);
    document.getElementById("xhPlay").onclick = function () { speak(w.词语, w.拼音); };
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
        noteRight(w, true);
        var hint = document.getElementById("xhHint");
        hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
        advanceAfterSpeech(w.词语, w.拼音, 1100, 3200);
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
      '<button class="xh-btn" id="xhGo">收线' + xhPy("收线") +
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
    document.getElementById("xhSprite").onclick = function () { if (said) speak(w.词语, w.拼音); };
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
      noteRight(w, true);
      hint.className = "xh-hint show"; hint.innerHTML = reveal(w);
      advanceAfterSpeech(w.词语, w.拼音, 1250, 3200);
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

    var h = '<div class="xh-round-bar">' + quitBtn() +
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
      '<button class="xh-btn" id="xhCheck" disabled>检查答案' + xhPy("检查答案") +
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
    view().classList.remove("two-col");
    var h = '<div class="xh-board xh-result"><div class="xh-berth-title">🎉 这一轮完成了</div>' +
      '<div class="xh-score"><b>' + state.correct + "</b> / " + state.seq.length +
      " 一次答对" + xhPy("一次答对") + ' <span class="xh-en">correct first try</span>' + "</div>";
    if (state.missed.length) {
      h += '<div class="xh-review"><div class="xh-review-h">再看看这几个' + xhPy("再看看这几个") +
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
  migrateBoat();   // legacy 3-tier store.boat -> the global 4-tier family
  renderTop();     // topbar works even if the word list never arrives

  /* the sentence library. Loaded up front and kept tiny (16KB): 传声筒 is one of
     the ② 学词 modes, so waiting for a second fetch at 出发 would stall the round.
     ⚠️ A failure here must NOT take the pier down — every other mode works without
     it, so PHRASES simply stays empty and 传声筒 hides itself. */
  fetch("data/xh_phrases.json" + ASSET_V)
    .then(function (r) { return r.json(); })
    .then(function (doc) { PHRASES = (doc && doc.phrases) || []; })
    .catch(function () { PHRASES = []; });

  fetch("data/xh_v3.json" + ASSET_V)
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      WORDS = rows;
      if (!store.mode) store.mode = "pic";
      checkGroupLabels();
      renderMenu();
    })
    .catch(function () {
      view().innerHTML = '<div class="xh-board xh-err">词语资料加载失败，请检查网络后重新整理页面。<br>' +
        '<span class="xh-en">Could not load the word list. Please refresh.</span></div>';
    });
})();
