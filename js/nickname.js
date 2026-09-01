/* 词山学海 · Vocab Summit — standalone nickname picker for the landing page
   (index.html). This intentionally duplicates the DESC_CATS/NOUN_CATS word
   pools + picker UI from cs.js rather than loading cs.js itself, because
   cs.js boots straight into fetching a level's word JSON (g1/g2/g3/hcl)
   and expects level-specific DOM that doesn't exist on the landing page.
   PROFILE_KEY / profile shape must stay in sync with cs.js. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

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

  /* ---------- profile ----------
     Owned solely by profile.js / window.WSProfile; these are thin delegations
     so the shape never drifts between this file and cs.js. */
  function loadProfile() { return window.WSProfile ? window.WSProfile.load() : null; }
  function saveProfileLocal(p) { if (window.WSProfile) window.WSProfile.save(p); }


  /* ================= 昵称的英文 (owner 2026-08-26) =========================
     「any chance for them to see English translation of their nicknames? For
     character names like wukong babe baoyu etc it's fine to leave it as pinyin,
     but the descriptor ideally should be translated」

     A nickname is 描述词·名词 and the two halves need OPPOSITE treatment:

     · DESC_EN — every 描述词 is a 成语, and a 成语 is exactly the thing a
       non-Chinese reader cannot guess. Each gets ONE SHORT EPITHET, not a
       dictionary definition. 「百折不挠」is "Unbreakable", never "to be
       indomitable; unyielding despite setbacks" — that gloss is correct for a
       vocabulary list and useless as half of a name. 46 of these words also live
       in the word data with a reviewed `en`; those epithets were compressed FROM
       that gloss so the two can never say different things about the same 成语.

     · NOUN_EN — split by what the noun IS, not by category. A proper name
       ROMANISES (悟空 → Wukong, 宝玉 → Baoyu): translating it would invent a
       person who does not exist. A common noun TRANSLATES (熊猫 → Panda), because
       "Unbreakable · Xióngmāo" helps nobody — the reader still cannot read it.
       The mythical beasts sit in between and follow established English usage
       (朱雀 → Vermilion Bird), which is what an encyclopedia would print.

     ⚠️ ⚠️ NOT TEACHER-REVIEWED. These 207 strings were written in one pass on
     2026-08-26 and no native speaker has swept them. They are student-facing text
     in a language-teaching product, so they want a teacher's eye before anyone
     calls them final — the epithet is a judgement call in a way a word count is
     not. Nothing breaks if one is off; it just reads oddly.

     ⚠️ A MISSING KEY PRINTS NOTHING, deliberately (see nickEn): half a translated
     name is worse than none. Add words to DESC_CATS/NOUN_CATS and their English
     IN THE SAME EDIT, exactly as PY_LAB/EN_LAB demand. */
  var DESC_EN = {
    /* 坚毅拼搏 */
    "百折不挠": "Unbreakable", "持之以恒": "Steadfast", "坚持不懈": "Relentless",
    "坚持到底": "Sees It Through", "全力以赴": "All-Out", "孜孜不倦": "Tireless",
    "锲而不舍": "Never Lets Go", "勇往直前": "Forward, Always",
    "脚踏实地": "Feet on the Ground", "迎难而上": "Meets the Hard Thing",
    "坚忍不拔": "Unshakeable", "自强不息": "Ever Striving",
    /* 智慧机敏 */
    "高瞻远瞩": "Far-Sighted", "融会贯通": "Joins the Dots", "入木三分": "Cuts Deep",
    "言简意赅": "Says It in a Line", "足智多谋": "Full of Plans",
    "聪明伶俐": "Quick-Witted", "博学多才": "Widely Learned",
    "触类旁通": "Learns One, Knows Ten", "随机应变": "Thinks on Their Feet",
    "才思敏捷": "Quick of Mind", "见多识广": "Seen Much, Knows Much",
    "举一反三": "One Leads to Three", "明察秋毫": "Misses Nothing",
    "满腹经纶": "Full of Learning", "冰雪聪明": "Bright as Snow",
    "才华横溢": "Brimming with Talent",
    /* 仁爱慷慨 */
    "恻隐之心": "Tender-Hearted", "海纳百川": "Wide as the Sea",
    "慷慨解囊": "Open-Handed", "推己及人": "Puts Themselves in Your Place",
    "雪中送炭": "Warmth in the Snow", "乐善好施": "Glad to Give",
    "与人为善": "Means Well by All", "助人为乐": "Happy to Help",
    "古道热肠": "Warm-Hearted", "善解人意": "Understands People",
    "宽宏大量": "Big-Hearted", "体贴入微": "Thoughtful in Everything",
    /* 专注严谨 */
    "聚精会神": "All Attention", "专心致志": "Single-Minded",
    "心无旁骛": "Undistracted", "一丝不苟": "Not One Thread Loose",
    "有条不紊": "Everything in Order", "精益求精": "Better Still",
    "深思熟虑": "Thinks It Through", "谨慎周全": "Careful and Complete",
    "认真负责": "Takes It Seriously", "严谨细致": "Precise and Careful",
    /* 活力热忱 */
    "生龙活虎": "Dragon and Tiger", "兴致勃勃": "Full of Interest",
    "慷慨激昂": "Impassioned", "朝气蓬勃": "Full of Morning",
    "神采奕奕": "Glowing", "精神抖擞": "Wide Awake", "意气风发": "High-Spirited",
    "活力四射": "Bursting with Energy", "热情洋溢": "Overflowing with Warmth",
    "斗志昂扬": "Fighting Spirit", "热血沸腾": "Blood Up", "生气勃勃": "Full of Life",
    /* 正直担当 */
    "光明磊落": "Open and Above Board", "刚正不阿": "Bends to No One",
    "正气凛然": "Upright and Fearless", "大公无私": "Fair to All",
    "敢作敢当": "Bold and Answerable", "正直无私": "Upright and Selfless",
    "勇于担当": "Shoulders It", "公正严明": "Just and Clear",
    /* 诚信真挚 */
    "言出必行": "Word Is Deed", "一诺千金": "A Promise Worth Gold",
    "推心置腹": "Heart to Heart", "以礼待人": "Treats All with Courtesy",
    "诚实守信": "Honest and True", "真心实意": "Wholehearted",
    "表里如一": "Same Inside and Out", "坦诚相待": "Frank and Open",
    "待人以诚": "Meets You Sincerely",
    /* 团结情谊 */
    "群策群力": "All Minds, All Hands", "同甘共苦": "Through Sweet and Bitter",
    "求同存异": "Common Ground, Room to Differ", "兼容并蓄": "Room for All",
    "同心协力": "One Heart, One Effort", "齐心协力": "All Pulling Together",
    "和衷共济": "Weathers It Together", "众志成城": "Many Wills, One Wall",
    "团结一心": "United as One", "互帮互助": "Helping Each Other",
    /* 吉祥美好 */
    "大吉大利": "Great Good Fortune", "花好月圆": "Flowers Bright, Moon Full",
    "龙凤呈祥": "Dragon and Phoenix", "一帆风顺": "Fair Winds",
    "万事大吉": "All Is Well", "诸事大吉": "Good Fortune in All Things",
    "繁荣昌盛": "Flourishing",
    /* 卓越非凡 */
    "别具一格": "A Style of Their Own", "出类拔萃": "Head and Shoulders Above",
    "大显身手": "Shows What They Can Do", "独树一帜": "Flies Their Own Flag",
    "独一无二": "One of a Kind", "凤毛麟角": "Rare as Phoenix Down",
    "举世无双": "Second to None", "脱颖而出": "Comes to the Fore",
    /* 从容自在 */
    "从容不迫": "Unhurried", "悠然自得": "At Ease", "泰然自若": "Calm Under Anything",
    "镇定自若": "Keeps Their Head", "气定神闲": "Steady and Serene",
    "心平气和": "Even-Tempered", "怡然自得": "Content", "不慌不忙": "In No Rush",
    "淡定自如": "Unruffled", "安之若素": "Takes It as It Comes",
    "自得其乐": "Finds Their Own Joy", "随遇而安": "At Home Anywhere",
    /* 个性独特 */
    "与众不同": "Unlike Anyone Else", "独具匠心": "An Original Mind",
    "卓尔不群": "A Cut Apart", "不拘一格": "Bound by No Mould",
    "别出心裁": "Thinks Differently", "独具一格": "A Style All Their Own"
  };
  /* ⚠️ ROMANISED where the noun names a PERSON or a named creature, TRANSLATED
     where it names a thing. That line is the owner's («character names … fine to
     leave it as pinyin»), applied to the whole list rather than to the three
     categories that happen to be novels. */
  var NOUN_EN = {
    /* 神话异兽 — established English usage, not invention */
    "麒麟": "Qilin", "朱雀": "Vermilion Bird", "玄武": "Black Tortoise",
    "青龙": "Azure Dragon", "白虎": "White Tiger", "九尾狐": "Nine-Tailed Fox",
    "貔貅": "Pixiu", "鲲": "Kun",
    /* 星宿天象 */
    "北斗": "Big Dipper", "启明": "Morning Star", "织女": "Weaver Girl",
    "牵牛": "Cowherd", "太白": "Venus", "辰星": "Mercury", "紫微": "Ziwei",
    /* 西游记 · 三国 · 红楼 · 经典故事 — people, so romanised */
    "悟空": "Wukong", "八戒": "Bajie", "沙僧": "Sha Seng",
    "孔明": "Kongming", "关羽": "Guan Yu", "赵云": "Zhao Yun",
    "张飞": "Zhang Fei", "周瑜": "Zhou Yu",
    "宝玉": "Baoyu", "黛玉": "Daiyu", "宝钗": "Baochai",
    "探春": "Tanchun", "湘云": "Xiangyun",
    "花木兰": "Hua Mulan", "愚公": "Yugong", "精卫": "Jingwei", "夸父": "Kuafu",
    /* 文人游侠 · 身份泛称 — roles, not names, so translated */
    "墨客": "Poet", "行者": "Wanderer", "学士": "Scholar", "旅人": "Traveller",
    "状元": "Top Scholar", "书生": "Bookworm", "侠客": "Knight-Errant",
    "樵夫": "Woodcutter", "渔夫": "Fisherman", "匠人": "Artisan",
    "商人": "Merchant", "农夫": "Farmer",
    /* 可爱动物 */
    "熊猫": "Panda", "狐狸": "Fox", "猫头鹰": "Owl", "水獭": "Otter",
    "松鼠": "Squirrel", "企鹅": "Penguin", "考拉": "Koala", "刺猬": "Hedgehog",
    "仓鼠": "Hamster", "柴犬": "Shiba", "兔子": "Rabbit", "锦鲤": "Koi",
    /* 花草植物 */
    "梅": "Plum Blossom", "兰": "Orchid", "竹": "Bamboo", "松": "Pine",
    "荷": "Lotus", "柳": "Willow", "榕": "Banyan", "枫": "Maple",
    "桂": "Osmanthus", "牡丹": "Peony",
    /* 自然元素 */
    "星辰": "Stars", "明月": "Bright Moon", "流云": "Drifting Cloud",
    "长风": "Long Wind", "雷霆": "Thunder", "云霞": "Rosy Clouds",
    "山雾": "Mountain Mist", "长虹": "Rainbow", "晨露": "Morning Dew",
    /* 文化器物 */
    "玉盘": "Jade Plate", "算盘": "Abacus", "香囊": "Sachet", "罗盘": "Compass",
    "折扇": "Folding Fan", "灯笼": "Lantern", "竹简": "Bamboo Slips",
    "印玺": "Seal", "锦囊": "Brocade Pouch", "铜镜": "Bronze Mirror"
  };

  function renderNicknamePicker(onDone, opts) {
    opts = opts || {};
    var dismissible = !!opts.dismissible;
    var _bvss = "百德中学 Bukit View Secondary School";
    var _cs = opts.currentSchool || "";
    var _csKnown = _cs && window.SG_SCHOOLS && window.SG_SCHOOLS.isKnown(_cs);
    /* set when the student claims a 进度码 on a new device: {code, stream,
       streamLabel, n, nick}. It OVERRIDES the rolled name — see nickOf(). */
    var st = { step: "confirm", restored: null, codeErr: "", codeVal: "",
      descCat: null, desc: null, nounCat: null, noun: null,
      role: opts.currentRole || "student",
      schoolSel: _cs ? (_csKnown ? _cs : "other") : _bvss,
      schoolOther: (_cs && !_csKnown) ? _cs : "",
      schoolQ: "",
      /* 班级, students only. Carried in so 换昵称 from 我的档案 round-trips it
         instead of handing save() an empty string and wiping the class. */
      mtlClass: opts.currentClass || "",
      heardFrom: opts.currentHeard || "" };
    var NP_CLASS = { pfx: "np", inputCls: "code-ta" };
    if (window.BV_CLASSES) window.BV_CLASSES.syncField(st);
    /* Open ON a rolled name (owner 2026-08-15). The four chip steps are a real
       barrier for a student who just wants to start: 大类 → 描述词 → 名词大类 →
       名词 is four decisions before the app will let them in. The dice was always
       there, but only as one button among the first step's chips. Now the roll IS
       the first screen — 换一个 re-rolls, and 我要自己选昵称 at the bottom opens the
       manual flow for anyone who wants it. Nothing is saved until 确认. */
    rollNick();
    /* the confirmed nickname: a claimed code's owner wins over the dice, because
       the whole point is to land back on the identity the old progress is under.
       ⚠️ A restored nickname is ONE string — it does not split into 描述词·名词 —
       so every site that used to concatenate st.desc/st.noun goes through here. */
    function nickOf() {
      return st.restored && st.restored.nick ? st.restored.nick : (st.desc + "·" + st.noun);
    }
    /* ⚠️ ROLLED NAMES ONLY. A restored nickname is one opaque string — nickOf()
       above says so — and it does not split into 描述词·名词. Running it through
       the tables would print nothing, or worse, half of it.
       ⚠️ Returns "" unless BOTH halves are known: half an English name
       ("Unbreakable · 宝玉") is worse than leaving it in Chinese. */
    function nickEn() {
      if (st.restored) return "";
      var d = DESC_EN[st.desc], n = NOUN_EN[st.noun];
      return (d && n) ? (d + " · " + n) : "";
    }

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
        /* ⚠️ The English goes INSIDE the chip, not in the title attribute. The
           screen this was reported from is an iPhone, and a phone has no hover —
           a title is invisible to exactly the reader it was meant for.
           ⚠️ np() emits a display:block span, so with the English aid OFF the chip
           renders identically to before: one line, same pill. */
        var en = DESC_EN[label] || NOUN_EN[label] || "";
        html += '<span class="wchip not" data-v="' + esc(label) + '"' + title + '>' +
          esc(label) + (en ? np("", "", en) : "") + '</span>';
      });
      html += '</div>';
      return html;
    }
    function wireChips(root, onClick) {
      Array.prototype.forEach.call(root.querySelectorAll(".wchip"), function (el) {
        el.onclick = function () { onClick(el.getAttribute("data-v")); };
      });
    }

    /* 🎲 roll a fresh 描述词·名词 pair. Used by the first-step dice AND by
       换一个 on the confirm step, so a student can keep rolling until they like
       the name instead of walking the four chip steps again. */
    function rollNick() {
      var dCats = Object.keys(DESC_CATS), nCats = Object.keys(NOUN_CATS);
      var dCat = dCats[Math.floor(Math.random() * dCats.length)];
      var nCat = nCats[Math.floor(Math.random() * nCats.length)];
      var dList = DESC_CATS[dCat], nList = NOUN_CATS[nCat];
      st.descCat = dCat; st.desc = dList[Math.floor(Math.random() * dList.length)].w;
      st.nounCat = nCat; st.noun = nList[Math.floor(Math.random() * nList.length)];
    }

    /* ⚠️ 拼音 / 英文 for the registration flow (owner 2026-08-17: 「so that non
       chinese users can also create their profile with ease」). This screen is the
       first one anyone sees and it was Chinese-only.
       ⚠️ Goes through WSProfile.gloss, which emits BOTH class families, so the
       spans are gated by whichever page is showing the picker — the landing page
       (profile.js owns the classes there), a stream page, or the pier.
       ⚠️ Key = the Chinese on screen, one pinyin syllable per 汉字 (§10). A missing
       key returns an empty string SILENTLY, so add the pinyin in the same edit as
       the label. */
    function np(zh, py, en) {
      return (window.WSProfile && window.WSProfile.gloss)
        ? window.WSProfile.gloss(zh, py, en) : "";
    }
    /* degrades to no English rather than to a wrong one, same contract as np() */
    function codeErrEn(zh) {
      return (window.WSProfile && window.WSProfile.codeErrEn)
        ? window.WSProfile.codeErrEn(zh) : "";
    }

    /* ---------- 提示开关，装在弹窗自己身上 (owner 2026-08-25) ----------
       ⚠️ THE TOPBAR PILLS ARE UNREACHABLE FROM HERE, on every page that shows this
       picker, and that is the whole bug: on the landing page .pop-overlay covers
       them (elementFromPoint on the pill returns the overlay), and on 出发码头
       WSProfile.aidPillsHtml() returns "" because xh.js owns the gate classes, so
       the picker has no pills at all. A first-run picker is opened
       `dismissible:false` — no 取消 — so a student who cannot read 昵称／身份／班级
       has no way to ask for help and no way out. The aids can be switched on
       BEFORE 开始旅程 and nothing says so; after that the door is shut.

       ⚠️ REACHABILITY, NOT A LOUDER DEFAULT (owner 2026-08-25:「student who already
       know CL will find it weird if they see pinyin and english forcefully
       displayed」). Forcing both aids on for this one screen was considered and
       REJECTED. Whatever the student already had is what they get; this only puts
       the switch where their thumb is. Do not "fix" this later by defaulting it on.

       ⚠️ THE HOST OWNS THE STATE. opts.aid lets 出发码头 hand in its own
       store.py/store.en accessors, because the pier and the landing page are two
       INDEPENDENT switches by design (profile.aidPy/aidEn vs the pier store's
       py/en) — a profile-backed toggle on the pier would be reverted by the next
       applyAids(). With no adapter we fall back to the profile-backed pair.

       ⚠️ NO PILLS is the right answer on a page where nothing owns the gates: a
       stream page drives body.py-aid from its own per-stream setting, so a toggle
       here would save a preference and change nothing on screen. aidPillsHtml()
       returns "" under exactly that condition, so it is the probe — cheaper and
       more honest than exporting profile.js's _ownAid. */
    function aidBridge() {
      if (opts.aid && opts.aid.get && opts.aid.set) return opts.aid;
      var P = window.WSProfile;
      if (!P || !P.load || !P.save || !P.applyAid) return null;
      if (!P.aidPillsHtml || !P.aidPillsHtml()) return null;   // nothing owns the gates here
      return {
        get: function (k) { return k === "py" ? P.aidPy() : P.aidEn(); },
        set: function (k, on) {
          var p = P.load() || {};
          p[k === "py" ? "aidPy" : "aidEn"] = on;
          P.save(p);          // merges onto prev, so 确认 later cannot wipe this
          P.applyAid();
        }
      };
    }
    var _aid = aidBridge();
    /* ⚠️ EN FIRST — cs.js, the pier and profile.js were all aligned to that order on
       2026-08-16 so the two pills never swap under a finger. Do not re-flip it. */
    function aidRowHtml() {
      if (!_aid) return "";
      function pill(k, ic, lab, title) {
        var on = !!_aid.get(k);
        return '<button type="button" class="np-aid-btn' + (on ? " on" : "") + '"' +
          ' data-aid="' + k + '" aria-pressed="' + (on ? "true" : "false") +
          '" title="' + esc(title) + '"><span class="np-aid-ic">' + ic +
          '</span><span class="np-aid-lab">' + lab + '</span></button>';
      }
      return '<div class="np-aid">' + pill("en", "中", "EN", "中文 / English") +
        pill("py", "拼", "拼音", "拼音提示 Pinyin") + '</div>';
    }
    /* A CLASS FLIP, NEVER A RE-RENDER (§10): the glosses are CSS-gated spans that
       are already in the markup, and re-rendering mid-flow would throw away a
       half-typed school name or a chip step the student had walked into. */
    function wireAidRow(root) {
      if (!_aid) return;
      Array.prototype.forEach.call(root.querySelectorAll("[data-aid]"), function (b) {
        b.onclick = function () {
          var k = b.getAttribute("data-aid"), on = !_aid.get(k);
          _aid.set(k, on);
          b.classList.toggle("on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
          /* keep the page's own pill honest even though it is behind the overlay,
             or closing the picker reveals a toggle that disagrees with the screen */
          var twin = document.getElementById(k === "py" ? "wsAidPy" : "wsAidEn") ||
                     document.getElementById(k === "py" ? "xhTgPy" : "xhTgEn");
          if (twin) {
            twin.classList.toggle("on", on);
            twin.setAttribute("aria-pressed", on ? "true" : "false");
          }
        };
      });
    }

    function renderStep() {
      var html = "";
      var closeBtn = dismissible ? '<div class="nav-row"><button class="nav-btn" id="npCancel">取消' +
        np("取消", "qǔ xiāo", "Cancel") + '</button></div>' : "";

      if (st.step === "descCat") {
        html = '<div class="pop-title">✨ 选一个昵称' +
            np("选一个昵称", "xuǎn yī gè nì chēng", "Pick a nickname") + '</div>' +
          '<div class="pop-body">昵称随时可在设置中更改，先选一个开始学习吧！<br>第一步：选一个大类（这是你的"性格气质"）' +
            np("", "", "You can change it any time. Step 1: pick a group — this is your character.") + '</div>' +
          chipGrid(Object.keys(DESC_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npRandom">🎲 帮我随机抽一个' +
            np("帮我随机抽一个", "bāng wǒ suí jī chōu yī gè", "Pick one for me") + '</button></div>' + closeBtn;
      } else if (st.step === "descWord") {
        html = '<div class="pop-title">' + esc(st.descCat) + '</div>' +
          '<div class="pop-body">选一个具体的词语（点击可看意思）：' +
            np("", "", "Pick a word. Tap one to see what it means.") + '</div>' +
          chipGrid(DESC_CATS[st.descCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类' +
            np("返回大类", "fǎn huí dà lèi", "Back to the groups") +
            '</button></div>' + closeBtn;
      } else if (st.step === "nounCat") {
        html = '<div class="pop-title">' + esc(st.desc) + '·？</div>' +
          '<div class="pop-body">第二步：选一个名词大类' +
            np("", "", "Step 2: pick a noun group.") + '</div>' +
          chipGrid(Object.keys(NOUN_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 重选描述词' +
            np("重选描述词", "chóng xuǎn miáo shù cí", "Pick a different first word") +
            '</button></div>' + closeBtn;
      } else if (st.step === "nounWord") {
        html = '<div class="pop-title">' + esc(st.nounCat) + '</div>' +
          '<div class="pop-body">选一个具体的名词：' +
            np("", "", "Pick a noun.") + '</div>' +
          chipGrid(NOUN_CATS[st.nounCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类' +
            np("返回大类", "fǎn huí dà lèi", "Back to the groups") +
            '</button></div>' + closeBtn;
      } else if (st.step === "restore") {
        /* ⚠️ ONE BOX, TWO CODES (owner 2026-08-19). A student arrives holding whichever
           code they wrote down; asking them to first classify it is asking them to know
           something they do not. The 恢复码 is 10 characters of [0-9A-Z]; a 进度码 always
           carries dots (VS1/VS2/VS3/VS4), so they are told apart by shape, never by the
           student. See onRestoreCode(). */
        html = '<div class="pop-title">🔄 换了设备？在这里找回' +
            np("换了设备？在这里找回", "huàn le shè bèi？zài zhè lǐ zhǎo huí", "Changed device? Restore here") + '</div>' +
          '<div class="pop-note">输入<b>恢复码</b>（十个字符）就能把<b>全部进度</b>找回来，' +
          '包括灵露和贝壳——这个要联网。<br>' +
          '也可以贴旧设备「我的档案」里的<b>进度码</b>：那一段不必联网，' +
          '但里面没有灵露和贝壳。<br>' +
          '也可以先填老师给的「<b>学习编号</b>」(VS-XXXX-XXXX)，再贴进度码。' +
            np("", "", "Enter your 10-character recovery code to get everything back (needs internet), " +
                       "or paste the long progress code from your old device (works offline). " +
                       "You can also enter the learning ID (VS-XXXX-XXXX) your teacher gave you first, " +
                       "then paste the progress code.") + '</div>' +
          /* ⚠️ STEP 1 OF 2, AND IT SAYS SO. A 学习编号 restores nothing on its own — the
             progress arrives on the NEXT paste — so this box must read as progress made,
             not as a finished job, and it must not look like the red error box: success
             and failure sharing one treatment is how a student stops trusting the screen.
             The 编号 is echoed back in display form so it can be checked against what the
             teacher actually sent, before they move on. */
          (st.codeOk ? '<div class="pop-note np-code-ok">' +
            '<b>✓ 学习编号收到了：' + esc(st.codeOk) + '</b>' +
            np("", "", "Learning ID saved \u2014 " + st.codeOk) + '</div>' +
            '<div class="pop-note" style="margin-top:6px">还差一步：把老师给你的<b>进度码</b>贴进下面的框。' +
            np("", "", "One step left: paste the progress code below.") + '</div>' : "") +
          '<textarea id="npCode" class="code-ta" placeholder="' +
            (st.codeOk ? '把进度码贴在这里…' : '恢复码（十个字符），或者贴进度码…') + '">' +
            esc(st.codeVal || "") + '</textarea>' +
          /* ⚠️ the error is the one line on this screen a stuck student MUST be able
              to read — it is the whole reason they are on the 找回 step. English only,
              from the shared table in profile.js; see CODE_ERR_EN there. */
          (st.codeErr ? '<div class="pop-note np-code-err">' + esc(st.codeErr) +
            np("", "", codeErrEn(st.codeErr)) + '</div>' : "") +
          '<div class="nav-row"><button class="nav-btn" id="npCodeBack">‹ 返回' +
            np("返回", "fǎn huí", "Back") + '</button>' +
          '<button class="nav-btn primary" id="npCodeGo">找回' +
            np("找回", "zhǎo huí", "Restore") + '</button></div>' + closeBtn;
      } else if (st.step === "confirm") {
        var nickname = nickOf();
        var role = st.role || "student";
        /* ⚠️ THE FOUR IDENTITIES ARE THE ONE THING ON THIS SCREEN A NON-CHINESE
           READER MUST GET RIGHT (owner 2026-08-17) — 家长 vs 老师 decides whether the
           nickname ever reaches a leaderboard. Pinyin and English per button, not a
           single line of prose underneath. */
        var roleBtns = [
          ["student", "🎒 学生", "xué shēng", "Student"],
          ["teacher", "🧑‍🏫 老师", "lǎo shī", "Teacher"],
          ["parent", "👪 家长", "jiā zhǎng", "Parent"],
          ["public", "🌏 公众人士", "gōng zhòng rén shì", "Member of the public"]];
        var sel = st.schoolSel || _bvss;
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
            (window.SG_SCHOOLS ? window.SG_SCHOOLS.searchHtml("npSchoolQ", st.schoolQ) : "") +
            '<select id="npSchool" class="np-select">' +
            (window.SG_SCHOOLS ? window.SG_SCHOOLS.optionsHtml(sel, st.schoolQ)
              : ('<option value="' + esc(_bvss) + '"' + (sel === _bvss ? " selected" : "") + '>' + esc(_bvss) + '</option>' +
                 '<option value="other"' + (sel === "other" ? " selected" : "") + '>其他 Others</option>')) +
            '</select>' +
            (sel === "other" ? '<input type="text" id="npSchoolOther" class="code-ta" style="height:44px;margin-top:8px" placeholder="' + otherPh + '" value="' + esc(st.schoolOther || "") + '">' : "");
        }
        /* 班级 — asked HERE, and only of 学生 (owner 2026-08-23: 「ask students but
           dropdown class only applies to bukit view students」). 我的档案 used to be
           the only screen that asked, and most students never open it, so the
           teacher page's 班级视图 was mostly blank. Bukit View gets the roster
           dropdown (年级 chips → that level's classes); every other school gets the
           text box, because we hold one school's list and guessing at another's
           would be worse than letting the student type.
           ⚠️ 选填, deliberately: the profile panel's own privacy note says 班级是选填,
           and a first-run screen that refuses to let a student in over an optional
           field costs more than an empty cell in a teacher's table. */
        if (role === "student") {
          var bvssPick = sel === _bvss && window.BV_CLASSES;
          detailHtml += '<div class="pop-label" style="margin-top:12px">你的班级' +
            np("你的班级", "nǐ de bān jí", "Your class") + ' · 选填' +
            np("", "", "optional") + '</div>' +
            (bvssPick
              ? window.BV_CLASSES.fieldHtml(st, NP_CLASS)
              : '<input type="text" id="npClass" class="code-ta" style="height:44px" placeholder="例如：2026 3HC3" value="' + esc(st.mtlClass || "") + '">');
        }
        html = '<div class="pop-title">' + (st.restored ? "🔄 找回你的昵称" : "🎉 你的昵称") +
            (st.restored ? np("找回你的昵称", "zhǎo huí nǐ de nì chēng", "Your nickname is back")
                         : np("你的昵称", "nǐ de nì chēng", "Your nickname")) + '</div>' +
          '<div class="np-name-row"><span class="np-name">' + esc(nickname) + '</span>' +
          (st.restored
            ? '<button class="np-roll" id="npDrop">用新昵称' +
                np("用新昵称", "yòng xīn nì chēng", "Use a new one") + '</button>'
            : '<button class="np-roll" id="npRoll">🎲 换一个' +
                np("换一个", "huàn yī gè", "Roll again") + '</button>') + '</div>' +
          /* the whole point of the request: a student who cannot read 敢作敢当 can
             still tell what they have been called. Gated like every other gloss,
             so a CL reader sees the Chinese name alone, exactly as before. */
          (nickEn() ? '<div class="np-name-en">' + np("", "", nickEn()) + '</div>' : "") +
          (st.restored
            ? '<div class="pop-note np-restored">✅ 进度码有效：' + esc(st.restored.streamLabel) +
              '，已掌握 ' + (st.restored.mastered === null ? "?" : st.restored.mastered) +
              ' 个词语。进入该科目时会问你要不要恢复。</div>'
            : "") +
          '<div class="pop-label">你的身份' +
            np("你的身份", "nǐ de shēn fèn", "I am a…") + '</div>' +
          '<div class="np-roles">' + roleBtns.map(function (r) {
            return '<button class="np-role' + (role === r[0] ? " on" : "") + '" data-r="' + r[0] + '">' +
              r[1] + np(r[1], r[2], r[3]) + '</button>';
          }).join("") + '</div>' +
          '<div class="pop-note">🏆 只有「学生」的昵称会出现在排行榜上。' +
            np("", "", "Only students appear on the leaderboards.") + '</div>' +
          detailHtml +
          '<div class="nav-row"><button class="nav-btn primary" id="npConfirm">确认' +
            np("确认", "què rèn", "Confirm") + '</button></div>' +
          '<div class="np-manual"><button id="npManual">我要自己选昵称' +
            np("我要自己选昵称", "wǒ yào zì jǐ xuǎn nì chēng", "Let me choose my own") + '</button>' +
          '</div>' +
          /* ⚠️ PROMOTED OUT OF .np-manual (owner 2026-08-31). This was an unstyled
             underlined text link sitting beneath 我要自己选昵称, and it is the ONLY route
             to the 找回 screen — a student on a replacement device has to spot it while
             being pushed through registration. It is now a real button on its own row.
             Still hidden once st.restored is set: they have already been through it. */
          (st.restored ? "" : '<div class="nav-row"><button class="nav-btn" id="npRestore">' +
            '🔄 换了设备？在这里找回进度' +
            np("", "", "Changed device? Restore your progress here") + '</button></div>') +
          closeBtn;
      }
      card.innerHTML = aidRowHtml() + html;
      wireAidRow(card);

      if (st.step === "descCat") {
        wireChips(card);
        document.getElementById("npRandom").onclick = function () {
          rollNick(); st.step = "confirm"; renderStep();
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
      } else if (st.step === "restore") {
        document.getElementById("npCodeBack").onclick = function () {
          /* codeOk goes with codeErr: leaving the screen ends the two-step sequence the
             green box is narrating. The 学习编号 itself is already saved to the profile —
             this clears the narration, not the identifier. */
          st.codeErr = ""; st.codeOk = ""; st.step = "confirm"; renderStep();
        };
        document.getElementById("npCodeGo").onclick = function () {
          var v = (document.getElementById("npCode") || {}).value || "";
          st.codeVal = v;
          /* ⚠️ SHAPE, NOT A TOGGLE. A 恢复码 is 8-24 chars of [0-9A-Z] with no dot; every
             进度码 has dots. Anything dotless and short enough is treated as a 恢复码 —
             including a mistyped one, which is correct: the error a student then sees
             is「找不到这个恢复码」rather than「进度码格式不正确」, and the first one is the
             true statement about what they typed. */
          var claim = String(v).toUpperCase().replace(/[^0-9A-Z]/g, "");
          /* ⚠️ VSID FIRST, BEFORE THE 恢复码 BRANCH. A 学习编号 strips to 10 dotless
             chars and would otherwise match the branch below exactly, so a student who
             pastes their own identifier would be told「找不到这个恢复码」and conclude it
             is broken. `VS` is reserved at mint time in firebase-init.js, so no 恢复码
             can collide with this test.
             ⚠️ THE BOX STAYS OPEN — no reload, no navigation. The teacher sends 学习编号
             and 进度码 together and the student pastes both here in sequence; the 进度码
             paste is the very next action. */
          if (v.indexOf(".") === -1 && window.WSProfile && WSProfile.isValidVsid &&
              /^VS[0-9A-Z]{8}$/.test(claim)) {
            if (!WSProfile.isValidVsid(claim)) {
              st.codeOk = ""; st.codeErr = "学习编号打错了，请再核对一次。"; renderStep(); return;
            }
            WSProfile.setVsid(claim);
            st.codeVal = "";
            st.codeErr = "";
            st.codeOk = WSProfile.fmtVsid ? WSProfile.fmtVsid(claim) : claim;
            renderStep(); return;
          }
          if (v.indexOf(".") === -1 && claim.length >= 8 && claim.length <= 24) {
            if (!(window.WSProfile && window.WSProfile.restoreFromClaim)) {
              st.codeErr = "暂时无法恢复，请稍后再试。"; renderStep(); return;
            }
            st.codeErr = "正在找回…"; renderStep();
            window.WSProfile.restoreFromClaim(claim, function (r) {
              if (!r.ok) { st.codeErr = r.err || "恢复失败，请稍后再试。"; renderStep(); return; }
              /* ⚠️ RELOAD, do not try to hand the restored stores to a running engine.
                 cs.js/xh.js hold `store` in memory and their next save would overwrite
                 what we just wrote (§18r) — and a claim restore replaces WHOLE stores,
                 not a merge, so there is no provider hook that could express it. A
                 restore is a once-per-device event; a reload is the honest way to let
                 every engine re-read from scratch. */
              try { location.reload(); } catch (e) {}
            });
            return;
          }
          var peek = window.WSProfile && window.WSProfile.peekCode
            ? window.WSProfile.peekCode(v) : { err: "暂时无法核对进度码，请稍后再试。" };
          if (peek.err) { st.codeErr = peek.err; renderStep(); return; }
          /* VS1 predates nickname binding, so it can prove the subject but not who
             it belongs to — there is no name to adopt, which is the whole feature */
          if (!peek.nick) {
            st.codeErr = "这是旧版进度码，里面没有昵称。请先取个昵称，进入科目后再用它恢复进度。";
            renderStep(); return;
          }
          st.restored = peek;
          st.codeErr = ""; st.step = "confirm"; renderStep();
        };
      } else if (st.step === "confirm") {
        Array.prototype.forEach.call(card.querySelectorAll(".np-role"), function (b) {
          b.onclick = function () { st.role = b.getAttribute("data-r"); renderStep(); };
        });
        var rollEl = document.getElementById("npRoll");
        if (rollEl) rollEl.onclick = function () { rollNick(); renderStep(); };
        var dropEl = document.getElementById("npDrop");
        if (dropEl) dropEl.onclick = function () {
          st.restored = null; st.codeVal = ""; st.codeOk = ""; rollNick(); renderStep();
        };
        var restEl = document.getElementById("npRestore");
        if (restEl) restEl.onclick = function () { st.step = "restore"; renderStep(); };
        var selEl = document.getElementById("npSchool");
        if (selEl && window.SG_SCHOOLS) {
          window.SG_SCHOOLS.wireSearch(document.getElementById("npSchoolQ"), selEl, function (v, q) {
            st.schoolQ = q;
            if (v === st.schoolSel) return;
            var wasOther = st.schoolSel === "other";
            var hadRoster = st.schoolSel === _bvss;
            st.schoolSel = v;
            /* Redraw on a roster flip as well as on 「离开其他」: 班级 is a different
               control on either side of 百德, and leaving the old one on screen means
               the student edits a box that is about to be replaced. Both cost the
               search box its focus — a price already paid for wasOther, and a flip
               only happens once the search has narrowed to a single school. */
            if (wasOther || (st.schoolSel === _bvss) !== hadRoster) renderStep();
          });
        }
        if (selEl) selEl.onchange = function () { st.schoolSel = selEl.value; renderStep(); };
        var otherEl = document.getElementById("npSchoolOther");
        if (otherEl) otherEl.oninput = function () { st.schoolOther = otherEl.value; };
        var heardEl = document.getElementById("npHeard");
        if (heardEl) heardEl.oninput = function () { st.heardFrom = heardEl.value; };
        if (st.schoolSel === _bvss && window.BV_CLASSES) {
          window.BV_CLASSES.wireField(card, st, NP_CLASS, renderStep);
        } else {
          var clsEl = document.getElementById("npClass");
          if (clsEl) clsEl.oninput = function () { st.mtlClass = clsEl.value; };
        }
        document.getElementById("npManual").onclick = function () { st.step = "descCat"; renderStep(); };
        document.getElementById("npConfirm").onclick = function () {
          var role = st.role || "student";
          var profile;
          if (role === "public") {
            profile = { nickname: nickOf(), category: role, school: "",
              heardFrom: ((document.getElementById("npHeard") || {}).value || "").trim() };
          } else {
            var school = st.schoolSel === "other"
              ? ((document.getElementById("npSchoolOther") || {}).value || "").trim()
              : st.schoolSel;
            if (st.schoolSel === "other" && !school) { alert("请输入学校名称 Please enter the school name。"); return; }
            profile = { nickname: nickOf(), category: role, school: school };
            /* ⚠️ Sent for 学生 ONLY, and always — including "". Both class controls
               keep st.mtlClass current, and save() normalises + owns classYear /
               classHistory from here. Omitting it on a re-pick is what would silently
               keep a stale class; sending "" for a non-student is what save() does
               anyway (§class rules), so we simply do not set the key. */
            if (role === "student") profile.mtlClass = st.mtlClass || "";
          }
          saveProfileLocal(profile);   // WSProfile.save merges onto prev (keeps mtlClass/classHistory)
          /* hand the code to the stream page: this file cannot decode the bitmask
             (no word order here), and commitProgress must stay the only writer */
          if (st.restored && window.WSProfile && window.WSProfile.setPendingCode) {
            window.WSProfile.setPendingCode(st.codeVal, st.restored.stream);
          }
          ov.remove();
          /* ⚠️ onDone gets the SAVED profile, never the literal built above. That
             literal only ever carried 昵称/身份/学校/班级, so the landing page's
             reveal() drew a 👤 for a student who has an avatarId — already true of
             every 换昵称, and it would have swallowed the avatar picked below. */
          function finishNick() {
            var P = window.WSProfile;
            onDone((P && P.load && P.load()) || profile);
          }
          /* 头像接着就选 (owner 2026-08-28)。onDone is what finishes the registration
             — the landing reveal, or the stream boot — so it is handed to the avatar
             step and runs ONCE, after the student has picked or waved it off. Opening
             the grid after onDone instead would leave the host drawing a nameplate
             with a 👤 in it that a pick two seconds later could not correct.
             ⚠️ PROBE, then fall through: profile.js is one shared file that ages in
             the cache on its own (§3), so a page can run this against a copy that has
             no such function. Missing name = today's behaviour, never a dead end. */
          if (window.WSProfile && window.WSProfile.pickAvatarFirstRun) {
            window.WSProfile.pickAvatarFirstRun(finishNick);
          } else {
            finishNick();
          }
        };
      }
      if (dismissible && document.getElementById("npCancel")) {
        document.getElementById("npCancel").onclick = function () { ov.remove(); };
      }
    }
    renderStep();
  }


  /* ---------- 航海选择页 · sea map ----------
     Four islands plus the 出发码头 dock on open water. Clicking one sails the
     boat there and then navigates. Every coordinate is a CSS custom property on
     the button (cs.css .i-*); nothing here hardcodes a position.

     The five boat sprites cover eight bearings because the hull is left-right
     symmetric, so each diagonal/broadside file mirrors with scaleX(-1). Which
     one a voyage uses is authored per island in data-boat rather than computed
     from the bearing: the landing points are hand-placed anyway (four fixed
     routes do not justify a pathfinder), and hardcoding the pairing removes any
     chance of the sprite disagreeing with the route at some breakpoint. */

  /* Five sprites cover eight bearings, because the hull is left-right symmetric
     and each diagonal/broadside file mirrors with scaleX(-1). Screen-space
     angles: 0 = due right, +90 = down the screen.
     This is computed rather than authored per island because the boat now stays
     at its last berth: the same destination is approached from a different
     direction depending on where the student sailed from, so a fixed heading
     per island would point the wrong way on most of the 20 routes. */
  function boatHeading(dx, dy) {
    var a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (a >= -22.5 && a < 22.5) return ["broadside", true];     // bow right
    if (a >= 22.5 && a < 67.5) return ["toward_diag", true];    // toward, lower-right
    if (a >= 67.5 && a < 112.5) return ["toward", false];       // toward viewer
    if (a >= 112.5 && a < 157.5) return ["toward_diag", false]; // toward, lower-left
    if (a >= -67.5 && a < -22.5) return ["away_diag", false];   // away, upper-right
    if (a >= -112.5 && a < -67.5) return ["away", false];       // straight away
    if (a >= -157.5 && a < -112.5) return ["away_diag", true];  // away, upper-left
    return ["broadside", false];                                // bow left
  }

  /* Where a straight run would cross a third island, the voyage is bent through
     a hand-placed waypoint (the design doc's own instruction; four fixed islands
     do not justify a pathfinder). Only one pair needs it: G2 and HCL sit on
     opposite edges with G3 exactly between them, so no arc in either direction
     clears — verified by checking all 20 routes at a range of arc heights.
     Values are % of the viewport, y measured from the BOTTOM. */
  /* ⚠️ LANDSCAPE ONLY. Portrait stacks the islands in a column with a clear channel
     down the right (cs.css), so every voyage there is a straight run and this
     waypoint — placed for the landscape geometry — would bend the boat straight
     into G1. Re-verified 2026-08-16 after G3 moved up and HCL moved down: the
     corridor is now between G3's foot and G1's peak, so the waypoint moved with
     them. All 20 routes checked clear at 1920x990, 1366x768 and 1024x600. */
  /* ⚠️ 横屏绕行航路点。二次贝塞尔在**半程**穿过这个点。
     G2↔HCL：G3 摆到正中之后三点共线，任何弧高都清不掉，只能绕。
     dock↔HCL：这条**本来就在压 G1**（不是 2026-08-16 那次错落调整造成的，
     调整前的线上版本同样会压），本轮一并修掉。 */
  var SEA_DETOUR = {
    /* ⚠️ G2↔HCL's detour is GONE: with the arc sagging below the islands instead of
       lifting over them, that pair clears on its own. One fewer hand-placed number.

       ⚠️ dock↔HCL IS THE ONE ROUTE THAT STILL ARCS UP, and it is a physical limit,
       not an oversight. The owner's drawing routes it UNDER G1; the gap between
       G1's painted foot and the bottom of a 900px screen is 70px and the hull is
       ~68px, so the boat cannot fit through without hanging off the edge. Raising
       G1 to open that gap was tested (--by 7.8% → 12%): it does free this route,
       but then G1 intrudes on g3↔hcl and g3↔dock — two broken routes traded for
       one. So this pair keeps an upward waypoint while the other 18 sag. */
    "dock|HCL_index.html": [48, 38]
  };
  /* ⚠️ PORTRAIT SEA LANES (owner 2026-08-16: 「the mobile sea map needs a more
     natural sail route」). Portrait used to take the default arc — a near-straight
     run down the middle channel, which read as teleporting in a line rather than
     sailing. Each entry is a waypoint the track PASSES THROUGH at the halfway
     mark, same convention as SEA_DETOUR above.

     ⚠️ SOLVED, NOT DRAWN BY HAND, and the objective matters: the bulge TARGETS
     ~20% of the crossing (capped at 86px) instead of being maximised. Maximising
     put every waypoint hard against a screen edge and sent the boat on a 200px
     excursion — which reads as lost, not as sailing. Result is a 24-58px sweep.
     ⚠️ All 20 ordered voyages were sampled along the curve and verified to keep
     10px clear of every island they are not visiting, and to stay on screen.
     RE-RUN THAT CHECK if any portrait --cx/--by/--w/--tx/--ty changes; the lanes
     are only valid against the island positions they were solved for.
     Keys are unordered — the lookup below tries both directions. */
  var SEA_SWEEP_P = {
    "dock|G1_index.html": [58.5, 14.6],
    "dock|G2_index.html": [66.2, 21.3],
    "dock|G3_index.html": [59.2, 27.9],
    "dock|HCL_index.html": [42.3, 41.8],
    "G1_index.html|G2_index.html": [50.0, 28.5],
    "G1_index.html|G3_index.html": [56.9, 36.7],
    "G1_index.html|HCL_index.html": [56.2, 46.9],
    "G2_index.html|G3_index.html": [56.2, 61.3],
    "G2_index.html|HCL_index.html": [44.6, 54.1],
    "G3_index.html|HCL_index.html": [56.2, 63.8]
  };
  function portrait() {
    return !!(window.matchMedia && window.matchMedia("(orientation: portrait)").matches);
  }

  function initSeaMap(sea) {
    if (sea._wired) return;
    sea._wired = true;

    var boat = document.getElementById("lpBoat");
    var busy = false;
    var BERTH_KEY = "ws_seamap_at";
    var boatTurn = 0;          // interval that turns the bow along the curve

    function skipSail() {
      /* ⚠️ Portrait NO LONGER skips (owner 2026-08-16: 「on mobile the boat doesn't
         sail, it just teleports」). It used to, because the old portrait layout
         zigzagged the islands across the full width and left no route that stayed
         on water. The portrait layout is now a column with a clear channel down the
         right — all 20 routes verified clear at 390x844, 430x932 and 360x780 — so
         the boat sails there too. Reduced-motion is the only remaining skip, and
         that one is a preference, not a workaround. */
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    /* The berth is where the student last sailed to — the boat stays there as a
       「你在这里」 marker, and the next voyage departs from it rather than
       teleporting back to the jetty. Stored as the destination's own data-go
       plus the heading it arrived on, so the parked boat still faces the way it
       came in. Device-local, like everything else on this page. */
    function readBerth() {
      try { return JSON.parse(localStorage.getItem(BERTH_KEY) || "null"); } catch (e) { return null; }
    }
    function isleFor(go) { return sea.querySelector('.sea-isle[data-go="' + go + '"]'); }

    /* Put the boat back at its berth, ready to sail again.
       This is also what fixes the two worst bugs from the first real run: every
       voyage after the first did nothing, and coming BACK from a stream page
       left the map completely dead. Both are the same cause — the page is
       restored from the back/forward cache with all JS state intact, so `busy`
       was still true from the voyage that navigated away, and the boat was
       still parked at its destination under animation-fill-mode:forwards. */
    function resetBoat() {
      busy = false;
      if (!boat) return;
      boat.classList.remove("sailing");
      boat.style.removeProperty("--dx");
      boat.style.removeProperty("--dy");
      boat.style.removeProperty("--ctlx");
      boat.style.removeProperty("--ctly");

      var b = readBerth(), isle = b && b.go && isleFor(b.go);
      if (isle) {
        // moor at that island's landing point. Inline beats the stylesheet, so
        // this also survives the portrait rules re-declaring --hx/--hy.
        var cs = getComputedStyle(isle);
        boat.style.setProperty("--hx", cs.getPropertyValue("--tx").trim());
        boat.style.setProperty("--hy", cs.getPropertyValue("--ty").trim());
        var h = (b.boat || "away_diag").split(" ");
        boat.className = "sea-boat h-" + h[0] + (h[1] === "flip" ? " flip" : "");
        boat.querySelector("img").src = boatArt(h[0]);
      } else {
        boat.style.removeProperty("--hx");     // fall back to the jetty
        boat.style.removeProperty("--hy");
        boat.className = "sea-boat h-away_diag";
        boat.querySelector("img").src = boatArt("away_diag");
      }
    }
    /* ⚠️ THE SEA-MAP BOAT IS THE STUDENT'S OWN BOAT (owner 2026-08-16 evening). It
       was a fixed art/seamap/boat_*.png for everyone, unrelated to anything owned —
       which is why the owner could not find「my boat」: a 400-shell purchase changed
       one picture on one pier screen and nothing here.
       Tier 2 (彩绘舢板) IS that old sprite, byte-identical, so buying it restores
       exactly what the map used to show. A student with no boats sails tier 1, the
       plain sampan: a visibly plainer default, accepted deliberately so there is
       something to earn. Ownership is global (ws2_profile), so it works here even
       though this page has no stream and no pier store.
       ⚠️ This is a READ of a cosmetic choice, not a currency or progress transfer —
       the waterline is untouched. */
    function boatArt(dir) {
      if (window.WSBoats && window.WSBoats.art) return window.WSBoats.art(window.WSBoats.pick(), dir);
      return "art/seamap/boat_" + dir + ".png";     // profile.js absent: today's art
    }

    // pageshow fires on a normal load AND on a bfcache restore (persisted:true),
    // which a plain load/DOMContentLoaded listener would miss entirely.
    window.addEventListener("pageshow", resetBoat);

    function sail(isle) {
      var go = isle.getAttribute("data-go");
      if (!go || busy) return;   // one voyage at a time; ignore double-taps
      busy = true;
      var cs = getComputedStyle(isle);
      var tx = parseFloat(cs.getPropertyValue("--tx"));
      var ty = parseFloat(cs.getPropertyValue("--ty"));
      if (!boat || isNaN(tx) || isNaN(ty)) { location.href = go; return; }

      var W = window.innerWidth, H = window.innerHeight;
      var r = boat.getBoundingClientRect();
      var fromX = r.left + r.width / 2, fromY = r.top + r.height / 2;
      var toX = tx / 100 * W, toY = H - ty / 100 * H;

      var h = boatHeading(toX - fromX, toY - fromY);
      // read the OLD berth before overwriting it — it names where this voyage
      // departs from, which is what selects the detour
      var prev = readBerth();
      /* ⚠️ the berth stores the heading the boat will be facing WHEN IT ARRIVES,
         not the chord heading. Those differ on every bent voyage, and this value
         is what pageshow restores — get it wrong and the boat sits at its island
         pointing the way it set off. Filled in below once the curve is known. */
      function saveBerth(hh) {
        try {
          localStorage.setItem(BERTH_KEY,
            JSON.stringify({ go: go, boat: hh[0] + (hh[1] ? " flip" : "") }));
        } catch (e) {}
      }
      saveBerth(h);            // provisional: skipSail() below may return early
      if (skipSail()) { location.href = go; return; }
      /* ⚠️ ALREADY MOORED HERE → GO STRAIGHT IN (owner 2026-08-16 深夜: 「the sailing
         animation is gone from the sea map and the boat just teleports」).
         The boat parks at its last destination, so tapping THAT island again asks it
         to sail a voyage of zero length: --dx and --dy come out 0, the curve collapses
         to a point, and the student watches a stationary boat for 1.7s before the page
         changes — which reads exactly as「it teleports」. Measured on a real tap:
         dx 0.0px / dy -0.0px. Anything shorter than a boat-width is not a voyage.
         ⚠️ This is the most common tap on the map: come back from a stream page, tap
         the same island again. It is not an edge case. */
      if (Math.abs(toX - fromX) < 24 && Math.abs(toY - fromY) < 24) {
        location.href = go; return;
      }

      boat.className = "sea-boat h-" + h[0] + (h[1] ? " flip" : "");
      boat.querySelector("img").src = boatArt(h[0]);

      /* control point for the quadratic the CSS draws. Default is the midpoint
         lifted into an arc; a detoured pair instead names a point the track must
         pass THROUGH at the halfway mark, which for a quadratic means
         C = 2W - (start + end)/2. */
      var key = ((prev && prev.go) || "dock") + "|" + go;
      var lastHeading = h;      // updated by faceAlong as the voyage bends
      var rkey = go + "|" + ((prev && prev.go) || "dock");
      /* portrait now has its own lane table; landscape keeps the two detour pairs */
      var alt = portrait()
        ? (SEA_SWEEP_P[key] || SEA_SWEEP_P[rkey] || null)
        : (SEA_DETOUR[key] || SEA_DETOUR[rkey]);
      var cx, cy;
      if (alt) {
        cx = 2 * (alt[0] / 100 * W) - (fromX + toX) / 2;
        cy = 2 * (H - alt[1] / 100 * H) - (fromY + toY) / 2;
      } else {
        /* ⚠️ THE ARC SAGS DOWNWARD, into the open water (owner 2026-08-16, who drew
           the routes he wanted straight onto a screenshot). It used to lift UPWARD
           (-H*0.07), which sent voyages across the island band instead of below it.
           Verified by script at this sag: all 20 landscape voyages clear every
           third island — the upward arc blocked FOUR of them, including G2↔HCL,
           which is why that pair needed a detour and now does not.
           A quadratic passes half way to its control point, so the visible sag is
           half of this. */
        cx = (fromX + toX) / 2;
        cy = (fromY + toY) / 2 + H * 0.20;
      }
      boat.style.setProperty("--dx", (toX - fromX).toFixed(1) + "px");
      boat.style.setProperty("--dy", (toY - fromY).toFixed(1) + "px");
      boat.style.setProperty("--ctlx", (cx - fromX).toFixed(1) + "px");
      boat.style.setProperty("--ctly", (cy - fromY).toFixed(1) + "px");
      // re-adding a class that is already applied does NOT restart a CSS
      // animation; reading offsetWidth between the remove and the add forces the
      // reflow that does. Without this the second voyage never moves.
      boat.classList.remove("sailing");
      void boat.offsetWidth;
      boat.classList.add("sailing");

      /* ⚠️ THE BOW FOLLOWS THE CURVE, not the straight line between the two berths
         (owner 2026-08-16: 「this boat was moving with its side leading the way」).
         The heading used to be computed ONCE from the chord, but the track is a
         quadratic: on a bent voyage the chord direction is not the direction of
         travel at any point except the middle, so the boat crabbed sideways and
         moored side-on.
         Tangent of B(t)=(1-t)²S+2(1-t)tC+t²E is B'(t)=2(1-t)(C-S)+2t(E-C).
         Position stays a pure CSS transform (animating left/top was the jank the
         owner reported); this only swaps the sprite ~a dozen times, which is a
         cheap img src change and never touches layout. */
      var sx = fromX, sy = fromY, ex = toX, ey = toY, ccx = cx, ccy = cy;
      function tangentAt(t) {
        return [2 * (1 - t) * (ccx - sx) + 2 * t * (ex - ccx),
                2 * (1 - t) * (ccy - sy) + 2 * t * (ey - ccy)];
      }
      /* ⚠️ THE ENDS ARE PULLED BACK ONTO THE LINE TO THE ISLAND (owner 2026-08-16:
         「sometimes it still sails with its side leading the way… when it
         approaches a land mass it has to be pointing to it with its bow」).
         The pure tangent is the physically honest heading, but the track sags
         H*0.20, so at t=0 and t=1 the true direction of travel is 40–95° off the
         line between the two berths: the boat dives away on departure and climbs
         back up on arrival, and with 45° sprite buckets that reads as mooring
         side-on. Measured over all 30 routes at 1600x900.
         Fixing the PATH instead was the other option and was rejected: the sag is
         what clears the other islands, and that clearance was verified against the
         PAINTED extents of the art, which an element rect cannot reproduce — my
         re-check with getBoundingClientRect flags even the shipped value as
         colliding, so it is no basis for re-tuning.
         w = |2t-1| : 0 at mid-voyage, where the tangent is trusted completely (on a
         detoured route that is the only place the two genuinely differ), rising to
         1 at both ends, where the heading becomes exactly the line to the island. */
      function headingAt(t) {
        var v = tangentAt(t);
        if (!v[0] && !v[1]) return v;
        var ang = Math.atan2(v[1], v[0]), chord = Math.atan2(ey - sy, ex - sx);
        var d = ((ang - chord + Math.PI * 3) % (Math.PI * 2)) - Math.PI;   // signed −π..π
        var w = Math.abs(2 * t - 1);
        var a = chord + d * (1 - w);
        return [Math.cos(a), Math.sin(a)];
      }
      if (boatTurn) clearInterval(boatTurn);
      var t0 = Date.now(), lastH = "";
      function faceAlong(t) {
        var v = headingAt(Math.max(0, Math.min(1, t)));
        if (!v[0] && !v[1]) return;
        var hh = boatHeading(v[0], v[1]);
        var key = hh[0] + (hh[1] ? "|f" : "");
        if (key === lastH) return;            // only touch the DOM when it changes
        lastH = key;
        boat.className = "sea-boat sailing h-" + hh[0] + (hh[1] ? " flip" : "");
        boat.querySelector("img").src = boatArt(hh[0]);
        lastHeading = hh;                      // what it is facing when it moors
      }
      faceAlong(0);
      /* the tangent AT ARRIVAL is known now, so the berth can be corrected before
         the voyage even starts — pageshow may fire before it finishes */
      (function () {
        var v = headingAt(1);          // == the line to the island (see headingAt)
        if (v[0] || v[1]) saveBerth(boatHeading(v[0], v[1]));
      })();
      boatTurn = setInterval(function () {
        var t = (Date.now() - t0) / 1700;
        /* the CSS keyframes distribute t with ease-in-out; mirror that so the turn
           reads in step with the movement rather than running ahead of it */
        var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        faceAlong(e);
        if (t >= 1) { clearInterval(boatTurn); boatTurn = 0; }
      }, 90);

      // navigate the moment it moors: no confirmation, no toast, no pause.
      var done = false;
      function arrive() { if (!done) { done = true; location.href = go; } }
      boat.addEventListener("animationend", arrive, { once: true });
      setTimeout(arrive, 2200);  // belt and braces if animationend never fires
                                 // (must outlast the 1.7s voyage, or it cuts it short)
    }

    var isles = sea.querySelectorAll(".sea-isle");
    for (var i = 0; i < isles.length; i++) {
      (function (el) { el.addEventListener("click", function () { sail(el); }); })(isles[i]);
    }

    var back = document.getElementById("lpSeaBack");
    if (back) back.onclick = function () {
      sea.style.display = "none";
      document.body.classList.remove("lp-sea-on");
      var gate = document.getElementById("lpGate");
      if (gate) gate.style.display = "";
    };

    // Orientation cannot be locked on the web (it needs fullscreen or an
    // installed app, neither of which this project has) and CLAUDE.md forbids
    // locking anyway, so portrait gets a dismissible nudge rather than a wall.
    var rot = document.getElementById("lpRotate");
    if (rot) {
      var seen = false;
      try { seen = sessionStorage.getItem("ws_seamap_rot") === "1"; } catch (e) {}
      if (!seen && window.innerWidth < 700 && window.innerHeight > window.innerWidth) {
        rot.hidden = false;
      }
      rot.querySelector("button").onclick = function () {
        rot.hidden = true;
        try { sessionStorage.setItem("ws_seamap_rot", "1"); } catch (e) {}
      };
    }
  }


  /* ---------- 拼音 / 英文 on the landing page (owner 2026-08-17) ----------
     「make sure the landing page and profile registration screen has English and
     pinyin toggle so that non chinese users can also create their profile with ease」

     ⚠️ THE LANDING PAGE IS THE ONLY PAGE WITH NO ENGINE, which is why it is the only
     caller of WSProfile.ownAid(): cs.js and xh.js drive body.py-aid / body.xh-py-on
     from their own per-stream settings, and a second writer would fight them on every
     render. Everything else here — the pills, the preference, the gloss spans — lives
     in profile.js so the picker and the profile panel behave the same wherever they
     are opened from.
     ⚠️ Mounted into .lp-hero rather than the gate: the toggles must survive the gate
     being hidden, because the sea map and the profile panel come AFTER it and are the
     screens a non-Chinese reader actually needs them on. */
  function mountAid() {
    if (!window.WSProfile || !window.WSProfile.ownAid) return;
    window.WSProfile.ownAid(true);
    var hero = document.querySelector(".lp-hero");
    if (!hero || document.getElementById("lpAid")) return;
    var box = document.createElement("div");
    box.className = "lp-aid";
    box.id = "lpAid";
    box.innerHTML = window.WSProfile.aidPillsHtml();
    hero.insertBefore(box, hero.firstChild);
    window.WSProfile.wireAidPills(box);
  }

  /* ---------- landing page gate: Enter -> (nickname if new) -> paths ---------- */
  function initLandingGate() {
    var enterBtn = document.getElementById("lpEnterBtn");
    var gate = document.getElementById("lpGate");
    var cards = document.getElementById("lpCards");
    var sea = document.getElementById("lpSea");
    var greet = document.getElementById("lpGreeting");
    if (!enterBtn || !gate || !cards) return; // not on the landing page
    mountAid();

    function reveal(profile) {
      gate.style.display = "none";
      if (greet && profile && profile.nickname) {
        greet.style.display = "";
        var av = (window.WSProfile && window.WSProfile.avatarImgHtml)
          ? window.WSProfile.avatarImgHtml(profile.avatarId) : "👤";
        greet.innerHTML = '<span class="lp-nick"><span class="lp-av">' + av + '</span>' + esc(profile.nickname) + '</span>' +
          '<button class="code-link" id="lpFindBtn">🔎 查词语</button>' +
          '<button class="code-link" id="lpProfileBtn">👤 我的档案</button>';
        /* 五站查词 (§3.3). ⚠️ NO speak is passed: the landing page loads no TTS
           stack at all, so search.js renders no speaker buttons rather than
           duplicating one badly. Same graceful-degrade habit as every sprite
           onerror in this repo. */
        var findBtn = document.getElementById("lpFindBtn");
        if (findBtn) findBtn.onclick = function () {
          if (window.WSSearch) window.WSSearch.open();
        };
        var profBtn = document.getElementById("lpProfileBtn");
        if (profBtn) {
          profBtn.onclick = function () {
            if (!window.WSProfile) return;
            window.WSProfile.open({
              onChangeNickname: function (done) {
                var cur = loadProfile() || {};
                renderNicknamePicker(function (p) { reveal(p); if (done) done(); },
                  { dismissible: true, currentSchool: cur.school || "", currentRole: cur.category || "student",
                    currentClass: cur.mtlClass || "", currentHeard: cur.heardFrom || "" });
              },
              onChanged: function () { reveal(loadProfile()); }
            });
          };
        }
      }
      // 航海选择页: the sea map is the stream picker. The four .lp-cards stay in
      // the DOM as the fallback and are shown only if the map markup is absent.
      if (sea) {
        sea.style.display = "";
        document.body.classList.add("lp-sea-on");
        initSeaMap(sea);
      } else {
        cards.style.display = "flex";
        cards.style.animation = "none";
      }
    }

    enterBtn.onclick = function () {
      var existing = loadProfile();
      if (existing && existing.nickname) {
        reveal(existing);
      } else {
        renderNicknamePicker(function (p) { reveal(p); }, { dismissible: false });
      }
    };

    // C-2: a student who already has a profile shouldn't have to re-enter the
    // gate every time. Show the four course cards straight away, so pressing
    // "back" from a stream lands on the course list, not the entry gate.
    var already = loadProfile();
    if (already && already.nickname) reveal(already);
  }

  /* The picker is exported so pages other than the landing can offer 换昵称
     without a second copy of it. 出发码头 (XH_index.html) is the first such page.
     initLandingGate() below returns immediately when the landing markup is
     absent, so loading this file elsewhere costs nothing. */
  window.WSNickname = { picker: renderNicknamePicker };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLandingGate);
  } else {
    initLandingGate();
  }

})();
