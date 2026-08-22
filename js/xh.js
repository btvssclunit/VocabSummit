/* 学海起步 · 出发码头 — MVP v2
   Spec: SPEC_XH_MVP_v2.md (2026-08-15), which supersedes the 看图识词 v1 spec.

   DELIBERATELY STANDALONE. This never loads cs.js/cs.css and shares no state
   with g1/g2/g3/hcl. The reasons are in the spec: this tier inverts the
   platform's display defaults (拼音 and English default ON here, OFF there), it
   is outside the 灵露 / 历练值 / 海拔 economy entirely, and it is unproven — a
   mode that later gets pulled must be removable without touching anything the
   four streams depend on. The TTS stack is COPIED from cs.js rather than
   shared, for the same reason.

   ⚠️ SCOPE IS 149 WORDS in EIGHT 组别 (data/xh_v3.json), 2026-08-16 晚: 整鸡 was
   folded into 鸡肉 (owner: one idea, one word, right across the pier) and its art
   retired to archived_art/. Its only sentence, scene_market-4, became a 鸡肉 line.
   The paragraph below is the earlier history and its numbers are that history's.
   ⚠️ It was 100 WORDS in SIX 组别 for part of the same day, and before that
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
  /* ⚠️ A PICTURELESS WORD RENDERS ITS ARABIC NUMERAL, NOT AN EMPTY FRAME (owner
     2026-08-16 深夜: 「Numbers are completely missing the question field — need the
     numerals」). 数字 has no 图档 by design (§5: drawing three apples to teach 三
     teaches apples), and every tile built from this helper — the 连线 board, the
     词海钓鱼 catch, the end-of-round review list — was asking the browser for
     `art/xh/` and getting a blank.
     ⚠️ The fallback is a SPAN, so it drops into a button or a card wherever an <img>
     did. 词语卡 keeps its own branch: its numeral is 96px and carries the card frame.
     ⚠️ 看图识词 / 听音识图 never reach this — modeNeedsPic filters them out one layer
     up, and that filter stays: a numeral IS the answer written down, which is the
     whole reason those two modes exclude the group. */
  function img(w, cls) {
    if (!hasPic(w)) {
      return '<span class="' + (cls || "") + ' xh-num">' + esc(w.数码 || w.词语) + "</span>";
    }
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
    /* ⚠️ SUPERSEDED BY store.diff AND NO LONGER READ ANYWHERE (2026-08-16 晚,
       HANDOFF §3.1). matchN / optsN / sortExtra / buildExtra were four independent
       difficulty dials; 连线's board size now comes from DIFF_MATCH. They are still
       normalised and stored because they are the only surviving record of what each
       student had chosen, and reversing §3 without them would reset everyone.
       ⚠️ Do NOT read them. Two live difficulty models is the failure mode. */
    if (s.matchN !== 3 && s.matchN !== 5 && s.matchN !== 8) s.matchN = 5;
    /* 学习范围 + the two-button 学词/闯关 split (owner 2026-08-16), mirroring the
       mountain's ①复习范围 ②选择学习方式 ③cards. scope is a list of 组别; an empty
       or unrecognised list is repaired to "everything" at first use, because a
       scope of nothing would silently produce empty rounds. */
    if (!(s.scope instanceof Array)) s.scope = null;      // null = all groups
    /* ⚠️ literals, NOT ROUND_SIZES/OPT_TIERS — same trap the 连线 line above warns
       about: this normaliser runs at module init, before those vars are assigned. */
    if (s.roundN !== 5 && s.roundN !== 10 && s.roundN !== 15 && s.roundN !== 20) s.roundN = 5;
    /* ③难度 — the ONE dial (HANDOFF §3.1). ⚠️ Derived HERE, above optsN's own
       normaliser, because it needs to know whether the student ever HAD an option
       count: a returning profile carries 2/3/4 and maps straight onto 简单/中等/挑战,
       while a fresh one has nothing and must not inherit the old default of 4 — that
       would open a beginner's very first 连线 board at 8 pairs, which is the setting
       the old default of 5 deliberately was not. New students start at 中等.
       ⚠️ The three superseded dials (optsN, matchN, sortExtra) are still normalised
       and stored below and are simply never read. They are the only record of what a
       student had if this ever needs reversing, and they cost nothing.
       ⚠️ literals, not DIFFS/DIFF_OPTS: load() runs before those exist. */
    if ([1, 2, 3].indexOf(s.diff) === -1) {
      s.diff = s.optsN === 2 ? 1 : s.optsN === 4 ? 3 : 2;
    }
    if (s.optsN !== 2 && s.optsN !== 3 && s.optsN !== 4) s.optsN = 4;
    if (s.tab !== "play") s.tab = "learn";
    /* which of the four 词语挑战 question types was used last. It is remembered
       SEPARATELY from s.mode because 学词 now opens on two big cards (图卡 vs 挑战)
       and s.mode holds "learn" whenever the flashcard card is the selected one —
       without this, coming back from flashcards would forget the question type.
       ⚠️ literal, not a MODES lookup: load() runs before MODES is assigned. */
    /* ⚠️ `phrase` and `sort` ARE BACK IN THIS WHITELIST (owner 2026-08-17). They left
       it on 08-16 when the two sentence types moved out to their own 学以致用 door;
       that door is gone again and 词语挑战 owns all five types, so a remembered
       sentence type is legal here once more.
       ⚠️ THE MIGRATION MUST RUN BEFORE THE WHITELIST TEST, and it is gated on
       `s.mode` — the mode actually LAST RUN — not on `useMode` alone. useMode is
       "phrase" for everybody, including students who never opened that door once
       (load() has defaulted it since it existed), so copying it across unconditionally
       would drag a 看图识词 regular onto 看句选词. s.mode is the only field that says
       which side the student was really on. */
    if (["phrase", "sort"].indexOf(s.mode) !== -1 &&
        ["phrase", "sort"].indexOf(s.useMode) !== -1) s.quizMode = s.useMode;
    /* ⚠️ 连线 and 组字成词 joined this list on 2026-08-17 when 学习 became the
       mountain's two cards and they stopped being doors of their own. A student whose
       last round was 连线 must reopen on 连线; without them here the whitelist would
       silently reset that to 看图识词 on the next load. */
    if (["enmcq", "pic", "listen", "phrase", "sort", "match", "build"].indexOf(s.quizMode) === -1) s.quizMode = "pic";
    /* ⚠️ `useMode` is KEPT but never read again — it is the only record of what the
       student chose while 学以致用 was its own door, and the line above still consumes
       it on first load after the merge. Same treatment §18i gave the four retired
       difficulty fields: the constant goes, the store key stays. */
    /* ⚠️ 同样已被 store.diff 取代、不再有任何地方读取（见上）。留着只为留档。 */
    if ([0, 2, 4, 6].indexOf(s.sortExtra) === -1) s.sortExtra = 2;
    if ([1, 2, 4].indexOf(s.buildExtra) === -1) s.buildExtra = 2;
    /* 闪卡 的两面（owner 2026-08-16 晚）：词语卡 走 xh_v3 的 150 个词，
       句子卡 走 xh_phrases 的生活句子。⚠️ 句子卡不记任何进度——航程 是「认得几个词」，
       读一句话不等于认得词，把它算进去就是把 §4 水线上那个数字掺水。 */
    if (s.cardKind !== "sentence") s.cardKind = "word";
    /* ---------- 读过 N 句 (owner 2026-08-17) ----------
       句子卡 was the pier's biggest source of exposure and left NO trace anywhere:
       a student could read all 90 lines and the system would not know it happened.
       This is that trace and nothing more.
       ⚠️ IT IS A SET OF PHRASE IDS, NOT A TALLY. A counter that ticks on every
       re-read measures scrolling;「读过 N 句」has to mean N distinct lines, the same
       way store.done means distinct words. It also makes the write idempotent, which
       matters because render() runs again on every 拼音／英文 toggle.
       ⚠️ IT IS NOT PROGRESS AND MUST NEVER BECOME PROGRESS. Reading a line is not
       recognising a word, so: it stays out of 航程 (§4), out of SAIL_PTS/SHELL_PTS
       (`learn: 0` is the only deliberate zero in those tables and stays the only
       one), out of the nine 航海徽章 thresholds (those count store.done, §13), and
       off every leaderboard. It is displayed in 我的词语表 and nowhere else. */
    if (!s.readLines || typeof s.readLines !== "object") s.readLines = {};
    /* 航海徽章 的获得日期：badgeKey -> {first:"YYYY-MM-DD", at:海里}。
       ⚠️ A SEPARATE MAP, exactly like the mountain's badgeLog, and for the same reason:
       「got or not」must keep being derived from store.done alone (§13 red line), so this
       is decoration on top. Losing it costs a date, never a badge.
       ⚠️ Badges earned before this shipped have no entry and the card says 日期未记录.
       **绝不回填猜的日期。** */
    if (!s.sailLog || typeof s.sailLog !== "object") s.sailLog = {};
    /* 同伴挑战 的记忆位（owner 2026-08-17）。⚠️ 独立于 quizMode/runQuizMode：
       房间只支持两种题型，把它并进那两个记忆位会让「上次在房间选了看图识词」
       悄悄改掉单人练习的题型——§18m 拆开那两个位就是为了防这件事。 */
    if (["pic", "enmcq"].indexOf(s.pkMode) === -1) s.pkMode = "pic";
    if ([180, 300, 480].indexOf(s.pkDur) === -1) s.pkDur = 300;
    /* 沙滩快跑 的皮肤开关。⚠️ NO LONGER A SETTING THE STUDENT WRITES (owner 2026-08-17):
       it is set by which ③ tile they opened, so what is stored here is only「which
       door opened the round that is running」. It still defaults to plain, which still
       matters: renderMenu and any path that reaches a round without passing through
       renderModeConfig must not raise a beach. */
    if (s.runMode !== "surf") s.runMode = "plain";
    /* the 沙滩快跑 door's own last-used 题型. ⚠️ Separate from quizMode on purpose —
       the two doors offer overlapping type lists and must not overwrite each other
       (see ENTRY_MEM). Validated against the runnable set, not the quiz set. */
    if (["enmcq", "pic", "listen", "phrase", "build"].indexOf(s.runQuizMode) === -1) s.runQuizMode = "pic";
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
       mountain can be bought with it. Keeping it in ws_xh — a store cs.js never
       reads — is what makes that structural rather than a rule to remember. */
    if (typeof s.shells !== "number") s.shells = 0;
    if (!s.owned || typeof s.owned !== "object") s.owned = {};   // purchased item keys
    if (!s.berth || typeof s.berth !== "object") s.berth = {};    // slot -> item key
    /* 自由摆放 (owner 2026-08-17): item key -> {x, y} percent, y from the TOP.
       ⚠️ Keyed by ITEM, not by slot: an item keeps where the student put it even
       after it is swapped out and back in. 整理海滩 empties this and the slot's own
       coordinates take over again, which is why BERTH_SLOTS is still the default. */
    if (!s.berthPos || typeof s.berthPos !== "object") s.berthPos = {};
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
    scheduleCloudSync();
  }
  /* ---------- cloud mirror of ws_xh (owner 2026-08-19) ----------
     ⚠️ THE PIER HAD NO CLOUD BACKUP AT ALL until now. xh.js pushed dockScores (a
     narrow leaderboard row: nickname + 航程 + 航海值) and nothing else, so
     users/{uid}.progress had four mountains and no 出发码头. Two consequences, both
     real: a pier student who cleared their browser lost everything with no way back,
     and 教师后台 could not rebuild a student's 进度码 because a quarter of the format
     (§18r's xh section) simply did not exist server-side.
     ⚠️ THIS DOES NOT CROSS THE WATERLINE (§4). The guarantee that carries weight is
     「cs.js never reads ws_xh, xh.js never touches ws2_*」and neither engine gained a
     line: this writes xh's OWN store to its OWN key (progress.xh) through the shared
     WSCloud helper, exactly as cs.js writes progress.{stream}. No currency converts,
     no rate is implied, and cs.js still has no path to this data.
     ⚠️ Debounced 2.5s and flushed on pagehide, copied from cs.js's scheduleCloudSync
     — 连线 saves once per pair, and a write per pair would be a write storm. */
  var _cloudSyncTimer = null;
  function scheduleCloudSync() {
    if (!window.WSCloud || !window.WSCloud.isAvailable() || !window.WSCloud.saveProgress) return;
    clearTimeout(_cloudSyncTimer);
    _cloudSyncTimer = setTimeout(flushCloudSyncNow, 2500);
  }
  function flushCloudSyncNow() {
    if (!window.WSCloud || !window.WSCloud.isAvailable() || !window.WSCloud.saveProgress) return;
    clearTimeout(_cloudSyncTimer);
    window.WSCloud.saveProgress("xh", store);
    /* same rule as cs.js: the 恢复码 snapshot rides the flush, not the debounce (§18ae) */
    if (window.WSProfile && WSProfile.pushClaim) WSProfile.pushClaim();
  }
  window.addEventListener("pagehide", flushCloudSyncNow);
  window.addEventListener("beforeunload", flushCloudSyncNow);
  /* ⚠️ counts KEYS, so a line the student re-reads is still one line. Deliberately
     NOT filtered against the current PHRASES ids: a sentence retired from the library
     (two went on 2026-08-16) should not quietly un-read itself. */
  function readLineCount() {
    return Object.keys(store.readLines || {}).length;
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
    "出发码头": "chū fā mǎ tóu",
    /* ⚠️ hero 副标题。2026-08-17 把开头四个字从退役的「看图学词」改成 词语闪卡（owner）；
       音节数照 §10 数过：4 + 4 + 3 = 11 汉字，11 个音节。 */
    /* ⚠️ SPACE AFTER THE COMMA — it is load-bearing, not typography. The self-check
       counts syllables by splitting on WHITESPACE, so「yīn，màn」was one token and this
       key had been reporting「11 vs 10」on every pier load since it was written.
       CLAUDE.md §18n records this string as having been counted; the count was done by
       hand and the checker disagreed, which is the whole reason the checker exists. */
    "词语闪卡 · 看图听音，慢慢来": "cí yǔ shǎn kǎ · kàn tú tīng yīn， màn màn lái",
    "学习范围 · 可多选": "xué xí fàn wéi · kě duō xuǎn",
    "选择学习方式": "xuǎn zé xué xí fāng shì",
    /* ⚠️ 学词 → 学习（owner 2026-08-16 晚）。旧名是「学词语」的缩写，可是这一边
       现在也放句子闪卡，「词」把它自己框死了；山上那一侧叫 学习，两边都不必逐字对齐，
       但都得说得通。旧 key 留着：`store.tab` 存的仍是 "learn"/"play"，与文案无关。 */
    "学习": "xué xí", "闯关": "chuǎng guān", "出发": "chū fā",
    "词语游乐场": "cí yǔ yóu lè chǎng", "今天学什么": "jīn tiān xué shén me",
    "英文选词": "yīng wén xuǎn cí",
    "题型": "tí xíng", "每次题数": "měi cì tí shù", "挑战难度": "tiǎo zhàn nán dù",
    /* ⚠️ 词语挑战 IS A RETIRED NAME — the door is called 学习挑战 now, matching the
       mountain word for word (owner 2026-08-17:「pier learning mode should be like
       mountain」). The old key STAYS: xhPy returns "" for a miss, so any caller still
       passing the old string would lose its annotation silently rather than error. */
    "学习挑战": "xué xí tiǎo zhàn",
    "船只 · 想开哪一艘都可以": "chuán zhī · xiǎng kāi nǎ yī sōu dōu kě yǐ",
    "挑战方式": "tiǎo zhàn fāng shì",
    /* the three shelves inside ①挑战方式 (owner 2026-08-17) */
    "认词": "rèn cí", "用词": "yòng cí",
    /* ⚠️ 配对与拼字 arrived when 连线 and 组字成词 came in from 闯关: they are neither
       认词 nor 用词, they are the hands-on pair. */
    "配对与拼字": "pèi duì yǔ pīn zì",
    /* ⚠️ 生活空间 IS THE OWNER'S OWN NAME FOR THE SENTENCE LAYER, and until now it
       existed only in the docs — never once on screen. That is the literal reason
       she could not find the sentence modes (owner 2026-08-17:「I couldn't find the
       sentence mode for the pier beginner mode」): she was looking for a name the
       interface has never printed. It rides on the 用词 shelf heading, not on a
       tile — the sentence layer is a shelf inside 词语挑战, not a door (§18m). */
    "用词 · 生活空间": "yòng cí · shēng huó kōng jiān",
    /* ---------- 走进社区 (owner 2026-08-17) ----------
       ⚠️ 学校 · 交通 · 组屋区 are NOT repeated here: they are already keys in this
       table as 组别/子类 labels, and a duplicate key in an object literal silently
       overrides the earlier one. The self-check below reports duplicates for exactly
       this reason — the scene names that were missing are the seven added here. */
    "走进社区": "zǒu jìn shè qū", "换一个地方": "huàn yī gè dì fāng",
    "购物商场": "gòu wù shāng chǎng", "菜市场": "cài shì chǎng",
    "便利店": "biàn lì diàn", "熟食中心": "shú shí zhōng xīn",
    "动物园": "dòng wù yuán", "农场": "nóng chǎng", "水族馆": "shuǐ zú guǎn",
    /* ---------- 我的背包 (owner 2026-08-17) ----------
       ⚠️ 整理海滩 is a RETIRED label (the button left 我的海滩), kept for the same
       reason 词语挑战 is kept: xhPy returns "" on a miss, silently. */
    "我的背包": "wǒ de bèi bāo", "摆在海滩上的": "bǎi zài hǎi tān shàng de",
    "收在背包里的": "shōu zài bèi bāo lǐ de", "整理位置": "zhěng lǐ wèi zhì",
    "收起": "shōu qǐ", "摆上": "bǎi shàng",
    /* 看句选词 答对后的确认行 (owner 2026-08-17) */
    "答对了": "dá duì le",
    /* 航海徽章 明细卡 (owner 2026-08-17) */
    "已获得": "yǐ huò dé", "去认词": "qù rèn cí",
    /* 房间：结伴出海 · 同伴挑战 (owner 2026-08-17) */
    "结伴出海": "jié bàn chū hǎi", "同伴挑战": "tóng bàn tiǎo zhàn",
    "加入朋友的房间": "jiā rù péng yǒu de fáng jiān", "开一个房间": "kāi yī gè fáng jiān",
    /* ⚠️ 看图识词 / 英文选词 are NOT repeated here — they are already keys in this table.
       A duplicate key in an object literal silently overrides the earlier one, which is
       exactly how the pier section went missing from every progress code (§18r). */
    /* 我的海滩 的自由摆放 (owner 2026-08-17) */
    /* 读过 N 句 — the 句子卡 mileage line in 我的词语表 (owner 2026-08-17) */
    "读过": "dú guò",
    "按住摆件可以拖到你喜欢的位置": "àn zhù bǎi jiàn kě yǐ tuō dào nǐ xǐ huān de wèi zhì",
    /* ⚠️ 传声筒 → 看句选词，并且它不再是一个并列的题型，而是收进 学以致用 这张容器卡
       （owner 2026-08-16）。旧名只留在 `PATCH_02` 与归档里，代码里的 id 仍是 "phrase"。
       ⚠️ 学以致用 是成语，单看比 传声筒 难读——这是**知情的取舍**：它现在与 词语挑战
       并列，**容器卡允许抽象，题型卡不允许**，拼音与英文副标承担实际释义。
       不要「顺手」把它改回大白话。
       ⚠️ 组词成句 的「重」读 chóng 不读 zhòng。 */
    "看句选词": "kàn jù xuǎn cí", "组词成句": "zǔ cí chéng jù",
    "一次连几组": "yī cì lián jǐ zǔ", "返回码头": "fǎn huí mǎ tóu",
    /* 看图学词 had no entry while every other mode name did — invisible until the
       学词 tab held two cards side by side and only one carried its 拼音.
       ⚠️ 2026-08-16 晚改名 词语闪卡：owner「rename learn the words to flashcards」。
       山上那张卡就叫 词语闪卡，码头本来也是同一件事，两个名字没有理由。
       ⚠️ **「看图学词」这个名字 2026-08-17 已从屏幕上全部清掉**（owner）。改名那天
       hero 副标题与 我的词语表 的批量按钮被漏掉，于是一个退役的名字在首页第一屏
       和一颗按钮上又活了一天——和 §18n 里 生活空间 那件事同一族：**屏幕上留着一个
       别处已经不存在的名字**。两处都改成 词语闪卡，两条旧 key 一并删除。
       ⚠️ 删 key 之前确认过没有别的调用点（`grep xhPy("看图学词`）。
       注释与 CSS 类名里还留着这四个字，那是**代码内部的历史**，不上屏幕，不必动。 */
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
    /* ⚠️ 返回 is KEPT even though setBack() no longer emits it — nothing else may,
       but deleting a key is how a label silently loses its 拼音 later (§10). */
    "返回": "fǎn huí", "回码头": "huí mǎ tóu", "关闭": "guān bì",
    "意见反馈": "yì jiàn fǎn kuì",
    "看图识词": "kàn tú shí cí", "听音识图": "tīng yīn shí tú",
    "词海钓鱼": "cí hǎi diào yú", "连线": "lián xiàn",
    "组字成词": "zǔ zì chéng cí", "多几个干扰字": "duō jǐ gè gān rǎo zì",
    "难度": "nán dù", "模式": "mó shì",
    "普通闯关": "pǔ tōng chuǎng guān", "沙滩快跑": "shā tān kuài pǎo",
    /* ⚠️ 多几块干扰词 shipped with 组词成句 and has been missing from this table ever
       since — xhPy() returns "" for an absent key, so the 拼音 under that one slider
       heading has simply never been there and nothing said so (§10). */
    "多几块干扰词": "duō jǐ kuài gān rǎo cí",
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
    /* ⚠️ ORDER MATTERS AND IT IS 中EN THEN 拼拼音 — the same order cs.js emits
       (setTopbar: enToggleHtml() then pyToggleHtml()). The pier had them the other
       way round, so a student crossing from a mountain to the pier found the two
       pills swapped under the same finger. Nothing else about them differs. */
    el.innerHTML =
      '<button class="xh-tg' + (store.en ? " on" : "") + '" id="xhTgEn" ' +
        'aria-pressed="' + (store.en ? "true" : "false") + '" title="English">' +
        '<span class="xh-tg-ic">中</span><span class="xh-tg-lab">EN</span></button>' +
      '<button class="xh-tg' + (store.py ? " on" : "") + '" id="xhTgPy" ' +
        'aria-pressed="' + (store.py ? "true" : "false") + '" title="拼音">' +
        '<span class="xh-tg-ic">拼</span><span class="xh-tg-lab">拼音</span></button>' +
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
  /* ================= 进度码 provider (owner 2026-08-17) =======================
     ⚠️ THE PIER HAD NO PROGRESS CODE AT ALL until now. Four mountain codes existed and
     each rejected the other three; a pier student who changed device lost everything with
     no way back. VS3 is one code for all five lands, and profile.js owns the format — this
     hook exists for exactly one reason:
     ⚠️ THE LIVE STORE MUST BE WRITTEN BY THIS FILE. `store` is held in memory here and the
     next save() would erase a direct localStorage write from profile.js. So profile.js
     writes the OTHER four lands itself and routes this one back through here. Same
     contract cs.js has had since VS1.
     ⚠️ THIS DOES NOT BREACH THE WATERLINE (§4). xh.js still never reads or writes
     ws2_{stream}, and cs.js still never reads ws_xh — neither engine gained a line. The
     code carries the two stores side by side; nothing converts between them, and no
     currency travels at all (no 贝壳, no 灵露 — see profile.js's note on why).
     ⚠️ NO `wallet`/`spend`: those are the mountain's 灵露 hooks for buying avatars. 贝壳
     buys boats through 海滩小铺 and must not become a second avatar purse. */
  function registerCode() {
    if (!(window.WSProfile && window.WSProfile.registerCodeProvider)) return;
    window.WSProfile.registerCodeProvider({
      stream: "xh",
      /* ⚠️ `addIds` here are WORD TEXTS, not ids — store.done is keyed by 词语 (the pier
         has never had word ids). profile.js builds the bitmask over the same published
         order, so the two agree by construction. */
      commit: function (plan) {
        var added = 0;
        (plan.addIds || []).forEach(function (t) {
          if (!store.done[t]) { store.done[t] = true; added++; }
        });
        /* ⚠️ readLines rides along but is NOT counted in `added`: 读过 N 句 is exposure,
           not progress, and must never reach 航程, the badges or a board (§18n). */
        (plan.readLines || []).forEach(function (id) {
          if (!store.readLines[id]) store.readLines[id] = 1;
        });
        save();
        pushDock(true);          // the boards should reflect a restore immediately
        return { added: added };
      },
      snapshot: function () { return JSON.parse(JSON.stringify(store)); },
      restoreSnapshot: function (snap) {
        if (!snap) return;
        store = snap; save();
        /* ⚠️ re-render: an undo that leaves the old numbers on screen reads as a
           silently failed undo, which is worse than no undo. */
        renderMenu();
      },
      onChanged: renderTop
    });
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

  /* ---------- 意见反馈 floating button (owner 2026-08-16 晚) ----------
     ⚠️ The pier shipped with NO way to report anything. Every mountain screen has
     had this corner button since 2026-08-14 (cs.js ensureFab); the pier was simply
     never given one, so its students — the weakest readers on the platform, the
     ones most likely to hit a word they cannot make sense of — had to find a teacher
     to say so. Same button, same panel, same quota; profile.js is already loaded here.
     ⚠️ It is NOT hidden on any pier screen, unlike the mountain's, which disappears
     during 词雨灵露 and 攀山快答. Nothing on the pier is timed: 词海钓鱼's catch rises
     on answers, not on a clock, so a stray tap costs a student nothing.
     ⚠️ When 沙滩快跑 lands it will be the pier's first paced mode — hide it there. */
  var _fabEl = null;
  function ensureFab() {
    if (_fabEl && _fabEl.isConnected) return _fabEl;
    _fabEl = document.createElement("button");
    _fabEl.className = "fb-fab";
    _fabEl.id = "xhFbFab";
    _fabEl.title = "意见反馈 · 报错";
    _fabEl.setAttribute("aria-label", "意见反馈");
    /* ⚠️ the label is glossed, like every other pier control — the mountain's is
       bare 反馈 because its students can read it. */
    _fabEl.innerHTML = '<span class="fb-fab-icon">💬</span>' +
      '<span class="fb-fab-txt">反馈' + xhPy("意见反馈") +
      '<span class="xh-en">tell us</span></span>';
    _fabEl.onclick = function () {
      if (window.WSProfile && window.WSProfile.openFeedback) window.WSProfile.openFeedback();
    };
    document.body.appendChild(_fabEl);
    return _fabEl;
  }
  /* what the student is looking at right now, read by profile.js when a ticket is
     opened. ⚠️ Derived from `state` at call time rather than pushed on every render:
     the pier draws from two different shapes (a word row, a sentence row) and a
     setter at each render site is a line that gets forgotten on the next new mode. */
  window.WS_FEEDBACK_CTX = function () {
    try {
      if (!state || !state.seq) return null;
      var cur = state.seq[state.i];
      if (!cur) return null;
      return { mode: (modeById(state.mode) || {}).zh || "",
               word: cur.词语 || cur.ask || cur.zh || "", id: cur.id || "" };
    } catch (e) { return null; }
  };

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
     nothing and resume() may never settle. Same defence cs.js arrived at: never
     wait on resume alone, and rebuild the context if it will not run. */
  var _ac = null, _keepAlive = null, _acBorn = 0, _acFails = 0, MAX_REBUILDS = 8;
  function buildCtx() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    var c;
    try { c = new C(); } catch (e) { return null; }
    _acBorn = (new Date()).getTime();
    /* 静音保活源：通道里一直有东西在播，就不容易被回收、也不容易被朗读夺走。
       gain 恒 0，听不见，每轮循环一个采样。cs.js 早就有这个，码头漏了。 */
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
  /* 🐛 owner 2026-08-17：看句选词 答对没有音效，iPad 与 ThinkPad 都一样。
     ⚠️ **`_acFails` 从来不归零，所以那 8 次的额度是「整页寿命」的额度，
     而它被花在了根本注定失败的尝试上。** 这个玩法的设计流程（§18h 把朗读搬到句子旁边
     那颗 🔊）就是「先听整句，再作答」，而一句话 rate=0.85 要读 2.5–3.5 秒——
     学生几乎总是**在朗读还没读完的时候**答对。那一刻苹果的音频通道在 speechSynthesis
     手上，`interrupted` 状态下**新建的 context 一样是 interrupted**，所以这次重建
     必然失败，却照样扣掉一次额度。答对八次之后，整页永久没声音，
     `revive()` 也再也救不回来（它同样走这个函数）。
     两条修正：
     ⚠️ **① 通道真的回来了就把计数清零**（`noteRunning`）。额度要计的是「这台设备
        根本放不出声」，不是「刚才被朗读打断过」。
     ⚠️ **② 朗读还在进行时不花额度**：那一次注定失败。等 `speak()` 结束时的
        `revive()` 再来一次——那时通道是空的，重建才有意义。
     ⚠️ 浏览器对一个页面能建几个 AudioContext 有硬上限（Chrome 历史上是 6），
        所以额度本身**必须留着**，不要因为这个 bug 就把它删掉。 */
  function speechBusy() {
    try {
      return !!(window.speechSynthesis &&
                (speechSynthesis.speaking || speechSynthesis.pending));
    } catch (e) { return false; }
  }
  function noteRunning() {
    if (_ac && _ac.state === "running") _acFails = 0;
  }
  function rebuildCtx() {
    if (_acFails >= MAX_REBUILDS) return _ac;
    if ((new Date()).getTime() - _acBorn < 1000) return _ac;
    /* ⚠️ don't spend the budget on a doomed attempt — see ② above */
    if (speechBusy()) return _ac;
    _acFails++;
    var old = _ac;
    _ac = null; _keepAlive = null;
    if (old && old.close) { try { old.close(); } catch (e) {} }
    var built = (_ac = buildCtx());
    noteRunning();          // a fresh context is born running when the channel is free
    return built;
  }
  function revive() {
    if (!_ac || _ac.state === "running") { noteRunning(); return; }
    try { _ac.resume(); } catch (e) {}
    setTimeout(function () {
      if (_ac && _ac.state === "running") { noteRunning(); return; }
      /* ⚠️ revive() is called from speak()'s `done`, which fires on onend/onerror — by
         then the utterance is over, so `speechBusy()` is false and the rebuild inside
         rebuildCtx() is finally allowed to happen. That ordering is the other half of
         fix ②: the doomed attempts are skipped, and the one that can work still runs. */
      rebuildCtx();
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
      noteRunning();          // 🐛 the channel is alive: give the rebuild budget back
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
  /* ⚠️ RETURNS NOTHING NOW (owner 2026-08-16 晚). The pier used to carry TWO back
     controls at once — 「← 海图」 in the topbar and this 「‹ 返回」 in the round bar —
     while a mountain has exactly ONE, in the topbar, whose destination depends on
     where you are (cs.js setTopbar: 「landing」 at the stream home, renderHome
     inside a mode). Two backs in two places going to two different destinations is
     the discrepancy the owner reported.
     ⚠️ The function is KEPT rather than deleted from its ~15 call sites: those sites
     are correct — they mark「this screen can be left」— and they now do it by calling
     wireQuit(), which points the ONE control at renderMenu. Deleting it would be a
     15-file-region edit for no behaviour. Add new screens through it exactly as
     before. */
  function quitBtn() { return ""; }
  /* the topbar back button, contextual — the pier's half of setTopbar(backTo).
     ⚠️ It stays an <a href="index.html"> in the markup so that with JS broken it
     still degrades to the sea map rather than to a dead control. */
  var _backFn = null;
  function setBack(fn, dest) {
    _backFn = fn || null;
    var a = document.querySelector(".xh-back");
    if (!a) return;
    /* ⚠️ 回码头, not 返回 (owner asked what the pier's word should be, 2026-08-16 晚).
       What makes the mountain's 「‹ 回营地」 readable is that it NAMES THE PLACE you
       land in; 返回 tells a beginner only that something reverses. The pier's home
       base is the 码头 front page, so it says 回码头 — and the two lands then read as
       one platform with one idea in two costumes.
       ⚠️ The mountain's topbar chevron carries no label at all and 回营地 lives on an
       in-content button. The pier keeps the label because its students are the ones
       who need every control glossed; that difference is deliberate, not drift. */
    a.innerHTML = !_backFn
      ? '← 海图<span class="xh-py xh-uipy">hǎi tú</span><span class="xh-en">sea map</span>'
      : dest
        /* inside a round it names the ACTIVITY you drop back into, one level up —
           the same「say where you land」rule, applied one rung lower. */
        ? "‹ " + esc(dest.zh) + xhPy(dest.zh) +
          '<span class="xh-en">back to ' + esc(dest.en) + "</span>"
        : "‹ 回码头" + xhPy("回码头") + '<span class="xh-en">back to the pier</span>';
    a.onclick = function (e) {
      if (!_backFn) return;               // let the href take it to the sea map
      e.preventDefault();
      _backFn();
    };
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
    return DIFF_OPTS[diffIx()];
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
  /* ---------- 组字成词 (HANDOFF_XH_沙滩快跑 §2) ----------
     ⚠️ §2.5, AND IT IS THE SAME LOCKED RULE AS EVERY OTHER MODE HERE: decoy
     characters come from OTHER WORDS IN THE SAME 组别, never from another group.
     Difficulty scales how MANY there are, never how far away they are — a 挑战 round
     is a longer board, not a trick.
     ⚠️ Single-character words are drawn on too: 鱼 contributes 鱼 to 食物's letter
     pool even though it can never be the answer itself. It is a character bank, and
     excluding them would thin it for no reason.
     ⚠️ Characters already IN the target are excluded. A fifth 妈 on the board is not
     a harder puzzle, it is a board where two different tiles are both right and the
     student cannot tell why. */
  function buildDecoys(w) {
    var have = {}, out = [];
    String(w.词语).split("").forEach(function (c) { have[c] = 1; });
    WORDS.forEach(function (o) {
      if (o.组别 !== w.组别 || o.词语 === w.词语) return;
      String(o.词语).split("").forEach(function (c) {
        if (!have[c]) { have[c] = 1; out.push(c); }
      });
    });
    return out;
  }
  function buildable(w) { return String(w.词语).length >= 2 && buildDecoys(w).length >= 1; }
  /* ⚠️ EVERY TILE IS AN OBJECT WITH ITS OWN INDEX, BUILT FROM split("") — never from
     a Set and never through anything that de-duplicates (§2.3). 妈妈 · 爸爸 · 星星 ·
     谢谢 · 弟弟 · 姐姐 · 哥哥 · 妹妹 are all in reach here, and a de-duplicating build
     leaves them unsolvable: one tile, two slots.
     ⚠️ Validation compares the assembled CHARACTER SEQUENCE against the word, so two
     tiles bearing the same character are freely interchangeable — which is correct,
     and falls out of comparing strings rather than indices.
     (The same shape as sortTiles one screen up. §2.3 warns this is「the exact bug
     already flagged in 词山's 组字成词」— it is not: that one was checked over 60
     rounds and 20 repeated-character words on 2026-08-16 and does the right thing.
     The rule is still right; only its premise was stale.) */
  function buildTiles(w) {
    var chars = String(w.词语).split("");
    var tiles = chars.map(function (c, i) { return { i: i, t: c }; });
    var extra = DIFF_BUILD[diffIx()];
    shuffle(buildDecoys(w)).slice(0, extra).forEach(function (c, k) {
      tiles.push({ i: chars.length + k, t: c, decoy: true });
    });
    return shuffle(tiles);
  }
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
    /* ⚠️ §2.4's filter lives HERE and nowhere else, so it narrows the round pool AND
       the replay list AND the door's grey-out test in one place. 数字 is 14 words of
       one character each, so this empties it and the tile says why. */
    if (mode === "build") return pool.filter(buildable);
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
  /* ---------- 走进社区 · the ten scenes as a place you can visit (owner 2026-08-17) --
     ⚠️ THIS IS 门 A, finally built. CLAUDE.md has carried「生活空间 作为独立入口（门 A）
     尚未建」as an open item since the sentence library shipped; the owner asked for it
     by name:「for the authentic scenes where sentences were written into life scenes,
     to be its own separate section called 走进社区 … then when they press in they
     learn the sentences」.
     ⚠️ IT IS A BROWSE SURFACE, NOT AN ACTIVITY, which is why it belongs in the right
     rail beside 我的词语表 and NOT in ③ beside 学习挑战. Everything in ③ is scoped by
     ①学习范围 and pays 贝壳; this walks the WHOLE library by scene, scores nothing, and
     is reachable no matter what the scope says. Putting it in ③ would have made it the
     one tile there that ignores ①.
     ⚠️ SEPARATE FROM 词语闪卡 · 句子卡, deliberately, and they signpost each other:
     句子卡 walks the sentences of the words currently IN SCOPE (a lesson that follows
     ①), 走进社区 walks a PLACE from end to end. Same 90 lines, two honest ways in.
     ⚠️ Pinyin lives in XH_PY like every other label (§10) — the scene names are keys
     there. English is here rather than in XH_GROUP_EN because that table is checked
     against 组别/子类 in the word data by checkGroupLabels(), and a scene is neither;
     adding scenes there would make the checker's report meaningless. */
  var SCENE_EN = {
    "学校": "School", "交通": "Getting around", "购物商场": "Shopping mall",
    "菜市场": "Wet market", "便利店": "Minimart", "熟食中心": "Hawker centre",
    "组屋区": "Around the block", "动物园": "Zoo", "农场": "Farm",
    "水族馆": "Aquarium"
  };
  /* ⚠️ ORDER IS THE OWNER'S READING ORDER, not the data's and not alphabetical:
     nearest-to-home first (组屋区 · 学校), then the everyday errands, then the places
     you go on an outing. A zero-Chinese beginner meeting ten unfamiliar names does
     better with「where I already am」at the top left. */
  var SCENE_ORDER = ["组屋区", "学校", "交通", "菜市场", "便利店", "熟食中心",
                     "购物商场", "动物园", "水族馆", "农场"];
  /* every line of a scene, in data order, ASKABLE OR NOT.
     ⚠️ display-only lines ARE included here, and this is the one place they are. They
     were authored to be read and are excluded everywhere else only because they cannot
     be a QUESTION (no askable target). §11 is explicit that where「harder」and「more
     exposure」pull apart the pier takes exposure — and reading is all this screen does.
     ⚠️ NOT filtered by ①学习范围: see the note above. */
  function sceneLines(scene) {
    return PHRASES.filter(function (p) { return p.scene === scene && p.zh; });
  }
  /* Which word this line should SHOW, and its picture.
     ⚠️ display-only lines have NO `ask` at all — that is what makes them display-only —
     so the ordinary `p.pic || ask.图档` lookup returns nothing and the card rendered as
     a bare sentence with an empty space where every neighbouring card has a sprite
     (owner 2026-08-17, reporting 「我的邻居养了一只猫。」 and 「组屋区里有许多设施。」).
     The line is still ABOUT something, and 猫 and 组屋 are both pier words with art.
     ⚠️ LONGEST MATCH, or 熊猫最喜欢吃竹子 picks 猫. The longest pier word contained in
     the sentence is the one the sentence is really about.
     ⚠️ THIS IS SAFE ONLY BECAUSE 走进社区 ASKS NOTHING. Do not reach for it from
     看句选词: there the picture IS part of the question and must be exactly the target
     word (§11 — 「这包＿＿多少钱？」 is unanswerable without the right sticker, and the
     wrong one would make it answerable with the wrong word).
     ⚠️ Returns the word too, so the card can print it with its 拼音: a word worth
     picturing is a word worth naming. */
  function lineSubject(p) {
    var w = p.ask ? wordByText(p.ask) : null;
    if (p.pic) return { file: p.pic, word: w };
    if (w && w.图档) return { file: w.图档, word: w };
    if (w) return { file: "", word: w };
    var best = null, zh = String(p.zh || "");
    WORDS.forEach(function (x) {
      if (!x.图档 || !x.词语 || zh.indexOf(x.词语) === -1) return;
      if (!best || x.词语.length > best.词语.length) best = x;
    });
    return { file: best ? best.图档 : "", word: best };
  }
  function sceneReadCount(scene) {
    return sceneLines(scene).filter(function (p) { return p.id && store.readLines[p.id]; }).length;
  }
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
  /* ---------- `seg` — 组词成句 的分块 (HANDOFF_学以致用 §3) ----------
     ⚠️ OPTIONAL, AND HAND-WRITTEN. A sentence with no `seg` is simply invisible to
     组词成句; nothing else in the codebase reads the field, so its absence cannot
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
    /* ⚠️ `ask` DOES NOT HAVE TO BE ITS OWN TILE (PATCH_03 §3B — the rule was here and
       is now retired). Requiring it did real damage in the first data pass: 鱼汤 was
       split into 鱼/汤 and 咖喱鸡 into 咖喱/鸡 purely to satisfy this check, i.e. words
       were broken to make a validator happy. `ask` only feeds store.done and the
       weak-first bucket; whether its string also appears as a tile is irrelevant.
       Three sentences ship this way on purpose (樟宜机场 · 鱼汤 · 咖喱鸡).
       ⚠️ If an ask↔tile mapping is ever really needed, add an explicit field — do
       not go back to guessing it by string equality. */
    return true;
  }
  /* ---------- segPy: may this sentence SHOW 拼音 (owner vetted 2026-08-19) ----------
     ⚠️ DELIBERATELY NOT A FOURTH CLAUSE INSIDE segOK(), and the difference is not
     cosmetic. segOK() decides whether a sentence may be PLAYED; a missing segPy would
     therefore delete the sentence from 组词成句 altogether, silently shrinking the
     library. Pinyin here is optional scaffolding, not content (backfill handoff §5),
     so the correct failure is DEGRADE, not DROP — which is what that handoff's own §4
     asks for in words (「否则这一句整句不发拼音」) even though it filed the check under
     segOK. All 73 sentences pass today, so the difference would be invisible now and
     would surface later as a sentence that simply stopped appearing.
     ⚠️ WHOLE-SENTENCE GATE, never per block. Half a tray with 拼音 means「the blocks
     WITH 拼音 are the real ones」— the decoys come from the word list and can always be
     looked up, the seg blocks are ordinary words that mostly cannot. That asymmetry is
     the entire reason this data had to be authored by hand (§18m); leaking it through a
     per-block fallback would be worse than showing no 拼音 at all. */
  function segPyOK(p) {
    if (!p || !(p.segPy instanceof Array) || !(p.seg instanceof Array)) return false;
    if (p.segPy.length !== p.seg.length) return false;
    for (var i = 0; i < p.segPy.length; i++) {
      if (typeof p.segPy[i] !== "string" || !p.segPy[i]) return false;
    }
    return true;
  }
  /* ---------- 多个合法答案 (PATCH_03) ----------
     ⚠️ `seg`'s own order is ONE correct answer, not THE correct answer. 农夫在喂鸡和猪
     is just as good as 农夫在喂猪和鸡, and marking it wrong is a defect, not strictness.
     `accepted_zh` holds the extras as STRINGS (never as tile arrays): a second array
     of the same tiles would be a copy that can fall out of sync silently, whereas a
     string is only ever compared, never a second source of truth.
     ⚠️ The original is NOT repeated in accepted_zh — `seg` already provides it. */
  function segAnswers(p) {
    var out = [p.seg.join("")];
    if (p.accepted_zh instanceof Array) {
      p.accepted_zh.forEach(function (a) { if (a && out.indexOf(a) === -1) out.push(a); });
    }
    return out;
  }
  /* how many leading tiles of `laid` agree with answer string `ans` */
  function segPrefixLen(laid, ans) {
    var at = 0;
    for (var i = 0; i < laid.length; i++) {
      if (ans.substr(at, laid[i].length) !== laid[i]) return i;
      at += laid[i].length;
    }
    return laid.length;
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
    /* 组词成句 — the word-tile game the 2026-08-16 morning design specified and
       PATCH_02 replaced with an MCQ to get something shippable. This puts it back.
       ⚠️ It teaches WORD ORDER, so it is the one mode whose answer is a sequence.
       It needs the optional `seg` array; sentences without one are invisible to it
       and the mode greys itself out rather than failing on 出发. */
    { id: "sort", icon: "🧩", zh: "组词成句", en: "Put the words in order", learn: true },
    { id: "type", icon: "🎣", zh: "词海钓鱼", en: "Reel it in — type the pinyin" },
    { id: "match", icon: "🪢", zh: "连线", en: "Match them up" },
    /* 组字成词 (HANDOFF_XH_沙滩快跑 §2) — 组词成句's gesture one level DOWN: that one
       taps out the WORDS of a sentence, this taps out the CHARACTERS of a word. Third
       screen in the platform to use it, after the mountain's 组字成词, and the layout
       is copied from 组词成句 on purpose — one gesture, learned once.
       ⚠️ ≥2 CHARACTERS ONLY, and that is a real filter here rather than a formality:
       49 of the pier's 149 words are single characters and the whole of 数字 is, so
       the mode greys itself out for that group instead of opening onto one tile. */
    { id: "build", icon: "🧱", zh: "组字成词", en: "Build the word" }
  ];
  /* ---------- ③ 的入口 (owner 2026-08-16 evening) ----------
     The tiles on the front page. ⚠️ They are NOT the same list as MODES: 词语挑战
     is one door with four question types behind it, exactly as the mountain's
     学习挑战 holds 填空/华文解释/英文翻译. Keeping the four apart out here was the
     「clunky」the owner reported — a beginner had to tell 看图识词 from 听音识图
     before meeting a single word.
     `k` is the door, not a mode id: startRound is still driven by store.mode. */
  /* ⚠️ 学习 面现在是**两张卡**：先读（词语闪卡）再考（词语挑战）——owner 2026-08-17
     把 学以致用 并进 词语挑战 当题型。
     词 与 句 的分层没有消失，只是从「两扇门」降成 ①挑战方式 里的两排
     （认词 三种 · 用词 两种），见 renderModeConfig。08-16 拆成两扇门是为了让
     句级题型不再混在词级题型里，那个区分仍然在，少的只是一次点击。 */
  var ENTRIES = [
    { k: "cards", icon: "📖", zh: "词语闪卡", en: "Flashcards", learn: true, short: "Flashcards" },
    /* ⚠️ 学以致用 IS NOT A DOOR ANY MORE (owner 2026-08-17:「put 学以致用 into quiz
       yourself as a test mode」). Its two sentence types moved in here as question
       types 4 and 5, so 学习 is two cards — read it, then test it — and every way of
       being tested lives behind one door.
       ⚠️ THE 「no in-round switching between 看句选词 and 组词成句」 RULE STILL HOLDS
       (§18g): 看句选词 shows the whole sentence when you get it right, which is the
       complete word order 组词成句 exists to test. Sharing a door does not break that,
       because the type is still chosen BEFORE 出发 and a round runs exactly one of
       them. Do not add an in-round switch just because they are now neighbours. */
    /* ⚠️ THE SUBTITLE NAMES THE TWO SENTENCE TYPES OUT LOUD (owner 2026-08-17).
       「词的三种 · 句的两种」was true and still unfindable: 句 appeared exactly once
       on the whole front page, as one character inside this line, and nowhere did the
       words 看句选词 or 组词成句 appear at all. A student — or the owner — scanning
       four tiles for the sentence work had nothing to scan FOR.
       ⚠️ subEn matters as much as sub here: the pier defaults BOTH aids on (§18m),
       so the English line is genuinely being read. */
    /* ⚠️ ONE TEST DOOR, AND IT CARRIES THE MOUNTAIN'S NAME (owner 2026-08-17:「pier
       learning mode should be like mountain: 词语闪卡、学习挑战」). 学习 is now the
       same two cards as 学习 — read it, then test it — with all seven ways of being
       tested behind the second one.
       ⚠️ THIS SUPERSEDES §18m's「连线 与 组字成词 仍是完整的门」, and the reason that
       ruling gave has been answered rather than ignored. It refused the fold because
       each would need「a special case in ③」— but ③ is the door row, and nothing there
       branches: both are plain entries in entryModes now. Their one real difference,
       连线 having no 每次题数, lands on the CONFIG page, which has branched per 题型
       since it was written (词语闪卡 shows no difficulty row at all, 组词成句 gets its
       own blocked-reason sentence). The mountain's 学习挑战 does exactly this: 填空挑战
       carries a ⭐ tier row its two siblings do not.
       ⚠️ 词语挑战 IS GONE AS A NAME. Do not reintroduce it as a shelf heading or a
       sub-door: the pier now has 词语闪卡 and 学习挑战, matching the mountain word for
       word, and a third pier-only name in between is what made ② feel clunky before. */
    { k: "quiz", icon: "✍️", zh: "学习挑战", en: "Quiz", learn: true, short: "the quiz" },
    { k: "type", icon: "🎣", zh: "词海钓鱼", en: "Reel it in — type the pinyin", learn: false , short: "fishing" },
    /* ⚠️ 沙滩快跑 IS A DOOR NOW, not a row inside every other config page (owner
       2026-08-17:「play mode for pier should only show fishing and beach run」).
       It is still a SKIN and not a scoring path — the same 看图识词 round pays the
       same 贝壳 and the same 航程 either way, §18i is unchanged on that. What changed
       is where you choose it: as a row it appeared on six config screens and asked a
       question the student had no reason to answer there. As a door it asks its own
       question once, and 闯关 finally reads as「the two things that are really games」.
       ⚠️ It owns no mode of its own: `entryModes("surf")` is derived from RUN_MODES,
       so a new runnable 题型 joins this door automatically and can never drift. */
    { k: "surf", icon: "🏃", zh: "沙滩快跑", en: "Beach run", learn: false, short: "the beach run",
      naZh: "这组没有能跑的题型", naEn: "no runnable question type in this scope" }
  ];
  /* which store slot remembers the last type used behind a multi-type door.
     ⚠️ One slot per door — an unconditional write would let two doors overwrite each
     other's last-used type. There is only one such door now (owner 2026-08-17 folded
     学以致用 into 词语挑战), but the map stays a map: the moment a second one appears
     the shared-slot bug comes back. */
  /* ⚠️ surf gets its OWN slot. It offers an overlapping set of 题型 (every runnable
     one), so sharing quizMode would mean picking 看句选词 for the beach silently
     changed what 词语挑战 opens on — the exact overwrite this map exists to prevent. */
  var ENTRY_MEM = { quiz: "quizMode", surf: "runQuizMode" };
  function entryByKey(k) {
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].k === k) return ENTRIES[i];
    return ENTRIES[0];
  }
  /* the mode ids a door can start. 词语挑战 owns all five question types; every other
     door owns exactly one mode.
     ⚠️ ORDER IS THE UI ORDER: the three 词-level types first, then the two 句-level
     ones, because renderModeConfig splits the row on that boundary. */
  function entryModes(k) {
    if (k === "cards") return ["learn"];
    /* ⚠️ ORDER IS THE SHELF ORDER: 认词 · 用词 · 配对与拼字. renderModeConfig groups
       by QUIZ_SHELF, so a new type joins a shelf by naming one, not by position —
       but keeping the list grouped keeps the two readable side by side. */
    if (k === "quiz") return ["enmcq", "pic", "listen", "phrase", "sort", "match", "build"];
    /* ⚠️ DERIVED FROM RUN_MODES, never listed by hand: the beach run's 题型 set is
       BY DEFINITION「the ones that can be run」, and a second hand-written copy would
       disagree with runAllowed() the first time either changed. Filtered through the
       quiz order so the two doors present the same types in the same order. */
    /* ⚠️ THE `.concat(build)` TAIL IS GONE, and it had to go: 组字成词 is now inside
       entryModes("quiz"), so the filter already picks it up and the concat would have
       listed it TWICE — two identical 🧱 tiles on the beach-run door, the same
       duplicate-tile failure as 「两」 and 「整鸡」 (§5). Still derived, never hand-listed. */
    if (k === "surf") {
      return entryModes("quiz").filter(function (m) { return runAllowed(m); });
    }
    /* ⚠️ "use" was a door until 2026-08-17 and old code paths may still ask for it.
       Answering with the quiz list keeps a stale caller landing somewhere real
       instead of on [ "use" ], which is not a mode at all. */
    if (k === "use") return entryModes("quiz");
    return [k];
  }
  /* ⚠️ A door that cannot run under the current 学习范围 must SAY SO here rather
     than open onto a dead config screen. Same rule §4.4 already applies one level
     down: 看图识词/听音识图 need a picture, 传声筒 needs a sentence. */
  /* ⚠️ the reverse of entryModes: which door owns this mode. Used by 换一组 on the
     end screens, which must land on the config page the student came from rather
     than all the way back at the dock (owner 2026-08-16 晚). */
  function entryForMode(id) {
    /* ⚠️ 沙滩快跑 FIRST when the round is a run. Every runnable 题型 now belongs to two
       doors, and a plain first-match walk would send a student who came in through
       沙滩快跑 back to 学习挑战's setup — a different screen with a different memory
       slot. store.runMode is the authoritative record of which door opened this
       round, because only the surf door ever sets it. */
    if (store.runMode === "surf" && runAllowed(id)) return "surf";
    for (var i = 0; i < ENTRIES.length; i++) {
      if (entryModes(ENTRIES[i].k).indexOf(id) !== -1) return ENTRIES[i].k;
    }
    return null;
  }
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
      /* ⚠️ NO SUBHEADING ON A DOOR TILE (owner 2026-08-17: 「this is too cluttered -
         remove subheadings」). Each tile already carries an icon, a name, its pinyin
         and its English — a fifth line listing what is behind the door made ③ four
         stacked paragraphs, and with 拼音 and 英文 both on by default at the pier that
         line arrives THREE deep.
         ⚠️ This does NOT undo §18n. That fix was「the sentence modes have no name
         anywhere」, and the names now live where they are actually useful: the
         用词 · 生活空间 shelf heading inside 学习挑战, and 走进社区 as a visible tile in
         the right rail. The tile subtitle was the noisiest of the three places to say
         it, not the only one.
         ⚠️ The 灰掉理由 below is NOT a subheading and stays: it is the only thing that
         explains why a door cannot be opened. */
      return '<button class="xh-mode' + (ok ? "" : " na") + '" data-e="' + e.k + '"' +
        (ok ? "" : " disabled") + '>' +
        '<span class="xh-mi">' + e.icon + "</span><b>" + e.zh + "</b>" + xhPy(e.zh) +
        '<span class="xh-en">' + e.en + "</span>" +
        (ok
          ? ""
          /* ⚠️ the reason is PER DOOR. It was hardcoded to「这组没有图片」, which is true
             of 词语挑战 and 学以致用 and false of 组字成词 — that one greys out because
             the scope holds nothing longer than one character, and telling a student
             to go find pictures would send them looking for the wrong thing. */
          : '<span class="xh-mode-na">' + (e.naZh || "这组没有图片") +
            '<span class="xh-en">' + (e.naEn || "no pictures") + "</span></span>") +
        "</button>";
    }).join("");
  }
  /* `opts:true` = the mode shows the ③挑战难度 slider (how many options are on
     screen). 看图学词 asks nothing, 词海钓鱼 is typed, and 连线's difficulty is its
     board size — none of them have an option count to set. */
  function modeById(id) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i];
    return MODES[0];
  }
  var ROUND_SIZES = [5, 10, 15, 20];       // ②每次题数
  /* ---------- ③难度 — ONE setting for every 闯关 题型 (HANDOFF §3.1) ----------
     ⚠️ 1/2/3 = 简单/中等/挑战, and it is DELIBERATELY the only difficulty control the
     pier has. It replaced four separate dials, each with its own units — 选项 2/3/4,
     连线 3/5/8 组, 组词成句 +0/2/4/6, 组字成词 +1/2/4 — which meant a student who set
     「hard」 in one mode met「normal」in the next and had no way to know why.
     ⚠️ THE NUMBERS BELOW ARE THE OWNER'S, NOT §3.2's (owner 2026-08-16 晚, asked
     directly). §3.2 proposes 连线 3/4/5 and 选项 3/4/6; those were tuned on real
     boards and 连线's 8-pair board is its whole top end, so the STRUCTURE comes from
     the handoff and the VALUES stay as they were. The one casualty is 组词成句's +6
     step, which has no fourth 难度 to live on.
     ⚠️ Every row is indexed [简单, 中等, 挑战] in that order. Adding a step means
     adding it to every row here and nowhere else. */
  var DIFFS = [1, 2, 3];
  var DIFF_OPTS  = [2, 3, 4];   // 看图识词 / 听音识图 / 英文选词 / 看句选词 — options on screen
  var DIFF_MATCH = [3, 5, 8];   // 连线 — pairs on the board
  var DIFF_SORT  = [0, 2, 4];   // 组词成句 — extra word tiles
  var DIFF_BUILD = [1, 2, 4];   // 组字成词 — extra characters
  function diffIx() { return Math.max(0, Math.min((store.diff || 2) - 1, 2)); }
  function diffLabel(n) {
    return n === 1 ? "⭐ 简单" : n === 2 ? "⭐⭐ 中等" : "⭐⭐⭐ 挑战";
  }
  /* ⚠️ The slider says 简单/中等/挑战 and this line says what that BUYS in the mode
     you are about to play. Three abstract steps with no stated effect is the reason
     the mountain's 字块数量 was rewritten (§18f): a difficulty control the student
     cannot verify against the screen is a control they stop trusting. */
  function diffMeans(id) {
    var i = diffIx();
    if (id === "match") return "这一档：一次连 " + DIFF_MATCH[i] + " 组。";
    if (id === "sort")  return "这一档：多 " + DIFF_SORT[i] + " 块干扰词。";
    if (id === "build") return "这一档：多 " + DIFF_BUILD[i] + " 个干扰字。";
    if (id === "type")  return "这一档：答对的贝壳多一些，题目一样。";
    return "这一档：每题 " + DIFF_OPTS[i] + " 个选项。";
  }
  function diffMeansEn(id) {
    var i = diffIx();
    if (id === "match") return DIFF_MATCH[i] + " pairs on the board.";
    if (id === "sort")  return DIFF_SORT[i] + " extra word tiles in the tray.";
    if (id === "build") return DIFF_BUILD[i] + " extra characters in the tray.";
    if (id === "type")  return "Same questions, more 贝壳 for getting them right.";
    return DIFF_OPTS[i] + " choices per question.";
  }
  /* ⚠️ OPT_TIERS / MATCH_SIZES / SORT_EXTRAS / BUILD_EXTRAS AND THEIR LABEL FUNCTIONS
     ARE GONE (2026-08-16 晚). Four constants, four sliders, four sets of units — all
     of it now lives in the DIFF_* rows above. They are deleted rather than left
     unreferenced on purpose: a stray `SORT_EXTRAS` still sitting here is exactly what
     the next change would reach for, and then two difficulty models would be live at
     once. The old store fields survive (see load()); the old CONTROLS do not.
     ⚠️ 组词成句's +6 step went with them. It has no fourth 难度 to sit on, and the
     owner chose keeping the ranges honest over keeping every step. */

  /* ---------- 沙滩快跑 · which 题型 may be played as a run (HANDOFF §1.5) ----------
     ⚠️ The test is「is one answer one tap」, not「is it easy」. A run advances one
     stretch per question, so a mode whose answer arrives in pieces (连线's board of
     pairs) or behind the on-screen keyboard (词海钓鱼) has nothing to pace against.
     组字成词 and 组词成句 ARE tap-based even though the student taps several times:
     the ANSWER EVENT is single — 检查答案 — which is what the runner listens for.
     ⚠️ Blocked types are GREYED, never hidden (§1.5): the student keeps the whole
     list in their head and learns which ones the beach cannot take. */
  /* ⚠️ `sort` LEFT THIS LIST (owner 2026-08-17:「remove beach run from unscramble
     sentence - it needs the backdrop of specific scenes」). 组词成句 already paints
     its scene backdrop (renderSort reads SCENE_BG), so this is not a missing feature
     — it is two backgrounds fighting: the beach band sits above #xhView while the
     菜市场 or 动物园 it belongs to sits behind the panel. The scene is the point of
     the sentence, so the beach loses.
     ⚠️ `phrase` (看句选词) paints the SAME backdrop and is still allowed here. That is
     the owner's call as given, not an oversight on my part — flag it rather than
     "fixing" it, because 看句选词 is one tap per question and reads fine as a run
     while 组词成句 is a whole tray of tiles over the same art. */
  var RUN_MODES = { pic: 1, listen: 1, enmcq: 1, phrase: 1, build: 1 };
  function runAllowed(id) { return !!RUN_MODES[id]; }
  function runBlockWhy(id) {
    if (id === "match") return ["一次要连好几组，跑不成一题一步", "a whole board at once, not one answer"];
    if (id === "type")  return ["打字时键盘会挡住海滩", "the keyboard covers the beach"];
    /* ⚠️ its own sentence, not the generic one: this is not「nothing to answer」, it
       is「the scene背景 is doing the teaching here」(§1.5 — grey it out and say why). */
    if (id === "sort")  return ["这个玩法要用场景背景", "it needs its scene backdrop"];
    return ["这个玩法没有答对答错", "nothing to answer here"];
  }

  /* 动线编号 — the same gold numerals cs.js puts on multi-step decision flows.
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
  /* ⚠️ statCell is GONE with the hero's three stat boxes (owner 2026-08-17). It had
     exactly one caller. Left in place it would be an invitation to build a second
     boxed-stat row somewhere, which is the layout the owner just asked to remove. */

  /* ---------- menu ---------- */
  function renderMenu() {
    state = null;
    runTeardown();                          // the beach never outlives its round
    setBack(null);                          // pier front page: back = the sea map
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

    /* ⚠️ TWO COLUMNS at >=900px (DESIGN_迭代规划_出发码头布局). The blocks are
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
    /* ⚠️ NOT `.wide` any more (owner 2026-08-17: 「走进社区 should share a row with my
       vocab list instead of being underneath」). The rail is now two rows of two:
       我的词语表 ‖ 走进社区 on top (the two browse surfaces — every word, every place),
       航海徽章 ‖ 码头风云榜 below. Stacking two full-width tiles pushed the badges and
       the board off the fold on a laptop.
       ⚠️ The 海里 progress bar survives at half width; it is the only tile with one and
       it is what makes 我的词语表 readable at a glance. */
    tiles += '<button class="xh-tile" id="xhLog">' +
      '<img class="xh-tile-art" src="art/xh/xh_atlas_cover.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
      '<span class="xh-tile-txt"><b>我的词语表</b>' + xhPy("我的词语表") +
      '<span class="xh-en">every word, and the ones you have met</span>' +
      '<span class="xh-bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="xh-tile-n">' + st.met + " / " + st.all + ' 海里</span></span>' +
      '<span class="xh-tile-go">›</span></button>';

    /* ⚠️ 走进社区 SITS IN THIS RAIL, DIRECTLY UNDER 我的词语表 (owner 2026-08-17:
       「in the same bar as their vocab list」). The rail is the pier's browse shelf —
       surfaces you visit rather than rounds you play — and these two are its pair:
       one walks every WORD, one walks every PLACE.
       ⚠️ It is hidden entirely when PHRASES failed to load, rather than opening onto
       an empty grid: on a managed network the sentence fetch is allowed to fail
       (see the .catch that leaves PHRASES empty) and the rest of the pier keeps
       working. A door onto nothing is the silent failure §4.4 exists to prevent.
       ⚠️ NO DENOMINATOR on the read count (§18n): sentences retire — two went in
       2026-08-16 — so「N / 90」can read 91/90, and this is a mileage figure, not a
       collection. Same reason 读过 N 句 carries no total in 我的词语表. */
    if (PHRASES.length) {
      var scRead = 0;
      SCENE_ORDER.forEach(function (s) { scRead += sceneReadCount(s); });
      tiles += '<button class="xh-tile" id="xhScenes">' +
        '<img class="xh-tile-art" src="art/xh/scene_hawker.png' + ASSET_V + '" alt="" ' +
          "onerror=\"this.style.display='none'\">" +
        '<span class="xh-tile-txt"><b>走进社区</b>' + xhPy("走进社区") +
        '<span class="xh-en">Step into the neighbourhood, one place at a time</span>' +
        /* ⚠️ NO inline xhPy() on this line. The annotation spans are display:block
           under the gate, so a gloss in the MIDDLE of a sentence splits it across
           three lines («10 个场景 / gè chǎng jǐng / · 读过 0 句»). 我的词语表's
           「0 / 148 海里」 carries none for the same reason: the name above is glossed,
           the tally under it is numerals. */
        '<span class="xh-tile-n">' + SCENE_ORDER.length + ' 个场景 · 读过 ' +
        scRead + ' 句</span></span>' +
        '<span class="xh-tile-go">›</span></button>';
    }

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
       学习/闯关, ③ lays the activities out as tiles right there, and the settings
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
    /* ⚠️ NO BERTH SPRITES ON THIS PREVIEW (owner 2026-08-17: 「for the beach preview
       don't display the purchased items as the positions don't lock right. just display
       the original image」). It used to composite the same items at the same percentage
       coordinates as 我的海滩 so the two could not drift — but percentages resolve against
       a DIFFERENT box here (a short wide banner, not the tall stage), so a crate the
       student parked on the sand landed in the sea. Free placement (§18m) made this
       worse, not better: the coordinates are now wherever a finger left them.
       ⚠️ Do NOT "fix" it by scaling the coordinates. The two boxes have different aspect
       ratios, so no single transform maps one to the other — and the preview does not need
       to: the beach is one tap away and shows the real arrangement.
       ⚠️ CLEANED UP to match the mountain's banner (owner: 「very cluttered, make it more
       like the mountain interface clean and sleek」). cs.js's .lscape carries a name, ONE
       quiet line and a corner link — not a subtitle plus three boxed stat cells. The three
       numbers become one line; 一次答对 and 集齐的组 are still available on 我的词语表 and
       the boards, which is where a student goes to study them.
       ⚠️ The whole-plate tap target stays a real <button>, not a div — and there is still
       exactly ONE action, so it needs no overlay-button trick (cs.js needs that only
       because it stacks the room pills on top). */
    /* ⚠️ A POSITIONED WRAPPER, because the room pills must be SIBLINGS of the hero
       button (a button inside a button is §14's first trap) yet be positioned against
       it. Without this they would resolve against the page and fly to its corner. */
    h += '<div class="xh-hero-wrap">';
    h += '<button class="xh-hero" id="xhHero" title="我的海滩">' +
      '<img class="xh-hero-bg" src="art/xh/dock_bg.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
      '<div class="xh-hero-in">' +
        '<div class="xh-hero-t">出发码头</div>' +
        /* ⚠️ no inline xhPy() mid-sentence — the gloss spans are display:block under the
           gate, so a gloss between two clauses splits one line into three (the same
           thing that had to be fixed on the 走进社区 tile). The English line under it
           carries the whole reading instead. */
        '<div class="xh-hero-line"><b>' + st.met + '</b> 海里' +
          ' · 一次答对 <b>' + (st.acc === null ? "—" : st.acc + "%") + '</b>' +
          ' · 集齐 <b>' + st.full + " / " + st.groups + '</b>' +
          '<span class="xh-en">' + st.met + ' words met · ' +
          (st.acc === null ? "—" : st.acc + "% first try") + ' · ' +
          st.full + " / " + st.groups + ' chapters</span></div>' +
      "</div>" +
      '<span class="xh-hero-go">🏖️ 我的海滩 ›</span></button>';
    /* ⚠️ 结伴出海 / 同伴挑战 sit ON the hero, exactly as the mountain puts them on its
       banner (.lscape-rooms): they are occasional and social, needing a teacher or a
       friend, so they do not belong in the solo funnel ①②③.
       ⚠️ SIBLINGS OF THE HERO BUTTON, NOT CHILDREN. .xh-hero is itself a <button>, and a
       button inside a button is §14's first trap — the browser lifts the inner one out
       and the layout silently breaks. cs.js hit this and solved it the same way. */
    /* ⚠️ 结伴出海 CAME BACK once teacher.html could actually host a 码头 room (the same
       change added 码头 to its stream row and a 组别-based scope picker). It was withheld
       for one release on purpose: before that, any code typed here returned
       「找不到这个擂台码」— a door that could not open, which §4.4 forbids shipping.
       ⚠️ If the teacher console ever loses pier hosting, withhold this pill again rather
       than leaving it to fail at the join screen. */
    h += '<div class="xh-rooms">' +
      '<button class="xh-room" id="xhCoop">🤝 结伴出海' + xhPy("结伴出海") +
      '<span class="xh-en">sail together</span></button>' +
      '<button class="xh-room" id="xhPk">⚔️ 同伴挑战' + xhPy("同伴挑战") +
      '<span class="xh-en">challenge a friend</span></button></div>';
    h += "</div>";                       // close .xh-hero-wrap


    h += '<div class="xh-tiles">' + tiles + "</div>";  // destinations fill the column below
    h += "</div>";                                   // close .xh-col-r
    view().innerHTML = h;

    document.getElementById("xhHero").onclick = renderBeach;
    document.getElementById("xhPk").onclick = renderXhPk;
    /* ⚠️ 结伴出海 goes STRAIGHT to arena's join screen, with no setup of its own: the
       teacher owns the words, the mode and the timing, exactly as 结伴登峰 does on the
       mountain. A config screen here would let a student pick settings the room then
       overrides — worse than no screen at all. */
    document.getElementById("xhCoop").onclick = function () {
      if (!window.WSArena) return toast("房间功能暂时不可用，请刷新页面。");
      window.WSArena.open(xhArenaCtx());
    };
    document.getElementById("xhLog").onclick = function () { renderLog(); };
    /* ⚠️ guarded: the tile is absent when PHRASES failed to load. Unguarded this
       throws and every handler wired after it dies with it. */
    if (document.getElementById("xhScenes")) {
      document.getElementById("xhScenes").onclick = renderScenes;
    }
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
     shown twice — and 看图学词 / 词海钓鱼 have no difficulty at all. */
  function renderModeConfig(kind) {
    state = null;
    /* ⚠️ the beach band is a SIBLING of #xhView, so it survives an innerHTML swap.
       Reaching this screen from a finished 沙滩快跑 round without this leaves the
       whole beach sitting above the setup panel. */
    runTeardown();
    view().classList.remove("two-col");
    /* ⚠️ ONE DOOR PER SCREEN (owner 2026-08-16 evening). It used to take a
       "learn"/"play" SIDE and re-show the whole mode grid, so the student picked the
       activity twice: once on the front page, once again here. `kind` is now an
       ENTRIES key and this screen only asks the questions that活动 actually has.
       Old side values are still accepted so a stale call cannot land on nothing. */
    if (kind === "learn") kind = "cards";
    if (kind === "play") kind = "type";
    /* ⚠️ 学以致用 was a door for one day (2026-08-16 → 08-17). Without this line a
       stale「use」falls through entryByKey's ENTRIES[0] fallback and opens 词语闪卡,
       which is not even the right side of the screen. */
    if (kind === "use") kind = "quiz";
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
    /* ⚠️ THE DOOR SETS THE SKIN, and it is the only thing that does now (owner
       2026-08-17). runMaybe() still reads store.runMode exactly as before, so nothing
       downstream changed — what changed is that the student answers「beach or not」by
       choosing a tile instead of by a row repeated on six setup screens.
       ⚠️ Written on EVERY door, not just surf: leaving it alone would let a remembered
       "surf" build a beach under 词语挑战, which is the one thing this door is for. */
    store.runMode = (kind === "surf") ? "surf" : "plain";
    save();
    var cur = modeById(store.mode);

    /* ⚠️ NO 回合条 HERE (owner 2026-08-16 晚). It used to hold 「‹ 返回」 plus a
       tag naming this screen; the back moved to the topbar, and the tag was
       already the panel's own title one line further down — the same words
       twice, with an empty strip above them. Screens that KEEP the bar are the
       ones whose bar carries something else: the jetty progress, or 连线's
       scope + pair count. */
    var h = '<div class="xh-board xh-cfg">';
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
      /* ⚠️ THE TWO HALVES OF THE SENTENCE LIBRARY SIGNPOST EACH OTHER (owner
         2026-08-17). 句子卡 reads the 90 lines; 看句选词/组词成句 test them; they sit
         on two screens two doors apart and neither has ever mentioned the other.
         ⚠️ TEXT ONLY, NEVER A JUMP BUTTON. A jump would fling the student from one
         ENTRY_MEM slot into another — §18m split quizMode/runQuizMode precisely so
         two doors could stop overwriting each other's remembered type. A sentence
         that names where to go carries none of that risk. */
      h += '<div class="xh-cfg-note">' +
        (store.cardKind === "sentence"
          ? '句子卡会把选中范围里的句子一句一句读完（' + nPhr + ' 句）。句子卡不记航程。' +
            '读完之后可以到 学习挑战 · 用词 里考自己。'
          : '词语卡会把选中的词一张一张看完（' + pool.length + ' 张）。') +
        '<span class="xh-en">' +
        (store.cardKind === "sentence"
          ? 'Sentence cards run through every sentence in scope. They do not count towards 航程. ' +
            'When you have read them, test yourself in 学习挑战 · 用词.'
          : 'Word cards run through every word in scope.') + '</span></div>';
    } else if (modes.length > 1) {
      /* the question types behind a multi-type door — 词语挑战 now owns all five
         (owner 2026-08-17 folded 学以致用 in).
         ⚠️ Numbered: on this screen it really IS the first decision the student
         makes, not a refinement of a card they picked one screen earlier.
         ⚠️ SPLIT INTO 词 AND 句, not one row of five. Five tiles abreast is cramped
         at the pier's card width, and the split carries the actual teaching point:
         the first three ask「do you know this word」, the last two ask「can you use it
         in a sentence」. That distinction is the whole reason they were two doors for
         a day — folding the door back in must not lose it, only the extra click.
         ⚠️ The sub-headings are NOT 动线编号 (§7): the numbered step is「which
         question」, and these are two shelves inside it, not two more steps.
         ⚠️ 看句选词 and 组词成句 are still two SEPARATE rounds with no mid-round switch
         (§18g). 看句选词 prints the whole sentence on a correct answer, so switching to
         组词成句 on that same sentence would hand over the complete word order — the
         only thing 组词成句 tests. Sharing a shelf does not change that.
         ⚠️ Do NOT read that as「the dock forbids mid-round switching」: 组字成词 on the
         mountain switches 释义/英文/填空 freely, and that is safe because it changes
         the PROMPT, not the mechanism, and the answer stays the same word. */
      /* ⚠️ SHELVES ARE DECLARED, NOT DERIVED FROM POSITION. Three racks now: 认词
         asks「do you know this word」, 用词 asks「can you put it in a sentence」,
         配对与拼字 asks the student to assemble something. A type joins a shelf by
         naming one here; unnamed falls to 认词, so a new 题型 can never land in a
         shelf nobody chose for it.
         ⚠️ 配对与拼字 exists because 连线 and 组字成词 came in from 闯关 (owner
         2026-08-17) and are genuinely neither of the first two: both are hands-on —
         many taps, one answer event — where the other five are pick-one-of-four or
         type-it. Grouping them under 认词 would put a whole-board activity next to a
         four-option question and call them the same kind of thing.
         ⚠️ A shelf heading is NOT a 动线编号 (§7): ①挑战方式 is the step; these are
         racks inside it. Do not number them. */
      var QUIZ_SHELF = { phrase: "sent", sort: "sent", match: "hands", build: "hands" };
      /* ⚠️ The pinyin comes from XH_PY via xhPy(), never inline (§10): the tables are
         the only place a missing or wrong-length reading gets caught, and xhPy returns
         an EMPTY STRING for an unknown key — a miss here would be silent. */
      var SHELF_LAB = {
        word:  ["认词", "know the word"],
        sent:  ["用词 · 生活空间", "use it in a sentence"],
        hands: ["配对与拼字", "match it up or build it"]
      };
      h += sec("挑战方式", "which question");
      var blocked = 0, noSeg = false;
      function modeBtns(list) {
        var out = "";
        list.forEach(function (id) {
          var m = modeById(id), usable = poolForMode(pool, id).length > 0;
          if (!usable) { blocked++; if (id === "sort") noSeg = true; }
          /* ⚠️ THE REASON IS PER TYPE, and 组字成词's is new here: it came in from
             闯关 carrying its own naZh on the door (「这组没有两个字以上的词语」), and
             the door is gone. Falling through to「这组没有图片」would send a student to
             change 学习范围 hunting for pictures when what the scope lacks is
             multi-character words — the exact mis-signposting the door note warned of. */
          var why = "这组没有图片", whyEn = "no pictures";
          if (id === "sort") { why = "这些句子还没有分块"; whyEn = "sentences not split yet"; }
          else if (id === "build") { why = "这组没有两个字以上的词语"; whyEn = "no multi-character words here"; }
          else if (id === "phrase") { why = "这组没有句子"; whyEn = "no sentences here"; }
          out += '<button class="xh-mode sm' + (store.mode === id ? " on" : "") +
            (usable ? "" : " na") + '" data-m="' + id + '"' + (usable ? "" : " disabled") + '>' +
            '<span class="xh-mi">' + m.icon + "</span><b>" + m.zh + "</b>" + xhPy(m.zh) +
            '<span class="xh-en">' + m.en + "</span>" +
            (usable ? "" : '<span class="xh-mode-na">' + why +
                           '<span class="xh-en">' + whyEn + "</span></span>") +
            "</button>";
        });
        return out;
      }
      /* ⚠️ Each shelf is skipped entirely when the door owns nothing on it, and the
         heading is skipped when it owns only ONE shelf — a single rack needs no rack
         label, and 沙滩快跑 reuses this block with a shorter list. */
      var shelves = ["word", "sent", "hands"].map(function (key) {
        return { key: key, list: modes.filter(function (id) {
          return (QUIZ_SHELF[id] || "word") === key;
        }) };
      }).filter(function (s) { return s.list.length; });
      shelves.forEach(function (s) {
        var lab = SHELF_LAB[s.key];
        h += (shelves.length > 1 ? '<div class="xh-shelf-lab">' + lab[0] + xhPy(lab[0]) +
              '<span class="xh-en">' + lab[1] + '</span></div>' : "") +
          '<div class="xh-modes sub">' + modeBtns(s.list) + "</div>";
        /* ⚠️ 生活空间 IS PRINTED HERE AND NOWHERE ELSE ON THIS SCREEN (owner
           2026-08-17, reading 乙): the 08-17 merge saved a click but cost the sentence
           layer its only name, and the owner herself then could not find it.
           ⚠️ The signpost is TEXT, NEVER A JUMP BUTTON — a jump would fling the student
           from one ENTRY_MEM slot into another (§18m split quizMode/runQuizMode for
           exactly that reason). */
        if (s.key === "sent") {
          h += '<div class="xh-cfg-note">想先把句子读一遍：词语闪卡 · 句子卡，' +
            '或者到 走进社区 逐个场景读。' +
            '<span class="xh-en">Want to read the sentences first? Try 词语闪卡 · 句子卡, ' +
            'or walk through them scene by scene in 走进社区.</span></div>';
        }
      });
      /* ⚠️ 组词成句 is blocked by MISSING DATA, not by the student's scope, so it needs
         its own sentence — 「这组没有图片」 would send them off changing 学习范围 for
         something no scope can fix. `seg` is hand-written per §3.3 and none exist yet. */
      if (noSeg) {
        h += '<div class="xh-cfg-note">组词成句 需要把句子先切成词块，这批句子还没有切。' +
          '<span class="xh-en">组词成句 needs its sentences split into word tiles first. ' +
          'That is written by hand, and none are ready yet.</span></div>';
      }
      if (blocked - (noSeg ? 1 : 0) > 0) {
        h += '<div class="xh-cfg-note">「数字」这一组没有图片，所以看图和听音的玩法用不上。' +
          '数字可以用 词语闪卡、词海钓鱼 和 连线 来练。' +
          '<span class="xh-en">Numbers have no pictures, so picture and listening rounds are off ' +
          'for them. Use flashcards, typing or matching instead.</span></div>';
      }
    }

    /* ---------- ③难度 — ONE ROW, ALWAYS THE SAME ROW (HANDOFF §3.1) ----------
       ⚠️ 「One persistent row, never conditionally shown or hidden」 is the point of
       it, so it appears on every screen that runs questions, in the same place, with
       the same three steps. What it MEANS per 题型 lives in DIFF_* and is spelled out
       under the slider rather than in a different control per mode.
       ⚠️ 词语闪卡 is the exception §3.2 allows for: it asks nothing, so it has no
       difficulty axis and shows neither this row nor 每次题数.
       ⚠️ 连线 shows no 每次题数 — its board size IS its round — so 难度 is the only
       thing it asks. */
    if (kind !== "cards") {
      /* ⚠️ THE ①模式 ROW IS GONE (owner 2026-08-17). 普通闯关 vs 沙滩快跑 used to be a
         two-button row on every one of these screens; it is now the choice of tile on
         ③, so asking again here would be the same decision at two levels — the
         「clunky」the owner named when ② stopped being navigation. runBlockWhy() is
         still live and still explains a blocked 题型, but it does it inside the
         沙滩快跑 door's own 题型 list, where a greyed-out type is actually informative. */
      /* ⚠️ KEYED ON store.mode, NOT ON `kind` — 连线 is a 题型 now, not a door, so
         asking「is this door 连线」is a question that can no longer be true and the
         slider would appear on a screen where it means nothing (the board size IS the
         round). This is the ONE per-type branch the fold needed, and it lives here
         because this screen already branches per type: 词语闪卡 shows neither this row
         nor 难度, and 组词成句 prints its own blocked-reason line.
         ⚠️ The click handler re-renders on every 题型 change, so switching to 连线
         really does make this row disappear rather than going stale. */
      if (store.mode !== "match") {
        h += sec("每次题数", "questions per round") +
          qtySlider("xhRoundN", ROUND_SIZES, store.roundN, function (n) { return n + " 题"; });
      }
      h += sec("难度", "how hard") +
        qtySlider("xhDiff", DIFFS, store.diff, diffLabel) +
        '<div class="xh-cfg-note">' + diffMeans(cur.id) +
        '<span class="xh-en">' + diffMeansEn(cur.id) + "</span></div>";
    }

    /* ONE action. The topbar's 回码头 already leaves this screen, and a second back
       button beside 出发 is the same redundancy the owner cut from the menu
       (2026-08-16). */
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
    /* the [data-rm] handler is gone with the ①模式 row it wired — store.runMode is
       written by the door now, up beside `store.mode` (owner 2026-08-17). */
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode[data-ck]"), function (el) {
      el.onclick = function () {
        store.cardKind = el.getAttribute("data-ck"); save();
        renderModeConfig(kind);
      };
    });
    wireQtySlider("xhRoundN", ROUND_SIZES, function (n) { return n + " 题"; },
      function (n) { store.roundN = n; save(); });
    /* ⚠️ re-renders instead of just saving: the note under the slider spells out what
       this step means for THIS mode («一次连 5 组»), so it has to be redrawn with it.
       Every other slider here only changes a number nothing else displays. */
    wireQtySlider("xhDiff", DIFFS, diffLabel, function (n) {
      store.diff = n; save(); renderModeConfig(kind);
    });
    document.getElementById("xhGoRound").onclick = function () {
      if (!scopedWords().length) { toast("请先选一组词语 · Pick a group first"); return; }
      startRound(scopeLabel());
    };
  }

  /* ⚠️ The readout sits ABOVE the track, never beside it — a readout as a flex
     sibling makes the track grow and shrink as the label's width changes, which is
     the exact bug the mountain's slider had to fix (CLAUDE.md 2026-08-14). Ticks
     mark the stops so no end labels are needed. Copied from cs.js by design: this
     file never loads cs.js. */
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

  /* ================= 房间：结伴出海 · 同伴挑战 (owner 2026-08-17) =============
     The pier's answer to the mountain's 结伴登峰 / 同伴挑战.
     ⚠️ IT REUSES arena.js, and that is the whole design decision. The room LIFECYCLE —
     six-digit code, lobby, roster, host start, snapshot subscribe, reconnect, podium,
     TTL — is identical for both families and runs to several hundred lines. A second
     copy is precisely the「two places to fix, one with no symptom」shape this codebase
     keeps getting bitten by. What actually differs is the question renderer and the
     award hook, and arena.js already takes BOTH through ctx.
     ⚠️ IT REUSES THE `rooms/{code}` COLLECTION TOO, which means NO NEW FIRESTORE RULES.
     The published rule keys on hostUid / pk / isTeacher() / status and never looks at
     `stream`, so a pier room passes it unchanged. A separate dockRooms collection would
     have needed rules the owner must publish by hand — and §16 already lists several
     blocks sitting unpublished.
     ⚠️ THE WATERLINE HOLDS (§4). The room doc carries stream:"xh"; arena refuses a join
     across the family line (see its doJoin guard); and every award below writes ws_xh
     and nothing else. xh.js still never touches ws2_*, cs.js still never reads ws_xh.
     ⚠️ SCORING IS ON, mirroring §12 (owner confirmed 2026-08-18). The same per-word
     halving that applies in solo play applies here — awardShells/awardSail are the very
     same functions — so a room is not a shortcut to 贝壳. */
  var XH_PK_MODES = [
    /* ⚠️ Only the two the pier can actually ask in a room. 连线 is a whole board rather
       than a question, 词海钓鱼 needs a keyboard, and the sentence modes need their scene
       backdrop — the same reasoning §18i used to decide what could run on the beach. */
    { k: "pic",   label: "🖼️ 看图识词", zh: "看图识词" },
    { k: "enmcq", label: "🔤 英文选词", zh: "英文选词" }
  ];
  var XH_PK_DUR = [180, 300, 480];
  /* pier words in the shape arena.js indexes.
     ⚠️ `id` IS THE 词语 ITSELF. The pier has never had word ids (store.done is keyed by
     text, §5), and arena keys its wordIndex by id — using the text for both makes the
     room's wordIds list and arena's index agree by construction, and makes the
     cross-stream `texts` join key arena already sends identical to the ids. */
  function xhArenaWords(list) {
    return (list || []).map(function (w) {
      return { id: w["词语"], w: w["词语"], py: w["拼音"], en: w["英文释义"],
               pic: w["图档"], grp: w["组别"] };
    });
  }
  function xhArenaCtx() {
    return {
      stream: "xh",
      words: xhArenaWords(WORDS),
      profile: profileOf(),
      getUid: function (cb) {
        if (window.WSCloud && window.WSCloud.getUid) window.WSCloud.getUid(cb); else cb(null);
      },
      /* ⚠️ THE PIER'S OWN DISTRACTOR PICKER, handed over rather than left to arena's
         generic one. §5 is absolute:「干扰项永远取自同一个 组别，没有例外」, and there is a
         mutual-exclusion blacklist on top (猪肉/牛肉 …). arena's fallback prefers part of
         speech, which pier words do not even carry. */
      distractors: function (correct, n) {
        var real = wordByText(correct && correct.w);
        if (!real) return [];
        return xhArenaWords(distractors(real, n, "enmcq"));
      },
      /* 航程 + 首次跨过的航海徽章门槛. ⚠️ Keyed by TEXT, which is what store.done uses,
         so a room's word list needs no translation. */
      conferMastery: function (ids, texts) {
        var want = {}, added = 0;
        (ids || []).concat(texts || []).forEach(function (t) { if (t) want[t] = 1; });
        WORDS.forEach(function (w) {
          var t = w["词语"];
          if (want[t] && !store.done[t]) { store.done[t] = true; added++; }
        });
        if (added) { save(); noteSailBadges(); pushDock(true); }
        return added;
      },
      /* 贝壳 + 航海值 per correct answer.
         ⚠️ Goes through awardShells/awardSail — the SAME functions solo play uses — so
         the non-first-try halving and the 难度 multiplier apply identically. Writing a
         bespoke payout here is exactly the「第二条计分路径」§13 forbids.
         ⚠️ `entering` (the streak) is ignored on purpose: the pier has no streak
         multiplier anywhere, and inventing one only inside rooms would make a room the
         best place to farm 贝壳. */
      roomCorrect: function (rw, mode) {
        sfxOk();
        var w = wordByText(rw && rw.w);
        if (!w) return null;
        var sh = awardShells(mode, true), sa = awardSail(mode, true);
        save();
        return { pts: sa, ll: sh };
      },
      sfx: function (kind) { if (kind === "bad") sfxNo(); else sfxOk(); }
    };
  }
  /* 同伴挑战 setup — host a room, or join a friend's.
     ⚠️ 结伴出海 (teacher-hosted) has NO setup screen by design: the teacher picks the
     words and the mode, exactly as on the mountain, so the student side is only a join. */
  function renderXhPk() {
    view().classList.remove("two-col");
    state = null;
    runTeardown();
    var pool = poolForMode(scopedWords(), store.pkMode || "pic");
    var mode = store.pkMode || "pic", dur = store.pkDur || 300;
    var h = '<div class="xh-board xh-cfg"><div class="xh-berth-title">⚔️ 同伴挑战' +
      xhPy("同伴挑战") + '<span class="xh-en">Challenge a friend</span></div>' +
      '<div class="xh-cfg-note">和朋友比一比：同一套题，限时内谁答对得多谁赢。' +
      '答对的词照样算进航程，也照样捡到贝壳。2 至 8 人。' +
      '<span class="xh-en">Same questions, same timer — most correct wins. Words you get ' +
      'right still count towards 航程 and still pay 贝壳. 2 to 8 players.</span></div>' +
      '<div class="xh-cfg-scope">范围：' + esc(scopeLabel()) + " · " + pool.length + " 词" +
      '<span class="xh-en">' + pool.length + ' words in scope</span></div>';
    var step = 0;
    function sec(zh, en) {
      step++;
      return '<div class="xh-sec">' + stepNo(step) + zh + xhPy(zh) +
        ' <span class="xh-en">' + en + "</span></div>";
    }
    h += sec("挑战方式", "which question") + '<div class="xh-modes sub">';
    XH_PK_MODES.forEach(function (m) {
      var usable = poolForMode(scopedWords(), m.k).length > 0;
      h += '<button class="xh-mode sm' + (mode === m.k ? " on" : "") + (usable ? "" : " na") +
        '" data-pk="' + m.k + '"' + (usable ? "" : " disabled") + '>' +
        "<b>" + m.label + "</b>" + xhPy(m.zh) +
        (usable ? "" : '<span class="xh-mode-na">这组没有图片<span class="xh-en">no pictures</span></span>') +
        "</button>";
    });
    h += "</div>";
    h += sec("时长", "how long") +
      qtySlider("xhPkDur", XH_PK_DUR, dur, function (n) { return (n / 60) + " 分钟"; });
    h += '<div class="xh-cfg-acts">' +
      '<button class="xh-btn ghost" id="xhPkJoin">加入朋友的房间' + xhPy("加入朋友的房间") +
      '<span class="xh-en">join a room</span></button>' +
      '<button class="xh-go" id="xhPkHost">开一个房间 ›' + xhPy("开一个房间") +
      '<span class="xh-en">host one</span></button></div></div>';
    view().innerHTML = h;
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".xh-mode[data-pk]"), function (el) {
      el.onclick = function () { store.pkMode = el.getAttribute("data-pk"); save(); renderXhPk(); };
    });
    wireQtySlider("xhPkDur", XH_PK_DUR, function (n) { return (n / 60) + " 分钟"; },
      function (n) { store.pkDur = n; save(); });
    document.getElementById("xhPkJoin").onclick = function () {
      if (!window.WSArena) return toast("房间功能暂时不可用，请刷新页面。");
      window.WSArena.open(xhArenaCtx());
    };
    document.getElementById("xhPkHost").onclick = function () {
      if (!window.WSArena || !window.WSArena.host) return toast("房间功能暂时不可用，请刷新页面。");
      var words = poolForMode(scopedWords(), mode);
      /* ⚠️ REFUSE RATHER THAN OPEN AN EMPTY ROOM. A room with no questions is the
         silent failure §4.4 exists to prevent, and it is worse here than solo: the
         friends who joined are left staring at a lobby that never starts. */
      if (words.length < 4) {
        toast("这个范围里可出题的词太少，先多选几组。");
        return;
      }
      window.WSArena.host(xhArenaCtx(), {
        mode: mode, tier: "3",
        wordIds: shuffle(words.map(function (w) { return w["词语"]; })).slice(0, 40),
        limitBy: "time", durationS: dur
      });
    };
  }

  /* ================= 航海徽章 · 明细 (owner 2026-08-17) =====================
     「pier badges need the same amount of detail as mountain badges where possible -
     whether it's earned, when it is earned etc」
     ⚠️ 「WHERE POSSIBLE」 IS DOING REAL WORK IN THAT SENTENCE, and the honest answer is
     不是每一项都搬得过来:
       · 已获得／还没获得 · 首次获得的日期 · 进度条 · 还需几个词 — 都搬得过来。
       · 「已获得 N 次」搬不过来，而且**不该**搬：山上的板块章可以靠 再次挑战 重复获得，
         而航海徽章是**里程表**（§12：绝对值、永不重新编号、没有终点）。走过 50 海里
         就是走过了，不存在「第二次走到 50」。印一个永远是 1 的次数是假的细节。
       · 山上那张「已掌握 3 / 3 词」加词语 chip 列表也搬不过来：板块章对着一个**固定的
         词集**，而航海徽章对着**整个词库的一个门槛**，没有对应的词集。
         替代品是「还差哪几个词」——见下面 nextUnmet()，那是这一屏真正能回答的问题。
     ⚠️ 日期是**从现在开始记**，旧徽章只能显示「日期未记录」——和山上一模一样
     （`badgeLog` 里没有条目的徽章就是这么显示的）。**绝不要回填一个猜的日期**：
     一个编出来的「首次获得」比承认不知道更糟。 */
  function sailToday() {
    /* ⚠️ Singapore time, matching cs.js's todaySG(): the school day is what a date
       means to a teacher reading this, and a UTC date flips at 8am local. */
    try {
      var d = new Date(Date.now() + 8 * 3600 * 1000);
      return d.toISOString().slice(0, 10);
    } catch (e) { return ""; }
  }
  /* Record any threshold crossed by the answer that just landed.
     ⚠️ Called from noteRight AFTER store.done is written, so `met` already includes
     this word. Idempotent: a key that exists is never rewritten, so the FIRST date
     is the real one and replaying a round cannot move it.
     ⚠️ It writes to its own map and never touches store.done — the badge ladder counts
     store.done (§13 red line) and must keep being the only source of truth for「got」.
     `sailLog` is a decoration on top, so a lost/absent log costs a date, never a badge. */
  function noteSailBadges() {
    var met = sailStats().met, d = sailToday(), changed = false;
    SAIL_BADGES.forEach(function (b) {
      if (met < sailBadgeNeed(b)) return;
      if (store.sailLog[b.k]) return;
      store.sailLog[b.k] = { first: d, at: met };
      changed = true;
    });
    if (changed) save();
  }
  /* the words this badge is still waiting on — the pier's answer to the mountain's
     word-chip list. ⚠️ Drawn from the WHOLE library, not 学习范围: the threshold is
     over every word, so narrowing it to the current scope would show a student a list
     that does not actually add up to the badge. */
  function nextUnmet(n) {
    var out = [];
    for (var i = 0; i < WORDS.length && out.length < n; i++) {
      if (!store.done[WORDS[i]["词语"]]) out.push(WORDS[i]);
    }
    return out;
  }
  function xhPop(innerHtml) {
    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.innerHTML = '<div class="pop-card">' + innerHtml + "</div>";
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    /* ⚠️ Esc closes it too. The pier is used on Chromebooks with keyboards (PLD), and
       a modal a keyboard user cannot dismiss is a trap. Listener removed with the card
       so a closed popup does not keep swallowing Esc. */
    function onKey(e) {
      if (e.key === "Escape") { ov.remove(); document.removeEventListener("keydown", onKey); }
    }
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    return ov;
  }
  function openSailBadge(b) {
    var met = sailStats().met, need = sailBadgeNeed(b), have = met >= need;
    var log = store.sailLog[b.k] || null;
    var pct = need ? Math.min(100, Math.round(met / need * 100)) : 0;
    var left = Math.max(0, need - met);
    var h = '<div class="xh-bd">' +
      (b.img
        ? '<img class="xh-bd-art' + (have ? "" : " locked") + '" src="art/xh/badges/' +
          b.img + '.png' + ASSET_V + '" alt="" onerror="this.style.display=\'none\'">'
        : '<span class="sailbadge-todo">' + esc(b.zh.charAt(0)) + "</span>") +
      '<div class="xh-bd-name">' + esc(b.zh) + xhPy(b.zh) +
        '<span class="xh-en">' + esc(b.en) + "</span></div>" +
      /* the threshold, always — it is what the badge IS */
      '<div class="xh-bd-need">认得 <b>' + need + "</b> 个词语" +
        '<span class="xh-en">' + need + " words recognised</span></div>";
    if (have) {
      h += '<div class="xh-bd-earned">🎖 已获得' + xhPy("已获得") +
        '<span class="xh-en">earned</span></div>' +
        /* ⚠️ 日期未记录 rather than a guess, exactly as the mountain does for badges
           that predate its own log. */
        '<div class="xh-bd-date">首次获得：' + esc((log && log.first) || "日期未记录") +
        '<span class="xh-en">' + (log && log.first ? "first earned " + esc(log.first)
                                                  : "date not recorded") + "</span></div>";
    } else {
      h += '<div class="xh-bd-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="xh-bd-prog">' + met + " / " + need + " 海里" +
        '<span class="xh-en">' + met + " of " + need + "</span></div>" +
        '<div class="xh-bd-left">还差 <b>' + left + "</b> 个词语" +
        '<span class="xh-en">' + left + " to go</span></div>";
      var soon = nextUnmet(6);
      if (soon.length) {
        /* ⚠️ This is the pier's stand-in for the mountain's word chips, and it is a
           DIFFERENT question because the badge is a milestone rather than a word set:
           not「which words belong to this badge」(none do) but「which words are still
           waiting」. Six, because it is a nudge, not a syllabus. */
        h += '<div class="xh-bd-soon"><span class="xh-bd-soon-lab">还没认得的词语，' +
          '例如：<span class="xh-en">Words you have not met yet, for example</span></span>' +
          soon.map(function (w) {
            return '<span class="xh-bd-chip">' + esc(w["词语"]) +
              '<span class="xh-py">' + esc(w["拼音"]) + "</span></span>";
          }).join("") + "</div>";
      }
    }
    h += '<div class="nav-row">' +
      /* ⚠️ ONE action, and only when it can actually do something. The mountain offers
         再次挑战 over a 板块; the pier's equivalent is「go and meet more words」, which
         is meaningless once the badge is earned — so an earned badge gets 关闭 alone
         rather than a button that would restate the obvious. */
      (have ? "" : '<button class="nav-btn primary" id="xhBdGo">去认词' +
        xhPy("去认词") + "</button>") +
      '<button class="nav-btn" id="xhBdClose">关闭' + xhPy("关闭") + "</button></div></div>";
    var ov = xhPop(h);
    ov.querySelector("#xhBdClose").onclick = function () { ov.remove(); };
    var go = ov.querySelector("#xhBdGo");
    if (go) go.onclick = function () {
      ov.remove();
      /* ⚠️ Lands on 学习挑战's setup rather than starting a round: the badge screen has
         no idea what 题型 or 学习范围 this student wants, and picking for them is how
         §4.4's silent failures happen (a scope with no pictures, a 题型 that cannot run).
         Sending them to the door they already know keeps every one of those guards. */
      renderModeConfig("quiz");
    };
  }

  /* ================= 走进社区 · the scene grid (owner 2026-08-17) =================
     Ten places, each with its own backdrop, its sentence count and how many of them
     this student has read. Pressing one walks that place's lines end to end.
     ⚠️ NO 回合条 (same rule as 航海徽章/我的海滩/我的词语表): the back control is the
     topbar's single arrow, and the panel title one line down already names the screen.
     ⚠️ state = null BEFORE anything renders, so wireQuit() resolves「not in a round」
     and the arrow goes back to the dock rather than to a config page.
     ⚠️ A scene with no lines is DROPPED, not greyed: unlike a blocked 题型 there is
     nothing a student could change to make it appear, so an explanation would be
     an explanation of nothing. In practice all ten have lines; this guards the case
     where a scene is retired from the data but left in SCENE_ORDER. */
  function renderScenes() {
    view().classList.remove("two-col");
    state = null;
    runTeardown();
    var h = '<div class="xh-board"><div class="xh-berth-title">🏘️ 走进社区' +
      xhPy("走进社区") + '<span class="xh-en">Step into the neighbourhood</span></div>';
    /* ⚠️ Says what this screen IS FOR, because it is the one pier surface that is
       neither a lesson nor a test. Without it 「走进社区」 is a place-name with no verb. */
    h += '<div class="xh-cfg-note">这里的句子都是真实生活里会听到的话。' +
      '挑一个地方，一句一句读，不用答题。' +
      '<span class="xh-en">These are the sentences you would really hear in each place. ' +
      'Pick one and read through it — nothing to answer.</span></div>';
    h += '<div class="xh-scenes">';
    SCENE_ORDER.forEach(function (s) {
      var lines = sceneLines(s);
      if (!lines.length) return;
      var read = sceneReadCount(s), bg = SCENE_BG[s];
      /* ⚠️ THE WHOLE CARD IS THE BUTTON, never a div wrapping one (§14 nested
         buttons): one place, one action. */
      h += '<button class="xh-scene" data-sc="' + esc(s) + '">' +
        '<span class="xh-scene-art">' +
          (bg ? '<img src="art/xh/' + bg + '.png' + ASSET_V + '" alt="" ' +
                "onerror=\"this.style.display='none'\">" : "") +
          /* the read-through marker: a quiet tick, not a trophy — reading is exposure,
             not mastery (§18n), so it must not look like an earned badge */
          (read >= lines.length ? '<span class="xh-scene-done">✓</span>' : "") +
        "</span>" +
        '<span class="xh-scene-txt"><b>' + esc(s) + "</b>" + xhPy(s) +
          '<span class="xh-en">' + esc(SCENE_EN[s] || "") + "</span>" +
          '<span class="xh-scene-n">' + lines.length + ' 句 · 读过 ' + read + "</span></span>" +
        "</button>";
    });
    h += "</div></div>";
    view().innerHTML = h;
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".xh-scene[data-sc]"), function (el) {
      el.onclick = function () { startScene(el.getAttribute("data-sc")); };
    });
  }

  /* walk one scene's sentences.
     ⚠️ REUSES renderSentenceCard VERBATIM — same card, same 🔊, same store.readLines
     write. A second sentence-card renderer would be the second scoring path mistake
     in cosmetic form: two places to fix when the card changes, one of which nobody
     remembers. `cards:"sentence"` is all renderLearn branches on.
     ⚠️ `scene: s` marks this as a 走进社区 walk so wireQuit() sends the arrow back to
     the grid instead of to 词语闪卡's config page — the student came from the rail,
     not from ③, and landing on a config screen they never opened is disorienting.
     ⚠️ NO 贝壳, NO 航海值, NO 航程: this is `mode:"learn"`, and `learn: 0` is the one
     deliberate zero in SAIL_PTS/SHELL_PTS. It stays the only one.
     ⚠️ `pool` is the scene's own target words, not scopedWords(): it is what the end
     screen's 开始测验 hands to startRound, and the round must be about the place the
     student just read — not about whatever ①学习范围 happens to hold. */
  function startScene(s) {
    var lines = sceneLines(s);
    if (!lines.length) return renderScenes();
    var pool = [];
    /* ⚠️ the pool is built from `ask` ONLY, never from lineSubject's text match: it is
       what the end screen hands to startRound for 看句选词, and there the picture must
       be the real target (§11). A word we merely PICTURED on a display-only card has
       not been taught as that line's answer and must not become a question. */
    lines.forEach(function (p) {
      var w = p.ask && wordByText(p.ask);
      if (w && pool.indexOf(w) === -1) pool.push(w);
    });
    state = { grp: s, mode: "learn", cards: "sentence", seq: lines, i: 0, correct: 0,
              missed: [], firstTry: true, pool: pool, scene: s, walk: true };
    runTeardown();
    lines.forEach(function (p) {
      var w = p.ask && wordByText(p.ask), f = p.pic || (w && w.图档);
      if (f) (new Image()).src = "art/xh/" + f + ASSET_V;
    });
    render();
  }

  function renderBadges() {
    view().classList.remove("two-col");
    state = null;
    var met = sailStats().met;
    var got = SAIL_BADGES.filter(sailBadgeGot).length;
    /* ⚠️ NO 回合条 HERE (owner 2026-08-16 晚). It used to hold 「‹ 返回」 plus a
       tag naming this screen; the back moved to the topbar, and the tag was
       already the panel's own title one line further down — the same words
       twice, with an empty strip above them. Screens that KEEP the bar are the
       ones whose bar carries something else: the jetty progress, or 连线's
       scope + pair count. */
    var h = '<div class="xh-board"><div class="beach-head">' +
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
      /* ⚠️ THE WHOLE TILE IS THE BUTTON (§14 nested buttons). It was a <div>, so the
         wall was a picture you could not interrogate — the owner asked for the mountain's
         level of detail, and the detail has to be reachable from somewhere. */
      h += '<button class="sailbadge' + (have ? " got" : "") + '" data-sb="' + esc(b.k) + '">' +
        (b.img
          ? '<img src="art/xh/badges/' + b.img + '.png' + ASSET_V + '" alt="" ' +
            "onerror=\"this.style.display='none'\">"
          : '<span class="sailbadge-todo">' + esc(b.zh.charAt(0)) + '</span>') +
        '<b>' + esc(b.zh) + '</b>' + xhPy(b.zh) + '<span class="xh-en">' + esc(b.en) + '</span>' +
        (have ? '<span class="beach-tag on">已获得</span>'
              : '<span class="sailbadge-bar"><i style="width:' + pct + '%"></i></span>' +
                '<span class="beach-tag">' + met + ' / ' + need + ' 海里</span>') +
        '</button>';
    });
    h += '</div>';
    /* ⚠️ says the wall is tappable. A tile that opens something has to look like it does,
       and at this tier the affordance cannot be left to a hover state — most of these
       students are on a touchscreen where hover does not exist. */
    h += '<div class="xh-log-sub">点一枚徽章，看它要认得几个词语。' +
      '<span class="xh-en">Tap a badge to see what it needs.</span></div>';
    h += '</div>';
    view().innerHTML = h;
    wireQuit();
    Array.prototype.forEach.call(view().querySelectorAll(".sailbadge[data-sb]"), function (el) {
      el.onclick = function () {
        var k = el.getAttribute("data-sb"), hit = null;
        SAIL_BADGES.forEach(function (b) { if (b.k === k) hit = b; });
        if (hit) openSailBadge(hit);
      };
    });
  }

  /* ================= 我的海滩 · 泊位 (SPEC_XH_berth_layout.md) =================
     The dock's 营地. Same mechanism as the campsite in cs.js, with sea names —
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
  /* ---------- 我的背包 · put an owned thing away (owner 2026-08-17) ----------
     ⚠️ NOTHING IS EVER LOST. Putting away clears the SLOT, never `store.owned` — the
     item is still bought, still in the backpack, still free to come back out. If this
     ever deletes from `owned`, a student has paid 45 贝壳 for something a stray tap
     destroyed.
     ⚠️ It also clears that item's saved DRAG POSITION, and that is the feature, not
     tidying up: 整理海滩 is gone from the beach screen (owner asked), and §18m is
     explicit that free placement without a way back is a trap. Put-away-and-place-again
     is now the per-item reset, expressed as something a student already understands.
     The all-at-once reset still exists, one level in, inside the backpack. */
  function putAwayItem(it) {
    if (!it) return;
    if (store.berth[it.slot] === it.k) delete store.berth[it.slot];
    if (store.berthPos) delete store.berthPos[it.k];
    save();
  }
  function itemIsOut(it) { return !!it && store.berth[it.slot] === it.k; }
  function ownedItems() {
    return BERTH_ITEMS.filter(function (it) { return ownsItem(it.k); });
  }
  /* ---------- 自由摆放 (owner 2026-08-17) ----------
     ⚠️ THE BERTH USED TO BE FIVE FIXED HOOKS. The spec chose that deliberately
    （「The camp earned dragging; the dock has not yet」）and the owner overruled it on
     2026-08-17 after trying to drag and finding only Safari's native image ghost:
    「I can't drag and drop the purchased items … it snaps back once I let go」.
     ⚠️ BERTH_SLOTS IS STILL LOAD-BEARING — it is where a newly bought item LANDS, and
     the slot is still what「一个位置只能摆一样」means in the shop. Free placement moves
     the sprite afterwards; it does not turn the shop into a five-of-everything shelf.
     ⚠️ Y IS MEASURED FROM THE TOP here, like the camp's decoPos, while BERTH_SLOTS.by
     is from the bottom. The two conventions meet in exactly one place (beachPosOf),
     on purpose — converting anywhere else is how one of them ends up flipped. */
  var BEACH_BOUNDS = { x0: 4, x1: 96, y0: 26, y1: 96 };
  function beachClamp(p) {
    return { x: Math.min(BEACH_BOUNDS.x1, Math.max(BEACH_BOUNDS.x0, p.x)),
             y: Math.min(BEACH_BOUNDS.y1, Math.max(BEACH_BOUNDS.y0, p.y)) };
  }
  function beachPosOf(slot, key) {
    var saved = store.berthPos && store.berthPos[key];
    return beachClamp(saved || { x: slot.cx, y: 100 - slot.by });
  }
  /* lower on screen draws in front, recomputed live while dragging — the same rule
     the camp uses, so a crate dragged down the sand passes in front of the bell. */
  function beachZ(y) { return 10 + Math.round(y * 4); }
  /* ⚠️ draggable="false" is NOT optional. An <img> is natively draggable and on
     Safari that native drag eats the gesture, which is exactly the symptom the owner
     reported. The matching -webkit-user-drag rule lives on .beach-item in xh.css. */
  function beachSprite(img, x, y, w, extra, key) {
    return '<img class="beach-item' + (extra ? " " + extra : "") + '" draggable="false" ' +
      (key ? 'data-bk="' + esc(key) + '" ' : "") +
      'src="art/xh/' + img + '.png' + ASSET_V + '" alt="" style="left:' + x +
      "%;bottom:" + (100 - y) + "%;width:" + w + "%" + (key ? ";z-index:" + beachZ(y) : "") + '" ' +
      "onerror=\"this.style.display='none'\">";
  }
  function shellIcon() {
    return '<img class="shell-icon" src="art/xh/dock_shell.png' + ASSET_V + '" alt="贝壳" ' +
      "onerror=\"this.replaceWith(document.createTextNode('🐚'))\">";
  }

  /* the boat + whatever is in each berth slot, as one absolutely-positioned layer.
     Shared by 我的海滩 and the menu hero so the two can never drift apart. */
  /* ⚠️ `movable` is now ALWAYS true in practice: 我的海滩 is the only caller since the
     hero stopped compositing berth items (owner 2026-08-17 — percentages resolve against
     a different box there, so a crate parked on sand landed in the sea). The parameter
     stays because the landing page's hero still needs the inert form if it ever wants it,
     and because touch-action:none must NEVER be applied to a non-draggable copy (§18m). */
  function beachSpritesHtml(movable) {
    /* ⚠️ NO BOAT IN THIS SCENE (owner 2026-08-16 evening: 「remove boat from beach
       since it's now reflected on sea map」). The berth sprite used to be the only
       place a bought boat appeared; now it sails the landing sea map and rides the
       round progress bar, so drawing it here as well put a second hull on top of
       the painted stilt house and read as clutter rather than reward.
       The boat is still NAMED on the 我的海滩 tile and is bought/swapped in the shop
       below — this removes the sprite, not the feature. */
    /* ⚠️ `movable` is FALSE for the menu hero. That hero is itself a <button> that
       opens this screen, so a draggable child there would either swallow the tap or
       let a student rearrange the beach from a thumbnail they cannot see properly. */
    var h = "";
    BERTH_SLOTS.forEach(function (sl) {
      var it = itemByKey(store.berth[sl.k]);
      if (!it) return;
      var p = beachPosOf(sl, it.k);
      h += beachSprite(it.img, p.x, p.y, sl.w,
        movable ? "beach-move" : "", movable ? it.k : null);
    });
    return h;
  }

  function renderBeach() {
    view().classList.remove("two-col");
    state = null;
    /* ⚠️ NO 回合条 HERE (owner 2026-08-16 晚). It used to hold 「‹ 返回」 plus a
       tag naming this screen; the back moved to the topbar, and the tag was
       already the panel's own title one line further down — the same words
       twice, with an empty strip above them. Screens that KEEP the bar are the
       ones whose bar carries something else: the jetty progress, or 连线's
       scope + pair count. */
    var h = '<div class="xh-board"><div class="beach-head">' +
      '<div class="xh-berth-title">🏖️ 我的海滩' + xhPy("我的海滩") + '<span class="xh-en">Your berth</span></div>' +
      '<span class="beach-purse">' + shellIcon() + '<b>' + (store.shells || 0) + '</b> 贝壳' + xhPy("贝壳") +
      '<span class="xh-en">shells</span></span></div>';
    h += '<div class="beach-stage" id="beachStage">' +
      '<img class="beach-bg" src="art/xh/dock_bg.png' + ASSET_V + '" alt="" ' +
        "onerror=\"this.style.display='none'\">";
    h += beachSpritesHtml(true);
    h += "</div>";
    h += '<div class="beach-hint">按住摆件可以拖到你喜欢的位置' + xhPy("按住摆件可以拖到你喜欢的位置") +
      '<span class="xh-en">Press and hold an item to drag it anywhere</span></div>';
    /* ⚠️ 整理海滩 IS GONE FROM THIS SCREEN (owner 2026-08-17), replaced by 我的背包.
       ⚠️ §18m's rule that free placement needs a way back STILL HOLDS — it has not been
       dropped, it has moved and grown: 收起 clears one item's position, and 整理位置
       inside the backpack still resets them all. Do NOT put a bare tidy button back
       here; do NOT remove the one in the backpack either.
       ⚠️ Why a backpack at all (owner: 「a mechanism where students can choose to keep
       their items away」): before this, an owned item had NO way off the sand. The shop
       only ever offered 摆上 — swapping was the only way to change the beach, so a
       student who wanted an empty shore could not have one. */
    h += '<div class="beach-acts"><button class="xh-btn" id="beachShop">🛒 海滩小铺' + xhPy("海滩小铺") +
      '<span class="xh-en">shop</span></button>' +
      '<button class="xh-btn" id="beachPack">🎒 我的背包' + xhPy("我的背包") +
      '<span class="xh-en">your backpack</span></button></div></div>';
    view().innerHTML = h;
    wireQuit();
    document.getElementById("beachShop").onclick = renderBeachShop;
    document.getElementById("beachPack").onclick = renderPack;
    wireBeachDrag(document.getElementById("beachStage"));
  }

  /* ================= 🎒 我的背包 (owner 2026-08-17) =========================
     「a mechanism where students can choose to keep their items away, perhaps an
     inventory? I think we had the idea of their backpack - has it materialised?」
     ⚠️ IT HAD NOT. Nothing named 背包 existed anywhere in the repo. The nearest thing
     was the mountain's `store.items` (consumable counts) and `store.itemSlots`, whose
     own picker is still unbuilt (§18). The pier had `store.owned` but NO screen that
     listed it: 海滩小铺 only ever offered 摆上, so the only way to change the beach was
     to swap one thing for another and an empty shore was unreachable.
     ⚠️ THIS IS NOT A SECOND SHOP. It sells nothing and shows no prices — it lists what
     is already owned and offers exactly one action per item, 摆上 or 收起. Prices live
     in 海滩小铺 and must stay there, or a student has two screens to check for the same
     answer.
     ⚠️ IT CARRIES THE WAY BACK that 整理海滩 used to (§18m: free placement without a
     reset is a trap). Two layers, both deliberate: 收起 clears that one item's saved
     position, and 整理位置 at the bottom clears them all. Do NOT delete the second one
     just because the first exists — a student who has dragged five things into one
     corner should not have to put all five away to undo it.
     ⚠️ Boats are NOT here. A boat is never「away」— one is always sailing, it shows on
     the landing sea map, and it is owned GLOBALLY in ws2_profile rather than in
     store.owned (§4: the boat is one of the three things allowed across the waterline).
     Swapping boats stays in the shop where the ladder is visible. */
  function renderPack() {
    view().classList.remove("two-col");
    state = null;
    runTeardown();
    var owned = ownedItems(), out = owned.filter(itemIsOut).length;
    var h = '<div class="xh-board"><div class="beach-head">' +
      '<div class="xh-berth-title">🎒 我的背包' + xhPy("我的背包") +
      '<span class="xh-en">Your backpack</span></div>' +
      '<span class="beach-purse">' + shellIcon() + '<b>' + (store.shells || 0) + '</b> 贝壳' +
      xhPy("贝壳") + '<span class="xh-en">shells</span></span></div>';
    if (!owned.length) {
      /* ⚠️ an empty backpack says where things COME FROM. A bare「你还没有东西」is a
         dead end on the one screen a student reaches by wondering what they own. */
      h += '<div class="xh-log-sub">你还没有摆件。到 海滩小铺 用贝壳买第一件吧。' +
        '<span class="xh-en">Nothing yet. Buy your first piece at 海滩小铺 with shells.</span></div>';
    } else {
      h += '<div class="xh-log-sub">买下的东西都在这里，一件都不会不见。想摆就摆上，' +
        '想收就收起来。<span class="xh-en">Everything you have bought lives here and can never be ' +
        'lost. Put it out on the beach, or keep it in the bag.</span></div>';
      h += '<div class="xh-log-sec">摆在海滩上的' + xhPy("摆在海滩上的") +
        '<span class="xh-en">Out on the beach · ' + out + '</span></div>';
      h += '<div class="beach-shelf">' + packTiles(owned.filter(itemIsOut)) + "</div>";
      var away = owned.filter(function (it) { return !itemIsOut(it); });
      h += '<div class="xh-log-sec">收在背包里的' + xhPy("收在背包里的") +
        '<span class="xh-en">In the bag · ' + away.length + '</span></div>';
      h += away.length
        ? '<div class="beach-shelf">' + packTiles(away) + "</div>"
        : '<div class="xh-log-sub">背包是空的，你买的每一件都摆出来了。' +
          '<span class="xh-en">The bag is empty — everything you own is on the beach.</span></div>';
    }
    /* ⚠️ 整理位置 restores POSITIONS ONLY and the label has to say so, because「整理」
       next to a list of possessions reads like it might throw something away. */
    h += '<div class="beach-acts"><button class="xh-btn" id="packBack">‹ 回海滩' +
      xhPy("回海滩") + '<span class="xh-en">back to the beach</span></button>' +
      (owned.length ? '<button class="xh-btn ghost" id="packTidy">🧹 整理位置' +
        xhPy("整理位置") + '<span class="xh-en">reset where things sit</span></button>' : "") +
      "</div></div>";
    view().innerHTML = h;
    wireQuit();
    document.getElementById("packBack").onclick = renderBeach;
    if (document.getElementById("packTidy")) {
      document.getElementById("packTidy").onclick = function () {
        store.berthPos = {}; save(); sfxOk(); renderPack();
      };
    }
    Array.prototype.forEach.call(view().querySelectorAll("[data-put]"), function (el) {
      el.onclick = function () {
        putAwayItem(itemByKey(el.getAttribute("data-put"))); sfxOk(); renderPack();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll("[data-out]"), function (el) {
      el.onclick = function () {
        var it = itemByKey(el.getAttribute("data-out"));
        if (it && ownsItem(it.k)) { equipItem(it); sfxOk(); renderPack(); }
      };
    });
  }
  /* ⚠️ THE WHOLE TILE IS THE BUTTON (§14 nested buttons, and §18l's shelves): one item,
     one action, and the action is the only thing that differs between the two shelves. */
  function packTiles(list) {
    return list.map(function (it) {
      var isOut = itemIsOut(it), sl = slotByKey(it.slot);
      return '<button class="xh-sitem' + (isOut ? " is-on" : " is-own") + '" data-' +
        (isOut ? "put" : "out") + '="' + it.k + '">' +
        '<span class="xh-sic"><img src="art/xh/' + it.img + '.png' + ASSET_V + '" alt="" ' +
          "onerror=\"this.style.display='none'\"></span>" +
        "<b>" + esc(it.zh) + "</b>" + xhPy(it.zh) +
        '<span class="xh-en">' + esc(it.en) + "</span>" +
        /* naming the slot is what makes 摆上 predictable — the student knows where it
           will land before they tap, and it is also why two things cannot share a spot */
        '<span class="xh-salt">' + esc(sl ? sl.zh : "") + "</span>" +
        '<span class="xh-sstate' + (isOut ? " on" : "") + '">' +
        (isOut ? "收起" + xhPy("收起") + '<span class="xh-en">put it away</span>'
               : "摆上" + xhPy("摆上") + '<span class="xh-en">place it</span>') +
        "</span></button>";
    }).join("");
  }
  function slotByKey(k) {
    for (var i = 0; i < BERTH_SLOTS.length; i++) if (BERTH_SLOTS[i].k === k) return BERTH_SLOTS[i];
    return null;
  }

  /* ---------- 自由摆放 drag (owner 2026-08-17) ----------
     A straight port of cs.js's camp drag, including the two things it learned the
     hard way — repeat them rather than rediscovering them:
     ⚠️ MOVE/UP ARE BOUND TO THE DOCUMENT, NOT THE SPRITE, and wired exactly once.
     setPointerCapture sits in a try/catch, so wherever it silently fails the pointer
     leaves the small sprite after a few pixels and pointermove stops firing: the item
     twitches and sticks. Document-level listening removes the dependency. Once,
     because renderBeach() runs on every visit and per-visit listeners would pile up.
     ⚠️ passive:false, or preventDefault() during a move is ignored and a touch drag
     scrolls the page instead of moving the item. touch-action:none on .beach-move
     (xh.css) is the other half of that.
     ⚠️ No press-and-hold gate: this is decoration, not an answer. */
  var _bDrag = null, _bDragWired = false;
  function beachDragMove(e) {
    if (!_bDrag) return;
    var r = _bDrag.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    e.preventDefault();
    var p = beachClamp({ x: (e.clientX - r.left) / r.width * 100,
                         y: (e.clientY - r.top) / r.height * 100 });
    _bDrag.img.style.left = p.x + "%";
    _bDrag.img.style.bottom = (100 - p.y) + "%";
    _bDrag.img.style.zIndex = beachZ(p.y);
    _bDrag.pos = p; _bDrag.moved = true;
  }
  function beachDragEnd() {
    if (!_bDrag) return;
    _bDrag.img.classList.remove("beach-dragging");
    /* ⚠️ a tap that never moved must NOT rewrite the saved position — otherwise
       every accidental touch pins the item to wherever the finger landed. */
    if (_bDrag.moved && _bDrag.pos) {
      store.berthPos[_bDrag.img.getAttribute("data-bk")] = {
        x: Math.round(_bDrag.pos.x * 10) / 10, y: Math.round(_bDrag.pos.y * 10) / 10
      };
      save();
    }
    _bDrag = null;
  }
  function wireBeachDrag(stage) {
    if (!stage) return;
    _bDrag = null;
    Array.prototype.forEach.call(stage.querySelectorAll(".beach-move"), function (img) {
      img.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        _bDrag = { img: img, stage: stage, moved: false };
        img.classList.add("beach-dragging");
        try { img.setPointerCapture(e.pointerId); } catch (err) {}
      });
      // belt and braces for Safari, which may still attempt a native image drag
      img.addEventListener("dragstart", function (e) { e.preventDefault(); });
    });
    if (_bDragWired) return;
    _bDragWired = true;
    document.addEventListener("pointermove", beachDragMove, { passive: false });
    document.addEventListener("pointerup", beachDragEnd);
    document.addEventListener("pointercancel", beachDragEnd);
  }

  function renderBeachShop() {
    view().classList.remove("two-col");
    state = null;
    /* ⚠️ NO 回合条 HERE (owner 2026-08-16 晚). It used to hold 「‹ 返回」 plus a
       tag naming this screen; the back moved to the topbar, and the tag was
       already the panel's own title one line further down — the same words
       twice, with an empty strip above them. Screens that KEEP the bar are the
       ones whose bar carries something else: the jetty progress, or 连线's
       scope + pair count. */
    var h = '<div class="xh-board"><div class="beach-head">' +
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
    /* ⚠️ ONE TILE, ONE ACTION, and the tile itself IS the button (see .xh-sitem).
       `act` is the only thing that varies between the four states, so a state can
       never end up with two buttons or none. A tile with nothing to do is rendered
       as a <div>, not a disabled button: 正在开 is a fact, not a greyed-out offer. */
    function shopTile(o) {
      var tag = o.act ? "button" : "div";
      var cls = "xh-sitem" + (o.on ? " is-on" : o.owned ? " is-own" : "");
      return "<" + tag + ' class="' + cls + '"' + (o.act || "") +
        (o.act && o.dis ? " disabled" : "") + (o.title ? ' title="' + o.title + '"' : "") + ">" +
        '<span class="xh-sic"><img src="' + o.img + ASSET_V + '" alt="" ' +
          "onerror=\"this.style.display='none'\"></span>" +
        '<b>' + esc(o.zh) + '</b>' + xhPy(o.zh) +
        '<span class="xh-en">' + esc(o.en || "") + '</span>' + o.foot +
        "</" + tag + ">";
    }
    function costHtml(n) { return '<span class="xh-scost">' + shellIcon() + n + "</span>"; }
    function stateHtml(zh, en, on) {
      return '<span class="xh-sstate' + (on ? " on" : "") + '">' + esc(zh) + xhPy(zh) +
        '<span class="xh-en">' + esc(en) + "</span></span>";
    }

    h += '<div class="beach-shelf">';
    var pick = boatPick();
    boatList().forEach(function (b) {
      var owned = ownsBoat(b.t), on = pick === b.t;
      var prev  = b.t > 1 && !ownsBoat(b.t - 1);          // must climb in order
      var afford = (store.shells || 0) >= b.shells;
      h += shopTile({
        img: "art/xh/boat_t" + b.t + "_broadside.png", zh: b.zh, en: b.en, on: on, owned: owned,
        act: on ? "" : owned ? ' data-boatpick="' + b.t + '"' : prev ? "" : ' data-boat="' + b.t + '"',
        dis: !afford,
        title: (!on && !owned && !prev && !afford) ? "贝壳不够，也可以到学段的营地商店用灵露换" : "",
        foot: (on ? stateHtml("正在开", "sailing", 1)
             : owned ? stateHtml("开这艘", "sail this", 0)
             : prev ? '<span class="xh-sstate locked">先买' + esc(boatName(b.t - 1)) + "</span>"
             : costHtml(b.shells)) +
          /* the other price is always shown, so a student who will never grind the
             dock can see the boat is still reachable from their own level */
          (owned ? "" : '<span class="xh-salt">或 ' + b.ling + " 灵露</span>")
      });
    });
    h += '</div>';

    BERTH_SLOTS.forEach(function (sl) {
      h += '<div class="xh-log-sec">' + esc(sl.zh) + xhPy(sl.zh) + '<span class="xh-en">' + esc(sl.en) + '</span></div>';
      h += '<div class="beach-shelf">';
      BERTH_ITEMS.filter(function (it) { return it.slot === sl.k; }).forEach(function (it) {
        var owned = ownsItem(it.k), on = store.berth[sl.k] === it.k;
        var afford = (store.shells || 0) >= it.price;
        h += shopTile({
          img: "art/xh/" + it.img + ".png", zh: it.zh, en: it.en, on: on, owned: owned,
          act: on ? "" : owned ? ' data-eq="' + it.k + '"' : ' data-buy="' + it.k + '"',
          dis: !afford,
          title: (!on && !owned && !afford) ? "贝壳不够，再去答几题" : "",
          foot: on ? stateHtml("摆着", "placed", 1)
              : owned ? stateHtml("摆上", "place it", 0)
              : costHtml(it.price)
        });
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

    /* ⚠️ NO 回合条 HERE (owner 2026-08-16 晚). It used to hold 「‹ 返回」 plus a
       tag naming this screen; the back moved to the topbar, and the tag was
       already the panel's own title one line further down — the same words
       twice, with an empty strip above them. Screens that KEEP the bar are the
       ones whose bar carries something else: the jetty progress, or 连线's
       scope + pair count. */
    var h = '<div class="xh-board"><div class="xh-log-head">' +
      '<div class="xh-berth-title">📋 我的词语表' + xhPy("我的词语表") + '<span class="xh-en">Your word list</span></div>' +
      '<span class="xh-log-sail"><b>' + sailed + "</b> / " + WORDS.length + " 海里" + xhPy("海里") +
      '<span class="xh-en">words met</span></span></div>' +
      /* ⚠️ 读过 N 句 lives HERE AND ONLY HERE (owner 2026-08-17). It is the whole
         visible surface of store.readLines: not a badge, not a leaderboard column,
         not a currency. It sits UNDER the 海里 count and reads plainly as a second,
         separate number — the pier's own version of「never merge the metrics」(§4.1).
         ⚠️ Hidden at zero rather than shown as 0: a student who has never opened
         句子卡 does not need a nought explained to them. */
      /* ⚠️ NO DENOMINATOR. 「N / 90」would be wrong the moment a line is retired from
         the library — two went on 2026-08-16 — because readLines keeps the id and the
         count would read 91/90. It is also the wrong frame: this is a mileage number
         like 航程, not a collection to complete (§12,「集齐」on a library that grows
         is a finish line that runs away). */
      (readLineCount()
        ? '<div class="xh-log-read">读过 <b>' + readLineCount() + "</b> 句" + xhPy("读过") +
          '<span class="xh-en">sentences read on the sentence cards</span></div>'
        : "") +
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
      (shown.length ? "" : " disabled") + '>📖 词语闪卡 · 学这 ' + shown.length + ' 个' + xhPy("词语闪卡") +
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
    /* ⚠️ NO 回合条 HERE (owner 2026-08-16 晚). It used to hold 「‹ 返回」 plus a
       tag naming this screen; the back moved to the topbar, and the tag was
       already the panel's own title one line further down — the same words
       twice, with an empty strip above them. Screens that KEEP the bar are the
       ones whose bar carries something else: the jetty progress, or 连线's
       scope + pair count. */
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
     (cs.js startQuiz,「WEAK-FIRST, RANDOM WITHIN BUCKET」); this is the same shape.
     ⚠️ SHUFFLED WITHIN EACH BUCKET, never curriculum order: otherwise a student can
     answer straight down the handbook without reading the questions.
     ⚠️ Exemptions, both deliberate: `learn` walks its whole set in data order (it is
     a lesson, not a sample — the mountain exempts `flash` for the same reason), and
     distractors() is untouched, because narrowing the decoy pool is what ruins a
     question (same warning as the 子类 note).
     ⚠️ 组词成句 teaches WORD ORDER but buckets on store.done[p.ask], which records
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
        runMaybe(mode);          // 词语闪卡 is never a run; this just clears a stale band
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
      /* ⚠️ 连线's round size IS its difficulty — the board is the round — so it reads
         the 难度 dial where every other mode reads 每次题数. */
      var need = mode === "match" ? DIFF_MATCH[diffIx()] : (store.roundN || ROUND_N);
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
        /* ⚠️ THE SENTENCE MODES RETURN EARLY, so the run has to be set up here as well
           as at the bottom of startRound. 看句选词 and 组词成句 are both allowed on the
           beach (§1.5), and wiring it in only one of the two exits is how one of them
           would silently never surf. */
        runMaybe(mode);
        /* ⚠️ 组词成句 shows no sticker (§8.4), so there is nothing to prewarm for it:
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
      seq = weakFirst(draw, wordUnmet);
      /* 🐛 THE BLACKLIST NEVER REACHED 连线 (owner 2026-08-16 深夜: 「猪肉 牛肉 must
         never appear together — images too similar」). BLACKLIST/mates() lived only
         inside distractors(), which builds MCQ OPTIONS; 连线 does not call it — its
         board IS the round's word list — so the pair it was written to separate has
         been landing on the same board since the mode shipped. Two near-identical red
         slabs on a matching board is not a hard question, it is a coin toss.
         ⚠️ Admitted one at a time, exactly as distractors() does: the rule is about
         the WHOLE set on screen, not about one word against the answer.
         ⚠️ Only for 连线. The question modes show ONE picture and their options are
         already filtered; thinning their round list would drop words for no reason. */
      if (mode === "match") {
        var takenM = {}, keepM = [];
        for (var mi = 0; mi < seq.length && keepM.length < need; mi++) {
          if (takenM[seq[mi].词语]) continue;
          keepM.push(seq[mi]);
          var mm = mates(seq[mi].词语);
          for (var mk in mm) takenM[mk] = true;
        }
        /* ⚠️ if the blacklist has thinned the pool below the board size, run the
           SHORTER board rather than re-admitting a banned pair. A 4-pair board is a
           fine round; 猪肉 beside 牛肉 is not. */
        seq = keepM;
      } else {
        seq = seq.slice(0, Math.min(need, draw.length));
      }
    }
    if (!seq.length) return;
    state = { grp: sub || scopeLabel(), mode: mode, seq: seq, i: 0, correct: 0,
              missed: [], firstTry: true, pool: pool };
    runMaybe(mode);
    // warm the round's sprites: each question swaps the image, and an undecoded
    // sprite shows as an empty frame for a beat — the picture IS the question
    var warm = (mode === "match" || mode === "learn") ? seq : seq.concat(distractors(seq[0], optCount() - 1));
    warm.filter(hasPic).forEach(function (w) { (new Image()).src = "art/xh/" + w.图档 + ASSET_V; });
    render();
  }

  /* jetty progress bar — spec §5.3: a round should feel like a journey, not a
     counter. The boat advances along the jetty as answers land. */
  /* 🐛 `.xh-hint` is `opacity:0`; only `.xh-hint.show` is visible. FOUR handlers
     (看句选词 · 组词成句 ×2 · 组字成词 ×2) assigned innerHTML and never added the class,
     so their feedback lines have been rendered-but-invisible since each shipped —
     which is most of what the owner reported as「no positive feedback」on 2026-08-17.
     ⚠️ Use this helper rather than assigning innerHTML directly, so the next handler
     cannot forget: there is no symptom to notice, the text is simply never seen. */
  function xhHintShow() {
    var el = document.getElementById("xhHint");
    if (el) el.className = "xh-hint show";
    return el || { innerHTML: "" };      // never throw if a screen has no hint slot
  }
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
    /* ⚠️ 沙滩快跑 paints AFTER the mode has drawn, and from a band that lives OUTSIDE
       #xhView — every renderer here assigns innerHTML, which would wipe a child and
       restart its transitions on every question. */
    var out = renderInner();
    if (state && state.surf) runPaint();
    return out;
  }
  function renderInner() {
    view().classList.remove("two-col");     // round screens are a single centred column
    if (state.mode === "learn") {
      if (state.i >= state.seq.length) return renderLearnEnd();
      return renderLearn();
    }
    if (state.i >= state.seq.length) return renderResult();
    if (state.mode === "phrase") return renderPhrase();
    if (state.mode === "sort") return renderSort();
    if (state.mode === "build") return renderBuild();
    if (state.mode === "enmcq") return renderEnMcq();
    if (state.mode === "listen") return renderListen();
    if (state.mode === "type") return renderType();
    if (state.mode === "match") return renderMatch();
    return renderPic();
  }
  /* ---------- THREE LEVELS, ONE CONTROL (owner 2026-08-16 深夜) ----------
     海图 ← 码头首页 ← 活动设定页 ← 一局
     Inside a round the back button lands on THAT ACTIVITY'S setup page, not on the
     pier front page — which is what the owner asked 换一组 to do, and then asked to
     delete 换一组 for duplicating this control. Both are right: the destination was
     the useful one, the second button was not.
     ⚠️ `state && state.seq` is the test for「in a round」, not `state` alone: every
     auxiliary screen (徽章 · 海滩 · 小铺 · 词语表 · 风云榜 · 设定页) sets state = null
     on entry, so they all fall through to 回码头, which is correct for them.
     ⚠️ The label changes with the level and always names the destination — the same
     reason it says 回码头 rather than 返回. */
  function wireQuit() {
    /* ⚠️ A 走进社区 walk goes back to THE GRID, not to a config page. It runs
       mode:"learn", so the ordinary lookup would resolve to 词语闪卡 and drop the
       student on a setup screen they never opened. Three levels, each naming where it
       lands, exactly as §18k requires: 海图 ← 码头 ← 走进社区 ← 一个场景. */
    if (state && state.walk) {
      return setBack(renderScenes, { zh: "走进社区", en: "the neighbourhood" });
    }
    var door = (state && state.seq) ? entryForMode(state.mode) : null;
    if (!door) return setBack(renderMenu);
    var e = entryByKey(door);
    setBack(function () { renderModeConfig(door); }, { zh: e.zh, en: e.short || e.zh });
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
  /* ---------- 答案摆在精灵**旁边**，大字 (owner 2026-08-16 晚) ----------
     ⚠️ It used to land in .xh-hint UNDER the picture, at 22px — the owner's words
     were「让正确的字大字显示在精灵右边，不要在下面放一个小字」. The word is the thing
     being learned; at 22px under a 210px sprite it read as a caption.
     ⚠️ The frame that holds the sprite already ran the full width of the panel
     (`.xh-sprite` was display:block + margin:0 auto), so there was a large empty
     plate to the right of every picture. This puts the answer in it.
     ⚠️ 听音识图 does NOT get this: there the options ARE the pictures and the sprite
     slot does not exist, so its reveal stays a line under the board. */
  function spriteRow(w, cls) {
    return '<div class="xh-qrow">' +
      '<span class="xh-sprite ' + cls + '" id="xhSprite">' + img(w) + "</span>" +
      '<div class="xh-answer" id="xhAnswer"></div></div>';
  }
  function showAnswer(w) {
    var el = document.getElementById("xhAnswer");
    if (!el) return false;
    el.className = "xh-answer show";
    /* 拼音 and 英文 stay GATED — they are annotations on the answer, not the answer.
       ⚠️ Their overrides carry the body.xh-py-on / body.xh-en-on prefix (§18e). */
    el.innerHTML = "<b>" + esc(w.词语) + "</b>" +
      '<span class="xh-py">' + esc(w.拼音) + "</span>" +
      '<span class="xh-en">' + esc(w.英文释义) + "</span>";
    return true;
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
    runNote(false);
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
     4 for 组词成句 (production, same tier as 词海钓鱼). */
  /* ⚠️ `build` is 4 / 2 — PRODUCTION, the same tier as 词海钓鱼 and 组词成句, and §2.6
     names the 贝壳 rate explicitly. Added to BOTH tables in the same edit: the note
     above is there because 看句选词 shipped missing from both and paid nothing for
     days without erroring. */
  var SAIL_PTS = { pic: 2, enmcq: 2, listen: 3, match: 3, type: 4, phrase: 3, sort: 4,
                   build: 4, learn: 0 };
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
  /* ⚠️ `sort` is 2, the same as 词海钓鱼: both are PRODUCTION tasks (you build the
     answer) rather than recognition. `phrase` stays 1 and is not levelled up to
     match it — the two now share the 学以致用 card but they are two SEPARATE cards
     with no mid-round switch, so a student cannot pick the cheaper one and hop.
     ⚠️ If a mid-round switch is ever added, the two rates must be merged FIRST. */
  var SHELL_PTS = { pic: 1, enmcq: 1, listen: 1, match: 1, type: 2, phrase: 1, sort: 2,
                    build: 2, learn: 0 };
  /* ⚠️ ③难度 PAYS IN 贝壳 AND ONLY IN 贝壳 (HANDOFF §3.3). ×1 / ×1.5 / ×2, rounded
     down. It deliberately does NOT touch 航程 or 航海值:
       · 航程 is「do you know this word」, and a word answered on 简单 is known exactly
         as well as one answered on 挑战 (§4.1). Scaling mastery by difficulty would
         quietly penalise the beginners this whole tier exists for.
       · currency is where reaching further should be rewarded, so it goes here.
     ⚠️ Applied AFTER the not-first-try halving, so a corrected answer on 挑战 still
     beats a first-try answer on 简单 at the same base — which is the right ordering:
     the harder board was harder either way. */
  var DIFF_SHELL_MULT = [1, 1.5, 2];
  function awardShells(mode, firstTry) {
    var base = SHELL_PTS[mode] || 0;
    if (!base) return 0;
    var n = firstTry ? base : Math.max(1, Math.round(base * 0.5));
    n = Math.max(1, Math.floor(n * DIFF_SHELL_MULT[diffIx()]));
    store.shells += n;
    return n;
  }

  /* quiet=true：由调用方自己朗读并据此翻页（advanceAfterSpeech）。
     ⚠️ 以前这里读词、调用方紧接着读句子，第二句 cancel() 掉第一句——
     学生听到半个词就被打断。 */
  function noteRight(w, quiet) {
    runNote(true);                          // 沙滩快跑: a skin on this path, never a second one
    if (state.firstTry) state.correct++;
    awardSail(state.mode, state.firstTry);
    awardShells(state.mode, state.firstTry);
    store.done[w.词语] = true;
    save();
    /* ⚠️ AFTER store.done is written, so `met` already counts this word — the badge the
       student just crossed gets today's date, not tomorrow's. Idempotent, so a replayed
       round can never move a date that is already recorded. */
    noteSailBadges();
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
    /* ⚠️ lineSubject, not wordByText(p.ask) — see its own note. On a display-only line
       `p.ask` is undefined and this used to leave the card with no picture and no word,
       which read as a broken card sitting between two normal ones.
       ⚠️ The word it returns is used for the CHIP as well as the picture, so the two can
       never disagree about what the card is showing. */
    var subj = lineSubject(p), w = subj.word, file = subj.file;
    /* ⚠️ the ONLY write of store.readLines. Idempotent by construction (a set keyed
       on the phrase id), so the re-render a 拼音／英文 toggle causes costs nothing.
       ⚠️ store.done is NOT touched here and must never be: 学过了 counts words the
       student has produced an answer for, and looking at a card is not that — the
       word-card branch has said so since 2026-08-15 and this face is no different.
       ⚠️ It is not touched for the matched word either: a picture we chose for the
       student is not an answer the student gave. */
    if (p.id && !store.readLines[p.id]) { store.readLines[p.id] = 1; save(); }
    /* ⚠️ THE SCENE'S OWN BACKDROP, not the pier's (owner 2026-08-17: 「everything in
       走进社区 should use the authentic scene background instead of the pier background」).
       You are standing in the wet market, so the wet market is behind you — the pier
       sand made every place look like the same place.
       ⚠️ Same mechanism 看句选词/组词成句 already use: a .xh-scene-bg layer plus
       `.on-scene` on the panel, which is what raises the panel's own alpha so white
       text stays readable over a photograph (§18a). Do NOT hand-roll a second dimmer
       — the darken/desaturate knob is ONE filter on .xh-scene-bg and lives there so
       ten backdrops of differing brightness stay one adjustment (§18a).
       ⚠️ Keyed on `state.scene`, so ONLY a 走进社区 walk gets it: 词语闪卡 · 句子卡
       draws from whatever ①学习范围 holds and can cross scenes inside one sitting,
       where a backdrop that changed every card would be pure noise. */
    var bg = state.scene ? SCENE_BG[state.scene] : null;
    /* ⚠️ the tag names WHERE THE STUDENT IS. On a 走进社区 walk that is the place —
       「菜市场 · 走进社区」— not「菜市场 · 句子卡」, which would name a screen they never
       opened and is the same mislabel the topbar arrow had to be taught about. */
    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) +
      (state.walk ? " · 走进社区" : " · 句子卡") + "</span></div>" +
      (bg ? '<div class="xh-scene-bg" style="background-image:url(&quot;art/xh/' +
            esc(bg) + '.png' + ASSET_V + '&quot;)"></div>' : "") +
      '<div class="xh-board xh-stage xh-card' + (bg ? " on-scene" : "") + '">' +
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
         拼音 revealed after a 词海钓鱼 miss are the only exceptions. */
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
    /* ⚠️ A 走进社区 walk finishes on ITS OWN wording and its own exits: it is a place
       you visited, not a group you studied, and its way onward is another place.
       ⚠️ 开始测验 IS ONLY OFFERED WHEN IT CAN ACTUALLY RUN. A scene's lines include
       display-only ones with no askable target, and 农场 has four lines total — hand
       startRound a pool that yields nothing and the student presses 出发 on a button
       that does nothing at all, which is the exact silent failure §4.4 exists to
       prevent. So the button appears only if this scene really has askable sentences
       for the words it just taught. */
    var walk = !!state.walk;
    var canTest = isSent && phrasesFor(state.pool || [], "phrase").length > 0;
    /* the walk's last screen stays IN the place it just walked through — stepping
       back onto pier sand at the end reads as having been thrown out of the market */
    var endBg = walk && state.scene ? SCENE_BG[state.scene] : null;
    var h = (endBg ? '<div class="xh-scene-bg" style="background-image:url(&quot;art/xh/' +
              esc(endBg) + '.png' + ASSET_V + '&quot;)"></div>' : "") +
      '<div class="xh-board xh-result' + (endBg ? " on-scene" : "") +
      '"><div class="xh-berth-title">' +
      (walk ? "🏘️ 这个地方读完了" : "📖 这一组看完了") + "</div>" +
      '<div class="xh-score">' + esc(state.grp) + ' · <b>' + state.seq.length + "</b> " +
      (isSent ? "个句子" : "个词语") +
      ' <span class="xh-en">' + (isSent ? "sentences" : "words") +
      (walk ? " in this place" : " in this group") + '</span>' + "</div>" +
      '<div class="xh-sub">' +
      (canTest ? '现在试试看，你记住了几个？<span class="xh-en">Now see how many you remember.</span>'
               : '再去别的地方看看。<span class="xh-en">Try another place.</span>') + "</div>" +
      '<div class="xh-result-btns">' +
      (canTest ? '<button class="xh-btn" id="xhTest">' +
                 (isSent ? "📣 开始测验" : "🖼️ 开始测验") + "</button>" : "") +
      '<button class="xh-btn ghost" id="xhAgain">再看一次' + xhPy("再看一次") +
      '<span class="xh-en">again</span></button>' +
      (walk ? '<button class="xh-btn ghost" id="xhOtherScene">换一个地方' +
              xhPy("换一个地方") + '<span class="xh-en">another place</span></button>' : "") +
      "</div></div>";
    view().innerHTML = h;
    wireQuit();                    // same reason as renderResult
    if (document.getElementById("xhTest")) {
      document.getElementById("xhTest").onclick = function () {
        startRound(state.grp, isSent ? "phrase" : "pic", state.pool);
      };
    }
    /* ⚠️ a walk replays through startScene, not startRound: startRound would re-derive
       the sequence from ①学习范围 and quietly hand back a different set of lines. */
    document.getElementById("xhAgain").onclick = walk
      ? function () { startScene(state.grp); }
      : function () { startRound(state.grp, "learn", state.pool); };
    if (document.getElementById("xhOtherScene")) {
      document.getElementById("xhOtherScene").onclick = renderScenes;
    }
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
      spriteRow(w, "quiet") +
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
        showAnswer(w);
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
    「这支＿＿多少钱？」does narrow the answer to phone-like things. On the mountain
     that would be a giveaway; here it is the entire point of a measure word, and a
     student who reasons from 支 to the answer has just learned 支. Never strip the
     measure word out of the stem to make the question「harder」.
     ⚠️ THE EXAMPLE CHANGED, THE RULE DID NOT (PATCH_03 §5.3, 2026-08-16). This
     comment used to cite「这台…」, but 台 is wrong for a phone and scene_mall-3 was
     corrected to 这支. Left unchanged, the next reader would have taken 台 for a
     rule-protected example and put it back. */
  function phraseBlank(p) {
    /* the blank keeps the measure word and everything else intact */
    return esc(p.zh).replace(esc(p.ask), '<span class="xh-blank">＿＿</span>');
  }
  /* ⚠️ READS THE STEM, NEVER THE ANSWER (§8.7). The target is replaced by 「，」 —
     a comma, so the engine leaves a pause exactly where the blank is — which is the
     same trick cs.js's speakCloze plays on 填空挑战's `__`. Handing p.zh straight to
     speak() here would say the answer out loud before the student has picked. */
  function speakStem(p) { speak(String(p.zh).replace(p.ask, "，")); }
  /* ---------- 组词成句 (HANDOFF_学以致用 §4–§5) ----------
     ⚠️ THE SAME GESTURE AS THE MOUNTAIN'S 组字成词, ONE LEVEL UP: that one is「tap out
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
    /* [{i, t, py}] — `i` is identity, `t` is only what it says, `py` is the vetted
       reading for that block (empty string when this sentence gets no 拼音). */
    var pyOK = segPyOK(p);
    var tiles = p.seg.map(function (t, i) { return { i: i, t: t, py: pyOK ? p.segPy[i] : "" }; });
    var extra = DIFF_SORT[diffIx()];
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
          /* ⚠️ the decoy's reading comes from ITS OWN word row, which always has one —
             they are 词条 by construction. It is still only shown when the SENTENCE
             qualifies, so「has 拼音」can never mark a block out either way. */
          tiles.push({ i: p.seg.length + k, t: o.词语, decoy: true,
                       py: pyOK ? String(o.拼音 || "") : "" });
        });
      }
    }
    /* ⚠️ ONE LAST WHOLE-BOARD SWEEP. The sentence gate above is not sufficient on its
       own: if a single decoy came back without a reading, it would be the one tile with
       no 拼音 on an otherwise annotated board — the leak this whole exercise exists to
       close, rebuilt from the other end. All 148 word rows carry 拼音 today, so this
       never fires; it fires the day one does not, and it fails to「no 拼音 anywhere」
       rather than to「the odd one out is the decoy」. */
    for (var t = 0; t < tiles.length; t++) {
      if (!tiles[t].py) { tiles.forEach(function (x) { x.py = ""; }); break; }
    }
    return shuffle(tiles);
  }
  /* "" when this board gets no 拼音 — the empty string is what makes the gate a
     whole-board decision rather than something each call site re-decides. */
  function tilePy(t) {
    return t && t.py ? '<span class="xh-py">' + esc(t.py) + "</span>" : "";
  }
  function renderSort() {
    var p = state.seq[state.i];
    var bg = SCENE_BG[state.scene || p.scene];
    /* the tray is drawn ONCE per question and cached, exactly as 组字成词 caches its
       chips: re-drawing on any re-render would re-roll the decoys, and the sentence's
       own blocks survive every draw — the 选项重洗＝泄题 trap, one screen over. */
    var key = state.i + "|" + p.id;
    if (state._sortKey !== key) { state._sortKey = key; state._sortTiles = sortTiles(p); }
    var tiles = state._sortTiles;
    var end = String(p.zh || "").match(/[。？！]$/);

    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(p.scene) + " · 组词成句</span></div>" +
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
    /* ⚠️ 拼音 rides the ORDINARY body.xh-py-on gate, NOT .xh-always (backfill §5).
       词语闪卡 is learn-then-test, so its reading is content; 组词成句 is the test, so the
       reading is optional scaffolding and must follow the student's own toggle. */
    tiles.forEach(function (t) {
      h += '<div class="xh-tilewrap"><button class="xh-tile-w" data-i="' + t.i + '">' +
        esc(t.t) + tilePy(t) + "</button>" +
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
        /* ⚠️ innerHTML + re-emit the annotation, NOT textContent (§14「textContent 抹掉
           注解」). A slot is rewritten on every tap; textContent would drop the 拼音 the
           moment a block was placed, so the tray would be annotated and the sentence
           being built would not. */
        s.innerHTML = t ? (esc(t.t) + tilePy(t)) : "";
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
         ⚠️ SCORED AGAINST EVERY LEGAL ANSWER (PATCH_03 §2), and the one with the
         LONGEST matching prefix becomes this check's reference. Locking always to
         `seg` would take a student who is correctly building toward an accepted
         variant and hand back a stretch they had right — more confusing than plain
         all-or-nothing, which is exactly what the patch warns about.
         ⚠️ Compared by TEXT, not by tile index: 我…我… swapped is still correct, and
         that falls out for free because the comparison is against a STRING.
         ⚠️ A wrong answer costs nothing — no 贝壳, no 航程, no 海里 — as everywhere
         else in this tier. And no move-count scoring: that is a puzzle-player's
         metric, not a language learner's. */
      var laid = placed.map(function (ix) { return tileById(ix).t; });
      var built = laid.join("");
      var answers = segAnswers(p);
      var i = 0;
      answers.forEach(function (ans) {
        var n = segPrefixLen(laid, ans);
        if (n > i) i = n;
      });
      if (answers.indexOf(built) !== -1) i = placed.length;
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
        xhHintShow().innerHTML = "✅ " + esc(p.zh) +
          '<button class="xh-ph-tts" id="xhSortSay" title="朗读句子" aria-label="朗读句子">🔊</button>' +
          (p.insight_en ? '<span class="xh-ph-note">' + esc(p.insight_en) + "</span>" : "");
        /* ⚠️ Same change as 看句选词: no longer speech-gated (owner 2026-08-16 晚).
           ⚠️ The 🔊 can only appear HERE, never on the question — this mode's whole
           subject is word order, so reading the line aloud beforehand would hand over
           the answer. The dwell is longer than 看句选词's because the student just
           solved the line and this is the first time they see it whole. */
        document.getElementById("xhSortSay").onclick = function () { speak(p.zh); };
        setTimeout(function () { state.i++; render(); }, p.insight_en ? 3000 : 2200);
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
      xhHintShow().innerHTML = locked
        ? "前 " + locked + " 块对了，后面再想想。" +
          '<span class="xh-en xh-always">First ' + locked + ' in place — keep going.</span>'
        : "第一块就要换一个，再想想。" +
          '<span class="xh-en xh-always">Start with a different word.</span>';
    };
    paint();
  }

  /* ---------- 组字成词 (HANDOFF_XH_沙滩快跑 §2) ----------
     Tap the characters, in order, to build the word in the picture.
     ⚠️ THE LAYOUT IS 组词成句's, DELIBERATELY. Slots on top, tray below, tap to place,
     tap a slot to lift, prefix lock on check. A student who has met either mode knows
     this one, and the pier is not the place to teach a second interaction.
     ⚠️ NO SPEAKER BEFORE THE ANSWER (§8.7). The picture is the question and the word
     is the answer, so a 🔊 anywhere on this screen would simply say it. Per-tile
     speakers are no better: the four readings in order ARE the word. noteRight speaks
     it once the board is solved, which is where it belongs. */
  function renderBuild() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    var target = String(w.词语);
    /* the tray is drawn ONCE per question and cached, exactly as 组词成句 and the
       mountain's 组字成词 cache theirs: a re-render would re-roll the decoys, and the
       word's own characters survive every roll — the 选项重洗＝泄题 trap (§14). */
    var key = state.i + "|" + target;
    if (state._buildKey !== key) { state._buildKey = key; state._buildTiles = buildTiles(w); }
    var tiles = state._buildTiles;

    var h = '<div class="xh-round-bar">' + quitBtn() +
      jetty() + '<span class="xh-block-tag">' + esc(state.grp) + " · 组字成词</span></div>" +
      '<div class="xh-board xh-stage xh-sort xh-build">' +
      (hasPic(w) ? '<img class="xh-ph-pic" src="art/xh/' + esc(w.图档) + ASSET_V + '" alt="" ' +
                   "onerror=\"this.style.display='none'\">" : "") +
      /* ⚠️ the English goes through the GATE, unlike 组词成句's. There p.en IS the
         prompt; here the picture is, so the gloss is a scaffold and a student who has
         switched English off asked for it to be off. */
      '<div class="xh-ph-en xh-en">' + esc(w.英文释义) + "</div>" +
      '<div class="xh-slots" id="xhSlots">';
    for (var s0 = 0; s0 < target.length; s0++) {
      h += '<span class="xh-slot" data-k="' + s0 + '"></span>';
    }
    h += "</div>";
    h += '<div class="xh-tray" id="xhTray">';
    tiles.forEach(function (t) {
      h += '<div class="xh-tilewrap"><button class="xh-tile-w" data-i="' + t.i + '">' +
        esc(t.t) + "</button></div>";
    });
    h += "</div>" +
      '<div class="xh-sort-acts">' +
      '<button class="xh-btn" id="xhBuildGo">检查答案' + xhPy("检查答案") +
      '<span class="xh-en">check</span></button></div>' +
      '<div class="xh-hint" id="xhHint"></div></div>';
    view().innerHTML = h;
    wireQuit();

    var slots = [].slice.call(view().querySelectorAll(".xh-slot"));
    var placed = [], locked = 0, done = false;
    for (var s1 = 0; s1 < target.length; s1++) placed.push(null);

    function tileById(i) {
      for (var k = 0; k < tiles.length; k++) if (tiles[k].i === i) return tiles[k];
      return null;
    }
    function paint() {
      slots.forEach(function (s, k) {
        var t = placed[k] === null ? null : tileById(placed[k]);
        s.textContent = t ? t.t : "";
        s.classList.toggle("filled", !!t);
        s.classList.toggle("lock", k < locked);
      });
      tiles.forEach(function (t) {
        var b = view().querySelector('.xh-tile-w[data-i="' + t.i + '"]');
        if (b && b.parentNode) b.parentNode.classList.toggle("used", placed.indexOf(t.i) !== -1);
      });
      var go = document.getElementById("xhBuildGo");
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
    slots.forEach(function (s, k) { s.onclick = function () { lift(k); }; });

    document.getElementById("xhBuildGo").onclick = function () {
      if (done || placed.indexOf(null) !== -1) return;
      var laid = placed.map(function (ix) { return tileById(ix).t; });
      /* ⚠️ PREFIX LOCK, the same as 组词成句: characters in the right place go green
         and stay; from the first wrong one, everything after it returns to the tray.
         ⚠️ COMPARED AS TEXT, never by tile index — that is what makes the two 妈 tiles
         of 妈妈 interchangeable, which they must be. */
      var n = segPrefixLen(laid, target);
      if (n >= placed.length) {
        done = true; locked = placed.length; paint();
        /* §4.1: a correct answer logs mastery identically to every other mode. This
           calls the ONE path — noteRight — which also pays 航海值 and 贝壳 and speaks
           the finished word. */
        noteRight(w);
        xhHintShow().innerHTML = "✅ " + esc(target) +
          '<span class="xh-py xh-always">' + esc(w.拼音) + "</span>";
        advance(1400);
        return;
      }
      locked = n;
      for (var k = n; k < placed.length; k++) placed[k] = null;
      /* ⚠️ noteWrong flips state.firstTry itself and plays the sound — do NOT clear
         the flag first, or the miss is never recorded against the word.
         ⚠️ no `chosen`: store.stats[].confused is a WORD-level confusion record and
         the thing chosen here is a character. Writing one in would poison the table
         that maintains the distractor blacklist. */
      noteWrong(w, "");
      paint();
      xhHintShow().innerHTML = locked
        ? "前 " + locked + " 个字对了，后面再想想。" +
          '<span class="xh-en xh-always">First ' + locked + " right — keep going.</span>"
        : "第一个字就要换一个，再想想。" +
          '<span class="xh-en xh-always">Start with a different character.</span>';
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
      /* ⚠️ 喇叭是句子的**兄弟节点**，不嵌在句子里（§14），和四座山的 填空挑战 同一个
         位置：题干旁边一颗，学生想听就听。它取代了「答对后自动朗读、读完才翻页」——
         那条规则让想快的学生每题白等最多 5.5 秒（owner 2026-08-16 晚）。 */
      '<div class="xh-ph-line"><div class="xh-ph-zh" id="xhPhZh">' + phraseBlank(p) + "</div>" +
      '<button class="xh-ph-tts" id="xhPhSay" title="朗读句子" aria-label="朗读句子">🔊</button></div>' +
      /* ⚠️ .xh-en — THE GATE, no .xh-always (owner 2026-08-16). This line used to
         carry neither class, so it was not exempted from the English gate, it had
         simply never joined it: the translation stayed on screen with 英文 switched
         off. The 学以致用 exemptions still stand for their own reasons (the 句子卡
         is learn-before-test, and 组词成句's p.en IS the prompt), but here the
         Chinese sentence plus the target's picture already carry the question. */
      '<div class="xh-ph-en xh-en">' + esc(p.en) + "</div>" +
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
        /* 🐛 "right", NOT "ok" (owner 2026-08-17). css/xh.css styles `.xh-opt.right`
           and `.xh-opt.wrong`; this handler was the only one in the file inventing its
           own pair, and **no rule matched either of them** — so the option the student
           tapped changed colour by exactly nothing. Every other mode here already used
           right/wrong (renderEnMcq, renderPic, renderListen). */
        btn.classList.add("right");
        /* ⚠️ a tile-only answer records NO progress: 素食摊 is not a word entry, so
           marking it would invent a 航程 entry for a word that does not exist. */
        if (!p.tileOnly) noteRight(w, true);
        /* 🐛 THE BLANK FILLS ITSELF IN, AT THE TOP, WHERE THE QUESTION IS (owner
           2026-08-17: 「no positive feedback sound and it freezes before progressing」).
           The confirmation used to be a ✅ line in #xhHint — which sits BELOW the four
           options, i.e. nowhere near the option the student just tapped. With the dwell
           at 1400ms (2400 with a culture note), a student looking at their own tap saw
           nothing happen for well over a second and read it as a hang.
           ⚠️ THIS MUST NOT DEPEND ON AUDIO. §9 records that an iPad's side mute switch
           kills web audio while leaving speech working, so「the chime is the feedback」is
           broken by construction on a muted tablet. The sound is now a bonus, not the
           signal.
           ⚠️ Filling the blank is the RIGHT feedback rather than a flourish: the sentence
           完成了 is what the question was asking for, so the student reads the finished
           line — the same reason 看句选词 shows the whole sentence on a correct answer. */
        var zhEl = document.getElementById("xhPhZh");
        if (zhEl) {
          zhEl.innerHTML = esc(p.zh).replace(esc(p.ask),
            '<span class="xh-filled">' + esc(p.ask) + "</span>");
        }
        var hint = xhHintShow();
        /* ⚠️ insight_en is OPTIONAL (PATCH_02 §5). Most sentences have nothing worth
           saying and a forced note would be filler. Blank is the normal state.
           ⚠️ The sentence is no longer repeated here — it is right above, complete. */
        /* 🐛 `.show` IS REQUIRED, and its absence was the main defect behind
           「no positive feedback」: `.xh-hint` is `opacity:0` and only `.xh-hint.show`
           reveals it. This handler set innerHTML and never added the class, so the
           confirmation has been rendered-but-invisible since the mode shipped. The
           modes that do it right (词海钓鱼, 听音识图) all assign the full className. */
        hint.innerHTML = '<span class="xh-ph-ok">✅ 答对了' + xhPy("答对了") +
          '<span class="xh-en">that’s it</span></span>' +
          (p.insight_en ? '<span class="xh-ph-note">' + esc(p.insight_en) + "</span>" : "");
        /* ⚠️ NO LONGER SPEECH-GATED (owner 2026-08-16 晚). This used to be
           advanceAfterSpeech(p.zh, null, 1200, 5500): the whole sentence was read out
           and the page did not turn until it finished, so a student who already knew
           the word waited up to 5.5 seconds per question with nothing to do. The
           reading did not disappear, it moved to the 🔊 beside the sentence, where it
           is the student's choice and is available BEFORE the answer as well.
           ⚠️ Nothing is auto-spoken here now: an utterance started at this point would
           still be playing over the NEXT question's sentence, which reads as the app
           talking about the wrong line.
           The dwell is fixed, and longer when there is a culture note to read. */
        setTimeout(function () { state.i++; render(); }, p.insight_en ? 2400 : 1400);
      } else {
        /* answering wrong costs nothing anywhere in this tier: mark it, stay put */
        btn.classList.add("wrong");     // 🐛 was "no", which no CSS rule matches
        btn.disabled = true;
        if (!p.tileOnly) noteWrong(w, o.词语);
        sfxNo();
      }
    }
    /* before the answer lands it reads the STEM (blank → pause); once the word is
       known the blank is gone, so the same button reads the finished line. */
    document.getElementById("xhPhSay").onclick = function () {
      if (done) speak(p.zh); else speakStem(p);
    };
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
      spriteRow(w, "hidden") +
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
        showAnswer(w);
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

  /* 4.4 词海钓鱼 (拼音打字) — the only mode that trains production rather than recognition.
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
     The student's avatar, drawn from the SAME 6-frame strips 攀山快答 uses.
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
  /* ⚠️ per-sheet size correction, from the ONE table that measures it
     (profile.js SPRITE_SCALE). The sheets are not drawn to a common size — 沙僧 fills
     far less of its cell than 鼠 does — so sizing by the cell alone made the humans
     look half the animals' size (owner 2026-08-17). Written INLINE here, not by
     wireAngler, so the element is never painted once at the wrong size and corrected
     a frame later. */
  function avatarScale() {
    try {
      return (window.WSProfile && window.WSProfile.spriteScale)
        ? window.WSProfile.spriteScale(avatarSpriteId()) : 1;
    } catch (e) { return 1; }
  }
  function anglerHtml(cls) {
    var id = avatarSpriteId();
    if (!id) return "";               // nothing chosen: the scene simply has no angler
    return '<div class="xh-angler ' + (cls || "") + '" id="xhAngler" style="--av-k:' +
      avatarScale() + ";background-image:url(" +
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

  /* ================= 沙滩快跑 (HANDOFF_XH_沙滩快跑 §1) =================
     A PRESENTATION LAYER, and the code says so: nothing below asks a question, marks
     an answer, awards anything or writes to the store. The band is a sibling of
     #xhView that reads `state` after every render and draws what it finds.

     ⚠️ THE RUNNER MOVES, THE BEACH DOES NOT (owner 2026-08-17). The first build
     scrolled the world under a runner pinned at 26%. That is the standard
     endless-runner trick and it read as「the beach furniture slides sideways」rather
     than「I am getting somewhere」. The beach is now one fixed picture and the avatar
     walks across it, so the round's progress IS the distance travelled.

     ⚠️ THE POSITION IS DERIVED FROM state.i, NEVER ACCUMULATED. Advancing a counter
     on each correct answer would drift out of step with the question number the moment
     one mode took a path that does not call the hooks (看句选词's tile-only sentence
     does exactly that), and the runner would then reach the arch a stretch early or
     late. Position is a pure function of「which question are we on」, so it cannot.

     ⚠️ NO requestAnimationFrame AND NO CANVAS. Everything moves in discrete steps on
     CSS transitions, because everything the mode does IS discrete: one question, one
     hop. That also keeps it off the old iPads' compositor, which is the fleet G1/G2
     actually study on.

     ⚠️ THERE IS NO LOSE CONDITION (§1.4). The round ends when the questions run out,
     full stop. Do not add a fail state here later — a zero-background beginner must
     never be cut off mid-activity. The chasing tide that used to say so is gone with
     its art (see the CSS), and nothing replaced it, on purpose.

     ⚠️ ALL GEOMETRY BELOW IS IN PERCENT OF THE BAND, not pixels. The band is fluid
     (clamp(150px,36vh,300px) tall, full page width) and every landing point has to
     stay put when the page reflows — a px runway would put the arch off-screen on a
     phone and halfway across the sand on a Chromebook. */
  var RUN_X0 = 11;                    // % — where the runner starts
  var RUN_X1 = 82;                    // % — where they stand when the last question is answered
  var RUN_ARCH = 86;                  // % — the finish arch; RUN_X1 lands them INSIDE it
  /* ⚠️ HURDLES ARE EVERY k-TH HOP, NOT EVERY HOP. A 20-question round divides the
     runway into 3.4% steps; a marker at each one would be 28px apart on a 800px band
     and the posts are wider than that, so they would fuse into a fence. k keeps the
     count at 4-6 whatever the round length, which means the posts stay full size and
     legibly spaced. A hop that clears nothing still reads as a bounding run. */
  var RUN_HURDLE_MAX = 6;
  /* scenery only — never on the running line. ⚠️ Split from the hurdles on purpose:
     a palm or a moored boat is not something a child hops over, and drawing one at
     the midpoint of a hop would promise a jump the arc cannot sell. */
  var RUN_PROPS = ["palm", "rocks", "driftwood", "sandcastle", "starfish", "crab",
                   "seagull", "basket", "post", "netrack", "boat", "shells"];

  function runBand() { return document.getElementById("xhRunBand"); }
  function runTeardown() {
    var b = runBand();
    if (b) b.parentNode.removeChild(b);
  }
  /* where the runner stands once `i` questions are behind them. ⚠️ ONE function, used
     by both the layout and the paint, so a hurdle can never end up off the line the
     runner actually travels. */
  function runX(i, n) {
    if (n <= 0) return RUN_X0;
    return RUN_X0 + (RUN_X1 - RUN_X0) * (Math.min(i, n) / n);
  }
  /* built once per round, then only nudged — rebuilding it per question would restart
     every CSS transition and the runner would teleport instead of hop. */
  function runBuild(n) {
    runTeardown();
    var b = document.createElement("div");
    b.className = "xh-run";
    b.id = "xhRunBand";
    var track = "", i, k;
    /* hurdles: one at the MIDPOINT of every k-th hop, which is exactly where the jump
       arc peaks (see .xh-angler.xh-runner.hop). ⚠️ Midpoint, not landing point — a
       post on the landing spot is a post the runner lands inside. */
    /* ⚠️ `i < n - 1` — THE LAST STRETCH IS ALWAYS CLEAR. A hurdle on the final hop
       sits inside the finish arch's left post, and the last thing a beginner sees
       should be an open run at the arch, not one more thing in the way. */
    k = Math.max(1, Math.ceil(n / RUN_HURDLE_MAX));
    for (i = 0; i < n - 1; i += k) {
      track += '<img class="xh-run-mark" src="art/xh/run/xh_run_marker.png' + ASSET_V +
        '" alt="" style="left:' + ((runX(i, n) + runX(i + 1, n)) / 2).toFixed(2) + '%">';
    }
    /* scenery scattered along the beach. ⚠️ Placed from a fixed walk, not Math.random
       per paint: a prop that moved between two renders of the SAME question would read
       as the beach glitching. The offsets are arbitrary but stable.
       ⚠️ SET BACK FROM THE RUNNING LINE, not on it: bottom 22-26% puts their feet up
       near the waterline, which at this scale reads as「further away」, and it keeps
       them out from behind the hurdles and the runner. They stop at 70% so nothing
       stands inside the finish arch. */
    for (k = 0; k < 6; k++) {
      var nm = RUN_PROPS[(k * 5 + 3) % RUN_PROPS.length];
      track += '<img class="xh-run-prop" src="art/xh/run/prop_' + nm + '.png' + ASSET_V +
        '" alt="" style="left:' + (5 + k * 13) + "%;" +
        "bottom:" + (22 + ((k * 3) % 5)) + "%\">";
    }
    track += '<img class="xh-run-finish" src="art/xh/run/xh_run_finish.png' + ASSET_V +
      '" alt="" style="left:' + RUN_ARCH + '%">';
    b.innerHTML =
      '<div class="xh-run-sky"></div>' +
      '<div class="xh-run-sea"></div>' +
      '<div class="xh-run-sand"></div>' +
      '<div class="xh-run-track" id="xhRunTrack">' + track + "</div>" +
      /* the avatar rides the SAME 6-frame strip 攀山快答 and the angler use — §1.6:
         zero new art, and any 生肖 or 神兽 added later inherits this mode for free. */
      anglerHtml("xh-runner") +
      '<div class="xh-run-shell" id="xhRunShell"></div>';
    var host = view();
    host.parentNode.insertBefore(b, host);
    b.style.setProperty("--rx", runX(0, n).toFixed(2) + "%");

    state.surf.angler = wireAngler();
    return b;
  }
  /* ⚠️ ONE entry point, called from every exit of startRound. The 题型 gate lives
     here and not only in the modal: a remembered「surf」 must not survive into a mode
     the beach cannot pace, or the student presses 出发 and gets a band with nothing
     moving in it. It also tears down an old band, so switching from a run to a plain
     round in the same session leaves nothing behind. */
  function runMaybe(mode) {
    runTeardown();
    if (store.runMode === "surf" && runAllowed(mode) && state && state.seq) {
      state.surf = { angler: null };
      runBuild(state.seq.length);
    }
  }
  function runPaint() {
    var b = runBand() || runBuild(state.seq.length);
    b.style.setProperty("--rx", runX(state.i, state.seq.length).toFixed(2) + "%");
  }
  /* called from noteRight / noteWrong — the ONE answer path (§4.2), which is why the
     runner needs no hooks of its own inside any mode. */
  function runNote(ok) {
    if (!state || !state.surf) return;
    var a = state.surf.angler;
    var el = document.getElementById("xhAngler");
    if (ok) {
      /* ⚠️ THE STEP IS TAKEN HERE, NOT ON THE NEXT render(). runPaint only runs when
         the next question draws, which is a reveal delay later (1400-3000ms) — the
         arc would peak over the hurdle and the runner would still slide sideways long
         after landing. So the answer path moves them and render() re-asserts the same
         value, which is why runX is a pure function of (i, n): calling it twice for
         the same answer cannot disagree with itself. */
      var b = runBand();
      if (b) b.style.setProperty("--rx", runX(state.i + 1, state.seq.length).toFixed(2) + "%");
      /* the jump — 攀山快答's ledge hop, sideways. ⚠️ The `left` move itself is
         driven by runPaint on the NEXT render, so all this does is the pose and the
         arc; the two share the same .62s so they land together. Frames 3-4 are the
         climb pair, which is the sheet's only airborne pose.
         ⚠️ setInterval/setTimeout, not rAF — four poses over 620ms needs no better
         clock, and rAF is exactly what does not run when the tab is backgrounded
         mid-round. */
      if (el) { el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop"); }
      if (a) {
        a.frame(1);                                            // push off
        setTimeout(function () { a.frame(3); }, 110);           // airborne
        setTimeout(function () { a.frame(4); }, 330);
        setTimeout(function () {
          a.frame(0);
          if (el) el.classList.remove("hop");
        }, 640);
      }
      runShell();
    } else if (a) {
      /* the stumble. ⚠️ Costs NOTHING — no lost ground, no lost 贝壳, no lost round.
         It is a face, not a penalty (§1.4). */
      a.frame(3);
      if (el) {
        el.classList.remove("trip"); void el.offsetWidth; el.classList.add("trip");
      }
      setTimeout(function () { a.frame(0); if (el) el.classList.remove("trip"); }, 700);
    }
  }
  /* the 贝壳 pickup — four frames of an even 4-cell strip, stepped by hand for the
     same reason as above. It is decoration: the shells were already banked by
     awardShells before this ever runs. */
  function runShell() {
    var el = document.getElementById("xhRunShell");
    if (!el) return;
    el.classList.add("on");
    var i = 0;
    var t = setInterval(function () {
      i++;
      el.style.backgroundPositionX = (i * 33.333) + "%";
      if (i >= 3) {
        clearInterval(t);
        setTimeout(function () { el.classList.remove("on"); el.style.backgroundPositionX = "0%"; }, 180);
      }
    }, 130);
  }

  function renderType() {
    var w = state.seq[state.i];
    stat(w).shown++; save();
    state.firstTry = true;
    /* 词海钓鱼 (addendum §5) — a fishing FRAME on the typing mode, not a new mode.
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
        /* ⚠️ THE CHARACTERS RIDE WITH THE PICTURE (owner 2026-08-17:「we need the huge
           characters to be shown alongside the picture for the players to recognise
           with both, right now sometimes it's hard to just recognise using picture」).
           A drawing of 摊位 and a drawing of 菜市场 are not far apart, and the student
           was being asked to type a reading for a word they had to guess first.
           ⚠️ THIS LEAKS NOTHING. The answer here is the PINYIN; 汉字 are the question.
           Reading characters aloud in your head IS the skill this mode tests, so
           putting them on screen makes the task the intended one instead of a
           picture-guess with a spelling test bolted on.
           ⚠️ NO 拼音 ON THIS LABEL, EVER — not gated, not .xh-always, not a <ruby>.
           The pinyin IS the answer (§4.4 reveals it only after a miss), so a gloss
           here would hand it over. That is also why the 🔊 stays behind `said`:
           characters do not give the reading away, but the voice does.
           ⚠️ 数字 has no 图档, so img() returns the Arabic numeral — the pairing
           becomes 3 alongside 三, which is exactly the right question for that group. */
        '<button class="xh-catch" id="xhSprite" title="答对或看过拼音后可以点图听读音">' +
          img(w) + '<span class="xh-catch-word">' + esc(w.词语) + "</span></button>" +
      "</div>" +
      '<div class="xh-typerow">' +
      '<input class="xh-input" id="xhIn" type="text" autocomplete="off" autocapitalize="off" ' +
      'autocorrect="off" spellcheck="false" placeholder="用拼音打出来 · type the pinyin">' +
      '<button class="xh-btn" id="xhGo">收线' + xhPy("收线") +
      '<span class="xh-en">reel it in</span></button></div>' +
      '<div class="xh-hint" id="xhHint"></div></div>';
    wireQuit();
    /* ⚠️ 词海钓鱼 is the one mode with no text option to hang the 🔊 on, and it is
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
       · how many pairs are on the board follows ③难度 (DIFF_MATCH),
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
    /* which pairs have already been paid for. ⚠️ Needed because 连线 grades a WHOLE
       BOARD and the student may press 检查答案 several times: without it, a pair
       joined on the second pass earns nothing at all, while every other mode on the
       pier pays a corrected answer at half rate through noteRight. */
    var paid = {};

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
      /* 🐛 连线 HAS BEEN PAYING NO 贝壳 SINCE IT SHIPPED (found 2026-08-16 while
         checking §4.2 of the 沙滩快跑 handoff — 「verify mastery logging is unified
         before adding the run」). This is the ONE mode that never called noteRight:
         it grades a whole board at once, so it wrote store.done and awarded 航海值
         inline — and awardShells was simply never written into that path. SHELL_PTS
         has always had `match: 1`; nothing was missing from the table, so the check
         that caught the identical 看句选词 bug (§18g) could not see this one.
         ⚠️ THE LESSON IS NOT「add the missing call」, it is that a second write path
         is where these hide. Every other mode reaches progress through noteRight;
         this one is the exception §4.2 warns about, and it is now at least paying
         through the same two award functions in the same order. */
      links.forEach(function (L) {
        L.ok = L.pic === L.word;
        if (L.ok) {
          right2++;
          if (!paid[L.pic]) {
            paid[L.pic] = 1;
            store.done[L.pic] = true;
            awardSail("match", !graded);      // full on the first check, half after
            awardShells("match", !graded);
          }
        } else wrongLinks.push(L);
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
    /* ⚠️ 换一组 IS GONE (owner 2026-08-16 深夜: 「和 回码头 走同一条路，那就删掉」).
       It was a second way off this screen sitting beside the topbar's, which is the
       exact duplication the whole 对齐山上 pass removed one screen at a time. What it
       did that was useful — landing on the activity's setup page rather than the pier
       front page — moved onto the back button itself (see wireQuit).
       ⚠️ Do not put a second exit back here. 再来一次 is not one: it stays in the round. */
    h += '<div class="xh-result-btns"><button class="xh-btn" id="xhAgain">再来一次' +
      xhPy("再来一次") + '<span class="xh-en">again</span></button></div></div>';
    view().innerHTML = h;
    /* ⚠️ explicit, and load-bearing now that 换一组 is gone: this IS the way off the
       result screen, and it lands on the activity's setup page (see wireQuit). */
    wireQuit();
    document.getElementById("xhAgain").onclick = function () { startRound(state.grp, null, state.pool); };
    Array.prototype.forEach.call(view().querySelectorAll(".xh-review-item"), function (el) {
      el.onclick = function () { speak(el.getAttribute("data-w")); };
    });
  }

  /* ---------- boot ---------- */
  applyAids();     // before the first paint, so neither aid flashes in or out
  migrateBoat();   // legacy 3-tier store.boat -> the global 4-tier family
  renderTop();     // topbar works even if the word list never arrives
  ensureFab();     // ...and so does 反馈: a student whose word list failed to load
                   // is exactly the student with something to report

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
      /* ⚠️ registered AFTER the word list lands. profile.js reads the published order
         itself, so this hook needs no WORDS — but the panel can be opened the moment the
         page paints, and a provider whose commit ran against an empty store would report
         「+0」on a perfectly good code. */
      registerCode();
      renderMenu();
    })
    .catch(function () {
      view().innerHTML = '<div class="xh-board xh-err">词语资料加载失败，请检查网络后重新整理页面。<br>' +
        '<span class="xh-en">Could not load the word list. Please refresh.</span></div>';
    });
})();
