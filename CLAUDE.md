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

## File structure (FOLDERED since 2026-08-14 — the old FLAT rule is retired)

⚠️ **This reverses the previous "FLAT — deliberately / do NOT introduce subfolders" rule.** The owner
asked for it on 2026-08-14: 83 files at repo root (61 of them PNGs) made the GitHub file list
unreadable. Code and entry points stay at root; assets and data moved down:

    /                 index.html · G1/G2/G3/HCL_index.html · teacher.html · voices.html
                      app.js · app.css · arena.js · profile.js · nickname.js · firebase-init.js
                      CLAUDE.md · README.md · firestore.rules · .gitignore
    data/             g1/g2/g3/hcl.json · id_registry.json
    art/bg/           landing_hero_bg · hero_bg · study_bg · rain_bg · sprint_bg · mountain_bg
                      · climb-wall-tile · bg-01..05
    art/badge/        badge_shkj/hx/gg/jj/whz            ← A层 里程碑 (1092px, 不透明白底)
                      badge_battle_{room,peer}_{gold,silver,bronze,champion}
                                                        ← B层 对战 (320px, 抠圆透明)
    art/avatar/       avatar_pet_* (4) · avatar_jtw_* (5) · avatar_zodiac_* (12)
    art/camp/         camp_bg · tent · gear_* (11) · deco_* (10) · pet_* (4) · linglu
    art/item/         consumable_* (7) · powerup_* (3)   ← 2026-08-14, system NOT built
    art/sprite/       sprite_g1/g2/g3/hcl_raw · tileset_raw   (8-bit art awaiting processing)
    archived_art/     the 13 garden-era PNGs cut by the 便携化 pass
    docs/             HANDOFF_*.md

Every reference was rewritten mechanically and verified: **61 distinct asset paths, zero missing.**
The four DYNAMIC stream-JSON fetches needed hand-editing and are the ones to remember if a new one
is ever added — `app.js fetch("data/"+STREAM+".json")`, `arena.js fetch("data/"+stream+".json")`,
and TWO in `teacher.html`. A bare `"foo.png"` anywhere in code is now a bug.

⚠️ **Deploying this is not a normal upload.** The GitHub web UI cannot move or bulk-delete, so
re-uploading alone would leave all 66 old files sitting at root as duplicates while the new folders
appear beside them — the site would still work (paths resolve) but the clutter would double. The
practical routes are (a) push from the local clone with git, or (b) delete the 66 root files by hand
in the web UI first, then drag the new folders in. See the session note at the end of this file.

**Also corrected 2026-08-14:** the five raw sprite/tileset PNGs this file has always listed as repo
files were **never actually in the repo**. Nothing references them so nothing was broken, but they
existed only in the owner's Downloads. They are now committed under `art/sprite/`.

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

## 营地场景 (campsite) — v1 BUILT 2026-08-13, **SUPERSEDED 2026-08-14 by 便携化改版 below**

⚠️ READ THE 便携化改版 SECTION FIRST (「营地 v2 · 便携化」, further down). The catalogue, the
dwelling chain, the placement model and the shop in THIS section were all replaced on 2026-08-14.
What still holds from here: `camp_bg.png` + the `.camp2-*` scene pattern, the graceful-degrade
`onerror` habit, the pet cluster, and the render-then-tune-by-eye method. Everything about WHICH
items exist and HOW they are positioned is now wrong — do not build from it.

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

## 教师后台视觉对齐 · 2026-08-13 (TEACHER_HTML_VISUAL_BRIEF)

Follow-up to §2.2 (which fixed the palette but used **no image assets**, which is why the page
still read as a generic admin panel). Per `~/Downloads/teacher_html_visual_handoff/`. Zero new
art — every image already ships in the repo. All three changes are inside teacher.html's own
`<style>`/markup; it still never `<link>`s app.css (standalone by design).

- **登录/审批屏 = full-bleed hero**, the same recipe as `index.html`'s `.lp-hero`: the body IS
  `landing_hero_bg.png` at `center/cover` (+ `image-rendering:pixelated`) and the sign-in card
  floats on it (`rgba(255,255,255,.93)` + `backdrop-filter:blur(6px)`). Not a banner strip.
  Driven by a `body.gate` class: `hideAll()` ADDS it, `showSignedIn()` removes it, and the
  markup ships with `<body class="gate">` so the pre-auth frame is already correct. So the
  sign-in, 待审批 and 注册 screens get the hero; the dashboard never does.
  - `.top` is hidden under `.gate`, so a new `.gate-crest` block (badge_hx.png ring +「教师后台」
    + subline) replaces the plain `<h1>`, and `#gateWho` mirrors `#whoami` — otherwise the
    待审批/停用 screens would lose the signed-in email that lives in the topbar.
  - Crest sits at the TOP of the hero, not centred with the card: the sunrise band mid-image is
    near-white and washed the light text out (measured by eye at 800×450 and 1280×800). The sub
    also carries a double shadow, same trick as `.lp-couplet`.
  - Layout uses **auto margins, never `justify-content:center`** — a centred flex child clips at
    the top edge when it overflows, and the 注册 pane is 691px tall on a 1024×600 Chromebook.
    Verified: crest top stays at +24px and the page scrolls instead of cutting off.
- **仪表板 = the study ambience app.css already gives every student page**: the
  `linear-gradient(rgba(246,250,253,.5) …), url("study_bg.png")` one-liner copied verbatim, so
  all seven tabs inherit it with no per-tab work. Deliberately NO `applyAmbience()` / `bg-01..05`
  rotation — the teacher backdrop never changes with mastery. The old sky→sea gradient is kept
  as the BOTTOM background layer, so a missing PNG degrades to the previous look. Cards are
  opaque `var(--card)`, so the image only shows in the gutters; table contrast is untouched.
- **概览 stats → `.harbour`**: the flat pale-blue `.stat` blocks are gone (CSS deleted, not
  orphaned), replaced by app.css's deep-sea glass bar with gold serif numerals. Each category
  carries an existing badge as a plain icon — 学生 shkj · 教师 jj · 家长 gg · 公众 whz, 总档案数
  badge_hx — via `CAT_BADGE` + `harbourCell()`. **These badges carry no achievement meaning
  here, they are just category art.** 未填写 has no badge and renders `.hb-icon.none`
  (`visibility:hidden`) so the row's baselines stay aligned. `.top` also gained a 36px `.crest`.
- Every `<img>` added has an `onerror` that hides its ring/slot, per the repo's graceful-degrade
  habit — a 404 never shows a broken-image icon.
- **VERIFIED in a real browser** (`python3 -m http.server` + the Browser pane on 127.0.0.1 —
  this works, try it before falling back to code-reading): login hero at 1280×800 / 1024×600 /
  375×812; register pane on a short screen scrolls without clipping (measured with
  `getBoundingClientRect`); dashboard stubbed signed-in shows the harbour + badges + crest with
  the study_bg gutters and fully readable tables. Zero console errors, JS parses (JavaScriptCore),
  CSS braces balance 67/67.

## 英文提示淡出 + 动线编号 · 2026-08-13
（DESIGN_english-toggle-fading-and-flow-numbering_2026-08-13.md，四个决定全部实作）

Grade 2 trial surfaced two DIFFERENT problems that need different mechanisms: students who
cannot decode the Chinese button labels (needs a scaffold that FADES), and students who don't
know what order to press things in (interface literacy, needs no fading). Both are built.

### 决定一 · G1/G2 英文提示 toggle (app.js + app.css)
- **Scope is navigation/button SHELL TEXT ONLY.** `EN_LAB` (app.js, ~34 entries) is the whole
  surface: 修行/闯关/学习挑战/词语闪卡/出发/题型/题数/难度/开始… Quiz CONTENT — 题干、释义、
  句子、选项 — stays pure Chinese whether the toggle is on or off. This is the same immersion
  logic as the Chinese-only TTS rule, and it is exactly why the toggle can't really weaken
  中文沉浸. **Do not extend `enl()` to word data.**
- **Mechanism: the gloss spans are ALWAYS in the DOM, CSS-gated on `body.en-aid`.** So toggling
  is one class flip — no re-render at all. That matters beyond performance: unlike 拼音辅助,
  flipping it mid-question cannot redraw anything (see the 选项重洗=泄题 bug from the earlier
  batch — this design is immune to that class of bug by construction).
  `enl(key)` = block gloss under a label · `enli(key)` = inline gloss for one-line buttons.
- `store.enAid`, **default OFF, persisted per device**, exactly the `store.pyAid` contract
  (a different rule would make the two aids feel inconsistent, and the content is unaffected
  anyway so the permanent-crutch risk is low). G1/G2 only (`enAidAvailable()`); on G3/HCL
  `enl()` returns "" so not one byte of English markup is emitted.
- **Control is the icon pill 中/EN in the topbar** (`.tb-en`, `enToggleHtml`/`wireEnToggle`),
  never a Chinese word — a student who can't read the interface must still be able to find the
  thing that fixes that. It sits in `.tb-right` (now `display:flex`) next to the 我的档案 pill and
  shrinks under 520px. 隐私: device-local, never on any leaderboard or badge wall.
- NOT on the landing page (index.html doesn't load app.js and the store is per-stream), and NOT
  inside the 结伴登峰 overlay (arena.js has its own labels). Extend later if asked.

### 决定二 · 淡出 soft-prompt
- 有效 session = this page-load with **≥1 question answered**; counted in `bump()` (every mode's
  answers route through it), once per load, guarded by `_enSessionCounted`.
- Fires when the toggle has been ON for the last 5 effective sessions; shown from `renderHome()`
  so it lands between rounds, **never on the boot render** (a student who just opened the app
  has not "seen enough"). Cooldown 10 sessions, cap 2 per term (`currentTermId()`), once per load.
  Accepting turns it off; re-enabling costs nothing and can't re-trigger a prompt inside the
  cooldown, because the cooldown is stamped when a prompt is SHOWN, not by its outcome.
- ⚠️ **The four numbers (5 / 10 / 2 / 5) and the copy are launch DEFAULTS** —
  `EN_FADE_SESSIONS`, `EN_PROMPT_COOLDOWN`, `EN_PROMPT_TERM_CAP`, `EN_REGRESSION_RUN` sit
  together at the top of the EN block. Design-doc open items 1 and 3 (exact wording/tone and
  whether these are final) are still the owner's to settle.

### 决定三 · Fading 遥测 (app.js `store.enTel` + teacher.html)
- Shape is the doc's, plus `promptTerm`/`promptTermCount` (the doc's single `promptCount` can't
  express a per-TERM cap) and `regressionAt`. localStorage is the source of truth; merged into
  Firestore inside the ordinary progress doc, so the teacher side needed no new collection.
- `mergeCloudProgress`: counters by max; the rolling window is taken WHOLE from whichever record
  has more sessions (it's a sequence, not a counter — interleaving two devices would be
  meaningless). **`store.enAid` itself is deliberately NOT merged** — a student may reasonably
  want English on the classroom Chromebook and off at home. **Not in 进度码** (telemetry, not
  transferable progress), asserted by a test.
- 回退旗标: set when the toggle goes back ON after 5+ consecutive OFF sessions, shown to the
  teacher separately (a rolling average would quietly absorb it) and expiring after 10 sessions.
  Framed as "worth a look", not as backsliding — it usually means a harder unit.
- teacher.html 班级视图 shows this as **two columns** (SPLIT 2026-08-13 by the per-header filter
  work below, which needs one filterable value per column): **英文提示** = the 开/关 pill, and
  **提示趋势** = 已关闭 / 下降 / 持平 / 上升 / 观察中 / 数据不足, with the 回退 flag folded into
  the 趋势 value (`enTrendVal`) so it stays findable in that column's filter list. `enCell` is gone;
  it is now `enStatus` + `enTrendVal` + the two columns' own `cell` functions in `classCols()`.
  `enTelOf()` still reads only g1/g2 and takes the busier of the two. ⚠️ `EN_TREND_DELTA = 0.4`
  (a 2-in-5 swing) is a launch default — the doc requires recalibration after one real term, same
  as the 段位 ladder.

### 决定四 · 动线编号
- `stepNo(n)` gold numerals, permanent and small, on genuinely multi-step decision flows only:
  home ①复习范围 ②选择方式 ③今日路线/词语游乐场; 学习挑战 config ①题型 ②题数 ③挑战难度;
  攀山竞速 ①题目类型 ②冲刺时长; 词雨灵露 ①速度模式 ②下落速度.
- **Numbering restarts per SCREEN** (each screen is a self-contained set of choices), and
  **optional aids are never numbered** (学习支援/拼音辅助 are not steps). Excluded entirely, per
  the doc: 排行榜 · 成就墙 · 我的词山 — destinations with no correct order; numbering them would
  teach students the numerals mean nothing.
- `diffSelector(stepN)` takes the numeral as an ARGUMENT because the same function also draws the
  mid-round rail, where a step number would be meaningless. Same trap in 词雨: `syncSpeedEnabled`
  rewrote `#speedLbl` with `textContent`, which would have wiped both the numeral and the gloss —
  now `innerHTML` with both re-emitted.

### Verification
No live browser this time: the Browser pane refused BOTH `127.0.0.1` and `localhost` by policy
(unlike the previous batch — it varies by session, so try it first). Instead app.js was loaded
FOR REAL inside JavaScriptCore with a stubbed DOM/localStorage and `boot()` replaced by an export
hook (`src.replace("  boot();\n})();", …)` — this pattern works well, keep it), giving:
- 34 assertions on the data layer: defaults, session counting (one per load, only after an
  answer), 10-item window cap, eligibility (5-run / broken run / toggle-off / cooldown / term
  cap / not-before-a-round / not-twice-per-load), prompt bookkeeping, cloud merge in both
  directions, and 进度码 exclusion.
- 21 assertions on real rendered markup: every step numeral and gloss on all three config
  screens, 学习支援 unnumbered, the 递增-mode label rewrite keeping its numeral, and **G3 proven
  inert** (no `enlab` anywhere, no 中/EN control, but the numbering still present).
- 14 assertions on teacher.html's real `enTelOf`/`enTrend`/`enCell`, including the full 趋势 table
  and that a 1-session wobble does NOT flip the label.
- All JS parses (JavaScriptCore), CSS braces balance 611/611 + teacher 69/69.
⚠️ **Still wants a device pass before class** — the 中/EN pill in a crowded topbar on a phone, and
the two-line button labels on the home cards, are layout claims no headless check can settle.

## teacher.html 表格可用性 · 2026-08-13 (空间利用 + UID 栏 + Excel 式表头筛选)

Owner request, three parts. All inside teacher.html's own `<style>`/script (still standalone —
it never loads app.css/app.js/profile.js).

### 1. 空间利用
- `.wrap` was `max-width:1180px`, which left half a 1920px screen empty on the very tabs that
  exist for wide tables. Now `min(1720px,97vw)`. `.signin` keeps its own narrow max-width, so the
  login hero is untouched.
- `.harbour` switched from `justify-content:center` to `space-evenly` (centred cells pooled in the
  middle of a now-wider bar).
- 概览 was ONE 2-column table stretched across the full width. Now a `.grid2`
  (`auto-fit,minmax(380px,1fr)`) holding **按学校** and a NEW **按班级 Class（学生）** count,
  each row carrying a `.bar` share bar. 按班级 counts `category==="student"` only — the field is
  cleared for everyone else, so counting all profiles would invent a 未填写 bucket.
- 班级视图's table moved into `.tbl` (its own scroll box, `max-height:calc(100vh - 330px)`) with
  `position:sticky` headers. ⚠️ Sticky headers need an OPAQUE background; `.card` is translucent
  (`rgba(255,255,255,.94)`), so `.tbl thead th` sets a solid `#F3F8FC`. Don't "simplify" that back
  to transparent or rows will show through the header.

### 2. 识别码 (UID) column
First column of 班级视图: first 8 chars in a `<code>` (full value in `title`) plus a 复制 button
that copies the WHOLE uid (`copyUid()`, `navigator.clipboard` with an `execCommand` fallback for
non-secure origins). 8 chars because the student's own 我的档案 shows 6 — enough to eyeball a
match — while 处理/Firestore console need the full string.

### 3. Excel 式表头筛选 (the substantive change)
- 班级视图 is now driven by a **declarative column model**, `classCols()`: each column declares
  `raw(u)` (used for BOTH sorting and filtering) and `cell(u)` (HTML). Adding a column = adding one
  entry; the filter UI is generic and needs no per-column work.
- Four filter types: `list` (distinct values + search + checkboxes, Excel's default) · `text`
  (contains — used for 识别码, where a 160-item checklist would be useless) · `num` (min/max) ·
  `date` (min/max; `lastActive()` returns ISO `YYYY-MM-DD`, so plain string compare is
  chronological and no Date parsing is needed).
- State is `_colF` (key → filter). It REPLACED `_classFilter` and the two 学校/班级 `<select>`s.
  `filteredUsers()` walks every column, so **词语难点 automatically aggregates over the same
  filtered cohort** — both tabs can never disagree about who is in scope.
- Header = a clickable `.th-lab` (sort) plus a SEPARATE `.fbtn` ▼ (filter). Deliberately two
  targets: the whole `<th>` used to be the sort handler, and hanging a filter control inside a
  click-to-sort element is the same near-miss trap the 可及性 pass fixed for the MCQ 🔊 buttons.
- The dropdown is appended to `<body>`, never inside `.tbl` (whose `overflow` would clip it), and
  positioned off `getBoundingClientRect` + `scrollY`, clamped to the viewport's right edge.
- Edits are held in the dropdown until **应用**, because applying calls `renderPanel()` and would
  otherwise tear the dropdown down under the teacher's finger on every checkbox tick.
- Distinct values come from ALL loaded profiles, NOT the currently-filtered set: values vanishing
  from the list as you filter another column is the most confusing part of cascading filter UIs.
- 全选/清空 inside a list act on **what the search currently shows** (Excel does the same), so
  "search 3HC → 全选" selects a whole class group in one step.
- Every active filter renders as a `.fchip` above the table (on 词语难点 too) with its own ✕ plus
  清除所有筛选 — a filter can never be silently in effect.
- Ticking every value = no filter (the key is deleted), so an all-ticked column never shows a chip.
- 学校 now displays the CANONICAL school name (the same `canonSchool()` folding 概览 uses) so the
  filter list has one entry per school instead of one per typo; what the student actually typed
  stays in the cell's `title` for the HOD to correct.

### 验证
**No browser run was possible: the Browser pane blocked BOTH `127.0.0.1` and `localhost` this
session** (it worked in the previous one — it varies, so try it first before falling back). Also
no Node, no Chrome (only Safari) on this machine.
What WAS done instead: the page's REAL script was loaded into JavaScriptCore against a purpose-built
tree-aware DOM stub (`innerHTML` parsing + class/id/attribute/descendant `querySelectorAll`), with a
`window.__T` export hook appended to the IIFE — the same trick the EN-fade batch used on app.js.
**53 assertions, all passing**, against genuinely generated markup: column model; UID truncation +
full-uid copy button + the 已复制 confirmation; 12 sort labels and 12 filter buttons; sticky `.tbl`
box; canonicalised 学校 cell; numeric sort order; list filter end-to-end through the real dropdown
(distinct values, counts, apply, narrowed row count, chip, highlighted ▼); two filters stacking;
per-chip and clear-all removal; num/text/date filters; in-dropdown search + search-scoped 清空;
the two 英文提示 columns and their filter values; 词语难点 sharing the filter state; 概览 grid +
按班级 counts. JS parses; CSS braces balance 102/102.
⚠️ **This proves behaviour, not layout.** Still wants a real device pass for: the 12-column table
on a 1024×600 Chromebook (horizontal scroll inside `.tbl`), sticky-header rendering, the dropdown's
right-edge clamping near the last column, and `max-height:calc(100vh - 330px)` on a short screen.

## 营地 v2 · 便携化改版 · 2026-08-14 (随身装备 / 地貌景观 / 自由摆放)

Built from `DESIGN_营地_随身装备与自由摆放.md` (owner-approved). **Supersedes the 2026-08-13
营地场景 section** for the catalogue, the dwelling chain, placement, and the shop. app.js +
app.css only; no JSON, no rules, no Firestore change.

**The reframe.** The camp is now two systems that behave differently on purpose:
- **随身装备 GEAR** — player-owned, bought with 灵露, **one equipped per slot**, freely draggable.
- **地貌景观 SCENERY** — belongs to the LOCATION. Appears by 海拔, never bought, never dragged.
  Clutter is structurally impossible here because the system controls it, not accumulation.

The rule behind every catalogue decision: **if a hiker would not carry it up the mountain, it is
scenery or it is cut.** That is what makes the old garden shop wrong — a backpacker does not dig a
koi pond at 800m.

### Owner decisions taken this session
- **营旗 CUT ENTIRELY** (doc §2e was an open question). The sprite never matched the pixel-art gear
  style. Removed from the catalogue; `deco_flag.png` archived, not deleted.
- **The tent drags too** (doc §4 open question — fixed anchor vs consistency). Consistency won, so
  `placedItems()` includes the dwelling and there is no special-cased anchor anywhere.

### Assets
- **13 files moved to `archived_art/`, NOT deleted**: deco_well / garden / bamboofence / pavilion /
  bridge / koipond / stonelantern / waterjar / bookchest / teatable / flag, tent_cabin, tent_tower.
  This is the ONE exception to the flat-file-root rule (nothing references them any more). They
  were still untracked locally, so nothing needs deleting on GitHub.
- **11 new `gear_*.png`** from the delivery zip. They arrived alpha-cut but with **magenta edge
  fringing** (93% of contaminated pixels sat on the alpha boundary) at ~1000px / ~1MB each. Ran the
  repo's documented pipeline — min(R,B)−G signature + despill ramp, re-trim, LANCZOS to max 400px —
  giving 84–191KB each, in line with the existing deco art. **Verified by compositing the real PNGs
  onto camp_bg.png and looking at it** (full loadout, mid-game, and sparse), not by trusting the
  numbers. Re-run that render if the art is ever regenerated.
- ⚠️ The folder the owner first attached (`campsite_assets/`) contained **no campsite art at all** —
  all 7 files were byte-identical to files already in the repo (the four sprite_*_raw, tileset_raw,
  study_bg, hero_bg). The real assets came in `营地重制_交付包/campsite_gear_assets.zip`.

### Data model (app.js loadStore)
- `store.deco` — items OWNED. **Never pruned**: an archived key stays in the store so a
  pre-便携化 purchase can still be refunded if it ever comes to that.
- `store.equip` — slot → key, one equipped item per slot. NEW.
- `store.decoPos` — key → {x,y} percent. NEW. `整理营地` just clears it.
- All three are localStorage-only in the same sense the rest of the camp fields are: they ride to
  Firestore inside the whole-store `saveProgress` write, and are NOT in mergeCloudProgress or 进度码.
- **Legacy `cabin`/`tower` keys are still honoured by `dwellingTier()`** so anyone who bought a 木屋
  under the old shop keeps an equivalent tier instead of silently losing 800 灵露.

### Slots (§3) and what fills them
住所 (tent → gear_tent_windproof → gear_tent_alpine, still a TIER CHAIN, not a free swap) ·
照明 (灯笼串 / 提灯 — the first slot with a real either-or) · 探勘 (望远镜 / 罗盘架) · 饮水 (水壶架) ·
收纳 (行军木箱) · 起居 (折叠椅) · 茶点 (野餐垫茶具) · 炊事 (野炊炉) · 干粮 (干粮袋).
Single-item slots exist NOW so the wider portable range the owner wants later drops in with no
refactor. 篝火/风铃/猫/木牌路标 stay **unslotted** (§2c) — small, cheap, iconic, always out.

⚠️ **PRICES for the nine new gear items are MINE, not the doc's** (it specifies none). They follow
the existing 20–1000 scale and inherit from the archived equivalent where one exists (行军木箱←书箱
120, 野餐垫←木桌椅茶具 150, 水壶架←水缸 35→60). Single numbers in `GEAR`, trivial to retune —
flagged exactly like the old C-tier pricing was.

### 自由摆放 (§4)
- Pointer events (one code path for mouse/touch/stylus). **`touch-action:none` on `.camp-move` is
  required** — without it a touch drag scrolls the page instead of moving the item.
- No press-and-hold gate: cosmetic action, not a quiz answer, so the `dwellGate` rules deliberately
  do not apply here.
- Drops are clamped to a ground band (`POS_BOUNDS` x 3–97, y 60–99) so nothing can be parked in the
  sky or on the painted peaks. Z-order is derived from y live during the drag (`zFor`), so an item
  dragged forward really does draw in front.
- A tap that never moves does NOT rewrite the position (guarded by `drag.moved`).
- `整理营地` resets positions to the §6 starter layout after a confirm dialog that says plainly that
  nothing owned is lost.

### Scenery thresholds (§5)
青松 15% · 樱花树 35% · 望山台 50% · 红枫 60% · 悬泉飞瀑 80% of the stream's word count, via the
same `sceneryUnlocked()` math the old `prestigeUnlocked()` used. ⚠️ The three tree percentages are
the doc's PROPOSED values, flagged there for the owner to adjust.

### 验证
**No browser again** — the Browser pane blocked 127.0.0.1 and localhost this session too, and there
is no Node/Chrome on this machine (only Safari). Instead: the REAL app.js was loaded into
JavaScriptCore against the DOM stub, using the documented `boot()` export-hook trick, and driven
through **57 assertions, all passing** — catalogue shape (no 营旗, no archived garden item, trees
moved to scenery), equip exclusivity and slot swapping, the dwelling chain INCLUDING the legacy
cabin/tower keys, position defaults and out-of-bounds clamping, scenery unlocking at 0/40/100%
mastery, camp markup (tent draggable, scenery NOT draggable and carrying no data-key), a simulated
pointer drag persisting to localStorage and surviving a re-render, tap-without-move not moving
anything, 整理营地 clearing positions while keeping ownership, and the whole shop flow
(grouping, 兑换 → auto-equip, 装备 swap, affordability, tier gating). Plus: every referenced PNG
exists, app.js parses, CSS braces balance 620/620.
⚠️ **Layout and touch feel are NOT proven.** Wants a device pass: dragging with a finger on an iPad,
whether 400px sprites look right on a 1024×600 Chromebook, and whether the ground band feels correct
at the stage's real aspect ratio.

### Not done (correctly, per §7)
New 营旗 art · whether 照明 needs more than two options · pet-follow / walking avatar (still deferred).

## 灵露经济 + 词雨 progressive · 2026-08-14 (DESIGN_economy_pricing_2026-08-14.md)

⚠️ **The doc's §4 was already done.** It asks Claude Code to clean 水井/菜园/竹篱笆/小亭/小石桥/
锦鲤池 out of `SHOP_A/B/C` + `CAMP_LAYOUT` and move 青松/樱花树/红枫 to altitude unlocks — all of
that was completed EARLIER THE SAME DAY by the 便携化改版 (section above). §4 describes a code state
that no longer exists. Nothing was re-done.
⚠️ **§4.3 CONTRADICTS the 便携化 doc and was NOT followed.** It lists 营旗/石灯笼/水缸/木桌椅茶具/
书箱 as "保留不变", but the owner cut 营旗 outright on 2026-08-14 and 便携化 §2a archived the other
four. They stay archived. If they are ever wanted back, that is a new decision, not a revert.

### 灵露 award engine (§1) — the real new work
`灵露 = LINGLU_BASE × tier × pinyin × decay`, on correct answers only, computed at the same call
sites as 历练值 and living right beside it in app.js. Keep the two straight: **历练值 rewards effort
and streaks (depth); 灵露 is spending money.**
- **Tier (§1.1):** 闪卡 0.5 · MCQ 1 (填空/华文解释/英文翻译) · 攀山竞速 1.25 · 组词 1.5 ·
  汉兜/词雨/打拼音 2. An unknown mode earns nothing rather than defaulting to 1.
- **拼音 modifier (§1.2):** ×0.65, **typing modes only** (`LINGLU_TYPED`). MCQ is untouched —
  seeing pinyin barely changes a recognition task.
- **Decay (§1.3):** 100 / 50 / 25 / 10%, floored at 10% so it never reaches zero. Counted in
  `store.wins`, keyed by **word TEXT**, so it is shared across every mode. NOTE: that gives
  cross-stream sharing only if the stores are unioned — this counts within the current stream's
  store. A true cross-stream union would need the same load-time pass mastery carryover uses.
- **待巩固 复习补偿:** a word sitting in any `gymTodo` climbs one decay band when recovered.
  ⚠️ This is why `awardLingLu` MUST be called **before `gymNote()`** — gymNote clears the word from
  待巩固, and calling it first silently loses the compensation. All six call sites are ordered
  correctly; keep it that way if you add a seventh.
- **打拼音 now earns 灵露** (tier 2 + the modifier) while still being 练习不计分 for 历练值 and
  海拔. Effort currency and learning credit are deliberately different things. This is a change from
  the 2026-08-13 note that pinyin mode awards nothing at all.
- `awardLingLu(w, mode, defer)` — `defer` is 词雨-only: the run collects into the barrel and banks at
  game over, so the wallet must not tick mid-round. The wins counter still advances immediately, or
  a word caught twice in one round would not decay.

⚠️ **`LINGLU_BASE = 10` is MINE — the doc gives the formula but no base_rate.** Derived from its own
anchor «1 session ≈ 30 灵露 at steady state»: a 修行 session is 20 questions at tier 1x, and by then
most words sit in the 25%/10% bands (~0.15 avg), so 30 / (20 × 0.15) ≈ 10. 词雨 generates far more
than 30/session because a round has far more correct answers than 20 — intended; the decay curve is
what reins it in. **The doc asks for re-calibration from real Firestore data after 3–4 weeks; this
single number is the dial.**

### 词雨 progressive-only (§2)
The 8-step `RAIN_SPEEDS` table and the 固定/递增 toggle are GONE, student side AND teacher side.
- One course: `rainCfgAt(playedS)` lerps fall 12→62 px/s and spawn 5600→2000 ms over
  `RAIN_RAMP_SECS = 90`. Those five constants are the tuning surface the doc asked for.
- Ramp is driven by time **PLAYED** (`playedS`), not wall clock, so pausing to think never makes the
  next drop faster. Every round restarts from base — no cross-round persistence, exactly as §2 asks.
- `store.rainSpeed` / `store.rainRamp` retired; old values may linger in a student's store, nothing
  reads them. The 拼音辅助 control is now the only one left and is deliberately **NOT numbered** —
  CLAUDE.md's own rule says optional aids are never steps.
- **Leaderboard semantics changed:** `store.best.rainRamp` used to be written only for 递增 runs (to
  stop farming on an easy fixed speed). Every run is the same progressive course now, so every run is
  rankable and the board's blurb was rewritten to say so.
- arena.js carries its OWN copy of the ramp constants (`AR_*`), because arena is deliberately isolated
  from app.js — **retune both together**. It ignores `cfg.speed`/`cfg.ramp` on rooms created before
  today. teacher.html's 词雨 panel now shows a one-line explanation instead of the two pickers.
- ⚠️ **生命 stays at 5, not 3.** §2 says "生命固定 3 条（维持原决定）", but 3 is the pre-2026-08-12
  value: `RAIN_LIVES` was raised to 5 in response to student trial feedback (G-2, "too punishing").
  The doc reads as restating an old state rather than re-deciding, so lowering it would silently undo
  a change made from real student feedback. **Left at 5 — owner to confirm.**

### 定价 v2 (§3.3 / §3.4)
Doc anchors applied exactly: 防风帐篷 **135**, 高山帐篷 **450**, 帆布帐篷 free, 小摆件 in the
**45–75** band (木牌路标 45 · 风铃 45 · 打盹的猫 60 · 篝火 75).
⚠️ **Mid gear is priced by ME** — §3.4 explicitly defers it to "最终装备槽分组" and gives no numbers.
They sit on a ladder between the 小摆件 band and the top tent, so nothing costs more than 高山帐篷:
干粮袋 95 · 水壶架 90 · 折叠椅 110 · 提灯 120 · 行军木箱 150 · 野炊炉 170 · 灯笼串 180 ·
野餐垫茶具 190 · 罗盘架 200 · 望远镜 240. Retune freely — single numbers in `GEAR`.

### NOT built: §3.2 词雨 consumables
The eight single-round items (提灯/羽扇/锦囊/定风珠/护身符/灵露瓶/玉葫芦/双倍灵露符) are **priced but
do not exist** — there is no consumable mechanic, no inventory, no in-round use UI, and no art for any
of them. §3.2 gives prices for a feature that has never been designed or built, so pricing was all
that could be applied, and applying prices alone would have been meaningless. Also flagged:
**「提灯」 collides with the 随身装备 提灯 (`gear_lantern.png`) shipped today** — one of the two needs
renaming before the consumable is built.

### 验证
Browser pane blocked localhost again; ran the real app.js in JavaScriptCore against the DOM stub.
**34 new economy assertions + the 57 camp assertions, all passing**: the full tier ladder, the
100/50/25/10 decay sequence with its floor, cross-mode sharing of the per-word counter, 待巩固
compensation lifting exactly one band (and never above 100%), the 拼音 modifier applying to typing
modes ONLY, deferred 词雨 banking, the ramp at 0/45/90/999s incl. negative input, and every price
anchor plus the ladder invariants. app.js / arena.js / teacher.html all parse.
⚠️ Unproven without a device: how the ramp actually FEELS. `RAIN_RAMP_SECS = 90` is a guess at the
curve the doc left to feel-testing — play a full round before class and adjust the five constants.

## 同伴挑战 · PK对决 — §3 layout BUILT 2026-08-14, room system BLOCKED on §5

Source: `DESIGN_peer_pk_duel.md`. The doc's §5 lists **7 open decisions marked "needed before
implementation"**, none of which are resolved, so the PK room itself is NOT built. What WAS built is
§3, which is fully specified, benefits solo play immediately, and is needed whichever way §5 lands.

### §3 词雨灵露 landscape split (DONE, applies to SOLO play too)
- `.rain-shell` becomes a row at `≥900px + landscape`: falling area left (62%), a new `.rain-right`
  column (38%, max 420px) holding HUD + room code + typing input. Below that it stacks as before.
- The input used to run full width UNDER the falling area and take vertical space from it; its own
  column hands that height back to the words and gives the PK room code a permanent home that is
  **not** a banner over the gameplay.
- `min-width:0` on both flex children — the same load-bearing line the 攀山竞速 split was missing
  when it shipped untested and pushed the question off-screen. Do not remove it.
- **Room code is FIRST in the DOM**, then moved into the right column by `order:-1` in landscape.
  That ordering is deliberate (§3): in portrait the stack pins it at the very top, where it is
  glanceable on a reconnect, instead of trailing after the canvas below the fold.
- `startRain(showPy, roomCode)` — solo passes nothing and the element is not rendered at all.
  This is the only PK-facing hook that exists so far.

**Pacing retune (§3 flags it):** rather than guess new constants blind, both knobs are now DERIVED
from the area's measured box — crowding (`maxLiveNow()`) scales with WIDTH, fall speed
(`fallScale()`) with HEIGHT against a `RAIN_REF_H = 520` reference. So a word takes the same TIME to
reach the sea in any layout. **Without the height term the split would have quietly made the game
easier**, since the landscape area is taller — exactly the drift a "just resize it" change causes.

### Locked decisions recorded (not yet code)
Host plays as a normal player (no observer row) · min 2, recommended 6, hard cap 8 · room code
visible through `running`, not just `lobby` · **reward is a cosmetic 对战徽章 only** — a PK win
must never touch 历练值/海拔/灵露, or PK becomes a shortcut around the mastery gate that rewards fast
typing over knowing the word. The battle badge needs its OWN art track and must never mix with the
five locked progression badges (shkj/hx/gg/jj/whz).

### ⚠️ BLOCKED — do not build the room until these are answered
§5.1 word pool source · §5.2 win condition · §5.6 late-join vs reconnection-only (the doc itself
demands explicit sign-off) · §5.7 cross-class visibility. §5.4 badge tiering needs an art brief.
Safe defaults assumed and NOT asked: §5.3 join by typed room code only, §5.5 no loss consequence
anywhere outside the room.

### 验证
12 assertions against the real `startRain` — solo renders no code element, HUD and input both move
into the right column, area precedes it in the DOM, a PK code renders and is escaped and sits first
in the shell, and both pacing knobs scale/clamp correctly. app.js parses, CSS braces 632/632.
⚠️ **The split itself is a layout claim and is unverified in a browser** — the last two splits in this
repo (攀山竞速, and the 词雨 keyboard fix) both had real bugs that only a real viewport exposed. Open
词雨 on a landscape iPad before class.

## 同伴挑战 · PK对决 — BUILT 2026-08-14 (student-hosted duel)

Owner resolved four of the seven §5 opens on 2026-08-14; the room is built on those answers.
Files: arena.js (room + host path), app.js (setup screen + entry pill), app.css, firestore.rules.

### Owner decisions
| § | Decision |
|---|---|
| 5.2 win condition | **Fixed time, most correct.** Ties broken by time spent answering. |
| 5.1 word pool | **Host picks it for everyone**, using the same 复习范围 they use for their own revision. |
| 5.6 late join | **Reconnection only.** An existing player may come back; a new player is told to wait. |
| 5.7 who can play | **Anyone with the code** — any 身份 (学生/老师/家长/公众) and **ANY stream**. A form class holds mixed subject levels and they want to play together; may also become a family game. |
Defaults assumed, not asked: §5.3 join by typed code only · §5.5 no loss consequence anywhere.

### Two blockers the design doc did not anticipate (both from 5.7)
1. **Students could not create rooms at all.** `firestore.rules` had
   `allow create: if isTeacher()`. Now create/update/delete pass if you host the room AND
   (`isTeacher()` OR `pk == true`). A student can only ever set `pk:true`, so they cannot forge a
   teacher-style room; a teacher room still requires the allowlist. ⚠️ **MUST BE RE-PUBLISHED** or
   开一个房间 fails with permission-denied. The owner's copy at `Documents/VocabSummit/firestore/`
   is re-synced.
2. **Cross-stream play broke mastery.** arena.js built `wordIndex` from the JOINER's `ctx.words`, so
   every `room.wordIds` lookup was undefined in a cross-stream room and the round rendered blank —
   it now fetches the host's stream JSON (`ensureStream`, cached). Worse, `conferMastery(ids)`
   wrote the HOST's ids into the joiner's store, and since **海拔 is
   `Object.keys(store.mastered).length`**, foreign ids would silently inflate a student's altitude
   with words that do not exist in their stream. `conferMasteryFromRoom(ids, texts)` now validates
   ids against our own WORDS and matches the rest by **word TEXT** — the documented cross-stream
   join key. Distractors also come from the room's stream pool, not the joiner's.

### How it works
- `WSArena.host(ctx, cfg)` creates `rooms/{code}` with `pk:true` + a 6h `expiresAt` (same TTL sweep
  as 结伴登峰) and then **falls into the ordinary join flow — the host is a normal player row**, per
  §2. Code alphabet excludes O/0/I/1/L. Retries 3× on collision.
- Lobby: host sees the code and a 开始 button that stays **disabled below 2 players**; cap 8
  (`PK_MIN`/`PK_MAX`). The host's client mirrors what teacher.html does for 结伴登峰 — it is the only
  one allowed to write the room doc, so it keeps `playerCount` live for everyone else's lobby.
- **The room code stays on screen through `running`**, not just the lobby (§2): an `.arena-code-chip`
  in the HUD, so a friend who drops can glance at any player's screen and rejoin without asking.
- Ranking: `correct` desc, then `msUsed` asc. **Deliberately NOT `score`** — the owner picked
  fixed-time/most-correct precisely so raw speed cannot win, so the board must not rank on the
  speed-weighted arena score. 结伴登峰 still ranks on score, unchanged.
- Modes are the three quiz types only. 攀山竞速/词雨 have their own scoring and do not express
  "most correct in a fixed time"; adding them would need a separate win condition.
- Setup screen (`renderPkConfig`) shows the scope word count, 题型, 时长, and both
  开一个房间 / 加入朋友的房间. Entry is a ⚔️ pill beside 结伴登峰 on the home mini-horizon.

### Reward
**Nothing but mastery.** A PK win awards NO 历练值, NO 灵露 — same locked principle as 结伴登峰, and
it matters more here: without it, PK is a shortcut around the mastery gate that rewards fast typing
over knowing the word. ⚠️ The cosmetic **对战徽章 (§5.4) is NOT built** — it needs its own art brief
and must never reuse or mix with the five locked progression badges (shkj/hx/gg/jj/whz). Wins are
not yet recorded anywhere; add a counter when the badge art exists.

### 验证
22 assertions driving the real arena.js against a mock Firestore (the method the arena was
originally verified with, since real rooms need published rules): room created once with `pk:true`
and a valid code, host written as a PLAYER, start gated below 2 players, status flip to running,
**code visible during play**, a new player refused mid-round with no row written, an existing player
reconnecting with score carried forward, cross-stream id rejection + text matching, and the ranking
order (most-correct beats a much higher speed score). The other suites still pass: camp 57, economy
34, rain layout 12. app.js / arena.js parse; CSS braces 636/636.
⚠️ **Never run against real Firestore.** Needs the re-published rules, then a genuine two-device
round — especially the reconnect path and cross-stream play (a G1 and a G3 student in one room).

## Session batch, 2026-08-14 (late) — 仓库分目录 · 词雨分栏比例 · 消耗品素材入库

### 1. 仓库分目录 (owner request)
See the rewritten **File structure** section above — the flat-root rule is retired, 66 files moved
into `data/` + `art/{bg,badge,avatar,camp,item,sprite}` + `docs/`, every reference rewritten and
verified (61 asset paths, 0 missing), all 183 test assertions still passing afterwards.
⚠️ At the time this was written the local clone was 36 commits behind origin, which is why deploying
the reorg needed either a git push from here or a manual purge of the 66 old root files first (a plain
re-upload would duplicate rather than move them). **RESOLVED 2026-08-14: the reorg is pushed and the
clone is now IN SYNC with origin/main** (verified `git rev-list --left-right --count`). Normal flow
from here is commit + push in GitHub Desktop; there is no longer any need for web-UI uploads. Check
the real ahead/behind before assuming either state — this line has been stale once already.

### 2. 词雨 landscape split reweighted (owner)
The §3 split shipped at 62/38, which the owner judged too even: *"the screen still can take up most
of the screen, we just want the typing field to be on the side instead of underneath."*
`.rain-area` is now `flex:1 1 auto` and `.rain-right` is `flex:0 0 clamp(190px,23%,290px)` — the
column is sized to what the input needs, not to a share of the width. In that narrower column the
HUD wraps and the 收集 button goes full-width under the input.

### 3. 消耗品 / 竞速道具 art (DESIGN_consumables_and_powerups_2026-08-14.md)
10 sprites processed and filed under `art/item/`: 7 词雨 consumables (糖葫芦 +1命 · 定风珠 冻结5秒 ·
油纸伞 连击护盾 · 羽扇 减速 · 算盘 灵露+10% · 玉葫芦 自动收集 · 锦囊 随机) and 3 攀山竞速 powerups
(铜壶滴漏 加时 · 护膝 免一次时间惩罚 · 司南 剔除一个错误选项). The doc's own §4 flags magenta edge
residue — confirmed (700–2300 contaminated px each) and cleaned with the repo's despill pipeline,
then capped at 320px (they render as ~64px icons).
⚠️ **ART ONLY — the system is NOT built**, exactly as the doc's §5 says. No inventory, no pre-round
slot picker, no effect logic, no pricing. Naming is already de-religionised per the doc (灵露瓶→糖葫芦,
护身符→油纸伞, 双倍灵露符→算盘, 提灯 removed entirely). Open before building: whether 闯关 waypoints
are all MCQ (decides where 司南 can apply), and pricing against the A/B/C ladder.
Note the doc's §3 worry about 结伴登峰 reusing app.js state is already settled: arena.js has its own
renderers and never touches the 灵露/inventory path, so rooms are consumable-free with no extra code.

### 4. 对战徽章
Owner will design it separately. Nothing recorded, nothing stubbed — unchanged from the PK section.

## Fix batch, 2026-08-14 (post-deploy) — 6 owner-reported issues

1. **词雨 暂停 button REMOVED** (owner). The HUD button and its handler are gone; the internal
   `running` flag stays (the rAF loop and `fitViewport` still use it), it simply has no UI.
2. **结伴登峰 / 同伴挑战 pills overlapped.** Both were `.mtn-arena{position:absolute;left:10px;
   bottom:8px}` — i.e. stacked exactly on top of each other, since the PK pill reused that class.
   They now sit in ONE absolutely-positioned flex row (`.mtn-rooms`), so a third pill later cannot
   reintroduce it.
3. **我的档案 had no visible way out.** There WAS a 关闭 button, but only at the very bottom of a
   long scrolling panel. Added a sticky `.prof-x` ✕ pinned to the top of the card (sticky to the
   CARD, not the page, or it scrolls away mid-panel). Bottom 关闭 and backdrop-tap still work.
4. **Pending teachers saw "无法验证权限" (read as "access denied").** Root cause was a RULE, not
   copy: `teachers/{uid}` was `allow read: if isTeacher()`, and a registered-but-unapproved teacher
   has no doc there — so the read came back permission-denied and teacher.html showed the raw error.
   Two-part fix: (a) the client now catches `permission-denied` specifically and falls through to
   the user's OWN `teacherRequests` row to show 待审批 / 尚未申请, so **it works without any rules
   change**; (b) the rule now also allows reading your own row. Title reworded to ⏳ 等待审批中.
5. **攀山竞速 canvas overflowed the screen.** `.sprint-shell` had `min-height:520px`, which BEATS
   `height:calc(100dvh - 68px)` on any short screen (phone landscape, 1024×600 Chromebook) and
   pushed the wall past the frame, triggering page scroll during a timed round. Now
   `min-height:0` + an explicit `max-height` cap + `overflow:hidden`, with `.sprint-right`
   scrolling internally if the options still cannot fit. ⚠️ Never reintroduce a `min-height` on
   `.sprint-shell` larger than the viewport cap.
6. **攀山竞速 options are now ONE column** (`.sopts{grid-template-columns:1fr}`) at every width —
   the 2×2 grid halved the tap-target width during a timed round. The landscape block's duplicate
   override was removed, and in that row layout `.sprint-right` is now
   `flex:0 0 clamp(280px,38%,440px)` so the wall keeps most of the width.

⚠️ **Rules changed again — needs ANOTHER publish** (bundled, not urgent): the own-row `teachers`
read from #4, plus `rooms/{code}/players/{uid}` delete now also allowed for the row's owner and for
the room's host. That second one exists because **Firestore TTL deletes the room but never its
subcollection**, and a student PK host previously had no way to clear player rows. Owner's copy at
`Documents/VocabSummit/firestore/` re-synced. Fix #4 does NOT depend on this publish.

Verified: all five suites still pass (camp 57 · teacher 58 · economy 34 · PK 22 · rain 12), all JS
parses, CSS braces 644/644. ⚠️ #2, #3, #5 and #6 are LAYOUT claims — they need eyes on a real
device, especially the sprint shell on a 1024×600 Chromebook and in phone landscape.

## 液态玻璃 UI + 档案页压缩 + 徽章详情卡 · 2026-08-14 (owner request)

Two owner asks in one pass, both in app.css / app.js / profile.js. **Verified in a real browser**
(`python3 -m http.server` was blocked by cache staleness at first — a plain SimpleHTTPRequestHandler
sends Last-Modified, so the Browser pane served an OLD app.js and the new markup silently did not
appear. Use a no-store handler when testing edits; the 30 seconds of confusion is avoidable).

### 1. 液态玻璃 (liquid glass)
Six tokens at the top of app.css (`--glass`, `--glass-strong`, `--glass-soft`, `--glass-line`,
`--glass-blur`, `--glass-lift`, `--glass-edge`) drive every panel, so the whole look retunes from one
place. The recipe is: translucent white plate + a REAL `backdrop-filter` blur + a bright top hairline
(`inset 0 1px 0`) that reads as the lit edge of a pane.
- Applied to: `.topbar` (+ `.back` / `.tb-profile` / `.tb-en` pills), `.card` (so every config screen
  and home card), `.pop-card` (so 我的档案 and every popover), `.pop-overlay` (3px scrim blur).
- **Inner controls had to go translucent too** — `.dopt` `.nav-btn` `.prof-chip` `.prof-input`
  `.np-select` `.code-ta` `.prof-uid` `.prof-prog div`. A glass card with opaque white buttons on it
  reads as glass with stickers stuck to it, which is worse than no glass at all.
- `.opt` (the quiz answer buttons) is DELIBERATELY left solid. Answering a question is the one place
  where legibility must not be traded for effect.
- ⚠️ **Alphas are .5–.72 on purpose.** These panels sit over busy painterly art on school
  Chromebooks. Do not "improve" the effect by lowering them without looking at bg-01..05 and
  landing_hero_bg behind a full question screen.
- **`@supports not (backdrop-filter)` block at the very END of app.css** raises every alpha for
  browsers with no blur — keep it last, and add any new glass surface to it.

### 2. 我的档案 空间压缩
- The ≥900px panel was FOUR grid cells in a 2×2, so row heights were coupled: the short 我的进度 /
  技术编号 blocks were pinned to the row heights of the tall 身份 / 进度码 blocks and left ~350px of
  dead space. `render()` now emits **two `.prof-col` wrappers** that flow independently.
- ⚠️ **The column break sits after 我的进度, and that position is load-bearing**: it is the only split
  that leaves the columns near-equal (measured 559px vs 533px; card height 880 → 643). Moving 我的进度
  to the right column puts the 350px hole back on the other side.
- Below 900px both columns collapse and source order is unchanged (身份 → 进度 → 进度码 → 技术),
  verified on a 375px viewport.
- **The bottom 关闭 button is REMOVED**, per the owner: the sticky `.prof-x` ✕ (added earlier the same
  day) is now the only close control, plus the backdrop tap. Its wiring was deleted too — do not
  re-add a `#profClose` lookup, it will throw.
- 我的进度 is a real `grid` now (`auto-fit,minmax(112px,1fr)`), not `flex:1` — four numbers no longer
  stretch into four wide, mostly-empty plates. Numbers are serif gold-deep, matching 概览's harbour.

### 3. 徽章详情卡 + 板块挑战 (owner request)
成就墙's component badges are now buttons opening `openBadgeDetail()`: the art LARGE (150px,
`object-fit:contain`, uncropped, nothing drawn over it — badge spec respected), 年级·单元·课文标题,
earned state, 已掌握 N/M with a progress bar, and every word in the 板块 as a chip (mastered ones gold).
- **New `store.badgeLog`**: `badgeKey -> {first, last, n}`. A SEPARATE map from `store.badges` on
  purpose — `s.badges` stays a plain truthy flag so every existing check, the cloud union and the
  badge count keep working untouched. `logBadge()` stamps it from `todaySG()` in all four
  `checkBadges` tiers. Badges earned before this shipped have no entry and the card says
  **日期未记录** rather than inventing a date. Merged from cloud as earliest-`first` /
  latest-`last` / max-`n`. NOT in 进度码.
- **未获得 → 去挑战**: `startCompStudy()` runs 填空挑战 over exactly that 板块, unmastered first, NOT
  capped to 题数 (the point is to finish the 板块). 填空 is the mastery gate, so answering here is what
  actually earns the badge — verified end to end, including the T1 celebration firing.
- **已获得 → 再次挑战**: `startBadgeTrial()` = 板块试炼, 华文解释 MCQ over EVERY word in the 板块,
  **全对 only**, modelled on 年度试炼 (`state.bchal` mirrors `state.gym`). A pass does `log.n++` +
  `log.last`, so the same badge can be won repeatedly and the wall shows a `×N` chip **beside the
  name, never over the art**. A miss costs nothing at all — no 待巩固, no mastery change (verified:
  22/23 left n at 2 and 海拔 at 23).
- 历练值 / 灵露 are earned normally in both rounds (they route through renderCloze/renderMcq); the
  repeat count itself is cosmetic and touches no leaderboard.
- `clozeOpts` now honours `state.pool` — a student whose 复习范围 is one unit would otherwise get too
  few distractors when challenging a 板块 from elsewhere on the wall.
- `.ach-hint` is a glass PILL, not light text: the wall sits on bright sky art where light type on the
  backdrop is unreadable.
- ⚠️ Only the five 板块章 are clickable. 单元章/年级章/顶级词王 have no art (they are emoji seals), so
  there is nothing to zoom — they would need art before they could get the same card.
- ⚠️ NOTE for the record: `.ach-level-head b` (中一/中二…) is white serif on the bare backdrop and is
  hard to read on the pale sky art. Pre-existing, untouched, worth a pass with the hint-pill treatment.

### 验证
Real browser at 1280×820 and 375×812: glass on topbar/home cards/攀山竞速 config/我的档案; profile
column heights and card height measured with `getBoundingClientRect`; mobile section order asserted;
badge card open from the wall (locked + earned states); 去挑战 launching a 23-question cloze round over
the right 板块; a real correct answer awarding the badge, stamping badgeLog and firing the celebration;
a scripted all-correct 板块试炼 taking n to 2 and the wall showing ×2; a deliberate miss leaving n and
海拔 untouched. Zero console errors. app.js + profile.js parse (JavaScriptCore), CSS braces 676/676,
every referenced asset path still resolves.
⚠️ Not proven without a device: how the blur performs on a managed Chromebook (backdrop-filter is
GPU work on every scroll — if 词雨/攀山竞速 feel less smooth on real PLDs, the first thing to try is
dropping the blur from `.card` and keeping it on the topbar and popovers only).

## 部署缓存版本号 (cache busting) · 2026-08-14 — READ BEFORE EVERY DEPLOY

**⚠️ ON EVERY DEPLOY, BUMP THE VERSION IN SIX PLACES:** `?v=YYYYMMDD` on the asset tags in
`index.html` + the four `*_index.html` stream pages, and the `ASSET_V` literal near the top of
`teacher.html`'s script. That is the whole ritual.

⚠️ **Deploying twice in one day? Add or advance a LETTER** — `20260814` → `20260814b` → `20260814c`.
A date-only string does not change between two same-day deploys, so the second one would be served
stale, which is the exact bug this whole mechanism exists to prevent. This already happened on day
one (the 徽章 pass and the 营地拖动 fix shipped hours apart).

Why it exists: GitHub Pages serves every file with `cache-control: max-age=600`. For ten minutes a
browser does not even ASK whether a newer copy exists, and it ages each file INDEPENDENTLY. So a
device can run a NEW `app.css` beside an OLD `app.js`. The owner hit exactly that on 2026-08-14: the
new badge tiles responded to hover (new CSS) but did nothing on click (old JS had no handler), and
the live site was verified correct at the same moment. The 2026-08-13 结伴登峰 「没有反应」 live-test
report is very likely the same bug — that session could not rule out a stale deploy.

- Versioned: `app.css` · `app.js` · `arena.js` · `profile.js` · `nickname.js` · `firebase-init.js`.
  The gstatic Firebase SDK URLs are already versioned upstream and are left alone. `voices.html`
  has no local assets.
- **The data JSONs inherit the version automatically.** `app.js` and `arena.js` read `?v=` off their
  OWN `<script src>` via `document.currentScript` and append it to `fetch("data/…json")`, so there is
  no second string to remember and a vocab regeneration can never be served stale beside new code.
  Falls back to no query if `currentScript` is unavailable — that is just today's behaviour, so it
  can never break a load.
- `teacher.html` is the one exception: it is standalone and loads no local `.js`, so it cannot read
  its own tag. Its `ASSET_V` is a literal and must be bumped by hand with the other five.
- Forgetting to bump is not a regression — it simply leaves you with the pre-2026-08-14 behaviour.
- This is NOT a build step and NOT a service worker; both remain ruled out by the conventions above.

Verified in-browser: all six local assets plus `hcl.json` requested with `?v=20260814`, zero console
errors, badge card still opens.

## 营地拖动修复 · 2026-08-14 (owner: 「can't seem to move and place them」)

The 便携化 free-placement drag shipped 2026-08-14 verified ONLY by headless assertions — no browser
ever ran it. Driven in a real browser this session it failed, for three separate reasons. All three
are fixed and both input paths are now verified with real events.

1. **`<img>` is natively draggable, and on Safari that wins.** `.camp-move` sprites are `<img>`
   elements with `-webkit-user-drag:auto` and `draggable=true` (both browser defaults, confirmed by
   reading computed style). Safari therefore starts its OWN image drag-and-drop — ghost image, item
   never moves — and `preventDefault()` on `pointerdown` does not reliably suppress it there. This is
   almost certainly what the owner hit: **the only browser on that machine is Safari.** Fixed in
   three layers: `-webkit-user-drag:none` on `.camp-move`, `draggable="false"` emitted by
   `campSprite()`, and a `dragstart` preventDefault per sprite. ⚠️ Do not drop any of the three.
2. **`pointermove`/`pointerup` were bound to each sprite and depended on `setPointerCapture`** — a
   call sitting inside `try/catch`, so any failure was silent. Wherever capture does not take, the
   pointer leaves the small sprite within a few pixels and moves simply stop arriving: the item
   twitches and sticks. They are now on the DOCUMENT with a single `_campDrag` record, so capture is
   no longer load-bearing. Proven by dispatching every move on `document` rather than the sprite —
   0px under the old code, 120px now.
3. **Those document listeners must be wired ONCE** (`_campDragWired`), because `openCampScene()` runs
   on every camp visit and per-visit listeners would pile up, each closing over a detached stage.

`passive:false` on the move listener so `preventDefault()` is honoured (without it a touch drag can
still scroll the page). The tap-without-move guard is unchanged and still verified.

VERIFIED in a real browser, both paths: a real mouse drag at 1280×820 (tent moved and persisted to
`store.decoPos`), a touch-typed pointer sequence at 375×812, a drag whose moves all land on
`document`, a tap that must NOT rewrite the position, and a leave-and-re-enter cycle still dragging
correctly. ⚠️ Still wants a real finger on a real iPad — touch EMULATION is not touch.

Note for whoever reads this next: this is the second feature in two days that passed headless
assertions and failed on first contact with a browser (the 攀山竞速 landscape split was the first).
Assertions prove data flow. They cannot prove that an event ever reaches your handler.

## 头像池扩充 · 西游记五人组 · 2026-08-14 (avatars_bundle 交付)

Source: `~/Downloads/avatars_bundle/` (avatars_ready/ + the original DESIGN_头像与档案页.md).
Avatar pool 16 → **21**. app assets + profile.js only; no data, no rules, no Firestore change.

- **五张新头像入库** `art/avatar/avatar_jtw_{tangseng,sunwukong,zhubajie,shaseng,bailongma}.png`,
  category `jtw`, chip 「西游记」, inserted between 神兽 and 生肖 in `AVATAR_CATALOG`. Not
  stream-limited, same as every other avatar (doc §0.1).
- **The bundle's OTHER two folders were deliberately not taken in**: (a) its four `pet_*.png` are
  **byte-identical** (md5-checked) to the repo's `art/camp/pet_*.png` — nothing to update, and the
  avatar picker keeps using the separate square `avatar_pet_*.png` files per the standing warning
  that those two sets must never be pointed at each other; (b) `avatar_char_g1/g2/g3/hcl.png` are
  the 角色 avatars the **owner removed on 2026-08-13**, and the bundle's design doc simply predates
  that call — they stay out, and the dead `char` key was dropped from `AVATAR_CAT_LABEL`.
- **Art processing:** the drop arrived alpha-cut but with the usual magenta edge fringing
  (539 px on 孙悟空, 826 on 唐僧, **93%+ of it adjacent to a transparent pixel** — the documented
  signature) at 1187–1357px / 725KB–1MB. Ran the repo's pipeline (min(R,B)−G signature, despill
  ramp, hard fringe above the threshold dropped, re-trim, square-pad, LANCZOS to 320px) → 99–143KB,
  matching the existing avatars exactly. Verified by compositing on BOTH a deep-sea and a gold
  background, and by rendering the real 64px circular thumbnails: the full-body figures read as
  clearly as the existing 生肖 at picker size, so no re-crop was needed.
- **VERIFIED in a real browser** (`python3` + a **no-store** handler on 127.0.0.1 — the Browser pane
  accepted it this session): catalog length 21, four chips 全部/神兽/西游记/生肖, all five jtw
  thumbnails load at 320×320, and the full real path 顶栏 pill → 我的档案 → 换头像 → 孙悟空 writes
  `avatarId` while leaving nickname/班级 intact, updates the topbar image immediately, and shows on
  the landing greeting after a reload. Zero console errors, zero broken images. profile.js parses.
- Cache-bust bumped `20260814b` → **`20260814c`** in all six places (the third deploy today — this
  is exactly the same-day letter case the ritual warns about).

### AvatarInfoCard · 点头像先看简介 (设计文档 §0.5 / §3, 同日补上)

The owner then delivered `avatars_bundle-2/` — **the art is byte-identical**, the change is the
doc: §1.6 now carries the five 西游记 bios and rewritten 生肖 bios. That was the missing input, so
the detail card is now built and the picker's instant-select is retired.

- **`bio` added to all 21 catalogue entries.** Two deliberate departures from the doc's raw text,
  both noted in a comment above `AVATAR_CATALOG`: curly quotes → 「」 per the repo's
  code-embedded-text rule (「龟寿千年」「百兽之王」「小龙」), and each 生肖 line folds its 地支 into
  the doc's own opening sentence (「十二生肖排第 3 位（地支属「寅」）…」) — §1.6's heading asks for
  排第几位 + 地支 first, but its list carries the 地支 in the animal's NAME, which the card already
  prints above the bio.
- ⚠️ **One typo corrected in the owner's text**: 猪八戒 「原是**天蓝上**的天蓬元帅」 → 「原是**天上**的
  天蓬元帅」. Flagged rather than silently kept; fix the master doc too.
- **`openAvatarInfo(id, opts)`** is the shared component §3 asks for — ONE card, both entry points,
  only the primary button differs (`mode:"pick"` → 「选用这个头像」 · `mode:"current"` → 「换一个」).
  z-index 68 over the picker's 65, so 返回 reveals the grid still standing underneath.
- Flow now: grid thumbnail → card → confirm writes `avatarId`. **A tap on a thumbnail no longer
  writes anything**, which also removes the stray-tap hazard the 可及性 pass chased elsewhere.
  Tapping your OWN avatar in 我的档案 opens the same card with 「换一个」 → the grid; with no avatar
  set there is nothing to show, so it still goes straight to the grid. The 换头像 link keeps going
  directly to the grid — that is what its label promises.
- CSS `.pop-card.av-info` + `.av-info-{img,name,bio}` in app.css (180px gold-ringed portrait,
  serif name, left-aligned bio), dropping to 136px under 420px. Not a new glass surface — it
  inherits `.pop-card`, so the `@supports not (backdrop-filter)` block needs no entry.
- **VERIFIED in a real browser** at 1280×820 and 375×812: all 21 entries have a bio; a thumbnail tap
  opens the card and writes NOTHING; 返回 leaves the grid open; 选用 commits and closes both layers;
  the real 顶栏 → 我的档案 → 头像 path saves `avatarId` while leaving nickname/班级/学校 intact and
  updates the topbar image; the current-avatar card shows 关闭/换一个 and 换一个 reopens the grid with
  the current avatar ringed. The longest bio (孙悟空) fits a 375px screen with no scroll. Zero
  console errors, profile.js parses, CSS braces 685/685.
- Cache-bust bumped again `20260814c` → **`20260814d`** (fourth deploy today).

## B层 · 对战徽章 · 2026-08-14 (DESIGN_徽章体系_对战与排行榜.md)

八枚对战奖牌上线：结伴登峰 / 同伴挑战 各 金/银/铜 + 一枚 5金称号。art + app.js + arena.js +
app.css。**A层五枚里程碑徽章一个字节都没动**，B层是另一个家族（金属圆环 + 擂鼓/号角图腾），
不共用制图语言，也不共用计数。

### 命名（owner 已定，不要再改）
学生自约的房间模式叫 **同伴挑战**。设计文档 §6.5 曾提议改名「好友挑战」并注明未经 owner 逐字
确认——2026-08-14 owner 确认**保持线上已有的 同伴挑战**，文档随后自行改齐。文件名沿用交付时的
`peer`（= 同伴），和 UI 文案一致。两枚称号：**常胜擂主**（结伴登峰 5 金）/ **凯旋号手**
（同伴挑战 5 金），美术改用**缠枝牡丹纹**而非桂冠（桂冠非中式符号，doc §6.5）。

### 美术处理
源文件是 8 张 1254px 白底产品摄影图（RGB，2–2.9MB）。按 doc §6.5 描述的管线抠圆去背：
72 方向射线从外向内扫描找盘沿（连续 5 像素偏离纸白 ≥14 才算边，避开柔和投影）→ Kasa 最小二乘
拟合圆 → MAD 剔除离群射线后重拟合 → 内缩 3px 削掉混色边（否则深色底上会留白圈）→ 4× 超采样
椭圆蒙版 → LANCZOS 缩到 **320×320 RGBA**（最大渲染尺寸是详情卡 150px，2× DPR 刚好）。
拟合残差 avg 1.2–3.5px / R≈570–617，即 <0.6%。**做法上要记住的一点：不能用「接近白就抠掉」的
阈值法** —— 银牌盘面本身就接近纸白（近白像素占比 0.40，远高于圆外应有的 0.215），颜色阈值会把
银牌自己吃掉。必须按几何抠，不按颜色抠。产出 183–237KB/枚，和既有 badge_* 同量级。
⚠️ **CLAUDE.md 此前说 A层五枚走过「抠圆→256×256 透明」管线，那是不对的**：线上五枚其实是
1092×1092 **不透明白底 RGB**，从未抠过。CSS 用 `border-radius:50%` 圆形裁切，所以看起来一样。
B层是真透明，因此成就墙上 `.ach-badge[data-bf] img` 用 `object-fit:contain`（A层用 cover）。

### 数据模型：故意复用 store.badges + store.badgeLog
没有新建 `store.battle`。键前缀 **`b·`**（`b·room·gold` 这种），和 A层的 `c·`/`u·`/`l·`/`t4`
不可能撞。这样白拿两件事：`badges` 的云端 union 直接生效；`badgeLog` 本来就是
`{first,last,n}` 按「最早 first / 最晚 last / 最大 n」合并——**正好就是可重复奖牌需要的形状**。
没有新增 Firestore 字段，没有新增 merge 代码，规则不用改，不用重新发布。
- ⚠️ **因此 `Object.keys(store.badges).length` 不再等于 A层徽章数**。首页「徽章 N/M」改走
  `achBadgeCount()`（过滤掉 `b·`）。以后加 C/D 层徽章务必也用新前缀 + 走这个函数，否则首页会
  出现 42/40 这种数。
- **n 是跨设备取 max，不是求和**（沿用 badgeLog 既有语义）。两台设备各拿 3 面金牌，合并后是 3
  不是 6。可接受，但要知道。
- **不进 进度码**（profile.js 完全不碰 badges/badgeLog——已确认）。奖牌是纪念，不是可转移进度。

### 发牌逻辑
`awardBattleMedal(family, rank)` 在 app.js，通过 `ctx.awardBattle` 交给 arena.js，**保持 §7 的
隔离**：arena.js 只管问和渲染，徽章存储始终归 app.js。arena.js 里发牌点在 `awardMedal(rows)`，
挂在最终排名读回来之后——名次只有那时才知道。
- 名次判定沿用各自既有的排序：结伴登峰按 score，同伴挑战按 **答对数**（并列比答题耗时）。
  已验证：一个 score 900 但答对 0 的对手，在同伴挑战房里排在答对 1 题的人后面。
- 两条闸门，都是故意的：**房间少于 2 人不算名次**（一个人的房间不是第一名），
  **一题没答不发牌**（三人房里挂机不能白拿铜牌）。
- 称号在**本家族**金牌满 5 面时解锁，永久，之后输局不收回；已持有就不再重复播报。
- **奖牌展示在 arena 自己的结算卡里，不走 app.js 的 cel-overlay** —— cel-overlay 是
  `z-index:300`，arena 是 90，庆祝层会直接盖住学生正在看的排名板。

### 成就墙
B层放在**整个 A层阶梯之后**，独立 `.section-label`（doc §7 明确要求别让五枚里程碑被新徽章淹没）。
两个家族各一张卡，每张 4 枚（金/银/铜/称号），称号格显示 `4/5 金` 进度。点任意一枚开详情卡
（复用 `.bd-*`：大图不裁、首次/最近日期、获得次数；称号多一条进度条），底部按钮直接进对应房间。

### ⚠️ 没做的部分（不是遗漏，是有意留下）
- **doc §0「推翻 arena 零奖励闸门」没有实作。** §0 要房间模式计入 历练值/灵露，但 doc §7 自己写着
  「房间模式是否沿用 attemptDecay/streakMultiplier，还是用房间专属简化计分 —— 需要单独一轮设计」。
  计分公式没定就动闸门，等于我替 owner 定了。所以**闸门维持原样**：房间模式仍然只给 海拔，
  不给 历练值/灵露。对战徽章是纯纪念品，不碰任何排行榜数字。CLAUDE.md「结伴登峰」章节那句
  「arena code must NEVER call scoreCorrect/bankPts」**目前依然有效**，等 §0 单独一轮设计后再改。
- **C层（学期风云榜/周榜之星/手速榜）、D层（个人记录）完全没做** —— 美术一张都还没生成，
  且都需要学期结算快照 / 历史数组这类新的 Firestore 结构（doc §7）。

### 验证（真浏览器，本次可用）
`python3` + **no-store** handler + 127.0.0.1（Browser pane 本次接受了；每个 session 不一定，先试）。
⚠️ 但 **Browser pane 处于 hidden 状态，截图全白** —— JS 执行、真实点击、`getBoundingClientRect`
量测都正常，只是看不到画面。所以本次是「量到的」不是「看到的」。
- **成就墙**（1280 与 375 两个宽度）：8 枚全渲染、locked 态正确、`×N` 正确、称号进度 4/5 与 0/5
  正确、8 张图 naturalWidth 都是 320（无 404）、无横向溢出、375px 下每家族折成 2 行、详情卡
  339×478 放得下 812 高。真实 `.click()` 打开详情卡：locked 卡进度条 80%、已获得卡显示
  「已获得 4 次 + 首次 2026-08-01 + 最近 2026-08-13」、关闭按钮真的关掉。
- **arena 全流程**（mock Firestore，沿用 arena 一贯的验证法，因为真房间要先发布规则）：
  join → lobby → 老师开始 → 答题 → 结束 → 结算。发牌调用 `("room",2)`（我 110 分夹在 120 和 60
  中间，名次对）；同伴挑战房发 `("peer",1)`；奖牌块和称号块都渲染在结算卡里。
  三条闸门实测：**一人房不发牌 / 一题没答不发牌（哪怕排第 2）/ 第 4 名不发牌**。
- **app.js 发牌逻辑 25 条断言全过**（真 app.js 载进浏览器，用 `boot()` 导出钩子那招）：
  首枚 n=1、连拿到 n=4 仍无称号、第 5 面解锁常胜擂主、第 6 面不重复播报、两家族计数互不影响、
  peer 满 5 解锁凯旋号手且不动 room 的、6 面银牌不产生任何称号、rank 4/0/未知家族一律拒绝、
  `achBadgeCount()` 只数 A层、落盘 localStorage 正确，以及 **mastery / 历练值 / 灵露 三个数字
  自始至终没被碰过**（这条是重点，B层必须是纯纪念）。
- 三个 JS 文件都能解析（JavaScriptCore），CSS 括号 688/688。
- Cache-bust `20260814d` → **`20260814e`**（今天第五次部署）。
⚠️ **仍未在真设备上跑过**：iPad/Chromebook 上 8 枚一排的换行、结算卡里 58px 奖牌图在手机上的
观感、以及一场真实的双设备对战（要先发布 rooms 规则）。上课前值得亲手打一局。
