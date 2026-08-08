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

## Data pipeline

Excel masters (kept by owner, not in repo) → generate_vocab_json.py → g*.json + id_registry.json.
- Word IDs (G3-0001 style) are permanent, keyed by stream|年级|单元|板块|词语 in the registry.
- Rows may be inserted anywhere in Excel; the registry keeps IDs stable. The old "append-only array" rule is retired.
- A word moved to a different unit/component gets a NEW id by design.
- Component sets differ per stream (G1: 生活空间/核心 · G2: +巩固 · G3: +文化站 · HCL: 进阶 instead of 文化站).
  Render whatever components appear in the data; never hardcode the list.

## Current phase and hard boundaries

Phase: v0.x public test build. NO login, NO Firebase, NO tracking; progress is localStorage only.
- 综合填空 (multi-blank passages) is EXCLUDED from launch until the CL department human-vets the drafted
  passages. Do not add it, reference material exists in OneDrive DOCX only.
- 填空挑战 (single-sentence cloze) stays; its 填空句 come from the vetted masters.
- No service worker yet (deliberate, avoids cache pain during rapid testing). PWA packaging is a later phase.
- Repo is public for GitHub Pages on the free tier; may move private under GitHub Enterprise later.

## Roadmap (in order)

1. Polish study modes from user testing feedback (current).
2. Firebase layer: Auth (centrally provisioned accounts, synthetic @bvss.vk emails, no real PII) +
   Firestore (asia-southeast1) + leaderboards (班级榜/全校榜 × 本季度/历史总榜) + offline persistence.
   Security model: tight Firestore rules + authorised domains; the web API key is public by design.
3. Mini games on a shared engine with shared config (unit multi-select; question count 5–50 in steps of 5;
   option bank = 120% of question count; auto-cap when the scope is too small):
   - 词雨 (falling words, IME pinyin) — all streams
   - 反向打词 (meaning → type the word; G1 variant: English prompt only + bank always visible) — all streams
   - 成语汉兜 (idiom Wordle, adapt antfu/handle, MIT, credit in README) — G2/G3/HCL
   - 近义快辨 (synonym discrimination from cloze sentences; distractors = same unit + same POS) — G3/HCL
   - 笔顺挑战 (stroke order via chanind/hanzi-writer, MIT) — G1/G2
   No duels/multiplayer; this is a self-study app. Personal high scores only for games.
4. PWA packaging (manifest + service worker + offline score queue).

## Engineering conventions

- Single-purpose targeted patches with pre-verified anchors (assert old string exists before replacing).
- Test with a local HTTP server (fetch fails on file://) and Playwright when available.
- TTS: speechSynthesis voices load async on ChromeOS; keep the voiceschanged listener + 200ms retry in speak().
- Falling-word/game layouts must reflow with the visual viewport (on-screen keyboard); portrait-first on touch,
  landscape for physical keyboards; never lock orientation (iOS ignores manifest lock anyway).
- Responsive breakpoint: two-column home layout at ≥900px; study screens capped at 680px reading width.
