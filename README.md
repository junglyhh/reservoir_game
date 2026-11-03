# A share of light / 流光花园

A quiet graph puzzle about sharing luminous water. Ten gardens progress from a single connection to several competing blooms. Every move replaces the amounts at the two ends of an edge with their average.

The default **Morning Garden / 晨光花园** theme uses warm ivory backgrounds, sage-green glass and controls, mint water, and amber blooms. Dark text keeps the interface readable across the board, dialogs, and phone layouts.

Use the **中 / EN** switch on the right of the first header line to choose English or Simplified Chinese. Switching language keeps the current level, amounts, undo history, hints, and move count. Both languages cover all ten levels, instructions, hints, results, dialogs, and accessibility labels.

Every marked target is a **minimum**: **current percentage ≥ target percentage**. Exceeding the target is allowed; exact equality is unnecessary. All goals must be satisfied together within the move limit. This rule appears beside the objectives and in the help dialog, and targets display **≥**.

**流光花园**是一款宁静的图论解谜游戏。点击连线，将两端水池的光量平均分配，在十座花园中逐步挑战更精妙的布局。首行右侧的 **中 / EN** 按钮可切换语言，并保留当前关卡、光量、撤销记录、提示和步数。每个目标都是**下限**：**当前百分比 ≥ 目标百分比**即可，不必恰好相等；所有目标必须在步数限制内同时达标。

默认采用**晨光花园**配色：暖象牙白背景、鼠尾草绿玻璃与按钮、薄荷色水面，以及琥珀色花朵。棋盘、弹窗和手机界面均使用清晰的深色文字。

## Play on GitHub Pages

The complete static game is in **`docs/`**. No build or dependency installation is needed.

To enable hosting for this repository:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **`main`** and **`/docs`**, then **Save**.

The GitHub Pages address is:

**https://junglyhh.github.io/reservoir_game/**

This address becomes playable after Pages is enabled; pushing the source alone does not enable the repository's Pages setting. Subsequent changes to `main/docs` are published by GitHub Pages automatically.

Source repository: **https://github.com/junglyhh/reservoir_game**.

## How to play

- Tap anywhere along a pipe, or use its small central control. The connected vessels share their light equally.
- Bring every marked bloom to **at least** its required percentage **at the same time**, within the move limit. Values above the target count; exact equality is not needed.
- The source loses light too. Total light always remains 100%.
- Undo restores both the state and the move. Restart is always available.
- Tapping a connection whose endpoints are already equal uses no move.
- Hints progress from a concept to a complete solution.
- Reach the efficiency target to earn a golden bloom. Levels 9–10 use verified efficiency targets, not claimed proofs of minimum length.

Keyboard: **Tab** to a pipe control, **Enter/Space** to share, **Z** to undo, **R** to restart.

## Designed for phones

- Compact live goals and move counter above the board.
- Approximately 48 CSS pixels of touch tolerance across each pipe, with nearest-edge selection.
- Native 48-pixel pipe buttons and toolbar controls of at least 44 pixels.
- Drag, scroll, long-hold, multi-touch, and cancelled gestures do not average an edge.
- Normal page scrolling and pinch zoom remain available.
- Viewport-aware board height, safe-area spacing, and a separate short-landscape layout.
- Reduced decorative effects on small screens, optional sound, and reduced-motion support.
- Progress and best results are stored locally in the browser. They do not sync between devices.

## Levels

| # | Garden | Difficulty | Move limit | Verified solution |
|---:|---|---|---:|---:|
| 1 | First light | Easy | 1 | 1 |
| 2 | A small journey | Easy | 3 | 2 |
| 3 | A second breath | Easy | 5 | 4 |
| 4 | Two blooms | Medium | 7 | 5 |
| 5 | The far shore | Medium | 9 | 7 |
| 6 | A change of course | Medium | 10 | 7 |
| 7 | Across the water | Hard | 13 | 11 |
| 8 | Three wishes | Hard | 15 | 12 |
| 9 | Moonlit circle | Hard | 17 | 15 |
| 10 | Perfect harmony | Master | 18 | 18 |

## Play offline or run locally

Open the downloaded **`a_share_of_light.html`** in a web browser. It contains the complete game and does not need an installation, internet connection, or local server.

To generate the same standalone game from a repository checkout, run:

```sh
npm run build:local
```

Then open **`local-test/index.html`** in a browser. No `npm install` is required. See `LOCAL-TESTING.txt` for testing instructions in both languages.

To test the editable files in `docs/`, serve them over HTTP; their ES modules and level-data loading need a web server rather than a `file://` URL:

```sh
python3 -m http.server 8080 --directory docs
```

Then open **http://localhost:8080**. `npm run dev` runs the same command.

## Check the game

With a modern Node.js installation:

```sh
npm test
```

No `npm install` is required. The tests verify all ten winning sequences, mass conservation and distance ceilings, immutable move history, gesture handling, 70 responsive board configurations, English/Chinese translation coverage, language preferences, and minimum-target behavior. Geometry checks are automated; they are not a substitute for visual testing on physical phones.

## Structure

- `docs/index.html` — game interface and accessible dialogs
- `docs/styles.css`, `docs/mobile.css`, `docs/i18n.css` — visual design, phone layouts, and bilingual typography
- `docs/morning-garden.css` — Morning Garden palette, glass treatment, and readable interaction states
- `docs/app.js` — game state, hints, sound, and saved progress
- `docs/engine.js` — averaging and goal validation
- `docs/layout.js` — responsive graph geometry
- `docs/touch.js` — broad edge hit areas and gesture recognition
- `docs/levels.json` — all ten levels and solution certificates
- `docs/i18n.js`, `docs/i18n-static.js`, `docs/i18n-levels.js` — language switching and complete English/Chinese interface and level text
- `build-local.mjs` — creates the self-contained offline HTML game
- `LOCAL-TESTING.txt` — English and Chinese testing instructions
- `test-game.mjs`, `test-touch.mjs`, `test-layout.mjs`, `test-i18n.mjs` — automated checks
- `level-validation.json` — level search and replay results

## Mathematical foundation

Starting with one unit at a root, repeated pairwise averaging cannot raise a vertex at distance `d` above `1 / (d + 1)`. With finite pairwise moves this bound may be a supremum, so the levels use reachable thresholds rather than requiring an unattainable limiting value.

Reference: [Sharing tea on a graph](https://arxiv.org/abs/2405.15353).
