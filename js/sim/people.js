(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;

  function create(g, kind, o) {
    return Object.assign({ kind, x: (o.from + o.to) / 2, dir: 1, speed: kind === 'tourist' ? 25 : 35, state: 'walk', pause: 0, filmCd: 0, dropCd: 8 }, o);
  }

  function update(g, dt) {
    const b = g.bear, L = g.level;
    for (const p of g.people) {
      p.filmCd -= dt; p.dropCd -= dt;
      if (p.state === 'flee') {
        p.x += p.dir * 210 * dt;
        if (Math.abs(p.x - b.x) > 1600) p.dead = true;
        continue;
      }
      if (p.pause > 0) p.pause -= dt;
      else {
        p.x += p.dir * p.speed * dt;
        if (p.x < p.from || p.x > p.to) { p.dir *= -1; p.x = clamp(p.x, p.from, p.to); p.pause = 2; }
      }
      const d = Math.abs(b.x - p.x);
      const ahead = Math.sign(b.x - p.x) === p.dir;
      const sees = (!b.covered || (b.hiding && d < 55)) && (d < 110 || (ahead && d < (p.kind === 'tourist' ? 380 : 300)));
      if (sees && p.kind === 'picker') {
        p.state = 'flee';
        p.dir = Math.sign(p.x - b.x) || 1;
        rules().addPanic(g, 8, NEWS.pickerSeen);
        rules().spotted(g, p.x, GY - 100, LABELS.pickerSeen);
        ZS.sim.hunters.alert(g, b.x);
      } else if (sees && p.filmCd <= 0) {
        p.filmCd = 10;
        rules().addPanic(g, 12, NEWS.touristSeen);
        rules().spotted(g, p.x, GY - 100, LABELS.touristFilm);
      }
      if (p.kind === 'tourist' && p.dropCd <= 0) {
        p.dropCd = 18;
        if (L.items.filter((it) => it.type === 'sandwich' && !it.eaten).length < 3) {
          L.items.push({ type: 'sandwich', x: p.x + 30 * p.dir, eaten: false, locked: false });
        }
      }
    }
    g.people = g.people.filter((p) => !p.dead);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.people = { create, update };
})();
