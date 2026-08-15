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

    /                 index.html · G1/G2/G3/HCL_index.html · XH_index.html
                      teacher.html · voices.html · sound.html
                      app.js · app.css · arena.js · profile.js · nickname.js · firebase-init.js
                      xh.js · xh.css                    ← 学海启航 码头, standalone
                      CLAUDE.md · README.md · firestore.rules · .gitignore
    data/             g1/g2/g3/hcl.json · id_registry.json · xh_mvp.json
    art/bg/           landing_hero_bg · hero_bg · study_bg · rain_bg · sprint_bg · mountain_bg
                      · climb-wall-tile · bg-01..05
    art/badge/        badge_shkj/hx/gg/jj/whz            ← A层 里程碑 (1092px, 不透明白底)
                      badge_battle_{room,peer}_{gold,silver,bronze,champion}
                                                        ← B层 对战 (320px, 抠圆透明)
    art/avatar/       avatar_pet_* (4) · avatar_jtw_* (5) · avatar_zodiac_* (12)
    art/camp/         camp_bg · tent · gear_* (11) · deco_* (10) · pet_* (4) · linglu
    art/item/         consumable_* (7) · powerup_* (3)   ← 2026-08-14, system NOT built
    art/sprite/       sprite_g1/g2/g3/hcl_raw · tileset_raw   (8-bit art awaiting processing)
    art/seamap/       sea_tile · dock_jetty · island_g1/g2/g3/hcl · boat_* (5)
                                                        ← 2026-08-15 航海选择页
    art/mountain/     mtn_g1/g2/g3/hcl                  ← 2026-08-15 per-stream 我的词山
    art/xh/           xh_*.png (142)                    ← 看图识词 sprites
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
- 词语汉兜 (**G3/HCL only** since 2026-08-13): 4-character word Wordle, **12 guesses, rows numbered**,
  character-level grading (exact/present/absent, duplicate-aware), pool = 4-char words in scope
  (min 8), win streak tracked. **HINT_REDESIGN_2026-08-15** (owner-approved) replaced the old
  progressive-声母 button, which let a student stack all four 声母 + 释义 and reconstruct the answer
  without ever using the 🟩🟨⬜ grading — i.e. the game's actual mechanic was bypassable. Now three
  independent one-time hints: 首字声母 (**capped at the FIRST character, never stacks to four**) ·
  词性 (from the existing `pos` field; ~90% of 4-char words are 成语, so it is usually
  low-information and only bites when the POS is a rare one) · 释义. All three cost **灵露 only**
  (3 / 5 / 15 — tunable) and never 历练值: mastery points are earned, never spendable. 释义
  auto-reveals FREE after 4 failed guesses so a stuck student always has a floor.
  **Every hint starts unbought.** The delivered code carried a G2 branch handing out 首字声母 free,
  left over from when 汉兜 was a G2/G3/HCL mode; owner confirmed 2026-08-15 that **汉兜 stays
  G3/HCL-only**, so that branch is deleted rather than left as unreachable code.
- 组词挑战 (**all four streams** since 2026-08-15): character-assembly game (slots + chips).
  Target words are **2–8 characters**; 9+ entries (whole proverbs) and anything containing
  punctuation are excluded — see the 2026-08-15 expansion section for why. Board size scales with
  the target length on top of the student's 字块数量 slider (max 24).
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
  攀山竞速每题 2 · 汉兜 6+1/未用次数（HINT_REDESIGN_2026-08-15：12 次起算，最大加成 5→11） · 词雨 & 闪卡 0.
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
  showMasteryInfo popover when built.
  ⚠️⚠️ **THE ZERO-REWARD HALF OF D-2 WAS REVERSED 2026-08-14** (owner: rooms are students actively
  USING their vocabulary, and excluding them from the incentive system works against engagement).
  Rooms now earn 历练值 + 灵露 through `ctx.roomCorrect`. The line that used to stand here —
  「arena code must NEVER call scoreCorrect/bankPts」 — is **no longer in force**; see the
  「房间模式计分」 section below for what replaced it and what is still structurally forbidden.
  What DOES still hold: keep arena in its own arena.js overlay, never entering renderStep(), and let
  app.js own the store — arena reaches scoring only through a ctx hook, never by touching internals.
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
- **3.1 模式配置:** 词语汉兜 is now G3/HCL only, 组词挑战 is now G1/G2 (⚠️ **组词挑战 was reopened to
  all four streams on 2026-08-15** — see that section; 汉兜 stays G3/HCL) (G1 has 370 eligible 2–4 char
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

### Scenery thresholds (§5) — ⚠️ RETIRED 2026-08-14, see the 营地只留露营装备 section below
青松 15% · 樱花树 35% · 望山台 50% · 红枫 60% · 悬泉飞瀑 80% of the stream's word count, via the
same `sceneryUnlocked()` math the old `prestigeUnlocked()` used. **None of this is live any more** —
the owner retired the whole 地貌景观 family. `SCENERY` is now an empty array.

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
⚠️ **SUPERSEDED 2026-08-14.** This used to read 「Nothing but mastery — a PK win awards NO 历练值,
NO 灵露」. Rooms now earn both, per the owner (see 「房间模式计分」). The old worry (PK becomes a
shortcut that rewards fast typing over knowing the word) is answered by the formula rather than by a
blanket ban: the same per-word 灵露 decay and per-day 历练值 repeat cap apply inside a room, so a
already-known word pays its 10% floor there too. The **placing** itself still awards nothing but a
cosmetic 对战徽章. Battle badges are BUILT since 2026-08-14 (§B层 对战徽章) — it needs its own art brief
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

### ⚠️ 没做的部分
- **C层（学期风云榜/周榜之星/手速榜）、D层（个人记录）完全没做** —— 美术一张都还没生成，
  且都需要学期结算快照 / 历史数组这类新的 Firestore 结构（doc §7）。
- （doc §0 的房间模式计分**已在同一天稍后实作**，见下面的「房间模式计分」小节。这里原本写着
  「闸门维持原样」，那句话已作废。）

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

## Owner batch, 2026-08-14 (晚) — 房间计分 · 拼音奖励 · 滑杆 · 复习范围 · 营地上山

十三项 owner 要求，一次做完。app.js / arena.js / app.css。**全部在真浏览器里验过**
（`python3` + no-store handler + 127.0.0.1，Browser pane 本次接受；但**面板处于 hidden 状态，
截图全白**，所以下面是「量到的」不是「看到的」）。

### 1. 房间模式计入 历练值/灵露 —— 推翻 D-2 零奖励闸门
Owner 理由：房间是学生**主动运用**词汇的场合，不该被排除在激励系统外。
- 新 `ctx.roomCorrect(w, mode, entering, tier)`（app.js），arena.js 在每个答对点调用。
  **arena 的隔离形状没变**：它仍然只通过 ctx 钩子说话，不碰 app.js 内部。
- 沿用**修行的同一套公式**（doc §7 说房间专属公式「需要单独一轮设计」，所以没有另起炉灶）：
  base × attemptDecay × streakMultiplier。房间里没有重答，attempt 恒为 1；`entering` 由 arena
  自己的连对计数提供。cloze 的 base 取 host 设的难度档（`room.tier`）。
- **词雨房间给 0 历练值**，和单人词雨一致；灵露照给。
- **+10 首次掌握** 现在也在房间路径发放（`conferMasteryFromRoom` 里，海拔真正上升的那一刻），
  和 `markMastered` 同一个 once-per-word 守卫，不会重复。
- ⚠️ **跨年级房间按「词」而不是按 id 计分**：房间发的是 host 的 word 对象，其 id 在本地毫无意义，
  直接拿来算会让 `wasMastered` 永远是 false，等于给已经掌握的词一直发首次分。`roomCorrect` 先用
  `wordByText` 把词换成**我们自己的**那一份再计分。
- 房间不是捷径：同一套 per-word 灵露衰减和 per-day 历练值重复上限照样生效（实测同一个词第二次
  只拿 3 而不是 5）。

### 2. 答对音效（房间里原本没有）
`roomCorrect` 一进来就 `sfxOk()`，在任何计分逻辑之前 —— 即使某条路径不计分，声音也一定响。
单人模式本来就有，只有房间缺。

### 3. 「加入结伴登峰」→「结伴登峰」
三处：首页药丸、arena.js 加入卡标题、对战徽章详情卡的按钮。

### 4. 你的营地会跟着爬山了
以前营地钉死在 frac 0，另有一颗 15px 的 `.mtn2-hero` 小圆点标「你在这里」——两个东西表达同一件事，
而且帐篷永远不动。现在**帐篷就是你在这里**：位置取当前海拔比例，46px → **64px**，加金色呼吸光晕
（`mtnCampGlow`）与缓慢浮动（`mtnCampFloat`，浮动放在内层 span 上，免得和按钮自己的
`translate(-50%,-50%)` 定位与 hover 缩放打架），z-index 7 压在其他 pin 之上。`.mtn2-hero` 已删除。
⚠️ **只有渲染位置变了**：`buildMarks` 里营地仍然记在 alt 0，所以目标、区域边界、markDone 全不受影响。
`prefers-reduced-motion` 下两个动画都停。

### 5-6. 文字可读性
- 我的词山的 🎯 目标行和底部图例，原本是**裸文字直接压在画上**（`--gold-deep` / `--ink-soft`），
  在明亮的竹林/天空 ambience 上根本读不出来。改成 `.ach-hint` 早就用过的做法：深色字 + 玻璃药丸。
- `.pop-card` 的 alpha 从 .82/.68/.72 提到 .95/.90/.93。⚠️ 2026-08-14 的液态玻璃小节警告过**不要
  调低**；这次是**调高**，正是为了可读性。`.pop-hint` 从 #8A94A0（几乎看不见）改成 #4E6273，
  `.gym-sec.lock` 从 `--ink-soft` 改成 `--ink`。要再动之前，先在最亮的背景上打开年级峰弹窗看一眼。

### 7. 组词挑战 字块数量可选 + 一个顺手抓到的泄题 bug
- `store.asmChips`，6/9/12/16（**含答案本身的字**），滑杆。以前硬编码 9。
- ⚠️ **抓到一个既有的泄题 bug**：切换「出题方式」会重画 renderAssemble，而**干扰字每次重抽、答案的
  字必然次次都在** —— 来回切两次就能看出哪些字是答案。和 2026-08-13 记录的「填空选项重洗=泄题」
  完全同一类。`asmChips()` 现在按题缓存干扰池（key = `state.i + "|" + w.id`）并按数量缓存排列，
  所以同一数量下切换出题方式得到**完全相同**的字块，改数量只在尾部增减。实测验证。

### 8. 拼音模式给一成奖励
Owner：「right now pinyin questions give 0 rewards but we need to also affirm their efforts」。
`PY_PRACTICE_MULT = 0.10`，`scoreCorrect` 新增第 6 个参数 `mult`，**下限 1 分**（重点是肯定，
不是按劳计酬）。适用 填空·打拼音 与 组词·拼音。文案同步：「练习不计分」→「一成历练值」。
- ⚠️ **仍然不给海拔**：掌握是有文档的闸门，而且「二元状态的 10%」不存在。
- ⚠️ **仍然不进连对**：否则学生可以在拼音模式刷出便宜的连对倍率再切回修行。
- 灵露维持原样（打拼音本来就按 tier 2 全额给，那是 2026-08-14 经济文档的既有决定，没有下调）。

### 9. 徽章详情卡的「去挑战」只练没掌握的
按钮写着「学这 6 个词语」，实际却发整个板块 7 题。现在只发未掌握的那些，按钮数字也改成按同一套
过滤算出来（含「板块里有 cloze 就只发有 cloze 的未掌握词」这一层），承诺和实际不再对不上。
全掌握但徽章未亮的边缘情况回退到全部词，免得开出空回合。

### 10. 复习范围
- **板块筛选**：一行 chips（生活空间/核心/巩固/进阶/文化站，按本 stream 实际存在的渲染），
  `store.compOff` 存**排除项**而不是包含项，这样将来新增板块默认可见而不是被悄悄藏掉。
  ⚠️ 没有做**每个单元各自**的板块开关：4-6 单元 × 最多 5 板块 ≈ 25 个额外 chip，直接违背 owner
  自己「不能杂乱」的约束。学生真正的诉求是「这周只练核心」，一行就够。
  最后一个板块不能关掉（否则范围空了但单元还亮着，看起来像 bug）。
- **手风琴改成互斥**：一次只展开一个年级，`store.accLevel` 存单个年级名。**首次进入全部折叠**
  （以前默认展开第一个），之后记住上次展开的。折叠不影响选择，跨年级多选照旧。
- `store.accOpen`（旧的 level→bool map）作废，留在 loadStore 里只为让旧存档还能解析。

### 11. 数量选择一律改滑杆
每次题数 / 挑战难度 / 冲刺时长 / 同伴挑战时长 / 组词字块数量。以前是一摞整宽按钮（光题数就 5 个）。
`qtySlider()` + `wireQtySlider()`，**range 的 min/max 走的是允许值的下标**（0..n-1，step 1），
所以拖动只可能落在合法值上，而且 60/90/120 这种不等距的值在轨道上仍然均匀分布。
- **难度也做成滑杆**（owner 明确要求；我原先想保留成瓦片，被纠正）。**打拼音排在最简单一端**，
  在 ⭐ 之前 —— 它是只给一成历练值、不给海拔的熟悉性档位，放在 ⭐⭐⭐⭐ 之后会被读成最难。
- 滑块 30px，达到可及性那一轮给答题按钮定下的手指尺寸。**没有加 `touch-action:manipulation`**
  —— range 要靠拖动手势，加了会废掉它。

### 12. 攀山竞速 空间重新分配
Owner：石墙缩小、题目和选项放大。`.sprint-canvas` 从 `flex:1 1 auto`（约占一半）改成
`flex:0 1 clamp(240px,30%,430px)`，`.sprint-right` 拿走其余。题干 17.5px → `clamp(22px,2.1vw,30px)`，
选项 19px → `clamp(21px,1.9vw,27px)`，选项按钮实测高 77px。
⚠️ **第一次改完字号没生效**：`.sprint-q .sq-prompt{font-size:17.5px}` 这些基础规则**写在 media
query 后面**，同优先级下后者赢。整个 landscape @media 块已挪到基础规则之后。这个只有在浏览器里量
computed style 才会发现 —— headless 断言看不出来。

### 13. 词雨「暂停」按钮
**源码里根本没有这个按钮。** 2026-08-14 的 fix batch 已经删掉（commit `3c339d2`），本地与
origin/main 都 grep 不到 `暂停`/`⏸`，词雨 HUD 里唯一的按钮是「收集」。owner 看到的几乎可以肯定是
**浏览器缓存的旧 app.js** —— 正是 cache-bust 那一节存在的原因。硬刷新（或等这次 `?v=` 生效）即可。
没有改任何代码。

### 常胜擂主/凯旋号手 交付包核对（owner 追问）
`常胜擂主_凯旋号手_入库交付/` 里的两枚 PNG 是 owner 侧自行抠好的 **256px**；仓库里已经是我处理的
**320px**。**保留 320px 版**：(a) 和另外六枚一致（交付包 §8 以为六枚是 256px，实际是 320px），
(b) 详情卡 150px × 2 倍屏需要 300px，256 会略糊，(c) 实测边缘混色带亮度 164 vs 197 —— 交付版留了更多
白边，在深色卡片上会有一圈白晕。交付包 §8 列的四件事（拆闸门 / 房间接入计分 / 徽章胜场记录 / CLAUDE.md
更正）**本批全部完成**。

### 验证
真浏览器，1440×820 与 375×812：
- 复习范围 9 条 + 板块筛选 7 条（含「不能把板块全关掉」和词数 426→363 的实际变化）
- 滑杆 12 条（题数/难度/持久化/无遗留瓦片/打拼音在最简端）
- 拼音奖励 6 条（真的答对一题 `默契 → moqi`，反馈行显示「+1 历练值」，灵露 +20，海拔仍 0，连对仍 0）
- 组词 8 条（含泄题守卫：同尺寸切换出题方式字块集合完全相同；6/9/16 之间来回后 9 的集合原样恢复）
- 我的词山 9 条（帐篷 64px、爬到 0.704 高度、发光+浮动动画、z-index 7、仍可点开营地、两行文字都在药丸上）
- 攀山竞速 8 条（墙 347px vs 题目栏 795px = 30%、题干 30px、选项 27px、点击目标 77px、无溢出）
- 徽章去挑战 4 条（9 词板块已掌握 3 → 按钮说 6 → 实际发 6 题）
- 房间计分 13 条（历练值/灵露真的入账、连对倍率生效、cloze 难度档影响 base、词雨 0 历练值但有灵露、
  衰减照旧、跨年级按词匹配且外来 id 不污染海拔、+10 首次掌握发放且不重复）
- 房间端到端 5 条（mock Firestore 驱动真 arena.js + 真 ctx：答对入账、结算仍发奖牌）
JS 全部可解析，CSS 括号 718/718。Cache-bust `20260814e` → **`20260814f`**。
⚠️ **仍未在真设备上跑过**：滑杆用手指拖的手感、iPad 上的攀山竞速新比例、帐篷动画在 Chromebook 上
的性能（backdrop-filter + 两个 infinite 动画同屏）。上课前值得亲手过一遍。

## 营地只留露营装备 · 2026-08-14 (owner)

Owner: 「retire everything in the campsite and shop that are not camping related e.g. all the
scenery items」。**地貌景观 (SCENERY) 整族退役**：青松 / 樱花树 / 望山台 / 红枫 / 悬泉飞瀑。
它们是地貌特征，不是露营者会带的东西 —— 营地现在只有装备。

- `SCENERY` 变成**空数组**，没有把它连同 `sceneryUnlocked()` 和两处渲染路径一起删掉：留着空数组，
  哪天 owner 想要地貌回来只是填回一行的事，删掉则要重写三处。
- 商店的「地貌景观」整个分区连同 `sceneryHtml` 一起移除。
- 五张 PNG **留在 `art/camp/` 不再被引用**，和当初园林时期美术的处理方式一致：归档，不删除。
  （所以「每个被引用的 PNG 都存在」这条检查照样通过；反过来的检查——每个 PNG 都被引用——本仓库
  从来没有做过，也不该做。）
- `store.deco` 一如既往**不做清理**，学生已拥有的东西不会因为这次退役而消失。
- **保留的**：九个装备格（住所/照明/探勘/饮水/收纳/起居/茶点/炊事/干粮）全部保留，
  四件小摆件（篝火 / 风铃 / 打盹的猫 / 木牌路标）也保留 —— 都是能背上山的东西。
  ⚠️ 风铃和猫算不算「露营相关」有点擦边（便携化那一轮把它们定为 §2c 小摆件），
  owner 若认为也该退役，照 SCENERY 的做法从 `TRINKETS` 移出即可。

验证（真浏览器，海拔灌满 426/426，也就是旧阈值全部会触发的状态）：营地场景里
`.camp-scenery` 数量为 0，商店没有「地貌景观」字样，五个名字一个都搜不到，
装备与小摆件照常显示，无破图。

## 首页去小字 + 分区标题可读性 · 2026-08-14 (owner)

### 去掉标题下的小字
Owner: 「remove all the small words (e.g. the description of each game, 查看成就墙) under the titles
to reduce visual clutter」。首页每张卡现在只剩**标题 + 右侧动作**：
- 四张游戏/修行卡（词雨灵露 / 攀山竞速 / 组词挑战 / 学习挑战 / 词语闪卡）的说明句
- 徽章条的第二行「查看成就墙 ›」
- 我的词语表的「看每个词的掌握情况 · 🔥 连续 N 天」
- 词山风云榜的「掌握词数 · 历练值 两榜排名（只显示学生）」

保留的：标题、`出发 ›` / `查看 ›`、徽章条的 `成就徽章 · N/M` 计数。
- `camp()` 仍然接收 `desc`，只是不再渲染成可见文字，而是放进 `title` 属性：调用点旁边仍然写着这个
  模式是什么（对读代码的人有用），桌面端悬停也还能看到。**每个模式的正式说明本来就在它自己的配置页
  （`mode-desc`）**，那才是学生真正需要解释的地方，首页只是入口。
- ⚠️ 「🔥 连续 N 天」这个数字**没有消失**，它在 我的词语表 内部的表头照常显示；只是不再在首页和标题
  抢版面。

### 分区标题（复习范围 · 可多选 等）
这些 `.section-label` 是**直接压在画上的**（不像卡片有玻璃底），原本是 `--ink-soft` 浅灰 + 0.28em
超宽字距，在明亮的竹林/天空 ambience 上几乎读不出来 —— 和今天早些时候修的 我的词山 HUD 是同一个
毛病。改成和 `.ach-hint`、词山 HUD 一致的做法：**深色 ink + 玻璃药丸**，字重 700，字距收到 0.2em。
- `display:inline-block`，药丸只包住自己的文字，不会拉成整行的横条。
- 英文提示的 `.enlab` 落在药丸**内部**，读起来是一个标签而不是两截。
- 成就墙和对战徽章分区用的是同一个 class，一并受益。

验证（真浏览器 1440×820 与 375×812）：六条被点名的小字全部搜不到，六个标题与两个动作词都还在，
`camp` 的 `title` 提示保留完整说明；标题药丸背景 `rgba(255,255,255,.78)`、文字 `#243B4A`、
宽度 187px（不是整行 400px）、步骤数字仍在药丸内；375px 下三个标题都不超出视口，无横向滚动。
Cache-bust `20260814f` → **`20260814g`**。

## 首页压缩 + 徽章分区 + 别人的对战徽章 · 2026-08-14 (owner)

### 首页两行化
- **游戏卡一行**：`.camps` 改成 `repeat(auto-fit,minmax(150px,1fr))`，不写死列数（G1/G2 有组词、
  G3/HCL 有汉兜，数量本来就按 stream 不同）。**去掉「出发 ›」**正是腾出这个宽度的前提。
  卡片瘦身：图标 46→40px、标题 17→15.5px、padding 17→13px，高度 68px。
- **成就徽章 / 我的词语表 / 词山风云榜 一行**：新容器 `.home-entries`，≥760px 时按 **1.4fr 1fr 1fr**
  分配（徽章条要放三到五枚徽章图，本来就比另外两张宽），窄屏 auto-fit 回落。徽章缩到 36px。
  **去掉两个「查看 ›」**。
- 「选择方式」→「**选择学习方式**」。

### 成就墙分成两个页签
Owner 问「where are the new challenges badges we just added? where to locate them?」——问题本身就是
答案：对战分区原本挂在整面墙的最下方，**距页面顶端约 5,700px**，等于没人找得到。
现在 `renderAchievements` 有两个页签：**📜 掌握里程碑 / ⚔️ 对战徽章**（`store.achTab` 记住选择）。
实测里程碑页 5,766px，对战页 820px。这也仍然满足 doc §7「别让五枚里程碑被新徽章淹没」——
它们各占一页，谁也不淹谁。对战页去掉了原来那行 `.section-label`（页签本身就是标题）。

### 别人的对战徽章（排行榜点名字）
- `saveScore` 的 `{stream}` 里新增 **`battle`**：紧凑计数 `{rg,rs,rb,rc,pg,ps,pb,pc}`
  （r=结伴登峰 p=同伴挑战，g/s/b/c=金银铜/称号），由 `battleSummary()` 生成。
  **只有数量**，没有日期、没有掌握数据、没有任何词汇信息。为 0 的键不写。
- 榜单每一行现在是 `<button>`，点开 `openPlayerBadges()`：对方昵称 + 学校 + 两个家族的奖牌墙，
  没拿过的显示「还没有拿过奖牌」。**不产生额外的 Firestore 读**——榜单本来就把整份 score doc
  抓下来了，卡片直接用。
- ⚠️ **改动时发现并修掉了自己引入的一个 bug**：榜单在 `.map()` 之后只保留
  `{uid,nickname,school,val}`，把 `r.data` 丢掉了，所以我第一版接的徽章卡对谁都读成空。
  现在 `data` 一并带出。**这是真浏览器跑出来的**，不是读代码看出来的。
- 隐私：只有 `category==="student"` 的档案会发布到 `scores/*`（既有规则未变），昵称本来就是化名，
  展示的一切在榜单上本来就可见。**不需要改 Firestore 规则**（`scores/{uid}` 早就是「登录即可读、
  只能写自己」）。
- ⚠️ 已发布的 `battle` 字段要等学生的设备下一次同步才会出现；在那之前老同学的卡片会显示「还没有
  拿过奖牌」。这是数据新鲜度，不是 bug。

### 验证
真浏览器 1440×820：游戏卡 3 张同一行、三张入口卡同一行、「出发」「查看」全部搜不到、
选择学习方式生效、无横向滚动；成就墙两个页签切换正常且各自的详情卡照常打开、页签选择持久化；
排行榜三行都是按钮，点开显示 `结伴登峰·金牌 ×4 / 银牌 ×2 / 同伴挑战·铜牌`，没拿的不显示，
卡片里搜不到任何「海拔/历练值/已掌握」字样，徽章图全部加载成功，无奖牌的同学显示空状态。
CSS 括号 737/737；`@supports not (backdrop-filter)` 回退块仍在文件**最后**，并已补上
`.ach-tab` / `.section-label` / `.mtn2-tip` 三个新玻璃面。
Cache-bust `20260814g` → **`20260814h`**。

## 滑杆重做 · 攀山竞速三修 · 英文提示补全 · 2026-08-14 (owner)

### 1. 滑杆重做（原版会「一伸一缩」）
Owner: 「the slider bar shortens and stretches depending on which option is chosen」。
原因很直接：读数 `<b class="qty-val">` 是 range 的 **flex 兄弟**，而 `.qty-range` 是 `flex:1`，
所以读数一变宽（「⭐ 两个选项」vs「⌨️ 打拼音 · 一成历练值」差一倍），**轨道就被挤短**。
现在读数**放在轨道上方**，轨道恒为整宽；末端标签（同样是变宽的元凶，还会折成两行）整个删掉，
改成每一档一个小圆点 `.qty-ticks i`，档位一眼可数。
实测：难度五档拖过去，轨道宽度恒为 522px；读数高度 22px 不折行。

### 2. 攀山竞速三修
- **横着跳（真 bug）**：`SPRINT_LEDGES` 里有两对台阶高度几乎相同 —— `0.586/0.583` 和
  `0.156/0.153`，在原图上只差 3 像素。`ledgeH()` 由 y 算世界高度，于是这两步的相机几乎不动，
  人物只是横向平移 —— **正是 owner 说的「sometimes it jumps horizontally」**。两个近似重复的
  台阶已删除，每块砖 6 级，全部明显分层。另加一个启动自检：若将来重新描点破坏了「y 严格递减」
  这个不变量，控制台会直接警告，而不是又悄悄退化成横跳。
- **站在台面上而不是台阶前**：`drawClimber` 原本把脚锚定在 `py + 6`，也就是台面线**下方 6px**，
  看起来就是贴在岩壁上而不是踩在台阶上。现在精灵底边落在 `py`（`py` 本身就是台面），接触阴影
  也移到同一条线。
- **石墙再缩短**：`clamp(220px,26%,360px)` 宽 + **`max-height:min(58vh,430px)`** +
  `align-self:center`（`align-items:stretch` 本来会把它拉满整列高度）。竖屏也加了 `max-height:46vh`。
  实测 1440×820 下石墙 160px 高、占宽 24.5%，题目栏拿走其余。

### 3. 拼音辅助搬到「进行中」的页面
以前只在开赛前的配置页，学生打到一半需要拼音就只能中断计时赛。现在 `.sprint-aid` 在答题页。
⚠️ **切换时只重画选项、不重抽干扰项**（`paintOpts` 闭包保存当前 `opts` 数组）——否则又是
「选项重洗=泄题」：正确答案是唯一每次都活下来的选项。实测切换前后四个选项完全一致。

### 4. 英文提示补全（G1/G2）
Owner: 「G2 speed climbing has no eng support, actually can translate things like 答对 连对 etc」。
`EN_LAB` 从 34 条扩到 **57 条**，补上 HUD 与统计口径的壳文字：
答对/连对/海拔/历练值/正确率/最高连对/已掌握词语/得分/连击/波次/拼对/出题方式/字块数量/时长/
检查/收集/提示/看成绩/再来一次/查看/关闭/返回/板块。
接线点：首页统计条、攀山竞速 HUD、词雨 HUD、组词 rail、填空/MCQ rail、板块筛选行、三个配置页。
- ⚠️ **范围没有变**：仍然只译**导航与壳文字**，题干/释义/句子/选项永远纯中文（和只读中文的
  TTS 规则同一个逻辑）。**不要把 `enl()` 用到词汇数据上。**
- **徽章条溢出（owner 另报）**：`成就徽章 Badges · 0/97` 用的是**行内** gloss，在窄卡里把计数挤出
  了药丸外。改成**块级** gloss（英文在中文下方），并给 HUD/统计里的行内 gloss 加了一条
  `display:block` 覆盖，保证它们永远换行而不是把药丸撑宽。
- G3/HCL 依旧**一个字节的英文都不发**（实测：强行把 `enAid` 设成 true，`.enlab` 数量仍为 0，
  没有 中/EN 按钮，页面搜不到任何英文标签）。

### 验证
真浏览器：滑杆 6 条（含轨道宽度五档恒定）、攀山竞速 7 条（石墙 160px/24.5%、拼音辅助在答题页、
切换不重抽选项、拼音真的出现又能撤回）、英文提示 G2 共 15 条（徽章条不溢出且计数完整、英文在
中文下方、HUD 三项全译、词雨三项全译、收集→Collect、学习支援→Extra help、无横向滚动）、
G3 惰性 4 条。JS 解析通过，CSS 括号 736/736。Cache-bust `20260814i` → **`20260814j`**。
⚠️ 未在真设备上试过：手指拖滑杆的手感，以及攀山竞速新比例在 iPad 上的观感。

## 意见反馈工单系统 · 2026-08-14 (owner)

学生端提交 → 教师端工单队列 → 标记已解决。app.js 未改；改动在 profile.js（表单）、
firebase-init.js（API）、teacher.html（队列）、firestore.rules（新集合 + 防滥用）。

### 学生端
入口在 **我的档案 → 意见反馈 → ✍️ 我要反馈**（每个科目页的顶栏头像、以及落地页都能进）。
四类：📖 词语内容有误 / 🐞 程序出错 / 💡 建议 / ❓ 其他。
随票自动带上：昵称 · 班级 · 学校 · uid · 科目 · 页面文件名 · **构建版本 `?v=`** · UA。
—— 这些正是复现一个 bug 需要而事后又问不到的东西。构建版本从 profile.js 自己的
`<script src>` 上读（和 app.js/arena.js 读 `?v=` 给 JSON 用的是同一招）。
面板里还有一行「你已提交 N 条反馈，其中 M 条已解决」。

### 教师端
新页签 **意见反馈**，带未处理数量红点。筛选：未处理 / 待处理 / 处理中 / 已解决 / 不处理 / 全部
＋类型筛选。每张工单一张卡：状态药丸、类型、时间、正文、来源（昵称·班级·学校·uid 前 8 位·科目·
页面·版本）、可展开的设备信息、**开发笔记输入框**（学生看不到），以及
处理中 / 标记已解决 / 不处理 / 退回待处理，HOD 另有 **封禁此用户**。
- ⚠️ **`createdAt` 是 serverTimestamp，刚写入的那一刻是 null**，所以列表**在客户端排序**，
  不用 `orderBy` —— 否则最新的一条会从查询结果里消失。同一个坑在 `listFeedback` 里也注了。
- ⚠️ teacher.html **不加载 firebase-init.js**（一直是独立页），所以队列用它自己的 `db` 句柄。
  第一版写成了 `WSCloud.*`，会直接抛错；已全部改掉。
- ⚠️ **抓到一个自己写的 bug**：筛选默认值写成了 `"open"`（处理中），于是**刚送到的
  待处理工单一进页面就是隐藏的** —— 恰恰是最需要看见的那一批。默认已改为 `"todo"`（待处理+处理中）。
  是浏览器实测抓到的，读代码不会发现。

### 防滥用（分层，且要分清哪一层真的有约束力）
⚠️ **额度已于同日改为默认 20/天并加上 `feedbackQuota` 覆盖，见本节末尾的「额度修订」。
下面 `0-4` 的描述是初版，已作废。**
1. **规则层（真正的强制）—— 工单 ID 就是限流器。** ID 必须是
   `{uid}__{YYYY-MM-DD}__{n}`，`n` 只能是 0-4。Firestore 规则**没法数文档**，所以「每天最多 5 条」
   通常做不到；但如果每人每天只有五个合法文件名，而 `create` 在文档已存在时会失败，
   那 5 就是**服务端硬上限，且零额外读取**。ID 必须以本人 uid 开头，所以也无法伪造他人工单。
   规则另外强制：`uid` 必须等于登录者、`status` 建立时必须是 `new`（不能自封已解决）、
   `type` 限枚举、正文 5–1000 字、并 `exists()` 检查封禁名单。
   - 日期段用 `request.time` 校验，容差 ±1 天：`request.time` 是 UTC 而 App 盖的是新加坡日期（+8），
     早上 7 点提交在 UTC 已是「明天」。代价是跨午夜可以拿到 24 小时内 10 条 —— 用误伤真实提交
     换这个漏洞，划算。
2. **客户端（只是礼貌层）**：30 秒冷却、本地当日计数、最短 5 字。**可以轻易绕过，不作为依赖**，
   作用是挡住连点和误触，并给出友好提示而不是被拒写。
3. **署名**：每张工单都带昵称+班级+学校。在学校场景里，可追溯比任何技术手段都管用。
4. **封禁**：HOD 一键写 `feedbackBans/{uid}`，规则里的 `exists()` 直接挡下后续提交。
   被封禁者的学习功能完全不受影响。
⚠️ **诚实的边界**：没有 Cloud Functions / App Check，就**做不到**真正的按分钟限流，也拦不住
一个铁了心的学生把自己当天的 5 格填满废话。对这种情况的答案是封禁，不是再加规则。
⚠️ **学生只能读自己的工单**，不能读别人的，提交后也**不能再编辑**（规则不给 update）——
否则老师回复后学生可以改写原文。

### ⚠️ 必须先发布规则
`firestore.rules` 新增 `feedback/{ticketId}` 与 `feedbackBans/{uid}` 两块。**发布前，学生提交会
permission-denied，教师页签会显示读取失败**，其余功能不受影响。owner 的副本
`Documents/VocabSummit/firestore/` 已同步。发布后建议在 Rules Playground 各试一次：
以学生身份建 `uid__今天__0`（应通过）、建 `别人uid__今天__0`（应拒绝）、
建 `uid__今天__5`（应拒绝）、以学生身份改自己工单的 status（应拒绝）。

### 验证
真浏览器（学生端用模拟云层，教师端用 mock Firestore + 文档里那套 `window.__T` 导出钩子）：
学生端 14 条 —— 入口存在、四个分类、配额显示、太短被拒且不写库、成功提交、
**ID 形如 `UID_ME__2026-08-14__0`**、带齐 type/stream/page/appV/ua、带齐署名、status 强制 new、
本地计数推进、面板显示「你已提交 1 条」、30 秒冷却拦住连续提交；
**把客户端护栏全部绕过后连打 9 次，仍然只写进 5 条，槽位恰好 0-4** —— 硬上限成立。
教师端 12 条 —— 队列渲染、默认「未处理」同时含待处理与处理中、已解决默认隐藏、正文/署名/
开发上下文齐全、标记已解决落库、开发笔记落库、handledBy 记录、已解决自动退出未处理队列、
红点归零、已解决筛选找得回、类型筛选生效。
teacher.html JS 解析通过（注意：文件里有**两处**字面量 `<script>`，其中一处在注释里，
抽取脚本要用 `indexOf` 而不是 `lastIndexOf`），CSS 括号 124/124。
Cache-bust `20260814j` → **`20260814k`**。

## 反馈额度修订 + 为什么不加验证码 · 2026-08-14 (owner)

Owner 追问：「will it work better if we introduce a simple captcha? actually students who are
productive may surface more than 5 issues and this will help the app to improve」。

### 验证码：评估后**否决**，不要再提
- **威胁模型对不上。** 验证码防的是**机器人**。这个 App 没有公开注册、没有可抓取的价值、
  没有 SEO 动机，登录还是匿名 auth —— 现实中的滥用者是**一个无聊的学生手打垃圾内容**。
  验证码对人类毫无作用，他解完照样能打垃圾。
- **代价落在错的人身上。** 唯一被拖慢的是那个认真写了三行复现步骤的学生。
- **自制验证码等于没有。** 纯前端题目（「3+5=?」）的答案必须在前端可校验，改一行 JS 就绕过；
  要真校验就需要服务器，而本项目是 GitHub Pages，没有服务器（这也是 PWA/service worker
  一直被排除的同一个约束）。
- **第三方验证码另有问题**：reCAPTCHA/hCaptcha 要加载外部脚本，学生是未成年人，涉及第三方
  数据；Firebase App Check 才是「正经」版本，但它解决的是**证明请求来自你的 App**，
  不是限制一个已登录的人类提交次数 —— 依然答非所问。
**结论：验证码不解决这里的任何问题，只会惩罚我们最想要的用户。**

### 真正该改的：额度从 5 提到 20，并可按人调整
Owner 的第二句话才是关键 —— 一个下午发现 8 个真问题的学生，是这个功能**最有价值的用户**，
为了防一个假想的捣蛋鬼把他卡在 5 条，是**优化错了对象**。
- **默认 20/天**（原 5）。ID 限流机制不变，只是 `n` 的上限改由 `fbQuota()` 决定。
- **`feedbackQuota/{uid}` = `{max}`** 可按学生覆盖：调高给高产的同学，**填 0 即等于停用**。
  文档不存在 = 用默认值。
- ⚠️ **`feedbackBans` 集合已取消**，合并进 `feedbackQuota`（`max: 0` 就是封禁）。
  一个控件比两套机制好，教师端也只剩一个「额度…」按钮（HOD 可见，prompt 输入：
  留空恢复默认 / 数字设额度 / 0 停用）。
- 客户端冷却 30s → **20s**（额度放宽后，冷却的作用只剩防连点）。
- ⚠️ **额度在每次打开表单时重新读取一次**，不是每次载入页面只读一次。第一版做了缓存，
  结果是：老师中途给某个学生调高额度，学生不重载页面就看不到，**而且客户端会在旧的低数字上
  停止尝试，即使规则已经允许更多** —— 等于老师的操作无效。这是浏览器实测抓到的。
- ⚠️ `max` 只是**客户端提示**（告诉它该试几个槽位），`submitFeedback` 里 `delete payload.max`
  确保它不写进工单。用 `delete` 而不是设 `undefined`：**Firestore 遇到 undefined 会直接抛错**。
- ⚠️ 额度为 0 时的文案单独处理：否则会显示「今天已经提交 **0** 次了，明天再来吧」这种病句。
  现在是「这个账号暂时无法提交反馈，请直接告诉老师」。

### 仍然诚实的边界
提高额度不会让滥用变容易多少 —— 挡住滥用的从来不是数字，而是**署名**（每张工单都带昵称+班级+
学校）和**可停用**。真正做不到的仍然是按分钟限流，那需要 Cloud Functions。

### 验证
真浏览器：默认额度 20 条（连打 25 次只进 20 条）、覆盖为 50 时进 50 条、覆盖为 0 时一条都不进；
表单显示正确剩余数；**老师中途调高额度，学生不重载页面即可生效**；`max` 未写入工单；
额度 0 的文案正确且不写库；恢复默认后一切照常。规则括号 32/32，四个 JS 文件解析通过。
Cache-bust `20260814k` → **`20260814m`**（跳过 l，避免和数字 1 混淆）。
⚠️ **规则仍未发布**：新增 `feedback/{ticketId}` 与 `feedbackQuota/{uid}`（取代 `feedbackBans`）。
owner 副本已同步。

## Owner batch, 2026-08-14 (深夜) — 反馈入口 · 音效补全 · 徽章练习方式 · 拼音移到顶栏 · 排版

### 1. 意见反馈入口：浮动按钮（gov.sg 模型）
Owner 问「像新加坡政府的笑脸调查那样常驻左下角，是好模型吗？」——**位置借用，机制不借用**：
- ✅ **常驻左下角**：这是那个 widget 真正的价值 —— 零导航、随时可点、抓住当下。原本入口在
  我的档案里往下滚两层，owner 自己都找不到，这已经证明了。
- ❌ **不做 😊😐☹️ 评分**：笑脸收的是**满意度**，而这里需要的是**可执行的缺陷报告**。
  一堆笑脸不能告诉我哪个填空句坏了。（真要做满意度，那是「学习成效评估」那条路线的事，
  混进 bug 队列只会污染它。）
- ⚠️ **计时游戏中隐藏**（词雨灵露、攀山竞速）。左下角正是词雨词语落下的地方，计时赛里的误触
  正是可及性那一轮花整整一场清掉的隐患。学生打完再报，什么都不损失。
- 手机上收成 44px 圆钮（只剩图标）；z-index 55，永远在弹窗(60)和房间(90)之下。
- ⚠️ **顶栏那个 💬 已删除** —— 一个功能两个入口只会让人犹豫。
- **报错时自动带上「正在看哪一题」**：`window.WS_FEEDBACK_CTX()` 由 app.js 在每个出题画面
  设置（填空/选择/闪卡/组词/攀山竞速），首页清空。学生看到一句「正在看：填空挑战 · 港口 ·
  G1-0178」，教师端工单上是一条 📍 行。**发现句子有问题的那一刻正是在答题**，让他事后回忆
  是哪个词，等于丢掉最关键的信息。

### 2. 音效补全（owner：攀山竞速和词雨答对没有声音）
逐个模式查过，真的有三个缺口：
- **攀山竞速答对**：以前只有两声很轻的连击音（`tone()`），**没有其他模式都在用的
  `sfxOk()` 三音上行奖励音** —— 听起来就像没声音。现在 `sfxOk()` 必响，连对 ≥3 再加一记高音。
- **词雨提交错误**：只有抖动动画，**完全无声**。补上 `sfxBad()`。
- **房间模式答错**：无声。arena 没有自己的音频（刻意隔离），所以走 `ctx.sfx("bad")` 这个新钩子；
  房间里的词雨落空同理。
其余全部本来就有（填空对/错、华文解释对/错、组词对/错、汉兜、词雨接住、词雨掉命）。
实测方法：**劫持 `AudioContext.createOscillator` 数振荡器个数** —— 「有没有声音」这件事没法靠
读代码确认，只能数实际发声。

### 3. 徽章「去挑战」可选练习方式
以前固定跳 填空挑战。现在卡片上有 **填空 / 华文解释 / 英文翻译 / 闪卡** 四个 chip（`store.compMode`），
只显示该板块真的可用的（有 `__` 空格、有英文释义）。
⚠️ **填空那颗标了「点亮徽章」，并附一句说明**：填空挑战才是掌握闸门，选华文解释全对也不会点亮
徽章。不写清楚的话，学生答完一轮发现徽章还是灰的，只会觉得程序坏了。
按钮上的题数**跟着所选方式实时变**（不是每个词都有填空句）。

### 4. 拼音辅助搬到顶栏（owner）
和 中/EN 并排的 `拼 拼音` 药丸，`pyAidAvailable()` 为真时出现（G1/G2/G3，HCL 永远没有）。
- 原来分散在 填空 rail、学习挑战配置页、攀山竞速配置页/答题页四处；**现在只有顶栏一处**，
  `pyAidToggleHtml()` 保留但返回空字符串（调用点不必逐个删）。
- 机制：`_pyApply` 是「当前画面的重绘钩子」，`setTopbar` 清空、有拼音界面的画面再注册。
  ⚠️ 重绘的是**当前这批选项**，绝不重抽干扰项 —— 又是「选项重洗=泄题」。实测填空与攀山竞速
  切换前后四个选项完全一致。
- 两个药丸都放大到 **42px 高**，字号 17/13，文字完全在药丸内（实测 `scrollWidth ≤ width`）；
  `.topbar{min-height:60px}`。640px 以下 `拼音` 二字隐藏只留「拼」，按钮本身不消失。

### 5. 选项 并列一排
`.diff` 从 `flex-direction:column` 改成 `flex-wrap:wrap`，`.dopt` 改 `flex:1 1 auto` 居中。
题型／题目类型／出题方式 都只有二到五个字，竖着排浪费了大半个面板。攀山竞速配置页高度
从一屏多降到 438px。长标签或窄屏会自动换行。

### 6. 组词字块排成整齐矩形
16 块在 3 列下是 5 行 + 1 个孤儿。`asmCols(n)` 从 `ceil(sqrt(n))` 出发找能整除的列数，
上限 5（再多就点不动了）：6→3×2、9→3×3、12→4×3、16→4×4，全部实测为完整矩形。
宽度跟着列数走，4 列时不会把字块挤扁。

### 7. 攀山竞速石墙：**先前改小改错了方向**
⚠️ 上一轮为了「缩小」同时限制了宽和高，结果是一个又矮又扁的框、瓦片被放大、**人物被裁掉**
（owner：「I can't even see the full avatar」）。真正过大的是**宽度**。现在：
`flex:0 0 clamp(240px,30%,430px)` + **不设 max-height** + `align-self:stretch`。
实测 1180×820 下石墙 336×752（占满整个 shell 高度），题目栏 771px。
**教训：把两个轴一起压是错的 —— 该改的只有一个轴。**

### 验证
真浏览器 1180×820 与 375×812，全部通过：反馈浮钮 6+7 条（位置/尺寸/层级/一键打开/带题目上下文/
计时游戏中隐藏/答完恢复/手机收成圆钮）、音效 8 条（数振荡器：填空对错、华文解释错、攀山竞速
对（3 个振荡器 = sfxOk）与错、词雨错与对）、徽章练习方式 8 条、拼音顶栏 8+7+7 条（含
「切换不重抽选项」在填空与攀山竞速两处）、并列一排 6 条、字块矩形 7 条、石墙 8 条。
CSS 括号 763/763，四个 JS 文件解析通过。Cache-bust 一路推到 **`20260814u`**。
⚠️ 仍未在真设备上验：顶栏三个药丸在 iPad 竖屏的观感、浮钮在 iPad 上是否挡到内容。

## 界面拼音 · 2026-08-14 (owner: 弱读者看不懂界面)

Owner：「pinyin toggle should also support the dashboard - students who are weak can't read this
and can get overwhelmed」。顶栏那颗 `拼 拼音` 现在同时驱动**界面文字的拼音注解**，不只是选项拼音。

- **`PY_LAB`（57 条）与 `EN_LAB` 一一对应**，`pyl(key)` 与 `enl()/enli()` 同机制：
  span **永远在 DOM 里**，靠 `body.py-aid` 用 CSS 显隐。所以切换是**一次 class 翻转**，
  不重绘任何东西 —— 也就结构性地不可能触发「选项重洗=泄题」那类问题。
- **范围和英文提示完全一致：只注解导航与按钮壳文字**，题干／释义／句子／选项永远纯中文。
  这条不要放宽。
- ⚠️ **拼音是手写的，不是生成的。** 客户端刻意没有 hanzi→pinyin 表：这些是固定字符串，
  手写就彻底避开多音字（得分 dé、时长 cháng、正确率 lǜ、我的 de）。
  **以后每加一条 `EN_LAB` 就顺手补一条 `PY_LAB`** —— key 缺失时 `pyl()` 返回空字符串，
  漏了是静默的，不会报错。
- **覆盖方式**：把每一个 `enl("X")/enli("X")` 站点都镜像成 `pyl("X") + enl("X")`（48 处正则批改
  + 3 处 key 是变量的手动补：`camp(name)`、`QUIZ_MODES(x.zh)`、`SPRINT_MODES(m.zh)`）。
  这样**两种辅助的覆盖面天然一致**，不会一个有一个没有。
- ⚠️ **顺序：拼音在上，英文在下。** 第一版把 `enl` 放在前面，结果英文压在中文和拼音之间 ——
  拼音解的是学生眼前这套字，必须**紧贴中文**。已全部对调。
- HUD／统计药丸里沿用 `.enlab.i` 那条规则：拼音**换行到下方，绝不撑宽药丸**。
- **HCL 一个字节都不发**（`pyAidAvailable()` 为假）：实测把 `pyAid` 强设为 true 后，
  `.pylab` 数量仍为 0、body 没有 `py-aid`、页面搜不到任何拼音。G1/G2/G3 都有。

### 验证
真浏览器 1440×860：关闭态 16 个 `.pylab` 已在 DOM 但不可见（证明是 CSS 闸门而非重绘）；
打开后 复习范围／选择学习方式／词雨灵露／攀山竞速／组词挑战／学习挑战／词语闪卡／我的词语表／
词山风云榜／成就徽章／已掌握词语／历练值／正确率／最高连对／题型／每次题数／填空挑战／华文解释
全部带拼音；声调符号正常；两种辅助同开时拼音在中文正下方、英文再下一行；卡片不溢出、
无横向滚动；攀山竞速 HUD 的 答对/连对/海拔 都有拼音且不撑宽栏位；HCL 惰性 5 条。
CSS 括号 768/768，JS 解析通过。Cache-bust → **`20260814x`**。

## 昵称/头像掷骰 · 学校搜索 · 界面注音对齐 · 2026-08-14 (owner)

### 1. 昵称可以一直重掷
以前 🎲 只在第一步，掷一次就跳到确认页，想再换只能「‹ 重新选择」走回四步选词。现在
`rollNick()` 抽一对 描述词·名词，**确认页上常驻一颗金色 `🎲 换一个`**（`.np-name-row` /
`.np-roll`），掷到满意为止；身份、学校、搜索词都存在 `st` 里，所以重掷不会把已填的东西清掉。
⚠️ **昵称选择器有两份**（`nickname.js` 给落地页、`app.js` 给科目页），按既有约定**必须保持一模一样**
—— 本次六处改动两边都改了。

### 2. 头像也能掷
选择器底部多一颗 `🎲 随机抽一个`，掷出的头像走**同一张 AvatarInfoCard**（`openAvatarInfo` 新增
`opts.onReroll` → `🎲 再抽一次`），所以掷骰和手点看到的是同一张卡、同一段简介。
- **掷骰只在当前分类里掷**（选了「西游记」就只掷那 5 个），且**不会连着掷出同一个**（重复会让人
  以为按钮坏了）。
- **掷到之前什么都不写**，仍然要按「选用这个头像」才落盘 —— 和 §0.5 定下的「点头像先看简介」
  同一个契约。

### 3. 学校下拉加搜索（146 所学校）
`SG_SCHOOLS` 新增 `normQ` / `matches(q)` / `searchHtml(id,q)` / `wireSearch(input,select,onPick)`，
`optionsHtml(sel, q)` 现在接受查询词。三处调用点（`nickname.js`、`app.js` 的昵称选择器、
`profile.js` 的我的档案）都换成「搜索框 + 下拉」。
- 匹配整串 `"中文 English"`，所以「培华」和「pei hwa」找到同一行，大小写不敏感。
- **只剩一个匹配时自动选中**，学生不用再去点下拉。
- **已选的学校永远留在自己的下拉里**，哪怕它不匹配当前搜索词 —— 搜索绝不能把已经选好的悄悄弄丢。
- 一个都搜不到时插一条 disabled 的「没有找到，请选「其他 Others」」。⚠️ 判空要用**加回已选项之前**
  的命中数（`hits`），否则已选项会把列表撑成非空，提示永远不出现（第一版就是这个 bug，浏览器里抓到的）。
- ⚠️ **搜索框的输入处理绝不能调用 `render()`** —— 整页重绘会把焦点从输入框上抢走，学生还在打字。
  它只重建 `<option>`，`draft.schoolQ` / `st.schoolQ` 让搜索词挺过其他原因触发的重绘。
- `.nav-row` 加 `flex-wrap:wrap`、`.nav-btn` 改 `flex:1 1 116px`：三颗按钮的弹窗（返回 / 再抽一次 /
  选用）在 375px 下折成 2+1 行，宽屏行为不变。

### 4. 界面注音/英文提示对不上（owner: 「拼音按钮下面写 pīn yīn fǔ zhù 但没有辅助两个字」）
逐点扫了所有 `pyl()` 调用点，把**屏幕上的中文**和**注音用的 key** 做了机器比对，四处真错：
| 位置 | 屏幕上 | 原 key（错） |
|---|---|---|
| 顶栏拼音药丸 | 拼音 | 拼音辅助（多念了两个字） |
| 首页 ① | 复习范围 · 可多选 | 复习范围（可多选没注音） |
| 首页 ② | 选择学习方式 | 选择方式（学习没注音） |
| 首页 ③（闯关页） | 词语游乐场 | 今日路线（**整串注音都是别的词**） |

**规则定死：key 必须就是屏幕上那串中文。** 表里的 key 因此改成完整可见文本
（`"复习范围 · 可多选"`、`"选择学习方式"`、`"词语游乐场"`、`"今日路线 · 选择你的营地"`、`"拼音"`）。
顺手补上从来没有注音的：同伴挑战配置页（标题 + 题型）、成就墙标题、成就墙两个页签、
汉兜/组词/闪卡/填空/华文解释/英文翻译的 rail 标题（`railHtml` 直接用 `name` 做 key —— 四个调用点
传的本来就是表里的 key）、汉兜「连胜」、以及 关闭/再来一次/再来一局/回到营地/检查/提示/看成绩
这些**表里早有 key 却没接上**的按钮。EN_LAB/PY_LAB 各 66 条。
- ⚠️ **加了三个自动检查，以后改这两张表先跑一遍**：(a) 两张表 key 完全一致；(b) 每条拼音的**音节数
  等于 key 里的汉字数**（多音字表里再多一个字就会被抓出来）；(c) 每个调用点可见中文 == key。
  本次三项全绿（0 不一致 / 0 音节错位 / 0 调用点错配）。
- 范围没有变：仍然只注**导航与按钮壳文字**，题干／释义／句子／选项永远纯中文。

### 验证
真浏览器（`python3` + no-store handler + 127.0.0.1，本次 Browser pane 接受且**截图正常**）：
昵称连掷 6 次得 6 个不同名字且按钮常驻；学校搜索 hua/培华/pei hwa/nanyang/zzzz/清空 六种情形
（含只剩一个自动选中、已选项被保留、无匹配提示）；整条链路 选中→确认→`ws2_profile.school` 落盘正确；
我的档案里搜 hwa chong → 保存 → 落盘；头像掷骰 21 选 1、卡片三颗按钮、连掷 6 次不重复、
掷到前不写 `avatarId`、选用后顶栏立刻换图、375px 下按钮折 2+1 行不溢出；分类筛选后只在该分类里掷；
G2 注音在中文下、英文再下一行，rail 标题「填空挑战 / tián kòng tiǎo zhàn / Fill in the blank」；
**HCL 仍然一个字节不发**（强开 pyAid/enAid 后 `.pylab` `.enlab` 均为 0）。零控制台错误，
三个 JS 解析通过，CSS 括号 773/773。Cache-bust `20260814x` → **`20260814y`**。

## 攀山竞速 视觉调整 · 2026-08-14 (DESIGN_sprint_climb_visual_2026-08-14.md)

文档三条独立要求，全做了。**同一批未部署，所以 cache-bust 仍是 `20260814y`**（`y` 还没上线，
这次改动跟它一起发即可，不必再进一位）。

### §1 石墙不再顶满屏
`.sprint-shell` 的 `100vh/100dvh - 68px` 改成 **`94vh/94dvh - 68px`**。实测 1280×820 下高度
703px（86% 视口），墙底离视口底还有余量；改之前 shell 底边在 842px、已经超出 820 的视口。
`min-height:0` / `overflow:hidden` 一个都没动（那条「不许再放大于视口的 min-height」的警告仍然有效）。
94 是单个数字，觉得不对就在 88–96 之间调。

### §2 新墙砖 948×1659（原 1024×1536）+ 重描台阶
- `art/bg/climb-wall-tile.png` 原地替换（文件名一致，代码零改动）。2.6MB，比旧图 3.3MB **还小**。
- **接缝检查通过**：新图上下缘都是白雾带，跨接缝的平均逐通道色差只有 **7.2/255**，肉眼看不出
  —— 比旧图那条「近似但不完全对齐」的接缝好。
- **`SPRINT_LEDGES` 从 6 条重描成 11 条**，而且是**按像素扫描描的，不是用眼睛描的**：逐行找宽度
  ≥120px 的亮米色连续段（允许 ≤18px 的缝，跳过藤蔓和花），连成组件，取每块石台**受光顶面的中线**
  作为 y —— 取最上沿会让人站到石台后面去。11 块的位置用「把线画回原图」渲染确认过。
  y 严格递减，最小间距 0.045，跨砖回绕一步 0.203（旧图那一步是 0.352），既有的 dev-guard 不报警。
- `x` 现在**只是记录**（描出来的石台中心），movement 不再读它 —— 但保留下来，万一以后要恢复横向
  移动就不用重描。

### §3 攀登只上不横移
`frame()` 里插值 `ledgeX(i0)→ledgeX(i0+1)` 的那段删掉，人物恒定站在 `W*0.5`，`faceLeft` 恒 false，
`ledgeX()` 整个函数删除（已无人调用）。实测人物像素质心 x = **0.498**，两次答对后仍是 0.498。

⚠️ **一个必须让 owner 知道的后果（不是 bug，是这个决定的必然结果）：新图 11 块石台里只有 3 块
（y=0.774 / 0.364 / 0.124）横跨画面中线**，所以另外 8 级，人物是**贴在石壁上而不是站在石台上**的
（截图确认）。「攀岩者扒着岩壁」这个读法说得通，但如果 owner 想要「每一步都踩在石台上」，
最省事的改法是**把 `SPRINT_LEDGES` 删到只剩那 3 块**（每答对一题爬得更高、跨度更大），
而不是把横移改回来 —— 横移正是这次要去掉的东西。

### 验证
真浏览器 1280×820 与 375×812：新墙渲染无破图、无控制台错误、dev-guard 不报警；shell 高度
703/695px（86% 视口）；答对一题 → 海拔 1 米、墙向下滚、人物只升不横移；人物质心恒在 0.498。
app.js 解析通过，CSS 括号 773/773。
⚠️ 未在真设备上跑过：iPad/Chromebook 上 94vh 的实际留白，以及新墙砖在低端机上的解码开销
（2.6MB PNG，比旧的小，但仍是本仓库最大的单张图之一）。

## 攀山竞速 落点修正 + 新墙砖 + 答对音效 · 2026-08-15 (owner)

### 1. 人物跳到石台上，不再原地上升
Owner: 「ensure that the sprite jumps and lands on the platforms instead of just bouncing vertically
upwards on nothing」。**推翻 2026-08-14 的「只上不横移」**（那一版我当场就量过并写在上一节里：
11 块石台只有 3 块跨中线，另外 8 级人物是贴在岩壁上的）。
- `frame()` 恢复 `ledgeX(i0)→ledgeX(i0+1)` 插值，`faceLeft` 恢复按方向翻转，`ledgeX()` 复活。
- **跳跃弧高改成跟横向距离挂钩**：`0.05 + 0.05 × min(1, |Δx|/0.35)`，横跨半个屏幕的一跳看起来才像
  「跳」而不是「滑」；短跳也保底 0.05，不会变成平移。
- ⚠️ **`SPRINT_LEDGES.x` 重新变成关键数据**（昨天那句「informational only」已改掉）。以后换墙砖，
  x 和 y 必须一起重描。

⚠️ **验证方法上的一个教训，值得记下来**：我第一次在浏览器里量「人物脚下是不是石台」，扫到的全是暗
色像素，差点判成没踩上。原因有两个，都不是 bug：(a) **Browser pane 隐藏时 rAF 被冻结**，我量到的是
一帧旧画面（甚至是上一局结束前的）；(b) **人物精灵和石台差不多宽**（sprite 64px vs 石台 59–62px），
再加上脚下的接触阴影，像素扫描扫到的全是人物自己。真正能定案的是**用 Python 按同一套公式重放一遍
绘制**（tileH、curH、sy 全部照抄），结果显示锚点行 x 100–158 全是石台亮像素 —— 几何是对的。
以后再遇到「画面上看起来不对」，先复算，别急着改代码。

### 2. 新墙砖（当天换了三版，最终 887×1774 · 比例 2.0 · 真 PNG）
- **前两版是从会话 transcript 里取出来的**：owner 把图**贴进对话**而不是存成文件，
  Downloads/Desktop 都搜不到；`~/.claude/projects/…/<session>.jsonl` 里带着 base64 原文，解出来即可
  （这一招记下来）。⚠️ 但**贴图管线会转成 JPEG 并缩到 666 宽**，拿到的是有损副本。
  **最终这一版 owner 直接把文件放进 Downloads（`new sprint.png`）**，所以入库的是无损原图 —— 
  以后要换图就走这条路，别走贴图。
- **三版的接缝质量，量出来的**（跨接缝逐通道平均色差，越接近图内相邻行的自然波动越好）：
  无雾版 **31.9**（图内均值 12.1、最大 20.4 → 明显看得出砖缝错位）→ 加白雾带 **12.3**（落进正常波动
  区间）→ 最终版 **0.7**（上下缘都是纯白 254，28 个抽样里 **28 个**都比它更「跳」→ 完全看不见）。
  **结论固化：这个仓库的竖向平铺图，上下缘必须收进白雾。**
- **`SPRINT_LEDGES` 重描成 16 条，并且这张图需要多一道「阴影检验」。** 这面墙比前几版亮，
  **被照亮的砖顶会骗过单纯的亮度阈值**：36 个候选里只有一半是真石台。判据加成三条 ——
  宽度 100–160px、顶面亮度 ≥165、**且下方约 14px 处要暗 ≥38 个亮度**（真石台有底面阴影；
  砖顶没有；雾带则是下面更亮，直接被负值筛掉）。筛完 16 条，最小间距 0.033，跨砖回绕 0.103，
  16 个 (x, y) 全部落在石台像素上并把标记画回原图肉眼复核。
  ⚠️ **以后重描这张图，务必连阴影检验一起跑**，只按亮度扫会把人物放到砖头上。

### 3. 答对音效：真有 bug，不只是没听见
Owner: 「there still isn't the positive feedback sound when players answer correctly through the
whole platform」。逐个模式查过，**每个模式确实都调用了 `sfxOk()`**（填空的普通分支和拼音分支都在，
选择题、词雨、汉兜、组词、攀山竞速、房间模式也都在），所以不是漏接线。真正的问题在 `tone()`：
- ⚠️ **`AudioContext.resume()` 是异步的。** 旧代码 `resume()` 之后**立刻**按 `c.currentTime + start`
  排音符 —— 而此时时钟还是冻结的，等上下文真正跑起来，这些时间点已经过去，浏览器**静默丢掉**它们。
  这正好发生在上下文被挂起之后：切到别的 App、锁屏、来电、标签页切后台。已改成**等 resume 的
  Promise 落地再排音符**。
- **解锁监听不再是 `once:true`**：只在第一次 pointerdown 解锁，意味着中途被挂起后就再也没有机会在
  用户手势里恢复了。现在每次 pointerdown 都顺手 resume（那句 0 音量的 speech 预热仍然只做一次）。
- 另加 `visibilitychange` 回到前台时 resume。
- **音量和音色也调了**：0.12 的正弦在教室里的平板喇叭上几乎听不见 —— 即使代码在响，人也会说「没有
  声音」。改成三角波 0.20/0.20/0.24 三音上行 + 一颗 1760Hz 的高音点缀。
- 实测（真浏览器，劫持 `createOscillator` 数发声）：答对 8 次全部四音齐发（660/880/1175/1760），
  答错 10 次都是 180 蜂鸣；**把上下文 `suspend()` 之后再答对，点击瞬间一个振荡器都没建（旧代码会
  在这里凭空丢音），等 resume 落地后四个音符全部以 running 状态、正确的 0/0.08/0.16/0.16 时序排上**。
- ⚠️ 仍然解释不了的一种情况：**iPad 的静音开关会掐掉 WebAudio**（网页无法绕过）。若设备侧静音，
  上面这些都听不见。上课前请先确认 iPad 没开静音、音量不是最低。

### 验证
真浏览器 1280×820：最终墙砖加载为 887×1774、无破图、白雾带在画面上正常显示；人物脚下放大截图
确认**踩在石台上**且石台在靴子两侧都露出来；音效如上；`app.js` 解析通过，CSS 括号 773/773。
Cache-bust `20260814y` → **`20260815`**（新的一天，回到纯日期）。
⚠️ 仍未在真设备上跑过：iPad 上的落点手感、以及答对音效在教室环境里的实际响度。

## 营地经济跨年级隔离 · 审计 2026-08-15 (owner 问)

Owner: 「check that the campsite upgrades only stay in their respective mountains … so that players
don't grind in G1 to spend in other levels」。**结论：已经是完全隔离的，没有任何跨年级通道。**
下面五条是逐条查过的，写下来免得以后重查：

1. **本地存储天然分家。** app.js 全文只有一个存储键 `STORE_KEY = "ws2_" + STREAM`，三处
   `localStorage` 读写全部用它；`lingLu` / `deco` / `equip` / `decoPos` 都住在这个对象里。
   **app.js 从不读别的年级的 store** —— roadmap 第 2 条「跨年级掌握继承」始终没做，所以连
   union 的代码路径都不存在。
2. **唯一跨年级读取**是 profile.js 的 `masteredCount(streamKey)`，只为「我的进度」那四个数字读
   `ws2_*.mastered`，不碰钱包、不写入。
3. **云端按年级分键**：`saveProgress(STREAM, store)` → `users/{uid}.progress[streamKey]`，
   `getProgress` 也只读同一个键；而且**营地字段根本不在 `mergeCloudProgress` 里**，所以即使云端
   恢复也搬不动钱包。
4. **进度码搬不了**：只编码「掌握位图 + 5 个最佳成绩」，钱包和装备一个字节都不在里面；而且别的
   年级的码会被直接拒绝。
5. **房间模式不漏**：跨年级房间里答对，`ctx.roomCorrect → awardLingLu → store.lingLu` 记在**自己
   这个年级**的钱包上。

**真浏览器实测**：给 G1 灌 5000 灵露 → 在 G1 营地买下木牌路标（45）→ G1 变 4955 且拥有该装备；
同一时刻 G3 的 store 仍是空的。打开 G3 营地：钱包 0、只有免费帐篷、没有任何可兑换按钮。
把 G1 的进度码贴进 G3 的恢复框：被拒 —「这个进度码属于其他 subject level（G1）」，G3 掌握数仍为 0。
测试注入随后已还原。

⚠️ 仍然成立的一点（这是设计，不是漏洞）：学生**可以**挑简单的年级刷灵露，但只能在**那个年级的
营地**里花。想装点 HCL 的营地，就得在 HCL 里赚 —— owner 担心的「在 G1 刷、去别处花」不可能发生。

## 拼音/英文提示全面覆盖 · 2026-08-15 (owner)

Owner: 「pinyin and english support for G1/G2/G3 needs to extend to everything, including the
question, options, instructions, prompt type … check the whole page」，随后补充
「the single characters and questions won't need english translations」。

### 范围（这两句话合起来定死了边界，别再放宽也别再收窄）
- **英文**：只译**导航与壳文字** —— 指令、按钮、题型/难度/出题方式这类**命名选项**、HUD 标签。
  题干、句子、释义、选项词、单字**永远不译**。这和只读中文的 TTS 规则是同一个沉浸逻辑。
- **拼音**：壳文字**加上**题目内容 —— 句子/释义走既有的 `<ruby>` 注音（zhPy/clozePy），
  组词的**单字块**走新的 `charPy()`。

### 改动
- ⚠️ **`enAidAvailable()` 由 G1/G2 扩到 G1/G2/G3**，现在直接 `return pyAidAvailable()`，两个辅助
  同进同退。HCL 仍然一个字节都不发（实测强开两个 flag 后 `.pylab`/`.enlab` 均为 0、无 ruby）。
- **EN_LAB / PY_LAB 由 66 条扩到 118 条**：出题方式四项、难度五档、11 条题目指令（q-tag）、
  🔊 按钮、提示按钮、五个板块名，以及**七块配置页说明文字**（学习挑战/攀山竞速/词雨/汉兜/同伴挑战）。
- **`一成历练值` → `10% 历练值`**（owner 要求英文写 10% XP；一成 对 G1 读者太文了，中文一并改成
  10% 才和英文对得上）。出现在难度档、组词出题方式、两处 q-tag。
- 新增三个渲染助手，**它们的存在本身就是防错机制**：`mdLine(zh)`（一行指令 + 两条注解，
  key 就是这一行）、`qTag(zh)`、`ttsBtnHtml(id, zh)`。长段说明**一行一个 mdLine**，不再用 `<br>`
  拼接，注解才会贴在它解释的那一行下面。
- ⚠️ **`labKey()` / `labGloss()`**：模式按钮的 label 带前缀 emoji（「✍️ 填空」），以前
  攀山竞速用 `m.zh`（填空**挑战**）去注音一个只写着「填空」的按钮 —— 正是 owner 之前抓到的
  「拼音按钮下面写 pīn yīn fǔ zhù 但没有辅助两个字」同一类错。现在 key 从 label 自己推导，
  结构上不可能再漂移。
- **难度滑杆的读数也带注解**（`diffGloss`），所以 `wireQtySlider` 改用 innerHTML 而不是
  textContent —— 用 textContent 会在第一次拖动时把注解抹掉。⚠️ **数量滑杆（题数/字块/时长）
  故意不加**：读数是数字，两行读数会把 owner 好不容易修掉的「滑杆一伸一缩」重新引进来。
  实测五档拖过去轨道恒为 522px。

### 组词挑战（owner 截图那一页，本轮的重点）
以前这一页**完全没有注音**：句子/释义是 `esc()` 直出，不像填空/华文解释那样走 `qHtml()`。
- 题目改走 `qHtml(w.cloze, w.clozePy)` / `qHtml(w.zh, w.zhPy)`，和其他模式一致。
- **单字块加拼音**：`charPy()` 在本 stream 的词表里扫一遍，凡是「音节数 == 字数」的词就把
  字→音节记下来。⚠️ **一个字在数据里出现过两种读法就一律不显示**，而不是猜一个 ——
  孤立的字块没有任何上下文可以消歧，读错比不读更糟（和「绝不把拼音喂给 TTS 引擎」同一个道理）。
- ⚠️ **拼音出题方式下不给字块注音**（`chipPyHtml` 的 `pm === "py"` 闸门）：那时题面就是答案的
  拼音，字块再注音就成了纯音节配对，认字这一步——也就是组词挑战的全部意义——直接消失。
- **拼音开关改成就地重绘**，不重新 render：重新 render 会清空学生已经放进格子的字。实测
  切换后已填格子仍在、字块顺序完全不变（不重抽 = 不泄题）。

### 顺手修掉的两件事
- ⚠️ **同伴挑战说明是错的**：写着「对决**不计历练值、不计灵露**」，但 2026-08-14 的
  「房间模式计分」已经推翻了 D-2 的零奖励闸门，房间现在照常计分。已改为「也照常累积历练值和灵露」。
- 词雨最高分行、同伴挑战出题范围行：块级注解会把标签和它的数字**劈成两行**（「本机最高分 /
  pinyin / English：0」）。改成 `.rb-item` 把「标签＋数值」包成一个 inline-block，注解落在整组下面。

### 验证（真浏览器，`python3` + no-store handler + 127.0.0.1，本次可用且截图正常）
1280×820 与 375×812，G1/G2/G3/HCL 四个 stream：
- **三条表格自动检查全绿**：两表 key 完全一致（118/118）、每条拼音音节数 == key 里的汉字数、
  每个调用点的 key 都在表里。另加一条**页面内**检查：每个 `.pylab` 前面那串中文的字数 == 它自己的
  音节数（跑遍八个画面，0 不符）。
- **每个画面 `.pylab` 与 `.enlab` 数量完全相等** —— 两种辅助的覆盖面不会一个有一个没有。
- 组词四种出题方式逐一验：拼音模式**字块无注音**、其余三种 6/6 有注音、四种模式**字块顺序完全相同**；
  释义模式 14 个 ruby；完成后的反馈行带两条注解。
- 填空五档（打拼音/⭐/⭐⭐/⭐⭐⭐/⭐⭐⭐⭐）q-tag、检查、提示按钮全部带注解；华文解释、
  攀山竞速、词雨、同伴挑战、学习挑战配置页全部带注解且无横向溢出。
- HCL 惰性：无 中/EN、无 拼 按钮、`.pylab`/`.enlab` = 0、无 ruby。
- 四个 JS 解析通过，CSS 括号 781/781。Cache-bust `20260815` → **`20260815b`**。
⚠️ **仍未在真设备上跑过**：iPad 上三行文字（中文/拼音/英文）叠起来后各配置页的实际高度，
以及 375px 下 16 个带注音字块的手指命中率。上课前值得亲手翻一遍。

⚠️ **以后每加一条 EN_LAB 就必须补一条 PY_LAB**，且 key 必须**就是屏幕上那串中文**。
`pyl()` 找不到 key 时返回空字符串 —— 漏了是静默的，不会报错。

## 答对音效 · Safari 静音的真正原因 · 2026-08-15 (owner 第二次报告)

Owner: 「there still isn't the positive feedback sound for correct answers, I tried with max volume
in safari. the TTS works though」。**「TTS 有声、音效没声」这一句就是诊断书** —— 两者走的是完全
不同的输出路径，所以问题不在音量、不在漏接线，而在 WebAudio 这一侧根本没有出声。

### 上一轮为什么没修好
2026-08-15 早些时候那一版（异步 resume + 加大音量）**方向对了一半，但验证方法骗了我**：
当时是「劫持 `createOscillator` 数振荡器个数」，在 Chromium 上 `resume()` 会正常兑现，
所以四个音符都建出来了，看起来是通过的。**Safari 上根本走不到那一步。**

### 真正的机制（三件事叠起来）
1. Apple 平台上整个页面只有**一个共享音频通道**，而 `speechSynthesis` 会把它拿走。
   这个 app 几乎每答一题都要朗读，所以 AudioContext 会被反复推进 WebKit 独有的
   **`"interrupted"` 状态** —— 既不是 `running` 也不是 `suspended`，第三种状态。
2. 处于 `interrupted` 的 context **什么都不渲染**，排进去的音符全部被丢掉，无报错无警告。
3. ⚠️ **对 `interrupted` 的 context 调 `resume()`，返回的 Promise 可能永远不兑现。**
   上一版偏偏就是 `p.then(play); return;` —— 于是 `play()` 永远不会被调用。
   **音效不是「晚了」，是「一次都没有发生过」。**
   实测复刻：拿一个 `resume()` 永远挂起的 context 跑旧版 `tone()`，
   **四次调用建出 0 个振荡器**（新版建出 4 个）。

首次触发点就在自己家里：`pointerdown` 里那句为 iOS 解锁语音的静音 utterance，
**在建好 AudioContext 之后立刻把音频通道抢走**。所以经常是「第一次点击之后就再也没有音效」。

### 改法（app.js 音效段，动之前先读那段注释）
- **不再把播放挂在 `resume()` 上**：照样调 resume，但同时挂一个 **120ms 兜底**；
  120ms 是奖励音还能和「刚才那一下点击」连在一起的上限。
- **`rebuildCtx()`**：兜底时若仍未 running，就**丢掉旧 context 重建一个** —— 音频通道空闲时
  新建的 context 一出生就是 running，这是唯一可靠的脱困路径，`resume()` 靠不住。
  两道闸门：**1 秒内不重复重建**，**总共最多 8 次**（浏览器对单页可建的 AudioContext 数量有上限，
  历史上 Chrome 是 6；无脑重建会把音频彻底烧死）。
- **静音保活源**：每个 context 一建好就挂一个 gain 恒为 0 的 1 帧循环 buffer。
  一个「正在播东西」的音频通道不容易被回收或被语音夺走 —— 这是让音效撑过一整局而不是只响第一次的关键。
- **`reviveAudio()`**：`u.onend` / `u.onerror` 上挂钩，**每一句朗读结束就把通道要回来**
  （静音预热那一句也挂了）。少了这一条，Safari 上第一个被朗读的词就会让整局的音效静音。
  `visibilitychange` 也改走这个函数。
- ⚠️ **`c.state !== "running"` 是唯一正确的判断**，不要写回 `=== "suspended"` ——
  那样会漏掉 Safari 的 `interrupted`，这正是整个 bug 的起点。

### 新增 `sound.html` 音效诊断页（和 voices.html 同一个思路：**别猜，去量**）
学生/owner 在出问题的那台设备上打开，四个按钮：①只放音效 ②只朗读 ③**先朗读再放音效** ④重建后再放。
① 有声而 ③ 无声 = 就是通道被朗读抢走。页面顶部实时显示 `state` 与 `currentTime`，
并给出**决定性判据**：**`currentTime` 400ms 内没有前进，就说明这个 context 根本没在出声**，
排多少音符都没用。底部黑框可整段复制回报。
⚠️ 页首也写了一条最容易被忽略的可能：**iPad 侧面的静音开关会掐掉网页音效，但不影响朗读** ——
症状和这个 bug 一模一样。先排除它再往下查。

### 验证
真浏览器：答对一题建 4 个振荡器、context 全程 running、**`currentTime` 400ms 内前进 0.400s**
（即真的在渲染，不只是排了音符）；把 context 伪装成 `interrupted` 且 `resume()` 永远挂起后，
**仍然建出 4 个振荡器，并且是在一个新建的 running context 上**（旧版此时为 0）；
`sound.html` 四个按钮全部工作；零控制台错误，app.js 解析通过。
Cache-bust `20260815b` → **`20260815c`**。
⚠️ **仍需 owner 在真 Safari 上确认。** 如果还是没声，请开 `sound.html` 按一遍并把黑框截图回报 ——
那份记录能直接分辨是「通道被抢」「设备静音」还是「浏览器完全没出声」。

## 对战徽章排序 · 2026-08-15 (owner)

Owner: 「the badges should arrange left to right - bronze, silver, gold, ultimate」。
成就墙的对战徽章由 金/银/铜/称号 改为 **铜 → 银 → 金 → 称号** —— 从左到右读成一条往上爬的阶梯，
称号收尾。

⚠️ **不能直接反转 `BATTLE_RANKS`**：那个数组的**下标就是名次**（`BATTLE_RANKS[rank-1]`，
`awardBattleMedal` 和详情卡的「拿到第 N 名」都靠它），反转会让第一名发铜牌。
新增一个独立的 `BATTLE_DISPLAY = ["bronze","silver","gold","champion"]` 只管展示顺序，
用在 `battleWallHtml()` 与 `openPlayerBadges()` 两处。`BATTLE_RANKS` 一字未动。

验证（真浏览器 G2，种入 room 金×4 + room 铜 + peer 银）：两个家族的顺序都是
铜/银/金/称号，8 张图 naturalWidth 全为 320（无破图），称号格进度 4/5 与 0/5 正确，
点开铜牌详情卡仍写「拿到第 **3** 名」（名次映射没坏），零控制台错误。测试数据已清除。
Cache-bust `20260815c` → **`20260815d`**。

## 航海选择页 · 海图选科目 · 2026-08-15 (DESIGN_迭代规划_航海选择页 v5)

首页进入后的四张 `.lp-card` 换成一张**海图**：四座海岛 + 左下角的启航码头，点岛屿会开船
过去再跳转。`index.html` + `app.css` + `nickname.js`，**`.lp-cards` 原样留在 DOM 里当回退**
（`nickname.js` 优先用 `#lpSea`，找不到才显示旧卡片）。落地页的 logo/对联/进入按钮一个字没动。

### 坐标全部住在 CSS 里 —— 这条是硬性的
每座岛的 `--cx/--by/--w/--tx/--ty` 都写在 `app.css` 的 `.i-*` 类上，**index.html 里一个内联
坐标都不许有**。第一版把它们写成了 `style="--w:23vw"`，结果**竖屏 media query 永远覆盖不了**
—— 内联自定义属性的优先级高于任何样式表规则，包括 media query。竖屏布局当时是「静默失效」的，
渲染出来只是岛变得很小，不报任何错。

### 尺寸表达难度，不表达距离（v5 文档的原话，别「修正」它）
G1 最小 → G2 → G3 → HCL 最大；**远近**由垂直位置和美术自带的雾霾承担。所以 G3/HCL 位置更高
**同时**画得更大，这是故意反透视的。owner 2026-08-15 另外定了：**G3 与 HCL 位置对调**、
**G1 再大一点**（21vw → 24vw）、**G3 再高一点**（by 44.4% → 48%）给 HCL 让出空间。

### 航线是手工定的，不是算出来的
四个停泊点 `--tx/--ty` 以及船头朝向（`data-boat`）都是**逐条手写**的，并且**整条弧线**都验证过
不压到任何陆地（不只是端点——中点抬升 3.5vh 也算在内）。改了任何一座岛的位置，或者改了那个
抬升值，都要重新验一遍。四条固定航线不值得写寻路算法。
五张船 sprite 靠 `scaleX(-1)` 覆盖八个方向（船身左右对称）。

### 船的动画（两次踩坑，都别再踩回去）
- **动的是 transform，不是 left/bottom。** 第一版动 left/bottom，每帧触发一次完整 layout，
  owner 实机反馈「janky」。现在 `nickname.js` 在点击时算出像素位移写进 `--dx/--dy`，
  keyframes 只动 transform。⚠️ keyframes 里的 transform 写成两段 translate 串联，
  **前一段是元素自身的居中补偿，每一帧都必须带上**，漏了船会瞬移半个身位。
- **⚠️ bfcache 复位是必须的。** owner 实机报告「进了科目页再回来，整个海图瘫痪」，以及
  「第一次点过之后就再也开不了船」。同一个原因：浏览器用 **back/forward cache** 还原页面，
  JS 状态原封不动 —— `busy` 还是 true，船还带着 `animation-fill-mode:forwards` 停在目的地。
  现在 `pageshow`（**不是 load**，load 在 bfcache 还原时根本不触发）会把船复位。
  另外**同一个 class 重复添加不会重启 CSS 动画**，remove → 读 `offsetWidth` 强制回流 → add，
  少了中间那步第二次航行不会动。

### 码头要沉到画面外一点
`.i-dock` 的 `--by` 是**负的（-6%）**。原本是 0，贴着视口下沿，于是 `:hover` 那 6px 抬升
会把整块陆地提起来、露出下面一条空白海面（owner 截图报告）。沉下去 6% 就有了余量。
码头没有可放牌子的滩地，它的铭牌单独定位在屋子旁的沙地上（`.i-dock .sea-label`）。

### 竖屏
同一张图重新配比，**没有回退到旧卡片**。但竖屏时四座岛是纵向堆叠的，从码头到远岛没有可走的
水道，所以 `nickname.js` **竖屏直接跳过航行动画**（`skipSail()`，和 reduced-motion 同一个出口）
—— 这正是设计文档说的「航线会压到陆地时就别画这条航线」。
⚠️ **网页无法锁定横屏**（Screen Orientation API 要求全屏或已安装应用，本项目两者都没有），
而且 CLAUDE.md 本身就禁止锁定方向。所以竖屏只给一个可关掉的「转成横屏」提示，绝不拦人。

### 美术管线：磁红去背 + **半透明反混合**
11 张图都是 `#FF00FF` 底。硬边 sprite 照旧用 min(R,B)−G signature 斜坡处理，但**山顶的雾/云
不行**——那是薄薄一层白画**在磁红上面**，底色透出来，像素本身就是粉的。阈值法只能二选一：
留着粉，或者整片切掉。owner 2026-08-15 报告「云雾里还有残留的洋红」。
正确解法是**反混合**：已知底色 M=(255,0,255)，且假设前景在洋红轴上接近中性
（(F.r+F.b)/2 ≈ F.g，白雾成立，沙地岩石植被也够接近），则 d=(C.r+C.b)/2−C.g 就是 (1−a)·255，
于是 a = 1−d/255，F = (C−(1−a)M)/a。
- ⚠️ `min(R,B)−G ≤ 5` 的像素**一律不碰**，这就是**红旗能活下来**的原因：HCL 宝塔上的红旗
  蓝通道很低，根本没有洋红 signature。
- ⚠️ 中途过冲了两次，两个夹逼都要保留：(a) `fg` 不得超过 `max(fr,fb)+8`，否则最薄的雾丝会
  变成青绿色（把粉色错误镜像了一遍）；(b) alpha 越低越往灰色靠（a<0.5 时线性拉向自身亮度），
  因为除以一个很小的 alpha 会把舍入误差放大成假色相。
- 验证方式是**逐像素审计**：11 张图 `alpha>40 且 signature>12` 的像素数全部为 **0**。
- 调色板量化到 256 色（FASTOCTREE —— 只有它保 alpha），2.6MB → 716KB；`sea_tile.png`
  **保持 1536×1024 原尺寸不缩**，缩它正是 TROUBLESHOOTING 文档里「水面比岛屿糊」的病根。

### ⚠️ 第二轮修订 · 2026-08-15 晚 (owner 实机反馈) —— 上面的坐标与动画段落以此为准

**布局**（owner 逐条指定）：G1 再往右、离码头更远 · G2 再往左 · G3 摆到画面正中 ·
HCL 顶到右上角边缘（故意让它溢出右边一点）。最终值见 `app.css` 的 `.i-*`。

**停泊点贴岸。** 原来的 `--tx/--ty` 停在离岛老远的空水面上（owner：「parks quite a
distance away」）。现在是**从岛中心朝画面中心走，走到该 sprite 的 alpha 边界为止**，再退
1.6% 视口宽 —— 船身正好靠上沙滩。

**⚠️ 船会停在上次去的那座岛（「你在这里」），这条改变了整个航线校验的规模。**
`ws_seamap_at` 存 `{go, boat}`（目的地 + 抵达时的朝向），`pageshow` 时把船摆回那里，
下一程从那里出发。于是航线不再是「码头→四座岛」4 条，而是**任意起点→任意终点 20 条**，
**20 条全部逐条验过不压陆地**（含弧线中点）。**动任何一座岛都要重验这 20 条。**
- 因此**船头朝向改回运行时按方位计算**（`boatHeading`）。之前每座岛写死一个朝向，那是
  基于「永远从码头出发」的前提；现在同一座岛会从不同方向靠近，写死的朝向大部分航线都是错的。
- ⚠️ **竖屏必须自己重写一份 `--tx/--ty`**，不能只覆盖 `--cx/--by/--w`：船现在会停在泊位上，
  竖屏若继承横屏的停泊点，船会停在离岛十万八千里的空海面。
- ⚠️ 写 berth 之前要先把旧的读出来 —— 旧 berth 是「这一程从哪里出发」，绕行表要靠它。

**G2 ↔ HCL 必须绕行。** G3 摆到正中之后，G2、G3、HCL 三点共线，**任何弧高都清不掉**
（-12 到 +3.5 全试过）。所以这一对走一个手写航路点 `SEA_DETOUR`（40%, 30%），从 G3 下方
的开阔水域绕过去 —— 正是设计文档说的「直线会压到陆地时就绕开」。二次贝塞尔要**经过**某点，
控制点得取 `C = 2W − (起点+终点)/2`，别直接把航路点当控制点用。

**航行动画重做成九段贝塞尔。** 三个关键帧的弧在中点会**折角**（owner：「needs to be more
continuous and smooth」）。现在 CSS 画的是二次贝塞尔 `P(t)=2t(1-t)C + t²E`，采样九个点，
时长 1.7s。
- ⚠️ **timing 必须是 `linear`。** 每段都套 ease-in-out 等于一程里加速刹车八次，比原来的折角
  难看得多。缓动是**烘进关键帧采样的 t 值**里的（t 按 ease-in-out 分布，帧间线性插值）。
- ⚠️ 兜底的 `setTimeout` 要长过动画（现在 2200ms）。1.6s 的兜底会在 1.7s 的动画结束前
  把航程掐断。

## 我的词山 · 每个科目自己的山 · 2026-08-15 (owner)

`startMountain()` 和首页那张卡片都改用**本科目自己的岛**（`art/mountain/mtn_*.png`，1100px），
不再是四科共用的 `art/bg/mountain_bg.png`（该文件现已无人引用，**保留不删**，和退役的营地
地貌同一处理）。学生在海图上选的那座岛，和他进去爬的那座山，现在是同一座。
- `.mtn2-stage` 用 `--ar` 接收该 sprite 的宽高比（`startMountain` 内联写入），岛铺满整个 stage，
  于是钉子的坐标就是 sprite 坐标。⚠️ 宽度写成 `min(96vw, calc(70vh * var(--ar)))` ——
  aspect-ratio 已经指定时再加 `max-width` 会把画面**压扁**而不是缩小。
- 背景是 `art/seamap/sea_tile.png`，和海图同一片海。

### ⚠️ 山路是**肉眼描的**，三种自动方法全部失败（换美术前先读这段）
`MTN_PATHS[STREAM]` 十五个点，从山脚到山顶小屋，是对着百分比网格一个个点出来的。试过并失败的：
1. **逐行取最亮暖色段** → 跟着左侧被阳光照亮的**草地**跑了，因为草比小路更暖也更宽；
2. **从山顶往下的贪心连续行走** → 在之字形拐弯处甩出去掉进树林，一旦离开就再也回不来；
3. **代价图 + Dijkstra 最短路** → 直接抄近道穿过草坡，因为草的代价和小路差不多，而之字形绕远。
根本原因：**这套美术里小路和受光草地是同一种暖棕色**，颜色上不可分；只要不可分，路径搜索就
永远会选近路。**换了山的美术就重新肉眼描，并把折线画回图上确认**，别再指望颜色检测。
（给 owner 的建议已同步：小路改成**灰色石阶**这类不同色系、**只留一条**主路、**不要被树遮断**；
或者随手在副本上用亮粉色涂一遍路线给我读，那份副本不入库。）

## 学海启航 · 启航码头 · 看图识词 MVP · 2026-08-15 (SPEC_XH_看图识词_MVP.md)

海图左下角的码头现在通向 `XH_index.html`：**零基础学生**的 pre-G1 层，本次只造**一个泊位**
「看图识词」——看图，从四个词语里选对的。拼音泊位（声母/韵母/四声/拼读/出海测验）明确不在本
切片范围内。

### 刻意独立
`XH_index.html` 只加载 `xh.css` + `xh.js`，**从不加载 app.css / app.js**，也不和四个科目共享
任何存储（自己的 `ws_xh` 一个键）。理由写在 `xh.js` 头部：这一层**把平台的显示默认值反过来**
（拼音和 English 在这里默认**开**，四个科目里默认关），完全在 灵露/历练值/海拔 经济之外，
而且它未经验证——将来如果要撤掉，必须能整块拿走而不碰四个科目依赖的任何东西。
TTS 那一套是**复制**过去的，不是共享的，同样出于这个理由（评分选音色、cancel 后 50ms、
只念汉字永不念拼音、英文释义绝不送进 TTS）。

### 干扰项是这个模式成不成立的关键（spec §4）
- **Band 1**（没答对过）：干扰项来自**不同**组别 —— 第一次见面光看图就能选对，先学会怎么玩。
- **Band 2**（答对过一次即晋级）：干扰项来自**同一**组别 —— 必须真的认识这个词。
- ⚠️ **黑名单是对「整个选项集」的约束，不只是对答案的约束。** 第一版只排除了答案的黑名单
  同伴，实测 120 题里有 **6 题**出现两个互相难辨的干扰项同时在场（早上 vs 中午）。现在候选项
  是逐个准入的，和**已入选的任何一项**冲突就拒绝。
- 实测：Band 1 干扰项同组别占比 **0%**（160 题），Band 2 **91%**（另 160 题，其余 9% 是小组别
  凑不够三个时从组外补位），黑名单违规 **0**，无重复选项，答案永远在场。

### 其他实现决定
- **答错零代价**：标红、留在原题、可以再选。不扣分、不掉命、不计任何东西。这是学生第一次接触
  一套他读不懂的文字，错一下必须不痛不痒。
- 答对才发 TTS，图片可点重听（学生读不出汉字，**声音是内容的一半**）。
- ⚠️ **spec §5 说「每轮十题，取自同一个单元板块」，但 17 个板块里有 6 个不足十词**（买东西和
  求助各只有 1 个词）。照字面做会产生一题一轮。现在：板块仍是学生选的单位、也是轮次的名字，
  **不足十题时从同一单元补齐**。
- 每轮开始时**预加载该轮全部 sprite**：每题换 `img.src`，没解码的图会空一拍，而这里**图就是题干**。
- 142 张 sprite 量化到 128 色：**9.8MB → 1.37MB**（平均 9.6KB）。
- 只存 `done`（答对过的词），localStorage。**没有 Firestore、没有登录、没有排行榜**，
  也**不接入** 灵露/历练值/海拔 —— spec §5 明确要求在真学生试用之前不要挂进共享计分系统。

## 启航码头 MVP **v2** · 2026-08-15 晚 (SPEC_XH_MVP_v2.md) —— 取代上面的 v1 小节

### ⚠️ 一、素材错位事故：v1 上线的 142 词里有 36 个图不对应词
sheet 07/09/10 的切图用了「邻近合并」（同学、朋友这类双人图会裂成两块，于是把相邻框合并到
数量对得上为止）。sheet 09 合并配错了对，**合并点之后的每一条都错位一格**：
`xh_money.png` 里是夜空+钱两张并在一起、`xh_night.png` 是日落、`xh_afternoon.png` 是正午的
太阳、`xh_noon.png` 只是一片云。
- **本次把范围收到 36 词**（sheet 01/02/06，动物 24 + 日常用品 12），这三张表首次切图数量就
  对得上、没跑过合并，且已逐个肉眼核对。
- **仓库里其余 106 个 sprite 已删除**（git 历史里还在），`data/xh_mvp.json` 换成
  `xh_mvp2.json`。留着不引用等于把错图继续摆在仓库里等人捡。
- **⚠️ 定为长期规则：凡是需要合并才切出来的素材，用之前必须肉眼核对。数量对得上不能作为
  映射正确的证据。**

### 二、干扰项规则**改了**（v1 的 Band 1/Band 2 作废）
**干扰项一律取自同一个组别，没有例外。** 动物题不会出现日常用品，反之亦然。
v1 的「先跨组、答对后转同组」被推翻：跨组干扰项让学生**光看类别就能答对**，什么都没教。
动物内部可以跨「陆上/水中」自由取（猫 vs 鲨鱼仍是一道真题）。
黑名单在这个范围内只剩 **椅子/桌子** 一对；v1 那张大表留档，等那些词回来再用。
实测 40 题 120 个干扰项：**同组别 100%**，黑名单违规 0。

### 三、四个玩法（同一批 36 词与 sprite，零新素材）
`store.mode` 记住选择：**看图识词**（保留）· **听音识图**（TTS 读词、选图，把通道反过来，
逼学生听而不是比字形）· **拼音打字**（唯一训练产出而非识别的玩法）· **连线**（五对，
整块清完才算过）。
- ⚠️ **拼音打字接受无声调输入**：`tonelessPy()` 走 NFD 去掉声调符号、ü/v 折成 u、去空格，
  所以 `lao hu`/`laohu`/`lǎo hǔ` 都算对。声调是后面的泊位才教的，**在这里要求声调等于用
  没教过的东西判学生错**。答错才显示拼音，然后让他重打。
- 每轮 **5 题**（不是 10）：日常用品只有 12 个词，10 题一轮几乎把它抽干。

### 四、埋点（spec §7，要求一开始就做）
`store.stats[词语] = {shown, wrong, confused:{被选中的词: 次数}}`，localStorage。
**这个 MVP 最有价值的产出就是「哪些图会被认错、被认成什么」** —— 它决定以后每一批新词的
黑名单。在测试设备上 `localStorage.getItem("ws_xh")` 就能读。

### 五、视觉（spec §5）
诊断说得对：**照片感的海面配像素画 sprite**，题目又装在纯白圆角矩形里。现在背景是用海图
自己的像素素材拼出的**码头**（`dock_jetty` 压在左下角 + 海面），题目装在**木质告示牌**上
（木框 + 木纹 + 两颗铜钉），回合进度是**小船沿栈桥前进**而不是 `3 / 10` 计数，答对时
sprite 会弹一下，答对/答错各有合成音（木槌 / 绳索吱呀）。
- ⚠️ **spec §5.1 要的是专门画的港口场景**（系泊的帆船、木箱、缆绳、海鸥），**那个还不存在，
  是美术任务**。现在只是把已有的码头与海面组起来，让 码头 和落地海图看起来是同一个地方。

## 我的词山 · 地标名称悬停显示 + G2 路线重描 · 2026-08-15 晚 (owner)

- 每个钉子多了一个 `.mtn2-name` 药丸，**hover / 键盘 focus 时显示地标名称**（营地也一样）。
  原本只有 `title`，原生 tooltip 要等将近一秒，整张图读起来就是一排无名圆点。
  靠近画面顶端的钉子（`p.y < 0.13`）自动把名字翻到**下方** —— `.mtn2-stage` 是
  `overflow:hidden`，名字挂在上面会被切一半。药丸上的 `scale(.84)` 是用来抵消钉子自己
  hover 时的 1.2 倍放大，好让名字不管挂在多大的钉子上都一样大。
- **G2 的山路改用 owner 亲手描的线**：owner 在副本上用洋红把小路涂了一遍。提取办法是
  **从四角 flood-fill 出「背景洋红」，剩下的洋红就是涂的线**，再**只取最大连通块**
  （岸边礁石之间有被围住的背景洋红口袋，会被误判成线）。15 个点按弧长等距重采样。
  结果比肉眼描的准得多 —— **以后换美术就照这个流程**：owner 涂一遍，脚本提取，副本不入库。

## 验证方法：离屏 WebKit 渲染器（本次新增，以后先试这个）

Browser pane 这次又拒绝了 127.0.0.1 和 localhost，机器上没有 Node、没有 Chrome。
解决办法是用 **`/usr/bin/swift` 写一个 60 行的离屏 WKWebView**（`shot.swift`，在 scratchpad 里）：
加载本地 URL → 执行任意 JS → `takeSnapshot` 出 PNG。**引擎和 owner 的 Safari 完全一致**，
所以既能量 `getBoundingClientRect`，也能真的**看见**页面。本次几乎所有结论都出自它。
- 配套用一个 **no-store** 的 `http.server`（普通的 SimpleHTTPRequestHandler 会发 Last-Modified，
  于是拿到旧文件，白白 debug）。
- ⚠️ **离屏 webview 里 `setTimeout` 会被严重节流。** 靠定时器推进的流程（看图识词每题之间
  1150ms 的过场）在这里几乎走不动 —— 这是测试环境的限制，不是应用的 bug，别照着它改代码。
  因此 **看图识词的结算页至今没有在浏览器里跑到过**，其余每一条路径都跑过了。

## Cache-bust · 2026-08-15

本批全部资产版本号推到 **`20260815j`**（六处：`index.html` + 四个科目页 + `teacher.html` 的
`ASSET_V`）。`XH_index.html` 是新页，自带同一版本号；`xh.js` 读自己的 `?v=` 传给
`data/xh_mvp.json` 和 sprite，和 app.js/arena.js 同一套办法。

## Owner batch, 2026-08-15 (晚) — 装载卡死 · 三座山重描 · 顶峰光环 · 码头学词 · 连线重做

六项，全部**在真浏览器里跑过**（`python3` + no-store handler + 127.0.0.1；本次 Browser pane
接受了 localhost **而且截图正常**，所以下面是「看到的」，不只是量到的）。

### 1. ⚠️ 全部年级卡在「正在装载词库…」—— 真 bug，最要紧的一条
Owner 报「G2 卡在 loading」，接着补「**全部**都卡住」。查下来**不是数据问题**：线上四个 JSON 都是
200、字节数和本地一模一样，我这边打开线上 G2 一切正常。

真正的原因在 `boot()`：`renderHome()` **只在 `WSCloud.getProgress` 的回调里被调用**。于是只要那
个回调**既不成功也不失败、就是不返回**，页面就永远停在装载文字上 —— 词库其实早就下载好了，
fetch 的 `.catch` 也永远不会触发（它已经 resolve 了）。而「不返回」正是受管学校网络的典型行为：
`identitytoolkit.googleapis.com` 被挡住时，`signInAnonymously()` **不抛错**，`onAuthStateChanged`
也不会带着 user 触发，`_failed` 保持 false → `isAvailable()` 继续说「可用」→ 回调排进
`_readyCallbacks` 永远等下去。Firestore 的 `get()` 在离线时同理，会一直 pending 而不 reject。
- **修法（app.js）**：`CLOUD_WAIT_MS = 6000`。云端有 6 秒时间回答，超时就**照常开门**（本地
  数据本来就够用）。迟到的回答仍然会 merge，但**只有当学生还停在首页时才重绘**
  （`document.querySelector(".home-grid")`）—— 否则一个 8 秒后到达的回复会把正在答题的学生
  直接踢出题目。
- **修法（firebase-init.js）**：10 秒内没 ready 就把 `_failed` 置真，让 `isAvailable()` 说实话。
  **故意不清空 `_readyCallbacks`** —— 万一网络后来通了，排队的写入照样送出去。
- 验证：临时页面注入一个「自称可用但永不回调」的 WSCloud，**旧逻辑永远停在装载文字，新逻辑
  6 秒后进首页**；再让它 8.5 秒后才回答，实测迟到的 3 个 mastered id 正常并入 localStorage 且首页
  重绘。
- ⚠️ 给 owner 的一句话：这条**不需要改 Firestore 规则、也不是部署错误**，纯客户端修复。学生只要
  拿到新的 `?v=20260815k` 就好了。

### 2. G1 / G3 / HCL 山路重描（owner 在原图上用洋红涂了线）
和 2026-08-15 早些时候 G2 的做法一样：**owner 涂线 → 脚本提取**，不再肉眼描。
- 三张图是**贴进对话**的，所以从 `~/.claude/projects/…/<session>.jsonl` 里把 base64 解出来
  （这一招前面记过，这次又用上了）。⚠️ 贴图会被转成 **webp** 有损副本 —— 描一条粗线够用，
  但要用容差判色，别指望精确 RGB。
- 提取：从四角 flood-fill 出背景洋红，**剩下的洋红就是涂的线**。
  ⚠️ **两个新坑，都是这次踩到的**：
  (a) **亭子/楼阁的空隙会漏出背景洋红**（G1 的亭子四面通透），那些洋红被岛体包住，也会被判成
      「内部洋红」。所以吸收相邻分块时**必须要求它在 y 方向严格延伸当前笔画**，而不是只看间距 —— 
      第一版按间距吸收，把 G3 山体上两块洋红杂点当成线，整条路径被往左拉歪。
  (b) HCL 的线被前景遮断成 3 段，**要按 y 相邻 + x 接近**合并回来。
- 15 个点按弧长重采样，**再把折线画回原图肉眼复核**（三张全部贴合painted stairway）。
- 坐标映射：截图里的岛 alpha bbox ↔ 仓库 sprite 的 bbox。三张宽高比对得上（g3 1.2232 vs
  1.2249、hcl 1.1733 vs 1.1727、g1 1.6491 vs 1.6296）。

### 3. 顶峰不再被挡：`MTN_CROWN` 空心光环
Owner：「the feature on the top of the mountain should not be blocked」。以前 🏯 pin 就摁在建筑上。
- 新 `MTN_CROWN[stream] = {x,y,r}`，**和 MTN_PATHS 同一套 sprite 分数**，`r` 是**宽度**的比例。
  四个值是**量出来的**：逐行扫 alpha 的 x 跨度，找出建筑自己的 bbox（屋檐最宽那几行），再取中心
  与半径。⚠️ 不要用眼睛在网格图上估 —— 第一版就是这么估的，圆心偏低，屋顶被切。
- 渲染：`.mtn2-pin.t-summit` 变成 `width:<r*200>%` + `aspect-ratio:1` + 透明底 + 金边，
  **不带任何字符**（`mtnPinIcon` 对 summit 返回空字符串）。仍然是 `<button>`，点开的还是原来的
  顶峰弹窗，hover 名牌照旧（自动翻到下方）。
- 「pulsing and glowing」拆成两层：按钮自己跑 `mtnCrownGlow`（只动 box-shadow），
  **尺寸脉冲放在 `::after` 的第二个圈**上。⚠️ 不能把 scale 加在按钮上 —— 名牌是它的子元素，
  会跟着一起抖，而 `.mtn2-name` 的 `scale(.84)` 本来就是为了抵消按钮的 hover 缩放。
- `prefers-reduced-motion` 下两个动画都停。

### 4. 岛缩小、周围留海（同一条 owner 要求）
新增 `.mtn2-isle` 包住 `<img>` 和所有 pin，**占 stage 宽度的 84%**、居中、保持自己的宽高比。
因为 stage 本来就用同一个 `--ar`，**一个数字就得到四边等宽的海面**。pin 是它的子元素，所以
**MTN_PATHS / MTN_CROWN 一个数都不用改**；这圈海同时也是光环和顶部名牌**溢出去的地方**
（stage 是 `overflow:hidden`，没有这圈留白光环会被切）。
⚠️ **这三个数字是一组，改一个要一起算**：isle 宽度百分比、`MTN_CROWN.g1.r`、光环 box-shadow 的
外扩量。G1 的亭子紧贴 sprite 顶边，是四座里唯一会被 stage 边缘切到的：实测 84% + `r:.066` 时
光环顶端距 stage 顶 27px，而脉冲最大时的外扩约 28px —— 已经是刚好够用。把光环调亮调大之前，
先把 isle 缩小。

### 5. 航海图：G1 的船停在山脚，不再停在山顶
Owner：「the boat sailing to G1 needs to land at the foot of the mountain」。
原因很具体：所有泊位都是「从岛心朝**画面中心**走到 alpha 边界」算出来的，而 **G1 在画面下方**，
于是那一步是**往上走**，泊位落在岛的**上缘**、正好挨着画好的亭子。
- 新泊位改成沿**已描出的山路**取：`MTN_PATHS.g1[0]`（沙滩上的登山口）往外走到岸线再退 1.6vw。
  横屏 `--tx:48.2%; --ty:8.3%`，竖屏 `--tx:53%; --ty:19.2%`（⚠️ 竖屏必须自己写一份，见既有注释）。
- **20 条航线重验**：判据是「不得压到**第三座**岛」（终点岛贴岸是设计本意，不算冲突）——
  新旧泊位都是 0 冲突。验证脚本是在浏览器里把每张岛 sprite 画进 canvas 采 alpha，再按
  `nickname.js` 同一套二次贝塞尔公式采样 200 点。

### 6. 昵称：掷骰改成默认（owner）
「make the roll dice option the default to reduce barriers to entry, and at the bottom a smaller line
that says 我要自己选昵称」。
- 选择器现在**一进来就是掷好的名字**（`st.step` 初始为 `"confirm"`，并在 `st` 之后立刻 `rollNick()`；
  `rollNick` 是函数声明，会提升，所以放在这里安全）。原来的四步 大类→描述词→名词大类→名词
  是**进门前的四个决定**，对新生就是门槛。
- 确认页底部新增一行小字链接 `我要自己选昵称`（`.np-manual`）→ 进原来的四步流程；
  原来的「‹ 重新选择」按钮删掉（同一件事有两个入口只会让人犹豫）。四步走完照样回到确认页。
- ⚠️ **两份选择器（`app.js` + `nickname.js`）必须一模一样** —— 本次六处改动两边都改了。

### 7. 启航码头：📖 看图学词（flashcard）
Owner：「needs a flashcard option for the users to learn the words before getting tested」。
- 新模式排在**第一个**，其余四个玩法读起来才是「现在自测」。
- 走**整组**词（不是 5 个抽样）、**按数据原序**（第二次进来还是同一课），大图 + 词 + 拼音 + 英文 +
  自动朗读 + 🔊再听 + 上一个/下一个。
- ⚠️ **故意不写 `store.done`**：菜单上的「学过了」计的是学生真的答过的词。看一眼卡片不算，
  否则可以全程不答题就把整个码头刷完。
- 看完的结算页主按钮是**「🖼️ 开始测验」**（同一组直接开一轮看图识词）—— 这个模式存在的意义
  就是后面那一轮。

### 8. 启航码头：连线重做（owner 三条）
「show an actual line running across to join · feedback at the end when users match up all the options ·
toggle to choose how many items to display at once」。
- **真的画线**：`.xh-match` 里加一层 SVG（`#xhLinks`），每对连线画一条绳索色直线 + 两端圆点；
  选中一边后还有一条**跟着手指/鼠标的虚线**。两列之间拉开一条 `clamp(48px,12vw,140px)` 的通道给绳子。
  连接**按词语文本存**（不是元素引用），所以 resize、sprite 迟到解码后重算都不会丢线；
  resize 监听器**自己检测 SVG 还在不在**，不在就自摘（innerHTML 整片替换时没有别的拆卸时机）。
- **判分挪到最后**：连的时候一律绳索棕，**不提示对错**；点了一个已连的项目就解开重连；
  全部连满才点亮「检查答案」。以前是连一对就立刻变绿/抖动 —— 那是「四选一 + 即时确认」，
  比「先想清楚整盘再交卷」容易得多。
  判错的线变红，**1.2 秒后自动拆掉**让学生重连（这一层「答错零代价」的规矩不变）；
  **只有第一次检查计分**，`state.correct` 和 `stats.confused` 都取第一次的结果。
- **难度 = 一次连几组**：`store.matchN` ∈ {3,5,8}，菜单上**只在选中「连线」时**才出现
  （一个对当前玩法无效的控件就是噪音）。组里词不够时按组大小截断。
- 实测：连线/解开/满盘启用检查/检查前一个绿的都没有/1 对 2 错 → 红线 → 自动拆掉 → 重连全对 →
  结算「1 / 3 一次答对」+ 2 个复习项 + `confused` 记下 床↔雨伞。手机 375px 下无横向滚动。

### 验证与部署
真浏览器 1600×900 / 1280×860 / 375×812：四座山的路径与光环（G1/G2/G3/HCL 逐一截图核对）、
顶峰光环可点且弹窗正确、名牌翻到下方、航海图 G1 泊位（横屏与竖屏各量一次）、昵称掷骰→重掷→
手动四步→确认落盘、码头 flashcard 全流程 + 结算跳测验、连线全流程 + 手机版式。
六个 JS 全部 parse（JavaScriptCore），CSS 括号 app 871/871 · xh 138/138。
Cache-bust `20260815j` → **`20260815k`**（七处：`index.html` + 四个科目页 + `XH_index.html` +
`teacher.html` 的 `ASSET_V`）。
⚠️ 仍未在真设备上跑过：iPad 上用手指连线的手感、以及顶峰光环的 box-shadow 动画在 Chromebook 上的开销。

## 启航码头 · 顶栏三件套 · TTS primer · 港口背景 · 航海图鉴 · 2026-08-15 (owner + XH_handoff)

Owner: 「the pier needs the eng toggle, pinyin toggle, profile name and pic」，随后给了
`XH_handoff_2026-08-15/`（三份 spec + 全部美术）。本批做了 owner 直接要的那三件，加上交接文档
build order 里最便宜、最要紧、且没有待决问题的两步（TTS primer、港口背景），再加 **航海图鉴**
（两份 spec 都写「build this first」，无新美术、无商店、解锁规则已定）。**其余系统没做，见文末。**

### 1. 顶栏：拼 / 中EN / 我的档案（owner 的原始要求）
- 三颗药丸挪进 `.xh-top`（新容器 `#xhTools`，由 `renderTop()` 填充）。以前两个开关**只在菜单页**，
  学生答到一半根本够不着；现在和四个科目页同一个角落、同一个 42px 手指尺寸。
- ⚠️ **两个开关改成 CSS 闸门（`body.xh-py-on` / `body.xh-en-on`），不再重绘。** span 永远在 DOM 里。
  这不只是快：`renderPic()` **每次渲染都重抽干扰项**，而正确答案是唯一每次都活下来的选项 ——
  会重绘的开关等于送答案，和 2026-08-13「填空选项重洗=泄题」、2026-08-14「组词字块泄题」同一类。
  实测：连按四次开关，四个选项**一字不变**。
  - 22 处 `(store.py ? … : "")` 全部改成无条件输出；**唯一的例外是 `.xh-always`** ——
    拼音打字答错后显示的那条拼音（spec §4.4 说那正是这次失误的意义），它绕过闸门。
- **身份是唯一跨过水线的东西**（owner 决定）：`XH_index.html` 现在加载 firebase compat SDK +
  `firebase-init.js` + `profile.js` + `nickname.js`，顶栏显示学生**自己的**昵称与头像，点开的是
  **同一个 我的档案 面板**（含换头像/换昵称/进度码/意见反馈）。在码头是另一个人，比任何重复代码都糟。
  **进度仍然封死**：`xh.js` 一个字节都不读写 `ws2_*`，航程永远不变成海拔。
- ⚠️ **`app.css` 仍然没有被加载**（166KB，且带 `*`/`html,body`/`img`/`button` 全局规则，会把码头
  的背景和排版一起接管）。profile.js/nickname.js 需要的那 ~70 条规则**抄进了 `xh.css` 末尾的独立
  区块**，和 teacher.html 抄调色板是同一个约定。⚠️ **以后 profile.js 加新 class，要同步抄过来** ——
  漏了的表现是「面板在码头没样式」。本次就漏过两族又补上：`.avatar-thumb*`（头像格）和
  `.feedback*`（保存/恢复的状态行，少了它会永远显示一个空框）。
  找法：脚本比对 app.css 的选择器 × profile.js/nickname.js 源码里出现的 class。
- `nickname.js` 新增一行导出 `window.WSNickname = { picker: renderNicknamePicker }`，让落地页以外的
  页面也能开昵称选择器。`initLandingGate()` 本来就在缺少落地页 DOM 时直接 return，所以别处加载零成本。
- 手机：`.xh-tg-lab` / `.xh-nick` 在 560px 以下收起，只剩「拼 / 中 / 头像」。
  ⚠️ 同时给标题块补了 `min-width:0;flex:1` + 副标题 ellipsis —— 不加的话三颗药丸会把
  「学海启航 · 零基础 · Start here」挤成三行，顶栏从 64px 长到 98px（实测）。

### 2. TTS primer（`SPEC_XH_dock_economy_and_TTS.md` §2）—— 码头在 iPad 上根本不出声的真正原因
`speak()` 的实现一直是对的，**被平台丢掉了**：iOS/iPadOS 只在**用户手势里同步调用**
`speechSynthesis.speak()` 时才给页面语音会话，而那句为 ChromeOS 准备的
`setTimeout(…, 50)`（不延迟则 cancel 后立刻 speak 会被静默丢弃）**切断了手势链**，无报错、
无 `onerror`。听音识图更糟：它在 render 时朗读，根本不在手势里，所以第一题必然无声。
- 修法就是 spec 给的那 12 行：`primeTTS()` 在**第一次点击/按键**时同步发一条 `volume=0` 的空白
  utterance，之后延迟就安全了。`speak()` 进门先调它。⚠️ **那句 `speechSynthesis.speak(u)` 永远
  不许包进任何定时器**，包了就等于没修。
- 监听器故意不加 `once`（函数自己有 `_ttsReady` 守卫），这样语音引擎晚加载也还有机会。

### 3. 港口背景（addendum §1）—— §5.1 修完了
`art/seamap/harbour_bg.png`（960×540）+ `@2x`（1920×1081）替换掉 `sea_tile` + `dock_jetty` 的拼装背景，
`body::before` 那块 dock 连同它的手机 media 覆盖一起删掉。用 `image-set()` 供 2 倍屏，
**锚点 `center bottom`**：美术刻意把上三分之二留成静水与天空给题板，栈桥/木箱/系泊的船在下三分之一，
不该被裁掉。
- ⚠️ 交接包里的 `art/seamap/boat_*.png`（tier-1 舢板）与仓库现有的**不是同一份**，是船只三级的第一级。
  **本次没有替换** —— 那会改到落地海图的船，属于 build order 第 5 步。

### 4. 航海图鉴（addendum §2）
- 三页（按 `子类`），未认得的词是**它自己 sprite 的暗色剪影**（`filter:brightness(0) opacity(.42)`），
  不是空格子 —— 学生能看见还剩什么形状在外面，空框做不到这件事。已认得的显示 sprite + 词 + 拼音 +
  英文，点一下重听。整页集齐盖一枚「全部集齐」印。
- **解锁 = 第一次答对**，也就是 `store.done` 本来就记的东西，所以**这个页面没有新增任何存储**。
  比山上的掌握闸门宽是故意的：图鉴记的是「见过」，不是「掌握」，而初学者需要第一节课就看见进度。
- **航程（1 词 = 1 海里）** 是码头自己的距离度量，菜单入口显示 `N / 36 海里`。
  ⚠️ 它**不是海拔、永不换算**；贝壳/航程/航海值全部止步于水线。

### 5. 验证
Browser pane 这次又拒绝了 127.0.0.1，于是用 **离屏 WKWebView**（`shot.swift`，见既有小节；本次
重建了一份）+ **no-store** 的 `http.server`，1280×900 / 1100×820 / 375×812 全部**看得见画面**：
顶栏三颗药丸与真实头像、图鉴（剪影 8 张 + 已解锁卡 + 换页 + 全部集齐）、
**开关四次不重抽选项**、拼音关掉后打字答错仍显示拼音、我的档案面板在码头**完全有样式**
（含四个科目的进度码链接、身份 chips、进度网格）、换昵称选择器、头像选择器 21 格 → 简介卡
→ 选用后顶栏立刻换图且 `avatarId` 落盘、手机 375px 顶栏 64px 无横向滚动、落地页与 G1 无回归。
三个 JS parse（JavaScriptCore），CSS 括号 xh 262/262。
Cache-bust `20260815k` → **`20260815m`**（跳过 l；七处）。
⚠️ **TTS primer 只能在真设备上验收** —— 离屏 webview 没有语音会话。上课前请按 spec §2 的三平台
清单各跑一次（iPad Safari：答对出声、听音识图进场就出声且 🔊 可重听；Mac：朗读之后木槌声还在；
Chromebook：选中的不是 eSpeak）。另：**结算页至今没有在浏览器里跑到过**（离屏环境把题间定时器
节流了），四个玩法各需要真机走一遍。

### 6. 交接包里**没做**的部分（owner 决定要不要做、按什么顺序）
build order 4-7：**航海值**（努力值）与两个码头专属榜（要新的 Firestore 结构 + 规则，且 §5.3
「按年级还是按班级」owner 未定）· **贝壳 → 泊位 → 船只三级**（含每日上限数值、五个挂点）·
**五枚航海徽**（美术已在交接包里，未入库）· **词海垂钓**（拼音打字的钓鱼皮肤）。
消耗品按文档明确**不做**（没有风险就没有消耗品能解决的问题）。
交接包 §「Owner decisions still open」四条也仍然开着：码头是否硬闸拼音泊位、词海垂钓要不要赌注、
榜单范围、靠岸时的 船长 头像（那是第一个会跨过水线的东西）。

## 启航码头 第二批 · 两份 PATCH · 词海垂钓 · 航海值与码头风云榜 · 2026-08-15

Owner 随后给了 `XH_handoff_2026-08-15-2/`（同一批交接的**修订版**：多了
`PATCH_liquid_glass.md`、`PATCH_category_hierarchy.md`、`SPEC_XH_berth_layout.md`，以及
`dock_bg.png` / `xh_atlas_cover.png` 两张新图；`harbour_bg.png` 与 36 张词 sprite 与前一版
**字节相同**）。两份 PATCH 是对刚上线的东西的**纠正**，所以先做它们。

### 1. PATCH_category_hierarchy — 菜单按 `组别` 分组
以前菜单列 水中与空中 / 陆上动物 / 日常用品 三个 `子类`，其中两个是动物 ——
**学生看到的层级是引擎根本不用的那一层**：干扰项一直是从整个 `组别`（全部 24 只动物）里抽的。
现在菜单和出题都按 `组别`（动物 24 / 日常用品 12），`子类` 移进 **航海图鉴** 当章节内的小节
（陆上动物 / 水中与空中）—— 图鉴正是这个区分有意义、且看得见的地方。
⚠️ **规则：菜单层级与 `组别` 不许分叉。** 值得当选项的就该是一个 `组别`；不是 `组别` 的就不该
出现在顶层。以后扩词请新增 `组别`，不要把 `子类` 提上来。

### 2. PATCH_liquid_glass — 码头可以有自己的**风景**，不能有自己的**外壳**
⚠️ **这是 SPEC 的错，不是实现的错。** `SPEC_XH_MVP_v2.md` §5.2 让「把题目框进一块木牌里」，
`xh.css` 照做了并在文件头老实写下理由；但和 G2 的房间画面并排一看，码头像**另一个产品**。
所以面板全部换成 app.css 的 `.card` 玻璃配方（tokens 照抄，和 teacher.html 同一个约定）。
**木头降级成 accent**：小节标题下的那条线，以及**题目 sprite 背后的那块木牌**（内容可以是叙事的，
界面归平台）。木头不再是任何面板、瓦片、列表行的底色。
同时补上 PATCH 列的五个结构缺口里的四个（第五个「顶栏对齐」上一批已做）：
- **hero 卡**（`dock_bg.png` + 标题 + 三个数字），取代原来的开场文字面板；
- **进度可视化**：航程 / 一次答对率 / 集齐的组，取代孤零零的「3 / 36」；
- **动线编号 ①②**（选玩法 / 选词语组）。⚠️ 连线的「一次连几组」**故意不编号**，放在 ① 里面：
  它是刚选的玩法的设置，不是第三步；给它编号会让「选词语组」在 ② 和 ③ 之间来回跳。
- **入口瓦片**：航海图鉴（用 `xh_atlas_cover.png` 封面）+ 码头风云榜。
⚠️ hero 的文字压在美术上，所以 `::after` 用了**左侧 + 底部两层 scrim**：单一底部渐变时
「Start here…」那行正好落在天空的浅色带上读不出来（量过），而左侧渐变能保住右边的高脚屋不被压暗。

### 3. 词海垂钓（addendum §5）—— 拼音打字的**皮肤**，不是新玩法
猎物从水下升起破面（词雨是落下，这个是升起，两者手感刻意相反），打拼音「收线」；
答对 `dock_splash` 后弧线入篓，答错 `dock_ripple` 扩散、沉下去再浮上来，**什么都不损失**。
回合进度是鱼篓 空→半→满。sprite 一直留在猎物身上（水下剪影更有气氛，但会拿掉初学者依赖的图片线索）。
⚠️ **水面板是真的深色**：`dock_ripple` / `dock_splash` 是**白色线稿**，放在浅色面板上等于看不见。
这块深色是「风景」，允许；下面的输入框仍然是平台玻璃。
⚠️ 装饰 sprite 用 `aspect-ratio`（取自 `data/dock_manifest.csv` 的实际像素）预留盒子，
`width:auto` 的图在解码前会以 0 宽排版。

### 4. 航海值 + 码头风云榜
- **航海值**（努力）与 **航程**（认识的词）**永不合并、永不相加** —— 和山上 海拔 / 历练值
  同一条铁律。一个学生连打一周连线，航海值涨而航程不动，这个区别才是诚实的。
- ⚠️ **计分数值是我定的**，spec 只给了度量与「不合并」的规则，没给费率：
  `SAIL_PTS = { pic:2, listen:3, match:3, type:4, learn:0 }`，答错后重答减半（最少 1）——
  因为这一层的前提就是答错零代价。看图学词什么都不问，所以什么都不给。随时可调。
- **榜单范围是 校内 / 跨校**（owner 2026-08-15）。spec 写的是「same-stream peers」，
  但码头的学生**还没有年级**，有些甚至不修华文 —— stream 在这里不是一个存在的范围。
- Firestore 用**独立的 `dockScores/{uid}`**，不是 `scores/{uid}`：两个度量不许合并，
  放在不同文档里能让「不小心 join 到一起」变成不可能，而不只是不被鼓励。
  ⚠️ **必须先发布新规则**（`firestore.rules` 已加 `dockScores` 块，owner 副本已同步），
  否则学生看到「读取失败」。
- ⚠️ **校内是客户端过滤** top 60，不是 `where(school)+orderBy`（那要 owner 手动建复合索引）。
  码头这个规模够用；真长到几百人以上时校内榜会开始漏人，那时才需要索引。
- ⚠️ 榜单有 **6 秒读取死线**：学校网络下 Firestore 的 `get()` 可能一直 pending 而不 reject
  ——正是当初让四个科目页卡在「正在装载词库」的那件事——所以宁可给一句人话，不给一个永远转的圈。

### 5. 验证与部署
离屏 WKWebView（`shot.swift`，本次加了「settle 之后再跑一遍 JS」的第二段，用来量图片解码），
1280×1050 / 1100×900 / 375×812：菜单 hero + 两块瓦片 + ①② + 动物 24/日常用品 12、
图鉴按组别分章且 子类 成为小节、玻璃面板在港口背景上的实际观感、词海垂钓（水面板、答错沉下去、
拼音照常显形、输入不禁用 = 零代价）、答对真的 +2 航海值、榜单两个 tab 与两个范围、
以及**每次都重验**的「开关四次不重抽选项」。
四个 JS parse（JavaScriptCore），`xh.css` 括号 316/316，规则 35/35。
Cache-bust `20260815m` → **`20260815n`**（七处）。
⚠️ **离屏环境的一个已知限制（不是 bug）**：**点击之后**才插进 DOM 的 `<img>` 常常
`complete=false`、量到 0×0，虽然服务器已经 200 —— 所以词海垂钓的鱼竿/鱼篓/猎物、
以及答题页的词 sprite，在截图里是空的。改用 PIL 按同一套坐标把真图合成了一遍确认构图正确
（鱼竿左上压水面线、鱼篓右下、白线稿在水面上清清楚楚），但**真机仍需看一眼**。
⚠️ **TTS primer 与结算页同样只能在真机验收**（上一节已列）。榜单的 6 秒死线也一样：
离屏环境把 `setTimeout` 节流，测不出来。

### 6. 交接包里仍未做的
**贝壳 → 泊位 → 船只三级**（`SPEC_XH_berth_layout.md` 已给出量好的沙滩线 by≈62%、五个挂点、
和 `art/camp/camp_bg.png` 同尺寸的 `dock_bg.png`，以及 15 张三级船 sprite）·
**五枚航海徽**（美术在交接包里，未入库）· 消耗品（文档明确说没有赌注就不要做）。
`art/seamap/boat_*.png` 的一级舢板**没有替换**——那会改到落地海图的船，属于船只三级那一步。
交接包的四条 owner 待决也仍然开着（硬闸拼音泊位 / 垂钓赌注 / 榜单范围已答 / 靠岸的船长头像）。

## 词语汉兜提示重设计 · 2026-08-15 (owner 交付实现 + 两处修正)

Owner 给的 `汉兜重设计_2026-08-15_v2/` 里**已经带了实现**（`app.js` / `app.css`）。核对过：
那份 `app.js` 与仓库当时的 `app.js` 只差 104 行，全部落在 handle 区块和 EN_LAB/PY_LAB 两张表里，
`app.css` 只差一处 hunk —— 也就是说它确实是基于**当前**代码改的，不是旧快照，直接采用不会
把别的东西回退。（附带的 4 个 `*_index.html` **没有采用**：那几个文件与仓库只差 cache-bust 字符串，
它们停在 `20260815l`，会把版本号倒退。）设计与决定见 `DESIGN_迭代规划_汉兜重设计_2026-08-15.md`。

### 上线的机制
6 次 → **12 次，每行带行号**；提示从「渐进式揭示四个声母」改成**三个各买一次的独立提示**：
首字声母（**只揭第一个字，永远不会堆到四个**）/ 词性 / 释义，**只花灵露，绝不花历练值**
（掌握值是赚来的，不能买 —— 这是已锁的原则）；答错 4 次后**免费**给出释义作保底。
计分公式没变，只是「未用次数」上限从 5 变成 11：`6 + max(0, 12 - 已用行数)`。

### 我在采用时改的三处（都是实测发现的）
1. ⚠️ **赢局的灵露没有落盘（既有 bug，不是这次改出来的）。** 顺序是
   `saveStore() → scoreCorrect() → awardLingLu()`，而**真正写盘的是 `scoreCorrect` 里的
   `bankPts`**，所以奖励只留在内存里，学生赢完直接关标签页就没了。实测：赢一局钱包在
   localStorage 里纹丝不动。**改成先 `awardLingLu` 再 `scoreCorrect`**（和填空挑战同一个顺序），
   实测 100 → 120 正常落盘。以后在任何模式里加奖励，记住「写盘的是 bankPts」。
2. **12 行的滚动条会把已经打过的行顶出去。** 交付版在每次渲染后 `scrollTop = scrollHeight`，
   于是开局打两行、屏幕上却是九个空格。改成**只在最新一行掉到可视区下方时才滚，而且只滚刚好够**
   —— 实测桌面全程 `scrollTop:0`（第 1 行始终可见），手机打到第 10 行时才滚，且第 10 行可见。
3. **买不起的提示按钮只是变灰**，没有说为什么。加了 `title`「灵露不够，去词雨灵露赚一些」。
   另外把 `.handle-hintrow` / `.handle-hint` 两条旧样式**留了下来**（交付版的注释说留了，实际删了）：
   GitHub Pages 每个文件各自老化，学生可能新 CSS 配旧 JS 跑十分钟，那时旧 JS 还在发那一行声母。
   三行死样式比十分钟的裸露布局便宜。**下一次发布可以删掉。**

### G2 分支已删除（owner 2026-08-15 定案）
交付版有 `hints.sm = STREAM === "g2"`（G2 免费送首字声母），但**汉兜自 2026-08-13 起只对 G3/HCL
开放**，G2 的闯关页根本没有这张卡（实测：G2 只有 词雨 / 攀山竞速 / 组词挑战）。设计文档里那句
「G2 免费起始已解锁」和它引用的 G2 成语统计，都是基于更早的模式配置写的。
**Owner 决定：汉兜维持 G3/HCL，分支删掉**（留着不可达的代码只会让下一个人以为 G2 学生有免费提示）。
现在三个提示一律从「未购买」开始。`CAMP_MODES` 的 `only: ["g3","hcl"]` 与首页卡片的
`STREAM === "g3" || STREAM === "hcl"` 两处闸门都没有动，本来就是对的。
顺手修掉一处陈旧文案：首页卡片的 `title` 还写着「六次机会」，已改成「十二次机会」。

### ⚠️ 三个价格是可调参数
3 / 5 / 15 灵露是交付文档自己标注的初始值（便宜提示信息量小、贵提示信息量大）。
真实使用后若学生「从不买」或「秒买秒用」，动 `HANDLE_HINT_COST` 一处即可；
保底行数 `HANDLE_DEF_SAFETY_ROW = 4`、行数 `HANDLE_MAX_ROWS = 12` 同理。

### 验证（真浏览器）
离屏 WKWebView + no-store server。⚠️ **四个科目页在离屏环境里会一直停在「正在装载词库」** ——
云端回调不返回，而 6 秒兜底靠 `setTimeout`，离屏被节流。绕法：在 scratchpad 里搭一个
**不加载 firebase 的测试页**（`window.WSCloud` 为 undefined，`boot()` 就直接开门），
用符号链接指向仓库的 app.js/app.css/data/art。**这一招以后测四个科目页都能用。**
实测通过：12 行 + 行号 1–12、`0 / 12 次`、旧的 💡 提示按钮已消失、三个提示 chip 在 G3 全是待购、
买首字声母扣 3 灵露且**只**显示第一个字的声母、`pts.total` 全程为 0（提示不吃历练值）、
连打三次错**不**给释义、第四次错**免费**给出释义、赢局 `历练值 = 6 + (12-5) = 13`、连胜 +1、
钱包 100→120 落盘、买不起时按钮 disabled 且带 title、桌面与 375px 手机都无横向滚动。
`app.js` 解析通过，`app.css` 括号 878/878。Cache-bust `20260815n` → **`20260815q`**（跳过 o）。
删掉 G2 分支后复测：G3 三个 chip 全是待购、12 行、`0 / 12 次`、卡片 title 已是十二次机会；
G2 闯关页仍然只有 词雨 / 攀山竞速 / 组词挑战，没有汉兜。
⚠️ 未在真设备上验：12×4 在真手机上用手指打字时的手感（交付文档自己也把这条列为未决）。

## 组词挑战扩展至 G3 / HCL · 2026-08-15 (DESIGN_迭代规划_组词挑战扩展G3HCL_20260815.md)

设计文档的 §0 提醒得对：它是照着 `main` 上**没有滑杆**的旧版写的，而仓库里早就是
2026-08-14 加了「字块数量」滑杆的版本。所以下面按**目标行为**实作，不是照它的 diff 改。

### §3 的「重复字丢失」bug —— 复现不了，当前代码是对的
文档要求先修再扩展。**先测了，测不出来。** `asmChips()` 用的是 `w.w.split("")`（保留重复字），
干扰字只排除目标里出现过的字，然后 `target.concat(decoys)` —— 重复字天然带着。
实测：G2 抽到 **小心翼翼**（两个「翼」）与 **孜孜不倦**（两个「孜」），字块池里都是两块，
两题都能拼完；本轮最后那张 HCL 截图里的 **干一行爱一行** 更是**同时有两个「一」和两个「行」**。
- ⚠️ **对 owner 截图的解释（推测，但很可能）**：`.asm-chip.used{opacity:.28}` —— 点掉第一个「一」
  之后那块会淡到 28%，在截图里几乎看不见，于是「池子里只有一个一」。字其实还在，另一块是满不透明的。
  如果这确实困扰学生，那要改的是**已用字块的视觉**（比如打叉而不是淡出），不是取字逻辑。

### §2.1 词池 2–8 字
9 字以上（整句谚语）按文档排除：排列空间爆炸（9! = 362,880），逐字点选也不再是「检索记忆」。
⚠️ **我另外排除了带标点的条目**：放宽到 8 字后混进来「吃一堑，长一智」「刀子嘴,豆腐心」这类半句谚语
（四个 stream 加起来只有 4 条），逗号会变成一块可点的字块、还会进干扰池，点它什么也学不到。
同一个道理，只是短一点的引信。

### §2.2 干扰字随字数增长（⚠️ 规则是我定的）
固定总数会**反向**：16 块时 2 字词有 14 个干扰字，7 字成语只有 9 个 —— 越长越好猜，正是文档要修的。
文档给了建议表但**不知道滑杆存在**，并明说要我把两者调和。做法：**把滑杆读成「两字词要几块」，
每多一个字加两块**（一块是那个字本身，一块是多出来的干扰字），封顶 24，下限 `字数+2`（至少两个干扰字，
否则滑杆 6 撞上 8 字词就会把答案原样摆出来）。滑杆停在 12 时正好复现文档的表
（2字 12 · 4字 16 · 5字 18 · 6字 20），而特意把滑杆调到 6 的弱读者仍然得到小板面。
实测（滑杆 9 默认）：2字→9 · 3字→11 · 4字→13 · 6字→17 · 7字→19；滑杆 24 时 7字→24（封顶）。

### §2.3 / §2.4 滑杆上限 24 · 排版
`ASM_SIZES` 6/9/12/16 → **6/9/12/16/20/24**，下限与步进不动。
`asmCols()` 重写：原来只在 3–5 列里找**整除**，24 块能找到 4 列，但 22 块会一路退到 **2 列 × 11 行**。
现在在 3–6 列里挑最接近 √n、且**最后一行不是孤零零一块**的方案（整除有加权）。
实测：24→5 列（4×5+4）· 19→4 列（4+4+4+4+3）· 17→5 列（5+5+5+2）· 13→5 列，全都没有孤块。
手机（≤560px）字块 ≥20 时切成**固定 4 列 + 46vh 滚动**（`.asm-chips.many`）：375px 下每块
**68×56**，远高于 44px 热区底线 —— 字块变多时第一个不能牺牲的就是这个。
答案格 `.asm-slots` 加了 `flex-wrap`，8 字词在手机上换行而不是溢出。
滑杆读数显示学生自己的设置；本题实际块数不同时，下面补一行「本题 N 块（M 字词语）」，
免得标签和屏幕对不上。

### §2.5 开放范围
`CAMP_MODES` 的 `only: ["g1","g2"]` 去掉，首页卡片的 `STREAM === "g1" || STREAM === "g2"` 闸门去掉，
四个 stream 都能玩。按文档 §2.5 **没有加按年级的默认值分支** —— 字数分档本身已经隐含年级差异
（HCL 长词天然多）。
⚠️ 顺带的后果：**G1 现在也会抽到 5–7 字词**（G1 里只有 6 条）。文档没有为 G1 设上限，
如果实测发现太难，改 `startAssemble` 的 filter 加一条 stream 判断即可 —— 但那会推翻 §2.5 的
「不要按年级分支」，请 owner 定。

### 验证
离屏 WKWebView + 免 firebase 的测试页（见汉兜那一节）。G1/G2/G3/HCL 四个 stream 各跑完整回合：
G1 10 题全解（含 3 字）· G2 10 题全解（含一题 7 字 → 19 块 4 列）· G3 组词卡已出现、2字→9块、
4字→13块并显示「本题 13 块」· HCL 把复习范围收到 中一·单元六 后抽到 6 字与 7 字，
分别 17 块 / 19 块，全部拼得出来。手机 375px：24 块 → 4 列 + 滚动、无横向溢出、6 个答案格不换行。
`app.js` 解析通过（JavaScriptCore；这台机器没有 node，文档 §4.7 说的 `node --check` 用它代替），
`app.css` 括号 882/882。Cache-bust `20260815q` → **`20260815r`**。
⚠️ 未做（文档 §5 明确排除）：9 字以上进造句类模式、成语接龙、Match Up、Maze Chase。
⚠️ 未在真设备上验：手机上 24 块滚动网格用手指连点的手感。
