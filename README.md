# 词山学海 · Vocab Summit

词山学海是百德中学母语部华文组出品，由母语部主任郑凯欣老师主导设计与开发，是为学生打造的华文词汇自主学习平台，覆盖 G1 基础华文、G2 华文、G3 华文及高级华文四大源流，另设「学海启航 · 启航码头」零基础入门层，共三千八百余个词条。学生可通过词语闪卡、填空挑战、词雨灵露、词语汉兜、攀山竞速等多种游戏化模式，在「词山」上逐步攀登，巩固词汇掌握。平台设计参考自主学习动机理论与形成性评价原则。

Vocab Summit is developed by the Mother Tongue Languages (MTL) Chinese Language Unit at Bukit View Secondary School (BVSS), led by HOD/MTL Chun Kai Xin. It is a gamified Chinese vocabulary self-directed learning platform spanning four curriculum streams — G1 Foundation Chinese, G2 Chinese, G3 Chinese, Higher Chinese (HCL) — plus a pre-G1 beginners' tier, 学海启航, for students starting from zero. Students climb a persistent "word mountain" through flashcards, cloze challenges, word-rain, a Wordle-style character game and a mountain-sprint mode, grounded in self-determination theory (SDT) and assessment-for-learning (AfL) principles.

名取「书山有路勤为径，学海无涯苦作舟」：攀词山，渡学海。

**Live:** <https://btvssclunit.github.io/VocabSummit/>

## The five destinations

The landing page is a sea map. Each island is one destination:

| 入口 | 页面 | 内容 |
|---|---|---|
| 词星大冒险 | `G1_index.html` | G1 基础华文 |
| 词将竞技场 | `G2_index.html` | G2 华文 |
| 词王淬炼坊 | `G3_index.html` | G3 快捷华文 |
| 词圣鸿文苑 | `HCL_index.html` | 高级华文 |
| 启航码头 | `XH_index.html` | 学海启航 · 零基础看图学词 |

`teacher.html` is a separate teacher dashboard (email sign-in, HOD approval), and
`tools/` holds two device diagnostics.

## Repository layout

Static site, **no build step**. The HTML entry points stay at the repository root
because they are the published URLs; everything else is filed by kind.

```
/                      index.html                     landing page + 航海选择页 sea map
                       G1|G2|G3|HCL_index.html        the four streams (each sets window.STREAM)
                       XH_index.html                  启航码头 (学海启航, standalone tier)
                       teacher.html                   teacher dashboard (standalone, loads no shared JS)
                       firestore.rules                Firestore security rules (publish from the console)
                       README.md · CLAUDE.md          this file · the engineering log

js/     app.js         the whole stream engine: data loading, study modes, games, 我的词山, 营地
        arena.js       结伴登峰 / 同伴挑战 live rooms (deliberately isolated from app.js)
        profile.js     我的档案, 头像目录, 进度码, 意见反馈 — the sole owner of ws2_profile
        nickname.js    landing gate, nickname picker, sea map + sailing
        search.js      通用搜索 — one word lookup across all five stations, read-only
        firebase-init.js  anonymous auth + Firestore helpers
        xh.js          启航码头 (never loads app.js; its own store, its own economy)

css/    app.css        every stream-page style, incl. the BVSS palette tokens
        xh.css         启航码头 styles (standalone; palette copied from app.css by design)

data/   g1|g2|g3|hcl.json   generated vocabulary, one file per stream
        id_registry.json    stable word IDs — always commit together with the JSON
        xh_v3.json          启航码头 word list — 150 words in 8 groups (数字 has no sprites)
        search_index.json   词/拼音/英文/所属站 only — the cross-station search index

art/    bg/            scene + progression backdrops
        badge/         A层 里程碑徽章 (5) + B层 对战奖牌 (8)
        avatar/        头像目录 portraits (square, face left)
        sprite/avatar/ playable 6-frame avatar sprites (face right) — a SEPARATE family
        camp/          营地 scene, gear and pets
        mountain/      per-stream 我的词山 art
        seamap/        landing sea map: islands, sea, boats
        item/          consumable / powerup art (system not built)
        xh/            启航码头 sprites, scenes (scene_*.png) and 航海徽 badges

tools/  voices.html    TTS voice diagnostic — run on a student device to check the Chinese voice
        sound.html     audio diagnostic — WebAudio vs speech, for「no sound effects」reports

docs/   HANDOFF_*.md   design handoffs
        BRIEF_*.md     open questions and art requirements handed back to the designers
        DECISIONS_*.csv  per-word rulings awaiting the owner, pre-filled with a recommendation
archived_art/          retired art, kept rather than deleted
```

**Two rules that are easy to break:** a stylesheet's `url()` is resolved against
the *stylesheet*, so paths in `css/` climb with `../art/…`, while every path built
in JavaScript is resolved against the *page* and therefore stays `art/…`. And the
version query (`?v=`) on the asset tags must be bumped on every deploy — see
CLAUDE.md, 部署缓存版本号.

## Current status

- Firebase anonymous authentication + Cloud Firestore (asia-southeast1) for progress
  sync; 进度码 available as a manual cross-device fallback.
- Per stream: 填空挑战 · 华文解释 · 英文翻译 · 词语闪卡, plus 词雨灵露 · 攀山竞速 ·
  组词挑战 (all four streams) and 词语汉兜 (G3/HCL).
- 结伴登峰 (teacher-hosted live rooms) and 同伴挑战 (student-hosted duels).
- 我的词山 per stream, with 年度试炼 at each year level and a 待巩固 review queue.
- 营地 with 灵露, gear and 我的档案 / 头像 (some earned, some bought).
- 启航码头: a zero-Chinese-required entry tier — 看图学词, 看图识词, 听音识图,
  英文选词, 词海垂钓, 连线 — with its own currency and boards, sealed off from the
  mountains' 海拔 / 历练值 / 灵露.
- Vocabulary loads from external JSON (no hardcoded arrays): 3,741 stream entries
  plus 100 at the pier.
- 拼音 and 英文 interface aids for G1–G3, student-toggled, off by default. At the
  pier both default ON, and the flashcard always shows them: its readers are beginners.
- 通用搜索: look up any word from any of the five stations — 词, toneless 拼音 or English.
  Read-only by design; a result speaks the word and never opens an activity, so the
  pier's progress and currency stay sealed off from the mountains'.
- 船只: four tiers shared by the pier and the landing sea map, bought with either
  贝壳 (pier) or 灵露 (a level's camp shop), owned globally and freely swapped.
- All example sentences are original departmental authorship. No third-party
  textbook material is used.

## Deploy to GitHub Pages

1. Repository lives under the BVSS MTL CL Unit account.
2. Commit and push to `main`.
3. Repo Settings → Pages → Source: `main` branch, root folder.
4. The site appears at <https://btvssclunit.github.io/VocabSummit/> within a minute or two.

⚠️ Bump the `?v=` version on the asset tags in the six entry pages and `ASSET_V` in
`teacher.html` in the same commit, or browsers will serve a mixed old/new set of
files for up to ten minutes. CLAUDE.md explains why this bit people twice.

Note: the app must be served over HTTP(S). Opening `index.html` by double-clicking
shows a friendly error, because browsers block `fetch` of local JSON files.

## Updating vocabulary

1. Edit the relevant Excel master (row position anywhere; insertion is safe).
2. Run `local-admin/generate_vocab_json.py` (kept with the masters, not in this repo)
   and check `--verify` before writing.
3. Commit the changed `data/*.json` and `data/id_registry.json` **together**.
   Then run `local-admin/generate_search_index.py --write` so the search index cannot
   drift from what ships; it reads the published JSON, not the masters.
4. New words are appended to the end of their component block, never inserted
   mid-block, so existing 进度码 keep decoding correctly.

## Roadmap

- Weak-first review queues across every mode.
- Consumables / powerups (art is in `art/item/`, the system is not built).
- PWA packaging (manifest + service worker + offline queue).
- Pre/post assessment instrument for the learning-evidence base.
- SLS integration as a long-term pathway, pending ETD/DXD support.
- Succession: repository and Firebase ownership anchored to the BVSS MTL CL Unit
  account for continuity beyond any one teacher.

## Credits

词山学海 · Vocab Summit is designed and built by the Mother Tongue Languages Chinese
Language Unit at Bukit View Secondary School, led by HOD/MTL Chun Kai Xin. All
vocabulary definitions and example sentences are original departmental authorship.
