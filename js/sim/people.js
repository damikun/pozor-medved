(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const pen = () => ZS.sim.pen;
  const SPEED = { tourist: 25, santa: 22, picker: 35 };
  const SHY = { picker: 'pickerSeen', santa: 'santaSeen' };

  function create(g, kind, o) {
    const p = Object.assign({
      kind, x: (o.from + o.to) / 2, dir: 1, speed: SPEED[kind] || 30, state: 'walk', pause: 0, filmCd: 0, dropCd: 8,
      react: null, reactT: 0, empty: false, clutch: false, hurdle: null,
    }, o);
    if (o.from !== o.to) { pen().range(g && g.level, p, pen().KEEP.person, 200); ZS.sim.corn.range(g && g.level, p, undefined, 200); }
    if (kind === 'tycoon') ZS.sim.tycoon.init(p);
    return p;
  }

  function flee(g, p, dt) {
    const P = pen(), L = g.level;
    if (p.hurdle) { P.hurdleStep(p, dt); return; }
    const v = p.leaving ? p.speed * 1.4 : (p.clutch ? 170 : 210) * (P.inside(L, p.x, 0) ? P.HURDLE.inside : 1);
    const nx = p.x + p.dir * v * dt;
    if (p.leaving) {
      const hx = ZS.sim.corn.hold(L, p.x, P.hold(L, p.x, nx, P.KEEP.person));
      if (hx !== nx) p.dir *= -1;
      p.x = hx;
      return;
    }
    const fx = P.ahead(L, p.x, p.dir);
    if (fx !== null && Math.abs(fx - nx) <= P.HURDLE.reach) { P.hurdleAt(p, fx, p.dir); P.hurdleStep(p, dt); return; }
    const cx = ZS.sim.corn.hold(L, p.x, nx);
    if (cx !== nx) p.dir *= -1;
    p.x = cx;
  }

  function crumbs(L, p) {
    let x = p.x + 30 * p.dir;
    if (pen().inside(L, x, 40)) x = p.x - 30 * p.dir;
    return x;
  }

  function update(g, dt) {
    const b = g.bear, L = g.level;
    for (const p of g.people) {
      p.filmCd -= dt; p.dropCd -= dt;
      if (p.kind === 'tycoon') ZS.sim.tycoon.update(g, p, dt);
      if (p.react) {
        const x0 = p.x;
        ZS.sim.encounters.reactPerson(g, p, dt);
        p.x = ZS.sim.corn.hold(L, x0, p.x);
        continue;
      }
      if (p.state === 'flee' || p.leaving || p.hurdle) {
        flee(g, p, dt);
        if (Math.abs(p.x - b.x) > 1600 || p.x < -200 || p.x > L.w + 200) p.dead = true;
        continue;
      }
      if (p.kind === 'tycoon') continue;
      if (p.pause > 0) p.pause -= dt;
      else {
        const nx = p.x + p.dir * p.speed * dt, hx = ZS.sim.corn.hold(L, p.x, pen().hold(L, p.x, nx, pen().KEEP.person));
        p.x = hx;
        if (hx !== nx || p.x < p.from || p.x > p.to) { p.dir *= -1; p.x = clamp(p.x, p.from, p.to); p.pause = 2; }
      }
      const d = Math.abs(b.x - p.x);
      const ahead = Math.sign(b.x - p.x) === p.dir;
      const sees = (!b.covered || (b.hiding && d < 55)) && (d < 110 || (ahead && d < (p.kind === 'tourist' ? 380 : 300)));
      if (sees && SHY[p.kind]) {
        p.state = 'flee';
        p.dir = Math.sign(p.x - b.x) || 1;
        rules().addPanic(g, 8, NEWS[SHY[p.kind]]);
        rules().spotted(g, p.x, GY - 100, LABELS.pickerSeen);
        ZS.sim.hunters.alert(g, b.x);
      } else if (sees && p.filmCd <= 0) {
        p.filmCd = Infinity;
        rules().addPanic(g, 12, NEWS.touristSeen);
        rules().spotted(g, p.x, GY - 100, LABELS.touristFilm);
      }
      if (p.kind === 'tourist' && p.dropCd <= 0) {
        p.dropCd = 18;
        if (L.items.filter((it) => it.type === 'sandwich' && !it.eaten).length < 3) {
          L.items.push({ type: 'sandwich', x: crumbs(L, p), eaten: false, locked: false });
        }
      }
    }
    g.people = g.people.filter((p) => !p.dead);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.people = { create, update };
})();
