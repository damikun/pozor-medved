(function () {
  const { CFG, NEWS } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;

  function cameraX(g) {
    return Math.max(0, Math.min(g.level.w - g.viewW, g.bear.x - g.viewW * 0.38));
  }

  function changeSeason(g) {
    const seasons = g.def.seasons;
    const si = seasons.findIndex((s) => g.time < s.end);
    if (si === -1) { sim.rules.end(g, g.fat >= g.def.fatGoal && !sim.rules.hugged(g) ? 'lonely' : 'starve'); return false; }
    if (si !== g.seasonIdx) {
      g.seasonIdx = si;
      g.seasonKey = seasons[si].key;
      if (g.level.theme === 'winter') {
        sim.rules.say(g, si === 1 ? NEWS.snow : NEWS.frost, si === 2);
      } else {
        if (si === 1) sim.rules.say(g, NEWS.summer);
        if (si === 2) {
          sim.rules.say(g, NEWS.mushrooms, true);
          const x = Math.min(g.level.w - 600, g.bear.x + 900);
          g.people.push(sim.people.create(g, 'picker', { from: x - 400, to: x + 400 }));
        }
      }
    }
    return true;
  }

  function updateMeters(g, dt) {
    g.fat = Math.max(0, g.fat - g.def.metabolism * dt * (g.bear.running && g.bear.moving ? 4 : 1));
    if (g.time - g.lastHuman > 8) g.syn = Math.max(0, g.syn - CFG.SYN_DECAY * dt);
    g.panic = Math.max(0, g.panic - CFG.PANIC_DECAY * dt);
  }

  function ageEffects(g, dt) {
    g.shots.forEach((sh) => { sh.t -= dt; });
    g.shots = g.shots.filter((sh) => sh.t > 0);
    g.particles.forEach((p) => { p.t -= dt; p.vy += (p.heart ? 0 : 600) * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    g.particles = g.particles.filter((p) => p.t > 0 && p.y < GY);
    g.floaters.forEach((f) => { f.t -= dt; });
    g.floaters = g.floaters.filter((f) => f.t > 0);
    if (g.tracks.length && g.time - g.tracks[0].t > 70) g.tracks.shift();
    if (g.bubble && (g.bubble.t -= dt) <= 0) g.bubble = null;
  }

  function step(g, dt) {
    if (g.bot && ZS.dev && ZS.dev.autopilot) ZS.dev.autopilot(g, dt);
    g.time += dt;
    if (!changeSeason(g)) return;
    sim.bear.update(g, dt);
    sim.encounters.update(g, dt);
    g.cam = cameraX(g);
    ZS.fx.update(g, dt, g.viewW);
    sim.hunters.update(g, dt);
    if (g.over) return;
    sim.people.update(g, dt);
    sim.drones.update(g, dt);
    sim.wildlife.updateDogs(g, dt);
    sim.wildlife.updateSheep(g, dt);
    sim.wildlife.updateDeer(g, dt);
    sim.wildlife.updateFish(g, dt);

    updateMeters(g, dt);
    sim.politics.escalate(g);
    sim.politics.randomEvents(g, dt);
    ageEffects(g, dt);

    if (g.bear.x >= g.level.goalDen - 20) {
      if (sim.rules.hugged(g)) { sim.rules.end(g, g.fat >= g.def.fatGoal ? 'win' : 'starve'); return; }
      sim.rules.refuse(g);
    }
    sim.rules.tickerStep(g, dt);
  }

  function advance(g, seconds) {
    for (let t = 0; t < seconds && g.running && !g.over; t += 1 / 60) step(g, 1 / 60);
    return g;
  }

  ZS.sim.loop = { step, advance, cameraX, ageEffects };
})();
