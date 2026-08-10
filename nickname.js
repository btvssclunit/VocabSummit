/* 词山学海 · Vocab Summit — standalone nickname picker for the landing page
   (index.html). This intentionally duplicates the DESC_CATS/NOUN_CATS word
   pools + picker UI from app.js rather than loading app.js itself, because
   app.js boots straight into fetching a level's word JSON (g1/g2/g3/hcl)
   and expects level-specific DOM that doesn't exist on the landing page.
   PROFILE_KEY / profile shape must stay in sync with app.js. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

/* ---------- 昵称词库 (nickname pools) ---------- */
  var DESC_CATS = {
    "坚毅拼搏": [{w:"百折不挠",zh:"无论遭受多少挫折都不屈服"},{w:"持之以恒",zh:"坚持做下去"},{w:"滴水穿石",zh:"水滴不断落下能穿透石头，比喻坚持不懈，终能成功。"},{w:"发扬光大",zh:"使美好的事物在原来基础上不断发展、提高"},{w:"坚持不懈",zh:"坚定不移地做下去"},{w:"坚持到底",zh:"一直坚持到最后，不在中途放弃。"},{w:"落地生根",zh:"比喻在一个地方长期安定下来，并逐渐融入当地。"},{w:"逆水行舟",zh:"比喻不进则退"},{w:"全力以赴",zh:"拿出全部力量去做"},{w:"绳锯木断",zh:"绳子也能把木头锯断，比喻力量虽小，坚持下去就能成功"},{w:"卧薪尝胆",zh:"形容刻苦自励，发愤图强"},{w:"孜孜不倦",zh:"勤奋不懈怠"}],
    "智慧机敏": [{w:"不二法门",zh:"唯一的方法或途径"},{w:"百家争鸣",zh:"原指春秋战国时期各学派自由论辩；也比喻各种观点充分发表和讨论。"},{w:"高瞻远瞩",zh:"目光远大，考虑深远"},{w:"画龙点睛",zh:"比喻在关键之处加上最重要的一笔，使整体更加出色"},{w:"恍然大悟",zh:"一下子明白过来"},{w:"就地取材",zh:"在当地直接取得所需要的材料。"},{w:"绞尽脑汁",zh:"竭尽全力地思考"},{w:"开卷有益",zh:"读书总有好处"},{w:"潜移默化",zh:"人的思想、性格在不知不觉中受到影响而发生变化"},{w:"融会贯通",zh:"把知识综合理解"},{w:"入木三分",zh:"形容见解、议论深刻"},{w:"望闻问切",zh:"中医诊断疾病的四种方法：望（观察）、闻（听嗅）、问（询问）、切（诊脉）"},{w:"言简意赅",zh:"话语简短，内容完整"},{w:"迎刃而解",zh:"比喻问题很容易解决，顺利解决"},{w:"用兵如神",zh:"指挥作战如同神明一般，形容极为高明的军事才能"},{w:"著书立说",zh:"写书或著作来表达和传播自己的思想"},{w:"自知之明",zh:"了解自己的能力和不足"},{w:"足智多谋",zh:"智慧多，谋略广"}],
    "仁爱慷慨": [{w:"恻隐之心",zh:"看到他人遭受痛苦时自然产生的同情心"},{w:"海纳百川",zh:"形容气度宽广，能容纳各方"},{w:"慷慨解囊",zh:"毫不吝啬地拿出钱来帮助"},{w:"来者不拒",zh:"凡是来的都不拒绝"},{w:"添砖加瓦",zh:"比喻为某事业出一份力"},{w:"推己及人",zh:"从自己的处境推想到别人的处境，关心体谅他人"},{w:"雪中送炭",zh:"在别人困难时给予帮助"}],
    "专注严谨": [{w:"敬业乐业",zh:"对工作认真负责并乐于其中"},{w:"聚精会神",zh:"集中精神"},{w:"开源节流",zh:"增加收入，减少支出"},{w:"强身健体",zh:"使身体强壮、健康。"},{w:"煞费苦心",zh:"费尽心思"},{w:"修身养性",zh:"修炼自身，陶冶性情，使品德和情操得到提升"},{w:"小心翼翼",zh:"形容举动谨慎，丝毫不敢疏忽"},{w:"循规蹈矩",zh:"遵守规矩"},{w:"心无旁骛",zh:"专心一意，不受其他事情干扰"},{w:"一丝不苟",zh:"形容办事认真，一点儿不马虎"},{w:"有条不紊",zh:"有条理，有次序，一点儿不乱"}],
    "活力热忱": [{w:"翻天覆地",zh:"形容变化巨大而彻底"},{w:"哄堂大笑",zh:"形容满屋子的人同时大笑"},{w:"扣人心弦",zh:"形容非常感人"},{w:"慷慨激昂",zh:"情绪激动高昂"},{w:"流连忘返",zh:"舍不得离开"},{w:"龙飞凤舞",zh:"形容气势生动奔放；也常形容书法笔势活泼有力。"},{w:"翩翩起舞",zh:"轻快地跳起舞来"},{w:"千变万化",zh:"形容变化极多，无穷无尽"},{w:"日新月异",zh:"发展变化快，不断出现新事物"},{w:"生龙活虎",zh:"形容精力充沛，充满活力"},{w:"腾空而起",zh:"向上飞起"},{w:"兴致勃勃",zh:"形容兴趣很高，精神饱满"},{w:"喜极而泣",zh:"高兴到极点而流泪"},{w:"雨后春笋",zh:"比喻新事物大量涌现"},{w:"抑扬顿挫",zh:"声音高低起伏有节奏"}],
    "正义侠肝": [{w:"拔刀相助",zh:"遇见不平的事，挺身出来帮助受欺负的一方"},{w:"降妖除魔",zh:"消灭妖魔鬼怪，比喻铲除邪恶势力"},{w:"揭竿而起",zh:"指发动起义"},{w:"两肋插刀",zh:"比喻讲义气，为朋友不惜冒险"},{w:"替天行道",zh:"代替上天惩恶扬善，主持正义"}],
    "诚信真挚": [{w:"不偏不倚",zh:"正中目标；不偏向任何一方"},{w:"畅所欲言",zh:"毫无顾忌地表达自己的意见"},{w:"三顾茅庐",zh:"比喻真诚地再三邀请或拜访"},{w:"推心置腹",zh:"真诚地倾心相待，毫无保留地交谈"},{w:"无怨无悔",zh:"没有怨言，没有后悔"},{w:"心直口快",zh:"性格直率，想到什么就说什么"},{w:"言出必行",zh:"说了就一定做到"},{w:"一诺千金",zh:"说话算数，守信用"},{w:"以礼待人",zh:"用礼貌的态度对待别人"},{w:"饮水思源",zh:"比喻不忘本，要有感恩之心"},{w:"责无旁贷",zh:"责任不可推卸"}],
    "团结情谊": [{w:"唇齿相依",zh:"形容关系非常密切"},{w:"合家团圆",zh:"全家人团聚在一起。"},{w:"兼容并蓄",zh:"同时容纳不同的事物"},{w:"难舍难分",zh:"形容感情很好，不忍分离"},{w:"求同存异",zh:"保留共同点，保留不同意见"},{w:"群策群力",zh:"大家一起想办法、出力"},{w:"同甘共苦",zh:"一起享受快乐，共同面对困难"}],
    "吉祥美好": [{w:"姹紫嫣红",zh:"形容各种颜色的花朵娇艳美丽"},{w:"辞旧迎新",zh:"告别旧年，迎接新年"},{w:"大吉大利",zh:"非常吉祥如意"},{w:"万事大吉",zh:"一切事情都很顺利"},{w:"繁荣昌盛",zh:"兴旺发达"},{w:"光彩夺目",zh:"形容光泽色彩鲜艳耀眼"},{w:"花好月圆",zh:"比喻美好幸福，多用于祝福婚姻或节日"},{w:"含苞待放",zh:"形容花朵将开而未开"},{w:"金碧辉煌",zh:"形容建筑物富丽堂皇"},{w:"龙凤呈祥",zh:"比喻吉祥如意，常用于婚礼或喜庆场合"},{w:"年年有余",zh:"每年都有富余，形容生活富足"},{w:"千姿百态",zh:"形态各种各样"},{w:"惟妙惟肖",zh:"形容描写或模仿得非常逼真"},{w:"栩栩如生",zh:"形容形象逼真，像活的一样"},{w:"一帆风顺",zh:"比喻非常顺利"},{w:"诸事大吉",zh:"所有的事情都吉祥顺利"},{w:"安然无恙",zh:"平安无事，没有受到损害"}],
    "卓越非凡": [{w:"别具一格",zh:"具有独特的风格"},{w:"出类拔萃",zh:"才能超过一般人"},{w:"大名鼎鼎",zh:"名气很大"},{w:"大显身手",zh:"充分显示自己的本领"},{w:"得天独厚",zh:"具有特别优越的天然条件，享有独特的优势"},{w:"独树一帜",zh:"独特地树立自己的旗帜，形容有独特的风格或成就"},{w:"独一无二",zh:"没有相同的，唯一的"},{w:"凤毛麟角",zh:"比喻极为稀少珍贵的人才或事物"},{w:"家喻户晓",zh:"家家户户都知道"},{w:"举世无双",zh:"全世界找不到第二个"},{w:"举足轻重",zh:"地位重要，一举一动都会影响全局"},{w:"脍炙人口",zh:"好的作品受到人们广泛赞美和传诵"},{w:"前所未有",zh:"从来没有过，历史上第一次"},{w:"胜券在握",zh:"有把握取得胜利"},{w:"脱颖而出",zh:"才能全部显露出来"},{w:"完美无缺",zh:"完美，没有任何缺点"},{w:"源远流长",zh:"历史悠久，传统延续时间很长"},{w:"异军突起",zh:"比喻一支新的力量突然兴起，出人意料"}],
    "从容自在": [{w:"初来乍到",zh:"刚刚来到"},{w:"梦寐以求",zh:"睡梦中都在追求"},{w:"扪心自问",zh:"摸着胸口问自己，指自我反省"},{w:"念念不忘",zh:"牢记在心，时刻不忘"},{w:"慢条斯理",zh:"形容说话做事不慌不忙"},{w:"情有独钟",zh:"对某种事物特别喜爱"},{w:"若有所思",zh:"好像在想什么，陷入沉思"},{w:"心旷神怡",zh:"心情开朗，精神愉快"},{w:"心满意足",zh:"感到非常满意，没有遗憾"},{w:"赞不绝口",zh:"不停地称赞"},{w:"啧啧称奇",zh:"不停称赞，表示惊奇"},{w:"爱不释手",zh:"喜爱得不肯放手"}],
    "独特多元": [{w:"天涯海角",zh:"形容极远的地方"},{w:"无处不在",zh:"到处都是，任何地方都有"},{w:"无远弗届",zh:"不管多远都能到达"},{w:"五花八门",zh:"形容种类繁多，各式各样"}]
  };  var NOUN_CATS = {
    "神话异兽": ["麒麟","饕餮","朱雀","玄武","青龙","白虎","九尾狐","犼","貔貅","鲲"],
    "星宿天象": ["北斗","启明","织女","牵牛","荧惑","太白","辰星","紫微"],
    "西游记人物": ["悟空","八戒","沙僧"],
    "三国人物": ["孔明","关羽","赵云","张飞","周瑜","子龙"],
    "水浒人物": ["武松","鲁智深","林冲","李逵"],
    "红楼人物": ["宝玉","黛玉","宝钗","探春","湘云","刘姥姥"],
    "经典故事人物": ["花木兰","愚公","精卫","夸父"],
    "身份泛称": ["状元","书生","侠客","樵夫","渔夫","匠人","商贾","农夫"],
    "可爱动物": ["熊猫","狐狸","猫头鹰","水獭","松鼠","企鹅","考拉","刺猬","仓鼠","柴犬","兔子","锦鲤"],
    "花草植物": ["梅","兰","竹","菊","松","荷","柳","榕","枫","桂"],
    "自然元素": ["星","日","月","云","风","雷","霞","雾","虹","露"],
    "文化器物": ["玉盘","算盘","香囊","罗盘","折扇","灯笼","竹简","印玺","锦囊","铜镜"]
  };

  /* ---------- profile (nickname + school, shared with app.js) ---------- */
  var PROFILE_KEY = "ws2_profile";
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch (e) { return null; }
  }
  function saveProfileLocal(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {}
    if (window.WSCloud && window.WSCloud.isAvailable()) window.WSCloud.saveProfile(p);
  }

  function renderNicknamePicker(onDone, opts) {
    opts = opts || {};
    var dismissible = !!opts.dismissible;
    var st = { step: "descCat", descCat: null, desc: null, nounCat: null, noun: null };

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
        html += '<span class="wchip not" data-v="' + esc(label) + '"' + title + '>' + esc(label) + '</span>';
      });
      html += '</div>';
      return html;
    }
    function wireChips(root, onClick) {
      Array.prototype.forEach.call(root.querySelectorAll(".wchip"), function (el) {
        el.onclick = function () { onClick(el.getAttribute("data-v")); };
      });
    }

    function renderStep() {
      var html = "";
      var closeBtn = dismissible ? '<div class="nav-row"><button class="nav-btn" id="npCancel">取消</button></div>' : "";

      if (st.step === "descCat") {
        html = '<div class="pop-title">✨ 选一个昵称</div>' +
          '<div class="pop-body">昵称随时可在设置中更改，先选一个开始学习吧！<br>第一步：选一个大类（这是你的"性格气质"）</div>' +
          chipGrid(Object.keys(DESC_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npRandom">🎲 帮我随机抽一个</button></div>' + closeBtn;
      } else if (st.step === "descWord") {
        html = '<div class="pop-title">' + esc(st.descCat) + '</div>' +
          '<div class="pop-body">选一个具体的词语（点击可看意思）：</div>' +
          chipGrid(DESC_CATS[st.descCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类</button></div>' + closeBtn;
      } else if (st.step === "nounCat") {
        html = '<div class="pop-title">' + esc(st.desc) + '·？</div>' +
          '<div class="pop-body">第二步：选一个名词大类</div>' +
          chipGrid(Object.keys(NOUN_CATS)) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 重选描述词</button></div>' + closeBtn;
      } else if (st.step === "nounWord") {
        html = '<div class="pop-title">' + esc(st.nounCat) + '</div>' +
          '<div class="pop-body">选一个具体的名词：</div>' +
          chipGrid(NOUN_CATS[st.nounCat]) +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 返回大类</button></div>' + closeBtn;
      } else if (st.step === "confirm") {
        var nickname = st.desc + "·" + st.noun;
        html = '<div class="pop-title">🎉 你的昵称</div>' +
          '<div class="pop-body" style="font-size:19px;font-weight:700;color:var(--ink);text-align:center;margin:6px 0 14px">' +
          esc(nickname) + '</div>' +
          '<div class="pop-label">学校</div>' +
          '<input type="text" id="npSchool" class="code-ta" style="height:44px" placeholder="例如：百德中学" value="' +
          esc((opts.currentSchool || "")) + '">' +
          '<div class="nav-row"><button class="nav-btn" id="npBack">‹ 重新选择</button>' +
          '<button class="nav-btn primary" id="npConfirm">确认</button></div>' + closeBtn;
      }
      card.innerHTML = html;

      if (st.step === "descCat") {
        wireChips(card);
        document.getElementById("npRandom").onclick = function () {
          var dCats = Object.keys(DESC_CATS), nCats = Object.keys(NOUN_CATS);
          var dCat = dCats[Math.floor(Math.random() * dCats.length)];
          var nCat = nCats[Math.floor(Math.random() * nCats.length)];
          var dList = DESC_CATS[dCat], nList = NOUN_CATS[nCat];
          st.descCat = dCat; st.desc = dList[Math.floor(Math.random() * dList.length)].w;
          st.nounCat = nCat; st.noun = nList[Math.floor(Math.random() * nList.length)];
          st.step = "confirm"; renderStep();
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
      } else if (st.step === "confirm") {
        document.getElementById("npBack").onclick = function () { st.step = "nounCat"; renderStep(); };
        document.getElementById("npConfirm").onclick = function () {
          var school = document.getElementById("npSchool").value.trim();
          var profile = { nickname: st.desc + "·" + st.noun, school: school };
          saveProfileLocal(profile);
          ov.remove();
          onDone(profile);
        };
      }
      if (dismissible && document.getElementById("npCancel")) {
        document.getElementById("npCancel").onclick = function () { ov.remove(); };
      }
    }
    renderStep();
  }


  /* ---------- landing page gate: Enter -> (nickname if new) -> paths ---------- */
  function initLandingGate() {
    var enterBtn = document.getElementById("lpEnterBtn");
    var gate = document.getElementById("lpGate");
    var cards = document.getElementById("lpCards");
    var greet = document.getElementById("lpGreeting");
    if (!enterBtn || !gate || !cards) return; // not on the landing page

    function reveal(profile) {
      gate.style.display = "none";
      if (greet && profile && profile.nickname) {
        greet.style.display = "";
        greet.innerHTML = '<span class="lp-nick">👤 ' + esc(profile.nickname) + '</span>' +
          '<button class="code-link" id="lpChangeNick">换昵称</button>';
        var changeBtn = document.getElementById("lpChangeNick");
        if (changeBtn) {
          changeBtn.onclick = function () {
            renderNicknamePicker(function (p) { reveal(p); }, { dismissible: true, currentSchool: (profile || {}).school || "" });
          };
        }
      }
      cards.style.display = "flex";
      cards.style.animation = "none";
    }

    enterBtn.onclick = function () {
      var existing = loadProfile();
      if (existing && existing.nickname) {
        reveal(existing);
      } else {
        renderNicknamePicker(function (p) { reveal(p); }, { dismissible: false });
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLandingGate);
  } else {
    initLandingGate();
  }

})();
