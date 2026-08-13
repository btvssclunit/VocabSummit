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
  - Class is entered MANUALLY as "YYYY Class" (student types "2026 3HC3"); the year is NOT auto-set
    (owner 2026-08-12, overriding DESIGN_奖励经济 §6's auto-year idea). Instead WSProfile.
    maybePromptClassUpdate(openPanel) — called at boot in app.js — nudges a student, from Jan 2 each
    year, to update their class when classYear < current year (or missing) and they haven't been
    nudged this year (store.classPromptYear flag). save() now stamps classYear = the current year on
    any class CHANGE (previously it inherited the old year, so a new-year update never advanced it and
    the prompt would re-fire — fixed 2026-08-12).
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

## 营地场景 (campsite) — BUILT AND VERIFIED 2026-08-13

Per DESIGN_营地场景_商店_v2.md + 附录三 (layout constraints). Owner decisions:
- **STATIC scene for v1** (owner 2026-08-12, for speed): fixed decoration slots + pets FIXED in a
  loose cluster between the 住所 and the 篝火 — no walking avatar, no pet-follow (附录二's walking
  character is DEFERRED, not rejected; the static layout is designed so the pet cluster later becomes
  the "return point" and walking layers on additively). There is no camp walk-sprite in the assets.
- 附录三 constraints are binding: three depth bands; centre vista (cx 35–65, by<72) kept clear;
  framing items overlap the painted treeline at the edges; walking-corridor rule (front band cx 30–70
  near-empty) still respected so the future avatar needs no re-layout; design for 22 simultaneous
  decos (16 A/B + 1 dwelling + 5 C) + 4 pets; density fallback = per-item student show/hide (never
  auto-rotation); pet sizes are FINE as spec'd (w≈5–6; the "pets too big" review note was wrong —
  judge by composited render, never native px).
- VERIFIED IN CODE 2026-08-12: 灵露 is credited ONLY at 词雨 game-over (app.js store.lingLu += dew).
  闪卡/打拼音 do NOT earn 灵露 yet → per v2 §2, C-tier prices are 600/700/700/800 until that
  earn-scheme ships. 海拔-unlock thresholds: 50% / 80% of the stream's word count. Fixed placement
  (no dragging); no shop_stall.png; proximity prompts deferred; keep the 4 permanent camp buttons.
- Method: composite the real PNGs into a rendered scene and tune CAMP_LAYOUT by eye (sparse AND
  full-22 states) BEFORE wiring openCampScene() — same render-then-tune loop as the mountain path.

BUILD (2026-08-13): 30 assets copied from the design drop into repo root (camp_bg, tent + tent_cabin +
tent_tower, 21 deco_*, 4 pet_*, linglu). `openCamp()`/`openShop()` (old popup versions) fully replaced
by `openCampScene()` / `openShopScene()` — full-screen scenes in the `.mtn2-*` pattern (view().innerHTML,
not popOverlay), reached the same way (`m.t === "base"` on the mountain → openCampScene). `CAMP_LAYOUT`
+ `PET_LAYOUT` hold the final tuned cx/by/w coordinates (percent-based, by = bottom edge, draw order by
ascending `by`). Old SHOP's 4 prices (fire 30/flag 60/pine 100/pavilion 200) preserved exactly in the
new catalogue — no migration needed for anyone who already bought under the old system.
- Dwelling is an exclusive upgrade chain stored as store.deco.cabin / store.deco.tower (tent is the
  free default, never itself stored). Buying 楼阁 requires 木屋 already owned (gated in both the shop
  UI and the click handler); dwellingTier() picks tent/cabin/tower for rendering. No refund/rollback,
  matching the design doc.
- 望山台/悬泉飞瀑 are computed, not purchasable: prestigeUnlocked() checks altitudeNow() against
  round(WORDS.length × 0.5 / 0.8) and they just appear in the scene once crossed — verified the
  shop row shows "海拔 N 米解锁" with the right N per stream (e.g. 535/855 on G3's 1069 words).
- ⚠️ C-tier pricing is MY interpretation, flagged for the owner to adjust: 附录三 §7 item 2 says "改为
  600/700/700/800" (4 numbers) but the C-tier priced item list has 5 entries (koipond/sakura/maple/
  cabin/tower) — the doc's own count doesn't line up. Shipped as koipond 500 · sakura 700 · maple 700 ·
  cabin 800 · tower 1000 (roughly halved from the original 800/1000/1000/1200/1500, order preserved).
  Trivial to retune — single numbers in the SHOP_C / DWELLING_SHOP arrays in app.js.
- linglu.png replaces ✨ in the wallet, shop prices/rows, and the 词雨 result line (campLingluIcon()
  helper, falls back to ✨ via onerror if the image ever 404s). Left as literal ✨ in the LIVE in-round
  词雨 dew counter (updates via textContent many times/sec — swapping to innerHTML+img there is
  needless overhead) and in toast() calls (toast is textContent-only, can't render an <img> at all).
- Graceful degrade verified: every sprite (deco/pet/dwelling/bg/shop-thumb) has onerror that hides
  itself (or falls back to a colour wash for the bg) rather than showing a broken-image icon or
  crashing — confirmed by forcing a fake 404 on both a shop thumbnail and the scene background.
- VERIFIED in-browser end-to-end (desktop + mobile): sparse state (tent+fire only) reads as a cozy
  start, not empty; full-22 + all 4 pets renders with zero overlap/clipping and the dwelling still
  reads as the clear focal point; a real purchase deducts the correct 灵露 and the item appears in the
  scene immediately; the full tent→cabin→tower chain (buy cabin → tent swaps to cabin; tower button is
  absent until cabin owned → buy tower → cabin swaps to tower, cabin flag stays true).
- NOT done (correctly deferred, not started): walking avatar, pet-follow, shop_stall.png, draggable
  placement, proximity prompts — all per the owner's static-for-speed call, see above.

## 结伴登峰 (arena) — DECISIONS LOCKED 2026-08-12; STUDENT SIDE + RULES BUILT, TEACHER SIDE + GAME MODES PENDING

BUILD PROGRESS (2026-08-12):
- ✅ firestore.rules: rooms/{code} + rooms/{code}/players/{uid} block added (player create allowed in
  lobby OR running per D-5 late-join). ⚠️ owner must PUBLISH + set a Firestore TTL policy on
  rooms.expiresAt before anything works.
- ✅ arena.js (NEW, student side, loaded before app.js on the 4 stream pages): self-contained overlay
  (join → lobby → play → results), throttled per-player writes (≤5s + final), own minimal cloze/MCQ
  renderers (NOT renderCloze — keeps §7 isolation). Quiz modes done: cloze / zhmcq / enmcq. Awards the
  arena session-score only; on finish calls ctx.conferMastery(correctIds) → app.js marks those words
  MASTERED (海拔) with NO scoreCorrect/历练值 (D-2). Unknown modes (rain/sprint) show "即将推出".
- ✅ app.js: 「加入结伴登峰」 pill on the home mini-horizon → openArena() (passes stream/words/profile/
  getUid/conferMastery). conferMastery marks mastery + saveStore + checkBadges + applyAmbience only.
- ✅ teacher.html 结伴登峰 tab (visible to ALL teachers): setup (stream / unit checkboxes / mode /
  cloze-tier / qCount / duration; 词雨 extras: speed 1-8, 固定/递增, 拼音 on/off, 生命 时间制/3/5/8) →
  freezes wordIds from the host-fetched stream JSON (cloze rooms filter to valid __ blanks; rain rooms
  filter to ≤4-char words, min 8) → 6-char code (alphabet has no O/0/I/1/L; retry ×3 on collision) →
  live board (onSnapshot on players, huge .arena-code for the projector, countdown, 开始/结束/导出CSV/
  全屏 via requestFullscreen, 关闭这场 deletes players then the room — TTL does NOT cascade).
  gameCfg {speed,ramp,py,lives} is written on rain rooms only.
- ✅ arena.js game modes: sprint = same-paper speed answering on 华文解释 prompts (高度 = 答对数 in the
  HUD; arena scoring; v1 does not adapt the canvas climb wall). rain = falling-words in the overlay:
  same frozen pool + host gameCfg for everyone, per-device fall order (fairness = pool + config),
  score 字数×10×combo (combo +1 per 3 clears, cap ×5), lives mode ends early at 0 ❤️, time cap always
  applies, IME composition guarded. NO 灵露 banked; typed/answered-correct words confer mastery.
- ✅ playerCount: the HOST's players-onSnapshot writes rooms/{code}.playerCount on change (only the
  host may write the room doc under the rules), so student lobbies show a live count.
- ✅ VERIFIED 2026-08-12 by driving arena.js against a MOCK Firestore in-browser (full lifecycle, since
  real rooms need published rules): join→player row written; lobby shows host/mode/count; status flip
  to running starts questions; scoring formula correct (100 + speed 50 + streak 10 = 160 on an instant
  first answer); 3-question round → result card; final write {answered,correct,score,finished:true};
  results board sorts by score, highlights self, shows the ⏱ late marker. RAIN room: renders host
  gameCfg (3 lives / pinyin on / speed idx), typing a falling word scores 字数×10×combo (4-char = 40),
  host 结束 → finish path stops the rAF loop, clears the field, confers mastery.
- ✅ D-2 VERIFIED against the REAL app.js hook (not the mock): conferMastery raised 掌握 5→8 while
  store.pts.total stayed 0. Mastery yes, 历练值 never. Test pollution was reverted afterwards.
- COPY OF THE RULES FOR THE OWNER: /Users/kaixinchun/Documents/VocabSummit/firestore/ (firestore.rules
  + README.txt with the publish + TTL steps). It is a COPY — repo-clone/firestore.rules is the source
  of truth; re-copy it there whenever the rules change.
- LIVE-TEST FIXES 2026-08-13 (found by the owner on a real mobile round trip):
  1. **RE-JOIN WAS DENIED (rules bug, needs a RE-PUBLISH).** A returning student already has a player
     doc, so Firestore treats .set() as an UPDATE — and the old update rule required status=="running",
     which locked out anyone rejoining during the lobby. FIX: create + update now share one condition
     (uid matches AND status in ["lobby","running"]). Students may join/rejoin any time until 结束.
  2. Client half of the same bug: doJoin() zeroed answered/correct/score, so a rejoin WIPED progress.
     It now reads the existing row first and carries score/correct/answered forward (merge write,
     original joinedAt + late flag preserved). The 词雨 HUD also hardcoded 得分 0 — now seeds myScore.
  3. **No scenery in rooms.** The overlay painted an opaque flat gradient over everything. It now lifts
     the student's earned ambience image off document.body (applyAmbience's bg-01..05) and lays a dark
     scrim over it; setBackdrop(mode) swaps in rain_bg.png / sprint_bg.png once the room mode is known,
     and .arena-rain uses the same rain_bg.png + gradient as the main 词雨. Verified desktop + mobile.
- STILL NEEDED: RE-PUBLISH firestore.rules (fix #1 above — the old ruleset still blocks rejoin), set the
  Firestore TTL policy on rooms.expiresAt if not yet done, and redeploy arena.js. The owner's rules copy
  at Documents/VocabSummit/firestore/ has been re-synced with a note about the required re-publish.

- LIVE-TEST REPORT 2026-08-13 (owner): 攀山竞速/词雨灵露 rooms "did not respond" on the student screen
  when the teacher pressed 开始, while the three quiz modes worked. Re-tested BOTH game modes against
  the current source with a mock Firestore reproducing the REAL two-phase timing (join while lobby,
  status flips to running via a SEPARATE later snapshot, matching how serverTimestamp()/onSnapshot
  actually deliver) — both transitioned and rendered correctly; could not reproduce a code-level bug in
  either startPlay()'s dispatch or startRainPlay(). ⚠️ Could not rule out a stale deploy (arena.js/
  teacher.html not yet redeployed after the backdrop/rejoin fixes above) — check that first if it
  recurs after redeploying the current repo.
  Shipped anyway, because it's a real class of bug worth defending against regardless of root cause:
  **mobile browsers throttle/suspend background WebSocket activity when a tab is backgrounded or the
  screen locks** — very plausible for a student idling in the lobby while the teacher sets up, and it
  would silently stall onSnapshot with no visible symptom (exactly "no response"). arena.js's room
  watcher now has two backstops on top of the live listener, both only while still in the lobby (never
  after play starts): (a) a `visibilitychange`/`focus` listener that re-fetches the room via .get() the
  instant the tab regains focus, (b) a 4s poll as a belt-and-braces fallback if focus events don't fire
  reliably either. Both listeners are torn down in detach()/close() so they don't leak across
  join→leave→rejoin cycles. VERIFIED: simulated a fully-dead onSnapshot listener (fires once at
  subscribe, never again) and confirmed a dispatched visibilitychange event alone recovers the game
  (a 词雨 room transitioned from stuck-lobby to rendering correctly). Re-ran the normal live-listener
  path afterward to confirm no regression.



Teacher-hosted live in-class competition (spec: DESIGN_ARENA_课堂擂台.md). Owner §12 decisions resolved
(Kai Xin, 2026-08-12) — record them here so they survive to the build session:
- D-1 name: 结伴登峰 (student button 「加入结伴登峰」, teacher tab 结伴登峰). NOT 课堂擂台.
- D-2 credit: a correct answer marks the word MASTERED (掌握/海拔) but awards NO 历练值 and NO 灵露.
  ⚠️ This ADDS a mastery-conferring path beyond 填空挑战/攀山竞速 — update the MASTERY-GATE note + the
  showMasteryInfo popover when built. 历练值 stays self-directed-only so a keen teacher can't inflate
  the 词山风云榜. Structurally: arena code must NEVER call scoreCorrect/bankPts; it may call the mastery
  mark only. Keep arena in its own arena.js overlay, never entering renderStep().
- D-3 modes (v1): 填空挑战 + 华文解释 + 英文翻译 + 攀山竞速 + 词雨灵露. Teacher picks ONE per room.
  For 词雨 the host also sets time / lives / pinyin on-off / 固定-vs-递增 speed; for 攀山竞速 the timer.
  (汉兜 / 组词 excluded from v1.) NOTE: this is BIGGER than the spec's cloze-only v1 — the two real-time
  games need a "same word pool + same config, compare scores" room model, not the frozen-question model.
- D-4: prompt for 班级 at join if missing, allow skip, show 未填班级 on the board.
- D-5: allow late-joiners while running, mark the row with ⏱.
- D-6 host: any approved teacher (not HOD-only). Caveat: other-school self-registered teachers can host
  on our Firebase quota — revisit before any public (SgLDC) announcement.
Owner console steps required before it works: publish the rooms Firestore rules block, and set the
Firestore TTL policy on rooms.expiresAt. Build order per spec §11 (rules → arena.js → html includes →
app.js pill → teacher.html tab → CLAUDE.md full section).

## Session batch, 2026-08-13 (evening) — 学生反馈修复 · 教师端编辑 · 头像系统 · 可及性 A–E

Four input docs this session: DESIGN_迭代规划_学生反馈与UI修复_2026-08-13.md, DESIGN_可及性_语音按钮_
拼音辅助.md, DESIGN_头像与档案页.md, plus an owner request mid-session (teacher dashboard). All code
is in app.js / app.css / profile.js / nickname.js / teacher.html / arena.js / firestore.rules.

**添加到主屏幕 (Add to Home Screen) — DECLINED, do not revisit.** A homescreen_pack (icons + manifest +
title.png) was prepared, but the owner confirmed MOE-managed school PLDs do not allow home-screen web
apps. The app stays browser-based. Nothing was added to the repo; do not add apple-touch-icon /
manifest / standalone meta tags. (Also removes the "separate storage container + separate anon UID"
migration problem that pack would have introduced.)

**Inactive-account cleanup:** no policy is enforced in code (no cleanup job on scores/{uid} or
users/{uid}; the only TTL is rooms.expiresAt). Advice given: prefer a ~12-month sweep run once a year
in the Dec/Jan break over a rolling 6-month window — a term-long quiet stretch is normal for a
voluntary practice app, and an annual sweep timed to the year-end break is far less likely to delete
a still-enrolled student. Owner has not decided; do not implement cleanup without sign-off.

### 学生反馈修复 (from 迭代规划 doc)
- **1.1 进度恢复 — the doc's diagnosis was WRONG, verified against the code.** The restore path is
  already merge/union-only (commitProgress only ADDS ids + Math.max on numerics; mergeCloudProgress is
  union-only). The ONLY wholesale `store = snap` in the entire codebase is restoreSnapshot, which backs
  the **撤销恢复 (undo)** button — correct by design. So the real hazard was the undo button having NO
  confirmation at all. FIXED: onUndo now opens a confirmDialog with a loss-preview (「撤销会丢失这之后
  新掌握的 N 个词语」). Do NOT "fix" the restore path; it is not broken.
- **1.2 iPad 键盘遮挡 (词雨/结伴登峰):** ported app.js's own proven `fitViewport` visualViewport pattern
  (already used by the solo .rain-shell) into arena.js startRainPlay — drives #arRain's pixel height off
  visualViewport instead of a bare 52vh, listeners torn down in stopGame. Deliberately NOT the doc's
  suggested `--vh` variable + `interactive-widget` meta: reusing the mechanism already shipped in this
  repo beats introducing a second parallel one.
- **1.3 房间模式词雨缺少动画:** ported fxShow/fxSeq/collectToBarrel/splashAt + the barrel/water HUD from
  app.js into arena.js (ARENA_RAINFX_MAP reuses the same sprite-sheet crop coords). Catch = fly-to-barrel
  + rising water; miss = splash.
- **1.4 MTN_PATH 上半段:** re-traced by pixel-sampling mountain_bg.png (a min-warmth/brightness scan per
  row), not by eye. Indices 9–14 were nearly flat (x 0.517–0.527) and sat off the painted stairway;
  now [0.546,0.382] [0.489,0.319] [0.541,0.255] [0.516,0.191] [0.519,0.128] [0.555,0.064]. Verified by
  rendering the full polyline over the image.
- **1.5 营地图标:** .mtn2-pin.t-base 33px → 46px + an invisible ::before inset:-5px hit ring (~56px).
- **3.1 模式配置:** 词语汉兜 is now G3/HCL only, 组词挑战 is now G1/G2 (G1 has 370 eligible 2–4 char
  words, well over the 10 minimum). CAMP_MODES `only`/`not` replaced with a single `only: [...]`
  whitelist and the filter updated to match. G1 defaults asmPrompt to "py" (拼音) rather than 释义.
- 1.6/1.7 (sprint 音效按钮误触 / 意外缩放) were NOT fixed as described — they are the same root cause the
  可及性 doc diagnoses properly, and are folded into Workstreams A + B below.

### 教师后台 (owner request, mid-session)
- 班级视图 gained a **学校 column** (the school filter existed but no per-row display).
- **HOD-only 编辑 button** per row → a form correcting nickname / 身份 / 学校 / 班级. Writes ONLY the
  top-level `profile` field; mirrors WSProfile.save()'s own rule that leaving 学生 clears mtlClass.
- ⚠️ **NEW FIRESTORE RULE, must be published before it works:** users/{uid} gained
  `allow update: if isHod() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["profile","updatedAt"])`
  — scoped so an HOD can never reach progress/pts/badges through this path. Until published the save
  shows 「保存失败：permission-denied」. The owner's copy at Documents/VocabSummit/firestore/ is re-synced
  with a note.
- ⚠️ **KNOWN LIMITATION, flagged to the owner, not fixed:** this edits the CLOUD copy only. There is no
  cloud→device sync for profile fields (only progress/mastery merges down), so if that student later
  opens 我的档案 and saves, their device pushes the old value back over the teacher's correction. Fine
  for students who don't revisit the panel; a real fix needs a pull-down sync.

### 头像系统 (DESIGN_头像与档案页.md) — BUILT, all 20 avatars shipped
- `AVATAR_CATALOG` in profile.js: 4 角色 (avatar_char_g1/g2/g3/hcl.png) + 4 神兽 (pet_*.png, reused) +
  12 生肖 (avatar_zodiac_{rat,ox,tiger,rabbit,dragon,snake,horse,goat,monkey,rooster,dog,pig}.png).
  Not stream-limited — any student may pick any avatar (owner decision).
- New profile field `avatarId`; it is a PLAIN field (no year/history bookkeeping like mtlClass) so
  save()'s existing merge-onto-prev loop persists it with zero extra code. Unset → 👤 fallback, so old
  profiles need no migration.
- Picker: `openAvatarPicker` overlay (pop-overlay/pop-card pattern), category chips (全部/角色/神兽/生肖
  rendered from whatever categories exist in the catalog), tap = instant select + close (no confirm
  step, matching the nickname picker). Entries: the avatar itself in 我的档案, and a 换头像 link.
- Topbar `.tb-profile` renders the chosen avatar instead of the literal 👤; the landing greeting
  (nickname.js) shows it too. setTopbar's `right` param call from renderHome was emptied — the
  「XX 词在范围内」 text is GONE per the doc (updateScopeSum no longer writes it either).
- **Asset processing (repeatable):** source art has a magenta #FF00FF background. Plain
  Euclidean-distance keying left a visible magenta haze on edges; what works is a **min(R,B) − G
  "magenta signature"** test with a despill ramp, then a tight square crop, then downsize to 320px max.
  The zodiac originals were 1254px / 1–1.5MB each — far oversized for a 64px thumbnail — now ~70–95KB
  (1.05MB total for all 12). Two of the four character sprites (g2, hcl) also had leftover opaque
  magenta specks on the backpack that needed a hue-based pass. Always verify on a contrasting
  background, never against white.
- 档案面板 §5 compaction done: 身份+基本资料 merged into one header block (large avatar + nickname +
  身份·班级·学校 subline + 换头像/换昵称 links), 技术编号 and 隐私说明 collapsed into a single
  `<details class="prof-more">` one-liner, .prof-sec margin 16px → 12px. Still one scrolling page, no
  tabs/accordion (owner decision).

### 可及性 (DESIGN_可及性_语音按钮_拼音辅助.md) — Workstreams A, B, C, D1, E ALL DONE. D2 GATED.
- **A — speaker restructure (the real cause of "button-mashing").** The 🔊 was a `<span>` NESTED INSIDE
  the answer `<button>`, discriminated by `e.target` sniffing, so a finger landing 2px off the 27–31px
  circle SUBMITTED THAT OPTION AS THE ANSWER. Now `.opt-row` holds two sibling buttons; the e.target
  sniffing is deleted from all three surfaces (renderCloze MCQ branch, renderMcq, startSprint askNext)
  and the speakers are wired separately by data-i. `.opt-tts` unified at 31px (sprint was 27px) with
  `::after{inset:-8px}` giving ~47px effective, plus a 10px gap so a near-miss now does nothing.
  Same ::after treatment added to `.tts` generally. reveal()'s `.py` append is now guarded with
  `if (!b.querySelector(".py"))` so it can't double up.
- **B — touch-action:** `touch-action:manipulation` on .opt/.sopt/.opt-tts/.tts/.nav-btn/.dopt/
  .check-btn/.hint-btn/.lp-enter-btn/.lp-card. NOT on body/#app (would kill pinch-zoom page-wide).
  Note: `user-scalable=no`/`maximum-scale=1` are deliberately NOT used — iOS has ignored them since
  iOS 10 and they'd break pinch-zoom elsewhere.
- **C — 攀山竞速 landscape split:** `@media (min-width:820px) and (orientation:landscape)` turns
  .sprint-shell into a row (canvas left, new `.sprint-right` wrapper holding HUD+question right) and
  .sopts to a single column — the single-column switch IS the tap-target win, not the split itself.
  Portrait/phones unchanged (the wrapper is a no-op there). `.sprint-shell` also gets a second
  `height:calc(100dvh - 68px)` declaration after the 100vh one (cascade fallback, no @supports).
  C2 checked: the draw loop is fully proportional (W/H derived from getBoundingClientRect, ledges in
  fractions) — no hardcoded wide-viewport assumption, nothing to fix.
- **D1 — 拼音辅助:** `store.pyAid`, DEFAULT OFF for every stream, student opt-in only. Toggle rendered by
  `pyAidToggleHtml()` + `wirePyAidToggle()` in both the 填空挑战 rail (via diffSelector) and the
  攀山竞速 pre-start screen. When on, every option shows its 拼音 immediately (`.sopt .py` styling added).
  Scoring is UNCHANGED — pinyin reveals pronunciation, not meaning, so full 历练值 either way (D-5).
  NOTE: wireDiff's difficulty handler is now scoped to `.dopt[data-d]` so it doesn't swallow the
  pyAid button.
- **E — anti-mashing:** (E1) fresh G1/G2 profiles default `s.diff` to "2" (两个选项), others "3";
  existing stored choices are untouched. (E2) new `dwellGate(btn, 800)` disables 下一题 +
  aria-disabled for 800ms after an MCQ answer, then enables and focuses. Applied in renderCloze's MCQ
  branch and renderMcq only — the typing branch keeps its plain focus() (typing already cost effort)
  and **攀山竞速 is deliberately untouched** (timed mode; a forced pause would penalise the app's own
  pacing). `.nav-btn:disabled{opacity:.5}` added.
- ⚠️ **D2 (释义/句子 ruby 拼音) NOT STARTED — GATED BY THE DOC ITSELF.** It requires building a
  pypinyin-based generator, emitting zhPy/clozePy aligned 1:1 with CJK chars only, polyphone override
  columns in the Excel masters, schemaVersion 1→2, and a file-size check (each stream JSON would roughly
  double). The doc mandates: build the generator, inspect ~60 entries across all four streams, and
  REPORT BACK before writing any renderer code. Do not start without fresh owner sign-off.

### Verification note for this batch
No live device/browser run was possible (the sandbox blocked the local HTTP server, and the Browser
pane refuses localhost by policy). What WAS done: every edited JS file syntax-checked by parsing it in
JavaScriptCore via `osascript -l JavaScript` (a usable JS engine on this machine even with no Node —
worth remembering), a 16-assertion profile.js data-layer suite run in a stubbed DOM/localStorage
environment (catalog integrity, avatarId round-trip, field-preservation across saves, img/fallback
HTML, off-student class clearing — all pass), an every-referenced-PNG-exists check across
app.js/arena.js/profile.js/app.css/index.html, CSS brace balance, and pixel-level image analysis for
the mountain path + chroma-key work. **Still needs a real run-through on a device before class** —
especially the sprint landscape split, the rain viewport fix, and the MCQ speaker restructure, since
those touch every quiz screen.

## generate_vocab_json.py 重建 · 2026-08-13

The pipeline script referenced throughout this file **did not exist on the owner's machine** — not in
local-admin/, not with the Excel masters, nowhere. Since the Excel masters are the source of truth and
JSON edits are only ever allowed as a synced pair, having no generator was a real hole: nobody could
regenerate after a master edit.

REBUILT 2026-08-13 at `local-admin/generate_vocab_json.py`, reverse-engineered from three sources —
the masters' column layout, the four published JSONs (the only truth about output format), and
id_registry.json. **Proof it is correct: `--verify` regenerates all four streams and compares
byte-for-byte against the published JSONs — all four are identical.** Re-run `--verify` after ever
touching the script.

- Output format is exactly `json.dumps(doc, ensure_ascii=False, separators=(",",":"))` — compact, no
  newline, unescaped Chinese. Word order follows master row order (进度码 depends on it).
- Column map (by header name, with positional fallback): 年级/单元/单元板块/单元主题/课文标题/词语/
  拼音/词性/中文释义/英文释义/课文例句/例句来源/填空句. **课文例句 is deliberately never read** — it must
  not reach a published file (CPDD).
- IDs: key = `stream|年级|单元|板块|词语`; existing keys always reuse their id, only unseen keys mint
  `max+1` for that stream. Verified: 设施 keeps G2-0001 and a brand-new word mints G2-0815, with every
  pre-existing registry entry untouched. (hcl's max id is 1436 for 1432 rows — 4 ids retired by words
  that moved unit/component, which is the documented by-design behaviour.)
- `meta.generated` defaults to the value already in the existing JSON so a no-op regen stays
  byte-identical; `--generated` overrides.
- `--pinyin` folds in the D2a work (zhPy/clozePy, schemaVersion 2) so a future regeneration can never
  silently wipe those fields — which is exactly what would have happened had they stayed in a separate
  script. add_pinyin_fields.py is kept only for reference.
- Flags: `--verify` (byte-compare, no write) · `--write` · `--pinyin` · `--masters` · `--repo`.
  Standard flow is documented in local-admin/README.txt.

## D2a 拼音生成 · 结果与待决 (2026-08-13)

Generation is DONE and clean; the gate decision is the owner's.
- **Alignment: 3741/3741 entries, zero failures.** Every zhPy/clozePy has exactly one syllable per CJK
  character (punctuation / Latin / the `__` blank produce no token, as specced).
- **⚠️ SIZE: hcl.json crosses the doc's own limit.** g1 98→156KB, g2 189→303KB, g3 257→415KB,
  hcl 326→**522KB** (+60% across the board). DESIGN §D2a says raise it if any stream exceeds ~500KB —
  these load on managed Chromebooks over school wifi. Options: ship anyway, ship zhPy only (释义 is
  where the real accessibility gain is; cloze pinyin is roughly half the added bytes), or gzip/split.
  NOT decided.
- **Polyphone accuracy: good, with known soft spots.** pypinyin's phrase-level segmentation handles
  context well (行 xíng 206 / háng 20; 长 zhǎng 120 / cháng 77; 重 zhòng 137 / chóng 25; 乐 lè 43 /
  yuè 29 — all plausible distributions). Two things to human-vet before shipping: 和 produced 3 huò +
  3 huo + 2 huó readings (almost certainly wrong — should be hé in nearly all school contexts), and
  得 de/dé split 97/272 needs spot-checking since 得 is systematically hard. The override mechanism
  (母表 optional columns 释义拼音/例句拼音) is built and wired for exactly these fixes.
- **D2b (the <ruby> renderer) is NOT started** and should not start until the size call is made and a
  human has vetted a sample — shipping half-correct pinyin to weak readers is worse than none, since
  they cannot detect the errors.

## Session addendum, 2026-08-13 (late) — §2.1 修行 页 + 头像修订

- **§2.1 was missed in the first pass and is now done.** The 修行 tab had the 题数 picker as five
  full-width buttons plus four flat mode cards. Now: TWO cards — 学习挑战 (merges 填空挑战 / 华文解释 /
  英文翻译) and 词语闪卡 (kept separate: 看词认义/点读 is a different interaction, not question-answering).
  New `renderQuizConfig()` + `store.quizMode` holds 题型 / 题数 / 难度, following the same
  config-screen pattern as 攀山竞速 and 词雨. Difficulty tiles render only when 填空 is selected.
- **Avatar revisions (owner review):** 人物/角色 avatars REMOVED entirely (16 left: 4 神兽 + 12 生肖).
  All art is now square-padded (crop to content → centre on square canvas) and thumbnails use
  `object-fit:contain` — the previous `cover` was clipping the 龟 (a wide 439×334 image) and 凤.
  生肖·蛇 was WRONG: 13 candidate source files existed, 12 were mapped, and the snake slot got a legged
  lizard-ish image; corrected to the legless coiled snake. All avatars now face LEFT (rat / ox / 龟
  mirrored; the rest already did or are front-on).
- ⚠️ **神兽 avatars are SEPARATE FILES from the camp sprites.** avatar_pet_*.png (square, 320px) feed
  the picker; pet_*.png (original sizes) stay untouched for 营地 PET_LAYOUT rendering. Pointing the
  catalogue back at pet_*.png would silently change the camp art — this was caught and reverted
  mid-session, don't reintroduce it.

## 教师后台视觉统一 · 2026-08-13 (迭代规划 §2.2)

The owner's blunt verdict was "still awfully ugly" — teacher.html looked like a generic admin panel
(light-blue background, white cards, blue-grey buttons) while the student side is gold-on-deep-sea
山水. Fixed:
- **Identity now matches the student side.** teacher.html's `:root` carries the SAME tokens as
  app.css (sky1/sky2/sea1-3/ink/gold/gold-deep/serif/sans), the body uses the same
  sky→sea vertical gradient, headings are Noto Serif SC, and primaries are gold with the student
  side's shadow treatment. ⚠️ The tokens are DUPLICATED, not shared — teacher.html is deliberately
  standalone and never loads app.css. If the school palette changes, change both files.
- Topbar became a frosted plate (matching the student 顶栏), tabs became gold-when-active pills,
  stat numbers became serif gold-deep, tables got hover rows.
- **出题设置 restructure:** mode-specific controls now sit inside a titled inset panel
  (`.cfg-sub`, e.g. 「词雨灵露设置」) that only renders for the selected mode, so they read as
  belonging to that mode rather than as more page-level controls. The show/hide logic itself already
  existed and was correct — the §2.2 complaint was really about visual grouping, so labels dropped
  their redundant 「词雨 ·」 prefixes now the panel is titled.
- Unit checkboxes moved into a scrollable `.scope-box` (they were a sprawling flat run of ~25
  inline labels).
- VERIFIED in-browser: sign-in screen and a stubbed 出题设置 panel both render correctly with the new
  identity; teacher.html's JS still parses (JavaScriptCore) and CSS braces balance. The live
  dashboard behind login still needs a real teacher account to eyeball.

## Session batch, 2026-08-13 (night) — 档案按钮移位 · 选项重洗泄题 · D2 句子注音上线

Owner asked for three things mid-session; all three are done and **verified in a real browser**
(the sandbox allowed `python3 -m http.server` this time, and the Browser pane accepted
127.0.0.1 — unlike the previous two sessions. Try it before assuming code-reading is the only
option available).

### 1. 我的档案 moved to the top-right (landing)
`.lp-greeting` was a big centred plaque at `bottom:24vh` sitting squarely on top of the pixel
climbers painted on the path. It is now a compact rounded pill in the top-right corner
(`right:1.6vw; top:14px; border-radius:999px`, avatar 30px, nickname clamped with ellipsis,
`flex-wrap:nowrap` so a long nickname can never grow it to two lines).
- ⚠️ **`.lp-couplet` now uses `top:max(12vh,78px)`.** At 12vh flat, the right couplet
  (书山有路勤为径) starts level with the pill on a short landscape screen — measured 5px clearance
  at 1024×600, i.e. a collision on anything shorter. The floor applies to BOTH couplets so they
  stay symmetric. Don't revert it to plain 12vh.
- Portrait override extended (`right:auto;top:auto` + slightly larger avatar/type) since the
  portrait block turns the pill back into a normal in-flow element.

### 2. 填空挑战 选项重洗 = 泄题 (real bug, fixed)
Toggling 拼音辅助 mid-question called `renderCloze`, which **redrew the distractors**. The correct
answer is the only option that survives a fresh draw, so a student could find it by toggling twice
and watching which word stayed. Switching difficulty had the identical flaw.
- New `clozeOpts(state, w, n)` draws the distractor pool ONCE per question at full width
  (`MAX_CLOZE_OPTS - 1`) and slices it, so widening ⭐⭐→⭐⭐⭐→⭐⭐⭐⭐ ADDS options to the same
  set rather than dealing a new hand. Cache key is `state.i + "|" + w.id` so a replayed round
  never inherits stale options.
- VERIFIED in-browser: four consecutive toggles gave an identical option list; d2 ⊂ d3 ⊂ d4;
  returning to ⭐⭐ restored the same pair; advancing to the next question drew fresh options.
- renderMcq was NOT affected (its rail carries no 拼音辅助 toggle — the toggle lives on the
  quiz config screen), but if a toggle is ever added to an MCQ rail, give it the same treatment.

### 3. D2a written + D2b built — 句子/释义注音 for G1/G2/G3
**The four JSONs now carry zhPy/clozePy for g1/g2/g3 (schemaVersion 2). HCL is untouched and
byte-identical to before (schemaVersion 1), by design.** Sizes: g1 156KB · g2 303KB · g3 415KB ·
hcl 326KB. `id_registry.json` is byte-identical to origin (no IDs minted).
- **Polyphone correction layer added to `generate_vocab_json.py`** (`fix_polyphones`), because the
  raw pypinyin output was wrong often enough to fail the doc's own gate:
  - **和**: 6 of 266 read huó/huò/huo. All were the conjunction. The cause is pypinyin reaching
    ACROSS a word boundary to form 暖和 / 和药 / 和面 out of 温暖+和+舒适 etc. A fixed-word table
    falls into the identical trap (米饭**和面**食), so the rule is now simply **和 → hé, always**.
    A future 暖和 must be fixed with a master-column override, not by relaxing this.
  - **得**: 233 occurrences split dé 172 / de 61, i.e. the structural-particle 得 (跑得快、变得更好)
    was being read dé most of the time. Now the default is 轻声 **de**, with whitelists for the
    fixed words that really are dé (`DE_HEAD` 得到/得以…, `DE_TAIL` 取得/获得/值得…), a 轻声
    3-gram list (`DE_TRI_LIGHT` 怪不得/舍不得…), and `DEI_HEAD` for the 必须 sense. Result:
    de 148 / dé 81 / děi 3.
  - `DE_TAIL_FINAL` (心得) only counts when 得 is followed by punctuation or ends the string —
    without that, 「担心得说不出话」 matches the false word 心得. Same class of bug as 和.
- ⚠️ **Two residual cases the owner should settle** (listed with full context in
  `local-admin/D2_多音字核对_和得.csv`, 和+得 every occurrence):
  1. 「他赢得如此漂亮」 → 赢得 is whitelisted dé, but here it is a complement and should be de.
  2. 「他脚受伤了，得__着绷带」 → should be děi, but the blank hides the verb so no rule can see it.
  Fix either with the master's optional 「释义拼音 / 例句拼音」 columns (whole-string override,
  beats every rule above and survives regeneration).
- **DATA FIX (的/得 typo):** G2-0599 探险 cloze was 「他**得**梦想是去南极__。」 → 「他**的**梦想」.
  Applied to the G2 Excel master AND regenerated, so master↔JSON stay synced. Found by the
  polyphone audit, not by reading.
- **Renderer (D2b):** `rubyText(text, py)` + `qHtml()` in app.js emit `<ruby>字<rt>音</rt></ruby>`
  per CJK char. It consumes one syllable per CJK character only — punctuation, Latin and the `__`
  blank pass through — and **returns null on any count mismatch** so a stale/edited sentence falls
  back to plain text instead of shifting every reading after the mismatch. Wired into
  renderCloze (填空句), renderMcq (释义 only — 英文翻译 stays plain), and 攀山竞速 `spPrompt`.
  `qCls()` adds `.has-py` only when ruby is actually present, so un-annotated layout is unchanged.
- ⚠️ **The JSON loader drops unknown fields.** `WORDS.push({...})` near the fetch copies an
  EXPLICIT field list; zhPy/clozePy had to be added there or they never reach the renderer. This
  cost a debugging round — remember it when adding any new word field.
- CSS: `.q-text.has-py/.sq-prompt.has-py{line-height:2.5}` for `<rt>` headroom, plus
  `ruby{margin:0 .07em}` / `rt{padding:0 .18em}` — without the side room adjacent readings run
  together (…为提供 → weitígōng).

### 4. 攀山竞速 landscape split was BROKEN (found while testing the above, fixed)
The `@media (min-width:820px) and (orientation:landscape)` row layout shipped last session had
never been run in a browser. `.sprint-canvas` had `flex:1 1 50%` but not `min-width:0`, and a
`<canvas>` carries its width ATTRIBUTE as an intrinsic minimum, so the canvas refused to shrink,
overflowed the row and pushed `.sprint-right` — **the question and the answer buttons** —
completely off-screen (measured: 1464px canvas inside a 1156px shell, `.sprint-right` at x=1533,
width 0). Worse, `resize()` then measured the overflowed box and wrote back an even larger width.
One line fixes it: `min-width:0`. Verified: canvas left, question + options right.

### Verification actually performed this batch
Real browser, `python3 -m http.server`, 1280×800 / 1024×600 / 375×812: landing pill position +
couplet clearance measured by `getBoundingClientRect`; G1 填空挑战 ruby + option stability +
difficulty nesting; G1 华文解释 ruby; G1 英文翻译 correctly plain; G1 攀山竞速 ruby + the layout
fix; G2 填空挑战 ruby; **HCL confirmed inert** (no toggle, no ruby, no option pinyin even with
`pyAid` forced true in localStorage). Zero console errors. JS parsed via JavaScriptCore, CSS
braces balanced, `generate_vocab_json.py --verify` still byte-identical for all four streams.

### Still outstanding after this batch
- 10 stale files on GitHub (ADMIN.md, check_consistency.py, 4× avatar_char_*.png, world.html,
  world_previous_unedited.html, three.min.js, three_min.js) — owner deletes via the web UI;
  confirmed no shipped file references any of them.
- The two 得 cases above, plus the older open items (成就墙 drill-in, per-game leaderboards,
  营地重制, cross-device recovery, 灵露 trickle decision).

## Session batch, 2026-08-13 (late night) — 顶栏昵称 + 排行榜扩展 v1

### 顶栏 我的档案 pill
The stream-page topbar avatar now carries the nickname beside it (`.tb-profile` is a pill:
`.tb-av` circle + `.tb-nick`, `max-width:min(42vw,240px)` with ellipsis so a long nickname can
never push the topbar wide). The duplicate 我的档案 chip under the stats bar (`profileHubBtn`,
was in `.home-foot`) is REMOVED along with its wiring — the topbar pill is now the only
我的档案 entry on a stream page. Under 520px the pill collapses back to the bare 36px circle so
the stream name keeps its room. Verified at 1280/375 incl. a deliberately over-long nickname.

### 排行榜扩展 v1 (DESIGN_排行榜扩展_周榜与游戏数据)
Owner resolved the doc's last open item (§5.3) on 2026-08-13: **词雨 gets NO extra wrong-answer
penalty — option (b), status quo.** Rationale recorded because it is better than the doc's own:
mashing in 词雨 is not risk-free, since every second spent spamming is a second words fall
unattended, and missed words already cost a life. The deterrent is indirect but real and stays in
the currency already on screen. 攀山竞速 keeps the locked 3s time penalty (D-1).

Built (app.js + firebase-init.js):
- **本周历练值**: `store.pts.week = {id, n}`, a single lazy-reset bucket (NOT a per-week map —
  a year of keys would bloat `scores/{uid}` for no ranking value). `currentWeekId()` returns
  **that week's SUNDAY as a date string** ("2026-08-16"), computed in UTC off `todaySG()`.
  ⚠️ Deliberately not an ISO week number: ISO weeks are Mon–Sun and would sit one day off the
  locked Sunday–Saturday boundary, invisibly. Reset happens at write time in `bankPts()`, same
  pattern as the per-day repeat cap — no cron, no Cloud Function. Read it through `weekPts()`,
  never `store.pts.week.n` directly, or a stale bucket from last week reads as current.
- **Two speed boards**, canonical-config only (D-2): `store.best.sprint90` written only when
  `sprintSecs === 90`, `store.best.rainRamp` only when `rainRamp` is on. The existing
  `store.best.sprint` / `.rain` stay as all-config personal bests. Both new keys ride the existing
  `store.best` max-merge in mergeCloudProgress for free. NOT added to the 进度码 meta (that is a
  fixed 5-field join — changing it would break every existing code).
- 词山风云榜 now has FOUR tabs (掌握词数 / 历练值 / ⛰️攀山竞速 / 🌧️词雨手速) and the 历练值
  sub-toggle gained 本周. Still sorted independently, still never summed.
- **词雨 accuracy instrumentation**: rain had NO `bump()` calls at all, so zero attempt data
  existed. `fire()` now calls `bump("rain", false)` on a non-matching submit and
  `bump("rain", true)` on a catch. Blank submits are still skipped (stray keystroke, not a guess).
  This is instrumentation only — the 打字准确率 board is deferred (§6) and will need a minimum
  sample size before anyone can rank on it.
- Firestore: `scores/{uid}.{stream}` gains `bestSprint90` / `bestRainRamp`; the week rides inside
  the existing `pts` map as a `week` key (term ids look like "2026T3", so no collision).
  ⚠️ **New composite indexes are required** for `orderBy` on `{stream}.bestSprint90`,
  `{stream}.bestRainRamp` and `{stream}.pts.week`. Firestore throws "requires an index" with a
  direct console link on the first query — create from that link. No rules change needed
  (same doc, same owner-uid-only write).

VERIFIED in-browser: four tabs render; 本周/本学期/累计 sub-toggle correct with headlines;
`currentWeekId()` anchors to Sunday across a year boundary (2026-01-01 → 2025-12-28) and splits
Sat 08-15 from Sun 08-16; 词雨 wrong submit recorded `{a:1,c:0}` and cost NO life, a correct catch
recorded `{a:2,c:1}`. Zero console errors. Both JS files parse (JavaScriptCore).
