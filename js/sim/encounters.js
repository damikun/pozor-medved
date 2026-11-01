(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const GUN = { walker: 'hunt', ztmh: 'tac', poacher: 'old', posed: 'hunt' };
  const CARRY = { picker: 'basket', tourist: 'phone', santa: 'sack', guest: 'mug', waiter: 'tray' };
  const SPILL = { picker: ['mushroom', 'basket'], santa: ['candy'], tourist: ['sandwich'], waiter: ['halusky'] };
  const SCALE = { ztmh: 1.04 };
  const CONTACT = { bite: 0.16, hug: 0.3, selfie: 0.3, shake: 0.3 };
  const HEAD = 78, GAP = 44, SNAP = 1.2, TOPPLE = 1.2, CABIN = 150, FETCH = 62, LEG = 30;

  function humans(g) {
    const list = [];
    for (const p of g.people) if (!p.dead) list.push(p);
    for (const s of g.shooters) if ((s.kind !== 'posed' || s.react) && !s.dead) list.push(s);
    return list;
  }

  const free = (o) => !o.react || o.react === 'fetch' || o.react === 'pickup' || o.react === 'flee' || o.react === 'home';
  const isShooter = (o) => !!GUN[o.kind];

  function target(g) {
    const b = g.bear, P = ZS.sim.pen;
    let best = null, bd = Infinity;
    for (const o of humans(g)) {
      if (!free(o) || o.leaving || o.hurdle || P.inside(g.level, o.x, 0) || P.between(g.level, b.x, o.x)) continue;
      const dx = o.x - b.x, d = Math.abs(dx);
      if (d > CFG.REACH || (d > 18 && Math.sign(dx) !== b.dir)) continue;
      if (d < bd) { best = o; bd = d; }
    }
    return best;
  }

  function stand(g) {
    const b = g.bear;
    for (const p of g.level.posts) {
      if (Math.abs(p.x - b.x) > 62) continue;
      const s = g.shooters.find((h) => h.kind === 'posed' && h.home === p.x && !h.react);
      if (!s) continue;
      const leg = [p.x - 34, p.x + 34].find((x) => (x - b.x) * b.dir >= 12 && (x - b.x) * b.dir <= 52);
      return { post: p, shooter: s, legX: leg === undefined ? b.x + b.dir * LEG : leg };
    }
    return null;
  }

  function interrupt(g, o) {
    const p = o.rifle;
    if (!p || g.props.includes(p)) return;
    Object.assign(p, { x: o.x + o.dir * 16, y: GY, vx: 0, vy: 0, rot: 0, rest: true });
    g.props.push(p);
  }

  function begin(g, act) {
    const o = act.target;
    if (act.kind === 'hug') {
      interrupt(g, o);
      o.react = 'hugged'; o.reactT = 0; o.hugK = 0; o.hugBy = act; o.lock = 0; o.alertX = null; o.pause = 0;
      o.dir = Math.sign(g.bear.x - o.x) || -act.dir;
    } else if (act.kind === 'selfie') {
      o.react = 'selfie'; o.reactT = 0; o.selfieK = 0; o.hugBy = act; o.pause = 0; o.dir = act.dir;
    } else if (act.kind === 'shake') {
      act.legX = o.legX;
      act.sway = 0;
    }
  }

  function spill(g, o) {
    const s = SPILL[o.kind];
    if (!s || o.empty) return;
    const n = o.kind === 'tourist' || o.kind === 'waiter' ? 1 : 2;
    const P = ZS.sim.pen;
    for (let i = 0; i < n; i++) {
      let x = clamp(o.x + o.dir * 10 + (i - (n - 1) / 2) * 26, 40, g.level.w - 40);
      if (P.inside(g.level, x, 36)) x = P.edge(g.level, o.x, 36 + i * 26);
      const it = { type: s[0], x, eaten: false, locked: false };
      if (s[1]) it.labelKey = s[1];
      g.level.items.push(it);
    }
  }

  function drop(g, o, vx, vy, y) {
    const kind = isShooter(o) ? (o.armed ? 'rifle' : null) : CARRY[o.kind] && !o.empty ? CARRY[o.kind] : null;
    if (!kind) return;
    const held = kind === 'rifle' && ZS.heldRifle ? ZS.heldRifle(o.h || o) : null;
    const p = {
      kind, gun: GUN[o.kind], x: held ? held.x : o.x + o.dir * 8, y: held ? held.y : y || GY - 44, vx, vy, rot: held ? held.rot : 0,
      vr: (vx >= 0 ? 1 : -1) * (4 + Math.random() * 5), dir: held ? held.dir : o.dir, rest: false,
    };
    if (ZS.sim.pen.wires(g.level) && lands(g, p, 60)) { p.vx = -p.vx; p.vr = -p.vr; if (lands(g, p, 60)) { p.vx = 0; p.vr *= 0.3; } }
    g.props.push(p);
    if (kind === 'rifle') { o.armed = false; o.rifle = p; } else { spill(g, o); o.empty = true; }
  }

  function lands(g, p, m) {
    const q = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, rot: p.rot, vr: p.vr, rest: false };
    for (let i = 0; i < 600 && !q.rest; i++) fly(g, q, 1 / 60);
    return ZS.sim.pen.inside(g.level, q.x, m) || ZS.sim.pen.between(g.level, p.x, q.x);
  }

  function knock(g, s) {
    const b = g.bear;
    const push = Math.abs(s.x - b.x) > 6 ? Math.sign(s.x - b.x) : b.dir;
    s.dir = -push;
    s.react = 'down'; s.reactT = 0; s.downPhase = 'fall'; s.downK = 0;
    s.lock = 0; s.alertX = null; s.scaredT = 0; s.pause = 0;
    interrupt(g, s);
    if (s.armed) drop(g, s, push * (70 + Math.random() * 60), -260 - Math.random() * 80);
    g.stats.stomps++;
    rules().float(g, s.x, GY - 112, LABELS.stomp, COLORS.story);
    ZS.fx.dust(g, s.x, GY - HEAD, 5);
    const news = s.kind === 'ztmh' ? NEWS.stompZtmh : NEWS.stomp[(g.stats.stomps - 1) % NEWS.stomp.length];
    rules().addPanic(g, 5, news);
    if (g.stats.stomps === 1 || Math.random() < 0.35) rules().quip(g, ZS.QUIPS.stomp, true);
  }

  function stomp(g) {
    const b = g.bear;
    if (b.onGround || b.climbing || b.vy <= 0 || b.prevY === undefined) return;
    for (const s of g.shooters) {
      if ((s.kind === 'posed' && !s.react) || s.dead || s.react === 'gone' || !free(s)) continue;
      const top = GY - HEAD * (SCALE[s.kind] || 1);
      if (b.prevY > top + 4 || b.y < top - 2 || Math.abs(b.x - s.x) > 36) continue;
      knock(g, s);
      b.y = top; b.vy = -430; b.onGround = false; b.coyote = 0; b.jumpBuffer = 0; b.stompT = 0;
      return;
    }
  }

  function hugged(g, o) {
    const b = g.bear;
    g.stats.hugs++;
    drop(g, o, -o.dir * 30, -80);
    rules().float(g, o.x, GY - 122, LABELS.shout.hug[o.kind], COLORS.story);
    if (g.flags.hugBan) {
      rules().float(g, b.x, GY - 140, LABELS.hugBanned, COLORS.bad);
      rules().addPanic(g, 10, NEWS.hugBanned, true);
      return;
    }
    rules().addPanic(g, -Math.max(3, 14 - 4 * (g.stats.hugs - 1)), g.stats.hugs > 3 ? NEWS.hugTired : NEWS.hug[o.kind], g.stats.hugs <= 3);
    g.viralUntil = g.time + 12;
    if (g.stats.hugs === 2) g.hugBanAt = g.time + 8;
    hearts(g, b);
    rules().quip(g, ZS.QUIPS.hugPerson, true);
  }

  function hearts(g, b) {
    for (let i = 0; i < 6; i++) {
      g.particles.push({ x: b.x + b.dir * (20 + Math.random() * 30), y: GY - 90 - Math.random() * 20, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, t: 1.1 + Math.random() * 0.6, color: COLORS.love, heart: true });
    }
  }

  function bitten(g, a, o) {
    interrupt(g, o);
    o.react = 'bitten'; o.reactT = 0; o.bitK = 0; o.lock = 0; o.alertX = null; o.pause = 0; o.dir = a.dir;
    drop(g, o, a.dir * 60, -170);
    g.stats.bites++;
    g.lastHuman = g.time;
    g.syn = Math.min(100, Math.max(g.syn + 25, CFG.PROBLEM + 5));
    rules().float(g, o.x, GY - 122, LABELS.shout.bite[o.kind], COLORS.bad);
    rules().addPanic(g, 20, NEWS.bite[o.kind], true);
    rules().quip(g, ZS.QUIPS.bitePerson, true);
  }

  function snap(g, a) {
    const b = g.bear, o = a.target;
    if (!o || o.react !== 'selfie' || o.hugBy !== a) return;
    const n = g.stats.selfies++;
    g.syn = Math.min(100, g.syn + 12);
    g.lastHuman = g.time;
    g.viralUntil = g.time + 12;
    rules().float(g, o.x + a.dir * 58, GY - 122, LABELS.selfie, COLORS.love);
    rules().addPanic(g, n < 2 ? -8 : 3, NEWS.selfie[Math.min(n, NEWS.selfie.length - 1)], n < 3);
    hearts(g, b);
    if (g.people.filter((p) => p.kind === 'tourist').length < 6) {
      const x = Math.min(g.level.w - 400, b.x + g.viewW + 200);
      g.people.push(ZS.sim.people.create(g, 'tourist', { from: x - 300, to: x + 300 }));
    }
  }

  function shakeStart(g, a) {
    const st = a.target;
    st.post.shakeT = 0;
    st.post.shakeBy = a;
    if (st.shooter && !st.shooter.react) st.shooter.dir = Math.sign(g.bear.x - st.post.x) || 1;
    for (const s of g.shooters) if (Math.abs(s.x - g.bear.x) < 1000 && s !== st.shooter) s.alertX = g.bear.x;
    rules().addPanic(g, 4);
    rules().quip(g, ZS.QUIPS.shake, true);
  }

  function topple(g, a) {
    const st = a.target, s = st.shooter, b = g.bear;
    if (!s || s.react || s.dead) return;
    const side = Math.sign(st.post.x - b.x) || -a.dir;
    s.react = 'drop'; s.reactT = 0; s.dropK = 0; s.side = side; s.dir = -side;
    s.fy = GY - CABIN; s.fx = st.post.x; s.x = st.post.x; s.lock = 0; s.alertX = null; s.wobble = 0; s.sway = 0;
    drop(g, s, side * (60 + Math.random() * 40), -120, GY - CABIN - 20);
    g.stats.stomps++;
    rules().float(g, st.post.x, GY - CABIN - 60, LABELS.standFall, COLORS.story);
    rules().float(g, st.post.x + side * 30, GY - CABIN - 30, LABELS.shout.fall, COLORS.story);
    rules().addPanic(g, 6, NEWS.standFall[g.falls++ % NEWS.standFall.length], true);
  }

  function contact(g, a) {
    const b = g.bear, o = a.target;
    if (a.kind === 'hug' && o && o.react === 'hugged' && o.hugBy === a) { hugged(g, o); return; }
    if (a.kind === 'selfie' && o && o.react === 'selfie' && o.hugBy === a) { rules().float(g, o.x - a.dir * 40, GY - 116, LABELS.shout.selfie, COLORS.story); return; }
    if (a.kind === 'shake' && o) { shakeStart(g, a); return; }
    if (a.kind === 'bite' && o && free(o) && Math.abs(o.x - b.x) < CFG.REACH + 24) { bitten(g, a, o); return; }
    a.hit = false;
    rules().quip(g, a.kind === 'hug' ? ZS.QUIPS.hugAir : ZS.QUIPS.biteAir);
  }

  function release(g, o) {
    o.reactT = 0; o.hugK = 1; o.hugBy = null;
    o.dir = Math.sign(o.x - g.bear.x) || 1;
    if (o.react === 'selfie') { o.react = null; o.selfieK = 1; o.state = 'walk'; o.texting = true; o.leaving = true; return; }
    if (isShooter(o)) { o.react = 'flee'; return; }
    o.react = null; o.state = 'flee';
  }

  function hold(g, dt) {
    const b = g.bear, a = b.act;
    for (const o of humans(g)) {
      if (o.react !== 'hugged' && o.react !== 'selfie') continue;
      if (o.hugBy !== a) { release(g, o); continue; }
      const k = clamp(a.t / a.dur, 0, 1);
      if (o.react === 'hugged') o.hugK = k; else o.selfieK = k;
      o.x += (b.x + a.dir * (o.react === 'hugged' ? GAP : 40) - o.x) * Math.min(1, dt * 14);
    }
  }

  function stands(g, dt) {
    const a = g.bear.act;
    for (const p of g.level.posts) {
      if (p.shakeT === undefined) continue;
      p.shakeT += dt;
      const on = a && a.kind === 'shake' && p.shakeBy === a && a.t < 1.5;
      p.shake = on ? Math.min(1, (p.shake || 0) + dt / 0.3) : Math.max(0, (p.shake || 0) - dt / 0.6);
      p.sway = 12 * p.shake * Math.sin(p.shakeT * Math.PI * 2 * 3.2);
      if (on) a.sway = p.sway;
      const s = g.shooters.find((h) => h.kind === 'posed' && h.home === p.x);
      if (s && !s.react) { s.sway = p.sway; s.wobble = p.shake; }
      if (!on && p.shake === 0) { p.shakeT = undefined; p.sway = 0; p.shakeBy = null; }
    }
  }

  function recover(g, s) {
    s.reactT = 0;
    if (s.rifle) { s.react = 'fetch'; return; }
    s.armed = true;
    s.react = s.kind === 'posed' ? 'home' : null;
  }

  function fetch(g, s, dt) {
    const p = s.rifle;
    if (!p) { recover(g, s); return; }
    if (!p.rest) return;
    if (ZS.sim.pen.inside(g.level, p.x, ZS.sim.pen.KEEP.hunter) || ZS.sim.pen.between(g.level, s.x, p.x)) {
      s.rifle = null; s.armed = false; s.react = 'gone'; s.reactT = 0; s.dir = ZS.sim.pen.side(g.level, s.x);
      return;
    }
    const side = Math.abs(p.x - s.x) < 4 ? s.dir : Math.sign(p.x - s.x);
    const spot = p.x - side * 16, d = spot - s.x;
    if (Math.abs(d) < 22 && (Math.abs(d) < 2 || Math.sign(d) !== side)) {
      s.dir = side; s.react = 'pickup'; s.reactT = 0; s.pickK = 0; s.pickFrom = s.x; s.pickTo = spot; s.rifleDir = p.dir; s.pickX = p.x;
      g.props.splice(g.props.indexOf(p), 1);
      return;
    }
    s.dir = Math.sign(d) || side;
    s.x += s.dir * Math.min(Math.abs(d), FETCH * dt);
  }

  function home(g, s, dt) {
    const d = s.home - s.x;
    if (Math.abs(d) > 1) { s.dir = Math.sign(d); s.x += s.dir * Math.min(Math.abs(d), FETCH * dt); return; }
    s.x = s.home; s.react = 'climb'; s.reactT = 0; s.climbK = 0; s.fy = GY;
  }

  function reactShooter(g, s, dt) {
    s.reactT += dt;
    s.lock = 0;
    const t = s.reactT;
    if (s.react === 'drop') {
      const k = Math.min(1, t / CFG.DROP);
      s.dropK = k;
      s.fy = GY - CABIN * (1 - k * k);
      s.x = s.fx + s.side * 34 * Math.sin(k * Math.PI / 2);
      if (k >= 1) { s.react = 'down'; s.reactT = 0; s.downPhase = 'fall'; s.downK = 0; s.fy = undefined; }
    } else if (s.react === 'down') {
      if (t < CFG.FALL) { s.downPhase = 'fall'; s.downK = t / CFG.FALL; }
      else if (t < CFG.FALL + CFG.LIE) { s.downPhase = 'lie'; s.downK = (t - CFG.FALL) / CFG.LIE; }
      else if (t < CFG.FALL + CFG.LIE + CFG.RISE) { s.downPhase = 'rise'; s.downK = (t - CFG.FALL - CFG.LIE) / CFG.RISE; }
      else recover(g, s);
    } else if (s.react === 'bitten') {
      s.bitK = Math.min(1, t / CFG.HOP);
      if (t >= CFG.HOP) { s.react = 'gone'; s.reactT = 0; s.clutch = true; }
    } else if (s.react === 'gone') {
      s.x += s.dir * (s.clutch ? 150 : 80) * dt;
      if (Math.abs(s.x - g.bear.x) > 1700 || s.x < 0 || s.x > g.level.w) s.dead = true;
    } else if (s.react === 'flee') {
      s.x = clamp(s.x + s.dir * 190 * dt, 40, g.level.w - 40);
      if (t > 3.2) recover(g, s);
    } else if (s.react === 'fetch') {
      fetch(g, s, dt);
    } else if (s.react === 'pickup') {
      s.pickK = Math.min(1, t / CFG.PICKUP);
      s.x = s.pickFrom + (s.pickTo - s.pickFrom) * Math.min(1, t / 0.2);
      if (t >= CFG.PICKUP) {
        s.armed = true; s.rifle = null; s.pickK = 1; s.reactT = 0;
        s.react = s.kind === 'posed' ? 'home' : null;
        s.sweepPause = 0.4; s.alertX = g.bear.x; s.reload = Math.max(s.reload, 1);
      }
    } else if (s.react === 'home') {
      home(g, s, dt);
    } else if (s.react === 'climb') {
      s.climbK = Math.min(1, t / CFG.LADDER);
      s.fy = GY - CABIN * s.climbK;
      if (t >= CFG.LADDER) { s.react = null; s.fy = undefined; s.x = s.home; s.dir = -1; s.sweepPause = 0.6; s.reload = Math.max(s.reload, 1); }
    }
  }

  function reactPerson(g, p, dt) {
    p.reactT += dt;
    if (p.react === 'bitten') {
      p.bitK = Math.min(1, p.reactT / CFG.HOP);
      if (p.reactT >= CFG.HOP) { p.react = null; p.state = 'flee'; p.clutch = true; }
    }
  }

  function fly(g, p, dt) {
    p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.y >= GY) {
      p.y = GY;
      if (p.vy > 220) { p.vy *= -0.32; p.vx *= 0.55; p.vr *= 0.5; }
      else {
        p.vy = 0; p.vr = 0; p.vx *= Math.max(0, 1 - dt * 7);
        const flat = Math.round(p.rot / (Math.PI * 2)) * Math.PI * 2;
        p.rot += (flat - p.rot) * Math.min(1, dt * 9);
        if (Math.abs(p.vx) < 4 && Math.abs(flat - p.rot) < 0.02) { p.rot = 0; p.rest = true; }
      }
    }
    p.x = clamp(p.x, 40, g.level.w - 40);
  }

  function props(g, dt) {
    for (const p of g.props) if (!p.rest) fly(g, p, dt);
  }

  function update(g, dt) {
    const b = g.bear, a = b.act;
    if (a && !a.done && a.t >= CONTACT[a.kind]) { a.done = true; contact(g, a); }
    if (a && a.kind === 'selfie' && a.hit && !a.snapped && a.t >= SNAP) { a.snapped = true; snap(g, a); }
    if (a && a.kind === 'shake' && a.hit && !a.toppled && a.t >= TOPPLE) { a.toppled = true; topple(g, a); }
    hold(g, dt);
    stands(g, dt);
    stomp(g);
    props(g, dt);
    b.reach = !b.act && !b.hiding && !b.climbing && b.onGround ? target(g) || stand(g) : null;
  }

  ZS.sim.encounters = { update, target, stand, begin, reactShooter, reactPerson, free, humans };
})();
