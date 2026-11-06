(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp, lerp, smooth } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const ROUTE = [[0, -560], [8, -120], [14, 260], [19, 260], [27, 820], [32, 820], [40, 1380], [45, 1380], [55, 2080], [59, 2080], [72, 2960]];
  const LIGHT = { back: 300, ahead: 50 };
  const COUNT = { per: 0.22, reach: 48 };
  const NOISE = { run: 240, bump: 320 };
  const SEEN = { cool: 3, ahead: 190, stun: 0.45, panic: 10 };
  const BUMP = { stun: 0.4, back: 26 };
  const END = 74;

  function stage() {
    const S = ZS.levelKit.caveStage();
    S.start = S.cave.start;
    return S;
  }

  function start(g, S) {
    const c = {
      t: 0, front: ROUTE[0][1], moving: false, flash: 0, seen: 0, seenAt: -99, bumpAt: -99, said: {}, result: null, count: null,
      bats: S.cave.colonies.map(([x, n], i) => ({ id: i, x, n, counted: 0, state: 'sleep', k: 0, t: 0 })),
    };
    c.total = c.bats.reduce((a, o) => a + o.n, 0);
    rules().say(g, NEWS.caveTour, true);
    return c;
  }

  function frontAt(t) {
    for (let i = 1; i < ROUTE.length; i++) {
      const [t0, x0] = ROUTE[i - 1], [t1, x1] = ROUTE[i];
      if (t <= t1) return { x: lerp(x0, x1, smooth(clamp((t - t0) / (t1 - t0 || 1), 0, 1))), moving: x1 !== x0 && t > t0 };
    }
    return { x: ROUTE[ROUTE.length - 1][1], moving: false };
  }

  const lit = (c, x) => x > c.front - LIGHT.back && x < c.front + LIGHT.ahead;
  const low = (S, x, m) => S.cave.low.find(([a, z]) => x > a - (m || 0) && x < z + (m || 0)) || null;
  const counted = (c) => c.bats.reduce((a, o) => a + o.counted, 0);

  function wake(g, c, o, why) {
    if (o.state !== 'sleep') return;
    o.state = 'fly'; o.t = 0;
    rules().onSound(g, 'marmot', o.x, 0.6);
    if (o.counted < o.n) rules().float(g, o.x, GY - 190, LABELS.cave.woke, COLORS.bad);
    if (why === 'bear' && !c.said.woke) { c.said.woke = true; rules().say(g, NEWS.caveWoke); }
  }

  function noise(g, c, x, r) {
    for (const o of c.bats) if (Math.abs(o.x - x) < r) wake(g, c, o, 'bear');
  }

  function counting(g, S, c, dt) {
    const b = g.bear, keys = g.input.keys;
    if (!keys.has('KeyC') || !b.onGround || b.hiding || b.crouch || b.stun > 0 || low(S, b.x, 10)) { c.count = null; return false; }
    const o = c.bats.find((q) => q.state === 'sleep' && q.counted < q.n && Math.abs(q.x - b.x) < COUNT.reach);
    if (!o) { c.count = null; return false; }
    c.count = o;
    o.k += dt / COUNT.per;
    while (o.k >= 1 && o.counted < o.n) { o.k -= 1; o.counted++; rules().onSound(g, 'rub', o.x, 0.3); }
    if (o.counted >= o.n) {
      o.state = 'done'; o.k = 0; c.count = null;
      rules().float(g, o.x, GY - 200, LABELS.cave.done, COLORS.good);
      g.panic = Math.max(0, g.panic - 2);
      if (!c.said.first) { c.said.first = true; rules().quip(g, ZS.QUIPS.bats, true); }
    }
    b.moving = false; b.running = false; b.vx = 0; b.dir = 1;
    b.inv = Math.max(0, b.inv - dt); b.quipCd -= dt;
    return true;
  }

  function control(g, S, c, dt) {
    const b = g.bear;
    chopok().clearPresses(g);
    if (counting(g, S, c, dt)) return;
    const was = b.x;
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, 40, S.cave.exit);
    const p = low(S, b.x, -10);
    if (p && !b.crouch && b.onGround && g.time - c.bumpAt > 0.5) {
      c.bumpAt = g.time;
      const side = was < p[0] + (p[1] - p[0]) / 2 ? -1 : 1;
      Object.assign(b, { x: side < 0 ? p[0] - BUMP.back : p[1] + BUMP.back, stun: BUMP.stun, kx: side * 60 });
      b.trackX = b.x;
      rules().float(g, b.x, GY - 120, LABELS.cave.bump, COLORS.bad);
      rules().onSound(g, 'thud', b.x, 0.8);
      noise(g, c, b.x, NOISE.bump);
      if (!c.said.bump) { c.said.bump = true; rules().quip(g, ZS.QUIPS.crawl, true); }
    }
    if (b.running && b.moving) noise(g, c, b.x, NOISE.run);
    if (!c.said.bones && Math.abs(b.x - S.cave.bones) < 90) { c.said.bones = true; rules().quip(g, ZS.QUIPS.dragon, true); }
  }

  function tour(g, S, c) {
    for (const o of c.bats) if (o.state === 'sleep' && o.x < c.front - 30 && o.x > c.front - LIGHT.back) wake(g, c, o, 'tour');
    const b = g.bear;
    if (!lit(c, b.x) || (b.hiding && b.hiding.hide) || g.time - c.seenAt < SEEN.cool) return;
    c.seenAt = g.time; c.seen++; c.flash = 1;
    rules().spotted(g, b.x, GY - 130, LABELS.cave.seen);
    rules().addPanic(g, SEEN.panic);
    rules().onSound(g, 'scream', b.x, 0.7);
    if (!c.said.seen) { c.said.seen = true; rules().say(g, NEWS.caveSeen, true); }
    chopok().quiet(b);
    Object.assign(b, { x: Math.min(S.cave.exit - 20, c.front + SEEN.ahead), stun: SEEN.stun, kx: 80, dir: 1 });
    b.trackX = b.x;
    noise(g, c, b.x, NOISE.run);
  }

  function bats(c, dt) {
    for (const o of c.bats) if (o.state === 'fly') { o.t += dt; if (o.t > 2.2) o.state = 'gone'; }
  }

  function finish(g, c) {
    const n = counted(c);
    c.result = n >= c.total ? 'all' : n * 2 >= c.total ? 'some' : 'few';
    rules().say(g, c.result === 'all' ? NEWS.caveAll : c.result === 'some' ? NEWS.caveSome : NEWS.caveNone, true);
    g.panic = Math.max(0, g.panic - Math.round(n / 4));
    g.once.caveTour = { counted: n, of: c.total };
    return true;
  }

  function update(g, c, dt) {
    const S = g.level, b = g.bear;
    c.t += dt;
    c.flash = Math.max(0, c.flash - dt * 2.5);
    const f = frontAt(c.t);
    c.front = f.x; c.moving = f.moving;
    bats(c, dt);
    control(g, S, c, dt);
    tour(g, S, c);
    if (b.x >= S.cave.exit - 4 || c.t >= END) return finish(g, c);
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
    c.flash = Math.max(0, c.flash - dt * 2.5);
    bats(c, dt);
  }

  function plan(g) {
    const p = g.chopok && g.chopok.pass;
    return p && p.key === 'cave' && p.phase === 'play' ? p.play : null;
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    const gap = b.x - c.front;
    const o = c.bats.find((q) => q.state === 'sleep' && q.counted < q.n && q.x > b.x - 30 && q.x - c.front > 90);
    const p = low(S, b.x, 40);
    if (gap < 70) {
      const st = S.covers.find((s) => Math.abs(s.x - b.x) < 110);
      if (st && gap > -LIGHT.back) { if (Math.abs(st.x - b.x) < st.w / 2 + 16) keys.add('ArrowDown'); else keys.add(st.x > b.x ? 'ArrowRight' : 'ArrowLeft'); return; }
    }
    if (o && Math.abs(o.x - b.x) < COUNT.reach - 8 && (o.x - c.front > 60)) { keys.add('KeyC'); return; }
    keys.add('ArrowRight');
    if (p) keys.add('ArrowDown');
  }

  ZS.sim.cave = { ROUTE, LIGHT, COUNT, stage, start, update, idle, frontAt, lit, low, counted, plan, pilot };
})();
