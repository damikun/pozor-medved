(function () {
  const state = { keys: new Set(), jumpPressed: false, jumpKey: null, downReleased: false };
  const JUMP_KEYS = ['ArrowUp', 'KeyW', 'Space'];
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'];
  const KEY_NAMES = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', ' ': 'Space', Spacebar: 'Space', Shift: 'ShiftLeft' };
  const codeOf = (e) => e.code || KEY_NAMES[e.key] || e.key;

  function press(code, repeat) {
    if (JUMP_KEYS.includes(code) && !repeat) { state.jumpPressed = true; state.jumpKey = code; }
    state.keys.add(code);
  }

  function release(code) {
    state.keys.delete(code);
    if (code === 'ArrowDown' || code === 'KeyS') state.downReleased = true;
  }

  function listen({ onPause }) {
    window.addEventListener('keydown', (e) => {
      const code = codeOf(e);
      if (code === 'KeyP' || code === 'Escape') { if (!e.repeat) onPause(); return; }
      press(code, e.repeat);
      if (GAME_KEYS.includes(code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      release(codeOf(e));
      if (e.key === 'Meta') state.keys.clear();
    });
    window.addEventListener('blur', () => state.keys.clear());
    document.querySelectorAll('#touch button').forEach((btn) => {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); press(key, false); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, (e) => { e.preventDefault(); release(key); }));
    });
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.input = { state, press, release, listen };
})();
