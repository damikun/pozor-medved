(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const GRAB = 24, KEEP = 16, UP = 27, DOWN = 110, RUNG = 25, HATCH0 = 48, RISE0 = 118, IN0 = 0.85, OUT = 0.55, BAIL = 0.42, SIT = 0.7, SNACK = 1.5, CABIN = 150;

  const hunterOf = (g, p) => g.shooters.find((s) => s.kind === 'posed' && s.home === p.x && !s.dead) || null;

  function rail(p) {
    return p.rail || (p.rail = { x: p.x, w: 20, ladder: true, post: p, phase: 'climb', k: 0, t: 0, h: 0, lives: 0, rung: 0, snack: true, shooter: null });
  }

  function at(g) {
    const b = g.bear;
    if (!b.onGround || b.act || b.stun > 0 || b.y < GY - 2) return null;
    for (const p of g.level.posts) {
      if (Math.abs(p.x - b.x) > (p === b.ladderNear ? GRAB + KEEP : GRAB)) continue;
      return p;
    }
    return null;
  }

  function grab(g, p) {
    const b = g.bear, r = rail(p), h = hunterOf(g, p), s = h && !h.react ? h : null;
    Object.assign(r, { phase: 'climb', k: 0, t: 0, h: 0, lives: g.lives, rung: 0, shooter: s });
    b.climbing = r; b.climbT = 0; b.climbV = -1; b.inCanopy = false; b.covered = false; b.onGround = false;
    b.vy = 0; b.vx = 0; b.y = GY - 1; b.jumpBuffer = 0; b.coyote = 0; b.hiding = null; b.hideBlend = 0; b.hideTree = null;
    b.crouch = false; b.running = false; b.moving = false; b.eating = false; b.eatT = 0;
    if (s) s.alertX = p.x;
    rules().onSound(g, 'rung', p.x);
  }

  function exposed(g, s) {
    const r = g.bear.climbing;
    return !!r && !!r.ladder && r.phase === 'climb' && r.post.x === s.home;
  }

  function creak(g, r, dt) {
    const p = r.post, s = r.shooter, on = r.phase !== 'seat' && g.bear.climbV !== 0;
    r.creak = Math.max(0, Math.min(1, (r.creak || 0) + (on ? dt / 0.25 : -dt / 0.4)));
    r.wave = (r.wave || 0) + dt;
    if (p.shakeT !== undefined) return;
    const jolt = r.phase === 'in' || r.phase === 'out' ? Math.sin(r.k * Math.PI) : 0;
    p.sway = r.creak * 3 * Math.sin(r.wave * Math.PI * 2 * 1.6) + 4 * jolt * Math.sin(r.wave * 31);
    p.shake = Math.max(0.3 * r.creak, 0.7 * jolt);
    if (s && !s.react) s.sway = p.sway;
  }

  function settle(p) {
    if (p.shakeT === undefined) { p.sway = 0; p.shake = 0; }
  }

  function off(g, b, r) {
    b.climbing = null; b.inCanopy = false; b.covered = false; b.climbV = 0; b.danger = false;
    if (r.shooter && !r.shooter.react) r.shooter.sway = 0;
    settle(r.post);
  }

  function fall(g, b, r) {
    off(g, b, r);
    b.onGround = false; b.vy = 0; b.offTree = true;
    b.push = -b.dir * 34;
  }

  function panic(g, r) {
    const s = r.shooter, p = r.post;
    if (!s || s.react || s.dead) return;
    s.wobble = 1; s.lock = 0; s.alertX = null; s.dir = -g.bear.dir || 1;
    rules().onSound(g, 'freeze', p.x);
    const list = LABELS.shout.ladder;
    rules().float(g, p.x, GY - CABIN - 96, list[Math.floor(Math.random() * list.length)], COLORS.story);
  }

  function bail(g, r) {
    const s = r.shooter, p = r.post, side = g.bear.dir || 1;
    if (!s || s.react || s.dead) return;
    s.react = 'drop'; s.reactT = 0; s.dropK = 0; s.side = side; s.dir = -side; s.bolt = true;
    s.fy = GY - CABIN; s.fx = p.x; s.x = p.x; s.lock = 0; s.alertX = null; s.wobble = 0; s.sway = 0; s.life = Infinity;
    ZS.sim.encounters.drop(g, s, side * (70 + Math.random() * 40), -150, GY - CABIN - 20);
    g.stats.stomps++;
    g.ladders = (g.ladders || 0) + 1;
    rules().float(g, p.x, GY - CABIN - 70, LABELS.standTaken, COLORS.story);
    rules().addPanic(g, 6, NEWS.standClimb[(g.ladders - 1) % NEWS.standClimb.length], true);
  }

  function snack(g, r) {
    if (!r.snack || r.post.snack === false) return;
    r.snack = false;
    const n = g.floaters.length;
    rules().eat(g, { type: 'sandwich', x: r.post.x, labelKey: r.post.snackKey || 'hunterSnack', eaten: false, locked: false });
    for (let i = n; i < g.floaters.length; i++) g.floaters[i].y = GY - CABIN - 45;
    rules().quip(g, ZS.QUIPS.ladder, true);
  }

  function climb(g, b, dt, up, down, jump, dx) {
    const r = b.climbing, s = r.shooter, P = r.post, HATCH = P.hatch || HATCH0, RISE = P.rise || RISE0, IN = P.inT || IN0;
    b.running = false; b.moving = false; b.crouch = false; b.hiding = null; b.eating = false; b.vx = 0;
    b.climbT += dt;
    b.x += (r.x - b.x) * Math.min(1, dt * 12);
    b.danger = r.phase === 'climb' && g.shooters.some((o) => o.lock > 0);
    if (g.lives < r.lives && r.phase === 'climb') { fall(g, b, r); return; }
    r.lives = g.lives;
    if (r.phase === 'climb') {
      if (jump) {
        if (dx) b.dir = dx;
        off(g, b, r);
        b.offTree = true; b.push = b.dir * 46; b.vy = -150; b.onGround = false;
        rules().onSound(g, 'jump', b.x);
        return;
      }
      b.climbV = down ? 1 : up ? -1 : 0;
      r.h = Math.max(0, r.h + (b.climbV < 0 ? UP : b.climbV > 0 ? -DOWN : 0) * dt);
      const n = Math.floor(r.h / RUNG);
      if (n !== r.rung) { r.rung = n; rules().onSound(g, 'rung', r.x); }
      if (r.h <= 0 && b.climbV > 0) {
        b.y = GY; b.vy = 0; b.onGround = true; b.hideLatch = true;
        off(g, b, r);
        return;
      }
      if (r.h >= HATCH) {
        r.h = HATCH; r.phase = 'in'; r.k = 0; r.t = 0;
        rules().onSound(g, 'hatch', r.x);
        panic(g, r);
      }
      b.y = GY - r.h;
    } else if (r.phase === 'in') {
      b.climbV = -1;
      r.k = Math.min(1, r.k + dt / IN);
      if (r.k >= BAIL && s && !s.react) bail(g, r);
      b.y = GY - HATCH - RISE * r.k * r.k * (3 - 2 * r.k);
      if (r.k >= 1) {
        r.phase = 'seat'; r.t = 0; b.climbV = 0;
        if (s && !s.react) bail(g, r);
      }
    } else if (r.phase === 'seat') {
      b.climbV = 0;
      r.t += dt;
      b.y = GY - HATCH - RISE;
      if (r.t >= SNACK) snack(g, r);
      if (down && r.t >= SIT) { r.phase = 'out'; r.k = 1; rules().onSound(g, 'hatch', r.x); }
    } else if (r.phase === 'out') {
      b.climbV = 1;
      r.k = Math.max(0, r.k - dt / (P.outT || OUT));
      b.y = GY - HATCH - RISE * r.k * r.k * (3 - 2 * r.k);
      if (r.k <= 0) { r.phase = 'climb'; r.h = HATCH - 0.5; r.rung = Math.floor(r.h / RUNG); }
    }
    b.inCanopy = r.phase === 'seat';
    b.covered = r.phase === 'seat' || (r.phase === 'in' && r.k > 0.6) || (r.phase === 'out' && r.k > 0.6);
    creak(g, r, dt);
  }

  ZS.sim.ladder = { at, grab, climb, exposed, GRAB, HATCH: HATCH0, RISE: RISE0, CABIN };
})();
