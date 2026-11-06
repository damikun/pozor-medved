(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const chopok = () => ZS.sim.chopok;

  const RIDE = { px: 360, mid: 4900, top: 8300, wait: 3.6, brake: 1.2, go: 1.2, pylons: [1500, 3300, 6400] };
  const SHIFTS = [
    { warn: 1.4, at: 3, side: -1, call: 'chamois', leg: 0 },
    { warn: 6, at: 7.8, side: 1, call: 'krivan', leg: 0 },
    { warn: 10.6, at: 12.4, side: -1, call: 'marmot', leg: 0 },
    { warn: 0.6, at: 2, side: 1, call: 'kids', leg: 1 },
    { warn: 3.6, at: 5, side: -1, call: 'kids2', leg: 1 },
    { warn: 6.4, at: 7.8, side: 1, call: 'kids3', leg: 1 },
  ];
  const PEOPLE = [
    { x: 260, mass: 1, look: 0 },
    { x: 330, mass: 1.5, look: 3 },
    { x: 400, mass: 0.9, look: 2 },
    { x: 470, mass: 1, look: 1, off: true },
    { x: 540, mass: 1.2, look: 4, off: true },
    { x: 610, mass: 1, look: 0 },
    { x: 680, mass: 1, look: 2, off: true },
    { x: 750, mass: 1.3, look: 1 },
  ];
  const KIDS = [{ x: 690, look: 5 }, { x: 728, look: 3 }, { x: 766, look: 1 }, { x: 804, look: 4 }];
  const BEAR = 6, SPREAD = 200, SCALE = 4200, LIMIT = 0.11, ALARM = 1.1, STOPS = 3, SIGHT = 300, COOL = 3;
  const RAMP = 3;
  const FAIL = { shake: 1.3, dark: 1.9, back: 2.6 };
  const POINTA = { flash: 0.3, end: 1 };

  function stage() {
    const S = ZS.levelKit.cabinStage();
    S.start = (S.cabin.left + S.cabin.right) / 2 - 20;
    return S;
  }

  function fresh(c) {
    Object.assign(c, {
      climb: 0, ride: 0, leg: 0, legT: 0, legAt: 0, wait: 0, arrived: 0, speed: 0, door: 0, side: 1, shift: null, warn: null,
      tilt: 0, spin: 0, steady: 0, over: 0, kids: false, kidSide: 0, adultSide: 0, fail: null,
      people: PEOPLE.map((p, i) => Object.assign({ id: 'cabin' + i, kind: 'tourist', home: p.x, want: p.x, dir: 1, gone: false, size: 1, look: 0, go: 0, v: 90 }, p)),
    });
    c.said.warn = null;
    return c;
  }

  function start(g, S) {
    const mid = (S.cabin.left + S.cabin.right) / 2;
    const c = fresh({ t: 0, mid, alarms: 0, seenAt: -99, seen: 0, pointa: null, said: {}, result: null, back: 0 });
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
    const open = c.leg === 0 && c.wait > 0.6 && c.wait < RIDE.wait - 0.5;
    const was = c.door;
    c.door = clamp(c.door + (open ? 0.05 : -0.05), 0, 1);
    if (was < 1 && c.door >= 1 && !c.kids) {
      c.kids = true;
      for (const p of c.people) if (p.off) p.gone = true;
      KIDS.forEach((k, i) => c.people.push({ id: 'cabinKid' + i, kind: 'tourist', x: k.x, home: k.x, want: k.x, mass: 0.8, size: 1, look: k.look, dir: 1, kid: true, go: 0, v: 95 }));
      rules().float(g, S.cabin.right - 80, GY - 160, LABELS.cabin.kidsIn, COLORS.story);
      rules().say(g, NEWS.cabinKids);
    }
  }

  function shifts(g, S, c) {
    const T = c.legT - c.legAt;
    c.warn = SHIFTS.find((s) => s.leg === c.leg && T >= s.warn && T < s.at) || null;
    const now = SHIFTS.filter((s) => s.leg === c.leg && T >= s.at).pop();
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
      list.forEach((p, i) => {
        p.want = clamp(now.side > 0 ? hi - (list.length - 1 - i) * (SPREAD / list.length) : lo + i * (SPREAD / list.length), lo, hi);
        const k = c.people.indexOf(p);
        p.go = c.legT + 0.12 * ((k * 5 + i * 3) % 7);
        p.v = 72 + ((k * 37 + i * 11) % 5) * 11;
      });
      rules().onSound(g, 'creak', S.cabin.left, 0.5);
    }
  }

  function walk(c, dt) {
    for (const p of riders(c)) {
      const d = p.want - p.x;
      p.walking = Math.abs(d) > 2 && c.legT >= (p.go || 0);
      if (p.walking) p.x += Math.sign(d) * Math.min(Math.abs(d), (p.v || 90) * dt);
      const side = p.kid ? c.kidSide : c.adultSide;
      if (side) p.dir = side;
    }
  }

  function swing(c, b, dt) {
    const docked = (c.leg === 0 && c.wait > 0) || c.arrived > 0;
    c.steady = docked ? Math.max(0, c.steady - dt * 2.5) : Math.min(1, c.steady + dt / RAMP);
    const want = clamp(torque(c, b) / SCALE, -0.32, 0.32) * c.steady * c.steady;
    c.spin += ((want - c.tilt) * 6 - c.spin * (docked ? 9 : 4.2)) * dt;
    c.tilt += c.spin * dt;
  }

  function alarm(g, S, c) {
    c.alarms++; c.over = 0; c.seen++;
    c.fail = { t: 0 };
    for (const p of riders(c)) p.dir = Math.sign(g.bear.x - p.x) || 1;
    rules().spotted(g, g.bear.x, GY - 150, LABELS.cabin.alarm);
    rules().addPanic(g, 8);
    rules().onSound(g, 'thud', c.mid, 1);
    rules().quip(g, ZS.QUIPS.funi, true);
    if (!c.said.alarm) { c.said.alarm = true; rules().say(g, NEWS.cabinAlarm, true); }
  }

  function looks(g, c) {
    const b = g.bear;
    if (!c.shift || g.time - c.seenAt < COOL || c.fail) return;
    const p = riders(c).find((o) => !o.walking && Math.abs(o.want - o.x) <= 2 && Math.sign(b.x - o.x) === o.dir && Math.abs(b.x - o.x) < SIGHT && Math.abs(b.x - o.x) > 12);
    if (!p) return;
    c.seenAt = g.time; c.seen++;
    rules().spotted(g, p.x, GY - 150, LABELS.cabin.shout);
    rules().addPanic(g, 4);
    rules().onSound(g, 'scream', p.x, 0.6);
  }

  function control(g, S, c, dt) {
    const b = g.bear;
    chopok().clearPresses(g);
    ZS.sim.bear.update(g, dt);
    b.x = clamp(b.x, S.cabin.left, S.cabin.right);
    if (b.y < GY - 40) { b.y = GY - 40; b.vy = Math.max(0, b.vy); }
  }

  function pointa(g, c, dt) {
    const p = c.pointa, was = p.t, b = g.bear;
    p.t += dt;
    b.moving = false;
    c.door = clamp(c.door + dt * 2.5, 0, 1);
    for (const o of riders(c)) o.walking = false;
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

  function travel(c, dt) {
    const target = c.leg === 0 ? RIDE.mid : RIDE.top, left = target - c.ride;
    const brake = (RIDE.px * c.speed * c.speed) / (2 * RIDE.brake);
    const halt = left <= brake + 1;
    c.speed = clamp(c.speed + (halt ? -RIDE.brake : RIDE.go) * dt, 0, 1);
    c.ride = Math.min(target, c.ride + c.speed * RIDE.px * dt);
    c.climb += c.speed * dt;
    c.legT += dt;
    if (left > 3 || c.speed > 0) return;
    c.ride = target;
    if (c.leg === 0) {
      c.wait += dt;
      if (c.wait >= RIDE.wait) { c.leg = 1; c.legAt = c.legT; }
    } else c.arrived += dt;
  }

  function failing(g, S, c, dt) {
    const f = c.fail, was = f.t, b = g.bear;
    f.t += dt;
    c.speed = Math.max(0, c.speed - dt * 2);
    c.spin += Math.sin(f.t * 9) * 3 * dt * (1 - f.t / FAIL.dark);
    swing(c, b, dt);
    for (const p of riders(c)) p.walking = false;
    b.moving = false; b.vx = 0; b.inv = Math.max(0, b.inv - dt); b.quipCd -= dt;
    if (was < FAIL.shake && f.t >= FAIL.shake) rules().float(g, c.mid, GY - 210, LABELS.cabin.back, COLORS.bad);
    if (was < FAIL.dark && f.t >= FAIL.dark) {
      if (g.lives > 1) { g.lives -= 1; rules().onSound(g, 'hit', b.x); }
      fresh(c);
      c.back = 1;
      chopok().quiet(b);
      Object.assign(b, { x: S.start, trackX: S.start, dir: 1, inv: 2 });
      if (g.lives >= 1) rules().float(g, b.x, GY - 130, LABELS.hit(g.lives), COLORS.shot);
    }
  }

  function update(g, c, dt) {
    const S = g.level, b = g.bear;
    c.t += dt;
    c.back = Math.max(0, (c.back || 0) - dt * 1.6);
    if (c.fail) { failing(g, S, c, dt); return false; }
    travel(c, dt);
    swing(c, b, dt);
    if (c.pointa) return pointa(g, c, dt) && finish(g, c);
    station(g, S, c);
    shifts(g, S, c);
    walk(c, dt);
    control(g, S, c, dt);
    c.over = Math.abs(c.tilt) > LIMIT ? c.over + dt : Math.max(0, c.over - dt * 2);
    if (c.over > ALARM && c.alarms < STOPS) alarm(g, S, c);
    looks(g, c);
    if (c.arrived > 0) {
      c.pointa = { t: 0, flash: 0 };
      chopok().quiet(b);
      rules().float(g, c.mid, GY - 160, c.alarms ? LABELS.cabin.wobbly : LABELS.cabin.level, c.alarms ? COLORS.bad : COLORS.good);
    }
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

  ZS.sim.cabin = { SHIFTS, RIDE, FAIL, BEAR, LIMIT, ALARM, stage, start, update, idle, riders, torque, balance, plan, pilot };
})();
