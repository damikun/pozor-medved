(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { emoji, label, rrect, circle, ellipse } = ZS.gfx;
  const B = ZS.render.backdrop;
  const TAU = Math.PI * 2;
  const KEYS = ['spring', 'summer', 'autumn'];
  const BUK = { spring: '#7cc35a', summer: '#4f9a43', autumn: '#d8892f' };
  const BREZA = { spring: '#a8d66a', summer: '#8cc152', autumn: '#e6c34a' };
  const BARK = { buk: '#9b958b', smrek: '#6b4a32', breza: '#f1efe8', jablon: '#7a5534' };
  const TWIG = { buk: '#6e665d', breza: '#5a3a33', jablon: '#5b4232' };
  const BULB = ['#ffe7a0', '#ffad42', '#ff5e4d', '#ffd54f', '#ffc9e0'];
  const CANDY = ['#e63946', '#2a9d8f', '#f4a261', '#7b5ea7', '#3a86ff', '#e9c46a'];
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const keyOf = (g, season) => (g && g.seasonKey) || KEYS[season | 0] || KEYS[0];
  let chill = false;
  const cold = (g) => (g ? (chill = B.cold(g)) : chill);
  const oval = (ctx, x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
  const shades = {};
  function dk(hex, k) {
    k = Math.round(k * 40) / 40;
    const key = hex + k;
    let v = shades[key];
    if (!v) {
      const n = parseInt(hex.slice(1), 16), c = (s) => Math.min(255, Math.round(((n >> s) & 255) * k));
      v = shades[key] = 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
    }
    return v;
  }

  function mound(ctx, x, hw, h, W) {
    ctx.fillStyle = W.snow;
    ctx.beginPath(); ctx.moveTo(x - hw, GY + 2);
    ctx.bezierCurveTo(x - hw * 0.55, GY + 1, x - hw * 0.45, GY - h, x, GY - h);
    ctx.bezierCurveTo(x + hw * 0.45, GY - h, x + hw * 0.55, GY + 1, x + hw, GY + 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.snowShade; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(x + hw * 0.1, GY - h * 0.99);
    ctx.bezierCurveTo(x + hw * 0.45, GY - h, x + hw * 0.55, GY + 1, x + hw, GY + 2);
    ctx.lineTo(x + hw * 0.32, GY + 2);
    ctx.bezierCurveTo(x + hw * 0.4, GY - h * 0.35, x + hw * 0.3, GY - h * 0.8, x + hw * 0.1, GY - h * 0.99);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function bank(ctx, x0, x1, h, sd, W) {
    const n = Math.max(2, Math.round((x1 - x0) / 46)), step = (x1 - x0) / n;
    ctx.fillStyle = W.snow;
    ctx.beginPath(); ctx.moveTo(x0 - 6, GY + 2); ctx.quadraticCurveTo(x0 - 2, GY - h * 0.7, x0 + step * 0.3, GY - h * 0.85);
    for (let i = 0; i < n; i++) {
      const xa = x0 + step * (i + 0.3), xb = x0 + step * (i + 1.3 > n ? n : i + 1.3), hb = h * (0.75 + hash(sd + i) * 0.45);
      ctx.quadraticCurveTo((xa + xb) / 2, GY - hb - h * 0.25, Math.min(xb, x1), GY - h * (0.7 + hash(sd + i + 0.5) * 0.3));
    }
    ctx.quadraticCurveTo(x1 + 2, GY - h * 0.6, x1 + 6, GY + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.snowShade; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(x0, GY + 2); ctx.quadraticCurveTo((x0 + x1) / 2, GY - h * 0.35, x1 + 6, GY + 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function icicles(ctx, x0, x1, y, len, sd, W, time) {
    const k = W.icicle;
    if (k < 0.03) return;
    const body = new Path2D(), shine = new Path2D();
    const longest = [];
    let i = 0;
    for (let x = x0 + 2.5; x < x1 - 1.5; i++) {
      const h = hash(sd + i * 1.37), l = (2.2 + h * h * len) * (0.35 + 0.65 * k), w = 1.3 + h * 1.5;
      body.moveTo(x - w, y - 0.5); body.lineTo(x + w, y - 0.5); body.lineTo(x + w * 0.25, y + l); body.lineTo(x - w * 0.1, y + l + 0.6); body.closePath();
      shine.moveTo(x - w * 0.45, y + 0.6); shine.lineTo(x - w * 0.05, y + l * 0.8);
      if (h > 0.62) longest.push(x, y + l, h);
      x += 3.6 + hash(sd + i * 2.9) * 6.5;
    }
    ctx.fillStyle = W.ice; ctx.fill(body);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.7; ctx.stroke(shine);
    if (W.wet < 0.05) return;
    for (let j = 0; j < longest.length; j += 3) {
      const u = frac(time * 0.42 + longest[j + 2] * 7.3), tx = longest[j], ty = longest[j + 1];
      const a = W.wet * (u < 0.7 ? sstep(0, 0.7, u) : 1 - sstep(0.7, 1, u));
      ctx.fillStyle = 'rgba(206,224,238,' + (0.9 * a).toFixed(3) + ')';
      if (u < 0.7) circle(ctx, tx + 0.1, ty + 0.4 + u * 1.2, 0.5 + u * 1.1);
      else circle(ctx, tx + 0.1, ty + 1.2 + (u - 0.7) * (u - 0.7) * 900, 1.1);
    }
  }

  function snowCap(ctx, x, y0, hw, th, edge, n, sd, W, shade) {
    const t2 = th + 4, h2 = hw * (t2 / th), depth = (edge - (y0 - t2)) / t2;
    ctx.fillStyle = W.snowShade; B.cap(ctx, x + 1.3, y0 + 1.6, h2, t2, depth, n, sd);
    ctx.fillStyle = W.snow; B.cap(ctx, x - 0.5, y0, h2, t2, depth - 0.012, n, sd);
    if (!shade) return;
    ctx.save();
    B.cap(ctx, x - 0.5, y0, h2, t2, depth - 0.012, n, sd, true); ctx.clip();
    ctx.globalAlpha = shade; ctx.fillStyle = W.snowShade;
    ctx.beginPath(); ctx.moveTo(x - 0.5, y0 - t2 - 4); ctx.lineTo(x + h2 + 8, y0 + 8); ctx.lineTo(x + 3, y0 + 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function trunk(ctx, t, g) {
    if (t.kind === 'limba') { ZS.alpineArt.limbaTrunk(ctx, t, g); return; }
    const W = cold(g) ? B.look(g) : null;
    const top = t.kind === 'smrek' ? GY - t.h * 0.42 : GY - t.h;
    const half = t.w / 2;
    ctx.fillStyle = W ? dk(BARK[t.kind], W.bark) : BARK[t.kind];
    ctx.beginPath();
    ctx.moveTo(t.x - half - 7, GY); ctx.lineTo(t.x - half, GY - 16); ctx.lineTo(t.x - half + 2, top);
    ctx.lineTo(t.x + half - 2, top); ctx.lineTo(t.x + half, GY - 16); ctx.lineTo(t.x + half + 7, GY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.fillRect(t.x + t.w * 0.12, top, t.w * 0.34, GY - top - 16);
    if (t.kind === 'breza') {
      ctx.fillStyle = '#2b2b2b';
      for (let y = top + 18, i = 0; y < GY - 12; y += 24, i++) ctx.fillRect(t.x - half + (i % 2) * 4, y, t.w * 0.55, 3);
    }
    if (!W) return;
    if (W.plaster > 0.02) {
      const sd = t.x * 0.37, y0 = GY - 18, y1 = top + 10, n = 14, ex = (y) => t.x - half + 0.6 + ((GY - y) * 2) / (GY - top);
      const wd = (y) => Math.max(0, (t.kind === 'breza' ? 1.6 : 3.2) * (0.35 + Math.sin((y - top) * 0.045 + sd) * 0.4 + hash(Math.round(y * 0.08) + sd) * 0.45));
      ctx.fillStyle = W.snow; ctx.globalAlpha = W.plaster;
      ctx.beginPath(); ctx.moveTo(ex(y0), y0);
      for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; ctx.lineTo(ex(y) + wd(y), y); }
      for (let i = n; i >= 0; i--) { const y = y0 + ((y1 - y0) * i) / n; ctx.lineTo(ex(y) - 0.4, y); }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    mound(ctx, t.x - 2, half + 17, 9 + W.drift * 3, W);
  }

  function crown(ctx, t, season, g) {
    if (t.kind === 'limba') { ZS.alpineArt.limbaCrown(ctx, t, season, g); return; }
    if (cold(g)) { winterCrown(ctx, t, g); return; }
    const key = keyOf(g, season);
    if (t.kind === 'smrek') {
      const base = GY - t.h * 0.3, top = GY - t.h, n = 4;
      ctx.fillStyle = t.shade < 0.5 ? '#2c5a37' : '#336540';
      for (let i = 0; i < n; i++) {
        const y0 = base - ((base - top) * i) / n, hw = t.r * (1 - i / (n + 0.8));
        const ln = t.lean || 0, sx = t.x + ln * (i + 1) * 7;
        ctx.beginPath(); ctx.moveTo(sx - hw * (1 - ln * 0.6), y0 + ln * 4); ctx.lineTo(sx + ln * 6, y0 - ((base - top) / n) * 1.7); ctx.lineTo(sx + hw * (1 + ln * 0.35), y0 - ln * 3);
        ctx.closePath(); ctx.fill();
      }
      return;
    }
    const r = t.r, cy = GY - t.h - (t.kind === 'jablon' ? 26 : 0);
    ctx.fillStyle = t.kind === 'breza' ? BREZA[key] || BREZA.spring : t.kind === 'jablon' ? '#5aa548' : BUK[key] || BUK.spring;
    circle(ctx, t.x, cy - r * 0.35, r);
    circle(ctx, t.x - r * 0.72, cy + r * 0.05, r * 0.66);
    circle(ctx, t.x + r * 0.7, cy, r * 0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    circle(ctx, t.x + r * 0.35, cy + r * 0.05, r * 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    circle(ctx, t.x - r * 0.3, cy - r * 0.6, r * 0.42);
    if (t.kind === 'jablon') {
      ctx.fillStyle = '#d63a2f';
      [[-30, -10], [12, -40], [34, 6], [-8, 14], [-44, -36]].forEach(([dx, dy]) => circle(ctx, t.x + dx, cy + dy, 6));
    }
  }

  function tree(ctx, t, season, g) { trunk(ctx, t, g); crown(ctx, t, season, g); }

  function winterCrown(ctx, t, g) {
    const W = B.look(g);
    if (t.kind === 'smrek') spruce(ctx, t, W, g.time);
    else bare(ctx, t, W);
  }

  function spruce(ctx, t, W, time) {
    const base = GY - t.h * 0.3, top = GY - t.h, n = 4, s = (base - top) / n, sd = t.x * 0.131;
    const dark = t.shade < 0.5 ? W.spruce : W.spruce2, e = 0.36 + 0.68 * (1 - W.cap);
    for (let i = 0; i < n; i++) {
      const y0 = base - s * i, hw = t.r * (1 - i / (n + 0.8)), th = s * 1.7;
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(t.x - hw, y0); ctx.lineTo(t.x, y0 - th); ctx.lineTo(t.x + hw, y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.moveTo(t.x - hw, y0); ctx.lineTo(t.x + hw, y0); ctx.lineTo(t.x + hw * 0.86, y0 - s * 0.2); ctx.lineTo(t.x - hw * 0.86, y0 - s * 0.2); ctx.closePath(); ctx.fill();
      const edge = i === n - 1 ? y0 - s * (e + 0.1) : y0 - s * e;
      snowCap(ctx, t.x, y0, hw, th, edge, Math.max(3, Math.round(hw / 13)), sd + i * 3.1, W, 0.4);
      ctx.fillStyle = W.snow;
      oval(ctx, t.x - hw + 5, y0 - 2, 4 + W.cap * 2, 2.6, -0.3); oval(ctx, t.x + hw - 5, y0 - 2, 4 + W.cap * 2, 2.6, 0.3);
      if (t.xmas) garland(ctx, t, i, y0, hw, s, time);
    }
    if (t.xmas) star(ctx, t.x, top - 3, time);
  }

  function garland(ctx, t, i, y0, hw, s, time) {
    const xa = t.x - hw * 0.66, ya = y0 - s * 0.7, xb = t.x + hw * 0.8, yb = y0 - s * 0.12, cx = (xa + xb) / 2, cy = (ya + yb) / 2 + s * 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.quadraticCurveTo(cx, cy, xb, yb); ctx.stroke();
    ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xa, ya - 0.8); ctx.quadraticCurveTo(cx, cy - 0.8, xb, yb - 0.8); ctx.stroke();
    ctx.restore();
    const m = Math.max(3, Math.round(hw / 16));
    for (let j = 0; j < m; j++) {
      const u = (j + 0.5) / m, v = 1 - u, bx = v * v * xa + 2 * u * v * cx + u * u * xb, by = v * v * ya + 2 * u * v * cy + u * u * yb + 2.6;
      const col = BULB[(i * 3 + j) % BULB.length], tw = 0.6 + 0.4 * Math.sin(time * (1.6 + hash(i * 7 + j) * 1.8) + i * 2.1 + j * 1.7);
      ctx.globalAlpha = 0.18 + 0.22 * tw; ctx.fillStyle = col; circle(ctx, bx, by, 7.5);
      ctx.globalAlpha = 1; circle(ctx, bx, by, 3.1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.5 * tw).toFixed(3) + ')'; circle(ctx, bx - 0.9, by - 0.9, 1.2);
    }
  }

  function star(ctx, x, y, time) {
    const p = 0.75 + 0.25 * Math.sin(time * 1.7);
    ctx.fillStyle = 'rgba(255,224,120,' + (0.22 * p).toFixed(3) + ')'; circle(ctx, x, y, 26);
    ctx.fillStyle = 'rgba(255,234,150,' + (0.3 * p).toFixed(3) + ')'; circle(ctx, x, y, 15);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 5.4 : 13;
      if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffcf3f'; ctx.fill();
    ctx.strokeStyle = '#b8801a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x - 2.4, y - 3); ctx.lineTo(x, y - 1); ctx.closePath(); ctx.fill();
    const gl = Math.pow(Math.max(0, Math.sin(time * 0.9 + 1)), 12);
    if (gl > 0.02) {
      ctx.fillStyle = 'rgba(255,255,255,' + gl.toFixed(3) + ')';
      ctx.fillRect(x - 20 * gl - 2, y - 0.6, 40 * gl + 4, 1.2); ctx.fillRect(x - 0.6, y - 20 * gl - 2, 1.2, 40 * gl + 4);
    }
  }

  const BARE = {
    buk: { depth: 5, fork: 3, third: 0.45, spread: 1.0, jitter: 0.3, kink: 0.18, taper: 0.6, shrink: 0.64, min: 0.8, snowDepth: 2, droop: 9, sag: 0, limit: 1.2 },
    breza: { depth: 5, fork: 2, third: 0.55, spread: 0.62, jitter: 0.22, kink: 0.14, taper: 0.6, shrink: 0.7, min: 0.65, snowDepth: 1, droop: 3, sag: 0.62, limit: 2.8 },
    jablon: { depth: 4, fork: 3, third: 0.55, spread: 1.35, jitter: 0.55, kink: 0.5, taper: 0.6, shrink: 0.66, min: 0.9, snowDepth: 2, droop: 9, sag: 0, limit: 1.6 },
  };
  const bareGeo = new WeakMap();
  function bareOf(t) {
    let geo = bareGeo.get(t);
    if (geo) return geo;
    const o = BARE[t.kind] || BARE.buk, top = GY - t.h;
    if (t.kind === 'jablon') geo = B.grow(Math.round(t.x * 3.7) + 5, t.x, top + 8, t.w * 0.46, 34, o);
    else if (t.kind === 'breza') geo = B.grow(Math.round(t.x * 3.7) + 5, t.x, top + 6, t.w * 0.62, t.r * 0.55, o);
    else geo = B.grow(Math.round(t.x * 3.7) + 5, t.x, top + 12, t.w * 0.44, t.r * 0.46, o);
    bareGeo.set(t, geo);
    return geo;
  }

  function bare(ctx, t, W) {
    const geo = bareOf(t), bark = dk(BARK[t.kind] || BARK.buk, W.bark), twig = dk(TWIG[t.kind] || TWIG.buk, W.bark + 0.1);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const top = GY - t.h, half = t.w / 2 - 2, w0 = geo.w[0] / 2, f = geo.line.length;
    ctx.fillStyle = bark;
    ctx.beginPath(); ctx.moveTo(t.x - half, top + 1); ctx.quadraticCurveTo(t.x - w0 * 1.2, top - 4, t.x - w0, top - 14);
    ctx.lineTo(t.x + w0, top - 14); ctx.quadraticCurveTo(t.x + w0 * 1.2, top - 4, t.x + half, top + 1); ctx.closePath(); ctx.fill();
    for (let d = 0; d < f; d++) {
      ctx.strokeStyle = d < 2 ? bark : t.kind === 'breza' && d < 3 ? dk('#d9d4ca', W.bark) : twig;
      ctx.lineWidth = geo.w[d]; ctx.stroke(geo.line[d]);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = geo.w[0] * 0.35;
    ctx.save(); ctx.translate(geo.w[0] * 0.25, 0); ctx.stroke(geo.line[0]); ctx.restore();
    ctx.strokeStyle = W.snow; ctx.globalAlpha = Math.min(1, W.cap * 1.05);
    for (let d = 0; d <= Math.min(f - 1, 2); d++) { ctx.lineWidth = Math.max(1.1, Math.min(2.8, geo.w[d] * 0.24)); ctx.stroke(geo.snow[d]); }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (t.kind === 'jablon') {
      const tp = geo.tips;
      for (let i = 0, k = 0; i < tp.length && k < 5; i += 2) {
        if (hash(tp[i] * 0.7 + tp[i + 1]) < 0.72) continue;
        k++;
        const ax = tp[i], ay = tp[i + 1] + 7;
        ctx.strokeStyle = '#4a3526'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(tp[i], tp[i + 1]); ctx.lineTo(ax, ay - 3.5); ctx.stroke();
        ctx.fillStyle = '#7f2a22'; circle(ctx, ax, ay, 4.2);
        ctx.fillStyle = 'rgba(40,10,8,0.35)'; circle(ctx, ax + 1.3, ay + 1, 2.8);
        ctx.fillStyle = 'rgba(225,240,255,0.75)'; ctx.beginPath(); ctx.arc(ax, ay, 4.2, -2.7, -1.1); ctx.lineTo(ax, ay - 1.5); ctx.closePath(); ctx.fill();
      }
    }
  }

  function house(ctx, h, g) {
    const x0 = h.x - h.w / 2, top = GY - 112, o = g && g.knock ? g.knock.list.find((q) => q.h === h) : null;
    if (cold(g)) { winterHouse(ctx, h, x0, top, B.look(g), g.time, o, g); return; }
    ctx.fillStyle = '#efe3c8'; ctx.fillRect(x0, top, h.w, 112);
    ctx.fillStyle = '#8d3f2d'; ctx.fillRect(h.x + h.w * 0.22, top - 54, 14, 32);
    ctx.fillStyle = '#b5543c';
    ctx.beginPath(); ctx.moveTo(x0 - 14, top + 4); ctx.lineTo(h.x, top - 62); ctx.lineTo(x0 + h.w + 14, top + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 18, top + 28, 36, 32); ctx.fillRect(x0 + h.w - 54, top + 28, 36, 32);
    ctx.fillStyle = '#a8d4ef'; ctx.fillRect(x0 + 21, top + 31, 30, 26); ctx.fillRect(x0 + h.w - 51, top + 31, 30, 26);
    ctx.fillStyle = '#7a4b2a'; ctx.fillRect(h.x - 15, GY - 54, 30, 54);
    windows(ctx, h, x0, top, o, g, '#3d6b4f');
  }

  const PEEK = { look: '', x: 0, y: 0, face: 1, up: 0, stand: 0, act: 'peek', k: 0, kind: 'local', seed: 0, scale: 0.8, clip: null };
  function peeker(ctx, o, x, y, g) {
    const T = ZS.sim.knock.T, t = o.t, b = g.bear;
    const up = sstep(T.open + 0.05, T.open + 0.3, t) * (1 - sstep(T.slam - 0.3, T.slam - 0.1, t)) * (o.who === 'kid' ? 1 - sstep(2.05, 2.25, t) : 1);
    if (up <= 0.001) return;
    const P = PEEK;
    P.look = o.who; P.x = x + 18; P.y = y + 29; P.face = Math.sign(b.x - P.x) || 1; P.up = up; P.seed = o.h.x; P.k = 0;
    P.clip = [x + 3, y + 3, 30, 26];
    if (t < T.scare) P.act = 'peek';
    else if (o.who === 'granny') P.act = 'pin';
    else if (o.who === 'man' && t < T.act + 0.25) { P.act = 'throw'; P.k = (t - T.scare) / (T.act + 0.01 - T.scare) * 0.55; }
    else P.act = 'alarm';
    ZS.drawGuestBust(ctx, P, g.time);
  }
  function leaf(ctx, hx, dir, w, y, col) {
    const p = Math.max(0, 18 - w) * 0.16;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(hx, y); ctx.lineTo(hx + dir * w, y - p); ctx.lineTo(hx + dir * w, y + 32 + p); ctx.lineTo(hx, y + 32); ctx.closePath(); ctx.fill();
    if (w < 3) return;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 1; i < 3; i++) ctx.fillRect(hx + dir * w * i / 3 - 0.5, y + 1, 1, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(Math.min(hx, hx + dir * w), y + 15, w, 1.4);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(Math.min(hx, hx + dir * w * 0.6), y + 5, w * 0.6, 1.6); ctx.fillRect(Math.min(hx, hx + dir * w * 0.6), y + 25, w * 0.6, 1.6);
    if (w > 12) {
      const cx = hx + dir * w * 0.5, cy = y + 10;
      ctx.fillStyle = 'rgba(30,18,10,0.75)';
      ctx.beginPath(); ctx.moveTo(cx, cy + 3); ctx.bezierCurveTo(cx - 4, cy, cx - 2.6, cy - 3, cx, cy - 1.2); ctx.bezierCurveTo(cx + 2.6, cy - 3, cx + 4, cy, cx, cy + 3); ctx.fill();
    }
  }
  function casement(ctx, x, y, a) {
    const w = 15 * (1 - a * 0.8);
    ctx.fillStyle = 'rgba(40,24,14,0.92)'; ctx.fillRect(x + 3, y + 3, 30, 26);
    ctx.fillStyle = 'rgba(255,190,110,0.28)'; ctx.fillRect(x + 3, y + 3, 30, 26);
    return w;
  }
  function windows(ctx, h, x0, top, o, g, col) {
    const T = ZS.sim.knock.T;
    for (const side of [-1, 1]) {
      const x = side < 0 ? x0 + 18 : x0 + h.w - 54, y = top + 28, t = o ? o.t : 0;
      const live = !!o && (o.mode === 'peek' || o.mode === 'knock') && o.side === side && t >= T.open && t < T.slam;
      if (live) {
        const a = sstep(T.open, T.open + 0.2, t) * (1 - sstep(T.slam - 0.12, T.slam, t)), w = casement(ctx, x, y, a);
        peeker(ctx, o, x, y, g);
        ctx.fillStyle = 'rgba(214,236,250,0.75)'; ctx.fillRect(x + 3, y + 3, w, 26); ctx.fillRect(x + 33 - w, y + 3, w, 26);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 3 + w - 1.4, y + 3, 1.4, 26); ctx.fillRect(x + 33 - w, y + 3, 1.4, 26);
      }
      const shut = o ? (o.shut ? 1 : sstep(T.slam - 0.14, T.slam, t) * (o.mode === 'peek' ? 1 : 0)) : 0;
      const w = 4 + 14 * shut;
      leaf(ctx, x, shut > 0 ? 1 : -1, shut > 0 ? 18 * shut : 4, y, shut > 0 ? col : dk(col, 0.8));
      leaf(ctx, x + 36, shut > 0 ? -1 : 1, shut > 0 ? 18 * shut : 4, y, shut > 0 ? col : dk(col, 0.8));
      if (shut <= 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 17.4, y, 1.2 * shut, 32);
      if (w > 17) { ctx.fillStyle = '#c9a64a'; circle(ctx, x + 18, y + 16, 1.2); }
    }
  }

  function smoke(ctx, x, y, time, sd, W) {
    const drift = 44 - 28 * W.sun, rise = 90 + 34 * W.sun;
    for (let i = 0; i < 7; i++) {
      const u = frac(time * 0.12 + i / 7 + sd);
      const a = (0.46 - 0.12 * W.wet) * sstep(0, 0.1, u) * (1 - sstep(0.42, 1, u));
      ctx.fillStyle = 'rgba(232,234,236,' + a.toFixed(3) + ')';
      circle(ctx, x + Math.sin(u * 6 + sd * 9) * 4 * u + u * u * drift, y - u * rise, 3.6 + u * 12);
    }
  }

  function winterHouse(ctx, h, x0, top, W, time, o, g) {
    const sd = h.x * 0.017, cx = h.x + h.w * 0.22;
    ctx.fillStyle = '#ece0c6'; ctx.fillRect(x0, top, h.w, 112);
    ctx.fillStyle = 'rgba(60,40,30,0.13)'; ctx.fillRect(x0, top, h.w, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(x0 + h.w * 0.62, top, h.w * 0.38, 112);
    ctx.fillStyle = '#8d3f2d'; ctx.fillRect(cx, top - 54, 14, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(cx + 9, top - 54, 5, 32);
    ctx.fillStyle = W.snow; rrect(ctx, cx - 2.5, top - 60, 19, 7.5, 3.5);
    ctx.fillStyle = W.snowShade; ctx.fillRect(cx - 1, top - 54.5, 16, 1.4);
    smoke(ctx, cx + 7, top - 62, time, frac(sd), W);
    ctx.fillStyle = '#a94e38';
    ctx.beginPath(); ctx.moveTo(x0 - 14, top + 4); ctx.lineTo(h.x, top - 62); ctx.lineTo(x0 + h.w + 14, top + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.moveTo(h.x, top - 62); ctx.lineTo(x0 + h.w + 14, top + 4); ctx.lineTo(h.x, top + 4); ctx.closePath(); ctx.fill();
    const hw = h.w / 2 + 14;
    snowCap(ctx, h.x, top + 4, hw, 66, top - 22 + 12 * (1 - W.cap), Math.max(4, Math.round(h.w / 30)), sd * 13, W, 0.55);
    ctx.fillStyle = W.snow;
    oval(ctx, x0 - 13, top + 2.5, 6, 3.4, 0.5); oval(ctx, x0 + h.w + 13, top + 2.5, 6, 3.4, -0.5);
    icicles(ctx, x0 - 12, x0 + h.w + 12, top + 5, 13, sd * 31, W, time);
    win(ctx, x0 + 18, top + 28, time, sd, W);
    win(ctx, x0 + h.w - 54, top + 28, time, sd + 0.37, W);
    if (g) windows(ctx, h, x0, top, o, g, '#6b4a2e');
    ctx.fillStyle = '#6e4325'; ctx.fillRect(h.x - 15, GY - 54, 30, 54);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(h.x - 15, GY - 54, 30, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(h.x - 11, GY - 50, 9, 46);
    ctx.fillStyle = '#d4b24a'; circle(ctx, h.x + 9, GY - 26, 1.8);
    wreath(ctx, h.x, GY - 38);
    bank(ctx, x0 - 6, x0 + h.w + 6, 9 + 4 * W.drift, sd * 7, W);
  }

  function win(ctx, x, y, time, sd, W) {
    const fl = 0.82 + 0.1 * Math.sin(time * 1.3 + sd * 20) + 0.06 * Math.sin(time * 4.7 + sd * 9);
    ctx.fillStyle = 'rgba(255,196,110,0.16)'; ctx.fillRect(x - 6, y - 5, 48, 44);
    ctx.fillStyle = '#fbf7ee'; ctx.fillRect(x, y, 36, 32);
    ctx.fillStyle = '#e9a948'; ctx.fillRect(x + 3, y + 3, 30, 26);
    ctx.fillStyle = 'rgba(255,236,170,' + (0.78 * fl).toFixed(3) + ')'; ctx.fillRect(x + 6, y + 6, 24, 20);
    ctx.fillStyle = 'rgba(176,82,40,0.45)';
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 12, y + 3); ctx.quadraticCurveTo(x + 6, y + 12, x + 3, y + 26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 33, y + 3); ctx.lineTo(x + 24, y + 3); ctx.quadraticCurveTo(x + 30, y + 12, x + 33, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fbf7ee'; ctx.fillRect(x + 17, y + 3, 2, 26); ctx.fillRect(x + 3, y + 13, 30, 2);
    ctx.fillStyle = W.snow; rrect(ctx, x - 3, y + 30.5, 42, 5, 2.5);
    ctx.fillStyle = W.snowShade; ctx.fillRect(x - 2, y + 34, 40, 1.2);
  }

  function wreath(ctx, x, y) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2e5e33'; ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3f7a43'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, c = Math.cos(a), s = Math.sin(a); ctx.moveTo(x + c * 5.6, y + s * 5.6); ctx.lineTo(x + c * 9.6 - s * 1.6, y + s * 9.6 + c * 1.6); }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#d2302a';
    for (const a of [-2.4, -0.9, 0.5, 2.1]) circle(ctx, x + Math.cos(a) * 7.4, y + Math.sin(a) * 7.4, 1.4);
    ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x - 5, y + 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x + 5, y + 10); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 2.6, y + 7, 1.6, 6); ctx.fillRect(x + 1, y + 7, 1.6, 6);
    ctx.fillStyle = '#a3221d'; circle(ctx, x, y + 7, 1.8);
  }

  const RUNGS = [25, 50, 75, 100, 125];
  function post(ctx, p, g) {
    const top = GY - 150, W = cold(g) ? B.look(g) : null, time = g ? g.time : 0;
    const sway = Number.isFinite(p.sway) ? p.sway : 0, k = Number.isFinite(p.shake) ? Math.max(0, Math.min(1, p.shake)) : 0;
    const ang = sway ? Math.asin(Math.max(-0.5, Math.min(0.5, sway / 186))) : 0;
    const rj = k ? Math.sin(time * 53 + p.x) * 1.2 * k : 0, bj = (i) => (k ? Math.sin(time * 61 + i * 1.9) * 0.9 * k : 0);
    if (ang) { ctx.save(); ctx.translate(p.x, GY); ctx.rotate(ang); ctx.translate(-p.x, -GY); }
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x - 40, GY); ctx.lineTo(p.x - 26, top); ctx.moveTo(p.x + 40, GY); ctx.lineTo(p.x + 26, top);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = GY - 30, i = 0; y > top; y -= 40, i++) { ctx.moveTo(p.x - 36, y + bj(i)); ctx.lineTo(p.x + 36, y - 20 - bj(i)); }
    ctx.stroke();
    if (W) {
      ctx.strokeStyle = W.snow; ctx.lineWidth = 2; ctx.globalAlpha = W.cap;
      ctx.beginPath();
      for (let y = GY - 30, i = 0; y > top; y -= 40, i++) { ctx.moveTo(p.x - 34, y - 3.2 + bj(i)); ctx.lineTo(p.x + 34, y - 22.4 - bj(i)); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(p.x - 36, top - 4, 72, 8);
    ctx.fillStyle = '#7a5534'; ctx.fillRect(p.x - 30, top - 54, 60, 50);
    ctx.fillStyle = '#2a1d12'; ctx.fillRect(p.x - 23, top - 45, 46, 18);
    ctx.fillStyle = '#4a321c';
    ctx.beginPath(); ctx.moveTo(p.x - 40, top - 52 + rj); ctx.lineTo(p.x, top - 78 + rj); ctx.lineTo(p.x + 40, top - 52 + rj); ctx.closePath(); ctx.fill();
    if (W) {
      const sd = p.x * 0.07;
      ctx.fillStyle = W.snow; rrect(ctx, p.x - 38, top - 8.5, 76, 6, 3);
      ctx.fillStyle = W.snowShade; ctx.fillRect(p.x - 36, top - 4, 72, 1.2);
      ctx.fillStyle = W.snow; rrect(ctx, p.x - 32, top - 31.5, 64, 4.5, 2.2);
      snowCap(ctx, p.x, top - 52 + rj, 40, 26, top - 59 + 4 * (1 - W.cap) + rj, 3, sd, W, 0.5);
      ctx.fillStyle = W.snow;
      oval(ctx, p.x - 40, top - 53 + rj, 4.5, 2.6, 0.5); oval(ctx, p.x + 40, top - 53 + rj, 4.5, 2.6, -0.5);
      icicles(ctx, p.x - 40, p.x - 23, top - 51.5 + rj, 9, sd * 3, W, time);
      icicles(ctx, p.x + 23, p.x + 40, top - 51.5 + rj, 9, sd * 5, W, time);
    }
    ladder(ctx, p.x, top, W, k, time);
    if (ang) ctx.restore();
    if (W) {
      mound(ctx, p.x - 40, 13, 6 + W.drift * 2, W);
      mound(ctx, p.x + 40, 13, 6 + W.drift * 2, W);
    }
    if (k > 0.01) shed(ctx, p, ang, W, k, time);
  }

  function ladder(ctx, x, top, W, k, time) {
    const rx = (y) => 9.5 - ((GY - y) / 150) * 0.8;
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(x - rx(GY), GY + 1); ctx.lineTo(x - rx(top - 12), top - 12); ctx.moveTo(x + rx(GY), GY + 1); ctx.lineTo(x + rx(top - 12), top - 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,180,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - rx(GY) - 0.8, GY); ctx.lineTo(x - rx(top - 12) - 0.8, top - 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.24)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const h of RUNGS) { const y = GY - h + 1.8, r = rx(y); ctx.moveTo(x - r + 1.4, y); ctx.lineTo(x + r - 1.4, y); }
    ctx.stroke();
    ctx.strokeStyle = '#80593a'; ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < RUNGS.length; i++) {
      const y = GY - RUNGS[i] + (k ? Math.sin(time * 71 + i * 2.3) * 0.5 * k : 0), r = rx(y) + 2.2;
      ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    }
    ctx.stroke();
    if (!W) return;
    ctx.strokeStyle = W.snow; ctx.lineWidth = 1.7; ctx.globalAlpha = W.cap;
    ctx.beginPath();
    for (const h of RUNGS) { const y = GY - h - 1.9, r = rx(y) + 1.4; ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = W.snow;
    oval(ctx, x - rx(top - 12), top - 13.2, 2.4, 1.5, 0); oval(ctx, x + rx(top - 12), top - 13.2, 2.4, 1.5, 0);
  }

  const LEAVES = ['#7a5a34', '#5f7d3c', '#9a7b4f', '#4f6b34'];
  function shed(ctx, p, ang, W, k, time) {
    const s = Math.sin(ang), c = Math.cos(ang);
    for (let i = 0; i < 8; i++) {
      const h = hash(p.x * 0.013 + i * 1.37), u = frac(time * (0.9 + h * 0.5) + i / 8 + h);
      const lx = (hash(i * 2.9 + p.x) - 0.5) * 78, ly = i % 3 ? -202 : -152;
      const ox = p.x + lx * c - ly * s, oy = GY + lx * s + ly * c;
      const x = ox + (hash(i * 5.3 + 1) - 0.5) * 30 * u, y = oy + u * u * (GY - 3 - oy);
      const a = k * sstep(0, 0.07, u) * (1 - sstep(0.78, 1, u));
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      if (W) {
        const r = 1.4 + h * 2.4;
        ctx.fillStyle = W.snowShade; circle(ctx, x + 0.4, y + 0.6, r);
        ctx.fillStyle = W.snow; circle(ctx, x, y, r * 0.92);
      } else {
        ctx.fillStyle = LEAVES[i % LEAVES.length];
        oval(ctx, x, y, 2.6 + h * 1.4, 0.9 + 0.6 * Math.abs(Math.sin(time * 7 + i)), time * (3 + h * 4) + i);
      }
    }
    if (W) {
      for (let i = 0; i < 3; i++) {
        const u = frac(time * 1.4 + i / 3), lx = (i - 1) * 30, ly = -206, r = 6 + u * 16;
        const ox = p.x + lx * c - ly * s, oy = GY + lx * s + ly * c + u * 12, a = 0.45 * k * Math.sin(Math.PI * u);
        const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        gr.addColorStop(0, 'rgba(250,252,255,' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(250,252,255,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function log(ctx, lg, g) {
    ctx.fillStyle = '#7a5534'; rrect(ctx, lg.x - lg.w / 2, GY - lg.h, lg.w, lg.h, lg.h / 2);
    ctx.fillStyle = '#c9a77a'; circle(ctx, lg.x + lg.w / 2 - lg.h / 2, GY - lg.h / 2, lg.h / 2 - 3);
    ctx.strokeStyle = '#9c7b52'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lg.x + lg.w / 2 - lg.h / 2, GY - lg.h / 2, lg.h / 4, 0, Math.PI * 2); ctx.stroke();
    if (!cold(g)) return;
    const W = B.look(g), x0 = lg.x - lg.w / 2 + lg.h * 0.2, x1 = lg.x + lg.w / 2 - lg.h * 0.5, y = GY - lg.h, sd = lg.x * 0.03, th = 3 + 4 * W.cap;
    ctx.fillStyle = 'rgba(40,24,12,0.18)'; ctx.fillRect(lg.x - lg.w / 2 + lg.h * 0.3, y + 2, lg.w - lg.h * 0.8, 3);
    for (let pass = 0; pass < 2; pass++) {
      const o = pass ? 0 : 1.4;
      ctx.fillStyle = pass ? W.snow : W.snowShade;
      ctx.beginPath(); ctx.moveTo(x0 - 3 + o, y + 3 + o);
      ctx.quadraticCurveTo(x0 - 3 + o, y - th + o, x0 + 8 + o, y - th + o);
      const n = Math.max(2, Math.round((x1 - x0) / 30));
      for (let i = 0; i < n; i++) {
        const xa = x0 + 8 + ((x1 - x0 - 8) * i) / n, xb = x0 + 8 + ((x1 - x0 - 8) * (i + 1)) / n;
        ctx.quadraticCurveTo((xa + xb) / 2 + o, y - th - 2.4 * hash(sd + i) + o, xb + o, y - th + 0.5 + o);
      }
      ctx.quadraticCurveTo(x1 + 5 + o, y - th + o, x1 + 5 + o, y + 2 + o);
      for (let i = 4; i >= 0; i--) ctx.lineTo(x0 + ((x1 - x0) * i) / 4 + o, y + 2 + (i % 2) * 2.2 + o);
      ctx.closePath(); ctx.fill();
    }
    const ex = lg.x + lg.w / 2 - lg.h / 2;
    ctx.fillStyle = W.snow;
    ctx.beginPath(); ctx.ellipse(ex, GY - lg.h + 1.5, lg.h * 0.32, 2.4 + W.cap * 1.4, 0, Math.PI, TAU); ctx.fill();
    bank(ctx, lg.x - lg.w / 2 - 4, lg.x + lg.w / 2 + 2, 5 + W.drift * 2, sd, W);
  }

  function sign(ctx, s, g) {
    const W = cold(g) ? B.look(g) : null;
    ctx.fillStyle = '#5a3d22';
    if (s.billboard) {
      const L = W && LABELS.billboardWinter ? LABELS.billboardWinter : LABELS.billboard;
      ctx.fillRect(s.x - 72, GY - 72, 8, 72); ctx.fillRect(s.x + 64, GY - 72, 8, 72);
      ctx.fillStyle = '#fff8e6'; ctx.fillRect(s.x - 100, GY - 176, 200, 106);
      ctx.strokeStyle = '#3b3b3b'; ctx.lineWidth = 3; ctx.strokeRect(s.x - 100, GY - 176, 200, 106);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(s.x - 100, GY - 176, 200, 8);
      label(ctx, L[0], s.x, GY - 146, 18, '#1d1d1d', 700, 184);
      label(ctx, L[1], s.x, GY - 122, 18, '#1d1d1d', 700, 184);
      label(ctx, LABELS.signs.by, s.x, GY - 92, 12, '#555', 500, 184);
      if (!W) return;
      const sd = s.x * 0.01;
      ctx.fillStyle = W.snowShade; rrect(ctx, s.x - 103, GY - 181, 207, 8, 4);
      ctx.fillStyle = W.snow; rrect(ctx, s.x - 104, GY - 183, 206, 8, 4);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const bx = s.x - 92 + i * 37 + hash(sd + i) * 8; ctx.moveTo(bx + 14, GY - 181); ctx.ellipse(bx, GY - 181, 14, 3 + hash(sd + i * 2) * 2.4, 0, Math.PI, TAU); }
      ctx.fill();
      icicles(ctx, s.x - 98, s.x + 98, GY - 68.5, 7, sd * 9, W, g.time);
      mound(ctx, s.x - 68, 14, 7 + W.drift * 2, W);
      mound(ctx, s.x + 68, 14, 7 + W.drift * 2, W);
      return;
    }
    ctx.fillRect(s.x - 3, GY - 62, 6, 62);
    const kw = s.key ? ZS.prompt.width(ctx, g, s.key, 19) + 7 : 0;
    ctx.font = '700 14px system-ui, sans-serif';
    const tw = ctx.measureText(s.text).width, bw = Math.max(124, tw + kw + 22);
    ctx.fillStyle = '#2f5d3a'; ctx.fillRect(s.x - bw / 2, GY - 88, bw, 28);
    if (s.key) ZS.prompt.cap(ctx, g, s.key, s.x - (tw + kw) / 2, GY - 74, 19, false);
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.text, s.x + kw / 2, GY - 74);
    if (!W) return;
    const sd = s.x * 0.01;
    ctx.fillStyle = W.snowShade; rrect(ctx, s.x - bw / 2 - 1, GY - 91, bw + 3, 5, 2.5);
    ctx.fillStyle = W.snow; rrect(ctx, s.x - bw / 2 - 2.5, GY - 92.5, bw + 4, 5.5, 2.75);
    ctx.beginPath();
    const n = Math.max(2, Math.round(bw / 40));
    for (let i = 0; i < n; i++) { const bx = s.x - bw / 2 + (i + 0.5) * (bw / n) + (hash(sd + i) - 0.5) * 10; ctx.moveTo(bx + 11, GY - 91); ctx.ellipse(bx, GY - 91, 11, 2 + hash(sd + i * 3) * 2.2, 0, Math.PI, TAU); }
    ctx.fill();
    mound(ctx, s.x, 12, 6 + W.drift * 2, W);
  }

  function den(ctx, x, glow, name, time, g) {
    if (cold(g)) { winterDen(ctx, x, glow, name, time, B.look(g)); return; }
    ctx.fillStyle = '#6d5a46';
    ctx.beginPath(); ctx.moveTo(x - 150, GY); ctx.quadraticCurveTo(x, GY - 230, x + 150, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#241a12';
    ctx.beginPath(); ctx.moveTo(x - 40, GY); ctx.arc(x, GY, 40, Math.PI, 0); ctx.closePath(); ctx.fill();
    if (glow) {
      ctx.strokeStyle = 'rgba(255,215,90,' + (0.5 + 0.4 * Math.sin(time * 5)) + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, GY, 48, Math.PI, 0); ctx.stroke();
    }
    label(ctx, name, x, GY - 135, 15);
  }

  const DY = (u) => GY - 460 * u * (1 - u);
  function winterDen(ctx, x, glow, name, time, W) {
    const sd = x * 0.011;
    ctx.fillStyle = '#5f4e3f';
    ctx.beginPath(); ctx.moveTo(x - 150, GY); ctx.quadraticCurveTo(x, GY - 230, x + 150, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.moveTo(x + 8, GY - 114); ctx.quadraticCurveTo(x + 75, GY - 115, x + 150, GY); ctx.lineTo(x + 40, GY); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const u = 0.12 + i * 0.12 + hash(sd + i) * 0.05, rx = 5 + hash(sd + i * 3) * 7, sx = x - 150 + 300 * u, sy = DY(u) + 30 + hash(sd + i * 5) * 40;
      if (Math.abs(sx - x) < 52 && sy > GY - 56) continue;
      ctx.fillStyle = 'rgba(30,22,16,0.22)'; ctx.beginPath(); ctx.ellipse(sx + 1, sy + 1.2, rx, rx * 0.58, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a6a5b'; ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(sx - rx * 0.25, sy - rx * 0.2, rx * 0.5, rx * 0.22, 0, 0, TAU); ctx.fill();
    }
    for (let pass = 0; pass < 2; pass++) {
      const o = pass ? 0 : 1.8;
      ctx.fillStyle = pass ? W.snow : W.snowShade;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const u = 0.02 + (k / 24) * 0.96, X = x - 150 + 300 * u + o, Y = DY(u) - 3.5 - 2 * Math.sin(Math.PI * u) + o * 0.6;
        if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      }
      for (let k = 24; k >= 0; k--) {
        const u = 0.02 + (k / 24) * 0.96, sp = Math.sin(Math.PI * u);
        const th = (8 + 30 * sp * sp) * (0.55 + 0.45 * W.cap) + 5 * Math.sin(u * 31 + sd) * sp + (k % 2 ? 3.5 * sp : 0);
        ctx.lineTo(x - 150 + 300 * u + o, DY(u) + th + o);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = W.snow;
    oval(ctx, x - 100, DY(0.17) + 22, 11, 4, -0.6); oval(ctx, x + 92, DY(0.81) + 26, 9, 3.4, 0.6);
    ctx.fillStyle = '#1f1610';
    ctx.beginPath(); ctx.moveTo(x - 40, GY); ctx.arc(x, GY, 40, Math.PI, 0); ctx.closePath(); ctx.fill();
    const p = 0.5 + 0.4 * Math.sin(time * 5);
    if (glow) {
      const r = ctx.createRadialGradient(x, GY - 6, 2, x, GY - 6, 40);
      r.addColorStop(0, 'rgba(255,196,96,' + (0.55 * p + 0.2).toFixed(3) + ')'); r.addColorStop(1, 'rgba(255,170,70,0)');
      ctx.fillStyle = r; ctx.beginPath(); ctx.moveTo(x - 40, GY); ctx.arc(x, GY, 40, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,205,110,' + (0.32 * p).toFixed(3) + ')'; ellipse(ctx, x, GY + 4, 64, 6);
    }
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? W.snow : W.snowShade;
      ctx.beginPath(); ctx.moveTo(x - 31, GY - 25 + pass * -1.5);
      ctx.quadraticCurveTo(x - 20, GY - 48 - pass * 1.5, x + 2, GY - 47 - pass * 1.5);
      ctx.quadraticCurveTo(x + 24, GY - 47 - pass * 1.5, x + 33, GY - 23 - pass * 1.5);
      ctx.quadraticCurveTo(x + 26, GY - 33, x + 14, GY - 37.5); ctx.quadraticCurveTo(x + 4, GY - 36, x - 4, GY - 39);
      ctx.quadraticCurveTo(x - 16, GY - 36, x - 31, GY - 25 + pass * -1.5); ctx.closePath(); ctx.fill();
    }
    const k = W.icicle;
    ctx.fillStyle = W.ice;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const h = hash(sd + i * 1.9), ix = x - 17 + i * 6.8 + (h - 0.5) * 3, iy = GY - 39 + Math.abs(i - 2.5) * 1.6, l = (4 + h * 11) * (0.3 + 0.7 * k);
      ctx.moveTo(ix - 1.4, iy); ctx.lineTo(ix + 1.4, iy); ctx.lineTo(ix + 0.2, iy + l); ctx.closePath();
    }
    ctx.fill();
    if (glow) {
      ctx.strokeStyle = 'rgba(70,40,10,' + (0.35 * p).toFixed(3) + ')'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(x, GY, 49, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,215,90,' + p.toFixed(3) + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, GY, 49, Math.PI, 0); ctx.stroke();
    }
    mound(ctx, x - 70, 30, 12 + W.drift * 3, W);
    mound(ctx, x + 66, 26, 10 + W.drift * 3, W);
    label(ctx, name, x, GY - 138, 15);
  }

  const shrubs = new WeakMap();
  function shrub(it, make) {
    let geo = shrubs.get(it);
    if (!geo) { geo = make(it.x, hash(it.x * 0.0131) * 97); shrubs.set(it, geo); }
    return geo;
  }

  function makeRose(x, sd) {
    const canes = new Path2D(), thorns = new Path2D(), snow = new Path2D(), hips = [];
    for (let k = 0; k < 7; k++) {
      const h = hash(sd + k * 1.3), side = k % 2 ? 1 : -1, bx = x + (k - 3) * 2.6, reach = side * (8 + h * 22), ht = 22 + hash(sd + k * 2.7) * 22;
      const cx = bx + reach * 0.25, cy = GY - ht * 1.35, ex = bx + reach, ey = GY - ht * 0.62;
      canes.moveTo(bx, GY + 1); canes.quadraticCurveTo(cx, cy, ex, ey);
      for (let j = 0; j < 3; j++) {
        const u = 0.38 + j * 0.17 + hash(sd + k + j) * 0.06, v = 1 - u, px = v * v * bx + 2 * u * v * cx + u * u * ex, py = v * v * (GY + 1) + 2 * u * v * cy + u * u * ey - 1.6;
        const r = 1.6 + hash(sd * 2 + k + j) * 1.6;
        snow.moveTo(px + r, py); snow.ellipse(px, py, r, r * 0.6, 0, 0, TAU);
      }
      for (let j = 1; j < 6; j++) {
        const u = j / 6, v = 1 - u, px = v * v * bx + 2 * u * v * cx + u * u * ex, py = v * v * (GY + 1) + 2 * u * v * cy + u * u * ey;
        thorns.moveTo(px, py); thorns.lineTo(px + side * 2.2, py - 1.4);
      }
      for (let j = 0; j < 2; j++) {
        const u = 0.72 + j * 0.24, v = 1 - u, px = v * v * bx + 2 * u * v * cx + u * u * ex, py = v * v * (GY + 1) + 2 * u * v * cy + u * u * ey;
        if (j === 0 && h < 0.4) continue;
        hips.push(px + side * 1.5, py + 4.2, side * 0.25);
      }
    }
    return { canes, thorns, snow, hips };
  }

  function hip(ctx, x, y, a, W) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = '#3b2418'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(0, -6.2); ctx.moveTo(-1.6, 4.1); ctx.lineTo(0, 5.4); ctx.lineTo(1.6, 4.1); ctx.stroke();
    ctx.fillStyle = '#d4352a'; ellipse(ctx, 0, 0, 3.3, 4.3);
    ctx.fillStyle = '#9b2118'; ellipse(ctx, 1.1, 1, 2, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ellipse(ctx, -1.2, -1.6, 0.9, 1.4);
    ctx.fillStyle = W.snow; ctx.globalAlpha = W.cap * 0.85; ellipse(ctx, -0.3, -3.6, 2.6, 1.2); ctx.globalAlpha = 1;
    ctx.restore();
  }

  function rosehip(ctx, it, time, g) {
    const W = B.look(g), geo = shrub(it, makeRose);
    mound(ctx, it.x, 24, 6 + W.drift * 2, W);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5b3124'; ctx.lineWidth = 2.3; ctx.stroke(geo.canes);
    ctx.strokeStyle = '#7d4634'; ctx.lineWidth = 1; ctx.stroke(geo.thorns);
    ctx.fillStyle = W.snow; ctx.globalAlpha = W.cap; ctx.fill(geo.snow);
    ctx.restore();
    if (!it.eaten) for (let i = 0; i < geo.hips.length; i += 3) hip(ctx, geo.hips[i], geo.hips[i + 1], geo.hips[i + 2], W);
  }

  function makeRowan(x, sd) {
    const stem = new Path2D(), twigs = new Path2D(), snow = new Path2D(), bunches = [];
    const top = GY - 66 - hash(sd) * 10, lean = (hash(sd + 1) - 0.5) * 8;
    stem.moveTo(x, GY + 1); stem.quadraticCurveTo(x + lean * 0.3, GY - 34, x + lean, top);
    for (let k = 0; k < 4; k++) {
      const u = 0.45 + k * 0.17, side = k % 2 ? 1 : -1, sx = x + lean * u * u, sy = GY + 1 - (GY + 1 - top) * u;
      const ex = sx + side * (16 + hash(sd + k) * 10), ey = sy - 12 - hash(sd + k * 3) * 8;
      twigs.moveTo(sx, sy); twigs.quadraticCurveTo(sx + side * 8, sy - 2, ex, ey);
      snow.moveTo(sx + side * 3, sy - 2); snow.quadraticCurveTo(sx + side * 8, sy - 3.6, ex - side * 2, ey - 1.6);
      bunches.push(ex + side * 1.5, ey + 5);
    }
    bunches.push(x + lean, top + 4);
    return { stem, twigs, snow, bunches };
  }

  function rowan(ctx, it, time, g) {
    const W = B.look(g), geo = shrub(it, makeRowan);
    mound(ctx, it.x, 14, 5 + W.drift * 2, W);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5d4a3c'; ctx.lineWidth = 3.2; ctx.stroke(geo.stem);
    ctx.lineWidth = 1.7; ctx.stroke(geo.twigs);
    ctx.strokeStyle = W.snow; ctx.lineWidth = 1.5; ctx.globalAlpha = W.cap; ctx.stroke(geo.snow);
    ctx.restore();
    const b = geo.bunches;
    for (let i = 0; i < (it.eaten ? 0 : b.length); i += 2) {
      const bx = b[i], by = b[i + 1];
      for (let j = 0; j < 9; j++) {
        const a = j * 2.4, r = j ? 2.4 + (j % 3) * 1.4 : 0, px = bx + Math.cos(a) * r, py = by + Math.sin(a) * r * 0.7 + (j > 5 ? 1.5 : 0);
        ctx.fillStyle = '#a8321a'; circle(ctx, px + 0.5, py + 0.5, 2.5);
        ctx.fillStyle = '#e8552a'; circle(ctx, px, py, 2.2);
        ctx.fillStyle = 'rgba(255,214,170,0.8)'; circle(ctx, px - 0.7, py - 0.7, 0.7);
      }
      ctx.fillStyle = W.snow; ctx.globalAlpha = W.cap * 0.9;
      ctx.beginPath(); ctx.ellipse(bx - 0.5, by - 4.6, 4.2, 1.5, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function frosted(ctx, x, y, r, time, sd) {
    ctx.fillStyle = 'rgba(205,232,255,0.28)'; circle(ctx, x, y + 0.6, r);
    ctx.strokeStyle = 'rgba(244,251,255,0.95)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x, y + 0.6, r - 0.7, -2.7, -1.15); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) circle(ctx, x - r * 0.5 + i * r * 0.26, y - r * 0.55 + Math.abs(i - 2) * 1.1, 0.75);
    ctx.fillStyle = 'rgba(214,236,252,0.92)';
    ctx.beginPath(); ctx.moveTo(x - 1.1, y + r - 0.6); ctx.lineTo(x + 1.3, y + r - 0.6); ctx.lineTo(x + 0.2, y + r + 5); ctx.closePath(); ctx.fill();
    const gl = Math.pow(Math.max(0, Math.sin(time * 1.3 + sd * 11)), 10);
    if (gl > 0.03) {
      const gx = x - r * 0.45, gy = y - r * 0.35, l = 2 + gl * 5;
      ctx.fillStyle = 'rgba(255,255,255,' + gl.toFixed(3) + ')';
      ctx.fillRect(gx - l, gy - 0.5, l * 2, 1); ctx.fillRect(gx - 0.5, gy - l, 1, l * 2);
    }
  }

  function frozenapple(ctx, it, time, g) {
    const x = it.x, sd = hash(x * 0.07), A = ZS.foodArt.apple;
    if (it.y !== undefined) {
      ctx.strokeStyle = '#4a3526'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 0.5, it.y - 8); ctx.quadraticCurveTo(x - 1, it.y - 15, x - 7 + sd * 4, it.y - 21); ctx.stroke();
      ctx.lineCap = 'butt';
      A(ctx, x, it.y + 0.4, 8, (sd - 0.5) * 0.3, 'frozen', false);
      frosted(ctx, x, it.y, 8.6, time, sd);
      return;
    }
    const W = B.look(g);
    ctx.fillStyle = 'rgba(70,92,125,0.16)'; ellipse(ctx, x, GY + 0.8, 12, 2.4);
    A(ctx, x, GY - 9.6, 8.8, (sd - 0.5) * 0.5, 'frozen', sd < 0.5);
    frosted(ctx, x, GY - 10, 9.4, time, sd);
    bank(ctx, x - 16, x + 14, 4, sd * 10, W);
  }

  function snownut(ctx, it, time, g) {
    const W = B.look(g), x = it.x, sd = hash(x * 0.011) * 50;
    mound(ctx, x - 25, 15, 8 + W.drift * 2, W);
    mound(ctx, x + 26, 13, 7 + W.drift * 2, W);
    ctx.fillStyle = 'rgba(70,52,36,0.75)';
    for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1; circle(ctx, x + side * (19 + hash(sd + i) * 16), GY - 2 - hash(sd + i * 3) * 6, 0.9 + hash(sd + i * 5) * 0.9); }
    ctx.fillStyle = W.snowShade; ellipse(ctx, x, GY + 2.4, 23, 6.2);
    ctx.fillStyle = '#3a2c22'; ellipse(ctx, x, GY + 3.2, 20, 4.8);
    ctx.fillStyle = '#6b4a2e';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(x - 14 + i * 5.6, GY + 3 + hash(sd + i) * 2, 3.4, 1.4, (hash(sd + i * 2) - 0.5) * 1.6, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 2; i++) {
      const hx = x + (i ? 9 : -10), hy = GY + 1.5;
      ctx.fillStyle = '#5d4128';
      for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.55; ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * 2.6, hy + Math.sin(a) * 2.6, 1.3, 3, a + Math.PI / 2, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(40,26,14,0.7)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = -Math.PI + k * 0.6; ctx.moveTo(hx + Math.cos(a) * 3, hy + Math.sin(a) * 3); ctx.lineTo(hx + Math.cos(a) * 5, hy + Math.sin(a) * 5); } ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const out = i > 4, nx = out ? x + (i === 5 ? -15 : 17) : x - 9 + i * 4.6 + (hash(sd + i * 7) - 0.5) * 2, ny = out ? GY - 3.5 : GY + 1.4 + (i % 2) * 1.6, a = (hash(sd + i * 9) - 0.5) * 1.4;
      ctx.save(); ctx.translate(nx, ny); ctx.rotate(a); ctx.scale(1.3, 1.3);
      ctx.fillStyle = '#7d4c22'; ctx.beginPath(); ctx.moveTo(0, -3.6); ctx.lineTo(2.5, 2); ctx.lineTo(-2.5, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c4874a'; ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.lineTo(-0.2, 1.8); ctx.lineTo(-2.1, 1.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-1.4, -0.6, 0.8, 1.6);
      ctx.restore();
    }
    ctx.fillStyle = W.snow;
    for (let i = 0; i < 6; i++) circle(ctx, x - 12 + i * 5 + hash(sd + i * 11) * 3, GY - 1 - hash(sd + i * 13) * 3, 1.3 + hash(sd + i) * 1.2);
  }

  function candy(ctx, it, time, g) {
    const x = it.x, sd = hash(x * 0.019) * 40;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(x + 14, GY + 2); ctx.lineTo(x - 6, GY - 3); ctx.arc(x - 8.2, GY - 7.8, 4.8, 0.42, -2.6, true); ctx.stroke();
    ctx.strokeStyle = '#d62f2f'; ctx.lineWidth = 3.4; ctx.setLineDash([2.2, 2.6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    for (let i = 0; i < 5; i++) {
      const h = hash(sd + i * 3.7), cx = x - 18 + i * 9 + (h - 0.5) * 5, cy = GY + 1.5 - hash(sd + i) * 3.5, col = CANDY[Math.floor(hash(sd + i * 5.1) * CANDY.length)];
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((h - 0.5) * 1.3);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(3.4, 0); ctx.lineTo(7.6, -2.6); ctx.lineTo(7, 0); ctx.lineTo(7.6, 2.6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3.4, 0); ctx.lineTo(-7.6, -2.6); ctx.lineTo(-7, 0); ctx.lineTo(-7.6, 2.6); ctx.closePath(); ctx.fill();
      ellipse(ctx, 0, 0, 4.4, 3.1);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ellipse(ctx, -1, -1.2, 2, 0.9);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ellipse(ctx, 0.8, 1.4, 2.8, 0.9);
      ctx.restore();
    }
  }

  function chatabin(ctx, it) { ZS.scenery.container(ctx, it.x, it.locked, true); }

  function halusky(ctx, it, time) {
    const x = it.x, y = GY - 1.5, sd = hash(x * 0.023) * 30;
    ctx.fillStyle = 'rgba(30,26,12,0.16)'; oval(ctx, x + 1, GY + 0.8, 16, 2.6, 0);
    ctx.fillStyle = '#c9c4b8'; oval(ctx, x, y + 0.6, 14.5, 3.6, 0);
    ctx.fillStyle = '#f7f5ef'; oval(ctx, x, y - 0.2, 14, 3, 0);
    ctx.fillStyle = '#e3d2a0'; oval(ctx, x, y - 3.4, 10.6, 4.4, 0);
    for (let i = 0; i < 12; i++) {
      const a = hash(sd + i * 1.7), b = hash(sd + i * 3.1), px = x - 9 + a * 18, py = y - 2.4 - b * 4.6 - (1 - Math.abs(a - 0.5) * 2) * 2.6;
      ctx.fillStyle = i % 3 ? '#f6eed6' : '#ecdcb2'; oval(ctx, px, py, 1.9 + b * 0.8, 1.4 + a * 0.5, (a - 0.5) * 1.2);
    }
    ctx.fillStyle = 'rgba(255,255,250,0.88)'; oval(ctx, x - 2, y - 6.6, 5, 1.8, -0.2); oval(ctx, x + 3.6, y - 5.4, 3.4, 1.4, 0.3);
    for (let i = 0; i < 6; i++) {
      const a = hash(sd + i * 5.3), b = hash(sd + i * 7.9);
      ctx.fillStyle = i % 2 ? '#9c3b22' : '#c8673f'; ctx.fillRect(x - 7 + a * 14, y - 4 - b * 4.4, 2.2, 1.5);
    }
    ctx.fillStyle = '#4f8a3a';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 6 + hash(sd + i * 9.1) * 12, y - 5 - hash(sd + i * 4.4) * 3, 1.3, 0.6);
    for (let i = 0; i < 3; i++) {
      const u = frac(time * 0.45 + i / 3), a = 0.26 * Math.sin(Math.PI * u);
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      circle(ctx, x - 5 + i * 5 + Math.sin(u * 6 + i) * 2, y - 9 - u * 15, 1.6 + u * 2.4);
    }
  }

  const LANDMARK = { feeder: 1, punch: 1, lokse: 1, sausage: 1, carrot: 1 };
  const WINTER_ITEM = { rosehip, rowan, snownut, frozenapple, candy, chatabin };

  function item(ctx, it, time, g) {
    const x = it.x;
    if (it.hidden || LANDMARK[it.type] || (it.eaten && !left(it))) return;
    if (it.type === 'halusky') { halusky(ctx, it, time); return; }
    if (it.type === 'limba') { ZS.alpineArt.coneItem(ctx, it, time); return; }
    if (WINTER_ITEM[it.type]) { WINTER_ITEM[it.type](ctx, it, time, g); return; }
    const W = cold(g), F = ZS.foodArt;
    if (F.has(it.type)) { F.draw(ctx, it, time, g, W ? B.look(g) : null); return; }
    if (it.type === 'fish') {
      const f = it.fd || (it.fd = { id: 'fish' + Math.round(it.x0 || it.x), wiggle: (it.x0 || it.x) % 6 });
      f.x = x; f.y = it.y; f.dir = it.dir || 1;
      ZS.scenery.fish(ctx, f, time);
      return;
    }
    if (it.type === 'container') { if (W) ZS.scenery.container(ctx, x, it.locked, true); else ZS.scenery.container(ctx, x, it.locked); return; }
    emoji(ctx, ZS.FOOD[it.type].emoji, x, it.y !== undefined ? it.y : GY - 12, it.y !== undefined ? 18 : 22);
  }

  const left = (it) => it.type === 'rosehip' || it.type === 'rowan' || (it.type === 'limba' && it.y === undefined) || ZS.foodArt.left(it);

  function crosshair(ctx, s, aimFactor, g) {
    const x = s.cross, y = GY - 30, locked = s.lock > 0, snowy = cold(g), idle = !locked && !s.blocked && s.reload > 0;
    const from = s.kind === 'posed' ? [s.x, GY - 178] : [s.x + s.dir * 20, GY - 48];
    ctx.strokeStyle = locked ? 'rgba(224,49,49,0.5)' : snowy ? 'rgba(28,38,56,0.32)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.moveTo(x - 30, y); ctx.lineTo(x - 9, y); ctx.moveTo(x + 9, y); ctx.lineTo(x + 30, y);
    ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 9); ctx.moveTo(x, y + 9); ctx.lineTo(x, y + 30);
    if (idle) ctx.setLineDash([5, 5]);
    if (snowy) { ctx.strokeStyle = idle ? 'rgba(18,26,40,0.3)' : 'rgba(18,26,40,0.5)'; ctx.lineWidth = 5; ctx.stroke(); }
    ctx.strokeStyle = s.blocked ? 'rgba(150,150,150,0.7)' : locked ? '#e03131' : idle ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);
    if (locked) {
      ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, s.lock / (s.aimTime * aimFactor)) * Math.PI * 2);
      if (snowy) { ctx.strokeStyle = 'rgba(18,26,40,0.45)'; ctx.lineWidth = 6.5; ctx.stroke(); ctx.strokeStyle = '#e03131'; }
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  function drone(ctx, d, time) {
    ctx.fillStyle = 'rgba(255,240,150,0.2)';
    ctx.beginPath(); ctx.moveTo(d.x - 8, d.y + 6); ctx.lineTo(d.x + 8, d.y + 6); ctx.lineTo(d.x + d.beam, GY); ctx.lineTo(d.x - d.beam, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#30343a'; rrect(ctx, d.x - 16, d.y - 5, 32, 10, 4);
    ctx.fillRect(d.x - 24, d.y - 8, 48, 3);
    const w = 10 + Math.abs(Math.sin(time * 40)) * 6;
    ellipse(ctx, d.x - 24, d.y - 10, w, 2); ellipse(ctx, d.x + 24, d.y - 10, w, 2);
    ctx.fillStyle = Math.sin(time * 6) > 0 ? '#ff3b30' : '#7a1d18'; circle(ctx, d.x, d.y + 6, 2.5);
  }

  function bubble(ctx, x, y, text, t, lo, hi) {
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.font = '600 15px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 24, h = 30, by = y - h;
    const bx = hi === undefined ? x - w / 2 : Math.max(lo, Math.min(hi - w, x - w / 2)), tx = Math.max(bx + 16, Math.min(bx + w - 16, x));
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rrect(ctx, bx + 2, by + 3, w, h, 12);
    ctx.fillStyle = '#fff'; rrect(ctx, bx, by, w, h, 12);
    ctx.beginPath(); ctx.moveTo(tx - 8, y - 1); ctx.lineTo(tx + 2, y + 12); ctx.lineTo(tx + 8, y - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d1d1d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
    ctx.globalAlpha = 1;
  }

  ZS.render = ZS.render || {};
  ZS.render.props = { trunk, crown, tree, house, post, log, sign, den, item, left, crosshair, drone, bubble };
})();
