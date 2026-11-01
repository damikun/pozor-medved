// Animals other than the bear: trout in the Váh, the shepherd dog at the salaš and the sheep in its pen.
(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;

  // Trout wait under water, then leap between the stones; a bear standing in the stream or leaping catches them.
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

  // A guard dog patrols the pasture; when it sees the bear it closes in, holds its ground and barks. It never attacks.
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

  // Sheep graze inside the pen and bunch away from a bear on the other side of the fence.
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

  ZS.sim = ZS.sim || {};
  ZS.sim.wildlife = { updateFish, createDog, updateDogs, createSheep, updateSheep };
})();
