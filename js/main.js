(function () {
  const { CFG, NEWS, LABELS, COLORS } = ZS;
  const { rules, loop, checkpoint } = ZS.sim;
  const { input, hud, screens } = ZS.ui;
  const audio = ZS.audio, tally = ZS.tally;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const BOT = /[?&]bot\b/.test(location.search);
  const PORTRAIT_MIN_W = 480;
  const SAVE = 'zaStromom.done';
  let g = null, vw = 0, vh = 0, viewW = 0, offY = 0, last = 0, hudT = 0, current = 'summer', mark = null;

  const touchy = () => window.matchMedia('(pointer: coarse)').matches;

  function done() {
    try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { return {}; }
  }

  function markDone(id) {
    try { localStorage.setItem(SAVE, JSON.stringify(Object.assign(done(), { [id]: true }))); } catch (e) { return; }
  }

  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    viewW = 0; offY = 0;
    if (vw && vh) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
      const minW = vh > vw ? PORTRAIT_MIN_W : CFG.MIN_VIEW_W;
      const scale = Math.min(vh / CFG.VIEW_H, vw / minW);
      viewW = vw / scale;
      offY = (vh / scale - CFG.VIEW_H) * 0.45;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    }
    if (g) g.viewW = viewW;
  }

  function note(run, label, news) {
    rules.float(run, run.bear.x, CFG.GROUND - 130, label, COLORS.story);
    rules.say(run, news);
  }

  function start(level, from) {
    current = level || current;
    if (!from) mark = null;
    input.state.keys.clear();
    g = from ? checkpoint.resume(from, input.state, { viewW, bot: BOT }) : rules.create(input.state, { viewW, bot: BOT, level: current });
    g.touch = touchy();
    g.running = true;
    const seen = tally.watch(g);
    if (from) Object.assign(seen, { climbs: from.tally.trees, shakes: from.tally.stands - (g.ladders || 0) });
    audio.pause(false);
    hud.showPlaying(g);
    screens.hide();
    if (document.activeElement) document.activeElement.blur();
    if (from) note(g, LABELS.lift.resumed, NEWS.liftResume);
    else rules.say(g, current === 'winter' ? NEWS.winterStart : NEWS.springStart);
  }

  function preview(level) {
    if (g.running || g.level.id === level) return;
    g = rules.create(input.state, { viewW, level });
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
    screens.showStart(done(), start, preview, touchy(), (code) => { setLang(code); menu(); });
  }

  function showPause() {
    screens.showPause(togglePause, menu);
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
  rules.onLand = (run) => {
    if (run !== g) return;
    mark = Object.assign(checkpoint.save(run), { tally: tally.counts(run) });
    note(run, LABELS.lift.checkpoint, NEWS.checkpoint);
  };
  rules.onEnd = (run) => {
    audio.end(run.ending);
    tally.check(run);
    hud.update(run);
    hud.setTouch(false);
    if (run.ending === 'win') markDone(run.level.id);
    screens.showEnd(run, { onAgain: () => start(run.level.id), onNext: () => start('winter'), onMenu: menu,
      onRetry: checkpoint.offer(mark, run) ? () => start(run.level.id, mark) : null });
  };

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (vw !== window.innerWidth || vh !== window.innerHeight) resize();
    audio.frame(g, dt);
    if (g.running && !g.over && !g.paused) {
      loop.step(g, dt);
      hud.tick(dt);
      if (!g.over && (hudT -= dt) <= 0) { hudT = 0.1; tally.check(g); hud.update(g); }
    }
    g.cam = loop.cameraX(g);
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden && g && g.running && !g.paused) togglePause(); });
  input.listen({ onPause: togglePause, onMute: audio.toggle });
  resize();
  g = rules.create(input.state, { viewW });
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
