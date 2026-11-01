// The bear: a side-view brown bear with articulated legs, hiding upright behind a trunk, and climbing.
// ZS.drawBear draws it in the open, ZS.drawBearBehindTree before the trunk, ZS.drawBearInFront (hugging
// paws, claws on the edges, the peeking head) after it, and ZS.drawBearClimbing on a trunk.
// All take (ctx, b, time) in world units, y down. Canvas paths only.
(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const C = {
    fur: '#6b4226', far: '#4e2f19', leg: '#5b371f', muzzle: '#9a6a44', dark: '#1d1209', ear: '#3f2614',
    tail: '#5a3720', claw: '#e4d6bb', clawFar: '#9c8a70', eye: '#f4efe6', pad: '#2b1a10',
    shade: 'rgba(30,14,4,0.17)', soft: 'rgba(30,14,4,0.09)', light: 'rgba(255,226,190,0.06)',
  };
  const TAU = Math.PI * 2;
  // Seconds: rising behind a tree, the share of it spent rearing in side view, take-off crouch,
  // landing squash, and dropping back onto four legs.
  const RISE = 0.3, SPLIT = 0.55, TAKEOFF = 0.08, LAND = 0.2, DROP = 0.18;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);
  const ease = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));

  // Legs: 0 near fore, 1 far fore, 2 near hind, 3 far hind; offs is when each foot touches down.
  // A planted foot sweeps back duty * stride per cycle, exactly what the body covers, so it never slides.
  // WALK is the bear amble: a four-beat lateral sequence (near hind, near fore, far hind, far fore) of
  // about one body length per cycle, 1.7 cycles a second at 165. STALK is the crouched creep with short,
  // deliberate steps. RUN is a gallop, about 2.5 cycles a second at 290. shift moves the centre of the
  // sweep forward for [fore, hind]; lift is the toe clearance; kick and reach carry a swinging foot back
  // after lift-off and forward before it lands.
  const WALK = { stride: 96, duty: 0.52, lift: [9, 6], offs: [0.25, 0.75, 0, 0.5], shift: [2, 1], kick: [2, 3], reach: [4, 2] };
  const STALK = { stride: 64, duty: 0.7, lift: [6, 4], offs: [0.25, 0.75, 0, 0.5], shift: [6, 2], kick: [1, 1], reach: [3, 1] };
  const RUN = { stride: 116, duty: 0.36, lift: [10, 8], offs: [0.47, 0.39, 0.07, 0], shift: [6, 5], kick: [4, 9], reach: [12, 6] };
  const STAND = [2, -2, -2, 2];
  // Shoulder or hip in body space; toe x when standing; upper segment [shortest, longest] (it is hidden in
  // the body, so it may stretch and a long stride still reaches); lower segment; joint side;
  // foot [length to the toes, ankle height, heel behind the ankle]; radii.
  // Standing, the forearms are near vertical columns and the hind legs almost straight over flat feet.
  const LEG = [
    { root: [16, -40], toe: 18, up: [12, 21], low: 22, bend: 1, foot: [6, 4, 3], r: [8, 6.4, 5.9, 5] },
    { root: [-25, -38], toe: -14, up: [12, 22], low: 19, bend: -1, foot: [12, 4.5, 4], r: [10.5, 7.2, 6.1, 4.9] },
  ];
  // The shoulder blade and pelvis slide with their leg (share of the foot's travel); where the ankle stands
  // relative to the shoulder or hip.
  const SLIDE = [0.28, 0.18], ANKLE = [-4, -1];

  // Two-segment IK from a root to a target: [joint x, joint y, end x, end y].
  function ik(rx, ry, tx, ty, a, b, bend) {
    let dx = tx - rx, dy = ty - ry, d = Math.hypot(dx, dy);
    if (d < 1e-3) { dx = 0; dy = 1; d = 1; }
    const dc = clamp(d, Math.abs(a - b) + 1, a + b - 0.05);
    const ang = Math.atan2(dy, dx) + bend * Math.acos(clamp((a * a + dc * dc - b * b) / (2 * a * dc), -1, 1));
    return [rx + Math.cos(ang) * a, ry + Math.sin(ang) * a, rx + (dx / d) * dc, ry + (dy / d) * dc];
  }
  // A leg: the upper segment stretches within its limits to keep about two units of slack, so the visible
  // lower segment keeps its length and the joint bends only a little.
  function legIK(L, rx, ry, tx, ty) {
    const a = clamp(Math.hypot(tx - rx, ty - ry) - L.low + 2, L.up[0], L.up[1]);
    return ik(rx, ry, tx, ty, a, L.low, L.bend);
  }

  // A limb segment: two discs joined by their tangents.
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

  // A smooth closed outline through the points (Catmull-Rom as Bezier curves). Leaves the path open for fill or clip.
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

  // A small round ear; inner is the colour of its inside, or false for the far ear.
  function ear(ctx, x, y, r, col, inner, rot, flat) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = col; ell(ctx, 0, 0, r, r * flat);
    if (inner) { ctx.fillStyle = inner; ell(ctx, 0, -r * 0.18 * flat, r * 0.5, r * 0.5 * flat); }
    ctx.restore();
  }

  // Palettes: C in the open, HID in the shade behind a trunk; mixPal blends them while stepping behind.
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const KEYS = ['fur', 'far', 'leg', 'muzzle', 'dark', 'ear', 'tail', 'claw', 'clawFar', 'eye', 'pad'];
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
  // A colour between two colours of a palette (a leg passing from the far side to the near side).
  function tint(K, a, b, t) {
    if (t <= 0.001) return K[a];
    if (t >= 0.999) return K[b];
    return 'rgb(' + K.rgb[a].map((v, i) => Math.round(lerp(v, K.rgb[b][i], t))).join(',') + ')';
  }

  // A smooth bump d seconds long that comes back every period seconds (sin² so it starts and ends flat).
  function bump(t, period, d, off) {
    const u = frac((t + (off || 0)) / period) * period;
    return u < d ? Math.pow(Math.sin((Math.PI * u) / d), 2) : 0;
  }
  // The same with a plateau: eases in and out over e seconds.
  function hold(t, period, d, e, off) {
    const u = frac((t + (off || 0)) / period) * period;
    return u < d ? smooth(u / e) * smooth((d - u) / e) : 0;
  }
  // A tear now and then: [progress 0..1, strength 0..1].
  function tear(time, fear) {
    const u = frac(time / 3.7 + 0.13);
    const on = fear * smooth(Math.sin(time * 0.53) * 1.6 + 0.5);
    return u < 0.5 ? [u / 0.5, on * Math.sin((Math.PI * u) / 0.5)] : [0, 0];
  }

  // --- Private animation state, advanced once per distinct time value -----------------------
  // Everything here eases over time, so changes of state never pop between frames.

  const anim = new WeakMap();
  const modeOf = (b) => (b.climbing ? 'climb' : b.hiding ? 'hide' : 'side');
  // Moves v toward target at a constant speed (used under a smoothstep for gentle starts and stops).
  const ramp = (v, target, speed, dt) => v + clamp(target - v, -speed * dt, speed * dt);

  function track(b, time) {
    let s = anim.get(b);
    const head = b.dir < 0 ? Math.PI : 0;
    if (!s) {
      s = { t: time, px: b.x, py: b.y, phase: 0, mwl: 0, mw: 0, rwl: 0, rw: 0, cspd: 0, cw: b.crouch ? 1 : 0, aw: 0,
        face: b.dir || 1, tu: b.dir < 0 ? 1 : 0, lead: 1, yh: head, ys: head, yp: head, vy: b.vy || 0, shY: b.y, ground: b.onGround, groundY: b.y, airT: 0,
        toT: 0, landT: 0, dropT: 0, from: null, mode: modeOf(b), breath: 0, fear: b.danger ? 1 : 0,
        cov: b.covered ? 1 : 0, side: b.peekSide || 1 };
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
    // The gait phase comes from distance travelled, so planted feet stay put on the ground.
    if (free && Math.abs(dx) < 80) {
      s.phase = frac(s.phase + Math.abs(dx) / lerp(lerp(WALK.stride, RUN.stride, s.rw), STALK.stride, s.cw));
      v = Math.abs(dx) / dt;
    }
    // Gait weights ramp over about a quarter second under a smoothstep: no snap into or out of a stride.
    s.mwl = ramp(s.mwl, smooth(v / lerp(130, 60, s.cw)), 4, dt);
    s.rwl = ramp(s.rwl, smooth((v - 205) / 85), 3.5, dt);
    s.mw = smooth(s.mwl); s.rw = smooth(s.rwl);
    s.cspd = ease(s.cspd, b.climbing && Math.abs(dy) < 80 ? Math.abs(dy) / dt : 0, 6, dt);
    s.cw = ease(s.cw, b.crouch ? 1 : 0, 6, dt);
    s.aw = ease(s.aw, b.onGround || !free ? 0 : 1, b.onGround ? 22 : 16, dt);
    // In the air the pose follows a smoothed vy; on landing it keeps the last value while it fades out.
    if (!b.onGround) s.vy = ease(s.vy, b.vy || 0, 20, dt);
    s.fear = ease(s.fear, b.danger ? 1 : 0, 4, dt);
    s.cov = ease(s.cov, b.covered ? 1 : 0, 3, dt);
    s.side = ease(s.side, b.peekSide || 1, 3, dt);
    if (free && s.ground && !b.onGround) { s.airT = 0; if (b.vy < -200) s.toT = TAKEOFF; }
    if (free && !s.ground && b.onGround && s.airT > 0.12) s.landT = LAND;
    s.ground = b.onGround;
    if (b.onGround) s.groundY = b.y; else s.airT += dt;
    s.shY = ease(s.shY, b.onGround ? b.y : s.groundY, 25, dt);   // the shadow slides onto a log, never pops
    s.toT = Math.max(0, s.toT - dt);
    s.landT = Math.max(0, s.landT - dt);
    s.dropT = Math.max(0, s.dropT - dt);
    // Turning round (heading 0 faces right, PI left, PI/2 the viewer): tu runs from 0 (right) to 1 (left)
    // in 0.42 s and lead says which way it runs, so the head always leads, the shoulders follow and the
    // hips come round last. A flip mid-turn eases lead over and runs the turn back.
    const goal = b.dir < 0 ? 1 : 0;
    s.lead = ramp(s.lead, goal > s.tu ? 1 : goal < s.tu ? -1 : s.lead, 8, dt);
    s.tu = ramp(s.tu, goal, 1 / 0.42, dt);
    const part = (k) => Math.PI * smooth((s.tu - 0.5 + s.lead * k + 0.35) / 0.7);
    s.yh = part(0.12); s.ys = part(0); s.yp = part(-0.12);
    s.face += clamp((b.dir || 1) - s.face, -dt * 8, dt * 8);
    s.breath += dt * lerp(2.1, 5, s.mw);
    return s;
  }

  // Coming out from behind a tree or down from one, the side view starts reared up and settles.
  function enter(s, mode) {
    if (s.mode === mode) return;
    if (mode === 'side') { s.from = s.mode; s.dropT = DROP; }
    s.mode = mode;
  }

  // --- Side view: pose --------------------------------------------------------------------------

  // Ankle (hind) or wrist (fore) for the toe at (x, y) with foot pitch a, or for the heel at (x, y).
  function fromToe(L, x, y, a) {
    const f = L.foot, c = Math.cos(a), s = Math.sin(a);
    return [x - f[0] * c + f[1] * s, y - f[0] * s - f[1] * c];
  }
  function fromHeel(L, x, y, a) {
    const f = L.foot, c = Math.cos(a), s = Math.sin(a);
    return [x + f[2] * c + f[1] * s, y + f[2] * s - f[1] * c];
  }

  // One foot over a gait cycle at u (0..1): [ankle x, ankle y, foot pitch], x relative to where its toe
  // stands. Fore paws land flat and roll onto the toes; hind feet strike with the heel, go flat and push
  // off from the toes. In the swing the fore wrist flexes (the palm turns up and back), then the paw
  // reaches forward and plants.
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

  // The amble's body, from where each foot is in its stance: shoulders and hips sag a little over a leg at
  // mid-stance and lift on push-off (k scales it), the shoulder blades (the hump) and the hips roll in
  // turn, and the low head nods with each forefoot and swings a little from side to side.
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
    const c = Math.cos(P.pitch), s = Math.sin(P.pitch), px = P.pivot[0], py = P.pivot[1];
    return (x, y) => {
      const dx = x - px, dy = y - py;
      return [(px + dx * c - dy * s) * P.sx, (py + dx * s + dy * c + P.by) * P.sy];
    };
  }

  const rootOf = (P, i) => P.T(LEG[i < 2 ? 0 : 1].root[0] + (i < 2 ? -3 : 4) * P.flex - (i % 2 ? 1.5 : 0),
    LEG[i < 2 ? 0 : 1].root[1] - (i % 2 ? 1 : 0));
  // The shoulder blade and pelvis slide with their leg; a foot still out of reach (even with the hidden
  // upper segment stretched) pulls the shoulders or hips down a little; then each leg is solved.
  // tg holds [ankle x, ankle y, foot pitch] per leg.
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

  // Body parameters blended idle/lying low -> amble/gallop/stalk by speed, then air, take-off, landing,
  // breathing and rearing; then the feet and the legs.
  function pose(b, s, time, rear) {
    const mw = s.mw, rw = s.rw, cw = s.cw, ph = s.phase;
    const tu = 1 - s.toT / TAKEOFF, keep = 1 - smooth(tu), cr = (Math.sin(Math.PI * tu) * (1 - tu)) / 0.58;
    const lu = 1 - s.landT / LAND, sq = lu < 0.25 ? smooth(lu / 0.25) : 1 - smooth((lu - 0.25) / 0.75);
    const aw = s.aw * (1 - keep), fall = smooth((s.vy + 250) / 500), up = 1 - fall;
    const feet = (g) => [0, 1, 2, 3].map((i) => cycle(frac(ph - g.offs[i]), g, i));
    const fw = feet(WALK), fk = feet(STALK), fr = feet(RUN);
    // Gallop: the spine gathers and stretches, the body pitches and bounces only a little.
    const gf = Math.cos(TAU * (ph - 0.92)), gp = Math.sin(TAU * (ph + 0.05));
    const I = { by: 0, pitch: 0, hump: 0, roll: 0, croup: 0, hroll: 0, flex: 0, headA: 0.1, headX: 0, headY: 0, ears: 0, swing: 0 };
    const LOW = { by: 15, pitch: 0.02, hump: 0.5, roll: 0, croup: 0, hroll: 0, flex: 0, headA: 0.5, headX: 1, headY: 3, ears: 0.35, swing: 0 };
    const W = amble(WALK, ph, fw, 1), K = amble(STALK, ph, fk, 0.6);
    Object.assign(K, { by: K.by + 11, pitch: K.pitch + 0.05, hump: K.hump * 1.3, headA: K.headA + 0.14, headX: 4, headY: K.headY + 2, ears: 0.35, swing: 0 });
    const R = { by: -1.6 * Math.cos(TAU * (ph - 0.9)) - 0.3, pitch: -0.06 * gp, hump: 1.5 * gf, roll: 0, croup: -0.8 * gf, hroll: 0,
      flex: 1.25 * gf, headA: 0.04 + 0.06 * gp, headX: 3, headY: 2, ears: 1, swing: 0 };
    const P = { keep, yaw: [s.yp, s.ys, s.yh] };
    for (const k in I) P[k] = lerp(lerp(I[k], LOW[k], cw), lerp(lerp(W[k], R[k], rw), K[k], cw), mw);
    // Idle fidgets on fixed, unrelated periods: a sniff, a look toward the viewer, an ear flick.
    const q = (1 - mw) * (1 - cw) * (1 - aw) * (1 - rear);
    const sn = bump(time, 7.3, 1.5) * q;
    P.headA += -0.3 * sn + 0.03 * Math.sin(time * 40) * sn;
    P.headX += 1.5 * sn;
    P.turn = hold(time, 11.7, 2.4, 0.5, 3.1) * q;
    P.flick = Math.sin(time * 48) * bump(time, 5.3, 0.4, 1.7) * q;
    // Air: nose up and stretched going up, front reaching coming down.
    P.pitch = lerp(P.pitch, lerp(-0.2, 0.14, fall), aw);
    P.flex = lerp(P.flex, lerp(-0.8, 0.5, fall), aw);
    P.headA = lerp(P.headA, lerp(0.12, -0.04, fall), aw);
    P.ears = lerp(P.ears, 0.6, aw);
    P.by = lerp(P.by, 0, aw);
    let sx = 1 + 0.05 * aw * up, sy = 1 - 0.03 * aw * up;
    P.by += 8 * cr + 7 * sq; P.flex += 0.6 * cr; P.headA += 0.1 * cr + 0.18 * sq;
    sx *= 1 + 0.05 * cr + 0.07 * sq; sy *= 1 - 0.07 * cr - 0.1 * sq;
    const br = Math.sin(s.breath);
    P.breath = br * lerp(1, 0.4, mw);
    sy *= 1 + 0.012 * br * (1 - mw);
    // Rearing up onto the hind legs (stepping behind a tree, or the first moments back out).
    P.pitch = lerp(P.pitch, -1.0, rear); P.by -= 3 * rear; P.headA += 0.7 * rear; P.ears += 0.3 * rear;
    P.pivot = [lerp(-4, -25, rear), -35.5];
    P.sx = sx; P.sy = sy;
    P.T = bodyTf(P);
    const tg = [];
    for (let i = 0; i < 4; i++) {
      const fore = i < 2, far = i % 2 === 1, k = fore ? 0 : 1, L = LEG[k], root = rootOf(P, i);
      const at = (c, g) => [L.toe + g.shift[k] + c[0], c[1], c[2]];
      const w = at(fw[i], WALK), r = at(fr[i], RUN), c = at(fk[i], STALK);
      const go = [0, 1, 2].map((j) => lerp(lerp(w[j], r[j], rw), c[j], cw));
      const st = fromToe(L, L.toe + lerp(STAND[i], (fore ? 12 : 2) + STAND[i] * 0.5, cw), 0, 0);
      // A turning leg steps: it lifts while its shoulder or hip faces the viewer.
      let ex = lerp(st[0], go[0], mw), ey = lerp(st[1], go[1], mw) - 4 * Math.sin(fore ? s.ys : s.yp), ea = go[2] * mw;
      if (aw > 0.001) {
        const u = fore ? [6, 21, 1.45] : [-20, 38, 0.9], d = fore ? [16, 31, -0.25] : [8, 24, 0.35], ta = lerp(u[2], d[2], fall);
        const A = fromToe(L, root[0] + lerp(u[0], d[0], fall) + (far ? -3 : 2), root[1] + lerp(u[1], d[1], fall), ta);
        ex = lerp(ex, A[0], aw); ey = lerp(ey, A[1], aw); ea = lerp(ea, ta, aw);
      }
      if (rear > 0.001 && fore) {
        const A = fromToe(L, root[0] + 6 - (far ? 3 : 0), root[1] + 25, 1.2);
        ex = lerp(ex, A[0], rear); ey = lerp(ey, A[1], rear); ea = lerp(ea, 1.2, rear);
      }
      tg.push([ex, ey, ea]);
    }
    settle(P, tg, (1 - aw) * (1 - rear));
    return P;
  }

  // --- Side view: drawing -------------------------------------------------------------------------

  // A turning bear is bent: the hips keep one heading, the shoulders another and the spine curves between
  // them. at(x) is [screen x, depth] of the spine at body x (the middle of the back stays put); a point
  // hanging from the spine at xa, forward offset x - xa and sideways z (toward the viewer at heading 0)
  // goes through map().
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

  // A leg in its own vertical plane, seen at its shoulder's or hip's heading. near: 1 on the viewer's
  // side, 0 on the far side (it changes while the bear turns, and so does its colour).
  function drawLeg(ctx, l, K, sp) {
    const g = l.g, R = LEG[g.fore ? 0 : 1].r, n = l.near, M = (x, y) => sp.map(x, y, l.xa, l.z);
    const r0 = M(g.root[0], g.root[1]), j = M(g.jx, g.jy), e = M(g.ex, g.ey);
    // Brown bears have darker legs: the near ones darken from the body down to the paw.
    ctx.fillStyle = tint(K, 'far', 'fur', n);
    seg(ctx, r0[0], r0[1], R[0], j[0], j[1], R[1]);
    ctx.fillStyle = tint(K, 'far', 'leg', n);
    seg(ctx, j[0], j[1], R[2], e[0], e[1], R[3]);
    ctx.save();
    ctx.transform(Math.cos(l.f), 0, 0, 1, e[0], e[1]);
    ctx.rotate(g.a);
    const cl = tint(K, 'clawFar', 'claw', n);
    if (g.fore) {
      // Planted, the paw turns in a little (pigeon-toed) and looks shorter; the dark pad shows when the
      // wrist flexes in the swing.
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

  // Croup, loin, the shoulder hump, neck, chest, a fringed belly and the haunch, clockwise.
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
    // Seen end-on while turning, the chest and the haunches keep their girth.
    for (const [x, y, rx, ry] of [[10, -38, 16, 18], [-28, -37, 14, 15]]) {
      const q = T(x, y), w = Math.abs(Math.sin(sp.phi(q[0])));
      if (w > 0.02) { const m = sp.map(q[0], q[1], q[0], 0); ell(ctx, m[0], m[1], rx * w, ry); }
    }
    // Shade under the belly, light along the back and hump, soft hollows behind the shoulder and haunch.
    ctx.save(); blob(ctx, pts); ctx.clip();
    for (const [x, y, rx, ry, rot, col] of [[-3, -16, 46, 8.5, 0, C.shade], [4, -55.5, 30, 5.5, -0.05, C.light],
      [-33, -38, 7, 14, 0.2, C.soft], [5, -37, 5, 13, 0.3, C.soft]]) {
      const m = M(x, y), c = cos(x, y);
      ctx.fillStyle = col; ell(ctx, m[0], m[1], rx * Math.max(0.35, Math.abs(c)), ry, (P.pitch + rot) * Math.sign(c || 1));
    }
    ctx.restore();
  }

  // The head as a few rounded solids seen at a heading (yaw: 0 faces right, PI/2 the viewer, PI left),
  // nodded by tilt, origin at the skull. Turning never mirrors it, so it never pops. o.ears: flattened
  // back, o.flick, o.wide: eye whites, o.look: pupils [forward, down], o.cry: [progress, strength] of a tear.
  function head(ctx, o, K) {
    const yaw = o.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw), t = o.tilt || 0, ct = Math.cos(t), st = Math.sin(t);
    const eb = clamp(o.ears || 0, 0, 1), fl = o.flick || 0, ga = ctx.globalAlpha;
    // x forward, y down, z toward the viewer at yaw 0 -> [screen x, screen y, depth]
    const pt = (x, y, z) => { const xr = x * ct - y * st, yr = x * st + y * ct; return [xr * cy - z * sy, yr, xr * sy + z * cy]; };
    const solid = (x, y, a, w, h) => { const p = pt(x, y, 0); ell(ctx, p[0], p[1], Math.hypot(a * cy, w * sy), h, t * cy); };
    const ears = [-1, 1].map((z) => {
      const p = pt(-2.5 - 3 * eb, -11.6 + 2.3 * eb, 6.5 * z);
      return { p, near: smooth(0.5 + p[2] / 6) };
    });
    const drawEar = (e) => {
      const r = 4.2, flat = 1 - 0.45 * eb, rot = (-0.6 * eb + 0.5 * fl * e.near) * (cy < 0 ? -1 : 1);
      ear(ctx, e.p[0], e.p[1], r, tint(K, 'far', 'fur', e.near), e.near > 0.5 ? K.ear : false, rot, flat);
    };
    for (const e of ears) if (e.near < 0.5) drawEar(e);
    ctx.fillStyle = K.fur;
    solid(-1.5, -2.5, 10.5, 8.5, 9.5);
    solid(5, 3.5, 8.5, 7.5, 5.5);
    ctx.fillStyle = K.muzzle;
    solid(16, 4, 6, 4.5, 3);
    const s0 = pt(11.5, -1.5, 0), s1 = pt(25.8, -0.8, 0), n = pt(27.4, -1.4, 0);
    seg(ctx, s0[0], s0[1], 5.4, s1[0], s1[1], 4);
    ctx.fillStyle = K.dark;
    ell(ctx, n[0], n[1], 2.7 + 0.9 * Math.abs(sy), 2.3 + 0.2 * Math.abs(sy));
    const m0 = pt(25, 2.6, 0), mc = pt(20.5, 4.6, 0), m1 = pt(15.8, 4.2, 0);
    ctx.globalAlpha = ga * Math.abs(cy);
    ctx.strokeStyle = 'rgba(29,18,9,0.55)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(mc[0], mc[1], m1[0], m1[1]); ctx.stroke();
    // Each eye shows while it faces the viewer.
    const lk = o.look || [1, 0], look = [lk[0] * cy, lk[1]];
    let front = null;
    for (const z of [-4.4, 4.4]) {
      const e = pt(8.4, -5.4, z), a = smooth((e[2] - 0.5) / 2.5);
      if (a <= 0) continue;
      ctx.globalAlpha = ga * a;
      eye(ctx, e[0], e[1], o.wide || 0, look, K);
      if (!front || e[2] > front.d) front = { z, d: e[2] };
    }
    ctx.globalAlpha = ga;
    if (o.cry && o.cry[1] > 0.01 && front) {
      const p = pt(lerp(9.6, 13.5, o.cry[0]), lerp(-3.2, 3.6, o.cry[0]), front.z);
      drop(ctx, p[0], p[1], o.cry[1]);
    }
    for (const e of ears) if (e.near >= 0.5) drawEar(e);
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

  // Legs on the far side, the body, the head, legs on the near side; everything goes through the spine,
  // so a turning bear bends round instead of flipping.
  function drawSide(ctx, P, K) {
    const sp = spine(P.yaw);
    const legs = P.legs.map((g) => {
      const xa = g.root[0], z = g.far ? -5 : 5, f = sp.phi(xa);
      return { g, xa, z, f, near: smooth(0.5 + (z * Math.cos(f)) / 8) };
    }).sort((a, b) => a.near - b.near);
    for (const l of legs) if (l.near < 0.5) drawLeg(ctx, l, K, sp);
    drawBody(ctx, P, K, sp);
    // The head is turned a little toward the viewer, more for a look round, and swings while walking.
    // Facing the viewer (in a turn) it is in front of the legs too.
    const hp = P.T(27 - 3 * P.flex, -41), hm = sp.map(hp[0], hp[1], hp[0], 0), tilt = P.pitch + P.headA;
    const yaw = P.yaw[2] + Math.cos(P.yaw[2]) * (0.3 + 0.6 * (P.turn || 0) + 0.12 * (P.swing || 0));
    const drawHead = () => {
      ctx.save();
      ctx.translate(hm[0] + (P.headX + 7 * Math.cos(tilt) - 2 * Math.sin(tilt)) * Math.cos(yaw), hm[1] + P.headY + 7 * Math.sin(tilt) + 2 * Math.cos(tilt));
      ctx.scale(0.96, 0.96);
      head(ctx, { yaw, tilt, ears: P.ears, flick: P.flick, wide: P.wide, look: P.look, cry: P.cry }, K);
      ctx.restore();
    };
    const facing = Math.sin(P.yaw[2]) > 0.5;
    if (!facing) drawHead();
    for (const l of legs) if (l.near >= 0.5) drawLeg(ctx, l, K, sp);
    if (facing) drawHead();
  }

  // The side view at b, with o.rear (0..1), o.squeeze (x scale), o.scale and o.pal.
  function side(ctx, b, s, time, o) {
    const P = pose(b, s, time, o.rear);
    const y = b.y + (s.groundY - b.y) * P.keep;
    const fy = s.shY, sk = clamp(1 - Math.max(0, fy - y) / 220, 0.35, 1) * o.scale;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.12 * sk).toFixed(3) + ')';
    ell(ctx, b.x, fy + 1, 40 * sk, 4.5 * sk);
    ctx.save();
    ctx.translate(b.x, y);
    ctx.scale(o.squeeze * o.scale, o.scale);
    drawSide(ctx, P, o.pal);
    ctx.restore();
  }

  // With a translucent globalAlpha (the game's fades and hit flashes) the bear is drawn opaque on a
  // scratch layer and composited once, so overlapping limbs do not show through each other.
  // x0..y1 is a world-space box around the drawing.
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

  ZS.drawBear = function (ctx, b, time) {
    const s = track(b, time);
    // The game cross-fades: while it fades into hiding it draws this view too, so only a bear that
    // has really left the tree (or come down) starts the drop back onto four legs.
    if (!b.hiding && !b.climbing) enter(s, 'side');
    const d = s.dropT > 0 ? smooth(s.dropT / DROP) : 0, hid = s.from === 'hide' ? d : 0;
    const lo = Math.min(b.y, s.groundY), hi = Math.max(b.y, s.groundY);
    faded(ctx, b.x - 140, lo - 170, b.x + 140, hi + 20,
      (c) => side(c, b, s, time, { rear: d, squeeze: 1, scale: lerp(1, 0.85, hid), pal: mixPal(hid) }));
  };

  // --- Climbing ------------------------------------------------------------------------------------
  // The side-view bear turned upright with the bark as its ground, so it keeps the same legs and head.
  // The gait phase comes from the height climbed, so planted paws stay put on the bark.

  const CLIMB = { stride: 40, duty: 0.62, lift: [6, 5], offs: [0, 0.5, 0.3, 0.8], toe: [28, -24], kick: [0, 0], reach: [2, 1] };

  function climbPose(b, s, time, e, th) {
    const m = smooth(s.cspd / 40), ph = frac((GY - b.y) / CLIMB.stride), f = s.fear * e, cv = s.cov * e;
    const gp = Math.sin(TAU * ph) * m;
    const P = { pivot: [-4, -35.5], sx: 1, sy: 1, hump: 0, roll: 0, croup: 0, hroll: 0, swing: 0, turn: 0.7 * cv,
      flick: 0, keep: 0, headX: 0, headY: 0, yaw: [0, 0, 0] };
    P.by = (8 + 3 * cv) * e;
    P.pitch = 0.015 * Math.sin(time * 1.3) * (1 - m);
    P.flex = 0.35 * gp * e;
    P.breath = Math.sin(time * 2.4) * 0.8;
    // Head up and a little toward the trunk; in the crown it turns its face out and keeps glancing down.
    P.headA = lerp(0.1, 0.32 - 0.05 * gp + cv * (0.6 + 0.08 * Math.sin(time * 2.7)), e);
    P.ears = Math.max(0.25 * m * e, 0.5 * cv, f);
    P.wide = Math.max(f, 0.6 * cv);
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
      const hold = fromToe(L, base + still, 0, grip), stand = fromToe(L, L.toe + STAND[i], 0, 0);
      const cx = lerp(hold[0], base + c[0], m), cy = lerp(hold[1], c[1], m) + (far ? 3 : 0), ca = lerp(grip, c[2], m);
      tg.push([lerp(stand[0], cx, e), lerp(stand[1], cy, e), ca * e]);
    }
    settle(P, tg, 1);
    return P;
  }

  // b.climbing is the tree, b.y the hind feet, b.climbT seconds since the climb started.
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

  // --- Behind a tree: standing in the trunk's shade at 0.85 scale, no wider than the trunk ----------

  // The trunk's visible edge on side sd at height y (the game's trunk flares at the base and tapers a little).
  function edgeX(t, sd, y) {
    const half = t.w / 2, top = t.h ? (t.kind === 'smrek' ? GY - t.h * 0.42 : GY - t.h) : GY - 250;
    const x = y > GY - 16 ? half + (7 * (y - GY + 16)) / 16 : half - (2 * (GY - 16 - y)) / Math.max(1, GY - 16 - top);
    return t.x + sd * x;
  }

  // How far the head is out past the trunk edge: slow and careful, shallower and twitchier when afraid.
  function peekAmt(t, f) {
    const u = frac(t / 5.6) * 5.6;
    const p = u < 1.9 ? 0 : u < 3.3 ? smooth((u - 1.9) / 1.4) : u < 4.7 ? 1 : 1 - smooth((u - 4.7) / 0.9);
    return p * (1 - 0.08 * f * (0.5 + 0.5 * Math.sin(t * 5.3)));
  }

  // Shared by both layers so the body behind and the parts in front move together.
  function hideState(b, s, time) {
    const ht = b.hideT || 0, f = s.fear, pose = b.pose;
    const sway = pose === 'sweat' ? Math.sin(ht * 2.1) * 2 + Math.sin(ht * 3.4 + 1) * 0.6 : 0;
    // The peeking side eases over when the nearest hunter changes sides: the head pulls back first.
    const sd = s.side < 0 ? -1 : 1, peek = pose === 'peek' ? peekAmt(ht, f) * smooth(Math.abs(s.side)) : 0;
    const shake = f * (Math.sin(time * 47) * 0.45 + Math.sin(time * 29 + 1) * 0.3);
    return { t: b.hiding, h: b.hiding.w / 2, ht, f, pose, sd, side: s.side, peek, br: Math.sin(ht * (pose === 'stiff' ? 1.3 : 2)),
      dx: shake + sway + sd * peek * 1.4, tilt: pose === 'sweat' ? Math.sin(ht * 2.1) * 1.2 : 0 };
  }

  // u: 0..1 settling in after the turn from side view.
  function upright(ctx, b, s, time, u) {
    const Q = hideState(b, s, time), h = Q.h, K = HID, tl = Q.tilt;
    const sh = 1.3 - (Q.pose === 'stiff' ? 0.7 : 0) + Q.br * 0.35 + (Q.pose === 'hug' ? 0.4 : 0);
    ctx.save();
    ctx.translate(lerp(b.x, Q.t.x, smooth(u * 2)) + Q.dx, GY);
    ctx.scale(lerp(0.6, 1, smooth(u)), lerp(0.94, 1, smooth(u)));
    // Shoulders are the widest part and show a little fur past the trunk edges.
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
    // The head stays hidden; ear tips show past the edges and flatten out of sight when afraid.
    ell(ctx, 0, -101, Math.min(15, h - 6), 13.5);
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * (1 - smooth(Q.peek / 0.25));
    for (const σ of [-1, 1]) {
      const tw = Q.pose === 'sweat' ? Math.pow(Math.max(0, Math.sin(Q.ht * 1.9 + σ * 1.3)), 18) * Math.sin(Q.ht * 38) : 0;
      const x = h - 2.6 - 3 * Q.f + 0.8 * tw, y = -112 + 3 * Q.f + 0.3 * Math.max(0, Q.br) - σ * tl * 0.5;
      ear(ctx, σ * x, y, 4.4, K.fur, K.ear, σ * (0.35 * tw + 0.5 * Q.f), 1 - 0.4 * Q.f);
    }
    ctx.globalAlpha = ga;
    ctx.restore();
  }

  function peekHead(ctx, time, Q, K) {
    const sd = Q.sd, y = GY - 101 + Math.sin(time * 1.7) * 0.5, edge = edgeX(Q.t, sd, y);
    ctx.save();
    ctx.beginPath(); ctx.rect(sd > 0 ? edge - 1.2 : edge + 1.2 - 300, GY - 300, 300, 300); ctx.clip();
    // Out to the eye and a bit more when calm; when afraid only just far enough for the eye.
    ctx.translate(edge + sd * lerp(-26, lerp(-3, -5.2, Q.f), Q.peek) + Q.dx * 0.4, y);
    ctx.scale(sd * 0.85, 0.85);
    head(ctx, { yaw: 0.15, tilt: -0.1 * Q.peek + 0.03 * Math.sin(time * 1.7), ears: 0.3 + 0.7 * Q.f,
      wide: 0.4 + 0.6 * Q.f, look: [1, 0.15], cry: tear(time, Q.f) }, K);
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

  // After the trunk: hugging paws, claws curled round the edges and the peeking head.
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
