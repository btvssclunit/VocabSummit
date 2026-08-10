# 词山学海 · Vocab Summit

词山学海是百德中学母语部华文组出品，由母语部主任郑凯欣老师主导设计与开发，是为学生打造的华文词汇自主学习平台，覆盖 G1 基础华文、G2 华文、G3 华文及高级华文四大源流，共三千余个词条。学生可通过词语闪卡、填空挑战、词雨、汉兜、攀山竞速等多种游戏化模式，在"词山"上逐步攀登，巩固词汇掌握。平台设计参考自主学习动机理论与形成性评价原则。

Vocab Summit is developed by the Mother Tongue Languages (MTL) Chinese Language Unit at Bukit View Secondary School (BVSS), led by HOD/MTL Chun Kai Xin. It is a gamified Chinese vocabulary self-directed learning platform spanning four curriculum streams — G1 Foundation Chinese, G2 Chinese, G3 Chinese, and Higher Chinese (HCL) — with over 3,700 vocabulary entries. Students climb a persistent "word mountain" through flashcards, cloze challenges, word-rain, a Wordle-style character game, and a mountain-sprint mode, grounded in self-determination theory (SDT) and assessment-for-learning (AfL) principles.

名取「书山有路勤为径，学海无涯苦作舟」：攀词山，渡学海。
Four apps, one shared horizon: 词星大冒险 (G1) · 词将竞技场 (G2) · 词王淬炼坊 (G3) · 词圣鸿文苑 (HCL).

## Current status

- Firebase anonymous authentication + Cloud Firestore (asia-southeast1) for progress sync; 进度码 available as a manual cross-device fallback.
- Four study modes per stream plus mini-games: 词语闪卡 (with TTS), 填空挑战, 词雨灵露, 攀山竞速, 汉兜, and 组词挑战 (G2 only).
- 我的词山: a single static illustrated word-mountain with four altitude zones, gym battles (年度试炼) at each year level, and a 待巩固 review queue for missed words.
- Vocabulary loads from external JSON files (no hardcoded word arrays); ~3,741 entries across all four streams.
- All example sentences are original, authored by the department. No third-party textbook material is used.

## Structure

Flat-file static site, no build step, all files at repository root:

```
index.html                          landing page (nickname picker, four path cards)
nickname.js                         entry-gate nickname logic
app.js / app.css                    shared engine: data loading, study modes, mountain, mini-games
G1_index.html / g1.json             基础华文
G2_index.html / g2.json             华文
G3_index.html / g3.json             华文
HCL_index.html / hcl.json           高级华文
id_registry.json                    stable word ID registry (always commit together with the JSON)
firebase-init.js                    Firebase config and anonymous auth
mountain_bg.png                     static 我的词山 background (shared across all four streams)
bg-01..05 / rain_bg / sprint_bg     scene backgrounds (progression ambience, mini-games)
```

## Deploy to GitHub Pages

1. Repository lives under the BVSS MTL CL Unit account.
2. Push this folder's contents to the `main` branch.
3. Repo Settings → Pages → Source: `main` branch, root folder.
4. The site appears at `https://btvssclunit.github.io/VocabSummit/` within a minute or two.

Note: the app must be served over HTTP(S). Opening `index.html` by double-clicking will show a friendly error because browsers block `fetch` of local JSON files.

## Updating vocabulary

1. Edit the relevant Excel master (any row position; insertion anywhere is safe).
2. Run `generate_vocab_json.py` to regenerate the stream JSON files.
3. Commit the changed `*.json` and `id_registry.json` together.
4. New words are always appended to the end of their unit arrays, never inserted mid-array, to preserve existing progress mappings.

## Roadmap

- Personal progress dashboard + 个人词语表: a word-level mastery browser (未开始 / 学习中 / 已掌握) so students can see and revisit specific words, not just aggregate counts.
- Full cross-device sync via a proper login layer (current sync is limited by anonymous auth being device-siloed).
- SLS integration as a long-term pathway, pending ETD/DXD support.
- Succession: repository and Firebase ownership fully anchored to the BVSS MTL CL Unit account for continuity beyond any one teacher.

## Credits

词山学海 · Vocab Summit is designed and built by the Mother Tongue Languages Chinese Language Unit at Bukit View Secondary School, led by HOD/MTL Chun Kai Xin. All vocabulary definitions and example sentences are original department authorship.
