# 词山学海 · Vocab Summit

词山学海是百德中学母语部华文组出品，由母语部主任郑凯欣老师主导设计与开发，是为学生打造的华文词汇自主学习平台，涵盖 G1 至 G3 高级华文四大源流，另设「学海起步 · 出发码头」零起点入门层，共三千八百余个词条。学生可通过词语闪卡、填空挑战、词雨灵露、词语汉兜、攀山快答等多种游戏化模式，在「词山」上逐步攀登，巩固词汇掌握。平台设计参考自主学习动机理论与形成性评价原则。

Vocab Summit is developed by the Mother Tongue Languages (MTL) Chinese Language Unit at Bukit View Secondary School (BVSS), led by HOD/MTL Chun Kai Xin. It is a gamified Chinese vocabulary self-directed learning platform spanning the four curriculum streams from G1 to G3 Higher Chinese, plus a pre-G1 beginners' tier, 学海起步, for students starting from zero. Students climb a persistent "word mountain" through flashcards, cloze challenges, word-rain, a Wordle-style character game and a mountain-sprint mode, grounded in self-determination theory (SDT) and assessment-for-learning (AfL) principles.

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
| 出发码头 | `XH_index.html` | 学海起步 · 零起点入门层 |

`teacher.html` is a separate teacher dashboard (email sign-in, approval required), and
`tools/` holds two device diagnostics. Both are `noindex`.

Dashboard access is tiered, and the tiers are enforced in Firestore security rules
rather than by hiding buttons: a school's teachers see only their own school, a school
HOD additionally edits their own school and approves their own school's teachers,
officers from MOE HQ or SCCL see every school read-only, and the developer account
sees and edits everything. Each school's HOD maintains their own class roster from the
dashboard, which is what the student registration page reads.

## Search and sharing

Every student-facing page carries a description, a canonical URL, Open Graph and
Twitter card tags; `art/og-card.jpg` (1200×630) is the shared social preview.
`sitemap.xml` lists the seven public pages and `index.html` carries JSON-LD
(`WebSite` + `EducationalOrganization` + `LearningResource`).

There is deliberately **no `robots.txt`**: the site lives at
`btvssclunit.github.io/VocabSummit/`, a subdirectory, and crawlers only read
`robots.txt` at the domain root — which this repository does not own. Submit the
sitemap directly in Search Console instead. `google131a328dc6f2852c.html` at the
repository root is the Search Console verification file; removing it drops
verification.

## Repository layout

Static site, **no build step**. The HTML entry points stay at the repository root
because they are the published URLs; everything else is filed by kind.

```
/                      index.html                     landing page + 航海选择页 sea map
                       G1|G2|G3|HCL_index.html        the four streams (each sets window.STREAM)
                       XH_index.html                  出发码头 (学海起步, standalone tier)
                       teacher.html                   teacher dashboard (standalone, loads no shared JS)
                       firestore.rules                Firestore security rules (publish from the console)
                       README.md · CLAUDE.md          this file · the engineering log

js/     cs.js         the whole stream engine: data loading, study modes, games, 我的词山, 营地
        arena.js       结伴登峰 / 同伴挑战 live rooms (deliberately isolated from cs.js)
        profile.js     我的档案, 头像目录, 进度码, 意见反馈 — the sole owner of ws2_profile
        nickname.js    landing gate, nickname picker, sea map + sailing
        search.js      通用搜索 — one word lookup across all five stations, read-only
        podium.js      end-of-round podium + confetti — the one shared module teacher.html loads
        firebase-init.js  anonymous auth + Firestore helpers
        xh.js          出发码头 (never loads cs.js; its own store, its own economy)

css/    cs.css        every stream-page style, incl. the BVSS palette tokens
        xh.css         出发码头 styles (standalone; palette copied from cs.css by design)

data/   g1|g2|g3|hcl.json   generated vocabulary, one file per stream
        id_registry.json    stable word IDs — always commit together with the JSON
        xh_v3.json          出发码头 word list — 156 words in 8 groups (数字 has no sprites)
        search_index.json   词/拼音/英文/所属站 only — the cross-station search index
        xh_phrases.json     生活空间 sentence library (90 lines; distractors drawn at runtime)

art/    bg/            scene + progression backdrops
        badge/         A层 里程碑徽章 (5) + B层 对战奖牌 (8)
        avatar/        头像目录 portraits (square, face left)
        sprite/avatar/ playable 6-frame avatar sprites (face right) — a SEPARATE family
        camp/          营地 scene, gear and pets
        mountain/      per-stream 我的词山 art
        seamap/        landing sea map: islands, sea, boats
        item/          consumable / powerup art
        xh/            出发码头 sprites, scenes (scene_*.png) and 航海徽 badges

tools/  voices.html    TTS voice diagnostic — run on a student device to check the Chinese voice
        sound.html     audio diagnostic — WebAudio vs speech, for「no sound effects」reports

docs/   ARCHIVE_工程日志_2026-08.md   the engineering log — history, not spec
        HANDOFF_*.md   design handoffs
        BRIEF_*.md     open questions and art requirements handed back to the designers
        DECISIONS_*.csv  per-word rulings awaiting the owner, pre-filled with a recommendation
archived_art/          retired art, kept rather than deleted
```

**Naming rule (2026-08-22):** one new word per user-facing label, and it must be
the noun — the remaining characters have to keep the label guessable while that word
is still undecoded. Transparent verb-object beats literary compound (看图识词 works at
zero readiness; 词海垂钓 did not), and a coined name cannot be asked about at home.
Renaming a label always means renaming its 拼音 and 英文 gloss-table keys in the same
edit, or the ruby silently disappears for exactly the students it exists to help.

**Two rules that are easy to break:** a stylesheet's `url()` is resolved against
the *stylesheet*, so paths in `css/` climb with `../art/…`, while every path built
in JavaScript is resolved against the *page* and therefore stays `art/…`. And the
version query (`?v=`) on the asset tags must be bumped on every deploy — see
CLAUDE.md, 部署缓存版本号.

## Current status

- No sign-up and no password. The first visit asks for a nickname, an identity, a class
  (students only, optional) and then an avatar: the picker opens straight after the
  nickname is confirmed, rather than waiting to be found in 我的档案. It offers the free
  avatars only; the priced and earned ones stay in 我的档案 alongside their prices and
  unlock conditions. Everything is changeable later, and the whole identity is shared
  between the mountains and the pier.
- Firebase anonymous authentication + Cloud Firestore (asia-southeast1) for progress
  sync; 进度码 available as a manual cross-device fallback.
- Per stream: 学习 (填空挑战 · 华文解释 · 英文翻译 · 词语闪卡) and 闯关 (词雨灵露 ·
  攀山快答 · 组字成词, all four streams; 词语汉兜 on G3/HCL).
- 结伴登峰 (teacher-hosted live rooms) and 同伴挑战 (student-hosted duels).
- 我的词山 per stream: a 你在这里 pin, four 关卡 (one per year, each holding that
  year's units and its 年度试炼) and the 顶峰, plus a 待巩固 review queue.
- 营地 with 灵露, gear and 我的档案 / 头像 (some earned, some bought).
- Consumables and powerups bought at the 营地 shop: up to three are equipped before a
  词雨灵露 or 攀山快答 round. They buy easier test conditions, never a lower bar for
  knowing the word, and a kitted round is kept off the shared 词雨 / 攀山 boards.
- 出发码头: a beginners' tier, for students with no prior Chinese. 学习 holds 词语闪卡 and 学习挑战
  (英文选词 · 看图识词 · 听音识图 ‖ 看句选词 · 组词成句 ‖ 连线 · 组字成词); 闯关 holds
  词海钓鱼 and 沙滩快跑; 走进社区 walks the sentence library scene by scene. Its own
  currency and boards, sealed off from the mountains' 海拔 / 历练值 / 灵露.
- Vocabulary loads from external JSON (no hardcoded arrays): 3,741 stream entries
  plus 156 at the pier.
- 拼音 and 英文 interface aids for G1–G3, student-toggled, off by default. At the
  pier both default ON, and the flashcard always shows them: its readers are beginners.
  Every flip is dated in the student's own store, so the dashboard can say when a
  student started weaning off a support, and export the whole cohort's changes as CSV.
- 通用搜索: look up any word from any of the five stations — 词, toneless 拼音 or English.
  One row per word, with chips showing every stream that teaches it, and the searcher's
  own stream first. Read-only by design; a result speaks the word and never opens an
  activity, so the pier's progress and currency stay sealed off from the mountains'.
- 复习范围 can be a pasted list. A student drops in the revision list their teacher
  handed out — numbering, pinyin and mixed separators are all tolerated — and the words
  that match become the scope. Unmatched words are listed, never silently dropped.
  Stream-local, and it persists across reloads. The pier has the same box under
  ①学习范围, with 拼音 and English on every label.
- 船只: four tiers shared by the pier and the landing sea map, bought with either
  贝壳 (pier) or 灵露 (a level's camp shop), owned globally and freely swapped.
- All example sentences are original departmental authorship. No third-party
  textbook material is used.

## Deploy to GitHub Pages

1. Repository lives under the BVSS MTL CL Unit account.
2. Commit and push to `main`.
3. Repo Settings → Pages → Source: `main` branch, root folder.
4. The site appears at <https://btvssclunit.github.io/VocabSummit/> within a minute or two.

⚠️ Bump the `?v=` version (date, then a suffix for repeat same-day deploys:
`b`…`z`, then `AA`, `Ab`, `Ac`; the date itself always stays truthful) on the
asset tags in the six entry pages and `ASSET_V` in
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
- PWA packaging (manifest + service worker + offline queue).
- Pre/post assessment instrument for the learning-evidence base.
- Succession: repository and Firebase ownership anchored to the BVSS MTL CL Unit
  account for continuity beyond any one teacher.

## Credits

词山学海 · Vocab Summit is designed and built by the Mother Tongue Languages Chinese
Language Unit at Bukit View Secondary School, led by HOD/MTL Chun Kai Xin. All
vocabulary definitions and example sentences are original departmental authorship.
