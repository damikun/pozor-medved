(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp, lerp } = ZS.util;
  const rules = () => ZS.sim.rules;

  const T = { board: 0.85, open: 0.5, ride: 24, arrive: 1.9, back: 0.8 };
  const LEN = 160, SPEED = LEN / T.ride;
  const ZONES = [-0.5, 0, 0.5], HIT = 0.35, FRAME = 0.68, FLY = 0.14;
  const SWING = { k: 15, c: 2.2, push: 7.4, soft: 0.62, wall: 46 };
  const ZONE = { reach: [-30, 240], aisle: { summer: [-12.2, 11.0], winter: [-16.8, 17.6] } };
  const START = 3.2, LAST = T.ride - 2;
  const PACE = { gap: 0.35, twin: 0.3, wait: 0.4, aim: 1.05 };
  const RETURN = 110, CALM = 1.8, BOARD_AT = 40;
  const GEO = { zc: 2.4, pylon0: 18, pylonGap: 28, top: LEN + 20, deck: 13 };

  const station = (L) => (L && L.lift ? L.lift.x : null);
  const sway = (r) => Math.sin(r.th);
  const zoneOf = (u) => (u < -0.25 ? 0 : u > 0.25 ? 2 : 1);

  function span(aim, pair) {
    return aim + FLY + (pair === 'twin' ? PACE.twin : pair === 'chase' ? PACE.wait + PACE.aim + FLY : 0);
  }

  function schedule(n, slot, late, pairs) {
    const out = [];
    let used = 0, free = START;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), drone = late && i === n - 1;
      const aim = i === 0 ? 1.6 : i === 1 ? 1.35 : lerp(1.1, 0.9, k);
      const at = Math.max(START + i * slot + Math.random() * 0.35, free);
      let pair = pairs && !drone && i >= 3 && used < 2 && Math.random() < 0.45 ? (Math.random() < 0.5 ? 'twin' : 'chase') : null;
      if (pair && at + span(aim, pair) > LAST) pair = null;
      if (pair) used++;
      out.push({ at, aim, pair, drone, side: Math.random() < 0.5 ? -1 : 1 });
      free = at + span(aim, pair) + PACE.gap;
    }
    return { out, end: free - PACE.gap };
  }

  function plan(g) {
    const late = g.seasonIdx >= 2 || !!g.flags.drones;
    const n = 6 + Math.min(2, g.seasonIdx | 0), slot = (LAST - START) / n;
    const s = schedule(n, slot, late, true);
    return s.end <= LAST + 0.6 ? s.out : schedule(n, slot, late, false).out;
  }

  function foes(g, salvos) {
    const aisle = ZONE.aisle[g.level.theme] || ZONE.aisle.summer, list = [];
    salvos.forEach((s, i) => {
      const fire = s.at + s.aim;
      if (s.drone) { list.push({ id: list.length, kind: 'drone', salvo: i, side: 1, x: 2.4, zw: 0, appear: s.at - 1.7 }); return; }
      const sides = s.pair ? [s.side, -s.side] : [s.side];
      sides.forEach((side, j) => {
        const x = (side < 0 ? aisle[0] : aisle[1]) + (Math.random() - 0.5) * 1.6;
        const at = j && s.pair === 'chase' ? fire + FLY + PACE.wait + PACE.aim : fire;
        list.push({ id: list.length, kind: 'hunter', salvo: i, side, x, zw: SPEED * at + 14 + Math.random() * 6 });
      });
    });
    return list;
  }

  function quiet(b) {
    b.hiding = null; b.crouch = false; b.running = false; b.eating = false; b.eatT = 0; b.act = null; b.vx = 0; b.slide = 0;
    b.covered = false; b.inSpray = false; b.warn = false; b.danger = false; b.reach = null; b.stun = 0; b.kx = 0; b.crawl = false;
  }

  function clearPresses(g) {
    const inp = g.input;
    inp.jumpPressed = false; inp.bitePressed = false; inp.hugPressed = false; inp.downReleased = false;
  }

  function start(g) {
    const b = g.bear, L = g.level, x = station(L), salvos = plan(g);
    g.once.lift = true;
    g.ride = {
      phase: 'board', t: 0, clock: 0, x, dir: b.dir < 0 ? -1 : 1, theme: L.theme,
      th: 0, w: 0, input: 0, lean: 0, look: 0, flinch: 0, shake: 0, jolt: 0,
      salvos, foes: [], shots: [], next: 0, chase: null, calm: 0, hits: 0, dodged: 0, saidAt: -99, quipped: false, droneSaid: false,
    };
    g.ride.foes = foes(g, salvos);
    quiet(b);
    clearPresses(g);
    rules().say(g, NEWS.lift);
  }

  function check(g) {
    if (g.ride || g.once.lift || g.over) return false;
    const b = g.bear, x = station(g.level);
    if (x === null || !b.onGround || b.climbing || b.hiding || b.act || b.stun > 0 || b.y < GY - 2) return false;
    const d = b.x - x;
    if (d < ZONE.reach[0] || d > ZONE.reach[1]) return false;
    start(g);
    return true;
  }

  function swing(r, push, dt, damp) {
    const S = SWING, over = Math.abs(r.th) - S.soft;
    let acc = -S.k * Math.sin(r.th) - (damp || S.c) * r.w + S.push * push;
    if (over > 0) acc -= Math.sign(r.th) * S.wall * over;
    r.w += acc * dt;
    r.th += r.w * dt;
    r.lean += ((push * 0.13 - r.w * 0.07) - r.lean) * Math.min(1, dt * 8);
  }

  function float(g, x, y, text, color) {
    rules().float(g, x, y, text, color);
    g.floaters[g.floaters.length - 1].ride = true;
  }

  function shoot(r, foe, aim, first) {
    const z = zoneOf(sway(r));
    r.shots.push({ id: r.shots.length, foe, zone: z, u: ZONES[z], t0: r.t, fire: r.t + aim, aim, state: 'aim', result: null, at: 0, first });
  }

  function salvo(r, s, i) {
    const mine = r.foes.filter((f) => f.salvo === i), other = mine[1] || mine[0];
    shoot(r, mine[0], s.aim, i === 0);
    if (s.pair === 'twin') r.shots.push(Object.assign({}, r.shots[r.shots.length - 1], { id: r.shots.length, foe: other, fire: r.t + s.aim + PACE.twin, aim: s.aim + PACE.twin, first: false }));
    if (s.pair === 'chase') r.chase = { foe: other, at: r.t + s.aim + FLY + PACE.wait, aim: Math.max(PACE.aim, s.aim) };
  }

  function ready(r) {
    return !r.chase && r.t >= r.calm && !r.shots.some((s) => s.state !== 'done');
  }

  function resolve(g, r, shot) {
    const b = g.bear, u = sway(r), d = Math.abs(u - shot.u);
    shot.state = 'done'; shot.at = r.t; shot.hitU = u;
    r.calm = Math.max(r.calm, r.t + PACE.gap);
    if (d < HIT && b.inv <= 0) {
      shot.result = 'hit';
      r.hits++;
      r.flinch = 1; r.shake = 1;
      for (let i = r.next; i < r.salvos.length; i++) r.salvos[i].aim += 0.12;
      g.lives -= 1;
      if (g.lives <= 0) { rules().end(g, g.flags.cull ? 'cull' : 'hunted'); return; }
      b.inv = 1.4;
      float(g, u * 150, 36, LABELS.hit(g.lives), COLORS.shot);
      rules().say(g, NEWS.liftHit, true);
      return;
    }
    shot.result = d < FRAME ? 'spark' : 'miss';
    r.dodged++;
    if (shot.result === 'spark') r.shake = Math.max(r.shake, 0.45);
    float(g, shot.u * 190, 120, LABELS.miss, COLORS.good);
    if (g.time - r.saidAt > 9) { r.saidAt = g.time; rules().say(g, NEWS.liftMiss); }
    if (Math.random() < 0.4) rules().quip(g, ZS.QUIPS.lift);
  }

  function look(r, dt) {
    let want = 0.42 * Math.sin(r.clock * 0.6) + 0.18 * Math.sin(r.clock * 1.7 + 1);
    const live = r.shots.find((s) => s.state === 'aim');
    if (live) want = live.foe.side * 0.9;
    r.look += (want - r.look) * Math.min(1, dt * 5);
  }

  function ride(g, r, dt) {
    const keys = g.input.keys;
    const left = keys.has('ArrowLeft') || keys.has('KeyA'), right = keys.has('ArrowRight') || keys.has('KeyD');
    r.input = (right ? 1 : 0) - (left ? 1 : 0);
    swing(r, r.input, dt);
    const at = (t) => Math.floor((SPEED * t + GEO.zc - GEO.pylon0) / GEO.pylonGap);
    if (at(r.t) > at(r.t - dt) && at(r.t) >= 0) r.jolt = 1;
    if (!r.quipped && r.t > 1.1) { r.quipped = true; rules().quip(g, ZS.QUIPS.lift, true); }
    if (!r.droneSaid && r.foes.some((f) => f.kind === 'drone' && r.t >= f.appear)) { r.droneSaid = true; rules().say(g, NEWS.liftDrone, true); }
    if (r.chase && r.t >= r.chase.at) { shoot(r, r.chase.foe, r.chase.aim, false); r.chase = null; }
    while (r.next < r.salvos.length && r.t >= r.salvos[r.next].at && ready(r)) {
      const s = r.salvos[r.next];
      if (r.t + span(s.aim, s.pair) < T.ride - 0.2) salvo(r, s, r.next);
      r.next++;
    }
    for (const s of r.shots) {
      if (s.state === 'aim' && r.t >= s.fire) s.state = 'fly';
      if (s.state === 'fly' && r.t >= s.fire + FLY) { resolve(g, r, s); if (g.over) return; }
    }
    look(r, dt);
    if (r.t >= T.ride) {
      r.phase = 'arrive'; r.t = 0;
      float(g, sway(r) * 150, -44, LABELS.lift.arrived, COLORS.story);
      rules().say(g, r.hits ? NEWS.liftTop : NEWS.liftClean, !r.hits);
      rules().quip(g, ZS.QUIPS.liftTop, true);
    }
  }

  function land(g, r) {
    const b = g.bear, L = g.level;
    quiet(b);
    b.x = clamp(r.x + r.dir * RETURN, 60, L.w - 60); b.dir = r.dir;
    b.y = GY; b.vy = 0; b.onGround = true; b.climbing = null; b.inCanopy = false; b.hideBlend = 0; b.hideTree = null;
    b.trackX = b.x; b.coyote = 0; b.jumpBuffer = 0; b.upT = 0;
    for (const s of g.shooters) { s.lock = 0; s.reload = Math.max(s.reload, CALM + T.back); s.alertX = null; }
    g.liftCalm = g.time + CALM + T.back;
    g.lastKnown = null;
  }

  function walk(b, to, speed, dt) {
    const d = to - b.x;
    if (Math.abs(d) < 1) { b.moving = false; return; }
    b.dir = Math.sign(d);
    b.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    b.walkT += dt; b.moving = true;
  }

  function update(g, dt) {
    const r = g.ride, b = g.bear;
    if (!r) return;
    r.t += dt; r.clock += dt;
    clearPresses(g);
    b.inv = Math.max(0, b.inv - dt);
    b.quipCd -= dt;
    b.stamina = Math.min(1, b.stamina + 0.22 * dt);
    b.tired = b.tired && b.stamina <= 0.35;
    r.flinch = Math.max(0, r.flinch - dt * 2.4);
    r.shake = Math.max(0, r.shake - dt * 3);
    r.jolt = Math.max(0, r.jolt - dt * 2.5);
    if (r.phase === 'board') {
      walk(b, r.x + BOARD_AT, 105, dt);
      if (r.t >= T.board) { r.phase = 'ride'; r.t = 0; b.moving = false; }
    } else if (r.phase === 'ride') {
      ride(g, r, dt);
    } else if (r.phase === 'arrive') {
      r.input = 0;
      swing(r, 0, dt, 7);
      look(r, dt);
      if (r.t >= T.arrive) { r.phase = 'back'; r.t = 0; land(g, r); }
    } else if (r.phase === 'back') {
      b.x += r.dir * 62 * dt; b.walkT += dt; b.moving = true; b.dir = r.dir; b.trackX = b.x;
      if (r.t >= T.back) { g.ride = null; b.moving = false; }
    }
  }

  function safest(r) {
    const live = r.shots.filter((s) => s.state === 'aim' || s.state === 'fly');
    if (!live.length) return 0;
    const u = sway(r);
    let best = 0, score = -Infinity;
    for (const c of [-0.5, 0, 0.5]) {
      const gap = Math.min(...live.map((s) => Math.abs(c - s.u)));
      const v = Math.min(gap, 0.5) * 10 - Math.abs(c - u);
      if (v > score) { score = v; best = c; }
    }
    return best;
  }

  const inside = (g) => !!g.ride && (g.ride.phase === 'ride' || g.ride.phase === 'arrive');

  ZS.sim = ZS.sim || {};
  ZS.sim.lift = { T, LEN, SPEED, GEO, ZONES, HIT, FRAME, FLY, SWING, PACE, station, check, update, start, safest, inside, sway, zoneOf, swing };
})();
