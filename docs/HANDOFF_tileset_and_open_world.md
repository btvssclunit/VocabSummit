# Handoff: 词山学海 Vocab Summit, tileset pipeline and open-world maps

Paste this whole file into a new chat to continue. Written 2026-08-09.

---

## 0. How to use this document

You are continuing work on an existing project. Before doing anything:

1. Read `CLAUDE.md` in the project files. It is the source of truth for conventions and it
   overrides anything in this document that contradicts it, except for Section 3 below, which
   records decisions made after CLAUDE.md was last updated.
2. Do not rewrite files wholesale. Use targeted patches with verified anchors.
3. The owner, Kai Xin, is a non-programmer. Explain in plain language. Do not assume familiarity
   with game engines, tilesets, coordinate systems, or asset pipelines. She has explicitly asked
   for step by step help on tilesets because it is outside her area of knowledge.

---

## 1. Context in one paragraph

词山学海 Vocab Summit is a gamified Chinese vocabulary self-directed learning platform for
Bukit View Secondary School (百德中学), Singapore. Four streams, one shared engine: G1 基础华文,
G2 华文, G3 华文, G3 高级华文. Roughly 3,741 vocabulary entries. Flat-file static site on GitHub
Pages, vanilla JS, no build step. Owner is 郑凯欣 (Kai Xin), HOD/MTL, building it independently
with AI assistance. Pedagogical intent leads; features are justified by learning design (SDT,
AfL, spacing and retrieval practice) before they are built.

---

## 2. Hard constraints (do not violate)

- **Flat files only.** Every file sits at repo root. No subfolders. This is because the owner
  updates the repo via the GitHub web upload interface, which cannot create folders. This
  constraint drives several tileset decisions in Section 5.
- **No build step, no npm, no frameworks.** Vanilla JS in an IIFE. Any library must be a single
  file committed to the repo or a single CDN script tag.
- **Landscape is the primary design target.** School PLDs are iPads with keyboards and
  Chromebooks. Portrait is a functional fallback only. Never lock orientation.
- **Chinese-only TTS.** No English is ever read aloud.
- **All published sentences are owner-authored.** 课文例句 are removed. Do not reintroduce them.
- **No em dashes in prose or documentation.** Use colons and commas.
- **Curly double quotes** in any code-embedded dialogue text, never 「」 and never straight quotes.
  (Exception: 「」 is correct inside cloze passage prose dialogue.)

---

## 3. Decisions made after CLAUDE.md was last written

These are new and CLAUDE.md does not yet reflect them. Adding them to CLAUDE.md is an
outstanding task (see Section 6).

- **Sailing is an optional visit, not a gate. DECIDED 2026-08-09.** 词山群岛 (`world.html`)
  remains an explorable scene students can choose to enter. It must never sit between a student
  and their daily vocabulary practice. The landing page continues to offer direct entry to each
  of the four streams. Rationale: a sailing sequence is charming on first use and pure friction
  on the fortieth, and the learning value lives in the practice modes.
- **Terrain art is assembled from CC0 tilesets, not AI-generated. DECIDED 2026-08-09.** See
  Section 4 for why. AI-generated character sprites remain acceptable and the existing ones are
  usable. AI-generated *terrain and tilesets* are not.
- **Pixel editor: Pixelorama**, not Aseprite. Free, MIT-licensed, actively developed, runs on
  macOS and also in the browser. LibreSprite is a viable second choice but development is slow.
  Piskel is fine for quick single-sprite touch-ups with zero install.
- **Map editor: Tiled** (mapeditor.org). Free and open source. The owner will do map layout
  herself in Tiled; Claude writes the renderer that consumes the exported JSON.
- **Landing page now has a single entry point.** A prominent 16-bit style enter button gates the
  page. First-time students get the nickname picker, then the four stream cards reveal. Returning
  students skip to the cards with their nickname shown on a plaque.
- **New file `nickname.js`** exists at repo root. It is a standalone copy of the nickname picker
  UI and the DESC_CATS / NOUN_CATS word pools, used by `index.html` only. It duplicates that data
  from `app.js` deliberately, because `app.js` boots straight into fetching a stream's word JSON
  and cannot run on the landing page. **If the nickname word pools are ever edited, the identical
  edit must be made in both `app.js` and `nickname.js`.**
- **`老少咸宜` removed** from the nickname adjective pool (it describes a situation, not a person).

---

## 4. Why terrain art is not AI-generated (read before offering to generate any)

The repo contains `tileset_raw.png`, produced by ChatGPT in an earlier session. It is not a
tileset. It is eleven separate illustrations of tile subjects on a magenta field. It has no grid,
no consistent scale (the pagoda is roughly eight times the height of the cloud), and no edge or
corner transition pieces. Nothing in it tiles seamlessly. It cannot drive a map renderer.

The distinction that matters: **a sprite is a picture, a tileset is a system.** A usable tileset
needs grass-to-sand and sand-to-water transitions, inner and outer corners, cliff edges and
cliff tops, all pixel-exact on a fixed grid so that any two adjacent tiles meet without a seam.
Image generators produce pictures. They do not reliably produce systems, and no amount of prompt
engineering closes that gap.

By contrast the character sheets (`sprite_g1_raw.png` and siblings) are genuinely usable: a
consistent character across six frames. They still need frame alignment cleanup, which can be
scripted in Python with Pillow rather than done by hand.

**Therefore:** source terrain from CC0 asset packs. Kenney.nl is the safe default because
everything there is CC0 with no attribution required. itch.io has excellent free packs but
licences vary per pack, so the licence must be checked individually and recorded.

---

## 5. Task A: tileset and the four open-world maps, step by step

The owner needs this explained from first principles. Suggested sequence:

### 5.1 Concepts to explain first (briefly, in plain language)

- A **tile** is a fixed-size square image, for example 32 by 32 pixels.
- A **tileset** is one PNG containing many tiles arranged on a strict grid.
- A **tilemap** is a grid of numbers saying which tile goes in which cell. It is data, not a picture.
- **Layers** stack: a ground layer, a decoration layer above it, an invisible collision layer
  marking where the player cannot walk, and an object layer marking entrances and waypoints.
- This is why maps are cheap to change: editing a map means editing numbers, not repainting art.

### 5.2 Recommended settings (decide these before any map is drawn)

- **Tile size: 32 by 32 pixels.** Readable on an iPad without scaling, and roughly a quarter the
  placement work of 16 by 16.
- **Map size: start at 40 by 30 tiles** (1280 by 960 pixels of world). Big enough to feel
  explorable, small enough to finish. Expand later if it works.
- **One shared tileset across all four maps.** The four streams are standalone mountains that
  must not imply ranking, but they differ by *layout and route*, not by art style. One tileset,
  four different map files. This cuts the art problem to a quarter.
- **Four altitude zones per map**, matching the existing 我的词山 model: 山脚绿野, 云海栈道,
  雪线冰崖, 天阶峰顶. So the chosen tileset must contain, at minimum: grass and dirt, stone path
  and wooden plank, snow and ice, and summit stonework, each with edge transitions.

### 5.3 Owner's steps (she does these)

1. Install **Tiled** from mapeditor.org. Free.
2. Download a CC0 pack from **kenney.nl** with the terrain types listed above.
3. In Tiled: New Map, Orthogonal, tile size 32 by 32, map size 40 by 30.
4. Import the tileset PNG. **Choose "Embed tileset in map"** so the export is one self-contained
   file rather than a map file plus a separate `.tsx` file.
5. Create four layers named exactly: `ground`, `decor`, `collision`, `objects`.
6. Paint `ground`, then `decor`. Mark impassable cells on `collision`. Place entrance and
   waypoint markers on `objects`.
7. File, Export As, JSON map file. Name it `map_g1.json` (then `map_g2`, `map_g3`, `map_hcl`).
8. Send the JSON plus the tileset PNG to Claude.

### 5.4 The flat-file gotcha (important, warn her about it early)

Tiled writes the tileset image path into the exported JSON **relative to wherever the map file
was saved.** If she saves her Tiled project in a folder like `Documents/maps/` and the tileset
PNG sits in `Documents/art/`, the JSON will contain something like `../art/tileset.png`, which
will break on GitHub Pages where everything is at root.

**Prevention:** she should keep the tileset PNG and the Tiled map file in the *same folder*
while authoring. Then the exported path is a bare filename and works unchanged at repo root.
Whoever picks this up should verify the `image` field in the exported JSON before wiring it up,
and patch it to a bare filename if needed.

### 5.5 Claude's steps (after receiving the JSON)

- Write a canvas renderer at repo root that loads the map JSON and tileset PNG, draws the layers
  in order, and camera-follows the player sprite.
- Reuse the existing sprite sheets. They need a frame-alignment pass first: the six frames are
  not on a uniform grid and the feet baseline drifts between frames. Script this with Pillow.
- Wire `objects` layer entrance markers to the existing per-stream study modes.
- Respect the landscape-first breakpoint rule and the fixed-viewport camera-follow pattern
  already used by 攀山竞速 in `app.js`.

---

## 6. Task B: outstanding matters

**Verification needed (do this first, it is cheap):**

- The landing page changes and the `world.html` fix from 2026-08-09 have not been visually
  confirmed on a live device. Ask the owner to check GitHub Pages before building on top.

**`world.html` was blank and is now fixed.** The cause was a filename mismatch: the file loaded
`three.min.js` while the repo contains `three_min.js`, so THREE was undefined and the script died
immediately. Worth knowing because the same class of typo will silently blank any canvas scene.

**CLAUDE.md needs updating.** It is otherwise excellent but is now out of date in these places:

- Section 3 of this document is not reflected in it at all.
- The file structure list does not mention `nickname.js`.
- It describes `world.html` as the "我的词山 mountain-world scene". It is actually the 词山群岛
  sailing scene. 我的词山 is rendered from `app.js`.
- "Current phase and hard boundaries" says NO Firebase and NO login, but Firebase anonymous auth
  plus Firestore (asia-southeast1) has since been set up. Confirm with the owner which is
  currently true before relying on either statement.

**Nickname pool content review (owner decision, not a bug).** These entries are grammatical and
inoffensive but read oddly as a self-chosen identity, because they describe situations or objects
rather than people. All are in the 吉祥美好 category. Flagged, not removed:

- 花好月圆, 龙凤呈祥, 年年有余, 诸事大吉, 安然无恙, 辞旧迎新, 金碧辉煌 (blessing and occasion idioms)
- 惟妙惟肖, 栩栩如生 (describe a lifelike depiction, not a person)

Also flagged in the noun pool: **刘姥姥** (a comic out-of-her-depth figure, possibly not a
flattering self-identification) and **犼** (obscure; most secondary students cannot read it).

**Scope warning to keep raising.** Four open-world maps plus a sailing scene plus an immersive
shell is a game engine, not a feature, and the owner maintains it alone as a non-programmer. Each
addition should be weighed against whether it improves vocabulary learning or merely surrounds it.
Prefer the smallest version that delivers the feeling. This has been discussed and accepted by the
owner; keep it visible rather than quietly building everything requested.

---

## 7. Working preferences

- **Design before build.** Record decisions and get mockups approved before writing code. This is
  a standing pattern, not a one-off.
- **Design doc before code** for any significant feature.
- **Targeted patches, never wholesale rewrites.** Assert the old string exists before replacing it.
- **Validate before delivering:** `node --check` on JS, jsdom smoke tests for critical flows,
  and a local HTTP server for testing (fetch fails on `file://`).
- **Deliver multiple files as a single zip**, never as separate attachments.
- **Session continuity:** the output of each session is the base for the next. Never revert to an
  earlier version of a file.
- **Language:** Chinese for in-app content and pedagogical decisions, English for architecture and
  technical discussion.
- **Record new decisions in CLAUDE.md** as standing rules so they survive into future sessions.
