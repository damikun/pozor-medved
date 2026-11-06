(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp, lerp } = ZS.util;
  const rules = () => ZS.sim.rules;

  const T = { teach: 8, aim: 9, forester: 24, quiet: 34, end: 36.5 };
  const DOOR = { in: 0.9, open: 0.75, out: 1.5, back: 0.75, walk: 110, step: 70, calm: 180 };
  const RUB = { time: 1, reach: 40, tail: 0.3 };
  const AIM = { fill: 2.2, reload: 2.6, seek: 420, lock: 44, inv: 2, cap: 3, y: GY - 40 };
  const CUT = { speed: 60, off: 165, reach: 0.8, grip: 0.3, saw: 0.9, fall: 1.15, strip: 1.5, back: 0.55, check: 1.1, start: 0.9, film: 2.2, filmCd: 9, near: 150, patience: 2.5 };
  const MARK = { spray: 1.15, quick: 0.9, gap: 30 };
  const FOR = { speed: 62, start: 250, end: 70 };
  const LOOK = { tell: 0.6, dur: [2.2, 1.5, 2.6, 1.8], every: [2.6, 1.8, 3.4, 2.2, 3], range: 560, lost: 0.7, back: 300 };
  const WALL = 24, BUMP = 2.5, VIEW = 56, STACK = { base: 3, rows: 3, r: 8.4, off: 70, gap: 58 };
  const WORK = { drive: 1, reach: 1, grip: 1, saw: 1, wait: 1, check: 1, park: 1, start: 1 };
  const STOP = { drive: 1, reach: 1, grip: 1, saw: 1, wait: 1, check: 1, start: 1 };

  const area = (g) => g.level.logging || null;
  const CARRY = { in: 1, open: 1, out: 1, back: 1 };
  const standing = (g, t) => !t.down && g.level.trees.includes(t);
  const held = (keys) => keys.has('KeyC') || keys.has('KeyO');
  const moving = (keys) => ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'KeyA', 'KeyD', 'KeyS', 'KeyW'].some((k) => keys.has(k));

  function marked(g, b) {
    const A = area(g);
    if (!A || (g.cut && g.cut.phase !== 'play')) return null;
    let best = null;
    for (const t of A.trees) {
      if (!t.mark || t.down || Math.abs(t.x - b.x) >= t.w / 2 + RUB.reach) continue;
      if (!best || Math.abs(t.x - b.x) < Math.abs(best.x - b.x)) best = t;
    }
    return best;
  }

  function act(g, b) {
    const t = marked(g, b), c = g.cut;
    if (!t) return null;
    const side = b.x < t.x ? -1 : 1;
    return { kind: 'rub', t: 0, dur: Infinity, dir: side, hit: true, tree: t, at: t.x + side * (t.w / 2 + 22), wiped: 0 };
  }

  function bearAt(g, t) {
    const b = g.bear;
    return b.climbing === t || (!!b.act && b.act.tree === t) || (b.hideTree === t && b.hideBlend > 0) || Math.abs(b.x - t.x) < t.w / 2 + RUB.reach + 20;
  }

  function hold(g) {
    const D = g.level.clearing, b = g.bear;
    if (g.cut) return true;
    return !!D && !g.once.logging && b.x > D.x - DOOR.calm && b.x < D.exit;
  }

  function check(g) {
    const D = g.level.clearing, b = g.bear;
    if (!D || g.cut || g.once.logging || g.over || g.ride) return false;
    if (!b.onGround || b.climbing || b.act || b.stun > 0 || b.x < D.x || b.x >= D.exit) return false;
    start(g, D);
    return true;
  }

  function start(g, D) {
    g.once.logging = true;
    g.cut = {
      kind: 'logging', phase: 'in', t: 0, p: 0, walls: false, door: D, main: null,
      aim: { x: 0, dir: -1, state: 'off', t: 0, k: 0, fill: AIM.fill, pause: 0, shots: 0, at: -9, shotAt: -9, result: null, fx: 0 },
      help: 0, wiped: 0, felled: 0, saved: 0, bump: -9, forester: null, taught: null, foreAt: null, aimAt: null, lean: 0,
    };
    quiet(g.bear);
    clearPresses(g);
    g.bear.dir = 1;
    rules().onSound(g, 'gate', D.x);
  }

  function clearPresses(g) {
    const inp = g.input;
    inp.jumpPressed = false; inp.bitePressed = false; inp.hugPressed = false; inp.downReleased = false;
  }

  const KEEP = ['shooters', 'people', 'dogs', 'sheep', 'deer', 'drones', 'props', 'tracks'];

  function enter(g, c) {
    const b = g.bear, S = ZS.levelKit.stage(), A = S.logging;
    c.main = { level: g.level, x: b.x };
    for (const k of KEEP) { c.main[k] = g[k]; g[k] = []; }
    g.level = S;
    g.particles = []; g.floaters = []; g.shots = []; g.bubble = null;
    quiet(b);
    Object.assign(b, { x: A.from - 70, trackX: A.from - 70, dir: 1, y: GY, vy: 0, onGround: true, hideBlend: 0, hideTree: null, spot: null, thin: null });
    c.phase = 'open'; c.p = 0;
    const m = A.machine;
    m.on = true; m.state = 'start'; m.t = 0; m.queue = A.trees.slice(0, 1); m.tree = null;
    foresterIn(g, A, c);
  }

  function banish(g, c) {
    const M = c.main;
    if (!M || (!g.shooters.length && !g.drones.length)) return;
    const dx = c.door.exit - g.bear.x;
    const moved = (o) => { o.x += dx; if (o.from !== null && o.from !== undefined) { o.from += dx; o.to += dx; } if (o.cross !== undefined) o.cross += dx; return o; };
    for (const k of ['shooters', 'drones']) { for (const o of g[k]) M[k].push(moved(o)); g[k] = []; }
  }

  function leave(g, c) {
    const b = g.bear, M = c.main;
    banish(g, c);
    g.level = M.level;
    for (const k of KEEP) g[k] = M[k];
    g.particles = []; g.floaters = []; g.shots = []; g.bubble = null;
    quiet(b);
    Object.assign(b, { x: c.door.exit - DOOR.step * DOOR.back, trackX: c.door.exit - DOOR.step * DOOR.back, dir: 1, y: GY, vy: 0, onGround: true, hideBlend: 0, hideTree: null, spot: null, thin: null });
    c.phase = 'back'; c.p = 0; c.main = null;
    g.liftCalm = Math.max(g.liftCalm || 0, g.time + DOOR.back + 1.8);
  }

  function stroll(b, speed, dt) {
    b.x += speed * dt; b.trackX = b.x; b.dir = Math.sign(speed) || b.dir; b.walkT += dt; b.moving = true; b.running = false;
  }

  function carry(g, c, dt) {
    const b = g.bear;
    c.p += dt;
    clearPresses(g);
    b.inv = Math.max(0, b.inv - dt);
    if (c.phase === 'in') {
      stroll(b, DOOR.walk, dt);
      if (c.p >= DOOR.in) enter(g, c);
    } else if (c.phase === 'open') {
      stroll(b, 160, dt);
      if (c.p >= DOOR.open) {
        b.moving = false;
        c.phase = 'play'; c.t = 0; c.p = 0; c.walls = true;
        rules().say(g, NEWS.logging.start, true);
        rules().onSound(g, 'gate', area(g).from);
      }
    } else if (c.phase === 'out') {
      const A = area(g);
      b.hiding = null; b.hideBlend = Math.max(0, (b.hideBlend || 0) - dt / 0.18);
      if (!b.hideBlend) b.hideTree = null;
      if (c.p > 0.2) stroll(b, 150, dt);
      if (c.p >= DOOR.out) leave(g, c);
      else if (A) machine(g, A, dt);
    } else if (c.phase === 'back') {
      stroll(b, DOOR.step, dt);
      if (c.p >= DOOR.back) { b.moving = false; g.cut = null; }
    }
  }

  function float(g, x, y, text, color) { rules().float(g, x, y, text, color); }

  function wipe(g, t) {
    const c = g.cut, b = g.bear;
    t.mark = false; t.rub = 0; t.wiped = (t.wiped || 0) + 1;
    if (c) { c.wiped++; if (c.taught === null) c.taught = c.t; }
    float(g, t.x, GY - 150, LABELS.logging.wiped, COLORS.good);
    rules().onSound(g, 'wipe', t.x);
    if (!g.once.treeHug) { g.once.treeHug = true; rules().say(g, NEWS.logging.notPerson); }
    rules().quip(g, ZS.QUIPS.logging, b.quipCd <= 0);
  }

  function rubbing(g, dt) {
    const b = g.bear, a = b.act;
    if (!a || a.kind !== 'rub') return;
    const keys = g.input.keys, t = a.tree, stop = !held(keys) || moving(keys) || !standing(g, t) || !b.onGround;
    b.x += (a.at - b.x) * Math.min(1, dt * 12);
    b.dir = a.dir;
    if (a.wiped) { if (stop || a.t - a.wiped >= RUB.tail) b.act = null; return; }
    if (stop || !t.mark) { b.act = null; return; }
    t.rub = Math.min(1, t.rub + dt / RUB.time);
    if (t.rub >= 1) { wipe(g, t); a.wiped = a.t; }
  }

  function headX(m) {
    const t = m.tree;
    return t ? lerp(m.x + m.face * 46, t.x, m.reach) : m.x + m.face * 46;
  }

  function stand(A, m, t) {
    return t.x - CUT.off;
  }

  function next(g, A, m) {
    const c = g.cut;
    m.tree = null;
    if (!c || c.phase !== 'play' || c.t >= T.quiet) { m.state = 'park'; m.t = 0; return; }
    while (m.queue.length) {
      const t = m.queue.shift();
      if (standing(g, t)) { aimAt(A, m, t); return; }
    }
    let best = null, free = null;
    for (const t of A.trees) {
      if (!standing(g, t) || t.x - CUT.off < m.x - 20 || (!t.mark && !(t.wiped && !t.checked))) continue;
      if (!best || t.x < best.x) best = t;
      if (!bearAt(g, t) && (!free || t.x < free.x)) free = t;
    }
    if (free || best) { aimAt(A, m, free || best); return; }
    m.state = 'park'; m.t = 0;
  }

  function aimAt(A, m, t) {
    m.tree = t; m.goal = stand(A, m, t); m.state = 'drive'; m.t = 0;
  }

  const teach = (c, t) => !!c && t.teach && !c.wiped && c.t < T.teach;

  function near(g, m) {
    const b = g.bear;
    return Math.abs(b.x - headX(m)) < CUT.near || Math.abs(b.x - m.x) < CUT.near;
  }

  function fell(g, A, m) {
    const L = g.level, t = m.tree, c = g.cut;
    const i = L.trees.indexOf(t);
    if (i >= 0) L.trees.splice(i, 1);
    L.coverSpots = null;
    t.down = true;
    A.stumps.push({ x: t.x, w: t.w, id: t.id, t: 0 });
    A.falls.push({ x: t.x, h: t.h, w: t.w, r: t.r, shade: t.shade, id: t.id, dir: Math.sign(m.x - t.x) || 1, t: 0 });
    const side = Math.sign(m.x - t.x) || 1;
    const x = [t.x + side * STACK.off, t.x - side * STACK.off].find((o) => o > A.from + 30 && o < A.pile.x - A.pile.w / 2 - 30 && A.stacks.every((s) => Math.abs(s.x - o) > STACK.gap));
    if (x !== undefined) A.stacks.push(ZS.levelKit.pile(x, t.id, { n: 0, base: STACK.base, rows: STACK.rows, r: STACK.r, old: false }));
    if (c) { c.felled++; if (t.teach && c.taught === null) c.taught = c.t; }
    rules().onSound(g, 'fell', t.x);
    if (c && c.felled === 1) rules().say(g, NEWS.logging.felled);
    m.state = 'fell'; m.t = 0;
  }

  function release(g, m, said) {
    if (said) float(g, m.x, GY - 168, LABELS.logging.notPlan, COLORS.story);
    m.state = 'back'; m.t = 0;
  }

  function machine(g, A, dt) {
    const m = A.machine, c = g.cut;
    m.filmCd -= dt;
    if (m.film > 0) { m.film = Math.max(0, m.film - dt); return; }
    if (c && c.phase === 'play' && WORK[m.state] && m.filmCd <= 0 && near(g, m)) {
      m.film = CUT.film; m.filmCd = CUT.filmCd;
      float(g, m.x - m.face * 20, GY - 182, LABELS.logging.film, COLORS.story);
      rules().onSound(g, 'shutter', m.x, 0.8);
      return;
    }
    m.t += dt;
    const t = m.tree, gone = t && !standing(g, t);
    let want = 0.15;
    if (c && (c.phase !== 'play' || c.t >= T.quiet) && STOP[m.state]) { m.state = 'back'; m.t = 0; }
    if (m.state === 'start') {
      if (m.t >= CUT.start) next(g, A, m);
    } else if (m.state === 'drive') {
      const d = m.goal - m.x;
      if (gone) next(g, A, m);
      else if (Math.abs(d) < 1) { m.x = m.goal; m.state = t.mark ? 'reach' : 'check'; m.t = 0; m.face = Math.sign(t.x - m.x) || m.face; }
      else { m.x += Math.sign(d) * Math.min(Math.abs(d), CUT.speed * dt); m.face = Math.sign(t.x - m.x) || m.face; }
    } else if (m.state === 'reach' || m.state === 'grip' || m.state === 'saw' || m.state === 'wait') {
      want = 1;
      if (gone) next(g, A, m);
      else if (!t.mark) release(g, m, true);
      else if (m.state === 'reach' && m.t >= CUT.reach) { m.state = 'grip'; m.t = 0; }
      else if (m.state === 'grip' && m.t >= CUT.grip) { m.state = 'saw'; m.t = 0; }
      else if (m.state === 'saw' && (bearAt(g, t) || teach(c, t))) { m.state = 'wait'; m.t = 0; }
      else if (m.state === 'wait' && !bearAt(g, t) && !teach(c, t)) { m.state = 'saw'; m.t = 0; }
      else if (m.state === 'wait' && m.t >= CUT.patience && !teach(c, t) && A.trees.some((o) => o !== t && o.mark && standing(g, o) && !bearAt(g, o))) { m.state = 'back'; m.t = 0; }
      else if (m.state === 'saw' && m.t >= CUT.saw) fell(g, A, m);
    } else if (m.state === 'check') {
      want = m.t < CUT.check * 0.7 ? 0.85 : 0.3;
      if (m.t >= CUT.check) { m.state = 'back'; m.t = 0; if (t) t.checked = true; if (t && (t.plan || t.id === 1)) float(g, m.x, GY - 168, LABELS.logging.notPlan, COLORS.story); }
    } else if (m.state === 'fell') {
      want = 0.55;
      if (m.t >= CUT.fall) { m.state = 'strip'; m.t = 0; }
    } else if (m.state === 'strip') {
      want = 0.55;
      if (m.t >= CUT.strip) { m.state = 'back'; m.t = 0; }
    } else if (m.state === 'back') {
      if (m.t >= CUT.back) next(g, A, m);
    } else if (m.state === 'park') {
      if (c && c.phase === 'play' && A.trees.some((o) => (o.mark || (o.wiped && !o.checked)) && standing(g, o) && o.x - CUT.off >= m.x - 20)) next(g, A, m);
    }
    m.reach += (want - m.reach) * Math.min(1, dt * (m.state === 'reach' ? 4 : 5));
    m.turn += clamp(m.face - m.turn, -dt * 2.5, dt * 2.5);
  }

  function falls(g, A, dt) {
    for (const f of A.falls) {
      const was = f.t;
      f.t += dt;
      if (was < CUT.fall && f.t >= CUT.fall) {
        rules().onSound(g, 'crash', f.x + f.dir * f.h * 0.5);
        ZS.fx.dust(g, f.x + f.dir * f.h * 0.45, GY - 30, 9, f.dir);
      }
      const s = A.stacks.find((o) => o.id === f.id);
      if (s) s.n = Math.max(s.n, Math.min(s.full, Math.floor(s.full * clamp((f.t - CUT.fall) / CUT.strip, 0, 1) + 0.0001)));
      if (s && !s.hide && s.n >= s.full) { s.hide = true; g.level.coverSpots = null; }
    }
    A.falls = A.falls.filter((f) => f.t < CUT.fall + CUT.strip);
    for (const s of A.stumps) s.t += dt;
  }

  function gates(A, c, dt) {
    const shut = !!c && c.walls;
    A.gates[0].open = clamp(A.gates[0].open + (shut ? -dt : dt) / 0.45, 0, 1);
    A.gates[1].open = clamp(A.gates[1].open + (c && !c.walls ? dt : c ? -dt : 0) / 0.45, 0, 1);
  }

  function lockable(g, c, r) {
    const b = g.bear, fill = AIM.fill * (c.help >= 2 ? 1.5 : c.help >= 1 ? 1.25 : 1);
    return !b.covered && b.inv <= 0 && Math.abs(r.x - b.x) < AIM.lock && c.t + fill <= T.quiet ? fill : 0;
  }

  const armed = (p) => !!p && !p.dead && p.job !== 'home';
  const WATCH = { turn: 1, look: 1, back: 1, aim: 1, wait: 1 };

  function aim(g, A, c, dt) {
    const r = c.aim, b = g.bear, p = c.forester;
    r.t = Math.max(0, r.t - dt);
    if (r.state !== 'done' && (c.t >= T.quiet || c.help >= AIM.cap || !armed(p))) { r.state = 'done'; r.k = 0; }
    const on = armed(p) && p.job === 'aim' && r.state !== 'done';
    if ((r.state === 'lock' || r.state === 'seek') && !on) { r.state = 'off'; r.k = 0; }
    r.fx = on && (r.state === 'seek' || r.state === 'lock') ? Math.min(1, r.fx + dt * 3) : Math.max(0, r.fx - dt * 3);
    if (!on) return;
    if (r.state === 'lock') {
      r.x += (b.x - r.x) * Math.min(1, dt * 8);
      r.k = Math.min(1, r.k + dt / r.fill);
      if (r.k >= 1) shoot(g, A, c, r, p);
      return;
    }
    if (r.state !== 'seek') return;
    const d = b.x - r.x;
    r.x += Math.sign(d) * Math.min(Math.abs(d), AIM.seek * dt);
    const fill = lockable(g, c, r);
    if (fill) { r.state = 'lock'; r.k = 0; r.fill = fill; r.at = c.t; rules().onSound(g, 'lock', p.x); return; }
    r.lost = b.covered || b.inv > 0 ? r.lost + dt : 0;
    if (r.lost >= LOOK.lost) { r.state = 'off'; p.job = 'look'; }
  }

  function shoot(g, A, c, r, p) {
    const b = g.bear, from = [p.x + p.dir * 30, GY - 60];
    r.shots++; r.shotAt = c.t; r.state = 'reload'; r.k = 0;
    r.t = AIM.reload * (c.help >= 2 ? 1.8 : c.help >= 1 ? 1.25 : 1);
    p.kick = 1; p.job = 'walk'; p.jobT = 0; p.lookAt = c.t; p.dir = 1;
    rules().onSound(g, 'shot', p.x);
    ZS.fx.onShot(g, p.x);
    rules().float(g, p.x, GY - 150, LABELS.bang, COLORS.shot);
    if (b.covered) {
      const t = b.hiding || b.climbing, x = t ? t.x : b.x, logs = !!(t && t.logs), y = logs ? t.top + 10 : GY - 64;
      r.result = logs ? 'pile' : 'tree';
      g.shots.push({ x1: from[0], y1: from[1], x2: x + 6, y2: y, t: 0.3 });
      for (let i = 0; i < 12; i++) g.particles.push({ x: x + 8, y, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, t: 0.9, color: logs ? (i % 3 ? '#c9a26a' : '#e7cd9b') : i % 3 ? '#9a8f80' : '#c9bfae' });
      rules().onSound(g, 'tree', x);
      float(g, b.x, GY - (logs ? 100 : 125), logs ? LABELS.logging.pileHit : LABELS.treeHit, COLORS.good);
      return;
    }
    if (b.inv > 0) {
      r.result = 'miss';
      g.shots.push({ x1: from[0], y1: from[1], x2: b.x - 90, y2: GY - 100, t: 0.3 });
      rules().onSound(g, 'miss', b.x);
      float(g, b.x, GY - 125, LABELS.miss, COLORS.good);
      return;
    }
    r.result = 'hit';
    g.shots.push({ x1: from[0], y1: from[1], x2: b.x, y2: b.y - 34, t: 0.3 });
    rules().onSound(g, 'hit', b.x);
    c.help++;
    g.lives -= 1;
    if (g.lives <= 0) { rules().end(g, g.flags.cull ? 'cull' : 'hunted'); return; }
    b.inv = AIM.inv;
    float(g, b.x, GY - 115, LABELS.hit(g.lives), COLORS.shot);
    rules().say(g, NEWS.logging.hit, true);
  }

  function foresterIn(g, A, c) {
    const p = ZS.sim.people.create(g, 'forester', { from: A.from, to: A.to });
    Object.assign(p, {
      x: A.from + FOR.start, dir: 1, filmCd: Infinity, dropCd: Infinity, spray: 0, target: null, pose: 'walk', aim: [0, 0], said: 0,
      job: 'walk', jobT: 0, lookAt: 0, marked: false, looks: 0, kick: 0,
    });
    g.people.push(p);
    c.forester = p;
  }

  function sees(g, c, p) {
    const b = g.bear, d = (b.x - p.x) * p.dir;
    if (b.covered || c.aim.state === 'done' || c.aim.t > 0 || c.t < T.aim) return false;
    return d > -10 && d < LOOK.range;
  }

  function aimStart(g, c, p) {
    const r = c.aim;
    p.job = 'aim'; p.pose = 'aim'; p.dir = Math.sign(g.bear.x - p.x) || p.dir;
    r.state = 'seek'; r.x = p.x + p.dir * 40; r.lost = 0; r.k = 0;
  }

  function onward(c, p) {
    p.job = 'walk'; p.jobT = 0; p.dir = 1; p.lookAt = c.t; p.marked = false;
  }

  function planAhead(g, A, p) {
    let best = null;
    for (const t of A.trees) {
      if (!t.plan || t.planned || !standing(g, t) || bearAt(g, t) || t.x - t.w / 2 - MARK.gap < p.x - 2) continue;
      if (!best || t.x < best.x) best = t;
    }
    return best;
  }

  function wipedBehind(g, A, p) {
    let best = null;
    for (const t of A.trees) {
      if (!t.plan || t.mark || !t.wiped || !standing(g, t) || bearAt(g, t) || t.x > p.x || p.x - t.x > LOOK.back) continue;
      if (!best || t.x > best.x) best = t;
    }
    return best;
  }

  function spraying(g, c, p, dt) {
    const t = p.target;
    p.spray -= dt;
    if (!t || !standing(g, t) || bearAt(g, t) || t.mark) { p.spray = 0; p.target = null; return; }
    if (p.spray > 0) return;
    const again = !!t.wiped;
    t.mark = true; t.rub = 0; t.planned = true; t.remarked = again; t.markT = g.time; t.checked = false; p.target = null; p.pause = 0.35; p.marked = true;
    for (let i = 0; i < 8; i++) g.particles.push({ x: t.x - p.dir * 4, y: GY - 66 + (Math.random() - 0.5) * 14, vx: -p.dir * (20 + Math.random() * 50), vy: -30 - Math.random() * 40, t: 0.5, color: '#ff7a1a', round: true });
    const n = p.said;
    if (again && n < LABELS.logging.marker.length) { p.said = n + 1; float(g, p.x, GY - 120, LABELS.logging.marker[n], COLORS.story); }
    if (again) onward(c, p);
  }

  function due(c, p) {
    return c.t >= T.aim && c.t < T.quiet && c.aim.state !== 'done' && (p.marked || c.t - p.lookAt >= LOOK.every[p.looks % LOOK.every.length]);
  }

  function turn(g, c, p) {
    p.job = 'turn'; p.jobT = 0; p.pose = 'idle'; p.lookAt = c.t; p.marked = false; p.looks++;
    if (c.aimAt === null) { c.aimAt = c.t; rules().say(g, NEWS.logging.hunter); }
  }

  function walk(p, goal, speed, dt) {
    const d = goal - p.x;
    if (Math.abs(d) < 2) { p.x = goal; return true; }
    p.pose = 'walk'; p.dir = Math.sign(d);
    p.x += p.dir * Math.min(Math.abs(d), speed * dt);
    return false;
  }

  function forester(g, p, dt) {
    const A = area(g), c = g.cut, b = g.bear;
    if (!A) return;
    p.kick = Math.max(0, (p.kick || 0) - dt * 4);
    p.jobT += dt;
    if (!c || c.phase === 'out') { p.dead = true; return; }
    if (c.phase !== 'play') { p.pose = 'idle'; p.dir = Math.sign(b.x - p.x) || p.dir; return; }
    if (p.job === 'aim') {
      if (c.aim.state !== 'seek' && c.aim.state !== 'lock') { onward(c, p); return; }
      p.pose = 'aim'; p.aim[0] = c.aim.x; p.aim[1] = AIM.y; p.dir = Math.sign(c.aim.x - p.x) || p.dir;
      return;
    }
    if (p.spray > 0) { spraying(g, c, p, dt); return; }
    if (p.pause > 0) { p.pause -= dt; p.pose = 'idle'; return; }
    if (c.t >= T.quiet) {
      p.job = 'home';
      if (walk(p, A.to + 90, FOR.speed * 1.3, dt)) p.dead = true;
      return;
    }
    if (WATCH[p.job] && p.job !== 'turn' && sees(g, c, p)) { aimStart(g, c, p); return; }
    if (p.job === 'turn') {
      p.pose = 'idle';
      if (p.jobT >= LOOK.tell) { p.job = 'look'; p.jobT = 0; p.dir = -1; }
      return;
    }
    if (p.job === 'look') {
      p.pose = 'idle'; p.dir = -1;
      const t = c.t >= T.forester ? wipedBehind(g, A, p) : null;
      if (t) {
        p.job = 'back'; p.target = t; p.jobT = 0;
        if (!c.foreAt) { c.foreAt = c.t; rules().say(g, NEWS.logging.forester); }
        return;
      }
      if (p.jobT >= LOOK.dur[p.looks % LOOK.dur.length]) onward(c, p);
      return;
    }
    if (p.job === 'back') {
      const t = p.target;
      if (!t || t.mark || !standing(g, t) || bearAt(g, t)) { onward(c, p); return; }
      if (walk(p, t.x + t.w / 2 + MARK.gap, FOR.speed, dt)) {
        p.dir = -1; p.spray = MARK.spray; p.pose = 'film'; p.aim[0] = t.x; p.aim[1] = GY - 66;
        rules().onSound(g, 'spray', t.x, 1);
      }
      return;
    }
    if (p.job === 'wait') { p.pose = 'idle'; p.dir = -1; return; }
    if (sees(g, c, p)) { aimStart(g, c, p); return; }
    if (due(c, p)) { turn(g, c, p); return; }
    const t = p.target && !p.target.planned && standing(g, p.target) && !bearAt(g, p.target) ? p.target : (p.target = planAhead(g, A, p));
    if (walk(p, t ? t.x - t.w / 2 - MARK.gap : A.to - FOR.end, FOR.speed, dt)) {
      if (!t) { p.job = 'wait'; p.pose = 'idle'; p.dir = -1; return; }
      p.dir = 1; p.spray = MARK.quick; p.pose = 'film'; p.aim[0] = t.x; p.aim[1] = GY - 66;
      rules().onSound(g, 'spray', t.x, 0.8);
    }
  }

  function quiet(b) {
    b.act = null; b.hiding = null; b.crouch = false; b.running = false; b.moving = false; b.eating = false; b.eatT = 0; b.vx = 0; b.slide = 0;
    b.covered = false; b.warn = false; b.danger = false; b.reach = null; b.push = 0; b.kx = 0; b.crawl = false; b.vy = 0;
    if (b.climbing) { b.climbing = null; b.inCanopy = false; b.y = GY; b.onGround = true; }
  }

  function outcome(g, A, c) {
    const saved = A.trees.filter((t) => t.plan && standing(g, t) && !t.mark).length;
    c.saved = saved;
    return saved === 0 ? NEWS.logging.end[2] : c.help > 0 ? NEWS.logging.end[1] : NEWS.logging.end[0];
  }

  function close(g, A, c) {
    const b = g.bear, of = A.trees.filter((t) => t.plan).length;
    rules().say(g, outcome(g, A, c), true);
    float(g, b.x, GY - 140, LABELS.logging.saved(c.saved, of), c.saved ? COLORS.good : COLORS.bad);
    finish(g, A, c);
  }

  function finish(g, A, c) {
    c.phase = 'out'; c.walls = false; c.p = 0;
    g.once.logging = { saved: c.saved, felled: c.felled, hits: c.help };
    rules().onSound(g, 'gate', A.to);
    const m = A.machine;
    m.on = false;
    if (m.state !== 'fell' && m.state !== 'strip') { m.state = 'park'; m.t = 0; m.tree = null; }
  }

  function watched(g, c) {
    const p = c.forester, b = g.bear;
    return armed(p) && WATCH[p.job] && c.aim.state !== 'done' && (b.x - p.x) * (p.job === 'turn' ? -1 : p.dir) > -10 && Math.abs(b.x - p.x) < LOOK.range;
  }

  function cues(g, A, c) {
    const b = g.bear, r = c.aim;
    if (c.phase !== 'play') { b.warn = false; return; }
    const eyes = watched(g, c);
    b.warn = !b.covered && (r.state === 'lock' || r.state === 'seek' || eyes);
    if (b.hiding && (eyes || r.state === 'lock' || r.state === 'seek')) b.danger = true;
  }

  function walls(g) {
    const c = g.cut, A = area(g), b = g.bear;
    if (!c || !c.walls || !A) return;
    const lo = A.from + WALL, hi = A.to - WALL;
    if (b.x >= lo && b.x <= hi) return;
    b.x = clamp(b.x, lo, hi); b.vx = 0; b.push = 0;
    if (g.time - c.bump > BUMP && b.moving) {
      c.bump = g.time;
      float(g, b.x + (b.x <= lo ? -30 : 30), GY - 110, LABELS.logging.closed, COLORS.bad);
      rules().quip(g, ZS.QUIPS.loggingGate, true);
    }
  }

  function update(g, dt) {
    const c = g.cut;
    if (c && c.main) banish(g, c);
    if (c && CARRY[c.phase]) { carry(g, c, dt); const S = area(g); if (S && g.cut) { falls(g, S, dt); gates(S, g.cut, dt); } return; }
    const A = area(g);
    if (!A) return;
    rubbing(g, dt);
    falls(g, A, dt);
    gates(A, c, dt);
    if (!c) return;
    c.t += dt;
    machine(g, A, dt);
    aim(g, A, c, dt);
    lean(g, c, dt);
    if (g.over) return;
    cues(g, A, c);
    if (c.t >= T.end) close(g, A, c);
  }

  function lean(g, c, dt) {
    const p = c.forester, r = c.aim, b = g.bear, w = g.viewW || 960, base = b.x - w * 0.38;
    let want = 0;
    if (p && !p.dead && c.phase === 'play' && (r.state === 'seek' || r.state === 'lock' || WATCH[p.job])) {
      const cam = clamp(base, p.x - w + VIEW, p.x - VIEW);
      if (cam >= b.x - w + VIEW && cam <= b.x - VIEW) want = cam - base;
    }
    c.lean += (want - c.lean) * Math.min(1, dt * 2.5);
  }

  function camera(g, cam) {
    const A = area(g);
    if (!A || !g.cut) return cam;
    const lo = A.from - 60, hi = A.to + 60 - g.viewW;
    cam += g.cut.lean || 0;
    return Math.max(0, Math.min(g.level.w - g.viewW, lo > hi ? (lo + hi) / 2 : clamp(cam, lo, hi)));
  }

  function ledger(g) {
    const A = area(g);
    if (!A || !g.cut) return null;
    const state = A.trees.filter((t) => t.plan).map((t) => (!standing(g, t) ? 'cut' : t.mark ? 'mark' : 'ok'));
    return { state, saved: state.filter((s) => s === 'ok').length, of: state.length };
  }

  function trip(g) {
    const c = g.cut, b = g.bear, staged = ZS.sim.chopok.trip(g);
    if (staged !== null) return staged;
    if (c && c.main) {
      const A = area(g), k = A ? clamp((b.x - A.from) / (A.to - A.from), 0, 1) : 0;
      return lerp(c.door.x, c.door.exit, k) / c.main.level.goalDen;
    }
    return b.x / g.level.goalDen;
  }

  const carried = (g) => !!g.cut && !!CARRY[g.cut.phase];

  ZS.sim = ZS.sim || {};
  ZS.sim.logging = { T, RUB, AIM, CUT, MARK, DOOR, FOR, LOOK, ledger, check, update, act, marked, bearAt, hold, walls, camera, trip, carried, forester, standing, headX };
})();
