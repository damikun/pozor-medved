(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, hypot = Math.hypot;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, sstep, clamp, lerp, frac } = ZS.util;
  const API = (ZS.chopokArt = {});
  const SIM = () => ZS.sim.chopok;
  const on = (ctx, x, fn) => ZS.render.on(ctx, x, fn);
  const rise = (x) => ZS.render.rise(x);
  const A = () => ZS.alpineArt;

  const SKY = { summer: ['#6fb3e6', '#e2f1fa'], autumn: ['#86b4d8', '#f4e6cf'], snow: ['#9aaab8', '#e6ebee'] };
  const DEPTH = {
    summer: { haze: '226,238,246', far: ['#cad8e5', '#b1c3d3'], mid: '#adc0b6', near: '#9db29e', cap: 0.7 },
    autumn: { haze: '242,235,224', far: ['#d0d6de', '#b8c0cb'], mid: '#c5bca8', near: '#b4a78b', cap: 0.8 },
    snow: { haze: '232,237,241', far: ['#dbe2e8', '#c6cfd8'], mid: '#c4cbcf', near: '#adb4b1', cap: 0.92 },
  };
  const CARS = ['#c0392b', '#2f6db0', '#e6e2d6', '#3c3f45', '#e1a33a', '#4f7f5a'];
  const JERSEY = ['#e8590c', '#1f78d1', '#2f9e44', '#c2255c'];
  const figures = new Map();

  const look = (g) => (g.seasonKey === 'firstSnow' ? 'snow' : ZS.seasonLook(g.seasonKey) === 'autumn' ? 'autumn' : 'summer');
  const snowy = (g) => g.seasonKey === 'firstSnow';

  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  function person(ctx, id, kind, x, dir, state, time, extra) {
    let h = figures.get(id);
    if (!h) figures.set(id, (h = { aimAt: [0, 0], id }));
    Object.assign(h, { kind, x, y: GY, dir, state, outfit: 'summer', cold: 0, armed: false, empty: false, scared: false, kick: 0, texting: false, clutch: false, look: 0, size: 1 }, extra);
    ZS.drawHuman(ctx, h, time);
    return h;
  }

  function mark(ctx, x, y, level, time) {
    if (!level) return;
    const red = level > 1, bob = abs(sin(time * 8)) * 4;
    label(ctx, '!', x, y - bob, red ? 24 : 20, red ? '#e03131' : '#e8a400');
  }

  function ridgeLoop(seed, step, n, base, amp, jag) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = ((i % n) / n) * TAU;
      pts.push([i * step, base - amp * (0.5 + 0.3 * sin(u * 3 + seed) + 0.2 * sin(u * 7 + seed * 2.3)) - amp * jag * hash(seed + (i % n))]);
    }
    return pts;
  }

  function band(ctx, pts, bottom, off) {
    ctx.beginPath(); ctx.moveTo(pts[0][0] - off, bottom);
    for (const p of pts) ctx.lineTo(p[0] - off, p[1]);
    ctx.lineTo(pts[pts.length - 1][0] - off, bottom); ctx.closePath(); ctx.fill();
  }

  function tile(ctx, pts, bottom, shift, viewW) {
    const P = pts[pts.length - 1][0];
    for (let o = -(((shift % P) + P) % P); o < viewW + 4; o += P) band(ctx, pts, bottom, -o);
  }

  function dusted(ctx, key, col, top, base) {
    if (key !== 'snow') return col;
    const gr = ctx.createLinearGradient(0, top, 0, base);
    gr.addColorStop(0, '#f1f4f6'); gr.addColorStop(0.45, '#e2e8ec'); gr.addColorStop(1, col);
    return gr;
  }

  function haze(ctx, rgb, y0, y1, a, bottom, viewW) {
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(1, 'rgba(' + rgb + ',' + a + ')');
    ctx.fillStyle = gr; ctx.fillRect(0, y0, viewW, y1 - y0);
    ctx.fillStyle = 'rgba(' + rgb + ',' + a + ')'; ctx.fillRect(0, y1 - 0.5, viewW, bottom - y1 + 0.5);
  }

  const FARLINE = [];
  for (let i = 0; i <= 30; i++) FARLINE.push([i * 46, GY - 250 - (i % 2 ? 40 + hash(i % 30) * 70 : hash((i % 30) * 3) * 30)]);
  const BACKLINE = ridgeLoop(8.7, 70, 36, GY - 205, 60, 0.5);
  const MIDLINE = ridgeLoop(2.1, 90, 40, GY - 112, 64, 0.35);
  const NEARLINE = ridgeLoop(5.3, 120, 30, GY - 44, 46, 0.3);

  function backdrop(ctx, g, viewW, offY) {
    const L = g.level, camC = g.cam + viewW / 2, k = sstep(L.funi.station + 100, L.funi.land + 200, camC) * (1 - 0.55 * sstep(L.descent.from + 200, L.w - 400, camC));
    if (k <= 0.003) return;
    ctx.save();
    ctx.globalAlpha = k;
    skyline(ctx, look(g), camC, viewW, offY, 0);
    ctx.restore();
  }

  function skyline(ctx, key, camC, viewW, offY, lift) {
    const S = SKY[key], D = DEPTH[key], low = lift ? 600 : 0, foot = GY + 20 + low;
    const gr = ctx.createLinearGradient(0, -offY, 0, GY);
    gr.addColorStop(0, S[0]); gr.addColorStop(1, S[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, -offY, viewW, GY + offY + 40 + low);
    ctx.save(); ctx.translate(0, lift * 0.15);
    ctx.fillStyle = D.far[0];
    tile(ctx, FARLINE, foot, camC * 0.02, viewW);
    ctx.fillStyle = 'rgba(255,255,255,' + D.cap + ')';
    const P = FARLINE[30][0];
    for (let o = -(((camC * 0.02) % P + P) % P); o < viewW + 60; o += P) {
      for (let i = 1; i < 30; i += 2) {
        const [x, y] = FARLINE[i], px = x + o, l = FARLINE[i - 1], r = FARLINE[i + 1];
        if (px < -60 || px > viewW + 60) continue;
        const kl = 0.3, kr = 0.34;
        poly(ctx, [px, y, px + (r[0] - x) * kr, y + (r[1] - y) * kr, px + (r[0] - x) * kr * 0.45, y + (r[1] - y) * kr * 0.7, px + 1, y + (r[1] - y) * kr * 0.9, px + (l[0] - x) * kl * 0.5, y + (l[1] - y) * kl * 0.75, px + (l[0] - x) * kl, y + (l[1] - y) * kl]);
      }
    }
    haze(ctx, D.haze, GY - 250, GY - 150, 0.5, foot, viewW);
    ctx.restore();
    ctx.save(); ctx.translate(0, lift * 0.3);
    ctx.fillStyle = dusted(ctx, key, D.far[1], GY - 265, GY - 170);
    tile(ctx, BACKLINE, foot, camC * 0.045, viewW);
    haze(ctx, D.haze, GY - 190, GY - 95, 0.55, foot, viewW);
    ctx.restore();
    ctx.save(); ctx.translate(0, lift * 0.55);
    ctx.fillStyle = dusted(ctx, key, D.mid, GY - 180, GY - 90);
    tile(ctx, MIDLINE, foot, camC * 0.08, viewW);
    haze(ctx, D.haze, GY - 120, GY - 30, 0.45, foot, viewW);
    ctx.restore();
    ctx.save(); ctx.translate(0, lift);
    ctx.fillStyle = dusted(ctx, key, D.near, GY - 95, GY - 30);
    tile(ctx, NEARLINE, foot, camC * 0.18, viewW);
    haze(ctx, D.haze, GY - 70, GY + 4, 0.6, foot, viewW);
    ctx.restore();
  }

  function lotEdge(l, x) {
    return sstep(l.from - 50, l.from + 10, x) * (1 - sstep(l.to - 10, l.to + 50, x));
  }

  const FADE = 150;

  function road(ctx, g, x0, x1) {
    const R = g.level.road, z0 = R.to - FADE, a = max(x0, R.from), b = min(x1, R.to);
    if (min(x1, R.to + 20) <= a) return;
    const wear = (x) => clamp((x - z0) / FADE, 0, 1), e = min(b, z0);
    if (e > a) {
      ctx.fillStyle = '#5d5a55'; ctx.fillRect(a, GY + 12, e - a, 34);
      ctx.fillStyle = '#6d6a64'; ctx.fillRect(a, GY + 12, e - a, 3);
    }
    if (x1 > z0 - 30) patches(ctx, R, max(a, z0 - 30), min(x1, R.to + 20));
    ctx.fillStyle = 'rgba(30,28,26,0.22)';
    for (let c = Math.floor(a / 29); c * 29 < min(b, z0); c++) ell(ctx, c * 29 + hash(c) * 20, GY + 22 + hash(c * 2) * 20, 3 + hash(c * 3) * 6, 1.4);
    for (let x = Math.floor(a / 6) * 6; x < b; x += 6) {
      const k = 1 - clamp(wear(x) * 2.5, 0, 1);
      if (k <= 0) break;
      ctx.fillStyle = 'rgba(245,244,236,' + (0.85 * k).toFixed(3) + ')'; ctx.fillRect(x, GY + 16, 6, 2);
      if (((x % 64) + 64) % 64 < 30) ctx.fillRect(x, GY + 30, 6, 2.5);
    }
    for (let x = Math.floor(a / 5) * 5; x < b; x += 5) {
      const k = 1 - wear(x);
      if (k <= 0) break;
      ctx.globalAlpha = k;
      ctx.fillStyle = '#7e7a72'; ctx.fillRect(x, GY + 46, 5, 5);
      ctx.fillStyle = '#4f4b45'; ctx.fillRect(x, GY + 51, 5, 3);
    }
    ctx.globalAlpha = 1;
  }

  function patches(ctx, R, a, b) {
    const z0 = R.to - FADE, edge = (y) => z0 + FADE * (0.32 + 0.2 * sin(y * 0.27 + 1.3) + 0.09 * sin(y * 0.71 + 0.4) + 0.025 * sin(y * 2.3));
    ctx.save();
    ctx.beginPath(); ctx.rect(a - 30, GY + 12, b - a + 60, 34); ctx.clip();
    ctx.fillStyle = '#5d5a55';
    ctx.beginPath(); ctx.moveTo(z0 - 30, GY + 12);
    for (let y = 12; y <= 46; y += 2) ctx.lineTo(edge(y), GY + y);
    ctx.lineTo(z0 - 30, GY + 46); ctx.closePath(); ctx.fill();
    for (let c = Math.floor((a - 16) / 13); c * 13 < b + 16; c++) {
      const x = c * 13 + hash(c * 1.7) * 9, k = (x - z0) / FADE;
      if (k < 0.15 || k > 1 || hash(c * 2.9) > 0.85 * (1 - k)) continue;
      const w = (9 + hash(c * 3.3) * 12) * (1.1 - 0.6 * k), h = 1.4 + hash(c * 4.1) * 2.2, y = GY + 15 + hash(c * 5.7) * 28;
      ctx.fillStyle = '#625f59'; poly(ctx, [x - w, y + 0.5, x - w * 0.5, y - h, x + w * 0.4, y - h * 0.7, x + w, y, x + w * 0.5, y + h, x - w * 0.4, y + h * 0.8]);
    }
    for (let c = Math.floor((a - 8) / 6); c * 6 < b + 8; c++) {
      const x = c * 6 + hash(c * 0.9) * 5, k = (x - z0) / FADE;
      if (k < 0 || k > 1.1 || hash(c * 6.1) > 0.25 + 0.5 * k) continue;
      const r = 1 + hash(c * 3.1) * 2.2;
      ctx.fillStyle = hash(c * 4.7) > 0.5 ? '#c9c0ae' : '#8a8172'; ell(ctx, x, GY + 14 + hash(c * 2.3) * 30, r, r * 0.7);
    }
    ctx.restore();
  }

  function trail(ctx, g, x0, x1) {
    const T = g.level.trail, a = max(x0, T.from - FADE - 10), b = min(x1, T.to + 4);
    if (b <= a) return;
    const w = (x) => 1 - 0.45 * sstep(T.to - 300, T.to, x), end = (x) => sstep(T.to - 80, T.to, x);
    const bot = (x) => GY + 12 + 32 * w(x) + 1.5 * sin(x * 0.031), at = (x, y) => lerp(y, bot(x), end(x));
    const s0 = Math.floor(a / 16) * 16, s1 = Math.ceil(b / 16) * 16 + 16;
    ctx.fillStyle = '#a99f8c';
    ctx.beginPath();
    for (let x = s0; x <= s1; x += 16) ctx.lineTo(x, at(x, GY + 12 + 1.2 * sin(x * 0.05)));
    for (let x = s1; x >= s0; x -= 16) ctx.lineTo(x, bot(x));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(96,86,70,0.32)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = s0; x <= s1; x += 16) ctx.lineTo(x, at(x, GY + 21));
    ctx.moveTo(s0, at(s0, GY + 12 + 24 * w(s0)));
    for (let x = s0 + 16; x <= s1; x += 16) ctx.lineTo(x, at(x, GY + 12 + 24 * w(x)));
    ctx.stroke();
    for (let c = Math.floor(a / 11) - 1; c * 11 < b; c++) {
      const x = c * 11 + hash(c) * 8, y = at(x, GY + 14 + hash(c * 2.3) * 28 * w(x)), r = (1.2 + hash(c * 3.1) * 2.4) * (1 - 0.6 * end(x));
      if (x > T.to) continue;
      ctx.fillStyle = hash(c * 4.7) > 0.5 ? '#c9c0ae' : '#8a8172'; ell(ctx, x, y, r, r * 0.7);
    }
    ctx.fillStyle = '#8f877a';
    for (let c = Math.floor(a / 23) - 1; c * 23 < b + 10; c++) { const x = c * 23 + hash(c * 5) * 10, k = 1 - 0.7 * end(x); if (x < T.to) ell(ctx, x, bot(x) + 1, (4 + hash(c * 9) * 3) * k, 2.4 * k); }
  }


  function lots(ctx, g, x0, x1) {
    for (const l of g.level.lots) {
      if (l.to + 60 < x0 || l.from - 60 > x1) continue;
      const a = max(x0, l.from - 50), b = min(x1, l.to + 50), xs = [];
      for (let x = Math.floor(a / 10) * 10; x <= b + 10; x += 10) xs.push(x);
      const top = (x) => GY + 14 - 17 * lotEdge(l, x);
      ctx.fillStyle = '#6a6761';
      ctx.beginPath(); ctx.moveTo(xs[0], GY + 14);
      for (const x of xs) ctx.lineTo(x, top(x));
      ctx.lineTo(xs[xs.length - 1], GY + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      for (const x of xs) ctx.lineTo(x, top(x));
      for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], GY + 14 - 15 * lotEdge(l, xs[i]));
      ctx.closePath(); ctx.fill();
      if (!l.lines) continue;
      ctx.strokeStyle = 'rgba(245,244,236,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = Math.ceil((l.from + 30) / 58) * 58; x < l.to - 30; x += 58) { if (x < a || x > b) continue; ctx.moveTo(x, GY - 1); ctx.lineTo(x + 12, GY + 12); }
      ctx.stroke();
    }
  }

  function bridgeDeck(ctx, g, x0, x1) {
    const x = g.level.road.bridge;
    if (x + 160 < x0 || x - 160 > x1) return;
    ctx.fillStyle = '#2f4f63'; ctx.fillRect(x - 110, GY + 54, 220, 60);
    ctx.fillStyle = '#4f86a8'; ell(ctx, x, GY + 62, 100, 7);
    ctx.fillStyle = 'rgba(230,245,255,0.7)';
    for (let i = 0; i < 6; i++) { const u = ((g.time * 0.5 + i / 6) % 1); ell(ctx, x - 90 + u * 180, GY + 64 + (i % 2) * 6, 10, 1.6); }
    ctx.fillStyle = '#9a9890'; ctx.fillRect(x - 118, GY + 46, 10, 60); ctx.fillRect(x + 108, GY + 46, 10, 60);
    ctx.fillStyle = '#b9b5ab'; ell(ctx, x - 70, GY + 70, 9, 4); ell(ctx, x + 50, GY + 74, 11, 4);
  }

  function turf(ctx, g, x0, x1) {
    const L = g.level, h0 = L.funi.land - 60;
    if (x1 <= h0) return;
    const a = max(x0, h0), T = A().TURF[ZS.seasonLook(g.seasonKey)] || A().TURF.summer;
    const gr = ctx.createLinearGradient(h0, 0, h0 + 300, 0);
    gr.addColorStop(0, T.top + '00'); gr.addColorStop(1, T.top);
    ctx.fillStyle = gr; ctx.fillRect(a, GY - 2, x1 - a, 16);
    if (x1 > h0 + 200) { ctx.fillStyle = '#7a7266'; ctx.fillRect(max(a, h0 + 200), GY + 14, x1 - max(a, h0 + 200), 30); }
    ctx.fillStyle = 'rgba(214,200,170,0.75)';
    ctx.beginPath(); ctx.moveTo(a - 20, GY + 4);
    for (let x = Math.floor((a - 20) / 20) * 20; x <= x1 + 20; x += 20) ctx.lineTo(x, GY + 4 + 1.5 * sin(x * 0.03));
    for (let x = Math.ceil((x1 + 20) / 20) * 20; x >= a - 20; x -= 20) ctx.lineTo(x, GY + 9 + 1.5 * sin(x * 0.03));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a19b8f';
    for (let c = Math.floor((a - 20) / 41); c * 41 < x1 + 20; c++) {
      if (c * 41 < h0 + 200 || hash(c * 1.3) < 0.45) continue;
      const x = c * 41 + hash(c) * 30, w = 4 + hash(c * 5) * 7;
      ell(ctx, x, GY + 18 + hash(c * 2) * 20, w, w * 0.6);
    }
    if (snowy(g)) {
      ctx.fillStyle = 'rgba(250,252,253,0.92)';
      for (let c = Math.floor((a - 40) / 53); c * 53 < x1 + 40; c++) {
        if (hash(c * 2.7) < 0.35 || c * 53 < L.crest.from - 400) continue;
        ell(ctx, c * 53 + hash(c) * 20, GY - 1, 14 + hash(c * 3) * 22, 3 + hash(c * 4) * 2);
      }
    }
  }

  const SLICE = 25;

  function ground(ctx, g, cam, viewW) {
    const x0 = Math.floor((cam - 20) / SLICE) * SLICE, x1 = cam + viewW + 20, B = ZS.render.backdrop, H = (g.viewH || 540) + 400;
    const m = ctx.getTransform ? ctx.getTransform() : null;
    const snap = m && m.a ? (x) => (Math.round(m.a * x + m.e) - m.e) / m.a : (x) => x;
    for (let a = x0; a < x1; a += SLICE) {
      const z = a + SLICE, d = rise(a), k = (rise(z) - d) / SLICE, l = snap(a);
      ctx.save();
      ctx.beginPath(); ctx.rect(l, GY - 700, snap(z) - l, H + 700); ctx.clip();
      ctx.transform(1, k, 0, 1, 0, d - k * a);
      hillside(ctx, g, a, SLICE);
      B.ground(ctx, a, SLICE, g);
      trail(ctx, g, a, z);
      road(ctx, g, a, z);
      lots(ctx, g, a, z);
      bridgeDeck(ctx, g, a, z);
      turf(ctx, g, a, z);
      ctx.restore();
    }
  }

  function under(ctx, g, viewW) {
    const hi = g.cam + viewW / 2 > g.level.funi.station, H = (g.viewH || 540) + 300;
    const gr = ctx.createLinearGradient(0, GY - 10, 0, GY + 200);
    gr.addColorStop(0, hi ? '#9aa487' : '#6f9660'); gr.addColorStop(1, hi ? '#7f8a6c' : '#557a4a');
    ctx.fillStyle = gr;
    ctx.fillRect(0, GY - 6, viewW, H);
  }

  function ellipse(ctx, x, y, rx, ry) { ell(ctx, x, y, rx, ry); }

  function car(ctx, x, col, sd) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, x, GY + 3, 40, 4);
    ctx.fillStyle = col; rr(ctx, x - 38, GY - 26, 76, 18, 6);
    ctx.beginPath(); ctx.moveTo(x - 24, GY - 25); ctx.lineTo(x - 14, GY - 42); ctx.lineTo(x + 16, GY - 42); ctx.lineTo(x + 28, GY - 25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b9d3e3'; poly(ctx, [x - 18, GY - 27, x - 11, GY - 39, x, GY - 39, x, GY - 27]); poly(ctx, [x + 3, GY - 27, x + 3, GY - 39, x + 14, GY - 39, x + 22, GY - 27]);
    ctx.fillStyle = '#1e1f22'; circle(ctx, x - 22, GY - 7, 8); circle(ctx, x + 22, GY - 7, 8);
    ctx.fillStyle = '#9a9ca0'; circle(ctx, x - 22, GY - 7, 3.4); circle(ctx, x + 22, GY - 7, 3.4);
    ctx.fillStyle = sd > 0.5 ? '#ffe08a' : '#f6f2e6'; ctx.fillRect(x + 33, GY - 22, 5, 4);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 38, GY - 22, 3, 4);
  }

  function bus(ctx, x, time) {
    const w = 230, left = x - w / 2, top = GY - 96;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, x, GY + 3, w / 2 + 8, 5);
    ctx.fillStyle = '#e8e4da'; rr(ctx, left, top, w, 84, 8);
    ctx.fillStyle = '#2f6db0'; ctx.fillRect(left, top + 52, w, 10);
    ctx.fillStyle = '#5d7f99';
    for (let i = 0; i < 6; i++) ctx.fillRect(left + 12 + i * 34, top + 12, 28, 30);
    ctx.fillStyle = '#7fa2bb'; ctx.fillRect(left + w - 18, top + 10, 14, 44);
    ctx.fillStyle = '#1b1c1f'; ctx.fillRect(left + w - 70, top - 2, 60, 12);
    ctx.fillStyle = '#f0b429'; ctx.font = '800 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.chopok.board.bus, left + w - 40, top + 4);
    ctx.fillStyle = '#1e1f22'; circle(ctx, left + 40, GY - 10, 12); circle(ctx, left + w - 46, GY - 10, 12);
    ctx.fillStyle = '#8c8e92'; circle(ctx, left + 40, GY - 10, 5); circle(ctx, left + w - 46, GY - 10, 5);
    ctx.fillStyle = 'rgba(140,140,140,' + (0.25 + 0.15 * sin(time * 3)) + ')'; ell(ctx, left - 8, GY - 12, 7, 4);
  }

  function machine(ctx, x) {
    ctx.fillStyle = '#3c4048'; ctx.fillRect(x - 3, GY - 44, 6, 44);
    ctx.fillStyle = '#2f6db0'; rr(ctx, x - 14, GY - 86, 28, 44, 3);
    ctx.fillStyle = '#d7e6f0'; ctx.fillRect(x - 9, GY - 80, 18, 10);
    ctx.fillStyle = '#fff'; ctx.font = '800 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.chopok.board.pay, x, GY - 62);
    ctx.fillStyle = '#f0b429'; ctx.fillRect(x - 6, GY - 54, 12, 3);
  }

  function kiosk(ctx, x, t) {
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 46, GY - 74, 92, 74);
    ctx.fillStyle = '#5a3d22'; poly(ctx, [x - 56, GY - 72, x, GY - 104, x + 56, GY - 72]);
    ctx.fillStyle = '#f3e6c8'; ctx.fillRect(x - 38, GY - 62, 76, 30);
    ctx.fillStyle = '#c0392b'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 46 + i * 16, GY - 80, 8, 8);
    ctx.fillStyle = '#2f5d3a'; ctx.fillRect(x - 44, GY - 30, 88, 12);
    ctx.fillStyle = '#fff'; ctx.font = '800 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.chopok.board.kiosk, x, GY - 24, 84);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.08 * sin(t * 2)).toFixed(3) + ')'; ell(ctx, x + 30, GY - 90, 6, 10);
  }

  function parking(ctx, g, vis) {
    const C = g.level.concrete, t = g.time;
    C.cars.forEach((x, i) => { if (vis(x, 60)) on(ctx, x, () => car(ctx, x, CARS[i % CARS.length], hash(i))); });
    if (vis(C.machine, 30)) on(ctx, C.machine, () => machine(ctx, C.machine));
    if (vis(C.bus, 140)) on(ctx, C.bus, () => bus(ctx, C.bus, t));
    if (vis(C.from + 560, 80)) on(ctx, C.from + 520, () => kiosk(ctx, C.from + 520, t));
    if (vis(3200, 60)) on(ctx, 3200, () => car(ctx, 3200, CARS[1], hash(3)));
  }

  function hill(x, H) {
    const u = (x - H.from) / (H.to - H.from);
    if (u <= 0 || u >= 1) return 0;
    const k = u < H.peak ? smooth(u / H.peak) : smooth((1 - u) / (1 - H.peak));
    return H.h * k * (0.92 + 0.08 * sin(x * 0.013));
  }

  const HILL = { from: 2300, to: 4900, peak: 0.55, h: 330 };

  function hillside(ctx, g, cam, viewW) {
    const x0 = max(HILL.from, cam - 60), x1 = min(HILL.to, cam + viewW + 60);
    if (x1 <= x0) return;
    const step = 16;
    ctx.fillStyle = '#4c6a43';
    ctx.beginPath(); ctx.moveTo(x0, GY + 2);
    for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) ctx.lineTo(x, GY - hill(x, HILL));
    ctx.lineTo(x1 + step, GY + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9c1ae';
    ctx.beginPath(); ctx.moveTo(x0, GY + 2);
    for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) {
      const h = hill(x, HILL), cliff = sstep(3200, 3520, x) * (1 - sstep(4100, 4450, x));
      ctx.lineTo(x, GY - h * cliff * (0.72 + 0.1 * sin(x * 0.031)));
    }
    ctx.lineTo(x1 + step, GY + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b3ab97';
    for (let c = Math.floor(x0 / 47); c * 47 < x1; c++) {
      const x = c * 47 + hash(c) * 30, h = hill(x, HILL), cliff = sstep(3200, 3520, x) * (1 - sstep(4100, 4450, x));
      if (cliff < 0.3) continue;
      ell(ctx, x, GY - h * cliff * (0.2 + hash(c * 3) * 0.45), 8 + hash(c * 2) * 12, 5 + hash(c * 4) * 6);
    }
    ctx.fillStyle = 'rgba(70,64,52,0.22)';
    for (let c = Math.floor(x0 / 61); c * 61 < x1; c++) {
      const x = c * 61 + hash(c * 5) * 30, h = hill(x, HILL), cliff = sstep(3200, 3520, x) * (1 - sstep(4100, 4450, x));
      if (cliff < 0.4) continue;
      ctx.fillRect(x, GY - h * cliff * 0.7, 2, h * cliff * 0.4);
    }
    for (let c = Math.floor(x0 / 23); c * 23 < x1; c++) {
      const x = c * 23 + hash(c * 7) * 14, h = hill(x, HILL);
      if (h < 30 || hash(c * 9) < 0.35) continue;
      const cliff = sstep(3200, 3520, x) * (1 - sstep(4100, 4450, x)), y = GY - h + 6 + hash(c * 11) * 20;
      if (cliff > 0.5 && y > GY - h * cliff * 0.72) continue;
      const th = 26 + hash(c * 13) * 22;
      ctx.fillStyle = hash(c * 17) > 0.5 ? '#2f5639' : '#38653f';
      poly(ctx, [x - th * 0.3, y + 4, x, y - th, x + th * 0.3, y + 4]);
    }
  }

  function grade(ctx, x) {
    ctx.fillStyle = '#5a5f66'; ctx.fillRect(x - 2, GY - 70, 4, 70);
    ctx.fillStyle = '#fff'; poly(ctx, [x, GY - 104, x + 20, GY - 70, x - 20, GY - 70]);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, GY - 100); ctx.lineTo(x + 17, GY - 72); ctx.lineTo(x - 17, GY - 72); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#1b1b1b'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('8 %', x, GY - 79);
    poly(ctx, [x - 8, GY - 86, x + 8, GY - 92, x + 8, GY - 86]);
  }

  function rail(ctx, g, vis) {
    const x = g.level.road.bridge;
    if (!vis(x, 160)) return;
    ctx.fillStyle = '#b9b5ab';
    for (let px = x - 110; px <= x + 110; px += 44) ctx.fillRect(px - 3, GY - 30, 6, 30);
    ctx.fillStyle = '#cfcbc0'; ctx.fillRect(x - 116, GY - 34, 232, 7);
    ctx.fillStyle = '#9a968c'; ctx.fillRect(x - 116, GY - 16, 232, 4);
    board(ctx, x - 150, GY - 76, 90, LABELS.chopok.board.river, '#2f6db0', '#fff', 10);
  }

  function portal(ctx, x, dark) {
    ctx.fillStyle = '#8f8676';
    ctx.beginPath(); ctx.moveTo(x - 46, GY); ctx.lineTo(x - 46, GY - 78); ctx.quadraticCurveTo(x, GY - 132, x + 46, GY - 78); ctx.lineTo(x + 46, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(x - 34, GY); ctx.lineTo(x - 34, GY - 72); ctx.quadraticCurveTo(x, GY - 116, x + 34, GY - 72); ctx.lineTo(x + 34, GY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a4438'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 14, GY - 2); ctx.lineTo(x + i * 14, GY - 70 + abs(i) * 8); ctx.stroke(); }
  }

  function board(ctx, x, y, w, text, bg, fg, size) {
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 2, y, 4, GY - y);
    ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - 18, w, 20);
    ctx.fillStyle = fg; ctx.font = '700 ' + (size || 10) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - 8, w - 6);
  }

  function cave(ctx, g, vis, span) {
    const C = g.level.cave, B = LABELS.chopok.board;
    if (vis(C.booth, 60)) on(ctx, C.booth, () => {
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(C.booth - 30, GY - 70, 60, 70);
      ctx.fillStyle = '#5a3d22'; poly(ctx, [C.booth - 38, GY - 68, C.booth, GY - 92, C.booth + 38, GY - 68]);
      ctx.fillStyle = '#f3e6c8'; ctx.fillRect(C.booth - 20, GY - 56, 40, 22);
      ctx.fillStyle = '#2f5d3a'; ctx.fillRect(C.booth - 28, GY - 30, 56, 12);
      ctx.fillStyle = '#fff'; ctx.font = '800 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(B.ticket, C.booth, GY - 24);
      board(ctx, C.booth + 44, GY - 104, 118, B.tour, '#f6f1e3', '#2a2a2a', 9);
    });
    if (span(C.from - 60, C.to + 80, 60)) {
      on(ctx, C.door, () => { portal(ctx, C.door, '#1a1714'); board(ctx, C.door, GY - 150, 150, B.cave, '#2f5d3a', '#fff', 10); });
      on(ctx, C.exit, () => {
        portal(ctx, C.exit, '#232a33');
        ctx.fillStyle = '#f4f7f9'; ell(ctx, C.exit + 46, GY - 6, 30, 12); ell(ctx, C.exit + 26, GY - 2, 22, 7);
        ctx.fillStyle = '#d8e2ea'; ell(ctx, C.exit + 52, GY - 10, 14, 5);
        board(ctx, C.exit + 70, GY - 104, 170, B.ice, '#e9f2f8', '#2f4f6a', 9);
      });
    }
    if (span(C.group - 50, C.door, 40)) {
      for (let i = 0; i < 9; i++) {
        const x = C.group + i * 12 - (i % 2) * 4, idle = sin(g.time * 0.9 + i) > 0.6;
        on(ctx, x, () => person(ctx, 'caveGuest' + i, 'tourist', x, idle ? -1 : 1, 'idle', g.time, { look: i, hiker: true, empty: true, size: 0.86 + (i % 3) * 0.05 }));
      }
    }
  }

  function chalet(ctx, x, w, floors, sign, sd, t) {
    const left = x - w / 2, base = 46, fh = 44, top = GY - base - floors * fh;
    ctx.fillStyle = 'rgba(30,24,16,0.2)'; ell(ctx, x, GY + 2, w / 2 + 16, 6);
    stoneWall(ctx, left, GY - base, w, base, sd);
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(left + 4, top, w - 8, floors * fh);
    ctx.strokeStyle = 'rgba(60,36,18,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let px = left + 12; px < left + w - 8; px += 9) { ctx.moveTo(px, top); ctx.lineTo(px, GY - base); } ctx.stroke();
    for (let f = 0; f < floors; f++) {
      const y = top + f * fh;
      for (let wx = left + 22; wx < left + w - 30; wx += 46) {
        ctx.fillStyle = '#5a3a1f'; ctx.fillRect(wx - 3, y + 8, 28, 24);
        ctx.fillStyle = hash(sd + f * 7 + wx) > 0.7 ? '#ffe7a6' : '#9fc0d4'; ctx.fillRect(wx, y + 11, 22, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(wx + 2, y + 13, 5, 14);
        ctx.fillStyle = '#5a3a1f'; ctx.fillRect(wx + 10, y + 11, 2, 18);
      }
      ctx.fillStyle = '#6b4626'; ctx.fillRect(left - 2, y + fh - 8, w + 4, 4);
      ctx.strokeStyle = '#6b4626'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let px = left; px <= left + w; px += 8) { ctx.moveTo(px, y + fh - 8); ctx.lineTo(px, y + fh - 20); } ctx.moveTo(left, y + fh - 20); ctx.lineTo(left + w, y + fh - 20); ctx.stroke();
      if (hash(sd + f) > 0.4) { ctx.fillStyle = '#c92a2a'; for (let px = left + 14; px < left + w - 10; px += 22) circle(ctx, px, y + fh - 22, 3); }
    }
    ctx.fillStyle = '#4b3a2e';
    ctx.beginPath(); ctx.moveTo(left - 26, top + 6); ctx.lineTo(x, top - w * 0.36); ctx.lineTo(left + w + 26, top + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 1; i < 6; i++) { const k = i / 6; ctx.moveTo(lerp(left - 26, x, k), lerp(top + 6, top - w * 0.36, k)); ctx.lineTo(lerp(left + w + 26, x, k), lerp(top + 6, top - w * 0.36, k)); } ctx.stroke();
    ctx.fillStyle = '#7d766a'; ctx.fillRect(x + w * 0.2, top - w * 0.3, 14, 34);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.08 * sin(t + sd)).toFixed(3) + ')'; ell(ctx, x + w * 0.2 + 7, top - w * 0.3 - 12 - ((t * 10 + sd * 9) % 20), 7, 10);
    if (sign) {
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 54, top - 2 - fh * 0.15, 108, 20);
      ctx.fillStyle = '#f2e8d0'; ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sign, x, top + 8 - fh * 0.15, 100);
    }
    ctx.fillStyle = '#5a3a1f'; ctx.fillRect(x - 16, GY - 40, 32, 40);
    ctx.fillStyle = '#ffe7a6'; ctx.fillRect(x - 12, GY - 36, 10, 14); ctx.fillRect(x + 2, GY - 36, 10, 14);
  }

  function resort(ctx, g, vis) {
    const J = g.level.jasna, B = LABELS.chopok.board, t = g.time;
    for (const [x, w, n, sign, sd] of J.hotels) if (vis(x, w)) on(ctx, x, () => chalet(ctx, x, w, n, sign ? B[sign] : '', sd, t));
  }

  function station(ctx, x, w, h, name, time, up) {
    const left = x - w / 2, top = GY - h;
    ctx.fillStyle = '#a7a59f'; ctx.fillRect(left, GY - 30, w, 30);
    ctx.fillStyle = '#d9dee2'; ctx.fillRect(left + 6, top, w - 12, h - 30);
    ctx.fillStyle = '#7ea6c2';
    for (let wx = left + 14; wx < left + w - 20; wx += 24) ctx.fillRect(wx, top + 12, 18, h - 56);
    ctx.fillStyle = '#4e5a63'; ctx.fillRect(left - 4, top - 10, w + 8, 12);
    ctx.fillStyle = '#e8590c'; ctx.fillRect(left + 10, top - 30, 96, 20);
    ctx.fillStyle = '#fff'; ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, left + 58, top - 20, 90);
    const wx = up ? left + w - 20 : left + 20, wy = top + 30;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(time * (up ? 1.2 : -1.2));
    ctx.strokeStyle = '#3c4048'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
    ctx.restore();
  }

  function cabin(ctx, x, y, s) {
    ctx.strokeStyle = '#3c4048'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(x - 6 * s, y); ctx.lineTo(x - 6 * s, y + 18 * s); ctx.moveTo(x + 6 * s, y); ctx.lineTo(x + 6 * s, y + 18 * s); ctx.stroke();
    ctx.fillStyle = '#e8590c'; rr(ctx, x - 24 * s, y + 18 * s, 48 * s, 30 * s, 6 * s);
    ctx.fillStyle = '#bcd6e6'; ctx.fillRect(x - 19 * s, y + 23 * s, 38 * s, 13 * s);
    ctx.fillStyle = '#3c4048'; ctx.fillRect(x - 24 * s, y + 40 * s, 48 * s, 3 * s);
  }

  function funitel(ctx, g, vis, span) {
    const F = g.level.funi, t = g.time;
    if (span(F.station - 120, F.land, 200)) {
      const a = [F.station + 70, GY - 120], b = [F.top - 40, GY - 640];
      ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 1.6;
      for (const d of [-5, 5]) { ctx.beginPath(); ctx.moveTo(a[0], a[1] + d); ctx.lineTo(b[0], b[1] + d); ctx.stroke(); }
      const u = (t * 0.05) % 1, cx = lerp(a[0], b[0], u), cy = lerp(a[1], b[1], u);
      cabin(ctx, cx, cy - 5, 0.8);
      const v = (t * 0.05 + 0.5) % 1;
      cabin(ctx, lerp(a[0], b[0], v), lerp(a[1], b[1], v) - 5, 0.8);
      ctx.fillStyle = '#5f6b59';
      ctx.beginPath(); ctx.moveTo(F.from - 10, GY);
      ctx.lineTo(F.from + 10, GY - 160); ctx.lineTo(F.from + 60, GY - 210); ctx.lineTo(F.from + 120, GY - 330); ctx.lineTo(F.to - 70, GY - 360); ctx.lineTo(F.to - 70, GY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7d7769';
      poly(ctx, [F.from + 30, GY - 180, F.from + 70, GY - 220, F.from + 96, GY - 190, F.from + 60, GY - 150]);
      poly(ctx, [F.from + 120, GY - 300, F.from + 170, GY - 330, F.from + 200, GY - 290, F.from + 150, GY - 270]);
      ctx.fillStyle = '#2e5639';
      for (let i = 0; i < 9; i++) ell(ctx, F.from + 20 + hash(i * 3.1) * 230, GY - 30 - hash(i * 5.3) * 200, 22, 10);
    }
    if (vis(F.station, 140)) {
      station(ctx, F.station, 180, 140, LABELS.chopok.board.station, t, true);
      ctx.fillStyle = '#c9ccd0'; ctx.fillRect(F.door - 8, GY - 40, 16, 40);
      ctx.fillStyle = '#2f9e44'; circle(ctx, F.door, GY - 46, 4);
    }
    if (vis(F.top, 140)) station(ctx, F.top, 170, 130, LABELS.chopok.board.top, t, false);
  }

  function glassRing(ctx, x, y0, y1, R, t, ribs) {
    const gl = ctx.createLinearGradient(x - R, 0, x + R, 0);
    gl.addColorStop(0, '#5e7c90'); gl.addColorStop(0.3, '#cfe3ee'); gl.addColorStop(0.5, '#a9c6d8'); gl.addColorStop(1, '#55728a');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.moveTo(x - R + 4, y0); ctx.lineTo(x - R - 4, y1); ctx.lineTo(x + R + 4, y1); ctx.lineTo(x + R - 4, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3e4a52'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -ribs; i <= ribs; i++) { const u = i / ribs, sx = x + Math.sin(u * PI / 2) * (R - 3); ctx.moveTo(sx, y0); ctx.lineTo(sx + u * 4, y1); }
    ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - R, (y0 + y1) / 2); ctx.lineTo(x + R, (y0 + y1) / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.32 + 0.12 * sin(t * 0.7)).toFixed(3) + ')';
    poly(ctx, [x - R * 0.55, y1 + 2, x - R * 0.45, y1 + 2, x - R * 0.6, y0 - 2, x - R * 0.7, y0 - 2]);
    poly(ctx, [x - R * 0.34, y1 + 2, x - R * 0.29, y1 + 2, x - R * 0.42, y0 - 2, x - R * 0.47, y0 - 2]);
    ctx.fillStyle = 'rgba(255,226,160,0.5)';
    for (let i = -ribs + 1; i < ribs; i += 3) { const u = (i + 0.5) / ribs, sx = x + Math.sin(u * PI / 2) * (R - 3); ctx.fillRect(sx - 6, y0 - 16, 12, 10); }
  }

  function rotunda(ctx, x, t) {
    const base = GY, R = 186, R2 = 150;
    ctx.fillStyle = 'rgba(30,30,24,0.2)'; ell(ctx, x, base + 2, R + 40, 8);
    ctx.fillStyle = '#7d766a'; poly(ctx, [x - R - 30, base + 40, x - R - 12, base - 46, x + R + 12, base - 46, x + R + 30, base + 40]);
    ctx.fillStyle = '#958e80';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 18; i++) { const bx = x - R - 8 + i * 22 + (r % 2) * 11, k = hash(i * 1.9 + r * 7); if (k > 0.25 && bx < x + R + 6) ctx.fillRect(bx, base - 44 + r * 15, 19, 12); }
    ctx.fillStyle = '#5d564b'; ctx.fillRect(x - R - 14, base - 54, 2 * R + 28, 9);
    glassRing(ctx, x, base - 54, base - 150, R, t, 9);
    ctx.fillStyle = '#e8590c'; ctx.fillRect(x - R - 12, base - 162, 2 * R + 24, 12);
    ctx.fillStyle = '#c4490a'; ctx.fillRect(x - R - 12, base - 152, 2 * R + 24, 3);
    ctx.fillStyle = '#5d564b'; ctx.fillRect(x - R - 18, base - 168, 2 * R + 36, 6);
    ctx.strokeStyle = '#5d564b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - R - 18, base - 186); ctx.lineTo(x + R + 18, base - 186);
    for (let px = x - R - 16; px <= x + R + 16; px += 12) { ctx.moveTo(px, base - 186); ctx.lineTo(px, base - 168); }
    ctx.stroke();
    glassRing(ctx, x, base - 168, base - 236, R2, t + 1, 7);
    ctx.fillStyle = '#4b535a';
    ctx.beginPath(); ctx.moveTo(x - R2 - 20, base - 234); ctx.quadraticCurveTo(x, base - 330, x + R2 + 20, base - 234); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#626b73';
    ctx.beginPath(); ctx.moveTo(x - R2 * 0.65, base - 256); ctx.quadraticCurveTo(x, base - 320, x + R2 * 0.3, base - 270); ctx.quadraticCurveTo(x - R2 * 0.1, base - 290, x - R2 * 0.65, base - 256); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3e454c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(x + i * R2 * 0.3, base - 236); ctx.quadraticCurveTo(x + i * R2 * 0.18, base - 290, x, base - 282); } ctx.stroke();
    ctx.fillStyle = '#3a4046'; ctx.fillRect(x - 4, base - 384, 8, 106);
    ctx.fillRect(x - 22, base - 356, 44, 4); ctx.fillRect(x - 15, base - 336, 30, 4); ctx.fillRect(x - 26, base - 312, 52, 4);
    ctx.fillStyle = '#d9dde0'; ctx.fillRect(x + 6, base - 342, 10, 20); ctx.fillRect(x - 16, base - 322, 10, 18);
    ctx.fillStyle = (t % 1.6) < 0.8 ? '#ff4a3d' : '#7a2a24'; circle(ctx, x, base - 388, 4);
    ctx.fillStyle = '#fff'; ctx.font = '900 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.chopok.board.rotunda, x, base - 156);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x + R + 40, base - 150, 3, 150);
    ctx.save(); ctx.translate(x + R + 43, base - 148); ctx.rotate(sin(t * 3) * 0.08);
    ctx.fillStyle = '#e8590c'; poly(ctx, [0, 0, 32, 6, 0, 17]); ctx.restore();
  }

  function stoneWall(ctx, x, y, w, h, sd) {
    ctx.fillStyle = '#857c6c'; ctx.fillRect(x, y, w, h);
    for (let r = 0; r * 14 < h; r++) {
      for (let c = 0; c * 22 < w; c++) {
        const off = r % 2 ? 11 : 0, sx = x + c * 22 - off, sw = 20, k = hash(sd + r * 7 + c * 3);
        if (sx + sw < x || sx > x + w) continue;
        ctx.fillStyle = k > 0.66 ? '#9b927f' : k > 0.33 ? '#8e8574' : '#a69d8b';
        const a = max(x, sx), b = min(x + w, sx + sw);
        ctx.fillRect(a + 1, y + r * 14 + 1, b - a - 2, min(12, y + h - (y + r * 14) - 1));
      }
    }
  }

  function chataBack(ctx, g, vis) {
    const C = g.level.chata, t = g.time, B = LABELS.chopok.board;
    if (!vis((C.from + C.to) / 2, (C.to - C.from) / 2 + 80)) return;
    const k = g.chopok && g.chopok.chata;
    stoneWall(ctx, C.from, GY - 160, C.to - C.from, 160, 4.7);
    ctx.fillStyle = '#e9d6ac'; ctx.fillRect(C.door + 14, GY - 130, C.exit - C.door - 28, 130);
    ctx.fillStyle = 'rgba(255,214,140,0.35)'; ctx.fillRect(C.door + 14, GY - 130, C.exit - C.door - 28, 130);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(C.door + 14, GY - 26, C.exit - C.door - 28, 26);
    ctx.fillStyle = '#5a5f66';
    ctx.beginPath(); ctx.moveTo(C.from - 30, GY - 158); ctx.lineTo((C.from + C.to) / 2, GY - 226); ctx.lineTo(C.to + 30, GY - 158); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6f757c';
    for (let x = C.from - 20; x < C.to + 20; x += 18) { ctx.fillRect(x, GY - 168 - (1 - abs(x - (C.from + C.to) / 2) / ((C.to - C.from) / 2 + 30)) * 58, 2, 10); }
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect((C.from + C.to) / 2 - 92, GY - 204, 184, 24);
    ctx.fillStyle = '#f2e8d0'; ctx.font = '800 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(B.chata, (C.from + C.to) / 2, GY - 192, 176);
    ctx.fillStyle = '#2f3a2c'; ctx.fillRect(C.counter + 4, GY - 120, 92, 40);
    ctx.fillStyle = '#f4f0e2'; ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText(B.menu, C.counter + 50, GY - 106, 86);
    ctx.fillText(B.menu2, C.counter + 50, GY - 92, 86);
    const px = C.cook + 44;
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(px - 26, GY - 40, 52, 40);
    ctx.fillStyle = '#6d6f73'; rr(ctx, px - 22, GY - 72, 44, 32, 6);
    ctx.fillStyle = '#8a8d92'; ctx.fillRect(px - 24, GY - 74, 48, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1); circle(ctx, px - 8 + i * 8 + sin(t * 2 + i) * 4, GY - 80 - u * 40, 5 + u * 6); }
    if (k) {
      const cook = k.cook, face = cook.state === 'look' ? -1 : 1;
      person(ctx, 'chataCook', 'waiter', C.cook, face, 'idle', t);
      mark(ctx, C.cook, GY - 112, cook.state === 'turn' ? 1 : cook.state === 'look' ? 2 : 0, t);
      k.guests.forEach((p, i) => {
        person(ctx, 'chataGuest' + i, 'guest', p.x, p.state === 'look' ? -1 : 1, 'idle', t, { look: p.look });
        mark(ctx, p.x, GY - 100, p.state === 'zip' ? 1 : p.state === 'look' ? 2 : 0, t);
      });
    }
    ctx.fillStyle = '#7a5530'; ctx.fillRect(C.counter - 6, GY - 54, 40, 54);
    ctx.fillStyle = '#9a7040'; ctx.fillRect(C.counter - 10, GY - 58, 48, 6);
  }

  function chataFront(ctx, g, vis) {
    const C = g.level.chata;
    if (!vis((C.from + C.to) / 2, (C.to - C.from) / 2 + 80)) return;
    stoneWall(ctx, C.from, GY - 160, C.door - 6 - C.from, 160, 5.1);
    stoneWall(ctx, C.exit + 6, GY - 160, C.to - C.exit - 6, 160, 6.3);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(C.door - 8, GY - 104, 6, 104); ctx.fillRect(C.exit + 2, GY - 104, 6, 104);
    const k = g.chopok && g.chopok.chata;
    if (k && k.bill > 0) stamp(ctx, C.counter + 10, GY - 150, LABELS.chopok.bill, min(1, k.bill * 2), g.time);
  }

  function stamp(ctx, x, y, text, a, t) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.1 + 0.01 * sin(t * 2));
    ctx.globalAlpha = a;
    ctx.font = '900 14px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 24;
    ctx.fillStyle = 'rgba(255,248,236,0.9)'; ctx.fillRect(-w / 2, -16, w, 32);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.strokeRect(-w / 2, -16, w, 32);
    ctx.fillStyle = '#c0392b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  function cairn(ctx, s) {
    const stones = [[0, 0, 22, 12], [-4, -18, 18, 10], [3, -33, 15, 9], [-1, -46, 11, 7], [1, -55, 7, 5]];
    ctx.fillStyle = 'rgba(40,36,26,0.18)'; ell(ctx, s.x, GY + 3, 26, 4);
    stones.forEach(([dx, dy, rx, ry], i) => {
      ctx.fillStyle = i % 2 ? '#a29f95' : '#b9b6ac'; ell(ctx, s.x + dx, GY - 8 + dy, rx, ry);
      ctx.fillStyle = 'rgba(70,66,58,0.35)'; ell(ctx, s.x + dx + rx * 0.3, GY - 6 + dy, rx * 0.6, ry * 0.4);
    });
  }

  function rocks(ctx, g, vis, withBear) {
    const b = g.bear, R = A();
    for (const s of g.level.covers) {
      if (!s.rock || !vis(s.x, 90)) continue;
      on(ctx, s.x, () => rock(ctx, g, s, b, R, withBear));
    }
  }

  function rock(ctx, g, s, b, R, withBear) {
    {
      if (withBear && b.hideTree === s && b.hideBlend > 0) {
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: s }));
        withBear(ZS.drawBearInHay, who, b.hideBlend);
        withBear(ZS.drawBearHayFront, who, b.hideBlend);
      }
      if (s.cairn) cairn(ctx, s);
      else R.boulder(ctx, s.x, GY + 3, s.w, s.h, s.shade, s.shade > 0.6 ? 1 : 0);
      if (snowy(g)) { ctx.fillStyle = 'rgba(250,252,253,0.9)'; ell(ctx, s.x - s.w * 0.1, s.top + 4, s.w * 0.3, 3.5); }
    }
  }

  function cross(ctx, D, g) {
    const x = D.x;
    ctx.fillStyle = 'rgba(40,36,26,0.2)'; ell(ctx, x, GY + 3, 40, 5);
    A().boulder(ctx, x, GY + 3, 70, 30, 0.37, 0);
    ctx.fillStyle = '#6c7178'; ctx.fillRect(x - 4, GY - 180, 8, 160); ctx.fillRect(x - 34, GY - 150, 68, 7);
    ctx.fillStyle = '#9aa1a8'; ctx.fillRect(x - 4, GY - 180, 3, 160);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 30, GY - 146); ctx.quadraticCurveTo(x + 44 + sin(g.time * 3) * 6, GY - 130, x + 40, GY - 110); ctx.stroke();
    ctx.strokeStyle = '#f0f0f0';
    ctx.beginPath(); ctx.moveTo(x + 26, GY - 146); ctx.quadraticCurveTo(x + 38 + sin(g.time * 3 + 1) * 6, GY - 128, x + 32, GY - 108); ctx.stroke();
    label(ctx, LABELS.chopok.board.peak, x, GY - 200, 13, '#2a2f22');
    const bx = D.book;
    ctx.fillStyle = '#5a5f66'; ctx.fillRect(bx - 2, GY - 48, 4, 48);
    ctx.fillStyle = '#8a9096'; rr(ctx, bx - 14, GY - 66, 28, 20, 3);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(bx - 14, GY - 58, 28, 3);
  }

  function tatier(ctx, g, vis) {
    const c = g.chopok, T = g.level.tatier;
    if (!c || !vis(T.x, 160)) return;
    const m = c.tatier, t = g.time, caught = t - m.seenAt < 3.5;
    person(ctx, 'tatier', 'tycoon', T.x, caught ? -1 : 1, 'selfie', t, { outfit: 'hike', selfieK: caught ? 0.8 : 0.42 + 0.04 * sin(t * 0.7) });
    if (!caught && !m.passed && abs(g.bear.x - T.x) < 600 && frac(t * 0.18) < 0.6) label(ctx, LABELS.chopok.vlog, T.x + 6, GY - 132, 12, '#2a2f22');
  }

  function back(ctx, g, vis, span, withBear) {
    const L = g.level;
    if (span(L.concrete.from, L.concrete.to, 260) || span(3150, 3420, 200)) parking(ctx, g, vis);
    on(ctx, L.road.bridge, () => rail(ctx, g, vis));
    if (vis(L.road.climb[0] + 250, 40)) on(ctx, L.road.climb[0] + 250, () => grade(ctx, L.road.climb[0] + 250));
    if (span(L.cave.booth - 60, L.cave.to + 200, 120)) cave(ctx, g, vis, span);
    resort(ctx, g, vis);
    on(ctx, L.funi.station, () => funitel(ctx, g, vis, span));
    if (vis(L.summit.rotunda, 200)) on(ctx, L.summit.rotunda, () => rotunda(ctx, L.summit.rotunda, g.time));
    on(ctx, L.chata.x, () => chataBack(ctx, g, vis));
    for (const t of L.dwarf) if (span(t[0], t[1], 60)) on(ctx, (t[0] + t[1]) / 2, () => A().thicketBack(ctx, t, g));
    rocks(ctx, g, vis, withBear);
    if (g.chopok) {
      for (const m of g.chopok.marmots) if (vis(m.x, 80)) on(ctx, m.x, () => A().marmotRock(ctx, m, g));
      for (const k of g.chopok.chamois) if (vis(k.x, 60)) on(ctx, k.x, () => A().chamois(ctx, k, g));
    }
    if (vis(L.dumbier.x, 120)) on(ctx, L.dumbier.x, () => cross(ctx, L.dumbier, g));
  }

  function front(ctx, g, vis, span) {
    const L = g.level;
    on(ctx, L.chata.x, () => chataFront(ctx, g, vis));
    on(ctx, L.tatier.x, () => tatier(ctx, g, vis));
    for (const t of L.dwarf) if (span(t[0], t[1], 60)) on(ctx, (t[0] + t[1]) / 2, () => A().thicketFront(ctx, t, g));
  }

  const BANKS = [
    { y: GY - 250, h: 120, f: 0.0042, v: 7, a: 0.1, sd: 0.4 },
    { y: GY - 175, h: 105, f: 0.0058, v: 11, a: 0.12, sd: 2.1 },
    { y: GY - 100, h: 90, f: 0.0075, v: 16, a: 0.16, sd: 3.7 },
    { y: GY - 30, h: 75, f: 0.0098, v: 23, a: 0.22, sd: 5.2 },
  ];
  const WISPS = 12;

  function bankTop(B, x, u, k, cover) {
    const n = 0.5 + 0.3 * sin(u * B.f + B.sd) + 0.2 * sin(u * B.f * 2.7 + B.sd * 3);
    return B.y + B.h * (1 - cover * (0.35 + 0.65 * k) * (0.45 + 0.55 * n));
  }

  function banks(ctx, g, viewW, k, roll) {
    const cam = g.cam, t = g.time, gust = 1 + 2.5 * g.chopok.wind.k, x0 = cam - 20, x1 = cam + viewW + 20;
    const edge = cam - 460 + (viewW + 760) * (1 - roll), cover = (x) => sstep(edge, edge + 320, x);
    const veil = ctx.createLinearGradient(edge, 0, edge + 420, 0);
    veil.addColorStop(0, 'rgba(234,239,243,0)'); veil.addColorStop(1, 'rgba(234,239,243,' + (k * 0.18).toFixed(3) + ')');
    ctx.fillStyle = veil; ctx.fillRect(x0, -400, x1 - x0, GY + 480);
    for (const B of BANKS) {
      const drift = t * B.v * gust, top = B.y - B.h;
      const gr = ctx.createLinearGradient(0, top, 0, B.y + 20);
      gr.addColorStop(0, 'rgba(240,244,247,0)');
      gr.addColorStop(0.45, 'rgba(240,244,247,' + (k * B.a).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(240,244,247,' + (k * B.a * 1.35).toFixed(3) + ')');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x0, GY + 80);
      for (let x = x0; x <= x1 + 24; x += 24) ctx.lineTo(x, bankTop(B, x, x + drift, k, cover(x)));
      ctx.lineTo(x1 + 24, GY + 80); ctx.closePath(); ctx.fill();
    }
    const W = ctx.createLinearGradient(0, 0, 1, 0);
    W.addColorStop(0, 'rgba(246,248,250,0)'); W.addColorStop(0.35, 'rgba(246,248,250,1)'); W.addColorStop(0.65, 'rgba(246,248,250,1)'); W.addColorStop(1, 'rgba(246,248,250,0)');
    for (let i = 0; i < WISPS; i++) {
      const len = 150 + hash(i * 1.9) * 220, span = viewW + len + 200, v = 30 + hash(i * 2.3) * 40;
      const x = cam + span - ((t * v * gust + hash(i * 5.1) * span) % span) - len - 100, y = GY - 18 - hash(i * 3.3) * 250;
      const a = k * (0.22 + 0.2 * hash(i * 4.7)) * cover(x + len / 2) * (0.6 + 0.4 * sin(t * 0.5 + i));
      if (a < 0.01) continue;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(x, y); ctx.scale(len, 4 + hash(i * 6.1) * 7);
      ctx.fillStyle = W; ctx.fillRect(0, -0.5, 1, 1);
      ctx.globalAlpha *= 0.6; ctx.fillRect(0.12, -1.1, 0.76, 0.6);
      ctx.restore();
    }
  }

  function fog(ctx, g, viewW) {
    const c = g.chopok, L = g.level;
    if (!c) return;
    const cam = g.cam, f = c.fog, k = f.k * sstep(L.fog.from - 500, L.fog.from + 100, cam + viewW / 2);
    if (k > 0.01) banks(ctx, g, viewW, k, f.phase === 'coming' ? smooth(min(1, f.k * 1.15)) : 1);
    const w = c.wind;
    if (w.k > 0.02 && g.bear.x > L.wind.from - 200) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * w.k).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const span2 = viewW + 300, x = cam + span2 - ((g.time * 620 + i * 157) % span2) - 150, y = GY - 20 - hash(i * 3.3) * 320;
        ctx.moveTo(x, y); ctx.lineTo(x + 40 + hash(i) * 50, y + 2);
      }
      ctx.stroke(); ctx.lineCap = 'butt';
    }
  }

  function over(ctx, g, viewW) {
    if (!g.chopok) return;
    fog(ctx, g, viewW);
  }

  const blend = { img: null };

  function crossfade(ctx, p, P) {
    const cv = ctx.canvas;
    if (typeof document === 'undefined' || !cv || !cv.width) return;
    if (p.phase === 'close' || p.phase === 'shut') {
      if (!blend.img) blend.img = document.createElement('canvas');
      if (blend.img.width !== cv.width || blend.img.height !== cv.height) { blend.img.width = cv.width; blend.img.height = cv.height; }
      blend.img.getContext('2d').drawImage(cv, 0, 0);
      return;
    }
    const k = clamp(p.t / P.open, 0, 1);
    if (!blend.img || k >= 1) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - smooth(k);
    ctx.drawImage(blend.img, 0, 0);
    ctx.restore();
  }

  function iris(ctx, g, viewW, offY) {
    const p = g.chopok && g.chopok.pass, P = SIM().PASS;
    if (!p || p.phase === 'play') return;
    if (p.key === 'funi') { crossfade(ctx, p, P); return; }
    const H = g.viewH || 540 + offY / 0.45, far = hypot(viewW, H), k = clamp(p.t / (p.phase === 'close' || p.phase === 'shut' ? P.close : P.open), 0, 1);
    const r = p.phase === 'close' || p.phase === 'shut' ? 1 - smooth(k) : smooth(k);
    if (r >= 1) return;
    const inStage = p.phase === 'open' || p.phase === 'shut', cab = inStage && p.key === 'funi';
    const sc = cab ? min(1, (viewW - 16) / (ZS.cabinArt.BOX.right - ZS.cabinArt.BOX.left + 40)) : 1;
    const x = cab ? viewW / 2 + (g.bear.x - (ZS.cabinArt.BOX.left + ZS.cabinArt.BOX.right) / 2) * sc : g.bear.x - g.cam, y = GY - 46 + offY, R = max(0, far * r);
    ctx.fillStyle = p.key === 'cave' ? '#14110e' : '#151b22';
    ctx.beginPath();
    ctx.rect(-10, -10, viewW + 20, H + 20);
    ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU, true);
    ctx.fill();
  }

  Object.assign(API, { backdrop, skyline, look, ground, back, front, over, iris, hillside, under });
})();
