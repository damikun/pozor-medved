// Keyboard and touch input. The simulation only reads `state`: held keys, plus edge flags for a jump press
// and a ↓ release that it consumes itself.
(function () {
  const state = { keys: new Set(), jumpPressed: false, jumpKey: null, downReleased: false };
  const JUMP_KEYS = ['ArrowUp', 'KeyW', 'Space'];
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'];
  // Some browsers and keyboard layouts leave e.code empty; fall back to e.key.
  const KEY_NAMES = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', ' ': 'Space', Spacebar: 'Space', Shift: 'ShiftLeft' };
  const codeOf = (e) => e.code || KEY_NAMES[e.key] || e.key;

  /** A key goes down; repeat is true for the keyboard's auto-repeat, which is no new jump. */
  function press(code, repeat) {
    if (JUMP_KEYS.includes(code) && !repeat) { state.jumpPressed = true; state.jumpKey = code; }
    // Auto-repeat keeps re-adding a held key, so it comes back even after a lost focus cleared it.
    state.keys.add(code);
  }

  /** A key comes up. */
  function release(code) {
    state.keys.delete(code);
    // Remember the release itself, so a quick release-and-press within one frame still counts.
    if (code === 'ArrowDown' || code === 'KeyS') state.downReleased = true;
  }

  /** Starts listening. onPause is called for P or Escape. */
  function listen({ onPause }) {
    window.addEventListener('keydown', (e) => {
      const code = codeOf(e);
      if (code === 'KeyP' || code === 'Escape') { if (!e.repeat) onPause(); return; }
      press(code, e.repeat);
      if (GAME_KEYS.includes(code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      release(codeOf(e));
      // macOS sends no keyup for keys let go while ⌘ is held, so drop everything when ⌘ comes up.
      if (e.key === 'Meta') state.keys.clear();
    });
    window.addEventListener('blur', () => state.keys.clear());
    // On-screen buttons for touch devices behave like held keys.
    document.querySelectorAll('#touch button').forEach((btn) => {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); press(key, false); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, (e) => { e.preventDefault(); release(key); }));
    });
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.input = { state, press, release, listen };
})();
