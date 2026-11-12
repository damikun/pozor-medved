(function () {
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, hypot = Math.hypot, atan2 = Math.atan2;
  const { circle, ellipse: ell, rrect: rr } = ZS.gfx;
  const { clamp, lerp, frac } = ZS.util;

  const D = { thigh: 15.6, shin: 15.2, hip: 33, tor: 21, neck: 10.5, hr: 7, ua: 11.6, fa: 11 };

  const SKIN = ['#f0c8a6', '#eac2a0', '#f3cfb3', '#e2ae88', '#f6d2b6', '#e8b894'];
  const HAIR = ['#5a3a22', '#2a201a', '#8a4a26', '#c9873a', '#3a2c22', '#6a4a2a'];
  const MEN = [
    { vest: '#1e2a44', emb: ['#d6336c', '#f2c230', '#2f9e44'], pants: '#f4efe4', belt: '#5a3a22', hat: '#1c1a18', band: '#c4262e', sleeve: '#f7f3ea' },
    { vest: '#5a1f24', emb: ['#f2c230', '#2f6db0', '#f7f3ea'], pants: '#f4efe4', belt: '#3a2618', hat: '#1c1a18', band: '#2f6db0', sleeve: '#f7f3ea' },
    { vest: '#1f3a2a', emb: ['#e03131', '#f2c230', '#f7f3ea'], pants: '#2a2622', belt: '#5a3a22', hat: '#1c1a18', band: '#e8590c', sleeve: '#f7f3ea' },
    { vest: '#232326', emb: ['#e64980', '#4dabf7', '#f2c230'], pants: '#f4efe4', belt: '#6a4428', hat: '#2a2622', band: '#2f9e44', sleeve: '#f7f3ea' },
  ];
  const WOMEN = [
    { skirt: '#c4262e', apron: '#1e2a5a', vest: '#1f4a2a', emb: ['#f2c230', '#f7f3ea', '#e64980'], boots: '#b8322a', ribbon: '#e64980', print: '#f7f3ea' },
    { skirt: '#1d4f9a', apron: '#7a1f2a', vest: '#7a1f2a', emb: ['#f2c230', '#2f9e44', '#f7f3ea'], boots: '#1c1a18', ribbon: '#f2c230', print: '#f2c230' },
    { skirt: '#2f6a34', apron: '#1c1a18', vest: '#c4262e', emb: ['#f7f3ea', '#4dabf7', '#f2c230'], boots: '#b8322a', ribbon: '#4dabf7', print: '#f7f3ea' },
    { skirt: '#7a2a8a', apron: '#1e2a5a', vest: '#1c1a18', emb: ['#e03131', '#f2c230', '#2f9e44'], boots: '#1c1a18', ribbon: '#e03131', print: '#e9d9a6' },
  ];
  const CIVIL = [
    { top: '#e8590c', pants: '#2f3b52', hat: null }, { top: '#2f86c8', pants: '#cbb98d', hat: '#e9d9a6' }, { top: '#f8f9fa', pants: '#343a40', hat: null },
    { top: '#c2255c', pants: '#212529', hat: null }, { top: '#2b8a3e', pants: '#495057', hat: '#c92a2a' }, { top: '#fab005', pants: '#364fc7', hat: null },
    { top: '#7048e8', pants: '#dee2e6', hat: '#e9d9a6' }, { top: '#495057', pants: '#2f3b52', hat: null }, { top: '#1098ad', pants: '#cbb98d', hat: null },
  ];

  function dk(hex, k) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16), c = (s) => Math.min(255, Math.round(((n >> s) & 255) * k));
    return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
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

  function knee(hx, hy, fx, fy, a, b, bend) {
    let dx = fx - hx, dy = fy - hy, d = hypot(dx, dy);
    const max = a + b - 0.1;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    const ang = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d || 1), -1, 1)), base = atan2(dy, dx);
    const t = base - bend * ang;
    return [hx + cos(t) * a, hy + sin(t) * a, hx + dx, hy + dy];
  }

  function pose(f, time) {
    const p = f.pose || 'stand', ph = (f.t !== undefined ? f.t : time) * (f.speed || 1) + (f.seed || 0);
    const P = { hip: D.hip, lean: 0, lx: 3, ly: 0, rx: -3, ry: 0, ua: [0.08, -0.06], fa: [-0.15, -0.15], y: 0, skirt: 0, kneel: 0, head: 0 };
    if (p === 'walk') {
      const c = f.walkX !== undefined ? (f.walkX / (32 * (f.scale || 1)) + (f.seed || 0)) * TAU : ph * TAU * 0.9, s = sin(c);
      P.lx = s * 8; P.rx = -s * 8; P.ly = Math.max(0, cos(c)) * 4; P.ry = Math.max(0, -cos(c)) * 4;
      P.hip = D.hip - 0.6 + abs(cos(c)) * 1; P.ua = [-s * 0.38, s * 0.38]; P.fa = [-0.2 - max(0, -s) * 0.25, -0.2 - max(0, s) * 0.25]; P.lean = 0.03;
    } else if (p === 'dance') {
      const c = ph * TAU * 1.6, s = sin(c), up = abs(sin(c));
      P.y = -up * 5; P.lx = 5 + s * 4; P.rx = -5 + s * 4; P.ly = s > 0 ? up * 7 : 0; P.ry = s < 0 ? up * 7 : 0;
      P.ua = [-2.4 + s * 0.2, -2.6 - s * 0.2]; P.fa = [-0.6, -0.6]; P.skirt = up; P.head = s * 0.08;
    } else if (p === 'spin') {
      const c = ph * TAU * 1.2;
      P.y = -abs(sin(c * 2)) * 2; P.lx = sin(c) * 5; P.rx = -sin(c) * 5; P.ua = [-1.4, 0.9]; P.fa = [-1.2, 0.6]; P.skirt = 0.6 + 0.4 * abs(sin(c)); P.spin = c; P.ua = [-2.1, -2.3]; P.fa = [-0.5, -0.5];
    } else if (p === 'squat') {
      const c = ph * TAU * 1.8, s = sin(c);
      P.hip = 18 + abs(s) * 4; P.lx = 9 + (s > 0 ? s * 12 : 0); P.ly = s > 0 ? s * 9 : 0; P.rx = -6; P.ry = 0; P.ua = [-1.5, -1.25]; P.fa = [-0.2, -0.3]; P.lean = -0.08;
    } else if (p === 'jump') {
      const c = frac(ph * 0.9), u = c < 0.6 ? c / 0.6 : 0;
      P.y = -4 * u * (1 - u) * 34; P.lx = 6; P.rx = -8; P.ly = u > 0 ? 12 : 0; P.ry = u > 0 ? 10 : 0; P.ua = [-2.5, -2.3]; P.fa = [-0.4, -0.4];
    } else if (p === 'clap') {
      const c = ph * TAU * 2.2, s = sin(c);
      P.ua = [-0.9, -0.7]; P.fa = [-1.4 - s * 0.3, -1.3 + s * 0.3]; P.y = -abs(s) * 1;
    } else if (p === 'wave') {
      const s = sin(ph * TAU * 1.4);
      P.ua = [-2.6, 0.1]; P.fa = [-0.4 + s * 0.6, 0.3];
    } else if (p === 'stomp') {
      const c = ph * TAU * 1.4, s = sin(c);
      P.ly = s > 0 ? s * 6 : 0; P.lx = 4; P.rx = -4; P.ua = [0.6, 0.6]; P.fa = [1.6, 1.6]; P.y = 0;
    } else if (p === 'sit') {
      P.hip = 16; P.lx = 14; P.ly = 0; P.rx = 12; P.ry = 0; P.sit = true; P.ua = [0.3, 0.2]; P.fa = [1.1, 1];
    } else {
      const b = sin(ph * TAU * 0.4);
      P.y = b * 0.4; P.ua = [0.06 + b * 0.02, -0.06]; P.fa = [-0.12, -0.15];
    }
    return P;
  }

  function play(f, P, time) {
    const i = f.instr, ph = (f.t !== undefined ? f.t : time) + (f.seed || 0);
    if (!i) return;
    const s = sin(ph * TAU * 2);
    if (i === 'fiddle') { P.ua = [-1.6, -0.5 + s * 0.35]; P.fa = [-2.2, -1.8 + s * 0.5]; P.head = 0.25; }
    else if (i === 'bass') { P.ua = [-0.6, 0.5 + s * 0.3]; P.fa = [-1.4, 1.2 - s * 0.4]; }
    else if (i === 'cimbal') { P.ua = [0.9 + s * 0.2, 0.9 - s * 0.2]; P.fa = [-0.1 + s * 0.5, -0.1 - s * 0.5]; }
    else if (i === 'gajdy' || i === 'heligonka') { P.ua = [-0.4, 0.4]; P.fa = [-1.8, -1.2 + (i === 'heligonka' ? s * 0.2 : 0)]; }
    else if (i === 'fujara') { P.ua = [-0.9, -1.8]; P.fa = [-1.6, -1.2]; P.head = 0.1; }
    else if (i === 'flag') { P.ua = [-1.1, -0.7]; P.fa = [-1.2, -1.5]; }
    else if (i === 'valaska') { P.ua = [-2.8, P.ua[1]]; P.fa = [-0.2, P.fa[1]]; }
    else if (i === 'clipboard') { P.ua = [-0.6, 0.2]; P.fa = [-1.6, 0.4]; }
    else if (i === 'phone') { P.ua = [-0.9, P.ua[1]]; P.fa = [-2, P.fa[1]]; }
  }

  function arm(sx, sy, ua, fa, s) {
    const ex = sx + sin(ua) * D.ua * s, ey = sy + cos(ua) * D.ua * s;
    const wx = ex + sin(ua + fa) * D.fa * s, wy = ey + cos(ua + fa) * D.fa * s;
    return [ex, ey, wx, wy];
  }

  function embroidery(ctx, x, y, w, h, cols, seed) {
    const n = Math.max(2, Math.floor(h / 3.2));
    for (let i = 0; i < n; i++) {
      const yy = y + (i + 0.5) * (h / n), c = cols[(i + seed) % cols.length];
      ctx.fillStyle = c; circle(ctx, x + w * 0.5, yy, 0.95);
      ctx.fillStyle = cols[(i + seed + 1) % cols.length];
      circle(ctx, x + w * 0.5 - 1.3, yy + 0.6, 0.5); circle(ctx, x + w * 0.5 + 1.3, yy + 0.6, 0.5);
    }
  }

  function krpec(ctx, x, y, dir, col) {
    ctx.fillStyle = col || '#6a4428';
    ctx.beginPath(); ctx.moveTo(x - 3.2, y - 1.6); ctx.quadraticCurveTo(x + 7 * dir, y - 3.4, x + 8.2 * dir, y); ctx.lineTo(x - 3.6, y + 0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,10,0.7)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y - 5.4); ctx.moveTo(x - 2.6, y - 4.6); ctx.lineTo(x + 2.2, y - 8); ctx.stroke();
  }

  function hatM(ctx, x, y, L, time, seed) {
    ctx.fillStyle = L.hat; ell(ctx, x, y + 1.2, 9.6, 2.1);
    ctx.beginPath(); ctx.moveTo(x - 5.6, y + 1); ctx.quadraticCurveTo(x - 5.8, y - 5.6, x, y - 5.8); ctx.quadraticCurveTo(x + 5.8, y - 5.6, x + 5.6, y + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = L.band; ctx.fillRect(x - 5.7, y - 1.4, 11.4, 1.8);
    const sw = sin(time * 2.4 + seed) * 0.12;
    ctx.save(); ctx.translate(x - 4.4, y - 1); ctx.rotate(-0.5 + sw);
    ctx.fillStyle = '#f7f3ea'; ell(ctx, 0, -6, 1.3, 6);
    ctx.fillStyle = '#d6336c'; circle(ctx, 0, -0.6, 1.2);
    ctx.fillStyle = '#2f9e44'; circle(ctx, 1.2, 0.2, 0.8);
    ctx.restore();
    ctx.strokeStyle = L.band; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x - 5.6, y - 0.5); ctx.quadraticCurveTo(x - 9, y + 4 + sw * 6, x - 8, y + 9); ctx.stroke();
  }

  function parta(ctx, x, y, L, time, seed) {
    ctx.fillStyle = L.ribbon; ctx.fillRect(x - 6.4, y - 0.6, 12.4, 2.4);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = L.emb[i % L.emb.length]; circle(ctx, x - 5 + i * 2.5, y - 0.8, 1.15); }
    const sw = sin(time * 2.2 + seed) * 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = [L.ribbon, L.emb[0], L.emb[1]][i]; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - 5.6, y + 1); ctx.quadraticCurveTo(x - 8 - i, y + 10 + sw, x - 7 - i * 1.4 + sw * 0.5, y + 20 + i * 2); ctx.stroke();
    }
  }

  function instrument(ctx, f, P, A, B, sx, sy, s, time) {
    const i = f.instr, ph = (f.t !== undefined ? f.t : time) + (f.seed || 0);
    if (i === 'fiddle') {
      ctx.save(); ctx.translate(sx + 5 * s, sy - 3 * s); ctx.rotate(0.2);
      ctx.fillStyle = '#8a4a1e'; ell(ctx, 6, 0, 6.4 * s, 2.8 * s);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(10 * s, -0.5, 7 * s, 1);
      ctx.restore();
      ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(B[2], B[3]); ctx.lineTo(B[2] + 16 * s, B[3] - 6 * s + sin(ph * TAU * 2) * 2); ctx.stroke();
    } else if (i === 'bass') {
      ctx.fillStyle = '#7a3a14'; ell(ctx, sx + 9 * s, sy + 26 * s, 9 * s, 14 * s);
      ctx.fillStyle = '#5a2a0e'; ell(ctx, sx + 9 * s, sy + 22 * s, 7 * s, 4 * s);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(sx + 8.2 * s, sy - 18 * s, 1.6 * s, 40 * s);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(sx + 8.8 * s, sy + 38 * s, 0.8 * s, 8 * s);
    } else if (i === 'cimbal') {
      ctx.fillStyle = '#6a3a1e'; ctx.beginPath(); ctx.moveTo(sx + 2 * s, sy + 14 * s); ctx.lineTo(sx + 34 * s, sy + 14 * s); ctx.lineTo(sx + 30 * s, sy + 19 * s); ctx.lineTo(sx + 4 * s, sy + 19 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a26a'; ctx.fillRect(sx + 4 * s, sy + 12.6 * s, 28 * s, 1.6 * s);
      ctx.fillStyle = '#4a2a14'; ctx.fillRect(sx + 6 * s, sy + 19 * s, 1.6 * s, 14 * s); ctx.fillRect(sx + 28 * s, sy + 19 * s, 1.6 * s, 14 * s);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.8;
      for (const W of [A, B]) { ctx.beginPath(); ctx.moveTo(W[2], W[3]); ctx.lineTo(W[2] + 6 * s, W[3] + 3 * s); ctx.stroke(); }
    } else if (i === 'gajdy') {
      ctx.fillStyle = '#e9e2d0'; ell(ctx, sx + 3 * s, sy + 9 * s, 7 * s, 5 * s);
      ctx.fillStyle = '#8a6a48'; ctx.fillRect(sx + 7 * s, sy + 10 * s, 1.4 * s, 18 * s);
      ctx.fillStyle = '#5a3a22'; ctx.save(); ctx.translate(sx - 2 * s, sy + 6 * s); ctx.rotate(-1.2); ctx.fillRect(0, -0.8 * s, 20 * s, 1.6 * s); ctx.restore();
      ctx.fillStyle = '#6a4a2a'; circle(ctx, sx + 9 * s, sy + 8 * s, 2.2 * s);
      ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.moveTo(sx + 10.4 * s, sy + 6.6 * s); ctx.lineTo(sx + 12 * s, sy + 4 * s); ctx.lineTo(sx + 11 * s, sy + 7.2 * s); ctx.closePath(); ctx.fill();
    } else if (i === 'heligonka') {
      const q = 1 + sin(ph * TAU * 1.5) * 0.25;
      ctx.fillStyle = '#c4262e'; rr(ctx, sx + 1 * s, sy + 4 * s, 4 * s, 10 * s, 1);
      ctx.fillStyle = '#c4262e'; rr(ctx, sx + (6 + 6 * q) * s, sy + 4 * s, 4 * s, 10 * s, 1);
      ctx.fillStyle = '#f7f3ea'; for (let k = 0; k < 4; k++) ctx.fillRect(sx + (5 + k * 1.6 * q) * s, sy + 4.4 * s, 0.9 * s, 9.2 * s);
      ctx.fillStyle = '#1c1a18'; ctx.fillRect(sx + (5 + 0.8 * q) * s, sy + 4.4 * s, 0.8 * s, 9.2 * s);
    } else if (i === 'fujara') {
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(sx + 8 * s, sy - 36 * s, 3 * s, 86 * s);
      ctx.fillStyle = '#c9a26a'; for (let k = 0; k < 6; k++) ctx.fillRect(sx + 8 * s, sy + (-28 + k * 13) * s, 3 * s, 1.2 * s);
      ctx.fillStyle = '#6a3a14'; ctx.fillRect(sx + 3 * s, sy - 20 * s, 5 * s, 1.4 * s); ctx.fillRect(sx + 3 * s, sy - 20 * s, 1.4 * s, 12 * s);
    } else if (i === 'flag') {
      const fx = A[2], fy = A[3];
      ctx.fillStyle = '#6a4428'; ctx.fillRect(fx - 0.8, fy - 70 * s, 1.8, 92 * s);
      ctx.fillStyle = '#d6ab42'; circle(ctx, fx, fy - 71 * s, 2 * s);
      const w = 34 * s, h = 22 * s, t = (f.t !== undefined ? f.t : time) + (f.seed || 0), lift = f.raise || 0;
      ctx.save(); ctx.translate(fx + 1, fy - 68 * s - lift * 6);
      const wv = (u) => sin(t * 3 + u) * 1.6 * u / 6;
      ctx.fillStyle = '#2f6a34';
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let u = 0; u <= 6; u++) ctx.lineTo(w * u / 6, wv(u));
      for (let u = 6; u >= 0; u--) ctx.lineTo(w * u / 6, h + wv(u) + (u % 2 ? 4 * s : 0));
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c4262e';
      for (let u = 0; u < 6; u++) { ctx.beginPath(); ctx.moveTo(w * u / 6, h - 3 * s + wv(u)); ctx.lineTo(w * (u + 0.5) / 6, h - 6 * s + wv(u)); ctx.lineTo(w * (u + 1) / 6, h - 3 * s + wv(u + 1)); ctx.lineTo(w * (u + 1) / 6, h - 1.5 * s + wv(u + 1)); ctx.lineTo(w * u / 6, h - 1.5 * s + wv(u)); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#f7f3ea'; for (let u = 1; u < 6; u++) circle(ctx, w * u / 6, 3 * s + wv(u), 1 * s);
      ctx.fillStyle = '#f2c230'; ctx.font = '900 ' + (5 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.flag || '1953', w / 2, h / 2 + sin(t * 3 + 3) * 0.8);
      ctx.restore();
    } else if (i === 'valaska') {
      const vx = A[2], vy = A[3];
      ctx.save(); ctx.translate(vx, vy); ctx.rotate(-0.4 + sin(ph * TAU * 1.6) * 0.5);
      ctx.fillStyle = '#7a5030'; ctx.fillRect(-0.8, -24 * s, 1.8, 30 * s);
      ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.moveTo(0, -24 * s); ctx.lineTo(6 * s, -25 * s); ctx.lineTo(7 * s, -20 * s); ctx.lineTo(1, -21.4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d6ab42'; ctx.fillRect(-1, -2 * s, 2.2, 1.4);
      ctx.restore();
    } else if (i === 'clipboard') {
      ctx.save(); ctx.translate(A[2], A[3]); ctx.rotate(-0.25);
      ctx.fillStyle = '#a07a4a'; rr(ctx, -2.6 * s, -9 * s, 7.4 * s, 10 * s, 0.8);
      ctx.fillStyle = '#f6f2ec'; ctx.fillRect(-1.8 * s, -7.6 * s, 5.8 * s, 8 * s);
      ctx.restore();
    } else if (i === 'phone') {
      ctx.save(); ctx.translate(A[2], A[3]); ctx.rotate(-0.1);
      ctx.fillStyle = '#20232a'; rr(ctx, -1.6 * s, -6 * s, 3.4 * s, 6 * s, 0.6);
      ctx.fillStyle = f.lit ? '#ffffff' : '#7ad1ff'; ctx.fillRect(-1.1 * s, -5.4 * s, 2.4 * s, 4.6 * s);
      ctx.restore();
    }
  }

  function figure(ctx, f, time) {
    const s = (f.scale || 1), dir = f.dir < 0 ? -1 : 1, sex = f.sex || 'm', seed = Math.floor((f.seed || 0) * 7);
    const P = pose(f, time);
    play(f, P, time);
    const L = sex === 'civ' ? CIVIL[(f.look | 0) % CIVIL.length] : sex === 'm' ? MEN[(f.look | 0) % MEN.length] : WOMEN[(f.look | 0) % WOMEN.length];
    const skin = SKIN[(f.skin !== undefined ? f.skin : seed) % SKIN.length], hair = HAIR[(f.hair !== undefined ? f.hair : seed + 2) % HAIR.length];
    const kroj = sex !== 'civ', female = sex === 'f';
    ctx.save();
    ctx.translate(f.x, (f.y === undefined ? ZS.CFG.GROUND : f.y) + P.y * s);
    ctx.scale(dir * s, s);
    if (f.alpha !== undefined) ctx.globalAlpha *= f.alpha;
    const hx = 0, hy = -P.hip, lean = P.lean;
    const sx = hx + sin(lean) * D.tor, sy = hy - cos(lean) * D.tor;
    const leg = (fx, fy, far) => {
      const [kx, ky, ax, ay] = knee(hx + (far ? -1 : 1), hy, fx, -fy - 3, D.thigh, D.shin, P.sit ? -1 : 1);
      const pc = kroj ? (female ? '#f7f3ea' : L.pants) : L.pants, k = far ? 0.8 : 1;
      if (kroj && !female) {
        limb(ctx, hx, hy, kx, ky, 9.4, 8.6, dk(pc, k));
        limb(ctx, kx, ky, ax, ay - 2, 8.6, 6.4, dk(L.pants === '#f4efe4' ? '#f4efe4' : L.pants, k));
        if (L.pants === '#f4efe4') { ctx.fillStyle = dk('#e6dfcf', k); ctx.fillRect(ax - 3.6, ay - 6, 7.2, 1.2); }
        krpec(ctx, ax, ay + 1.2, 1, dk('#6a4428', k));
      } else if (female) {
        limb(ctx, kx, ky, ax, ay - 1, 5.4, 4.4, dk('#f7f3ea', k));
        ctx.fillStyle = dk(L.boots, k); rr(ctx, ax - 3, ay - 8, 6, 9, 1.6);
        ctx.beginPath(); ctx.moveTo(ax - 3, ay + 0.6); ctx.lineTo(ax + 6.4, ay + 0.6); ctx.quadraticCurveTo(ax + 5.4, ay - 2.6, ax + 1, ay - 2.6); ctx.closePath(); ctx.fill();
      } else {
        limb(ctx, hx, hy, kx, ky, 8.4, 7, dk(pc, k));
        limb(ctx, kx, ky, ax, ay, 7, 5.4, dk(pc, k));
        ctx.fillStyle = dk('#3a3f47', k); rr(ctx, ax - 3.4, ay - 1.6, 9.4, 3.6, 1.4);
      }
    };
    const [fA, fB] = [arm(sx, sy, P.ua[1], P.fa[1], 1), arm(sx, sy, P.ua[0], P.fa[0], 1)];
    const sleeve = kroj ? '#f7f3ea' : L.top;
    limb(ctx, sx - 1, sy, fA[0], fA[1], kroj ? 7.4 : 5.8, kroj ? 7.6 : 4.8, dk(sleeve, 0.82));
    limb(ctx, fA[0], fA[1], fA[2], fA[3], kroj ? 6.8 : 4.8, 3.8, dk(kroj && female ? '#f7f3ea' : kroj ? '#f7f3ea' : skin, 0.82));
    ctx.fillStyle = dk(skin, 0.82); circle(ctx, fA[2], fA[3], 2.4);
    leg(P.rx, P.ry, true);
    if (female) {
      const flare = 1 + P.skirt * 0.6, len = 26, top = hy + 4, sw = P.spin ? sin(P.spin) * 3 : 0;
      ctx.fillStyle = L.skirt;
      ctx.beginPath(); ctx.moveTo(-7, top - 4); ctx.lineTo(7.4, top - 4);
      ctx.quadraticCurveTo(11 * flare + sw, top + 10, 13 * flare + sw, top + len - P.skirt * 4);
      ctx.lineTo(-12.6 * flare + sw, top + len - P.skirt * 4); ctx.quadraticCurveTo(-10.6 * flare, top + 10, -7, top - 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = dk(L.skirt, 0.75); ctx.lineWidth = 0.7;
      ctx.beginPath(); for (let k = -4; k <= 4; k++) { ctx.moveTo(k * 1.4, top - 3); ctx.lineTo(k * 2.9 * flare + sw, top + len - P.skirt * 4 - 0.6); } ctx.stroke();
      ctx.fillStyle = L.emb[0]; ctx.fillRect(-12.6 * flare + sw, top + len - P.skirt * 4 - 2.6, 25.6 * flare, 1.4);
      ctx.fillStyle = L.apron;
      ctx.beginPath(); ctx.moveTo(1, top - 3); ctx.lineTo(8, top - 3); ctx.lineTo(10.6 * flare + sw, top + len - 6 - P.skirt * 4); ctx.lineTo(2.4 + sw * 0.6, top + len - 6 - P.skirt * 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = L.print; for (let k = 0; k < 4; k++) circle(ctx, 4.8 + k * 0.6 * flare + sw * 0.3, top + 3 + k * 4.6, 0.75);
    }
    leg(P.lx, P.ly, false);
    ctx.fillStyle = kroj ? '#f7f3ea' : L.top;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(lean);
    ctx.beginPath(); ctx.moveTo(-6.4, 2); ctx.quadraticCurveTo(-8, -10, -7, -21); ctx.quadraticCurveTo(-2, -24.4, 5.6, -21.4); ctx.quadraticCurveTo(8.4, -10, 7, 2); ctx.closePath(); ctx.fill();
    if (kroj) {
      ctx.fillStyle = L.vest;
      ctx.beginPath(); ctx.moveTo(-6.6, female ? -3 : 1); ctx.quadraticCurveTo(-7.6, -10, -6.4, -20); ctx.lineTo(-1, -21.4); ctx.lineTo(1.2, -12); ctx.lineTo(3.6, -21.4); ctx.lineTo(6.2, -20.4); ctx.quadraticCurveTo(8, -10, 6.8, female ? -3 : 1); ctx.closePath(); ctx.fill();
      embroidery(ctx, -6, -19, 4.4, 15, L.emb, seed);
      embroidery(ctx, 3.2, -19, 4, 15, L.emb, seed + 1);
      if (!female) {
        ctx.fillStyle = L.belt; ctx.fillRect(-7.4, -6, 15, 6.4);
        ctx.fillStyle = '#d6ab42'; for (let k = 0; k < 4; k++) circle(ctx, -5.4 + k * 3.6, -2.8, 0.9);
        ctx.fillStyle = dk(L.belt, 1.25); ctx.fillRect(-7.4, -6, 15, 0.8);
      } else {
        ctx.fillStyle = L.emb[1]; ctx.fillRect(-7, -4, 14, 1.4);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-5.6, -19, 2.2, 16);
      ctx.fillStyle = dk(L.pants, 0.9); ctx.fillRect(-7, -1, 14, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(-7.6, -21, 3, 23);
    ctx.restore();
    const nx = sx + sin(lean * 0.7 + P.head) * D.neck, ny = sy - cos(lean * 0.7) * D.neck;
    limb(ctx, sx, sy, nx, ny + 3, 5, 5, dk(skin, 0.88));
    if (female && kroj) { ctx.fillStyle = hair; ell(ctx, nx - 5.4, ny + 6, 2.4, 7); }
    ctx.fillStyle = skin; circle(ctx, nx, ny, D.hr);
    ctx.fillStyle = dk(skin, 0.86); circle(ctx, nx - 1.5, ny + 1, 1.7);
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.moveTo(nx - 7.2, ny + 2); ctx.quadraticCurveTo(nx - 8.4, ny - 8.6, nx, ny - 8.4); ctx.quadraticCurveTo(nx + 6.8, ny - 8, nx + 7.2, ny - 3.8); ctx.quadraticCurveTo(nx + 3.4, ny - 6, nx, ny - 5); ctx.quadraticCurveTo(nx - 3.4, ny - 4, nx - 4.4, ny + 2.2); ctx.closePath(); ctx.fill();
    const blink = frac(time / 3.4 + (f.seed || 0)) < 0.03;
    ctx.fillStyle = '#2a1d12';
    if (blink) ctx.fillRect(nx + 2.4, ny - 0.8, 2.2, 0.6); else circle(ctx, nx + 3.4, ny - 0.6, 0.95);
    ctx.fillStyle = 'rgba(224,110,110,0.34)'; circle(ctx, nx + 3, ny + 2.8, 1.6);
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 0.8;
    ctx.beginPath(); if (f.sing || P.y < -2) ctx.arc(nx + 4.2, ny + 3.4, 1.2, 0, PI); else { ctx.moveTo(nx + 3.4, ny + 3.6); ctx.lineTo(nx + 5.2, ny + 3.4); } ctx.stroke();
    if (!female && kroj && f.stache !== false && seed % 2 === 0) { ctx.fillStyle = hair; ell(ctx, nx + 4.6, ny + 2.4, 2.2, 0.9); }
    ctx.fillStyle = skin; circle(ctx, nx + 7.1, ny + 0.8, 1.8);
    if (kroj && !female && !f.bare) hatM(ctx, nx - 0.2, ny - 6.4, L, time, f.seed || 0);
    else if (female && kroj) parta(ctx, nx - 0.6, ny - 6.8, L, time, f.seed || 0);
    else if (!kroj && L.hat) { ctx.fillStyle = L.hat; ell(ctx, nx + 0.4, ny - 5, 10.4, 2.2); ctx.beginPath(); ctx.moveTo(nx - 5.6, ny - 5); ctx.quadraticCurveTo(nx - 5.8, ny - 10.6, nx, ny - 10.6); ctx.quadraticCurveTo(nx + 5.8, ny - 10.6, nx + 5.8, ny - 5); ctx.closePath(); ctx.fill(); }
    if (f.instr === 'bass' || f.instr === 'cimbal' || f.instr === 'fujara' || f.instr === 'gajdy' || f.instr === 'heligonka') instrument(ctx, f, P, fB, fA, sx, sy, 1, time);
    limb(ctx, sx + 1, sy, fB[0], fB[1], kroj ? 7.4 : 5.8, kroj ? 7.6 : 4.8, sleeve);
    limb(ctx, fB[0], fB[1], fB[2], fB[3], kroj ? 6.8 : 4.8, 3.8, kroj ? '#f7f3ea' : skin);
    if (kroj) { ctx.fillStyle = L.emb ? L.emb[0] : '#c4262e'; ctx.fillRect(fB[2] - 2.4, fB[3] - 2.4, 4.8, 1.2); }
    ctx.fillStyle = skin; circle(ctx, fB[2], fB[3], 2.5);
    if (f.instr && !(f.instr === 'bass' || f.instr === 'cimbal' || f.instr === 'fujara' || f.instr === 'gajdy' || f.instr === 'heligonka')) instrument(ctx, f, P, fB, fA, sx, sy, 1, time);
    ctx.restore();
  }

  function head(ctx, x, y, s, look, time, seed, lit) {
    const L = CIVIL[look % CIVIL.length], skin = SKIN[look % SKIN.length], hair = HAIR[(look + 2) % HAIR.length];
    const bob = sin(time * 1.3 + seed) * 0.6;
    ctx.fillStyle = L.top; rr(ctx, x - 8 * s, y - 6 * s + bob, 16 * s, 14 * s, 5 * s);
    ctx.fillStyle = skin; circle(ctx, x, y - 12 * s + bob, 6 * s);
    ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - 13 * s + bob, 6 * s, PI, TAU); ctx.fill();
    if (L.hat) { ctx.fillStyle = L.hat; ell(ctx, x, y - 16 * s + bob, 8 * s, 1.8 * s); ctx.fillRect(x - 4.4 * s, y - 21 * s + bob, 8.8 * s, 5 * s); }
    if (lit) { ctx.fillStyle = 'rgba(200,236,255,0.95)'; rr(ctx, x + 3 * s, y - 17 * s + bob, 3.4 * s, 5 * s, 0.6); }
  }

  ZS.folk = { figure, head, MEN, WOMEN, CIVIL, SKIN, krpec };
})();
