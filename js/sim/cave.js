(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const TOUR = { start: 1.2, from: 1080, speed: 52, len: 220, light: 250, gone: -260 };
  const COUNT = { per: 0.22, reach: 48 };
  const NOISE = { run: 240, land: 150, splash: 280 };
  const SEEN = { cool: 3, stun: 0.5, panic: 8, back: 160 };
  const LAMP = { reach: 34, range: 280 };
  const STONE = 30, END = 120;

  function stage() {
    const S = ZS.levelKit.caveStage();
    S.start = S.cave.start;
    return S;
  }

  function start(g, S) {
    const c = {
      t: 0, guide: TOUR.from, lamp: false, flash: 0, seen: 0, seenAt: -99, said: {}, result: null, count: null, wet: 0, air: false, blocked: null,
      bats: S.cave.colonies.map(([x, n], i) => ({ id: i, x, n, counted: 0, state: 'sleep', k: 0, t: 0 })),
    };
    c.total = c.bats.reduce((a, o) => a + o.n, 0);
    rules().say(g, NEWS.caveTour, true);
    return c;
  }

  const low = (S, x, m) => S.cave.low.find(([a, z]) => x > a - (m || 0) && x < z + (m || 0)) || null;
  const counted = (c) => c.bats.reduce((a, o) => a + o.counted, 0);
  const tourOn = (c) => c.t >= TOUR.start && c.guide > TOUR.gone;
  const water = (S, x) => x > S.cave.water[0] && x < S.cave.water[1] && !S.cave.stones.some((s) => Math.abs(s - x) < STONE);
  const wild = (S, x) => x > S.cave.gap;

  function wake(g, c, o) {
    if (o.state !== 'sleep') return;
    o.state = 'fly'; o.t = 0;
    rules().onSound(g, 'marmot', o.x, 0.6);
    if (o.counted < o.n) rules().float(g, o.x, GY - 190, LABELS.cave.woke, COLORS.bad);
    if (!c.said.woke) { c.said.woke = true; rules().say(g, NEWS.caveWoke); }
  }

  function noise(g, c, x, r) {
    for (const o of c.bats) if (Math.abs(o.x - x) < r) wake(g, c, o);
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

  function ceiling(g, S, c, b, was) {
    const p = low(S, b.x, -6);
    c.blocked = null;
    if (!p || b.crouch || !b.onGround) return;
    if (!c.said.crawl) { c.said.crawl = true; rules().quip(g, ZS.QUIPS.crawl, true); }
    const left = was <= p[0] + (p[1] - p[0]) / 2;
    b.x = left ? p[0] - 6 : p[1] + 6;
    b.vx = 0; b.trackX = b.x;
    c.blocked = p;
  }

  function river(g, S, c, b) {
    if (!b.onGround) { c.air = true; return; }
    if (c.air) { c.air = false; if (b.x > S.cave.water[0] - 40 && b.x < S.cave.water[1] + 40) noise(g, c, b.x, NOISE.land); }
    if (!water(S, b.x)) return;
    c.wet++;
    chopok().quiet(b);
    Object.assign(b, { x: S.cave.water[0] - 30, trackX: S.cave.water[0] - 30, stun: 0.5, dir: 1 });
    rules().float(g, b.x, GY - 120, LABELS.cave.splash, COLORS.bad);
    rules().onSound(g, 'splash', b.x, 1);
    noise(g, c, S.cave.water[0], NOISE.splash);
    if (!c.said.splash) { c.said.splash = true; rules().quip(g, ZS.QUIPS.splash, true); }
  }

  function lamp(g, S, c, b) {
    if (c.lamp || Math.abs(b.x - S.cave.lamp) > LAMP.reach) return;
    c.lamp = true;
    rules().float(g, b.x, GY - 140, LABELS.cave.lamp, COLORS.good);
    rules().onSound(g, 'rub', b.x, 0.6);
    rules().quip(g, ZS.QUIPS.lamp, true);
  }

  function control(g, S, c, dt) {
    const b = g.bear;
    g.input.hugPressed = false; g.input.bitePressed = false;
    if (counting(g, S, c, dt)) return;
    const was = b.x;
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, 40, c.lamp ? S.cave.exit : S.cave.gap - 10);
    if (!c.lamp && b.x >= S.cave.gap - 12 && !c.said.dark) { c.said.dark = true; rules().float(g, b.x, GY - 130, LABELS.cave.dark, COLORS.story); }
    ceiling(g, S, c, b, was);
    river(g, S, c, b);
    lamp(g, S, c, b);
    if (b.running && b.moving && wild(S, b.x)) noise(g, c, b.x, NOISE.run);
    if (!c.said.bones && Math.abs(b.x - S.cave.bones) < 90) { c.said.bones = true; rules().quip(g, ZS.QUIPS.dragon, true); }
  }

  function tour(g, S, c, dt) {
    if (c.t < TOUR.start || c.guide <= TOUR.gone) return;
    c.guide -= TOUR.speed * dt;
    const b = g.bear;
    if (wild(S, b.x) || (b.hiding && b.hiding.hide) || g.time - c.seenAt < SEEN.cool) return;
    const inLight = b.x < c.guide && b.x > c.guide - TOUR.light;
    const inGroup = b.x >= c.guide && b.x < c.guide + TOUR.len;
    if (!inLight && !inGroup) return;
    c.seenAt = g.time; c.seen++; c.flash = 1;
    rules().spotted(g, b.x, GY - 130, LABELS.cave.seen);
    rules().addPanic(g, SEEN.panic);
    rules().onSound(g, 'scream', b.x, 0.7);
    if (!c.said.seen) { c.said.seen = true; rules().say(g, NEWS.caveSeen, true); }
    chopok().quiet(b);
    Object.assign(b, { x: Math.max(60, c.guide - TOUR.light - SEEN.back), stun: SEEN.stun, dir: -1 });
    b.trackX = b.x;
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
    bats(c, dt);
    tour(g, S, c, dt);
    control(g, S, c, dt);
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

  function hint(g, c) {
    const b = g.bear, S = g.level;
    if (!b.onGround || b.stun > 0 || c.count) return null;
    if (low(S, b.x, 90) && !b.crouch) return 'crawl';
    if (b.x > S.cave.water[0] - 110 && b.x < S.cave.water[1] - 10) return 'jump';
    if (c.bats.some((q) => q.state === 'sleep' && q.counted < q.n && Math.abs(q.x - b.x) < COUNT.reach)) return 'count';
    if (!wild(S, b.x) && tourOn(c) && c.guide - b.x < 600 && c.guide + TOUR.len > b.x) return 'hide';
    return null;
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    if (!wild(S, b.x) && tourOn(c) && c.guide + TOUR.len > b.x - 40) {
      const st = S.covers.find((s) => s.x < S.cave.gap && Math.abs(s.x - b.x) < 160);
      if (c.guide - b.x < 520 && st) {
        if (Math.abs(st.x - b.x) < st.w / 2 + 14) keys.add('ArrowDown');
        else keys.add(st.x > b.x ? 'ArrowRight' : 'ArrowLeft');
        return;
      }
      if (c.guide - b.x < 520) { keys.add('ArrowLeft'); return; }
    }
    if (c.bats.some((q) => q.state === 'sleep' && q.counted < q.n && Math.abs(q.x - b.x) < COUNT.reach - 8)) { keys.add('KeyC'); return; }
    keys.add('ArrowRight');
    if (low(S, b.x, 40)) keys.add('ArrowDown');
    const W = S.cave.water;
    if (b.onGround && ((b.x > W[0] - 56 && b.x < W[0] - 26) || S.cave.stones.some((s) => b.x > s - 10 && b.x < s + STONE))) { g.input.jumpPressed = true; g.input.jumpKey = 'Space'; }
  }

  ZS.sim.cave = { TOUR, COUNT, LAMP, stage, start, update, idle, low, water, wild, counted, plan, pilot, hint };
})();
