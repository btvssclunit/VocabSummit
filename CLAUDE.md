# CLAUDE.md · 词山学海 Vocab Summit

本文件只放今天仍然有效的规则。历史、理由、实测在
`docs/ARCHIVE_CLAUDE_完整版_2026-11.md`（2026-11-25 的原文全份，下文「§」均指它）。

**用法**
- 动某一块之前，先 `grep -n '^## 18bd\.' docs/ARCHIVE_CLAUDE_完整版_2026-11.md`，只读相关那一节，不要整份读。
- 归档里有多次推翻。推翻一条既有决定前，搜关键词，读最靠后的一条，再问 owner。
- 本文件与代码不符，以代码为准，并在同一次会话改正本文件。
- 交接文（HANDOFF）也会写错，先核实再照做。
- 代码注释与旧文档里的「CLAUDE.md §18xx」指的是归档里的同号一节。
- 本文件保持 200 行以内：新规则写一行，更新记录与过程写到归档末尾。

## 1. 项目
- 百德中学母语部华文组的词汇自主学习平台。Owner：郑凯欣，HOD/MTL，**不是程序员**。
- 用平白的话解释；小而可验证的补丁，不大改写；**不擅自重新设计**。
- 线上：btvssclunit.github.io/VocabSummit（GitHub Pages，`main` / root，push 即上线）。
- 入口：`G1`/`G2`/`G3`/`HCL_index.html`（四座山）· `XH_index.html`（出发码头，pre-G1）。
- `teacher.html` 教师后台、`guide.html` 指南，各自独立。
- 落地页对联必须保留。
- 同名旧项目 VocabKing 是另一套代码，约定一概不适用，不要互抄。

## 2. 结构
- `js/cs.js` 四座山引擎 · `js/xh.js` 码头（从不加载 cs.js）· `js/arena.js` 房间（两边共用）
- `js/profile.js` 档案、进度码、恢复码、船只（`ws2_profile` 唯一所有者）
- `js/nickname.js` 落地页与昵称 · `js/search.js` 只读搜索 · `js/tts.js` 多音字校正
- `js/podium.js` 颁奖台（teacher.html 唯一加载的共享 JS）· `js/firebase-init.js` 登录与 Firestore
- `data/` 词库 · `art/` 美术 · `archived_art/` 退役美术 · `docs/` 规格与归档
- 仓库外同级（**绝不上传**）：`../local-admin/`（含密钥）· `../vocab-lists/` · `../firestore/`
- CSS 的 `url()` 写 `../art/…`；JS 拼的路径写 `art/…`、`data/…`。
- 海 = xh，山 = cs；共享文件不归任何一边，不改名。
- **已发布的网址留在根目录，文件名不改**；`google131a328dc6f2852c.html` 永远不删。

## 3. 部署（每次 push 前逐条过）
当前 `?v=`：**`20261010`**

1. `git status` 先看一遍。「改了没生效」多半是没提交，不是缓存。
2. 推进版本号：一条命令改 `index.html`、四个学段页、`XH_index.html`、`teacher.html`（含 `ASSET_V`）。
   ```
   sed -i '' -E 's/\?v=[0-9]{8}[A-Za-z]*/?v=新值/g' *.html
   grep -ohE '\?v=[0-9]{8}[A-Za-z]*' *.html | sort -u    # 应只剩一个值
   ```
   - 用真实日期；同日再部署加后缀 b、c…z，然后 AA、Ab、Ac。
   - 只改 `.md`、`docs/` 等浏览器不加载的文件时不推版本。
3. 同步改上面「当前」那一行。
4. 更新三份门面：本文件 · `README.md` · GitHub About（不在仓库里，push 带不上去）。
   - About：`zsh ../local-admin/update_github_about.sh`（`--dry` 先看），描述上限 350 字符，与 README 一致。
   - 写入报 404 = `gh` 用错账号，先查 `gh auth status`，应为 `btvssclunit`。
5. 改词数：`data/`、README、网页 meta 与 JSON-LD 一起改。
6. push 后确认 Pages 构建成功、线上版本真的变了。

改了 `firestore.rules`：复制到 `../firestore/` 并更新它的 README，请 owner 发布，再跑
`python3 ../local-admin/check_live_rules.py` 核对线上与仓库逐字节一致。

## 4. 绝不能破的不变量
**水线（§4）**
- `cs.js` 不读 `ws_xh`；`xh.js` 不读写 `ws2_{stream}`。山与码头不兑换进度或货币。
- 跨线只许四样：身份 · 只读搜索（结果不可跳进活动）· 船只（双币各自标价，不推广）· 进度码搬运。
- 海拔／历练值／灵露，航程／航海值／贝壳：永不相加、互换、合成一个排名。

**学生资料与存储**
- 不收学生 PII，昵称是化名。
- 不改 localStorage key、Firestore 集合名、进度码段标签、模式 id。改界面名字只改标签。
- 不删 `store.done`；`store.owned` 不减；退役道具的标签不删（仍有人持有）。
- 日期与记录不回填、不估算，缺就写「未记录」。
- 新词追加在板块末尾，永不中间插入（进度码按词序编码）。词 ID 永久。
- Firestore 不写 `undefined`。

**进度码与恢复码（§18r、§18ae）**
- 货币等快照字段只恢复进全新账号，**整批原子写入**；单调字段取并集。
- VS4 必须能解 VS3。`profile.js` 与 `teacher.html` 两个写入者一起改。
- 恢复码是秘密：不由 uid 派生，不 log、不进表格列、不可搜、不进 CSV。
- `claims` 永远 `allow list: if false`，不放宽成 `allow read`。
- 某片陆地没有 store 就跳过，不写空段。新设备不继承旧恢复码。

**内容**
- 课文例句不得重新引入（需 CPDD 书面许可加登录层）。
- 综合填空（多空段落）在教研组审阅前不上。
- 学生看到的中文内容由 owner 审定。
- 不加 service worker、build step、PWA、manifest、验证码。

## 5. 数据
- 山：Excel 母表（仓库外）是唯一真相。改母表 → `../local-admin/generate_vocab_json.py --write`
  → `data/*.json` 与 `id_registry.json` 一起提交。直接改 JSON 须同一会话同步母表。
- **任何 `data/*.json` 改动后跑** `../local-admin/generate_search_index.py --write`。
- 词数：G1 426 · G2 814 · G3 1069 · HCL 1432 = 3,741；码头 156 词 8 组、90 句。
- 同词跨学段的拼音／词性／释义须一致，唯一例外：绷。
- 载入器只复制显式字段：新字段要加进 `WORDS.push`。板块看数据，不硬编码。
- `cloze` 恰好一个 `__`，句中别处**不含答案的任何汉字**。没有有效 cloze 就跳过并警告，不显示答案。
- 码头干扰项只取同 `组别`，再排除互斥黑名单；黑名单依 `confused` 真实数据维护。
- 数字组刻意无图，不进看图识词与听音识图；无图组变灰并写明理由。
- 绝不在运行时分词。`seg`、`accepted_zh` 不要「补齐」（§18g）。`segPy` 与 `seg` 等长（§18aa）。

## 6. 教学与模式
- 山上计掌握的四个模式：填空挑战 · 攀山快答 · 华文解释 · 英文翻译。改闸门要 owner 书面裁定。
- 打拼音／组词拼音只给一成历练值，不给海拔、不进连对。
- `awardLingLu` 必须在 `gymNote()` 之前。
- 码头进度与货币只走 `noteRight`／`noteWrong`。
- 会出题的新模式必须同时列进 `SAIL_PTS` 与 `SHELL_PTS`；`learn: 0` 是唯一有意的零。
- 码头难度只乘贝壳，不乘航程与航海值。
- 沙滩快跑没有失败条件。看句选词重曝光不重难度，量词提示是刻意的。
- 「读过 N 句」不是进度。航海徽章门槛是绝对值，不重编号，没有终点徽章。
- 三个徽章家族不混算；A 层数用 `achBadgeCount()`，不重新设计五枚美术。
- 「本季」是日历季度（自动算），不跟 MOE 学期，不维护年度表。
- 房间照常计分；每场只有一个结束条件（`limitBy`），旧房间缺字段当 `time`。跨学段按词文本计分。
- 房间不吃道具，闸门在 `takeItems()`。局内不开店。道具不得降低对词义的要求。
- 锁着的头像不隐藏；唯一例外是注册首次选头像只显示免费的（§18ay）。
- 界面命名：一个标签只放一个生词，避开多音字，同机制取同形名字（§18ah）。

## 7. 中文、朗读、注解
- **只读中文**。永远不把拼音喂给 TTS，读错只换同音汉字，屏幕上的字不动。
- eSpeak 中文**整个拒收**（判 `name` 与 `voiceURI`），宁可不出声（§18ba）。
- `cancel()` 后等 50ms 再 `speak()`；iOS 解锁语音的那句 `speak()`（码头 `primeTTS()`，山上在 cs.js）必须在手势里同步执行，不进定时器。
- 朗读不能泄题。码头拒收音色时仍须走 `done()`。
- 音效判断写 `c.state !== "running"`；重建额度要留、要能归零；声音不是唯一反馈（§9、§18t）。
- 拼音／英文是 CSS 闸门翻 class，**不重绘**（重绘会重抽干扰项＝泄题）。
- 题干、释义、句子、选项不加英文；拼音只可用 `<ruby>` 注句子与释义，音节数不符退回纯文本。
- 拼音手写，不生成。加 `EN_LAB` 同时补 `PY_LAB`（码头 `XH_PY`）；key 必须等于屏幕中文。
- HCL 一个辅助都不发。码头默认拼音英文全开。山上默认关，不要顺手改。

## 8. 界面
- 横屏优先（iPad、Chromebook），竖屏可用；旧 iPad 是主力，慎用 `backdrop-filter`。
- `@supports not (backdrop-filter)` 回退块留在 `cs.css` 最末尾；深色面板用浅色注解。
- 编号 ①②③ 只用于真正多步的流程，每屏从 ① 开始；可选辅助不编号。
- 代码内引号用「」；散文不用破折号。竖排对联不用 `writing-mode`。
- **body 状态类与元素闸门类不同名**（`py-ans` / `py-ans-gate`），重名会让全站白屏（§18an）。
- 覆盖注解样式必须带 `body.*-aid` 或 `body.xh-en-on` 前缀；`.zh`/`.en` 元素不写 `display`。
- `@media` 放在基础规则之后；grid 写 `minmax(0,1fr)`；坐标变量不写进 `style`。
- 按钮不嵌套按钮，🔊 是兄弟节点；有可见 hover 标签就不再挂 `title`。
- 会被重写的标签用 `innerHTML` 并重发注解。会居中且会变高的 flex 容器，上半截可能滚不到。
- 选项每题缓存干扰池；加宽难度只追加选项。
- 图片文件名不改（部分 `.png` 内是 JPEG）；透明图与平铺图不转 JPEG。
- 合并切图须逐张肉眼核对；精灵大小走 `spriteScale()`，不手改单行；三个精灵家族不互指。
- 不把 `xh_foam_lap`、`xh_wave_chase` 接回（§18l）；商店商品不加边框。
- 落地页「开始旅程」圆角发光是 owner 裁定，不要改回像素风。

## 9. Firebase 与权限（§16、§18bd、§18bj）
- 匿名登录加 Firestore。登录或读取可能永不回调：6 秒超时照常开门，未授权一律软失败。
- 四层由 `role` 加 `orgType` 决定：superadmin 全部 · 校内只看本校 · 机构只读全部。
- **闸门在规则里**，界面只是礼节。资料编辑走 `canEdit()`，房间走 `isSchoolStaff()`，各路径见 §18bd。
- 管理判断用 `isSchoolManager()`；`"hod"` 字面量只许在它与 `grantable()` 里。
- 任命：superadmin 发 hod/sh/teacher/viewer；hod 发 sh/teacher；sh 发 teacher；superadmin 只在 Console 设立。
- `grantable()`（规则）与 `grantableRoles()`（teacher.html）一致；`org` 与 `profile.school` 逐字相同。
- 校内查询必须带 school 条件，否则整个查询被拒；取 profile 用 `.get(..., 默认值)`。
- 老师改档案写 `profile.teacherFix`；驳回是状态不是删除；机构无 CSV 导出。
- 班级名单以云端 `rosters/` 为准，百德兜底只在当年有效。
- `VSID_ON = false`：学习编号未启用。启用须 owner 裁定，先读 `docs/SPEC_学习编号v2_20260911.md`。
- TTL 不级联删子集合；刚写入的 `serverTimestamp()` 是 null，客户端排序。新 `orderBy` 要复合索引。

## 10. 刻意重复（改一处要改两处）
- 昵称选择器：`cs.js` 与 `nickname.js` 逐字一致（唯一差异 `aidRowHtml()`）。
- `teacher.html` 重复调色板、道具标签、学习编号与进度码编码；`xh.css` 末尾重复共享规则。
- `ORG_LIST` 三份：`profile.js` · `teacher.html` · `../local-admin/migrate_teacher_roles.py`。
- 班级归一化：`teacher.html` 与 `profile.js` 的 `normClass` 同规则。

## 11. 验证
- 纯 vanilla JS、IIFE、无框架。定点补丁，改前断言原字符串存在。
- 本机无 Node：语法检查用 `osascript -l JavaScript`（`new Function(src)`），批量替换后立刻 parse。
- 用 no-store 的 HTTP server，不用 `file://`。浏览器面板隐藏时 rAF 会停，改用 JS 测量。
- 离屏渲染的坑见 §15。断言不等于事件真的到达，拖动与触控要真机点。
- 几何用脚本量，不用眼睛估。改海图坐标要重跑 20 条航线避让。
- IME：组字期间忽略 Enter；版面跟 visual viewport。

## 12. 未完成
清单：`docs/OUTSTANDING_待办清单_20260822.md`（做完即删，动手前先重新实测，它可能过期）。
§18 的「未完成」是旧快照，不要照着做。
