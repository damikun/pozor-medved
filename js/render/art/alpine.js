(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const API = (ZS.alpineArt = {});
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, sqrt = Math.sqrt, min = Math.min, max = Math.max, exp = Math.exp;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(sin(n * 127.1 + 311.7) * 43758.5453);

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
  function blobPath(path, p) {
    const n = p.length / 2, g = (i, k) => p[((i + n) % n) * 2 + k];
    path.moveTo(g(0, 0), g(0, 1));
    for (let i = 0; i < n; i++) {
      const x0 = g(i - 1, 0), y0 = g(i - 1, 1), x1 = g(i, 0), y1 = g(i, 1), x2 = g(i + 1, 0), y2 = g(i + 1, 1), x3 = g(i + 2, 0), y3 = g(i + 2, 1);
      path.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
    }
    path.closePath();
  }
  function blob(ctx, p) { ctx.beginPath(); blobPath(ctx, p); ctx.fill(); }
  function limb(ctx, ax, ay, bx, by, wa, wb, col) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
    ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
    ctx.closePath(); ctx.fill();
    circle(ctx, ax, ay, wa / 2); circle(ctx, bx, by, wb / 2);
  }
  function txt(ctx, s, x, y, size, col, weight, maxW) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    if (maxW) { const w = ctx.measureText(s).width; if (w > maxW) ctx.font = (weight || 700) + ' ' + (size * maxW / w) + 'px system-ui, sans-serif'; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  const seasonOf = (g) => (g && g.seasonKey) || 'summer';

  const ROCK = { lit: '#d3d0c7', face: '#b9b6ac', mid: '#a29f95', shade: '#86837b', dark: '#69665f', crack: '#4f4d48', lichen: '#c7c08e', lichen2: '#9fae7a' };
  const TURF = {
    spring: { top: '#8aa859', low: '#6d8c45', tuft: '#5f7f3c', tip: '#a4bf6c', dry: '#b9b27a' },
    summer: { top: '#809d4c', low: '#66843e', tuft: '#56732f', tip: '#9cb862', dry: '#b3a86a' },
    autumn: { top: '#a98747', low: '#8a6a37', tuft: '#9a5a2e', tip: '#c99a52', dry: '#c47a3a' },
  };
  const SKYA = { spring: ['#86c4ee', '#eaf6fd'], summer: ['#79bdea', '#e3f2fb'], autumn: ['#8fbfe2', '#f7ead8'] };
  const PINE = { dark: '#22412e', mid: '#2e5639', lit: '#41704a', tip: '#679a5e', stem: '#5b4535' };
  const LIMBA = { dark: '#25463d', mid: '#33604f', lit: '#4b7f66', tip: '#7ab093', bark: '#6f6153', barkD: '#4e443a', barkL: '#8a7c6c' };

  const mem = new Map();
  function stateOf(id, time, make) {
    let st = mem.get(id);
    if (!st || !(time >= st.t - 0.05 && time - st.t < 0.5)) { st = make(); st.t = time; mem.set(id, st); }
    st.dt = clamp(time - st.t, 0, 0.1);
    st.t = time;
    return st;
  }
  const ease = (v, to, rate, dt) => v + (to - v) * (1 - exp(-rate * dt));

  const RIDGE = [
    -1560, -150, -1470, -196, -1400, -182, -1320, -248, -1270, -226, -1210, -262, -1150, -224, -1080, -244, -1010, -190, -930, -214, -870, -180,
    -780, -236, -720, -286, -676, -276, -636, -308, -560, -238, -488, -262, -420, -206, -352, -232, -280, -196, -200, -244, -140, -224,
    -64, -288, -20, -274, 38, -338, 70, -348, 92, -362, 118, -344, 150, -330, 196, -292, 248, -316, 296, -268, 360, -284, 430, -224,
    506, -252, 566, -234, 646, -298, 690, -288, 744, -310, 810, -252, 870, -270, 944, -206, 1012, -238, 1080, -196, 1160, -246, 1236, -212,
    1320, -232, 1420, -176, 1520, -204, 1600, -150,
  ];
  const CIRQUE = [-1700, -96, -1500, -128, -1320, -112, -1150, -150, -980, -132, -820, -170, -690, -150, -560, -186, -470, -176, -380, -204, -300, -192, -232, -216,
    -170, -196, -120, -172, -70, -146, -10, -128, 60, -122, 130, -126, 190, -142, 240, -168, 290, -194, 350, -210, 410, -196, 480, -218, 560, -184, 660, -166, 760, -178,
    880, -146, 1000, -160, 1140, -128, 1300, -142, 1480, -112, 1700, -98];

  function ridgeAt(q) {
    for (let i = 1; i < RIDGE.length / 2; i++) {
      if (RIDGE[i * 2] >= q) { const x0 = RIDGE[i * 2 - 2], y0 = RIDGE[i * 2 - 1], x1 = RIDGE[i * 2], y1 = RIDGE[i * 2 + 1]; return y0 + (y1 - y0) * (q - x0) / (x1 - x0 || 1); }
    }
    return RIDGE[RIDGE.length - 1];
  }

  function peaks(ctx, viewW, o, key) {
    const cx = viewW / 2 - o, n = RIDGE.length / 2, X = (i) => cx + RIDGE[i * 2], Y = (i) => GY + RIDGE[i * 2 + 1];
    const gr = ctx.createLinearGradient(0, GY - 360, 0, GY - 90);
    gr.addColorStop(0, '#9aa9bb'); gr.addColorStop(0.55, '#aab7c6'); gr.addColorStop(1, '#c5d0da');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(X(0), GY);
    for (let i = 0; i < n; i++) ctx.lineTo(X(i), Y(i));
    ctx.lineTo(X(n - 1), GY); ctx.closePath(); ctx.fill();
    const shade = new Path2D(), snow = new Path2D(), ribs = new Path2D();
    const big = key === 'spring' ? 1.6 : key === 'autumn' ? 0.7 : 1;
    for (let i = 1; i < n - 1; i++) {
      if (Y(i) > Y(i - 1) || Y(i) > Y(i + 1)) continue;
      let j = i + 1;
      while (j < n - 1 && Y(j + 1) > Y(j)) j++;
      const sx = X(i), sy = Y(i), span = X(j) - sx, hgt = GY - sy, sd = hash(RIDGE[i * 2] * 0.37);
      shade.moveTo(sx, sy);
      for (let k = i + 1; k <= j; k++) shade.lineTo(X(k), Y(k));
      shade.lineTo(X(j), GY);
      for (let k = 6; k >= 1; k--) shade.lineTo(sx + span * (0.02 + 0.045 * k) + (hash(sd + k) - 0.5) * 10, sy + hgt * k / 7);
      shade.closePath();
      for (let m = 0; m < 6; m++) {
        if (hash(sd * 7 + m) < 0.3) continue;
        const u = 0.1 + m * 0.09 + hash(sd + m * 3.1) * 0.05, bx = sx + span * (0.04 + 0.5 * u) + (hash(sd + m * 1.7) - 0.5) * 14, by = sy + hgt * u;
        const w = (2.5 + hash(sd + m * 2.3) * 4.5) * big, h = w * (0.35 + hash(sd + m * 5.3) * 0.3);
        snow.moveTo(bx - w, by + h * 0.2); snow.lineTo(bx - w * 0.3, by - h * 0.6); snow.lineTo(bx + w * 0.5, by - h * 0.4); snow.lineTo(bx + w, by + h * 0.5); snow.lineTo(bx + w * 0.1, by + h * 0.9); snow.closePath();
      }
      if (hgt > 250) { snow.moveTo(sx - 2, sy + 4); snow.lineTo(sx + 3, sy + 3); snow.lineTo(sx + 4 * big, sy + 9); snow.lineTo(sx, sy + 8); snow.closePath(); }
      for (let m = 0; m < 3; m++) {
        const u0 = 0.12 + m * 0.2, bx = sx - span * 0.1 * m - 6;
        ribs.moveTo(bx, sy + hgt * u0); ribs.lineTo(bx - 10 - m * 4, sy + hgt * (u0 + 0.22));
      }
    }
    ctx.fillStyle = 'rgba(86,100,122,0.38)'; ctx.fill(shade);
    const strata = new Path2D();
    for (let i = 0; i < 70; i++) {
      const q = -1500 + i * 43 + hash(i * 1.7) * 30, sx = cx + q, top = GY + ridgeAt(q);
      if (sx < -40 || sx > viewW + 40) continue;
      const y = top + 18 + hash(i * 2.3) * (GY - 110 - top), l = 8 + hash(i * 3.1) * 16;
      if (y > GY - 95) continue;
      strata.moveTo(sx, y); strata.lineTo(sx + l, y + l * 0.18 * (hash(i * 4.4) - 0.3));
    }
    ctx.strokeStyle = 'rgba(92,106,128,0.3)'; ctx.lineWidth = 1.2; ctx.stroke(strata);
    ctx.strokeStyle = 'rgba(80,94,116,0.28)'; ctx.lineWidth = 1.4; ctx.stroke(ribs);
    ctx.fillStyle = 'rgba(248,251,253,0.92)'; ctx.fill(snow);
    const hz = ctx.createLinearGradient(0, GY - 210, 0, GY - 60);
    hz.addColorStop(0, 'rgba(226,238,246,0)'); hz.addColorStop(1, 'rgba(226,238,246,0.75)');
    ctx.fillStyle = hz; ctx.fillRect(0, GY - 210, viewW, 150);
  }

  function cirque(ctx, viewW, o, key, time) {
    const cx = viewW / 2 - o, n = CIRQUE.length / 2, X = (i) => cx + 420 + CIRQUE[i * 2] * 0.9, Y = (i) => GY + CIRQUE[i * 2 + 1];
    const gr = ctx.createLinearGradient(0, GY - 220, 0, GY - 70);
    gr.addColorStop(0, '#8e99a5'); gr.addColorStop(1, '#b1bac1');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(X(0), GY);
    for (let i = 0; i < n; i++) ctx.lineTo(X(i), Y(i));
    ctx.lineTo(X(n - 1), GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(70,84,100,0.22)';
    ctx.beginPath();
    for (let i = 1; i < n - 1; i++) {
      if (Y(i) > Y(i - 1) || Y(i) > Y(i + 1)) continue;
      const sx = X(i), sy = Y(i);
      ctx.moveTo(sx, sy); ctx.lineTo(X(i + 1), Y(i + 1)); ctx.lineTo(X(i + 1) + 4, GY - 80); ctx.lineTo(sx + 8, GY - 80); ctx.closePath();
    }
    ctx.fill();
    const lx = cx + 420 + 60 * 0.9, ly = GY - 112;
    ctx.fillStyle = 'rgba(176,182,180,0.75)';
    poly(ctx, [lx - 60, ly - 26, lx - 34, ly - 40, lx - 6, ly - 4, lx - 70, ly - 2]);
    poly(ctx, [lx + 70, ly - 34, lx + 96, ly - 22, lx + 92, ly - 1, lx + 30, ly - 3]);
    if (key !== 'autumn') {
      const s2 = key === 'spring' ? 1.5 : 1;
      ctx.fillStyle = 'rgba(248,251,253,0.9)';
      poly(ctx, [lx - 112, ly - 40, lx - 98, ly - 45, lx - 84 + 6 * s2, ly - 38, lx - 100, ly - 35]);
      poly(ctx, [lx + 104, ly - 58, lx + 118, ly - 61, lx + 128 + 4 * s2, ly - 54, lx + 112, ly - 52]);
    }
    ctx.fillStyle = '#9fa98f'; ell(ctx, lx, ly + 3, 106, 9);
    const wg = ctx.createLinearGradient(0, ly - 7, 0, ly + 8);
    wg.addColorStop(0, '#2c8a80'); wg.addColorStop(1, '#5fbaa4');
    ctx.fillStyle = wg; ell(ctx, lx, ly + 1, 78, 7.5);
    ctx.fillStyle = 'rgba(232,244,252,0.55)';
    for (let i = 0; i < 3; i++) { const u = frac(time * 0.03 + i / 3); ell(ctx, lx - 50 + u * 100, ly + 1 + i * 1.6 - 2, 12 - 6 * abs(u - 0.5), 0.7); }
    ctx.fillStyle = 'rgba(110,118,124,0.6)';
    ell(ctx, lx - 22, ly - 4, 26, 3.2);
  }

  function slopeY(q, base, rise, sd) {
    return GY - base - clamp(q, -1600, 1600) * rise + 9 * sin(q * 0.011 + sd) + 5 * sin(q * 0.029 + sd * 2) + 3 * sin(q * 0.071 + sd);
  }

  function slopes(ctx, viewW, camC, ref, key, time, A) {
    let pond = null;
    const T = TURF[key] || TURF.summer;
    const layers = [
      { f: 0.3, base: 92, rise: 0.05, sd: 1.3, top: '#93a483', bot: '#b2bca5', dot: 'rgba(214,214,206,0.85)', pine: 'rgba(52,86,66,0.75)', path: 'rgba(236,228,206,0.7)' },
      { f: 0.55, base: 34, rise: 0.035, sd: 4.1, top: T.top, bot: T.low, dot: ROCK.face, pine: PINE.mid, path: 'rgba(238,226,196,0.85)' },
    ];
    for (let li = 0; li < layers.length; li++) {
      const Lr = layers[li], o = (camC - ref) * Lr.f, x0 = -40, x1 = viewW + 40, step = 12;
      const Q = (sx) => sx - viewW / 2 + o;
      ctx.beginPath(); ctx.moveTo(x0, GY + 2);
      for (let sx = x0; sx <= x1; sx += step) ctx.lineTo(sx, slopeY(Q(sx), Lr.base, Lr.rise, Lr.sd));
      ctx.lineTo(x1, GY + 2); ctx.closePath();
      const gr = ctx.createLinearGradient(0, GY - 210, 0, GY);
      gr.addColorStop(0, li ? lerpCol(Lr.top, '#a7b6a6', 0.15) : Lr.top); gr.addColorStop(1, Lr.bot);
      ctx.fillStyle = gr; ctx.fill();
      if (li === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(x0, GY + 2);
        for (let sx = x0; sx <= x1; sx += step) ctx.lineTo(sx, slopeY(Q(sx), Lr.base, Lr.rise, Lr.sd) + 6);
        ctx.lineTo(x1, GY + 2); ctx.closePath(); ctx.fill();
      }
      const cell = li ? 46 : 30, c0 = Math.floor(Q(x0) / cell), c1 = Math.ceil(Q(x1) / cell);
      const rocks = new Path2D(), rockSh = new Path2D(), pines = new Path2D(), pinesL = new Path2D();
      for (let c = c0; c <= c1; c++) {
        const h1 = hash(c * 1.37 + li * 9.1), h2 = hash(c * 2.71 + li * 3.3), h3 = hash(c * 0.91 + li * 5.7);
        const q = c * cell + h1 * cell, sx = q - o + viewW / 2, top = slopeY(q, Lr.base, Lr.rise, Lr.sd), depth = GY - top;
        const y = top + 6 + h2 * depth * 0.75, sc = li ? 0.7 + (y - top) / depth * 0.6 : 0.6 + (y - top) / depth * 0.4;
        if (h3 < 0.42) {
          const w = (4 + h1 * 7) * sc * (li ? 1.4 : 1), hh = w * (0.55 + h2 * 0.3);
          rocks.moveTo(sx - w, y); rocks.lineTo(sx - w * 0.7, y - hh * 0.8); rocks.lineTo(sx - w * 0.1, y - hh); rocks.lineTo(sx + w * 0.75, y - hh * 0.6); rocks.lineTo(sx + w, y); rocks.closePath();
          rockSh.moveTo(sx + w * 0.1, y - hh * 0.95); rockSh.lineTo(sx + w * 0.75, y - hh * 0.6); rockSh.lineTo(sx + w, y); rockSh.lineTo(sx + w * 0.2, y); rockSh.closePath();
        } else if (h3 < 0.8) {
          const w = (7 + h2 * 9) * sc * (li ? 1.5 : 1);
          for (let m = 0; m < 3; m++) {
            const px = sx + (m - 1) * w * 0.55, py = y - (m === 1 ? w * 0.28 : 0), r = w * (m === 1 ? 0.55 : 0.42);
            pines.moveTo(px + r, py); pines.ellipse(px, py, r, r * 0.62, 0, PI, TAU); pines.closePath();
            if (li) { pinesL.moveTo(px - r * 0.3 + r * 0.45, py - r * 0.3); pinesL.ellipse(px - r * 0.3, py - r * 0.3, r * 0.45, r * 0.22, -0.2, 0, TAU); }
          }
        }
      }
      ctx.fillStyle = Lr.pine; ctx.fill(pines);
      if (li) { ctx.fillStyle = 'rgba(120,170,110,0.45)'; ctx.fill(pinesL); }
      ctx.fillStyle = Lr.dot; ctx.fill(rocks);
      ctx.fillStyle = li ? 'rgba(80,78,72,0.45)' : 'rgba(110,116,120,0.4)'; ctx.fill(rockSh);
      if (!li && A) {
        const q = ((A.lake.from + A.lake.to) / 2 - ref) * Lr.f, sx = q - o + viewW / 2;
        if (sx > -260 && sx < viewW + 260) { const top = slopeY(q, Lr.base, Lr.rise, Lr.sd); pond = [sx, top + (GY - top) * 0.2]; }
      }
      if (li) continue;
      ctx.strokeStyle = Lr.path; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.setLineDash([3, 4]);
      ctx.beginPath();
      const zw = 260;
      for (let sx = x0; sx <= x1; sx += 6) {
        const q = Q(sx), top = slopeY(q, Lr.base, Lr.rise, Lr.sd), depth = GY - top, u = frac(q / zw), tri = u < 0.5 ? u * 2 : 2 - u * 2;
        const y = top + depth * (0.22 + 0.42 * tri);
        if (sx === x0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    }
    if (pond) lake(ctx, pond[0], pond[1], 250, time);
  }

  const colCache = {};
  function lerpCol(a, b, t) {
    const key = a + b + t;
    if (colCache[key]) return colCache[key];
    const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    const c = [0, 1, 2].map((i) => Math.round(lerp(p(a, i), p(b, i), t)));
    return (colCache[key] = 'rgb(' + c.join(',') + ')');
  }

  function backdrop(ctx, g, viewW, offY) {
    const A = g.level.alpine, camC = g.cam + viewW / 2;
    const k = sstep(A.from - 300, A.line + 120, camC);
    if (k <= 0.003) return;
    const key = seasonOf(g), S = SKYA[key] || SKYA.summer;
    ctx.save();
    ctx.globalAlpha = k;
    const gr = ctx.createLinearGradient(0, -offY, 0, GY);
    gr.addColorStop(0, S[0]); gr.addColorStop(1, S[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, -offY, viewW, GY + offY);
    peaks(ctx, viewW, (camC - A.line) * 0.05, key);
    cirque(ctx, viewW, (camC - A.line) * 0.12, key, g.time);
    slopes(ctx, viewW, camC, A.line, key, g.time, A);
    ctx.restore();
  }

  function ground(ctx, g, cam, viewW) {
    const A = g.level.alpine, a0 = A.from + 140, a1 = A.from + 520, x0 = max(cam - 20, a0), x1 = cam + viewW + 20;
    if (x1 <= x0) return;
    const T = TURF[seasonOf(g)] || TURF.summer;
    const fade = (c0, c1) => { const gr = ctx.createLinearGradient(a0, 0, a1, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; };
    ctx.fillStyle = fade('rgba(104,93,80,0)', 'rgba(104,93,80,1)'); ctx.fillRect(x0, GY + 10, x1 - x0, 2000);
    ctx.fillStyle = fade('rgba(125,114,98,0)', 'rgba(125,114,98,1)');
    ctx.beginPath(); ctx.moveTo(x0, GY + 24);
    for (let x = Math.floor(x0 / 16) * 16; x <= x1 + 16; x += 16) ctx.lineTo(x, GY + 23 + 2 * sin(x * 0.021 + 1));
    for (let x = Math.ceil(x1 / 16) * 16; x >= x0 - 16; x -= 16) ctx.lineTo(x, GY + 37 + 2.4 * sin(x * 0.017));
    ctx.closePath(); ctx.fill();
    const al = (x) => sstep(a0, a1, x);
    const c0 = Math.floor((x0 - 20) / 34), c1 = Math.ceil((x1 + 20) / 34);
    const stones = new Path2D(), stonesSh = new Path2D(), stonesL = new Path2D();
    for (let c = c0; c <= c1; c++) {
      const h1 = hash(c * 1.91), h2 = hash(c * 3.07), x = c * 34 + h1 * 30;
      if (al(x) < 0.5 || h2 < 0.35) continue;
      const y = GY + 16 + h2 * 50, w = 5 + h1 * 9, h = w * (0.5 + h2 * 0.3);
      stones.moveTo(x - w, y + h * 0.4); stones.quadraticCurveTo(x - w, y - h, x, y - h); stones.quadraticCurveTo(x + w, y - h * 0.9, x + w, y + h * 0.4); stones.closePath();
      stonesSh.moveTo(x + w * 0.2, y + h * 0.4); stonesSh.quadraticCurveTo(x + w * 0.9, y - h * 0.2, x + w, y + h * 0.4); stonesSh.closePath();
      stonesL.moveTo(x - w * 0.6, y - h * 0.3); stonesL.quadraticCurveTo(x - w * 0.3, y - h * 0.85, x + w * 0.1, y - h * 0.8);
    }
    ctx.fillStyle = '#9d988c'; ctx.fill(stones);
    ctx.fillStyle = 'rgba(60,54,46,0.45)'; ctx.fill(stonesSh);
    ctx.strokeStyle = 'rgba(230,226,214,0.6)'; ctx.lineWidth = 1.2; ctx.stroke(stonesL);
    const top = (x) => GY - 1.5 - 1.6 * sin(x * 0.09) - 1.2 * sin(x * 0.23 + 1);
    ctx.fillStyle = fade(T.top.replace('#', '#') + '00', T.top);
    ctx.beginPath(); ctx.moveTo(x0, GY + 14);
    for (let x = Math.floor(x0 / 6) * 6; x <= x1 + 6; x += 6) ctx.lineTo(x, top(x));
    for (let x = Math.ceil(x1 / 10) * 10; x >= x0 - 10; x -= 10) ctx.lineTo(x, GY + 13 + 2 * sin(x * 0.05));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = fade(T.low + '00', T.low);
    ctx.beginPath(); ctx.moveTo(x0, GY + 15);
    for (let x = Math.floor(x0 / 10) * 10; x <= x1 + 10; x += 10) ctx.lineTo(x, GY + 8 + 2 * sin(x * 0.05) + 1.5 * sin(x * 0.13));
    for (let x = Math.ceil(x1 / 10) * 10; x >= x0 - 10; x -= 10) ctx.lineTo(x, GY + 13 + 2 * sin(x * 0.05));
    ctx.closePath(); ctx.fill();
    const tufts = new Path2D(), tips = new Path2D(), dry = new Path2D(), flowers = [new Path2D(), new Path2D(), new Path2D()], pebbles = new Path2D();
    const t0 = Math.floor((x0 - 10) / 19), t1 = Math.ceil((x1 + 10) / 19);
    for (let c = t0; c <= t1; c++) {
      const h1 = hash(c * 0.73 + 2), h2 = hash(c * 1.19 + 5), x = c * 19 + h1 * 14;
      if (al(x) < 0.35) continue;
      const y = top(x) + 1, n = 3 + Math.floor(h2 * 3), path = h2 < 0.25 ? dry : tufts;
      for (let i = 0; i < n; i++) {
        const a = -0.55 + (i / (n - 1)) * 1.1 + (hash(c + i) - 0.5) * 0.25, l = 6 + hash(c * 3 + i) * 7;
        path.moveTo(x + i * 1.4 - n * 0.7, y + 1); path.quadraticCurveTo(x + i * 1.4 - n * 0.7 + sin(a) * l * 0.4, y - l * 0.6, x + i * 1.4 - n * 0.7 + sin(a) * l, y - cos(a) * l);
        if (i === 1) { tips.moveTo(x - n * 0.7 + 1.4 + sin(a) * l * 0.7, y - cos(a) * l * 0.7); tips.lineTo(x - n * 0.7 + 1.4 + sin(a) * l, y - cos(a) * l); }
      }
      if (h1 > 0.62 && seasonOf(g) !== 'autumn') { const f = flowers[Math.floor(h2 * 3) % 3], fy = y - 7 - h2 * 5; f.moveTo(x + 4 + 2.2, fy); f.arc(x + 4, fy, 2.2, 0, TAU); }
      if (h2 > 0.7) { const px = x + 9, py = GY + 3 + h1 * 6; pebbles.moveTo(px + 3.4, py); pebbles.ellipse(px, py, 3.4, 2, 0, 0, TAU); }
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = T.tuft; ctx.lineWidth = 1.6; ctx.stroke(tufts);
    ctx.strokeStyle = T.dry; ctx.stroke(dry);
    ctx.strokeStyle = T.tip; ctx.lineWidth = 1.2; ctx.stroke(tips);
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#b4b0a6'; ctx.fill(pebbles);
    ctx.fillStyle = '#4b63d1'; ctx.fill(flowers[0]);
    ctx.fillStyle = '#f2c230'; ctx.fill(flowers[1]);
    ctx.fillStyle = '#f4f1ea'; ctx.fill(flowers[2]);
  }

  const rockGeo = new Map();
  function boulderGeo(w, h, sd) {
    const key = Math.round(w) + ':' + Math.round(h) + ':' + Math.round(sd * 1000);
    let G = rockGeo.get(key);
    if (G) return G;
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = PI + (i / (n - 1)) * PI, j = 0.82 + hash(sd * 13 + i * 1.7) * 0.3;
      pts.push(cos(a) * w * 0.5 * (i === 0 || i === n - 1 ? 1.04 : j), min(3, sin(a) * h * (i === 0 || i === n - 1 ? 0 : j)) + (i === 0 || i === n - 1 ? 4 : 0));
    }
    const body = new Path2D(); body.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) body.lineTo(pts[i], pts[i + 1]);
    body.closePath();
    const lit = new Path2D(), sh = new Path2D(), cracks = new Path2D(), lich = new Path2D();
    lit.moveTo(pts[0] * 0.85, pts[1] - 2);
    for (let i = 2; i <= 8; i += 2) lit.lineTo(pts[i] * 0.92, pts[i + 1] * 0.95 + 1);
    lit.lineTo(-w * 0.05, -h * 0.35); lit.lineTo(-w * 0.32, -h * 0.05); lit.closePath();
    sh.moveTo(w * 0.12, -h * 0.82);
    for (let i = 10; i < pts.length; i += 2) sh.lineTo(pts[i], pts[i + 1]);
    sh.lineTo(w * 0.05, 4); sh.lineTo(w * 0.18, -h * 0.3); sh.closePath();
    const cx = (hash(sd * 3) - 0.5) * w * 0.4;
    cracks.moveTo(cx, -h * 0.9); cracks.lineTo(cx + w * 0.06, -h * 0.5); cracks.lineTo(cx - w * 0.03, -h * 0.15);
    if (w > 40) { cracks.moveTo(-w * 0.35, -h * 0.4); cracks.lineTo(-w * 0.15, -h * 0.48); }
    for (let i = 0; i < 4; i++) {
      const lx = (hash(sd * 7 + i) - 0.5) * w * 0.7, ly = -h * (0.3 + hash(sd * 5 + i) * 0.5), r = 1.4 + hash(sd + i * 3) * 2.4;
      lich.moveTo(lx + r, ly); lich.ellipse(lx, ly, r, r * 0.7, 0, 0, TAU);
    }
    G = { body, lit, sh, cracks, lich };
    rockGeo.set(key, G);
    return G;
  }

  function boulder(ctx, x, y, w, h, sd, tone) {
    const G = boulderGeo(w, h, sd);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(40,36,26,0.18)'; ell(ctx, 2, 3, w * 0.56, 4);
    ctx.fillStyle = tone ? ROCK.mid : ROCK.face; ctx.fill(G.body);
    ctx.fillStyle = tone ? ROCK.face : ROCK.lit; ctx.fill(G.lit);
    ctx.fillStyle = 'rgba(70,66,58,0.42)'; ctx.fill(G.sh);
    ctx.strokeStyle = 'rgba(70,66,60,0.55)'; ctx.lineWidth = 1.1; ctx.stroke(G.cracks);
    ctx.fillStyle = 'rgba(190,184,122,0.75)'; ctx.fill(G.lich);
    ctx.restore();
  }

  function grassAt(ctx, x, y, w, sd, T) {
    ctx.strokeStyle = T.tuft; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const gx = x - w / 2 + hash(sd + i * 1.3) * w, l = 5 + hash(sd + i * 2.9) * 6, a = (hash(sd + i * 4.1) - 0.5) * 1.1;
      ctx.moveTo(gx, y + 1); ctx.quadraticCurveTo(gx + sin(a) * l * 0.3, y - l * 0.6, gx + sin(a) * l, y - cos(a) * l);
    }
    ctx.stroke(); ctx.lineCap = 'butt';
  }

  const pineGeo = new Map();
  function clumpGeo(r, sd) {
    const key = Math.round(r * 2) + ':' + Math.round(sd * 997);
    let G = pineGeo.get(key);
    if (G) return G;
    const dark = new Path2D(), mid = new Path2D(), lit = new Path2D(), tips = new Path2D();
    const star = (p, cx, cy, rad, n, k, s, squash) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, low = sin(a) > 0, rr2 = rad * (i % 2 ? 1 : k) * (0.88 + hash(s + i * 0.7) * 0.24);
        const px = cx + cos(a) * rr2, py = cy + sin(a) * rr2 * (low ? squash * 0.7 : squash);
        if (i === 0) p.moveTo(px, py); else p.lineTo(px, py);
      }
      p.closePath();
    };
    star(dark, 0, 0, r, 30, 0.8, sd, 0.78);
    for (let m = 0; m < 3; m++) star(mid, (m - 1) * r * 0.36 - r * 0.1, -r * (0.12 + (m === 1 ? 0.14 : 0)), r * 0.5, 20, 0.76, sd + m * 5, 0.72);
    for (let m = 0; m < 2; m++) star(lit, (m - 0.7) * r * 0.42 - r * 0.05, -r * (0.36 + m * 0.08), r * 0.28, 12, 0.7, sd + m * 9, 0.7);
    for (let i = 0; i < 16; i++) {
      const a = PI * 0.95 + (i / 15) * PI * 1.1, rad = r * (0.84 + hash(sd + i * 3.3) * 0.16), px = cos(a) * rad, py = sin(a) * rad * 0.78;
      tips.moveTo(px * 0.88, py * 0.88); tips.lineTo(px + cos(a) * 3, py + sin(a) * 2.4);
    }
    G = { dark, mid, lit, tips };
    pineGeo.set(key, G);
    return G;
  }

  function clump(ctx, x, y, r, sd, P, skew) {
    const G = clumpGeo(r, sd);
    ctx.save(); ctx.translate(x, y);
    if (skew) ctx.transform(1, 0, skew, 1, 0, 0);
    ctx.fillStyle = P.dark; ctx.fill(G.dark);
    ctx.fillStyle = P.mid; ctx.fill(G.mid);
    ctx.fillStyle = P.lit; ctx.fill(G.lit);
    ctx.strokeStyle = P.tip; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.stroke(G.tips); ctx.lineCap = 'butt';
    ctx.restore();
  }

  const thicketGeo = new WeakMap();
  function thicketOf(t) {
    let G = thicketGeo.get(t);
    if (G) return G;
    const [a, b] = t, w = b - a, sd = a * 0.013, back = [], front = [], stems = new Path2D();
    const n = Math.max(3, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = a + u * w + (hash(sd + i) - 0.5) * 10, hump = sin(PI * u);
      back.push({ x, y: GY - 14 - hump * 22 - hash(sd + i * 2) * 8, r: 20 + hump * 10 + hash(sd + i * 3) * 6, sd: sd + i * 1.3 });
      stems.moveTo(x, GY); stems.quadraticCurveTo(x + (hash(sd + i * 4) - 0.5) * 16, GY - 12, x + (hash(sd + i * 5) - 0.5) * 24, GY - 24 - hump * 10);
    }
    const m = Math.max(3, Math.round(w / 22));
    for (let i = 0; i < m; i++) {
      const u = (i + 0.3 + hash(sd + i * 7) * 0.4) / m, x = a - 8 + u * (w + 16);
      front.push({ x, y: GY + 8 + hash(sd + i * 8) * 4, r: 14 + sin(PI * u) * 10 + hash(sd + i * 9) * 5, sd: sd + 50 + i * 1.7 });
    }
    G = { back, front, stems };
    thicketGeo.set(t, G);
    return G;
  }

  function stir(g, x) {
    const b = g.bear, d = b.x - x;
    if (!b.onGround || abs(d) > 46) return 0;
    const mv = b.moving ? (b.running ? 1 : 0.6) : b.crouch ? 0.25 : 0.1;
    return mv * (1 - abs(d) / 46) * sin(g.time * (b.running ? 16 : 9) + x * 0.1) * 0.22;
  }

  function thicketBack(ctx, t, g) {
    const G = thicketOf(t);
    ctx.fillStyle = 'rgba(30,40,22,0.2)'; ell(ctx, (t[0] + t[1]) / 2, GY + 2, (t[1] - t[0]) / 2 + 20, 5);
    ctx.strokeStyle = PINE.stem; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(G.stems); ctx.lineCap = 'butt';
    for (const c of G.back) clump(ctx, c.x, c.y, c.r, c.sd, PINE, stir(g, c.x));
  }

  function thicketFront(ctx, t, g) {
    const G = thicketOf(t), P = { dark: '#1d3a28', mid: PINE.mid, lit: PINE.lit, tip: PINE.tip };
    for (const c of G.front) clump(ctx, c.x, c.y, c.r, c.sd, P, stir(g, c.x) * 1.4);
  }

  const limbaGeo = new WeakMap();
  function limbaOf(t) {
    let G = limbaGeo.get(t);
    if (G) return G;
    const sd = t.x * 0.0173, r = t.r, top = GY - t.h, cl = [];
    const spots = [[0, 4, 0.5], [-0.58, 0.4, 0.42], [0.6, 0.28, 0.44], [-0.22, 0.86, 0.38], [0.42, 0.95, 0.34], [-0.72, 1.28, 0.3], [0.66, 1.42, 0.28], [0.05, 0.55, 0.36]];
    spots.forEach(([dx, dy, rr2], i) => cl.push({ x: t.x + (dx + (hash(sd + i) - 0.5) * 0.12) * r, y: top + (i === 0 ? dy : dy * r) + (hash(sd + i * 2) - 0.5) * 6, r: rr2 * r * (0.92 + hash(sd + i * 3) * 0.16), sd: sd + i * 2.3 }));
    const br = new Path2D(), twigs = new Path2D();
    for (let i = 1; i < cl.length; i++) {
      const c = cl[i], by = clamp(c.y + c.r * 0.45, top + 18, GY - t.h * 0.3), sx = t.x + Math.sign(c.x - t.x) * t.w * 0.18;
      br.moveTo(sx, by + 14); br.quadraticCurveTo(lerp(sx, c.x, 0.4), by + 6, c.x, c.y + c.r * 0.2);
    }
    for (let i = 0; i < 5; i++) {
      const y = GY - t.h * (0.28 + i * 0.07), s = i % 2 ? 1 : -1, l = 10 + hash(sd + i * 4) * 10;
      twigs.moveTo(t.x + s * t.w * 0.3, y); twigs.lineTo(t.x + s * (t.w * 0.3 + l), y - l * 0.5);
    }
    const fiss = new Path2D();
    for (let i = 0; i < 7; i++) {
      const fx = t.x - t.w * 0.38 + (i / 6) * t.w * 0.76, y0 = GY - 10 - hash(sd + i * 5) * 20, y1 = GY - t.h * (0.45 + hash(sd + i) * 0.4);
      fiss.moveTo(fx, y0); fiss.lineTo(fx + (hash(sd + i * 7) - 0.5) * 4, (y0 + y1) / 2); fiss.lineTo(fx + (hash(sd + i * 9) - 0.5) * 3, y1);
    }
    G = { cl, br, twigs, fiss };
    limbaGeo.set(t, G);
    return G;
  }

  function limbaTrunk(ctx, t) {
    const G = limbaOf(t), half = t.w / 2, top = GY - t.h * 0.94;
    ctx.fillStyle = 'rgba(30,26,14,0.18)'; ell(ctx, t.x, GY + 1, half + 22, 5);
    ctx.fillStyle = LIMBA.bark;
    ctx.beginPath();
    ctx.moveTo(t.x - half - 10, GY); ctx.quadraticCurveTo(t.x - half, GY - 6, t.x - half + 1, GY - 24); ctx.lineTo(t.x - half * 0.55, top);
    ctx.lineTo(t.x + half * 0.55, top); ctx.lineTo(t.x + half - 1, GY - 24); ctx.quadraticCurveTo(t.x + half, GY - 6, t.x + half + 10, GY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,22,14,0.2)';
    ctx.beginPath(); ctx.moveTo(t.x + half * 0.15, top); ctx.lineTo(t.x + half * 0.55, top); ctx.lineTo(t.x + half - 1, GY - 24); ctx.lineTo(t.x + half + 6, GY); ctx.lineTo(t.x + half * 0.2, GY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = LIMBA.barkD; ctx.lineWidth = 1.3; ctx.stroke(G.fiss);
    ctx.strokeStyle = 'rgba(200,190,170,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t.x - half * 0.6, GY - 20); ctx.lineTo(t.x - half * 0.35, top + 10); ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = LIMBA.barkD; ctx.lineWidth = 5; ctx.stroke(G.br);
    ctx.strokeStyle = LIMBA.bark; ctx.lineWidth = 3.4; ctx.stroke(G.br);
    ctx.strokeStyle = LIMBA.barkD; ctx.lineWidth = 2; ctx.stroke(G.twigs);
    ctx.lineCap = 'butt';
  }

  function limbaCrown(ctx, t, season, g) {
    const G = limbaOf(t), P = { dark: LIMBA.dark, mid: LIMBA.mid, lit: LIMBA.lit, tip: LIMBA.tip };
    const sw = sin((g ? g.time : 0) * 0.9 + t.x * 0.01) * 0.015;
    for (let i = G.cl.length - 1; i >= 0; i--) { const c = G.cl[i]; clump(ctx, c.x, c.y + c.r * 0.35, c.r * 1.05, c.sd, P, sw); }
  }

  function cone(ctx, x, y, s, a, eaten) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    if (eaten) {
      ctx.fillStyle = '#7a5a40'; ell(ctx, 0, 0, 2.2, 5.6);
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#4a2a3e'; ell(ctx, 0, 0.6, 6.2, 8.8);
    ctx.fillStyle = '#6e3c5c'; ell(ctx, -0.6, 0, 5.6, 8.2);
    ctx.strokeStyle = 'rgba(40,18,32,0.75)'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let r = 0; r < 5; r++) {
      const yy = -6 + r * 3, w = 5.2 * sqrt(max(0, 1 - (yy / 8.6) * (yy / 8.6)));
      for (let c = 0; c < 3; c++) { const cx = -w + (c + (r % 2) * 0.5) * (w * 0.75); if (cx > w - 0.5) continue; ctx.moveTo(cx - 1.6, yy); ctx.quadraticCurveTo(cx, yy + 2.2, cx + 1.6, yy); }
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(214,170,214,0.35)'; ell(ctx, -2.4, -2.6, 1.6, 3.4, 0.2);
    ctx.fillStyle = '#5b4535'; ctx.fillRect(-0.8, 7.6, 1.6, 2.4);
    ctx.restore();
  }

  function coneItem(ctx, it, time) {
    const sd = hash(it.x * 0.031);
    if (it.y !== undefined) {
      if (it.eaten) return;
      const sw = sin(time * 1.3 + sd * 6) * 0.05;
      ctx.strokeStyle = LIMBA.tip; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = PI * 0.15 + i * 0.12 * PI; ctx.moveTo(it.x, it.y + 9); ctx.lineTo(it.x + cos(a) * 8, it.y + 9 + sin(a) * 5); }
      ctx.stroke(); ctx.lineCap = 'butt';
      cone(ctx, it.x, it.y, 1.15, sw, false);
      return;
    }
    ctx.save(); ctx.translate(it.x, GY);
    ctx.fillStyle = 'rgba(30,26,12,0.18)'; ell(ctx, 0, 1, 14, 2.4);
    if (it.eaten) {
      for (let i = 0; i < 6; i++) {
        const x = -9 + i * 3.6 + hash(sd + i) * 2, a = (hash(sd + i * 3) - 0.5) * 2;
        ctx.fillStyle = i % 2 ? '#6e4a3a' : '#5a3a4a'; ell(ctx, x, -1.4, 2.4, 1.3, a);
      }
      ctx.fillStyle = '#e8dcc0'; ell(ctx, 6, -1, 1.2, 0.8, 0.4); ell(ctx, -5, -0.8, 1.1, 0.8, -0.3);
      cone(ctx, 1, -2.4, 1, 1.4, true);
      ctx.restore();
      return;
    }
    cone(ctx, -3, -5.6, 1.15, 1.25 + (sd - 0.5) * 0.3, false);
    ctx.fillStyle = '#efe3c6'; ell(ctx, 8, -1.6, 1.8, 1.2, 0.3); ell(ctx, 11, -1.2, 1.6, 1.1, -0.4);
    ctx.fillStyle = '#5b4535'; ell(ctx, 9.6, -2, 0.6, 0.4);
    ctx.restore();
  }

  function slab(ctx, lg, g) {
    const x = lg.x, w = lg.w, h = lg.h, l = x - w / 2, r = x + w / 2, sd = x * 0.011;
    ctx.fillStyle = 'rgba(40,36,26,0.2)'; ell(ctx, x + 4, GY + 2, w * 0.58, 5);
    ctx.fillStyle = ROCK.mid;
    poly(ctx, [l - 8, GY + 3, l - 3, GY - h + 8, l + 6, GY - h, r - 12, GY - h - 1.5, r - 2, GY - h + 4, r + 6, GY + 3]);
    ctx.fillStyle = ROCK.lit;
    poly(ctx, [l - 2, GY - h + 7, l + 6, GY - h, r - 12, GY - h - 1.5, r - 4, GY - h + 4, r - 16, GY - h + 7, l + 10, GY - h + 8]);
    ctx.fillStyle = 'rgba(80,76,68,0.4)';
    poly(ctx, [r - 4, GY - h + 4, r + 6, GY + 3, r - 22, GY + 3, r - 16, GY - h + 9]);
    ctx.strokeStyle = 'rgba(70,66,60,0.55)'; ctx.lineWidth = 1.1;
    ctx.beginPath();
    const cx = l + w * (0.35 + hash(sd) * 0.3);
    ctx.moveTo(cx, GY - h + 8); ctx.lineTo(cx + 4, GY - h * 0.45); ctx.lineTo(cx - 2, GY);
    ctx.moveTo(l + 6, GY - h * 0.45); ctx.lineTo(l + w * 0.22, GY - h * 0.55);
    ctx.stroke();
    ctx.fillStyle = 'rgba(190,184,122,0.75)';
    for (let i = 0; i < 4; i++) ell(ctx, l + 10 + hash(sd + i) * (w - 30), GY - h + 12 + hash(sd + i * 2) * (h - 16), 2.6, 1.6);
    ctx.fillStyle = 'rgba(122,150,80,0.85)'; ell(ctx, l + 14, GY - h + 1, 9, 2); ell(ctx, r - 30, GY - h + 0.6, 6, 1.6);
    grassAt(ctx, l - 4, GY + 1, 14, sd, TURF[seasonOf(g)] || TURF.summer);
    grassAt(ctx, r + 4, GY + 1, 12, sd + 3, TURF[seasonOf(g)] || TURF.summer);
  }

  const MC = { fur: '#8c6f52', back: '#6e5640', belly: '#cdb48e', cap: '#4b3a2c', muzzle: '#e9dcc4', nose: '#2a1d16', eye: '#1a120c', ear: '#5c4634', tail: '#3e2f24', paw: '#3a2c22' };
  function marmotBody(ctx, up, alarm, open, time, sd, k) {
    const bx = lerp(0, 0, up), by = lerp(-7, -13, up), rx = lerp(12.5, 8.6, up), ry = lerp(7.4, 13.2, up) * (1 + alarm * 0.06), rot = lerp(0, -0.06, up);
    const tailA = lerp(0.3, 1.25, up) + alarm * 0.3 * sin(time * 18 + sd);
    ctx.save(); ctx.translate(-rx * 0.8, by + ry * 0.45); ctx.rotate(tailA);
    ctx.fillStyle = MC.tail; ell(ctx, -5, 0, 6, 2.6);
    ctx.fillStyle = '#1f1712'; ell(ctx, -9, 0, 2.6, 2.2);
    ctx.restore();
    ctx.fillStyle = MC.paw;
    ell(ctx, lerp(-7, -3, up), -1.2, 3.4, 1.8);
    ctx.fillStyle = MC.back; ell(ctx, bx - 0.6, by, rx, ry, rot);
    ctx.fillStyle = MC.fur; ell(ctx, bx + 0.6, by + 0.4, rx * 0.92, ry * 0.94, rot);
    ctx.fillStyle = MC.belly; ell(ctx, bx + rx * lerp(0.3, 0.38, up), by + ry * lerp(0.35, 0.12, up), rx * lerp(0.6, 0.5, up), ry * lerp(0.42, 0.78, up), rot);
    ctx.strokeStyle = 'rgba(70,52,36,0.5)'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = -1.9 + i * 0.32, px = bx + cos(a) * rx * 0.8, py = by + sin(a) * ry * 0.8; ctx.moveTo(px, py); ctx.lineTo(px - 1.6, py + 1.8); }
    ctx.stroke();
    const hx = lerp(rx * 0.95, 2.4, up), hy = lerp(-5.5, by - ry * 0.95 - 3.6, up), ha = lerp(0.35, -0.08, up);
    if (up > 0.35) {
      ctx.fillStyle = MC.paw;
      const pw = lerp(0, 1, sstep(0.35, 0.8, up));
      ell(ctx, rx * 0.55, by - ry * 0.25 + alarm * 1.5, 2.6 * pw, 2 * pw, 0.4);
      ell(ctx, rx * 0.35, by - ry * 0.18 + alarm * 1.5, 2.4 * pw, 1.8 * pw, 0.4);
    } else {
      ctx.fillStyle = MC.paw; ell(ctx, rx * 0.65, -1.2, 3, 1.7);
    }
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha);
    ctx.fillStyle = MC.ear; circle(ctx, -3.2, -4.4, 2); circle(ctx, -0.6, -5.2, 1.6);
    ctx.fillStyle = MC.fur; ell(ctx, 0, 0, 6.2, 5.4);
    ctx.fillStyle = MC.cap; ctx.beginPath(); ctx.ellipse(-0.6, -1, 6, 4.6, 0, PI * 1.02, TAU * 0.99); ctx.fill();
    ctx.fillStyle = MC.muzzle; ell(ctx, 3.6, 1.6, 3.6, 2.8);
    ctx.fillStyle = MC.nose; ell(ctx, 6.4, 0.4, 1.4, 1.1);
    if (open > 0.05) { ctx.fillStyle = '#5a2a22'; ell(ctx, 4.8, 3.4, 1.4, 1 + open * 1.2); ctx.fillStyle = '#f4efe2'; ctx.fillRect(4.2, 2.2, 1.4, 1.2); }
    ctx.fillStyle = MC.eye; circle(ctx, 1.6, -1.1, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, 1.9, -1.5, 0.4);
    ctx.restore();
    return [hx + cos(ha) * 7, hy + sin(ha) * 7 + 2];
  }

  function marmot(ctx, m, rock, g) {
    const time = g.time, sd = hash(m.x * 0.07);
    const st = stateOf(m.id, time, () => ({ up: m.state === 'graze' ? 0 : 1, k: m.k, face: m.dir < 0 ? -1 : 1 }));
    const wantUp = m.state === 'graze' ? 0 : 1;
    st.up = ease(st.up, wantUp, 6, st.dt);
    st.face = ease(st.face, m.dir < 0 ? -1 : 1, 10, st.dt);
    const alarm = m.state === 'alarm' ? 1 : 0, since = time - m.whistleAt, open = since < 0.45 ? sin(PI * since / 0.45) : 0;
    const rimY = GY - rock.h + 3, H = 34;
    ctx.save();
    ctx.beginPath(); ctx.rect(m.x - 40, rimY - 80, 80, 80); ctx.clip();
    ctx.translate(m.x - 4, rimY + (1 - m.k) * H);
    ctx.scale(1.2 * (Math.sign(st.face) || 1) * (0.3 + 0.7 * min(1, abs(st.face))), 1.2);
    const mouth = marmotBody(ctx, st.up, alarm, open, time, sd, m.k);
    ctx.restore();
    if (open > 0.05) {
      const f = Math.sign(st.face) || 1, mx = m.x - 4 + mouth[0] * 1.2 * f, my = rimY + (1 - m.k) * H + mouth[1] * 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * open).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(mx, my, 5 + i * 4.5 + since * 18, f > 0 ? -0.6 : PI - 0.6 + 0.0, f > 0 ? 0.6 : PI + 0.6); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
  }

  function marmotRock(ctx, m, g) {
    const w = 60 + m.h * 0.6, sd = m.x * 0.0071;
    boulder(ctx, m.x + 22, GY + 2, w * 0.55, m.h * 0.7, sd + 0.3, 1);
    marmot(ctx, g.alpine && g.alpine.marmots.find((o) => o.x === m.x) || { id: 'mrm' + m.x, x: m.x, k: 1, state: 'sit', dir: 1, whistleAt: -99 }, m, g);
    boulder(ctx, m.x - 2, GY + 3, w, m.h + 4, sd, 0);
    ctx.fillStyle = 'rgba(40,30,22,0.75)'; ell(ctx, m.x - w * 0.42, GY - 2, 6, 3.4);
    grassAt(ctx, m.x - w * 0.5, GY + 1, 16, sd * 9, TURF[seasonOf(g)] || TURF.summer);
  }

  const CH = { coat: '#8a5a33', hi: '#a5703f', shade: '#6a4226', dorsal: '#3e281a', belly: '#c9a273', leg: '#4a3020', far: '#3a2618', hoof: '#16100c', face: '#efe3c8', stripe: '#33221a', horn: '#1a1512', ear: '#7a4f2d', earIn: '#e8d5b6' };
  const CBODY = [-20, -31, -18, -37.5, -8, -40.6, 4, -40.4, 13, -39.6, 19, -35, 20, -28.5, 15, -24.4, 4, -23.6, -7, -24, -15, -25, -19.6, -27.6];

  function chamoisLegs(ctx, front, far, tuck, crouch, land, graze) {
    const col = far ? CH.far : CH.leg, ox = far ? -2.4 : 1.4, dy = crouch * 6;
    const sx = front ? 11 + ox : -12 + ox, sy = -27 + dy;
    let kx, ky, fx, fy;
    if (front) {
      kx = lerp(sx + 1, sx + 7, tuck); ky = lerp(-13 + dy * 0.5, -24, tuck);
      fx = lerp(sx + 0.5 + land * 4 + graze * 1.5, sx + 5, tuck); fy = lerp(0, -16, tuck);
    } else {
      kx = lerp(sx - 4 - crouch * 3, sx - 9, tuck); ky = lerp(-12 + dy * 0.3, -22, tuck);
      fx = lerp(sx + 0.5 - crouch * 2, sx - 20, tuck); fy = lerp(0, -18, tuck);
    }
    limb(ctx, sx, sy, kx, ky, front ? 5 : 6.6, 3.2, col);
    limb(ctx, kx, ky, fx, fy, 3, 2.2, col);
    ctx.fillStyle = 'rgba(232,218,190,0.55)'; ell(ctx, lerp(kx, fx, 0.7), lerp(ky, fy, 0.7), 1.2, 2.4, 0);
    ctx.fillStyle = CH.hoof; ell(ctx, fx + 0.6, fy - 0.4, 2, 1.4);
  }

  function chamoisHead(ctx, hx, hy, a, alert, blink, chew) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    ctx.fillStyle = CH.ear;
    ctx.save(); ctx.translate(-2.5, -4); ctx.rotate(-0.9 - alert * 0.25); ell(ctx, 0, -3.2, 1.8, 4); ctx.fillStyle = CH.earIn; ell(ctx, 0.2, -3.2, 0.9, 2.6); ctx.restore();
    ctx.strokeStyle = CH.horn; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.4, -4.4); ctx.quadraticCurveTo(1.2, -11.6, -0.4, -13.4); ctx.quadraticCurveTo(-2.2, -14.2, -2.8, -11.8); ctx.stroke();
    ctx.lineWidth = 1.7; ctx.strokeStyle = '#2c2420';
    ctx.beginPath(); ctx.moveTo(2.2, -4); ctx.quadraticCurveTo(3, -10.8, 1.6, -12.6); ctx.quadraticCurveTo(0.2, -13.4, -0.4, -11.4); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = CH.face; blob(ctx, [-5, -3.4, 0, -5.4, 5, -3.6, 9.6, -1.6, 11.6, 0.6, 11, 2.6 + chew * 0.5, 6, 3.8, 0, 3.8, -4.6, 2]);
    ctx.fillStyle = CH.stripe;
    poly(ctx, [-3.6, -3, 0.6, -2.4, 5.4, -0.4, 10.6, 0.2, 10.8, 1.6, 5.2, 1.6, 0.2, 0.8, -3.8, 0]);
    ctx.fillStyle = CH.ear;
    ctx.save(); ctx.translate(-1.6, -4.4); ctx.rotate(-0.55 - alert * 0.35); ell(ctx, 0, -3.4, 2, 4.2); ctx.fillStyle = CH.earIn; ell(ctx, 0.3, -3.2, 1, 2.8); ctx.restore();
    ctx.fillStyle = '#1b1210'; ell(ctx, 11.2, 0.6, 1.3, 1.1);
    if (!blink) { ctx.fillStyle = '#120c08'; circle(ctx, 2.4, -0.9, 1.25); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, 2.8, -1.3, 0.4); }
    ctx.restore();
  }

  function chamois(ctx, c, g) {
    const time = g.time, sd = hash(c.x * 0.013 + c.home * 7.3);
    const st = stateOf(c.id, time, () => ({ head: c.state === 'graze' ? 0.3 : 1, face: c.dir < 0 ? -1 : 1, crouch: 0 }));
    const leap = c.leap, air = leap && leap.wait <= 0 ? clamp(leap.t, 0, 1) : -1;
    const tuck = air >= 0 ? sin(PI * clamp((air - 0.1) / 0.8, 0, 1)) : 0;
    const crouch = leap && leap.wait > 0 ? 1 : 0;
    st.crouch = ease(st.crouch, crouch, 18, st.dt);
    const land = c.land ? sstep(0, 0.12, time - c.land) * (1 - sstep(0.12, 0.3, time - c.land)) : 0;
    const graze = c.state === 'graze' && !leap ? 1 : 0;
    const nib = graze ? sstep(-0.3, 0.3, sin(time * 0.5 + sd * 9)) : 0;
    st.head = ease(st.head, graze ? 1 - nib : 1, leap ? 14 : 5, st.dt);
    st.face = ease(st.face, c.dir < 0 ? -1 : 1, leap ? 22 : 8, st.dt);
    const pitch = air >= 0 ? lerp(-0.18, 0.16, air) : -st.crouch * 0.06;
    const alert = c.state === 'graze' ? 0 : 1;
    const y = GY - c.h, fs = 0.25 + 0.75 * min(1, abs(st.face));
    ctx.save(); ctx.translate(c.x, y);
    if (air < 0) { ctx.fillStyle = 'rgba(40,34,26,0.22)'; ell(ctx, 0, 0.8, 18, 2.4); }
    ctx.scale(0.98 * (Math.sign(st.face) || 1) * fs, 0.98);
    ctx.translate(0, -30); ctx.rotate(pitch); ctx.translate(0, 30);
    chamoisLegs(ctx, true, true, tuck, st.crouch, land, graze);
    chamoisLegs(ctx, false, true, tuck, st.crouch, land, graze);
    ctx.save(); ctx.translate(0, st.crouch * 5);
    ctx.fillStyle = CH.shade; blob(ctx, CBODY);
    ctx.fillStyle = CH.coat; ctx.save(); ctx.translate(0, -1); ctx.scale(1, 0.94); blob(ctx, CBODY); ctx.restore();
    ctx.fillStyle = CH.hi; ell(ctx, -2, -37, 12, 2.4, 0.02);
    ctx.fillStyle = CH.dorsal; ell(ctx, -2, -40, 14, 1.6, 0.02);
    ctx.fillStyle = CH.belly; ell(ctx, -1, -25.4, 11, 2, 0);
    ctx.fillStyle = CH.dorsal; ell(ctx, -21, -33, 2.4, 3.4, -0.4);
    ctx.restore();
    chamoisLegs(ctx, false, false, tuck, st.crouch, land, graze);
    chamoisLegs(ctx, true, false, tuck, st.crouch, land, graze);
    const hk = clamp(st.head, 0, 1), hx = lerp(31, 22, hk), hy = lerp(-9, -52, hk) + st.crouch * 4, ha = lerp(0.95, 0.2, hk) - alert * 0.08;
    limb(ctx, 14, -34 + st.crouch * 5, hx - 2.4, hy + 2.6, 8.4, 5.2, CH.coat);
    limb(ctx, 12, -38 + st.crouch * 5, hx - 3.4, hy - 1.4, 2, 1.4, CH.dorsal);
    chamoisHead(ctx, hx, hy, ha, alert, frac(time / 3.1 + sd) < 0.03, graze ? sin(time * 9 + sd) : 0);
    ctx.restore();
    if (c.snortAt && time - c.snortAt < 0.6) {
      const u = (time - c.snortAt) / 0.6, f = Math.sign(st.face) || 1;
      for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - u)).toFixed(3) + ')'; circle(ctx, c.x + f * (30 + u * 16 + i * 4), y - 60 - i * 2 + u * 4, 1.6 + u * 3); }
    }
  }

  const cragGeo = new WeakMap();
  function cragOf(A) {
    let G = cragGeo.get(A);
    if (G) return G;
    const pts = ZS.sim.alpine.route(A), blocks = [];
    pts.forEach(([x, h], i) => blocks.push({ x: x + (i % 2 ? 4 : -4), h, w: 52 + hash(i * 3.7) * 26 + (h > 100 ? 14 : 0), sd: hash(x * 0.01 + i) }));
    blocks.push({ x: A.crag.from + 60, h: 14, w: 120, sd: 0.21 }, { x: A.crag.to - 40, h: 120, w: 70, sd: 0.77 }, { x: A.crag.to + 10, h: 60, w: 90, sd: 0.53 });
    blocks.sort((a, b) => b.h - a.h);
    G = blocks.map((b) => {
      const l = b.x - b.w / 2, r = b.x + b.w / 2, top = GY - b.h, sd = b.sd, path = [];
      path.push(l - 10 - sd * 6, GY + 2, l - 2, top + 10 + sd * 6, l + 8, top + 1, r - 10, top - 1, r - 1, top + 8, r + 8 + sd * 4, GY + 2);
      const lit = [l - 2, top + 10 + sd * 6, l + 8, top + 1, r - 10, top - 1, r - 6, top + 5, l + 12, top + 7];
      const face = [l - 2, top + 10 + sd * 6, l + 10, top + 7, l + 8 + b.w * 0.2, GY + 2, l - 10 - sd * 6, GY + 2];
      const shade = [r - 1, top + 8, r + 8 + sd * 4, GY + 2, r - b.w * 0.28, GY + 2, r - b.w * 0.2, top + 12];
      const cracks = new Path2D();
      for (let i = 0; i < 3; i++) {
        const cx = l + b.w * (0.25 + i * 0.25) + (hash(sd * 9 + i) - 0.5) * 8, y0 = top + 8 + hash(sd + i) * 10;
        cracks.moveTo(cx, y0); cracks.lineTo(cx + (hash(sd * 3 + i) - 0.5) * 8, y0 + b.h * 0.3); cracks.lineTo(cx + (hash(sd * 5 + i) - 0.5) * 6, min(GY, y0 + b.h * 0.6));
      }
      const bands = new Path2D();
      for (let yy = top + 26; yy < GY - 10; yy += 22 + hash(sd + yy) * 10) { bands.moveTo(l + 2, yy); bands.lineTo(r - 4, yy + (hash(sd + yy * 0.1) - 0.5) * 6); }
      return { path, lit, face, shade, cracks, bands, b };
    });
    cragGeo.set(A, G);
    return G;
  }

  function crag(ctx, A, g) {
    const G = cragOf(A), T = TURF[seasonOf(g)] || TURF.summer;
    for (const k of G) {
      ctx.fillStyle = ROCK.mid; poly(ctx, k.path);
      ctx.fillStyle = ROCK.face; poly(ctx, k.face);
      ctx.fillStyle = ROCK.lit; poly(ctx, k.lit);
      ctx.fillStyle = 'rgba(70,66,58,0.4)'; poly(ctx, k.shade);
      ctx.strokeStyle = 'rgba(70,66,60,0.4)'; ctx.lineWidth = 1.2; ctx.stroke(k.bands);
      ctx.strokeStyle = 'rgba(60,56,50,0.55)'; ctx.lineWidth = 1.1; ctx.stroke(k.cracks);
      ctx.fillStyle = 'rgba(120,150,80,0.9)';
      ell(ctx, k.b.x - k.b.w * 0.2, GY - k.b.h + 0.5, 8 + k.b.sd * 8, 2);
      if (k.b.h > 40) { ctx.fillStyle = 'rgba(190,184,122,0.7)'; ell(ctx, k.b.x + k.b.w * 0.15, GY - k.b.h * 0.55, 4, 2.6); }
    }
    for (const k of G) if (k.b.h < 60) grassAt(ctx, k.b.x + k.b.w * 0.3, GY - k.b.h + 1, 14, k.b.sd * 31, T);
  }

  function signpost(ctx, x, g) {
    const P = ZS.LABELS.alpine.post, stripes = ['#2a62b8', '#2f8a3f', '#d8262e', '#222222'];
    ctx.fillStyle = 'rgba(30,26,14,0.18)'; ell(ctx, x, GY + 1, 14, 3);
    ctx.fillStyle = '#8c9196'; ctx.fillRect(x - 2.6, GY - 162, 5.2, 162);
    ctx.fillStyle = '#b8bdc2'; ctx.fillRect(x - 2.6, GY - 162, 1.8, 162);
    ctx.fillStyle = '#5d6266'; ctx.fillRect(x - 3.4, GY - 165, 6.8, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2.8, GY - 40, 5.6, 9);
    ctx.fillStyle = stripes[0]; ctx.fillRect(x - 2.8, GY - 37, 5.6, 3);
    for (let i = 0; i < P.length; i++) {
      const y = GY - 158 + i * 21, w = 156;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [x + 4, y + 2, x + w - 6, y + 2, x + w + 3, y + 10, x + w - 6, y + 19, x + 4, y + 19]);
      ctx.fillStyle = '#f0c63f'; poly(ctx, [x + 3, y, x + w - 8, y, x + w + 1, y + 8.5, x + w - 8, y + 17, x + 3, y + 17]);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 3, 9, 11);
      ctx.fillStyle = stripes[i % stripes.length]; ctx.fillRect(x + 6, y + 6.6, 9, 3.8);
      ctx.font = '700 9.5px system-ui, sans-serif';
      const nw = ctx.measureText(P[i][0]).width, k = Math.min(1, (w - 58) / nw);
      ctx.font = '700 ' + (9.5 * k) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1d1d1d';
      ctx.fillText(P[i][0], x + 19, y + 8.8);
      ctx.font = '600 8.5px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(P[i][1], x + w - 9, y + 8.8);
    }
  }

  function smoke(ctx, x, y, time) {
    for (let i = 0; i < 6; i++) {
      const u = frac(time * 0.22 + i / 6), a = 0.42 * sin(PI * u) * (1 - u * 0.4);
      ctx.fillStyle = 'rgba(236,238,240,' + a.toFixed(3) + ')';
      circle(ctx, x + u * 34 + sin(u * 5 + i) * 4, y - u * 70, 4 + u * 11);
    }
  }

  const hutGeo = { stones: null };
  function stonesOf() {
    if (hutGeo.stones) return hutGeo.stones;
    const light = new Path2D(), dark = new Path2D(), mortar = new Path2D();
    let row = 0;
    for (let y = -6; y > -122; y -= 10, row++) {
      let x = -96 + (row % 2) * 9;
      while (x < 214) {
        const w = 14 + hash(row * 13.1 + x * 0.37) * 14, h = 8.4, p = hash(row * 7.7 + x * 0.91) < 0.45 ? dark : light;
        p.moveTo(x + 2, y); p.arcTo(x + w, y, x + w, y - h, 3); p.arcTo(x + w, y - h, x, y - h, 3); p.arcTo(x, y - h, x, y, 3); p.arcTo(x, y, x + w, y, 3); p.closePath();
        x += w + 1.6;
      }
      mortar.moveTo(-96, y + 0.8); mortar.lineTo(214, y + 0.8);
    }
    hutGeo.stones = { light, dark, mortar };
    return hutGeo.stones;
  }

  function hutWindow(ctx, x, y, w, h, lit) {
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - w / 2 - 7, y - 1, 6, h + 2); ctx.fillRect(x + w / 2 + 1, y - 1, 6, h + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - w / 2 - 7, y - 1, 2, h + 2); ctx.fillRect(x + w / 2 + 1, y - 1, 2, h + 2);
    ctx.fillStyle = '#efe9dc'; ctx.fillRect(x - w / 2 - 1.6, y - 1.6, w + 3.2, h + 3.2);
    ctx.fillStyle = lit ? '#f3d58a' : '#3e4c5a'; ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = 'rgba(190,220,240,0.35)'; poly(ctx, [x - w / 2, y, x - w / 2 + w * 0.5, y, x - w / 2, y + h * 0.7]);
    ctx.fillStyle = '#efe9dc'; ctx.fillRect(x - 0.8, y, 1.6, h); ctx.fillRect(x - w / 2, y + h / 2 - 0.8, w, 1.6);
    ctx.fillStyle = '#d9d2c2'; ctx.fillRect(x - w / 2 - 3, y + h + 1.6, w + 6, 2.6);
  }

  const HIKERS = [
    { coat: '#d9473a', pants: '#2f3a4c', skin: '#f0c8a2', hair: '#5a3a22', hat: '#2c5aa0' },
    { coat: '#2a9d8f', pants: '#3a3a3a', skin: '#e9bf98', hair: '#c79a5a', hat: null },
    { coat: '#f0b429', pants: '#4a5568', skin: '#f3d0b0', hair: '#2a201a', hat: '#c0392b' },
  ];
  function hiker(ctx, x, deck, L, k, time, sd, dir) {
    const stand = sstep(0, 1, k), hip = deck - lerp(17, 31, stand), sway = sin(time * 1.3 + sd * 7) * 0.6 * (1 - stand);
    ctx.save(); ctx.translate(x, 0); ctx.scale(dir, 1);
    ctx.strokeStyle = L.pants; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, hip); ctx.lineTo(lerp(9, 1, stand), lerp(hip, deck - 15, stand)); ctx.lineTo(lerp(9, 1.6, stand), deck - 2);
    ctx.moveTo(1, hip); ctx.lineTo(lerp(10, 3, stand), lerp(hip + 1, deck - 15, stand)); ctx.lineTo(lerp(11, 3.4, stand), deck - 2);
    ctx.stroke();
    ctx.fillStyle = '#3a2a1c'; ell(ctx, lerp(10.5, 2.6, stand), deck - 1.4, 3.4, 1.8); ell(ctx, lerp(12.5, 4.4, stand), deck - 1.2, 3.4, 1.8);
    const sh = hip - 19;
    ctx.fillStyle = L.coat; rr(ctx, -5.6 + sway, sh, 11.2, 21, 4.4);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(1.6 + sway, sh + 2, 3.6, 18);
    ctx.fillStyle = L.skin; circle(ctx, 1 + sway, sh - 6.6, 5.6);
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(0.4 + sway, sh - 7.4, 5.6, PI * 0.95, TAU * 0.98); ctx.fill();
    if (L.hat) { ctx.fillStyle = L.hat; ctx.beginPath(); ctx.arc(0.6 + sway, sh - 8.6, 5.4, PI, TAU); ctx.fill(); ctx.fillRect(-4.8 + sway, sh - 9.2, 11, 2); }
    ctx.fillStyle = '#1a120c'; circle(ctx, 3.6 + sway, sh - 7, 0.9);
    const raise = sstep(0.3, 1, k), ax = 3 + sway, ay = sh + 3;
    ctx.strokeStyle = L.coat; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(9, 10, raise), lerp(sh + 12, sh - 6, raise)); ctx.lineTo(lerp(13, 12, raise), lerp(sh + 9, sh - 14, raise)); ctx.stroke();
    ctx.lineCap = 'butt';
    if (raise > 0.2) {
      const px = 12, py = sh - 16;
      ctx.fillStyle = '#20242a'; rr(ctx, px - 2.4, py - 4.2, 4.8, 8.4, 1);
      if (frac(time * 1.7 + sd) < 0.12) { ctx.fillStyle = 'rgba(255,250,220,0.85)'; circle(ctx, px + 1, py - 2.6, 3.4); }
    } else {
      ctx.fillStyle = '#f4f1ea'; rr(ctx, 11, sh + 4, 4.4, 6, 1);
      ctx.fillStyle = '#e8b04a'; ctx.fillRect(11.6, sh + 6.4, 3.2, 3);
    }
    ctx.restore();
  }

  function hut(ctx, A, g) {
    const H = A.hut, x = H.x, time = g.time, S = stonesOf(), Lb = ZS.LABELS.alpine, alarm = g.alpine ? g.alpine.hut.alarm : 0;
    const p = g.alpine && g.alpine.porter;
    ctx.save(); ctx.translate(x - 60, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.16)'; ell(ctx, 60, 2, 210, 6);
    ctx.fillStyle = '#9a958a'; ctx.fillRect(130, -92, 86, 92);
    ctx.save(); ctx.beginPath(); ctx.rect(130, -92, 86, 92); ctx.clip();
    ctx.fillStyle = '#bdb8ac'; ctx.fill(S.light); ctx.fillStyle = '#a39e92'; ctx.fill(S.dark);
    ctx.restore();
    ctx.fillStyle = '#3f4447'; poly(ctx, [122, -88, 222, -104, 226, -96, 126, -80]);
    ctx.fillStyle = '#2f3a52'; poly(ctx, [146, -96, 196, -103, 197, -97, 147, -90]);
    ctx.strokeStyle = 'rgba(180,200,230,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 1; i < 5; i++) { ctx.moveTo(146 + i * 10, -97.4 - i * 1.4); ctx.lineTo(146.6 + i * 10, -91 - i * 1.4); } ctx.stroke();
    hutWindow(ctx, 176, -62, 16, 18, false);
    ctx.fillStyle = '#b1ab9f'; ctx.fillRect(-96, -122, 228, 122);
    ctx.save(); ctx.beginPath(); ctx.rect(-96, -122, 228, 122); ctx.clip();
    ctx.fillStyle = '#c9c4b8'; ctx.fill(S.light); ctx.fillStyle = '#aaa498'; ctx.fill(S.dark);
    ctx.strokeStyle = 'rgba(90,86,78,0.25)'; ctx.lineWidth = 1; ctx.stroke(S.mortar);
    ctx.restore();
    ctx.fillStyle = '#d8d3c6'; for (let y = -10; y > -122; y -= 20) { ctx.fillRect(-98, y - 9, 12, 9); ctx.fillRect(122, y - 9, 12, 9); }
    ctx.fillStyle = '#2b2f33'; poly(ctx, [-112, -116, 18, -214, 148, -116, 136, -112, 18, -200, -100, -112]);
    ctx.fillStyle = '#4b5156'; poly(ctx, [-100, -112, 18, -200, 136, -112]);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-100, -112); ctx.lineTo(18, -200); ctx.lineTo(136, -112); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#d0cbbf'; ctx.fillRect(-100, -200, 236, 88);
    ctx.fillStyle = '#b7b1a5'; ctx.fill(S.dark);
    ctx.restore();
    ctx.fillStyle = '#d0cbbf'; poly(ctx, [-86, -114, 18, -192, 122, -114]);
    ctx.save(); ctx.translate(0, -2); ctx.beginPath(); ctx.moveTo(-86, -114); ctx.lineTo(18, -192); ctx.lineTo(122, -114); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#c0bab0'; ctx.translate(0, -80); ctx.fill(S.dark); ctx.restore();
    ctx.fillStyle = '#3a4045';
    for (let i = 0; i < 9; i++) { const u = i / 9; poly(ctx, [lerp(-112, 18, u), lerp(-116, -214, u), lerp(-112, 18, u + 0.02), lerp(-116, -214, u + 0.02), lerp(-106, 18, u + 0.02), lerp(-112, -205, u + 0.02)]); }
    ctx.fillStyle = '#6b6f73'; ctx.fillRect(66, -196, 14, 34); ctx.fillStyle = '#4e5256'; ctx.fillRect(64, -199, 18, 5);
    smoke(ctx, 73, -204, time);
    ctx.fillStyle = '#4a2e1c'; rr(ctx, -34, -156, 104, 44, 3);
    ctx.fillStyle = '#5d3a24'; rr(ctx, -32, -154, 100, 40, 2);
    txt(ctx, Lb.hut[0], 18, -145, 9.4, '#f6ecd4', 800, 92);
    txt(ctx, Lb.hut[1], 18, -133.5, 10.4, '#f6ecd4', 800, 94);
    txt(ctx, Lb.hut[2], 18, -121.5, 7.6, '#f0d9a8', 600, 92);
    hutWindow(ctx, -62, -86, 18, 20, true);
    hutWindow(ctx, 96, -86, 18, 20, true);
    hutWindow(ctx, -62, -40, 18, 20, false);
    ctx.fillStyle = '#efe9dc'; rr(ctx, 1, -66, 34, 66, 4);
    ctx.fillStyle = '#6b4326'; rr(ctx, 4, -63, 28, 63, 3);
    ctx.strokeStyle = 'rgba(40,24,12,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(4 + i * 7, -60); ctx.lineTo(4 + i * 7, 0); } ctx.stroke();
    ctx.fillStyle = '#d9b45a'; circle(ctx, 27, -30, 1.8);
    ctx.fillStyle = '#2e3a2e'; rr(ctx, 46, -54, 30, 32, 2);
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(44, -56, 34, 3); ctx.fillRect(48, -22, 3, 22); ctx.fillRect(71, -22, 3, 22);
    txt(ctx, Lb.menu[0], 61, -44, 6.4, '#f4f1e6', 700, 26);
    txt(ctx, Lb.menu[1], 61, -33, 6.4, '#f4f1e6', 700, 26);
    if (p && (p.state === 'unload' || p.state === 'down' || p.state === 'load')) {
      ctx.fillStyle = '#b8323a'; rr(ctx, -116 + 60 - 60, -22, 26, 20, 2); ctx.fillStyle = '#8e2129'; ctx.fillRect(-116, -14, 26, 2);
      ctx.fillStyle = '#c49a5c'; rr(ctx, -113, -38, 20, 16, 1.5); ctx.fillStyle = 'rgba(80,60,30,0.4)'; ctx.fillRect(-113, -31, 20, 2);
    }
    ctx.restore();
    const tx0 = x - 260, tx1 = x - 160, deck = GY - 12;
    ctx.fillStyle = '#6a4a30'; ctx.fillRect(tx0 - 6, deck, tx1 - tx0 + 12, 12);
    ctx.fillStyle = '#8a6440'; ctx.fillRect(tx0 - 6, deck, tx1 - tx0 + 12, 3);
    ctx.fillStyle = '#5a3d26'; for (let px = tx0 - 4; px <= tx1 + 4; px += 26) ctx.fillRect(px, deck - 26, 3.4, 26);
    ctx.fillRect(tx0 - 6, deck - 27, tx1 - tx0 + 12, 3);
    const tables = [tx0 + 24, tx0 + 76];
    for (let i = 0; i < tables.length; i++) {
      const tx = tables[i];
      hiker(ctx, tx - 13, deck, HIKERS[i], clamp(alarm * 1.4 - i * 0.25, 0, 1), time, i * 3.1, 1);
      ctx.fillStyle = '#7a5434'; ctx.fillRect(tx - 15, deck - 22, 30, 3.4); ctx.fillRect(tx - 1.6, deck - 19, 3.2, 19);
      ctx.fillStyle = '#f2ead6'; rr(ctx, tx + 2, deck - 29, 5, 7, 1);
      ctx.fillStyle = '#e8a83a'; ctx.fillRect(tx + 2.6, deck - 26, 3.8, 3.6);
    }
    hiker(ctx, tx1 - 4, deck, HIKERS[2], clamp(alarm * 1.4 - 0.4, 0, 1), time, 7.7, -1);
  }

  function lake(ctx, cx, y, w, time) {
    const a = cx - w / 2, b = cx + w / 2, d = 15;
    ctx.fillStyle = '#9aa58a';
    ctx.beginPath(); ctx.ellipse(cx, y + 1, w / 2 + 22, d + 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8b9ae';
    for (let i = 0; i < 9; i++) { const u = i / 8, px = lerp(a - 8, b + 8, u), py = y - d * sin(PI * u) * 0.95 - 2; ell(ctx, px, py, 7 + hash(i * 3.1) * 6, 3 + hash(i * 1.7) * 2); }
    const wg = ctx.createLinearGradient(0, y - d, 0, y + d);
    wg.addColorStop(0, '#2a8478'); wg.addColorStop(0.5, '#3aa391'); wg.addColorStop(1, '#73c7b0');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(cx, y, w / 2, d, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(150,170,182,0.35)';
    poly(ctx, [cx - 80, y - d, cx - 38, y + 4, cx + 6, y - d]);
    poly(ctx, [cx - 10, y - d, cx + 40, y + 9, cx + 96, y - d]);
    ctx.fillStyle = 'rgba(26,74,52,0.4)';
    for (let i = 0; i < 7; i++) ell(ctx, a + 20 + i * (w - 40) / 6, y - d + 3, 13, 3);
    ctx.fillStyle = 'rgba(232,250,242,0.6)';
    for (let i = 0; i < 4; i++) { const u = frac(time * 0.035 + i / 4); ell(ctx, a + 30 + u * (w - 60), y + 2 + (i % 2) * 5, 16 - 10 * abs(u - 0.5), 0.8); }
    ctx.restore();
    ctx.fillStyle = 'rgba(46,86,57,0.9)';
    for (let i = 0; i < 6; i++) { const u = 0.08 + i * 0.17, px = lerp(a, b, u), py = y - d * sin(PI * u) * 0.98 - 4; ctx.beginPath(); ctx.ellipse(px, py, 11 + hash(i * 4.4) * 6, 5, 0, PI, TAU); ctx.fill(); }
    ctx.fillStyle = '#a7aa9c';
    ell(ctx, a + 6, y + 4, 12, 4); ell(ctx, b - 10, y + 6, 14, 4.5); ell(ctx, cx + 20, y + d + 1, 18, 3.4);
  }

  function stunted(ctx, x, h, lean) {
    ctx.fillStyle = '#5b4535'; ctx.fillRect(x - 3, GY - h * 0.35, 6, h * 0.35);
    for (let i = 0; i < 4; i++) {
      const y0 = GY - h * 0.22 - i * h * 0.19, hw = h * (0.3 - i * 0.055), sx = x + lean * (i + 1) * 5;
      ctx.fillStyle = i % 2 ? '#2c5a3a' : '#264f33';
      poly(ctx, [sx - hw * (1 - lean * 0.5), y0 + 4, sx + lean * 4, y0 - h * 0.3, sx + hw * (1 + lean * 0.3), y0]);
    }
  }

  function back(ctx, g, vis, span) {
    const L = g.level, A = L.alpine, T = TURF[seasonOf(g)] || TURF.summer;
    if (span(A.crag.from - 60, A.crag.to + 80, 40)) {
      crag(ctx, A, g);
      if (g.alpine) for (const c of g.alpine.chamois) chamois(ctx, c, g);
    }
    if (vis(A.hut.x, 300)) hut(ctx, A, g);
    for (const b of A.boulders) if (vis(b.x, 60)) { boulder(ctx, b.x, GY + 3, b.w, b.h, b.sd, b.sd > 0.6 ? 1 : 0); grassAt(ctx, b.x - b.w * 0.5, GY + 1, 12, b.sd * 17, T); }
    for (const m of A.marmots) if (vis(m.x, 80)) marmotRock(ctx, m, g);
    if (vis(A.post, 140)) signpost(ctx, A.post, g);
    for (const t of A.thickets) if (span(t[0], t[1], 60)) thicketBack(ctx, t, g);
    const p = g.alpine && g.alpine.porter;
    if (p && vis(p.x, 80)) {
      const h = p.h || (p.h = { aimAt: [0, 0], kind: 'porter' });
      h.x = p.x; h.dir = p.dir; h.state = p.state === 'up' || p.state === 'down' ? 'walk' : 'idle'; h.empty = !p.load; h.outfit = 'summer';
      ZS.drawHuman(ctx, h, g.time);
    }
  }

  function front(ctx, g, span) {
    const A = g.level.alpine;
    for (const t of A.thickets) if (span(t[0], t[1], 60)) thicketFront(ctx, t, g);
  }

  function den(ctx, x, glow, name, time, g) {
    const T = TURF[seasonOf(g)] || TURF.summer;
    ctx.fillStyle = 'rgba(28,22,10,0.18)'; ell(ctx, x, GY + 2, 170, 6);
    stunted(ctx, x - 128, 150, 0.3);
    stunted(ctx, x + 150, 175, 0.15);
    stunted(ctx, x + 112, 120, 0.4);
    boulder(ctx, x + 70, GY + 4, 150, 150, 0.31, 1);
    boulder(ctx, x - 92, GY + 4, 120, 96, 0.67, 1);
    boulder(ctx, x + 8, GY + 2, 210, 128, 0.12, 0);
    clump(ctx, x - 64, GY - 112, 26, 3.3, PINE, sin(time * 0.8) * 0.02);
    clump(ctx, x + 96, GY - 132, 30, 5.1, PINE, sin(time * 0.7 + 1) * 0.02);
    clump(ctx, x + 40, GY - 124, 22, 7.9, PINE, 0);
    clump(ctx, x - 118, GY - 34, 28, 9.3, PINE, 0);
    clump(ctx, x + 132, GY - 30, 30, 4.7, PINE, 0);
    ctx.fillStyle = '#2a211a';
    ctx.beginPath(); ctx.moveTo(x - 44, GY); ctx.quadraticCurveTo(x - 46, GY - 52, x - 18, GY - 66); ctx.quadraticCurveTo(x + 10, GY - 74, x + 34, GY - 58); ctx.quadraticCurveTo(x + 50, GY - 40, x + 46, GY); ctx.closePath(); ctx.fill();
    const gr = ctx.createRadialGradient(x, GY - 10, 4, x, GY - 20, 60);
    gr.addColorStop(0, '#0e0a08'); gr.addColorStop(1, 'rgba(14,10,8,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 38, GY); ctx.quadraticCurveTo(x - 38, GY - 48, x - 14, GY - 60); ctx.quadraticCurveTo(x + 10, GY - 66, x + 30, GY - 52); ctx.quadraticCurveTo(x + 42, GY - 36, x + 40, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ROCK.lit;
    poly(ctx, [x - 58, GY - 62, x - 30, GY - 80, x + 22, GY - 84, x + 56, GY - 66, x + 40, GY - 60, x - 10, GY - 72, x - 44, GY - 56]);
    ctx.fillStyle = 'rgba(70,66,58,0.4)'; poly(ctx, [x + 22, GY - 84, x + 56, GY - 66, x + 40, GY - 60]);
    boulder(ctx, x - 62, GY + 3, 44, 40, 0.43, 0);
    boulder(ctx, x + 66, GY + 3, 50, 34, 0.88, 0);
    ctx.fillStyle = '#7a5a3a';
    for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(x - 26 + i * 8, GY - 2); ctx.rotate(-0.3 + hash(i * 3.1) * 0.6); ctx.fillRect(-5, -1, 10, 2); ctx.restore(); }
    grassAt(ctx, x - 96, GY + 1, 22, 4.4, T); grassAt(ctx, x + 96, GY + 1, 24, 8.8, T);
    if (glow) {
      ctx.strokeStyle = 'rgba(255,215,90,' + (0.5 + 0.4 * sin(time * 5)) + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 50, GY); ctx.quadraticCurveTo(x - 52, GY - 58, x - 18, GY - 74); ctx.quadraticCurveTo(x + 12, GY - 82, x + 40, GY - 64); ctx.quadraticCurveTo(x + 56, GY - 44, x + 52, GY); ctx.stroke();
    }
    ZS.gfx.label(ctx, name, x, GY - 165, 15);
  }

  function load(ctx, px, py, lean, has, seed) {
    ctx.save(); ctx.translate(px, py); ctx.rotate(lean);
    ctx.translate(2, 0); ctx.scale(0.86, 0.86);
    ctx.fillStyle = '#7a5530'; ctx.fillRect(-21, -66, 3.2, 66); ctx.fillRect(-9, -66, 3.2, 66);
    ctx.fillStyle = '#9a7040'; ctx.fillRect(-21, -66, 1.2, 66);
    ctx.fillStyle = '#6a4826'; ctx.fillRect(-22, -4, 18, 3); ctx.fillRect(-22, -30, 18, 2.6);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -24); ctx.quadraticCurveTo(-1, -20, -2, -8); ctx.stroke();
    if (has) {
      ctx.fillStyle = '#c4993f'; rr(ctx, -30, -64, 30, 20, 2);
      ctx.fillStyle = 'rgba(90,60,20,0.35)'; ctx.fillRect(-30, -56, 30, 3);
      ctx.fillStyle = '#b8323a'; rr(ctx, -31, -96, 28, 30, 2);
      ctx.fillStyle = '#8e2129'; ctx.fillRect(-31, -84, 28, 3);
      ctx.fillStyle = '#e9c46a'; for (let i = 0; i < 4; i++) circle(ctx, -26 + i * 6.4, -97.6, 1.9);
      ctx.fillStyle = '#8f9aa6'; rr(ctx, -27, -126, 15, 30, 6);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-27, -116, 15, 4);
      ctx.fillStyle = '#5d6670'; ctx.fillRect(-22, -130, 5, 5);
      ctx.fillStyle = '#d8cfa8'; blob(ctx, [-12, -98, -2, -104, 6, -100, 6, -86, -4, -82, -12, -88]);
      ctx.fillStyle = 'rgba(120,100,60,0.35)'; ctx.fillRect(-8, -95, 10, 2);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-32, -70); ctx.lineTo(-2, -66); ctx.moveTo(-32, -88); ctx.lineTo(-2, -92); ctx.stroke();
    }
    ctx.restore();
  }

  Object.assign(API, { backdrop, ground, back, front, den, slab, limbaTrunk, limbaCrown, coneItem, load, boulder });
})();
