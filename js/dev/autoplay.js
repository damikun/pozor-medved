// An autopilot that plays like a careful human: for play-testing, the regression tests and as a demo with ?bot
// in the URL. ZS.dev.bot.reaction is how often it looks around, in seconds; mode 'runner' never hides or
// stops to eat.
(function () {
  const { CFG } = ZS;
  const bot = { reaction: 0.25, mode: null };

  // 0 = calm, 1 = a crosshair or drone is coming, 2 = someone is aiming right now.
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

  // How much fat the bear should have by now to reach the goal before winter.
  function pace(g) {
    return 20 + (CFG.FAT_GOAL - 20) * Math.min(1, g.bear.x / g.level.winterDen) - 5;
  }

  function jump(g, key) {
    g.input.jumpPressed = true;
    g.input.jumpKey = key;
  }

  // The nearest thick trunk; the one ahead wins unless it is more than 40 units further than the one behind.
  function nearestTrunk(L, b) {
    const ahead = L.trees.find((t) => t.hide && t.x > b.x + 10);
    let behind = null;
    for (const t of L.trees) if (t.hide && t.x < b.x - 10) behind = t;
    if (!ahead || !behind) return ahead || behind;
    return ahead.x - b.x <= b.x - behind.x + 40 ? ahead : behind;
  }

  // Hops from stone to stone across the river instead of wading the whole way, and jumps over logs.
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

  /** Sets this step's keys in g.input, as a player would hold them. */
  function autopilot(g, dt) {
    const b = g.bear, L = g.level, keys = g.input.keys;
    const runner = bot.mode === 'runner';
    keys.clear();
    const ai = g.ai || (g.ai = { t: 0, danger: 0 });
    ai.t -= dt || 0;
    if (ai.t <= 0) { ai.t = bot.reaction; ai.danger = threat(g); }
    const danger = runner ? 0 : ai.danger;

    // Up a tree: keep climbing to the honey or into cover while in danger, otherwise come down.
    if (b.climbing) {
      const honey = L.items.find((it) => !it.eaten && it.type === 'wildhoney' && Math.abs(it.x - b.climbing.x) < 20);
      keys.add(honey || danger ? 'ArrowUp' : 'ArrowDown');
      return;
    }
    if (!danger && !runner && b.onGround) {
      const honey = L.items.find((it) => !it.eaten && it.type === 'wildhoney' && Math.abs(it.x - b.x) < 26);
      if (honey) { jump(g, 'ArrowUp'); keys.add('ArrowUp'); return; }
    }
    // Fishing: stand still in the stream for a few seconds where a trout keeps jumping.
    if (b.inWater && !danger && !runner) {
      const fish = L.items.find((it) => it.type === 'fish' && !it.eaten && Math.abs((it.x0 || it.x) - b.x) < 30);
      ai.fishT = (ai.fishT || 0) + (dt || 0);
      if (fish && ai.fishT < 4) return;
    } else {
      ai.fishT = 0;
    }
    if (b.hiding && danger) { keys.add('ArrowDown'); return; }
    const reach = (t) => t.hide && Math.abs(t.x - b.x) < t.w / 2 + 34;
    if (danger && b.onGround && L.trees.some(reach)) { keys.add('ArrowDown'); return; }

    // Forest food is picked up on the way; stop to raid human food only when behind on fat.
    if (!danger && !runner && b.onGround && g.fat < pace(g)) {
      const food = L.items.find((it) => !it.eaten && !it.locked && !ZS.FOOD[it.type].natural && Math.abs(it.x - b.x) < 24);
      if (food) return;
    }

    // In danger with no trunk at hand: sprint to the nearest one. Otherwise walk on.
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
