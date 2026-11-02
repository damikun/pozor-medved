(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const SEE = 230, SPRINT = 320, LOOK = 3;

  function update(g) {
    const o = g.level.fisher, b = g.bear;
    if (!o || o.gone || b.covered || Math.abs(b.x - o.x) > (b.running && b.moving ? SPRINT : SEE)) return;
    o.gone = true; o.goneAt = g.time;
    const dir = Math.sign(o.x - b.x) || 1;
    const p = ZS.sim.people.create(g, 'guest', { from: o.x, to: o.x });
    Object.assign(p, { x: o.x, dir, state: 'flee', as: 'fisher', h: { aimAt: [0, 0], look: LOOK } });
    g.people.push(p);
    rules().onSound(g, 'fisher', o.x);
    rules().spotted(g, o.x, GY - 110, LABELS.fisher.shout[Math.floor(Math.random() * LABELS.fisher.shout.length)]);
    rules().addPanic(g, 3, NEWS.fisher);
  }

  ZS.sim.fisher = { update, LOOK };
})();
