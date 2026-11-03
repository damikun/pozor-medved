(function () {
  const state = { keys: new Set(), jumpPressed: false, jumpKey: null, downReleased: false, bitePressed: false, hugPressed: false };
  const JUMP_KEYS = ['ArrowUp', 'KeyW', 'Space'];
  const BITE_KEYS = ['KeyX', 'KeyK'];
  const HUG_KEYS = ['KeyC', 'KeyO'];
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', ...BITE_KEYS, ...HUG_KEYS];
  const KEY_NAMES = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', ' ': 'Space', Spacebar: 'Space', Shift: 'ShiftLeft' };
  const DEAD = 0.15, FAST = 0.85, SLOW = 0.72, VERT = 0.35, FLAT = 40, STEEP = 65;
  const stick = { dir: 0, fast: false };
  const owners = new Map();
  let touched = false;
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

  function hold(src, code, on) {
    const who = owners.get(code) || new Set();
    owners.set(code, who);
    if (on) { who.add(src); state.keys.add(code); return; }
    if (who.delete(src) && !who.size) release(code);
  }

  function aim(vx, vy, r, fast) {
    const ax = Math.abs(vx) / r, ay = Math.abs(vy) / r, m = Math.hypot(ax, ay);
    if (m < DEAD) return { dir: 0, fast: false, down: false, up: false };
    const tilt = (Math.atan2(ay, ax) * 180) / Math.PI;
    const dir = tilt < STEEP ? Math.sign(vx) : 0, vert = tilt >= FLAT && ay > VERT;
    return { dir, fast: !!dir && !vert && m > (fast ? SLOW : FAST), down: vert && vy > 0, up: vert && vy < 0 };
  }

  function steer({ dir, fast, down, up }) {
    stick.dir = dir;
    stick.fast = fast;
    hold('stick', 'ArrowLeft', dir < 0);
    hold('stick', 'ArrowRight', dir > 0);
    hold('stick', 'ArrowDown', down);
    hold('stick', 'ArrowUp', up);
    hold('stick', 'ShiftLeft', fast);
  }

  function jump(on) {
    if (on) press(stick.dir ? 'Space' : 'ArrowUp', false);
    hold('jump', 'ArrowUp', on);
    if (!on) release('Space');
  }

  function buzz(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  function grab(el, down, move, up) {
    let id = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (id !== null) return;
      id = e.pointerId;
      if (el.setPointerCapture) el.setPointerCapture(id);
      down(e);
    });
    if (move) el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => el.addEventListener(n, (e) => {
      if (e.pointerId !== id) return;
      id = null;
      up(e);
    }));
  }

  function stickPad(zone) {
    const base = zone.querySelector('.base'), knob = zone.querySelector('.knob');
    let home = null, at = null, r = 1;
    const show = (vx, vy) => {
      base.style.transform = at ? `translate(${at.x - home.x}px, ${at.y - home.y}px)` : '';
      knob.style.transform = `translate(${vx}px, ${vy}px)`;
    };
    const move = (e) => {
      let vx = e.clientX - at.x, vy = e.clientY - at.y;
      const d = Math.hypot(vx, vy);
      if (d > r) { at = { x: at.x + vx * (1 - r / d), y: at.y + vy * (1 - r / d) }; vx *= r / d; vy *= r / d; }
      const a = aim(vx, vy, r, stick.fast);
      if (a.fast && !stick.fast) buzz(8);
      steer(a);
      zone.classList.toggle('sprint', a.fast);
      show(vx, vy);
    };
    grab(zone, (e) => {
      const b = base.getBoundingClientRect();
      home = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      r = b.width / 2;
      at = Math.hypot(e.clientX - home.x, e.clientY - home.y) <= r * 1.2 ? home : { x: e.clientX, y: e.clientY };
      zone.classList.add('on');
      move(e);
    }, move, () => {
      at = null;
      steer(aim(0, 0, 1, false));
      zone.classList.remove('on', 'sprint');
      show(0, 0);
    });
  }

  function inside(e, el) {
    const r = el.getBoundingClientRect();
    return e.clientX > r.left - 8 && e.clientX < r.right + 8 && e.clientY > r.top - 8 && e.clientY < r.bottom + 8;
  }

  function safe(btn, key) {
    grab(btn, () => btn.classList.add('down'), null, (e) => {
      btn.classList.remove('down');
      if (e.type !== 'pointerup' || !btn.classList.contains('on') || !inside(e, btn)) return;
      press(key, false);
      release(key);
      buzz(10);
    });
  }

  function touchButtons(onPause) {
    const box = document.getElementById('touch');
    stickPad(box.querySelector('.stick'));
    box.querySelectorAll(':scope > button[data-key]').forEach((btn) => {
      const fixed = btn.dataset.key;
      if (fixed === 'KeyP') { btn.addEventListener('click', () => { btn.blur(); onPause(); }); return; }
      if (fixed === 'KeyX') { safe(btn, fixed); return; }
      let key = fixed;
      const on = (v) => {
        if (v) key = btn.dataset.key;
        btn.classList.toggle('down', v);
        if (key === 'ArrowUp') jump(v);
        else if (key === 'ArrowDown') hold(btn.id || 'hide', key, v);
        else if (v) press(key, false);
        else release(key);
      };
      grab(btn, () => { on(true); if (btn.id === 'act') buzz(10); }, null, () => on(false));
    });
    box.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function listen({ onPause, onMute, onTouch }) {
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
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || touched) return;
      touched = true;
      if (onTouch) onTouch();
    }, true);
    touchButtons(onPause);
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.input = { state, press, release, listen, aim, steer, jump, touched: () => touched };
})();
