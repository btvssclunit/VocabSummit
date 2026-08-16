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

  /* deployed asset version, read off this file's own <script src> — the same
     trick app.js/arena.js use for the data fetches. Reported with every ticket so
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
     landing page and at 启航码头, where there is no current stream at all.

     ⚠️ PTS_UNLOCK duplicates the THIRD rung (踏云者) of app.js's LADDER. Same
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
     it resolves on the landing page and at 启航码头 too */
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
      /* no wallet in reach: the landing page and 启航码头 have no stream, so there is
         no wallet to spend from — say where to go, never 「灵露不足」 */
      if (have == null) return { price: a.price, btn: "🔒 到科目页里兑换", why: "灵露 " + a.price + " · 到科目页里兑换" };
      if (have < a.price) return { price: a.price, btn: "🔒 灵露不足", why: "灵露 " + a.price + "（还差 " + (a.price - have) + "）" };
      return { price: a.price, canBuy: true, why: "灵露 " + a.price + " · 立即兑换" };
    }
    return null;
  }
  function isAvatarUnlocked(id) { return !avatarLock(id); }
  /* The ONLY writer of avatarsOwned. Deducts from the CURRENT stream's wallet through
     app.js (which owns the store) and only records the purchase if the deduction
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
  /* 灵露 purchase, from the CURRENT stream's wallet via app.js's provider hook.
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

     ⚠️ fnv1a and b64urlToUtf8 are duplicated from app.js on purpose. They are the
     wire format: changing either would invalidate every code ever issued, so they
     can never drift. Do NOT "share" them by importing app.js — this file is loaded
     on the landing page, where app.js is not. */
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
  var STREAM_LABEL = { g1: "词星大冒险 · G1 基础华文", g2: "词将竞技场 · G2 普通学术华文",
                       g3: "词王淬炼坊 · G3 快捷华文", hcl: "词圣鸿文苑 · 高级华文" };
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
  /* PURE. Returns {stream, streamLabel, n, nick, legacy} or {err}. Never writes. */
  function peekCode(code) {
    var p = String(code || "").trim().split(".");
    if (p[0] === "VS2") {
      if (p.length !== 7) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (_fnv1a(p.slice(0, 6).join(".")) !== p[6]) {
        return { err: "进度码不完整或已损坏，请重新复制一次。" };
      }
      if (!STREAM_LABEL[p[1]]) return { err: "进度码里的科目无法识别。" };
      var tot = parseInt(p[2], 10) || 0;
      return { stream: p[1], streamLabel: STREAM_LABEL[p[1]], n: tot,
               mastered: _countBits(p[3], tot),
               nick: _b64urlToUtf8(p[5]), legacy: false };
    }
    if (p[0] === "VS1") {
      // VS1 carries no nickname, so it can prove the subject but not the identity
      if (p.length !== 5) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (!STREAM_LABEL[p[1]]) return { err: "进度码里的科目无法识别。" };
      var tot1 = parseInt(p[2], 10) || 0;
      return { stream: p[1], streamLabel: STREAM_LABEL[p[1]], n: tot1,
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
     student accepts it or dismisses the dialog */
  function takePendingCode(stream) {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); } catch (e) {}
    if (!raw || (stream && raw.stream !== stream)) return null;
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
    return raw;
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
           report needs. app.js publishes the live question through
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
        /* The only close affordance: sticky to the CARD, so it is reachable
           from anywhere in the panel. The old 关闭 button at the very bottom
           was removed once this shipped — it was unreachable without scrolling
           to the end, which was the original complaint. Backdrop tap works too. */
        '<button class="prof-x" id="profCloseX" aria-label="关闭我的档案" title="关闭">✕</button>' +
        '<div class="pop-title">👤 我的档案</div>' +
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
                '<button class="code-link" id="profChangeAvatar">换头像</button>' +
                '<button class="code-link" id="profChangeNick">换昵称</button></div>' +
            '</div>' +
          '</div>' +
          '<div class="pop-label" style="font-weight:500;margin-top:10px">学校</div>' +
          (window.SG_SCHOOLS ? window.SG_SCHOOLS.searchHtml("profSchoolQ", draft.schoolQ) : "") +
          '<select class="np-select" id="profSchool">' +
            (window.SG_SCHOOLS ? window.SG_SCHOOLS.optionsHtml(draft.schoolPick, draft.schoolQ)
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

        /* Column break sits HERE, and only here, because it is the split that
           leaves the two columns nearly the same height (identity+progress vs
           code+tech). Moving it costs the panel hundreds of px of dead space. */
        '</div><div class="prof-col">' +

        // ---- 进度码 ----
        '<div class="prof-sec"><div class="pop-label">进度码 · 备份与恢复</div>' + codeSectionHtml() + '</div>' +

        // ---- 意见反馈 ----
        '<div class="prof-sec"><div class="pop-label">意见反馈</div>' +
          '<div class="pop-note">发现词语内容有误、程序出错，或者有建议，都可以告诉我们。</div>' +
          '<div class="nav-row" style="margin-top:8px"><button class="nav-btn" id="profFeedback">✍️ 我要反馈</button></div>' +
          '<div class="pop-note" id="profFbMine" style="margin-top:6px"></div></div>' +

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

        '</div></div>'; // .prof-col + .prof-grid

      card.innerHTML = html;
      wire();
    }

    function wire() {
      ov.querySelector("#profCloseX").onclick = function () { ov.remove(); };

      ov.querySelector("#profFeedback").onclick = function () { openFeedback(); };
      renderMyFeedback();

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
          draft.schoolPick = v;
          if (v !== "other") draft.school = v;
          if (wasOther) render();   // the free-text box has to go now a school was found
        });
      }
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
    maybePromptClassUpdate: maybePromptClassUpdate,
    openAvatarPicker: openAvatarPicker,
    openAvatarInfo: openAvatarInfo,
    avatarImgHtml: avatarImgHtml,
    avatarFile: avatarFile,
    /* 词雨 runner, 攀山竞速 climber, 词海垂钓 angler and 踏浪竞速 runner all size the
       6-frame sheets themselves; this is the one place that knows how big each
       creature is actually drawn inside its cell. */
    spriteScale: spriteScale,
    /* app.js asks before drawing the 攀山竞速 sprite; keep the unlock rules in one place */
    isAvatarUnlocked: isAvatarUnlocked,
    avatarLock: avatarLock,
    openFeedback: openFeedback
  };

  /* 船只 — its own namespace rather than more keys on WSProfile, because FIVE very
     different consumers touch it: nickname.js (sea map), xh.js (pier scene, shop,
     贝壳 purchase), app.js (camp shop, 灵露 purchase). Ownership is global and this
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
