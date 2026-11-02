(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, hypot = Math.hypot, asin = Math.asin;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(sin(n * 127.1 + 311.7) * 43758.5453);
  const hash2 = (a, b) => hash(a * 57.31 + b * 13.97 + 0.17);
  const { label, rrect, circle, ellipse } = ZS.gfx;
  const LIFT = () => ZS.sim.lift;

  const CAM = { h: 11.0, x: 0, cable: 10.2, ret: -5.6, col: -2.8 };
  const RIG = { rt: 190, half: 126 };
  const BEAR = { fur: '#6b4226', far: '#4e2f19', ear: '#3f2614', muzzle: '#9a6a44', dark: '#1d1209', pad: '#2b1a10', claw: '#e4d6bb', tag: '#f6c814', tagEdge: '#b98a0c' };
  const SKY = { spring: ['#a7d8f5', '#eaf7ff'], summer: ['#7cc4ef', '#d8f1ff'], autumn: ['#efb57c', '#fbe6c8'] };
  const LEAF = { spring: '#4f8a45', summer: '#3d7238', autumn: '#a8692c' };
  const JACKETS = ['#e8590c', '#2f86c8', '#7b5ea7', '#2f8f4e', '#d6336c', '#f2b51e'];
  const V = { k: 1, f: 312, cx: 0, vx: 0, hz: 0, top: 0, bot: 540, w: 760, gx: 0, gy: 0, zc: 2.4, near: 4 };
  const PT = [0, 0];

  function setup(viewW, offY) {
    const k = clamp((viewW / 2 - 8) / 280, 0.55, 1);
    V.k = k; V.f = 312 * k; V.w = viewW; V.cx = viewW / 2;
    V.zc = LIFT().GEO.zc;
    V.top = -offY; V.bot = 540 + offY / 0.45 - offY;
    V.hz = 100 + offY * 0.75;
    V.vx = V.cx + V.f * CAM.x / V.zc;
    V.gx = V.cx; V.gy = V.hz + V.f * (CAM.h - CAM.cable) / V.zc;
    V.near = V.f * CAM.h / (V.bot - V.hz + 20);
  }

  function P(x, y, z, out) {
    const o = out || PT;
    o[0] = V.vx + V.f * (x - CAM.x) / z;
    o[1] = V.hz + V.f * (CAM.h - y) / z;
    return o;
  }
  const S = (z) => V.f / z;

  const rgbs = new Map();
  function rgb(c) {
    if (Array.isArray(c)) return c;
    let v = rgbs.get(c);
    if (!v) {
      if (c[0] === '#') v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
      else v = c.replace(/[^\d.,]/g, '').split(',').map(Number).slice(0, 3);
      rgbs.set(c, v);
    }
    return v;
  }
  function mix(a, b, t, al) {
    const A = rgb(a), B = rgb(b), u = clamp(t, 0, 1);
    const r = Math.round(A[0] + (B[0] - A[0]) * u), g = Math.round(A[1] + (B[1] - A[1]) * u), bl = Math.round(A[2] + (B[2] - A[2]) * u);
    return al === undefined || al >= 1 ? 'rgb(' + r + ',' + g + ',' + bl + ')' : 'rgba(' + r + ',' + g + ',' + bl + ',' + clamp(al, 0, 1).toFixed(3) + ')';
  }

  function palette(g) {
    const season = g.seasonKey;
    if (g.level.theme === 'winter') {
      const W = ZS.render.backdrop.look(g), R = W.raw, c = (v) => mix(v, v, 0);
      const deep = season === 'frost' ? 1 : season === 'snow' ? 0.7 : 0.35;
      return {
        winter: true, skyTop: W.skyTop, skyBot: W.skyBot, haze: c(R.skyBot), glow: W.glow, sun: W.sun, cloud: W.cloud, cloudA: W.cloudA,
        mt: c(R.mtTop), mtLow: c(R.mtLow), mtShade: c(R.mtShade), mtRock: c(R.mtRock), rockA: W.rockA, snowCap: c(R.mtTop),
        far: c(R.gLow), near: c(R.gTop), shade: c(R.gShade), piste: '#ffffff', line: c(R.gShade), edge: c(R.gMid),
        spruce: c(R.spruce), spruceLit: c(R.spruce2), leaf: c(R.bfTwig), trunk: c(R.bfTrunk), snow: c(R.snow), snowShade: c(R.snowShade),
        flakes: season === 'snow' ? 1 : season === 'advent' ? 0.35 : 0, sparkle: W.sparkle, deep,
      };
    }
    const sky = SKY[season] || SKY.spring, autumn = season === 'autumn';
    return {
      winter: false, skyTop: sky[0], skyBot: sky[1], haze: sky[1], glow: 0, sun: 0, cloud: '#ffffff', cloudA: 0.5,
      mt: '#8399ae', mtLow: '#9db0c2', mtShade: '#71879c', mtRock: '#5f7287', rockA: 0.5, snowCap: '#f4f6f8',
      far: autumn ? '#9aae6a' : '#86b56a', near: autumn ? '#7f9a3f' : '#5f9a3e', shade: '#4f8a35', strip: autumn ? '#8fa64c' : '#6ea845',
      trail: '#c4a476', trailDark: '#9a7b52', spruce: '#28503a', spruceLit: '#356548', leaf: LEAF[season] || LEAF.summer, trunk: '#5e574d',
      flakes: 0, sparkle: 0, deep: 0,
    };
  }

  function view(g) {
    const r = g.ride, lift = LIFT(), T = lift.T;
    let zcam = 0, tau = 0;
    if (r.phase === 'ride') { zcam = lift.SPEED * r.t; tau = r.t; }
    else { const u = clamp(r.t / 0.9, 0, 1); zcam = lift.LEN + 2.6 * (1 - (1 - u) * (1 - u)); tau = T.ride + r.t; }
    return { zcam, tau, zTop: lift.GEO.top - zcam };
  }

  function sky(ctx, p, t) {
    const gr = ctx.createLinearGradient(0, V.top, 0, V.hz + 40 * V.k);
    gr.addColorStop(0, p.skyTop); gr.addColorStop(1, p.skyBot);
    ctx.fillStyle = gr; ctx.fillRect(-2, V.top - 2, V.w + 4, V.bot - V.top + 4);
    if (p.glow > 0.01) {
      const x = V.w * 0.18, y = V.hz - 150 * V.k, R = 260 * V.k;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, R);
      rg.addColorStop(0, 'rgba(255,251,238,' + (0.6 * p.glow).toFixed(3) + ')'); rg.addColorStop(0.2, 'rgba(255,248,232,' + (0.25 * p.glow).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,246,230,0)');
      ctx.fillStyle = rg; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      if (p.sun > 0.01) { ctx.globalAlpha = p.sun; ctx.fillStyle = '#fffcf1'; circle(ctx, x, y, 15 * V.k); ctx.globalAlpha = 1; }
    }
    if (p.cloudA > 0.01) {
      ctx.fillStyle = p.cloud;
      for (let l = 0; l < 2; l++) {
        ctx.globalAlpha = p.cloudA * (0.55 + l * 0.25);
        ctx.beginPath();
        const gap = (260 + l * 120) * V.k, off = t * (3 + l * 3) * V.k, y0 = V.hz - (150 - l * 55) * V.k;
        for (let i = Math.floor((off - 400) / gap); i * gap - off < V.w + 300; i++) {
          const h1 = hash(i * 3.17 + l * 41), h2 = hash(i * 7.31 + l * 13), cx = i * gap - off + h1 * 90 * V.k, cy = y0 - h2 * 40 * V.k;
          const rx = (70 + h2 * 60) * V.k, ry = (11 + h1 * 7) * V.k;
          ctx.moveTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
          ctx.moveTo(cx + rx * 0.7, cy - ry * 0.7); ctx.ellipse(cx + rx * 0.2, cy - ry * 0.7, rx * 0.5, ry * 0.95, 0, 0, TAU);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  const PEAKS = [[-0.25, 30], [-0.12, 120], [-0.02, 70], [0.08, 175], [0.16, 105], [0.24, 150], [0.33, 60], [0.42, 205], [0.5, 120], [0.57, 165],
    [0.66, 80], [0.74, 190], [0.83, 110], [0.92, 150], [1.02, 70], [1.12, 135], [1.25, 40]];
  function mountains(ctx, p) {
    const base = V.hz + 46 * V.k, w = V.w, k = V.k * 0.9, sx = (u) => V.vx + (u - 0.5) * max(w, 760 * V.k) * 1.15;
    const pts = PEAKS.map(([u, h], i) => [sx(u), V.hz + 26 * V.k - h * k - hash(i * 2.3) * 12 * k]);
    ctx.beginPath(); ctx.moveTo(sx(-0.3), base);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(sx(1.3), base); ctx.closePath();
    const gr = ctx.createLinearGradient(0, V.hz - 190 * k, 0, base);
    gr.addColorStop(0, mix(p.mt, p.haze, 0.15)); gr.addColorStop(1, mix(p.mtLow, p.haze, 0.45));
    ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = mix(p.mtShade, p.haze, 0.3);
    ctx.beginPath();
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      if (y > pts[i - 1][1] || y > pts[i + 1][1]) continue;
      const [nx, ny] = pts[i + 1];
      ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.lineTo(nx, base); ctx.lineTo(x + (nx - x) * 0.25, base); ctx.lineTo(x + (nx - x) * 0.1, y + (base - y) * 0.45); ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = p.snowCap;
    ctx.beginPath();
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], l = pts[i - 1], r = pts[i + 1];
      if (y > l[1] || y > r[1] || V.hz - y < 90 * k) continue;
      const a = p.winter ? 0.42 : 0.24;
      ctx.moveTo(x, y); ctx.lineTo(x + (l[0] - x) * a, y + (l[1] - y) * a);
      ctx.lineTo(x + (l[0] - x) * a * 0.55, y + (l[1] - y) * a * 0.75); ctx.lineTo(x, y + (base - y) * a * 0.3);
      ctx.lineTo(x + (r[0] - x) * a * 0.6, y + (r[1] - y) * a * 0.7); ctx.lineTo(x + (r[0] - x) * a, y + (r[1] - y) * a); ctx.closePath();
    }
    ctx.fill();
  }

  function ground(ctx, p, zTop) {
    const yc = V.hz + V.f * CAM.h / zTop;
    const gr = ctx.createLinearGradient(0, yc, 0, V.bot);
    gr.addColorStop(0, mix(p.far, p.haze, 0.35)); gr.addColorStop(0.35, p.far); gr.addColorStop(1, p.near);
    ctx.fillStyle = gr; ctx.fillRect(-2, yc, V.w + 4, V.bot - yc + 2);
    return yc;
  }

  function band(ctx, x0, x1, zFar, zNear) {
    const a = P(x0, 0, zFar, [0, 0]), b = P(x1, 0, zFar, [0, 0]), c = P(x1, 0, zNear, [0, 0]), d = P(x0, 0, zNear, [0, 0]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
  }

  function ribbon(ctx, zcam, zTop, center, half, step) {
    const L = [], R = [];
    for (let z = Math.max(V.near * 0.8, 0.5); z < zTop; z += step(z)) {
      const c = center(zcam + z), w = half(zcam + z);
      L.push(P(c - w, 0, z, [0, 0])); R.push(P(c + w, 0, z, [0, 0]));
    }
    const c = center(zcam + zTop), w = half(zcam + zTop);
    L.push(P(c - w, 0, zTop, [0, 0])); R.push(P(c + w, 0, zTop, [0, 0]));
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (const q of L) ctx.lineTo(q[0], q[1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    return [L, R];
  }

  const trailAt = (zw) => 5.8 + 2.4 * sin(zw * 0.045) + 1.2 * sin(zw * 0.13 + 1);
  const pisteAt = (zw) => 6.5 + 3.2 * sin(zw * 0.032 + 0.6);
  const AISLE = { summer: [-14.8, 12.6], winter: [-19.5, 21.5] };
  const stepOf = (z) => max(0.6, z * 0.12);

  function aisle(ctx, p, zcam, zTop) {
    if (!p.winter) {
      ctx.fillStyle = mix(p.strip, p.haze, 0.12); band(ctx, -7.4, 1.8, zTop, V.near * 0.8);
      ctx.fillStyle = mix(p.trailDark, p.far, 0.15); ribbon(ctx, zcam, zTop, (zw) => trailAt(zw) + 0.08, () => 0.78, stepOf); ctx.fill();
      ctx.fillStyle = p.trail; ribbon(ctx, zcam, zTop, trailAt, () => 0.62, stepOf); ctx.fill();
      return;
    }
    ctx.fillStyle = mix(p.shade, p.near, 0.55); ribbon(ctx, zcam, zTop, (zw) => pisteAt(zw) + 0.3, () => 6.9, stepOf); ctx.fill();
    ctx.fillStyle = mix(p.piste, p.haze, 0.1); const [L, R] = ribbon(ctx, zcam, zTop, pisteAt, () => 6.6, stepOf); ctx.fill();
    ctx.strokeStyle = mix(p.line, p.piste, 0.45, 0.55); ctx.lineWidth = max(0.6, 0.9 * V.k);
    ctx.beginPath();
    for (let j = 1; j < 9; j++) {
      const f = j / 9;
      for (let i = 0; i < L.length; i++) { const x = lerp(L[i][0], R[i][0], f), y = lerp(L[i][1], R[i][1], f); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    }
    ctx.stroke();
  }

  function marks(ctx, p, zcam, zTop) {
    const lim = min(zTop - 1, 58), i0 = Math.ceil((zcam + V.near * 0.7) / 2.4), i1 = Math.floor((zcam + lim) / 2.4);
    const tuft = new Path2D(), stones = [], flowers = [[], [], [], []], lumps = [];
    for (let i = i0; i <= i1; i++) {
      const zw = i * 2.4;
      for (let j = -7; j <= 6; j++) {
        const h = hash2(i, j);
        if (h < 0.5) continue;
        const x = j * 2.05 + (hash2(j, i) - 0.5) * 1.8, z = zw + (hash2(i + 0.5, j) - 0.5) * 2 - zcam;
        if (z < V.near * 0.7 || z > lim) continue;
        const q = P(x, 0, z), s = S(z);
        if (q[0] < -40 || q[0] > V.w + 40) continue;
        const kind = hash2(i * 1.7, j * 0.3);
        if (p.winter) {
          if (abs(x - pisteAt(zw)) < 6.4) continue;
          lumps.push([q[0], q[1], s, kind]);
          continue;
        }
        if (abs(x - trailAt(zw)) < 0.9) continue;
        if (kind < 0.55) { const w = 0.16 * s, hh = 0.32 * s; tuft.moveTo(q[0] - w, q[1] - hh); tuft.lineTo(q[0], q[1]); tuft.lineTo(q[0] + w * 0.6, q[1] - hh * 1.1); tuft.moveTo(q[0], q[1]); tuft.lineTo(q[0] + w * 1.4, q[1] - hh * 0.7); }
        else if (kind < 0.86) flowers[Math.floor(hash2(i, j * 3) * 4)].push([q[0], q[1] - 0.12 * s, max(0.9, 0.07 * s)]);
        else stones.push([q[0], q[1], s]);
      }
    }
    if (p.winter) {
      for (const [x, y, s, kd] of lumps) {
        const w = (0.5 + kd * 0.7) * s;
        ctx.fillStyle = mix(p.shade, p.near, 0.4, 0.7); ellipse(ctx, x + w * 0.15, y, w, w * 0.16);
        ctx.fillStyle = mix(p.near, '#ffffff', 0.5); ellipse(ctx, x - w * 0.1, y - w * 0.06, w * 0.8, w * 0.12);
      }
      return;
    }
    ctx.strokeStyle = p.shade; ctx.lineWidth = max(0.7, 1.1 * V.k); ctx.lineCap = 'round'; ctx.stroke(tuft);
    const COL = ['#ffffff', '#f4d03f', '#e84a5f', '#9b7fd1'];
    flowers.forEach((list, c) => { ctx.fillStyle = COL[c]; ctx.beginPath(); for (const [x, y, r] of list) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); } ctx.fill(); });
    for (const [x, y, s] of stones) {
      ctx.fillStyle = 'rgba(40,40,30,0.18)'; ellipse(ctx, x + 0.08 * s, y, 0.42 * s, 0.09 * s);
      ctx.fillStyle = '#9a958d'; ellipse(ctx, x, y - 0.12 * s, 0.36 * s, 0.17 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ellipse(ctx, x - 0.1 * s, y - 0.2 * s, 0.16 * s, 0.06 * s);
    }
  }

  function forest(ctx, p, zcam, zTop, theme) {
    const edges = AISLE[theme] || AISLE.summer, BUCK = [0, 14, 26, 44, 75, 1e9];
    const sets = BUCK.slice(0, -1).map(() => ({ dark: new Path2D(), lit: new Path2D(), snow: new Path2D(), leaf: new Path2D(), trunk: new Path2D(), n: 0 }));
    for (const side of [-1, 1]) {
      const edge = side < 0 ? edges[0] : edges[1];
      for (let j = 0; j < 4; j++) {
        const gap = 3.1 + j * 0.4, i0 = Math.ceil((zcam + 3) / gap), i1 = Math.floor((zcam + zTop - 1.2) / gap);
        for (let i = i1; i >= i0; i--) {
          const h1 = hash2(i * 1.31 + side * 7, j), h2 = hash2(j * 3.1 + side, i * 0.7);
          const z = i * gap + (h1 - 0.5) * gap * 0.8 - zcam;
          if (z < 3 || z > zTop - 1) continue;
          const x = edge + side * (j * 4.3 + h2 * 1.8), q = P(x, 0, z), s = S(z);
          const hgt = 13 + h1 * 9 - j * 0.6, half = (0.25 + h2 * 0.05) * hgt * s;
          if (q[0] + half < -10 || q[0] - half > V.w + 10) continue;
          const B = sets[BUCK.findIndex((b, bi) => z >= b && z < BUCK[bi + 1])];
          B.n++;
          const top = q[1] - hgt * s, base = q[1] + 0.2 * s;
          if (!p.winter && h2 > 0.74 && j > 0 && z > 9) {
            const R = hgt * 0.24 * s, cy = base - hgt * 0.62 * s;
            B.trunk.rect(q[0] - 0.18 * s, cy, 0.36 * s, base - cy);
            B.leaf.moveTo(q[0] + R, cy); B.leaf.arc(q[0], cy, R, 0, TAU);
            B.leaf.moveTo(q[0] - R * 0.35 + R * 0.75, cy - R * 0.55); B.leaf.arc(q[0] - R * 0.35, cy - R * 0.55, R * 0.75, 0, TAU);
            B.leaf.moveTo(q[0] + R * 0.45 + R * 0.7, cy - R * 0.4); B.leaf.arc(q[0] + R * 0.45, cy - R * 0.4, R * 0.7, 0, TAU);
            continue;
          }
          const tiers = 3;
          for (let k = 0; k < tiers; k++) {
            const y0 = lerp(base, top + (base - top) * 0.32, k / tiers), w = half * (1 - k * 0.24), yt = k === tiers - 1 ? top : lerp(base, top, (k + 1.35) / tiers);
            B.dark.moveTo(q[0] - w, y0); B.dark.lineTo(q[0], yt); B.dark.lineTo(q[0] + w, y0);
            B.lit.moveTo(q[0] - w, y0); B.lit.lineTo(q[0], yt); B.lit.lineTo(q[0] - w * 0.1, y0);
            if (p.winter && p.deep > 0.2) {
              const sw = w * 0.62, sy = lerp(y0, yt, 0.55);
              B.snow.moveTo(q[0], yt - 0.5); B.snow.lineTo(q[0] + sw * 0.5, sy); B.snow.lineTo(q[0] + sw * 0.1, sy + (y0 - sy) * 0.12); B.snow.lineTo(q[0] - sw * 0.35, sy - (y0 - sy) * 0.05); B.snow.lineTo(q[0] - sw * 0.55, sy + (y0 - sy) * 0.1);
              B.snow.moveTo(q[0] - w * 0.95, y0); B.snow.lineTo(q[0] - w * 0.55, y0 - (y0 - yt) * 0.22); B.snow.lineTo(q[0] - w * 0.2, y0 - (y0 - yt) * 0.05);
            }
          }
          B.trunk.rect(q[0] - 0.14 * s, base - 0.9 * s, 0.28 * s, 0.9 * s);
        }
      }
    }
    for (let b = sets.length - 1; b >= 0; b--) {
      const B = sets[b];
      if (!B.n) continue;
      const hz = [0.04, 0.12, 0.24, 0.4, 0.58][b];
      ctx.fillStyle = mix(p.trunk, p.haze, hz); ctx.fill(B.trunk);
      ctx.fillStyle = mix(p.spruce, p.haze, hz); ctx.fill(B.dark);
      ctx.fillStyle = mix(p.spruceLit, p.haze, hz, 0.9); ctx.fill(B.lit);
      if (p.winter) { ctx.fillStyle = mix(p.snow, p.haze, hz * 0.6); ctx.globalAlpha = 0.55 + 0.45 * p.deep; ctx.fill(B.snow); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = mix(p.leaf, p.haze, hz); ctx.fill(B.leaf); }
    }
  }

  function quad(ctx, a, b, wa, wb) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.beginPath();
    ctx.moveTo(a[0] + nx * wa, a[1] + ny * wa); ctx.lineTo(b[0] + nx * wb, b[1] + ny * wb);
    ctx.lineTo(b[0] - nx * wb, b[1] - ny * wb); ctx.lineTo(a[0] - nx * wa, a[1] - ny * wa);
    ctx.closePath(); ctx.fill();
  }

  function pylon(ctx, p, z, n, front) {
    const hz = smooth((z - 20) / 120) * 0.5, s = S(z), steel = mix('#6f7a84', p.haze, hz), dark = mix('#55606a', p.haze, hz), x = CAM.col;
    const b = P(x, 0, z, [0, 0]), tp = P(x, 11.3, z, [0, 0]);
    if (!front) {
      ctx.fillStyle = mix(p.winter ? '#c9d2da' : '#9a958d', p.haze, hz); ctx.fillRect(b[0] - 0.9 * s, b[1] - 0.5 * s, 1.8 * s, 0.6 * s);
    }
    ctx.fillStyle = steel; quad(ctx, [b[0] - 0.42 * s, b[1]], [tp[0] - 0.2 * s, tp[1]], 0.13 * s, 0.09 * s);
    ctx.fillStyle = dark; quad(ctx, [b[0] + 0.42 * s, b[1]], [tp[0] + 0.2 * s, tp[1]], 0.13 * s, 0.09 * s);
    ctx.strokeStyle = dark; ctx.lineWidth = max(0.6, 0.06 * s);
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const u0 = i / 9, u1 = (i + 1) / 9, y0 = lerp(b[1], tp[1], u0), y1 = lerp(b[1], tp[1], u1), w0 = lerp(0.42, 0.2, u0) * s, w1 = lerp(0.42, 0.2, u1) * s, xc0 = lerp(b[0], tp[0], u0), xc1 = lerp(b[0], tp[0], u1);
      ctx.moveTo(xc0 - w0, y0); ctx.lineTo(xc1 + w1, y1); ctx.moveTo(xc0 + w0, y0); ctx.lineTo(xc1 - w1, y1);
    }
    ctx.stroke();
    const l = P(-6.7, 11.15, z, [0, 0]), r = P(0.75, 11.15, z, [0, 0]);
    ctx.fillStyle = mix('#4f5962', p.haze, hz); rrect(ctx, l[0], l[1] - 0.22 * s, r[0] - l[0], 0.44 * s, min(3, 0.12 * s));
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(l[0], l[1] - 0.22 * s, r[0] - l[0], 0.08 * s);
    for (const lx of [0, CAM.ret]) {
      const q = P(lx, 10.55, z, [0, 0]);
      ctx.strokeStyle = mix('#3a4147', p.haze, hz); ctx.lineWidth = max(0.8, 0.09 * s);
      ctx.beginPath(); ctx.moveTo(q[0], l[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      ctx.fillStyle = mix('#2b3138', p.haze, hz); rrect(ctx, q[0] - 0.5 * s, q[1] - 0.12 * s, s, 0.26 * s, min(3, 0.1 * s));
      ctx.fillStyle = mix('#7a848d', p.haze, hz);
      for (let i = -1; i <= 1; i++) circle(ctx, q[0] + i * 0.32 * s, q[1] + 0.14 * s, 0.11 * s);
    }
    ctx.fillStyle = '#e8b92a'; ctx.fillRect(tp[0] - 0.18 * s, lerp(b[1], tp[1], 0.62), 0.36 * s, 0.4 * s);
    if (s > 9) { ctx.fillStyle = '#1d1d1d'; ctx.font = '800 ' + (0.28 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n + 1), tp[0], lerp(b[1], tp[1], 0.62) + 0.2 * s); }
    if (p.winter && p.deep > 0.2) {
      ctx.fillStyle = p.snow; ctx.globalAlpha = p.deep;
      ctx.fillRect(l[0] + 0.1 * s, l[1] - 0.3 * s, r[0] - l[0] - 0.2 * s, 0.1 * s);
      ctx.globalAlpha = 1;
    }
  }

  function seatFront(ctx, x, y, s, col, riders, seed, t, winter) {
    const sw = 0.04 * sin(t * 1.3 + seed * 4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.strokeStyle = '#3a4147'; ctx.lineWidth = max(0.7, 0.07 * s);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.55 * s); ctx.moveTo(-0.95 * s, 2.35 * s); ctx.quadraticCurveTo(-0.95 * s, 1.55 * s, 0, 1.55 * s); ctx.quadraticCurveTo(0.95 * s, 1.55 * s, 0.95 * s, 2.35 * s); ctx.stroke();
    ctx.fillStyle = col; rrect(ctx, -1.0 * s, 1.75 * s, 2.0 * s, 0.6 * s, 0.12 * s);
    for (let i = 0; i < riders; i++) {
      const rx = (riders === 1 ? 0 : i ? 0.45 : -0.45) * s, jc = JACKETS[Math.floor(hash(seed * 3 + i) * JACKETS.length)];
      ctx.fillStyle = jc; rrect(ctx, rx - 0.27 * s, 1.95 * s, 0.54 * s, 0.6 * s, 0.14 * s);
      ctx.fillStyle = '#33415c'; rrect(ctx, rx - 0.24 * s, 2.45 * s, 0.48 * s, 0.32 * s, 0.1 * s);
      ctx.fillStyle = '#f0c8a0'; circle(ctx, rx, 1.82 * s, 0.17 * s);
      ctx.fillStyle = winter ? JACKETS[(Math.floor(seed * 7) + i + 2) % JACKETS.length] : '#6b4a2b'; ctx.beginPath(); ctx.arc(rx, 1.78 * s, 0.18 * s, PI, TAU); ctx.fill();
    }
    ctx.fillStyle = mix(col, '#000000', 0.25); rrect(ctx, -1.0 * s, 2.32 * s, 2.0 * s, 0.14 * s, 0.07 * s);
    ctx.strokeStyle = '#b9bfc5'; ctx.lineWidth = max(0.6, 0.06 * s);
    ctx.beginPath(); ctx.moveTo(-0.9 * s, 2.0 * s); ctx.lineTo(-0.9 * s, 1.85 * s); ctx.lineTo(0.9 * s, 1.85 * s); ctx.lineTo(0.9 * s, 2.0 * s); ctx.stroke();
    ctx.restore();
  }

  function seatBack(ctx, x, y, s, col, riders, seed, t, winter) {
    const sw = 0.05 * sin(t * 1.1 + seed * 3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.strokeStyle = '#3a4147'; ctx.lineWidth = max(0.7, 0.07 * s);
    for (let i = 0; i < riders; i++) {
      const rx = (riders === 1 ? 0.2 : i ? 0.45 : -0.45) * s, jc = JACKETS[Math.floor(hash(seed * 5 + i) * JACKETS.length)];
      ctx.fillStyle = jc; rrect(ctx, rx - 0.28 * s, 1.55 * s, 0.56 * s, 0.6 * s, 0.16 * s);
      ctx.fillStyle = winter ? JACKETS[(Math.floor(seed * 11) + i + 3) % JACKETS.length] : '#5a3d22'; circle(ctx, rx, 1.47 * s, 0.17 * s);
      if (winter && hash(seed + i) > 0.45) { ctx.fillStyle = '#26282c'; ctx.fillRect(rx - 0.17 * s, 1.43 * s, 0.34 * s, 0.06 * s); }
    }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.1 * s); ctx.moveTo(-0.95 * s, 1.95 * s); ctx.quadraticCurveTo(-0.95 * s, 1.1 * s, 0, 1.1 * s); ctx.quadraticCurveTo(0.95 * s, 1.1 * s, 0.95 * s, 1.95 * s); ctx.stroke();
    ctx.fillStyle = col; rrect(ctx, -1.0 * s, 1.85 * s, 2.0 * s, 0.5 * s, 0.12 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-0.95 * s, 1.88 * s, 1.9 * s, 0.07 * s);
    ctx.restore();
  }

  const CHAIRS = ['#d2382b', '#e8b92a', '#2f6fb3'];
  function chairs(ctx, p, zcam, zTop, tau, list) {
    const lift = LIFT(), gap = 15;
    const off = frac((-2 * lift.SPEED * tau) / gap) * gap;
    for (let z = off + 1.4; z < zTop - 1.5; z += gap) {
      const n = Math.round((z + 2 * lift.SPEED * tau + zcam) / gap);
      const q = P(CAM.ret, CAM.cable, z, [0, 0]), s = S(z);
      if (q[0] < -3 * s || q[0] > V.w + 3 * s) continue;
      const riders = p.winter ? (hash(n * 1.7) > 0.8 ? 1 : 0) : (hash(n * 1.7) > 0.35 ? (hash(n * 2.9) > 0.5 ? 2 : 1) : 0);
      list.push({ z, draw: () => { ctx.globalAlpha = 1 - smooth((z - 40) / 60) * 0.4; seatFront(ctx, q[0], q[1], s, CHAIRS[Math.abs(n) % 3], riders, n, tau, p.winter); ctx.globalAlpha = 1; } });
    }
    for (let k = 1; k < 12; k++) {
      const z = V.zc + k * gap;
      if (z > zTop - 3.5) break;
      const q = P(0, CAM.cable, z, [0, 0]), s = S(z), riders = p.winter ? (hash(k * 3.3) > 0.25 ? (hash(k) > 0.5 ? 2 : 1) : 0) : (hash(k * 3.3) > 0.5 ? 1 : 0);
      list.push({ z, draw: () => seatBack(ctx, q[0], q[1], s, CHAIRS[k % 3], riders, k + 0.5, tau, p.winter) });
    }
  }

  function hunter(ctx, g, r, f, z, list) {
    const q = P(f.x, 0, z, [0, 0]), s = S(z), sh = s / 52;
    if (q[0] < -60 || q[0] > V.w + 60) return;
    const shot = r.shots.find((o) => o.foe === f);
    list.push({
      z, draw: () => {
        const h = f.h || (f.h = { kind: 'walker', x: 0, y: GY, dir: 1, aimAt: [0, 0], outfit: g.level.theme, armed: true });
        const face = f.x > 0 ? -1 : 1, aiming = shot && (shot.state === 'aim' || shot.state === 'fly' || r.t - shot.fire < 0.5);
        h.dir = face; h.cold = g.level.theme === 'winter' ? 0.6 : 0;
        h.state = aiming ? 'aim' : 'idle';
        h.kick = shot && shot.state !== 'aim' ? clamp(1 - (r.t - shot.fire) * 4, 0, 1) : 0;
        const tgt = shot ? zonePoint(shot.u) : [V.gx, V.gy + 180 * V.k];
        h.aimAt[0] = (tgt[0] - q[0]) / sh; h.aimAt[1] = GY + (tgt[1] - q[1]) / sh;
        ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(sh, sh); ctx.translate(0, -GY);
        ZS.drawHuman(ctx, h, g.time);
        ctx.restore();
        const mz = ZS.muzzle(h);
        f.mz = mz ? [q[0] + mz[0] * sh, q[1] + (mz[1] - GY) * sh] : [q[0] + face * 0.6 * s, q[1] - 1.4 * s];
        f.sp = [q[0], q[1] - 2.1 * s, s];
      },
    });
  }

  function tourists(ctx, g, r, zcam, zTop, list) {
    const ex = r.extras || (r.extras = []);
    for (let i = 0; i < 5; i++) {
      const zw = 30 + i * 31 + hash(i * 4.1) * 10, z = zw - zcam;
      if (z < 2 || z > zTop - 2) continue;
      const x = trailAt(zw) + (hash(i * 2.3) - 0.5) * 1.6, q = P(x, 0, z, [0, 0]), s = S(z), sh = s / 52;
      if (q[0] < -40 || q[0] > V.w + 40) continue;
      list.push({
        z, draw: () => {
          const h = ex[i] || (ex[i] = { kind: i % 3 === 2 ? 'picker' : 'tourist', x: 0, y: GY, dir: -1, aimAt: [0, 0], outfit: 'summer', id: 'liftT' + i + '_' + (r.x | 0) });
          h.state = h.kind === 'tourist' ? 'film' : 'idle';
          const tgt = [V.gx, V.gy + 160 * V.k];
          h.dir = tgt[0] < q[0] ? -1 : 1;
          h.aimAt[0] = (tgt[0] - q[0]) / sh; h.aimAt[1] = GY + (tgt[1] - q[1]) / sh;
          ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(sh, sh); ctx.translate(0, -GY);
          ZS.drawHuman(ctx, h, g.time);
          ctx.restore();
        },
      });
    }
  }

  const SKI = ['#e8402f', '#2f7ee0', '#f6c624', '#7b2fbf', '#25a35a', '#ff4fa3'];
  function skiers(ctx, zcam, zTop, tau, list) {
    for (let i = 0; i < 6; i++) {
      const sp = 8 + hash(i * 1.9) * 5, len = 150, v = (hash(i * 3.7) * len + sp * tau) % len, zw = zcam + zTop - 3 - v;
      const z = zw - zcam;
      if (z < 2.2 || z > zTop - 2) continue;
      const ph = tau * (0.9 + hash(i) * 0.5) + i * 2, x = pisteAt(zw) + sin(ph) * 3.8, q = P(x, 0, z, [0, 0]), s = S(z), lean = cos(ph) * 0.35;
      if (q[0] < -30 || q[0] > V.w + 30) continue;
      list.push({
        z, draw: () => {
          ctx.save(); ctx.translate(q[0], q[1]);
          ctx.fillStyle = 'rgba(120,150,190,0.3)'; ellipse(ctx, 0.1 * s, 0, 0.55 * s, 0.1 * s);
          ctx.strokeStyle = SKI[i % 6]; ctx.lineWidth = max(0.8, 0.09 * s); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-0.25 * s - lean * 0.3 * s, -0.04 * s); ctx.lineTo(-0.15 * s + lean * 0.3 * s, 0.25 * s); ctx.moveTo(0.18 * s - lean * 0.3 * s, -0.04 * s); ctx.lineTo(0.28 * s + lean * 0.3 * s, 0.25 * s); ctx.stroke();
          ctx.rotate(lean * 0.5);
          ctx.fillStyle = '#2f3a4a'; rrect(ctx, -0.22 * s, -0.75 * s, 0.44 * s, 0.72 * s, 0.1 * s);
          ctx.fillStyle = SKI[(i + 2) % 6]; rrect(ctx, -0.28 * s, -1.4 * s, 0.56 * s, 0.72 * s, 0.16 * s);
          ctx.fillStyle = '#f0c8a0'; circle(ctx, 0, -1.58 * s, 0.17 * s);
          ctx.fillStyle = SKI[(i + 4) % 6]; ctx.beginPath(); ctx.arc(0, -1.6 * s, 0.19 * s, PI, TAU); ctx.fill();
          ctx.fillStyle = '#26282c'; ctx.fillRect(-0.17 * s, -1.62 * s, 0.34 * s, 0.07 * s);
          ctx.strokeStyle = '#3a3f45'; ctx.lineWidth = max(0.5, 0.04 * s);
          ctx.beginPath(); ctx.moveTo(-0.3 * s, -1.0 * s); ctx.lineTo(-0.55 * s, 0); ctx.moveTo(0.3 * s, -1.0 * s); ctx.lineTo(0.55 * s, 0); ctx.stroke();
          ctx.restore();
        },
      });
    }
  }

  function markers(ctx, zcam, zTop, list) {
    const gap = 12, i0 = Math.ceil((zcam + 2.5) / gap), i1 = Math.floor((zcam + min(zTop - 1, 70)) / gap);
    for (let i = i0; i <= i1; i++) {
      const zw = i * gap, z = zw - zcam, c = pisteAt(zw);
      for (const side of [-1, 1]) {
        const q = P(c + side * 6.9, 0, z, [0, 0]), s = S(z), x = q[0], y = q[1];
        if (x < -10 || x > V.w + 10) continue;
        list.push({ z, draw: () => {
          ctx.fillStyle = side < 0 ? '#f07f1e' : '#1d1d1d'; ctx.fillRect(x - 0.05 * s, y - 1.5 * s, 0.1 * s, 1.5 * s);
          ctx.fillStyle = side < 0 ? '#1d1d1d' : '#f07f1e';
          for (let k = 0; k < 3; k++) ctx.fillRect(x - 0.05 * s, y - (1.5 - k * 0.5) * s, 0.1 * s, 0.25 * s);
        } });
      }
    }
    const cg = 46, c0 = Math.ceil((zcam + 4) / cg), c1 = Math.floor((zcam + zTop - 4) / cg);
    for (let i = c0; i <= c1; i++) {
      const zw = i * cg + 20, z = zw - zcam;
      if (z < 3 || z > zTop - 3) continue;
      const q = P(14.8, 0, z, [0, 0]), s = S(z);
      if (q[0] - 4 * s > V.w) continue;
      list.push({ z, draw: () => snowGun(ctx, q[0], q[1], s, i) });
    }
  }

  function snowGun(ctx, x, y, s, seed) {
    const t = LIFT_T;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#3a4148'; ctx.lineWidth = max(0.8, 0.1 * s);
    ctx.beginPath(); ctx.moveTo(-0.5 * s, 0); ctx.lineTo(0, -1.6 * s); ctx.lineTo(0.5 * s, 0); ctx.stroke();
    ctx.save(); ctx.translate(0, -1.8 * s); ctx.rotate(-0.35);
    ctx.fillStyle = '#f2b51e'; rrect(ctx, -1.6 * s, -0.5 * s, 1.9 * s, 1.0 * s, 0.4 * s);
    ctx.fillStyle = '#ffd760'; ctx.fillRect(-1.5 * s, -0.42 * s, 1.7 * s, 0.18 * s);
    ctx.fillStyle = '#3a4148'; ellipse(ctx, 0.3 * s, 0, 0.12 * s, 0.5 * s);
    ctx.restore();
    for (let i = 0; i < 9; i++) {
      const u = frac(t * 0.55 + i / 9 + seed * 0.37), px = -1.8 * s - u * 7 * s + sin(i * 2.1 + t) * 0.4 * s, py = -2.6 * s - u * 1.6 * s + u * u * 3.4 * s, rr = (0.3 + u * 1.3) * s;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * (1 - u)).toFixed(3) + ')'; circle(ctx, px, py, rr);
    }
    ctx.restore();
  }
  let LIFT_T = 0;

  function drone(ctx, r, f, list) {
    const shot = r.shots.find((o) => o.foe === f);
    const appear = f.appear, t = r.t;
    if (t < appear) return;
    const tin = smooth((t - appear) / 1.4), out = shot && shot.state === 'done' ? smooth((t - shot.at - 0.3) / 1.4) : 0;
    if (out >= 1) return;
    const z = lerp(16, 7.6, tin) + out * 6, x = lerp(9, 2.8, tin) + out * 7 + sin(LIFT_T * 1.3) * 0.25, y = lerp(15, 11.7, tin) + out * 5 + sin(LIFT_T * 2.1) * 0.12;
    const q = P(x, y, z, [0, 0]), s = S(z);
    list.push({ z, draw: () => {
      ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(s / 26, s / 26);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ellipse(ctx, 0, 14, 22, 3);
      ctx.fillStyle = '#30343a'; rrect(ctx, -16, -5, 32, 10, 4);
      ctx.fillRect(-26, -8, 52, 3);
      const w = 10 + abs(sin(LIFT_T * 40)) * 6;
      ellipse(ctx, -26, -10, w, 2); ellipse(ctx, 26, -10, w, 2);
      ctx.fillStyle = '#4a5058'; rrect(ctx, -5, 4, 10, 6, 2);
      ctx.fillStyle = '#1a1c20'; circle(ctx, 0, 8, 2.6);
      ctx.fillStyle = sin(LIFT_T * 6) > 0 ? '#ff3b30' : '#7a1d18'; circle(ctx, 10, 3, 2);
      ctx.fillStyle = '#5d7a3a'; ctx.fillRect(-12, -3, 7, 2);
      ctx.restore();
      f.mz = [q[0], q[1] + 8 * s / 26];
      f.sp = [q[0], q[1] - 0.6 * s, s];
    } });
  }

  function topStation(ctx, p, z, t) {
    if (z < 1) return;
    const s = S(z), hz = smooth((z - 25) / 120) * 0.45, at = (x, y) => P(x, y, z, [0, 0]);
    const wall = mix(p.winter ? '#b9a58d' : '#c9a373', p.haze, hz), wood = mix('#8a5a34', p.haze, hz), roof = mix('#4e3d35', p.haze, hz), conc = mix('#a8a59d', p.haze, hz);
    const g0 = at(-9.5, 0), g1 = at(3.6, 0), top = at(-3, 16.6);
    ctx.fillStyle = conc; ctx.fillRect(g0[0], g0[1] - 1.2 * s, g1[0] - g0[0], 1.3 * s);
    const w0 = at(-9, 12.2), w1 = at(3.2, 0);
    ctx.fillStyle = wall; ctx.fillRect(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1]);
    ctx.strokeStyle = 'rgba(70,40,18,0.22)'; ctx.lineWidth = max(0.5, 0.05 * s);
    ctx.beginPath(); for (let yy = 1; yy < 12; yy += 0.7) { const a = at(-9, yy), b = at(3.2, yy); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    const o0 = at(-7.6, 11.6), o1 = at(1.8, 5.8);
    ctx.fillStyle = mix('#2a2f33', p.haze, hz * 0.6); ctx.fillRect(o0[0], o0[1], o1[0] - o0[0], o1[1] - o0[1]);
    const bw = at(-2.8, 10.3);
    ctx.fillStyle = mix('#e8b92a', p.haze, hz); ellipse(ctx, bw[0], bw[1], 3.6 * s, 0.38 * s);
    ctx.fillStyle = mix('#4f5962', p.haze, hz); ellipse(ctx, bw[0], bw[1] - 0.05 * s, 3.1 * s, 0.24 * s);
    ctx.fillStyle = 'rgba(255,214,120,0.55)'; ctx.fillRect(o0[0] + 0.3 * s, o0[1] + 0.3 * s, o1[0] - o0[0] - 0.6 * s, 0.25 * s);
    const sg0 = at(-7.4, 13.9), sg1 = at(1.6, 12.4);
    ctx.fillStyle = mix('#2f4a35', p.haze, hz); ctx.fillRect(sg0[0], sg0[1], sg1[0] - sg0[0], sg1[1] - sg0[1]);
    if (s > 3) {
      ctx.fillStyle = mix('#f5edd2', p.haze, hz); ctx.font = '800 ' + (1.0 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = ZS.LABELS.lift.top, maxW = (sg1[0] - sg0[0]) * 0.9, tw = ctx.measureText(txt).width;
      if (tw > maxW) ctx.font = '800 ' + (1.0 * s * maxW / tw).toFixed(1) + 'px system-ui, sans-serif';
      ctx.fillText(txt, (sg0[0] + sg1[0]) / 2, (sg0[1] + sg1[1]) / 2 + 0.05 * s);
    }
    const r0 = at(-10.2, 12.2), r1 = at(4.4, 12.2);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(top[0], top[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r1[0], r1[1] + 0.5 * s); ctx.lineTo(top[0], top[1] + 0.6 * s); ctx.lineTo(r0[0], r0[1] + 0.5 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = mix(p.winter ? '#f5f8fb' : '#5c4a40', p.haze, hz);
    if (p.winter) { ctx.globalAlpha = 0.5 + 0.5 * p.deep; ctx.beginPath(); ctx.moveTo(r0[0], r0[1] - 0.05 * s); ctx.lineTo(top[0], top[1] - 0.35 * s); ctx.lineTo(r1[0], r1[1] - 0.05 * s); ctx.lineTo(r1[0], r1[1] + 0.2 * s); ctx.lineTo(top[0], top[1] + 0.15 * s); ctx.lineTo(r0[0], r0[1] + 0.2 * s); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    const fp = at(-3, 18.6);
    ctx.strokeStyle = mix('#cfd3d6', p.haze, hz); ctx.lineWidth = max(0.6, 0.08 * s); ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(fp[0], fp[1]); ctx.stroke();
    ZS.scenery.skFlag(ctx, fp[0], fp[1], 0.96 * s, (u) => sin(t * 3.4 - u * 4.8) * 0.12 * s * u, (c) => mix(c, p.haze, hz));
    const h0 = at(4.6, 5.6), h1 = at(10.2, 0), hp = at(7.4, 7.6);
    ctx.fillStyle = wood; ctx.fillRect(h0[0], h0[1], h1[0] - h0[0], h1[1] - h0[1]);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(h0[0] - 0.4 * s, h0[1] + 0.2 * s); ctx.lineTo(hp[0], hp[1]); ctx.lineTo(h1[0] + 0.4 * s, h0[1] + 0.2 * s); ctx.closePath(); ctx.fill();
    if (p.winter) { ctx.fillStyle = mix('#f5f8fb', p.haze, hz); ctx.beginPath(); ctx.moveTo(h0[0] - 0.4 * s, h0[1] + 0.05 * s); ctx.lineTo(hp[0], hp[1] - 0.2 * s); ctx.lineTo(h1[0] + 0.4 * s, h0[1] + 0.05 * s); ctx.lineTo(hp[0], hp[1] + 0.3 * s); ctx.closePath(); ctx.fill(); }
    for (const wx of [5.6, 8.0]) {
      const a = at(wx, 3.8), b = at(wx + 1.5, 2.4);
      ctx.fillStyle = '#e9b64c'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      ctx.fillStyle = 'rgba(255,238,170,' + (0.6 + 0.2 * sin(t * 0.9 + wx)).toFixed(3) + ')'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    }
    if (s > 4) {
      const a = at(5.0, 5.4), b = at(9.8, 4.4);
      ctx.fillStyle = mix('#7a1d18', p.haze, hz); ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      ctx.fillStyle = '#f5edd2'; ctx.font = '800 ' + (0.75 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ZS.LABELS.lift.bufet, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.04 * s);
      if (s > 9) {
        const c = at(10.5, 2.8), d = at(12.5, 0.9), pole = at(11.5, 0);
        ctx.fillStyle = '#5a3d22'; ctx.fillRect(pole[0] - 0.06 * s, c[1], 0.12 * s, pole[1] - c[1]);
        ctx.fillStyle = '#2b2f2a'; ctx.fillRect(c[0], c[1], d[0] - c[0], d[1] - c[1]);
        ctx.fillStyle = '#f5f2e8'; ctx.font = '700 ' + (0.42 * s).toFixed(1) + 'px system-ui, sans-serif';
        ctx.fillText(ZS.LABELS.lift.price, (c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
      }
    }
  }

  const DECK = { y: 7.3, x0: -2.1, x1: 2.5 };
  function deck(ctx, p, zs) {
    const zf = max(0.5, zs - LIFT().GEO.deck), zb = zs - 0.3, hz = smooth((zs - 25) / 120) * 0.45;
    if (zs - LIFT().GEO.deck > 80) return;
    const at = (x, y, z) => P(x, y, z, [0, 0]);
    const s = S(zf + 0.6);
    for (let k = 0; k < 4; k++) {
      const zz = lerp(zf + 0.6, zb - 0.5, k / 3), sz = S(zz);
      for (const lx of [DECK.x0 + 0.3, DECK.x1 - 0.3]) {
        const t0 = at(lx, DECK.y - 0.6, zz), t1 = at(lx, 0, zz);
        ctx.fillStyle = mix('#7c7a73', p.haze, hz + k * 0.05); ctx.fillRect(t0[0] - 0.13 * sz, t0[1], 0.26 * sz, t1[1] - t0[1]);
      }
    }
    const a = at(DECK.x0, DECK.y, zb), b = at(DECK.x1, DECK.y, zb), c = at(DECK.x1, DECK.y, zf), d = at(DECK.x0, DECK.y, zf);
    const cb = at(DECK.x1, DECK.y - 0.7, zf), db = at(DECK.x0, DECK.y - 0.7, zf);
    ctx.fillStyle = mix('#8f8c84', p.haze, hz); ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(cb[0], cb[1]); ctx.lineTo(db[0], db[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = mix(p.winter ? '#e9eef2' : '#b9b4aa', p.haze, hz); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = mix('#9a958d', p.haze, hz); ctx.lineWidth = max(0.5, 0.04 * s);
    ctx.beginPath();
    for (let zz = zf + 1; zz < zb; zz += 1.2) { const l = at(DECK.x0, DECK.y, zz), r = at(DECK.x1, DECK.y, zz); ctx.moveTo(l[0], l[1]); ctx.lineTo(r[0], r[1]); }
    ctx.stroke();
    ctx.strokeStyle = '#f0c030'; ctx.lineWidth = max(1, 0.12 * S(zf + 1.6));
    const y1 = at(DECK.x0, DECK.y, zf + 1.6), y2 = at(DECK.x1, DECK.y, zf + 1.6);
    ctx.beginPath(); ctx.moveTo(y1[0], y1[1]); ctx.lineTo(y2[0], y2[1]); ctx.stroke();
    if (p.winter) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (const lx of [DECK.x0, DECK.x1]) { const e0 = at(lx, DECK.y, zf), e1 = at(lx, DECK.y, zb); quad(ctx, e0, e1, 0.12 * S(zf), 0.12 * S(zb)); }
    }
  }

  function hopOff(r) {
    const t = r.t, z0 = V.zc + 0.2;
    if (t < 0.42) return null;
    const h = clamp((t - 0.42) / 0.5, 0, 1), w = clamp((t - 0.92) / 1.0, 0, 1);
    const z = z0 + h * 1.7 + w * 5.6, y = lerp(7.8, DECK.y, h) + sin(h * PI) * 0.9;
    return { z, y, walk: w, h };
  }

  function cable(ctx, x, zFar, zNear, col, w) {
    const a = P(x, CAM.cable, zFar, [0, 0]), b = P(x, CAM.cable, zNear, [0, 0]);
    ctx.fillStyle = col; quad(ctx, a, b, max(0.4, w * 0.35 * V.k), w * V.k);
  }

  function zonePoint(u) {
    const th = asin(clamp(u, -0.99, 0.99)), R = RIG.rt * V.k;
    return [V.gx + R * sin(th), V.gy + R * cos(th)];
  }

  function hanger(ctx) {
    const path = () => {
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 24);
      for (const sd of [-1, 1]) { ctx.moveTo(0, 24); ctx.bezierCurveTo(0, 58, sd * 138, 46, sd * 138, 104); ctx.lineTo(sd * 132, 262); }
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b3138'; ctx.lineWidth = 10; path(); ctx.stroke();
    ctx.strokeStyle = '#4f5962'; ctx.lineWidth = 6; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; ctx.save(); ctx.translate(-1.5, -1); path(); ctx.stroke(); ctx.restore();
  }

  function grip(ctx) {
    ctx.fillStyle = '#1f252b'; rrect(ctx, -18, -10, 36, 18, 5);
    ctx.fillStyle = '#4f5962'; rrect(ctx, -14, -7, 28, 8, 3);
    ctx.fillStyle = '#e8b92a'; ctx.fillRect(-18, 4, 36, 3.4);
    ctx.fillStyle = '#7a848d'; circle(ctx, -8, -12, 4); circle(ctx, 8, -12, 4);
  }

  function bench(ctx, winter, number) {
    ctx.fillStyle = '#2b3138';
    for (const sd of [-1, 1]) rrect(ctx, sd * 126 - 5, 228, 10, 62, 4);
    ctx.fillStyle = '#d2382b'; rrect(ctx, -128, 230, 256, 64, 14);
    ctx.fillStyle = '#a82c22'; rrect(ctx, -128, 276, 256, 18, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (const y of [246, 262]) ctx.fillRect(-116, y, 232, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.26)'; rrect(ctx, -120, 234, 240, 6, 3);
    ctx.fillStyle = '#f5f2e8'; rrect(ctx, -18, 266, 36, 19, 5);
    ctx.fillStyle = '#1d1d1d'; ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(number, 0, 276.5);
    if (winter) {
      ctx.fillStyle = '#f5f8fb';
      ctx.beginPath(); ctx.moveTo(-124, 234);
      for (let i = 0; i <= 12; i++) ctx.lineTo(-124 + i * 20.7, 231 - 3.5 - 2 * sin(i * 1.7));
      ctx.lineTo(124, 234); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(150,176,204,0.5)'; ctx.fillRect(-120, 234, 240, 2);
    }
  }

  const BAR_Y = 186;
  function barY(up) { return 240 - (240 - BAR_Y) * cos(-1.1 * up); }

  function bar(ctx, up) {
    const y = barY(up);
    ctx.strokeStyle = '#7d848a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const sd of [-1, 1]) { ctx.moveTo(sd * 126, 240); ctx.lineTo(sd * 120, y); }
    ctx.moveTo(-120, y); ctx.lineTo(120, y);
    ctx.stroke();
    ctx.strokeStyle = '#c7ccd0'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-118, y - 1.5); ctx.lineTo(118, y - 1.5); ctx.stroke();
  }

  function ear(ctx, x, y, r, rot, tagged) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = BEAR.fur; ellipse(ctx, 0, 0, r, r * 0.95);
    ctx.fillStyle = BEAR.ear; ellipse(ctx, 0, r * 0.14, r * 0.55, r * 0.5);
    if (tagged) { ctx.fillStyle = BEAR.tagEdge; rrect(ctx, r * 0.35, -r * 0.1, r * 0.9, r * 0.7, 2); ctx.fillStyle = BEAR.tag; rrect(ctx, r * 0.4, -r * 0.05, r * 0.75, r * 0.55, 2); }
    ctx.restore();
  }

  function tufts(ctx, pts, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w || 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, y, a, l] of pts) { ctx.moveTo(x, y); ctx.lineTo(x + cos(a) * l, y + sin(a) * l); }
    ctx.stroke();
  }

  function bearSit(ctx, o) {
    const look = o.look, br = o.breath, fl = o.flinch;
    const hx = look * 8 + fl * sin(o.t * 70) * 3, hy = 108 + fl * 8 - br * 1.2;
    ctx.save();
    ctx.translate(0, 270); ctx.rotate(o.lean); ctx.translate(0, -270);
    ctx.fillStyle = BEAR.fur;
    ctx.beginPath();
    ctx.moveTo(-98, 252); ctx.bezierCurveTo(-104, 214, -100, 176, -78, 156);
    ctx.bezierCurveTo(-58, 138, -32, 132 - br, 0, 131 - br);
    ctx.bezierCurveTo(32, 132 - br, 58, 138, 78, 156);
    ctx.bezierCurveTo(100, 176, 104, 214, 98, 252); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,14,4,0.18)';
    ctx.beginPath(); ctx.moveTo(-98, 252); ctx.bezierCurveTo(-104, 214, -100, 176, -78, 156); ctx.bezierCurveTo(-70, 186, -74, 222, -64, 252); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(98, 252); ctx.bezierCurveTo(104, 214, 100, 176, 78, 156); ctx.bezierCurveTo(74, 188, 80, 224, 72, 252); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,226,190,0.12)'; ellipse(ctx, -18, 150, 52, 14, -0.08);
    ctx.fillStyle = 'rgba(30,14,4,0.1)'; ellipse(ctx, 0, 226, 70, 26);
    const fur = [];
    for (let i = 0; i < 16; i++) {
      const x = -66 + (i % 6) * 26 + ((i / 6) | 0) % 2 * 13, y = 166 + ((i / 6) | 0) * 24;
      fur.push([x - 5, y, 1.25, 10], [x + 5, y, 1.9, 10]);
    }
    tufts(ctx, fur, 'rgba(30,14,4,0.14)', 2.2);
    ctx.strokeStyle = 'rgba(30,14,4,0.2)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(-4, 190, 2, 232); ctx.stroke();
    tufts(ctx, [[-78, 158, -2.3, 8], [-92, 182, -2.7, 7], [-99, 212, -2.95, 6], [78, 158, -0.85, 8], [92, 182, -0.45, 7], [99, 212, -0.2, 6], [-44, 140, -2.0, 7], [44, 140, -1.1, 7]], BEAR.fur, 3);
    ctx.fillStyle = BEAR.fur; ellipse(ctx, hx * 0.4, 136 - br * 0.6, 38, 16);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(look * 0.12 + o.tilt);
    const sn = clamp(abs(look) * 1.4 - 0.25, 0, 1), sd = look < 0 ? -1 : 1;
    if (sn > 0.02) {
      ctx.fillStyle = BEAR.muzzle; ellipse(ctx, sd * (28 + 15 * sn), 11, 12 + 8 * sn, 11.5, sd * 0.25);
      ctx.fillStyle = BEAR.dark; ellipse(ctx, sd * (41 + 19 * sn), 7, 5 * sn + 1, 4 * sn + 1);
    }
    ctx.fillStyle = BEAR.fur; ellipse(ctx, 0, 0, 42, 38);
    ctx.fillStyle = 'rgba(30,14,4,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0, 42, 38, 0, 0.15 * PI, 0.85 * PI); ctx.ellipse(0, 6, 36, 24, 0, 0.85 * PI, 0.15 * PI, true); ctx.fill();
    ctx.fillStyle = 'rgba(255,226,190,0.12)'; ellipse(ctx, -9, -16, 24, 12, -0.2);
    tufts(ctx, [[-14, -6, 1.3, 9], [0, -10, 1.5, 10], [14, -6, 1.8, 9], [-6, 12, 1.5, 8], [8, 12, 1.6, 8]], 'rgba(30,14,4,0.16)', 2.2);
    if (sn > 0.45) { ctx.fillStyle = BEAR.dark; circle(ctx, sd * 35, -3, 3.5); ctx.fillStyle = '#f4efe6'; circle(ctx, sd * 36, -4, 1.1); }
    ear(ctx, -30 + look * 8, -29 + fl * 3, 13.5, -0.35 + look * 0.1 - fl * 0.4, false);
    ear(ctx, 30 + look * 8, -29 + fl * 3, 13.5, 0.35 + look * 0.1 + fl * 0.4, o.tag);
    tufts(ctx, [[-39, 8, 2.6, 7], [39, 8, 0.5, 7], [-2, -37, -1.7, 6], [4, -37, -1.4, 5]], BEAR.fur, 3);
    ctx.restore();
    ctx.restore();
  }

  function paws(ctx, o) {
    const y = barY(o.barUp);
    ctx.save(); ctx.translate(0, 270); ctx.rotate(o.lean); ctx.translate(0, -270);
    for (const sd of [-1, 1]) {
      const reach = sd * o.input > 0 ? 1 : 0, sx = sd * 76, px = sd * (100 + 6 * reach), py = y - 3 - reach * 5;
      ctx.strokeStyle = BEAR.fur; ctx.lineWidth = 26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, 170); ctx.quadraticCurveTo(sd * 98, 164, px, py); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,14,4,0.2)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(sd * 84, 182); ctx.quadraticCurveTo(sd * 100, 178, px + sd * 6, py + 6); ctx.stroke();
      tufts(ctx, [[sd * 104, py - 10, sd > 0 ? -0.5 : -2.6, 6], [sd * 92, 160, sd > 0 ? -1.0 : -2.1, 6]], BEAR.fur, 3);
      ctx.fillStyle = BEAR.far; ellipse(ctx, px, py + 3, 15, 10);
      ctx.fillStyle = 'rgba(255,226,190,0.12)'; ellipse(ctx, px - 3, py - 1, 9, 4);
      ctx.strokeStyle = BEAR.claw; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = -1.5; i <= 1.5; i++) { ctx.moveTo(px + i * 5.4, py + 10); ctx.lineTo(px + i * 5.8, py + 15.5); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function card(ctx, t, th) {
    ctx.save(); ctx.translate(137, 130); ctx.rotate(th * 0.9 + 0.12 * sin(t * 2.7));
    ctx.strokeStyle = '#2f6fb3'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; rrect(ctx, -9, 16, 20, 27, 3);
    ctx.fillStyle = '#ffffff'; rrect(ctx, -10, 15, 20, 27, 3);
    ctx.fillStyle = '#2f6fb3'; ctx.fillRect(-10, 19, 20, 6);
    ctx.fillStyle = BEAR.fur; circle(ctx, 0, 33, 4.5); circle(ctx, -3.6, 29.5, 1.8); circle(ctx, 3.6, 29.5, 1.8);
    ctx.restore();
  }

  function rig(ctx, r, o) {
    ctx.save();
    ctx.translate(V.gx + o.dx, V.gy + o.dy);
    ctx.scale(V.k, V.k);
    ctx.rotate(-r.th);
    hanger(ctx);
    bar(ctx, o.barUp);
    if (o.seated) { ctx.globalAlpha = o.alpha; bearSit(ctx, o); ctx.globalAlpha = 1; }
    bench(ctx, r.theme === 'winter', String(37 + ((r.x | 0) % 40)));
    if (o.seated) { ctx.globalAlpha = o.alpha; paws(ctx, o); ctx.globalAlpha = 1; }
    card(ctx, o.t, r.th);
    grip(ctx);
    ctx.restore();
  }

  function bearWalk(ctx, x, y, s, t, alpha, h) {
    const st = sin(t * 10), air = sin(clamp(h, 0, 1) * PI), bob = abs(st) * 3;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(20,20,10,0.18)'; ellipse(ctx, 0, 2, 64 - air * 12, 9);
    ctx.translate(0, -air * 26 - bob);
    ctx.fillStyle = BEAR.fur; ellipse(ctx, 0, -146, 30, 25);
    ear(ctx, -22, -164, 10.5, -0.35, false); ear(ctx, 22, -164, 10.5, 0.35, false);
    ctx.fillStyle = BEAR.far;
    for (const sd of [-1, 1]) rrect(ctx, sd * 30 - 12, -86 - (sd * st > 0 ? 6 : 0) - air * 10, 24, 52, 11);
    ctx.fillStyle = BEAR.fur;
    ctx.beginPath(); ctx.moveTo(-50, -118); ctx.bezierCurveTo(-42, -136, 42, -136, 50, -118); ctx.lineTo(58, -80); ctx.lineTo(-58, -80); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-64, -40); ctx.bezierCurveTo(-72, -86, -54, -112, 0, -114); ctx.bezierCurveTo(54, -112, 72, -86, 64, -40); ctx.bezierCurveTo(44, -24, -44, -24, -64, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,14,4,0.18)'; ellipse(ctx, 0, -36, 54, 14);
    ctx.fillStyle = 'rgba(255,226,190,0.1)'; ellipse(ctx, -12, -100, 38, 10);
    ctx.fillStyle = BEAR.ear; ellipse(ctx, 0, -66, 7, 5.5);
    tufts(ctx, [[-62, -60, -2.8, 7], [62, -60, -0.3, 7], [-48, -100, -2.3, 6], [48, -100, -0.8, 6]], BEAR.fur, 3);
    for (const sd of [-1, 1]) {
      const lift = (sd * st > 0 ? 1 : 0) * (1 - air) * 10 + air * 18;
      ctx.fillStyle = BEAR.far; rrect(ctx, sd * 36 - 17, -52 - lift, 34, 52, 15);
      ctx.fillStyle = BEAR.pad; ellipse(ctx, sd * 36, -4 - lift, 13, 6);
    }
    ctx.restore();
  }

  function laser(ctx, from, to, a) {
    ctx.strokeStyle = 'rgba(255,40,40,' + (0.55 * a).toFixed(3) + ')'; ctx.lineWidth = 1.6 * V.k;
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,190,' + (0.5 * a).toFixed(3) + ')'; ctx.lineWidth = 0.6 * V.k;
    ctx.stroke();
  }

  function crosshair(ctx, q, k, a, snowy) {
    const R = lerp(54, 22, k) * V.k, x = q[0], y = q[1];
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU);
    ctx.moveTo(x - R - 12 * V.k, y); ctx.lineTo(x - R * 0.45, y); ctx.moveTo(x + R * 0.45, y); ctx.lineTo(x + R + 12 * V.k, y);
    ctx.moveTo(x, y - R - 12 * V.k); ctx.lineTo(x, y - R * 0.45); ctx.moveTo(x, y + R * 0.45); ctx.lineTo(x, y + R + 12 * V.k);
    ctx.strokeStyle = snowy ? 'rgba(18,26,40,0.5)' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 5.5 * V.k; ctx.stroke();
    ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2.6 * V.k; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R + 7 * V.k, -PI / 2, -PI / 2 + k * TAU);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3.5 * V.k; ctx.stroke();
    ctx.fillStyle = 'rgba(255,40,40,0.35)'; circle(ctx, x, y, 7 * V.k);
    ctx.fillStyle = '#ff2b2b'; circle(ctx, x, y, 3.4 * V.k);
    ctx.globalAlpha = 1;
  }

  function shots(ctx, r, layer) {
    for (const s of r.shots) {
      const f = s.foe, from = f.mz;
      if (!from) continue;
      const tgt = zonePoint(s.u);
      if (layer === 0 && s.state === 'aim') {
        const k = clamp((r.t - s.t0) / s.aim, 0, 1);
        laser(ctx, from, tgt, (0.45 + 0.35 * abs(sin(r.clock * 23))) * smooth(k / 0.15));
      }
      if (layer === 1 && s.state === 'aim') crosshair(ctx, tgt, clamp((r.t - s.t0) / s.aim, 0, 1), smooth((r.t - s.t0) / 0.12), r.theme === 'winter');
      if (layer === 1 && s.state !== 'aim') {
        const age = r.t - s.fire;
        if (age < 0.12 && f.sp) {
          ctx.fillStyle = 'rgba(255,214,120,' + (0.9 * (1 - age / 0.12)).toFixed(3) + ')'; circle(ctx, from[0], from[1], (6 + age * 60) * max(0.5, f.sp[2] / 20));
          ctx.fillStyle = '#fff6d0'; circle(ctx, from[0], from[1], 3 * max(0.5, f.sp[2] / 20));
        }
        if (age < 0.7 && f.sp) { ctx.globalAlpha = clamp((0.7 - age) * 2.5, 0, 1); label(ctx, ZS.LABELS.bang, f.sp[0], f.sp[1] - age * 30, max(11, 15 * V.k), '#d62f27'); ctx.globalAlpha = 1; }
        const fly = clamp(age / LIFT().FLY, 0, 1), fade = s.state === 'done' ? clamp(1 - (r.t - s.at) / 0.3, 0, 1) : 1;
        if (fade <= 0) continue;
        const pass = s.result === 'miss' || s.result === 'spark' ? 1.9 : 1;
        const ex = from[0] + (tgt[0] - from[0]) * fly * (s.state === 'done' ? pass : 1), ey = from[1] + (tgt[1] - from[1]) * fly * (s.state === 'done' ? pass : 1);
        const tx = from[0] + (ex - from[0]) * max(0, fly - 0.35);
        const ty = from[1] + (ey - from[1]) * max(0, fly - 0.35);
        ctx.strokeStyle = 'rgba(255,220,120,' + (0.95 * fade).toFixed(3) + ')'; ctx.lineWidth = 2.6 * V.k; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey); ctx.stroke();
        if (s.state === 'done') impact(ctx, r, s);
      }
    }
  }

  function impact(ctx, r, s) {
    const age = r.t - s.at;
    if (age > 0.7) return;
    if (s.result === 'spark') {
      const th = asin(clamp(s.hitU, -0.99, 0.99)), side = s.u > s.hitU ? 1 : -1;
      const lx = side * RIG.half * 0.95, ly = 236;
      const bx = V.gx + (lx * cos(th) + ly * sin(th)) * V.k, by = V.gy + (ly * cos(th) - lx * sin(th)) * V.k;
      for (let i = 0; i < 9; i++) {
        const a = -PI / 2 + (hash(s.id * 7 + i) - 0.5) * 2.6, v = (80 + hash(i * 3 + s.id) * 160) * V.k, x = bx + cos(a) * v * age, y = by + sin(a) * v * age + 300 * age * age * V.k;
        ctx.strokeStyle = 'rgba(255,' + (200 + Math.round(hash(i) * 55)) + ',90,' + clamp(1 - age / 0.5, 0, 1).toFixed(3) + ')'; ctx.lineWidth = 2 * V.k;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - cos(a) * 6 * V.k, y - sin(a) * 6 * V.k); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,240,180,' + clamp(0.8 - age * 3, 0, 1).toFixed(3) + ')'; circle(ctx, bx, by, (8 + age * 30) * V.k);
    } else if (s.result === 'hit') {
      const th = r.th, x = V.gx + RIG.rt * sin(th) * V.k, y = V.gy + RIG.rt * cos(th) * V.k;
      for (let i = 0; i < 12; i++) {
        const a = hash(s.id * 5 + i) * TAU, v = (40 + hash(i * 1.3 + s.id) * 110) * V.k, px = x + cos(a) * v * age, py = y + sin(a) * v * age + 160 * age * age * V.k;
        ctx.fillStyle = i % 3 ? 'rgba(107,66,38,' + clamp(1 - age / 0.7, 0, 1).toFixed(3) + ')' : 'rgba(78,47,25,' + clamp(1 - age / 0.7, 0, 1).toFixed(3) + ')';
        ctx.save(); ctx.translate(px, py); ctx.rotate(a + age * 6); ctx.fillRect(-3 * V.k, -1.2 * V.k, 6 * V.k, 2.4 * V.k); ctx.restore();
      }
    }
  }

  function gauge(ctx, prog, t) {
    const k = V.k, x = V.w - 26 * max(0.8, k), y0 = V.hz - 6 * k, y1 = V.hz + 250 * k, w = 26 * max(0.8, k);
    ctx.fillStyle = 'rgba(20,26,16,0.62)'; rrect(ctx, x - w / 2, y0 - 34 * k, w, y1 - y0 + 46 * k, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const lift = LIFT(), n = Math.floor((lift.LEN - lift.GEO.pylon0) / lift.GEO.pylonGap) + 1;
    for (let i = 0; i < n; i++) { const yy = lerp(y1, y0, (lift.GEO.pylon0 + i * lift.GEO.pylonGap) / lift.LEN); ctx.fillRect(x - 5, yy - 1, 10, 2); }
    ctx.fillStyle = '#f5edd2'; ctx.beginPath(); ctx.moveTo(x - 9 * max(0.8, k), y0 - 14 * k); ctx.lineTo(x, y0 - 24 * k); ctx.lineTo(x + 9 * max(0.8, k), y0 - 14 * k); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 7 * max(0.8, k), y0 - 15 * k, 14 * max(0.8, k), 10 * k);
    const y = lerp(y1, y0, prog);
    ctx.fillStyle = 'rgba(214,47,39,0.35)'; circle(ctx, x, y, 9 + 1.5 * sin(t * 6));
    ctx.fillStyle = '#d62f27'; circle(ctx, x, y, 6);
    ctx.fillStyle = '#ffffff'; circle(ctx, x, y, 2.2);
  }

  function banner(ctx, g, r) {
    const t = r.t;
    if (r.phase !== 'ride' || t > 3.6) return;
    const a = smooth((t - 0.25) / 0.35) * (1 - smooth((t - 3.0) / 0.6));
    if (a <= 0.01) return;
    const text = g.touch ? ZS.LABELS.lift.bannerTouch : ZS.LABELS.lift.banner, size = Math.round(lerp(17, 22, V.k));
    ctx.font = '800 ' + size + 'px system-ui, sans-serif';
    const w = min(V.w - 30, ctx.measureText(text).width + 40), h = size + 20, x = V.cx, y = V.hz + 42 * V.k - (1 - a) * 8;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,26,16,0.72)'; rrect(ctx, x - w / 2, y - h / 2, w, h, 12);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    if (tw > w - 24) ctx.font = '800 ' + (size * (w - 24) / tw).toFixed(1) + 'px system-ui, sans-serif';
    ctx.fillText(text, x, y + 1);
    ctx.globalAlpha = 1;
  }

  function hint(ctx, g, r) {
    const s = r.shots.find((o) => o.first && o.state === 'aim');
    if (!s) return;
    const a = smooth((r.t - s.t0) / 0.2) * (0.75 + 0.25 * abs(sin(r.clock * 7)));
    const text = g.touch ? ZS.LABELS.lift.dodgeTouch : ZS.LABELS.lift.dodge;
    ctx.globalAlpha = a;
    label(ctx, text, V.gx + sin(r.th) * 120 * V.k, V.gy + 46 * V.k, max(22, 34 * V.k), '#d62f27');
    ctx.globalAlpha = 1;
  }

  function floaters(ctx, g) {
    for (const f of g.floaters) {
      if (!f.ride) continue;
      ctx.globalAlpha = min(1, f.t);
      label(ctx, f.text, V.gx + f.x * V.k, V.gy + f.y * V.k - (1.6 - f.t) * 30, max(14, 17 * V.k), f.color, 800, V.w - 20);
      ctx.globalAlpha = 1;
    }
  }

  function flakes(ctx, p, t) {
    if (!(p.flakes > 0.01)) return;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    const n = Math.round(70 * p.flakes), H = V.bot - V.top;
    for (let i = 0; i < n; i++) {
      const sp = 40 + hash(i * 1.3) * 60, x = frac(hash(i * 2.1) + sin(t * 0.7 + i) * 0.01 - t * 0.012) * (V.w + 40) - 20, y = V.top + frac(hash(i * 4.7) + t * sp / H) * H, rr = (1 + hash(i * 3.3) * 1.8) * V.k;
      ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU);
    }
    ctx.fill();
  }

  function iris(ctx, x, y, rad) {
    const R = max(0, rad);
    ctx.fillStyle = '#121a10';
    ctx.beginPath();
    ctx.rect(-10, V.top - 10, V.w + 20, V.bot - V.top + 20);
    ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU, true);
    ctx.fill();
    if (R > 2) {
      ctx.strokeStyle = 'rgba(255,248,230,0.16)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    }
  }

  function draw(g, ctx, viewW, offY) {
    const r = g.ride, lift = LIFT(), T = lift.T;
    setup(viewW, offY);
    const p = palette(g), vw = view(g), zcam = vw.zcam, zTop = vw.zTop, tau = vw.tau, t = g.time;
    LIFT_T = t;
    const sh = r.shake * r.shake, dx = sh * sin(r.clock * 53) * 5 * V.k, dy = sh * cos(r.clock * 47) * 4 * V.k;
    ctx.save();
    ctx.translate(0, offY);
    ctx.translate(dx, dy);
    sky(ctx, p, t);
    mountains(ctx, p);
    ground(ctx, p, zTop);
    aisle(ctx, p, zcam, zTop);
    marks(ctx, p, zcam, zTop);
    topStation(ctx, p, zTop, t);
    forest(ctx, p, zcam, zTop, r.theme);
    const list = [], front = [];
    const G = lift.GEO;
    for (let n = 0; ; n++) {
      const zw = G.pylon0 + n * G.pylonGap;
      if (zw > lift.LEN - 6) break;
      const z = zw - zcam;
      if (z < 0.5 || z > zTop - 2) continue;
      (z < V.zc ? front : list).push({ z, draw: () => pylon(ctx, p, z, n, z < V.zc) });
    }
    chairs(ctx, p, zcam, zTop, tau, list);
    if (p.winter) { markers(ctx, zcam, zTop, list); skiers(ctx, zcam, zTop, tau, list); }
    else tourists(ctx, g, r, zcam, zTop, list);
    for (const f of r.foes) {
      if (f.kind === 'drone') { if (r.phase === 'ride') drone(ctx, r, f, list); continue; }
      const z = f.zw - zcam;
      if (z > 1.2 && z < zTop - 1) hunter(ctx, g, r, f, z, list); else f.mz = null;
    }
    list.sort((a, b) => b.z - a.z);
    for (const it of list) it.draw();
    deck(ctx, p, zTop);
    cable(ctx, CAM.ret, zTop - 0.5, 0.9, mix('#3a4249', p.haze, 0.1), 1.8);
    cable(ctx, 0, zTop - 0.5, V.zc, '#252b31', 2.2);
    if (r.phase === 'ride') shots(ctx, r, 0);
    const hurt = g.bear.inv > 0 ? 0.7 + 0.3 * cos(g.time * 14) : 1;
    const hop = r.phase === 'arrive' ? hopOff(r) : null;
    const o = {
      t, look: r.look, lean: r.lean + (r.phase === 'arrive' ? smooth(r.t / 0.4) * 0.1 : 0), breath: sin(r.clock * 2.3), flinch: r.flinch, tilt: 0.04 * sin(r.clock * 0.9),
      tag: !!g.problem, input: r.input, barUp: r.phase === 'arrive' ? smooth((r.t - 0.05) / 0.35) : 0,
      seated: !hop, alpha: hurt, dx: 0, dy: -5 * V.k * r.jolt * sin(r.jolt * 14),
    };
    if (hop) { const q = P(0, hop.y, hop.z, [0, 0]); bearWalk(ctx, q[0], q[1], (V.f / hop.z) / 130, r.clock * (hop.walk > 0 ? 1 : 0), 1, hop.h); }
    rig(ctx, r, o);
    for (const it of front.sort((a, b) => b.z - a.z)) it.draw();
    if (r.phase === 'ride') { shots(ctx, r, 1); hint(ctx, g, r); }
    floaters(ctx, g);
    if (g.bubble && !hop) ZS.render.props.bubble(ctx, V.gx + sin(r.th) * 70 * V.k, V.gy + cos(r.th) * 58 * V.k, g.bubble.text, g.bubble.t);
    flakes(ctx, p, t);
    ctx.translate(-dx, -dy);
    if (r.flinch > 0.5) { ctx.fillStyle = 'rgba(214,47,39,' + ((r.flinch - 0.5) * 0.4).toFixed(3) + ')'; ctx.fillRect(-2, V.top - 2, V.w + 4, V.bot - V.top + 4); }
    banner(ctx, g, r);
    gauge(ctx, r.phase === 'ride' ? clamp(r.t / T.ride, 0, 1) : 1, t);
    const far = hypot(V.w, V.bot - V.top);
    if (r.phase === 'ride' && r.t < T.open) iris(ctx, V.gx, V.gy + 200 * V.k, far * smooth(r.t / T.open));
    if (r.phase === 'arrive') {
      const c = clamp((r.t - (T.arrive - 0.6)) / 0.6, 0, 1);
      if (c > 0) {
        const hz = hop || { z: V.zc, y: 7.8 }, q = P(0, hz.y + 0.6, hz.z, [0, 0]);
        iris(ctx, q[0], q[1], far * (1 - smooth(c)));
      }
    }
    ctx.restore();
  }

  function zoom(g) {
    const r = g.ride, T = LIFT().T, b = g.bear;
    if (!r) return null;
    const x = b.x - g.cam, y = GY - 46;
    if (r.phase === 'board') { const u = clamp(r.t / T.board, 0, 1); return { x, y, k: 1 + 1.25 * u * u }; }
    if (r.phase === 'back') { const u = clamp(r.t / T.back, 0, 1); return { x, y, k: 1 + 0.9 * (1 - smooth(u)) }; }
    return null;
  }

  function cover(g, ctx, viewW, offY) {
    const r = g.ride, T = LIFT().T, z = zoom(g);
    if (!z) return;
    V.w = viewW; V.top = -offY; V.bot = 540 + offY / 0.45 - offY;
    const far = hypot(viewW, V.bot - V.top);
    let rad = far;
    if (r.phase === 'board') rad = far * (1 - smooth((r.t - 0.2) / (T.board - 0.2)));
    else if (r.phase === 'back') rad = far * smooth(r.t / (T.back * 0.85));
    if (rad >= far) return;
    ctx.save(); ctx.translate(0, offY);
    iris(ctx, z.x, z.y, rad);
    ctx.restore();
  }

  ZS.render = ZS.render || {};
  ZS.render.lift = { draw, zoom, cover, inside: (g) => LIFT().inside(g) };
})();
