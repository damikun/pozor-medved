(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const passes = () => ZS.sim.passes;
  const QUIPS = () => ZS.QUIPS;
  const T = () => LABELS.vychodna;
  const N = () => NEWS.vychodna;

  const JAM = { stand: 19, alarm: 3.6, panic: 3, reach: 56 };
  const BROOK = { sink: 1.3, depth: 46, panic: 4, stun: 0.6, reach: 110, foot: 8 };
  const SHOVE = { v: 110, t: 1.8, panic: 2 };
  const GATE = { sees: 240, whistle: 0.9 };
  const PROC = { speed: 46, warn: 2.1, stop: 2.6, start: 460, end: 1600, stops: [], slot: [-420, -290], lag: 300, grace: 0.35, cool: 1.5, panic: 5, gone: 7, past: 30, passed: 2 };
  const QUEUE = { bear: 74, gap: 50, serve: 2.3, hand: 0.9, walk: 64, size: 4, window: 6, join: 140, cut: 18 };
  const INSPIC = { speed: 42, sees: 270, around: 80, turn: [3, 5.5], cool: 6 };
  const DRESS = 1.5;

  const ease = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
  const between = (r) => r[0] + Math.random() * (r[1] - r[0]);
  const on = (g) => !!g.level && g.level.id === 'vychodna' && !g.level.stage;
  const site = (g) => g.level.vychodna;

  function queueSpot(S, i) {
    return S.jarmok.halusky - QUEUE.window - i * QUEUE.gap;
  }

  function state(g) {
    if (g.vychodna) return g.vychodna;
    const S = site(g), o = g.once;
    const out = !!o.naramok;
    g.vychodna = {
      jam: { on: -1, alarm: 0, car: -1 },
      promo: { x: S.park.promo, dir: -1, phase: out ? 'done' : 'wait', t: 0 },
      sink: null,
      steward: { x: S.gate.steward, dir: -1, phase: 'watch', t: 0, scanAt: -99 },
      proc: { phase: o.klobuk || o.predbehol ? 'rest' : 'wait', head: S.obec.from + (o.klobuk || o.predbehol ? PROC.end : PROC.start), t: 0, stop: 0, miss: 0, stomps: 0, missAt: -99, stompAt: -99, lagAt: -99, aheadAt: -99, called: false, leader: o.klobuk || o.predbehol ? -1 : S.obec.from + PROC.start + PROC.slot[0] - 60, give: 0 },
      queue: { people: [], t: QUEUE.serve, hand: 0, served: !!o.halusky, look: 0 },
      inspic: { x: S.back.inspic[0] + 120, dir: 1, t: between(INSPIC.turn), saidAt: -99, phase: 'walk' },
      fishing: { phase: 'wait', t: 2.5, bucket: 1, angryAt: -99, hi: false }, honey: { away: false, t: 1.5 }, arch: [], crowd: { on: false, jumped: false, at: -99 }, camp: { down: {}, woke: {} }, patrol: { x: S.noc.wc - 100, dir: -1, seenAt: -99 },
      dress: -1, fujara: -99, radio: -99, cardas: -99, guls: -99, parker: -99,
      shove: 0, shoveDir: -1, shoveTo: null, said: {},
    };
    const q = g.vychodna.queue;
    for (let i = 0; i < QUEUE.size - 1; i++) q.people.push({ x: queueSpot(S, i), phase: 'wait', look: q.look++, t: 0, dir: 1 });
    return g.vychodna;
  }

  function sayOnce(g, key, news, hot) {
    if (g.once[key]) return false;
    g.once[key] = true;
    rules().say(g, news, hot);
    return true;
  }

  function every(g, c, key, gap) {
    if (g.time - (c.said[key] === undefined ? -999 : c.said[key]) < gap) return false;
    c.said[key] = g.time;
    return true;
  }

  function shove(g, c, dir, to) {
    const b = g.bear;
    if (c.shove > 0) return;
    c.shoveDir = dir; c.shoveTo = to === undefined ? null : to;
    c.shove = c.shoveTo === null ? SHOVE.t : 4;
    rules().addPanic(g, SHOVE.panic);
  }

  function pushBack(g, c, dt) {
    const b = g.bear;
    if (c.shove <= 0) { c.heldX = undefined; return; }
    if (c.heldX !== undefined && Math.abs(b.x - c.heldX) < 20) b.x = c.heldX;
    c.shove -= dt;
    b.hiding = null; b.crouch = false; b.running = false;
    const v = SHOVE.v * Math.min(1, c.shove * 1.5 + 0.2);
    b.x += c.shoveDir * v * dt;
    b.vx = 0; b.dir = -c.shoveDir; b.moving = true; b.walkT += dt * 0.8;
    b.trackX = Math.min(b.trackX, b.x);
    if (c.shoveTo !== null && (c.shoveDir < 0 ? b.x <= c.shoveTo : b.x >= c.shoveTo)) c.shove = 0;
    c.heldX = b.x;
  }

  function free(b) {
    return b.onGround && !b.climbing && !b.act && !(b.stun > 0);
  }

  function inDwarf(L, x) {
    return !!L.dwarf && L.dwarf.some(([a, z]) => x > a - 10 && x < z + 10);
  }

  function crouchCover(g, dt) {
    const b = g.bear;
    const inside = inDwarf(g.level, b.x) && free(b);
    if (inside && b.crouch) {
      b.covered = true;
      const r = g.level.dwarf.find(([p, q]) => b.x > p - 10 && b.x < q + 10);
      const m = Math.min(30, (r[1] - r[0]) / 2), to = Math.max(r[0] + m, Math.min(r[1] - m, b.x));
      const k = g.input.keys, steer = k.has('ArrowLeft') || k.has('ArrowRight') || k.has('KeyA') || k.has('KeyD');
      if (!steer && Math.abs(to - b.x) > 0.5) { b.x += (to - b.x) * Math.min(1, dt * 10); b.trackX = b.x; }
    }
    b.thicket = inside && !b.covered;
  }

  function standing(g) {
    const b = g.bear;
    if (!b.onGround || b.y > GY - 12) return -1;
    let best = -1, d = Infinity;
    site(g).park.jam.forEach((j, i) => { const e = Math.abs(b.x - j.x); if (e < j.w / 2 + JAM.stand && e < d) { d = e; best = i; } });
    return best;
  }

  function alarm(g, c, i) {
    const k = c.jam, j = site(g).park.jam[i];
    k.alarm = JAM.alarm; k.car = i; k.beeps = 1;
    rules().addPanic(g, JAM.panic);
    rules().float(g, j.x, GY - j.h - 96, T().car.alarm, COLORS.bad);
    rules().onSound(g, 'carAlarm', j.x);
    if (every(g, c, 'alarm', 20)) rules().quip(g, QUIPS().vyAlarm, true);
    sayOnce(g, 'vyAlarm', N().alarm);
  }

  function jam(g, c, dt) {
    const S = site(g), J = S.park.jam, k = c.jam, b = g.bear;
    k.alarm = Math.max(0, k.alarm - dt);
    const on = standing(g);
    if (on !== k.on) { if (on >= 0 && J[on].kind === 'suv') alarm(g, c, on); k.on = on; }
    if (k.alarm > 0 && (k.beeps || 0) < 3 && every(g, c, 'beep', 0.75)) { k.beeps = (k.beeps || 0) + 1; rules().onSound(g, 'carAlarm', J[k.car].x); }
    promo(g, c, dt);
  }

  function promo(g, c, dt) {
    const S = site(g), b = g.bear, p = c.promo, J = S.park.jam[2];
    p.t += dt;
    if (p.phase === 'done') return;
    if (p.phase === 'wait') {
      p.dir = b.x < p.x ? -1 : 1;
      if (b.x > S.park.from + 100) sayOnce(g, 'vyStuck', N().stuck);
      if (b.x > J.x - J.w / 2 && b.x < p.x + 200) { p.phase = 'come'; p.t = 0; rules().float(g, p.x, GY - 128, T().car.promo, COLORS.story); }
      return;
    }
    if (p.phase === 'come') {
      const to = Math.max(J.x + J.w / 2 + 20, b.x + 46 * (b.x > p.x ? 1 : -1));
      p.dir = Math.sign(b.x - p.x) || -1;
      p.x += Math.sign(to - p.x) * Math.min(Math.abs(to - p.x), 110 * dt);
      if (b.onGround && b.y > GY - 4 && Math.abs(b.x - p.x) < 70) give(g, c);
    }
  }

  function give(g, c) {
    const b = g.bear, p = c.promo;
    p.phase = 'done'; p.t = 0; p.dir = b.x < p.x ? -1 : 1;
    g.once.naramok = true;
    rules().onSound(g, 'bands', b.x);
    rules().float(g, b.x, GY - 160, T().car.band, COLORS.good);
    rules().say(g, N().band, true);
    rules().quip(g, QUIPS().vyBand, true);
  }

  function wet(g, x) {
    const R = g.level.river;
    return !!R && x > R.from + 18 && x < R.to - 18 && !g.level.stones.some((st) => Math.abs(st.x - x) < st.w / 2 + BROOK.foot);
  }

  function hop(g) {
    if (!on(g)) return false;
    const R = g.level.river, b = g.bear;
    if (!R || !b.onGround || b.climbing || (g.vychodna && g.vychodna.sink)) return false;
    if (b.x < R.from - 90 || b.x > R.to - 10) return false;
    const next = g.level.stones.map((st) => st.x).concat(R.to + 30).find((x) => x > b.x + 12);
    return next !== undefined && next - b.x < BROOK.reach;
  }

  function brook(g, c, dt) {
    const R = g.level.river, b = g.bear;
    if (!R) return;
    if (c.sink) {
      c.sink.t += dt;
      passes().clearPresses(g);
      const u = Math.min(1, c.sink.t / BROOK.sink);
      Object.assign(b, { moving: true, running: false, vx: 0, vy: 0, onGround: true, x: c.sink.x + (Math.max(R.from + 74, Math.min(R.to - 74, c.sink.x)) - c.sink.x) * Math.min(1, c.sink.t * 3) + Math.sin(c.sink.t * 7) * 3, y: GY + BROOK.depth * u * u * (3 - 2 * u) });
      b.walkT += dt * 2.5;
      if (c.sink.t < BROOK.sink) return;
      const left = c.sink.dir < 0, x = left ? R.from - 50 : R.to + 50;
      c.sink = null;
      Object.assign(b, { x, trackX: Math.min(b.trackX, x), y: GY, dir: left ? 1 : -1, stun: BROOK.stun });
      rules().addPanic(g, BROOK.panic);
      return;
    }
    if (!g.once.vyHop && b.x > R.from - 160 && b.x < R.from) { g.once.vyHop = true; rules().float(g, b.x, GY - 130, T().night.hop, COLORS.story); }
    if (b.onGround && !b.climbing && b.y >= GY - 2) c.from = b.x < R.from ? b.x : b.x > R.to ? b.x : c.from;
    if (!b.onGround || b.climbing || b.y < GY - 2 || !wet(g, b.x)) return;
    c.sink = { t: 0, x: b.x, from: c.from === undefined ? R.from - 1 : c.from, dir: b.dir < 0 ? -1 : 1 };
    passes().quiet(b);
    rules().float(g, b.x, GY - 120, LABELS.cave.splash, COLORS.bad);
    rules().onSound(g, 'splash', b.x, 1);
    if (every(g, c, 'splash', 30)) rules().quip(g, QUIPS().vySplash, true);
  }

  function knock(dur) {
    return { kind: 'knock', t: 0, dur, dir: 1, hit: false, target: null, done: false };
  }

  function gate(g, c, dt) {
    const S = site(g), b = g.bear, s = c.steward;
    s.t -= dt;
    if (g.once.naramok) {
      if (b.x > S.gate.from - 40 && b.x < S.gate.line + 40 && g.time - s.scanAt > 8 && !g.once.scanned) {
        g.once.scanned = true; s.scanAt = g.time;
        rules().onSound(g, 'beep', s.x);
        rules().float(g, s.x, GY - 120, T().gate.ok, COLORS.good);
        rules().say(g, N().gate);
      }
      s.phase = 'watch';
      return;
    }
    if (b.x > S.gate.line - 30) { b.x = S.gate.line - 30; b.vx = 0; b.trackX = Math.min(b.trackX, b.x); }
    if (s.phase === 'watch' && b.x > s.x - GATE.sees && !b.covered && c.shove <= 0) {
      s.phase = 'whistle'; s.t = GATE.whistle;
      rules().float(g, s.x, GY - 120, T().gate.stop, COLORS.zap);
      rules().onSound(g, 'whistle', s.x);
    } else if (s.phase === 'whistle' && s.t <= 0) {
      s.phase = 'watch';
      if (b.x > s.x - GATE.sees - 20) {
        shove(g, c, -1, s.x - GATE.sees - 60);
        rules().float(g, b.x, GY - 130, T().gate.back, COLORS.bad);
        if (every(g, c, 'gate', 20)) { rules().say(g, N().gateNo); rules().quip(g, QUIPS().vyGate, true); }
      }
    }
  }

  function member(p) {
    return { slot: [p.head + PROC.slot[0], p.head + PROC.slot[1]] };
  }

  function procession(g, c, dt) {
    const S = site(g), b = g.bear, p = c.proc;
    if ((g.once.klobuk || g.once.predbehol) && p.phase !== 'end' && p.phase !== 'leave' && p.phase !== 'passed' && p.phase !== 'rest') { p.phase = 'rest'; p.head = S.obec.from + PROC.end; }
    if (p.phase === 'rest') { p.leader = p.head + PROC.slot[0] - 50; p.t += dt; return; }
    p.t += dt;
    const slot = member(p).slot, end = S.obec.from + PROC.end;
    if (!g.once.klobuk && !g.once.predbehol && p.phase !== 'end' && p.phase !== 'leave' && b.x > p.head + PROC.past && b.x < end + 200) {
      g.once.predbehol = true;
      p.phase = 'passed'; p.t = 0;
      rules().float(g, p.leader, GY - 128, T().proc.passed, COLORS.story);
      if (every(g, c, 'passed', 30)) rules().quip(g, QUIPS().vyPassed, true);
      return;
    }
    if (p.phase === 'passed') {
      p.head += PROC.speed * dt;
      p.leader = Math.min(p.leader + PROC.speed * dt, p.head + PROC.slot[0] - 50);
      if (p.head >= end) { p.head = end; p.phase = 'rest'; p.t = 0; }
      return;
    }
    if (p.phase === 'wait') {
      p.leader = slot[0] - 50;
      if (b.x > S.obec.from - 300) {
        p.called = true;
        p.phase = 'walk'; p.t = 0;
        rules().float(g, p.leader, GY - 128, T().proc.call, COLORS.story);
        rules().say(g, N().proc, true);
        rules().onSound(g, 'clap', p.head - 200, 0.5);
      }
      return;
    }
    if (p.phase === 'walk' || p.phase === 'warn' || p.phase === 'hold') {
      {
        p.head += PROC.speed * dt;
        const next = PROC.stops[p.stop] === undefined ? undefined : S.obec.from + PROC.stops[p.stop];
        if (p.phase === 'walk' && next !== undefined && p.head >= next - PROC.speed * PROC.warn) {
          p.phase = 'warn'; p.t = 0;
          rules().onSound(g, 'bagpipe', p.head - 46);
        } else if (p.phase === 'warn' && p.t >= PROC.warn) {
          p.phase = 'stop'; p.t = 0; p.stop++;
          rules().onSound(g, 'stamp', p.head - 160);
        } else if (p.phase === 'walk' && p.head >= end) {
          p.phase = 'end'; p.t = 0;
        }
      }
      p.leader = Math.min(p.leader + Math.max(0, slot[0] - 50 - p.leader) * Math.min(1, dt * 3), slot[0] - 50);
    } else if (p.phase === 'stop') {
      if (p.t > PROC.grace && b.moving && c.shove <= 0 && g.time - p.missAt > PROC.cool && b.x > slot[0] - 200 && b.x < slot[1] + 40) {
        p.missAt = g.time; p.miss++;
        rules().float(g, b.x, GY - 140, T().proc.seen[p.miss % T().proc.seen.length], COLORS.story);
        if (every(g, c, 'procMiss', 25)) { rules().say(g, N().procMiss); rules().quip(g, QUIPS().vyMiss, true); }
      }
      if (p.t >= PROC.stop) { p.phase = 'walk'; p.t = 0; rules().float(g, p.head, GY - 170, T().proc.go, COLORS.good); }
    } else if (p.phase === 'end') {
      if (b.x < slot[0] - 300) { p.phase = 'rest'; p.t = 0; return; }
      const to = b.x - 60;
      p.leader += Math.sign(to - p.leader) * Math.min(Math.abs(to - p.leader), 110 * dt);
      if (Math.abs(to - p.leader) < 6) { p.give += dt; }
      if (p.give > 0.6 && !g.once.klobuk) {
        g.once.klobuk = true;
        g.once.sprievod = { miss: p.miss, stomps: p.stomps };
        rules().float(g, b.x, GY - 156, p.miss >= 3 ? T().proc.hatMeh : T().proc.hat, COLORS.good);
        rules().onSound(g, 'hug', b.x);
        rules().say(g, p.miss ? N().hat : N().hatClean, true);
        rules().quip(g, QUIPS().vyHat, true);
        if (!p.miss) g.panic = Math.max(0, g.panic - 6);
      }
      if (p.give > 1.6) { p.phase = 'rest'; p.t = 0; }
    } else if (p.phase === 'leave') {
      p.head += PROC.speed * 2.2 * dt;
      p.leader += PROC.speed * 2.2 * dt;
      if (p.t > PROC.gone) p.phase = 'gone';
    }
    if ((p.phase === 'walk' || p.phase === 'warn' || p.phase === 'stop') && b.x > slot[1] + 40 && b.x < end && g.time - p.aheadAt > 5) {
      p.aheadAt = g.time;
      rules().float(g, b.x + 40, GY - 130, T().proc.ahead, COLORS.story);
    }
  }

  function stomp(g) {
    const c = g.vychodna, p = c.proc, b = g.bear;
    p.stomps++; p.stompAt = g.time;
    rules().onSound(g, 'stamp', b.x);
    rules().float(g, b.x, GY - 130, T().proc.hej[p.stomps % T().proc.hej.length], COLORS.good);
    g.panic = Math.max(0, g.panic - 1.5);
    for (let i = 0; i < 4; i++) g.particles.push({ x: b.x + (Math.random() - 0.5) * 30, y: GY - 2, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, t: 0.5, color: '#b59a74' });
    return knock(0.36);
  }

  function stopping(g) {
    const c = g.vychodna;
    return !!c && c.proc.phase === 'stop' && g.time - c.proc.stompAt > 0.3;
  }

  function queue(g, c, dt) {
    const S = site(g), b = g.bear, q = c.queue, win = S.jarmok.halusky;
    if (b.x < S.jarmok.from - 600 || b.x > S.back.from + 300) return;
    q.t -= dt;
    const waiting = q.people.filter((p) => p.phase === 'wait'), front = waiting[0];
    if (front && Math.abs(front.x - queueSpot(S, 0)) < 3 && q.t <= 0 && q.hand <= 0) { q.hand = QUEUE.hand; front.phase = 'served'; front.t = 0; rules().onSound(g, 'serve', win); }
    if (q.hand > 0) {
      q.hand -= dt;
      if (q.hand <= 0) {
        const p = q.people.find((o) => o.phase === 'served');
        if (p) { p.phase = 'leave'; p.dir = 1; }
        q.t = QUEUE.serve;
      }
    }
    let i = 0;
    for (const p of q.people) {
      if (p.phase === 'wait') {
        const spot = queueSpot(S, i++);
        if (p.x < spot - 0.5) { p.x = Math.min(spot, p.x + QUEUE.walk * dt); p.walking = true; } else p.walking = false;
      } else if (p.phase === 'leave') {
        const spot = win - 300 - (p.look % 5) * 46;
        p.dir = -1; p.t += dt;
        if (p.x > spot + 1) { p.x = Math.max(spot, p.x - QUEUE.walk * dt); p.walking = true; } else { p.walking = false; p.phase = 'eat'; }
      }
    }
    const eat = q.people.filter((p) => p.phase === 'eat');
    if (eat.length > 4 && Math.abs(b.x - eat[0].x) > 900) eat[0].phase = 'gone';
    q.people = q.people.filter((p) => p.phase !== 'gone');
    if (waiting.length < QUEUE.size - 1 && q.people.length < 7 && b.x > win - 260) q.people.push({ x: Math.min(queueSpot(S, QUEUE.size) - 40, b.x - 760), phase: 'wait', look: q.look++, t: 0, dir: 1 });
  }

  function atWindow(g) {
    const c = g.vychodna;
    if (!c || c.queue.served) return false;
    const S = site(g), b = g.bear, win = S.jarmok.halusky;
    return b.onGround && b.y > GY - 4 && Math.abs(b.x - (win - QUEUE.window)) < 30;
  }

  function order(g) {
    const c = g.vychodna, S = site(g);
    c.queue.served = true;
    g.once.halusky = true;
    rules().eat(g, { type: 'porcia', x: S.jarmok.halusky, eaten: false });
    rules().float(g, S.jarmok.halusky + 10, GY - 150, g.once.kroj || g.once.klobuk ? T().queue.free : T().queue.paid, COLORS.story);
    rules().say(g, N().halusky, true);
    rules().quip(g, QUIPS().vyHalusky, true);
    return { kind: 'taste', t: 0, dur: 2.6, dir: g.bear.dir, hit: false, target: null, bowl: true, done: false };
  }

  function inspic(g, c, dt) {
    const S = site(g), b = g.bear, k = c.inspic, [a, z] = S.back.inspic;
    if (b.x < S.back.from - 500 || b.x > S.scena.to + 200) return;
    k.t -= dt;
    if (k.phase === 'walk') {
      k.x += k.dir * INSPIC.speed * dt;
      if (k.x < a || k.x > z) { k.dir *= -1; k.x = Math.max(a, Math.min(z, k.x)); }
      if (k.t <= 0) { k.phase = 'talk'; k.t = 1.6 + Math.random(); }
    } else if (k.t <= 0) { k.phase = 'walk'; k.t = between(INSPIC.turn); if (Math.random() < 0.4) k.dir *= -1; }
    const d = Math.abs(b.x - k.x), front = Math.sign(b.x - k.x) === k.dir;
    const sees = !b.covered && (d < INSPIC.around || (front && d < INSPIC.sees));
    if (!sees || g.time - k.saidAt < INSPIC.cool) return;
    k.saidAt = g.time;
    k.phase = 'talk'; k.t = 2; k.dir = Math.sign(b.x - k.x) || 1;
    rules().float(g, k.x, GY - 128, g.once.kroj ? T().back.go : T().back.dress, COLORS.story);
    if (!g.once.kroj) { rules().onSound(g, 'whistle', k.x); rules().addPanic(g, 2); }
    sayOnce(g, 'vyInspic', N().inspic);
  }

  function atRack(g) {
    const S = site(g), b = g.bear;
    return !g.once.kroj && !!g.vychodna && g.vychodna.dress < 0 && Math.abs(b.x - S.back.rack) < 30 && free(b) && b.y > GY - 4;
  }

  function dress(g) {
    const c = g.vychodna, S = site(g);
    c.dress = 0;
    g.once.kroj = true;
    rules().onSound(g, 'dress', S.back.rack);
    rules().float(g, S.back.costumer, GY - 140, T().back.done, COLORS.good);
    rules().say(g, N().kroj, true);
    rules().quip(g, QUIPS().vyKroj, true);
    return Object.assign(knock(DRESS), { dir: g.bear.dir });
  }

  function stage(g, c) {
    const S = site(g), b = g.bear;
    if (g.once.tanec || b.x <= S.scena.wall) return;
    b.x = S.scena.wall; b.vx = 0;
    if (!g.once.kroj && every(g, c, 'stageNo', 4)) rules().float(g, S.scena.stairs, GY - 150, T().back.noKroj, COLORS.bad);
  }

  const SPOTS = {
    firemen: (S) => S.back.firemen,
    radio: (S) => S.noc.radio - 62,
    cardas: (S) => S.noc.tent[0] + 190,
  };
  const DONE = { firemen: 'hasici', radio: 'radio', cardas: 'cardas' };

  function near(g, key) {
    if (!on(g) || !g.vychodna) return false;
    const b = g.bear, S = site(g);
    if (key === 'order') return atWindow(g);
    if (key === 'fish') return atBucket(g);
    if (key === 'stomp') return stopping(g) && b.x > member(g.vychodna.proc).slot[0] - 120;
    if (SPOTS[key]) return !g.once[DONE[key]] && Math.abs(b.x - SPOTS[key](S)) < 50;
    return false;
  }

  const HONEY = { away: [2.2, 3.4], look: [1.6, 2.4], panic: 4 };
  const CAMP = { rope: 68, trip: 0.6, panic: 3, wake: 70, patrol: 46, sees: 200, cone: 1.4 };
  const ARCH = { cheer: 1.4 };



  function arches(g, c) {
    const b = g.bear;
    site(g).obec.arches.forEach((x, i) => {
      const k = c.arch[i] || (c.arch[i] = { side: b.x < x ? -1 : 1, at: -99, done: false });
      const side = b.x < x - 30 ? -1 : b.x > x + 30 ? 1 : 0;
      if (side && side !== k.side) {
        if (!k.done) {
          k.done = true; k.at = g.time;
          rules().float(g, x, GY - 140, T().night.clap, COLORS.good);
          rules().onSound(g, 'clap', x, 0.6);
          g.panic = Math.max(0, g.panic - 1);
        }
        k.side = side;
      }
    });
  }



  const FISH = { wait: [3, 5], bite: 0.9, pull: 0.9, cast: 0.7, max: 3, reach: 40, hi: 150 };

  function fisherman(g, c, dt) {
    const f = c.fishing, b = g.bear, x = site(g).woods.fisher;
    if (b.x > x + 1200) return;
    f.t -= dt;
    if (f.t <= 0) {
      if (f.phase === 'wait') { f.phase = 'bite'; f.t = FISH.bite; }
      else if (f.phase === 'bite') { f.phase = 'pull'; f.t = FISH.pull; rules().onSound(g, 'splash', x - 170, 0.3); }
      else if (f.phase === 'pull') { f.bucket = Math.min(FISH.max, f.bucket + 1); f.phase = 'cast'; f.t = FISH.cast; }
      else { f.phase = 'wait'; f.t = between(FISH.wait); }
    }
    if (!f.hi && Math.abs(b.x - x) < FISH.hi && !c.sink) { f.hi = true; rules().float(g, x, GY - 120, T().night.fishHi, COLORS.story); }
  }

  function atBucket(g) {
    const c = g.vychodna, b = g.bear;
    return !!c && c.fishing.bucket > 0 && b.onGround && b.y > GY - 4 && Math.abs(b.x - (site(g).woods.fisher + 26)) < FISH.reach;
  }

  function stealFish(g) {
    const c = g.vychodna, f = c.fishing, x = site(g).woods.fisher;
    f.bucket--; f.angryAt = g.time;
    rules().eat(g, { type: 'fish', x: g.bear.x, eaten: false });
    rules().spotted(g, x, GY - 120, T().night.fishThief);
    rules().addPanic(g, 1);
    return knock(0.5);
  }

  function brookFisher(g, c) {
    if (c.sink && c.sink.t < 0.05 && !c.fished) {
      c.fished = true;
      c.fisherJump = g.time;
      rules().float(g, site(g).woods.fisher, GY - 120, T().night.fish, COLORS.bad);
      rules().say(g, N().fisher);
    }
  }

  function camp(g, c, dt) {
    const S = site(g), b = g.bear, L = g.level;
    if (b.x < S.noc.from - 200 || b.x > S.end.from + 200) return;
    if (b.x > L.tents[0] - CAMP.rope - 200 && b.x < L.tents[0] && !g.once.vyRope) { g.once.vyRope = true; rules().float(g, b.x, GY - 130, T().night.rope, COLORS.zap); }
    L.tents.forEach((x, i) => {
      for (const rx of i ? [] : [x - CAMP.rope, x + CAMP.rope]) {
        const key = 'rope' + i + (rx < x ? 'l' : 'r');
        if (b.onGround && b.y > GY - 3 && Math.abs(b.x - rx) < 6 && g.time - (c.camp[key] || -9) > 6) {
          c.camp[key] = g.time; c.camp.down[i] = g.time; c.camp.woke[i] = g.time;
          rules().spotted(g, x, GY - 90, T().night.wake);
          rules().addPanic(g, CAMP.panic);
          rules().onSound(g, 'stamp', x);
          sayOnce(g, 'vyCamp', N().camp);
        }
      }
      if (b.running && b.moving && Math.abs(b.x - x) < CAMP.wake && g.time - (c.camp.woke[i] || -9) > 6) {
        c.camp.woke[i] = g.time;
        rules().spotted(g, x, GY - 80, T().night.wake);
        rules().addPanic(g, 2);
      }
    });
    const p = c.patrol, [a, z] = [S.noc.camp[0] - 40, S.noc.wc + 60];
    p.t = (p.t || 0) + dt;
    const d = b.x - p.x, front = Math.sign(d) === p.dir;
    if (p.phase === 'scared' && p.t > 0.7) { p.phase = 'hide'; p.t = 0; p.hideX = L.tents.reduce((m, x) => (Math.abs(x - p.x) < Math.abs(m - p.x) ? x : m), L.tents[0]) + (p.dir > 0 ? -6 : 6); }
    else if (p.phase === 'hide') { p.x += Math.sign(p.hideX - p.x) * Math.min(Math.abs(p.hideX - p.x), 120 * dt); p.low = Math.abs(p.hideX - p.x) < 1 ? (p.low || 0) + dt : 0; if (p.low > 1.2) { p.phase = 'peek'; p.t = 0; p.dir = Math.sign(b.x - p.x) || p.dir; } }
    else if (p.phase === 'peek' && p.t > 1.2) { p.phase = 'calm'; p.t = 0; rules().float(g, p.x, GY - 120, T().night.calm, COLORS.story); g.panic = Math.max(0, g.panic - 2); }
    else if (p.phase === 'calm' && p.t > 1.4) { p.phase = 'walk'; p.done = true; }
    if (!p.phase || p.phase === 'walk') {
      p.phase = 'walk';
      p.x += p.dir * CAMP.patrol * dt;
      if (p.x < a || p.x > z) { p.dir *= -1; p.x = Math.max(a, Math.min(z, p.x)); }
      if (!p.done && front && Math.abs(d) < CAMP.sees && !b.covered) {
        p.phase = 'scared'; p.t = 0; p.seenAt = g.time;
        rules().spotted(g, p.x, GY - 120, T().night.patrol);
        rules().addPanic(g, 2);
      }
    }
    if (b.covered && Math.abs(b.x - S.noc.wc) < 40 && front && Math.abs(d) < CAMP.sees) sayOnce(g, 'vyToi', N().toi);
  }


  function firemen(g) {
    const S = site(g), x = SPOTS.firemen(S);
    g.once.hasici = true;
    rules().eat(g, { type: 'gulas', x, eaten: false, labelKey: 'hasicGulas' });
    rules().float(g, x + 30, GY - 140, T().spot.firemen, COLORS.story);
    rules().say(g, N().firemen);
    return knock(0.8);
  }

  function radio(g) {
    const S = site(g), x = SPOTS.radio(S);
    g.once.radio = true;
    g.vychodna.radio = g.time;
    g.stats.selfies++;
    rules().onSound(g, 'interview', x);
    rules().float(g, x, GY - 160, T().spot.radio, COLORS.story);
    rules().say(g, N().radio, true);
    rules().quip(g, QUIPS().vyRadio, true);
    return knock(1.8);
  }

  function cardas(g) {
    const S = site(g), x = SPOTS.cardas(S);
    g.once.cardas = true;
    g.vychodna.cardas = g.time;
    g.stats.hugs++;
    g.panic = Math.max(0, g.panic - 6);
    rules().onSound(g, 'hug', x);
    rules().float(g, x, GY - 160, T().spot.cardas, COLORS.love);
    rules().say(g, N().cardas);
    for (let i = 0; i < 6; i++) g.particles.push({ x: g.bear.x + (Math.random() - 0.5) * 40, y: GY - 90, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 50, t: 1.3, color: '#e64980', heart: true });
    return knock(2.4);
  }

  function act(g, b) {
    if (!on(g)) return null;
    state(g);
    if (near(g, 'stomp')) return stomp(g);
    if (atWindow(g)) return order(g);
    if (atBucket(g)) return stealFish(g);
    if (near(g, 'firemen')) return firemen(g);
    if (near(g, 'radio')) return radio(g);
    if (near(g, 'cardas')) return cardas(g);
    return null;
  }

  function cue(g) {
    for (const k of ['stomp', 'order', 'fish', 'firemen', 'radio', 'cardas']) if (near(g, k)) return k;
    return null;
  }

  function sections(g, c) {
    const b = g.bear, S = site(g);
    const inside = (a, z) => b.x > a && b.x < z;
    if (inside(S.park.from + 60, S.park.to) && sayOnce(g, 'vyPark', N().park)) rules().quip(g, QUIPS().vyPark, true);
    if (b.x > S.park.booth - 160 && g.time - c.parker > 30) { c.parker = g.time; rules().float(g, S.park.booth, GY - 130, T().park.fee, COLORS.story); }
    if (inside(S.jarmok.from + 60, S.jarmok.to)) sayOnce(g, 'vyJarmok', N().jarmok);
    if (inside(S.scena.from + 40, S.scena.to)) sayOnce(g, 'vyScena', N().scena);
    if (inside(S.noc.from + 120, S.noc.to) && sayOnce(g, 'vyNoc', N().noc)) rules().quip(g, QUIPS().vyNoc, true);
    if (inside(S.end.from + 60, S.end.to)) sayOnce(g, 'vyLes', N().les);
  }

  function dressT(g, c, dt) {
    if (atRack(g)) dress(g);
    if (c.dress >= 0) c.dress += dt;
    if (c.dress > DRESS + 0.4) c.dress = -2;
  }

  function keepOut(g) {
    const S = site(g), a = S.gate.from - 250, z = S.noc.to + 250;
    for (const s of g.shooters) {
      if (s.react || s.x <= a || s.x >= z) continue;
      const left = s.x - a < z - s.x;
      const to = left ? a - 200 : z + 200, dx = to - s.x;
      s.x = to;
      if (s.from !== null && s.from !== undefined) { s.from += dx; s.to += dx; }
      if (s.cross !== undefined) s.cross += dx;
      s.lock = 0; s.alertX = null;
    }
  }

  function wear(g) {
    const b = g.bear, o = g.once;
    b.dance = null;
    const kroj = !!o.kroj && !o.tanec;
    const band = !!o.naramok && !o.tanec, hat = (!!o.klobuk || kroj) && !o.tanec;
    b.fest = band || hat || kroj ? { band, hat, kroj } : null;
  }

  function update(g, dt) {
    if (!on(g)) return;
    const c = state(g);
    wear(g);
    crouchCover(g, dt);
    pushBack(g, c, dt);
    brook(g, c, dt);
    jam(g, c, dt);
    gate(g, c, dt);
    procession(g, c, dt);
    queue(g, c, dt);
    inspic(g, c, dt);
    arches(g, c);
    fisherman(g, c, dt);
    brookFisher(g, c);
    camp(g, c, dt);
    dressT(g, c, dt);
    stage(g, c);
    keepOut(g);
    sections(g, c);
  }

  function goal(g) {
    const o = g.once;
    if (!o.naramok) return 'band';
    if (!o.tanec) return 'dance';
    return g.fat < g.def.fatGoal ? 'eat' : !ZS.sim.rules.hugged(g) ? 'hug' : 'den';
  }

  function toward(b, x, slack) {
    const d = x - b.x;
    if (Math.abs(d) < (slack || 10)) return null;
    return d > 0 ? 'right' : 'left';
  }

  function bot(g) {
    if (!on(g) || !g.vychodna) return null;
    const b = g.bear, S = site(g), c = g.vychodna;
    if (c.shove > 0) return 'wait';
    if (c.sink) return 'wait';
    if (hop(g)) return 'hop';
    const p = c.proc;
    if (p.phase !== 'gone' && p.phase !== 'rest' && p.phase !== 'passed' && p.phase !== 'leave' && !g.once.klobuk && b.x > S.obec.from - 80 && b.x < S.obec.from + PROC.end + 40) {
      const slot = member(p).slot, mid = (slot[0] + slot[1]) / 2;
      if (p.phase === 'stop') return near(g, 'stomp') && Math.random() < 0.05 ? 'order' : 'wait';
      if (p.phase === 'warn') return b.x < slot[0] + 10 ? 'right' : 'wait';
      if (p.phase === 'end') return 'wait';
      if (p.phase === 'wait') return b.x < slot[0] + 30 ? 'right' : 'wait';
      if (b.x < mid - 20) return 'right';
      return 'wait';
    }
    const t0 = g.level.tents[0], rope = [t0 - CAMP.rope, t0 + CAMP.rope].some((rx) => rx - b.x > 8 && rx - b.x < 40) && !c.camp.down[0];
    if (rope && b.onGround) return 'hop';
    if (atWindow(g) || atBucket(g) || near(g, 'radio') || near(g, 'cardas') || near(g, 'firemen')) return 'order';
    if (c.dress >= 0) return 'wait';
    return null;
  }

  ZS.sim.passes.register('vychodna', {
    tanec: { mod: () => ZS.sim.tanec, sound: 'stamp' },
  });

  ZS.sim.vychodna = { FISH, CAMP, ARCH, JAM, BROOK, PROC, QUEUE, GATE, INSPIC, update, act, near, cue, goal, bot, hop, wet, inDwarf, state, member, atWindow, atRack, queueSpot, standing };
})();
