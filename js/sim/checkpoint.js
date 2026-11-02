(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;
  const LIVES = 3;
  const SCALARS = ['fat', 'syn', 'panic', 'time', 'seasonIdx', 'seasonKey', 'nextEvent', 'courtUntil', 'viralUntil', 'hugBanAt', 'problem', 'lastHuman',
    'readySaid', 'falls', 'refusals', 'ladders', 'liftCalm', 'hideSaid', 'zapSaid'];

  const plain = (v) => !!v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
  const copy = (v) => (Array.isArray(v) ? v.map(copy) : plain(v) ? Object.fromEntries(Object.keys(v).map((k) => [k, copy(v[k])])) : v);
  const same = (a, b) => a.type === b.type && Math.abs(a.x - b.x) < 0.5;

  function save(g) {
    const L = g.level, b = g.bear, s = { level: L.id, x: b.x, dir: b.dir, lives: Math.max(LIVES, g.lives) };
    for (const k of SCALARS) s[k] = g[k];
    Object.assign(s, {
      flags: copy(g.flags), once: Object.assign(copy(g.once), { lift: true }), stats: copy(g.stats), usedEvents: [...g.usedEvents], saidAt: copy(g.saidAt),
      shooters: g.shooters.map(copy), drones: g.drones.map(copy),
      items: L.items.map((it) => ({ type: it.type, x: it.x, eaten: !!it.eaten, locked: !!it.locked })),
      posts: L.posts.map((p) => p.x), noses: (L.snowmen || []).map((m) => m.nose),
    });
    return s;
  }

  const offer = (s, g) => !!s && !!g && g.over && g.ending !== 'win' && s.level === g.level.id;

  function items(L, s) {
    for (const it of L.items) {
      const was = s.items.find((o) => same(o, it));
      if (!was) continue;
      it.locked = was.locked;
      if (it.x < s.x) it.eaten = was.eaten;
    }
    for (const o of s.items) {
      if (L.items.some((it) => same(o, it))) continue;
      L.items.push({ type: o.type, x: o.x, eaten: o.x < s.x && o.eaten, locked: o.locked });
    }
    L.items.sort((a, c) => a.x - c.x);
    for (const x of s.posts) if (!L.posts.some((p) => p.x === x)) L.posts.push({ x });
    (L.snowmen || []).forEach((m, i) => { if (m.x < s.x && i < s.noses.length) m.nose = s.noses[i]; });
  }

  function resume(s, input, opts) {
    const g = sim.rules.create(input, Object.assign({}, opts, { level: s.level }));
    const b = g.bear;
    for (const k of SCALARS) g[k] = s[k];
    Object.assign(g, {
      lives: s.lives, flags: copy(s.flags), once: Object.assign(copy(s.once), { lift: true }), stats: copy(s.stats), usedEvents: new Set(s.usedEvents),
      saidAt: copy(s.saidAt), shooters: s.shooters.map(copy), drones: s.drones.map(copy), ride: null, lastKnown: null,
    });
    items(g.level, s);
    Object.assign(b, { x: s.x, trackX: s.x, dir: s.dir, y: GY, vy: 0, onGround: true, waking: false, wakeT: 0 });
    g.cam = sim.loop.cameraX(g);
    return g;
  }

  ZS.sim.checkpoint = { LIVES, save, offer, resume };
})();
