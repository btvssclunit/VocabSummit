/* js/search.js — 通用搜索 · 五站词语查询
   (DESIGN_迭代规划_码头生活空间与传声筒_20260816.md §3.3)

   Scope is LOCKED by the owner: 出发码头 + the four mountains (G1 / G2 / G3 /
   HCL). Any student at any station can look up any word at any other station.

   ⚠️⚠️ THIS DOES NOT BREAK THE WATERLINE — and the reason must stay written down,
   because「顺手加个跳转」is exactly how it would get broken later.

   The waterline seals PROGRESS AND CURRENCY (ws2_*, 灵露, 历练值, 海拔 on one
   side; ws_xh, 贝壳, 航程, 航海值 on the other). It has never sealed the WORDS
   THEMSELVES. So this module is allowed to read every station's vocabulary, and
   is forbidden from doing anything else:

     · READ ONLY. It never writes localStorage, never calls save(), never
       touches store on either side.
     · It awards NOTHING: no 历练值, no 灵露, no 贝壳, no 航程, no mastery.
     · A result is a card, NOT a door. Tapping one speaks the word and nothing
       else. It must never start an activity, jump to another station, or open
       a mode. The moment a result becomes navigable, a dock student can reach
       mountain scoring and the seal is gone.

   ⚠️ WHY THIS IS ITS OWN FILE, not a function in cs.js or xh.js: XH_index.html
   deliberately never loads cs.css/cs.js, and index.html never loads cs.js
   either. This is the only module besides profile.js that all six pages share,
   so the search exists exactly once instead of twice.

   ⚠️ NO TTS STACK OF ITS OWN. speak() in cs.js and in xh.js each encode
   hard-won device lessons (voice scoring so eSpeak loses, cancel-then-50ms for
   ChromeOS, the iOS gesture primer). A third copy would rot. The host page
   passes its own speak function to open(); where none is passed — the landing
   page loads no TTS at all — the speaker buttons are simply not rendered. */

(function () {
  "use strict";

  /* Same trick cs.js/arena.js/xh.js use: read our own ?v= off the script tag so
     the index can never be served stale beside new code. Falls back to no query,
     which is just the pre-cache-bust behaviour and can never break a load. */
  var ASSET_V = (function () {
    try {
      var s = document.currentScript && document.currentScript.src || "";
      var m = s.match(/\?v=[^&]*/);
      return m ? m[0] : "";
    } catch (e) { return ""; }
  })();

  /* Dock first, then the four mountains. ⚠️ This is the DEFAULT ORDER, not a
     filter the student sets (§3.3): a dock beginner searching 水 must reach
     their own 148 words before 3,741 secondary-school ones, or the feature is
     useless to precisely the learner it was built for. */
  var STATIONS = ["xh", "g1", "g2", "g3", "hcl"];
  var STATION_LABEL = {
    xh:  "出发码头",
    g1:  "词星大冒险 · G1",
    g2:  "词将竞技场 · G2",
    g3:  "词王淬炼坊 · G3",
    hcl: "词圣鸿文苑 · 高华"
  };

  var PER_STATION = 25;        // cap per group; the overflow is always reported

  var _index = null;           // null until the first keystroke
  var _loading = null;         // in-flight promise, so two keystrokes fetch once
  var _failed = false;
  var _speak = null;           // host-supplied; absent = render no speakers
  var _el = null;              // the overlay, while open

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Toneless pinyin, matching tonelessPy() in xh.js and cs.js: NFD then drop
     the combining marks, fold ü/v to u, drop spaces, lowercase. ⚠️ Deliberately
     toneless — a student who cannot yet type tone marks is exactly the student
     who most needs to search. */
  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[üv]/g, "u").replace(/\s+/g, "").toLowerCase();
  }

  function loadIndex() {
    if (_index) return Promise.resolve(_index);
    if (_loading) return _loading;
    _loading = fetch("data/search_index.json" + ASSET_V)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (doc) {
        var words = (doc && doc.words) || [];
        /* Precompute the two normalised keys ONCE at load, not per keystroke:
           2,095 entries × NFD normalisation on every character typed is real
           work on a managed Chromebook. */
        words.forEach(function (rec) {
          rec._p = norm(rec.p);
          rec._e = String(rec.en || "").toLowerCase();
        });
        _index = words;
        return _index;
      })
      .catch(function (e) {
        _failed = true;
        _loading = null;
        throw e;
      });
    return _loading;
  }

  /* Three-way match: 汉字 (substring), toneless pinyin, English. */
  function search(q) {
    var raw = q.trim();
    if (!raw || !_index) return null;
    var np = norm(raw), lo = raw.toLowerCase(), hits = [];
    for (var i = 0; i < _index.length; i++) {
      var r = _index[i], score = -1;
      if (r.w === raw) score = 0;                            // exact 词语
      else if (r.w.indexOf(raw) !== -1) score = 1;           // 词语 contains
      else if (np && r._p === np) score = 2;                 // exact pinyin
      else if (np && r._p.indexOf(np) === 0) score = 3;      // pinyin prefix
      else if (np && r._p.indexOf(np) !== -1) score = 4;      // pinyin contains
      else if (r._e.indexOf(lo) !== -1) score = 5;           // English contains
      if (score >= 0) hits.push({ r: r, s: score });
    }
    hits.sort(function (a, b) { return a.s - b.s || a.r.w.length - b.r.w.length; });

    /* Group by station. One record can appear under several stations, which is
       correct: 水 really is taught at the dock AND on three mountains, and a
       student wants to see that. */
    var by = {};
    STATIONS.forEach(function (k) { by[k] = []; });
    hits.forEach(function (h) {
      (h.r.src || []).forEach(function (k) { if (by[k]) by[k].push(h.r); });
    });
    return { by: by, total: hits.length };
  }

  function rowHtml(rec, station) {
    /* A dock word carries its sprite, so the row is the 词语表 row with its
       picture. A mountain word has none and degrades to a plain text row —
       specified in §3.3, and the same graceful-degrade habit as everywhere else
       in this repo: onerror hides the image rather than showing a broken icon. */
    var pic = (station === "xh" && rec.im)
      ? '<img class="wss-pic" src="art/xh/' + esc(rec.im) + ASSET_V + '" alt="" ' +
        'onerror="this.style.display=&quot;none&quot;">'
      : "";
    /* ⚠️ Mountain rows show 词语 + 拼音 + 英文 ONLY. No 释义, no 例句, no unit.
       That keeps every row the same height and keeps secondary-school content
       from pouring into a beginners' interface. */
    var chips = "";
    if (station === "xh" && rec.g) {
      chips = '<span class="wss-chip">' + esc(rec.g) + "</span>";
    }
    var spk = _speak
      ? '<button class="wss-spk" data-w="' + esc(rec.w) + '" aria-label="朗读">🔊</button>'
      : "";
    return '<div class="wss-row">' + pic +
      '<div class="wss-txt"><div class="wss-w"><b>' + esc(rec.w) + "</b>" +
      '<span class="wss-py">' + esc(rec.p) + "</span>" + chips + "</div>" +
      '<div class="wss-en">' + esc(rec.en) + "</div></div>" + spk + "</div>";
  }

  function paint(q) {
    var box = _el && _el.querySelector("#wssResults");
    if (!box) return;
    if (!q.trim()) {
      box.innerHTML = '<div class="wss-hint">输入汉字、拼音或英文都可以。' +
        '拼音不用打声调。<span class="wss-hint-en">Type Chinese, pinyin (no tone marks) ' +
        "or English.</span></div>";
      return;
    }
    if (_failed) {
      box.innerHTML = '<div class="wss-hint">词语索引加载失败，请检查网络后重试。</div>';
      return;
    }
    if (!_index) { box.innerHTML = '<div class="wss-hint">正在加载词语索引…</div>'; return; }

    var res = search(q);
    if (!res || !res.total) {
      box.innerHTML = '<div class="wss-hint">没有找到「' + esc(q.trim()) + '」。' +
        '换个写法试试，例如只打一个字。</div>';
      return;
    }
    var h = "";
    STATIONS.forEach(function (k) {
      var list = res.by[k];
      if (!list.length) return;
      var show = list.slice(0, PER_STATION);
      h += '<div class="wss-grp"><div class="wss-grp-h">' + esc(STATION_LABEL[k]) +
        '<span class="wss-grp-n">' + list.length + " 个</span></div>";
      h += show.map(function (r) { return rowHtml(r, k); }).join("");
      /* No silent truncation: if the cap bit, say so rather than letting the
         list look complete. */
      if (list.length > show.length) {
        h += '<div class="wss-more">还有 ' + (list.length - show.length) +
          " 个，请把搜索词打得更完整一些。</div>";
      }
      h += "</div>";
    });
    box.innerHTML = h;

    if (_speak) {
      Array.prototype.forEach.call(box.querySelectorAll(".wss-spk"), function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          /* ⚠️ HANZI ONLY, never the pinyin string — rule #1 of the TTS section
             in CLAUDE.md. A pinyin string is read as toneless English. */
          _speak(b.getAttribute("data-w"));
        };
      });
    }
  }

  function close() {
    if (!_el) return;
    if (_el.parentNode) _el.parentNode.removeChild(_el);
    _el = null;
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) { if (e.key === "Escape") close(); }

  /* open({ speak })  — speak is optional; omit it and no speaker buttons render. */
  function open(opts) {
    opts = opts || {};
    _speak = typeof opts.speak === "function" ? opts.speak : null;
    close();

    _el = document.createElement("div");
    _el.className = "wss-overlay";
    _el.innerHTML =
      '<div class="wss-card" role="dialog" aria-label="词语搜索">' +
        '<div class="wss-head">' +
          '<div class="wss-title">🔎 查词语<span class="wss-sub">' +
            "码头和四座山的词都能查" + "</span></div>" +
          '<button class="wss-x" id="wssClose" aria-label="关闭">✕</button>' +
        "</div>" +
        '<input type="text" id="wssInput" class="wss-input" autocomplete="off" ' +
          'placeholder="汉字 · pinyin · English">' +
        '<div class="wss-results" id="wssResults"></div>' +
      "</div>";
    document.body.appendChild(_el);

    _el.addEventListener("click", function (e) { if (e.target === _el) close(); });
    _el.querySelector("#wssClose").onclick = close;
    document.addEventListener("keydown", onKey);

    var input = _el.querySelector("#wssInput");
    paint("");
    input.oninput = function () {
      var q = input.value;
      /* ⚠️ LAZY: the index is fetched on the FIRST KEYSTROKE, never at page
         load (§3.3). 174 KB must not sit in the critical path of a beginners'
         page on school wifi. */
      if (!_index && !_failed) {
        paint(q);                                   // shows 正在加载…
        loadIndex().then(function () {
          if (_el && _el.querySelector("#wssInput") === input) paint(input.value);
        }).catch(function () {
          if (_el) paint(input.value);
        });
        return;
      }
      paint(q);
    };
    /* Focus last: on iPad, focusing before the node is laid out can leave the
       keyboard covering the results. */
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);
  }

  window.WSSearch = { open: open, close: close };
})();
