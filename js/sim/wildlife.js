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

  function createDog(o, L) {
    const d = { x: (o.from + o.to) / 2, from: o.from, to: o.to, dir: 1, state: 'walk', alert: 0, barkCd: 0, id: 'dog', y: 0, leap: null };
    const f = ZS.sim.pen.wires(L), reach = ZS.sim.pen.LEAP.reach;
    for (const fx of f || []) {
      for (const k of ['from', 'to', 'x']) {
        const r = reach + (k === 'x' ? 14 : 60);
        if (Math.abs(d[k] - fx) < r) d[k] = d[k] < fx ? fx - r : fx + r;
      }
    }
    return d;
  }

  function hop(d, dt) {
    const p = d.leap, T = ZS.sim.pen.LEAP, up = T.gather + T.air;
    p.t += dt;
    if (p.t < T.gather) { p.phase = 'gather'; p.k = p.t / T.gather; d.x = p.x0; d.y = 0; }
    else if (p.t < up) { const u = (p.t - T.gather) / T.air; p.phase = 'air'; p.k = u; d.x = p.x0 + (p.x1 - p.x0) * u; d.y = T.top * 4 * u * (1 - u); }
    else if (p.t < up + T.land) { p.phase = 'land'; p.k = (p.t - up) / T.land; d.x = p.x1; d.y = 0; }
    else { d.leap = null; d.x = p.x1; d.y = 0; d.state = 'run'; }
  }

  function trot(g, d, v, dt) {
    const T = ZS.sim.pen.LEAP, nx = d.x + d.dir * v * dt, fx = ZS.sim.pen.ahead(g.level, d.x, d.dir);
    if (fx !== null && Math.abs(fx - nx) <= T.reach) {
      d.leap = { x0: d.x, x1: fx + d.dir * T.reach, fx, dir: d.dir, t: 0, phase: 'gather', k: 0 };
      d.state = 'leap';
      return;
    }
    d.x = nx;
  }

  function runup(g, d) {
    const fx = ZS.sim.pen.ahead(g.level, d.x, d.dir);
    return fx !== null && Math.abs(fx - d.x) < ZS.sim.pen.LEAP.reach + ZS.sim.pen.LEAP.runup;
  }

  function updateDogs(g, dt) {
    const b = g.bear;
    for (const d of g.dogs) {
      d.barkCd -= dt;
      if (d.leap) { d.alert = Math.max(0, d.alert - dt); hop(d, dt); continue; }
      const dist = Math.abs(b.x - d.x);
      const sees = !b.covered && (dist < 150 || (dist < 430 && Math.sign(b.x - d.x) === d.dir));
      if (sees) d.alert = 3.5;
      if (d.alert > 0) {
        d.alert -= dt;
        d.dir = Math.sign(b.x - d.x) || d.dir;
        if (dist > 160 && sees) { d.state = 'run'; trot(g, d, 170, dt); } else d.state = 'bark';
        if (sees && d.barkCd <= 0) {
          d.barkCd = 4;
          rules().onSound(g, 'bark', d.x);
          rules().addPanic(g, 6, NEWS.dogBark);
          rules().spotted(g, d.x, GY - 80, LABELS.dogBark);
          ZS.sim.hunters.alert(g, b.x);
        }
      } else {
        const fast = runup(g, d);
        d.state = fast ? 'run' : 'walk';
        trot(g, d, fast ? 130 : 42, dt);
        if (!d.leap && (d.x < d.from || d.x > d.to)) { d.dir *= -1; d.x = clamp(d.x, d.from, d.to); }
      }
      if (!d.leap) d.x = clamp(d.x, d.from - 250, d.to + 250);
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
