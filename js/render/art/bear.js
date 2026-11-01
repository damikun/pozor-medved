(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const C = {
    fur: '#6b4226', far: '#4e2f19', leg: '#5b371f', muzzle: '#9a6a44', dark: '#1d1209', ear: '#3f2614',
    tail: '#5a3720', claw: '#e4d6bb', clawFar: '#9c8a70', eye: '#f4efe6', pad: '#2b1a10',
    throat: '#3a1510', tongue: '#c25a5c', tag: '#f6c814', tagEdge: '#b98a0c',
    shade: 'rgba(30,14,4,0.17)', soft: 'rgba(30,14,4,0.09)', light: 'rgba(255,226,190,0.06)',
  };
  const { rrect } = ZS.gfx;
  const TAU = Math.PI * 2;
  const RISE = 0.3, SPLIT = 0.55, TAKEOFF = 0.08, LAND = 0.2, DROP = 0.18;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);
  const ease = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));

  const WALK = { stride: 96, duty: 0.52, lift: [9, 6], offs: [0.25, 0.75, 0, 0.5], shift: [2, 1], kick: [2, 3], reach: [4, 2] };
  const STALK = { stride: 64, duty: 0.7, lift: [6, 4], offs: [0.25, 0.75, 0, 0.5], shift: [6, 2], kick: [1, 1], reach: [3, 1] };
  const RUN = { stride: 116, duty: 0.36, lift: [10, 8], offs: [0.47, 0.39, 0.07, 0], shift: [6, 5], kick: [4, 9], reach: [12, 6] };
  const STAND = [2, -2, -2, 2];
  const LEG = [
    { root: [16, -40], toe: 18, up: [12, 21], low: 22, bend: 1, foot: [6, 4, 3], r: [8, 6.4, 5.9, 5] },
    { root: [-25, -38], toe: -14, up: [12, 22], low: 19, bend: -1, foot: [12, 4.5, 4], r: [10.5, 7.2, 6.1, 4.9] },
  ];
  const SLIDE = [0.28, 0.18], ANKLE = [-4, -1];

  function ik(rx, ry, tx, ty, a, b, bend) {
    let dx = tx - rx, dy = ty - ry, d = Math.hypot(dx, dy);
    if (d < 1e-3) { dx = 0; dy = 1; d = 1; }
    const dc = clamp(d, Math.abs(a - b) + 1, a + b - 0.05);
    const ang = Math.atan2(dy, dx) + bend * Math.acos(clamp((a * a + dc * dc - b * b) / (2 * a * dc), -1, 1));
    return [rx + Math.cos(ang) * a, ry + Math.sin(ang) * a, rx + (dx / d) * dc, ry + (dy / d) * dc];
  }
  function legIK(L, rx, ry, tx, ty) {
    const a = clamp(Math.hypot(tx - rx, ty - ry) - L.low + 2, L.up[0], L.up[1]);
    return ik(rx, ry, tx, ty, a, L.low, L.bend);
  }

  function seg(ctx, x1, y1, r1, x2, y2, r2) {
    const d = Math.hypot(x2 - x1, y2 - y1) || 1, nx = (y1 - y2) / d, ny = (x2 - x1) / d, an = Math.atan2(ny, nx);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
    ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
    ctx.arc(x2, y2, r2, an, an + Math.PI, true);
    ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
    ctx.arc(x1, y1, r1, an + Math.PI, an + TAU, true);
    ctx.closePath(); ctx.fill();
  }

  function blob(ctx, p) {
    const n = p.length;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 0; i < n; i++) {
      const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n], d = p[(i + 2) % n];
      ctx.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6,
        c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, c[0], c[1]);
    }
    ctx.closePath();
  }

  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }

  function claws(ctx, lines, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of lines) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
  }

  function ear(ctx, x, y, r, col, inner, rot, flat) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = col; ell(ctx, 0, 0, r, r * flat);
    if (inner) { ctx.fillStyle = inner; ell(ctx, 0, -r * 0.18 * flat, r * 0.5, r * 0.5 * flat); }
    ctx.restore();
  }

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const KEYS = ['fur', 'far', 'leg', 'muzzle', 'dark', 'ear', 'tail', 'claw', 'clawFar', 'eye', 'pad', 'throat', 'tongue', 'tag', 'tagEdge'];
  const BASE = {}, SHADE = {};
  for (const k of KEYS) { BASE[k] = rgb(C[k]); SHADE[k] = BASE[k].map((v) => Math.round(v * 0.78)); }
  C.rgb = BASE;
  function mixPal(t) {
    if (t <= 0) return C;
    const p = Object.assign({}, C, { rgb: {} });
    for (const k of KEYS) {
      p.rgb[k] = BASE[k].map((v, i) => Math.round(lerp(v, SHADE[k][i], t)));
      p[k] = 'rgb(' + p.rgb[k].join(',') + ')';
    }
    return p;
  }
  const HID = mixPal(1);
  function tint(K, a, b, t) {
    if (t <= 0.001) return K[a];
    if (t >= 0.999) return K[b];
    return 'rgb(' + K.rgb[a].map((v, i) => Math.round(lerp(v, K.rgb[b][i], t))).join(',') + ')';
  }

  function bump(t, period, d, off) {
    const u = frac((t + (off || 0)) / period) * period;
    return u < d ? Math.pow(Math.sin((Math.PI * u) / d), 2) : 0;
  }
  function hold(t, period, d, e, off) {
    const u = frac((t + (off || 0)) / period) * period;
    return u < d ? smooth(u / e) * smooth((d - u) / e) : 0;
  }
  function tear(time, fear) {
    const u = frac(time / 3.7 + 0.13);
    const on = fear * smooth(Math.sin(time * 0.53) * 1.6 + 0.5);
    return u < 0.5 ? [u / 0.5, on * Math.sin((Math.PI * u) / 0.5)] : [0, 0];
  }

  const anim = new WeakMap();
  const modeOf = (b) => (b.climbing ? 'climb' : b.hiding ? 'hide' : 'side');
  const ramp = (v, target, speed, dt) => v + clamp(target - v, -speed * dt, speed * dt);
  const busy = (b) => (b.act || b.waking || (b.slide || 0) > 0.05 ? 1 : 0);

  function actIn(s, b) {
    const a = b.act;
    if (!a) return;
    if (a !== s.ao) { s.ao = a; s.hk = a.hit ? 1 : 0; }
    s.ak = a.kind; s.at = a.t || 0; s.ah = !!a.hit; s.ax = 1;
    const d = (a.dir || b.dir) < 0 ? -1 : 1;
    s.alx = Number.isFinite(a.legX) ? (a.legX - b.x) * d : 30;
    s.asw = Number.isFinite(a.sway) ? a.sway * d : null;
  }

  function track(b, time) {
    let s = anim.get(b);
    const head = b.dir < 0 ? Math.PI : 0;
    if (!s) {
      s = { t: time, px: b.x, py: b.y, phase: 0, mwl: 0, mw: 0, rwl: 0, rw: 0, cspd: 0, cw: b.crouch ? 1 : 0, aw: 0,
        face: b.dir || 1, tu: b.dir < 0 ? 1 : 0, lead: 1, yh: head, ys: head, yp: head, vy: b.vy || 0, shY: b.y, ground: b.onGround, groundY: b.y, airT: 0,
        toT: 0, landT: 0, dropT: 0, from: null, mode: modeOf(b), breath: 0, fear: b.danger ? 1 : 0,
        cov: b.covered ? 1 : 0, side: b.peekSide || 1,
        ao: null, ak: null, at: 0, ah: false, ax: 0, hk: 0, bz: busy(b), wk: b.waking ? 1 : 0, wt: b.wakeT || 0,
        sl: clamp(b.slide || 0, 0, 1), cold: clamp(b.cold || 0, 0, 1), tg: b.tag ? 1 : 0, vap: 0.45, due: 0, vn: 0, vx: 0, puffs: [], P: null, Pt: -1, ga: 0, gf: 0, alx: 30, asw: null };
      actIn(s, b);
      anim.set(b, s);
      return s;
    }
    let dt = time - s.t;
    if (dt === 0) return s;
    if (dt < 0 || dt > 0.25) dt = 1 / 60;
    s.t = time;
    const dx = b.x - s.px, dy = b.y - s.py, free = !b.hiding && !b.climbing;
    s.px = b.x; s.py = b.y;
    let v = 0;
    s.vx = 0;
    if (free && Math.abs(dx) < 80) {
      s.phase = frac(s.phase + Math.abs(dx) / lerp(lerp(WALK.stride, RUN.stride, s.rw), STALK.stride, s.cw));
      v = Math.abs(dx) / dt; s.vx = dx / dt;
    }
    s.mwl = ramp(s.mwl, smooth(v / lerp(130, 60, s.cw)), 4, dt);
    s.rwl = ramp(s.rwl, smooth((v - 205) / 85), 3.5, dt);
    s.mw = smooth(s.mwl); s.rw = smooth(s.rwl);
    s.cspd = ease(s.cspd, b.climbing && Math.abs(dy) < 80 ? Math.abs(dy) / dt : 0, 6, dt);
    s.cw = ease(s.cw, b.crouch ? 1 : 0, 6, dt);
    if (b.climbing && s.mode !== 'climb') { s.ga = s.aw > 0.001 ? s.aw : 0; s.gf = smooth((s.vy + 250) / 500); }
    s.aw = ease(s.aw, b.onGround || !free ? 0 : 1, b.onGround ? 22 : 16, dt);
    if (!b.onGround) s.vy = ease(s.vy, b.vy || 0, 20, dt);
    s.fear = ease(s.fear, b.danger ? 1 : 0, 4, dt);
    s.cov = ease(s.cov, b.covered ? 1 : 0, 3, dt);
    s.side = ease(s.side, b.peekSide || 1, 3, dt);
    if (free && s.ground && !b.onGround) { s.airT = 0; if (b.vy < -200) s.toT = TAKEOFF; }
    if (free && !s.ground && b.onGround && s.airT > 0.12) s.landT = LAND;
    s.ground = b.onGround;
    if (b.onGround) s.groundY = b.y; else s.airT += dt;
    s.shY = ease(s.shY, b.onGround ? b.y : s.groundY, 25, dt);
    s.toT = Math.max(0, s.toT - dt);
    s.landT = Math.max(0, s.landT - dt);
    s.dropT = Math.max(0, s.dropT - dt);
    const A = b.act;
    if (A) actIn(s, b); else s.ax = ramp(s.ax, 0, 1 / 0.15, dt);
    s.hk = ease(s.hk, s.ah ? 1 : 0, 12, dt);
    s.bz = ramp(s.bz, busy(b), 6, dt);
    s.wk = ramp(s.wk, b.waking ? 1 : 0, 4, dt);
    if (b.waking) s.wt = b.wakeT || 0;
    s.sl = ease(s.sl, clamp(b.slide || 0, 0, 1), 9, dt);
    s.cold = ease(s.cold, clamp(b.cold || 0, 0, 1), 3, dt);
    s.tg = ramp(s.tg, b.tag ? 1 : 0, 3, dt);
    s.vap += dt / lerp(lerp(1.4, 1.05, s.mw), 0.7, s.rw);
    if (s.vap >= 1) { s.vap -= Math.floor(s.vap); s.due = 1; }
    if (s.wk > 0.5 && s.cold > 0.04 && s.wt >= 1.3 && s.wt - dt < 1.3) s.due = 2;
    const goal = (A ? A.dir || b.dir : b.dir) < 0 ? 1 : 0;
    s.lead = ramp(s.lead, goal > s.tu ? 1 : goal < s.tu ? -1 : s.lead, 8, dt);
    s.tu = ramp(s.tu, goal, 1 / (A ? 0.2 : 0.42), dt);
    const part = (k) => Math.PI * smooth((s.tu - 0.5 + s.lead * k + 0.35) / 0.7);
    s.yh = part(0.12); s.ys = part(0); s.yp = part(-0.12);
    s.face += clamp((b.dir || 1) - s.face, -dt * 8, dt * 8);
    s.breath += dt * lerp(2.1, 5, s.mw);
    return s;
  }

  function enter(s, mode) {
    if (s.mode === mode) return;
    if (mode === 'side') { s.from = s.mode; s.dropT = DROP; }
    s.mode = mode;
  }

  function fromToe(L, x, y, a) {
    const f = L.foot, c = Math.cos(a), s = Math.sin(a);
    return [x - f[0] * c + f[1] * s, y - f[0] * s - f[1] * c];
  }
  function fromHeel(L, x, y, a) {
    const f = L.foot, c = Math.cos(a), s = Math.sin(a);
    return [x + f[2] * c + f[1] * s, y + f[2] * s - f[1] * c];
  }

  function cycle(u, g, i) {
    const fore = i < 2, k = fore ? 0 : 1, L = LEG[k], S = g.duty * g.stride, len = L.foot[0] + L.foot[2];
    const roll = fore ? 0.7 : 0.6, aOff = fore ? 0.95 : 0.85, aOn = fore ? 0 : -0.32;
    const stance = (s) => {
      const x = S * (0.5 - s);
      if (!fore && s < 0.16) { const a = aOn * (1 - smooth(s / 0.16)); return fromHeel(L, x - len, 0, a).concat(a); }
      const a = aOff * smooth((s - roll) / (1 - roll));
      return fromToe(L, x, 0, a).concat(a);
    };
    if (u < g.duty) return stance(u / g.duty);
    const s = (u - g.duty) / (1 - g.duty), A0 = stance(1), A1 = stance(0), e = smooth(s);
    const x = lerp(A0[0], A1[0], e) - g.kick[k] * Math.sin(Math.PI * clamp(s / 0.4, 0, 1))
      + g.reach[k] * Math.sin(Math.PI * clamp((s - 0.45) / 0.55, 0, 1));
    const y = lerp(A0[1], A1[1], e) - g.lift[k] * Math.sin(Math.PI * Math.pow(s, 0.8));
    const top = fore ? 2.0 : 0.55, mid = fore ? 0.38 : 0.45, rch = fore ? -0.18 : aOn;
    const a = s < mid ? lerp(aOff, top, smooth(s / mid))
      : s < 0.82 ? lerp(top, rch, smooth((s - mid) / (0.82 - mid))) : lerp(rch, aOn, smooth((s - 0.82) / 0.18));
    return [x, y, a];
  }

  function amble(g, ph, f, k) {
    const at = (i) => { const u = frac(ph - g.offs[i]); return u < g.duty ? u / g.duty : -1; };
    const bell = (i) => { const s = at(i); return s < 0 ? 0 : Math.pow(Math.sin(Math.PI * s), 2); };
    const push = (i) => { const s = at(i); return s < 0.6 ? 0 : Math.pow(Math.sin((Math.PI * (s - 0.6)) / 0.4), 2); };
    const dF = 1.1 * (bell(0) + bell(1)) - 0.7 * (push(0) + push(1));
    const dH = 0.9 * (bell(2) + bell(3)) - 0.6 * (push(2) + push(3)), nod = bell(0) + bell(1);
    return {
      by: (k * (dF + dH)) / 2, pitch: (k * (dF - dH)) / 41, flex: 0,
      hump: 2.2 * bell(0) + 1.3 * bell(1), roll: -0.2 * (f[0][0] + LEG[0].foot[0]),
      croup: 1.6 * bell(2) + bell(3), hroll: -0.14 * (f[2][0] + LEG[1].foot[0]),
      headA: 0.22 + 0.06 * nod, headX: 1, headY: 2 + 1.4 * nod, ears: 0.15, swing: Math.sin(TAU * (ph - 0.05)),
    };
  }

  function bodyTf(P) {
    const c = Math.cos(P.pitch), s = Math.sin(P.pitch), px = P.pivot[0], py = P.pivot[1], ox = P.bx || 0;
    return (x, y) => {
      const dx = x - px, dy = y - py;
      return [(px + dx * c - dy * s + ox) * P.sx, (py + dx * s + dy * c + P.by) * P.sy];
    };
  }

  const rootOf = (P, i) => P.T(LEG[i < 2 ? 0 : 1].root[0] + (i < 2 ? -3 : 4) * P.flex - (i % 2 ? 1.5 : 0),
    LEG[i < 2 ? 0 : 1].root[1] - (i % 2 ? 1 : 0));
  function settle(P, tg, k) {
    const roots = () => tg.map((t, i) => {
      const r = rootOf(P, i), j = i < 2 ? 0 : 1;
      return [r[0] + SLIDE[j] * (t[0] - r[0] - ANKLE[j]), r[1]];
    });
    let R = roots(), dF = 0, dH = 0;
    for (let i = 0; i < 4 && k > 0; i++) {
      const L = LEG[i < 2 ? 0 : 1], reach = (L.up[1] + L.low) * 0.98, dx = tg[i][0] - R[i][0];
      const need = tg[i][1] - R[i][1] - Math.sqrt(Math.max(0, reach * reach - dx * dx));
      if (i < 2) dF = Math.max(dF, need); else dH = Math.max(dH, need);
    }
    dF = clamp(dF, 0, 4) * k; dH = clamp(dH, 0, 4) * k;
    if (dF > 0 || dH > 0) { P.by += (dF + dH) / 2; P.pitch += (dF - dH) / 41; P.T = bodyTf(P); R = roots(); }
    P.legs = tg.map(([ex, ey, a], i) => {
      const r = R[i], j = legIK(LEG[i < 2 ? 0 : 1], r[0], r[1], ex, ey);
      return { fore: i < 2, far: i % 2 === 1, root: r, jx: j[0], jy: j[1], ex: j[2], ey: j[3], a };
    });
  }

  const key = (t, k) => {
    if (t <= k[0]) return k[1];
    for (let i = 2; i < k.length; i += 2) if (t < k[i]) return lerp(k[i - 1], k[i + 1], smooth((t - k[i - 2]) / (k[i] - k[i - 2])));
    return k[k.length - 1];
  };
  const once = (t, a, d) => { const u = (t - a) / d; return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0; };

  const BITE = {
    bx: [0, 0, 0.07, -3.5, 0.15, 8, 0.2, 8.5, 0.28, 3.5, 0.42, 0],
    hx: [0, 0, 0.07, -2.5, 0.15, 7, 0.21, 6, 0.29, 1.5, 0.42, 0],
    ha: [0, 0, 0.07, -0.1, 0.125, -0.16, 0.16, 0.12, 0.24, 0.07, 0.42, 0],
    pt: [0, 0, 0.07, -0.05, 0.15, 0.07, 0.26, 0.02, 0.42, 0],
    by: [0, 0, 0.07, 2, 0.15, 1.5, 0.42, 0],
    jaw: [0.02, 0, 0.125, 1.1, 0.16, 0],
    sk: [0.16, 0, 0.18, 1, 0.26, 1, 0.32, 0],
    ear: [0, 0, 0.06, 1, 0.3, 1, 0.42, 0],
    wd: [0, 0, 0.06, 0.6, 0.13, 0.4, 0.16, 0],
    sh: [0.13, 0, 0.16, 0.7, 0.27, 0.7, 0.35, 0],
  };
  const HUG = {
    up: [0.02, 0, 0.24, 1, 1.46, 1, 1.68, 0],
    bx: [0.06, 0, 0.3, 1, 1.4, 1, 1.62, 0],
    arm: [0.03, 0, 0.14, 1, 0.3, 2, 1.4, 2, 1.5, 1, 1.66, 0],
    face: [0.26, 0, 0.38, 1, 1.36, 1, 1.47, 0],
    look: [0.04, 0, 0.14, 1, 0.3, 0, 1.42, 0, 1.52, 1, 1.66, 0],
    air: [0.26, 0, 0.36, 1, 0.56, 1, 0.68, 0],
    stare: [0.6, 0, 0.76, 1, 1.32, 1, 1.46, 0],
    rock: [0.3, 0, 0.45, 1, 1.25, 1, 1.4, 0],
    step: [[0.06, 0.2, 1.4, 1.53], [0.14, 0.29, 1.48, 1.62]],
  };
  const WAKE = {
    st: [0.12, 0, 0.55, 1, 0.92, 1, 1.22, 0],
    yw: [1, 0, 1.32, 1, 1.72, 1, 1.98, 0],
    jaw: [1.04, 0, 1.36, 1.15, 1.66, 1.22, 1.94, 0],
    sk: [1.98, 0, 2.06, 1, 2.28, 1, 2.46, 0],
    sh: [0, 1, 0.3, 1, 0.55, 0.6, 0.95, 0.6, 1.1, 1, 1.96, 1, 2.06, 0],
    dz: [0, 1, 0.35, 1, 0.7, 0],
    zz: [1.9, 1, 2.05, 0],
  };
  const SHAKE = {
    up: [0.02, 0, 0.27, 1, 1.52, 1, 1.86, 0],
    bx: [0.04, 0, 0.28, 1, 1.5, 1, 1.82, 0],
    arm: [0.04, 0, 0.17, 1, 0.3, 2, 1.5, 2, 1.6, 1, 1.84, 0],
    grip: [0.24, 0, 0.32, 1, 1.47, 1, 1.56, 0],
    mad: [0.1, 0, 0.3, 1, 1.2, 1, 1.32, 0],
    smug: [1.22, 0, 1.36, 1, 1.7, 1, 1.9, 0],
    look: [0.08, 0, 0.3, 1, 1.22, 1, 1.42, 0],
    step: [[0.04, 0.17, 1.52, 1.66], [0.11, 0.25, 1.6, 1.78]],
  };
  const SELFIE = {
    up: [0.02, 0, 0.35, 1, 1.62, 1, 2.12, 0],
    bx: [0.04, 0, 0.35, 1, 1.62, 1, 2.1, 0],
    arm: [0.06, 0, 0.2, 1, 0.38, 2, 1.6, 2, 1.76, 1, 2.06, 0],
    grin: [0.22, 0, 0.45, 1, 1.75, 1, 2, 0],
    glad: [1.3, 0, 1.42, 1, 1.72, 1, 1.86, 0],
    step: [[0.05, 0.2, 1.62, 1.78], [0.12, 0.28, 1.7, 1.86]],
  };
  const MV = { up: 0, sx: 1, sy: 1, hug: 0, ht: 0, hit: 0, reach: 0, lf: 0, sq: 0, nf: 0, wake: 0, wt: 0, slide: 0, tuck: 0, touch: 0, cy: 0, any: false,
    grab: 0, ph: 0, st: null, dang: 0, o: [0, 0, 0], hn: [0, 0, 0], hf: [0, 0, 0] };
  const put = (v, x, y, a) => { v[0] = x; v[1] = y; v[2] = a; };
  const FRONT = { hug: 1, selfie: 1 };

  function moves(b, s, time, P) {
    const M = MV, act = s.ax > 0.001 ? s.ak : null, st = b.stompT;
    M.up = 0; M.sx = 1; M.sy = 1; M.hug = 0; M.wake = 0; M.slide = 0; M.tuck = 0; M.touch = 0; M.grab = 0; M.dang = 0;
    M.nf = Math.cos(s.ys) >= 0 ? 0 : 1;
    if (act === 'bite') {
      const t = s.at, w = s.ax, k = (n) => key(t, BITE[n]) * w, sk = k('sk') * Math.sin((t - 0.16) * 56);
      P.bx += k('bx'); P.headX += k('hx'); P.headA += k('ha') + 0.09 * sk; P.pitch += k('pt'); P.by += k('by');
      P.ears = lerp(P.ears, 0.75, k('ear')); P.jaw = Math.max(P.jaw, k('jaw')); P.shake += 0.32 * sk;
      P.wide = Math.max(P.wide, k('wd')); P.shut = Math.max(P.shut, k('sh'));
    }
    if (act === 'hug') {
      const t = s.at, w = s.ax, h = s.hk, u = key(t, HUG.up) * w, lk = key(t, HUG.look) * w;
      const f = lerp(key(t, HUG.air), key(t, HUG.face), h) * w, sa = key(t, HUG.stare) * (1 - h) * w;
      const k = t / 1.7, hu = smooth(k / 0.17) * (1 - smooth((k - 0.83) / 0.12)), sk = (k - 0.2) / 0.6;
      const sq = (sk > 0 && sk < 1 ? Math.pow(Math.sin(Math.PI * sk * 3), 2) * hu : 0) * w, r = Math.sin((t - 0.3) * 6.5) * key(t, HUG.rock) * w;
      M.hug = w; M.ht = t; M.hit = h; M.up = u; M.sq = sq; M.lf = (7 * hu + 1.3 * sq) * w * h; M.reach = lerp(14, 34, h);
      const ro = smooth((t - 0.7) / 0.2), lf = M.lf;
      M.grab = w; M.ph = key(t, HUG.arm) * w; M.st = HUG.step;
      put(M.o, lerp(15, 7, ro), lerp(4, -15, ro), lerp(0.4, -1.1, ro));
      put(M.hn, lerp(M.reach + 1, 41.5 - 1.5 * sq, h), lerp(-68, -42 - lf, h), lerp(2.9, 1.8, h));
      put(M.hf, lerp(M.reach + 4, 40 - 1.5 * sq, h), lerp(-62, -47 - lf, h), lerp(2.6, 1.65, h));
      P.pitch = lerp(P.pitch, -1.45 + 0.04 * r + 0.03 * sq, u);
      P.by = lerp(P.by, lerp(-2, 2.5, h), u);
      P.headA = lerp(P.headA, 1.45 + lerp(0.12, 0.42, h) - 0.07 * r + 0.06 * sq, u) - 0.55 * lk;
      P.headX = lerp(P.headX, 1, u); P.headY = lerp(P.headY, -8 * h, u);
      P.ears = lerp(P.ears, 0.1, u);
      P.bx += key(t, HUG.bx) * w * M.reach;
      P.shut = Math.max(P.shut, f, sa * once(t, 1.02, 0.16)); P.arc = lerp(P.arc, 1, f); P.smile = Math.max(P.smile, f);
      P.turn = Math.max(P.turn, sa); P.wide = Math.max(P.wide, 0.5 * sa);
    }
    if (act === 'shake') {
      const t = s.at, w = s.ax, u = key(t, SHAKE.up) * w, g = key(t, SHAKE.grip) * w, an = key(t, SHAKE.mad) * w;
      const sm = key(t, SHAKE.smug) * w, lk = key(t, SHAKE.look) * w, L = clamp(s.alx - 8, 4, 44);
      const sw = s.asw === null ? 12 * Math.sin((t - 0.3) * TAU * 3.2) * smooth((t - 0.3) / 0.3) : s.asw, ps = 0.35 * sw * g;
      M.grab = w; M.ht = t; M.up = u; M.ph = key(t, SHAKE.arm) * w; M.st = SHAKE.step; M.reach = L - 7;
      const ro = smooth((t - 1.45) / 0.12);
      put(M.o, lerp(14, 8, ro), lerp(2, -9, ro), lerp(0.3, -0.7, ro));
      put(M.hn, L - 4 + ps, -60, 0.45);
      put(M.hf, L - 2.5 + ps, -70, 0.3);
      P.pitch = lerp(P.pitch, -1.3 + 0.012 * ps, u);
      P.by = lerp(P.by, 1.5 + 1.2 * Math.abs(Math.sin(time * 20)) * g, u);
      P.bx += key(t, SHAKE.bx) * w * M.reach + 1.2 * ps;
      P.headA = lerp(P.headA, 1.3 - 0.4 * lk + 0.18 * (1 - lk) + 0.012 * ps + 0.04 * Math.sin(time * 37) * g, u);
      P.headX = lerp(P.headX, 1, u); P.headY = lerp(P.headY, -2, u);
      P.ears = lerp(P.ears, 1, an);
      P.shut = Math.max(P.shut, 0.38 * an, 0.55 * sm); P.arc = lerp(P.arc, 1, sm); P.brow = Math.max(P.brow, an);
      P.jaw = Math.max(P.jaw, (0.2 + 0.05 * Math.sin(time * 31)) * an);
      P.smile = Math.max(P.smile, sm); P.grin = Math.max(P.grin, 0.7 * sm);
      P.shake += 0.08 * Math.sin(time * 23) * g;
    }
    if (act === 'selfie') {
      const t = s.at, w = s.ax, u = key(t, SELFIE.up) * w, gr = key(t, SELFIE.grin) * w, gl = key(t, SELFIE.glad) * w;
      M.grab = w; M.ht = t; M.up = u; M.ph = key(t, SELFIE.arm) * w; M.st = SELFIE.step; M.reach = 9; M.dang = 1;
      put(M.o, 10, 8, 0.5);
      put(M.hn, 31 + 0.6 * Math.sin(time * 6), -61 + 0.4 * Math.sin(time * 6 + 1), 0.55);
      P.pitch = lerp(P.pitch, -0.88, u);
      P.by = lerp(P.by, -1, u);
      P.bx += key(t, SELFIE.bx) * w * M.reach;
      P.headA = lerp(P.headA, 0.88 + 0.05 + 0.03 * Math.sin(time * 6), u);
      P.headX = lerp(P.headX, 5.5, u); P.headY = lerp(P.headY, -2.5, u);
      P.ears = lerp(P.ears, 0.1, u);
      P.smile = Math.max(P.smile, gr); P.grin = Math.max(P.grin, gr);
      P.shut = Math.max(P.shut, once(t, 1.14, 0.17) * w, 0.5 * gl); P.arc = lerp(P.arc, 1, gl);
      P.look = [1, lerp(0.15, 0.5, smooth((t - 1.3) / 0.25)) * u];
    }
    if (s.wk > 0.001) {
      const t = s.wt, w = s.wk, k = (n) => key(t, WAKE[n]) * w, sw = k('st'), yw = k('yw'), sk = k('sk'), dz = k('dz');
      const tr = sw * smooth((t - 0.5) / 0.1) * (1 - smooth((t - 0.88) / 0.1)) * Math.sin(time * 33);
      M.wake = w; M.wt = t;
      P.pitch += 0.36 * sw - 0.08 * yw + 0.006 * tr;
      P.by += 1.5 * sw + 0.4 * tr - yw;
      P.flex -= 0.35 * sw;
      P.headA += 0.2 * sw - 1 * yw + 0.16 * dz;
      P.headX += 5 * sw - 1.5 * yw; P.headY += 2 * sw - 1.5 * yw;
      P.ears = lerp(P.ears, 0.6, Math.max(yw, 0.5 * dz));
      P.jaw = Math.max(P.jaw, k('jaw') * (1 + 0.04 * Math.sin(time * 23)));
      P.shake += 0.5 * sk * Math.sin((t - 1.98) * 36);
      P.flick += 0.8 * sk * Math.sin(time * 48);
      P.shut = Math.max(P.shut, k('sh'), w * (once(t, 2.22, 0.14) + once(t, 2.42, 0.13)));
      P.arc = lerp(P.arc, -0.8, k('zz'));
    }
    if (s.sl > 0.001) {
      const w = s.sl, wob = Math.sin(time * 7.7);
      M.slide = w;
      P.pitch += (-0.17 + 0.035 * wob) * w; P.by += 3 * w;
      P.headA -= 0.3 * w; P.headX -= 3 * w; P.headY -= 1.5 * w;
      P.ears = lerp(P.ears, 0.85, w);
      P.wide = Math.max(P.wide, 0.9 * w); P.jaw = Math.max(P.jaw, 0.22 * w);
    }
    if (typeof st === 'number' && st >= 0 && st < 0.9) {
      const sq = smooth(st / 0.02) * (1 - smooth((st - 0.03) / 0.15)), sr = smooth((st - 0.05) / 0.05) * (1 - smooth((st - 0.1) / 0.12));
      const tk = smooth((st - 0.05) / 0.09) * (1 - smooth((st - 0.3) / 0.3)), pl = smooth((st - 0.03) / 0.1) * (1 - smooth((st - 0.55) / 0.25));
      M.touch = 1 - smooth((st - 0.03) / 0.06); M.cy = Math.min(14, 430 * st - 800 * st * st);
      M.tuck = tk; M.sx = (1 + 0.16 * sq) * (1 - 0.04 * sr); M.sy = (1 - 0.22 * sq) * (1 + 0.07 * sr);
      P.by += 9 * sq; P.pitch -= 0.1 * tk;
      P.shut = Math.max(P.shut, pl); P.arc = lerp(P.arc, 1, pl); P.smile = Math.max(P.smile, pl);
      P.ears = lerp(P.ears, 0.15, pl);
    }
    M.any = M.grab > 0 || M.wake > 0 || M.slide > 0 || M.tuck > 0 || M.touch > 0;
    P.split = !!(b.act && FRONT[b.act.kind] && b.act.hit);
    return M;
  }

  function limb(M, e, i, root) {
    const fore = i < 2, far = i % 2 === 1, L = LEG[fore ? 0 : 1];
    if (M.grab > 0) {
      const t = M.ht;
      if (fore) {
        const k = M.ph;
        if (k > 0.001) {
          const n = i === M.nf, o = [root[0] + M.o[0], root[1] + M.o[1], M.o[2]];
          const H = n ? M.hn : M.dang ? [root[0] + 3, root[1] + 25, 1.2] : M.hf;
          const a = k < 1 ? e : o, z = k < 1 ? o : H, f = k < 1 ? k : k - 1;
          e[0] = lerp(a[0], z[0], f); e[1] = lerp(a[1], z[1], f); e[2] = lerp(a[2], z[2], f);
        }
      } else {
        const w = M.st[far ? 1 : 0], k1 = clamp((t - w[0]) / (w[1] - w[0]), 0, 1), k2 = clamp((t - w[2]) / (w[3] - w[2]), 0, 1);
        e[0] += (smooth(k1) - smooth(k2)) * M.reach * M.grab;
        e[1] -= 4 * (Math.sin(Math.PI * k1) + Math.sin(Math.PI * k2)) * M.grab;
      }
    }
    if (M.wake > 0) {
      const k = key(M.wt, WAKE.st) * M.wake;
      e[0] += (fore ? 22 : -3) * k;
      if (fore) { e[1] -= 4 * Math.sin(Math.PI * k); e[2] = lerp(e[2], -0.1, k); }
    }
    if (M.slide > 0) {
      const a = fore ? -0.4 : -0.3, A = fromHeel(L, L.toe + STAND[i] + (fore ? 15 : -11) - L.foot[0] - L.foot[2], 0, a);
      e[0] = lerp(e[0], A[0], M.slide); e[1] = lerp(e[1], A[1], M.slide); e[2] = lerp(e[2], a, M.slide);
    }
    if (M.touch > 0) {
      const A = fromToe(L, root[0] + (fore ? 9 : 7) + (far ? -3 : 1), M.cy, 0);
      e[0] = lerp(e[0], A[0], M.touch); e[1] = lerp(e[1], A[1], M.touch); e[2] = lerp(e[2], 0, M.touch);
    }
    if (M.tuck > 0) {
      const A = fore ? [root[0] + 4 + (far ? -3 : 1), root[1] + 15, 2.2] : [root[0] + 13 + (far ? -3 : 1), root[1] + 14, 0.55];
      e[0] = lerp(e[0], A[0], M.tuck); e[1] = lerp(e[1], A[1], M.tuck); e[2] = lerp(e[2], A[2], M.tuck);
    }
  }

  function airBody(P, fall, w) {
    P.pitch = lerp(P.pitch, lerp(-0.2, 0.14, fall), w);
    P.flex = lerp(P.flex, lerp(-0.8, 0.5, fall), w);
    P.headA = lerp(P.headA, lerp(0.12, -0.04, fall), w);
    P.ears = lerp(P.ears, 0.6, w);
    P.by = lerp(P.by, 0, w);
  }
  function airFoot(i, root, fall) {
    const fore = i < 2, u = fore ? [6, 21, 1.45] : [-20, 38, 0.9], d = fore ? [16, 31, -0.25] : [8, 24, 0.35], ta = lerp(u[2], d[2], fall);
    return fromToe(LEG[fore ? 0 : 1], root[0] + lerp(u[0], d[0], fall) + (i % 2 ? -3 : 2), root[1] + lerp(u[1], d[1], fall), ta).concat(ta);
  }

  function pose(b, s, time, rear) {
    const mw = s.mw, rw = s.rw, cw = s.cw, ph = s.phase;
    const tu = 1 - s.toT / TAKEOFF, keep = 1 - smooth(tu), cr = (Math.sin(Math.PI * tu) * (1 - tu)) / 0.58;
    const lu = 1 - s.landT / LAND, sq = lu < 0.25 ? smooth(lu / 0.25) : 1 - smooth((lu - 0.25) / 0.75);
    const aw = s.aw * (1 - keep), fall = smooth((s.vy + 250) / 500), up = 1 - fall;
    const feet = (g) => [0, 1, 2, 3].map((i) => cycle(frac(ph - g.offs[i]), g, i));
    const fw = feet(WALK), fk = feet(STALK), fr = feet(RUN);
    const gf = Math.cos(TAU * (ph - 0.92)), gp = Math.sin(TAU * (ph + 0.05));
    const I = { by: 0, pitch: 0, hump: 0, roll: 0, croup: 0, hroll: 0, flex: 0, headA: 0.1, headX: 0, headY: 0, ears: 0, swing: 0 };
    const LOW = { by: 15, pitch: 0.02, hump: 0.5, roll: 0, croup: 0, hroll: 0, flex: 0, headA: 0.5, headX: 1, headY: 3, ears: 0.35, swing: 0 };
    const W = amble(WALK, ph, fw, 1), K = amble(STALK, ph, fk, 0.6);
    Object.assign(K, { by: K.by + 11, pitch: K.pitch + 0.05, hump: K.hump * 1.3, headA: K.headA + 0.14, headX: 4, headY: K.headY + 2, ears: 0.35, swing: 0 });
    const R = { by: -1.6 * Math.cos(TAU * (ph - 0.9)) - 0.3, pitch: -0.06 * gp, hump: 1.5 * gf, roll: 0, croup: -0.8 * gf, hroll: 0,
      flex: 1.25 * gf, headA: 0.04 + 0.06 * gp, headX: 3, headY: 2, ears: 1, swing: 0 };
    const P = { keep, yaw: [s.yp, s.ys, s.yh], bx: 0, jaw: 0, shut: 0, arc: 0, smile: 0, wide: 0, shake: 0, brow: 0, grin: 0, tag: s.tg, shx: 0, shw: 1 };
    for (const k in I) P[k] = lerp(lerp(I[k], LOW[k], cw), lerp(lerp(W[k], R[k], rw), K[k], cw), mw);
    const q = (1 - mw) * (1 - cw) * (1 - aw) * (1 - rear) * (1 - s.bz);
    const sn = bump(time, 7.3, 1.5) * q;
    P.headA += -0.3 * sn + 0.03 * Math.sin(time * 40) * sn;
    P.headX += 1.5 * sn;
    P.turn = hold(time, 11.7, 2.4, 0.5, 3.1) * q;
    P.flick = Math.sin(time * 48) * bump(time, 5.3, 0.4, 1.7) * q;
    airBody(P, fall, aw);
    let sx = 1 + 0.05 * aw * up, sy = 1 - 0.03 * aw * up;
    P.by += 8 * cr + 7 * sq; P.flex += 0.6 * cr; P.headA += 0.1 * cr + 0.18 * sq;
    sx *= 1 + 0.05 * cr + 0.07 * sq; sy *= 1 - 0.07 * cr - 0.1 * sq;
    const br = Math.sin(s.breath);
    P.breath = br * lerp(1, 0.4, mw);
    sy *= 1 + 0.012 * br * (1 - mw);
    P.pitch = lerp(P.pitch, -1.0, rear); P.by -= 3 * rear; P.headA += 0.7 * rear; P.ears += 0.3 * rear;
    const M = moves(b, s, time, P);
    P.sway = 0.1 * Math.sin(time * 2.3) + 0.15 * P.swing - 0.8 * P.shake;
    sx *= M.sx; sy *= M.sy;
    P.pivot = [lerp(lerp(-4, -25, rear), -25, M.up), -35.5];
    P.sx = sx; P.sy = sy;
    P.T = bodyTf(P);
    P.shx = P.bx * Math.cos(s.ys); P.shw = 1 - 0.3 * M.up;
    const tg = [];
    for (let i = 0; i < 4; i++) {
      const fore = i < 2, far = i % 2 === 1, k = fore ? 0 : 1, L = LEG[k], root = rootOf(P, i);
      const at = (c, g) => [L.toe + g.shift[k] + c[0], c[1], c[2]];
      const w = at(fw[i], WALK), r = at(fr[i], RUN), c = at(fk[i], STALK);
      const go = [0, 1, 2].map((j) => lerp(lerp(w[j], r[j], rw), c[j], cw));
      const st = fromToe(L, L.toe + lerp(STAND[i], (fore ? 12 : 2) + STAND[i] * 0.5, cw), 0, 0);
      let ex = lerp(st[0], go[0], mw), ey = lerp(st[1], go[1], mw) - 4 * Math.sin(fore ? s.ys : s.yp), ea = go[2] * mw;
      if (aw > 0.001) {
        const A = airFoot(i, root, fall);
        ex = lerp(ex, A[0], aw); ey = lerp(ey, A[1], aw); ea = lerp(ea, A[2], aw);
      }
      if (rear > 0.001 && fore) {
        const A = fromToe(L, root[0] + 6 - (far ? 3 : 0), root[1] + 25, 1.2);
        ex = lerp(ex, A[0], rear); ey = lerp(ey, A[1], rear); ea = lerp(ea, 1.2, rear);
      }
      const e = [ex, ey, ea];
      if (M.any) limb(M, e, i, root);
      tg.push(e);
    }
    settle(P, tg, (1 - aw) * (1 - rear) * (1 - M.up));
    return P;
  }

  const HIP_X = -28, SH_X = 12, MID_X = -8;
  function spine(yaw) {
    const yp = yaw[0], ys = yaw[1], m = (ys - yp) / (SH_X - HIP_X);
    const phi = (x) => (x <= HIP_X ? yp : x >= SH_X ? ys : yp + m * (x - HIP_X));
    const part = (x) => {
      let cx = 0, sz = 0;
      if (x < HIP_X) { cx -= (HIP_X - x) * Math.cos(yp); sz -= (HIP_X - x) * Math.sin(yp); }
      const mid = clamp(x, HIP_X, SH_X);
      if (Math.abs(m) < 1e-6) { cx += (mid - HIP_X) * Math.cos(yp); sz += (mid - HIP_X) * Math.sin(yp); }
      else { const p = phi(mid); cx += (Math.sin(p) - Math.sin(yp)) / m; sz += (Math.cos(yp) - Math.cos(p)) / m; }
      if (x > SH_X) { cx += (x - SH_X) * Math.cos(ys); sz += (x - SH_X) * Math.sin(ys); }
      return [cx, sz];
    };
    const o = part(MID_X);
    const at = (x) => { const p = part(x); return [p[0] - o[0], p[1] - o[1]]; };
    const map = (x, y, xa, z) => { const p = at(xa), f = phi(xa); return [p[0] + (x - xa) * Math.cos(f) - z * Math.sin(f), y]; };
    return { phi, at, map };
  }

  function drawLeg(ctx, l, K, sp) {
    const g = l.g, R = LEG[g.fore ? 0 : 1].r, n = l.near, M = (x, y) => sp.map(x, y, l.xa, l.z);
    const r0 = M(g.root[0], g.root[1]), j = M(g.jx, g.jy), e = M(g.ex, g.ey);
    ctx.fillStyle = tint(K, 'far', 'fur', n);
    seg(ctx, r0[0], r0[1], R[0], j[0], j[1], R[1]);
    ctx.fillStyle = tint(K, 'far', 'leg', n);
    seg(ctx, j[0], j[1], R[2], e[0], e[1], R[3]);
    ctx.save();
    ctx.transform(Math.cos(l.f), 0, 0, 1, e[0], e[1]);
    ctx.rotate(g.a);
    const cl = tint(K, 'clawFar', 'claw', n);
    if (g.fore) {
      ctx.scale(1 - 0.14 * (1 - smooth(Math.abs(g.a) / 0.6)), 1);
      blob(ctx, [[-4.5, -2.2], [1.5, -3], [6, 0.4], [6.6, 3.5], [1, 4.2], [-4.6, 3]]); ctx.fill();
      ctx.fillStyle = K.pad; blob(ctx, [[-4, 2.4], [1, 3.1], [6.1, 2.8], [6.2, 3.8], [1, 4.3], [-4.3, 3.3]]); ctx.fill();
      claws(ctx, [[5.4, 1.2, 8.6, 2.7], [5.8, 2.6, 9, 4], [5.2, 3.7, 8.2, 4.6]], cl, 1);
    } else {
      blob(ctx, [[-5.5, -3], [2, -3.6], [9, -0.6], [12.6, 2.6], [11.6, 4.5], [-3, 4.6], [-6.6, 1.4]]); ctx.fill();
      ctx.fillStyle = K.pad; blob(ctx, [[-6.2, 1.8], [2, 3.4], [11.6, 3.2], [11.8, 4.5], [-3, 4.7], [-6.4, 2.8]]); ctx.fill();
      claws(ctx, [[11.2, 2.2, 13.8, 3.5], [11, 3.6, 13.6, 4.6]], cl, 0.9);
    }
    ctx.restore();
  }

  function drawBody(ctx, P, K, sp) {
    const T = P.T, f = P.flex, h = P.hump, br = P.breath, rl = P.roll, cp = P.croup, hr = P.hroll;
    const M = (x, y) => { const q = T(x, y); return sp.map(q[0], q[1], q[0], 0); };
    const pts = [
      [-32.5 + 3 * f + hr, -50 - 1.5 * f - cp], [-18 + 2 * f + 0.5 * hr, -51.5 - 2.5 * f - 0.6 * cp],
      [-4 + 0.5 * f, -53.5 - 2 * f - 0.3 * h], [11 - f + rl, -59 - h], [23 - 2 * f + 0.5 * rl, -54 - 0.6 * h],
      [31 - 3 * f, -46], [35 - 3 * f, -33], [29 - 3 * f, -24 + 0.3 * br], [19 - 2.5 * f, -20 + 0.5 * br],
      [11 - 1.5 * f, -18.6 + br], [4, -20.6 + br], [-3 + f, -18.8 + br], [-10 + 1.5 * f, -20.4 + br],
      [-18 + 2 * f, -22.5 + 0.5 * br], [-28.5 + 3 * f + 0.5 * hr, -27], [-38 + 3.5 * f + hr, -35 - 0.4 * cp],
      [-39.2 + 3.5 * f + hr, -44.5 - 0.6 * cp],
    ].map((p) => M(p[0], p[1]));
    const cos = (x, y) => Math.cos(sp.phi(T(x, y)[0]));
    const ta = M(-40 + 3.5 * f + hr, -41 - 0.5 * cp), tc = cos(-40, -41);
    ctx.fillStyle = K.tail; ell(ctx, ta[0] - 0.8 * tc, ta[1], 3.3 * Math.max(0.5, Math.abs(tc)), 2.5, (P.pitch - 0.35) * Math.sign(tc || 1));
    ctx.fillStyle = K.fur; blob(ctx, pts); ctx.fill();
    for (const [x, y, rx, ry] of [[10, -38, 16, 18], [-28, -37, 14, 15]]) {
      const q = T(x, y), w = Math.abs(Math.sin(sp.phi(q[0])));
      if (w > 0.02) { const m = sp.map(q[0], q[1], q[0], 0); ell(ctx, m[0], m[1], rx * w, ry); }
    }
    ctx.save(); blob(ctx, pts); ctx.clip();
    for (const [x, y, rx, ry, rot, col] of [[-3, -16, 46, 8.5, 0, C.shade], [4, -55.5, 30, 5.5, -0.05, C.light],
      [-33, -38, 7, 14, 0.2, C.soft], [5, -37, 5, 13, 0.3, C.soft]]) {
      const m = M(x, y), c = cos(x, y);
      ctx.fillStyle = col; ell(ctx, m[0], m[1], rx * Math.max(0.35, Math.abs(c)), ry, (P.pitch + rot) * Math.sign(c || 1));
    }
    ctx.restore();
  }

  function head(ctx, o, K) {
    const yaw = o.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw), t = o.tilt || 0, ct = Math.cos(t), st = Math.sin(t);
    const eb = clamp(o.ears || 0, 0, 1), fl = o.flick || 0, ga = ctx.globalAlpha, jw = o.jaw || 0, sm = o.smile || 0;
    const pt = (x, y, z) => { const xr = x * ct - y * st, yr = x * st + y * ct; return [xr * cy - z * sy, yr, xr * sy + z * cy]; };
    const solid = (x, y, a, w, h) => { const p = pt(x, y, 0); ell(ctx, p[0], p[1], Math.hypot(a * cy, w * sy), h, t * cy); };
    const ears = [-1, 1].map((z) => {
      const p = pt(-2.5 - 3 * eb, -11.6 + 2.3 * eb, 6.5 * z);
      return { p, near: smooth(0.5 + p[2] / 6) };
    });
    const drawEar = (e) => {
      const r = 4.2, flat = 1 - 0.45 * eb, rot = (-0.6 * eb + 0.5 * fl * e.near) * (cy < 0 ? -1 : 1);
      ear(ctx, e.p[0], e.p[1], r, tint(K, 'far', 'fur', e.near), e.near > 0.5 ? K.ear : false, rot, flat);
      if (o.tag > 0.01 && e.near >= 0.5) tag(ctx, e.p[0] + (cy < 0 ? -1.2 : 1.2), e.p[1] + 2.3 * flat, o.tag, o.sway || 0, K);
    };
    for (const e of ears) if (e.near < 0.5) drawEar(e);
    let J = null;
    if (jw > 0.001) {
      const a = jw * 0.85, ca = Math.cos(a), sa = Math.sin(a), hx = HINGE[0], hy = HINGE[1];
      J = { a, p: (x, y, z) => pt(hx + (x - hx) * ca - (y - hy) * sa, hy + (x - hx) * sa + (y - hy) * ca, z) };
      mouth(ctx, pt, J, K, cy, sy, t);
      chin(ctx, J, jw, K, cy, sy, t);
    }
    ctx.fillStyle = K.fur;
    solid(-1.5, -2.5, 10.5, 8.5, 9.5);
    solid(5, 3.5, 8.5, 7.5, 5.5);
    ctx.fillStyle = K.muzzle;
    if (!J) solid(16, 4, 6, 4.5, 3);
    else if (jw < 0.25) {
      const c = J.p(16, 4, 0);
      ctx.globalAlpha = ga * (1 - smooth(jw / 0.25));
      ell(ctx, c[0], c[1], Math.hypot(6 * cy, 4.5 * sy), 3, (t + J.a) * cy);
      ctx.globalAlpha = ga;
    }
    const s0 = pt(11.5, -1.5, 0), s1 = pt(25.8, -0.8, 0), n = pt(27.4, -1.4, 0);
    seg(ctx, s0[0], s0[1], 5.4, s1[0], s1[1], 4);
    if (J) fangs(ctx, pt, jw, K);
    const gr = o.grin > 0.01 ? smooth(o.grin) * (J ? 1 - smooth(jw / 0.15) : 1) : 0;
    if (gr > 0.01) grin(ctx, pt, gr, ga * Math.abs(cy), K);
    ctx.fillStyle = K.dark;
    ell(ctx, n[0], n[1], 2.7 + 0.9 * Math.abs(sy), 2.3 + 0.2 * Math.abs(sy));
    const m0 = pt(25, 2.6, 0), mc = pt(20.5, 4.6 + 0.9 * sm, 0), m1 = pt(15.8 - 0.6 * sm, 4.2 - 1.7 * sm, 0);
    ctx.globalAlpha = ga * Math.abs(cy) * (J ? 1 - smooth(jw / 0.12) : 1) * (gr ? 1 - smooth(gr / 0.3) : 1);
    ctx.strokeStyle = 'rgba(29,18,9,0.55)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(mc[0], mc[1], m1[0], m1[1]); ctx.stroke();
    const lk = o.look || [1, 0], look = [lk[0] * cy, lk[1]];
    let front = null;
    for (const z of [-4.4, 4.4]) {
      const e = pt(8.4, -5.4, z), a = smooth((e[2] - 0.5) / 2.5);
      if (a <= 0) continue;
      ctx.globalAlpha = ga * a;
      if (o.shut > 0.001) lid(ctx, pt, z, e, o, look, K); else eye(ctx, e[0], e[1], o.wide || 0, look, K);
      if (o.brow > 0.01) {
        const b0 = pt(6, -8.9, z), b1 = pt(10.9, -6.9, z);
        ctx.globalAlpha = ga * a * smooth(o.brow);
        ctx.strokeStyle = K.dark; ctx.lineWidth = 1.25; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
      }
      if (!front || e[2] > front.d) front = { z, d: e[2] };
    }
    ctx.globalAlpha = ga;
    if (o.cry && o.cry[1] > 0.01 && front) {
      const p = pt(lerp(9.6, 13.5, o.cry[0]), lerp(-3.2, 3.6, o.cry[0]), front.z);
      drop(ctx, p[0], p[1], o.cry[1]);
    }
    for (const e of ears) if (e.near >= 0.5) drawEar(e);
    return n;
  }

  const HINGE = [10, 2.8];
  const MOUTH = [[12, 3, 0], [26, 2.5, 0], [25.2, 2.3, 1], [12, 2.6, 1]];
  const JAW = [[12, 2.2], [24.8, 2.1], [26, 2.8, 0.6], [24.6, 3.15, 1.6], [22, 3.3, 1.8], [18, 4.2, 0.8], [12, 4.2]];

  function hull(ctx, p) {
    p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), h = [];
    for (const q of p) { while (h.length >= 2 && cr(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); }
    const lo = h.length + 1;
    for (let i = p.length - 2; i >= 0; i--) { while (h.length >= lo && cr(h[h.length - 2], h[h.length - 1], p[i]) <= 0) h.pop(); h.push(p[i]); }
    h.pop();
    ctx.beginPath();
    h.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
  }

  function tooth(ctx, a, b, c) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
  }

  function mouth(ctx, pt, J, K, cy, sy, t) {
    const p = [];
    for (const [x, y, j] of MOUTH) for (const z of [-2.6, 2.6]) p.push((j ? J.p : pt)(x, y, z));
    hull(ctx, p);
    ctx.fillStyle = K.throat; ctx.fill();
    ctx.save();
    ctx.clip();
    const c = J.p(18.5, 0.9, 0), d = J.p(20.2, 0.3, 0);
    ctx.fillStyle = K.tongue; ell(ctx, c[0], c[1], Math.hypot(5.2 * cy, 2.4 * sy), 1.8, (t + J.a) * cy);
    ctx.fillStyle = 'rgba(255,214,206,0.35)'; ell(ctx, d[0], d[1], Math.hypot(2 * cy, 1 * sy), 0.6, (t + J.a) * cy);
    ctx.restore();
  }

  function strip(ctx, f, x0, x1, y, h) {
    const a = f(x0, y, 0), b = f(x1, y, 0), c = f(x1, y + h, 0), d = f(x0, y + h, 0);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
  }

  function chin(ctx, J, jw, K, cy, sy, t) {
    const c = J.p(16, 4, 0), k = smooth(jw / 0.35), g = smooth(jw / 0.4);
    ctx.fillStyle = K.muzzle;
    ell(ctx, c[0], c[1], Math.hypot(6 * cy, 4.5 * sy), 3, (t + J.a) * cy);
    ctx.beginPath();
    JAW.forEach(([x, y, d], i) => { const p = J.p(x, y + (d || 0) * g, 0); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath(); ctx.fill();
    if (k < 0.02) return;
    ctx.fillStyle = K.eye;
    for (const z of [-1.9, 1.9]) tooth(ctx, J.p(21.4, 2.3, z), J.p(22.9, 2.2, z), J.p(22.3, 2.2 - 2.5 * k, z));
    strip(ctx, J.p, 23.8, 25.4, 2.25, -1.1 * k);
  }

  function fangs(ctx, pt, jw, K) {
    const k = smooth(jw / 0.3);
    if (k < 0.02) return;
    ctx.fillStyle = K.eye;
    for (const z of [-1.9, 1.9]) tooth(ctx, pt(22.3, 3.15, z), pt(23.9, 3.05, z), pt(23.1, 3 + 3 * k, z));
    strip(ctx, pt, 24.4, 26.1, 2.85, 1.2 * k);
  }

  function grin(ctx, pt, g, a, K) {
    const u0 = pt(25.3, 2.4, 0), uc = pt(20, 3.1, 0), c = pt(14.3, 1.5 - 0.7 * g, 0), lc = pt(19.3, 4.4 + 2 * g, 0), l0 = pt(24.8, 2.8 + 1.1 * g, 0);
    const m0 = pt(25, 2.65 + 0.5 * g, 0), mm = pt(19.6, 3.6 + 0.9 * g, 0), m1 = pt(15, 2 - 0.4 * g, 0), ga = ctx.globalAlpha;
    ctx.globalAlpha = a * smooth(g / 0.35);
    ctx.fillStyle = K.eye;
    ctx.beginPath(); ctx.moveTo(u0[0], u0[1]); ctx.quadraticCurveTo(uc[0], uc[1], c[0], c[1]); ctx.quadraticCurveTo(lc[0], lc[1], l0[0], l0[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(29,18,9,0.75)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(mm[0], mm[1], m1[0], m1[1]); ctx.stroke();
    ctx.globalAlpha = ga;
  }

  function lid(ctx, pt, z, e, o, look, K) {
    const sh = clamp(o.shut, 0, 1), arc = o.arc || 0;
    if (sh < 0.97) {
      ctx.save(); ctx.translate(0, e[1]); ctx.scale(1, 1 - sh); ctx.translate(0, -e[1]);
      eye(ctx, e[0], e[1], o.wide || 0, look, K);
      ctx.restore();
    }
    const k = smooth((sh - 0.4) / 0.5);
    if (k <= 0.01) return;
    const ga = ctx.globalAlpha, p0 = pt(6.1, -5.1 + 0.9 * arc, z), p1 = pt(8.4, -5.3 - 2.4 * arc, z), p2 = pt(10.7, -5.1 + 0.9 * arc, z);
    ctx.globalAlpha = ga * k;
    ctx.strokeStyle = K.dark; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke();
    ctx.globalAlpha = ga;
  }

  function tag(ctx, x, y, k, sw, K) {
    const s = smooth(k);
    if (s < 0.05) return;
    const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0, c: 0, d: 1 };
    let r = Math.atan2(m.c, m.a);
    if (m.d * Math.cos(r) - m.b * Math.sin(r) < 0) r += Math.PI;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(r + sw);
    ctx.scale(m.a * m.d - m.b * m.c < 0 ? -s : s, s);
    ctx.fillStyle = K.tagEdge; rrect(ctx, -2, 0.2, 4, 5, 1.1);
    ctx.fillStyle = K.tag; rrect(ctx, -1.65, 0.5, 3.3, 4.4, 0.9);
    ctx.fillStyle = K.dark; ctx.font = '700 2.6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('13', 0, 2.8);
    ctx.fillStyle = K.tagEdge; ell(ctx, 0, 0.35, 0.75, 0.75);
    ctx.restore();
  }

  function eye(ctx, x, y, w, lk, K) {
    const r = 1.45, px = x + lk[0] * 0.9 * w, py = y + lk[1] * 0.8 * w;
    if (w > 0.01) { ctx.fillStyle = K.eye; ell(ctx, x, y, r + 1.1 * w, r * 0.95 + 0.9 * w); }
    ctx.fillStyle = K.dark; ell(ctx, px, py, r - 0.2 * w, r - 0.2 * w);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.35 * w).toFixed(2) + ')'; ell(ctx, px + 0.45, py - 0.5, 0.42, 0.42);
  }

  function drop(ctx, x, y, a) {
    ctx.fillStyle = 'rgba(178,222,246,' + (0.85 * a).toFixed(3) + ')';
    ctx.beginPath(); ctx.moveTo(x, y - 2.1);
    ctx.quadraticCurveTo(x + 1.3, y - 0.1, x, y + 0.9); ctx.quadraticCurveTo(x - 1.3, y - 0.1, x, y - 2.1);
    ctx.fill();
  }

  function drawSide(ctx, P, K, part) {
    const sp = spine(P.yaw);
    const legs = P.legs.map((g) => {
      const xa = g.root[0], z = g.far ? -5 : 5, f = sp.phi(xa);
      return { g, xa, z, f, near: smooth(0.5 + (z * Math.cos(f)) / 8) };
    }).sort((a, b) => a.near - b.near);
    const arm = part && P.split ? legs.find((l) => l.g.fore && l.near >= 0.5) : null;
    if (part === 2) { if (arm) drawLeg(ctx, arm, K, sp); return; }
    for (const l of legs) if (l.near < 0.5) drawLeg(ctx, l, K, sp);
    drawBody(ctx, P, K, sp);
    const hp = P.T(27 - 3 * P.flex, -41), hm = sp.map(hp[0], hp[1], hp[0], 0), tilt = P.pitch + P.headA;
    const yaw = P.yaw[2] + Math.cos(P.yaw[2]) * (0.3 + 0.6 * (P.turn || 0) + 0.12 * (P.swing || 0) + (P.shake || 0));
    const drawHead = () => {
      const hx = hm[0] + (P.headX + 7 * Math.cos(tilt) - 2 * Math.sin(tilt)) * Math.cos(yaw), hy = hm[1] + P.headY + 7 * Math.sin(tilt) + 2 * Math.cos(tilt);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(0.96, 0.96);
      const n = head(ctx, { yaw, tilt, ears: P.ears, flick: P.flick, wide: P.wide, look: P.look, cry: P.cry,
        jaw: P.jaw, shut: P.shut, arc: P.arc, smile: P.smile, brow: P.brow, grin: P.grin, tag: P.tag, sway: P.sway }, K);
      ctx.restore();
      P.nose = [hx + 0.96 * n[0], hy + 0.96 * n[1]];
    };
    const facing = Math.sin(P.yaw[2]) > 0.5;
    if (!facing) drawHead();
    for (const l of legs) if (l.near >= 0.5 && l !== arm) drawLeg(ctx, l, K, sp);
    if (facing) drawHead();
  }

  function side(ctx, b, s, time, o) {
    const part = o.part || 0;
    const P = part === 2 && s.P && s.Pt === time ? s.P : pose(b, s, time, o.rear);
    if (part === 1) { s.P = P; s.Pt = time; }
    const y = b.y + (s.groundY - b.y) * P.keep;
    if (part !== 2) {
      const fy = s.shY, sk = clamp(1 - Math.max(0, fy - y) / 220, 0.35, 1) * o.scale;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.12 * sk).toFixed(3) + ')';
      ell(ctx, b.x + P.shx, fy + 1, 40 * sk * P.shw, 4.5 * sk);
    }
    ctx.save();
    ctx.translate(b.x, y);
    ctx.scale(o.squeeze * o.scale, o.scale);
    drawSide(ctx, P, o.pal, part);
    ctx.restore();
    if (part !== 1) return;
    if (s.due && s.cold > 0.04 && P.nose) {
      const i = s.vn % 4, p = s.puffs[i] || (s.puffs[i] = { x: 0, y: 0, t: 0, d: 1, n: 0, k: 1, v: 0, m: 0 });
      p.x = b.x + P.nose[0] * o.squeeze * o.scale; p.y = y + P.nose[1] * o.scale; p.t = time;
      p.d = Math.cos(P.yaw[2]) < 0 ? -1 : 1; p.n = s.vn++; p.k = s.due; p.v = s.vx; p.m = s.mw > 0.3 ? 1 : 0;
    }
    s.due = 0;
  }

  const PUFF = 1.3;
  function puffs(ctx, s, time, m) {
    if (s.cold <= 0.01) return;
    for (const p of s.puffs) {
      const life = PUFF * (p.k > 1 ? 1.5 : 1), age = time - p.t;
      if (p.m !== m || !(age >= 0 && age < life)) continue;
      const u = age / life, h = frac(Math.sin(p.n * 78.233) * 43758.5453), g = p.k > 1 ? 1.9 : 1;
      const a = s.cold * (0.45 + 0.15 * s.cold) * smooth(age / 0.07) * (1 - u) * (1 - u);
      if (a < 0.004) continue;
      const out = (7 + 3 * h) * g * (1 - Math.exp(-age * 6)) - 6 * age;
      const x = p.x + p.d * out + p.v * 0.22 * (1 - Math.exp(-age / 0.22)), yy = p.y - (8 + 3 * h) * age - 3 * u * g;
      const r = (1.6 + 5.5 * Math.sqrt(u)) * g * (0.8 + 0.3 * s.cold);
      ctx.fillStyle = 'rgba(236,243,250,' + a.toFixed(3) + ')';
      ell(ctx, x, yy, r, r * 0.8);
      ell(ctx, x + p.d * r * 0.7, yy + r * 0.25, r * 0.7, r * 0.6);
      ell(ctx, x - p.d * r * 0.5, yy - r * 0.35, r * 0.6, r * 0.5);
    }
  }

  let layer = null;
  function faded(ctx, x0, y0, x1, y1, draw) {
    const a = ctx.globalAlpha;
    if (a <= 0) return;
    if (a >= 0.999 || !ctx.canvas || typeof ctx.getTransform !== 'function' || typeof document === 'undefined') { draw(ctx); return; }
    const cv = ctx.canvas, m = ctx.getTransform(), xs = [], ys = [];
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
    const dx = Math.max(0, Math.floor(Math.min(...xs))), dy = Math.max(0, Math.floor(Math.min(...ys)));
    const dw = Math.min(cv.width, Math.ceil(Math.max(...xs))) - dx, dh = Math.min(cv.height, Math.ceil(Math.max(...ys))) - dy;
    if (dw <= 0 || dh <= 0) return;
    if (!layer) layer = document.createElement('canvas');
    if (layer.width !== cv.width || layer.height !== cv.height) { layer.width = cv.width; layer.height = cv.height; }
    const o = layer.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(dx, dy, dw, dh);
    o.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); o.globalAlpha = 1;
    draw(o);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    ctx.drawImage(layer, dx, dy, dw, dh, dx, dy, dw, dh);
    ctx.restore();
  }

  function sideBear(ctx, b, s, time, part) {
    const d = s.dropT > 0 ? smooth(s.dropT / DROP) : 0, hid = s.from === 'hide' ? d : 0;
    const lo = Math.min(b.y, s.groundY), hi = Math.max(b.y, s.groundY);
    faded(ctx, b.x - 140, lo - 170, b.x + 140, hi + 20,
      (c) => side(c, b, s, time, { rear: d, squeeze: 1, scale: lerp(1, 0.85, hid), pal: mixPal(hid), part }));
  }

  ZS.drawBear = function (ctx, b, time) {
    const s = track(b, time);
    if (!b.hiding && !b.climbing) enter(s, 'side');
    puffs(ctx, s, time, 1);
    sideBear(ctx, b, s, time, 1);
    puffs(ctx, s, time, 0);
  };

  ZS.drawBearHugFront = function (ctx, b, time) {
    const a = b.act;
    if (!a || !FRONT[a.kind] || !a.hit || b.hiding || b.climbing) return;
    sideBear(ctx, b, track(b, time), time, 2);
  };

  const CLIMB = { stride: 40, duty: 0.62, lift: [6, 5], offs: [0, 0.5, 0.3, 0.8], toe: [28, -24], kick: [0, 0], reach: [2, 1] };

  function climbPose(b, s, time, e, th) {
    const m = smooth(s.cspd / 40), ph = frac((GY - b.y) / CLIMB.stride), f = s.fear * e, cv = s.cov * e;
    const gp = Math.sin(TAU * ph) * m;
    const P = { pivot: [-4, -35.5], sx: 1, sy: 1, hump: 0, roll: 0, croup: 0, hroll: 0, swing: 0, turn: 0.7 * cv,
      flick: 0, keep: 0, headX: 0, headY: 0, yaw: [0, 0, 0], tag: s.tg, sway: 0.1 * Math.sin(time * 2.3) };
    P.by = (8 + 3 * cv) * e;
    P.pitch = 0.015 * Math.sin(time * 1.3) * (1 - m);
    P.flex = 0.35 * gp * e;
    P.breath = Math.sin(time * 2.4) * 0.8;
    P.headA = lerp(0.1, 0.32 - 0.05 * gp + cv * (0.6 + 0.08 * Math.sin(time * 2.7)), e);
    P.ears = Math.max(0.25 * m * e, 0.5 * cv, f);
    P.wide = Math.max(f, 0.6 * cv);
    const w = s.ga * (1 - e);
    if (w > 0) airBody(P, s.gf, w);
    const phi = th + P.pitch + P.headA;
    P.look = [lerp(1, Math.sin(phi), cv), lerp(0, Math.cos(phi), cv)];
    P.cry = tear(time, f);
    P.T = bodyTf(P);
    const tg = [];
    for (let i = 0; i < 4; i++) {
      const fore = i < 2, far = i % 2 === 1, L = LEG[fore ? 0 : 1], k = fore ? 0 : 1;
      const c = cycle(frac(ph - CLIMB.offs[i]), CLIMB, i);
      const still = (far ? 3 : -3) * (fore ? 1 : -1) + Math.sin(time * 1.1 + i * 1.7) * 0.7 * (1 - m);
      const base = CLIMB.toe[k] + (fore ? -3 : 3) * cv, grip = fore ? 0.25 : 0.12;
      const hold = fromToe(L, base + still, 0, grip);
      let stand = fromToe(L, L.toe + STAND[i], 0, 0).concat(0);
      if (s.ga) { const A = airFoot(i, rootOf(P, i), s.gf); stand = stand.map((v, j) => lerp(v, A[j], s.ga)); }
      const cx = lerp(hold[0], base + c[0], m), cy = lerp(hold[1], c[1], m) + (far ? 3 : 0), ca = lerp(grip, c[2], m);
      tg.push([lerp(stand[0], cx, e), lerp(stand[1], cy, e), lerp(stand[2], ca, e)]);
    }
    settle(P, tg, 1 - w);
    return P;
  }

  ZS.drawBearClimbing = function (ctx, b, time) {
    const t = b.climbing;
    if (!t) return;
    const s = track(b, time);
    enter(s, 'climb');
    const e = b.climbT == null ? 1 : smooth(b.climbT / 0.3), f = Math.abs(s.face) < 0.02 ? b.dir || 1 : s.face;
    const th = (-Math.PI / 2) * e + 0.02 * Math.sin(time * 1.3) * (1 - smooth(s.cspd / 40)) * e;
    const P = climbPose(b, s, time, e, th);
    const hx = lerp(b.x - 36 * f, t.x - f * t.w * 0.3, e) + s.fear * e * 0.6 * Math.sin(time * 47);
    faded(ctx, t.x - 170, b.y - 175, t.x + 170, b.y + 60, (c) => {
      c.save();
      c.translate(hx, b.y);
      c.scale(Math.sign(f) * (0.2 + 0.8 * Math.abs(f)), 1);
      c.rotate(th);
      c.translate(36, 0);
      drawSide(c, P, C);
      c.restore();
    });
  };

  function edgeX(t, sd, y) {
    const half = t.w / 2, top = t.h ? (t.kind === 'smrek' ? GY - t.h * 0.42 : GY - t.h) : GY - 250;
    const x = y > GY - 16 ? half + (7 * (y - GY + 16)) / 16 : half - (2 * (GY - 16 - y)) / Math.max(1, GY - 16 - top);
    return t.x + sd * x;
  }

  function peekAmt(t, f) {
    const u = frac(t / 5.6) * 5.6;
    const p = u < 1.9 ? 0 : u < 3.3 ? smooth((u - 1.9) / 1.4) : u < 4.7 ? 1 : 1 - smooth((u - 4.7) / 0.9);
    return p * (1 - 0.08 * f * (0.5 + 0.5 * Math.sin(t * 5.3)));
  }

  function hideState(b, s, time) {
    const ht = b.hideT || 0, f = s.fear, pose = b.pose;
    const sway = pose === 'sweat' ? Math.sin(ht * 2.1) * 2 + Math.sin(ht * 3.4 + 1) * 0.6 : 0;
    const sd = s.side < 0 ? -1 : 1, peek = pose === 'peek' ? peekAmt(ht, f) * smooth(Math.abs(s.side)) : 0;
    const shake = f * (Math.sin(time * 47) * 0.45 + Math.sin(time * 29 + 1) * 0.3);
    return { t: b.hiding, h: b.hiding.w / 2, ht, f, pose, sd, side: s.side, peek, br: Math.sin(ht * (pose === 'stiff' ? 1.3 : 2)),
      dx: shake + sway + sd * peek * 1.4, tilt: pose === 'sweat' ? Math.sin(ht * 2.1) * 1.2 : 0, tag: s.tg };
  }

  function upright(ctx, b, s, time, u) {
    const Q = hideState(b, s, time), h = Q.h, K = HID, tl = Q.tilt;
    const sh = 1.3 - (Q.pose === 'stiff' ? 0.7 : 0) + Q.br * 0.35 + (Q.pose === 'hug' ? 0.4 : 0);
    ctx.save();
    ctx.translate(lerp(b.x, Q.t.x, smooth(u * 2)) + Q.dx, GY);
    ctx.scale(lerp(0.6, 1, smooth(u)), lerp(0.94, 1, smooth(u)));
    const R = [[h - 6, -93], [h + sh, -85], [h + sh - 0.6, -77], [h - 1.5, -66], [h - 2.5, -50], [h - 4, -33], [h - 6, -16], [h - 5, -2]];
    const pts = [[0, -95.5]].concat(R.map(([x, y]) => [x, y < -70 ? y - tl : y]), [[0, -1]],
      R.slice().reverse().map(([x, y]) => [-x, y < -70 ? y + tl : y]));
    ctx.fillStyle = K.fur; blob(ctx, pts); ctx.fill();
    ctx.fillStyle = K.fur;
    if (Q.pose === 'hug') {
      for (const σ of [-1, 1]) seg(ctx, σ * (h - 5), -82, 5, σ * (h - 0.6), σ < 0 ? -74 : -70, 3.8);
    } else if (Q.pose === 'peek') {
      for (const σ of [-1, 1]) {
        const g = smooth(σ * Q.side);
        if (g > 0.01) seg(ctx, σ * (h - 5), lerp(-70, -91, g), 5, σ * (h - 6 + 6.2 * g), lerp(-64, -86, g), 4.2);
      }
    }
    ell(ctx, 0, -101, Math.min(15, h - 6), 13.5);
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * (1 - smooth(Q.peek / 0.25));
    for (const σ of [-1, 1]) {
      const tw = Q.pose === 'sweat' ? Math.pow(Math.max(0, Math.sin(Q.ht * 1.9 + σ * 1.3)), 18) * Math.sin(Q.ht * 38) : 0;
      const x = h - 2.6 - 3 * Q.f + 0.8 * tw, y = -112 + 3 * Q.f + 0.3 * Math.max(0, Q.br) - σ * tl * 0.5;
      ear(ctx, σ * x, y, 4.4, K.fur, K.ear, σ * (0.35 * tw + 0.5 * Q.f), 1 - 0.4 * Q.f);
      if (σ === Q.sd && Q.tag > 0.01) tag(ctx, σ * (x + 3.3), y + 2.2, Q.tag, σ * (0.25 + 0.35 * tw) + 0.06 * Math.sin(time * 2.3), K);
    }
    ctx.globalAlpha = ga;
    ctx.restore();
  }

  function peekHead(ctx, time, Q, K) {
    const sd = Q.sd, y = GY - 101 + Math.sin(time * 1.7) * 0.5, edge = edgeX(Q.t, sd, y);
    ctx.save();
    ctx.beginPath(); ctx.rect(sd > 0 ? edge - 1.2 : edge + 1.2 - 300, GY - 300, 300, 300); ctx.clip();
    ctx.translate(edge + sd * lerp(-26, lerp(-3, -5.2, Q.f), Q.peek) + Q.dx * 0.4, y);
    ctx.scale(sd * 0.85, 0.85);
    head(ctx, { yaw: 0.15, tilt: -0.1 * Q.peek + 0.03 * Math.sin(time * 1.7), ears: 0.3 + 0.7 * Q.f,
      wide: 0.4 + 0.6 * Q.f, look: [1, 0.15], cry: tear(time, Q.f), tag: Q.tag, sway: 0.1 * Math.sin(time * 2.3) }, K);
    ctx.restore();
  }

  ZS.drawBearBehindTree = function (ctx, b, time) {
    if (!b.hiding) return;
    const s = track(b, time);
    enter(s, 'hide');
    const k = b.hideT == null ? 1 : clamp(b.hideT / RISE, 0, 1), x = b.hiding.x;
    faded(ctx, Math.min(x, b.x) - 150, GY - 190, Math.max(x, b.x) + 150, GY + 20, (c) => {
      if (k < SPLIT) {
        const r = smooth(k / SPLIT);
        side(c, b, s, time, { rear: r, squeeze: 1 - 0.4 * smooth((k - 0.2) / (SPLIT - 0.2)), scale: lerp(1, 0.88, r), pal: mixPal(0.8 * r) });
      } else upright(c, b, s, time, (k - SPLIT) / (1 - SPLIT));
    });
  };

  ZS.drawBearInFront = function (ctx, b, time) {
    if (!b.hiding) return;
    const s = track(b, time);
    const a = b.hideT == null ? 1 : smooth((b.hideT / RISE - 0.75) / 0.25);
    if (a <= 0) return;
    const Q = hideState(b, s, time), t = Q.t, K = HID;
    ctx.save();
    ctx.globalAlpha *= a;
    faded(ctx, t.x - 150, GY - 190, t.x + 150, GY + 10, (c) => {
      if (Q.pose === 'hug') {
        for (const σ of [-1, 1]) {
          const y = GY - (σ < 0 ? 74 : 70) + Q.br * 0.4, ex = edgeX(t, σ, y) + Q.dx * 0.3;
          c.fillStyle = K.fur;
          seg(c, ex + σ * 0.4, y - 1.5, 3.8, ex - σ * 3.2, y, 4.6);
          ell(c, ex - σ * 4.2, y + 0.3, 4.6, 5.2);
          claws(c, [0, 1, 2, 3].map((i) => [ex - σ * 7.4, y - 3.1 + i * 2.1, ex - σ * 9.6, y - 2.6 + i * 2.1]), K.claw, 1);
        }
        return;
      }
      for (const σ of [-1, 1]) {
        const y = GY - (Q.pose === 'peek' ? lerp(64, 86, smooth(σ * Q.side)) : 64) + Q.br * 0.3 - σ * Q.tilt;
        const ex = edgeX(t, σ, y);
        claws(c, [0, 1, 2].map((i) => [ex + σ * 0.6, y + i * 2.2, ex - σ * 1.6, y + i * 2.2 + 0.7]), K.claw, 1.1);
      }
      if (Q.pose === 'peek' && Q.peek > 0.005) peekHead(c, time, Q, K);
    });
    ctx.restore();
  };
})();
