// The bear, the people with guns, the people with baskets and the army's drones.
(function () {
  const { CFG } = ZS;
  const { dist, clamp, angDiff } = ZS.util;

  ZS.makeBear = function () {
    return { x: 330, y: 560, r: CFG.BEAR_R, face: 0, inv: 0, sneak: false, moving: false, hidden: false };
  };

  ZS.updateBear = function (g, dt) {
    const b = g.bear, keys = g.input.keys;
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
    const t = g.input.target;
    if (t && Math.hypot(t.x - b.x, t.y - b.y) > 10) { dx = t.x - b.x; dy = t.y - b.y; }
    b.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight') || g.input.sneakToggle;
    const len = Math.hypot(dx, dy);
    b.moving = len > 0;
    if (b.moving) {
      const sp = (b.sneak ? CFG.SNEAK_SPEED : CFG.BEAR_SPEED) * dt;
      dx /= len; dy /= len;
      const nx = b.x + dx * sp, ny = b.y + dy * sp;
      if (!ZS.inHouse(g.w, nx, b.y, b.r * 0.6)) b.x = nx;
      if (!ZS.inHouse(g.w, b.x, ny, b.r * 0.6)) b.y = ny;
      b.x = clamp(b.x, 20, CFG.W - 20);
      b.y = clamp(b.y, 20, CFG.H - 20);
      b.face = Math.atan2(dy, dx);
    }
    b.hidden = !!ZS.underCanopy(g.w, b.x, b.y);
    if (b.inv > 0) b.inv -= dt;

    for (const it of g.w.items) {
      if (!it.active || it.locked) continue;
      const f = ZS.FOOD[it.type];
      if (f.seasons && !f.seasons.includes(g.seasonIdx)) continue;
      if (dist(b.x, b.y, it.x, it.y) < b.r + 12) ZS.eat(g, it);
    }
  };

  // --- People with guns ---------------------------------------------------

  const KINDS = {
    hunter:  { speed: 55, fov: 1.05, range: 230, aim: 1.1, label: 'poľovník' },
    stand:   { speed: 0,  fov: 0.9,  range: 290, aim: 1.3, label: 'posed' },
    ztmh:    { speed: 95, fov: 1.25, range: 250, aim: 0.9, label: 'zásahový tím' },
    poacher: { speed: 70, fov: 1.0,  range: 220, aim: 1.0, label: 'pytliak' },
  };

  ZS.makeShooter = function (g, kind, opts) {
    const k = KINDS[kind];
    const s = Object.assign({
      kind, label: k.label, speed: k.speed, fov: k.fov, range: k.range, aimTime: k.aim,
      x: 0, y: 0, ang: 0, path: null, pi: 0, state: 'patrol', aim: 0, reload: 0,
      reportCd: 0, searchT: 0, tx: 0, ty: 0, life: Infinity, sweep: g.w.rng() * 6,
    }, opts);
    if (s.path) { s.x = s.path[0][0]; s.y = s.path[0][1]; s.pi = 1 % s.path.length; }
    s.baseAng = s.ang;
    return s;
  };

  ZS.canSee = function (g, s) {
    const b = g.bear;
    const d = dist(s.x, s.y, b.x, b.y);
    if (d > s.range * (b.sneak ? 0.75 : 1)) return false;
    if (d > 45 && Math.abs(angDiff(s.ang, Math.atan2(b.y - s.y, b.x - s.x))) > s.fov / 2) return false;
    if (b.hidden && d > 55) return false;
    return !ZS.sightBlocked(g.w, s.x, s.y, b.x, b.y);
  };

  // Why this shooter may shoot right now, or null. The rules change with politics.
  ZS.shootReason = function (g, s) {
    if (s.kind === 'poacher') return 'poacher';
    if (g.time < g.courtUntil) return null;
    if (s.kind === 'ztmh') return g.problem ? 'problem' : null;
    if (g.flags.cull) return 'cull';
    const v = g.w.village;
    if (g.flags.emergency && dist(g.bear.x, g.bear.y, v.x, v.y) < v.zone * g.flags.zoneScale) return 'zone';
    if (g.problem) return 'problem';
    return null;
  };

  function moveToward(s, x, y, speed, dt) {
    const d = dist(s.x, s.y, x, y);
    if (d < 4) return true;
    const want = Math.atan2(y - s.y, x - s.x);
    s.ang += clamp(angDiff(s.ang, want), -3 * dt, 3 * dt);
    const step = Math.min(d, speed * dt);
    s.x += Math.cos(want) * step;
    s.y += Math.sin(want) * step;
    return d < 12;
  }

  ZS.alertShooters = function (g, x, y) {
    for (const s of g.shooters) {
      if (s.kind === 'stand' || dist(s.x, s.y, x, y) > 700) continue;
      s.state = 'search'; s.tx = x; s.ty = y; s.searchT = 8;
    }
  };

  ZS.updateShooters = function (g, dt) {
    const b = g.bear;
    const speedUp = g.flags.meat ? 1.15 : 1;
    for (const s of g.shooters) {
      s.reload -= dt; s.reportCd -= dt;
      if (s.life !== Infinity && (s.life -= dt) <= 0) { s.dead = true; continue; }

      if (s.kind === 'stand') {
        s.sweep += dt * 0.55;
        s.ang = s.baseAng + Math.sin(s.sweep) * 0.9;
      } else if (s.kind === 'ztmh' && !g.problem) {
        if (moveToward(s, g.w.village.x, g.w.village.y, s.speed, dt)) s.dead = true;
      } else if (s.state === 'search' && s.searchT > 0) {
        s.searchT -= dt;
        if (moveToward(s, s.tx, s.ty, s.speed * 1.25 * speedUp, dt)) {
          s.tx += (g.w.rng() - 0.5) * 220; s.ty += (g.w.rng() - 0.5) * 220;
          s.tx = clamp(s.tx, 30, CFG.W - 30); s.ty = clamp(s.ty, 30, CFG.H - 30);
        }
      } else if (s.kind === 'ztmh') {
        const lk = g.lastKnown || g.w.village;
        s.state = 'search'; s.tx = lk.x; s.ty = lk.y; s.searchT = 4;
      } else if (s.path) {
        s.state = 'patrol';
        const [px, py] = s.path[s.pi];
        if (moveToward(s, px, py, s.speed * speedUp, dt)) s.pi = (s.pi + 1) % s.path.length;
      }

      if (ZS.canSee(g, s)) {
        g.lastKnown = { x: b.x, y: b.y, t: g.time };
        s.ang = Math.atan2(b.y - s.y, b.x - s.x);
        if (s.kind !== 'stand') { s.state = 'search'; s.tx = b.x; s.ty = b.y; s.searchT = 6; }
        const why = ZS.shootReason(g, s);
        if (why && b.inv <= 0) {
          s.aim += dt;
          if (s.aim >= s.aimTime && s.reload <= 0) { ZS.shoot(g, s, why); s.aim = 0; s.reload = 3.5; }
        } else {
          s.aim = Math.max(0, s.aim - dt);
          if (s.reportCd <= 0) { ZS.report(g, s); s.reportCd = 9; }
        }
      } else {
        s.aim = Math.max(0, s.aim - dt * 0.7);
      }
    }
    g.shooters = g.shooters.filter((s) => !s.dead);
  };

  // --- People with baskets and phones --------------------------------------

  ZS.makePerson = function (g, kind) {
    let p;
    if (kind === 'tourist') {
      const x = 300 + g.w.rng() * 1300;
      p = { x, y: 1362, tx: x, ty: 1362, speed: 22 };
    } else {
      const pt = ZS.forestPoint(g.w);
      p = { x: pt.x, y: pt.y, tx: pt.x, ty: pt.y, speed: 34 };
    }
    return Object.assign(p, { kind, state: 'wander', t: 0, filmCd: 0, dropCd: 6, clashed: false });
  };

  ZS.updatePeople = function (g, dt) {
    const b = g.bear, w = g.w;
    for (const p of g.people) {
      p.t -= dt; p.filmCd -= dt; p.dropCd -= dt;
      const d = dist(p.x, p.y, b.x, b.y);

      if (p.state === 'flee') {
        const a = Math.atan2(p.y - b.y, p.x - b.x);
        p.x += Math.cos(a) * 125 * dt; p.y += Math.sin(a) * 125 * dt;
        if (d > 650 || p.x < 0 || p.y < 0 || p.x > CFG.W || p.y > CFG.H) p.dead = true;
        continue;
      }

      if (p.t <= 0 || dist(p.x, p.y, p.tx, p.ty) < 6) {
        p.t = 3 + w.rng() * 4;
        if (p.kind === 'tourist') { p.tx = clamp(p.x + (w.rng() - 0.5) * 220, 80, 1700); p.ty = 1350 + w.rng() * 25; }
        else { p.tx = clamp(p.x + (w.rng() - 0.5) * 320, 40, CFG.W - 40); p.ty = clamp(p.y + (w.rng() - 0.5) * 320, 40, 1300); }
      }
      const a = Math.atan2(p.ty - p.y, p.tx - p.x);
      p.x += Math.cos(a) * p.speed * dt; p.y += Math.sin(a) * p.speed * dt;

      const sightR = (p.kind === 'tourist' ? 230 : 170) * (b.sneak ? 0.7 : 1);
      const sees = d < sightR && (!b.hidden || d < 50) && !ZS.sightBlocked(w, p.x, p.y, b.x, b.y);

      if (p.kind === 'picker') {
        if (d < b.r + 12 && !p.clashed) {
          p.clashed = true; p.state = 'flee';
          w.items.push({ type: 'basket', x: p.x, y: p.y, active: true, t: 0, locked: false });
          g.syn = Math.min(100, g.syn + 5);
          ZS.addPanic(g, 20, ZS.NEWS.clash, true);
          ZS.spotted(g, p.x, p.y, 'Stret!');
        } else if (sees) {
          p.state = 'flee';
          ZS.addPanic(g, 8, ZS.NEWS.pickerSeen);
          ZS.spotted(g, p.x, p.y, 'Medveď!');
        }
      } else {
        if (sees && p.filmCd <= 0) {
          p.filmCd = 10;
          ZS.addPanic(g, 12, ZS.NEWS.touristSeen);
          ZS.spotted(g, p.x, p.y, '📱 Video!');
        }
        const sandwiches = w.items.filter((i) => i.type === 'sandwich' && i.active).length;
        if (p.dropCd <= 0 && sandwiches < 3) {
          p.dropCd = 14;
          w.items.push({ type: 'sandwich', x: p.x + 20, y: p.y - 26, active: true, t: 0, locked: false });
        }
      }
    }
    g.people = g.people.filter((p) => !p.dead);
  };

  // --- Drones see from above, so only tree crowns hide the bear --------------

  ZS.makeDrone = function (g) {
    const p = ZS.forestPoint(g.w);
    return { x: p.x, y: p.y, tx: p.x, ty: p.y, speed: 95, light: 78, cd: 0, spin: 0 };
  };

  ZS.updateDrones = function (g, dt) {
    const b = g.bear;
    for (const d of g.drones) {
      d.cd -= dt; d.spin += dt * 20;
      if (dist(d.x, d.y, d.tx, d.ty) < 10) {
        const lk = g.lastKnown && g.w.rng() < 0.5 ? g.lastKnown : ZS.forestPoint(g.w);
        d.tx = clamp(lk.x + (g.w.rng() - 0.5) * 300, 40, CFG.W - 40);
        d.ty = clamp(lk.y + (g.w.rng() - 0.5) * 300, 40, CFG.H - 40);
      }
      const a = Math.atan2(d.ty - d.y, d.tx - d.x);
      d.x += Math.cos(a) * d.speed * dt; d.y += Math.sin(a) * d.speed * dt;
      if (!b.hidden && dist(d.x, d.y, b.x, b.y) < d.light && d.cd <= 0) {
        d.cd = 5;
        g.lastKnown = { x: b.x, y: b.y, t: g.time };
        ZS.alertShooters(g, b.x, b.y);
        ZS.addPanic(g, 3, ZS.NEWS.droneSeen);
        ZS.spotted(g, d.x, d.y, 'Dron ťa vidí');
      }
    }
  };
})();
