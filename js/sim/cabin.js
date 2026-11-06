(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const STATION = [19.5, 23.5], ARRIVE = 32;
  const SHIFTS = [
    { warn: 3.4, at: 5.5, side: -1, call: 'chamois' },
    { warn: 9.4, at: 11.5, side: 1, call: 'krivan' },
    { warn: 14.6, at: 16.7, side: -1, call: 'marmot' },
    { warn: 24.4, at: 25.8, side: 1, call: 'kids' },
    { warn: 27.4, at: 28.8, side: -1, call: 'kids2' },
    { warn: 29.6, at: 31, side: 1, call: 'kids3' },
  ];
  const PEOPLE = [
    { kind: 'tourist', x: 260, mass: 1, look: 0 },
    { kind: 'guest', x: 330, mass: 1.6, look: 0 },
    { kind: 'picker', x: 400, mass: 0.9 },
    { kind: 'tourist', x: 470, mass: 1, look: 2, off: true },
    { kind: 'guest', x: 540, mass: 1.2, look: 1, off: true },
    { kind: 'guest', x: 610, mass: 1, look: 3 },
    { kind: 'tourist', x: 680, mass: 1, look: 1, off: true },
    { kind: 'porter', x: 750, mass: 1.4 },
  ];
  const KIDS = [{ x: 700 }, { x: 735 }, { x: 765 }, { x: 790 }, { x: 670 }];
  const BEAR = 6, SPREAD = 200, SCALE = 4200, LIMIT = 0.11, ALARM = 1.1, STOP = 2.4, SIGHT = 300, COOL = 3;
  const POINTA = { stop: 0.6, flash: 1.8, end: 3.6 };

  function stage() {
    const S = ZS.levelKit.cabinStage();
    S.start = (S.cabin.left + S.cabin.right) / 2 - 20;
    return S;
  }

  function start(g, S) {
    const mid = (S.cabin.left + S.cabin.right) / 2;
    const c = {
      t: 0, mid, climb: 0, speed: 0, stop: 0, door: 0, side: 1, shift: null, warn: null,
      tilt: 0, spin: 0, over: 0, alarms: 0, seenAt: -99, seen: 0, kids: false,
      people: PEOPLE.map((p, i) => Object.assign({ id: 'cabin' + i, home: p.x, want: p.x, dir: 1, gone: false, size: 1, look: 0 }, p)),
      pointa: null, said: {}, result: null,
    };
    rules().say(g, NEWS.cabinBoard, true);
    return c;
  }

  const riders = (c) => c.people.filter((p) => !p.gone);

  function torque(c, b) {
    let m = BEAR * (b.x - c.mid);
    for (const p of riders(c)) m += p.mass * (p.x - c.mid);
    return m;
  }

  function balance(c) {
    let m = 0;
    for (const p of riders(c)) m += p.mass * (p.x - c.mid);
    return c.mid - m / BEAR;
  }

  function station(g, S, c) {
    const open = c.t >= STATION[0] + 0.6 && c.t < STATION[1] - 0.5;
    const was = c.door;
    c.door = clamp(c.door + (open ? 0.05 : -0.05), 0, 1);
    if (was < 1 && c.door >= 1 && !c.kids) {
      c.kids = true;
      for (const p of c.people) if (p.off) p.gone = true;
      KIDS.forEach((k, i) => c.people.push({ id: 'cabinKid' + i, kind: 'tourist', x: k.x, home: k.x, want: k.x, mass: 0.6, size: 0.7, look: i, dir: 1, kid: true }));
      rules().float(g, S.cabin.right - 80, GY - 160, LABELS.cabin.kidsIn, COLORS.story);
      rules().say(g, NEWS.cabinKids);
    }
  }

  function shifts(g, S, c) {
    c.warn = SHIFTS.find((s) => c.t >= s.warn && c.t < s.at && (!s.call.startsWith('kids') || c.kids)) || null;
    const now = SHIFTS.filter((s) => c.t >= s.at && (!s.call.startsWith('kids') || c.kids)).pop();
    if (c.warn && c.said.warn !== c.warn) {
      c.said.warn = c.warn;
      const list = riders(c), who = list[c.warn.call.startsWith('kids') ? list.length - 1 : 1];
      if (who) rules().float(g, who.x, GY - 150, LABELS.cabin.call[c.warn.call], COLORS.zap);
    }
    if (now && c.shift !== now) {
      c.shift = now; c.side = now.side;
      if (now.call.startsWith('kids')) c.kidSide = now.side; else c.adultSide = now.side;
      const lo = S.cabin.left + 40, hi = S.cabin.right - 40, kids = now.call.startsWith('kids');
      const list = riders(c).filter((p) => !kids || p.kid).sort((a, z) => (a.x - z.x) * now.side);
      list.forEach((p, i) => { p.want = clamp(now.side > 0 ? hi - (list.length - 1 - i) * (SPREAD / list.length) : lo + i * (SPREAD / list.length), lo, hi); });
      rules().onSound(g, 'creak', S.cabin.left, 0.5);
    }
  }

  function walk(c, dt) {
    for (const p of riders(c)) {
      const d = p.want - p.x;
      p.walking = Math.abs(d) > 2;
      if (p.walking) p.x += Math.sign(d) * Math.min(Math.abs(d), (p.kid ? 150 : 90) * dt);
      const side = p.kid ? c.kidSide : c.adultSide;
      if (side) p.dir = side;
    }
  }

  function swing(c, b, dt) {
    const want = clamp(torque(c, b) / SCALE, -0.32, 0.32);
    c.spin += ((want - c.tilt) * 9 - c.spin * 3.2) * dt;
    c.tilt += c.spin * dt;
  }

  function alarm(g, S, c) {
    c.alarms++; c.over = 0; c.stop = STOP; c.seen++;
    for (const p of riders(c)) p.dir = Math.sign(g.bear.x - p.x) || 1;
    rules().spotted(g, g.bear.x, GY - 150, LABELS.cabin.alarm);
    rules().addPanic(g, 8);
    rules().onSound(g, 'thud', c.mid, 1);
    rules().quip(g, ZS.QUIPS.funi, true);
    if (!c.said.alarm) { c.said.alarm = true; rules().say(g, NEWS.cabinAlarm, true); }
  }

  function looks(g, c) {
    const b = g.bear;
    if (!c.shift || g.time - c.seenAt < COOL || c.stop > 0) return;
    const p = riders(c).find((o) => !o.walking && Math.sign(b.x - o.x) === o.dir && Math.abs(b.x - o.x) < SIGHT && Math.abs(b.x - o.x) > 12);
    if (!p) return;
    c.seenAt = g.time; c.seen++;
    rules().spotted(g, p.x, GY - 150, LABELS.cabin.shout);
    rules().addPanic(g, 4);
    rules().onSound(g, 'scream', p.x, 0.6);
  }

  function control(g, S, c, dt) {
    const b = g.bear;
    chopok().clearPresses(g);
    if (c.stop > 0) { b.moving = false; b.vx = 0; b.inv = Math.max(0, b.inv - dt); b.quipCd -= dt; return; }
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, S.cabin.left, S.cabin.right);
    if (b.y < GY - 40) { b.y = GY - 40; b.vy = Math.max(0, b.vy); }
  }

  function pointa(g, S, c, dt) {
    const p = c.pointa, was = p.t, b = g.bear;
    p.t += dt;
    b.moving = false;
    for (const o of riders(c)) { o.dir = 1; o.x += 70 * dt; o.walking = true; if (o.x > S.cabin.right + 40) o.gone = true; }
    if (was < POINTA.stop && p.t >= POINTA.stop) rules().float(g, c.mid, GY - 200, c.alarms ? LABELS.cabin.wobbly : LABELS.cabin.level, c.alarms ? COLORS.bad : COLORS.good);
    if (was < POINTA.flash && p.t >= POINTA.flash) { p.flash = 1; rules().onSound(g, 'shutter', b.x); rules().say(g, c.alarms ? NEWS.funiRide[0] : NEWS.funiRide[1], true); }
    p.flash = Math.max(0, (p.flash || 0) - dt * 2.5);
    return p.t >= POINTA.end;
  }

  function finish(g, c) {
    c.result = c.alarms ? 'wobbly' : 'level';
    g.once.cabinRide = { alarms: c.alarms, seen: c.seen };
    if (!c.alarms) g.panic = Math.max(0, g.panic - 6);
    return true;
  }

  function update(g, c, dt) {
    const S = g.level, b = g.bear;
    c.t += dt;
    c.stop = Math.max(0, c.stop - dt);
    const halt = c.stop > 0 || (c.t > STATION[0] && c.t < STATION[1]) || c.t > ARRIVE;
    c.speed = clamp(c.speed + (halt ? -dt * 1.2 : dt * 0.6), 0, 1);
    c.climb += c.speed * dt;
    swing(c, b, dt);
    if (c.pointa) return pointa(g, S, c, dt) && finish(g, c);
    station(g, S, c);
    shifts(g, S, c);
    walk(c, dt);
    control(g, S, c, dt);
    c.over = Math.abs(c.tilt) > LIMIT ? c.over + dt : Math.max(0, c.over - dt * 2);
    if (c.over > ALARM && c.stop <= 0) alarm(g, S, c);
    looks(g, c);
    if (c.t >= ARRIVE + 0.8) { c.pointa = { t: 0, flash: 0 }; chopok().quiet(b); c.door = 1; }
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
    c.speed = Math.max(0, c.speed - dt);
    swing(c, g.bear, dt);
  }

  function plan(g) {
    const p = g.chopok && g.chopok.pass;
    return p && p.key === 'funi' && p.phase === 'play' ? p.play : null;
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys, S = g.level;
    if (c.pointa) return;
    const x = clamp(balance(c), S.cabin.left + 4, S.cabin.right - 4);
    if (b.x < x - 14) keys.add('ArrowRight');
    else if (b.x > x + 14) keys.add('ArrowLeft');
  }

  ZS.sim.cabin = { SHIFTS, STATION, ARRIVE, BEAR, LIMIT, ALARM, stage, start, update, idle, riders, torque, balance, plan, pilot };
})();
