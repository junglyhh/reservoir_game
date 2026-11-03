# A share of light / 流光花园

## 30-level campaign

**[Play A share of light / 流光花园](https://junglyhh.github.io/reservoir_game/)**

This campaign expands the game to **30 gardens**, with sequential unlocking, golden-bloom challenges, and bilingual milestone celebrations. The final four Master levels must be cleared in the verified minimum number of moves. GitHub Pages is configured to serve the `docs/` directory from the `main` branch. The project also builds a self-contained version for offline play and local testing.

A quiet graph puzzle about sharing luminous water: every move replaces the amounts at the two ends of a selected edge with their average. The **Morning Garden / 晨光花园** theme uses warm ivory backgrounds, sage-green glass and controls, mint water, apricot target petals, amber awards, and dark text.

The **中 / EN** switch on the right of the first header line selects English or Simplified Chinese. Both languages cover all 30 levels, conceptual hints, instructions, unlock messages, milestone celebrations, dialogs, and accessibility labels. Switching language keeps the current puzzle and move history.

**流光花园三十关版**：在原有十关的基础上，新增十关中等、七关困难和三关大师关卡，并按难度重新排序。每关最多三朵目标花。通关即可解锁下一关，尚未解锁的关卡不可选择。最后四关大师关卡的步数上限等于最少所需步数，通关也就获得金色花朵。提示只提供思路，不展示完整操作步骤。项目同时支持 GitHub Pages 网页部署和本地离线游玩。

## Play offline or run locally

Open the downloaded **`a_share_of_light.html`** in an actual web browser. It contains the complete 30-level game and needs no installation, internet connection, or local server. Some phone file-viewer apps show HTML as a static preview; use a browser that can execute the file's JavaScript.

To generate the standalone game from this project, run:

```sh
npm run build:local
```

Then open **`local-test/index.html`** in a browser. No `npm install` is required. See `LOCAL-TESTING.txt` for a short testing guide in both languages.

### Test the replacement for level 27

Level 27 is **The horned garden / 双角花庭**, a Master puzzle on the bull graph: a triangle with a leaf attached to each of two different triangle vertices. It has two blooms, **A ≥ 24%** and **B ≥ 19%**, and a **15-move limit**, equal to the verified minimum. Both targets must be met together. All five edges are needed to solve it within that limit.

```sh
npm run build:preview
```

Open **`local-test/level-27-bull-preview.html`**. This self-contained preview opens directly at the replacement puzzle and has its own saves and language preference. It retains the Morning Garden theme, English/Chinese switch, edge tapping, undo, restart, and conceptual hints. Campaign navigation and milestone announcements are omitted from this single-level test. The normal 30-level build keeps sequential unlocking.

第 27 关已替换为牛图上的大师关卡 **双角花庭**：一个三角形的两个不同顶点各接一片叶子。目标为 **A ≥ 24%、B ≥ 19%**，须同时达标；步数上限和已验证最少步数均为 **15 步**。运行上述命令后，打开 `local-test/level-27-bull-preview.html` 即可直接试玩。试玩版使用独立存档，保留中英文切换、点击连线、撤销、重来和思路提示。

The editable files in **`docs/`** use ES modules and load their level data separately. To test those source files, serve them over HTTP:

```sh
python3 -m http.server 8080 --directory docs
```

Then open **http://localhost:8080**. `npm run dev` runs the same command. Serving locally does not publish the game to GitHub.

## How to play

- Tap a pipe or its central control to share the light equally between its ends.
- Every marked percentage is a **minimum**: **current percentage ≥ target percentage**. Extra light is allowed; exact equality is unnecessary. All blooms must meet their minimums together within the move limit.
- Total light remains 100%, and the source changes whenever it shares.
- Undo restores both the previous amounts and the move. Restart begins the current garden again.
- Tapping a connection whose endpoints are already equal uses no move.
- Each level has two conceptual hints. The game does **not** show a full solution or a sequence of required moves.
- Clear the current level within its move limit to unlock the next. Any unlocked level can be replayed.
- Earn a golden bloom by finishing in the displayed minimum number of moves. All 30 golden-bloom targets have exact optimality certificates. Levels 2–26 allow extra moves for an ordinary clear, so gold is optional there. The one-move introductory level and the final four Master levels have move limits equal to their minimums; every successful clear of those levels also earns a golden bloom.

Keyboard: **Tab** to a pipe control, **Enter/Space** to share, **Z** to undo, and **R** to restart.

中文规则：每个目标百分比都是**下限**，达到或超过即可，不必恰好相等。所有目标必须在步数限制内同时达标。在步数上限内通关即可前进。第 2–26 关允许使用多于最少步数的方式通关，金色花朵是可选挑战；第一关及第 27–30 关大师关卡的步数上限等于最少所需步数，通关即获得金色花朵。全部三十关的最少步数均已严格验证。

### Recognizing target blooms

Every target has a visible **six-petal frame**, including when it is empty. Ordinary junctions keep their circular vessels. Apricot petals with a terracotta outline identify a target that still needs light; sage-green petals and a **✓** beside the minimum show that it is currently satisfied. Sharing light can make the target fall below its minimum again, immediately restoring the apricot frame and removing the check. The flower shape and minimum badge remain visible in either state.

Gold remains the award for an optimal level clear. A green target indicates its current amount only. Petal frames scale with the vessels, leave edge interactions available, and use brief state transitions that respect reduced-motion preferences.

每个目标水池都有清晰的**六瓣花框**，尚未获得光量时也能辨认；普通中转点仍为圆形水池。杏色花瓣和陶土色描边表示目标尚未达标，鼠尾草绿色花瓣及下限旁的 **✓** 表示当前已达标。再次分享光量后若低于下限，会立即恢复杏色并移除对勾。花形轮廓和下限标签始终保留。金色仍用于奖励以最少步数通关，绿色只表示当前目标达标。

## Campaign and difficulty

The 20 additions comprise exactly **10 Medium, 7 Hard, and 3 Master** levels. Together with the original ten, the campaign has:

| Campaign positions | Difficulty | Total levels |
|---|---|---:|
| 1–3 | Easy / 简单 | 3 |
| 4–16 | Medium / 中等 | 13 |
| 17–26 | Hard / 困难 | 10 |
| 27–30 | Master / 大师 | 4 |

Levels are ordered by difficulty and then by their verified minimum move count. Every level has **at most three blooms**. The gardens include paths, forks, stars, diamonds, several cycle shapes, bridges between triangular regions, a ladder, bowtie loops, the bull graph, and additional chords. Their different reserves and thresholds create different sharing decisions.

The table lists move counts, not solution sequences. The displayed campaign number is separate from the stable internal ID used to preserve saved records.

| # | Garden / 花园 | Difficulty | Blooms | Move limit | Gold: minimum moves |
|---:|---|---|---:|---:|---:|
| 1 | First light / 曙光初现 | Easy | 1 | 1 | 1 |
| 2 | A small journey / 一段小旅程 | Easy | 1 | 4 | 2 |
| 3 | A second breath / 再续微光 | Easy | 1 | 6 | 4 |
| 4 | Two ways home / 双径归光 | Medium | 1 | 7 | 4 |
| 5 | A quiet detour / 静谧岔道 | Medium | 1 | 7 | 4 |
| 6 | Corner to corner / 转角花语 | Medium | 2 | 7 | 4 |
| 7 | Open hands / 舒展枝叶 | Medium | 3 | 7 | 4 |
| 8 | Two blooms / 双花齐放 | Medium | 2 | 7 | 5 |
| 9 | Three little lanterns / 三盏微灯 | Medium | 3 | 9 | 6 |
| 10 | The garden bridge / 花园小桥 | Medium | 2 | 9 | 6 |
| 11 | Petal wings / 蝶翼花庭 | Medium | 3 | 9 | 6 |
| 12 | Five quiet corners / 五角静庭 | Medium | 2 | 9 | 6 |
| 13 | The far shore / 彼岸微光 | Medium | 2 | 9 | 7 |
| 14 | A change of course / 另辟小径 | Medium | 2 | 10 | 7 |
| 15 | Beyond the diamond / 菱光彼岸 | Medium | 2 | 10 | 7 |
| 16 | The winding stream / 曲水流光 | Medium | 2 | 11 | 8 |
| 17 | The little ladder / 拾光阶梯 | Hard | 2 | 13 | 9 |
| 18 | Keep the hearth bright / 守住暖光 | Hard | 3 | 13 | 9 |
| 19 | A ring of promises / 环上心愿 | Hard | 3 | 14 | 10 |
| 20 | Across the water / 渡水传光 | Hard | 2 | 13 | 11 |
| 21 | The hidden chord / 弦间微光 | Hard | 3 | 15 | 11 |
| 22 | Braided currents / 交织溪流 | Hard | 2 | 15 | 11 |
| 23 | Three wishes / 三个心愿 | Hard | 3 | 15 | 12 |
| 24 | Two distant shores / 双岸遥光 | Hard | 2 | 16 | 12 |
| 25 | The twin fountains / 双泉花语 | Hard | 3 | 17 | 13 |
| 26 | Moonlit circle / 月下圆环 | Hard | 3 | 17 | 15 |
| 27 | The horned garden / 双角花庭 | Master | 2 | 15 | 15 |
| 28 | The last few drops / 最后几滴 | Master | 2 | 16 | 16 |
| 29 | Perfect harmony / 和谐共鸣 | Master | 3 | 18 | 18 |
| 30 | The long dawn / 长夜初晓 | Master | 1 | 19 | 19 |

## Milestones and the final challenge

Milestone celebrations appear in the selected language. They are remembered after acknowledgement, so ordinary replays do not repeat the same celebration. The first two milestones require the first 10 or 20 gardens in campaign order to be cleared.

| Milestone | English message | 中文提示 |
|---|---|---|
| First 10 cleared | **You’re amazing!** You’ve cleared your first 10 levels. A new challenge awaits—keep the light flowing! | **你太棒了！** 你已闯过前十关。新的挑战就在前方，继续传递光芒吧！ |
| First 20 cleared | **Two-thirds of the way there!** You’ve cleared 20 levels. Now it’s time to put your skills to the test. | **你已完成三分之二！** 你已通过二十关。现在，是时候真正考验你的本领了。 |
| All 30 cleared, some gold still missing | **Your final challenge** Earn a golden bloom for every level. Revisit the gardens and see how few moves you can use. | **最后的挑战** 为每一关赢得一朵金色花朵。重游花园，看看能把步数精简到多少。 |
| A golden bloom in every level | **Every garden shines gold!** Congratulations! You’ve mastered all 30 levels. Ready for the ultimate challenge: the mathematics behind the garden? | **满园流光，尽染金色！** 恭喜你！三十关全部获得金色花朵。准备好迎接终极挑战，探索花园背后的数学了吗？ |

The all-gold celebration introduces **the tea-sharing problem**. Imagine one cup at each vertex of a connected graph, with one unit of tea at a root and all other cups empty. Each move averages two cups connected by an edge. The player is invited to prove the distance bound below, and to investigate when it is attained exactly or only approached. A link to the original research is available from that celebration.

If the campaign is completed with gold in every level on the first pass, the game proceeds directly to the all-gold challenge instead of asking for gold that has already been earned.

## Saved progress and the reordered levels

Progress, best move counts, language choice, and milestone acknowledgements are stored in the browser when local storage is available. They do not automatically sync between devices, browser profiles, the hosted website, and downloaded files.

The original ten puzzles retain their stable IDs, even though their displayed campaign positions have changed. The save migration matches existing records to those IDs instead of treating an old level number as a new campaign position. The old level 9, for example, is now campaign level 26; its best result remains attached to the same puzzle.

Earlier saves may contain completed gardens beyond an uncleared gap. Those records are retained, but the new sequential unlocking rule still requires the intervening gardens to be cleared. A valid in-progress puzzle resumes only if it is unlocked in the new order; otherwise the game opens the next available garden. Existing records become useful as soon as their preceding levels are cleared.

The stricter Master limits also apply to saved results. A clear exceeding the current move limit does not count as completed. The final four limits are 15, 16, 18, and 19 moves, respectively.

The replacement at campaign position 27 has a fresh stable ID, **31**. The retired puzzle's ID28 completion or golden bloom does not count for this different puzzle. All other valid records are retained. Clear the new level 27 to reopen later gardens; their existing records are preserved. The isolated preview uses separate storage and cannot change campaign saves.

大师关步数上限也适用于旧存档；超过当前上限的成绩不计为通关。最后四关的上限依次为 15、16、18、19 步。替换后的第 27 关使用新的稳定编号 31，原第 27 关（编号 28）的通关或金色花朵不会算作新关卡的成绩。其他有效成绩均保留；通过新的第 27 关后，后续关卡会重新开放。单关试玩使用独立存档，不会改动完整游戏的进度。

Private browsing or a file-viewer app may not retain progress. Reopening a standalone file from a different location can also give it a different storage context, depending on the browser.

## Designed for phones

- Compact live goals and a move counter above the board.
- Approximately 48 CSS pixels of touch tolerance across each pipe, with nearest-edge selection.
- Native 48-pixel pipe buttons and toolbar controls of at least 44 pixels.
- Dragging, scrolling, long holds, multi-touch, and cancelled gestures do not average an edge.
- Normal page scrolling and pinch zoom remain available.
- Viewport-aware board height, safe-area spacing, and a separate short-landscape layout.
- Reduced decorative effects on small screens, optional sound, and reduced-motion support.
- A scrollable 30-level journey and clear disabled states for locked gardens.

## Developer checks and certificates

With a modern Node.js installation, run:

```sh
npm test
```

No dependency installation is required. The tests cover all 30 winning certificates, mass conservation, simultaneous minimum targets, immutable move history, touch gestures, **300 responsive board configurations and 600 bilingual label layouts**, English/Chinese coverage, save migration, locked-level guards, and milestone behavior. Geometry checks include petal bounds, label clearance and attachment, and tappable edge midpoints. Crowded boards receive extra height rather than reducing label readability. The geometry checks complement visual testing on real phones.

All 30 minimum move counts are certified. The two original final puzzles now have complete exact proofs as well: stable ID 9 needs 15 moves, and stable ID 10 needs 18. Their shorter horizons were exhaustively excluded using integer arithmetic; the successful witnesses were also replayed exactly.

The replacement bull-graph puzzle at position 27 is certified at 15 moves. Its evidence also excludes a solution within that budget when any triangle edge is omitted; the two leaf edges are required to connect the source and the far bloom. Its proof material is kept in `validation/proofs/bull-level27.json`.

An independent breadth-first search, with exact arithmetic and no heuristic pruning, exhaustively checks all 568,317 distinct states reachable within 14 moves and first finds a win at move 15. Reproduction instructions are in `validation/proofs/README.md`.

Run `npm run test:preview` to rebuild and check the isolated HTML. It exercises the bundled boot and move flow, both languages, independent save keys, undo, a winning replay, restart, and suppression of campaign milestones. Presentation and sound are stubbed in this JavaScript check; it does not substitute for playing the HTML in a browser.

Developer-only move certificates and search evidence are kept **outside `docs/`**, under `validation/`. The shipped `docs/levels.json` contains no solution sequences, and the standalone builder embeds only player-facing level data. Proof files are development material and are not loaded by the game.

Key files:

- `docs/index.html` — game interface, help, and milestone dialogs
- `docs/styles.css`, `docs/mobile.css`, `docs/i18n.css` — layout and bilingual typography
- `docs/morning-garden.css` — the ivory, sage, mint, and amber palette
- `docs/petal-frames.css` — persistent target flower frames, minimum badges, and reversible reached-state colors
- `docs/app.js` — game state, conceptual hints, sound, and rendering
- `docs/progression.js` — sequential unlocks, stable-ID save migration, and milestone state
- `docs/engine.js`, `docs/layout.js`, `docs/touch.js` — averaging, graph layout, and touch recognition
- `docs/levels.json` — 30 sorted puzzles, with no solution paths
- `docs/i18n.js`, `docs/i18n-static.js`, `docs/i18n-levels.js` — English/Chinese interface and level text
- `build-local.mjs` — creates the self-contained offline game
- `tools/build-level-preview.mjs` — creates the isolated, bilingual level-27 playtest
- `test-level-preview.mjs` — checks the preview's bundled boot, moves, language, and isolated saves
- `test-game.mjs`, `test-touch.mjs`, `test-layout.mjs`, `test-i18n.mjs`, `test-progression.mjs` — automated checks
- `validation/level-solutions.json` — developer certificates keyed by stable level ID
- `validation/campaign-catalog.json` — campaign order, names, graph sizes, and difficulty metadata
- `validation/proofs/README.md` — reproducible exact proofs for the original final puzzles
- `tools/solve-levels.cpp`, `tools/certify-final-levels.cpp` — exact validation solvers
- `tools/certify-bull-level.cpp`, `validation/proofs/bull-level27.json` — independent exhaustive proof for the replacement level 27
- `tools/expand-campaign.py`, `tools/assemble-campaign.py` — campaign definitions and assembly

## Mathematical foundation

Starting with one unit at a root, repeated pairwise averaging cannot raise a vertex at distance `d` above `1 / (d + 1)`. With finitely many pairwise moves, this bound may be a supremum rather than an attained maximum. The game therefore uses reachable minimum thresholds. Individual upper bounds also do not by themselves guarantee that several target thresholds can be met simultaneously.

Reference: [Sharing tea on a graph](https://arxiv.org/abs/2405.15353).

## GitHub Pages deployment

The source repository is [junglyhh/reservoir_game](https://github.com/junglyhh/reservoir_game). GitHub Pages is configured to publish **`/docs` from `main`** at [A share of light / 流光花园](https://junglyhh.github.io/reservoir_game/). The deployable directory contains the game interface, JavaScript modules, styles, artwork, and player-facing level data. No package installation or application build is required for Pages to serve these files.

Run `npm test` before updating the publishing branch, then check the Pages deployment result. `npm run build:local` separately generates `local-test/index.html` for offline play; that generated directory is ignored by Git.

GitHub Pages 使用 `main` 分支中的 `docs/` 目录部署网页游戏。更新发布分支前请运行 `npm test`，之后检查 Pages 部署结果。需要离线版本时，可运行 `npm run build:local`，再用浏览器打开 `local-test/index.html`。
