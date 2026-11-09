(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const passes = () => ZS.sim.passes;
  const QUIPS = () => ZS.QUIPS;

  const POLICE = { around: 120, ahead: 300, whistle: 1.1, walk: 130, reach: 46, back: 70, turn: [5, 9], look: [1.6, 2.6], cool: 2.4 };
  const SHOVE = { v: 105, t: 2, panic: 3, hold: 34 };
  const INTERN = { sees: 420, walk: 110, give: 0.25, reach: 70 };
  const CREW = { talk: [4.5, 7.5], warn: 2.1, pan: [2.2, 3.2], range: 330, panic: 6 };
  const MP = { ahead: 260, around: 90, panic: 5, speed: 34 };
  const FLINTA = { sees: 260, notice: 2.1, sob: 3, sobs: 3, calm: 4, pace: [4790, 4960], speed: 22 };
  const COOK = { pot: [2.4, 3.8], turn: 1.2, look: [1.6, 2.4] };
  const HEAD = { down: [2.6, 4.4], rise: 2.1, up: [1.6, 2.6] };
  const BAR = { counter: 28, ban: 4, grace: 2, tries: 2 };
  const BEAVER = { near: 520, gnaw: 9, warn: 3 };
  const LIFT = { close: 0.7, up: 0.9, rise: 1.5, open: 0.6, sink: 1.6, depth: 170, wall: 6745 };
  const CHUTE = { down: 2, depth: 300 };
  const BACKWATER = { sink: 1.3, depth: 120, panic: 6, stun: 0.6, reach: 100, foot: 8 };
  const SPY = { listen: [3.2, 5], turn: 2.1, look: [1.6, 2.2], reach: 44, grace: 3, panic: 5 };

  const ease = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
  const between = (r) => r[0] + Math.random() * (r[1] - r[0]);
  const on = (g) => !!g.level && g.level.id === 'capital' && !g.level.stage;
  const site = (g) => g.level.capital;

  function npc(kind, x, extra) {
    return Object.assign({
      kind, x, home: x, from: x, to: x, dir: -1, speed: 0, state: 'walk', pose: 'idle', pause: 0, filmCd: Infinity, dropCd: Infinity,
      react: null, reactT: 0, empty: false, clutch: false, hurdle: null, capital: true, phase: 'watch', t: between(POLICE.turn),
    }, extra);
  }

  function cast(g) {
    const S = site(g), out = [];
    if (!g.once.badge) S.square.interns.forEach((x, i) => out.push(npc('intern', x, { look: i, dir: i ? 1 : -1, as: 'intern' })));
    [3390, 3490, 3585].forEach((x, i) => out.push(npc('police', x, { dir: -1, look: i, t: between(POLICE.turn) + i * 1.7 })));
    out.push(npc('police', 7600, { from: 7200, to: 8020, pose: null, speed: 30, dir: 1, beat: true, look: 3 }));
    out.push(npc('police', 4500, { from: 4200, to: 4960, pose: null, speed: 34, dir: -1, beat: true, look: 4 }));
    out.push(npc('mp', 4330, { from: 4170, to: 4560, pose: null, speed: MP.speed, dir: 1, texting: true, look: 0 }));
    out.push(npc('mp', 4700, { from: 4560, to: 4940, pose: null, speed: MP.speed * 0.8, dir: -1, texting: true, look: 1 }));
    if (!g.once.flinta) out.push(npc('flinta', S.corridor.flinta, { from: FLINTA.pace[0], to: FLINTA.pace[1], dir: -1, pose: null, speed: FLINTA.speed, phase: 'pace', t: 0, sobs: 0, seenAt: -99, as: 'flinta' }));
    return out;
  }

  function state(g) {
    if (g.capital) return g.capital;
    const S = site(g);
    g.capital = {
      crew: { phase: 'talk', t: between(CREW.talk), k: 0, seenAt: -99 },
      bar: {
        cook: { state: 'pot', t: between(COOK.pot) },
        heads: S.bar.tables.map((x, i) => ({ x, state: i === 2 ? 'sleep' : 'down', t: between(HEAD.down) + i * 1.3, caughtAt: -99 })),
        served: false, tries: 0, ban: 0, graceT: 0,
      },
      lift: { phase: 'idle', t: 0 }, chute: { phase: 'idle', t: 0 }, sink: null,
      spy: { state: 'listen', t: between(SPY.listen), caughtAt: -99, snack: true },
      shove: 0, shoveDir: -1, gateAt: -99, beaver: { t: 0, phase: 'idle', fell: false },
      said: {},
    };
    g.people.push(...cast(g));
    return g.capital;
  }

  function sayOnce(g, key, news, hot) {
    if (g.once[key]) return false;
    g.once[key] = true;
    rules().say(g, news, hot);
    return true;
  }

  function sayEvery(g, c, key, every, news, hot) {
    if (g.time - (c.said[key] === undefined ? -999 : c.said[key]) < every) return false;
    c.said[key] = g.time;
    if (news) rules().say(g, news, hot);
    return true;
  }

  function seen(b, p, ahead, around) {
    if (b.covered || b.climbing) return false;
    const d = Math.abs(b.x - p.x), front = Math.sign(b.x - p.x) === p.dir;
    return d < around || (front && d < ahead);
  }

  function shove(g, c, from, cop) {
    const b = g.bear;
    if (c.shove > 0 || (cop && g.once.badge)) return;
    c.shove = SHOVE.t;
    c.shoveDir = Math.sign(b.x - from) || -1;
    c.escort = cop || null;
    rules().onSound(g, 'whistle', b.x);
    rules().float(g, b.x, GY - 130, LABELS.capital.back, COLORS.bad);
    rules().addPanic(g, SHOVE.panic);
    if (sayEvery(g, c, 'shove', 30, NEWS.capital.shoved)) rules().quip(g, QUIPS().capitalShoved, true);
  }

  function pushBack(g, c, dt) {
    const b = g.bear;
    if (c.shove <= 0) return;
    c.shove -= dt;
    if (b.climbing || (c.escort && g.once.badge)) { c.shove = 0; c.escort = null; return; }
    b.hiding = null; b.crouch = false; b.running = false;
    const v = SHOVE.v * Math.min(1, c.shove * 1.5 + 0.15);
    b.x += c.shoveDir * v * dt;
    b.vx = 0;
    b.dir = c.shoveDir;
    b.moving = true;
    b.walkT += dt * 0.8;
    b.trackX = Math.min(b.trackX, b.x);
    const p = c.escort;
    if (p) { p.x = b.x - c.shoveDir * SHOVE.hold; p.dir = c.shoveDir; p.pose = null; }
    if (c.shove <= 0) c.escort = null;
  }

  function police(g, c, p, dt) {
    const b = g.bear;
    p.t -= dt;
    const pass = g.once.badge;
    const busy = !!c.fan && (c.fan.phase === 'come' || c.fan.phase === 'give');
    if ((pass || busy) && (p.phase === 'whistle' || p.phase === 'push')) { p.phase = 'back'; p.t = 0.5; p.pose = 'idle'; }
    if (p.phase === 'watch') {
      if (p.beat) {
        p.pose = null;
        p.x += p.dir * p.speed * dt;
        if (p.x < p.from || p.x > p.to) { p.dir *= -1; p.x = Math.max(p.from, Math.min(p.to, p.x)); }
      } else if (p.t <= 0) {
        p.dir = p.dir < 0 && Math.random() < 0.35 ? 1 : -1;
        p.t = p.dir > 0 ? between(POLICE.look) : between(POLICE.turn);
      }
      if (seen(b, p, POLICE.ahead, POLICE.around) && c.shove <= 0 && !busy) {
        if (pass) {
          if (!p.waved && !g.once.waved) { p.waved = true; g.once.waved = true; rules().float(g, p.x, GY - 112, LABELS.capital.wave, COLORS.story); }
          return;
        }
        p.phase = 'whistle'; p.t = POLICE.whistle; p.dir = Math.sign(b.x - p.x) || -1; p.pose = 'idle';
        rules().float(g, p.x, GY - 112, LABELS.capital.whistle, COLORS.zap);
        rules().onSound(g, 'whistle', p.x);
      }
    } else if (p.phase === 'whistle') {
      if (p.t <= 0) { p.phase = 'push'; p.pose = null; }
    } else if (p.phase === 'push') {
      p.dir = Math.sign(b.x - p.x) || p.dir;
      p.x += p.dir * POLICE.walk * dt;
      if (Math.abs(b.x - p.x) < POLICE.reach) { shove(g, c, p.x, p); p.phase = 'back'; p.t = SHOVE.t + 0.4; }
      else if (b.covered || Math.abs(b.x - p.home) > 520) { p.phase = 'back'; p.t = POLICE.cool; }
    } else if (p.phase === 'back') {
      const to = p.beat ? Math.max(p.from, Math.min(p.to, p.x)) : p.home;
      if (p.t > 0) return;
      p.dir = Math.sign(to - p.x) || -1;
      p.x += p.dir * POLICE.back * dt;
      p.pose = null;
      if (Math.abs(to - p.x) < 4) { p.x = to; p.phase = 'watch'; p.dir = -1; p.pose = p.beat ? null : 'idle'; p.t = between(POLICE.turn); }
    }
  }

  function intern(g, c, p, dt) {
    const b = g.bear;
    p.t -= dt;
    if (p.phase === 'watch') {
      p.pose = 'idle'; p.texting = true;
      if (g.once.badge || c.fan || b.covered || b.climbing || Math.abs(b.x - p.x) > INTERN.sees) return;
      c.fan = p; p.phase = 'come'; p.texting = false;
      rules().float(g, p.x, GY - 116, LABELS.capital.fan, COLORS.story);
    } else if (p.phase === 'come') {
      p.dir = Math.sign(b.x - p.x) || 1;
      p.pose = null;
      p.x += p.dir * INTERN.walk * dt;
      if (Math.abs(b.x - p.x) < INTERN.reach) {
        p.phase = 'give'; p.t = INTERN.give; p.give = 0; p.pose = 'idle';
        rules().float(g, p.x, GY - 120, LABELS.capital.hand, COLORS.story);
      }
    } else if (p.phase === 'give') {
      p.dir = Math.sign(b.x - p.x) || p.dir;
      p.give = 1 - Math.max(0, p.t) / INTERN.give;
      if (p.t <= 0) { badge(g, p, false); rules().onSound(g, 'hug', b.x); p.phase = 'home'; p.give = null; p.pose = null; }
    } else if (p.phase === 'home') {
      p.dir = Math.sign(p.home - p.x) || 1;
      p.x += p.dir * INTERN.walk * dt;
      if (Math.abs(p.home - p.x) < 4) { p.x = p.home; p.phase = 'done'; p.dir = -1; }
    } else { p.pose = 'idle'; p.texting = true; }
  }

  function mp(g, c, p, dt) {
    const b = g.bear;
    if (p.pause > 0) p.pause -= dt;
    else {
      p.x += p.dir * p.speed * dt;
      if (p.x < p.from || p.x > p.to) { p.dir *= -1; p.x = Math.max(p.from, Math.min(p.to, p.x)); p.pause = 1.6; }
    }
    p.pose = p.pause > 0 ? 'idle' : null;
    if (!seen(b, p, MP.ahead, MP.around)) return;
    p.state = 'flee'; p.pose = null; p.capital = false; p.texting = false; p.dir = Math.sign(p.x - b.x) || 1;
    rules().spotted(g, p.x, GY - 104, LABELS.capital.mpScream);
    rules().addPanic(g, MP.panic);
    ZS.levelKit.add(g.level, 'rozok', p.x, { dropped: true });
    sayEvery(g, c, 'mp', 25, NEWS.capital.mpSeen);
  }

  function flinta(g, c, p, dt) {
    const b = g.bear, sees = seen(b, p, FLINTA.sees, 120);
    if (sees) p.seenAt = g.time;
    p.t -= dt;
    if (p.phase === 'pace') {
      p.pose = null;
      p.x += p.dir * p.speed * dt;
      if (p.x < p.from || p.x > p.to) { p.dir *= -1; p.x = Math.max(p.from, Math.min(p.to, p.x)); }
      if (Math.abs(b.x - p.x) < 520 && sayEvery(g, c, 'count', 7)) rules().float(g, p.x, GY - 112, LABELS.capital.count[Math.floor(g.time) % LABELS.capital.count.length], COLORS.story);
      if (sees) {
        p.phase = 'notice'; p.t = FLINTA.notice; p.pose = 'idle'; p.dir = Math.sign(b.x - p.x) || -1;
        rules().float(g, p.x, GY - 116, LABELS.capital.flintaGasp, COLORS.zap);
        rules().onSound(g, 'gasp', p.x);
      }
    } else if (p.phase === 'notice') {
      p.dir = Math.sign(b.x - p.x) || p.dir;
      if (p.t <= 0) { p.phase = 'cry'; p.t = FLINTA.sob; p.sobs = 0; sob(g, c, p); sayOnce(g, 'flintaCry', NEWS.capital.flintaCry, true); }
    } else if (p.phase === 'cry') {
      p.pose = 'idle';
      p.dir = Math.sign(b.x - p.x) || p.dir;
      if (g.time - p.seenAt > FLINTA.calm) { p.phase = 'pace'; return; }
      if (p.t <= 0) {
        p.t = FLINTA.sob;
        p.sobs++;
        sob(g, c, p);
        if (p.sobs >= FLINTA.sobs) { p.sobs = 0; guard(g, c, p); }
      }
    } else if (p.phase === 'leave') {
      p.pose = null; p.dir = 1; p.x += 46 * dt;
      if (p.x > site(g).corridor.door - 20) p.dead = true;
    }
  }

  function sob(g, c, p) {
    const list = LABELS.capital.sobs;
    rules().float(g, p.x, GY - 118, list[(p.sobIdx = ((p.sobIdx || 0) + 1)) % list.length], COLORS.story);
    rules().onSound(g, 'sob', p.x);
  }

  function guard(g, c, p) {
    rules().float(g, p.x + 60, GY - 136, LABELS.capital.guard, COLORS.bad);
    shove(g, c, p.x + 80);
    rules().addPanic(g, 4, NEWS.capital.flintaGuard);
  }

  function crew(g, c, dt) {
    const b = g.bear, S = site(g), k = c.crew;
    if (Math.abs(b.x - S.square.reporter) > 900) { k.phase = 'talk'; k.k = 0; return; }
    k.t -= dt;
    if (k.phase === 'talk' && k.t <= 0) { k.phase = 'warn'; k.t = CREW.warn; }
    else if (k.phase === 'warn' && k.t <= 0) { k.phase = 'pan'; k.t = between(CREW.pan); rules().onSound(g, 'camera', S.square.reporter); }
    else if (k.phase === 'pan' && k.t <= 0) { k.phase = 'talk'; k.t = between(CREW.talk); }
    k.k = k.phase === 'pan' ? Math.min(1, k.k + dt * 3) : k.phase === 'warn' ? 1 - k.t / CREW.warn : Math.max(0, k.k - dt * 2);
    if (k.phase !== 'pan' || b.covered || b.climbing) return;
    const d = S.square.reporter - 60 - b.x;
    if (d < 0 || d > CREW.range || g.time - k.seenAt < 4) return;
    k.seenAt = g.time;
    rules().spotted(g, b.x, GY - 120, LABELS.capital.live);
    rules().addPanic(g, CREW.panic, NEWS.capital.live, true);
    for (const p of g.people) if (p.kind === 'police' && !p.beat && p.phase === 'watch' && !g.once.badge) { p.phase = 'whistle'; p.t = POLICE.whistle; p.pose = 'idle'; }
  }

  function gate(g, c) {
    const b = g.bear, x = site(g).square.gate;
    if (g.once.badge || b.x < x - 26 || b.x > x + 60) return;
    b.x = x - 26;
    b.trackX = Math.min(b.trackX, b.x);
    if (b.vx > 0) b.vx = 0;
    if (g.time - c.gateAt > 3) { c.gateAt = g.time; rules().float(g, x, GY - 140, LABELS.capital.closed, COLORS.bad); rules().quip(g, QUIPS().capitalGate, true); }
  }

  function inDwarf(L, x) {
    return !!L.dwarf && L.dwarf.some(([a, z]) => x > a - 10 && x < z + 10);
  }

  function crouchCover(g, dt) {
    const b = g.bear;
    const inside = inDwarf(g.level, b.x) && passes().free(b);
    if (inside && b.crouch) {
      b.covered = true;
      const r = g.level.dwarf.find(([p, q]) => b.x > p - 10 && b.x < q + 10);
      const m = Math.min(30, (r[1] - r[0]) / 2), to = Math.max(r[0] + m, Math.min(r[1] - m, b.x));
      const k = g.input.keys, steer = k.has('ArrowLeft') || k.has('ArrowRight') || k.has('KeyA') || k.has('KeyD');
      if (!steer && Math.abs(to - b.x) > 0.5) { b.x += (to - b.x) * Math.min(1, dt * 10); b.trackX = b.x; }
    }
    b.thicket = inside && !b.covered;
  }

  function hall(g) {
    const b = g.bear, S = site(g);
    if (b.x > S.hall.frame && !g.once.frame) {
      g.once.frame = true;
      rules().onSound(g, 'zap', S.hall.frame);
      rules().float(g, S.hall.frame, GY - 150, LABELS.capital.beep, COLORS.zap);
      rules().float(g, S.hall.guard, GY - 112, LABELS.capital.metal, COLORS.story);
      rules().quip(g, QUIPS().capitalFrame, true);
      rules().say(g, NEWS.capital.frame);
    }
  }

  function cycle(o, T, quiet, warn, dt) {
    o.t -= dt;
    if (o.t > 0) return;
    if (o.state === quiet) { o.state = warn; o.t = T === COOK ? COOK.turn : HEAD.rise; }
    else if (o.state === warn) { o.state = 'look'; o.t = between(T === COOK ? COOK.look : HEAD.up); }
    else { o.state = quiet; o.t = between(T === COOK ? COOK.pot : HEAD.down); }
  }

  function bar(g, c, dt) {
    const S = site(g), b = g.bear, k = c.bar;
    if (b.x < S.bar.from - 400 || b.x > S.bar.to + 300) return;
    cycle(k.cook, COOK, 'pot', 'turn', dt);
    for (const h of k.heads) if (h.state !== 'sleep') cycle(h, HEAD, 'down', 'rise', dt);
    if (b.x > S.bar.from && sayOnce(g, 'bar', NEWS.capital.bar)) rules().quip(g, QUIPS().capitalBar, true);
    if (!b.eating) return;
    const h = k.heads.find((o) => Math.abs(o.x + 18 - b.x) < 40);
    if (!h || h.state !== 'look' || g.time - h.caughtAt < 5) return;
    h.caughtAt = g.time;
    const L = LABELS.capital.tipsy;
    rules().float(g, h.x, GY - 120, L[Math.floor(g.time * 3) % L.length], COLORS.story);
    rules().addPanic(g, 2);
  }

  function atCounter(g) {
    const c = on(g) && g.capital;
    return !!c && !c.bar.served && !g.once.chute && Math.abs(g.bear.x - site(g).bar.counter) < BAR.counter;
  }

  function knock(dur) {
    return { kind: 'knock', t: 0, dur, dir: 1, hit: false, target: null, done: false };
  }

  function order(g) {
    const c = g.capital, k = c.bar, S = site(g);
    if ((k.cook.state === 'look' || g.time < k.ban) && k.tries < BAR.tries) {
      if (g.time >= k.graceT) {
        k.tries++;
        k.ban = g.time + BAR.ban; k.graceT = g.time + BAR.grace;
        rules().spotted(g, S.bar.cook, GY - 120, k.tries < BAR.tries ? LABELS.capital.onlyMps : LABELS.capital.whatever);
        rules().addPanic(g, 2);
      }
      return knock(0.4);
    }
    k.served = true;
    rules().eat(g, { type: 'gulas', x: S.bar.counter, eaten: false });
    rules().float(g, S.bar.cook, GY - 130, k.tries >= BAR.tries ? LABELS.capital.whatever : LABELS.capital.served, COLORS.story);
    rules().say(g, NEWS.capital.gulas, true);
    rules().quip(g, QUIPS().capitalGulas, true);
    return knock(0.8);
  }

  function act(g, b) {
    if (!on(g)) return null;
    const S = site(g);
    if (atCounter(g)) return order(g);
    const k = g.capital.spy, T = S.tunnel;
    if (k.snack && Math.abs(b.x - T.spy) < SPY.reach) {
      if (k.state === 'look') { if (g.time - k.caughtAt > SPY.grace) { k.caughtAt = g.time; rules().spotted(g, T.spy, GY - 126, LABELS.capital.spyCaught); rules().addPanic(g, SPY.panic); } return knock(0.4); }
      k.snack = false;
      rules().eat(g, { type: 'sandwich', x: T.spy, eaten: false, labelKey: 'spySnack' });
      rules().say(g, NEWS.capital.spySnack, true);
      return knock(0.8);
    }
    const jewels = g.level.items.find((it) => it.vitrine && !it.eaten);
    if (jewels && Math.abs(b.x - S.castle.vitrine) < 40) {
      jewels.locked = false;
      rules().eat(g, jewels);
      rules().float(g, S.castle.vitrine, GY - 150, LABELS.capital.jewels, COLORS.story);
      rules().quip(g, QUIPS().capitalJewels, true);
      return knock(0.7);
    }
    if (!g.once.rozky && Math.abs(b.x - S.town.stall) < 46) {
      g.once.rozky = true;
      rules().eat(g, { type: 'rozok', x: S.town.stall, eaten: false, labelKey: 'rozky' });
      rules().float(g, S.town.stall, GY - 140, LABELS.capital.seller, COLORS.story);
      rules().say(g, NEWS.capital.rozky);
      return knock(0.7);
    }
    return null;
  }

  function near(g, key) {
    const b = g.bear, S = site(g);
    if (key === 'counter') return atCounter(g);
    if (key === 'vitrine') return g.level.items.some((it) => it.vitrine && !it.eaten) && Math.abs(b.x - S.castle.vitrine) < 40;
    if (key === 'stall') return !g.once.rozky && Math.abs(b.x - S.town.stall) < 46;
    if (key === 'spy') return !!g.capital && g.capital.spy.snack && Math.abs(b.x - S.tunnel.spy) < SPY.reach;
    return false;
  }

  function wet(g, x) {
    const R = g.level.river;
    return !!R && x > R.from + 18 && x < R.to - 18 && !g.level.stones.some((s) => Math.abs(s.x - x) < s.w / 2 + BACKWATER.foot);
  }

  function hop(g) {
    const R = g.level.river, b = g.bear;
    if (!on(g) || !R || !b.onGround || b.climbing || g.capital && g.capital.sink) return false;
    if (b.x < R.from - 90 || b.x > R.to - 10) return false;
    const next = g.level.stones.map((s) => s.x).concat(R.to + 30).find((x) => x > b.x + 12);
    return next !== undefined && next - b.x < BACKWATER.reach;
  }

  function backwater(g, c, dt) {
    const R = g.level.river, b = g.bear;
    if (!R) return;
    if (c.sink) {
      c.sink.t += dt;
      ZS.sim.passes.clearPresses(g);
      const u = Math.min(1, c.sink.t / BACKWATER.sink);
      Object.assign(b, { moving: true, running: false, vx: 0, vy: 0, onGround: true, x: c.sink.x + Math.sin(c.sink.t * 7) * 3, y: GY + BACKWATER.depth * u * u * (3 - 2 * u) });
      b.walkT += dt * 2.5;
      if (c.sink.t < BACKWATER.sink) return;
      c.sink = null;
      const x = R.from - 50;
      Object.assign(b, { x, trackX: Math.min(b.trackX, x), y: GY, dir: 1, stun: BACKWATER.stun });
      rules().addPanic(g, BACKWATER.panic);
      return;
    }
    if (!g.once.capHop && b.x > R.from - 160 && b.x < R.from) { g.once.capHop = true; rules().float(g, b.x, GY - 130, LABELS.capital.hop, COLORS.story); }
    if (!b.onGround || b.climbing || b.y < GY - 2 || !wet(g, b.x)) return;
    c.sink = { t: 0, x: b.x };
    ZS.sim.passes.quiet(b);
    rules().float(g, b.x, GY - 120, LABELS.cave.splash, COLORS.bad);
    rules().onSound(g, 'splash', b.x, 1);
    if (!c.said.splash) { c.said.splash = true; rules().quip(g, QUIPS().capitalSplash, true); }
  }

  function chute(g, c, dt) {
    const S = site(g), T = S.tunnel, b = g.bear, k = c.chute, h = T.hatch;
    if (k.phase === 'idle') {
      if (g.once.chute) { if (b.x < h - 10 && b.x > S.bar.from) { b.x = h - 10; b.trackX = Math.max(b.trackX, b.x); if (b.vx < 0) b.vx = 0; } return; }
      const door = S.bar.to - 26;
      if (b.x > door && b.x < T.from + 120) {
        b.x = door; if (b.vx > 0) b.vx = 0;
        if (g.time - (c.doorAt || -9) > 4) { c.doorAt = g.time; rules().float(g, door, GY - 150, LABELS.capital.hatchHint, COLORS.story); rules().onSound(g, 'door', door, 0.5); }
      }
      if (Math.abs(b.x - h) > 22 || !b.crouch || !b.onGround || b.climbing) return;
      k.phase = 'down'; k.t = CHUTE.down;
      rules().onSound(g, 'door', h);
    }
    k.t -= dt;
    ZS.sim.passes.clearPresses(g);
    Object.assign(b, { vx: 0, vy: 0, running: false, crouch: false, crawl: false, hiding: null, hideTree: null, hideBlend: 1, dir: 1, onGround: true, x: h, trackX: h, y: GY, moving: false });
    if (k.t > 0) return;
    k.phase = 'idle'; g.once.chute = true; b.hideBlend = 0; b.crouch = false; b.crawl = false;
    rules().onSound(g, 'thud', b.x, 0.5); rules().quip(g, QUIPS().capitalChute, true);
  }



  function elevator(g, c, dt) {
    const T = site(g).tunnel, b = g.bear, k = c.lift;
    if (g.once.liftUp) { if (b.x < LIFT.wall && b.x > T.exit - 200) { b.x = LIFT.wall; if (b.vx < 0) b.vx = 0; } return; }
    if (k.phase === 'idle') {
      if (!b.onGround || b.climbing || Math.abs(b.x - T.lift) > 18) return;
      k.phase = 'close'; k.t = LIFT.close;
      rules().onSound(g, 'door', T.lift);
    }
    k.t -= dt;
    ZS.sim.passes.clearPresses(g);
    Object.assign(b, { vx: 0, moving: false, running: false, crouch: false, hiding: null, dir: 1 });
    const out = k.phase === 'rise' || k.phase === 'open';
    b.x = out ? T.exit : T.lift;
    b.trackX = b.x;
    b.y = k.phase === 'rise' ? GY + LIFT.depth * (1 - ease(1 - k.t / LIFT.rise)) : GY;
    b.vy = 0; b.onGround = true;
    if (k.t > 0) return;
    if (k.phase === 'close') { k.phase = 'up'; k.t = LIFT.up; rules().onSound(g, 'bell', T.lift); }
    else if (k.phase === 'up') { k.phase = 'rise'; k.t = LIFT.rise; b.x = T.exit; b.trackX = b.x; b.y = GY + LIFT.depth; rules().onSound(g, 'beep', T.exit); }
    else if (k.phase === 'rise') { k.phase = 'open'; k.t = LIFT.open; b.y = GY; rules().onSound(g, 'door', T.exit); }
    else { k.phase = 'idle'; k.sinkAt = g.time; g.once.liftUp = true; rules().quip(g, QUIPS().capitalLift, true); }
  }

  function spy(g, c, dt) {
    const S = site(g).tunnel, b = g.bear, k = c.spy;
    if (b.x < S.from - 200 || b.x > S.to + 200) return;
    k.t -= dt;
    if (k.t <= 0) {
      if (k.state === 'listen') { k.state = 'turn'; k.t = SPY.turn; if (b.x > S.room[0] - 120 && b.x < S.room[1]) rules().float(g, S.spy, GY - 122, LABELS.capital.spyHm, COLORS.zap); }
      else if (k.state === 'turn') { k.state = 'look'; k.t = between(SPY.look); }
      else { k.state = 'listen'; k.t = between(SPY.listen); }
    }
    if (b.x > S.room[0] && sayOnce(g, 'capSpy', NEWS.capital.spy)) rules().quip(g, QUIPS().capitalSpy, true);
    if (b.bumpT > 0 && !b.crouch && !g.once.crawlTip && b.x < S.room[0] + 400) { g.once.crawlTip = true; rules().float(g, b.x, GY - 110, LABELS.capital.crawl, COLORS.zap); }
    if (k.state !== 'look' || b.covered || b.x < S.room[0] || b.x > S.room[1] || g.time - k.caughtAt < SPY.grace) return;
    k.caughtAt = g.time;
    rules().spotted(g, S.spy, GY - 126, LABELS.capital.spyCaught);
    rules().addPanic(g, SPY.panic, NEWS.capital.spyCaught, true);
  }

  function cumil(g, c) {
    const b = g.bear, x = g.level.manhole;
    if (g.once.cumil || !b.crouch || !b.covered || Math.abs(b.x - x) > 26) return;
    g.once.cumil = true;
    g.stats.selfies++;
    rules().onSound(g, 'camera', b.x);
    rules().float(g, b.x, GY - 110, LABELS.capital.cumil, COLORS.love);
    rules().say(g, NEWS.capital.cumil, true);
    rules().quip(g, QUIPS().capitalCumil, true);
  }

  function beaver(g, c, dt) {
    const b = g.bear, k = c.beaver, t = g.level.trees.find((o) => o.beaver);
    if (!t || k.fell) return;
    if (k.phase === 'idle') { if (Math.abs(b.x - t.x) < BEAVER.near) { k.phase = 'gnaw'; k.t = BEAVER.gnaw; } return; }
    k.t -= dt;
    if (k.phase === 'gnaw' && k.t <= 0) { k.phase = 'warn'; k.t = BEAVER.warn; rules().float(g, t.x, GY - 120, LABELS.capital.creak, COLORS.zap); rules().onSound(g, 'creak', t.x); }
    else if (k.phase === 'warn' && k.t <= 0) fell(g, c, t);
  }

  function fell(g, c, t) {
    const L = g.level, b = g.bear;
    c.beaver.fell = true; c.beaver.phase = 'down'; c.beaver.at = g.time;
    L.trees.splice(L.trees.indexOf(t), 1);
    L.coverSpots = null;
    L.logs.push({ x: t.x + 70, w: 120, h: 30, felled: true });
    if (b.hiding === t || b.hideTree === t) { b.hiding = null; b.hideTree = null; b.hideBlend = 0; b.covered = false; }
    if (b.climbing === t) { b.climbing = null; b.onGround = false; b.vy = 0; b.offTree = true; }
    rules().onSound(g, 'crash', t.x);
    rules().say(g, NEWS.capital.beaver, true);
    if (Math.abs(b.x - t.x) < 400) rules().quip(g, QUIPS().capitalBeaver, true);
  }



  function indoors(g) {
    const S = site(g), b = g.bear, a = S.inside.from - 80, z = S.tunnel.to + 60;
    const inside = b.x > S.square.gate - 40 && b.x < z;
    if (inside) g.liftCalm = Math.max(g.liftCalm || 0, g.time + 0.8);
    for (const s of g.shooters) {
      if (s.react) continue;
      if (inside || (s.x > a && s.x < z)) {
        const out = Math.min(s.x, S.square.cordon[0] - 600);
        if (s.x > a - 600 && s.x < z + 600) { s.x = out; if (s.from !== undefined && s.from !== null) { s.from = Math.min(s.from, out); s.to = Math.max(s.to, out); } }
        s.lock = 0; s.alertX = null;
      }
    }
  }

  function uniforms(g) {
    const L = site(g).luh.from;
    for (const s of g.shooters) s.outfit = s.kind === 'walker' && s.x < L ? 'guard' : undefined;
  }

  function flagpole(g) {
    const b = g.bear;
    if (g.once.flagTop || !b.climbing || !b.climbing.pole || !b.inCanopy) return;
    g.once.flagTop = true;
    if (g.capital) g.capital.flagAt = g.time;
    rules().quip(g, QUIPS().capitalFlag, true);
    rules().say(g, NEWS.capital.flag, true);
  }

  function sections(g) {
    const b = g.bear, S = site(g);
    if (b.x > S.castle.gate) sayOnce(g, 'capCastle', NEWS.capital.castle);
    if (b.x > S.square.from + 80) sayOnce(g, 'capSquare', NEWS.capital.square);
    if (b.x > S.town.from + 100) sayOnce(g, 'capTown', NEWS.capital.town);
    if (b.x > S.luh.from + 100 && sayOnce(g, 'capLuh', NEWS.capital.luh)) rules().quip(g, QUIPS().capitalLuh, true);
  }

  function person(g, p, dt) {
    if (!on(g)) return false;
    const c = state(g);
    if (p.kind === 'police') police(g, c, p, dt);
    else if (p.kind === 'intern') intern(g, c, p, dt);
    else if (p.kind === 'mp') mp(g, c, p, dt);
    else if (p.kind === 'flinta') flinta(g, c, p, dt);
    return true;
  }

  function hugged(g, human) {
    if (!on(g)) return;
    if (human.kind === 'intern') badge(g, human, false);
    if (human.kind === 'flinta') {
      g.once.flinta = 'hug'; g.once.card = true;
      human.phase = 'leave';
      rules().float(g, human.x, GY - 140, LABELS.capital.card, COLORS.story);
      rules().say(g, NEWS.capital.flintaHug, true);
    }
  }

  function badge(g, human, bit) {
    if (g.once.badge) return;
    g.once.badge = true;
    if (g.capital) g.capital.badgeAt = g.time;
    rules().float(g, human.x, GY - 150, LABELS.capital.badge, COLORS.story);
    rules().say(g, bit ? NEWS.capital.badgeBite : NEWS.capital.badge, true);
    rules().quip(g, QUIPS().capitalBadge, true);
  }

  function bitten(g, human) {
    if (!on(g)) return false;
    if (human.kind === 'intern') badge(g, human, true);
    if (human.kind === 'flinta') { g.once.flinta = 'bite'; g.once.card = true; }
    human.capital = false;
    human.state = 'flee';
    human.clutch = true;
    human.dir = human.kind === 'flinta' ? 1 : human.dir;
    return true;
  }

  function release(g, human) {
    if (!on(g) || !human.capital) return false;
    if (human.kind === 'flinta') { human.react = null; human.phase = 'leave'; human.state = 'walk'; return true; }
    if (human.kind === 'police') { human.react = null; human.state = 'walk'; human.phase = 'back'; human.t = 2.2; human.pose = 'idle'; return true; }
    if (human.kind === 'intern') { human.react = null; human.capital = false; human.state = 'walk'; human.leaving = true; human.dir = 1; human.texting = true; return true; }
    return false;
  }

  function spotted(g, p) {
    return on(g) && !!p.capital;
  }

  function update(g, dt) {
    if (!on(g)) return;
    const c = state(g);
    g.bear.press = !!g.once.badge;
    crouchCover(g, dt);
    pushBack(g, c, dt);
    gate(g, c);
    crew(g, c, dt);
    hall(g);
    bar(g, c, dt);
    spy(g, c, dt);
    chute(g, c, dt);
    if (g.once.chute && g.level.cave.low[0][0] === site(g).tunnel.hatch - 50) { g.level.cave.low = g.level.cave.low.slice(1); g.level.caveRoofs = null; }
    backwater(g, c, dt);
    elevator(g, c, dt);
    cumil(g, c);
    beaver(g, c, dt);
    indoors(g);
    uniforms(g);
    flagpole(g);
    sections(g);
  }

  function toward(b, x) {
    const d = x - b.x;
    if (Math.abs(d) < 44 && (Math.sign(d) === b.dir || Math.abs(d) < 8)) return b.act ? 'wait' : 'hug';
    return d > 0 ? 'right' : 'left';
  }

  function stairway(g) {
    if (!on(g) || g.once.chute) return null;
    const S = site(g), b = g.bear, h = S.tunnel.hatch;
    if (b.x < S.bar.from || b.x > S.bar.to + 10) return null;
    if (Math.abs(b.x - h) < 14) return 'duck';
    return b.x > h + 14 ? 'left' : null;
  }

  function bot(g) {
    if (!on(g) || !g.capital) return null;
    const b = g.bear, S = site(g), c = g.capital;
    if (c.shove > 0) return 'wait';
    if (!g.once.badge && b.x > S.square.pen[0] && b.x < S.square.gate) {
      const it = g.people.find((p) => p.kind === 'intern' && p.capital && !p.react);
      if (it) return toward(b, it.x);
    }
    const fl = g.people.find((p) => p.kind === 'flinta' && p.capital && (p.phase === 'cry' || p.phase === 'notice'));
    if (fl) return toward(b, fl.x);
    if (atCounter(g)) return c.bar.cook.state === 'pot' || c.bar.tries >= BAR.tries ? 'order' : 'wait';
    if ((near(g, 'vitrine') || near(g, 'stall')) && !ZS.sim.encounters.target(g)) return 'order';
    const T = S.tunnel, k = c.spy;
    if (b.x > T.room[0] - 140 && b.x < T.room[1] && k.state !== 'listen') return Math.abs(b.x - T.cabinet) < 20 ? 'duck' : b.x < T.room[0] ? 'wait' : T.cabinet > b.x ? 'right' : 'left';
    if (near(g, 'spy') && k.state === 'listen') return 'order';
    if (c.crew.phase !== 'talk' && b.x < S.square.reporter && b.x > S.square.reporter - CREW.range - 80 && !b.covered) return 'duck';
    if (!g.once.badge && b.x > S.square.cordon[0] - 340 && b.x < S.square.gate) {
      const cop = g.people.find((p) => p.kind === 'police' && !p.beat && (p.phase === 'whistle' || p.phase === 'push' || (p.dir > 0 && Math.abs(p.x - b.x) < POLICE.ahead)));
      if (cop) return 'duck';
    }
    const cop = g.people.find((p) => p.kind === 'police' && p.beat && p.dir === Math.sign(b.x - p.x) && Math.abs(p.x - b.x) < POLICE.ahead + 40 && !g.once.badge);
    if (cop && inDwarf(g.level, b.x)) return 'duck';
    const mpNear = g.people.find((p) => (p.kind === 'mp' || p.kind === 'flinta') && p.capital && Math.abs(p.x - b.x) < 330 && p.dir === Math.sign(b.x - p.x));
    if (mpNear && g.level.covers.some((o) => Math.abs(o.x - b.x) < o.w / 2 + 20)) return 'hide';
    return null;
  }

  ZS.sim.passes.register('capital', {
    vote: { mod: () => ZS.sim.plenary, sound: 'door' },
    boat: { mod: () => ZS.sim.boat, sound: 'door' },
  });

  ZS.sim.capital = { POLICE, CREW, FLINTA, COOK, HEAD, BEAVER, SPY, LIFT, CHUTE, BACKWATER, hop, stairway, update, person, hugged, bitten, release, spotted, act, atCounter, near, inDwarf, state, bot };
})();
