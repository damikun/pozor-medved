(function () {
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, min = Math.min, max = Math.max, floor = Math.floor, ceil = Math.ceil, abs = Math.abs, atan2 = Math.atan2;
  const { clamp, lerp, smooth, hash, ease, mulberry32 } = ZS.util;
  const { circle, ellipse: ell } = ZS.gfx;
  const API = (ZS.olympArt = {});
  const TR = () => ZS.olympTrack;
  const SIM = () => ZS.sim.olymp;
  const NEAR = 0.3;
  const CAM = { tilt: 0.12 };
  const V = { w: 760, h: 540, top: 0, bot: 540, cx: 380, cy: 270, f: 400, k: 1, t: 0, dt: 0 };
  const C = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, cyw: 1, syw: 0, cp: 1, sp: 0 };
  const FX = { g: null, last: 0, rng: mulberry32(4711), puffs: [], flakes: [], trail: [], yaw: null, pitch: 0.12, roll: 0, shake: 0, side: 0 };
  const Q = [0, 0, 0], S2 = [0, 0, 0], CL = new Float64Array(96), PJ = new Float64Array(64);
  const SKY = { top: '#3a72bd', mid: '#6aa0d8', low: '#b9d4ec' };
  const WOOD = [62, 86, 72], WOOD2 = [92, 114, 100];
  const SNOW = [240, 246, 252], HAZE = [178, 194, 208], OFF = [208, 218, 232], EDGE = [206, 220, 240], FLOOR = [188, 200, 214];
  const PEAKS = [
    [-1.25, 0.03, 0.5], [-0.95, 0.05, 0.35], [-0.72, 0.062, 0.18], [-0.5, 0.075, 0.2], [-0.32, 0.068, 0.15], [-0.17, 0.112, 0.09],
    [-0.02, 0.08, 0.14], [0.12, 0.094, 0.12], [0.26, 0.105, 0.1], [0.38, 0.098, 0.12], [0.5, 0.11, 0.1], [0.62, 0.096, 0.14], [0.8, 0.07, 0.25], [1.1, 0.045, 0.4], [1.5, 0.03, 0.5],
  ];

  function cam(x, y, z, yaw, pitch, roll) {
    C.x = x; C.y = y; C.z = z; C.yaw = yaw; C.pitch = pitch; C.roll = roll || 0;
    C.cyw = cos(yaw); C.syw = sin(yaw); C.cp = cos(pitch); C.sp = sin(pitch);
  }

  function toCam(x, y, z, o) {
    const dx = x - C.x, dy = y - C.y, dz = z - C.z;
    const rx = dx * C.cyw - dz * C.syw, fz = dx * C.syw + dz * C.cyw;
    o[0] = rx; o[1] = dy * C.cp + fz * C.sp; o[2] = fz * C.cp - dy * C.sp;
    return o;
  }

  function P(x, y, z, o) {
    const q = toCam(x, y, z, o || Q);
    const zz = max(NEAR, q[2]);
    q[0] = V.cx + V.f * q[0] / zz; q[1] = V.cy - V.f * q[1] / zz; q[2] = zz;
    return q;
  }

  function poly3(ctx, pts, n) {
    let m = 0;
    for (let i = 0; i < n; i++) { toCam(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], Q); CL[i * 3] = Q[0]; CL[i * 3 + 1] = Q[1]; CL[i * 3 + 2] = Q[2]; }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, az = CL[i * 3 + 2], bz = CL[j * 3 + 2], ain = az >= NEAR, bin = bz >= NEAR;
      if (ain) { PJ[m * 2] = V.cx + V.f * CL[i * 3] / az; PJ[m * 2 + 1] = V.cy - V.f * CL[i * 3 + 1] / az; m++; }
      if (ain !== bin) {
        const t = (NEAR - az) / (bz - az), x = lerp(CL[i * 3], CL[j * 3], t), y = lerp(CL[i * 3 + 1], CL[j * 3 + 1], t);
        PJ[m * 2] = V.cx + V.f * x / NEAR; PJ[m * 2 + 1] = V.cy - V.f * y / NEAR; m++;
      }
    }
    if (m < 3) return false;
    ctx.beginPath(); ctx.moveTo(PJ[0], PJ[1]);
    for (let i = 1; i < m; i++) ctx.lineTo(PJ[i * 2], PJ[i * 2 + 1]);
    ctx.closePath(); ctx.fill();
    return true;
  }

  const QB = new Float64Array(12);
  function quad(ctx, a, b, c, d) {
    QB[0] = a[0]; QB[1] = a[1]; QB[2] = a[2]; QB[3] = b[0]; QB[4] = b[1]; QB[5] = b[2];
    QB[6] = c[0]; QB[7] = c[1]; QB[8] = c[2]; QB[9] = d[0]; QB[10] = d[1]; QB[11] = d[2];
    return poly3(ctx, QB, 4);
  }

  function rgb(c, a) { return a === undefined ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }
  const MIX = [0, 0, 0];
  function mix(a, b, t) { MIX[0] = lerp(a[0], b[0], t); MIX[1] = lerp(a[1], b[1], t); MIX[2] = lerp(a[2], b[2], t); return MIX; }
  function haze(z) { return smooth((z - 150) / 3800) * 0.88; }

  function wpt(T, s, u, y, o) {
    const p = TR().at(T, s), c = cos(p.h), sn = sin(p.h), q = o || [0, 0, 0];
    q[0] = p.x + c * u; q[1] = p.y + (y || 0); q[2] = p.z - sn * u;
    return q;
  }

  function setup(g, viewW, offY) {
    const h = g.viewH || 540;
    V.w = viewW; V.h = h; V.top = -offY; V.bot = V.top + h;
    V.cx = viewW / 2; V.cy = V.top + h * (h > viewW ? 0.46 : 0.42);
    V.k = clamp(min(viewW / 760, h / 540), 0.55, 1.6);
    V.f = h > viewW ? min(h * 0.6, viewW * 1.3) : min(viewW * 0.62, h * 1.05);
    if (FX.g !== g) { FX.g = g; FX.last = g.time; FX.puffs.length = 0; FX.flakes.length = 0; FX.trail.length = 0; FX.yaw = null; FX.shake = 0; FX.side = 0; }
    V.dt = clamp(g.time - FX.last, 0, 0.1); FX.last = g.time; V.t = g.time;
  }

  function sky(ctx, tint) {
    const hy = horizon();
    const gr = ctx.createLinearGradient(0, V.top, 0, max(V.top + 1, hy));
    gr.addColorStop(0, tint ? '#283a63' : SKY.top); gr.addColorStop(0.6, tint ? '#5a6d9a' : SKY.mid); gr.addColorStop(1, tint ? '#c99a86' : SKY.low);
    ctx.fillStyle = gr; ctx.fillRect(-200, V.top - 200, V.w + 400, max(0, hy - V.top) + 202);
    ctx.fillStyle = tint ? '#9aa6be' : '#cfdbe6'; ctx.fillRect(-200, hy - 1, V.w + 400, V.bot - hy + 220);
    if (tint) return;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 7; i++) {
      const az = hash(i * 7.1) * TAU, d = ((az - C.yaw + PI) % TAU + TAU) % TAU - PI;
      if (abs(d) > 1.3) continue;
      const x = V.cx + V.f * Math.tan(d) * 0.9, y = hy - V.f * (0.18 + hash(i * 3.3) * 0.22), s = V.k * (0.7 + hash(i) * 0.6);
      ell(ctx, x, y, 70 * s, 12 * s); ell(ctx, x + 34 * s, y - 7 * s, 40 * s, 11 * s); ell(ctx, x - 30 * s, y - 3 * s, 34 * s, 9 * s);
    }
  }

  function horizon() {
    return V.cy - V.f * Math.tan(C.pitch);
  }

  function dirPt(az, el, o) {
    const d = az - C.yaw, ce = cos(el), x = ce * sin(d), yw = sin(el), fz = ce * cos(d);
    const ry = yw * C.cp + fz * C.sp, rz = fz * C.cp - yw * C.sp;
    o[0] = V.cx + V.f * x / max(0.05, rz); o[1] = V.cy - V.f * ry / max(0.05, rz); o[2] = rz;
    return o;
  }

  function ridge(az, base) {
    let e = 0;
    for (const [pa, pe, w] of PEAKS) e = max(e, pe - abs(az - base - pa) * (pe / w) * 0.8);
    const n = sin(az * 47) * 0.005 + sin(az * 113 + 1) * 0.003 + sin(az * 211 + 2) * 0.0015;
    return max(0.008, (e + n) * 1.55);
  }

  function panorama(ctx, base, labels) {
    const step = 0.004, half = atan2(V.w * 0.5 + 20, V.f) + 0.02, pts = [];
    for (let az = floor((C.yaw - half) / step) * step; az <= C.yaw + half + step; az += step) {
      const d = ((az - base + PI) % TAU + TAU) % TAU - PI, q = dirPt(az, ridge(d, 0), Q);
      pts.push(q[0], q[1], d);
    }
    const hy = horizon();
    const gr = ctx.createLinearGradient(0, hy - V.f * 0.19, 0, hy);
    gr.addColorStop(0, '#f4f7fb'); gr.addColorStop(0.55, '#c9d7e6'); gr.addColorStop(1, '#a9bbd0');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(pts[0], hy + 2);
    for (let i = 0; i < pts.length; i += 3) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(pts[pts.length - 3], hy + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fb3a6';
    ctx.beginPath(); ctx.moveTo(-10, hy + 2);
    for (let x = -10; x <= V.w + 10; x += 8) {
      const az = C.yaw + atan2(x - V.cx, V.f), d = az - base;
      dirPt(az, 0.012 + 0.008 * sin(d * 9 + 2) + 0.005 * sin(d * 23), Q); ctx.lineTo(x, Q[1]);
    }
    ctx.lineTo(V.w + 10, hy + 2); ctx.closePath(); ctx.fill();
    const lake = dirPt(base + 0.22, -0.035, [0, 0, 0]);
    if (lake[2] > 0.2) {
      ctx.fillStyle = 'rgba(120,160,190,0.7)'; ell(ctx, lake[0], lake[1], V.f * 0.13, V.f * 0.008);
      ctx.fillStyle = 'rgba(230,240,248,0.5)'; ell(ctx, lake[0] - V.f * 0.03, lake[1] - V.f * 0.002, V.f * 0.05, V.f * 0.002);
    }
    if (!labels) return;
    const L = ZS.LABELS.olymp.sign;
    for (const [az, el, text] of [[-0.17, 0.175, L.krivan], [0.5, 0.175, L.tatry], [0.22, -0.035, L.mara]]) {
      const q = dirPt(base + az, el + (el > 0 ? 0.03 : -0.018), [0, 0, 0]);
      if (q[2] < 0.2) continue;
      ctx.globalAlpha = labels;
      tag(ctx, q[0], q[1], text, el > 0);
      ctx.globalAlpha = 1;
    }
  }

  function tag(ctx, x, y, text, up) {
    const s = max(0.8, V.k);
    ctx.font = '700 ' + (12 * s).toFixed(1) + 'px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 14 * s;
    ctx.fillStyle = 'rgba(20,30,50,0.72)'; ZS.gfx.rrect(ctx, x - w / 2, y - 11 * s, w, 22 * s, 11 * s);
    ctx.fillStyle = 'rgba(20,30,50,0.72)'; ctx.beginPath(); ctx.moveTo(x - 5 * s, up ? y + 10 * s : y - 10 * s); ctx.lineTo(x + 5 * s, up ? y + 10 * s : y - 10 * s); ctx.lineTo(x, up ? y + 17 * s : y - 17 * s); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
  }

  function valley(ctx) {
    const hy = horizon(), low = max(hy + 1, dirPt(C.yaw, -0.3, Q)[1]);
    const gr = ctx.createLinearGradient(0, hy, 0, low);
    gr.addColorStop(0, '#b2c2cf'); gr.addColorStop(0.15, '#a3b4be'); gr.addColorStop(1, '#93a6a8');
    ctx.fillStyle = gr; ctx.fillRect(-200, hy, V.w + 400, V.bot - hy + 220);
    const blob = (az, el, w, h, col) => {
      const d = ((az - C.yaw + PI) % TAU + TAU) % TAU - PI;
      if (abs(d) > 1.2) return;
      const q = dirPt(az, el, Q), k = V.f;
      ctx.fillStyle = col; ell(ctx, q[0], q[1], max(1, w * k), max(0.5, h * k));
    };
    blob(0.22, -0.03, 0.12, 0.007, 'rgba(126,156,182,0.85)');
    blob(0.18, -0.031, 0.05, 0.003, 'rgba(220,232,242,0.7)');
    const hz = dirPt(C.yaw, -0.002, Q)[1];
    const fog = ctx.createLinearGradient(0, hz - V.f * 0.02, 0, hz + V.f * 0.06);
    fog.addColorStop(0, 'rgba(214,224,233,0)'); fog.addColorStop(0.5, 'rgba(214,224,233,0.6)'); fog.addColorStop(1, 'rgba(214,224,233,0.0)');
    ctx.fillStyle = fog; ctx.fillRect(-10, hz - V.f * 0.02, V.w + 20, V.f * 0.08);
  }

  const SEG = [0, 0, 0], SEG2 = [0, 0, 0], SEG3 = [0, 0, 0], SEG4 = [0, 0, 0];
  function land(ctx, T, s0, s1, edge, edgeH, forestFrom) {
    const us = [edge, edge + 40, edge + 160, edge + 450, edge + 900, 2400];
    const lift = (u, sa) => max(0, u - edge - 200) * (0.16 + 0.05 * sin(sa * 0.0021 + 1.3) + 0.04 * sin(u * 0.004 + sa * 0.001));
    const h = (u, sa, eh) => eh + 2.5 * smooth((u - edge) / 40) + lift(u, sa);
    steps(s0, s1, (sa, sb) => {
      const pa = TR().at(T, sa), zr = toCam(pa.x, pa.y, pa.z, S2)[2];
      if (zr < 0.8 && toCam(...wpt(T, sb, 0, 0, SEG), S2)[2] < 0.8) return;
      const ea = edgeH(sa), eb = edgeH(sb);
      for (const sd of [-1, 1]) for (let i = 0; i < us.length - 1; i++) {
        const ua = us[i], ub = us[i + 1];
        wpt(T, sa, sd * ua, h(ua, sa, ea), SEG); wpt(T, sa, sd * ub, h(ub, sa, ea), SEG2); wpt(T, sb + 0.3, sd * ub, h(ub, sb, eb), SEG3); wpt(T, sb + 0.3, sd * ua, h(ua, sb, eb), SEG4);
        const um = (ua + ub) / 2, alt = lift(um, sa), shade = sd * 5 + sin(sa * 0.004 + um * 0.003) * 4;
        let c;
        if (sa < forestFrom && ua < edge + 450) c = i === 0 ? [FLOOR[0] + 10, FLOOR[1] + 9, FLOOR[2] + 6] : [166, 176, 188];
        else if (alt > 140) c = [226, 233, 240];
        else if (alt > 80) c = mix(WOOD, [214, 222, 232], (alt - 80) / 60).slice();
        else c = WOOD;
        const z = max(zr, um * 0.4);
        ctx.fillStyle = rgb(mix([c[0] + shade, c[1] + shade, c[2] + shade], HAZE, haze(z)));
        quad(ctx, SEG, SEG2, SEG3, SEG4);
      }
    });
  }



  function steps(s0, s1, cb) {
    const list = [];
    let s = floor(s0 / 2) * 2;
    while (s < s1) {
      const d = s - s0, st = d < 70 ? 2 : d < 170 ? 4 : d < 400 ? 8 : d < 1000 ? 24 : d < 2500 ? 72 : 144;
      const nx = (floor(s / st + 1e-6) + 1) * st;
      list.push([s, min(s1, nx)]); s = nx;
    }
    for (let i = list.length - 1; i >= 0; i--) cb(list[i][0], list[i][1], i);
  }


  function slope(ctx, T, s0, s1, half, out, wide, each) {
    const bands = [-wide - 8, -half, -half + 3.2, half - 3.2, half, wide + 8];
    const rise = (u, sa) => (abs(u) > half + 0.5 ? (abs(u) - half) * 0.07 + (abs(u) < wide + 7 ? sin(sa * 0.07 + u) * 0.3 : 0) : 0);
    land(ctx, T, s0, s1, wide + 8, () => (wide + 8 - half) * 0.07, 430);
    const outer = false;
    steps(s0, min(s1, s0 + 1500), (sa, sb) => {
      const pa = TR().at(T, sa), zr = toCam(pa.x, pa.y, pa.z, S2)[2], za = max(NEAR, zr), hz = haze(za);
      if (zr < 0.8 && toCam(...wpt(T, sb, 0, 0, SEG), S2)[2] < 0.8) return;
      for (let b = 0; b < bands.length - 1; b++) {
        const ua = bands[b], ub = bands[b + 1];
        wpt(T, sa, ua, rise(ua, sa), SEG); wpt(T, sa, ub, rise(ub, sa), SEG2); wpt(T, sb + 0.15, ub, rise(ub, sb), SEG3); wpt(T, sb + 0.15, ua, rise(ua, sb), SEG4);
        const groom = (floor(sa / 4) % 2 ? 1 : -1) * 1.5 - (pa.gr - 0.3) * 30;
        let c;
        if (b === 2) c = [SNOW[0] + groom, SNOW[1] + groom, SNOW[2] + groom * 0.5];
        else if (b === 1 || b === 3) c = [EDGE[0] + groom * 0.6, EDGE[1] + groom * 0.6, EDGE[2]];
        else if (b === 0 || b === 4) { const bump = sin(sa * 0.21 + b * 2) * 7 + sin(sa * 0.53 + b) * 4; c = [OFF[0] + bump, OFF[1] + bump, OFF[2] + bump * 0.6]; }
        else if (sa > 430) { const w = floor(sa / 10 + b) % 3 === 0 ? WOOD2 : WOOD, bump = sin(sa * 0.13 + b) * 5; c = [w[0] + bump, w[1] + bump, w[2] + bump]; }
        else { const k = floor(sa / 14 + b * 3) % 5, bump = sin(sa * 0.13 + b) * 6, base = k === 0 ? [150, 160, 170] : k === 2 ? [96, 120, 104] : FLOOR; c = [base[0] + bump, base[1] + bump, base[2] + bump * 0.5]; }
        ctx.fillStyle = rgb(mix(c, HAZE, hz));
        quad(ctx, SEG, SEG2, SEG3, SEG4);
      }
      if (!outer && za < 900 && (sb - sa > 4 || floor(sa / 3) % 2 === 0)) {
        ctx.fillStyle = 'rgba(40,90,190,' + (0.65 * (1 - hz)).toFixed(3) + ')';
        const wd = 0.3 + za * 0.004;
        for (const sd of [-1, 1]) { const u0 = sd * (half - 0.6 - wd), u1 = sd * (half - 0.6); quad(ctx, wpt(T, sa, u0, 0.02, SEG), wpt(T, sa, u1, 0.02, SEG2), wpt(T, sb, u1, 0.02, SEG3), wpt(T, sb, u0, 0.02, SEG4)); }
      }
      if (each) each(sa);
    });
  }

  function cord(ctx, T, s0, s1, us, col) {
    ctx.strokeStyle = col; ctx.lineWidth = max(0.7, V.k * 0.9);
    for (const u of us) {
      ctx.beginPath();
      let on = false;
      for (let s = ceil(s0 / 3) * 3; s <= s1; s += 3) {
        const q = toCam(...wpt(T, s, u, 0.02, SEG), S2);
        if (q[2] < NEAR || hidden(T, s, u, 0, 0.05)) { on = false; continue; }
        const x = V.cx + V.f * q[0] / q[2], y = V.cy - V.f * q[1] / q[2];
        if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        on = true;
      }
      ctx.stroke();
    }
  }

  function shadow(ctx, T, s, u, rx, rs, a) {
    const z = depth(T, s, u, 0), fz = 1 - smooth((z - 220) / 180);
    if (z < NEAR + 0.5 || fz <= 0.01) return;
    push(z + 60, (cx) => {
      const k = 0.5;
      cx.fillStyle = 'rgba(90,120,170,' + ((a || 0.22) * 0.7 * fz).toFixed(3) + ')';
      const n = 12, pts = new Float64Array(n * 3);
      for (let i = 0; i < n; i++) {
        const an = (i / n) * TAU, q = wpt(T, s + sin(an) * rs - rs * k * 0.5, u + cos(an) * rx + rx * k, 0.03, SEG);
        pts[i * 3] = q[0]; pts[i * 3 + 1] = q[1]; pts[i * 3 + 2] = q[2];
      }
      poly3(cx, pts, n);
    }, s);
  }


  const items = [];
  function push(z, fn, s) { if (z > NEAR && z < 900) items.push({ z, fn, s: s === undefined ? -Infinity : s }); }
  function flush(ctx, from) {
    const lim = from === undefined ? -Infinity : from, now = [], rest = [];
    for (const it of items) (it.s >= lim ? now : rest).push(it);
    if (!now.length) return;
    now.sort((a, b) => b.z - a.z);
    items.length = 0;
    for (const it of rest) items.push(it);
    for (const it of now) it.fn(ctx, it.z);
  }

  function depth(T, s, u, y) {
    const q = wpt(T, s, u, y || 0, SEG);
    return toCam(q[0], q[1], q[2], S2)[2];
  }

  function hidden(T, s, u, y, tall) {
    const O = FX.occ;
    if (!O || O.T !== T || s <= O.s + 2) return false;
    const top = TR().at(T, s).y + (y || 0) + (tall || 1.5), n = min(40, max(6, floor((s - O.s) / 6)));
    for (let i = 1; i < n; i++) {
      const t = i / n, ss = lerp(O.s, s, t), uu = lerp(O.u, u, t), au = abs(uu);
      const gy = TR().at(T, ss).y + (au > O.half ? (au - O.half) * O.rise : 0) - 0.15;
      if (lerp(O.y, top, t) < gy) return true;
    }
    return false;
  }

  function sprite(T, s, u, y, fn, skip, tall) {
    const z = depth(T, s, u, y);
    if (z < 2.6 || z > (skip || 520)) return;
    push(z, (ctx) => {
      const q = P(...wpt(T, s, u, y || 0, SEG), [0, 0, 0]);
      const lim = skip || 520, sc = V.f / q[2], fade = 1 - smooth((q[2] - lim * 0.55) / (lim * 0.42));
      if (q[0] < -sc * 12 || q[0] > V.w + sc * 12) return;
      ctx.globalAlpha = clamp(fade, 0, 1) * clamp((q[2] - 2.6) / 3, 0, 1);
      fn(ctx, q[0], q[1], sc, q[2]);
      ctx.globalAlpha = 1;
    }, s);
  }

  function spruce(ctx, x, y, s, h, seed, dwarf) {
    const F = ZS.olympFig;
    F.spruce(ctx, x, y, s, h, seed, dwarf, V.t);
  }

  function net(ctx, T, s0, s1, side, half) {
    const st = 6, a = floor(s0 / st) * st;
    for (let s = a; s < s1; s += st) {
      const z = depth(T, s + st / 2, side * half, 0.8);
      if (z < NEAR + 0.2 || z > 300) continue;
      push(z, (cx) => {
        const fade = 1 - smooth((z - 160) / 140);
        cx.globalAlpha = clamp(fade, 0, 1);
        const A = wpt(T, s, side * half, 0, [0, 0, 0]), B = wpt(T, s + st, side * half, 0, [0, 0, 0]), A2 = wpt(T, s, side * half, 1.7, [0, 0, 0]), B2 = wpt(T, s + st, side * half, 1.7, [0, 0, 0]);
        cx.fillStyle = 'rgba(232,96,40,0.42)';
        quad(cx, A, B, B2, A2);
        const p = P(...A, [0, 0, 0]), q = P(...A2, [0, 0, 0]), sc = V.f / p[2];
        cx.fillStyle = '#c4501f'; cx.fillRect(q[0] - max(0.6, 0.05 * sc), q[1], max(1.2, 0.1 * sc), p[1] - q[1]);
        if (sc > 9) {
          cx.strokeStyle = 'rgba(255,140,80,0.5)'; cx.lineWidth = 1; cx.beginPath();
          for (let i = 1; i < 4; i++) { const m = P(...wpt(T, s, side * half, i * 0.42, SEG), [0, 0, 0]), n = P(...wpt(T, s + st, side * half, i * 0.42, SEG), [0, 0, 0]); cx.moveTo(m[0], m[1]); cx.lineTo(n[0], n[1]); }
          cx.stroke();
        }
        cx.globalAlpha = 1;
      }, s + st);
    }
  }

  function gate(ctx, T, q, hide) {
    const sides = [q.u - 3.6, q.u + 3.6];
    for (let i = 0; i < 2; i++) {
      const u = sides[i], z = depth(T, q.s, u, 1);
      if (z < NEAR + 0.2 || z > 330) continue;
      push(z, (cx) => {
        const col = q.i % 2 ? '#2f5fd0' : '#d8352a', fade = 1 - smooth((z - 220) / 110);
        cx.globalAlpha = clamp(fade * (hide ? 0.35 : 1), 0, 1);
        const out = i === 0 ? -1 : 1, wob = q.wob ? sin(V.t * 18) * q.wob * 0.25 * max(0, 1 - (V.t - (q.wt || V.t))) : 0;
        const a = [u, u + out * 0.75];
        const base = a.map((uu) => P(...wpt(T, q.s, uu, 0, SEG), [0, 0, 0])), top = a.map((uu, j) => P(...wpt(T, q.s, uu + (j ? wob : 0), 1.85, SEG), [0, 0, 0]));
        const sc = V.f / base[0][2];
        const pl = wpt(T, q.s, a[0], 0.55, [0, 0, 0]), pr = wpt(T, q.s, a[1] + wob * 0.5, 0.55, [0, 0, 0]), tl = wpt(T, q.s, a[0], 1.6, [0, 0, 0]), tr2 = wpt(T, q.s, a[1] + wob, 1.6, [0, 0, 0]);
        cx.fillStyle = col; quad(cx, pl, pr, tr2, tl);
        cx.fillStyle = 'rgba(255,255,255,0.85)';
        const m1 = wpt(T, q.s, lerp(a[0], a[1], 0.2), 0.95, [0, 0, 0]), m2 = wpt(T, q.s, lerp(a[0], a[1], 0.8), 0.95, [0, 0, 0]), m3 = wpt(T, q.s, lerp(a[0], a[1], 0.8), 1.2, [0, 0, 0]), m4 = wpt(T, q.s, lerp(a[0], a[1], 0.2), 1.2, [0, 0, 0]);
        if (sc > 6) quad(cx, m1, m2, m3, m4);
        cx.strokeStyle = col; cx.lineWidth = max(1, 0.035 * sc); cx.lineCap = 'round';
        cx.beginPath();
        for (let j = 0; j < 2; j++) { cx.moveTo(base[j][0], base[j][1]); cx.lineTo(top[j][0], top[j][1]); }
        cx.stroke(); cx.lineCap = 'butt';
        if (q.missed && sc > 3) { cx.strokeStyle = 'rgba(220,40,30,0.9)'; cx.lineWidth = max(1.5, 0.08 * sc); const m = top[0]; cx.beginPath(); cx.moveTo(m[0] - 0.3 * sc, m[1] - 0.3 * sc); cx.lineTo(m[0] + 0.3 * sc, m[1] + 0.3 * sc); cx.moveTo(m[0] + 0.3 * sc, m[1] - 0.3 * sc); cx.lineTo(m[0] - 0.3 * sc, m[1] + 0.3 * sc); cx.stroke(); }
        cx.globalAlpha = 1;
      }, q.s);
    }
  }

  function puff(x, y, z, vx, vy, vz, r, life, col) {
    if (FX.puffs.length > 260) FX.puffs.shift();
    FX.puffs.push({ x, y, z, vx, vy, vz, r, t: life, life, col: col || 0 });
  }

  function puffs(dt) {
    for (const p of FX.puffs) { p.t -= dt; p.vy -= 3.2 * dt; p.vx *= 1 - dt * 1.6; p.vz *= 1 - dt * 1.6; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += dt * (p.col === 2 ? 0.05 : 0.5); }
    FX.puffs = FX.puffs.filter((p) => p.t > 0);
    for (const p of FX.puffs) {
      const z = toCam(p.x, p.y, p.z, S2)[2];
      if (z < 2.2) continue;
      push(z - 0.05, (ctx) => {
        const q = P(p.x, p.y, p.z, [0, 0, 0]), r = min((V.f / q[2]) * p.r, (p.col === 2 ? 5 : 16) * V.k), a = (p.col === 2 ? 0.95 : 0.16) * (p.t / p.life) * smooth((q[2] - 2.2) / 2);
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        circle(ctx, q[0], q[1], max(0.5, r));
      });
    }
  }

  function spray(T, s, u, y, h, k, side, v) {
    const n = floor(k * 3 * V.dt * 60);
    for (let i = 0; i < n; i++) {
      const q = wpt(T, s - 0.4, u + side * 0.4, y + 0.1, [0, 0, 0]), r = FX.rng, sd = -side;
      const rx = cos(h), rz = -sin(h), fx = sin(h), fz = cos(h), out = 3 + r() * 5 + v * 0.15, fw = v * (0.4 + r() * 0.3);
      puff(q[0], q[1], q[2], rx * sd * out + fx * fw, 0.8 + r() * 2.2, rz * sd * out + fz * fw, 0.04 + r() * 0.06, 0.35 + r() * 0.35, 2);
    }
  }

  function flakes(ctx, speed, dir) {
    const r = FX.rng, n = 60;
    while (FX.flakes.length < n) FX.flakes.push({ x: r(), y: r(), d: 0.4 + r() * 0.6, ph: r() * TAU });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const f of FX.flakes) {
      f.y += V.dt * (0.05 + 0.06 * f.d);
      f.x += V.dt * (0.012 * sin(V.t * 0.9 + f.ph) - dir * 0.02 * f.d);
      if (f.y > 1.02) { f.y = -0.02; f.x = r(); }
      if (f.x < -0.02) f.x += 1.04; else if (f.x > 1.02) f.x -= 1.04;
      circle(ctx, f.x * V.w, V.top + f.y * V.h, max(0.7, 1.7 * V.k * f.d));
    }
  }

  function speedLines(ctx, v) {
    const a = smooth((v - 20) / 12);
    if (a <= 0.01) return;
    const gr = ctx.createRadialGradient(V.cx, V.cy, min(V.w, V.h) * 0.45, V.cx, V.cy, max(V.w, V.h) * 0.8);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(235,242,250,' + (0.22 * a).toFixed(3) + ')');
    ctx.fillStyle = gr; ctx.fillRect(-10, V.top - 10, V.w + 20, V.h + 20);
  }

  function chaseCam(T, s, u, y, heading, D, H, look, k) {
    const yaw = FX.yaw === null ? heading : FX.yaw + ((((heading - FX.yaw) + PI) % TAU + TAU) % TAU - PI) * (1 - Math.exp(-(k || 7) * V.dt));
    FX.yaw = yaw;
    const b = wpt(T, s, u, y, [0, 0, 0]);
    const cx = b[0] - sin(yaw) * D, cz = b[2] - cos(yaw) * D;
    const gy = TR().at(T, max(0, s - D)).y + 0.6;
    const cy = max(gy, b[1] + H);
    FX.occ = { T, s: s - D, u, y: cy, half: CAM.half || 21, rise: CAM.rise || 0.07 };
    const la = wpt(T, s + look, u * 0.6, 0, [0, 0, 0]);
    const slope = atan2(cy - la[1], Math.hypot(la[0] - cx, la[2] - cz));
    const tilt = CAM.tilt, pitch = clamp(tilt + slope * 0.16, tilt, tilt + 0.1);
    FX.pitch = FX.pitch === undefined ? pitch : ease(FX.pitch, pitch, 6, V.dt || 0.016);
    return [cx, cy, cz, yaw, FX.pitch];
  }

  function blendCam(a, b, t) {
    const d = (((b[3] - a[3]) + PI) % TAU + TAU) % TAU - PI;
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), a[3] + d * t, lerp(a[4], b[4], t)];
  }

  function trailAdd(T, s, u, y) {
    const tr = FX.trail, last = tr[tr.length - 1];
    if (!last || abs(last.s - s) > 0.6) tr.push({ s, u, y });
    while (tr.length > 60) tr.shift();
  }

  function tracks(ctx, T) {
    const tr = FX.trail;
    if (tr.length < 2) return;
    ctx.strokeStyle = 'rgba(150,175,205,0.55)'; ctx.lineWidth = max(1, 1.4 * V.k);
    for (const off of [-0.16, 0.16]) {
      ctx.beginPath();
      let on = false;
      for (const p of tr) {
        const q = toCam(...wpt(T, p.s, p.u + off, (p.y || 0) + 0.02, SEG), S2);
        if (q[2] < NEAR) { on = false; continue; }
        const x = V.cx + V.f * q[0] / q[2], y = V.cy - V.f * q[1] / q[2];
        if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        on = true;
      }
      ctx.stroke();
    }
  }

  function slalom(ctx, g, O) {
    const c = O.c, C2 = g.level.olymp.slalom, T = C2.T, F = ZS.olympFig, ph = O.phase;
    const p = TR().at(T, c.s), head = p.h + c.phi * 0.5;
    CAM.tilt = 0.2; CAM.half = C2.half; CAM.rise = 0.07;
    FX.hy = ease(FX.hy || 0, c.hy || 0, c.hy > (FX.hy || 0) ? 7 : 4, V.dt || 0.016);
    let k = 0, pose = chaseCam(T, c.s, c.u, FX.hy * 0.85, head, 7.4 + c.v * 0.03, 4.4, 30, 6);
    if (ph === 'view' || ph === 'ready') {
      const vt = ph === 'view' ? O.t : 3.6 + O.t, b = wpt(T, c.s, 0, 0, [0, 0, 0]);
      const view = [b[0] - sin(p.h) * 7, b[1] + 3.2, b[2] - cos(p.h) * 7, p.h - 0.22 + 0.22 * smooth(vt / 4.5), 0.06];
      k = 1 - smooth((vt - 3.4) / 2.2);
      pose = blendCam(pose, view, k);
    }
    if (ph === 'stop') FX.side = ease(FX.side, 1, 2, V.dt);
    const v = c.v;
    V.f *= 1 - 0.1 * smooth((v - 14) / 16);
    FX.shake = ease(FX.shake, c.fall > 0 ? 1 : smooth((v - 22) / 12) * 0.25, 6, V.dt);
    const sh = FX.shake;
    cam(pose[0] + sin(V.t * 41) * 0.04 * sh, pose[1] + sin(V.t * 37) * 0.05 * sh, pose[2], pose[3], pose[4], -c.lean * 0.06);
    FX.occ.y = C.y; if (k > 0.01) FX.occ.s = c.s - 7;
    ctx.save();
    ctx.translate(V.cx, V.cy); ctx.rotate(C.roll); ctx.translate(-V.cx, -V.cy);
    sky(ctx);
    panorama(ctx, 0, k);
    valley(ctx);
    const s0 = max(0, c.s - 8), s1 = min(T.len, c.s + 360);
    if (C2.finish > c.s - 10 && C2.finish < c.s + 300) push(depth(T, C2.finish, 0, 0) + 80, (cx) => { cx.fillStyle = 'rgba(214,50,40,0.85)'; quad(cx, wpt(T, C2.finish, -C2.half, 0.03, [0, 0, 0]), wpt(T, C2.finish, C2.half, 0.03, [0, 0, 0]), wpt(T, C2.finish + 0.6, C2.half, 0.03, [0, 0, 0]), wpt(T, C2.finish + 0.6, -C2.half, 0.03, [0, 0, 0])); }, C2.finish + 0.6);
    for (const t of C2.trees) if (t.s > s0 - 20 && t.s < c.s + 420) shadowTree(ctx, T, t);
    for (const q of C2.gates) if (q.s > c.s - 6 && q.s < c.s + 300) { shadow(ctx, T, q.s, q.u - 3.2, 0.5, 0.25, 0.2); shadow(ctx, T, q.s, q.u + 4, 0.5, 0.25, 0.2); }
    for (const t of C2.trees) if (t.s > s0 - 20 && t.s < c.s + 640) sprite(T, t.s, t.u, (abs(t.u) - C2.half) * 0.07, (cx, x, y, sc) => spruce(cx, x, y, sc, t.h, t.seed, t.dwarf), 560);
    net(ctx, T, s0, s1, -1, C2.half + 0.6); net(ctx, T, s0, s1, 1, C2.half + 0.6);
    for (const q of C2.gates) if (q.s > c.s - 6 && q.s < c.s + 320) { if (q.done && q.wob && !q.wt) q.wt = V.t; gate(ctx, T, q, false); }
    for (const gr of C2.bears) if (gr.s > s0 && gr.s < s1) sprite(T, gr.s, gr.u, (abs(gr.u) - C2.half) * 0.07, (cx, x, y, sc) => F.bears(cx, x, y, sc, gr, V.t, fanHype(O, gr.s, c.s, ph === 'stop'), O.gasp || 0), 240);
    for (const cr of C2.crowd) if (cr.s > s0 && cr.s < s1) sprite(T, cr.s, cr.u, (abs(cr.u) - C2.half) * 0.07, (cx, x, y, sc) => F.crowd(cx, x, y, sc, cr, V.t, O.cheer || 0), 260);
    for (const bn of C2.banners) if (bn.s > s0 && bn.s < s1) sprite(T, bn.s, bn.u, 0, (cx, x, y, sc) => F.banner(cx, x, y, sc, ZS.LABELS.olymp.banner[bn.text], bn.text), 220);
    for (const cn of C2.cannons) if (cn.s > s0 - 10 && cn.s < s1) {
      sprite(T, cn.s, cn.u, 0, (cx, x, y, sc) => F.cannon(cx, x, y, sc, cn.dir, V.t), 400);
      if (cn.s > c.s - 5 && cn.s < c.s + 120 && FX.rng() < 0.5 && !hidden(T, cn.s, cn.u, 3, 3)) for (let i = 0; i < 1; i++) { const r = FX.rng, q = wpt(T, cn.s + (r() - 0.5) * 6, cn.u + cn.dir * (2 + r() * 12), 3 + r() * 3, [0, 0, 0]); puff(q[0], q[1], q[2], (r() - 0.5) * 2, -0.5, (r() - 0.5) * 2, 0.5 + r() * 0.8, 1.4, 1); }
    }
    for (const r of C2.ramps) if (r.s > s0 - 2 && r.s - r.len < s1) kicker(T, r);
    const R = C2.ratrak;
    if (R.s > s0 - 10 && R.s < s1) { sprite(T, R.s, R.u, 0, (cx, x, y, sc, z) => { cx.globalAlpha *= clamp((z - 3.2) / 3.5, 0, 1); F.ratrak(cx, x, y, sc, V.t, C.yaw - TR().at(T, R.s).h); }, 360); }
    const sc0 = C2.school, sk = SIM().school(C2, c.schoolT === undefined ? 0 : c.schoolT);
    if (sc0.s > s0 && sc0.s < s1) {
      sprite(T, sc0.s - 3, sc0.from - 1.5, 0, (cx, x, y, sc) => F.sign(cx, x, y, sc, ZS.LABELS.olymp.sign.school, '#f2c230', '#273a6b'), 300);
      if (sk) for (let i = 0; i <= sc0.kids; i++) {
        const u = sk.head - i * sc0.gap;
        if (u < sc0.from - 2 || u > sc0.to + 2) continue;
        sprite(T, sc0.s, u, 0, (cx, x, y, sc) => (i === 0 ? F.instructor(cx, x, y, sc, V.t) : F.kid(cx, x, y, sc, V.t, i)), 300);
      }
    }
    const fl = C2.fallen;
    if (fl.s > s0 && fl.s < s1) sprite(T, fl.s, fl.u, 0, (cx, x, y, sc) => F.fallen(cx, x, y, sc, V.t), 300);
    for (const b of C2.booths) if (b.s > s0 && b.s < s1 + 40) sprite(T, b.s, b.u, (abs(b.u) - C2.half) * 0.07, (cx, x, y, sc) => F.booth(cx, x, y, sc, V.t, O.mic), 420);
    if (C2.stall.s > s0 && C2.stall.s < s1) sprite(T, C2.stall.s, C2.stall.u, 0.4, (cx, x, y, sc) => F.stall(cx, x, y, sc, V.t), 300);
    if (C2.start.s + 4 > s0) sprite(T, C2.start.s + 1.4, 0, 0, (cx, x, y, sc) => F.startHut(cx, x, y, sc, V.t, ph), 300);
    if (C2.finish > s0 - 4 && C2.finish < s1 + 40) sprite(T, C2.finish, 0, 0, (cx, x, y, sc) => F.arch(cx, x, y, sc, ZS.LABELS.olymp.hud.finish, C2.half), 500);
    if (C2.board.s < s1 + 60) sprite(T, C2.board.s, C2.board.u, 0, (cx, x, y, sc) => F.board(cx, x, y, sc, g, O), 600);
    pylons(ctx, T, s0, s1, C2.lift.u, true);
    slope(ctx, T, s0, min(T.end, c.s + 6000), C2.half, 420, 34, (sa) => flush(ctx, sa));
    cord(ctx, T, c.s + 2, min(T.len, c.s + 90), [-16, -10.5, -5, 0.5, 6, 11.5, 17], 'rgba(205,218,232,0.55)');
    trailAdd(T, c.s, c.u, 0);
    tracks(ctx, T);
    pylons(ctx, T, s0, s1, C2.lift.u, false);
    const by = c.hy || 0, bpos = wpt(T, c.s, c.u, by, [0, 0, 0]);
    if (c.fall <= 0 && ph === 'ski') {
      const side = c.phi >= 0 ? 1 : -1;
      if (c.spray > 0.15) spray(T, c.s, c.u, 0, p.h + c.phi, c.spray, side, c.v);
    }
    planted(T, c);
    if (ph === 'stop' && c.v > 1) spray(T, c.s, c.u, 0, p.h + c.phi, 1, c.stopSide || 1, c.v + 6);
    if (c.fall > 0 && FX.rng() < 0.6) { const q = bpos; puff(q[0], q[1] + 0.4, q[2], (FX.rng() - 0.5) * 6, 2 + FX.rng() * 3, (FX.rng() - 0.5) * 6, 0.3, 0.9, 1); }
    shadow(ctx, T, c.s, c.u, 0.55, 0.8, 0.28);
    const bz = toCam(bpos[0], bpos[1], bpos[2], S2)[2];
    push(bz, (cx) => {
      const q = P(...bpos, [0, 0, 0]), sc = V.f / q[2];
      skis(cx, T, c.s, c.u, by, p.h + c.phi, c.lean, c.fall > 0 ? 0 : 1);
      F.skierBack(cx, q[0], q[1], sc, { lean: c.lean, tuck: c.tuck && c.fall <= 0, phi: c.phi - (C.yaw - p.h), fall: c.fall, t: V.t, v: c.v, stop: ph === 'stop', ready: ph === 'view' || ph === 'ready', inv: g.bear.inv, pole: poleOf(c) });
    });
    puffs(V.dt);
    flush(ctx);
    if (c.cloud > 0) { ctx.fillStyle = 'rgba(248,251,255,' + (0.8 * c.cloud).toFixed(3) + ')'; ctx.fillRect(-20, V.top - 20, V.w + 40, V.h + 40); }
    ctx.restore();
    flakes(ctx, v, c.phi);
    if (ph === 'ski') speedLines(ctx, v);
  }

  function shadowTree(ctx, T, t) {
    const r = t.dwarf ? 0.9 : 1.2 + t.h * 0.08;
    shadow(ctx, T, t.s, t.u + r * 0.6, r, r * 0.6, 0.16);
  }

  function pylons(ctx, T, s0, s1, u, posts) {
    const F = ZS.olympFig;
    if (posts) {
    for (let s = floor(s0 / 90) * 90 + 45; s < s0 + 760; s += 90) sprite(T, s, u, 4, (cx, x, y, sc) => F.pylon(cx, x, y, sc), 700);
      return;
    }
    ctx.strokeStyle = 'rgba(60,70,80,0.55)'; ctx.lineWidth = 1;
    for (const off of [-2.2, 2.2]) {
      ctx.beginPath(); let on = false;
      for (let s = max(0, floor(s0 / 10) * 10); s < s0 + 760; s += 10) {
        const sag = 13.5 - 1.2 * sin(((s - 45) / 90) * PI) ** 2;
        const q = toCam(...wpt(T, s, u + off, 4 + sag, SEG), S2);
        if (q[2] < NEAR || hidden(T, s, u + off, 4 + sag, 0)) { on = false; continue; }
        const x = V.cx + V.f * q[0] / q[2], y = V.cy - V.f * q[1] / q[2];
        if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        on = true;
      }
      ctx.stroke();
    }
  }

  function fanHype(O, s, at, party) {
    const near = clamp(1 - abs(s - at) / 30, 0, 1);
    return max(O.cheer || 0, near * 0.75, party ? 0.9 : 0.15);
  }

  function kicker(T, r) {
    const a = r.s - r.len, n = 6, hw = r.w / 2, z = depth(T, r.s, r.u, r.h);
    if (z < NEAR || z > 420) return;
    const top = SIM().rampTop, fade = 1 - smooth((z - 240) / 160);
    push(z, (cx) => {
      cx.globalAlpha = clamp(fade, 0, 1);
      for (const sd of [-1, 1]) {
        cx.fillStyle = sd < 0 ? '#9fb5cf' : '#b7c9de';
        const pts = [];
        for (let i = 0; i <= n; i++) { const s = a + r.len * i / n; pts.push(...wpt(T, s, r.u + sd * (hw + 0.5 * (1 - i / n)), 0.02, [0, 0, 0])); }
        for (let i = n; i >= 0; i--) { const s = a + r.len * i / n; pts.push(...wpt(T, s, r.u + sd * hw, top(r, s), [0, 0, 0])); }
        poly3(cx, pts, pts.length / 3);
      }
      for (let i = 0; i < n; i++) {
        const sa = a + r.len * i / n, sb = a + r.len * (i + 1) / n, k = i / n;
        cx.fillStyle = rgb([214 + k * 30, 226 + k * 22, 242 + k * 10]);
        quad(cx, wpt(T, sa, r.u - hw, top(r, sa), [0, 0, 0]), wpt(T, sa, r.u + hw, top(r, sa), [0, 0, 0]), wpt(T, sb, r.u + hw, top(r, sb), [0, 0, 0]), wpt(T, sb, r.u - hw, top(r, sb), [0, 0, 0]));
      }
      cx.fillStyle = 'rgba(40,110,220,0.55)';
      for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
        const sa = a + r.len * i / n, sb = a + r.len * (i + 1) / n, e0 = r.u + sd * (hw - 0.05), e1 = r.u + sd * (hw - 0.3);
        quad(cx, wpt(T, sa, e0, top(r, sa) + 0.01, [0, 0, 0]), wpt(T, sa, e1, top(r, sa) + 0.01, [0, 0, 0]), wpt(T, sb, e1, top(r, sb) + 0.01, [0, 0, 0]), wpt(T, sb, e0, top(r, sb) + 0.01, [0, 0, 0]));
      }
      cx.fillStyle = r.kind === 'big' ? 'rgba(220,40,40,0.9)' : 'rgba(40,110,220,0.85)';
      quad(cx, wpt(T, r.s - 0.35, r.u - hw, r.h + 0.01, [0, 0, 0]), wpt(T, r.s - 0.35, r.u + hw, r.h + 0.01, [0, 0, 0]), wpt(T, r.s, r.u + hw, r.h + 0.01, [0, 0, 0]), wpt(T, r.s, r.u - hw, r.h + 0.01, [0, 0, 0]));
      for (const sd of [-1, 1]) {
        const b = P(...wpt(T, r.s, r.u + sd * (hw + 0.2), 0, [0, 0, 0]), [0, 0, 0]), t = P(...wpt(T, r.s, r.u + sd * (hw + 0.2), r.h + 1.1, [0, 0, 0]), [0, 0, 0]);
        if (b[2] < NEAR || t[2] < NEAR) continue;
        const lw = max(1, V.f / b[2] * 0.06);
        cx.strokeStyle = '#2a2f3a'; cx.lineWidth = lw; cx.beginPath(); cx.moveTo(b[0], b[1]); cx.lineTo(t[0], t[1]); cx.stroke();
        const fw = V.f / t[2] * 0.6;
        cx.fillStyle = r.kind === 'big' ? '#e8322a' : '#2f7de0';
        cx.beginPath(); cx.moveTo(t[0], t[1]); cx.lineTo(t[0] - sd * fw, t[1] + fw * 0.3); cx.lineTo(t[0], t[1] + fw * 0.6); cx.closePath(); cx.fill();
      }
      cx.globalAlpha = 1;
    }, a);
  }

  const poleOf = (c) => (c.pole > 0 ? 1 - c.pole / ZS.sim.olymp.POLE.dur : -1);

  function planted(T, c) {
    const k = poleOf(c);
    if (k < 0.3 || k > 0.5 || FX.plant === c.pushes) return;
    FX.plant = c.pushes;
    const r = FX.rng;
    for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) {
      const q = wpt(T, c.s + 0.3, (c.u || 0) + sd * 0.8, 0.05, [0, 0, 0]);
      puff(q[0], q[1], q[2], (r() - 0.5) * 1.6 + sd * 0.6, 0.9 + r() * 1.6, (r() - 0.5) * 1.6, 0.05 + r() * 0.06, 0.4 + r() * 0.3, 2);
    }
    const q = wpt(T, c.s + 0.3, (c.u || 0), 0.1, [0, 0, 0]);
    puff(q[0], q[1], q[2], 0, 0.4, 0, 0.35, 0.7, 1);
  }

  function skis(ctx, T, s, u, y, h, lean, on) {
    if (!on) return;
    const fx = sin(h), fz = cos(h), rx = cos(h), rz = -sin(h), b = wpt(T, s, u, y + 0.04, [0, 0, 0]);
    for (const off of [-0.17, 0.17]) {
      const ox = b[0] + rx * (off + lean * 0.12), oz = b[2] + rz * (off + lean * 0.12);
      const a = [ox - fx * 0.85 - rx * 0.05, b[1], oz - fz * 0.85 - rz * 0.05], bb = [ox - fx * 0.85 + rx * 0.05, b[1], oz - fz * 0.85 + rz * 0.05];
      const cc = [ox + fx * 0.95 + rx * 0.05, b[1] + 0.06, oz + fz * 0.95 + rz * 0.05], d = [ox + fx * 0.95 - rx * 0.05, b[1] + 0.06, oz + fz * 0.95 - rz * 0.05];
      ctx.fillStyle = '#c8302a'; quad(ctx, a, bb, cc, d);
      ctx.fillStyle = '#f4f4f4'; const m1 = [ox + fx * 0.2 - rx * 0.05, b[1] + 0.03, oz + fz * 0.2 - rz * 0.05], m2 = [ox + fx * 0.2 + rx * 0.05, b[1] + 0.03, oz + fz * 0.2 + rz * 0.05], m3 = [ox + fx * 0.5 + rx * 0.05, b[1] + 0.04, oz + fz * 0.5 + rz * 0.05], m4 = [ox + fx * 0.5 - rx * 0.05, b[1] + 0.04, oz + fz * 0.5 - rz * 0.05];
      quad(ctx, m1, m2, m3, m4);
    }
  }

  const BEAR3 = {
    suit: [243, 245, 248], navy: [22, 38, 74], blue: [31, 79, 168], red: [209, 38, 44], fur: [107, 66, 38], furD: [78, 47, 25], muz: [154, 106, 68], boot: [233, 236, 240], ski: [200, 48, 42], dark: [29, 18, 9],
  };

  function ball(ctx, x, y, r, c) {
    if (!(r > 0.3)) return;
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, rgb([min(255, c[0] * 1.18 + 20), min(255, c[1] * 1.18 + 20), min(255, c[2] * 1.18 + 20)]));
    gr.addColorStop(0.7, rgb(c));
    gr.addColorStop(1, rgb([c[0] * 0.72, c[1] * 0.72, c[2] * 0.78]));
    ctx.fillStyle = gr; circle(ctx, x, y, r);
  }

  function bear3D(ctx, T, s, u, y, h, pose) {
    const fl = pose.flip || 0, sp = pose.spin || 0, gb = pose.grab || 0;
    const rx = cos(h), rz = -sin(h), fx = sin(h), fz = cos(h), cs = cos(sp), ss = sin(sp), cf = cos(fl), sf = sin(fl);
    const o = wpt(T, s, u, y, [0, 0, 0]);
    const W = (x, yy, z) => {
      const y0 = yy - 0.9, x1 = x * cs + z * ss, z1 = -x * ss + z * cs;
      const y2 = y0 * cf - z1 * sf, z2 = y0 * sf + z1 * cf;
      return [o[0] + rx * x1 + fx * z2, o[1] + y2 + 0.9, o[2] + rz * x1 + fz * z2];
    };
    const parts = [];
    const sph = (p, r, c) => parts.push({ k: 0, a: W(...p), r, c });
    const cap = (a, b, r, c) => parts.push({ k: 1, a: W(...a), b: W(...b), r, c });
    const B = BEAR3;
    for (const sd of [-1, 1]) {
      const x = sd * 0.17;
      parts.push({ k: 2, q: [W(x - 0.05, 0.02, -0.85), W(x + 0.05, 0.02, -0.85), W(x + 0.05, 0.1, 1.0), W(x - 0.05, 0.1, 1.0)], c: B.ski });
      sph([x, 0.13, 0], 0.11, B.boot);
      cap([x, 0.16, 0], [sd * 0.2, 0.5, 0.28], 0.1, B.navy);
      cap([sd * 0.2, 0.5, 0.28], [sd * 0.15, 0.82, -0.05], 0.12, B.navy);
      const hand = gb > 0.01 ? [lerp(sd * 0.42, sd * 0.2, gb), lerp(1.0, 0.28, gb), lerp(0.42, 0.55, gb)] : [sd * 0.42, 1.0, 0.42];
      cap([sd * 0.33, 1.32, 0.05], hand, 0.085, B.suit);
      sph(hand, 0.085, B.furD);
      sph([sd * 0.16, 1.84, 0.05], 0.075, B.furD);
    }
    sph([0, 0.85, -0.08], 0.26, B.navy);
    sph([0, 0.86, -0.33], 0.07, B.fur);
    sph([0, 1.2, 0.03], 0.36, B.suit);
    cap([-0.3, 1.1, 0.2], [0.3, 1.28, 0.22], 0.05, B.blue);
    cap([-0.31, 1.02, 0.17], [0.31, 1.18, 0.2], 0.035, B.red);
    parts.push({ k: 2, q: [W(-0.15, 1.05, -0.36), W(0.15, 1.05, -0.36), W(0.15, 1.33, -0.33), W(-0.15, 1.33, -0.33)], c: [252, 252, 252], back: true });
    const head = W(0, 1.64, 0.12), top = W(0, 1.95, 0.1);
    parts.push({ k: 3, a: head, t: top, r: 0.24 });
    sph([0, 1.58, 0.36], 0.1, B.muz);
    sph([0, 1.6, 0.46], 0.04, B.dark);
    for (const p of parts) { const m = p.k === 2 ? p.q[0].map((v, i) => (v + p.q[2][i]) / 2) : p.k === 1 ? p.a.map((v, i) => (v + p.b[i]) / 2) : p.a; p.z = toCam(m[0], m[1], m[2], S2)[2]; }
    parts.sort((a, b) => b.z - a.z);
    for (const p of parts) {
      if (p.k === 2) { ctx.fillStyle = rgb(p.c); quad(ctx, ...p.q); continue; }
      const A = P(...p.a, [0, 0, 0]), ra = V.f * p.r / A[2];
      if (p.k === 0) { ball(ctx, A[0], A[1], ra, p.c); continue; }
      if (p.k === 1) {
        const Bp = P(...p.b, [0, 0, 0]);
        ctx.strokeStyle = rgb([p.c[0] * 0.85, p.c[1] * 0.85, p.c[2] * 0.88]); ctx.lineCap = 'round'; ctx.lineWidth = max(1, ra * 2);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bp[0], Bp[1]); ctx.stroke();
        ctx.strokeStyle = rgb(p.c); ctx.lineWidth = max(0.8, ra * 1.4);
        ctx.beginPath(); ctx.moveTo(A[0] - ra * 0.15, A[1] - ra * 0.2); ctx.lineTo(Bp[0] - ra * 0.15, Bp[1] - ra * 0.2); ctx.stroke(); ctx.lineCap = 'butt';
        continue;
      }
      const Tp = P(...p.t, [0, 0, 0]), ang = atan2(Tp[1] - A[1], Tp[0] - A[0]);
      ball(ctx, A[0], A[1], ra, B.fur);
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang + PI / 2);
      const gr = ctx.createRadialGradient(-ra * 0.3, -ra * 0.6, ra * 0.1, 0, 0, ra * 1.05);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9cfd8');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, ra * 1.05, PI * 1.02, PI * 1.98); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d1262c'; ctx.fillRect(-ra * 0.12, -ra * 1.04, ra * 0.24, ra);
      ctx.fillStyle = '#1b1f2a'; ctx.fillRect(-ra * 1.02, -ra * 0.04, ra * 2.04, ra * 0.24);
      ctx.restore();
    }
  }

  function jump(ctx, g, O) {
    const c = O.c, J = g.level.olymp.jump, T = J.T, F = ZS.olympFig, ph = O.phase;
    const p = TR().at(T, c.s), air = ph === 'air', y = air ? c.y - p.y : 0;
    CAM.tilt = 0.2; CAM.half = J.half; CAM.rise = 0.05;
    const chase = chaseCam(T, c.s, c.u, y, p.h + c.phi * 0.4, 6.4, 3.4, 30, 7);
    const bw = wpt(T, c.s, c.u, y, [0, 0, 0]);
    const sideT = smooth(c.cam);
    let pose = chase;
    if (sideT > 0.001) {
      const rx = cos(p.h), rz = -sin(p.h), fx = sin(p.h), fz = cos(p.h);
      FX.sy = FX.sy === undefined || sideT < 0.05 ? bw[1] : ease(FX.sy, bw[1], 3, V.dt || 0.016);
      const az = lerp(0.75, 1.35, smooth((c.air || 0) / 2.6)), D = 10.5;
      const cx = bw[0] + (rx * sin(az) - fx * cos(az)) * D, cz = bw[2] + (rz * sin(az) - fz * cos(az)) * D, cy = FX.sy + 1.6;
      const yaw = atan2(bw[0] + fx * 2 - cx, bw[2] + fz * 2 - cz), pit = atan2(cy - (bw[1] + 1.4), Math.hypot(bw[0] - cx, bw[2] - cz));
      pose = blendCam(chase, [cx, cy, cz, yaw, pit], sideT);
    }
    cam(pose[0], pose[1], pose[2], pose[3], pose[4], -c.lean * 0.05 * (1 - sideT));
    if (sideT > 0.2) FX.occ = null; else FX.occ.y = C.y;
    V.f *= 1 - 0.08 * smooth((c.v - 12) / 10) * (1 - sideT);
    ctx.save();
    ctx.translate(V.cx, V.cy); ctx.rotate(C.roll); ctx.translate(-V.cx, -V.cy);
    sky(ctx);
    panorama(ctx, 0.5, 0);
    valley(ctx);
    const s0 = max(0, (sideT > 0.3 ? c.s - 30 : c.s - 8)), s1 = min(T.len, c.s + 260);
    for (const t of J.trees) if (t.s > s0 - 20 && t.s < s1 + 60) sprite(T, t.s, t.u, max(0, abs(t.u) - 20) * 0.04, (cx, x, yy, sc) => spruce(cx, x, yy, sc, t.h, t.seed, false), 300);
    for (const gr of J.bears) if (gr.s > s0 - 20 && gr.s < s1 + 40) sprite(T, gr.s, gr.u, 0.3, (cx, x, yy, sc) => F.bears(cx, x, yy, sc, gr, V.t, fanHype(O, gr.s, c.s, ph === 'air' || ph === 'out' || ph === 'judges'), O.gasp || 0), 300);
    for (const cr of J.crowd) if (cr.s > s0 - 20 && cr.s < s1 + 40) sprite(T, cr.s, cr.u, 0.3, (cx, x, yy, sc) => F.crowd(cx, x, yy, sc, cr, V.t, O.cheer || (ph === 'out' || ph === 'judges' ? 1 : 0)), 300);
    sprite(T, J.judges.s, J.judges.u, 0, (cx, x, yy, sc) => F.judgeTower(cx, x, yy, sc, V.t, ph === 'judges' ? O.t : -1), 400);
    sprite(T, J.lip - 8, -J.half - 1.2, 0.0, (cx, x, yy, sc) => F.sign(cx, x, yy, sc, ZS.LABELS.olymp.sign.bigair, '#1e2a4a', '#fff'), 300);
    sprite(T, 10, 0, 0, (cx, x, yy, sc) => F.arch(cx, x, yy, sc, ZS.LABELS.olymp.sign.bigair, J.half + 1), 300);
    if (!air && ph !== 'judges') { const side = c.phi >= 0 ? 1 : -1; if (ph === 'out' && c.spray > 0.2) spray(T, c.s, c.u, 0, p.h + c.phi, 1, side, c.v + 5); }
    if (!air) shadow(ctx, T, c.s, c.u, 0.7, 1.0, 0.28);
    else shadow(ctx, T, c.s, c.u, 0.6 + (c.y - p.y) * 0.03, 0.8, max(0.06, 0.25 - (c.y - p.y) * 0.02));
    jumpSlope(ctx, J, T, s0, min(T.end, c.s + 6000), sideT > 0.2 ? null : (sa) => flush(ctx, sa));
    trailAdd(T, c.s, c.u, air ? null : 0);
    if (!air) tracks(ctx, T);
    const bz = toCam(bw[0], bw[1], bw[2], S2)[2];
    push(bz, (cx) => {
      const q = P(...bw, [0, 0, 0]), sc = V.f / q[2];
      if (sideT > 0.5) { cx.globalAlpha = g.bear.inv > 0 ? 0.55 + 0.45 * cos(V.t * 18) : 1; bear3D(cx, T, c.s, c.u, y, p.h, { flip: c.flip, spin: c.spin, grab: c.grab || 0 }); cx.globalAlpha = 1; }
      else { skis(cx, T, c.s, c.u, y, p.h + c.phi, c.lean, c.fall > 0 ? 0 : 1); F.skierBack(cx, q[0], q[1], sc, { lean: c.lean, tuck: c.tuck, phi: c.phi, fall: c.fall, t: V.t, v: c.v, stop: false, ready: ph === 'top' || ph === 'judges', inv: g.bear.inv, pole: poleOf(c) }); }
    });
    if (ph === 'in') planted(T, c);
    puffs(V.dt);
    flush(ctx);
    ctx.restore();
    flakes(ctx, air ? 4 : c.v, 0);
    if (ph === 'in') speedLines(ctx, c.v + 4);
  }

  function jumpSlope(ctx, J, T, s0, s1, each) {
    const w = (s) => (s < 150 ? J.half : s < J.lip ? lerp(J.half, J.half + 1, (s - 150) / (J.lip - 150)) : lerp(J.half + 1, J.wide, smooth((s - J.lip) / 30)));
    const A0 = 146, A1 = 206, ya = TR().at(T, A0).y, yb = TR().at(T, A1).y;
    const drop = (s) => (s > A0 && s < A1 ? max(0, TR().at(T, s).y - lerp(ya, yb, (s - A0) / (A1 - A0)) + 0.4 * sin(((s - A0) / (A1 - A0)) * PI)) : 0);
    const prof = (d, dr) => 0.75 * Math.exp(-(((d - 1.4) / 1.1) ** 2)) * (1 - 0.6 * smooth(dr / 3)) - dr * smooth(d / 7) + max(0, d - 7) * 0.04;
    const DS = [0, 0.5, 1.2, 2, 3, 4.5, 6.5, 9, 14, 22];
    land(ctx, T, s0, s1, 40, (sa) => prof(40 - w(sa), drop(sa)), -1);
    steps(s0, min(s1, s0 + 1500), (sa, sb) => {
      const pa = TR().at(T, sa), zr = toCam(pa.x, pa.y, pa.z, S2)[2], za = max(NEAR, zr), hz = haze(za);
      if (zr < 0.8 && toCam(...wpt(T, sb, 0, 0, SEG), S2)[2] < 0.8) return;
      const sb2 = sb + 0.15, ha = w(sa), hb = w(sb2), da = drop(sa), db = drop(sb2);
      for (const sd of [-1, 1]) {
        const ext = [...DS, 40 - ha];
        for (let i = 0; i < ext.length - 1; i++) {
          const d0 = ext[i], d1 = i === ext.length - 2 ? 40 - ha : ext[i + 1], e0 = i === ext.length - 2 ? 40 - hb : ext[i + 1];
          const y00 = prof(d0, da), y01 = prof(d1, da), y10 = prof(i === 0 ? 0 : d0, db), y11 = prof(e0, db);
          wpt(T, sa, sd * (ha + d0), y00, SEG); wpt(T, sa, sd * (ha + d1), y01, SEG2); wpt(T, sb2, sd * (hb + e0), y11, SEG3); wpt(T, sb2, sd * (hb + d0), y10, SEG4);
          const slope = (y01 - y00) / max(0.3, d1 - d0), lit = -slope * sd * 22 - abs(slope) * 10 + sin(sa * 0.2 + d0) * 2;
          const base = d0 < 3 ? EDGE : OFF;
          ctx.fillStyle = rgb(mix([base[0] + lit, base[1] + lit, base[2] + lit * 0.6], HAZE, hz));
          quad(ctx, SEG, SEG2, SEG3, SEG4);
        }
      }
      const kick = sa > J.lip - 26 && sa < J.lip + 3, lit = (floor(sa / 4) % 2 ? 2 : -2) - (pa.gr - 0.3) * 26 + (kick ? 6 : 0);
      ctx.fillStyle = rgb(mix([SNOW[0] + lit, SNOW[1] + lit, SNOW[2] + lit * 0.5], HAZE, hz));
      quad(ctx, wpt(T, sa, -ha, 0, SEG), wpt(T, sa, ha, 0, SEG2), wpt(T, sb2, hb, 0, SEG3), wpt(T, sb2, -hb, 0, SEG4));
      if (sa >= J.land[0] && sa < J.land[1] && floor(sa) % 10 < 2) { ctx.fillStyle = 'rgba(50,90,200,0.55)'; quad(ctx, wpt(T, sa, -hb, 0.03, SEG), wpt(T, sa, hb, 0.03, SEG2), wpt(T, sa + 0.4, hb, 0.03, SEG3), wpt(T, sa + 0.4, -hb, 0.03, SEG4)); }
      if (abs(sa - J.lip) < 1.1) { ctx.fillStyle = 'rgba(214,50,40,0.85)'; const hl = w(J.lip); quad(ctx, wpt(T, J.lip - 0.5, -hl, 0.03, SEG), wpt(T, J.lip - 0.5, hl, 0.03, SEG2), wpt(T, J.lip, hl, 0.03, SEG3), wpt(T, J.lip, -hl, 0.03, SEG4)); }
      if (each) each(sa);
    });
  }



  function sledGround(ctx, S, T, s0, s1) {
    const edge = S.R * sin(S.out) + 9, top = S.R + 0.6;
    const rise = (u) => top + max(0, abs(u) - edge) * 0.06;
    land(ctx, T, s0, s1, 60, () => rise(60), -1);
    return (sa, sb) => {
      const pa = TR().at(T, sa), za = max(NEAR, toCam(pa.x, pa.y, pa.z, S2)[2]), hz = haze(za);
      const bands = [-60, -edge, edge, 60];
      for (let b = 0; b < bands.length - 1; b++) {
        if (b === 1 && sa <= T.len) continue;
        const ua = bands[b], ub = bands[b + 1];
        wpt(T, sa, ua, rise(ua), SEG); wpt(T, sa, ub, rise(ub), SEG2); wpt(T, sb + 0.2, ub, rise(ub), SEG3); wpt(T, sb + 0.2, ua, rise(ua), SEG4);
        const bump = sin(sa * 0.17 + b * 3) * 6, c = [OFF[0] + bump, OFF[1] + bump, OFF[2] + bump * 0.6];
        ctx.fillStyle = rgb(mix(c, HAZE, hz));
        quad(ctx, SEG, SEG2, SEG3, SEG4);
      }
    };
  }


  function sledTube(ctx, S, T, s0, s1, roll, ground, each, tubeEnd) {
    const N = 12;
    const A = new Float64Array((N + 1) * 3), B = new Float64Array((N + 1) * 3);
    const ring = (s, out, top) => {
      const p = TR().at(T, s), c = cos(p.h), sn = sin(p.h), L = -top.l, R = top.r;
      for (let i = 0; i <= N; i++) {
        const a = lerp(L, R, i / N), rr = S.R * sin(a), up = S.R - S.R * cos(a);
        out[i * 3] = p.x + c * rr; out[i * 3 + 1] = p.y + up; out[i * 3 + 2] = p.z - sn * rr;
      }
    };
    const tops = (s) => { const p = TR().at(T, s); return { l: SIM().wallTop(S, p, -1), r: SIM().wallTop(S, p, 1) }; };
    const pts = new Float64Array(12);
    steps(s0, s1, (sa, sb) => {
      const zr0 = toCam(...wpt(T, sa, 0, 0, SEG), S2)[2];
      if (zr0 < 0.8 && toCam(...wpt(T, sb, 0, 0, SEG), S2)[2] < 0.8) return;
      if (ground) ground(sa, sb);
      if (sa >= tubeEnd) { if (each) each(sa); return; }
      const ta = tops(sa), tb = tops(sb);
      ring(sa, A, ta); ring(sb + 0.1, B, tb);
      const pa = TR().at(T, sa), z = max(NEAR, toCam(pa.x, pa.y, pa.z, S2)[2]), hz = haze(z * 1.4);
      for (const sd of [-1, 1]) {
        const p = TR().at(T, sa), c = cos(p.h), sn = sin(p.h), top = sd < 0 ? ta.l : ta.r;
        const er = S.R * sin(top) * sd, eu = S.R - S.R * cos(top);
        const q1 = [p.x + c * er, p.y + eu, p.z - sn * er], q2 = [p.x + c * (er + sd * 9), p.y + eu + 0.6, p.z - sn * (er + sd * 9)];
        const pb = TR().at(T, sb + 0.1), c2 = cos(pb.h), sn2 = sin(pb.h), top2 = sd < 0 ? tb.l : tb.r, er2 = S.R * sin(top2) * sd, eu2 = S.R - S.R * cos(top2);
        const q3 = [pb.x + c2 * (er2 + sd * 9), pb.y + eu2 + 0.6, pb.z - sn2 * (er2 + sd * 9)], q4 = [pb.x + c2 * er2, pb.y + eu2, pb.z - sn2 * er2];
        ctx.fillStyle = rgb(mix([244, 246, 246], HAZE, hz));
        quad(ctx, q1, q2, q3, q4);
      }
      for (let i = 0; i < N; i++) {
        const a = lerp(-ta.l, ta.r, (i + 0.5) / N), lit = -abs(a) * 26 + (a > 0 ? 8 : -4) + (floor(sa / 6) % 2 ? 3 : 0);
        const ice = abs(a) < 0.25 ? [214, 232, 244] : [226, 238, 248];
        ctx.fillStyle = rgb(mix([ice[0] + lit, ice[1] + lit, ice[2] + lit * 0.5], HAZE, hz));
        pts[0] = A[i * 3]; pts[1] = A[i * 3 + 1]; pts[2] = A[i * 3 + 2]; pts[3] = A[i * 3 + 3]; pts[4] = A[i * 3 + 4]; pts[5] = A[i * 3 + 5];
        pts[6] = B[i * 3 + 3]; pts[7] = B[i * 3 + 4]; pts[8] = B[i * 3 + 5]; pts[9] = B[i * 3]; pts[10] = B[i * 3 + 1]; pts[11] = B[i * 3 + 2];
        poly3(ctx, pts, 4);
      }
      ctx.fillStyle = 'rgba(200,40,40,0.75)';
      for (const i of [1, N - 1]) {
        pts[0] = A[i * 3]; pts[1] = A[i * 3 + 1]; pts[2] = A[i * 3 + 2]; pts[3] = A[i * 3] * 0.9 + A[i * 3 + 3] * 0.1; pts[4] = A[i * 3 + 1] * 0.9 + A[i * 3 + 4] * 0.1; pts[5] = A[i * 3 + 2] * 0.9 + A[i * 3 + 5] * 0.1;
        pts[6] = B[i * 3] * 0.9 + B[i * 3 + 3] * 0.1; pts[7] = B[i * 3 + 1] * 0.9 + B[i * 3 + 4] * 0.1; pts[8] = B[i * 3 + 2] * 0.9 + B[i * 3 + 5] * 0.1; pts[9] = B[i * 3]; pts[10] = B[i * 3 + 1]; pts[11] = B[i * 3 + 2];
        poly3(ctx, pts, 4);
      }
      if (each) each(sa);
    });
    void roll;
  }

  function tubePt(S, T, s, a, h, o) {
    const p = TR().at(T, s), c = cos(p.h), sn = sin(p.h), r = S.R - (h || 0), rr = r * sin(a), up = S.R - r * cos(a), q = o || [0, 0, 0];
    q[0] = p.x + c * rr; q[1] = p.y + up; q[2] = p.z - sn * rr;
    return q;
  }

  function sled(ctx, g, O) {
    const c = O.c, S = g.level.olymp.sled, T = S.T, F = ZS.olympFig, ph = O.phase;
    if (ph === 'podium' || ph === 'doping') { ZS.olympHud.ceremony(ctx, g, O, V); return; }
    FX.occ = null;
    const p = TR().at(T, c.s), D = 4.6;
    const ac = clamp(c.roll, -0.95, 0.95), cp = tubePt(S, T, max(0, c.s - D), ac, 1.6, [0, 0, 0]);
    const la = tubePt(S, T, c.s + 7, ac * 0.92, 0.9, [0, 0, 0]);
    const yaw = atan2(la[0] - cp[0], la[2] - cp[2]), pit = atan2(cp[1] - la[1], Math.hypot(la[0] - cp[0], la[2] - cp[2]));
    FX.roll = ease(FX.roll, ac, 9, V.dt || 0.016);
    const sh = c.fall > 0 ? 1 : smooth((c.v - 18) / 10) * 0.3;
    cam(cp[0] + sin(V.t * 43) * 0.03 * sh, cp[1] + sin(V.t * 39) * 0.04 * sh, cp[2], yaw, pit, FX.roll * 0.92);
    V.f *= 1 - 0.1 * smooth((c.v - 12) / 12);
    ctx.save();
    ctx.translate(V.cx, V.cy); ctx.rotate(C.roll); ctx.translate(-V.cx, -V.cy);
    sky(ctx, false);
    panorama(ctx, -0.4, 0);
    valley(ctx);
    const s0 = max(0, c.s - 6), s1 = min(T.len, c.s + 200);
    for (const t of S.trees) if (t.s > s0 && t.s < c.s + 260) sprite(T, t.s, t.u, S.R + 0.6 + max(0, abs(t.u) - S.R * sin(S.out) - 9) * 0.06, (cx, x, y, sc) => spruce(cx, x, y, sc, t.h, t.seed, false), 250);
    const ground = sledGround(ctx, S, T, s0, min(T.end, c.s + 6000));
    for (const gr of S.bears) if (gr.s > s0 && gr.s < s1) { const top = SIM().wallTop(S, TR().at(T, gr.s), Math.sign(gr.u)); sprite(T, gr.s, Math.sign(gr.u) * (S.R * sin(top) + 1.9), S.R - S.R * cos(top) + 0.5, (cx, x, y, sc, z) => { cx.globalAlpha *= clamp((z - 4) / 5, 0, 1); F.bears(cx, x, y, sc, gr, V.t, fanHype(O, gr.s, c.s, false), O.gasp || 0); }, 220); }
    for (const cr of S.crowd) if (cr.s > s0 && cr.s < s1) { const top = SIM().wallTop(S, TR().at(T, cr.s), Math.sign(cr.u)); sprite(T, cr.s, Math.sign(cr.u) * (S.R * sin(top) + 1.6), S.R - S.R * cos(top) + 0.5, (cx, x, y, sc, z) => { cx.globalAlpha *= clamp((z - 4) / 5, 0, 1); F.crowd(cx, x, y, sc, cr, V.t, 0.6); }, 220); }
    for (const lm of S.lamps) if (lm.s > s0 && lm.s < s1) sprite(T, lm.s, lm.u, 2.4, (cx, x, y, sc) => F.lamp(cx, x, y, sc, V.t), 220);
    sprite(T, S.start.s + 10, -4.4, 2, (cx, x, y, sc) => F.sign(cx, x, y, sc, ZS.LABELS.olymp.sign.zahradky, '#2b5d3a', '#fff'), 200);
    if (S.bar < s1 + 60) { const bp = TR().at(T, S.bar); sprite(T, S.bar + 6, 0, 0, (cx, x, y, sc) => F.bar(cx, x, y, sc, V.t, C.yaw - bp.h), 700); }
    for (const t of S.things) if (t.s > c.s - 3 && t.s < s1) { const q = tubePt(S, T, t.s, t.a, 0, [0, 0, 0]); const z = toCam(q[0], q[1], q[2], S2)[2]; push(z, (cx) => { const pp = P(...q, [0, 0, 0]), sc = V.f / pp[2]; cx.save(); cx.translate(pp[0], pp[1]); cx.rotate(t.a - C.roll * 0); F.thing(cx, 0, 0, sc, t.kind, V.t, t.hit); cx.restore(); }, t.s); }
    const bpos = tubePt(S, T, c.s, c.a, c.hy || 0, [0, 0, 0]);
    if (c.spray > 0.2 && c.fall <= 0) for (let i = 0; i < 2; i++) { const r = FX.rng, q = tubePt(S, T, c.s - 0.5, c.a + (r() - 0.5) * 0.2, 0.05, [0, 0, 0]); puff(q[0], q[1], q[2], (r() - 0.5) * 3, 1 + r() * 2, (r() - 0.5) * 3, 0.08 + r() * 0.12, 0.4, 1); }
    if (c.out > 0.8) for (let i = 0; i < 3; i++) { const r = FX.rng, q = tubePt(S, T, c.s, c.a, 0, [0, 0, 0]); puff(q[0], q[1] + 0.5, q[2], (r() - 0.5) * 8, 3 + r() * 4, (r() - 0.5) * 8, 0.25 + r() * 0.3, 0.9, 1); }
    const bz = toCam(bpos[0], bpos[1], bpos[2], S2)[2];
    push(bz, (cx) => {
      const q = P(...bpos, [0, 0, 0]), sc = V.f / q[2], fly = c.out > 0 ? sin((1 - c.out) * PI) : 0;
      cx.save(); cx.translate(q[0] + (c.outSide || 0) * fly * 0.9 * sc, q[1] - fly * 1.3 * sc); cx.rotate(c.a - C.roll + (c.outSide || 0) * fly * 1.2);
      F.sledBack(cx, 0, 0, sc, { lean: c.lean, lie: c.tuck, t: V.t, v: c.v, fall: c.fall, inv: g.bear.inv });
      cx.restore();
    });
    sledTube(ctx, S, T, s0, min(T.end, c.s + 1500), c.roll, ground, (sa) => flush(ctx, sa), min(T.len, c.s + 400));
    puffs(V.dt);
    flush(ctx);
    ctx.restore();
    flakes(ctx, c.v, -c.lean * 0.3);
    if (ph === 'run') speedLines(ctx, c.v + 3);
    if (ph === 'bar') ZS.olympHud.barScene(ctx, g, O, V);
  }

  function draw(g, ctx, viewW, offY) {
    const O = g.olymp || (ZS.sim.olymp && ZS.sim.olymp.init(g));
    setup(g, viewW, offY);
    ctx.save();
    ctx.translate(0, offY);
    ctx.fillStyle = '#e6eef4'; ctx.fillRect(-20, V.top - 20, V.w + 40, V.h + 40);
    if (O.stage === 'slalom') slalom(ctx, g, O);
    else if (O.stage === 'skok') jump(ctx, g, O);
    else sled(ctx, g, O);
    ZS.olympHud.draw(ctx, g, O, V);
    if (O.flash > 0) { ctx.fillStyle = 'rgba(214,47,39,' + (O.flash * 0.28).toFixed(3) + ')'; ctx.fillRect(-10, V.top - 10, V.w + 20, V.h + 20); }
    if (O.fade > 0) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(O.fade, 0, 1).toFixed(3) + ')'; ctx.fillRect(-10, V.top - 10, V.w + 20, V.h + 20); }
    ctx.restore();
  }

  Object.assign(API, { draw, V, C, P, panorama, sky, tag, wpt });
})();
