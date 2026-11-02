(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const API = (ZS.winterArt = {});
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, sqrt = Math.sqrt, hypot = Math.hypot, atan2 = Math.atan2, exp = Math.exp;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(sin(n * 127.1 + 311.7) * 43758.5453);
  const hash2 = (a, b) => hash(a * 57.31 + b * 13.97 + 0.17);
  const rgba = (rgb, a) => 'rgba(' + rgb + ',' + clamp(a, 0, 1).toFixed(3) + ')';

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  function poly(ctx, p) {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function blob(ctx, p) {
    const n = p.length / 2, g = (i, k) => p[((i + n) % n) * 2 + k];
    ctx.beginPath(); ctx.moveTo(g(0, 0), g(0, 1));
    for (let i = 0; i < n; i++) {
      const x0 = g(i - 1, 0), y0 = g(i - 1, 1), x1 = g(i, 0), y1 = g(i, 1), x2 = g(i + 1, 0), y2 = g(i + 1, 1), x3 = g(i + 2, 0), y3 = g(i + 2, 1);
      ctx.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
    }
    ctx.closePath(); ctx.fill();
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
  function line(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function txt(ctx, s, x, y, size, col, weight, spacing) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function fitText(ctx, s, size, weight, maxW) {
    ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
    const w = ctx.measureText(s).width;
    return w > maxW ? size * maxW / w : size;
  }
  function viewRange(ctx, pad) {
    const m = ctx.getTransform ? ctx.getTransform() : null;
    if (!m || !m.a) return [-1e9, 1e9];
    return [-m.e / m.a - pad, (ctx.canvas.width - m.e) / m.a + pad];
  }

  const stores = {};
  let objSeed = 0;
  function seedOf(v) {
    if (typeof v === 'number') return (abs(v) * 12.9898) % TAU;
    const s = String(v); let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 9973;
    return (n / 9973) * TAU;
  }
  function stateOf(kind, o, time, make) {
    const S = stores[kind] || (stores[kind] = { byId: new Map(), byObj: new WeakMap(), sweepAt: 0 });
    let st;
    if (o.id !== undefined && o.id !== null) {
      st = S.byId.get(o.id);
      if (!st) { st = make(seedOf(o.id)); S.byId.set(o.id, st); }
      st.seen = time;
      if (time < S.sweepAt - 1 || time > S.sweepAt + 8) {
        S.sweepAt = time;
        for (const [k, v] of S.byId) if (v !== st && (v.seen < time - 12 || v.seen > time + 1)) S.byId.delete(k);
      }
    } else {
      st = S.byObj.get(o);
      if (!st) { st = make((objSeed += 1.618) % TAU); S.byObj.set(o, st); }
    }
    return st;
  }
  const flip = (o, time, on) => {
    const st = stateOf('flip', o, time, () => ({ on, at: -99, seen: 0 }));
    if (st.on !== on) { st.on = on; st.at = time; }
    if (st.at > time) st.at = -99;
    return time - st.at;
  };

  const GUN = { body: '#f2b51e', hi: '#ffd760', lo: '#cc8f0b', ring: '#3a4148' };
  const GUN_A = 0.5, PIV_Y = -74, NOZ_X = cos(GUN_A) * 47, NOZ_Y = PIV_Y - sin(GUN_A) * 47;
  let SNOW = '#f5f8fb', SNOW_SH = 'rgba(150,176,204,0.55)', SNOW_DK = 'rgba(120,150,184,0.55)', SNOW_FACE = 'rgba(150,176,204,0.34)', ICE_K = 1, WET = 0, COLD = 0.6;

  function snowCap(ctx, x0, x1, y, h, seed) {
    const n = Math.max(3, Math.round((x1 - x0) / 9)), p = [x0 - 1.5, y + 1.2];
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n), e = sin(PI * i / n);
      p.push(x, y - h * (0.35 + 0.65 * Math.pow(e, 0.4)) - (hash2(seed, i) - 0.5) * h * 0.4);
    }
    p.push(x1 + 1.5, y + 1.2);
    ctx.fillStyle = SNOW_SH; ctx.save(); ctx.translate(0.6, 1.3); poly(ctx, p); ctx.restore();
    ctx.fillStyle = SNOW; poly(ctx, p);
  }

  function cannon(ctx, c, time, g) {
    tint(g);
    const dir = c.dir < 0 ? -1 : 1, sd = hash(c.x * 0.0137);
    ctx.save(); ctx.translate(c.x, GY); ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(70,92,125,0.16)'; ell(ctx, -12, 1.2, 70, 4.4);
    ctx.fillStyle = '#8a949b'; rr(ctx, -78, -5, 30, 5, 1.6);
    ctx.fillStyle = '#4f6e5d'; rr(ctx, -74, -31, 22, 27, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(-73, -30, 3, 25);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-58, -30, 5, 25);
    ctx.fillStyle = '#3e5a4b'; rr(ctx, -76, -34.5, 26, 5, 2);
    snowCap(ctx, -76, -50, -34.2, 4.2, 3 + sd);
    ctx.fillStyle = '#e9edf0'; circle(ctx, -67, -21.5, 4.2);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(-67, -21.5, 3.2, -0.4, 0.5); ctx.lineTo(-67, -21.5); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    const na = -2.4 + 0.12 * sin(time * 3.3 + sd * 9) + 0.05 * sin(time * 11.7);
    line(ctx, -67, -21.5, -67 + cos(na) * 3.2, -21.5 + sin(na) * 3.2, 0.9, '#1d2125');
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(-59, -12, 3.2, 0, TAU);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.3; ctx.moveTo(-59, -12); ctx.lineTo(-59 + cos(a) * 3.2, -12 + sin(a) * 3.2); }
    ctx.stroke();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8f2620'; ctx.lineWidth = 5.4;
    ctx.beginPath(); ctx.moveTo(-53, -9); ctx.bezierCurveTo(-46, -8.5, -45, -2.2, -37, -2.2); ctx.lineTo(-22, -2.2); ctx.bezierCurveTo(-11, -2.2, -11, -16, -7, -31); ctx.stroke();
    ctx.strokeStyle = '#c8392e'; ctx.lineWidth = 3.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,170,0.45)'; ctx.lineWidth = 1; ctx.save(); ctx.translate(-0.4, -1.1); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#1b1e21'; ctx.lineWidth = 2.3;
    ctx.beginPath(); ctx.moveTo(-53, -24); ctx.bezierCurveTo(-46, -24, -46, -1.2, -38, -1.2); ctx.bezierCurveTo(-32, -1.2, -29.5, -4, -29.5, -10); ctx.lineTo(-29.5, -20); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.7; ctx.save(); ctx.translate(-0.3, -0.8); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#4b535a'; rr(ctx, -54.5, -12, 3.5, 6, 1); rr(ctx, -54.5, -27, 3.5, 6, 1);
    ctx.fillStyle = '#16191c'; circle(ctx, -4, -12, 11);
    line(ctx, -14, -19, -41, -11, 3.6, '#3a4148'); line(ctx, -14, -19.6, -41, -11.6, 1, 'rgba(255,255,255,0.18)');
    ctx.strokeStyle = '#3a4148'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-44, -10.4, 2.8, 0, TAU); ctx.stroke();
    line(ctx, -35, -12.5, -35, -2.5, 2.4, '#4a5259'); ctx.fillStyle = '#3a4148'; rr(ctx, -38.5, -3.2, 7, 2.6, 1);
    ctx.fillStyle = GUN.lo; poly(ctx, [-19, -15, 21, -15, 16, -28, -14, -28]);
    ctx.fillStyle = GUN.body; poly(ctx, [-18, -17.5, 20, -17.5, 15.6, -28, -14, -28]);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-14, -28, 29.6, 2);
    ctx.fillStyle = '#25292d'; circle(ctx, 2, -11, 11);
    ctx.fillStyle = '#3a4046';
    for (let k = 0; k < 14; k++) { const a = k * TAU / 14; ell(ctx, 2 + cos(a) * 9.9, -11 + sin(a) * 9.9, 1.5, 0.9, a); }
    ctx.fillStyle = '#25292d'; circle(ctx, 2, -11, 8.4);
    ctx.fillStyle = '#b4bcc2'; circle(ctx, 2, -11, 5.6);
    ctx.fillStyle = '#8b949b'; circle(ctx, 2, -11, 3.6);
    ctx.fillStyle = '#5b636a'; circle(ctx, 2, -11, 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(2, -11, 9.6, PI * 1.1, PI * 1.45); ctx.stroke();
    ctx.fillStyle = SNOW; ctx.beginPath(); ctx.arc(2, -11, 11.3, PI * 1.22, PI * 1.62); ctx.arc(2, -11, 9.4, PI * 1.6, PI * 1.25, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SNOW_DK; blob(ctx, [-34, 1, -24, -3.6, -12, -4.4, 0, -3.8, 14, -5.8, 30, -6.4, 46, -4, 58, 1]);
    ctx.fillStyle = SNOW; blob(ctx, [-34, 1.4, -24, -2.6, -12, -3.4, 0, -2.8, 14, -4.8, 30, -5.4, 46, -3, 58, 1.4]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ell(ctx, 26, -4.4, 9, 1.1); ell(ctx, -16, -2.6, 6, 0.9);
    ctx.fillStyle = '#6f7980'; rr(ctx, -9.5, -63, 10, 37, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-8.5, -62, 2.2, 35);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-2.8, -62, 2.4, 35);
    ctx.fillStyle = '#4b545c'; rr(ctx, -15, -67.5, 21, 6.5, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-13, -67, 17, 1.4);
    line(ctx, -22, -20, -22, -15, 2.4, '#4a5259');
    ctx.fillStyle = '#566069'; rr(ctx, -33, -34, 15, 15, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-32, -33, 13, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-33, -21.5, 15, 2.5);
    const scr = 0.75 + 0.15 * sin(time * 7.3 + sd) * sin(time * 2.1);
    ctx.fillStyle = '#0f2a33'; ctx.fillRect(-31, -31, 9, 5.4);
    ctx.fillStyle = rgba('120,225,255', scr); ctx.fillRect(-30.4, -30.4, 7.8, 4.2);
    ctx.fillStyle = 'rgba(15,42,51,0.7)'; ctx.fillRect(-29.6, -29.4, 4, 0.8); ctx.fillRect(-29.6, -27.8, 5.6, 0.8);
    const led = 0.5 + 0.5 * sin(time * TAU / 1.4 + sd * 5);
    ctx.fillStyle = rgba('90,255,120', 0.35 * led); circle(ctx, -29.4, -23.4, 3.2);
    ctx.fillStyle = led > 0.5 ? '#6dff8c' : '#1f6b33'; circle(ctx, -29.4, -23.4, 1.3);
    ctx.fillStyle = '#d9a12a'; circle(ctx, -25.4, -23.4, 1.1);
    snowCap(ctx, -33.5, -17.5, -34, 2.6, 11 + sd);
    ctx.fillStyle = '#3f474e'; poly(ctx, [-9, -64, 7, -64, 5, -74, 0, -79, -5, -74]);
    const jx = sin(time * 47 + sd * 7) * 0.22, jy = cos(time * 53 + sd * 3) * 0.2, yaw = 0.82 + 0.18 * sin(time * 0.37 + sd * 4);
    ctx.save(); ctx.translate(jx, PIV_Y + jy); ctx.rotate(-GUN_A);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-36, -20); ctx.lineTo(40, -20); ctx.lineTo(40, 20); ctx.lineTo(-36, 20); ctx.closePath(); ctx.clip();
    ctx.fillStyle = GUN.body; ctx.fillRect(-36, -20, 76, 40);
    ctx.fillStyle = GUN.hi; ctx.fillRect(-36, -20, 76, 7);
    ctx.fillStyle = 'rgba(255,250,220,0.45)'; ctx.fillRect(-36, -16, 76, 1.6);
    ctx.fillStyle = GUN.lo; ctx.fillRect(-36, 9, 76, 11);
    ctx.fillStyle = 'rgba(90,55,0,0.22)'; ctx.fillRect(-36, 16, 76, 4);
    for (const rx of [-19, 2, 22]) {
      ctx.fillStyle = 'rgba(110,70,0,0.32)'; ctx.fillRect(rx, -20, 2, 40);
      ctx.fillStyle = 'rgba(255,245,200,0.4)'; ctx.fillRect(rx - 1, -20, 1, 40);
    }
    ctx.restore();
    ctx.fillStyle = '#2b62a3'; rr(ctx, -15, -8.5, 17, 17, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-14, -7.5, 15, 2);
    ctx.strokeStyle = '#f4f8fb'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * PI / 3, ax = cos(a), ay = sin(a);
      ctx.moveTo(-6.5, 0); ctx.lineTo(-6.5 + ax * 6, ay * 6);
      ctx.moveTo(-6.5 + ax * 3.6 - ay * 1.8, ay * 3.6 + ax * 1.8); ctx.lineTo(-6.5 + ax * 4.6, ay * 4.6); ctx.lineTo(-6.5 + ax * 3.6 + ay * 1.8, ay * 3.6 - ax * 1.8);
    }
    ctx.stroke();
    ctx.fillStyle = GUN.ring; rr(ctx, 34, -22.5, 10, 45, 3.4);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(35, -21.5, 8, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(35, 16, 8, 5);
    ctx.fillStyle = '#a9b2b9';
    for (let k = 0; k < 6; k++) rr(ctx, 43, -17.5 + k * 7, 3, 2.4, 1);
    snowCap(ctx, -31, 30, -20, 4.4, 7 + sd);
    ctx.fillStyle = 'rgba(190,225,245,0.85)';
    for (let k = 0; k < 4; k++) { const ix = 37 + k * 2.2, il = (2.5 + hash(k + sd * 3) * 3.2) * ICE_K; poly(ctx, [ix - 0.9, 22.5, ix + 0.9, 22.5, ix, 22.5 + il]); }
    const bl = Math.pow(Math.max(0, sin(time * 4.6 + sd * 11)), 4);
    ctx.fillStyle = rgba('255,170,40', 0.38 * bl); circle(ctx, 12, -25, 8);
    ctx.fillStyle = '#30363c'; rr(ctx, 8.4, -24, 7.2, 3.4, 1);
    ctx.fillStyle = bl > 0.35 ? '#ffb02e' : '#b5651d'; ctx.beginPath(); ctx.ellipse(12, -24, 3, 3.6, 0, PI, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(ctx, 11, -26, 0.9, 1.2);
    ctx.fillStyle = GUN.ring; ell(ctx, -36, 0, 9 * yaw, 22.5);
    ctx.fillStyle = '#1b1f23'; ell(ctx, -36, 0, 7.2 * yaw, 19.6);
    ctx.save(); ctx.translate(-36, 0); ctx.scale(0.36 * yaw, 1); ctx.rotate(time * 21 + sd * 5);
    ctx.fillStyle = 'rgba(122,132,140,0.95)';
    for (let k = 0; k < 5; k++) { ctx.rotate(TAU / 5); ell(ctx, 9.4, 0, 8.4, 3.4, 0.35); }
    ctx.restore();
    ctx.fillStyle = 'rgba(140,152,160,0.3)'; ell(ctx, -36, 0, 6.6 * yaw, 18.4);
    ctx.strokeStyle = '#a4adb4'; ctx.lineWidth = 0.8;
    for (const k of [0.92, 0.64, 0.36]) { ctx.beginPath(); ctx.ellipse(-36, 0, 7.2 * yaw * k, 19.6 * k, 0, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-36, -19.6); ctx.lineTo(-36, 19.6); ctx.moveTo(-36 - 7 * yaw, 0); ctx.lineTo(-36 + 7 * yaw, 0); ctx.stroke();
    ctx.fillStyle = '#5c656c'; ell(ctx, -36, 0, 1.8 * yaw, 4.6);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-36, 0, 9 * yaw, 22.5, 0, PI * 1.05, PI * 1.45); ctx.ellipse(-36, 0, 7.4 * yaw, 20, 0, PI * 1.45, PI * 1.05, true); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a535b'; poly(ctx, [-6, -64, 5, -64, 4.4, -72, 0, -76.5, -4.6, -72]);
    ctx.fillStyle = '#353c42'; circle(ctx, jx, PIV_Y + jy, 5);
    ctx.fillStyle = '#9aa4ab'; circle(ctx, jx, PIV_Y + jy, 2);
    ctx.restore();
  }

  const PN = 120, PX = new Float32Array(PN), PY = new Float32Array(PN), PR = new Float32Array(PN);
  let pc = 0;
  const puff = (x, y, r) => { if (r > 0.4 && pc < PN) { PX[pc] = x; PY[pc] = y; PR[pc] = r; pc++; } };
  function union(ctx, a, b, ox, oy, k) {
    ctx.beginPath();
    for (let i = a; i < b; i++) {
      const r = PR[i] * k, x = PX[i] + ox * PR[i], y = PY[i] + oy * PR[i];
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }
  const CORE = [
    [24, -9, 11], [36, -26, 14], [44, -11, 17], [76, -20, 27], [112, -19, 28], [148, -20, 28], [184, -19, 28], [220, -18, 27], [254, -17, 25], [286, -14, 19],
    [46, -46, 20], [76, -56, 24], [112, -60, 27], [150, -61, 28], [188, -59, 27], [224, -54, 25], [258, -46, 21], [286, -38, 14],
    [94, -84, 17], [130, -88, 19], [168, -88, 19], [204, -82, 17], [236, -74, 13],
  ];
  const jetX = (s, D) => NOZ_X + D * s;
  const jetY = (s, D, land) => NOZ_Y - 0.55 * D * s + (0.55 * D + land - NOZ_Y) * s * s;
  const CU = cos(GUN_A), CV = sin(GUN_A);

  function spray(ctx, c, time, g) {
    tint(g);
    const dir = c.dir < 0 ? -1 : 1, sd = hash(c.x * 0.0137) * 10;
    ctx.save(); ctx.translate(c.x, GY); ctx.scale(dir, 1);
    ctx.beginPath(); ctx.rect(-60, -400, 480, 403); ctx.clip();
    pc = 0;
    for (let i = 0; i < 10; i++) {
      const L = 3.4 + hash(i * 1.7) * 1.8, v = time / L + hash(i * 2.9 + sd), k = Math.floor(v), u = v - k;
      const x0 = 290 + hash2(i, k) * 40, y0 = -16 - hash2(k, i) * 50;
      puff(x0 + u * (30 + 26 * hash(i)), y0 + u * 8, (13 + 10 * hash2(i, k + 1)) * Math.pow(sin(PI * u), 0.7));
    }
    for (let i = 0; i < 5; i++) {
      const L = 2.6 + hash(i * 3.1) * 1.2, v = time / L + hash(i * 4.3 + sd), k = Math.floor(v), u = v - k;
      puff(150 + hash2(i, k) * 120 + u * 40, -116 - hash2(k, i) * 18 + u * 22, (8 + 6 * hash2(k, i + 2)) * sin(PI * u));
    }
    const fringe = pc;
    for (let i = 0; i < CORE.length; i++) {
      const p = CORE[i];
      puff(p[0] + sin(time * 0.55 + i * 1.7 + sd) * 3.4, p[1] + sin(time * 0.8 + i * 2.3) * 2.4, p[2] * (1 + 0.08 * sin(time * 1.25 + i * 0.9 + sd)));
    }
    for (let i = 0; i < 16; i++) {
      const L = 2.8 + hash(i * 1.3) * 1.6, v = time / L + hash(i * 3.7 + sd), k = Math.floor(v), u = v - k;
      const x0 = 56 + hash2(i, k) * 190, y0 = -56 - hash2(k, i) * 38;
      puff(x0 + u * (26 + 30 * hash(i + 5)), y0 + u * 16, (11 + 10 * hash2(i, k + 3)) * Math.pow(sin(PI * u), 0.6));
    }
    const jet0 = pc;
    for (let j = 0; j < 36; j++) {
      const v = time * 1.15 + j / 36, k = Math.floor(v), u = v - k, s = 0.07 + 0.93 * (1 - Math.pow(1 - u, 1.5));
      const D = 160 + 100 * hash2(j, k), land = -42 - 30 * hash2(k, j), wob = sin(time * 3 + j * 1.9) * 5 * s;
      puff(jetX(s, D), jetY(s, D, land) + wob, (5 + 19 * Math.pow(s, 0.9)) * Math.min(1, (1 - u) * 3.2, u * 10 + 0.45));
    }
    const all = pc;
    for (let i = 0; i < 9; i++) {
      const L = 3.6 + hash(i * 2.7) * 2, v = time / L + hash(i * 5.3 + sd), k = Math.floor(v), u = v - k;
      const x0 = 46 + hash2(i + 9, k) * 214, y0 = -22 - hash2(k, i + 9) * 58;
      puff(x0 + u * 32, y0 + u * 8, (22 + 12 * hash2(i, k + 5)) * Math.pow(sin(PI * u), 0.5));
    }
    const lobes = pc;
    const fx = jetX(0.09, 210), fy = jetY(0.09, 210, -55), tx = 210, ty = -0.55 * 210 + 2 * (0.55 * 210 - 55 - NOZ_Y) * 0.09, tl = hypot(tx, ty), nx = ty / tl, ny = -tx / tl;
    const cone = () => {
      ctx.moveTo(NOZ_X - CV * 5.5, NOZ_Y - CU * 5.5); ctx.lineTo(fx + nx * 8, fy + ny * 8);
      ctx.lineTo(fx - nx * 8, fy - ny * 8); ctx.lineTo(NOZ_X + CV * 5.5, NOZ_Y + CU * 5.5); ctx.closePath();
    };
    const body = (ox, oy) => {
      ctx.beginPath();
      for (let i = fringe; i < all; i++) { const r = PR[i], x = PX[i] + ox * r, y = PY[i] + oy * r; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      ctx.rect(62 + ox * 20, -48 + oy * 20, 196, 48); ctx.moveTo(232 + ox * 20, -68 + oy * 20); ctx.ellipse(150 + ox * 20, -68 + oy * 20, 82, 18, 0, 0, TAU);
      cone();
    };
    ctx.fillStyle = 'rgba(244,248,252,0.28)'; union(ctx, 0, fringe, 0, 0, 1);
    ctx.fillStyle = 'rgba(146,172,206,0.38)'; body(0.05, 0.13); ctx.fill();
    const gr = ctx.createLinearGradient(0, -128, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.88)'); gr.addColorStop(0.55, 'rgba(246,249,252,0.86)'); gr.addColorStop(1, 'rgba(224,234,246,0.88)');
    ctx.fillStyle = gr; body(0, 0); ctx.fill();
    ctx.fillStyle = 'rgba(206,220,236,0.34)'; union(ctx, all, lobes, 0.06, 0.12, 1);
    const lg = ctx.createLinearGradient(0, -120, 0, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.62)'); lg.addColorStop(1, 'rgba(244,248,252,0.5)');
    ctx.fillStyle = lg; union(ctx, all, lobes, 0, 0, 1);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.62)'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = fringe; i < jet0; i++) {
      if (PY[i] - PR[i] > -92 || PR[i] < 10) continue;
      const r = PR[i] * 0.93, a0 = PI * 1.08, a1 = PI * 1.52;
      ctx.moveTo(PX[i] + cos(a0) * r, PY[i] + sin(a0) * r); ctx.arc(PX[i], PY[i], r, a0, a1);
    }
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const u = frac(time * 2.6 + i / 7), s0 = 0.02 + u * 0.22, s1 = s0 + 0.05, off = (hash(i * 3.3) - 0.5) * 8 * (0.4 + u);
      ctx.strokeStyle = rgba('255,255,255', 0.85 * sin(PI * u)); ctx.lineWidth = 1.6 - u;
      ctx.beginPath(); ctx.moveTo(jetX(s0, 210) + nx * off, jetY(s0, 210, -55) + ny * off); ctx.lineTo(jetX(s1, 210) + nx * off, jetY(s1, 210, -55) + ny * off); ctx.stroke();
    }
    for (let i = 0; i < 54; i++) {
      const sp = 0.3 + hash(i * 1.31) * 0.28, v = time * sp + hash(i * 2.13 + sd), k = Math.floor(v), u = v - k;
      const D = 160 + 100 * hash2(i, k), s0 = 0.15 + 0.85 * hash2(k, i + 7), x0 = jetX(s0, D), y0 = jetY(s0, D, -60);
      const x = x0 + u * (20 + 34 * hash(i + k)) + sin(time * 2.2 + i) * 3, y = lerp(y0, -2, u * u * (1.6 - 0.6 * u));
      const a = sstep(0, 0.12, u) * (1 - sstep(0.7, 1, u)) * (0.55 + 0.45 * hash(i * 7.7));
      if (a < 0.03) continue;
      ctx.fillStyle = rgba('255,255,255', a); ctx.fillRect(x - 0.9, y - 0.9, 1.4 + hash(i) * 0.8, 1.4 + hash(i) * 0.8);
    }
    ctx.restore();
  }

  const WOOD = ['#6e5139', '#7b5b40', '#634833', '#86654a'];
  const HAY = ['#d6b85c', '#bf9f46', '#ecd68e', '#a98a3a'];
  let feederG = null;
  function feederGeo() {
    if (feederG) return feederG;
    const g = feederG = { straw: [new Path2D(), new Path2D(), new Path2D()], loose: [new Path2D(), new Path2D()], shingles: [new Path2D(), new Path2D(), new Path2D()], joints: new Path2D() };
    for (let i = 0; i < 90; i++) {
      const y = -94 + hash(i * 1.7) * 44, hw = 40 - (y + 94) * 0.36, x = (hash(i * 2.3) * 2 - 1) * hw, p = g.straw[Math.floor(hash(i * 3.1) * 3)], a = (hash(i * 4.7) - 0.5) * 1.6;
      p.moveTo(x, y); p.lineTo(x + sin(a) * 6, y + cos(a) * 6);
    }
    for (let i = 0; i < 36; i++) {
      const x = (hash(i * 5.3) * 2 - 1) * 60, y = -1 - hash(i * 6.1) * 2.2, a = (hash(i * 7.9) - 0.5) * 2.6, l = 4 + hash(i * 8.3) * 6, p = g.loose[i % 2];
      p.moveTo(x, y); p.lineTo(x + cos(a) * l, y + sin(a) * l * 0.25);
    }
    for (let r = 0; r < 5; r++) {
      const y0 = -100 - r * 7.4, hw = 76 - r * 3.6;
      for (let x = -hw + (r % 2) * 5, i = 0; x < hw; x += 10, i++) g.shingles[Math.floor(hash2(r, i) * 3)].rect(x, y0 - 7.4, Math.min(10, hw - x), 7.4);
      g.joints.rect(-hw, y0 - 1.1, hw * 2, 1.1);
    }
    return g;
  }
  function bullfinch(ctx, x, y, dir, time, sd, peck) {
    const hop = Math.max(0, sin(time * 1.3 + sd * 7)) > 0.985 ? 1 : 0, tw = sin(time * 0.9 + sd * 3);
    const pk = peck ? Math.pow(Math.max(0, sin(time * 5.2 + sd)), 6) * sstep(0.2, 0.6, sin(time * 0.7 + sd * 2)) : 0;
    ctx.save(); ctx.translate(x, y - hop * 1.5); ctx.scale(dir * (tw > 0.85 ? -1 : 1), 1);
    ctx.fillStyle = '#2a2a2e'; poly(ctx, [-3.2, -3.4, -8.4, -2.2, -8, -1, -3, -2]);
    ctx.fillStyle = '#7d8590'; ell(ctx, -0.4, -4.2, 4.2, 3.4);
    ctx.fillStyle = '#e0565a'; ell(ctx, 0.9, -3.2, 3.4, 3);
    ctx.fillStyle = '#2b2b30'; ell(ctx, -1.6, -4.6, 3.1, 1.7, -0.2);
    ctx.fillStyle = '#f2f2f2'; ell(ctx, -1.6, -3.9, 2.2, 0.55, -0.2);
    ctx.save(); ctx.translate(2.6, -6.2); ctx.rotate(pk * 0.9);
    ctx.fillStyle = '#7d8590'; circle(ctx, 0, 0, 2.3);
    ctx.fillStyle = '#1e1e22'; ctx.beginPath(); ctx.arc(0, 0, 2.35, PI * 0.95, PI * 1.95); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; poly(ctx, [1.8, -0.6, 3.6, 0.1, 1.8, 0.9]);
    ctx.restore();
    line(ctx, 0, -1, -0.4, 0, 0.6, '#3a3030'); line(ctx, 1.2, -1, 1.4, 0, 0.6, '#3a3030');
    ctx.restore();
  }

  function feeder(ctx, f, time, gm) {
    tint(gm);
    const g = feederGeo(), eaten = !!f.eaten, sd = hash(f.x * 0.011), sway = sin(time * 1.3 + sd * 6) * 0.6;
    ctx.save(); ctx.translate(f.x, GY);
    ctx.fillStyle = 'rgba(70,92,125,0.16)'; ell(ctx, 4, 1.2, 84, 4.4);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#4e3a29'; ctx.fillRect(s * 40 - 2.5, -98, 5, 98);
      line(ctx, s * 40, -60, s * 18, -96, 3, '#4a3626');
    }
    ctx.fillStyle = '#5a4331'; poly(ctx, [-58, -96, 58, -96, 52, -90, -52, -90]);
    ctx.fillStyle = '#3c2c1f';
    poly(ctx, [-42, -92, 42, -92, 32, -46, -32, -46]);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-42, -92); ctx.lineTo(42, -92); ctx.lineTo(32, -46); ctx.lineTo(-32, -46); ctx.closePath(); ctx.clip();
    ctx.fillStyle = HAY[0];
    if (eaten) blob(ctx, [-34, -46, -30, -60, -16, -66, 0, -63, 16, -67, 30, -61, 34, -46]);
    else ctx.fillRect(-44, -94, 88, 50);
    ctx.fillStyle = 'rgba(120,90,20,0.25)'; ctx.fillRect(-44, -60, 88, 16);
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(sway * 0.3, 0);
    if (!eaten) { ctx.strokeStyle = HAY[1]; ctx.stroke(g.straw[0]); ctx.strokeStyle = HAY[2]; ctx.stroke(g.straw[1]); ctx.strokeStyle = HAY[3]; ctx.stroke(g.straw[2]); }
    ctx.restore();
    ctx.restore();
    if (!eaten) {
      ctx.fillStyle = HAY[0]; blob(ctx, [-44, -92, -34, -101, -18, -104, 0, -102, 16, -105, 32, -101, 44, -92, 0, -90]);
      ctx.fillStyle = HAY[2]; ell(ctx, -14, -100.5, 10, 2.2, -0.1); ell(ctx, 18, -101, 8, 1.8, 0.1);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, xt = lerp(-42, 42, t), xb = lerp(-32, 32, t);
      line(ctx, xt, -92, xb, -46, 2.4, '#6b4f37'); line(ctx, xt - 0.5, -92, xb - 0.5, -46, 0.8, 'rgba(255,225,180,0.25)');
    }
    ctx.strokeStyle = HAY[2]; ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < (eaten ? 10 : 16); i++) {
      const t = (i + 0.5) / (eaten ? 10 : 16), y = eaten ? -48 - hash(i * 3.3) * 14 : -52 - hash(i * 3.3) * 36, x = lerp(lerp(-42, -32, (y + 92) / 46), lerp(42, 32, (y + 92) / 46), t);
      const a = PI / 2 + (hash(i * 7.1) - 0.5) * 0.8 + sway * 0.05, l = 6 + hash(i * 5.7) * (eaten ? 12 : 7);
      ctx.moveTo(x, y); ctx.lineTo(x + cos(a) * l * 0.4 + sway * 0.4, y + sin(a) * l);
    }
    ctx.stroke();
    ctx.fillStyle = '#6b4f37'; ctx.fillRect(-44, -94.5, 88, 4); ctx.fillRect(-34, -48, 68, 3.5);
    ctx.fillStyle = 'rgba(255,230,190,0.18)'; ctx.fillRect(-44, -94.5, 88, 1.2);
    for (const s of [-1, 1]) {
      ctx.fillStyle = WOOD[0]; ctx.fillRect(s * 52 - 3.5, -100, 7, 100);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(s * 52 + 0.5, -100, 3, 100);
      ctx.fillStyle = 'rgba(255,230,190,0.14)'; ctx.fillRect(s * 52 - 3.5, -100, 1.4, 100);
      ctx.fillStyle = 'rgba(40,25,10,0.3)'; for (let k = 0; k < 4; k++) ctx.fillRect(s * 52 - 2.5 + (k % 2) * 3, -88 + k * 21 + hash(k + s) * 6, 1, 6);
      line(ctx, s * 52, -62, s * 36, -97, 3.4, WOOD[2]);
    }
    ctx.fillStyle = WOOD[1]; ctx.fillRect(-62, -100, 124, 6);
    ctx.fillStyle = 'rgba(255,230,190,0.18)'; ctx.fillRect(-62, -100, 124, 1.4); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-62, -95.5, 124, 1.5);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-80, -98); ctx.lineTo(-58, -137); ctx.lineTo(58, -137); ctx.lineTo(80, -98); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#4c392a'; ctx.fillRect(-80, -137, 160, 40);
    const tone = ['#5a4332', '#4f3a2b', '#634a37'];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = tone[i]; ctx.fill(g.shingles[i]); }
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill(g.joints);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; poly(ctx, [24, -137, 58, -137, 80, -98, 40, -98]);
    ctx.restore();
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(-82, -99, 164, 3.4);
    const cap = [-86, -97, -79, -104, -63, -137, -54, -144, -20, -146.5, 20, -146, 54, -144.5, 63, -137, 79, -104, 86, -97, 77, -99.5, 70, -106, 58, -127, 46, -130.5, 24, -128.5, 2, -131, -22, -128, -46, -131, -58, -127, -70, -106, -77, -99.5];
    ctx.save(); ctx.translate(0.8, 2.6); ctx.fillStyle = SNOW_DK; blob(ctx, cap); ctx.restore();
    ctx.fillStyle = SNOW; blob(ctx, cap);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ell(ctx, -22, -143.5, 24, 1.5, 0.02); ell(ctx, 28, -143, 16, 1.2, -0.02);
    ctx.fillStyle = SNOW_FACE; poly(ctx, [48, -142, 62, -136.5, 78, -104, 84, -98, 77, -99.5, 70, -106, 58, -127, 50, -130]);
    ctx.fillStyle = 'rgba(200,228,245,0.9)';
    for (let i = 0; i < 9; i++) {
      const ix = -74 + i * 18.5 + hash(i * 2.2) * 6, il = (3 + hash(i * 3.9 + sd) * 7 + 0.6 * sin(time * 0.3 + i)) * ICE_K;
      poly(ctx, [ix - 1.4, -97, ix + 1.4, -97, ix + 0.2, -97 + il]);
    }
    ctx.fillStyle = '#5c4430';
    for (const s of [-1, 1]) { ctx.fillRect(s * 50 - 2.5, -30, 5, 30); }
    ctx.fillStyle = '#7a5a3f'; poly(ctx, [-62, -36, 62, -36, 56, -14, -56, -14]);
    ctx.fillStyle = '#2d2117'; poly(ctx, [-58, -36, 58, -36, 55, -31, -55, -31]);
    if (!eaten) {
      const beets = [[-44, -37, 0], [-31, -39, 1], [-18, -36.5, 0], [-4, -38.5, 2], [10, -37, 0], [24, -39, 1], [38, -36.6, 0], [48, -38, 2]];
      for (const b of beets) {
        ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate((hash(b[0]) - 0.5) * 0.8);
        if (b[2] === 2) {
          ctx.fillStyle = '#e7c02c'; rr(ctx, -7, -2.6, 14, 5.2, 2.6);
          ctx.fillStyle = 'rgba(160,110,10,0.45)'; for (let k = -5; k < 6; k += 2.2) ctx.fillRect(k, -2.2, 0.7, 4.4);
          ctx.fillStyle = '#e8dcae'; poly(ctx, [-7, -2, -11, -3.4, -10, 0, -11, 3, -7, 2]);
        } else {
          ctx.fillStyle = b[2] ? '#c4553f' : '#eadcc0'; ell(ctx, 0, 0, 6.4, 4.8);
          ctx.fillStyle = b[2] ? '#a3402f' : '#cdb994'; ell(ctx, 1.2, 1.4, 4.6, 3);
          ctx.fillStyle = b[2] ? 'rgba(255,190,170,0.4)' : 'rgba(255,255,255,0.6)'; ell(ctx, -2, -2, 2.4, 1.2);
          ctx.fillStyle = '#8c3d55'; ell(ctx, -1, -4.6, 3, 1.4);
          ctx.fillStyle = '#4f7a3a'; poly(ctx, [-2, -5.2, -3.6, -8.4, -1.2, -6, 0.4, -8.8, 0.6, -5.4]);
        }
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#d9c39a'; ell(ctx, -22, -32.6, 3, 1.2); ell(ctx, 30, -32.4, 2.4, 1);
      ctx.fillStyle = '#e7c02c'; ell(ctx, 8, -32.8, 1.6, 0.9);
    }
    ctx.fillStyle = 'rgba(255,230,190,0.16)'; ctx.fillRect(-62, -36, 124, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-56, -17, 112, 3);
    ctx.fillStyle = 'rgba(40,25,10,0.35)'; ctx.fillRect(-60, -27, 118, 1);
    snowCap(ctx, -64, -46, -36, 3.2, 21 + sd); snowCap(ctx, 46, 64, -36, 3, 23 + sd);
    for (const s of [-1, 1]) { ctx.fillStyle = SNOW; blob(ctx, [s * 52 - 14, 1, s * 52 - 6, -5, s * 52 + 3, -6.4, s * 52 + 12, -3, s * 52 + 16, 1]); }
    if (eaten) {
      ctx.lineWidth = 1.2; ctx.strokeStyle = HAY[0]; ctx.stroke(g.loose[0]); ctx.strokeStyle = HAY[3]; ctx.stroke(g.loose[1]);
      ctx.fillStyle = HAY[0]; ell(ctx, -18, -1.2, 12, 2.2); ell(ctx, 22, -1, 9, 1.8);
      ctx.fillStyle = '#eadcc0'; ctx.save(); ctx.translate(40, -3.6); ctx.rotate(0.5); ell(ctx, 0, 0, 3.4, 2.4); ctx.restore();
    }
    ctx.fillStyle = '#5e4632'; ctx.fillRect(70, -34, 4, 34);
    ctx.fillStyle = '#7a5a3f'; ctx.fillRect(64, -37, 16, 3.4);
    ctx.fillStyle = '#efe1df'; rr(ctx, 66, -45, 12, 8.4, 1.6);
    ctx.fillStyle = 'rgba(190,150,150,0.5)'; ctx.fillRect(66, -40, 12, 3); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(67, -44, 10, 1.2);
    snowCap(ctx, 65, 79, -45, 2.6, 27 + sd);
    bullfinch(ctx, -30, -147.6, 1, time, sd, false);
    if (!eaten) bullfinch(ctx, 20, -37.2, -1, time + 3, sd + 0.3, true);
    else bullfinch(ctx, -6, -1.5, 1, time + 3, sd + 0.3, true);
    ctx.restore();
  }
  const BULBS = ['#ffd27a', '#ffe9b0', '#ff7a5c', '#ffd27a', '#9be07a', '#ffe9b0'];
  function lights(ctx, pts, time, sd, beat) {
    const n = pts.length / 2, ga = ctx.globalAlpha;
    ctx.strokeStyle = '#2b2a26'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = pts[i * 2], y = pts[i * 2 + 1]; if (i) ctx.quadraticCurveTo((pts[i * 2 - 2] + x) / 2, (pts[i * 2 - 1] + y) / 2 + 2.2, x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const x = pts[i * 2], y = pts[i * 2 + 1] + 1.4, col = BULBS[(i + Math.floor(sd * 6)) % BULBS.length];
      const tw = beat === undefined ? 0.72 + 0.28 * sin(time * (1.6 + hash(i + sd) * 1.8) + i * 2.1) : 0.45 + 0.55 * Math.pow(0.5 + 0.5 * cos(TAU * (beat - i / 6)), 3);
      ctx.fillStyle = rgba('255,214,140', 0.22 * tw); circle(ctx, x, y + 1, 4.2);
      ctx.fillStyle = col; ctx.globalAlpha = ga * (0.55 + 0.45 * tw); ell(ctx, x, y + 1.2, 1.5, 2); ctx.globalAlpha = ga;
    }
  }
  function steam(ctx, x, y, time, sd, k, a) {
    for (let i = 0; i < 5; i++) {
      const u = frac(time * 0.42 + i / 5 + sd), al = a * sstep(0, 0.15, u) * (1 - sstep(0.45, 1, u));
      ctx.fillStyle = rgba('248,250,252', al);
      circle(ctx, x + (sin(u * 7 + sd * 5 + i) * 3 + u * 6) * k, y - u * 34 * k, (2.2 + u * 6) * k);
    }
  }
  function folk(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#c63a2f'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, -1, -6, -9, 0, -4); ctx.bezierCurveTo(6, -9, 9, -1, 0, 6); ctx.fill();
    ctx.fillStyle = '#f4e3b0'; circle(ctx, 0, -1, 1.5);
    ctx.fillStyle = '#3f7a3c'; ell(ctx, -8, 3, 3.4, 1.4, -0.6); ell(ctx, 8, 3, 3.4, 1.4, 0.6);
    ctx.fillStyle = '#e8b22a'; ell(ctx, -11, -2, 2, 2.8, -0.5); ell(ctx, 11, -2, 2, 2.8, 0.5);
    ctx.restore();
  }
  function mug(ctx, x, y, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(3.8, -4.2, 2.2, -1.3, 1.3); ctx.stroke();
    ctx.fillStyle = col; rr(ctx, -3.6, -8.6, 7.4, 8.6, 1.4);
    ctx.fillStyle = col === '#f3ece0' ? '#c0392b' : '#f3ece0'; circle(ctx, 0.1, -4.4, 1.3);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-2.8, -8, 1.2, 7);
    ctx.restore();
  }
  function ostiepok(ctx, x, y, rx, ry, col) {
    ctx.fillStyle = col; ell(ctx, x, y, rx, ry);
    ctx.fillStyle = 'rgba(70,35,8,0.32)';
    for (let r = -2; r <= 2; r++) for (let c = -1; c <= 1; c++) if (abs(c) + abs(r) < 3) circle(ctx, x + c * rx * 0.45 + (r % 2 ? rx * 0.22 : 0), y + r * ry * 0.32, 0.5);
    ctx.fillStyle = 'rgba(255,220,150,0.35)'; ell(ctx, x - rx * 0.38, y - ry * 0.25, rx * 0.25, ry * 0.4);
  }
  const BRAID = [['#d9a85a', '#bd9049'], ['#e7d6a8', '#cdbd92']];
  function braid(ctx, x0, y0, len, a, c) {
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
    for (let i = 0, n = 0; i < len; i += 2.2, n++) { ctx.fillStyle = BRAID[c][n % 2]; ell(ctx, i, 0.6 * sin(i * 1.4), 1.6, 1.15, 0.5); }
    ctx.restore();
  }
  function stallGoods(ctx, kind, ek, time, sd) {
    const tip = sstep(0, 1, ek);
    if (kind === 'punch') {
      if (ek < 1) steam(ctx, -17, -72, time, sd, 1 - 0.6 * tip, 0.6 * (1 - tip));
      ctx.fillStyle = '#26292d'; rr(ctx, -30, -53.5, 26, 4.5, 1.2);
      ctx.fillStyle = rgba('90,150,255', 0.75 * (0.6 + 0.4 * sin(time * 17 + sd))); ell(ctx, -17, -53.6, 9, 1.2);
      ctx.save(); ctx.translate(-4, -53.5); ctx.rotate(-tip * 1.45); ctx.translate(4 - 17, 0);
      ctx.fillStyle = '#b8322a'; rr(ctx, -12, -18, 24, 18, 3);
      ctx.fillStyle = '#d34a3d'; ctx.fillRect(-12, -16, 24, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (const p of [[-7, -8], [-1, -12], [5, -6], [8, -13], [-9, -14], [2, -3]]) circle(ctx, p[0], p[1], 1.3);
      ctx.fillStyle = '#e9e6df'; rr(ctx, -13.5, -20, 27, 3, 1.4);
      ctx.fillStyle = '#5a1f1a'; ell(ctx, 0, -18.6, 11.6, 1.4);
      ctx.fillStyle = '#8a8f94'; rr(ctx, -16.5, -15, 3.4, 2.6, 1); rr(ctx, 13, -15, 3.4, 2.6, 1);
      line(ctx, 4, -18, 9, -30, 1.4, '#9aa1a7'); ctx.fillStyle = '#9aa1a7'; circle(ctx, 9.4, -30.6, 1.3);
      ctx.restore();
      mug(ctx, 8 + 4 * tip, -49, '#c0392b', 1.57 * tip); mug(ctx, 18, -49, '#f3ece0'); mug(ctx, 28, -49, '#c0392b', -0.3 * tip);
      if (ek <= 0) mug(ctx, 38, -49, '#f3ece0');
      ctx.fillStyle = '#f0a03a'; ell(ctx, 47, -50.4, 3, 1.4); ctx.fillStyle = '#ffd08a'; ell(ctx, 47, -50.8, 2, 0.8);
    } else if (kind === 'cheese') {
      const fade = 1 - sstep(0, 0.45, ek), ga = ctx.globalAlpha;
      ctx.fillStyle = '#a77a4c'; rr(ctx, -44, -52.4, 36, 2.6, 1.2);
      ctx.globalAlpha = ga * fade;
      for (const [x, h] of [[-37, 11], [-23.5, 9]]) {
        ctx.fillStyle = '#d9c7a2'; rr(ctx, x - 6, -52 - h, 12, h, 1.6);
        ctx.fillStyle = 'rgba(120,90,50,0.35)'; for (let i = -4; i < 6; i += 3) ctx.fillRect(x + i - 0.4, -52 - h, 0.8, h);
        ctx.fillStyle = '#8a6a40'; ctx.fillRect(x - 6, -52 - h * 0.72, 12, 1.1); ctx.fillRect(x - 6, -52 - h * 0.25, 12, 1.1);
        ctx.fillStyle = '#fbf8f0'; blob(ctx, [x - 6, -51.6 - h, x - 3, -55 - h, x + 1, -56.4 - h, x + 5, -54 - h, x + 6, -51.6 - h]);
        ctx.fillStyle = 'rgba(210,214,220,0.6)'; ell(ctx, x + 1.4, -53 - h, 2.4, 0.8);
      }
      ctx.fillStyle = '#c8ccd2'; poly(ctx, [-17, -53.6, -9, -53.6, -10, -52.6, -17, -52.6]); ctx.fillStyle = '#5a3a22'; rr(ctx, -22, -54, 5.4, 1.8, 0.8);
      ctx.fillStyle = '#e9e6df'; ell(ctx, 22, -50, 16, 2.4);
      for (let i = 0; i < 5; i++) braid(ctx, 9 + i * 1.4, -51.5 - i * 1.8, 24 - i * 2, -0.06 + i * 0.03, i % 2);
      ctx.globalAlpha = ga;
      ctx.save(); ctx.translate(44, -52.4); ctx.rotate(1.3 * tip);
      ostiepok(ctx, 0, -5, 4.6, 6.2, '#b8742c');
      ctx.restore();
      if (fade < 1) { ctx.fillStyle = rgba('250,248,240', 1 - fade); ell(ctx, -30, -52.6, 10, 1.4); ell(ctx, 16, -51, 3, 0.8); }
    } else if (kind === 'lokse') {
      ctx.fillStyle = '#3a3d41'; ctx.fillRect(-34, -54, 2.4, 5); ctx.fillRect(-12, -54, 2.4, 5);
      ctx.fillStyle = '#1f2125'; ell(ctx, -22, -55, 16, 3.4);
      ctx.fillStyle = 'rgba(255,120,60,0.18)'; ell(ctx, -22, -55.6, 14, 2.4);
      const fade = 1 - sstep(0, 0.45, ek), ga = ctx.globalAlpha;
      if (fade > 0) {
        ctx.globalAlpha = ga * fade;
        ctx.fillStyle = '#f1dfae'; ell(ctx, -22, -56.6, 11, 2.4);
        ctx.fillStyle = '#9a6a30'; for (const p of [[-28, -56.8], [-20, -57.4], [-16, -56.4], [-24, -55.8]]) ell(ctx, p[0], p[1], 1.4, 0.5);
        ctx.globalAlpha = ga;
        steam(ctx, -22, -60, time + 1, sd + 0.3, 0.6, 0.45 * fade);
      }
      ctx.fillStyle = '#e9e6df'; ell(ctx, 16, -50, 15, 2.4);
      if (fade < 1) { ctx.fillStyle = rgba('226,201,143', 1 - fade); ell(ctx, 10, -51, 2, 0.8); ell(ctx, 21, -51.2, 1.5, 0.6); }
      if (fade > 0) {
        ctx.globalAlpha = ga * fade;
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#e8d29c' : '#f1dfae'; ctx.beginPath(); ctx.ellipse(16 + (i - 1.5) * 2, -51.5 - i * 3.1, 12, 4.4, 0, PI, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(150,100,40,0.5)'; ell(ctx, 12 + i * 3, -53 - i * 3.1, 1.3, 0.5);
        }
        ctx.globalAlpha = ga;
      }
      ctx.save(); ctx.translate(41, -49.5); ctx.rotate(1.57 * tip);
      ctx.fillStyle = '#4a1f3d'; rr(ctx, -8, -9.5, 8, 10, 1.6); ctx.fillStyle = '#f4efe2'; rr(ctx, -8.5, -11.5, 9, 3, 1); ctx.restore();
      if (tip > 0.02) { ctx.fillStyle = 'rgba(74,31,61,0.85)'; ell(ctx, 48, -49.5, 7 * tip, 1.2 * tip); }
      if (ek <= 0) { ctx.fillStyle = '#efe9da'; rr(ctx, 43, -57, 8, 8, 1.6); ctx.fillStyle = '#c0392b'; rr(ctx, 42.5, -59, 9, 3, 1); }
      line(ctx, 2, -51, 10, -57, 1.2, '#7b5a3c');
    } else {
      const glow = 0.55 + 0.25 * sin(time * 6.3 + sd) * sin(time * 2.9);
      ctx.fillStyle = '#2b2e33'; ctx.fillRect(-38, -60, 40, 9); ctx.fillRect(-36, -51, 2.4, 3); ctx.fillRect(-2.4, -51, 2.4, 3);
      ctx.fillStyle = rgba('255,110,40', glow * 0.8); ctx.fillRect(-36, -60, 36, 3);
      ctx.strokeStyle = '#8b9096'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let x = -37; x <= 1; x += 3.2) { ctx.moveTo(x, -61); ctx.lineTo(x, -59.5); }
      ctx.moveTo(-38, -60.8); ctx.lineTo(2, -60.8); ctx.stroke();
      const fade = 1 - sstep(0, 0.45, ek), ga = ctx.globalAlpha;
      if (fade > 0) {
        ctx.globalAlpha = ga * fade;
        for (let i = 0; i < 4; i++) {
          const x = -32 + i * 9, r = 0.06 * sin(time * 1.1 + i * 2);
          ctx.save(); ctx.translate(x, -63.4); ctx.rotate(r);
          ctx.fillStyle = '#9c3b26'; rr(ctx, -3.8, -2.4, 7.6, 4.8, 2.4);
          ctx.fillStyle = '#c4573a'; rr(ctx, -3.2, -2.2, 6.4, 2, 1);
          ctx.fillStyle = 'rgba(40,15,8,0.6)'; ctx.fillRect(-1.6, -2.3, 0.8, 4.6); ctx.fillRect(1.2, -2.3, 0.8, 4.6);
          ctx.restore();
        }
        ctx.globalAlpha = ga;
        for (let i = 0; i < 5; i++) {
          const u = frac(time * 1.7 + i / 5 + sd), al = (1 - u) * sstep(0, 0.1, u) * fade;
          ctx.fillStyle = rgba('255,190,90', al); circle(ctx, -34 + hash(i * 3.1) * 32 + sin(u * 9 + i) * 2, -64 - u * 10, 0.7);
        }
      }
      ctx.save(); ctx.translate(12, -49); ctx.rotate(-1.57 * tip);
      ctx.fillStyle = '#f2d04a'; rr(ctx, 0, -10, 7, 10, 2); ctx.fillStyle = '#d9473a'; rr(ctx, 0.5, -12.5, 6, 3, 1); ctx.restore();
      if (tip > 0.02) { ctx.fillStyle = 'rgba(242,208,74,0.9)'; ell(ctx, 24, -49.6, 9 * tip, 1.2 * tip); }
      if (ek <= 0) {
        ctx.fillStyle = '#e9e6df'; ell(ctx, 34, -50, 13, 2.2);
        ctx.fillStyle = '#c99a5b'; for (let i = 0; i < 3; i++) { rr(ctx, 25 + i * 6, -56 - (i % 2), 8, 6, 2.4); }
        ctx.fillStyle = '#e8c88f'; for (let i = 0; i < 3; i++) ctx.fillRect(26.4 + i * 6, -54.6 - (i % 2), 5.2, 3);
      }
      smoke(ctx, -20, -66, time, sd, lerp(0.75, 0.4, sstep(0, 1, ek)));
    }
  }
  const FALL = { x: 0, y: 0 };
  function fall(x0, y0, x1, y1, ek) {
    const k = clamp(ek * 1.25, 0, 1);
    FALL.x = lerp(x0, x1, k); FALL.y = lerp(y0, y1, k * k) - 9 * sin(PI * k) * (1 - k);
    return k;
  }
  function stallFront(ctx, kind, ek, sd) {
    const tip = sstep(0, 1, ek), drip = sstep(0.3, 1, ek);
    if (kind === 'punch') {
      ctx.fillStyle = 'rgba(122,42,30,0.92)';
      for (const d of [[-49, 11], [-43, 17], [-36, 7], [-29, 4]]) { const l = d[1] * drip; if (l > 0.5) { rr(ctx, d[0] - 1.1, -45.6, 2.2, l, 1.1); circle(ctx, d[0], -45 + l, 1.5); } }
      ctx.fillStyle = 'rgba(140,40,30,0.5)'; ell(ctx, -42, 0.8, 18 * tip, 2.4 * tip);
      const k = fall(38, -49, 64, -1.2, ek); mug(ctx, FALL.x, FALL.y, '#f3ece0', 2.6 * k);
    } else if (kind === 'cheese') {
      const k = fall(-37, -52, -64, -1.2, ek);
      ctx.save(); ctx.translate(FALL.x, FALL.y); ctx.rotate(-1.6 * k);
      ctx.fillStyle = '#d9c7a2'; rr(ctx, -6, -11, 12, 11, 1.6); ctx.fillStyle = '#8a6a40'; ctx.fillRect(-6, -8, 12, 1.1); ctx.fillRect(-6, -3, 12, 1.1);
      ctx.restore();
      ctx.fillStyle = 'rgba(251,248,240,0.95)'; ell(ctx, -58, 0.6, 12 * tip, 2.2 * tip); rr(ctx, -53, -45.6, 3, 7 * drip, 1.4);
    } else if (kind === 'lokse') {
      ctx.fillStyle = 'rgba(74,31,61,0.88)'; rr(ctx, 51.4, -45.6, 2.2, 8 * drip, 1.1);
      const k = fall(47, -49, 66, -4, ek);
      ctx.save(); ctx.translate(FALL.x, FALL.y); ctx.rotate(1.9 * k); ctx.fillStyle = '#efe9da'; rr(ctx, -4, -8, 8, 8, 1.6); ctx.fillStyle = '#c0392b'; rr(ctx, -4.5, -10, 9, 3, 1); ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(242,208,74,0.92)'; rr(ctx, 33, -45.6, 2.2, 6 * drip, 1.1);
      const k = fall(34, -50, 66, -1.2, ek);
      ctx.save(); ctx.translate(FALL.x, FALL.y); ctx.rotate(0.3 * k); ctx.fillStyle = '#e9e6df'; ell(ctx, 0, 0, 12, 2);
      ctx.fillStyle = '#c99a5b'; rr(ctx, -6, -5, 8, 5, 2.2); ctx.restore();
      const k2 = fall(-20, -63, -56, -2, ek);
      ctx.save(); ctx.translate(FALL.x, FALL.y); ctx.rotate(-0.4 - 2 * k2); ctx.fillStyle = '#a5492e'; rr(ctx, -2.4, -1.2, 4.8, 2.4, 1.2); ctx.restore();
    }
  }
  function smoke(ctx, x, y, time, seed, k) {
    for (let i = 0; i < 6; i++) {
      const u = frac(time * 0.2 + i / 6 + seed * 0.1);
      const a = 0.42 * sstep(0, 0.12, u) * (1 - sstep(0.45, 1, u));
      ctx.fillStyle = rgba('214,218,222', a);
      circle(ctx, x + (sin(u * 6.6 + seed) * 5 + u * 18) * k, y - u * 64 * k, (3 + u * 9) * k);
    }
  }

  let stallG = null;
  function stallGeo() {
    if (stallG) return stallG;
    const g = stallG = { boards: new Path2D(), roof: new Path2D(), roofHi: new Path2D() };
    for (let x = -54; x < 56; x += 7.4) { g.boards.moveTo(x, -44); g.boards.lineTo(x, 0); }
    for (let y = -116; y > -150; y -= 5.6) { const hw = 68 * (y + 152) / 38; g.roof.moveTo(-hw, y); g.roof.lineTo(hw, y); }
    return g;
  }

  const VENDOR = { punch: 'seller', lokse: 'nana', sausage: 'cook', cheese: 'shepherd' };
  const OPEN = [-52, -114, 104, 64];
  const SEAT = { look: '', x: 0, y: -52, face: -1, up: 1, stand: 0, act: 'idle', k: 0, kind: 'local', seed: 0, scale: 1.04, clip: OPEN };
  function vendorOf(gm, s) {
    const k = gm && gm.vendors;
    return k ? k.list.find((v) => v.s === s) || null : null;
  }
  function vendorPose(v, s, gm, time) {
    const o = SEAT, b = gm && gm.bear;
    o.look = VENDOR[s.kind] || 'seller'; o.x = s.kind === 'cheese' ? 2 : -6; o.seed = s.x; o.up = 1; o.act = 'idle'; o.k = 0;
    o.face = b ? Math.sign(b.x - s.x - o.x) || -1 : -1;
    if (!v) return s.shut ? null : o;
    const t = v.t;
    if (v.spot !== undefined && v.mode !== 'calm') {
      o.x = lerp(o.x, v.spot, v.mode === 'wait' ? sstep(0, 0.3, t) : 1);
      o.face = v.face;
    }
    if (v.mode === 'shut' || (s.shut && v.mode !== 'duck')) return null;
    if (v.mode === 'pour') {
      if (t < 0.6) { o.act = 'pour'; o.k = t / 0.6; } else if (t < 1) { o.act = 'offer'; o.k = (t - 0.6) / 0.4; } else o.act = 'wave';
    } else if (v.mode === 'duck') {
      o.act = 'alarm'; o.up = 1 - sstep(0.35, 0.75, t);
    } else if (v.mode === 'hid') {
      o.act = 'alarm'; o.up = 1 - sstep(0.1, 0.5, t);
    } else if (v.mode === 'done') o.act = s.eaten ? 'alarm' : 'idle';
    return o.up > 0.001 ? o : null;
  }
  function shutterK(v, s) {
    if (v && v.mode === 'duck') return sstep(0.5, ZS.sim.vendors.DUCK.shut, v.t);
    return s.shut ? 1 : 0;
  }
  function shutter(ctx, k) {
    if (k <= 0) return;
    const y1 = lerp(-114, -50, k);
    ctx.fillStyle = '#7a5134'; ctx.fillRect(-52, -114, 104, y1 + 114);
    ctx.fillStyle = 'rgba(40,20,8,0.35)'; for (let y = y1 - 5.4; y > -114; y -= 5.4) ctx.fillRect(-52, y, 104, 1.1);
    ctx.fillStyle = 'rgba(255,225,180,0.12)'; for (let y = y1 - 4.2; y > -114; y -= 5.4) ctx.fillRect(-52, y, 104, 0.8);
    ctx.fillStyle = '#4a3020'; rr(ctx, -53, y1 - 3.6, 106, 3.6, 1.2);
    ctx.fillStyle = '#b8b2a6'; rr(ctx, -4, y1 - 2.8, 8, 2, 1);
  }
  function hanging(ctx, kind, time) {
    if (kind === 'punch') {
      const cols = ['#5a1f2a', '#2f4a2a', '#6b3a1a', '#3a2a5a', '#5a1f2a', '#6b3a1a'];
      for (let i = 0; i < 6; i++) { const x = -44 + i * 16 + (i > 2 ? 10 : 0); ctx.fillStyle = cols[i]; rr(ctx, x, -98, 6, 14, 1.4); ctx.fillRect(x + 2, -102, 2, 4); ctx.fillStyle = 'rgba(255,230,180,0.35)'; ctx.fillRect(x + 1, -96, 1.2, 9); }
    } else if (kind === 'lokse') {
      for (let i = 0; i < 7; i++) { const x = -44 + i * 13 + (i > 3 ? 8 : 0); ctx.fillStyle = i % 2 ? '#4a1f3d' : '#d9b85a'; rr(ctx, x, -93, 8, 9, 1.6); ctx.fillStyle = '#f2ead6'; ctx.fillRect(x - 0.5, -95, 9, 2.4); }
    } else if (kind === 'cheese') {
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-50, -89); ctx.lineTo(-14, -89); ctx.moveTo(16, -89); ctx.lineTo(50, -89); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const x = i < 3 ? -44 + i * 12 : 22 + (i - 3) * 12, sw = 0.07 * sin(time * 1.2 + i * 1.7);
        ctx.save(); ctx.translate(x, -89); ctx.rotate(sw);
        line(ctx, 0, 0, 0, 3, 0.7, '#3a2a1a');
        if (i % 3 === 1) {
          for (let j = 0; j < 3; j++) braid(ctx, -1.6 + j * 1.6, 2, 11 + j * 2, 1.57 - 0.05 + j * 0.05, j % 2);
        } else {
          const big = i % 3 === 0, rx = big ? 3.6 : 3, ry = big ? 5.6 : 4.8;
          ostiepok(ctx, 0, 3 + ry, rx, ry, big ? '#a8662a' : '#c08038');
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-1.2, 2.4, 2.4, 1.2);
        }
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-48, -106); ctx.lineTo(48, -106); ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const x = -42 + i * 10.5 + (i > 4 ? 6 : 0), sw = 0.08 * sin(time * 1.4 + i);
        ctx.save(); ctx.translate(x, -106); ctx.rotate(sw); ctx.fillStyle = i % 3 ? '#8e3a24' : '#a24a2c'; rr(ctx, -2, 0, 4, 15 + (i % 2) * 4, 2); ctx.restore();
      }
    }
  }
  function stall(ctx, s, time, gm) {
    const summer = !!s.salas;
    if (!summer) tint(gm);
    const g = stallGeo(), sd = hash(s.x * 0.0123), eaten = !!s.eaten, dt = flip(s, time, eaten), ek = eaten ? sstep(0, 0.45, dt) : 0;
    const kind = s.kind === 'lokse' || s.kind === 'sausage' || s.kind === 'cheese' ? s.kind : 'punch';
    const label = (ZS.LABELS.stallSigns && ZS.LABELS.stallSigns[kind]) || '';
    const v = vendorOf(gm, s), seat = vendorPose(v, s, gm, time), sk = shutterK(v, s);
    ctx.save(); ctx.translate(s.x, GY);
    if (summer) ctx.scale(0.9, 0.9);
    ctx.fillStyle = summer ? 'rgba(40,52,20,0.18)' : 'rgba(70,92,125,0.16)'; ell(ctx, 0, 1.2, 74, 4.4);
    ctx.fillStyle = '#3a2416'; ctx.fillRect(-52, -114, 104, 70);
    const lamp = 0.85 + 0.1 * sin(time * 2.3 + sd * 4);
    const gl = ctx.createRadialGradient(0, -98, 2, 0, -90, 52);
    gl.addColorStop(0, rgba('255,206,130', 0.42 * lamp)); gl.addColorStop(0.5, rgba('255,170,90', 0.14 * lamp)); gl.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = gl; ctx.fillRect(-52, -114, 104, 70);
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(-50, -84, 100, 3);
    hanging(ctx, kind, time);
    ctx.fillStyle = '#ffe2a0'; circle(ctx, 0, -100, 2.6);
    line(ctx, 0, -114, 0, -102, 0.8, '#2a2a2a');
    ctx.fillStyle = rgba('255,230,160', 0.5 * lamp); circle(ctx, 0, -100, 5);
    if (seat) ZS.drawGuestBust(ctx, seat, time);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#7d5232'; ctx.fillRect(sx * 55 - 3.5, -116, 7, 116);
      ctx.fillStyle = 'rgba(255,225,180,0.16)'; ctx.fillRect(sx * 55 - 3.5, -116, 1.6, 116);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(sx * 55 + 1.5, -116, 2, 116);
    }
    stallGoods(ctx, kind, ek, time, sd);
    shutter(ctx, sk);
    ctx.save();
    ctx.fillStyle = '#93623a'; ctx.fillRect(-56, -46, 112, 46);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(50,25,10,0.35)'; ctx.stroke(g.boards);
    ctx.fillStyle = 'rgba(255,225,180,0.1)'; ctx.fillRect(-56, -46, 112, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-56, -8, 112, 8);
    folk(ctx, 0, -24, 1.25);
    ctx.translate(-61, -47); ctx.rotate(0.03 * sstep(0, 1, ek)); ctx.translate(61, 47);
    ctx.fillStyle = '#ad7845'; rr(ctx, -61, -50, 122, 5.5, 1.6);
    ctx.fillStyle = 'rgba(255,235,200,0.3)'; ctx.fillRect(-60, -50, 120, 1.2);
    if (!eaten && !summer) { snowCap(ctx, -61, -46, -50, 2.4, 31 + sd); snowCap(ctx, 46, 61, -50, 2.2, 33 + sd); }
    ctx.restore();
    if (ek > 0) stallFront(ctx, kind, ek, sd);
    if (!summer) for (const sx of [-1, 1]) { ctx.fillStyle = SNOW; blob(ctx, [sx * 55 - 11, 1, sx * 55 - 5, -4, sx * 55 + 4, -5, sx * 55 + 11, 1]); }
    if (!summer) {
      const gsw = sin(time * 1.1 + sd * 5) * 0.6;
      ctx.lineCap = 'round';
      const tk = sstep(0, 1, ek), ex = lerp(54, 26 + gsw * 2, tk), ey = lerp(-94, -64, tk), cx2 = lerp(27, 12, tk), cy2 = lerp(-84 - gsw, -70, tk);
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#3f7a3c' : '#24502a'; ctx.lineWidth = pass ? 3.2 : 5.2;
        ctx.beginPath(); ctx.moveTo(-54, -94);
        ctx.quadraticCurveTo(-27, -84 + gsw, 0, -94); ctx.quadraticCurveTo(cx2, cy2, ex, ey);
        ctx.stroke();
      }
      ctx.fillStyle = '#2f6a34';
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, q = t < 0.5 ? t * 2 : t * 2 - 1, u = 1 - q;
        const x = t < 0.5 ? u * u * -54 + 2 * u * q * -27 : 2 * u * q * cx2 + q * q * ex;
        const y = t < 0.5 ? u * u * -94 + 2 * u * q * (-84 + gsw) + q * q * -94 : u * u * -94 + 2 * u * q * cy2 + q * q * ey;
        ell(ctx, x, y, 2.6, 1.2, (hash(i + sd) - 0.5) * 2);
      }
      for (const bx of eaten ? [-54, 0] : [-54, 0, 54]) {
        ctx.fillStyle = '#c42b2b'; poly(ctx, [bx, -95, bx - 4.5, -98, bx - 4.5, -92]); poly(ctx, [bx, -95, bx + 4.5, -98, bx + 4.5, -92]);
        ctx.fillStyle = '#e04040'; circle(ctx, bx, -95, 1.6);
        ctx.fillStyle = '#c42b2b'; poly(ctx, [bx - 0.8, -94, bx - 3, -88, bx - 1, -88.6]); poly(ctx, [bx + 0.8, -94, bx + 3, -88, bx + 1, -88.6]);
      }
      for (const [bx, by, col] of [[-27, -87, '#e8b22a'], [27, -87, '#c42b2b'], [-40, -90, '#c42b2b'], [40, -90, '#e8b22a']]) {
        const sw = sin(time * 1.6 + bx) * 0.5;
        line(ctx, bx, by, bx + sw, by + 3, 0.6, '#555');
        ctx.fillStyle = col; circle(ctx, bx + sw, by + 5, 2.4); ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(ctx, bx + sw - 0.8, by + 4.2, 0.8);
      }
    }
    ctx.fillStyle = '#5d3b22'; rr(ctx, -46, -114, 92, 19, 2.4);
    ctx.fillStyle = summer ? '#2f5a34' : '#7a2a22'; rr(ctx, -43.5, -111.5, 87, 14, 1.6);
    ctx.strokeStyle = '#e8c27a'; ctx.lineWidth = 0.8; ctx.strokeRect(-41.5, -109.5, 83, 10);
    if (label) {
      const fs = fitText(ctx, label, 10.5, 900, 64);
      txt(ctx, label, 0, -104, fs, '#fff1cf', 900, 0.6);
    }
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#e8c27a'; ctx.save(); ctx.translate(sx * 37.5, -104.5); ctx.rotate(time * 0.5 * sx);
      poly(ctx, [0, -3.4, 0.9, -0.9, 3.4, 0, 0.9, 0.9, 0, 3.4, -0.9, 0.9, -3.4, 0, -0.9, -0.9]); ctx.restore();
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-68, -114); ctx.lineTo(0, -152); ctx.lineTo(68, -114); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#5b3b26'; ctx.fillRect(-70, -153, 140, 40);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(30,15,5,0.35)'; ctx.stroke(g.roof);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; poly(ctx, [0, -152, 68, -114, 0, -114]);
    ctx.restore();
    ctx.fillStyle = '#3e2818'; ctx.fillRect(-70, -116, 140, 3.4);
    if (summer) {
      for (const sx of [-1, 1]) {
        ctx.fillStyle = '#4a2f1d'; poly(ctx, [0, -156, sx * 74, -113, sx * 74, -108, 0, -150]);
        ctx.fillStyle = 'rgba(255,225,180,0.14)'; poly(ctx, [0, -156, sx * 74, -113, sx * 74, -111.6, 0, -154.4]);
      }
      ctx.fillStyle = '#3a2416'; poly(ctx, [-3, -150, 0, -162, 3, -150]);
      ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -164); ctx.lineTo(8, -150); ctx.moveTo(8, -164); ctx.lineTo(-8, -150); ctx.stroke();
      ctx.restore();
      return;
    }
    const cap = [-75, -112, -70, -117, -36, -138, 0, -158.5, 36, -138, 70, -117, 75, -112, 64, -114, 30, -132, 0, -147, -30, -132, -64, -114];
    ctx.save(); ctx.translate(0.8, 2.6); ctx.fillStyle = SNOW_DK; blob(ctx, cap); ctx.restore();
    ctx.fillStyle = SNOW; blob(ctx, cap);
    ctx.fillStyle = SNOW_FACE; poly(ctx, [2, -157, 36, -138.5, 70, -117, 75, -112, 64, -114, 30, -132, 2, -147]);
    ctx.fillStyle = 'rgba(200,228,245,0.9)';
    for (let i = 0; i < 7; i++) { const ix = -62 + i * 20.6 + hash(i * 2.7 + sd) * 4, il = (2.4 + hash(i * 4.1 + sd) * 5) * ICE_K; poly(ctx, [ix - 1.2, -113, ix + 1.2, -113, ix, -113 + il]); }
    const lp = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; lp.push(lerp(-66, 0, t), lerp(-116, -150, t) + 1.5); }
    for (let i = 1; i <= 8; i++) { const t = i / 8; lp.push(lerp(0, 66, t), lerp(-150, -116, t) + 1.5); }
    lights(ctx, lp, time, sd);
    ctx.restore();
  }

  const SM = { snow: '#f4f7fa', shade: '#c4d3e2', coal: '#1f2024' };
  function ball(ctx, x, y, rx, ry) {
    ctx.fillStyle = SM.shade; ell(ctx, x, y, rx, ry);
    ctx.fillStyle = SM.snow; ell(ctx, x - rx * 0.12, y - ry * 0.14, rx * 0.86, ry * 0.84);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ell(ctx, x - rx * 0.38, y - ry * 0.45, rx * 0.26, ry * 0.16, -0.5);
  }

  function snowman(ctx, s, time, g) {
    tint(g);
    const sd = hash(s.x * 0.0171), lost = s.nose === false, dt = flip(s, time, lost), k = lost ? sstep(0, 0.3, dt) : 0;
    const hop = lost ? sin(PI * clamp(dt / 0.42, 0, 1)) * 9 : 0, shake = lost ? sin(dt * 26) * exp(-dt * 4) * 0.08 : 0;
    const wind = sin(time * 1.2 + sd * 5) * 0.5 + sin(time * 2.9 + sd) * 0.25;
    ctx.save(); ctx.translate(s.x, GY);
    ctx.fillStyle = 'rgba(70,92,125,0.18)'; ell(ctx, 1, 1, 28, 3.6);
    ctx.save(); ctx.translate(-30, 0); ctx.rotate(-0.12 + wind * 0.01);
    line(ctx, 0, 0, 0, -84, 2.2, '#8a6038'); line(ctx, -0.6, 0, -0.6, -84, 0.7, 'rgba(255,230,190,0.35)');
    ctx.fillStyle = '#c99b45'; poly(ctx, [-2, -82, 2, -82, 7, -104, 3, -106, 0, -100, -3, -106, -7, -104]);
    ctx.strokeStyle = '#a77d32'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 0.6, -83); ctx.lineTo(i * 1.8, -104); }
    ctx.stroke();
    ctx.fillStyle = '#b5382c'; ctx.fillRect(-2.6, -86, 5.2, 2.4);
    ctx.restore();
    ball(ctx, 0, -19.5, 22, 20);
    ctx.fillStyle = SM.snow; blob(ctx, [-26, 1, -18, -4, 0, -5, 18, -4, 26, 1]);
    ctx.save(); ctx.translate(0, -36); ctx.rotate(shake * 0.4); ctx.translate(0, 36);
    const arm = (sx, ax, ay, bx, by, sw) => {
      ctx.save(); ctx.translate(sx * 12, -52); ctx.rotate(sw);
      ctx.lineCap = 'round'; ctx.strokeStyle = '#5a3d27'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(ax, ay); ctx.lineTo(bx, by);
      ctx.moveTo(ax * 0.62, ay * 0.62); ctx.lineTo(ax * 0.62 + sx * 4, ay * 0.62 - 6);
      ctx.moveTo(ax, ay); ctx.lineTo(ax + sx * 6, ay + 2);
      ctx.stroke();
      ctx.restore();
    };
    arm(-1, -14, -8, -19, -18, -0.05 + wind * 0.04 + 0.25 * k);
    arm(1, 14, -9, 22, -15, 0.04 - wind * 0.03 - 0.35 * k);
    ball(ctx, 0, -50, 15.5, 15);
    ctx.fillStyle = SM.coal;
    for (const by of [-58, -50, -42]) { circle(ctx, 1.2, by, 1.8); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (const by of [-58, -50, -42]) circle(ctx, 0.6, by - 0.6, 0.6);
    ctx.save(); ctx.translate(0, -66); ctx.rotate(shake);
    ctx.fillStyle = '#b92f2f'; rr(ctx, -12, -2.6, 24, 6, 3);
    ctx.fillStyle = '#f2ece4'; ctx.fillRect(-6, -2.4, 2.4, 5.6); ctx.fillRect(3, -2.4, 2.4, 5.6);
    ctx.restore();
    ctx.save(); ctx.translate(0, -76); ctx.rotate(shake * 1.5);
    ball(ctx, 0, 0, 11.5, 11);
    const ey = -2.6, er = lerp(1.5, 2.3, k);
    if (k > 0.02) { ctx.fillStyle = rgba('255,255,255', k); circle(ctx, -4, ey, er + 1.1); circle(ctx, 4.4, ey, er + 1.1); }
    ctx.fillStyle = SM.coal; circle(ctx, -4, ey, er); circle(ctx, 4.4, ey, er);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(ctx, -4.5, ey - 0.6, 0.55); circle(ctx, 3.9, ey - 0.6, 0.55);
    if (k > 0.02) {
      const ga = ctx.globalAlpha;
      ctx.globalAlpha = ga * k; ctx.lineCap = 'round';
      line(ctx, -6.4, -7.4 - k, -2, -8.4 - k * 1.6, 1.3, '#4a3424'); line(ctx, 2.2, -8.4 - k * 1.6, 6.8, -7.4 - k, 1.3, '#4a3424');
      ctx.globalAlpha = ga;
    }
    for (let i = 0; i < 5; i++) {
      const t = (i - 2) / 2, mx = lerp(t * 5.4, cos(i * TAU / 5 - PI / 2) * 2.2, k), my = lerp(5.2 + t * t * -1.8 + 1.6, 5.8 + sin(i * TAU / 5 - PI / 2) * 2.2, k);
      ctx.fillStyle = SM.coal; circle(ctx, mx + 0.4, my, 0.95);
    }
    if (!lost) {
      ctx.fillStyle = '#c4581a'; poly(ctx, [0.5, -1.6, 15, 1.4 + wind * 0.2, 0.5, 2]);
      ctx.fillStyle = '#ef7d23'; poly(ctx, [0.5, -1.6, 15, 1.4 + wind * 0.2, 0.8, 0.6]);
      ctx.strokeStyle = 'rgba(120,50,10,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(5, -0.8); ctx.lineTo(5, 1.6); ctx.moveTo(9, 0); ctx.lineTo(9, 1.6); ctx.stroke();
    } else {
      ctx.fillStyle = '#7f93a8'; ell(ctx, 1.2, 0.2, 1.8, 1.5); ctx.fillStyle = '#4f6175'; ell(ctx, 1.4, 0.4, 1.1, 0.9);
    }
    ctx.save();
    ctx.translate(1.5, -9.4 - hop); ctx.rotate(-0.12 * k + 0.05 + shake);
    ctx.fillStyle = '#244a7d'; rr(ctx, -10.5, -13, 21, 13, 2.4);
    ctx.fillStyle = '#2f5f9e'; rr(ctx, -10.5, -13, 21, 9, 2.4);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-8.5, -12, 3, 9);
    ctx.fillStyle = '#e9edf2'; rr(ctx, -12, -1.6, 24, 2.8, 1.2);
    ctx.fillStyle = '#1d3557'; rr(ctx, -14.4, -9, 4, 2.4, 1); rr(ctx, 10.4, -9, 4, 2.4, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(ctx, -3, -7, 1); circle(ctx, 4, -10, 0.9); circle(ctx, 6, -5, 0.9);
    snowCap(ctx, -10.5, 10.5, -13, 2.6, 41 + sd);
    ctx.restore();
    ctx.restore();
    const tail = (x0, len, ph) => {
      const p = [];
      for (let i = 0; i <= 4; i++) { const t = i / 4, w = (sin(time * 4.2 + ph - t * 2.4) * 2.2 + wind * 3) * t; p.push(x0 - t * 3 + w, -64 + t * len); }
      for (let i = 4; i >= 0; i--) { const t = i / 4, w = (sin(time * 4.2 + ph - t * 2.4) * 2.2 + wind * 3) * t; p.push(x0 + 5.6 - t * 3 + w, -64 + t * len); }
      ctx.fillStyle = '#b92f2f'; poly(ctx, p);
      ctx.fillStyle = '#f2ece4';
      for (const t of [0.42, 0.72]) { const w = (sin(time * 4.2 + ph - t * 2.4) * 2.2 + wind * 3) * t; ctx.fillRect(x0 - t * 3 + w, -64 + t * len - 1, 5.6, 2.2); }
      ctx.fillStyle = '#b92f2f';
      const w1 = sin(time * 4.2 + ph - 2.4) * 2.2 + wind * 3;
      for (let i = 0; i < 3; i++) ctx.fillRect(x0 - 3 + w1 + i * 2, -64 + len, 1, 2.6);
    };
    tail(-8, 16, 0); tail(-4, 12, 1.3);
    ctx.fillStyle = '#9b2626'; circle(ctx, -5, -64.6, 3);
    ctx.restore();
    ctx.restore();
  }
  const ICE_T = 9;
  const t2 = (time, i) => time * (0.7 + hash(i) * 0.6) + i * 2.3;
  const bedY = (x, a, b) => { const d = Math.min(x - a, b - x); return GY + ICE_T + Math.min(58, 0.0022 * d * d + 0.3 * d); };
  function reeds(ctx, x, time, sd, s) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const bx = x + s * (i * 3.4 - 6), h = 14 + hash(i * 2.3 + sd) * 12, sw = sin(time * 1.4 + i + sd * 4) * 1.6, tx = bx + s * (i - 2) * 1.6 + sw;
      ctx.strokeStyle = i % 2 ? '#9a7b4a' : '#7d6238'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(bx, -1); ctx.quadraticCurveTo(bx, -h * 0.6, tx, -h); ctx.stroke();
      if (i % 2 === 0) { ctx.fillStyle = '#5b3a22'; ell(ctx, tx, -h - 2.2, 1.6, 3.2, (tx - bx) * 0.05); ctx.fillStyle = SNOW; ell(ctx, tx - 0.4, -h - 4.6, 1.4, 0.9); }
    }
  }

  function ice(ctx, from, to, time, g) {
    tint(g);
    let a = Math.min(from, to), b = Math.max(from, to);
    b = Math.max(b, a + 40);
    const vr = viewRange(ctx, 40);
    if (b + 30 < vr[0] || a - 30 > vr[1]) return;
    const xs = Math.max(a, Math.floor(vr[0] / 6) * 6), xe = Math.min(b, vr[1] + 6), sd = hash(a * 0.017);
    ctx.save();
    const wg = ctx.createLinearGradient(0, GY + ICE_T, 0, GY + 70);
    wg.addColorStop(0, '#2f7898'); wg.addColorStop(0.45, '#1f5876'); wg.addColorStop(1, '#173f58');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(xs, GY + ICE_T);
    for (let x = xs; x <= xe; x += 6) ctx.lineTo(x, bedY(Math.min(x, xe), a, b));
    ctx.lineTo(xe, bedY(xe, a, b)); ctx.lineTo(xe, GY + ICE_T); ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xs, bedY(xs, a, b) + 2);
    for (let x = xs; x <= xe; x += 6) ctx.lineTo(x, bedY(Math.min(x, xe), a, b) + 2);
    ctx.lineTo(xe, bedY(xe, a, b) + 2);
    ctx.strokeStyle = '#4c4339'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#6e6458'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0, n = Math.ceil((b - a) / 26); i < n; i++) {
      const x = a + 10 + hash(i * 3.7 + sd) * (b - a - 20), y = bedY(x, a, b), r = 3 + hash(i * 1.9) * 5;
      if (x < xs - 10 || x > xe + 10 || y < GY + 16) continue;
      ctx.fillStyle = i % 3 ? '#7d7466' : '#8f877a'; ell(ctx, x, y + 1, r, r * 0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ell(ctx, x - r * 0.3, y - r * 0.2, r * 0.4, r * 0.2);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(xs, GY + ICE_T, xe - xs, 80); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0, n = Math.ceil((b - a) / 60); i < n; i++) {
      const x = a + 20 + hash(i * 5.1 + sd) * (b - a - 40), y = bedY(x, a, b);
      if (x < xs - 20 || x > xe + 20 || y < GY + 24) continue;
      for (let k = 0; k < 3; k++) {
        const h = 10 + hash(i + k * 7) * 12, sw = sin(time * 0.9 + i + k) * 3;
        ctx.strokeStyle = k % 2 ? '#2f5a3a' : '#3c6b44'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + k * 3, y); ctx.quadraticCurveTo(x + k * 3 + sw * 0.4, y - h * 0.5, x + k * 3 + sw, y - h); ctx.stroke();
      }
    }
    const fu = frac(time / 14 + sd), fdir = fu < 0.5 ? 1 : -1, fk = fu < 0.5 ? fu * 2 : 2 - fu * 2, fe = fk * fk * (3 - 2 * fk);
    const fxp = lerp(a + 40, b - 40, fe), fyp = GY + 30 + sin(time * 0.7) * 3;
    if (fxp > xs - 30 && fxp < xe + 30 && b - a > 120) {
      const wig = sin(time * 6) * 1.6;
      ctx.fillStyle = 'rgba(14,40,56,0.55)'; ctx.save(); ctx.translate(fxp, fyp); ctx.scale(fdir, 1);
      ell(ctx, 0, 0, 11, 3.4); poly(ctx, [-9, 0, -16, -4 + wig, -15, 0, -16, 4 + wig]); ctx.restore();
    }
    for (let i = 0, n = Math.ceil((b - a) / 30); i < n; i++) {
      const c = time / (5 + hash(i) * 3) + hash(i * 2.2 + sd), k = Math.floor(c), u = c - k;
      const x = a + 14 + hash2(i, k) * (b - a - 28) + u * 12, y = lerp(GY + 40 + hash2(k, i) * 20, GY + ICE_T + 2, sstep(0, 0.7, u));
      if (x < xs || x > xe) continue;
      ctx.fillStyle = rgba('220,240,250', 0.5 * sstep(0, 0.1, u) * (1 - sstep(0.85, 1, u)));
      if (u < 0.7) circle(ctx, x + sin(u * 12 + i) * 1.2, y, 1 + hash(i * 3) * 0.8); else ell(ctx, x, GY + ICE_T + 1.4, 2.4, 1);
    }
    ctx.strokeStyle = 'rgba(190,225,240,0.16)'; ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      const y = GY + 18 + j * 11, per = 70 + j * 16, v = 9 - j * 2;
      ctx.beginPath();
      for (let k = Math.floor((xs - time * v) / per) - 1; k <= Math.ceil((xe - time * v) / per); k++) { const sx = k * per + time * v + hash2(j, k) * 30; ctx.moveTo(sx, y); ctx.lineTo(sx + 16 + j * 4, y); }
      ctx.stroke();
    }
    ctx.restore();
    const ig = ctx.createLinearGradient(0, GY - 1, 0, GY + ICE_T);
    ig.addColorStop(0, '#f2fbff'); ig.addColorStop(0.18, '#cfeaf5'); ig.addColorStop(0.7, '#a5d3e6'); ig.addColorStop(1, '#86c0d9');
    ctx.fillStyle = ig; ctx.fillRect(xs, GY - 1, xe - xs, ICE_T + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0, n = Math.ceil((b - a) / 18); i < n; i++) { const x = a + hash(i * 4.4 + sd) * (b - a); if (x > xs && x < xe) circle(ctx, x, GY + 3 + hash(i * 1.3) * 4, 0.6 + hash(i) * 0.9); }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.8; ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let i = 0, n = Math.ceil((b - a) / 44); i < n; i++) {
      const x0 = a + 16 + hash(i * 6.3 + sd) * (b - a - 32);
      if (x0 < xs - 20 || x0 > xe + 20) continue;
      let x = x0, y = GY;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (hash2(i, k) - 0.5) * 9; y += 1.6 + hash2(k, i) * 1.6; ctx.lineTo(x, y); }
      if (i % 2) { ctx.moveTo(x0 + 2, GY + 3); ctx.lineTo(x0 + 8 + hash(i) * 6, GY + 5.4); }
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(30,70,95,0.22)'; ctx.fillRect(xs, GY + ICE_T - 1.2, xe - xs, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(xs, GY - 1, xe - xs, 1.1);
    for (let i = 0, n = Math.ceil((b - a) / 40); i < n; i++) {
      const gx = a + ((hash(i * 3.3 + sd) * (b - a) + time * (4 + hash(i) * 4)) % (b - a)), tw = Math.pow(Math.max(0, sin(time * (0.8 + hash(i + 5)) + i * 2.1)), 10);
      const ga = tw * sstep(a, a + 20, gx) * sstep(b, b - 20, gx);
      if (ga < 0.03 || gx < xs - 6 || gx > xe + 6) continue;
      ctx.fillStyle = rgba('255,255,255', 0.9 * ga); ell(ctx, gx, GY + 0.6, 5 + tw * 3, 0.7);
      ctx.fillRect(gx - 0.4, GY - 3 * tw, 0.8, 6 * tw); ctx.fillRect(gx - 2.6 * tw, GY - 0.4 + 0.2, 5.2 * tw, 0.8);
    }
    if (WET > 0.02) {
      for (let i = 0, n = Math.ceil((b - a) / 55); i < n; i++) {
        const x = a + 24 + hash(i * 9.1 + sd) * (b - a - 48), w = 12 + hash(i * 4.3) * 22;
        if (x < xs - w || x > xe + w) continue;
        ctx.fillStyle = rgba('96,138,160', 0.35 * WET); ell(ctx, x, GY + 0.4, w, 1.3);
        ctx.fillStyle = rgba('235,245,250', (0.35 + 0.25 * sin(t2(time, i))) * WET); ell(ctx, x - w * 0.25, GY - 0.1, w * 0.4, 0.45);
      }
    }
    for (let i = 0, n = Math.ceil((b - a) / 70); i < n; i++) {
      const x = a + 30 + hash(i * 7.7 + sd) * (b - a - 60), w = 8 + hash(i * 2.9) * 14;
      if (x < xs - w || x > xe + w) continue;
      ctx.fillStyle = 'rgba(160,190,214,0.5)'; ell(ctx, x + 1, GY - 0.2, w, 1.6);
      ctx.fillStyle = SNOW; ell(ctx, x, GY - 0.8, w * 0.9, 1.5);
    }
    for (let i = 0; i < 6; i++) {
      const L = 2.6 + hash(i * 2.3) * 1.4, c = time / L + hash(i * 1.1 + sd), k = Math.floor(c), u = c - k;
      const x = a + 20 + hash2(i, k) * (b - a - 60) + u * 70, y = GY - 2 - sin(u * PI) * 4 - hash2(k, i) * 3;
      if (x < xs - 20 || x > xe + 20) continue;
      const al = 0.55 * sin(PI * u) * sstep(a, a + 30, x) * sstep(b, b - 30, x);
      ctx.fillStyle = rgba('255,255,255', al); ell(ctx, x, y, 9 + u * 6, 1.1);
      ctx.fillStyle = rgba('255,255,255', al * 0.7); ell(ctx, x - 6, y + 1.2, 5, 0.7);
    }
    for (const [ex, s] of [[a, 1], [b, -1]]) {
      if (ex + 40 < vr[0] || ex - 40 > vr[1]) continue;
      ctx.save(); ctx.translate(ex, GY); ctx.scale(s, 1);
      ctx.fillStyle = SNOW_FACE; poly(ctx, [-2, -1, 10, -1, 4, ICE_T + 3, -2, ICE_T + 6]);
      ctx.fillStyle = SNOW_DK; blob(ctx, [-22, 2, -14, -5, -2, -8.4, 10, -6, 20, -1.6, 28, 2.2]);
      ctx.fillStyle = SNOW; blob(ctx, [-22, 1, -14, -6, -2, -9.4, 10, -7, 20, -2.6, 28, 1.2]);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ell(ctx, -6, -7.6, 8, 1.2, 0.05);
      ctx.fillStyle = 'rgba(150,180,210,0.35)'; ell(ctx, 14, -2.6, 8, 1.4, 0.15);
      reeds(ctx, -8, time, sd + s, 1);
      ctx.restore();
    }
    ctx.restore();
  }

  function hole(ctx, x, time, g) {
    tint(g);
    const sd = hash(x * 0.021), y = GY + 1.6;
    ctx.save();
    ctx.fillStyle = '#1d5470'; ctx.beginPath(); ctx.moveTo(x - 15, GY - 1);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x - 15 + i * 5, GY + ICE_T + (hash(i + sd) - 0.5) * 2);
    ctx.lineTo(x + 15, GY - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,250,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(x - 15, GY - 1); ctx.lineTo(x - 13.6, GY + 3); ctx.lineTo(x - 15.4, GY + 6); ctx.lineTo(x - 14, GY + ICE_T);
    ctx.moveTo(x + 15, GY - 1); ctx.lineTo(x + 16.4, GY + 2.6); ctx.lineTo(x + 14.6, GY + 6.4); ctx.lineTo(x + 15.6, GY + ICE_T);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,160,195,0.6)'; ell(ctx, x + 1, y + 0.6, 25, 5.4);
    ctx.fillStyle = '#e9f5fb'; ell(ctx, x, y, 24, 5);
    ctx.fillStyle = '#b9dcec'; ell(ctx, x, y + 0.3, 19.5, 3.9);
    ctx.fillStyle = '#0d2f40'; ell(ctx, x, y + 0.5, 17, 3.2);
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 0.5, 17, 3.2, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(80,140,170,0.45)'; ell(ctx, x - 3, y - 0.8, 12, 1.4);
    for (let k = 0; k < 2; k++) {
      const u = frac(time * 0.45 + k * 0.5 + sd);
      ctx.strokeStyle = rgba('200,235,250', 0.6 * (1 - u)); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(x + sin(time * 0.6) * 2, y + 0.6, 3 + u * 14, 0.6 + u * 2.4, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    const chunks = [[-22, -1, 6, 3.4, 0.2], [-15, 3.4, 5, 2.6, -0.3], [-4, 4.6, 6.4, 2.4, 0.1], [9, 4.2, 5.4, 2.6, -0.2], [19, 2.8, 6, 3, 0.3], [21, -1.6, 4.6, 2.4, -0.4], [-8, -3.8, 4, 1.8, 0.1], [7, -3.6, 4.4, 1.8, -0.1]];
    for (const c of chunks) {
      ctx.save(); ctx.translate(x + c[0], y + c[1]); ctx.rotate(c[4]);
      ctx.fillStyle = '#9fcbe0'; poly(ctx, [-c[2], 0.6, -c[2] * 0.6, -c[3], c[2] * 0.7, -c[3] * 0.8, c[2], 0.8, 0, c[3] * 0.4]);
      ctx.fillStyle = '#e4f4fb'; poly(ctx, [-c[2], 0, -c[2] * 0.6, -c[3], c[2] * 0.7, -c[3] * 0.8, c[2] * 0.4, -0.6]);
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      const u = frac(time * 0.3 + i / 3 + sd), al = 0.28 * sstep(0, 0.2, u) * (1 - sstep(0.5, 1, u));
      ctx.fillStyle = rgba('240,248,252', al); circle(ctx, x - 6 + i * 6 + sin(u * 5 + i) * 3 + u * 6, y - 3 - u * 26, 2.4 + u * 6);
    }
    const bite = Math.pow(Math.max(0, sin(time * 0.9 + sd * 6)), 30), bob = sin(time * 2.1 + sd) * 0.6 + bite * sin(time * 40) * 1.8;
    ctx.fillStyle = SNOW; blob(ctx, [x + 22, y + 0.5, x + 26, y - 4, x + 33, y - 5, x + 38, y - 1, x + 39, y + 0.8]);
    ctx.lineCap = 'round';
    line(ctx, x + 33, y - 3, x + 27, y - 9, 2.6, '#2b2b2b');
    line(ctx, x + 27, y - 9, x + 11, y - 15 + bob, 1.1, '#c0392b');
    ctx.strokeStyle = 'rgba(240,240,240,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + 11, y - 15 + bob); ctx.lineTo(x + 3, y); ctx.stroke();
    ctx.fillStyle = '#d64535'; circle(ctx, x + 3.4, y - 0.6 + bob * 0.3, 1.3); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 2.2, y - 0.8 + bob * 0.3, 2.4, 0.7);
    ctx.fillStyle = '#2e6db3'; poly(ctx, [x - 36, y - 13, x - 24, y - 13, x - 25.5, y, x - 34.5, y]);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 34, y - 12, 2, 11);
    ctx.fillStyle = '#1f4f86'; ctx.fillRect(x - 36.5, y - 14, 13, 2);
    ctx.strokeStyle = '#9aa1a7'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x - 30, y - 13, 6, 5, 0, PI * 1.05, PI * 1.95); ctx.stroke();
    snowCap(ctx, -1e-3 + x - 36.5, x - 23.5, y - 14, 2.2, 51 + sd);
    ctx.restore();
  }
  const CH_LOG = ['#a4683a', '#965d33', '#ac7244', '#8e5630', '#a06639'];
  const NOTE_COL = ['#ff4fa3', '#36d6ff', '#ffd23a', '#9cff5a', '#ff8a3a'];
  const BEAT = 60 / 126, WASH = [[255, 80, 170], [60, 200, 255], [255, 210, 60]];
  const kick = (ph) => sstep(0, 0.07, ph) * exp(-Math.max(0, ph - 0.07) * 6);
  let chataG = null;
  function chataGeo() {
    if (chataG) return chataG;
    const g = chataG = { boards: new Path2D(), grain: new Path2D() };
    for (let x = -120; x <= 120; x += 8) { const y = -96 - 0.62 * (126 - abs(x)); g.boards.moveTo(x, -96); g.boards.lineTo(x, Math.max(y, -172)); }
    for (let i = 0; i < 40; i++) { const x = -108 + hash(i * 3.1) * 216, y = -14 - Math.floor(hash(i * 5.7) * 8) * 10.6 - 5; g.grain.moveTo(x, y); g.grain.lineTo(x + 6 + hash(i) * 10, y + (hash(i * 2.2) - 0.5)); }
    return g;
  }
  function note(ctx, x, y, s, col, kind, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(30,20,40,0.35)'; ctx.save(); ctx.translate(0.7, 0.7);
    if (kind) { ell(ctx, -3.6, 0, 2.4, 1.8, -0.4); ell(ctx, 3.6, -1.6, 2.4, 1.8, -0.4); ctx.fillRect(-1.8, -10, 1.3, 10); ctx.fillRect(5.4, -11.6, 1.3, 10); poly(ctx, [-1.8, -10, 6.7, -11.6, 6.7, -9.4, -1.8, -7.8]); }
    else { ell(ctx, 0, 0, 2.6, 1.9, -0.4); ctx.fillRect(1.7, -10, 1.3, 10); poly(ctx, [1.7, -10, 6, -6.4, 5.6, -5, 1.7, -7.6]); }
    ctx.restore();
    ctx.fillStyle = col;
    if (kind) { ell(ctx, -3.6, 0, 2.4, 1.8, -0.4); ell(ctx, 3.6, -1.6, 2.4, 1.8, -0.4); ctx.fillRect(-1.8, -10, 1.3, 10); ctx.fillRect(5.4, -11.6, 1.3, 10); poly(ctx, [-1.8, -10, 6.7, -11.6, 6.7, -9.4, -1.8, -7.8]); }
    else { ell(ctx, 0, 0, 2.6, 1.9, -0.4); ctx.fillRect(1.7, -10, 1.3, 10); poly(ctx, [1.7, -10, 6, -6.4, 5.6, -5, 1.7, -7.6]); }
    ctx.restore();
  }
  function speaker(ctx, sx, pulse, time) {
    ctx.save(); ctx.translate(sx * 121, -112); ctx.scale(sx, 1); ctx.rotate(-0.12 + pulse * 0.02);
    line(ctx, -6, 6, -16, 12, 2.6, '#2a2d31');
    ctx.fillStyle = '#18191c'; rr(ctx, -9, -2, 20, 30, 2.4);
    ctx.fillStyle = '#2b2d31'; rr(ctx, -7.5, -0.5, 17, 27, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-7.5, -0.5, 2, 27);
    const k = 1 + 0.14 * pulse;
    ctx.fillStyle = '#111214'; circle(ctx, 1, 17, 6.6);
    ctx.fillStyle = '#3c3f44'; circle(ctx, 1, 17, 5.4 * k);
    ctx.fillStyle = '#1a1b1e'; circle(ctx, 1, 17, 2.4 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(1, 17, 4.6 * k, PI * 1.1, PI * 1.5); ctx.arc(1, 17, 3.2 * k, PI * 1.5, PI * 1.1, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111214'; circle(ctx, 1, 5.4, 3);
    ctx.fillStyle = '#4a4e54'; circle(ctx, 1, 5.4, 1.8 * (1 + 0.08 * pulse));
    ctx.fillStyle = pulse > 0.5 ? '#5aff7a' : '#1d5a2a'; circle(ctx, 7, 0.8, 0.8);
    snowCap(ctx, -9.5, 11.5, -2, 2.6, 61 + sx);
    ctx.lineCap = 'round';
    for (let r = 0; r < 2; r++) {
      const u = frac(time / BEAT + r * 0.5), rad = 10 + u * 20, al = 0.55 * (1 - u) * (0.4 + 0.6 * pulse);
      ctx.strokeStyle = rgba('255,255,255', al); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(1, 14, rad, -0.55, 0.55); ctx.stroke();
    }
    ctx.restore();
  }

  function chata(ctx, x, time, gm) {
    tint(gm);
    const g = chataGeo(), sd = hash(x * 0.0091), bt = time / BEAT, ph = frac(bt), pulse = kick(ph), bounce = sin(PI * Math.min(1, ph * 2)) * (ph < 0.5 ? 1 : 0);
    const lbl = ZS.LABELS.apresSki || '';
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(70,92,125,0.17)'; ell(ctx, -8, 1.4, 150, 5);
    ctx.fillStyle = '#8b8a86'; ctx.fillRect(-116, -10, 232, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-116, -10, 232, 2);
    ctx.fillStyle = '#6f6e6a'; for (let i = 0; i < 12; i++) ctx.fillRect(-114 + i * 19.5 + (i % 2) * 5, -10, 1.4, 10);
    for (let i = 0; i < 8; i++) {
      const y = -10 - (i + 1) * 10.7, o = (i % 2) * 2.4;
      ctx.fillStyle = CH_LOG[i % 5]; rr(ctx, -112, y, 224, 10.7, 4.4);
      ctx.fillStyle = 'rgba(255,225,170,0.16)'; ctx.fillRect(-108, y + 1, 216, 2.2);
      ctx.fillStyle = 'rgba(40,15,0,0.24)'; ctx.fillRect(-108, y + 8.4, 216, 2.3);
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#c8955f'; ell(ctx, s * (113 + o), y + 5.3, 3.6, 5.2);
        ctx.fillStyle = '#a77845'; ell(ctx, s * (113.4 + o), y + 5.3, 1.8, 2.7);
      }
    }
    ctx.strokeStyle = 'rgba(60,30,10,0.25)'; ctx.lineWidth = 0.8; ctx.stroke(g.grain);
    const hp = bt / 2, h0 = Math.floor(hp) % 3, h1 = (h0 + 1) % 3, hk = sstep(0.75, 1, frac(hp)), A = WASH[h0], Z = WASH[h1];
    const wash = Math.round(lerp(A[0], Z[0], hk)) + ',' + Math.round(lerp(A[1], Z[1], hk)) + ',' + Math.round(lerp(A[2], Z[2], hk)), wk = 0.25 + 0.2 * pulse;
    const win = (x0, w, y0, h, people) => {
      ctx.fillStyle = '#4a2c18'; ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
      ctx.fillStyle = '#f0b44c'; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = rgba('255,236,170', 0.55); ctx.fillRect(x0, y0, w, h * 0.5);
      ctx.fillStyle = rgba(wash, wk); ctx.fillRect(x0, y0, w, h);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
      for (let i = 0; i < people; i++) {
        const px = x0 + 7 + i * (w - 12) / Math.max(1, people - 1), hop = bounce * (2.4 + (i % 2) * 1.6) * (i % 3 === 1 ? 0.6 : 1), sw = sin(time * 3.3 + i * 1.7) * 1.4;
        const hy = y0 + h * 0.42 - hop;
        ctx.fillStyle = 'rgba(58,26,40,0.82)';
        ell(ctx, px + sw * 0.4, hy + 13, 7.4, 9); circle(ctx, px + sw, hy, 4.6);
        ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(58,26,40,0.82)'; ctx.lineWidth = 2.6;
        const up = i % 2 ? 1 : 0.4 + 0.6 * pulse;
        ctx.beginPath(); ctx.moveTo(px - 4, hy + 8); ctx.lineTo(px - 8 + sw, hy + 2 - 8 * up); ctx.moveTo(px + 4, hy + 8); ctx.lineTo(px + 8 + sw, hy + 4 - 6 * up); ctx.stroke();
        if (i % 2 === 0) { ctx.fillStyle = 'rgba(58,26,40,0.82)'; rr(ctx, px + 6 + sw, hy - 4 - 6 * up, 4, 5, 1); }
      }
      ctx.restore();
      ctx.fillStyle = '#4a2c18'; ctx.fillRect(x0 + w / 2 - 1, y0, 2, h); ctx.fillRect(x0, y0 + h * 0.36, w, 2);
      ctx.fillStyle = '#6b4426'; ctx.fillRect(x0 - 5, y0 + h + 3, w + 10, 3.4);
      snowCap(ctx, x0 - 5, x0 + w + 5, y0 + h + 3, 2.6, 71 + x0);
    };
    win(-96, 50, -80, 40, 4);
    win(44, 46, -80, 40, 3);
    ctx.fillStyle = '#4a2c18'; ctx.fillRect(-19, -86, 38, 76);
    ctx.fillStyle = '#7a4a28'; ctx.fillRect(-16, -83, 32, 73);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 1; i < 4; i++) ctx.fillRect(-16 + i * 8, -83, 1.2, 73);
    ctx.fillStyle = '#f0b44c'; rr(ctx, -10, -75, 20, 18, 2);
    ctx.fillStyle = rgba(wash, wk); rr(ctx, -10, -75, 20, 18, 2);
    ctx.fillStyle = '#4a2c18'; ctx.fillRect(-0.8, -75, 1.6, 18);
    ctx.fillStyle = '#d8a84a'; circle(ctx, 10, -44, 1.8);
    ctx.fillStyle = '#2f6a34'; circle(ctx, 0, -40, 7.4); ctx.fillStyle = '#7a4a28'; circle(ctx, 0, -40, 4);
    ctx.fillStyle = '#c42b2b'; poly(ctx, [0, -33.4, -3.6, -30.4, -3.6, -36.4]); poly(ctx, [0, -33.4, 3.6, -30.4, 3.6, -36.4]);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-122, -96); ctx.lineTo(0, -172); ctx.lineTo(122, -96); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#b07a48'; ctx.fillRect(-124, -174, 248, 80);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,35,10,0.35)'; ctx.stroke(g.boards);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; poly(ctx, [0, -172, 122, -96, 0, -96]);
    ctx.restore();
    ctx.fillStyle = '#5a3a20'; circle(ctx, 0, -148, 9.5);
    ctx.fillStyle = '#f0b44c'; circle(ctx, 0, -148, 7.4);
    ctx.fillStyle = rgba(wash, 0.3 + 0.3 * pulse); circle(ctx, 0, -148, 7.4);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-0.8, -155, 1.6, 14); ctx.fillRect(-7, -148.8, 14, 1.6);
    ctx.fillStyle = '#4a2c18'; ctx.fillRect(-122, -99, 244, 4);
    const sy = -122;
    ctx.fillStyle = '#2a1c26'; rr(ctx, -64, sy - 13, 128, 24, 4);
    ctx.fillStyle = '#3b2534'; rr(ctx, -61.5, sy - 10.5, 123, 19, 3);
    if (lbl) {
      const flick = (frac(time * 0.37 + sd) < 0.03 ? 0.35 : 1) * (0.88 + 0.12 * sin(time * 31));
      const fs = fitText(ctx, lbl, 15, 900, 108);
      ctx.font = '900 ' + fs + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba('255,60,170', 0.22 * flick); ctx.lineWidth = 7; ctx.strokeText(lbl, 0, sy - 0.5);
      ctx.strokeStyle = rgba('255,90,190', 0.5 * flick); ctx.lineWidth = 3; ctx.strokeText(lbl, 0, sy - 0.5);
      ctx.fillStyle = rgba('255,236,250', flick); ctx.fillText(lbl, 0, sy - 0.5);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    for (const s of [-1, 1]) { ctx.fillStyle = '#1d1d1d'; ctx.fillRect(s * 46 - 1, sy + 11, 2, 9); }
    ctx.fillStyle = '#5a3a20';
    poly(ctx, [-138, -92, 0, -176, 138, -92, 138, -86, 0, -168, -138, -86]);
    ctx.fillStyle = 'rgba(255,225,180,0.16)'; poly(ctx, [-138, -92, 0, -176, 0, -174, -138, -90]);
    for (const s of [-1, 1]) { ctx.fillStyle = '#4a2f19'; poly(ctx, [s * 138, -92, s * 144, -86, s * 140, -82, s * 134, -86]); }
    ctx.fillStyle = '#7b756d'; poly(ctx, [-74, -170, -60, -170, -60, -138, -74, -129]);
    ctx.fillStyle = '#625d56'; for (let i = 0; i < 3; i++) ctx.fillRect(-74, -164 + i * 10, 14, 1.4);
    ctx.fillStyle = '#58534d'; ctx.fillRect(-76, -174, 18, 5);
    smoke(ctx, -67, -176, time, sd * 4 + 2, 1);
    const cap = [-146, -86, -138, -95, -70, -138, 0, -184, 70, -138, 138, -95, 146, -86, 132, -89, 70, -127, 0, -171, -70, -127, -132, -89];
    ctx.save(); ctx.translate(1, 3); ctx.fillStyle = SNOW_DK; blob(ctx, cap); ctx.restore();
    ctx.fillStyle = SNOW; blob(ctx, cap);
    ctx.fillStyle = SNOW_FACE; poly(ctx, [2, -183, 70, -138.5, 138, -95, 146, -86, 132, -89, 70, -127, 2, -171]);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ell(ctx, -40, -152, 22, 1.6, -0.55);
    snowCap(ctx, -76, -58, -174, 3.4, 81 + sd);
    ctx.fillStyle = 'rgba(200,228,245,0.92)';
    for (let i = 0; i < 14; i++) { const ix = -130 + i * 20 + hash(i * 2.9 + sd) * 6, il = (3 + hash(i * 3.3 + sd) * 9) * ICE_K; poly(ctx, [ix - 1.5, -88, ix + 1.5, -88, ix + 0.2, -88 + il]); }
    const lp = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; lp.push(lerp(-136, 0, t), lerp(-88, -170, t) + 3); }
    for (let i = 1; i <= 12; i++) { const t = i / 12; lp.push(lerp(0, 136, t), lerp(-170, -88, t) + 3); }
    lights(ctx, lp, time, sd, bt * 0.5);
    const ep = [];
    for (let i = 0; i <= 18; i++) ep.push(lerp(-112, 112, i / 18), -96 + (i % 2) * 2.4);
    lights(ctx, ep, time, sd + 0.5, bt * 0.5 + 0.25);
    speaker(ctx, -1, pulse, time); speaker(ctx, 1, kick(frac(bt + 0.97)), time);
    const ga = ctx.globalAlpha;
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1, born = Math.floor(bt / 1) - Math.floor(i / 2), age = (bt - born) * BEAT;
      if (age < 0 || age > 2.8) continue;
      const u = age / 2.8, h = hash2(born, side), nx = side * (124 + u * (30 + 26 * h)) + sin(age * 4 + born) * 5, ny = -104 - u * 78 - h * 10;
      const al = sstep(0, 0.08, u) * (1 - sstep(0.6, 1, u));
      if (al < 0.03) continue;
      ctx.globalAlpha = ga * al; note(ctx, nx, ny, 0.95 + 0.3 * h, NOTE_COL[(born * 3 + (side > 0 ? 1 : 0)) % 5], h > 0.5 ? 1 : 0, sin(age * 3 + born) * 0.25); ctx.globalAlpha = ga;
    }
    ctx.save(); ctx.translate(-118, 0);
    ctx.fillStyle = '#5c3d22'; ctx.fillRect(-24, -21, 48, 3.4);
    ctx.strokeStyle = '#4a3019'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(-18, -18); ctx.lineTo(-10, 0); ctx.moveTo(-10, -18); ctx.lineTo(-18, 0); ctx.moveTo(18, -18); ctx.lineTo(10, 0); ctx.moveTo(10, -18); ctx.lineTo(18, 0); ctx.stroke();
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-26, -11.5, 52, 3); ctx.fillRect(-23, -8.5, 2, 8.5); ctx.fillRect(21, -8.5, 2, 8.5);
    snowCap(ctx, -24, -6, -21, 2, 91); snowCap(ctx, 12, 24, -21, 1.8, 93);
    for (const [mx, full] of [[-3, 1], [6, 0.6]]) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(ctx, mx - 3, -30, 6.4, 9, 1.2);
      ctx.fillStyle = '#e8a52a'; ctx.fillRect(mx - 2.4, -29 + 7 * (1 - full), 5.2, 7 * full + 0.4);
      ctx.fillStyle = '#fffaf0'; ell(ctx, mx + 0.2, -29.2 + 7 * (1 - full), 3.4, 1.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(mx + 3.8, -25.6, 2.2, -1.3, 1.3); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(98, 0);
    const ski = (x0, rot, c1, c2) => {
      ctx.save(); ctx.translate(x0, -1); ctx.rotate(rot);
      ctx.fillStyle = c1; rr(ctx, -1.6, -62, 3.2, 62, 1.4);
      ctx.fillStyle = c2; ctx.fillRect(-1.6, -40, 3.2, 10);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-1.6, -61); ctx.quadraticCurveTo(-1.6, -68, 2.4, -69); ctx.lineTo(1.6, -61); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b3f45'; rr(ctx, -2.4, -30, 4.8, 6, 1);
      ctx.restore();
    };
    ski(-4, -0.1, '#d6332b', '#f2f2f2'); ski(0, -0.09, '#e8402f', '#f2f2f2');
    ski(10, -0.12, '#2a6fd1', '#f6c624'); ski(13.5, -0.11, '#2f7ee0', '#f6c624');
    ctx.save(); ctx.translate(26, -1); ctx.rotate(-0.13);
    ctx.fillStyle = '#7b2fbf'; rr(ctx, -6, -66, 12, 66, 6);
    ctx.fillStyle = '#b3ff3c'; poly(ctx, [-6, -40, 6, -50, 6, -42, -6, -32]);
    ctx.fillStyle = '#ff4fa3'; circle(ctx, 0, -18, 3.4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-5, -60, 2, 52);
    ctx.fillStyle = '#26282c'; rr(ctx, -6.5, -48, 13, 4, 1.4); rr(ctx, -6.5, -24, 13, 4, 1.4);
    snowCap(ctx, -5.5, 5.5, -66, 2.4, 95);
    ctx.restore();
    line(ctx, 4, -1, -2, -54, 1.2, '#9aa1a7'); line(ctx, 7, -1, 3, -54, 1.2, '#9aa1a7');
    ctx.fillStyle = '#26282c'; circle(ctx, 4, -4, 2.4); circle(ctx, 7, -4, 2.4);
    ctx.restore();
    for (const s of [-1, 1]) { ctx.fillStyle = SNOW; blob(ctx, [s * 112 - 16, 1.4, s * 112 - 8, -5, s * 112 + 4, -7, s * 112 + 14, -2.4, s * 112 + 20, 1.4]); }
    ctx.restore();
  }
  const newDeer = (seed) => ({ t: -1, x: 0, phase: 0, amt: 0, runK: 0, gait: 0, v: 0, seed, seen: 0, head: 0.5, face: 1, flare: 0, flee: 0, look: 0 });
  function advance(st, x, dir, time, P) {
    const dt = time - st.t, S = () => lerp(P.sw, P.sr, st.runK);
    if (!(dt >= 0 && dt < 0.3) || abs(x - st.x) > 160) {
      st.runK = st.gait = P.wantRun ? 1 : 0; st.amt = P.hint ? 1 : 0; st.v = P.hint ? P.vmin * 2 : 0;
      st.phase = dir * x / S(); st.head = P.head; st.face = dir; st.flare = P.flare; st.flee = P.wantRun ? 1 : 0; st.look = P.look;
    } else if (dt > 1e-4) {
      const dx = x - st.x, vi = abs(dx) / dt, m = clamp(vi / P.vmin, 0, 1), want = (P.wantRun || st.v > P.vrun) ? 1 : 0;
      const cap = P.fmax * dt;
      st.phase += clamp(dx * dir / S(), -cap, cap);
      st.v += (vi - st.v) * Math.min(1, dt * (vi < st.v ? 30 : 10));
      st.amt += (clamp(st.v / P.vmin, 0, 1) - st.amt) * Math.min(1, dt * 14);
      st.runK += (want - st.runK) * Math.min(1, dt * 8) * m;
      st.gait += (want - st.gait) * Math.min(1, dt * 4) * m;
      const e = 1 - exp(-dt * 6);
      st.head += (P.head - st.head) * e;
      st.face += (dir - st.face) * (1 - exp(-dt * 11));
      st.flare += (P.flare - st.flare) * (1 - exp(-dt * 9));
      st.flee += ((P.wantRun ? 1 : 0) - st.flee) * e;
      st.look += (P.look - st.look) * e;
    }
    st.x = x; st.t = time;
  }
  const FT = { x: 0, y: 0 };
  function footAt(p, duty, half, lift) {
    p = frac(p);
    if (p < duty) { FT.x = half - 2 * half * (p / duty); FT.y = 0; }
    else { const v = (p - duty) / (1 - duty), e = v * v * (3 - 2 * v); FT.x = -half + 2 * half * e; FT.y = lift * sin(PI * Math.pow(v, 0.8)); }
  }
  const IK = { mx: 0, my: 0, ex: 0, ey: 0 };
  function ik(x0, y0, tx, ty, l1, l2, bend) {
    let dx = tx - x0, dy = ty - y0, d = hypot(dx, dy);
    const max = l1 + l2 - 0.05, min = abs(l1 - l2) + 0.3;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { if (d < 0.001) { dx = 0; dy = min; } else { dx *= min / d; dy *= min / d; } d = min; }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), t = atan2(dy, dx) - bend * a;
    IK.mx = x0 + cos(t) * l1; IK.my = y0 + sin(t) * l1; IK.ex = x0 + dx; IK.ey = y0 + dy;
  }
  const DE = { coat: '#7e6d5d', hi: '#8f7e6c', shade: '#6a5a4b', back: '#64554a', belly: '#b1a392', leg: '#77665a', far: '#56493f', hoof: '#2a2320',
    rump: '#f4f0e8', rumpSh: '#d9d1c4', throat: '#ece6da', nose: '#1d1816', ear: '#6f6052', earIn: '#cdbca9', earRim: '#3b322b', eye: '#1a1310' };
  const DLEG = [[-14, 0, 1, 0.5, 0.04], [13, 1, 1, 0.75, 0.6], [-14, 0, 0, 0, 0], [13, 1, 0, 0.25, 0.56]];
  const DROOT = [-32, -30];
  const DHEAD = [[25.5, -5.5, 1.3], [27, -51, 0.38], [23.5, -63, 0.06]];
  const dfx = [0, 0, 0, 0], dfy = [0, 0, 0, 0];
  const DBODY = [-24, -40, -22, -46.6, -12, -48.4, 2, -46.8, 14, -47, 20.5, -42.6, 21.4, -35.6, 16.4, -30.4, 4, -28.6, -8, -29.2, -18, -31.4, -23.6, -35.2];

  function deerHead(ctx, hx, hy, ang, earA, earB, blink, chew, turn) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    const ear = (a, far) => {
      ctx.save(); ctx.translate(-3.4, -3.6); ctx.rotate(-2.15 + a);
      ctx.fillStyle = far ? DE.far : DE.ear; ell(ctx, 6, 0, 6.4, far ? 2.6 : 3);
      if (!far) { ctx.fillStyle = DE.earIn; ell(ctx, 6.4, 0.4, 4.4, 1.6); ctx.fillStyle = DE.earRim; ell(ctx, 11.4, 0, 1.4, 1.6); }
      ctx.restore();
    };
    ear(earB - 0.25, true);
    ctx.fillStyle = DE.coat; ell(ctx, 0, 0, 6.6, 4.8);
    ctx.save(); ctx.scale(1 - 0.22 * turn, 1);
    ctx.fillStyle = DE.coat; poly(ctx, [2, -4, 9, -2.6, 12.4, -0.8, 12.6, 1.6, 9, 3.4 + chew * 0.5, 2, 4.4]);
    ctx.fillStyle = DE.shade; poly(ctx, [3, 2.6, 9, 2.8 + chew * 0.5, 12.4, 1.4, 12.6, 1.8, 9, 3.6 + chew * 0.6, 3, 4.6]);
    ctx.fillStyle = DE.throat; ell(ctx, 9.6, 3.2 + chew * 0.5, 2.6, 1.2);
    ctx.fillStyle = '#2a221d'; ell(ctx, 10.2, 1.6, 1.6, 0.7);
    ctx.fillStyle = DE.nose; ell(ctx, 12.4, 0.3, 2, 1.7);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, 12, -0.4, 0.8, 0.5);
    ctx.restore();
    ctx.fillStyle = DE.hi; ell(ctx, -1, -2.6, 4, 1.6, -0.2);
    if (blink) { ctx.fillStyle = DE.eye; ctx.fillRect(1.4, -1.6, 3.2, 0.8); }
    else { ctx.fillStyle = '#d8ccbc'; ell(ctx, 3, -1.3, 2.1, 1.9); ctx.fillStyle = DE.eye; ell(ctx, 3.1, -1.3, 1.6, 1.5); ctx.fillStyle = '#fff'; circle(ctx, 3.6, -1.9, 0.5); }
    ear(earA, false);
    ctx.restore();
  }

  function deer(ctx, d, time) {
    const st = stateOf('deer', d, time, newDeer), sd = st.seed;
    const mode = d.state === 'walk' || d.state === 'look' || d.state === 'flee' ? d.state : 'graze', dir = d.dir < 0 ? -1 : 1;
    const u = frac(time / (7.5 + hash(sd) * 4) + hash(sd + 1)), glance = sstep(0.6, 0.68, u) - sstep(0.8, 0.88, u);
    advance(st, d.x, dir, time, { sw: 26, sr: 104, fmax: 3.4, vmin: 8, vrun: 95, wantRun: mode === 'flee', hint: mode === 'walk' || mode === 'flee',
      head: mode === 'look' ? 1 : mode === 'flee' ? 0.78 : mode === 'walk' ? 0.55 : 0.02 + 0.85 * glance,
      flare: mode === 'flee' ? 1 : mode === 'look' ? 0.45 : 0, look: mode === 'look' ? 1 : 0 });
    const amt = st.amt, rk = st.runK, gk = st.gait, bk = rk * amt;
    const S = lerp(26, 104, rk), duty = lerp(0.62, 0.26, rk), half = S * duty / 2, lift = lerp(4.6, 13, rk);
    const p = frac(st.phase), b1 = p >= 0.26 && p < 0.58 ? sin(PI * (p - 0.26) / 0.32) : 0, b2 = p >= 0.84 ? sin(PI * (p - 0.84) / 0.16) * 0.3 : 0;
    const leap = (b1 + b2) * 15 * bk, pitch = -0.16 * bk * sin(TAU * (p - 0.42)) + 0.02 * amt * (1 - rk) * sin(TAU * st.phase * 2);
    const pawU = frac(time / (5.2 + hash(sd + 4) * 2.5) + hash(sd + 6)), paw = mode === 'graze' ? sstep(0, 0.03, pawU) * (1 - sstep(0.1, 0.13, pawU)) * (1 - amt) : 0, pawPh = clamp(pawU / 0.13, 0, 1);
    const stamp = mode === 'look' ? Math.pow(Math.max(0, sin(time * 0.8 + sd * 5)), 40) * (1 - amt) : 0;
    let drop = 0;
    for (let i = 0; i < 4; i++) {
      const l = DLEG[i], front = l[1];
      footAt(st.phase + lerp(l[3], l[4], gk), duty, half, lift);
      let fx = lerp(front ? (l[2] ? -1 : 1.4) : (l[2] ? 1.2 : -1.6), FT.x + (front ? 1 : -1.2) + (front ? 2 : -3) * bk, amt), fy = lerp(0, FT.y, amt);
      if (i === 3 && paw > 0) { fx += paw * (4 + 4 * sin(pawPh * TAU * 3)); fy += paw * Math.max(0, 5 * sin(pawPh * TAU * 3 + 0.6)); }
      if (i === 3 && stamp > 0) fy += stamp * 5;
      dfx[i] = fx; dfy[i] = fy;
      const lm = front ? 30.4 : 32.6, reach = fy + sqrt(Math.max(0, lm * lm - fx * fx));
      drop = Math.max(drop, -DROOT[front] - reach);
    }
    const dy = drop - leap, breath = 1 + 0.015 * sin(time * 2.6 + sd);
    const sc = Math.sign(st.face) || dir, fs = 0.18 + 0.82 * Math.min(1, abs(st.face));
    const earScan = st.look * (0.45 * sin(time * 1.9 + sd * 3) + 0.2 * sin(time * 4.3 + sd));
    const ef = frac(time / 3.7 + hash(sd + 2)), flick = ef < 0.08 ? sin(ef * 12.5 * PI) * 0.6 : 0;
    const ef2 = frac(time / 5.3 + hash(sd + 3)), flick2 = ef2 < 0.08 ? sin(ef2 * 12.5 * PI) * 0.5 : 0;
    const tf = frac(time / 2.9 + hash(sd + 8)), tflick = tf < 0.1 ? sin(tf * 10 * PI) : 0;
    ctx.save(); ctx.translate(d.x, GY); ctx.scale(sc * fs, 1);
    ctx.fillStyle = rgba('60,80,110', 0.17 * (1 - 0.5 * clamp(leap / 15, 0, 1))); ell(ctx, 0, 0.8, 24 - leap * 0.4, 3);
    const leg = (i) => {
      const l = DLEG[i], front = l[1], far = l[2], hx = l[0], hy = DROOT[front];
      const rx = hx * cos(pitch) - (hy + 38) * sin(pitch), ry = hx * sin(pitch) + (hy + 38) * cos(pitch) - 38 + dy;
      const l1 = front ? 14.6 : 15.6, l2 = front ? 16.4 : 17.6;
      ik(rx, ry, l[0] + dfx[i], -dfy[i], l1, l2, front ? 1 : -1);
      const col = far ? DE.far : DE.leg;
      limb(ctx, rx, ry, IK.mx, IK.my, front ? 4.6 : 5.6, front ? 2.9 : 3.1, col);
      limb(ctx, IK.mx, IK.my, IK.ex, IK.ey, front ? 2.7 : 2.9, 2, col);
      const la = atan2(IK.ey - IK.my, IK.ex - IK.mx);
      ctx.save(); ctx.translate(IK.ex, IK.ey); ctx.rotate(la - PI / 2);
      ctx.fillStyle = DE.hoof; poly(ctx, [-1.3, -1.2, 1.4, -1.2, 2.6, 1.6, -1.2, 1.8]);
      ctx.restore();
    };
    leg(0); leg(1);
    ctx.save();
    ctx.translate(0, dy); ctx.translate(0, -38); ctx.rotate(pitch); ctx.translate(0, 38);
    ctx.save(); ctx.translate(0, -38); ctx.scale(1, breath); ctx.translate(0, 38);
    ctx.fillStyle = DE.shade; blob(ctx, DBODY);
    ctx.fillStyle = DE.coat; ctx.save(); ctx.translate(0, -1.4); ctx.scale(1, 0.94); blob(ctx, DBODY); ctx.restore();
    ctx.fillStyle = DE.back; ell(ctx, -2, -46, 15, 1.8, 0.02);
    ctx.fillStyle = DE.belly; ell(ctx, -2, -30.6, 13, 2.2, 0.02);
    ctx.restore();
    ctx.restore();
    leg(2); leg(3);
    ctx.save();
    ctx.translate(0, dy); ctx.translate(0, -38); ctx.rotate(pitch); ctx.translate(0, 38);
    ctx.fillStyle = DE.coat; ell(ctx, -14.6, -38, 8.4, 9.6, 0.15);
    ctx.fillStyle = DE.hi; ell(ctx, -15.6, -42.4, 5, 3, 0.2);
    ctx.fillStyle = DE.coat; ell(ctx, 13, -37, 6.4, 8.4, -0.15);
    const fl = st.flare, rw = 4.4 + 2.2 * fl + 0.6 * tflick * (1 - fl), rh = 6.2 + 2 * fl;
    ctx.fillStyle = DE.rumpSh; ell(ctx, -20.8 - fl * 0.4, -39.4, rw, rh, 0.18);
    ctx.fillStyle = DE.rump; ell(ctx, -20.6 - fl * 0.6, -40.2, rw * 0.84, rh * 0.86, 0.18);
    ctx.fillStyle = DE.coat; ell(ctx, -14.8 - fl * 0.6, -39.6, 3.2 - fl * 0.8, rh * 0.8, 0.15);
    ctx.save(); ctx.translate(-24.6 - fl, -45); ctx.rotate(-0.6 - 1.1 * fl + 0.5 * tflick);
    ctx.fillStyle = fl > 0.5 ? DE.rump : DE.shade; ell(ctx, 2.6, 0, 3, 1.4);
    ctx.restore();
    const k = clamp(st.head, 0, 1), a = k < 0.55 ? DHEAD[0] : DHEAD[1], b = k < 0.55 ? DHEAD[1] : DHEAD[2], tk = k < 0.55 ? k / 0.55 : (k - 0.55) / 0.45, te = tk * tk * (3 - 2 * tk);
    const down = 1 - sstep(0.1, 0.4, k);
    const nib = Math.pow(Math.max(0, sin(time * 6.2 + sd * 3)), 2) * sstep(-0.2, 0.4, sin(time * 0.8 + sd)) * down;
    let hx = lerp(a[0], b[0], te) + 4 * st.flee, hy = lerp(a[1], b[1], te) + 4 * st.flee, ha = lerp(a[2], b[2], te) + 0.12 * st.flee;
    hy += nib * 2.4 + sin(TAU * st.phase) * 1.2 * amt * (1 - rk) + paw * 1.5; ha += nib * 0.15 - pitch * 0.6;
    const nbx = 14, nby = -41;
    limb(ctx, nbx, nby, hx - cos(ha) * 3, hy - sin(ha) * 3 + 1, 11, 6.6, DE.coat);
    const nl = hypot(hx - nbx, hy - nby) || 1, nx = (hx - nbx) / nl, ny = (hy - nby) / nl, na = atan2(ny, nx);
    ctx.fillStyle = DE.throat;
    ell(ctx, nbx + nx * nl * 0.72 - ny * 2.8, nby + ny * nl * 0.72 + nx * 2.8, 3, 1.7, na);
    ell(ctx, nbx + nx * nl * 0.3 - ny * 4.2, nby + ny * nl * 0.3 + nx * 4.2, 2.6, 1.5, na);
    const turn = st.look * Math.max(0, sin(time * 0.6 + sd * 2)) * 0.8;
    const earA = -0.15 * st.flee + earScan + flick - 0.35 * down, earB = -0.1 * st.flee - earScan * 0.7 + flick2 - 0.3 * down;
    deerHead(ctx, hx, hy, ha, earA, earB, frac(time / 3.3 + hash(sd + 9)) < 0.03, sin(time * 11 + sd) * down * (1 - nib), turn);
    if (COLD > 0.05) {
      const bu = frac(time / 2.6 + hash(sd + 11)), br = COLD * sstep(0, 0.08, bu) * (1 - sstep(0.25, 0.6, bu)), nx2 = hx + cos(ha) * 13, ny2 = hy + sin(ha) * 13;
      if (br > 0.02) for (let i = 0; i < 3; i++) { const v = clamp(bu * 2.2 - i * 0.12, 0, 1); ctx.fillStyle = rgba('246,249,252', 0.5 * br * (1 - v)); circle(ctx, nx2 + v * 9 + i * 1.5, ny2 + 1 - v * 4, 1.4 + v * 4); }
    }
    if (paw > 0.05) {
      for (let i = 0; i < 5; i++) {
        const uu = frac(pawPh * 3 + i / 5), sx = 18 + dfx[3] - uu * (10 + i * 3), sy = -2 - sin(PI * uu) * (6 + i * 1.5);
        ctx.fillStyle = rgba('255,255,255', 0.85 * paw * (1 - uu)); circle(ctx, sx, sy, 1 + (i % 2) * 0.5);
      }
    }
    ctx.restore();
    ctx.restore();
  }
  const SLOPE_PAL = {
    advent: { open: [128, 122, 94], forest: [40, 58, 50], tip: [78, 98, 86], piste: [236, 239, 241], pisteSh: [188, 196, 202], line: [214, 220, 224], haze: [184, 192, 198, 0.34], snow: [222, 226, 225], snowSh: [146, 158, 166], icicle: [0.6], wet: [1], cold: [0.25] },
    snow: { open: [230, 236, 241], forest: [50, 72, 64], tip: [206, 218, 226], piste: [250, 251, 253], pisteSh: [192, 205, 220], line: [222, 230, 238], haze: [221, 227, 232, 0.4], snow: [245, 248, 251], snowSh: [150, 176, 204], icicle: [0.9], wet: [0], cold: [0.6] },
    frost: { open: [238, 244, 250], forest: [32, 60, 55], tip: [228, 238, 248], piste: [255, 255, 255], pisteSh: [182, 204, 232], line: [212, 226, 244], haze: [200, 220, 240, 0.26], snow: [251, 253, 255], snowSh: [136, 170, 214], icicle: [1.15], wet: [0], cold: [1] },
  };
  const PAL_MIX = { g: null, key: '', from: 'snow', to: 'snow', t0: -1e9, at: NaN, k: -1, cur: {} };
  function slopePal(g) {
    const key = SLOPE_PAL[g.seasonKey] ? g.seasonKey : 'snow', M = PAL_MIX;
    if (M.g !== g) { M.g = g; M.key = ''; }
    if (M.key !== key) { M.from = M.key ? M.to : key; M.to = key; M.key = key; M.t0 = M.from === key ? -1e9 : g.time; }
    if (g.time < M.t0) M.t0 = -1e9;
    const k = sstep(0, 4, g.time - M.t0);
    if (M.at === g.time && M.k === k) return M.cur;
    M.at = g.time; M.k = k;
    const A = SLOPE_PAL[M.from], Z = SLOPE_PAL[M.to];
    for (const n in A) {
      const a = A[n], b = Z[n], c = M.cur[n] || (M.cur[n] = []);
      for (let i = 0; i < a.length; i++) c[i] = a[i] + (b[i] - a[i]) * k;
    }
    return M.cur;
  }
  let tintAt = NaN, tintK = -1;
  function tint(g) {
    if (!g || !g.level) return;
    const P = slopePal(g);
    if (tintAt === PAL_MIX.at && tintK === PAL_MIX.k) return;
    tintAt = PAL_MIX.at; tintK = PAL_MIX.k;
    const a = P.snow, b = P.snowSh;
    SNOW = rgbOf(a, 1); SNOW_SH = rgbOf(b, 0.55); SNOW_DK = rgbOf([b[0] * 0.82, b[1] * 0.85, b[2] * 0.9], 0.55); SNOW_FACE = rgbOf(b, 0.34); ICE_K = P.icicle[0]; WET = P.wet[0]; COLD = P.cold[0];
  }
  const rgbOf = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a === undefined ? 1 : a, 0, 1).toFixed(3) + ')';
  const RIDGE = [[0, 0], [0.1, 40], [0.24, 92], [0.4, 140], [0.56, 176], [0.68, 198], [0.76, 204], [0.86, 184], [0.94, 118], [1, 0]];
  const ridgeH = (u) => {
    for (let i = 1; i < RIDGE.length; i++) if (RIDGE[i][0] >= u) { const a = RIDGE[i - 1], b = RIDGE[i], t = (u - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], t * t * (3 - 2 * t)); }
    return 0;
  };
  const PT = { x: 0, y: 0, w: 0 };
  function pisteAt(t, W) {
    PT.x = W * lerp(0.7, 0.29, t) + W * 0.045 * sin(t * PI * 2.2);
    PT.y = GY - lerp(ridgeH(0.7) - 10, -6, t);
    PT.w = lerp(8, 44, Math.pow(t, 0.9));
    return PT;
  }
  let slopeG = null;
  function slopeGeo(W) {
    if (slopeG && slopeG.W === W) return slopeG;
    const g = slopeG = { W, hill: new Path2D(), tips: new Path2D(), edge: new Path2D(), edgeTips: new Path2D(), piste: new Path2D(), lines: new Path2D(), meadow: new Path2D() };
    g.hill.moveTo(0, GY + 8);
    for (let i = 0; i <= 90; i++) { const u = i / 90; g.hill.lineTo(u * W, GY - ridgeH(u)); }
    g.hill.lineTo(W, GY + 8); g.hill.closePath();
    const L = [], R = [];
    for (let i = 0; i <= 48; i++) { const p = pisteAt(i / 48, W); L.push([p.x - p.w, p.y]); R.push([p.x + p.w, p.y]); }
    g.piste.moveTo(L[0][0], L[0][1]);
    for (const p of L) g.piste.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) g.piste.lineTo(R[i][0], R[i][1]);
    g.piste.closePath();
    for (let k = 1; k < 7; k++) {
      const f = k / 7;
      for (let i = 0; i <= 48; i++) { const x = lerp(L[i][0], R[i][0], f), y = L[i][1]; if (i) g.lines.lineTo(x, y); else g.lines.moveTo(x, y); }
    }
    const tree = (P, T, x, y, h) => {
      const w = h * 0.36;
      P.moveTo(x - w, y); P.lineTo(x, y - h); P.lineTo(x + w, y); P.closePath();
      T.moveTo(x - w * 0.45, y - h * 0.55); T.lineTo(x, y - h - 0.3); T.lineTo(x + w * 0.45, y - h * 0.55); T.closePath();
    };
    for (const side of [L, R]) {
      for (let i = 1; i < side.length; i++) {
        const t = i / 48, h = lerp(6, 15, t);
        for (let k = 0; k < 2; k++) {
          const f = (k + hash(i * 3.7 + k)) / 2, x = lerp(side[i - 1][0], side[i][0], f) + (side === L ? -1 : 1) * h * 0.1, y = lerp(side[i - 1][1], side[i][1], f) + h * 0.35;
          if (GY - y > ridgeH(x / W) - 2) continue;
          tree(g.edge, g.edgeTips, x, y, h * (0.8 + hash(i + k * 7) * 0.4));
        }
      }
    }
    for (let i = 0; i <= 140; i++) {
      const u = i / 140, x = u * W + (hash(i * 1.9) - 0.5) * 5, top = GY - ridgeH(u), h = 7 + hash(i * 2.3) * 6;
      if (top > GY - 14) continue;
      tree(g.edge, g.edgeTips, x, top + h * 0.45, h);
    }
    let row = 0;
    for (let y = GY - 2; y > GY - 210; y -= 9, row++) {
      const s = lerp(1.2, 0.7, (GY - y) / 210);
      for (let x = (row % 2) * 7 + hash(row) * 6; x < W; x += 15 * s + hash(x * 0.37 + y) * 5) {
        const top = GY - ridgeH(x / W);
        if (y < top + 6) continue;
        const t = clamp((GY - 6 - y) / (GY - 6 - (GY - ridgeH(0.7) + 10)), 0, 1), p = pisteAt(1 - t, W);
        if (abs(x - p.x) < p.w + 6) continue;
        const h = (6 + hash(x * 1.3 + y) * 4) * s, w = h * 0.36;
        g.tips.moveTo(x - w, y); g.tips.lineTo(x, y - h); g.tips.lineTo(x + w, y); g.tips.closePath();
      }
    }
    const ts = pisteAt(0, W);
    g.meadow.moveTo(ts.x + 34, ts.y - 2); g.meadow.ellipse(ts.x + 10, ts.y - 2, 24, 7, 0, 0, TAU);
    g.meadow.moveTo(W * 0.62 + 40, GY - 2); g.meadow.ellipse(W * 0.62, GY - 2, 40, 12, 0, 0, TAU);
    return g;
  }
  const SKI_COL = ['#e8402f', '#2f7ee0', '#f6c624', '#7b2fbf', '#25a35a', '#ff4fa3'];
  const HZ = {};

  const SLOPE_TOP = GY - 230, SLOPE_H = 240, SP = {};
  let slopeC = null;
  function hazed(A, Z, k, out) {
    const ha = lerp(A.haze[3], Z.haze[3], k);
    for (const n of ['open', 'forest', 'tip', 'piste', 'pisteSh', 'line']) {
      const o = out[n] || (out[n] = [0, 0, 0]);
      for (let i = 0; i < 3; i++) o[i] = lerp(lerp(A[n][i], Z[n][i], k), lerp(A.haze[i], Z.haze[i], k), ha);
    }
    return out;
  }
  function slopeStatic(c, G, P, W) {
    const ramp = (col, a) => {
      const gr = c.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, rgbOf(col, 0)); gr.addColorStop(0.11, rgbOf(col, a)); gr.addColorStop(0.89, rgbOf(col, a)); gr.addColorStop(1, rgbOf(col, 0));
      return gr;
    };
    c.fillStyle = ramp(P.forest, 1); c.fill(G.hill);
    c.fillStyle = ramp(P.tip, 0.55); c.fill(G.tips);
    c.fillStyle = ramp(P.open, 1); c.fill(G.meadow);
    c.fillStyle = rgbOf(P.pisteSh, 1); c.save(); c.translate(1.6, 1.2); c.fill(G.piste); c.restore();
    c.fillStyle = rgbOf(P.piste, 1); c.fill(G.piste);
    c.strokeStyle = rgbOf(P.line, 0.9); c.lineWidth = 0.6; c.stroke(G.lines);
    c.fillStyle = ramp(P.forest, 1); c.fill(G.edge);
    c.fillStyle = ramp(P.tip, 0.85); c.fill(G.edgeTips);
    const lb = [W * 0.4, GY - 4], lt = [W * 0.79, GY - ridgeH(0.79) + 5];
    c.strokeStyle = 'rgba(60,66,72,0.6)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(lb[0], lb[1] - 12); c.lineTo(lt[0], lt[1] - 9); c.stroke();
    c.fillStyle = 'rgba(66,72,80,0.85)';
    for (let i = 0; i <= 6; i++) {
      const k = i / 6, x = lerp(lb[0], lt[0], k), y = lerp(lb[1], lt[1], k), h = lerp(13, 8, k);
      c.fillRect(x - 0.6, y - h, 1.2, h); c.fillRect(x - 2.4, y - h - 0.6, 4.8, 1.2);
    }
    c.fillStyle = '#7d5a3e'; c.fillRect(lt[0] - 9, lt[1] - 9, 16, 9);
    c.fillStyle = rgbOf(P.piste, 1); poly(c, [lt[0] - 11, lt[1] - 8.6, lt[0] - 1, lt[1] - 15, lt[0] + 9, lt[1] - 8.6]);
    c.fillStyle = 'rgba(255,214,120,0.95)'; c.fillRect(lt[0] - 6, lt[1] - 6, 3, 2.4); c.fillRect(lt[0] + 1, lt[1] - 6, 3, 2.4);
  }

  function slope(ctx, g, viewW, offY) {
    tint(g);
    const Lv = g.level, S = Lv && Lv.slope;
    if (!S) return;
    const f = 0.6, c = g.cam + viewW / 2, X0 = viewW / 2 + f * (S.from - c), X1 = viewW / 2 + f * (S.to - c), W = Math.round(X1 - X0);
    if (X1 < -20 || X0 > viewW + 20 || W < 40) return;
    const Q = slopePal(g), M = PAL_MIX, G = slopeGeo(W), t = g.time, P = hazed(Q, Q, 0, HZ);
    const m = ctx.getTransform ? ctx.getTransform() : null, sc = clamp(m && m.a ? m.a : 1, 0.25, 4), my = m ? m.f + SLOPE_TOP * sc : 0, fy = my - Math.floor(my);
    const kq = Math.round(M.k * 10) / 10, sig = M.from + M.to + kq + '|' + W + '|' + sc.toFixed(3) + '|' + fy.toFixed(2);
    if (!slopeC || slopeC.sig !== sig) {
      const cv = slopeC ? slopeC.cv : document.createElement('canvas');
      cv.width = Math.ceil(W * sc) + 2; cv.height = Math.ceil(SLOPE_H * sc) + 2;
      const cc = cv.getContext('2d');
      cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, cv.width, cv.height);
      cc.setTransform(sc, 0, 0, sc, 0, -SLOPE_TOP * sc + fy);
      slopeStatic(cc, G, hazed(SLOPE_PAL[M.from], SLOPE_PAL[M.to], kq, SP), W);
      slopeC = { cv, sig };
    }
    const ox = m && m.a ? (Math.round(m.e + X0 * m.a) - m.e) / m.a : Math.round(X0);
    ctx.drawImage(slopeC.cv, ox, SLOPE_TOP - fy / sc, slopeC.cv.width / sc, slopeC.cv.height / sc);
    ctx.save(); ctx.translate(ox, 0);
    for (let i = 0; i < 4; i++) {
      const u = frac(t * 0.02 + i / 4), p = pisteAt(u, W);
      ctx.fillStyle = rgbOf(P.pisteSh, 0.5 * sin(PI * u)); ell(ctx, p.x + sin(u * 9 + i) * p.w * 0.4, p.y, p.w * 0.35, 0.8 + u);
    }
    const lb = [W * 0.4, GY - 4], lt = [W * 0.79, GY - ridgeH(0.79) + 5];
    for (let i = 0; i < 10; i++) {
      const k = frac(t * 0.012 + i / 10), x = lerp(lb[0], lt[0], k), y = lerp(lb[1] - 12, lt[1] - 9, k);
      ctx.fillStyle = SKI_COL[i % 6]; ctx.fillRect(x - 0.9, y + 1, 1.8, 2.2);
    }
    const ga = ctx.globalAlpha;
    for (let i = 0; i < 8; i++) {
      const sp = 0.03 + hash(i * 1.7) * 0.022, v = t * sp + hash(i * 3.1), k = Math.floor(v), s = v - k;
      const p = pisteAt(s, W), zz = sin(s * TAU * (2.5 + hash2(i, k) * 2) + hash2(k, i) * 6), x = p.x + zz * p.w * 0.62, y = p.y;
      const vx = cos(s * TAU * 4 + hash2(k, i) * 6), sc = lerp(0.9, 2, s), al = sstep(0, 0.05, s) * (1 - sstep(0.9, 1, s));
      if (al < 0.05) continue;
      ctx.globalAlpha = ga * al;
      ctx.fillStyle = rgbOf(P.pisteSh, 0.8); ell(ctx, x + 0.6 * sc, y + 0.3 * sc, 2.4 * sc, 0.5 * sc);
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 0.6 * sc; ctx.beginPath(); ctx.moveTo(x - 2.2 * sc, y + 0.3 * vx * sc); ctx.lineTo(x + 2.2 * sc, y - 0.3 * vx * sc); ctx.stroke();
      ctx.fillStyle = '#2f3a4a'; ctx.fillRect(x - 0.9 * sc, y - 2 * sc, 1.8 * sc, 2 * sc);
      ctx.fillStyle = SKI_COL[(i + k) % 6]; rr(ctx, x - 1.1 * sc, y - 4.4 * sc, 2.2 * sc, 2.8 * sc, 0.8 * sc);
      ctx.fillStyle = '#f0c8a0'; circle(ctx, x, y - 5 * sc, 0.85 * sc);
      ctx.fillStyle = SKI_COL[(i + k + 2) % 6]; ctx.beginPath(); ctx.arc(x, y - 5.1 * sc, 0.95 * sc, PI, TAU); ctx.fill();
      ctx.globalAlpha = ga;
    }
    const gp = t * 0.05, gs = 0.52 + 0.06 * sin(gp * 0.7), q = pisteAt(gs, W), gx = q.x + sin(gp) * q.w * 0.55, gy = q.y, face = cos(gp), gk = lerp(1, 1.5, gs);
    ctx.save(); ctx.translate(gx, gy); ctx.scale(gk * (abs(face) < 0.25 ? 0.25 * (face < 0 ? -1 : 1) : face), gk);
    const beam = ctx.createLinearGradient(5, 0, 32, 0);
    beam.addColorStop(0, 'rgba(255,238,170,0.7)'); beam.addColorStop(1, 'rgba(255,238,170,0)');
    ctx.fillStyle = beam; poly(ctx, [5, -3.8, 32, -9, 32, 3, 5, -1.2]);
    ctx.fillStyle = '#c6362b'; rr(ctx, -6, -6.6, 11, 4.6, 1);
    ctx.fillStyle = '#2b2f33'; rr(ctx, -7, -2.4, 13, 2.8, 1.2);
    ctx.fillStyle = '#9fc4dc'; ctx.fillRect(-1, -6.2, 3.4, 2.4);
    ctx.fillStyle = '#d9dee2'; ctx.fillRect(-9.5, -2.2, 2.6, 2.2);
    ctx.fillStyle = 'rgba(255,240,180,0.5)'; circle(ctx, 5.2, -2.8, 2.2);
    ctx.fillStyle = '#fff4c8'; circle(ctx, 5.2, -2.8, 0.9);
    const bk = Math.pow(Math.max(0, sin(t * 6)), 6);
    ctx.fillStyle = rgba('255,160,40', 0.55 * bk); circle(ctx, -2, -8.2, 3.2);
    ctx.fillStyle = bk > 0.3 ? '#ffb02e' : '#a5651d'; circle(ctx, -2, -7.4, 0.9);
    ctx.restore();
    ctx.restore();
  }

  Object.assign(API, { cannon, spray, feeder, stall, snowman, ice, hole, chata, deer, slope });
  const LOT = { wood: '#80583a', woodDk: '#58391f', bark: '#5b3f2a', net: 'rgba(240,236,224,0.42)', haze: 'rgba(196,204,210,0.42)' };
  const lotIdle = new WeakMap();
  function lotState(g) {
    if (g.lot) return g.lot;
    let k = lotIdle.get(g);
    if (!k) { k = ZS.sim.lot.create(g); lotIdle.set(g, k); }
    return k;
  }
  function lotCap(ctx, x, y0, hw, th, edge, n, sd, W) {
    const B = ZS.render.backdrop, t2 = th + 3, h2 = hw * (t2 / th), depth = (edge - (y0 - t2)) / t2;
    ctx.fillStyle = W.snowShade; B.cap(ctx, x + 1, y0 + 1.3, h2, t2, depth, n, sd);
    ctx.fillStyle = W.snow; B.cap(ctx, x - 0.4, y0, h2, t2, depth - 0.012, n, sd);
  }
  function fir(ctx, h, r, sd, W, bare) {
    const n = 3, base = -h * 0.16, s = (h * 0.84) / n, e = 0.36 + 0.68 * (1 - W.cap), dark = hash(sd) < 0.5 ? W.spruce : W.spruce2;
    ctx.fillStyle = LOT.bark; ctx.fillRect(-2, base - 4, 4, -base + 4);
    for (let i = 0; i < n; i++) {
      const y0 = base - s * i, hw = r * (1 - i / (n + 0.8)), th = s * 1.7;
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(-hw, y0); ctx.lineTo(0, y0 - th); ctx.lineTo(hw, y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.moveTo(-hw, y0); ctx.lineTo(hw, y0); ctx.lineTo(hw * 0.86, y0 - s * 0.22); ctx.lineTo(-hw * 0.86, y0 - s * 0.22); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, y0 - th); ctx.lineTo(hw, y0); ctx.lineTo(hw * 0.3, y0); ctx.closePath(); ctx.fill();
      if (bare) { ctx.fillStyle = W.snow; ell(ctx, -hw * 0.45, y0 - s * 0.5, 2.4, 1.3, 0.5); ell(ctx, hw * 0.2, y0 - s * 0.9, 1.8, 1, -0.4); continue; }
      lotCap(ctx, 0, y0, hw, th, i === n - 1 ? y0 - s * (e + 0.1) : y0 - s * e, Math.max(3, Math.round(hw / 8)), sd * 9 + i * 3.1, W);
      ctx.fillStyle = W.snow; ell(ctx, -hw + 3.2, y0 - 1.4, 2.6 + W.cap * 1.4, 1.8, -0.3); ell(ctx, hw - 3.2, y0 - 1.4, 2.6 + W.cap * 1.4, 1.8, 0.3);
    }
  }
  function cross(ctx) {
    ctx.fillStyle = LOT.woodDk; rr(ctx, -15, -4.5, 30, 4.5, 1.2);
    ctx.fillStyle = LOT.wood; rr(ctx, -15, -5.5, 30, 2.4, 1.2);
    ctx.fillStyle = LOT.woodDk; rr(ctx, -4.5, -8, 9, 8, 1.6);
    ctx.fillStyle = 'rgba(255,230,190,0.18)'; ctx.fillRect(-4, -7.5, 8, 1.2);
  }
  function tag(ctx, x, y, sd, time) {
    const sw = sin(time * 1.3 + sd * 7) * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    line(ctx, 0, 0, 0, 4, 0.7, '#c0392b');
    ctx.fillStyle = '#f4efe2'; rr(ctx, -4.2, 4, 8.4, 5.6, 1);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-2.8, 5.8, 5.6, 0.9); ctx.fillRect(-2.8, 7.4, 3.6, 0.9);
    ctx.restore();
  }
  function netted(ctx, x, h, a, sd, W, haze) {
    const w = 9.5 + 4 * hash(sd), dark = hash(sd + 1) < 0.5 ? W.spruce : W.spruce2;
    const body = () => {
      ctx.beginPath(); ctx.moveTo(0, -h);
      ctx.quadraticCurveTo(w * 1.15, -h * 0.42, w * 0.55, -9); ctx.lineTo(-w * 0.55, -9);
      ctx.quadraticCurveTo(-w * 1.15, -h * 0.42, 0, -h); ctx.closePath();
    };
    ctx.save(); ctx.translate(x, GY); ctx.rotate(a);
    ctx.fillStyle = LOT.bark; rr(ctx, -2, -12, 4, 12, 1);
    ctx.fillStyle = dark;
    for (let j = 0; j < 7; j++) {
      const u = (j + 0.6) / 7.4, y = -11 - u * (h - 16), hw = w * 0.9 * sin(PI * Math.min(1, (1 - u) * 0.95 + 0.08)), sp = 3 + 2 * hash(sd + j);
      for (const sx of [-1, 1]) poly(ctx, [sx * hw * 0.7, y - 3, sx * (hw + sp), y + 1.5 + hash(sd * 3 + j) * 2, sx * hw * 0.7, y + 3]);
    }
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(w * 0.12, -h, w * 1.3, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(-w * 1.2, -h, w * 0.7, h);
    ctx.strokeStyle = LOT.net; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let y = -h - w * 2; y < 0; y += 6.2) { ctx.moveTo(-w * 1.3, y); ctx.lineTo(w * 1.3, y + w * 1.7); ctx.moveTo(w * 1.3, y); ctx.lineTo(-w * 1.3, y + w * 1.7); }
    ctx.stroke();
    ctx.fillStyle = W.snow;
    for (let j = 0; j < 4; j++) ell(ctx, -w * 0.55 + hash(sd + j * 2) * w * 0.6, -h * (0.3 + 0.16 * j), 2.6 + hash(sd + j) * 1.6, 1.3, -0.4 - a);
    if (haze) { ctx.fillStyle = LOT.haze; ctx.fillRect(-w * 1.4, -h, w * 2.8, h); }
    ctx.restore();
    ctx.fillStyle = '#eae4d4'; ell(ctx, 0, -h + 4, 1.8, 1.3); ell(ctx, 0, -10, w * 0.5, 1.5);
    ctx.restore();
  }
  function barrel(ctx, x, time, sd) {
    const fl = 0.85 + 0.15 * sin(time * 9 + sd) * sin(time * 5.3);
    ctx.save(); ctx.translate(x, GY);
    const gl = ctx.createRadialGradient(0, -40, 4, 0, -30, 96);
    gl.addColorStop(0, rgba('255,176,90', 0.3 * fl)); gl.addColorStop(0.45, rgba('255,150,70', 0.1 * fl)); gl.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = gl; ctx.fillRect(-96, -136, 192, 138);
    ctx.fillStyle = 'rgba(96,84,74,0.26)'; ell(ctx, 0, 1, 25, 3.4);
    ctx.fillStyle = '#46413d'; rr(ctx, -13, -36, 26, 36, 2.4);
    ctx.fillStyle = 'rgba(142,72,32,0.55)'; ell(ctx, -6, -11, 4.6, 6.4, 0.3); ell(ctx, 7, -27, 3.6, 4.6, -0.2); ell(ctx, 3, -5, 3, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fillRect(4, -36, 9, 36);
    ctx.fillStyle = 'rgba(255,214,170,0.14)'; ctx.fillRect(-11, -36, 2.6, 36);
    line(ctx, -13, -24, 13, -24, 1.6, '#2c2826'); line(ctx, -13, -12, 13, -12, 1.6, '#2c2826');
    for (let i = 0; i < 3; i++) {
      const hx = -7 + i * 7, f = 0.6 + 0.4 * sin(time * 7 + i * 2 + sd);
      ctx.fillStyle = rgba('255,150,50', 0.35 * f); circle(ctx, hx, -18, 3.2);
      ctx.fillStyle = rgba('255,206,110', 0.9 * f); circle(ctx, hx, -18, 1.4);
    }
    ctx.fillStyle = '#2c2826'; ell(ctx, 0, -36, 13.6, 2.6);
    ctx.fillStyle = rgba('255,120,40', 0.9); ell(ctx, 0, -36.2, 11, 1.7);
    const tongue = (fx, fh, wd, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(fx - wd, -36);
      ctx.quadraticCurveTo(fx - wd * 0.9, -36 - fh * 0.62, fx + sin(time * 5.1 + fx) * 2.2, -36 - fh);
      ctx.quadraticCurveTo(fx + wd * 0.9, -36 - fh * 0.55, fx + wd, -36); ctx.closePath(); ctx.fill();
    };
    for (let i = 0; i < 4; i++) {
      const fx = -7.5 + i * 5, fh = 15 + 7 * sin(time * 7.3 + i * 1.9 + sd) + 4 * sin(time * 11.7 + i * 3.1);
      tongue(fx, fh, 4.4, rgba('232,84,36', 0.92)); tongue(fx, fh * 0.72, 3, rgba('255,160,52', 0.95)); tongue(fx, fh * 0.42, 1.8, rgba('255,226,128', 0.95));
    }
    for (let i = 0; i < 6; i++) {
      const u = frac(time * 0.75 + i / 6 + sd), a = (1 - u) * sstep(0, 0.08, u);
      ctx.fillStyle = rgba('255,196,96', a); circle(ctx, sin(u * 8 + i * 2) * 6 + (hash(i * 1.3 + sd) - 0.5) * 12, -46 - u * 62, 1);
    }
    smoke(ctx, 0, -64, time, sd, 0.7);
    ctx.restore();
  }
  function priceBoard(ctx, x, sd) {
    const P = ZS.LABELS.lot.price;
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = LOT.woodDk; poly(ctx, [-20, 0, -17, 0, -10, -50, -13, -50]); poly(ctx, [20, 0, 17, 0, 10, -50, 13, -50]);
    ctx.fillStyle = LOT.wood; rr(ctx, -22, -52, 44, 42, 2);
    ctx.fillStyle = '#2f3633'; rr(ctx, -19.5, -49.5, 39, 37, 1.4);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ell(ctx, -6, -36, 12, 8, -0.4);
    for (let i = 0; i < P.length; i++) {
      const col = i === P.length - 1 ? 'rgba(255,190,200,0.9)' : 'rgba(242,242,234,0.92)';
      txt(ctx, P[i], 0, -42 + i * 11, fitText(ctx, P[i], 6.6, 700, 34), col, 700);
    }
    line(ctx, -15, -16.5, 15, -17.5, 0.7, 'rgba(255,190,200,0.75)');
    snowCap(ctx, -22, 22, -52, 2.4, 61 + sd);
    ctx.restore();
  }
  function booth(ctx, o, time, sd, W) {
    const S = ZS.LABELS.lot.sign, lamp = 0.85 + 0.1 * sin(time * 2.1 + sd * 4);
    ctx.save(); ctx.translate(o.booth, GY);
    ctx.fillStyle = 'rgba(70,92,125,0.16)'; ell(ctx, 0, 1.2, 50, 4);
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-36, -94, 72, 94);
    ctx.strokeStyle = 'rgba(50,25,10,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -29; x < 36; x += 7.2) { ctx.moveTo(x, -94); ctx.lineTo(x, 0); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-36, -10, 72, 10); ctx.fillRect(22, -94, 14, 94);
    ctx.fillStyle = '#2b1b10'; ctx.fillRect(-28, -80, 56, 32);
    const gl = ctx.createRadialGradient(0, -74, 2, 0, -64, 40);
    gl.addColorStop(0, rgba('255,206,130', 0.5 * lamp)); gl.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = gl; ctx.fillRect(-28, -80, 56, 32);
    line(ctx, 0, -80, 0, -73, 0.8, '#222'); ctx.fillStyle = '#ffe2a0'; circle(ctx, 0, -71.5, 2.2);
    ctx.strokeStyle = 'rgba(236,230,214,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(-24 + i * 3, -80); ctx.lineTo(-27 + i * 4, -54); }
    ctx.stroke();
    ctx.fillStyle = '#c0392b'; rr(ctx, 9, -61, 7, 12, 2); ctx.fillStyle = '#e9e1cf'; rr(ctx, 9.5, -63.5, 6, 3, 1);
    ctx.fillStyle = '#2f6a4a'; rr(ctx, -16, -55, 16, 7, 1.2); ctx.fillStyle = '#1f4a33'; ctx.fillRect(-16, -55, 16, 2);
    ctx.fillStyle = '#ad7845'; rr(ctx, -33, -50, 66, 5, 1.4);
    ctx.fillStyle = 'rgba(255,235,200,0.3)'; ctx.fillRect(-32, -50, 64, 1.1);
    snowCap(ctx, -33, -18, -50, 2.2, 71 + sd); snowCap(ctx, 20, 33, -50, 2, 73 + sd);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f1ebe0' : '#b8322a'; ctx.fillRect(-38 + i * 9.5, -88, 9.5, 7); }
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f1ebe0' : '#b8322a'; ell(ctx, -33.25 + i * 9.5, -81, 4.75, 2.4); }
    ctx.fillStyle = '#3e2818'; ctx.fillRect(-44, -98, 88, 5);
    snowCap(ctx, -46, 46, -98, 4, 79 + sd);
    ctx.fillStyle = 'rgba(200,228,245,0.9)';
    for (let i = 0; i < 8; i++) { const ix = -40 + i * 11 + hash(i * 2.3 + sd) * 4, il = (2.2 + hash(i * 4.7 + sd) * 5) * ICE_K; poly(ctx, [ix - 1.1, -93, ix + 1.1, -93, ix, -93 + il]); }
    ctx.fillStyle = LOT.woodDk; ctx.fillRect(-30, -104, 3, 8); ctx.fillRect(27, -104, 3, 8);
    ctx.fillStyle = '#5d3b22'; rr(ctx, -42, -132, 84, 30, 2.6);
    ctx.fillStyle = '#1f5a3a'; rr(ctx, -39.5, -129.5, 79, 25, 1.8);
    ctx.strokeStyle = '#e8c27a'; ctx.lineWidth = 0.8; ctx.strokeRect(-37.5, -127.5, 75, 21);
    const fs = Math.min(fitText(ctx, S[0], 9, 900, 64), fitText(ctx, S[1], 9, 900, 64));
    txt(ctx, S[0], 0, -122, fs, '#fff1cf', 900, 0.5); txt(ctx, S[1], 0, -112, fs, '#fff1cf', 900, 0.5);
    snowCap(ctx, -42, 42, -132, 3, 83 + sd);
    const lp = [];
    for (let i = 0; i <= 9; i++) lp.push(-40 + i * 80 / 9, -102 + 2.4 * sin(PI * i / 9));
    lights(ctx, lp, time, sd);
    ctx.restore();
  }
  function seller(ctx, o, g, k) {
    if (k.seller !== 'calm') return;
    const h = k.sh || (k.sh = { aimAt: [0, 0], look: ZS.sim.lot.LOOK });
    Object.assign(h, { x: o.seller, y: GY, dir: -1, kind: 'guest', state: 'idle', outfit: 'winter', cold: g.bear.cold, armed: true, empty: false, scared: false, clutch: false, texting: false, kick: 0 });
    ZS.drawHuman(ctx, h, g.time);
  }
  function lot(ctx, o, g) {
    tint(g);
    const W = ZS.render.backdrop.look(g), k = lotState(g), time = g.time, sd = hash(o.from * 0.013);
    const [ra, rb] = o.rack, span = rb - ra, n = Math.floor((span - 6) / 26) + 1;
    ctx.fillStyle = 'rgba(70,92,125,0.14)'; ell(ctx, (ra + rb) / 2, GY + 1, span / 2 + 30, 4);
    for (let i = 0; i < n; i++) {
      const x = ra + 16 + i * 26 + (hash(i * 3.3 + 7) - 0.5) * 6;
      netted(ctx, x, 98 + 24 * hash(i * 1.9 + 3), 0.1 + (hash(i * 5.1) - 0.5) * 0.1, i * 2.7 + 11, W, true);
    }
    ctx.fillStyle = LOT.woodDk;
    for (const px of [ra, (ra + rb) / 2, rb]) { ctx.fillRect(px - 2.5, GY - 80, 5, 80); ctx.fillStyle = 'rgba(255,230,190,0.15)'; ctx.fillRect(px - 2.5, GY - 80, 1.2, 80); ctx.fillStyle = LOT.woodDk; }
    ctx.fillStyle = LOT.wood; rr(ctx, ra - 10, GY - 76, span + 20, 5, 2);
    ctx.fillStyle = 'rgba(255,235,200,0.22)'; ctx.fillRect(ra - 9, GY - 76, span + 18, 1.2);
    snowCap(ctx, ra - 10, rb + 10, GY - 76, 2.6, 41 + sd);
    for (let i = 0; i < n; i++) {
      const x = ra + 6 + i * 26 + (hash(i * 4.1) - 0.5) * 8, flip = i % 4 === 2;
      netted(ctx, x, 108 + 30 * hash(i * 1.7), flip ? 0.16 : -0.17 + (hash(i * 5.3) - 0.5) * 0.12, i * 1.3 + 2, W, false);
    }
    for (let i = 0; i < o.stands.length; i++) {
      const x = o.stands[i], h = 92 + 22 * hash(x * 0.11), r = h * 0.34, s = hash(x * 0.21);
      ctx.save(); ctx.translate(x, GY);
      ctx.fillStyle = 'rgba(70,92,125,0.18)'; ell(ctx, 0, 1, 20, 2.6);
      fir(ctx, h, r, s, W);
      cross(ctx);
      tag(ctx, r * 0.52, -h * 0.34, s, time);
      ctx.restore();
    }
    barrel(ctx, o.barrel, time, sd);
    booth(ctx, o, time, sd, W);
    priceBoard(ctx, o.booth + 58, sd);
    seller(ctx, o, g, k);
  }
  function lotFront(ctx, o, g) {
    tint(g);
    const W = ZS.render.backdrop.look(g), k = lotState(g), time = g.time;
    for (const t of k.front) {
      const s = hash(t.x * 0.29), r = t.h * 0.4;
      let a = t.sway + sin(time * 1.4 + s * 9) * 0.012;
      if (t.down) {
        const f = t.fall, e = f * f, bounce = f > 0.8 ? sin((f - 0.8) / 0.2 * PI) * 0.07 : 0;
        a = t.dir * ((PI / 2 - 0.06) * e - bounce);
        ctx.save(); ctx.translate(t.x, GY); cross(ctx); ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.rect(t.x - 140, GY - 220, 280, 221.5); ctx.clip();
        ctx.translate(t.x + t.dir * 9 * e, GY - 8 - r * 0.42 * e); ctx.rotate(a);
        fir(ctx, t.h, r, s, W, f > 0.25);
        ctx.restore();
        ctx.fillStyle = W.snow;
        if (f > 0.6) {
          const m = sstep(0.6, 1, f), x0 = t.x + t.dir * 14, x1 = t.x + t.dir * (t.h * 0.95);
          blob(ctx, [x0, GY + 2, lerp(x0, x1, 0.3), GY - 3 * m, lerp(x0, x1, 0.7), GY - 4 * m, x1, GY + 2]);
        }
        blob(ctx, [t.x - 14, GY + 2, t.x - 7, GY - 2.5, t.x + 6, GY - 3, t.x + 14, GY + 2]);
        continue;
      }
      ctx.save();
      ctx.translate(t.x, GY); ctx.rotate(a);
      fir(ctx, t.h, r, s, W);
      cross(ctx);
      tag(ctx, -r * 0.5, -t.h * 0.3, s, time);
      ctx.restore();
      ctx.fillStyle = W.snow;
      blob(ctx, [t.x - 18, GY + 2, t.x - 9, GY - 3, t.x + 7, GY - 3.5, t.x + 18, GY + 2]);
    }
  }
  Object.assign(API, { lot, lotFront });
  const ANGLER = { skin: '#e8b894', skinDk: '#cf9c78', coat: '#e07a2e', coatDk: '#b85f1f', pants: '#2f3b52', pantsDk: '#252f42', boot: '#f2f2f2', sole: '#c0392b', cap: '#2c5aa0', capDk: '#1f4378', seat: '#3c4a3e', leg: '#7d858d', cup: '#c0392b' };
  function stool(ctx) {
    ctx.lineCap = 'round';
    line(ctx, -8, 0, 7, -15, 1.6, ANGLER.leg); line(ctx, 8, 0, -7, -15, 1.6, ANGLER.leg);
    ctx.fillStyle = ANGLER.seat; rr(ctx, -10, -17.5, 20, 3.2, 1.2);
  }
  function tails(ctx, x, time) {
    for (const [dx, h, a] of [[-3.5, 7, -0.25], [2.5, 9, 0.18], [0, 5, 0.05]]) {
      ctx.save(); ctx.translate(x + dx, GY - 11.6); ctx.rotate(a + sin(time * 1.7 + dx) * 0.03);
      ctx.fillStyle = '#8fa6b2'; rr(ctx, -1.7, -h, 3.4, h, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-1, -h + 1, 0.9, h - 2);
      ctx.fillStyle = '#6f8794'; poly(ctx, [0, -h + 1, -3.6, -h - 3.4, -1, -h - 1.6, 0, -h - 2.6, 1, -h - 1.6, 3.6, -h - 3.4]);
      ctx.restore();
    }
  }
  function fisher(ctx, o, g) {
    tint(g);
    const time = g.time, sd = hash(o.x * 0.017), it = g.level.items.find((i) => i.type === 'catch');
    if (it && !it.eaten) tails(ctx, it.x, time);
    ctx.save(); ctx.translate(o.x, GY);
    if (o.gone) {
      ctx.save(); ctx.translate(7, -2.5); ctx.rotate(1.38); stool(ctx); ctx.restore();
      ctx.save(); ctx.translate(-15, -2.2); ctx.rotate(-1.4); ctx.fillStyle = ANGLER.cup; rr(ctx, -3, -7, 6, 7, 1.2); ctx.restore();
      ctx.fillStyle = 'rgba(150,90,50,0.35)'; ell(ctx, -21, 0.6, 6, 1.2);
      ctx.restore();
      return;
    }
    const A = ANGLER, bob = sin(time * 1.1 + sd * 5) * 0.5;
    ctx.fillStyle = 'rgba(70,92,125,0.2)'; ell(ctx, -3, 1, 20, 2.8);
    stool(ctx);
    limb(ctx, 3, -20, -10, -21, 7.5, 6.5, A.pantsDk); limb(ctx, -10, -21, -11, -4, 6.2, 5.4, A.pantsDk);
    ctx.fillStyle = '#d9dde0'; rr(ctx, -17, -6, 9.5, 6, 2); ctx.fillStyle = A.sole; ctx.fillRect(-17, -1.4, 9.5, 1.4);
    ctx.save(); ctx.translate(2, -21); ctx.rotate(bob * 0.03); ctx.translate(-2, 21);
    limb(ctx, 2, -23, -2, -40 + bob, 14, 13, A.coat);
    ctx.fillStyle = A.coat; rr(ctx, -6, -27, 15, 8, 3);
    ctx.fillStyle = A.coatDk; ell(ctx, 3.5, -40 + bob, 5, 3.4); rr(ctx, -6.5, -30, 8, 5, 1.6);
    line(ctx, -4.5, -38 + bob, -5, -33.5, 0.6, '#f4efe6'); line(ctx, -2.5, -38 + bob, -2.6, -34, 0.6, '#f4efe6');
    const hy = -49 + bob;
    ctx.fillStyle = A.skinDk; rr(ctx, -5.5, hy + 4, 4, 5, 1.4);
    ctx.fillStyle = A.skin; circle(ctx, -4, hy, 6.6);
    ctx.fillStyle = A.skinDk; ell(ctx, -1, hy + 0.4, 1.5, 2.1); ell(ctx, -10.4, hy + 0.8, 1.6, 1.2);
    ctx.strokeStyle = '#26221f'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(-7.8, hy - 0.6, 1.9, 0, TAU); ctx.moveTo(-5.9, hy - 1); ctx.lineTo(-1.8, hy - 1.2); ctx.stroke();
    line(ctx, -9.2, hy + 3.4, -7, hy + 3.6, 0.7, '#7a4a3a');
    ctx.fillStyle = A.cap; ctx.beginPath(); ctx.ellipse(-4, hy - 3.4, 7, 5.2, 0, PI, TAU); ctx.fill();
    ctx.fillStyle = A.capDk; rr(ctx, -14.5, hy - 4.4, 8.5, 2, 1); circle(ctx, -4, hy - 8.4, 1);
    snowCap(ctx, -8, 0, hy - 7.2, 1, 91 + sd);
    limb(ctx, 1, -20, -12, -20, 8, 7, A.pants); limb(ctx, -12, -20, -13.5, -4.5, 6.6, 5.6, A.pants);
    ctx.fillStyle = A.boot; rr(ctx, -20, -6.5, 10.5, 6.5, 2.2); ctx.fillStyle = A.sole; ctx.fillRect(-20, -1.5, 10.5, 1.5);
    limb(ctx, -1, -38 + bob, -5, -29, 5, 4.6, A.coatDk);
    limb(ctx, -5, -29, -11.5, -32, 4.6, 4.2, A.coat);
    ctx.fillStyle = A.cup; rr(ctx, -15.5, -38.5, 6.4, 7.4, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-14.6, -37.6, 1.2, 5.6);
    ctx.fillStyle = A.skin; circle(ctx, -11.5, -32, 2.3);
    steam(ctx, -12.4, -40, time, sd, 0.45, 0.42);
    const u = frac(time * 0.32 + sd), puff = 0.3 * sstep(0, 0.1, u) * (1 - sstep(0.1, 0.45, u));
    if (puff > 0.01) { ctx.fillStyle = rgba('248,250,252', puff); circle(ctx, -13 - u * 16, hy + 3 - u * 6, 2 + u * 7); }
    ctx.restore();
    ctx.restore();
  }
  Object.assign(API, { fisher });
})();
