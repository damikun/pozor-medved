(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const pen = () => ZS.sim.pen;

  const KIND = {
    posed:   { aim: 1.25, sweep: 125, range: 480, speed: 0 },
    walker:  { aim: 1.1,  sweep: 115, range: 380, speed: 48 },
    ztmh:    { aim: 0.95, sweep: 150, range: 420, speed: 230 },
    poacher: { aim: 0.8,  sweep: 130, range: 400, speed: 70 },
  };

  function create(g, kind, o) {
    const k = KIND[kind];
    const s = Object.assign({
      kind, aimTime: k.aim, sweep: k.sweep, range: k.range, speed: k.speed,
      x: 0, dir: -1, from: null, to: null, crossDir: 1, lock: 0, reload: 0, life: Infinity, pause: 0, lost: 0, alertX: null,
      sweepPause: 0, scaredT: 0, react: null, reactT: 0, armed: true, rifle: null, trackCd: 0,
    }, o);
    s.y = kind === 'posed' ? GY - 150 : GY;
    const P = pen(), L = g && g.level;
    if (kind === 'ztmh' && P.inside(L, s.x, P.KEEP.hunter)) s.x = P.band(L, P.KEEP.hunter)[0] - 60;
    else if (kind !== 'posed') P.range(L, s, P.KEEP.hunter, 200);
    if (kind !== 'posed') ZS.sim.corn.range(L, s, undefined, 200);
    if (kind === 'posed') { s.home = s.x; s.sway = 0; s.wobble = 0; }
    s.cross = s.x + s.dir * 200;
    return s;
  }

  function sweepLimits(s) {
    if (s.kind === 'posed') return [s.x - s.range, s.x + s.range];
    const a = s.x + s.dir * 60, b = s.x + s.dir * s.range;
    return a < b ? [a, b] : [b, a];
  }

  function alert(g, x) {
    for (const s of g.shooters) if (Math.abs(s.x - x) < 1000) s.alertX = x;
  }

  function move(g, s, dt) {
    const L = g.level;
    if (s.scaredT > 0) {
      s.scaredT -= dt;
      s.x = clamp(s.x + s.dir * s.speed * 2.2 * dt, 40, L.w - 40);
      return;
    }
    if (s.kind === 'walker' || s.kind === 'poacher') {
      if (s.pause > 0) {
        s.pause -= dt;
        if (s.pause <= 0 && s.flip) { s.dir = s.flip; s.flip = 0; s.pause = 0.35; }
        return;
      }
      if (s.from !== null && (s.x < s.from - 2 || s.x > s.to + 2)) {
        const home = s.x < s.from ? 1 : -1;
        if (s.dir !== home) { s.dir = home; s.pause = 0.6; return; }
      }
      s.x += s.dir * s.speed * (g.flags.meat ? 1.25 : 1) * dt;
      if (s.from !== null && ((s.x < s.from && s.dir < 0) || (s.x > s.to && s.dir > 0)) && s.x > s.from - 6 && s.x < s.to + 6) {
        s.x = clamp(s.x, s.from, s.to);
        const wall = pen().ahead(L, s.x, s.dir);
        if (wall !== null && Math.abs(wall - s.x) <= pen().KEEP.hunter + 8) { s.pause = 1.1; s.flip = -s.dir; }
        else { s.dir *= -1; s.pause = 1.5; }
      } else if (L.rng() < dt * 0.12) {
        s.pause = 1 + L.rng() * 2;
        if (L.rng() < 0.5) s.dir *= -1;
      }
    } else if (s.kind === 'ztmh') {
      if (!g.problem || s.lost > 14) {
        const b = pen().band(L, pen().KEEP.hunter);
        const out = s.out || (s.out = b && s.x >= b[1] && g.cam - 300 < b[1] ? 1 : -1);
        s.dir = out; s.x += out * 260 * dt;
        if (out < 0 ? s.x < g.cam - 300 : s.x > g.cam + g.viewW + 300) s.dead = true;
        return;
      }
      s.out = 0;
      const tx = g.lastKnown !== null ? g.lastKnown : g.bear.x;
      if (Math.abs(tx - s.x) > 380) { s.dir = Math.sign(tx - s.x); s.x += s.dir * s.speed * dt; }
      else s.dir = Math.sign(g.bear.x - s.x) || s.dir;
    }
  }

  function fence(g, s, x0) {
    const P = pen(), C = ZS.sim.corn, L = g.level;
    let x = P.hold(L, x0, s.x, P.KEEP.hunter), away = P.side(L, x);
    if (x === s.x) { x = C.hold(L, x0, s.x); away = C.side(L, x); }
    if (x === s.x) return;
    s.x = x;
    if (s.kind === 'ztmh' && s.out) s.out = away;
    if (s.react === 'gone') s.dir = away;
    else if (s.react === 'flee') s.reactT = Math.max(s.reactT, 3.2);
    else if (s.react) return;
    else if (s.scaredT > 0) { s.scaredT = 0; s.pause = 1.1; s.flip = away; }
    else if (s.kind !== 'ztmh' && !(s.pause > 0)) { s.pause = 0.9; s.flip = away; }
  }

  function sweep(s, dt) {
    const [lo, hi] = sweepLimits(s);
    if (s.alertX !== null) {
      const t = clamp(s.alertX, lo, hi);
      s.cross += Math.sign(t - s.cross) * Math.min(Math.abs(t - s.cross), 420 * dt);
      if (Math.abs(t - s.cross) < 5) s.alertX = null;
    } else if (s.sweepPause > 0) {
      s.sweepPause -= dt;
    } else {
      s.cross += s.crossDir * s.sweep * dt;
      if (s.cross > hi || s.cross < lo) {
        s.cross = clamp(s.cross, lo, hi); s.crossDir *= -1;
        s.sweepPause = 0.8 + Math.random() * 1.2;
      }
    }
  }

  function followTracks(g, s, dt) {
    if (s.kind !== 'walker' || !g.tracks.length || (s.trackCd -= dt) > 0) return;
    const fresh = g.tracks.find((t) => g.time - t.t < 8 && Math.abs(t.x - s.x) < 22);
    if (!fresh) return;
    s.trackCd = 9;
    s.alertX = g.bear.x;
    s.dir = Math.sign(g.bear.x - s.x) || s.dir;
    rules().float(g, s.x, GY - 104, LABELS.tracks, COLORS.seen);
    if (!g.once.tracks) { g.once.tracks = true; rules().say(g, NEWS.tracks); }
  }

  function aimFactor(g) {
    return g.flags.cull ? 0.85 : g.flags.emergency ? 0.92 : 1;
  }

  function update(g, dt) {
    const b = g.bear;
    if (g.ride) { b.warn = false; return; }
    const quick = aimFactor(g);
    const courtPause = g.time < g.courtUntil, calm = g.time < (g.liftCalm || 0) || ZS.sim.logging.hold(g);
    let aiming = g.shooters.find((s) => s.lock > 0) || null;
    for (const s of g.shooters) {
      s.reload -= dt;
      if (s.kick > 0) s.kick = Math.max(0, s.kick - dt * 4);
      if (s.life !== Infinity && (s.life -= dt) <= 0 && !s.react) { s.react = 'gone'; s.reactT = 0; s.dir = Math.sign(s.x - b.x) || 1; }
      if (s.react) {
        const x0 = s.x;
        ZS.sim.encounters.reactShooter(g, s, dt);
        fence(g, s, x0);
        s.blocked = true;
        if (aiming === s) aiming = null;
        continue;
      }
      if (s.kind !== 'ztmh' && Math.abs(s.x - b.x) > 1500) continue;
      if (s.wobble > 0.05) { s.lock = 0; s.blocked = true; if (aiming === s) aiming = null; continue; }
      const x0 = s.x;
      move(g, s, dt);
      if (s.dead) continue;
      fence(g, s, x0);
      followTracks(g, s, dt);

      const d = Math.abs(b.x - s.x);
      if (b.hiding && d < 32 && s.kind !== 'posed' && s.scaredT <= 0) {
        s.scaredT = 4; s.dir = Math.sign(s.x - b.x) || 1; s.lock = 0; s.pause = 0;
        rules().float(g, s.x, GY - 110, LABELS.hunterScared, COLORS.bad);
        rules().addPanic(g, 2, NEWS.hunterScared);
      }
      const facing = s.kind === 'posed' || Math.sign(b.x - s.x) === s.dir || d < 60;
      const allowed = (s.kind === 'poacher' || !courtPause) && s.scaredT <= 0 && !calm;
      const free = !aiming || aiming === s;
      s.blocked = !allowed;

      const blind = s.kind === 'posed' && d < 70 && !ZS.sim.ladder.exposed(g, s);
      const close = s.kind !== 'posed' && d < 90;
      if (allowed && free && !blind && !b.covered && facing && d < s.range && b.inv <= 0 && (Math.abs(s.cross - b.x) < 40 || close)) {
        aiming = s;
        s.cross += (b.x - s.cross) * Math.min(1, dt * 8);
        s.lock += dt * ZS.sim.corn.aim(g) * (b.thicket ? ZS.sim.lot.AIM : 1);
        s.lost = 0;
        g.lastKnown = b.x;
        if (s.lock >= s.aimTime * quick && s.reload <= 0) { rules().fire(g, s); s.lock = 0; s.reload = 3; aiming = null; }
        continue;
      }
      if (allowed && b.covered && s.lock > s.aimTime * quick * 0.6 && s.reload <= 0 && Math.abs(s.cross - b.x) < 60) {
        rules().fire(g, s, 'tree'); s.reload = 3;
      }
      s.lock = Math.max(0, s.lock - dt * 2);
      if (aiming === s && s.lock === 0) aiming = null;
      if (s.kind === 'ztmh') s.lost += dt;
      sweep(s, dt);
    }
    g.shooters = g.shooters.filter((s) => !s.dead);
    b.warn = !b.covered && g.shooters.some((s) => !s.react && (s.lock > 0 || (Math.abs(s.cross - b.x) < 200 && Math.abs(s.x - b.x) < s.range)));
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.hunters = { create, update, alert, aimFactor };
})();
