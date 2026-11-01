(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;
  const say = (g, text, hot) => sim.rules.say(g, text, hot);

  function spawnAhead(g, kind, extra) {
    let x = Math.min(CFG.LEVEL_W - 250, g.bear.x + g.viewW * 0.75 + Math.random() * 500);
    for (let i = 0; i < 6 && g.shooters.some((s) => Math.abs(s.x - x) < 500); i++) x = Math.min(CFG.LEVEL_W - 250, x + 450);
    g.shooters.push(sim.hunters.create(g, kind, Object.assign({ x, from: x - 500, to: x + 200, dir: -1 }, extra)));
  }

  function escalate(g) {
    const f = g.flags;
    if (!f.press && g.panic >= 25) { f.press = true; spawnAhead(g, 'walker'); say(g, NEWS.press, true); }
    if (!f.emergency && g.panic >= 45) { f.emergency = true; spawnAhead(g, 'walker'); say(g, NEWS.emergency, true); }
    if (!f.drones && g.panic >= 65) { f.drones = true; g.drones.push(sim.drones.create(g, 0), sim.drones.create(g, 3)); say(g, NEWS.drones, true); }
    if (!f.cull && g.panic >= 85) { f.cull = true; spawnAhead(g, 'walker'); spawnAhead(g, 'walker'); say(g, NEWS.cull, true); }
    if (!g.problem && g.syn >= CFG.PROBLEM) {
      g.problem = true;
      if (!g.shooters.some((s) => s.kind === 'ztmh')) g.shooters.push(sim.hunters.create(g, 'ztmh', { x: g.cam - 150, dir: 1 }));
      say(g, NEWS.problem, true);
    }
    if (g.problem && g.syn < CFG.CALM) { g.problem = false; say(g, NEWS.calm); }
  }

  const EVENTS = {
    wrongbear(g) {
      g.panic = Math.max(0, g.panic - 25);
      sim.rules.float(g, g.bear.x + 260, GY - 150, LABELS.wrongBear, COLORS.story);
      say(g, NEWS.wrongbear, true);
    },
    court(g) { g.courtUntil = g.time + 15; say(g, NEWS.court, true); },
    meat(g) { g.flags.meat = true; say(g, NEWS.meat, true); },
    poacher(g) { spawnAhead(g, 'poacher', { life: 40 }); say(g, NEWS.poacher, true); },
    bins(g) { g.flags.binsLocked = true; g.level.items.forEach((it) => { if (it.type === 'bin') it.locked = true; }); say(g, NEWS.bins); },
    census(g) { g.panic = Math.min(100, g.panic + 6); say(g, NEWS.census); },
    constitution(g) { g.panic = Math.min(100, g.panic + 4); say(g, NEWS.constitution, true); },
    feeding(g) {
      const x = Math.min(CFG.LEVEL_W - 500, g.bear.x + g.viewW + 300);
      for (let i = 0; i < 2; i++) g.level.items.push({ type: 'corn', x: x + i * 40, eaten: false, locked: false });
      g.level.items.sort((a, b) => a.x - b.x);
      g.level.posts.push({ x: x + 170 });
      g.shooters.push(sim.hunters.create(g, 'posed', { x: x + 170, range: 460 }));
      say(g, NEWS.feeding, true);
    },
  };

  function randomEvents(g, dt) {
    g.nextEvent -= dt;
    if (g.nextEvent > 0) return;
    g.nextEvent = 28 + Math.random() * 12;
    const pool = Object.keys(EVENTS).filter((k) => !g.usedEvents.has(k));
    if (!pool.length) return;
    const k = pool[Math.floor(Math.random() * pool.length)];
    g.usedEvents.add(k);
    EVENTS[k](g);
  }

  ZS.sim.politics = { escalate, randomEvents };
})();
