// Human figures: hunters, the state bear team, poachers, mushroom pickers and tourists, plus the hunter in the stand window.
// Side view, canvas paths only. A figure is built from a small skeleton (two-bone IK for legs and arms) in local
// coordinates: feet on y = 0, up is negative, +x is forward. The walk phase follows the ground, so feet do not slide.
//
//   ZS.drawHuman(ctx, h, time)
//     h = { x, dir, kind, state, aimAt, id?, y?, shadow? }
//       x      feet x (world); the feet stand on ZS.CFG.GROUND unless h.y is given
//       dir    +1 / -1, the way the figure faces
//       kind   'walker' | 'ztmh' | 'poacher' | 'picker' | 'tourist'
//       state  'idle' | 'walk' | 'run' | 'aim' (walker, ztmh, poacher) | 'film' (tourist); anything unknown is 'idle'
//       aimAt  [x, y] world point for 'aim' and 'film'. The figure turns to face it.
//       scared true: a frightened face (and flailing arms where the hands are free) while running; pickers and tourists always are
//       The legs follow the real movement of x, so a hunter who keeps walking while he aims does not skate.
//       id     any stable number or string: keeps the walk phase and the eased transitions between frames. Without an id
//              the same h object is used as the key, so reuse one h per person. A fresh object each frame still works
//              (phase is then derived from x), only the transitions are not eased.
//     time    game time in seconds; must grow while the game runs
//   ZS.drawPostHunter(ctx, s, time)   s = a 'posed' shooter { x, cross, lock }; the shooter object itself is the key.
//   ZS.muzzle(o)                      o = the h object, a stand shooter s, or a shooter whose descriptor is stored as o.h.
//                                     Returns [x, y] of the rifle muzzle as last drawn (null if none): start the shot line there
//   h.kick / s.kick  0..1             just fired: the rifle jumps and a muzzle flash shows; let it decay over ~0.2 s. Keep the
//                                     state 'aim' while it is above 0.
//   ZS.POST_WINDOW = { half, top, bot }   optional: the stand's window if post() is redrawn (default 46 wide, GROUND-195..-177)
(function () {
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, hypot = Math.hypot, atan2 = Math.atan2, sqrt = Math.sqrt;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);

  // Proportions in world units: about 72 tall before a hat.
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
  };
  const CAN_AIM = { walker: 1, ztmh: 1, poacher: 1 };

  // Darker (k < 1) or lighter (k > 1) version of a #rrggbb colour, memoised.
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

  // --- Drawing primitives --------------------------------------------------------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  // A tapered limb segment with round ends.
  function limb(ctx, ax, ay, bx, by, wa, wb, col) {
    const dx = bx - ax, dy = by - ay, d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
    ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
    ctx.closePath(); ctx.fill();
    circle(ctx, ax, ay, wa / 2); circle(ctx, bx, by, wb / 2);
  }
  // A shoe or boot foot, rotated about the ankle (positive = toes down).
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

  // --- Two-bone IK ---------------------------------------------------------------------
  // bend = +1 puts the middle joint on the +x side of the line (knees), -1 on the other (elbows).
  const IK = { mx: 0, my: 0, ex: 0, ey: 0 };
  function ik(x0, y0, tx, ty, l1, l2, bend) {
    let dx = tx - x0, dy = ty - y0, d = hypot(dx, dy);
    const max = l1 + l2 - 0.05, min = abs(l1 - l2) + 0.3;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { if (d < 0.001) { dx = 0; dy = min; } else { dx *= min / d; dy *= min / d; } d = min; }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const t = atan2(dy, dx) - bend * a;
    IK.mx = x0 + cos(t) * l1; IK.my = y0 + sin(t) * l1; IK.ex = x0 + dx; IK.ey = y0 + dy;
  }

  // --- Animation state per figure -----------------------------------------------------
  // Keyed by h.id when given (a Map, swept now and then), otherwise by the object itself. Without any persistence the
  // phase is simply derived from x, which still gives non-sliding feet but no eased transitions.
  const byId = new Map(), byObj = new WeakMap();
  let sweepAt = 0;

  function hashSeed(v) {
    if (typeof v === 'number') return (abs(v) * 12.9898) % TAU;
    const s = String(v); let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 9973;
    return (n / 9973) * TAU;
  }
  function newState(seed) { return { t: -1, x: 0, phase: 0, amt: 0, runK: 0, aimK: 0, v: 0, seed, seen: 0, mz: [0, 0] }; }

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

  // Moves the animation state on to `time`: the phase advances with the distance walked, never with the clock. The legs
  // follow the actual movement whatever the state says (a hunter who keeps walking while he aims does not skate);
  // `hint` is only used on the first frame, before any movement has been seen.
  function advance(st, h, L, hint, wantRun, wantAim, face, time) {
    const dt = time - st.t;
    const strideNow = () => lerp(L.walkS, L.runS, st.runK) * L.scale;   // world units per full stride
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

  // --- Pose solver -----------------------------------------------------------------------
  const mkLeg = () => ({ ax: 0, ay: 0, kx: 0, ky: 0, rot: 0 });
  const mkArm = () => ({ ex: 0, ey: 0, wx: 0, wy: 0 });
  const R = {
    px: 0, py: 0, lean: 0, cl: 1, sl: 0, sx: 0, sy: 0, hx: 0, hy: 0, hang: 0, yaw: 1, scared: false, breath: 0,
    legN: mkLeg(), legF: mkLeg(), armN: mkArm(), armF: mkArm(),
    rf: { mode: '', ox: 0, oy: 0, ang: 0, behind: false, kick: 0 },
    phone: { x: 0, y: 0, ang: 0 }, basket: { x: 0, y: 0, ang: 0 },
  };
  const ft = [{ x: 0, y: 0, rot: 0 }, { x: 0, y: 0, rot: 0 }];
  const TP = { x: 0, y: 0 };
  // A point given in the torso frame (origin at the pelvis, tilted by the lean) in figure coordinates.
  function tp(tx, ty) { TP.x = R.px + tx * R.cl - ty * R.sl; TP.y = R.py + tx * R.sl + ty * R.cl; }

  // Where the foot of one leg is at gait phase p: planted and moving back while it carries the body, then swung forward.
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

  // Arm from the shoulder: swing angle u (from straight down, forward positive) and forearm flex f, blended towards a
  // grip point (tx, ty) by g.
  function arm(a, u, f, g, tx, ty) {
    const e1x = R.sx + D.ua * sin(u), e1y = R.sy + D.ua * cos(u), t = u + f;
    const w1x = e1x + D.fa * sin(t), w1y = e1y + D.fa * cos(t);
    if (g <= 0.001) { a.ex = e1x; a.ey = e1y; a.wx = w1x; a.wy = w1y; return; }
    ik(R.sx, R.sy, lerp(w1x, tx, g), lerp(w1y, ty, g), D.ua, D.fa, -1);
    a.ex = IK.mx; a.ey = IK.my; a.wx = IK.ex; a.wy = IK.ey;
  }

  function solve(K, st, tm) {
    const L = K.L, state = K.state, amt = st.amt, runK = st.runK, aimK = st.aimK, sd = st.seed;
    const film = state === 'film', breath = sin(tm * 1.9 + sd), shift = sin(tm * 0.45 + sd);
    const p0 = frac(st.phase), cN = cos(TAU * p0);

    // Legs: gait blended with a relaxed idle stance and the wider aiming stance.
    const S = lerp(L.walkS, L.runS, runK), duty = lerp(0.6, 0.38, runK), half = S * duty * 0.5, lift = lerp(4.5, 10.5, runK);
    footTrack(ft[0], p0, duty, half, lift); footTrack(ft[1], frac(p0 + 0.5), duty, half, lift);
    let nx = lerp(3 + shift * 0.8, ft[0].x, amt), ny = lerp(0, ft[0].y, amt), nr = lerp(0, ft[0].rot, amt);
    let fx = lerp(-3 + shift * 0.8, ft[1].x, amt), fy = lerp(0, ft[1].y, amt), fr = lerp(0, ft[1].rot, amt);
    const stand = aimK * (1 - amt);   // the planted aiming / filming stance, only while standing still
    if (stand > 0) {
      nx = lerp(nx, film ? -3.5 : -6.5, stand); fx = lerp(fx, film ? 4.5 : 9.5, stand);
      ny = lerp(ny, 0, stand); fy = lerp(fy, 0, stand); nr = lerp(nr, 0, stand); fr = lerp(fr, 0, stand);
    }
    const ph = 2 * TAU * (p0 - duty * 0.5);
    let hipH = D.hip - 0.7 + amt * lerp(1.1 * cos(ph) - 0.5, -1.7 * cos(ph) - 3.2, runK) + breath * 0.12 * (1 - amt);
    hipH = lerp(hipH, D.hip - (film ? 1.5 : 3.2), stand);
    R.px = lerp(shift * 0.9, 0, amt) * (1 - aimK);
    const reach = (x, y) => D.ank + y + sqrt(Math.max(0, LMAX * LMAX - (x - R.px) * (x - R.px)));
    hipH = Math.min(hipH, reach(nx, ny), reach(fx, fy));
    R.py = -hipH;
    ik(R.px, R.py, nx, -(D.ank + ny), D.thigh, D.shin, 1); setLeg(R.legN, nr);
    ik(R.px, R.py, fx, -(D.ank + fy), D.thigh, D.shin, 1); setLeg(R.legF, fr);

    // Torso and head.
    let lean = L.stoop + amt * (0.03 + 0.26 * runK);
    lean = lerp(lean, film ? 0.0 : 0.1, aimK);
    R.lean = lean; R.cl = cos(lean); R.sl = sin(lean);
    R.breath = breath;
    R.sx = R.px + D.tor * R.sl; R.sy = R.py - D.tor * R.cl + breath * 0.4 * (1 - amt * 0.8);
    const nd = lean * 0.75 + 0.03;
    R.hx = R.sx + D.neck * sin(nd); R.hy = R.sy - D.neck * cos(nd);
    const look = L.carry === 'basket' ? 0.14 + 0.12 * sin(tm * 0.8 + sd) : sin(tm * 0.6 + sd * 2) * 0.05;
    R.hang = lean * 0.35 + look * (1 - amt) + runK * amt * 0.05;
    R.yaw = 1;
    R.scared = K.panic && runK > 0.4 && amt > 0.4;

    // Arms: swing against the legs, or flail when scared.
    const sw = lerp(0.42, 0.85, runK) * amt;
    let uN = 0.05 - sw * cN, uF = 0.03 + sw * cN;
    let fN = lerp(0.18, 1.35, runK * amt) + 0.45 * Math.max(0, -cN) * amt * (1 - runK) + 0.25 * -cN * amt * runK;
    let fF = lerp(0.18, 1.35, runK * amt) + 0.45 * Math.max(0, cN) * amt * (1 - runK) + 0.25 * cN * amt * runK;
    if (K.panic) {
      const k = runK * amt;
      uN = lerp(uN, 2.3 + 0.5 * sin(TAU * p0 + 0.6), k); fN = lerp(fN, 0.5 + 0.3 * sin(2 * TAU * p0), k);
      uF = lerp(uF, 1.7 + 0.55 * sin(TAU * p0 + 2.6), k); fF = lerp(fF, 0.6 + 0.3 * sin(2 * TAU * p0 + 1), k);
    }
    if (L.carry === 'basket') {
      const k = 1 - runK * amt * 0.2;
      uN = (0.42 - cN * 0.1 * amt) * k + uN * (1 - k); fN = (0.9 + 0.1 * -cN * amt) * k + fN * (1 - k);
      if (K.panic) { uN = lerp(uN, 0.6 + 0.3 * sin(2 * TAU * p0), runK * amt); fN = lerp(fN, 1.3, runK * amt); }
    }
    let gN = 0, gF = 0, gnx = 0, gny = 0, gfx = 0, gfy = 0;

    // Rifle: carried (slung, in the crook, at the ready) or shouldered towards the target.
    const rf = R.rf;
    rf.mode = '';
    if (CAN_AIM[K.kind]) {
      let cx = 0, cy = 0, ca = 0;
      if (L.carry === 'sling') { tp(-8, -2); cx = TP.x; cy = TP.y; ca = -1.78 + R.lean + sin(TAU * p0) * 0.05 * amt; }
      else if (L.carry === 'ready') { tp(-1, -18); cx = TP.x; cy = TP.y; ca = lerp(0.3, -0.3, runK * amt) + R.lean * 0.4 + sin(TAU * p0 * 2) * 0.03 * amt; gN = 1; gF = 1; }
      else { tp(-5, -19); cx = TP.x; cy = TP.y; ca = 0.5 + R.lean * 0.5 + sin(TAU * p0 * 2) * 0.04 * amt; gN = 1; }
      const ax = R.sx + 1.6, ay = R.sy + 2.6;
      const aa = clamp(atan2(K.ty - ay, Math.max(8, K.tx - ax)), -0.95, 0.85) + sin(tm * 1.3 + sd) * 0.004 + sin(tm * 2.9 + sd) * 0.002;
      rf.mode = L.gun; rf.ox = lerp(cx, ax, aimK); rf.oy = lerp(cy, ay, aimK); rf.ang = lerp(ca, aa, aimK);
      rf.behind = L.carry === 'sling' && aimK < 0.35;
      rf.kick = K.kick * aimK;                                   // recoil: the rifle jumps back and the muzzle flips up
      rf.ox -= 2.6 * rf.kick; rf.ang -= 0.15 * rf.kick;
      gN = Math.max(gN, aimK); gF = Math.max(gF, aimK);
      if (L.carry === 'sling') { gN = aimK; gF = aimK; }
      const ux = cos(rf.ang), uy = sin(rf.ang);
      gnx = rf.ox + ux * 13 - uy * 2.4; gny = rf.oy + uy * 13 + ux * 2.4;
      gfx = rf.ox + ux * 25 - uy * 3.2; gfy = rf.oy + uy * 25 + ux * 3.2;
      if (aimK > 0) {   // cheek on the stock
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
    arm(R.armN, uN, fN, gN, gnx, gny);
    arm(R.armF, uF, fF, gF, gfx, gfy);
    if (rf.mode) {
      st.mz[0] = st.x + K.face * L.scale * (rf.ox + cos(rf.ang) * 42.5);
      st.mz[1] = GY + L.scale * (rf.oy + sin(rf.ang) * 42.5);
    }

    // Things hanging in or held by the near hand.
    const a = R.armN;
    if (L.carry === 'basket') {
      const sway = sin(TAU * p0 - 0.8) * 0.16 * amt + (K.panic ? sin(TAU * p0 * 2) * 0.12 * runK * amt : 0);
      R.basket.ang = sway; R.basket.x = a.wx + sin(sway) * 3; R.basket.y = a.wy + 3.2 * cos(sway);
    }
    if (L.carry === 'phone') {
      const dir = atan2(a.wy - a.ey, a.wx - a.ex);
      R.phone.x = a.wx; R.phone.y = a.wy;
      R.phone.ang = lerp(dir - PI / 2, film ? 0.04 : 0, aimK);
    }
  }

  // --- Body parts ------------------------------------------------------------------------
  function drawLeg(ctx, K, lg, far) {
    const L = K.L, kind = K.kind, f = far ? 0.76 : 1;
    let thigh = L.pants, shin = L.pants, boot = L.boots, bootF = 0.45, sock = null;
    if (kind === 'picker') { thigh = L.skirt; shin = L.pants; bootF = 0.72; }
    else if (kind === 'tourist') { thigh = L.pants; shin = L.skin; bootF = 0.12; sock = '#f4f4f4'; }
    else if (kind === 'ztmh') bootF = 0.52;
    else if (kind === 'poacher') bootF = 0.4;
    const mid = (a, b, t) => a + (b - a) * t;
    if (kind === 'tourist') {
      limb(ctx, R.px, R.py, mid(R.px, lg.kx, 0.9), mid(R.py, lg.ky, 0.9), 8.8, 7.4, dk(thigh, f));
      limb(ctx, mid(R.px, lg.kx, 0.9), mid(R.py, lg.ky, 0.9), lg.kx, lg.ky, 7.4, 6.6, dk(thigh, f));
      limb(ctx, lg.kx, lg.ky, lg.ax, lg.ay, 5.6, 4.2, dk(shin, f));
    } else {
      limb(ctx, R.px, R.py, lg.kx, lg.ky, 8.4, 6.8, dk(thigh, f));
      limb(ctx, lg.kx, lg.ky, lg.ax, lg.ay, 6.6, 4.8, dk(shin, f));
    }
    if (sock) limb(ctx, mid(lg.kx, lg.ax, 0.7), mid(lg.ky, lg.ay, 0.7), lg.ax, lg.ay, 4.8, 4.8, dk(sock, f));
    limb(ctx, mid(lg.kx, lg.ax, 1 - bootF), mid(lg.ky, lg.ay, 1 - bootF), lg.ax, lg.ay, kind === 'picker' ? 6.2 : 5.8, 5, dk(boot, f));
    shoe(ctx, lg, dk(boot, f), dk(L.sole, f), kind === 'picker' ? 7 : 7.6);
  }

  function drawArm(ctx, K, a, far) {
    const L = K.L, kind = K.kind, f = far ? 0.76 : 1;
    const sleeve = kind === 'tourist' ? L.skin : L.coat;
    const hand = kind === 'ztmh' ? '#16181a' : L.skin;
    limb(ctx, R.sx, R.sy, a.ex, a.ey, 5.8, 4.8, dk(sleeve, f));
    limb(ctx, a.ex, a.ey, a.wx, a.wy, 4.8, 3.8, dk(kind === 'tourist' ? L.skin : sleeve, f));
    if (kind === 'tourist') {   // short T-shirt sleeve
      limb(ctx, R.sx, R.sy, R.sx + (a.ex - R.sx) * 0.55, R.sy + (a.ey - R.sy) * 0.55, 6.4, 6, dk(L.coat, f));
    }
    if (kind === 'ztmh' && !far) limb(ctx, a.ex + (a.wx - a.ex) * 0.2, a.ey + (a.wy - a.ey) * 0.2, a.ex + (a.wx - a.ex) * 0.3, a.ey + (a.wy - a.ey) * 0.3, 4.9, 4.7, L.stripe);
    if (kind === 'picker' && !far) limb(ctx, a.ex + (a.wx - a.ex) * 0.62, a.ey + (a.wy - a.ey) * 0.62, a.wx, a.wy, 4.4, 4.1, dk(L.coat, 0.85));
    ctx.fillStyle = dk(hand, f);
    const dx = a.wx - a.ex, dy = a.wy - a.ey, d = hypot(dx, dy) || 1;
    circle(ctx, a.wx + dx / d * 1.2, a.wy + dy / d * 1.2, 2.5);
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
    const L = K.L, kind = K.kind;
    ctx.save();
    ctx.translate(R.px, R.py); ctx.rotate(R.lean);
    ctx.fillStyle = L.coat;
    if (kind === 'poacher') {                       // hunched back and a ragged hem
      ell(ctx, -5.2, -16, 4.4, 5.2);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-5.6 + i * 3.6, 2.4); ctx.lineTo(-3.8 + i * 3.6, 6.4 - (i % 2) * 1.6); ctx.lineTo(-2 + i * 3.6, 2.4); ctx.fill(); }
    } else if (kind === 'picker') ell(ctx, -5.6, -15.5, 4.2, 5.4);
    torsoPath(ctx, L.belly); ctx.fill();
    ctx.save();
    torsoPath(ctx, L.belly); ctx.clip();
    if (kind === 'walker') {
      ctx.fillStyle = L.vest;
      ctx.beginPath();
      ctx.moveTo(-5.8, 3); ctx.quadraticCurveTo(-7, -6, -6.8, -15); ctx.quadraticCurveTo(-6.6, -21, -3.6, -22);
      ctx.lineTo(1.2, -17.8); ctx.lineTo(4.8, -20.4); ctx.quadraticCurveTo(7.8, -13, 7.1 + L.belly, -6);
      ctx.quadraticCurveTo(7.3 + L.belly, 0, 5.6, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dk(L.vest, 0.8);
      ctx.fillRect(1.2, -9.6, 5.4, 4.4); ctx.fillRect(-5.4, -9.6, 4, 4.4);
      ctx.fillStyle = dk(L.vest, 1.18); ctx.fillRect(1.4, -9.2, 4.8, 1);
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
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(2, -11, 5, 4); ctx.fillStyle = '#4c4c4c'; ctx.fillRect(2.2, -10.6, 4.4, 0.9);
      ctx.fillStyle = '#343a2c'; ctx.fillRect(-2.6, -25, 7.6, 4.4);
      ctx.fillStyle = '#6b5a3a'; ctx.fillRect(-8, -1.6, 17, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-6, -21, 3, 20);
    } else if (kind === 'picker') {
      ctx.fillStyle = '#ece5d2'; rr(ctx, -0.6, -10.6, 9.6 + L.belly, 15, 2);
      ctx.fillStyle = '#d9d1bb'; ctx.fillRect(2.2, -5.6, 4.6, 3.2);
      ctx.fillStyle = dk(L.coat, 0.7);
      for (let i = 0; i < 3; i++) circle(ctx, 3.6, -20 + i * 3, 0.7);
    } else if (kind === 'tourist') {
      ctx.fillStyle = '#f3f6f9';   // a little white Tatra on the shirt
      ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(3.4, -17.5); ctx.lineTo(5.4, -13.6); ctx.lineTo(6.6, -15); ctx.lineTo(7.6, -12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3b3f4a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.2, -23); ctx.quadraticCurveTo(5.6, -20, 5.4, -10); ctx.lineTo(-3, -2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-9, -26, 5, 32);
    ctx.restore();
    ctx.restore();
  }

  function drawSkirt(ctx, K) {
    const L = K.L, n = R.legN, f = R.legF;
    const hy = R.py * 0.47;
    const fr = R.px + 9.2 + Math.max(0, Math.max(n.ax, f.ax) - 4) * 0.35, bk = R.px - 9.4 + Math.min(0, Math.min(n.ax, f.ax) + 4) * 0.35;
    ctx.fillStyle = L.skirt;
    ctx.beginPath();
    ctx.moveTo(R.px - 6.6, R.py - 3); ctx.lineTo(R.px + 7, R.py - 3);
    ctx.quadraticCurveTo(R.px + 9, R.py * 0.7, fr, hy);
    ctx.quadraticCurveTo(R.px + 1, hy + 2.4, bk, hy);
    ctx.quadraticCurveTo(R.px - 8.6, R.py * 0.7, R.px - 6.6, R.py - 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dk(L.skirt, 1.55); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(bk + 0.6, hy - 0.8); ctx.quadraticCurveTo(R.px + 1, hy + 1.6, fr - 0.6, hy - 0.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(R.px + 1, R.py + 2); ctx.lineTo(R.px + 3, hy - 2); ctx.moveTo(R.px - 3, R.py + 2); ctx.lineTo(R.px - 5.4, hy - 2); ctx.stroke();
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

  // --- Head ---------------------------------------------------------------------------------
  // Drawn in head coordinates: origin at the centre of the head, +x forward. yaw in -1..1 slides the face sideways (used
  // for the hunter in the stand, who turns his head without turning the body).
  function drawHead(ctx, K, tm) {
    const L = K.L, kind = K.kind, yaw = R.yaw, scared = R.scared;
    const skin = L.skin, skinD = dk(skin, 0.86);
    ctx.save();
    ctx.translate(R.hx, R.hy); ctx.rotate(R.hang);
    ctx.fillStyle = skinD; ctx.fillRect(-3.4, 3, 6.4, 9.5);      // neck
    if (kind === 'poacher') { ctx.fillStyle = '#343a2c'; rr(ctx, -4.4, 6.4, 9.4, 5, 2); }   // neck gaiter
    // hair at the back
    if (kind !== 'picker') {
      ctx.fillStyle = L.hair; ell(ctx, -4.4 * yaw, 1.8, 3.3, 4.7);
      if (kind === 'poacher') {
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6.8, -0.5 + i * 3); ctx.lineTo(-10.2 + i * 0.6, 1.6 + i * 3.2); ctx.lineTo(-5.6, 2.6 + i * 3); ctx.fill(); }
      }
    }
    ctx.fillStyle = skin; circle(ctx, 0, 0, D.hr);
    ctx.fillStyle = skinD; circle(ctx, -1.6 * yaw, 1, 1.8);                    // ear
    ctx.fillStyle = skin; circle(ctx, 7.2 * yaw, 1.1, 1.9);                    // nose
    if (kind === 'poacher') {                                                  // stubble and a sour mouth
      ctx.fillStyle = 'rgba(52,38,26,0.5)';
      ctx.beginPath(); ctx.arc(0, 0, D.hr, 0.15, 1.9); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
    }
    if (kind === 'picker' || kind === 'tourist') { ctx.fillStyle = 'rgba(224,110,110,0.32)'; circle(ctx, 3 * yaw, 3, 1.7); }
    // eye
    const ex = 3.5 * yaw, blink = frac(tm / 3.7 + K.seed) < 0.025;
    if (scared) {
      ctx.fillStyle = '#fff'; circle(ctx, ex, -0.8, 2); ctx.fillStyle = '#2a1d12'; circle(ctx, ex + 0.6, -0.7, 1);
    } else if (K.glasses) {
      ctx.fillStyle = '#16181c'; rr(ctx, ex - 2.8, -2.6, 7.2, 3.6, 1.4);
      ctx.fillStyle = 'rgba(180,220,255,0.55)'; ctx.fillRect(ex - 1.8, -2, 2, 0.9);
    } else {
      ctx.fillStyle = '#2a1d12';
      if (blink || K.squint) ctx.fillRect(ex - 1.2, -0.6, 2.6, 0.9); else circle(ctx, ex, -0.6, 1.05);
    }
    ctx.strokeStyle = kind === 'picker' ? '#9a9a9a' : dk(L.hair, 0.8); ctx.lineWidth = kind === 'poacher' ? 1.3 : 0.9; ctx.lineCap = 'round';
    ctx.beginPath();
    if (scared) { ctx.moveTo(ex - 2, -4.2); ctx.lineTo(ex + 2, -4.8); }
    else if (kind === 'poacher') { ctx.moveTo(ex - 2.6, -3.1); ctx.lineTo(ex + 2.3, -1.9); }
    else { ctx.moveTo(ex - 2, -3.2); ctx.lineTo(ex + 2, -3.4); }
    ctx.stroke();
    ctx.fillStyle = '#7a3b32';
    if (scared) { ell(ctx, 4.8 * yaw, 4.3, 1.3, 1.9); }
    else { ctx.fillRect(3.4 * yaw, 4, 2.4 * yaw, 0.8); }
    if (kind === 'walker') { ctx.fillStyle = '#5a3a24'; ell(ctx, 5 * yaw, 2.9, 3.1, 1.2); }   // moustache
    hat(ctx, K, tm);
    ctx.restore();
  }

  function hat(ctx, K, tm) {
    const L = K.L, kind = K.kind, yaw = R.yaw;
    if (kind === 'walker') {
      ctx.save(); ctx.rotate(-0.07);
      ctx.fillStyle = dk(L.hat, 0.85); ell(ctx, 0.6, -4.6, 10.6, 2.3);                      // brim
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-6.4, -4.7); ctx.lineTo(-5.2, -11.6); ctx.quadraticCurveTo(0, -12.6, 5.6, -11.4); ctx.lineTo(6.8, -4.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a5c3a'; ctx.fillRect(-6.5, -6.6, 13.3, 2);                          // band
      ctx.fillStyle = dk(L.hat, 1.25); ctx.fillRect(-4.8, -11, 2.6, 0.9);
      const fs = K.small ? 0.6 : 1;                                                          // feather (shorter in the stand)
      ctx.translate(-3.6, -6.4); ctx.scale(fs, fs); ctx.translate(3.6, 6.4);
      ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3.6, -6.4); ctx.quadraticCurveTo(-8.6, -10, -11.4, -17); ctx.stroke();
      ctx.fillStyle = '#d9c28c';
      ctx.beginPath(); ctx.moveTo(-4, -7); ctx.quadraticCurveTo(-9, -9, -12.6, -17.6); ctx.quadraticCurveTo(-7.6, -14, -2.6, -6.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#a07a40'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-6.6, -9.6); ctx.lineTo(-4.4, -9.4); ctx.moveTo(-9, -12.6); ctx.lineTo(-6.8, -12); ctx.stroke();
      ctx.restore();
    } else if (kind === 'ztmh') {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-7.6, -2.2); ctx.quadraticCurveTo(-7.8, -10.6, 0, -10.6); ctx.quadraticCurveTo(7.8, -10.6, 7.6, -2.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#16221a'; ctx.beginPath(); ctx.moveTo(4, -4.4); ctx.lineTo(12.2, -3.4); ctx.quadraticCurveTo(12.6, -2, 11, -1.9); ctx.lineTo(4, -2.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8d477'; circle(ctx, 3.4, -6.8, 1.3);
      ctx.fillStyle = dk(L.hat, 1.4); ctx.fillRect(-7.4, -3.6, 15, 1);
    } else if (kind === 'poacher') {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(-7.8, -3); ctx.quadraticCurveTo(-8.2, -11.4, 0, -11.6); ctx.quadraticCurveTo(8.2, -11.4, 7.8, -3.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#272b31'; rr(ctx, -8.2, -6.4, 16.6, 3.6, 1.4);
      ctx.strokeStyle = '#33383f'; ctx.lineWidth = 0.7;
      ctx.beginPath(); for (let x = -6; x < 8; x += 2.4) { ctx.moveTo(x, -6.2); ctx.lineTo(x, -3.2); } ctx.stroke();
    } else if (kind === 'picker') {
      ctx.fillStyle = L.hat;
      ctx.beginPath(); ctx.moveTo(6, -3.4); ctx.quadraticCurveTo(7.8, -8, 1, -9.4); ctx.quadraticCurveTo(-8.4, -9, -8.2, 0.5);
      ctx.quadraticCurveTo(-8.4, 4.5, -5.4, 6.4); ctx.lineTo(-2.4, 3.6); ctx.lineTo(-1.2, -2); ctx.quadraticCurveTo(2, -1.6, 6, -3.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6.2, 4.6); ctx.lineTo(-10.4, 8.4); ctx.lineTo(-7.2, 8.6); ctx.lineTo(-4.2, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6.2, 4.6); ctx.lineTo(-11.4, 5.4); ctx.lineTo(-8.2, 2.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6e9e4';
      [[-3.4, -6.4], [0.8, -7.8], [-5.8, -2.4], [3.4, -5], [-5.4, 2.8], [-8.6, 6.8]].forEach(([x, y]) => circle(ctx, x, y, 0.85));
      ctx.fillStyle = L.hair; ctx.fillRect(4.6, -4.2, 1.4, 1.8);
    } else if (kind === 'tourist') {
      ctx.fillStyle = L.hat; ell(ctx, 0.4, -4.6, 10.4, 2.6);
      ctx.beginPath(); ctx.moveTo(-6, -4.8); ctx.quadraticCurveTo(-6.4, -10.8, 0, -10.8); ctx.quadraticCurveTo(6.4, -10.8, 6.6, -4.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-6.1, -6.6, 12.8, 1.8);
      ctx.fillStyle = dk(L.hat, 0.9); ell(ctx, 4.6, -3.6, 6, 1);
    }
  }

  // --- Things the figures carry --------------------------------------------------------------
  function drawRifle(ctx, rf, tm) {
    const kind = rf.mode, tac = kind === 'tac', old = kind === 'old';
    ctx.save();
    ctx.translate(rf.ox, rf.oy); ctx.rotate(rf.ang);
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
    if (rf.kick > 0.35) {   // muzzle flash
      const k = (rf.kick - 0.35) / 0.65, r = 4 + 8 * k;
      ctx.fillStyle = 'rgba(255,190,60,' + (0.6 + 0.4 * k).toFixed(2) + ')';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * PI / 8, rr2 = i % 2 ? r * 0.42 : r; ctx.lineTo(43 + cos(a) * rr2 * 1.15, sin(a) * rr2); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6c8'; circle(ctx, 43, 0, 1.8 + 2.4 * k);
    }
    ctx.restore();
  }

  function drawBasket(ctx, K, tm) {
    const b = R.basket;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.ang);
    const caps = ['#8a4b2a', '#e29a2e', '#9b5b32'];
    [[-4, 0.5, 2.7], [0.6, -1.4, 3.1], [4.6, 0, 2.5]].forEach(([x, y, r], i) => {
      ctx.fillStyle = '#efe6d2'; ctx.fillRect(x - 0.9, y, 1.8, 4);
      ctx.fillStyle = caps[i]; ctx.beginPath(); ctx.ellipse(x, y + 0.4, r, r * 0.7, 0, PI, 0); ctx.fill();
    });
    ctx.fillStyle = '#b88a4a';
    ctx.beginPath(); ctx.moveTo(-9, 2.6); ctx.lineTo(9, 2.6); ctx.quadraticCurveTo(8.4, 12, 0, 12.4); ctx.quadraticCurveTo(-8.4, 12, -9, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8f6730'; ctx.fillRect(-9.4, 2, 18.8, 1.8);
    ctx.strokeStyle = '#8f6730'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -6; i <= 6; i += 3) { ctx.moveTo(i, 4); ctx.lineTo(i * 0.8, 11.6); }
    ctx.moveTo(-8.4, 6.6); ctx.lineTo(8.4, 6.6); ctx.moveTo(-7.4, 9.4); ctx.lineTo(7.4, 9.4); ctx.stroke();
    ctx.strokeStyle = '#7a5528'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8.4, 2.6); ctx.quadraticCurveTo(0, -9.4, 8.4, 2.6); ctx.stroke();
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
    ctx.restore();
    ctx.fillStyle = K.L.skin;
    circle(ctx, p.x, p.y + 0.4, 2.4);
  }

  // --- Putting a figure together ---------------------------------------------------------------
  const K = {
    kind: 'walker', L: LOOK.walker, state: 'idle', face: 1, seed: 0, tx: 200, ty: -48,
    panic: false, glasses: false, squint: false, small: false, kick: 0,
  };

  function render(ctx, tm, st) {
    const kind = K.kind, rf = R.rf;
    drawArm(ctx, K, R.armF, true);
    drawLeg(ctx, K, R.legF, true);
    drawLeg(ctx, K, R.legN, false);
    if (kind === 'tourist') drawPack(ctx, K);
    if (rf.mode && rf.behind) drawRifle(ctx, rf, tm);
    if (kind === 'picker') drawSkirt(ctx, K);
    drawTorso(ctx, K, tm);
    drawHead(ctx, K, tm);
    if (rf.mode && !rf.behind) drawRifle(ctx, rf, tm);
    drawArm(ctx, K, R.armN, false);
    if (kind === 'picker') drawBasket(ctx, K, tm);
    if (kind === 'tourist') drawPhone(ctx, K, tm, K.state === 'film' && st.aimK > 0.5);
  }

  // h = { x, dir, kind, state, aimAt, id? } ; x is where the feet are, on the ground line.
  ZS.drawHuman = function (ctx, h, time) {
    if (!(time >= 0)) time = 0;
    const kind = LOOK[h.kind] ? h.kind : 'walker', L = LOOK[kind];
    let state = h.state;
    if (state !== 'walk' && state !== 'run' && state !== 'aim' && state !== 'film') state = 'idle';
    if (state === 'aim' && !CAN_AIM[kind]) state = 'idle';
    if (state === 'film' && kind !== 'tourist') state = 'idle';
    const targeted = state === 'aim' || state === 'film', at = h.aimAt;
    let face = h.dir < 0 ? -1 : 1;
    if (targeted && at && abs(at[0] - h.x) > 8) face = at[0] < h.x ? -1 : 1;

    const st = getState(h, time);
    advance(st, h, L, state === 'walk' || state === 'run', state === 'run', targeted, face, time);
    K.kind = kind; K.L = L; K.state = state; K.face = face; K.seed = st.seed;
    K.panic = state === 'run' && (kind === 'picker' || kind === 'tourist' || !!h.scared);
    K.glasses = kind === 'ztmh' || kind === 'tourist';
    K.squint = state === 'aim' && st.aimK > 0.5;
    K.small = false; K.kick = clamp(h.kick || 0, 0, 1);
    if (targeted && at) { K.tx = face * (at[0] - h.x) / L.scale; K.ty = (at[1] - GY) / L.scale; } else { K.tx = 200; K.ty = -48; }

    ctx.save();
    ctx.translate(h.x, h.y === undefined ? GY : h.y);
    ctx.scale(face * L.scale, L.scale);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (h.shadow !== false) { ctx.fillStyle = 'rgba(15,22,8,0.2)'; ell(ctx, 0, 1.2, 15, 2.8); }
    solve(K, st, time);
    render(ctx, time, st);
    ctx.restore();
  };

  // --- The hunter in the window of the raised stand --------------------------------------------
  // Geometry of post() in js/render/props.js: the dark window is 46 wide, from GY - 195 to GY - 177 around s.x. Override with
  // ZS.POST_WINDOW = { half, top, bot } if the stand is redrawn.
  const WIN = { half: 23, top: GY - 195, bot: GY - 177 };
  const POST_SCALE = 0.82;
  const posts = new WeakMap();

  function winClip(ctx, w, cx) {
    ctx.beginPath(); ctx.rect(cx - w.half, w.top - 7, w.half * 2, w.bot - w.top + 7.5); ctx.clip();
  }

  ZS.drawPostHunter = function (ctx, s, time) {
    if (!(time >= 0)) time = 0;
    const w = ZS.POST_WINDOW || WIN, L = LOOK.walker, sc = POST_SCALE;
    const cross = s.cross === undefined ? s.x - 200 : s.cross;
    const want = cross >= s.x ? 1 : -1, lockWant = s.lock > 0 ? 1 : 0;
    let ps = posts.get(s);
    if (!ps) { ps = { t: time, face: want, lean: lockWant, seed: (abs(s.x) * 0.013) % TAU, mz: [0, 0] }; posts.set(s, ps); }
    const dt = time - ps.t;
    if (!(dt >= 0 && dt < 0.3)) { ps.face = want; ps.lean = lockWant; }
    else { ps.face += (want - ps.face) * Math.min(1, dt * 9); ps.lean += (lockWant - ps.lean) * Math.min(1, dt * 8); }
    ps.t = time;
    const lk = ps.lean, sd = ps.seed;
    const fx = abs(ps.face) < 0.05 ? (ps.face < 0 ? -0.05 : 0.05) : ps.face, sgn = fx < 0 ? -1 : 1;
    const sill = w.bot, cx = s.x;

    K.kind = 'walker'; K.L = L; K.state = lk > 0.5 ? 'aim' : 'idle'; K.seed = sd; K.panic = false; K.glasses = false;
    K.squint = lk > 0.5; K.kick = clamp(s.kick || 0, 0, 1);
    const lean = 0.08 + 0.2 * lk;
    R.lean = lean; R.cl = cos(lean); R.sl = sin(lean);
    R.sx = 1 + 3 * lk + sin(time * 0.9 + sd) * 0.5 * (1 - lk); R.sy = -6.2 + 1.4 * lk + sin(time * 1.9 + sd) * 0.25;
    R.px = R.sx - D.tor * R.sl; R.py = R.sy + D.tor * R.cl;
    const nd = lean * 0.75 + 0.03;
    R.hx = R.sx + D.neck * sin(nd) + lk * 1.5; R.hy = R.sy - D.neck * cos(nd) + lk * 1.2;
    R.hang = 0.02 + lk * 0.12;
    const scan = clamp(0.5 + 0.6 * sin(time * 0.9 + sd), -0.6, 1);
    R.yaw = lerp(scan, 1, lk); R.scared = false; R.breath = 0;

    const tx = sgn * (cross - cx) / sc, ty = (GY - 30 - sill) / sc;
    const rf = R.rf, ox = R.sx + 1.6 - 2.5 * (1 - lk), oy = R.sy + 2.6 + 2.8 * (1 - lk);
    rf.mode = 'hunt'; rf.ox = ox - 2.2 * K.kick; rf.oy = oy; rf.behind = false; rf.kick = K.kick;
    rf.ang = clamp(atan2(ty - oy, Math.max(10, tx - ox)), -0.1, 0.95) + sin(time * 1.3 + sd) * 0.004 * lk - 0.12 * K.kick;
    const ux = cos(rf.ang), uy = sin(rf.ang);
    ps.mz[0] = cx + fx * sc * (rf.ox + ux * 42.5); ps.mz[1] = sill + sc * (rf.oy + uy * 42.5);
    arm(R.armN, 0, 0, 1, ox + ux * 13 - uy * 2.4, oy + uy * 13 + ux * 2.4);
    arm(R.armF, 0, 0, 1, ox + ux * 25 - uy * 3.2, oy + uy * 25 + ux * 3.2);

    K.small = true;
    // Inside the window: head and shoulders, a little darker as he sits inside the hut.
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    winClip(ctx, w, cx);
    ctx.translate(cx, sill); ctx.scale(fx * sc, sc);
    drawTorso(ctx, K, time);
    drawHead(ctx, K, time);
    ctx.restore();
    ctx.save();
    winClip(ctx, w, cx);
    ctx.fillStyle = 'rgba(38,24,12,0.14)'; ctx.fillRect(cx - w.half, w.top - 7, w.half * 2, w.bot - w.top + 8);
    ctx.fillStyle = 'rgba(20,12,6,0.3)'; ctx.fillRect(cx - w.half, w.top, w.half * 2, 3);
    ctx.restore();
    K.small = false;
    // The sill, then his arms and the rifle resting over it.
    ctx.save();
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(cx - w.half - 2, w.bot - 0.5, w.half * 2 + 4, 3.2);
    ctx.fillStyle = '#7a5534'; ctx.fillRect(cx - w.half - 2, w.bot - 0.5, w.half * 2 + 4, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.translate(cx, sill); ctx.scale(fx * sc, sc);
    drawArm(ctx, K, R.armF, true);
    drawRifle(ctx, rf, time);
    drawArm(ctx, K, R.armN, false);
    ctx.restore();
  };

  // World position [x, y] of the rifle muzzle in the pose drawn last for h (or for a stand shooter s); null before the first
  // draw or for figures without a rifle. Use it to start the shot line and the crosshair line at the barrel.
  ZS.muzzle = function (o) {
    const k = o.h && typeof o.h === 'object' ? o.h : o;   // a shooter whose descriptor is stored as o.h works too
    const st = posts.get(o) || byObj.get(k) || (k.id !== undefined && k.id !== null ? byId.get(k.id) : null);
    return st && st.mz && (st.mz[0] || st.mz[1]) ? st.mz : null;
  };

  ZS.HUMAN_KINDS = ['walker', 'ztmh', 'poacher', 'picker', 'tourist'];
  ZS.HUMAN_STATES = ['idle', 'walk', 'run', 'aim', 'film'];
  ZS.HUMAN_LOOK = LOOK;   // read-only: palettes and stride lengths (the preview page uses them)
})();
