(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp, lerp, smooth } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const ROUTE = [[0, 560], [3, 560], [9, 1060], [14.5, 1060], [20, 1460], [25, 1460], [33, 1990], [36, 1990], [40, 2470], [49, 2470]];
  const EVENTS = [
    { kind: 'look', warn: 9.4, at: 11.5, end: 13.6 },
    { kind: 'cone', warn: 20.3, at: 22.4, end: 24.6, len: 430 },
    { kind: 'flash', warn: 28.4, at: 30.5, end: 30.9, len: 300 },
    { kind: 'look', warn: 40.6, at: 42.7, end: 45 },
  ];
  const GROUP = { n: 9, gap: 19, guide: 8 };
  const DARK = { from: 26, to: 36 };
  const SEEN = { cool: 2.4, back: 210, stun: 0.55, panic: 6, max: 3 };
  const LOST = 820, BUMP = 26, NEAR = 300, END = 49;
  const POINTA = { line: 0.3, puff: 1.3, flash: 2, end: 4 };
  const POSE = { rise: 5, fall: 4 };

  function stage() {
    const S = ZS.levelKit.caveStage();
    S.start = S.cave.start;
    return S;
  }

  function start(g, S) {
    const c = {
      t: 0, head: ROUTE[0][1], moving: false, lights: S.cave.domes.map(() => 0), dark: 0, flash: 0,
      seen: 0, seenAt: -99, event: null, warn: null, pose: 0, pointa: null, result: null, said: {},
      watchers: [], cone: null,
    };
    rules().say(g, NEWS.caveTour, true);
    return c;
  }

  function headAt(t) {
    for (let i = 1; i < ROUTE.length; i++) {
      const [t0, x0] = ROUTE[i - 1], [t1, x1] = ROUTE[i];
      if (t <= t1) return { x: lerp(x0, x1, smooth(clamp((t - t0) / (t1 - t0 || 1), 0, 1))), moving: x1 !== x0 && t > t0 };
    }
    return { x: ROUTE[ROUTE.length - 1][1], moving: false };
  }

  const tail = (c) => c.head - GROUP.guide - GROUP.n * GROUP.gap;

  function members(c) {
    const out = [{ x: c.head, guide: true, i: -1 }];
    for (let i = 0; i < GROUP.n; i++) out.push({ x: c.head - GROUP.guide - (i + 1) * GROUP.gap + (i % 2) * 5, guide: false, i });
    return out;
  }

  function lit(S, c, x) {
    if (c.dark > 0.5) return false;
    return S.cave.domes.some((d, i) => c.lights[i] > 0.5 && x > d[0] && x < d[1]);
  }

  function lights(S, c, dt) {
    const lo = tail(c), hi = c.head;
    c.dark = clamp(c.dark + (c.t >= DARK.from && c.t < DARK.to ? dt : -dt) * 2.5, 0, 1);
    S.cave.domes.forEach((d, i) => {
      const on = hi > d[0] && lo < d[1];
      c.lights[i] = clamp(c.lights[i] + (on ? dt * 2.2 : -dt * 1.4), 0, 1);
    });
  }

  function current(c) {
    c.event = null; c.warn = null; c.cone = null;
    for (const e of EVENTS) {
      if (c.t >= e.warn && c.t < e.at) c.warn = e;
      if (c.t >= e.at && c.t < e.end) c.event = e;
    }
    const e = c.event || c.warn;
    if (!e || e.kind === 'look') return;
    const from = e.kind === 'cone' ? c.head - 10 : tail(c) - 4;
    if (c.event) c.cone = { from, to: from - e.len, kind: e.kind };
  }

  function covered(b) {
    return !!b.hiding && !!b.hiding.hide;
  }

  function seenBy(S, c, b) {
    if (c.pointa) return null;
    if (b.x > tail(c) - BUMP) return 'bump';
    if (c.cone && b.x < c.cone.from && b.x > c.cone.to && !covered(b)) return c.cone.kind;
    if (c.event && c.event.kind === 'look' && lit(S, c, b.x) && !covered(b) && c.pose < 0.6) return 'look';
    return null;
  }

  function caught(g, S, c, why) {
    const b = g.bear;
    if (g.time - c.seenAt < SEEN.cool) return;
    c.seenAt = g.time;
    c.seen++;
    rules().spotted(g, b.x, GY - 130, LABELS.cave.seen[why] || LABELS.cave.seen.look);
    rules().addPanic(g, SEEN.panic);
    rules().onSound(g, 'scream', b.x, 0.7);
    if (!c.said.seen) { c.said.seen = true; rules().say(g, NEWS.caveSeen, true); }
    rules().quip(g, ZS.QUIPS.cave, true);
    chopok().quiet(b);
    Object.assign(b, { x: Math.max(60, Math.min(b.x, tail(c) - 40) - SEEN.back), stun: SEEN.stun, kx: -120 });
    b.trackX = b.x;
    c.pose = 0;
  }

  function control(g, S, c, dt) {
    const b = g.bear, keys = g.input.keys;
    chopok().clearPresses(g);
    const freeze = keys.has('KeyC') && b.onGround && !b.hiding && !(b.stun > 0) && !c.pointa;
    c.pose = clamp(c.pose + (freeze ? POSE.rise : -POSE.fall) * dt, 0, 1);
    b.dark = !lit(S, c, b.x) && b.x < tail(c) - LOST;
    if (freeze) {
      b.moving = false; b.running = false; b.crouch = false; b.vx = 0;
      b.inv = Math.max(0, b.inv - dt); b.quipCd -= dt;
      if (!c.said.pose) { c.said.pose = true; rules().quip(g, ZS.QUIPS.cave, true); }
      return;
    }
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, 40, S.cave.exit - 40);
  }

  function pointa(g, S, c, dt) {
    const p = c.pointa, b = g.bear, was = p.t;
    p.t += dt;
    Object.assign(b, { x: S.cave.bones - 74, trackX: S.cave.bones - 74, dir: 1, moving: false, hiding: null, crouch: false });
    c.pose = 1;
    if (was < POINTA.line && p.t >= POINTA.line) rules().float(g, c.head - 30, GY - 150, LABELS.cave.guide, COLORS.story);
    if (was < POINTA.puff && p.t >= POINTA.puff) rules().quip(g, ZS.QUIPS.dragon, true);
    if (was < POINTA.flash && p.t >= POINTA.flash) {
      c.flash = 1;
      rules().onSound(g, 'shutter', b.x);
      rules().say(g, NEWS.caveDragon, true);
      g.panic = Math.max(0, g.panic - 8);
    }
    return p.t >= POINTA.end;
  }

  function finish(g, c, result) {
    c.result = result;
    if (result === 'lost') rules().say(g, NEWS.caveLost, true);
    if (result === 'abort') rules().say(g, NEWS.caveAbort, true);
    g.once.caveTour = result;
    return true;
  }

  function update(g, c, dt) {
    const S = g.level, b = g.bear;
    c.t += dt;
    c.flash = Math.max(0, c.flash - dt * 2.5);
    const h = headAt(c.t);
    c.head = h.x; c.moving = h.moving;
    lights(S, c, dt);
    if (c.pointa) return pointa(g, S, c, dt) && finish(g, c, 'dragon');
    current(c);
    if (c.event && c.event.kind === 'flash' && c.t - c.event.at < dt * 1.5) { c.flash = 1; rules().onSound(g, 'shutter', tail(c)); }
    if (c.warn && c.said.warn !== c.warn) { c.said.warn = c.warn; rules().float(g, c.warn.kind === 'flash' ? tail(c) : c.head, GY - 140, LABELS.cave.warn[c.warn.kind], COLORS.zap); }
    control(g, S, c, dt);
    const why = seenBy(S, c, b);
    if (why) caught(g, S, c, why);
    if (c.seen >= SEEN.max) return finish(g, c, 'abort');
    if (c.t >= ROUTE[ROUTE.length - 2][0] && b.x > tail(c) - NEAR && !c.pointa) { c.pointa = { t: 0 }; chopok().quiet(b); return false; }
    if (c.t >= END) return finish(g, c, 'lost');
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
    c.flash = Math.max(0, c.flash - dt * 2.5);
    lights(g.level, c, dt);
  }

  function plan(g) {
    const p = g.chopok && g.chopok.pass;
    return p && p.key === 'cave' && p.phase === 'play' ? p.play : null;
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    if (c.pointa) return;
    const e = c.warn || c.event, end = tail(c);
    if (e && (e.kind === 'cone' || e.kind === 'flash')) {
      const head = headAt(e.at).x, from = e.kind === 'cone' ? head - 10 : head - GROUP.guide - GROUP.n * GROUP.gap - 4, to = from - e.len;
      if (b.x <= to - 20) return;
      const st = S.covers.find((s) => s.x > to + 10 && s.x < from - 40 && Math.abs(s.x - b.x) < 130);
      if (st) {
        if (Math.abs(st.x - b.x) < st.w / 2 + 20) keys.add('ArrowDown');
        else keys.add(st.x > b.x ? 'ArrowRight' : 'ArrowLeft');
        return;
      }
      keys.add('ArrowLeft');
      if (b.x - to > 80) keys.add('ShiftLeft');
      return;
    }
    if (e && e.kind === 'look' && lit(S, c, b.x)) { keys.add('KeyC'); return; }
    const want = end - 200;
    if (b.x < want - 20) keys.add('ArrowRight');
    else if (b.x > want + 20) keys.add('ArrowLeft');
  }

  ZS.sim.cave = { ROUTE, EVENTS, GROUP, DARK, SEEN, POINTA, stage, start, update, idle, members, tail, lit, plan, pilot, headAt };
})();
