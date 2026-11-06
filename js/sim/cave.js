(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const TOUR = { from: 700, speed: 100, len: 220, light: 220, gone: -260, trigger: 260, wait: 8, delay: 2.4, warn: 3, near: 40 };
  const COUNT = { per: 0.22, reach: 48 };
  const NOISE = { run: 240, land: 150, splash: 280 };
  const SEEN = { panic: 8, big: 25, flash: 0.6 };
  const ALERT = { panic: 4, fill: 3, near: 2, fall: 0.3, stop: 0.25, calm: 0.04, slow: 0.55, wider: 70, block: 34, lost: 1.6 };
  const SINK = { t: 0.8, depth: 34, safe: 2, panic: 15, bank: 40, stun: 0.6 };
  const LAMP = { reach: 34, range: 280 };
  const FLOCK = { fly: 2.2, away: 7, back: 1.6, hang: 290 };
  const STONE = 30, END = 180, REAR = 0.72, LEDGE = 90, LEAP = 118;
  const ROOF = GY - 330, HEAD = 90, LOW = GY - 70, SLOPE = 50;

  function roofY(x) {
    const H = ZS.levelKit.CAVE.hall, k = x > H[0] && x < H[1] ? Math.sin((Math.PI * (x - H[0])) / (H[1] - H[0])) : 0;
    return ROOF - 120 * k + 26 * Math.sin(x * 0.006) + 18 * Math.sin(x * 0.017 + 1.3) + 10 * Math.sin(x * 0.043);
  }

  const asleep = (c) => c.bats.some((o) => o.state === 'sleep' && o.counted < o.n && !o.woke);

  function ledgeAhead(S, b) {
    const d = b.dir < 0 ? -1 : 1;
    return S.logs.find((l) => {
      const edge = d > 0 ? l.x - l.w / 2 - b.x : b.x - (l.x + l.w / 2);
      return edge > -4 && edge < LEDGE && b.y > GY - l.h + 2;
    }) || null;
  }

  function curve(x, x0, y0, x1, y1, x2, y2) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 18; i++) {
      const t = (lo + hi) / 2, u = 1 - t;
      if (u * u * x0 + 2 * u * t * x1 + t * t * x2 < x) lo = t; else hi = t;
    }
    const t = (lo + hi) / 2, u = 1 - t;
    return u * u * y0 + 2 * u * t * y1 + t * t * y2;
  }

  function ceiling(S, x) {
    for (const [a, z] of S.cave.low) {
      if (x >= a && x <= z) return LOW;
      if (x > a - SLOPE && x < a) return curve(x, a - SLOPE, roofY(a - SLOPE), a - 30, LOW - 42, a, LOW + 2);
      if (x > z && x < z + SLOPE) return curve(x, z, LOW - 2, z + 30, LOW - 42, z + SLOPE, roofY(z + SLOPE));
    }
    return roofY(x);
  }

  function stage() {
    const S = ZS.levelKit.caveStage();
    S.start = S.cave.start;
    return S;
  }

  function start(g, S, again) {
    const c = {
      t: 0, guide: TOUR.from, go: null, warn: false, alert: null, suspect: false, sus: 0, lost: null, back: 0, pose: false, lamp: false, flash: 0, seen: 0, said: {}, result: null, count: null, wet: 0, air: false, bonk: 0, safe: 0, sink: null,
      bats: S.cave.colonies.map(([x, n], i) => ({ id: i, x, n, counted: 0, state: 'sleep', k: 0, t: 0 })),
    };
    c.total = c.bats.reduce((a, o) => a + o.n, 0);
    if (!again) rules().say(g, NEWS.caveTour, true);
    return c;
  }

  const low = (S, x, m) => S.cave.low.find(([a, z]) => x > a - (m || 0) && x < z + (m || 0)) || null;
  const counted = (c) => c.bats.reduce((a, o) => a + o.counted, 0);
  const tourOn = (c) => c.go !== null && c.guide > TOUR.gone;
  const walking = (c) => tourOn(c) && c.t - c.go >= TOUR.delay;
  const water = (S, x) => x > S.cave.water[0] && x < S.cave.water[1] && !S.cave.stones.some((s) => Math.abs(s - x) < STONE);
  const wild = (S, x) => x > S.cave.gap;
  const next = (S, b) => S.cave.stones.concat(S.cave.water[1] + 60).find((s) => s > b.x + STONE);
  const leap = (S, b, m) => { const W = S.cave.water, to = next(S, b); return !!to && b.x > W[0] - 2 * LEAP && b.x < W[1] && b.x >= to - LEAP - m; };

  function wake(g, c, o) {
    if (o.state !== 'sleep') return;
    o.state = 'fly'; o.t = 0; o.woke = true;
    rules().onSound(g, 'marmot', o.x, 0.6);
    if (o.counted < o.n) rules().float(g, o.x, GY - 190, LABELS.cave.woke, COLORS.bad);
    if (!c.said.woke) { c.said.woke = true; rules().say(g, NEWS.caveWoke); }
  }

  function noise(g, c, x, r) {
    for (const o of c.bats) if (Math.abs(o.x - x) < r) wake(g, c, o);
  }

  function counting(g, S, c, dt) {
    const b = g.bear, keys = g.input.keys;
    c.pose = false;
    if (!keys.has('KeyC') || !b.onGround || b.hiding || b.crouch || b.stun > 0 || low(S, b.x, 50)) { c.count = null; return false; }
    const o = c.bats.find((q) => q.state === 'sleep' && q.counted < q.n && Math.abs(q.x - b.x) < COUNT.reach);
    if (!o) {
      c.count = null;
      if (wild(S, b.x)) return false;
      c.pose = true;
      if (!c.said.pose) { c.said.pose = true; rules().quip(g, ZS.QUIPS.stalag, true); }
      b.moving = false; b.running = false; b.vx = 0;
      b.inv = Math.max(0, b.inv - dt); b.quipCd -= dt;
      return true;
    }
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

  function bonk(g, S, c, b, dt) {
    c.bonk = Math.max(0, c.bonk - dt);
    if (b.onGround) return;
    const d = b.dir < 0 ? -1 : 1, top = Math.max(ceiling(S, b.x), ceiling(S, b.x + d * 24), ceiling(S, b.x + d * 50)) + HEAD;
    if (b.y >= top) return;
    b.y = top;
    if (b.vy < 0) {
      b.vy = 60;
      if (c.bonk <= 0) {
        c.bonk = 1.2;
        rules().float(g, b.x + d * 30, top - HEAD - 6, LABELS.cave.bonk, COLORS.story);
        rules().onSound(g, 'thud', b.x, 0.5);
      }
    }
  }

  function hurt(g, b, panic) {
    if (g.lives <= 1) { rules().addPanic(g, panic); return; }
    g.lives -= 1;
    rules().onSound(g, 'hit', b.x);
    rules().float(g, b.x, GY - 160, LABELS.hit(g.lives), COLORS.shot);
  }

  function river(g, S, c, b) {
    if (!b.onGround) { c.air = true; return; }
    if (c.air) { c.air = false; if (b.x > S.cave.water[0] && b.x < S.cave.water[1]) noise(g, c, b.x, NOISE.land); }
    if (!water(S, b.x)) return;
    c.wet++;
    chopok().quiet(b);
    c.sink = { t: 0, x: b.x };
    rules().float(g, b.x, GY - 120, LABELS.cave.splash, COLORS.bad);
    rules().onSound(g, 'splash', b.x, 1);
    noise(g, c, S.cave.water[0], NOISE.splash);
    if (!c.said.splash) { c.said.splash = true; rules().quip(g, ZS.QUIPS.splash, true); }
  }

  function sinking(g, S, c, dt) {
    const b = g.bear, k = c.sink;
    k.t += dt;
    Object.assign(b, { moving: false, running: false, vx: 0, vy: 0, onGround: true, y: GY + SINK.depth * Math.min(1, k.t / SINK.t) });
    b.quipCd -= dt;
    if (k.t < SINK.t) return;
    c.sink = null;
    const x = S.cave.water[0] - SINK.bank;
    Object.assign(b, { x, trackX: x, y: GY, dir: 1, kx: 0, stun: SINK.stun });
    hurt(g, b, SINK.panic);
    c.safe = SINK.safe;
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
    if (c.sink) { sinking(g, S, c, dt); return; }
    if (counting(g, S, c, dt)) return;
    const was = b.x;
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, 40, c.lamp ? S.cave.exit : S.cave.gap - 10);
    block(S, c, b, was);
    if (b.hiding && b.hiding.stalag && tourOn(c)) b.peekSide = c.guide > b.x ? -1 : 1;
    if (!c.lamp && b.x >= S.cave.gap - 12 && !c.said.dark) { c.said.dark = true; rules().float(g, b.x, GY - 130, LABELS.cave.dark, COLORS.story); }
    bonk(g, S, c, b, dt);
    river(g, S, c, b);
    lamp(g, S, c, b);
    b.helmet = c.lamp;
    if (b.running && b.moving && wild(S, b.x)) noise(g, c, b.x, NOISE.run);
    if (!c.said.bones && Math.abs(b.x - S.cave.bones) < 90) { c.said.bones = true; rules().quip(g, ZS.QUIPS.dragon, true); }
    const stop = S.cave.exit - 40;
    if (b.x > stop && asleep(c)) {
      b.x = stop; b.trackX = Math.min(b.trackX, stop); b.vx = 0;
      if (g.time - (c.leftAt || -9) > 3) { c.leftAt = g.time; rules().float(g, b.x, GY - 150, LABELS.cave.left, COLORS.story); }
    }
  }

  function sees(S, c, b) {
    if (wild(S, b.x) || c.guide + TOUR.len <= b.x || (b.hiding && b.hiding.hide) || c.pose) return false;
    const reach = TOUR.light + (c.suspect ? ALERT.wider : 0), lit = walking(c) || c.alert;
    return b.x >= c.guide - TOUR.near || (lit && b.x < c.guide && b.x > c.guide - reach);
  }

  function lose(g, c, b) {
    c.lost = { t: 0 }; c.alert = null; c.warn = false;
    chopok().quiet(b);
    rules().float(g, b.x, GY - 170, LABELS.cave.lost, COLORS.bad);
    rules().onSound(g, 'scream', b.x, 0.8);
    rules().addPanic(g, SEEN.big);
    rules().say(g, NEWS.caveLost, true);
  }

  function restart(g, S, c) {
    const b = g.bear, again = (c.restarts || 0) + 1;
    Object.assign(c, start(g, S, true), { restarts: again, back: 1 });
    chopok().quiet(b);
    Object.assign(b, { x: S.start, trackX: S.start, dir: 1, stun: 0, hiding: null, helmet: false, rear: 0, inv: 1 });
  }

  function tour(g, S, c, dt) {
    const b = g.bear;
    if (c.go === null) {
      if (b.x > TOUR.trigger || c.t > TOUR.wait) c.go = c.t;
      return;
    }
    if (c.guide <= TOUR.gone) { c.warn = false; c.alert = null; c.sus = Math.max(0, c.sus - ALERT.fall * dt); return; }
    const see = sees(S, c, b);
    if (see) {
      c.sus = Math.min(1, c.sus + (dt * (b.x >= c.guide - TOUR.near - 60 ? ALERT.near : 1)) / ALERT.fill);
      rules().addPanic(g, ALERT.panic * dt);
    } else c.sus = Math.max(0, c.sus - ALERT.fall * dt);
    if (c.sus >= 1) { lose(g, c, b); return; }
    if (!c.alert && see && c.sus >= ALERT.stop) {
      c.alert = { doubt: 0 };
      c.seen++; c.flash = SEEN.flash;
      rules().spotted(g, b.x, GY - 130, LABELS.cave.seen);
      rules().float(g, c.guide + 110, GY - 165, LABELS.cave.film, COLORS.zap);
      rules().onSound(g, 'scream', b.x, 0.7);
      rules().addPanic(g, SEEN.panic);
      if (!c.said.seen) { c.said.seen = true; rules().say(g, NEWS.caveSeen, true); }
    }
    if (c.alert) {
      c.warn = false;
      c.alert.doubt = see ? 0 : c.alert.doubt + dt;
      if (!see && c.sus <= ALERT.calm) {
        c.alert = null; c.suspect = true;
        rules().float(g, c.guide + 40, GY - 165, LABELS.cave.doubt, COLORS.story);
      }
      return;
    }
    if (walking(c)) c.guide -= TOUR.speed * (c.suspect ? ALERT.slow : 1) * dt;
    const hidden = (b.hiding && b.hiding.hide) || c.pose;
    const ahead = !wild(S, b.x) && c.guide + TOUR.len > b.x;
    const eta = (c.guide - TOUR.light - b.x) / (TOUR.speed + Math.max(0, b.vx));
    c.warn = ahead && !hidden && (!walking(c) || eta < TOUR.warn);
  }

  function block(S, c, b, was) {
    const edge = c.guide - ALERT.block, prev = c.edge === undefined ? edge : c.edge;
    c.edge = edge;
    if (!tourOn(c) || wild(S, b.x) || (b.hiding && b.hiding.hide) || c.pose) return;
    if (was <= prev + 1 && b.x > edge) { b.x = edge; b.trackX = Math.min(b.trackX, edge); b.vx = 0; }
  }



  function bats(g, c, dt) {
    for (const o of c.bats) {
      if (o.state !== 'fly' && o.state !== 'away' && o.state !== 'back') continue;
      o.t += dt;
      if (o.state === 'fly' && o.t > FLOCK.fly) { o.state = 'away'; o.t = 0; }
      else if (o.state === 'away' && o.t > FLOCK.away) { o.state = 'back'; o.t = 0; }
      else if (o.state === 'back' && o.t > FLOCK.back) {
        Object.assign(o, { state: 'sleep', t: 0, counted: 0, k: 0 });
        rules().float(g, o.x, GY - 210, LABELS.cave.home, COLORS.story);
      }
    }
  }

  function finish(g, c) {
    const n = counted(c);
    c.result = n >= c.total ? 'all' : n * 2 >= c.total ? 'some' : 'few';
    rules().say(g, c.result === 'all' ? NEWS.caveAll : c.result === 'some' ? NEWS.caveSome : NEWS.caveNone, true);
    g.panic = Math.max(0, g.panic - Math.round(n / 4));
    g.once.caveTour = { counted: n, of: c.total };
    g.bear.helmet = false;
    g.bear.rear = 0;
    return true;
  }

  function update(g, c, dt) {
    const S = g.level, b = g.bear;
    c.t += dt;
    c.back = Math.max(0, c.back - dt * 1.5);
    if (c.lost) {
      c.lost.t += dt; b.moving = false; b.vx = 0;
      if (c.lost.t >= ALERT.lost) restart(g, S, c);
      return false;
    }
    c.safe = Math.max(0, c.safe - dt);
    b.rear = (b.rear || 0) + ((c.count ? REAR : 0) - (b.rear || 0)) * Math.min(1, dt * 7);
    c.flash = Math.max(0, c.flash - dt * 2.5);
    bats(g, c, dt);
    tour(g, S, c, dt);
    control(g, S, c, dt);
    if (c.safe > 0) b.inv = Math.max(b.inv, c.safe);
    if (b.x >= S.cave.exit - 4 || c.t >= END) return finish(g, c);
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
    c.flash = Math.max(0, c.flash - dt * 2.5);
    bats(g, c, dt);
  }

  function plan(g) {
    const p = g.chopok && g.chopok.pass;
    return p && p.key === 'cave' && p.phase === 'play' ? p.play : null;
  }

  function hint(g, c) {
    const b = g.bear, S = g.level;
    if (!b.onGround || b.stun > 0 || c.count || c.sink) return null;
    if (low(S, b.x, 90) && !b.crouch) return 'crawl';
    if (ledgeAhead(S, b)) return 'climb';
    if (leap(S, b, 25)) return 'jump';
    if (c.bats.some((q) => q.state === 'sleep' && q.counted < q.n && Math.abs(q.x - b.x) < COUNT.reach)) return 'count';
    if (c.pose) return null;
    if (c.sus > 0.02 || c.alert || c.warn || (!wild(S, b.x) && tourOn(c) && c.guide - b.x < 600 && c.guide + TOUR.len > b.x)) return 'hide';
    return null;
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    if (!wild(S, b.x) && tourOn(c) && c.guide + TOUR.len > b.x - 40) {
      if (b.hiding && b.hiding.stalag) { keys.add('ArrowDown'); return; }
      const wait = Math.max(0, TOUR.delay - (c.t - c.go));
      const ok = (s) => {
        const xa = s.x - s.w / 2 - 14, k = Math.max(0, xa - b.x) / CFG.WALK + 0.3, at = c.guide - TOUR.speed * Math.max(0, k - wait);
        return xa < at - TOUR.near - 20 && (k < wait || xa < at - TOUR.light - 10);
      };
      const st = S.covers.filter((s) => s.x < S.cave.gap && ok(s)).reduce((p, s) => (!p || s.x > p.x ? s : p), null);
      if (c.guide - b.x < 520 && st) {
        if (Math.abs(st.x - b.x) < st.w / 2 + 14) keys.add('ArrowDown');
        else keys.add(st.x > b.x ? 'ArrowRight' : 'ArrowLeft');
        return;
      }
      if (c.guide - b.x < 520) { keys.add('ArrowLeft'); return; }
    }
    if (c.bats.some((q) => q.state === 'sleep' && q.counted < q.n && Math.abs(q.x - b.x) < COUNT.reach - 8)) { keys.add('KeyC'); return; }
    keys.add('ArrowRight');
    if (low(S, b.x, 70)) keys.add('ArrowDown');
    if (b.onGround && ledgeAhead(S, b) && !low(S, b.x, 60)) { g.input.jumpPressed = true; g.input.jumpKey = 'Space'; }
    if (b.onGround && b.y > GY - 5 && leap(S, b, 0)) { g.input.jumpPressed = true; g.input.jumpKey = 'Space'; }
  }

  ZS.sim.cave = { TOUR, ALERT, FLOCK, COUNT, LAMP, SINK, LEAP, stage, start, update, idle, low, water, wild, counted, plan, pilot, hint, tourOn, walking, roofY, ceiling };
})();
