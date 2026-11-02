(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const corn = () => ZS.sim.corn;

  const ROAM = 150, NEAR = 165, SNEAK = 90, WALK = 24, RUN = 280, BACK = 70, AWAY = 26, FAR = 950;

  function rnd(o) {
    o.seed = (o.seed * 16807) % 2147483647;
    return (o.seed - 1) / 2147483646;
  }

  function create(L) {
    const x = L.corn.boar;
    return { id: 'boar', x, home: x, to: x, dir: -1, state: 'root', t: 2.5, grunt: 1.5, gruntAt: -99, scaredAt: -99, chew: 0, seed: 48271, snd: 0 };
  }

  function root(o) {
    o.state = 'root';
    o.t = 3 + rnd(o) * 4;
  }

  function wander(o) {
    o.state = 'walk';
    o.to = o.home + (rnd(o) * 2 - 1) * ROAM;
    o.dir = Math.sign(o.to - o.x) || o.dir;
  }

  function startle(g, o) {
    const b = g.bear;
    o.state = 'flee';
    o.dir = Math.sign(o.x - b.x) || 1;
    o.scaredAt = g.time;
    o.snd = 0;
    rules().onSound(g, 'boar', o.x, 'squeal');
    rules().float(g, o.x, GY - 90, LABELS.boar, COLORS.story);
    if (!(g.time - g.saidAt.boar < 40)) { g.saidAt.boar = g.time; rules().say(g, NEWS.boar); }
  }

  function update(g, dt) {
    const L = g.level, f = L.corn;
    if (!f || f.boar === undefined) return;
    const o = g.boar || (g.boar = create(L)), b = g.bear;
    o.t -= dt;
    if (o.state === 'gone') {
      if (o.t <= 0 && Math.abs(b.x - o.home) > FAR) {
        o.state = 'back';
        o.x = b.x < o.home ? f.to + 260 : f.from - 260;
        o.dir = Math.sign(o.home - o.x);
      }
      return;
    }
    const d = Math.abs(b.x - o.x), low = b.y > GY - 60 && !g.ride;
    if (o.state !== 'flee' && low && d < (b.crouch && !b.running ? SNEAK : NEAR)) startle(g, o);
    if (o.state === 'flee') {
      o.x += o.dir * RUN * dt;
      corn().stir(g, o.x, o.dir, 1);
      if (corn().inside(L, o.x, -20) && (o.snd -= dt) <= 0) { o.snd = 0.18; rules().onSound(g, 'corn', o.x, 0.9); }
      const out = Math.max(f.from - o.x, o.x - f.to);
      if ((out > 360 && Math.abs(o.x - b.x) > 700) || out > 1400) { o.state = 'gone'; o.t = 30; }
      return;
    }
    if (o.state === 'back') {
      o.x += o.dir * BACK * dt;
      corn().stir(g, o.x, o.dir, 0.5);
      if (Math.abs(o.x - o.home) < ROAM) root(o);
    } else if (o.state === 'walk') {
      o.x += o.dir * WALK * dt;
      corn().stir(g, o.x, o.dir, 0.35);
      if ((o.to - o.x) * o.dir <= 0) root(o);
    } else {
      o.chew -= dt;
      if (o.chew <= 0) { o.chew = 0.7 + rnd(o) * 0.8; corn().stir(g, o.x + o.dir * AWAY, o.dir, 0.25); }
      if (o.t <= 0) wander(o);
    }
    if ((o.grunt -= dt) <= 0) {
      o.grunt = 3.5 + rnd(o) * 5;
      o.gruntAt = g.time;
      rules().onSound(g, 'boar', o.x, 'grunt');
    }
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.boar = { NEAR, SNEAK, create, update };
})();
