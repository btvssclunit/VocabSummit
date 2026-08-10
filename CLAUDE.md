# CLAUDE.md — 词山学海 Vocab Summit

Read this before touching any file. It is the single source of truth for conventions.
Last updated: 2026-08-09.

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
- world.html — 我的词山 mountain-world scene; three_min.js is Three.js r128 (minified; this
  build has no OrbitControls and no CapsuleGeometry — use Cylinder/Sphere/custom geometries)
- g1/g2/g3/hcl.json — generated vocabulary data (see Vocabulary data below for the edit rules)
- id_registry.json — stable word ID registry; always commit together with the JSON it matches
- badge_shkj/hx/gg/jj/whz.png — the five component badges (see Badge system below)
- landing_hero_bg / hero_bg / study_bg / rain_bg / sprint_bg .png — scene backgrounds
- sprite_g1/g2/g3/hcl_raw.png + tileset_raw.png — 8-bit art awaiting processing (magenta
  #FF00FF background removal, 6-frame layout). Never ship the raw files into a scene.

Kept with the Excel masters, NOT in the repo: generate_vocab_json.py, check_consistency.py.

## Design system (locked decisions)

- One unified BVSS identity across all four apps (school pride > per-stream theming).
- Palette tokens (in app.css :root): 晴空 sky #DFEDF7→#BAD6E8, 旭日 sun #FFEDA8/#F5C443,
  青山 #5B8A66, 深山 #3F704F, 碧海 #2E6391, 深海 #1F4A70, ink #243B4A, gold #E3A63C.
- The horizon scene = school logo: THREE mountain peaks (centre tallest, in front), gradients +
  right-side shadow faces for depth, mountains and sea always run edge to edge, sun on the RIGHT (旭日东升).
- Light backgrounds carry dark ink text on white cards; deep-sea navy panels carry light text.
- Vertical couplet uses width:1.15em + word-break (NOT writing-mode, which renders unreliably).
- Quotation marks in any code-embedded dialogue text: curly double quotes " " (never 「」, never straight ").
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
1. Never pass pinyin strings to the engine (Android reads them as toneless English). Pass hanzi;
   POLY_MAP substitutes known polyphonic words (行为 xíng wéi, 行当 háng dang, …). Extend the map
   when a mispronunciation is reported.
2. Two-pass voice lookup: lang match first, then voice NAME keywords (普通话/中文/Chinese/Mandarin),
   because managed ChromeOS devices misreport or blank the lang field.
3. cancel() then speak() in the same tick silently drops the utterance on ChromeOS: keep the
   setTimeout(50) guard. Samsung devices need the same 50ms delay between cancel and speak.
4. voiceschanged listener + 200ms retry (voices load async).
5. One-time warning toast when no Chinese voice exists (⚠️ 未找到中文语音…); permanent fix is IT admin
   enabling Google 普通话 in the ChromeOS admin console.
Watchlist after the 2026-08-09 pinyin fixes: verify 撇 (piě) and 拧 (nǐng) on devices; 绷 is
deliberately bēng in G3 and běng in HCL. Add POLY_MAP entries if any are misread.

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
- 攀山竞速: fixed-viewport canvas with camera-follow; answering is movement; timer 60/90/120s,
  choice remembered per device; combo tones; personal-record flag line; TTS for question prompt
  and options; placeholder pixel climber in the level accent colour until the sprite pipeline lands.
- 我的词山: persistent mountain world, one mountain per level, entered from the home mini-horizon.
  Altitude = mastered word count, 1词 = 1米, never decreases (locked rule).
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
   No real student PII ever. (Supersedes the earlier synthetic-accounts + leaderboards plan;
   leaderboards are currently dropped.)
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
- three_min.js is required by world.html. If it is missing or fails to load, the sailing page renders
  as a flat blue page with only the HUD pills: check for that file first before debugging the scene.
- Landing page layout rule: .lp-logo, .lp-school and .lp-couplet are position:absolute, so a
  .lp-hero-spacer div (height matching .lp-hero) must sit before the gate in index.html. Without it,
  whichever normal-flow child is visible (gate, greeting, or cards) stacks at the top of the hero box
  instead of below the artwork. In portrait, the spacer is hidden and gate/greeting/cards each get
  46vh top clearance instead.
- world.html island tuning (this session): heights 26/32/38/44, steeper cone (coneR = R - 9),
  rock cap and summit flag use each island's stream colour so streams are identifiable from afar,
  fog 140/340, name labels 30 x 7.5, chase camera at distance 19, height 13. Smoke-tested with a
  mocked-THREE runner (setup + 6 frames, no exception).
- Level-page mini-horizon uses landing_hero_bg.png (app.js miniHorizon). If a deployed level page
  shows different art, the deployed app.js is stale.
