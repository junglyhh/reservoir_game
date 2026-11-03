# Liquid Light · Reservoir Game

A quiet graph puzzle about sharing luminous water. Ten gardens progress from a single connection to several competing blooms. Every move replaces the amounts at the two ends of an edge with their average.

## Play on GitHub Pages

The complete static game is in **`docs/`**. No build or dependency installation is needed.

To enable hosting for this repository:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **`main`** and **`/docs`**, then **Save**.

After GitHub finishes its deployment, the expected address is:

**https://junglyhh.github.io/reservoir_game/**

This address becomes playable after Pages is enabled; pushing the source alone does not enable the repository's Pages setting. Subsequent changes to `main/docs` are published by GitHub Pages automatically.

## How to play

- Tap anywhere along a pipe, or use its small central control. The connected vessels share their light equally.
- Bring every marked bloom to its required amount **at the same time**, within the move limit.
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

## Run locally

Serve `docs/` over HTTP; ES modules and level-data loading need a web server rather than a `file://` URL.

```sh
python3 -m http.server 8080 --directory docs
```

Then open **http://localhost:8080**. `npm run dev` runs the same command.

## Check the game

With a modern Node.js installation:

```sh
npm test
```

No `npm install` is required. The tests verify all ten winning sequences, mass conservation and distance ceilings, immutable move history, gesture handling, and 70 responsive board configurations. Geometry checks are automated; they are not a substitute for visual testing on physical phones.

## Structure

- `docs/index.html` — game interface and accessible dialogs
- `docs/styles.css`, `docs/mobile.css` — visual design and phone layouts
- `docs/app.js` — game state, hints, sound, and saved progress
- `docs/engine.js` — averaging and goal validation
- `docs/layout.js` — responsive graph geometry
- `docs/touch.js` — broad edge hit areas and gesture recognition
- `docs/levels.json` — all ten levels and solution certificates
- `test-game.mjs`, `test-touch.mjs`, `test-layout.mjs` — automated checks
- `level-validation.json` — level search and replay results

## Mathematical foundation

Starting with one unit at a root, repeated pairwise averaging cannot raise a vertex at distance `d` above `1 / (d + 1)`. With finite pairwise moves this bound may be a supremum, so the levels use reachable thresholds rather than requiring an unattainable limiting value.

Reference: [Sharing tea on a graph](https://arxiv.org/abs/2405.15353).
