(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const { circle } = ZS.gfx;
  const TAU = Math.PI * 2;
  const KEYS = ['spring', 'summer', 'autumn'];
  const SKY = { spring: ['#a7d8f5', '#eaf7ff'], summer: ['#7cc4ef', '#d8f1ff'], autumn: ['#efb57c', '#fbe6c8'] };
  const LEAF = { spring: '#4f8a45', summer: '#3d7238', autumn: '#a8692c' };
  const { hash, smooth } = ZS.util;
  const seasonOf = (g) => ZS.seasonLook(g.seasonKey) || KEYS[g.seasonIdx | 0] || KEYS[0];
  const cold = (g) => !!(g && g.level && g.level.theme === 'winter');

  const PAL = {
    advent: {
      skyTop: '#74818d', skyBot: '#bac1c6', cloud: '#5b6672', cloudA: 0.42, sun: 0, glow: 0.16,
      mtTop: '#cbd1d6', mtLow: '#9aa4ad', mtShade: '#8692a0', mtRock: '#535d68', rockA: 0.85,
      rdTop: '#c0c7cc', rdLow: '#97a1a8', rdTree: '#293833', rdSnow: '#a6afb4',
      bfTree: '#283d37', bfSnow: '#b1b9bd', bfTrunk: '#433d38', bfTwig: '#4d4641', bfFloor: '#b5bcbe', haze: [184, 192, 198, 0.3],
      gTop: '#d6d9d6', gMid: '#cbd0ce', gShade: '#a9b3b9', gLow: '#c0c7c9', gBot: '#8e989e', gRim: [255, 255, 255, 0.45],
      soilTop: '#6c5d50', soilDeep: '#40342b', band: '#7b6b5c', frostA: 0.14,
      slush: 1, sparkle: 0, drift: 0.55, stalk: '#6f5f42',
      snow: '#dce0df', snowShade: '#aeb8be', ice: [196, 214, 226, 0.82], icicle: 0.55, cap: 0.62, wet: 1, bark: 0.8, plaster: 0,
      spruce: '#21372e', spruce2: '#273f34', track: [84, 90, 88, 0.44], trackRim: [255, 255, 255, 0.3], trackLife: 46,
    },
    snow: {
      skyTop: '#a5afba', skyBot: '#e0e4e8', cloud: '#c2c9d0', cloudA: 0.36, sun: 0, glow: 0,
      mtTop: '#edf1f4', mtLow: '#d0d7de', mtShade: '#bfc9d4', mtRock: '#a1acb7', rockA: 0.5,
      rdTop: '#edf1f4', rdLow: '#cfd6dd', rdTree: '#4a5c57', rdSnow: '#e1e7eb',
      bfTree: '#33493f', bfSnow: '#edf1f4', bfTrunk: '#4d4843', bfTwig: '#5c5651', bfFloor: '#e6eaed', haze: [221, 227, 232, 0.38],
      gTop: '#ffffff', gMid: '#f3f7fb', gShade: '#cddaea', gLow: '#e3ebf4', gBot: '#b1c2d6', gRim: [255, 255, 255, 0.9],
      soilTop: '#7c6d61', soilDeep: '#4a3d34', band: '#8b7b6c', frostA: 0.42,
      slush: 0, sparkle: 0.3, drift: 1, stalk: '#857553',
      snow: '#f6f8fa', snowShade: '#cfd9e4', ice: [214, 232, 244, 0.86], icicle: 0.4, cap: 1, wet: 0, bark: 0.92, plaster: 0.9,
      spruce: '#27423a', spruce2: '#2d4940', track: [138, 158, 188, 0.46], trackRim: [255, 255, 255, 0.65], trackLife: 24,
    },
    frost: {
      skyTop: '#2b62ab', skyBot: '#cde3f4', cloud: '#ffffff', cloudA: 0, sun: 1, glow: 1,
      mtTop: '#f8fbfe', mtLow: '#d3e1ef', mtShade: '#9db4d1', mtRock: '#586980', rockA: 0.72,
      rdTop: '#f2f7fb', rdLow: '#c6d6e9', rdTree: '#213a34', rdSnow: '#edf3f9',
      bfTree: '#243f39', bfSnow: '#f2f7fb', bfTrunk: '#46413c', bfTwig: '#554e49', bfFloor: '#e9f0f7', haze: [200, 220, 240, 0.21],
      gTop: '#ffffff', gMid: '#f2f8fd', gShade: '#bcd1eb', gLow: '#dde9f6', gBot: '#a3bbda', gRim: [255, 255, 255, 1],
      soilTop: '#84786f', soilDeep: '#4b4038', band: '#958a81', frostA: 0.7,
      slush: 0, sparkle: 1, drift: 0.85, stalk: '#91815a',
      snow: '#fbfdff', snowShade: '#c3d4e9', ice: [210, 236, 255, 0.9], icicle: 1, cap: 0.92, wet: 0, bark: 0.9, plaster: 0.5,
      spruce: '#1f3a33', spruce2: '#25423a', track: [118, 148, 194, 0.5], trackRim: [255, 255, 255, 0.8], trackLife: 58,
    },
  };

  const toRgb = (v) => (Array.isArray(v) ? v.slice() : [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), v.length > 7 ? parseInt(v.slice(7, 9), 16) / 255 : 1]);
  const css = (c, a) => {
    const al = a === undefined ? c[3] : a;
    return al >= 1 ? 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'
      : 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + Math.max(0, al).toFixed(3) + ')';
  };
  const RAW = {}, LOOKS = {};
  for (const k in PAL) {
    RAW[k] = {}; LOOKS[k] = { raw: RAW[k] };
    for (const n in PAL[k]) {
      const v = PAL[k][n];
      RAW[k][n] = typeof v === 'number' ? v : toRgb(v);
      LOOKS[k][n] = typeof v === 'number' ? v : css(RAW[k][n]);
    }
  }

  const blends = new WeakMap();
  function look(g) {
    const key = PAL[g.seasonKey] ? g.seasonKey : 'snow';
    let st = blends.get(g);
    if (!st) { st = { key, from: key, t0: -1e9, at: NaN, mix: { raw: {} } }; blends.set(g, st); }
    if (key !== st.key) { st.from = st.key; st.key = key; st.t0 = g.time; st.at = NaN; }
    const k = smooth((g.time - st.t0) / 4);
    if (k >= 1 || st.from === key) return LOOKS[key];
    if (st.at !== g.time) {
      st.at = g.time;
      const A = RAW[st.from], Z = RAW[key], M = st.mix;
      for (const n in A) {
        const a = A[n], b = Z[n];
        if (typeof a === 'number') { M[n] = a + (b - a) * k; M.raw[n] = M[n]; continue; }
        const c = M.raw[n] || (M.raw[n] = [0, 0, 0, 0]);
        for (let i = 0; i < 4; i++) c[i] = a[i] + (b[i] - a[i]) * k;
        M[n] = css(c);
      }
    }
    return st.mix;
  }

  function grow(seed, x, y, w, len, o) {
    const rnd = ZS.util.mulberry32(seed), geo = { line: [], snow: [], w: [], tips: [] };
    for (let d = 0; d <= o.depth; d++) { geo.line.push(new Path2D()); geo.snow.push(new Path2D()); geo.w.push(Math.max(o.min, w * Math.pow(o.taper, d))); }
    const limb = (x0, y0, a, l, d) => {
      const s = Math.sin(a), c = Math.cos(a), x1 = x0 + s * l, y1 = y0 - c * l, k = (rnd() - 0.5) * o.kink * l;
      const mx = (x0 + x1) / 2 + c * k, my = (y0 + y1) / 2 + s * k;
      geo.line[d].moveTo(x0, y0); geo.line[d].quadraticCurveTo(mx, my, x1, y1);
      if (d <= o.snowDepth && Math.abs(s) > 0.6) {
        const u = geo.w[d] * 0.4, h = hash(x0 * 0.13 + y0 * 0.71), a0 = 0.08 + h * 0.22, a1 = 0.55 + hash(x1 * 0.29 + y1 * 0.37) * 0.4;
        const at = (t, p0, c, p1) => (1 - t) * (1 - t) * p0 + 2 * t * (1 - t) * c + t * t * p1;
        const ct = (p0, c, p1) => (1 - a0) * (1 - a1) * p0 + ((1 - a0) * a1 + a0 * (1 - a1)) * c + a0 * a1 * p1;
        geo.snow[d].moveTo(at(a0, x0, mx, x1), at(a0, y0, my, y1) - u);
        geo.snow[d].quadraticCurveTo(ct(x0, mx, x1), ct(y0, my, y1) - u, at(a1, x0, mx, x1), at(a1, y0, my, y1) - u);
      }
      if (d === o.depth) { geo.tips.push(x1, y1); return; }
      const m = d === 0 ? o.fork : rnd() < o.third ? 3 : 2;
      for (let i = 0; i < m; i++) {
        const v = m === 1 ? 0 : i / (m - 1) - 0.5;
        let a2 = a + v * o.spread * (0.75 + rnd() * 0.5) + (rnd() - 0.5) * o.jitter;
        if (d + 1 >= o.droop) a2 += (a2 < 0 ? -1 : 1) * o.sag;
        a2 = Math.max(-o.limit, Math.min(o.limit, a2));
        limb(x1, y1, a2, l * (o.shrink + rnd() * 0.16), d + 1);
      }
    };
    limb(x, y, o.lean || 0, len, 0);
    return geo;
  }

  function cap(ctx, x, y0, hw, th, depth, n, sd, only) {
    const ay = y0 - th, ey = ay + th * depth, ew = hw * depth + 1.6;
    ctx.beginPath(); ctx.moveTo(x, ay - 1.4); ctx.lineTo(x + ew, ey);
    for (let i = 0; i < n; i++) {
      const xa = x + ew - (2 * ew * i) / n, xb = x + ew - (2 * ew * (i + 1)) / n, dip = th * (0.06 + 0.07 * hash(sd + i * 1.7));
      ctx.quadraticCurveTo((xa + xb) / 2, ey + dip * 2, xb, ey);
    }
    ctx.closePath();
    if (!only) ctx.fill();
  }

  function sky(ctx, g, viewW, offY) {
    if (cold(g)) { winterSky(ctx, g, viewW, offY); return; }
    const L = g.level, s = SKY[seasonOf(g)] || SKY.spring;
    const grad = ctx.createLinearGradient(0, -offY, 0, GY);
    grad.addColorStop(0, s[0]); grad.addColorStop(1, s[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, -offY, viewW, GY + offY);

    const mx = g.cam * 0.15, pts = L.mountains;
    ctx.fillStyle = '#8399ae';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (const [x, y] of pts) { const sx = x - mx; if (sx > -250 && sx < viewW + 250) ctx.lineTo(sx, y); }
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f6f8';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], sx = x - mx;
      if (sx < -100 || sx > viewW + 100 || y > GY - 250 || y > pts[i - 1][1] || y > pts[i + 1][1]) continue;
      const l = pts[i - 1], r = pts[i + 1];
      ctx.beginPath(); ctx.moveTo(sx, y);
      ctx.lineTo(sx + (l[0] - x) * 0.25, y + (l[1] - y) * 0.25);
      ctx.lineTo(sx + (r[0] - x) * 0.25, y + (r[1] - y) * 0.25);
      ctx.closePath(); ctx.fill();
    }

    const rx = g.cam * 0.35;
    ctx.fillStyle = '#5c8a5f';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (const [x, y] of L.ridge) { const sx = x - rx; if (sx > -200 && sx < viewW + 200) ctx.lineTo(sx, y); }
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#46704b';
    for (let sx = -((rx % 26) + 26); sx < viewW + 26; sx += 26) {
      const y = ZS.silhouetteY(L.ridge, sx + rx);
      ctx.beginPath(); ctx.moveTo(sx - 10, y + 8); ctx.lineTo(sx, y - 24); ctx.lineTo(sx + 10, y + 8); ctx.closePath(); ctx.fill();
    }
  }

  function winterSky(ctx, g, viewW, offY) {
    const W = look(g);
    const grad = ctx.createLinearGradient(0, -offY, 0, GY);
    grad.addColorStop(0, W.skyTop); grad.addColorStop(1, W.skyBot);
    ctx.fillStyle = grad; ctx.fillRect(0, -offY, viewW, GY + offY);
    if (W.glow > 0.004) sun(ctx, W, viewW);
    if (W.cloudA > 0.004) clouds(ctx, g, W, viewW);
    peaks(ctx, g, W, viewW);
    hill(ctx, g, W, viewW);
  }

  function sun(ctx, W, viewW) {
    const x = viewW * 0.2, y = GY - 262, gl = W.glow;
    const r = ctx.createRadialGradient(x, y, 0, x, y, 300);
    r.addColorStop(0, 'rgba(255,251,238,' + (0.62 * gl).toFixed(3) + ')');
    r.addColorStop(0.12, 'rgba(255,248,232,' + (0.34 * gl).toFixed(3) + ')');
    r.addColorStop(0.45, 'rgba(255,246,230,' + (0.1 * gl).toFixed(3) + ')');
    r.addColorStop(1, 'rgba(255,246,230,0)');
    ctx.fillStyle = r; ctx.fillRect(x - 300, y - 300, 600, 600);
    if (W.sun < 0.004) return;
    ctx.globalAlpha = W.sun;
    ctx.fillStyle = 'rgba(255,252,240,0.4)'; circle(ctx, x, y, 26);
    ctx.fillStyle = '#fffcf1'; circle(ctx, x, y, 16.5);
    ctx.globalAlpha = 1;
  }

  function clouds(ctx, g, W, viewW) {
    const t = g.time, cam = g.cam;
    ctx.fillStyle = W.cloud;
    for (let l = 0; l < 3; l++) {
      const gap = 190 + l * 70, off = cam * (0.015 + l * 0.02) + t * (2 + l * 2.2), y0 = GY - 470 + l * 92;
      ctx.globalAlpha = W.cloudA * (0.55 + l * 0.22);
      ctx.beginPath();
      for (let i = Math.floor((off - 300) / gap); i * gap - off < viewW + 300; i++) {
        const h1 = hash(i * 3.17 + l * 41), h2 = hash(i * 7.31 + l * 13), cx = i * gap - off + h1 * 80, cy = y0 - h2 * 46;
        const rx = 110 + h2 * 90, ry = 13 + h1 * 9;
        ctx.moveTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
        ctx.moveTo(cx + rx * 0.2 + rx * 0.45, cy - ry * 0.75); ctx.ellipse(cx + rx * 0.2, cy - ry * 0.75, rx * 0.45, ry * 0.95, 0, 0, TAU);
        ctx.moveTo(cx - rx * 0.35 + rx * 0.35, cy - ry * 0.4); ctx.ellipse(cx - rx * 0.35, cy - ry * 0.4, rx * 0.35, ry * 0.8, 0, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function peaks(ctx, g, W, viewW) {
    const pts = g.level.mountains, mx = g.cam * 0.15, n = pts.length;
    let i0 = -1, i1 = -1;
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (let i = 0; i < n; i++) {
      const sx = pts[i][0] - mx;
      if (sx > -250 && sx < viewW + 250) { ctx.lineTo(sx, pts[i][1]); if (i0 < 0) i0 = i; i1 = i; }
    }
    ctx.lineTo(viewW, GY); ctx.closePath();
    const gr = ctx.createLinearGradient(0, GY - 330, 0, GY - 70);
    gr.addColorStop(0, W.mtTop); gr.addColorStop(1, W.mtLow);
    ctx.fillStyle = gr; ctx.fill();
    if (i0 < 0) return;
    ctx.save(); ctx.clip();
    const a = Math.max(1, i0 - 1), z = Math.min(n - 2, i1 + 1);
    ctx.fillStyle = W.mtShade;
    for (let i = a; i <= z; i++) {
      const [x, y] = pts[i];
      if (y > pts[i - 1][1] || y > pts[i + 1][1]) continue;
      let j = i + 1;
      while (j < n - 1 && pts[j + 1][1] > pts[j][1]) j++;
      const sx = x - mx, span = pts[j][0] - x, hgt = GY - y, sd = hash(x * 0.37);
      ctx.beginPath(); ctx.moveTo(sx, y);
      for (let k = i + 1; k <= j; k++) ctx.lineTo(pts[k][0] - mx, pts[k][1]);
      ctx.lineTo(pts[j][0] - mx, GY);
      for (let k = 5; k >= 1; k--) ctx.lineTo(sx + span * (0.04 + 0.05 * k) + (hash(sd + k) - 0.5) * 9, y + hgt * k / 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = W.mtRock; ctx.globalAlpha = W.rockA;
    ctx.beginPath();
    for (let i = a; i <= z; i++) {
      const [x, y] = pts[i];
      if (y > pts[i - 1][1] || y > pts[i + 1][1]) continue;
      let j = i + 1;
      while (j < n - 1 && pts[j + 1][1] > pts[j][1]) j++;
      const sx = x - mx, span = pts[j][0] - x, hgt = GY - y, sd = hash(x * 0.37);
      const rx = (u) => { const k = u * 6, k0 = Math.floor(k), f = k - k0, at = (q) => (q < 1 ? 0 : span * (0.04 + 0.05 * q) + (hash(sd + q) - 0.5) * 9); return sx + at(k0) + (at(k0 + 1) - at(k0)) * f; };
      for (let m = 0; m < 9; m++) {
        const u = 0.03 + m * 0.055 + hash(sd + m * 1.9) * 0.03;
        if (hash(sd * 3 + m) < 0.3) continue;
        const s = (7.5 - m * 0.55) * (0.6 + hash(sd + m * 0.7) * 0.6), bx = rx(u) + (hash(sd + m * 2.3) - 0.6) * 5, by = y + hgt * u;
        ctx.moveTo(bx - s * 0.55, by + s * 0.5); ctx.lineTo(bx - s * 0.15, by - s * 0.55); ctx.lineTo(bx + s * 0.35, by - s * 0.2);
        ctx.lineTo(bx + s * 0.7, by + s * 0.65); ctx.lineTo(bx + s * 0.1, by + s * 0.3); ctx.closePath();
      }
      for (let m = 0; m < 3; m++) {
        const u = 0.1 + m * 0.09, bx = rx(u) - 10 - m * 7 - hash(sd + m * 5) * 10, by = y + hgt * (u + 0.03), s = 4.5 - m;
        if (hash(sd + m * 4.1) < 0.4) continue;
        ctx.moveTo(bx - s, by + s * 0.4); ctx.lineTo(bx, by - s * 0.5); ctx.lineTo(bx + s * 1.4, by + s * 0.3); ctx.closePath();
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function hill(ctx, g, W, viewW) {
    const pts = g.level.ridge, rx = g.cam * 0.35;
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (const [x, y] of pts) { const sx = x - rx; if (sx > -200 && sx < viewW + 200) ctx.lineTo(sx, y); }
    ctx.lineTo(viewW, GY); ctx.closePath();
    const gr = ctx.createLinearGradient(0, GY - 125, 0, GY - 10);
    gr.addColorStop(0, W.rdTop); gr.addColorStop(1, W.rdLow);
    ctx.fillStyle = gr; ctx.fill();
    const dark = new Path2D(), lit = new Path2D(), snow = new Path2D();
    const tree = (sx, y, h, hw) => {
      const b = y + 8, tip = b - h;
      dark.moveTo(sx - hw, b); dark.lineTo(sx - hw * 0.34, b - h * 0.42); dark.lineTo(sx - hw * 0.58, b - h * 0.4); dark.lineTo(sx, tip);
      dark.lineTo(sx + hw * 0.58, b - h * 0.4); dark.lineTo(sx + hw * 0.34, b - h * 0.42); dark.lineTo(sx + hw, b);
      lit.moveTo(sx - hw, b); lit.lineTo(sx - hw * 0.34, b - h * 0.42); lit.lineTo(sx - hw * 0.58, b - h * 0.4); lit.lineTo(sx, tip); lit.lineTo(sx + 1, b);
      snow.moveTo(sx, tip - 0.6); snow.lineTo(sx + hw * 0.27, b - h * 0.68); snow.lineTo(sx + hw * 0.08, b - h * 0.71);
      snow.lineTo(sx - hw * 0.06, b - h * 0.64); snow.lineTo(sx - hw * 0.3, b - h * 0.69);
      snow.moveTo(sx - hw * 0.58, b - h * 0.41); snow.lineTo(sx - hw * 0.3, b - h * 0.47); snow.lineTo(sx - hw * 0.5, b - h * 0.33);
    };
    for (let sx = -((rx % 26) + 26); sx < viewW + 26; sx += 26) {
      const k = Math.round((sx + rx) / 26), y = ZS.silhouetteY(pts, sx + rx), h1 = hash(k * 1.31), h2 = hash(k * 2.17);
      tree(sx, y, 25 + h1 * 13, 8.5 + h2 * 3);
      if (h2 > 0.45) tree(sx + 13, y + 15 + h1 * 12, 15 + h2 * 8, 5.5 + h1 * 2);
    }
    ctx.fillStyle = W.rdTree; ctx.fill(dark);
    ctx.globalAlpha = 0.3; ctx.fillStyle = W.rdSnow; ctx.fill(lit);
    ctx.globalAlpha = 1; ctx.fill(snow);
  }

  function snag(ctx, t) {
    const h = t.h * 0.82, w = Math.max(3, t.w * 0.22), top = GY - h;
    ctx.fillStyle = '#8f877c';
    ctx.beginPath(); ctx.moveTo(t.x - w, GY); ctx.lineTo(t.x - w * 0.3, top); ctx.lineTo(t.x + w * 0.3, top); ctx.lineTo(t.x + w, GY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8f877c'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const y = top + h * i * 0.13, l = t.r * (0.18 + i * 0.07), s = i % 2 ? 1 : -1;
      ctx.moveTo(t.x, y); ctx.lineTo(t.x + s * l, y + l * 0.45);
      ctx.moveTo(t.x, y + 6); ctx.lineTo(t.x - s * l * 0.8, y + 6 + l * 0.4);
    }
    ctx.stroke();
  }

  function backForest(ctx, g, viewW, offY) {
    if (cold(g)) { winterForest(ctx, g, viewW, offY); return; }
    const px = g.cam * 0.85;
    const leaf = LEAF[seasonOf(g)] || LEAF.spring;
    ctx.save();
    ctx.translate(-Math.round(px), 0);
    for (const t of g.level.backTrees) {
      if (t.x < px - 120 || t.x > px + viewW + 120) continue;
      if (t.dead) { snag(ctx, t); continue; }
      ctx.fillStyle = '#5e574d';
      ctx.fillRect(t.x - t.w / 2, GY - t.h * (t.kind === 'smrek' ? 0.4 : 1), t.w, t.h * (t.kind === 'smrek' ? 0.4 : 1));
      if (t.kind === 'smrek') {
        ctx.fillStyle = '#28503a';
        for (let i = 0; i < 3; i++) {
          const y0 = GY - t.h * 0.3 - i * t.h * 0.22, hw = t.r * (1 - i * 0.25);
          ctx.beginPath(); ctx.moveTo(t.x - hw, y0); ctx.lineTo(t.x, y0 - t.h * 0.36); ctx.lineTo(t.x + hw, y0); ctx.closePath(); ctx.fill();
        }
      } else {
        ctx.fillStyle = leaf;
        circle(ctx, t.x, GY - t.h - t.r * 0.3, t.r);
        circle(ctx, t.x - t.r * 0.7, GY - t.h + t.r * 0.1, t.r * 0.65);
        circle(ctx, t.x + t.r * 0.7, GY - t.h + t.r * 0.05, t.r * 0.7);
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(225,238,242,0.28)';
    ctx.fillRect(0, -offY, viewW, GY + offY);
  }

  const BACK = { depth: 4, fork: 3, third: 0.4, spread: 1.15, jitter: 0.35, kink: 0.24, taper: 0.55, shrink: 0.6, min: 0.75, snowDepth: 1, droop: 9, sag: 0, limit: 1.25 };
  const backGeo = new WeakMap();
  function bareBack(ctx, t, W) {
    const top = GY - t.h * 0.66;
    let geo = backGeo.get(t);
    if (!geo) { geo = grow(Math.round(t.x * 7.3) + 11, t.x, top, t.w * 0.5, t.r * 0.66, BACK); backGeo.set(t, geo); }
    const tw = geo.w[0] / 2;
    ctx.fillStyle = W.bfTrunk;
    ctx.beginPath(); ctx.moveTo(t.x - t.w / 2, GY); ctx.lineTo(t.x - tw, top); ctx.lineTo(t.x + tw, top); ctx.lineTo(t.x + t.w / 2, GY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = W.bfTwig;
    for (let d = 0; d < geo.line.length; d++) { ctx.lineWidth = geo.w[d]; ctx.stroke(geo.line[d]); }
    ctx.strokeStyle = W.bfSnow; ctx.globalAlpha = W.cap;
    for (let d = 0; d < 2; d++) { ctx.lineWidth = geo.w[d] * 0.55; ctx.stroke(geo.snow[d]); }
    ctx.globalAlpha = 1;
  }

  function spruceBack(ctx, t, W) {
    ctx.fillStyle = W.bfTrunk; ctx.fillRect(t.x - t.w / 2, GY - t.h * 0.4, t.w, t.h * 0.4);
    const depth = 0.42 + 0.18 * W.cap;
    for (let i = 0; i < 3; i++) {
      const y0 = GY - t.h * 0.3 - i * t.h * 0.22, hw = t.r * (1 - i * 0.25), th = t.h * 0.36;
      ctx.fillStyle = W.bfTree;
      ctx.beginPath(); ctx.moveTo(t.x - hw, y0); ctx.lineTo(t.x, y0 - th); ctx.lineTo(t.x + hw, y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = W.bfSnow;
      cap(ctx, t.x, y0, hw, th, i === 2 ? depth : depth + 0.18, 3, t.x * 0.1 + i);
      ctx.beginPath(); ctx.ellipse(t.x - hw * 0.86, y0 - 2, hw * 0.16, 2.6, -0.25, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(t.x + hw * 0.86, y0 - 2, hw * 0.16, 2.6, 0.25, 0, TAU); ctx.fill();
    }
  }

  function winterForest(ctx, g, viewW, offY) {
    const W = look(g), px = g.cam * 0.85, x0 = px - 140, x1 = px + viewW + 140;
    ctx.save();
    ctx.translate(-Math.round(px), 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const t of g.level.backTrees) {
      if (t.x < x0 + 20 || t.x > x1 - 20) continue;
      if (t.kind === 'smrek') spruceBack(ctx, t, W); else bareBack(ctx, t, W);
    }
    ctx.fillStyle = W.bfFloor;
    ctx.beginPath(); ctx.moveTo(x0, GY + 4);
    for (let x = Math.floor(x0 / 18) * 18; x <= x1 + 18; x += 18) ctx.lineTo(x, GY - 5 - 2.6 * Math.sin(x * 0.027) - 1.8 * Math.sin(x * 0.073 + 1));
    ctx.lineTo(x1 + 18, GY + 4); ctx.closePath();
    for (const t of g.level.backTrees) {
      if (t.x < x0 + 20 || t.x > x1 - 20) continue;
      ctx.moveTo(t.x + t.w * 1.5, GY - 4); ctx.ellipse(t.x, GY - 4, t.w * 1.5, 6 + t.w * 0.12, 0, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = W.haze; ctx.fillRect(0, -offY, viewW, GY + offY);
  }

  function drift(x, amp) {
    const c = Math.floor(x / 260);
    let h = 1.2 + 0.7 * Math.sin(x * 0.021 + 0.6) + 0.5 * Math.sin(x * 0.057 + 2.1);
    for (let i = c - 1; i <= c + 1; i++) {
      const hh = hash(i * 1.73 + 0.4);
      if (hh < 0.4) continue;
      const cx = i * 260 + hash(i * 3.11) * 260, w = 46 + hash(i * 5.7) * 70, u = (x - cx) / w;
      if (u > -1 && u < 1) { const b = 1 - u * u; h += (hh - 0.4) * 9.5 * b * b; }
    }
    return h * amp;
  }

  function ground(ctx, cam, viewW, g) {
    if (cold(g)) { winterGround(ctx, cam, viewW, g); return; }
    ctx.fillStyle = '#6b4f35'; ctx.fillRect(cam - 10, GY, viewW + 20, 2000);
    ctx.fillStyle = '#5f9a3e'; ctx.fillRect(cam - 10, GY, viewW + 20, 14);
    ctx.fillStyle = '#86674a'; ctx.fillRect(cam - 10, GY + 24, viewW + 20, 14);
    ctx.strokeStyle = '#4f8a35'; ctx.lineWidth = 2;
    ctx.beginPath();
    const R = g && g.level && g.level.river;
    for (let x = Math.floor(cam / 37) * 37; x < cam + viewW + 37; x += 37) {
      if (R && x > R.from - 30 && x < R.to + 30) continue;
      ctx.moveTo(x, GY + 2); ctx.lineTo(x - 4, GY - 8); ctx.moveTo(x, GY + 2); ctx.lineTo(x + 3, GY - 9);
    }
    ctx.stroke();
  }

  function winterGround(ctx, cam, viewW, g) {
    const W = look(g), t = g.time, amp = W.drift, x0 = Math.floor((cam - 16) / 8) * 8, x1 = cam + viewW + 24;
    const deep = (x) => GY + 31 + 2.6 * Math.sin(x * 0.037) + 1.6 * Math.sin(x * 0.103 + 1);
    ctx.fillStyle = W.soilDeep; ctx.fillRect(cam - 10, GY + 200, viewW + 20, 1800);
    ctx.fillStyle = W.soilTop; ctx.fillRect(cam - 10, GY + 20, viewW + 20, 190);
    ctx.fillStyle = W.band;
    ctx.beginPath(); ctx.moveTo(x0, GY + 66);
    for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, GY + 64 + 1.8 * Math.sin(x * 0.021 + 1));
    for (let x = x1; x >= x0; x -= 16) ctx.lineTo(x, GY + 79 + 2.2 * Math.sin(x * 0.017));
    ctx.closePath(); ctx.fill();
    underground(ctx, g, cam, x1, W);
    const gr = ctx.createLinearGradient(0, GY - 9, 0, GY + 34);
    gr.addColorStop(0, W.gTop); gr.addColorStop(0.22, W.gMid); gr.addColorStop(0.42, W.gShade); gr.addColorStop(0.72, W.gLow); gr.addColorStop(1, W.gBot);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x0, GY + 20);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, GY - drift(x, amp));
    for (let x = x1; x >= x0; x -= 12) ctx.lineTo(x, deep(x));
    ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round';
    for (const [dy, al] of [[11, 0.2], [20, 0.17]]) {
      ctx.strokeStyle = 'rgba(120,146,178,' + al + ')'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 12) { const y = GY + dy + 1.4 * Math.sin(x * 0.029 + dy); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 12) { const y = GY + dy + 1.2 + 1.4 * Math.sin(x * 0.029 + dy); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(214,234,250,0.5)'; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const y = deep(x) - 1.6; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,22,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const y = deep(x) + 1.2; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = W.gRim; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) { const y = GY - drift(x, amp) + 0.9; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    if (W.slush > 0.01) slush(ctx, cam, x1, W.slush);
    stalks(ctx, cam, x1, W, amp);
    if (W.sparkle > 0.01) sparkle(ctx, cam, x1, t, W.sparkle, amp);
    ctx.lineJoin = 'miter';
  }

  const roots = new WeakMap();
  const ROOT_W = [5.2, 3.4, 2, 1.1];
  function rootsOf(t) {
    let p = roots.get(t);
    if (p) return p;
    p = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const rnd = ZS.util.mulberry32(Math.round(t.x * 5.3) + 3), w = Math.min(60, t.w || 20);
    const grow = (x, y, a, l, d) => {
      const x1 = x + Math.sin(a) * l, y1 = y + Math.cos(a) * l, k = (rnd() - 0.5) * l * 0.5;
      p[d].moveTo(x, y); p[d].quadraticCurveTo((x + x1) / 2 + Math.cos(a) * k, (y + y1) / 2 - Math.sin(a) * k, x1, y1);
      if (d === 3) return;
      grow(x1, y1, a + (rnd() - 0.5) * 0.5, l * 0.78, d + 1);
      if (rnd() < 0.45) grow(x1, y1, a + (a < 0 ? -1 : 1) * (0.35 + rnd() * 0.5), l * 0.5, Math.min(3, d + 2));
    };
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const v = n === 1 ? 0 : i / (n - 1) - 0.5;
      grow(t.x + v * w * 0.6, GY + 29, v * 2.2 + (rnd() - 0.5) * 0.3, 9 + rnd() * 7 + w * 0.1, 0);
    }
    roots.set(t, p);
    return p;
  }

  function underground(ctx, g, cam, x1, W) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(70,50,34,0.26)';
    for (const t of g.level.trees) {
      if (!t.hide || t.x < cam - 160 || t.x > x1 + 160) continue;
      const p = rootsOf(t);
      for (let d = 0; d < 4; d++) { ctx.lineWidth = ROOT_W[d]; ctx.stroke(p[d]); }
    }
    ctx.restore();
    ctx.fillStyle = W.band; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(cam - 10, GY + 196);
    for (let x = Math.floor(cam / 20) * 20; x <= x1; x += 20) ctx.lineTo(x, GY + 194 + 3 * Math.sin(x * 0.013) + 2 * Math.sin(x * 0.041));
    for (let x = x1; x >= cam - 20; x -= 20) ctx.lineTo(x, GY + 226 + 4 * Math.sin(x * 0.011 + 2));
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    const sh = new Path2D(), body = new Path2D(), hi = new Path2D(), lens = new Path2D(), rime = new Path2D();
    for (let x = Math.floor(cam / 64) * 64 - 64; x < x1 + 64; x += 64) {
      for (let k = 0; k < 3; k++) {
        const h = hash(x * 0.013 + k * 5.1), d = 44 + Math.pow(hash(x * 0.029 + k * 2.3), 1.4) * 320, r = 2.6 + h * 8, sx = x + hash(x * 0.07 + k) * 64;
        if (Math.abs(d - 71) < r + 4 && h < 0.5) continue;
        sh.moveTo(sx + 1.2 + r, GY + d + 1.4); sh.ellipse(sx + 1.2, GY + d + 1.4, r, r * 0.7, 0, 0, TAU);
        body.moveTo(sx + r, GY + d); body.ellipse(sx, GY + d, r, r * 0.68, 0, 0, TAU);
        hi.moveTo(sx - r * 0.25 + r * 0.45, GY + d - r * 0.28); hi.ellipse(sx - r * 0.25, GY + d - r * 0.28, r * 0.45, r * 0.22, 0, 0, TAU);
      }
      const hl = hash(x * 0.017 + 7);
      if (hl > 0.45) { const lx = x + hash(x * 0.05) * 50, ly = GY + 40 + hl * 170, lr = 7 + hl * 16; lens.moveTo(lx + lr, ly); lens.ellipse(lx, ly, lr, 1.3 + hl, 0, 0, TAU); }
    }
    for (let x = Math.floor(cam / 7) * 7; x < x1; x += 7) {
      const h = hash(x * 0.071 + 0.3);
      if (h < 0.35) continue;
      const y = GY + 31 + hash(x * 0.13) * 16, l = 1.6 + h * 3.6;
      rime.rect(x + h * 4, y, 0.9, l);
      if (h > 0.86) rime.rect(x, GY + 50 + hash(x * 0.19) * 90, 1.2, 1.2);
    }
    ctx.fillStyle = 'rgba(30,22,16,0.28)'; ctx.fill(sh);
    ctx.fillStyle = '#8a837c'; ctx.fill(body);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill(hi);
    ctx.fillStyle = 'rgba(214,232,246,0.38)'; ctx.fill(lens);
    ctx.fillStyle = 'rgba(255,255,255,' + W.frostA.toFixed(3) + ')'; ctx.fill(rime);
  }

  function slush(ctx, cam, x1, k) {
    for (let x = Math.floor(cam / 150) * 150 - 150; x < x1; x += 150) {
      const h = hash(x * 0.0071 + 5);
      if (h < 0.35) continue;
      const cx = x + hash(x * 0.013) * 100, w = 22 + h * 46, y = GY + 3.5 + hash(x * 0.03) * 3.5;
      ctx.fillStyle = 'rgba(104,104,94,' + (0.3 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(cx, y, w, 2.4 + h * 1.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(86,84,74,' + (0.28 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(cx + w * 0.2, y + 0.6, w * 0.55, 1.3 + h, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(236,242,246,' + (0.45 * k).toFixed(3) + ')';
      ctx.fillRect(cx - w * 0.45, y - 1.6, w * 0.5, 0.9);
    }
    ctx.fillStyle = 'rgba(88,76,60,' + (0.32 * k).toFixed(3) + ')';
    for (let x = Math.floor(cam / 29) * 29; x < x1; x += 29) {
      const h = hash(x * 0.017 + 9);
      if (h > 0.55) ctx.fillRect(x + h * 20, GY + 1 + h * 9, 1.6, 1.2);
    }
  }

  function stalks(ctx, cam, x1, W, amp) {
    ctx.strokeStyle = W.stalk; ctx.lineWidth = 1.15; ctx.lineCap = 'round';
    const heads = new Path2D();
    ctx.beginPath();
    for (let x = Math.floor(cam / 53) * 53 - 53; x < x1; x += 53) {
      const h = hash(x * 0.019 + 1.3);
      if (h < 0.58) continue;
      const bx = x + hash(x * 0.07) * 40, by = GY - drift(bx, amp) + 1.5;
      for (let k = 0; k < 3; k++) {
        const lean = (hash(x + k * 7.7) - 0.5) * 9, ht = 7 + hash(x * 0.3 + k) * 13, sx = bx + k * 3.2 - 3;
        ctx.moveTo(sx, by); ctx.quadraticCurveTo(sx + lean * 0.2, by - ht * 0.6, sx + lean, by - ht);
        if (k !== 1) { heads.moveTo(sx + lean + 1.1, by - ht - 1); heads.ellipse(sx + lean, by - ht - 1, 1.1, 2.6, lean * 0.06, 0, TAU); }
      }
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = W.stalk; ctx.fill(heads);
  }

  function sparkle(ctx, cam, x1, t, k, amp) {
    ctx.fillStyle = '#ffffff';
    for (let x = Math.floor(cam / 13) * 13; x < x1; x += 13) {
      const h = hash(x * 0.031 + 0.7), tw = Math.sin(t * (0.9 + h * 1.4) + h * 40);
      if (tw < 0.9) continue;
      const a = Math.pow((tw - 0.9) / 0.1, 2) * k;
      const sx = x + hash(x * 0.11) * 12, sy = GY - drift(sx, amp) + 1.2 + hash(x * 0.23) * 11, r = 0.7 + (1.2 + h * 1.6) * a;
      ctx.globalAlpha = a;
      ctx.fillRect(sx - r, sy - 0.4, r * 2, 0.8); ctx.fillRect(sx - 0.4, sy - r, 0.8, r * 2);
      ctx.globalAlpha = a * 0.6;
      ctx.fillRect(sx - 0.9, sy - 0.9, 1.8, 1.8);
    }
    ctx.globalAlpha = 1;
  }

  let printGeo = null;
  function printShapes() {
    if (printGeo) return printGeo;
    const mk = (px, rx, ry, toe) => {
      const p = new Path2D();
      p.moveTo(px + rx, 0); p.ellipse(px, 0, rx, ry, 0, 0, TAU);
      for (let i = 0; i < 5; i++) {
        const v = i / 4 - 0.5, x = toe - Math.abs(v) * 1.8, y = v * 4.6;
        p.moveTo(x + 1.15, y); p.ellipse(x, y, 1.15, 0.62, 0, 0, TAU);
      }
      return p;
    };
    printGeo = [mk(0, 4.3, 1.8, 6.2), mk(-2, 6.6, 1.55, 6.4)];
    return printGeo;
  }

  const seen = new WeakMap();
  let stepN = 0;
  function tracks(ctx, g, viewW) {
    const T = g.tracks;
    if (!T || !T.length || !cold(g)) return;
    const W = look(g), cam = g.cam || 0, geo = printShapes(), life = W.trackLife, hold = life * 0.12;
    for (let i = 0; i < T.length; i++) {
      const tr = T[i];
      let n = seen.get(tr);
      if (n === undefined) { n = stepN++; seen.set(tr, n); }
      if (!(tr.x > cam - 40 && tr.x < cam + viewW + 40)) continue;
      const a = 1 - smooth((g.time - tr.t - hold) / (life - hold));
      if (!(a > 0.01)) continue;
      const d = tr.dir < 0 ? -1 : 1, far = n & 1, run = tr.run ? 1 : 0, y = GY + (far ? 2.7 : 6.4), k = far ? 0.84 : 1;
      ctx.globalAlpha = Math.min(1, a);
      for (let s = 0; s < 2; s++) {
        ctx.save();
        ctx.translate(tr.x + d * s * (8 + run * 7), y); ctx.scale(d * k * (1 + run * 0.18), k);
        ctx.fillStyle = W.trackRim; ctx.translate(0, 0.9); ctx.fill(geo[s]);
        ctx.fillStyle = W.track; ctx.translate(0, -0.9); ctx.fill(geo[s]);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  ZS.render = ZS.render || {};
  ZS.render.backdrop = { sky, backForest, ground, tracks, look, grow, cap, cold };
})();
