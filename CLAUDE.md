# CLAUDE.md — 词山学海 Vocab Summit

Read this before touching any file. It is the single source of truth for conventions.

## What this is

Vocabulary learning suite for 百德中学 Bukit View Secondary School (BVSS), Mother Tongue Languages Department.
Owner: 郑凯欣 (Kai Xin), HOD/MTL. Built AI-assisted; she is a non-programmer, so explain changes plainly and prefer small, verifiable patches over rewrites.

Four apps in one repo, one shared engine:
- 词星大冒险 (G1 基础华文) — G1_index.html
- 词将竞技场 (G2 普通学术华文) — G2_index.html
- 词王淬炼坊 (G3 快捷华文) — G3_index.html
- 词圣鸿文苑 (高级华文 HCL) — HCL_index.html

Name origin: 书山有路勤为径，学海无涯苦作舟. The couplet is featured on the landing page and must stay.

## File structure (FLAT — deliberately)

All files sit at repo root because content is updated via GitHub web upload, which cannot create folders.
Do NOT introduce subfolders unless the owner has moved to a git client.

- index.html — landing (horizon hero, couplet, four stream cards)
- G1/G2/G3/HCL_index.html — thin per-stream entries; each sets `window.STREAM` then loads app.js
- app.css — all styles; BVSS palette lives here as CSS variables
- app.js — the whole engine (vanilla JS, IIFE, no build step, no frameworks)
- g1/g2/g3/hcl.json — generated vocabulary data. NEVER hand-edit; regenerate from the Excel masters
- id_registry.json — stable word ID registry; always commit together with the JSON it matches
- badge_shkj/hx/gg/jj/whz.png — the five component badges (see Badge system below)

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
Mastery gate (beta decision): a correct answer in 填空挑战 at ANY difficulty tier marks the word mastered.
All progress is localStorage only (key ws2_{stream}); device-local, nothing leaves the device.

## TTS (Chinese-only, hard rule)

This is a CL app: only Chinese is ever read aloud. No English TTS anywhere (英文翻译 prompts are silent).
Speaker buttons: flashcard word + 释义, 填空挑战 sentence (blank spoken as a pause via "，", never the
answer), 华文解释 prompt, and auto-speak of the word after every answered question.
The speak() stack encodes hard-won device lessons — keep ALL of these:
1. Never pass pinyin strings to the engine (Android reads them as toneless English). Pass hanzi;
   POLY_MAP substitutes known polyphonic words (行为 xíng wéi, 行当 háng dang, …). Extend the map
   when a mispronunciation is reported.
2. Two-pass voice lookup: lang match first, then voice NAME keywords (普通话/中文/Chinese/Mandarin),
   because managed ChromeOS devices misreport or blank the lang field.
3. cancel() then speak() in the same tick silently drops the utterance on ChromeOS: keep the
   setTimeout(50) guard.
4. voiceschanged listener + 200ms retry (voices load async).
5. One-time warning toast when no Chinese voice exists (⚠️ 未找到中文语音…); permanent fix is IT admin
   enabling Google 普通话 in the ChromeOS admin console.

## Content rules

- 课文例句 are REMOVED from the published JSONs (no `ex` field) pending WRITTEN CPDD permission,
  because the beta has no login. The Excel masters keep them; when written permission + login exist,
  regenerate with `ex` restored. Do not reintroduce 例句 into published files before then.
- 填空句 (`cloze`) are self-authored (never 课文例句 by rule) and stay in the published data.
- 填空挑战 never shows a question without a valid `__` blank: words missing cloze are skipped with a
  console warning, never fall back to showing the answer.
- Word IDs (G3-0001 style) are permanent, keyed by stream|年级|单元|板块|词语 in the registry.
- Rows may be inserted anywhere in Excel; the registry keeps IDs stable. A word moved to a different
  unit/component gets a NEW id by design. Mastery/badges key off these ids, so registry stability matters.
- Component sets differ per stream (G1: 生活空间/核心/文化站 · G2/G3: +巩固 · HCL: all five incl. 进阶).
  Render whatever components appear in the data; never hardcode the list.

## Current phase and hard boundaries

Phase: v0.2 public test build. NO login, NO Firebase, NO server-side tracking; everything localStorage.
- 综合填空 (multi-blank passages) is EXCLUDED until the CL department human-vets the drafted passages.
- No service worker yet (deliberate, avoids cache pain during rapid testing). PWA packaging later.
- Repo is public for GitHub Pages free tier; freely shareable (all published content is owner-authored).

## Study modes and games (implemented in v0.2)

- 词语闪卡: flip cards, word + 释义 speakers, no 例句 (students use hardcopy textbooks), proper end
  screen (never an infinite loop).
- 填空挑战: student-selectable difficulty ladder, switchable mid-round from the rail:
  ⭐ 2 options / ⭐⭐ 3 / ⭐⭐⭐ 4 (near-synonym distractors, same POS first) / ⭐⭐⭐⭐ typing (2 tries,
  pinyin hint). Modelled on the S1 作业本 词语选择 2-option format.
- 华文解释 / 英文翻译: 4-option MCQ, meaning → word direction.
- 词雨 (all streams): falling words with gentle space-invader sway, IME typing input
  (compositionend-aware Enter), speed select 慢/中/快, pinyin toggle under words, 3 lives, waves every
  10 clears, score = 字数×10×combo + altitude bonus, personal best in localStorage only.
- 词语汉兜 (G2/G3/HCL only): 4-character word Wordle, 6 guesses, character-level grading
  (exact/present/absent, duplicate-aware), pool = 4-char words in scope (min 8), win streak tracked.
  (The full antfu/handle pinyin-level adaptation remains a possible later upgrade.)

## Roadmap (in order)

1. User-testing polish of v0.2 (current).
2. Remaining mini games: 反向打词 (G1 variant: English prompt + bank always visible),
   近义快辨 (distractors = same unit + same POS), 笔顺挑战 via chanind/hanzi-writer (G1/G2, MIT, credit).
   Shared config when built: unit multi-select; question count 5–50 step 5; option bank 120% of
   question count; auto-cap when scope too small. No duels/multiplayer; personal high scores only.
3. Firebase layer: Auth (centrally provisioned accounts, synthetic @bvss.vk emails, no real PII) +
   Firestore (asia-southeast1) + leaderboards (班级榜/全校榜 × 本季度/历史总榜) + offline persistence.
   Security model: tight Firestore rules + authorised domains; the web API key is public by design.
4. Restore 例句 to published data once CPDD written permission is on file (and login exists).
5. PWA packaging (manifest + service worker + offline score queue).

## Engineering conventions

- Single-purpose targeted patches with pre-verified anchors (assert old string exists before replacing).
- Test with a local HTTP server (fetch fails on file://) and Playwright when available.
- Falling-word/game layouts must reflow with the visual viewport (on-screen keyboard); landscape-first
  everywhere per the design rule above.
- Responsive breakpoint: rail + stage and two-column home at ≥900px; single column below.
- IME inputs: track compositionstart/compositionend and ignore Enter during composition.
