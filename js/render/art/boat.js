(function () {
  const { LABELS } = ZS;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, min = Math.min, max = Math.max, floor = Math.floor, ceil = Math.ceil;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, clamp, lerp } = ZS.util;
  const API = (ZS.boatArt = {});
  const SIM = () => ZS.sim.boat;
  const U = 16, LW = 4.2, R = 14, ZMAX = 100, EYE = 40, NEAR = 0.9, CAM = { h: 2.3 };
  const FUR = '#6b4226', FAR = '#4e2f19', CLAW = '#e4d6bb';
  const V = { k: 1, f: 400, cx: 0, hz: 0, top: 0, bot: 540, w: 760, camx: 0, camz: 0, t: 0, h: 2.3, turn: 0, dash: 0 };
  const PT = [0, 0];

  const lx = (ly) => (1 - ly) * LW;
  const zOf = (wx) => wx / U - V.camz;
  const sc = (z) => V.f / max(0.05, z);
  const fade = (z) => 1 - smooth((z - ZMAX * 0.72) / (ZMAX * 0.28));

  function setup(g, c, viewW, offY) {
    const h = g.viewH || 540;
    V.w = viewW; V.cx = viewW / 2; V.top = -offY; V.bot = V.top + h;
    V.k = clamp((viewW / 2 - 8) / 280, 0.55, 1) * min(1, h / 540);
    V.f = min(0.6 * viewW, 0.95 * h, 560);
    V.hz = V.top + h * (h > viewW ? 0.4 : 0.34);
    V.dash = min(V.bot - 40 * V.k, V.hz + max(300 * V.k, 0.55 * (V.bot - V.hz)));
    const turn = clamp((c.lv || 0) * 0.3, -1, 1);
    V.turn = turn;
    V.h = CAM.h;
    V.cx += turn * 22 * V.k;
    V.camx = lx(c.ly) + sin(c.t * 1.3) * 0.04;
    V.camz = (g.bear.x + EYE) / U;
    V.t = g.time;
  }

  function P(x, y, z, out) {
    const o = out || PT, zz = max(0.05, z);
    o[0] = V.cx + V.f * (x - V.camx) / zz;
    o[1] = V.hz + V.f * (V.h - y) / zz;
    return o;
  }

  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  function quad(ctx, a, b, c2, d) {
    const p = [];
    for (const q of [a, b, c2, d]) { const s = P(q[0], q[1], q[2]); p.push(s[0], s[1]); }
    poly(ctx, p);
  }

  function box(ctx, x0, x1, y0, y1, z0, z1, front, side, top) {
    if (z1 <= 0.3) return;
    const cut = z0 < 0.3;
    z0 = max(0.3, z0);
    if (side) {
      ctx.fillStyle = side;
      if (x0 > V.camx) quad(ctx, [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]);
      if (x1 < V.camx) quad(ctx, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
    }
    if (top && y1 < V.h) { ctx.fillStyle = top; quad(ctx, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]); }
    if (front && !cut) { ctx.fillStyle = front; quad(ctx, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]); }
  }

  function sky(ctx) {
    const gr = ctx.createLinearGradient(0, V.top, 0, V.hz);
    gr.addColorStop(0, '#6fa9d8'); gr.addColorStop(0.75, '#a9d0ea'); gr.addColorStop(1, '#e2eff4');
    ctx.fillStyle = gr; ctx.fillRect(-120, V.top - 80, V.w + 240, V.hz - V.top + 84);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i * 3.1) * 1.6 - 0.3) * V.w + V.t * 3 + V.camz * 0.4) % (V.w * 1.4) - V.w * 0.2, y = V.top + (V.hz - V.top) * (0.2 + hash(i * 5.3) * 0.5);
      const s = V.k * (0.8 + hash(i * 1.7) * 0.6);
      ell(ctx, x, y, 60 * s, 13 * s); ell(ctx, x + 30 * s, y - 8 * s, 38 * s, 13 * s); ell(ctx, x - 28 * s, y - 4 * s, 32 * s, 10 * s);
    }
  }

  function hills(ctx) {
    const off = V.camx * 6 * V.k, base = V.hz + 1;
    ctx.fillStyle = '#a7bbb3';
    ctx.beginPath(); ctx.moveTo(-80, base);
    for (let x = -80; x <= V.w + 80; x += 12) {
      const u = (x - V.cx + off) / (V.w * 0.5), right = smooth((u + 0.2) / 0.9);
      ctx.lineTo(x, base - (6 + right * (46 + 14 * sin(u * 4.1 + 1) + 8 * sin(u * 9.3))) * V.k);
    }
    ctx.lineTo(V.w + 80, base); ctx.closePath(); ctx.fill();
    const tx = V.cx + V.w * 0.36 - off, ty = base - 58 * V.k;
    ctx.fillStyle = '#95a4a8'; poly(ctx, [tx - 2.4 * V.k, ty + 4, tx + 2.4 * V.k, ty + 4, tx + 1, ty - 44 * V.k, tx - 1, ty - 44 * V.k]);
    ctx.fillStyle = '#c9d1d4'; rr(ctx, tx - 4 * V.k, ty - 36 * V.k, 8 * V.k, 5 * V.k, 2);
    ctx.fillStyle = '#b8574a'; ctx.fillRect(tx - 0.6, ty - 58 * V.k, 1.2, 15 * V.k);
  }

  function castle(ctx, x, y) {
    ctx.fillStyle = '#f1ece2'; ctx.fillRect(x - 54, y - 44, 108, 44);
    ctx.fillStyle = '#ddd5c6'; ctx.fillRect(x + 20, y - 44, 34, 44);
    ctx.fillStyle = 'rgba(70,80,90,0.45)';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) ctx.fillRect(x - 44 + i * 10.6, y - 38 + r * 13, 4, 6);
    for (const dx of [-54, 54]) {
      ctx.fillStyle = '#f6f2ea'; ctx.fillRect(x + dx - 10, y - 62, 20, 62);
      ctx.fillStyle = '#c4492f'; poly(ctx, [x + dx - 12, y - 62, x + dx + 12, y - 62, x + dx, y - 80]);
    }
    ctx.fillStyle = '#c4492f'; poly(ctx, [x - 46, y - 44, x + 46, y - 44, x + 36, y - 56, x - 36, y - 56]);
    ctx.fillStyle = '#a63a24'; ctx.fillRect(x - 36, y - 58, 72, 3);
  }

  function castleHill(ctx) {
    const z = 6000 / U - V.camz, x = 60;
    if (z < 30 || z > 700) return;
    const s = sc(z), b = P(x, 1.4, z);
    ctx.globalAlpha = 1 - smooth((z - 500) / 200);
    ctx.fillStyle = '#86a46c';
    ctx.beginPath(); ctx.moveTo(b[0] - 90 * s, b[1]);
    ctx.bezierCurveTo(b[0] - 50 * s, b[1] - 10 * s, b[0] - 30 * s, b[1] - 34 * s, b[0], b[1] - 36 * s);
    ctx.bezierCurveTo(b[0] + 30 * s, b[1] - 34 * s, b[0] + 60 * s, b[1] - 12 * s, b[0] + 110 * s, b[1]);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(b[0], b[1] - 35 * s); ctx.scale(s * 0.22, s * 0.22); castle(ctx, 0, 0); ctx.restore();
    ctx.globalAlpha = 1;
  }

  function zoneR(wx) {
    return wx < 4700 ? 'town' : wx < 7200 ? 'hill' : wx < 9950 ? 'karlova' : 'luh';
  }

  function zoneL(wx) {
    return wx < 5600 ? 'park' : wx < 8800 ? 'block' : 'luh';
  }

  function crown(ctx, x, y, r, col) {
    ctx.fillStyle = '#5a4430'; ctx.fillRect(x - r * 0.08, y - r * 0.9, r * 0.16, r * 0.9);
    ctx.fillStyle = col; circle(ctx, x, y - r * 1.3, r * 0.75); circle(ctx, x - r * 0.45, y - r * 0.95, r * 0.55); circle(ctx, x + r * 0.45, y - r * 1.0, r * 0.55);
    ctx.fillStyle = 'rgba(30,50,20,0.14)'; circle(ctx, x + r * 0.3, y - r * 1.05, r * 0.5);
  }

  function willow(ctx, x, y, h, sd) {
    ctx.fillStyle = '#6a5a44'; poly(ctx, [x - h * 0.04, y, x + h * 0.04, y, x + h * 0.02, y - h * 0.6, x - h * 0.02, y - h * 0.6]);
    ctx.fillStyle = '#7f9a5c'; ell(ctx, x, y - h * 0.72, h * 0.36, h * 0.3);
    ctx.strokeStyle = '#8fae68'; ctx.lineWidth = max(1, h * 0.025);
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const sx = x - h * 0.32 + i * h * 0.08, sw = sin(V.t * 1.3 + sd + i) * h * 0.02;
      ctx.moveTo(sx, y - h * 0.62); ctx.quadraticCurveTo(sx + sw, y - h * 0.4, sx + sw * 1.5, y - h * 0.2 - (i % 3) * h * 0.04);
    }
    ctx.stroke();
  }

  function poplar(ctx, x, y, h, col) {
    ctx.fillStyle = '#5a4430'; ctx.fillRect(x - h * 0.015, y - h * 0.2, h * 0.03, h * 0.2);
    ctx.fillStyle = col; ell(ctx, x, y - h * 0.58, h * 0.13, h * 0.42);
  }

  const HOUSE = ['#efe0c2', '#e9cfb0', '#f3e9d5', '#e2c39d', '#d9d2c4', '#dfe3d2'];

  function house(ctx, side, za, zb, h, n, block) {
    const X = side * (R + 5), d = side * 9, top = 1.4 + h, col = HOUSE[floor(hash(n * 2.91) * 6)];
    ctx.fillStyle = block ? '#cfccc2' : '#d8cdb4';
    quad(ctx, [X, 1.4, za], [X + d, 1.4, za], [X + d, top, za], [X, top, za]);
    ctx.fillStyle = block ? (hash(n) > 0.5 ? '#e6e1d6' : '#d8d6cc') : col;
    quad(ctx, [X, 1.4, za], [X, top, za], [X, top, zb], [X, 1.4, zb]);
    ctx.fillStyle = 'rgba(60,70,80,0.42)';
    const floors = floor(h / 3.2), cols = max(2, floor((zb - za) / 3));
    for (let f = 0; f < floors; f++) for (let i = 0; i < cols; i++) {
      const z0 = lerp(za, zb, (i + 0.3) / cols), z1 = lerp(za, zb, (i + 0.62) / cols), y0 = 2.6 + f * 3.2;
      if (y0 + 1.4 > top - 0.6) continue;
      quad(ctx, [X, y0, z0], [X, y0 + 1.4, z0], [X, y0 + 1.4, z1], [X, y0, z1]);
    }
    if (block) { ctx.fillStyle = ['#d9785a', '#e2b24c', '#6fa3c7'][n % 3]; quad(ctx, [X, 1.4, za], [X, top, za], [X, top, za + 1.2], [X, 1.4, za + 1.2]); return; }
    ctx.fillStyle = hash(n * 1.37) > 0.5 ? '#c0573a' : '#7d8a91';
    quad(ctx, [X, top, za], [X + d * 0.5, top + 3, za], [X + d * 0.5, top + 3, zb], [X, top, zb]);
  }

  function bank(ctx, side) {
    const zone = side > 0 ? zoneR : zoneL, X = side * R;
    ctx.fillStyle = side > 0 ? '#a9b48a' : '#9fb07e';
    const [e, n0, a, b] = pts([[X + side * 300, 1.4, ZMAX], [X + side * 300, 1.4, NEAR], [X, 1.4, ZMAX], [X, 1.4, NEAR]]);
    poly(ctx, [a[0], a[1], e[0], e[1], n0[0], n0[1], b[0], b[1]]);
    const step = 6, s0 = floor((V.camz + NEAR) / step), s1 = ceil((V.camz + ZMAX) / step);
    for (let s = s1; s >= s0; s--) {
      const w0 = s * step, z0 = max(NEAR, w0 - V.camz), z1 = min(ZMAX, w0 + step - V.camz);
      if (z1 <= z0) continue;
      const luh = zone(w0 * U) === 'luh', top = luh ? 0.6 : 1.4;
      ctx.fillStyle = luh ? '#c9b48a' : '#b9b2a4';
      quad(ctx, [X, 0, z0], [X, top, z0], [X, top, z1 + 0.05], [X, 0, z1 + 0.05]);
      ctx.fillStyle = luh ? '#b9a47a' : '#9d968a';
      quad(ctx, [X, 0, z0], [X, 0.35, z0], [X, 0.35, z1 + 0.05], [X, 0, z1 + 0.05]);
      ctx.fillStyle = luh ? '#8aa064' : '#d2c8b0';
      quad(ctx, [X, top, z0], [X + side * 4, luh ? 0.8 : 1.4, z0], [X + side * 4, luh ? 0.8 : 1.4, z1 + 0.05], [X, top, z1 + 0.05]);
    }
  }

  function scenery(ctx, side, list) {
    const zone = side > 0 ? zoneR : zoneL, step = 13;
    const s0 = floor((V.camz + NEAR) / step) - 1, s1 = ceil((V.camz + ZMAX) / step);
    for (let s = s0; s <= s1; s++) {
      const w0 = s * step, z0 = w0 - V.camz, zn = zone(w0 * U), h = hash(s * 1.37 + side * 9), h2 = hash(s * 2.91 + side);
      if (z0 + step < NEAR || z0 > ZMAX) continue;
      const zc = max(NEAR + 0.5, z0 + step * 0.4);
      if (zn === 'town' || zn === 'karlova' || zn === 'block') {
        const block = zn !== 'town';
        if ((!block && s % 4 === 3) || (block && s % 3 !== 0)) {
          list.push({ z: zc, draw: () => { const p = P(side * (R + 3 + h * 2), 1.4, zc); crown(ctx, p[0], p[1], 3.2 * sc(zc), h2 > 0.5 ? '#6f9152' : '#7a9a5a'); } });
        } else list.push({ z: z0 + step, draw: () => house(ctx, side, max(NEAR, z0 + 0.5), z0 + step - 0.5, block ? 20 + h * 9 : 11 + floor(h * 4) * 2.6, s, block) });
        if (zn === 'town' && s % 2 === 0) list.push({ z: zc - 0.2, draw: () => lamp(ctx, side, zc) });
      } else if (zn === 'park' || zn === 'hill') {
        list.push({ z: zc, draw: () => { const p = P(side * (R + 2.5 + h * 4), 1.4, zc); crown(ctx, p[0], p[1], (2.6 + h2 * 1.4) * sc(zc), h > 0.5 ? '#5f8448' : '#6c9152'); } });
        if (h2 > 0.55) list.push({ z: zc + 4, draw: () => { const p = P(side * (R + 7 + h2 * 6), 1.4, zc + 4); crown(ctx, p[0], p[1], 3 * sc(zc + 4), '#678c4c'); } });
      } else {
        list.push({ z: zc, draw: () => { const p = P(side * (R + 1.5 + h * 3), 0.6, zc); willow(ctx, p[0], p[1], (7 + h2 * 4) * sc(zc), s); } });
        if (h > 0.4) list.push({ z: zc + 5, draw: () => { const p = P(side * (R + 6 + h2 * 5), 0.8, zc + 5); poplar(ctx, p[0], p[1], (16 + h * 6) * sc(zc + 5), h > 0.7 ? '#6f8f4e' : '#7b9a58'); } });
      }
    }
    const cz = 4620 / U - V.camz;
    if (side > 0 && cz > NEAR + 2 && cz < 400) list.push({ z: cz, draw: () => cathedral(ctx, cz) });
  }

  function lamp(ctx, side, z) {
    const [a, b] = pts([[side * (R + 0.6), 1.4, z], [side * (R + 0.6), 5.4, z]]), s = sc(z);
    ctx.strokeStyle = '#3c4048'; ctx.lineWidth = max(1, 0.12 * s);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.fillStyle = '#fff3c4'; circle(ctx, b[0], b[1], max(1, 0.25 * s));
  }

  function cathedral(ctx, z) {
    const s = sc(z), b = P(R + 14, 1.4, z);
    ctx.globalAlpha = 1 - smooth((z - 250) / 150);
    ctx.fillStyle = '#e6dccb'; ctx.fillRect(b[0], b[1] - 9 * s, 16 * s, 9 * s);
    ctx.fillStyle = '#b5543c'; poly(ctx, [b[0] - 0.5 * s, b[1] - 9 * s, b[0] + 16.5 * s, b[1] - 9 * s, b[0] + 13 * s, b[1] - 13 * s, b[0] + 3 * s, b[1] - 13 * s]);
    ctx.fillStyle = '#ece3d3'; ctx.fillRect(b[0] - 4 * s, b[1] - 24 * s, 4.4 * s, 24 * s);
    ctx.fillStyle = '#5f8d7e'; poly(ctx, [b[0] - 4.6 * s, b[1] - 24 * s, b[0] + 1 * s, b[1] - 24 * s, b[0] - 1.8 * s, b[1] - 36 * s]);
    ctx.fillStyle = '#e2b13c'; circle(ctx, b[0] - 1.8 * s, b[1] - 36.6 * s, 0.7 * s);
    ctx.globalAlpha = 1;
  }

  function water(ctx) {
    const gr = ctx.createLinearGradient(0, V.hz, 0, V.bot);
    gr.addColorStop(0, '#9dbcc6'); gr.addColorStop(0.25, '#78a0b1'); gr.addColorStop(1, '#3f6c82');
    ctx.fillStyle = gr; ctx.fillRect(-120, V.hz, V.w + 240, V.bot - V.hz + 80);
    const step = 2.2, s0 = floor((V.camz + 1.2) / step), s1 = ceil((V.camz + 70) / step);
    for (let s = s0; s <= s1; s++) {
      const z = s * step - V.camz;
      if (z < 1.2) continue;
      const k = sc(z), a = min(0.4, 0.1 + 0.6 / z) * fade(z * 1.3);
      ctx.fillStyle = 'rgba(235,245,250,' + a.toFixed(3) + ')';
      for (let i = -4; i <= 4; i++) {
        const x = i * 2.6 + (hash(s * 7.1 + i * 3.3) - 0.5) * 2.2 - ((V.t * 0.5 + hash(s + i * 1.3) * 3) % 3), p = P(x, 0, z);
        ctx.fillRect(p[0], p[1], (0.5 + hash(s + i) * 0.7) * k, max(0.8, 0.05 * k));
      }
    }
  }

  const LOOK = { stary: ['#5f8597', '#46616f', '#55606a'], snp: ['#7d848c', '#5d646c', '#4e545b'], lafranconi: ['#b3b6b8', '#979b9e', '#80868a'] };

  function bridge(ctx, B, z0, list) {
    const z1 = z0 + 3.2, look = LOOK[B.id], y0 = 7.4, y1 = B.id === 'stary' ? 8.6 : 8.4;
    list.push({ z: z0 - 0.01, draw: () => {
      ctx.globalAlpha = fade(z0);
      ctx.fillStyle = look[2]; quad(ctx, [-60, y0, z0], [60, y0, z0], [60, y0, z1], [-60, y0, z1]);
      ctx.fillStyle = look[0]; quad(ctx, [-60, y0, z0], [60, y0, z0], [60, y1, z0], [-60, y1, z0]);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; quad(ctx, [-60, y1 - 0.15, z0], [60, y1 - 0.15, z0], [60, y1, z0], [-60, y1, z0]);
      const s = sc(z0);
      if (B.id === 'stary') {
        ctx.strokeStyle = look[1]; ctx.lineWidth = max(1, 0.12 * s);
        ctx.beginPath();
        for (let x = -24; x < 24; x += 2) { const [p, q, r] = pts([[x, y1, z0], [x + 1, y1 + 1.8, z0], [x + 2, y1, z0]]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(r[0], r[1]); }
        const l = [P(-24, y1 + 1.8, z0)[0], P(-24, y1 + 1.8, z0)[1]], r = P(24, y1 + 1.8, z0); ctx.moveTo(l[0], l[1]); ctx.lineTo(r[0], r[1]);
        ctx.stroke();
      } else {
        for (let x = -22; x <= 22; x += 6) { const p = [P(x, y1, z0)[0], P(x, y1, z0)[1]], q = P(x, y1 + 1.4, z0); ctx.fillStyle = '#3c4048'; ctx.fillRect(p[0] - 0.5, q[1], max(1, 0.08 * s), p[1] - q[1]); ctx.fillStyle = '#fff3c4'; circle(ctx, q[0], q[1], max(1, 0.18 * s)); }
      }
      for (const sd of [-1, 1]) box(ctx, sd > 0 ? R : -R - 3, sd > 0 ? R + 3 : -R, 0, y0, z0 - 0.4, z1 + 0.4, look[1], look[2], null);
      ctx.globalAlpha = 1;
    } });
    if (B.id === 'snp') list.push({ z: z0 + 1.5, draw: () => pylon(ctx, z0 + 1.5) });
  }

  function pylon(ctx, z) {
    const x = -R - 4, s = sc(z);
    ctx.globalAlpha = fade(z);
    const b0 = [P(x - 1, 8.4, z)[0], P(x - 1, 8.4, z)[1]], b1 = [P(x + 1, 8.4, z)[0], P(x + 1, 8.4, z)[1]], t = [P(x - 5, 22, z)[0], P(x - 5, 22, z)[1]];
    ctx.strokeStyle = 'rgba(70,76,84,0.7)'; ctx.lineWidth = max(0.8, 0.04 * s);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const u = 0.4 + i * 0.08, d = P(x + 6 + i * 5, 8.6, z); ctx.moveTo(lerp(b0[0], t[0], u), lerp(b0[1], t[1], u)); ctx.lineTo(d[0], d[1]); }
    ctx.stroke();
    ctx.fillStyle = '#7d848c'; poly(ctx, [b0[0], b0[1], b1[0], b1[1], t[0] + 0.5 * s, t[1], t[0] - 0.5 * s, t[1]]);
    ctx.fillStyle = '#5d646c'; ctx.fillRect(t[0] - 0.4 * s, t[1] - 0.6 * s, 0.8 * s, 0.8 * s);
    ctx.fillStyle = '#8a9198'; ell(ctx, t[0], t[1] - 0.9 * s, 3.6 * s, 0.8 * s);
    ctx.fillStyle = '#a8aeb4'; ell(ctx, t[0], t[1] - 1.15 * s, 3.3 * s, 0.55 * s);
    ctx.fillStyle = '#2b3440'; ctx.fillRect(t[0] - 2.8 * s, t[1] - 1.1 * s, 5.6 * s, 0.25 * s);
    ctx.fillStyle = '#c4cad0'; ell(ctx, t[0], t[1] - 1.6 * s, 1.3 * s, 0.45 * s);
    ctx.globalAlpha = 1;
  }

  function foam(ctx, x0, x1, z, a) {
    const p = [P(x0 - 0.3, 0, z)[0], P(x0 - 0.3, 0, z)[1]], q = P(x1 + 0.3, 0, z), s = sc(z);
    ctx.fillStyle = 'rgba(240,248,252,' + (0.55 * a).toFixed(3) + ')';
    ell(ctx, (p[0] + q[0]) / 2, p[1], (q[0] - p[0]) / 2 + 0.2 * s, max(1, 0.18 * s + sin(V.t * 3 + x0) * 0.04 * s));
  }

  function pts(list) {
    return list.map((q) => { const p = P(q[0], q[1], q[2]); return [p[0], p[1]]; });
  }

  function pier(ctx, o, z0, z1, x) {
    const stone = o.bridge === 'stary', zf = max(0.3, z0);
    box(ctx, x - 1.3, x + 1.3, 0, 7.4, z0 + 0.6, z1, null, stone ? '#8d877a' : '#a0a3a6', null);
    const [a, b, c, d, e, f] = pts([[x - 1.3, 0, z0 + 0.6], [x + 1.3, 0, z0 + 0.6], [x, 0, zf], [x, 7.4, zf], [x - 1.3, 7.4, z0 + 0.6], [x + 1.3, 7.4, z0 + 0.6]]);
    ctx.fillStyle = stone ? '#a39d90' : '#b8bbbd'; poly(ctx, [a[0], a[1], c[0], c[1], d[0], d[1], e[0], e[1]]);
    ctx.fillStyle = stone ? '#948e81' : '#a9acaf'; poly(ctx, [c[0], c[1], b[0], b[1], f[0], f[1], d[0], d[1]]);
    if (stone) {
      ctx.strokeStyle = 'rgba(60,55,45,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 1; y < 7.4; y += 1) { const [l, m, r] = pts([[x - 1.3, y, z0 + 0.6], [x, y, zf], [x + 1.3, y, z0 + 0.6]]); ctx.moveTo(l[0], l[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(r[0], r[1]); }
      ctx.stroke();
    }
    foam(ctx, x - 1.3, x + 1.3, z0 + 0.3, 1);
  }

  function buoy(ctx, o, z, z1, x) {
    const s = sc(z), red = o.id % 2 === 0, p = [P(x, 0, z)[0], P(x, 0, z)[1]], tilt = sin(V.t * 2.1 + o.id) * 0.08;
    foam(ctx, x - 0.5, x + 0.5, z, 0.8);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(tilt); ctx.scale(s, s);
    ctx.fillStyle = red ? '#cf3b2c' : '#2f8a4e'; poly(ctx, [-0.55, 0.1, 0.55, 0.1, 0.32, -1.5, -0.32, -1.5]);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-0.48, -0.65, 0.96, 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0.15, -1.5, 0.25, 1.6);
    ctx.fillStyle = '#3c4048'; ctx.fillRect(-0.05, -2.05, 0.1, 0.55);
    ctx.fillStyle = red ? '#cf3b2c' : '#2f8a4e';
    if (red) ctx.fillRect(-0.25, -2.35, 0.5, 0.35); else poly(ctx, [-0.3, -2.0, 0.3, -2.0, 0, -2.45]);
    ctx.fillStyle = '#ffe9a0'; circle(ctx, 0, -2.15, 0.09 + 0.03 * sin(V.t * 3 + o.id));
    ctx.restore();
  }

  function log(ctx, o, z, z1, x) {
    const s = sc(z), p = [P(x, 0, z)[0], P(x, 0, z)[1]], rot = sin(V.t * 1.4 + o.id) * 0.04;
    foam(ctx, x - 1.4, x + 1.4, z, 0.7);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = '#6d5136'; rr(ctx, -1.35, -0.42, 2.7, 0.5, 0.25);
    ctx.fillStyle = '#866446'; rr(ctx, -1.2, -0.42, 2.4, 0.16, 0.08);
    ctx.fillStyle = '#c9a777'; ell(ctx, 1.33, -0.17, 0.12, 0.24);
    ctx.strokeStyle = '#5a4430'; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.5, -0.35); ctx.lineTo(-0.75, -0.95); ctx.moveTo(-0.68, -0.8); ctx.lineTo(-1.0, -1.05); ctx.moveTo(0.4, -0.38); ctx.lineTo(0.62, -0.82); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(70,100,110,0.35)'; ctx.fillRect(-1.35, -0.02, 2.7, 0.12);
    ctx.restore();
  }

  function wheelhouse(ctx, x, z0, z1, y) {
    box(ctx, x - 1.1, x + 1.1, y, y + 2.4, z0, z1, '#f4f6f8', '#dfe4e9', '#e9edf1');
    box(ctx, x - 0.9, x + 0.9, y + 2.4, y + 4.0, z0 + 0.3, z1 - 0.3, '#eef1f4', '#d5dbe1', '#e4e8ec');
    ctx.fillStyle = '#2b3440'; quad(ctx, [x - 0.8, y + 2.9, z0 + 0.3], [x + 0.8, y + 2.9, z0 + 0.3], [x + 0.8, y + 3.6, z0 + 0.3], [x - 0.8, y + 3.6, z0 + 0.3]);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; quad(ctx, [x - 0.7, y + 3.0, z0 + 0.3], [x - 0.4, y + 3.0, z0 + 0.3], [x - 0.4, y + 3.5, z0 + 0.3], [x - 0.7, y + 3.5, z0 + 0.3]);
    const [m, n] = pts([[x + 0.4, y + 4.0, z0 + 1], [x + 0.4, y + 5.4, z0 + 1]]), s = sc(z0 + 1);
    ctx.fillStyle = '#5b6168'; ctx.fillRect(m[0] - 0.05 * s, n[1], 0.1 * s, m[1] - n[1]);
    ctx.fillStyle = '#fff'; ctx.fillRect(n[0], n[1], 0.7 * s, 0.17 * s); ctx.fillStyle = '#1f4fa8'; ctx.fillRect(n[0], n[1] + 0.17 * s, 0.7 * s, 0.17 * s); ctx.fillStyle = '#d0312b'; ctx.fillRect(n[0], n[1] + 0.34 * s, 0.7 * s, 0.17 * s);
    const ax = n[0] + 0.22 * s, ay = n[1] + 0.06 * s;
    ctx.fillStyle = '#fff'; ctx.fillRect(ax - 0.11 * s, ay - 0.02 * s, 0.22 * s, 0.4 * s);
    ctx.fillStyle = '#d0312b'; ctx.fillRect(ax - 0.09 * s, ay, 0.18 * s, 0.36 * s);
    ctx.fillStyle = '#fff'; ctx.fillRect(ax - 0.015 * s, ay + 0.04 * s, 0.03 * s, 0.22 * s); ctx.fillRect(ax - 0.06 * s, ay + 0.09 * s, 0.12 * s, 0.03 * s); ctx.fillRect(ax - 0.045 * s, ay + 0.15 * s, 0.09 * s, 0.03 * s);
    ctx.fillStyle = '#1f4fa8'; ctx.fillRect(ax - 0.09 * s, ay + 0.28 * s, 0.18 * s, 0.08 * s);
  }

  function barge(ctx, o, z0, z1, x) {
    const up = o.vx > 0, P0 = up ? z0 : z1 - 6, P1 = up ? z0 + 6 : z1, L0 = up ? z0 + 6 : z0, L1 = up ? z1 : z1 - 6, mid = (L0 + L1) / 2;
    foam(ctx, x - 1.6, x + 1.6, z0 + 0.2, up ? 0.5 : 1);
    box(ctx, x - 1.5, x + 1.5, 0, 1.5, P0, P1, null, '#d5dbe1', '#e4e8ec');
    wheelhouse(ctx, x, P0 + 1.5, P1 - 0.5, 1.5);
    box(ctx, x - 1.6, x + 1.6, 0, 1.5, L0, L1, '#3d4650', '#353d46', '#2f363e');
    box(ctx, x - 1.3, x + 1.3, 1.5, 2.6, L0 + 1, mid - 1, '#5d5a55', '#57534e', '#6a6660');
    box(ctx, x - 1.3, x + 1.3, 1.5, 2.2, mid + 1, L1 - 1, '#8f8268', '#86795f', '#9b8b6c');
    ctx.fillStyle = '#8a3b2a'; quad(ctx, [x - 1.6, 1.3, max(0.3, L0)], [x + 1.6, 1.3, max(0.3, L0)], [x + 1.6, 1.55, max(0.3, L0)], [x - 1.6, 1.55, max(0.3, L0)]);
    if (up) {
      box(ctx, x - 1.5, x + 1.5, 0, 1.5, P0, P0 + 0.1, '#e9edf1', null, null);
      ctx.fillStyle = '#c0392b'; quad(ctx, [x - 1.5, 0, max(0.3, P0)], [x + 1.5, 0, max(0.3, P0)], [x + 1.5, 0.35, max(0.3, P0)], [x - 1.5, 0.35, max(0.3, P0)]);
      wheelhouse(ctx, x, P0 + 1.5, P1 - 0.5, 1.5);
      const s = sc(z0 + 3);
      for (let i = 0; i < 3; i++) { const u = (V.t * 0.6 + i / 3) % 1, q = P(x + 0.8, 6 + u * 3, z0 + 3); ctx.fillStyle = 'rgba(80,80,80,' + (0.2 * (1 - u)).toFixed(3) + ')'; circle(ctx, q[0], q[1], (0.3 + u * 0.6) * s); }
    }
  }

  function cruise(ctx, o, z0, z1, x) {
    const moving = o.vx !== 0, cols = ['#d9785a', '#4f7fb0', '#e2b24c', '#6f9a5a', '#b85c8a'], sx = x - 1.8 > V.camx ? x - 1.8 : x + 1.8, ux = x - 1.6 > V.camx ? x - 1.6 : x + 1.6;
    foam(ctx, x - 1.8, x + 1.8, z0 + 0.2, moving ? 1 : 0.4);
    box(ctx, x - 1.8, x + 1.8, 0, 2.2, z0 + 1.5, z1, null, '#e8ecf0', '#f4f6f8');
    box(ctx, x - 1.6, x + 1.6, 2.2, 4.4, z0 + 3, z1 - 2, '#eef1f4', '#e4e8ec', '#f4f6f8');
    ctx.fillStyle = '#1f3e6e'; quad(ctx, [sx, 0, z0 + 1.5], [sx, 0.5, z0 + 1.5], [sx, 0.5, z1], [sx, 0, z1]);
    ctx.fillStyle = '#2d4f7c'; quad(ctx, [ux, 2.9, z0 + 3], [ux, 3.7, z0 + 3], [ux, 3.7, z1 - 2], [ux, 2.9, z1 - 2]);
    ctx.fillStyle = '#2b3440';
    for (let i = 0; i < 14; i++) { const za = lerp(z0 + 3, z1 - 2, i / 14); quad(ctx, [sx, 1.0, za], [sx, 1.5, za], [sx, 1.5, za + 0.6], [sx, 1.0, za + 0.6]); }
    const [n0, n1, t0, t1, tip, tt] = pts([[x - 1.8, 0, z0 + 1.5], [x + 1.8, 0, z0 + 1.5], [x - 1.8, 2.2, z0 + 1.5], [x + 1.8, 2.2, z0 + 1.5], [x, 0.2, max(0.3, z0)], [x, 2.5, max(0.3, z0)]]);
    ctx.fillStyle = '#f4f6f8'; poly(ctx, [n0[0], n0[1], tip[0], tip[1], n1[0], n1[1], t1[0], t1[1], tt[0], tt[1], t0[0], t0[1]]);
    ctx.fillStyle = '#1f3e6e'; poly(ctx, [n0[0], n0[1], tip[0], tip[1], n1[0], n1[1], n1[0], lerp(n1[1], t1[1], 0.2), tip[0], lerp(tip[1], tt[1], 0.18), n0[0], lerp(n0[1], t0[1], 0.2)]);
    ctx.fillStyle = '#2d4f7c'; quad(ctx, [x - 1.4, 2.9, z0 + 3], [x + 1.4, 2.9, z0 + 3], [x + 1.4, 3.7, z0 + 3], [x - 1.4, 3.7, z0 + 3]);
    const s = sc(z0 + 3.4);
    for (let i = 0; i < 6; i++) {
      const p = [P(x - 1.3 + i * 0.52, 4.4, z0 + 3.4)[0], P(x - 1.3 + i * 0.52, 4.4, z0 + 3.4)[1]];
      ctx.fillStyle = cols[(i + o.id) % 5]; rr(ctx, p[0] - 0.15 * s, p[1] - 0.6 * s, 0.3 * s, 0.6 * s, 0.08 * s);
      ctx.fillStyle = '#e9c4a0'; circle(ctx, p[0], p[1] - 0.75 * s, 0.14 * s);
      if (i % 3 === 1) { ctx.strokeStyle = '#e9c4a0'; ctx.lineWidth = max(1, 0.07 * s); ctx.beginPath(); ctx.moveTo(p[0] + 0.1 * s, p[1] - 0.5 * s); ctx.lineTo(p[0] + (0.3 + sin(V.t * 6 + i) * 0.1) * s, p[1] - 1.0 * s); ctx.stroke(); }
    }
    ctx.fillStyle = '#e4e8ec'; quad(ctx, [x - 1.6, 4.4, z0 + 3], [x + 1.6, 4.4, z0 + 3], [x + 1.6, 4.5, z0 + 3], [x - 1.6, 4.5, z0 + 3]);
  }

  function police(ctx, o, z0, z1, x) {
    const blink = 0.5 + 0.5 * sin(V.t * 7), s = sc(z0 + 1), zf = max(0.3, z0);
    foam(ctx, x - 1.2, x + 1.2, z0 + 0.2, 1);
    box(ctx, x - 1.2, x + 1.2, 0, 1.0, z0 + 0.8, z1, null, '#e4e8ec', '#f2f4f6');
    box(ctx, x - 0.9, x + 0.9, 1.0, 2.1, z0 + 2.2, z1 - 1.5, '#e9edf1', '#d5dbe1', '#dfe4e9');
    const [a, b, c, d, tip, tt] = pts([[x - 1.2, 0, z0 + 0.8], [x + 1.2, 0, z0 + 0.8], [x - 1.2, 1.0, z0 + 0.8], [x + 1.2, 1.0, z0 + 0.8], [x, 0.1, zf], [x, 1.2, zf]]);
    ctx.fillStyle = '#f2f4f6'; poly(ctx, [a[0], a[1], tip[0], tip[1], b[0], b[1], d[0], d[1], tt[0], tt[1], c[0], c[1]]);
    ctx.fillStyle = '#1d4f9a'; poly(ctx, [a[0], lerp(a[1], c[1], 0.3), tip[0], lerp(tip[1], tt[1], 0.3), b[0], lerp(b[1], d[1], 0.3), b[0], lerp(b[1], d[1], 0.62), tip[0], lerp(tip[1], tt[1], 0.62), a[0], lerp(a[1], c[1], 0.62)]);
    ctx.fillStyle = '#2b3440'; quad(ctx, [x - 0.8, 1.35, z0 + 2.2], [x + 0.8, 1.35, z0 + 2.2], [x + 0.8, 1.9, z0 + 2.2], [x - 0.8, 1.9, z0 + 2.2]);
    const tp = pts([[x, 0.47, z0 + 0.8]])[0];
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + max(6, 0.34 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.boat.police, tp[0], tp[1], 2 * s);
    const [l, r, lamp] = pts([[x - 0.45, 2.25, z0 + 2.4], [x + 0.45, 2.25, z0 + 2.4], [x, 2.3, z0 + 2.0]]);
    ctx.fillStyle = 'rgba(60,120,255,' + (0.4 + 0.6 * blink).toFixed(3) + ')'; rr(ctx, l[0] - 0.25 * s, l[1] - 0.12 * s, 0.5 * s, 0.24 * s, 0.08 * s);
    ctx.fillStyle = 'rgba(60,120,255,' + (0.4 + 0.6 * (1 - blink)).toFixed(3) + ')'; rr(ctx, r[0] - 0.25 * s, r[1] - 0.12 * s, 0.5 * s, 0.24 * s, 0.08 * s);
    ctx.fillStyle = 'rgba(80,140,255,' + (0.14 * blink).toFixed(3) + ')'; circle(ctx, (l[0] + r[0]) / 2, l[1], 1.2 * s);
    ctx.fillStyle = 'rgba(255,246,200,0.35)'; circle(ctx, lamp[0], lamp[1], 0.6 * s);
    ctx.fillStyle = '#fff6c8'; circle(ctx, lamp[0], lamp[1], 0.22 * s);
  }

  function beam(ctx, o) {
    const x = lx(o.bl), zf = zOf(o.a) + 0.6, zn = zOf(o.a - SIM().BEAM), px = lx(o.lane);
    if (zf < 1 || zn > ZMAX) return;
    const [a, b, c, d] = pts([[px - 0.3, 0, zf], [px + 0.3, 0, zf], [x + 2.0, 0, max(0.6, zn)], [x - 2.0, 0, max(0.6, zn)]]);
    const gr = ctx.createLinearGradient(0, a[1], 0, max(a[1] + 1, c[1]));
    gr.addColorStop(0, 'rgba(255,244,180,0.6)'); gr.addColorStop(1, 'rgba(255,244,180,0.06)');
    ctx.fillStyle = gr; poly(ctx, [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]);
  }

  function raketa(ctx, o, z0, z1, x) {
    if (z0 < 1.5) return;
    const s = sc(z0);
    for (let i = 0; i < 10; i++) {
      const u = (V.t * 3 + i / 10) % 1, zz = max(1, z0 - u * 3), p = P(x + (hash(i) - 0.5) * 2.4, 0.3 + sin(u * PI) * 1.6, zz);
      ctx.fillStyle = 'rgba(245,250,252,' + (0.7 * (1 - u)).toFixed(3) + ')'; circle(ctx, p[0], p[1], (0.25 + u * 0.4) * sc(zz));
    }
    ctx.fillStyle = '#5d646c';
    for (const sd of [-1, 1]) { const [a, b] = pts([[x + sd * 1.0, 0, z0 + 1], [x + sd * 1.0, 0.9, z0 + 1]]); ctx.fillRect(a[0] - 0.08 * s, b[1], 0.16 * s, a[1] - b[1]); }
    box(ctx, x - 1.3, x + 1.3, 0.9, 1.9, z0, z1, '#f2f4f6', '#e4e8ec', '#eef1f4');
    ctx.fillStyle = '#c0392b'; quad(ctx, [x - 1.3, 1.25, z0], [x + 1.3, 1.25, z0], [x + 1.3, 1.45, z0], [x - 1.3, 1.45, z0]);
    box(ctx, x - 1.0, x + 1.0, 1.9, 2.8, z0 + 1.5, z1 - 3, '#f7f8f9', '#e9edf1', '#f2f4f6');
    ctx.fillStyle = '#2b3440';
    for (let i = 0; i < 4; i++) { const xa = x - 0.9 + i * 0.48; quad(ctx, [xa, 2.15, z0 + 1.5], [xa + 0.32, 2.15, z0 + 1.5], [xa + 0.32, 2.55, z0 + 1.5], [xa, 2.55, z0 + 1.5]); }
  }

  function surf(ctx, o) {
    if (!o.surf || o.a === null) return;
    const [a, z] = o.band, f = clamp((o.a - a) / 400, 0, 1), x0 = lx(max(...o.waves)) - LW * 0.62, x1 = lx(min(...o.waves)) + LW * 0.62;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const zz = zOf(a + 30 + i * ((z - a - 60) / 5));
      if (zz < 1 || zz > ZMAX) continue;
      const s = sc(zz), al = f * fade(zz);
      ctx.beginPath();
      for (let j = 0; j <= 20; j++) { const p = P(lerp(x0, x1, j / 20), 0.15 + 0.12 * sin(j * 0.9 + V.t * 2 + i), zz); if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
      ctx.strokeStyle = 'rgba(35,75,95,' + (0.22 * al).toFixed(3) + ')'; ctx.lineWidth = max(1.5, 0.35 * s); ctx.stroke();
      ctx.save(); ctx.translate(0, -0.12 * s);
      ctx.strokeStyle = 'rgba(245,250,252,' + (0.75 * al).toFixed(3) + ')'; ctx.lineWidth = max(1, 0.12 * s); ctx.stroke();
      ctx.restore();
    }
    ctx.lineCap = 'butt';
  }

  function snack(ctx, o, z, z1, x) {
    if (o.got) return;
    const s = sc(z), p = [P(x, 0, z)[0], P(x, 0, z)[1]], u = (V.t * 0.8 + o.id * 0.37) % 1, jump = u < 0.45 ? sin((u / 0.45) * PI) : 0;
    ctx.strokeStyle = 'rgba(240,248,252,0.6)'; ctx.lineWidth = max(1, 0.06 * s);
    const ga = ctx.globalAlpha;
    for (let i = 0; i < 2; i++) { const r = (V.t * 0.7 + i * 0.5) % 1; ctx.globalAlpha = ga * (1 - r); ctx.beginPath(); ctx.ellipse(p[0], p[1], (0.4 + r * 0.9) * s, (0.1 + r * 0.22) * s, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = ga;
    ctx.save(); ctx.translate(p[0], p[1] - jump * 1.1 * s); ctx.rotate(jump > 0 ? -0.9 + (u / 0.45) * 1.8 : 0); ctx.scale(s, s);
    ctx.fillStyle = '#9fb3bd'; ell(ctx, 0, 0, 0.42, 0.14);
    ctx.fillStyle = '#c9d6dc'; ell(ctx, 0.05, 0.04, 0.3, 0.06);
    ctx.fillStyle = '#7f949e'; poly(ctx, [-0.38, 0, -0.6, -0.14, -0.6, 0.14]);
    ctx.fillStyle = '#1d2318'; circle(ctx, 0.28, -0.03, 0.035);
    ctx.restore();
    const g = P(x, 2.3 + 0.15 * sin(V.t * 3 + o.id), z);
    ctx.fillStyle = 'rgba(255,240,170,0.35)'; circle(ctx, g[0], g[1], max(5, 0.42 * s));
    ctx.fillStyle = 'rgba(255,212,59,0.95)'; circle(ctx, g[0], g[1], max(2.5, 0.2 * s));
  }

  function things(ctx, g, c) {
    const list = [];
    scenery(ctx, 1, list);
    scenery(ctx, -1, list);
    for (const B of SIM().BRIDGES) { const z = zOf(B.x - 25); if (z > -3 && z < ZMAX) bridge(ctx, B, z, list); }
    const fn = { pier, buoy, log, barge, cruise, police, raketa, snack };
    for (const o of c.obs) {
      if (o.gone || o.a === null) continue;
      const z0 = zOf(o.a), z1 = zOf(o.a + o.len), x = lx(o.lane);
      if (z1 < 0.4 || z0 > ZMAX) continue;
      list.push({ z: z0, draw: () => { ctx.globalAlpha = fade(z0); fn[o.kind](ctx, o, z0, z1, x); ctx.globalAlpha = 1; } });
    }
    const jz = zOf(SIM().RIDE.stop + 110);
    if (jz > 0.5 && jz < ZMAX) list.push({ z: jz, draw: () => jetty(ctx, jz) });
    list.sort((a, b) => b.z - a.z);
    for (const it of list) it.draw();
  }

  function jetty(ctx, z) {
    ctx.globalAlpha = fade(z);
    const x0 = lx(0) + 2.0, x1 = R + 1;
    for (let i = 0; i <= 3; i++) { const x = lerp(x0, x1, i / 3); box(ctx, x - 0.12, x + 0.12, 0, 0.9, z, z + 0.25, '#5d4630', null, null); }
    box(ctx, x0, x1, 0.9, 1.15, z, z + 2.5, '#7d5c3c', '#8a6a48', '#a07a52');
    const [p, q] = pts([[x0 + 0.3, 1.15, z + 0.3], [x0 + 0.3, 2.6, z + 0.3]]), s = sc(z);
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(p[0] - 0.06 * s, q[1], 0.12 * s, p[1] - q[1]);
    ctx.strokeStyle = '#e8590c'; ctx.lineWidth = max(1, 0.12 * s); ctx.beginPath(); ctx.arc(q[0], q[1] + 0.35 * s, 0.28 * s, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function bow(ctx, c) {
    const k = V.k, bot = V.bot, d = V.dash, tip = [V.cx, d - 150 * k], l = [V.cx - 300 * k, d + 10 * k], r = [V.cx + 300 * k, d + 10 * k];
    const v = 0.7;
    for (let i = 0; i < 6; i++) {
      const u = (V.t * 2.4 + i / 6) % 1, sd = i % 2 ? 1 : -1;
      ctx.fillStyle = 'rgba(245,250,252,' + (0.55 * (1 - u) * v).toFixed(3) + ')';
      circle(ctx, tip[0] + sd * (20 + u * 120) * k, tip[1] + (8 + u * 40) * k, (3 + u * 6) * k);
    }
    ctx.fillStyle = '#f4f6f8'; poly(ctx, [l[0], bot + 10, l[0], l[1], tip[0], tip[1], r[0], r[1], r[0], bot + 10]);
    ctx.fillStyle = '#1f6fb5'; poly(ctx, [l[0], l[1], tip[0], tip[1], tip[0], tip[1] + 3 * k, l[0], l[1] + 9 * k]);
    poly(ctx, [r[0], r[1], tip[0], tip[1], tip[0], tip[1] + 3 * k, r[0], r[1] + 9 * k]);
    ctx.fillStyle = 'rgba(120,140,160,0.18)'; poly(ctx, [tip[0], tip[1], r[0], r[1], r[0], bot + 10, tip[0] + 30 * k, bot + 10]);
    ctx.fillStyle = '#d9dee3'; ctx.fillRect(tip[0] - 1.5 * k, tip[1], 3 * k, bot - tip[1]);
  }

  function helm(ctx, g, c) {
    const k = V.k, b = g.bear, cx = V.cx, bot = V.bot, t = V.t, ga = ctx.globalAlpha;
    const dy = V.dash;
    ctx.fillStyle = '#2b3036'; rr(ctx, cx - 210 * k, dy - 30 * k, 420 * k, bot - dy + 60 * k, 26 * k);
    if (bot - dy > 90 * k) { ctx.fillStyle = '#e9edf1'; ctx.fillRect(-10, dy + 40 * k, cx - 210 * k + 10, bot - dy); ctx.fillRect(cx + 210 * k, dy + 40 * k, V.w, bot - dy); ctx.fillStyle = '#1f6fb5'; ctx.fillRect(-10, dy + 40 * k, V.w + 20, 6 * k); }
    ctx.fillStyle = '#3a4048'; rr(ctx, cx - 200 * k, dy - 26 * k, 400 * k, 10 * k, 5 * k);
    for (const sd of [-1, 1]) { ctx.fillStyle = '#1b1f24'; circle(ctx, cx + sd * 145 * k, dy + 4 * k, 20 * k); ctx.fillStyle = sd < 0 ? '#3fae5a' : '#d0312b'; circle(ctx, cx + sd * 145 * k, dy + 4 * k, 6 * k); }
    ctx.fillStyle = '#9aa3ad'; ctx.font = '900 ' + (11 * k).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.boat.name, cx, dy + 52 * k, 120 * k);
    const turn = clamp(V.turn * 1.1, -0.8, 0.8), wy = dy - 34 * k, W = 64 * k;
    ctx.save(); ctx.translate(cx, wy);
    ctx.save(); ctx.rotate(turn);
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 11 * k; ctx.beginPath(); ctx.arc(0, 0, W, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.arc(0, -2 * k, W, PI * 1.1, PI * 1.9); ctx.stroke();
    ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 6 * k;
    ctx.beginPath(); for (const a of [PI * 0.5, PI * 1.17, PI * 1.83]) { ctx.moveTo(0, 0); ctx.lineTo(cos(a) * W, sin(a) * W); } ctx.stroke();
    ctx.fillStyle = '#3a3f47'; circle(ctx, 0, 0, 13 * k);
    ctx.fillStyle = '#e8590c'; circle(ctx, 0, 0, 5 * k);
    ctx.restore();
    ctx.globalAlpha = ga * (b.inv > 0 ? 0.65 + 0.35 * cos(t * 12) : 1);
    for (const sd of [-1, 1]) {
      const a = (sd < 0 ? PI * 1.2 : PI * 1.8) + turn, px = cos(a) * W, py = sin(a) * W;
      ctx.strokeStyle = FUR; ctx.lineWidth = 30 * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sd * 175 * k, 170 * k); ctx.quadraticCurveTo(sd * 125 * k, 40 * k, px, py); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,14,4,0.2)'; ctx.lineWidth = 10 * k;
      ctx.beginPath(); ctx.moveTo(sd * 186 * k, 180 * k); ctx.quadraticCurveTo(sd * 138 * k, 54 * k, px + sd * 6 * k, py + 8 * k); ctx.stroke();
      ctx.fillStyle = FAR; ell(ctx, px, py, 18 * k, 12 * k, a + PI / 2);
      ctx.fillStyle = 'rgba(255,226,190,0.12)'; ell(ctx, px - 3 * k, py - 2 * k, 9 * k, 4 * k);
      ctx.strokeStyle = CLAW; ctx.lineWidth = 2.2 * k; ctx.beginPath();
      for (let i = -1.5; i <= 1.5; i++) { const ox = px + cos(a + i * 0.2) * 8 * k, oy = py + sin(a + i * 0.2) * 8 * k; ctx.moveTo(ox, oy); ctx.lineTo(ox + cos(a) * 6 * k, oy + sin(a) * 6 * k); }
      ctx.stroke();
    }
    ctx.globalAlpha = ga; ctx.lineCap = 'butt';
    ctx.restore();
    if (c.shake > 0.02) {
      const u = 1 - c.shake;
      for (let i = 0; i < 12; i++) {
        const a = -PI * 0.1 - (i / 11) * PI * 0.8, r = (60 + u * 260) * k;
        ctx.fillStyle = 'rgba(245,250,252,' + (0.8 * c.shake).toFixed(3) + ')';
        circle(ctx, cx + cos(a) * r, V.hz + 90 * k - sin(-a) * r * 0.4 + u * u * 160 * k, (5 + (i % 3) * 3) * k);
      }
    }
  }

  function guide(ctx, g, c, A) {
    if (c.dock) return;
    const zf = max(0.6, zOf(g.bear.x + 74)), bad = A.T[c.lane] < A.H;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const step = 12, s0 = floor((V.camz + 2) / step), s1 = ceil((V.camz + 70) / step);
    for (let s = s0; s <= s1; s++) {
      const z = s * step - V.camz;
      if (z < 1.5) continue;
      for (const lz of [0.5, 1.5]) {
        const p = P(lx(lz), 0.1, z), r = max(1.2, 0.16 * sc(z));
        ctx.fillStyle = 'rgba(240,120,40,' + (0.85 * fade(z * 1.2)).toFixed(3) + ')'; circle(ctx, p[0], p[1] - r * 0.4, r);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * fade(z * 1.2)).toFixed(3) + ')'; ell(ctx, p[0], p[1] + r * 0.4, r * 1.6, r * 0.4);
      }
    }
    const L = [], Rr = [], x0 = lx(c.ly), x1 = lx(c.lane);
    for (let i = 0; i <= 16; i++) {
      const z = zf + i * 1.8, x = lerp(x0, x1, smooth((z - zf) / 7));
      const [l, r] = pts([[x - 0.75, 0.02, z], [x + 0.75, 0.02, z]]);
      L.push(l); Rr.push(r);
    }
    const gr = ctx.createLinearGradient(0, L[0][1], 0, L[L.length - 1][1]);
    const col = bad ? '230,70,50' : '255,255,255', a0 = bad ? 0.42 : 0.22;
    gr.addColorStop(0, 'rgba(' + col + ',' + a0 + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (const p of L) ctx.lineTo(p[0], p[1]);
    for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    ctx.closePath(); ctx.fill();
  }

  const BOXW = { buoy: [0.8, 2.6], log: [1.5, 1.1], pier: [1.5, 7.4], barge: [1.8, 5.8], cruise: [2.0, 4.8], police: [1.4, 2.6], raketa: [1.5, 3] };

  function outline(ctx, g, c) {
    if (c.dock) return;
    const k = max(0.7, V.k), pulse = 0.65 + 0.35 * sin(V.t * 9);
    for (const w of SIM().incoming(g, c)) {
      if (w.wave || w.back) continue;
      const o = w.o, lane = o.kind === 'police' ? Math.round(o.bl) : o.lane;
      if (lane !== c.lane && o.lane !== c.lane) continue;
      const z = zOf(o.kind === 'police' ? o.a - SIM().BEAM : o.a);
      if (z < 1.2 || z > 70) continue;
      const B = BOXW[o.kind] || [1, 2], x = lx(o.kind === 'police' && lane === c.lane ? o.bl : o.lane), zz = zOf(o.a);
      const [p, q] = pts([[x - B[0], 0, max(1.2, zz)], [x + B[0], B[1], max(1.2, zz)]]);
      const pad = 6 * k, x0 = p[0] - pad, y0 = q[1] - pad, wd = q[0] - p[0] + pad * 2, ht = p[1] - q[1] + pad * 2;
      ctx.strokeStyle = 'rgba(235,50,40,' + (0.9 * pulse * smooth((2.6 - w.t) / 0.6)).toFixed(3) + ')'; ctx.lineWidth = 3 * k;
      ctx.beginPath(); ctx.moveTo(x0 + 8 * k, y0); ctx.arcTo(x0 + wd, y0, x0 + wd, y0 + ht, 8 * k); ctx.arcTo(x0 + wd, y0 + ht, x0, y0 + ht, 8 * k); ctx.arcTo(x0, y0 + ht, x0, y0, 8 * k); ctx.arcTo(x0, y0, x0 + wd, y0, 8 * k); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(235,50,40,' + (0.9 * pulse).toFixed(3) + ')'; rr(ctx, x0 + wd / 2 - 9 * k, y0 - 24 * k, 18 * k, 18 * k, 9 * k);
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + (13 * k).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x0 + wd / 2, y0 - 14.5 * k);
    }
  }

  function sign(ctx, x, y, s, col, kind, up) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col; poly(ctx, up ? [-7, -17, 7, -17, 0, -27] : [-7, 17, 7, 17, 0, 27]);
    ctx.fillStyle = 'rgba(20,16,26,0.82)'; rr(ctx, -18, -18, 36, 36, 18);
    ctx.fillStyle = col; rr(ctx, -15, -15, 30, 30, 15);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    if (kind === 'buoy') poly(ctx, [-5, 8, 5, 8, 3, -8, -3, -8]);
    else if (kind === 'log') rr(ctx, -10, -3, 20, 6, 3);
    else if (kind === 'pier') ctx.fillRect(-3, -9, 6, 18);
    else if (kind === 'police') { ctx.fillRect(-8, 2, 16, 5); ctx.fillRect(-4, -5, 8, 7); ctx.fillStyle = '#9cc0ff'; ctx.fillRect(-4, -8, 8, 3); }
    else if (kind === 'wave') { ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i < 2; i++) { ctx.moveTo(-9, -3 + i * 7); ctx.quadraticCurveTo(-4.5, -8 + i * 7, 0, -3 + i * 7); ctx.quadraticCurveTo(4.5, 2 + i * 7, 9, -3 + i * 7); } ctx.stroke(); }
    else if (kind === 'raketa') poly(ctx, [0, -10, 8, 2, 3, 2, 3, 9, -3, 9, -3, 2, -8, 2]);
    else { poly(ctx, [-10, -1, 10, -1, 7, 7, -7, 7]); ctx.fillRect(-3, -8, 7, 7); }
    ctx.restore();
  }

  const TALL = { cruise: 6.5, barge: 7.5, pier: 9.6, police: 4.2 };

  function warnings(ctx, g, c) {
    if (c.dock) return;
    const s = max(0.75, V.k), pulse = 1 + 0.06 * sin(V.t * 6);
    for (const w of SIM().incoming(g, c)) {
      const a = smooth((2.6 - w.t) / 0.5);
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      if (w.wave) {
        const z = zOf(w.o.band[0]);
        if (z > 22) { const wx = (lx(min(...w.o.waves)) + lx(max(...w.o.waves))) / 2, p = P(wx, 3.5, min(z, ZMAX)); sign(ctx, clamp(p[0], 24, V.w - 24), min(p[1], V.hz - 30 * s), s * pulse, 'rgba(70,130,190,0.95)', 'wave', false); }
      } else if (w.back) {
        const p = P(lx(w.lane), 0, 6);
        sign(ctx, clamp(p[0], 30, V.w - 30), V.dash - 190 * V.k, s * pulse, 'rgba(200,60,40,0.95)', 'raketa', true);
      } else {
        const o = w.o, z = zOf(o.kind === 'police' ? o.a - SIM().BEAM : o.a);
        if (z > 24) { const p = P(lx(w.lane), TALL[o.kind] || 3.4, min(z, ZMAX)); sign(ctx, clamp(p[0], 24, V.w - 24), p[1] - 30 * s, s * pulse, o.kind === 'police' ? 'rgba(40,90,190,0.95)' : 'rgba(224,150,30,0.95)', o.kind, false); }
      }
      ctx.globalAlpha = 1;
    }
  }

  function coach(ctx, g, c) {
    const B = LABELS.boat, y = V.hz - 70 * V.k;
    if (c.dock) return;
    const intro = c.t < 6 ? 1 - smooth((c.t - 5) / 1) : 0;
    if (intro > 0.01) { ZS.prompt.draw(ctx, g, [[['ArrowLeft', 'ArrowRight'], B.steer]], V.cx, y, { a: intro, size: 16, max: V.w - 24 }); return; }
  }

  function overlays(ctx, g) {
    let i = 0;
    for (const f of g.floaters) {
      ctx.globalAlpha = min(1, f.t);
      label(ctx, f.text, V.cx, V.hz + (34 + i * 26) * V.k - (1.6 - f.t) * 30, 16, f.color);
      ctx.globalAlpha = 1; i++;
    }
    if (g.bubble) ZS.render.props.bubble(ctx, V.cx + 120 * V.k, V.dash - 110 * V.k, g.bubble.text, g.bubble.t, 8, V.w - 8);
  }

  function draw(g, ctx, viewW, offY) {
    const c = g.pass.play;
    setup(g, c, viewW, offY);
    const sh = c.shake * c.shake, lift = sin(clamp(c.jump, 0, 1) * PI) * 26 * V.k;
    const dx = sh * sin(V.t * 53) * 7 * V.k, dy = sh * cos(V.t * 47) * 5 * V.k + sin(V.t * 2.6) * 2 * V.k - lift;
    ctx.save();
    ctx.translate(0, offY);
    ctx.save();
    ctx.translate(dx, dy);
    ctx.translate(V.cx, V.hz); ctx.rotate(-V.turn * 0.018); ctx.translate(-V.cx, -V.hz);
    sky(ctx);
    hills(ctx);
    castleHill(ctx);
    water(ctx);
    bank(ctx, 1);
    bank(ctx, -1);
    for (const o of c.obs) { if (o.kind === 'police' && o.live && !o.gone) beam(ctx, o); if (o.kind === 'raketa') surf(ctx, o); }
    const A = SIM().advice(g, c);
    guide(ctx, g, c, A);
    things(ctx, g, c);
    outline(ctx, g, c);
    bow(ctx, c);
    ctx.restore();
    ctx.save(); ctx.translate(dx * 0.4, lift * 0.3); helm(ctx, g, c); ctx.restore();
    if (c.shake > 0.3) { ctx.fillStyle = 'rgba(214,47,39,' + ((c.shake - 0.3) * 0.3).toFixed(3) + ')'; ctx.fillRect(-2, V.top - 2, V.w + 4, V.bot - V.top + 4); }
    warnings(ctx, g, c);
    overlays(ctx, g);
    coach(ctx, g, c);
    ctx.restore();
  }

  Object.assign(API, { draw, P });
})();
