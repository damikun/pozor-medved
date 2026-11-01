(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;

  function updateFish(g, dt) {
    for (const it of g.level.items) {
      if (it.type !== 'fish' || it.eaten) continue;
      if (it.jump < 0) {
        it.jumpT -= dt;
        if (it.jumpT <= 0) { it.jump = 0; it.hidden = false; it.dir = Math.random() < 0.5 ? -1 : 1; it.x0 = it.x0 || it.x; }
        continue;
      }
      it.jump += dt / 0.95;
      const k = Math.min(1, it.jump);
      it.y = GY + 8 - Math.sin(Math.PI * k) * 92;
      it.x = it.x0 + it.dir * (k - 0.5) * 36;
      if (it.jump >= 1) { it.jump = -1; it.hidden = true; it.y = GY + 30; it.jumpT = 1.5 + Math.random() * 2.5; }
    }
  }

  function createDog(o) {
    return { x: (o.from + o.to) / 2, from: o.from, to: o.to, dir: 1, state: 'walk', alert: 0, barkCd: 0, id: 'dog' };
  }

  function updateDogs(g, dt) {
    const b = g.bear;
    for (const d of g.dogs) {
      d.barkCd -= dt;
      const dist = Math.abs(b.x - d.x);
      const sees = !b.covered && (dist < 150 || (dist < 430 && Math.sign(b.x - d.x) === d.dir));
      if (sees) d.alert = 3.5;
      if (d.alert > 0) {
        d.alert -= dt;
        d.dir = Math.sign(b.x - d.x) || d.dir;
        if (dist > 160 && sees) { d.x += d.dir * 170 * dt; d.state = 'run'; } else d.state = 'bark';
        if (sees && d.barkCd <= 0) {
          d.barkCd = 4;
          rules().addPanic(g, 6, NEWS.dogBark);
          rules().spotted(g, d.x, GY - 80, LABELS.dogBark);
          ZS.sim.hunters.alert(g, b.x);
        }
      } else {
        d.state = 'walk';
        d.x += d.dir * 42 * dt;
        if (d.x < d.from || d.x > d.to) { d.dir *= -1; d.x = clamp(d.x, d.from, d.to); }
      }
      d.x = clamp(d.x, d.from - 250, d.to + 250);
    }
  }

  function createSheep(o, i) {
    return { x: o.x, from: o.from, to: o.to, dir: i % 2 ? -1 : 1, state: 'graze', t: Math.random() * 4, id: 'sheep' + i };
  }

  function updateSheep(g, dt) {
    const b = g.bear;
    for (const s of g.sheep) {
      s.t -= dt;
      if (Math.abs(b.x - s.x) < 220 && !b.covered) {
        s.state = 'flee'; s.dir = Math.sign(s.x - b.x) || 1;
        s.x = clamp(s.x + s.dir * 95 * dt, s.from, s.to);
        continue;
      }
      if (s.t <= 0) { s.t = 2 + Math.random() * 4; s.state = Math.random() < 0.6 ? 'graze' : 'walk'; if (Math.random() < 0.4) s.dir *= -1; }
      if (s.state === 'flee') s.state = 'walk';
      if (s.state === 'walk') s.x = clamp(s.x + s.dir * 22 * dt, s.from, s.to);
    }
  }

  function createDeer(o) {
    return { x: o.x, from: o.from, to: o.to, dir: o.i % 2 ? -1 : 1, state: 'graze', t: 1 + o.i * 1.3, fear: 0, id: 'deer' + o.i };
  }

  function updateDeer(g, dt) {
    const b = g.bear;
    for (const d of g.deer) {
      d.t -= dt;
      const dist = Math.abs(b.x - d.x);
      if (dist < 280 && !b.covered && d.state !== 'flee') { d.state = 'flee'; d.fear = 3.5; d.dir = Math.sign(d.x - b.x) || 1; }
      if (d.state === 'flee') {
        d.fear -= dt;
        d.x = clamp(d.x + d.dir * 230 * dt, d.from - 900, d.to + 900);
        if (d.fear <= 0) { d.state = 'look'; d.t = 2 + (d.x % 1.5); }
        continue;
      }
      if (d.state === 'walk') {
        d.x += d.dir * 30 * dt;
        if (d.x < d.from || d.x > d.to) d.dir = d.x < d.from ? 1 : -1;
      }
      if (d.t <= 0) {
        const away = d.x < d.from - 40 || d.x > d.to + 40;
        d.state = away ? 'walk' : d.state === 'graze' ? (d.x % 3 < 1.4 ? 'look' : 'walk') : 'graze';
        if (away) d.dir = d.x < d.from ? 1 : -1;
        d.t = d.state === 'graze' ? 3 + (d.x % 2.5) : d.state === 'look' ? 1.6 : 2.2;
      }
    }
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.wildlife = { updateFish, createDog, updateDogs, createSheep, updateSheep, createDeer, updateDeer };
})();
