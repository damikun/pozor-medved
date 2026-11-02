(function () {
  const state = { keys: new Set(), jumpPressed: false, jumpKey: null, downReleased: false, bitePressed: false, hugPressed: false };
  const JUMP_KEYS = ['ArrowUp', 'KeyW', 'Space'];
  const BITE_KEYS = ['KeyX', 'KeyK'];
  const HUG_KEYS = ['KeyC', 'KeyO'];
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', ...BITE_KEYS, ...HUG_KEYS];
  const KEY_NAMES = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', ' ': 'Space', Spacebar: 'Space', Shift: 'ShiftLeft' };
  const DOUBLE_TAP = 0.32;
  const codeOf = (e) => e.code || KEY_NAMES[e.key] || e.key;

  function press(code, repeat) {
    if (JUMP_KEYS.includes(code) && !repeat) { state.jumpPressed = true; state.jumpKey = code; }
    if (BITE_KEYS.includes(code) && !repeat) state.bitePressed = true;
    if (HUG_KEYS.includes(code) && !repeat) state.hugPressed = true;
    state.keys.add(code);
  }

  function release(code) {
    state.keys.delete(code);
    if (code === 'ArrowDown' || code === 'KeyS') state.downReleased = true;
  }

  function touchButtons() {
    const lastUp = {};
    let sprintBy = null;
    document.querySelectorAll('#touch button').forEach((btn) => {
      const key = btn.dataset.key;
      const arrow = key === 'ArrowLeft' || key === 'ArrowRight';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const now = e.timeStamp / 1000;
        if (arrow && now - (lastUp[key] || -9) < DOUBLE_TAP) { sprintBy = key; state.keys.add('ShiftLeft'); btn.classList.add('sprint'); }
        press(key, false);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, (e) => {
        e.preventDefault();
        if (!state.keys.has(key)) return;
        if (arrow) lastUp[key] = e.timeStamp / 1000;
        if (sprintBy === key) { sprintBy = null; state.keys.delete('ShiftLeft'); btn.classList.remove('sprint'); }
        release(key);
      }));
    });
  }

  function listen({ onPause, onMute }) {
    window.addEventListener('keydown', (e) => {
      const code = codeOf(e);
      if (code === 'KeyP' || code === 'Escape') { if (!e.repeat) onPause(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (code === 'KeyM' && onMute) { if (!e.repeat) onMute(); return; }
      press(code, e.repeat);
      if (GAME_KEYS.includes(code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      release(codeOf(e));
      if (e.key === 'Meta') state.keys.clear();
    });
    window.addEventListener('blur', () => state.keys.clear());
    touchButtons();
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.input = { state, press, release, listen };
})();
