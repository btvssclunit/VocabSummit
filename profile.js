/* 词山学海 · profile.js — single owner of the shared profile (window.WSProfile)
   ------------------------------------------------------------------------
   Loaded AFTER firebase-init.js and BEFORE nickname.js (landing) / app.js
   (stream pages). This is the ONLY place the profile is read or written:
   app.js and nickname.js delegate loadProfile / saveProfileLocal here so the
   shape can never drift between the two files again.

   Profile shape (see HANDOFF_dashboard_and_bound_codes.md §2):
     { nickname, school, category, mtlClass, classYear, classHistory }
   - category: ASCII key "student" | "teacher" | "parent" | "public" (never a
     Chinese label). This field used to be called `role`; load() migrates it.
   - mtlClass: students only; uppercased + whitespace-stripped; "" otherwise.
   - classYear / classHistory: so a class change across a year is not silently
     rewritten (save() owns this bookkeeping).
   Binding note: this file does NOT decode 进度码. The stream page registers an
   encode/decode/snapshot provider (registerCodeProvider); the panel only
   orchestrates the UI, snapshot, undo and restore log around it. */
(function () {
  "use strict";

  var PROFILE_KEY = "ws2_profile";
  var _uid = null;                 // cached Firebase uid (async; may stay null offline)
  var _provider = null;            // 进度码 hooks from the current stream page, or null on landing

  if (window.WSCloud && window.WSCloud.getUid) {
    try { window.WSCloud.getUid(function (u) { _uid = u || null; }); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function currentYear() {
    try { return new Date().getFullYear(); } catch (e) { return 2026; }
  }
  function normClass(s) {
    return String(s == null ? "" : s).toUpperCase().replace(/\s+/g, "");
  }

  /* ---------- load / save ---------- */
  function load() {
    var p;
    try { p = JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch (e) { return null; }
    if (!p) return null;
    /* migrate the old `role` field to `category` (same values, same meaning).
       Do NOT invent a category for a profile that never had one. */
    if (p.category == null && p.role != null) p.category = p.role;
    if (p.role != null) delete p.role;
    return p;
  }

  /* Save owns all mtlClass / classYear / classHistory bookkeeping so callers
     (picker, panel) never have to. It merges onto the previously stored profile
     so panel-only fields survive a nickname re-pick. */
  function save(profile) {
    var prev = load() || {};
    var p = {};
    // start from prev so unknown / untouched fields (e.g. heardFrom) persist
    Object.keys(prev).forEach(function (k) { p[k] = prev[k]; });
    if (profile) Object.keys(profile).forEach(function (k) { p[k] = profile[k]; });
    if (p.role != null) delete p.role;

    var isStudent = p.category === "student";
    var newClass = isStudent ? normClass(p.mtlClass) : "";

    if (!isStudent) {
      // class applies to students only; drop it but keep any accumulated history
      p.mtlClass = "";
    } else if (!newClass) {
      p.mtlClass = "";                                   // student cleared their class
    } else {
      var hist = {};
      if (prev.classHistory) Object.keys(prev.classHistory).forEach(function (y) { hist[y] = prev.classHistory[y]; });
      // year the class is being set: honour an explicit classYear (tests / future),
      // else this calendar year.
      var yr = p.classYear || currentYear();
      if (prev.mtlClass && prev.mtlClass !== newClass && prev.classYear && prev.classYear !== yr) {
        // a genuine cross-year change: archive the previous year's class first
        hist[String(prev.classYear)] = prev.mtlClass;
      } else if (prev.mtlClass && prev.mtlClass === newClass) {
        // unchanged: keep the year it was originally set
        yr = prev.classYear || yr;
      }
      hist[String(yr)] = newClass;
      p.mtlClass = newClass;
      p.classYear = yr;
      p.classHistory = hist;
    }

    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {}
    if (window.WSCloud && window.WSCloud.isAvailable() && window.WSCloud.saveProfile) {
      window.WSCloud.saveProfile(p);
    }
    return p;
  }

  function uid() { return _uid; }

  function registerCodeProvider(fn) { _provider = fn || null; }

  /* ---------- the 我的档案 overlay ---------- */
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  var CAT_LABEL = { student: "学生", teacher: "老师", parent: "家长", public: "公众" };
  var STREAM_LABEL = { g1: "词星大冒险 G1", g2: "词将竞技场 G2", g3: "词王淬炼坊 G3", hcl: "词圣鸿文苑 HCL" };
  var STREAM_HREF = { g1: "G1_index.html", g2: "G2_index.html", g3: "G3_index.html", hcl: "HCL_index.html" };

  function masteredCount(streamKey) {
    try {
      var s = JSON.parse(localStorage.getItem("ws2_" + streamKey));
      if (!s || !s.mastered) return null;
      return Object.keys(s.mastered).length;
    } catch (e) { return null; }
  }

  function open(opts) {
    opts = opts || {};
    var prof = load() || {};

    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.innerHTML = '<div class="pop-card prof-wide" id="profCard"></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    var card = ov.querySelector("#profCard");

    // working copy of the editable fields
    var draft = {
      school: prof.school || "",
      category: prof.category || "",
      mtlClass: prof.mtlClass || ""
    };

    function progressHtml() {
      var rows = ["g1", "g2", "g3", "hcl"].map(function (k) {
        var m = masteredCount(k);
        return '<div><b>' + (m == null ? "尚未开始" : fmtNum(m) + " 米") + '</b><span>' + esc(STREAM_LABEL[k]) + '</span></div>';
      }).join("");
      return '<div class="prof-prog">' + rows + '</div>';
    }

    function codeSectionHtml() {
      if (!_provider) {
        var links = ["g1", "g2", "g3", "hcl"].map(function (k) {
          return '<a class="code-link" href="' + STREAM_HREF[k] + '">' + esc(STREAM_LABEL[k]) + '</a>';
        }).join(" ");
        return '<div class="pop-body">进度码在各科目页面里。打开你的科目即可复制或恢复：</div>' +
          '<div class="prof-row" style="margin-top:8px">' + links + '</div>';
      }
      var code = "";
      try { code = _provider.encode(); } catch (e) { code = ""; }
      var undoKey = "ws2_" + _provider.stream + "_prerestore";
      var hasUndo = false;
      try { hasUndo = !!sessionStorage.getItem(undoKey); } catch (e) {}
      return '<div class="pop-body">复制这段进度码，用邮件发给自己保存。换设备或换浏览器时，把它粘贴到下方恢复。<br>' +
        '<span class="pop-note">进度码包含：已掌握词语、最高连对、各游戏纪录，并绑定你的昵称。</span></div>' +
        '<div class="pop-label">我的进度码（' + esc(STREAM_LABEL[_provider.stream] || _provider.stream) + '）</div>' +
        '<textarea class="code-ta" id="profCodeOut" readonly>' + esc(code) + '</textarea>' +
        '<div class="nav-row"><button class="nav-btn" id="profCodeCopy">📋 复制进度码</button></div>' +
        '<div class="pop-label" style="margin-top:12px">恢复进度</div>' +
        '<textarea class="code-ta" id="profCodeIn" placeholder="把进度码粘贴到这里…"></textarea>' +
        '<div class="feedback" id="profCodeFb"></div>' +
        '<div class="nav-row">' +
        (hasUndo ? '<button class="nav-btn" id="profCodeUndo">↩ 撤销恢复</button>' : "") +
        '<button class="nav-btn primary" id="profCodeRestore">恢复进度</button></div>';
    }

    function render() {
      var cat = draft.category;
      var catChips = ["student", "teacher", "parent", "public"].map(function (k) {
        return '<button class="prof-chip' + (cat === k ? " on" : "") + '" data-cat="' + k + '">' + CAT_LABEL[k] + '</button>';
      }).join("");
      var catShown = cat ? CAT_LABEL[cat] : "未填写";

      var html =
        '<div class="pop-title">👤 我的档案</div>' +
        '<div class="prof-grid">' +

        // ---- 身份 ----
        '<div class="prof-sec"><div class="pop-label">身份</div>' +
          '<div class="prof-row"><span class="prof-nick">' + esc(prof.nickname || "（未命名）") + '</span>' +
          '<button class="code-link" id="profChangeNick">换昵称</button></div></div>' +

        // ---- 基本资料 ----
        '<div class="prof-sec"><div class="pop-label">基本资料</div>' +
          '<div class="pop-label" style="font-weight:500">学校</div>' +
          '<input type="text" class="prof-input" id="profSchool" placeholder="例如：百德中学" value="' + esc(draft.school) + '">' +
          '<div class="pop-label" style="font-weight:500;margin-top:10px">身份类别 · 当前：' + esc(catShown) + '</div>' +
          '<div class="prof-chips">' + catChips + '</div>' +
          '<div id="profClassWrap"' + (cat === "student" ? "" : ' style="display:none"') + '>' +
            '<div class="pop-label" style="font-weight:500">班级</div>' +
            '<input type="text" class="prof-input" id="profClass" placeholder="例如：1C1、2C2A、3C3B、4HC3" value="' + esc(draft.mtlClass) + '">' +
          '</div>' +
          '<div class="feedback" id="profSaveFb"></div>' +
          '<div class="nav-row"><button class="nav-btn primary" id="profSave">保存</button></div></div>' +

        // ---- 我的进度 ----
        '<div class="prof-sec"><div class="pop-label">我的进度</div>' + progressHtml() + '</div>' +

        // ---- 进度码 ----
        '<div class="prof-sec"><div class="pop-label">进度码 · 备份与恢复</div>' + codeSectionHtml() + '</div>' +

        // ---- 技术信息 ----
        '<div class="prof-sec"><div class="pop-label">技术编号（老师排查问题时使用）</div>' +
          '<div class="pop-note" style="margin-bottom:6px">这串编号只用于技术支援，不代表你的身份。</div>' +
          '<div class="prof-uid" id="profUid">载入中…</div>' +
          '<div class="prof-row" style="margin-top:6px"><span class="pop-note">简短编号：<b id="profUidShort">…</b></span>' +
          '<button class="code-link" id="profUidCopy">复制完整编号</button></div>' +
          '<div class="pop-note" style="margin-top:6px" id="profSync">…</div></div>' +

        // ---- 隐私说明 ----
        '<div class="prof-sec"><div class="pop-label">隐私说明</div>' +
          '<div class="pop-body">本站只保存你选择的昵称、学校、班级、身份类别与学习进度，用来记录学习情况。' +
          '我们不收集真实姓名，班级是选填。</div></div>' +

        '</div>' + // .prof-grid
        '<div class="nav-row"><button class="nav-btn" id="profClose">关闭</button></div>';

      card.innerHTML = html;
      wire();
    }

    function wire() {
      ov.querySelector("#profClose").onclick = function () { ov.remove(); };

      ov.querySelector("#profChangeNick").onclick = function () {
        if (opts.onChangeNickname) opts.onChangeNickname(function () {
          prof = load() || {};              // picker may have changed nickname / school / category
          draft.school = prof.school || draft.school;
          draft.category = prof.category || draft.category;
          draft.mtlClass = (prof.category === "student") ? (prof.mtlClass || draft.mtlClass) : "";
          render();
        });
      };

      var schoolEl = ov.querySelector("#profSchool");
      if (schoolEl) schoolEl.oninput = function () { draft.school = schoolEl.value; };
      var classEl = ov.querySelector("#profClass");
      if (classEl) classEl.oninput = function () { draft.mtlClass = classEl.value; };

      Array.prototype.forEach.call(ov.querySelectorAll(".prof-chip[data-cat]"), function (b) {
        b.onclick = function () {
          draft.category = b.getAttribute("data-cat");
          if (draft.category !== "student") draft.mtlClass = "";   // spec: clear class off-student
          render();
        };
      });

      ov.querySelector("#profSave").onclick = function () {
        var fb = ov.querySelector("#profSaveFb");
        prof = save({ school: (draft.school || "").trim(), category: draft.category, mtlClass: draft.mtlClass });
        draft.mtlClass = prof.mtlClass || "";
        fb.className = "feedback show ok"; fb.textContent = "已保存 ✓";
        if (opts.onChanged) opts.onChanged();
      };

      wireCode();
      wireUid();
    }

    function wireCode() {
      if (!_provider) return;
      var out = ov.querySelector("#profCodeOut");
      var copyBtn = ov.querySelector("#profCodeCopy");
      if (copyBtn) copyBtn.onclick = function () {
        if (out) { out.select(); out.setSelectionRange(0, 99999); }
        var txt = out ? out.value : "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () { flashCode("已复制进度码", true); });
        } else { try { document.execCommand("copy"); flashCode("已复制进度码", true); } catch (e) {} }
      };
      var restoreBtn = ov.querySelector("#profCodeRestore");
      if (restoreBtn) restoreBtn.onclick = onRestore;
      var undoBtn = ov.querySelector("#profCodeUndo");
      if (undoBtn) undoBtn.onclick = onUndo;
    }

    function flashCode(msg, ok) {
      var fb = ov.querySelector("#profCodeFb");
      if (!fb) return;
      fb.className = "feedback show " + (ok ? "ok" : "bad");
      fb.textContent = msg;
    }

    function commitRestore(plan, matched, codeNick) {
      // §6: snapshot -> sessionStorage -> log -> commit, in that order
      var undoKey = "ws2_" + _provider.stream + "_prerestore";
      try { sessionStorage.setItem(undoKey, JSON.stringify(_provider.snapshot())); } catch (e) {}
      var res = _provider.commit(plan);
      var me = load() || {};
      if (window.WSCloud && window.WSCloud.logRestore) {
        window.WSCloud.logRestore({
          nickname: me.nickname || "", school: me.school || "", mtlClass: me.mtlClass || "",
          stream: _provider.stream, codeNick: codeNick || "", matched: !!matched, added: res.added || 0
        });
      }
      if (opts.onChanged) opts.onChanged();
      render();                                   // re-render so 撤销恢复 appears + progress updates
      flashCode("✅ 恢复成功：新增 " + (res.added || 0) + " 个已掌握词语", true);
    }

    function onRestore() {
      var inEl = ov.querySelector("#profCodeIn");
      var val = inEl ? inEl.value : "";
      if (!val.trim()) { flashCode("请先粘贴进度码。", false); return; }
      var plan = _provider.decode(val);
      if (plan.err) { flashCode(plan.err, false); return; }

      var me = load() || {};
      if (plan.mismatch) {
        confirmDialog(
          '<div class="pop-title">这不是你的进度码</div>' +
          '<div class="pop-body">这个进度码属于「' + esc(plan.codeNick) + '」，和你现在的昵称「' + esc(me.nickname || "") + '」不一样。<br><br>' +
          '如果这是你以前用过的昵称，可以改用它继续。<br>' +
          '如果这是同学的进度码，请不要恢复，那不是你的学习记录。</div>',
          '改用「' + esc(plan.codeNick) + '」并恢复',
          function () {
            save({ nickname: plan.codeNick });     // adopt the identity, then restore
            prof = load() || {};
            commitRestore(plan, false, plan.codeNick);
          });
        return;
      }

      var legacyNote = plan.legacy ? '<div class="pop-note">这是旧版进度码，无法核对来源。</div>' : "";
      confirmDialog(
        '<div class="pop-title">恢复进度</div>' + legacyNote +
        '<div class="pop-body">恢复进度会把进度码里的已掌握词语并入你现在的记录。掌握数只增不减。<br>' +
        '恢复后，你可以在这次使用中撤销一次。</div>',
        "确定恢复",
        function () { commitRestore(plan, true, plan.codeNick || ""); });
    }

    function onUndo() {
      var undoKey = "ws2_" + _provider.stream + "_prerestore";
      var snap;
      try { snap = JSON.parse(sessionStorage.getItem(undoKey)); } catch (e) { snap = null; }
      if (!snap) { flashCode("没有可撤销的恢复。", false); return; }
      _provider.restoreSnapshot(snap);
      try { sessionStorage.removeItem(undoKey); } catch (e) {}
      if (opts.onChanged) opts.onChanged();
      render();
      flashCode("已撤销这次恢复。", true);
    }

    function wireUid() {
      var uidEl = ov.querySelector("#profUid");
      var shortEl = ov.querySelector("#profUidShort");
      var syncEl = ov.querySelector("#profSync");
      var online = !!(window.WSCloud && window.WSCloud.isAvailable());
      if (syncEl) syncEl.textContent = online ? "已连接云端备份" : "离线，进度只存在本机";
      function show(u) {
        if (uidEl) uidEl.textContent = u || "（离线）";
        if (shortEl) shortEl.textContent = u ? u.slice(0, 6) : "（离线）";
      }
      show(_uid);
      if (online && window.WSCloud.getUid) {
        window.WSCloud.getUid(function (u) { _uid = u || _uid; show(u); });
      }
      var copyBtn = ov.querySelector("#profUidCopy");
      if (copyBtn) copyBtn.onclick = function () {
        var u = uidEl ? uidEl.textContent : "";
        if (!u || u === "载入中…" || u === "（离线）") return;
        if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { if (syncEl) { syncEl.textContent = "技术编号已复制 ✓"; } });
      };
    }

    render();
  }

  /* small yes/cancel dialog stacked above the panel */
  function confirmDialog(bodyHtml, okLabel, onOk) {
    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.style.zIndex = "70";
    ov.innerHTML = '<div class="pop-card">' + bodyHtml +
      '<div class="nav-row"><button class="nav-btn" id="cdCancel">取消</button>' +
      '<button class="nav-btn primary" id="cdOk">' + okLabel + '</button></div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelector("#cdCancel").onclick = function () { ov.remove(); };
    ov.querySelector("#cdOk").onclick = function () { ov.remove(); onOk(); };
  }

  window.WSProfile = {
    load: load,
    save: save,
    uid: uid,
    open: open,
    registerCodeProvider: registerCodeProvider
  };
})();
