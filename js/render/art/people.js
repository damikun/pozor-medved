(function () {
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, hypot = Math.hypot, atan2 = Math.atan2, sqrt = Math.sqrt;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const frac = (v) => v - Math.floor(v);
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const bump = (k, a, b) => (k <= a || k >= b ? 0 : Math.pow(sin((PI * (k - a)) / (b - a)), 2));
  const plateau = (k, a, b, c, d) => smooth((k - a) / (b - a)) * (1 - smooth((k - c) / (d - c)));
  const unit = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);
  const ease = (v, to, rate, dt) => v + (to - v) * (1 - Math.exp(-rate * dt));

  const D = { thigh: 15.2, shin: 15.2, ank: 3.2, hip: 33, tor: 21, neck: 11.5, hr: 7, ua: 11.6, fa: 11 };
  const LMAX = D.thigh + D.shin - 0.3;

  const LOOK = {
    walker: {
      skin: '#f0c8a0', hair: '#6a4a2a', coat: '#5f6b3c', vest: '#e8590c', pants: '#4b5a3a', boots: '#3a2a1c', sole: '#1f140b', hat: '#3d4f2f',
      scale: 1, walkS: 50, runS: 100, stoop: 0.03, carry: 'sling', gun: 'hunt', belly: 1.8,
    },
    ztmh: {
      skin: '#e6bd96', hair: '#3a2c20', coat: '#2f4f3a', vest: '#243d2d', pants: '#26331f', boots: '#14170f', sole: '#070905', hat: '#1f2f22', stripe: '#e9e7b4',
      scale: 1.04, walkS: 58, runS: 118, stoop: 0.07, carry: 'ready', gun: 'tac', belly: 0,
    },
    poacher: {
      skin: '#d9ae88', hair: '#3a2a1c', coat: '#2b2b2b', pants: '#1c1e22', boots: '#0f0f0f', sole: '#050505', hat: '#15171a',
      scale: 1, walkS: 56, runS: 104, stoop: 0.15, carry: 'crook', gun: 'old', belly: 0,
    },
    picker: {
      skin: '#f0cfae', hair: '#cfcfd0', coat: '#7b5ea7', skirt: '#3a3a5a', pants: '#c9a98e', boots: '#2f5d3a', sole: '#16301d', hat: '#c0392b',
      scale: 0.9, walkS: 38, runS: 80, stoop: 0.17, carry: 'basket', belly: 1.2,
    },
    tourist: {
      skin: '#f1c9a6', hair: '#6b4a2b', coat: '#2f86c8', pants: '#cbb98d', boots: '#f2f2f2', sole: '#c0392b', hat: '#e7dfc0', pack: '#f0b429',
      scale: 1, walkS: 48, runS: 96, stoop: 0.02, carry: 'phone', belly: 0,
    },
    santa: {
      skin: '#f1c4a0', hair: '#f5f3ee', coat: '#c4262e', trim: '#f7f3ea', pants: '#8e1c22', boots: '#1f1a17', sole: '#0b0908', hat: '#c4262e',
      glove: '#f2eee4', sack: '#b7945c', cuff: '#f7f3ea',
      scale: 1.04, walkS: 40, runS: 86, stoop: -0.01, carry: 'sack', belly: 4.2, tail: 0.6,
    },
  };
  const WLOOK = {
    walker: Object.assign({}, LOOK.walker, {
      coat: '#56623a', pants: '#3f4a33', boots: '#3b2a1c', hat: '#4f5e39', fur: '#bba386', glove: '#3e352b', tail: 0.28, belly: 2.6, win: 1,
    }),
    ztmh: Object.assign({}, LOOK.ztmh, { hat: '#15181b', gaiter: '#262c30', win: 1 }),
    poacher: Object.assign({}, LOOK.poacher, { coat: '#25282c', pants: '#191b1f', hat: '#30353b', mask: '#18191c', glove: '#1b1c1f', tail: 0.32, win: 1 }),
    tourist: Object.assign({}, LOOK.tourist, { coat: '#e4402f', pants: '#27314a', boots: '#eef1f4', sole: '#5a616e', hat: '#f4c430', ski: '#1f78d1', stoop: 0.03, win: 1 }),
    picker: LOOK.picker,
    santa: LOOK.santa,
  };
  const GUESTS = [
    { skin: '#f0c8a6', hair: '#5a3a22', coat: '#b8322a', check: 'rgba(40,16,14,0.42)', pants: '#3d5a80', boots: '#6a4528', sole: '#2a1a10',
      scale: 1, walkS: 46, runS: 94, stoop: 0.02, carry: 'mug', belly: 2.6, top: 'flannel', hairdo: 'short', stache: 1, bootF: 0.4 },
    { skin: '#f3cfb3', hair: '#8a4a26', coat: '#3f8f7a', pants: '#2e3440', boots: '#ece7dc', sole: '#9a8f80',
      scale: 0.95, walkS: 44, runS: 92, stoop: 0.01, carry: 'mug', belly: 0.6, top: 'fleece', hairdo: 'pony', blush: 1, bootF: 0.14 },
    { skin: '#eac2a0', hair: '#c9c6c0', coat: '#86806f', shirt: '#f2efe6', pants: '#5e4b3a', boots: '#2f2620', sole: '#120d0a', hat: '#4d463e',
      scale: 1, walkS: 42, runS: 88, stoop: 0.07, carry: 'mug', belly: 3.6, top: 'cardigan', hairdo: 'flatcap', stache: 1, bootF: 0.22 },
    { skin: '#e8b894', hair: '#2a201a', coat: '#e07a2e', pants: '#2f3b52', boots: '#f2f2f2', sole: '#c0392b', hat: '#2c5aa0',
      scale: 1, walkS: 48, runS: 98, stoop: 0, carry: 'mug', belly: 0, top: 'hoodie', hairdo: 'cap', glasses: 1, bootF: 0.14 },
  ];
  LOOK.guest = GUESTS[0];
  LOOK.waiter = {
    skin: '#efc7a3', hair: '#2e2018', coat: '#f6f3ec', vest: '#1e1b19', trim: '#b8322a', pants: '#24211f', boots: '#161210', sole: '#050403',
    scale: 1, walkS: 48, runS: 96, stoop: 0, carry: 'tray', belly: 1.6, top: 'vest', hairdo: 'slick', stache: 1, bootF: 0.16,
  };
  const lookOf = (kind, look) => (kind === 'guest' ? GUESTS[Math.abs(look | 0) % GUESTS.length] : LOOK[kind] || LOOK.walker);
  const SIZED = new Map();
  function sizedLook(L, s) {
    let m = SIZED.get(L);
    if (!m) SIZED.set(L, (m = new Map()));
    let v = m.get(s);
    if (!v) m.set(s, (v = Object.assign({}, L, { scale: L.scale * s })));
    return v;
  }
  const CAN_AIM = { walker: 1, ztmh: 1, poacher: 1 };
  const SPECIAL = { down: 1, pickup: 1, hugged: 1, bitten: 1, drop: 1, climbStand: 1, selfie: 1, dive: 1, jump: 1, climbOut: 1, cling: 1, hurdle: 1 };
  const INN = { dive: 1, jump: 1, climbOut: 1, cling: 1 };

  const shadeCache = {};
  function dk(hex, k) {
    const key = hex + k;
    let v = shadeCache[key];
    if (!v) {
      const n = parseInt(hex.slice(1), 16);
      const c = (s) => Math.min(255, Math.round(((n >> s) & 255) * k));
      v = shadeCache[key] = 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
    }
    return v;
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  function limb(ctx, ax, ay, bx, by, wa, wb, col) {
    const dx = bx - ax, dy = by - ay, d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
    ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
    ctx.closePath(); ctx.fill();
    circle(ctx, ax, ay, wa / 2); circle(ctx, bx, by, wb / 2);
  }
  function shoe(ctx, leg, col, sole, len) {
    ctx.save();
    ctx.translate(leg.ax, leg.ay); ctx.rotate(leg.rot);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-3.3, -2.6); ctx.lineTo(-3.7, 2.2); ctx.lineTo(len - 1.2, 2.2);
    ctx.quadraticCurveTo(len + 1.4, 2, len + 0.4, 0); ctx.lineTo(len - 3.2, -1.3); ctx.lineTo(2, -2.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = sole; ctx.fillRect(-3.8, 2.2, len + 4.6, 1.1);
    ctx.restore();
  }
  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + (i * PI) / 5, q = i % 2 ? r * 0.46 : r; ctx.lineTo(x + cos(a) * q, y + sin(a) * q); }
    ctx.closePath();
  }

  const IK = { mx: 0, my: 0, ex: 0, ey: 0 };
  function ik(x0, y0, tx, ty, l1, l2, bend) {
    let dx = tx - x0, dy = ty - y0, d = hypot(dx, dy);
    const max = l1 + l2 - 0.05, min = abs(l1 - l2) + 0.3;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { if (d < 0.001) { dx = 0; dy = min; } else { dx *= min / d; dy *= min / d; } d = min; }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const t = atan2(dy, dx) - bend * a;
    IK.mx = x0 + cos(t) * l1; IK.my = y0 + sin(t) * l1; IK.ex = x0 + dx; IK.ey = y0 + dy;
  }

  const byId = new Map(), byObj = new WeakMap();
  let sweepAt = 0;

  function hashSeed(v) {
    if (typeof v === 'number') return (abs(v) * 12.9898) % TAU;
    const s = String(v); let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 9973;
    return (n / 9973) * TAU;
  }
  function newState(seed) {
    return {
      t: -1, x: 0, phase: 0, amt: 0, runK: 0, aimK: 0, v: 0, seed, seen: 0, mz: [0, 0],
      sk: 1, sling: 0, clutch: 0, text: 0, dropT: -1, post: null, key: '', xf: 1, xd: 0.16, from: new Float64Array(NSL), snap: new Float64Array(NSL), fromGun: '', snapGun: '',
      puffs: [0, 1, 2, 3].map(() => ({ t: -9, x: 0, y: 0, d: 1 })), pAcc: 0.4, pN: 0,
    };
  }

  function getState(h, time) {
    let st;
    if (h.id !== undefined && h.id !== null) {
      st = byId.get(h.id);
      if (!st) { st = newState(hashSeed(h.id)); byId.set(h.id, st); }
      st.seen = time;
      if (time < sweepAt - 1 || time > sweepAt + 6) {
        sweepAt = time;
        for (const [k, v] of byId) if (v !== st && (v.seen < time - 10 || v.seen > time + 1)) byId.delete(k);
      }
    } else {
      st = byObj.get(h);
      if (!st) { st = newState(hashSeed(h.kind || 'x')); byObj.set(h, st); }
    }
    return st;
  }

  function advance(st, h, L, hint, wantRun, wantAim, face, time) {
    const dt = time - st.t;
    const strideNow = () => lerp(L.walkS, L.runS, st.runK) * L.scale * st.sk;
    if (!(dt >= 0 && dt < 0.3) || abs(h.x - st.x) > 90) {
      st.runK = wantRun ? 1 : 0; st.amt = hint ? 1 : 0; st.aimK = wantAim ? 1 : 0; st.v = hint ? 40 : 0;
      st.phase = face * h.x / strideNow();
    } else if (dt > 1e-4) {
      const dx = h.x - st.x;
      st.phase += dx * face / strideNow();
      st.v += (abs(dx) / dt - st.v) * Math.min(1, dt * 10);
      st.amt += (clamp(st.v / 9, 0, 1) - st.amt) * Math.min(1, dt * 14);
      st.runK += (((wantRun || st.v > 135) ? 1 : 0) - st.runK) * Math.min(1, dt * 10);
      st.aimK += ((wantAim ? 1 : 0) - st.aimK) * Math.min(1, dt * 11);
    }
    st.x = h.x; st.t = time;
  }

  const mkLeg = () => ({ ax: 0, ay: 0, kx: 0, ky: 0, rot: 0 });
  const mkArm = () => ({ ex: 0, ey: 0, wx: 0, wy: 0 });
  const R = {
    px: 0, py: 0, lean: 0, cl: 1, sl: 0, sx: 0, sy: 0, hx: 0, hy: 0, hang: 0, yaw: 1, face: 0, breath: 0,
    hatA: 0, hatY: 0, hatS: 1, tsx: 1, stars: 0, sackA: 0, free: false, vs: 0, pw: 0, pa: 0, flash: 0, spin: 0,
    legN: mkLeg(), legF: mkLeg(), armN: mkArm(), armF: mkArm(),
    rf: { mode: '', ox: 0, oy: 0, ang: 0, behind: false, back: false, kick: 0, sx: 1 },
    phone: { x: 0, y: 0, ang: 0 }, basket: { x: 0, y: 0, ang: 0 }, tray: { x: 0, y: 0, ang: 0 },
  };
  const SL = [];
  ['px', 'py', 'lean', 'sx', 'sy', 'hx', 'hy', 'hang', 'hatA', 'hatY', 'hatS', 'tsx', 'sackA'].forEach((k) => SL.push([R, k]));
  for (const o of [R.legN, R.legF]) ['ax', 'ay', 'kx', 'ky', 'rot'].forEach((k) => SL.push([o, k]));
  for (const o of [R.armN, R.armF]) ['ex', 'ey', 'wx', 'wy'].forEach((k) => SL.push([o, k]));
  ['ox', 'oy', 'ang'].forEach((k) => SL.push([R.rf, k]));
  const NSL = SL.length;
  const BASE = new Float64Array(NSL), PA = new Float64Array(NSL), PB = new Float64Array(NSL);
  function grab(o) { for (let i = 0; i < NSL; i++) o[i] = SL[i][0][SL[i][1]]; }
  function put(o) { for (let i = 0; i < NSL; i++) SL[i][0][SL[i][1]] = o[i]; R.cl = cos(R.lean); R.sl = sin(R.lean); }
  function blendTo(o, w) {
    if (!(w > 0)) return;
    if (w >= 1) { put(o); return; }
    for (let i = 0; i < NSL; i++) { const s = SL[i]; s[0][s[1]] += (o[i] - s[0][s[1]]) * w; }
    R.cl = cos(R.lean); R.sl = sin(R.lean);
  }

  const ft = [{ x: 0, y: 0, rot: 0 }, { x: 0, y: 0, rot: 0 }];
  const TP = { x: 0, y: 0 };
  function tp(tx, ty) { TP.x = R.px + tx * R.cl - ty * R.sl; TP.y = R.py + tx * R.sl + ty * R.cl; }

  function footTrack(o, p, duty, half, lift) {
    if (p < duty) {
      const u = p / duty;
      o.x = half - 2 * half * u; o.y = 0;
      o.rot = u < 0.16 ? lerp(-0.3, 0, u / 0.16) : u > 0.7 ? lerp(0, 0.8, (u - 0.7) / 0.3) : 0;
    } else {
      const v = (p - duty) / (1 - duty), e = v * v * (3 - 2 * v);
      o.x = -half + 2 * half * e;
      o.y = lift * sin(PI * Math.pow(v, 0.8));
      o.rot = v < 0.45 ? lerp(0.8, 0.05, v / 0.45) : lerp(0.05, -0.3, (v - 0.45) / 0.55);
    }
    o.y += Math.max(0, o.rot) * 5;
  }

  function setLeg(lg, rot) { lg.kx = IK.mx; lg.ky = IK.my; lg.ax = IK.ex; lg.ay = IK.ey; lg.rot = rot; }

  function arm(a, u, f, g, tx, ty) {
    const e1x = R.sx + D.ua * sin(u), e1y = R.sy + D.ua * cos(u), t = u + f;
    const w1x = e1x + D.fa * sin(t), w1y = e1y + D.fa * cos(t);
    if (g <= 0.001) { a.ex = e1x; a.ey = e1y; a.wx = w1x; a.wy = w1y; return; }
    ik(R.sx, R.sy, lerp(w1x, tx, g), lerp(w1y, ty, g), D.ua, D.fa, -1);
    a.ex = IK.mx; a.ey = IK.my; a.wx = IK.ex; a.wy = IK.ey;
  }

  function skiFrame(st) {
    const p0 = frac(st.phase);
    return -0.36 + R.lean * 0.5 + sin(TAU * p0 * 2 + 0.6) * 0.03 * st.amt;
  }

  function solve(K, st, tm) {
    const L = K.L, state = K.state, amt = st.amt, runK = st.runK, aimK = st.aimK, sd = st.seed, ck = st.clutch;
    const film = state === 'film', breath = sin(tm * 1.9 + sd), shift = sin(tm * 0.45 + sd);
    const p0 = frac(st.phase), cN = cos(TAU * p0);

    const S = lerp(L.walkS, L.runS, runK) * st.sk, duty = lerp(lerp(0.6, 0.38, runK), 0.5, ck), half = S * duty * 0.5;
    const lift = lerp(lerp(4.5, 10.5, runK), 4.4, ck);
    footTrack(ft[0], p0, duty, half, lift); footTrack(ft[1], frac(p0 + 0.5), duty, half, lift);
    let nx = lerp(3 + shift * 0.8, ft[0].x, amt), ny = lerp(0, ft[0].y, amt), nr = lerp(0, ft[0].rot, amt);
    let fx = lerp(-3 + shift * 0.8, ft[1].x, amt), fy = lerp(0, ft[1].y, amt), fr = lerp(0, ft[1].rot, amt);
    if (L.ski) { nr *= 0.35; fr *= 0.35; }
    const stand = aimK * (1 - amt);
    if (stand > 0) {
      nx = lerp(nx, film ? -3.5 : -6.5, stand); fx = lerp(fx, film ? 4.5 : 9.5, stand);
      ny = lerp(ny, 0, stand); fy = lerp(fy, 0, stand); nr = lerp(nr, 0, stand); fr = lerp(fr, 0, stand);
    }
    const ph = 2 * TAU * (p0 - duty * 0.5);
    let hipH = D.hip - 0.7 + amt * lerp(1.1 * cos(ph) - 0.5, -1.7 * cos(ph) - 3.2, runK) + breath * 0.12 * (1 - amt);
    if (ck > 0) hipH = lerp(hipH, D.hip - 0.6 + amt * (2 * cos(ph) - 0.7), ck);
    hipH = lerp(hipH, D.hip - (film ? 1.5 : 3.2), stand);
    R.px = lerp(shift * 0.9, 0, amt) * (1 - aimK);
    const sl = K.slope || 0;
    const reach = (x, y) => D.ank + y - sl * x + sqrt(Math.max(0, LMAX * LMAX - (x - R.px) * (x - R.px)));
    hipH = Math.min(hipH, reach(nx, ny), reach(fx, fy));
    R.py = -hipH;
    ik(R.px, R.py, nx, -(D.ank + ny) + sl * nx, D.thigh, D.shin, 1); setLeg(R.legN, nr + sl * 0.8);
    ik(R.px, R.py, fx, -(D.ank + fy) + sl * fx, D.thigh, D.shin, 1); setLeg(R.legF, fr + sl * 0.8);

    let lean = L.stoop + amt * (0.03 + 0.26 * runK) - sl * 0.25;
    lean = lerp(lean, film ? 0.0 : 0.1, aimK);
    if (ck > 0) lean = lerp(lean, -0.08 + 0.07 * sin(TAU * p0 * 2) * amt, ck);
    R.lean = lean; R.cl = cos(lean); R.sl = sin(lean);
    R.breath = breath;
    R.sx = R.px + D.tor * R.sl; R.sy = R.py - D.tor * R.cl + breath * 0.4 * (1 - amt * 0.8);
    const nd = lean * 0.75 + 0.03;
    R.hx = R.sx + D.neck * sin(nd); R.hy = R.sy - D.neck * cos(nd);
    const look = L.carry === 'basket' ? 0.14 + 0.12 * sin(tm * 0.8 + sd) : sin(tm * 0.6 + sd * 2) * 0.05;
    R.hang = lean * 0.35 + look * (1 - amt) + runK * amt * 0.05;
    R.yaw = 1;
    R.face = (K.panic && runK > 0.4 && amt > 0.4) || ck > 0.5 ? 1 : 0;
    R.hatA = 0; R.hatY = 0; R.hatS = 1; R.tsx = 1; R.stars = 0; R.vs = 0; R.pw = 0; R.flash = 0; R.spin = 0;
    R.sackA = sin(TAU * p0 - 0.9) * 0.07 * amt * (1 + runK);

    const sw = lerp(0.42, 0.85, runK) * amt * (L.carry === 'sack' ? 0.7 : 1);
    let uN = 0.05 - sw * cN, uF = 0.03 + sw * cN;
    let fN = lerp(0.18, 1.35, runK * amt) + 0.45 * Math.max(0, -cN) * amt * (1 - runK) + 0.25 * -cN * amt * runK;
    let fF = lerp(0.18, 1.35, runK * amt) + 0.45 * Math.max(0, cN) * amt * (1 - runK) + 0.25 * cN * amt * runK;
    if (K.panic) {
      const k = runK * amt;
      uN = lerp(uN, 2.3 + 0.5 * sin(TAU * p0 + 0.6), k); fN = lerp(fN, 0.5 + 0.3 * sin(2 * TAU * p0), k);
      uF = lerp(uF, 1.7 + 0.55 * sin(TAU * p0 + 2.6), k); fF = lerp(fF, 0.6 + 0.3 * sin(2 * TAU * p0 + 1), k);
    }
    if (L.carry === 'basket' && K.has) {
      const k = 1 - runK * amt * 0.2;
      uN = (0.42 - cN * 0.1 * amt) * k + uN * (1 - k); fN = (0.9 + 0.1 * -cN * amt) * k + fN * (1 - k);
      if (K.panic) { uN = lerp(uN, 0.6 + 0.3 * sin(2 * TAU * p0), runK * amt); fN = lerp(fN, 1.3, runK * amt); }
    }
    let gN = 0, gF = 0, gnx = 0, gny = 0, gfx = 0, gfy = 0;
    if (L.carry === 'sack' && K.has) {
      tp(4.2, -23.4 + sin(TAU * p0 * 2) * 0.5 * amt); gF = 1; gfx = TP.x; gfy = TP.y; uF = 0.6; fF = -1.2;
    }

    const rf = R.rf;
    rf.mode = ''; rf.back = false; rf.sx = 1;
    if (K.armed) {
      let cx = 0, cy = 0, ca = 0;
      if (L.carry === 'sling') { tp(-8, -2); cx = TP.x; cy = TP.y; ca = -1.78 + R.lean + sin(TAU * p0) * 0.05 * amt; }
      else if (L.carry === 'ready') { tp(-1, -18); cx = TP.x; cy = TP.y; ca = lerp(0.3, -0.3, runK * amt) + R.lean * 0.4 + sin(TAU * p0 * 2) * 0.03 * amt; gN = 1; gF = 1; }
      else { tp(-5, -19); cx = TP.x; cy = TP.y; ca = 0.5 + R.lean * 0.5 + sin(TAU * p0 * 2) * 0.04 * amt; gN = 1; }
      const sg = L.carry === 'sling' ? 0 : st.sling;
      if (sg > 0) {
        tp(-8.5, -1.5); cx = lerp(cx, TP.x, sg); cy = lerp(cy, TP.y, sg); ca = lerp(ca, -1.82 + R.lean + sin(TAU * p0) * 0.06 * amt, sg);
        gN *= 1 - sg; gF *= 1 - sg;
      }
      const ax = R.sx + 1.6, ay = R.sy + 2.6;
      const aa = clamp(atan2(K.ty - ay, Math.max(8, K.tx - ax)), -0.95, 0.85) + sin(tm * 1.3 + sd) * 0.004 + sin(tm * 2.9 + sd) * 0.002;
      rf.mode = L.gun; rf.ox = lerp(cx, ax, aimK); rf.oy = lerp(cy, ay, aimK); rf.ang = lerp(ca, aa, aimK);
      rf.behind = (L.carry === 'sling' || sg > 0.5) && aimK < 0.35;
      rf.kick = K.kick * aimK;
      rf.ox -= 2.6 * rf.kick; rf.ang -= 0.15 * rf.kick;
      gN = Math.max(gN, aimK); gF = Math.max(gF, aimK);
      if (L.carry === 'sling') { gN = aimK; gF = aimK; }
      const ux = cos(rf.ang), uy = sin(rf.ang);
      gnx = rf.ox + ux * 13 - uy * 2.4; gny = rf.oy + uy * 13 + ux * 2.4;
      gfx = rf.ox + ux * 25 - uy * 3.2; gfy = rf.oy + uy * 25 + ux * 3.2;
      if (aimK > 0) {
        R.hx = lerp(R.hx, R.sx + 3.4 - 0.9 * rf.kick, aimK); R.hy = lerp(R.hy, R.sy - 8.6, aimK); R.hang = lerp(R.hang, aa * 0.5, aimK);
      }
    } else if (film) {
      const pitch = clamp(atan2(K.ty - (R.sy - 8), Math.max(8, K.tx - R.sx)), -0.5, 0.5);
      const jx = sin(tm * 7.3 + sd) * 0.25, jy = sin(tm * 9.1 + sd) * 0.25;
      gN = aimK; gF = aimK;
      gnx = R.sx + 17 + jx; gny = R.sy - 7.5 + pitch * 10 + jy;
      gfx = R.sx + 14.5 + jx; gfy = R.sy - 5.5 + pitch * 10 + jy;
      R.hx = lerp(R.hx, R.sx + 3, aimK); R.hy = lerp(R.hy, R.sy - 10.6, aimK); R.hang = lerp(R.hang, -0.06 + pitch * 0.3, aimK);
    }
    if (L.ski) {
      const a = skiFrame(st), c = cos(a), s = sin(a), bx = R.sx - 1.2 + c * 9.5 + s * 2.6, by = R.sy - 3.2 + s * 9.5 - c * 2.6;
      gF = 1; gfx = bx; gfy = by + 1.2; uF = 0.9; fF = 1.6;
    }
    if (K.text > 0) {
      const tw = K.text;
      tp(9.6, -14.6 + sin(TAU * p0 * 2) * 0.35 * amt);
      gnx = gN > 0 ? lerp(gnx, TP.x, tw) : TP.x; gny = gN > 0 ? lerp(gny, TP.y, tw) : TP.y; gN = lerp(gN, 1, tw);
      R.hang += 0.34 * tw; R.hx += 0.5 * tw; R.hy += 0.7 * tw; R.pw = tw; R.pa = 0.72;
      if (tw > 0.5) R.face = 6;
    }
    if (ck > 0) {
      const j = sin(TAU * p0 * 2) * 0.7 * amt;
      tp(-8.4, -2.2 + j);
      gnx = gN > 0 ? lerp(gnx, TP.x, ck) : TP.x; gny = gN > 0 ? lerp(gny, TP.y, ck) : TP.y; gN = lerp(gN, 1, ck);
      tp(-7.8, -4.2 - j);
      gfx = gF > 0 ? lerp(gfx, TP.x, ck) : TP.x; gfy = gF > 0 ? lerp(gfy, TP.y, ck) : TP.y; gF = lerp(gF, 1, ck);
      uN = lerp(uN, -0.35, ck); fN = lerp(fN, 0.3, ck); uF = lerp(uF, -0.3, ck); fF = lerp(fF, 0.3, ck);
    }
    if (K.balance) {
      const w = sin(tm * 2.6 + sd);
      uN = 1.35 + 0.25 * w; fN = 0.35; uF = -0.95 - 0.25 * w; fF = 0.45; gN = 0; gF = 0;
    }
    if (K.has && (L.carry === 'tray' || L.carry === 'mug')) {
      const j = sin(TAU * p0 * 2) * 0.7 * amt, hi = L.carry === 'mug' && K.panic ? smooth(runK * amt * 1.5) : 0;
      if (L.carry === 'tray') tp(9.5, -25 + j); else tp(lerp(10.5, 7, hi), lerp(-12.5, -33, hi) + j);
      gN = 1; gnx = TP.x; gny = TP.y;
    }
    arm(R.armN, uN, fN, gN, gnx, gny);
    arm(R.armF, uF, fF, gF, gfx, gfy);
  }

  function hold(K, st) {
    const L = K.L, a = R.armN, p0 = frac(st.phase), amt = st.amt, runK = st.runK;
    if (L.carry === 'basket') {
      const sway = sin(TAU * p0 - 0.8) * 0.16 * amt + (K.panic ? sin(TAU * p0 * 2) * 0.12 * runK * amt : 0);
      R.basket.ang = sway; R.basket.x = a.wx + sin(sway) * 3; R.basket.y = a.wy + 3.2 * cos(sway);
    } else if (L.carry === 'tray' || L.carry === 'mug') {
      R.tray.x = a.wx; R.tray.y = a.wy;
      R.tray.ang = K.panic ? 0.14 * sin(TAU * p0 * 2 + 1) * runK * amt : 0.04 * sin(TAU * p0 * 2) * amt;
    } else if (L.carry === 'phone') {
      const dir = atan2(a.wy - a.ey, a.wx - a.ex);
      R.phone.x = a.wx; R.phone.y = a.wy;
      R.phone.ang = lerp(lerp(dir - PI / 2, K.state === 'film' ? 0.04 : 0, st.aimK), R.pa, R.pw);
    }
  }

  const PV = new Float64Array(18);
  function spline(keys, k, out, cnt) {
    const n = cnt || keys.length;
    let i = 0;
    while (i < n - 2 && k > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], p = keys[i > 0 ? i - 1 : i], q = keys[i + 2 < n ? i + 2 : i + 1];
    const sp = b[0] - a[0], u = clamp((k - a[0]) / sp, 0, 1), u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2;
    const ta = i > 0 ? sp / (b[0] - p[0]) : 0, tb = i + 2 < n ? sp / (q[0] - a[0]) : 0;
    for (let j = 1; j < a.length; j++) out[j - 1] = h00 * a[j] + h01 * b[j] + h10 * (b[j] - p[j]) * ta + h11 * (q[j] - a[j]) * tb;
  }

  function pose(P) {
    R.px = P[0]; R.py = P[1];
    const lean = P[2];
    R.lean = lean; R.cl = cos(lean); R.sl = sin(lean);
    R.sx = R.px + D.tor * R.sl; R.sy = R.py - D.tor * R.cl;
    const nd = lean + P[3];
    R.hx = R.sx + D.neck * sin(nd); R.hy = R.sy - D.neck * cos(nd); R.hang = nd + P[4];
    ik(R.px, R.py, P[5], P[6], D.thigh, D.shin, 1); setLeg(R.legN, P[7]);
    ik(R.px, R.py, P[8], P[9], D.thigh, D.shin, 1); setLeg(R.legF, P[10]);
  }

  const STAND = [0, -32.3, 0.03, 0.02, -0.04, 3, -3.2, 0, -3, -3.2, 0, 0.05, 0.18, 0.03, 0.18, 0, 0, 1];
  const LIE = [1, -18, -7.2, -1.57, 0.02, 0.06, 9, -3.3, 0, 3.5, -3.3, 0.05, 1.32, 0.32, 1.58, 0.45, 0.3, 0.8, 1];
  const FALL = [
    [0].concat(STAND),
    [0.13, 1, -25.5, 0.3, 0.45, 0.15, 4.5, -3.2, 0, -3, -3.2, 0, 1.7, 0.8, 1.3, 0.6, 0.1, 3.4, 0.72],
    [0.3, -1.5, -23, -0.3, -0.25, -0.2, 7, -5, -0.3, 0, -3.2, 0, 2.6, 0.5, 2.2, 0.9, 0.05, 3, 0.85],
    [0.5, -9, -14.5, -0.95, -0.3, -0.1, 10, -11, -0.7, 6, -4.5, -0.25, 3.0, 0.4, 2.7, 0.7, -0.05, 2.6, 0.95],
    [0.68, -16, -7.4, -1.52, -0.12, 0, 7, -21, -1.1, 11, -15, -0.75, 2.6, 0.5, 2.9, 0.6, 0.2, 1.8, 1],
    [0.8, -17.5, -9.6, -1.45, -0.02, 0.05, 10, -11, -0.6, 12, -7.5, -0.35, 1.6, 0.4, 2.2, 0.6, 0.3, 1, 1],
    LIE,
  ];
  const RISE = [
    [0].concat(LIE.slice(1)),
    [0.14, -18.4, -7.8, -1.4, 0.6, 0.1, 9, -3.3, 0, 3.5, -3.3, 0.05, 1.4, 0.3, 1.6, 0.5, 0.3, 0.8, 1],
    [0.32, -16, -5.6, -0.42, 0.3, 0.12, 5.5, -3.3, 0, 2.5, -3.3, 0, -0.6, 0.2, -0.5, 0.2, 0.3, 0.9, 1],
    [0.5, -9, -14, 0.42, 0.18, 0.04, -19, -3.6, 1.25, 4, -3.3, 0, 0.7, 0.9, 0.6, 0.9, 0.28, 0.9, 1],
    [0.66, -3, -23.5, 0.4, 0.1, 0, -8, -3.3, 0.5, 4, -3.2, 0, 0.5, 1.0, 0.4, 0.9, 0.24, 0.8, 1],
    [0.8, 0.5, -30.8, 0.1, 0.04, -0.03, 1.5, -3.2, 0.05, 3.5, -3.2, 0, 0.2, 0.3, 0.1, 0.25, 0.1, 0.4, 1],
    [0.9, 0.2, -32, 0.05, 0.03, -0.04, 2.8, -3.2, 0, -2.2, -3.2, 0, 0.1, 0.2, 0.05, 0.2, 0, 0, 1],
    [1].concat(STAND),
  ];

  function solveDown(K, st, tm, phase, k) {
    const sd = st.seed;
    grab(BASE);
    let w = 1, gN = 0, gF = 0, tnx = 0, tny = 0, tfx = 0, tfy = 0, br = 0;
    if (phase === 'fall' && st.dropT >= 0 && tm - st.dropT < 0.6) { spline(FALL, 0.13 + 0.87 * k, PV); w = 1; }
    else if (phase === 'fall') { spline(FALL, k, PV); w = smooth(k / 0.12); }
    else if (phase === 'rise') { spline(RISE, k, PV); w = 1 - smooth((k - 0.86) / 0.14); }
    else {
      for (let i = 0; i < 18; i++) PV[i] = LIE[i + 1];
      const env = smooth(k / 0.08) * smooth((1 - k) / 0.08);
      br = sin(tm * 2.5 + sd) * env;
      PV[1] -= 0.25 * br;
      PV[4] += 0.1 * sin(tm * 1.6 + sd) * env;
      const t1 = bump(k, 0.26, 0.33) + 0.6 * bump(k, 0.34, 0.39), t2 = bump(k, 0.62, 0.7), t3 = bump(k, 0.47, 0.52) + bump(k, 0.83, 0.87);
      PV[6] -= 4.5 * t1; PV[5] -= 1.5 * t1; PV[7] -= 0.5 * t1;
      PV[9] -= 3.5 * t2; PV[10] -= 0.4 * t2;
      PV[11] += 0.35 * t3; PV[12] += 0.6 * t3;
    }
    pose(PV);
    if (phase === 'rise') {
      R.hang = R.hang + 0.25 * sin(tm * 17 + sd) * bump(k, 0.08, 0.3);
      const w1 = plateau(k, 0.17, 0.26, 0.4, 0.48), w2 = plateau(k, 0.42, 0.5, 0.66, 0.74), w3 = plateau(k, 0.7, 0.78, 0.86, 0.95);
      const c = cos(R.hang), s = sin(R.hang), hx = R.hx + 7.5 * c + 6 * s, hy = R.hy + 7.5 * s - 6 * c;
      const kx = R.legF.kx, ky = R.legF.ky;
      const sN = w1 + w2 + w3 || 1, sF = w1 + w2 || 1;
      tnx = (w1 * -26 + w2 * (kx + 1) + w3 * hx) / sN; tny = (w1 * -3.8 + w2 * (ky - 1.6) + w3 * hy) / sN;
      tfx = (w1 * -24 + w2 * (kx - 1.5)) / sF; tfy = (w1 * -3.8 + w2 * (ky - 0.6)) / sF;
      gN = Math.min(1, w1 + w2 + w3); gF = Math.min(1, w1 + w2);
    }
    arm(R.armN, PV[11], PV[12], gN, tnx, tny);
    arm(R.armF, PV[13], PV[14], gF, tfx, tfy);
    R.hatA = PV[15]; R.hatY = PV[16]; R.hatS = PV[17];
    R.tsx = 1 + 0.035 * br;
    R.yaw = 1;
    R.sackA = 0;
    if (phase === 'fall') { R.face = k < 0.62 ? 2 : 3; R.stars = smooth((k - 0.82) / 0.18); }
    else if (phase === 'rise') { R.face = k < 0.3 ? 3 : k < 0.72 ? 4 : 0; R.stars = 1 - smooth((k - 0.18) / 0.26); }
    else { R.face = 3; R.stars = 1; }
    if (w < 1) blendTo(BASE, 1 - w);
  }

  function solveHug(K, st, tm, k) {
    const sd = st.seed;
    grab(BASE);
    const up = smooth(k / 0.17) * (1 - smooth((k - 0.83) / 0.12));
    const fl = smooth(k / 0.07) * (1 - smooth((k - 0.82) / 0.15));
    const sk = (k - 0.2) / 0.6, sq = sk > 0 && sk < 1 ? Math.pow(sin(PI * sk * 3), 2) * up : 0;
    const lift = 7 * up + 1.3 * sq, ph = tm * 14 + sd, af = tm * 17 + sd;
    PV[0] = 1 * up; PV[1] = -32.3 - lift; PV[2] = lerp(K.L.stoop, -0.07 - 0.05 * sq, up); PV[3] = -0.1 * up - 0.12 * sq; PV[4] = -0.04;
    PV[5] = lerp(3, PV[0] + 2.5 + 4.5 * cos(ph), up); PV[6] = lerp(-3.2, PV[1] + 25.8 + 3.2 * sin(ph), up); PV[7] = (0.45 + 0.3 * sin(ph + 0.6)) * up;
    PV[8] = lerp(-3, PV[0] - 1 - 4.5 * cos(ph), up); PV[9] = lerp(-3.2, PV[1] + 25.8 - 3.2 * sin(ph), up); PV[10] = (0.45 - 0.3 * sin(ph + 0.6)) * up;
    pose(PV);
    const rf = R.rf, hand = rf.mode && K.L.carry !== 'sling';
    if (hand) arm(R.armN, lerp(0.05, 3.25 + 0.12 * sin(af), fl), lerp(0.18, -0.1 + 0.15 * sin(af + 1.4), fl), 0, 0, 0);
    else arm(R.armN, lerp(0.05, 3.55 + 0.32 * sin(af), fl), lerp(0.18, -0.25 + 0.4 * sin(af + 1.4), fl), 0, 0, 0);
    arm(R.armF, lerp(0.03, 2.45 + 0.42 * sin(af + 2.3), fl), lerp(0.18, 0.45 + 0.4 * sin(af + 3.4), fl), 0, 0, 0);
    if (hand) {
      const a = R.armN, g = lerp(-1.3, -1.4 + 0.12 * sin(af * 0.5), fl), c = cos(g), sn = sin(g);
      rf.ang = g; rf.ox = a.wx - c * 13 + sn * 2.4; rf.oy = a.wy - sn * 13 - c * 2.4; rf.behind = false; rf.back = false; rf.kick = 0;
    } else reattach(BASE);
    R.tsx = 1 - 0.13 * sq;
    R.hy -= 1.2 * sq;
    R.hatA = 0.1 * sin(af * 0.5) * fl; R.hatY = -4.2 * bump(k, 0, 0.16) - 1.6 * sq; R.hatS = 1;
    R.face = k > 0.015 && k < 0.95 ? 2 : 0;
    R.yaw = 1; R.stars = 0; R.sackA = 0;
    const w = smooth(k / 0.05) * (1 - smooth((k - 0.93) / 0.07));
    if (w < 1) blendTo(BASE, 1 - w);
  }

  function solveBite(K, st, tm, k) {
    const L = K.L;
    grab(BASE);
    const j = smooth(k / 0.07), u = (k - 0.43) / 0.36, air = k > 0.07 && k < 0.79 ? 1 - u * u : 0;
    const y = 14 * Math.max(0, air), land = bump(k, 0.74, 1), up = smooth(air * 3);
    PV[0] = 1.8 * j; PV[1] = -32.3 - y + 3 * land; PV[2] = lerp(L.stoop, -0.24, j) + 0.12 * land; PV[3] = -0.35 * j * (1 - smooth((k - 0.4) / 0.3)); PV[4] = -0.1 * j;
    PV[5] = lerp(3, PV[0] + 3.2, up); PV[6] = Math.min(-3.2, PV[1] + 28.6); PV[7] = 0.6 * up;
    PV[8] = lerp(-3, PV[0] - 1.2, up); PV[9] = Math.min(-3.2, PV[1] + 28.4); PV[10] = 0.55 * up;
    pose(PV);
    const g = smooth(k / 0.2);
    tp(-8.4, -2.2); const nx = TP.x, ny = TP.y;
    tp(-7.8, -4.2);
    arm(R.armN, lerp(0.05, -0.35, g), lerp(0.18, 0.3, g), g, nx, ny);
    arm(R.armF, lerp(0.03, -0.3, g), lerp(0.18, 0.3, g), g, TP.x, TP.y);
    R.hatA = -0.15 * bump(k, 0.03, 0.4); R.hatY = -5 * bump(k, 0.03, 0.34); R.hatS = 1; R.tsx = 1;
    reattach(BASE);
    R.face = k < 0.85 ? 2 : 1;
    R.yaw = 1; R.stars = 0; R.sackA = 0;
    const w = 1 - smooth((k - 0.8) / 0.2);
    if (w < 1) blendTo(BASE, 1 - w);
  }

  const PICK = [
    [0].concat(STAND.slice(0, 15)),
    [0.22, -2.5, -26.5, 0.55, 0.3, 0.12, 4.5, -3.2, 0, -3.5, -3.2, 0.1, 0.3, 0.3, 0.2, 0.3],
    [0.45, -6, -16, 1.2, 0.28, 0.12, 5, -3.2, 0, -4, -3.4, 0.45, 0.6, 0.2, 0.5, 0.3],
    [0.62, -4.6, -21, 0.85, 0.2, 0.06, 5, -3.2, 0, -4, -3.3, 0.3, 0.5, 0.4, 0.4, 0.4],
    [0.8, -1.2, -29.4, 0.3, 0.08, 0, 3.5, -3.2, 0, -3.2, -3.2, 0.05, 0.2, 0.3, 0.1, 0.25],
    [1].concat(STAND.slice(0, 15)),
  ];
  const RK = [0, 1, 2, 3, 4].map(() => [0, 0, 0, 0]);
  const PICK_AT = 16;
  const RV = new Float64Array(3);
  function gripKey(i, t, x, y, a, sx) {
    const r = RK[i], c = cos(a), sn = sin(a);
    r[0] = t; r[1] = x + c * 13 * sx - sn * 2.4; r[2] = y + sn * 13 * sx + c * 2.4; r[3] = a;
    return i + 1;
  }

  function solvePick(K, st, tm, k, gd, off) {
    const L = K.L, carry = L.carry, g = GUN[L.gun] || GUN.hunt;
    grab(PA);
    K.armed = true; solve(K, st, tm); K.armed = false;
    grab(PB);
    const cox = R.rf.ox, coy = R.rf.oy, cang = R.rf.ang;
    put(PA);
    const gx = off / L.scale, gy = -g.lift, rev = gd < 0, ta = rev ? -g.tau : g.tau;
    const g0x = gx + (rev ? GC : -GC) * cos(ta), g0y = gy + (rev ? GC : -GC) * sin(ta);
    spline(PICK, k, PV);
    PV[15] = 0; PV[16] = 0; PV[17] = 1;
    PV[0] += clamp((gx - PICK_AT) * 0.5, -6, 7) * plateau(k, 0.04, 0.3, 0.62, 0.92);
    pose(PV);
    let nk = gripKey(0, 0.45, g0x, g0y, ta, rev ? -1 : 1);
    if (carry === 'sling') { nk = gripKey(nk, 0.62, -5, -30, -0.85, 1); nk = gripKey(nk, 0.8, -9, -37, -1.6, 1); }
    else if (carry === 'ready') nk = gripKey(nk, 0.68, -3, -33, 0.05, 1);
    else nk = gripKey(nk, 0.68, -2, -31, 0.35, 1);
    nk = gripKey(nk, 1, cox, coy, cang, 1);
    if (k <= 0.45) { RV[0] = RK[0][1]; RV[1] = RK[0][2]; RV[2] = ta; } else spline(RK, k, RV, nk);
    const fs = rev ? lerp(-1, 1, smooth((k - 0.47) / 0.2)) : 1;
    const hnx = RV[0], hny = RV[1], ux = cos(RV[2]), uy = sin(RV[2]);
    RV[0] = hnx - ux * 13 * fs + uy * 2.4; RV[1] = hny - uy * 13 * fs - ux * 2.4;
    const rf = R.rf;
    rf.mode = L.gun; rf.kick = 0; rf.sx = fs;
    rf.back = carry === 'sling' ? k < 0.97 : k < 0.45;
    rf.behind = carry === 'sling' && k >= 0.97;
    const fx = lerp(20, 25, smooth((k - 0.45) / 0.3)) * fs, fy = lerp(2.4, 3.2, smooth((k - 0.45) / 0.3));
    let tfx = RV[0] + ux * fx - uy * fy, tfy = RV[1] + uy * fx + ux * fy;
    let gN = smooth((k - 0.1) / 0.33), gF = 0;
    if (carry === 'sling') gN *= 1 - smooth((k - 0.82) / 0.12);
    if (carry === 'ready') gF = smooth((k - 0.18) / 0.27);
    else { gF = plateau(k, 0.12, 0.3, 0.55, 0.75); tfx = R.legF.kx + 1; tfy = R.legF.ky - 1; }
    arm(R.armN, PV[11], PV[12], gN, hnx, hny);
    arm(R.armF, PV[13], PV[14], gF, tfx, tfy);
    R.hatA = 0; R.hatY = 0; R.hatS = 1; R.tsx = 1; R.face = 0; R.stars = 0; R.yaw = 1; R.sackA = 0;
    rf.ox = RV[0]; rf.oy = RV[1]; rf.ang = RV[2];
    blendTo(PA, 1 - smooth(k / 0.1));
    rf.ox = RV[0]; rf.oy = RV[1]; rf.ang = RV[2];
    blendTo(PB, smooth((k - 0.84) / 0.16));
  }

  function solveSelfie(K, st, tm, k) {
    const L = K.L, sd = st.seed;
    grab(BASE);
    const up = plateau(k, 0.13, 0.36, 0.6, 0.78), look = plateau(k, 0.62, 0.78, 0.92, 1.01), vs = plateau(k, 0.18, 0.34, 0.6, 0.72);
    const lb = plateau(k, 0.1, 0.32, 0.62, 0.86), bob = sin(tm * 6 + sd) * 0.4 * up;
    for (let i = 0; i < 18; i++) PV[i] = STAND[i];
    PV[2] = L.stoop - 0.15 * lb + 0.08 * look; PV[3] = -0.12 * up + 0.32 * look; PV[4] = -0.05 * up + 0.12 * look;
    PV[1] = -32.3 + bob; PV[5] = 3.5; PV[8] = -3.6;
    pose(PV);
    tp(0, -D.tor);
    const ux = R.sx + 15.5, uy = R.sy - 13.5 + bob, lx = R.sx + 9.6, ly = R.sy + 4.5, sw = up + look || 1;
    const tnx = (up * ux + look * lx) / sw, tny = (up * uy + look * ly) / sw;
    arm(R.armN, 0.05, 0.18, Math.min(1, up + look), tnx, tny);
    const c = cos(R.hang), sn = sin(R.hang);
    arm(R.armF, 0.03, 0.18, vs, R.hx - 8 * c + 8.5 * sn, R.hy - 8 * sn - 8.5 * c);
    R.vs = vs; R.pw = Math.min(1, up + look); R.pa = lerp(-0.22, 0.75, look / sw);
    R.flash = bump(k, 0.52, 0.61);
    R.face = k < 0.1 ? 0 : k < 0.6 ? 5 : 6; R.yaw = 1;
    R.hatA = 0; R.hatY = 0; R.hatS = 1; R.tsx = 1; R.stars = 0; R.sackA = 0;
    const w = smooth(k / 0.08) * (1 - smooth((k - 0.94) / 0.06));
    if (w < 1) blendTo(BASE, 1 - w);
  }

  const DROP = [
    [0, -1, -19, 0.05, 0.02, 0, 12, -7, 0.3, 9, -4.5, 0.2, 2.2, 0.4, 1.8, 0.4, 0.1, -1.5, 1],
    [0.22, 0.5, -29.5, -0.3, -0.28, -0.1, 4.5, -1.5, 0.5, -2.5, -3.5, 0.35, 3.1, 0.35, 2.3, 0.7, 0.35, -3.5, 1],
    [0.5, 1, -31, -0.14, -0.12, 0, 7.5, -10, 0.6, -4, -2.5, 0.25, 3.5, 0.5, 2.1, 0.6, 0.45, -2.6, 1],
    [0.78, 0.6, -31.6, 0.04, 0.08, 0, 3.6, -1.8, 0.35, -2.6, -2.4, 0.15, 2.5, 0.55, 1.9, 0.6, 0.32, -0.6, 1],
    [1].concat(FALL[1].slice(1)),
  ];
  const WP = new Float64Array(NSL), DPS = newPost(0, 0);

  const HURDLE = [
    [0, 1, -31, 0.32, -0.12, 0.02, 10, -14, 0.1, -12, -3.4, 0.7, -0.6, 1.1, 1.3, 0.5, 0, 0, 1],
    [0.24, 2, -32, 0.46, -0.2, 0.02, 21, -22, -0.2, -20, -10, 0.9, -0.95, 0.8, 1.65, 0.25, -0.04, -0.6, 1],
    [0.48, 2, -32.5, 0.55, -0.26, 0.02, 27, -28.5, -0.35, -26.5, -22, 0.6, -1.1, 0.9, 1.85, 0.1, -0.08, -1.6, 1],
    [0.74, 1.5, -31.5, 0.42, -0.18, 0.02, 16, -12, -0.1, -5, -23, 0.9, -0.5, 1.0, 1.2, 0.5, -0.05, -1, 1],
    [1, 1, -28.5, 0.3, -0.1, 0.02, 6, -3.3, 0, 7, -14, 0.4, 0.5, 1.2, -0.4, 1.0, 0, 0, 1],
  ];

  function solveHurdle(K, st, tm, k) {
    const L = K.L, sd = st.seed;
    spline(HURDLE, k, PV);
    PV[3] += 0.04 * sin(tm * 9 + sd);
    pose(PV);
    still();
    let gN = 0, gx = 0, gy = 0;
    if (K.has && (L.carry === 'tray' || L.carry === 'mug')) { tp(10.5, -24 + 2 * sin(PI * k)); gN = 1; gx = TP.x; gy = TP.y; }
    else if (K.has && L.carry === 'basket') { tp(7, -10); gN = 0.6; gx = TP.x; gy = TP.y; }
    arm(R.armN, PV[11], PV[12], gN, gx, gy);
    arm(R.armF, PV[13], PV[14], 0, 0, 0);
    R.hatA = PV[15]; R.hatY = PV[16]; R.hatS = PV[17];
    R.face = 1; R.breath = 0;
  }

  function solveDrop(K, st, tm, k, wp) {
    const sd = st.seed, fl = plateau(k, 0.1, 0.25, 0.7, 0.9), f1 = tm * 19 + sd, f2 = tm * 15 + sd;
    spline(DROP, k, PV);
    PV[11] += 0.6 * sin(f1) * fl; PV[12] += 0.4 * sin(f1 + 1.2) * fl;
    PV[13] += 0.6 * sin(f1 + 2.1) * fl; PV[14] += 0.4 * sin(f1 + 3) * fl;
    PV[5] += 3 * sin(f2) * fl; PV[6] -= 2.5 * Math.max(0, sin(f2)) * fl;
    PV[8] -= 3 * sin(f2) * fl; PV[9] -= 2.5 * Math.max(0, -sin(f2)) * fl;
    pose(PV);
    arm(R.armN, PV[11], PV[12], 0, 0, 0);
    arm(R.armF, PV[13], PV[14], 0, 0, 0);
    R.hatA = PV[15]; R.hatY = PV[16]; R.hatS = PV[17]; R.tsx = 1; R.face = 2; R.yaw = 1; R.stars = 0; R.sackA = 0;
    R.vs = 0; R.pw = 0; R.flash = 0; R.spin = -0.32 * bump(k, 0.12, 0.95); R.rf.mode = '';
    if (wp) {
      for (let i = 13; i < 23; i++) wp[i] = SL[i][0][SL[i][1]];
      blendTo(wp, 1 - smooth(k / 0.22));
    }
  }

  function windowPose(st, L, cx, face, sdp, by, hx, time) {
    const hf = st.post;
    DPS.face = hf.face; DPS.lean = 0; DPS.wob = hf.wob; DPS.rb = 0; DPS.seed = hf.seed;
    postPose(DPS, L.win ? WLOOK.walker : LOOK.walker, 244, 179, 0, time);
    const m = (hf.face * POST_SCALE) / (face * sdp), s2 = POST_SCALE / sdp, ox = (cx - hx) / (face * sdp), oy = (WIN.bot - by) / sdp, flip = m < 0 ? -1 : 1;
    for (let i = 0; i < NSL; i++) {
      const sl = SL[i], key = sl[1];
      if (key === 'lean' || key === 'hang' || key === 'rot' || key === 'ang') WP[i] = sl[0][key] * flip;
      else if (key === 'hatA' || key === 'hatY' || key === 'hatS' || key === 'tsx' || key === 'sackA') WP[i] = sl[0][key];
      else if (key === 'px' || key === 'sx' || key === 'hx' || key === 'ax' || key === 'kx' || key === 'ex' || key === 'wx' || key === 'ox') WP[i] = ox + m * sl[0][key];
      else WP[i] = oy + s2 * sl[0][key];
    }
    return WP;
  }

  function crossfade(st, key, dt) {
    if (st.key !== key) {
      const had = st.key !== '';
      st.key = key;
      if (had && dt >= 0) { st.from.set(st.snap); st.fromGun = st.snapGun; st.xd = key === 'down' || key === 'bitten' || key === 'fall' ? 0.07 : 0.16; st.xf = 0; }
      else st.xf = 1;
    }
    if (st.xf < 1) {
      st.xf = Math.min(1, st.xf + Math.max(0, dt) / st.xd);
      const rf = R.rf, ox = rf.ox, oy = rf.oy, oa = rf.ang;
      blendTo(st.from, 1 - smooth(st.xf));
      if (st.fromGun !== rf.mode) { rf.ox = ox; rf.oy = oy; rf.ang = oa; }
    }
    grab(st.snap); st.snapGun = R.rf.mode;
  }

  function reattach(B) {
    const rf = R.rf;
    if (!rf.mode) return;
    const dx = rf.ox - B[0], dy = rf.oy - B[1], c = cos(B[2]), s = sin(B[2]);
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    rf.ox = R.px + lx * R.cl - ly * R.sl; rf.oy = R.py + lx * R.sl + ly * R.cl; rf.ang += R.lean - B[2];
  }

  function drawLeg(ctx, K, lg, far) {
    const L = K.L, kind = K.kind, f = far ? 0.76 : 1, ski = !!L.ski;
    let thigh = L.pants, shin = L.pants, boot = L.boots, bootF = 0.45, sock = null, blen = 7.6, bw = 5.8;
    if (kind === 'picker') { thigh = L.skirt; shin = L.pants; bootF = 0.72; blen = 7; bw = 6.2; }
    else if (kind === 'tourist' && !ski) { thigh = L.pants; shin = L.skin; bootF = 0.12; sock = '#f4f4f4'; }
    else if (ski) { bootF = 0.5; blen = 8.4; bw = 6.6; }
    else if (kind === 'ztmh') bootF = 0.52;
    else if (kind === 'poacher') bootF = L.win ? 0.5 : 0.4;
    else if (kind === 'walker' && L.win) bootF = 0.58;
    else if (kind === 'santa') bootF = 0.56;
    else if (kind === 'guest' || kind === 'waiter') bootF = L.bootF;
    const mid = (a, b, t) => a + (b - a) * t;
    if (kind === 'tourist' && !ski) {
      limb(ctx, R.px, R.py, mid(R.px, lg.kx, 0.9), mid(R.py, lg.ky, 0.9), 8.8, 7.4, dk(thigh, f));
      limb(ctx, mid(R.px, lg.kx, 0.9), mid(R.py, lg.ky, 0.9), lg.kx, lg.ky, 7.4, 6.6, dk(thigh, f));
      limb(ctx, lg.kx, lg.ky, lg.ax, lg.ay, 5.6, 4.2, dk(shin, f));
    } else {
      limb(ctx, R.px, R.py, lg.kx, lg.ky, ski ? 9 : 8.4, ski ? 7.4 : 6.8, dk(thigh, f));
      limb(ctx, lg.kx, lg.ky, lg.ax, lg.ay, ski ? 7.2 : 6.6, ski ? 5.6 : 4.8, dk(shin, f));
    }
    if (sock) limb(ctx, mid(lg.kx, lg.ax, 0.7), mid(lg.ky, lg.ay, 0.7), lg.ax, lg.ay, 4.8, 4.8, dk(sock, f));
    const bx = mid(lg.kx, lg.ax, 1 - bootF), by = mid(lg.ky, lg.ay, 1 - bootF);
    limb(ctx, bx, by, lg.ax, lg.ay, bw, 5, dk(boot, f));
    if (ski) {
      limb(ctx, mid(bx, lg.ax, 0.35), mid(by, lg.ay, 0.35), mid(bx, lg.ax, 0.45), mid(by, lg.ay, 0.45), bw + 0.2, bw, dk('#d6336c', f));
    }
    if (L.cuff) limb(ctx, bx, by, mid(bx, lg.ax, 0.12), mid(by, lg.ay, 0.12), bw + 0.9, bw + 0.8, dk(L.cuff, f * 0.97));
    shoe(ctx, lg, dk(boot, f), dk(L.sole, f), blen);
  }

  function drawArm(ctx, K, a, far) {
    const L = K.L, kind = K.kind, f = far ? 0.76 : 1, bare = kind === 'tourist' && !L.ski;
    const sleeve = bare ? L.skin : L.coat;
    const hand = L.glove || (kind === 'ztmh' ? '#16181a' : L.skin);
    limb(ctx, R.sx, R.sy, a.ex, a.ey, 5.8, 4.8, dk(sleeve, f));
    limb(ctx, a.ex, a.ey, a.wx, a.wy, 4.8, 3.8, dk(sleeve, f));
    if (bare) limb(ctx, R.sx, R.sy, R.sx + (a.ex - R.sx) * 0.55, R.sy + (a.ey - R.sy) * 0.55, 6.4, 6, dk(L.coat, f));
    if (kind === 'ztmh' && !far) limb(ctx, a.ex + (a.wx - a.ex) * 0.2, a.ey + (a.wy - a.ey) * 0.2, a.ex + (a.wx - a.ex) * 0.3, a.ey + (a.wy - a.ey) * 0.3, 4.9, 4.7, L.stripe);
    if (kind === 'picker' && !far) limb(ctx, a.ex + (a.wx - a.ex) * 0.62, a.ey + (a.wy - a.ey) * 0.62, a.wx, a.wy, 4.4, 4.1, dk(L.coat, 0.85));
    if (kind === 'santa' && (!far || !K.has)) limb(ctx, a.ex + (a.wx - a.ex) * 0.7, a.ey + (a.wy - a.ey) * 0.7, a.ex + (a.wx - a.ex) * 0.93, a.ey + (a.wy - a.ey) * 0.93, 5.6, 5.4, dk(L.trim, f));
    if (L.ski && !far) limb(ctx, a.ex + (a.wx - a.ex) * 0.86, a.ey + (a.wy - a.ey) * 0.86, a.wx, a.wy, 4.6, 4.4, '#2b3140');
    ctx.fillStyle = dk(hand, f);
    const dx = a.wx - a.ex, dy = a.wy - a.ey, d = hypot(dx, dy) || 1;
    circle(ctx, a.wx + dx / d * 1.2, a.wy + dy / d * 1.2, L.glove ? 2.7 : 2.5);
    if (far && R.vs > 0.3) {
      const g = atan2(dy, dx), n = 4.4 * smooth((R.vs - 0.3) / 0.4), bx = a.wx + dx / d * 2.4, by = a.wy + dy / d * 2.4;
      for (const o of [-0.34, 0.3]) limb(ctx, bx, by, bx + cos(g + o) * n, by + sin(g + o) * n, 1.5, 1.3, dk(hand, f));
    }
  }

  function torsoPath(ctx, belly) {
    ctx.beginPath();
    ctx.moveTo(-5.6, 3.2);
    ctx.quadraticCurveTo(-7.6, -6, -7.4, -16);
    ctx.quadraticCurveTo(-7.2, -22.4, -1.8, -23.6);
    ctx.quadraticCurveTo(3.2, -24, 6.2, -20.5);
    ctx.quadraticCurveTo(8.2, -13, 7.4 + belly, -6);
    ctx.quadraticCurveTo(7.6 + belly, 0, 5.8, 3.2);
    ctx.closePath();
  }

  function drawTorso(ctx, K, tm) {
    const L = K.L, kind = K.kind, win = !!L.win;
    ctx.save();
    ctx.translate(R.px, R.py); ctx.rotate(R.lean);
    if (R.tsx !== 1) ctx.scale(R.tsx, 1);
    ctx.fillStyle = L.coat;
    if (kind === 'poacher' && !win) {
      ell(ctx, -5.2, -16, 4.4, 5.2);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-5.6 + i * 3.6, 2.4); ctx.lineTo(-3.8 + i * 3.6, 6.4 - (i % 2) * 1.6); ctx.lineTo(-2 + i * 3.6, 2.4); ctx.fill(); }
    } else if (kind === 'picker') ell(ctx, -5.6, -15.5, 4.2, 5.4);
    else if (kind === 'guest' && L.top === 'hoodie') { ctx.fillStyle = dk(L.coat, 0.84); ell(ctx, -5, -22.2, 4.8, 3.9); ctx.fillStyle = L.coat; }
    torsoPath(ctx, L.belly); ctx.fill();
    ctx.save();
    torsoPath(ctx, L.belly); ctx.clip();
    if (kind === 'walker') {
      if (win) {
        ctx.strokeStyle = dk(L.coat, 0.8); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-7.4, -18); ctx.lineTo(-3, -18.6); ctx.moveTo(-7.6, -9); ctx.lineTo(-4.4, -9.4); ctx.stroke();
      }
      ctx.fillStyle = L.vest;
      ctx.beginPath();
      ctx.moveTo(-5.8, 3); ctx.quadraticCurveTo(-7, -6, -6.8, -15); ctx.quadraticCurveTo(-6.6, -21, -3.6, -22);
      ctx.lineTo(1.2, -17.8); ctx.lineTo(4.8, -20.4); ctx.quadraticCurveTo(7.8, -13, 7.1 + L.belly, -6);
      ctx.quadraticCurveTo(7.3 + L.belly, 0, 5.6, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.vest, 0.8);
      ctx.fillRect(1.2, -9.6, 5.4, 4.4); ctx.fillRect(-5.4, -9.6, 4, 4.4);
      ctx.fillStyle = dk(L.vest, 1.18); ctx.fillRect(1.4, -9.2, 4.8, 1);
      if (win) { ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.fillRect(-6.8, -13.6, 15 + L.belly, 1.1); }
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-7, -0.8, 16 + L.belly, 2.4);
      ctx.fillStyle = '#c9a647'; ctx.fillRect(3.4 + L.belly * 0.5, -0.6, 2.2, 2);
    } else if (kind === 'ztmh') {
      ctx.fillStyle = L.vest; ctx.fillRect(-8, -24, 17, 28);
      ctx.fillStyle = L.coat; ctx.fillRect(-2, -25, 4.4, 5.6);
      ctx.fillStyle = L.stripe; ctx.fillRect(-8, -14.6, 17, 3);
      ctx.fillRect(1.6, -22.5, 2.6, 9);
      const gx = -8 + frac(tm * 0.45 + K.seed) * 22;
      if (gx > -8 && gx < 7) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(gx, -14.6, 2.2, 3); }
      ctx.fillStyle = '#101214'; ctx.fillRect(-8, -1.2, 17, 2.8);
      ctx.fillStyle = '#1a1d20'; ctx.fillRect(2.5, -8, 5, 6); ctx.fillRect(-5.6, -7, 3.4, 5);
      ctx.fillStyle = '#20252a'; ctx.fillRect(-5.8, -21.5, 3.4, 2.6);
    } else if (kind === 'poacher') {
      if (win) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.9;
        ctx.beginPath(); for (let y = -19; y < 2; y += 4.2) { ctx.moveTo(-8, y); ctx.quadraticCurveTo(0, y + 1.2, 9, y); } ctx.stroke();
        ctx.fillStyle = '#3a3f46'; ctx.fillRect(4.6, -23, 1.1, 26);
        ctx.fillStyle = '#4a4f57'; ctx.fillRect(1.8, -10.5, 4.4, 4); ctx.fillStyle = '#2c3036'; ctx.fillRect(2, -10.2, 4, 0.8);
      } else {
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(2, -11, 5, 4); ctx.fillStyle = '#4c4c4c'; ctx.fillRect(2.2, -10.6, 4.4, 0.9);
        ctx.fillStyle = '#343a2c'; ctx.fillRect(-2.6, -25, 7.6, 4.4);
      }
      ctx.fillStyle = '#6b5a3a'; ctx.fillRect(-8, -1.6, 17, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-6, -21, 3, 20);
    } else if (kind === 'picker') {
      ctx.fillStyle = '#ece5d2'; rr(ctx, -0.6, -10.6, 9.6 + L.belly, 15, 2);
      ctx.fillStyle = '#d9d1bb'; ctx.fillRect(2.2, -5.6, 4.6, 3.2);
      ctx.fillStyle = dk(L.coat, 0.7);
      for (let i = 0; i < 3; i++) circle(ctx, 3.6, -20 + i * 3, 0.7);
    } else if (kind === 'tourist' && L.ski) {
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath(); ctx.moveTo(-8, -15); ctx.lineTo(9, -19.5); ctx.lineTo(9, -16.6); ctx.lineTo(-8, -12.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-8, -11.6); ctx.lineTo(9, -16); ctx.lineTo(9, -14.9); ctx.lineTo(-8, -10.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.coat, 0.78); ctx.fillRect(5.2, -23, 1, 26);
      ctx.fillStyle = dk(L.coat, 0.85); ctx.fillRect(-8, -2.4, 17, 5.6);
      ctx.fillStyle = '#f4f6f8'; rr(ctx, 1.6, -1.2, 3.6, 4.4, 0.6); ctx.fillStyle = '#1f78d1'; ctx.fillRect(2, -0.2, 2.8, 1);
    } else if (kind === 'tourist') {
      ctx.fillStyle = '#f3f6f9';
      ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(3.4, -17.5); ctx.lineTo(5.4, -13.6); ctx.lineTo(6.6, -15); ctx.lineTo(7.6, -12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3b3f4a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.2, -23); ctx.quadraticCurveTo(5.6, -20, 5.4, -10); ctx.lineTo(-3, -2); ctx.stroke();
    } else if (kind === 'santa') {
      ctx.strokeStyle = L.trim; ctx.lineWidth = 5.2;
      ctx.beginPath(); ctx.moveTo(5.2, -22.5); ctx.quadraticCurveTo(8.2, -13, 7.4 + L.belly, -6); ctx.quadraticCurveTo(7.6 + L.belly, 0, 5.8, 4); ctx.stroke();
      ctx.fillStyle = '#1d1917'; ctx.fillRect(-8, -2.4, 18 + L.belly, 3.2);
      ctx.fillStyle = '#e8c547'; rr(ctx, 2.6 + L.belly * 0.45, -3.2, 3.8, 4.8, 0.7);
      ctx.fillStyle = '#1d1917'; ctx.fillRect(3.5 + L.belly * 0.45, -1.9, 2, 2.2);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-6.2, -21, 2.6, 18);
    } else if (kind === 'guest') guestTop(ctx, L);
    else if (kind === 'waiter') waiterTop(ctx, L);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-9, -26, 5, 32);
    ctx.restore();
    ctx.restore();
  }

  function guestTop(ctx, L) {
    const b = L.belly;
    if (L.top === 'flannel') {
      ctx.fillStyle = L.check;
      for (let x = -7; x < 10; x += 4) ctx.fillRect(x, -26, 1.6, 31);
      for (let y = -21; y < 4; y += 4) ctx.fillRect(-9, y, 20, 1.6);
      ctx.fillStyle = dk(L.coat, 0.7);
      ctx.beginPath(); ctx.moveTo(0.4, -23.8); ctx.lineTo(4.4, -18.8); ctx.lineTo(6.4, -22.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#efe6d6'; for (let i = 0; i < 4; i++) circle(ctx, 5.4 + b * 0.22 * i, -17 + i * 4.4, 0.6);
      ctx.fillStyle = '#3b2a1e'; ctx.fillRect(-8, -1.2, 17 + b, 2.4);
      ctx.fillStyle = '#c9a647'; ctx.fillRect(3.6 + b * 0.5, -1, 2, 2);
    } else if (L.top === 'fleece') {
      ctx.fillStyle = dk(L.coat, 0.78); rr(ctx, -2.6, -25.8, 9.6, 4.2, 1.8);
      ctx.fillStyle = dk(L.coat, 0.6); ctx.fillRect(4.7, -22, 0.9, 25);
      ctx.fillStyle = '#e4ddcc'; ctx.fillRect(4.5, -22.4, 1.3, 2.4);
      ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(-7, -14, 16 + b, 1.1);
      ctx.fillStyle = '#f1ece0'; circle(ctx, 1.6, -16.6, 0.9);
    } else if (L.top === 'cardigan') {
      ctx.fillStyle = L.shirt;
      ctx.beginPath(); ctx.moveTo(0.2, -23.8); ctx.lineTo(6.4, -21.2); ctx.quadraticCurveTo(8 + b, -8, 7.4 + b, 3.4); ctx.lineTo(3, 3.4);
      ctx.quadraticCurveTo(4.2, -10, 0.2, -23.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a3a2c'; ctx.beginPath(); ctx.moveTo(4.2, -21.6); ctx.lineTo(5.6, -14); ctx.lineTo(6.6, -21); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.coat, 0.66); for (let i = 0; i < 4; i++) circle(ctx, 3.4 + i * 0.3, -15 + i * 4.4, 0.65);
      ctx.fillStyle = dk(L.coat, 0.84); rr(ctx, -5, -8.4, 5.2, 4.6, 1);
      ctx.strokeStyle = dk(L.coat, 0.9); ctx.lineWidth = 0.6;
      ctx.beginPath(); for (let y = -19; y < 2; y += 3) { ctx.moveTo(-7.6, y); ctx.lineTo(1.8, y + 0.6); } ctx.stroke();
    } else if (L.top === 'hoodie') {
      ctx.fillStyle = dk(L.coat, 0.82); rr(ctx, -0.6, -8.6, 8.8 + b, 6.6, 2.4);
      ctx.strokeStyle = '#f3efe6'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(2.8, -22.6); ctx.lineTo(3.2, -15.4); ctx.moveTo(5.6, -21.8); ctx.lineTo(6, -15); ctx.stroke();
      ctx.fillStyle = dk(L.coat, 0.88); ctx.fillRect(-8, 0.2, 17 + b, 3);
    }
  }

  function waiterTop(ctx, L) {
    const b = L.belly;
    ctx.fillStyle = L.vest;
    ctx.beginPath();
    ctx.moveTo(-5.8, 3); ctx.quadraticCurveTo(-7, -6, -6.8, -15); ctx.quadraticCurveTo(-6.6, -21, -3.6, -22.2);
    ctx.lineTo(1.6, -11.6); ctx.lineTo(5, -20.6); ctx.quadraticCurveTo(7.8, -13, 7.1 + b, -6);
    ctx.quadraticCurveTo(7.3 + b, 0, 5.6, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = L.trim; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-3.6, -22.2); ctx.lineTo(1.6, -11.6); ctx.lineTo(5, -20.6); ctx.stroke();
    const dots = [[5.4, -9, '#c0392b'], [5.9, -5, '#2f8f4e'], [5.8, -1.2, '#e3b33b'], [-4.6, -13, '#c0392b'], [-5, -7.6, '#2f8f4e']];
    for (const [x, y, c] of dots) { ctx.fillStyle = c; circle(ctx, x, y, 0.85); }
    ctx.fillStyle = L.trim;
    ctx.beginPath(); ctx.moveTo(2.6, -22.6); ctx.lineTo(0.4, -24); ctx.lineTo(0.6, -21.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.6, -22.6); ctx.lineTo(4.8, -24.2); ctx.lineTo(4.8, -21.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#121010'; ctx.fillRect(-8, -0.6, 17 + b, 2);
  }

  const Q = [0, 0], Q2 = [0, 0], SF = { ux: 0, uy: 1 };
  function P(a, b, o) { o[0] = R.px + SF.ux * a + SF.uy * b; o[1] = R.py + SF.uy * a - SF.ux * b; return o; }
  function drawSkirt(ctx, col, hem, hemW, lk, flare, plain) {
    const n = R.legN, f = R.legF;
    let ux = 0, uy = 1;
    if (R.free) { ux = (n.ax + f.ax) / 2 - R.px; uy = (n.ay + f.ay) / 2 - R.py; const ud = hypot(ux, uy) || 1; ux /= ud; uy /= ud; }
    SF.ux = ux; SF.uy = uy;
    const vx = uy, vy = -ux, len = lk * clamp(-R.py, 22, 36), mh = len * 0.3 / 0.53;
    const an = R.free ? (n.ax - R.px) * vx + (n.ay - R.py) * vy : n.ax, af = R.free ? (f.ax - R.px) * vx + (f.ay - R.py) * vy : f.ax;
    const fr = 9.2 * flare + Math.max(0, Math.max(an, af) - 4) * 0.35, bk = -9.4 * flare + Math.min(0, Math.min(an, af) + 4) * 0.35;
    ctx.fillStyle = col;
    ctx.beginPath();
    P(-3, -6.6, Q); ctx.moveTo(Q[0], Q[1]);
    P(-3, 7, Q); ctx.lineTo(Q[0], Q[1]);
    P(mh, 9 * flare, Q); P(len, fr, Q2); ctx.quadraticCurveTo(Q[0], Q[1], Q2[0], Q2[1]);
    P(len + 2.4, 1, Q); P(len, bk, Q2); ctx.quadraticCurveTo(Q[0], Q[1], Q2[0], Q2[1]);
    P(mh, -8.6 * flare, Q); P(-3, -6.6, Q2); ctx.quadraticCurveTo(Q[0], Q[1], Q2[0], Q2[1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hem; ctx.lineWidth = hemW;
    ctx.beginPath();
    P(len - 0.8, bk + 0.6, Q); ctx.moveTo(Q[0], Q[1]);
    P(len + 1.6, 1, Q); P(len - 0.8, fr - 0.6, Q2); ctx.quadraticCurveTo(Q[0], Q[1], Q2[0], Q2[1]);
    ctx.stroke();
    if (plain) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath();
    P(2, 1, Q); ctx.moveTo(Q[0], Q[1]); P(len - 2, 3, Q); ctx.lineTo(Q[0], Q[1]);
    P(2, -3, Q); ctx.moveTo(Q[0], Q[1]); P(len - 2, -5.4, Q); ctx.lineTo(Q[0], Q[1]);
    ctx.stroke();
  }

  function drawPack(ctx, K) {
    const L = K.L;
    ctx.save();
    ctx.translate(R.px, R.py); ctx.rotate(R.lean);
    ctx.fillStyle = dk(L.pack, 0.9); rr(ctx, -17, -22, 11.5, 19, 3.4);
    ctx.fillStyle = L.pack; rr(ctx, -17, -22, 9.5, 16, 3.4);
    ctx.fillStyle = dk(L.pack, 0.78); rr(ctx, -18.4, -13, 5, 8.6, 2);
    ctx.fillStyle = '#8d949c'; circle(ctx, -11.4, -25, 3.1);
    ctx.strokeStyle = '#6c737b'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(-11.4, -25, 1.6, 0.4, 4.6); ctx.stroke();
    ctx.restore();
  }

  function drawSkis(ctx, K, tm, st) {
    const L = K.L, w = smooth((-R.lean - 0.35) / 0.8), a = lerp(skiFrame(st), 0.03, w);
    ctx.save();
    ctx.translate(lerp(R.sx - 1.2, R.sx + 6, w), lerp(R.sy - 3.2, -1.6, w)); ctx.rotate(a);
    for (let i = 0; i < 2; i++) {
      const o = i ? -2.3 : 0, col = i ? dk(L.ski, 0.8) : L.ski;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-31, o - 1.1); ctx.lineTo(30, o - 1.1); ctx.quadraticCurveTo(35.5, o - 1.6, 36, o - 5.2);
      ctx.quadraticCurveTo(34, o - 2, 30, o + 1.1); ctx.lineTo(-31, o + 1.1); ctx.quadraticCurveTo(-33.4, o, -31, o - 1.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-26, o - 0.5, 50, 0.7);
    }
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(-6, -3.8, 7, 5.2);
    ctx.fillStyle = '#c92a2a'; ctx.fillRect(-5, -4.4, 2, 1);
    ctx.restore();
  }

  function drawSack(ctx, K) {
    const L = K.L, c = L.sack;
    ctx.save();
    ctx.translate(R.sx - 1, R.sy - 1.5); ctx.rotate(R.lean + R.sackA);
    ctx.fillStyle = dk(c, 0.82);
    ctx.beginPath(); ctx.moveTo(-1.5, -2.5); ctx.quadraticCurveTo(-20, 2, -19.5, 17); ctx.quadraticCurveTo(-18, 27, -8.5, 26.5);
    ctx.quadraticCurveTo(0.5, 25.5, -0.4, 13); ctx.quadraticCurveTo(-0.8, 3, 1.5, -1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-1.5, -2.2); ctx.quadraticCurveTo(-18, 2.6, -17.8, 16); ctx.quadraticCurveTo(-16.8, 24.2, -9, 24.2);
    ctx.quadraticCurveTo(-3.4, 23.6, -3.2, 13); ctx.quadraticCurveTo(-3, 3.4, 1.5, -1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dk(c, 0.7); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-12, 6); ctx.quadraticCurveTo(-10, 13, -11.6, 20); ctx.moveTo(-6.6, 4); ctx.quadraticCurveTo(-6, 12, -7.4, 21); ctx.stroke();
    ctx.fillStyle = '#d63a2f'; circle(ctx, -13.4, 11, 1.2); ctx.fillStyle = '#2f9e44'; circle(ctx, -9.6, 16.4, 1.1); ctx.fillStyle = '#f2c230'; circle(ctx, -14.2, 18.6, 1);
    ctx.restore();
  }

  function drawSackNeck(ctx, K) {
    const a = R.armF, c = K.L.sack;
    ctx.strokeStyle = dk(c, 0.75); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(R.sx - 2.4, R.sy - 3.4); ctx.quadraticCurveTo(R.sx + 1, R.sy - 6.4, a.wx, a.wy); ctx.stroke();
    ctx.fillStyle = dk(c, 0.9); ell(ctx, R.sx - 2.6, R.sy - 2.6, 2.6, 1.9, R.lean);
  }

  function drawHead(ctx, K, tm) {
    const L = K.L, kind = K.kind, yaw = R.yaw, fc = R.face, win = !!L.win, mask = kind === 'poacher' && win;
    const skin = L.skin, skinD = dk(skin, 0.86);
    ctx.save();
    ctx.translate(R.hx, R.hy); ctx.rotate(R.hang);
    ctx.fillStyle = mask ? L.mask : skinD; ctx.fillRect(-3.4, 3, 6.4, 9.5);
    if (kind === 'poacher' && !win) { ctx.fillStyle = '#343a2c'; rr(ctx, -4.4, 6.4, 9.4, 5, 2); }
    if (L.gaiter) {
      ctx.fillStyle = L.gaiter; rr(ctx, -4.6, 4.6, 10.4, 8.4, 2.6);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-3.6, 7.2, 8.4, 0.8);
    }
    if (L.fur) {
      ctx.fillStyle = L.fur; rr(ctx, -6.2, 8.2, 13, 4.8, 2.4);
      ctx.fillStyle = dk(L.fur, 0.82); circle(ctx, -3.4, 10.2, 0.8); circle(ctx, 0.4, 11, 0.8); circle(ctx, 3.8, 10.2, 0.8);
    }
    if (kind !== 'picker' && !mask) {
      ctx.fillStyle = L.hair; ell(ctx, -4.4 * yaw, 1.8, 3.3, 4.7);
      if (kind === 'poacher') {
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6.8, -0.5 + i * 3); ctx.lineTo(-10.2 + i * 0.6, 1.6 + i * 3.2); ctx.lineTo(-5.6, 2.6 + i * 3); ctx.fill(); }
      }
    }
    ctx.fillStyle = mask ? L.mask : skin; circle(ctx, 0, 0, D.hr);
    ctx.fillStyle = mask ? dk(L.mask, 1.3) : skinD; circle(ctx, -1.6 * yaw, 1, 1.8);
    ctx.fillStyle = mask ? L.mask : kind === 'santa' ? '#eeaa8c' : skin; circle(ctx, 7.2 * yaw, 1.1, 1.9);
    if (mask) {
      ctx.fillStyle = skin; ell(ctx, 3.9 * yaw, -1, 3.5, 2.1);
      ctx.fillStyle = dk(skin, 0.8); ell(ctx, 4.6 * yaw, 4.5, 1.7, 1.15);
    }
    if (kind === 'poacher' && !win) {
      ctx.fillStyle = 'rgba(52,38,26,0.5)';
      ctx.beginPath(); ctx.arc(0, 0, D.hr, 0.15, 1.9); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
    }
    if (kind === 'picker' || kind === 'tourist' || kind === 'santa' || L.blush) { ctx.fillStyle = 'rgba(224,110,110,0.32)'; circle(ctx, 3 * yaw, 3, 1.7); }
    const ex = 3.5 * yaw, blink = frac(tm / 3.7 + K.seed) < 0.025;
    const eye = '#2a1d12';
    if (fc === 3) {
      ctx.strokeStyle = eye; ctx.lineWidth = 0.95; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 1.5, -2.2); ctx.lineTo(ex + 1.4, 0.8); ctx.moveTo(ex + 1.4, -2.2); ctx.lineTo(ex - 1.5, 0.8); ctx.stroke();
    } else if (fc === 4) {
      ctx.strokeStyle = eye; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, -1.3, 1.35, 0.25, PI - 0.25); ctx.stroke();
    } else if (fc === 6 && !K.glasses) {
      ctx.strokeStyle = eye; ctx.lineWidth = 0.95; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, 0.1, 1.4, PI + 0.3, -0.3); ctx.stroke();
    } else if (fc === 2) {
      ctx.fillStyle = '#fff'; ell(ctx, ex + 0.2, -1, 2.3, 2.5); ctx.fillStyle = eye; circle(ctx, ex + 0.6, -0.9, 0.8);
    } else if (fc === 1) {
      ctx.fillStyle = '#fff'; circle(ctx, ex, -0.8, 2); ctx.fillStyle = eye; circle(ctx, ex + 0.6, -0.7, 1);
    } else if (K.glasses) {
      ctx.fillStyle = '#16181c'; rr(ctx, ex - 2.8, -2.6, 7.2, 3.6, 1.4);
      ctx.fillStyle = 'rgba(180,220,255,0.55)'; ctx.fillRect(ex - 1.8, -2, 2, 0.9);
    } else {
      ctx.fillStyle = eye;
      if (blink || K.squint) ctx.fillRect(ex - 1.2, -0.6, 2.6, 0.9); else circle(ctx, ex, -0.6, 1.05);
    }
    if (K.glasses && fc >= 3) {
      ctx.save(); ctx.translate(ex + 1, -0.4); ctx.rotate(0.42);
      ctx.fillStyle = '#16181c'; rr(ctx, -3.6, -0.6, 7.2, 3.4, 1.4);
      ctx.restore();
    }
    const brow = kind === 'picker' ? '#9a9a9a' : kind === 'santa' ? '#ffffff' : dk(L.hair, 0.8);
    ctx.strokeStyle = brow; ctx.lineWidth = kind === 'poacher' ? 1.3 : kind === 'santa' ? 1.6 : 0.9; ctx.lineCap = 'round';
    ctx.beginPath();
    if (fc === 2) { ctx.moveTo(ex - 2, -4.6); ctx.quadraticCurveTo(ex, -6, ex + 2.2, -5); }
    else if (fc === 1) { ctx.moveTo(ex - 2, -4.2); ctx.lineTo(ex + 2, -4.8); }
    else if (fc === 4) { ctx.moveTo(ex - 2, -3.6); ctx.lineTo(ex + 2, -3); }
    else if (fc === 3) { ctx.moveTo(ex - 2, -3.6); ctx.lineTo(ex + 2, -3.6); }
    else if (fc >= 5) { ctx.moveTo(ex - 2, -3.8); ctx.quadraticCurveTo(ex, -5, ex + 2.1, -3.9); }
    else if (kind === 'poacher') { ctx.moveTo(ex - 2.6, -3.1); ctx.lineTo(ex + 2.3, -1.9); }
    else { ctx.moveTo(ex - 2, -3.2); ctx.lineTo(ex + 2, -3.4); }
    ctx.stroke();
    if (kind === 'santa') beard(ctx, L, yaw);
    ctx.fillStyle = '#7a3b32';
    if (fc === 2) ell(ctx, 4.7 * yaw, kind === 'santa' ? 5.6 : 4.6, 1.6, 2.2);
    else if (fc === 1) ell(ctx, 4.8 * yaw, kind === 'santa' ? 5.4 : 4.3, 1.3, 1.9);
    else if (fc === 3) { ell(ctx, 4.6 * yaw, 4.5, 1.3, 1); ctx.fillStyle = '#d9767a'; ell(ctx, 5.2 * yaw, 5.2, 0.9, 0.7); }
    else if (fc === 4) {
      ctx.strokeStyle = '#7a3b32'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(3 * yaw, 4.6); ctx.quadraticCurveTo(4 * yaw, 3.8, 4.8 * yaw, 4.6); ctx.quadraticCurveTo(5.6 * yaw, 5.3, 6.2 * yaw, 4.4); ctx.stroke();
    } else if (fc === 5) {
      ctx.beginPath(); ctx.moveTo(2.2 * yaw, 3.7); ctx.quadraticCurveTo(4.6 * yaw, 4, 7 * yaw, 3.3); ctx.quadraticCurveTo(6.4 * yaw, 7.4, 3.8 * yaw, 6.6); ctx.quadraticCurveTo(2.4 * yaw, 5.8, 2.2 * yaw, 3.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbfaf6'; ctx.beginPath(); ctx.moveTo(2.6 * yaw, 3.9); ctx.quadraticCurveTo(4.7 * yaw, 4.2, 6.7 * yaw, 3.6); ctx.lineTo(6.5 * yaw, 4.6); ctx.quadraticCurveTo(4.6 * yaw, 5.1, 2.9 * yaw, 4.8); ctx.closePath(); ctx.fill();
    } else if (fc === 6) {
      ctx.strokeStyle = '#7a3b32'; ctx.lineWidth = 0.95;
      ctx.beginPath(); ctx.moveTo(2.6 * yaw, 3.9); ctx.quadraticCurveTo(4.6 * yaw, 6.2, 6.6 * yaw, 3.6); ctx.stroke();
    } else if (kind !== 'santa') ctx.fillRect(3.4 * yaw, 4, 2.4 * yaw, 0.8);
    if (kind === 'walker') { ctx.fillStyle = '#5a3a24'; ell(ctx, 5 * yaw, 2.9, 3.1, 1.2); }
    else if (L.stache && (fc === 0 || fc >= 5)) { ctx.fillStyle = dk(L.hair, 0.82); ell(ctx, 5 * yaw, 2.9, 3, 1.15); }
    if (kind === 'santa') { ctx.fillStyle = '#ffffff'; ell(ctx, 5 * yaw, 3, 3, 1.55, -0.3); ell(ctx, 7.9 * yaw, 3.4, 2.1, 1.35, 0.35); ctx.fillStyle = '#e4e0d7'; ell(ctx, 6.4 * yaw, 3.9, 1.6, 0.5); }
    if (kind !== 'picker' && !((kind === 'guest' || kind === 'waiter') && !L.hat) && (R.hatA || R.hatY || R.hatS !== 1)) {
      const hk = kind === 'ztmh' && !win ? 2.4 : mask ? 0.35 : 1;
      ctx.save(); ctx.translate(0, R.hatY * (mask ? 0.4 : 1) - 4); ctx.rotate(R.hatA * hk); ctx.scale(1, R.hatS); ctx.translate(0, 4);
      hat(ctx, K, tm);
      ctx.restore();
    } else hat(ctx, K, tm);
    ctx.restore();
  }

  const BEARD = [[0, 3.6, 2.3], [-0.4, 7.4, 2.7], [0.8, 11.2, 2.8], [3, 14.4, 2.7], [6, 14, 2.4], [8.4, 10.8, 2.5], [9.4, 7, 2.2], [9, 4.2, 1.7]];
  function beard(ctx, L, yaw) {
    ctx.fillStyle = L.hair;
    ctx.beginPath();
    ctx.moveTo(0.4, -1.4);
    ctx.quadraticCurveTo(-2.4, 6, 0.4, 12.6);
    ctx.quadraticCurveTo(3, 17.6, 6, 15.2);
    ctx.quadraticCurveTo(10.2, 11, 9.6, 4.6);
    ctx.quadraticCurveTo(8.4, 2.4, 6, 3.2);
    ctx.quadraticCurveTo(3.4, 2.6, 2.2, 0.6);
    ctx.closePath(); ctx.fill();
    for (const [x, y, r] of BEARD) circle(ctx, x, y, r);
    ctx.strokeStyle = '#dedad1'; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(1.8, 6.4); ctx.quadraticCurveTo(2.2, 10, 3.4, 13.2); ctx.moveTo(4.8, 7); ctx.quadraticCurveTo(5.4, 10, 5.2, 12.4);
    ctx.moveTo(7.2, 6.2); ctx.quadraticCurveTo(7.4, 8.2, 6.8, 10); ctx.stroke();
  }

  function hat(ctx, K, tm) {
    const L = K.L, kind = K.kind, yaw = R.yaw, win = !!L.win;
    if (kind === 'walker') {
      ctx.save(); ctx.rotate(-0.07);
      if (win) {
        ctx.fillStyle = dk(L.hat, 0.82);
        ctx.beginPath(); ctx.moveTo(-6.8, -5); ctx.quadraticCurveTo(-9.6, 0, -7.4, 5); ctx.lineTo(-3.4, 4.4); ctx.lineTo(-3.2, -4.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = L.fur; rr(ctx, -4.6, -4.8, 5.6, 10.4, 2.6);
        for (let y = -2.6; y < 5; y += 2.2) circle(ctx, -4.4, y, 1.1);
        ctx.fillStyle = dk(L.fur, 0.86); ctx.fillRect(-3, -2, 2.6, 0.7); ctx.fillRect(-3, 1, 2.6, 0.7);
        ctx.fillStyle = L.hat;
        ctx.beginPath(); ctx.moveTo(-7.2, -5); ctx.quadraticCurveTo(-7.8, -13, 0.2, -13.1); ctx.quadraticCurveTo(8, -12.8, 7.6, -5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = dk(L.hat, 1.22); ctx.fillRect(-4.8, -11.6, 2.6, 0.9);
        ctx.fillStyle = dk(L.fur, 0.88); rr(ctx, -8, -6.6, 16.4, 2.6, 1.3);
        ctx.fillStyle = L.fur; for (let x = -7.2; x < 8; x += 1.8) circle(ctx, x, -6.1 + (x * 7.3 % 1.2) * 0.3, 1.55);
      } else {
        ctx.fillStyle = dk(L.hat, 0.85); ell(ctx, 0.6, -4.6, 10.6, 2.3);
        ctx.fillStyle = L.hat;
        ctx.beginPath(); ctx.moveTo(-6.4, -4.7); ctx.lineTo(-5.2, -11.6); ctx.quadraticCurveTo(0, -12.6, 5.6, -11.4); ctx.lineTo(6.8, -4.7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a5c3a'; ctx.fillRect(-6.5, -6.6, 13.3, 2);
        ctx.fillStyle = dk(L.hat, 1.25); ctx.fillRect(-4.8, -11, 2.6, 0.9);
      }
      const fs = K.fs || (K.small ? 0.6 : 1);
      ctx.translate(-3.6, -6.4); ctx.scale(fs, fs); ctx.translate(3.6, 6.4);
      if (win) ctx.translate(-0.6, -0.8);
      ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3.6, -6.4); ctx.quadraticCurveTo(-8.6, -10, -11.4, -17); ctx.stroke();
      ctx.fillStyle = '#d9c28c';
      ctx.beginPath(); ctx.moveTo(-4, -7); ctx.quadraticCurveTo(-9, -9, -12.6, -17.6); ctx.quadraticCurveTo(-7.6, -14, -2.6, -6.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#a07a40'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-6.6, -9.6); ctx.lineTo(-4.4, -9.4); ctx.moveTo(-9, -12.6); ctx.lineTo(-6.8, -12); ctx.stroke();
      ctx.restore();
    } else if (kind === 'ztmh') {
      if (win) {
        ctx.fillStyle = L.hat;
        ctx.beginPath(); ctx.moveTo(-7.6, -2.4); ctx.quadraticCurveTo(-8.2, -12.6, 0, -12.4); ctx.quadraticCurveTo(8, -12.2, 7.6, -2.8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = dk(L.hat, 1.6); rr(ctx, -8, -5.4, 16, 3.4, 1.5);
        ctx.strokeStyle = dk(L.hat, 1.25); ctx.lineWidth = 0.6;
        ctx.beginPath(); for (let x = -6.4; x < 7; x += 1.8) { ctx.moveTo(x, -5.1); ctx.lineTo(x, -2.3); } ctx.stroke();
        ctx.fillStyle = '#e8d477'; circle(ctx, 4.4, -3.7, 0.8);
      } else {
        ctx.fillStyle = L.hat;
        ctx.beginPath(); ctx.moveTo(-7.6, -2.2); ctx.quadraticCurveTo(-7.8, -10.6, 0, -10.6); ctx.quadraticCurveTo(7.8, -10.6, 7.6, -2.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#16221a'; ctx.beginPath(); ctx.moveTo(4, -4.4); ctx.lineTo(12.2, -3.4); ctx.quadraticCurveTo(12.6, -2, 11, -1.9); ctx.lineTo(4, -2.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8d477'; circle(ctx, 3.4, -6.8, 1.3);
        ctx.fillStyle = dk(L.hat, 1.4); ctx.fillRect(-7.4, -3.6, 15, 1);
      }
    } else if (kind === 'poacher') {
      if (win) {
        ctx.fillStyle = L.hat;
        ctx.beginPath();
        ctx.moveTo(6.6, -5.6); ctx.quadraticCurveTo(3.4, -11, -3.4, -10.6); ctx.quadraticCurveTo(-10.8, -9, -10.4, 0.4);
        ctx.quadraticCurveTo(-10, 8.4, -4.4, 11.6); ctx.lineTo(-1.4, 9.2); ctx.quadraticCurveTo(-5.4, 4.6, -5.2, -0.8);
        ctx.quadraticCurveTo(-4.8, -7.4, 1.6, -7.6); ctx.quadraticCurveTo(4.8, -7.6, 6.6, -5.6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dk(L.hat, 1.45); ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(6.2, -5.8); ctx.quadraticCurveTo(4.8, -7.8, 1.6, -7.8); ctx.quadraticCurveTo(-5, -7.4, -5.4, -0.8); ctx.quadraticCurveTo(-5.6, 4.6, -1.6, 9.2); ctx.stroke();
      } else {
        ctx.fillStyle = L.hat;
        ctx.beginPath(); ctx.moveTo(-7.8, -3); ctx.quadraticCurveTo(-8.2, -11.4, 0, -11.6); ctx.quadraticCurveTo(8.2, -11.4, 7.8, -3.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#272b31'; rr(ctx, -8.2, -6.4, 16.6, 3.6, 1.4);
        ctx.strokeStyle = '#33383f'; ctx.lineWidth = 0.7;
        ctx.beginPath(); for (let x = -6; x < 8; x += 2.4) { ctx.moveTo(x, -6.2); ctx.lineTo(x, -3.2); } ctx.stroke();
      }
    } else if (kind === 'picker') {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(6, -3.4); ctx.quadraticCurveTo(7.8, -8, 1, -9.4); ctx.quadraticCurveTo(-8.4, -9, -8.2, 0.5);
      ctx.quadraticCurveTo(-8.4, 4.5, -5.4, 6.4); ctx.lineTo(-2.4, 3.6); ctx.lineTo(-1.2, -2); ctx.quadraticCurveTo(2, -1.6, 6, -3.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6.2, 4.6); ctx.lineTo(-10.4, 8.4); ctx.lineTo(-7.2, 8.6); ctx.lineTo(-4.2, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6.2, 4.6); ctx.lineTo(-11.4, 5.4); ctx.lineTo(-8.2, 2.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6e9e4';
      [[-3.4, -6.4], [0.8, -7.8], [-5.8, -2.4], [3.4, -5], [-5.4, 2.8], [-8.6, 6.8]].forEach(([x, y]) => circle(ctx, x, y, 0.85));
      ctx.fillStyle = L.hair; ctx.fillRect(4.6, -4.2, 1.4, 1.8);
    } else if (kind === 'tourist' && L.ski) {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-7.5, -2.6); ctx.quadraticCurveTo(-8, -12.8, 0, -12.7); ctx.quadraticCurveTo(7.7, -12.5, 7.4, -3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d6336c'; rr(ctx, -7.4, -9.4, 14.6, 1.9, 0.9);
      ctx.fillStyle = dk(L.hat, 0.86); rr(ctx, -7.9, -5, 15.6, 3.1, 1.4);
      ctx.fillStyle = '#ffffff'; circle(ctx, -3, -13.6, 2.9);
      ctx.fillStyle = '#e9ecef'; circle(ctx, -3.8, -12.9, 1.2);
      ctx.fillStyle = '#2b2f36'; rr(ctx, -7.7, -8.3, 12, 2.2, 1);
      ctx.fillStyle = '#ff9f1c'; rr(ctx, 2.4, -9.6, 5.8, 3.8, 1.7);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(3.6, -9, 2.2, 0.8);
    } else if (kind === 'tourist') {
      ctx.fillStyle = L.hat; ell(ctx, 0.4, -4.6, 10.4, 2.6);
      ctx.beginPath(); ctx.moveTo(-6, -4.8); ctx.quadraticCurveTo(-6.4, -10.8, 0, -10.8); ctx.quadraticCurveTo(6.4, -10.8, 6.6, -4.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-6.1, -6.6, 12.8, 1.8);
      ctx.fillStyle = dk(L.hat, 0.9); ell(ctx, 4.6, -3.6, 6, 1);
    } else if (kind === 'santa') {
      const sw = sin(tm * 2.1 + K.seed) * 0.6;
      ctx.fillStyle = dk(L.hat, 0.85);
      ctx.beginPath(); ctx.moveTo(-6.8, -6); ctx.quadraticCurveTo(-11, -9.6, -12.2 + sw * 0.3, -3.8 + sw); ctx.lineTo(-9.6 + sw * 0.3, -3.4 + sw); ctx.quadraticCurveTo(-9, -6.6, -4, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-7.2, -5.6); ctx.quadraticCurveTo(-7.4, -13.4, 0.6, -13.6); ctx.quadraticCurveTo(5.4, -13.4, 7.4, -5.6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1.6, -13.2); ctx.quadraticCurveTo(-8.6, -13.8, -11.4 + sw * 0.3, -5.4 + sw); ctx.lineTo(-8.2, -6); ctx.quadraticCurveTo(-7.6, -10.4, -1.4, -10.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-4.6, -12, 3, 0.9);
      ctx.fillStyle = L.trim; rr(ctx, -8.2, -7.6, 16.4, 3.8, 1.9);
      ctx.fillStyle = '#e6e1d6'; for (let x = -6.6; x < 7; x += 2.8) circle(ctx, x, -5.7, 0.6);
      ctx.fillStyle = L.trim; circle(ctx, -11.2 + sw * 0.3, -3.6 + sw, 2.6);
    } else if (kind === 'guest' || kind === 'waiter') hairdo(ctx, K, tm);
  }

  function hairdo(ctx, K, tm) {
    const L = K.L, d = L.hairdo;
    if (d === 'cap') {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-7.5, -2.2); ctx.quadraticCurveTo(-7.9, -11, 0, -11); ctx.quadraticCurveTo(7.3, -10.8, 7.6, -3.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.hat, 0.78);
      ctx.beginPath(); ctx.moveTo(4.4, -4.8); ctx.lineTo(13.2, -3.6); ctx.quadraticCurveTo(13.6, -2.1, 11.8, -1.9); ctx.lineTo(4.2, -2.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(ctx, 1, -8.6, 3.6, 2.4, 0.8);
      ctx.fillStyle = dk(L.hat, 1.25); circle(ctx, -0.4, -10.8, 1.1);
      return;
    }
    if (d === 'flatcap') {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-7.7, -2.6); ctx.quadraticCurveTo(-8.3, -9.8, -0.4, -10.3); ctx.quadraticCurveTo(7.6, -10.5, 10.8, -5.6);
      ctx.quadraticCurveTo(10.6, -3.7, 7.6, -3.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.hat, 0.76); ctx.fillRect(-7.7, -4.6, 15.6, 1.5);
      ctx.strokeStyle = dk(L.hat, 1.25); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-5, -8.6); ctx.quadraticCurveTo(1, -9.6, 7.6, -6.4); ctx.moveTo(-6.4, -6.4); ctx.quadraticCurveTo(0.6, -7.6, 8.8, -5); ctx.stroke();
      return;
    }
    ctx.fillStyle = L.hair;
    ctx.beginPath(); ctx.moveTo(-7.4, 2); ctx.quadraticCurveTo(-8.6, -8.8, -0.2, -8.7); ctx.quadraticCurveTo(6.7, -8.5, 7.3, -4.1);
    ctx.quadraticCurveTo(3.8, -6.5, 0.2, -5.4); ctx.quadraticCurveTo(-3.2, -4.4, -4.6, 2.2); ctx.closePath(); ctx.fill();
    if (d === 'pony') {
      const sw = sin(tm * 3 + K.seed) * 0.12 + (K.panic ? sin(tm * 15 + K.seed) * 0.4 : 0);
      ctx.save(); ctx.translate(-6.2, -4.4); ctx.rotate(0.55 + sw);
      ctx.beginPath(); ctx.moveTo(-1.4, -1.4); ctx.quadraticCurveTo(-5.8, 2.4, -3.2, 10.2); ctx.quadraticCurveTo(-0.2, 6.2, 1.6, 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d6336c'; circle(ctx, -0.2, -0.4, 1.35);
      ctx.restore();
    } else if (d === 'slick') {
      ctx.fillStyle = 'rgba(255,255,255,0.24)'; ctx.fillRect(-3.6, -7.7, 5.2, 0.8);
    }
  }

  function drawRifle(ctx, rf, tm) {
    const kind = rf.mode, tac = kind === 'tac', old = kind === 'old';
    ctx.save();
    ctx.translate(rf.ox, rf.oy); ctx.rotate(rf.ang);
    if (rf.sx !== undefined && rf.sx !== 1) ctx.scale(Math.abs(rf.sx) < 0.04 ? (rf.sx < 0 ? -0.04 : 0.04) : rf.sx, 1);
    const wood = old ? '#6b4423' : '#7a4a28', steel = old ? '#4a4038' : '#2c3036';
    if (tac) {
      ctx.fillStyle = '#1d2023';
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(13, -2.2); ctx.lineTo(15, 3.4); ctx.lineTo(11.6, 3.4); ctx.lineTo(9.8, 7.6); ctx.lineTo(7.4, 7.6); ctx.lineTo(8.4, 2.6); ctx.lineTo(0, 4.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#272c31'; ctx.fillRect(14, -2.4, 12, 4.8); ctx.fillStyle = '#15181b'; ctx.fillRect(18, 2.2, 4.4, 7);
      ctx.fillStyle = '#2f353b'; ctx.fillRect(26, -1.2, 12, 2.2); ctx.fillStyle = '#1a1d20'; ctx.fillRect(37.6, -1.6, 4, 3);
      ctx.fillStyle = '#15181b'; rr(ctx, 15, -5.8, 9.6, 3.4, 1.2); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(23.6, -5.2, 1, 2.2);
    } else {
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.moveTo(0, -0.5); ctx.lineTo(5, -2.2); ctx.lineTo(13, -1.5); ctx.lineTo(15.5, -1.2); ctx.lineTo(15.5, 1.6); ctx.lineTo(13.6, 2); ctx.lineTo(13, 4.6);
      ctx.lineTo(11.4, 4.8); ctx.lineTo(10.2, 2.6); ctx.lineTo(6.5, 2.4); ctx.lineTo(2, 3.6); ctx.lineTo(0, 4.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(wood, 1.3); ctx.fillRect(4, -1.8, 8, 0.8);
      ctx.fillStyle = steel; ctx.fillRect(15, -1.9, 9.5, 3.3);
      ctx.fillStyle = dk(wood, 1.12); ctx.fillRect(24.5, -0.6, 8, 2.2);
      ctx.fillStyle = dk(steel, 1.5); ctx.fillRect(24.5, -0.9, 17.5, 1.4); ctx.fillStyle = '#111'; ctx.fillRect(41, -1.1, 1.2, 1.8);
      if (!old) {
        ctx.fillStyle = '#181a1d'; rr(ctx, 16.5, -5.8, 11, 2.8, 1.2); ctx.fillRect(18, -3.4, 1.2, 1.6); ctx.fillRect(24, -3.4, 1.2, 1.6);
        ctx.fillStyle = 'rgba(190,225,255,0.8)'; ctx.fillRect(26.6, -5.4, 0.9, 2);
      } else { ctx.fillStyle = '#b9b49a'; ctx.fillRect(26, -0.9, 2.2, 2.4); }
    }
    if (rf.kick > 0.35) {
      const k = (rf.kick - 0.35) / 0.65, r = 4 + 8 * k;
      ctx.fillStyle = 'rgba(255,190,60,' + (0.6 + 0.4 * k).toFixed(2) + ')';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * PI / 8, rr2 = i % 2 ? r * 0.42 : r; ctx.lineTo(43 + cos(a) * rr2 * 1.15, sin(a) * rr2); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6c8'; circle(ctx, 43, 0, 1.8 + 2.4 * k);
    }
    ctx.restore();
  }

  const CAPS = ['#8a4b2a', '#e29a2e', '#9b5b32'];
  function mushroom(ctx, x, y, r, i, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(-0.9, 0, 1.8, 4);
    ctx.fillStyle = CAPS[i % 3]; ctx.beginPath(); ctx.ellipse(0, 0.4, r, r * 0.7, 0, PI, 0); ctx.fill();
    ctx.restore();
  }
  function basketBody(ctx) {
    ctx.fillStyle = '#b88a4a';
    ctx.beginPath(); ctx.moveTo(-9, 2.6); ctx.lineTo(9, 2.6); ctx.quadraticCurveTo(8.4, 12, 0, 12.4); ctx.quadraticCurveTo(-8.4, 12, -9, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8f6730'; ctx.fillRect(-9.4, 2, 18.8, 1.8);
    ctx.strokeStyle = '#8f6730'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -6; i <= 6; i += 3) { ctx.moveTo(i, 4); ctx.lineTo(i * 0.8, 11.6); }
    ctx.moveTo(-8.4, 6.6); ctx.lineTo(8.4, 6.6); ctx.moveTo(-7.4, 9.4); ctx.lineTo(7.4, 9.4); ctx.stroke();
    ctx.strokeStyle = '#7a5528'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8.4, 2.6); ctx.quadraticCurveTo(0, -9.4, 8.4, 2.6); ctx.stroke();
  }

  function drawBasket(ctx, K, tm) {
    const b = R.basket;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.ang);
    [[-4, 0.5, 2.7], [0.6, -1.4, 3.1], [4.6, 0, 2.5]].forEach(([x, y, r], i) => mushroom(ctx, x, y, r, i, 0));
    basketBody(ctx);
    ctx.restore();
  }

  function drawPhone(ctx, K, tm, film) {
    const p = R.phone;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.fillStyle = '#17181c'; rr(ctx, -1.5, -8.2, 3, 9.8, 1);
    ctx.fillStyle = '#7fd0ff'; ctx.fillRect(-1.5, -7.2, 0.8, 7.8);
    if (film) {
      ctx.fillStyle = frac(tm * 1.1) < 0.62 ? '#ff3b30' : '#7a1d18';
      circle(ctx, 0.4, -10.6, 1.25);
    }
    if (R.flash > 0.01) {
      const f = R.flash, r = 3 + 11 * f;
      ctx.fillStyle = 'rgba(255,255,240,' + (0.35 * f).toFixed(3) + ')'; circle(ctx, 2, -6.5, r * 1.3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i * PI) / 8 + 0.2, q = i % 2 ? r * 0.3 : r; ctx.lineTo(2 + cos(a) * q, -6.5 + sin(a) * q); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = K.L.glove || K.L.skin;
    circle(ctx, p.x, p.y + 0.4, 2.4);
  }

  function drawStars(ctx, a, tm, sd) {
    const cx = R.hx, cy = R.hy - 13.5;
    for (let i = 0; i < 3; i++) {
      const t = tm * 4.4 + sd + (i * TAU) / 3, z = sin(t), s = a * (0.8 + 0.22 * z);
      star(ctx, cx + cos(t) * 11.5, cy + z * 3, 3.7 * s, tm * 2.2 + i);
      ctx.fillStyle = z > 0 ? '#ffe066' : '#f5c33b'; ctx.fill();
      ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }

  const K = {
    kind: 'walker', L: LOOK.walker, state: 'idle', face: 1, seed: 0, tx: 200, ty: -48,
    panic: false, glasses: false, squint: false, small: false, kick: 0, armed: true, has: true, film: false, slope: 0, balance: false,
  };

  function mugArt(ctx, x, y, a, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(236,242,240,0.95)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(-3.3, -3.4, 2, PI * 0.5, PI * 1.5); ctx.stroke();
    ctx.fillStyle = 'rgba(236,242,240,0.92)'; rr(ctx, -2.9, -7.3, 5.8, 7.8, 0.9);
    ctx.fillStyle = '#e8a033'; ctx.fillRect(-2.2, -5.6, 4.4, 5.4);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-1.8, -5.2, 0.9, 4.6);
    ctx.fillStyle = '#fffaf0'; circle(ctx, -1.4, -6.6, 1.6); circle(ctx, 0.5, -7.1, 1.8); circle(ctx, 2, -6.5, 1.4);
    ctx.restore();
  }

  function plateArt(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#c9c4b8'; ell(ctx, 0, 0.4, 10.4, 2.6);
    ctx.fillStyle = '#f7f5ef'; ell(ctx, 0, -0.2, 10, 2.2);
    ctx.fillStyle = '#e9dbb0'; ell(ctx, 0, -2.6, 7.2, 3.4);
    ctx.fillStyle = '#f8f1dc';
    circle(ctx, -4, -3.2, 1.7); circle(ctx, -1.2, -4.6, 1.8); circle(ctx, 2, -4, 1.7); circle(ctx, 4.4, -2.7, 1.5); circle(ctx, 0.6, -2, 1.6);
    ctx.fillStyle = '#a8452a'; circle(ctx, -2.4, -4.9, 0.8); circle(ctx, 1.8, -5.5, 0.75); circle(ctx, 3.6, -3.5, 0.7); circle(ctx, -4.6, -2.5, 0.65);
    ctx.fillStyle = '#5b8f3a'; ctx.fillRect(-0.6, -6, 1.2, 0.6); ctx.fillRect(2.6, -4.7, 1, 0.5);
    ctx.restore();
  }

  function trayArt(ctx, x, y, a, full) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#8f969d'; ell(ctx, 0, 0.7, 11.6, 2.3);
    ctx.fillStyle = '#d5d9dd'; ell(ctx, 0, 0, 11, 1.7);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-7, -0.9, 6, 0.6);
    if (full) { plateArt(ctx, -3, -0.5, 0.62); mugArt(ctx, 6.2, -0.1, 0, 0.72); }
    ctx.restore();
  }

  function drawCarry(ctx, K) {
    const t = R.tray;
    if (K.L.carry === 'tray') {
      trayArt(ctx, t.x + 1.2, t.y - 2.6, t.ang, true);
    } else {
      mugArt(ctx, t.x + 3.4, t.y + 3.2, t.ang, 1);
      ctx.fillStyle = K.L.skin; circle(ctx, t.x, t.y + 0.4, 2.4);
    }
  }

  function render(ctx, tm, st, part) {
    const kind = K.kind, rf = R.rf, L = K.L, body = part !== 2, arms = part !== 1;
    if (body) {
      if (rf.mode && rf.back) drawRifle(ctx, rf, tm);
      if (L.ski) drawSkis(ctx, K, tm, st);
      if (!part) drawArm(ctx, K, R.armF, true);
      drawLeg(ctx, K, R.legF, true);
      drawLeg(ctx, K, R.legN, false);
      if (kind === 'tourist' && !L.ski) drawPack(ctx, K);
      if (kind === 'santa' && K.has) drawSack(ctx, K);
      if (rf.mode && rf.behind && !rf.back) drawRifle(ctx, rf, tm);
      if (kind === 'picker') drawSkirt(ctx, L.skirt, dk(L.skirt, 1.55), 1.4, 0.53, 1);
      else if (kind === 'santa') drawSkirt(ctx, L.coat, L.trim, 3.2, L.tail, 1.06);
      else if (L.tail) drawSkirt(ctx, L.coat, dk(L.coat, 0.72), 1.3, L.tail, 0.94, true);
      drawTorso(ctx, K, tm);
      if (kind === 'santa' && K.has) drawSackNeck(ctx, K);
      drawHead(ctx, K, tm);
      if (rf.mode && !rf.behind && !rf.back) drawRifle(ctx, rf, tm);
    }
    if (!arms) return;
    if (part === 2) drawArm(ctx, K, R.armF, true);
    drawArm(ctx, K, R.armN, false);
    if (kind === 'picker' && K.has) drawBasket(ctx, K, tm);
    if (kind === 'tourist' && K.has) drawPhone(ctx, K, tm, K.state === 'film' && st.aimK > 0.5);
    if (K.film) drawPhone(ctx, K, tm, true);
    if ((kind === 'guest' || kind === 'waiter') && K.has && !INN[K.sp]) drawCarry(ctx, K);
    if (R.stars > 0.01) drawStars(ctx, R.stars, tm, st.seed);
  }

  function breathe(ctx, st, cold, ox, oy, sx, sy, time, dt, run) {
    if (!(cold > 0.01)) return;
    const c = cos(R.hang), s = sin(R.hang), lx = R.hx + 6.8 * c - 4.4 * s, ly = R.hy + 6.8 * s + 4.4 * c;
    if (dt > 0) {
      const per = lerp(1.5, 0.75, run) * (0.88 + 0.24 * frac(sin(st.pN * 12.9898 + st.seed) * 43758.5453));
      st.pAcc += dt / per;
      if (st.pAcc >= 1) {
        st.pAcc -= Math.floor(st.pAcc);
        const p = st.puffs[st.pN % 4];
        p.t = time; p.x = ox + sx * lx; p.y = oy + sy * ly; p.d = sx < 0 ? -1 : 1; st.pN++;
      }
    }
    const ga = ctx.globalAlpha;
    ctx.fillStyle = '#f1f6fb';
    for (const p of st.puffs) {
      const age = time - p.t;
      if (age < 0 || age > 1.3) continue;
      const k = age / 1.3, e = 1 - Math.exp(-age * 6);
      const x = p.x + p.d * (5 * e - 7 * age) * sy, y = p.y - (2 * e + 9 * age) * sy, r = (1.6 + 4.4 * sqrt(k)) * sy;
      ctx.globalAlpha = ga * cold * 0.66 * (1 - k) * smooth(age / 0.06);
      circle(ctx, x, y, r); circle(ctx, x - p.d * r * 0.7, y + r * 0.3, r * 0.7);
    }
    ctx.globalAlpha = ga;
  }

  const stair = (phi, odd) => {
    if (odd) {
      if (phi < 1) return 25 * smooth(phi);
      const q = (phi - 1) / 2, n = Math.floor(q);
      return Math.min(150, 25 + 50 * (n + smooth((q - n - 0.5) * 2)));
    }
    const q = phi / 2, n = Math.floor(q);
    return Math.min(150, 50 * (n + smooth((q - n - 0.5) * 2)));
  };
  const BRF = { mode: 'hunt', ox: 0, oy: 0, ang: -1.22, behind: false, back: false, kick: 0, sx: 1 };

  function backTorso(ctx, L, px, py, sx, sy) {
    const my = (py + sy) / 2;
    ctx.fillStyle = L.coat;
    ctx.beginPath();
    ctx.moveTo(px - 7.6, py + 3.6); ctx.quadraticCurveTo(px - 8.8, my, sx - 9.6, sy + 3.2);
    ctx.quadraticCurveTo(sx - 9.6, sy - 2.6, sx - 3.4, sy - 2.8); ctx.lineTo(sx + 3.4, sy - 2.8);
    ctx.quadraticCurveTo(sx + 9.6, sy - 2.6, sx + 9.6, sy + 3.2); ctx.quadraticCurveTo(px + 8.8, my, px + 7.6, py + 3.6);
    ctx.closePath(); ctx.fill();
    if (L.vest) {
      ctx.fillStyle = L.vest;
      ctx.beginPath();
      ctx.moveTo(px - 7, py + 3); ctx.quadraticCurveTo(px - 8, my, sx - 7.6, sy + 4.4); ctx.lineTo(sx - 4.6, sy - 1.6);
      ctx.lineTo(sx + 4.6, sy - 1.6); ctx.lineTo(sx + 7.6, sy + 4.4); ctx.quadraticCurveTo(px + 8, my, px + 7, py + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.vest, 0.82); ctx.fillRect(sx - 0.5, sy + 0.5, 1, py - sy + 1);
      if (L.win) { ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.fillRect(px - 7.6, my - 1.5, 15.2, 1.1); }
    }
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(px - 8, py - 1.2, 16, 2.4);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px - 8.6, sy + 2, 3, py - sy);
  }

  function backHead(ctx, L, x, y) {
    const fur = L.fur || dk(L.hat, 1.3);
    ctx.fillStyle = dk(L.skin, 0.86); ctx.fillRect(x - 3, y + 3.5, 6, 6);
    if (L.fur) { ctx.fillStyle = L.fur; rr(ctx, x - 6.4, y + 7.6, 12.8, 4.8, 2.4); }
    ctx.fillStyle = L.skin; circle(ctx, x - 6.9, y + 1, 1.9); circle(ctx, x + 6.9, y + 1, 1.9);
    ctx.fillStyle = L.hair; circle(ctx, x, y, D.hr);
    ctx.fillStyle = dk(L.hair, 0.82); ell(ctx, x, y + 4.6, 4.6, 1.6);
    if (L.win) {
      ctx.fillStyle = dk(L.hat, 0.82); rr(ctx, x - 6.8, y - 5, 13.6, 10.4, 3.4);
      ctx.fillStyle = fur; rr(ctx, x - 9, y - 4.8, 3.8, 10.4, 1.7); rr(ctx, x + 5.2, y - 4.8, 3.8, 10.4, 1.7);
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(x - 7.2, y - 5); ctx.quadraticCurveTo(x - 7.6, y - 13, x, y - 13.2); ctx.quadraticCurveTo(x + 7.6, y - 13, x + 7.2, y - 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(fur, 0.88); rr(ctx, x - 8, y - 6.6, 16, 2.6, 1.3);
      ctx.fillStyle = fur; for (let i = -7.2; i < 8; i += 1.8) circle(ctx, x + i, y - 6.1, 1.55);
    } else {
      ctx.fillStyle = dk(L.hat, 0.85); ell(ctx, x, y - 4.6, 10.4, 2.1);
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(x - 6.2, y - 4.7); ctx.lineTo(x - 5.2, y - 11.4); ctx.quadraticCurveTo(x, y - 12.8, x + 5.2, y - 11.4); ctx.lineTo(x + 6.2, y - 4.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a5c3a'; ctx.fillRect(x - 6.4, y - 6.7, 12.8, 2);
    }
    ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(x - 5.4, y - 6.8); ctx.quadraticCurveTo(x - 8.4, y - 10.8, x - 9.4, y - 17.2); ctx.stroke();
    ctx.fillStyle = '#d9c28c';
    ctx.beginPath(); ctx.moveTo(x - 5.8, y - 7.4); ctx.quadraticCurveTo(x - 9.2, y - 10, x - 10.6, y - 17.8); ctx.quadraticCurveTo(x - 6.8, y - 14, x - 4.4, y - 6.8); ctx.closePath(); ctx.fill();
  }

  function backDraw(ctx, L, tm, c) {
    const phi = c / 25, top = smooth((c - 126) / 24);
    const fL = lerp(stair(phi, 1), 150, top), fR = lerp(stair(phi, 0), 150, top);
    const sw = 1.1 * sin(PI * phi) * (1 - top), pel = lerp(Math.min(fL, fR) + 26.5, 159.5, top);
    const px = sw * 0.5, py = -pel, sx = sw, sy = py - 20.5, hx = sw * 1.15, hy = sy - 11.5;
    for (let i = 0; i < 2; i++) {
      const g = i ? 1 : -1, shx = sx + g * 7.8, shy = sy + 1.8, wx = g * 9.5, wy = -Math.min(214, (i ? fL : fR) + 62);
      const d = hypot(wx - shx, wy - shy), sp = 0.45 * Math.max(0, 22.3 - d), ex = (shx + wx) / 2 + g * sp, ey = (shy + wy) / 2;
      limb(ctx, shx, shy, ex, ey, 5.8, 4.8, dk(L.coat, 0.92));
      limb(ctx, ex, ey, wx, wy, 4.8, 3.8, dk(L.coat, 0.92));
      ctx.fillStyle = L.glove || L.skin; circle(ctx, wx, wy - 0.8, 2.7);
    }
    for (let i = 0; i < 2; i++) {
      const fh = i ? fR : fL, g = i ? 1 : -1, hpx = px + g * 4, hpy = py + 1, ax = g * 4.8, ay = -fh - 3.8 - 1.3 * smooth(fh / 10);
      const d = hypot(ax - hpx, ay - hpy), sp = 0.22 * Math.max(0, 29.6 - d), kx = (hpx + ax) / 2 + g * sp, ky = (hpy + ay) / 2;
      limb(ctx, hpx, hpy, kx, ky, 8.4, 6.8, L.pants);
      limb(ctx, kx, ky, ax, ay, 6.6, 4.8, L.pants);
      const bf = L.win ? 0.58 : 0.45;
      limb(ctx, lerp(ax, kx, bf), lerp(ay, ky, bf), ax, ay, 5.8, 5.4, L.boots);
      ctx.fillStyle = L.boots; rr(ctx, ax - 3.3, ay - 1.2, 6.6, 4.6, 1.6);
      ctx.fillStyle = L.sole; ctx.fillRect(ax - 3.4, ay + 2.6, 6.8, 1.2);
    }
    if (L.tail) { ctx.fillStyle = L.coat; rr(ctx, px - 8.6, py - 3, 17.2, 12.6, 3); ctx.fillStyle = dk(L.coat, 0.72); ctx.fillRect(px - 8.4, py + 8.4, 16.8, 1.3); }
    backTorso(ctx, L, px, py, sx, sy);
    BRF.ox = px - 7.5; BRF.oy = py + 2.5;
    drawRifle(ctx, BRF, tm);
    backHead(ctx, L, hx, hy);
  }

  function climbDraw(ctx, h, st, L, time, k, face) {
    const cx = h.x, u = clamp((k - 0.07) / 0.79, 0, 1), c = 150 * (0.72 * u + 0.28 * smooth(u)), sl = L.scale;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (k < 0.035) {
      ctx.translate(cx, GY); ctx.scale(face * sl * Math.max(0.02, 1 - smooth(k / 0.035)), sl);
      render(ctx, time, st, 0);
    } else if (k < 0.93) {
      const sq = Math.max(0.02, k < 0.07 ? smooth((k - 0.035) / 0.035) : 1 - smooth((k - 0.86) / 0.07));
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - 300, GY - 146, 600, 200); ctx.clip();
      ctx.translate(cx, GY); ctx.scale(face * sl * sq, sl);
      backDraw(ctx, L, time, c);
      ctx.restore();
      if (c > 118) {
        const fa = smooth((c - 118) / 18);
        ctx.save();
        ctx.beginPath(); ctx.rect(cx - WIN.half, WIN.top, WIN.half * 2, WIN.bot - WIN.top + 0.5); ctx.clip();
        ctx.translate(cx, GY); ctx.scale(face * sl * sq, sl);
        backDraw(ctx, L, time, c);
        ctx.restore();
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * fa; winShade(ctx, cx); sillBoard(ctx, cx); ctx.globalAlpha = ga;
      }
    } else {
      DPS.face = face; DPS.lean = 0; DPS.wob = 0; DPS.rb = 0; DPS.seed = (abs(cx) * 0.013) % TAU;
      postPose(DPS, L.win ? WLOOK.walker : LOOK.walker, 244, 179, 0, time);
      postDraw(ctx, cx, face, 0, Math.max(0.02, smooth((k - 0.93) / 0.07)), time, true);
      note(cx, time, face, 0, 0, R.rf.ang, DPS.seed).climb = true;
    }
    ctx.restore();
  }

  ZS.drawHuman = function (ctx, h, time) {
    if (!(time >= 0)) time = 0;
    const kind = LOOK[h.kind] ? h.kind : 'walker';
    let L = kind === 'guest' ? lookOf(kind, h.look) : (h.outfit === 'winter' && WLOOK[kind]) || LOOK[kind];
    if (h.size > 0 && h.size !== 1) L = sizedLook(L, h.size);
    let sp = SPECIAL[h.state] ? h.state : '';
    if ((sp === 'pickup' || sp === 'drop' || sp === 'climbStand') && !CAN_AIM[kind]) sp = '';
    if (sp === 'selfie' && kind !== 'tourist') sp = '';
    if (INN[sp] && kind !== 'guest' && kind !== 'waiter') sp = '';
    let state = sp ? 'idle' : h.state;
    if (state !== 'walk' && state !== 'run' && state !== 'aim' && state !== 'film') state = 'idle';
    const armed = !!CAN_AIM[kind] && h.armed !== false && sp !== 'down' && sp !== 'pickup' && sp !== 'drop';
    const has = !h.empty;
    if (state === 'aim' && !armed) state = 'idle';
    if (state === 'film' && (kind !== 'tourist' || !has)) state = 'idle';
    const targeted = state === 'aim' || state === 'film', at = h.aimAt;
    let face = h.dir < 0 ? -1 : 1;
    if (targeted && at && abs(at[0] - h.x) > 8) face = at[0] < h.x ? -1 : 1;

    const st = getState(h, time);
    const dt = time - st.t, live = dt >= 0 && dt < 0.3 && st.t >= 0;
    const clutch = (state === 'run' && !!h.clutch) || sp === 'bitten';
    const text = !!h.texting && kind === 'tourist' && has && !sp && (state === 'walk' || state === 'idle');
    if (live) {
      st.clutch = ease(st.clutch, clutch ? 1 : 0, 9, dt);
      st.sling = ease(st.sling, clutch ? 1 : 0, 10, dt);
      st.sk = ease(st.sk, clutch ? 0.62 : 1, 8, dt);
      st.text = ease(st.text, text ? 1 : 0, 7, dt);
    } else { st.clutch = clutch ? 1 : 0; st.sling = st.clutch; st.sk = clutch ? 0.62 : 1; st.text = text ? 1 : 0; }
    advance(st, h, L, state === 'walk' || state === 'run' || sp === 'hurdle', state === 'run' || sp === 'hurdle', targeted, face, time);
    const setK = () => {
      K.kind = kind; K.L = L; K.state = state; K.face = face; K.seed = st.seed; K.armed = armed; K.has = has; K.text = st.text;
      K.panic = state === 'run' && (kind === 'picker' || kind === 'tourist' || kind === 'santa' || !!h.scared);
      K.glasses = kind === 'ztmh' || (kind === 'tourist' && !L.ski) || !!L.glasses;
      K.film = false; K.sp = sp; K.balance = state === 'walk' && !!h.balance;
      K.slope = state === 'walk' && Number.isFinite(h.slope) ? clamp(h.slope * face, -0.8, 0.8) : 0;
      K.squint = state === 'aim' && st.aimK > 0.5;
      K.small = false; K.fs = 0; K.kick = clamp(h.kick || 0, 0, 1);
      if (targeted && at) { K.tx = face * (at[0] - h.x) / L.scale; K.ty = (at[1] - GY) / L.scale; } else { K.tx = 200; K.ty = -48; }
    };
    setK();
    const by = h.y === undefined || !Number.isFinite(h.y) ? GY : h.y;

    solve(K, st, time);
    if (sp === 'climbStand') {
      crossfade(st, 'climb', live ? dt : -1);
      st.mz[0] = 0; st.mz[1] = 0; st.gun = '';
      climbDraw(ctx, h, st, L, time, unit(h.climbK), face);
      return;
    }
    let dk0 = 0, sdp = L.scale;
    if (sp === 'down') solveDown(K, st, time, h.downPhase === 'fall' || h.downPhase === 'rise' ? h.downPhase : 'lie', unit(h.downK));
    else if (sp === 'pickup') {
      const off = Number.isFinite(h.rifleX) ? clamp((h.rifleX - h.x) * face, -4, 40) : PICK_AT;
      solvePick(K, st, time, unit(h.pickK), (h.rifleDir === undefined || h.rifleDir === null ? face : h.rifleDir) * face, off);
    }
    else if (sp === 'hugged') solveHug(K, st, time, unit(h.hugK));
    else if (sp === 'bitten') solveBite(K, st, time, unit(h.bitK));
    else if (sp === 'selfie') solveSelfie(K, st, time, unit(h.selfieK));
    else if (sp === 'dive') solveDive(K, st, time, unit(h.k));
    else if (sp === 'hurdle') solveHurdle(K, st, time, unit(h.hurdleK));
    else if (sp === 'jump') { st.dropT = time; solveDrop(K, st, time, smooth((unit(h.k) - 0.15) / 0.85), null); }
    else if (sp === 'climbOut') solveClimbOut(K, st, time, unit(h.k), Number.isFinite(h.grip) ? (h.grip - by) / L.scale : -40);
    else if (sp === 'cling') solveCling(K, st, time, h, face);
    else if (sp === 'drop') {
      dk0 = unit(h.dropK); sdp = lerp(POST_SCALE, L.scale, smooth(dk0 / 0.3));
      if (!(st.dropT >= 0) || time - st.dropT > 0.3 || time < st.dropT) {
        const hf = handAt(h.x, time);
        if (hf) { st.post = st.post || { x: 0, face: 1, wob: 0, sway: 0, seed: 0 }; st.post.x = hf.x; st.post.face = hf.face; st.post.wob = hf.wob; st.post.sway = hf.sway; st.post.seed = hf.seed; }
        else st.post = null;
      }
      st.dropT = time;
      const wp = st.post ? windowPose(st, L, st.post.x, face, sdp, by, h.x, time) : null;
      setK();
      solveDrop(K, st, time, dk0, wp);
    }
    crossfade(st, sp === 'down' ? (h.downPhase === 'fall' ? 'fall' : 'down') : (sp || (armed ? 'a' : 'u')) + (armed ? 1 : 0) + (has ? 1 : 0), live ? dt : -1);
    hold(K, st);
    const rf = R.rf;
    if (rf.mode) {
      st.mz[0] = h.x + face * L.scale * (rf.ox + cos(rf.ang) * 42.5);
      st.mz[1] = by + L.scale * (rf.oy + sin(rf.ang) * 42.5);
      const g = GUN[rf.mode], gs = rf.sx < 0 ? -1 : 1, ca = cos(rf.ang), sa = sin(rf.ang);
      st.gun = rf.mode; st.gd = face * gs;
      st.gx = h.x + face * L.scale * (rf.ox + ca * GC * gs); st.gy = by + L.scale * (rf.oy + sa * GC * gs) + g.lift * g.s;
      st.gr = face * (rf.ang - gs * g.tau);
    } else { st.mz[0] = 0; st.mz[1] = 0; st.gun = ''; }

    R.free = !!sp;
    if (sp === 'dive' || sp === 'jump' || sp === 'climbOut') {
      const k = unit(h.k), sc = L.scale * (sp === 'climbOut' ? 1 : lerp(0.82, 1, smooth(k / 0.3)));
      const c = sp === 'dive' ? DV.c : sp === 'jump' ? 34 : 0, p0 = sp === 'dive' ? DV.p : c, spin = sp === 'dive' ? DV.spin : sp === 'jump' ? R.spin : 0;
      const out = sp === 'climbOut' ? 0 : smooth((k - 0.12) / 0.2);
      if (h.shadow !== false && out > 0.01) {
        const sk = clamp(1 - (GY - by + c - p0) / 110, 0.25, 1);
        ctx.fillStyle = 'rgba(15,22,8,' + (0.2 * sk * out).toFixed(3) + ')'; ell(ctx, h.x, GY + 1.2, 16 * sk, 2.8 * sk);
      }
      ctx.save();
      if (h.clip) { ctx.beginPath(); ctx.rect(h.clip[0], h.clip[1], h.clip[2], h.clip[3]); ctx.clip(); }
      ctx.translate(h.x, by); ctx.scale(face * sc, sc); ctx.translate(0, -c);
      if (spin) ctx.rotate(spin);
      ctx.translate(0, p0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      render(ctx, time, st, 0);
      ctx.restore();
      return;
    }
    if (sp === 'drop') {
      const pst = st.post, cxs = pst ? pst.x : h.x, rev = pst ? smooth(dk0 / 0.26) : 1;
      const a0 = pst ? swayA(Number.isFinite(h.sway) ? h.sway : pst.sway) * (1 - smooth(dk0 / 0.3)) : 0;
      if (h.shadow !== false) {
        const sk = clamp(1 - (GY - by) / 190, 0.2, 1);
        ctx.fillStyle = 'rgba(15,22,8,' + (0.2 * sk).toFixed(3) + ')'; ell(ctx, h.x, GY + 1.2, 15 * sk, 2.8 * sk);
      }
      K.fs = lerp(0.6, 1, smooth(dk0 / 0.3));
      ctx.save();
      swayTf(ctx, cxs, a0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const ga = ctx.globalAlpha;
      if (pst && dk0 < 0.3) { ctx.globalAlpha = ga * (1 - smooth((dk0 - 0.15) / 0.15)); sillBoard(ctx, cxs); ctx.globalAlpha = ga; }
      for (let pass = rev < 1 ? 1 : 0; pass < 3; pass++) {
        ctx.save();
        if (pass === 1) { const e = 420 * rev * rev; ctx.beginPath(); ctx.rect(cxs - WIN.half - e, WIN.top - 7 - e, WIN.half * 2 + 2 * e, WIN.bot - WIN.top + 7.5 + 2 * e); ctx.clip(); }
        ctx.translate(h.x, by); ctx.scale(face * sdp, sdp);
        if (R.spin) { ctx.translate(0, -34); ctx.rotate(R.spin); ctx.translate(0, 34); }
        render(ctx, time, st, pass);
        ctx.restore();
        if (pass === 1 && dk0 < 0.08) { ctx.globalAlpha = ga * (1 - smooth(dk0 / 0.08)); winShade(ctx, cxs); ctx.globalAlpha = ga; }
        if (!pass) break;
      }
      ctx.restore();
      K.fs = 0;
      breathe(ctx, st, unit(h.cold), h.x, by, face * sdp, sdp, time, live ? dt : 0, 0);
      return;
    }
    ctx.save();
    ctx.translate(h.x, by);
    ctx.scale(face * L.scale, L.scale);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (h.shadow !== false) {
      if (sp === 'hurdle') {
        const up = (GY - by) / L.scale, sk = 1 - clamp(up / 120, 0, 0.5);
        ctx.fillStyle = 'rgba(15,22,8,' + (0.2 * sk).toFixed(3) + ')'; ell(ctx, 4, 1.2 + up, 16 * sk, 2.8 * sk);
      } else if (sp) {
        const lo = Math.min(-15, R.hx - 9, R.px - 12), hi = Math.max(15, R.hx + 9, R.px + 12);
        const air = clamp(-3.3 - Math.max(R.legN.ay, R.legF.ay), 0, 30), sk = 1 - air / 45;
        ctx.fillStyle = 'rgba(15,22,8,' + (0.2 * sk).toFixed(3) + ')'; ell(ctx, (lo + hi) / 2, 1.2, ((hi - lo) / 2) * sk, 2.8 * sk);
      } else { ctx.fillStyle = 'rgba(15,22,8,0.2)'; ell(ctx, 0, 1.2, 15, 2.8); }
    }
    render(ctx, time, st, 0);
    ctx.restore();
    breathe(ctx, st, unit(h.cold), h.x, by, face * L.scale, L.scale, time, live ? dt : 0, st.runK * st.amt);
  };

  const DIVE = [
    [0, 0, -22, 0.55, 0.2, -0.1, 6, -3.2, 0, -4, -3.2, 0, -0.7, 1.3, -0.6, 1.1, 0, 0, 1],
    [0.12, 1.5, -31.5, 0.25, 0.05, 0, 8, -2, 0.5, -7, -6.5, 0.9, 2.5, 0.25, 2.3, 0.35, 0, 0, 1],
    [0.3, 0, -32.3, 0, 0, 0.12, 1.5, -3.4, 0.9, -3.5, -6.5, 1.1, 2.95, 0.08, 2.85, 0.12, 0, 0, 1],
    [0.47, 0, -32.3, 0.06, 0.1, 0.2, 2, -4, 0.8, -2.5, -7, 1, 2.75, 0.5, 2.65, 0.6, 0, 0, 1],
    [0.58, 0.5, -17, 0.95, 0.55, 0.3, 7, -12.5, -0.6, 4, -9.5, -0.4, 1.25, 1.7, 1.05, 1.9, 0, 0, 1],
    [0.8, 0.5, -17, 0.95, 0.55, 0.3, 7, -12.5, -0.6, 4, -9.5, -0.4, 1.25, 1.7, 1.05, 1.9, 0, 0, 1],
    [0.92, 1, -24, 0.45, 0.15, 0, 7, -3.2, 0, -5, -3.4, 0.3, 0.7, 1.1, 0.3, 1.2, 0, 0, 1],
    [1, 0, -31, 0.3, 0.05, 0, 6, -3.2, 0, -6, -4.5, 0.5, 2.1, 0.6, 1.6, 0.7, 0, 0, 1],
  ];
  const DV = { spin: 0, c: 32, p: 32 };
  function still() {
    R.hatA = 0; R.hatY = 0; R.hatS = 1; R.tsx = 1; R.yaw = 1; R.stars = 0; R.sackA = 0; R.vs = 0; R.pw = 0; R.flash = 0; R.spin = 0; R.rf.mode = '';
  }

  function solveDive(K, st, tm, k) {
    spline(DIVE, k, PV);
    const fl = plateau(k, 0.12, 0.2, 0.42, 0.5), w = tm * 21 + st.seed;
    PV[5] += 2.5 * sin(w) * fl; PV[8] -= 2.5 * sin(w) * fl;
    pose(PV);
    arm(R.armN, PV[11], PV[12], 0, 0, 0);
    arm(R.armF, PV[13], PV[14], 0, 0, 0);
    still();
    R.face = k < 0.6 ? 2 : k < 0.86 ? 3 : 2;
    DV.spin = 1.35 * smooth((k - 0.1) / 0.32) + (TAU - 1.35) * smooth((k - 0.5) / 0.34);
    DV.p = lerp(32, 16, smooth((k - 0.48) / 0.1));
    DV.c = k < 0.5 ? lerp(32, 12, smooth((k - 0.33) / 0.17)) : lerp(12, 16, smooth((k - 0.5) / 0.08));
  }

  function solveClimbOut(K, st, tm, k, gy) {
    for (let i = 0; i < 18; i++) PV[i] = STAND[i];
    const push = smooth((k - 0.38) / 0.16), step = bump(k, 0.58, 0.92), stand = smooth((k - 0.86) / 0.14);
    PV[2] = 0.05 + 0.32 * push * (1 - stand);
    PV[1] = -32.3 + 3 * push * (1 - stand);
    PV[5] = 3 + 4 * step; PV[6] = -3.2 - 13 * step; PV[7] = -0.3 * step;
    PV[3] = -0.12 * (1 - push); PV[4] = -0.2 * (1 - push);
    pose(PV);
    const g = 1 - stand, y = clamp(gy, -72, -8), jig = sin(tm * 13 + st.seed) * 0.6 * (1 - push);
    arm(R.armN, 0.05, 0.18, g, 7.5, y + jig);
    arm(R.armF, 0.03, 0.18, g, -3, y - jig);
    still();
    R.face = k < 0.55 ? 2 : 0;
  }

  function solveCling(K, st, tm, h, face) {
    const sd = st.seed, act = h.act, s = 0.571 * face, tr = sin(tm * 17 + sd) * (act === 'cling' ? 0.55 : 0.2), u = 1 / K.L.scale;
    for (let i = 0; i < 18; i++) PV[i] = STAND[i];
    PV[0] = -1 + tr * 0.4; PV[1] = -30.6 + tr * 0.3; PV[2] = act === 'film' ? 0.04 : 0.14;
    PV[5] = 4; PV[6] = -3.2 + s * 4; PV[7] = Math.atan(s);
    PV[8] = -4.5; PV[9] = -3.2 - s * 4.5; PV[10] = Math.atan(s);
    PV[3] = act === 'cling' ? 0.1 : 0; PV[4] = act === 'wave' ? -0.12 : 0.04 * sin(tm * 1.3 + sd);
    pose(PV);
    const cx = ((Number.isFinite(h.reach) ? h.reach : 7) + 1) * face * u, top = -31.5 * u;
    const ax = cx + 1.4 * Math.sign(cx), bx = cx + 0.8 * Math.sign(cx);
    still();
    if (act === 'film') {
      const fwd = cx > 0;
      arm(R.armF, 0.03, 0.18, 1, fwd ? bx : bx - 1, fwd ? top + 9 : top + 3);
      const jx = sin(tm * 7.3 + sd) * 0.25, jy = sin(tm * 9.1 + sd) * 0.25;
      arm(R.armN, 0.05, 0.18, 1, R.sx + 16 + jx, R.sy - 8 + jy);
      R.hx = R.sx + 3; R.hy = R.sy - 10.6; R.hang = -0.06;
      R.phone.x = R.armN.wx; R.phone.y = R.armN.wy; R.phone.ang = 0.04;
      K.film = true;
      R.face = 0;
    } else {
      arm(R.armN, 0.05, 0.18, 1, ax, top + tr * 0.3);
      if (act === 'wave') arm(R.armF, 2.8 + 0.38 * sin(tm * 9 + sd), 0.35 + 0.3 * sin(tm * 9 + sd + 1), 0, 0, 0);
      else arm(R.armF, 0.03, 0.18, 1, bx, top + 9 - tr * 0.3);
      R.face = act === 'wave' ? (frac(tm * 0.8 + sd) < 0.5 ? 2 : 1) : 2;
    }
  }

  function bustArms(b, time, sd) {
    const act = b.act;
    if (act === 'drink') {
      const s = frac(time / 6.5 + sd / TAU), lift = plateau(s, 0, 0.06, 0.16, 0.24);
      arm(R.armN, 0.05, 0.18, 1, lerp(6.5, R.hx + 6.4, lift), lerp(1, R.hy + 4.6, lift));
      arm(R.armF, 0.03, 0.18, 1, -2, 2.4);
      R.tray.x = R.armN.wx; R.tray.y = R.armN.wy; R.tray.ang = -0.9 * lift;
      return lift;
    }
    if (act === 'eat') {
      const s = frac(time / 2.8 + sd / TAU), lift = plateau(s, 0.1, 0.3, 0.45, 0.65);
      arm(R.armN, 0.05, 0.18, 1, lerp(10.5, R.hx + 5.6, lift), lerp(-1.4, R.hy + 4, lift));
      arm(R.armF, 0.03, 0.18, 1, -1.5, 2.4);
      return lift;
    }
    if (act === 'alarm') {
      const j = sin(time * 19 + sd) * 0.8;
      arm(R.armN, 0.05, 0.18, 1, R.hx + 7.4 + j, R.hy - 5.5);
      arm(R.armF, 0.03, 0.18, 1, R.hx - 4.6 - j, R.hy - 8);
      return 0;
    }
    if (act === 'wave') {
      arm(R.armN, 0.05, 0.18, 1, 8.5, -0.5);
      arm(R.armF, 2.8 + 0.38 * sin(time * 9 + sd), 0.35 + 0.3 * sin(time * 9 + sd + 1), 0, 0, 0);
      return 0;
    }
    if (act === 'film') {
      const jx = sin(time * 7.3 + sd) * 0.25, jy = sin(time * 9.1 + sd) * 0.25;
      arm(R.armN, 0.05, 0.18, 1, R.sx + 15.5 + jx, R.sy - 8.5 + jy);
      arm(R.armF, 0.03, 0.18, 1, -5.5, -0.5);
      R.phone.x = R.armN.wx; R.phone.y = R.armN.wy; R.phone.ang = 0.04;
      K.film = true;
      return 0;
    }
    const j = sin(time * 17 + sd) * 0.4;
    arm(R.armN, 0.05, 0.18, 1, 8 + j, -0.6);
    arm(R.armF, 0.03, 0.18, 1, -5.5 - j, -0.6);
    return 0;
  }

  ZS.drawGuestBust = function (ctx, b, time) {
    if (!(time >= 0)) time = 0;
    const kind = b.kind === 'waiter' ? 'waiter' : 'guest', L = lookOf(kind, b.look), sd = hashSeed(b.seed || 1);
    const up = unit(b.up), stand = unit(b.stand), act = b.act || 'eat', sc = (b.scale || 0.8) * L.scale, face = b.face < 0 ? -1 : 1;
    if (up <= 0.001) return;
    K.kind = kind; K.L = L; K.state = 'idle'; K.face = face; K.seed = sd; K.armed = false; K.has = false; K.text = 0;
    K.panic = false; K.glasses = !!L.glasses; K.squint = false; K.small = false; K.fs = 0; K.kick = 0; K.film = false; K.slope = 0; K.balance = false; K.sp = '';
    const shake = act === 'alarm' || act === 'peek' ? 1 : 0, bob = sin(time * 1.9 + sd) * 0.4 * (1 - stand);
    const lean = 0.06 + sin(time * 0.7 + sd) * 0.03 - 0.08 * stand + (act === 'eat' ? 0.06 : 0);
    R.px = sin(time * 19 + sd) * 0.5 * shake; R.py = lerp(44, b.hip === undefined ? 12 : b.hip, up) - 7 * stand + bob + (act === 'peek' ? 7 : 0);
    R.lean = lean; R.cl = cos(lean); R.sl = sin(lean);
    R.sx = R.px + D.tor * R.sl; R.sy = R.py - D.tor * R.cl;
    const nd = lean * 0.75 + 0.03 + (act === 'film' ? -0.05 : 0);
    R.hx = R.sx + D.neck * sin(nd); R.hy = R.sy - D.neck * cos(nd);
    R.hang = lean * 0.35 + sin(time * 0.9 + sd) * 0.05 * (1 - shake) + (act === 'eat' || act === 'drink' ? 0.06 : 0);
    still();
    const chat = frac(time / 5.2 + sd / TAU);
    R.face = act === 'alarm' || act === 'peek' ? 2 : act === 'wave' ? (frac(time * 0.8 + sd) < 0.5 ? 2 : 1) : act === 'film' ? 0 : chat < 0.22 ? 5 : 0;
    const lift = bustArms(b, time, sd);
    if (act === 'drink' && lift > 0.5) R.face = 0;
    ctx.save();
    if (b.clip) { ctx.beginPath(); ctx.rect(b.clip[0], b.clip[1], b.clip[2], b.clip[3]); ctx.clip(); }
    ctx.translate(b.x, b.y); ctx.scale(face * sc, sc);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    drawArm(ctx, K, R.armF, true);
    drawTorso(ctx, K, time);
    drawHead(ctx, K, time);
    if (act === 'eat') plateArt(ctx, 11.5, 1.6, 0.8);
    drawArm(ctx, K, R.armN, false);
    if (act === 'drink') { mugArt(ctx, R.tray.x + 3.4, R.tray.y + 3.2, R.tray.ang, 1); ctx.fillStyle = L.skin; circle(ctx, R.tray.x, R.tray.y + 0.4, 2.4); }
    if (act === 'eat') {
      const a = R.armN, gx = a.wx + 1.4, gy = a.wy - 1;
      ctx.strokeStyle = '#b9bec4'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(a.wx - 1, a.wy + 1.6); ctx.lineTo(gx + 2.2, gy - 2.6); ctx.stroke();
      if (lift > 0.2) { ctx.fillStyle = '#f3ead0'; circle(ctx, gx + 2.6, gy - 3, 1.3); }
    }
    if (K.film) drawPhone(ctx, K, time, true);
    ctx.restore();
  };

  const WIN = { half: 23, top: GY - 195, bot: GY - 177 };
  const POST_SCALE = 0.82;
  const posts = new WeakMap(), hand = new Map();
  const swayA = (sw) => Math.asin(clamp((sw || 0) / 186, -0.5, 0.5));
  function swayTf(ctx, cx, a) { if (a) { ctx.translate(cx, GY); ctx.rotate(a); ctx.translate(-cx, -GY); } }
  function swayPt(cx, a, x, y) {
    if (!a) { TP.x = x; TP.y = y; return; }
    const c = cos(a), s = sin(a), dx = x - cx, dy = y - GY;
    TP.x = cx + dx * c - dy * s; TP.y = GY + dx * s + dy * c;
  }
  function handAt(x, time) {
    let best = null, bd = 40;
    for (const [hx, v] of hand) { const d = abs(hx - x); if (d < bd && time - v.t >= 0 && time - v.t < 0.5) { best = v; bd = d; } }
    return best;
  }
  function note(x, time, face, wob, sway, ang, seed) {
    let v = hand.get(Math.round(x));
    if (!v) { v = { x: 0, t: 0, face: 1, wob: 0, sway: 0, ang: 0, seed: 0, climb: false }; hand.set(Math.round(x), v); }
    v.x = x; v.t = time; v.face = face; v.wob = wob; v.sway = sway; v.ang = ang; v.seed = seed;
    return v;
  }

  function winClip(ctx, w, cx) {
    ctx.beginPath(); ctx.rect(cx - w.half, w.top - 7, w.half * 2, w.bot - w.top + 7.5); ctx.clip();
  }
  function winShade(ctx, cx) {
    const w = WIN;
    ctx.save();
    winClip(ctx, w, cx);
    ctx.fillStyle = 'rgba(38,24,12,0.14)'; ctx.fillRect(cx - w.half, w.top - 7, w.half * 2, w.bot - w.top + 8);
    ctx.fillStyle = 'rgba(20,12,6,0.3)'; ctx.fillRect(cx - w.half, w.top, w.half * 2, 3);
    ctx.restore();
  }
  function sillBoard(ctx, cx) {
    const w = WIN;
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(cx - w.half - 2, w.bot - 0.5, w.half * 2 + 4, 3.2);
    ctx.fillStyle = '#7a5534'; ctx.fillRect(cx - w.half - 2, w.bot - 0.5, w.half * 2 + 4, 1);
  }

  function postPose(ps, L, tx, ty, kick, time) {
    const W = ps.wob, lk = ps.lean * (1 - W), sd = ps.seed, jig = W * sin(time * 17 + sd);
    K.kind = 'walker'; K.L = L; K.state = lk > 0.5 ? 'aim' : 'idle'; K.seed = sd; K.panic = false; K.glasses = false;
    K.squint = lk > 0.5; K.kick = kick * (1 - W); K.armed = true; K.has = true; K.text = 0; K.fs = 0;
    const lean = 0.08 + 0.2 * lk + W * (0.05 * sin(time * 10.6 + sd) - 0.1);
    R.lean = lean; R.cl = cos(lean); R.sl = sin(lean);
    R.sx = 1 + 3 * lk + sin(time * 0.9 + sd) * 0.5 * (1 - lk) * (1 - W) - 1.4 * W; R.sy = -6.2 + 1.4 * lk + sin(time * 1.9 + sd) * 0.25 + 0.7 * jig;
    R.px = R.sx - D.tor * R.sl; R.py = R.sy + D.tor * R.cl;
    const nd = lean * 0.75 + 0.03;
    R.hx = R.sx + D.neck * sin(nd) + lk * 1.5; R.hy = R.sy - D.neck * cos(nd) + lk * 1.2 + 0.5 * jig;
    R.hang = 0.02 + lk * 0.12 + W * 0.1 * sin(time * 8.2 + sd);
    const scan = clamp(0.5 + 0.6 * sin(time * 0.9 + sd), -0.6, 1);
    R.yaw = lerp(lerp(scan, 1, lk), 1, W); R.face = W > 0.3 ? 2 : 0; R.breath = 0; R.vs = 0; R.pw = 0; R.flash = 0; R.spin = 0;
    R.hatA = 0.14 * sin(time * 7.3 + sd) * W; R.hatY = -1.6 * abs(sin(time * 9.1 + sd)) * W; R.hatS = 1; R.tsx = 1; R.stars = 0; R.sackA = 0;
    const rf = R.rf, ox = R.sx + 1.6 - 2.5 * (1 - lk), oy = R.sy + 2.6 + 2.8 * (1 - lk);
    let ang = clamp(atan2(ty - oy, Math.max(10, tx - ox)), -0.1, 0.95) + sin(time * 1.3 + sd) * 0.004 * lk - 0.12 * K.kick;
    if (ps.rb > 0) ang = lerp(ang, ps.ra, ps.rb);
    ang = lerp(ang, -0.78 + 0.08 * sin(time * 12.4 + sd), W);
    rf.mode = 'hunt'; rf.ox = lerp(ox - 2.2 * K.kick, R.sx + 1, W); rf.oy = lerp(oy, R.sy + 11, W); rf.ang = ang;
    rf.behind = false; rf.back = false; rf.kick = K.kick; rf.sx = 1;
    const ux = cos(ang), uy = sin(ang), gx = lerp(ox, rf.ox, W), gy = rf.oy;
    arm(R.armN, 0, 0, 1, lerp(gx + ux * 13 - uy * 2.4, 23.5 + 0.8 * jig, W), lerp(gy + uy * 13 + ux * 2.4, -5.5, W));
    arm(R.armF, 0, 0, 1, lerp(gx + ux * 25 - uy * 3.2, 11, W), lerp(gy + uy * 25 + ux * 3.2, -0.8 + 0.5 * jig, W));
  }

  function postDraw(ctx, cx, fx, a, sq, time, rifle) {
    const w = WIN, sc = POST_SCALE, sill = w.bot;
    ctx.save();
    swayTf(ctx, cx, a);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    K.small = true;
    ctx.save();
    winClip(ctx, w, cx);
    ctx.translate(cx, sill); ctx.scale(fx * sc * sq, sc);
    drawTorso(ctx, K, time);
    drawHead(ctx, K, time);
    ctx.restore();
    winShade(ctx, cx);
    K.small = false;
    sillBoard(ctx, cx);
    ctx.translate(cx, sill); ctx.scale(fx * sc * sq, sc);
    drawArm(ctx, K, R.armF, true);
    if (rifle) drawRifle(ctx, R.rf, time);
    drawArm(ctx, K, R.armN, false);
    ctx.restore();
  }

  function newPost(x, time) {
    return { t: time, face: 1, lean: 0, wob: 0, rb: 0, ra: 0, sway: 0, seed: (abs(x) * 0.013) % TAU, mz: [0, 0], gun: '', gx: 0, gy: 0, gr: 0, gd: 1,
      puffs: [0, 1, 2, 3].map(() => ({ t: -9, x: 0, y: 0, d: 1 })), pAcc: 0.3, pN: 0 };
  }

  ZS.drawPostHunter = function (ctx, s, time) {
    if (!(time >= 0)) time = 0;
    const w = WIN, L = s.outfit === 'winter' ? WLOOK.walker : LOOK.walker, sc = POST_SCALE, cx = s.x, sill = w.bot;
    const cross = s.cross === undefined ? s.x - 200 : s.cross, wob = unit(s.wobble);
    const want = wob > 0.01 && (s.dir === 1 || s.dir === -1) ? s.dir : cross >= s.x ? 1 : -1, lockWant = s.lock > 0 && wob <= 0 ? 1 : 0;
    let ps = posts.get(s);
    if (!ps) { ps = newPost(s.x, time); ps.face = want; ps.lean = lockWant; posts.set(s, ps); }
    const dt = time - ps.t, live = dt >= 0 && dt < 0.3;
    if (!live) {
      const hf = handAt(cx, time);
      ps.face = hf && hf.climb ? hf.face : want; ps.lean = lockWant; ps.wob = wob;
      ps.rb = hf && hf.climb ? 1 : 0; ps.ra = hf ? hf.ang : 0;
    } else {
      ps.face += (want - ps.face) * Math.min(1, dt * 9); ps.lean += (lockWant - ps.lean) * Math.min(1, dt * 8);
      ps.wob = ease(ps.wob, wob, 9, dt); ps.rb = Math.max(0, ps.rb - dt / 0.35);
    }
    ps.t = time; ps.sway = Number.isFinite(s.sway) ? s.sway : 0;
    const fx = abs(ps.face) < 0.05 ? (ps.face < 0 ? -0.05 : 0.05) : ps.face, sgn = fx < 0 ? -1 : 1;
    const tx = sgn * (cross - cx) / sc, ty = (GY - 30 - sill) / sc, a = swayA(ps.sway);
    postPose(ps, L, tx, ty, clamp(s.kick || 0, 0, 1), time);
    const rf = R.rf, ux = cos(rf.ang), uy = sin(rf.ang);
    swayPt(cx, a, cx + fx * sc * (rf.ox + ux * 42.5), sill + sc * (rf.oy + uy * 42.5)); ps.mz[0] = TP.x; ps.mz[1] = TP.y;
    swayPt(cx, a, cx + fx * sc * (rf.ox + ux * GC), sill + sc * (rf.oy + uy * GC));
    ps.gun = 'hunt'; ps.gx = TP.x; ps.gy = TP.y + GUN.hunt.lift * GUN.hunt.s; ps.gr = sgn * (rf.ang - GUN.hunt.tau) + a; ps.gd = sgn;
    postDraw(ctx, cx, fx, a, 1, time, true);
    note(cx, time, sgn, ps.wob, ps.sway, rf.ang, ps.seed).climb = false;
    breathe(ctx, ps, unit(s.cold), cx, sill, fx * sc, sc, time, live ? dt : 0, 0);
  };

  ZS.heldRifle = function (o) {
    if (!o || typeof o !== 'object') return null;
    const k = o.h && typeof o.h === 'object' ? o.h : o;
    const st = posts.get(o) || byObj.get(k) || (k.id !== undefined && k.id !== null ? byId.get(k.id) : null);
    return st && st.gun ? { kind: 'rifle', gun: st.gun, x: st.gx, y: st.gy, rot: st.gr, dir: st.gd } : null;
  };

  ZS.muzzle = function (o) {
    const k = o.h && typeof o.h === 'object' ? o.h : o;
    const st = posts.get(o) || byObj.get(k) || (k.id !== undefined && k.id !== null ? byId.get(k.id) : null);
    return st && st.mz && (st.mz[0] || st.mz[1]) ? st.mz : null;
  };

  const GC = 21;
  const GUN = {
    hunt: { s: LOOK.walker.scale, tau: 0.1, hull: [[0, 4.8], [11.4, 4.8], [13, 4.6], [32.5, 1.6], [42.2, 0.5]] },
    old: { s: LOOK.poacher.scale, tau: 0.1, hull: [[0, 4.8], [11.4, 4.8], [13, 4.6], [32.5, 1.6], [42.2, 0.5]] },
    tac: { s: LOOK.ztmh.scale, tau: 0.08, hull: [[0, 4.6], [14, 2.4], [26, 2.4], [41.6, 1.4]] },
  };
  for (const k in GUN) { const g = GUN[k]; g.lift = Math.max(...g.hull.map(([x, y]) => (x - GC) * sin(g.tau) + y * cos(g.tau))); }
  const DRF = { mode: 'hunt', ox: -GC, oy: 0, ang: 0, behind: false, kick: 0, sx: 1 };

  function droppedRifle(ctx, p, time) {
    const gun = GUN[p.gun] ? p.gun : 'hunt', g = GUN[gun], d = p.dir < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(p.x, (p.y === undefined ? GY : p.y) - g.lift * g.s);
    ctx.rotate(p.rot || 0);
    ctx.scale(d * g.s, g.s);
    ctx.rotate(g.tau);
    DRF.mode = gun;
    drawRifle(ctx, DRF, time);
    ctx.restore();
  }

  const drops = new WeakMap();
  const resting = (p, y) => (p.rest !== undefined ? !!p.rest : abs(p.rot || 0) < 0.03 && abs(y - GY) < 1.5);
  function spillOf(p, time, rest) {
    let d = drops.get(p);
    if (!d) { d = { t: time, at: rest ? time - 10 : -1 }; drops.set(p, d); }
    if (time < d.t - 0.5) d.at = rest ? time - 10 : -1;
    d.t = time;
    if (!rest) d.at = -1; else if (d.at < 0) d.at = time;
    return rest ? smooth((time - d.at) / 0.45) : 0;
  }
  const SPILL = [[-1.5, 0, 12, -1.2, 2.6, 1, 1.9], [0.4, 0, 21, -0.9, 3, 0, -0.7], [-0.4, 0, 28.5, -0.8, 2.4, 2, 3.4]];
  const SWEETS = ['#d6336c', '#2f9e44', '#f2c230', '#1c7ed6'];

  function droppedBasket(ctx, p, time, d, y) {
    const rest = resting(p, y), k = spillOf(p, time, rest), sc = LOOK.picker.scale;
    ctx.save();
    ctx.translate(p.x, y); ctx.scale(d * sc, sc);
    ctx.save();
    ctx.translate(-2, -9.2); ctx.rotate((p.rot || 0) * d);
    ctx.rotate(1.68);
    ctx.translate(0, -7.4);
    for (let i = 0; i < 3; i++) if (k < 0.15 + i * 0.25) mushroom(ctx, -4 + i * 4.3, -0.6 + (i % 2) * -1.2, 2.6 + (i === 1) * 0.5, i, 0);
    basketBody(ctx);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const m = SPILL[i], u = smooth((k - i * 0.22) / 0.5);
      if (u <= 0) continue;
      const x = lerp(8.5, m[2], u), yy = -2.6 - 4 * sin(PI * u) * (1 - u * 0.3);
      mushroom(ctx, x, yy + lerp(-4, m[3] * 0 - 3.2, u), m[4], m[5], lerp(1.2, m[6], u));
    }
    ctx.restore();
  }

  function droppedPhone(ctx, p, time, d, y) {
    const rest = resting(p, y);
    ctx.save();
    ctx.translate(p.x, y - 1); ctx.rotate(p.rot || 0); ctx.scale(d, 1);
    ctx.fillStyle = 'rgba(127,208,255,0.16)'; ell(ctx, 1, 0.6, 9, 1.8);
    ctx.fillStyle = '#17181c'; rr(ctx, -5.2, -1, 10.4, 2.2, 0.9);
    ctx.fillStyle = '#2a2c33'; ctx.fillRect(-4.6, 0.4, 9.2, 0.5);
    ctx.fillStyle = '#7fd0ff'; ctx.fillRect(-4.4, -1.25, 8.8, 0.75);
    ctx.fillStyle = frac(time * 1.1) < 0.62 ? '#ff3b30' : '#7a1d18'; circle(ctx, 4.1, -1.6, 0.55);
    const g = rest ? Math.pow(Math.max(0, sin(time * 3.4 + p.x * 0.1)), 12) : 0;
    if (g > 0.02) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * g).toFixed(3) + ')';
      ctx.beginPath(); const sx = -1.6, sy = -2.4, r = 3.4 * g;
      ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.22, sy - r * 0.22); ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.22, sy + r * 0.22);
      ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.22, sy + r * 0.22); ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.22, sy - r * 0.22); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function sweet(ctx, x, y, i, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (i === 3) {
      ctx.strokeStyle = '#f8f5ee'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-3.4, 0); ctx.lineTo(2.2, 0); ctx.arc(2.2, -1.6, 1.6, PI / 2, -PI / 2, true); ctx.stroke();
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 1.6; ctx.setLineDash([1, 1.2]);
      ctx.beginPath(); ctx.moveTo(-3.4, 0); ctx.lineTo(2.2, 0); ctx.arc(2.2, -1.6, 1.6, PI / 2, -PI / 2, true); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = SWEETS[i];
      ell(ctx, 0, 0, 2.1, 1.4);
      ctx.beginPath(); ctx.moveTo(-1.8, 0); ctx.lineTo(-3.6, -1.2); ctx.lineTo(-3.6, 1.2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1.8, 0); ctx.lineTo(3.6, -1.2); ctx.lineTo(3.6, 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ell(ctx, -0.4, -0.5, 1, 0.45);
    }
    ctx.restore();
  }

  function droppedSack(ctx, p, time, d, y) {
    const rest = resting(p, y), k = spillOf(p, time, rest), c = LOOK.santa.sack;
    ctx.save();
    ctx.translate(p.x, y); ctx.scale(d, 1);
    ctx.save();
    ctx.translate(0, -7.5); ctx.rotate((p.rot || 0) * d);
    ctx.fillStyle = dk(c, 0.8);
    ctx.beginPath(); ctx.moveTo(-12, 6.6); ctx.quadraticCurveTo(-15.5, -2, -8, -7.2); ctx.quadraticCurveTo(0, -10.5, 7, -5); ctx.lineTo(10.5, -3.6);
    ctx.quadraticCurveTo(12.4, -1.2, 10.6, 1.6); ctx.lineTo(7.4, 3.2); ctx.quadraticCurveTo(2, 8.6, -12, 6.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-11, 5.4); ctx.quadraticCurveTo(-14, -2, -7.4, -6.2); ctx.quadraticCurveTo(0, -9.2, 6.4, -4.4);
    ctx.quadraticCurveTo(7.6, 1, 6.2, 2.6); ctx.quadraticCurveTo(1, 6.8, -11, 5.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dk(c, 0.68); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-4, -1, -6, 3.6); ctx.moveTo(-1.5, -5); ctx.quadraticCurveTo(1.5, -1, 0, 3.8); ctx.stroke();
    ctx.fillStyle = dk(c, 0.62); ell(ctx, 9.6, -1, 1.4, 3);
    ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(7.6, -3.8); ctx.quadraticCurveTo(9.4, -6.6, 12, -5.4); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const u = smooth((k - i * 0.16) / 0.5);
      if (u <= 0) continue;
      const tx = 13 + i * 4.6 + (i % 2) * 1.5, x = lerp(10, tx, u), yy = lerp(-7.5, i === 3 ? -1.2 : -1.5, u) - 3.4 * sin(PI * u);
      sweet(ctx, x, yy, i, lerp(0, (i - 1.5) * 1.1, u));
    }
    ctx.restore();
  }

  function droppedTray(ctx, p, time, d, y) {
    const rest = resting(p, y);
    if (rest) {
      ctx.fillStyle = 'rgba(30,26,12,0.16)'; ell(ctx, p.x + d * 2, y + 0.6, 13, 2);
      trayArt(ctx, p.x, y - 1.6, 0, false);
      ctx.fillStyle = 'rgba(232,160,51,0.45)'; ell(ctx, p.x + d * 15, y - 0.2, 6.5, 1.3);
      mugArt(ctx, p.x + d * 12, y - 2.9, d * PI / 2, 0.72);
      return;
    }
    trayArt(ctx, p.x, y - 3, p.rot || 0, !!p.food);
  }

  function droppedMug(ctx, p, time, d, y) {
    const rest = resting(p, y);
    if (rest) { ctx.fillStyle = 'rgba(232,160,51,0.45)'; ell(ctx, p.x + d * 4, y - 0.2, 7, 1.4); }
    mugArt(ctx, p.x, y - (rest ? 2.9 : 3.5), rest ? d * PI / 2 : p.rot || 0, 1);
  }

  ZS.drawDropped = function (ctx, p, time) {
    if (!p) return;
    if (!(time >= 0)) time = 0;
    const d = p.dir < 0 ? -1 : 1, y = p.y === undefined ? GY : p.y;
    if (!Number.isFinite(p.x) || !Number.isFinite(y)) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (p.kind === 'basket') droppedBasket(ctx, p, time, d, y);
    else if (p.kind === 'phone') droppedPhone(ctx, p, time, d, y);
    else if (p.kind === 'sack') droppedSack(ctx, p, time, d, y);
    else if (p.kind === 'tray') droppedTray(ctx, p, time, d, y);
    else if (p.kind === 'mug') droppedMug(ctx, p, time, d, y);
    else droppedRifle(ctx, p, time);
    ctx.restore();
  };
})();
