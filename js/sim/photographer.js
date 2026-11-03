(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const POSE = 2.9, FIRE = 0.62, SNAP = 1.5, CATCH = 0.3, LET = 2.5, REST = 40, VIEW = 640, GAP = 0.11, HOLD = 44;
  const CLOSE = 170, WAKE = 1400, HELLO = 30, BEHIND = 24;

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function create(g) {
    const s = g.level.photographer;
    return {
      kind: 'photographer', x: s.x, face: s.dir, dir: s.dir, react: null, reactT: 0, hugK: 0, bitK: 0, hugBy: null, lock: 0,
      burstT: 9, frames: 0, clicked: 0, loud: false, idle: 2.5, readyAt: 0, poses: 0, thrill: 0, liftX: s.x, helloAt: -99, closeAt: -99,
    };
  }

  function shout(g, p, text) {
    const x = Math.max(g.cam + 90, Math.min(g.cam + g.viewW - 90, p.x));
    rules().float(g, x, GY - 100, text, COLORS.story);
  }

  const ready = (g, p) => g.time >= p.readyAt && !p.react;
  const front = (b, p) => (b.x - p.x) * p.face > -BEHIND;

  function near(b, p) {
    const d = p.x - b.x;
    return Math.abs(d) <= CFG.REACH && (Math.abs(d) <= 18 || Math.sign(d) === b.dir);
  }

  function free(b) { return !b.act && !b.hiding && !b.climbing && b.onGround && !b.stun; }

  function bitable(g) {
    const p = g.photographer, b = g.bear;
    return !!p && !p.react && !b.inWater && free(b) && near(b, p);
  }

  function act(g, b, key) {
    const p = g.photographer;
    if (!p || p.react) return null;
    if (key === 'hug') {
      if (Math.abs(p.x - b.x) > VIEW || !front(b, p)) return null;
      b.dir = Math.sign(p.x - b.x) || 1;
      return { kind: 'pose', t: 0, dur: POSE, dir: b.dir, hit: true, target: p, done: false, land: !b.inWater, paid: ready(g, p) };
    }
    if (b.inWater || !near(b, p)) return null;
    return { kind: key, t: 0, dur: CFG.BITE, dir: b.dir, hit: true, target: p, done: false };
  }

  function shoot(g, p, n, loud) {
    p.burstT = 0; p.frames = n; p.clicked = 0; p.loud = !!loud;
  }

  function clicks(g, p) {
    if (p.clicked >= p.frames) return;
    const k = Math.min(p.frames, Math.floor(p.burstT / GAP) + 1);
    for (; p.clicked < k; p.clicked++) rules().onSound(g, 'shutter', p.x + p.face * 30, p.loud ? 1 : 0.5);
  }

  function splash(g, x, n) {
    for (let i = 0; i < n; i++) {
      g.particles.push({ x: x + (Math.random() - 0.5) * 26, y: GY - 8, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 120, t: 0.7, color: '#bfe3f5', round: true });
    }
  }

  function hearts(g, b) {
    for (let i = 0; i < 5; i++) {
      g.particles.push({ x: b.x + b.dir * (10 + Math.random() * 30), y: GY - 110 - Math.random() * 20, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, t: 1.1 + Math.random() * 0.6, color: COLORS.love, heart: true });
    }
  }

  function reward(g, p) {
    const b = g.bear, n = p.poses++;
    p.readyAt = g.time + REST;
    g.stats.selfies++;
    g.syn = Math.min(100, g.syn + 6);
    g.lastHuman = g.time;
    g.viralUntil = g.time + 12;
    rules().float(g, b.x, GY - 150, LABELS.photo.shot, COLORS.love);
    rules().addPanic(g, n < 2 ? -8 : 3, NEWS.photo[Math.min(n, NEWS.photo.length - 1)], n < 2);
    hearts(g, b);
  }

  function pose(g, p, a) {
    const b = g.bear;
    if (!a.caught && !a.land && a.t >= CATCH) { a.caught = true; splash(g, b.x + a.dir * 40, 6); rules().onSound(g, 'eat', b.x, 'fish'); }
    if (!a.fired && a.t >= FIRE) {
      a.fired = true;
      shoot(g, p, 16, true);
      shout(g, p, pick(LABELS.photo.pose));
      rules().quip(g, ZS.QUIPS.pose, true);
    }
    if (!a.snapped && a.t >= SNAP) { a.snapped = true; if (a.paid) reward(g, p); }
    if (!a.let && !a.land && a.t >= LET) { a.let = true; splash(g, b.x + a.dir * 34, 5); }
  }

  function react(g, p, dt) {
    const b = g.bear, a = b.act;
    if (p.react === 'hugged') {
      if (!a || a.target !== p) { p.react = null; p.hugK = 0; p.hugBy = null; p.readyAt = g.time + REST; return; }
      if (!p.hugFired && a.t >= 0.3) { p.hugFired = true; shoot(g, p, 12, true); }
      p.hugK = Math.min(1, a.t / a.dur);
      p.liftX = b.x + a.dir * HOLD;
    } else if (p.react === 'bitten') {
      p.reactT += dt;
      p.bitK = Math.min(1, p.reactT / CFG.HOP);
      if (!p.bitFired) { p.bitFired = true; shoot(g, p, 6, true); }
      if (p.reactT >= CFG.HOP) { p.react = null; p.bitK = 0; p.bitFired = false; }
    }
    if (p.react !== 'hugged') p.hugFired = false;
  }

  function update(g, dt) {
    if (!g.level.photographer) return;
    const p = g.photographer || (g.photographer = create(g)), b = g.bear, a = b.act;
    p.burstT += dt;
    react(g, p, dt);
    const posing = !!a && a.kind === 'pose' && a.target === p;
    if (posing) pose(g, p, a);
    p.thrill += ((posing || p.react ? 1 : 0) - p.thrill) * Math.min(1, dt * 4);
    const d = Math.abs(b.x - p.x), busy = p.burstT < p.frames * GAP + 0.6;
    if (!g.once.photo && d < VIEW) { g.once.photo = true; rules().say(g, NEWS.photoWait); }
    if (!busy && !p.react && d < WAKE && (p.idle -= dt) <= 0) {
      p.idle = 3.5 + Math.random() * 5;
      shoot(g, p, 2 + Math.floor(Math.random() * 4), false);
    }
    if (!p.react && !posing && !b.inWater && d < CLOSE && g.time - p.closeAt > HELLO) {
      p.closeAt = g.time;
      shoot(g, p, 7, true);
      shout(g, p, LABELS.photo.close);
    }
    if (b.inWater && ready(g, p) && !a && g.time - p.helloAt > HELLO) {
      p.helloAt = g.time;
      shout(g, p, LABELS.photo.hello);
    }
    clicks(g, p);
    if (!b.reach && free(b) && d < VIEW && front(b, p)) b.reach = p;
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.photographer = { update, act, create, bitable, POSE, GAP, REST };
})();
