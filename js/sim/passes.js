(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;

  const PASS = { close: 0.8, open: 0.8, calm: 1.8 };
  const KEEP = ['shooters', 'people', 'dogs', 'sheep', 'deer', 'drones', 'props', 'tracks'];
  const STAGES = {};

  const register = (id, stages) => { STAGES[id] = stages; };
  const table = (g) => STAGES[g.level.id] || STAGES[g.pass && g.pass.level] || {};
  const mod = (g, key) => (STAGES[g.pass.level][key].mod)();
  const on = (g) => !!g.level && !g.level.stage && !!g.level.passes && !!STAGES[g.level.id];

  function free(b) {
    return b.onGround && !b.climbing && !b.act && !(b.stun > 0);
  }

  function quiet(b) {
    Object.assign(b, { act: null, hiding: null, crouch: false, running: false, moving: false, eating: false, eatT: 0, vx: 0, slide: 0, covered: false, warn: false, danger: false, reach: null, push: 0, kx: 0, crawl: false, vy: 0 });
  }

  function clearPresses(g) {
    const inp = g.input;
    inp.jumpPressed = false; inp.bitePressed = false; inp.hugPressed = false; inp.downReleased = false;
  }

  function enter(g) {
    if (!on(g) || g.pass) return false;
    const b = g.bear;
    if (!free(b) || b.hiding || b.y < GY - 2) return false;
    for (const p of g.level.passes) {
      if (g.once[p.key] || b.x < p.from || b.x >= p.to) continue;
      if (p.open && !p.open(g)) continue;
      g.pass = { key: p.key, level: g.level.id, to: p.to, door: p.from, strand: !!p.strand, phase: 'close', t: 0, main: null, play: null };
      quiet(b);
      rules().onSound(g, table(g)[p.key].sound || 'door', b.x, 0.6);
      return true;
    }
    return false;
  }

  function swapIn(g, p) {
    const b = g.bear, M = mod(g, p.key), S = M.stage();
    p.main = { level: g.level, x: b.x };
    for (const k of KEEP) { p.main[k] = g[k]; g[k] = []; }
    g.level = S;
    g.particles = []; g.floaters = []; g.shots = []; g.bubble = null;
    quiet(b);
    Object.assign(b, { x: S.start, trackX: S.start, dir: 1, y: GY, onGround: true, hideBlend: 0, hideTree: null, spot: null, thin: null, stun: 0, climbing: null, inCanopy: false });
    p.play = M.start(g, S);
    p.phase = 'open'; p.t = 0;
  }

  function banish(g, p) {
    const M = p.main;
    if (!M) return;
    for (const k of ['shooters', 'drones']) {
      for (const o of g[k]) {
        const dx = (p.strand ? p.door - 700 : p.to + 500) - o.x;
        o.x += dx;
        if (o.from !== null && o.from !== undefined) { o.from += dx; o.to += dx; }
        if (o.cross !== undefined) o.cross += dx;
        M[k].push(o);
      }
      g[k] = [];
    }
  }

  function swapOut(g, p) {
    const M = p.main;
    banish(g, p);
    g.level = M.level;
    for (const k of KEEP) g[k] = M[k];
    g.particles = []; g.floaters = []; g.shots = []; g.bubble = null;
    g.bear.helmet = false; g.bear.rear = 0;
    p.main = null;
    land(g, p);
    p.phase = 'back'; p.t = 0;
  }

  function land(g, p) {
    const b = g.bear;
    g.once[p.key] = true;
    quiet(b);
    Object.assign(b, { x: p.to, trackX: p.to, dir: 1, y: GY, onGround: true, hideBlend: 0, hideTree: null, stun: 0, spot: null, thin: null });
    for (const s of g.shooters) { s.lock = 0; s.reload = Math.max(s.reload, PASS.calm + PASS.open); s.alertX = null; }
    g.liftCalm = g.time + PASS.calm + PASS.open;
    g.lastKnown = null;
    g.tracks.length = 0;
  }

  function step(g, dt) {
    const p = g.pass, b = g.bear;
    p.t += dt;
    b.inv = Math.max(0, b.inv - dt);
    b.quipCd -= dt;
    b.warn = false;
    if (p.phase === 'play') {
      banish(g, p);
      if (mod(g, p.key).update(g, p.play, dt)) { p.phase = 'shut'; p.t = 0; quiet(b); }
      return;
    }
    clearPresses(g);
    b.moving = false;
    if (p.phase === 'close') {
      b.x += 40 * dt; b.walkT += dt; b.moving = true;
      if (p.t >= PASS.close) swapIn(g, p);
    } else if (p.phase === 'open') {
      b.x += 50 * dt; b.walkT += dt; b.moving = true; b.trackX = b.x;
      if (p.t >= PASS.open) { p.phase = 'play'; p.t = 0; b.moving = false; }
    } else if (p.phase === 'shut') {
      mod(g, p.key).idle(g, p.play, dt);
      if (p.t >= PASS.close) swapOut(g, p);
    } else if (p.phase === 'back') {
      b.x += 50 * dt; b.walkT += dt; b.moving = true; b.trackX = b.x;
      if (p.t >= PASS.open) { g.pass = null; b.moving = false; }
    }
  }

  function passing(g) {
    return !!g.pass;
  }

  function inside(g) {
    const p = g.pass;
    return !!p && (p.phase === 'open' || p.phase === 'play' || p.phase === 'shut');
  }

  function playing(g, key) {
    const p = g.pass;
    return p && p.key === key && p.phase === 'play' ? p.play : null;
  }

  function trip(g) {
    const p = g.pass;
    if (!p || !p.main) return null;
    const S = g.level, k = Math.max(0, Math.min(1, g.bear.x / S.w));
    return (p.door + (p.to - p.door) * k) / p.main.level.goalDen;
  }

  function walls(g) {
    if (!on(g)) return;
    const b = g.bear;
    for (const p of g.level.passes) if (g.once[p.key] && b.x < p.wall) { b.x = p.wall; b.trackX = Math.max(b.trackX, p.wall); if (b.vx < 0) b.vx = 0; }
  }

  function pilot(g) {
    const p = g.pass;
    if (!p || p.phase !== 'play') return false;
    mod(g, p.key).pilot(g, p.play);
    return true;
  }

  ZS.sim.passes = { PASS, KEEP, register, enter, step, passing, inside, playing, trip, walls, quiet, clearPresses, free, pilot };
})();
