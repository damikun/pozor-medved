(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;

  const SLOT = 12, EDGE = 16, TALL = 40, AIM = 0.5, MISS = 0.4, BODY = 30, HEARD = 0.6, KEEP = 24;
  const GAP = { run: 0.15, walk: 0.27, creep: 0.45 };

  const field = (L) => (L && L.corn) || null;

  function inside(L, x, m) {
    const f = field(L);
    return !!f && x > f.from + (m || 0) && x < f.to - (m || 0);
  }

  function band(L, m) {
    const f = field(L);
    return f ? [f.from - (m === undefined ? KEEP : m), f.to + (m === undefined ? KEEP : m)] : null;
  }

  const zones = (L) => (L ? L.keepOut || (L.keepOut = [field(L)].concat((L.cannons || []).map((c) => {
    const a = c.x + c.dir * 50, e = c.x + c.dir * 230;
    return { from: Math.min(a, e), to: Math.max(a, e) };
  })).filter(Boolean)) : []);

  const near = (L, x) => zones(L).reduce((n, z) => (!n || Math.abs((z.from + z.to) / 2 - x) < Math.abs((n.from + n.to) / 2 - x) ? z : n), null);
  const edges = (z, m) => [z.from - (m === undefined ? KEEP : m), z.to + (m === undefined ? KEEP : m)];

  function side(L, x) {
    const z = near(L, x);
    return !z || x < (z.from + z.to) / 2 ? -1 : 1;
  }

  function hold(L, prev, x, m) {
    for (const z of zones(L)) {
      const b = edges(z, m);
      if (prev <= b[0] && x > b[0]) x = b[0];
      else if (prev >= b[1] && x < b[1]) x = b[1];
      else if (x > b[0] && x < b[1]) x = prev < (b[0] + b[1]) / 2 ? b[0] : b[1];
    }
    return x;
  }

  function blocks(L, a, c, m) {
    return zones(L).some((z) => { const b = edges(z, m); return Math.max(a, c) > b[0] && Math.min(a, c) < b[1]; });
  }

  function range(L, o, m, min) {
    for (const z of zones(L)) {
      const b = edges(z, m), left = o.x < (z.from + z.to) / 2;
      if (o.x > b[0] && o.x < b[1]) o.x = left ? b[0] : b[1];
      if (o.from === null || o.from === undefined || o.to === null || o.to === undefined) continue;
      if (o.to <= b[0] || o.from >= b[1]) continue;
      const w = min || 160;
      if (left) { o.to = Math.min(o.to, b[0]); o.from = Math.min(o.from, o.to - w); }
      else { o.from = Math.max(o.from, b[1]); o.to = Math.max(o.to, o.from + w); }
      o.x = Math.max(o.from, Math.min(o.to, o.x));
    }
    return o;
  }

  function state(g, f) {
    if (g.corn) return g.corn;
    const n = Math.ceil((f.to - f.from) / SLOT) + 1;
    return (g.corn = { n, hit: new Array(n).fill(-99), dir: new Array(n).fill(0), k: new Array(n).fill(0), snd: 0 });
  }

  function brush(g, c, f, x, dir, k) {
    const a = Math.max(0, Math.floor((x - BODY - f.from) / SLOT)), z = Math.min(c.n - 1, Math.floor((x + BODY - f.from) / SLOT));
    for (let i = a; i <= z; i++) {
      if (g.time - c.hit[i] > 0.4 || k >= c.k[i]) { c.k[i] = k; c.dir[i] = dir || 1; }
      c.hit[i] = g.time;
    }
  }

  function aim(g) {
    const b = g.bear;
    return b.inCorn && !(b.running && b.moving) ? AIM : 1;
  }

  const miss = (g) => (g.bear.inCorn ? MISS : 0);

  function enter(g, b) {
    if (g.once.corn) return;
    g.once.corn = true;
    rules().float(g, b.x, GY - 120, LABELS.corn, COLORS.good);
    rules().quip(g, ZS.QUIPS.corn, true);
    rules().say(g, NEWS.corn);
  }

  function stir(g, x, dir, k) {
    const f = field(g.level);
    if (f && inside(g.level, x, -BODY)) brush(g, state(g, f), f, x, dir, k);
  }

  function update(g, dt) {
    const L = g.level, f = field(L), b = g.bear;
    if (!f) return;
    const was = b.inCorn;
    b.inCorn = !b.climbing && !g.ride && b.y > GY - TALL && inside(L, b.x, EDGE);
    if (b.inCorn && b.crouch && b.onGround) b.covered = true;
    const c = state(g, f);
    c.snd -= dt;
    if (b.inCorn && b.moving && b.onGround) {
      const gait = b.running ? 'run' : b.crouch ? 'creep' : 'walk';
      brush(g, c, f, b.x, b.dir, gait === 'run' ? 1 : gait === 'creep' ? 0.35 : 0.65);
      if (c.snd <= 0) { c.snd = GAP[gait]; rules().onSound(g, 'corn', b.x, gait === 'run' ? 1 : gait === 'creep' ? 0.4 : 0.7); }
    }
    for (const s of g.shooters) if (s.kind !== 'posed' && inside(L, s.x, -BODY)) brush(g, c, f, s.x, s.dir, HEARD);
    for (const p of g.people) if (inside(L, p.x, -BODY)) brush(g, c, f, p.x, p.dir, HEARD);
    if (b.inCorn && !was) enter(g, b);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.corn = { SLOT, AIM, MISS, KEEP, field, inside, band, side, hold, blocks, range, stir, update, aim, miss };
})();
