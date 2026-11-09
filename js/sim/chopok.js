(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const QUIPS = () => ZS.QUIPS;

  const FOG = { clear: [7, 10], near: [3, 5], coming: 3, thick: [5, 8], thinning: 2.5, dense: 0.7, sees: 90 };
  const WIND = { calm: [7, 11], warn: 1.6, gust: 2.2, push: 130 };
  const COOK = { pot: [2.2, 3.6], turn: 1.1, look: [1.5, 2.4] };
  const GUEST = { calm: [4.5, 8], zip: 1.2, look: [1, 1.6] };
  const CHAMOIS = { near: 260, leap: 0.6, hop: 110, leaps: 5 };
  const MARMOT = { near: 300, hide: 1.2 };
  const CHATA = { counter: 26, bill: 2.8, said: 20, grace: 2, ban: 5 };
  const TATIER = { range: 320, close: 80, every: 12, panic: 12 };
  const RESCUER = { panic: 6 };

  const between = (r) => r[0] + Math.random() * (r[1] - r[0]);
  const on = (g) => !!g.level && g.level.id === 'chopok' && !g.level.stage;

  function state(g) {
    if (g.chopok) return g.chopok;
    const L = g.level;
    g.chopok = {
      fog: { phase: 'clear', t: between(FOG.clear), k: 0 },
      wind: { phase: 'calm', t: between(WIND.calm), k: 0 },
      chata: {
        cook: { state: 'pot', t: between(COOK.pot) },
        guests: L.chata.queue.map((x, i) => ({ x, look: i % 4, state: 'calm', t: between(GUEST.calm) + i })),
        served: false, bill: 0, caughtAt: -99, saidAt: -99,
      },
      chamois: L.wildlife.chamois.map(([x, dir], i) => ({ id: 'chopokChamois' + i, x, h: 0, home: i, dir, state: 'graze', leap: null, land: 0, snortAt: -99, leaps: 0 })),
      marmots: L.wildlife.marmots.map(([x, h], i) => ({ id: 'chopokMarmot' + i, x, h, k: 1, state: i % 2 ? 'graze' : 'sit', dir: i % 2 ? -1 : 1, whistleAt: -99, t: 0 })),
      tatier: { x: L.tatier.x, seenAt: -99, seen: false, passed: false },
      said: {},
    };
    return g.chopok;
  }

  function sayOnce(g, key, news, hot) {
    if (g.once[key]) return false;
    g.once[key] = true;
    rules().say(g, news, hot);
    return true;
  }

  function sayEvery(g, c, key, every, news, hot) {
    if (g.time - (c.said[key] === undefined ? -999 : c.said[key]) < every) return;
    c.said[key] = g.time;
    rules().say(g, news, hot);
  }

  function free(b) {
    return b.onGround && !b.climbing && !b.act && !(b.stun > 0);
  }

  function inDwarf(L, x) {
    return !!L.dwarf && L.dwarf.some(([a, z]) => x > a - 10 && x < z + 10);
  }

  function pines(g) {
    const b = g.bear;
    const inside = inDwarf(g.level, b.x) && free(b);
    if (inside && b.crouch) b.covered = true;
    b.thicket = inside && !b.covered;
  }

  function observers(g) {
    const out = [];
    for (const s of g.shooters) if (!s.react) out.push(s.x);
    for (const p of g.people) if (p.state !== 'flee') out.push(p.x);
    return out;
  }

  function fog(g, c, dt) {
    const L = g.level, b = g.bear, f = c.fog;
    b.fogged = false;
    if (b.x < L.fog.from - 300) { f.phase = 'clear'; f.k = Math.max(0, f.k - dt); return; }
    f.t -= dt;
    if (f.phase === 'clear' && f.t <= 0) {
      f.phase = 'coming'; f.t = FOG.coming;
      if (b.x > L.fog.from) rules().float(g, b.x, GY - 150, LABELS.chopok.fogIn, COLORS.story);
    } else if (f.phase === 'coming' && f.t <= 0) {
      f.phase = 'thick'; f.t = between(FOG.thick);
      if (b.x > L.fog.from && !sayOnce(g, 'fog', NEWS.fogRoll)) rules().quip(g, QUIPS().fog);
    } else if (f.phase === 'thick' && f.t <= 0) {
      f.phase = 'thinning'; f.t = FOG.thinning;
      if (b.x > L.fog.from) rules().float(g, b.x, GY - 150, LABELS.chopok.fogOut, COLORS.bad);
    } else if (f.phase === 'thinning' && f.t <= 0) {
      f.phase = 'clear'; f.t = between(b.x > L.crest.to - 300 ? FOG.near : FOG.clear);
    }
    f.k = f.phase === 'coming' ? 1 - f.t / FOG.coming : f.phase === 'thick' ? 1 : f.phase === 'thinning' ? f.t / FOG.thinning : 0;
    if (f.k < FOG.dense || b.x < L.fog.from || b.climbing) return;
    if (observers(g).some((x) => Math.abs(x - b.x) < FOG.sees)) return;
    b.fogged = true;
    b.covered = true;
  }

  function wind(g, c, dt) {
    const L = g.level, b = g.bear, w = c.wind;
    if (b.x < L.wind.from) { w.phase = 'calm'; w.k = Math.max(0, w.k - dt * 2); return; }
    w.t -= dt;
    if (w.phase === 'calm' && w.t <= 0) {
      w.phase = 'warn'; w.t = WIND.warn;
      rules().float(g, b.x, GY - 140, LABELS.chopok.gust, COLORS.zap);
    } else if (w.phase === 'warn' && w.t <= 0) {
      w.phase = 'gust'; w.t = WIND.gust;
      rules().onSound(g, 'leaves', b.x, 0.5);
    } else if (w.phase === 'gust' && w.t <= 0) {
      w.phase = 'calm'; w.t = between(WIND.calm);
    }
    w.k = w.phase === 'gust' ? 1 : w.phase === 'warn' ? 0.35 * (1 - w.t / WIND.warn) : Math.max(0, w.k - dt * 2);
    if (w.phase !== 'gust' || !free(b) || b.crouch || b.hiding || b.covered) return;
    b.x = Math.max(L.wind.from, b.x - WIND.push * dt);
    b.trackX = Math.min(b.trackX, b.x);
    if (!sayOnce(g, 'wind', NEWS.windGust)) return;
    rules().quip(g, QUIPS().wind, true);
  }

  function spotted(g, person) {
    if (!on(g)) return false;
    const c = state(g);
    if (person.kind === 'rescuer') {
      person.filmCd = Infinity;
      rules().spotted(g, person.x, GY - 100, LABELS.chopok.hello);
      rules().addPanic(g, RESCUER.panic);
      rules().quip(g, QUIPS().rescuer, true);
      sayEvery(g, c, 'rescuer', 40, NEWS.rescuerSeen);
      return true;
    }
    return false;
  }

  function inQueue(L, x) {
    return x > L.chata.door && x < L.chata.counter + 14;
  }

  function watchers(g, c) {
    const b = g.bear, k = c.chata;
    if (k.cook.state === 'look') return 'cook';
    return k.guests.some((p) => p.state === 'look' && p.x > b.x + 8) ? 'guest' : null;
  }

  function cycle(o, T, dt) {
    o.t -= dt;
    if (o.t > 0) return;
    const quiet = T === COOK ? 'pot' : 'calm', warn = T === COOK ? 'turn' : 'zip';
    if (o.state === quiet) { o.state = warn; o.t = T === COOK ? COOK.turn : GUEST.zip; }
    else if (o.state === warn) { o.state = 'look'; o.t = between(T.look); }
    else { o.state = quiet; o.t = between(T === COOK ? COOK.pot : GUEST.calm); }
  }

  function chata(g, c, dt) {
    const L = g.level, b = g.bear, k = c.chata;
    const close = b.x > L.chata.from - 300 && b.x < L.chata.to + 300;
    k.bill = Math.max(0, k.bill - dt);
    if (!close) return;
    cycle(k.cook, COOK, dt);
    for (const p of k.guests) cycle(p, GUEST, dt);
    if (!inQueue(L, b.x) || (k.served && b.x > L.chata.counter - 40)) return;
    if (!g.once.queue) { g.once.queue = true; rules().float(g, b.x, GY - 140, LABELS.chopok.queue, COLORS.story); }
    if (g.time < k.graceT) return;
    const who = b.moving ? watchers(g, c) : null;
    if (who) caught(g, c, who);
  }

  function caught(g, c, who) {
    const L = g.level, b = g.bear, k = c.chata;
    rules().spotted(g, who === 'cook' ? L.chata.cook : b.x + 30, GY - 120, who === 'cook' ? LABELS.chopok.caught : LABELS.chopok.next);
    k.caughtAt = g.time;
    k.graceT = g.time + CHATA.grace;
    k.ban = g.time + CHATA.ban;
    k.caught = (k.caught || 0) + 1;
    rules().addPanic(g, 2);
    rules().quip(g, QUIPS().chata, true);
    if (g.time - k.saidAt > CHATA.said) { k.saidAt = g.time; rules().say(g, NEWS.chataCaught); }
  }

  function atCounter(g) {
    const c = on(g) && g.chopok;
    return !!c && !c.chata.served && Math.abs(g.bear.x - g.level.chata.counter) < CHATA.counter;
  }

  function act(g, b) {
    if (!atCounter(g)) return null;
    const c = g.chopok, k = c.chata, L = g.level;
    if (k.cook.state === 'look' || g.time < (k.ban || 0)) {
      if (g.time >= (k.graceT || 0)) caught(g, c, 'cook');
      return { kind: 'knock', t: 0, dur: 0.4, dir: 1, hit: false, target: null, done: false };
    }
    k.served = true;
    k.bill = CHATA.bill;
    rules().eat(g, { type: 'kapustnica', x: L.chata.counter, eaten: false });
    rules().say(g, NEWS.chataServed, true);
    rules().quip(g, QUIPS().chata, true);
    return { kind: 'knock', t: 0, dur: 0.8, dir: 1, hit: false, target: null, done: false };
  }

  function tatier(g, c) {
    const b = g.bear, m = c.tatier;
    if (b.x < m.x - 700 || m.passed) return;
    if (b.x > m.x + 60) {
      m.passed = true;
      if (!m.seen) { rules().say(g, NEWS.tatierFog, true); rules().quip(g, QUIPS().tatier, true); }
      return;
    }
    const d = Math.abs(b.x - m.x);
    const sees = !b.covered && c.fog.k < FOG.dense && (d < TATIER.close || (b.x < m.x && d < TATIER.range));
    if (!sees || g.time - m.seenAt < TATIER.every) return;
    m.seenAt = g.time; m.seen = true;
    rules().spotted(g, m.x, GY - 130, LABELS.chopok.inShot);
    rules().addPanic(g, TATIER.panic, NEWS.tatierSeen, true);
    ZS.sim.hunters.alert(g, b.x);
  }

  function wildlife(g, c, dt) {
    const b = g.bear;
    for (const k of c.chamois) {
      if (k.state === 'graze' && Math.abs(b.x - k.x) < CHAMOIS.near && !b.covered) {
        k.state = 'flee'; k.dir = Math.sign(k.x - b.x) || 1; k.snortAt = g.time;
        rules().onSound(g, 'chamois', k.x);
        sayEvery(g, c, 'chamois', 40, NEWS.chamois);
      }
      if (k.state !== 'flee' || k.leaps >= CHAMOIS.leaps) continue;
      if (!k.leap) k.leap = { wait: 0.15, t: 0 };
      if (k.leap.wait > 0) { k.leap.wait -= dt; continue; }
      k.leap.t += dt / CHAMOIS.leap;
      k.x += k.dir * CHAMOIS.hop * dt / CHAMOIS.leap;
      if (k.leap.t >= 1) { k.leap = null; k.land = g.time; k.leaps++; if (k.leaps >= CHAMOIS.leaps) k.state = 'alert'; }
    }
    for (const m of c.marmots) {
      if (m.state !== 'alarm' && Math.abs(b.x - m.x) < MARMOT.near) {
        m.state = 'alarm'; m.whistleAt = g.time; m.t = MARMOT.hide;
        rules().onSound(g, 'marmot', m.x);
        sayEvery(g, c, 'marmot', 40, NEWS.marmot);
      }
      if (m.state === 'alarm' && (m.t -= dt) <= 0) m.k = Math.max(0, m.k - dt * 3);
    }
  }

  function summit(g) {
    const b = g.bear, L = g.level;
    if (b.x > L.concrete.from + 120 && b.x < L.concrete.to) sayOnce(g, 'parking', NEWS.parkingBear);
    if (b.x > L.cave.land + 200 && b.x < L.jasna.to) sayOnce(g, 'ice', NEWS.caveIce);
    if (b.x > L.crest.from && !g.once.ridge) { g.once.ridge = true; rules().quip(g, QUIPS().ridge, true); }
    if (b.x > L.dumbier.book - 20 && !g.once.book) {
      g.once.book = true;
      rules().float(g, L.dumbier.book, GY - 120, LABELS.chopok.book, COLORS.story);
      rules().say(g, NEWS.summitBook, true);
      rules().quip(g, QUIPS().dumbier, true);
    }
  }

  ZS.sim.passes.register('chopok', {
    cave: { mod: () => ZS.sim.cave, sound: 'scree' },
    funi: { mod: () => ZS.sim.cabin, sound: 'door' },
  });

  function update(g, dt) {
    if (!on(g)) return;
    const c = state(g);
    pines(g);
    fog(g, c, dt);
    wind(g, c, dt);
    chata(g, c, dt);
    tatier(g, c);
    wildlife(g, c, dt);
    summit(g);
  }

  function duck(g) {
    if (!on(g) || !g.chopok) return false;
    const c = g.chopok, b = g.bear;
    return c.wind.phase !== 'calm' && b.x > g.level.wind.from;
  }

  function queue(g) {
    if (!on(g) || !g.chopok) return null;
    const c = g.chopok, k = c.chata, b = g.bear, L = g.level;
    if (!inQueue(L, b.x + 20) || (k.served && b.x > L.chata.counter - 40)) return null;
    if (atCounter(g)) return k.cook.state === 'pot' ? 'order' : 'wait';
    const risky = k.cook.state !== 'pot' || k.guests.some((p) => p.state !== 'calm' && p.x > b.x - 30);
    return risky ? 'wait' : 'go';
  }

  ZS.sim.chopok = { FOG, WIND, update, between, inDwarf, spotted, atCounter, act, duck, queue, state };
})();
