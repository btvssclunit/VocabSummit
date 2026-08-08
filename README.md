# 词山学海 · Vocab Summit

Vocabulary learning suite for 百德中学 Bukit View Secondary School, Mother Tongue Languages Department.
名取「书山有路勤为径，学海无涯苦作舟」：攀词山，渡学海。
Four apps, one shared horizon: 词星大冒险 (G1) · 词将竞技场 (G2) · 词王淬炼坊 (G3) · 词圣鸿文苑 (HCL).

## Current status: v0.1 test build

- No login. Study modes work fully; progress saves to the device only (localStorage).
- Four study modes per stream: 词语闪卡 (with TTS), 填空挑战, 华文解释, 英文翻译.
- Vocabulary loads from external JSON in `/data/` (content decoupling complete: no hardcoded word arrays).

## Structure

```
index.html          landing page (shared horizon, links to the four apps)
shared/app.css      BVSS palette + all UI components
shared/app.js       shared engine: data loading, unit scoping, study modes
data/*.json         generated vocabulary (do not hand-edit; regenerate from Excel masters)
data/id_registry.json   stable word ID registry (always commit together with the JSON)
g1/ g2/ g3/ hcl/    thin per-stream entry pages
```

## Deploy to GitHub Pages

1. Create the repository (under the CL unit account): e.g. `vocab-summit`.
2. Push this folder's contents to the `main` branch.
3. Repo Settings → Pages → Source: `main` branch, root folder.
4. The site appears at `https://<account>.github.io/<repo-name>/` within a minute or two.

Note: the app must be served over HTTP(S). Opening `index.html` by double-clicking will
show a friendly error because browsers block `fetch` of local JSON files.

## Updating vocabulary

1. Edit the Excel master (any row position; insertion anywhere is safe).
2. Run `generate_vocab_json.py --src <xlsx folder> --out data` (script kept with the masters).
3. Commit the changed `data/*.json` and `data/id_registry.json` together.

## Roadmap

- Phase 2: Firebase Auth + Firestore (accounts, score sync, leaderboards), offline persistence.
- Phase 3: mini games — 词雨, 反向打词, 成语汉兜 (G2+), 近义快辨 (G3/HCL), 笔顺挑战 (G1/G2).
- Phase 4: PWA packaging (manifest + service worker), badges.
- Future (not gated to any launch): 综合填空 passage mode. The drafted passages require full human vetting by the CL department before any release; no timeline attached.

## Open-source credits

- [antfu/handle](https://github.com/antfu/handle) (MIT) — inspiration and reference for the planned 成语汉兜 mode
- [chanind/hanzi-writer](https://github.com/chanind/hanzi-writer) (MIT) — planned stroke-order engine
- [olehermanse/Typing-Game](https://github.com/olehermanse/Typing-Game) — reference for the planned falling-words mode

Vocabulary source: MOE CPDD 《华文伴我行》 (Marshall Cavendish Education), used with CPDD approval, ringfenced to BVSS students.
