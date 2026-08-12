# CLAUDE.md — 词山学海 Vocab Summit

Read this before touching any file. It is the single source of truth for conventions.
Last updated: 2026-08-10.

## What this is

Vocabulary learning suite for 百德中学 Bukit View Secondary School (BVSS), Mother Tongue Languages Department.
Owner: 郑凯欣 (Kai Xin), HOD/MTL. Built AI-assisted; she is a non-programmer, so explain changes plainly and prefer small, verifiable patches over rewrites.
Live: https://btvssclunit.github.io/VocabSummit/ (GitHub Pages, unit account btvssclunit@gmail.com).

Four apps in one repo, one shared engine:
- 词星大冒险 (G1 基础华文) — G1_index.html
- 词将竞技场 (G2 普通学术华文) — G2_index.html
- 词王淬炼坊 (G3 快捷华文) — G3_index.html
- 词圣鸿文苑 (高级华文 HCL) — HCL_index.html

Name origin: 书山有路勤为径，学海无涯苦作舟. The couplet is featured on the landing page and must stay.

RELATED BUT SEPARATE: the legacy VocabKing app (also named 词王淬炼坊, at
https://for.edu.sg/g3cl-vocabking) is a different single-file codebase with Firebase Auth +
Firestore, hardcoded vocab arrays, a teacher dashboard, unit-level challenge screens and a PWA
service worker. Its files can surface in project searches and look similar. Its conventions do
NOT apply here; never copy code or design assumptions between the two without checking.

## File structure (FLAT — deliberately)

All files sit at repo root because content is updated via GitHub web upload, which cannot create folders.
Do NOT introduce subfolders unless the owner has moved to a git client.

- index.html — landing (horizon hero, couplet, four stream cards, footer with creation/update dates)
- G1/G2/G3/HCL_index.html — thin per-stream entries; each sets `window.STREAM` then loads app.js
- app.css — all styles; BVSS palette lives here as CSS variables
- app.js — the whole engine (vanilla JS, IIFE, no build step, no frameworks)
  (REMOVED 2026-08-10: world.html + world_previous_unedited.html + three_min.js + three.min.js —
  the 词山群岛 sailing scene was removed per owner decision, footer link deleted, files moved to
  Trash. May be recommissioned separately later.) 我的词山 (the altitude mountain) lives in app.js
  startMountain() — see the static-mountain note below.
- g1/g2/g3/hcl.json — generated vocabulary data (see Vocabulary data below for the edit rules)
- id_registry.json — stable word ID registry; always commit together with the JSON it matches
- badge_shkj/hx/gg/jj/whz.png — the five component badges (see Badge system below)
- landing_hero_bg / hero_bg / study_bg / rain_bg / sprint_bg .png — scene backgrounds
- sprite_g1/g2/g3/hcl_raw.png + tileset_raw.png — 8-bit art awaiting processing (magenta
  #FF00FF background removal, 6-frame layout). Never ship the raw files into a scene.
- bg-01..05 .png — painterly progression backdrops (1672×941, ~2.5MB each), shared across all
  four courses. Wired 2026-08-10 as the app-wide body ambience via app.js applyAmbience(): bg-01
  (staircase-sunrise) → bg-02 (bamboo) → bg-03 (ridge-clouds) → bg-04 (snowpass-dusk) rotate by
  overall mastery tier (¼ bands); bg-05 (summit-pavilion) shows only when the course is complete
  (badges.t4). Painterly, so they live on the ambient backdrop — NOT on the pixel-art mountain
  panorama (drawPanorama still uses sprint_bg.png). The landing page keeps study_bg.png (no app.js).

Kept with the Excel masters, NOT in the repo: generate_vocab_json.py, check_consistency.py.

## Design system (locked decisions)

- One unified BVSS identity across all four apps (school pride > per-stream theming).
- Palette tokens (in app.css :root): 晴空 sky #DFEDF7→#BAD6E8, 旭日 sun #FFEDA8/#F5C443,
  青山 #5B8A66, 深山 #3F704F, 碧海 #2E6391, 深海 #1F4A70, ink #243B4A, gold #E3A63C.
- The horizon scene = school logo: THREE mountain peaks (centre tallest, in front), gradients +
  right-side shadow faces for depth, mountains and sea always run edge to edge, sun on the RIGHT (旭日东升).
- Light backgrounds carry dark ink text on white cards; deep-sea navy panels carry light text.
- Vertical couplet uses width:1.15em + word-break (NOT writing-mode, which renders unreliably).
- Quotation marks in any code-embedded dialogue text: use 「」 (never curly double quotes " ", never
  straight "). Decided 2026-08-10: curly quotes often render with the wrong orientation; 「」 is consistent.
- No em dashes in prose/docs; use colons and commas.
- LANDSCAPE IS THE PRIMARY DESIGN TARGET on every screen (PLDs: iPads with keyboards, Chromebooks).
  Portrait phones remain a functional fallback for public sharing / open house. Never lock orientation.
  Study screens use the rail + stage grid at ≥900px (300px rail, sticky, holds mode name / progress /
  streak / difficulty; stage holds the question at generous type sizes). Below 900px everything stacks.
- Functional before decorative: aesthetic passes are deferred until behaviour is solid; never
  redesign visuals (badges, horizon, sprites) without explicit instruction.

## Badge system (locked; art by owner, spec in Vocab_Summit_五枚徽章最终设计规范.md)

Five circular badges, 中华传统建筑与器物 visual language, narrative
由生活入门 → 锁定核心 → 打牢基础 → 更上一层楼 → 开窗见文化:
- 生活空间 badge_shkj.png (青玉院门与竹子) · 核心 badge_hx.png (白玉如意锁) ·
  巩固 badge_gg.png (青玉/青铜台基) · 进阶 badge_jj.png (朱砂红楼阁) · 文化站 badge_whz.png (青花花窗)
- Never overlay text on the badge art; names render in UI beside it. Never crop the outer ring.
  Display square assets with object-fit; locked state = grayscale + reduced opacity via CSS filter.
- Do NOT redesign or regenerate these icons. The five PNGs are the only visual baseline.

Achievement tiers: T1 板块章 (all words in a unit-component mastered, awards the component badge) →
T2 单元章 (all components in a unit) → T3 年级章 (all units in a level) → T4 顶级词王 (everything).
Celebration overlays T1–T4 use the literary-quote sets in app.js (T1 white / T2 navy / T3 shimmer / T4 gold).
Mastery gate (locked): a correct answer in 填空挑战 at ANY difficulty tier marks the word mastered.
(Code also marks mastery in 攀山竞速; showMasteryInfo popover additionally claims 华文解释/英文翻译 but
the code does NOT credit those — unresolved, see the MASTERY-GATE DISCREPANCY note in the 排行榜与积分系统
session section. Do not change the gate without owner sign-off; 海拔 and the +10 历练值 bonus both hinge on it.)
All progress is localStorage only (key ws2_{stream}); device-local, nothing leaves the device.

进度码 backup/restore: compact base64 bitmask over word ORDER per stream, copy/paste UI,
wrong-level codes rejected. Because codes encode order: new words are APPENDED at the end of
their component block and existing rows are never reordered. (The ID registry would keep IDs
stable through mid-insertion, but old progress codes would then decode wrongly.)

## TTS (Chinese-only, hard rule)

This is a CL app: only Chinese is ever read aloud. No English TTS anywhere (英文翻译 prompts are silent).
Speaker buttons: flashcard word + 释义 on both faces, 填空挑战 sentence (blank spoken as a pause via
"，", never the answer), 华文解释 prompt, per-option speakers in all MCQ modes, and auto-speak of
the word after every answered question. The speak() stack encodes hard-won device lessons — keep ALL:
1. Never pass pinyin strings to the engine (read as toneless English). Pass HANZI ONLY. A word
   that is genuinely mispronounced may only be fixed with a homophone HANZI, never pinyin.
   (POLY_MAP was REMOVED 2026-08-12: it fed pinyin like "kuài lè" to the engine, which broke tones
   on managed Chromebooks — the exact thing rule #1 forbids. Do NOT reintroduce a hanzi→pinyin map.)
2. Score voices (scoreVoice), do NOT take the first zh-* voice: managed Chromebooks ship eSpeak-NG
   (reports zh/cmn but toneless Mandarin), often ordered before Google 普通话. eSpeak is scored to
   the back so it is only ever a last resort; Google 普通话 / zh-CN win. voices.html is a diagnostic
   page (lists every voice + per-voice 试听) to run on a student device and confirm the right one.
3. cancel() then speak() in the same tick silently drops the utterance on ChromeOS: keep the
   setTimeout(50) guard. Samsung devices need the same 50ms delay between cancel and speak.
4. voiceschanged listener + 200ms retry (voices load async).
5. One-time warning toast when no Chinese voice exists at all (⚠️ 未找到中文语音…); permanent fix is
   IT admin enabling Google 普通话 in the ChromeOS admin console.
Watchlist after the 2026-08-09 pinyin fixes: verify 撇 (piě) and 拧 (nǐng) on devices; 绷 is
deliberately bēng in G3 and běng in HCL. Fix any misread word with a homophone hanzi, never pinyin.

## Vocabulary data and pipeline

- Counts (2026-08-09): g1 426 · g2 814 · g3 1069 · hcl 1432 = 3,741 entries. 1,994 unique word
  texts; 1,018 words appear in 2+ streams (144 in all four; G3∩HCL alone is 868). No duplicate
  word text within any single stream.
- Word IDs (G3-0001 style) are permanent, keyed by stream|年级|单元|板块|词语 in the registry.
  A word moved to a different unit/component gets a NEW id by design. The registry holds exactly
  one key per Excel row (3,741). Mastery/badges depend on stable identity, so registry discipline matters.
- Excel masters are the source of truth. Normal flow: edit master → run generate_vocab_json.py →
  commit changed JSONs + id_registry.json together. Direct JSON patching is allowed ONLY as a
  synced pair: the identical edit lands in the master in the same session and Excel↔JSON field
  agreement is verified (done 2026-08-09).
- Cross-stream consistency (harmonised 2026-08-09): the same word must carry identical
  拼音/词性/中文释义 in every master it appears in. Run check_consistency.py before regenerating.
  Sole whitelisted exception: 绷 (G3 bēng 拉紧义 / HCL běng 板脸义 — two 义项 taught deliberately,
  Kai Xin 2026-08). Any edit to a shared word must be applied in EVERY master that contains it.
- New words: append at the END of their component block (进度码 order rule above). Never insert mid-block.
- Component sets differ per stream (G1: 生活空间/核心/文化站 · G2/G3: +巩固 · HCL: all five incl. 进阶).
  Render whatever components appear in the data; never hardcode the list.

## Content rules

- 课文例句 are fully removed from the published JSONs. Every published sentence (释义 wording,
  填空句) is owner-authored, so the site is public and freely shareable with no ringfencing.
  The Excel masters retain 课文例句 for reference only. Optional future restoration requires BOTH
  written CPDD permission on file AND a login layer; until then, never reintroduce 例句 into
  published files.
- 填空句 (`cloze`) are self-authored (never 课文例句 by rule): exactly one `__` per sentence, and
  the target word must not appear elsewhere in the sentence.
- 填空挑战 never shows a question without a valid `__` blank: words missing cloze are skipped with a
  console warning, never fall back to showing the answer.

## Current phase and hard boundaries

Phase: login-free public test build.
- NO login, NO Firebase, NO server-side tracking; everything localStorage.
- 综合填空 (multi-blank passages) is EXCLUDED until the CL department human-vets the drafted passages.
- No service worker yet (deliberate, avoids cache pain during rapid testing). PWA packaging later.
- Repo is public for GitHub Pages free tier; freely shareable (all published content is owner-authored).

## Study modes and games (implemented)

- 词语闪卡: flip cards, word + 释义 speakers on both faces, proper end screen (never an infinite loop).
- 填空挑战: student-selectable difficulty ladder, switchable mid-round from the rail:
  ⭐ 2 options / ⭐⭐ 3 / ⭐⭐⭐ 4 (near-synonym-filtered distractors, same POS first) / ⭐⭐⭐⭐ typing
  (2 tries, pinyin hint). Wrong-answer flow: buzzer → 0.9s pause → correct answer highlighted →
  TTS reads 正确答案：X. iOS audio is unlocked on first tap.
- 华文解释 / 英文翻译: 4-option MCQ, meaning → word direction, per-option speakers.
- 复习范围 picker: 全选/清空 at top, year-level accordions with persisted open state.
- 词雨: falling words with 集雨 collection mechanic (收集 button, splash animations, word pool
  limited to ≤4-character words with an empty-pool guard), IME typing input (compositionend-aware
  Enter), speed 慢/中/快, pinyin toggle, 3 lives, waves every 10 clears,
  score = 字数×10×combo + altitude bonus, personal best in localStorage only. Keep the 词雨 name (谐音).
- 词语汉兜 (G2/G3/HCL only): 4-character word Wordle, 6 guesses, character-level grading
  (exact/present/absent, duplicate-aware), pool = 4-char words in scope (min 8), win streak tracked.
  Progressive hints: G2 shows all four 声母 from the start; G3/HCL show the first character's 声母
  only; all levels reveal 释义 after 2 wrong guesses.
- 组词挑战 (G2): character-assembly game (slots + chips).
- 攀山竞速: vertically-scrolling tiling rock wall (climb-wall-tile.png) with a zigzag climber
  (redesigned 2026-08-10; was a waypoint path). Answering correctly scrolls the wall and the
  climber zigzags up one hold column per step. Timer 60/90/120s (remembered per device); combo
  tones; personal-record ledge line; TTS for prompt and options; 8-bit sprite climber (position-
  only movement, no limb animation).
- 我的词山: a single static illustrated mountain (mountain_bg.png, shared across all four streams),
  entered from the home mini-horizon. Fixed landscape view, no scroll/camera/joystick. Unit/年级峰/
  你的营地/顶峰 pins sit along the painted path; tapping a pin opens the existing popovers. Altitude =
  mastered word count, 1词 = 1米, never decreases (locked rule). (Redesigned 2026-08-10 from the old
  procedural canvas — see the static-mountain note below.)
- Mastery ⓘ popover explaining the generous first-correct rule.

## Roadmap (in order; decision dates noted)

1. User-testing polish of the current build. Includes processing the five raw sprite/tileset
   PNGs (magenta removal, frame slicing) into 攀山竞速 characters and terrain.
2. Cross-stream mastery carryover — DECIDED 2026-08-09: automatic and symmetric. Mechanism:
   at load, union the mastered word texts across all four ws2_* localStorage stores (same origin),
   intersect with the current stream's own list. Computed, no new storage; survives 进度码
   restores by recomputation; word TEXT is the join key (IDs are stream-scoped by design).
3. Weak-first queues everywhere — analysed, awaiting go: build every mode's session from
   priority buckets (never-attempted + unmastered first, 需巩固 next, mastered last) and widen
   the home 复习未掌握 entry to include never-attempted words. Verify current app.js behaviour
   first; the bucketed-queue reference implementation lives in legacy VocabKing, not here.
4. Remaining mini games: 反向打词 (G1 variant: English prompt + bank always visible),
   近义快辨 (distractors = same unit + same POS), 笔顺挑战 via chanind/hanzi-writer (G1/G2, MIT, credit).
   Shared config when built: unit multi-select; question count 5–50 step 5; option bank 120% of
   question count; auto-cap when scope too small. No duels/multiplayer; personal high scores only.
5. Firebase layer — decisions 2026-08: anonymous auth + Firestore (asia-southeast1); nickname via
   adjective + noun combo picker (e.g. 勤奋的学者; duplicates acceptable; the format avoids
   vulgarities); collect school for reach tracking; anonymous feedback/analytics widget.
   No real student PII ever. (Supersedes the earlier synthetic-accounts plan.
   LEADERBOARDS REINSTATED 2026-08-10 per LEADERBOARD_DESIGN — per stream, on anonymous
   auth; see the 排行榜与积分系统 session section below. This reverses the earlier
   "leaderboards are currently dropped" note.)
6. 例句 restoration (optional, unscheduled): requires written CPDD permission + login (see Content rules).
7. PWA packaging (manifest + service worker + offline queue).
8. Pre/post assessment instrument: 30-question MCQ for the learning-evidence base.

## Engineering conventions

- Single-purpose targeted patches with pre-verified anchors (assert old string exists before replacing).
- Run check_consistency.py before regenerating JSONs; commit JSONs + id_registry.json together.
- Test with a local HTTP server (fetch fails on file://) and Playwright when available.
- Falling-word/game layouts must reflow with the visual viewport (on-screen keyboard); landscape-first
  everywhere per the design rule above.
- Responsive breakpoint: rail + stage and two-column home at ≥900px; single column below.
- IME inputs: track compositionstart/compositionend and ignore Enter during composition.
- Session continuity: the output file from each session is the base for the next; never revert
  to an earlier version.

## Session additions, 2026-08-10

- Unit GitHub account (btvssclunit) recovered Aug 2026; repo lives at btvssclunit.github.io again.
  After the transfer some deployed files were stale or missing, so this session produced a complete
  repo drop: always deploy the full file set, never a partial upload.
- Landing page layout rule (UPDATED 2026-08-10): the landscape landing has NO dark band. .lp-hero
  is height:100vh (full art, no crop-to-band), and the gate/greeting/cards/foot all float OVER the
  art via position:absolute (gate lower-right at right:7vw/bottom:15vh; cards centred bottom:8vh;
  greeting bottom:24vh; foot a gradient strip at bottom). .lp-hero-spacer is now display:none (the
  floated children no longer need reserved flow space). The portrait @media resets all four back to
  position:relative and stacks them below the hero with 46vh top clearance (functional fallback;
  the dark area remains only in portrait, which is secondary per the landscape-first rule).
- Level-page mini-horizon uses landing_hero_bg.png (app.js miniHorizon). If a deployed level page
  shows different art, the deployed app.js is stale.

## v0.4 rebuild, 2026-08-10 (词雨灵露 · 你的营地 · 营地商店 · 年度试炼)

Rebuilt from DESIGN_词雨灵露_营地商店.md after the original v0.4 files were confirmed lost
(not in git history, not in any Downloads folder). All in app.js + app.css; world.html untouched.

- New store fields (loadStore): `lingLu` (灵露 number), `deco` (owned shop keys), `gym`
  (passed levels), `gymTodo` (level -> {wordId} 待巩固), `homeTab` (study|play). localStorage-only:
  NOT added to mergeCloudProgress, so they persist locally and are never clobbered by cloud restore
  (they ARE sent to Firestore as part of the whole store, just not merged back). Not in 进度码.
- 词雨 renamed 词雨灵露: each caught word earns 灵露 = its char count; the jar counter shows ✨ dew;
  on game over `store.lingLu += dew`. Score formula unchanged. Pun kept.
- Home page: 📖 修行 / 🎮 闯关 tabs (store.homeTab). 修行 = quiz modes, 闯关 = games. Badge strip /
  stats / footer stay under both.
- 你的营地: permanent base-camp mark at alt 0 in buildMarks (t:"base"), always reachable. Tapping it
  opens openCamp() — wallet, pets line, 自由试炼 board (launches any mode with the current 修行 scope),
  and 营地商店 entry. Owned decorations (fire/flag/pine/pavilion) render beside the tent via TILE_MAP.
- 营地商店 openShop(): 篝火30 / 营旗60 / 青松100 / 小亭200, gated on store.lingLu, owned -> store.deco.
- Four altitude zones (山脚绿野/云海栈道/雪线冰崖/天阶峰顶): boundaries from the t:"level" marks. In the
  static-mountain redesign these ARE the four painted terrain bands of mountain_bg.png; code just shows
  the current zone name in the HUD (the old canvas per-band tint is gone with the canvas).
- 年度试炼 (gyms): folded INTO the 年级峰 (t:"level") popover, NOT a separate mark, to avoid overlap at
  the boundary. Cumulative design (owner 2026-08-10): 30 words from the level + 10 random from EACH
  earlier level (中一 30 / 中二 40 / 中三 50 / 中四 60), built by buildGymSeq(). Pass = ALL correct ->
  store.gym[level]=1 + 四灵 pet (🐢灵龟/🦌麒麟/🐦凤凰/🐉神龙 by level index) + result screen.
- Option B failure (locked): a failed trial never touches mastery/altitude; missed words go to
  store.gymTodo[level], the trial relocks, and any correct answer in cloze/MCQ/sprint calls gymNote()
  which clears that word from every level's 待巩固, re-unlocking the trial.
- Gym reuses renderMcq via a state.gym flag + state.pool (distractors from the involved levels) and a
  renderGymResult branch. Gym answers do count toward zhmcq stats (bump) — acceptable, they are 华文解释.
- Verified in-browser (no Node on this machine, so node --check / jsdom smoke tests were replaced by a
  full browser pass on a python3 http.server): tabs, currency banking, camp, shop purchase+gating+deco
  render, zones, gym unlock, cumulative counts (中二=40), Option B fail+待巩固+integrity+relock, recovery,
  win+pet. Firebase is live locally (WSCloud.isAvailable()=true), so seeding a LOWER mastered count is
  restored by cloud merge on reload; seed UP or clear cloud when testing altitude.
- Convention change 2026-08-10: code-embedded quotation marks now use 「」 (was curly " "), see Design
  system. Only one curly-quote string existed (the new rain copy); swept clean.

## Art asset drop, 2026-08-10 (wordgrove == VocabSummit, renamed)

Source: Downloads/wordgrove-assets/ (also in Documents/VocabSummit/all-images/). "wordgrove"
is an old name for THIS project; its CLAUDE_CODE_INSTRUCTIONS.md targets this repo.

- WIRED: the 5 story backgrounds (bg-01..05) as the app-wide progression ambience (see file list).
- WIRED (owner chose the redesign 2026-08-10): minigame/climb-wall-tile.png. 攀山竞速 (startSprint)
  was REBUILT from a fixed-viewport waypoint-path climb into a vertically-scrolling tiling rock
  wall + zigzag climber, per the asset instructions. WALL_IMG tiles seamlessly on Y (tileH scaled
  to canvas width); climbAlt drives worldY so the texture flows downward as you ascend (STEP_PX=78);
  the climber sits at a fixed screen anchor (H*0.60) and zigzags between two hold columns (0.34/0.66
  W), one column per altitude step, with a small up-arc per move. No limb animation (position only,
  per spec). Removed the now-dead SPRINT_WP / waypointPos / climbFrac. Personal-record shows as a
  ledge line on the wall. drawPanorama (sprint_bg.png) is no longer used by sprint but still serves
  我的词山. NOTE: the tile's top/bottom edges are close but not pixel-perfect (per the drop); the
  busy texture hides it, but eyeball the seam on a long run — regenerate/edge-blend the PNG if it
  shows (do NOT paper over it in code). The superseded chibi-climber asset is not referenced.

## Nickname pool revision, 2026-08-10

Adopted from Downloads/nickname_pool_revision/ (per Kai Xin's vetting). DESC_CATS/NOUN_CATS
swapped in both app.js and nickname.js (kept identical). Totals 132 desc / 84 noun →
122 desc / 85 noun (10,370 combos). Two categories renamed: 正义侠肝 → 正直担当, 独特多元 →
个性独特. Removed terms that were violent/weaponised (两肋插刀…), romantic (来者不拒…), or
visual-scenery rather than character traits. Data-only change: the picker already rendered
{w,zh} chips with 释义 tooltips, so no picker code changed. (Note 滴水穿石 still appears in
app.js — that is the CEL_T1 celebration quote, not a nickname; correct.)

## 我的词山 static-mountain rebuild + sailing removal, 2026-08-10

Per HANDOFF_static_mountain_and_sailing_removal.md. Both in app.js + app.css + index.html.

- **Sailing removed:** footer link in index.html deleted; world.html, world_previous_unedited.html,
  three_min.js, three.min.js moved to Trash (recoverable; may be recommissioned separately).
- **Static mountain:** startMountain() fully rebuilt — the ~370-line procedural canvas (rAF loop,
  camera/camY, worldH/yOf/xOf, drag-pan, joystick, drawn mountain body/trail) was REPLACED by a
  fixed landscape image (mountain_bg.png, 1672×941, shared across all four streams) with DOM pins.
  Pins = buildMarks() filtered to base/unit/level/summit (comps fold into the unit popover); each is
  absolutely positioned at its altitude fraction along MTN_PATH — a hand-traced polyline of the
  painted path on THIS image. Re-trace MTN_PATH (top of the static-mountain block in app.js) if the
  image ever changes. A "you are here" marker (.mtn2-hero) sits at current altitude fraction; no
  animation. Tapping a pin calls the SAME openMark() branches, so all popovers carry over unchanged:
  unit words · 年级峰+年度试炼 gym · 你的营地 camp+shop · 顶峰. HUD = 已掌握 米 + current zone name +
  🎯 目标 (showGoalPanel). CSS: .mtn2-* + .m2pill; .mtn2-stage uses aspect-ratio 1672/941 and
  width:min(96vw,124vh) so the whole scene + HUD fit one view without scrolling.
- Pin positions are a first hand-traced pass; nudge MTN_PATH by eye if any pin sits off the path.
  The old .mtn-* canvas CSS and module-level TILE_IMG/drawTileM are now unused by the mountain
  (TILE_MAP tiles are still used by nothing after this; sprint uses its own drawClimber) — left in
  place, safe to prune later.

## Session batch, 2026-08-10 (evening) — copy, dashboard, sprint modes, profile, data fix

- 词雨灵露 copy: removed sea framing (rain_bg is a meadow) — home card + mode-desc now say 落地前打出;
  no 大海/入海/江海 anywhere. rain_bg.png swapped to the painterly meadow.
- Footer 换昵称 / 进度码 links restyled as chunky gold chips (.code-link) — was tiny low-contrast text.
- README.md: installed the owner's public README, corrected 3 stale lines (static mountain, sailing
  removed, roadmap → dashboard).
- 我的词山 MTN_PATH re-traced (denser, upper waypoints shifted right) so pins hug the painted path.
- 个人词语表 (renderWordList): word-level list over 复习范围, status = 已掌握/待巩固(gymTodo)/未掌握,
  filter chips, tap a row → practiceWord() single-word cloze/zhmcq. Entry card on home (wlEntry).
- Daily streak: store.streak + store.lastActive, updateStreak() at boot (local date; increments on
  consecutive-day open). Shown in 个人词语表 header + the entry card. localStorage-only.
- 攀山竞速: (a) climb-wall-tile.png replaced with the stone-LEDGE wall; the climber now lands on a
  REAL ledge every jump — SPRINT_LEDGES lists the 8 shelves per tile (traced by eye; re-trace if the
  image changes), climbAlt is a ledge index, wall scrolls to bring each ledge to the climber's feet.
  (b) canvas enlarged (.sprint-shell/.sprint-canvas). (c) question-mode picker: 填空 / 华文解释 /
  英文翻译 via store.sprintMode (English mode hides TTS per the Chinese-only rule; cloze filters to
  words with a valid __ blank).
- 年度试炼 gate CHANGED: now requires mastering ≥80% of that year-level's words (was: reach the zone).
  gymSectionHtml shows current % when locked.
- sfxOk upgraded to a rising 3-note reward chime — plays on every correct answer (all modes already
  call it).
- Profile schema is now {nickname, role, school}. Picker (BOTH app.js + nickname.js, kept identical)
  adds a role step (学生/老师/家长) with the note 只有「学生」会出现在排行榜上, and school as a dropdown
  (百德中学 default / 其他 → free-text). Parent sees 孩子就读的学校. For future usage analysis + leaderboard.
- DATA FIX: 姓氏 definition corrected to 表示一个人的家族血亲关系的标志和符号 in ALL FOUR JSONs (was the
  wrong 人的姓和名，通称姓氏). ⚠️ The Excel masters (not in repo) MUST get the same edit or
  generate_vocab_json.py will revert it. Only zh changed; ids/registry unaffected.
- 成就墙 now shows each 板块's 课文标题 (《…》) between the component name and the count. textTitle is
  carried into COMP_LIST at boot (it was already in every JSON component; not 例句, so no CPDD issue).
- Landing (index.html/app.css): removed the dark band under the hero — .lp-hero fills the viewport,
  gate/greeting/cards/foot float over the art (button lower-right). Portrait stacks as before.
- Leaderboard + UID design doc received: it is a DRAFT awaiting Kai Xin sign-off — NOT implemented.
  It also reverses the earlier "leaderboards dropped" roadmap note; confirm before building. The
  role/school profile fields above were added now so the data is ready if/when it's approved.

## Session batch 3, 2026-08-10 — leaderboard, search, word-list redesign, data sync

- 姓氏 fix now also applied to the Excel MASTERS (vocab-lists/*.xlsx, column I / 中文释义) so JSON↔master
  agree; the 4 JSONs were already fixed. openpyxl was pip-installed for this.
- Leaderboard (per leaderboard_uid_design.md, owner-approved): firebase-init.js gained getUid,
  saveLeaderboard (writes leaderboard/{stream}/entries/{uid} = {nickname,school,altitude,updatedAt}),
  getLeaderboard (orderBy altitude desc). app.js: pushLeaderboard() in the cloud-sync path writes ONLY
  when profile.role==="student"; renderLeaderboard() = per-stream board with 校内/跨校 toggle (store.lbScope),
  tiers 🥇1-10/🥈11-20/🥉21-30, self-highlight + ±2 context window if outside top 30, every row shows full
  UID. 识别码 (UID) + 复制 shown in the 你的营地 popover. Home entry card 🏆 排行榜. All Firebase calls are
  guarded (getUid/getLeaderboard may be absent if an old firebase-init.js is cached → graceful "refresh"
  message, no crash). REQUIRES the Firestore rules below deployed in the Firebase console before it works.
- Home search bar (wireHomeSearch): look up ANY word in the stream by 词 / 拼音(tone-insensitive) / 释义;
  results show 词·拼音·释义 inline, tap = TTS. For classwork/homework lookup.
- 复习范围 now shows each unit's 主题/theme (UNIT_LIST.theme, from u.theme in the JSON).
- 词语表 (renderWordList) redesigned per owner: grouped by 年级·单元·板块 headers, filter chips
  (全部/已掌握/待巩固/未掌握), and a 🃏 闪卡 button that runs flashcards over the CURRENT filtered set
  (startFlashList) — so students zone in on unknowns then study. The home 词语闪卡 card now opens this
  list-menu first (was: straight into cards). Tap a row = single-word practice (practiceWord).

## Firestore security rules to add (Firebase console → Firestore → Rules), leaderboard support

Keep the existing users/{uid} rule; ADD the leaderboard block:

    match /leaderboard/{stream}/entries/{uid} {
      allow read: if request.auth != null;                       // any signed-in (incl anon) user
      allow write: if request.auth != null && request.auth.uid == uid;  // only your own row
    }

Until this is published, the leaderboard shows "加载失败/正在更新" and writes are denied — the rest of
the app is unaffected.

## Session batch, 2026-08-10 — 排行榜与积分系统 (历练值 scoring + two-board leaderboard)

Built from LEADERBOARD_DESIGN (design approved by owner). All in app.js + app.css + firebase-init.js.
Build order steps 1-5 done; step 6 (field-level security clamps) deferred as the doc directs.

LOCKED PRINCIPLE (three numbers, never summed, never substituted for one another, never in a
combined ranked total):
- 海拔（掌握词数）: breadth. Monotonic, 1 词 = 1 米, counts a word once, never decreases.
- 历练值: depth. Repeatable; scales with question difficulty × answer streak; banked per term and
  cumulatively. NEW this session.
- 灵露: effort currency, 营地商店 only, never on any leaderboard. Unchanged (still 词雨-only — see
  the open item below).

历练值 scoring (app.js, the 历练值 section near the top of the IIFE):
- final = round(base × attemptDecay × streakMultiplier) (min 1) + firstMasteryBonus.
- base per mode/tier: cloze ⭐2/⭐⭐3/⭐⭐⭐5/⭐⭐⭐⭐8 · 华文解释 3 · 英文翻译 2 · 组词一次拼对 3 ·
  攀山竞速每题 2 · 汉兜 6+1/未用次数 · 词雨 & 闪卡 0.
- attemptDecay 1.0/0.40/0.15 (1st/2nd/3rd+ try) · streakMultiplier ×1/×1.2/×1.5/×1.8/×2.0 at
  连对 0-2/3-4/5-7/8-11/12+ (uses the count ENTERING the question; resets on any wrong answer).
- firstMasteryBonus +10 once per word ever (the moment 海拔 rises), guarded by store.pts.masteryAwarded.
- Repeats on an already-mastered word: max(1, round(base×0.25)), no streak, capped at 3 scoring
  repeats per word per Asia/Singapore day (store.pts.repeats). Further correct answers earn 0 历练值
  but still advance the 连对 streak.
- store.pts = { total, terms:{termId->n}, masteryAwarded:{}, repeats:{day,counts} }. localStorage is
  the source of truth; merged into cloud on load as max(local,remote) for total + per-term + a
  masteryAwarded union (mergeCloudProgress). NOT in 进度码.
- TERMS array + currentTermId() live near the top of app.js: EDIT ONCE A YEAR when MOE term dates
  shift (add next year's four terms before Term 1). Falls back to the most recent term when today is
  outside every range, never returns null.
- 段位 ladder (LADDER, per stream, 初行客→凌霄客) shows as a pill on the home mini-horizon. Recalibrate
  the thresholds after one real term of data before announcing them to students.

Leaderboard UI (renderLeaderboard, 词山风云榜): two main tabs 掌握词数 / 历练值; 历练值 has a 本学期 /
累计 sub-toggle; 校内 / 跨校 scope filter stays. Top 20 + the student's own standing with an actionable
gap (never a bare rank, never a full cohort list). Only role==="student" profiles are published;
teachers/parents browse but never rank. Honest-framing note about new-device identity per the doc.

Firestore model CHANGED (firebase-init.js): the leaderboard now uses scores/{uid} — one doc per uid,
each stream a map field { alt, totalPts, bestStreak, pts:{termId->n} } plus nickname/school. Queried
with orderBy on nested field paths (e.g. "g3.alt", "g3.totalPts", "g3.pts.2026T3") + limit; own rank
via a server-side count() (no collection read). The old leaderboard/{stream}/entries writer is retired
(getLeaderboard kept for backward compat, no longer called). saveScore is gated to students in
pushLeaderboard().

⚠️ REQUIRES NEW FIRESTORE RULES before the board works (Firebase console → Firestore → Rules). Add:

    match /scores/{uid} {
      allow read:  if request.auth != null;                        // any signed-in (incl anon) user
      allow write: if request.auth != null && request.auth.uid == uid;  // only your own doc
    }

Until published, the board shows "加载失败，请稍后再试" and console logs permission-denied on scores/*;
everything else works fully offline (verified in-browser 2026-08-10). Field-level clamps (design §8)
are still to be added later.

⚠️ OPEN ITEM for the owner (design §4, deliberately NOT decided unilaterally): whether study modes
should also trickle 灵露 (+1 per question answered, +1 more if correct, daily cap 400). Kept OFF this
session — 灵露 remains 词雨-only, the current shipped behavior. Confirm before adding.

⚠️ MASTERY-GATE DISCREPANCY found this session (pre-existing, NOT changed): the code calls markMastered
only in 填空挑战 and 攀山竞速, but showMasteryInfo() TELLS students that 华文解释 and 英文翻译 also
confer mastery, and this CLAUDE.md's "Mastery gate (locked)" line says 填空挑战 only. Three different
claims. Because 海拔 and the +10 bonus both hinge on this, do not "fix" it silently — the owner must
decide which modes confer mastery, then code + popover + this file get aligned in one pass. LEADERBOARD_
DESIGN §11.2 assumed the code already credits all four; it does not.

## Session batch, 2026-08-10 — 我的档案 dashboard + nickname-bound 进度码 (student side)

Built from HANDOFF_dashboard_and_bound_codes.md §1-6 (student side). Steps 7-9 (teacher.html +
final Firestore rules + §8g owner decisions) are a SEPARATE pass needing Firebase-console work.
New file profile.js; edits to app.js / app.css / nickname.js / firebase-init.js / index.html + 4
stream pages. Verified in-browser on a python3 no-cache server (no Node on this machine).

LOCKED decisions (per §11):
- Profile is owned SOLELY by profile.js / window.WSProfile. app.js and nickname.js delegate
  loadProfile/saveProfileLocal to it; NEVER read/write ws2_profile directly from those two files.
- `role` was RENAMED to `category` (same values student|teacher|parent|public, same leaderboard
  gating). The handoff's "current shape {nickname,school}" was stale — `role` already existed.
  profile.js.load() migrates role→category and deletes role. All app.js/nickname.js references
  updated. Stored as the ASCII key, never a Chinese label.
- New profile fields: mtlClass (students only; uppercased + whitespace-stripped; "" otherwise),
  classYear, classHistory. WSProfile.save() owns ALL class bookkeeping: clears mtlClass when
  category leaves student, archives the previous year's class into classHistory on a cross-year
  change, corrects the current entry within the same year. save() MERGES onto the previously
  stored profile so panel-only fields survive a nickname re-pick (the picker rebuilds {nickname,
  category, school[,heardFrom]} but no longer clobbers mtlClass/classHistory).
- 我的档案 panel: reachable via a 👤 button appended inside setTopbar's tb-right on every stream
  screen (its text now lives in a #tbRightText span so updateScopeSum no longer wipes the button),
  and via 👤 我的档案 in the landing greeting (replaced the old 换昵称 link). Sections: 身份 /
  基本资料 (school, category chips, class input shown only for students) / 我的进度 (per-stream
  mastered counts read straight from ws2_* localStorage) / 进度码 / 技术信息 (UID + 简短编号 first
  6 chars + sync status) / 隐私说明. On the landing page no code provider is registered, so 进度码
  shows the four subject links instead. Home 💾 button + topbar 👤 both open it; showProgressCode
  was removed.
- 进度码 is VS2: VS2.{stream}.{n}.{b64bitmask}.{meta}.{nickB64}.{ck}. nickB64 = base64url UTF-8 of
  the owner's nickname; ck = FNV-1a 32-bit (base36) over the joined preceding fields. VS1 still
  decodes (shows 这是旧版进度码，无法核对来源). Binding is friction + attribution, not security
  (nickname is plainly forgeable). decodeProgress() is now PURE (validates, returns a plan, never
  writes); commitProgress() is the ONLY writer. A mismatched nickname returns {mismatch,codeNick}
  and the panel offers 改用「codeNick」并恢复 (adopts the identity, then restores) — legitimate new
  device works, illegitimate copy becomes socially visible. Restore always snapshots to
  sessionStorage (ws2_{stream}_prerestore) BEFORE commit so 撤销恢复 works this session, and always
  calls WSCloud.logRestore.
- firebase-init.js gained logRestore (append to top-level restoreLog) and getModeration (read own
  moderation/{uid}). Both fire-and-forget / graceful: they NEVER block a restore. Until the §8e
  rules are published they are DENIED (console shows "logRestore failed: permission-denied") and
  the app is otherwise unaffected — verified.
- index.html (landing) now loads the Firebase compat SDK + firebase-init.js + profile.js before
  nickname.js (it previously loaded only nickname.js), so the landing does anon auth and the panel
  can show UID/sync there too.

DEFERRED / OPEN:
- Moderation READ on boot (§7b) NOT wired this session: it must run before mergeCloudProgress, but a
  local zero would be re-added straight back by the cloud union, and it can't be tested until the
  teacher side + rules exist. Also §7b's rollback-to-snapshot is not implementable under the §8e
  rules (students can't read restoreLog), so the workable action is `zero`. Build moderation
  enforcement together with teacher.html + rules, and decide the cloud-wipe story there.
- Teacher dashboard (§8) is BUILT as deliverables awaiting owner console work: teacher.html
  (standalone; never loads app.js/profile.js; Firebase Email/Password + teachers/{uid} allowlist;
  concept/概览/班级视图/词语难点/恢复记录/处理[HOD]), firestore.rules (the §8e blocks PLUS the
  scores/{uid} rule the handoff omitted — the leaderboard needs it, so do NOT paste §8e verbatim),
  and ADMIN.md (rules deploy + Rules-Playground checklist + teacher onboarding + moderation limits +
  the §8g defaults used). teacher.html loads clean to the sign-in screen; it ignores leftover
  anonymous sessions (teachers are never anonymous). Full dashboard verification needs a real
  teacher account + published rules + data — owner console steps in ADMIN.md.
- §8g owner decisions defaulted (flagged in ADMIN.md §6): pseudonymous (no index-number field);
  teachers read across schools per §8e with a school filter in the UI. Change on request.

## Session batch, 2026-08-10 — 练习不计分 modes (组词出题方式 + 填空打拼音)

Owner request (same session, mid-build). Two additions, both verified in-browser:
- 组词挑战 (G2) 出题方式 selector in the rail: 释义 / 英文 / 填空 / 拼音·不计分 (store.asmPrompt,
  default "def"). def→w.zh, en→w.en, cloze→w.cloze (blank as <u></u>), py→w.py. Per-word fallback
  to 释义 when en/cloze is missing. Chinese-only TTS: speaker shown only for 释义 (reads 释义) and
  填空 (reads sentence); 英文 and 拼音 have NO speaker (English is silent by rule; pinyin IS the
  sound). 拼音 mode is practice-only: skips scoreCorrect (no 历练值). 组词 never conferred mastery.
- 填空挑战 打拼音 tier (store.diff === "pinyin"), shown in diffSelector ONLY for STREAM g1/g2. Type
  the toneless pinyin of the blank word; tonelessPy() strips tone marks (NFD + combining removal),
  folds ü/v→u, drops spaces, lowercases, so "pang da"/"pangda" both match 庞大 (páng dà). Practice
  only: in renderCloze finish() pyMode skips noteStreak (no 连对/bestStreak), scoreCorrect (no
  历练值), AND markMastered (no 海拔) — the q-tag says 练习不计分. Hint reveals the 词语 (not pinyin).
- Note for the MASTERY-GATE discrepancy above: these two 拼音 modes DELIBERATELY do not confer
  mastery or points (owner: familiarisation only). If the owner later decides the pinyin-typing
  tier SHOULD confer mastery, flip the pyMode guards in renderCloze.finish().

## Student trial feedback, 2026-08-12 (batch 1 of N — see the 4 FEEDBACK_*.md files)

28 Google-Form responses (mostly G3/HCL) + teacher observation. The feedback is split into four
files meant to be worked in separate passes. DONE this batch:
- **C-1 restore safety** (profile.js): the restore path already used union (commitProgress, only-
  increase) + a confirm dialog + sessionStorage snapshot + 撤销恢复. Added a DIFF line to the confirm
  dialog: 「进度码里有 X 个…你现在有 Y 个…合并成 Z 个 — 只增不减」. NOTE: restoreSnapshot (the UNDO
  hook) intentionally does a full `store = snap` replace — that is correct for undo; do NOT change it
  to a merge (the feedback conflated it with the restore path). The restore path itself never
  replaces.
- **C-2 landing back-nav** (nickname.js): initLandingGate now auto-reveals the four course cards when
  a profile already exists, so pressing back from a stream lands on the course list, not the entry
  gate. First-time (no profile) still shows the gate → picker.
- **G-1** (app.js railHtml): 词语闪卡 no longer renders 连对 / 历练值 (they never change in flashcards).
  Gated on `state.mode === "flash"`.
- **G-3a/b TTS** (app.js): removed POLY_MAP (see TTS section above) + made voice selection score-based
  (eSpeak pushed to the back). Added voices.html diagnostic. ⚠️ G-3b still needs a DEVICE MEASUREMENT:
  run voices.html on a student Chromebook to confirm which voice is correct; if a device has ONLY
  eSpeak zh, that is the Web-Speech ceiling on managed Chromebooks and pre-rendered audio becomes a
  separate decision.
- **Data fixes** (T-1/T-3 + single-word T-2): 挑剔 py tiāo tī → tiāo ti (g2/g3/hcl); 吭声 zh reworded
  (hcl); 新陈代谢 zh reworded to carry morpheme clues (hcl). Vocab-data quotation marks use CURLY
  doubles “ ” (per T-1), distinct from the 「」 rule for app.js UI strings. Applied to BOTH the JSONs
  AND the Excel masters (vocab-lists/*.xlsx via openpyxl this session) — fully synced, no revert risk.
- **U-1/U-2/U-3 mobile landing** (app.css @media orientation:portrait): gate/greeting/cards are
  CHILDREN of .lp-hero, so the hero can't be a short banner — rebuilt the portrait block as a
  flex-column (logo in flow at top, everything stacks under it). Kills logo-crop (animation off + in
  flow), bg side-crop (cover), and the stacked-46vh blank gap in one go.
- **U-4 词雨 readability** (app.css @media max-width:480 bigger .rain-word; app.js maxLive=4 on phones).
- **U-5 sprint climber** (app.js): SPRITE_SCALE=2.0 + a foot shadow; imageSmoothingEnabled was already
  false. Feet anchor kept at py+6 so it still lands on the ledge.
- **G-2 词雨** (app.js): RAIN_LIVES=5 (removed the duplicate hardcoded `3`), 8-step RAIN_SPEEDS with a
  much slower floor, 固定/递增 modes (store.rainRamp), speed persisted (store.rainSpeed). Ramp walks the
  table one step per wave from slowest, capped — replaced the old per-wave ×0.12 multiplier entirely.
  Config shows a mode toggle; ramp disables the speed picker; wave toast shows the speed level.

PENDING (owner-gated content audits, each its own pass — need Excel masters + human judgement):
- FEEDBACK_CONTENT.md T-2 general (audit ALL 4-char 汉兜 hints for morpheme clues) + T-4 (cloze
  sentences using chars beyond the stream's taught range). Do an automated first-pass filter, then
  human-vet — never auto-rewrite语料. Also G-3b needs a device measurement (run voices.html on a
  student Chromebook).
