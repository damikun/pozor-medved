(function () {
  const { LABELS, NEWS } = ZS;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const ALT = 120;

  function create(g, phase) {
    return { x: g.bear.x + 300, y: ALT, speed: 130, beam: 70, cd: 0, t: 0, phase };
  }

  function update(g, dt) {
    const b = g.bear, R = g.level.indoor, roof = (x) => !!R && x > R[0] - 60 && x < R[1] + 60;
    const out = (x, from) => (from - R[0] < R[1] - from ? R[0] - 80 : R[1] + 80);
    for (const d of g.drones) {
      d.cd -= dt; d.t += dt;
      if (roof(d.x)) d.x = out(d.x, d.x);
      let target = b.x + Math.sin(d.t * 0.45 + d.phase) * 420;
      if (roof(target)) target = out(target, d.x);
      d.x += clamp(target - d.x, -d.speed * dt, d.speed * dt);
      d.y = ALT + Math.sin(d.t * 1.7 + d.phase) * 7 + Math.sin(d.t * 0.38 + d.phase * 2) * 18;
      if (roof(b.x)) continue;
      if (!b.covered && Math.abs(b.x - d.x) < d.beam && d.cd <= 0) {
        d.cd = 4;
        g.lastKnown = b.x;
        ZS.sim.hunters.alert(g, b.x);
        rules().addPanic(g, 3, NEWS.droneSeen);
        rules().spotted(g, d.x, d.y + 50, LABELS.droneSeen);
      }
    }
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.drones = { create, update };
})();
