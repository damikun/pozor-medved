(function () {
  const { CFG, COLORS, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;

  const RIDE = { start: 200, dock: 11500, stop: 11930, cruise: 200, fast: 245, gas: 300, sway: 2.6, push: 8, pull: 4.2, bump: 60, inv: 1.6, wake: 1150, land: 1.3 };
  const BOAT = { back: 62, front: 74 };
  const SIZE = { buoy: 26, log: 96, pier: 44, barge: 500, cruise: 640, police: 120, raketa: 210, snack: 34 };
  const REAR = 0.72, BEAM = 240, SWEEP = 3.4, SURF = 1250, BAND = 420, WARN = 2.6, SPAWN = 860;
  const BRIDGES = [
    { id: 'stary', x: 2520, piers: [0, 2] },
    { id: 'snp', x: 5150, piers: [] },
    { id: 'lafranconi', x: 9620, piers: [1] },
  ];
  const COURSE = [
    { kind: 'cruise', lane: 0, x: 860 },
    { kind: 'snack', lane: 1, x: 1250 },
    { kind: 'buoy', lane: 2, x: 1560 },
    { kind: 'log', lane: 1, x: 2060 },
    { kind: 'buoy', lane: 2, x: 3020 },
    { kind: 'barge', lane: 1, x: 3420, vx: -55 },
    { kind: 'log', lane: 2, x: 3700 },
    { kind: 'raketa', lane: 0, at: 4300 },
    { kind: 'buoy', lane: 1, x: 4700 },
    { kind: 'snack', lane: 2, x: 5000 },
    { kind: 'snack', lane: 1, x: 6700 },
    { kind: 'barge', lane: 2, x: 6250, vx: 70 },
    { kind: 'buoy', lane: 0, x: 6950 },
    { kind: 'police', lane: 1, x: 7750 },
    { kind: 'cruise', lane: 0, x: 8350, vx: -50 },
    { kind: 'police', lane: 2, x: 9300 },
    { kind: 'raketa', lane: 0, at: 9700 },
    { kind: 'log', lane: 1, x: 10300 },
    { kind: 'snack', lane: 0, x: 10500 },
    { kind: 'buoy', lane: 1, x: 11250 },
  ];

  const has = (g, a, b) => g.input.keys.has(a) || g.input.keys.has(b);

  function stage() {
    const S = ZS.levelKit.boatStage();
    S.start = S.boat.start;
    return S;
  }

  function build() {
    const list = COURSE.map((o, i) => Object.assign({ id: i, vx: 0, len: SIZE[o.kind] }, o, { a: o.x, live: false, hit: false }));
    for (const B of BRIDGES) for (const l of B.piers) list.push({ id: list.length, kind: 'pier', lane: l, x: B.x - SIZE.pier / 2, a: B.x - SIZE.pier / 2, len: SIZE.pier, vx: 0, ly: l, live: true, hit: false, bridge: B.id });
    for (const o of list) if (o.kind === 'raketa') { o.a = null; o.band = [o.at + SURF, o.at + SURF + BAND]; o.surf = false; o.wet = false; o.waves = [o.lane, o.lane === 2 ? 1 : o.lane + 1].sort(); }
    for (const o of list) if (o.kind === 'police') { o.d = o.lane === 2 ? -1 : 1; o.bl = o.lane; }
    return list;
  }

  function start(g, S) {
    const b = g.bear;
    rules().say(g, LABELS.boat.news.board, true);
    rules().onSound(g, 'horn', S.start);
    Object.assign(b, { x: S.start, trackX: S.start, dir: 1, y: GY, rear: REAR });
    return { t: 0, v: 0, lane: 0, ly: 0, cd: 0, hits: 0, snacks: 0, shake: 0, bob: 0, obs: build(), dock: null, said: {}, jump: 0, lv: 0, held: 0 };
  }

  function span(o) {
    return o.kind === 'police' ? [o.a - BEAM, o.a + o.len] : [o.a, o.a + o.len];
  }

  function laneOf(o) {
    return o.lane;
  }

  function steer(g, c, dt) {
    const lt = has(g, 'ArrowLeft', 'KeyA'), rt = has(g, 'ArrowRight', 'KeyD');
    const want = rt && !lt ? -1 : lt && !rt ? 1 : 0;
    if (want && (want !== c.held || Math.abs(c.ly - c.lane) < 0.4)) c.lane = clamp(c.lane + want, 0, 2);
    c.held = want;
    const aim = RIDE.cruise + (RIDE.fast - RIDE.cruise) * clamp(g.bear.x / RIDE.dock, 0, 1);
    c.v += clamp(aim - c.v, -RIDE.gas * dt, RIDE.gas * dt);
  }

  function glide(c, dt) {
    const d = c.lane - c.ly, aim = clamp(d * RIDE.pull, -RIDE.sway, RIDE.sway);
    c.lv += clamp(aim - c.lv, -RIDE.push * dt, RIDE.push * dt);
    c.ly += c.lv * dt;
    if (c.ly < 0 || c.ly > 2) { c.ly = clamp(c.ly, 0, 2); c.lv = 0; }
    if (Math.abs(d) < 0.003 && Math.abs(c.lv) < 0.05) { c.ly = c.lane; c.lv = 0; }
  }

  function police(g, c, o) {
    o.bl = o.lane + o.d * (0.5 - 0.5 * Math.cos((c.t / SWEEP) * Math.PI * 2 + o.id));
  }

  function traffic(g, c, dt) {
    const b = g.bear;
    for (const o of c.obs) {
      if (!o.live) {
        if (o.kind === 'raketa' ? b.x >= o.at : b.x >= o.x - RIDE.wake) {
          o.live = true;
          if (o.kind === 'raketa') { o.a = b.x - SPAWN - o.len; rules().onSound(g, 'horn', b.x - 300); rules().float(g, b.x - 40, GY - 150, LABELS.boat.raketa, COLORS.zap); }
          if (o.kind === 'barge') rules().onSound(g, 'horn', o.a);
        }
        continue;
      }
      if (o.kind === 'raketa') {
        o.a += 600 * dt;
        if (!o.surf && o.a > o.band[0]) o.surf = true;
        if (o.a > b.x + 1300) o.gone = true;
        continue;
      }
      if (o.gone) continue;
      o.a += o.vx * dt;
      if (o.vx && o.a + o.len < b.x - 1300) o.gone = true;
      if (o.kind === 'police') police(g, c, o);
    }
  }

  function aside(c, o, x) {
    const pick = [c.lane - 1, c.lane + 1].filter((l) => l >= 0 && l <= 2);
    let best = null, bt = -1;
    for (const l of pick) {
      let t = 9;
      for (const p of c.obs) {
        if (p === o || !p.live || p.a === null || laneOf(p) !== l || p.kind === 'snack') continue;
        const [a, z] = span(p);
        if (z > x - 200 && a < x + 400) t = Math.min(t, Math.max(0, (a - x) / 300));
      }
      if (t > bt) { bt = t; best = l; }
    }
    return best === null ? c.lane : best;
  }

  function hit(g, c, o, why) {
    const b = g.bear, solid = why !== 'wave' && why !== 'seen';
    if (why === 'seen') o.seen = true; else o.hit = true;
    if (solid) { c.v = RIDE.bump; c.lane = aside(c, o, b.x); rules().onSound(g, 'splash', b.x, 1); }
    if (b.inv > 0) return;
    c.hits++;
    b.inv = RIDE.inv;
    c.shake = 1;
    if (g.lives > 1) { g.lives -= 1; rules().float(g, b.x, GY - 120, LABELS.hit(g.lives), COLORS.shot); }
    rules().addPanic(g, 3);
    if (why === 'seen') rules().spotted(g, b.x, GY - 150, LABELS.boat.hit.seen);
    else rules().float(g, b.x + 40, GY - 150, LABELS.boat.hit[why] || LABELS.boat.hit.crash, COLORS.seen);
    rules().onSound(g, why === 'wave' ? 'thud' : why === 'seen' ? 'whistle' : 'crash', b.x);
    if (why === 'wave') c.jump = 1;
    if (!c.said.hit) { c.said.hit = true; rules().say(g, LABELS.boat.news.crash, true); }
    rules().quip(g, LABELS.boat.quips, true);
  }

  function eat(g, c, o) {
    const b = g.bear;
    o.hit = true; o.got = true;
    c.snacks++;
    g.fat = Math.min(100, g.fat + 3);
    rules().float(g, b.x + 30, GY - 140, LABELS.boat.fish, COLORS.good);
    rules().onSound(g, 'eat', b.x, 'fish');
  }

  function collide(g, c) {
    const b = g.bear, lo = b.x - BOAT.back, hi = b.x + BOAT.front;
    for (const o of c.obs) {
      if (!o.live || o.a === null) continue;
      if (o.kind === 'raketa' && o.surf && !o.wet && hi > o.band[0] && lo < o.band[1]) {
        o.wet = true;
        rules().onSound(g, 'splash', b.x, o.waves.includes(Math.round(c.ly)) ? 1 : 0.45);
        if (o.waves.includes(Math.round(c.ly))) hit(g, c, o, 'wave');
        else rules().float(g, b.x + 30, GY - 140, LABELS.boat.ok, COLORS.good);
      }
      if (o.hit) continue;
      if (o.kind === 'police' && !o.seen && Math.abs(o.bl - c.ly) < 0.55 && o.a - BEAM < hi && o.a > lo) hit(g, c, o, 'seen');
      if (Math.abs(o.lane - c.ly) >= 0.55) continue;
      if (o.a < hi && o.a + o.len > lo) { if (o.kind === 'snack') eat(g, c, o); else hit(g, c, o, o.kind); }
    }
  }

  function docking(g, c, dt) {
    const b = g.bear, D = c.dock;
    D.t += dt;
    c.lane = 0;
    glide(c, dt);
    const left = RIDE.stop - b.x;
    c.v = Math.max(0, Math.min(c.v, Math.max(18, left * 1.4)));
    if (left <= 0.5) { c.v = 0; b.x = RIDE.stop; D.moored = D.moored || D.t; }
    b.x += c.v * dt; b.trackX = b.x;
    b.rear = clamp((b.rear || 0) + dt * (D.moored ? 0.8 : 0), 0, 1);
    return !!D.moored && D.t - D.moored >= RIDE.land;
  }

  function finish(g, c) {
    g.once.boat = true;
    g.once.boatRide = { hits: c.hits, snacks: c.snacks };
    if (!c.hits) g.panic = Math.max(0, g.panic - 6);
    rules().say(g, c.hits ? LABELS.boat.news.dent : LABELS.boat.news.clean, true);
    g.bear.rear = 0;
    return true;
  }

  function update(g, c, dt) {
    const b = g.bear;
    c.t += dt;
    c.shake = Math.max(0, c.shake - dt * 2.2);
    c.jump = Math.max(0, c.jump - dt * 1.6);
    ZS.sim.passes.clearPresses(g);
    Object.assign(b, { dir: 1, y: GY, moving: false, running: false, crouch: false, vy: 0, onGround: true });
    if (!c.dock) b.rear = REAR;
    traffic(g, c, dt);
    if (c.dock) return docking(g, c, dt) && finish(g, c);
    steer(g, c, dt);
    glide(c, dt);
    b.x += c.v * dt; b.trackX = b.x;
    collide(g, c);
    if (b.x >= RIDE.dock) c.dock = { t: 0, moored: 0 };
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
  }

  function plan(g) {
    return ZS.sim.passes.playing(g, 'boat');
  }

  function meet(b, o, v, M, hull) {
    const [a, z] = hull ? [o.a, o.a + o.len] : span(o), vo = o.kind === 'raketa' ? 600 : o.vx;
    const rel = vo - v, f = a - (b.x + BOAT.front + M), r = z - (b.x - BOAT.back - M);
    if (Math.abs(rel) < 1e-6) return f < 0 && r > 0 ? [0, Infinity] : null;
    let t0 = -f / rel, t1 = -r / rel;
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t1 < 0) return null;
    return [Math.max(0, t0), t1];
  }

  function danger(c, b, lane, v, H) {
    let T = Infinity;
    for (const o of c.obs) {
      if (o.kind === 'raketa' && o.live && !o.wet && o.waves.includes(lane)) {
        const d = o.band[0] - (b.x + BOAT.front + 26), e = o.band[1] - (b.x - BOAT.back - 26);
        if (e > 0) T = Math.min(T, Math.max(0, d / v));
      }
      const lanes = o.kind === 'police' ? [o.lane, o.lane + o.d] : [o.lane];
      if (o.hit || o.a === null || o.kind === 'snack' || !lanes.includes(lane)) continue;
      const m = meet(b, o, v, 26, o.kind !== 'police');
      if (m && m[0] <= H) T = Math.min(T, m[0]);
    }
    return T;
  }

  function incoming(g, c) {
    const b = g.bear, out = [];
    for (const o of c.obs) {
      if (o.hit || o.a === null || o.kind === 'snack') continue;
      const m = meet(b, o, c.v, 0);
      if (m && m[0] > 0 && m[0] < WARN) out.push({ o, t: m[0], lane: o.lane, back: o.kind === 'raketa' });
    }
    for (const o of c.obs) {
      if (o.kind !== 'raketa' || o.wet) continue;
      const d = o.band[0] - (b.x + BOAT.front);
      if (d > 0 && d < Math.max(c.v, 120) * WARN) out.push({ o, t: d / Math.max(c.v, 1), wave: true });
    }
    return out;
  }

  function snackIn(c, b, lane, v) {
    return c.obs.some((o) => o.kind === 'snack' && !o.hit && o.live && o.lane === lane && o.a > b.x + BOAT.front && o.a - b.x < v * 2.6);
  }

  function advice(g, c) {
    const b = g.bear, H = 2.2, v = Math.max(c.v, 120), T = [0, 1, 2].map((l) => danger(c, b, l, v, H)), cur = c.lane;
    let goal = cur;
    if (T[cur] < H) {
      let best = -Infinity;
      for (let l = 0; l < 3; l++) {
        let t = T[l];
        if (Math.abs(l - cur) === 2 && T[1] < 0.6) t = Math.min(t, T[1]);
        const score = Math.min(t, 9) - 0.2 * Math.abs(l - cur);
        if (score > best) { best = score; goal = l; }
      }
    } else if (!snackIn(c, b, cur, v)) {
      for (const l of [cur - 1, cur + 1]) if (l >= 0 && l <= 2 && T[l] >= H && snackIn(c, b, l, v)) goal = l;
    }
    return { T, goal, H };
  }

  function pilot(g, c) {
    const b = g.bear, keys = g.input.keys;
    if (c.dock) return;
    const { goal } = advice(g, c);
    if (goal < c.lane) keys.add('ArrowRight');
    else if (goal > c.lane) keys.add('ArrowLeft');
  }

  ZS.sim.boat = { RIDE, BOAT, SIZE, BEAM, BRIDGES, COURSE, stage, start, update, idle, plan, pilot, span, incoming, danger, laneOf, advice };
})();
