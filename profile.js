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
    // year + class, e.g. "2026 3hc3" -> "2026 3HC3": uppercase, trim, collapse
    // internal whitespace to ONE space (so the year stays separated from class).
    return String(s == null ? "" : s).trim().toUpperCase().replace(/\s+/g, " ");
  }

  /* ---------- Singapore secondary schools (shared dropdown source) ----------
     The ONE source of truth for the school <select> in the nickname picker
     (nickname.js / app.js) and the 我的档案 panel below. profile.js loads before
     both on every page, so they read window.SG_SCHOOLS. Format "中文 English";
     百德 pinned first, the rest A→Z by English name; 其他 = free-text escape
     hatch. Verified 2026 (see sg_secondary_schools.md). Edit the list here only. */
  var SCHOOL_BVSS = "百德中学 Bukit View Secondary School";
  var SCHOOL_LIST = [
    "美雅中学 Admiralty Secondary School",
    "伊布拉欣中学 Ahmad Ibrahim Secondary School",
    "安德逊中学 Anderson Secondary School",
    "茂乔中学 Ang Mo Kio Secondary School",
    "圣公会中学 Anglican High School",
    "英华学校（巴克路） Anglo-Chinese School (Barker Road)",
    "英华自主中学 Anglo-Chinese School (Independent)",
    "圣升英校 Assumption English School",
    "巴特礼中学 Bartley Secondary School",
    "培德中学 Beatty Secondary School",
    "育青中学 Bedok Green Secondary School",
    "尚义中学 Bedok South Secondary School",
    "务德中学 Bedok View Secondary School",
    "明智中学 Bendemeer Secondary School",
    "文礼中学 Boon Lay Secondary School",
    "博文中学 Bowen Secondary School",
    "务立中学 Broadrick Secondary School",
    "武吉巴督中学 Bukit Batok Secondary School",
    "红山中学 Bukit Merah Secondary School",
    "武吉班让政府中学 Bukit Panjang Government High School",
    "康培中学 Canberra Secondary School",
    "公教中学 Catholic High School",
    "四德女子中学 Cedar Girls' Secondary School",
    "尚育中学 Changkat Changi Secondary School",
    "加东修道院女校 CHIJ Katong Convent",
    "圣婴女子中学（大巴窑） CHIJ Secondary (Toa Payoh)",
    "圣若瑟修院学校 CHIJ St. Joseph's Convent",
    "圣尼各拉女校 CHIJ St. Nicholas Girls' School",
    "圣婴德兰女校 CHIJ St. Theresa's Convent",
    "基督堂中学 Christ Church Secondary School",
    "蔡厝港中学 Chua Chu Kang Secondary School",
    "中正中学（总校） Chung Cheng High School (Main)",
    "中正中学（义顺） Chung Cheng High School (Yishun)",
    "锦文中学 Clementi Town Secondary School",
    "立才中学 Commonwealth Secondary School",
    "康柏中学 Compassvale Secondary School",
    "克信女子中学 Crescent Girls' School",
    "达迈中学 Damai Secondary School",
    "德义中学 Deyi Secondary School",
    "德能中学 Dunearn Secondary School",
    "德明政府中学 Dunman High School",
    "德明中学 Dunman Secondary School",
    "东源中学 East Spring Secondary School",
    "育德中学 Edgefield Secondary School",
    "永青中学 Evergreen Secondary School",
    "花菲卫理中学 Fairfield Methodist School (Secondary)",
    "法嘉中学 Fajar Secondary School",
    "辅华中学 Fuhua Secondary School",
    "颜永成学校 Gan Eng Seng School",
    "芽笼美以美中学 Geylang Methodist School (Secondary)",
    "绿苑中学 Greendale Secondary School",
    "群立中学 Greenridge Secondary School",
    "光洋中学 Guangyang Secondary School",
    "海星天主教中学 Hai Sing Catholic School",
    "育林中学 Hillgrove Secondary School",
    "圣婴中学 Holy Innocents' High School",
    "后港中学 Hougang Secondary School",
    "华义中学 Hua Yi Secondary School",
    "华侨中学 Hwa Chong Institution",
    "俊源中学 Junyuan Secondary School",
    "裕廊中学 Jurong Secondary School",
    "裕廊西中学 Jurong West Secondary School",
    "丰嘉中学 Jurongville Secondary School",
    "聚英中学 Juying Secondary School",
    "岗丽中学 Kent Ridge Secondary School",
    "科兰芝中学 Kranji Secondary School",
    "国专长老会中学 Kuo Chuan Presbyterian Secondary School",
    "洛阳中学 Loyang View Secondary School",
    "文殊中学 Manjusri Secondary School",
    "海星中学 Maris Stella High School",
    "士林中学 Marsiling Secondary School",
    "美华中学 Mayflower Secondary School",
    "美廉中学 Meridian Secondary School",
    "美以美女子中学 Methodist Girls' School (Secondary)",
    "蒙福中学 Montfort Secondary School",
    "南侨中学 Nan Chiau High School",
    "南华中学 Nan Hua High School",
    "南洋女子中学校 Nanyang Girls' High School",
    "国家初级学院 National Junior College",
    "军港中学 Naval Base Secondary School",
    "光伟中学 New Town Secondary School",
    "义安中学 Ngee Ann Secondary School",
    "德贤中学 North View Secondary School",
    "德新中学 North Vista Secondary School",
    "思源中学 Northbrooks Secondary School",
    "德景中学 Northland Secondary School",
    "新加坡国立大学附属数理中学 NUS High School of Mathematics and Science",
    "兰景中学 Orchid Park Secondary School",
    "欧南中学 Outram Secondary School",
    "励志中学 Pasir Ris Crest Secondary School",
    "思励中学 Pasir Ris Secondary School",
    "巴耶利峇美以美女中 Paya Lebar Methodist Girls' School (Secondary)",
    "培华中学 Pei Hwa Secondary School",
    "培才中学 Peicai Secondary School",
    "培雅中学 Peirce Secondary School",
    "平仪中学 Ping Yi Secondary School",
    "长老会中学 Presbyterian High School",
    "培道中学 Punggol Secondary School",
    "女皇镇中学 Queenstown Secondary School",
    "女皇道中学 Queensway Secondary School",
    "莱佛士女子中学 Raffles Girls' School (Secondary)",
    "莱佛士书院 Raffles Institution",
    "励正中学 Regent Secondary School",
    "立化中学 River Valley High School",
    "立德中学 Riverside Secondary School",
    "新科技中学 School of Science and Technology, Singapore",
    "新加坡艺术学院 School of the Arts, Singapore",
    "胜宝旺中学 Sembawang Secondary School",
    "成康中学 Seng Kang Secondary School",
    "实勤中学 Serangoon Garden Secondary School",
    "实仁中学 Serangoon Secondary School",
    "新加坡女子学校 Singapore Chinese Girls' School",
    "新加坡体育学校 Singapore Sports School",
    "泉原中学 Springfield Secondary School",
    "圣安德烈中学 St. Andrew's Secondary School",
    "圣安东尼女校（中学） St. Anthony's Canossian Secondary School",
    "圣加俾尔中学 St. Gabriel's Secondary School",
    "圣希尔达中学 St. Hilda's Secondary School",
    "圣若瑟书院 St. Joseph's Institution",
    "圣玛格烈中学 St. Margaret's School (Secondary)",
    "圣伯特理中学 St. Patrick's School",
    "瑞士村中学 Swiss Cottage Secondary School",
    "淡滨尼中学 Tampines Secondary School",
    "丹绒加东女校 Tanjong Katong Girls' School",
    "丹绒加东中学 Tanjong Katong Secondary School",
    "淡马锡初级学院 Temasek Junior College",
    "淡马锡中学 Temasek Secondary School",
    "协和中学 Unity Secondary School",
    "维多利亚学校 Victoria School",
    "伟源中学 West Spring Secondary School",
    "维林中学 Westwood Secondary School",
    "惠厉中学 Whitley Secondary School",
    "林景中学 Woodgrove Secondary School",
    "辅廉中学 Woodlands Ring Secondary School",
    "辅仁中学 Woodlands Secondary School",
    "新民中学 Xinmin Secondary School",
    "永康中学 Yio Chu Kang Secondary School",
    "义顺中学 Yishun Secondary School",
    "毅道中学 Yishun Town Secondary School",
    "耘青中学 Yuan Ching Secondary School",
    "裕华中学 Yuhua Secondary School",
    "尤索夫依萨中学 Yusof Ishak Secondary School",
    "育英中学 Yuying Secondary School",
    "正华中学 Zhenghua Secondary School",
    "中华中学 Zhonghua Secondary School"
  ];
  window.SG_SCHOOLS = {
    BVSS: SCHOOL_BVSS,
    LIST: SCHOOL_LIST,
    isKnown: function (v) { return v === SCHOOL_BVSS || SCHOOL_LIST.indexOf(v) !== -1; },
    /* <option>s for a school <select>. `sel` = the currently stored value; a
       non-empty value that is NOT a listed school selects 其他 (the caller then
       shows a free-text box). BVSS is always pinned first. */
    optionsHtml: function (sel) {
      var known = this.isKnown(sel);
      var out = '<option value="' + esc(SCHOOL_BVSS) + '"' + (sel === SCHOOL_BVSS ? " selected" : "") + '>' + esc(SCHOOL_BVSS) + '</option>';
      for (var i = 0; i < SCHOOL_LIST.length; i++) {
        out += '<option value="' + esc(SCHOOL_LIST[i]) + '"' + (sel === SCHOOL_LIST[i] ? " selected" : "") + '>' + esc(SCHOOL_LIST[i]) + '</option>';
      }
      out += '<option value="other"' + (((sel && !known) || sel === "other") ? " selected" : "") + '>其他 Others</option>';
      return out;
    }
  };

  /* ---------- 头像目录 (DESIGN_头像与档案页.md) ----------
     16 avatars: 4 神兽 + 12 生肖. `avatarId` is a plain profile field (no
     year/history bookkeeping like mtlClass) — save()'s generic merge-onto-prev
     loop persists it with no extra code.

     Owner revisions 2026-08-13 (all applied here):
     - The 4 人物/角色 avatars were REMOVED ("they look odd"). Category "char" no
       longer exists; the picker's chips render from whatever categories are
       present, so nothing else needed changing.
     - Every avatar faces LEFT for consistency. rat / ox / 龟 were mirrored;
       the rest already faced left or are front-on.
     - Art is SQUARE-PADDED (crop to content, then centre on a square canvas)
       so a round 64px thumbnail can never clip a tail or a beak — the 龟 and
       凤 were being cut before. Thumbnails also use object-fit:contain.
     - 生肖·蛇 was regenerated: the first pass grabbed a legged lizard-ish
       image by mistake; the correct legless coiled snake is now in place.
     ⚠️ The 神兽 avatars are SEPARATE FILES (avatar_pet_*.png) from the camp-scene
     sprites (pet_*.png). Do NOT point the catalogue back at pet_*.png: those are
     rendered in 营地 via PET_LAYOUT at their own aspect ratios, and square-padding
     / mirroring them would silently change the camp art. */
  var AVATAR_CATALOG = [
    { id: "pet_gui", file: "avatar_pet_gui.png", category: "pet", label: "瑞兽·龟" },
    { id: "pet_qilin", file: "avatar_pet_qilin.png", category: "pet", label: "瑞兽·麒麟" },
    { id: "pet_feng", file: "avatar_pet_feng.png", category: "pet", label: "瑞兽·凤" },
    { id: "pet_long", file: "avatar_pet_long.png", category: "pet", label: "瑞兽·龙" },
    { id: "zodiac_rat", file: "avatar_zodiac_rat.png", category: "zodiac", label: "生肖·鼠" },
    { id: "zodiac_ox", file: "avatar_zodiac_ox.png", category: "zodiac", label: "生肖·牛" },
    { id: "zodiac_tiger", file: "avatar_zodiac_tiger.png", category: "zodiac", label: "生肖·虎" },
    { id: "zodiac_rabbit", file: "avatar_zodiac_rabbit.png", category: "zodiac", label: "生肖·兔" },
    { id: "zodiac_dragon", file: "avatar_zodiac_dragon.png", category: "zodiac", label: "生肖·龙" },
    { id: "zodiac_snake", file: "avatar_zodiac_snake.png", category: "zodiac", label: "生肖·蛇" },
    { id: "zodiac_horse", file: "avatar_zodiac_horse.png", category: "zodiac", label: "生肖·马" },
    { id: "zodiac_goat", file: "avatar_zodiac_goat.png", category: "zodiac", label: "生肖·羊" },
    { id: "zodiac_monkey", file: "avatar_zodiac_monkey.png", category: "zodiac", label: "生肖·猴" },
    { id: "zodiac_rooster", file: "avatar_zodiac_rooster.png", category: "zodiac", label: "生肖·鸡" },
    { id: "zodiac_dog", file: "avatar_zodiac_dog.png", category: "zodiac", label: "生肖·狗" },
    { id: "zodiac_pig", file: "avatar_zodiac_pig.png", category: "zodiac", label: "生肖·猪" }
  ];
  var AVATAR_CAT_LABEL = { char: "角色", pet: "神兽", zodiac: "生肖" };
  window.WSAvatars = AVATAR_CATALOG;
  function avatarById(id) {
    for (var i = 0; i < AVATAR_CATALOG.length; i++) if (AVATAR_CATALOG[i].id === id) return AVATAR_CATALOG[i];
    return null;
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
      // Year the class is being set. Read an EXPLICIT classYear only from the
      // caller's argument (tests / migration) — never inherit prev.classYear
      // onto a change, or a new-year class stays stamped with the old year and
      // the Jan-2 prompt would keep re-firing. A change stamps the current year
      // (archiving the previous year's class); an unchanged class keeps its year.
      var explicitYear = profile && profile.classYear;
      var yr;
      if (newClass !== prev.mtlClass) {
        yr = explicitYear || currentYear();
        if (prev.mtlClass && prev.classYear && prev.classYear !== yr) {
          hist[String(prev.classYear)] = prev.mtlClass;
        }
      } else {
        yr = explicitYear || prev.classYear || currentYear();
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

  /* School names are stored as "中文 English" (see SCHOOL_LIST). The compact
     header shows only the Chinese half so it doesn't wrap to three lines. */
  function shortSchool(s) {
    var m = String(s || "").match(/^([^\sA-Za-z]+)\s/);
    return m ? m[1] : String(s || "");
  }

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
    // which <option> the school <select> shows: a listed school, "other"
    // (free-text), or "" (nothing chosen yet). draft.school holds the value.
    draft.schoolPick = draft.school
      ? ((window.SG_SCHOOLS && window.SG_SCHOOLS.isKnown(draft.school)) ? draft.school : "other")
      : "";

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

        // ---- 身份 + 基本资料 (§5: merged into one header block, no gap between) ----
        '<div class="prof-sec">' +
          '<div class="prof-head">' +
            '<button class="prof-avatar lg" id="profAvatarBtn" title="换头像">' + avatarImgHtml(prof.avatarId) + '</button>' +
            '<div class="prof-head-txt">' +
              '<div class="prof-nick">' + esc(prof.nickname || "（未命名）") + '</div>' +
              '<div class="prof-head-sub">' + esc(catShown) +
                (draft.mtlClass ? ' · ' + esc(draft.mtlClass) : '') +
                (draft.school ? ' · ' + esc(shortSchool(draft.school)) : '') + '</div>' +
              '<div class="prof-head-links">' +
                '<button class="code-link" id="profChangeAvatar">换头像</button>' +
                '<button class="code-link" id="profChangeNick">换昵称</button></div>' +
            '</div>' +
          '</div>' +
          '<div class="pop-label" style="font-weight:500;margin-top:10px">学校</div>' +
          '<select class="np-select" id="profSchool">' +
            (draft.schoolPick === "" ? '<option value="" selected>请选择学校 Select school…</option>' : "") +
            (window.SG_SCHOOLS ? window.SG_SCHOOLS.optionsHtml(draft.schoolPick)
              : ('<option value="' + esc(draft.school) + '" selected>' + esc(draft.school || "百德中学 Bukit View Secondary School") + '</option>')) +
          '</select>' +
          (draft.schoolPick === "other" ? '<input type="text" class="prof-input" id="profSchoolOther" style="margin-top:8px" placeholder="请输入学校名称 School name" value="' + esc(draft.school) + '">' : "") +
          '<div class="pop-label" style="font-weight:500;margin-top:10px">身份类别 · 当前：' + esc(catShown) + '</div>' +
          '<div class="prof-chips">' + catChips + '</div>' +
          '<div id="profClassWrap"' + (cat === "student" ? "" : ' style="display:none"') + '>' +
            '<div class="pop-label" style="font-weight:500">班级 · 请填「年份 + 班级」</div>' +
            '<input type="text" class="prof-input" id="profClass" placeholder="例如：2026 3HC3" value="' + esc(draft.mtlClass) + '">' +
            '<div class="pop-note">写上年份，升班后即使忘了更新，老师也能看出是哪一年的班级。</div>' +
          '</div>' +
          '<div class="feedback" id="profSaveFb"></div>' +
          '<div class="nav-row"><button class="nav-btn primary" id="profSave">保存</button></div></div>' +

        // ---- 我的进度 ----
        '<div class="prof-sec"><div class="pop-label">我的进度</div>' + progressHtml() + '</div>' +

        // ---- 进度码 ----
        '<div class="prof-sec"><div class="pop-label">进度码 · 备份与恢复</div>' + codeSectionHtml() + '</div>' +

        // ---- 技术信息 (§5: collapsed to one line; expands on demand) ----
        '<div class="prof-sec"><details class="prof-more">' +
          '<summary>技术编号与隐私说明</summary>' +
          '<div class="pop-note" style="margin:8px 0 6px">这串编号只用于技术支援，不代表你的身份。</div>' +
          '<div class="prof-uid" id="profUid">载入中…</div>' +
          '<div class="prof-row" style="margin-top:6px"><span class="pop-note">简短编号：<b id="profUidShort">…</b></span>' +
          '<button class="code-link" id="profUidCopy">复制完整编号</button></div>' +
          '<div class="pop-note" style="margin-top:6px" id="profSync">…</div>' +
          '<div class="pop-body" style="margin-top:10px">本站只保存你选择的昵称、学校、班级、身份类别与学习进度，' +
          '用来记录学习情况。我们不收集真实姓名，班级是选填。</div>' +
          '</details></div>' +

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

      var openPicker = function () {
        openAvatarPicker(prof.avatarId, function (id) {
          prof = save({ avatarId: id });
          render();
          if (opts.onChanged) opts.onChanged();
        });
      };
      var avBtn = ov.querySelector("#profAvatarBtn");
      if (avBtn) avBtn.onclick = openPicker;
      var avBtn2 = ov.querySelector("#profChangeAvatar");
      if (avBtn2) avBtn2.onclick = openPicker;

      var schoolEl = ov.querySelector("#profSchool");
      if (schoolEl) schoolEl.onchange = function () {
        draft.schoolPick = schoolEl.value;
        if (draft.schoolPick !== "other") {
          draft.school = schoolEl.value;             // "" (please-select) or a listed school
        } else if (window.SG_SCHOOLS && window.SG_SCHOOLS.isKnown(draft.school)) {
          draft.school = "";                          // was a listed school → start the text box empty
        }
        render();
      };
      var schoolOtherEl = ov.querySelector("#profSchoolOther");
      if (schoolOtherEl) schoolOtherEl.oninput = function () { draft.school = schoolOtherEl.value; };
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

    /* current mastered set for THIS stream, read from localStorage (used to show
       the student exactly what a restore will do — it only ever adds). */
    function currentMasteredSet() {
      try { var s = JSON.parse(localStorage.getItem("ws2_" + _provider.stream)); return (s && s.mastered) || {}; }
      catch (e) { return {}; }
    }
    function diffLine(plan) {
      var cur = currentMasteredSet();
      var codeCount = (plan.addIds || []).length;
      var have = Object.keys(cur).length;
      var newly = (plan.addIds || []).filter(function (id) { return !cur[id]; }).length;
      var after = have + newly;
      return '<div class="pop-body" style="background:#F1F6FB;border:1px solid #DBE7F1;border-radius:10px;padding:10px 12px;margin-top:8px">' +
        '进度码里有 <b>' + codeCount + '</b> 个已掌握词语。<br>' +
        '你现在有 <b>' + have + '</b> 个。<br>' +
        '恢复后会合并成 <b>' + after + '</b> 个 —— <b>只增不减</b>，绝不会少于现在的 ' + have + ' 个。</div>';
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
          '如果这是同学的进度码，请不要恢复，那不是你的学习记录。</div>' + diffLine(plan),
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
        '<div class="pop-body">恢复进度会把进度码里的已掌握词语<b>并入</b>你现在的记录。</div>' + diffLine(plan) +
        '<div class="pop-note" style="margin-top:8px">恢复后，你可以在这次使用中撤销一次。</div>',
        "确定恢复",
        function () { commitRestore(plan, true, plan.codeNick || ""); });
    }

    function undoDiffLine(snap) {
      var cur = currentMasteredSet();
      var curCount = Object.keys(cur).length;
      var snapCount = Object.keys((snap && snap.mastered) || {}).length;
      var lost = Math.max(0, curCount - snapCount);
      return '<div class="pop-body" style="background:#FBEFEF;border:1px solid #E9C7C7;border-radius:10px;padding:10px 12px;margin-top:8px">' +
        '撤销后会把进度<b>整体还原</b>到恢复前：<b>' + snapCount + '</b> 个已掌握词语。<br>' +
        (lost > 0
          ? '你现在有 <b>' + curCount + '</b> 个，撤销会<b>丢失这之后新掌握的 ' + lost + ' 个词语</b>（包括恢复之后新答对的）。'
          : '你现在有 <b>' + curCount + '</b> 个，撤销不会丢失任何词语。') +
        '</div>';
    }

    function onUndo() {
      var undoKey = "ws2_" + _provider.stream + "_prerestore";
      var snap;
      try { snap = JSON.parse(sessionStorage.getItem(undoKey)); } catch (e) { snap = null; }
      if (!snap) { flashCode("没有可撤销的恢复。", false); return; }
      confirmDialog(
        '<div class="pop-title">撤销这次恢复？</div>' +
        '<div class="pop-body">这会把进度<b>整体还原</b>到恢复前的状态，不是只减掉恢复码带来的部分，请确认。</div>' + undoDiffLine(snap),
        "确定撤销",
        function () {
          _provider.restoreSnapshot(snap);
          try { sessionStorage.removeItem(undoKey); } catch (e) {}
          if (opts.onChanged) opts.onChanged();
          render();
          flashCode("已撤销这次恢复。", true);
        });
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

  function avatarImgHtml(id) {
    var a = id && avatarById(id);
    return a ? '<img src="' + esc(a.file) + '" alt="">' : '👤';
  }

  /* 头像选择弹层: tap = instant select + close, no separate confirm step
     (matches the nickname picker's own immediate-save convention). */
  function openAvatarPicker(currentId, onPick) {
    var cats = [];
    AVATAR_CATALOG.forEach(function (a) { if (cats.indexOf(a.category) === -1) cats.push(a.category); });
    var activeCat = "all";
    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.style.zIndex = "65";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });

    function render() {
      var chipsHtml = '<button class="prof-chip' + (activeCat === "all" ? " on" : "") + '" data-cat="all">全部</button>' +
        cats.map(function (c) {
          return '<button class="prof-chip' + (activeCat === c ? " on" : "") + '" data-cat="' + c + '">' + (AVATAR_CAT_LABEL[c] || c) + '</button>';
        }).join("");
      var shown = AVATAR_CATALOG.filter(function (a) { return activeCat === "all" || a.category === activeCat; });
      var gridHtml = shown.map(function (a) {
        return '<div class="avatar-cell"><button class="avatar-thumb' + (a.id === currentId ? " on" : "") + '" data-id="' + a.id + '">' +
          '<img src="' + esc(a.file) + '" alt=""></button><span class="avatar-cell-label">' + esc(a.label) + '</span></div>';
      }).join("");
      ov.innerHTML = '<div class="pop-card">' +
        '<div class="pop-title">换头像</div>' +
        '<div class="prof-chips">' + chipsHtml + '</div>' +
        '<div class="avatar-grid">' + (gridHtml || '<div class="pop-note">这个分类还没有头像。</div>') + '</div>' +
        '<div class="nav-row" style="margin-top:14px"><button class="nav-btn" id="apClose">取消</button></div></div>';
      ov.querySelector("#apClose").onclick = function () { ov.remove(); };
      Array.prototype.forEach.call(ov.querySelectorAll(".prof-chip[data-cat]"), function (b) {
        b.onclick = function () { activeCat = b.getAttribute("data-cat"); render(); };
      });
      Array.prototype.forEach.call(ov.querySelectorAll(".avatar-thumb"), function (b) {
        b.onclick = function () {
          var id = b.getAttribute("data-id");
          ov.remove();
          if (onPick) onPick(id);
        };
      });
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

  /* New-school-year class nudge. The class field is entered MANUALLY (student
     types "2026 3HC3" — we never auto-set the year). Each year, from Jan 2, if a
     student's registered class is from a previous year (or missing) and they
     haven't been nudged yet this year, prompt them to update it themselves.
     Jan 1 is skipped on purpose; the flag classPromptYear stops re-nagging. */
  function maybePromptClassUpdate(openPanel) {
    var p = load();
    if (!p || p.category !== "student") return;
    var now = new Date(), yr = now.getFullYear();
    if (now.getMonth() === 0 && now.getDate() < 2) return;   // not until Jan 2
    if ((p.classYear || 0) >= yr) return;                    // class already current this year
    if (p.classPromptYear === yr) return;                    // already nudged this year
    var ov = document.createElement("div");
    ov.className = "pop-overlay"; ov.style.zIndex = "80";
    ov.innerHTML = '<div class="pop-card">' +
      '<div class="pop-title">🎊 新学年了！</div>' +
      '<div class="pop-body">现在是 ' + yr + ' 年。你目前登记的班级是「<b>' + esc(p.mtlClass || "未填写") + '</b>」。<br>' +
      '请到「我的档案」把它更新为今年的班级，例如：<b>' + yr + ' 3HC3</b>。</div>' +
      '<div class="nav-row"><button class="nav-btn" id="clpLater">以后再说</button>' +
      '<button class="nav-btn primary" id="clpUpdate">现在更新</button></div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) { markNudged(yr); ov.remove(); } });
    document.body.appendChild(ov);
    function markNudged(y) { save({ classPromptYear: y }); }
    ov.querySelector("#clpLater").onclick = function () { markNudged(yr); ov.remove(); };
    ov.querySelector("#clpUpdate").onclick = function () {
      markNudged(yr); ov.remove();
      if (typeof openPanel === "function") openPanel();
    };
  }

  window.WSProfile = {
    load: load,
    save: save,
    uid: uid,
    open: open,
    registerCodeProvider: registerCodeProvider,
    maybePromptClassUpdate: maybePromptClassUpdate,
    openAvatarPicker: openAvatarPicker,
    avatarImgHtml: avatarImgHtml
  };
})();
