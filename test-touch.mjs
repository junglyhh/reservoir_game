import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nearestEdgeAt, isTap, installBoardTouch } from './docs/touch.js';

const levels = JSON.parse(readFileSync(new URL('./docs/levels.json', import.meta.url), 'utf8'));
let checks = 0;

function test(name, run) {
  run();
  checks++;
  console.log('PASS ' + name);
}

test('every level exposes its edges and excludes reservoirs at phone widths', () => {
  for (const level of levels) {
    for (const width of [296, 362, 400]) {
      const height = 340;
      const size = width < 360 && level.nodes.length >= 5 ? 44 : 56;
      const positions = level.nodes.map(node => ({
        x: Math.max(size / 2 + 11, Math.min(width - size / 2 - 11, node.x * width / 100)),
        y: Math.max(size / 2 + 20, Math.min(height - 80, node.y * (height - 65) / 100 + 15))
      }));
      for (const position of positions) {
        assert.equal(nearestEdgeAt(position, level.edges, positions, size / 2), null, 'A vessel tap must not activate an edge');
      }
      for (const [edgeIndex, [a, b]] of level.edges.entries()) {
        const midpoint = { x: (positions[a].x + positions[b].x) / 2, y: (positions[a].y + positions[b].y) / 2 };
        assert.equal(nearestEdgeAt(midpoint, level.edges, positions, size / 2), edgeIndex, 'Level ' + level.id + ', edge ' + edgeIndex + ', width ' + width);
      }
    }
  }
});

test('a wide touch band works while distant and ambiguous taps are rejected', () => {
  const positions = [{ x: 30, y: 70 }, { x: 270, y: 70 }];
  assert.equal(nearestEdgeAt({ x: 100, y: 93 }, [[0, 1]], positions, 22, 24), 0);
  assert.equal(nearestEdgeAt({ x: 100, y: 95 }, [[0, 1]], positions, 22, 24), null);
  const parallel = [{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 0, y: 14 }, { x: 160, y: 14 }];
  assert.equal(nearestEdgeAt({ x: 80, y: 7 }, [[0, 1], [2, 3]], parallel, 10), null);
  assert.equal(nearestEdgeAt({ x: 80, y: 1 }, [[0, 1], [2, 3]], parallel, 10), 0);
  assert.equal(nearestEdgeAt({ x: 80, y: 13 }, [[0, 1], [2, 3]], parallel, 10), 1);
});

test('small movement is a tap; dragging and long presses are not', () => {
  assert.equal(isTap({ x: 1, y: 1, time: 10 }, { x: 4, y: 5, time: 100 }), true);
  assert.equal(isTap({ x: 1, y: 1, time: 10 }, { x: 30, y: 5, time: 100 }), false);
  assert.equal(isTap({ x: 1, y: 1, time: 10 }, { x: 1, y: 1, time: 800 }), false);
});

// A small event harness exercises the actual installer without a browser or
// external DOM dependency. Native button callbacks remain outside the module.
function emitter() {
  const handlers = new Map();
  return {
    addEventListener(name, handler) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(handler);
    },
    removeEventListener(name, handler) { handlers.get(name)?.delete(handler); },
    emit(name, event) {
      for (const handler of handlers.get(name) || []) {
        handler(event);
        if (event.stopped) break;
      }
    }
  };
}

function fixture() {
  const edgeTarget = { closest: () => null };
  const nativeButton = { closest: () => nativeButton };
  const outsideTarget = { closest: () => null };
  const doc = emitter();
  doc.defaultView = emitter();
  const board = Object.assign(emitter(), {
    ownerDocument: doc,
    contains: target => target === edgeTarget || target === nativeButton,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 })
  });
  const moves = [];
  let available = true;
  const cleanup = installBoardTouch({
    board,
    getEdges: () => [[0, 1]],
    getPositions: () => [{ x: 30, y: 100 }, { x: 270, y: 100 }],
    getNodeRadius: () => 22,
    onEdgeTap: index => moves.push(index),
    canInteract: () => available
  });
  let time = 0;
  const event = (pointerId, x, y, extra = {}) => ({
    pointerId, clientX: x, clientY: y, timeStamp: time += 50,
    isPrimary: pointerId === 1, pointerType: 'touch', button: 0,
    target: edgeTarget, cancelable: true,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
    ...extra
  });
  return { doc, board, moves, event, cleanup, nativeButton, outsideTarget, setAvailable: value => { available = value; } };
}

test('one edge tap produces exactly one action and consumes its compatibility click', () => {
  const f = fixture();
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointerup', f.event(1, 123, 102));
  assert.deepEqual(f.moves, [0]);
  const click = f.event(1, 123, 102, { detail: 1 });
  f.board.emit('click', click);
  assert.ok(click.prevented && click.stopped);
  assert.deepEqual(f.moves, [0]);
  f.cleanup();
});

test('a drag remains cancelled even when the finger returns to its start', () => {
  const f = fixture();
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointermove', f.event(1, 150, 110));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  assert.deepEqual(f.moves, []);
  f.cleanup();
});

test('scrolling, multiple fingers, and pointer cancellation never spend a move', () => {
  const f = fixture();
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('scroll', {});
  f.doc.emit('pointerup', f.event(1, 120, 100));
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointerdown', f.event(2, 160, 100));
  f.doc.emit('pointerup', f.event(2, 160, 100));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointercancel', f.event(1, 120, 100));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  assert.deepEqual(f.moves, []);
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  assert.deepEqual(f.moves, [0], 'A fresh tap must work after cancellation');
  f.cleanup();
});

test('native buttons and keyboard clicks retain their normal activation path', () => {
  const f = fixture();
  f.doc.emit('pointerdown', f.event(1, 150, 100, { target: f.nativeButton }));
  f.doc.emit('pointerup', f.event(1, 150, 100, { target: f.nativeButton }));
  assert.deepEqual(f.moves, [], 'Pointer handling must not duplicate the native button callback');
  const click = f.event(1, 150, 100, { target: f.nativeButton, detail: 1 });
  f.board.emit('click', click);
  assert.ok(!click.prevented && !click.stopped, 'Native button click must pass through');
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  const keyboardClick = f.event(1, 120, 100, { target: f.nativeButton, detail: 0 });
  f.board.emit('click', keyboardClick);
  assert.ok(!keyboardClick.prevented && !keyboardClick.stopped, 'Keyboard activation must not be suppressed after a touch');
  f.cleanup();
});

test('unavailable play, outside taps, and disposal prevent activation', () => {
  const f = fixture();
  f.setAvailable(false);
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  f.setAvailable(true);
  f.doc.emit('pointerdown', f.event(1, 120, 100, { target: f.outsideTarget }));
  f.doc.emit('pointerup', f.event(1, 120, 100, { target: f.outsideTarget }));
  assert.deepEqual(f.moves, []);
  f.cleanup();
  f.doc.emit('pointerdown', f.event(1, 120, 100));
  f.doc.emit('pointerup', f.event(1, 120, 100));
  assert.deepEqual(f.moves, []);
});

console.log('PASS ' + checks + ' touch-input and mobile-geometry checks.');
