(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const API = (ZS.foodArt = {});
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, sqrt = Math.sqrt, pow = Math.pow, max = Math.max;
  const { lerp, sstep, frac, hash } = ZS.util;
  const { circle, ellipse: ell, rrect: rr } = ZS.gfx;

  function poly(ctx, p) {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function blob(ctx, p, keep) {
    const n = p.length / 2, g = (i, k) => p[((i + n) % n) * 2 + k];
    ctx.beginPath(); ctx.moveTo(g(0, 0), g(0, 1));
    for (let i = 0; i < n; i++) {
      const x0 = g(i - 1, 0), y0 = g(i - 1, 1), x1 = g(i, 0), y1 = g(i, 1), x2 = g(i + 1, 0), y2 = g(i + 1, 1), x3 = g(i + 2, 0), y3 = g(i + 2, 1);
      ctx.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
    }
    ctx.closePath();
    if (!keep) ctx.fill();
  }
  function line(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function shadow(ctx, W, x, rx, ry) { ctx.fillStyle = W ? 'rgba(70,92,125,0.16)' : 'rgba(30,26,12,0.16)'; ell(ctx, x, 0.8, rx, ry || 2.6); }
  function cap(ctx, x0, x1, y, h, sd, W) {
    const n = Math.max(3, Math.round((x1 - x0) / 7)), p = [x0 - 1.2, y + 1];
    for (let i = 0; i <= n; i++) p.push(lerp(x0, x1, i / n), y - h * (0.35 + 0.65 * pow(sin((PI * i) / n), 0.4)) - (hash(sd + i * 1.7) - 0.5) * h * 0.4);
    p.push(x1 + 1.2, y + 1);
    ctx.fillStyle = W.snowShade; ctx.save(); ctx.translate(0.5, 1.1); poly(ctx, p); ctx.restore();
    ctx.fillStyle = W.snow; poly(ctx, p);
  }

  const geos = new WeakMap();
  function geo(it, make) {
    let o = geos.get(it);
    if (!o) { o = make(hash(it.x * 0.0131) * 97, it); geos.set(it, o); }
    return o;
  }

  function bee(ctx, x, y, d, time, sd) {
    const f = abs(sin(time * 47 + sd * 13));
    ctx.fillStyle = 'rgba(236,246,255,0.8)';
    ell(ctx, x - d * 0.7, y - 2.1, 1.9, 0.9 + f * 0.9, -d * 0.6);
    ell(ctx, x + d * 0.5, y - 2.3, 1.6, 0.8 + f * 0.7, d * 0.5);
    ctx.fillStyle = '#f2b52b'; ell(ctx, x, y, 2.8, 1.9);
    ctx.fillStyle = '#2a1e12';
    ctx.fillRect(x - 0.45 - d * 0.1, y - 1.8, 0.9, 3.6); ctx.fillRect(x - d * 1.6 - 0.45, y - 1.45, 0.9, 2.9);
    circle(ctx, x + d * 2.6, y - 0.2, 1.3);
    poly(ctx, [x - d * 2.5, y - 0.6, x - d * 3.8, y + 0.2, x - d * 2.5, y + 0.8]);
    ctx.fillStyle = 'rgba(255,244,200,0.6)'; ell(ctx, x + d * 0.6, y - 1, 1.1, 0.45);
  }
  function swarm(ctx, cx, cy, rx, ry, n, time, sd, k) {
    for (let i = 0; i < n; i++) {
      const h = hash(sd + i * 3.7), sp = (0.9 + h * 0.7) * k, t = time * sp + i * 2.4 + h * 6;
      const x = cx + sin(t) * rx + sin(t * 2.3 + i) * rx * 0.18, y = cy + sin(t * 1.6 + i * 1.3) * ry + cos(t * 3.1) * 1.2;
      bee(ctx, x, y, cos(t) >= 0 ? 1 : -1, time, sd + i);
    }
  }

  const HONEY = '#eda52a';
  let hex = null;
  function hexes() {
    if (hex) return hex;
    hex = new Path2D();
    const r = 1.75, w = r * sqrt(3);
    for (let row = 0; row < 20; row++) {
      for (let c = 0; c < 9; c++) {
        const cx = -9 + c * w + (row % 2) * w / 2, cy = -10 + row * r * 1.5;
        hex.moveTo(cx + r * cos(PI / 6), cy + r * sin(PI / 6));
        for (let k = 1; k <= 6; k++) { const a = PI / 6 + (k * PI) / 3; hex.lineTo(cx + r * cos(a), cy + r * sin(a)); }
      }
    }
    return hex;
  }

  function hollow(ctx, W) {
    ctx.fillStyle = 'rgba(40,30,20,0.2)'; ell(ctx, 0.9, 3.9, 12.6, 17.4);
    ctx.fillStyle = W ? '#7d766e' : '#8b8479'; ell(ctx, 0, 3, 11.4, 16.4);
    ctx.fillStyle = 'rgba(255,250,235,0.18)'; ell(ctx, -2.4, 1.6, 8.6, 14.2);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ell(ctx, 2.6, 5, 8.6, 14.2);
    ctx.fillStyle = '#2a1c11'; ell(ctx, 0.5, 3.6, 8.4, 13.2);
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ell(ctx, 0.9, -2.6, 7.2, 7);
    ctx.fillStyle = 'rgba(120,80,40,0.28)'; ell(ctx, 0.5, 12.8, 6.4, 3);
  }

  function drip(ctx, x, y, time, sd, fall) {
    const u = frac(time * 0.23 + sd), l = u < 0.72 ? 1.2 + sstep(0, 0.72, u) * 5 : 1.2 + (1 - sstep(0.72, 0.8, u)) * 5;
    ctx.fillStyle = HONEY;
    ell(ctx, x, y + l * 0.45, 0.95, l * 0.5 + 0.4);
    circle(ctx, x, y + l, 1 + l * 0.08);
    ctx.fillStyle = 'rgba(255,240,190,0.75)'; circle(ctx, x - 0.35, y + l - 0.3, 0.35);
    if (u > 0.72) {
      const k = (u - 0.72) / 0.28;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = HONEY; circle(ctx, x, y + 6.4 + k * k * fall, 1.15); ctx.globalAlpha = 1;
    }
  }

  const COMB = [-5.6, -6.5, -0.5, -8.5, 5, -6.8, 6.6, 2, 5.4, 11, 2.6, 18.5, -0.8, 20.5, -3.6, 16, -6.4, 7];
  function comb(ctx, time, sd) {
    ctx.save(); ctx.translate(-2.4, -1.4); ctx.scale(0.86, 0.9); ctx.fillStyle = '#b06c17'; blob(ctx, COMB); ctx.restore();
    ctx.save();
    ctx.fillStyle = '#eaa62c'; blob(ctx, COMB); ctx.clip();
    ctx.fillStyle = 'rgba(255,214,120,0.55)'; ell(ctx, -1.5, -2, 5.6, 6);
    ctx.strokeStyle = 'rgba(150,84,10,0.6)'; ctx.lineWidth = 0.55; ctx.stroke(hexes());
    ctx.fillStyle = 'rgba(255,236,170,0.6)'; ell(ctx, -1.6, -5.4, 5.2, 2.4);
    ctx.fillStyle = 'rgba(120,58,0,0.28)'; ell(ctx, 5.8, 7, 3.4, 13);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,250,225,0.8)'; ell(ctx, -3.4, 3, 0.9, 4.4, 0.12);
    drip(ctx, -0.6, 19.6, time, sd, 70);
    drip(ctx, 3.4, 16.4, time + 1.7, sd + 0.4, 70);
  }

  function gap(ctx, it, g, sd) {
    const T = geo(it, () => {
      const t = g && g.level && g.level.trees.find((t) => abs(t.x + 6 - it.x) < 1), hw = (t ? t.w : 50) / 2 - 2, yb = (t ? t.r * 0.65 : 64) - 13, p = new Path2D(), sh = new Path2D();
      const n = Math.max(2, Math.round(hw / 9)), x0 = -6 - hw, x1 = -6 + hw;
      p.moveTo(x0, yb); p.lineTo(x0, -24); sh.moveTo(x0, -24);
      for (let i = 0; i < n; i++) {
        const xa = lerp(x0, x1, i / n), xb = lerp(x0, x1, (i + 1) / n), d = 8 + hash(sd + i) * 7, y = -24 + (hash(sd + i * 2.3) - 0.5) * 4;
        p.bezierCurveTo(xa + 1, y + d * 1.25, xb - 1, y + d * 1.25, xb, -24 + (hash(sd + i * 2.3 + 2.3) - 0.5) * 4);
        sh.bezierCurveTo(xa + 1, y + d * 1.25 + 5, xb - 1, y + d * 1.25 + 5, xb, -19 + (hash(sd + i * 2.3 + 2.3) - 0.5) * 4);
      }
      p.lineTo(x1, yb); p.closePath(); sh.lineTo(x1, -40); sh.lineTo(x0, -40); sh.closePath();
      return { hw, yb, p, sh };
    });
    ctx.save(); ctx.clip(T.p);
    ctx.fillStyle = '#9b958b'; ctx.fillRect(-6 - T.hw, -40, T.hw * 2, T.yb + 41);
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(-6 + (T.hw + 2) * 0.24, -40, (T.hw + 2) * 0.68, T.yb + 41);
    ctx.fillStyle = 'rgba(20,44,20,0.3)'; ctx.fill(T.sh);
    ctx.restore();
  }

  function wildhoney(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.013) * 40;
    ctx.save(); ctx.translate(it.x, it.y);
    if (!W) gap(ctx, it, g, sd);
    hollow(ctx, W);
    ctx.lineCap = 'round';
    ctx.strokeStyle = it.eaten ? 'rgba(196,128,30,0.55)' : 'rgba(226,150,36,0.92)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-1.4, 17); ctx.quadraticCurveTo(-2.6, 23, -1.6, 29); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(3.4, 17.6); ctx.quadraticCurveTo(4.4, 20.5, 3.8, 23.5); ctx.stroke();
    ctx.lineCap = 'butt';
    if (!it.eaten) comb(ctx, time, sd);
    else {
      ctx.fillStyle = '#b06c17'; blob(ctx, [-5, -6.5, 0, -8.6, 5, -6.6, 4.4, -2.6, 2.2, -4.2, 0.4, -1.6, -1.8, -4.4, -4, -1.8]);
      ctx.fillStyle = 'rgba(255,214,120,0.5)'; ell(ctx, -0.6, -6.4, 3.6, 1.2);
    }
    if (W) cap(ctx, -9, 9, -12.4, 3.2, sd, W);
    ctx.restore();
    if (!W) swarm(ctx, it.x, it.y + 2, 17, 10, it.eaten ? 1 : 3, time, sd, it.eaten ? 0.6 : 1);
  }

  function hazelnut(ctx, x, y, r, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#8e5427';
    ctx.beginPath(); ctx.moveTo(0, -r * 1.15);
    ctx.bezierCurveTo(r * 0.95, -r * 0.9, r * 1.08, r * 0.6, 0, r * 0.92); ctx.bezierCurveTo(-r * 1.08, r * 0.6, -r * 0.95, -r * 0.9, 0, -r * 1.15); ctx.fill();
    ctx.fillStyle = 'rgba(40,18,5,0.3)'; ell(ctx, r * 0.38, r * 0.15, r * 0.5, r * 0.72);
    ctx.fillStyle = '#d8b886'; ell(ctx, 0, r * 0.62, r * 0.74, r * 0.34);
    ctx.fillStyle = 'rgba(255,225,180,0.55)'; ell(ctx, -r * 0.36, -r * 0.35, r * 0.2, r * 0.44, 0.3);
    ctx.restore();
  }
  function acorn(ctx, x, y, r, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#b77d36'; ell(ctx, 0, r * 0.3, r * 0.74, r * 1.02);
    ctx.fillStyle = 'rgba(80,40,10,0.3)'; ell(ctx, r * 0.3, r * 0.45, r * 0.4, r * 0.75);
    ctx.fillStyle = 'rgba(255,230,180,0.55)'; ell(ctx, -r * 0.3, r * 0.2, r * 0.15, r * 0.42);
    ctx.fillStyle = '#4d321b'; ctx.fillRect(-r * 0.12, -r * 1.25, r * 0.24, r * 0.5);
    ctx.fillStyle = '#6a4626'; ell(ctx, 0, -r * 0.42, r * 0.88, r * 0.52);
    ctx.fillStyle = 'rgba(30,15,5,0.35)';
    for (let i = 0; i < 4; i++) circle(ctx, -r * 0.5 + i * r * 0.33, -r * 0.42 + (i % 2) * r * 0.16, r * 0.12);
    ctx.restore();
  }

  const FUR = '#ad5a2e', FUR_DK = '#7f3c1d', FUR_LT = '#efe1cc';
  const TAIL = [0, 0, -4, -1, -7.6, -4.6, -9.2, -10, -8.2, -15.6, -4.6, -19.6, 0, -20.2, 2.2, -17.6, -0.4, -16.2, -3, -13.6, -3.6, -9, -2, -4.6, 1, -2];
  function squirrel(ctx, x, y, d, time, sd, mad) {
    const fl = pow(max(0, sin(time * (mad ? 3.3 : 1.2) + sd * 7)), mad ? 3 : 10), burst = mad ? 1 : pow(max(0, sin(time * 0.8 + sd)), 14);
    const ch = sin(time * 17) * burst, br = 1 + sin(time * 2.4 + sd) * 0.02;
    ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
    ctx.save(); ctx.translate(-2.2, -2.6); ctx.rotate(-0.06 - 0.22 * fl + (mad ? 0.12 : 0)); ctx.scale(mad ? 1.1 : 1, mad ? 1.08 : 1);
    ctx.fillStyle = FUR_DK; blob(ctx, TAIL);
    ctx.save(); ctx.translate(-0.4, 0.3); ctx.scale(0.8, 0.86); ctx.fillStyle = FUR; blob(ctx, TAIL); ctx.restore();
    ctx.fillStyle = 'rgba(255,214,170,0.3)'; ell(ctx, -6.4, -12, 1.4, 4.6, 0.2);
    ctx.restore();
    ctx.save(); ctx.scale(1, br);
    ctx.fillStyle = FUR; ell(ctx, 0.8, -5.8, 4, 5.4, 0.22);
    ctx.fillStyle = FUR_DK; ell(ctx, -0.6, -2.8, 3.6, 2.8);
    ctx.fillStyle = FUR_LT; ell(ctx, 2.9, -6.2, 1.8, 3.6, 0.22);
    ctx.fillStyle = FUR_DK; ell(ctx, 2.2, -0.4, 2.8, 0.95);
    ctx.restore();
    ctx.save(); ctx.translate(0, ch * 0.35 - (mad ? 0.8 : 0));
    ctx.lineCap = 'round'; ctx.strokeStyle = FUR_DK; ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (mad) { ctx.moveTo(3.6, -8.2); ctx.lineTo(6.6, -10.6 + ch * 0.8); ctx.moveTo(3, -8.6); ctx.lineTo(5.4, -11.8 - ch * 0.8); }
    else { ctx.moveTo(3.6, -8); ctx.lineTo(5.6, -7.2); }
    ctx.stroke();
    ctx.fillStyle = FUR_DK; poly(ctx, [2.2, -14.4, 2.4, -18.8, 4.4, -15]);
    ctx.fillStyle = '#5a2a14'; poly(ctx, [2.3, -17.8, 1.7, -20.6, 3.2, -18.3]);
    ctx.fillStyle = FUR; circle(ctx, 3.8, -12, 3.2); ell(ctx, 6.4, -11.6, 1.7, 1.25, 0.15);
    ctx.fillStyle = FUR_LT; ell(ctx, 5.4, -10.6, 1.8, 1.2, 0.2);
    ctx.fillStyle = '#2a1810'; circle(ctx, 7.8, -11.8, 0.55);
    ctx.fillStyle = '#1a100a'; circle(ctx, 5, -12.9, 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(ctx, 5.25, -13.15, 0.28);
    line(ctx, 3.8, -14.6 + (mad ? 0.5 : 0), 6.1, -14 - (mad ? 0.6 : 0), 0.7, '#5a2a14');
    ctx.restore();
    ctx.restore();
  }

  const STASH = [[-4.8, 14.4, 0, 0.3], [-0.6, 15.4, 1, -0.2], [3.8, 14.6, 0, -0.4], [-2.8, 11.2, 1, 0.4], [1.8, 11.4, 0, 0.1], [5, 10.2, 1, -0.3], [-5.6, 8.6, 0, -0.5], [-0.4, 7.6, 1, 0.2], [3.2, 6.6, 0, 0.6], [-3.4, 4.6, 0, -0.2]];
  function stash(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.013) * 40, bark = W ? '#7e776f' : '#8e877c';
    ctx.save(); ctx.translate(it.x, it.y);
    ctx.fillStyle = bark;
    ctx.beginPath(); ctx.moveTo(10, 5.6); ctx.quadraticCurveTo(24, 3.2, 36, 2.8); ctx.lineTo(36.4, 5.4); ctx.quadraticCurveTo(24, 8.6, 10, 12.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.moveTo(14, 10.2); ctx.quadraticCurveTo(25, 7.4, 36.4, 5.4); ctx.lineTo(36, 4.6); ctx.quadraticCurveTo(25, 6.2, 14, 8.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6c655d'; ell(ctx, 36.2, 4.1, 0.9, 1.4);
    hollow(ctx, W);
    const leaf = ['#9a5b2a', '#b97a3a', '#7d4a26', '#c08a45'];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = leaf[i % 4]; ell(ctx, -6 + i * 2.5, 15.2 - (i % 2) * 1.4, 3, 1.3, (hash(sd + i) - 0.5) * 1.4); }
    if (W) {
      ctx.fillStyle = W.snow; ctx.beginPath(); ctx.ellipse(0.4, 4, 9.4, 14.6, 0, 0.35, PI - 0.35); ctx.ellipse(0.4, 3.2, 9.6, 13.2, 0, PI - 0.4, 0.4, true); ctx.closePath(); ctx.fill();
    }
    if (!it.eaten) {
      for (const n of STASH) (n[2] ? acorn : hazelnut)(ctx, n[0], n[1], 2.6, n[3]);
      hazelnut(ctx, -2.6, 17.6, 2.5, 0.9); acorn(ctx, 3.6, 17.8, 2.4, -1.2);
    } else {
      ctx.fillStyle = '#5e3518'; ell(ctx, -2.4, 15.6, 1.8, 1, 0.4); ell(ctx, 3, 14.8, 1.5, 0.8, -0.3);
      ctx.fillStyle = '#d8b886'; ell(ctx, -2.2, 15.2, 1.2, 0.5, 0.4); ell(ctx, 1.4, 17.8, 1.2, 0.5, -0.2);
    }
    if (W) {
      const a0 = -PI * 0.86, a1 = -PI * 0.14, p = [];
      for (let i = 0; i <= 10; i++) { const a = lerp(a0, a1, i / 10), th = 0.6 + 1.9 * sin((i / 10) * PI) + (hash(sd + i) - 0.5) * 0.8; p.push(cos(a) * 12.2, 3 + sin(a) * 17.2 - th); }
      for (let i = 10; i >= 0; i--) { const a = lerp(a0, a1, i / 10); p.push(cos(a) * 10.8, 3 + sin(a) * 15.6 + 0.2); }
      ctx.fillStyle = W.snowShade; ctx.save(); ctx.translate(0.5, 1); poly(ctx, p); ctx.restore();
      ctx.fillStyle = W.snow; poly(ctx, p);
      ctx.lineCap = 'round'; line(ctx, 15, 5, 35.4, 2.2, 2.2, W.snow); ctx.lineCap = 'butt';
    }
    ctx.restore();
    squirrel(ctx, it.x + 28, it.y + 3.8, -1, time, sd, it.eaten);
  }

  const APPLE = { red: ['#d83d2d', '#b02a1f', '#b8cf52'], frozen: ['#b43a2d', '#741f18', '#a08048'] };
  function apple(ctx, x, y, r, a, kind, leaf) {
    const P = APPLE[kind] || APPLE.red;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = P[0];
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6);
    ctx.bezierCurveTo(r * 0.5, -r * 1.12, r * 1.12, -r * 0.75, r * 1.02, r * 0.05);
    ctx.bezierCurveTo(r * 0.95, r * 0.8, r * 0.45, r * 1.04, 0, r * 0.88);
    ctx.bezierCurveTo(-r * 0.45, r * 1.04, -r * 0.95, r * 0.8, -r * 1.02, r * 0.05);
    ctx.bezierCurveTo(-r * 1.12, -r * 0.75, -r * 0.5, -r * 1.12, 0, -r * 0.6);
    ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalAlpha = 0.45; ctx.fillStyle = P[2]; ell(ctx, -r * 0.85, -r * 0.2, r * 0.42, r * 0.7, 0.3);
    ctx.globalAlpha = 0.8; ctx.fillStyle = P[1]; ell(ctx, r * 1.02, r * 0.45, r * 0.55, r * 0.95, -0.35);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff8a4a'; ell(ctx, -r * 0.1, -r * 0.45, r * 0.5, r * 0.22, -0.2);
    ctx.globalAlpha = 1;
    ctx.restore();
    if (kind === 'frozen') {
      ctx.strokeStyle = 'rgba(50,10,8,0.4)'; ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.1, r * 0.55, -0.4, 0.9); ctx.moveTo(r * 0.55, -r * 0.3); ctx.arc(r * 0.2, -r * 0.3, r * 0.35, 0, 1.2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(60,10,5,0.4)'; ell(ctx, 0, -r * 0.52, r * 0.3, r * 0.11);
    ctx.fillStyle = 'rgba(255,255,255,0.72)'; ell(ctx, -r * 0.45, -r * 0.36, r * 0.17, r * 0.3, 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(ctx, -r * 0.62, -r * 0.02, r * 0.07);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = r * 0.15;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.quadraticCurveTo(r * 0.02, -r * 0.95, r * 0.18, -r * 1.2); ctx.stroke(); ctx.lineCap = 'butt';
    if (leaf) {
      ctx.fillStyle = kind === 'frozen' ? '#6e5a38' : '#5f9e3c';
      ctx.beginPath(); ctx.moveTo(r * 0.14, -r * 1.02); ctx.quadraticCurveTo(r * 0.45, -r * 1.5, r * 1.05, -r * 1.28); ctx.quadraticCurveTo(r * 0.6, -r * 0.82, r * 0.14, -r * 1.02); ctx.fill();
      line(ctx, r * 0.2, -r * 1.04, r * 0.95, -r * 1.26, r * 0.05, 'rgba(225,245,190,0.6)');
    }
    ctx.restore();
  }
  API.apple = apple;

  function core(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#f2e3bb';
    ctx.beginPath(); ctx.moveTo(-4.4, -6.2); ctx.quadraticCurveTo(-1, -3, -2, 0); ctx.quadraticCurveTo(-1, 3, -4.2, 6.2);
    ctx.lineTo(4.2, 6.2); ctx.quadraticCurveTo(1, 3, 2, 0); ctx.quadraticCurveTo(1, -3, 4.4, -6.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(170,120,60,0.35)'; ell(ctx, 0.8, 0.4, 1.4, 4.4);
    ctx.fillStyle = '#4a2a14'; ell(ctx, -0.5, -1.2, 0.6, 1, 0.3); ell(ctx, 0.6, 1.2, 0.6, 1, -0.3);
    ctx.fillStyle = '#c4382b'; blob(ctx, [-4.8, -6, -2, -7.6, 2, -7.6, 4.8, -6, 2.4, -5.4, -2.4, -5.4]); blob(ctx, [-4.6, 6, -2, 5.2, 2, 5.2, 4.6, 6, 2, 7.4, -2, 7.4]);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(-0.5, -10, 1, 3); ctx.fillStyle = '#3a2416'; circle(ctx, 0, 7.6, 0.8);
    ctx.restore();
  }

  function appleItem(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.07);
    if (it.y !== undefined) {
      const sw = sin(time * 1.25 + sd * 9) * 0.07 + sin(time * 2.1 + sd) * 0.02;
      ctx.save(); ctx.translate(it.x, it.y - 8.5); ctx.rotate(sw);
      ctx.strokeStyle = '#4a3526'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(1.4, 0); ctx.lineTo(1, -5); ctx.stroke();
      apple(ctx, 0, 9, 8.4, -sw * 0.5, 'red', hash(sd + 3) < 0.7);
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0.6, 11, 2.2);
    if (it.eaten) core(ctx, 0, -2.6, 1.42 + (sd - 0.5) * 0.3);
    else apple(ctx, 0, -8, 9, (sd - 0.5) * 0.7, 'red', sd < 0.5);
    ctx.restore();
  }

  const BUSH = {
    spring: ['#3a7a34', '#4c9040', '#66a84c', '#86c25e'],
    summer: ['#2f6a2f', '#3f7f3a', '#559a45', '#70b252'],
    autumn: ['#7a3424', '#a2452c', '#c45e33', '#de8a42'],
  };
  function makeBush(sd) {
    const L = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], stems = new Path2D(), body = new Path2D(), dark = new Path2D(), shine = new Path2D(), fall = [];
    const top = (x) => -7 - 25 * pow(max(0, 1 - (x / 29) * (x / 29)), 0.65);
    for (let k = 0; k < 9; k++) {
      const h = hash(sd + k * 1.9), bx = (k - 4) * 2, ex = (k - 4) * 5.6 + (h - 0.5) * 6, ey = top(ex) + 5 + h * 4;
      stems.moveTo(bx, 0.5); stems.quadraticCurveTo(bx + (ex - bx) * 0.15, ey * 0.55, ex, ey);
    }
    for (let i = 0; i < 120; i++) {
      const u = hash(sd + i * 2.31), v = hash(sd + i * 3.77), x = (u - 0.5) * 56, t = top(x), y = lerp(-2.5, t + 2.2, sqrt(v));
      const r = 2.3 + hash(sd + i * 5.1) * 1.3, a = hash(sd + i * 7.3) * PI, up = (y - t) / (-t);
      const tone = up < 0.3 ? (hash(sd + i * 9.7) < 0.55 ? 3 : 2) : up < 0.6 ? 2 - (hash(sd + i * 4.1) < 0.4 ? 1 : 0) : up < 0.85 ? 1 : 0;
      L[tone].moveTo(x + cos(a) * r, y + sin(a) * r); L[tone].ellipse(x, y, r, r * 0.55, a, 0, TAU);
    }
    for (let i = 0; i < 17; i++) {
      const u = hash(sd + i * 4.71 + 0.3), v = hash(sd + i * 6.13 + 0.7), x = (u - 0.5) * 46, y = lerp(-5, top(x) + 6, 0.25 + v * 0.6), r = 1.75 + hash(sd + i) * 0.5;
      body.moveTo(x + r, y); body.arc(x, y, r, 0, TAU);
      dark.moveTo(x + r * 0.9, y + r * 0.3); dark.arc(x + r * 0.35, y + r * 0.35, r * 0.62, 0, TAU);
      shine.moveTo(x - 0.25, y - 0.65); shine.arc(x - 0.6, y - 0.65, 0.42, 0, TAU);
    }
    const mass = [];
    for (let i = 0; i <= 10; i++) { const x = -26 + i * 5.2; mass.push(x, i === 0 || i === 10 ? -1 : top(x) + 5 + hash(sd + i) * 2); }
    mass.push(20, 0.5, -20, 0.5);
    for (let i = 0; i < 4; i++) fall.push((hash(sd + i * 8.3) - 0.5) * 60, 0.2 - hash(sd + i * 2.9) * 1.2, hash(sd + i * 5.9) * PI);
    return { L, stems, body, dark, shine, fall, mass };
  }
  function berry(ctx, it, time, g, W) {
    const G = geo(it, makeBush), sd = hash(it.x * 0.019) * 20, C = BUSH[(g && ZS.seasonLook(g.seasonKey)) || 'summer'] || BUSH.summer;
    const sw = sin(time * 1.1 + sd * 5) * 0.02 + sin(time * 2.7 + sd) * 0.006;
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0, 31, 3);
    if (it.eaten) for (let i = 0; i < G.fall.length; i += 3) { ctx.fillStyle = C[i % 2 ? 1 : 2]; ell(ctx, G.fall[i], G.fall[i + 1], 2.4, 1.1, G.fall[i + 2]); }
    ctx.transform(1, 0, sw, 1, 0, 0);
    ctx.fillStyle = C[0]; blob(ctx, G.mass); ctx.fill(G.L[0]);
    ctx.strokeStyle = '#6e4a33'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.stroke(G.stems); ctx.lineCap = 'butt';
    ctx.fillStyle = C[1]; ctx.fill(G.L[1]);
    ctx.fillStyle = C[2]; ctx.fill(G.L[2]);
    if (!it.eaten) {
      ctx.fillStyle = '#41558f'; ctx.fill(G.body);
      ctx.fillStyle = 'rgba(18,22,58,0.5)'; ctx.fill(G.dark);
      ctx.fillStyle = 'rgba(214,226,255,0.8)'; ctx.fill(G.shine);
    }
    ctx.fillStyle = C[3]; ctx.fill(G.L[3]);
    ctx.restore();
  }

  function box(ctx, x, y, w, h, col) {
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(x + w * 0.68, y, w * 0.32, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = 'rgba(70,35,0,0.2)'; ctx.fillRect(x, y + h * 0.5, w, 0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y + h - 1.3, w, 1.3);
    ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(x, y, w, 0.9);
  }
  function roof(ctx) {
    ctx.fillStyle = '#9b4a32'; poly(ctx, [-21.5, -42, 0, -55, 21.5, -42]);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; poly(ctx, [0, -55, 21.5, -42, 0, -42]);
    ctx.fillStyle = 'rgba(255,220,190,0.16)'; poly(ctx, [-21.5, -42, 0, -55, 0, -53.2, -18.5, -42]);
    ctx.strokeStyle = 'rgba(60,20,10,0.3)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-14.6, -46.2); ctx.lineTo(14.6, -46.2); ctx.moveTo(-7.8, -50.3); ctx.lineTo(7.8, -50.3); ctx.stroke();
    ctx.fillStyle = '#6b3020'; ctx.fillRect(-22.5, -43, 45, 2.4);
  }
  function hive(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.017) * 40, open = it.eaten;
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, open ? 6 : 1, open ? 34 : 24, 2.8);
    ctx.fillStyle = '#5b402a'; ctx.fillRect(-15, -7, 5, 7); ctx.fillRect(10, -7, 5, 7);
    ctx.fillStyle = '#6b4a2f'; ctx.fillRect(-18, -9.5, 36, 3.4);
    ctx.fillStyle = 'rgba(255,230,190,0.2)'; ctx.fillRect(-18, -9.5, 36, 1);
    box(ctx, -16, -27, 32, 17.5, '#e0a43c');
    box(ctx, -16, -42, 32, 15, '#d5952f');
    ctx.fillStyle = '#2a1a0e'; rr(ctx, -8, -13.6, 16, 2.6, 1.2);
    ctx.fillStyle = '#8a6238'; poly(ctx, [-11, -11.2, 11, -11.2, 13.5, -9.4, -13.5, -9.4]);
    ctx.fillStyle = '#c7392d'; ctx.beginPath(); ctx.moveTo(-3, -18.2); ctx.bezierCurveTo(-3, -21.2, -6.6, -21.4, -6.6, -18.8); ctx.bezierCurveTo(-6.6, -16.8, -4.6, -15.8, -3, -14.6);
    ctx.bezierCurveTo(-1.4, -15.8, 0.6, -16.8, 0.6, -18.8); ctx.bezierCurveTo(0.6, -21.4, -3, -21.2, -3, -18.2); ctx.fill();
    ctx.fillStyle = '#4f8a3a'; ell(ctx, -8.6, -17.2, 2, 0.9, 0.5); ell(ctx, 2.6, -17.2, 2, 0.9, -0.5);
    ctx.fillStyle = '#f1d04a'; circle(ctx, -9.4, -20.4, 1.1); circle(ctx, 3.4, -20.4, 1.1);
    ctx.fillStyle = 'rgba(255,240,220,0.8)'; circle(ctx, -3, -18.4, 0.8);
    if (!open) {
      roof(ctx);
      ctx.fillStyle = '#8f8b84'; ell(ctx, 2, -50.6, 4.6, 2.7, 0.08); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, 0.8, -51.8, 2.6, 0.9); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 3.6, -49.2, 2.6, 0.8);
      if (W) {
        ctx.fillStyle = W.snowShade; poly(ctx, [-23, -41.2, 0, -56, 23, -41.2, 20, -40.6, 0, -52.6, -20, -40.6]);
        ctx.fillStyle = W.snow; blob(ctx, [-23.4, -42.4, -12, -50.4, 0, -57, 12, -50.4, 23.4, -42.4, 19, -42.6, 0, -53.6, -19, -42.6]);
      }
    } else {
      ctx.fillStyle = '#2b1b0e'; ctx.fillRect(-15, -44, 30, 3.2);
      for (let i = 0; i < 7; i++) {
        const fx = -13.2 + i * 4.4;
        ctx.fillStyle = '#c9a26b'; ctx.fillRect(fx - 0.9, -46.6, 1.8, 4);
        if (i < 6) { ctx.fillStyle = i % 2 ? '#e3a12c' : '#cf8a22'; blob(ctx, [fx + 0.9, -42, fx + 1.2, -45.4, fx + 2.2, -46.6, fx + 3.4, -45.4, fx + 3.6, -42]); }
      }
      ctx.lineCap = 'round'; ctx.strokeStyle = HONEY;
      for (const [hx, l] of [[-9, 9], [-2, 5], [6.4, 11.5], [11, 6]]) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx, -41); ctx.lineTo(hx + 0.3, -41 + l); ctx.stroke(); }
      ctx.lineCap = 'butt';
      ctx.fillStyle = HONEY; circle(ctx, 6.7, -29.2, 1.3); circle(ctx, -8.7, -31.8, 1.2);
      ctx.save(); ctx.translate(32, -1.6); ctx.rotate(0.16); ctx.translate(0, 43); roof(ctx); ctx.restore();
      ctx.fillStyle = '#8f8b84'; ell(ctx, 45, -1.6, 4.4, 2.6, 0.1); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ell(ctx, 44, -2.6, 2.4, 0.9);
    }
    ctx.restore();
    if (W) return;
    if (open) swarm(ctx, it.x, GY - 42, 26, 13, 6, time, sd, 1.7);
    else {
      swarm(ctx, it.x, GY - 17, 20, 9, 3, time, sd, 1);
      const u = frac(time * 0.12 + sd);
      bee(ctx, it.x - 8 + u * 16, GY - 12.4, 1, time, sd + 9);
    }
  }

  function trash(ctx, sd) {
    for (let i = 0; i < 5; i++) {
      const x = (i % 2 ? 1 : -1) * (17 + hash(sd + i * 3.1) * 15), a = (hash(sd + i * 5.7) - 0.5) * 1.6, k = i % 5;
      ctx.save(); ctx.translate(x, -1.6); ctx.rotate(a);
      if (k === 0 || k === 3) { ctx.fillStyle = '#f2eee2'; blob(ctx, [-2.6, 0.8, -2.2, -1.8, 0, -2.4, 2.4, -1.6, 2.6, 1, 0, 1.6]); ctx.fillStyle = 'rgba(120,120,110,0.4)'; ctx.fillRect(-1.2, -1.2, 0.6, 2); ctx.fillRect(0.6, -0.8, 1.2, 0.5); }
      else if (k === 1) { ctx.fillStyle = '#c8332a'; rr(ctx, -3.4, -1.3, 6.8, 2.6, 0.8); ctx.fillStyle = '#d9dde0'; ctx.fillRect(-3.4, -1.3, 1.2, 2.6); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-2, -1, 5, 0.6); }
      else if (k === 2) { ctx.fillStyle = '#e8c53a'; ctx.beginPath(); ctx.moveTo(-3.6, 0.6); ctx.quadraticCurveTo(0, -1.8, 3.6, 0.6); ctx.quadraticCurveTo(0, -0.2, -3.6, 0.6); ctx.fill(); ctx.fillStyle = '#6b4a20'; circle(ctx, 3.5, 0.5, 0.5); }
      else { ctx.fillStyle = '#3a86c8'; poly(ctx, [-3, -1, 3, -1.4, 3.4, 0.8, -2.6, 1.2]); ctx.fillStyle = '#f2c84b'; ctx.fillRect(-1, -0.9, 2, 1.8); }
      ctx.restore();
    }
  }
  function bin(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.021) * 30, open = it.eaten, locked = it.locked && !open;
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0, 18, 2.4);
    if (open) trash(ctx, sd);
    ctx.fillStyle = '#9d988d'; rr(ctx, -14.5, -4.5, 29, 5, 1.3);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-13.5, -4.5, 27, 1);
    ctx.fillStyle = '#3d6b4a'; poly(ctx, [-12, -4, 12, -4, 13.2, -30, -13.2, -30]);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; poly(ctx, [-12, -4, -8.5, -4, -9.4, -30, -13.2, -30]);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; poly(ctx, [8, -4, 12, -4, 13.2, -30, 9, -30]);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = -2; i <= 2; i++) if (i) ctx.fillRect(i * 4.4 - 0.5, -27.5, 1, 21);
    ctx.fillStyle = '#2f5539'; ctx.fillRect(-12.2, -8.4, 24.4, 3);
    ctx.fillStyle = '#f4f1e6'; rr(ctx, -5.6, -23.4, 11.2, 10.4, 1.6);
    ctx.fillStyle = '#5a3a24'; ell(ctx, 0, -16.6, 2.6, 2.1);
    circle(ctx, -2.5, -19.5, 0.85); circle(ctx, -0.85, -20.5, 0.85); circle(ctx, 0.85, -20.5, 0.85); circle(ctx, 2.5, -19.5, 0.85);
    if (!open) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-13, -30, 26, 1.6);
      ctx.fillStyle = '#335b40'; rr(ctx, -14.6, -37.2, 29.2, 8, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-12.6, -36.4, 25.2, 1.6);
      ctx.fillStyle = '#1d3326'; rr(ctx, -9, -31.6, 18, 3, 1.2);
      if (!locked) {
        ctx.fillStyle = '#f2eee2'; poly(ctx, [-6, -30.2, -4.8, -33.6, -2.2, -32, -0.4, -34.2, 1.4, -30.2]);
        ctx.save(); ctx.translate(4.6, -31.6); ctx.rotate(-0.5); ctx.fillStyle = '#c8332a'; rr(ctx, -1.4, -3, 2.8, 4.6, 0.7); ctx.fillStyle = '#d9dde0'; ctx.fillRect(-1.4, -3, 2.8, 0.8); ctx.restore();
      }
    } else {
      ctx.fillStyle = '#16241a'; rr(ctx, -12.6, -32, 25.2, 3, 1);
      ctx.save(); ctx.translate(13.2, -31); ctx.rotate(1.3); ctx.fillStyle = '#335b40'; rr(ctx, -29.2, -4, 29.2, 8, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-27, 1.6, 25, 1.6); ctx.restore();
      ctx.fillStyle = '#f2eee2'; poly(ctx, [-6, -31, -4.4, -34, -2.6, -32.4]);
    }
    if (locked) {
      ctx.fillStyle = '#7d878f'; rr(ctx, -16, -34.8, 32, 3.4, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-15, -34.6, 30, 0.9);
      ctx.fillStyle = '#5c656c'; circle(ctx, -14, -33.1, 1.1); circle(ctx, 14, -33.1, 1.1);
      ctx.strokeStyle = '#a8b1b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -29.2, 3, PI, 0); ctx.stroke();
      ctx.fillStyle = '#d9a82e'; rr(ctx, -4.4, -29.6, 8.8, 7.4, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-3.6, -29, 7.2, 1.2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(1.6, -29.6, 2.8, 7.4);
      ctx.fillStyle = '#4a3410'; circle(ctx, 0, -26.6, 1); ctx.fillRect(-0.4, -26.6, 0.8, 2.4);
    }
    if (W && !open) cap(ctx, -14.6, 14.6, -37.2, 3.4, sd, W);
    ctx.restore();
  }

  function cob(ctx, x, y, a, l, bare) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (!bare) { ctx.fillStyle = '#d6cd98'; poly(ctx, [-l * 0.42, -1.6, -l * 0.5 - 5, -3.2, -l * 0.5 - 3.6, 0.2, -l * 0.5 - 5.4, 2.8, -l * 0.42, 1.8]); }
    ctx.fillStyle = bare ? '#e6d6a8' : '#f3c443'; rr(ctx, -l / 2, -2.6, l, 5.2, 2.6);
    ctx.fillStyle = bare ? 'rgba(150,110,60,0.4)' : '#d29f22';
    for (let k = 1.6; k < l - 1.2; k += 1.8) ctx.fillRect(-l / 2 + k, -2.1, 0.6, 4.2);
    ctx.fillRect(-l / 2 + 1, -0.3, l - 2, 0.6);
    ctx.fillStyle = bare ? 'rgba(255,250,230,0.6)' : 'rgba(255,240,180,0.75)'; ell(ctx, -0.6, -1.5, l * 0.36, 0.65);
    ctx.restore();
  }
  function makeCorn(sd) {
    const lo = new Path2D(), hi = new Path2D(), loose = [];
    for (let i = 0; i < 70; i++) {
      const x = (hash(sd + i * 1.71) - 0.5) * 44, H = 11.5 * pow(max(0, 1 - (x / 24) * (x / 24)), 0.8), y = -0.6 - hash(sd + i * 2.53) * H, p = hash(sd + i * 3.9) < 0.5 ? lo : hi;
      p.moveTo(x + 1.1, y); p.ellipse(x, y, 1.1, 0.8, hash(sd + i) * PI, 0, TAU);
    }
    for (let i = 0; i < 9; i++) loose.push((hash(sd + i * 6.1) - 0.5) * 62, -0.4 - hash(sd + i * 4.3) * 0.8);
    return { lo, hi, loose };
  }
  function corn(ctx, it, time, g, W) {
    const G = geo(it, makeCorn), sd = hash(it.x * 0.031) * 50;
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0, it.eaten ? 20 : 27, 2.6);
    ctx.fillStyle = '#f0bf3e';
    for (let i = 0; i < G.loose.length; i += 2) { if (it.eaten && i > 10) break; ell(ctx, G.loose[i], G.loose[i + 1], 1.1, 0.8); }
    if (it.eaten) {
      cob(ctx, 5, -2.2, 0.15 + (hash(sd) - 0.5) * 0.4, 10, true);
      ctx.fillStyle = '#d6cd98'; ell(ctx, -9, -0.6, 4, 1, 0.2);
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#c99a2a'; blob(ctx, [-25, 1, -18, -4.6, -8, -10, 2, -12.2, 12, -9.4, 21, -4, 26, 1]);
    ctx.fillStyle = '#e4b234'; blob(ctx, [-21, -0.4, -14, -5.6, -6, -10, 2, -11.4, 9, -9.2, 17, -4.6, 21.5, -0.6, 0, -1.4]);
    ctx.fillStyle = '#c48a1c'; ctx.fill(G.lo);
    ctx.fillStyle = '#f7d36a'; ctx.fill(G.hi);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; blob(ctx, [6, -9.8, 14, -7.6, 22, -2.4, 25, 0.6, 12, -0.6]);
    cob(ctx, -16, -3.6, 0.32, 10, false);
    cob(ctx, -6, -10.4, -0.18 + (hash(sd + 1) - 0.5) * 0.2, 12, false);
    cob(ctx, 7, -10.6, 0.4 + (hash(sd + 2) - 0.5) * 0.2, 11, false);
    cob(ctx, 15, -4.4, -0.12, 10, false);
    if (W) { ctx.fillStyle = W.snow; ell(ctx, -3, -11.6, 7, 1.6, -0.1); ell(ctx, 13, -7.8, 4.4, 1.2, 0.4); ell(ctx, -15, -6, 4, 1.1, -0.4); }
    ctx.restore();
  }

  function leaf(ctx, x, y, a, len, w, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(w * 1.3, -len * 0.5, 0, -len); ctx.quadraticCurveTo(-w * 1.3, -len * 0.5, 0, 0); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(w * 1.25, -len * 0.5, 0, -len); ctx.closePath(); ctx.fill();
    line(ctx, 0, -1.2, 0, -len * 0.86, 0.45, 'rgba(225,245,195,0.5)');
    ctx.restore();
  }
  const GARLIC = ['#2f7330', '#3f8a3a', '#57a046'];
  function herb(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.027) * 40, sw = sin(time * 1.4 + sd * 5) * 0.05 + sin(time * 2.9 + sd) * 0.015;
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0, 15, 2);
    if (it.eaten) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) line(ctx, (i - 2) * 2.2, 0, (i - 2) * 2.6 + (hash(sd + i) - 0.5) * 2, -2.4 - hash(sd + i * 3) * 2.4, 1.3, GARLIC[i % 3]);
      ctx.lineCap = 'butt';
      ctx.restore();
      return;
    }
    ctx.transform(1, 0, sw, 1, 0, 0);
    for (let i = 0; i < 7; i++) {
      const a = -1.05 + i * 0.35 + (hash(sd + i) - 0.5) * 0.22, len = 15 + hash(sd + i * 2) * 8 - abs(i - 3) * 1.2;
      leaf(ctx, (i - 3) * 1.1, 0.4, a, len, 3.3, GARLIC[(i * 2 + 1) % 3]);
    }
    ctx.strokeStyle = '#6fa64e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0.6, 0); ctx.quadraticCurveTo(2.2, -14, 1.6, -25); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.3, fx = 1.6 + cos(a) * 3.2, fy = -26 + sin(a) * 2.4;
      line(ctx, 1.6, -25, fx, fy, 0.4, '#8bbd62');
      ctx.fillStyle = '#fbfbf4';
      for (let k = 0; k < 5; k++) { const b = (k / 5) * TAU + i; ell(ctx, fx + cos(b) * 0.85, fy + sin(b) * 0.85, 0.75, 0.42, b); }
      ctx.fillStyle = '#d9e48a'; circle(ctx, fx, fy, 0.35);
    }
    leaf(ctx, -2.2, 0.4, -0.25, 19, 3.4, GARLIC[2]);
    ctx.restore();
  }

  const hillH = (x) => -21 * pow(max(0, 1 - (x / 26) * (x / 26)), 0.72);
  function makeHill(sd) {
    const hill = new Path2D(), n = [new Path2D(), new Path2D(), new Path2D()];
    hill.moveTo(-27, 1);
    for (let i = 0; i <= 26; i++) { const x = -26 + i * 2; hill.lineTo(x, hillH(x) - (i % 2) * 0.8 - hash(sd + i) * 0.8); }
    hill.lineTo(27, 1); hill.closePath();
    for (let i = 0; i < 110; i++) {
      const x = (hash(sd + i * 1.37) - 0.5) * 48, y = lerp(-0.8, hillH(x) + 1.2, hash(sd + i * 2.11)), a = hash(sd + i * 3.3) * PI, l = 1.4 + hash(sd + i * 4.7) * 2;
      const p = n[i % 3]; p.moveTo(x - cos(a) * l, y - sin(a) * l); p.lineTo(x + cos(a) * l, y + sin(a) * l);
    }
    return { hill, n };
  }
  function ant(ctx, x, y, d, time, sd) {
    const w = sin(time * 22 + sd * 9) * 0.6;
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(x - 0.8, y + 1.3 + w * 0.3); ctx.lineTo(x, y); ctx.lineTo(x + 0.8 + w, y + 1.3); ctx.moveTo(x - d * 0.2 + w, y + 1.4); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#2a1a12'; ell(ctx, x - d * 1.6, y - 0.1, 1.15, 0.85); circle(ctx, x, y, 0.55); circle(ctx, x + d * 1.25, y - 0.2, 0.65);
  }
  function anthill(ctx, it, time, g, W) {
    const G = geo(it, makeHill), sd = hash(it.x * 0.029) * 30, dug = it.eaten;
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0, 31, 3);
    if (dug) { ctx.fillStyle = '#6e5138'; ell(ctx, -26, -0.6, 7, 2.6, 0.1); ell(ctx, 27, -0.8, 8, 3, -0.1); }
    ctx.save();
    ctx.fillStyle = '#7a5a3e'; ctx.fill(G.hill); ctx.clip(G.hill);
    ctx.fillStyle = 'rgba(255,225,180,0.14)'; ell(ctx, -9, -14, 13, 10, -0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ell(ctx, 17, -3, 14, 16, 0.3);
    ctx.lineCap = 'round'; ctx.lineWidth = 0.75;
    ctx.strokeStyle = '#94714d'; ctx.stroke(G.n[0]);
    ctx.strokeStyle = '#614630'; ctx.stroke(G.n[1]);
    ctx.strokeStyle = '#a98761'; ctx.stroke(G.n[2]);
    if (dug) {
      ctx.fillStyle = '#3b2a1c'; ell(ctx, 3, -14, 11, 6.5, 0.05);
      ctx.fillStyle = '#271a10'; ell(ctx, 3.6, -12.6, 7.4, 3.6, 0.05);
      ctx.fillStyle = 'rgba(255,225,180,0.25)'; ctx.beginPath(); ctx.ellipse(3, -14, 11, 6.5, 0.05, PI * 1.05, PI * 1.95); ctx.lineTo(3, -16); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.lineCap = 'round';
    line(ctx, -14, -12, -6, -15.8, 1.3, '#5c432e'); line(ctx, 8, -17, 15, -12.4, 1.1, '#6b4f36');
    ctx.lineCap = 'butt';
    const n = dug ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const h = hash(sd + i * 2.7), sp = (0.035 + h * 0.03) * (dug ? 2.2 : 1), u = frac(time * sp + h), d = i % 2 ? 1 : -1;
      const x = d > 0 ? lerp(-30, 30, u) : lerp(30, -30, u), y = abs(x) < 26 ? hillH(x) + 0.2 : -0.8;
      ant(ctx, x, y - 0.6, d, time, sd + i);
    }
    ctx.restore();
  }

  function porcini(ctx, x, y, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.fillStyle = '#efe4c8'; blob(ctx, [-3.4, 0, -4.6, -4, -3.6, -8.5, -2.4, -11, 2.4, -11, 3.6, -8.5, 4.6, -4, 3.4, 0]);
    ctx.fillStyle = 'rgba(130,95,50,0.22)'; ell(ctx, 2.4, -4.6, 1.8, 4.2);
    ctx.strokeStyle = 'rgba(170,140,90,0.45)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); for (let k = 0; k < 5; k++) { ctx.moveTo(-2.2 + k * 1.1, -10.4); ctx.lineTo(-2.6 + k * 1.2, -8.4); } ctx.stroke();
    ctx.fillStyle = '#d6cd8a'; ell(ctx, 0, -10.8, 7.6, 1.7);
    ctx.fillStyle = '#8b5226';
    ctx.beginPath(); ctx.moveTo(-8, -10.8); ctx.bezierCurveTo(-8.4, -18.6, 8.4, -18.6, 8, -10.8); ctx.quadraticCurveTo(0, -9.6, -8, -10.8); ctx.fill();
    ctx.fillStyle = 'rgba(60,25,5,0.25)'; ctx.beginPath(); ctx.moveTo(2, -16.6); ctx.bezierCurveTo(6, -16.6, 8.2, -14, 8, -10.8); ctx.quadraticCurveTo(5, -10.3, 2.4, -10.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(230,180,120,0.4)'; ctx.fillRect(-7.6, -11.6, 15.2, 0.7);
    ctx.fillStyle = 'rgba(255,230,190,0.45)'; ell(ctx, -3, -15.4, 3, 1.1, -0.2);
    ctx.restore();
  }
  function basket(ctx, empty) {
    ctx.save(); ctx.translate(-4, -8.6); ctx.rotate(1.22);
    ctx.fillStyle = '#7a5128'; ctx.lineWidth = 2; ctx.strokeStyle = '#8a5e2e'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9.6, -11); ctx.bezierCurveTo(-9, -25, 9, -25, 9.6, -11); ctx.stroke();
    ctx.fillStyle = '#9a6a38'; poly(ctx, [-8, 0, 8, 0, 11, -11, -11, -11]);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(11, -11); ctx.lineTo(-11, -11); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#b5824a'; for (let k = 0; k < 6; k++) ctx.fillRect(-12, -10.6 + k * 1.9, 24, 0.95);
    ctx.fillStyle = 'rgba(70,40,15,0.35)'; for (let k = -4; k <= 4; k++) ctx.fillRect(k * 2.4 - 0.3, -12, 0.6, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [4, 0, 8, 0, 11, -11, 6.4, -11]);
    ctx.restore();
    ctx.fillStyle = '#2c1d10'; ell(ctx, 0, -11, 11, 2.6);
    ctx.fillStyle = '#c99a5c'; ctx.fillRect(-11.4, -11.6, 22.8, 1.2);
    ctx.restore();
    ctx.fillStyle = '#6f8c3a'; if (!empty) ell(ctx, 8, -1, 4, 1, 0);
  }
  function mushroom(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.033);
    ctx.save(); ctx.translate(it.x, GY);
    if (it.labelKey === 'basket') {
      shadow(ctx, W, 4, 22, 2.6);
      basket(ctx, it.eaten);
      if (!it.eaten) { porcini(ctx, 10.5, 0.2, 0.82, 0.25); porcini(ctx, 19, 0.6, 0.62, -0.1); porcini(ctx, 4, -1.4, 0.7, 1.35); }
      ctx.restore();
      return;
    }
    shadow(ctx, W, 1, 14, 2.2);
    ctx.fillStyle = '#5f8a3a'; blob(ctx, [-11, 0.8, -8, -2.2, -3, -2.8, 2, -2.4, 8, -2.6, 12, 0.8]);
    ctx.fillStyle = '#7aa64a'; ell(ctx, -6, -1.6, 3, 1, 0.1); ell(ctx, 6, -1.8, 2.6, 0.9, -0.1);
    porcini(ctx, -3, 0, 1.12, -0.06 + (sd - 0.5) * 0.1);
    porcini(ctx, 7.4, 0.2, 0.68, 0.14);
    ctx.fillStyle = '#b5762e'; ell(ctx, 11, -0.4, 3, 1.1, 0.4);
    ctx.restore();
  }

  function hazelLeaf(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#7d9a3c'; ctx.beginPath(); ctx.moveTo(-6.6, 0); ctx.bezierCurveTo(-4, -4.6, 4, -4.4, 6.8, 0); ctx.bezierCurveTo(4, 3.4, -4, 3.4, -6.6, 0); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(-6.6, 0); ctx.bezierCurveTo(-4, 3.4, 4, 3.4, 6.8, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,190,0.55)'; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-6.4, 0); ctx.lineTo(6.4, 0); for (let k = -2; k <= 2; k++) { ctx.moveTo(k * 2, 0); ctx.lineTo(k * 2 + 1.4, -2.2); ctx.moveTo(k * 2, 0); ctx.lineTo(k * 2 + 1.4, 2); } ctx.stroke();
    ctx.restore();
  }
  function husk(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#93a64e'; poly(ctx, [-4.4, 1.6, -5.4, -1.2, -3.6, -1.4, -4.4, -4.2, -2, -2.6, -1.4, -5, 0.4, -2.6, 2, -4.8, 2.4, -2, 4.8, -3.6, 4, -0.6, 5.4, 0.8, 3.6, 2.6, -3.2, 2.8]);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; poly(ctx, [0.4, -2.6, 2, -4.8, 2.4, -2, 4.8, -3.6, 4, -0.6, 5.4, 0.8, 3.6, 2.6, 0.4, 2.8]);
    ctx.restore();
  }
  function nut(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.041);
    ctx.save(); ctx.translate(it.x, GY); ctx.scale(1.6, 1.6);
    shadow(ctx, W, 0, 15, 2.2);
    hazelLeaf(ctx, -5, -1.4, -0.12 + (sd - 0.5) * 0.3);
    if (it.eaten) {
      for (let i = 0; i < 4; i++) {
        const x = -8 + i * 5.4 + hash(sd + i) * 2, a = (hash(sd + i * 3) - 0.5) * 2;
        ctx.fillStyle = '#7d4a22'; ctx.beginPath(); ctx.ellipse(x, -1.2, 2.6, 1.8, a, 0, PI); ctx.fill();
        ctx.fillStyle = '#e3cfa6'; ctx.beginPath(); ctx.ellipse(x, -1.4, 2, 0.8, a, 0, PI); ctx.fill();
      }
      ctx.restore();
      return;
    }
    husk(ctx, -3.4, -5, -0.3);
    hazelnut(ctx, -4.6, -6.6, 3.4, -0.35);
    hazelnut(ctx, -0.2, -6.2, 3.3, 0.3);
    husk(ctx, -2, -2.6, 0.05);
    hazelnut(ctx, 7, -3.5, 3.4, 1.25 + (sd - 0.5) * 0.4);
    ctx.restore();
  }

  function slice(ctx, y) {
    ctx.fillStyle = '#b8783a'; rr(ctx, -11.6, y, 23.2, 4.2, 1.8);
    ctx.fillStyle = '#efdcae'; rr(ctx, -10.6, y + 0.9, 21.2, 2.4, 1);
    ctx.fillStyle = 'rgba(180,140,80,0.4)'; for (let k = 0; k < 5; k++) circle(ctx, -8 + k * 4.2, y + 2.1 + (k % 2) * 0.4, 0.35);
  }
  function sandwich(ctx, it, time, g, W) {
    const sd = hash(it.x * 0.047);
    ctx.save(); ctx.translate(it.x, GY);
    shadow(ctx, W, 0, 16, 2);
    ctx.fillStyle = '#e9e2d0'; poly(ctx, [-15, 0.6, 14, 0.4, 16, -1.4, -13, -2]);
    ctx.fillStyle = '#f6f2e8'; poly(ctx, [-15, 0.6, -10, -9, -6.5, -9.6, -9, 0.4]);
    ctx.fillStyle = 'rgba(150,140,120,0.3)'; poly(ctx, [-9, 0.4, -6.5, -9.6, -7.6, -9.4, -10, 0.4]);
    ctx.rotate((sd - 0.5) * 0.06);
    slice(ctx, -4.6);
    ctx.fillStyle = '#e58e86'; rr(ctx, -10.4, -6.4, 21, 2.2, 1);
    ctx.fillStyle = '#7cb84a'; blob(ctx, [-12.6, -6.4, -9, -8.6, -5, -6.8, -1, -8.8, 3, -6.8, 7, -8.8, 12.2, -6.6, 10, -5.6, -10.6, -5.6]);
    ctx.fillStyle = '#f2c84b'; poly(ctx, [-9.8, -9.6, 10.8, -9.6, 11.6, -8, 13.2, -4.8, 10.4, -7.6, -9.8, -7.6]);
    slice(ctx, -13.8);
    ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(-9.6, -13.4, 12, 0.7);
    ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(4.4, -19.4); ctx.stroke();
    ctx.fillStyle = '#6a8a2e'; circle(ctx, 4.5, -19.6, 1.5); ctx.fillStyle = '#c0392b'; circle(ctx, 4.7, -19.6, 0.55);
    ctx.restore();
  }

  const DRAW = { wildhoney, stash, apple: appleItem, berry, hive, bin, corn, herb, ants: anthill, mushroom, nut, sandwich };
  const LEFT = { berry: 1, hive: 1, bin: 1, ants: 1, corn: 1, wildhoney: 1, stash: 1, nut: 1 };
  API.has = (type) => !!DRAW[type];
  API.left = (it) => !!LEFT[it.type] || (it.type === 'apple' && it.y === undefined) || (it.type === 'mushroom' && it.labelKey === 'basket');
  API.draw = (ctx, it, time, g, W) => DRAW[it.type](ctx, it, time, g, W);
})();
