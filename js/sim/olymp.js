(function () {
  const { CFG, LABELS, NEWS, COLORS } = ZS;
  const { clamp, lerp, ease, smooth } = ZS.util;
  const rules = () => ZS.sim.rules;
  const at = (T, s) => ZS.olympTrack.at(T, s);
  const G = 9.81;

  const SKI = { phi: 0.98, tuck: 0.6, turn: 3.0, mu: 0.03, drag: 0.0038, tuckDrag: 0.0024, skid: 0.13, vmax: 34, inv: 2.2, crash: 7.5, fall: 1.5, pen: 3, dsq: 5 };
  const AIR = { g: 8.6, flip: 0.92, spin: 0.78, grab: 0.7, zone: 15, sweet: 3.2, max: 3 };
  const SLED = { lean: 3.2, damp: 0.95, mu: 0.012, drag: 0.0034, lie: 0.62, inv: 2.4 };
  const BASE = { slalom: 100, skok: 1000, sane: 2000 };
  const HOP = { v: 4.6, g: 15, sled: 3.6, low: 0.3 };
  const RAMP = { big: { v: 2.4, k: 0.2, max: 6.4, bonus: 1.5 }, roll: { v: 1.6, k: 0.12, max: 4.4, bonus: 0.3, t: 0.3 } };
  const POLE = { dur: 0.5, dv: 2.4, max: 12, start: 7.5 };
  const LOW = { fallen: true, mound: true, glove: true };
  const STEER_UP = 5, STEER_BACK = 6;
  const TRICKS = { back: { d: AIR.flip, pts: 2.3 }, front: { d: AIR.flip, pts: 2.1 }, spinL: { d: AIR.spin, pts: 1.4 }, spinR: { d: AIR.spin, pts: 1.4 }, grab: { d: AIR.grab, pts: 0.9 } };
  const RIVALS = [
    { name: 'M. Hirschberger', nat: 'AUT', slalom: 0.985, jump: 41.2, sled: 1.01 },
    { name: 'A. Odermattli', nat: 'SUI', slalom: 0.992, jump: 38.6, sled: 0.995 },
    { name: 'H. Kristoffsen', nat: 'NOR', slalom: 1.012, jump: 43.4, sled: 1.02 },
    { name: 'L. Pinturelli', nat: 'FRA', slalom: 1.03, jump: 36.9, sled: 0.985 },
  ];
  const PAR = { slalom: 60, sled: 53 };
  const RECORD = 57.84;

  const learn = (k) => { if (ZS.prompt) ZS.prompt.learn(k); };
  const keyOn = (g, a, b) => g.input.keys.has(a) || (b && g.input.keys.has(b));

  function init(g) {
    const x = g.bear.x;
    g.once.olymp = g.once.olymp || {};
    const o = { stage: null, phase: '', t: 0, fade: 0, said: {}, ink: {}, prev: {}, bell: 0, cheer: 0, flash: 0 };
    g.olymp = o;
    if (x >= BASE.sane) startSled(g); else if (x >= BASE.skok) startJump(g); else startSlalom(g);
    o.fade = x >= BASE.skok ? 1 : 0;
    return o;
  }

  function steerInput(g, c, dt) {
    const inp = g.input, l = keyOn(g, 'ArrowLeft', 'KeyA'), r = keyOn(g, 'ArrowRight', 'KeyD');
    let want = (r ? 1 : 0) - (l ? 1 : 0), rate = want ? STEER_UP : STEER_BACK;
    if (inp.stickOn && typeof inp.stickX === 'number') { want = clamp(inp.stickX * 1.25, -1, 1); rate = 14; }
    if (Math.sign(want) && Math.sign(want) !== Math.sign(c.steer)) rate = STEER_UP * 1.5;
    c.steer += clamp(want - c.steer, -rate * dt, rate * dt);
    c.tuck = keyOn(g, 'ArrowDown', 'KeyS');
    return want;
  }

  function pole(g, c, dt, up) {
    if (c.pole > 0) c.pole = Math.max(0, c.pole - dt);
    if (!up || c.pole > 0 || c.fall > 0 || c.hy > 0 || c.tuck || c.v >= POLE.max) return false;
    c.pole = POLE.dur;
    c.v = Math.min(POLE.max, c.v + POLE.dv * (1 - 0.6 * c.v / POLE.max));
    c.pushes = (c.pushes || 0) + 1;
    rules().onSound(g, 'plant', null);
    learn('olympPole');
    return true;
  }

  function go(g, c, e) {
    const o = g.olymp;
    o.phase = 'ski'; o.t = 0;
    rules().onSound(g, 'beep', null, 1);
    if (e) { c.v = POLE.start; c.pole = 0; pole(g, c, 0, true); rules().onSound(g, 'push', null); }
    else { c.v = 6.5; rules().onSound(g, 'push', null); }
  }

  function edges(g) {
    const o = g.olymp, inp = g.input, now = { up: keyOn(g, 'ArrowUp', 'KeyW'), down: keyOn(g, 'ArrowDown', 'KeyS'), left: keyOn(g, 'ArrowLeft', 'KeyA'), right: keyOn(g, 'ArrowRight', 'KeyD') };
    const e = { jump: inp.jumpPressed, grab: inp.hugPressed };
    for (const k of Object.keys(now)) e[k] = now[k] && !o.prev[k];
    o.prev = now;
    ZS.sim.passes.clearPresses(g);
    return e;
  }

  function hurt(g, c, text, sound) {
    const b = g.bear;
    if (b.inv > 0) return false;
    c.fall = SKI.fall; c.crashes = (c.crashes || 0) + 1;
    b.inv = SKI.inv;
    g.lives -= 1;
    g.olymp.flash = 1;
    g.olymp.gasp = 1;
    rules().onSound(g, sound || 'tumble', null);
    if (g.lives <= 0) { rules().end(g, 'disq'); return true; }
    rules().float(g, 0, 0, LABELS.hit(g.lives), COLORS.shot);
    rules().float(g, 0, 0, text, COLORS.seen);
    rules().quip(g, LABELS.olymp.ouch, true);
    say(g, 'crash', NEWS.olymp.crash, true);
    return true;
  }

  function say(g, key, news, hot) {
    const o = g.olymp;
    if (o.said[key]) return;
    o.said[key] = true;
    rules().say(g, news, hot);
  }

  function commentate(g, line, hold) {
    g.olymp.mic = { text: Array.isArray(line) ? line[Math.floor(Math.random() * line.length)] : line, t: hold || 3.6 };
  }

  function startSlalom(g) {
    const o = g.olymp, C = g.level.olymp.slalom;
    o.stage = 'slalom'; o.phase = 'view'; o.t = 0;
    o.c = { s: C.start.s, u: 0, phi: 0, v: 0, steer: 0, tuck: false, lean: 0, fall: 0, clock: 0, pen: 0, bonus: 0, ramp: null, fly: null, jumps: 0, missed: 0, passed: 0, next: 0, spray: 0, snow: 0, crashes: 0, cloud: 0, edge: 0, hy: 0, hv: 0 };
    C.gates.forEach((q) => { q.hit = false; q.missed = false; q.done = false; q.wob = 0; });
    g.bear.x = BASE.slalom;
    g.bear.inv = 0;
    say(g, 'start', NEWS.olymp.start);
    commentate(g, LABELS.olymp.mic.welcome, 4.5);
  }

  function school(C, t) {
    const S = C.school;
    if (t === null) return null;
    const head = S.from + S.speed * t;
    return { head, tail: head - S.kids * S.gap - 1.2 };
  }

  function slalomHazards(g, c) {
    const C = g.level.olymp.slalom, out = [];
    const R = C.ratrak;
    out.push({ s0: R.s - R.d / 2, s1: R.s + R.d / 2, u0: R.u - R.w / 2, u1: R.u + R.w / 2, kind: 'ratrak' });
    const F = C.fallen;
    out.push({ s0: F.s - 1, s1: F.s + 1, u0: F.u - F.w / 2, u1: F.u + F.w / 2, kind: 'fallen' });
    const k = school(C, c.schoolT);
    if (k) out.push({ s0: C.school.s - 1.2, s1: C.school.s + 1.2, u0: k.tail, u1: k.head, kind: 'school' });
    return out;
  }

  function rampTop(r, s) { return Math.max(0.02, r.h * Math.pow(clamp((s - (r.s - r.len)) / r.len, 0, 1), 1.5)); }

  function ramps(g, c, C, dt) {
    const o = g.olymp, r0 = c.ramp;
    if (r0) {
      const off = Math.abs(c.u - r0.u) > r0.w / 2 + 0.3 || c.fall > 0;
      if (off) c.ramp = null;
      else if (c.s >= r0.s) {
        const K = RAMP[r0.kind];
        c.ramp = null; c.hy = r0.h; c.hv = Math.min(K.max, K.v + c.v * K.k);
        c.fly = { r: r0, t: 0 };
        rules().onSound(g, 'pop', null, r0.kind === 'big' ? 0.8 : 0.4);
        if (r0.kind === 'big') commentate(g, LABELS.olymp.mic.ramp, 3);
      } else { c.hy = rampTop(r0, c.s); c.hv = 0; }
    } else if (!(c.hy > 0) && c.fall <= 0) {
      for (const r of C.ramps) if (c.s > r.s - r.len && c.s < r.s && Math.abs(c.u - r.u) <= r.w / 2) { c.ramp = r; c.hy = rampTop(r, c.s); c.hv = 0; }
    }
    if (!c.fly) return;
    c.fly.t += dt;
    if (c.hy > 0) return;
    const r = c.fly.r, K = RAMP[r.kind], R = C.ratrak, t = c.fly.t;
    c.fly = null;
    if (c.fall > 0) return;
    if (r.kind === 'big' ? c.s < R.s + R.d / 2 : t < K.t) return;
    c.bonus += K.bonus; c.jumps++;
    rules().float(g, 0, 0, LABELS.olymp.air[r.kind](K.bonus), COLORS.zap);
    rules().onSound(g, 'cheer', null, r.kind === 'big' ? 1 : 0.5);
    if (r.kind === 'big') { o.cheer = 1; commentate(g, LABELS.olymp.mic.ratrak, 3.6); say(g, 'ratrak', NEWS.olymp.ratrak); }
  }

  function slalom(g, dt, e) {
    const o = g.olymp, c = o.c, C = g.level.olymp.slalom, b = g.bear;
    o.t += dt;
    if (o.phase === 'view') {
      if (o.t > 0.4 && keyOn(g, 'ArrowUp', 'KeyW')) { go(g, c, true); commentate(g, LABELS.olymp.mic.ready, 3.2); return; }
      if (o.t > 2.6 || (o.t > 0.6 && (e.jump || e.left || e.right))) { o.phase = 'ready'; o.t = 0; commentate(g, LABELS.olymp.mic.ready, 3.2); }
      return;
    }
    if (o.phase === 'ready') {
      steerInput(g, c, dt);
      const n = Math.floor(o.t / 0.8);
      if (n !== o.beep && o.t < 2.4) { o.beep = n; rules().onSound(g, 'beep', null, 0); }
      if (keyOn(g, 'ArrowUp', 'KeyW')) { go(g, c, true); return; }
      if (o.t >= 2.4) go(g, c, false);
      return;
    }
    if (o.phase === 'stop') {
      c.v = Math.max(0, c.v - 14 * dt);
      c.s += c.v * Math.cos(c.phi) * dt; c.u += c.v * Math.sin(c.phi) * dt;
      c.phi = ease(c.phi, 1.25 * (c.stopSide || 1), 5, dt);
      c.lean = ease(c.lean, 0.5 * (c.stopSide || 1), 6, dt);
      c.spray = c.v > 1 ? 1 : Math.max(0, c.spray - dt * 2);
      if (o.t > 3.4 || (o.t > 1.2 && e.jump)) next(g, 'jump');
      return;
    }
    ski(g, c, dt, C, e);
    if (g.over) return;
    ramps(g, c, C, dt);
    if (c.schoolT === undefined && c.s > C.school.s - C.school.lead * Math.max(12, c.v)) { c.schoolT = 0; rules().onSound(g, 'whistle', null); commentate(g, LABELS.olymp.mic.school, 3.4); }
    if (c.schoolT !== undefined) c.schoolT += dt;
    for (const q of C.gates) {
      if (q.done || c.s < q.s) continue;
      q.done = true;
      const d = Math.abs(c.u - q.u);
      if (d <= 3.6) {
        c.passed++; q.hit = true; q.wob = d > 2.4 ? 1 : 0.35;
        rules().onSound(g, d > 2.4 ? 'pole' : 'skiGate', null, d > 2.4 ? 1 : 0);
        if (c.passed === 2) learn('olympSteer');
        if (d <= 2.4) o.cheer = Math.max(o.cheer || 0, 0.55);
      } else {
        c.missed++; c.pen += SKI.pen; q.missed = true;
        rules().onSound(g, 'skiMiss', null);
        if (c.missed > SKI.dsq) { rules().end(g, 'gates'); return; }
        rules().float(g, 0, 0, LABELS.olymp.missed(SKI.pen), COLORS.seen);
        if (c.missed === SKI.dsq) rules().float(g, 0, 0, LABELS.olymp.lastGate, COLORS.shot);
        if (c.missed === 1) commentate(g, LABELS.olymp.mic.missed, 3);
      }
    }
    for (const h of slalomHazards(g, c)) {
      if (LOW[h.kind] && c.hy > HOP.low) continue;
      if (h.kind === 'ratrak' && c.hy > C.ratrak.h) continue;
      if (c.s > h.s0 - 0.5 && c.s < h.s1 + 0.5 && c.u > h.u0 - 0.55 && c.u < h.u1 + 0.55) {
        if (hurt(g, c, LABELS.olymp.hit[h.kind], h.kind === 'ratrak' ? 'crash' : 'tumble')) {
          c.v *= 0.25;
          if (h.kind === 'ratrak') { c.hy = 0; c.hv = 0; c.ramp = null; c.fly = null; const sd = c.u < C.ratrak.u ? -1 : 1; c.u = C.ratrak.u + sd * (C.ratrak.w / 2 + 0.9); }
          if (g.over) return;
        }
      }
    }
    for (const cn of C.cannons) {
      const inside = Math.abs(c.s - cn.s) < 14 && (cn.dir > 0 ? c.u < -6 : c.u > 6);
      if (inside) c.cloud = Math.min(1, c.cloud + dt * 3); else c.cloud = Math.max(0, c.cloud - dt * 1.4);
    }
    if (!o.said.steep && c.s > 380) { o.said.steep = true; commentate(g, LABELS.olymp.mic.steep, 3.4); }
    if (!o.said.mid && c.s > 820) { o.said.mid = true; commentate(g, LABELS.olymp.mic.bear, 4.2); say(g, 'mid', NEWS.olymp.mid); }
    if (c.s >= C.finish) finishSlalom(g, c);
    b.x = BASE.slalom + 800 * clamp(c.s / C.finish, 0, 1);
  }

  function hop(g, c, dt, e, v) {
    if (e && e.jump && !(c.hy > 0) && !(c.fall > 0)) { c.hv = v; c.hy = 0.001; rules().onSound(g, 'pop', null, 0.2); learn('olympHop'); }
    if (!(c.hy > 0)) return false;
    c.hy += c.hv * dt; c.hv -= HOP.g * dt;
    if (c.hy <= 0) { c.hy = 0; c.hv = 0; c.v *= 0.97; rules().onSound(g, 'skiLand', null, 0.45); return false; }
    return true;
  }

  function ski(g, c, dt, C, e) {
    const b = g.bear, p = at(C.T, c.s);
    b.inv = Math.max(0, b.inv - dt);
    if (c.fall > 0) {
      c.fall -= dt;
      c.v = Math.max(0, c.v - 12 * dt);
      c.phi = ease(c.phi, 0, 3, dt);
      c.s += c.v * dt;
      c.steer = 0;
      if (c.fall <= 0) { c.v = 4; c.u = clamp(c.u, -C.half + 2, C.half - 2); }
      return;
    }
    if (g.olymp.phase === 'ski') c.clock += dt;
    const air = c.ramp ? false : hop(g, c, dt, e, HOP.v);
    const want = steerInput(g, c, dt);
    pole(g, c, dt, !air && keyOn(g, 'ArrowUp', 'KeyW'));
    const lim = c.tuck ? SKI.tuck : SKI.phi, target = c.steer * lim;
    const before = c.phi;
    if (!air || c.fly) c.phi = ease(c.phi, target, SKI.turn * (c.tuck ? 0.7 : 1) * (air ? 0.55 : 1), dt);
    c.phi -= p.k * c.v * Math.cos(c.phi) * dt;
    c.phi = clamp(c.phi, -1.35, 1.35);
    const turnRate = Math.abs(c.phi - before) / Math.max(dt, 1e-4);
    const sn = Math.sin(c.phi), cs = Math.cos(c.phi);
    const drag = c.tuck ? SKI.tuckDrag : SKI.drag;
    const acc = G * p.gr * cs - SKI.mu * G - drag * c.v * c.v - SKI.skid * sn * sn * c.v - 0.025 * turnRate * c.v;
    c.v = clamp(c.v + acc * dt, 0, SKI.vmax);
    c.s += c.v * cs * dt; c.u += c.v * sn * dt;
    c.lean = ease(c.lean, clamp(c.steer * (0.55 + c.v / 60), -0.85, 0.85), 7, dt);
    c.edge = ease(c.edge, Math.min(1, Math.abs(c.steer) * (c.v / 22)), 6, dt);
    c.spray = ease(c.spray, Math.min(1, turnRate * 0.8 + (Math.abs(want) > 0 ? 0.25 : 0)) * Math.min(1, c.v / 12), 8, dt);
    c.snow = (c.snow + c.v * dt) % 1000;
    const H = C.half - 0.4;
    if (Math.abs(c.u) > H) {
      const side = Math.sign(c.u), lat = c.v * sn * side;
      c.u = side * H;
      if (lat > SKI.crash && hurt(g, c, LABELS.olymp.hit.net, 'net')) { c.v *= 0.3; c.phi = -side * 0.2; return; }
      if (lat > 0.8) { c.phi = -c.phi * 0.25; c.v *= 0.86; rules().onSound(g, 'net', null, Math.min(1, lat / 7)); }
      else if (Math.sign(c.phi) === side) c.phi = 0;
    }
  }

  function finishSlalom(g, c) {
    const O = g.olymp, total = Math.max(0, c.clock + c.pen - c.bonus);
    O.phase = 'stop'; O.t = 0;
    c.stopSide = c.u > 0 ? -1 : 1;
    const res = { time: c.clock, pen: c.pen, bonus: c.bonus, missed: c.missed, total, crashes: c.crashes, jumps: c.jumps };
    res.rank = 1 + RIVALS.filter((r) => r.slalom * PAR.slalom < total).length;
    res.pts = Math.round(clamp(100 - (total - PAR.slalom * 0.97) * 4, 25, 100));
    res.record = total < RECORD;
    g.once.olymp.slalom = res;
    rules().onSound(g, 'finish', null);
    rules().onSound(g, 'cheer', null, 1);
    commentate(g, res.record ? LABELS.olymp.mic.record : res.rank <= 3 ? LABELS.olymp.mic.good : LABELS.olymp.mic.slow, 4.6);
    rules().say(g, res.record ? NEWS.olymp.record : NEWS.olymp.slalom, true);
  }

  function next(g, stage) {
    const O = g.olymp;
    O.fadeTo = stage; O.fadeT = 0;
  }

  function fading(g, dt) {
    const O = g.olymp;
    if (O.fadeTo) {
      O.fadeT += dt;
      O.fade = clamp(O.fadeT / 0.45, 0, 1);
      if (O.fadeT >= 0.45) {
        const to = O.fadeTo;
        O.fadeTo = null;
        if (to === 'jump') startJump(g); else if (to === 'sled') startSled(g);
        O.fade = 1;
      }
      return true;
    }
    O.fade = Math.max(0, O.fade - dt / 0.45);
    return false;
  }

  function startJump(g) {
    const O = g.olymp, J = g.level.olymp.jump;
    O.stage = 'skok'; O.phase = 'top'; O.t = 0;
    O.c = { s: J.start.s, u: 0, phi: 0, v: 0, steer: 0, tuck: false, lean: 0, fall: 0, spray: 0, edge: 0, y: 0, vy: 0, vs: 0, press: null, q: 0, tricks: [], cur: null, flip: 0, spin: 0, grab: 0, air: 0, top: 0, land: null, auto: false, cam: 0, snow: 0 };
    g.bear.x = BASE.skok;
    g.bear.inv = 0;
    commentate(g, LABELS.olymp.mic.jump, 4);
    say(g, 'jump', NEWS.olymp.jump);
  }

  function ground(J, s) { return at(J.T, s).y; }

  function launch(g, c, J) {
    const d = c.press === null ? null : J.lip - c.press;
    let q = d === null ? 0 : d <= AIR.sweet ? 1 : clamp(1 - (d - AIR.sweet) / (AIR.zone - AIR.sweet), 0.15, 1);
    q *= 1 - 0.45 * clamp(Math.abs(c.u) / J.half, 0, 1);
    c.q = q;
    const v0 = c.v * (0.72 + 0.3 * q), ang = 0.34 + 0.26 * q;
    c.vs = v0 * Math.cos(ang); c.vy = v0 * Math.sin(ang);
    c.y = ground(J, c.s); c.y0 = c.y; c.top = c.y;
    g.olymp.phase = 'air'; g.olymp.t = 0;
    rules().onSound(g, 'pop', null, q);
    if (d === null) { rules().float(g, 0, 0, LABELS.olymp.late, COLORS.zap); }
    else rules().float(g, 0, 0, q > 0.85 ? LABELS.olymp.perfect : LABELS.olymp.early, q > 0.85 ? COLORS.good : COLORS.zap);
    if (q > 0.85) learn('olympPop');
  }

  function flightLeft(J, c) {
    let s = c.s, y = c.y, vy = c.vy, t = 0;
    while (t < 6) { s += c.vs * 0.02; vy -= AIR.g * 0.02; y += vy * 0.02; t += 0.02; if (y <= ground(J, s)) break; }
    return t;
  }

  function queue(g, c, kind) {
    if (c.tricks.length >= AIR.max) return;
    c.tricks.push({ kind, t: 0, d: TRICKS[kind].d, auto: false });
    learn('olympTrick');
  }

  function tricks(g, c, dt, e, J) {
    if (e.jump || e.up) queue(g, c, 'back');
    if (e.down) queue(g, c, 'front');
    if (e.left) queue(g, c, 'spinL');
    if (e.right) queue(g, c, 'spinR');
    if (e.grab) queue(g, c, 'grab');
    const left = flightLeft(J, c);
    c.left = left;
    if (!c.tricks.length && left <= AIR.flip + 0.12) { c.tricks.push({ kind: 'back', t: 0, d: AIR.flip * 0.9, auto: true }); c.auto = true; commentate(g, LABELS.olymp.mic.auto, 3); }
    const cur = c.tricks.find((k) => k.t < k.d);
    c.cur = cur || null;
    if (!cur) return;
    cur.t += dt;
    if (cur.t >= cur.d) { cur.t = cur.d; rules().onSound(g, 'trick', null); }
  }

  function poseOf(c) {
    let flip = 0, spin = 0, grab = 0;
    for (const k of c.tricks) {
      const p = smooth(k.t / k.d);
      if (k.kind === 'back') flip -= p * Math.PI * 2;
      else if (k.kind === 'front') flip += p * Math.PI * 2;
      else if (k.kind === 'spinL') spin -= p * Math.PI * 2;
      else if (k.kind === 'spinR') spin += p * Math.PI * 2;
      else if (k.kind === 'grab' && k.t < k.d) grab = Math.sin((k.t / k.d) * Math.PI);
    }
    return { flip, spin, grab };
  }

  function landing(g, c, J) {
    const cur = c.tricks.find((k) => k.t < k.d && k.kind !== 'grab');
    const open = cur && cur.t / cur.d > 0.1 && cur.t / cur.d < 0.9;
    for (const k of c.tricks) k.t = Math.min(k.t, k.d);
    const zone = c.s < J.land[0] - 2 ? 'table' : c.s > J.land[1] + 4 ? 'flat' : 'sweet';
    c.land = open ? 'crash' : zone;
    const P = poseOf(c);
    if (open) { c.flip = 0; c.spin = 0; }
    else { c.flip = P.flip; c.spin = P.spin; }
    g.olymp.phase = 'out'; g.olymp.t = 0;
    c.v = Math.hypot(c.vs, c.vy * 0.35) * (open ? 0.3 : zone === 'sweet' ? 0.95 : 0.7);
    c.y = ground(J, c.s);
    c.air = 0;
    if (open) { hurt(g, c, LABELS.olymp.hit.land, 'tumble'); if (g.over) return; }
    else { g.olymp.cheer = zone === 'sweet' ? 1 : 0.6; rules().onSound(g, 'skiLand', null, zone === 'sweet' ? 1 : 0.6); rules().onSound(g, 'cheer', null, zone === 'sweet' ? 1 : 0.5); }
    rules().float(g, 0, 0, LABELS.olymp.landing[c.land], c.land === 'sweet' ? COLORS.good : COLORS.zap);
    score(g, c);
  }

  function score(g, c) {
    const done = c.tricks.filter((k) => k.t >= k.d - 1e-6);
    const kinds = done.map((k) => k.kind);
    let diff = done.reduce((a, k) => a + TRICKS[k.kind].pts, 0);
    if (new Set(kinds).size > 1) diff *= 1.12;
    const amp = clamp((c.top - c.y0) / 4.5, 0, 1.3);
    const land = { sweet: 1, table: 0.84, flat: 0.8, crash: 0.38 }[c.land];
    const base = clamp((4.1 + 1.25 * Math.pow(diff, 0.85) + 1.1 * amp + 0.6 * c.q) * land, 1.5, 9.7);
    const r1 = (v) => Math.round(clamp(v, 0, 10) * 10) / 10;
    const marks = [
      { nat: 'POL', v: 9.8, note: 'pol' },
      { nat: 'AUT', v: r1(base - 0.2), note: '' },
      { nat: 'CZE', v: 0, note: 'cze' },
      { nat: 'NOR', v: r1(base - 0.5), note: '' },
      { nat: 'SVK', v: 10, note: 'svk' },
    ];
    marks[2].v = r1(Math.min(9.9, base + 0.4));
    const sum = Math.round(marks.reduce((a, m) => a + m.v, 0) * 10) / 10;
    const name = kinds.length ? kinds.map((k) => LABELS.olymp.trick[k]).join(' + ') : LABELS.olymp.trick.none;
    const res = { marks, sum, name, land: c.land, q: c.q, auto: c.auto, height: Math.round((c.top - c.y0) * 10) / 10, pts: Math.round(clamp(sum * 2.05, 20, 100)) };
    res.rank = 1 + RIVALS.filter((r) => r.jump > sum).length;
    g.once.olymp.jump = res;
  }

  function jump(g, dt, e) {
    const O = g.olymp, c = O.c, J = g.level.olymp.jump, b = g.bear;
    O.t += dt;
    b.inv = Math.max(0, b.inv - dt);
    if (O.phase === 'top') {
      steerInput(g, c, dt);
      const up = O.t > 0.2 && keyOn(g, 'ArrowUp', 'KeyW');
      if (O.t > 0.9 || (O.t > 0.3 && e.jump) || up) { O.phase = 'in'; O.t = 0; c.v = 9; rules().onSound(g, 'push', null); if (up) { c.pole = 0; c.tuck = false; pole(g, c, 0, true); } }
      return;
    }
    if (O.phase === 'in') {
      const p = at(J.T, c.s);
      steerInput(g, c, dt);
      c.phi = ease(c.phi, c.steer * 0.32, 5, dt);
      c.u += c.v * Math.sin(c.phi) * dt;
      if (Math.abs(c.u) > J.half - 0.5) { c.u = Math.sign(c.u) * (J.half - 0.5); c.phi *= -0.3; c.v *= 0.97; rules().onSound(g, 'net', null, 0.4); }
      const acc = G * p.gr * 0.82 - 0.03 * G - 0.0072 * c.v * c.v;
      c.v = clamp(c.v + acc * dt, 0, 24);
      c.s += c.v * Math.cos(c.phi) * dt;
      c.lean = ease(c.lean, c.steer * 0.4, 7, dt);
      if (c.pole > 0) c.pole = Math.max(0, c.pole - dt);
      c.tuck = c.s < J.lip - 30 && !(c.pole > 0);
      c.y = p.y;
      if (e.jump) {
        if (J.lip - c.s <= AIR.zone && c.press === null) c.press = c.s;
        else if (J.lip - c.s > AIR.zone && !c.early) { c.early = true; rules().float(g, 0, 0, LABELS.olymp.notYet, COLORS.zap); }
      }
      if (c.s >= J.lip) launch(g, c, J);
      b.x = BASE.skok + 400 * clamp(c.s / J.stop, 0, 1);
      return;
    }
    if (O.phase === 'air') {
      c.air += dt;
      c.s += c.vs * dt; c.vy -= AIR.g * dt; c.y += c.vy * dt;
      c.top = Math.max(c.top, c.y);
      c.cam = Math.min(1, c.cam + dt / 0.55);
      tricks(g, c, dt, e, J);
      const P = poseOf(c);
      c.flip = P.flip; c.spin = P.spin; c.grab = P.grab;
      if (c.y <= ground(J, c.s)) landing(g, c, J);
      b.x = BASE.skok + 400 * clamp(c.s / J.stop, 0, 1);
      return;
    }
    if (O.phase === 'out') {
      c.cam = Math.max(0, c.cam - dt / 0.9);
      if (c.fall > 0) c.fall -= dt;
      const p = at(J.T, c.s);
      const stopAt = J.stop - 18, br = O.t > 0.9 ? 12 : 0;
      c.v = Math.max(0, c.v + (G * p.gr * 0.7 - 0.02 * c.v * c.v - br) * dt);
      if (c.s > J.stop - 2) c.v = Math.min(c.v, 2);
      c.s += c.v * dt; c.y = p.y;
      c.flip = ease(c.flip, Math.round(c.flip / (Math.PI * 2)) * Math.PI * 2, 10, dt);
      c.spin = ease(c.spin, Math.round(c.spin / (Math.PI * 2)) * Math.PI * 2, 10, dt);
      c.u = ease(c.u, 0, 0.6, dt);
      c.spray = br ? 1 : Math.max(0, c.spray - dt);
      c.phi = ease(c.phi, br ? 1.2 : 0, 4, dt); c.lean = ease(c.lean, br ? 0.45 : 0, 5, dt);
      b.x = BASE.skok + 400 * clamp(c.s / J.stop, 0, 1);
      if (c.v < 1.5 && O.t > 0.8) { O.phase = 'judges'; O.t = 0; rules().onSound(g, 'judge', null); const r = g.once.olymp.jump; commentate(g, r.land === 'crash' ? LABELS.olymp.mic.jumpBad : LABELS.olymp.mic.jumpGood, 4.4); rules().say(g, NEWS.olymp.judges, true); }
      return;
    }
    if (O.phase === 'judges') {
      c.lean = ease(c.lean, 0, 4, dt); c.phi = ease(c.phi, 0.25, 3, dt); c.spray = 0;
      if (O.t > 4.2 || (O.t > 1.6 && e.jump)) next(g, 'sled');
    }
  }

  function startSled(g) {
    const O = g.olymp, S = g.level.olymp.sled;
    O.stage = 'sane'; O.phase = 'top'; O.t = 0;
    O.c = { s: S.start.s, a: 0, w: 0, v: 0, steer: 0, tuck: false, lean: 0, fall: 0, clock: 0, flies: 0, crashes: 0, spray: 0, snow: 0, roll: 0, hy: 0, hv: 0 };
    S.things.forEach((t) => { t.hit = false; });
    g.bear.x = BASE.sane;
    g.bear.inv = 0;
    commentate(g, LABELS.olymp.mic.sled, 4);
    say(g, 'sled', NEWS.olymp.sled);
  }

  function wallTop(S, p, side) {
    const outer = p.bank && Math.sign(p.bank) === -side;
    return outer ? lerp(S.wall, S.out, Math.min(1, Math.abs(p.bank))) : S.wall;
  }

  function sledRun(g, dt, e) {
    const O = g.olymp, c = O.c, S = g.level.olymp.sled, b = g.bear;
    O.t += dt;
    b.inv = Math.max(0, b.inv - dt);
    if (O.phase === 'top') {
      steerInput(g, c, dt);
      if (O.t > 1.0 || (O.t > 0.3 && e.jump)) { O.phase = 'run'; O.t = 0; c.v = 5; rules().onSound(g, 'push', null); }
      return;
    }
    if (O.phase === 'run') {
      const p = at(S.T, c.s);
      if (c.fall > 0) {
        c.fall -= dt;
        c.v = Math.max(2, c.v - 10 * dt); c.a = ease(c.a, 0, 4, dt); c.w = 0;
        if (c.fall <= 0) { c.v = 6; c.a = 0; }
      } else {
        c.clock += dt;
        hop(g, c, dt, e, HOP.sled);
        steerInput(g, c, dt);
        const lie = c.tuck, R = S.R;
        const lat = (-G * Math.sin(c.a) - c.v * c.v * p.k * Math.cos(c.a)) / R + SLED.lean * c.steer * (lie ? 0.75 : 1) - SLED.damp * c.w;
        c.w += lat * dt; c.a += c.w * dt;
        const drag = SLED.drag * (lie ? SLED.lie : 1);
        c.v = clamp(c.v + (G * p.gr - SLED.mu * G - drag * c.v * c.v - 0.35 * Math.abs(c.w) * 0.5) * dt, 0, 30);
        const side = Math.sign(c.a) || 1, top = wallTop(S, p, side);
        c.top = top;
        if (Math.abs(c.a) > top) {
          c.flies++;
          if (hurt(g, c, LABELS.olymp.hit.out, 'tumble')) { if (g.over) return; c.fall = 1.6; c.out = 1; c.outSide = side; c.a = side * (top - 0.05); c.w = 0; }
          else { c.a = side * (top - 0.02); c.w = -c.w * 0.3; }
        }
        for (const t of S.things) {
          if (t.kind === 'waiter' && !t.hit) t.a = 0.55 * Math.sin(O.t * 0.9);
          if (t.hit || Math.abs(c.s - t.s) > 1.1 || (LOW[t.kind] && c.hy > HOP.low)) continue;
          if (Math.abs(c.a - t.a) < 0.3) {
            t.hit = true;
            if (hurt(g, c, LABELS.olymp.hit[t.kind], 'tumble')) { if (g.over) return; c.fall = 1.2; }
          } else if (c.s > t.s && !t.near) { t.near = true; rules().onSound(g, 'whoosh', null); }
        }
        if (!O.said.bank && Math.abs(c.a) > 0.75) { O.said.bank = true; commentate(g, LABELS.olymp.mic.bank, 3.2); learn('olympLean'); }
      }
      c.out = Math.max(0, (c.out || 0) - dt);
      c.s += c.v * dt;
      c.lean = ease(c.lean, c.steer, 8, dt);
      c.roll = ease(c.roll, c.a, 6, dt);
      c.snow = (c.snow + c.v * dt) % 1000;
      c.spray = ease(c.spray, Math.min(1, Math.abs(c.w) * 0.8 + Math.abs(c.steer) * 0.3), 6, dt);
      b.x = BASE.sane + 800 * clamp(c.s / S.bar, 0, 1);
      if (c.s >= S.bar) {
        O.phase = 'bar'; O.t = 0;
        const total = c.clock;
        const res = { time: total, flies: c.flies, crashes: c.crashes, pts: Math.round(clamp(100 - (total - PAR.sled * 0.97) * 4, 25, 100)) };
        res.rank = 1 + RIVALS.filter((r) => r.sled * PAR.sled < total).length;
        g.once.olymp.sled = res;
        rules().onSound(g, 'cheer', null, 1);
        rules().onSound(g, 'door', null);
        commentate(g, LABELS.olymp.mic.bar, 4);
        rules().say(g, NEWS.olymp.bar, true);
      }
      return;
    }
    if (O.phase === 'bar') {
      c.v = Math.max(0, c.v - 12 * dt);
      c.s = Math.min(S.stop, c.s + c.v * dt);
      c.a = ease(c.a, 0, 4, dt); c.roll = ease(c.roll, 0, 4, dt);
      b.x = BASE.sane + 800 + 100 * clamp(O.t / 4, 0, 1);
      if (O.t > 3.0) { O.phase = 'podium'; O.t = 0; medal(g); }
      return;
    }
    if (O.phase === 'podium') {
      if (O.t > 0.2 && !O.anthem) { O.anthem = true; rules().onSound(g, 'anthem', null); }
      if (O.t > 5 || (O.t > 2 && e.jump)) { O.phase = 'doping'; O.t = 0; rules().onSound(g, 'whistle', null); rules().say(g, NEWS.olymp.doping, true); }
      return;
    }
    if (O.phase === 'doping') {
      if (O.t > 0.9 && !O.asked) { O.asked = true; rules().onSound(g, 'gasp', null); }
      if (O.t > 2.0 && !O.snap) { O.snap = true; rules().onSound(g, 'camera', null); }
      if (O.t > 4.8) rules().end(g, 'win');
    }
  }

  function totals(g) {
    const R = g.once.olymp || {}, s = R.slalom ? R.slalom.pts : 0, j = R.jump ? R.jump.pts : 0, d = R.sled ? R.sled.pts : 0;
    return { s, j, d, sum: s + j + d };
  }

  function medal(g) {
    const t = totals(g).sum;
    g.medal = t >= 235 ? 'gold' : t >= 175 ? 'silver' : 'bronze';
    g.once.olymp.medal = g.medal;
    rules().onSound(g, 'cheer', null, 1);
  }

  function step(g, dt) {
    const O = g.olymp || init(g);
    const e = edges(g);
    if (O.mic && (O.mic.t -= dt) <= 0) O.mic = null;
    O.flash = Math.max(0, O.flash - dt * 1.8);
    O.cheer = Math.max(0, (O.cheer || 0) - dt * 0.45);
    O.gasp = Math.max(0, (O.gasp || 0) - dt * 0.6);
    O.time = (O.time || 0) + dt;
    if (!fading(g, dt) && !g.over) {
      if (O.stage === 'slalom') slalom(g, dt, e);
      else if (O.stage === 'skok') jump(g, dt, e);
      else sledRun(g, dt, e);
    }
    if (g.over) return;
    ZS.sim.loop.ageEffects(g, dt);
    rules().tickerStep(g, dt);
    g.cam = 0;
  }

  function act(g) {
    const O = g.olymp;
    if (!O || g.over) return null;
    if (O.stage === 'skok' && O.phase === 'air') return 'hug';
    return null;
  }

  function steerTo(g, c, d) {
    const keys = g.input.keys;
    if (d > c.steer + 0.06) { if (d > 0.04) keys.add('ArrowRight'); }
    else if (d < c.steer - 0.06) { if (d < -0.04) keys.add('ArrowLeft'); }
    else if (d > 0.45) keys.add('ArrowRight');
    else if (d < -0.45) keys.add('ArrowLeft');
  }

  function slalomTarget(g, c) {
    const C = g.level.olymp.slalom, q = C.gates.find((x) => !x.done && x.s > c.s);
    let goal = q ? q.u * 0.9 : 0, ahead = q ? q.s - c.s : 40;
    const q2 = q && C.gates[q.i + 1];
    if (q && q2 && ahead < 7 && Math.abs(c.u - q.u) < 2.2) { goal = q2.u * 0.9; ahead = q2.s - c.s; }
    const big = C.ramps.find((r) => r.kind === 'big');
    const fly = c.v > 16 && big.s - c.s > -12 && big.s - c.s < 34 && !C.gates.some((x) => !x.done && x.s < big.s);
    if (fly && c.s < big.s) { goal = big.u; ahead = Math.max(5, big.s - big.len - c.s); }
    for (const h of slalomHazards(g, c)) {
      const d = h.s0 - c.s;
      if (d < -1.5 || d > 70 || (h.kind === 'ratrak' && (fly || C.gates.some((x) => !x.done && x.s < h.s0)))) continue;
      let lo = h.u0 - 2.6, hi = h.u1 + 2.6;
      if (h.kind === 'school') {
        const tArr = Math.max(0, d) / Math.max(c.v, 5), k = school(C, (c.schoolT || 0) + tArr);
        if (k) { lo = Math.min(lo, k.tail - 2.8); hi = Math.max(hi, k.head + 3.2 + C.school.speed * 0.6); }
      }
      const edge = C.half - 1.6, room = [lo + edge, edge - hi];
      if (goal > lo && goal < hi || (c.u > lo && c.u < hi && d < 14)) {
        goal = room[0] >= room[1] ? lo : hi;
        ahead = Math.min(ahead, Math.max(5, d));
      }
    }
    return { goal: clamp(goal, -C.half + 2, C.half - 2), ahead: Math.max(ahead, 5) };
  }

  function pilotSlalom(g, c) {
    const O = g.olymp, keys = g.input.keys;
    if (O.phase === 'view' || O.phase === 'stop') { if (O.phase === 'stop' && O.t > 1.5) g.input.jumpPressed = true; return; }
    if (O.phase !== 'ski' || c.fall > 0) return;
    const { goal, ahead } = slalomTarget(g, c);
    const p = at(g.level.olymp.slalom.T, c.s + c.v * 0.3);
    const phiWant = clamp(Math.atan2(goal - c.u, ahead) * 1.7, -0.92, 0.92);
    const d = clamp(phiWant / SKI.phi + (phiWant - c.phi) * 1.4 + (p.k * c.v) / SKI.turn / SKI.phi, -1, 1);
    steerTo(g, c, d);
    if (Math.abs(c.phi) < 0.15 && Math.abs(goal - c.u) < 1.5 && ahead > 26) keys.add('ArrowDown');
  }

  function pilotJump(g, c) {
    const O = g.olymp, J = g.level.olymp.jump, keys = g.input.keys;
    if (O.phase === 'top') return;
    if (O.phase === 'in') {
      if (c.u > 0.4) keys.add('ArrowLeft'); else if (c.u < -0.4) keys.add('ArrowRight');
      if (c.press === null && J.lip - c.s < 1.8) g.input.jumpPressed = true;
      return;
    }
    if (O.phase === 'air') {
      if (!c.tricks.length && c.air > 0.12) keys.add('ArrowUp');
      else if (c.tricks.length === 1 && c.left > AIR.spin + 0.35 && c.tricks[0].t >= c.tricks[0].d - 0.05) keys.add('ArrowRight');
      return;
    }
    if (O.phase === 'judges' && O.t > 3) g.input.jumpPressed = true;
  }

  function pilotSled(g, c) {
    const O = g.olymp, S = g.level.olymp.sled, keys = g.input.keys;
    if (O.phase !== 'run' || c.fall > 0) { if (O.phase === 'podium' && O.t > 4) g.input.jumpPressed = true; return; }
    const p = at(S.T, c.s + c.v * 0.5);
    let goal = clamp(Math.atan2(-c.v * c.v * p.k, G), -0.9, 0.9);
    for (const t of S.things) {
      const d = t.s - c.s;
      if (t.hit || d < -1 || d > c.v * 1.6) continue;
      if (Math.abs(goal - t.a) < 0.45) goal = t.a + (goal >= t.a ? 0.5 : -0.5);
    }
    const want = clamp((goal - c.a) * 2.2 - c.w * 1.4, -1, 1);
    if (want > 0.15) keys.add('ArrowRight'); else if (want < -0.15) keys.add('ArrowLeft');
    if (Math.abs(p.k) < 0.004 && Math.abs(c.a) < 0.3) keys.add('ArrowDown');
  }

  function pilot(g) {
    const O = g.olymp;
    if (!O || !O.c) return;
    if (O.stage === 'slalom') pilotSlalom(g, O.c);
    else if (O.stage === 'skok') pilotJump(g, O.c);
    else pilotSled(g, O.c);
  }

  ZS.sim.olymp = { SKI, POLE, RAMP, rampTop, AIR, SLED, BASE, RIVALS, PAR, RECORD, TRICKS, step, init, act, pilot, school, slalomHazards, poseOf, wallTop, totals, flightLeft, ground };
})();
