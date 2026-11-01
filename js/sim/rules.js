// The game rules and state: creating a run, the news ticker, eating, shooting, media panic and the end of the run.
// No DOM here: the UI listens through rules.onNews and rules.onEnd, so the whole simulation also runs headless
// (see tests/).
(function () {
  const { CFG, NEWS, LABELS, COLORS } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;

  const rules = {
    /** Called with { text, hot } whenever the ticker should show the next line. */
    onNews: () => {},
    /** Called once when a run ends; g.ending holds the kind (a key of ZS.ENDINGS). */
    onEnd: () => {},
  };

  /** A fresh run. input is the shared { keys, jumpPressed, ... } object; viewW is the visible width in world units. */
  rules.create = function (input, { viewW = CFG.MIN_VIEW_W, bot = false } = {}) {
    const level = ZS.makeLevel(11);
    const g = {
      level, bear: sim.bear.create(), input, viewW,
      shooters: [], people: [], drones: [], dogs: [], sheep: [], floaters: [], shots: [], particles: [], bubble: null,
      time: 0, seasonIdx: 0, fat: CFG.START_FAT, syn: 0, panic: 0, lives: CFG.LIVES, cam: 0,
      flags: { press: false, emergency: false, drones: false, cull: false, meat: false, binsLocked: false },
      courtUntil: 0, lastKnown: null, lastHuman: -99, problem: false, nextEvent: 30, usedEvents: new Set(),
      stats: { natural: 0, human: 0, seen: 0 }, running: false, over: false, paused: false, ending: null,
      bot,
      headlines: ZS.HEADLINES.slice().sort(() => Math.random() - 0.5), headlineIdx: 0,
      tickerT: 0, tickerQueue: [], tickerHot: false,
    };
    for (const sp of level.spawns) {
      if (sp.kind === 'posed') g.shooters.push(sim.hunters.create(g, 'posed', { x: sp.x, range: sp.range }));
      else if (sp.kind === 'walker') g.shooters.push(sim.hunters.create(g, 'walker', { x: sp.to, from: sp.from, to: sp.to, dir: -1 }));
      else if (sp.kind === 'dog') g.dogs.push(sim.wildlife.createDog(sp));
      else if (sp.kind === 'sheep') g.sheep.push(sim.wildlife.createSheep(sp, g.sheep.length));
      else g.people.push(sim.people.create(g, sp.kind, { from: sp.from, to: sp.to }));
    }
    ZS.fx.init(g);
    return g;
  };

  // --- News ticker ---------------------------------------------------------------

  /** Queues a news line; hot lines jump the queue. */
  rules.say = function (g, text, hot) {
    if (!g || g.tickerQueue.some((q) => q.text === text)) return;
    if (!hot && g.tickerQueue.length > 2) return;
    g.tickerQueue.push({ text, hot: !!hot });
    if (hot && !g.tickerHot) g.tickerT = 0;
  };

  function tickerStep(g, dt) {
    g.tickerT -= dt;
    if (g.tickerT > 0) return;
    const item = g.tickerQueue.shift() || { text: g.headlines[g.headlineIdx++ % g.headlines.length], hot: false };
    g.tickerHot = item.hot;
    g.tickerT = item.hot ? 7 : 6;
    rules.onNews(item);
  }

  // --- Hooks used by the actors ----------------------------------------------------------

  rules.float = function (g, x, y, text, color) { g.floaters.push({ x, y, text, color, t: 1.6 }); };
  rules.addPanic = function (g, n, news, hot) { g.panic = Math.min(100, g.panic + n); if (news) rules.say(g, news, hot); };
  rules.spotted = function (g, x, y, text) { g.stats.seen++; rules.float(g, x, y, text, COLORS.seen); };

  rules.eat = function (g, it) {
    const f = ZS.FOOD[it.type];
    it.eaten = true;
    g.fat = Math.min(100, g.fat + f.fat);
    if (f.natural) g.stats.natural++; else { g.stats.human++; g.lastHuman = g.time; }
    if (f.syn) g.syn = Math.min(100, g.syn + f.syn);
    if (f.panic) g.panic = Math.min(100, g.panic + f.panic);
    rules.float(g, it.x, GY - 80, LABELS.eaten(f), f.natural ? COLORS.good : COLORS.bad);
    if (it.type === 'bin') rules.say(g, NEWS.binEaten);
    if (it.type === 'hive') rules.say(g, NEWS.hiveEaten);
    if (it.type === 'container') rules.say(g, NEWS.containerEaten);
    if (g.fat >= CFG.FAT_GOAL && !g.readySaid) {
      g.readySaid = true;
      rules.say(g, NEWS.readyForWinter, true);
    }
  };

  /** A shooter fires. at === 'tree' when the bear ducked behind a trunk at the last moment. */
  rules.fire = function (g, shooter, at) {
    if (g.over) return;
    const b = g.bear;
    ZS.fx.onShot(g, shooter.x);
    shooter.kick = 1;
    // Tracers start at the barrel as js/render/art/people.js last drew it.
    const mz = ZS.muzzle ? ZS.muzzle(shooter) : null;
    const fromX = mz ? mz[0] : shooter.x;
    const fromY = mz ? mz[1] : shooter.kind === 'posed' ? GY - 178 : GY - 48;
    rules.float(g, shooter.x, fromY - 26, LABELS.bang, COLORS.shot);
    // Every shot gives the bear a breather: all crosshairs drop their aim for a moment.
    for (const o of g.shooters) { o.lock = 0; o.reload = Math.max(o.reload, 1.5); }
    if (at === 'tree') {
      g.shots.push({ x1: fromX, y1: fromY, x2: shooter.cross, y2: GY - 60, t: 0.3 });
      for (let i = 0; i < 12; i++) {
        g.particles.push({ x: shooter.cross, y: GY - 60, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, t: 0.9, color: '#8a6a48' });
      }
      rules.float(g, b.x, GY - 125, LABELS.treeHit, COLORS.good);
      rules.say(g, NEWS.treeHit);
      return;
    }
    // A sprinting bear is hard to hit.
    const sprinting = b.running && b.moving;
    if (Math.random() < (sprinting ? 0.5 : 0.15)) {
      g.shots.push({ x1: fromX, y1: fromY, x2: b.x + (Math.random() < 0.5 ? -1 : 1) * 80, y2: GY - 100, t: 0.3 });
      rules.float(g, b.x, GY - 125, sprinting ? LABELS.missSprint : LABELS.miss, COLORS.good);
      rules.say(g, NEWS.missed);
      return;
    }
    g.shots.push({ x1: fromX, y1: fromY, x2: b.x, y2: b.y - 34, t: 0.3 });
    g.lives -= 1;
    if (g.lives <= 0) {
      end(g, shooter.kind === 'poacher' ? 'poacher' : shooter.kind === 'ztmh' ? 'problem' : g.flags.cull ? 'cull' : 'hunted');
      return;
    }
    b.inv = 3;
    rules.float(g, b.x, GY - 115, LABELS.hit(g.lives), COLORS.shot);
    rules.say(g, shooter.kind === 'poacher' ? NEWS.poacherShot : NEWS.hunterShot, true);
  };

  /** Ends the run once; kind is a key of ZS.ENDINGS. */
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
