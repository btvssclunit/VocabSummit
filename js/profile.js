/* 词山学海 · profile.js — single owner of the shared profile (window.WSProfile)
   ------------------------------------------------------------------------
   Loaded AFTER firebase-init.js and BEFORE nickname.js (landing) / cs.js
   (stream pages). This is the ONLY place the profile is read or written:
   cs.js and nickname.js delegate loadProfile / saveProfileLocal here so the
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

  /* deployed asset version, read off this file's own <script src> — the same
     trick cs.js/arena.js use for the data fetches. Reported with every ticket so
     a bug report says which build it came from. */
  var WS_ASSET_V = (function () {
    try {
      var sc = document.currentScript;
      var m = sc && sc.src && sc.src.match(/[?&]v=([^&]+)/);
      return m ? m[1] : "";
    } catch (e) { return ""; }
  })();
  window.WS_ASSET_V = WS_ASSET_V;

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
     (nickname.js / cs.js) and the 我的档案 panel below. profile.js loads before
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
    normQ: function (q) { return String(q == null ? "" : q).trim().toLowerCase(); },
    /* Schools whose name CONTAINS the query, matched against the whole
       "中文 English" string, so 「培华」 and 「pei hwa」 both find the same row.
       Empty query = everything, BVSS pinned first. */
    matches: function (q) {
      var n = this.normQ(q);
      var all = [SCHOOL_BVSS].concat(SCHOOL_LIST);
      if (!n) return all;
      return all.filter(function (s) { return s.toLowerCase().indexOf(n) !== -1; });
    },
    /* <option>s for a school <select>. `sel` = the currently stored value; a
       non-empty value that is NOT a listed school selects 其他 (the caller then
       shows a free-text box). `q` (optional) narrows the list to matches — the
       stored school is always kept in its own dropdown even when it no longer
       matches, so a search can never silently drop what is already chosen. */
    optionsHtml: function (sel, q) {
      var known = this.isKnown(sel);
      var list = this.matches(q);
      var hits = list.length;              // BEFORE the current school is pinned back in
      if (known && list.indexOf(sel) === -1) list = [sel].concat(list);
      var out = "";
      if (!sel) out += '<option value="" selected>请选择学校 Select school…</option>';
      if (this.normQ(q) && !hits) out += '<option value="" disabled>没有找到，请选「其他 Others」</option>';
      for (var i = 0; i < list.length; i++) {
        out += '<option value="' + esc(list[i]) + '"' + (sel === list[i] ? " selected" : "") + '>' + esc(list[i]) + '</option>';
      }
      out += '<option value="other"' + (((sel && !known) || sel === "other") ? " selected" : "") + '>其他 Others</option>';
      return out;
    },
    /* The search box that drives the filter above. 150+ schools is far too many
       to scroll on a phone, so every school <select> in the app is paired with
       one of these. */
    searchHtml: function (id, q) {
      return '<input type="search" class="np-search" id="' + id + '" autocomplete="off" ' +
        'placeholder="🔍 输入校名任意部分 Type any part of the name" value="' + esc(q || "") + '">';
    },
    /* Live-filter `select` from `input`. onPick(value, query) fires on every
       keystroke, so the caller can persist the query and react to a changed
       school. Rebuilds the <option>s in place (never a full re-render) — the
       search box must keep focus while the student is still typing. */
    wireSearch: function (input, select, onPick) {
      if (!input || !select) return;
      var self = this;
      input.oninput = function () {
        var q = input.value;
        var cur = select.value;
        select.innerHTML = self.optionsHtml(cur, q);
        var list = self.matches(q);
        if (self.normQ(q) && list.length === 1) select.value = list[0];  // only one left: choose it
        if (onPick) onPick(select.value, q);
      };
    }
  };

  /* ---------- 百德中学班级名单 (shared dropdown source) ----------
     ⚠️ ONE school's roster, on purpose. 班级 used to be a free-text box, and what
     came back was 「3hc3」「Sec 3 HC3」「3HC 3」「3hc3 2026」— every one of them a
     different string, so the teacher page's 班级视图 grouped one class into four
     rows and no back-end sort could order them. A <select> fixes the spelling; the
     YEAR prefix stays in the VALUE (not just a label) because that is the format
     save()/normClass() and teacher.html already store, byte for byte.

     30 classes in one flat list is still too long to scroll on a phone, so the
     field is TWO steps: 年级 chips (中一…中四) narrow it to 7–8 classes, then the
     <select>. Same shape as the school field's search-box-plus-select, for the
     same reason.

     ⚠️ EDIT ONCE A YEAR: bump YEAR and fix the per-level lists to match the new
     cohort. A stored class from an older year is NOT in this list — it falls to
     「其他」with its text kept, which is exactly what the Jan-2 nudge wants. */
  var BV_YEAR = "2026";
  var BV_LEVELS = [
    { k: "1", zh: "中一", py: "zhōng yī",  en: "Sec 1", list: ["1C1", "1C2A", "1C2B", "1C3A", "1C3B", "1C3C", "1HC3"] },
    { k: "2", zh: "中二", py: "zhōng èr",  en: "Sec 2", list: ["2C1", "2C2A", "2C2B", "2C3A", "2C3B", "2C3C", "2C3D", "2HC3"] },
    { k: "3", zh: "中三", py: "zhōng sān", en: "Sec 3", list: ["3C1A", "3C1B", "3C2A", "3C2B", "3C3A", "3C3B", "3C3C", "3HC3"] },
    { k: "4", zh: "中四", py: "zhōng sì",  en: "Sec 4", list: ["4C1", "4C2A", "4C2B", "4C3A", "4C3B", "4C3C", "4HC3"] }
  ];
  window.BV_CLASSES = {
    YEAR: BV_YEAR,
    LEVELS: BV_LEVELS,
    /* Full stored values for one level, e.g. "3" -> ["2026 3C1A", …]. */
    classesFor: function (lv) {
      for (var i = 0; i < BV_LEVELS.length; i++) {
        if (BV_LEVELS[i].k === String(lv)) {
          return BV_LEVELS[i].list.map(function (c) { return BV_YEAR + " " + c; });
        }
      }
      return [];
    },
    /* Is `v` one of this year's listed classes? Compared against the NORMALISED
       value (uppercase, single space) so a profile stored before this dropdown
       existed still matches if the student happened to type it correctly. */
    isKnown: function (v) {
      var n = normClass(v);
      if (!n) return false;
      for (var i = 0; i < BV_LEVELS.length; i++) {
        if (this.classesFor(BV_LEVELS[i].k).indexOf(n) !== -1) return true;
      }
      return false;
    },
    /* Which 年级 chip a stored value belongs under — the digit right after the
       year, so "2025 3HC3" (an old class we no longer list) still opens on 中三
       instead of leaving the student staring at four unselected chips. */
    levelOf: function (v) {
      var m = normClass(v).match(/^\d{4}\s+(\d)/);
      return m && m[1] >= "1" && m[1] <= "4" ? m[1] : "";
    },
    /* <option>s for one level. `sel` is the stored value, or "other". */
    optionsHtml: function (lv, sel) {
      var list = this.classesFor(lv);
      var known = list.indexOf(normClass(sel)) !== -1;
      var out = "";
      if (!known && sel !== "other") out += '<option value="" selected>请选择班级 Select class…</option>';
      for (var i = 0; i < list.length; i++) {
        out += '<option value="' + esc(list[i]) + '"' +
          (normClass(sel) === list[i] ? " selected" : "") + '>' + esc(list[i]) + '</option>';
      }
      out += '<option value="other"' + (sel === "other" ? " selected" : "") + '>其他 Others</option>';
      return out;
    },

    /* ---- the control itself, drawn ONCE and used in two places ----
       `我的档案` and the registration picker both need this two-step field, and
       the picker itself already exists twice (nickname.js on the landing page and
       at the pier, cs.js on a stream page — the copy predates this and is §18r's
       problem, not ours). Hand-writing the markup at each site would make FOUR
       copies of one control; this is one.

       `st` is any object with { classLevel, classPick, mtlClass } — the panel's
       draft and the picker's state both qualify. syncField() derives the first
       two from the third, which is the only field that is ever stored.
       `o` = { pfx, inputCls }: pfx namespaces the three element ids so a panel
       and a picker could coexist; inputCls is the host's own text-input class,
       because the registration screen and the profile panel style theirs
       differently and neither one is wrong. */
    syncField: function (st) {
      st.classLevel = this.levelOf(st.mtlClass);
      st.classPick = this.isKnown(st.mtlClass) ? normClass(st.mtlClass)
        : (st.mtlClass ? "other" : "");
    },
    fieldHtml: function (st, o) {
      o = o || {};
      var pfx = o.pfx || "bvc", inputCls = o.inputCls || "prof-input";
      var gloss = window.WSProfile && window.WSProfile.gloss
        ? window.WSProfile.gloss : function () { return ""; };
      var lv = st.classLevel;
      var chips = BV_LEVELS.map(function (L) {
        return '<button type="button" class="prof-chip' + (lv === L.k ? " on" : "") +
          '" data-lv="' + L.k + '">' + L.zh + gloss(L.zh, L.py, L.en) + '</button>';
      }).join("");
      return '<div class="prof-chips">' + chips + '</div>' +
        /* No level yet: the hint, UNLESS 其他 is already in play — a stored class
           whose level digit we cannot read (an old free-typed 「Sec 3 HC3」) lands
           here with its text in the box below, and telling that student to pick a
           level before choosing a class describes a box they are already past. */
        (lv
          ? '<select class="np-select" id="' + pfx + 'ClassSel" style="margin-top:8px">' +
              this.optionsHtml(lv, st.classPick) + '</select>'
          : (st.classPick === "other" ? ""
              : '<div class="pop-note" style="margin-top:8px">先点上面的年级，再选班级。' +
                  gloss("", "", "Choose your level first, then your class.") + '</div>')) +
        (st.classPick === "other"
          ? '<input type="text" class="' + inputCls + '" id="' + pfx + 'ClassOther" style="margin-top:8px" placeholder="例如：' +
              esc(BV_YEAR) + ' 3HC3" value="' + esc(st.mtlClass) + '">'
          : "");
    },
    /* Wire what fieldHtml drew. `redraw` is the host's own re-render — every
       branch here changes which controls exist, so there is nothing to update
       in place. */
    wireField: function (root, st, o, redraw) {
      o = o || {};
      var pfx = o.pfx || "bvc", self = this;
      Array.prototype.forEach.call(root.querySelectorAll(".prof-chip[data-lv]"), function (b) {
        b.onclick = function () {
          var k = b.getAttribute("data-lv");
          if (st.classLevel === k) return;
          st.classLevel = k;
          /* A level change abandons the class chosen under the old one. Keeping
             「2026 1C1」selected while the chips say 中三 is precisely the silent
             mismatch this two-step exists to remove. 其他 survives — the text in
             the box is the student's own and no level chip invalidates it. */
          if (st.classPick !== "other") { st.classPick = ""; st.mtlClass = ""; }
          redraw();
        };
      });
      var selEl = root.querySelector("#" + pfx + "ClassSel");
      if (selEl) selEl.onchange = function () {
        st.classPick = selEl.value;
        if (st.classPick === "other") {
          // was a listed class → start the free-text box empty rather than
          // pre-filled with the class they just said was not theirs
          if (self.isKnown(st.mtlClass)) st.mtlClass = "";
        } else {
          st.mtlClass = selEl.value;                 // "" (please-select) or a listed class
        }
        redraw();
      };
      var otherEl = root.querySelector("#" + pfx + "ClassOther");
      if (otherEl) otherEl.oninput = function () { st.mtlClass = otherEl.value; };
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
  /* `bio` text is the owner's, from DESIGN_头像与档案页.md §1.6. Two deliberate
     departures from the doc's raw text: curly quotes are rewritten as 「」 per the
     repo's code-embedded-text rule, and each 生肖 line folds its 地支 into the
     doc's own opening sentence (the doc's §1.6 heading asks for 排第几位 + 地支
     first, but its list carries the 地支 in the animal's NAME, which the card
     already shows above the bio). */
  var AVATAR_CATALOG = [
    { id: "pet_gui", file: "art/avatar/avatar_pet_gui.png", category: "pet", label: "瑞兽·龟", unlock: { gym: "中一" },
      bio: "传统故事里龟是长寿与稳重的象征，背负万物而不急不躁，古人常说「龟寿千年」形容长久安康。" },
    { id: "pet_qilin", file: "art/avatar/avatar_pet_qilin.png", category: "pet", label: "瑞兽·麒麟", unlock: { gym: "中二" },
      bio: "古代传说中的仁兽，性情温和，从不伤害任何生灵，只在太平盛世才会出现，象征吉祥美好。" },
    { id: "pet_feng", file: "art/avatar/avatar_pet_feng.png", category: "pet", label: "瑞兽·凤", unlock: { gym: "中三" },
      bio: "百鸟之王，象征尊贵、祥瑞与重生，传说凤凰浴火重生，代表不畏艰难、追求更好的自己。" },
    { id: "pet_long", file: "art/avatar/avatar_pet_long.png", category: "pet", label: "瑞兽·龙", unlock: { gym: "中四" },
      bio: "华人文化中最具代表性的祥瑞之兽，象征力量、智慧与吉祥，古人相信龙能呼风唤雨。" },
    { id: "jtw_tangseng", file: "art/avatar/avatar_jtw_tangseng.png", category: "jtw", price: 300, label: "西游记·唐僧",
      bio: "法号玄奘，是取经队伍的师父，一心向佛，意志坚定，无论路上多少艰难险阻都不曾放弃西行取经的信念。他心地善良、待人宽厚，是团队精神上的领路人。" },
    { id: "jtw_sunwukong", file: "art/avatar/avatar_jtw_sunwukong.png", category: "jtw", price: 500, label: "西游记·孙悟空",
      bio: "《西游记》里神通广大的齐天大圣，手持金箍棒，一个筋斗云能翻十万八千里。他机智勇敢、爱憎分明，一路降妖伏魔保护师父，是团队里最厉害的守护者，也常常因为冲动闯祸，学着收敛脾气、听取劝告。" },
    { id: "jtw_zhubajie", file: "art/avatar/avatar_jtw_zhubajie.png", category: "jtw", price: 350, label: "西游记·猪八戒",
      bio: "原是天上的天蓬元帅，因犯错被贬下凡投错猪胎，因此人身猪面。他手持九齿钉耙，性格贪吃贪睡、爱耍小聪明，常常闹笑话，但关键时刻仍愿意出力帮忙，为取经路上增添不少趣味。" },
    { id: "jtw_shaseng", file: "art/avatar/avatar_jtw_shaseng.png", category: "jtw", price: 300, label: "西游记·沙僧",
      bio: "原是天宫的卷帘大将，因犯错被贬下凡，在流沙河为妖，后来被唐僧收为徒弟。他手持月牙铲，个性忠厚老实、任劳任怨，一路默默挑担扛物，是团队里最踏实可靠的成员。" },
    { id: "jtw_bailongma", file: "art/avatar/avatar_jtw_bailongma.png", category: "jtw", price: 600, label: "西游记·白龙马", unlock: { pts: true },
      bio: "原是西海龙王的三太子，因犯错被贬，化身白马，驮着唐僧走完取经路。它任劳任怨、默默付出，虽然话不多、戏份少，却是让师徒四人能够顺利前行的重要伙伴。" },
    { id: "zodiac_rat", file: "art/avatar/avatar_zodiac_rat.png", category: "zodiac", label: "生肖·鼠",
      bio: "十二生肖排第 1 位（地支属「子」），为十二生肖之首，机灵敏捷，象征聪明与灵活应变。" },
    { id: "zodiac_ox", file: "art/avatar/avatar_zodiac_ox.png", category: "zodiac", label: "生肖·牛",
      bio: "十二生肖排第 2 位（地支属「丑」），勤劳踏实，任劳任怨，象征脚踏实地的耕耘精神。" },
    { id: "zodiac_tiger", file: "art/avatar/avatar_zodiac_tiger.png", category: "zodiac", label: "生肖·虎",
      bio: "十二生肖排第 3 位（地支属「寅」），威猛勇敢，被称为「百兽之王」，象征勇气与力量。" },
    { id: "zodiac_rabbit", file: "art/avatar/avatar_zodiac_rabbit.png", category: "zodiac", label: "生肖·兔",
      bio: "十二生肖排第 4 位（地支属「卯」），温和机敏，象征谨慎、平和与好运。" },
    { id: "zodiac_dragon", file: "art/avatar/avatar_zodiac_dragon.png", category: "zodiac", label: "生肖·龙",
      bio: "十二生肖排第 5 位（地支属「辰」），是十二生肖中唯一的神话生物，象征尊贵、权势与非凡志向。" },
    { id: "zodiac_snake", file: "art/avatar/avatar_zodiac_snake.png", category: "zodiac", label: "生肖·蛇",
      bio: "十二生肖排第 6 位（地支属「巳」），聪慧沉稳，被称为「小龙」，象征智慧与洞察力。" },
    { id: "zodiac_horse", file: "art/avatar/avatar_zodiac_horse.png", category: "zodiac", label: "生肖·马",
      bio: "十二生肖排第 7 位（地支属「午」），奔腾不息，象征自由、坚毅与勇往直前。" },
    { id: "zodiac_goat", file: "art/avatar/avatar_zodiac_goat.png", category: "zodiac", label: "生肖·羊",
      bio: "十二生肖排第 8 位（地支属「未」），温顺善良，象征和睦、知足常乐。" },
    { id: "zodiac_monkey", file: "art/avatar/avatar_zodiac_monkey.png", category: "zodiac", label: "生肖·猴",
      bio: "十二生肖排第 9 位（地支属「申」），机智活泼，象征灵活的思维与创造力。" },
    { id: "zodiac_rooster", file: "art/avatar/avatar_zodiac_rooster.png", category: "zodiac", label: "生肖·鸡",
      bio: "十二生肖排第 10 位（地支属「酉」），每天清晨啼叫报晓，象征勤奋与守时。" },
    { id: "zodiac_dog", file: "art/avatar/avatar_zodiac_dog.png", category: "zodiac", label: "生肖·狗",
      bio: "十二生肖排第 11 位（地支属「戌」），忠诚可靠，是人类最忠实的朋友，象征忠诚与守护。" },
    { id: "zodiac_pig", file: "art/avatar/avatar_zodiac_pig.png", category: "zodiac", label: "生肖·猪",
      bio: "十二生肖排第 12 位（地支属「亥」），也是最后一位，憨厚可爱，象征福气、富足与乐观的生活态度。" }
  ];
  var AVATAR_CAT_LABEL = { pet: "神兽", jtw: "西游记", zodiac: "生肖" };
  window.WSAvatars = AVATAR_CATALOG;
  function avatarById(id) {
    for (var i = 0; i < AVATAR_CATALOG.length; i++) if (AVATAR_CATALOG[i].id === id) return AVATAR_CATALOG[i];
    return null;
  }

  /* ---------- 头像取得 (HANDOFF_可玩头像精灵与解锁机制 v2 §3) ----------
     THREE routes, one verb per category, deliberately not blurred:
       12 生肖   免费 — free at registration, no cost and no condition, ever. This
                        is the category that guarantees every student a real choice
                        of identity on day one.
       5 西游记  购买 — bought with 灵露 (price on the catalog row). 白龙马 alone is
                        dual-gated: 历练值 must also have reached 踏云者.
       4 神兽    修得 — earned by passing that level's 年度试炼. NEVER purchasable,
                        at any price: they are the mastery tier.

     DERIVED, NOT STORED (§3.5) — for the two earned conditions. They are recomputed
     from the stream stores at render time, so no cached copy can drift. The ONE
     exception is a purchase: 灵露 is spent and gone, so it cannot be recomputed and
     must be persisted — in the GLOBAL profile (alongside avatarId), never in a
     per-stream store, or it would evaporate on opening another stream.

     UNION ACROSS STREAMS (§3.5). avatarId is global (ws2_profile) while every
     condition lives in a per-stream store (ws2_{stream}), so an avatar is unlocked
     if ANY stream satisfies its condition. Otherwise a 麒麟 earned in G3 would read
     as locked the moment the student opens G2. Also the only workable rule on the
     landing page and at 出发码头, where there is no current stream at all.

     ⚠️ PTS_UNLOCK duplicates the THIRD rung (踏云者) of cs.js's LADDER. Same
     standing duplication convention as teacher.html's palette: if LADDER moves,
     move this too. Each stream is compared against ITS OWN row — never take the
     highest pts.total and test it against one row. Per-stream because the ladder is
     tuned to the same fraction of each stream's projected 4-year total; a flat
     number would be reached fastest by HCL and slowest by G1, penalising exactly
     the students with the smallest word pool. Considered and rejected — do not
     "simplify" it to one number. */
  var PTS_UNLOCK = { g1: 2500, g2: 3100, g3: 3500, hcl: 4200 };
  var UNLOCK_STREAMS = ["g1", "g2", "g3", "hcl"];
  function streamStore(k) {
    try { return JSON.parse(localStorage.getItem("ws2_" + k)) || null; } catch (e) { return null; }
  }
  function gymPassedAnywhere(level) {
    for (var i = 0; i < UNLOCK_STREAMS.length; i++) {
      var s = streamStore(UNLOCK_STREAMS[i]);
      if (s && s.gym && s.gym[level]) return true;
    }
    return false;
  }
  function ptsGateMet() {
    for (var i = 0; i < UNLOCK_STREAMS.length; i++) {
      var k = UNLOCK_STREAMS[i], s = streamStore(k), tot = s && s.pts && s.pts.total;
      if (typeof tot === "number" && tot >= PTS_UNLOCK[k]) return true;
    }
    return false;
  }
  /* 已购买头像 — the global, persisted half of the model. Buy once, owned in every
     stream (§3.5). */
  function ownedAvatars() {
    var p = load() || {};
    return Array.isArray(p.avatarsOwned) ? p.avatarsOwned : [];
  }
  function walletLingLu() { return (_provider && _provider.wallet) ? _provider.wallet() : null; }
  /* same icon + ✨ fallback the camp wallet uses; the path is page-root relative, so
     it resolves on the landing page and at 出发码头 too */
  function lingLuHtml() { return '<img class="ling-icon" src="art/camp/linglu.png" alt="灵露" onerror="this.outerHTML=\'✨\'">'; }

  /* Returns null when the avatar is available, else a lock descriptor:
       { why }           the sentence to show
       { price }         set when the block can be lifted by paying
       { canBuy }        true when a wallet is reachable AND holds enough 灵露
       { blocked:"pts" } the 历练值 gate is what is blocking, so the price is moot
     Never hide a locked avatar (§3.6): seeing what can be earned or bought is the
     whole motivation. */
  function avatarLock(id) {
    var a = avatarById(id);
    if (!a || (!a.unlock && !a.price)) return null;
    /* Grandfather whatever the student is already wearing. Two real cases, not
       hypotheticals: (1) 西游记 avatars were FREE until this shipped, so a student
       already wearing 孙悟空 must not be asked to buy back what they already have;
       (2) store.gym only started syncing to the cloud with this change, so an
       earned 神兽 could otherwise vanish after a device switch. Nothing in the app
       can un-earn an avatar, so nothing is taken away here either. */
    var cur = load();
    if (cur && cur.avatarId === id) return null;
    /* 神兽: mastery only. Checked before price so no future edit can accidentally
       make one purchasable. */
    if (a.unlock && a.unlock.gym) {
      return gymPassedAnywhere(a.unlock.gym) ? null
        : { why: "通过「" + a.unlock.gym + " 年度试炼」后解锁" };
    }
    if (a.price) {
      if (ownedAvatars().indexOf(a.id) !== -1) return null;    // bought already
      /* 白龙马: the 历练值 threshold is the BLOCKING condition, so it is stated first —
         the price means nothing until it lifts (§3.6). */
      if (a.unlock && a.unlock.pts && !ptsGateMet()) {
        var st = _provider && _provider.stream, n = st && PTS_UNLOCK[st];
        return { blocked: "pts", price: a.price, btn: "🔒 尚未解锁",
          why: n ? ("历练值达 " + n + "（段位「踏云者」）后可兑换")
                 : "历练值达到段位「踏云者」后可兑换" };
      }
      var have = walletLingLu();
      /* no wallet in reach: the landing page and 出发码头 have no stream, so there is
         no wallet to spend from — say where to go, never 「灵露不足」 */
      if (have == null) return { price: a.price, btn: "🔒 到科目页里兑换", why: "灵露 " + a.price + " · 到科目页里兑换" };
      if (have < a.price) return { price: a.price, btn: "🔒 灵露不足", why: "灵露 " + a.price + "（还差 " + (a.price - have) + "）" };
      return { price: a.price, canBuy: true, why: "灵露 " + a.price + " · 立即兑换" };
    }
    return null;
  }
  function isAvatarUnlocked(id) { return !avatarLock(id); }
  /* The ONLY writer of avatarsOwned. Deducts from the CURRENT stream's wallet through
     cs.js (which owns the store) and only records the purchase if the deduction
     actually happened — a purchase that debits but fails to persist is the worst
     possible bug here, so the order is deduct → verify → persist. */
  function buyAvatar(id) {
    var a = avatarById(id);
    if (!a || !a.price) return false;
    if (ownedAvatars().indexOf(id) !== -1) return true;
    var lk = avatarLock(id);
    if (!lk || !lk.canBuy) return false;
    if (!(_provider && _provider.spend && _provider.spend(a.price))) return false;
    var owned = ownedAvatars().slice();
    owned.push(id);
    save({ avatarsOwned: owned });
    if (_provider.onChanged) _provider.onChanged();   // repaint the wallet on the home screen
    return true;
  }

  /* ================= 船只 · 四级 (owner 2026-08-16) =================
     Four hulls that already existed as art, unified into one family:
       1 朴素舢板 · 2 彩绘舢板 · 3 简朴帆船 · 4 华丽帆船
     ⚠️ TIER 2 IS THE OLD SEA-MAP BOAT. Until today art/seamap/boat_*.png sailed
     the landing map for everyone and had no connection to anything owned, while
     the pier sold a separate 3-tier chain. Tier 2 is that sprite, byte-identical,
     so a student who buys it sees exactly the boat the map used to show.

     ⚠️ DUAL CURRENCY — a deliberate, owner-approved narrowing of the waterline
     rule, and the reasoning must survive: CLAUDE.md says 贝壳 and 灵露 "永不互换,
     方向都不行". That still holds. The seal forbids CONVERSION, and two
     independent prices are not a conversion: there is no resale, so value can
     never move between the purses. What changed is only that a boat is now a
     LANDING-PAGE cosmetic (it sails the sea map), so gating it behind dock-only
     currency would lock it away from the CL students who never enter the pier.
     ⚠️ Do NOT generalise this into an exchange rate, and do NOT add a second
     dual-priced good without the same argument holding.

     ⚠️ OWNERSHIP IS GLOBAL, in ws2_profile beside avatarsOwned — NOT in a stream
     store and NOT in ws_xh. Bought once, sailed everywhere, whichever purse paid.
     Same reason avatarsOwned lives here: a per-stream record would evaporate the
     moment the student opened a different subject. */
  var BOATS = [
    { t: 1, zh: "朴素舢板", en: "Plain sampan",   shells: 0,   ling: 0 },
    { t: 2, zh: "彩绘舢板", en: "Painted sampan", shells: 80,  ling: 250 },
    { t: 3, zh: "简朴帆船", en: "Fishing junk",   shells: 200, ling: 550 },
    { t: 4, zh: "华丽帆船", en: "Ornate junk",    shells: 400, ling: 1000 }
  ];
  function boatByTier(t) {
    for (var i = 0; i < BOATS.length; i++) if (BOATS[i].t === t) return BOATS[i];
    return null;
  }
  /* tier 1 is free and always owned, exactly as the camp's 帆布帐篷 is */
  function ownsBoat(t) {
    if (t === 1) return true;
    var p = load() || {};
    return !!(p.boatsOwned && p.boatsOwned[String(t)]);
  }
  function ownedBoats() {
    return BOATS.filter(function (b) { return ownsBoat(b.t); }).map(function (b) { return b.t; });
  }
  /* Purchase stays SEQUENTIAL (you cannot skip to 华丽帆船), same contract as the
     camp dwelling chain. DISPLAY is free: owner 2026-08-16 —「players who have
     earned a higher level boat should be able to choose from any boat in their
     collection」— so the ladder is about earning, not about what you must show. */
  function boatBuyable(t) {
    var b = boatByTier(t);
    if (!b || !b.shells) return false;         // tier 1 is not for sale
    if (ownsBoat(t)) return false;
    return ownsBoat(t - 1);
  }
  function boatPick() {
    var p = load() || {};
    var t = parseInt(p.boatPick, 10);
    /* clamp to something actually owned: a stale pick (or a hand-edited profile)
       must never render a boat the student does not have */
    if (!t || !ownsBoat(t)) {
      var own = ownedBoats();
      return own.length ? own[own.length - 1] : 1;
    }
    return t;
  }
  function setBoatPick(t) {
    if (!ownsBoat(t)) return false;
    save({ boatPick: t });
    return true;
  }
  /* Record ownership. ⚠️ NEVER call this before the payment has actually gone
     through — same deduct → verify → persist order as buyAvatar, because a debit
     that fails to persist is the worst bug available here. */
  function grantBoat(t) {
    if (!boatByTier(t)) return false;
    var p = load() || {}, owned = {};
    if (p.boatsOwned) for (var k in p.boatsOwned) if (p.boatsOwned[k]) owned[k] = 1;
    owned[String(t)] = 1;
    save({ boatsOwned: owned, boatPick: t });    // wear what you just bought
    return true;
  }
  /* 灵露 purchase, from the CURRENT stream's wallet via cs.js's provider hook.
     Identical shape to buyAvatar; the 贝壳 half lives in xh.js, which owns that purse. */
  function buyBoatLingLu(t) {
    var b = boatByTier(t);
    if (!b || !b.ling || !boatBuyable(t)) return false;
    if (!(_provider && _provider.spend && _provider.spend(b.ling))) return false;
    grantBoat(t);
    if (_provider.onChanged) _provider.onChanged();
    return true;
  }
  function boatArt(t, dir) {
    return "art/xh/boat_t" + (t || 1) + "_" + (dir || "broadside") + ".png";
  }
  /* ⚠️ ONE-TIME MIGRATION from the pier's old 3-tier store.boat. Old numbering was
     舢板 1 / 渔船 2 / 帆船 3 = plain sampan / simple junk / ornate junk. The colourful
     sampan was inserted at 2, so the two PAID boats shift up: 2 -> 3, 3 -> 4.
     Without this a student who paid 300 贝壳 for the ornate junk would silently be
     holding the simple one. Called by xh.js, which is the only file that can read
     ws_xh. Idempotent: it only ever adds. */
  function migrateDockBoat(oldTier) {
    var t = parseInt(oldTier, 10);
    if (!t || t < 2) return;                       // 1 (or nothing) needs no migration
    var mapped = t === 2 ? 3 : 4;
    var p = load() || {};
    if (p.boatsOwned && p.boatsOwned[String(mapped)]) return;   // already migrated
    var owned = {};
    if (p.boatsOwned) for (var k in p.boatsOwned) if (p.boatsOwned[k]) owned[k] = 1;
    /* sequential ownership: holding tier 4 implies you climbed through 3 */
    for (var i = 2; i <= mapped; i++) owned[String(i)] = 1;
    save({ boatsOwned: owned, boatPick: p.boatPick || mapped });
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

  /* ================= 拼音 / 英文 闸门：落地页与档案页 (owner 2026-08-17) =========
     「make sure the landing page and profile registration screen has English and
     pinyin toggle so that non chinese users can also create their profile with ease」

     The two aids existed on all five activity pages and NOWHERE on the way in: the
     landing page and the nickname/registration flow are the first two screens anyone
     sees, and they were Chinese-only. A parent or a non-CL student could not read the
     screen where they choose who they are.

     ⚠️ THE PREFERENCE IS GLOBAL, in ws2_profile beside the nickname — not per stream.
     This is an identity screen that belongs to no stream, and §4 lists identity as one
     of exactly three things allowed to cross the waterline. It does NOT touch
     store.pyAid / store.enAid: those are per-stream, the streams own their own
     toggles, and quietly rewriting them from here would change what a student sees
     inside an activity they never opened.

     ⚠️ DEFAULT ON, both of them — the opposite of the mountains' default and for the
     same reason the pier defaults on: this screen's whole job is to be understood by
     someone who cannot read it yet. Immersion is what the ACTIVITIES are for.

     ⚠️ NOTHING HERE APPLIES ITSELF. A page must call ownAid() to say「no engine on
     this page owns body.py-aid」. cs.js and xh.js drive those classes from their own
     per-stream settings, and a second writer would fight them on every render — the
     landing page is the only page with no engine, so it is the only caller. */
  var _ownAid = false;
  function aidOn(k) {
    var p = load() || {};
    return p[k] !== false;                 // default ON, and only an explicit false is off
  }
  function aidPy() { return aidOn("aidPy"); }
  function aidEn() { return aidOn("aidEn"); }
  /* ⚠️ BOTH CLASS FAMILIES, exactly like fbGloss below: the landing page loads
     cs.css, a future caller might load xh.css, and an unrecognised class name is
     inert. That is cheaper than sniffing which stylesheet is present. */
  function applyAid() {
    if (!_ownAid || !document.body) return;
    var b = document.body, py = aidPy(), en = aidEn();
    b.classList.toggle("py-aid", py);
    b.classList.toggle("xh-py-on", py);
    b.classList.toggle("en-aid", en);
    b.classList.toggle("xh-en-on", en);
  }
  function ownAid(v) { _ownAid = (v !== false); applyAid(); }
  /* the same two pills the stream topbars use, same classes, so there is one visual
     control for this idea across the whole platform. ⚠️ EN FIRST, matching cs.js and
     (since 2026-08-16) the pier — the order was aligned once already, do not re-flip
     it here. */
  function aidPillsHtml() {
    if (!_ownAid) return "";
    return '<button class="tb-en' + (aidEn() ? " on" : "") + '" id="wsAidEn" type="button" ' +
      'title="中文 / English" aria-label="English hints 英文提示" ' +
      'aria-pressed="' + (aidEn() ? "true" : "false") + '">' +
      '<span class="tb-en-zh">中</span><span class="tb-en-en">EN</span></button>' +
      '<button class="tb-py' + (aidPy() ? " on" : "") + '" id="wsAidPy" type="button" ' +
      'title="拼音提示 Pinyin" aria-label="拼音提示 Pinyin hints" ' +
      'aria-pressed="' + (aidPy() ? "true" : "false") + '">' +
      '<span class="tb-py-zh">拼</span><span class="tb-py-lab">拼音</span></button>';
  }
  /* ⚠️ A CLASS FLIP, NEVER A RE-RENDER (§10). On the mountain a re-render on toggle
     is a leak — it re-draws the distractors. Nothing on the landing page has
     distractors, but keeping the same mechanism means the habit survives when this
     helper is reused somewhere that does. */
  function wireAidPills(root) {
    var scope = root || document;
    [["wsAidEn", "aidEn"], ["wsAidPy", "aidPy"]].forEach(function (pair) {
      var b = scope.querySelector ? scope.querySelector("#" + pair[0]) : null;
      if (!b) return;
      b.onclick = function () {
        var p = load() || {}, on = !aidOn(pair[1]);
        p[pair[1]] = on;
        save(p);
        applyAid();
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      };
    });
  }

  /* ================= 进度码 · 换设备时的「先认领身份」 (owner 2026-08-16) ========
     A student on a new device gets a NEW anonymous uid, so the cloud merge cannot
     find them — the 进度码 is the only way back. But the nickname picker runs
     BEFORE any of that, and rolling a fresh name there is exactly what strands the
     old progress under an identity nobody will type again.

     ⚠️ This file still does not DECODE a code — decoding needs the stream's word
     order to turn the bitmask into ids, and the landing page has no word data.
     peekCode() only reads the envelope: it verifies the checksum and pulls out the
     stream, the word count and the owner's nickname. That is enough to (a) prove
     the code is genuine, (b) adopt the right nickname, and (c) hand the real
     restore to the stream page, where commitProgress — the ONLY writer — still
     does it behind the existing confirm / snapshot / undo / logRestore path.

     ⚠️ fnv1a and b64urlToUtf8 are duplicated from cs.js on purpose. They are the
     wire format: changing either would invalidate every code ever issued, so they
     can never drift. Do NOT "share" them by importing cs.js — this file is loaded
     on the landing page, where cs.js is not. */
  function _fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36);
  }
  function _b64urlToUtf8(b) {
    try {
      var t = String(b).replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      return decodeURIComponent(escape(atob(t)));
    } catch (e) { return ""; }
  }
  /* ⚠️ CODE_LABEL, NOT STREAM_LABEL — and the rename is a BUG FIX, not tidying. There is a
     SECOND `var STREAM_LABEL` further down (the short labels the 我的进度 rows use), and two
     `var`s of one name in one scope means the later assignment wins for everything that runs
     after it. Adding `xh` to this one therefore did nothing: the pier section was written into
     every code and then silently dropped on decode, because decodeAll's own
     `if (!STREAM_LABEL[sec])` guard was reading the OTHER table. The code looked right, the
     summary was simply missing a land.
     ⚠️ Do not merge the two tables. They print in different places and at different lengths
     («出发码头 · 学海起步» in a code summary, «词圣鸿文苑 HCL» in a one-line progress row). */
  var CODE_LABEL = { g1: "词星大冒险 · G1 基础华文", g2: "词将竞技场 · G2 普通学术华文",
                     g3: "词王淬炼坊 · G3 快捷华文", hcl: "词圣鸿文苑 · 高级华文",
                     xh: "出发码头 · 学海起步" };

  /* ================= VS3 · ONE CODE FOR ALL FIVE LANDS (owner 2026-08-17) =========
     owner: 「is progress code shared across all 5 sections (pier and mountains)? they
     need to be since the student is not going to take down all 5 if they differ.」
     They were NOT. There were four codes (one per mountain, each rejecting the other
     three) and the pier had none at all — a pier student who changed device lost
     everything with no way back. VS3 is one string covering all five.

     FORMAT
       VS3.{sec}~{sec}~….{nickB64}.{ck}
       mountain sec: {stream}:{n}:{b64 mastered bitmask}:{a-b-c-d-e records}
       pier     sec: xh:{nWords}:{b64 done bitmask}:{nPhrases}:{b64 readLines bitmask}
     ⚠️ THE SEPARATORS ARE CHOSEN, NOT ARBITRARY. base64url's alphabet is
     [A-Za-z0-9-_], so `-` and `_` can appear inside a bitmask and are unusable as
     delimiters at any level that touches one. `.` `~` `:` cannot occur in base64url,
     which is why VS2 could already put `-`-joined records in their own `.`-field.
     ⚠️ Bitmasks are POSITIONAL over the published word order, which project rule makes
     append-only (new words go at the end of their 板块, §5), so a code survives vocab
     additions. This is also why the codec needs the data files at all.

     WHY THIS LIVES IN profile.js
     ⚠️ It is the only file loaded on all six pages, so the code stops being a property
     of the page the student happens to be on. The landing page can now produce and
     restore one, which is the whole point: a student on a new device has not chosen a
     subject yet.
     ⚠️ THE WATERLINE IS NOT CROSSED (§4). The guarantee that matters is「cs.js never
     reads ws_xh, xh.js never touches ws2_*」and it still holds exactly: neither engine
     gained a line. profile.js is the identity layer, which §4 already allows across,
     and carrying two stores side by side in a backup is TRANSPORT, not EXCHANGE —
     restore puts pier numbers back in ws_xh and mountain numbers back in ws2_{stream}.
     Nothing converts, no rate is implied.
     ⚠️ THE LIVE SECTION IS STILL WRITTEN BY ITS OWN ENGINE. Whichever section the
     current page owns goes through _provider.commit(); the other four are written
     straight to localStorage, which is safe precisely because nothing else is holding
     them in memory. Writing the live one directly would be overwritten by the next
     saveStore()/save() from that engine.

     WHAT IS DELIBERATELY NOT IN THE CODE
     ⚠️ THE NO-CURRENCY RULE BELOW WAS OVERRIDDEN BY THE OWNER ON 2026-08-19 — READ THE
     WHOLE PARAGRAPH BEFORE ACTING ON EITHER HALF. Currency is to be restored, because
     device repair and replacement are common enough that permanently losing 灵露 / 贝壳
     is a real motivational cost, and it falls hardest on the students who played most.
     ⚠️ THE ANALYSIS BELOW IS STILL CORRECT AND IS NOT REPEALED. It is now honoured by a
     different mechanism — the virgin-account gate (CLAUDE.md §18ae): monotonic fields
     (mastery / records / ownership) merge as they always did, while SNAPSHOT fields
     (灵露, 贝壳, items, equip, berth) are written ONLY into an account that is still
     untouched. Re-claiming therefore requires wiping the account first, which destroys
     the purchase too, so the net gain is zero.
     ⚠️ THE SNAPSHOT MUST BE APPLIED ATOMICALLY. Restoring the wallet while merging
     ownership by union lets the avatar survive the wipe and re-opens the exploit. This
     is the load-bearing decision; if you are here to remove the gate, the paragraph
     below is what it is protecting.
     ⚠️ NO CURRENCY AND NO EFFORT TOTALS — no 灵露, no 贝壳, no 历练值, no 航海值. VS2 left
     them out and VS3 keeps that line, for a reason that is not tidiness: spend 200 灵露
     on an avatar, restore an older code, and you would have the avatar AND the 200 back.
     Mastery and records merge monotonically (union / max) so restoring twice changes
     nothing — that property is what makes restore safe, and currency does not have it.
     ⚠️ NO store.stats (per-word shown/wrong): it is large, it is not progress, and the
     只增不减 promise cannot be honoured for a ratio. */
  var CODE_STREAMS = ["g1", "g2", "g3", "hcl"];
  var _orders = null;          // { g1:[id,…], …, xh:[词语,…], xhPhr:[phraseId,…] }
  var _ordersAt = 0;

  /* Fetch the five published files ONCE per page and cache the orders.
     ⚠️ It reads the PUBLISHED json, never a master list — same rule the search index
     follows (§5), so an index can never disagree with what students are running.
     ⚠️ Failure is per-file and non-fatal: a section whose order is missing is SKIPPED,
     never guessed. A guessed order would silently write the wrong words as mastered,
     which is far worse than an incomplete code — and the panel says which are missing.
     ⚠️ ASSET_V, so the fetch rides the same cache-busting the engines use (§3). */
  function loadOrders(cb) {
    if (_orders) return cb(_orders);
    var out = { xhPhr: null }, pending = CODE_STREAMS.length + 2;
    function done() { if (--pending === 0) { _orders = out; _ordersAt = 1; cb(out); } }
    CODE_STREAMS.forEach(function (k) {
      out[k] = null;
      fetch("data/" + k + ".json" + WS_ASSET_V_Q())
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          var ids = [];
          (j.levels || []).forEach(function (lv) {
            (lv.units || []).forEach(function (u) {
              (u.components || []).forEach(function (c) {
                (c.words || []).forEach(function (w) { ids.push(w.id); });
              });
            });
          });
          out[k] = ids.length ? ids : null;
        })
        .catch(function () { out[k] = null; })
        .then(done);
    });
    fetch("data/xh_v3.json" + WS_ASSET_V_Q())
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (rows) {
        out.xh = (rows || []).map(function (w) { return w["词语"]; });
        if (!out.xh.length) out.xh = null;
      })
      .catch(function () { out.xh = null; })
      .then(done);
    fetch("data/xh_phrases.json" + WS_ASSET_V_Q())
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (doc) {
        out.xhPhr = ((doc && doc.phrases) || []).map(function (p) { return p.id; });
        if (!out.xhPhr.length) out.xhPhr = null;
      })
      .catch(function () { out.xhPhr = null; })
      .then(done);
  }
  function WS_ASSET_V_Q() { return WS_ASSET_V ? "?v=" + WS_ASSET_V : ""; }

  /* ---- bit plumbing. ⚠️ The `keys` order IS the wire format; do not sort it. ---- */
  function bitsToB64(order, has) {
    var bytes = [], i;
    for (i = 0; i < Math.ceil(order.length / 8); i++) bytes.push(0);
    order.forEach(function (k, ix) { if (has(k)) bytes[ix >> 3] |= (1 << (ix & 7)); });
    /* ⚠️ DROP THE TRAILING ZERO BYTES (owner 2026-08-19：「is there a way for the student
       to enter a shorter code」). The mask carried one bit for EVERY word in the stream —
       1,069 bits for G3 whether the student had mastered 30 words or 900 — so everything
       after their last mastered word was zeros being typed out by hand. A G3 newcomer's
       section goes 179 → 12 characters; a whole five-land code roughly halves.
       ⚠️ THIS IS SAFE WITHOUT A FORMAT VERSION BUMP, and the reason is precise: b64ToKeys
       reads `bin.charCodeAt(i >> 3)`, which returns NaN past the end of the string, and
       `NaN & x` is 0 in JS. A short mask therefore decodes as「those words are not
       mastered」— exactly what the dropped zero bytes meant. Verified in WebKit against
       the UNMODIFIED decoder: identical output at 30 / 200 / 600 mastered words.
       ⚠️ So codes already in students' inboxes keep working, and a code minted here is
       still readable by an older build. Do NOT「tidy」this by padding the mask back out.
       ⚠️ The `n` field still carries the land's FULL word count — it validates the mask
       length and is what b64ToKeys clamps to. It is not the mask's length. */
    while (bytes.length && bytes[bytes.length - 1] === 0) bytes.pop();
    var bin = "";
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  /* returns the subset of `order` whose bit is set, or null if the field is unreadable */
  function b64ToKeys(b64, order, n) {
    var t = String(b64 || "").replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    var bin;
    try { bin = atob(t); } catch (e) { return null; }
    var out = [], max = Math.min(n || order.length, order.length);
    for (var i = 0; i < max; i++) {
      if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) out.push(order[i]);
    }
    return out;
  }
  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
  }
  function storeKeyFor(sec) { return sec === "xh" ? "ws_xh" : "ws2_" + sec; }

  /* Build the whole code. Async because it needs the word orders.
     ⚠️ A section with no local store is OMITTED, not written as empty: an empty section
     would restore as「zero mastered」on the other device, and the merge is only safe
     because it is a union. Omission means「this code says nothing about that land」. */
  /* ================= VS4 · 经济数据进入进度码 (owner 2026-08-19) =================
     The offline twin of the 恢复码. VS3 carried mastery only; this adds the economy so a
     student with no network still gets their 灵露 / 贝壳 / 营地 / 海滩 back.
     ⚠️ SAFE ONLY BECAUSE OF THE VIRGIN-ACCOUNT GATE — the same gate the 恢复码 uses.
     Monotonic fields merge as always; the economy is a SNAPSHOT applied only into an
     untouched account. Remove the gate and the duplication exploit is back (see the
     WHAT IS DELIBERATELY NOT IN THE CODE block above, which is kept for exactly that
     reason).
     ⚠️ Keys are one or two characters because a child retypes this string.
     ⚠️ `wins` IS INCLUDED (owner 2026-08-19, VS4 handoff §7a): without it a wiped-and-
     restored student re-farms already-milked words at full 灵露 rate. It is the single
     biggest field here, which is the price of closing that.
     ⚠️ `decoPos` / `berthPos` ARE OMITTED (owner, §7b): items come back OWNED but in
     their default berths. They were the cheapest thing to drop per character saved.
     ⚠️ EMPTY VALUES ARE OMITTED ENTIRELY, so a student with no economy adds ~4 chars. */
  function ecoBlob() {
    var eco = { v: 1 }, m = {}, any = false;
    function put(o, k, v) {
      if (v == null) return;
      if (typeof v === "number" && !v) return;
      if (typeof v === "object" && !Object.keys(v).length) return;
      o[k] = v; any = true;
    }
    ["g1", "g2", "g3", "hcl"].forEach(function (k) {
      var st = lsGet("ws2_" + k);
      if (!st) return;
      var o = {};
      put(o, "l", st.lingLu || 0);
      put(o, "i", st.items || {});
      put(o, "s", st.itemSlots || {});
      put(o, "e", st.equip || {});
      put(o, "d", st.deco || {});
      put(o, "w", st.wins || {});
      if (Object.keys(o).length) m[k] = o;
    });
    if (Object.keys(m).length) { eco.m = m; any = true; }
    var x = lsGet("ws_xh");
    if (x) {
      var o2 = {};
      put(o2, "sh", x.shells || 0);
      put(o2, "o", x.owned || {});
      put(o2, "b", x.berth || {});
      if (Object.keys(o2).length) eco.x = o2;
    }
    var prof = load() || {}, p2 = {};
    if (prof.avatarsOwned && prof.avatarsOwned.length) { p2.av = prof.avatarsOwned; any = true; }
    /* ⚠️ boatsOwned is a MAP (tier -> 1) and boatPick is which is currently sailed.
       The VS4 handoff's table called this「boats owned, max tier」— the right CLASS
       (monotonic) but the wrong SHAPE, which is exactly why it says to confirm against
       the live repo. Carrying the map keeps every tier the student paid for; carrying
       boatPick keeps them sailing the one they chose. */
    if (prof.boatsOwned && Object.keys(prof.boatsOwned).length) { p2.bo = prof.boatsOwned; any = true; }
    if (prof.boatPick) { p2.bp = prof.boatPick; any = true; }
    if (Object.keys(p2).length) eco.p = p2;
    return any ? eco : null;
  }

  function encodeAll(cb) {
    loadOrders(function (ord) {
      var secs = [], missing = [];
      CODE_STREAMS.forEach(function (k) {
        if (!ord[k]) { missing.push(CODE_LABEL[k]); return; }
        var s = lsGet("ws2_" + k);
        if (!s) return;
        var m = s.mastered || {}, best = s.best || {};
        var mask = bitsToB64(ord[k], function (id) { return !!m[id]; });
        var rec = [s.bestStreak || 0, best.rain || 0, best.handle || 0,
                   best.assemble || 0, best.sprint || 0].join("-");
        secs.push(k + ":" + ord[k].length + ":" + mask + ":" + rec);
      });
      if (ord.xh) {
        var x = lsGet("ws_xh");
        if (x) {
          var d = x.done || {}, rl = x.readLines || {};
          var dm = bitsToB64(ord.xh, function (w) { return !!d[w]; });
          /* ⚠️ readLines rides along because it is the ONLY record of 句子卡 and 走进社区
             exposure (§18n) and it is a set, so it merges as a union like everything else
             here. It is still NOT progress on arrival: commit writes it back to
             store.readLines and nothing else reads it. */
          var pm = ord.xhPhr ? bitsToB64(ord.xhPhr, function (id) { return !!rl[id]; }) : "";
          secs.push("xh:" + ord.xh.length + ":" + dm + ":" +
                    (ord.xhPhr ? ord.xhPhr.length : 0) + ":" + pm);
        }
      } else { missing.push(CODE_LABEL.xh); }
      if (!secs.length) return cb(null, missing);
      /* ⚠️ EVERYTHING BEFORE THE ECO FIELD IS BYTE-IDENTICAL TO VS3, and the checksum is
         still computed over the whole payload — now including the eco field, so a
         truncated blob fails the checksum and the WHOLE code is rejected rather than
         restoring half an account.
         ⚠️ ecoB64 is base64url, which cannot contain `.`, so it is safe in a `.`-field.
         Do not invent a new separator (see the format note above). */
      var eco = ecoBlob();
      var head = (eco ? "VS4." : "VS3.") + secs.join("~") + "." +
                 utf8ToB64urlP((load() || {}).nickname || "");
      if (eco) head += "." + utf8ToB64urlP(JSON.stringify(eco));
      cb(head + "." + _fnv1a(head), missing);
    });
  }
  function utf8ToB64urlP(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) { return ""; }
  }

  /* PURE planner. Returns {ok, sections:[{sec, label, addKeys, rec, phr}], codeNick,
     mismatch?, legacy?} or {err}. Never writes.
     ⚠️ ALL WHITESPACE IS STRIPPED, not just trimmed. A VS3 code runs to ~800 characters
     and the documented way to keep one is「email it to yourself」 — every mail client on
     the planet will hard-wrap that, and a student pasting a wrapped code back would
     otherwise get「已损坏」on a code that is perfectly intact.
     ⚠️ VS2 and VS1 STILL DECODE, and they now decode from ANY page: the old codec could
     only read a code for the stream whose word list happened to be in memory, so a G3
     code pasted on the G2 page was rejected. Same bytes, better reach. */
  function decodeAll(code, ord) {
    var raw = String(code || "").replace(/\s+/g, "");
    if (!raw) return { err: "请先粘贴进度码。" };
    var p = raw.split(".");
    var myNick = (load() || {}).nickname || "";

    if (p[0] === "VS3" || p[0] === "VS4") {
      /* ⚠️ A VS4 DECODER MUST ACCEPT VS3 CODES. Students are holding VS3 strings today
         and those must keep working — a VS3 code simply restores mastery and skips the
         economy. The only structural difference is one extra field. */
      var nF = (p[0] === "VS4") ? 5 : 4;
      if (p.length !== nF) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (_fnv1a(p.slice(0, nF - 1).join(".")) !== p[nF - 1]) {
        return { err: "进度码不完整或已损坏，请重新复制一次。" };
      }
      var secs = [], bad = 0;
      p[1].split("~").forEach(function (chunk) {
        var f = chunk.split(":"), sec = f[0];
        if (!CODE_LABEL[sec]) { bad++; return; }
        var order = sec === "xh" ? ord.xh : ord[sec];
        if (!order) { bad++; return; }
        var n = parseInt(f[1], 10) || 0;
        if (n > order.length) { bad++; return; }   // code newer than this build's data
        var keys = b64ToKeys(f[2], order, n);
        if (!keys) { bad++; return; }
        var entry = { sec: sec, label: CODE_LABEL[sec], addKeys: keys };
        if (sec === "xh") {
          var pn = parseInt(f[3], 10) || 0;
          entry.phr = (ord.xhPhr && f[4]) ? (b64ToKeys(f[4], ord.xhPhr, pn) || []) : [];
        } else {
          entry.rec = String(f[3] || "").split("-").map(function (x) {
            return parseInt(x, 10) || 0;
          });
        }
        secs.push(entry);
      });
      if (!secs.length) return { err: "进度码里没有可以恢复的内容。" };
      var nick = _b64urlToUtf8(p[2]);
      /* ⚠️ A CORRUPT ECO FIELD IS NOT A PARTIAL RESTORE. The checksum above already
         covers it, so reaching here means the bytes are intact; if JSON.parse still
         fails the field is dropped and mastery restores alone, which is the same
         outcome as a VS3 code. What must never happen is half an economy landing. */
      var eco = null;
      if (p[0] === "VS4") {
        try { eco = JSON.parse(_b64urlToUtf8(p[3])); } catch (e) { eco = null; }
        if (eco && eco.v !== 1) eco = null;
      }
      return { ok: true, sections: secs, codeNick: nick, skipped: bad, eco: eco,
               mismatch: !!(nick && nick !== myNick) };
    }

    /* ---- legacy single-stream codes ---- */
    if (p[0] === "VS2" || p[0] === "VS1") {
      var isV2 = p[0] === "VS2";
      if (p.length !== (isV2 ? 7 : 5)) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (isV2 && _fnv1a(p.slice(0, 6).join(".")) !== p[6]) {
        return { err: "进度码不完整或已损坏，请重新复制一次。" };
      }
      var st = p[1];
      if (!CODE_LABEL[st] || st === "xh") return { err: "进度码里的科目无法识别。" };
      if (!ord[st]) return { err: "这个科目的词库还没载入，请稍后再试。" };
      var nn = parseInt(p[2], 10) || 0;
      if (!(nn > 0) || nn > ord[st].length) return { err: "进度码与当前词库不匹配。" };
      var ks = b64ToKeys(p[3], ord[st], nn);
      if (!ks) return { err: "进度码无法解析，请检查是否完整复制。" };
      var nk = isV2 ? _b64urlToUtf8(p[5]) : "";
      return { ok: true, legacy: !isV2, skipped: 0, codeNick: nk,
               mismatch: !!(nk && nk !== myNick),
               sections: [{ sec: st, label: CODE_LABEL[st], addKeys: ks,
                            rec: String(p[4] || "").split("-").map(function (x) {
                              return parseInt(x, 10) || 0;
                            }) }] };
    }
    return { err: "进度码格式不正确，请检查是否完整复制。" };
  }

  /* how many entries the plan would ADD that the device does not already have — the
     number the confirm dialog promises. ⚠️ Counted per section against that section's
     own store, never totalled across the waterline into one figure (§4.1). */
  function planDelta(plan) {
    var rows = [], addTotal = 0, haveTotal = 0;
    (plan.sections || []).forEach(function (s) {
      var cur = lsGet(storeKeyFor(s.sec)) || {};
      var mine = s.sec === "xh" ? (cur.done || {}) : (cur.mastered || {});
      var have = Object.keys(mine).length;
      var newly = s.addKeys.filter(function (k) { return !mine[k]; }).length;
      rows.push({ sec: s.sec, label: s.label, code: s.addKeys.length,
                  have: have, newly: newly });
      addTotal += newly; haveTotal += have;
    });
    return { rows: rows, addTotal: addTotal, haveTotal: haveTotal };
  }

  /* Snapshot every section this plan touches, so ONE undo restores all of them.
     ⚠️ sessionStorage, like the old per-stream key: an undo is offered for THIS sitting
     only. A snapshot surviving a week would let a student roll back a week of work. */
  /* ================= 恢复码 claims/{code} (owner 2026-08-19) ====================
     owner:「is there a way for the student to enter a shorter code…」+「override VS3,
     let the students restore everything」. TEN characters instead of a long paste, and
     it brings back the economy too.
     ⚠️ THIS DOES NOT REPLACE THE LONG CODE. The claim code needs the network; the long
     code does not. After §18ad's trailing-zero trim a single-stream student's long code
     is ~37 characters, so both routes are genuinely usable and the long one stays.
     ⚠️ THE CODE IS A SECRET. Never log it, never publish it to a board, never derive it
     from the uid — the leaderboard already shows an 8-character uid prefix, so a derived
     code would be forgeable from data we hand out on purpose. */
  var CLAIM_SECS = ["g1", "g2", "g3", "hcl", "xh"];

  /* ---- the virgin-account gate: the whole reason carrying currency is safe ----
     ⚠️ READ §18ae BEFORE TOUCHING THIS. Mastery merges monotonically, so re-applying it
     changes nothing. Currency does not have that property: earn 200 → claim → spend 200
     → claim again would leave you holding the avatar AND the 200. The gate closes it by
     writing SNAPSHOT fields only into an account that is still untouched — to re-claim
     you must first wipe the account, which destroys the purchase too. Net gain zero.
     ⚠️ OWNERSHIP MAPS ARE DELIBERATELY EXCLUDED FROM THE TEST (deco / owned /
     avatarsOwned). They merge monotonically, and letting their presence fail the test
     would block a legitimate first restore for anyone who had ever bought anything.
     ⚠️ A device with no stores at all is virgin — that is the canonical case. */
  function isVirginAccount() {
    var i, st;
    for (i = 0; i < 4; i++) {
      st = lsGet("ws2_" + CLAIM_SECS[i]);
      if (!st) continue;
      if ((st.lingLu || 0) !== 0) return false;
      if (Object.keys(st.items || {}).length) return false;
      if (Object.keys(st.equip || {}).length) return false;
    }
    st = lsGet("ws_xh");
    if (st) {
      if ((st.shells || 0) !== 0) return false;
      if (Object.keys(st.berth || {}).length) return false;
    }
    return true;
  }

  /* the restore snapshot. Whole stores, because「restore everything」means exactly that
     and this rides in a Firestore document rather than in something a child retypes.
     ⚠️ A land the student has never opened is OMITTED, never written as an empty store:
     an empty store would restore as a half-built object that its engine's load() never
     migrated, and every default that engine relies on would be missing (§18r). */
  function claimPayload() {
    var out = { v: 1, prof: load() || {}, m: {} };
    ["g1", "g2", "g3", "hcl"].forEach(function (k) {
      var st = lsGet("ws2_" + k);
      if (st) out.m[k] = st;
    });
    var x = lsGet("ws_xh");
    if (x) out.x = x;
    if (!Object.keys(out.m).length) delete out.m;
    return out;
  }
  function claimCode() { return (load() || {}).claimCode || ""; }
  /* Mints once and never silently re-mints: the student may have written the code down.
     Rotation is an explicit action (rotateClaimCode). cb(code|"") */
  function ensureClaimCode(cb) {
    cb = cb || function () {};
    var have = claimCode();
    if (have) { cb(have); return; }
    if (!window.WSCloud || !WSCloud.isAvailable() || !WSCloud.makeClaimCode) { cb(""); return; }
    var code = WSCloud.makeClaimCode();
    save({ claimCode: code });
    cb(code);
  }
  /* ⚠️ CALLED FROM THE SESSION-FLUSH PATH, NOT FROM EVERY save(). Mirroring the whole
     store on each progress write would double this project's Firestore write volume
     (§18ae), and「the state at the end of your last session」is the right granularity
     for a lost-device backup. Fails soft while the rules block is unpublished. */
  function pushClaim(cb) {
    cb = cb || function () {};
    if (!window.WSCloud || !WSCloud.isAvailable() || !WSCloud.saveClaim) { cb(false); return; }
    ensureClaimCode(function (code) {
      if (!code) { cb(false); return; }
      WSCloud.saveClaim(code, claimPayload(), function (ok) {
        /* mirror the code onto users/{uid} so a teacher can read it back and email it
           to a student who has forgotten theirs. Teachers already read that document;
           this adds one short field rather than a second permission. */
        if (ok && WSCloud.saveProfileField) WSCloud.saveProfileField("claimCode", code);
        cb(ok);
      });
    });
  }
  function rotateClaimCode(cb) {
    cb = cb || function () {};
    var old = claimCode();
    save({ claimCode: "" });
    if (old && window.WSCloud && WSCloud.deleteClaim) WSCloud.deleteClaim(old);
    ensureClaimCode(function (code) {
      if (!code) { cb(""); return; }
      pushClaim(function () { cb(code); });
    });
  }

  /* ---- applying a claim ----
     cb({ok, virgin, lands:[], err}) */
  function maxInto(dst, src) {          // numeric map: per-key max
    Object.keys(src || {}).forEach(function (k) {
      var a = Number(dst[k] || 0), b = Number(src[k] || 0);
      if (b > a) dst[k] = b;
    });
  }
  function unionInto(dst, src) {
    Object.keys(src || {}).forEach(function (k) { if (!dst[k]) dst[k] = src[k]; });
  }
  /* ⚠️ MONOTONIC FIELDS ONLY. Everything here is union-or-max, so applying it twice is
     a no-op — that is what makes it safe on an account that is NOT virgin. Currency,
     items, equip and berth are absent by design; they ride the snapshot branch. */
  function mergeMountain(local, inc) {
    unionInto(local.mastered = local.mastered || {}, inc.mastered);
    unionInto(local.badges = local.badges || {}, inc.badges);
    unionInto(local.deco = local.deco || {}, inc.deco);
    unionInto(local.gym = local.gym || {}, inc.gym);
    local.best = local.best || {};
    maxInto(local.best, inc.best);
    if ((inc.bestStreak || 0) > (local.bestStreak || 0)) local.bestStreak = inc.bestStreak;
    /* 历练值 only ever grows, so max is monotonic and safe. It is an effort TOTAL, not a
       wallet — nothing is ever spent from it (§4.1). */
    local.pts = local.pts || {};
    if ((inc.pts && inc.pts.total || 0) > (local.pts.total || 0)) local.pts.total = inc.pts.total;
    local.pts.terms = local.pts.terms || {};
    maxInto(local.pts.terms, inc.pts && inc.pts.terms);
    unionInto(local.pts.masteryAwarded = local.pts.masteryAwarded || {},
              inc.pts && inc.pts.masteryAwarded);
    maxInto(local.wins = local.wins || {}, inc.wins);
    return local;
  }
  function mergePier(local, inc) {
    unionInto(local.done = local.done || {}, inc.done);
    unionInto(local.readLines = local.readLines || {}, inc.readLines);
    unionInto(local.owned = local.owned || {}, inc.owned);
    /* 航海值 is the pier's effort total, same argument as 历练值 */
    if ((inc.sail || 0) > (local.sail || 0)) local.sail = inc.sail;
    /* ⚠️ sailLog keeps the EARLIER first-earned date per badge: it records when a
       threshold was crossed, and the earlier record is the true one (§18v). */
    local.sailLog = local.sailLog || {};
    Object.keys(inc.sailLog || {}).forEach(function (k) {
      var a = local.sailLog[k], b = inc.sailLog[k];
      if (!a || (b && b.first && b.first < a.first)) local.sailLog[k] = b;
    });
    return local;
  }
  function applyClaim(payload, cb) {
    cb = cb || function () {};
    if (!payload || payload.v !== 1) { cb({ ok: false, err: "这个恢复码的格式无法识别。" }); return; }
    var virgin = isVirginAccount(), lands = [];
    /* ⚠️ ONE SNAPSHOT OF EVERYTHING WE ARE ABOUT TO TOUCH, before touching any of it.
       sessionStorage on purpose (§18r): a snapshot that outlived the browser session
       would let a student roll back a week of learning. */
    var snap = {};
    CLAIM_SECS.forEach(function (k) {
      var key = storeKeyFor(k);
      try { snap[key] = localStorage.getItem(key); } catch (e) {}
    });
    try { snap[PROFILE_KEY] = localStorage.getItem(PROFILE_KEY); } catch (e) {}
    try { sessionStorage.setItem(UNDO_ALL, JSON.stringify(snap)); } catch (e) {}

    function put(key, obj) {
      try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
    }
    Object.keys(payload.m || {}).forEach(function (k) {
      var key = "ws2_" + k, inc = payload.m[k], local = lsGet(key);
      if (virgin || !local) { put(key, inc); }
      else { put(key, mergeMountain(local, inc)); }
      lands.push(CODE_LABEL[k]);
    });
    if (payload.x) {
      var local = lsGet("ws_xh");
      if (virgin || !local) { put("ws_xh", payload.x); }
      else { put("ws_xh", mergePier(local, payload.x)); }
      lands.push(CODE_LABEL.xh);
    }
    /* ⚠️ THE PROFILE IS RESTORED BUT THE CLAIM CODE IS NOT INHERITED. Two devices
       sharing one claim document would each overwrite the other's payload on flush, and
       the second one to close would win. The new device mints its own. */
    if (payload.prof) {
      var prof = {};
      Object.keys(payload.prof).forEach(function (k) { prof[k] = payload.prof[k]; });
      delete prof.claimCode;
      save(prof);
    }
    cb({ ok: true, virgin: virgin, lands: lands });
  }
  /* the whole round trip. cb({ok, virgin, lands, err}) */
  function restoreFromClaim(raw, cb) {
    cb = cb || function () {};
    var code = String(raw || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (code.length < 8) { cb({ ok: false, err: "恢复码不完整，请检查有没有漏打。" }); return; }
    if (!window.WSCloud || !WSCloud.isAvailable() || !WSCloud.readClaim) {
      cb({ ok: false, err: "现在连不上网络，恢复码需要联网才能用。" }); return;
    }
    WSCloud.readClaim(code, function (payload, reason) {
      if (!payload) {
        cb({ ok: false, err:
          reason === "denied" ? "恢复功能还没有开启，请告诉老师。" :
          reason === "notfound" ? "找不到这个恢复码，请检查有没有打错。" :
          "现在读不到你的进度，请稍后再试。" });
        return;
      }
      applyClaim(payload, cb);
    });
  }

  var UNDO_ALL = "ws_prerestore_all";
  function snapshotAll(plan) {
    var snap = {};
    (plan.sections || []).forEach(function (s) {
      var k = storeKeyFor(s.sec);
      try { snap[k] = localStorage.getItem(k); } catch (e) {}
    });
    try { sessionStorage.setItem(UNDO_ALL, JSON.stringify(snap)); } catch (e) {}
  }
  function hasUndoAll() {
    try { return !!sessionStorage.getItem(UNDO_ALL); } catch (e) { return false; }
  }

  /* THE ONLY WRITER. Returns {added, perSec}.
     ⚠️ The live section goes through its own engine's commit(); the rest are merged into
     localStorage here. Getting that backwards is the bug this whole structure exists to
     prevent: cs.js holds `store` in memory and its next saveStore() would silently
     erase a direct write to ws2_{current}. */
  function commitAll(plan) {
    var live = _provider && _provider.stream;
    var added = 0, perSec = {};
    (plan.sections || []).forEach(function (s) {
      if (live && s.sec === live && _provider.commit) {
        var res = _provider.commit({ addIds: s.addKeys, meta: s.rec || [],
                                     readLines: s.phr || [] }) || {};
        perSec[s.sec] = res.added || 0; added += res.added || 0;
        return;
      }
      var key = storeKeyFor(s.sec), cur = lsGet(key);
      /* ⚠️ NO STORE, NO WRITE. Creating one from a code would produce a half-built
         object that the engine's own load() has never migrated — every default that
         engine relies on would be missing. An untouched land stays untouched until the
         student opens it, and then the code can be restored there. */
      if (!cur) { perSec[s.sec] = 0; return; }
      var n = 0;
      if (s.sec === "xh") {
        if (!cur.done || typeof cur.done !== "object") cur.done = {};
        s.addKeys.forEach(function (w) { if (!cur.done[w]) { cur.done[w] = true; n++; } });
        if (s.phr && s.phr.length) {
          if (!cur.readLines || typeof cur.readLines !== "object") cur.readLines = {};
          s.phr.forEach(function (id) { if (!cur.readLines[id]) cur.readLines[id] = 1; });
        }
      } else {
        if (!cur.mastered || typeof cur.mastered !== "object") cur.mastered = {};
        s.addKeys.forEach(function (id) { if (!cur.mastered[id]) { cur.mastered[id] = 1; n++; } });
        var r = s.rec || [];
        if (!cur.best || typeof cur.best !== "object") cur.best = {};
        cur.bestStreak = Math.max(cur.bestStreak || 0, r[0] || 0);
        cur.best.rain = Math.max(cur.best.rain || 0, r[1] || 0);
        cur.best.handle = Math.max(cur.best.handle || 0, r[2] || 0);
        cur.best.assemble = Math.max(cur.best.assemble || 0, r[3] || 0);
        cur.best.sprint = Math.max(cur.best.sprint || 0, r[4] || 0);
      }
      try { localStorage.setItem(key, JSON.stringify(cur)); } catch (e) {}
      perSec[s.sec] = n; added += n;
    });
    var eco = applyEco(plan.eco);
    return { added: added, perSec: perSec, eco: eco };
  }

  /* ---- VS4: the economy half of a restore ----
     Returns { applied:bool, skipped:bool, lingLu, shells } so the summary can say what
     happened — a silent skip is the one outcome a student must never get.
     ⚠️ THE VIRGIN GATE IS THE WHOLE SAFETY ARGUMENT (§18ae). Snapshot fields are written
     ONLY into an untouched account; on any other account they are skipped entirely and
     the mastery half still lands. To re-claim you must first wipe, which destroys the
     purchase too — net gain zero.
     ⚠️ WALLET AND OWNERSHIP MOVE TOGETHER OR NOT AT ALL. Restoring 灵露 while merging
     `deco`/`avatarsOwned` by union would let a bought item survive the wipe and hand the
     student both the item and the money. That is the exploit, rebuilt from the other
     end. This is the load-bearing line in the whole feature; do not「improve」it into a
     union.
     ⚠️ NO STORE, NO WRITE — same rule as the mastery half above: an economy blob must
     never conjure a store the engine's load() has not migrated. */
  function applyEco(eco) {
    if (!eco || eco.v !== 1) return { applied: false, skipped: false };
    if (!isVirginAccount()) return { applied: false, skipped: true };
    var ling = 0, shells = 0;
    Object.keys(eco.m || {}).forEach(function (k) {
      var key = "ws2_" + k, cur = lsGet(key), o = eco.m[k];
      if (!cur) return;
      if (o.l) { cur.lingLu = o.l; ling += o.l; }
      if (o.i) cur.items = o.i;
      if (o.s) cur.itemSlots = o.s;
      if (o.e) cur.equip = o.e;
      if (o.d) cur.deco = o.d;
      if (o.w) cur.wins = o.w;
      try { localStorage.setItem(key, JSON.stringify(cur)); } catch (e) {}
    });
    if (eco.x) {
      var cx = lsGet("ws_xh");
      if (cx) {
        if (eco.x.sh) { cx.shells = eco.x.sh; shells = eco.x.sh; }
        if (eco.x.o) cx.owned = eco.x.o;
        if (eco.x.b) cx.berth = eco.x.b;
        try { localStorage.setItem("ws_xh", JSON.stringify(cx)); } catch (e) {}
      }
    }
    if (eco.p) {
      var patch = {};
      if (eco.p.av) patch.avatarsOwned = eco.p.av;
      if (eco.p.bo) patch.boatsOwned = eco.p.bo;
      if (eco.p.bp) patch.boatPick = eco.p.bp;
      if (Object.keys(patch).length) save(patch);
    }
    return { applied: true, skipped: false, lingLu: ling, shells: shells };
  }
  function undoAll() {
    var snap;
    try { snap = JSON.parse(sessionStorage.getItem(UNDO_ALL)); } catch (e) { snap = null; }
    if (!snap) return false;
    var live = _provider && _provider.stream;
    var liveKey = live ? storeKeyFor(live) : null;
    Object.keys(snap).forEach(function (k) {
      if (snap[k] == null) return;
      /* the live section must go back through its engine, or the in-memory `store`
         still holds the post-restore values and writes them out again */
      if (k === liveKey && _provider.restoreSnapshot) {
        try { _provider.restoreSnapshot(JSON.parse(snap[k])); return; } catch (e) {}
      }
      try { localStorage.setItem(k, snap[k]); } catch (e) {}
    });
    try { sessionStorage.removeItem(UNDO_ALL); } catch (e) {}
    return true;
  }
  /* How many words the code says are mastered. ⚠️ The `n` field is the stream's
     TOTAL word count (it exists to validate the bitmask length), NOT progress —
     showing it to the student would claim they had mastered the whole subject.
     The real figure is the number of set bits, which needs no word list: just
     popcount the bitmask, ignoring padding past n. */
  function _countBits(b64, n) {
    var t = String(b64 || "").replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    var bin;
    try { bin = atob(t); } catch (e) { return null; }
    var c = 0, max = n || bin.length * 8;
    for (var i = 0; i < bin.length; i++) {
      var v = bin.charCodeAt(i);
      for (var b = 0; b < 8; b++) {
        if ((i * 8 + b) >= max) break;
        if (v & (1 << b)) c++;
      }
    }
    return c;
  }
  /* PURE. Returns {stream, streamLabel, n, nick, legacy} or {err}. Never writes.
     This is the ENVELOPE reader used by the nickname picker on a brand-new device, where
     the only job is: prove the code is genuine, and pull out the name to adopt. It still
     decodes no bitmask — it does not need the word orders and must stay synchronous,
     because the picker runs before anything has been fetched.
     ⚠️ ALL WHITESPACE STRIPPED, same reason as decodeAll: a VS3 code is ~800 characters
     and gets wrapped by every mail client. This is the FIRST place a returning student
     pastes one, so a false「已损坏」here is the worst place to have it.
     ⚠️ `streamLabel` is now a LIST for VS3 ("四个学段与出发码头" style). The picker only
     prints it, and printing one subject name for a five-land code would be a lie. */
  function peekCode(code) {
    var p = String(code || "").replace(/\s+/g, "").split(".");
    /* ⚠️ VS4 = VS3 + one base64url economy field before the checksum. peekCode is
       deliberately NOT taught what is inside that field: this runs on the landing page,
       where it must be able to verify a code with no word data loaded at all. It only
       needs to know how many fields to checksum. */
    if (p[0] === "VS3" || p[0] === "VS4") {
      var nF = (p[0] === "VS4") ? 5 : 4;
      if (p.length !== nF) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (_fnv1a(p.slice(0, nF - 1).join(".")) !== p[nF - 1]) {
        return { err: "进度码不完整或已损坏，请重新复制一次。" };
      }
      var names = [], total = 0, secs = p[1].split("~");
      secs.forEach(function (chunk) {
        var f = chunk.split(":");
        if (!CODE_LABEL[f[0]]) return;
        names.push(CODE_LABEL[f[0]].split(" · ")[0]);
        /* ⚠️ popcount, NOT the `n` field: n is the land's TOTAL word count and exists to
           validate the mask length. Showing it would tell the student they had mastered
           an entire subject (the same warning the old _countBits note carries). */
        total += _countBits(f[2], parseInt(f[1], 10) || 0) || 0;
      });
      if (!names.length) return { err: "进度码里没有可以恢复的内容。" };
      /* ⚠️ `stream` is null on purpose: there is no single stream to hand off to, and the
         pending-code path keys on it. VS3 is restored from 我的档案, which is reachable
         from every page — see the note on setPendingCode. */
      return { stream: null, streamLabel: names.join(" · "), n: 0, mastered: total,
               nick: _b64urlToUtf8(p[2]), legacy: false, all: true };
    }
    if (p[0] === "VS2") {
      if (p.length !== 7) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (_fnv1a(p.slice(0, 6).join(".")) !== p[6]) {
        return { err: "进度码不完整或已损坏，请重新复制一次。" };
      }
      if (!CODE_LABEL[p[1]]) return { err: "进度码里的科目无法识别。" };
      var tot = parseInt(p[2], 10) || 0;
      return { stream: p[1], streamLabel: CODE_LABEL[p[1]], n: tot,
               mastered: _countBits(p[3], tot),
               nick: _b64urlToUtf8(p[5]), legacy: false };
    }
    if (p[0] === "VS1") {
      // VS1 carries no nickname, so it can prove the subject but not the identity
      if (p.length !== 5) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (!CODE_LABEL[p[1]]) return { err: "进度码里的科目无法识别。" };
      var tot1 = parseInt(p[2], 10) || 0;
      return { stream: p[1], streamLabel: CODE_LABEL[p[1]], n: tot1,
               mastered: _countBits(p[3], tot1), nick: "", legacy: true };
    }
    return { err: "进度码格式不正确，请检查是否完整复制。" };
  }
  /* Handoff to the stream page. One pending code at a time: a student with codes
     for several subjects restores the rest from 我的档案, which already does it. */
  var PENDING_KEY = "ws_pending_code";
  function setPendingCode(code, stream) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify({ code: code, stream: stream })); }
    catch (e) {}
  }
  /* read-and-clear: a pending code must never be offered twice, whether the
     student accepts it or dismisses the dialog.
     ⚠️ A VS3 code is parked with stream === null and matches on ANY page, because it
     covers all five lands — there is no single stream to wait for. Without this clause a
     five-land code parked by the nickname picker would sit in localStorage forever,
     matching nothing, and the student would have to find 我的档案 unaided. */
  function takePendingCode(stream) {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); } catch (e) {}
    if (!raw) return null;
    if (raw.stream && stream && raw.stream !== stream) return null;
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
    return raw;
  }
  /* async decode for callers outside the panel (cs.js's new-device path). ⚠️ It hands
     back the SAME plan shape the panel uses, so there is one planner and one commit
     path for every code in the app — the alternative is a second decoder that drifts. */
  function decodeCode(code, cb) {
    loadOrders(function (ord) { cb(decodeAll(code, ord)); });
  }


  /* ---------- the 我的档案 overlay ---------- */
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  var CAT_LABEL = { student: "学生", teacher: "老师", parent: "家长", public: "公众" };

  /* ================= 意见反馈 (2026-08-14) ==================================
     Abuse control is LAYERED, and it matters which layer does what:
       · Firestore rules do the real enforcement — the ticket id must be
         "{uid}__{day}__{0..4}", so five per user per day is a hard server-side
         ceiling that needs no document counting. Rules also pin the uid, cap the
         text length, force status "new" on create, and consult feedbackBans.
       · The client below adds a 30s cooldown, a local daily counter and a
         minimum length. These are COURTESY guards — they stop double-taps and
         accidental spam, and they give a friendly message instead of a denied
         write. They are trivially bypassable and are not relied on.
       · Every ticket carries nickname + class + school + uid, and the teacher
         dashboard shows them. Attribution is the strongest practical deterrent
         in a school setting, and it is what makes a ban meaningful.
     ⚠️ What is NOT enforceable without Cloud Functions / App Check: a true
     per-minute rate limit, or blocking a determined student from burning their
     five slots on nonsense. The answer to that is the ban list, not more rules. */
  /* ---------- 反馈表单的拼音 / 英文 (owner 2026-08-16 晚) ----------
     ⚠️ profile.js IS LOADED BY BOTH FAMILIES AND THEY GATE DIFFERENTLY: the mountains
     use body.py-aid / body.en-aid over .pylab / .enlab, the pier uses
     body.xh-py-on / body.xh-en-on over .xh-py / .xh-en. Rather than sniff which page
     this is, every gloss carries BOTH class sets — whichever stylesheet is loaded
     recognises its own pair and the other is an inert class name. That also means
     HCL needs no special case: it never sets body.py-aid, so the spans stay hidden.
     ⚠️ Key = the Chinese ON SCREEN, pinyin hand-written, syllable count == 汉字 count
     (§10). The emoji in FB_TYPES is not part of the key.
     ⚠️ The long consent note gets ENGLISH ONLY. It is prose, not a label; a paragraph
     of pinyin is noise, and it would be a syllable-count trap on every future edit. */
  function fbGloss(zh, py, en) {
    return (py ? '<span class="pylab xh-py xh-uipy">' + esc(py) + "</span>" : "") +
           (en ? '<span class="enlab xh-en">' + esc(en) + "</span>" : "");
  }
  var FB_TYPES = [
    { k: "content", label: "📖 词语内容有误", py: "cí yǔ nèi róng yǒu wù", en: "Wrong word or meaning" },
    { k: "bug",     label: "🐞 程序出错",     py: "chéng xù chū cuò",      en: "Something is broken" },
    { k: "idea",    label: "💡 建议",         py: "jiàn yì",               en: "An idea" },
    { k: "other",   label: "❓ 其他",         py: "qí tā",                 en: "Something else" }
  ];
  /* Default quota raised 5 → 20 (owner 2026-08-14). The reasoning is worth
     keeping: the student who files eight real problems in an afternoon is the
     most valuable user this feature has, and capping them to guard against a
     hypothetical spammer optimises for the wrong person. 20 is still bounded,
     and feedbackQuota/{uid} raises or zeroes it per student when needed.
     ⚠️ A CAPTCHA was considered and rejected — see the CLAUDE.md section. */
  var FB_MIN = 5, FB_MAX = 1000, FB_DAILY_DEFAULT = 20, FB_COOLDOWN_MS = 20000;
  var _fbQuota = null;                       // null until read from the cloud
  var FB_STATUS_LABEL = { "new": "待处理", open: "处理中", resolved: "已解决", wontfix: "不处理" };

  /* Asia/Singapore date — the same key the ticket id uses, so the local counter
     and the server-side slot ceiling agree on where a "day" starts. */
  function fbToday() {
    var d = new Date(Date.now() + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  function fbLocal() {
    var o;
    try { o = JSON.parse(localStorage.getItem("ws2_fb")) || {}; } catch (e) { o = {}; }
    if (o.day !== fbToday()) o = { day: fbToday(), n: 0, last: 0 };
    return o;
  }
  function fbSaveLocal(o) { try { localStorage.setItem("ws2_fb", JSON.stringify(o)); } catch (e) {} }

  function fbQuota() { return _fbQuota === null ? FB_DAILY_DEFAULT : _fbQuota; }

  /* one short line describing the current question, from the host page */
  function ctxLine() {
    try {
      var c = window.WS_FEEDBACK_CTX && window.WS_FEEDBACK_CTX();
      if (!c || !c.word) return "";
      return [c.mode || "", c.word || "", c.id || ""].filter(Boolean).join(" · ").slice(0, 160);
    } catch (e) { return ""; }
  }

  function openFeedback() {
    var prof = load() || {};
    var ctx = ctxLine();
    /* a report opened from a question is almost always about that question */
    var sel = ctx ? "content" : "content";
    /* Re-read the quota EVERY time the form opens, not once per page load: a
       teacher who raises a prolific reporter's quota mid-session would otherwise
       have no effect until that student reloaded — and worse, the client would
       stop trying slots at the old, lower number even though the rules now allow
       more. One cheap read on a screen that opens rarely. */
    if (window.WSCloud && window.WSCloud.myFeedbackQuota) {
      window.WSCloud.myFeedbackQuota(function (m) {
        _fbQuota = (typeof m === "number") ? m : FB_DAILY_DEFAULT;
        /* ⚠️ the value is stored and enforced, never painted — the「今天还可以提交 N 次」
           readout it used to update was removed on purpose (see draw()). */
      });
    }
    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.style.zIndex = 70;                       // above 我的档案 (65)
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    var card = document.createElement("div");
    card.className = "pop-card fb-card";
    ov.appendChild(card);
    document.body.appendChild(ov);

    function draw(msg, sending) {
      card.innerHTML =
        '<div class="pop-title">✍️ 意见反馈' +
          fbGloss("意见反馈", "yì jiàn fǎn kuì", "Tell us about a problem") + '</div>' +
        (ctx ? '<div class="fb-ctx">正在看：<b>' + esc(ctx) + '</b><br>' +
               '<span class="pop-note">这条信息会一起送出，老师就知道是哪一题。' +
               fbGloss("", "", "This is sent too, so the teacher knows which question.") +
               '</span></div>' : '') +
        '<div class="pop-note">你的昵称、班级和学校会随反馈一起送出，方便老师跟进。请不要写真实姓名或联络方式。' +
          fbGloss("", "", "Your nickname, class and school are sent with this so the teacher can follow up. " +
                          "Do not write your real name or any contact details.") + '</div>' +
        '<div class="pop-label" style="margin-top:12px">这是哪一类？' +
          fbGloss("这是哪一类", "zhè shì nǎ yī lèi", "What kind of thing is it?") + '</div>' +
        '<div class="prof-chips" id="fbTypes">' +
          FB_TYPES.map(function (t) {
            return '<button class="prof-chip' + (sel === t.k ? " on" : "") + '" data-fb="' + t.k + '">' +
              t.label + fbGloss(t.label, t.py, t.en) + "</button>";
          }).join("") + '</div>' +
        '<div class="pop-label" style="margin-top:12px">说说看' +
          fbGloss("说说看", "shuō shuo kàn", "Tell us more") + '</div>' +
        '<textarea class="code-ta fb-ta" id="fbText" maxlength="' + FB_MAX + '" ' +
          'placeholder="例如：中二单元三「聚集」的填空句好像少了一个字。"></textarea>' +
        /* ⚠️ THE REMAINING-SUBMISSIONS COUNT IS DELIBERATELY NOT SHOWN (owner
           2026-08-16 晚): 「今天还可以提交 20 次」 reads as a score to beat to exactly
           the students most likely to fill it with rubbish. The quota still applies —
           it is enforced by the ticket-ID rule server-side (§16) and by fbLocal()
           here — it is simply not advertised. A student who hits it is told they are
           done for today, without a number. */
        '<div class="prof-row"><span class="pop-note" id="fbCount">0 / ' + FB_MAX + '</span></div>' +
        '<div class="feedback" id="fbMsg">' + (msg || "") + '</div>' +
        '<div class="nav-row"><button class="nav-btn" id="fbCancel">取消' +
          fbGloss("取消", "qǔ xiāo", "Cancel") + '</button>' +
        '<button class="nav-btn primary" id="fbSend"' + (sending ? " disabled" : "") + '>' +
        (sending ? "送出中…" : "送出") + fbGloss("送出", "sòng chū", "Send") + '</button></div>';

      var ta = card.querySelector("#fbText");
      ta.oninput = function () { card.querySelector("#fbCount").textContent = ta.value.length + " / " + FB_MAX; };
      Array.prototype.forEach.call(card.querySelectorAll("[data-fb]"), function (b) {
        b.onclick = function () {
          sel = b.getAttribute("data-fb");
          Array.prototype.forEach.call(card.querySelectorAll("[data-fb]"), function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        };
      });
      card.querySelector("#fbCancel").onclick = function () { ov.remove(); };
      card.querySelector("#fbSend").onclick = function () { send(ta.value); };
      if (!sending) ta.focus();
    }

    function say(m) { var el = card.querySelector("#fbMsg"); if (el) el.textContent = m; }

    function send(text) {
      text = (text || "").trim();
      var lo = fbLocal();
      if (text.length < FB_MIN) { say("请再多写几个字，让老师看得明白。"); return; }
      /* quota 0 is a teacher shutting this account off, not a used-up daily
         allowance — 「今天已经提交 0 次了」 would read as nonsense */
      if (fbQuota() <= 0) { say("这个账号暂时无法提交反馈，请直接告诉老师。"); return; }
      /* ⚠️ no number here either, same reason as the removed counter above. */
      if (lo.n >= fbQuota()) { say("今天的反馈次数用完了，明天再来吧。"); return; }
      if (Date.now() - (lo.last || 0) < FB_COOLDOWN_MS) {
        say("刚刚才送出过，请等一下再提交。"); return;
      }
      if (!window.WSCloud || !window.WSCloud.submitFeedback || !window.WSCloud.isAvailable()) {
        say("需要联网才能送出反馈，请检查网络。"); return;
      }
      draw("", true);
      window.WSCloud.submitFeedback({
        day: fbToday(), max: fbQuota(), type: sel, text: text.slice(0, FB_MAX),
        /* WHAT THE STUDENT WAS LOOKING AT. The moment someone notices a broken
           cloze sentence is while answering it — asking them to describe which
           word it was, from a settings panel, loses exactly the information the
           report needs. cs.js publishes the live question through
           window.WS_FEEDBACK_CTX; absent on the landing page, which is fine. */
        ctx: ctxLine(),
        nickname: prof.nickname || "", school: prof.school || "",
        mtlClass: prof.mtlClass || "", category: prof.category || "",
        stream: window.STREAM || "", page: location.pathname.split("/").pop(),
        appV: (window.WS_ASSET_V || ""), ua: navigator.userAgent.slice(0, 180)
      }, function (res) {
        if (res && res.ok) {
          var l = fbLocal(); l.n = Math.max(l.n, res.slot + 1); l.last = Date.now(); fbSaveLocal(l);
          card.innerHTML = '<div class="pop-title">✅ 已送出</div>' +
            '<div class="pop-body">谢谢你！老师会在后台看到这条反馈。</div>' +
            '<div class="nav-row"><button class="nav-btn primary" id="fbDone">好</button></div>';
          card.querySelector("#fbDone").onclick = function () { ov.remove(); renderMyFeedback(); };
          return;
        }
        if (res && res.reason === "cap") {
          var l2 = fbLocal(); l2.n = fbQuota(); fbSaveLocal(l2);
          draw("今天的反馈次数用完了，明天再来吧。");
        } else if (res && res.reason === "permission-denied") {
          draw("暂时无法提交反馈，请联系老师。");
        } else {
          draw("送出失败，请稍后再试。");
        }
      });
    }
    draw("");
  }

  /* the student's own tickets + status, shown as one quiet line in the panel */
  function renderMyFeedback() {
    var el = document.getElementById("profFbMine");
    if (!el || !window.WSCloud || !window.WSCloud.myFeedback || !window.WSCloud.isAvailable()) return;
    window.WSCloud.myFeedback(function (rows) {
      if (!el.isConnected || !rows || !rows.length) return;
      var done = rows.filter(function (r) { return r.status === "resolved"; }).length;
      el.textContent = "你已提交 " + rows.length + " 条反馈" + (done ? "，其中 " + done + " 条已解决。" : "。");
    });
  }

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
      mtlClass: prof.mtlClass || "",
      schoolQ: ""                  // the school search box; survives re-renders
    };
    // which <option> the school <select> shows: a listed school, "other"
    // (free-text), or "" (nothing chosen yet). draft.school holds the value.
    draft.schoolPick = draft.school
      ? ((window.SG_SCHOOLS && window.SG_SCHOOLS.isKnown(draft.school)) ? draft.school : "other")
      : "";
    /* The 班级 roster is Bukit View's only (BV_CLASSES), so the field has two
       shapes: 年级 chips + <select> for a BVSS student, the old free-text box for
       everyone else. draft.classLevel / draft.classPick drive the first shape;
       draft.mtlClass stays the single value that is saved either way. */
    function rosterOn() {
      return !!(window.BV_CLASSES && window.SG_SCHOOLS && draft.school === window.SG_SCHOOLS.BVSS);
    }
    /* Rebuild the two-step state from draft.mtlClass. Called on open and whenever
       the school changes — a student who switches away from (or onto) BVSS must
       not keep a level chip that no longer describes anything. */
    var CLASS_FIELD = { pfx: "prof", inputCls: "prof-input" };
    function syncClassDraft() {
      if (window.BV_CLASSES) window.BV_CLASSES.syncField(draft);
      else { draft.classLevel = ""; draft.classPick = draft.mtlClass ? "other" : ""; }
    }
    syncClassDraft();

    function progressHtml() {
      var rows = ["g1", "g2", "g3", "hcl"].map(function (k) {
        var m = masteredCount(k);
        return '<div><b>' + (m == null ? "尚未开始" : fmtNum(m) + " 米") + '</b><span>' + esc(STREAM_LABEL[k]) + '</span></div>';
      }).join("");
      return '<div class="prof-prog">' + rows + '</div>';
    }

    /* ⚠️ On any page that already carries the 💬 反馈 corner button, this section
       shows NO button (owner 2026-08-17: "it's already on every screen"). Two
       controls for one action, twelve lines apart, is the same duplication that
       cost the pier its second 返回 (§18h).
       ⚠️ The test is「does a .fb-fab exist right now」, read off the DOM, NOT
       `_provider`: the pier registers no code provider yet still has the button,
       and the LANDING PAGE has the button nowhere (index.html loads neither
       cs.js nor xh.js), so there the panel is the only way in and the button
       must stay. A proxy for this fact would be wrong on two of the six pages.
       ⚠️ The mountain HIDES its fab during 词雨/攀山快答 with display:none — the
       element stays connected, which is what we want: the button is still one
       tap away once the round ends.
       The status line survives in both branches: it is information (how many of
       my reports came back), not a second copy of the control. */
    function feedbackSectionHtml() {
      var hasFab = !!document.querySelector(".fb-fab");
      var head = '<div class="prof-sec"><div class="pop-label">意见反馈' +
        fbGloss("意见反馈", "yì jiàn fǎn kuì", "Tell us about a problem") + '</div>';
      if (hasFab) {
        return head +
          '<div class="pop-note">发现词语内容有误、程序出错，或者有建议，点右下角的 💬 反馈' +
          fbGloss("反馈", "fǎn kuì", "the 💬 button in the corner") + '告诉我们。</div>' +
          '<div class="pop-note" id="profFbMine" style="margin-top:6px"></div></div>';
      }
      return head +
        '<div class="pop-note">发现词语内容有误、程序出错，或者有建议，都可以告诉我们。</div>' +
        '<div class="nav-row" style="margin-top:8px"><button class="nav-btn" id="profFeedback">✍️ 我要反馈</button></div>' +
        '<div class="pop-note" id="profFbMine" style="margin-top:6px"></div></div>';
    }

    /* ---- 恢复码: the short route (owner 2026-08-19) ----
       ⚠️ SHOWN FIRST, and above the long code, because it is the one a student should
       write down: ten characters instead of a paste, and it is the only route that
       brings back 灵露 / 贝壳 / 营地 / 海滩.
       ⚠️ RENDERED IN GROUPS OF FIVE (XXXXX XXXXX). The student copies this by hand off a
       screen; an unbroken ten-character run is where transcription errors happen. The
       stored value has no space in it and restoreFromClaim strips everything that is not
       [0-9A-Z], so a student may type it with or without the gap, in any case.
       ⚠️ The panel says plainly that it needs the network, because the long code does
       not — two routes with different failure modes must not look interchangeable. */
    function claimSectionHtml() {
      var c = claimCode();
      return '<div class="pop-label">恢复码 · 换了设备用这个' +
          fbGloss("恢复码", "huī fù mǎ", "Recovery code — restores everything") + '</div>' +
        '<div class="pop-body">把这十个字符抄下来。换了设备、清了浏览器资料，' +
        '在开始的画面输入它，<b>全部进度都会回来</b>——包括灵露、贝壳、营地和海滩。<br>' +
        '<span class="pop-note">⚠️ 需要联网才能用。不要给别人看：拿到它的人可以取走你的进度。</span></div>' +
        '<div class="claim-code" id="profClaim">' + (c ? esc(fmtClaim(c)) : "正在准备…") + '</div>' +
        '<div class="pop-note" id="profClaimNote"></div>' +
        '<div class="nav-row">' +
        '<button class="nav-btn" id="profClaimCopy">📋 复制恢复码</button>' +
        '<button class="nav-btn" id="profClaimNew">换一个</button></div>';
    }
    function fmtClaim(c) { return String(c || "").replace(/(.{5})(.{1,5})/, "$1 $2"); }

    /* ⚠️ NO MORE「进度码在各科目页面里」 BRANCH, and no more per-stream heading. There is
       ONE code for all five lands (owner 2026-08-17) and it is available on every page
       including the landing page, which is the page a student on a new device actually
       reaches first. The four subject links that used to stand in for a code here were
       an instruction to go and collect four separate strings.
       ⚠️ The textarea starts as a placeholder and is filled by fillCodeOut() when the
       word orders arrive: the code cannot be built synchronously any more because it is
       positional over five published files. A stale-render guard lives in that function. */
    /* ⚠️ 进度码收进折叠区（owner 2026-08-23）。两段码不是重复，是**两条失败方式不同的路**：
         恢复码 —— 10 个字符，连灵露贝壳一起回来，**但必须联网**。
         进度码 —— 约 800 个字符，纯离线解码，**不含货币**。
       对绝大多数学生，恢复码在每一条轴上都更好；进度码唯一不可替代的场合是
       **没有网络**。而它以前和恢复码并排摊开，800 个字符的文本框占掉半个面板，
       把真正该用的那一段挤到了上面看不见的地方。

       ⚠️ **没有删掉它**，只是收起来：删一条恢复路径要 owner 明确点头，
       而「学生在没有网络的地方换了设备」这件事一旦发生，没有第二条路。
       ⚠️ summary 的措辞按**目的**写，不是按名字写——一个想找回进度的学生
       不会去找「进度码」，他会找「没有网络怎么办」。
       ⚠️ 输出与恢复**一起**收进来：分开放会让「我在哪里粘贴」变成第二个谜题。 */
    function codeSectionHtml() {
      return claimSectionHtml() +
        '<details class="prof-more code-more"><summary>没有网络？用进度码（离线备份与恢复）' +
          fbGloss("", "", "No network? Use the offline progress code") + '</summary>' +
        '<div class="pop-body" style="margin-top:6px">这段码<b>不必联网</b>，但很长，' +
        '而且<b>不含</b>灵露与贝壳。能上网的话，请用上面的恢复码。<br>' +
        '<span class="pop-note">一段进度码涵盖<b>五片陆地</b>：四个学段与出发码头。' +
        '里面有已掌握／已认得的词语、最高连对、各游戏纪录，并绑定你的昵称。</span></div>' +
        '<div class="pop-label">我的进度码' +
          fbGloss("我的进度码", "wǒ de jìn dù mǎ", "My progress code — all five lands") + '</div>' +
        '<textarea class="code-ta" id="profCodeOut" readonly>展开后开始生成…</textarea>' +
        '<div class="pop-note" id="profCodeSum"></div>' +
        '<div class="nav-row"><button class="nav-btn" id="profCodeCopy">📋 复制进度码</button></div>' +
        '<div class="pop-label" style="margin-top:12px">用进度码恢复' +
          fbGloss("用进度码恢复", "yòng jìn dù mǎ huī fù", "Restore from a progress code") + '</div>' +
        '<textarea class="code-ta" id="profCodeIn" placeholder="把进度码粘贴到这里…"></textarea>' +
        '<div class="feedback" id="profCodeFb"></div>' +
        '<div class="nav-row">' +
        (hasUndoAll() ? '<button class="nav-btn" id="profCodeUndo">↩ 撤销恢复</button>' : "") +
        '<button class="nav-btn primary" id="profCodeRestore">恢复进度</button></div>' +
        '</details>';
    }
    /* ⚠️ `ov.isConnected` guard: the panel can be closed, or re-rendered by any chip
       tap, while the five fetches are still in flight. Writing into a detached textarea
       is harmless but writing into the NEXT render's textarea with THIS render's code
       is not, and the panel re-renders on every category/aid toggle. */
    function fillCodeOut() {
      encodeAll(function (code, missing) {
        var ta = ov.querySelector("#profCodeOut"), sum = ov.querySelector("#profCodeSum");
        if (!ta || !ta.isConnected) return;
        if (!code) {
          ta.value = "";
          if (sum) sum.textContent = "还没有任何进度可以备份。先去学几个词吧。";
          return;
        }
        ta.value = code;
        if (!sum) return;
        /* ⚠️ Say which lands are IN the code, per land, never as one total (§4.1 — the
           five numbers never combine). A student who has only ever used the pier should
           see that their code is about the pier. */
        var plan = decodeAll(code, _orders);
        var parts = (plan.sections || []).map(function (s) {
          /* ⚠️ CODE_LABEL, not the short STREAM_LABEL below: this indexes by SECTION and
             sections include "xh", which the short table has no row for. Getting this wrong
             is what hid the pier from the summary in the first place. */
          return CODE_LABEL[s.sec].split(" · ")[0] + " " + s.addKeys.length + " 词";
        });
        sum.textContent = "这段码含：" + (parts.join(" · ") || "（空）") +
          (missing && missing.length ? "。⚠️ 这些还没载入，未包含：" + missing.join("、") : "");
      });
    }

    /* 班级. Two shapes, one saved value (draft.mtlClass):
       · BVSS → 年级 chips then a <select> of that level's 7–8 classes, so the
         string that lands in the profile is always one of the 30 real class
         names, spelled one way. 「其他」keeps the free-text escape for a class
         that is not on this year's list (an old year's class arrives here too,
         with its text intact, which is the nudge the Jan-2 prompt wants).
       · any other school → the free-text box, unchanged. We hold one school's
         roster; guessing at another school's class names would be worse than
         letting the student type. */
    function classFieldHtml() {
      if (!rosterOn()) {
        return '<div class="pop-label" style="font-weight:500">班级' +
            fbGloss("班级", "bān jí", "Class \u2014 write the year first, e.g. 2026 3HC3") +
            ' · 请填「年份 + 班级」</div>' +
          '<input type="text" class="prof-input" id="profClass" placeholder="例如：2026 3HC3" value="' + esc(draft.mtlClass) + '">' +
          '<div class="pop-note">写上年份，升班后即使忘了更新，老师也能看出是哪一年的班级。</div>';
      }
      return '<div class="pop-label" style="font-weight:500">班级' +
          fbGloss("班级", "bān jí", "Class \u2014 pick your level, then your class") +
          ' · 先选年级' + (draft.mtlClass ? '，当前：' + esc(draft.mtlClass) : "") + '</div>' +
        window.BV_CLASSES.fieldHtml(draft, CLASS_FIELD) +
        '<div class="pop-note">名单是 ' + esc(window.BV_CLASSES.YEAR) + ' 年的班级；不在名单上就选「其他」自己填。</div>';
    }

    function render() {
      var cat = draft.category;
      var catChips = ["student", "teacher", "parent", "public"].map(function (k) {
        return '<button class="prof-chip' + (cat === k ? " on" : "") + '" data-cat="' + k + '">' + CAT_LABEL[k] + '</button>';
      }).join("");
      var catShown = cat ? CAT_LABEL[cat] : "未填写";

      var html =
        /* The only close affordance: sticky to the CARD, so it is reachable
           from anywhere in the panel. The old 关闭 button at the very bottom
           was removed once this shipped — it was unreachable without scrolling
           to the end, which was the original complaint. Backdrop tap works too. */
        '<button class="prof-x" id="profCloseX" aria-label="关闭我的档案" title="关闭">✕</button>' +
        '<div class="pop-title">👤 我的档案' +
          fbGloss("我的档案", "wǒ de dàng àn", "My profile") + '</div>' +
        /* ⚠️ THE PILLS APPEAR ONLY WHERE NOTHING ELSE OWNS THE GATES — aidPillsHtml
           returns "" unless the page called ownAid(), so on a stream page or the pier
           this is empty and the topbar's own pair stays the single control. Without
           that guard there would be two toggles on screen writing two different
           settings, which is worse than none. */
        (aidPillsHtml() ? '<div class="prof-aid">' + aidPillsHtml() + "</div>" : "") +
        /* Two independent columns, NOT four grid cells: as cells, the short
           进度/技术 blocks were locked to the row heights of the tall
           身份/进度码 blocks and left the panel half empty. */
        '<div class="prof-grid"><div class="prof-col">' +

        // ---- 身份 + 基本资料 (§5: merged into one header block, no gap between) ----
        '<div class="prof-sec">' +
          '<div class="prof-head">' +
            '<button class="prof-avatar lg" id="profAvatarBtn" title="查看简介 · 换头像">' + avatarImgHtml(prof.avatarId) + '</button>' +
            '<div class="prof-head-txt">' +
              '<div class="prof-nick">' + esc(prof.nickname || "（未命名）") + '</div>' +
              '<div class="prof-head-sub">' + esc(catShown) +
                (draft.mtlClass ? ' · ' + esc(draft.mtlClass) : '') +
                (draft.school ? ' · ' + esc(shortSchool(draft.school)) : '') + '</div>' +
              '<div class="prof-head-links">' +
                '<button class="code-link" id="profChangeAvatar">换头像' +
                  fbGloss("换头像", "huàn tóu xiàng", "Change avatar") + '</button>' +
                '<button class="code-link" id="profChangeNick">换昵称' +
                  fbGloss("换昵称", "huàn nì chēng", "Change nickname") + '</button></div>' +
            '</div>' +
          '</div>' +
          '<div class="pop-label" style="font-weight:500;margin-top:10px">学校' +
            fbGloss("学校", "xué xiào", "School") + '</div>' +
          (window.SG_SCHOOLS ? window.SG_SCHOOLS.searchHtml("profSchoolQ", draft.schoolQ) : "") +
          '<select class="np-select" id="profSchool">' +
            (window.SG_SCHOOLS ? window.SG_SCHOOLS.optionsHtml(draft.schoolPick, draft.schoolQ)
              : ('<option value="' + esc(draft.school) + '" selected>' + esc(draft.school || "百德中学 Bukit View Secondary School") + '</option>')) +
          '</select>' +
          (draft.schoolPick === "other" ? '<input type="text" class="prof-input" id="profSchoolOther" style="margin-top:8px" placeholder="请输入学校名称 School name" value="' + esc(draft.school) + '">' : "") +
          '<div class="pop-label" style="font-weight:500;margin-top:10px">身份类别' +
            fbGloss("身份类别", "shēn fèn lèi bié", "I am a\u2026") +
            ' · 当前：' + esc(catShown) + '</div>' +
          '<div class="prof-chips">' + catChips + '</div>' +
          '<div id="profClassWrap"' + (cat === "student" ? "" : ' style="display:none"') + '>' +
            classFieldHtml() +
          '</div>' +
          '<div class="feedback" id="profSaveFb"></div>' +
          '<div class="nav-row"><button class="nav-btn primary" id="profSave">保存' +
            fbGloss("保存", "bǎo cún", "Save") + '</button></div></div>' +

        // ---- 我的进度 ----
        '<div class="prof-sec"><div class="pop-label">我的进度' +
          fbGloss("我的进度", "wǒ de jìn dù", "My progress") + '</div>' + progressHtml() + '</div>' +

        /* Column break sits HERE, and only here, because it is the split that
           leaves the two columns nearly the same height (identity+progress vs
           code+tech). Moving it costs the panel hundreds of px of dead space. */
        '</div><div class="prof-col">' +

        // ---- 进度码 ----
        '<div class="prof-sec"><div class="pop-label">进度码' +
          fbGloss("进度码", "jìn dù mǎ", "Progress code \u2014 back up and restore") +
          ' · 备份与恢复</div>' + codeSectionHtml() + '</div>' +

        // ---- 意见反馈 ----
        feedbackSectionHtml() +

        // ---- 技术信息 (§5: collapsed to one line; expands on demand) ----
        '<div class="prof-sec"><details class="prof-more">' +
          '<summary>技术编号与隐私说明' +
            fbGloss("技术编号与隐私说明", "jì shù biān hào yǔ yǐn sī shuō míng",
                    "Technical id and privacy note") + '</summary>' +
          '<div class="pop-note" style="margin:8px 0 6px">这串编号只用于技术支援，不代表你的身份。</div>' +
          '<div class="prof-uid" id="profUid">载入中…</div>' +
          '<div class="prof-row" style="margin-top:6px"><span class="pop-note">简短编号：<b id="profUidShort">…</b></span>' +
          '<button class="code-link" id="profUidCopy">复制完整编号</button></div>' +
          '<div class="pop-note" style="margin-top:6px" id="profSync">…</div>' +
          '<div class="pop-body" style="margin-top:10px">本站只保存你选择的昵称、学校、班级、身份类别与学习进度，' +
          '用来记录学习情况。我们不收集真实姓名，班级是选填。</div>' +
          '</details></div>' +

        '</div></div>'; // .prof-col + .prof-grid

      card.innerHTML = html;
      wire();
    }

    function wire() {
      ov.querySelector("#profCloseX").onclick = function () { ov.remove(); };

      /* ⚠️ null on every page that has the 💬 fab — feedbackSectionHtml() drops the
         button there. Unguarded, this throws and kills every handler wired after
         it (保存, 换头像, 进度码…), which is exactly the silent-breakage shape §14
         keeps warning about. */
      var fbBtn = ov.querySelector("#profFeedback");
      if (fbBtn) fbBtn.onclick = function () { openFeedback(); };
      renderMyFeedback();

      ov.querySelector("#profChangeNick").onclick = function () {
        if (opts.onChangeNickname) opts.onChangeNickname(function () {
          prof = load() || {};              // picker may have changed nickname / school / category
          draft.school = prof.school || draft.school;
          draft.category = prof.category || draft.category;
          draft.mtlClass = (prof.category === "student") ? (prof.mtlClass || draft.mtlClass) : "";
          syncClassDraft();                 // the picker may have changed the school too
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
      /* §3: tapping your OWN avatar shows the same detail card, with 「换一个」
         instead of 「选用这个头像」. With no avatar set there is nothing to show,
         so it goes straight to the grid. */
      var avBtn = ov.querySelector("#profAvatarBtn");
      if (avBtn) avBtn.onclick = function () {
        if (prof.avatarId) openAvatarInfo(prof.avatarId, { mode: "current", onSwitch: openPicker });
        else openPicker();
      };
      var avBtn2 = ov.querySelector("#profChangeAvatar");
      if (avBtn2) avBtn2.onclick = openPicker;

      var schoolEl = ov.querySelector("#profSchool");
      if (schoolEl && window.SG_SCHOOLS) {
        window.SG_SCHOOLS.wireSearch(ov.querySelector("#profSchoolQ"), schoolEl, function (v, q) {
          draft.schoolQ = q;
          if (v === draft.schoolPick) return;
          var wasOther = draft.schoolPick === "other";
          var hadRoster = rosterOn();
          draft.schoolPick = v;
          if (v !== "other") draft.school = v;
          syncClassDraft();
          /* Re-render on a roster flip as well as on wasOther: the 班级 field is a
             different control on either side of BVSS, and leaving the old one on
             screen means the student edits a box that is about to be replaced.
             Both cases cost the search box its focus — the price was already
             accepted for wasOther, and a flip only happens once the search has
             narrowed to a single school, which is the end of typing anyway. */
          if (wasOther || rosterOn() !== hadRoster) render();
        });
      }
      if (schoolEl) schoolEl.onchange = function () {
        draft.schoolPick = schoolEl.value;
        if (draft.schoolPick !== "other") {
          draft.school = schoolEl.value;             // "" (please-select) or a listed school
        } else if (window.SG_SCHOOLS && window.SG_SCHOOLS.isKnown(draft.school)) {
          draft.school = "";                          // was a listed school → start the text box empty
        }
        syncClassDraft();                             // the 班级 field may have just changed shape
        render();
      };
      var schoolOtherEl = ov.querySelector("#profSchoolOther");
      if (schoolOtherEl) schoolOtherEl.oninput = function () { draft.school = schoolOtherEl.value; };
      var classEl = ov.querySelector("#profClass");
      if (classEl) classEl.oninput = function () { draft.mtlClass = classEl.value; };
      if (rosterOn()) window.BV_CLASSES.wireField(ov, draft, CLASS_FIELD, render);

      Array.prototype.forEach.call(ov.querySelectorAll(".prof-chip[data-cat]"), function (b) {
        b.onclick = function () {
          draft.category = b.getAttribute("data-cat");
          if (draft.category !== "student") { draft.mtlClass = ""; syncClassDraft(); }   // spec: clear class off-student
          render();
        };
      });

      ov.querySelector("#profSave").onclick = function () {
        var fb = ov.querySelector("#profSaveFb");
        prof = save({ school: (draft.school || "").trim(), category: draft.category, mtlClass: draft.mtlClass });
        draft.mtlClass = prof.mtlClass || "";        // save() normalises (uppercase, one space)
        syncClassDraft();
        fb.className = "feedback show ok"; fb.textContent = "已保存 ✓";
        if (opts.onChanged) opts.onChanged();
      };

      wireCode();
      wireUid();
    }

    /* ⚠️ NO `if (!_provider) return` GUARD ANY MORE. That guard was correct when the code
       was built by the stream page's own encoder; now the codec lives here and works on
       the landing page too, where _provider is null by design. Leaving the guard in was
       the difference between「one code everywhere」and「one code except on the page a
       student on a new device actually opens first」. */
    function wireCode() {
      /* ⚠️ 进度码**展开时才生成**。encodeAll() 要抓五份已发布的词表 JSON
         （位置编码，见 §VS3），以前每次打开 我的档案 都白跑这五个请求——
         而现在这一段默认是收起来的，绝大多数学生根本不会展开。
         ⚠️ 只跑一次：details 每次开合都会触发 toggle。 */
      var det = ov.querySelector(".code-more");
      if (det) {
        det.addEventListener("toggle", function () {
          if (det.open && !det.dataset.filled) { det.dataset.filled = "1"; fillCodeOut(); }
        });
      } else {
        fillCodeOut();   // 没有折叠壳（不该发生）就退回旧行为
      }
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
      wireClaim();
    }

    function claimNote(msg, ok) {
      var n = ov.querySelector("#profClaimNote");
      if (!n) return;
      n.textContent = msg || "";
      n.style.color = ok === false ? "#B4472F" : "";
    }
    function wireClaim() {
      var el = ov.querySelector("#profClaim");
      if (!el) return;
      /* ⚠️ Minting also PUSHES, or the student walks away with a code that points at
         nothing. The push is what creates claims/{code}; the local string alone is
         useless. Both fail soft while the rules block is unpublished. */
      ensureClaimCode(function (code) {
        if (!el.isConnected) return;
        if (!code) {
          el.textContent = "—";
          claimNote("现在连不上网络，恢复码要联网才能建立。", false);
          return;
        }
        el.textContent = fmtClaim(code);
        pushClaim(function (ok) {
          if (!el.isConnected) return;
          claimNote(ok ? "已经保存好了。抄下来收着。"
                       : "还没能保存到云端——恢复功能可能还没开启，请告诉老师。", ok);
        });
      });
      var cp = ov.querySelector("#profClaimCopy");
      if (cp) cp.onclick = function () {
        var txt = claimCode();
        if (!txt) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () { claimNote("已复制恢复码。", true); });
        } else { claimNote("请手动抄下上面的十个字符。", true); }
      };
      var nw = ov.querySelector("#profClaimNew");
      /* ⚠️ CONFIRM FIRST. Rotating invalidates whatever the student already wrote down or
         emailed to themselves, and the old code stops working the moment this succeeds. */
      if (nw) nw.onclick = function () {
        if (!window.confirm("换一个恢复码？\n旧的那个马上就不能用了，写下来的要重新抄。")) return;
        claimNote("正在换…");
        rotateClaimCode(function (code) {
          if (!el.isConnected) return;
          if (!code) { claimNote("换不成，请稍后再试。", false); return; }
          el.textContent = fmtClaim(code);
          claimNote("换好了。请重新抄下来。", true);
        });
      };
    }

    function flashCode(msg, ok) {
      var fb = ov.querySelector("#profCodeFb");
      if (!fb) return;
      fb.className = "feedback show " + (ok ? "ok" : "bad");
      fb.textContent = msg;
    }

    /* §6 order is unchanged and still matters: snapshot -> sessionStorage -> log ->
       commit. What changed is that all of it is now per-PLAN rather than per-stream,
       because one code can touch five stores. */
    function commitRestore(plan, matched, codeNick) {
      snapshotAll(plan);
      var res = commitAll(plan);
      var me = load() || {};
      if (window.WSCloud && window.WSCloud.logRestore) {
        /* ⚠️ `stream` on the log row is now the LIST of lands the code touched, not the
           page it happened on. A teacher reading the console needs to know what moved. */
        window.WSCloud.logRestore({
          nickname: me.nickname || "", school: me.school || "", mtlClass: me.mtlClass || "",
          stream: (plan.sections || []).map(function (x) { return x.sec; }).join("+"),
          codeNick: codeNick || "", matched: !!matched, added: res.added || 0
        });
      }
      if (opts.onChanged) opts.onChanged();
      render();                          // re-render so 撤销恢复 appears + progress updates
      /* ⚠️ per-land in the confirmation too, never a single total (§4.1). */
      var parts = (plan.sections || []).map(function (x) {
        return CODE_LABEL[x.sec].split(" \u00b7 ")[0] + " +" + (res.perSec[x.sec] || 0);
      });
      /* ⚠️ THE ECONOMY OUTCOME IS ALWAYS STATED, never silent. A student whose snapshot
         was skipped must be told WHY, or they read a successful restore as「我的灵露没了」
         and there is nothing on screen to contradict them. */
      var eco = res.eco || {}, tail = "";
      if (eco.applied) {
        var bits = [];
        if (eco.lingLu) bits.push("灵露 " + eco.lingLu);
        if (eco.shells) bits.push("贝壳 " + eco.shells);
        tail = bits.length ? "\uff1b\u5df2\u6062\u590d " + bits.join(" \u00b7 ") : "";
      } else if (eco.skipped) {
        tail = "\u3002\u5b66\u4e60\u8fdb\u5ea6\u5df2\u6062\u590d\uff0c" +
               "\u4f46\u7075\u9732\u548c\u8d1d\u58f3\u6ca1\u6709\u2014\u2014" +
               "\u8fd9\u4e2a\u8bbe\u5907\u5df2\u7ecf\u6709\u4f7f\u7528\u8bb0\u5f55\uff0c" +
               "\u53ea\u6709\u5168\u65b0\u7684\u8bbe\u5907\u624d\u80fd\u6062\u590d\u7ecf\u6d4e\u6570\u636e\u3002";
      }
      flashCode("\u2705 \u6062\u590d\u6210\u529f\uff1a" + parts.join(" \u00b7 ") + tail, true);
    }

    /* ⚠️ ONE ROW PER LAND, and the 只增不减 promise printed for each. A single combined
       figure would be the composite score §4.1 forbids, and it would also hide the case
       that actually worries a student: 「will this wipe my G2?」 — the answer is visible
       only if G2 has its own line. */
    function diffLine(plan) {
      var d = planDelta(plan);
      var rows = d.rows.map(function (r) {
        return '<div style="margin-top:4px">' + esc(r.label.split(" \u00b7 ")[0]) +
          '\uff1a\u7801\u91cc <b>' + r.code + '</b> \u00b7 \u4f60\u73b0\u5728 <b>' + r.have +
          '</b> \u00b7 \u6062\u590d\u540e <b>' + (r.have + r.newly) + '</b></div>';
      }).join("");
      /* ⚠️ A section the code carries but this device has no store for is NOT an error and
         must be said plainly: the student has simply never opened that land here. */
      var untouched = d.rows.filter(function (r) { return r.have === 0 && r.newly === 0; }).length;
      return '<div class="pop-body" style="background:#F1F6FB;border:1px solid #DBE7F1;border-radius:10px;padding:10px 12px;margin-top:8px">' +
        rows +
        '<div style="margin-top:6px"><b>\u53ea\u589e\u4e0d\u51cf</b>\uff1a\u6ca1\u6709\u4efb\u4f55\u4e00\u9879\u4f1a\u53d8\u5c11\u3002</div>' +
        (untouched ? '<div class="pop-note" style="margin-top:4px">\u6ca1\u6709\u8bb0\u5f55\u7684\u9646\u5730\u8981\u5148\u6253\u5f00\u4e00\u6b21\uff0c\u624d\u80fd\u6062\u590d\u5230\u90a3\u91cc\u3002</div>' : "") +
        '</div>';
    }

    function onRestore() {
      var inEl = ov.querySelector("#profCodeIn");
      var val = inEl ? inEl.value : "";
      if (!String(val).replace(/\s+/g, "")) { flashCode("\u8bf7\u5148\u7c98\u8d34\u8fdb\u5ea6\u7801\u3002", false); return; }
      /* ⚠️ the orders may not be loaded yet (the panel can be opened and a code pasted
         within the same second). Wait for them rather than reporting a bogus format error. */
      flashCode("\u6b63\u5728\u6838\u5bf9\u2026", true);
      loadOrders(function (ord) {
        if (!ov.isConnected) return;
        var plan = decodeAll(val, ord);
        if (plan.err) { flashCode(plan.err, false); return; }
        var me = load() || {};
        var skipNote = plan.skipped
          ? '<div class="pop-note">\u5176\u4e2d ' + plan.skipped + ' \u6bb5\u8bfb\u4e0d\u61c2\uff0c\u5df2\u8df3\u8fc7\u3002</div>'
          : "";
        if (plan.mismatch) {
          confirmDialog(
            '<div class="pop-title">\u8fd9\u4e0d\u662f\u4f60\u7684\u8fdb\u5ea6\u7801</div>' +
            '<div class="pop-body">\u8fd9\u4e2a\u8fdb\u5ea6\u7801\u5c5e\u4e8e\u300c' + esc(plan.codeNick) +
            '\u300d\uff0c\u548c\u4f60\u73b0\u5728\u7684\u6635\u79f0\u300c' + esc(me.nickname || "") + '\u300d\u4e0d\u4e00\u6837\u3002<br><br>' +
            '\u5982\u679c\u8fd9\u662f\u4f60\u4ee5\u524d\u7528\u8fc7\u7684\u6635\u79f0\uff0c\u53ef\u4ee5\u6539\u7528\u5b83\u7ee7\u7eed\u3002<br>' +
            '\u5982\u679c\u8fd9\u662f\u540c\u5b66\u7684\u8fdb\u5ea6\u7801\uff0c\u8bf7\u4e0d\u8981\u6062\u590d\uff0c\u90a3\u4e0d\u662f\u4f60\u7684\u5b66\u4e60\u8bb0\u5f55\u3002</div>' +
            diffLine(plan) + skipNote,
            '\u6539\u7528\u300c' + esc(plan.codeNick) + '\u300d\u5e76\u6062\u590d',
            function () {
              save({ nickname: plan.codeNick });     // adopt the identity, then restore
              prof = load() || {};
              commitRestore(plan, false, plan.codeNick);
            });
          return;
        }
        var legacyNote = plan.legacy ? '<div class="pop-note">\u8fd9\u662f\u65e7\u7248\u8fdb\u5ea6\u7801\uff0c\u65e0\u6cd5\u6838\u5bf9\u6765\u6e90\u3002</div>' : "";
        confirmDialog(
          '<div class="pop-title">\u6062\u590d\u8fdb\u5ea6</div>' + legacyNote +
          '<div class="pop-body">\u6062\u590d\u8fdb\u5ea6\u4f1a\u628a\u8fdb\u5ea6\u7801\u91cc\u7684\u8bb0\u5f55<b>\u5e76\u5165</b>\u4f60\u73b0\u5728\u7684\u8bb0\u5f55\u3002</div>' +
          diffLine(plan) + skipNote +
          '<div class="pop-note" style="margin-top:8px">\u6062\u590d\u540e\uff0c\u4f60\u53ef\u4ee5\u5728\u8fd9\u6b21\u4f7f\u7528\u4e2d\u64a4\u9500\u4e00\u6b21\u3002</div>',
          "\u786e\u5b9a\u6062\u590d",
          function () { commitRestore(plan, true, plan.codeNick || ""); });
      });
    }

    function onUndo() {
      if (!hasUndoAll()) { flashCode("\u6ca1\u6709\u53ef\u64a4\u9500\u7684\u6062\u590d\u3002", false); return; }
      confirmDialog(
        '<div class="pop-title">\u64a4\u9500\u8fd9\u6b21\u6062\u590d\uff1f</div>' +
        '<div class="pop-body">\u8fd9\u4f1a\u628a\u6240\u6709\u88ab\u8fd9\u6b21\u6062\u590d\u52a8\u8fc7\u7684\u9646\u5730<b>\u6574\u4f53\u8fd8\u539f</b>\u5230\u6062\u590d\u524d\uff0c' +
        '\u4e0d\u662f\u53ea\u51cf\u6389\u8fdb\u5ea6\u7801\u5e26\u6765\u7684\u90a3\u4e00\u90e8\u5206\u3002<br><br>' +
        '\u6062\u590d\u4e4b\u540e\u65b0\u7b54\u5bf9\u7684\u8bcd\u8bed\u4e5f\u4f1a\u4e00\u8d77\u9000\u56de\u3002</div>',
        "\u786e\u5b9a\u64a4\u9500",
        function () {
          undoAll();
          if (opts.onChanged) opts.onChanged();
          render();
          flashCode("\u5df2\u64a4\u9500\u8fd9\u6b21\u6062\u590d\u3002", true);
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

  /* An avatar the student no longer qualifies for falls back to the plain 👤 rather
     than rendering a locked one (§3.5). In practice the grandfather clause in
     avatarLock means a wearer keeps their own avatar, so this only fires for a
     stale / hand-edited avatarId. */
  /* ⚠️ The FILE PATH, not the id. Room player rows publish this so teacher.html can
     render the avatar without carrying a copy of AVATAR_CATALOG — it loads no
     shared JS, and a duplicated 21-entry table would drift the first time an
     avatar is added. Returns null when the id is unknown or still locked. */
  function avatarFile(id) {
    var a = id && avatarById(id);
    if (!a || avatarLock(a.id)) return null;
    return a.file;
  }
  function avatarImgHtml(id) {
    var a = id && avatarById(id);
    if (a && avatarLock(a.id)) a = null;
    return a ? '<img src="' + esc(a.file) + '" alt="">' : '👤';
  }

  /* ---------- 6-frame sprite sheets: per-sheet size correction (owner 2026-08-17)
     「Can you make the human figures and animals avatars the same size? 沙僧 is way
     smaller than the rat.」 — and they are, even though every renderer already draws
     them at one shared height.

     ⚠️ THE SHEETS ARE NOT DRAWN TO A COMMON SIZE. Every cell is 104px tall, but the
     creature inside it is not: 沙僧 draws 41x72 of an 80x104 cell while 鼠 draws
     101x92 of a 128x104 one, so at the same CSS height the rat covers about 2.3x the
     pixels. The five 西游记 humans are narrow and short in their cells; the 生肖
     animals fill theirs. Sizing by the cell is what makes them look unequal.

     ⚠️ THE METRIC IS DRAWN MASS, NOT DRAWN HEIGHT. Height is the intuitive answer and
     it is wrong: 蛇 and 龟 are drawn low and wide on purpose, so matching heights
     inflates them. sqrt(mean opaque pixels across the six frames) treats a tall thin
     monk and a low wide turtle as the same size, which is what the eye does.

     ⚠️ MEASURED, NEVER TYPED. Regenerate with local-admin/measure_avatar_scale.py
     whenever a sheet is added or redrawn; the script carries the reasoning and the
     one reference number that moves every avatar together. Do not hand-tune a single
     row — that is how a table like this stops meaning anything.

     ⚠️ THE ART IS UNTOUCHED. The correction is applied where the sheets are already
     being drawn at a non-integer zoom (a CSS height), so resampling the source would
     be the §14「像素画缩放」trap for nothing. Consumers multiply their own base size
     by this, so each screen keeps its own composition.

     ⚠️ THIRD ASSET FAMILY. These numbers describe art/sprite/avatar/*_sprite.png ONLY
     — never art/avatar/*.png (square, faces LEFT, the picker) or art/camp/pet_*.png. */
  var SPRITE_SCALE = {
    "jtw_bailongma": 1.07,         // drawn mass 60.5
    "jtw_shaseng": 1.44,           // drawn mass 45.2
    "jtw_sunwukong": 1.33,         // drawn mass 48.9
    "jtw_tangseng": 1.26,          // drawn mass 51.6
    "jtw_zhubajie": 1.27,          // drawn mass 51.2
    "pet_feng": 1.00,              // drawn mass 64.8
    "pet_gui": 0.89,               // drawn mass 72.7
    "pet_long": 1.05,              // drawn mass 62.2
    "pet_qilin": 1.14,             // drawn mass 56.8
    "zodiac_dog": 1.08,            // drawn mass 60.2
    "zodiac_dragon": 0.97,         // drawn mass 66.9
    "zodiac_goat": 0.90,           // drawn mass 71.8
    "zodiac_horse": 1.11,          // drawn mass 58.4
    "zodiac_monkey": 1.07,         // drawn mass 60.7
    "zodiac_ox": 1.10,             // drawn mass 59.0
    "zodiac_pig": 1.01,            // drawn mass 64.3
    "zodiac_rabbit": 1.06,         // drawn mass 61.4
    "zodiac_rat": 0.97,            // drawn mass 67.0
    "zodiac_rooster": 1.01,        // drawn mass 64.6
    "zodiac_snake": 1.37,          // drawn mass 47.5
    "zodiac_tiger": 1.07           // drawn mass 60.8
  };
  /* ⚠️ Unknown id returns 1, never 0 or null: a sheet added to art/ before this table
     is regenerated must render at its old size, not vanish. */
  function spriteScale(id) {
    var k = id && SPRITE_SCALE[id];
    return k > 0 ? k : 1;
  }

  /* AvatarInfoCard (设计文档 §3): the ONE enlarged card both entry points use —
     a grid thumbnail and the student's own current avatar. Same card, same code;
     only the primary button differs, so the two flows can never drift apart.
       mode "pick"    -> 「选用这个头像」, calls onChoose(id) (the caller writes avatarId)
       mode "current" -> 「换一个」,       calls onSwitch()   (the caller opens the grid)
     opts.onReroll (dice roll) adds 「🎲 再抽一次」 so the student can keep rolling
     from this same card until they like what they see.
     Sits above the picker (z 68 vs 65) so 返回 reveals the grid underneath. */
  function openAvatarInfo(id, opts) {
    var a = avatarById(id);
    if (!a) { if (opts && opts.onSwitch) opts.onSwitch(); return; }
    opts = opts || {};
    var isCurrent = opts.mode === "current";
    /* A locked avatar still opens the SAME card — art, name and 简介 all readable —
       it just cannot be chosen, and says plainly what would unlock it (§3.4). */
    var lk = isCurrent ? null : avatarLock(a.id);
    var ov = document.createElement("div");
    ov.className = "pop-overlay";
    ov.style.zIndex = "68";
    ov.innerHTML = '<div class="pop-card av-info">' +
      '<div class="av-info-img' + (lk ? " locked" : "") + '"><img src="' + esc(a.file) + '" alt="">' +
        (lk ? '<span class="av-info-lockmark">🔒</span>' : "") + '</div>' +
      '<div class="av-info-name">' + esc(a.label) + '</div>' +
      (lk ? '<div class="av-info-lock">🔒 ' + esc(lk.why) + '</div>' : "") +
      /* the price is still worth showing while the 历练值 gate blocks it — the student
         should know what to save up for, not just what to grind for */
      (lk && lk.blocked === "pts" ? '<div class="av-info-sub">解锁后可用 ' + lingLuHtml() + ' ' + lk.price + ' 兑换</div>' : "") +
      (a.bio ? '<div class="av-info-bio">' + esc(a.bio) + '</div>' : "") +
      '<div class="nav-row" style="margin-top:14px">' +
        '<button class="nav-btn" id="aiBack">' + (isCurrent ? "关闭" : "返回") + '</button>' +
        (opts.onReroll ? '<button class="nav-btn" id="aiRoll">🎲 再抽一次</button>' : "") +
        (lk && lk.canBuy ? '<button class="nav-btn primary" id="aiBuy">兑换 · ' + lingLuHtml() + ' ' + lk.price + '</button>'
          : lk ? '<button class="nav-btn" id="aiOk" disabled aria-disabled="true">' + esc(lk.btn || "🔒 尚未解锁") + '</button>'
            : '<button class="nav-btn primary" id="aiOk">' + (isCurrent ? "换一个" : "选用这个头像") + '</button>') +
      '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelector("#aiBack").onclick = function () { ov.remove(); };
    if (opts.onReroll) {
      ov.querySelector("#aiRoll").onclick = function () { ov.remove(); opts.onReroll(); };
    }
    if (!lk) ov.querySelector("#aiOk").onclick = function () {
      ov.remove();
      if (isCurrent) { if (opts.onSwitch) opts.onSwitch(); }
      else if (opts.onChoose) opts.onChoose(a.id);
    };
    /* 兑换: always behind a confirm that names the price and says plainly that it is
       permanent and non-refundable — 灵露 spent here cannot come back (§3.6). */
    if (lk && lk.canBuy) ov.querySelector("#aiBuy").onclick = function () {
      confirmDialog(
        '<div class="pop-title">兑换头像</div><div class="pop-body">用 ' + lingLuHtml() + ' <b>' + lk.price +
        '</b> 兑换「' + esc(a.label) + '」并立刻换上？<br><span class="pop-hint">兑换后永久拥有，四个科目都能用；灵露不退还。</span></div>',
        "确定兑换",
        function () {
          if (!buyAvatar(a.id)) return;                 // wallet moved since the card opened
          ov.remove();
          if (opts.onChoose) opts.onChoose(a.id);
        });
    };
  }

  /* 头像选择弹层: a thumbnail tap opens the AvatarInfoCard first (设计文档 §0.5) —
     the student reads the 简介 and only then confirms, so nothing is written on
     a stray tap. */
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
      /* Locked entries are shown greyed with a 🔒, never hidden (§3.4) — seeing what
         can be earned is the motivation. Tapping one still opens its card, which is
         where the unlock condition is spelled out. */
      var gridHtml = shown.map(function (a) {
        var lk = avatarLock(a.id);
        /* a purchasable one shows its price right on the cell — the price IS the
           motivation, and burying it one tap deep hides the whole 灵露 sink */
        var tag = (lk && lk.price && !lk.blocked) ? '<span class="av-price">' + lingLuHtml() + ' ' + lk.price + '</span>'
          : (lk && lk.blocked === "pts") ? '<span class="av-price">🔒 历练值</span>' : "";
        return '<div class="avatar-cell"><button class="avatar-thumb' + (a.id === currentId ? " on" : "") +
          (lk ? " locked" : "") + '" data-id="' + a.id + '"' + (lk ? ' title="' + esc(lk.why) + '"' : "") + '>' +
          '<img src="' + esc(a.file) + '" alt="">' + (lk ? '<span class="av-lock">🔒</span>' : "") +
          '</button><span class="avatar-cell-label">' + esc(a.label) + tag + '</span></div>';
      }).join("");
      var pickable = shown.filter(function (a) { return !avatarLock(a.id); });
      var purse = walletLingLu();
      ov.innerHTML = '<div class="pop-card">' +
        '<div class="pop-title">换头像' +
          (purse == null ? "" : '<span class="av-purse">' + lingLuHtml() + ' ' + purse + '</span>') + '</div>' +
        '<div class="prof-chips">' + chipsHtml + '</div>' +
        '<div class="avatar-grid">' + (gridHtml || '<div class="pop-note">这个分类还没有头像。</div>') + '</div>' +
        '<div class="nav-row" style="margin-top:14px"><button class="nav-btn" id="apClose">取消</button>' +
        (pickable.length > 1 ? '<button class="nav-btn" id="apRoll">🎲 随机抽一个</button>' : "") + '</div></div>';
      ov.querySelector("#apClose").onclick = function () { ov.remove(); };
      /* Dice roll: shows the rolled avatar's card with 再抽一次 on it, so the
         student keeps rolling from there and only writes anything on 选用. The
         roll stays inside the current category filter, and never rolls the
         avatar it just showed (a repeat reads as a broken button). */
      function roll(lastId) {
        /* the dice never rolls a locked avatar — a roll that lands on something the
           student cannot choose reads as a broken button */
        var pool = pickable.filter(function (a) { return a.id !== lastId; });
        if (!pool.length) return;
        var pick = pool[Math.floor(Math.random() * pool.length)];
        openAvatarInfo(pick.id, {
          mode: "pick",
          onChoose: function (id) { ov.remove(); if (onPick) onPick(id); },
          onReroll: function () { roll(pick.id); }
        });
      }
      var rollBtn = ov.querySelector("#apRoll");
      if (rollBtn) rollBtn.onclick = function () { roll(currentId); };
      Array.prototype.forEach.call(ov.querySelectorAll(".prof-chip[data-cat]"), function (b) {
        b.onclick = function () { activeCat = b.getAttribute("data-cat"); render(); };
      });
      Array.prototype.forEach.call(ov.querySelectorAll(".avatar-thumb"), function (b) {
        b.onclick = function () {
          openAvatarInfo(b.getAttribute("data-id"), {
            mode: "pick",
            onChoose: function (id) { ov.remove(); if (onPick) onPick(id); }
          });
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
    peekCode: peekCode,
    setPendingCode: setPendingCode,
    takePendingCode: takePendingCode,
    /* ---- VS3 combined codec (owner 2026-08-17). ⚠️ ONE planner, ONE writer: cs.js's
       new-device path calls decodeCode + commitAll rather than keeping a second decoder,
       because two decoders for one wire format is how a format silently forks. ---- */
    /* encodeCode is the counterpart of decodeCode. It was internal while the only
       caller was this panel; it is public now so the pair can be exercised end to end
       (and so a future screen never grows a third encoder — two is already the limit,
       see teacher.html). */
    encodeCode: encodeAll,
    decodeCode: decodeCode,
    commitAll: commitAll,
    /* ---- 恢复码 claims/{code} (owner 2026-08-19). Ten characters, needs the network,
       brings back the economy too. The long code stays as the offline route. ---- */
    claimCode: claimCode,
    ensureClaimCode: ensureClaimCode,
    pushClaim: pushClaim,
    rotateClaimCode: rotateClaimCode,
    restoreFromClaim: restoreFromClaim,
    isVirginAccount: isVirginAccount,
    snapshotAll: snapshotAll,
    planDelta: planDelta,
    maybePromptClassUpdate: maybePromptClassUpdate,
    openAvatarPicker: openAvatarPicker,
    openAvatarInfo: openAvatarInfo,
    avatarImgHtml: avatarImgHtml,
    avatarFile: avatarFile,
    /* 词雨 runner, 攀山快答 climber, 词海钓鱼 angler and 沙滩快跑 runner all size the
       6-frame sheets themselves; this is the one place that knows how big each
       creature is actually drawn inside its cell. */
    spriteScale: spriteScale,
    /* 拼音 / 英文 for pages with no engine of their own — the landing page calls
       ownAid(true) once and then owns these classes. See the block above. */
    ownAid: ownAid,
    applyAid: applyAid,
    aidPillsHtml: aidPillsHtml,
    wireAidPills: wireAidPills,
    aidPy: aidPy,
    aidEn: aidEn,
    /* the dual-class gloss span both families recognise; used by the nickname
       picker and the profile panel, which are shown on every page. */
    gloss: fbGloss,
    /* cs.js asks before drawing the 攀山快答 sprite; keep the unlock rules in one place */
    isAvatarUnlocked: isAvatarUnlocked,
    avatarLock: avatarLock,
    openFeedback: openFeedback
  };

  /* 船只 — its own namespace rather than more keys on WSProfile, because FIVE very
     different consumers touch it: nickname.js (sea map), xh.js (pier scene, shop,
     贝壳 purchase), cs.js (camp shop, 灵露 purchase). Ownership is global and this
     is the only writer. */
  window.WSBoats = {
    list: function () { return BOATS.slice(); },
    byTier: boatByTier,
    owns: ownsBoat,
    owned: ownedBoats,
    buyable: boatBuyable,
    pick: boatPick,
    setPick: setBoatPick,
    grant: grantBoat,            // ⚠️ call ONLY after payment has succeeded
    buyLingLu: buyBoatLingLu,
    art: boatArt,
    migrateDockBoat: migrateDockBoat
  };
})();
