(function () {
  const { CFG } = ZS;
  const bot = { reaction: 0.25, mode: null };

  function threat(g) {
    const b = g.bear;
    let worst = 0;
    for (const s of g.shooters) {
      if (s.blocked || s.scaredT > 0 || Math.abs(s.x - b.x) > s.range + 120) continue;
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
    return 20 + (CFG.FAT_GOAL - 20) * Math.min(1, g.bear.x / g.level.winterDen) - 5;
  }

  function jump(g, key) {
    g.input.jumpPressed = true;
    g.input.jumpKey = key;
  }

  function nearestTrunk(L, b) {
    const ahead = L.trees.find((t) => t.hide && t.x > b.x + 10);
    let behind = null;
    for (const t of L.trees) if (t.hide && t.x < b.x - 10) behind = t;
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
  }

  function autopilot(g, dt) {
    const b = g.bear, L = g.level, keys = g.input.keys;
    const runner = bot.mode === 'runner';
    keys.clear();
    const pilot = g.pilot || (g.pilot = { t: 0, danger: 0 });
    pilot.t -= dt || 0;
    if (pilot.t <= 0) { pilot.t = bot.reaction; pilot.danger = threat(g); }
    const danger = runner ? 0 : pilot.danger;

    if (b.climbing) {
      const honey = L.items.find((it) => !it.eaten && it.type === 'wildhoney' && Math.abs(it.x - b.climbing.x) < 20);
      keys.add(honey || danger ? 'ArrowUp' : 'ArrowDown');
      return;
    }
    if (!danger && !runner && b.onGround) {
      const honey = L.items.find((it) => !it.eaten && it.type === 'wildhoney' && Math.abs(it.x - b.x) < 26);
      if (honey) { jump(g, 'ArrowUp'); keys.add('ArrowUp'); return; }
    }
    if (b.inWater && !danger && !runner) {
      const fish = L.items.find((it) => it.type === 'fish' && !it.eaten && Math.abs((it.x0 || it.x) - b.x) < 30);
      pilot.fishT = (pilot.fishT || 0) + (dt || 0);
      if (fish && pilot.fishT < 4) return;
    } else {
      pilot.fishT = 0;
    }
    if (b.hiding && danger) { keys.add('ArrowDown'); return; }
    const reach = (t) => t.hide && Math.abs(t.x - b.x) < t.w / 2 + 34;
    if (danger && b.onGround && L.trees.some(reach)) { keys.add('ArrowDown'); return; }

    if (!danger && !runner && b.onGround && g.fat < pace(g)) {
      const food = L.items.find((it) => !it.eaten && !it.locked && !ZS.FOOD[it.type].natural && Math.abs(it.x - b.x) < 24);
      if (food) return;
    }

    let dir = 1;
    if (danger) {
      const target = nearestTrunk(L, b);
      if (target) dir = Math.sign(target.x - b.x) || 1;
      keys.add('ShiftLeft');
    } else if (runner || g.time > CFG.YEAR - 40) {
      keys.add('ShiftLeft');
    }
    keys.add(dir > 0 ? 'ArrowRight' : 'ArrowLeft');
    if (b.onGround) hopObstacles(g, dir);
  }

  ZS.dev = ZS.dev || {};
  ZS.dev.bot = bot;
  ZS.dev.autopilot = autopilot;
})();
