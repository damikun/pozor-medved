(function () {
  const { CFG } = ZS;
  const bot = { reaction: 0.25, mode: null };
  const HEAD_T = 0.583, TAKEOFF = [58, 72];
  const cover = (L) => ZS.sim.bear.spots(L);
  const up = (it) => it.type === 'wildhoney' || it.type === 'stash' || (it.type === 'limba' && it.y !== undefined);

  function threat(g) {
    const b = g.bear;
    let worst = 0;
    for (const s of g.shooters) {
      if (s.react || s.blocked || s.scaredT > 0 || Math.abs(s.x - b.x) > s.range + 120) continue;
      if (s.kind === 'posed' && Math.abs(s.x - b.x) < 60) continue;
      if (s.lock > 0) return 2;
      const d = Math.abs(s.cross - b.x);
      const coming = Math.sign(b.x - s.cross) === s.crossDir || s.alertX !== null;
      if (d < 120 || (coming && d < 240)) worst = 1;
    }
    for (const dr of g.drones) if (Math.abs(dr.x - b.x) < 110) worst = Math.max(worst, 1);
    return worst;
  }

  function pace(g) {
    const start = g.def.startFat;
    return start + (g.def.fatGoal + 10 - start) * Math.min(1, g.bear.x / g.level.goalDen);
  }

  function jump(g, key) {
    g.input.jumpPressed = true;
    g.input.jumpKey = key;
  }

  function nearestTrunk(L, b) {
    const spots = cover(L), ahead = spots.find((t) => t.x > b.x + 10);
    let behind = null;
    for (const t of spots) if (t.x < b.x - 10) behind = t;
    if (!ahead || !behind) return ahead || behind;
    return ahead.x - b.x <= b.x - behind.x + 40 ? ahead : behind;
  }

  function hopObstacles(g, dir) {
    const b = g.bear, L = g.level, r = L.river;
    if (r && dir > 0 && b.x > r.from - 60 && b.x < r.to) {
      const next = L.stones.find((st) => st.x - b.x > 40 && st.x - b.x < 120);
      const bank = b.x > L.stones[L.stones.length - 1].x - 10 && r.to - b.x < 140;
      if (next || bank) jump(g, 'Space');
    }
    for (const lg of L.logs) {
      const f = dir > 0 ? lg.x - lg.w / 2 - b.x : b.x - (lg.x + lg.w / 2);
      if (f > 0 && f < 50) jump(g, 'Space');
    }
    for (const fx of ZS.sim.bear.fences(L)) {
      const d = (fx - b.x) * dir;
      if (d > TAKEOFF[0] && d < TAKEOFF[1] && !b.stun) jump(g, 'Space');
    }
  }

  function crawl(g, dir) {
    const b = g.bear, s = ZS.sim.bear.shed(g.level);
    if (!s || !b.onGround) return false;
    const half = s.w / 2 + ZS.sim.bear.ROOF;
    return Math.abs(b.x - s.x) < half + 14 && (s.x - b.x) * dir > -half;
  }

  function stompChance(g, dir) {
    const b = g.bear;
    if (!b.onGround || b.climbing) return false;
    const speed = b.running && b.moving ? CFG.RUN : CFG.WALK;
    for (const s of g.shooters) {
      if (s.kind === 'posed' || (s.react && s.react !== 'fetch' && s.react !== 'pickup')) continue;
      const d = (s.x - b.x) * dir;
      if (d < 40 || d > 190) continue;
      const v = s.react === 'fetch' ? 62 : s.react || s.pause > 0 ? 0 : s.speed * (g.flags.meat ? 1.25 : 1);
      const closing = speed - s.dir * dir * v;
      if (Math.abs(d - closing * HEAD_T) < 9) return true;
    }
    return false;
  }

  function wantsHug(g, danger) {
    const o = g.bear.reach;
    if (!o || o.post || danger) return false;
    if (!ZS.sim.rules.hugged(g)) return o.kind !== 'ztmh' && o.kind !== 'poacher';
    return !g.flags.hugBan && g.panic > 35 && ((o.kind === 'tourist' && g.stats.selfies < 2) || o.kind === 'santa');
  }

  function swingTo(g, dt) {
    const keys = g.input.keys, r = g.ride, lift = ZS.sim.lift;
    if (bot.mode === 'runner' || r.phase !== 'ride') return;
    const p = r.pilot || (r.pilot = { t: 0, goal: 0 });
    p.t -= dt || 0;
    if (p.t <= 0) { p.t = bot.reaction; p.goal = lift.safest(r); }
    const u = lift.sway(r), v = Math.cos(r.th) * r.w;
    let dir = Math.sign(p.goal);
    if (!dir) { const e = -(u + v * 0.32); dir = e > 0.06 ? 1 : e < -0.06 ? -1 : 0; }
    if (dir > 0) keys.add('ArrowRight');
    else if (dir < 0) keys.add('ArrowLeft');
  }

  function closest(list, x) {
    let best = null;
    for (const t of list) if (!best || Math.abs(t.x - x) < Math.abs(best.x - x)) best = t;
    return best;
  }

  function scope(g) {
    const b = g.bear, c = g.cut, r = c.aim, S = ZS.sim.logging, A = g.level.logging, L = g.level, f = c.forester;
    const shelter = (x) => ({ kind: 'hide', t: closest(cover(L), x === undefined ? b.x : x) });
    if (r.state === 'lock' || r.state === 'seek') return shelter();
    const live = f && !f.dead && f.job !== 'home';
    const watch = live && f.job !== 'walk' && r.state !== 'done' && c.t >= S.T.aim - 1;
    if (watch && Math.abs(f.x - b.x) < S.LOOK.range + 80) return shelter();
    const m = A.machine, marked = A.trees.filter((t) => t.mark && S.standing(g, t) && (!live || t.x < f.x - 60));
    if (!marked.length) return live ? shelter(f.x - 170) : shelter();
    return { kind: 'rub', t: m.tree && m.tree.mark && S.standing(g, m.tree) ? m.tree : marked.reduce((a, t) => (t.x < a.x ? t : a)) };
  }

  function heed(g, plan) {
    const b = g.bear, keys = g.input.keys, S = ZS.sim.logging, L = g.level;
    if (!plan) return;
    let t = plan.t;
    if (t && !S.standing(g, t)) t = plan.t = closest(cover(L), b.x);
    if (!t) return;
    const at = Math.abs(t.x - b.x) < t.w / 2 + 30;
    if (plan.kind === 'rub' && t.mark) {
      if (at) { keys.add('KeyC'); return; }
      keys.add(t.x > b.x ? 'ArrowRight' : 'ArrowLeft');
      return;
    }
    if (at) { keys.add('ArrowDown'); return; }
    keys.add(t.x > b.x ? 'ArrowRight' : 'ArrowLeft');
    keys.add('ShiftLeft');
  }

  function clearing(g, dt) {
    const keys = g.input.keys, c = g.cut;
    if (c.phase !== 'play') return;
    if (bot.mode === 'runner') { keys.add('ShiftLeft'); keys.add('ArrowRight'); return; }
    const p = c.pilot || (c.pilot = { t: 0, plan: null });
    p.t -= dt || 0;
    if (p.t <= 0) { p.t = bot.reaction; p.plan = scope(g); }
    heed(g, p.plan);
  }

  function autopilot(g, dt) {
    const b = g.bear, L = g.level, keys = g.input.keys;
    const runner = bot.mode === 'runner';
    keys.clear();
    if (g.ride) { swingTo(g, dt); return; }
    if (g.cut && g.cut.phase !== 'done') { clearing(g, dt); return; }
    const pilot = g.pilot || (g.pilot = { t: 0, danger: 0, wait: 0, bold: 0, alarm: -9 });
    pilot.t -= dt || 0;
    if (pilot.t <= 0) { pilot.t = bot.reaction; pilot.danger = threat(g); }
    if (pilot.danger) pilot.alarm = g.time;
    pilot.wait = b.hiding || (b.crouch && b.covered) ? pilot.wait + (dt || 0) : Math.max(0, pilot.wait - (dt || 0) * 0.25);
    if (pilot.wait > 7 && pilot.danger < 2) { pilot.bold = 3.5; pilot.wait = 0; }
    pilot.bold = Math.max(0, pilot.bold - (dt || 0));
    const danger = runner || (pilot.bold > 0 && pilot.danger < 2) ? 0 : pilot.danger;
    if (pilot.bold > 0 && !runner) keys.add('ShiftLeft');

    if (ZS.sim.rules.hugged(g) && g.fat >= g.def.fatGoal) pilot.back = false;
    else if (b.x >= L.goalDen - 40) pilot.back = true;
    else if (pilot.back && ZS.sim.rules.hugged(g) && !pilot.hungry) pilot.back = false;
    pilot.hungry = pilot.back && ZS.sim.rules.hugged(g);
    if (b.act) return;
    if (b.climbing) {
      const honey = L.items.find((it) => !it.eaten && up(it) && Math.abs(it.x - b.climbing.x) < 20);
      keys.add(honey || danger ? 'ArrowUp' : 'ArrowDown');
      return;
    }
    if (!runner && wantsHug(g, danger)) { g.input.hugPressed = true; return; }
    const st = b.reach && b.reach.post ? b.reach : null;
    if (!runner && st && st.shooter && !st.shooter.react && g.time - pilot.alarm < 3) { g.input.hugPressed = true; return; }
    if (!danger && !runner && (b.onGround || b.vy < 0)) {
      const honey = L.items.find((it) => !it.eaten && up(it) && Math.abs(it.x - b.x) < 26);
      if (honey) { if (b.onGround) jump(g, 'ArrowUp'); keys.add('ArrowUp'); return; }
    }
    if (b.inWater && !danger && !runner) {
      const fish = L.items.find((it) => it.type === 'fish' && !it.eaten && Math.abs((it.x0 || it.x) - b.x) < 30);
      pilot.fishT = (pilot.fishT || 0) + (dt || 0);
      if (fish && pilot.fishT < 4) return;
    } else {
      pilot.fishT = 0;
    }
    if (b.hiding && b.hiding.hide && danger) { keys.add('ArrowDown'); return; }
    if (danger && b.inSpray) return;
    if (danger && b.inCorn && b.onGround) { keys.add('ArrowDown'); return; }
    const reach = (t) => Math.abs(t.x - b.x) < t.w / 2 + 34;
    if (danger && b.onGround && (cover(L).some(reach) || ZS.sim.lot.inside(L, b.x) || ZS.sim.alpine.thicket(L, b.x))) { keys.add('ArrowDown'); return; }

    if (!danger && !runner && b.onGround && g.fat < pace(g)) {
      const food = L.items.find((it) => !it.eaten && !it.locked && !ZS.FOOD[it.type].natural && Math.abs(it.x - b.x) < 24);
      if (food) return;
    }

    let dir = pilot.back && !runner ? -1 : 1;
    if (danger) {
      const target = nearestTrunk(L, b);
      if (target) dir = Math.sign(target.x - b.x) || 1;
      keys.add('ShiftLeft');
    } else if (runner || g.time > g.def.year - 40) {
      keys.add('ShiftLeft');
    }
    keys.add(dir > 0 ? 'ArrowRight' : 'ArrowLeft');
    if (crawl(g, dir)) { keys.add('ArrowDown'); return; }
    if (!runner && stompChance(g, dir)) jump(g, 'Space');
    else if (b.onGround) hopObstacles(g, dir);
  }

  ZS.dev = ZS.dev || {};
  ZS.dev.bot = bot;
  ZS.dev.autopilot = autopilot;
})();
