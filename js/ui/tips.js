(function () {
  const HOLD = 0.7, BLEND = 0.45, MIN_DT = 1 / 61, HOVER = 0.18, QUIET = 4000;
  const GLOW = [{ boxShadow: '0 0 0 2px rgba(255, 236, 160, 0.95)' }, { boxShadow: '0 0 0 2px rgba(255, 236, 160, 0)' }];
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  let run = null;

  function capsHtml(codes, touch) {
    return codes.map((c) => ZS.prompt.html(c, touch)).join('');
  }

  const inText = (code, text) => text.indexOf('{' + code + '}') >= 0;

  function hudHtml(info) {
    if (!info) return '';
    let html = '';
    if (info.bar) html += '<span class="mini ' + info.bar + '"><i></i><b>' + ZS.UI.bars[info.bar] + '</b></span>';
    if (info.goal !== undefined) html += '<span class="goal"></span>';
    if (info.badge !== undefined) html += '<span class="flag" hidden></span>';
    return html;
  }

  function fit() {
    const c = run.canvas, dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (w === run.w && h === run.h) return false;
    run.w = c.width = w; run.h = c.height = h;
    run.floor = Math.min(0.3, Math.max(0.18, 44 / Math.max(1, c.clientHeight)));
    return true;
  }

  function marks() {
    const on = ZS.howto.lit(run.d), sprint = on.has('ShiftLeft');
    const key = [...on].sort().join(' ');
    if (key === run.lit) return;
    run.lit = key;
    for (const m of run.marks) {
      const lit = on.has(m.dataset.k);
      m.classList.toggle('on', lit);
      if (run.touch) m.classList.toggle('sprint', lit && sprint);
    }
  }

  function hud() {
    const info = ZS.howto.hud(run.d), H = run.hud;
    if (!info) return;
    if (H.bar) {
      const w = Math.round(Math.max(0, Math.min(100, info.value)));
      if (w !== H.barW) {
        const jump = H.barW >= 0 ? w - H.barW : 0;
        H.bar.style.width = w + '%';
        if (jump >= 2 && H.bar.parentNode.animate) H.bar.parentNode.animate(GLOW, 450);
        H.barW = w;
      }
    }
    if (H.goal && info.goal !== H.goalT) {
      H.goalT = info.goal;
      H.goal.textContent = info.goal;
      H.goal.classList.toggle('done', info.goal !== ZS.UI.hugGoal(0));
    }
    if (H.flag && info.badge !== H.flagT) {
      H.flagT = info.badge;
      H.flag.textContent = info.badge;
      H.flag.hidden = !info.badge;
    }
  }

  function paint() {
    fit();
    if (!run.w || !run.h) return;
    const ctx = run.ctx;
    ZS.howto.draw(run.d, ctx, run.w, run.h, run.floor);
    if (run.blend < 1) {
      ctx.globalAlpha = 1 - smooth(run.blend);
      ctx.drawImage(run.snap, 0, 0, run.w, run.h);
      ctx.globalAlpha = 1;
    }
    marks();
    hud();
  }

  function follow(chip) {
    const row = run.row;
    if (!chip || row.scrollWidth <= row.clientWidth + 1 || performance.now() - run.touched < QUIET) return;
    const left = chip.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - (row.clientWidth - chip.offsetWidth) / 2;
    if (row.scrollTo) row.scrollTo({ left: Math.max(0, left), behavior: run.calm ? 'auto' : 'smooth' });
    else row.scrollLeft = Math.max(0, left);
  }

  function play(i, blend) {
    const H = ZS.howto, id = run.ids[i], T = run.touch ? ZS.UI.tipsTouch : ZS.UI.tips;
    if (blend && run.w && run.h && !run.calm) {
      const s = run.snap;
      if (s.width !== run.w || s.height !== run.h) { s.width = run.w; s.height = run.h; }
      const sc = s.getContext('2d');
      sc.clearRect(0, 0, s.width, s.height);
      sc.drawImage(run.canvas, 0, 0);
      run.blend = 0;
    } else {
      run.blend = 1;
    }
    run.i = i;
    run.d = H.create(id, { touch: run.touch });
    run.wait = 0;
    const codes = H.keysOf(run.d);
    run.cue.innerHTML = '<span class="keys' + (run.touch ? ' pads' : '') + '">' + capsHtml(codes, run.touch) + '</span><span class="say">' + ZS.prompt.fill(T[id], run.touch) + '</span>';
    run.hudBox.innerHTML = hudHtml(H.hud(run.d));
    run.hud = { bar: run.hudBox.querySelector('.mini i'), goal: run.hudBox.querySelector('.goal'), flag: run.hudBox.querySelector('.flag'), barW: -1, goalT: null, flagT: null };
    run.chips.forEach((c, j) => { c.classList.toggle('on', j === i); c.setAttribute('aria-pressed', String(j === i)); });
    run.row.querySelectorAll('kbd.on, kbd.sprint').forEach((k) => k.classList.remove('on', 'sprint'));
    run.marks = [...run.cue.querySelectorAll('[data-k]'), ...run.chips[i].querySelectorAll('[data-k]')];
    run.lit = null;
    follow(run.chips[i]);
    if (run.calm) H.still(run.d);
    else fit();
    paint();
  }

  function frame(ts) {
    if (!run) return;
    run.raf = requestAnimationFrame(frame);
    if (!run.box.isConnected) { stop(); return; }
    const dt = run.last ? Math.min(0.1, (ts - run.last) / 1000) : 0;
    run.last = ts;
    run.spent += dt;
    if (run.spent < MIN_DT) return;
    const step = run.spent;
    run.spent = 0;
    if (run.hover && (run.hover.t -= step) <= 0) {
      const j = run.hover.i;
      run.hover = null;
      if (j !== run.i) { play(j, true); return; }
    }
    ZS.howto.advance(run.d, step);
    if (run.blend < 1) run.blend = Math.min(1, run.blend + step / BLEND);
    if (run.d.t >= run.d.def.dur + HOLD) { play((run.i + 1) % run.ids.length, true); return; }
    paint();
  }

  function mount(box, touch) {
    stop();
    const H = ZS.howto;
    if (!box || !H) return;
    const canvas = box.querySelector('.stage canvas'), cue = box.querySelector('.stage .cue'), hudBox = box.querySelector('.stage .hud');
    const row = box.querySelector('.chips'), chips = [...box.querySelectorAll('.chip[data-demo]')];
    if (!canvas || !cue || !hudBox || !row || !chips.length) return;
    const ids = chips.map((c) => c.dataset.demo).filter((id) => H.ids.includes(id));
    if (ids.length !== chips.length) return;
    const calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const T = touch ? ZS.UI.tipsTouch : ZS.UI.tips;
    chips.forEach((chip, i) => {
      const k = chip.querySelector('.k');
      k.innerHTML = capsHtml(H.keysFor(ids[i], touch).filter((c) => !inText(c, T[ids[i]])), touch);
      k.classList.toggle('pads', touch);
      chip.title = chip.querySelector('.t').textContent;
      chip.onclick = () => { if (run) { run.hover = null; play(i, true); } };
      chip.onmouseenter = () => { if (run && !run.calm && i !== run.i) run.hover = { i, t: HOVER }; };
      chip.onmouseleave = () => { if (run && run.hover && run.hover.i === i) run.hover = null; };
    });
    run = {
      box, canvas, ctx: canvas.getContext('2d'), snap: document.createElement('canvas'), cue, hudBox, row, chips, ids, touch, calm,
      i: 0, d: null, w: 0, h: 0, floor: 0.22, blend: 1, raf: 0, last: 0, spent: 0, hover: null, touched: -1e9, lit: null, marks: [], hud: null, ro: null,
    };
    const poke = () => { if (run) run.touched = performance.now(); };
    row.addEventListener('pointerdown', poke, { passive: true });
    row.addEventListener('wheel', poke, { passive: true });
    row.addEventListener('touchstart', poke, { passive: true });
    play(0, false);
    if (calm) {
      if (window.ResizeObserver) {
        run.ro = new ResizeObserver(() => { if (run && fit()) paint(); });
        run.ro.observe(canvas);
      }
      return;
    }
    run.raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    if (run.ro) run.ro.disconnect();
    run = null;
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.tips = { mount, stop, running: () => !!run && !run.calm, scene: () => (run ? run.ids[run.i] : null) };
})();
