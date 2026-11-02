(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const MARMOT = { see: 250, sneak: 115, calm: 320, alarm: 0.6, dive: 0.3, hide: 2.6, peek: 2.4, rise: 0.5 };
  const CHAMOIS = { see: 320, sneak: 160, far: 820, leap: 0.5, rest: 5 };
  const PORTER = { up: 22, down: 44, unload: 7, load: 5, near: 120, said: 14 };
  const HUT = { see: 340, panic: 5, hear: 700 };
  const SCREE = 1.6;

  function rnd(o) {
    o.seed = (o.seed * 16807) % 2147483647;
    return (o.seed - 1) / 2147483646;
  }

  function thicket(L, x) {
    const A = L && L.alpine;
    return !!A && A.thickets.some((t) => x > t[0] - 12 && x < t[1] + 12);
  }

  function route(A) {
    return A.crag.ledges.concat(A.crag.perch);
  }

  function create(L) {
    const A = L.alpine, R = route(A), n = A.crag.ledges.length;
    return {
      marmots: A.marmots.map((m, i) => ({ id: 'marmot' + i, x: m.x, h: m.h, dir: i % 2 ? -1 : 1, state: 'sit', pose: 'sit', t: 1 + i * 1.7, k: 1, seed: 7919 * (i + 3), whistleAt: -99 })),
      chamois: R.slice(0, n).map((p, i) => ({
        id: 'chamois' + i, x: p[0] + (i % 2 ? 6 : -6), h: p[1], at: i, home: i, top: n + (i % A.crag.perch.length), dir: i % 2 ? 1 : -1,
        state: 'graze', t: 1.2 + i * 0.9, leap: null, seed: 4111 * (i + 2), kid: i === n - 1, off: (i % 2 ? 7 : -7), calm: 0, snortAt: -99,
      })),
      porter: { id: 'porter', x: A.porter.from + (A.porter.to - A.porter.from) * 0.18, dir: 1, state: 'up', t: 0, load: true, saidAt: -99, met: false },
      hut: { alarm: 0, seen: false, chat: 0, seed: 7577 },
      said: {}, screeAt: -99,
    };
  }

  function sees(b, d, see, sneak) {
    return !b.covered && d < (b.crouch && !b.running ? sneak : b.running && b.moving ? see * 1.3 : see);
  }

  function whistle(g, m, lead) {
    const b = g.bear, A = g.alpine;
    m.state = 'alarm'; m.pose = 'sit'; m.k = Math.max(m.k, 0.6);
    m.t = MARMOT.alarm + (lead ? 0 : 0.2 + rnd(m) * 0.35);
    m.dir = Math.sign(b.x - m.x) || m.dir;
    if (!lead) return;
    m.whistleAt = g.time;
    rules().onSound(g, 'marmot', m.x);
    rules().float(g, m.x, GY - m.h - 62, LABELS.alpine.whistle, COLORS.story);
    if (!(g.time - A.said.marmot < 45)) { A.said.marmot = g.time; rules().say(g, NEWS.marmot); }
    for (const o of A.marmots) if (o !== m && Math.abs(o.x - m.x) < 420 && (o.state === 'sit' || o.state === 'graze')) whistle(g, o, false);
  }

  function marmot(g, m, dt) {
    const b = g.bear, d = Math.abs(b.x - m.x), threat = !g.ride && sees(b, d, MARMOT.see, MARMOT.sneak);
    m.t -= dt;
    if (m.state === 'sit' || m.state === 'graze') {
      m.k = Math.min(1, m.k + dt / MARMOT.rise);
      if (threat) { whistle(g, m, true); return; }
      if (m.t <= 0) { m.state = m.state === 'sit' ? 'graze' : 'sit'; m.pose = m.state; m.t = 2 + rnd(m) * 4; if (rnd(m) < 0.4) m.dir *= -1; }
    } else if (m.state === 'alarm') {
      m.k = Math.min(1, m.k + dt / MARMOT.rise);
      if (m.t <= 0) { m.state = 'dive'; m.t = 0; }
    } else if (m.state === 'dive') {
      m.k = Math.max(0, m.k - dt / MARMOT.dive);
      if (m.k <= 0) { m.state = 'hidden'; m.t = MARMOT.hide + rnd(m); }
    } else if (m.state === 'hidden') {
      if (d < MARMOT.calm && !b.covered) m.t = Math.max(m.t, MARMOT.hide * 0.5);
      if (m.t <= 0) { m.state = 'peek'; m.t = MARMOT.peek + rnd(m); }
    } else if (m.state === 'peek') {
      m.k += (0.42 - m.k) * Math.min(1, dt * 6);
      m.dir = Math.sign(b.x - m.x) || m.dir;
      if (threat && d < MARMOT.see * 0.8) { m.state = 'dive'; if (g.time - m.whistleAt > 3) { m.whistleAt = g.time; rules().onSound(g, 'marmot', m.x, 'short'); } return; }
      if (m.t <= 0) { m.state = 'sit'; m.pose = 'sit'; m.t = 2.5 + rnd(m) * 2; }
    }
  }

  function jump(c, R, to, slow) {
    const p = R[to], x1 = p[0] + c.off, h1 = p[1];
    c.leap = { x0: c.x, h0: c.h, x1, h1, t: 0, dur: (slow ? 0.62 : CHAMOIS.leap) * (0.92 + 0.16 * rnd(c)), top: Math.max(c.h, h1) + 14 + Math.abs(x1 - c.x) * 0.14, wait: slow ? 0.5 + rnd(c) * 0.6 : 0.06 + rnd(c) * 0.12, to };
    c.dir = Math.sign(x1 - c.x) || c.dir;
  }

  function chamois(g, c, dt, R) {
    const b = g.bear, d = Math.abs(b.x - c.x), threat = !g.ride && sees(b, d, CHAMOIS.see, CHAMOIS.sneak);
    c.t -= dt;
    if (c.leap) {
      const p = c.leap;
      if (p.wait > 0) { p.wait -= dt; c.crouch = 1; return; }
      c.crouch = 0;
      p.t += dt / p.dur;
      const u = Math.min(1, p.t);
      c.x = p.x0 + (p.x1 - p.x0) * u;
      c.h = (1 - u) * (1 - u) * p.h0 + 2 * u * (1 - u) * p.top + u * u * p.h1;
      c.air = u < 1 ? 1 : 0;
      if (u >= 1) { c.at = p.to; c.h = p.h1; c.leap = null; c.land = g.time; scree(g, c.x, 0.6); }
      return;
    }
    if (c.state === 'graze' || c.state === 'look') {
      if (threat && c.state === 'graze') {
        const lead = !g.alpine.chamois.some((o) => o.state === 'look' || o.state === 'flee');
        c.state = 'look'; c.t = lead ? 0.35 : 0.3 + rnd(c) * 0.45; c.dir = Math.sign(b.x - c.x) || c.dir;
        if (lead) {
          c.snortAt = g.time;
          rules().onSound(g, 'chamois', c.x);
          rules().float(g, c.x, GY - c.h - 120, LABELS.alpine.chamois, COLORS.story);
          if (!(g.time - g.alpine.said.chamois < 45)) { g.alpine.said.chamois = g.time; rules().say(g, NEWS.chamois); }
          for (const o of g.alpine.chamois) if (o !== c && o.state === 'graze' && !o.leap) { o.state = 'look'; o.t = 0.35 + rnd(o) * 0.5; o.dir = Math.sign(b.x - o.x) || o.dir; }
        }
        return;
      }
      if (c.state === 'look') { if (c.t <= 0) c.state = 'flee'; return; }
      if (c.t <= 0) { c.t = 2 + rnd(c) * 3; c.dir *= rnd(c) < 0.5 ? -1 : 1; }
      return;
    }
    if (c.state === 'flee') {
      if (c.at >= c.top) { c.state = 'perch'; c.calm = 0; c.dir = Math.sign(b.x - c.x) || -1; return; }
      jump(c, R, c.at + 1 < c.top ? c.at + 1 + (c.at + 2 < c.top && rnd(c) < 0.3 ? 1 : 0) : c.top, false);
      return;
    }
    if (c.state === 'perch') {
      c.dir = Math.sign(b.x - c.x) || c.dir;
      c.calm = d > CHAMOIS.far || g.ride ? c.calm + dt : 0;
      if (c.calm > CHAMOIS.rest) c.state = 'back';
      return;
    }
    if (c.state === 'back') {
      if (threat && d < CHAMOIS.see) { c.state = 'flee'; return; }
      if (c.at <= c.home) { c.state = 'graze'; c.t = 1 + rnd(c) * 2; return; }
      jump(c, R, c.at - 1 > c.home ? c.at - 1 : c.home, true);
    }
  }

  function porter(g, p, dt) {
    const A = g.level.alpine.porter, b = g.bear;
    p.t -= dt;
    if (p.state === 'up') {
      p.dir = 1; p.x += PORTER.up * dt;
      if (p.x >= A.to) { p.x = A.to; p.state = 'unload'; p.t = PORTER.unload; p.load = false; }
    } else if (p.state === 'unload') {
      if (p.t <= 0) { p.state = 'down'; p.dir = -1; }
    } else if (p.state === 'down') {
      p.x -= PORTER.down * dt;
      if (p.x <= A.from) { p.x = A.from; p.state = 'load'; p.t = PORTER.load; }
    } else if (p.state === 'load' && p.t <= 0) {
      p.state = 'up'; p.load = true;
    }
    const d = Math.abs(b.x - p.x);
    if (d < PORTER.near && !b.covered && !g.ride && g.time - p.saidAt > PORTER.said) {
      p.saidAt = g.time;
      const lines = p.load ? LABELS.alpine.porter : LABELS.alpine.porterFree;
      rules().float(g, p.x, GY - 150, lines[Math.floor(Math.random() * lines.length)], COLORS.story);
      if (!p.met) { p.met = true; rules().say(g, NEWS.porter); rules().quip(g, ZS.QUIPS.porter, true); }
    }
  }

  function scree(g, x, k) {
    const s = g.alpine;
    if (g.time - s.screeAt < SCREE) return;
    s.screeAt = g.time;
    rules().onSound(g, 'scree', x, k);
  }

  function steps(g) {
    const b = g.bear, L = g.level, A = L.alpine;
    if (g.ride || b.x < A.line || !b.onGround || b.climbing) return;
    const slab = L.logs.find((l) => l.rock && Math.abs(b.x - l.x) < l.w / 2 + 10);
    if (slab && b.y < GY - 4 && b.prevY !== undefined && b.prevY < b.y - 0.5) scree(g, b.x, 0.8);
    else if (b.moving && b.running && !thicket(L, b.x)) scree(g, b.x, 0.5);
  }

  function hut(g, h, dt) {
    const H = g.level.alpine.hut, b = g.bear, d = Math.abs(b.x - H.x);
    h.chat -= dt;
    if (h.chat <= 0 && d < HUT.hear && !g.ride) { h.chat = 6 + rnd(h) * 4; rules().onSound(g, 'hut', H.x - 210); }
    const on = !b.covered && d < HUT.see && !g.ride;
    h.alarm = Math.max(0, Math.min(1, h.alarm + (on ? dt * 2.5 : -dt * 0.4)));
    if (on && !h.seen) {
      h.seen = true;
      rules().spotted(g, H.x - 60, GY - 170, LABELS.alpine.terrace);
      rules().addPanic(g, HUT.panic, NEWS.hut);
    }
  }

  function cover(g) {
    const L = g.level, b = g.bear;
    const on = thicket(L, b.x) && b.onGround && !b.climbing && !b.act && !(b.stun > 0);
    if (on && b.crouch) b.covered = true;
    b.thicket = on && !b.covered;
    if (on && b.crouch && !g.once.kosodrevina) {
      g.once.kosodrevina = true;
      rules().float(g, b.x, GY - 110, LABELS.alpine.cover, COLORS.good);
      rules().quip(g, ZS.QUIPS.kosodrevina, true);
      rules().say(g, NEWS.kosodrevina);
    }
  }

  function update(g, dt) {
    const L = g.level, A = L.alpine;
    if (!A) return;
    const s = g.alpine || (g.alpine = create(L)), b = g.bear;
    if (!g.once.alpine && b.x > A.line && !g.ride) {
      g.once.alpine = true;
      rules().say(g, NEWS.alpine);
      rules().quip(g, ZS.QUIPS.alpine, true);
    }
    if (!g.once.altitude && b.x > A.lake.from && !g.ride) {
      g.once.altitude = true;
      rules().say(g, NEWS.altitude);
      rules().quip(g, ZS.QUIPS.altitude, true);
    }
    cover(g);
    steps(g);
    for (const m of s.marmots) marmot(g, m, dt);
    const R = route(A);
    for (const c of s.chamois) chamois(g, c, dt, R);
    porter(g, s.porter, dt);
    hut(g, s.hut, dt);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.alpine = { update, thicket, create, route, MARMOT, CHAMOIS, PORTER };
})();
