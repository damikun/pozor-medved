(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp, lerp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const RIDE = 33, STATION = [21.5, 25.5], ARRIVE = 31;
  const SHIFTS = [
    { warn: 4.6, at: 6.7, side: -1, call: 'chamois' },
    { warn: 11.2, at: 13.3, side: 1, call: 'krivan' },
    { warn: 17.2, at: 19.3, side: -1, call: 'marmot' },
    { warn: 24.3, at: 26.4, side: -1, call: 'guide' },
  ];
  const PEOPLE = [
    { kind: 'tourist', x: 250, role: 'phone', look: 0 },
    { kind: 'tourist', x: 330, role: 'kid', size: 0.72, look: 1 },
    { kind: 'guest', x: 395, role: 'plain', look: 1 },
    { kind: 'picker', x: 455, role: 'granny' },
    { kind: 'tourist', x: 560, role: 'phone', look: 2, off: true },
    { kind: 'guest', x: 615, role: 'plain', look: 3, off: true },
    { kind: 'tourist', x: 665, role: 'kid', size: 0.72, look: 3, off: true },
    { kind: 'guest', x: 720, role: 'plain', look: 0, off: true },
    { kind: 'tourist', x: 760, role: 'phone', look: 1 },
    { kind: 'mascot', x: 805, role: 'mascot' },
  ];
  const SIGHT = 330, SHOVE = 90, COOL = 3, STOP = 3, AIM = 1.25;
  const POINTA = { turn: 0.6, faint: 1.4, flash: 2.1, end: 4.2 };

  function stage() {
    const S = ZS.levelKit.cabinStage();
    S.start = S.cabin.left + 20;
    return S;
  }

  function start(g, S) {
    const c = {
      t: 0, climb: 0, speed: 0, stop: 0, door: 0, side: 1, shift: null, warn: null, seenAt: -99, hits: 0, fooled: false,
      people: PEOPLE.map((p, i) => Object.assign({ id: 'cabin' + i, home: p.x, dir: 1, gone: false, size: 1, look: 0 }, p)),
      guide: null, shot: null, pointa: null, pose: 0, said: {}, result: null,
    };
    rules().say(g, NEWS.cabinBoard, true);
    return c;
  }

  function watchers(c) {
    return c.people.filter((p) => !p.gone && p.role !== 'mascot').concat(c.guide && !c.guide.gone ? [c.guide] : []);
  }

  function sees(c, p, b) {
    const d = b.x - p.x;
    return Math.sign(d) === p.dir && Math.abs(d) < SIGHT;
  }

  function hidden(b) {
    return !!b.hiding && !!b.hiding.hide;
  }

  function shuffle(S, c, side, dt) {
    const lo = S.cabin.left + 30, hi = S.cabin.right - 30;
    for (const p of watchers(c)) {
      const want = clamp(p.home + side * SHOVE * (p.role === 'granny' ? 0.5 : 1), lo, hi);
      p.x += clamp(want - p.x, -70 * dt, 70 * dt);
    }
  }

  function station(g, S, c) {
    const was = c.door;
    const open = c.t >= STATION[0] + 0.8 && c.t < STATION[1] - 0.6;
    c.door = clamp(c.door + (open ? 0.05 : -0.05), 0, 1);
    if (was < 1 && c.door >= 1 && !c.guide) {
      for (const p of c.people) if (p.off) p.gone = true;
      c.guide = { id: 'cabinGuide', kind: 'porter', x: S.cabin.right - 40, home: S.cabin.right - 60, dir: -1, role: 'guide', size: 1, look: 0 };
      rules().float(g, c.guide.x, GY - 150, LABELS.cabin.guideIn, COLORS.story);
      rules().say(g, NEWS.cabinGuide);
    }
  }

  function shifts(g, S, c, dt) {
    c.warn = SHIFTS.find((s) => c.t >= s.warn && c.t < s.at) || null;
    const now = SHIFTS.filter((s) => c.t >= s.at).pop();
    if (c.warn && c.said.warn !== c.warn) {
      c.said.warn = c.warn;
      const who = c.warn.call === 'guide' && c.guide ? c.guide : watchers(c)[1];
      if (who) rules().float(g, who.x, GY - 150, LABELS.cabin.call[c.warn.call], COLORS.zap);
    }
    if (now && c.shift !== now) { c.shift = now; c.side = now.side; rules().onSound(g, 'creak', S.cabin.left, 0.5); }
    for (const p of watchers(c)) p.dir = p.role === 'guide' && c.t < 26.4 ? -1 : c.side;
    shuffle(S, c, c.side, dt);
  }

  function spotted(g, S, c, p) {
    const b = g.bear;
    if (c.pose > 0.6 && (p.role === 'phone' || p.role === 'kid' || p.role === 'plain')) {
      if (c.fooled) return;
      c.fooled = true;
      g.stats.selfies++;
      rules().float(g, p.x, GY - 140, LABELS.cabin.selfie, COLORS.good);
      rules().onSound(g, 'shutter', p.x);
      rules().quip(g, ZS.QUIPS.funi, true);
      rules().say(g, NEWS.cabinSelfie, true);
      return;
    }
    if (g.time - c.seenAt < COOL) return;
    if (c.hits >= 2) { c.seenAt = g.time; rules().spotted(g, p.x, GY - 150, LABELS.cabin.shout); rules().addPanic(g, 4); return; }
    c.seenAt = g.time;
    rules().spotted(g, p.x, GY - 150, p.role === 'granny' ? LABELS.cabin.granny : p.role === 'guide' ? LABELS.cabin.guideSees : LABELS.cabin.shout);
    rules().addPanic(g, 6);
    rules().onSound(g, 'scream', p.x, 0.8);
    c.stop = STOP;
    c.shot = { t: 0, x: b.x };
  }

  function shot(g, c, dt) {
    const s = c.shot, b = g.bear;
    s.t += dt;
    s.x += (b.x - s.x) * Math.min(1, dt * 3);
    if (s.t < AIM) return;
    c.shot = null;
    rules().onSound(g, 'shot', b.x);
    if (hidden(b) || b.inv > 0) {
      rules().float(g, b.x, GY - 120, LABELS.miss, COLORS.good);
      rules().say(g, NEWS.cabinMiss);
      return;
    }
    c.hits++;
    g.lives -= 1;
    if (g.lives <= 0) { rules().end(g, g.flags.cull ? 'cull' : 'hunted'); return; }
    b.inv = 2.5;
    rules().float(g, b.x, GY - 125, LABELS.hit(g.lives), COLORS.shot);
    rules().say(g, NEWS.cabinShot, true);
  }

  function control(g, S, c, dt) {
    const b = g.bear, keys = g.input.keys;
    chopok().clearPresses(g);
    const pose = keys.has('KeyC') && b.onGround && !b.hiding && !(b.stun > 0) && !c.pointa;
    c.pose = clamp(c.pose + (pose ? 5 : -4) * dt, 0, 1);
    if (pose) {
      b.moving = false; b.running = false; b.crouch = false; b.vx = 0;
      b.inv = Math.max(0, b.inv - dt); b.quipCd -= dt;
      return;
    }
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, S.cabin.left, S.cabin.right);
    b.y = Math.max(b.y, GY - 40);
  }

  function pointa(g, S, c, dt) {
    const p = c.pointa, was = p.t, b = g.bear, m = c.people.find((o) => o.role === 'mascot');
    p.t += dt;
    b.moving = false;
    for (const o of watchers(c)) { o.dir = 1; o.x += 60 * dt; if (o.x > S.cabin.right + 40) o.gone = true; }
    if (was < POINTA.turn && p.t >= POINTA.turn) { m.dir = -1; rules().float(g, m.x, GY - 160, LABELS.cabin.twin, COLORS.story); }
    if (was < POINTA.faint && p.t >= POINTA.faint) { m.faint = 0.001; rules().quip(g, ZS.QUIPS.funi, true); }
    if (m.faint) m.faint = Math.min(1, m.faint + dt * 2.5);
    if (was < POINTA.flash && p.t >= POINTA.flash) { p.flash = 1; rules().onSound(g, 'shutter', b.x); rules().say(g, c.hits ? NEWS.funiRide[0] : NEWS.funiRide[1], true); }
    p.flash = Math.max(0, (p.flash || 0) - dt * 2.5);
    return p.t >= POINTA.end;
  }

  function update(g, c, dt) {
    const S = g.level, b = g.bear;
    c.t += dt;
    c.stop = Math.max(0, c.stop - dt);
    const halt = c.stop > 0 || (c.t > STATION[0] && c.t < STATION[1]) || c.t > ARRIVE;
    c.speed = clamp(c.speed + (halt ? -dt * 1.2 : dt * 0.6), 0, 1);
    c.climb += c.speed * dt;
    if (c.pointa) return pointa(g, S, c, dt) && finish(g, c);
    station(g, S, c);
    shifts(g, S, c, dt);
    control(g, S, c, dt);
    if (c.shot) { shot(g, c, dt); if (g.over) return false; }
    else if (!hidden(b)) {
      const p = watchers(c).find((o) => sees(c, o, b));
      if (p) spotted(g, S, c, p);
    }
    if (c.t >= ARRIVE + 0.6 && !c.shot) { c.pointa = { t: 0, flash: 0 }; chopok().quiet(b); c.door = 1; }
    return false;
  }

  function finish(g, c) {
    c.result = c.hits ? 'hit' : 'clean';
    g.once.cabinRide = c.result;
    return true;
  }

  function idle(g, c, dt) {
    c.t += dt;
    c.speed = Math.max(0, c.speed - dt);
  }

  function plan(g) {
    const p = g.chopok && g.chopok.pass;
    return p && p.key === 'funi' && p.phase === 'play' ? p.play : null;
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    if (c.pointa) return;
    const pack = S.covers.reduce((a, s) => (!a || Math.abs(s.x - b.x) < Math.abs(a.x - b.x) ? s : a), null);
    const risky = c.warn || c.shot || watchers(c).some((o) => sees(c, o, b));
    if (!risky && !hidden(b)) return;
    if (Math.abs(pack.x - b.x) < pack.w / 2 + 18) { keys.add('ArrowDown'); return; }
    keys.add(pack.x > b.x ? 'ArrowRight' : 'ArrowLeft');
  }

  ZS.sim.cabin = { RIDE, SHIFTS, STATION, ARRIVE, POINTA, SIGHT, stage, start, update, idle, watchers, sees, plan, pilot };
})();
