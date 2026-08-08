/* Word Summit · 词语宇宙 · shared app engine (v0.1 test build, no login)
   Loads ../data/{stream}.json, offers unit scoping and four study modes.
   Progress is stored in localStorage only; Firebase layer comes later. */
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

  var DATA = null;      // raw json
  var WORDS = [];       // flattened entries with level/unit/component
  var UNIT_LIST = [];   // [{key, level, unit, count}]
  var scope = null;     // Set of unit keys
  var app = document.getElementById("app");

  /* ---------- tiny helpers ---------- */
  function h(html) { var d = document.createElement("div"); d.innerHTML = html; return d; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function unitKey(w) { return w.level + "·" + w.unit; }

  /* ---------- TTS (ChromeOS quirk: voices load async, retry once) ---------- */
  var voices = [];
  function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
  if (window.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  function speak(text) {
    if (!window.speechSynthesis) return;
    var go = function () {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN"; u.rate = 0.9;
      var v = voices.filter(function (v) { return v.lang && v.lang.indexOf("zh") === 0; })[0];
      if (v) u.voice = v;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    };
    if (!voices.length) { loadVoices(); setTimeout(go, 200); } else { go(); }
  }

  /* ---------- local stats (test build only) ---------- */
  var STATS_KEY = "ws_" + STREAM + "_stats";
  function getStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch (e) { return {}; }
  }
  function bump(mode, correct) {
    var s = getStats();
    if (!s[mode]) s[mode] = { a: 0, c: 0 };
    s[mode].a += 1; if (correct) s[mode].c += 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  }
  function totals() {
    var s = getStats(), a = 0, c = 0;
    Object.keys(s).forEach(function (k) { a += s[k].a; c += s[k].c; });
    return { a: a, c: c };
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
  function view() { return document.getElementById("view"); }

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
    var html = miniHorizon();

    html += '<div class="section-label">复习范围 · 可多选</div><div class="card" id="scopeCard">';
    var byLevel = {};
    UNIT_LIST.forEach(function (u) { (byLevel[u.level] = byLevel[u.level] || []).push(u); });
    Object.keys(byLevel).forEach(function (lv) {
      html += '<div class="scope-level">' + lv + '</div><div class="units">';
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

    html += '<div class="section-label">今日路线 · 选择你的营地</div>' +
      camp("flash", "📖", "词语闪卡", "看词认义，点读发音") +
      camp("cloze", "✍️", "填空挑战", "读句子，打出正确词语") +
      camp("zhmcq", "🔎", "华文解释", "看释义，选出词语") +
      camp("enmcq", "🌐", "英文翻译", "看英译，选出词语");

    html += '<div class="harbour">' +
      '<div><b>' + t.c + '</b><span>累计答对</span></div>' +
      '<div><b>' + t.a + '</b><span>累计答题</span></div>' +
      '<div><b>' + (t.a ? Math.round(100 * t.c / t.a) + "%" : "–") + '</b><span>正确率</span></div></div>' +
      '<div style="text-align:center;font-size:10.5px;color:#DCEAF4;text-shadow:0 1px 6px rgba(23,58,90,.5);margin-top:12px">测试版：进度仅保存在此设备，登入系统与排行榜稍后加入。</div>';

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
    Array.prototype.forEach.call(view().querySelectorAll(".camp[data-mode]"), function (btn) {
      btn.onclick = function () {
        if (!scopedWords().length) { alert("请先选择至少一个单元。"); return; }
        startMode(btn.getAttribute("data-mode"));
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

  /* ---------- mode runner ---------- */
  function startMode(mode) {
    var pool = scopedWords();
    var seq = shuffle(pool);
    if (mode !== "flash") seq = seq.slice(0, Math.min(QUIZ_LEN, seq.length));
    var state = { mode: mode, seq: seq, i: 0, correct: 0, revealed: false };
    renderStep(state);
  }

  function header(state, label) {
    var total = state.seq.length;
    return '<div class="progress-line"><span>' + label + '</span><b>' +
      (state.i + 1) + ' / ' + total + '</b></div>';
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
        '<button class="tts-btn" id="tts">🔊 点读</button>' +
        '<div class="hinttap">点击卡片查看释义</div>';
    } else {
      inner = '<div class="w" style="font-size:30px">' + esc(w.w) + '</div>' +
        '<div class="py" style="font-size:13px">' + esc(w.py) + '</div>' +
        (w.pos ? '<span class="pos">' + esc(w.pos) + '</span>' : "") +
        '<div class="zh" style="margin-top:10px">' + esc(w.zh) + '</div>' +
        '<div class="en">' + esc(w.en) + '</div>' +
        (w.ex ? '<div class="ex">' + esc(w.ex).replace(/__/g, "＿＿") + '</div>' : "") +
        '<button class="tts-btn" id="tts">🔊 点读</button>';
    }
    view().innerHTML = header(state, "词语闪卡 · " + esc(w.level) + " " + esc(w.unit)) +
      '<div class="flashcard" id="fc">' + inner + '</div>' +
      '<div class="nav-row">' +
      '<button class="nav-btn" id="prev">‹ 上一张</button>' +
      '<button class="nav-btn primary" id="next">下一张 ›</button></div>';

    document.getElementById("fc").onclick = function (e) {
      if (e.target.id === "tts") return;
      state.revealed = !state.revealed; renderFlash(state);
    };
    document.getElementById("tts").onclick = function (e) { e.stopPropagation(); speak(w.w); };
    document.getElementById("next").onclick = function () {
      state.i = (state.i + 1) % state.seq.length; state.revealed = false; renderFlash(state);
    };
    document.getElementById("prev").onclick = function () {
      state.i = (state.i - 1 + state.seq.length) % state.seq.length; state.revealed = false; renderFlash(state);
    };
  }

  /* ---------- cloze ---------- */
  function renderCloze(state) {
    var w = state.seq[state.i];
    var sentence = w.cloze && w.cloze.indexOf("__") !== -1 ? w.cloze : (w.w + "：" + w.zh);
    var qtext = esc(sentence).replace(/_{2,}/g, "<u></u>");
    view().innerHTML = header(state, "填空挑战") +
      '<div class="q-card"><span class="q-tag">读句子，打出空格里的词语</span>' +
      '<div class="q-text">' + qtext + '</div></div>' +
      '<div class="answer-row">' +
      '<input class="answer-input" id="ans" autocomplete="off" placeholder="输入词语…">' +
      '<button class="check-btn" id="chk">检查</button></div>' +
      '<button class="hint-btn" id="hint">提示：显示拼音</button>' +
      '<div class="feedback" id="fb"></div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›</button></div>';

    var ans = document.getElementById("ans");
    var done = false;
    ans.focus();
    document.getElementById("hint").onclick = function () {
      this.textContent = "拼音：" + w.py;
    };
    function submit() {
      if (done) return;
      var val = ans.value.trim();
      if (!val) return;
      var fb = document.getElementById("fb");
      if (val === w.w) {
        done = true; state.correct++; bump("cloze", true);
        fb.className = "feedback ok";
        fb.innerHTML = "✔ 正确！<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
        finish();
      } else {
        ans.classList.remove("shake"); void ans.offsetWidth; ans.classList.add("shake");
        if (!ans.dataset.tried) { ans.dataset.tried = "1"; return; }
        done = true; bump("cloze", false);
        fb.className = "feedback bad";
        fb.innerHTML = "✘ 正确答案：<b>" + esc(w.w) + "</b>（" + esc(w.py) + "）" + esc(w.zh);
        finish();
      }
    }
    function finish() {
      document.getElementById("nextRow").style.display = "flex";
      document.getElementById("next").onclick = function () { state.i++; renderStep(state); };
      document.getElementById("next").focus();
    }
    document.getElementById("chk").onclick = submit;
    ans.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }

  /* ---------- MCQ (华文解释 / 英文翻译) ---------- */
  function renderMcq(state) {
    var w = state.seq[state.i];
    var isZh = state.mode === "zhmcq";
    var prompt = isZh ? w.zh : w.en;
    var opts = shuffle([w].concat(distractorsFor(w, scopedWords(), 3)));
    view().innerHTML = header(state, isZh ? "华文解释" : "英文翻译") +
      '<div class="q-card"><span class="q-tag">' + (isZh ? "看释义，选出词语" : "看英文，选出词语") + '</span>' +
      '<div class="q-text">' + esc(prompt) + '</div></div>' +
      '<div class="opts" id="opts">' +
      opts.map(function (o, idx) {
        return '<button class="opt" data-i="' + idx + '">' + esc(o.w) + '</button>';
      }).join("") + '</div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›</button></div>';

    var locked = false;
    Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
      btn.onclick = function () {
        if (locked) return; locked = true;
        var chosen = opts[parseInt(btn.getAttribute("data-i"), 10)];
        var right = chosen.id === w.id;
        if (right) { state.correct++; }
        bump(state.mode, right);
        Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
          var o = opts[bi];
          if (o.id === w.id) {
            b.classList.add("right");
            b.innerHTML = esc(o.w) + '<span class="py">' + esc(o.py) + '</span>';
          } else if (o === chosen) {
            b.classList.add("wrong");
          }
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

  /* ---------- boot ---------- */
  function boot() {
    app.innerHTML = '<div class="topbar"></div><div class="wrapper" id="view">' +
      '<div class="loading">正在装载词库…</div></div>' +
      '<div class="beta-chip">测试版 v0.1 · 未登入</div>';
    setTopbar("landing", "");

    fetch(STREAM + ".json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (json) {
        DATA = json;
        json.levels.forEach(function (lv) {
          lv.units.forEach(function (u) {
            var count = 0;
            u.components.forEach(function (c) {
              c.words.forEach(function (w) {
                WORDS.push({
                  id: w.id, w: w.w, py: w.py, pos: w.pos, zh: w.zh, en: w.en,
                  ex: w.ex, cloze: w.cloze,
                  level: lv.level, unit: u.unit, component: c.component
                });
                count++;
              });
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
