(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;

  const INTRO = { nudge: 2.4, auto: 4, sit: 0.45, zoom: 0.75, open: 0.45 };
  const ROUNDS = [
    { bell: 0.6, open: 2, close: 8, base: 38, proti: 30, zdrzal: 7, pick: 0 },
    { bell: 10.2, open: 11.6, close: 17.6, base: 41, proti: 35, zdrzal: 6, pick: 1 },
    { bell: 18.6, open: 20, close: 25.6, base: 44, proti: 40, zdrzal: 4, pick: 0 },
    { bell: 26.6, open: 28, close: 32, base: 89, proti: 31, zdrzal: 18, pick: 0, fast: true, need: 90 },
  ];
  const THREATS = [];
  const FAST = 26, QUORUM = 76, PRESENT = 75, COOL = 3, DUCK = 0.5;
  const POINTA = { show: 0.3, flash: 0.6, end: 2.8 };
  const BUTTONS = 3;

  function stage() {
    const S = ZS.levelKit.plenaryStage();
    S.start = S.plenary.start;
    return S;
  }

  function start(g) {
    rules().say(g, NEWS.capital.plenary, true);
    return {
      t: 0, phase: 'walk', sitAt: -1, sitFrom: 0, ft: -1, sel: 0, selFrom: 0, selAt: -9, press: null, duck: 0,
      vote: ROUNDS.map(() => -1), res: ROUNDS.map(() => null), votes: 0, seen: 0, seenAt: -99, present: PRESENT,
      round: -1, said: {}, hit: {}, sway: 0, pointa: null, result: null, held: { l: false, r: false },
    };
  }

  function fpv(c) {
    return c.ft >= 0;
  }

  function state(c, i) {
    const R = ROUNDS[i];
    if (!R || c.ft < R.bell) return 'wait';
    if (c.ft < R.open) return 'bell';
    if (c.ft < R.close) return 'open';
    return 'done';
  }

  function threat(c) {
    if (c.ft < 0 || c.pointa) return null;
    for (const T of THREATS) {
      if (c.ft >= T.warn && c.ft < T.end) return { T, on: c.ft >= T.at, k: c.ft < T.at ? (c.ft - T.warn) / (T.at - T.warn) : (c.ft - T.at) / (T.end - T.at) };
    }
    return null;
  }

  function tally(c, i) {
    const R = ROUNDS[i], v = c.vote[i];
    const za = R.base + (v === 0 ? 1 : 0), proti = R.proti + (v === 1 ? 1 : 0), zdrzal = R.zdrzal + (v === 2 ? 1 : 0);
    const present = za + proti + zdrzal, quorum = present >= QUORUM;
    const passed = quorum && (R.need ? za >= R.need : za > present / 2);
    return { za, proti, zdrzal, present, quorum, passed };
  }

  function pop(g, at, text, color) {
    rules().float(g, g.bear.x, GY - 150, text, color);
    g.floaters[g.floaters.length - 1].at = at;
  }

  function seen(g, c, kind) {
    const b = g.bear;
    if (g.time - c.seenAt < COOL) return;
    c.seenAt = g.time; c.seen++; c.hit[kind + c.round] = true;
    if (g.lives > 1) { g.lives -= 1; rules().onSound(g, 'hit', b.x); pop(g, 'paws', LABELS.hit(g.lives), COLORS.shot); b.inv = 2; }
    rules().spotted(g, b.x, GY - 150, LABELS.plenary[kind]);
    g.floaters[g.floaters.length - 1].at = kind === 'camera' ? 'cam' : 'right';
    rules().addPanic(g, 4);
    rules().onSound(g, kind === 'camera' ? 'shutter' : 'scream', b.x);
    if (!c.said.seen) { c.said.seen = true; rules().say(g, NEWS.capital.plenarySeen, true); }
    rules().quip(g, ZS.QUIPS.plenarySeen, true);
  }

  function sitDown(g, S, c) {
    const b = g.bear;
    c.phase = 'sit'; c.sitAt = c.t; c.sitFrom = b.x;
    ZS.sim.passes.quiet(b);
    b.dir = 1;
    rules().onSound(g, 'creak', b.x, 0.5);
  }

  function intro(g, S, c, dt) {
    const b = g.bear, seat = S.plenary.seats[0];
    if (c.phase === 'walk') {
      const pressed = g.input.hugPressed;
      ZS.sim.passes.clearPresses(g);
      ZS.sim.bear.update(g, dt);
      b.x = clamp(b.x, 60, seat + 60);
      if (b.y < GY - 60) { b.y = GY - 60; b.vy = Math.max(0, b.vy); }
      if (c.t >= INTRO.nudge && !c.said.nudge) { c.said.nudge = true; rules().float(g, S.plenary.rostrum - 120, GY - 190, LABELS.plenary.nudge, COLORS.story); }
      if (Math.abs(b.x - seat) < 22 || (pressed && Math.abs(b.x - seat) < 70) || c.t >= INTRO.auto) sitDown(g, S, c);
      return;
    }
    ZS.sim.passes.clearPresses(g);
    const k = clamp((c.t - c.sitAt) / INTRO.sit, 0, 1);
    b.x = c.sitFrom + (seat - c.sitFrom) * k * k * (3 - 2 * k);
    b.trackX = b.x; b.moving = k < 1; b.rear = k * k * (3 - 2 * k);
    if (k > 0 && k < 1) b.walkT += dt;
    if (c.t - c.sitAt >= INTRO.sit + INTRO.zoom) {
      c.phase = 'fpv'; c.ft = 0;
      pop(g, 'board', LABELS.plenary.rule, COLORS.story);
      ZS.sim.passes.quiet(b);
      b.rear = 0;
      g.floaters = []; g.bubble = null;
    }
  }

  function cues(g, c) {
    const b = g.bear;
    for (let i = 0; i < ROUNDS.length; i++) {
      const st = state(c, i), R = ROUNDS[i], key = 'r' + i;
      if (st !== 'wait' && !c.said[key + 'b']) {
        c.said[key + 'b'] = true; c.round = i;
        rules().onSound(g, 'bell', b.x);
        if (i > 0) rules().say(g, NEWS.capital.bill[i - 1], i === ROUNDS.length - 1);
        if (R.fast) pop(g, 'board', LABELS.plenary.fast, COLORS.bad);
      }
      if ((st === 'open' || st === 'done') && !c.said[key + 'o']) { c.said[key + 'o'] = true; rules().onSound(g, 'beep', b.x, 0.6); }
      if (st === 'done' && !c.res[i] && i < ROUNDS.length - 1) close(g, c, i);
    }
    for (const T of THREATS) {
      const key = 't' + T.warn;
      if (c.ft >= T.warn && !c.said[key]) {
        c.said[key] = true;
        pop(g, T.kind === 'camera' ? 'cam' : 'right', T.kind === 'camera' ? LABELS.plenary.rec : LABELS.plenary.sniff, COLORS.zap);
        rules().onSound(g, T.kind === 'camera' ? 'beep' : 'creak', b.x, 0.5);
      }
      if (c.ft >= T.end && !c.said[key + 'e']) {
        c.said[key + 'e'] = true;
        if (!c.hit[T.kind + c.round]) pop(g, T.kind === 'camera' ? 'cam' : 'right', LABELS.plenary.dodge[T.kind], COLORS.good);
      }
    }
    if (c.ft >= FAST && !c.said.fast) { c.said.fast = true; rules().onSound(g, 'creak', b.x); }
  }

  function close(g, c, i) {
    const r = (c.res[i] = tally(c, i)), b = g.bear;
    const text = !r.quorum ? LABELS.plenary.noQuorum : LABELS.plenary.out[i][r.passed ? 0 : 1];
    pop(g, 'board', text, r.passed ? COLORS.good : COLORS.bad);
    rules().onSound(g, 'clap', b.x, r.passed ? 0.7 : 0.35);
  }

  function edge(c, keys, code, side) {
    const on = keys.has(code), was = c.held[side];
    c.held[side] = on;
    return on && !was;
  }

  function control(g, c, dt) {
    const keys = g.input.keys, pressed = g.input.hugPressed, b = g.bear;
    ZS.sim.passes.clearPresses(g);
    const down = keys.has('ArrowDown');
    c.duck = clamp(c.duck + (down ? 1 : -1) * dt * 6, 0, 1);
    const i = c.round, open = i >= 0 && state(c, i) === 'open' && c.vote[i] < 0;
    const l = edge(c, keys, 'ArrowLeft', 'l'), r = edge(c, keys, 'ArrowRight', 'r');
    if ((l || r) && c.duck < DUCK) {
      const to = clamp(c.sel + (r ? 1 : -1), 0, BUTTONS - 1);
      if (to !== c.sel) { c.selFrom = c.sel; c.sel = to; c.selAt = c.ft; rules().onSound(g, 'rung', b.x, 0.4); }
    }
    if (c.press) c.press.t += dt;
    if (!pressed || c.duck >= DUCK || (c.press && c.press.t < 0.3)) return;
    c.press = { k: c.sel, t: 0, live: open };
    if (!open) return;
    c.vote[i] = c.sel; c.votes++;
    let to = ROUNDS[i].close - 0.7;
    for (const T of THREATS) if (T.warn > c.ft && T.warn < to) to = T.warn - 0.05;
    if (to > c.ft) c.ft = to;
    if (i === 0 && c.present === PRESENT) c.present++;
    rules().onSound(g, 'beep', b.x);
    const right = c.sel === ROUNDS[i].pick;
    pop(g, 'board', right ? LABELS.plenary.good : LABELS.plenary.bad, right ? COLORS.good : COLORS.bad);
    if (right) g.fat = Math.min(100, g.fat + 3); else rules().addPanic(g, 3);
    if (i === 0) { pop(g, 'paws', LABELS.plenary.quorum, COLORS.good); rules().quip(g, ZS.QUIPS.plenaryQuorum, true); }
  }

  function watch(g, c) {
    const T = threat(c);
    if (T && T.on && c.duck < DUCK) seen(g, c, T.T.kind);
  }

  function finish(g, c) {
    const r = c.res[ROUNDS.length - 1];
    c.result = r.passed ? 'passed' : 'failed';
    g.once.vote = true;
    g.once.plenary = { votes: c.votes, seen: c.seen, passed: r.passed };
    if (!c.seen) g.panic = Math.max(0, g.panic - 6);
    return true;
  }

  function pointa(g, c, dt) {
    const p = c.pointa, was = p.t, b = g.bear, last = ROUNDS.length - 1;
    p.t += dt;
    c.duck = Math.max(0, c.duck - dt * 4);
    if (c.press) c.press.t += dt;
    ZS.sim.passes.clearPresses(g);
    if (was < POINTA.show && p.t >= POINTA.show) {
      c.res[last] = tally(c, last);
      rules().onSound(g, 'bell', b.x);
    }
    if (was < POINTA.flash && p.t >= POINTA.flash) {
      p.flash = 1;
      const ok = c.res[last].passed;
      rules().onSound(g, 'shutter', b.x);
      rules().onSound(g, 'clap', b.x, ok ? 1 : 0.4);
      rules().say(g, NEWS.capital.voted[ok ? 0 : 1], true);
      pop(g, 'board', LABELS.plenary.out[last][ok ? 0 : 1], ok ? COLORS.good : COLORS.bad);
    }
    p.flash = Math.max(0, (p.flash || 0) - dt * 2.2);
    return p.t >= POINTA.end;
  }

  function update(g, c, dt) {
    const S = g.level;
    c.t += dt;
    if (!fpv(c)) { intro(g, S, c, dt); return false; }
    c.ft += dt;
    c.sway = c.ft >= FAST ? Math.min(1, c.sway + dt) : 0;
    if (c.pointa) return pointa(g, c, dt) && finish(g, c);
    cues(g, c);
    control(g, c, dt);
    watch(g, c);
    if (c.ft >= ROUNDS[ROUNDS.length - 1].close) c.pointa = { t: 0, flash: 0 };
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
    if (fpv(c)) c.ft += dt;
  }

  function plan(g) {
    return ZS.sim.passes.playing(g, 'vote');
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    if (!fpv(c)) {
      if (c.phase === 'walk') { if (b.x < S.plenary.seats[0] - 10) keys.add('ArrowRight'); else g.input.hugPressed = true; }
      return;
    }
    if (c.pointa) return;
    if (threat(c)) { keys.add('ArrowDown'); return; }
    const i = c.round;
    if (i < 0 || state(c, i) !== 'open' || c.vote[i] >= 0 || c.duck > 0.05) return;
    const want = ROUNDS[i].pick;
    if (c.sel !== want) {
      const side = want > c.sel ? 'r' : 'l';
      if (!c.held[side]) keys.add(side === 'r' ? 'ArrowRight' : 'ArrowLeft');
      return;
    }
    g.input.hugPressed = true;
  }

  ZS.sim.plenary = { INTRO, ROUNDS, THREATS, POINTA, FAST, QUORUM, stage, start, update, idle, plan, pilot, fpv, state, threat, tally };
})();
