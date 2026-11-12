(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, clamp, lerp, frac, sstep } = ZS.util;
  const API = (ZS.vychodnaArt = {});
  const SIM = () => ZS.sim.vychodna;
  const F = () => ZS.folk;
  const figures = new Map();
  const TOP = GY - 760;
  const B = () => LABELS.vychodna.board;

  function mix(a, b, k) {
    const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const A = p(a), Z = p(b);
    return 'rgb(' + A.map((v, i) => Math.round(v + (Z[i] - v) * k)).join(',') + ')';
  }

  function tone(a, b, c, d) {
    const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const A = p(a), Bc = p(b), C = p(c);
    return 'rgb(' + A.map((v, i) => { const x = v + (Bc[i] - v) * d.dusk; return Math.round(x + (C[i] - x) * d.night); }).join(',') + ')';
  }

  function dark(g) {
    const t = g.time, S = g.level && g.level.vychodna, x = g.bear ? g.bear.x : 0;
    return { dusk: max(sstep(92, 128, t), S ? sstep(S.jarmok.from, S.scena.from, x) : 0), night: max(sstep(200, 238, t), S ? sstep(S.noc.from - 200, S.noc.from + 300, x) : 0) };
  }

  function dim(g) {
    const d = dark(g);
    return d.dusk * 0.16 + d.night * 0.44;
  }

  function text(ctx, s, x, y, size, col, w, weight) {
    ctx.fillStyle = col; ctx.font = (weight || 800) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y, w);
  }

  function person(ctx, id, x, dir, state, time, extra) {
    let h = figures.get(id);
    if (!h) figures.set(id, (h = { aimAt: [0, 0], id }));
    Object.assign(h, { kind: 'fest', x, y: GY, dir, state, outfit: 'summer', cold: 0, armed: false, empty: false, scared: false, kick: 0, texting: false, clutch: false, look: 0, size: 1 }, extra);
    ZS.drawHuman(ctx, h, time);
    return h;
  }

  function folk(ctx, f, time) { F().figure(ctx, f, time); }

  const SKY = {
    day: ['#6fb3e4', '#cfe8f6'], dusk: ['#3d5a8f', '#f2a66a'], night: ['#0d1430', '#2a3566'],
  };

  function sky(ctx, g, viewW, offY) {
    const d = dark(g);
    const top = tone(SKY.day[0], SKY.dusk[0], SKY.night[0], d);
    const bot = tone(SKY.day[1], SKY.dusk[1], SKY.night[1], d);
    const gr = ctx.createLinearGradient(0, -offY, 0, GY);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    ctx.fillStyle = gr; ctx.fillRect(0, -offY, viewW, GY + offY);
    if (d.night > 0.05) {
      ctx.fillStyle = 'rgba(255,255,240,' + (0.8 * d.night).toFixed(3) + ')';
      for (let i = 0; i < 70; i++) {
        const x = frac(hash(i * 3.7) + g.cam * 0.00002) * viewW, y = -offY + hash(i * 7.1) * (GY - 260 + offY), tw = 0.6 + 0.4 * sin(g.time * 2 + i);
        circle(ctx, x, y, 0.6 + hash(i * 1.3) * 0.9 * tw);
      }
      const mx = viewW * 0.78, my = GY - 380;
      ctx.fillStyle = 'rgba(255,250,225,' + (0.95 * d.night).toFixed(3) + ')'; circle(ctx, mx, my, 15);
      ctx.fillStyle = mix(SKY.night[0], SKY.night[1], 0.2); circle(ctx, mx + 6, my - 3, 13);
    }
    const sunY = GY - 340 + d.dusk * 250, sunX = viewW * 0.18;
    if (d.night < 0.95) {
      const a = (1 - d.night) * (0.5 + 0.5 * d.dusk);
      const r = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 260);
      r.addColorStop(0, 'rgba(255,236,190,' + (0.6 * a).toFixed(3) + ')'); r.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = r; ctx.fillRect(sunX - 260, sunY - 260, 520, 520);
      ctx.fillStyle = 'rgba(255,248,226,' + (1 - d.night).toFixed(3) + ')'; circle(ctx, sunX, sunY, 17);
    }
    tatras(ctx, g, viewW, d);
    haze(ctx, viewW, d);
  }

  const KX = 1130, KH = 236;
  const RIDGE = [];
  for (let u = -900, i = 0; u < 2800; i++) { RIDGE.push([u, 70 + 62 * hash(i * 1.71) + 26 * sin(u * 0.005)]); u += 24 + hash(i * 2.3) * 34; }

  function krivan(u) {
    const d = u - KX;
    if (d < -320 || d > 280) return 0;
    if (d < -96) { const k = (d + 320) / 224; return KH * (0.2 + 0.58 * Math.pow(k, 1.25)) - 10 * sin(k * PI) * (d > -150 ? 1 : 0.4); }
    if (d < -60) return KH * (0.78 - 0.04 * sin(((d + 96) / 36) * PI));
    if (d < 0) return KH * (0.78 + 0.22 * Math.pow((d + 60) / 60, 0.9));
    if (d < 12) return KH - d * 0.6;
    return KH * Math.pow(1 - (d - 12) / 268, 1.7) - 7 * sin((d - 12) * 0.09) * (1 - (d - 12) / 268);
  }

  function ridgeH(u) {
    for (let i = 1; i < RIDGE.length; i++) if (RIDGE[i][0] >= u) { const [a, ah] = RIDGE[i - 1], [b, bh] = RIDGE[i]; return ah + (bh - ah) * (u - a) / (b - a); }
    return 80;
  }

  function peakY(u) {
    return GY - 96 - max(ridgeH(u), krivan(u));
  }

  function tatras(ctx, g, viewW, d) {
    const far = KX - (viewW * 0.56 - (g.cam - 6400) * 0.06), step = 6;
    ctx.fillStyle = tone('#b7c3d3', '#9d97b6', '#252c52', d);
    ctx.beginPath(); ctx.moveTo(-10, GY);
    for (let x = -10; x <= viewW + step; x += step) ctx.lineTo(x, GY - 96 - 40 - 50 * hash(Math.floor((x + far * 0.6) / 50)) * 0.8 - 30 * sin((x + far * 0.6) * 0.004));
    ctx.lineTo(viewW + 10, GY); ctx.closePath(); ctx.fill();
    const rock = tone('#93a2b6', '#7c7aa0', '#1d2446', d), shade = tone('#76869d', '#625f88', '#151a38', d), snow = tone('#f2f5f8', '#f6dccd', '#56628c', d);
    ctx.fillStyle = rock;
    ctx.beginPath(); ctx.moveTo(-10, GY);
    for (let x = -10; x <= viewW + step; x += step) ctx.lineTo(x, peakY(x + far));
    ctx.lineTo(viewW + 10, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = snow;
    for (let i = 1; i < RIDGE.length - 1; i++) {
      const [u, h] = RIDGE[i], sx = u - far;
      if (sx < -60 || sx > viewW + 60 || h < 100 || h < RIDGE[i - 1][1] || h < RIDGE[i + 1][1] || krivan(u) > h) continue;
      const y = GY - 96 - h, l = RIDGE[i - 1], r = RIDGE[i + 1];
      ctx.beginPath(); ctx.moveTo(sx, y);
      ctx.lineTo(sx + (l[0] - u) * 0.3, y + (h - l[1]) * 0.3); ctx.lineTo(sx + (l[0] - u) * 0.12, y + (h - l[1]) * 0.22); ctx.lineTo(sx, y + 6);
      ctx.lineTo(sx + (r[0] - u) * 0.15, y + (h - r[1]) * 0.24); ctx.lineTo(sx + (r[0] - u) * 0.3, y + (h - r[1]) * 0.3); ctx.closePath(); ctx.fill();
    }
    const kx = KX - far;
    if (kx < -340 || kx > viewW + 320) return;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-10, GY);
    for (let x = -10; x <= viewW + step; x += step) ctx.lineTo(x, peakY(x + far));
    ctx.lineTo(viewW + 10, GY); ctx.closePath(); ctx.clip();
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.moveTo(kx + 6, GY - 96 - KH);
    for (let dd = 12; dd <= 280; dd += 8) ctx.lineTo(kx + dd, peakY(KX + dd));
    ctx.lineTo(kx + 280, GY - 60); ctx.lineTo(kx + 60, GY - 60); ctx.lineTo(kx + 18, GY - 96 - KH * 0.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade; ctx.lineWidth = 1.6;
    for (const [dx, len] of [[-30, 0.42], [-60, 0.36], [-110, 0.3], [-170, 0.22], [-230, 0.16]]) {
      const top = peakY(KX + dx) + 4;
      ctx.beginPath(); ctx.moveTo(kx + dx, top); ctx.quadraticCurveTo(kx + dx - 6, top + KH * len * 0.5, kx + dx - 2, top + KH * len); ctx.stroke();
    }
    ctx.strokeStyle = snow; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const [dx, a, b] of [[-28, 10, 26], [-58, 14, 30], [-104, 12, 24], [30, 18, 30], [70, 26, 40], [-165, 10, 18]]) {
      const top = peakY(KX + dx);
      ctx.beginPath(); ctx.moveTo(kx + dx, top + a); ctx.lineTo(kx + dx - 2, top + b); ctx.stroke();
    }
    ctx.restore();
  }

  function haze(ctx, viewW, d) {
    const gr = ctx.createLinearGradient(0, GY - 200, 0, GY - 90);
    gr.addColorStop(0, 'rgba(220,232,240,0)'); gr.addColorStop(1, 'rgba(220,232,240,' + (0.3 * (1 - d.night)).toFixed(3) + ')');
    ctx.fillStyle = gr; ctx.fillRect(0, GY - 200, viewW, 110);
  }

  function backdrop(ctx, g, viewW, offY) {
    const d = dark(g), near = g.cam * 0.32, step = 24;
    ctx.fillStyle = tone('#5d8a5a', '#56705a', '#1a2a28', d);
    ctx.beginPath(); ctx.moveTo(-20, GY);
    for (let x = -20; x <= viewW + step; x += step) { const u = x + near; ctx.lineTo(x, GY - 96 - 26 * sin(u * 0.0031) - 14 * sin(u * 0.011 + 2)); }
    ctx.lineTo(viewW + 20, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = tone('#3c6a45', '#3a5a46', '#101c1c', d);
    for (let i = Math.floor(near / 22) - 1; i * 22 - near < viewW + 22; i++) {
      const x = i * 22 - near, u = i * 22, y = GY - 96 - 26 * sin(u * 0.0031) - 14 * sin(u * 0.011 + 2), h = 22 + hash(i * 1.3) * 16;
      if (hash(i * 4.1) < 0.35) continue;
      ctx.beginPath(); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x, y - h); ctx.lineTo(x + 8, y + 8); ctx.closePath(); ctx.fill();
    }
    ZS.render.backdrop.backForest(ctx, g, viewW, offY);
  }

  function seg(cam, viewW, a, z) { return [max(a, cam - 20), min(z, cam + viewW + 20)]; }

  function ground(ctx, g, cam, viewW) {
    const S = g.level.vychodna;
    let [a, z] = seg(cam, viewW, S.park.from, S.gate.from);
    if (a < z) {
      ctx.fillStyle = '#7da04e'; ctx.fillRect(a, GY - 2, z - a, 14);
      ctx.fillStyle = 'rgba(110,86,52,0.55)';
      for (const off of [3, 9]) ctx.fillRect(a, GY + off, z - a, 2.4);
    }
    [a, z] = seg(cam, viewW, S.gate.from, S.jarmok.from);
    if (a < z) {
      ctx.fillStyle = '#8b8a86'; ctx.fillRect(a, GY - 2, z - a, 22);
      ctx.fillStyle = '#6f6e6a'; ctx.fillRect(a, GY + 20, z - a, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = Math.ceil(a / 90) * 90; x < z; x += 90) ctx.fillRect(x, GY + 9, 40, 2);
    }
    [a, z] = seg(cam, viewW, S.jarmok.from, S.scena.from);
    if (a < z) {
      ctx.fillStyle = '#b39a72'; ctx.fillRect(a, GY - 2, z - a, 22);
      ctx.fillStyle = 'rgba(232,206,120,0.5)'; for (let x = Math.ceil(a / 11) * 11; x < z; x += 11) ctx.fillRect(x + hash(x) * 6, GY + 2 + hash(x * 1.3) * 12, 5, 1.2);
    }
    [a, z] = seg(cam, viewW, S.scena.from, S.noc.from);
    if (a < z) {
      ctx.fillStyle = '#a7a39a'; ctx.fillRect(a, GY - 2, z - a, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = Math.ceil(a / 36) * 36; x < z; x += 36) ctx.fillRect(x, GY - 2, 1.2, 22);
    }
    const BASE = '#6b4f35';
    for (const [x, ca, ha, cb, hb] of [[S.park.from, '#5f9a3e', 14, '#7da04e', 14], [S.gate.from, '#7da04e', 14, '#8b8a86', 22], [S.jarmok.from, '#8b8a86', 22, '#b39a72', 22], [S.scena.from, '#b39a72', 22, '#a7a39a', 22], [S.noc.from, '#a7a39a', 22, '#5f9a3e', 14]]) {
      if (x < cam - 80 || x > cam + viewW + 80) continue;
      const h = max(ha, hb), gr = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
      gr.addColorStop(0, ca); gr.addColorStop(1, cb);
      ctx.fillStyle = gr; ctx.fillRect(x - 60, GY - 2, 120, min(ha, hb) + 2);
      if (ha !== hb) {
        const lo = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
        lo.addColorStop(0, ha > hb ? ca : BASE); lo.addColorStop(1, ha > hb ? BASE : cb);
        ctx.fillStyle = lo; ctx.fillRect(x - 60, GY + min(ha, hb), 120, h - min(ha, hb));
      }
    }
    [a, z] = seg(cam, viewW, S.noc.tent[0], S.noc.tent[1]);
    if (a < z) {
      ctx.fillStyle = '#a0784a'; ctx.fillRect(a, GY - 3, z - a, 8);
      ctx.fillStyle = 'rgba(60,36,18,0.35)'; for (let x = Math.ceil(a / 18) * 18; x < z; x += 18) ctx.fillRect(x, GY - 3, 1, 8);
    }
  }

  const CAR_COLS = ['#c4262e', '#1d4f9a', '#e9ecef', '#2f9e44', '#f08c00', '#495057', '#7048e8'];

  function car(ctx, x, col, t, o) {
    const w = 104, h = 30, y = GY - 9, k = o || {};
    ctx.save(); ctx.translate(x + (k.shake ? sin(t * 60) * 1.2 * k.shake : 0), 0);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ell(ctx, 0, GY + 1, w * 0.55, 4);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(-w / 2, y - h * 0.55); ctx.quadraticCurveTo(-w / 2 + 2, y - h * 0.78, -w * 0.3, y - h * 0.8);
    ctx.lineTo(-w * 0.18, y - h * 1.38); ctx.lineTo(w * 0.2, y - h * 1.38); ctx.lineTo(w * 0.36, y - h * 0.82); ctx.quadraticCurveTo(w / 2, y - h * 0.76, w / 2, y - h * 0.45); ctx.lineTo(w / 2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(190,220,240,0.88)';
    ctx.beginPath(); ctx.moveTo(-w * 0.26, y - h * 0.82); ctx.lineTo(-w * 0.16, y - h * 1.28); ctx.lineTo(-w * 0.01, y - h * 1.28); ctx.lineTo(-w * 0.01, y - h * 0.82); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.03, y - h * 0.82); ctx.lineTo(w * 0.03, y - h * 1.28); ctx.lineTo(w * 0.18, y - h * 1.28); ctx.lineTo(w * 0.31, y - h * 0.82); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-w / 2, y - h * 0.3, w, 2);
    ctx.fillStyle = '#fff2b0'; ell(ctx, w / 2 - 3, y - h * 0.48, 3, 2.4);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(-w / 2, y - h * 0.56, 3, 5);
    for (const wx of [-w * 0.3, w * 0.3]) {
      ctx.fillStyle = '#1c1c1e'; circle(ctx, wx, y, 9.4);
      ctx.fillStyle = '#b9bec4'; circle(ctx, wx, y, 4.2);
      ctx.strokeStyle = '#6a6e74'; ctx.lineWidth = 1;
      const r = (k.spin || 0) * t * 30;
      ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = r + i * PI / 2; ctx.moveTo(wx, y); ctx.lineTo(wx + cos(a) * 4, y + sin(a) * 4); } ctx.stroke();
    }
    ctx.restore();
  }

  function booth(ctx, x, g) {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 26, GY - 70, 52, 70);
    ctx.fillStyle = '#6a4024'; ctx.beginPath(); ctx.moveTo(x - 34, GY - 70); ctx.lineTo(x, GY - 92); ctx.lineTo(x + 34, GY - 70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9e8f0'; ctx.fillRect(x - 18, GY - 60, 36, 22);
    ctx.fillStyle = '#1d4f9a'; rr(ctx, x - 22, GY - 126, 44, 30, 4);
    text(ctx, 'P3', x, GY - 111, 18, '#ffffff');
    ctx.fillStyle = '#5a5a5a'; ctx.fillRect(x - 1, GY - 96, 2, 26);
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x + 30, GY - 60, 54, 26, 3);
    text(ctx, B().fee, x + 57, GY - 47, 9, '#c4262e', 50);
  }

  const JAM_COLS = { sedan: ['#1d4f9a', '#173f7c'], suv: ['#e9ecef', '#c3c8ce'], van: ['#2f7d4f', '#24603c'] };

  function jamCar(ctx, j, g, i) {
    const c = g.vychodna, t = g.time, [col, deep] = JAM_COLS[j.kind], w = j.w, x = j.x, L = x - w / 2, R = x + w / 2;
    const top = GY - j.h, hood = GY - j.hood, ca = x + j.cab[0] * w, cz = x + j.cab[1] * w, sill = GY - 12;
    const ring = c && c.jam.alarm > 0 && c.jam.car === i, blink = ring && frac(t * 3) < 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, x, GY + 2, w * 0.54, 5);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(L + 4, sill);
    ctx.lineTo(L, hood + 10); ctx.quadraticCurveTo(L + 2, hood, L + 14, hood);
    if (j.kind === 'van') { ctx.lineTo(ca - 6, hood); ctx.quadraticCurveTo(ca, hood - 4, ca + 4, top + 12); ctx.quadraticCurveTo(ca + 8, top, ca + 22, top); }
    else { ctx.lineTo(ca - 10, hood); ctx.lineTo(ca + 8, top + 3); ctx.quadraticCurveTo(ca + 12, top, ca + 18, top); }
    ctx.lineTo(cz - 8, top); ctx.quadraticCurveTo(cz - 2, top, cz + 2, top + 4);
    if (j.kind === 'van') { ctx.lineTo(R - 2, top + 10); ctx.lineTo(R, sill); }
    else { ctx.lineTo(cz + 14, hood); ctx.lineTo(R - 10, hood); ctx.quadraticCurveTo(R, hood + 1, R, hood + 10); ctx.lineTo(R - 4, sill); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = deep; ctx.fillRect(L + 2, sill - 6, w - 4, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(L + 14, hood + 4, w - 28, 2);
    ctx.fillStyle = 'rgba(176,212,236,0.92)';
    const wy = top + 5, wb = hood - 3;
    if (j.kind === 'van') {
      ctx.beginPath(); ctx.moveTo(ca + 6, wb); ctx.quadraticCurveTo(ca + 9, top + 14, ca + 22, wy); ctx.lineTo(ca + 34, wy); ctx.lineTo(ca + 34, wb); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 3; k++) rr(ctx, ca + 42 + k * ((cz - ca - 50) / 3), wy, (cz - ca - 50) / 3 - 6, wb - wy, 3);
      ctx.strokeStyle = deep; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, hood + 4); ctx.lineTo(x + 6, sill - 6); ctx.stroke();
      ctx.fillStyle = '#3a3e44'; ctx.fillRect(ca + 18, top - 4, cz - ca - 30, 3); for (const rx of [ca + 22, cz - 16]) ctx.fillRect(rx, top - 4, 3, 4);
    } else {
      const mid = (ca + cz) / 2;
      ctx.beginPath(); ctx.moveTo(ca - 4, wb); ctx.lineTo(ca + 11, wy); ctx.lineTo(mid - 2, wy); ctx.lineTo(mid - 2, wb); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(mid + 2, wb); ctx.lineTo(mid + 2, wy); ctx.lineTo(cz - 6, wy); ctx.lineTo(cz + 9, wb); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(ca + 14, wy + 2, 4, wb - wy - 4);
    ctx.fillStyle = deep; ctx.fillRect(x - 6, hood + 8, 10, 2); ctx.fillRect(x + w * 0.2, hood + 8, 10, 2);
    ctx.fillStyle = blink ? '#ffb300' : '#fff2b0'; rr(ctx, R - 8, hood + 6, 7, 6, 2);
    ctx.fillStyle = blink ? '#ffb300' : '#c4262e'; rr(ctx, L + 1, hood + 6, 6, 8, 2);
    if (ring) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, R - 4, hood + 9, blink ? 34 : 14, '255,180,40', 0.6); glow(ctx, L + 4, hood + 9, blink ? 34 : 14, '255,180,40', 0.6); ctx.restore(); }
    if (j.kind === 'suv') { ctx.fillStyle = frac(t * 0.8) < 0.15 || ring ? '#ff3b30' : '#6a1a18'; circle(ctx, ca + 2, hood - 4, 2.2); }
    ctx.fillStyle = '#f7f3ea'; rr(ctx, R - 30, sill - 4, 22, 7, 1.5); ctx.fillStyle = '#1d4f9a'; ctx.fillRect(R - 30, sill - 4, 4, 7);
    for (const wx of [L + w * 0.2, R - w * 0.2]) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(wx, GY - 11, 14.5, PI, TAU); ctx.fill();
      ctx.fillStyle = '#1c1c1e'; circle(ctx, wx, GY - 11, 11);
      ctx.fillStyle = '#b9bec4'; circle(ctx, wx, GY - 11, 5);
    }
  }

  function passCard(ctx, x, y, rot, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-5.4, 0.8, 11, 14);
    ctx.fillStyle = '#f7f3ea'; ctx.fillRect(-6, 0, 12, 14);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(-6, 0, 12, 4);
    ctx.fillStyle = '#2f6a34'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-3.5 + i * 3.5, 9.5); ctx.lineTo(-2 + i * 3.5, 7); ctx.lineTo(-0.5 + i * 3.5, 9.5); ctx.lineTo(-2 + i * 3.5, 12); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#9aa1a8'; ctx.fillRect(-1, -1.4, 2, 1.8);
    ctx.restore();
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = k * PI / 4, q = k % 2 ? r * 0.3 : r; ctx.lineTo(x + cos(a) * q, y + sin(a) * q); }
    ctx.closePath(); ctx.fill();
  }



  function arch(ctx, x, g, front) {
    const h = 150, w = 120, t = g.time;
    if (!front) {
      ctx.fillStyle = '#7a5030'; ctx.fillRect(x - w / 2 - 8, GY - h, 14, h); ctx.fillRect(x + w / 2 - 6, GY - h, 14, h);
      return;
    }
    ctx.fillStyle = '#6a4024'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 22, GY - h); ctx.lineTo(x, GY - h - 34); ctx.lineTo(x + w / 2 + 22, GY - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - w / 2 - 14, GY - h - 4, w + 28, 26);
    text(ctx, B().festival, x, GY - h + 9, 9.4, '#fff4d6', w + 16);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#e03131', '#f2c230', '#f7f3ea', '#2f9e44'][i % 4]; circle(ctx, x - w / 2 - 10 + i * (w + 20) / 11, GY - h + 24 + sin(i + t) * 0.6, 3.2); }
    ctx.fillStyle = '#7a5030'; ctx.fillRect(x - w / 2 - 8, GY - h + 22, 14, h - 22);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - w / 2 - 8, GY - h + 22, 3, h - 22);
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - w / 2 - 22, GY - 98, 42, 15, 3);
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 - 22, GY - 98, 42, 15);
    text(ctx, B().gate, x - w / 2 - 1, GY - 90.5, 7, '#5a3a20', 36);
  }

  function fence(ctx, a, z) {
    ctx.fillStyle = '#9a7048';
    for (let x = a; x <= z; x += 9) ctx.fillRect(x, GY - 38, 5, 38);
    ctx.fillRect(a, GY - 30, z - a, 3); ctx.fillRect(a, GY - 14, z - a, 3);
  }

  function house(ctx, x, i, g) {
    const d = dark(g), lit = d.dusk * 0.5 + d.night, log = i % 2 === 0, w = 216, h = 150, top = GY - h;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - w / 2 + 6, GY - 6, w, 8);
    if (log) {
      ctx.fillStyle = ['#5a3a24', '#6a4228', '#4e3420'][i % 3]; ctx.fillRect(x - w / 2, top, w, h);
      for (let y = top + 4; y < GY - 14; y += 13) {
        ctx.fillStyle = '#f4efe2'; ctx.fillRect(x - w / 2, y + 10, w, 2.6);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x - w / 2, y, w, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - w / 2, y + 7, w, 3);
      }
      for (const ex of [x - w / 2 - 4, x + w / 2 - 6]) for (let y = top + 4; y < GY - 14; y += 13) { ctx.fillStyle = '#5a3a24'; rr(ctx, ex, y, 10, 10, 3); ctx.fillStyle = '#8a6040'; circle(ctx, ex + 5, y + 5, 3); }
    } else {
      ctx.fillStyle = ['#f2ece0', '#ece6dc', '#efe4cf'][i % 3]; ctx.fillRect(x - w / 2, top, w, h);
      ctx.fillStyle = '#2f6db0'; ctx.fillRect(x - w / 2, top + 4, w, 3); ctx.fillRect(x - w / 2, GY - 34, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(x + w / 2 - 14, top, 14, h);
    }
    ctx.fillStyle = '#7a6a5a'; ctx.fillRect(x - w / 2, GY - 14, w, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let k = x - w / 2; k < x + w / 2; k += 22) ctx.fillRect(k, GY - 14, 1.5, 14);
    const roof = log ? ['#3a3a3e', '#4a3a30', '#33363a'][i % 3] : ['#6a3a2a', '#5a3a2a', '#7a4430'][i % 3];
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 22, top + 4); ctx.lineTo(x, top - 120); ctx.lineTo(x + w / 2 + 22, top + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let k = 1; k < 10; k++) { const yy = top + 4 - k * 12.4, half = (w / 2 + 22) * (1 - k / 9.7); ctx.beginPath(); ctx.moveTo(x - half, yy); ctx.lineTo(x + half, yy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(x, top - 120); ctx.lineTo(x - w / 2 - 22, top + 4); ctx.lineTo(x - w / 2 - 6, top + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9a6a3a';
    ctx.beginPath(); ctx.moveTo(x - 64, top); ctx.lineTo(x, top - 76); ctx.lineTo(x + 64, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a5030'; for (let k = -56; k <= 56; k += 8) ctx.fillRect(x + k, top - 68 + abs(k) * 1.05, 2.4, 68 - abs(k) * 1.05);
    ctx.save(); ctx.translate(x, top - 22);
    ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 9; k++) { const a = PI + k * PI / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cos(a) * 22, sin(a) * 22); ctx.stroke(); }
    ctx.fillStyle = '#c4262e'; circle(ctx, 0, 0, 5); ctx.fillStyle = '#f2c230'; circle(ctx, 0, 0, 2.4);
    ctx.restore();
    ctx.fillStyle = '#f4efe2'; ctx.fillRect(x - 6, top - 48, 12, 12); ctx.fillStyle = lit > 0.3 ? 'rgba(255,214,130,0.9)' : '#3a4a5a'; ctx.fillRect(x - 4, top - 46, 8, 8);
    for (const wx of [x - 58, x + 58]) {
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(wx - 20, GY - 112, 40, 46);
      ctx.fillStyle = lit > 0.25 ? 'rgba(255,214,130,' + (0.5 + 0.5 * lit).toFixed(3) + ')' : '#a9c4d6'; ctx.fillRect(wx - 16, GY - 108, 32, 38);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(wx - 14, GY - 106, 6, 34);
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(wx - 1.2, GY - 108, 2.4, 38); ctx.fillRect(wx - 16, GY - 91, 32, 2.4);
      for (const sx of [wx - 31, wx + 21]) {
        ctx.fillStyle = log ? '#2f6a34' : '#2f5a8a'; ctx.fillRect(sx, GY - 112, 10, 46);
        ctx.fillStyle = '#f4efe2'; ctx.fillRect(sx + 1, GY - 104, 8, 1); ctx.fillRect(sx + 1, GY - 76, 8, 1);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(sx + 5, GY - 84); ctx.bezierCurveTo(sx + 1, GY - 88, sx + 2, GY - 94, sx + 5, GY - 91); ctx.bezierCurveTo(sx + 8, GY - 94, sx + 9, GY - 88, sx + 5, GY - 84); ctx.fill();
      }
      ctx.fillStyle = '#7a5030'; ctx.fillRect(wx - 24, GY - 66, 48, 7);
      for (let k = 0; k < 7; k++) { ctx.fillStyle = '#2f9e44'; circle(ctx, wx - 20 + k * 6.6, GY - 66, 3); ctx.fillStyle = k % 2 ? '#e03131' : '#e64980'; circle(ctx, wx - 20 + k * 6.6, GY - 70 - (k % 2) * 3, 3.4); }
    }
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 15, GY - 76, 30, 62);
    ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 12, GY - 72, 11, 26); ctx.fillRect(x + 1, GY - 72, 11, 26); ctx.fillRect(x - 12, GY - 42, 11, 26); ctx.fillRect(x + 1, GY - 42, 11, 26);
    ctx.fillStyle = '#d6ab42'; circle(ctx, x + 9, GY - 40, 1.8);
    ctx.fillStyle = '#7a5030'; ctx.fillRect(x + w / 2 - 70, GY - 24, 50, 5); ctx.fillRect(x + w / 2 - 66, GY - 19, 4, 19); ctx.fillRect(x + w / 2 - 28, GY - 19, 4, 19);
    ctx.fillStyle = '#9a7048'; for (let k = x + w / 2 + 4; k < x + w / 2 + 60; k += 8) { ctx.beginPath(); ctx.moveTo(k, GY); ctx.lineTo(k, GY - 34); ctx.lineTo(k + 2.5, GY - 38); ctx.lineTo(k + 5, GY - 34); ctx.lineTo(k + 5, GY); ctx.closePath(); ctx.fill(); }
    ctx.fillRect(x + w / 2 + 2, GY - 28, 58, 3); ctx.fillRect(x + w / 2 + 2, GY - 12, 58, 3);
  }

  function church(ctx, x, g) {
    const d = dark(g);
    ctx.fillStyle = '#f4f0e6'; ctx.fillRect(x - 90, GY - 140, 180, 140);
    ctx.fillStyle = '#4a3a3a'; ctx.beginPath(); ctx.moveTo(x - 100, GY - 140); ctx.lineTo(x, GY - 200); ctx.lineTo(x + 100, GY - 140); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f0e6'; ctx.fillRect(x - 28, GY - 290, 56, 160);
    ctx.fillStyle = '#3a4a3a';
    ctx.beginPath(); ctx.moveTo(x - 34, GY - 290); ctx.quadraticCurveTo(x - 30, GY - 330, x, GY - 340); ctx.quadraticCurveTo(x + 30, GY - 330, x + 34, GY - 290); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 3, GY - 380, 6, 42);
    ctx.fillStyle = '#d6ab42'; circle(ctx, x, GY - 384, 5); ctx.fillRect(x - 1, GY - 404, 2, 18); ctx.fillRect(x - 6, GY - 396, 12, 2);
    ctx.fillStyle = '#e8e2d0'; circle(ctx, x, GY - 250, 13); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 0.8, GY - 260, 1.6, 10); ctx.fillRect(x, GY - 251, 8, 1.6);
    ctx.fillStyle = d.night > 0.3 ? 'rgba(255,214,130,0.85)' : '#9bb0c0';
    for (const wx of [x - 60, x + 60]) { ctx.beginPath(); ctx.moveTo(wx - 12, GY - 50); ctx.lineTo(wx - 12, GY - 100); ctx.quadraticCurveTo(wx, GY - 118, wx + 12, GY - 100); ctx.lineTo(wx + 12, GY - 50); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.moveTo(x - 18, GY); ctx.lineTo(x - 18, GY - 60); ctx.quadraticCurveTo(x, GY - 78, x + 18, GY - 60); ctx.lineTo(x + 18, GY); ctx.closePath(); ctx.fill();
  }

  function villageSign(ctx, x) {
    ctx.fillStyle = '#5a5e66'; ctx.fillRect(x - 1, GY - 78, 2.4, 78);
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - 40, GY - 104, 80, 26, 3);
    ctx.strokeStyle = '#1c1a18'; ctx.lineWidth = 2; ctx.strokeRect(x - 37, GY - 101, 74, 20);
    text(ctx, B().village, x, GY - 91, 11, '#1c1a18', 70);
  }

  const CROWD = [];
  for (let i = 0; i < 90; i++) CROWD.push({ u: i * 37 + hash(i * 2.7) * 18, look: Math.floor(hash(i * 5.3) * 9), sex: hash(i * 1.9) < 0.22 ? (hash(i) < 0.5 ? 'm' : 'f') : 'civ', seed: hash(i * 7.7) * 10, s: 0.82 + hash(i * 3.1) * 0.1 });

  function onlookers(ctx, g, a, z, vis, react) {
    for (const c of CROWD) {
      const x = a + c.u;
      if (x > z || !vis(x, 30)) continue;
      if (g.level.vychodna.obec.arches.some((ax) => Math.abs(ax - x) < 80)) continue;
      const P = g.vychodna && g.vychodna.proc, near = P && P.phase !== 'gone' && abs(x - (P.head - 160)) < 240 + hash(c.u * 5) * 80;
      const role = hash(c.u * 9), phone = c.sex === 'civ' && role < 0.25, clap = near && !phone && role > 0.45 && role < 0.8;
      folk(ctx, { x, y: GY - 2, dir: phone || clap ? (P && P.head - 160 > x ? 1 : -1) : hash(c.u * 3) < 0.6 ? -1 : 1, sex: c.sex, look: c.look, seed: c.seed + hash(c.u * 13) * 7, speed: 0.8 + hash(c.u * 17) * 0.4, scale: c.s * 1.06, pose: clap ? 'clap' : 'stand', instr: phone ? 'phone' : null }, g.time);
    }
  }

  function procession(ctx, g, vis) {
    const c = g.vychodna, P = c && c.proc;
    if (!P || P.phase === 'gone') return;
    const t = g.time, h = P.head, stop = P.phase === 'stop' || P.phase === 'rest', warn = P.phase === 'warn', walk = P.phase === 'walk' || P.phase === 'leave' || P.phase === 'passed' || warn;
    const pose = (i) => (stop ? ['dance', 'spin', 'dance', 'spin', 'squat', 'jump'][i % 6] : walk ? 'walk' : 'stand');
    const M = [
      { o: 0, sex: 'm', look: 0, instr: 'flag', raise: warn || stop ? 1 : 0, keep: true },
      { o: -48, sex: 'm', look: 1, instr: 'gajdy', keep: true },
      { o: -94, sex: 'm', look: 2, instr: 'heligonka', keep: true },
      { o: -142, sex: 'f', look: 0 }, { o: -176, sex: 'm', look: 3, instr: stop ? 'valaska' : null },
      { o: -222, sex: 'f', look: 1 }, { o: -256, sex: 'm', look: 0 },
    ];
    M.forEach((m, i) => {
      const x = h + m.o;
      if (!vis(x, 80)) return;
      folk(ctx, { x, dir: 1, sex: m.sex, look: m.look, seed: i * 1.37, scale: m.scale || 1, pose: m.keep ? (walk ? 'walk' : 'stand') : pose(i), instr: m.instr, raise: m.raise, walkX: walk ? x : undefined, sing: stop }, t);
    });
    if (P.leader > 0 && vis(P.leader, 60)) {
      const moved = Math.abs(P.leader - (P.lx === undefined ? P.leader : P.lx)) > 0.05;
      P.lx = P.leader;
      folk(ctx, { x: P.leader, dir: P.phase === 'end' && g.bear.x < P.leader ? -1 : 1, sex: 'f', look: 3, seed: 9.1, pose: moved ? 'walk' : 'stand', walkX: P.leader, instr: 'clipboard', skin: 4 }, t);
    }
    if (warn || P.phase === 'stop') {
      const x = h + 10, y = GY - 190 - abs(sin(t * 6)) * 4;
      ctx.fillStyle = stop ? 'rgba(47,125,79,0.9)' : 'rgba(209,138,0,0.92)'; rr(ctx, x - 42, y - 12, 84, 22, 11);
      text(ctx, stop ? '✋ ' + LABELS.vychodna.proc.warn.replace('✋ ', '') : '⏳ ' + LABELS.vychodna.proc.warn.replace('✋ ', ''), x, y - 1, 11, '#ffffff', 80);
    }
  }

  function stall(ctx, s, g, i) {
    const x = s.x, t = g.time, stripe = ['#c4262e', '#1d4f9a', '#2f6a34', '#d6ab42', '#7a2a8a'][i % 5];
    ctx.fillStyle = '#e9dfc8'; ctx.fillRect(x - 64, GY - 112, 128, 60);
    ctx.fillStyle = stripe; ctx.globalAlpha = 0.22; for (let k = 0; k < 6; k++) ctx.fillRect(x - 64 + k * 23, GY - 112, 11, 60); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 64, GY - 112, 128, 6);
    ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 70, GY - 120, 6, 120); ctx.fillRect(x + 64, GY - 120, 6, 120);
    ctx.fillStyle = '#6a4024'; ctx.fillRect(x - 64, GY - 106, 128, 3);
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = k % 2 ? '#f7f3ea' : stripe;
      ctx.beginPath(); ctx.moveTo(x - 80 + k * 23, GY - 124); ctx.lineTo(x - 80 + (k + 1) * 23, GY - 124); ctx.lineTo(x - 80 + (k + 1) * 23, GY - 106); ctx.quadraticCurveTo(x - 80 + (k + 0.5) * 23, GY - 98, x - 80 + k * 23, GY - 106); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.moveTo(x - 84, GY - 124); ctx.lineTo(x, GY - 150); ctx.lineTo(x + 84, GY - 124); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - 40, GY - 143, 80, 14, 3);
    ctx.strokeStyle = '#6a4024'; ctx.lineWidth = 1; ctx.strokeRect(x - 40, GY - 143, 80, 14);
    text(ctx, B()[s.kind], x, GY - 136, 7.5, '#3a2010', 74);
    const v = { lace: { look: 6, x: x + 8 }, wire: { look: 11, x: x + 10 }, carver: { look: 15, x: x + 6 }, fujara: { look: 0, x: x + 30 }, honey: { look: 14, x: x + 6 } }[s.kind];
    if (s.kind === 'fujara') {
      const blown = g.vychodna && g.time - g.vychodna.fujara < 2.4;
      ZS.drawGuestBust(ctx, { x: x + 34, y: GY - 56, kind: 'fest', look: 2, seed: i + 9, up: 1, act: 'offer', scale: 0.92, face: -1, k: frac(t * 0.3) }, t);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 50 + k * 12, GY - 120, 3, 96); ctx.fillStyle = '#c9a26a'; for (let j = 0; j < 5; j++) ctx.fillRect(x - 50 + k * 12, GY - 110 + j * 18, 3, 1.2); }
    } else ZS.drawGuestBust(ctx, { x: v.x, y: GY - 56, kind: 'fest', look: v.look, seed: i + 2, up: 1, act: hash(Math.floor(t / 4) + i) < 0.5 ? 'wave' : 'offer', scale: 0.92, face: s.kind === 'honey' && g.vychodna && g.vychodna.honey.away ? 1 : -1, k: frac(t * 0.3) }, t);
    stallFront(ctx, s);
    if (s.kind === 'fujara') {
      const blown = g.vychodna && g.time - g.vychodna.fujara < 2.4;
      folk(ctx, { x: x + 92, dir: -1, sex: 'm', look: 1, seed: 3.3, pose: blown ? 'clap' : 'stand', instr: blown ? null : 'fujara', t }, t);
      if (!blown) for (let k = 0; k < 3; k++) { const u = frac(t * 0.5 + k / 3); ctx.globalAlpha = 1 - u; text(ctx, '♪', x + 100 - u * 30, GY - 130 - u * 40, 14, '#3a2010'); ctx.globalAlpha = 1; }
    }
    if (s.kind === 'lace') {
      ctx.fillStyle = '#e9e2d0'; ell(ctx, x - 26, GY - 62, 18, 7);
      ctx.fillStyle = '#8a5a2a'; for (let k = 0; k < 9; k++) { const bx = x - 40 + k * 3.6 + sin(t * 4 + k) * 0.8; ctx.fillRect(bx, GY - 58, 1.4, 10); }
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(x - 26 + 3 + k * 2, GY - 64); ctx.arc(x - 26, GY - 64, 3 + k * 2, 0, PI, true); } ctx.stroke();
      ctx.fillStyle = '#f7f3ea'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 30 + k * 12, GY - 58, 5, PI, TAU); ctx.fill(); }
    } else if (s.kind === 'wire') {
      ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { const hx = x - 52 + k * 18, hy = GY - 92 + sin(t + k) * 1.2; ctx.beginPath(); ctx.moveTo(hx, GY - 104); ctx.lineTo(hx, hy); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy + 7, 6, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx - 6, hy + 7); ctx.lineTo(hx + 6, hy + 7); ctx.moveTo(hx, hy + 1); ctx.lineTo(hx, hy + 13); ctx.stroke(); }
    } else if (s.kind === 'carver') {
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#c9a26a' : '#b08550'; rr(ctx, x - 54 + k * 9, GY - 78, 6, 22, 2); ctx.fillStyle = '#8a5a2a'; circle(ctx, x - 51 + k * 9, GY - 80, 3.6); }
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 14, GY - 96, 3, 34); ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.moveTo(x - 14, GY - 96); ctx.lineTo(x - 6, GY - 98); ctx.lineTo(x - 5, GY - 91); ctx.lineTo(x - 12, GY - 92); ctx.closePath(); ctx.fill();
    } else if (s.kind === 'honey') {
      for (let k = 0; k < 5; k++) { const hx = x - 52 + k * 14, hy = GY - 92 + sin(t * 1.4 + k) * 1.5; ctx.strokeStyle = '#c4262e'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx, GY - 104); ctx.lineTo(hx, hy - 6); ctx.stroke(); heart(ctx, hx, hy, 6, '#a8452e'); }
    }
  }

  function heart(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r); ctx.fill();
    ctx.strokeStyle = '#f7f3ea'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.55, 0, TAU); ctx.stroke();
  }

  function stallFront(ctx, s) {
    const x = s.x;
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 72, GY - 52, 144, 52);
    ctx.fillStyle = '#6a4024'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 72 + k * 24, GY - 52, 2, 52);
    ctx.fillStyle = '#a8784a'; ctx.fillRect(x - 76, GY - 56, 152, 6);
  }

  function halusky(ctx, g, x) {
    const t = g.time, c = g.vychodna;
    ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 70, GY - 132, 6, 132); ctx.fillRect(x + 84, GY - 132, 6, 132);
    ctx.fillStyle = '#2f6a34'; ctx.beginPath(); ctx.moveTo(x - 86, GY - 132); ctx.lineTo(x + 7, GY - 162); ctx.lineTo(x + 100, GY - 132); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#f7f3ea' : '#2f6a34'; ctx.fillRect(x - 80 + k * 22, GY - 132, 22, 14); }
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - 44, GY - 156, 104, 15, 3);
    ctx.strokeStyle = '#2f6a34'; ctx.lineWidth = 1; ctx.strokeRect(x - 44, GY - 156, 104, 15);
    text(ctx, B().halusky, x + 8, GY - 148.5, 7.5, '#2f6a34', 98);
    ZS.drawGuestBust(ctx, { x: x + 40, y: GY - 54, kind: 'fest', look: 14, seed: 41, up: 1, act: c && c.queue.hand > 0 ? 'offer' : 'eat', scale: 0.94, face: -1, k: c ? 1 - c.queue.hand : 0 }, t);
    ctx.fillStyle = '#6a4024'; ctx.fillRect(x - 40, GY - 50, 130, 50); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 44, GY - 54, 138, 6);
    ctx.fillStyle = '#5a3a20'; for (let k = 0; k < 5; k++) ctx.fillRect(x - 40 + k * 26, GY - 50, 2, 50);
    ctx.fillStyle = '#4a4e56'; ell(ctx, x - 10, GY - 58, 22, 8); ctx.fillRect(x - 32, GY - 70, 44, 12);
    ctx.fillStyle = '#e9e2b8'; ell(ctx, x - 10, GY - 70, 20, 4);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = '#f7f3ea'; ell(ctx, x + 28 + k * 14, GY - 56, 6, 2.2); ctx.fillStyle = '#efe6c0'; ell(ctx, x + 28 + k * 14, GY - 58, 4.5, 1.8); }
    for (let k = 0; k < 4; k++) { const u = frac(t * 0.4 + k / 4); ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - u)).toFixed(3) + ')'; circle(ctx, x - 16 + k * 5 + sin(t + k) * 4, GY - 82 - u * 40, 5 + u * 6); }
    ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.moveTo(x - 112, GY); ctx.lineTo(x - 104, GY - 70); ctx.lineTo(x - 100, GY - 70); ctx.lineTo(x - 106, GY); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 80, GY); ctx.lineTo(x - 88, GY - 70); ctx.lineTo(x - 92, GY - 70); ctx.lineTo(x - 86, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ell(ctx, x - 96, GY + 1, 22, 3);
    ctx.fillStyle = '#6a4024'; rr(ctx, x - 120, GY - 122, 48, 58, 3);
    ctx.fillStyle = '#1c1a18'; rr(ctx, x - 118, GY - 120, 44, 54, 3);
    ctx.fillStyle = '#f7f3ea'; ctx.font = '700 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(B().price, x - 96, GY - 106, 40);
    ctx.fillText(B().bryndza, x - 96, GY - 92, 40);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(x - 108, GY - 84, 24, 2);
  }

  function queuePeople(ctx, g, vis) {
    const c = g.vychodna;
    if (!c) return;
    const q = c.queue, t = g.time;
    for (const p of q.people) {
      if (!vis(p.x, 40)) continue;
      const look = [9, 10, 11, 12, 13, 15][p.look % 6];
      person(ctx, 'q' + p.look, p.x, p.phase === 'leave' || p.phase === 'eat' ? -1 : 1, p.walking ? 'walk' : p.phase === 'wait' && hash(p.look * 3.1) < 0.5 ? 'film' : 'idle', t, { look, aimAt: [p.x + 30, GY - 70], texting: p.phase === 'wait' && !p.walking && hash(p.look) < 0.5 });
      if (p.phase === 'leave' || p.phase === 'eat') { ctx.fillStyle = '#f7f3ea'; ell(ctx, p.x - 12, GY - 48, 7, 2.4); ctx.fillStyle = '#e9e2b8'; ell(ctx, p.x - 12, GY - 50, 5, 2); }
    }
    const sf = q.selfie;
    if (sf && vis(sf.x, 40)) {
      const k = sf.phase === 'snap' ? clamp(sf.t / 1.4, 0, 1) : 0;
      person(ctx, 'qs', sf.x, 1, sf.phase === 'snap' ? 'selfie' : sf.phase === 'wait' ? 'idle' : 'walk', t, { look: 10, selfieK: k });
      if (sf.phase === 'snap' && sf.t > 1.05 && sf.t < 1.3) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, sf.x + 10, GY - 74, 14); }
    }
  }

  function parkingPeople(ctx, g, vis) {
    const c = g.vychodna, t = g.time, S = g.level.vychodna;
    if (!c) return;
    if (vis(S.park.booth, 80)) person(ctx, 'parker', S.park.booth - 44, 1, 'idle', t, { look: 4 });
    const p = c.promo;
    if (p && vis(p.x, 60)) {
      const walking = p.phase === 'come' && Math.abs(p.x - (p.lx === undefined ? p.x : p.lx)) > 0.05;
      p.lx = p.x;
      person(ctx, 'promo', p.x, p.dir, walking ? 'walk' : 'idle', t, { look: 5 });
      if (p.phase !== 'done' || p.t < 1.2) {
        const hx = p.x + p.dir * 14, hy = GY - 58;
        for (let k = 0; k < 3; k++) { ctx.strokeStyle = k % 2 ? '#c4262e' : '#2f6a34'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 3 + k * 3, hy + 9); ctx.stroke(); }
        passCard(ctx, hx, hy + 9, 0.1 * sin(t * 3), 0.75);
      }
    }
  }

  function picnic(ctx, x, g) {
    ctx.fillStyle = '#c4262e'; ctx.beginPath(); ctx.moveTo(x - 46, GY + 2); ctx.lineTo(x + 46, GY + 2); ctx.lineTo(x + 38, GY - 6); ctx.lineTo(x - 38, GY - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7f3ea'; for (let k = -36; k < 40; k += 12) ctx.fillRect(x + k, GY - 6, 5, 8);
    ctx.fillStyle = '#c9a26a'; rr(ctx, x + 18, GY - 18, 20, 12, 2);
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + 28, GY - 18, 7, PI, TAU); ctx.stroke();
  }

  function tent(ctx, x, w, h, col, g, open) {
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(x - w / 2, GY - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let k = 1; k < 4; k++) ctx.fillRect(x - w / 2 + k * w / 4, GY - h, 2, h);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 10, GY - h); ctx.lineTo(x, GY - h - 40); ctx.lineTo(x + w / 2 + 10, GY - h); ctx.closePath(); ctx.fill();
    if (open) {
      const a = x - w / 2 + 20, z = x + w / 2 - 20, top = GY - h + 22;
      const gr = ctx.createLinearGradient(0, top, 0, GY);
      gr.addColorStop(0, '#4a3a2c'); gr.addColorStop(1, '#2a2018');
      ctx.fillStyle = gr; ctx.fillRect(a, top, z - a, GY - top);
      ctx.fillStyle = '#e4ddcc';
      ctx.beginPath(); ctx.moveTo(a - 2, top - 2); ctx.lineTo(a + 18, top - 2); ctx.quadraticCurveTo(a + 6, top + 40, a - 2, GY - 30); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(z + 2, top - 2); ctx.lineTo(z - 18, top - 2); ctx.quadraticCurveTo(z - 6, top + 40, z + 2, GY - 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(a - 4, top - 4, z - a + 8, 4);
    }
  }

  function rack(ctx, c, g) {
    const x = c.x, t = g.time;
    ctx.fillStyle = '#5a5e66'; ctx.fillRect(x - 36, GY - 150, 3, 150); ctx.fillRect(x + 33, GY - 150, 3, 150); ctx.fillRect(x - 36, GY - 150, 72, 3);
    for (let k = 0; k < 5; k++) {
      const hx = x - 28 + k * 14, sw = sin(t * 1.3 + k) * 1.2;
      ctx.fillStyle = '#9aa1a8'; ctx.fillRect(hx - 0.6, GY - 148, 1.2, 6);
      if (k % 2) {
        ctx.fillStyle = '#f4f0e6';
        ctx.beginPath(); ctx.moveTo(hx - 7 + sw, GY - 140); ctx.lineTo(hx + 7 + sw, GY - 140); ctx.lineTo(hx + 8 + sw, GY - 82); ctx.lineTo(hx + 1.5 + sw, GY - 82); ctx.lineTo(hx + sw, GY - 118); ctx.lineTo(hx - 1.5 + sw, GY - 82); ctx.lineTo(hx - 8 + sw, GY - 82); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1e2a44'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(hx - 5 + sw, GY - 132); ctx.lineTo(hx - 5.5 + sw, GY - 100); ctx.moveTo(hx + 5 + sw, GY - 132); ctx.lineTo(hx + 5.5 + sw, GY - 100); ctx.stroke();
        ctx.fillStyle = '#6b4423'; ctx.fillRect(hx - 7 + sw, GY - 141, 14, 4);
        ctx.fillStyle = '#e0b84a'; for (let j = 0; j < 3; j++) circle(ctx, hx - 4 + j * 4 + sw, GY - 139, 0.8);
      } else {
        ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.moveTo(hx - 7 + sw, GY - 140); ctx.lineTo(hx + 7 + sw, GY - 140); ctx.lineTo(hx + 12 + sw, GY - 128); ctx.lineTo(hx + 9 + sw, GY - 104); ctx.lineTo(hx - 9 + sw, GY - 104); ctx.lineTo(hx - 12 + sw, GY - 128); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1c1a18'; ctx.beginPath(); ctx.moveTo(hx - 7 + sw, GY - 139); ctx.lineTo(hx - 2 + sw, GY - 139); ctx.lineTo(hx - 1 + sw, GY - 108); ctx.lineTo(hx - 7 + sw, GY - 108); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx + 7 + sw, GY - 139); ctx.lineTo(hx + 2 + sw, GY - 139); ctx.lineTo(hx + 1 + sw, GY - 108); ctx.lineTo(hx + 7 + sw, GY - 108); ctx.closePath(); ctx.fill();
        for (let j = 0; j < 5; j++) { ctx.fillStyle = ['#c4262e', '#2f9e44', '#f2c230'][j % 3]; circle(ctx, hx - 3 + sw, GY - 134 + j * 5.4, 0.9); circle(ctx, hx + 3 + sw, GY - 134 + j * 5.4, 0.9); }
      }
    }
    for (const hx of [x - 22, x + 4]) {
      ctx.fillStyle = '#1c1a18'; ell(ctx, hx, GY - 151, 10, 2.4);
      ctx.beginPath(); ctx.moveTo(hx - 6, GY - 151); ctx.quadraticCurveTo(hx - 6, GY - 160, hx, GY - 160); ctx.quadraticCurveTo(hx + 6, GY - 160, hx + 6, GY - 151); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c4262e'; ctx.fillRect(hx - 6, GY - 154, 12, 2);
      ctx.fillStyle = '#f7f3ea'; ctx.save(); ctx.translate(hx + 5, GY - 156); ctx.rotate(0.6); ell(ctx, 0, -5, 1.2, 5.5); ctx.restore();
    }
  }

  function costumeTent(ctx, g, S, front) {
    const x = S.back.rack, t = g.time, c = g.vychodna, k = c && c.dress >= 0 ? clamp(1 - c.dress / 1.6, 0, 1) : 0;
    const a = x - 90, z = x + 90, top = GY - 130, sh = sin(t * 34) * 1.6 * k;
    if (!front) {
      ctx.fillStyle = '#a99c86'; ctx.fillRect(a, top, z - a, 130);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(a, GY - 8, z - a, 8);
      ctx.save(); ctx.translate(x, GY); ctx.scale(0.78, 0.78); ctx.translate(-x, -GY); rack(ctx, { x }, g); ctx.restore();
      person(ctx, 'costumer', z + 26, -1, 'idle', t, { look: 6 });
      return;
    }
    ctx.save(); ctx.translate(sh, 0);
    const wall = (x0, w, y0, h) => {
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = 'rgba(122,42,138,0.16)'; for (let q = x0 + 6; q < x0 + w - 4; q += 18) ctx.fillRect(q, y0, 6, h);
    };
    wall(a, 10, top, 130); wall(z - 10, 10, top, 130); wall(x - 46, 92, top, 130); wall(a, z - a, top, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(a, top + 26, z - a, 4);
    for (const [d0, d1] of [[a + 10, x - 46], [x + 46, z - 10]]) {
      ctx.fillStyle = '#e4ddcc';
      ctx.beginPath(); ctx.moveTo(d0, top + 30); ctx.lineTo(d0 + 12, top + 30); ctx.quadraticCurveTo(d0 + 4, top + 70, d0, top + 96); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(d1, top + 30); ctx.lineTo(d1 - 12, top + 30); ctx.quadraticCurveTo(d1 - 4, top + 70, d1, top + 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c4262e'; circle(ctx, d0 + 2, top + 68, 2); circle(ctx, d1 - 2, top + 68, 2);
    }
    ctx.fillStyle = '#7a2a8a';
    ctx.beginPath(); ctx.moveTo(a - 14, top + 2); ctx.lineTo(x, top - 40); ctx.lineTo(z + 14, top + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.moveTo(x, top - 40); ctx.lineTo(z + 14, top + 2); ctx.lineTo(x + 20, top + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - 40, top + 8, 80, 15, 3);
    text(ctx, B().costume, x, top + 15.5, 7.5, '#7a2a8a', 74);
    ctx.restore();
    if (k > 0) {
      for (let q = 0; q < 6; q++) {
        const u = frac(t * 1.4 + q / 6), px = x - 50 + q * 20 + sin(t * 5 + q) * 6, py = top - 10 - u * 50;
        ctx.globalAlpha = k * (1 - u); ctx.fillStyle = ['#f7f3ea', '#1c1a18', '#c4262e', '#2f9e44', '#f2c230', '#f7f3ea'][q];
        ctx.save(); ctx.translate(px, py); ctx.rotate(t * 4 + q); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  function firemen(ctx, g, S) {
    const x = S.back.firemen, t = g.time, tx = S.back.truck;
    ctx.fillStyle = '#c4262e'; rr(ctx, tx - 50, GY - 96, 130, 82, 6);
    ctx.fillStyle = '#d0e4f0'; ctx.fillRect(tx + 44, GY - 88, 30, 26);
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(tx - 46, GY - 58, 86, 4);
    ctx.fillStyle = '#9aa1a8'; for (let k = 0; k < 6; k++) ctx.fillRect(tx - 44 + k * 14, GY - 92, 10, 30);
    text(ctx, B().dhz, tx + 10, GY - 46, 9, '#ffffff', 110);
    for (const wx of [tx - 30, tx + 50]) { ctx.fillStyle = '#1c1c1e'; circle(ctx, wx, GY - 12, 12); ctx.fillStyle = '#9aa1a8'; circle(ctx, wx, GY - 12, 5); }
    ctx.fillStyle = frac(t) < 0.5 ? '#4dabf7' : '#1c3a6a'; rr(ctx, tx + 50, GY - 104, 16, 8, 2);
    ctx.fillStyle = '#6a4024'; ctx.fillRect(x - 46, GY - 40, 70, 5); ctx.fillRect(x - 42, GY - 35, 4, 35); ctx.fillRect(x + 16, GY - 35, 4, 35);
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 90, GY); ctx.lineTo(x - 74, GY - 52); ctx.lineTo(x - 58, GY); ctx.moveTo(x - 74, GY - 52); ctx.lineTo(x - 74, GY - 36); ctx.stroke();
    ctx.fillStyle = '#2b2f36'; ell(ctx, x - 74, GY - 26, 13, 10);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#ffb300' : '#e8590c'; ctx.beginPath(); ctx.moveTo(x - 84 + k * 5, GY - 2); ctx.lineTo(x - 82 + k * 5, GY - 12 - abs(sin(t * 8 + k)) * 6); ctx.lineTo(x - 80 + k * 5, GY - 2); ctx.closePath(); ctx.fill(); }
    for (let k = 0; k < 3; k++) { const u = frac(t * 0.5 + k / 3); ctx.fillStyle = 'rgba(240,240,240,' + (0.45 * (1 - u)).toFixed(3) + ')'; circle(ctx, x - 74 + sin(t + k) * 3, GY - 40 - u * 30, 4 + u * 5); }
    person(ctx, 'fire1', x - 30, 1, 'idle', t, { look: 7 });
    person(ctx, 'fire2', x + 30, -1, 'idle', t, { look: 17, size: 0.96 });
  }

  function inspic(ctx, g) {
    const c = g.vychodna;
    if (!c) return;
    const k = c.inspic;
    person(ctx, 'inspic', k.x, k.dir, k.phase === 'walk' ? 'walk' : 'idle', g.time, { look: 5 });
  }

  function warmup(ctx, g, S) {
    const t = g.time;
    folk(ctx, { x: S.back.tents[0] - 30, dir: 1, sex: 'f', look: 2, seed: 5.5, pose: 'spin', t }, t);
    folk(ctx, { x: S.back.tents[0] + 10, dir: -1, sex: 'm', look: 2, seed: 2.5, pose: 'squat', t }, t);
    folk(ctx, { x: S.back.tents[0] + 100, dir: -1, sex: 'm', look: 3, seed: 4.2, pose: 'stand', instr: 'fiddle', t }, t);
  }

  function amphitheatre(ctx, g, S, vis) {
    const t = g.time, [a, z] = S.scena.benches, d = dark(g);
    for (let r = 4; r >= 0; r--) {
      const y = GY - 18 - r * 24, x0 = a - 10 + r * 10, x1 = z + r * 26;
      ctx.fillStyle = r % 2 ? '#8a6a48' : '#9a7a54'; ctx.fillRect(x0, y, x1 - x0, 7);
      ctx.fillStyle = '#6a6e74'; ctx.fillRect(x0, y + 7, x1 - x0, 17 + r * 0);
      for (let x = x0 + 12; x < x1 - 8; x += 19) {
        if (!vis(x, 20)) continue;
        const lit = d.night > 0.3 && hash(x * 1.7 + r) < 0.25;
        F().head(ctx, x, y, 0.8, Math.floor(hash(x + r * 13) * 9), t, x * 0.1, lit);
      }
    }
    const [sa, sz] = S.scena.stage, mid = (sa + sz) / 2;
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(sa - 10, GY - 296, sz - sa + 20, 250);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = sa; x < sz; x += 30) ctx.fillRect(x, GY - 296, 2, 250);
    ctx.fillStyle = '#7a1f24'; ctx.fillRect(sa, GY - 250, 34, 200); ctx.fillRect(sz - 34, GY - 250, 34, 200);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let k = 0; k < 5; k++) { ctx.fillRect(sa + 6 + k * 6, GY - 250, 1.5, 200); ctx.fillRect(sz - 30 + k * 6, GY - 250, 1.5, 200); }
    ctx.fillStyle = '#6a4024'; ctx.fillRect(sa - 20, GY - 46, sz - sa + 40, 46);
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(sa - 24, GY - 52, sz - sa + 48, 8);
    ctx.fillStyle = '#5a3a20'; for (let k = 0; k < 6; k++) ctx.fillRect(sa - 54 + k * 6, GY - 8 - k * 8, 34, 8);
    ctx.fillStyle = '#7a5030'; for (const px of [sa - 16, mid, sz + 16]) ctx.fillRect(px - 6, GY - 300, 12, 254);
    ctx.fillStyle = '#4a2a14';
    ctx.beginPath(); ctx.moveTo(sa - 70, GY - 290); ctx.quadraticCurveTo(mid, GY - 372, sz + 70, GY - 290); ctx.lineTo(sz + 70, GY - 274); ctx.quadraticCurveTo(mid, GY - 352, sa - 70, GY - 274); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 14; k++) { const u = k / 13, x = sa - 60 + u * (sz - sa + 120), y = GY - 278 - sin(u * PI) * 70; ctx.fillStyle = ['#c4262e', '#f2c230', '#2f9e44'][k % 3]; circle(ctx, x, y + 6, 3); }
    ctx.fillStyle = '#f7f3ea'; rr(ctx, mid - 74, GY - 340, 148, 22, 4);
    text(ctx, B().scena, mid, GY - 329, 12, '#5a1f24', 136);
    for (const sx of [sa - 34, sz + 34]) {
      ctx.fillStyle = '#1c1c1e'; rr(ctx, sx - 14, GY - 150, 28, 46, 3);
      ctx.fillStyle = '#3a3a3e'; circle(ctx, sx, GY - 137, 6); circle(ctx, sx, GY - 118, 8);
    }
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(sa - 40, GY - 320, sz - sa + 80, 4);
    for (let k = 0; k < 6; k++) { const lx = sa + 10 + k * (sz - sa - 20) / 5; ctx.fillStyle = '#2b2f36'; rr(ctx, lx - 6, GY - 318, 12, 12, 2); ctx.fillStyle = d.dusk > 0.2 ? '#fff4d0' : '#d9d2c0'; circle(ctx, lx, GY - 308, 3.4); }
    if (!g.once.tanec) {
      const pose = ['dance', 'spin', 'squat', 'spin', 'jump'];
      for (let k = 0; k < 4; k++) folk(ctx, { x: sa + 64 + k * 52, y: GY - 50, dir: k % 2 ? -1 : 1, sex: k % 2 ? 'f' : 'm', look: k, seed: k * 2.1, pose: pose[k], t, instr: k === 2 ? 'valaska' : null }, t);
    }
    folk(ctx, { x: sz - 50, y: GY - 50, dir: -1, sex: 'm', look: 1, seed: 7.3, pose: 'stand', instr: 'bass', t }, t);
    folk(ctx, { x: sz - 84, y: GY - 50, dir: -1, sex: 'm', look: 2, seed: 8.1, pose: 'stand', instr: 'fiddle', t }, t);
  }

  function tancovisko(ctx, g, S, vis) {
    const [a, z] = S.noc.tent, t = g.time, mid = (a + z) / 2;
    ctx.fillStyle = '#6a4024'; for (const px of [a, mid, z]) { ctx.fillRect(px - 4, GY - 170, 8, 170); ctx.fillStyle = '#5a3a20'; ctx.fillRect(px - 4, GY - 170, 2.5, 170); ctx.fillStyle = '#6a4024'; }
    ctx.fillStyle = '#4a3328';
    ctx.beginPath(); ctx.moveTo(a - 26, GY - 166); ctx.lineTo(mid, GY - 240); ctx.lineTo(z + 26, GY - 166); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    for (let r = 0; r < 9; r++) {
      const yy = GY - 240 + r * 9;
      ctx.fillStyle = r % 2 ? '#5a4234' : '#634a3a'; ctx.fillRect(a - 30, yy, z - a + 60, 9);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let q = a - 30 + (r % 2) * 7; q < z + 30; q += 14) ctx.fillRect(q, yy, 1.2, 9);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(mid, GY - 240); ctx.lineTo(a - 26, GY - 166); ctx.lineTo(a, GY - 166); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3a2820'; ctx.fillRect(a - 26, GY - 168, z - a + 52, 5);
    lanterns(ctx, g, a, z, GY - 168);
    ctx.fillStyle = '#f7f3ea'; rr(ctx, mid - 60, GY - 214, 120, 22, 4);
    text(ctx, B().tancovisko, mid, GY - 203, 12, '#2f6a34', 110);
    const band = [['fiddle', 0], ['cimbal', 1], ['bass', 2]];
    band.forEach(([instr, i]) => folk(ctx, { x: z - 30 - i * 40, dir: -1, sex: 'm', look: i + 1, seed: 11 + i, pose: instr === 'cimbal' ? 'sit' : 'stand', instr, t }, t));
    for (let k = 0; k < 3; k++) {
      const cx = a + 70 + k * 90, sp = t * 2.4 + k;
      const off = sin(sp) * 12;
      folk(ctx, { x: cx - 10 + off, dir: 1, sex: 'm', look: k, seed: k * 3.1, pose: 'dance', t }, t);
      folk(ctx, { x: cx + 12 - off, dir: -1, sex: 'f', look: k + 1, seed: k * 3.7, pose: 'spin', t }, t);
    }
  }

  function etnodom(ctx, g, S) {
    const x = S.noc.etno, t = g.time, c = g.vychodna;
    ctx.fillStyle = '#4a3a30'; ctx.fillRect(x + 50, GY - 268, 18, 44); ctx.fillStyle = '#3a2c24'; ctx.fillRect(x + 47, GY - 272, 24, 6);
    for (let k = 0; k < 4; k++) { const u = frac(t * 0.25 + k / 4); ctx.fillStyle = 'rgba(225,225,228,' + (0.42 * (1 - u)).toFixed(3) + ')'; circle(ctx, x + 59 + sin(t * 0.7 + k) * 6 + u * 18, GY - 278 - u * 60, 6 + u * 10); }
    house(ctx, x, 0, g);
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - 34, GY - 92, 68, 13, 3);
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1; ctx.strokeRect(x - 34, GY - 92, 68, 13);
    text(ctx, B().etno, x, GY - 85.5, 7.2, '#4a2a1a', 62);
    const r = S.noc.radio, live = frac(t * 0.8) < 0.6, talk = c && t - c.radio < 1.8, u = talk ? (t - c.radio) / 1.8 : 0;
    ctx.fillStyle = '#5a5e66'; for (const px of [r - 58, r + 58]) ctx.fillRect(px - 1.5, GY - 118, 3, 118);
    ctx.fillStyle = '#1d4f9a'; ctx.beginPath(); ctx.moveTo(r - 68, GY - 116); ctx.lineTo(r, GY - 138); ctx.lineTo(r + 68, GY - 116); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a4384'; ctx.fillRect(r - 68, GY - 118, 136, 14);
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#1d4f9a' : '#f7f3ea'; ctx.beginPath(); ctx.moveTo(r - 68 + k * 17, GY - 104); ctx.lineTo(r - 68 + (k + 1) * 17, GY - 104); ctx.lineTo(r - 68 + (k + 0.5) * 17, GY - 98); ctx.closePath(); ctx.fill(); }
    text(ctx, B().radio, r + 6, GY - 111, 7, '#ffffff', 112);
    ctx.fillStyle = live ? '#e03131' : '#6a1f1f'; circle(ctx, r - 58, GY - 111, 2.6);
    person(ctx, 'mod', r + 22, -1, talk ? 'film' : 'idle', t, { look: 16, aimAt: [g.bear.x + 30, GY - 60], scared: talk && u > 0.35 && u < 0.7 });
    ctx.fillStyle = '#6a4024'; ctx.fillRect(r - 30, GY - 42, 76, 5); ctx.fillRect(r - 26, GY - 37, 4, 37); ctx.fillRect(r + 38, GY - 37, 4, 37);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(r - 30, GY - 37, 76, 10);
    ctx.fillStyle = '#2b2f36'; rr(ctx, r - 20, GY - 52, 28, 10, 2);
    ctx.fillStyle = '#9aa1a8'; for (let k = 0; k < 5; k++) circle(ctx, r - 16 + k * 5, GY - 47, 1.2);
    ctx.fillStyle = '#3a3e44'; ctx.beginPath(); ctx.moveTo(r + 14, GY - 42); ctx.lineTo(r + 36, GY - 42); ctx.lineTo(r + 32, GY - 58); ctx.lineTo(r + 18, GY - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fd0ef'; ctx.fillRect(r + 19, GY - 56, 12, 9);
    ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 1.6;
    const mx = talk ? lerp(r - 24, g.bear.x + 34 * g.bear.dir, sin(PI * u) * 0.9) : r - 24, my = talk ? GY - 66 : GY - 62;
    ctx.beginPath(); ctx.moveTo(r - 24, GY - 42); ctx.lineTo(r - 24, GY - 58); ctx.lineTo(mx, my); ctx.stroke();
    ctx.fillStyle = '#2b2f36'; ell(ctx, mx, my - 3, 3.2, 4.2);
    if (talk && u > 0.2 && u < 0.75) for (let k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 - k * 0.2).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(mx, my - 3, 6 + k * 5 + frac(t * 3) * 4, -0.6, 0.6); ctx.stroke(); }
  }

  function fisher(ctx, g, S) {
    const c = g.vychodna, x = S.woods.fisher, t = g.time, f = c && c.fishing, R = g.level.river;
    const jump = c && t - (c.fisherJump || -9) < 2, angry = f && t - f.angryAt < 2;
    const ph = f ? f.phase : 'wait', u = f ? 1 - f.t / ({ bite: 0.9, pull: 0.9, cast: 0.7 }[ph] || 1) : 0;
    ctx.fillStyle = '#6a4024'; rr(ctx, x - 14, GY - 24, 26, 6, 2); ctx.fillRect(x - 12, GY - 18, 3, 18); ctx.fillRect(x + 7, GY - 18, 3, 18);
    person(ctx, 'fisher', x, -1, angry ? 'idle' : 'idle', t, { look: 15, scared: jump || angry });
    const lift = ph === 'pull' ? sin(PI * clamp(u * 1.3, 0, 1)) * 34 : ph === 'cast' ? -sin(PI * u) * 18 : ph === 'bite' ? -6 * abs(sin(t * 14)) : jump ? 24 : 0;
    const hx = x - 12, hy = GY - 50, tip = [x - 132 + (ph === 'cast' ? 40 * sin(PI * u) : 0), GY - 112 - lift];
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + tip[0]) / 2, (hy + tip[1]) / 2 - 8 - (ph === 'bite' ? 6 : 0), tip[0], tip[1]); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#3a3e44'; circle(ctx, hx - 4, hy + 2, 3);
    const fx = R ? R.to - 46 : x - 140, wy = GY - 6;
    let bx = fx, by = wy + sin(t * 2.2) * 1.2;
    if (ph === 'bite') by = wy + 3 + 3 * abs(sin(t * 16));
    if (ph === 'pull') { const k = clamp(u * 1.2, 0, 1); bx = fx + (x + 26 - fx) * k; by = wy - sin(PI * k) * 90 + k * (GY - 16 - wy); }
    if (ph === 'cast') { const k = 1 - u; bx = tip[0] + (fx - tip[0]) * (1 - k); by = tip[1] + (wy - tip[1]) * (1 - k) - sin(PI * (1 - k)) * 30; }
    ctx.strokeStyle = 'rgba(240,240,240,0.75)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(bx, by); ctx.stroke();
    if (ph === 'pull') {
      ctx.save(); ctx.translate(bx, by + 8); ctx.rotate(1.2 + sin(t * 20) * 0.4);
      ctx.fillStyle = '#7a8a8e'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 3.6, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(13, -3.5); ctx.lineTo(13, 3.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8a0a0'; ctx.fillRect(-4, -0.6, 8, 1.2); ctx.restore();
    } else if (ph !== 'cast') { ctx.fillStyle = '#e03131'; circle(ctx, bx, by - 2, 2.6); ctx.fillStyle = '#f7f3ea'; circle(ctx, bx, by - 4.2, 1.4); }
    if (ph === 'bite') for (let k = 0; k < 2; k++) { const q = frac(t * 2 + k / 2); ctx.strokeStyle = 'rgba(240,252,255,' + (0.7 * (1 - q)).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(fx, wy + 1, 4 + q * 12, 1 + q * 2, 0, 0, TAU); ctx.stroke(); }
    const bk = x + 26;
    ctx.fillStyle = '#8a929a'; ctx.beginPath(); ctx.moveTo(bk - 11, GY - 18); ctx.lineTo(bk + 11, GY - 18); ctx.lineTo(bk + 9, GY); ctx.lineTo(bk - 9, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a636c'; ctx.fillRect(bk - 11, GY - 19, 22, 2.4);
    for (let k = 0; k < (f ? f.bucket : 1); k++) { ctx.save(); ctx.translate(bk - 5 + k * 5, GY - 20); ctx.rotate(-1.2 + k * 0.5); ctx.fillStyle = '#7a8a8e'; ctx.beginPath(); ctx.ellipse(0, -4, 2.6, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }


  function axeArch(ctx, g, x, i, front) {
    const t = g.time, c = g.vychodna, cheer = c && c.arch[i] && t - c.arch[i].at < 1.4;
    const fx = front ? x + 10 : x - 10, fy = front ? GY + 12 : GY - 8, sc = front ? 1.08 : 0.94;
    F().figure(ctx, { x: fx, y: fy, dir: front ? -1 : 1, sex: 'm', look: (i * 2 + (front ? 1 : 0)) % 4, seed: 3.1 + i + (front ? 1 : 0), scale: sc, pose: 'stand', instr: null, t }, t);
    const hx = fx + (front ? -7 : 7) * sc, hy = fy - 78 * sc, ex = x + (front ? -16 : 16), ey = GY - 128 - (cheer ? 4 * abs(sin(t * 10)) : 0);
    ctx.strokeStyle = '#f2ece0'; ctx.lineWidth = 5 * sc; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx + (front ? -3 : 3) * sc, fy - 62 * sc); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = '#6a4024'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.atan2(ey - hy, ex - hx));
    ctx.fillStyle = '#d6d9dd'; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(14, -12); ctx.lineTo(16, 5); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-2, 0, 17, 2); ctx.restore();
    ctx.fillStyle = '#c4262e'; ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx + (front ? 6 : -6), hy + 14 + sin(t * 4 + i) * 2); ctx.lineTo(hx + (front ? -2 : 2), hy + 3); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'butt';
  }

  function patrol(ctx, g, p) {
    const t = g.time, night = dark(g).night + dark(g).dusk * 0.5;
    const hx = p.x + p.dir * 14, hy = GY - 56, len = 200;
    const gr = ctx.createLinearGradient(hx, 0, hx + p.dir * len, 0);
    gr.addColorStop(0, 'rgba(255,240,180,' + (0.22 + 0.25 * night).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + p.dir * len, GY - 4); ctx.lineTo(hx + p.dir * len, hy - 46 + sin(t * 1.4) * 8); ctx.closePath(); ctx.fill();
    const ph = p.phase || 'walk';
    person(ctx, 'patrol', p.x, p.dir, ph === 'walk' || (ph === 'hide' && abs(p.x - p.hideX) > 2) ? 'walk' : 'idle', t, { look: 3, scared: ph !== 'walk' && ph !== 'calm' });
    ctx.fillStyle = '#2b2f36'; rr(ctx, hx - 4, hy - 3, 9, 5, 1.5); ctx.fillStyle = '#fff6c8'; circle(ctx, hx + p.dir * 4, hy - 0.5, 2);
  }

  function campTent(ctx, x, i, g) {
    const c = g.vychodna, t = g.time, down = c && c.camp.down[i], woke = c && t - (c.camp.woke[i] || -9) < 2.2;
    const col = ['#e8590c', '#1c7ed6', '#2f9e44'][i % 3];
    const R = ZS.sim.vychodna.CAMP.rope;
    const ropes = () => {
      for (const s of [-1, 1]) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x + s * 40, GY - 36); ctx.lineTo(x + s * R, GY - 2); ctx.stroke();
        ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x + s * 40, GY - 36); ctx.lineTo(x + s * R, GY - 2); ctx.stroke();
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + s * R - 2, GY - 8, 4, 10); ctx.fillStyle = '#c9ccd0'; ctx.fillRect(x + s * R - 3, GY - 9, 6, 2.4);
      }
    };
    if (i === 0) ropes();
    const shake = down && t - down < 0.8 ? sin(t * 40) * 3 * (1 - (t - down) / 0.8) : 0;
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - 50, GY); ctx.quadraticCurveTo(x - 46, GY - 62, x, GY - 64); ctx.quadraticCurveTo(x + 46, GY - 62, x + 50, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.moveTo(x - 14, GY); ctx.quadraticCurveTo(x - 6, GY - 40, x + 8, GY - 42); ctx.lineTo(x + 14, GY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 40, GY - 20); ctx.quadraticCurveTo(x, GY - 70, x + 40, GY - 20); ctx.stroke();
    if (woke) { ctx.fillStyle = 'rgba(30,20,10,0.5)'; ctx.beginPath(); ctx.moveTo(x - 10, GY); ctx.lineTo(x, GY - 34); ctx.lineTo(x + 10, GY); ctx.closePath(); ctx.fill(); F().head(ctx, x, GY - 26, 1, (i * 3 + 2) % 9, t, i, false); }
    else { const u = frac(t * 0.4 + i * 0.3); ctx.globalAlpha = 1 - u; text(ctx, 'z', x + 20 + u * 10, GY - 70 - u * 30, 10 + u * 6, '#f7f3ea'); ctx.globalAlpha = 1; }
    ctx.restore();
  }

  function wc(ctx, x) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ell(ctx, x, GY + 1, 56, 4);
    [-32, 0, 32].forEach((dx, k) => {
      const cx = x + dx;
      ctx.fillStyle = ['#2f6db0', '#2f9e44', '#2f6db0'][k]; rr(ctx, cx - 15, GY - 92, 30, 92, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(cx - 13, GY - 90, 4, 88);
      ctx.fillStyle = '#e9ecef'; rr(ctx, cx - 16, GY - 98, 32, 9, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(cx - 11, GY - 82, 22, 74);
      ctx.fillStyle = '#c9ccd0'; circle(ctx, cx + 8, GY - 46, 2);
      ctx.fillStyle = k === 1 ? '#e03131' : '#2f9e44'; rr(ctx, cx + 4, GY - 56, 6, 4, 1);
      ctx.fillStyle = '#e9ecef'; for (let v = 0; v < 3; v++) ctx.fillRect(cx - 6 + v * 4, GY - 76, 2, 6);
    });
    ctx.fillStyle = '#f7f3ea'; rr(ctx, x - 34, GY - 116, 68, 13, 3);
    text(ctx, B().wc, x, GY - 109.5, 7, '#1d4f9a', 62);
  }


  function lanterns(ctx, g, a, z, y, front) {
    const t = g.time, d = dark(g), on = d.dusk * 0.6 + d.night;
    ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let x = a; x <= z; x += 6) { const u = ((x - a) % 120) / 120; const yy = y + sin(u * PI) * 16; if (x === a) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke();
    for (let x = a + 15; x < z; x += 30) {
      const u = ((x - a) % 120) / 120, yy = y + sin(u * PI) * 16 + 6, col = ['#e03131', '#f2c230', '#2f9e44', '#4dabf7'][Math.floor(x / 30) % 4];
      ctx.fillStyle = col; ell(ctx, x, yy, 4, 5);
      if (on > 0.05) { ctx.fillStyle = 'rgba(255,240,200,' + (0.9 * on).toFixed(3) + ')'; circle(ctx, x, yy, 2); }
    }
  }

  function back(ctx, g, vis, span, withBear) {
    const L = g.level, S = L.vychodna, t = g.time, c = g.vychodna;
    for (const [i, x] of L.backCars.entries()) if (vis(x, 70)) { ctx.save(); ctx.translate(x, GY - 16); ctx.scale(0.74, 0.74); ctx.translate(-x, -GY); car(ctx, x, CAR_COLS[(i + 3) % CAR_COLS.length], t, {}); ctx.restore(); }
    if (vis(S.park.booth, 120)) booth(ctx, S.park.booth, g);
    if (vis(S.woods.fisher, 90)) fisher(ctx, g, S);
    S.park.jam.forEach((j, i) => { if (vis(j.x, 120)) jamCar(ctx, j, g, i); });
    if (vis(S.park.picnic, 60)) picnic(ctx, S.park.picnic, g);
    if (span(S.park.from, S.gate.to, 100)) parkingPeople(ctx, g, vis);
    if (vis(S.gate.arch, 140)) { arch(ctx, S.gate.arch, g, false); fence(ctx, S.gate.from, S.gate.arch - 70); fence(ctx, S.gate.arch + 70, S.gate.to + 10); }
    if (c && vis(c.steward.x, 50)) person(ctx, 'steward', c.steward.x, -1, 'idle', t, { look: 3 });
    if (c && vis(c.steward.x, 80) && t - c.steward.scanAt < 1.4) {
      const u = (t - c.steward.scanAt) / 1.4, sx = c.steward.x, sy = GY - 116 - u * 8;
      ctx.globalAlpha = 1 - u * u; ctx.fillStyle = '#2f9e44'; circle(ctx, sx, sy, 8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx - 1, sy + 3); ctx.lineTo(sx + 4, sy - 3); ctx.stroke(); ctx.globalAlpha = 1;
    }

    if (span(S.obec.from, S.obec.to, 300)) {
      if (vis(S.obec.from - 26, 60)) villageSign(ctx, S.obec.from - 26);
      for (const [i, x] of S.obec.houses.entries()) if (vis(x, 120)) house(ctx, x, i, g);
      if (vis(S.obec.church, 140)) church(ctx, S.obec.church, g);
      onlookers(ctx, g, S.obec.from + 80, S.obec.to - 60, vis, 0);
      S.obec.arches.forEach((x, i) => { if (vis(x, 90)) axeArch(ctx, g, x, i, false); });
      procession(ctx, g, vis);
    }
    if (span(S.jarmok.from, S.jarmok.to, 200)) {
      lanterns(ctx, g, S.jarmok.from, S.jarmok.to, GY - 200);
      S.jarmok.stalls.forEach((s, i) => { if (vis(s.x, 120)) stall(ctx, s, g, i); });
      if (vis(S.jarmok.halusky, 200)) halusky(ctx, g, S.jarmok.halusky);
      queuePeople(ctx, g, vis);
    }
    if (span(S.back.from, S.back.to, 200)) {
      S.back.tents.forEach((x, i) => { if (vis(x, 140)) tent(ctx, x, 150, 110, i ? '#7a2a8a' : '#2f6a34', g, true); });
      if (vis(S.back.from, 200)) warmup(ctx, g, S);
      if (vis(S.back.rack, 140)) costumeTent(ctx, g, S, false);
      if (vis(S.back.firemen, 200)) firemen(ctx, g, S);
      inspic(ctx, g);
    }
    if (span(S.scena.from - 300, S.scena.to + 200, 200)) amphitheatre(ctx, g, S, vis);
    if (span(S.noc.from, S.noc.to, 200)) {
      lanterns(ctx, g, S.noc.from, S.noc.tent[0] - 30, GY - 190);
      if (span(S.noc.tent[0], S.noc.tent[1], 200)) tancovisko(ctx, g, S, vis);
      if (vis(S.noc.etno, 200)) etnodom(ctx, g, S);
      if (vis(S.noc.wc, 80)) wc(ctx, S.noc.wc);
      if (vis(S.noc.camp[0] + 40, 60)) { ctx.fillStyle = '#f7f3ea'; rr(ctx, S.noc.camp[0] - 30, GY - 96, 96, 20, 3); text(ctx, B().camp, S.noc.camp[0] + 18, GY - 86, 9, '#2f6a34', 90); ctx.fillStyle = '#7a5030'; ctx.fillRect(S.noc.camp[0] + 16, GY - 76, 4, 76); }
    }
  }

  function front(ctx, g, vis, span) {
    const L = g.level, S = L.vychodna, t = g.time, c = g.vychodna;
    if (c && c.sink) ZS.capitalArt.dunk(ctx, Object.assign({ deep: SIM().BROOK.depth }, c.sink, { x: g.bear.x }), g.level.river);
    if (vis(S.gate.arch, 160)) arch(ctx, S.gate.arch, g, true);
    S.obec.arches.forEach((x, i) => { if (vis(x, 90)) axeArch(ctx, g, x, i, true); });
    if (vis(S.back.rack, 140)) costumeTent(ctx, g, S, true);
    S.back.tents.forEach((x, i) => { if (i === 1 && vis(x, 90)) { ctx.fillStyle = '#f2efe6'; ctx.fillRect(x - 54, GY - 66, 108, 66); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x - 54, GY - 66, 108, 4); } });
    const hid = c && c.patrol.phase !== 'scared' && (c.patrol.phase !== 'walk' || (c.patrol.done && c.patrol.hideX && Math.abs(c.patrol.x - c.patrol.hideX) < 64));
    if (hid && vis(c.patrol.x, 260)) patrol(ctx, g, c.patrol);
    L.tents.forEach((x, i) => { if (vis(x, 90)) campTent(ctx, x, i, g); });
    if (c && !hid && vis(c.patrol.x, 260)) patrol(ctx, g, c.patrol);
    if (vis(S.noc.wc, 80) && g.bear.covered && Math.abs(g.bear.x - S.noc.wc) < 60) { ctx.fillStyle = '#2f9e44'; rr(ctx, S.noc.wc - 15, GY - 92, 30, 92, 4); ctx.fillStyle = '#e03131'; rr(ctx, S.noc.wc + 4, GY - 56, 6, 4, 1); }
  }

  function glow(ctx, x, y, r, col, a) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function goalText(g) {
    const G = LABELS.vychodna.goals, k = SIM().goal(g);
    return '🎯 ' + G[k];
  }

  function objective(ctx, g, viewW) {
    if (g.over || g.pass) return;
    const s = goalText(g), x = g.cam + viewW / 2, y = GY - 404;
    if (s !== g.goalWas) { g.goalWas = s; g.goalAt = g.time; }
    const fresh = clamp(1 - (g.time - (g.goalAt || 0)) / 4, 0, 1);
    ctx.font = '800 ' + (13 + 3 * fresh) + 'px system-ui, sans-serif';
    const w = ctx.measureText(s).width + 28, h = 26 + 6 * fresh;
    ctx.fillStyle = 'rgba(20,16,26,' + (0.55 + 0.3 * fresh).toFixed(3) + ')'; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = fresh > 0 ? '#ffe08a' : '#f6e7c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 1);
  }

  function over(ctx, g, viewW) {
    const S = g.level.vychodna, cam = g.cam, a = dim(g);
    if (a > 0.005) {
      ctx.fillStyle = 'rgba(12,18,46,' + a.toFixed(3) + ')'; ctx.fillRect(cam - 20, TOP, viewW + 40, GY - TOP + 900);
      const k = a / 0.52;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const vis = (x, m) => x > cam - m && x < cam + viewW + m;
      for (const [p, q, y] of [[S.jarmok.from, S.jarmok.to, GY - 196], [S.noc.from, S.noc.tent[0] - 30, GY - 186]]) {
        for (let x = p + 15; x < q; x += 30) if (vis(x, 60)) glow(ctx, x, y + sin(((x - p) % 120) / 120 * PI) * 16 + 6, 14, '255,200,120', 0.4 * k);
      }
      const [sa, sz] = S.scena.stage;
      if (vis((sa + sz) / 2, 400)) {
        for (const sx of [sa + 60, (sa + sz) / 2, sz - 60]) glow(ctx, sx, GY - 120, 150, '255,236,190', 0.32 * k);
        ctx.fillStyle = 'rgba(255,240,200,' + (0.08 * k).toFixed(3) + ')';
        for (const sx of [sa + 40, sz - 40]) { ctx.beginPath(); ctx.moveTo(sx, GY - 240); ctx.lineTo(sx - 60, GY - 50); ctx.lineTo(sx + 60, GY - 50); ctx.closePath(); ctx.fill(); }
      }
      const [ta, tz] = S.noc.tent;
      if (vis((ta + tz) / 2, 300)) { for (let x = ta + 12; x < tz; x += 36) glow(ctx, x, GY - 160, 12, '255,220,150', 0.45 * k); }
      for (const x of [S.noc.etno - 58, S.noc.etno + 58]) if (vis(x, 60)) glow(ctx, x, GY - 89, 26, '255,200,120', 0.3 * k);
      for (const x of S.obec.houses) if (vis(x, 120)) { glow(ctx, x - 58, GY - 89, 24, '255,200,120', 0.24 * k); glow(ctx, x + 58, GY - 89, 24, '255,200,120', 0.24 * k); }
      if (vis(S.noc.radio, 120)) glow(ctx, S.noc.radio + 25, GY - 52, 16, '170,210,255', 0.35 * k);
      if (vis(S.back.firemen - 74, 60)) glow(ctx, S.back.firemen - 74, GY - 10, 60, '255,150,60', 0.45 * k);
      ctx.restore();
    }
    objective(ctx, g, viewW);
  }

  API.sky = sky;
  API.backdrop = backdrop;
  API.ground = ground;
  API.back = back;
  API.front = front;
  API.over = over;
  API.dark = dark;
  API.car = car;
  API.person = person;
})();
