(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const QUIPS = () => ZS.QUIPS;

  const PASS = { close: 0.8, open: 0.8, calm: 1.8 };
  const FOG = { clear: [7, 10], near: [3, 5], coming: 3, thick: [5, 8], thinning: 2.5, dense: 0.7, sees: 90 };
  const WIND = { calm: [7, 11], warn: 1.6, gust: 2.2, push: 130 };
  const BIKE = { every: [6, 9], speed: 330, warn: 2.1, reach: 30, hop: 0.55, stun: 0.9, kick: -240, said: 25 };
  const COOK = { pot: [2.2, 3.6], turn: 1.1, look: [1.5, 2.4] };
  const GUEST = { calm: [4.5, 8], zip: 1.2, look: [1, 1.6] };
  const CHAMOIS = { near: 260, leap: 0.6, hop: 110, leaps: 5 };
  const MARMOT = { near: 300, hide: 1.2 };
  const CHATA = { counter: 26, bill: 2.8, said: 20 };
  const MINISTER = { range: 320, close: 80, every: 12, panic: 12 };
  const RESCUER = { panic: 6 };

  const between = (r) => r[0] + Math.random() * (r[1] - r[0]);
  const on = (g) => !!g.level && g.level.id === 'chopok' && !g.level.stage;
  const ours = (g) => !!g.level && g.level.id === 'chopok' && !!g.chopok && !!g.chopok.pass;

  function state(g) {
    if (g.chopok) return g.chopok;
    const L = g.level;
    g.chopok = {
      pass: null,
      fog: { phase: 'clear', t: between(FOG.clear), k: 0 },
      wind: { phase: 'calm', t: between(WIND.calm), k: 0 },
      bikes: [], bikeT: 2,
      chata: {
        cook: { state: 'pot', t: between(COOK.pot) },
        guests: L.chata.queue.map((x, i) => ({ x, look: i % 4, state: 'calm', t: between(GUEST.calm) + i })),
        served: false, bill: 0, caughtAt: -99, saidAt: -99,
      },
      chamois: L.wildlife.chamois.map(([x, dir], i) => ({ id: 'chopokChamois' + i, x, h: 0, home: i, dir, state: 'graze', leap: null, land: 0, snortAt: -99, leaps: 0 })),
      marmots: L.wildlife.marmots.map(([x, h], i) => ({ id: 'chopokMarmot' + i, x, h, k: 1, state: i % 2 ? 'graze' : 'sit', dir: i % 2 ? -1 : 1, whistleAt: -99, t: 0 })),
      minister: { x: L.dumbier.minister, crew: L.dumbier.crew, seenAt: -99, seen: false, passed: false },
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

  function passing(g) {
    return ours(g);
  }

  const KEEP = ['shooters', 'people', 'dogs', 'sheep', 'deer', 'drones', 'props', 'tracks'];
  const STAGES = { cave: () => ZS.sim.cave, funi: () => ZS.sim.cabin };

  function enter(g, c) {
    const b = g.bear;
    if (!free(b) || b.hiding || b.y < GY - 2) return false;
    for (const p of g.level.passes) {
      if (g.once[p.key] || b.x < p.from || b.x >= p.to) continue;
      c.pass = { key: p.key, to: p.to, door: p.from, phase: 'close', t: 0, main: null, play: null };
      quiet(b);
      rules().onSound(g, p.key === 'cave' ? 'scree' : 'door', b.x, 0.6);
      return true;
    }
    return false;
  }

  function quiet(b) {
    Object.assign(b, { act: null, hiding: null, crouch: false, running: false, moving: false, eating: false, eatT: 0, vx: 0, slide: 0, covered: false, warn: false, danger: false, reach: null, push: 0, kx: 0, crawl: false, vy: 0 });
  }

  function clearPresses(g) {
    const inp = g.input;
    inp.jumpPressed = false; inp.bitePressed = false; inp.hugPressed = false; inp.downReleased = false;
  }

  function swapIn(g, p) {
    const b = g.bear, mod = STAGES[p.key](), S = mod.stage();
    p.main = { level: g.level, x: b.x };
    for (const k of KEEP) { p.main[k] = g[k]; g[k] = []; }
    g.level = S;
    g.particles = []; g.floaters = []; g.shots = []; g.bubble = null;
    quiet(b);
    Object.assign(b, { x: S.start, trackX: S.start, dir: 1, y: GY, onGround: true, hideBlend: 0, hideTree: null, spot: null, thin: null, stun: 0, climbing: null, inCanopy: false });
    p.play = mod.start(g, S);
    p.phase = 'open'; p.t = 0;
  }

  function banish(g, p) {
    const M = p.main;
    if (!M) return;
    for (const k of ['shooters', 'drones']) {
      for (const o of g[k]) {
        const dx = p.to + 500 - o.x;
        o.x += dx;
        if (o.from !== null && o.from !== undefined) { o.from += dx; o.to += dx; }
        if (o.cross !== undefined) o.cross += dx;
        M[k].push(o);
      }
      g[k] = [];
    }
  }

  function swapOut(g, p) {
    const M = p.main;
    banish(g, p);
    g.level = M.level;
    for (const k of KEEP) g[k] = M[k];
    g.particles = []; g.floaters = []; g.shots = []; g.bubble = null;
    p.main = null;
    land(g, p);
    p.phase = 'back'; p.t = 0;
  }

  function land(g, p) {
    const b = g.bear;
    g.once[p.key] = true;
    quiet(b);
    Object.assign(b, { x: p.to, trackX: p.to, dir: 1, y: GY, onGround: true, hideBlend: 0, hideTree: null, stun: 0, spot: null, thin: null });
    for (const s of g.shooters) { s.lock = 0; s.reload = Math.max(s.reload, PASS.calm + PASS.open); s.alertX = null; }
    g.liftCalm = g.time + PASS.calm + PASS.open;
    g.lastKnown = null;
    g.tracks.length = 0;
  }

  function stepPass(g, dt) {
    const c = g.chopok, p = c.pass, b = g.bear;
    p.t += dt;
    b.inv = Math.max(0, b.inv - dt);
    b.quipCd -= dt;
    b.warn = false;
    if (p.phase === 'play') {
      banish(g, p);
      if (STAGES[p.key]().update(g, p.play, dt)) { p.phase = 'shut'; p.t = 0; quiet(b); }
      return;
    }
    clearPresses(g);
    b.moving = false;
    if (p.phase === 'close') {
      b.x += 40 * dt; b.walkT += dt; b.moving = true;
      if (p.t >= PASS.close) swapIn(g, p);
    } else if (p.phase === 'open') {
      b.x += 50 * dt; b.walkT += dt; b.moving = true; b.trackX = b.x;
      if (p.t >= PASS.open) { p.phase = 'play'; p.t = 0; b.moving = false; }
    } else if (p.phase === 'shut') {
      STAGES[p.key]().idle(g, p.play, dt);
      if (p.t >= PASS.close) swapOut(g, p);
    } else if (p.phase === 'back') {
      b.x += 50 * dt; b.walkT += dt; b.moving = true; b.trackX = b.x;
      if (p.t >= PASS.open) { c.pass = null; b.moving = false; }
    }
  }

  function inside(g) {
    const p = ours(g) && g.chopok.pass;
    return !!p && (p.phase === 'open' || p.phase === 'play' || p.phase === 'shut');
  }

  function trip(g) {
    const p = g.chopok && g.chopok.pass;
    if (!p || !p.main) return null;
    const S = g.level, k = Math.max(0, Math.min(1, g.bear.x / S.w));
    return (p.door + (p.to - p.door) * k) / p.main.level.goalDen;
  }

  function walls(g) {
    if (!on(g)) return;
    const b = g.bear;
    for (const p of g.level.passes) if (g.once[p.key] && b.x < p.wall) { b.x = p.wall; b.trackX = Math.max(b.trackX, p.wall); if (b.vx < 0) b.vx = 0; }
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

  function bikes(g, c, dt) {
    const L = g.level, b = g.bear, [from, to] = L.jasna.bikes;
    const near = b.x > from - 100 && b.x < to;
    c.bikeT -= dt;
    if (near && c.bikeT <= 0 && !c.bikes.length) {
      c.bikeT = between(BIKE.every);
      c.bikes.push({ x: b.x + BIKE.speed * BIKE.warn, dir: -1, hop: 0, done: false, crash: 0, look: Math.floor(Math.random() * 4) });
      rules().onSound(g, 'knock', b.x + 300, 0.4);
    }
    for (const k of c.bikes) {
      k.x += k.dir * BIKE.speed * dt * (k.crash > 0 ? 0.4 : 1);
      k.hop = Math.max(0, k.hop - dt);
      k.crash = Math.max(0, k.crash - dt);
      if (k.done || Math.abs(k.x - b.x) > BIKE.reach || !b.onGround || b.climbing) continue;
      k.done = true;
      if (b.hiding) continue;
      if (b.crouch) {
        k.hop = BIKE.hop;
        rules().float(g, b.x, GY - 120, LABELS.chopok.bikeHop, COLORS.good);
        if (g.time - (c.said.hop || -99) > BIKE.said) { c.said.hop = g.time; rules().say(g, NEWS.bikeHop); }
        continue;
      }
      k.crash = 0.8;
      b.stun = BIKE.stun; b.kx = BIKE.kick; b.act = null; b.eating = false;
      rules().onSound(g, 'hit', b.x, 0.5);
      rules().float(g, b.x, GY - 120, LABELS.chopok.bikeHit, COLORS.bad);
      rules().quip(g, QUIPS().bike, true);
      if (g.time - (c.said.bike || -99) > BIKE.said) { c.said.bike = g.time; rules().say(g, NEWS.bikeHit); }
    }
    c.bikes = c.bikes.filter((k) => k.x > from - 400);
  }

  function bell(g) {
    const c = on(g) && g.chopok;
    if (!c) return null;
    const b = g.bear;
    return c.bikes.find((k) => !k.done && k.x > b.x && k.x - b.x < BIKE.speed * BIKE.warn + 10) || null;
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
    const who = b.moving ? watchers(g, c) : null;
    if (who) caught(g, c, who);
  }

  function caught(g, c, who) {
    const L = g.level, b = g.bear, k = c.chata;
    rules().spotted(g, who === 'cook' ? L.chata.cook : b.x + 30, GY - 120, who === 'cook' ? LABELS.chopok.caught : LABELS.chopok.next);
    Object.assign(b, { x: L.chata.door - 16, trackX: L.chata.door - 16, vx: 0, moving: false, dir: 1 });
    k.caughtAt = g.time;
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
    if (k.cook.state === 'look') { caught(g, c, 'cook'); return { kind: 'knock', t: 0, dur: 0.4, dir: 1, hit: false, target: null, done: false }; }
    k.served = true;
    k.bill = CHATA.bill;
    rules().eat(g, { type: 'kapustnica', x: L.chata.counter, eaten: false });
    rules().say(g, NEWS.chataServed, true);
    rules().quip(g, QUIPS().chata, true);
    return { kind: 'knock', t: 0, dur: 0.8, dir: 1, hit: false, target: null, done: false };
  }

  function minister(g, c) {
    const b = g.bear, m = c.minister;
    if (b.x < m.x - 700 || m.passed) return;
    if (b.x > m.x + 60) {
      m.passed = true;
      if (!m.seen) { rules().say(g, NEWS.ministerFog, true); rules().quip(g, QUIPS().dumbier, true); }
      return;
    }
    const d = Math.abs(b.x - m.x);
    const sees = !b.covered && c.fog.k < FOG.dense && (d < MINISTER.close || (b.x < m.x && d < MINISTER.range));
    if (!sees || g.time - m.seenAt < MINISTER.every) return;
    m.seenAt = g.time; m.seen = true;
    rules().spotted(g, m.x, GY - 130, LABELS.chopok.speech);
    rules().addPanic(g, MINISTER.panic, NEWS.ministerSeen, true);
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

  function update(g, dt) {
    if (!on(g)) return;
    const c = state(g);
    if (enter(g, c)) return;
    pines(g);
    fog(g, c, dt);
    wind(g, c, dt);
    bikes(g, c, dt);
    chata(g, c, dt);
    minister(g, c);
    wildlife(g, c, dt);
    summit(g);
  }

  function duck(g) {
    if (!on(g) || !g.chopok) return false;
    const c = g.chopok, b = g.bear;
    if (c.wind.phase !== 'calm' && b.x > g.level.wind.from) return true;
    return c.bikes.some((k) => !k.done && k.x > b.x && k.x - b.x < 140);
  }

  function queue(g) {
    if (!on(g) || !g.chopok) return null;
    const c = g.chopok, k = c.chata, b = g.bear, L = g.level;
    if (!inQueue(L, b.x + 20) || (k.served && b.x > L.chata.counter - 40)) return null;
    if (atCounter(g)) return k.cook.state === 'pot' ? 'order' : 'wait';
    const risky = k.cook.state !== 'pot' || k.guests.some((p) => p.state !== 'calm' && p.x > b.x - 30);
    return risky ? 'wait' : 'go';
  }

  ZS.sim.chopok = { PASS, FOG, WIND, BIKE, KEEP, update, passing, stepPass, inside, trip, quiet, clearPresses, between, walls, inDwarf, spotted, atCounter, act, bell, duck, queue, state };
})();
