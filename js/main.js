(function () {
  const { CFG, NEWS, LABELS, COLORS } = ZS;
  const { rules, loop, checkpoint } = ZS.sim;
  const { input, hud, screens } = ZS.ui;
  const audio = ZS.audio, tally = ZS.tally;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const BOT = /[?&]bot\b/.test(location.search);
  const PORTRAIT_MIN_W = 480, BAND = 0.15, BAND_MAX = 64, TOUCH_W = 1000, TOUCH_MIN_H = 420;
  const SAVE = 'zaStromom.done', SPOT = 'zaStromom.checkpoint.';
  let g = null, vw = 0, vh = 0, viewW = 0, viewH = 0, offY = 0, last = 0, hudT = 0, current = 'summer', mark = null, reached = new Set();

  const touchy = () => input.touched() || window.matchMedia('(pointer: coarse)').matches;

  function done() {
    try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { return {}; }
  }

  function markDone(id) {
    try { localStorage.setItem(SAVE, JSON.stringify(Object.assign(done(), { [id]: true }))); } catch (e) { return; }
  }

  function stored(id) {
    try { return checkpoint.unpack(localStorage.getItem(SPOT + id)); } catch (e) { return null; }
  }

  function keep(s) {
    if (BOT) return;
    try { localStorage.setItem(SPOT + s.level, checkpoint.pack(s)); } catch (e) { return; }
  }

  function forget(id) {
    try { localStorage.removeItem(SPOT + id); } catch (e) { return; }
  }

  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    viewW = 0; viewH = 0; offY = 0;
    if (vw && vh) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
      const minW = vh > vw ? PORTRAIT_MIN_W : CFG.MIN_VIEW_W;
      let band = vw > vh && touchy() ? Math.min(BAND_MAX, vh * BAND) : 0;
      let scale = Math.min((vh - band) / CFG.VIEW_H, vw / minW);
      if (band && vw / scale > TOUCH_W) { band = 0; scale = Math.min(vh / TOUCH_MIN_H, vw / TOUCH_W); }
      viewW = vw / scale; viewH = (vh - band) / scale;
      offY = viewH >= CFG.VIEW_H ? (viewH - CFG.VIEW_H) * 0.45 : viewH - CFG.VIEW_H;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    }
    if (g) { g.viewW = viewW; g.viewH = viewH; }
  }

  function note(run, label, news) {
    rules.float(run, run.bear.x, CFG.GROUND - 130, label, COLORS.story);
    rules.say(run, news);
  }

  function start(level, from) {
    current = level || current;
    mark = from || null;
    reached = new Set(from ? [from.key] : []);
    input.state.keys.clear();
    g = from ? checkpoint.resume(from, input.state, { viewW, bot: BOT }) : rules.create(input.state, { viewW, bot: BOT, level: current });
    g.touch = touchy();
    g.viewH = viewH;
    g.running = true;
    const seen = tally.watch(g);
    if (from) Object.assign(seen, { climbs: from.tally.trees, shakes: from.tally.stands - (g.ladders || 0) });
    audio.pause(false);
    hud.showPlaying(g);
    screens.hide();
    if (document.activeElement) document.activeElement.blur();
    if (from) for (const c of g.level.checkpoints || []) if (c.x <= from.x) reached.add(c.key);
    if (from) note(g, from.key === 'lift' ? LABELS.lift.resumed : LABELS.cp.resumed, from.key === 'lift' ? NEWS.liftResume : NEWS.cpResume);
    else rules.say(g, current === 'winter' ? NEWS.winterStart : current === 'chopok' ? NEWS.chopokStart : current === 'capital' ? NEWS.capital.start : current === 'olymp' ? NEWS.olymp.open : NEWS.springStart);
  }

  function preview(level) {
    if (g.running || g.level.id === level) return;
    g = rules.create(input.state, { viewW, level });
    g.viewH = viewH;
    g.bear.waking = false;
  }

  function setLang(code) {
    ZS.i18n.set(code, true);
    hud.relabel();
  }

  function menu() {
    if (g) g.running = false;
    audio.pause(false);
    hud.hidePlaying();
    const saved = { summer: stored('summer'), winter: stored('winter'), chopok: stored('chopok'), capital: stored('capital'), olymp: stored('olymp') };
    screens.showStart(done(), (id, cont) => start(id, cont ? saved[id] : null), preview, touchy(), (code) => { setLang(code); menu(); }, saved);
  }

  function showPause() {
    screens.showPause(togglePause, menu, touchy(), g && g.level.id);
  }

  function togglePause() {
    if (!g || !g.running || g.over) return;
    g.paused = !g.paused;
    audio.pause(g.paused);
    if (g.paused) showPause();
    else screens.hide();
  }

  rules.onNews = hud.showNews;
  rules.onSound = (run, name, x, k) => { audio.event(run, name, x, k); tally.hear(run, name); };
  audio.onChange = screens.syncMute;

  function pass(run) {
    const b = run.bear;
    if (run.ride || run.cut || run.over || ZS.sim.passes.passing(run)) return;
    for (const c of run.level.checkpoints || []) {
      if (reached.has(c.key) || b.x < c.x) continue;
      reached.add(c.key);
      mark = Object.assign(checkpoint.save(run, c.key), { tally: tally.counts(run) });
      keep(mark);
      note(run, LABELS.cp[c.key], NEWS.cp[c.key]);
    }
  }
  rules.onEnd = (run) => {
    audio.end(run.ending);
    tally.check(run);
    hud.update(run);
    hud.setTouch(false);
    if (run.ending === 'win') { markDone(run.level.id); forget(run.level.id); }
    screens.showEnd(run, { onAgain: () => start(run.level.id), onNext: () => start(screens.next(run.level.id)), onMenu: menu,
      onRetry: checkpoint.offer(mark, run) ? () => start(run.level.id, mark) : null, retryKey: mark && mark.key });
  };

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (vw !== window.innerWidth || vh !== window.innerHeight) resize();
    audio.frame(g, dt);
    if (g.running && !g.over && !g.paused) {
      loop.step(g, dt);
      pass(g);
      hud.tick(dt);
      if (!g.over && (hudT -= dt) <= 0) { hudT = 0.1; tally.check(g); hud.update(g); }
    }
    g.cam = loop.cameraX(g);
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden && g && g.running && !g.paused) togglePause(); });
  input.listen({ onPause: togglePause, onMute: audio.toggle, onTouch: () => { resize(); if (g.running && !g.over) { g.touch = true; hud.setTouch(true); } } });
  resize();
  g = rules.create(input.state, { viewW });
  g.viewH = viewH;
  menu();
  requestAnimationFrame(frame);

  ZS.dev = ZS.dev || {};
  ZS.dev.game = () => g;
  ZS.dev.restart = () => start();
  ZS.dev.start = (level) => start(level);
  ZS.dev.checkpoint = () => mark;
  ZS.dev.retry = () => { if (mark) start(mark.level, mark); return g; };
  ZS.dev.teleport = (x) => {
    g.bear.x = x; g.bear.trackX = x; g.bear.waking = false;
    g.cam = loop.cameraX(g);
    return g;
  };
  ZS.dev.step = (seconds) => {
    loop.advance(g, seconds);
    if (g.running) { hud.tick(seconds); tally.check(g); hud.update(g); }
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    return g;
  };
})();
