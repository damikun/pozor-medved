(function () {
  const { CFG, NEWS, LABELS, COLORS } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;

  const rules = {
    onNews: () => {},
    onEnd: () => {},
    onSound: () => {},
  };

  rules.create = function (input, { viewW = CFG.MIN_VIEW_W, bot = false, level: id = 'summer' } = {}) {
    const def = ZS.LEVELS[id];
    const level = ZS.makeLevel(id, 11);
    const g = {
      level, def, bear: sim.bear.create(level), input, viewW,
      shooters: [], people: [], drones: [], dogs: [], sheep: [], deer: [], props: [], tracks: [],
      floaters: [], shots: [], particles: [], bubble: null,
      time: 0, seasonIdx: 0, seasonKey: def.seasons[0].key, fat: def.startFat, syn: 0, panic: 0, lives: CFG.LIVES, cam: 0,
      flags: { press: false, emergency: false, drones: false, cull: false, meat: false, binsLocked: false, stallsLocked: false, hugBan: false, decree: false },
      courtUntil: 0, viralUntil: 0, hugBanAt: 0, lastKnown: null, lastHuman: -99, problem: false, nextEvent: 30, usedEvents: new Set(),
      stats: { natural: 0, human: 0, seen: 0, hugs: 0, bites: 0, stomps: 0, selfies: 0 }, falls: 0, refusals: 0, refusedAt: -99, running: false, over: false, paused: false, ending: null,
      bot, once: {}, ride: null, liftCalm: 0,
      headlines: (id === 'winter' ? ZS.WINTER_HEADLINES : ZS.HEADLINES).map((_, i) => i).sort(() => Math.random() - 0.5), headlineIdx: 0,
      tickerT: 0, tickerQueue: [], tickerHot: false, cycle: new Map(), saidAt: {},
    };
    for (const sp of level.spawns) {
      if (sp.kind === 'posed') g.shooters.push(sim.hunters.create(g, 'posed', { x: sp.x, range: sp.range }));
      else if (sp.kind === 'walker') g.shooters.push(sim.hunters.create(g, 'walker', { x: sp.to, from: sp.from, to: sp.to, dir: -1 }));
      else if (sp.kind === 'dog') g.dogs.push(sim.wildlife.createDog(sp, level));
      else if (sp.kind === 'sheep') g.sheep.push(sim.wildlife.createSheep(sp, g.sheep.length));
      else if (sp.kind === 'deer') g.deer.push(sim.wildlife.createDeer(sp));
      else g.people.push(sim.people.create(g, sp.kind, { from: sp.from, to: sp.to }));
    }
    ZS.fx.init(g);
    return g;
  };

  function next(g, list) {
    const i = g.cycle.get(list) || 0;
    g.cycle.set(list, i + 1);
    return list[i % list.length];
  }

  rules.say = function (g, news, hot) {
    const text = g && Array.isArray(news) ? next(g, news) : news;
    if (!g || g.tickerQueue.some((q) => q.text === text)) return;
    if (!hot && g.tickerQueue.length > 2) return;
    const at = hot ? g.tickerQueue.findIndex((q) => !q.hot) : -1;
    g.tickerQueue.splice(at < 0 ? g.tickerQueue.length : at, 0, { text, hot: !!hot });
    if (hot && !g.tickerHot) g.tickerT = 0;
  };

  function tickerStep(g, dt) {
    g.tickerT -= dt;
    if (g.tickerT > 0) return;
    const list = g.level.id === 'winter' ? ZS.WINTER_HEADLINES : ZS.HEADLINES;
    const item = g.tickerQueue.shift() || { text: list[g.headlines[g.headlineIdx++ % g.headlines.length]], hot: false, filler: true };
    g.tickerHot = item.hot;
    g.tickerT = item.hot ? 7 : 6;
    rules.onNews(item);
  }

  rules.quip = function (g, list, force) {
    if (!force && g.bear.quipCd > 0) return;
    g.bubble = { text: list[Math.floor(Math.random() * list.length)], t: 2.4 };
    g.bear.quipCd = 5;
  };

  rules.float = function (g, x, y, text, color) { g.floaters.push({ x, y, text, color, t: 1.6 }); };
  rules.addPanic = function (g, n, news, hot) { g.panic = Math.max(0, Math.min(100, g.panic + n)); if (news) rules.say(g, news, hot); };
  rules.spotted = function (g, x, y, text) { g.stats.seen++; rules.float(g, x, y, text, COLORS.seen); };

  rules.eat = function (g, it) {
    const f = ZS.FOOD[it.type];
    it.eaten = true;
    g.fat = Math.min(100, g.fat + f.fat);
    if (f.natural) g.stats.natural++; else { g.stats.human++; g.lastHuman = g.time; }
    if (f.syn) g.syn = Math.min(100, g.syn + f.syn);
    if (f.panic) g.panic = Math.min(100, g.panic + f.panic);
    rules.onSound(g, 'eat', it.x, it.type);
    rules.float(g, it.x, GY - 80, LABELS.eaten(f.fat, LABELS[it.labelKey] || LABELS.food[it.type]), f.natural ? COLORS.good : COLORS.bad);
    if (it.type === 'carrot') {
      const sm = g.level.snowmen.find((s) => Math.abs(s.x - it.x) < 2);
      if (sm) sm.nose = false;
    }
    const news = NEWS[it.type + 'Eaten'];
    if (news && !(g.time - g.saidAt[it.type] < 30)) { g.saidAt[it.type] = g.time; rules.say(g, news); }
    if (g.fat >= g.def.fatGoal && !g.readySaid) {
      g.readySaid = true;
      rules.say(g, !rules.hugged(g) ? NEWS.readyNoHug : g.level.theme === 'winter' ? NEWS.readyForSleep : NEWS.readyForWinter, true);
    }
  };

  rules.fire = function (g, shooter, at) {
    if (g.over) return;
    const b = g.bear;
    ZS.fx.onShot(g, shooter.x);
    rules.onSound(g, 'shot', shooter.x);
    shooter.kick = 1;
    const mz = ZS.muzzle ? ZS.muzzle(shooter) : null;
    const fromX = mz ? mz[0] : shooter.x;
    const fromY = mz ? mz[1] : shooter.kind === 'posed' ? GY - 178 : GY - 48;
    rules.float(g, shooter.x, fromY - 26, LABELS.bang, COLORS.shot);
    for (const o of g.shooters) { o.lock = 0; o.reload = Math.max(o.reload, 1.5); }
    if (at === 'tree') {
      const hay = !!(b.hiding && b.hiding.hay), corn = !b.hiding && !!b.inCorn, soft = hay || corn, y = GY - (hay ? 48 : corn ? 40 : 60);
      g.shots.push({ x1: fromX, y1: fromY, x2: shooter.cross, y2: y, t: 0.3 });
      for (let i = 0; i < 12; i++) {
        g.particles.push({ x: shooter.cross, y, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, t: 0.9, color: hay ? '#d8b55b' : corn ? (i % 3 ? '#6f9a3c' : '#e2c35a') : '#8a6a48' });
      }
      rules.onSound(g, soft ? 'hayHit' : 'tree', shooter.cross);
      rules.float(g, b.x, GY - (soft ? 108 : 125), hay ? LABELS.hayHit : corn ? LABELS.cornHit : LABELS.treeHit, COLORS.good);
      rules.say(g, hay ? NEWS.hayHit : corn ? NEWS.cornHit : NEWS.treeHit);
      return;
    }
    const sprinting = b.running && b.moving;
    const corn = ZS.sim.corn.miss(g);
    if (Math.random() < (sprinting || b.thicket ? 0.5 : Math.max(0.15, corn))) {
      if (sim.lot.miss(g, fromX, fromY)) return;
      g.shots.push({ x1: fromX, y1: fromY, x2: b.x + (Math.random() < 0.5 ? -1 : 1) * 80, y2: GY - 100, t: 0.3 });
      rules.onSound(g, 'miss', b.x);
      rules.float(g, b.x, GY - 125, sprinting ? LABELS.missSprint : corn ? LABELS.missCorn : LABELS.miss, COLORS.good);
      rules.say(g, NEWS.missed);
      return;
    }
    g.shots.push({ x1: fromX, y1: fromY, x2: b.x, y2: b.y - 34, t: 0.3 });
    rules.onSound(g, 'hit', b.x);
    g.lives -= 1;
    if (g.lives <= 0) {
      end(g, shooter.kind === 'poacher' ? 'poacher' : shooter.kind === 'ztmh' ? 'problem' : g.flags.cull ? 'cull' : 'hunted');
      return;
    }
    b.inv = 3;
    rules.float(g, b.x, GY - 115, LABELS.hit(g.lives), COLORS.shot);
    rules.say(g, shooter.kind === 'poacher' ? NEWS.poacherShot : b.hiding && !b.hiding.hide ? NEWS.birchHit : NEWS.hunterShot, true);
  };

  rules.hugged = (g) => g.stats.hugs + g.stats.selfies > 0;

  rules.refuse = function (g) {
    const b = g.bear, x = g.level.goalDen - 22;
    if (b.x > x) { b.x = x; b.vx = 0; }
    if (g.time - g.refusedAt < 5) return;
    g.refusedAt = g.time;
    rules.float(g, g.level.goalDen, GY - 112, LABELS.denRefuse, COLORS.bad);
    rules.say(g, NEWS.denRefuse[g.refusals++ % NEWS.denRefuse.length], true);
    rules.quip(g, ZS.QUIPS.denRefuse, true);
  };

  function end(g, kind) {
    if (g.over) return;
    g.over = true;
    g.ending = kind;
    rules.onEnd(g);
  }
  rules.end = end;
  rules.tickerStep = tickerStep;

  ZS.sim.rules = rules;
})();
