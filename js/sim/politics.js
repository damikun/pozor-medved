(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;
  const say = (g, text, hot) => sim.rules.say(g, text, hot);
  const RETURN = 20;

  function spawnAhead(g, kind, extra) {
    const A = g.level.alpine, edge = A ? A.hut.x - 360 : g.level.goalDen - 450, calm = g.level.calm || [];
    const busy = (x) => g.shooters.some((s) => Math.abs(s.x - x) < 500) || calm.some(([a, b]) => x + 200 > a && x - 500 < b);
    let x = Math.min(edge, g.bear.x + g.viewW * 0.75 + Math.random() * 500);
    for (let i = 0; i < 12 && x < edge && busy(x); i++) x = Math.min(edge, x + 450);
    if (x < g.bear.x + 300 || busy(x)) return;
    g.shooters.push(sim.hunters.create(g, kind, Object.assign({ x, from: x - 500, to: x + 200, dir: -1 }, extra)));
  }

  function escalate(g) {
    const f = g.flags, winter = g.level.theme === 'winter';
    if (!f.press && g.panic >= 25) { f.press = true; spawnAhead(g, 'walker'); say(g, winter ? NEWS.pressWinter : NEWS.press, true); }
    if (!f.emergency && g.panic >= 45) { f.emergency = true; spawnAhead(g, 'walker'); say(g, NEWS.emergency, true); }
    if (!f.drones && g.panic >= 65) { f.drones = true; g.drones.push(sim.drones.create(g, 0), sim.drones.create(g, 3)); say(g, NEWS.drones, true); }
    if (!f.cull && g.panic >= 85) { f.cull = true; spawnAhead(g, 'walker'); spawnAhead(g, 'walker'); say(g, NEWS.cull, true); }
    if (!f.hugBan && g.hugBanAt && g.time >= g.hugBanAt) { f.hugBan = true; say(g, NEWS.hugBan, true); }
    const team = g.shooters.some((s) => s.kind === 'ztmh');
    if (team) g.ztmhAt = g.time;
    if (!g.problem && g.syn >= CFG.PROBLEM) {
      g.problem = true;
      if (!team) { g.shooters.push(sim.hunters.create(g, 'ztmh', { x: g.cam - 150, dir: 1 })); g.ztmhAt = g.time; }
      say(g, NEWS.problem, true);
    } else if (g.problem && !team && g.time - g.ztmhAt > RETURN) {
      g.shooters.push(sim.hunters.create(g, 'ztmh', { x: g.cam - 150, dir: 1 }));
      g.ztmhAt = g.time;
      say(g, NEWS.problem);
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
    stalls(g) {
      g.flags.stallsLocked = true;
      g.level.items.forEach((it) => { if (g.level.stalls.some((s) => s.kind === it.type && Math.abs(s.x - it.x) < 1)) it.locked = true; });
      say(g, NEWS.stalls);
    },
    census(g) { g.panic = Math.min(100, g.panic + 6); say(g, NEWS.census); },
    constitution(g) { g.panic = Math.min(100, g.panic + 4); say(g, NEWS.constitution, true); },
    decree(g) { g.flags.decree = true; g.panic = Math.min(100, g.panic + 5); say(g, NEWS.decree, true); },
    drive(g) { spawnAhead(g, 'walker'); spawnAhead(g, 'walker'); say(g, NEWS.drive, true); },
    feeding(g) {
      const L = g.level, edge = g.cam + g.viewW + 40;
      const x = (L.feedSlots || []).find((f) => f - 20 > edge && !L.posts.some((p) => p.x === f + 170));
      if (x !== undefined) {
        for (let i = 0; i < 2; i++) L.items.push({ type: 'corn', x: x + i * 40, eaten: false, locked: false });
        L.items.sort((a, b) => a.x - b.x);
        L.posts.push({ x: x + 170 });
        g.shooters.push(sim.hunters.create(g, 'posed', { x: x + 170, range: 460 }));
      }
      say(g, NEWS.feeding, true);
    },
  };
  const POOL = {
    summer: ['wrongbear', 'court', 'meat', 'poacher', 'bins', 'census', 'constitution', 'feeding'],
    winter: ['wrongbear', 'court', 'meat', 'poacher', 'stalls', 'census', 'decree', 'drive'],
    chopok: ['wrongbear', 'court', 'meat', 'poacher', 'bins', 'census', 'constitution', 'drive'],
  };

  function randomEvents(g, dt) {
    g.nextEvent -= dt;
    if (g.nextEvent > 0) return;
    g.nextEvent = 28 + Math.random() * 12;
    const pool = POOL[g.level.id].filter((k) => !g.usedEvents.has(k));
    if (!pool.length) return;
    const k = pool[Math.floor(Math.random() * pool.length)];
    g.usedEvents.add(k);
    EVENTS[k](g);
  }

  ZS.sim.politics = { escalate, randomEvents };
})();
