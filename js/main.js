(function () {
  const { CFG, NEWS } = ZS;
  const { rules, loop } = ZS.sim;
  const { input, hud, screens } = ZS.ui;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const BOT = /[?&]bot\b/.test(location.search);
  const PORTRAIT_MIN_W = 480;
  let g = null, vw = 0, vh = 0, viewW = 0, offY = 0, last = 0, hudT = 0;

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

  function start() {
    input.state.keys.clear();
    g = rules.create(input.state, { viewW, bot: BOT });
    g.running = true;
    hud.showPlaying();
    screens.hide();
    if (document.activeElement) document.activeElement.blur();
    rules.say(g, NEWS.springStart);
  }

  function togglePause() {
    if (!g || !g.running || g.over) return;
    g.paused = !g.paused;
    if (g.paused) screens.showPause(togglePause);
    else screens.hide();
  }

  rules.onNews = hud.showNews;
  rules.onEnd = (run) => {
    hud.update(run);
    hud.setTouch(false);
    screens.showEnd(run, start);
  };

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (vw !== window.innerWidth || vh !== window.innerHeight) resize();
    if (g.running && !g.over && !g.paused) {
      loop.step(g, dt);
      if (!g.over && (hudT -= dt) <= 0) { hudT = 0.1; hud.update(g); }
    }
    g.cam = loop.cameraX(g);
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden && g && g.running && !g.paused) togglePause(); });
  input.listen({ onPause: togglePause });
  resize();
  g = rules.create(input.state, { viewW });
  screens.showStart(start);
  requestAnimationFrame(frame);

  ZS.dev = ZS.dev || {};
  ZS.dev.game = () => g;
  ZS.dev.restart = start;
  ZS.dev.step = (seconds) => {
    loop.advance(g, seconds);
    if (g.running) hud.update(g);
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    return g;
  };
})();
