/**
 * Select the closest visible pipe in CSS pixels. Reservoirs are deliberately
 * excluded: tapping a vessel must never spend a move on a nearby connection.
 * Returns the edge index, or null when the tap is outside or ambiguous.
 */
export function nearestEdgeAt(point, edges, positions, nodeRadius, tolerance = 24) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const radius = Math.max(0, Number(nodeRadius) || 0) + 3;
  if (positions.some(node => Math.hypot(point.x - node.x, point.y - node.y) <= radius)) return null;
  const candidates = [];
  edges.forEach(([from, to], index) => {
    const a = positions[from];
    const b = positions[to];
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length <= radius * 2) return;
    const end = radius / length;
    const fraction = Math.max(end, Math.min(1 - end, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (length * length)));
    const distance = Math.hypot(point.x - (a.x + fraction * dx), point.y - (a.y + fraction * dy));
    if (distance <= tolerance) candidates.push({ index, distance });
  });
  candidates.sort((a, b) => a.distance - b.distance);
  if (!candidates.length) return null;
  // Between two nearby pipes, a retry is preferable to selecting the wrong one.
  if (candidates.length > 1 && candidates[0].distance > 2 && candidates[1].distance - candidates[0].distance < 2) return null;
  return candidates[0].index;
}

/** A tap has little travel and ends within a comfortable press duration. */
export function isTap(start, end, maxTravel = 10, maxDuration = 700) {
  return Math.hypot(end.x - start.x, end.y - start.y) <= maxTravel && end.time - start.time >= 0 && end.time - start.time <= maxDuration;
}

/**
 * Install once on the stable board element. All getters are live, so changing
 * levels or rotating the phone needs no rebinding. Native pipe buttons keep
 * their ordinary click/keyboard handlers. Remove legacy SVG click handlers;
 * this module owns the wide edge touch area and prevents duplicate activation.
 */
export function installBoardTouch({ board, getEdges, getPositions, getNodeRadius, onEdgeTap, canInteract = () => true }) {
  const doc = board.ownerDocument;
  const view = doc.defaultView;
  const downPointers = new Set();
  let active = null;
  let suppressClick = null;

  const pointFor = event => {
    const rect = board.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const edgeFor = event => {
    const point = pointFor(event);
    const rect = board.getBoundingClientRect();
    if (point.x < 0 || point.y < 0 || point.x > rect.width || point.y > rect.height) return null;
    return nearestEdgeAt(point, getEdges(), getPositions(), getNodeRadius(), event.pointerType === 'mouse' ? 16 : 24);
  };
  const snapshot = event => ({ x: event.clientX, y: event.clientY, time: event.timeStamp });
  const suppressAt = event => { suppressClick = { x: event.clientX, y: event.clientY, until: Date.now() + 600 }; };

  function pointerDown(event) {
    // A new physical gesture must never inherit suppression from a prior tap.
    suppressClick = null;
    downPointers.add(event.pointerId);
    if (downPointers.size !== 1 || event.isPrimary === false) { active = null; return; }
    if (event.button !== 0 || !board.contains(event.target) || !canInteract()) return;
    // Keep semantic buttons native: this preserves keyboard, screen-reader,
    // and browser click behavior instead of emulating it with touch events.
    if (event.target.closest?.('button, a, input, select, textarea, [role="button"]')) return;
    const edge = edgeFor(event);
    if (edge === null) return;
    active = { pointerId: event.pointerId, edge, start: snapshot(event), cancelled: false };
  }

  function pointerMove(event) {
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.start.x, event.clientY - active.start.y) > 10) active.cancelled = true;
  }

  function pointerUp(event) {
    const gesture = active;
    downPointers.delete(event.pointerId);
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    active = null;
    if (gesture.cancelled || !isTap(gesture.start, snapshot(event)) || !canInteract()) return;
    if (edgeFor(event) !== gesture.edge) return;
    // Only a confirmed tap is consumed. Pointer-down and movement stay passive
    // so normal vertical scrolling and two-finger zoom are not intercepted.
    if (event.cancelable) event.preventDefault();
    suppressAt(event);
    onEdgeTap(gesture.edge);
  }

  function pointerCancel(event) {
    downPointers.delete(event.pointerId);
    if (active?.pointerId === event.pointerId) active = null;
  }

  function cancelGesture() { active = null; }

  function resetPointers() { active = null; downPointers.clear(); }

  function clickCapture(event) {
    if (!suppressClick || event.detail === 0) return;
    if (Date.now() > suppressClick.until) { suppressClick = null; return; }
    if (Math.hypot(event.clientX - suppressClick.x, event.clientY - suppressClick.y) > 30) return;
    suppressClick = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  doc.addEventListener('pointerdown', pointerDown, { passive: true, capture: true });
  doc.addEventListener('pointermove', pointerMove, { passive: true, capture: true });
  doc.addEventListener('pointerup', pointerUp, { capture: true });
  doc.addEventListener('pointercancel', pointerCancel, { passive: true, capture: true });
  doc.addEventListener('scroll', cancelGesture, { passive: true, capture: true });
  board.addEventListener('click', clickCapture, true);
  view?.addEventListener('blur', resetPointers);
  return () => {
    doc.removeEventListener('pointerdown', pointerDown, true);
    doc.removeEventListener('pointermove', pointerMove, true);
    doc.removeEventListener('pointerup', pointerUp, true);
    doc.removeEventListener('pointercancel', pointerCancel, true);
    doc.removeEventListener('scroll', cancelGesture, true);
    board.removeEventListener('click', clickCapture, true);
    view?.removeEventListener('blur', resetPointers);
    resetPointers();
  };
}
