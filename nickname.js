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
     so the shape never drifts between this file and app.js. */
  function loadProfile() { return window.WSProfile ? window.WSProfile.load() : null; }
  function saveProfileLocal(p) { if (window.WSProfile) window.WSProfile.save(p); }

  function renderNicknamePicker(onDone, opts) {
    opts = opts || {};
    var dismissible = !!opts.dismissible;
    var _bvss = "百德中学 Bukit View Secondary School";
    var _cs = opts.currentSchool || "";
    var _csKnown = _cs && window.SG_SCHOOLS && window.SG_SCHOOLS.isKnown(_cs);
    var st = { step: "confirm", descCat: null, desc: null, nounCat: null, noun: null,
      role: opts.currentRole || "student",
      schoolSel: _cs ? (_csKnown ? _cs : "other") : _bvss,
      schoolOther: (_cs && !_csKnown) ? _cs : "",
      schoolQ: "",
      heardFrom: opts.currentHeard || "" };
    /* Open ON a rolled name (owner 2026-08-15). The four chip steps are a real
       barrier for a student who just wants to start: 大类 → 描述词 → 名词大类 →
       名词 is four decisions before the app will let them in. The dice was always
       there, but only as one button among the first step's chips. Now the roll IS
       the first screen — 换一个 re-rolls, and 我要自己选昵称 at the bottom opens the
       manual flow for anyone who wants it. Nothing is saved until 确认. */
    rollNick();

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
        var role = st.role || "student";
        var roleBtns = [["student", "🎒 学生"], ["teacher", "🧑‍🏫 老师"], ["parent", "👪 家长"], ["public", "🌏 公众人士"]];
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
        html = '<div class="pop-title">🎉 你的昵称</div>' +
          '<div class="np-name-row"><span class="np-name">' + esc(nickname) + '</span>' +
          '<button class="np-roll" id="npRoll">🎲 换一个</button></div>' +
          '<div class="pop-label">你的身份 I am a…</div>' +
          '<div class="np-roles">' + roleBtns.map(function (r) {
            return '<button class="np-role' + (role === r[0] ? " on" : "") + '" data-r="' + r[0] + '">' + r[1] + '</button>';
          }).join("") + '</div>' +
          '<div class="pop-note">🏆 只有「学生」的昵称会出现在排行榜上。</div>' +
          detailHtml +
          '<div class="nav-row"><button class="nav-btn primary" id="npConfirm">确认</button></div>' +
          '<div class="np-manual"><button id="npManual">我要自己选昵称</button></div>' + closeBtn;
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
      } else if (st.step === "confirm") {
        Array.prototype.forEach.call(card.querySelectorAll(".np-role"), function (b) {
          b.onclick = function () { st.role = b.getAttribute("data-r"); renderStep(); };
        });
        document.getElementById("npRoll").onclick = function () { rollNick(); renderStep(); };
        var selEl = document.getElementById("npSchool");
        if (selEl && window.SG_SCHOOLS) {
          window.SG_SCHOOLS.wireSearch(document.getElementById("npSchoolQ"), selEl, function (v, q) {
            st.schoolQ = q;
            if (v === st.schoolSel) return;
            var wasOther = st.schoolSel === "other";
            st.schoolSel = v;
            if (wasOther) renderStep();   // drop the free-text box now a school was found
          });
        }
        if (selEl) selEl.onchange = function () { st.schoolSel = selEl.value; renderStep(); };
        var otherEl = document.getElementById("npSchoolOther");
        if (otherEl) otherEl.oninput = function () { st.schoolOther = otherEl.value; };
        var heardEl = document.getElementById("npHeard");
        if (heardEl) heardEl.oninput = function () { st.heardFrom = heardEl.value; };
        document.getElementById("npManual").onclick = function () { st.step = "descCat"; renderStep(); };
        document.getElementById("npConfirm").onclick = function () {
          var role = st.role || "student";
          var profile;
          if (role === "public") {
            profile = { nickname: st.desc + "·" + st.noun, category: role, school: "",
              heardFrom: ((document.getElementById("npHeard") || {}).value || "").trim() };
          } else {
            var school = st.schoolSel === "other"
              ? ((document.getElementById("npSchoolOther") || {}).value || "").trim()
              : st.schoolSel;
            if (st.schoolSel === "other" && !school) { alert("请输入学校名称 Please enter the school name。"); return; }
            profile = { nickname: st.desc + "·" + st.noun, category: role, school: school };
          }
          saveProfileLocal(profile);   // WSProfile.save merges onto prev (keeps mtlClass/classHistory)
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


  /* ---------- 航海选择页 · sea map ----------
     Four islands plus the 启航码头 dock on open water. Clicking one sails the
     boat there and then navigates. Every coordinate is a CSS custom property on
     the button (app.css .i-*); nothing here hardcodes a position.

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
  var SEA_DETOUR = { "G2_index.html|HCL_index.html": [40, 30] };

  function initSeaMap(sea) {
    if (sea._wired) return;
    sea._wired = true;

    var boat = document.getElementById("lpBoat");
    var busy = false;
    var BERTH_KEY = "ws_seamap_at";

    function skipSail() {
      // Portrait stacks the islands with no clear sailing lane from the jetty,
      // so a voyage would cut straight across land. The design doc's own answer
      // where a route cannot stay on water is to drop it for that voyage.
      if (window.matchMedia) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
        if (window.matchMedia("(orientation: portrait)").matches) return true;
      }
      return false;
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
        boat.querySelector("img").src = "art/seamap/boat_" + h[0] + ".png";
      } else {
        boat.style.removeProperty("--hx");     // fall back to the jetty
        boat.style.removeProperty("--hy");
        boat.className = "sea-boat h-away_diag";
        boat.querySelector("img").src = "art/seamap/boat_away_diag.png";
      }
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
      try {
        localStorage.setItem(BERTH_KEY,
          JSON.stringify({ go: go, boat: h[0] + (h[1] ? " flip" : "") }));
      } catch (e) {}
      if (skipSail()) { location.href = go; return; }

      boat.className = "sea-boat h-" + h[0] + (h[1] ? " flip" : "");
      boat.querySelector("img").src = "art/seamap/boat_" + h[0] + ".png";

      /* control point for the quadratic the CSS draws. Default is the midpoint
         lifted into an arc; a detoured pair instead names a point the track must
         pass THROUGH at the halfway mark, which for a quadratic means
         C = 2W - (start + end)/2. */
      var key = ((prev && prev.go) || "dock") + "|" + go;
      var alt = SEA_DETOUR[key] || SEA_DETOUR[go + "|" + ((prev && prev.go) || "dock")];
      var cx, cy;
      if (alt) {
        cx = 2 * (alt[0] / 100 * W) - (fromX + toX) / 2;
        cy = 2 * (H - alt[1] / 100 * H) - (fromY + toY) / 2;
      } else {
        cx = (fromX + toX) / 2;
        cy = (fromY + toY) / 2 - H * 0.07;   // 2x the 3.5% arc height: a quadratic
      }                                       // passes half way to its control point
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


  /* ---------- landing page gate: Enter -> (nickname if new) -> paths ---------- */
  function initLandingGate() {
    var enterBtn = document.getElementById("lpEnterBtn");
    var gate = document.getElementById("lpGate");
    var cards = document.getElementById("lpCards");
    var sea = document.getElementById("lpSea");
    var greet = document.getElementById("lpGreeting");
    if (!enterBtn || !gate || !cards) return; // not on the landing page

    function reveal(profile) {
      gate.style.display = "none";
      if (greet && profile && profile.nickname) {
        greet.style.display = "";
        var av = (window.WSProfile && window.WSProfile.avatarImgHtml)
          ? window.WSProfile.avatarImgHtml(profile.avatarId) : "👤";
        greet.innerHTML = '<span class="lp-nick"><span class="lp-av">' + av + '</span>' + esc(profile.nickname) + '</span>' +
          '<button class="code-link" id="lpProfileBtn">👤 我的档案</button>';
        var profBtn = document.getElementById("lpProfileBtn");
        if (profBtn) {
          profBtn.onclick = function () {
            if (!window.WSProfile) return;
            window.WSProfile.open({
              onChangeNickname: function (done) {
                var cur = loadProfile() || {};
                renderNicknamePicker(function (p) { reveal(p); if (done) done(); },
                  { dismissible: true, currentSchool: cur.school || "", currentRole: cur.category || "student", currentHeard: cur.heardFrom || "" });
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
     without a second copy of it. 启航码头 (XH_index.html) is the first such page.
     initLandingGate() below returns immediately when the landing markup is
     absent, so loading this file elsewhere costs nothing. */
  window.WSNickname = { picker: renderNicknamePicker };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLandingGate);
  } else {
    initLandingGate();
  }

})();
