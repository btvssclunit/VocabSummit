/* Word Summit · 词山学海 · shared app engine (v0.2 test build, no login)
   Landscape-first. Progress, mastery, badges and game high scores live in
   localStorage only (device-local, nothing leaves the device). Firebase later.
   TTS is Chinese-only by policy (LC app). 课文例句 removed pending CPDD
   written permission; 填空句 are self-authored and remain. */
(function () {
  "use strict";

  /* ---------- cache busting ----------
     GitHub Pages serves every file with cache-control: max-age=600, so for ten
     minutes a browser will not even ASK whether there is a newer copy — and it
     ages each file independently. That is how a device ends up running a NEW
     cs.css beside an OLD cs.js (hover styling works, click handlers missing).
     It has cost this project real debugging time more than once.
     The HTML tags carry ?v=YYYYMMDD; this reads the version straight off our own
     <script> tag so the data JSONs are pinned to the SAME build with no second
     string to remember. Falls back to no query, which is simply today's
     behaviour, so it can never break a load. BUMP THE DATE IN THE 5 HTML FILES
     ON EVERY DEPLOY. */
  var ASSET_V = (function () {
    try {
      var src = (document.currentScript && document.currentScript.src) || "";
      var m = src.match(/[?&]v=([^&]+)/);
      return m ? "?v=" + m[1] : "";
    } catch (e) { return ""; }
  })();

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

  var BADGE_IMG = {
    "生活空间": "art/badge/badge_shkj.png",
    "核心": "art/badge/badge_hx.png",
    "巩固": "art/badge/badge_gg.png",
    "进阶": "art/badge/badge_jj.png",
    "文化站": "art/badge/badge_whz.png"
  };

  var DATA = null;
  var WORDS = [];
  /* ⚠️ declared HERE, not next to rubyText() where it used to live: _formOf()
     (干扰项分层, ~line 1284) needs it too, and that runs far earlier in the file.
     `var` hoisting made the old placement work by luck; this makes it true. */
  var CJK_RE = /[一-鿿]/;
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
     1. Never feed pinyin strings to the engine (read as toneless English).
        Pass hanzi only; fix a mispronunciation with a homophone hanzi.
     2. Score voices (scoreVoice) rather than take the first zh-* one, and
        push eSpeak (toneless Mandarin on managed Chromebooks) to the back.
     3. ChromeOS drops utterances when cancel() and speak() run in the
        same tick — 50ms setTimeout guard.
     4. voiceschanged listener + 200ms retry (voices load async).
     5. Loud failure: one-time toast when no Chinese voice exists.
     ================================================================== */
  /* G-3a: NEVER feed pinyin to the engine (it is read as toneless English).
     Always pass hanzi. A word that is genuinely mispronounced may ONLY be fixed
     with a homophone hanzi, never a pinyin string. (The old POLY_MAP fed pinyin
     and broke tones on managed Chromebooks — removed 2026-08-12.) */
  var _zhVoice = null, _zhRejected = false, _warnedNoZh = false;
  /* G-3b: score voices instead of taking the first zh-* one. Managed Chromebooks
     ship eSpeak-NG (reports zh/cmn, but its Mandarin is toneless), often ordered
     before Google 普通话. Score it to the back so it is only ever a last resort. */
  function scoreVoice(v) {
    var lang = (v.lang || "").toLowerCase(), name = v.name || "";
    var isZhLang = lang.indexOf("zh") === 0 || lang.indexOf("cmn") === 0;
    var nameZh = /普通话|中文|chinese|mandarin/i.test(name);
    if (!isZhLang && !nameZh) return -1000;               // not a Chinese voice
    var s = 0;
    if (lang === "zh-cn" || lang === "zh_cn") s += 40;
    else if (lang.indexOf("zh") === 0) s += 20;
    else if (isZhLang) s += 15;                           // cmn-*
    if (/普通话/.test(name)) s += 25;
    if (/google/i.test(name)) s += 30;                    // Google 普通话 = the good one
    if (/中文|chinese|mandarin/i.test(name)) s += 8;
    if (/espeak/i.test(name)) s -= 100;                   // toneless — push to the back
    return s;
  }

  /* ⚠️⚠️ eSpeak 的中文要**整个拒收**，不能只扣分（owner 2026-09-01，学生实报）。
     学生报：「点朗读之后声音很怪，读的不是词，是把拼音和数字念出来。」
     她那一题是 HCL-1116 折磨 的填空句「牙痛__了他好几天…」——**纯汉字，没有拼音，
     没有数字**，`speakCloze` 只把 `__` 换成逗号，HCL 按设计不发逐字拼音所以
     tts.js 一个字都没改。也就是说：吐出拼音和数字的是**引擎**，不是我们的字符串。
     她的 UA 是 Firefox 140 / X11 Linux（几乎可以肯定是 Chromebook 里的 Crostini）。
     那条路上 speechSynthesis 由 **speech-dispatcher** 提供，而它上面的中文实际上
     只有 espeak-ng。espeak 上游自己写明：zh 语音只内建**一小批**汉字，其余要另外
     编译 `zh_listx` 字典；查不到的字就退化成念它内部那套**带声调数字的拼音**——
     学生听到的就是这个。而且即使字典齐全，espeak 也只做「一个汉字 → 一个读音」的
     死映射，不看上下文、不识词，那正是 js/tts.js 整份多音字校正表在解决的问题：
     用 espeak 等于把那份表整个抵消掉。

     ⚠️ **这是对 §8.2「eSpeak 评到最后，只当兜底」的刻意推翻。** 当初那条的前提是
     「espeak 的普通话虽然无声调，但至少认得出来」；现在有学生实报与上游文档两条
     证据说明它会念出拼音和数字。这是一个**教读音**的 App，孩子没有第二个来源可以
     核对——**读错比不读更糟**。所以现在是：宁可不发声，也要把原因说清楚。

     ⚠️⚠️ **绝对不能只靠 name 里有没有 `espeak`。** Chrome 把它命名成
     「eSpeak Chinese (Mandarin)」，所以旧的 −100 在 ChromeOS 上是管用的；
     但 Firefox 在 Linux 上把 speech-dispatcher 回报的**原始 voice name 原样交出来**
     （SpeechDispatcherService.cpp：name 就是 `list[i]->name`，URI 是
     `urn:moz-tts:speechd:<name>?<lang>`，**模块名一个字都不带**），于是同一个引擎
     在那里叫「Chinese (Mandarin)」、lang 是 `cmn`，`/espeak/i` **一次都命中不了**，
     那条 −100 **从来没有在她那台机器上生效过**。这是这份代码库反复中招的同一族：
     闸门键在错的字符串上，静默地什么都不做（§18an 的 `.py-ans`、§18aw 的漏搬）。
     所以现在**同时看 voiceURI**，那是 Firefox 自己拼的、比 name 可靠。 */
  function isBadZhEngine(v) {
    var probe = (v.name || "") + " " + (v.voiceURI || "");
    if (/espeak/i.test(probe)) return true;
    /* ⚠️ 这一条**刻意宽**：Firefox/Linux 的每一个语音都来自 speech-dispatcher，
       而那上面的中文在实务上只有 espeak-ng。误伤的代价是「没有声音 + 一句说得清
       原因的提示」，可以补救；不误伤的代价是「安静地教错读音」，不可补救。 */
    if (/^urn:moz-tts:speechd:/i.test(v.voiceURI || "")) return true;
    return false;
  }

  function loadVoiceCache() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices() || [];
    var best = null, bestScore = -1000, sawBad = false;
    for (var i = 0; i < vs.length; i++) {
      var sc = scoreVoice(vs[i]);
      if (sc <= -1000) continue;                          // skip non-Chinese
      if (isBadZhEngine(vs[i])) { sawBad = true; continue; }   // 中文，但引擎不合格
      if (sc > bestScore) { bestScore = sc; best = vs[i]; }
    }
    _zhVoice = best;                                       // null = 没有一个合格的中文语音
    /* 「有中文语音但全部不合格」与「完全没有中文语音」要说两句不同的话，
       而且**只有前者需要闭嘴**：后者不指定 voice 交给引擎默认，仍有可能出声。 */
    _zhRejected = !best && sawBad;
  }
  if (window.speechSynthesis) {
    loadVoiceCache();
    speechSynthesis.onvoiceschanged = loadVoiceCache;
  }
  /* speak(text, py) — py 是这句话逐字的音节串（w.py / w.zhPy / w.clozePy）。
     ⚠️ 传了 py，读音就以**数据**为准而不是引擎自己猜（js/tts.js 里换同音字）。
     owner 2026-08-16：屏幕上写 zhǎng、喇叭读 cháng，两者各说各话。
     没有 py 就退回引擎默认——不会更差，只是没有校正。 */
  function speak(text, py) {
    if (!window.speechSynthesis || !text) return;
    var said = window.WSTts ? WSTts.text(text, py) : String(text);
    var go = function () {
      if (!_zhVoice) loadVoiceCache();
      if (!_zhVoice && !_warnedNoZh) {
        _warnedNoZh = true;
        toast(_zhRejected
          ? "⚠️ 这台设备的中文语音是 eSpeak，读音不准（会把拼音和数字念出来），已暂停朗读。请老师协助安装普通话语音包。"
          : "⚠️ 未找到中文语音，请在设备语言设置中安装普通话语音包");
      }
      /* ⚠️ 只有「找到了中文语音但全部不合格」才闭嘴。完全没有中文语音时照旧发出去：
         不指定 voice、只给 lang，有些平台会给出一个枚举里没报出来的可用语音。 */
      if (_zhRejected) return;
      var u = new SpeechSynthesisUtterance(said);          // hanzi only, never pinyin
      u.lang = (_zhVoice && _zhVoice.lang) || "zh-CN";
      if (_zhVoice) u.voice = _zhVoice;
      u.rate = 0.9;
      /* hand the audio session back to WebAudio when the word has been read,
         or the next correct-answer chime is silent on Safari (see the audio
         section's note on the shared audio session) */
      u.onend = reviveAudio; u.onerror = reviveAudio;
      speechSynthesis.cancel();
      setTimeout(function () { speechSynthesis.speak(u); }, 50); // ChromeOS guard
    };
    if (!(speechSynthesis.getVoices() || []).length) { setTimeout(go, 200); } else { go(); }
  }
  // Cloze sentence: blank becomes a pause, never the answer.
  // ⚠️ 换空格不影响 clozePy 对齐：__ 和 ，都不是汉字，都不消耗音节。
  function speakCloze(sentence, py) {
    speak(String(sentence).replace(/_{2,}|＿+/g, "，"), py);
  }
  /* 「正确答案：X」——前缀是我们自己写的中文，不在 w.py 里，
     所以只对词本身做校正，再拼上去，否则音节数一定对不上。 */
  function sayAnswer(w) {
    speak("正确答案：" + (window.WSTts ? WSTts.text(w.w, w.py) : w.w));
  }

  /* ---------- sound effects (Web Audio, synthesized, no files) ----------
     ⚠️ READ THIS BEFORE TOUCHING ANYTHING HERE. Apple platforms give the page ONE
     shared audio session, and speechSynthesis takes it. This app speaks after
     almost every answer, so on Safari the AudioContext is repeatedly pushed into
     WebKit's own "interrupted" state — a third state that is neither "running"
     nor "suspended". Two consequences, both of which produced the 2026-08-15
     bug report "TTS works but there is still no correct-answer sound":
       1. An INTERRUPTED context renders nothing, so every scheduled note is
          dropped silently. No error, no warning.
       2. resume() on an interrupted context returns a promise that may NEVER
          settle. The previous fix waited on exactly that promise before playing,
          so the chime was not late — it never happened at all.
     So: never make playback wait on resume() alone, and never assume a context
     that worked once still works. */
  var _actx = null, _keepAlive = null, _ctxBorn = 0, _rebuilds = 0;
  function buildCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var c;
    try { c = new AC(); } catch (e) { return null; }
    _ctxBorn = Date.now();
    /* Silent looping source. An audio session with something playing in it is far
       less likely to be torn down or handed to speech, which is what keeps the
       chime working for a whole round instead of only the first tap. Gain is a
       hard 0, so it is inaudible and costs one sample per loop. */
    try {
      var src = c.createBufferSource(), g0 = c.createGain();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.loop = true; g0.gain.value = 0;
      src.connect(g0); g0.connect(c.destination); src.start(0);
      _keepAlive = src;
    } catch (e) {}
    return c;
  }
  function actx() {
    if (!_actx) _actx = buildCtx();
    if (_actx && _actx.state !== "running" && _actx.resume) {
      try { _actx.resume(); } catch (e) {}
    }
    return _actx;
  }
  /* Throw a wedged context away and build a fresh one. A context is born running
     when the audio session is free, so this is the only reliable recovery from
     "interrupted" — resume() cannot be trusted to get us out. Rate-limited so a
     genuinely broken device cannot spin up contexts on every answer (browsers cap
     how many a page may create, and exhausting that would kill audio for good). */
  var MAX_REBUILDS = 8;
  /* 🐛 owner 2026-08-17 (reported on the pier, fixed in both copies — §17: these two
     audio stacks are deliberate duplication and must not drift).
     ⚠️ `_rebuilds` NEVER RESET, so the 8-attempt cap was a whole-page-lifetime budget,
     and it was being spent on attempts that could not possibly succeed: while
     speechSynthesis holds the Apple audio session, a NEWLY created context is born
     "interrupted" too. Every answer given while a word was still being read burned one.
     After eight, the page is silent for good and revive() cannot recover it either,
     because revive() calls this same function.
     ⚠️ ① Reset on a context that is actually running: the budget must measure「this
        device cannot play audio at all」, not「speech interrupted us a moment ago」.
     ⚠️ ② Do not spend the budget while speech is busy — that attempt is doomed. The
        revive() called from an utterance's onend/onerror runs when the channel is free,
        which is when a rebuild can actually work.
     ⚠️ KEEP THE CAP. Browsers limit how many AudioContexts a page may create
     (historically 6 in Chrome); a genuinely mute device must still stop trying. */
  function speechBusy() {
    try {
      return !!(window.speechSynthesis &&
                (speechSynthesis.speaking || speechSynthesis.pending));
    } catch (e) { return false; }
  }
  function noteCtxRunning() {
    if (_actx && _actx.state === "running") _rebuilds = 0;
  }
  function rebuildCtx() {
    if (_rebuilds >= MAX_REBUILDS) return _actx;
    if (Date.now() - _ctxBorn < 1000) return _actx;
    if (speechBusy()) return _actx;
    _rebuilds++;
    var old = _actx;
    _actx = null; _keepAlive = null;
    if (old && old.close) { try { old.close(); } catch (e) {} }
    var built = (_actx = buildCtx());
    noteCtxRunning();
    return built;
  }
  function playTone(c, freq, start, dur, type, gain) {
    var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + start;
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain || 0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function tone(freq, start, dur, type, gain) {
    var c = actx(); if (!c) return;
    if (c.state === "running") { noteCtxRunning(); return playTone(c, freq, start, dur, type, gain); }
    var played = false;
    function go(cc) {
      if (played || !cc || cc.state !== "running") return;
      played = true;
      noteCtxRunning();      // 🐛 the channel is alive: hand the rebuild budget back
      playTone(cc, freq, start, dur, type, gain);
    }
    /* Ask nicely, but do NOT return here waiting on the answer (see the note
       above — that promise can hang forever on Safari). */
    try {
      var p = c.resume();
      if (p && p.then) p.then(function () { go(c); }, function () {});
    } catch (e) {}
    /* ...and if it has not come back by the next frame or two, rebuild and play
       on the new context. 120ms is under the threshold where a reward sound stops
       feeling attached to the tap that earned it. */
    setTimeout(function () {
      if (played) return;
      if (c.state === "running") return go(c);
      var fresh = rebuildCtx();
      if (fresh && fresh.state === "running") return go(fresh);
      /* ⚠️ rebuildCtx 可能什么也没换：1 秒限流会把**同一个卡住的** context
         原样还回来，go() 一看不是 running 就默默什么都不做——答对了却没声音，
         而且不报错。再等一拍，让限流窗口过去，然后最后试一次。
         (owner 2026-08-16「答对音效又没了」) */
      setTimeout(function () {
        if (played) return;
        go(_actx && _actx.state === "running" ? _actx : rebuildCtx());
      }, 260);
    }, 120);
  }
  /* Rising 3-note reward chime + a sparkle on top. Louder and on triangle waves
     since 2026-08-15 (owner: the correct-answer sound was not landing): a 0.12
     sine is nearly inaudible on a tablet speaker in a full classroom, which reads
     as "there is no sound" even where the call was firing correctly. */
  function sfxOk() {
    tone(660, 0, 0.10, "triangle", 0.20);
    tone(880, 0.08, 0.10, "triangle", 0.20);
    tone(1175, 0.16, 0.24, "triangle", 0.24);
    tone(1760, 0.16, 0.18, "sine", 0.08);
  }
  function sfxBad() { tone(180, 0, 0.22, "square", 0.07); }
  function sfxBadge() { tone(523, 0, 0.14); tone(659, 0.12, 0.14); tone(784, 0.24, 0.14); tone(1047, 0.36, 0.3); }
  function sfxLife() { tone(240, 0, 0.14, "square", 0.08); tone(180, 0.12, 0.2, "square", 0.08); }
  function sfxThunder() { tone(85, 0, 0.22, "square", 0.05); tone(55, 0.1, 0.34, "square", 0.055); }
  /* 词雨 pixel FX strip (splash 3 · lightning 2 · ripple 2), base64-embedded */
  var RAINFX_MAP = {"sp1": [0, 57, 37, 44], "sp2": [39, 56, 56, 45], "sp3": [97, 62, 52, 39], "bolt1": [151, 8, 26, 93], "bolt2": [179, 0, 40, 101], "rip1": [221, 83, 44, 18], "rip2": [267, 79, 60, 22]};
  /* iOS/iPadOS unlock: WebAudio + speech must be primed inside a user gesture.
     NOT once-only (it was until 2026-08-15): a context suspended later — the
     student switches app, the screen sleeps, a call comes in — would then never
     be primed inside a gesture again, and every chime after that is silent. */
  var _spoken0 = false;
  document.addEventListener("pointerdown", function () {
    var c = actx();                           // creates it, and resumes if not running
    /* A context still not running by the time the tap is over is wedged; a tap is
       the best moment we will ever get to replace it, since a fresh one is born
       running. */
    if (c && c.state !== "running") setTimeout(function () {
      if (_actx && _actx.state !== "running") rebuildCtx();
    }, 200);
    if (_spoken0) return;
    _spoken0 = true;
    try {
      if (window.speechSynthesis && !speechSynthesis.speaking) {
        var u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        /* ⚠️ This priming utterance is what unlocks speech on iOS — but starting
           speech is also what takes the audio session away from WebAudio, so the
           context must be revived once it finishes. Same hook as every real
           utterance below. */
        u.onend = reviveAudio; u.onerror = reviveAudio;
        speechSynthesis.speak(u);
      }
    } catch (e) {}
  });
  /* Speech has finished with the audio session: take it back. Without this the
     FIRST spoken word silences every chime for the rest of the round on Safari. */
  function reviveAudio() {
    if (!_actx) return;
    if (_actx.state === "running") { noteCtxRunning(); return; }
    try { _actx.resume(); } catch (e) {}
    setTimeout(function () {
      if (_actx && _actx.state === "running") { noteCtxRunning(); return; }
      /* ⚠️ this is called from an utterance's onend/onerror, so speech is finished by
         now and rebuildCtx()'s speechBusy() guard lets the attempt through. That pairing
         is the point: the doomed attempts are skipped, the useful one still happens. */
      rebuildCtx();
    }, 150);
  }
  /* coming back to the tab leaves the context suspended on most mobile browsers */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) reviveAudio();
  });

  /* ---------- local store (device only) ---------- */
  var STORE_KEY = "ws2_" + STREAM;
  var store = loadStore();
  function loadStore() {
    var s;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { s = {}; }
    s.mastered = s.mastered || {};     // wordId -> 1
    s.stats = s.stats || {};           // mode -> {a,c}
    s.badges = s.badges || {};         // badgeKey -> 1
    /* badgeLog: badgeKey -> {first, last, n}. A SEPARATE map on purpose —
       s.badges stays a plain truthy flag so every existing check, the cloud
       union and the badge count keep working untouched. Badges earned before
       this shipped simply have no log entry, and the detail card says
       日期未记录 rather than inventing a date. n counts 再次挑战 passes. */
    s.badgeLog = s.badgeLog || {};
    s.best = s.best || {};             // rain: score, handle: streak
    s.accOpen = s.accOpen || {};       // RETIRED 2026-08-14 (was: level -> bool). Kept so an
                                       // old store still parses; nothing reads it any more.
    /* 复习范围 accordion is now EXCLUSIVE: at most one level's units are visible,
       so this is a single level name (or "" = all folded, the first-login state). */
    s.accLevel = s.accLevel || "";
    /* 板块 filter: component NAME -> 1 means "excluded". Stored as the exclusions
       rather than the inclusions so a stream that gains a new 板块 shows it by
       default instead of silently hiding it. */
    s.compOff = s.compOff || {};
    /* 老师的清单 (owner 2026-09-01): a word list the student pasted in — the 期末
       revision list a teacher hands out — matched against THIS stream's words and
       then used AS the 复习范围.
       ⚠️ STORED, UNLIKE `scope` ITSELF. The unit selection is rebuilt as「all units」
       on every boot (see the loader) and has always been session-only. A revision
       list that evaporated on reload would be useless for the one job it exists to
       do, so it lives here in ws2_{stream} and survives.
       ⚠️ STREAM-LOCAL, deliberately (owner 2026-09-01). It holds ids from this
       stream's WORDS and nothing else. A G3 student wanting G1 words switches to G1;
       the alternative needs an answer for which stream's 历练值 a cross-stream drill
       would pay into, and that is a waterline question nobody has decided.
       ⚠️ Shape {ids:[…], at:ts}. Repaired to null rather than trusted: an empty list
       is indistinguishable from a dead 复习范围 — every mode refuses to start and the
       reason is a source the student cannot see — so it is read as damage, exactly
       like repairComps() reads「every 板块 off」as damage. */
    s.paste = (s.paste && s.paste.ids && s.paste.ids.length) ? s.paste : null;
    /* 来源 + 板块 fold into one「筛选」block (owner 2026-08-16 late:「reduce visual
       clutter」). ⚠️ CLOSED by default and remembered: both are set-once controls,
       and once the 板块 chips carry badge art they are the tallest thing in a card
       that is a fixed-height scroll box. A student who never opens it gets every
       板块 and the 单元 source, which is the correct default anyway. */
    if (typeof s.filtOpen !== "boolean") s.filtOpen = false;
    s.sprintSecs = s.sprintSecs || 90; // 攀山快答 timer preference
    s.sprintMode = s.sprintMode || "zh"; // 攀山快答 question mode: zh|en|cloze
    /* rainSpeed / rainRamp retired 2026-08-14: 词雨 is progressive-only now.
       Old values may linger in a student's store; nothing reads them. */
    s.diff = s.diff || ((STREAM === "g1" || STREAM === "g2") ? "2" : "3");  // cloze difficulty: 2|3|4|type
    s.pyAid = s.pyAid || false;        // 拼音辅助: 学生自选，默认关闭
    /* 英文提示 (G1/G2): 导航/按钮外壳文字下方的极小字号英文注释。学生自选，默认关闭。
       题目内容（题干、释义、句子）永远纯中文，不受此开关影响。 */
    s.enAid = s.enAid || false;
    /* fading 遥测: 设备/session 信号，供教师后台判断辅助是否在淡出。
       不进 进度码（这是遥测，不是可转移的学习进度）。 */
    s.enTel = s.enTel || {};
    s.enTel.sessionsTotal = s.enTel.sessionsTotal || 0;
    s.enTel.sessionsWithEnOn = s.enTel.sessionsWithEnOn || 0;
    s.enTel.last10Sessions = s.enTel.last10Sessions || [];   // 滚动窗口，最多 10 项
    s.enTel.manualOnCount = s.enTel.manualOnCount || 0;
    s.enTel.manualOffCount = s.enTel.manualOffCount || 0;
    s.enTel.lastPromptSessionIdx = s.enTel.lastPromptSessionIdx || 0;
    s.enTel.promptCount = s.enTel.promptCount || 0;          // lifetime
    s.enTel.promptTerm = s.enTel.promptTerm || "";           // 学期上限用
    s.enTel.promptTermCount = s.enTel.promptTermCount || 0;
    s.enTel.regressionAt = s.enTel.regressionAt || 0;        // 回退旗标: 记录当时的 sessionsTotal
    /* ---- 支援开关的「什么时候」(owner 2026-08-19) ----
       owner:「数据不足／观察中 is not helpful to me as a teacher … will it stamp when did
       they turn on the support and when they turned it off?」— IT DID NOT. Everything
       above is counters plus a 10-session rolling window of booleans: not one date, so
       the dashboard could only ever say「趋势 持平」and needed 6 sessions before it said
       even that. That is the whole reason it read 数据不足 to a teacher.
       ⚠️ A CHANGE LOG, NOT A SESSION LOG. One entry per actual on→off / off→on flip,
       so「8月14日 关掉，之后没再开」is answerable from the FIRST flip — a rolling ratio
       needs six sessions before it can say anything at all. It is also tiny: a student
       who flips twice a term stores two rows.
       ⚠️ DATES START NOW AND ARE NEVER BACKFILLED, exactly as 航海徽章's sailLog (§18v).
       An existing student's log starts empty and gains its baseline at their next round;
       the dashboard says 未记录 rather than inventing a date. A made-up「开始使用」is
       worse than admitting we do not know.
       ⚠️ 拼音 gets its OWN log and had NO telemetry at all before. It is not folded into
       enTel: they are two independent decisions by the student, and one array holding
       both would make「关掉了哪一个」a parsing problem. */
    s.enTel.log = (s.enTel.log instanceof Array) ? s.enTel.log : [];
    s.pyTel = s.pyTel || {};
    s.pyTel.log = (s.pyTel.log instanceof Array) ? s.pyTel.log : [];
    s.pkMode = s.pkMode || "cloze";    // 同伴挑战 题型
    s.pkDur = s.pkDur || 300;          // 同伴挑战 时长(秒)
    s.quizLen = s.quizLen || 20;       // 学习 quiz questions per session: 10/20/30/40/50
    s.quizMode = s.quizMode || "cloze"; // 学习挑战 题型: cloze|zhmcq|enmcq (§2.1 merged entry)
    s.compMode = s.compMode || "cloze"; // 徽章「去挑战」 practice mode
    s.goalMode = s.goalMode || { type: "unit", n: 20 }; // 我的词山 SDT goal
    s.bestStreak = s.bestStreak || 0;
    s.lingLu = s.lingLu || 0;          // 灵露 currency (number)
    /* per-WORD-TEXT lifetime correct count, drives the 灵露 decay curve.
       Separate from mastered/gymTodo on purpose: those are learning STATE,
       this is an earnings ledger. Not in 进度码 (it is economy, not progress). */
    s.wins = s.wins || {};
    s.deco = s.deco || {};             // 营地商店 items OWNED: key -> 1 (never pruned:
                                       // an archived key stays put so a pre-便携化
                                       // purchase can still be refunded if it comes to that)
    s.equip = s.equip || {};           // 随身装备 EQUIPPED: slot -> key (one per slot)
    /* 消耗品／道具库存与赛前所选的槽位。⚠️ localStorage-only in the same sense as
       lingLu/deco: they ride to Firestore inside the whole-store write but are NOT
       merged back and are NOT in 进度码 — a consumable is not transferable progress. */
    s.items = s.items || {};           // key -> count owned
    s.itemSlots = s.itemSlots || {};   // "rain" | "sprint" -> [key, ...] chosen pre-round
    s.decoPos = s.decoPos || {};       // 自由摆放: key -> {x,y} percent, 整理营地 clears it
    s.gym = s.gym || {};               // 年度试炼 passed: level -> 1
    s.gymTodo = s.gymTodo || {};       // 试炼失手待巩固: level -> { wordId: 1 }
    s.homeTab = s.homeTab || "study";  // last home tab: study | play
    s.asmPrompt = s.asmPrompt || (STREAM === "g1" ? "py" : "def"); // 组字成词 prompt: def|en|cloze|py (py earns 10% 历练值); G1 defaults to the easier 拼音 tier
    s.asmChips = s.asmChips || 9;      // 组字成词 字块数量 (incl. the answer's own chars)
    s.streak = s.streak || 0;          // 连续学习天数 (daily)
    s.lastActive = s.lastActive || ""; // last active local date "YYYY-MM-DD"
    s.lbScope = s.lbScope || "school"; // 排行榜 scope: school (校内) | all (跨校)
    s.lbBoard = s.lbBoard || "alt";    // 排行榜 board: alt (掌握词数) | pts (历练值)
    s.lbTerm = s.lbTerm || "term";     // 历练值 sub-board: term (本季, a calendar quarter) | total (累计)
    /* 历练值 (effort/depth points) — leaderboard depth metric. Three separate
       numbers, never summed (see LEADERBOARD_DESIGN): 海拔 breadth, 历练值 depth,
       灵露 currency. localStorage is the source of truth; Firestore mirrors it. */
    s.pts = s.pts || {};
    s.pts.total = s.pts.total || 0;                         // cumulative, all years
    s.pts.terms = s.pts.terms || {};                        // termId -> banked pts
    /* fold legacy MOE-term keys into calendar quarters (owner 2026-09-04, see normTermId) */
    Object.keys(s.pts.terms).forEach(function (k) {
      var q = normTermId(k);
      if (q !== k) { s.pts.terms[q] = (s.pts.terms[q] || 0) + (s.pts.terms[k] || 0); delete s.pts.terms[k]; }
    });
    s.pts.masteryAwarded = s.pts.masteryAwarded || {};      // wordId -> 1, guards +10
    s.pts.repeats = s.pts.repeats || { day: "", counts: {} }; // wordId -> repeats today
    /* 本周历练值: a single lazy-reset bucket, NOT an accumulating map like terms —
       a year of weekly keys would bloat scores/{uid} for no ranking value. */
    s.pts.week = s.pts.week || { id: "", n: 0 };
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
    /* ⚠️ 恢复码 mirror rides the FLUSH, never the 2.5s debounce (§18ae): refreshing the
       whole-account snapshot on every progress write would double this project's
       Firestore write volume, and「the state when you closed the tab」is the right
       granularity for a lost-device backup. Fails soft while the rules are unpublished. */
    if (window.WSProfile && WSProfile.pushClaim) WSProfile.pushClaim();
  }
  /* only 学生 profiles are published to the leaderboard (teachers/parents never are) */
  function pushLeaderboard() {
    if (!window.WSCloud || !window.WSCloud.saveScore) return;
    var p = loadProfile();
    if (!p || p.category !== "student") return;
    /* the published pts map = the per-quarter banks PLUS a "week" key. Quarter ids look
       like "2026Q3", so "week" can never collide with one. (A cloud doc written before
       2026-09-04 may still carry a "2026T3" key beside it; merge:true never removes it,
       and nothing reads it any more — teacher.html folds it when it reads.) */
    var ptsMap = {};
    Object.keys(store.pts.terms || {}).forEach(function (k) { ptsMap[k] = store.pts.terms[k]; });
    ptsMap.week = weekPts();
    window.WSCloud.saveScore(STREAM, {
      nickname: p.nickname || "", school: p.school || "",
      alt: Object.keys(store.mastered).length,
      totalPts: store.pts.total || 0,
      bestStreak: store.bestStreak || 0,
      pts: ptsMap,
      /* speed boards publish CANONICAL-CONFIG runs only (90s sprint / 递增 rain);
         store.best.sprint / .rain stay private personal bests across all configs */
      bestSprint90: store.best.sprint90 || 0,
      bestRainRamp: store.best.rainRamp || 0,
      battle: battleSummary()
    });
  }
  window.addEventListener("pagehide", flushCloudSyncNow);
  window.addEventListener("beforeunload", flushCloudSyncNow);

  /* ---------- merging two devices' aid logs ----------
     ⚠️ UNION BY (date, state), NOT「take the longer array」. A student really does use a
     school Chromebook and a home iPad, and each only ever saw its own flips — whichever
     array is longer, taking it whole would silently delete the other device's history.
     Union keeps every decision, and re-running it changes nothing (the same property
     that makes 进度码 restore safe, §18r).
     ⚠️ Re-collapse after merging: interleaving two devices can put two rows with the
     same state next to each other (both devices independently「开」), which reads as a
     flip that never happened. Only genuine changes survive.
     ⚠️ Trims from index 1, same as aidLogPush — the origin row is the one fact that
     cannot be reconstructed. */
  /* ⚠️ DECLARED HERE, not next to aidLogPush 2,700 lines below, even though that is
     where it reads most naturally. mergeAidLog runs from a cloud callback and would
     therefore find it assigned — but this file already carries a scar from exactly this
     shape (xh.js load() normalises with literals「NOT ROUND_SIZES/OPT_TIERS … this runs
     at module init, before those vars are assigned」). Keeping the constant above its
     earliest user means no future caller can move into the gap and silently get
     undefined, which trims the log to nothing rather than throwing. */
  var AID_LOG_CAP = 30;
  function mergeAidLog(lt, ct) {
    if (!lt || !ct || !(ct.log instanceof Array) || !ct.log.length) return false;
    var mine = (lt.log instanceof Array) ? lt.log : (lt.log = []);
    var seen = {}, all = [];
    mine.concat(ct.log).forEach(function (e) {
      if (!e || typeof e.d !== "string") return;
      var k = e.d + "|" + (e.on ? 1 : 0);
      if (seen[k]) return;
      seen[k] = 1; all.push({ d: e.d, on: e.on ? 1 : 0 });
    });
    all.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : (a.on - b.on); });
    var out = [];
    all.forEach(function (e) {
      var last = out.length ? out[out.length - 1] : null;
      if (last && last.d === e.d) { out[out.length - 1] = e; return; }  // one row per day
      if (last && last.on === e.on) return;                            // not a change
      out.push(e);
    });
    while (out.length > AID_LOG_CAP) out.splice(1, 1);
    var same = out.length === mine.length && out.every(function (e, i) {
      return mine[i] && mine[i].d === e.d && (mine[i].on ? 1 : 0) === e.on;
    });
    if (same) return false;
    lt.log = out;
    return true;
  }

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
    /* badgeLog: earliest 首次 wins (that is the real earning date), latest 最近
       wins, and the challenge count takes the max — the same never-decreases
       shape the rest of this merge uses. */
    Object.keys(cloud.badgeLog || {}).forEach(function (k) {
      var c = cloud.badgeLog[k] || {}, m = store.badgeLog[k];
      if (!m) { store.badgeLog[k] = { first: c.first || "", last: c.last || "", n: c.n || 1 }; changed = true; return; }
      if (c.first && (!m.first || c.first < m.first)) { m.first = c.first; changed = true; }
      if (c.last && (!m.last || c.last > m.last)) { m.last = c.last; changed = true; }
      if ((c.n || 1) > (m.n || 1)) { m.n = c.n; changed = true; }
    });
    /* 年度试炼 passes: union, never un-pass. ⚠️ ADDED 2026-08-16 with the 神兽 avatar
       unlock — gym was previously local-only, so switching device silently re-locked
       an earned 神兽 while its sibling unlock (白龙马, off pts.total) survived. A pass
       is never cleared by a relock (only gymTodo is set), so a union is exactly right. */
    Object.keys(cloud.gym || {}).forEach(function (lv) {
      if (cloud.gym[lv] && !store.gym[lv]) { store.gym[lv] = 1; changed = true; }
    });
    Object.keys(cloud.best || {}).forEach(function (k) {
      var v = Math.max(store.best[k] || 0, cloud.best[k] || 0);
      if (v !== store.best[k]) { store.best[k] = v; changed = true; }
    });
    if ((cloud.bestStreak || 0) > (store.bestStreak || 0)) { store.bestStreak = cloud.bestStreak; changed = true; }
    /* 历练值 is event-based, not reconcilable from ground truth: keep the higher
       value on conflict, union the per-term banks and the mastery-bonus guard. */
    if (cloud.pts) {
      if ((cloud.pts.total || 0) > (store.pts.total || 0)) { store.pts.total = cloud.pts.total; changed = true; }
      Object.keys(cloud.pts.terms || {}).forEach(function (raw) {
        var tid = normTermId(raw);      // a device on the old build may still push "2026T3"
        var v = Math.max(store.pts.terms[tid] || 0, cloud.pts.terms[raw] || 0);
        if (v !== (store.pts.terms[tid] || 0)) { store.pts.terms[tid] = v; changed = true; }
      });
      Object.keys(cloud.pts.masteryAwarded || {}).forEach(function (id) {
        if (!store.pts.masteryAwarded[id]) { store.pts.masteryAwarded[id] = 1; changed = true; }
      });
      /* 本周 bucket: only comparable within the SAME week. A cloud bucket from a
         newer week wins outright (this device has been idle); one from an older
         week is ignored rather than merged, or last week's points would leak
         into this week's board. */
      var cw = cloud.pts.week;
      if (cw && cw.id) {
        if (cw.id === store.pts.week.id) {
          var wv = Math.max(store.pts.week.n || 0, cw.n || 0);
          if (wv !== (store.pts.week.n || 0)) { store.pts.week.n = wv; changed = true; }
        } else if (cw.id > (store.pts.week.id || "")) {
          store.pts.week = { id: cw.id, n: cw.n || 0 }; changed = true;
        }
      }
    }
    /* 英文提示 fading telemetry: counters merge by max (they only ever grow),
       and the rolling window / prompt bookkeeping follow whichever record has
       seen more sessions. store.enAid itself is a DEVICE preference and is
       deliberately NOT merged — a student may want English on the classroom
       Chromebook and off at home. */
    if (cloud.enTel) {
      var ct = cloud.enTel, lt = store.enTel, localSessions = lt.sessionsTotal || 0;
      ["sessionsTotal", "sessionsWithEnOn", "manualOnCount", "manualOffCount",
       "promptCount", "lastPromptSessionIdx", "regressionAt"].forEach(function (k) {
        var v = Math.max(lt[k] || 0, ct[k] || 0);
        if (v !== (lt[k] || 0)) { lt[k] = v; changed = true; }
      });
      /* the rolling window is a sequence, not a counter: take it whole from the
         record that has seen more sessions rather than interleaving two devices */
      if ((ct.sessionsTotal || 0) > localSessions && ct.last10Sessions && ct.last10Sessions.length) {
        lt.last10Sessions = ct.last10Sessions.slice(-10);
        changed = true;
      }
      if (ct.promptTerm === lt.promptTerm) {
        lt.promptTermCount = Math.max(lt.promptTermCount || 0, ct.promptTermCount || 0);
      } else if (ct.promptTerm && !lt.promptTerm) {
        lt.promptTerm = ct.promptTerm; lt.promptTermCount = ct.promptTermCount || 0; changed = true;
      }
      if (mergeAidLog(lt, ct)) changed = true;
    }
    if (cloud.pyTel && mergeAidLog(store.pyTel, cloud.pyTel)) changed = true;
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

  /* ================================================================
     历练值 (effort/depth points) + term banking. See LEADERBOARD_DESIGN.
     final = round(base × attemptDecay × streakMultiplier)  (min 1)
             + firstMasteryBonus (+10, once per word, added not multiplied)
     Repeats on an already-mastered word: quarter base, no streak, capped
     at 3 scoring repeats per word per Singapore day.
     ================================================================ */

  /* ⚠️ The「term」bank is a CALENDAR QUARTER, not an MOE term (owner 2026-09-04:
     「independent of MOE term time, just make it quarterly refresh … recurring
     indefinitely without maintenance for new years」). Until then this was a hand-edited
     TERMS table that ended at 2026T4, after which「本学期」would have silently become a
     cumulative board. Quarter ids look like "2026Q3"; Q1 = Jan–Mar … Q4 = Oct–Dec,
     Asia/Singapore. Nothing here ever needs a new year added.
     ⚠️ Legacy MOE keys ("2026T3") are folded into the quarter of the same number by
     normTermId(): every MOE term n lies inside calendar quarter n, so the fold loses
     nothing. Applied on load and when merging another device's cloud copy. */
  function normTermId(tid) {
    var m = /^(\d{4})T([1-4])$/.exec(String(tid || ""));
    return m ? m[1] + "Q" + m[2] : tid;
  }
  function todaySG() {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); }
    catch (e) { return todayStr(); }   // en-CA => YYYY-MM-DD
  }
  function currentTermId() {
    var p = todaySG().split("-");                       // YYYY-MM-DD, Asia/Singapore
    return p[0] + "Q" + (Math.floor((+p[1] - 1) / 3) + 1);   // never null
  }
  /* Week id = the DATE OF THAT WEEK'S SUNDAY in Asia/Singapore, e.g. "2026-08-16".
     The boundary is Sunday–Saturday (owner 2026-08-13). Deliberately NOT an ISO
     week number: ISO weeks run Mon–Sun, which would sit one day off the locked
     boundary and be invisible until someone audited a Monday's points.
     Arithmetic is done in UTC on a date-only value so no timezone can shift it. */
  function currentWeekId() {
    var p = todaySG().split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());        // 0 = Sunday
    return d.toISOString().slice(0, 10);
  }
  /* 本周历练值, or 0 once the stored bucket belongs to a past week. Read through
     this everywhere — store.pts.week.n alone is stale until the next bankPts. */
  function weekPts() {
    return store.pts.week.id === currentWeekId() ? (store.pts.week.n || 0) : 0;
  }

  /* 段位 ladder — per stream, at the same fractions of each stream's projected
     4-year total (LEADERBOARD_DESIGN §5.3). Distinct from badges/achievement tiers. */
  /* ⚠️ FOUR rungs since 2026-08-16 (owner), down from six: 破雪士 and 摩天客 are
     retired and 凌霄客 moves down to become the top. Rationale for the numbers —
     they are a PROPOSAL, like every ladder number here, and CLAUDE.md's standing
     note still applies: recalibrate after one real term before announcing them.
       · 寻径人 and 踏云者 keep their EXACT old thresholds, so nobody is demoted by
         this change and 白龙马's unlock (pegged to rung index 2 = 踏云者, and
         mirrored in profile.js PTS_UNLOCK) needs no edit at all.
       · 凌霄客 takes the old 摩天客 value, which keeps the step ratio at a steady
         ~4.4x per rung in every stream instead of leaving a 7x plateau at the top.
         At ~2/3 of each stream's projected 4-year total it stays reachable in the
         final year rather than being ornamental.
     ⚠️ PER STREAM, and deliberately so: the same student can be 踏云者 on G3 and
     初行客 on HCL. 历练值 lives in ws2_{stream}, so ranks never pool across
     mountains — and this ladder belongs to the MOUNTAINS only. 出发码头 has its own
     航海值 and its own boards; it must never show a 段位. */
  var LADDER = {
    g1:  [["初行客", 0], ["寻径人", 600], ["踏云者", 2500], ["凌霄客", 11000]],
    g2:  [["初行客", 0], ["寻径人", 700], ["踏云者", 3100], ["凌霄客", 14000]],
    g3:  [["初行客", 0], ["寻径人", 800], ["踏云者", 3500], ["凌霄客", 16000]],
    hcl: [["初行客", 0], ["寻径人", 1000], ["踏云者", 4200], ["凌霄客", 18500]]
  };
  function currentRank() {
    var lad = LADDER[STREAM] || LADDER.g1, tot = store.pts.total, cur = lad[0], next = null, i;
    for (i = 0; i < lad.length; i++) {
      if (tot >= lad[i][1]) cur = lad[i];
      else { next = lad[i]; break; }
    }
    return { name: cur[0], at: cur[1], next: next ? { name: next[0], at: next[1] } : null, total: tot };
  }

  /* base 历练值 per question type (LEADERBOARD_DESIGN §2). cloze varies by tier;
     flash/rain earn none (rain pays 灵露, flash is self-marked). */
  var CLOZE_BASE = { "2": 2, "3": 3, "4": 5, "type": 8 };
  var PTS_BASE = { enmcq: 2, zhmcq: 3, assemble: 3, sprint: 2 };
  var PTS_DECAY = [1.0, 0.40, 0.15];           // attempt 1 / 2 / 3+
  var FIRST_MASTERY_BONUS = 10;
  var REPEAT_DAILY_CAP = 3;
  function attemptDecay(attempt) { return PTS_DECAY[Math.min((attempt || 1) - 1, 2)]; }
  function streakMult(entering) {
    if (entering >= 12) return 2.0;
    if (entering >= 8) return 1.8;
    if (entering >= 5) return 1.5;
    if (entering >= 3) return 1.2;
    return 1.0;
  }
  /* 白龙马 unlocks at 踏云者, the ladder's third rung (HANDOFF §3.2). ⚠️ A THRESHOLD,
     never a purchase: 历练值 is monotonic and drives both the 段位 and the
     leaderboard, so deducting a price would demote the student for unlocking it.
     Read off LADDER so there is no second copy of the numbers here. */
  function ptsAvatarGate() { var lad = LADDER[STREAM] || LADDER.g1; return lad[2] || null; }
  function bankPts(n) {
    if (!n) return;
    /* one-shot crossing notice: derived from before/after, so nothing is stored
       and nothing can drift (HANDOFF §3.5 — no unlockedAvatars list) */
    var gate = ptsAvatarGate(), before = store.pts.total;
    store.pts.total += n;
    if (gate && before < gate[1] && store.pts.total >= gate[1]) {
      toast("🐎 达到「" + gate[0] + "」，解锁新头像：白龙马");
    }
    var tid = currentTermId();
    store.pts.terms[tid] = (store.pts.terms[tid] || 0) + n;
    /* lazy weekly reset at write time — same pattern as the per-day repeat cap,
       so there is no cron and no scheduled Cloud Function to keep alive */
    var wid = currentWeekId();
    if (store.pts.week.id !== wid) store.pts.week = { id: wid, n: 0 };
    store.pts.week.n += n;
    saveStore();
  }
  function ensureRepeatDay() {
    var today = todaySG();
    if (store.pts.repeats.day !== today) store.pts.repeats = { day: today, counts: {} };
  }
  function repeatValue(w, base) {
    ensureRepeatDay();
    var n = store.pts.repeats.counts[w.id] || 0;
    if (n >= REPEAT_DAILY_CAP) return 0;       // still earns 灵露 & streak elsewhere
    store.pts.repeats.counts[w.id] = n + 1;
    return Math.max(1, Math.round(base * 0.25));
  }
  /* Award 历练值 for one correct answer. Pass the mastery state BEFORE this answer
     resolved (wasMastered) and the 连对 count ENTERING the question. Returns the
     points earned (0 for a capped repeat or a base-0 mode). */
  function scoreCorrect(w, base, attempt, entering, wasMastered, mult) {
    if (!base) return 0;
    var earned = wasMastered
      ? repeatValue(w, base)
      : Math.max(1, Math.round(base * attemptDecay(attempt) * streakMult(entering)));
    /* mult = the 拼音练习 discount (PY_PRACTICE_MULT). Floored at 1 so a correct
       pinyin answer always shows SOMETHING — the point is to affirm the effort,
       not to pay it properly. Never applied to a capped repeat (already 0). */
    if (mult && mult !== 1 && earned) earned = Math.max(1, Math.round(earned * mult));
    bankPts(earned);
    return earned;
  }
  /* 拼音 practice modes (填空·打拼音, 组词·拼音) earn 10% of the 历练值 an
     understanding-based answer earns (owner 2026-08-14: "affirm their efforts in
     pinyin"). They still do NOT confer 海拔 — mastery is the documented gate and
     there is no such thing as 10% of a binary — and they still do not build 连对,
     or a student could farm a cheap streak multiplier and carry it into 学习. */
  var PY_PRACTICE_MULT = 0.10;
  /* ================= 灵露 award engine (DESIGN_economy_pricing_2026-08-14) =====
     灵露 = base × tier × pinyin × decay, on correct answers only. It sits BESIDE
     历练值 and must never be confused with it: 历练值 rewards effort and streaks
     (depth), 灵露 is spending money. Both are computed at the same call sites.

     ⚠️ LINGLU_BASE is MINE — the design doc gives the formula but no base_rate.
     Derived from its own anchor «1 session ≈ 30 灵露 at steady state»: a 学习
     session is 20 questions at tier 1x, and by then most words sit in the
     25%/10% decay bands (~0.15 average), so 30 / (20 × 0.15) ≈ 10. The doc
     itself asks for a re-calibration from real Firestore data after 3–4 weeks —
     that is the moment to revisit this single number.
     ⚠️ 词雨 generates far more than 30/session because a round has far more
     correct answers than 20. That is intended: the decay curve is what reins it
     in once a student has been through the word pool.                        */
  var LINGLU_BASE = 10;
  var LINGLU_TIER = {          // §1.1 效果分级: harder recall earns more
    flash: 0.5,                // 词语闪卡 — passive self-rating
    cloze: 1, zhmcq: 1, enmcq: 1,   // standard MCQ (baseline)
    sprint: 1.25,              // 攀山快答 — timed MCQ
    assemble: 1.5,             // 组字成词 — assembly, no free typing
    handle: 2, rain: 2, pinyin: 2   // free typing, nothing to recognise from
  };
  var LINGLU_TYPED = { handle: 1, rain: 1, pinyin: 1 };   // where §1.2 applies
  var LINGLU_PY_MOD = 0.65;    // 拼音辅助 on, typing modes only
  var LINGLU_DECAY = [1.0, 0.5, 0.25, 0.10];              // §1.3, 4th+ floors at 10%
  /* lifetime correct count per WORD TEXT, shared across every mode (§1.3).
     Text, not id, is the natural key — the same word in two streams is the same
     word to a student. NOTE: this counts within THIS stream's store; a真 cross-
     stream union would need the same load-time pass mastery carryover uses. */
  function winsOf(w) { return store.wins[w.w] || 0; }
  function inGymTodo(w) {
    var lv, t = store.gymTodo;
    for (lv in t) if (t.hasOwnProperty(lv) && t[lv] && t[lv][w.id]) return true;
    return false;
  }
  function lingLuFor(w, mode) {
    var tier = LINGLU_TIER[mode];
    if (!tier || !w) return 0;
    var idx = Math.min(winsOf(w), LINGLU_DECAY.length - 1);
    /* 待巩固 复习补偿: a word that fell back into the 待巩固 list climbs one decay
       band when it is recovered. 历练值 already rewards spaced review; 灵露 must
       not quietly punish it. */
    if (inGymTodo(w)) idx = Math.max(0, idx - 1);
    var py = (LINGLU_TYPED[mode] && store.pyAid) ? LINGLU_PY_MOD : 1;
    return Math.max(1, Math.round(LINGLU_BASE * tier * py * LINGLU_DECAY[idx]));
  }
  /* call on a CORRECT answer, at the same point scoreCorrect is called and
     BEFORE gymNote clears the word from 待巩固 (or the compensation is lost).
     Returns the amount so callers can show it. */
  function awardLingLu(w, mode, defer) {
    var n = lingLuFor(w, mode);
    store.wins[w.w] = winsOf(w) + 1;
    /* defer = 词雨 only: the run collects into the barrel and banks at game over,
       so the wallet must not tick up mid-round. The wins counter still advances
       immediately, or a word caught twice in one round would not decay. */
    if (n && !defer) store.lingLu += n;
    return n;
  }

  /* +10 once per word ever, the moment 海拔 increases. Guarded so a 进度码 restore
     or device change cannot fire it twice. */
  function awardMasteryBonus(w) {
    if (store.pts.masteryAwarded[w.id]) return 0;
    store.pts.masteryAwarded[w.id] = 1;
    bankPts(FIRST_MASTERY_BONUS);
    return FIRST_MASTERY_BONUS;
  }
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  /* brief "+N 历练值" flourish over the study feedback line */
  function showGain(n) {
    if (!n) return;
    var fb = document.getElementById("fb");
    if (!fb) return;
    var g = document.createElement("span");
    g.className = "pts-gain"; g.textContent = "+" + n + " 历练值";
    fb.appendChild(g);
  }

  /* ---------- profile (shared across all 4 levels) ----------
     Owned solely by profile.js / window.WSProfile. These are thin delegations
     so existing call sites keep working; never read/write ws2_profile here. */
  function loadProfile() { return window.WSProfile ? window.WSProfile.load() : null; }
  function saveProfileLocal(p) { if (window.WSProfile) window.WSProfile.save(p); }
  function bump(mode, correct) {
    if (!store.stats[mode]) store.stats[mode] = { a: 0, c: 0 };
    store.stats[mode].a += 1; if (correct) store.stats[mode].c += 1;
    enNoteSession();   // 有效 session = 至少答了一题；每个模式的答题都走 bump()
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
  /* Stamps the earning date the first time a badge is awarded. n starts at 1;
     每一次 再次挑战 全对 bumps it (bumpBadgeAgain). */
  function logBadge(key) {
    var d = todaySG();
    if (!store.badgeLog[key]) store.badgeLog[key] = { first: d, last: d, n: 1 };
  }
  function badgeInfo(key) { return store.badgeLog[key] || null; }
  function checkBadges(silent) {
    var earned = [];
    COMP_LIST.forEach(function (c) {
      if (!store.badges[badgeKeyC(c)] && isCompDone(c)) {
        store.badges[badgeKeyC(c)] = 1;
        logBadge(badgeKeyC(c));
        earned.push({ tier: 1, level: c.level, unit: c.unit, component: c.component });
      }
    });
    UNIT_LIST.forEach(function (u) {
      var comps = COMP_LIST.filter(function (c) { return c.level === u.level && c.unit === u.unit; });
      var all = comps.length && comps.every(function (c) { return store.badges[badgeKeyC(c)]; });
      if (all && !store.badges[badgeKeyU(u.level, u.unit)]) {
        store.badges[badgeKeyU(u.level, u.unit)] = 1;
        logBadge(badgeKeyU(u.level, u.unit));
        earned.push({ tier: 2, level: u.level, unit: u.unit });
      }
    });
    LEVELS.forEach(function (lv) {
      var units = UNIT_LIST.filter(function (u) { return u.level === lv; });
      var all = units.length && units.every(function (u) { return store.badges[badgeKeyU(u.level, u.unit)]; });
      if (all && !store.badges[badgeKeyL(lv)]) {
        store.badges[badgeKeyL(lv)] = 1;
        logBadge(badgeKeyL(lv));
        earned.push({ tier: 3, level: lv });
      }
    });
    var allLv = LEVELS.length && LEVELS.every(function (lv) { return store.badges[badgeKeyL(lv)]; });
    if (allLv && !store.badges["t4"]) {
      store.badges["t4"] = 1;
      logBadge("t4");
      earned.push({ tier: 4 });
    }
    if (earned.length) {
      saveStore();
      /* ⚠️ owner 2026-08-23：「after I get the badge I should be redirected to
         成就墙 … sometimes I prompted to 回到成就墙 and sometimes I'm not」。
         每一块结算页都忠实地送学生回他进来的地方（成就墙进来的回成就墙，
         词语表进来的回词语表，门进来的回那扇门）——**那部分是对的，没有动**。
         漏掉的是另一半：在一局普通的 学习挑战 里点亮徽章，结算页压根不提
         成就墙，学生刚拿到的东西没有一条路可以去看。
         所以这里记一笔，renderResult 据此补一颗按钮。
         ⚠️ 记的是**计数**不是内容：庆祝弹窗已经把是哪一枚说清楚了，
         结算页只需要回答「要不要给一条去成就墙的路」。 */
      _celEarned += earned.length;
      if (!silent) queueCelebrations(earned);
    }
  }
  /* 本局点亮的徽章数。renderStep 开局清零，renderResult 读它。 */
  var _celEarned = 0;
  function resetBadgeRunTally() { _celEarned = 0; }
  /* 结算页那颗「去成就墙」。只有本局真的点亮了徽章才出现——
     常驻会让它变成又一个学生学会忽略的按钮。 */
  function achLinkHtml() {
    return _celEarned
      ? '<button class="nav-btn" id="goAch">🎖 去成就墙' + pyl("去成就墙") + enli("去成就墙") + '</button>'
      : "";
  }
  function wireAchLink() {
    var b = document.getElementById("goAch");
    if (b) b.onclick = renderAchievements;
  }
  function markMastered(w) {
    if (store.mastered[w.id]) { saveStore(); return; }
    store.mastered[w.id] = 1;
    awardMasteryBonus(w);        // +10 历练值, once per word, the moment 海拔 rises
    saveStore();
    checkBadges();
    applyAmbience();
  }

  /* ---------- ambient backdrop: painterly progression art (bg-01..05) ----------
     The whole-app body backdrop evolves with overall mastery, shared across all
     four courses. bg-01..04 rotate by progression tier; bg-05 is the reward scene
     shown only once the course is complete (顶级词王). */
  var AMBIENCE = ["art/bg/bg-01-staircase-sunrise.png", "art/bg/bg-02-bamboo-forest.png",
                  "art/bg/bg-03-ridge-clouds.png", "art/bg/bg-04-snowpass-dusk.png"];
  /* Which progression plate the student has earned. ⚠️ This is the MASTERY-fraction
     scale (mastered/total), NOT the 段位 ladder, which runs on 历练值 — the two
     advance at different rates and must never be shown as one system (handoff §4). */
  function ambiencePlate() {
    if (!WORDS.length) return AMBIENCE[0];
    if (store.badges && store.badges["t4"]) return "art/bg/bg-05-summit-pavilion.png";
    var frac = Object.keys(store.mastered).length / WORDS.length;
    return AMBIENCE[Math.min(AMBIENCE.length - 1, Math.floor(frac * AMBIENCE.length))];
  }
  /* ⚠️ THE PLATE IS BACK ON THE BODY (owner, 2026-08-16 evening) — and this is a
     deliberate reversal of the handoff §3 note that used to sit here, not a
     regression. Read this before "restoring" either version.

     §3 moved the plate OFF the body because the banner showed the SAME 1672x941
     image, so it appeared twice on one screen. The owner has now made the banner
     show 我的词山 — the stream's OWN mountain (art/mountain/mtn_{stream}.png) —
     so the collision that justified §3 no longer exists, and the two images now
     say different things:
       body plate  = HOW FAR YOU HAVE COME (bg-01..05, mastery fraction)
       banner      = WHICH MOUNTAIN YOU ARE ON (per-stream identity)
     ⚠️ If the banner is ever pointed back at ambiencePlate(), this must go back
     to clearing the body, or the duplication returns.
     ⚠️ Still do NOT lower .pop-card alpha: it was raised on 2026-08-14 precisely
     because muted text was unreadable over these plates, and with the plates back
     on the body that reason is live again. */
  function applyAmbience() {
    document.body.style.backgroundImage =
      'linear-gradient(rgba(246,250,253,.55),rgba(246,250,253,.55)),url("' + ambiencePlate() + '")';
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
  /* ⚠️ Keyed by level NAME, not array position (HANDOFF §3.1a). PETS used to be a
     positional array indexed against LEVELS, which is only correct while every
     stream has exactly four levels: a 5-level stream silently awarded 神龙 to
     everything past 中四, and a 3-level one never awarded it at all. LEVELS is
     built from the stream JSON at load, so that is not guaranteed. A lookup miss
     now returns null — award nothing — instead of clamping to the last entry.
     `key` is the 营地 PET_LAYOUT key and `avatarId` the 头像目录 id, so the
     level → 神兽 → sprite mapping is one row of data, not three parallel lists. */
  var PETS = {
    "中一": { emoji: "🐢", name: "灵龟", key: "gui",   avatarId: "pet_gui" },
    "中二": { emoji: "🦌", name: "麒麟", key: "qilin", avatarId: "pet_qilin" },
    "中三": { emoji: "🐦", name: "凤凰", key: "feng",  avatarId: "pet_feng" },
    "中四": { emoji: "🐉", name: "神龙", key: "long",  avatarId: "pet_long" }
  };
  function petFor(level) { return PETS[level] || null; }
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
      badgeHtml = '<img class="cel-img" src="' + (BADGE_IMG[it.component] || "art/badge/badge_hx.png") + '" alt="">';
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

  /* ---------- 意见反馈 floating button (owner 2026-08-14) ----------
     Placement borrowed from the gov.sg satisfaction widget: a small persistent
     corner button, reachable from anywhere with no navigation. What is NOT
     borrowed is the 😊😐☹️ rating — see the CLAUDE.md note; this app needs
     actionable defect reports, not a sentiment score.

     ⚠️ HIDDEN during timed games (词雨灵露, 攀山快答). Bottom-left is where 词雨
     words land, and a stray tap during a timed run is exactly the near-miss
     hazard the 可及性 pass spent a whole session removing. A student reports
     after the round; nothing is lost. */
  var _fabEl = null;
  function ensureFab() {
    if (_fabEl && _fabEl.isConnected) return _fabEl;
    _fabEl = document.createElement("button");
    _fabEl.className = "fb-fab";
    _fabEl.id = "fbFab";
    _fabEl.title = "意见反馈 · 报错";
    _fabEl.setAttribute("aria-label", "意见反馈");
    _fabEl.innerHTML = '<span class="fb-fab-icon">💬</span><span class="fb-fab-txt">反馈</span>';
    _fabEl.onclick = function () {
      if (window.WSProfile && window.WSProfile.openFeedback) window.WSProfile.openFeedback();
    };
    document.body.appendChild(_fabEl);
    return _fabEl;
  }
  function showFab(on) {
    var f = ensureFab();
    f.style.display = on ? "" : "none";
  }

  /* What the student is looking at RIGHT NOW, read by profile.js when a feedback
     ticket is opened. Set wherever a question is drawn; cleared on the home
     screen so a general comment is not mislabelled as being about a word. */
  var _fbCtx = null;
  function setFbCtx(mode, w) {
    _fbCtx = w ? { mode: mode || "", word: w.w || "", id: w.id || "" } : null;
  }
  window.WS_FEEDBACK_CTX = function () { return _fbCtx; };

  /* ---------- scoping ---------- */
  /* 复习范围 = the selected UNITS, narrowed by the 板块 filter. The filter is a
     stream-wide component-TYPE switch, not a per-unit one: with 4-6 units per
     level and up to 5 板块 each, per-unit toggles would put ~25 extra chips on
     the home page, and the owner's constraint was explicitly "not cluttered".
     A student thinking "just 核心 this week" is served by one row of chips. */
  function compIsOn(name) { return !store.compOff[name]; }
  /* ⚠️ 板块 DEFAULTS TO ALL ON, and「all off」is repaired to it at boot (owner
     2026-08-16). An empty compOff already means all-on, so this only ever fires for
     a profile that was left with every 板块 switched off — which the old 清空 did in
     one tap and then persisted to localStorage. That state is indistinguishable from
     a dead app: every mode refuses to start, and the 筛选 block that explains why is
     collapsed by default. Nobody chooses「study nothing」, so it is safe to read the
     stored value as damage rather than as intent.
     ⚠️ Runs AFTER COMP_LIST is built — streamComps() reads it, and before the data
     lands it would return [] and the guard would skip. Idempotent. */
  function repairComps() {
    var cs = streamComps();
    if (cs.length && !cs.some(compIsOn)) { store.compOff = {}; saveStore(); }
  }
  function pasteOn() { return !!(store.paste && store.paste.ids && store.paste.ids.length); }
  /* ⚠️ Filters WORDS rather than mapping the stored ids, so the result keeps the
     level · 单元 · 板块 order every consumer already assumes — 我的词语表 groups on
     exactly that, and a list in paste order would print its headings out of sequence.
     An id that no longer exists (the word list was re-cut between terms) simply drops
     out here; it is not an error and must not be one. */
  function pasteWords() {
    var want = {};
    store.paste.ids.forEach(function (id) { want[id] = 1; });
    return WORDS.filter(function (w) { return want[w.id]; });
  }
  function clearPaste() { if (store.paste) { store.paste = null; saveStore(); } }
  /* ⚠️ THE PASTED LIST IS THE SCOPE, AND THE 板块 FILTER DOES NOT APPLY TO IT
     (owner 2026-09-01). A teacher who writes down 30 words has already decided; 板块
     is a narrowing of the UNIT source, and letting it also cut a hand-written list
     would silently delete words the teacher put there — with the reason folded away
     inside the collapsed 筛选 block, which is §18g's trap exactly. The 来源 row and
     the summary line both say which source is in force, so this is never a guess. */
  function scopedWords() {
    if (pasteOn()) return pasteWords();
    return WORDS.filter(function (w) { return scope.has(unitKey(w)) && compIsOn(w.component); });
  }
  /* ⚠️ ONE SENTENCE, TWO SCREENS. The home card and 学习/闯关's 一行摘要 must be
     word-for-word identical (see renderPath) — two wordings for one fact is worse
     than not saying it. It was duplicated as a literal in both; now that the source
     can be a pasted list it has to be, so it is a function. */
  function scopeSumText() {
    var n = scopedWords().length;
    return pasteOn() ? "老师的清单 · 共 " + n + " 词"
                     : "已选 " + scope.size + " 个单元 · 共 " + n + " 词";
  }
  /* Why the scope is empty, in the student's terms. Both halves can be cleared now
     (owner 2026-08-16), so a single 「请先选择至少一个单元」 would send someone hunting
     through the unit list when what they actually did was switch every 板块 off. */
  function scopeEmptyMsg(where) {
    var lead = where ? "请先在「学习」页" : "请先";
    /* a pasted list can only be empty if every word in it has since left the stream's
       word list; the units and 板块 underneath are irrelevant and naming them would
       send the student hunting in the wrong place. */
    if (pasteOn()) return lead + "重新贴一次老师的清单，或者取消清单改回按单元选。";
    if (!scope.size) return lead + "选择至少一个单元。";
    if (!streamComps().some(compIsOn)) return lead + "打开至少一个板块（板块筛选目前全部关闭）。";
    return lead + "选择至少一个有词语的单元。";
  }
  /* component types present in THIS stream, in narrative order */
  var COMP_ORDER = ["生活空间", "核心", "巩固", "进阶", "文化站"];
  function streamComps() {
    var present = {};
    COMP_LIST.forEach(function (c) { present[c.component] = 1; });
    var out = COMP_ORDER.filter(function (c) { return present[c]; });
    Object.keys(present).forEach(function (c) { if (out.indexOf(c) === -1) out.push(c); });
    return out;
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
  /* ---------- 词形：谚语 / 成语 / 一般词语 ----------
     ⚠️ owner 2026-08-23：「proverbs/idioms distractors need to be from the same
     pool, otherwise it's too obvious」。原来的 distractorsFor 只看 词性，
     于是「只要功夫深，铁棒磨成针」的三个干扰项是 哀求 · 克服 · 诚实——
     **十一个字的那一个就是答案**，一眼看得出，学生根本不必读句子。
     这不是干扰项挑得不好，是这道题**没有在考词汇**。

     判形只看字面，不看板块：谚语常常和成语同住一个 文化站，而 板块 也不保证
     每一条都同形。带逗号的是谚语（两个分句），四字及以上的是成语一类的固定词组，
     其余是一般词语。 */
  function _formOf(w) {
    var t = String((w && w.w) || "");
    if (/[，,、；;]/.test(t)) return "saying";
    var n = 0, i;
    for (i = 0; i < t.length; i++) if (CJK_RE.test(t.charAt(i))) n++;
    return n >= 4 ? "idiom" : "word";
  }
  /* 谚语与成语互为「次选」：一条 11 字的谚语配四字成语并不完美，
     但比配一个两字词好得多，而谚语总量太少（每个源流 7–16 条），
     严格同形往往一个都凑不满。 */
  function _formOk(a, b) { return a === b || (a !== "word" && b !== "word"); }

  /* 干扰项。按「越像越先」分层取，取不满就降一层——任何一层都不许让题目开天窗。
     ⚠️ 谚语那一层必须能越过 复习范围：没有任何一个单元有 4 条以上谚语，
     只在范围内找就等于永远找不到，于是又退回两字词。干扰项不计分、不进任何
     掌握统计，越界只影响这一道题的选项长得像不像。 */
  function distractorsFor(target, pool, n) {
    var tf = _formOf(target);
    function usable(w) {
      return w.id !== target.id && w.w !== target.w && !_tooSimilar(target, w);
    }
    var wide = (tf === "word") ? [] : WORDS;   // 只有长词形才需要越过范围去找同形
    var tiers = [
      pool.filter(function (w) { return usable(w) && _formOf(w) === tf && w.pos === target.pos; }),
      pool.filter(function (w) { return usable(w) && _formOf(w) === tf; }),
      pool.filter(function (w) { return usable(w) && _formOk(_formOf(w), tf); }),
      wide.filter(function (w) { return usable(w) && _formOf(w) === tf; }),
      wide.filter(function (w) { return usable(w) && _formOk(_formOf(w), tf); }),
      pool.filter(function (w) { return usable(w) && w.pos === target.pos; }),
      pool.filter(usable)
    ];
    var picked = [], seen = {};
    for (var t = 0; t < tiers.length && picked.length < n; t++) {
      var bag = shuffle(tiers[t]);
      for (var i = 0; i < bag.length && picked.length < n; i++) {
        var c = bag[i];
        if (seen[c.id]) continue;
        seen[c.id] = 1;
        picked.push(c);
      }
    }
    return picked;
  }

  /* ---------- shell ---------- */
  function tbAvatarHtml() {
    var p = loadProfile();
    return (window.WSProfile && window.WSProfile.avatarImgHtml) ? window.WSProfile.avatarImgHtml(p && p.avatarId) : "👤";
  }
  /* ⚠️ attached ONCE for the page's life. setTopbar runs on every screen, so a
     listener added here per call would pile up one per navigation.
     ⚠️ passive:true — this only reads scrollY and flips a class; declaring it passive
     keeps it off the critical path of touch scrolling on the old iPads G1/G2 run on. */
  var _tbScrollHooked = 0;
  function hookTopbarScrim(sel) {
    if (_tbScrollHooked) return;
    _tbScrollHooked = 1;
    var apply = function () {
      var b = document.querySelector(sel);
      if (b) b.classList.toggle("scrolled", (window.pageYOffset || 0) > 6);
    };
    window.addEventListener("scroll", apply, { passive: true });
    apply();
  }
  function setTopbar(backTo, right) {
    showFab(true);          // timed games turn it off again right after
    _pyApply = null;        // each screen re-registers if it shows pinyin
    var tb = document.querySelector(".topbar");
    tb.innerHTML =
      '<button class="back" id="tbBack">‹</button>' +
      /* ⚠️ .tb-id is a PLAQUE, not a wrapper div (owner 2026-08-22). The bar has no
         panel any more, so this is the only thing keeping the stream's name legible
         over applyAmbience()'s photo — and the name staying visible was the owner's
         one condition for removing the bar. */
      /* ⚠️ 「词山学海 Vocab Summit ·」已从副标删掉（owner 2026-08-23:「we can remove
         词山学海 vocab summit but keep the G1/2/3/HCL label」）。平台名在每一块屏幕
         的同一个角落重复一次，而它是**学生唯一不需要被提醒的那件事**——他已经在里面了。
         留下的是 CPDD 的学段标签，那是这块名牌真正在回答的问题：我在哪一座山。
         ⚠️ 学段名现在有拼音与英文（owner 同批）。它们走 pyl()/enl() 的既有闸门，
         key 就是屏幕上那五个字（§10）。⚠️ HCL 两个辅助都不发（§10），所以高级华文的
         名牌只有中文名与 高级华文 两行——那是刻意的，不是漏了。 */
      '<div class="tb-id"><div class="tb-name">' + META.zh + '</div>' +
      pyl(META.zh) + enl(META.zh) +
      '<div class="tb-sub">' + META.sub + '</div></div>' +
      '<div class="tb-right"><span id="tbRightText">' + (right || "") + '</span>' +
        /* 中/EN 英文提示 toggle (G1/G2). Icon-only by design: findable without
           being able to read the interface it fixes. */
        enToggleHtml() +
        pyToggleHtml() +
        /* ⚠️ 查词 = the FIVE-STATION search, and it is now the ONLY search on a
           stream page (owner 2026-08-16). It sits in the topbar so it is in the
           same place on all five lands — a student who learns it at the pier finds
           it unchanged on a mountain. */
        '<button class="tb-en" id="tbFind" title="查词语" aria-label="查词语">' +
          '<span class="tb-en-ic">🔎</span><span class="tb-en-lab">查词</span></button>' +
        /* avatar + nickname in one pill: this is now the ONLY 我的档案 entry on a
           stream page (the duplicate chip under the stats bar was removed
           2026-08-13). Nickname hides under 520px so the topbar still fits. */
        '<button class="tb-profile" id="tbProfile" title="我的档案" aria-label="我的档案">' +
          '<span class="tb-av">' + tbAvatarHtml() + '</span>' +
          '<span class="tb-nick">' + esc((loadProfile() || {}).nickname || "我的档案") + '</span>' +
        '</button></div>';
    var fb = document.getElementById("tbFind");
    if (fb) fb.onclick = function () {
      /* hand it OUR speak — search.js ships no TTS stack of its own on purpose.
         ⚠️ `station` is what puts THIS stream's words at the top of the result list
         (2026-09-01). It is a display-order hint and nothing else: search stays
         read-only and still reaches all five stations, so passing it cannot widen
         what a student can reach. */
      if (window.WSSearch) window.WSSearch.open({ speak: speak, station: STREAM });
    };
    /* ⚠️ 三级返回（owner 2026-08-23）：海图 ← 首页 ← 门后的活动页 ← 一局。
       传字符串的老调用点一个都不用改——它们落到 backToHub()，那个函数在门外
       仍然回首页，在门里回那扇门。只有 renderPath 自己传函数（见那里的说明）。 */
    document.getElementById("tbBack").onclick = function () {
      if (backTo === "landing") { location.href = "index.html"; return; }
      if (typeof backTo === "function") return backTo();
      backToHub();
    };
    var pf = document.getElementById("tbProfile");
    if (pf) pf.onclick = openProfilePanel;
    wireEnToggle();
    wirePyToggle();
    hookTopbarScrim(".topbar");
  }

  /* 地景横幅 (handoff §3; art changed by the owner 2026-08-16 evening) — the
     emotional entry point of the page: the student sees WHERE THEY ARE before
     they see what to do.

     ⚠️ THE BANNER IS THE STREAM'S OWN MOUNTAIN, not a progression plate. It was
     ambiencePlate() (bg-01..05) for one day; the owner replaced it with
     art/mountain/mtn_{stream}.png so that the button showing「全山纵览」actually
     shows THAT student's mountain — the same art 我的词山 opens into, and the same
     island they picked on the sea map. bg-01..05 went back to the body in the
     same change (see applyAmbience), so nothing is on screen twice.
     ⚠️ Do NOT "unify" this back to ambiencePlate(): four streams sharing one
     banner is exactly the identity this change exists to restore.

     Layers: mountain → 营地 chip → overlay text. The overlay is never baked into art.
     ⚠️ The progress line is 段位/历练值 ONLY (handoff §4). The banner art carries
     no caption and no percentage, because it is identity, not a scale.
     ⚠️ The 灵露 PILL is the tap target for 营地, not any painted element — art
     positions shift with the plate, a pill does not (§3). */
  function streamMountainArt() {
    return "art/mountain/mtn_" + (STREAM || "g1") + ".png";
  }
  function heroBanner() {
    var rk = currentRank();
    var togo = rk.next
      ? '再 ' + fmtNum(rk.next.at - rk.total) + ' → ' + esc(rk.next.name)
      : '已达最高段位';
    /* ⚠️ .lscape IS A <div>, NOT A <button>. It has to be: the 结伴 pills sit on top
       of it (owner 2026-08-16 evening), and a <button> inside a <button> is invalid
       HTML — the parser hoists the inner one out and the layout silently breaks.
       That exact failure cost a debugging round on the pier the same day. So the
       whole-plate tap target is its own transparent overlay button (.lscape-hit),
       the caption is pointer-events:none, and each room pill is an independent
       sibling stacked above the hit layer. */
    return '<div class="lscape">' +
      '<img class="lscape-bg" src="' + streamMountainArt() + '" alt="" ' +
        'onerror="this.style.display=\'none\'">' +
      '<button class="lscape-hit" id="lscapeBtn" title="点开看全山纵览" ' +
        'aria-label="全山纵览"></button>' +
      '<span class="lscape-in">' +
        '<span class="lscape-rank">🎖️ ' + esc(rk.name) + '</span>' +
        '<span class="lscape-pts">' + fmtNum(rk.total) + ' 历练值 · ' + togo + '</span>' +
      '</span>' +
      '<span class="lscape-go">⛰️ 全山纵览 ›</span>' +
      /* 结伴登峰 / 同伴挑战 — occasional, social, and needing a teacher or a friend,
         so they live ON the mountain rather than in the solo funnel. ONE flex row,
         never two separately-positioned pills: they were absolutely positioned at
         the same coordinates once and sat exactly on top of each other. */
      '<div class="lscape-rooms">' +
        '<button class="lscape-room" id="arenaPill">🏔️ 结伴登峰</button>' +
        '<button class="lscape-room" id="pkPill">⚔️ 同伴挑战</button>' +
      '</div></div>' +
      /* ONE chip. A 海拔 chip lived here for one render and duplicated the 数据条
         directly below it — the 数据条 is where the four numbers belong (§1). */
      '<div class="lscape-acts">' +
        '<button class="lscape-chip" id="campChip">' + campLingluIcon() +
          ' <b>' + fmtNum(store.lingLu) + '</b> <span>灵露 · 营地 ›</span></button>' +
      '</div>';
  }
  /* ⚠️ 游戏卡片上的「历练值 / 灵露」小标记已移除（owner 2026-08-16）：几乎每个模式
     两样都给，于是每张卡都挂着同样的两枚药丸，只把卡片撑高、没有区分作用。选择的
     依据是玩法，不是奖励。要再加回来之前，先想清楚它能区分什么。
     下面这张表留作参考（读的是真正发奖的代码，不是卡片名字）：
       quiz     scoreCorrect(CLOZE_BASE | PTS_BASE.zhmcq/enmcq)  + awardLingLu
       flash    没有 scoreCorrect                                 + awardLingLu 0.5x
       rain     刻意不给历练值（它是灵露的游戏）                   + awardLingLu 2x
       sprint   PTS_BASE.sprint                                   + awardLingLu 1.25x
       assemble PTS_BASE.assemble                                 + awardLingLu 1.5x
       handle   6 + max(0, 12 - 已用行数)                          + awardLingLu 2x
       rooms    ctx.roomCorrect → 学习 的公式                      + awardLingLu   */

  /* ================= B层 · 对战徽章 (DESIGN_徽章体系_对战与排行榜.md §3/§6.5) ====
     Awarded for a PLACING in a live room, not for learning. Two families that
     never merge (doc §3, locked 2026-08-14): 结伴登峰 medals are the official
     teacher-hosted event, 同伴挑战 medals are the self-arranged one, so the
     counters stay separate and the 5-gold titles are named separately too
     (常胜擂主 / 凯旋号手) rather than sharing one badge.

     Storage deliberately REUSES store.badges + store.badgeLog: badges gives the
     cloud union for free, and badgeLog is already {first,last,n} merged as
     earliest-first / latest-last / max-n — exactly what a repeatable medal
     needs. Keys are prefixed "b·" so they can never collide with the A层 keys
     ("c·" 板块 / "u·" 单元 / "l·" 年级 / "t4"), and achBadgeCount() below
     excludes them so the home 徽章 N/M stat still counts A层 only.
     NOT in 进度码 (that is a mastery bitmask; a medal is not progress).

     ⚠️ These medals are cosmetic. A placing awards NO 历练值, NO 灵露 and NO
     海拔 beyond the mastery the room already confers — doc §0 proposes lifting
     that gate, but §7 says the room scoring formula still needs its own design
     round, so the gate stands until then. */
  var BATTLE_CHAMPION_AT = 5;                       // golds needed for the title
  var BATTLE_RANKS = ["gold", "silver", "bronze"];  // index = rank - 1 (DO NOT reorder)
  /* Display order is deliberately the REVERSE of the rank order: a wall reads
     left-to-right as a ladder you climb (铜 → 银 → 金 → 称号), so the capstone
     sits at the end. Kept separate from BATTLE_RANKS, whose index IS the rank. */
  var BATTLE_DISPLAY = ["bronze", "silver", "gold", "champion"];
  var BATTLE_TIER = {
    gold:   { zh: "金牌", icon: "🥇" },
    silver: { zh: "银牌", icon: "🥈" },
    bronze: { zh: "铜牌", icon: "🥉" },
    champion: { zh: "称号", icon: "🏆" }
  };
  var BATTLE_FAMILY = {
    room: { zh: "结伴登峰", champion: "常胜擂主",
            blurb: "老师主持的全班现场对战。",
            champBlurb: "结伴登峰金牌集满 " + BATTLE_CHAMPION_AT + " 面，战鼓外圈缠上牡丹纹。" },
    peer: { zh: "同伴挑战", champion: "凯旋号手",
            blurb: "同学之间自己约的房间。",
            champBlurb: "同伴挑战金牌集满 " + BATTLE_CHAMPION_AT + " 面，号角外圈缠上牡丹纹。" }
  };
  function battleKey(family, tier) { return "b·" + family + "·" + tier; }
  function isBattleKey(k) { return k.indexOf("b·") === 0; }
  function battleImg(family, tier) { return "art/badge/badge_battle_" + family + "_" + tier + ".png"; }
  function battleName(family, tier) {
    var f = BATTLE_FAMILY[family]; if (!f) return "";
    return tier === "champion" ? f.champion : f.zh + "·" + BATTLE_TIER[tier].zh;
  }
  /* how many times this medal has been won; 0 when never earned */
  function battleCount(family, tier) {
    var k = battleKey(family, tier);
    if (!store.badges[k]) return 0;
    var log = store.badgeLog[k];
    return (log && log.n) || 1;
  }
  /* Compact 对战徽章 counts for publication (see firebase-init saveScore). Only
     counts travel — never dates, never anything about which words a student
     knows. Read back by openPlayerBadges when a classmate taps a name. */
  var BATTLE_PUB = { room: "r", peer: "p" }, BATTLE_PUB_T = { gold: "g", silver: "s", bronze: "b", champion: "c" };
  function battleSummary() {
    var out = {};
    Object.keys(BATTLE_PUB).forEach(function (fam) {
      Object.keys(BATTLE_PUB_T).forEach(function (tier) {
        var n = battleCount(fam, tier);
        if (n) out[BATTLE_PUB[fam] + BATTLE_PUB_T[tier]] = n;
      });
    });
    return out;
  }
  /* A层 badge count only — battle keys live in the same map but are not part of
     the 板块/单元/年级/词王 ladder the home stat measures. */
  function achBadgeCount() {
    return Object.keys(store.badges).filter(function (k) { return !isBattleKey(k); }).length;
  }
  /* Called by arena.js through ctx.awardBattle when a room ends and the student
     placed 1st-3rd. Returns what was won so the ROOM can show it in its own
     result card — deliberately not a cel-overlay, which sits at z-index 300 and
     would paint straight over the arena board the student is reading. */
  function awardBattleMedal(family, rank) {
    var fam = BATTLE_FAMILY[family], tier = BATTLE_RANKS[rank - 1];
    if (!fam || !tier) return null;
    var key = battleKey(family, tier), d = todaySG(), log = store.badgeLog[key];
    if (!store.badges[key]) store.badges[key] = 1;
    if (!log) log = store.badgeLog[key] = { first: d, last: d, n: 1 };
    else { log.n = (log.n || 1) + 1; log.last = d; }
    var out = { family: family, tier: tier, key: key, n: log.n,
                name: battleName(family, tier), img: battleImg(family, tier),
                icon: BATTLE_TIER[tier].icon, champion: null };
    /* 连胜称号: counted within THIS family only, and permanent once reached —
       a later loss never takes it back (doc §3). */
    if (tier === "gold" && log.n >= BATTLE_CHAMPION_AT && !store.badges[battleKey(family, "champion")]) {
      var ck = battleKey(family, "champion");
      store.badges[ck] = 1;
      store.badgeLog[ck] = { first: d, last: d, n: 1 };
      out.champion = { key: ck, name: fam.champion, img: battleImg(family, "champion") };
    }
    saveStore();
    sfxBadge();
    return out;
  }

  /* ================= 房间模式计分 (owner 2026-08-14) ==========================
     ⚠️ THIS REVERSES the 2026-08-12 D-2 rule ("arena code must NEVER call
     scoreCorrect/bankPts"). Owner decision, taken to motivate engagement:
     结伴登峰 and 同伴挑战 now earn 历练值 and 灵露 exactly like 学习 modes.
     DESIGN_徽章体系 §0 asked for this; §7 left the formula open, so the call
     below reuses the SOLO formula rather than inventing a room-only one —
     see the CLAUDE.md section for what that implies and what to watch.

     Rooms are still NOT a shortcut: the same per-word 灵露 decay curve and the
     same per-day repeat cap apply, so grinding rooms on known words pays the
     same 10% floor it pays anywhere else. */
  var ROOM_PTS_BASE = {
    zhmcq: PTS_BASE.zhmcq, enmcq: PTS_BASE.enmcq, sprint: PTS_BASE.sprint,
    rain: 0            // 词雨 earns 0 历练值 in solo play too — keep it consistent
  };
  var _txtIndex = null;
  function wordByText(t) {
    if (!_txtIndex) { _txtIndex = {}; WORDS.forEach(function (w) { if (!_txtIndex[w.w]) _txtIndex[w.w] = w; }); }
    return (t && _txtIndex[t]) || null;
  }
  /* One correct answer inside a room. Called by arena.js through ctx.roomCorrect.
     `entering` is the 连对 count BEFORE this question, matching scoreCorrect's
     contract. `tier` is the host's cloze difficulty (2/3/4/type).

     The word is re-resolved by TEXT against OUR list first: a cross-stream room
     serves the HOST's word objects, whose ids mean nothing here, and scoring a
     foreign id would read wasMastered as false forever and quietly hand out
     first-time points for a word the student already knows. */
  function roomCorrect(rw, mode, entering, tier) {
    sfxOk();                                   // always, even if scoring is skipped
    var w = wordByText(rw && rw.w) || rw;
    if (!w || !w.id) return null;
    var base = (mode === "cloze") ? (CLOZE_BASE[tier] || 3) : (ROOM_PTS_BASE[mode] || 0);
    var wasMastered = !!store.mastered[w.id];
    var pts = scoreCorrect(w, base, 1, entering || 0, wasMastered);
    var ll = awardLingLu(w, mode);             // before any gymNote, per the 灵露 rule
    gymNote(w.id);
    saveStore();
    return { pts: pts, ll: ll };
  }

  /* Shared by 结伴登峰 and 同伴挑战: a correct answer in a room marks the word
     mastered (海拔). Since 2026-08-14 rooms also earn 历练值/灵露 per answer
     (roomCorrect above); the +10 首次掌握 bonus is banked here, at the moment
     海拔 actually rises, exactly as markMastered does it in solo play.
     ids are validated against OUR word list before use, because 海拔 is
     Object.keys(store.mastered).length and a foreign id from a cross-stream host
     would silently inflate this student's altitude with a word that does not
     exist in their stream. texts are the cross-stream join key (ids are
     stream-scoped by design, same rule the mastery-carryover design uses). */
  function conferMasteryFromRoom(ids, texts) {
    var changed = false, added = 0, mine = {}, valid = {}, want = {};
    WORDS.forEach(function (w) { valid[w.id] = 1; });
    (ids || []).forEach(function (id) { if (valid[id]) mine[id] = 1; });
    if (texts && texts.length) {
      texts.forEach(function (t) { want[t] = 1; });
      WORDS.forEach(function (w) { if (want[w.w]) mine[w.id] = 1; });
    }
    ensureIdIndex();
    Object.keys(mine).forEach(function (id) {
      if (!store.mastered[id]) {
        store.mastered[id] = 1; changed = true; added++;
        /* +10 首次掌握, the moment 海拔 rises — same as markMastered. Guarded
           once-per-word, so a room can never double-pay a word the student
           already mastered in 学习. */
        var w = WORDS[_idIndex[id]];
        if (w) awardMasteryBonus(w);
      }
    });
    if (changed) { saveStore(); checkBadges(true); applyAmbience(); }
    /* ⚠️ 返回**新增**的词数，不是答对的词数：arena 的结果页印的就是这个数字，
       而早就掌握过的词答对多少次海拔都不动（上面的 if 守卫）。印 correctIds.length
       会给出一个学生在 我的词山 上核对不到的数。码头的 conferMastery 一直是这么返回的。 */
    return added;
  }
  /* open the 结伴登峰 live room (arena.js). 答对的词照常发 历练值 + 灵露（roomCorrect），
     并在结束时计入「已掌握」（conferMasteryFromRoom）——§12，2026-08-14 起。 */
  function openArena() {
    if (!window.WSArena || !window.WSArena.open) { alert("结伴登峰暂不可用，请刷新页面后再试。"); return; }
    window.WSArena.open(arenaCtx());
  }

  /* ================= 同伴挑战 (DESIGN_peer_pk_duel.md) =================
     ⚠️ Student-facing name is 同伴挑战 ONLY. The 「· PK对决」 suffix was removed
     2026-08-16 (owner); the design doc's own name is not the shipped one.
     Student-hosted sibling of 结伴登峰. The host PLAYS like everyone else (§2),
     so cs.js only owns the setup screen — arena.js owns the room itself.
     Owner decisions 2026-08-14:
       · win condition = fixed time, most correct (ties broken by time answering)
       · word pool     = the host picks it for everyone, using the SAME 复习范围
                         they use for their own revision
       · late joiners  = no. Reconnection of an existing player only.
       · who can play  = anyone with the code — any 身份 (学生/老师/家长/公众) and
                         ANY stream. A form class holds mixed subject levels and
                         the owner wants them playing together; it may also become
                         a family game.
     ⚠️ THIS PARAGRAPH USED TO SAY「a PK round awards NO 历练值 / 灵露」. THAT IS STALE —
     the owner reversed it on 2026-08-14 (§12), and roomCorrect() below has been awarding
     both for PK and 结伴登峰 alike ever since; the block comment under roomCorrect says
     so in as many words. What stops PK being a shortcut is not a zero payout, it is that
     the SAME per-word 灵露 decay and per-day 历练值 cap apply inside a room as outside. */
  var PK_MODES = [
    { k: "cloze", label: "✍️ 填空挑战" },
    { k: "zhmcq", label: "🔎 华文解释" },
    { k: "enmcq", label: "🌐 英文翻译" }
  ];
  var PK_DUR_SECS = [180, 300, 480];
  function pkDurFmt(n) { return (n / 60) + " 分钟"; }
  function secFmt(n) { return n + " 秒"; }
  function arenaCtx() {
    return {
      stream: STREAM,
      words: WORDS,
      profile: loadProfile() || {},
      getUid: function (cb) { if (window.WSCloud && window.WSCloud.getUid) window.WSCloud.getUid(cb); else cb(null); },
      conferMastery: conferMasteryFromRoom,
      awardBattle: awardBattleMedal,
      roomCorrect: roomCorrect,
      /* arena has no audio of its own (it is deliberately isolated), so the
         shared sfx pair is handed over the same way everything else is */
      sfx: function (kind) { if (kind === "bad") sfxBad(); else sfxOk(); }
    };
  }
  function renderPkConfig() {
    if (!window.WSArena || !window.WSArena.host) { alert("同伴挑战暂不可用，请刷新页面后再试。"); return; }
    setTopbar("home", "");
    var pool = scopedWords();
    var mode = store.pkMode || "cloze", dur = store.pkDur || 300;
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">⚔️ 同伴挑战' + pyl("同伴挑战") + enli("同伴挑战") + '</div>' +
      '<div class="mode-desc">' + mdLine("和朋友比一比：同一套题，限时内谁答对得多谁赢。") +
        mdLine("答对的词照样计入「已掌握」，也照常累积历练值和灵露。") +
        mdLine("2 至 8 人。开局后不能中途加入，掉线的人可以用房间号回来。") + '</div>' +
      '<div class="pk-scope"><span class="rb-item">出题范围：<b>' + pool.length + '</b> 词' +
      pyl("出题范围") + enl("出题范围") + '</span>' +
      '<span class="pk-scope-note">' + mdLine("用你在「学习」页选的复习范围，和自己复习时一样。要改就回上一页选单元。") + '</span></div>' +
      '<div class="diff-label">' + stepNo(1) + '题型' + pyl("题型") + enl("题型") + '</div><div class="diff" id="pkMode">' +
      PK_MODES.map(function (m) {
        return '<button class="dopt' + (m.k === mode ? " on" : "") + '" data-m="' + m.k +
          '"><span>' + m.label + labGloss(m.label) + '</span></button>';
      }).join("") + '</div>' +
      '<div class="diff-label">' + stepNo(2) + '时长' + pyl("时长") + enl("时长") + '</div>' +
      qtySlider("pkDur", PK_DUR_SECS, dur, pkDurFmt) +
      '<div class="nav-row" style="flex-wrap:wrap">' +
      '<button class="nav-btn" id="pkBack">‹ 返回</button>' +
      '<button class="nav-btn" id="pkJoin">加入朋友的房间</button>' +
      '<button class="nav-btn primary" id="pkHost">开一个房间 ›</button></div></div>';
    Array.prototype.forEach.call(view().querySelectorAll("#pkMode .dopt"), function (b) {
      b.onclick = function () { store.pkMode = b.getAttribute("data-m"); saveStore(); renderPkConfig(); };
    });
    wireQtySlider("pkDur", PK_DUR_SECS, pkDurFmt, function (n) { store.pkDur = n; saveStore(); });
    document.getElementById("pkBack").onclick = renderHome;
    document.getElementById("pkJoin").onclick = function () { window.WSArena.open(arenaCtx()); };
    document.getElementById("pkHost").onclick = function () {
      var words = scopedWords();
      /* cloze rooms must only serve words that actually have a blank — the same
         filter the teacher console applies, for the same reason: 填空挑战 never
         shows a question without a valid __ . */
      if (store.pkMode === "cloze") {
        words = words.filter(function (w) { return w.cloze && w.cloze.indexOf("__") !== -1; });
      }
      if (words.length < 4) {
        alert("所选范围可用的词太少（这个题型至少需要 4 个）。请回「学习」页多选几个单元。");
        return;
      }
      var ids = shuffle(words.slice()).slice(0, 40).map(function (w) { return w.id; });
      window.WSArena.host(arenaCtx(), {
        mode: store.pkMode || "cloze", tier: store.diff === "type" ? "3" : (store.diff || "3"),
        wordIds: ids, limitBy: "time", durationS: store.pkDur || 300
      });
    };
  }

  /* ---------- ② 的两扇门，与门后的那一页 (owner 2026-08-23) ----------
     海图 ← 首页 ← 门后的活动页 ← 玩法设定 ← 一局。码头从 2026-08-16 起就是三级
     （§18k），山上这一层是新的第三级。
     ⚠️ `_path` 记的是「现在人在哪扇门里」，不是「上次选了哪扇」——后者是
     store.homeTab。返回去处由它决定：从活动页走进去的每一块屏幕（设定页、一局、
     结算页）都回到那扇门；从首页右栏走进去的每一块（成就墙、风云榜、我的词语表、
     营地、我的词山）_path 是 null，照旧回首页。renderHome() 把它清零，
     所以「从右栏进来的东西」不必自己记得清。 */
  var _path = null;
  function pathZh(k) { return k === "play" ? "闯关" : "学习"; }
  function backToHub() { if (_path) renderPath(_path); else renderHome(); }
  /* ⚠️ 返回键永远说出你会落到哪里（§18h）。在门后面时它落在那扇门的活动页上，
     所以写的是那扇门的名字；不在门里时（房间、词山那几条路）才是 营地。
     ⚠️ 名字加「」不是装饰：学习 与 闯关 单看是动词，「回到学习」会被读成一句话；
     加了角括号它就是一个专名，而 §7 规定代码内嵌引号一律用「」。 */
  function hubLabelHtml(short) {
    if (!_path) {
      return short ? "回营地" + pyl("回营地") + enli("回营地")
                   : "回到营地" + pyl("回到营地") + enli("回到营地");
    }
    var k = "回到「" + pathZh(_path) + "」";
    return k + pyl(k) + enli(k);
  }
  /* 门本身。⚠️ 没有 `.on`，有 `›`：这两件事一起说的是「按下去会去到别处」，
     而那正是旧的 .htab 说不出口的话。 */
  function doorHtml(k) {
    var play = k === "play", zh = pathZh(k);
    return '<button class="hdoor" data-path="' + k + '">' +
      '<span class="hd-ic">' + (play ? "🎮" : "📖") + '</span>' +
      '<span class="hd-t"><b>' + zh + '</b>' + pyl(zh) + enl(zh) + '</span>' +
      '<span class="hd-go">›</span></button>';
  }
  /* desc is accepted but no longer rendered (owner 2026-08-14: strip the small
     print under every title on the home page). Kept in the signature and in the
     call sites so the one-line summary of each mode is still recorded next to
     the mode it describes — the config screen each card opens shows its own
     mode-desc, which is where a student actually needs the explanation. */
  function camp(mode, icon, name, desc) {
    return '<button class="camp" data-mode="' + mode + '" title="' + esc(desc) + '">' +
      '<span class="flag">' + icon + '</span>' +
      '<div><b>' + name + pyl(name) + enli(name) + '</b></div></button>';
  }
  function pathTilesHtml(k) {
    if (k === "play") {
      return '<div class="camps">' +
        camp("rain", "🌧️", "词雨灵露", "词语化作灵雨落下，趁它落地前打出，收进宝缸得灵露") +
        camp("sprint", "⛰️", "攀山快答", "90 秒登山冲刺 · 答对就攀升") +
        camp("assemble", "🧩", "组字成词", "看释义点字，拼出词语") +
        ((STREAM === "g3" || STREAM === "hcl") ? camp("handle", "🀄", "词语汉兜", "四字词语猜猜看 · 十二次机会") : "") + '</div>';
    }
    /* §2.1: the three answer-a-question modes (填空/华文/英文) live behind ONE
       「学习挑战」 entry; their题型/题数/难度 settings open with it instead of
       being spread across the home page. 词语闪卡 keeps its own card — different
       interaction (看词认义/点读), not a question-answering mode. */
    /* ⚠️ 词语闪卡 COMES FIRST (owner 2026-08-16 深夜: 「learn then test」). Reading
       left to right, the card that TEACHES has to precede the one that TESTS —
       a student who has not met the words yet should not have to skip past a
       quiz to find the flashcards. Same order the pier already uses in ③. */
    return '<div class="camps">' +
      camp("flash", "📖", "词语闪卡", "看词认义，点读发音") +
      camp("quiz", "✍️", "学习挑战", "填空 · 华文解释 · 英文翻译，题型和难度可选") + '</div>';
  }
  function wirePathTiles() {
    Array.prototype.forEach.call(view().querySelectorAll(".camp[data-mode]"), function (btn) {
      btn.onclick = function () {
        if (!scopedWords().length) { alert(scopeEmptyMsg(false)); return; }
        var mode = btn.getAttribute("data-mode");
        if (mode === "quiz") return renderQuizConfig();       // §2.1: 题型/题数/难度 live in here
        if (mode === "flash") return renderWordList("all");   // flashcards open the list-menu first
        if (mode === "rain") return renderRainConfig();
        if (mode === "sprint") return renderSprintConfig();
        if (mode === "assemble") return startAssemble();
        if (mode === "handle") return startHandle();
        startMode(mode);
      };
    });
  }
  /* 门后面的那一页。⚠️ 一屏一个决定：选哪个活动。所以这里**没有动线编号**
     （§7：编号只给真正多步的流程，而每个画面从 ① 重新开始——这一页只有一步）。
     ⚠️ 底图不换：ambience 画在 <body> 上，所以「背景延续」是免费的，
     这一页只是把首页的内容换掉。 */
  function renderPath(kind) {
    _path = kind === "play" ? "play" : "study";
    if (store.homeTab !== _path) { store.homeTab = _path; saveStore(); }
    setFbCtx(null, null);
    /* ⚠️ 这里必须传一个函数，不能传 "home"：那条路会走 backToHub()，
       而 _path 刚刚被设上，返回键就会把这一页重画一遍——一颗按不动的返回键。 */
    setTopbar(renderHome, "");
    var play = _path === "play", zh = pathZh(_path);
    var n = scopedWords().length;
    /* ⚠️ 范围要跟着进来（owner 2026-08-23 选的「一行摘要 + 改范围 ›」）：
       ①复习范围 留在首页，但**这一页仍然要说出正在练哪些词**——否则某个玩法
       因为范围太窄而开不了时，原因在上一页，学生看不到。文案与首页那一行
       逐字相同（updateScopeSum），两处说法不一致比不说更糟。 */
    var html = '<div class="path-wrap"><div class="path-head">' +
      '<span class="path-ic">' + (play ? "🎮" : "📖") + '</span>' +
      '<span class="path-t"><b>' + zh + '</b>' + pyl(zh) + enl(zh) + '</span>' +
      '<button class="path-scope" id="pathScope">' +
        '<span class="ps-sum' + (n ? "" : " zero") + '">' + esc(scopeSumText()) + '</span>' +
        '<span class="ps-go">改范围 ›' + pyl("改范围") + enli("改范围") + '</span></button>' +
      '</div>' +
      '<div class="section-label">' +
        (play ? '词语游乐场' + pyl("词语游乐场") + enl("词语游乐场")
              : '今日路线 · 选择你的营地' + pyl("今日路线 · 选择你的营地") + enl("今日路线 · 选择你的营地")) +
      '</div>' + pathTilesHtml(_path) + '</div>';
    view().innerHTML = html;
    document.getElementById("pathScope").onclick = renderHome;
    wirePathTiles();
  }

  /* ---------- home ---------- */
  /* ---------- home ---------- */
  function renderHome() {
    _path = null;              // the funnel starts over; ② is two doors, not a toggle
    setFbCtx(null, null);      // a report from home is general, not about a word
    setTopbar("landing", "");
    var t = totals();
    var mastered = Object.keys(store.mastered).length;
    var badgeCount = achBadgeCount();   // A层 only — 对战徽章 share the map but not this ladder
    var badgeTotal = COMP_LIST.length + UNIT_LIST.length + LEVELS.length + 1;

    /* ⚠️ 左 = 我要做什么（动线，带编号）· 右 = 我走到哪了（身份与进度，不带编号）
       (handoff §0). Numbers mark DECISIONS; the right column contains none, so it
       carries no step numbers and the funnel stays at four steps — which is what
       keeps 动线编号 usable for G1/G2. The hero card is gone: its rank chip moved
       into the banner overlay, its 结伴/同伴 pills into ④, and its 我的词山 link is
       now the banner itself. */
    var html = '<div class="home-grid"><div class="home-left">';

    /* ⚠️ THE IN-STREAM SEARCH CARD IS GONE (owner 2026-08-16). One search, in the
       topbar, identical on all five lands. Known trade-off, accepted: that box
       showed 释义 and 年级·单元 for the current stream, which the五站 index cannot —
       it deliberately carries only 词/拼音/英文/所属站 so it stays 178KB and
       lazy-loads on school wifi. If per-stream 释义 is wanted back, it belongs in
       我的词语表, which already has the full word objects. */

    html += '<div class="section-label">' + stepNo(1) + '复习范围 · 可多选' + pyl("复习范围 · 可多选") + enl("复习范围 · 可多选") + '</div>' +
      '<div class="card" id="scopeCard">' +
      /* ⚠️ ONE 全选/清空 pair for the whole card, and it now SHARES the summary row,
         pinned right (owner 2026-08-16 evening). It briefly had a second pair inline
         in the 板块 row, which put two identical-looking pairs a few pixels apart with
         no way to tell which was which; then it had a row of its own, which cost a
         whole line of height inside a fixed-height box. One row: 已选 N 个单元 on the
         left, the pair on the right.
         This pair covers BOTH halves of the scope — units AND 板块 — so「全选」really
         does mean everything and「清空」really does mean nothing. The individual 板块
         chips are still toggles, so a 板块-only change is one tap. */
      /* ⚠️ SAYS WHAT THE UNIT CHIPS BELOW WILL DO BEFORE THEY ARE TAPPED. With a
         pasted list in force those chips no longer decide anything, and a control that
         silently stops working is the trap this repo keeps re-learning (§18g). Rather
         than disable them — a disabled chip shows no tooltip on a touch screen and
         explains nothing — tapping one switches the source back, and this line says so
         in advance. */
      (pasteOn() ? '<div class="scope-paste">' +
        '<span class="scope-paste-t">正在用<b>老师的清单</b>。点下面任何一个单元，就换回按单元选。</span>' +
        '<button class="scope-paste-x" id="pasteDropHome">取消清单</button></div>' : "") +
      '<div class="scope-top">' +
      '<div class="scope-sum" id="scopeSum"></div>' +
      '<div class="scope-acts">' +
      '<button class="unit" id="selAll">全选' + pyl("全选") + enli("全选") + '</button>' +
      '<button class="unit" id="selNone">清空' + pyl("清空") + enli("清空") + '</button></div></div>' +
      /* §2: 我的词语表 belongs with ①复习范围 — both answer「哪些词」— not with the
         badges and the leaderboard, which are trophies.
         ⚠️ The handoff also asks for selecting it to SWAP the active scope to that
         list. NOT built, deliberately: 我的词语表 already has its own filters
         (全部 / 已掌握 / 待巩固 / 未掌握), so「that list」is four different lists and
         the doc's own §2 open sub-item says to flag rather than invent the second
         level. So this row states the current source plainly and opens the list;
         it does not pretend to be a toggle it cannot honour. */
      "";
    /* ⚠️ 来源 + 板块 live behind ONE fold (owner 2026-08-16 late). Both narrow an
       existing selection rather than making it, both are set once and forgotten, and
       together they were the tallest thing in a card that is a fixed-height scroll
       box — so the units, which are what ① is actually for, started below the fold.
       The closed state still STATES what is in force (来源 and how many 板块 are on),
       so folding hides the controls, never the facts. */
    var comps = streamComps();
    var compsOn = comps.filter(compIsOn).length;
    /* ⚠️ THE CLOSED STATE STILL STATES WHAT IS IN FORCE, and「what is in force」now
       has two possible answers. With a pasted list active the 板块 count is dropped
       from this line rather than shown as a lie: 板块 does not narrow a pasted list
       (see scopedWords), so printing「板块 3/4」beside it would describe a filter that
       is not running. */
    var srcOn = pasteOn() ? "老师的清单" : "单元";
    html += '<button class="scope-filt-t' + (store.filtOpen ? " open" : "") + '" id="filtT">' +
      '<span class="scope-filt-lab">筛选' + pyl("筛选") + enli("筛选") + '</span>' +
      '<span class="scope-filt-sum">' + esc(srcOn) +
        (!pasteOn() && comps.length > 1 ? ' · 板块 ' + compsOn + "/" + comps.length : "") + '</span>' +
      '<span class="scope-caret">' + (store.filtOpen ? "▾" : "▸") + "</span></button>" +
      '<div class="scope-filt' + (store.filtOpen ? "" : " closed") + '">' +
      '<div class="scope-src"><span class="scope-src-lab">来源' + pyl("来源") + enli("来源") + '</span>' +
      '<span class="scope-src-on">' + esc(srcOn) + pyl(srcOn) + enli(srcOn) + '</span>' +
      '<button class="scope-src-btn" id="pasteEntry">📥 贴入老师的清单' +
        pyl("贴入老师的清单") + enli("贴入老师的清单") + ' ›</button>' +
      '<button class="scope-src-btn" id="wlEntry">📋 我的词语表' + pyl("我的词语表") + enli("我的词语表") + ' ›</button></div>';
    /* ⚠️ 板块 IS NOT RENDERED UNDER A PASTED LIST, and a line says why (2026-09-01).
       It does not narrow one — scopedWords() returns the teacher's words whole — so
       leaving the chips on screen would leave five controls that look live and do
       nothing, which is the same silent-dead-control trap §18g keeps re-teaching.
       ⚠️ The FACT is still stated, only the controls are gone: this repo's rule for
       the 筛选 fold is「folding hides the controls, never the facts」, and it applies
       just as much when the controls are withdrawn for a different reason. */
    if (pasteOn() && comps.length > 1) {
      html += '<div class="scope-src"><span class="scope-src-lab">板块' +
        pyl("板块") + enli("板块") + '</span>' +
        '<span class="wl-hint">用老师的清单时，板块不起作用——清单里有什么词就练什么词。</span></div>';
    }
    if (!pasteOn() && comps.length > 1) {
      /* ⚠️ FOUR 板块 GO 2x2 (owner 2026-08-16 late). auto-fill packs by width, so at
         three-to-a-row G2/G3's four came out 3 + 1 and the last chip sat alone on
         its own line. The count is per stream and fixed (G1 3 · G2/G3 4 · HCL 5), so
         it is emitted as a class rather than sniffed with `:has()` — the students on
         G1/G2 are the ones with the old iPads, and `:has()` is exactly the kind of
         recent selector those miss. 3 and 5 keep the packing rule: 3 fills a row,
         5 falls 3 + 2, and neither ends on an orphan. */
      html += '<div class="comp-row' + (comps.length === 4 ? " n4" : "") +
        '" id="compRow"><span class="comp-lab">板块' + pyl("板块") + enli("板块") + '</span>' +
        comps.map(function (c) {
          /* the five 板块 names are a fixed, navigational set (they filter the
             scope), so they gloss like any other chip. A stream that ever ships
             a new 板块 simply gets no gloss until a line is added.
             ⚠️ 徽章美术 + 小字，不再是纯文字药丸（owner 2026-08-16 晚）：这五个板块
             在 成就墙 和首页徽章条上本来就各有一枚徽章，学生认得的是那张图，而这一排
             却只写字，同一件东西在站内有两种长相。用的是同一份 `BADGE_IMG`，
             没有新美术。关掉的板块走灰度锁，和 成就墙 的「未得」是同一套视觉语言。
             ⚠️ 英文用 `enl()`（成块）不是 `enli()`（同行）：现在是竖排小卡，
             同行英文会把每张卡撑成不同宽度。 */
          return '<button class="comp-chip' + (compIsOn(c) ? " on" : "") + '" data-comp="' + esc(c) + '">' +
            '<img class="comp-chip-img" src="' + (BADGE_IMG[c] || "art/badge/badge_hx.png") + '" alt="">' +
            '<span class="comp-chip-lab">' + esc(c) + pyl(c) + enl(c) + '</span></button>';
        }).join("") + '</div>';
    }
    html += '</div>';        // close .scope-filt
    var byLevel = {};
    UNIT_LIST.forEach(function (u) { (byLevel[u.level] = byLevel[u.level] || []).push(u); });
    /* EXCLUSIVE accordion (owner 2026-08-14): at most one level's units on screen.
       Default is ALL folded — a first-time student sees four short rows, not one
       level dumped open — and the last-opened level is remembered thereafter.
       Selection is unaffected by folding, so units can still be picked across
       years; only VISIBILITY is one-at-a-time. */
    Object.keys(byLevel).forEach(function (lv) {
      var open = store.accLevel === lv;
      html += '<button class="scope-acc' + (open ? " open" : "") + '" data-lv="' + esc(lv) + '">' +
        esc(lv) + '<span class="cnt" data-cnt="' + esc(lv) + '"></span><span class="chev">›</span></button>' +
        '<div class="units' + (open ? "" : " collapsed") + '" data-lvbody="' + esc(lv) + '">';
      /* ⚠️ 没有 per-level 全选本级/清空本级（owner 2026-08-16 evening）。它们存在过
         一天：每展开一级就多出一行虚线按钮，而一级只有 5-6 个单元，逐个点并不慢。
         卡片顶部那一对已经覆盖「全部」与「全无」。不要再加回来。 */
      byLevel[lv].forEach(function (u) {
        var on = scope.has(u.key) ? " on" : "";
        html += '<button class="unit' + on + '" data-k="' + esc(u.key) + '"><b>' + esc(u.unit) + '</b>' +
          (u.theme ? '<span class="unit-theme">' + esc(u.theme) + '</span>' : '') +
          '<span class="unit-n">' + u.count + '词</span></button>';
      });
      html += '</div>';
    });
    html += '</div>';

    /* ⚠️ ② 是两扇门，不再是切换（owner 2026-08-23）。旧版里它们是一对
       aria-less 的标签页：点 闯关 会把 **下面那一排** 换成游戏卡，而那一排在
       笔电上就在折线以下、在手机上更远。学生按下去、画面看起来没变，于是以为
       自己点错了（owner：「they expect to click and be directed to choose game mode,
       but the game mode is the section below and they miss it」）。
       ⚠️ **门后面只有活动卡，永远不能是一页滑杆。** 码头 2026-08-16 把 ② 做成
       导航只活了一天就被推翻（§18m），原因是那个配置页同时背「做什么」与
       「多难」：零起点学生两下点击之后第一眼看到的是一排滑杆。这一版没有重蹈
       那一步：门后面就是原来 ③ 的那几张卡，难度与题数仍然在卡再往里一层。
       ⚠️ 两扇门**没有选中态**（没有 `.on`）：一颗看起来被选中的按钮正是它被读成
       切换的原因。store.homeTab 仍然记得上一次进的是哪扇，但那只用来制定返回去处，
       不画在门上。 */
    html += '<div class="section-label">' + stepNo(2) + '选择学习方式' + pyl("选择学习方式") + enl("选择学习方式") + '</div>' +
      '<div class="hdoors">' + doorHtml("study") + doorHtml("play") + '</div>';


    /* ⚠️ ④ 结伴 IS GONE FROM THE FUNNEL (owner 2026-08-16 evening:「the room modes
       are very cluttered here … those won't be the regular features that students
       do on their own」). The two live-room entries are back as PILLS ON THE
       BANNER — see heroBanner(). handoff §1 had moved them into the funnel as「a
       fourth way to practise」; in use they read as clutter, because a room needs
       a teacher or a friend and is not something a student starts alone on a
       Tuesday night. The funnel is now exactly the three solo steps ①②③.
       ⚠️ Do not re-add a ④ here without moving them off the banner first. */

    /* ---- RIGHT COLUMN: identity & progress, no step numbers ---- */
    html += '</div><div class="home-right">';
    html += heroBanner();

    /* 成就徽章 · 词山风云榜. 我的词语表 LEFT this row on 2026-08-16 (handoff §2):
       it answers「哪些词」, the same question as ①复习范围, so filing it beside
       badges and leaderboards mis-signalled it as a trophy. It now sits in ①. */
    /* §1 right-column order: 地景横幅 → 数据条 → 入口行 */
    html += '<div class="harbour">' +
      '<div id="masteryInfo" style="cursor:pointer"><b>' + mastered + '</b><span>已掌握词语 ⓘ' + pyl("已掌握词语") + enli("已掌握词语") + '</span></div>' +
      '<div><b>' + fmtNum(store.pts.total) + '</b><span>历练值' + pyl("历练值") + enli("历练值") + '</span></div>' +
      '<div><b>' + (t.a ? Math.round(100 * t.c / t.a) + "%" : "–") + '</b><span>正确率' + pyl("正确率") + enli("正确率") + '</span></div>' +
      '<div><b>🔥 ' + store.bestStreak + '</b><span>最高连对' + pyl("最高连对") + enli("最高连对") + '</span></div></div>';

    html += '<div class="home-entries"><button class="badge-strip" id="badgeStrip">';
    /* One badge per component TYPE present in THIS stream (G1:3 · G2/G3:4 · HCL:5),
       in narrative order, ALL full-colour on the dashboard. The locked-vs-earned
       greyscale distinction lives in 成就墙 (renderAchievements) only, seen after
       tapping in. */
    var badgeOrder = ["生活空间", "核心", "巩固", "进阶", "文化站"];
    var compPresent = {};
    COMP_LIST.forEach(function (c) { compPresent[c.component] = 1; });
    /* ⚠️ the chips need their own row wrapper: .badge-strip is a COLUMN so the caption
       can sit UNDER the art (owner 2026-08-16 — beside it, HCL's five badges squeezed
       the caption into a one-character-per-line sliver). Without this wrapper the
       column would stack the badges vertically. */
    html += '<span class="badge-chips">';
    badgeOrder.filter(function (comp) { return compPresent[comp]; }).forEach(function (comp) {
      html += '<span class="badge-chip"><img src="' + (BADGE_IMG[comp] || "art/badge/badge_hx.png") + '" alt=""></span>';
    });
    html += '</span>';
    /* block gloss, not inline: 「成就徽章 Badges · 0/97」 on one line overflowed the
       card and clipped the count (owner 2026-08-14). English sits UNDER now. */
    html += '<span class="badge-note">成就徽章 · ' + badgeCount + '/' + badgeTotal +
      pyl("成就徽章") + enl("成就徽章") + '</span></button>';

    /* sublines removed 2026-08-14 (owner). The 连续 N 天 streak that used to live
       here is still shown inside 我的词语表 itself, so nothing is lost — it just
       stops competing with the title on the home page. */
    html += '<button class="wl-entry" id="lbEntry"><span class="flag">🏆</span>' +
      '<div><b>词山风云榜' + pyl("词山风云榜") + enli("词山风云榜") + '</b></div></button>';
    html += '</div>';   // .home-entries

    html += '</div></div>';

    view().innerHTML = html;

    Array.prototype.forEach.call(view().querySelectorAll(".unit[data-k]"), function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-k");
        /* ⚠️ A unit tap RETIRES the pasted list, exactly as the banner above promised.
           Keeping both would mean the chip the student just pressed changes nothing,
           and there is no honest way to show a half-applied scope. Needs the full
           re-render, because the banner and the 来源 row both have to stop saying
           「老师的清单」. */
        if (pasteOn()) { clearPaste(); scope.clear(); scope.add(k); renderHome(); return; }
        if (scope.has(k)) scope.delete(k); else scope.add(k);
        btn.classList.toggle("on");
        updateScopeSum();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".scope-acc"), function (b) {
      b.onclick = function () {
        var lv = b.getAttribute("data-lv");
        var nowOpen = store.accLevel !== lv;          // tapping the open one folds it
        store.accLevel = nowOpen ? lv : ""; saveStore();
        Array.prototype.forEach.call(view().querySelectorAll(".scope-acc"), function (x) {
          var l = x.getAttribute("data-lv"), on = (l === store.accLevel);
          x.classList.toggle("open", on);
          var body = view().querySelector('.units[data-lvbody="' + l + '"]');
          if (body) body.classList.toggle("collapsed", !on);
        });
      };
    });
    /* ⚠️ [data-comp] only — the 全选/清空 pair shares the .comp-chip class for its
       looks but carries no 板块 name, and this handler would write store.compOff[null]. */
    Array.prototype.forEach.call(view().querySelectorAll(".comp-chip[data-comp]"), function (b) {
      b.onclick = function () {
        var c = b.getAttribute("data-comp");
        if (store.compOff[c]) delete store.compOff[c]; else store.compOff[c] = 1;
        /* ⚠️ The old rule 「never let the last 板块 be switched off」 is GONE (owner
           2026-08-16). It made 清空 impossible and, worse, made the last tap do
           nothing at all — indistinguishable from a broken button. An empty filter
           is allowed now; the summary says 共 0 词 and starting a mode explains why. */
        b.classList.toggle("on", compIsOn(c));
        saveStore(); updateScopeSum(); updateFiltSum();
      };
    });
    document.getElementById("selAll").onclick = function () {
      clearPaste();                          // 全选 is a statement about UNITS; see the unit handler
      UNIT_LIST.forEach(function (u) { scope.add(u.key); });
      store.compOff = {};                    // 全选 means 板块 too, or it is not 全选
      saveStore(); renderHome();
    };
    /* ⚠️ 清空 clears UNITS ONLY — it deliberately does NOT switch the 板块 off
       (owner 2026-08-16). It used to mirror 全选 and turn every 板块 off as well,
       which reads symmetrical in the source and is not symmetrical in effect: with
       no units selected the scope is already 共 0 词, so the extra switch buys
       nothing and costs a trap. The student then picks one unit, still sees 共 0 词,
       and the reason is folded away inside the collapsed 筛选 block (§18g). 板块 is
       a stream-wide narrowing that defaults to ALL ON; only its own chips turn it off. */
    document.getElementById("selNone").onclick = function () {
      clearPaste();
      scope.clear();
      store.compOff = {};
      saveStore(); renderHome();
    };
    Array.prototype.forEach.call(view().querySelectorAll(".hdoor[data-path]"), function (btn) {
      btn.onclick = function () { renderPath(btn.getAttribute("data-path")); };
    });
    document.getElementById("badgeStrip").onclick = renderAchievements;
    document.getElementById("wlEntry").onclick = function () { renderWordList("all"); };
    document.getElementById("pasteEntry").onclick = function () { renderPasteList(null); };
    var pdh = document.getElementById("pasteDropHome");
    if (pdh) pdh.onclick = function () { clearPaste(); renderHome(); };
    /* ⚠️ re-render rather than a class flip: the closed header carries the 板块 count,
       so a flip would leave「板块 3/4」stale the moment a chip is toggled inside. */
    document.getElementById("filtT").onclick = function () {
      store.filtOpen = !store.filtOpen; saveStore(); renderHome();
    };
    document.getElementById("lbEntry").onclick = renderLeaderboard;
    document.getElementById("masteryInfo").onclick = showMasteryInfo;
    /* the banner IS 我的词山 now — tapping it opens the tall per-stream art (§3) */
    var lsc = document.getElementById("lscapeBtn");
    if (lsc) lsc.onclick = startMountain;
    var campChip = document.getElementById("campChip");
    if (campChip) campChip.onclick = openCampScene;      // §3: the PILL is the tap target
    var arenaPill = document.getElementById("arenaPill");
    if (arenaPill) arenaPill.onclick = openArena;
    var pkPill = document.getElementById("pkPill");
    if (pkPill) pkPill.onclick = renderPkConfig;
    updateScopeSum();
    /* 淡出邀请: only after a real round has been played this load, never on the
       boot render — a student who just opened the app has not "seen enough". */
    maybeEnFadePrompt();

    /* ⚠️ The folded 筛选 header restates the 板块 count, and the chips toggle by class
       flip rather than a re-render — so without this the header keeps saying 4/4
       after a chip is switched off, and the one fact folding must never hide goes
       stale the moment it matters. */
    function updateFiltSum() {
      var el = document.querySelector(".scope-filt-sum");
      if (!el) return;
      var cs = streamComps();
      el.textContent = "单元" +
        (cs.length > 1 ? " · 板块 " + cs.filter(compIsOn).length + "/" + cs.length : "");
    }
    function updateScopeSum() {
      var n = scopedWords().length;
      /* ⚠️ No「已筛去 N 个板块」suffix (owner 2026-08-16): the 板块 chips sit
         directly below this line and already show which are off, so the count
         restated the same fact in words. 共 N 词 is the number that actually
         changes and cannot be read off the chips. */
      document.getElementById("scopeSum").textContent = scopeSumText();
      Object.keys(byLevel).forEach(function (lv) {
        var el = view().querySelector('.cnt[data-cnt="' + lv + '"]');
        if (!el) return;
        var sel = byLevel[lv].filter(function (u) { return scope.has(u.key); }).length;
        el.textContent = sel ? "· 已选 " + sel + "/" + byLevel[lv].length : "· " + byLevel[lv].length + " 个单元";
      });
    }
  }

  /* ---------- achievements wall ---------- */
  /* 成就墙 has TWO families that answer different questions — 里程碑 is evidence
     of learning, 对战 is a record of matches — so they get tabs rather than one
     endless scroll. Before this the 对战 block sat ~5,700px down the page and the
     owner could not find it, which is the whole reason the toggle exists. */
  function renderAchievements() {
    setTopbar("home", "");
    var tab = store.achTab === "battle" ? "battle" : "milestone";
    var html = '<div class="ach-wrap">' +
      '<div class="ach-tabs">' +
      '<button class="ach-tab' + (tab === "milestone" ? " on" : "") + '" data-at="milestone">📜 掌握里程碑' +
        pyl("掌握里程碑") + enl("掌握里程碑") + '</button>' +
      '<button class="ach-tab' + (tab === "battle" ? " on" : "") + '" data-at="battle">⚔️ 对战徽章' +
        pyl("对战徽章") + enl("对战徽章") + '</button></div>';
    if (tab === "battle") {
      html += battleWallHtml() + '</div>';
      view().innerHTML = html;
      wireAchTabs();
      Array.prototype.forEach.call(view().querySelectorAll(".ach-badge[data-bf]"), function (b) {
        b.onclick = function () { openBattleBadge(b.getAttribute("data-bf"), b.getAttribute("data-bt")); };
      });
      return;
    }
    html += '<div class="section-label">成就墙 · 板块章 → 单元章 → 年级章 → 顶级词王' +
      pyl("成就墙 · 板块章 → 单元章 → 年级章 → 顶级词王") + enl("成就墙 · 板块章 → 单元章 → 年级章 → 顶级词王") + '</div>' +
      '<div class="ach-hint">点一下任何一枚板块章：看清大图与获得日期，未得到的可以直接挑战这个板块。</div>';
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
          var log = badgeInfo(badgeKeyC(c));
          var times = (log && log.n > 1) ? log.n : 0;
          /* A button, not a div: the whole tile opens the badge card. The ×N
             chip sits UNDER the art — never over it (badge spec: no text on
             the badge, never crop the ring). */
          html += '<button class="ach-badge' + (got ? "" : " locked") + '" data-ck="' + esc(c.key) + '">' +
            '<img src="' + (BADGE_IMG[c.component] || "art/badge/badge_hx.png") + '" alt="">' +
            '<span class="ach-badge-name">' + esc(c.component) +
            (times ? '<span class="ach-times">×' + times + '</span>' : '') + '</span>' +
            (c.textTitle ? '<span class="ach-badge-title">' + esc(c.textTitle) + '</span>' : '') +
            '<span class="ach-badge-count">' + done + '/' + c.ids.length + '</span></button>';
        });
        html += '</div></div>';
      });
      html += '</div>';
    });
    html += '<div class="ach-t4' + (store.badges["t4"] ? " got" : "") + '">👑 顶级词王 · ' +
      (store.badges["t4"] ? "已达成！锲而不舍，金石可镂。" : "掌握全部词语后解锁") + '</div>';
    html += '</div>';
    view().innerHTML = html;
    wireAchTabs();
    Array.prototype.forEach.call(view().querySelectorAll(".ach-badge[data-ck]"), function (b) {
      b.onclick = function () { openBadgeDetail(b.getAttribute("data-ck")); };
    });
  }
  function wireAchTabs() {
    Array.prototype.forEach.call(view().querySelectorAll(".ach-tab"), function (b) {
      b.onclick = function () { store.achTab = b.getAttribute("data-at"); saveStore(); renderAchievements(); };
    });
  }

  /* B层 对战徽章 on 成就墙 — a SEPARATE, clearly-labelled block placed AFTER the
     whole A层 ladder, per doc §7: the five 里程碑徽章 must not be drowned by the
     new families. Each family gets its own card so the "官方赛事 / 自约对局"
     split stays visible, with the 称号 last as the family's capstone. */
  function battleWallHtml() {
    var out = '<div class="ach-hint">房间对战拿到前三名就收下一面奖牌，同一面可以反复获得。' +
      '两个家族的金牌<b>分开累计</b>，各自集满 ' + BATTLE_CHAMPION_AT + ' 面解锁专属称号。</div>';
    ["room", "peer"].forEach(function (fam) {
      var f = BATTLE_FAMILY[fam], golds = battleCount(fam, "gold");
      var got = !!store.badges[battleKey(fam, "champion")];
      out += '<div class="ach-unit card"><div class="ach-unit-name">' + esc(f.zh) +
        (got ? '<span class="ach-seal">🏆 ' + esc(f.champion) + '</span>' : '') +
        '<span class="ach-fam-note">' + esc(f.blurb) + '</span></div><div class="ach-badges">';
      BATTLE_DISPLAY.forEach(function (tier) {
        var n = battleCount(fam, tier), have = n > 0;
        out += '<button class="ach-badge' + (have ? "" : " locked") + '" data-bf="' + fam + '" data-bt="' + tier + '">' +
          '<img src="' + battleImg(fam, tier) + '" alt="">' +
          '<span class="ach-badge-name">' + esc(battleName(fam, tier)) +
          (n > 1 ? '<span class="ach-times">×' + n + '</span>' : '') + '</span>' +
          '<span class="ach-badge-count">' +
          (tier === "champion"
            ? (have ? "已解锁" : golds + "/" + BATTLE_CHAMPION_AT + " 金")
            : (have ? "已获得" : "未获得")) + '</span></button>';
      });
      out += '</div></div>';
    });
    return out;
  }

  /* 对战徽章 detail card. Same shape as the 板块章 card (large uncropped art,
     dates, a way back into the activity) but there is no word list to show —
     a medal belongs to a match, not to a 板块. */
  function openBattleBadge(family, tier) {
    var f = BATTLE_FAMILY[family]; if (!f || !BATTLE_TIER[tier]) return;
    var key = battleKey(family, tier), got = !!store.badges[key], log = badgeInfo(key);
    var isChamp = tier === "champion", golds = battleCount(family, "gold");

    var meta, prog = "";
    if (got) {
      meta = '<div class="bd-earned">' + BATTLE_TIER[tier].icon + ' 已获得' +
        (isChamp ? '' : (log ? ' ' + (log.n || 1) + ' 次' : '')) + '</div>' +
        '<div class="bd-date">首次获得：' + esc((log && log.first) || "日期未记录") +
        ((log && log.n > 1 && log.last) ? '<br>最近一次：' + esc(log.last) : '') + '</div>';
    } else {
      meta = '<div class="bd-locked">尚未获得</div><div class="bd-date">' +
        esc(isChamp ? f.champBlurb : "在" + f.zh + "的一场对战里拿到第 " +
            (BATTLE_RANKS.indexOf(tier) + 1) + " 名，就能点亮它。") + '</div>';
    }
    if (isChamp) {
      var pct = Math.min(100, Math.round(100 * golds / BATTLE_CHAMPION_AT));
      prog = '<div class="bd-prog"><div class="bd-prog-track"><div class="bd-prog-fill" style="width:' + pct + '%"></div></div>' +
        '<span>' + esc(f.zh) + '金牌 ' + Math.min(golds, BATTLE_CHAMPION_AT) + ' / ' + BATTLE_CHAMPION_AT + '</span></div>';
    }

    var ov = popOverlay(
      '<div class="bd-card">' +
      '<div class="bd-art' + (got ? "" : " locked") + '">' +
      '<img src="' + battleImg(family, tier) + '" alt="' + esc(battleName(family, tier)) + '"></div>' +
      '<div class="bd-name">' + esc(battleName(family, tier)) + '</div>' +
      '<div class="bd-where">' + esc(f.zh) + ' · ' + esc(f.blurb) + '</div>' +
      meta + prog +
      '<div class="nav-row">' +
      '<button class="nav-btn primary" id="bbGo">' + (family === "room" ? "🏔️ 结伴登峰" : "⚔️ 开一场同伴挑战") + '</button>' +
      '<button class="nav-btn" id="bbClose">关闭' + pyl("关闭") + enli("关闭") + '</button></div></div>');
    ov.querySelector("#bbClose").onclick = function () { ov.remove(); };
    ov.querySelector("#bbGo").onclick = function () {
      ov.remove();
      if (family === "room") openArena(); else renderPkConfig();
    };
  }

  /* ---------- 徽章详情卡 (badge detail) ----------
     Tap a 板块章 on 成就墙 to see it large, with when it was earned and how
     many times it has been won. The card is also the entry point into the
     板块's own words:
       未获得 → 去挑战: a 填空挑战 round over EXACTLY this 板块, unmastered
                first. 填空 is the mastery gate, so answering here is what
                actually earns the badge.
       已获得 → 再次挑战: a 板块试炼 (华文解释 MCQ over every word in the
                板块). 全对 = the badge is won again and the count rises.
                A miss costs nothing — mastery/海拔/待巩固 are untouched. */
  function compByKey(key) {
    for (var i = 0; i < COMP_LIST.length; i++) if (COMP_LIST[i].key === key) return COMP_LIST[i];
    return null;
  }
  function compWords(c) {
    ensureIdIndex();
    return c.ids.map(function (id) { return WORDS[_idIndex[id]]; }).filter(Boolean);
  }
  function openBadgeDetail(key) {
    var c = compByKey(key); if (!c) return;
    var bk = badgeKeyC(c), got = !!store.badges[bk], log = badgeInfo(bk);
    var words = compWords(c);
    var done = words.filter(function (w) { return store.mastered[w.id]; }).length;
    var pct = words.length ? Math.round(100 * done / words.length) : 0;

    var meta;
    if (got) {
      /* 已获得 N 次. A pre-badgeLog badge has no count on record, so it falls
         back to a bare 已获得 rather than claiming a number it does not know. */
      meta = '<div class="bd-earned">🎖 已获得' + (log ? ' ' + (log.n || 1) + ' 次' : '') + '</div>' +
        '<div class="bd-date">首次获得：' + esc((log && log.first) || "日期未记录") +
        ((log && log.n > 1 && log.last) ? '<br>最近一次：' + esc(log.last) : '') + '</div>';
    } else {
      meta = '<div class="bd-locked">尚未获得</div>' +
        '<div class="bd-date">掌握这个板块的全部词语，就能点亮它。</div>';
    }

    var chips = words.map(function (w) {
      return '<span class="bd-word' + (store.mastered[w.id] ? " done" : "") + '">' + esc(w.w) + '</span>';
    }).join("");

    /* the count must match what 去挑战 will actually serve (unmastered only, and
       cloze-capable when any word in the 板块 has a blank) — otherwise the button
       promises a number the round does not deliver */
    var todo = words.filter(function (w) { return !store.mastered[w.id]; });
    var goN = (function () {
      var u = compModeUsable(words, store.compMode || "cloze");
      if (!u.length) return todo.length;                       // startCompStudy falls back to zhmcq
      var ids = {}; u.forEach(function (w) { ids[w.id] = 1; });
      var n = todo.filter(function (w) { return ids[w.id]; }).length;
      return n || todo.length;
    })();
    var cmode = store.compMode || "cloze";
    var modeRow = "";
    if (!got) {
      modeRow = '<div class="bd-modes"><div class="bd-modes-lab">用哪种方式练？</div>' +
        COMP_MODES.filter(function (m) { return compModeUsable(words, m.k).length > 0; })
          .map(function (m) {
            return '<button class="bd-mode' + (cmode === m.k ? " on" : "") + '" data-cm="' + m.k + '">' +
              m.label + (m.masters ? '<span class="bd-mode-tag">点亮徽章</span>' : '') + '</button>';
          }).join("") +
        '<div class="pop-note">只有<b>填空挑战</b>答对会提升海拔、点亮这枚徽章；其他方式用来熟悉词语。</div></div>';
    }
    var actions = got
      ? '<button class="nav-btn primary" id="bdAgain">🔁 再次挑战 · ' + words.length + ' 题全对</button>'
      : '<button class="nav-btn primary" id="bdGo">去挑战 · ' + goN + ' 个词语</button>';

    var ov = popOverlay(
      '<div class="bd-card">' +
      '<div class="bd-art' + (got ? "" : " locked") + '">' +
      '<img src="' + (BADGE_IMG[c.component] || "art/badge/badge_hx.png") + '" alt="' + esc(c.component) + '徽章"></div>' +
      '<div class="bd-name">' + esc(c.component) + '</div>' +
      '<div class="bd-where">' + esc(c.level) + ' · ' + esc(c.unit) +
      /* textTitle already carries its own 《》 in the data — do not add more */
      (c.textTitle ? '<br>' + esc(c.textTitle) : '') + '</div>' +
      meta +
      '<div class="bd-prog"><div class="bd-prog-track"><div class="bd-prog-fill" style="width:' + pct + '%"></div></div>' +
      '<span>已掌握 ' + done + ' / ' + words.length + ' 词</span></div>' +
      '<div class="bd-words">' + chips + '</div>' + modeRow +
      '<div class="nav-row">' + actions +
      '<button class="nav-btn" id="bdClose">关闭' + pyl("关闭") + enli("关闭") + '</button></div></div>');

    ov.querySelector("#bdClose").onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll(".bd-mode"), function (b) {
      b.onclick = function () {
        store.compMode = b.getAttribute("data-cm"); saveStore();
        Array.prototype.forEach.call(ov.querySelectorAll(".bd-mode"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        /* the count is mode-dependent (not every word has a cloze blank or an
           English gloss), so the button must not keep promising the old number */
        var btn = ov.querySelector("#bdGo");
        if (btn) {
          var u = compModeUsable(words, store.compMode), ids = {};
          u.forEach(function (x) { ids[x.id] = 1; });
          var n = todo.filter(function (x) { return ids[x.id]; }).length || todo.length;
          btn.textContent = "去挑战 · " + n + " 个词语";
        }
      };
    });
    var go = ov.querySelector("#bdGo");
    if (go) go.onclick = function () { ov.remove(); startCompStudy(c, store.compMode || "cloze"); };
    var ag = ov.querySelector("#bdAgain");
    if (ag) ag.onclick = function () { ov.remove(); startBadgeTrial(c); };
  }

  /* 未获得: learn this 板块. 填空挑战 over just these words, unmastered first —
     the same weak-first ordering startMode uses, but scoped to one 板块 rather
     than the whole 复习范围, and NOT capped to 题数 (the point is to finish the
     板块). Words with no valid __ blank are skipped, per the content rule. */
  /* Which practice modes a 板块 can be challenged with (owner 2026-08-14: 去挑战
     used to force 填空挑战 with no choice). `masters` marks the one that actually
     lights the badge — 填空挑战 is the mastery gate, so a student who picks 华文解释
     and answers everything right would otherwise wonder why the badge stayed grey.
     The card says so rather than letting them find out the hard way. */
  var COMP_MODES = [
    { k: "cloze", label: "✍️ 填空挑战", masters: true },
    { k: "zhmcq", label: "🔎 华文解释" },
    { k: "enmcq", label: "🌐 英文翻译" },
    { k: "flash", label: "📖 词语闪卡" }
  ];
  function compModeUsable(words, mode) {
    if (mode === "cloze") return words.filter(function (w) { return w.cloze && w.cloze.indexOf("__") !== -1; });
    if (mode === "enmcq") return words.filter(function (w) { return w.en; });
    return words.slice();
  }
  function startCompStudy(c, mode) {
    var words = compWords(c);
    mode = mode || "cloze";
    var usable = compModeUsable(words, mode);
    if (!usable.length) { usable = words; mode = "zhmcq"; }   // fall back rather than show nothing
    /* 去挑战 serves ONLY the words still unmastered (owner 2026-08-14) — the
       button already promises 「学这 N 个词语」, so replaying the whole 板块 made
       the count a lie and spent the student's time on words they had already
       proved. Mastered ones are kept as a fallback for the edge case where every
       usable word is already mastered but the badge is somehow not yet lit. */
    var un = [], rv = [];
    usable.forEach(function (w) { (store.mastered[w.id] ? rv : un).push(w); });
    var seq = un.length ? shuffle(un) : shuffle(rv);
    if (!seq.length) { alert("这个板块暂时没有可练习的词语。"); return; }
    var pool = WORDS.filter(function (w) { return w.level === c.level && w.unit === c.unit; });
    if (pool.length < 6) pool = WORDS;
    renderStep({ mode: mode, seq: seq, i: 0, correct: 0, revealed: false, streak: 0,
      comp: c.key, pool: pool });
  }

  /* 已获得: 板块试炼. Every word in the 板块, 华文解释 MCQ, 全对才算通过 —
     the same all-correct shape as 年度试炼, so 「再次获得」 means something.
     Distractors come from the same 单元 first (harder, and fair). */
  function startBadgeTrial(c) {
    var words = compWords(c);
    if (words.length < 2) { alert("这个板块的词语太少，暂时无法再次挑战。"); return; }
    var pool = WORDS.filter(function (w) { return w.level === c.level && w.unit === c.unit; });
    if (pool.length < 4) pool = WORDS;
    renderStep({ mode: "zhmcq", seq: shuffle(words.slice()), i: 0, correct: 0, revealed: false,
      streak: 0, bchal: c.key, pool: pool, wrong: {} });
  }

  function renderCompResult(state) {
    var c = compByKey(state.comp);
    var total = state.seq.length, got = c && store.badges[badgeKeyC(c)];
    var done = c ? c.ids.filter(function (id) { return store.mastered[id]; }).length : 0;
    setTopbar("home", "");
    view().innerHTML = '<div class="result">' +
      '<div class="big">' + (got ? "🎖 板块章到手！" : state.correct + " / " + total) + '</div>' +
      '<div class="sub">' + (c ? esc(c.level) + ' · ' + esc(c.unit) + ' · ' + esc(c.component) : "") + '</div>' +
      '<div class="msg">' + (got ? "这个板块的词语已全部掌握。"
        : "已掌握 " + done + " / " + (c ? c.ids.length : total) + " 词，再练一轮就更近了。") + '</div>' +
      '<div class="nav-row"><button class="nav-btn" id="again">再练一轮</button>' +
      '<button class="nav-btn primary" id="home">‹ 回成就墙</button></div></div>';
    document.getElementById("again").onclick = function () { if (c) startCompStudy(c); };
    document.getElementById("home").onclick = renderAchievements;
  }

  function renderBadgeTrialResult(state) {
    ensureIdIndex();
    var c = compByKey(state.bchal), total = state.seq.length;
    var wrongIds = Object.keys(state.wrong);
    var passed = wrongIds.length === 0;
    setTopbar("home", "");
    if (passed && c) {
      var bk = badgeKeyC(c), log = store.badgeLog[bk];
      if (!log) log = store.badgeLog[bk] = { first: todaySG(), last: todaySG(), n: 1 };
      log.n = (log.n || 1) + 1;
      log.last = todaySG();
      saveStore();
      sfxBadge();
      view().innerHTML = '<div class="result">' +
        '<div class="big">🎖 ' + esc(c.component) + ' · 已获得 ' + log.n + ' 次</div>' +
        '<div class="sub">' + state.correct + ' / ' + total + ' 全对</div>' +
        '<div class="msg">温故而知新。这枚板块章已经收入囊中 ' + log.n + ' 次。</div>' +
        '<div class="nav-row"><button class="nav-btn" id="again">再来一次' + pyl("再来一次") + enli("再来一次") + '</button>' +
        '<button class="nav-btn primary" id="home">‹ 回成就墙</button></div></div>';
    } else {
      var miss = wrongIds.map(function (id) { var w = WORDS[_idIndex[id]]; return w ? esc(w.w) : null; }).filter(Boolean);
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + state.correct + ' / ' + total + '</div>' +
        '<div class="sub">板块试炼 · 差一点全对</div>' +
        '<div class="msg">这几个词再看一眼：<br><b>' + miss.join("、") + '</b><br>' +
        '<span style="font-size:12px">（徽章和海拔都不受影响，随时可以再来）</span></div>' +
        '<div class="nav-row"><button class="nav-btn" id="again">再试一次</button>' +
        '<button class="nav-btn primary" id="home">‹ 回成就墙</button></div></div>';
    }
    document.getElementById("again").onclick = function () { if (c) startBadgeTrial(c); };
    document.getElementById("home").onclick = renderAchievements;
  }

  /* ---------- 贴入老师的清单 (owner 2026-09-01) ----------
     A teacher hands out an 期末 revision list; the student pastes it in and it becomes
     ①复习范围. This is the「scope even further」ask: units are the teacher's syllabus
     shape, and a revision list is not — it cuts across units by design.

     ⚠️ MATCHES ON 汉字 ONLY, and says so on the screen. A pasted list arrives with
     pinyin and English glued to it («你好 nǐ hǎo hello»), with numbering («1. 你好»),
     and with the separators of whatever app it was written in. Trying to also accept
     pinyin would make「打错了」and「不在这个学段」indistinguishable, and that
     distinction is the whole value of the report below.

     ⚠️ THE LINE IS TRIED WHOLE BEFORE IT IS SPLIT, and that order is load-bearing:
     谁言寸草心，报得三春晖 is one word in this stream and it CONTAINS the separator
     「，」. Splitting first would turn every proverb into two misses.

     ⚠️ NOTHING IS WRITTEN UNTIL THE STUDENT HAS SEEN WHAT WAS NOT FOUND. A silent
     partial match is the failure mode that matters here: a student revises 24 of the
     30 words their teacher set and has no way to know six went missing. */
  var PASTE_SEP = /[、，,;；\/|]+/;

  function pasteIndex() {
    /* first entry wins for a surface form that appears in two units — the pasted list
       names a WORD, not a placement, and returning both ids would drill it twice. */
    var by = {};
    WORDS.forEach(function (w) { if (!by[w.w]) by[w.w] = w.id; });
    return by;
  }
  /* strip numbering, drop everything that is not 汉字 or CJK punctuation, and trim the
     punctuation off the ends — 「1. 你好 nǐ hǎo hello」→「你好」*/
  function pasteClean(t) {
    return String(t || "")
      .replace(/^\s*\d+\s*[.、)．）:：]\s*/, "")
      .replace(/[^一-鿿㐀-䶿、，,;；\/|]/g, "")
      .replace(/^[、，,;；\/|]+|[、，,;；\/|]+$/g, "");
  }
  function parseWordList(raw) {
    var by = pasteIndex(), ids = [], hit = [], miss = [], seen = {};
    function take(t) {
      if (!t) return true;
      if (!by[t]) return false;
      if (!seen[t]) { seen[t] = 1; ids.push(by[t]); hit.push(t); }
      return true;
    }
    String(raw || "").split(/[\r\n]+/).forEach(function (line) {
      var whole = pasteClean(line);
      if (!whole) return;
      if (take(whole)) return;                 // the proverb case — try the line intact
      var any = false;
      whole.split(PASTE_SEP).forEach(function (piece) {
        var t = pasteClean(piece);
        if (!t) return;
        any = true;
        if (!take(t)) miss.push(t);
      });
      if (!any) miss.push(whole);
    });
    return { ids: ids, hit: hit, miss: miss };
  }

  var _pasteDraft = "";        // survives the 核对 re-render, so nobody retypes

  function renderPasteList(res) {
    setTopbar(renderHome, "");
    var html = '<div class="wl-wrap"><div class="wl-head">' +
      '<div class="wl-title">📥 贴入老师的清单</div></div>' +
      '<div class="wl-sub">把老师给的复习清单贴进来，就只练这些词。' +
      '一行一个词，或者用顿号、逗号分开都行；前面的编号不用删。' +
      '<b>只认汉字</b>——拼音和英文会自动忽略。</div>' +
      '<textarea class="paste-ta" id="pasteIn" placeholder="例如：\n1. 设施\n2. 走廊\n姓氏、单姓、复姓">' +
        esc(_pasteDraft) + '</textarea>' +
      '<div class="wl-actions"><button class="wl-flash" id="pasteCheck">核对这份清单</button>' +
      (pasteOn() ? '<button class="paste-off" id="pasteDrop">取消清单，改回按单元选</button>' : "") +
      '</div>';

    if (res) {
      html += '<div class="paste-res">';
      html += '<div class="paste-res-h">对上了 <b>' + res.hit.length + '</b> 个词' +
        (res.miss.length ? '，有 <b>' + res.miss.length + '</b> 个没找到' : "") + '</div>';
      if (res.miss.length) {
        /* ⚠️ THE MISSING WORDS ARE PRINTED, not counted. A count tells a student
           something is wrong; the list tells them WHICH word to ask their teacher
           about, and lets them see at a glance that it is a typo rather than a word
           this stream simply does not teach. */
        html += '<div class="paste-miss"><b>没找到：</b>' +
          res.miss.map(function (t) { return '<span class="paste-x">' + esc(t) + '</span>'; }).join("") +
          '<div class="wl-hint">这些词不在' + esc(META.zh) + '的词语表里，' +
          '可能是打错了，也可能是别的学段教的。可以问问老师。</div></div>';
      }
      html += res.hit.length
        ? '<button class="wl-flash" id="pasteUse">就用这 ' + res.hit.length + ' 个词当复习范围</button>'
        : '<div class="wl-empty">一个词也没对上，请检查是不是贴错了，或者换个学段。</div>';
      html += '</div>';
    }
    html += '</div>';
    view().innerHTML = html;

    var ta = document.getElementById("pasteIn");
    ta.oninput = function () { _pasteDraft = ta.value; };
    document.getElementById("pasteCheck").onclick = function () {
      _pasteDraft = ta.value;
      renderPasteList(parseWordList(_pasteDraft));
    };
    var drop = document.getElementById("pasteDrop");
    if (drop) drop.onclick = function () { clearPaste(); _pasteDraft = ""; renderHome(); };
    var use = document.getElementById("pasteUse");
    if (use) use.onclick = function () {
      store.paste = { ids: res.ids, at: Date.now() };
      saveStore();
      _pasteDraft = "";
      renderHome();
    };
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 30);
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
          '<div class="wl-zh">' + esc(w.zh) +
            (w.en ? '<span class="wl-en">' + esc(w.en) + '</span>' : '') + '</div>' +
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

  /* ---------- 词山风云榜 (leaderboard) — per stream, students only ----------
     Two boards, never summed (LEADERBOARD_DESIGN §7):
       掌握词数 (海拔, breadth) — ordered by alt.
       历练值 (depth) — 本季 (calendar quarter) or 累计, ordered by pts.
     校内 filters to THE VIEWER'S OWN school; 跨校 shows all schools. Tiers 1-10 金 /
     11-20 银 / 21-30 铜. Top 20 plus the student's own standing with an actionable gap;
     a full ranked cohort is never shown. Every row carries the full UID.
     ⚠️ 校内 USED TO BE HARD-CODED TO 百德 (`LB_BVSS`), which was correct while 百德 was
     the only school on the system and silently wrong the moment a second one joined:
     a 南侨 student tapping 校内 got a board of 百德 students with themselves nowhere on
     it. It now reads the viewer's own profile — the same thing xh.js has always done
     for the dock board. A profile with no school set filters nothing (there is no
     cohort to narrow to), rather than showing an empty board. */
  function lbMySchool() { var p = loadProfile() || {}; return p.school || ""; }
  /* 校内 tab label: the Chinese half of the stored "中文 English" value, because the
     full string does not fit a tab on a phone. Free-text (其他) schools have no
     English half and pass through unchanged. */
  function lbSchoolShort(v) {
    var s = String(v || "").replace(/\s+[A-Za-z(].*$/, "").trim();
    return s || String(v || "").trim();
  }
  function lbMedal(rank) { return rank <= 10 ? "🥇" : rank <= 20 ? "🥈" : rank <= 30 ? "🥉" : ""; }
  function lbTier(rank) { return rank <= 10 ? "gold" : rank <= 20 ? "silver" : rank <= 30 ? "bronze" : ""; }
  /* Four boards, sorted independently and NEVER summed (LEADERBOARD_DESIGN §7):
     掌握词数 breadth · 历练值 depth · and the two speed boards added by
     DESIGN_排行榜扩展. The speed boards rank canonical-config runs only, so a
     student cannot top them by picking a 120s timer or a slow fixed speed. */
  function lbFieldPath() {
    if (store.lbBoard === "sprint90") return STREAM + ".bestSprint90";
    if (store.lbBoard === "rainRamp") return STREAM + ".bestRainRamp";
    if (store.lbBoard === "pts") {
      if (store.lbTerm === "total") return STREAM + ".totalPts";
      if (store.lbTerm === "week") return STREAM + ".pts.week";
      return STREAM + ".pts." + currentTermId();
    }
    return STREAM + ".alt";
  }
  function lbValueOf(data) {
    var sd = (data || {})[STREAM] || {};
    if (store.lbBoard === "sprint90") return sd.bestSprint90 || 0;
    if (store.lbBoard === "rainRamp") return sd.bestRainRamp || 0;
    if (store.lbBoard === "pts") {
      if (store.lbTerm === "total") return sd.totalPts || 0;
      if (store.lbTerm === "week") return (sd.pts || {}).week || 0;
      return (sd.pts || {})[currentTermId()] || 0;
    }
    return sd.alt || 0;
  }
  function lbMyValue() {
    if (store.lbBoard === "sprint90") return store.best.sprint90 || 0;
    if (store.lbBoard === "rainRamp") return store.best.rainRamp || 0;
    if (store.lbBoard === "pts") {
      if (store.lbTerm === "total") return store.pts.total || 0;
      if (store.lbTerm === "week") return weekPts();
      return store.pts.terms[currentTermId()] || 0;
    }
    return Object.keys(store.mastered).length;
  }
  function lbUnit() {
    if (store.lbBoard === "sprint90") return " 题";
    if (store.lbBoard === "rainRamp") return " 分";
    return store.lbBoard === "pts" ? " 历练值" : " 米";
  }
  function renderLeaderboard() {
    setTopbar("home", "");
    var scope = store.lbScope || "school", board = store.lbBoard || "alt";
    var headline =
      board === "sprint90" ? "只统计 90 秒的攀山快答 · 比的是答对题数，答错要倒扣 3 秒。"
      : board === "rainRamp" ? "词雨灵露 · 每局都从最慢开始、随时间加速，所有人跑的是同一套节奏。"
      : board === "pts" ? (store.lbTerm === "week" ? "本周历练值 · 每周日重新开始。"
          : store.lbTerm === "total" ? "累计历练值 · 永不清零。"
          : "本季历练值 · 每季（1 月、4 月、7 月、10 月）重新开始，累计历练值永不清零。")
      : "掌握词数就是你的海拔，1 词 = 1 米，只增不减。";
    var html = '<div class="lb-wrap"><div class="wl-title">🏆 词山风云榜 · ' + esc(META.zh) + '</div>' +
      '<div class="lb-tabs2">' +
      '<button class="lb-tab2' + (board === "alt" ? " on" : "") + '" data-b="alt">掌握词数</button>' +
      '<button class="lb-tab2' + (board === "pts" ? " on" : "") + '" data-b="pts">历练值</button>' +
      '<button class="lb-tab2' + (board === "sprint90" ? " on" : "") + '" data-b="sprint90">⛰️ 攀山快答</button>' +
      '<button class="lb-tab2' + (board === "rainRamp" ? " on" : "") + '" data-b="rainRamp">🌧️ 词雨手速</button></div>';
    if (board === "pts") {
      html += '<div class="lb-subtoggle">' +
        '<button class="lb-sub' + (store.lbTerm === "week" ? " on" : "") + '" data-t="week">本周</button>' +
        '<button class="lb-sub' + (store.lbTerm !== "total" && store.lbTerm !== "week" ? " on" : "") + '" data-t="term">本季</button>' +
        '<button class="lb-sub' + (store.lbTerm === "total" ? " on" : "") + '" data-t="total">累计</button></div>';
    }
    html += '<div class="wl-sub">' + esc(headline) + '</div>' +
      '<div class="lb-toggle">' +
      '<button class="lb-tab' + (scope === "school" ? " on" : "") + '" data-s="school">校内 · ' +
        esc(lbSchoolShort(lbMySchool()) || "我的学校") + '</button>' +
      '<button class="lb-tab' + (scope === "all" ? " on" : "") + '" data-s="all">跨校 · 不限校</button></div>' +
      '<div id="lbBody"><div class="wl-empty">加载中…</div></div>' +
      '<div class="lb-note">换设备或清除浏览器数据后，你会以新的身份重新开始。</div></div>';
    view().innerHTML = html;
    Array.prototype.forEach.call(view().querySelectorAll(".lb-tab2[data-b]"), function (b) {
      b.onclick = function () { store.lbBoard = b.getAttribute("data-b"); saveStore(); renderLeaderboard(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".lb-sub[data-t]"), function (b) {
      b.onclick = function () { store.lbTerm = b.getAttribute("data-t"); saveStore(); renderLeaderboard(); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".lb-tab[data-s]"), function (b) {
      b.onclick = function () { store.lbScope = b.getAttribute("data-s"); saveStore(); renderLeaderboard(); };
    });

    var body = document.getElementById("lbBody");
    if (!window.WSCloud || !window.WSCloud.isAvailable()) {
      body.innerHTML = '<div class="wl-empty">排行榜需要联网，暂时无法加载。</div>'; return;
    }
    if (!window.WSCloud.getScoreBoard) {
      body.innerHTML = '<div class="wl-empty">排行榜功能正在更新，请刷新页面后再试。</div>'; return;
    }
    var getUid = window.WSCloud.getUid || function (cb) { cb(null); };
    var fieldPath = lbFieldPath(), unit = lbUnit(), myVal = lbMyValue();
    var me = loadProfile() || {}, iAmStudent = me.category === "student";
    var mySchool = me.school || "";
    getUid(function (myUid) {
      /* fetch a wider window so the 校内 filter still yields a full top-20 */
      window.WSCloud.getScoreBoard(fieldPath, 60, function (raw) {
        if (!body.isConnected) return;
        if (!raw) { body.innerHTML = '<div class="wl-empty">加载失败，请稍后再试。</div>'; return; }
        var rows = raw.filter(function (r) {
          var d = r.data || {};
          if (!d.nickname) return false;                    // 无名登山客 excluded until named
          if (scope === "school" && mySchool && d.school !== mySchool) return false;
          return true;
        }).map(function (r) {
          /* keep `data` on the row: openPlayerBadges reads the published battle
             counts straight off it, so tapping a name costs no extra read */
          return { uid: r.uid, nickname: (r.data.nickname || ""), school: (r.data.school || ""),
                   val: lbValueOf(r.data), data: r.data };
        });
        if (!rows.length) { body.innerHTML = '<div class="wl-empty">还没有人上榜，快去成为第一个！</div>'; return; }
        var top = rows.slice(0, 20);
        var myIdx = -1, i;
        for (i = 0; i < top.length; i++) { if (top[i].uid === myUid) { myIdx = i; break; } }
        var out = "";
        top.forEach(function (r, idx) {
          var rank = idx + 1, tier = lbTier(rank), mine = (r.uid === myUid);
          /* the whole row is a button: tapping a classmate shows the 对战徽章
             they have won (owner 2026-08-14). Counts only, from their own
             scores/{uid} doc — nothing about which words they know. */
          out += '<button class="lb-row' + (tier ? " " + tier : "") + (mine ? " me" : "") +
            '" data-lbu="' + esc(r.uid) + '">' +
            '<span class="lb-rank">' + lbMedal(rank) + ' ' + rank + '</span>' +
            /* ⚠️ NO「· 你」AFTER THE NICKNAME (owner 2026-08-19：「I don't want 你 to be
               there」). The row already says it is yours by being lit up; a word glued
               onto the nickname reads as part of the name — and it is the one name on
               the board the student did not choose. 出发码头 has never done this. */
            '<div class="lb-id"><b>' + esc(r.nickname || "（无昵称）") + '</b>' +
            (scope === "all" && r.school ? '<span class="lb-school">' + esc(r.school) + '</span>' : "") +
            /* ⚠️ PREFIX ONLY, never the whole uid. The line exists to separate two
               students who picked the same nickname out of the fixed picker, and 8
               base64 characters already do that for a whole school. The full string
               is 28 characters of monospace under every name: pure noise, and it
               reads to a student like something they were not meant to see. Eight is
               the same length teacher.html prints beside a feedback ticket.
               `data-lbu` on the row still carries the full uid, so tapping a name
               still opens their 对战徽章. */
            '<span class="lb-uid">' + esc(r.uid.slice(0, 8)) + '…</span></div>' +
            '<span class="lb-alt">' + fmtNum(r.val) + unit + '</span></button>';
        });
        /* own standing line — never a bare rank; always something actionable */
        var meLine = "";
        if (!iAmStudent) {
          meLine = '<div class="lb-me-line">你以「' + esc(me.category === "teacher" ? "老师" : "家长") + '」身份浏览，不参与排名。</div>';
        } else if (myIdx >= 0) {
          meLine = '<div class="lb-me-line">你目前排在第 <b>' + (myIdx + 1) + '</b> 名 · ' + fmtNum(myVal) + unit + '</div>';
        } else {
          var cutoff = top.length >= 20 ? top[19].val : 0;
          var gap = Math.max(1, cutoff - myVal + 1);
          meLine = '<div class="lb-me-line">你现在 ' + fmtNum(myVal) + unit +
            (top.length >= 20 ? ' · 再 <b>' + fmtNum(gap) + '</b>' + unit + ' 就能进前 20' : ' · 继续加油冲进榜单！') + '</div>';
          if (window.WSCloud.getScoreRank) {
            window.WSCloud.getScoreRank(fieldPath, myVal, function (rank) {
              var el = document.getElementById("lbMeRank");
              if (el && rank) el.textContent = "（" + (scope === "all" ? "跨校" : "全体") + "约第 " + rank + " 名）";
            });
          }
          meLine = meLine.replace("</div>", ' <span id="lbMeRank" class="lb-me-rank"></span></div>');
        }
        body.innerHTML = out + meLine;
        /* rows carry the full score doc we already fetched, so opening a
           classmate's badge card costs no extra read */
        var byUid = {}; rows.forEach(function (r) { byUid[r.uid] = r; });
        Array.prototype.forEach.call(body.querySelectorAll(".lb-row[data-lbu]"), function (b) {
          b.onclick = function () { openPlayerBadges(byUid[b.getAttribute("data-lbu")]); };
        });
      });
    });
  }

  /* 别人的对战徽章 (owner 2026-08-14): tap a name on 词山风云榜 to see what that
     student has won. Reads ONLY the compact `battle` counts already published in
     their scores/{uid} doc (battleSummary) — no dates, no mastery, no word data,
     and nothing that is not already visible on the board itself. */
  function openPlayerBadges(row) {
    if (!row) return;
    var d = row.data || {}, mine = (d[STREAM] || {}).battle || {};
    var cards = "";
    ["room", "peer"].forEach(function (fam) {
      var f = BATTLE_FAMILY[fam], any = "";
      BATTLE_DISPLAY.forEach(function (tier) {
        var n = mine[BATTLE_PUB[fam] + BATTLE_PUB_T[tier]] || 0;
        if (!n) return;
        any += '<div class="pb-badge"><img src="' + battleImg(fam, tier) + '" alt="" ' +
          'onerror="this.style.visibility=\'hidden\'">' +
          '<span>' + esc(battleName(fam, tier)) + (n > 1 ? ' ×' + n : '') + '</span></div>';
      });
      cards += '<div class="pb-fam"><div class="pb-fam-name">' + esc(f.zh) + '</div>' +
        (any ? '<div class="pb-grid">' + any + '</div>'
             : '<div class="pb-none">还没有拿过奖牌</div>') + '</div>';
    });
    var ov = popOverlay(
      '<div class="pb-card"><div class="pop-title">' + esc(d.nickname || "（无昵称）") + ' 的对战徽章</div>' +
      (d.school ? '<div class="pb-sub">' + esc(d.school) + '</div>' : '') +
      cards +
      '<div class="pb-note">只显示对战奖牌数量，不显示学习进度。</div>' +
      '<div class="nav-row"><button class="nav-btn" id="pbClose">关闭' + pyl("关闭") + enli("关闭") + '</button></div></div>');
    ov.querySelector("#pbClose").onclick = function () { ov.remove(); };
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
    var seq;
    if (mode === "flash") {
      seq = shuffle(pool);                 // flashcards run over the whole scope
    } else {
      /* WEAK-FIRST, RANDOM WITHIN BUCKET: present not-yet-mastered words first so a
         student keeps progressing (a 19-word section works through 1–19 across
         rounds) instead of re-seeing words they've already mastered — which was
         stalling badge progress. The unmastered bucket is SHUFFLED (not curriculum
         order) so students can't blindly follow their textbook/handbook. Mastered
         words fill in as review, shuffled, only once the unmastered ones run out. */
      var unmastered = [], reviewed = [];
      pool.forEach(function (w) { (store.mastered[w.id] ? reviewed : unmastered).push(w); });
      var ordered = shuffle(unmastered).concat(shuffle(reviewed));
      seq = ordered.slice(0, Math.min(store.quizLen || QUIZ_LEN, ordered.length));
    }
    var state = { mode: mode, seq: seq, i: 0, correct: 0, revealed: false, streak: 0 };
    renderStep(state);
  }

  function railHtml(state, name, desc, extra) {
    var total = state.seq.length;
    var m = streakMult(state.streak);
    var mchip = m > 1 ? ' <span class="mult" id="multChip">×' + m.toFixed(1) + '</span>' : '';
    return '<div class="rail card">' +
      '<div class="mode-name">' + name + pyl(name) + enli(name) + '</div>' +
      '<div class="mode-desc">' + desc + '</div>' +
      '<div class="prog-big">' + (state.i + 1) + ' <small>/ ' + total + '</small></div>' +
      '<div class="prog-track"><div class="prog-fill" style="width:' + Math.round(100 * state.i / total) + '%"></div></div>' +
      /* 词语闪卡不计连对、不计历练值（G-1）——不显示这两行，免得学生以为闪卡该赚分 */
      (state.mode === "flash" ? "" :
        '<div class="streak">连对' + pyl("连对") + enli("连对") + ' <b>' + state.streak + '</b> 🔥' + mchip + '</div>' +
        '<div class="rail-pts">历练值' + pyl("历练值") + enli("历练值") + ' <b>' + fmtNum(store.pts.total) + '</b></div>') +
      (extra || "") + '</div>';
  }
  /* flash the multiplier chip + reward tone when the 连对 tier just went up */
  function flashMult(state) {
    if (!state || !state._multUp) return;
    state._multUp = false;
    var c = document.getElementById("multChip");
    if (c) { c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); sfxBadge(); }
  }
  function noteStreak(state, right) {
    var before = streakMult(state.streak);
    if (right) {
      state.streak++;
      if (state.streak > store.bestStreak) { store.bestStreak = state.streak; saveStore(); }
    } else state.streak = 0;
    state._multUp = streakMult(state.streak) > before;   // tier increased this answer
  }

  function renderStep(state) {
    /* 开局清零：结算页问的是「**本局**点亮了吗」，不是「这辈子点亮过吗」。 */
    if (!state.i) resetBadgeRunTally();
    setTopbar("home", "");
    if (state.i >= state.seq.length) { return renderResult(state); }
    if (state.mode === "flash") return renderFlash(state);
    if (state.mode === "cloze") return renderCloze(state);
    return renderMcq(state);
  }

  /* ---------- flashcards ---------- */
  function renderFlash(state) {
    setFbCtx("词语闪卡", state.seq[state.i]);
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
        ttsBtnHtml("ttsW", "点读词语", "tts sm rail-tts")) +
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
    document.getElementById("ttsW").onclick = function () { speak(w.w, w.py); };
    ["ttsWF", "ttsWB"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.onclick = function (e) { e.stopPropagation(); speak(w.w, w.py); };
    });
    var zhBtn = document.getElementById("ttsZh");
    if (zhBtn) zhBtn.onclick = function (e) { e.stopPropagation(); speak(w.zh, w.zhPy); };
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
      '<button class="nav-btn primary" id="home">' + hubLabelHtml() + '</button></div></div>';
    document.getElementById("again").onclick = function () { startMode("flash"); };
    document.getElementById("home").onclick = backToHub;
  }

  /* ---------- cloze with difficulty ladder ---------- */
  var QUIZ_LENS = [10, 20, 30, 40, 50];
  var _asmSizeT = null, _diffT = null, _sprintT = null;
  var DIFF_OPTS = [
    { k: "2", stars: "⭐", label: "两个选项" },
    { k: "3", stars: "⭐⭐", label: "三个选项" },
    { k: "4", stars: "⭐⭐⭐", label: "四个选项" },
    { k: "type", stars: "⭐⭐⭐⭐", label: "打字输入" }
  ];
  /* 打拼音 (G1/G2 only) sits at the EASY end of the ladder, before ⭐: it is a
     familiarisation tier that earns 10% 历练值 and confers no 海拔, so putting it
     after ⭐⭐⭐⭐ would read as the hardest setting, which it is not. */
  function diffLadder() {
    var out = (STREAM === "g1" || STREAM === "g2")
      ? [{ k: "pinyin", stars: "⌨️", label: "打拼音 · 10% 历练值" }].concat(DIFF_OPTS)
      : DIFF_OPTS.slice();
    return out;
  }
  function diffKeys() { return diffLadder().map(function (d) { return d.k; }); }
  function diffFmt(k) {
    var l = diffLadder();
    for (var i = 0; i < l.length; i++) if (l[i].k === k) return l[i].stars + " " + l[i].label;
    return k;
  }
  /* 挑战难度 tiers are named choices, so the slider readout glosses them like a
     button. Keyed on the LABEL only — the stars carry no Chinese to annotate.
     Quantity sliders (题数/字块数量/时长) stay bare: their readouts are numbers,
     and a two-line readout would reintroduce the height jitter the slider
     rebuild removed. */
  function diffGloss(k) {
    var l = diffLadder();
    for (var i = 0; i < l.length; i++) if (l[i].k === k) return pyl(l[i].label) + enl(l[i].label);
    return "";
  }
  /* pinyin comparison for the practice-only 打拼音 mode: strip tone marks
     (NFD + combining removal), fold ü/v→u, drop spaces, lowercase. So the
     student can type "xingwei" / "xing wei" for 行为 (xíng wéi). */
  function tonelessPy(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[vü]/gi, "u").replace(/\s+/g, "").toLowerCase();
  }
  /* stepN: only the config SCREEN numbers this group (决定四). The mid-round
     rail reuses diffSelector too, and a numeral there would be meaningless. */
  /* 挑战难度 is a slider too (owner 2026-08-14): the tiers are an ORDERED ladder,
     so a handle sliding along it reads more naturally than five stacked tiles,
     and the readout keeps the stars + the tier's name visible at all times. */
  function diffSelector(stepN) {
    var keys = diffKeys(), cur = store.diff;
    if (keys.indexOf(cur) === -1) cur = keys[0];
    return '<div class="diff-label">' + (stepN ? stepNo(stepN) : "") + '挑战难度' + pyl("挑战难度") + enl("挑战难度") + '</div>' +
      qtySlider("diffSel", keys, cur, diffFmt, diffGloss) + pyAidToggleHtml();
  }
  /* one wiring helper for BOTH sites the ladder appears at (config screen and the
     mid-round rail), so they can never drift apart */
  function wireDiffSlider(after) {
    wireQtySlider("diffSel", diffKeys(), diffFmt, function (k) {
      store.diff = k; saveStore();
      clearTimeout(_diffT);
      _diffT = setTimeout(after, 260);
    }, diffGloss);
  }
  /* 拼音辅助 (D1): student-toggled, default off. Shown wherever options are
     answered (cloze MCQ rail + 攀山快答 pre-start). Reveals pronunciation only,
     not meaning — full 历练值 either way (D-5).
     NOT offered in HCL (owner 2026-08-13): 高级华文 students are expected to read
     without support. This governs SENTENCE + OPTION pinyin only — the per-word
     `py` on flashcards and 词语表 stays for every stream, HCL included. */
  function pyAidAvailable() { return STREAM !== "hcl"; }
  /* option-pinyin gate: the toggle AND the stream must both allow it */
  function optPy() { return store.pyAid && pyAidAvailable(); }

  /* ---------- 内容拼音：常驻 DOM，靠 <body> 上的一个 class 开关 ----------
     ⚠️ owner 2026-08-23：「we can remove the pinyin that appears after answering
     when the pinyin toggle is off. the feedback for right/wrong ans should
     respond to pinyin toggle too」。
     病因是**输出的时候判断**：选项的拼音在画的那一刻问过 optPy()，
     答案反馈干脆一次都没问过。学生答到一半把拼音关掉，已经画在屏幕上的东西
     不会因为一个 store 字段变了就消失。
     当时的补救是让每一块有拼音的屏幕注册 wirePyAidToggle(重画自己) ——
     ⚠️ **那才是真正的毛病**：填空挑战 的那次重画会在学生**答完之后**跑，
     把反馈、正确答案的高亮和 下一题 一起抹掉，一道答过的题看起来像没答过。
     所以改成与 pyl()/.pylab 同一套契约：**永远输出，CSS 决定看不看得见**，
     切换只是 <body> 上翻一个 class，谁也不必重画（见 qHtml() 与 wireDiff()）。

     两个闸门，因为两处的「没有拼音」意思不一样：
     · .py-gate —— 选项拼音，跟 body.py-aid（= 开关 且 该源流提供拼音）。
     · .py-ans-gate —— 答案反馈里的拼音，跟 body.py-ans（= 开关 或 该源流根本没有开关）。
       ⚠️ 闸门类名与 body 的状态类名**必须不同**：两者都叫 py-ans 时，裸的
       `.py-ans{display:none}` 会命中 <body> 自己，整页全白（2026-08-23 的 HCL 事故）。
       ⚠️ 后半句是为 HCL 留的：高级华文**没有拼音按钮**（pyAidAvailable() 为假），
       用 py-aid 去关它等于替 owner 决定「HCL 从此看不到答案拼音」，
       而 owner 要的是「跟着开关走」，不是「删掉」。HCL 的行为一个字节没变。 */
  function pyAnsOn() { return !!store.pyAid || !pyAidAvailable(); }
  /* 选项后面那一小串拼音 */
  function optPyHtml(py) {
    return py ? '<span class="py py-gate">' + esc(py) + '</span>' : "";
  }
  /* 答案反馈里的「（拼音）」，连括号一起进闸门——不然关掉之后会剩一对空括号 */
  function ansPyHtml(py) {
    return py ? '<span class="py-ans-gate">（' + esc(py) + '）</span>' : "";
  }

  /* D2b 句子/释义注音 (2026-08-13). zhPy/clozePy carry ONE syllable per CJK
     character: punctuation, Latin letters and the __ blank produce no token.
     So we walk the text and consume a syllable only on a CJK char.
     If the counts disagree, the pinyin field is out of step with the text
     (older JSON, hand-edited sentence) — return null and let the caller fall
     back to plain text, because a one-off misalignment would put the wrong
     reading over every remaining character. HCL has no zhPy/clozePy by design,
     so it falls back automatically.
     ⚠️ CJK_RE moved to the top of the file (see there) — _formOf() needs it too. */
  function rubyText(text, py) {
    var t = String(text == null ? "" : text), i, need = 0;
    var syl = String(py || "").split(/\s+/).filter(Boolean);
    if (!syl.length) return null;
    for (i = 0; i < t.length; i++) if (CJK_RE.test(t.charAt(i))) need++;
    if (syl.length !== need) return null;
    var out = "", k = 0;
    for (i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      out += CJK_RE.test(ch)
        ? "<ruby>" + esc(ch) + "<rt>" + esc(syl[k++]) + "</rt></ruby>"
        : esc(ch);
    }
    return out;
  }
  /* Question text, with 拼音 over the hanzi when 拼音辅助 is on. */
  /* ⚠️ ruby is emitted whenever the data supports it — the TOGGLE is a CSS gate
     (`body:not(.py-aid) rt{display:none}`), not a condition here (owner
     2026-08-23). It used to be `optPy() && …`, and because the annotation only
     appeared on a redraw, every screen showing a question had to register
     `wirePyAidToggle(renderCloze)` to react. On 填空挑战 that redraw ran AFTER the
     student had answered and **wiped the feedback, the revealed answer and 下一题**,
     leaving an answered question looking unanswered. Gating in CSS removes the
     redraw, and with it that whole class of bug.
     ⚠️ rubyText() still returns null when the syllable count disagrees, so a
     misaligned pinyin field falls back to plain text exactly as before. */
  function qHtml(text, py) {
    return rubyText(text, py) || esc(text);
  }
  /* extra class for the annotated line-height — keyed on whether ruby is
     actually present, so a fallback to plain text keeps the normal spacing.
     ⚠️ The class is now present whether or not the toggle is on; the taller
     line-height it asks for is itself gated on body.py-aid (see cs.css). */
  function qCls(html) { return html.indexOf("<ruby") >= 0 ? " has-py" : ""; }
  /* ================================================================
     英文提示 (EN aid) — DESIGN_english-toggle-fading-and-flow-numbering
     决定一：G1/G2 only. ONLY navigation/button shell text carries a tiny
     English gloss (学习/闯关/词语闪卡/出发…). Quiz CONTENT — 题干、释义、
     句子、选项 — stays pure Chinese whether the toggle is on or off; that is
     the same immersion rule as the Chinese-only TTS policy, and it is why the
     toggle cannot really weaken 中文沉浸.
     决定二/三: soft fade-out prompt + telemetry, both below.

     Mechanism: the gloss spans are ALWAYS in the DOM and CSS-gated on
     body.en-aid, so toggling is a single class flip — no re-render, so a
     student can flip it mid-question with nothing else changing on screen
     (and, unlike 拼音辅助, no chance of redrawing anything).
     ================================================================ */
  /* Owner 2026-08-15: widened from G1/G2 to G1/G2/G3 — same set as 拼音辅助, so
     the two aids now appear and disappear together instead of a G3 student
     getting pinyin but no English. HCL still emits neither, by design. */
  function enAidAvailable() { return pyAidAvailable(); }
  function enAidOn() { return !!(store.enAid && enAidAvailable()); }
  function applyEnAid() { document.body.classList.toggle("en-aid", enAidOn()); }
  /* Shell labels only. Keep this list SHORT and navigational: it is a
     decoding crutch for the interface, not a translation layer for the app. */
  var EN_LAB = {
    "重试": "Try again",
    "去成就墙": "Badge wall",
    "结伴": "Team up",
    "来源": "Source", "筛选": "Filters",
    "单元": "Units",
    "复习范围 · 可多选": "Choose your units",
    "全选": "Select all",
    "清空": "Clear",
    "选择学习方式": "Pick a path",
    "闯关": "Games",
    "词语游乐场": "Pick a game",
    "今日路线 · 选择你的营地": "Pick an activity",
    "学习挑战": "Quiz",
    "词语闪卡": "Flashcards",
    "词雨灵露": "Word Rain",
    "攀山快答": "Quick Climb",
    "组字成词": "Build the Word",
    "词语汉兜": "Word Puzzle",
    "出发": "Start",
    "我的词语表": "My word list",
    /* 贴入老师的清单 (2026-09-01). ⚠️ Added in the SAME edit as the labels — a missing
       key returns "" silently, which is how a gloss goes missing unnoticed. */
    "老师的清单": "Teacher's list",
    "贴入老师的清单": "Paste your teacher's list",
    "查词": "Search",
    "词山风云榜": "Leaderboard",
    "成就徽章": "Badges",
    "题型": "Question type",
    "每次题数": "How many questions",
    "挑战难度": "Difficulty",
    "学习支援": "Extra help",
    "填空挑战": "Fill in the blank",
    "华文解释": "Chinese meaning",
    "英文翻译": "English meaning",
    "题目类型": "Question type",
    "冲刺时长": "How long",
    "速度模式": "Speed mode",
    "下落速度": "Falling speed",
    "拼音辅助": "Show pinyin",
    "拼音": "Show pinyin",
    "开始挑战": "Start",
    "开始攀登": "Start climbing",
    "开始游戏": "Start game",
    "道具": "Items",
    "回营地": "Back",
    "下一题": "Next",
    /* HUD + stat labels (owner 2026-08-14: "actually can translate things like
       答对 连对 etc — check through the whole website"). These are shell text, so
       they are in scope; quiz CONTENT stays Chinese-only, as always. */
    "答对": "Correct",
    "连对": "Streak",
    "历练值": "XP",
    "正确率": "Accuracy",
    "最高连对": "Best streak",
    "已掌握词语": "Words mastered",
    "得分": "Score",
    "连击": "Combo",
    "波次": "Wave",
    "拼对": "Solved",
    "出题方式": "Prompt type",
    "字块数量": "How many tiles",
    "时长": "How long",
    "检查": "Check",
    "收集": "Collect",
    "提示": "Hint",
    "看成绩": "See results",
    "再来一次": "Play again",
    "查看": "Open",
    "关闭": "Close",
    "返回": "Back",
    "板块": "Sections",
    "再来一局": "Play again",
    "回到营地": "Back to camp",
    /* ⚠️ key 必须逐字等于屏幕上那串中文（§10）。「」不是汉字，音节数仍然是 4。
       名字加角括号，是为了让 学习／闯关 读成一个专名而不是一句动作，见 hubLabelHtml()。 */
    "回到「学习」": "Back to Learn", "回到「闯关」": "Back to Games",
    /* 四座山自己的名字（owner 2026-08-23 拍板）。星 → 将 → 王 → 圣 这条阶梯在英文里
       也走完：Star → Champ → King → Sage。⚠️ 这四条只在顶栏名牌上用得到，
       但 EN_LAB 是全局表，别处要用同一个名字就取这里，不要另译一份。 */
    "词星大冒险": "Adventure of the Vocab Star",
    "词将竞技场": "Arena of the Vocab Champ",
    "词王淬炼坊": "Forge of the Vocab King",
    "词圣鸿文苑": "Court of the Vocab Sage",
    "改范围": "Change scope",
    "连胜": "Win streak",
    "同伴挑战": "Duel a friend",
    "成就墙 · 板块章 → 单元章 → 年级章 → 顶级词王": "Badge wall",
    "掌握里程碑": "Milestones",
    "对战徽章": "Battle medals",
    /* ---- 出题方式 / 挑战难度 tiers (owner 2026-08-15) ----
       These are named CHOICES, so they carry a gloss like any other button.
       ⚠️ 一成历练值 was reworded to 「10% 历练值」 on the same request: 一成 is a
       register a G1 reader will not have met, and the English gloss the owner
       asked for ("10% XP") only lines up if the Chinese says 10% too. */
    "释义": "Meaning", "英文": "English", "填空": "Fill in the blank",
    "生活空间": "Everyday life", "核心": "Core", "巩固": "Practice more",
    "进阶": "Advanced", "文化站": "Culture stop",
    /* 我的词山 landmark cards (owner 2026-08-22) */
    "学习": "Learn", "挑战": "Challenge", "营地": "Camp", "关卡": "Stage", "顶峰": "Summit",
    "本级单元": "Units in this year",
    "已掌握": "Mastered", "海拔": "Altitude", "单元完成": "Units finished",
    "单元营地 · 海拔": "Unit camp · altitude", "板块驿站 · 海拔": "Component post · altitude",
    "金色 = 已掌握 · 虚线 = 待掌握 · 点词可发音":
      "Gold = mastered · dashed = not yet · tap a word to hear it",
    "拼音 · 10% 历练值": "Pinyin · 10% XP",
    "打拼音 · 10% 历练值": "Type pinyin · 10% XP",
    "两个选项": "Two choices", "三个选项": "Three choices", "四个选项": "Four choices",
    "打字输入": "Type the word",
    /* ---- question instructions (the q-tag banner over every question) ---- */
    "按顺序点出词语的字。": "Tap the characters in order.",
    "看释义，拼出词语": "Read the meaning, build the word",
    "看英文，拼出词语": "Read the English, build the word",
    "看句子，拼出空格里的词语": "Read the sentence, build the missing word",
    "看拼音，拼出词语（10% 历练值）": "Read the pinyin, build the word (10% XP)",
    "读句子，填出空格里的词语": "Read the sentence, fill in the blank",
    "读句子，打出空格里的词语": "Read the sentence, type the missing word",
    "读句子，打出空格里词语的拼音（不用声调，10% 历练值）":
      "Type the pinyin of the missing word, no tone marks (10% XP)",
    "选出最适当的词语填入空格": "Choose the best word for the blank",
    "看释义，选出词语": "Read the meaning, choose the word",
    "看英文，选出词语": "Read the English, choose the word",
    "看英译，选出词语": "Read the English, choose the word",
    /* ---- in-round buttons ---- */
    "朗读句子": "Read the sentence aloud", "朗读释义": "Read the meaning aloud",
    "点读词语": "Read the word aloud",
    "提示：显示拼音": "Hint: show the pinyin", "提示：显示词语": "Hint: show the word",
    "在词语下方显示拼音": "Show pinyin under each word",
    "一次拼对！": "Perfect on the first try!",
    "完成！（中途点错过）": "Done — but you tapped a wrong tile on the way.",
    /* ---- config-screen instructions ---- */
    "答对可累积历练值；填空挑战答对还会提升海拔。":
      "Correct answers earn XP. Fill in the blank also raises your altitude.",
    "登山冲刺：答对就向上攀登！": "Climb race: every correct answer takes you higher!",
    "第一次答对的新词会永久提升你的海拔（1 词 = 1 米）。优先出现你还没掌握的词。":
      "A new word you get right for the first time raises your altitude for good (1 word = 1 metre). Words you have not mastered come first.",
    "我的海拔": "My altitude", "个人纪录": "Personal best",
    "词语化作灵雨随风而落，趁它落地前打出，化为灵露收进宝缸！":
      "Words fall like rain. Type one before it lands and it turns into dew in your jar!",
    "字数越多、接得越高、连击越长，得分越高。":
      "Longer words, caught higher, with a longer combo, all score more.",
    "接住的词都会化成灵露，可在「我的词山 · 你的营地」兑换装备。":
      "Every word you catch becomes dew. Spend it on gear at 我的词山 · 你的营地.",
    "雨势会越下越急 —— 每一局都从最慢开始。":
      "The rain gets faster as you play, and every round starts at the slowest.",
    "本机最高分": "Best on this device", "生命": "Lives",
    "猜一个范围内的四字词语。": "Guess a four-character word from your units.",
    "🟩 字对位置对": "🟩 right character, right place",
    "🟨 字对位置不对": "🟨 right character, wrong place",
    "⬜ 没有这个字": "⬜ not in the word",
    "和朋友比一比：同一套题，限时内谁答对得多谁赢。":
      "Race a friend: same questions, whoever gets the most right in the time wins.",
    "答对的词照样计入「已掌握」，也照常累积历练值和灵露。":
      "Words you get right still count as mastered, and still earn XP and dew.",
    "2 至 8 人。开局后不能中途加入，掉线的人可以用房间号回来。":
      "2 to 8 players. Nobody can join once it starts; if you drop out, use the room code to come back.",
    "出题范围": "Word pool",
    "用你在「学习」页选的复习范围，和自己复习时一样。要改就回上一页选单元。":
      "Uses the units you picked on the 学习 page, the same as your own revision. To change it, go back a page.",
    /* ---- 汉兜 hint redesign (owner 2026-08-15): the old progressive-声母
       button had no label text of its own (just bare letters), so this pair
       is genuinely new shell text, not a reuse. */
    "首字声母": "First sound", "词性": "Word type"
  };
  /* 拼音 for the INTERFACE (owner 2026-08-14: "students who are weak can't read
     this and can get overwhelmed"). Same contract as EN_LAB — navigation and
     button SHELL text only, never quiz content — and the same mechanism: the
     span is ALWAYS in the DOM and CSS-gated on body.py-aid, so toggling is one
     class flip that cannot re-render anything (and therefore cannot leak an
     answer the way a redraw would).
     ⚠️ Hand-authored, NOT generated. There is deliberately no hanzi→pinyin table
     in the client: these are fixed strings, so writing them out avoids polyphone
     guessing entirely (得分 is dé, 时长 is cháng, 正确率 is lǜ). Add a line here
     whenever you add an EN_LAB entry — pyl() falls back to nothing if a key is
     missing, so a gap is silent, not broken. */
  var PY_LAB = {
    "重试": "chóng shì",
    "去成就墙": "qù chéng jiù qiáng",
    "结伴": "jié bàn",
    "来源": "lái yuán", "筛选": "shāi xuǎn",
    "单元": "dān yuán",
    "复习范围 · 可多选": "fù xí fàn wéi · kě duō xuǎn", "全选": "quán xuǎn", "清空": "qīng kōng",
    "选择学习方式": "xuǎn zé xué xí fāng shì", "闯关": "chuǎng guān",
    "词语游乐场": "cí yǔ yóu lè chǎng",
    "今日路线 · 选择你的营地": "jīn rì lù xiàn · xuǎn zé nǐ de yíng dì",
    "学习挑战": "xué xí tiǎo zhàn", "词语闪卡": "cí yǔ shǎn kǎ",
    "词雨灵露": "cí yǔ líng lù", "攀山快答": "pān shān kuài dá", "组字成词": "zǔ zì chéng cí",
    "词语汉兜": "cí yǔ hàn dōu", "出发": "chū fā", "我的词语表": "wǒ de cí yǔ biǎo", "老师的清单": "lǎo shī de qīng dān",
    "贴入老师的清单": "tiē rù lǎo shī de qīng dān",
    "查词": "chá cí",
    "词山风云榜": "cí shān fēng yún bǎng", "成就徽章": "chéng jiù huī zhāng",
    "题型": "tí xíng", "每次题数": "měi cì tí shù", "挑战难度": "tiǎo zhàn nán dù",
    "学习支援": "xué xí zhī yuán", "填空挑战": "tián kòng tiǎo zhàn",
    "华文解释": "huá wén jiě shì", "英文翻译": "yīng wén fān yì",
    "题目类型": "tí mù lèi xíng", "冲刺时长": "chōng cì shí cháng",
    "速度模式": "sù dù mó shì", "下落速度": "xià luò sù dù", "拼音辅助": "pīn yīn fǔ zhù", "拼音": "pīn yīn",
    "开始挑战": "kāi shǐ tiǎo zhàn", "开始攀登": "kāi shǐ pān dēng", "开始游戏": "kāi shǐ yóu xì",
    "回营地": "huí yíng dì", "下一题": "xià yī tí",
    "答对": "dá duì", "连对": "lián duì", "历练值": "lì liàn zhí",
    "正确率": "zhèng què lǜ", "最高连对": "zuì gāo lián duì", "已掌握词语": "yǐ zhǎng wò cí yǔ",
    "得分": "dé fēn", "连击": "lián jī", "波次": "bō cì", "拼对": "pīn duì",
    "出题方式": "chū tí fāng shì", "字块数量": "zì kuài shù liàng", "时长": "shí cháng",
    "检查": "jiǎn chá", "收集": "shōu jí", "提示": "tí shì", "看成绩": "kàn chéng jì",
    "再来一次": "zài lái yī cì", "查看": "chá kàn", "关闭": "guān bì", "返回": "fǎn huí",
    "板块": "bǎn kuài", "连胜": "lián shèng",
    "再来一局": "zài lái yī jú", "回到营地": "huí dào yíng dì",
    "回到「学习」": "huí dào xué xí", "回到「闯关」": "huí dào chuǎng guān",
    /* ⚠️ 与 index.html 落地卡上那四串逐字相同（那是已经审过的）：改一处要改两处。 */
    "词星大冒险": "cí xīng dà mào xiǎn", "词将竞技场": "cí jiàng jìng jì chǎng",
    "词王淬炼坊": "cí wáng cuì liàn fáng", "词圣鸿文苑": "cí shèng hóng wén yuàn",
    "改范围": "gǎi fàn wéi",
    "同伴挑战": "tóng bàn tiǎo zhàn",
    "成就墙 · 板块章 → 单元章 → 年级章 → 顶级词王":
      "chéng jiù qiáng · bǎn kuài zhāng → dān yuán zhāng → nián jí zhāng → dǐng jí cí wáng",
    "掌握里程碑": "zhǎng wò lǐ chéng bēi", "对战徽章": "duì zhàn huī zhāng",
    /* ---- 出题方式 / 挑战难度 tiers ---- */
    "释义": "shì yì", "英文": "yīng wén", "填空": "tián kòng",
    "生活空间": "shēng huó kōng jiān", "核心": "hé xīn", "巩固": "gǒng gù",
    "进阶": "jìn jiē", "文化站": "wén huà zhàn",
    /* 我的词山 landmark cards (owner 2026-08-22). ⚠️ one syllable per 汉字, symbols
       carried through unchanged — same shape as the 词雨 lines further down. */
    "学习": "xué xí", "挑战": "tiǎo zhàn", "营地": "yíng dì", "关卡": "guān kǎ",
    "本级单元": "běn jí dān yuán",
    "顶峰": "dǐng fēng", "已掌握": "yǐ zhǎng wò", "海拔": "hǎi bá", "单元完成": "dān yuán wán chéng",
    "单元营地 · 海拔": "dān yuán yíng dì · hǎi bá",
    "板块驿站 · 海拔": "bǎn kuài yì zhàn · hǎi bá",
    "金色 = 已掌握 · 虚线 = 待掌握 · 点词可发音":
      "jīn sè = yǐ zhǎng wò · xū xiàn = dài zhǎng wò · diǎn cí kě fā yīn",
    "拼音 · 10% 历练值": "pīn yīn · 10% lì liàn zhí",
    "打拼音 · 10% 历练值": "dǎ pīn yīn · 10% lì liàn zhí",
    "两个选项": "liǎng gè xuǎn xiàng", "三个选项": "sān gè xuǎn xiàng",
    "四个选项": "sì gè xuǎn xiàng", "打字输入": "dǎ zì shū rù",
    /* ---- question instructions ---- */
    "按顺序点出词语的字。": "àn shùn xù diǎn chū cí yǔ de zì",
    "看释义，拼出词语": "kàn shì yì，pīn chū cí yǔ",
    "看英文，拼出词语": "kàn yīng wén，pīn chū cí yǔ",
    "看句子，拼出空格里的词语": "kàn jù zi，pīn chū kòng gé lǐ de cí yǔ",
    "看拼音，拼出词语（10% 历练值）": "kàn pīn yīn，pīn chū cí yǔ（10% lì liàn zhí）",
    "读句子，填出空格里的词语": "dú jù zi，tián chū kòng gé lǐ de cí yǔ",
    "读句子，打出空格里的词语": "dú jù zi，dǎ chū kòng gé lǐ de cí yǔ",
    "读句子，打出空格里词语的拼音（不用声调，10% 历练值）":
      "dú jù zi，dǎ chū kòng gé lǐ cí yǔ de pīn yīn（bù yòng shēng diào，10% lì liàn zhí）",
    "选出最适当的词语填入空格": "xuǎn chū zuì shì dàng de cí yǔ tián rù kòng gé",
    "看释义，选出词语": "kàn shì yì，xuǎn chū cí yǔ",
    "看英文，选出词语": "kàn yīng wén，xuǎn chū cí yǔ",
    "看英译，选出词语": "kàn yīng yì，xuǎn chū cí yǔ",
    /* ---- in-round buttons ---- */
    "朗读句子": "lǎng dú jù zi", "朗读释义": "lǎng dú shì yì", "点读词语": "diǎn dú cí yǔ",
    "提示：显示拼音": "tí shì：xiǎn shì pīn yīn", "提示：显示词语": "tí shì：xiǎn shì cí yǔ",
    "在词语下方显示拼音": "zài cí yǔ xià fāng xiǎn shì pīn yīn",
    "一次拼对！": "yī cì pīn duì", "完成！（中途点错过）": "wán chéng（zhōng tú diǎn cuò guò）",
    /* ---- config-screen instructions ---- */
    "答对可累积历练值；填空挑战答对还会提升海拔。":
      "dá duì kě lěi jī lì liàn zhí；tián kòng tiǎo zhàn dá duì hái huì tí shēng hǎi bá",
    "登山冲刺：答对就向上攀登！": "dēng shān chōng cì：dá duì jiù xiàng shàng pān dēng",
    "第一次答对的新词会永久提升你的海拔（1 词 = 1 米）。优先出现你还没掌握的词。":
      "dì yī cì dá duì de xīn cí huì yǒng jiǔ tí shēng nǐ de hǎi bá（1 cí = 1 mǐ）。" +
      "yōu xiān chū xiàn nǐ hái méi zhǎng wò de cí",
    "我的海拔": "wǒ de hǎi bá", "个人纪录": "gè rén jì lù",
    "词语化作灵雨随风而落，趁它落地前打出，化为灵露收进宝缸！":
      "cí yǔ huà zuò líng yǔ suí fēng ér luò，chèn tā luò dì qián dǎ chū，huà wéi líng lù shōu jìn bǎo gāng",
    "字数越多、接得越高、连击越长，得分越高。":
      "zì shù yuè duō、jiē de yuè gāo、lián jī yuè cháng，dé fēn yuè gāo",
    "接住的词都会化成灵露，可在「我的词山 · 你的营地」兑换装备。":
      "jiē zhù de cí dōu huì huà chéng líng lù，kě zài「wǒ de cí shān · nǐ de yíng dì」duì huàn zhuāng bèi",
    "雨势会越下越急 —— 每一局都从最慢开始。":
      "yǔ shì huì yuè xià yuè jí —— měi yī jú dōu cóng zuì màn kāi shǐ",
    "本机最高分": "běn jī zuì gāo fēn", "生命": "shēng mìng",
    "猜一个范围内的四字词语。": "cāi yī gè fàn wéi nèi de sì zì cí yǔ",
    "🟩 字对位置对": "zì duì wèi zhì duì",
    "🟨 字对位置不对": "zì duì wèi zhì bù duì",
    "⬜ 没有这个字": "méi yǒu zhè gè zì",
    "和朋友比一比：同一套题，限时内谁答对得多谁赢。":
      "hé péng yǒu bǐ yī bǐ：tóng yī tào tí，xiàn shí nèi shuí dá duì dé duō shuí yíng",
    "答对的词照样计入「已掌握」，也照常累积历练值和灵露。":
      "dá duì de cí zhào yàng jì rù「yǐ zhǎng wò」，yě zhào cháng lěi jī lì liàn zhí hé líng lù",
    "2 至 8 人。开局后不能中途加入，掉线的人可以用房间号回来。":
      "2 zhì 8 rén。kāi jú hòu bù néng zhōng tú jiā rù，diào xiàn de rén kě yǐ yòng fáng jiān hào huí lái",
    "出题范围": "chū tí fàn wéi",
    "用你在「学习」页选的复习范围，和自己复习时一样。要改就回上一页选单元。":
      "yòng nǐ zài「xué xí」yè xuǎn de fù xí fàn wéi，hé zì jǐ fù xí shí yī yàng。" +
      "yào gǎi jiù huí shàng yī yè xuǎn dān yuán",
    /* ---- 汉兜 hint redesign (owner 2026-08-15) ---- */
    "首字声母": "shǒu zì shēng mǔ", "词性": "cí xìng",
    /* ---- 道具 (2026-08-25) ---- */
    "道具": "dào jù"
  };
  function pyl(key) {
    if (!pyAidAvailable()) return "";
    var t = PY_LAB[key];
    return t ? '<span class="pylab">' + esc(t) + '</span>' : "";
  }
  function applyPyAid() {
    document.body.classList.toggle("py-aid", !!store.pyAid && pyAidAvailable());
    document.body.classList.toggle("py-ans", pyAnsOn());   // 见 pyAnsOn() 上面那段
  }

  /* block gloss, sits under the Chinese label */
  function enl(key) {
    if (!enAidAvailable()) return "";
    var t = EN_LAB[key];
    return t ? '<span class="enlab">' + esc(t) + '</span>' : "";
  }
  /* inline gloss, for short button text that must stay on one line */
  function enli(key) {
    if (!enAidAvailable()) return "";
    var t = EN_LAB[key];
    return t ? '<span class="enlab i">' + esc(t) + '</span>' : "";
  }
  /* One INSTRUCTION line: the Chinese, then its 拼音 and English underneath.
     The key IS the visible line, which is what keeps the PY_LAB/EN_LAB audit
     honest — never gloss a line with a key that says something else.
     Multi-sentence descriptions are passed one line per call rather than joined
     with <br>, so each line's gloss sits directly under the line it explains. */
  function mdLine(zh, pre) {
    return '<div class="md-line">' + (pre || "") + zh + pyl(zh) + enl(zh) + '</div>';
  }
  /* The banner over a question ("看句子，拼出空格里的词语"). Same gloss contract. */
  function qTag(zh) {
    return '<span class="q-tag">' + zh + pyl(zh) + enl(zh) + '</span>';
  }
  /* A mode chip's label carries a leading emoji ("✍️ 填空"); the gloss key must
     be the Chinese the student can actually see, or the annotation describes a
     phrase that is not on screen (the 拼音辅助 / 拼音 mismatch the owner caught).
     Deriving it here means a chip can never drift from its key. */
  function labKey(label) { return String(label).replace(/^[^一-鿿A-Za-z0-9]+/, "").trim(); }
  function labGloss(label) { var k = labKey(label); return pyl(k) + enl(k); }
  /* A 🔊 button whose Chinese label carries both glosses. */
  function ttsBtnHtml(id, zh, cls) {
    /* .tts is an inline-flex row, so the glosses must live inside ONE child or
       they line up beside the label instead of stacking under it. */
    return '<button class="' + (cls || "tts") + '" id="' + id + '">🔊 <span class="tts-lab">' +
      zh + pyl(zh) + enl(zh) + '</span></button>';
  }
  /* Per-CHARACTER 拼音 for the 组字成词 tiles (owner 2026-08-15: pinyin support
     must reach the single characters too — but NOT English, which would be
     meaningless on a lone character).
     Built once from this stream's own word list by walking every word whose
     syllable count matches its character count. ⚠️ A character that is read more
     than one way anywhere in the data gets NO pinyin rather than a guess: a
     tile is one character with no context, so there is nothing to disambiguate
     a polyphone with, and a wrong reading taught confidently is worse than none
     (same reasoning as the TTS "never pass pinyin to the engine" rule). */
  var _charPy = null;
  function charPy(c) {
    if (!_charPy) {
      var seen = {};
      WORDS.forEach(function (w) {
        var chars = String(w.w || ""), syl = String(w.py || "").split(/\s+/).filter(Boolean);
        if (!chars || syl.length !== chars.length) return;
        for (var i = 0; i < chars.length; i++) {
          var ch = chars.charAt(i);
          if (!CJK_RE.test(ch)) continue;
          if (seen[ch] === undefined) seen[ch] = syl[i];
          else if (seen[ch] !== syl[i]) seen[ch] = null;   // polyphone: say nothing
        }
      });
      _charPy = seen;
    }
    return _charPy[c] || "";
  }
  /* 决定一 · 发现方式: the control is an ICON pill (中/EN), never a Chinese
     word — a student who cannot read the interface must still be able to find
     the thing that fixes that. It lives in the topbar so it is reachable from
     every screen. 隐私: device-local, never on any leaderboard or badge wall. */
  function enToggleHtml() {
    if (!enAidAvailable()) return "";
    return '<button class="tb-en' + (store.enAid ? " on" : "") + '" id="tbEn" ' +
      'title="中文 / English" aria-label="English hints 英文提示" ' +
      'aria-pressed="' + (store.enAid ? "true" : "false") + '">' +
      '<span class="tb-en-zh">中</span><span class="tb-en-en">EN</span></button>';
  }
  function wireEnToggle() {
    var b = document.getElementById("tbEn");
    if (!b) return;
    b.onclick = function () {
      var t = store.enTel, L = t.last10Sessions, i, offRun = 0;
      store.enAid = !store.enAid;
      if (store.enAid) {
        t.manualOnCount += 1;
        /* 回退旗标: turned back ON after 5+ consecutive OFF sessions. Flagged
           for the teacher separately, because a rolling average would just
           quietly drift back up and hide it. Not assumed to be a bad sign —
           it often means a harder unit, which is exactly worth noticing. */
        for (i = L.length - 1; i >= 0 && !L[i]; i--) offRun++;
        if (offRun >= EN_REGRESSION_RUN) t.regressionAt = t.sessionsTotal;
      } else {
        t.manualOffCount += 1;
      }
      aidLogPush(t, store.enAid);
      saveStore();
      applyEnAid();
      b.classList.toggle("on", store.enAid);
      b.setAttribute("aria-pressed", store.enAid ? "true" : "false");
      toast(store.enAid ? "英文提示已开启 English hints on" : "英文提示已关闭 English hints off");
    };
  }

  /* --- 决定二/三: 有效 session 计数 + 淡出提示 ---
     「有效 session」= 这次登入至少答了一题（任何模式）。纯开机不算。曝光量比
     日历天数更能反映「该看够了」，因为按钮标签就那十几个词。
     ⚠️ 以下四个数字为上线默认值，按设计文档需累积一学期真实数据后再校准。 */
  var EN_FADE_SESSIONS = 5;      // 连续 ON 满 5 个有效 session 后邀请一次
  var EN_PROMPT_COOLDOWN = 10;   // 拒绝后至少再等 10 个 session
  var EN_PROMPT_TERM_CAP = 2;    // 每季（日历季度，见 currentTermId）最多提示 2 次
  var EN_REGRESSION_RUN = 5;     // 连续关闭 5+ session 后重开 = 回退
  /* ---------- 支援开关的变化日志 ----------
     Appends ONLY when the state actually changes, so the array is a history of
     decisions rather than a history of page loads.
     ⚠️ THE FIRST ENTRY IS NEVER TRIMMED. When the cap is hit we drop the SECOND row,
     because「什么时候开始用的」is the one fact that cannot be recovered from anywhere
     else — the recent flips can still be read off the tail. Trimming from the front
     would quietly delete the origin of every long-running student.
     ⚠️ Same-day re-flips collapse: a student who toggles off and straight back on has
     not changed anything by the end of the day, and two rows with the same date and
     opposite values read as a contradiction on the teacher's screen. */
  function aidLogPush(tel, on) {
    if (!tel) return;
    var L = (tel.log instanceof Array) ? tel.log : (tel.log = []);
    var d = todaySG(), v = on ? 1 : 0, last = L.length ? L[L.length - 1] : null;
    if (last && last.on === v) return;                 // no change, nothing to record
    if (last && last.d === d) { L.pop(); }             // same-day flip-back: undo it
    var prev = L.length ? L[L.length - 1] : null;
    if (prev && prev.on === v) return;                 // …and it collapsed to no change
    L.push({ d: d, on: v });
    while (L.length > AID_LOG_CAP) L.splice(1, 1);     // keep [0], drop the next oldest
  }
  var _enSessionCounted = false, _enPromptShown = false;
  /* called from bump(), i.e. the moment the first question of this load is
     answered — every mode routes its answers through bump() */
  function enNoteSession() {
    if (!enAidAvailable() || _enSessionCounted) return;
    _enSessionCounted = true;
    var t = store.enTel, on = !!store.enAid;
    t.sessionsTotal += 1;
    if (on) t.sessionsWithEnOn += 1;
    t.last10Sessions.push(on);
    while (t.last10Sessions.length > 10) t.last10Sessions.shift();
    /* baseline: the log needs a row saying what the state WAS before any flip, or the
       first flip would look like the beginning of time. Costs one row, once, ever. */
    aidLogPush(t, on);
    aidLogPush(store.pyTel, !!store.pyAid);
    saveStore();
  }
  function enFadeEligible() {
    if (!enAidOn()) return false;
    if (!_enSessionCounted || _enPromptShown) return false;   // only after a real round, once per load
    var t = store.enTel, L = t.last10Sessions, i;
    if (L.length < EN_FADE_SESSIONS) return false;
    for (i = L.length - EN_FADE_SESSIONS; i < L.length; i++) if (!L[i]) return false;
    if (t.promptTerm === currentTermId() && t.promptTermCount >= EN_PROMPT_TERM_CAP) return false;
    if (t.lastPromptSessionIdx && (t.sessionsTotal - t.lastPromptSessionIdx) < EN_PROMPT_COOLDOWN) return false;
    return true;
  }
  /* An invitation, never an instruction (SDT): 拒绝没有代价，接受后随时可以
     重开，重开也不会立刻再被问一次（cooldown 以「提示过」计算，不看结果）。
     ⚠️ 文案与语气仍待 owner 定案（设计文档开放项 1）。 */
  function maybeEnFadePrompt() {
    if (!enFadeEligible()) return;
    _enPromptShown = true;
    var t = store.enTel, term = currentTermId();
    t.promptCount += 1;
    t.lastPromptSessionIdx = t.sessionsTotal;
    if (t.promptTerm !== term) { t.promptTerm = term; t.promptTermCount = 0; }
    t.promptTermCount += 1;
    saveStore();
    var ov = popOverlay(
      '<div class="pop-title">🌱 要不要试试关掉英文？</div>' +
      '<div class="pop-body">你已经用英文提示学了一阵子了。<br>' +
      '要不要先关掉，自己看看中文认不认得？<br>' +
      '<span style="color:#5A7080">看不懂随时可以再打开（右上角的 <b>中/EN</b>），不会扣分，也不会影响成绩。</span>' +
      '<br><br><span class="enlab-always">Want to try it without the English? ' +
      'You can turn it back on any time with the 中/EN button.</span></div>' +
      '<div class="nav-row"><button class="nav-btn" id="enKeep">我再用一阵子</button>' +
      '<button class="nav-btn primary" id="enTry">试试关掉</button></div>');
    ov.querySelector("#enKeep").onclick = function () { ov.remove(); };
    ov.querySelector("#enTry").onclick = function () {
      store.enAid = false;
      store.enTel.manualOffCount += 1;
      aidLogPush(store.enTel, false);
      saveStore(); applyEnAid(); ov.remove();
      var b = document.getElementById("tbEn");
      if (b) { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); }
      toast("好，先自己试试看。看不懂就按右上角的 中/EN");
    };
  }

  /* 决定四 · 动线编号: a small permanent numeral on the groups of a genuinely
     multi-step decision flow (范围 → 方式 → 营地 → 设置 → 出发). Deliberately
     NOT used on 排行榜 / 成就墙 / 我的词山 — those are destinations with no
     correct order, and numbering them would teach students that the numbers
     mean nothing. Numbering restarts per SCREEN (each screen is a self-
     contained set of choices), and optional aids (学习支援/拼音辅助) are never
     numbered — they are not steps. */
  function stepNo(n) { return '<span class="step-no">' + n + '</span>'; }

  /* 拼音辅助 lives in the TOPBAR (owner 2026-08-14), beside 中/EN, instead of
     being a per-screen rail control. It is a standing preference like the
     English aid, so it belongs in the same place on every screen rather than
     appearing and disappearing depending on which mode you are in — and a
     student who needs it mid-round no longer has to hunt for it.
     Available wherever pyAidAvailable() is true (G1/G2/G3; never HCL). */
  function pyAidToggleHtml() { return ""; }        // retired: the rail no longer carries it
  function wirePyAidToggle(onToggle) { _pyApply = onToggle || null; }
  function pyToggleHtml() {
    if (!pyAidAvailable()) return "";
    return '<button class="tb-py' + (store.pyAid ? " on" : "") + '" id="tbPy" ' +
      'title="拼音辅助" aria-label="拼音辅助 Show pinyin" ' +
      'aria-pressed="' + (store.pyAid ? "true" : "false") + '">' +
      '<span class="tb-py-zh">拼</span><span class="tb-py-lab">拼音' + pyl("拼音") + enli("拼音") + '</span></button>';
  }
  /* the CURRENT screen's "pinyin changed, redraw yourself" hook. Cleared by
     setTopbar and re-set by whichever screen has a pinyin surface, so a screen
     that has none simply flips the stored preference and nothing else. */
  var _pyApply = null;
  function wirePyToggle() {
    var b = document.getElementById("tbPy");
    if (!b) return;
    b.onclick = function () {
      store.pyAid = !store.pyAid;
      aidLogPush(store.pyTel, store.pyAid);
      saveStore();
      b.classList.toggle("on", store.pyAid);
      b.setAttribute("aria-pressed", store.pyAid ? "true" : "false");
      applyPyAid();                       // interface pinyin: one class flip
      if (_pyApply) { try { _pyApply(); } catch (e) {} }
    };
  }
  function wireDiff(state) {
    // takes effect on the current question — mid-round switching stays allowed
    wireDiffSlider(function () { renderCloze(state); });
    /* ⚠️ NO wirePyAidToggle here any more. 拼音 is a CSS gate now (see qHtml),
       so the toggle needs no redraw — and the redraw this line used to do was
       destructive: toggling AFTER answering re-rendered the question and threw
       away the feedback, the .right marking and the 下一题 button. */
  }
  /* E2: anti-mashing — briefly disable 下一题 after an MCQ answer so a mashed
     tap can't skip past the right-answer feedback. Sprint keeps its own 260ms
     auto-advance untouched (timed mode; a forced pause would penalise the
     game's own pacing) — this only ever wraps a manual 下一题 button. */
  function dwellGate(btn, ms) {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    setTimeout(function () {
      if (!btn.isConnected) return;
      btn.disabled = false;
      btn.removeAttribute("aria-disabled");
      btn.focus();
    }, ms);
  }
  /* 填空挑战 options are drawn ONCE per question and cached on state.
     A re-render (拼音辅助 toggle, mid-round difficulty switch) must never redraw
     them: a fresh draw keeps the answer and swaps the distractors, so the one
     option that survives the reshuffle IS the answer — a student could score
     without reading anything. The distractor pool is drawn at FULL width once
     and then sliced, so switching difficulty widens or narrows the same set
     instead of dealing a new hand (which would leak the answer the same way).
     Cache key is question index + word id, so a replayed round never inherits
     a previous round's options. */
  var MAX_CLOZE_OPTS = 4;
  function clozeOpts(state, w, n) {
    var key = state.i + "|" + w.id;
    if (state._optsFor !== key) {
      state._optsFor = key;
      /* state.pool is set only by the scoped rounds (板块挑战): a student whose
         复习范围 is a single unit would otherwise get too few distractors when
         challenging a 板块 from elsewhere on the 成就墙. */
      state._pool = distractorsFor(w, state.pool || scopedWords(), MAX_CLOZE_OPTS - 1);
      state._optsN = 0;
      state._opts = null;
    }
    if (state._optsN !== n || !state._opts) {
      state._optsN = n;
      state._opts = shuffle([w].concat(state._pool.slice(0, n - 1)));
    }
    return state._opts;
  }
  function renderCloze(state) {
    /* ⚠️ 试炼是一道**关卡**，不是一次练习（owner 2026-08-23：年度挑战 改成填空）。
       所以它**不吃 挑战难度 那根滑杆**：同一场试炼对每个学生必须是同一场。
       跟着滑杆走的话，推到 两个选项 就是一场送分，推到 拼音输入 又变成另一门考试——
       而这一关的奖品（神兽头像）是全站唯一按「全对」发的东西。
       固定四选一，与它取代的 华文解释 MCQ 逐格相同，只是题面换成了句子。 */
    var trial = !!state.gym;
    setFbCtx(trial ? "年度试炼" : "填空挑战", state.seq[state.i]);
    var w = state.seq[state.i];
    /* the blank is non-CJK, so it survives rubyText untouched and the
       existing __ -> <u></u> swap still lands on it */
    var qtext = qHtml(w.cloze, w.clozePy).replace(/_{2,}/g, "<u></u>");
    var pyMode = !trial && store.diff === "pinyin";
    var typing = !trial && (store.diff === "type" || pyMode);
    var html = '<div class="study">' +
      railHtml(state, trial ? "年度试炼" : "填空挑战",
               mdLine(trial ? "读句子，填出空格里的词语 · 全部答对才算通过"
                            : "读句子，填出空格里的词语"),
               trial ? "" : diffSelector()) +
      '<div class="stage"><div class="q-card">' +
      qTag(pyMode ? "读句子，打出空格里词语的拼音（不用声调，10% 历练值）" : typing ? "读句子，打出空格里的词语" : "选出最适当的词语填入空格") +
      '<div class="q-text' + qCls(qtext) + '">' + qtext + '</div>' +
      '<div class="q-foot">' + ttsBtnHtml("ttsS", "朗读句子") + '</div></div>';

    if (typing) {
      html += '<div class="answer-row">' +
        '<input class="answer-input" id="ans" autocomplete="off" placeholder="' + (pyMode ? "输入拼音（不用声调）…" : "输入词语…") + '">' +
        '<button class="check-btn" id="chk">检查' + pyl("检查") + enli("检查") + '</button></div>' +
        '<button class="hint-btn" id="hint">' + (function (h) { return h + pyl(h) + enl(h); })(pyMode ? "提示：显示词语" : "提示：显示拼音") + '</button>';
    } else {
      var n = trial ? 4 : parseInt(store.diff, 10);   // 试炼固定四选一，见上
      var opts = clozeOpts(state, w, n);
      html += '<div class="opts n' + n + '" id="opts">' +
        opts.map(function (o, idx) {
          return '<div class="opt-row"><button class="opt" data-i="' + idx + '"><span class="letter">' +
            String.fromCharCode(65 + idx) + '</span>' + esc(o.w) +
            optPyHtml(o.py) + '</button>' +
            '<button class="opt-tts" data-i="' + idx + '" title="朗读" aria-label="朗读选项">🔊</button></div>';
        }).join("") + '</div>';
    }
    html += '<div class="feedback" id="fb"></div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›' + pyl("下一题") + enli("下一题") + '</button></div></div></div>';
    view().innerHTML = html;
    flashMult(state);

    wireDiff(state);
    document.getElementById("ttsS").onclick = function () { speakCloze(w.cloze, w.clozePy); };
    function finish(right, attempt) {
      var entering = state.streak, wasMastered = !!store.mastered[w.id];
      /* 打拼音 is practice only: no 连对/bestStreak, no 历练值, no mastery. */
      if (!pyMode) noteStreak(state, right);
      bump("cloze", right);
      if (right) {
        state.correct++;
        if (!pyMode) {
          var gained = scoreCorrect(w, CLOZE_BASE[store.diff] || 2, attempt || 1, entering, wasMastered);
          awardLingLu(w, "cloze");   // before gymNote, or the 待巩固 补偿 is lost
          markMastered(w);        // fires the +10 first-mastery bonus inside
          gymNote(w.id);
          showGain(gained);
        } else {
          /* 打拼音: full 灵露 (2026-08-14 economy doc, tier 2x with the 拼音
             modifier) and — since 2026-08-14 — 10% of the 历练值 (PY_PRACTICE_MULT).
             Still no 海拔: mastery stays gated on understanding, not spelling. */
          awardLingLu(w, "pinyin");
          showGain(scoreCorrect(w, CLOZE_BASE.type, attempt || 1, entering, wasMastered, PY_PRACTICE_MULT));
        }
        sfxOk();
      }
      document.getElementById("nextRow").style.display = "flex";
      var nx = document.getElementById("next");
      nx.onclick = function () { state.i++; renderStep(state); };
      if (typing) {
        nx.focus();               // typing already required real effort — no extra gate
      } else {
        dwellGate(nx, 800);       // E2: brief disable so a mashed tap can't skip past feedback
      }
    }
    if (typing) {
      var ans = document.getElementById("ans");
      var done = false;
      ans.focus();
      document.getElementById("hint").onclick = function () { this.textContent = pyMode ? ("词语：" + w.w) : ("拼音：" + w.py); };
      function submit() {
        if (done) return;
        var val = ans.value.trim();
        if (!val) return;
        var fb = document.getElementById("fb");
        var okAns = pyMode ? (tonelessPy(val) === tonelessPy(w.py)) : (val === w.w);
        var tail = pyMode ? "" : esc(w.zh);   // pinyin mode: show word + pinyin, no 释义 clutter
        if (okAns) {
          done = true;
          fb.className = "feedback show ok";
          /* ⚠️ 拼音输入模式例外：那一模式考的就是拼音，关掉等于不给答案。 */
          fb.innerHTML = "✔ 正确！<b>" + esc(w.w) + "</b>" +
            (pyMode ? "（" + esc(w.py) + "）" : ansPyHtml(w.py)) + tail;
          finish(true, ans.dataset.tried ? 2 : 1);
        } else {
          ans.classList.remove("shake"); void ans.offsetWidth; ans.classList.add("shake");
          sfxBad();
          if (!ans.dataset.tried) { ans.dataset.tried = "1"; return; }
          done = true;
          setTimeout(function () {
            if (!fb.isConnected) return;
            fb.className = "feedback show bad";
            fb.innerHTML = "✘ 正确答案：<b>" + esc(w.w) + "</b>" +
              (pyMode ? "（" + esc(w.py) + "）" : ansPyHtml(w.py)) + tail;
            sayAnswer(w);
            finish(false);
          }, 900);
        }
      }
      document.getElementById("chk").onclick = submit;
      ans.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    } else {
      var locked = false;
      Array.prototype.forEach.call(view().querySelectorAll(".opt-tts"), function (b) {
        b.onclick = function () { var o = state._opts[parseInt(b.getAttribute("data-i"), 10)]; speak(o.w, o.py); };
      });
      Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
        btn.onclick = function () {
          if (locked) return; locked = true;
          var chosen = state._opts[parseInt(btn.getAttribute("data-i"), 10)];
          var right = chosen.id === w.id;
          var fb = document.getElementById("fb");
          function reveal() {
            Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
              var o = state._opts[bi];
              if (o.id === w.id) {
                b.classList.add("right");
                if (!b.querySelector(".py")) b.innerHTML += optPyHtml(o.py);
              } else if (o === chosen) b.classList.add("wrong");
            });
            fb.className = "feedback show " + (right ? "ok" : "bad");
            fb.innerHTML = (right ? "✔ 正确！" : "✘ 正确答案：") + "<b>" + esc(w.w) + "</b>" + ansPyHtml(w.py) + esc(w.zh);
            finish(right);
          }
          if (right) { reveal(); }
          else {
            btn.classList.add("wrong");
            sfxBad();
            setTimeout(function () { if (!fb.isConnected) return; reveal(); sayAnswer(w); }, 900);
          }
        };
      });
    }
  }

  /* ---------- MCQ (华文解释 / 英文翻译) ---------- */
  function renderMcq(state) {
    setFbCtx("选择题", state.seq[state.i]);
    var w = state.seq[state.i];
    var isZh = state.mode === "zhmcq";
    var prompt = isZh ? w.zh : w.en;
    var qprompt = isZh ? qHtml(prompt, w.zhPy) : esc(prompt);
    var opts = shuffle([w].concat(distractorsFor(w, state.pool || scopedWords(), 3)));
    view().innerHTML = '<div class="study">' +
      railHtml(state, isZh ? "华文解释" : "英文翻译", mdLine(isZh ? "看释义，选出词语" : "看英译，选出词语")) +
      '<div class="stage"><div class="q-card">' +
      qTag(isZh ? "看释义，选出词语" : "看英文，选出词语") +
      /* 英文翻译 prompts are English — nothing to annotate */
      '<div class="q-text mcq' + qCls(qprompt) + '">' + qprompt + '</div>' +
      (isZh ? '<div class="q-foot">' + ttsBtnHtml("ttsP", "朗读释义") + '</div>' : "") +
      '</div>' +
      '<div class="opts n4" id="opts">' +
      opts.map(function (o, idx) {
        return '<div class="opt-row"><button class="opt" data-i="' + idx + '"><span class="letter">' +
          String.fromCharCode(65 + idx) + '</span>' + esc(o.w) +
          optPyHtml(o.py) + '</button>' +
          '<button class="opt-tts" data-i="' + idx + '" title="朗读" aria-label="朗读选项">🔊</button></div>';
      }).join("") + '</div>' +
      '<div class="feedback" id="fb"></div>' +
      '<div class="nav-row" id="nextRow" style="display:none">' +
      '<button class="nav-btn primary" id="next">下一题 ›' + pyl("下一题") + enli("下一题") + '</button></div></div></div>';
    flashMult(state);

    var tp = document.getElementById("ttsP");
    if (tp) tp.onclick = function () { speak(w.zh, w.zhPy); };
    var locked = false;
    Array.prototype.forEach.call(view().querySelectorAll(".opt-tts"), function (b) {
      b.onclick = function () { var o = opts[parseInt(b.getAttribute("data-i"), 10)]; speak(o.w, o.py); };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (btn) {
      btn.onclick = function () {
        if (locked) return; locked = true;
        var chosen = opts[parseInt(btn.getAttribute("data-i"), 10)];
        var right = chosen.id === w.id;
        var fb = document.getElementById("fb");
        function reveal() {
          var entering = state.streak, wasMastered = !!store.mastered[w.id], gained = 0;
          noteStreak(state, right);
          if (right) {
            state.correct++; sfxOk();
            /* ⚠️ 华文解释 与 英文翻译 NOW CONFER MASTERY (owner 2026-08-16, HANDOFF
               §1). The popover has always told students these four modes count;
               the code only credited 填空挑战 and 攀山快答. The owner ruled that the
               CODE was wrong, not the copy — so the popover is untouched and this
               branch gained markMastered.
               ⚠️ ORDER IS LOAD-BEARING, and it was wrong here before: gymNote used
               to run FIRST, which clears the word from 待巩固 and therefore threw
               away the 复习补偿 that awardLingLu grants for recovering one. Same
               order as the cloze branch now: score → 灵露 → mastery → gymNote.
               The +10 first-mastery bonus fires inside markMastered, once per word
               ever, guarded by store.pts.masteryAwarded. */
            gained = scoreCorrect(w, PTS_BASE[state.mode] || 2, 1, entering, wasMastered);
            awardLingLu(w, state.mode);
            markMastered(w);
            gymNote(w.id);
          }
          else if (state.gym || state.bchal) state.wrong[w.id] = 1;
          bump(state.mode, right);
          Array.prototype.forEach.call(view().querySelectorAll(".opt"), function (b, bi) {
            var o = opts[bi];
            if (o.id === w.id) {
              b.classList.add("right");
              if (!b.querySelector(".py")) b.innerHTML += optPyHtml(o.py);
            } else if (o === chosen) b.classList.add("wrong");
          });
          fb.className = "feedback show " + (right ? "ok" : "bad");
          fb.innerHTML = (right ? "✔ 正确！" : "✘ 正确答案：") + "<b>" + esc(w.w) + "</b>" + ansPyHtml(w.py) + esc(w.zh);
          showGain(gained);
          document.getElementById("nextRow").style.display = "flex";
          var nx = document.getElementById("next");
          nx.onclick = function () { state.i++; renderStep(state); };
          dwellGate(nx, 800);
        }
        if (right) { reveal(); }
        else {
          btn.classList.add("wrong");
          sfxBad();
          setTimeout(function () { if (!fb.isConnected) return; reveal(); sayAnswer(w); }, 900);
        }
      };
    });
  }

  /* ---------- result ---------- */
  function renderResult(state) {
    if (state.gym) return renderGymResult(state);
    if (state.bchal) return renderBadgeTrialResult(state);
    if (state.comp) return renderCompResult(state);
    if (state.fromWordList) {
      var w0 = state.seq[0];
      var ok = state.correct > 0;
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + (ok ? "✓ 已掌握" : "再接再厉") + '</div>' +
        '<div class="sub">' + esc(w0.w) + '　' + esc(w0.py) + '</div>' +
        '<div class="msg">' + esc(w0.zh) + '</div>' +
        '<div class="nav-row"><button class="nav-btn" id="again">再练一次</button>' +
        achLinkHtml() +
        '<button class="nav-btn primary" id="home">‹ 回词语表</button></div></div>';
      document.getElementById("again").onclick = function () { practiceWord(w0.id); };
      document.getElementById("home").onclick = function () { renderWordList("all"); };
      wireAchLink();
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
      '<button class="nav-btn" id="again">再来一局' + pyl("再来一局") + enli("再来一局") + '</button>' +
      achLinkHtml() +
      '<button class="nav-btn primary" id="home">' + hubLabelHtml() + '</button></div></div>';
    document.getElementById("again").onclick = function () { startMode(state.mode); };
    document.getElementById("home").onclick = backToHub;
    wireAchLink();
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
    /* ⚠️ owner 2026-08-23：「年度挑战 need to be fill in the blanks and not
       chinese definition」。zhmcq（看释义选词）→ cloze（读句子填空）。
       ⚠️ 前提是**每个词都有填空句**——四个源流 3,741 条实测全有，
       所以题数（本级 30 + 每个下级 10）一条都不会掉。
       ⚠️ 板块试炼（bchal）**没有跟着改**：owner 只点名了年度挑战。
       两者原本刻意同形，现在分叉了；要统一得 owner 再说一句。 */
    var state = { mode: "cloze", seq: g.seq, i: 0, correct: 0, revealed: false,
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
      /* the 神兽 avatar unlocks off store.gym[level] alone (HANDOFF §3.1) — nothing
         is written to the profile here, so the student keeps whatever avatar they
         are already wearing unless they press the button below */
      var canWear = !!(pet && window.WSProfile);
      sfxBadge();   // reward chime; the result screen below carries the celebration
      view().innerHTML = '<div class="result">' +
        '<div class="big">🏅 ' + esc(level) + ' 年度试炼通过！</div>' +
        '<div class="sub">' + state.correct + ' / ' + total + ' 全对</div>' +
        (pet ? '<div class="msg">登山伙伴加入队伍：' + pet.emoji + ' <b>' + esc(pet.name) + '</b>' +
               '<br><span style="font-size:12px">新头像「' + esc(pet.name) + '」已解锁，攀山快答里也会换成它</span></div>' : '') +
        '<div class="nav-row">' +
        (canWear ? '<button class="nav-btn" id="wearPet">换上 ' + pet.emoji + ' ' + esc(pet.name) + '</button>' : '') +
        achLinkHtml() +
        '<button class="nav-btn primary" id="home">回到词山</button></div></div>';
      wireAchLink();
      if (canWear) document.getElementById("wearPet").onclick = function () {
        window.WSProfile.save({ avatarId: pet.avatarId });
        toast("头像已换成 " + pet.emoji + " " + pet.name);
        startMountain();
      };
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
      '<div class="msg">这些词进入「待巩固」，在学习中答对即可重开试炼：<br><b>' + words.join("、") + '</b><br>' +
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
  /* 2026-08-14 (economy doc §2): the 8-step speed table and the 固定/递增 toggle
     are GONE. One mode only — speed ramps with TIME inside a round and restarts
     from base every round, so a student playing five rounds is never quietly
     handed a harder course than someone playing one.
     ⚠️ These five numbers are the tuning surface the doc asked for (it left the
     curve to feel-testing). RAMP_SECS is how long to reach full speed. */
  var RAIN_BASE_FALL = 12, RAIN_MAX_FALL = 62;      // px/s
  var RAIN_BASE_SPAWN = 5600, RAIN_MIN_SPAWN = 2000; // ms between drops
  var RAIN_RAMP_SECS = 90;
  function rainCfgAt(elapsedS) {
    var p = Math.min(1, Math.max(0, elapsedS) / RAIN_RAMP_SECS);
    return { fall: RAIN_BASE_FALL + (RAIN_MAX_FALL - RAIN_BASE_FALL) * p,
             spawn: RAIN_BASE_SPAWN - (RAIN_BASE_SPAWN - RAIN_MIN_SPAWN) * p,
             pct: Math.round(p * 100) };
  }
  /* 排行榜扩展 (DESIGN_排行榜扩展_周榜与游戏数据):
     - Only a 90-second 攀山快答 run and a 递增速度 词雨 run count toward the two
       speed boards, so everyone is ranked on the same course. Other configs stay
       personal-best-only.
     - A wrong sprint answer costs 3s of the run (anti-mashing, D-1 locked).
       词雨 gets NO extra penalty (owner 2026-08-13): every second spent spamming
       guesses is a second words are falling unattended, and those already cost a
       life — the deterrent is indirect but real, in the currency already on screen. */
  var SPRINT_RANKED_SECS = 90;
  var SPRINT_WRONG_PENALTY_MS = 3000;
  var RAIN_LIVES = 5;   // G-2: was 3 (students asked for more)
  /* how fast the runner chases the lowest word, px/s. Fast enough to look eager,
     slow enough that it visibly lags a drop on the far side — tuning dial. */
  var RAIN_RUN_SPD = 300;
  /* ---------- 学习挑战 config (§2.1) ----------
     One entry for the three question-answering modes. Everything that used to be
     laid flat on the home page (题数) plus what used to be buried in the study
     rail (题型, 填空 difficulty) is chosen HERE, then the round starts. Difficulty
     is shown only when 填空 is the selected 题型 — the other two have no tiers. */
  var QUIZ_MODES = [
    { k: "cloze", label: "✍️ 填空挑战", zh: "填空挑战", desc: "读句子，填出空格里的词语" },
    { k: "zhmcq", label: "🔎 华文解释", zh: "华文解释", desc: "看释义，选出词语" },
    { k: "enmcq", label: "🌐 英文翻译", zh: "英文翻译", desc: "看英译，选出词语" }
  ];
  /* ---------- 数量选择滑杆 (owner 2026-08-14) ----------
     Quantity pickers used to be a stack of full-width tiles — five of them for
     每次题数 alone, which dominated the config screen. A slider says the same
     thing in one row. The range is indexed over the ALLOWED values (min 0, max
     n-1, step 1) rather than over the numbers themselves, so a drag can only
     ever land on a legal value and the steps stay evenly spaced even when the
     values are not (60/90/120).
     Only genuine quantities become sliders. 题型 and 挑战难度 stay as labelled
     tiles: they are named choices, not amounts, and a slider would hide their
     names behind a handle position. */
  function qtySlider(id, values, cur, fmt, gloss) {
    var i = values.indexOf(cur); if (i === -1) i = 0;
    /* ⚠️ The readout sits ABOVE the track, never beside it. In the first version
       it was a flex sibling of the range, so the track LENGTH changed with the
       label's width — 「⭐ 两个选项」 and 「⌨️ 打拼音 · 10% 历练值」 are wildly
       different widths, and the bar visibly grew and shrank as you dragged. The
       track is now always full width and only the text above it changes.
       Ticks are drawn per step so the stops are visible without end labels
       (which had the same variable-width problem, and wrapped to two lines). */
    var ticks = "";
    for (var k = 0; k < values.length; k++) ticks += '<i></i>';
    return '<div class="qty">' +
      '<b class="qty-val" id="' + id + 'Val">' + esc(fmt(cur)) + (gloss ? gloss(cur) : "") + '</b>' +
      '<div class="qty-track">' +
      '<div class="qty-ticks" aria-hidden="true">' + ticks + '</div>' +
      '<input type="range" class="qty-range" id="' + id + '" min="0" max="' + (values.length - 1) +
      '" step="1" value="' + i + '" aria-label="数量"></div></div>';
  }
  /* onPick fires on every move (input), so the readout tracks the thumb live. */
  function wireQtySlider(id, values, fmt, onPick, gloss) {
    var el = document.getElementById(id); if (!el) return;
    var out = document.getElementById(id + "Val");
    el.oninput = function () {
      var v = values[parseInt(el.value, 10)];
      /* innerHTML, not textContent: the readout for a NAMED tier carries its
         拼音/English gloss, and textContent would wipe it on the first drag. */
      if (out) out.innerHTML = esc(fmt(v)) + (gloss ? gloss(v) : "");
      onPick(v);
    };
  }

  function renderQuizConfig() {
    setTopbar("home", "");
    var m = store.quizMode || "cloze";
    var cur = QUIZ_MODES.filter(function (x) { return x.k === m; })[0] || QUIZ_MODES[0];
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">✍️ 学习挑战' + pyl("学习挑战") + enli("学习挑战") + '</div>' +
      '<div class="mode-desc">' + mdLine(cur.desc) +
        mdLine("答对可累积历练值；填空挑战答对还会提升海拔。") + '</div>' +
      '<div class="diff-label">' + stepNo(1) + '题型' + pyl("题型") + enl("题型") + '</div><div class="diff" id="qmodeSel">' +
      QUIZ_MODES.map(function (x) {
        return '<button class="dopt' + (x.k === m ? " on" : "") + '" data-m="' + x.k + '">' +
          '<span>' + x.label + labGloss(x.label) + '</span></button>';
      }).join("") + '</div>' +
      '<div class="diff-label">' + stepNo(2) + '每次题数' + pyl("每次题数") + enl("每次题数") + '</div>' +
      qtySlider("qlenSel", QUIZ_LENS, store.quizLen, function (n) { return n + " 题"; }) +
      (m === "cloze" ? diffSelector(3) : pyAidToggleHtml()) +
      '<div class="nav-row"><button class="nav-btn" id="back">\u2039 ' + hubLabelHtml(true) + '</button>' +
      '<button class="nav-btn primary" id="go">开始挑战 ›' + pyl("开始挑战") + enli("开始挑战") + '</button></div></div>';

    Array.prototype.forEach.call(view().querySelectorAll("#qmodeSel .dopt"), function (b) {
      b.onclick = function () { store.quizMode = b.getAttribute("data-m"); saveStore(); renderQuizConfig(); };
    });
    wireQtySlider("qlenSel", QUIZ_LENS, function (n) { return n + " 题"; },
      function (n) { store.quizLen = n; saveStore(); });
    /* the difficulty slider only exists for 填空; re-render so the panel reflects the pick */
    wireDiffSlider(renderQuizConfig);
    wirePyAidToggle(renderQuizConfig);
    document.getElementById("back").onclick = backToHub;
    document.getElementById("go").onclick = function () { startMode(store.quizMode || "cloze"); };
  }

  /* showPyIn: the 拼音 toggle is a LOCAL, unsaved choice, and picking a 道具
     re-renders this screen. Threading it back through means a student who turns
     拼音 off and then taps 糖葫芦 does not silently get it back on. */
  function renderRainConfig(showPyIn) {
    setTopbar("home", "");
    var best = store.best.rain || 0;
    var showPy = showPyIn === undefined ? true : !!showPyIn;
    /* ⚠️ the 生命 readout MOVES when 糖葫芦 goes into a slot, or the picker reads as
       decoration. 锦囊 is deliberately not previewed — it rolls at spend time, and
       promising a heart it might not become is worse than saying nothing. */
    var livesNow = RAIN_LIVES + equippedItems("rain").filter(function (k) {
      var it = itemByKey(k); return it && it.eff === "life";
    }).length;
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">\ud83c\udf27\ufe0f 词雨灵露' + pyl("词雨灵露") + enli("词雨灵露") + '</div>' +
      '<div class="mode-desc">' + mdLine("词语化作灵雨随风而落，趁它落地前打出，化为灵露收进宝缸！") +
        mdLine("字数越多、接得越高、连击越长，得分越高。") +
        mdLine("接住的词都会化成灵露，可在「我的词山 · 你的营地」兑换装备。", campLingluIcon() + " ") +
        mdLine("雨势会越下越急 —— 每一局都从最慢开始。") + '</div>' +
      '<div class="diff-label">拼音辅助' + pyl("拼音辅助") + enl("拼音辅助") + '</div><div class="diff">' +
      '<button class="dopt' + (showPy ? " on" : "") + '" id="pySel"><span>在词语下方显示拼音' +
      pyl("在词语下方显示拼音") + enl("在词语下方显示拼音") + '</span></button></div>' +
      /* each label keeps its own value ON the same line, with the glosses under the
   whole item — otherwise the block gloss splits 「本机最高分」 from its number */
      '<div class="rain-best"><span class="rb-item">本机最高分：<b>' + best + '</b>' +
      pyl("本机最高分") + enl("本机最高分") + '</span>' +
      '<span class="rb-item">\u2764\ufe0f 生命 ' + livesNow +
      pyl("生命") + enl("生命") + '</span></div>' +
      itemPickerHtml("rain") +
      '<div class="nav-row"><button class="nav-btn" id="back">\u2039 ' + hubLabelHtml(true) + '</button>' +
      '<button class="nav-btn primary" id="go">开始游戏 \u203a' + pyl("开始游戏") + enli("开始游戏") + '</button></div></div>';
    document.getElementById("pySel").onclick = function () {
      showPy = !showPy; this.classList.toggle("on", showPy);
    };
    wireItemPicker("rain", function () { renderRainConfig(showPy); });
    document.getElementById("back").onclick = backToHub;
    document.getElementById("go").onclick = function () { startRain(showPy); };
  }
  /* roomCode: 同伴挑战 PK rooms pass it so it stays visible for the WHOLE session
     (not just the lobby) — a friend who drops can glance at any player's screen and
     rejoin. Solo play passes nothing and the element is not rendered at all. */
  function startRain(showPy, roomCode) {
    var pool = scopedWords().filter(function (w) { return w.w.length <= 4; });
    if (pool.length < 8) {
      alert("所选范围内适合词雨灵露的词语不足（需要至少 8 个 1–4 字的词语）。请扩大复习范围。");
      return;
    }
    /* ⚠️ A ROOM ROUND TAKES NOTHING. Both players have to run the same sky, so
       同伴挑战 gets an empty kit — see the note above takeItems(). Solo rounds spend
       here, at the top, before a single word has fallen. */
    var kit = roomCode ? emptyKit() : takeItems("rain");
    setTopbar("home", "");
    showFab(false);        // timed round: no stray taps, and 词雨 words land here
    view().innerHTML = orientHintHtml("landscape") +
      '<div class="rain-shell">' +
      /* room code lives FIRST in the DOM so the portrait stack pins it at the very
         top (DESIGN_peer_pk_duel §3): the whole point is glanceability on a
         reconnect, and below the fold on a phone defeats that. In landscape CSS
         moves it into the right column. Absent entirely in solo play. */
      (roomCode ? '<div class="rain-code" id="rCode">房间号 <b>' + esc(roomCode) + '</b></div>' : "") +
      '<div class="rain-area" id="rArea"><div class="rain-fx"></div><div class="rain-sea"></div>' +
      '<div class="rain-runner" id="rRunner"></div>' +
      '<div class="rain-barrel" id="rBarrel"><div class="rain-water" id="rWater"></div>' +
      '<div class="rain-drops" id="rDrops">✨ 0</div></div></div>' +
      '<div class="rain-right">' +
      '<div class="rain-hud">' +
      '<span>得分' + pyl("得分") + enli("得分") + ' <b id="rScore">0</b></span>' +
      '<span>连击' + pyl("连击") + enli("连击") + ' <b id="rCombo">×1</b></span>' +
      '<span>波次' + pyl("波次") + enli("波次") + ' <b id="rWave">1</b></span>' +
      '<span id="rLives">' + "❤️".repeat(RAIN_LIVES + kit.life) + '</span></div>' +
      itemBarHtml(kit) +
      '<div class="rain-input-row">' +
      '<input class="answer-input" id="rInput" autocomplete="off" placeholder="打出词语，收集灵露…">' +
      '<button class="check-btn" id="rFire">收集' + pyl("收集") + enli("收集") + '</button></div></div></div>';

    var area = document.getElementById("rArea");
    var input = document.getElementById("rInput");
    var live = [];          // {el, w, x, y, sway, phase}
    var maxLives = RAIN_LIVES + kit.life;                   // 糖葫芦
    var score = 0, combo = 1, cleared = 0, lives = maxLives, wave = 1, dew = 0;
    var shield = kit.shield;                                // 油纸伞, one combo-break each
    var freezeT = 0;                                        // 定风珠, seconds of stopped sky
    var fallMul = Math.pow(RAIN_SLOW_MUL, kit.slow);        // 羽扇
    function paintLives() {
      document.getElementById("rLives").textContent =
        "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, maxLives - Math.max(0, lives)));
    }
    /* 油纸伞 eats ONE combo reset, from either source (a word lost to the sea or a
       wrong guess). It never stops the life loss — it is a combo shield and the
       shelf says so. Both callers go through here so the two can never diverge. */
    function breakCombo() {
      if (shield > 0) {
        shield--;
        toast("🌂 油纸伞挡下一次连击中断" + (shield ? "（还剩 " + shield + " 次）" : ""));
        return;
      }
      combo = 1;
      document.getElementById("rCombo").textContent = "×1";
    }
    /* §3 flags that the pacing was tuned for a full-width area and needs a retune
       after the split. Rather than guess new numbers blind, both knobs are now
       DERIVED from the area's real size, so the feel is layout-independent:
       - crowding scales with WIDTH (a 62% column has fewer lanes than full width)
       - fall speed scales with HEIGHT, so a word always takes the same TIME to
         reach the sea whether the area is short (portrait) or tall (landscape).
       Without the height term the split would have made the game quietly easier,
       which is exactly the kind of drift a "just resize it" change causes. */
    var RAIN_REF_H = 520;      // the height the 12–62 px/s numbers were tuned at
    function maxLiveNow() {
      var wpx = area.clientWidth || window.innerWidth;
      return Math.max(3, Math.min(7, Math.round(wpx / 155)));
    }
    function fallScale() { return Math.max(0.6, Math.min(1.6, (area.clientHeight || RAIN_REF_H) / RAIN_REF_H)); }
    var running = true, over = false, composing = false;
    var lastT = null, spawnTimer = 0, raf = null, playedS = 0;   // playedS drives the ramp (pauses don't)
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
    /* ---------- 接雨的角色 (owner 2026-08-16) ----------
       The student's avatar runs along the sea line chasing whatever is closest to
       landing, and celebrates on every catch. Same 6-frame sheets 攀山快答 and the
       dock's angler use (art/sprite/avatar) — ⚠️ never art/avatar/*.png (square,
       faces LEFT) or art/camp/pet_*.png.
       Drawn as a DOM background-position sprite rather than on a canvas, because
       词雨 is a DOM field; 600% wide sheet, one frame per 20% step.
       ⚠️ Cell width is per creature, so aspect-ratio is written once the sheet
       decodes — never transcribed. No avatar, or a 404, simply means no runner. */
    var runEl = document.getElementById("rRunner");
    var runSheet = avatarSheet();
    var runX = null, runCel = 0;
    if (runEl && runSheet) {
      runEl.style.backgroundImage = "url('" + runSheet.src + "')";
      var runFit = function () {
        if (runSheet.naturalWidth) {
          runEl.style.aspectRatio = (runSheet.naturalWidth / 6) + " / " + runSheet.naturalHeight;
        }
      };
      if (runSheet.complete) runFit(); else runSheet.addEventListener("load", runFit);
      /* ⚠️ per-sheet size correction — the same problem 攀山快答 solves with
         avatarInk/AVATAR_INK_H, except this runner is a DOM element sized off the
         CELL, and the cells are not drawn to a common size: 沙僧 fills far less of
         its cell than 鼠 does, so at one height the monk looked half the rat's size
         (owner 2026-08-17). The canvas can measure ink at runtime; a background-image
         cannot, so the number comes from the measured table in profile.js. */
      runEl.style.setProperty("--av-k",
        (window.WSProfile && window.WSProfile.spriteScale)
          ? window.WSProfile.spriteScale(_avSpriteId) : 1);
    } else if (runEl) {
      runEl.style.display = "none";
    }
    function stepRunner(dt, t) {
      if (!runEl || !runSheet || !runSheet.naturalWidth) return;
      var W = area.clientWidth, rw = runEl.offsetWidth || 60;
      if (runX == null) runX = W / 2;
      /* chase the LOWEST word — the one about to be lost. That reads as urgency
         and, unlike chasing the newest, keeps the runner where the danger is. */
      var target = null, lowest = -1e9;
      for (var i = 0; i < live.length; i++) {
        if (live[i].y > lowest) { lowest = live[i].y; target = live[i].x + live[i].el.offsetWidth / 2; }
      }
      var dest = target == null ? W / 2 : Math.max(rw / 2, Math.min(W - rw / 2, target));
      var dx = dest - runX;
      var mv = (dx < 0 ? -1 : 1) * Math.min(Math.abs(dx), RAIN_RUN_SPD * dt);
      runX += mv;
      var moving = Math.abs(dx) > 3;
      runCel = Math.max(0, runCel - dt);
      var f = runCel > 0 ? 5 : (moving ? 1 + (Math.floor(t / 140) % 2) : 0);
      runEl.style.backgroundPositionX = (f * 20) + "%";
      /* the sheets face RIGHT, so running left is a mirror */
      runEl.style.transform = "translateX(" + Math.round(runX - rw / 2) + "px)" +
        (moving && mv < 0 ? " scaleX(-1)" : "");
    }

    function step(t) {
      if (!area.isConnected) { cancelAnimationFrame(raf); return; }
      if (!running) { lastT = t; raf = requestAnimationFrame(step); return; }
      if (lastT == null) lastT = t;
      var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      spawnTimer += dt * 1000;
      playedS += dt;
      /* one progressive course for everyone (2026-08-14): speed ramps with time
         PLAYED, so pausing to think never makes the next drop faster, and every
         round restarts from RAIN_BASE_FALL. */
      var cfgNow = rainCfgAt(playedS);
      /* 定风珠: the sky itself stops — words hold position and nothing new spawns.
         ⚠️ playedS still advances, so a freeze buys breathing room and never also
         rewinds the difficulty ramp (which would make it farmable). */
      if (freezeT > 0) freezeT = Math.max(0, freezeT - dt);
      var frozen = freezeT > 0;
      area.classList.toggle("is-frozen", frozen);
      var spawnEvery = cfgNow.spawn;
      if (!frozen && spawnTimer >= spawnEvery && live.length < maxLiveNow()) { spawnTimer = 0; spawn(); }
      var fall = frozen ? 0 : cfgNow.fall * fallScale() * fallMul;
      var seaY = area.clientHeight - 46;
      for (var i = live.length - 1; i >= 0; i--) {
        var o = live[i];
        o.y += fall * dt;
        o.phase += dt * 1.4;
        var x = o.x + Math.sin(o.phase) * o.sway; // space-invader drift
        o.el.style.transform = "translate(" + x + "px," + o.y + "px)";
        if (o.y > seaY) {
          splashAt(o.x + o.el.offsetWidth / 2);
          /* 玉葫芦: the word is still LOST — a life still goes, the score still does
             not move — but the 灵露 it was worth still reaches the barrel.
             ⚠️ lingLuFor(), never awardLingLu(): awardLingLu bumps store.wins, and a
             word that fell in the sea is not a word the student got right. Paying
             for a miss must never look like knowing it. */
          if (kit.salvage) {
            dew += lingLuFor(o.w, "rain") * kit.salvage;
            document.getElementById("rDrops").textContent = "✨ " + dew;
            document.getElementById("rWater").style.height = Math.min(100, dew * 2) + "%";
          }
          o.el.remove(); live.splice(i, 1);
          lives--; sfxLife(); breakCombo();
          paintLives();
          if (lives <= 0) return gameOver();
        }
      }
      stepRunner(dt, t);
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
      /* accuracy instrumentation: 词雨 had NO attempt tracking at all, so there
         was no data behind a future 打字准确率 board. A blank submit is skipped
         above — that's a stray keystroke, not a guess. */
      if (hit === -1) {
        bump("rain", false);
        sfxBad();                 // a wrong guess sounded like nothing at all
        input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
        breakCombo();
        return;
      }
      bump("rain", true);
      var o = live[hit];
      var altBonus = Math.max(0, Math.round((1 - o.y / area.clientHeight) * 20)); // clear it high
      score += o.w.w.length * 10 * combo + altBonus;
      dew += awardLingLu(o.w, "rain", true);   // banked at game over, not mid-round
      cleared++; combo = Math.min(5, combo + (cleared % 3 === 0 ? 1 : 0));
      if (cleared % 10 === 0) {
        wave++; document.getElementById("rWave").textContent = wave;
        toast("\ud83c\udf0a 第 " + wave + " 波来了！");
      }
      sfxOk();
      runCel = 0.75;              // celebrate frame + hop on every catch
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
      /* every run is the same progressive course now (2026-08-14), so every run
         is rankable — the old 固定速度 farming loophole no longer exists. */
      /* ⚠️ AN ITEM RUN NEVER SETS rainRamp. That board is the「同一套课程」board:
         everyone from the same base speed, everyone on RAIN_LIVES hearts. Two extra
         hearts or a 25% slower sky is a different course, so it stays off the board
         — while 本机最高分 above, a private number, still records it honestly. */
      if (!kit.any && score > (store.best.rainRamp || 0)) store.best.rainRamp = score;
      var bonusDew = kit.bonus ? Math.round(dew * LINGLU_ITEM_BONUS * kit.bonus) : 0;   // 算盘
      store.lingLu += dew + bonusDew;   // bank the run's 灵露 into the wallet
      saveStore();
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + score + '</div>' +
        '<div class="sub">词雨灵露 · 接住 ' + cleared + ' 词 · 第 ' + wave + ' 波</div>' +
        '<div class="msg">' + campLingluIcon() + ' 收获灵露 ' + (dew + bonusDew) +
          (bonusDew ? '（🧮 算盘 +' + bonusDew + '）' : "") +
          ' · 现有 ' + fmtNum(store.lingLu) + '（在词山营地兑换装备）</div>' +
        '<div class="msg">' + (isBest ? "🎉 本机新纪录！" : "本机最高分：" + Math.max(best, score)) + '</div>' +
        kitUsedLine(kit) +
        '<div class="nav-row">' +
        '<button class="nav-btn" id="again">再来一局' + pyl("再来一局") + enli("再来一局") + '</button>' +
        '<button class="nav-btn primary" id="home">' + hubLabelHtml() + '</button></div></div>';
      document.getElementById("again").onclick = function () { startRain(showPy, roomCode); };
      document.getElementById("home").onclick = backToHub;
    }
    document.getElementById("rFire").onclick = fire;
    /* 定风珠 is the only tappable item in 词雨; every other consumable is already
       applied by the time the first word falls. */
    wireItemBar(kit, function (eff) {
      if (eff !== "freeze" || over || !area.isConnected) return false;
      freezeT = RAIN_FREEZE_S;
      toast("🔮 定风珠 · 风停了 " + RAIN_FREEZE_S + " 秒");
      sfxOk();
      return true;
    });
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !composing) fire();
    });
    // Phones: drive the whole shell off the *visual* viewport so the game
    // stays fully visible above the on-screen keyboard (iOS keeps 100vh
    // fixed and scrolls the page instead — we pin scroll and shrink).
    function fitViewport() {
      wireOrientHint();
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
     Wordle rules at the character level: 12 guesses, green = right
     character right position, amber = in the word elsewhere, grey =
     not in the word. Answer pool = 4-character words in scope.
     HINT_REDESIGN_2026-08-15 (owner-approved): the old progressive-声母
     button let students stack all four 声母 + 释义 and reconstruct the
     answer without ever using the grading. Replaced with:
     · 12 guesses instead of 6, rows numbered
     · 声母 hint capped at the FIRST character only — never stacks to 4
     · three independent one-time hints: 声母(首字) · 词性 · 释义
     · hints cost 灵露 only — 历练值/海拔 are never spendable
     · every hint starts unbought (the old G2 freebie is gone — G3/HCL only)
     · 释义 auto-reveals free after HANDLE_DEF_SAFETY_ROW failed guesses so a
       stuck student always has a floor, without front-loading the answer
     ================================================================== */
  var HANDLE_MAX_ROWS = 12;
  var HANDLE_HINT_COST = { sm: 3, pos: 5, def: 15 };
  var HANDLE_DEF_SAFETY_ROW = 4;
  function startHandle() {
    var pool = scopedWords().filter(function (w) { return w.w.length === 4; });
    if (pool.length < 8) {
      alert("所选范围内的四字词语不足（至少需要 8 个）。请扩大复习范围。");
      return;
    }
    var answer = pool[Math.floor(Math.random() * pool.length)];
    /* Every hint starts unbought. There used to be a G2 branch here handing out
       首字声母 free, carried over from when 汉兜 was a G2/G3/HCL mode; 汉兜 has
       been G3/HCL-only since 2026-08-13, so it was unreachable code. Owner
       confirmed 2026-08-15: 汉兜 stays G3/HCL, the branch goes. */
    var state = {
      answer: answer, rows: [], done: false,
      hints: { sm: false, pos: false, def: false }
    };
    renderHandle(state);
  }
  function pyInitials(py) {
    return String(py).trim().split(/\s+/).map(function (s) {
      var m = s.toLowerCase().match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/);
      return m ? m[1] : s.charAt(0);
    });
  }
  function handleHintHtml(state) {
    /* 释义, once bought or auto-revealed by the safety net, gets its own
       line in the rail (too long to live inside a chip) */
    if (!state.hints.def) return "";
    return '<div class="handle-hints"><div class="hint-line">释义提示：' + esc(state.answer.zh) + '</div></div>';
  }
  function handleHintBarHtml(state) {
    var a = state.answer;
    var ini0 = pyInitials(a.py)[0];
    function chip(key, label, shortVal) {
      var got = state.hints[key];
      var labelHtml = esc(label) + pyl(label) + enli(label);
      if (got) return '<div class="handle-hintchip got">' + labelHtml + (shortVal ? "：" + esc(shortVal) : " ✓") + '</div>';
      if (state.done) return '<div class="handle-hintchip off">' + labelHtml + '</div>';
      var cost = HANDLE_HINT_COST[key];
      var afford = store.lingLu >= cost;
      /* a disabled button with no reason reads as broken, so the unaffordable
         state says what is missing rather than just greying out */
      return '<button class="handle-hintchip buy" data-hint="' + key + '"' +
        (afford ? "" : ' disabled title="灵露不够，去词雨灵露赚一些"') + '>' +
        labelHtml + ' · ' + cost + campLingluIcon() + '</button>';
    }
    return '<div class="handle-hintbar">' +
      chip("sm", "首字声母", ini0) +
      chip("pos", "词性", a.pos || "") +
      chip("def", "释义", "") +
      '</div>';
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
      '<div class="mode-name">🀄 词语汉兜' + pyl("词语汉兜") + enli("词语汉兜") + '</div>' +
      '<div class="mode-desc">' + mdLine("猜一个范围内的四字词语。") +
        mdLine("🟩 字对位置对") + mdLine("🟨 字对位置不对") +
        mdLine("⬜ 没有这个字") + '</div>' +
      '<div class="prog-big">' + state.rows.length + ' <small>/ ' + HANDLE_MAX_ROWS + ' 次</small></div>' +
      '<div class="streak">连胜' + pyl("连胜") + enli("连胜") + ' <b>' + streak + '</b> 🏮</div>' +
      handleHintHtml(state) + '</div>' +
      '<div class="stage">' + handleHintBarHtml(state) + '<div class="handle-grid">';
    /* ⚠️ TWO COLUMNS OF SIX (owner 2026-08-16), not one column of twelve.
       Twelve stacked rows needed a 62vh scroller, and the scroller was the whole
       reason the board could hide the row you had just played. Six-and-six fits
       any screen this game runs on, so the scroller and its scroll-into-view
       bookkeeping are both gone. Rows still read 1-12 in play order: down the
       left block first, then down the right. */
    var half = Math.ceil(HANDLE_MAX_ROWS / 2);
    for (var col = 0; col < 2; col++) {
      html += '<div class="handle-col">';
      for (var r = col * half; r < Math.min(HANDLE_MAX_ROWS, (col + 1) * half); r++) {
        html += '<div class="handle-row"><span class="handle-rownum">' + (r + 1) + '</span>';
        var row = state.rows[r];
        for (var c = 0; c < 4; c++) {
          if (row) html += '<div class="handle-tile ' + row.res[c] + '">' + esc(row.g[c]) + '</div>';
          else html += '<div class="handle-tile"></div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    if (!state.done) {
      html += '<div class="answer-row handle-input">' +
        '<input class="answer-input" id="hAns" autocomplete="off" maxlength="4" placeholder="输入四字词语…">' +
        '<button class="check-btn" id="hChk">猜！</button></div>' +
        '<div class="feedback" id="hFb"></div>';
    } else {
      var a = state.answer;
      html += '<div class="feedback show ' + (state.won ? "ok" : "bad") + '">' +
        (state.won ? "🎉 猜对了！" : "答案是：") + "<b>" + esc(a.w) + "</b>（" + esc(a.py) + "）" + esc(a.zh) + '</div>' +
        '<div class="nav-row"><button class="nav-btn" id="hAgain">再来一局</button>' +
        '<button class="nav-btn primary" id="hHome">' + hubLabelHtml() + '</button></div>';
    }
    html += '</div></div>';
    view().innerHTML = html;
    /* no scroll-into-view any more: 6+6 fits, so every row is always on screen.
       (The old code indexed .handle-grid children directly, which two columns
       would have broken anyway.) */
    if (state.done) {
      speak(state.answer.w, state.answer.py);
      document.getElementById("hAgain").onclick = startHandle;
      document.getElementById("hHome").onclick = backToHub;
      return;
    }
    Array.prototype.forEach.call(view().querySelectorAll(".handle-hintchip.buy"), function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute("data-hint"), cost = HANDLE_HINT_COST[key];
        if (state.hints[key] || store.lingLu < cost) return;
        store.lingLu -= cost;
        state.hints[key] = true;
        saveStore();
        tone(523, 0, 0.1);
        renderHandle(state);
      };
    });
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
        /* ⚠️ 灵露 FIRST, then 历练值 — scoreCorrect→bankPts is what calls
           saveStore(), so an award made after it stays in memory only and is
           lost if the student closes the tab on the win screen. Measured: a win
           left the wallet unchanged on disk. Same order as 填空挑战. */
        awardLingLu(state.answer, "handle");
        /* 汉兜 solved: base 6 + 1 per unused guess out of 12 (HINT_REDESIGN_2026-08-15) */
        scoreCorrect(state.answer, 6 + Math.max(0, HANDLE_MAX_ROWS - state.rows.length), 1, 0, !!store.mastered[state.answer.id]);
        sfxBadge();
      } else if (state.rows.length >= HANDLE_MAX_ROWS) {
        state.done = true; state.won = false;
        store.best.handle = 0; saveStore();
        sfxBad();
      } else {
        if (!state.hints.def && state.rows.length >= HANDLE_DEF_SAFETY_ROW) state.hints.def = true;
        sfxOk();
      }
      renderHandle(state);
    }
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !composing) submit(); });
    document.getElementById("hChk").onclick = submit;
  }


  /* ==================================================================
     组字成词 · character-assembly game (G2)
     Show the definition, tap the word's characters in order among
     decoys. Playground game: does not mark mastery.
     ================================================================== */
  /* §2.1: 2–8 characters. NINE AND OVER IS EXCLUDED ON PURPOSE — those entries
     are whole proverbs (「路遥知马力，日久见人心」), where the permutation space
     explodes (9! = 362,880) and tapping character by character stops being
     retrieval practice and becomes a copying exercise. That content wants a
     sentence-building mode, not this one. */
  var ASM_MIN_LEN = 2, ASM_MAX_LEN = 8;
  /* ⚠️ Also drop anything with internal punctuation. Widening to 8 characters let
     in a handful of half-proverbs (「吃一堑，长一智」「刀子嘴,豆腐心」— 4 entries
     across all four streams), and a comma has no business being a tappable tile:
     it would sit in the decoy pool too, and tapping it teaches nothing. Same
     reasoning as the 9-character exclusion, just a shorter fuse. */
  var ASM_PUNCT = /[，,、。．：:；;！!？?（）()“”"'’‘—…·\s]/;
  function startAssemble() {
    var pool = scopedWords().filter(function (w) {
      return w.w.length >= ASM_MIN_LEN && w.w.length <= ASM_MAX_LEN && !ASM_PUNCT.test(w.w);
    });
    if (pool.length < 10) {
      alert("所选范围内适合组字成词的词语不足（需要至少 10 个 2–8 字词语）。请扩大复习范围。");
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
  var ASM_PROMPTS = [
    { k: "def", label: "释义" },
    { k: "en", label: "英文" },
    { k: "cloze", label: "填空" },
    { k: "py", label: "拼音 · 10% 历练值" }
  ];
  function asmPromptSelector() {
    var cur = store.asmPrompt || "def";
    var html = '<div class="diff-label">出题方式' + pyl("出题方式") + enl("出题方式") + '</div><div class="diff">';
    ASM_PROMPTS.forEach(function (p) {
      html += '<button class="dopt' + (cur === p.k ? " on" : "") + '" data-ap="' + p.k + '"><span>' +
        p.label + pyl(p.label) + enl(p.label) + '</span></button>';
    });
    return html + '</div>';
  }
  /* 字块数量 (owner 2026-08-14): the chip grid used to be a hardcoded 9. Students
     differ a lot here — a weak reader drowns in 16 chips, a strong one finds 6
     trivial — so the count is theirs to pick, and it INCLUDES the answer's own
     characters, which is how the doc phrased it. */
  var ASM_SIZES = [6, 9, 12, 16, 20, 24];
  var ASM_MAX_CHIPS = 24;
  function asmChipCount() {
    var n = store.asmChips || 9;
    return ASM_SIZES.indexOf(n) === -1 ? 9 : n;
  }
  /* ⚠️ 字块数量 是字面数字（owner 2026-08-16）：滑杆上写 6 块，屏幕上就是 6 块。
     旧规则把滑杆读成「两字词语要几块」，每多一个字加两块，于是滑杆 6 配四字词语
     铺出 10 块、滑杆 9 铺出 13 块。旁边虽然有一行「本题 N 块」的说明，owner 仍然
     一眼判定是 bug：滑杆是量词控件，读数与画面不符就是坏的，一行注解救不回来。
     唯一保留的覆盖是**下限 len+2**：一个词至少要有两个干扰字，否则整块盘面就是
     答案按顺序摊在那里。下限顶上去时那行说明会讲明原因。
     ⚠️ 已知取舍，owner 已裁定接受：同一个设定下，长词的干扰字比短词少
     （八字成语 24 块只有 16 个干扰字，两字词语 24 块有 22 个），所以长词略容易。
     旧规则正是为了修这一点，但它是用「读数说谎」换来的，不划算。
     ⚠️ pool 是复习范围里的**不重复汉字总数**：范围很窄时（十个两字词语最多 20 个字）
     根本凑不出 24 块，`asmChips` 会静默少铺几块，读数又对不上了。所以上限也要跟着收，
     由调用方把 `state.chars.length` 传进来。 */
  function asmChipsFor(targetLen, pool) {
    var n = Math.max(targetLen + 2, Math.min(ASM_MAX_CHIPS, asmChipCount()));
    if (pool) n = Math.min(n, Math.max(targetLen, pool));
    return n;
  }
  function asmChipFmt(n) { return n + " 块"; }
  function asmSizeSelector(w, pool) {
    var set = asmChipCount();
    var eff = w ? asmChipsFor(w.w.length, pool) : set;
    /* 读数就是画面上的块数，所以这行说明只在**读数被覆盖**时才出现，两种情况各有说法：
       下限顶上去（词太长，至少要留两个干扰字），或者复习范围里的字根本不够铺。 */
    var note = "";
    if (w && eff > set) note = '本题 ' + eff + ' 块：' + w.w.length + ' 字词语，至少要留 2 个干扰字';
    else if (w && eff < set) note = '本题 ' + eff + ' 块：复习范围里只有 ' + pool + ' 个不同的字';
    return '<div class="diff-label">字块数量' + pyl("字块数量") + enl("字块数量") + '</div>' +
      qtySlider("asmSize", ASM_SIZES, set, asmChipFmt) +
      (note ? '<div class="asm-eff">' + note + '</div>' : "");
  }
  /* Column count for the chip grid: always a FULL rectangle, never a row with one
     orphan tile (owner 2026-08-14 — 16 chips at 3 columns gave 5 rows plus a
     single stray). Start from ceil(sqrt(n)) — which gives 3,3,4,4 for the four
     sizes — and walk outward to the nearest divisor when the pool is smaller than
     requested and n is awkward (e.g. a 7-chip pool becomes 7×1 rather than 3+3+1).
     Capped at 5 so a chip never gets too narrow to tap. */
  function asmCols(n) {
    if (n <= 3) return n || 1;
    var best = null;
    for (var cols = 3; cols <= 6; cols++) {
      var rows = Math.ceil(n / cols), last = n - (rows - 1) * cols;
      if (rows < 2) continue;
      if (last === 1) continue;                 // never a single orphan tile
      var score = Math.abs(cols - Math.sqrt(n)) - (n % cols === 0 ? 0.75 : 0);
      if (!best || score < best.score) best = { cols: cols, score: score };
    }
    return best ? best.cols : Math.min(5, Math.ceil(Math.sqrt(n)));
  }
  /* Draw the decoy pool ONCE per question and slice it, exactly as clozeOpts does
     for 填空挑战 — otherwise toggling 出题方式 or 字块数量 redraws the decoys while
     the answer's characters necessarily survive every draw, and two toggles hand
     the student the answer. Same 选项重洗=泄题 bug, different screen. */
  function asmChips(state, w, n) {
    var key = state.i + "|" + w.id;
    var target = w.w.split("");
    if (state._chipKey !== key) {
      state._chipKey = key;
      var inTarget = {};
      target.forEach(function (c) { inTarget[c] = 1; });
      state._decoys = shuffle(state.chars.filter(function (c) { return !inTarget[c]; }));
      state._chipArr = {};
    }
    if (!state._chipArr[n]) {
      var need = Math.max(0, n - target.length);
      state._chipArr[n] = shuffle(target.concat(state._decoys.slice(0, need)));
    }
    return state._chipArr[n];
  }
  /* 拼音 under a tile. ⚠️ Never in the 拼音 prompt mode: there the prompt IS the
     answer's pinyin, so annotated tiles would turn the round into syllable
     matching and the character-recognition step — the whole point of 组字成词 —
     would disappear. Every other prompt mode is safe: the characters are already
     on screen, so a reading adds no information about which ones are the answer
     (all tiles are annotated, decoys included). */
  function chipPyHtml(c, pm) {
    if (pm === "py" || !optPy()) return "";
    var p = charPy(c);
    return p ? '<span class="asm-py">' + esc(p) + '</span>' : "";
  }
  function renderAssemble(state) {
    setFbCtx("组字成词", state.seq[state.i]);
    setTopbar("home", "");
    var w = state.seq[state.i];
    var target = w.w.split("");
    var chips = asmChips(state, w, asmChipsFor(w.w.length, state.chars.length));

    /* prompt mode: def(释义) | en(英文) | cloze(填空) | py(拼音, practice-only).
       Per-word fallback to 释义 when the chosen field is missing. Chinese-only
       TTS: no speaker for en/py (English is silent by rule; pinyin IS the sound). */
    var pm = store.asmPrompt || "def";
    if (pm === "cloze" && !(w.cloze && w.cloze.indexOf("__") !== -1)) pm = "def";
    if (pm === "en" && !w.en) pm = "def";
    var noScore = (pm === "py");
    var promptTag, ttsBtn = "", ttsFn = null;
    /* The prompt is quiz CONTENT, so it takes ruby 拼音 like every other mode's
       question does (this screen was the one that never did) and no English.
       Recomputed on demand so the 拼音 toggle can repaint it in place. */
    function promptBody() {
      if (pm === "en") return esc(w.en);
      if (pm === "py") return esc(w.py);
      if (pm === "cloze") return qHtml(w.cloze, w.clozePy).replace(/_{2,}/g, "<u></u>");
      return qHtml(w.zh, w.zhPy);
    }
    if (pm === "en") { promptTag = "看英文，拼出词语"; }
    else if (pm === "cloze") { promptTag = "看句子，拼出空格里的词语"; ttsBtn = ttsBtnHtml("asmTts", "朗读句子"); ttsFn = function () { speakCloze(w.cloze, w.clozePy); }; }
    else if (pm === "py") { promptTag = "看拼音，拼出词语（10% 历练值）"; }
    else { promptTag = "看释义，拼出词语"; ttsBtn = ttsBtnHtml("asmTts", "朗读释义"); ttsFn = function () { speak(w.zh, w.zhPy); }; }
    var promptHtml = promptBody();

    var html = '<div class="study"><div class="rail card">' +
      '<div class="mode-name">🧩 组字成词' + pyl("组字成词") + enli("组字成词") + '</div>' +
      '<div class="mode-desc">' + mdLine("按顺序点出词语的字。") + '</div>' +
      '<div class="prog-big">' + (state.i + 1) + ' <small>/ ' + state.seq.length + '</small></div>' +
      '<div class="streak">拼对' + pyl("拼对") + enli("拼对") + ' <b>' + state.perfect + '</b> 🧩</div>' +
      asmPromptSelector() + asmSizeSelector(w, state.chars.length) + '</div>' +
      '<div class="stage"><div class="q-card">' +
      qTag(promptTag) +
      '<div class="q-text mcq' + qCls(promptHtml) + '">' + promptHtml + '</div>' +
      '<div class="q-foot">' + ttsBtn + '</div></div>' +
      '<div class="asm-slots" id="asmSlots">' +
      target.map(function () { return '<div class="asm-slot"></div>'; }).join("") + '</div>' +
      '<div class="asm-chips' + (chips.length >= 20 ? " many" : "") +
        '" id="asmChips" style="--asm-cols:' + asmCols(chips.length) + '">' +
      chips.map(function (c, i) {
        return '<button class="asm-chip" data-c="' + esc(c) + '" data-i="' + i + '">' +
          esc(c) + chipPyHtml(c, pm) + '</button>';
      }).join("") + '</div>' +
      '<div class="feedback" id="asmFb"></div>' +
      '<div class="nav-row" id="asmNextRow" style="display:none">' +
      '<button class="nav-btn primary" id="asmNext">' +
      (state.i + 1 >= state.seq.length ? "看成绩 ›" + pyl("看成绩") + enli("看成绩")
        : "下一题 ›" + pyl("下一题") + enli("下一题")) + '</button></div></div></div>';
    view().innerHTML = html;

    Array.prototype.forEach.call(view().querySelectorAll(".dopt[data-ap]"), function (b) {
      b.onclick = function () { store.asmPrompt = b.getAttribute("data-ap"); saveStore(); renderAssemble(state); };
    });
    /* re-render on release, not on every move: each step redraws the chip grid,
       and asmChips() caches per size so the answer's characters never re-shuffle */
    wireQtySlider("asmSize", ASM_SIZES, asmChipFmt, function (n) {
      store.asmChips = n; saveStore();
      clearTimeout(_asmSizeT);
      _asmSizeT = setTimeout(function () { renderAssemble(state); }, 260);
    });
    if (ttsFn && document.getElementById("asmTts")) document.getElementById("asmTts").onclick = ttsFn;
    /* Repaint the pinyin in place rather than re-rendering: a re-render would
       empty the slots a student has already filled, and (as everywhere else on
       this screen) it must never redraw the tiles themselves. */
    wirePyAidToggle(function () {
      var q = view().querySelector(".q-text.mcq");
      if (q) { q.innerHTML = promptBody(); q.className = "q-text mcq" + qCls(q.innerHTML); }
      Array.prototype.forEach.call(view().querySelectorAll(".asm-chip"), function (b) {
        var old = b.querySelector(".asm-py");
        if (old) b.removeChild(old);
        b.insertAdjacentHTML("beforeend", chipPyHtml(b.getAttribute("data-c"), pm));
      });
    });
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
            if (!wrongThis) {
              state.perfect++;
              /* 组词 一次拼对: base 3, no 连对 concept here (×1.0). Does not master.
                 拼音出题方式 earns 10% 历练值 (PY_PRACTICE_MULT, owner 2026-08-14)
                 plus the normal 灵露 — the assembly work is the same either way,
                 the pinyin prompt only removes the recall step. */
              scoreCorrect(w, PTS_BASE.assemble, 1, 0, !!store.mastered[w.id],
                           noScore ? PY_PRACTICE_MULT : 1);
              awardLingLu(w, "assemble");
            }
            bump("assemble", !wrongThis);
            sfxOk();
            var fb = document.getElementById("asmFb");
            fb.className = "feedback show " + (wrongThis ? "bad" : "ok");
            var fbZh = wrongThis ? "完成！（中途点错过）" : "一次拼对！";
            fb.innerHTML = "✔ " + fbZh + pyl(fbZh) + enl(fbZh) +
              "<b>" + esc(w.w) + "</b>" + ansPyHtml(w.py) +
              '<button class="tts sm" id="asmSay" style="margin-left:8px">🔊</button>';
            document.getElementById("asmSay").onclick = function () { speak(w.w, w.py); };
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
      '<div class="sub">组字成词 · 一次拼对 ' + state.perfect + ' 题</div>' +
      '<div class="msg">' + msg + '</div>' +
      '<div class="nav-row">' +
      '<button class="nav-btn" id="again">再来一局' + pyl("再来一局") + enli("再来一局") + '</button>' +
      '<button class="nav-btn primary" id="home">' + hubLabelHtml() + '</button></div></div>';
    document.getElementById("again").onclick = startAssemble;
    document.getElementById("home").onclick = backToHub;
  }

  /* ==================================================================
     攀山快答 · 90-second climb sprint (all streams) — Phase 2
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
  var SPRITE_SCALE = 2.0;   // U-5: draw the climber 2× (was 1:1, lost against the rock wall)

  /* ---------- 可玩头像精灵 (HANDOFF_可玩头像精灵与解锁机制 §2) ----------
     ⚠️ THIS IS A THIRD ASSET FAMILY. Never point one at another (§5):
       art/avatar/avatar_*.png        square 320px, faces LEFT   → 头像选择器 / AvatarInfoCard
       art/camp/pet_*.png             own aspect ratios          → 营地 PET_LAYOUT
       art/sprite/avatar/*_sprite.png 6-frame strip, faces RIGHT  → 攀山快答 (here)
     Frame semantics are IDENTICAL to the built-in climber sheet (0 idle · 1-2 walk ·
     3-4 climb A/B · 5 celebrate), which is why drawClimber's frame maths is shared.
     ⚠️ Cell WIDTH is per creature (鼠 128px wide, 唐僧 76px); height is a uniform 104.
     Derive the cell from naturalWidth/6 at runtime — never transcribe the handoff's
     table, or a regenerated sprite silently mis-slices every frame. */
  var AVATAR_SPRITE_H = SPRITE_FH * SPRITE_SCALE;   // cell height — fallback only, see AVATAR_INK_H
  /* Target VISIBLE height for every creature. The built-in climber's artwork fills
     ~94% of its 80px cell and draws at 2×, so ~150px is what the student actually sees
     on the wall; matching it keeps avatars and the fallback climber the same size.
     ⚠️ Sizing MUST normalise the INK, not the cell. The cells are a uniform 104px but
     the art inside fills 69% (沙僧) to 93% (公鸡) of it, so cell-normalising drew 沙僧
     22% shorter than 山羊 and 26% shorter than the human climber — owner 2026-08-16
     「I just tried the goat and 沙僧 - 沙僧 looks so much smaller」. */
  var AVATAR_INK_H = 150;
  var _inkCv = null;
  /* Alpha bounding box of frame 0, in cell coordinates, measured ONCE per sheet and
     cached on the Image itself. Measured at runtime rather than transcribed for the
     same reason the cell width is (§2 above): regenerated art must self-correct.
     ⚠️ Frame 0 only. The climb frames reach higher (沙僧 72px idle vs 98px reaching),
     and re-measuring per frame would make the sprite change size as it moves.
     Returns null if the pixels cannot be read, and the caller falls back to cell
     sizing — i.e. today's behaviour, never a broken draw. */
  function avatarInk(img) {
    if (img._ink !== undefined) return img._ink;
    img._ink = null;
    try {
      var FW = Math.round(img.naturalWidth / 6), FH = img.naturalHeight;
      if (!_inkCv) _inkCv = document.createElement("canvas");
      _inkCv.width = FW; _inkCv.height = FH;
      var c = _inkCv.getContext("2d");
      c.clearRect(0, 0, FW, FH);
      c.drawImage(img, 0, 0, FW, FH, 0, 0, FW, FH);
      var d = c.getImageData(0, 0, FW, FH).data;
      var x0 = FW, y0 = FH, x1 = -1, y1 = -1, x, y;
      for (y = 0; y < FH; y++) for (x = 0; x < FW; x++) {
        if (d[(y * FW + x) * 4 + 3] > 8) {          // 8: ignore despill haze on the edges
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (x1 >= x0 && y1 >= y0) img._ink = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    } catch (e) { /* unreadable pixels — cell sizing below still works */ }
    return img._ink;
  }
  var _avSprite = null, _avSpriteId = null;
  function avatarUnlocked(id) {
    /* WSProfile owns the unlock rules. A stale cached profile.js without the
       function must never break the sprint, so an absent check reads as unlocked. */
    return (window.WSProfile && window.WSProfile.isAvatarUnlocked)
      ? window.WSProfile.isAvatarUnlocked(id) : true;
  }
  /* The student's avatar as a climbable sprite sheet, or null to fall back to the
     stream climber (no avatar, an avatar they do not qualify for, or a missing file
     — the onerror drops the reference so a 404 degrades instead of showing a broken
     image). Never throws.
     ⚠️ Resolve ONCE per game, not per frame: it reads ws2_profile plus up to four
     ws2_* stores through the unlock check, and a mastered map is a big JSON.parse —
     doing that 60×/s inside a timed round is exactly the kind of jank a managed
     Chromebook cannot absorb. The avatar cannot change mid-round anyway. The
     returned Image may still be decoding; the DRAW site re-checks .complete. */
  function avatarSheet() {
    var p = loadProfile(), id = (p && p.avatarId) || null;
    if (id && !avatarUnlocked(id)) id = null;
    if (id !== _avSpriteId) {
      _avSpriteId = id;
      _avSprite = null;
      if (id) {
        var im = new Image();
        im.onerror = function () { if (_avSprite === im) _avSprite = null; };  // graceful degrade
        im.src = "art/sprite/avatar/" + id + "_sprite.png";
        _avSprite = im;
      }
    }
    return _avSprite;
  }

  var TILE_MAP ={"slope": [0, 23, 64, 57], "rock": [66, 16, 61, 64], "steps": [129, 54, 42, 26], "pine": [173, 19, 40, 61], "cloud": [215, 48, 57, 32], "sign": [274, 32, 42, 48], "tent": [318, 44, 61, 36], "fire": [381, 40, 37, 40], "flag": [420, 33, 34, 47], "pavilion": [456, 0, 99, 80]};
  var SPRITE_IMG = new Image();
  SPRITE_IMG.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAFACAMAAACC8Vs5AAABg1BMVEUAAAAcISUxMEIAAAA1ACVQOiwzTl9XQFANACHypoz5wmcfIQA6BgBGZ3ZtTh9KLgAuKn+PQ0UxQxmkQCiCMimRaS7+5YnEjWYQImR3XVD/0LHVsWP0+vXbl0L1ri7DfSjqlABdGCqoYU/Yz4D4mFu7WyEeAEDVv6qRh31AS526m5lGG2CDNgD7zwy1lEMBFDxGZUNwWHyTi00dSaKuvK9peZMmJqje2cXAcAAVR3rocVv/39ZbTQDbaBezvXZnhGiUbAC7RgGlpV9hAAC81slUNn7DoQreSyr//8N6Ikz+cDDqz0CMobTi6abXvhmXVnbOUlLIuTo+QsgIQhqIcqD5cAgrAGPqy/SaDgDtusv861WXjxLqRgC8IwDLnsfGX3QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAj24GXAAAAYXRSTlMA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AyO6IgAAAbHhJREFUeNrtvQd727jyN2o0sQAmJUoUTdK0rC7LimwrTtzt9F52Tz//+v2/xZ0BKdvJOhGgPM99n/fe5dlNfLIBCUwfYDC/jY0/nz+fP58/nz+fP5//Dz6uS/j//atgzP0/SUPG2JpDqeNQ9otr57/GQO6yX10/dYQg6/PuVwkgHWfNrxNBScTw4dxdhw6uAwz8JQ0aCUcsx68nxFzAKgioAA63XYMrHSp/ifyOcCglDJSAoyjY0R9G4j/RIZAxImssnVIaSeZac4DK8ms8gjcwPXvuOiX1JLGfBDwgCs6hM7KT3UMkngu8YyCAzlrsj4D7hJTfd6iFDBHpliPhX5wGsRYe7iL/qHAcQR2+MTJmQzdr+4nAn6LodvYwA/0fEz/LjGWS4+jlK1AQ7YiH0kcq5jmE2lOfAQ2F/jzFF1hYc/x2OZBqFSIE5MfGBIyo0G8gS+lzHNOv837W9pIBl5L9tXoH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";
  /* ⚠️ 攀山快答 的两张美术**不在开机时下载**（owner 2026-08-23 报图片慢）。
     `.src` 以前就写在这两行上，于是**每一次打开任何一页**都会去拉
     sprint_bg + climb-wall-tile —— 压缩前合计 3 MB，而绝大多数学生
     在首页根本不会走进这个玩法。现在推迟到 ensureSprintArt()：
     难度页一进就开始下载，等学生按下「开始」时通常已经到了。
     ⚠️ 两个 Image 对象本身照旧在这里建：canvas 那边用 `.complete &&
     .naturalWidth` 判断有没有画得了，对象不存在会直接抛错。 */
  var SPRINT_BG = new Image();
  var WALL_IMG = new Image();
  function ensureSprintArt() {
    if (!SPRINT_BG.src) SPRINT_BG.src = "art/bg/sprint_bg.png";      // vertical panorama backdrop
    if (!WALL_IMG.src) WALL_IMG.src = "art/bg/climb-wall-tile.png";  // vertically-tiling rock wall
  }
  /* Ledges (protruding shelves) traced on art/bg/climb-wall-tile.png, ordered bottom→top
     within one tile: {x, y} as image fractions of each shelf's top surface. The
     climber lands on one of these every jump; the list repeats each tile. Re-trace
     if the wall image changes. */
  /* ⚠️ Every entry MUST be strictly higher than the one before it (y strictly
     DECREASING), or a correct answer moves the climber sideways instead of up.
     The original trace had two pairs at effectively the same height —
     0.586/0.583 and 0.156/0.153, i.e. 3px apart on the source art — and those
     were exactly the "sometimes it jumps horizontally" steps the owner saw.
     Both near-duplicates are dropped; 6 shelves per tile, all clearly separated. */
  /* Re-traced 2026-08-15 for the owner's final art (887×1774, ratio 2.0, a true lossless PNG).
     Traced by PIXEL SCAN, then filtered by a SHADOW TEST, which this brighter
     wall needs: its lit brick tops pass a plain brightness threshold, so a
     candidate only counts as a shelf if it is 100-160px wide AND the rows ~14px
     below it are ≥38 luminance DARKER (a real slab casts an underside shadow;
     a brick top does not, and a fog band is brighter below, not darker).
     36 raw candidates → 16 shelves, each ≥0.032 apart, every (x, y) verified on
     slab pixels and eyeballed as markers drawn back onto the art.
     `x` is the traced slab CENTRE and is load-bearing: the climber jumps to it
     and lands there (see frame()). Re-trace BOTH numbers together whenever the
     wall art changes, and re-run the shadow test — the naive scan is not enough
     on this tile. */
  var SPRINT_LEDGES = [
    { x: 0.321, y: 0.942 }, { x: 0.631, y: 0.891 }, { x: 0.851, y: 0.810 },
    { x: 0.366, y: 0.740 }, { x: 0.669, y: 0.691 }, { x: 0.846, y: 0.589 },
    { x: 0.647, y: 0.499 }, { x: 0.246, y: 0.448 }, { x: 0.781, y: 0.415 },
    { x: 0.324, y: 0.351 }, { x: 0.634, y: 0.300 }, { x: 0.203, y: 0.255 },
    { x: 0.855, y: 0.220 }, { x: 0.374, y: 0.149 }, { x: 0.669, y: 0.100 },
    { x: 0.327, y: 0.045 }
  ];



  /* dev guard: a future re-trace that breaks the invariant should say so loudly
     rather than silently reintroducing sideways hops */
  (function () {
    for (var i = 1; i < SPRINT_LEDGES.length; i++) {
      if (SPRINT_LEDGES[i].y >= SPRINT_LEDGES[i - 1].y - 0.03) {
        console.warn("SPRINT_LEDGES: ledge " + i + " is not clearly above ledge " + (i - 1) +
                     " — the climber will appear to jump sideways.");
      }
    }
  })();
  var TILE_IMG = new Image();
  TILE_IMG.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAi0AAABQCAMAAADiFLV2AAABAlBMVEX/9qGibpzAY1v5//17kCuCwFW674X/y3+iP2sAAAAAAAA6AB9VV1SIgmx/RxQLIz0mNlgwTjSpbzBWOgDlrgAZOACEuxiftpzLsqvqKxkCZST0xbEmiyXAIgVbDAC6nHZYnABQKFAxXXbIfwDJ1+J/WUKtv8uv4gEzbQAmAEacCAD259L8pCbInCOhYgD/0Q1zFyRdsjPgyTuolkqwKzDuWTh0THSJp8PXUQCP3TLqqmBibyC55UhLhUtffp38fQDz+lUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACbDVwuAAAAQXRSTlP///////////8A/////////////////////////////////////////////////////////////////////////771nsgAAB5cSURBVHja7Z0JQyI5sMed1dl9pvogdEfAUaCFRlBuHEZ0HP3+n+pVVZI+oGnw2jdvh+wO9oEInV//60glHJ0e2n+8wQAGez4TQEDZE44OV/O/DosQIPalRQhxoOUPbmIxfxH70iJa83mZuhxo+a9Ly8lkAgpgj2ciLaPJ8EDLn0xLNQwnYbCHuoB4mYdheKDlT6YlDoeTyZ60TMJhWGa2DrT892mZ7EvLHGkZHmj5s3mBeehNm7CrCTEPAzjERAdavCkF0oxErukD9jA+D9SBlj87hhadztiLF7taHHc6gTpoyx9OC1TH1XEnpNiIGroxYVEbY2sesnN/PC0j1JbqaFfz4nHnQMuBFvRHfL/i72zs5Q4OtPzZfgtSsD8tcKDlT46IAMbjqCL9SqXiVxwHH/WPCm+Zhqw4lfnQi+NDLvePhqU1H48lkUL/rq40I/gD/zEtPj3iw9XV/HnseZ+cnculeA7987vZocfhJPCklRFLi972E4UhWion48AbwyfTkk33HLrn95IWIcbhUBkkUjquCmipVJQfD4ei5Kb/EFpub2u2HQTmd6MlHobKL6QF9/0cLb7/SLQI8am0dLuGlXpd7CrW+/DLcWCzzElYuJ6HdmiDlquMl2u8F3yQQeAtWvC5tLhuwgu16PTfkxc4GD+bVfHFZuwMo3CcQaJSQIuxR74l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";
  var SPRINT_OPTS = [60, 90, 120];
  var SPRINT_MODES = [
    { k: "cloze", label: "✍️ 填空", zh: "填空挑战" },
    { k: "zh", label: "🔎 华文解释", zh: "华文解释" },
    { k: "en", label: "🌐 英文翻译", zh: "英文翻译" }
  ];
  function altitudeNow() { return Object.keys(store.mastered).length; }
  function renderSprintConfig() {
    ensureSprintArt();      // 提前一屏开始下载，见 ensureSprintArt()
    setTopbar("home", "");
    /* ⚠️ WARM THE AVATAR SHEET ON THE CONFIG SCREEN, not at 开始攀登 (owner
       2026-08-17:「first frame still shows the old climber avatar before changing to
       the current player avatar」). The sheet only starts downloading when startSprint
       calls avatarSheet(), so the first paint of the session's FIRST sprint lands
       while it is still decoding — and drawClimber then fell through to the stream
       climber, a different character entirely. Starting the fetch one screen earlier
       buys it the whole time the student spends choosing 题目类型 and 冲刺时长.
       ⚠️ A WARM-UP, NOT THE FIX: a cold cache on school wifi can still lose that
       race, so drawClimber carries its own guard. Both are needed.
       ⚠️ Cheap to repeat — avatarSheet() memoises on _avSpriteId and only builds a
       new Image when the avatar actually changed. */
    avatarSheet();
    var best = store.best.sprint || 0;
    view().innerHTML = '<div class="game-config card">' +
      '<div class="mode-name">⛰️ 攀山快答' + pyl("攀山快答") + enli("攀山快答") + '</div>' +
      '<div class="mode-desc">' + mdLine("登山冲刺：答对就向上攀登！") +
        mdLine("第一次答对的新词会永久提升你的海拔（1 词 = 1 米）。优先出现你还没掌握的词。") + '</div>' +
      '<div class="sprint-stats"><span>我的海拔' + pyl("我的海拔") + enli("我的海拔") + ' <b>' + altitudeNow() + ' 米</b></span>' +
      '<span>个人纪录' + pyl("个人纪录") + enli("个人纪录") + ' <b>' + best + ' 题</b></span></div>' +
      '<div class="diff-label">' + stepNo(1) + '题目类型' + pyl("题目类型") + enl("题目类型") + '</div><div class="diff" id="modeSel">' +
      SPRINT_MODES.map(function (m) {
        return '<button class="dopt' + (m.k === store.sprintMode ? " on" : "") + '" data-m="' + m.k + '">' +
          '<span>' + m.label + labGloss(m.label) + '</span></button>';
      }).join("") + '</div>' +
      '<div class="diff-label">' + stepNo(2) + '冲刺时长' + pyl("冲刺时长") + enl("冲刺时长") + '</div>' +
      qtySlider("secSel", SPRINT_OPTS, store.sprintSecs, secFmt) +
      itemPickerHtml("sprint", 3) +
      pyAidToggleHtml() +
      '<div class="nav-row"><button class="nav-btn" id="back">\u2039 ' + hubLabelHtml(true) + '</button>' +
      '<button class="nav-btn primary" id="go">开始攀登 ›' + pyl("开始攀登") + enli("开始攀登") + '</button></div></div>';
    Array.prototype.forEach.call(view().querySelectorAll("#modeSel .dopt"), function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(view().querySelectorAll("#modeSel .dopt"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        store.sprintMode = b.getAttribute("data-m");
        saveStore();
      };
    });
    wireQtySlider("secSel", SPRINT_OPTS, secFmt, function (n) { store.sprintSecs = n; saveStore(); });
    /* everything this screen chooses lives in `store`, so a full re-render is the
       cheapest way to repaint the slots — same thing wirePyAidToggle does below. */
    wireItemPicker("sprint", renderSprintConfig);
    wirePyAidToggle(renderSprintConfig);
    document.getElementById("back").onclick = backToHub;
    document.getElementById("go").onclick = startSprint;
  }
  /* ---------- 屏幕方向提示 (HANDOFF_stream_page_layout §7) ----------
     One inline strip, never a modal, and never on the landing page — a student told
     「用横屏」 on arrival and 「用竖屏」 later will ignore both. Each hint fires ONLY
     when the current orientation is the wrong one for THAT activity, so the two can
     never both appear.
       攀山快答 / 词雨灵露   fire in portrait  → suggest landscape
       typing modes         fire in landscape → suggest portrait (the on-screen
                            keyboard eats a landscape screen)
     ⚠️ Gated on VIEWPORT WIDTH, not device type: a school iPad in portrait is wide
     enough to need neither prompt. 820px per the handoff, tune on a real device.
     ⚠️ Advisory only. iOS Safari cannot rotate the screen, so nothing is ever
     blocked behind this — it is a strip above the activity, which starts anyway. */
  var ORIENT_MIN_W = 820;
  function orientHintHtml(want) {
    if (store.orientOff) return "";
    var w = window.innerWidth, portrait = window.innerHeight > w;
    if (w >= ORIENT_MIN_W) return "";                  // wide enough either way
    if (want === "landscape" && !portrait) return "";  // already correct
    if (want === "portrait" && portrait) return "";
    var msg = want === "landscape"
      ? "📱 转成横屏，画面更开阔"
      : "📱 转成竖屏，键盘不会挡住画面";
    return '<div class="orient-hint" id="orientHint">' + msg +
      '<button class="orient-x" data-off="1" type="button">不再提示</button>' +
      '<button class="orient-x" type="button" aria-label="关闭">✕</button></div>';
  }
  function wireOrientHint() {
    var el = document.getElementById("orientHint"); if (!el) return;
    Array.prototype.forEach.call(el.querySelectorAll(".orient-x"), function (b) {
      b.onclick = function () {
        if (b.getAttribute("data-off")) { store.orientOff = 1; saveStore(); }
        el.remove();
      };
    });
  }

  function startSprint() {
    ensureSprintArt();      // 直接进来的路径（跳过难度页）也要有
    var avSheet = avatarSheet();   // resolved once for the whole round (see avatarSheet)
    var smode = store.sprintMode || "zh";
    var all = scopedWords();
    if (smode === "cloze") all = all.filter(function (w) { return w.cloze && w.cloze.indexOf("__") !== -1; });
    if (all.length < 8) {
      alert(smode === "cloze"
        ? "所选范围内有填空句的词语不足（至少 8 个）。请扩大复习范围或改选其他题型。"
        : "请先选择足够的复习范围（至少 8 词）。");
      return;
    }
    /* spent here, at the top, before the first question is drawn — see takeItems() */
    var kit = takeItems("sprint");
    _deferCel = true;
    setTopbar("home", "");
    showFab(false);        // timed round: no stray taps, and 词雨 words land here
    view().innerHTML = orientHintHtml("landscape") + '<div class="sprint-shell">' +
      '<canvas class="sprint-canvas" id="spCv"></canvas>' +
      '<div class="sprint-right">' +
      '<div class="sprint-hud">' +
      '<div class="sprint-timer"><div class="sprint-timer-fill" id="spTime"></div></div>' +
      '<span>答对' + pyl("答对") + enli("答对") + ' <b id="spOk">0</b></span>' +
      '<span>连对' + pyl("连对") + enli("连对") + ' <b id="spCombo">🔥0</b></span>' +
      '<span>海拔' + pyl("海拔") + enli("海拔") + ' <b id="spAlt">' + altitudeNow() + '</b> 米</span></div>' +
      itemBarHtml(kit) +
      '<div class="sprint-q card"><div class="sq-row">' +
      '<div class="sq-prompt" id="spPrompt"></div>' +
      '<button class="tts sm" id="spSay">🔊</button></div>' +
      '<div class="sopts" id="spOpts"></div>' +
      '</div></div></div>';

    /* Redraw only the option list, so flipping 拼音辅助 mid-round never redraws
       the DISTRACTORS. Same 选项重洗=泄题 hazard the 填空 rail hit: the answer is
       the one option that survives a fresh draw. paintOpts is assigned inside
       askNext and repaints the CURRENT question's existing options. */
    var paintOpts = null;
    /* 拼音 is a CSS gate now (see qHtml) — nothing to repaint. Registering a
       redraw here would only risk the same answered-state loss 填空挑战 had. */

    wireOrientHint();
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
    var sprintSecs = store.sprintSecs || 90;
    /* 铜壶滴漏 is folded into sprintMs rather than pushed onto endAt alone, so the
       timer BAR still starts full — a bar that begins at 109% of itself reads as
       a rendering bug, not as a bonus. */
    var sprintMs = sprintSecs * 1000 + kit.time * SPRINT_TIME_ITEM_MS;
    var endAt = performance.now() + sprintMs;
    var kneeLeft = kit.knee;     // 护膝 · wrong answers that cost neither time nor streak
    var useCompass = null;       // 司南 · re-armed per question by askNext
    var cur = null;

    function askNext() {
      if (over || !document.getElementById("spPrompt")) return;
      locked = false;
      cur = nextWordS();
      setFbCtx("攀山快答", cur);
      var say = document.getElementById("spSay");
      var pr = document.getElementById("spPrompt");
      if (smode === "en") {
        pr.textContent = cur.en;
        say.style.display = "none";   // English is never read aloud (TTS rule)
      } else {
        var isCl = smode === "cloze";
        // blank stays a literal __ here, as it always has in 攀山快答
        pr.innerHTML = isCl ? qHtml(cur.cloze, cur.clozePy) : qHtml(cur.zh, cur.zhPy);
        say.style.display = "";
        say.onclick = isCl ? function () { speakCloze(cur.cloze, cur.clozePy); }
                           : function () { speak(cur.zh, cur.zhPy); };
      }
      pr.className = "sq-prompt" + qCls(pr.innerHTML);
      var opts = shuffle([cur].concat(distractorsFor(cur, all, 3)));
      var box = document.getElementById("spOpts");
      /* 司南: one wrong option goes grey for THIS question. `struck` is per-question
         state that paintOpts reads, so a repaint cannot quietly restore the option.
         ⚠️ HARD CAP OF ONE PER QUESTION. 4→3 is「少一个选项」, which the boundary rule
         above CONSUMABLES allows; 4→2 walks toward answering for the student, so a
         second 司南 is REFUSED rather than spent — the chip stays armed for the next
         question instead of being burnt on a no-op. */
      var struck = {}, struckN = 0;
      useCompass = function () {
        if (locked || over) return false;             // mid-transition to the next question
        if (struckN) { toast("这一题已经用过司南了"); return false; }
        var pool = [];
        for (var ci = 0; ci < opts.length; ci++) if (opts[ci].id !== cur.id) pool.push(ci);
        if (!pool.length) return false;
        struck[pool[Math.floor(Math.random() * pool.length)]] = 1;
        struckN++;
        paintOpts();
        sfxOk();
        return true;
      };
      /* repaint the SAME opts array — never a fresh draw (see paintOpts above) */
      paintOpts = function () {
      box.innerHTML = opts.map(function (o, i) {
        return '<div class="opt-row"><button class="sopt' + (struck[i] ? " is-out" : "") +
          '" data-i="' + i + '"' + (struck[i] ? " disabled" : "") + '><span class="letter">' +
          String.fromCharCode(65 + i) + '</span>' + esc(o.w) +
          optPyHtml(o.py) + '</button>' +
          '<button class="opt-tts" data-i="' + i + '" title="朗读" aria-label="朗读选项">🔊</button></div>';
      }).join("");
      Array.prototype.forEach.call(box.querySelectorAll(".opt-tts"), function (b) {
        b.onclick = function () { var o = opts[parseInt(b.getAttribute("data-i"), 10)]; speak(o.w, o.py); };
      });
      Array.prototype.forEach.call(box.querySelectorAll(".sopt"), function (b) {
        b.onclick = function () {
          if (locked || over) return; locked = true;
          var chosen = opts[parseInt(b.getAttribute("data-i"), 10)];
          var right = chosen.id === cur.id;
          bump("sprint", right);
          if (right) {
            var entering = combo, wasMastered = !!store.mastered[cur.id];
            ok++; combo++; celT = 0.55;
            targetAlt = Math.min(totalAlt, targetAlt + 1);
            gymNote(cur.id);
            scoreCorrect(cur, PTS_BASE.sprint, 1, entering, wasMastered);
            awardLingLu(cur, "sprint");
            if (!store.mastered[cur.id]) { newMastered++; markMastered(cur); }
            document.getElementById("spOk").textContent = ok;
            document.getElementById("spCombo").textContent = "🔥" + combo;
            document.getElementById("spAlt").textContent = altitudeNow();
            /* The reward chime EVERY mode uses, plus a combo-pitched accent on a
               streak. Before this, sprint played only the two bare combo tones —
               quiet, unlike every other mode, and the owner read it as silence. */
            sfxOk();
            var p = Math.min(combo, 8);
            if (combo >= 3) tone(1320 + p * 55, 0.26, 0.14, "sine", 0.09);
            b.classList.add("right");
            setTimeout(askNext, 260);
          } else {
            slipT = 0.5;
            /* 护膝: the first slip costs neither the 3 秒 nor the streak.
               ⚠️ bump("sprint", false) has ALREADY run above and stays run: an item
               may buy margin for error, never a prettier 正确率. The right answer is
               still revealed below, exactly as without the item. */
            if (kneeLeft > 0) {
              kneeLeft--;
              toast("🦵 护膝护住了这一跤 · 不扣时间" + (kneeLeft ? "（还剩 " + kneeLeft + " 次）" : ""));
            } else {
              combo = 0;
              /* anti-mashing (D-1): a wrong answer costs 3 seconds of the run. The
                 board ranks how many questions you got right, so docking time hits
                 random-guessing exactly where it pays. ~3.3% of a 90s run. */
              endAt -= SPRINT_WRONG_PENALTY_MS;
              document.getElementById("spCombo").textContent = "🔥0";
            }
            sfxBad();
            b.classList.add("wrong");
            Array.prototype.forEach.call(box.querySelectorAll(".sopt"), function (bb, bi) {
              if (opts[bi].id === cur.id) bb.classList.add("right");
            });
            setTimeout(askNext, 800);
          }
        };
      });
      };            // end paintOpts
      paintOpts();
    }

    /* ----- 8-bit sprite climber (falls back to blocks until image decodes) ----- */
    function drawClimber(x, y, moving, t, faceLeft) {
      var px = Math.round(x), py = Math.round(y);
      /* resolved once in startSprint; only the decode state is checked per frame */
      var av = (avSheet && avSheet.complete && avSheet.naturalWidth) ? avSheet : null;
      /* ⚠️ A STUDENT WITH AN AVATAR MUST NEVER BE DRAWN AS THE STREAM CLIMBER, not
         even for one frame (owner 2026-08-17). `avSheet` non-null means the avatar
         resolved and its PNG is on its way; SPRITE_IMG loaded at module init and is
         therefore ALWAYS decoded first. So the old `av || SPRITE_IMG.complete` test
         quietly picked the stream climber during the decode window and swapped the
         character out from under the student a few frames later.
         ⚠️ The fallback branch is still right for everyone else — no avatar, an
         avatar not yet unlocked, a 404 — because avatarSheet()'s onerror NULLS
         _avSprite, so a genuinely missing file lands here rather than hanging.
         ⚠️ Skipping the draw entirely is the correct behaviour for those few frames:
         the climber pops in a frame late, which reads as loading. Drawing the wrong
         character reads as a bug, which is exactly what was reported. */
      if (avSheet && !av) return;
      if (av || (SPRITE_IMG.complete && SPRITE_IMG.naturalWidth)) {
        var f = 0;
        if (celT > 0) f = 5;                            // celebrate flash
        else if (moving) f = 3 + (Math.floor(t * 5) % 2); // climb A/B alternate
        var img, FW, FH, sy, DW, DH, ax = px, ay = py, shW, shH;
        if (av) {
          img = av; FW = av.naturalWidth / 6; FH = av.naturalHeight; sy = 0;
          /* ⚠️ a wide creature (鼠 128px, 龙/蛇 120px per cell) would swallow the wall
             on a narrow canvas, so the ARTWORK is contain-fitted into
             (AVATAR_INK_H tall × cap wide) — the height comes down with the width so
             nothing is ever stretched. The cap now measures the ink rather than the
             cell, which is a slight loosening: it bounds what the student can see
             instead of bounding the cell's empty margins too. */
          var cap = cv.width * 0.42, ink = avatarInk(av);
          if (ink) {
            var s = Math.min(AVATAR_INK_H / ink.h, cap / ink.w);
            DW = FW * s; DH = FH * s;
            /* anchor the INK, not the cell: art centred on px, feet landing on py.
               Mirroring below still pivots on px, and the ink centre IS px, so a
               left-facing creature stays put. */
            ax = px - (ink.x + ink.w / 2 - FW / 2) * s;
            ay = py + (FH - ink.y - ink.h) * s;
            shW = ink.w * s * 0.40; shH = ink.h * s * 0.055;
          } else {
            DH = AVATAR_SPRITE_H; DW = FW * (DH / FH);
            if (DW > cap) { DH = DH * (cap / DW); DW = cap; }
          }
        } else {
          img = SPRITE_IMG; FW = SPRITE_FW; FH = SPRITE_FH;
          sy = (SPRITE_ROW[STREAM] || 0) * SPRITE_FH;
          DW = SPRITE_FW * SPRITE_SCALE; DH = SPRITE_FH * SPRITE_SCALE;
        }
        if (shW === undefined) { shW = DW * 0.30; shH = DH * 0.05; }
        /* Feet sit ON the shelf's top surface (owner 2026-08-14: it used to read as
           standing IN FRONT of the ledge). py IS that surface, so the sprite's
           bottom edge lands on py — the old +6 pushed it 6px below the line, which
           is what put the climber over the rock face instead of on the shelf.
           The contact shadow sits ON the same line for the same reason. */
        ctx.save();
        ctx.globalAlpha = 0.32; ctx.fillStyle = "#0A1420";
        ctx.beginPath(); ctx.ellipse(px, py, shW, shH, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save();
        if (faceLeft) { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
        ctx.drawImage(img, f * FW, sy, FW, FH, ax - DW / 2, ay - DH, DW, DH);
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
        var ledgeX = function (gi) {            // traced centre of ledge gi, 0..1 of width
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

        /* The climber JUMPS to the column the next shelf actually sits in and lands
           on it (owner 2026-08-15, reversing the 08-14 centre-line experiment: only
           3 of the tile's 11 shelves cross the centre, so the other 8 steps rose
           through bare rock). x interpolates between the two shelves' traced
           centres while the arc carries it over — so SPRINT_LEDGES.x is load-bearing
           again and must be re-traced whenever the wall art changes. */
        var x0 = ledgeX(i0), x1 = ledgeX(i0 + 1);
        var slipX = slipT > 0 ? Math.sin(slipT * 25) * 3.5 : 0;
        var px = (x0 + (x1 - x0) * fstep) * W + slipX;
        /* jump arc: taller when the hop is longer, so a wide sideways leap reads as
           a leap rather than a slide (floor keeps the short hops from looking flat) */
        var span = Math.min(1, Math.abs(x1 - x0) / 0.35);
        var py = anchorY - Math.sin(fstep * Math.PI) * (tileH * (0.05 + 0.05 * span));
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
      if (isBest) { store.best.sprint = ok; }
      /* leaderboard board is 90s-only (D-2): other timers stay a private best.
         ⚠️ AND item-free. +8 秒 or a free slip is a different course from the one
         everyone else on that board ran, so a kit run is excluded exactly the way a
         60s run is. 个人纪录 above still records it. */
      if (sprintSecs === SPRINT_RANKED_SECS && !kit.any && ok > (store.best.sprint90 || 0)) {
        store.best.sprint90 = ok;
      }
      saveStore();
      sfxBadge();
      view().innerHTML = '<div class="result">' +
        '<div class="big">' + ok + ' 题</div>' +
        '<div class="sub">攀山快答 · 新掌握 ' + newMastered + ' 词 · 海拔 +' + newMastered + ' 米</div>' +
        '<div class="msg">' + (isBest ? "🚩 个人新纪录！" : "我的海拔：" + altitudeNow() + " 米") + '</div>' +
        kitUsedLine(kit) +
        '<div class="nav-row">' +
        '<button class="nav-btn" id="again">再来一局' + pyl("再来一局") + enli("再来一局") + '</button>' +
        '<button class="nav-btn primary" id="home">' + hubLabelHtml() + '</button></div></div>';
      document.getElementById("again").onclick = startSprint;
      document.getElementById("home").onclick = backToHub;
      flushCelebrations();
    }

    askNext();
    /* 司南 is the only tappable item here; 铜壶滴漏 and 护膝 are already in effect.
       useCompass is re-bound by every askNext(), so the chip always acts on the
       question actually on screen. */
    wireItemBar(kit, function (eff) {
      return eff === "compass" && useCompass ? useCompass() : false;
    });
    raf = requestAnimationFrame(frame);
  }

  /* ==================================================================
     我的词山 · persistent mountain world (Phase 3)
     One mountain per level app. Altitude = mastered count (1 词 = 1 米).
     Real curriculum landmarks: 板块驿站 (badge) · 单元营地 (tent+fire) ·
     关卡 (flag) · 顶峰 (pavilion). Drag to pan, tap landmarks for
     details + word chip lists. SDT goal panel highlights the next target.
     ================================================================== */
  var _badgeImgCache = {};
  function badgeImgFor(component) {
    var src = BADGE_IMG[component] || "art/badge/badge_hx.png";
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
    /* ⚠️ the level is part of the name now that 单元 pins are off the map (§18ag).
       markLabel's only remaining callers are the goal bar and the pin titles, and every
       stream has four 单元一 — 「距「单元一 营地」还差 55 词」 named a milestone the
       student could not locate. */
    if (m.t === "unit") return m.level + " · " + m.unit;
    if (m.t === "level") return m.level + " 关卡";
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
  /* ⚠️ the chips carry 拼音 under the SAME body.py-aid gate as every other
     annotation (owner 2026-08-22: 「the pinyin toggle also doesn't work here」).
     They had carried data-py since day one purely to feed speak() and had never
     rendered it, so the toggle really did nothing on this card.
     ⚠️ NO English on the chips: §10 keeps enl() off 词汇资料, and what a word
     MEANS is what 我的词语表 is for. The pinyin comes straight from w.py — hand
     -written data, never generated at runtime (§8).
     flat = drop the chip list's own scroll box, for when the caller wraps several
     groups in one scroller (see the 单元营地 card). */
  function chipListHtml(ids, flat) {
    var h = '<div class="chip-wrap' + (flat ? " flat" : "") + '">';
    ids.forEach(function (id) {
      var w = WORDS[_idIndex[id]];
      if (!w) return;
      h += '<span class="wchip ' + (store.mastered[id] ? "got" : "not") + '" data-say="' + esc(w.w) +
        '" data-py="' + esc(w.py || "") + '">' + esc(w.w) +
        (w.py && pyAidAvailable() ? '<span class="pylab">' + esc(w.py) + '</span>' : "") + '</span>';
    });
    return h + '</div>' + (flat ? "" : chipHintHtml());
  }
  function chipHintHtml() {
    var k = "金色 = 已掌握 · 虚线 = 待掌握 · 点词可发音";
    return '<div class="pop-hint">' + k + pyl(k) + enl(k) + '</div>';
  }
  /* a label + its number, so the glossed span's visible Chinese is EXACTLY the
     PY_LAB/EN_LAB key (§10) — 「海拔 264 米」 as one key would need a new entry per
     altitude. The number rides alongside, unglossed. */
  function popStat(k, val) {
    return '<div class="pop-stat"><span class="pop-k">' + k + pyl(k) + enl(k) + '</span>' +
      '<span class="pop-v">' + val + '</span></div>';
  }
  var _idIndex = {};
  function ensureIdIndex() {
    if (Object.keys(_idIndex).length) return;
    WORDS.forEach(function (w, i) { _idIndex[w.id] = i; });
  }
  function wireChips(ov) {
    Array.prototype.forEach.call(ov.querySelectorAll(".wchip"), function (ch) {
      ch.onclick = function () { speak(ch.getAttribute("data-say"), ch.getAttribute("data-py")); };
    });
  }
  /* 年度试炼 block shown inside the 关卡 popover (folded in to avoid a
     second landmark colliding with the level flag at the same altitude) */
  function gymSectionHtml(m) {
    var level = m.level, pet = petFor(level);
    /* a level with no 神兽 mapped (see PETS) simply has no reward line — the trial
       still runs. petTxt keeps the three branches below free of null checks. */
    var petTxt = pet ? '（赢取 ' + pet.emoji + ' ' + esc(pet.name) + '）' : '';
    if (store.gym[level]) {
      return '<div class="gym-sec done">🏅 ' + esc(level) + ' 年度试炼已通过' +
        (pet ? '<br>登山伙伴：' + pet.emoji + ' ' + esc(pet.name) +
               '<br><span class="pop-hint">头像「' + esc(pet.name) + '」已解锁</span>' : '') + '</div>';
    }
    var todo = store.gymTodo[level] || {}, todoIds = Object.keys(todo);
    if (todoIds.length) {
      var words = todoIds.map(function (id) {
        var w = WORDS[_idIndex[id]]; return w ? esc(w.w) : null;
      }).filter(Boolean);
      return '<div class="gym-sec lock">🔒 ' + esc(level) + ' 年度试炼 · 待巩固 ' + words.length + ' 词<br>' +
        '<span class="gym-todo">' + words.join("、") + '</span><br>' +
        '<span class="pop-hint">在「学习」中答对这些词即可重新开启试炼</span></div>';
    }
    var lvWords = WORDS.filter(function (w) { return w.level === level; });
    var lvGot = lvWords.filter(function (w) { return store.mastered[w.id]; }).length;
    var lvPct = lvWords.length ? Math.round(100 * lvGot / lvWords.length) : 0;
    if (lvPct < 80) {   // gate: master 80% of the year's words first
      return '<div class="gym-sec lock">🔒 先掌握本年级 80% 词语才能开启年度试炼<br>' +
        '<span class="gym-todo">当前进度 ' + lvPct + '%（' + lvGot + ' / ' + lvWords.length + ' 词）</span><br>' +
        '<span class="pop-hint">继续在「学习」中掌握本年级词语' + petTxt + '</span></div>';
    }
    var n = buildGymSeq(level).seq.length;
    return '<div class="gym-sec">' +
      '<div class="pop-hint" style="margin-bottom:8px">共 ' + n + ' 题 · 含本级与以往各级词语 · 需全部答对方可通过</div>' +
      '<button class="nav-btn primary gym-go" id="gymGo">⚔️ 挑战 ' +
      esc(level) + ' 年度试炼' + petTxt + '</button></div>';
  }
  /* ⚠️ 返回 / 学习 / 挑战 replaced the old 知道了 (owner 2026-08-22). 知道了 is an
     acknowledgement, and this card is not an announcement — it is the ONE place a
     student sees exactly which words of a unit they are still missing, so the useful
     next move is to go and work on that unit.
     ⚠️ Neither button LAUNCHES a mode. They set ①复习范围 to that unit and open the
     matching ② tab; the student still picks 填空/闪卡/词雨…, so every existing guard
     (板块 filter, ⭐ tiers, 打字档, 「共 0 词」) is still in front of them. Picking the
     mode for them is exactly how a §4.4 silent failure gets built — the map has no
     idea which modes that unit can actually run. */
  function popActions(hasScope, backLabel) {
    var h = '<div class="nav-row">' +
      '<button class="nav-btn" id="popBack">‹ ' + (backLabel || "返回") +
        pyl(backLabel || "返回") + enl(backLabel || "返回") + '</button>';
    if (hasScope) {
      h += '<button class="nav-btn primary" id="popLearn">📖 学习' + pyl("学习") + enl("学习") + '</button>' +
        '<button class="nav-btn primary" id="popPlay">⚔️ 挑战' + pyl("挑战") + enl("挑战") + '</button>';
    }
    return h + '</div>';
  }
  /* ⚠️ 板块 filters (store.compOff) are deliberately left alone: they are a
     stream-wide narrowing the student set on purpose, and silently reopening them
     here would undo a decision made on another screen. If the unit ends up empty
     because of them, ①'s own 共 0 词 line says so — which is why this lands on the
     home screen instead of inside a mode. */
  function scopeToUnit(level, unit, tab) {
    /* same rule as a unit chip: naming a unit means the unit source is what the
       student wants. Silently landing them on a pasted list they set last week,
       from a button that says the unit's name, would be the worst of both. */
    clearPaste();
    scope.clear();
    scope.add(level + "·" + unit);
    store.homeTab = tab;
    store.accLevel = level;        // open that year, or the change is invisible
    saveStore();
    /* ⚠️ 落在那扇门的活动页上，不是首页（owner 2026-08-23 把 ② 改成门之后）。
       这两颗按钮的名字就是那两扇门的名字，把学生送回首页等于要他自己再点一次同一扇门。
       ⚠️ 仍然**不替他挑玩法**（§18af）：门后面是活动卡，每一道守卫都还在前面。
       ⚠️ 改过的范围看得见：活动页顶上那行摘要就是首页那一行的同一句话。 */
    renderPath(tab);
    toast("复习范围已设为 " + level + " · " + unit);
  }
  /* the 单元 rows that now live inside a 关卡 card. Name, theme, and a mastered
     count — all three of which a 19px dot on the trail could never say without being
     hovered one at a time. Rebuilt from buildMarks so each row carries the SAME mark
     object the map used to hand to openMark: one code path, one card. */
  function unitRowsHtml(level) {
    var rows = buildMarks().filter(function (m) { return m.t === "unit" && m.level === level; });
    var h = '<div class="pop-label">本级单元' + pyl("本级单元") + enl("本级单元") + '</div><div class="pop-units">';
    rows.forEach(function (m, i) {
      var ids = [], u;
      COMP_LIST.forEach(function (c) { if (c.level === m.level && c.unit === m.unit) ids = ids.concat(c.ids); });
      var got = ids.filter(function (id) { return store.mastered[id]; }).length;
      u = null;
      UNIT_LIST.forEach(function (x) { if (x.level === m.level && x.unit === m.unit) u = x; });
      h += '<button class="pop-unit' + (markDone(m) ? " done" : "") + '" data-u="' + i + '">' +
        '<span class="pu-n">' + esc(m.unit) + (markDone(m) ? " ✨" : "") + '</span>' +
        '<span class="pu-t">' + esc((u && u.theme) || "") + '</span>' +
        '<span class="pu-c">' + got + ' / ' + ids.length + '</span></button>';
    });
    return h + '</div>';
  }
  /* ⚠️ `back` is the mark to return to, not a boolean. A unit card opened from inside a
     关卡 has to go BACK to that peak — dumping the student on the map would make them
     re-find the flag and re-open it just to look at the next unit. Same three-level
     return the pier settled on: 海图 ← 词山 ← 关卡 ← 单元. */
  function openMark(m, back) {
    ensureIdIndex();
    var html, ids, got, ov;
    if (m.t === "base") { return openCampScene(); }
    var sLevel = m.t === "comp" ? m.comp.level : m.level;
    var sUnit  = m.t === "comp" ? m.comp.unit  : m.unit;
    var hasScope = (m.t === "comp" || m.t === "unit");
    if (m.t === "comp") {
      ids = m.comp.ids;
      got = ids.filter(function (id) { return store.mastered[id]; }).length;
      html = '<div class="pop-title"><img class="pop-badge" src="' + (BADGE_IMG[m.comp.component] || "art/badge/badge_hx.png") + '" alt="">' +
        esc(m.comp.level + " · " + m.comp.unit + " · " + m.comp.component) + '</div>' +
        '<div class="pop-body">' + popStat("板块驿站 · 海拔", m.alt + " 米") +
        popStat("已掌握", "<b>" + got + "</b> / " + ids.length + " 词" + (markDone(m) ? " · 徽章已获得 🏅" : "")) +
        '</div>' + chipListHtml(ids);
    } else if (m.t === "unit") {
      var comps = COMP_LIST.filter(function (c) { return c.level === m.level && c.unit === m.unit; });
      ids = [];
      comps.forEach(function (c) { ids = ids.concat(c.ids); });
      got = ids.filter(function (id) { return store.mastered[id]; }).length;
      html = '<div class="pop-title">⛺ ' + esc(m.level + " · " + m.unit) +
        ' <span class="pop-t-k">营地' + pyl("营地") + enl("营地") + '</span></div>' +
        '<div class="pop-body">' + popStat("单元营地 · 海拔", m.alt + " 米") +
        popStat("已掌握", "<b>" + got + "</b> / " + ids.length + " 词" + (markDone(m) ? " · 单元徽章已获得 ✨" : "")) +
        '</div>';
      /* ⚠️ grouped by 板块 (owner 2026-08-22). One flat run of 21 chips said nothing
         about WHICH part of the unit a student is behind on, and 板块 is the axis the
         rest of the app already sorts by — ①筛选 narrows on it, the A-tier badges are
         one per 板块, and the 板块驿站 card above uses the same badge art. ONE scroller
         wraps all the groups: .chip-wrap's own 38vh box would give a four-板块 unit
         four separate little scroll boxes. */
      html += '<div class="pop-groups">';
      comps.forEach(function (c) {
        var cg = c.ids.filter(function (id) { return store.mastered[id]; }).length;
        html += '<div class="pop-sub"><img class="pop-badge sm" src="' +
          (BADGE_IMG[c.component] || "art/badge/badge_hx.png") + '" alt="">' +
          '<span class="pop-sub-n">' + esc(c.component) + pyl(c.component) + enl(c.component) + '</span>' +
          '<span class="pop-sub-c">' + cg + " / " + c.ids.length + '</span></div>' +
          chipListHtml(c.ids, true);
      });
      html += '</div>' + chipHintHtml();
    } else if (m.t === "level") {
      var units = UNIT_LIST.filter(function (u) { return u.level === m.level; });
      var uDone = units.filter(function (u) { return store.badges[badgeKeyU(u.level, u.unit)]; }).length;
      html = '<div class="pop-title">🚩 ' + esc(m.level) +
        ' <span class="pop-t-k">关卡' + pyl("关卡") + enl("关卡") + '</span></div>' +
        '<div class="pop-body">' + popStat("海拔", m.alt + " 米") +
        popStat("单元完成", "<b>" + uDone + "</b> / " + units.length + (markDone(m) ? " · 年级徽章已获得 🏅" : "")) +
        '</div>' + gymSectionHtml(m) + unitRowsHtml(m.level);
    } else {
      /* ⚠️ owner 2026-08-23：「students will not know what status will unlock 顶峰
         - must make it clear to them that they need to clear all the level
         challenges first (S1/2/3/4)」。这张卡以前只报两个数字（海拔、已掌握），
         **从不说怎样才算登顶**，学生看完仍然不知道自己缺什么。

         ⚠️ 写在这里的条件必须与 markDone() 逐字一致：顶峰 = `badges.t4`，
         而 checkBadges() 里 t4 的条件是**四个年级章全部到手**
         （年级章 ← 该年级所有单元章 ← 所有板块章 ← 该板块所有词语掌握）。
         **不是「四场年度试炼全部通过」**——年度试炼 是另一条线（奖品是神兽头像），
         与登顶无关。两者都被叫过「关卡」，这一段刻意把话说死，免得再混。 */
      var lvRows = LEVELS.map(function (lv) {
        var got = !!store.badges[badgeKeyL(lv)];
        var lw = WORDS.filter(function (w) { return w.level === lv; });
        var left = lw.filter(function (w) { return !store.mastered[w.id]; }).length;
        return '<div class="peak-lv' + (got ? " got" : "") + '">' +
          '<span>' + (got ? "✅" : "🔒") + ' ' + esc(lv) + '</span>' +
          '<span>' + (got ? "年级章已到手" : "还差 " + left + " 词") + '</span></div>';
      }).join("");
      var lvGot = LEVELS.filter(function (lv) { return store.badges[badgeKeyL(lv)]; }).length;
      html = '<div class="pop-title">🏯 <span class="pop-t-k">顶峰' + pyl("顶峰") + enl("顶峰") + '</span></div>' +
        '<div class="pop-body">' + popStat("海拔", m.alt + " 米 · 全部词语的终点") +
        popStat("已掌握", "<b>" + Object.keys(store.mastered).length + "</b> / " + WORDS.length + " 词" +
          (markDone(m) ? " · 你已登顶！👑" : "")) + '</div>' +
        '<div class="gym-sec ' + (markDone(m) ? "done" : "lock") + '">' +
        (markDone(m)
          ? '👑 四个年级全部登顶，顶峰已经是你的了。'
          : '🔒 <b>怎样才能登顶：把中一到中四四个年级的词语全部掌握</b>，' +
            '四枚年级章到齐，顶峰自动解锁。' +
            '<br><span class="pop-hint">目前 ' + lvGot + ' / ' + LEVELS.length +
            ' 个年级完成。年度试炼是另一条路（赢神兽头像），与登顶无关。</span>') +
        '<div class="peak-lvs">' + lvRows + '</div></div>';
    }
    ov = popOverlay(html + popActions(hasScope, back ? (back.level + " 关卡") : ""));
    ov.querySelector("#popBack").onclick = function () { ov.remove(); if (back) openMark(back); };
    if (hasScope) {
      ov.querySelector("#popLearn").onclick = function () { ov.remove(); scopeToUnit(sLevel, sUnit, "study"); };
      ov.querySelector("#popPlay").onclick  = function () { ov.remove(); scopeToUnit(sLevel, sUnit, "play"); };
    }
    /* ⚠️ pass `m` through as the return address, so the unit card knows which peak
       opened it. Rebuilding the marks here keeps the row -> mark mapping identical to
       the one unitRowsHtml rendered from. */
    var uMarks = (m.t === "level")
      ? buildMarks().filter(function (x) { return x.t === "unit" && x.level === m.level; }) : [];
    Array.prototype.forEach.call(ov.querySelectorAll(".pop-unit[data-u]"), function (btn) {
      btn.onclick = function () {
        ov.remove();
        openMark(uMarks[parseInt(btn.getAttribute("data-u"), 10)], m);
      };
    });
    var gymGo = ov.querySelector("#gymGo");
    if (gymGo) gymGo.onclick = function () { ov.remove(); startGym(m.level); };
    wireChips(ov);
  }

  /* ==================================================================
     你的营地 · 场景化界面 (DESIGN_营地场景_商店_v2 + 附录三 layout constraints)
     Static scene for v1 (owner 2026-08-13, for speed): fixed slots, pets fixed
     in a loose cluster by the fire. No walking avatar / pet-follow yet — see
     CLAUDE.md "营地场景 (campsite)" for the deferred-not-rejected note. Layout
     was tuned by compositing the real PNGs and rendering (same method as the
     mountain path): sparse AND full-22 states both checked, centre vista
     (cx 35–65, by<72) kept clear, framing items sit at the edges overlapping
     the painted treeline, front-band cx 30–70 kept near-empty (future-proofs
     a walking corridor even though nothing walks yet).
     ================================================================== */
  /* ---- v2 便携化改版, 2026-08-14 (DESIGN_营地_随身装备与自由摆放.md) ----
     The camp is now TWO systems that behave differently on purpose:
       随身装备 GEAR — player-owned, bought with 灵露, ONE equipped per slot,
         and freely draggable anywhere in the ground band (§4).
       地貌景观 SCENERY — belongs to the LOCATION, not the player. Appears by
         海拔, never bought, never dragged. Clutter is structurally impossible
         here because the system controls it, not accumulation.
     The rule behind every entry: if a hiker would not carry it up the
     mountain, it is scenery or it is cut. The garden-era art (水井/锦鲤池/
     小石桥/楼阁…) moved to archived_art/, NOT deleted. 营旗 was cut outright
     (owner 2026-08-14: the sprite never matched the pixel-art gear style). */
  var PET_LAYOUT = {
    /* fixed cluster by the fire — NOT a following pet (still deferred, §7) */
    gui:   { file: "art/camp/pet_gui.png",   cx: 30, by: 93, w: 5 },
    qilin: { file: "art/camp/pet_qilin.png", cx: 36, by: 96, w: 6 },
    feng:  { file: "art/camp/pet_feng.png",  cx: 42, by: 91, w: 6 },
    long:  { file: "art/camp/pet_long.png",  cx: 46, by: 97, w: 7 }
  };

  /* Slots exist even where only one item fills them today, so the wider
     portable range the owner wants later drops in with no refactor (§3). */
  var GEAR_SLOTS = [
    { slot: "dwelling", name: "住所" }, { slot: "light",   name: "照明" },
    { slot: "scout",    name: "探勘" }, { slot: "water",   name: "饮水" },
    { slot: "storage",  name: "收纳" }, { slot: "living",  name: "起居" },
    { slot: "tea",      name: "茶点" }, { slot: "cook",    name: "炊事" },
    { slot: "food",     name: "干粮" }
  ];
  /* ⚠️ PRICES for the nine new gear items are MINE, not the design doc's (it
     specifies no prices). They follow the existing 20–1000 灵露 scale and
     inherit from the archived equivalent where one exists (行军木箱←书箱 120,
     野餐垫←木桌椅茶具 150, 水壶架←水缸 35→60). Single numbers, trivial to
     retune — flagged for the owner like the old C-tier pricing was. */
  /* ================= 消耗品与竞速道具 (HANDOFF_掌握闸门与消耗品_20260816 §2) ====
     ⚠️ THE ONE BOUNDARY RULE, and every future item must pass it first:
     an item may change the TEST CONDITIONS (time, margin for error, option count).
     It may never replace or lower the requirement to know what the word means.
     That is why none of these touch 海拔 and why none exist in 填空/华文解释/英文翻译.

     ⚠️ 词雨 consumables are safe by construction: 词雨 produces 灵露 only, never
     mastery, so a bought advantage cannot move anything that is ranked on knowing
     words. 攀山快答 is the exception that had to be argued — it DOES confer mastery,
     so its three items are restricted to time and option-count, never to meaning.

     ⚠️ REAL-TIME COMPETITION IS ITEM-FREE. 结伴登峰 and 同伴挑战 run through
     WSArena.open(), and arena.js has its OWN renderers — they never enter these
     loops. That was once the whole argument, but startRain() also accepts a
     roomCode, so as of 2026-08-25 the gate is WRITTEN OUT there (`roomCode ?
     emptyKit() : takeItems("rain")`) rather than left resting on which file
     happens to render. Keep both halves true.

     ⚠️ Everything downstream of this list — the picker, the spend, the effects —
     lives in 道具运行时 below setEquippedItems(). Read that note before adding an
     eleventh item: a new `eff` string here does nothing on its own. */
  var CONSUMABLES = [
    { key: "tanghulu",    zh: "糖葫芦",   en: "+1 life",            img: "consumable_tanghulu",    price: 60,  eff: "life" },
    { key: "yushan",      zh: "羽扇",     en: "Slower fall",        img: "consumable_yushan",      price: 80,  eff: "slow" },
    { key: "youzhisan",   zh: "油纸伞",   en: "Combo shield",       img: "consumable_youzhisan",   price: 90,  eff: "shield" },
    { key: "suanpan",     zh: "算盘",     en: "+10% 灵露",          img: "consumable_suanpan",     price: 100, eff: "bonus" },
    { key: "yuhulu",      zh: "玉葫芦",   en: "Missed words still pay", img: "consumable_yuhulu",  price: 110, eff: "salvage" },
    { key: "dingfengzhu", zh: "定风珠",   en: "Freeze 5s",          img: "consumable_dingfengzhu", price: 120, eff: "freeze" },
    { key: "jinnang",     zh: "锦囊",     en: "Random item",        img: "consumable_jinnang",     price: 70,  eff: "random" }
  ];
  var POWERUPS = [
    { key: "tonghudilou", zh: "铜壶滴漏", en: "+8 seconds",         img: "powerup_tonghudilou",    price: 90,  eff: "time" },
    { key: "hujing",      zh: "护膝",     en: "First slip is free", img: "powerup_hujing",         price: 80,  eff: "knee" },
    { key: "sinan",       zh: "司南",     en: "Remove one wrong",   img: "powerup_sinan",          price: 110, eff: "compass" }
  ];
  /* ⚠️ PRICES ARE MINE — the handoff (§3 item 5) explicitly leaves them unset and
     says to set them against the existing A/B/C ladder. They sit in the 小摆件 band
     (45-75) up to just under the mid gear (90-200), because a consumable is spent
     and a piece of gear is kept. Single numbers, retune freely. */
  function itemByKey(k) {
    for (var i = 0; i < CONSUMABLES.length; i++) if (CONSUMABLES[i].key === k) return CONSUMABLES[i];
    for (var j = 0; j < POWERUPS.length; j++) if (POWERUPS[j].key === k) return POWERUPS[j];
    return null;
  }
  function itemCount(k) { return (store.items && store.items[k]) || 0; }
  function grantItem(k, n) {
    if (!store.items) store.items = {};
    store.items[k] = itemCount(k) + (n || 1);
  }
  /* ⚠️ Spend at the START of a round, never at the end: a student who closes the
     tab mid-round has still had the benefit, and refunding on quit would make the
     shop free to anyone who quits. */
  function spendItem(k) {
    if (itemCount(k) <= 0) return false;
    store.items[k] = itemCount(k) - 1;
    if (!store.items[k]) delete store.items[k];
    return true;
  }
  var ITEM_SLOTS = 3;               // §2.1: 上限 3 个消耗品槽
  function equippedItems(kind) {
    var list = (store.itemSlots && store.itemSlots[kind]) || [];
    /* drop anything no longer owned, so a slot can never spend what you do not have */
    return list.filter(function (k) { return itemByKey(k) && itemCount(k) > 0; }).slice(0, ITEM_SLOTS);
  }
  function setEquippedItems(kind, list) {
    if (!store.itemSlots) store.itemSlots = {};
    store.itemSlots[kind] = list.slice(0, ITEM_SLOTS);
    saveStore();
  }

  /* ================= 道具运行时 (2026-08-25) ===================================
     The shelf, the counts and the slot store all shipped on 2026-08-16; every
     line BELOW them was missing. spendItem() and equippedItems() had no call
     sites, no pre-round picker existed, and the shop's own「赛前最多带 3 件」was
     a promise nothing kept — a student could spend 120 灵露 on 定风珠 and never
     find a way to use it. This block is that missing half.

     ⚠️ THE BOUNDARY RULE STILL RULES (the long note above CONSUMABLES): every
     effect here moves time, lives, 灵露 or the OPTION COUNT. Not one of them
     tells a student what a word means, and 司南 is hard-capped at one removal
     per question — 4→3 是「少一个选项」，4→1 是替学生作答。

     ⚠️ ITEMS DISQUALIFY THE SHARED BOARDS, and that is not a nicety. rainRamp
     and sprint90 exist so everyone is ranked on the same course (2026-08-13/14);
     +8 秒 or two extra hearts is a different course. An item run still earns
     灵露, 海拔 and 本机最高分 — private numbers — and never touches those two.
     That is what kit.any is for.

     ⚠️ REAL-TIME ROOMS TAKE NOTHING. 结伴登峰／同伴挑战 render through arena.js's
     own loops, but startRain() also accepts a roomCode, so the gate is written
     out explicitly there rather than left to trust. */
  var ITEM_ACTIVE = { freeze: 1, compass: 1 };   // tap-to-use; everything else is passive
  var RAIN_SLOW_MUL = 0.75;        // 羽扇 · fall-speed multiplier per copy carried
  var RAIN_FREEZE_S = 5;           // 定风珠 · "Freeze the clock, 5s"
  var LINGLU_ITEM_BONUS = 0.10;    // 算盘 · +10% on the round's banked 灵露
  var SPRINT_TIME_ITEM_MS = 8000;  // 铜壶滴漏 · +8 seconds
  function emptyKit() {
    return { taken: [], any: 0, life: 0, slow: 0, shield: 0, bonus: 0,
             salvage: 0, freeze: 0, time: 0, knee: 0, compass: 0 };
  }
  /* 锦囊 rolls HERE, at spend time, not at use time: an effect the student cannot
     see is an effect they cannot plan around, and the chip in the 局内道具栏 has
     to be able to say what it actually became. */
  function rollJinnang(kind) {
    var pool = (kind === "rain" ? CONSUMABLES : POWERUPS).filter(function (it) {
      return it.eff !== "random";
    });
    return pool[Math.floor(Math.random() * pool.length)];
  }
  /* ⚠️ SPENT AT THE START OF THE ROUND — the reason is written above spendItem()
     and has not changed: a student who closes the tab mid-round has still had the
     benefit. Everything this returns is already paid for. */
  function takeItems(kind) {
    var kit = emptyKit();
    /* ⚠️ A ROOM TAKES NOTHING, AND THE CHECK LIVES HERE — at the ONE choke point every
       loop has to pass through — rather than in each loop's own opening lines.
       startRain() carries a roomCode gate; startSprint() has no such parameter at all,
       so the pair was asymmetric: the day someone wires 攀山快答 into a room the way
       词雨's roomCode implies was once intended, sprint would silently spend a kit and
       apply it. One guard here cannot be forgotten by a loop written later.
       ⚠️ .arena-ov is arena.js's own overlay, appended to document.body by open() and
       removed by close(), for EVERY room mode in both families — 结伴登峰 / 结伴出海 /
       同伴挑战, mountain and pier. Its presence is the honest signal for「房间开着」.
       ⚠️ Belt AND braces on purpose. arena.js has its own renderers, never calls these
       loops, and contains no item code at all, so today this branch never fires. That
       is exactly the point: an invariant that holds only because of which file happens
       to render is one refactor away from being false. */
    if (document.querySelector(".arena-ov")) return kit;
    equippedItems(kind).forEach(function (k) {
      if (!spendItem(k)) return;                  // stock ran out between screens
      var it = itemByKey(k), via = "";
      if (it.eff === "random") { via = it.zh; it = rollJinnang(kind); }
      kit[it.eff] += 1;
      kit.any += 1;
      kit.taken.push({ key: it.key, zh: it.zh, en: it.en, img: it.img,
                       eff: it.eff, via: via, used: 0 });
    });
    if (kit.any) saveStore();                     // banked before the first word is drawn
    return kit;
  }
  function kitUsedLine(kit) {
    if (!kit.taken.length) return "";
    return '<div class="msg">本局用掉：' + esc(kit.taken.map(function (t) {
      return t.via ? t.via + " → " + t.zh : t.zh;
    }).join("、")) + '</div>';
  }

  /* ---------- 赛前道具槽 · the picker the shop kept promising ----------
     Reuses shopTile wholesale, so a 道具 looks identical on the shelf and in the
     slot: same art well, same held-count badge, one tile to restyle rather than
     two that drift apart. */
  function itemPickerHtml(kind, step) {
    var list = kind === "rain" ? CONSUMABLES : POWERUPS;
    var owned = list.filter(function (it) { return itemCount(it.key) > 0; });
    var head = '<div class="diff-label">' + (step ? stepNo(step) : "") + '道具' +
      pyl("道具") + enl("道具") + ' <span class="shop-slot-note">· 最多 ' + ITEM_SLOTS +
      ' 件 · 开始时用掉</span></div>';
    if (!owned.length) {
      return head + '<div class="lo-empty">还没有道具 —— 在「我的词山 · 营地商店」用灵露兑换。' +
        '空手上场完全可以，' + (kind === "rain" ? "词雨灵露" : "攀山快答") + '本来就是这么设计的。</div>';
    }
    var eq = equippedItems(kind);
    return head + '<div class="shop-grid lo-grid">' + owned.map(function (it) {
      var on = eq.indexOf(it.key) !== -1;
      return shopTile({
        img: "art/item/" + it.img + ".png", name: it.zh, sub: it.en, n: itemCount(it.key),
        on: on, act: ' data-lo="' + esc(it.key) + '"',
        foot: shopState(on ? "已带上 ✓" : "带上", on)
      });
    }).join("") + '</div>' +
      (eq.length ? '<div class="lo-note">⚠️ 带道具的一局不进排行榜（那是「大家跑同一套课程」的榜）。' +
        '灵露、海拔和本机最高分照常记录。</div>' : "");
  }
  function wireItemPicker(kind, rerender) {
    Array.prototype.forEach.call(view().querySelectorAll("[data-lo]"), function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-lo"), eq = equippedItems(kind), i = eq.indexOf(k);
        if (i !== -1) eq.splice(i, 1);
        else if (eq.length < ITEM_SLOTS) eq.push(k);
        else { toast("道具槽只有 " + ITEM_SLOTS + " 个，先取下一件"); return; }
        setEquippedItems(kind, eq);
        sfxOk();
        rerender();
      };
    });
  }

  /* ---------- 局内道具栏 ----------
     ⚠️ ONE CHIP PER CHARGE, not per item type: two 定风珠 (or one plus a 锦囊 that
     rolled into a third) is three chips, each spent by its own tap. Passive items
     are SPANS, never disabled buttons — a button that does nothing when tapped is
     exactly what students report as broken. */
  function itemBarHtml(kit) {
    if (!kit.taken.length) return "";
    return '<div class="itembar" id="itemBar">' + kit.taken.map(function (t, i) {
      var act = ITEM_ACTIVE[t.eff], sub = act ? "点我使用" : "本局生效";
      return (act ? '<button type="button" class="ib-chip ib-act" data-ib="' + i + '"'
                  : '<span class="ib-chip"') + ' title="' + esc(t.en) + '">' +
        '<img src="art/item/' + t.img + '.png" alt="" onerror="this.style.display=\'none\'">' +
        '<span class="ib-tx"><b>' + esc(t.zh) + '</b>' +
        '<i class="ib-sub">' + esc(t.via ? t.via + " → " + sub : sub) + '</i></span>' +
        (act ? '</button>' : '</span>');
    }).join("") + '</div>';
  }
  /* use(eff) returns truthy only when the charge was actually consumed — 司南
     refuses on a question it has already thinned, and a refused tap must never
     burn the chip. */
  function wireItemBar(kit, use) {
    var bar = document.getElementById("itemBar"); if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll("[data-ib]"), function (b) {
      b.onclick = function () {
        var t = kit.taken[parseInt(b.getAttribute("data-ib"), 10)];
        if (!t || t.used || !use(t.eff)) return;
        t.used = 1;
        b.disabled = true;
        b.classList.add("is-used");
        var sub = b.querySelector(".ib-sub"); if (sub) sub.textContent = "已用";
      };
    });
  }

  var GEAR = [
    // 住所 is a TIER CHAIN (existing dwellingTier mechanic reused, §3), not a free swap
    { key: "tent",      slot: "dwelling", tier: 1, name: "帆布帐篷", price: 0,    file: "art/camp/tent.png",                w: 20, desc: "起点的家 · 免费" },
    { key: "windproof", slot: "dwelling", tier: 2, name: "防风帐篷", price: 135,  file: "art/camp/gear_tent_windproof.png", w: 20, desc: "住所二级 · 挡得住山风" },
    { key: "alpine",    slot: "dwelling", tier: 3, name: "高山帐篷", price: 450, file: "art/camp/gear_tent_alpine.png",    w: 20, desc: "住所三级 · 雪线之上也扎得稳" },
    { key: "lanterns",  slot: "light",   name: "灯笼串",     price: 180, file: "art/camp/deco_lanterns.png",  w: 11, desc: "夜里最温暖的一排光" },
    { key: "lantern",   slot: "light",   name: "提灯",       price: 120,  file: "art/camp/gear_lantern.png",   w:  7, desc: "挂上木杆，照亮一小圈" },
    { key: "telescope", slot: "scout",   name: "望远镜",     price: 240, file: "art/camp/gear_telescope.png", w:  7, desc: "望向下一座山峰" },
    { key: "compass",   slot: "scout",   name: "罗盘架",     price: 200, file: "art/camp/gear_compass.png",   w:  7, desc: "辨明方向再出发" },
    { key: "canteen",   slot: "water",   name: "水壶架",     price: 90,  file: "art/camp/gear_canteen.png",   w:  8, desc: "随身的水，随时补给" },
    { key: "chest",     slot: "storage", name: "行军木箱",   price: 150, file: "art/camp/gear_chest.png",     w:  9, desc: "装书、装干粮、装路上的收获" },
    { key: "chair",     slot: "living",  name: "折叠椅",     price: 110,  file: "art/camp/gear_chair.png",     w:  9, desc: "坐下来，歇一歇" },
    { key: "picnicmat", slot: "tea",     name: "野餐垫茶具", price: 190, file: "art/camp/gear_picnicmat.png", w: 15, desc: "铺开垫子，泡一壶茶" },
    { key: "stove",     slot: "cook",    name: "野炊炉",     price: 170, file: "art/camp/gear_stove.png",     w:  8, desc: "一口小锅，热汤暖身" },
    { key: "rations",   slot: "food",    name: "干粮袋",     price: 95,  file: "art/camp/gear_rations.png",   w:  9, desc: "馒头，和路上的力气" }
  ];
  /* small/cheap/iconic — owned = always out, no slot, no exclusivity (§2c) */
  var TRINKETS = [
    { key: "fire",      name: "篝火",     price: 75, file: "art/camp/deco_fire.png",      w: 11, desc: "夜里暖手，词语更暖心" },
    { key: "windchime", name: "风铃",     price: 45, file: "art/camp/deco_windchime.png", w:  4, desc: "风一吹就响" },
    { key: "cat",       name: "打盹的猫", price: 60, file: "art/camp/deco_cat.png",       w:  7, desc: "营地里的常住客" },
    { key: "signpost",  name: "木牌路标", price: 45, file: "art/camp/deco_signpost.png",  w:  7, desc: "指向远方的路" }
  ];
  /* 地貌景观 RETIRED 2026-08-14 (owner): "retire everything in the campsite and
     shop that are not camping related e.g. all the scenery items". 青松 / 樱花树 /
     望山台 / 红枫 / 悬泉飞瀑 were landscape features, not things a hiker camps
     with — the camp is now gear only.
     The array is kept (empty) rather than ripped out because sceneryUnlocked and
     both render paths are written against it; refilling it is a one-line change
     if the owner ever wants location features back. The five PNGs stay in
     art/camp/ unreferenced, matching how the garden-era art was retired: archived,
     never deleted. store.deco entries are never pruned either, so nothing an
     existing student owns is lost. */
  var SCENERY = [];
  /* §6 starter layout = what a new player sees, and the 整理营地 reset target.
     Not a constraint: every one of these can be dragged anywhere in BOUNDS. */
  var DEFAULT_POS = {
    tent: { x: 50, y: 82 }, windproof: { x: 50, y: 82 }, alpine: { x: 50, y: 82 },
    fire: { x: 35, y: 90 }, stove: { x: 27, y: 84 }, lantern: { x: 68, y: 80 },
    lanterns: { x: 72, y: 78 }, chair: { x: 60, y: 90 }, picnicmat: { x: 78, y: 96 },
    chest: { x: 84, y: 88 }, canteen: { x: 18, y: 92 }, rations: { x: 23, y: 98 },
    telescope: { x: 8, y: 68 }, compass: { x: 91, y: 64 },
    windchime: { x: 75, y: 80 }, cat: { x: 60, y: 97 }, signpost: { x: 4, y: 97 }
  };
  // ground band only: drops are clamped out of the sky and the painted peaks
  var POS_BOUNDS = { x0: 3, x1: 97, y0: 60, y1: 99 };

  function gearByKey(k) {
    var all = GEAR.concat(TRINKETS);
    for (var i = 0; i < all.length; i++) if (all[i].key === k) return all[i];
    return null;
  }
  /* legacy cabin/tower keys are still honoured: if anyone bought a 木屋 under
     the pre-2026-08-14 shop, they keep an equivalent tier instead of silently
     losing 800 灵露. Their store.deco entry is never deleted either. */
  function dwellingTier() {
    if (store.deco.alpine || store.deco.tower) return 3;
    if (store.deco.windproof || store.deco.cabin) return 2;
    return 1;
  }
  function dwellingKey() { return ["tent", "windproof", "alpine"][dwellingTier() - 1]; }
  function equippedIn(slot) {
    if (slot === "dwelling") return dwellingKey();
    var k = store.equip[slot];
    if (k && store.deco[k]) return k;
    var owned = GEAR.filter(function (g) { return g.slot === slot && store.deco[g.key]; });
    return owned.length ? owned[0].key : null;   // auto-equip a fresh purchase
  }
  function ownedGearIn(slot) { return GEAR.filter(function (g) { return g.slot === slot; }); }
  function sceneryUnlocked(s) { return altitudeNow() >= Math.round((WORDS.length || 0) * s.pct); }
  function clampPos(p) {
    return { x: Math.min(POS_BOUNDS.x1, Math.max(POS_BOUNDS.x0, p.x)),
             y: Math.min(POS_BOUNDS.y1, Math.max(POS_BOUNDS.y0, p.y)) };
  }
  function posOf(key) { return clampPos(store.decoPos[key] || DEFAULT_POS[key] || { x: 50, y: 90 }); }
  // lower on screen draws in front; recomputed live while dragging
  function zFor(y) { return 100 + Math.round(y * 4); }

  /* shared sprite element with a graceful no-white-screen fallback: if the
     bundled PNG somehow 404s, hide the broken image rather than show a
     browser placeholder icon. */
  function campSprite(cls, file, cx, by, w, title, key) {
    /* draggable="false": an <img> is natively draggable, and on Safari that
       native drag hijacks the gesture so the sprite never moves. See the
       matching -webkit-user-drag rule on .camp-move in cs.css. */
    return '<img class="' + cls + '" draggable="false" ' + (key ? 'data-key="' + esc(key) + '" ' : '') +
      'src="' + file + '" alt="" title="' + esc(title || "") + '" ' +
      'style="left:' + cx + '%;bottom:' + (100 - by) + '%;width:' + w + '%' +
      (key ? ';z-index:' + zFor(by) : '') + '" ' +
      'onerror="this.style.display=\'none\'">';
  }

  /* ---------- 你的营地 base camp scene (decoration + shop entry) ----------
     ⚠️ CAMP_MODES and launchMode() lived here and are GONE (owner 2026-08-17).
     They existed only to build the 自由试炼 button row under the scene; with that
     row removed they were dead code, and dead launchers are worse than none —
     the next change to how a mode starts would have had two places to update and
     no symptom for missing one. ② on the home screen is the only launcher. */
  /* every sprite the student can actually move: the equipped item in each slot
     (住所 included — owner 2026-08-14 chose consistency over a fixed tent
     anchor) plus every owned trinket. Swapping an item out of its slot does
     NOT discard its saved position; re-equipping restores where it was left. */
  function placedItems() {
    var out = [];
    GEAR_SLOTS.forEach(function (s) {
      var k = equippedIn(s.slot);
      var g = k && gearByKey(k);
      if (g) out.push(g);
    });
    TRINKETS.forEach(function (t) { if (store.deco[t.key]) out.push(t); });
    return out;
  }
  function openCampScene() {
    setTopbar("home", "");
    var sprites = "";
    // 地貌景观 first: always furthest back, system-placed, never draggable
    SCENERY.forEach(function (s) {
      if (sceneryUnlocked(s)) sprites += campSprite("camp-deco camp-scenery", s.file, s.cx, s.by, s.w, s.name);
    });
    // 随身装备 + 小摆件: free placement, drawn back-to-front by their own y
    placedItems().map(function (it) {
      return { it: it, p: posOf(it.key) };
    }).sort(function (a, b) { return a.p.y - b.p.y; }).forEach(function (r) {
      sprites += campSprite("camp-deco camp-move", r.it.file, r.p.x, r.p.y, r.it.w, r.it.name + "（可拖动）", r.it.key);
    });
    // pets: fixed cluster near the fire (静态位置, 跟随留待日后)
    LEVELS.forEach(function (lv) {
      if (!store.gym[lv]) return;
      var p = petFor(lv), pl = p && PET_LAYOUT[p.key];
      if (!pl) return;
      sprites += campSprite("camp-pet", pl.file, pl.cx, pl.by, pl.w, p.name);
    });

    var html = '<div class="camp2-wrap"><div class="camp2-stage" id="campStage">' +
      '<img class="camp2-bg" src="art/camp/camp_bg.png" alt="" onerror="this.parentNode.classList.add(\'camp2-bg-fallback\')">' +
      sprites + '</div>' +
      '<div class="camp2-hud"><span class="m2pill">' + campLingluIcon() + ' <b>' + fmtNum(store.lingLu) + '</b></span>' +
      '<button class="m2pill" id="campShopBtn">🛒 营地商店</button>' +
      '<button class="m2pill" id="campTidyBtn">🧹 整理营地</button>' +
      '<button class="m2pill" id="campUidBtn">🪪 识别码</button></div>' +
      '<div class="camp-hint">按住装备可以拖到你喜欢的位置</div>' +
      /* ⚠️ NO 自由试炼 MODE ROW HERE (owner 2026-08-17: "this is just the deco and
         shop section"). It used to print seven activity buttons under the scene,
         a second launcher for the same seven modes ② already lists twelve lines
         further up the same page — and it launched them against「the scope you
         picked on 学习」, a rule stated in one line of small print and nowhere else.
         Nothing is orphaned: 填空/华文/英文 live behind 学习挑战 in 学习, and
         词雨/攀山/组词/汉兜 are the four cards in 闯关. The camp is now what its
         art has always shown it to be: your tent, your things, and the shop. */
      '<div class="nav-row" style="max-width:520px;margin:14px auto 0"><button class="nav-btn" id="campBack">‹ 返回</button></div>' +
      '</div>';
    view().innerHTML = html;

    document.getElementById("campBack").onclick = renderHome;
    document.getElementById("campShopBtn").onclick = openShopScene;
    document.getElementById("campUidBtn").onclick = showCampUid;
    document.getElementById("campTidyBtn").onclick = function () {
      /* popOverlay + two nav buttons is cs.js's own confirm pattern — profile.js
         has a confirmDialog() helper but it is NOT exported to cs.js. */
      var ov = popOverlay(
        '<div class="pop-title">🧹 整理营地</div>' +
        '<div class="pop-body">把所有装备摆回建议的位置。<br>你拥有的东西一件都不会少，只是位置回到默认。</div>' +
        '<div class="nav-row"><button class="nav-btn" id="tidyNo">取消</button>' +
        '<button class="nav-btn primary" id="tidyYes">整理</button></div>');
      ov.querySelector("#tidyNo").onclick = function () { ov.remove(); };
      ov.querySelector("#tidyYes").onclick = function () {
        ov.remove();
        store.decoPos = {};
        saveStore();
        openCampScene();
        toast("营地已整理 ✓");
      };
    };
    wireCampDrag(document.getElementById("campStage"));
  }

  /* ---------- 自由摆放 drag (§4) ----------
     Pointer events, so mouse / touch / stylus all work from one code path.
     No press-and-hold gate: this is a cosmetic action, not a quiz answer, so
     the dwellGate rules elsewhere in the app deliberately do not apply.
     touch-action:none on .camp-move (cs.css) stops a drag from scrolling the
     page instead of moving the item. */
  /* ONE drag record, with move/up bound to the DOCUMENT and wired exactly once.
     They used to be bound to each sprite and to rely on setPointerCapture — but
     that call sits in a try/catch, so wherever capture fails silently the
     pointer leaves the small sprite after a few pixels and pointermove stops
     firing: the item twitches and sticks. Document-level listening removes the
     dependency. Wired once because openCampScene() runs on every camp visit and
     per-visit listeners would pile up. */
  var _campDrag = null;
  var _campDragWired = false;
  function campDragMove(e) {
    if (!_campDrag) return;
    var r = _campDrag.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    e.preventDefault();
    var p = clampPos({ x: (e.clientX - r.left) / r.width * 100,
                       y: (e.clientY - r.top) / r.height * 100 });
    _campDrag.img.style.left = p.x + "%";
    _campDrag.img.style.bottom = (100 - p.y) + "%";
    _campDrag.img.style.zIndex = zFor(p.y);
    _campDrag.pos = p; _campDrag.moved = true;
  }
  function campDragEnd() {
    if (!_campDrag) return;
    _campDrag.img.classList.remove("camp-dragging");
    // a tap that never moved must NOT rewrite the saved position
    if (_campDrag.moved && _campDrag.pos) {
      store.decoPos[_campDrag.img.getAttribute("data-key")] = {
        x: Math.round(_campDrag.pos.x * 10) / 10, y: Math.round(_campDrag.pos.y * 10) / 10
      };
      saveStore();
    }
    _campDrag = null;
  }
  function wireCampDrag(stage) {
    if (!stage) return;
    _campDrag = null;
    Array.prototype.forEach.call(stage.querySelectorAll(".camp-move"), function (img) {
      img.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        _campDrag = { img: img, stage: stage, moved: false };
        img.classList.add("camp-dragging");
        try { img.setPointerCapture(e.pointerId); } catch (err) {}
      });
      // belt and braces for Safari, which may still attempt a native image drag
      img.addEventListener("dragstart", function (e) { e.preventDefault(); });
    });
    if (_campDragWired) return;
    _campDragWired = true;
    /* passive:false so preventDefault() during a move is honoured — without it a
       touch drag can still scroll the page on some browsers. */
    document.addEventListener("pointermove", campDragMove, { passive: false });
    document.addEventListener("pointerup", campDragEnd);
    document.addEventListener("pointercancel", campDragEnd);
  }
  function petKeyOf(level) { var p = petFor(level); return p ? p.key : null; }
  function campLingluIcon() {
    return '<img class="ling-icon" src="art/camp/linglu.png" alt="灵露" onerror="this.outerHTML=\'✨\'">';
  }
  function showCampUid() {
    var ov = popOverlay(
      '<div class="pop-title">🪪 识别码</div>' +
      '<div class="pop-body">如需向老师反映问题或核对排行榜身份，请提供此识别码。</div>' +
      '<div class="camp-uid"><code id="campUid">载入中…</code>' +
      '<button class="uid-copy" id="uidCopy">复制</button></div>' +
      '<div class="nav-row"><button class="nav-btn primary" id="popOk">知道了</button></div>');
    ov.querySelector("#popOk").onclick = function () { ov.remove(); };
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

  /* ---------- 营地商店 camp shop (灵露兑换) ----------
     ⚠️ TILES, NOT ROWS, AND NO FRAME AROUND AN ITEM (owner 2026-08-17, asking for
     the Pikmin Bloom shelf on BOTH shops). Every item used to be a bordered row of
     thumb + text + price + button — four columns of chrome around a 44px thumbnail,
     which is the one part of the row a student actually recognises. Now the art is
     large and unframed, the name sits under it, and the price is a coin and a
     number. The pier's 海滩小铺 got the identical treatment; the two files carry
     their own copies of these rules on purpose (§17). */
  /* ⚠️ THE WHOLE TILE IS THE BUTTON — never a div with a button inside it
     (§14「按钮嵌套按钮」). Each item offers exactly ONE action at a time, so `act`
     is the only thing that differs between states; a state with no action renders
     as a <div>, because 已装备 is a fact rather than a greyed-out offer. */
  function shopTile(o) {
    var tag = o.act ? "button" : "div";
    return "<" + tag + ' class="shop-tile' + (o.on ? " is-on" : o.owned ? " is-own" : "") + '"' +
      (o.act || "") + (o.act && o.dis ? " disabled" : "") + ">" +
      '<span class="shop-ic"><img src="' + o.img + '" alt="" ' +
        "onerror=\"this.style.display='none'\">" +
        (o.n ? '<i class="shop-n">' + o.n + "</i>" : "") + "</span>" +
      '<b>' + esc(o.name) + "</b>" +
      (o.sub ? '<span class="shop-sub">' + esc(o.sub) + "</span>" : "") +
      o.foot + "</" + tag + ">";
  }
  function shopCost(n) {
    return '<span class="shop-cost">' + campLingluIcon() + " " + fmtNum(n) + "</span>";
  }
  function shopState(txt, on) {
    return '<span class="shop-state' + (on ? " on" : "") + '">' + esc(txt) + "</span>";
  }
  function shopRow(it, owned, afford, buyKey) {
    return shopTile({
      img: it.file, name: it.name, sub: it.desc, owned: owned,
      act: owned ? "" : ' data-key="' + esc(buyKey) + '"', dis: !afford,
      foot: owned ? shopState("已拥有 ✓", 1) : shopCost(it.price)
    });
  }
  /* one tile per gear item. Three states, because owning and equipping are now
     separate: 未拥有 -> 价格 · 已拥有但没装上 -> 装备 · 装备中 -> 已装备 ✓ */
  function gearRow(it, slot) {
    var owned = !!store.deco[it.key] || (slot === "dwelling" && it.tier === 1);
    var equipped = equippedIn(slot) === it.key;
    var locked = slot === "dwelling" && it.tier > dwellingTier() + 1;
    var afford = store.lingLu >= it.price;
    return shopTile({
      img: it.file, name: it.name, sub: it.desc, on: equipped, owned: owned,
      act: equipped ? ""
         : owned ? ' data-eq="' + esc(it.key) + '" data-slot="' + esc(slot) + '"'
         : locked ? "" : ' data-key="' + esc(it.key) + '"',
      dis: !afford,
      foot: equipped ? shopState("已装备 ✓", 1)
          : owned ? shopState("装备", 0)
          : locked ? '<span class="shop-state locked">先升级前一级</span>'
          : (it.price ? shopCost(it.price) : shopState("—", 0))
    });
  }
  function openShopScene() {
    setTopbar("home", "");
    var gearHtml = GEAR_SLOTS.map(function (s) {
      var items = ownedGearIn(s.slot);
      if (!items.length) return "";
      var note = s.slot === "dwelling" ? "逐级升级" : (items.length > 1 ? "同一格只能装一件" : "");
      return '<div class="shop-tier-label">' + esc(s.name) + (note ? ' <span class="shop-slot-note">· ' + note + '</span>' : '') + '</div>' +
        '<div class="shop-grid">' + items.map(function (it) { return gearRow(it, s.slot); }).join("") + '</div>';
    }).join("");
    var trinketHtml = TRINKETS.map(function (it) {
      return shopRow(it, !!store.deco[it.key], store.lingLu >= it.price, it.key);
    }).join("");

    /* ⚠️ 船只 ARE SOLD HERE TOO (owner 2026-08-16 evening). A boat now sails the
       LANDING SEA MAP, which every student sees, but its only currency was 贝壳 —
       earnable solely at the pier, which most CL students never enter. So each
       boat carries a second, independent 灵露 price.
       ⚠️ This is NOT a 贝壳↔灵露 exchange and must never become one: there is no
       resale, so no value can cross the waterline. See the long note above
       WSBoats in profile.js before touching it.
       Ownership is GLOBAL (ws2_profile) and profile.js is its only writer — this
       screen just calls buyLingLu and repaints. */
    var boatHtml = "";
    if (window.WSBoats) {
      var bpick = window.WSBoats.pick();
      boatHtml = '<div class="shop-tier-label">船只 <span class="shop-slot-note">· 在海图上开的船，买下的随时可以换</span></div>' +
        '<div class="shop-grid shop-boats">' + window.WSBoats.list().map(function (b) {
          var own = window.WSBoats.owns(b.t), on = bpick === b.t;
          var buyable = window.WSBoats.buyable(b.t);
          var can = buyable && store.lingLu >= b.ling;
          return shopTile({
            img: window.WSBoats.art(b.t), name: b.zh, sub: b.en, on: on, owned: own,
            act: on ? "" : own ? ' data-boatpick="' + b.t + '"'
               : !buyable ? "" : ' data-boatbuy="' + b.t + '"',
            dis: !can,
            foot: (on ? shopState("正在开", 1)
                 : own ? shopState("换上", 0)
                 : !buyable ? '<span class="shop-state locked">先买' +
                     esc((window.WSBoats.byTier(b.t - 1) || {}).zh || "") + "</span>"
                 : shopCost(b.ling)) +
              (own || b.shells === undefined ? ""
                 : '<span class="shop-alt">或 ' + b.shells + " 贝壳（出发码头）</span>")
          });
        }).join("") + '</div>';
    }

    /* 消耗品与竞速道具：可重复购买，所以显示的是「持有数」而不是「已拥有」。
       ⚠️ 它们不占装备格，也不进 store.deco —— deco 是「买过就永远拥有」的装饰，
       这些是会被消耗掉的。 */
    /* ⚠️ the held count is a BADGE ON THE ART, not a line of text: these are the only
       repeat-buyable things in either shop, and「持有 3」buried in a subtitle is what
       a student misses right before buying a fourth. Same corner-badge read as the
       Pikmin Bloom shelf the owner pointed at. */
    function itemRow(it, kind) {
      var have = itemCount(it.key), afford = store.lingLu >= it.price;
      return shopTile({
        img: "art/item/" + it.img + ".png", name: it.zh, sub: it.en, n: have || 0,
        act: ' data-item="' + it.key + '"', dis: !afford,
        foot: shopCost(it.price)
      });
    }
    var itemHtml =
      '<div class="shop-tier-label">词雨消耗品 <span class="shop-slot-note">· 单局用掉 · 在词雨灵露开始前的「道具」里最多带 ' +
        ITEM_SLOTS + ' 件</span></div><div class="shop-grid">' +
      CONSUMABLES.map(function (it) { return itemRow(it, "rain"); }).join("") + '</div>' +
      '<div class="shop-tier-label">攀山快答道具 <span class="shop-slot-note">· 只改变时间与选项，不替你认字 · 在攀山快答的第 3 步带上</span></div>' +
      '<div class="shop-grid">' +
      POWERUPS.map(function (it) { return itemRow(it, "sprint"); }).join("") + '</div>';

    var html = '<div class="camp2-wrap"><div class="shop2-card">' +
      '<div class="pop-title">🛒 营地商店 · 灵露兑换</div>' +
      '<div class="camp-wallet">' + campLingluIcon() + ' 灵露 <b>' + fmtNum(store.lingLu) + '</b> · 在词雨灵露中接住词语获得</div>' +
      '<div class="shop-note">背上山的东西：每一格只装一件，随时换。买下的不会消失，换下来也留着。</div>' +
      gearHtml + boatHtml + itemHtml +
      '<div class="shop-tier-label">小摆件 <span class="shop-slot-note">· 不占格子</span></div><div class="shop-grid">' + trinketHtml + '</div>' +
      '<div class="nav-row"><button class="nav-btn" id="shopBack">‹ 回营地' + pyl("回营地") + enli("回营地") + '</button></div>' +
      '</div></div>';
    view().innerHTML = html;
    document.getElementById("shopBack").onclick = openCampScene;
    Array.prototype.forEach.call(view().querySelectorAll(".shop-tile[data-key]"), function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute("data-key"), it = gearByKey(key);
        if (!it || store.deco[key] || store.lingLu < it.price) return;
        if (it.slot === "dwelling" && it.tier > dwellingTier() + 1) return;   // chain order
        store.lingLu -= it.price;
        store.deco[key] = 1;
        if (it.slot && it.slot !== "dwelling") store.equip[it.slot] = key;    // a new buy goes on right away
        saveStore();
        toast("已兑换：" + it.name + " ✨");
        openShopScene();   // re-render with updated wallet + ownership
      };
    });
    /* deduct → verify → persist lives inside WSBoats.buyLingLu, which spends through
       our own registerCodeProvider hook, so cs.js stays the only writer of the wallet */
    Array.prototype.forEach.call(view().querySelectorAll("[data-item]"), function (btn) {
      btn.onclick = function () {
        var it = itemByKey(btn.getAttribute("data-item"));
        if (!it || store.lingLu < it.price) return;
        store.lingLu -= it.price;      // deduct, then record, same order as everywhere
        grantItem(it.key, 1);
        saveStore();
        toast("已兑换：" + it.zh + "（持有 " + itemCount(it.key) + "）");
        openShopScene();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll("[data-boatbuy]"), function (btn) {
      btn.onclick = function () {
        var t = parseInt(btn.getAttribute("data-boatbuy"), 10);
        if (!window.WSBoats || !window.WSBoats.buyLingLu(t)) return;
        toast("已兑换：" + ((window.WSBoats.byTier(t) || {}).zh || "船") + " ⛵");
        openShopScene();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll("[data-boatpick]"), function (btn) {
      btn.onclick = function () {
        var t = parseInt(btn.getAttribute("data-boatpick"), 10);
        if (window.WSBoats && window.WSBoats.setPick(t)) openShopScene();
      };
    });
    Array.prototype.forEach.call(view().querySelectorAll(".shop-tile[data-eq]"), function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute("data-eq"), slot = btn.getAttribute("data-slot");
        if (slot === "dwelling" || !store.deco[key]) return;
        store.equip[slot] = key;
        saveStore();
        toast("已装备：" + (gearByKey(key) || {}).name);
        openShopScene();
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
     我的词山 · static illustrated mountain (redesigned 2026-08-10,
     per-stream art 2026-08-15)
     PER-STREAM island art (art/mountain/mtn_*.png) on the sea — the same
     island the student sailed to on the landing 航海选择页, so the mountain
     they climb and the one they picked are visibly the same place. This
     replaced the single shared art/bg/mountain_bg.png, which is now unreferenced
     (left in place, not deleted, like the retired camp scenery).
     unit / 关卡 / 你的营地 / 顶峰 pins placed along the painted trail by
     altitude fraction; the camp tent doubles as the "you are here" marker. No
     scroll / camera / joystick / render loop. Tapping a pin reuses openMark
     (unit words · 年度试炼 gym · 营地 camp+shop · summit), so all v0.4
     popovers carry over unchanged. The altitude zones are unchanged; the HUD
     just labels the current one.
     Pin positions come from MTN_PATHS[STREAM] — see the tracing note there.
     ================================================================== */
  /* ---- per-stream mountain art + its own hand-traced trail ----
     Each stream now has its OWN illustrated island (art/mountain/mtn_*.png)
     instead of the single shared art/bg/mountain_bg.png, so the mountain a
     student climbs is the same one they sailed to on the landing sea map.

     MTN_PATHS runs foot -> summit hut as fractions of THAT sprite. These were
     traced by eye against a fraction grid, NOT auto-detected: three automated
     passes were tried and all failed on this art. A per-row brightest-warm scan
     and a Dijkstra route both followed the sunlit grassland instead of the
     trail, because on these islands the lit grass is the same warm tan as the
     path and is much wider, and a shortest path will always take the shortcut
     over a switchback. If the art is ever regenerated, re-trace by eye and
     render the polyline back over the image to check it — do not trust a
     colour test here.

     ART_AR is the sprite aspect ratio; the stage takes it so the island fills
     the frame exactly and the pin fractions stay in sprite space. */
  var MTN_ART = {
    g1:  { src: "art/mountain/mtn_g1.png",  ar: 1100 / 675 },
    g2:  { src: "art/mountain/mtn_g2.png",  ar: 1100 / 917 },
    g3:  { src: "art/mountain/mtn_g3.png",  ar: 1100 / 898 },
    hcl: { src: "art/mountain/mtn_hcl.png", ar: 1100 / 938 }
  };
  var MTN_PATHS = {
    g1: [[0.318,0.809],[0.356,0.767],[0.364,0.718],[0.334,0.673],[0.363,0.626],
         [0.407,0.591],[0.454,0.560],[0.507,0.540],[0.534,0.494],[0.513,0.443],
         [0.496,0.392],[0.521,0.342],[0.513,0.288],[0.479,0.242],[0.486,0.187]],
    g2: [[0.497,0.863],[0.554,0.794],[0.511,0.721],[0.442,0.669],[0.395,0.625],
         [0.479,0.601],[0.434,0.538],[0.503,0.508],[0.534,0.451],[0.516,0.389],
         [0.471,0.333],[0.538,0.286],[0.487,0.234],[0.516,0.178],[0.496,0.102]],
    g3: [[0.470,0.781],[0.496,0.731],[0.506,0.682],[0.526,0.629],[0.494,0.588],
         [0.468,0.540],[0.493,0.487],[0.512,0.435],[0.474,0.392],[0.488,0.340],
         [0.494,0.292],[0.466,0.252],[0.498,0.205],[0.468,0.159],[0.493,0.107]],
    hcl:[[0.413,0.925],[0.459,0.877],[0.484,0.815],[0.491,0.748],[0.499,0.685],
         [0.494,0.622],[0.531,0.569],[0.499,0.511],[0.509,0.450],[0.548,0.409],
         [0.561,0.345],[0.539,0.283],[0.504,0.230],[0.527,0.169],[0.499,0.110]]
  };
  /* 顶峰 crown: the ring that encircles each island's summit building, in the
     SAME sprite fractions as MTN_PATHS (r is a fraction of sprite WIDTH). The
     summit used to be a 🏯 pin dropped on the peak, which sat squarely on top of
     the pavilion and hid the one thing a student climbs towards. It is now a
     hollow ring drawn AROUND the building — measured off each sprite, roof eave
     to roof eave, so nothing is covered. Re-measure if the art changes. */
  var MTN_CROWN = {
    /* g1's pavilion sits hard against the top of its sprite, so its ring is the
       one the stage edge can clip: keep r tight to the roof eaves (half-width is
       0.063 of the sprite) rather than giving it a generous margin like the rest */
    g1:  { x: 0.515,  y: 0.070,  r: 0.066 },
    g2:  { x: 0.504,  y: 0.078,  r: 0.082 },
    g3:  { x: 0.5105, y: 0.0525, r: 0.062 },
    hcl: { x: 0.521,  y: 0.085,  r: 0.082 }
  };
  var MTN_SKIN = MTN_ART[STREAM] || MTN_ART.g1;
  var MTN_PATH = MTN_PATHS[STREAM] || MTN_PATHS.g1;
  var MTN_TOP  = MTN_CROWN[STREAM] || MTN_CROWN.g1;
  function mtnPathAt(frac) {
    var n = MTN_PATH.length - 1;
    var s = Math.max(0, Math.min(n - 0.0001, frac * n));
    var i = Math.floor(s), f = s - i, a = MTN_PATH[i], b = MTN_PATH[i + 1];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
  }
  /* Perpendicular direction at a point on the trail, as a UNIT vector in SCREEN
     px space. Pin offsets are px (they must track the pin sizes, which are px,
     not the stage), but MTN_PATHS is in sprite fractions — x of width, y of
     height — so x has to be scaled by the aspect ratio before the vector is
     normalised, or the offsets skew on the tall sprites (hcl is 1100x938).
     +ve = right of travel. */
  function mtnNormalAt(frac) {
    var n = MTN_PATH.length - 1;
    var s = Math.max(0, Math.min(n - 0.0001, frac * n));
    var i = Math.floor(s), a = MTN_PATH[i], b = MTN_PATH[i + 1];
    var dx = (b[0] - a[0]) * MTN_SKIN.ar, dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / len, y: dx / len };
  }
  function mtnPinIcon(m, locked) {
    /* the camp is the 你在这里 marker as well as a landmark, so its emoji sits in
       its own span: the span floats, the button keeps the translate(-50%,-50%)
       positioning and its hover scale (animating the button's transform would
       fight both). */
    if (m.t === "base") return '<span class="mtn2-tent">⛺</span>';
    /* summit draws as a hollow ring AROUND the building (see MTN_CROWN), so it
       carries no glyph — an emoji here would cover the art the ring frames. */
    if (m.t === "summit") return "";
    /* a 🔒 flag is the ONE landmark that is actually stopping the climb — see the
       gate note in startMountain. Every other unpassed 关卡 keeps its 🚩. */
    if (m.t === "level") {
      if (locked) return "🔒";
      return (store.gym[m.level] && petFor(m.level)) ? petFor(m.level).emoji : "🚩";
    }
    return "";   // unit: a plain dot (gold when its badge is earned)
  }
  /* ⚠️ MEASURED, not modelled — and it has to be, which is why it runs after layout.
     The perpendicular offsets in startMountain stop CONSECUTIVE pins colliding, and at
     ≥900px that is the whole story (0 unreachable pins on all four islands). They cannot
     stop the hand-traced trail's own SWITCHBACKS from folding two distant altitudes onto
     the same few pixels: on a 640x393 phone stage, 中一单元三 and 中一关卡 are 30px apart
     ALONG the path and 12px apart on screen. No formula over MTN_PATHS knows that without
     re-deriving layout, so this asks the browser instead.
     ⚠️ Pins are only ever pushed FURTHER OUT along their own normal — the along-path
     coordinate never moves. A pin nudged up the mountain would be a lie about altitude,
     which is the one thing this map has to be exact about (the camp is read against it);
     a pin standing a little further off the trail is not.
     ⚠️ Bounded (34px, 5 rounds). It is allowed to give up: a pin that ends up slightly
     overlapped still draws and still takes its own tap, because .t-unit/.t-level sit
     above the camp — the failure it exists to prevent is a landmark whose CENTRE is
     inside another pin's box, which is the one that cannot be tapped at all. */
  var _mtnResizeHooked = 0, _mtnResizeT = 0;
  function mtnDeconflict() {
    var all = [].slice.call(document.querySelectorAll(".mtn2-pin"));
    var mov = [], base = [], nx = [], ny = [], cur = [], self = [], i;
    all.forEach(function (p, ai) {
      if (!p.hasAttribute("data-nx")) return;      // 顶峰 is an obstacle, never a mover
      var k = mov.length;
      mov.push(p); self[k] = ai;
      base[k] = parseFloat(p.getAttribute("data-off")) || 0;
      nx[k] = parseFloat(p.getAttribute("data-nx")) || 0;
      ny[k] = parseFloat(p.getAttribute("data-ny")) || 0;
      cur[k] = base[k];
    });
    if (mov.length < 2) return;
    function put(k, v) {
      mov[k].style.setProperty("--ox", (nx[k] * v).toFixed(1) + "px");
      mov[k].style.setProperty("--oy", (ny[k] * v).toFixed(1) + "px");
    }
    /* ⚠️ no transition while the pass settles, or the pins visibly slide into place on
       every visit. Lifted on the next frame, so hover still animates. */
    var isle = document.querySelector(".mtn2-isle");
    if (isle) {
      isle.classList.add("settling");
      requestAnimationFrame(function () { isle.classList.remove("settling"); });
    }
    for (i = 0; i < mov.length; i++) put(i, base[i]);   // reset: this must be idempotent

    function box(el) {
      var r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
    }
    /* the failure this exists to prevent is a landmark whose CENTRE sits inside another
       pin's box — that is the one that cannot be tapped at all. Mere overlap is fine:
       .t-unit/.t-level draw above the camp, so an overlapped dot is still both visible
       and clickable. */
    function buried(a, b) {
      return b.w > 0 && Math.abs(a.cx - b.cx) < b.w / 2 && Math.abs(a.cy - b.cy) < b.h / 2;
    }
    function clash(bx, me, B) {
      for (var j = 0; j < all.length; j++) { if (j !== me && buried(bx, B[j])) return true; }
      return false;
    }
    var STEP = 8, MAX = 38;
    /* ⚠️ BOTH directions, current magnitude first. Pushing further along the normal is
       not always away from the obstacle: where the trail switches back, the normal at
       one pin points straight at its neighbour across the bend, so "further out" walks
       INTO it. Trying only the outward sign left three pins buried on a phone. */
    var CAND = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4], FLIP = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    for (var round = 0; round < 3; round++) {
      var B = all.map(box), moved = false;
      for (i = 0; i < mov.length; i++) {
        if (!clash(B[self[i]], self[i], B)) continue;
        var sign = base[i] < 0 ? -1 : 1, best = null, c, v, cand;
        for (c = 0; c < CAND.length; c++) {
          v = sign * FLIP[c] * Math.min(MAX, Math.abs(base[i]) + CAND[c] * STEP);
          /* ⚠️ the candidate box is COMPUTED, never measured. .mtn2-pin carries
             `transition:transform .12s`, so writing --ox and reading the rect back in
             the same tick returns the pin's OLD position — the search then thinks every
             candidate is identical and gives up on all of them. (It did.) The offset is
             a pure translation, so arithmetic is exact here anyway. */
          cand = { cx: B[self[i]].cx + nx[i] * (v - cur[i]), cy: B[self[i]].cy + ny[i] * (v - cur[i]),
                   w: B[self[i]].w, h: B[self[i]].h };
          if (!clash(cand, self[i], B)) { best = v; break; }
        }
        if (best === null || best === cur[i]) continue;
        B[self[i]] = { cx: B[self[i]].cx + nx[i] * (best - cur[i]), cy: B[self[i]].cy + ny[i] * (best - cur[i]),
                       w: B[self[i]].w, h: B[self[i]].h };
        cur[i] = best; put(i, best); moved = true;
      }
      if (!moved) break;
    }
  }
  function startMountain() {
    setTopbar("home", "");
    ensureIdIndex();
    var alt = altitudeNow();
    var totalAlt = WORDS.length || 1;
    var marks = buildMarks();
    /* ⚠️ 单元 pins are NOT on the map any more (owner 2026-08-22: 「would it work
       better if only the 4 level final stages and the ultimate challenge is preserved
       on the mountain images? … maybe it's not so important to have the small chapter
       circles?」). 23 dots over ~330px of painted trail is ~12px between centres for a
       19px dot: even with every one of them offset sideways and provably clickable, the
       chain reads as a smear and a student cannot count it — which is why 「中四 只有四
       个单元」 still looked true after the pins were all provably there.
       ⚠️ The unit CARDS did not go anywhere: 关卡 now lists its own units by name and
       theme with a mastered count each, and each row opens the same card the dot used
       to (§18ag). A landmark you can read beats a dot you have to hover to identify. */
    var pins = marks.filter(function (m) {
      return m.t === "base" || m.t === "level" || m.t === "summit";
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

    /* 你的营地 climbs WITH the student (owner 2026-08-14). It used to be nailed to
       frac 0 with a separate 15px "你在这里" dot at the live altitude — two markers
       for one idea, and the tent never moved no matter how far you got. Now the
       tent IS the you-are-here marker: it sits at the current altitude fraction,
       and the old .mtn2-hero dot is gone (it would have sat exactly underneath).
       Only the RENDERED position changed — buildMarks still records the camp at
       alt 0, so goals, zone boundaries and markDone are all untouched. */
    /* ⚠️ 你的营地 STOPS at the first 关卡 whose 年度试炼 is still unpassed (owner
       2026-08-22: 「I haven't passed the S1 final challenge so my campsite shouldn't
       be past that even though my mastery percentage is beyond」). Altitude alone
       used to move it, so a student who had never cleared 中一年度试炼 still saw the
       tent pitched somewhere up 中三. The HUD number is still the true 已掌握 count —
       the tent is the CLIMB, and the climb has a gate.
       ⚠️ Only the DRAWN position changes. buildMarks still records the camp at alt 0,
       so goals, zone boundaries and markDone are untouched.
       ⚠️ Landmarks above the gate stay tappable (owner 2026-08-22 chose 「单元仍可看」):
       a student has to be able to read the words they are climbing towards. They are
       greyed, not disabled — that is a statement about the CLIMB, not about the map. */
    var gate = null, gi;
    for (gi = 0; gi < pins.length; gi++) {
      if (pins[gi].t === "level" && !store.gym[pins[gi].level]) { gate = pins[gi]; break; }
    }
    var gateOn = !!(gate && alt > gate.alt);
    var meFrac = Math.min(1, (gateOn ? gate.alt : alt) / totalAlt);

    /* ⚠️ Pins are pushed SIDEWAYS off the trail, never along it. Two separate
       collisions were hiding units and eating their clicks (owner 2026-08-22):
       (1) a 关卡 flag sits at exactly the SAME altitude as that level's last unit,
           so the 30px flag drew straight on top of the 19px dot — 中一/中二/中三 单元六
           and 中四单元五 were invisible on all four mountains, which is why 中四 read
           as 「单元一 to 单元四」;
       (2) the chain is denser than the pins are wide: 23 unit dots over roughly 330px
           of painted trail is ~12px between centres, under the dot's own diameter.
       The ALONG-path coordinate still encodes altitude exactly — that is what the camp
       is read against, so it must not be nudged. Offsets are perpendicular only, and
       in px so they track the pin sizes rather than the stage. Unit dots alternate
       ±9px; a flag takes 24px on the side its own last unit did NOT take. */
    var LEVEL_OFF = 26, uSide = -1;
    pins.forEach(function (m) {
      if (m.t === "level") { uSide = -uSide; m.off = uSide * LEVEL_OFF; }
      else m.off = 0;
    });
    /* ⚠️ the tent is a 「你在这里」 map pin now (owner 2026-08-22, with a reference
       image): the bubble stands ABOVE the trail and its tail points down at the exact
       altitude point, instead of a disc sitting ON the trail. A 64px disc centred on the
       path swallowed five landmarks whole; a pin standing above it covers nothing at all.
       ⚠️ campOff is 0 and stays 0, and the camp carries no data-nx, so mtnDeconflict
       treats it as an obstacle and never a mover. The whole point of the tail is that it
       marks THE spot — nudge the pin sideways and the tail is pointing at nothing. */
    var campOff = 0;
    /* .mtn2-isle sits INSIDE the stage at 84% of its width, so the island floats
       on open sea instead of running edge to edge (owner 2026-08-15). The margin
       is what lets the summit ring, and any pin label, sit outside the coastline
       without being clipped by the stage. Pins are children of the isle, so every
       fraction in MTN_PATHS / MTN_CROWN still means the same point of the sprite
       and nothing had to be re-traced for this. */
    var html = '<div class="mtn2-wrap"><div class="mtn2-scroll" id="mtScroll">' +
      '<div class="mtn2-stage" id="mtStage" style="--ar:' +
      MTN_SKIN.ar.toFixed(4) + '"><div class="mtn2-isle">' +
      '<img class="mtn2-art" src="' + MTN_SKIN.src + '" alt="">';
    pins.forEach(function (m, i) {
      var p, extra = "", cls, nrm, off, f, ox = 0, oy = 0;
      if (m.t === "summit") {
        p = { x: MTN_TOP.x, y: MTN_TOP.y };
        extra = ";width:" + (MTN_TOP.r * 200).toFixed(2) + "%";
      } else {
        f = m.t === "base" ? meFrac : Math.min(1, m.alt / totalAlt);
        p = mtnPathAt(f);
        off = m.t === "base" ? campOff : m.off;
        if (off) { nrm = mtnNormalAt(f); ox = nrm.x * off; oy = nrm.y * off; }
      }
      extra += ";--ox:" + ox.toFixed(1) + "px;--oy:" + oy.toFixed(1) + "px";
      var nAttr = (nrm && m.t !== "base")
        ? (' data-nx="' + nrm.x.toFixed(4) + '" data-ny="' + nrm.y.toFixed(4) +
           '" data-off="' + m.off + '"') : "";
      var lab = m.t === "base"
        ? (markLabel(m) + (gateOn ? " · 等 " + gate.level + " 年度试炼" : " · 你在这里"))
        : markLabel(m);
      /* the name rides above the pin and appears on hover/keyboard focus, so a
         student can read the map without opening every popover. Pins near the
         top of the frame flip their label underneath instead — .mtn2-stage
         clips its overflow, so a label above them would be cut in half. */
      cls = "mtn2-pin t-" + m.t + (markDone(m) ? " done" : "") +
        (p.y < 0.16 ? " lbl-below" : "") +
        (gateOn && m === gate ? " gate" : "") +
        (gateOn && m.t !== "base" && m.alt > gate.alt ? " beyond" : "");
      /* ⚠️ aria-label, NOT title. A native title tooltip duplicates .mtn2-name — the
         plaque shows at once, the tooltip about a second later and somewhere else, so
         the landmark's name renders twice (owner 2026-08-22). aria-label keeps the
         accessible name without drawing anything. */
      html += '<button class="' + cls + '" data-i="' + i + '"' + nAttr + ' aria-label="' + esc(lab) +
        '" style="left:' + (p.x * 100).toFixed(2) + '%;top:' + (p.y * 100).toFixed(2) + '%' + extra + '">' +
        mtnPinIcon(m, gateOn && m === gate) + '<span class="mtn2-name">' + esc(lab) + '</span></button>';
    });
    html += '</div></div></div>';   // .mtn2-isle / .mtn2-stage / .mtn2-scroll
    html += '<div class="mtn2-hud">' +
      '<span class="m2pill">⛰️ 已掌握 <b>' + alt + '</b> 米</span>' +
      '<span class="m2pill">' + zoneName(alt) + '</span>' +
      '<button class="m2pill" id="mtGoal">🎯 目标</button></div>';
    html += '<div class="mtn2-goalbar" id="mtGoalbar"></div>';
    html += '<div class="mtn2-tip">⛺ 你在这里 · 点 🚩 关卡 看那一年的单元 · 🏯 顶峰' +
      (gateOn ? " · 🔒 先通过年度试炼" : "") + '</div></div>';
    view().innerHTML = html;

    var goal = nextGoal(alt);
    var gb = document.getElementById("mtGoalbar");
    /* ⚠️ a blocked camp OWNS the goal bar. Leaving 「距 X 还差 N 词」 up there while the
       tent refuses to move is the app asking for something that will not move it. */
    if (gb) gb.textContent = gateOn
      ? ("🔒 先通过「" + gate.level + " 年度试炼」，营地才会继续往上")
      : (goal ? ("🎯 距「" + goal.label + "」还差 " + goal.need + " 词") : "🏯 全部目标已完成！");

    /* ⚠️ TWICE, and the second one is the load-bearing one. Called straight after
       innerHTML the stage can still measure 0x0 — the island is sized off vh/vw and an
       aspect-ratio, and the first pass then sees no collisions at all and does nothing
       (that is exactly what happened the first time this was wired). The pass is
       idempotent, so running it again on the next frame costs nothing and is the one
       that has real geometry to work with. */
    mtnDeconflict();
    requestAnimationFrame(mtnDeconflict);
    /* ⚠️ Rotating an iPad relays the stage out and every offset above was measured in
       the OLD geometry. Redraw the whole map rather than just re-running the settle
       pass: re-running it alone left a pin buried in testing, because it has to undo
       offsets that are still mid-transition, and the map holds no state worth
       preserving anyway. Debounced, and guarded on the map still being on screen.
       ⚠️ Hooked once for the page's life — one listener per visit would pile up. */
    if (!_mtnResizeHooked) {
      _mtnResizeHooked = 1;
      window.addEventListener("resize", function () {
        clearTimeout(_mtnResizeT);
        _mtnResizeT = setTimeout(function () {
          if (document.getElementById("mtStage")) startMountain();
        }, 200);
      });
    }
    /* ⚠️ narrow screens pan instead of squeezing — see .mtn2-scroll. Open centred on
       the trail, which runs up the middle third of every island sprite; starting at
       scrollLeft 0 would show a phone student nothing but open sea. */
    var sc = document.getElementById("mtScroll");
    if (sc) sc.scrollLeft = Math.max(0, (sc.scrollWidth - sc.clientWidth) / 2);

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
    /* degrades to no English rather than to a wrong one, same contract as np().
       ⚠️ ADDED 2026-08-31: this file's 找回 error line had no gloss at all, while
       nickname.js's identical screen had one. The two copies of this picker must not
       drift — see the router block below. */
    function codeErrEn(zh) {
      return (window.WSProfile && window.WSProfile.codeErrEn)
        ? window.WSProfile.codeErrEn(zh) : "";
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
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类</button></div>' + closeBtn;
      } else if (st.step === "nounCat") {
        html = '<div class="pop-title">' + esc(st.desc) + '·？</div>' +
          '<div class="pop-body">第二步：选一个名词大类' +
            np("", "", "Step 2: pick a noun group.") + '</div>' +
          chipGrid(Object.keys(NOUN_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 重选描述词</button></div>' + closeBtn;
      } else if (st.step === "nounWord") {
        html = '<div class="pop-title">' + esc(st.nounCat) + '</div>' +
          '<div class="pop-body">选一个具体的名词：' +
            np("", "", "Pick a noun.") + '</div>' +
          chipGrid(NOUN_CATS[st.nounCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类</button></div>' + closeBtn;
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
            /* 机构 (HQ / SCCL) only for the 教师 identity — see SG_SCHOOLS.ORG_LIST.
               A 学生 or 家长 picking 教育部总部 as their school is never right. */
            (window.SG_SCHOOLS ? window.SG_SCHOOLS.optionsHtml(sel, st.schoolQ, { orgs: role === "teacher" })
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
          /* 名单现在是**每所学校自己的**（rosters/{学校}，该校 HOD 在 teacher.html
             维护），不再只有百德一所。有名单 → 两步下拉；没有 → 自由文本框。
             ⚠️ `use()` 要在判断之前调：这个控件是所有学校共用的一份。
             ⚠️ `ensure()` 只在**答案改变了画面**时才回调 renderStep，所以它不会
             把注册页拖进重画循环；受管网络下它 6 秒后回 null，字段停在文本框上。 */
          var rosterPick = !!(window.BV_CLASSES && window.BV_CLASSES.use(sel).has(sel));
          if (window.BV_CLASSES) window.BV_CLASSES.ensure(sel, renderStep);
          detailHtml += '<div class="pop-label" style="margin-top:12px">你的班级' +
            np("你的班级", "nǐ de bān jí", "Your class") + ' · 选填' +
            np("", "", "optional") + '</div>' +
            (rosterPick
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
      card.innerHTML = html;

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
             is broken. `VS` is reserved at mint time in firebase-init.js, so no NEW
             恢复码 can collide with this test.
             ⚠️ THE BOX STAYS OPEN — no reload, no navigation. The teacher sends 学习编号
             and 进度码 together and the student pastes both here in sequence; the 进度码
             paste is the very next action. */
          /* ⚠️ 整个功能关着的时候这一支也要关（owner 2026-09-01「remove the VSID
             feature from the web app entirely」）：留着它，一串合法的编号仍然会
             在学生身上生出一个 vsid，而现在的前提是**在老师发号之前谁都不该有**。
             探名字调用（`WSProfile.vsidOn && ...`）——旧的 profile.js 没有这个函数，
             那时候整套本来就是开的，退化成原行为是对的（§18ay 同一条）。 */
          var vsidOn = !(window.WSProfile && WSProfile.vsidOn) || WSProfile.vsidOn();
          var vsShaped = vsidOn && v.indexOf(".") === -1 && /^VS[0-9A-Z]{8}$/.test(claim);
          if (vsShaped && window.WSProfile && WSProfile.isValidVsid &&
              WSProfile.isValidVsid(claim)) {
            WSProfile.setVsid(claim);
            st.codeVal = "";
            st.codeErr = "";
            st.codeOk = WSProfile.fmtVsid ? WSProfile.fmtVsid(claim) : claim;
            renderStep(); return;
          }
          /* ⚠️ A VS-SHAPED STRING THAT FAILS THE CHECKSUM MUST FALL THROUGH, NOT STOP HERE.
             The 恢复码 rules block went live 2026-08-20 (CLAUDE.md §16), so codes were
             minting for days before `VS` was reserved, and ~0.1% of them start with VS —
             across ~250 students, about a 1-in-4 chance one exists. Returning an error
             here would route that student's real 恢复码 to the wrong branch and leave the
             account unrecoverable, while telling them they mistyped a 学习编号 they have
             never seen. The claim branch below is the only thing that can tell the two
             apart, because only it can ask the network whether the document exists.
             The 学习编号 message is restored on notfound, so a genuine typo still reads
             correctly — see the r.ok handler. */
          if (v.indexOf(".") === -1 && claim.length >= 8 && claim.length <= 24) {
            if (!(window.WSProfile && window.WSProfile.restoreFromClaim)) {
              st.codeErr = "暂时无法恢复，请稍后再试。"; renderStep(); return;
            }
            st.codeErr = "正在找回…"; renderStep();
            window.WSProfile.restoreFromClaim(claim, function (r) {
              if (!r.ok) {
                /* notfound on a VS-shaped string means it was a mistyped 学习编号 after
                   all — no such claim document exists. Every other failure (offline,
                   rules denied, read error) is about the network, not the string, and
                   must keep its own wording. */
                st.codeErr = (vsShaped && r.err === "找不到这个恢复码，请检查有没有打错。")
                  ? "学习编号打错了，请再核对一次。"
                  : (r.err || "恢复失败，请稍后再试。");
                renderStep(); return;
              }
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
            var hadRoster = !!(window.BV_CLASSES && window.BV_CLASSES.has(st.schoolSel));
            st.schoolSel = v;
            /* Redraw on a roster flip as well as on 「离开其他」: 班级 is a different
               control on either side of 百德, and leaving the old one on screen means
               the student edits a box that is about to be replaced. Both cost the
               search box its focus — a price already paid for wasOther, and a flip
               only happens once the search has narrowed to a single school. */
            if (wasOther || !!(window.BV_CLASSES && window.BV_CLASSES.has(st.schoolSel)) !== hadRoster) renderStep();
          }, { orgs: st.role === "teacher" });
        }
        if (selEl) selEl.onchange = function () { st.schoolSel = selEl.value; renderStep(); };
        var otherEl = document.getElementById("npSchoolOther");
        if (otherEl) otherEl.oninput = function () { st.schoolOther = otherEl.value; };
        var heardEl = document.getElementById("npHeard");
        if (heardEl) heardEl.oninput = function () { st.heardFrom = heardEl.value; };
        if (window.BV_CLASSES && window.BV_CLASSES.use(st.schoolSel).has(st.schoolSel)) {
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

  function showMasteryInfo() {
    var ov = popOverlay(
      '<div class="pop-title">什么算「已掌握」？</div>' +
      '<div class="pop-body">在 <b>填空挑战、华文解释、英文翻译、攀山快答</b> 中第一次答对某个词语，' +
      '它就记为已掌握。<br><br>词语闪卡与游乐场游戏（词雨、组字成词、词语汉兜）帮助你练习，但不计入掌握。<br><br>' +
      '掌握数只增不减，它也是你的登山海拔：<b>1 词 = 1 米</b>。</div>' +
      '<div class="nav-row"><button class="nav-btn primary" id="popOk">知道了</button></div>');
    ov.querySelector("#popOk").onclick = function () { ov.remove(); };
  }

  /* ==================================================================
     进度码 · offline backup/restore. VS2 format (nickname-bound + checksum):
       VS2.{stream}.{n}.{b64bitmask}.{meta}.{nickB64}.{ck}
     Bitmask is over WORDS order, which is append-only by project rule, so
     codes survive vocab additions. Binding is friction + attribution, not
     security (see HANDOFF_dashboard_and_bound_codes.md §1). VS1 still decodes.
     decode() is PURE (validates, returns a plan, never touches store);
     commitProgress() is the only thing that writes. The 我的档案 panel
     (profile.js) snapshots before it calls commit, so undo works.
     ================================================================== */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36);
  }
  function utf8ToB64url(str) {
    try { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
    catch (e) { return ""; }
  }
  function b64urlToUtf8(b) {
    try { var s = String(b).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); }
    catch (e) { return ""; }
  }
  function encodeProgress() {
    var bytes = [];
    for (var i = 0; i < Math.ceil(WORDS.length / 8); i++) bytes.push(0);
    WORDS.forEach(function (w, wi) { if (store.mastered[w.id]) bytes[wi >> 3] |= (1 << (wi & 7)); });
    var bin = "";
    for (var b = 0; b < bytes.length; b++) bin += String.fromCharCode(bytes[b]);
    var b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    var meta = [store.bestStreak || 0, store.best.rain || 0, store.best.handle || 0,
      store.best.assemble || 0, store.best.sprint || 0].join("-");
    var nickB64 = utf8ToB64url((loadProfile() || {}).nickname || "");
    var head = "VS2." + STREAM + "." + WORDS.length + "." + b64 + "." + meta + "." + nickB64;
    return head + "." + fnv1a(head);
  }
  /* build the list of word ids + meta to apply, running every check, WITHOUT
     touching store. Returns { err } | { ok:true, addIds, meta } */
  function planFromFields(nStr, b64field, metaField) {
    var n = parseInt(nStr, 10);
    if (!(n > 0) || n > WORDS.length) return { err: "进度码与当前词库不匹配。" };
    var b64 = String(b64field).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin;
    try { bin = atob(b64); } catch (e) { return { err: "进度码无法解析，请检查是否完整复制。" }; }
    var addIds = [];
    for (var i = 0; i < n; i++) {
      if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) { var w = WORDS[i]; if (w) addIds.push(w.id); }
    }
    var meta = String(metaField).split("-").map(function (x) { return parseInt(x, 10) || 0; });
    return { ok: true, addIds: addIds, meta: meta };
  }
  function wrongStreamErr(s) {
    return { err: "这个进度码属于其他 subject level（" + esc(String(s)).toUpperCase() + "），请到对应的 app 恢复。" };
  }
  function decodeProgress(code) {
    var p = String(code).trim().split(".");
    if (p[0] === "VS2") {
      if (p.length !== 7) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (fnv1a(p.slice(0, 6).join(".")) !== p[6]) return { err: "进度码不完整或已损坏，请重新复制一次。" };
      if (p[1] !== STREAM) return wrongStreamErr(p[1]);
      var plan = planFromFields(p[2], p[3], p[4]);
      if (plan.err) return plan;
      var codeNick = b64urlToUtf8(p[5]);
      var myNick = (loadProfile() || {}).nickname || "";
      if (codeNick && codeNick !== myNick) {
        return { mismatch: true, codeNick: codeNick, addIds: plan.addIds, meta: plan.meta };
      }
      plan.codeNick = codeNick;
      return plan;
    }
    if (p[0] === "VS1") {
      if (p.length !== 5) return { err: "进度码格式不正确，请检查是否完整复制。" };
      if (p[1] !== STREAM) return wrongStreamErr(p[1]);
      var plan2 = planFromFields(p[2], p[3], p[4]);
      if (plan2.err) return plan2;
      plan2.legacy = true;   // no nickname to compare against
      return plan2;
    }
    return { err: "进度码格式不正确，请检查是否完整复制。" };
  }
  /* the ONLY writer: apply a validated plan to store */
  function commitProgress(plan) {
    var added = 0;
    (plan.addIds || []).forEach(function (id) { if (!store.mastered[id]) { store.mastered[id] = 1; added++; } });
    var m = plan.meta || [];
    store.bestStreak = Math.max(store.bestStreak || 0, m[0] || 0);
    store.best.rain = Math.max(store.best.rain || 0, m[1] || 0);
    store.best.handle = Math.max(store.best.handle || 0, m[2] || 0);
    store.best.assemble = Math.max(store.best.assemble || 0, m[3] || 0);
    store.best.sprint = Math.max(store.best.sprint || 0, m[4] || 0);
    saveStore();
    checkBadges(true);   // restore badges silently, no celebration replay
    return { added: added };
  }

  /* open the 我的档案 overlay (profile.js) wired to this stream page */
  function openProfilePanel() {
    if (!window.WSProfile) return;
    WSProfile.open({
      onChangeNickname: function (done) {
        var cur = loadProfile() || {};
        renderNicknamePicker(function () { if (done) done(); },
          { dismissible: true, currentSchool: cur.school, currentRole: cur.category || "student",
            currentClass: cur.mtlClass || "", currentHeard: cur.heardFrom || "" });
      },
      onChanged: renderHome
    });
  }

  /* ---------- boot ---------- */
  /* ⚠️ 词库只取一次是不够的（owner 2026-08-23 在 HCL 上报到 **HTTP 503**）。
     GitHub Pages 的边缘节点偶尔吐一个 5xx，而那一下**永久地**毁掉这一屏：
     没有重试、没有重试按钮，学生只能自己想到刷新——绝大多数学生不会，
     他只会得出「高级华文今天打不开」。
     ⚠️ 当时实测：同一分钟从**同一个新加坡边缘节点**连取五次全是 200，
     Pages 的构建也全部成功。**那是一次抖动**，但抖动的代价不该是一整科打不开。
     三次尝试，间隔 400ms / 1200ms。只对**网络错误与 5xx** 重试——
     4xx 是我们自己的问题，重试一百次也一样。
     ⚠️ 每次重试都换一个 cache-bust 参数：失败的响应有可能被中间层缓存住，
     原样再问一次很可能拿回同一个 503。 */
  function fetchVocab(tries) {
    var bust = tries ? (ASSET_V ? "&r=" : "?r=") + (+new Date()) + "." + tries : "";
    function again(n) {
      return new Promise(function (res) { setTimeout(res, n ? 1200 : 400); })
        .then(function () { return fetchVocab(n + 1); });
    }
    return fetch("data/" + STREAM + ".json" + ASSET_V + bust).then(function (r) {
      if (r.ok) return r.json();
      if (r.status >= 500 && tries < 2) return again(tries);
      throw new Error("HTTP " + r.status);
    }, function (e) {
      if (tries < 2) return again(tries);
      throw e;
    });
  }

  function boot() {
    app.innerHTML = '<div class="topbar"></div><div class="wrapper" id="view">' +
      '<div class="loading">正在装载词库…</div></div>';
    setTopbar("landing", "");

    fetchVocab(0)
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
                  /* schemaVersion 2 (拼音辅助): absent in HCL and in any older
                     cached JSON — qHtml falls back to plain text when missing */
                  zhPy: w.zhPy, clozePy: w.clozePy,
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
        repairComps();
        applyAmbience();
        applyEnAid();      // 英文提示: CSS-gated on body.en-aid, so this is the only switch
    applyPyAid();      // 拼音提示: same mechanism, body.py-aid
        updateStreak();

        /* hand the 我的档案 panel (profile.js) this stream's 进度码 hooks */
        if (window.WSProfile && window.WSProfile.registerCodeProvider) {
          window.WSProfile.registerCodeProvider({
            stream: STREAM,
            /* ⚠️ STILL PASSED, and no longer called by the panel. profile.js owns the
               VS3 format now and does its own encode/decode for all five lands; these two
               remain because encodeProgress is the ONLY place that can emit a legacy VS2
               code for this stream, which teacher-side tooling and any code a student
               already has in an email still speak. Do not delete them to「clean up」:
               decodeProgress is also what proves a VS2 code's checksum and stream.
               ⚠️ `commit` below IS still the live path — see profile.js's commitAll. */
            encode: encodeProgress,
            decode: decodeProgress,          // pure planner (no writes)
            commit: commitProgress,          // the only writer
            snapshot: function () { return JSON.parse(JSON.stringify(store)); },
            /* 灵露 wallet for 头像兑换 (HANDOFF v2 §3.2). cs.js stays the ONLY writer of
               the store: profile.js must never touch ws2_{stream} itself, or the next
               saveStore() from this page would write the pre-purchase wallet back over
               it. Deducted from the CURRENT stream's wallet, exactly like the camp shop;
               what the purchase BUYS is saved in the global profile by profile.js. */
            wallet: function () { return store.lingLu || 0; },
            spend: function (n) {
              n = Math.max(0, Math.round(n || 0));
              if ((store.lingLu || 0) < n) return false;
              store.lingLu -= n; saveStore();
              return true;
            },
            restoreSnapshot: function (snap) { store = snap; saveStore(); renderHome(); },
            onChanged: renderHome
          });
        }

        /* ⚠️ The home screen must NEVER wait on the network without a deadline.
           This used to call renderHome() only from inside getProgress's callback,
           so if anonymous auth or the Firestore read never SETTLED — which is what
           a blocked or greylisted managed-school network does, no error, just
           silence — the callback never fired, the fetch .catch never fired either
           (the vocab had already loaded fine), and every stream sat on
           「正在装载词库…」 forever. Reported live 2026-08-15 on all four streams.
           Now: the cloud gets CLOUD_WAIT_MS to answer, and after that the app
           opens offline. A late answer is still merged — but it only re-renders
           if the student is still on the home screen, so an answer arriving
           mid-question can never yank them out of a round. */
        var CLOUD_WAIT_MS = 6000;
        function afterProfile() {
          var opened = false;
          function open(cloud) {
            opened = true;
            if (cloud) { mergeCloudProgress(cloud); applyAmbience(); }
            renderHome();
            applyPendingCode();   // before the class nudge: restoring is the reason they are here
            promptClassIfDue();
          }
          if (!(window.WSCloud && window.WSCloud.isAvailable())) { open(null); return; }
          var timer = setTimeout(function () { if (!opened) open(null); }, CLOUD_WAIT_MS);
          window.WSCloud.getProgress(STREAM, function (cloud) {
            clearTimeout(timer);
            if (!opened) { open(cloud); return; }
            if (!cloud) return;
            mergeCloudProgress(cloud);   // late answer: the store is correct either
            applyAmbience();             // way; only repaint if home is still up
            if (document.querySelector(".home-grid")) renderHome();
          });
        }
        function promptClassIfDue() {
          // new-school-year nudge (from Jan 2): manual class update, never auto
          if (window.WSProfile && window.WSProfile.maybePromptClassUpdate) {
            window.WSProfile.maybePromptClassUpdate(openProfilePanel);
          }
          /* 学习编号 提示 (owner 2026-09-01)。⚠️ 今天它什么都不做：`VSID_ON` 关着，
             `needsVsidAsk()` 第一行就 return false。接线是为了**开关翻开那天真的会有
             反应**——一个翻了却没有任何调用点的开关，正是这份代码库反复中招的那一族
             （§18an 的 `.py-ans`、§18ba 那条 −100、§18aw 只搬了一半）。
             ⚠️ 探名字调用：页面可能拿新的 cs.js 配十分钟前的 profile.js（§18ay）。
             ⚠️ 排在 班级 提示**之后**，而 maybePromptVsid 自己会让开已经开着的弹窗，
             所以两者不会叠在一起——那一天它就明天再问。 */
          if (window.WSProfile && window.WSProfile.maybePromptVsid) {
            window.WSProfile.maybePromptVsid();
          }
        }
        /* ---------- 换设备：认领过的进度码在这里落地 (owner 2026-08-16) ----------
           The nickname picker can only PEEK at a code (the landing page has no word
           order, so it cannot turn the bitmask into ids). It parks the code and the
           stream page finishes the job here — through decodeProgress + the same
           confirm/snapshot/undo path 我的档案 uses, because commitProgress must stay
           the only writer.
           ⚠️ Runs AFTER the cloud merge, so the union is code ∪ cloud ∪ local, and
           it is only ever offered ONCE: takePendingCode reads-and-clears, so a
           dismissed dialog does not nag on the next open. */
        function applyPendingCode() {
          if (!(window.WSProfile && window.WSProfile.takePendingCode)) return;
          var pend = window.WSProfile.takePendingCode(STREAM);
          if (!pend || !pend.code) return;
          /* ⚠️ THE DECODE IS profile.js's NOW, not decodeProgress(). A VS3 code covers all
             five lands and is positional over five published files; cs.js has one word
             list in memory and could only ever read its own section — a five-land code
             pasted into the picker would have been rejected here as a format error.
             ⚠️ decodeCode is ASYNC (it fetches the word orders). Nothing below may assume
             the dialog appears in the same tick. */
          if (!window.WSProfile.decodeCode) return;
          window.WSProfile.decodeCode(pend.code, function (plan) {
            if (plan.err) { toast("进度码无法使用：" + plan.err); return; }
            var d = window.WSProfile.planDelta(plan);
            // the picker adopted the code's nickname, so a mismatch here means the
            // student changed it afterwards — their call, so just proceed
            /* ⚠️ ONE ROW PER LAND, never a combined total (§4.1). The五 numbers never add. */
            var rows = d.rows.map(function (r) {
              return '<div style="margin-top:3px">' + esc(r.label.split(" \u00b7 ")[0]) +
                '\uff1a<b>' + r.have + '</b> \u2192 <b>' + (r.have + r.newly) + '</b></div>';
            }).join("");
            /* popOverlay + two nav buttons — cs.js's own confirm pattern.
               profile.js has confirmDialog() but it is NOT exported here (see 营地). */
            var ov = popOverlay(
              '<div class="pop-title">\ud83d\udd04 \u6062\u590d\u4f60\u7684\u8fdb\u5ea6\uff1f</div>' +
              '<div class="pop-body">\u8fd9\u6bb5\u8fdb\u5ea6\u7801\u6db5\u76d6\u4f60\u7684\u6240\u6709\u9646\u5730\u3002' +
              '<b>\u53ea\u589e\u4e0d\u51cf</b>\u3002</div>' +
              '<div class="pop-body" style="background:#F1F6FB;border:1px solid #DBE7F1;border-radius:10px;padding:10px 12px;margin-top:8px">' +
              rows + '</div>' +
              '<div class="nav-row"><button class="nav-btn" id="pcNo">\u4ee5\u540e\u518d\u8bf4</button>' +
              '<button class="nav-btn primary" id="pcYes">\u6062\u590d</button></div>');
            document.getElementById("pcNo").onclick = function () { ov.remove(); };
            document.getElementById("pcYes").onclick = function () {
              ov.remove();
              /* snapshot -> log -> commit, the same order 我的档案 uses so 撤销恢复 works.
                 ⚠️ snapshotAll, not a hand-rolled per-stream key: the undo has to be able
                 to put back every land this touched, and profile.js owns that key now. */
              window.WSProfile.snapshotAll(plan);
              if (window.WSCloud && window.WSCloud.logRestore) {
                window.WSCloud.logRestore({
                  stream: (plan.sections || []).map(function (x) { return x.sec; }).join("+"),
                  added: d.addTotal, codeNick: plan.codeNick || "", matched: true, via: "newDevice" });
              }
              /* ⚠️ commitAll routes THIS stream through commitProgress (the registered
                 provider) and writes the other lands straight to localStorage. That split
                 is the whole reason it lives in profile.js — a direct write to
                 ws2_{STREAM} here would be erased by the next saveStore(). */
              var res = window.WSProfile.commitAll(plan);
              applyAmbience();
              renderHome();
              toast("\u5df2\u6062\u590d " + (res.perSec[STREAM] || 0) + " \u4e2a\u8bcd\u8bed");
            };
          });
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
        /* ⚠️ 两种失败**说两句不同的话**。原来只有一句「请通过网页服务器访问…
           直接双击打开 HTML 文件无法读取词库」——那是 file:// 的情况，
           而 owner 遇到的是 503：消息把学生指向一个根本不存在的原因，
           比不解释更糟。 */
        var m = String((err && err.message) || err);
        var transient = /HTTP 5\d\d/.test(m) || /fetch|network|load failed/i.test(m);
        view().innerHTML = '<div class="error-box"><b>词库装载失败</b><br>' +
          '<span style="font-size:12.5px;color:#5A7080">' +
          (transient
            ? '服务器刚才没有回应，或者网络断了一下。已经自动重试过，还是没成功——请点下面的按钮再试。'
            : '请通过网页服务器访问（GitHub Pages 或本地 server），直接双击打开 HTML 文件无法读取词库。') +
          '<br>技术信息：' + esc(m) + '</span>' +
          '<div class="nav-row" style="margin-top:12px">' +
          '<button class="nav-btn primary" id="bootRetry">重试' + pyl("重试") + enli("重试") + '</button></div></div>';
        var rb = document.getElementById("bootRetry");
        if (rb) rb.onclick = function () { location.reload(); };
      });
  }

  boot();
})();
