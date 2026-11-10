(function () {
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, min = Math.min, max = Math.max, abs = Math.abs, floor = Math.floor;
  const { clamp, lerp, smooth, hash } = ZS.util;
  const { circle, ellipse: ell, rrect: rr } = ZS.gfx;
  const FUR = '#6b4226', FUR2 = '#4e2f19', MUZ = '#9a6a44', CLAW = '#e4d6bb';
  const SUIT = { white: '#f5f6f8', blue: '#1f4fa8', red: '#d1262c', navy: '#16264a' };
  const JACKETS = ['#d6332b', '#2a62c4', '#f2b23a', '#3a8f5a', '#7b3fa8', '#e86a1f', '#1f8c9a', '#c43a7a', '#4a4f5c', '#e3d24a'];
  const HATS = ['#e23a2f', '#f4f4f4', '#2c4fa0', '#f2c230', '#2f8a4c', '#9a3fb0', '#ff8a1f'];

  function poly(ctx, a) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]); ctx.closePath(); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = max(0.6, w); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineCap = 'butt'; }
  function text(ctx, t, x, y, size, col, weight, maxW) {
    ctx.font = (weight || 800) + ' ' + max(1, size).toFixed(1) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
    if (maxW) { const w = ctx.measureText(t).width; if (w > maxW) ctx.font = (weight || 800) + ' ' + max(1, size * maxW / w).toFixed(1) + 'px system-ui, sans-serif'; }
    ctx.fillText(t, x, y);
  }

  function spruce(ctx, x, y, s, h, seed, dwarf, t) {
    if (dwarf) {
      const w = h * s * 1.2;
      ctx.fillStyle = '#3b5a43'; ell(ctx, x, y - w * 0.25, w * 0.6, w * 0.32);
      ctx.fillStyle = '#4e7255'; ell(ctx, x - w * 0.2, y - w * 0.32, w * 0.3, w * 0.18);
      ctx.fillStyle = '#f2f6f9'; ell(ctx, x + w * 0.05, y - w * 0.46, w * 0.4, w * 0.12);
      return;
    }
    const H = h * s, W = H * (0.34 + seed * 0.08), sway = sin(t * 0.8 + seed * 9) * W * 0.01;
    if (H < 3) { ctx.fillStyle = '#4a6458'; poly(ctx, [x - W * 0.5, y, x + W * 0.5, y, x, y - H]); return; }
    ctx.fillStyle = '#5a4430'; ctx.fillRect(x - W * 0.05, y - H * 0.16, W * 0.1, H * 0.16);
    const tiers = H > 40 ? 5 : 3;
    for (let i = 0; i < tiers; i++) {
      const k = i / tiers, ty = y - H * (0.12 + k * 0.78), tw = W * (1 - k * 0.78) * 0.5, th = H * (0.3 - k * 0.04), sx = sway * (1 + i);
      ctx.fillStyle = i % 2 ? '#2f4f3c' : '#29463a';
      poly(ctx, [x - tw + sx * 0.3, ty, x + tw + sx * 0.3, ty, x + sx, ty - th]);
      ctx.fillStyle = 'rgba(15,35,25,0.35)'; poly(ctx, [x + sx, ty - th, x + tw + sx * 0.3, ty, x + tw * 0.2 + sx * 0.3, ty]);
      ctx.fillStyle = '#f3f7fa';
      poly(ctx, [x - tw * 0.85 + sx * 0.3, ty - th * 0.08, x - tw * 0.2 + sx * 0.5, ty - th * 0.28, x + sx * 0.8, ty - th * 0.75, x + tw * 0.15 + sx * 0.5, ty - th * 0.3, x + tw * 0.75 + sx * 0.3, ty - th * 0.12, x + tw * 0.3, ty - th * 0.2, x - tw * 0.3, ty - th * 0.16]);
    }
    ctx.fillStyle = '#f6f9fb'; ell(ctx, x, y, W * 0.55, max(0.8, W * 0.08));
  }

  function person(ctx, x, y, s, o) {
    const h = (o.h || 1.72) * s, w = h * 0.27, cheer = o.cheer || 0, t = o.t || 0, sd = o.seed || 0;
    if (h < 6) { ctx.fillStyle = o.jacket; rr(ctx, x - w * 0.5, y - h * 0.85, w, h * 0.85, w * 0.3); ctx.fillStyle = o.hat; circle(ctx, x, y - h * 0.88, w * 0.32); return; }
    const bob = cheer ? abs(sin(t * 6 + sd)) * h * 0.03 * cheer : 0, yy = y - bob;
    ctx.fillStyle = o.pants || '#2c3444';
    rr(ctx, x - w * 0.42, yy - h * 0.48, w * 0.36, h * 0.46, w * 0.12); rr(ctx, x + w * 0.06, yy - h * 0.48, w * 0.36, h * 0.46, w * 0.12);
    ctx.fillStyle = '#222'; rr(ctx, x - w * 0.48, yy - h * 0.06, w * 0.44, h * 0.07, w * 0.08); rr(ctx, x + w * 0.04, yy - h * 0.06, w * 0.44, h * 0.07, w * 0.08);
    ctx.fillStyle = o.jacket; rr(ctx, x - w * 0.55, yy - h * 0.82, w * 1.1, h * 0.42, w * 0.35);
    if (o.vest) { ctx.fillStyle = o.vest; rr(ctx, x - w * 0.45, yy - h * 0.78, w * 0.9, h * 0.3, w * 0.2); if (o.num) text(ctx, String(o.num), x, yy - h * 0.63, h * 0.12, '#1b1b1b'); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - w * 0.55, yy - h * 0.66, w * 1.1, h * 0.04); }
    const raise = cheer * (0.5 + 0.5 * sin(t * 7 + sd * 3));
    const ax = x + w * 0.55, ay = yy - h * 0.76, hx = ax + w * 0.35, hy = ay - h * (0.05 + 0.3 * raise);
    line(ctx, ax, ay, hx, hy, w * 0.3, o.jacket);
    line(ctx, x - w * 0.55, ay, x - w * 0.75, yy - h * (0.45 + (o.flag ? 0.4 : 0)), w * 0.3, o.jacket);
    ctx.fillStyle = '#f0c8a8'; circle(ctx, x, yy - h * 0.9, h * 0.085);
    ctx.fillStyle = o.hat; ell(ctx, x, yy - h * 0.94, h * 0.09, h * 0.07);
    if (h > 18) { ctx.fillStyle = '#fff'; circle(ctx, x, yy - h * 1.01, h * 0.03); ctx.fillStyle = '#222'; ctx.fillRect(x - h * 0.06, yy - h * 0.91, h * 0.12, h * 0.02); }
    if (o.bell) {
      const bx = hx + sin(t * 18 + sd) * w * 0.15, by = hy - h * 0.02;
      ctx.fillStyle = '#c9a23a'; poly(ctx, [bx - w * 0.18, by, bx + w * 0.18, by, bx + w * 0.12, by - w * 0.32, bx - w * 0.12, by - w * 0.32]);
      ctx.fillStyle = '#6b4b1a'; ctx.fillRect(bx - w * 0.04, by - w * 0.44, w * 0.08, w * 0.12);
    }
    if (o.flag) flag(ctx, x - w * 0.75, yy - h * 0.85, h * 0.3, t + sd);
  }

  function flag(ctx, x, y, s, t) {
    line(ctx, x, y + s * 0.6, x, y - s * 0.5, max(0.8, s * 0.04), '#5a4430');
    const w = s * 0.9, hh = s * 0.6, wv = sin(t * 5) * s * 0.05;
    const band = (i, col) => { ctx.fillStyle = col; poly(ctx, [x, y - s * 0.5 + (hh / 3) * i, x + w, y - s * 0.5 + (hh / 3) * i + wv, x + w, y - s * 0.5 + (hh / 3) * (i + 1) + wv, x, y - s * 0.5 + (hh / 3) * (i + 1)]); };
    band(0, '#ffffff'); band(1, '#0b4ea2'); band(2, '#ee1c25');
    if (s > 10 && ZS.olympHud) ZS.olympHud.arms(ctx, x + w * 0.32, y - s * 0.5 + hh * 0.5 + wv * 0.3, hh * 0.62);
  }

  function crowd(ctx, x, y, s, cr, t, cheer) {
    const n = cr.n, gap = 0.62 * s;
    for (let i = 0; i < n; i++) {
      const sd = cr.seed + i * 7.3, px = x + (i - (n - 1) / 2) * gap + (hash(sd) - 0.5) * gap * 0.3;
      person(ctx, px, y - hash(sd * 2) * s * 0.15, s, { jacket: JACKETS[floor(hash(sd * 3.1) * JACKETS.length)], hat: HATS[floor(hash(sd * 5.7) * HATS.length)], h: 1.6 + hash(sd * 1.3) * 0.25, t, seed: sd, cheer: 0.4 + cheer * 0.6, bell: hash(sd * 9.1) < 0.45, flag: cr.flag && i === 0 });
    }
  }

  const BEARS = [['#7a4a26', '#a8764a'], ['#4f2f1a', '#86593a'], ['#a8743f', '#d6aa72'], ['#2f2620', '#6a5444'], ['#8a5a32', '#c4935e']];
  const SCARF = [['#ffffff', '#0b4ea2', '#ee1c25'], ['#ee1c25', '#ffffff'], ['#0b4ea2', '#ffffff'], ['#f2c230', '#1d2230']];

  function bearFan(ctx, x, y, s, o) {
    const h = 1.75 * s;
    if (h < 5) return;
    const sd = o.seed, t = o.t + hash(sd * 3.3) * 6, hype = clamp(o.hype || 0, 0, 1), gasp = clamp(o.gasp || 0, 0, 1);
    const [fur, belly] = BEARS[floor(hash(sd * 1.7) * BEARS.length)], acc = floor(hash(sd * 4.1) * 6), scarf = SCARF[floor(hash(sd * 6.3) * SCARF.length)];
    const hop = abs(sin(t * (7 + hype * 3))) * 0.22 * s * hype * (1 - gasp), sway = sin(t * 2.2) * 0.04 * (1 - hype);
    ctx.save(); ctx.translate(x, y - hop); ctx.rotate(sway);
    ctx.fillStyle = 'rgba(40,50,80,0.22)'; ctx.save(); ctx.translate(0, hop); ell(ctx, 0, 0, 0.42 * s, 0.07 * s); ctx.restore();
    ctx.fillStyle = fur; ell(ctx, -0.17 * s, -0.12 * s, 0.14 * s, 0.16 * s); ell(ctx, 0.17 * s, -0.12 * s, 0.14 * s, 0.16 * s);
    ctx.fillStyle = belly; ell(ctx, -0.17 * s, -0.02 * s, 0.13 * s, 0.05 * s); ell(ctx, 0.17 * s, -0.02 * s, 0.13 * s, 0.05 * s);
    ctx.fillStyle = fur; ell(ctx, 0, -0.62 * s, 0.4 * s, 0.5 * s);
    ctx.fillStyle = belly; ell(ctx, 0, -0.55 * s, 0.25 * s, 0.34 * s);
    const sh = -0.95 * s, arm = (side, ang) => {
      ctx.save(); ctx.translate(side * 0.3 * s, sh); ctx.rotate(ang);
      ctx.fillStyle = fur; rr(ctx, -0.09 * s, -0.04 * s, 0.18 * s, 0.56 * s, 0.09 * s);
      ctx.fillStyle = belly; circle(ctx, 0, 0.52 * s, 0.1 * s);
      ctx.restore();
      return [side * 0.3 * s - sin(ang) * 0.55 * s, sh + cos(ang) * 0.55 * s];
    };
    const up = hype * (0.75 + 0.25 * sin(t * 10)), wave = sin(t * 5) * 0.45;
    let la, ra;
    if (gasp > 0.3) { la = PI * 0.95; ra = -PI * 0.95; }
    else {
      la = lerp(0.35 + (acc === 2 ? 0 : wave * 0.2), PI * 0.88 + wave * 0.25, up);
      ra = lerp(-0.35 - (acc === 0 ? 1.8 + wave : 0), -PI * 0.88 - wave * 0.25, up);
    }
    const lp = arm(-1, la), rp = arm(1, ra);
    ctx.fillStyle = scarf[0]; rr(ctx, -0.3 * s, -1.06 * s, 0.6 * s, 0.13 * s, 0.06 * s);
    ctx.fillStyle = scarf[1]; ctx.fillRect(-0.12 * s, -1.06 * s, 0.1 * s, 0.13 * s); ctx.fillRect(0.12 * s, -1.06 * s, 0.1 * s, 0.13 * s);
    ctx.fillStyle = scarf[scarf.length - 1]; rr(ctx, 0.1 * s, -1.0 * s, 0.11 * s, 0.34 * s, 0.03 * s);
    const hx = 0, hy = -1.3 * s, hr = 0.3 * s;
    ctx.fillStyle = fur; circle(ctx, hx - hr * 0.82, hy - hr * 0.7, hr * 0.32); circle(ctx, hx + hr * 0.82, hy - hr * 0.7, hr * 0.32);
    ctx.fillStyle = belly; circle(ctx, hx - hr * 0.82, hy - hr * 0.7, hr * 0.16); circle(ctx, hx + hr * 0.82, hy - hr * 0.7, hr * 0.16);
    ctx.fillStyle = fur; circle(ctx, hx, hy, hr);
    ctx.fillStyle = belly; ell(ctx, hx, hy + hr * 0.36, hr * 0.5, hr * 0.36);
    ctx.fillStyle = '#1d1209'; ell(ctx, hx, hy + hr * 0.2, hr * 0.17, hr * 0.11);
    circle(ctx, hx - hr * 0.38, hy - hr * 0.12, hr * 0.09); circle(ctx, hx + hr * 0.38, hy - hr * 0.12, hr * 0.09);
    if (hype > 0.35 && gasp < 0.3) { ctx.fillStyle = '#7a1f1f'; ell(ctx, hx, hy + hr * 0.55, hr * 0.2, hr * 0.14 * (0.6 + 0.4 * abs(sin(t * 9)))); }
    if (acc === 1) {
      const cl = scarf[0] === '#ffffff' ? '#ee1c25' : scarf[0];
      ctx.fillStyle = cl; ctx.beginPath(); ctx.arc(hx, hy - hr * 0.35, hr * 0.78, PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(hx - hr * 0.8, hy - hr * 0.42, hr * 1.6, hr * 0.16);
      circle(ctx, hx, hy - hr * 1.18, hr * 0.2);
    }
    if (acc === 2) flag(ctx, lp[0], lp[1] - 0.05 * s, 0.75 * s, t);
    if (acc === 3) { ctx.fillStyle = '#c9a43a'; const bx = rp[0], by = rp[1] + 0.08 * s, sw = sin(t * 14) * 0.08 * s * (0.4 + hype); poly(ctx, [bx - 0.1 * s + sw, by, bx + 0.1 * s + sw, by, bx + 0.14 * s + sw, by + 0.2 * s, bx - 0.14 * s + sw, by + 0.2 * s]); ctx.fillStyle = '#6e5a1e'; circle(ctx, bx + sw, by + 0.22 * s, 0.035 * s); }
    if (acc === 4) { ctx.fillStyle = '#f2c230'; poly(ctx, [hx + hr * 0.15, hy + hr * 0.45, hx + hr * 0.15 + 0.5 * s, hy + hr * 0.1 - 0.18 * s, hx + hr * 0.15 + 0.56 * s, hy + hr * 0.1 - 0.02 * s, hx + hr * 0.15, hy + hr * 0.6]); }
    if (acc === 5 && gasp < 0.3) {
      const cx = (lp[0] + rp[0]) / 2, cy = Math.min(lp[1], rp[1]) - 0.32 * s, w = 0.95 * s, hh = 0.36 * s;
      ctx.fillStyle = '#ffffff'; rr(ctx, cx - w / 2, cy - hh / 2, w, hh, 0.04 * s);
      ctx.fillStyle = '#0b4ea2'; ctx.fillRect(cx - w / 2, cy + hh * 0.3, w, hh * 0.2);
      if (hh > 6) text(ctx, o.label || '7!', cx, cy - hh * 0.02, hh * 0.55, '#d1262c', 900, w * 0.9);
    }
    ctx.restore();
  }

  function bears(ctx, x, y, s, gr, t, hype, gasp) {
    const n = gr.n, gap = 0.78 * s;
    for (let i = 0; i < n; i++) {
      const sd = gr.seed + i * 5.9, px = x + (i - (n - 1) / 2) * gap + (hash(sd) - 0.5) * gap * 0.25;
      bearFan(ctx, px, y - hash(sd * 2.4) * s * 0.12, s * (0.92 + hash(sd * 8.2) * 0.16), { seed: sd, t, hype: clamp(hype + (hash(sd * 1.9) - 0.5) * 0.3, 0, 1), gasp, label: gr.label });
    }
  }

  function banner(ctx, x, y, s, label, kind) {
    const w = 5.4 * s, h = 0.9 * s;
    if (w < 6) return;
    const bg = kind === 'svk' ? '#0b4ea2' : kind === 'holding' ? '#1d2230' : kind === 'tree' ? '#2f6b3f' : '#ffffff';
    const fg = kind === 'hop' ? '#d1262c' : '#ffffff';
    ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - h * 1.25, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - w / 2, y - h * 0.35, w, h * 0.08);
    if (kind === 'svk') { ctx.fillStyle = '#fff'; ctx.fillRect(x - w / 2, y - h * 1.25, w, h * 0.12); ctx.fillStyle = '#ee1c25'; ctx.fillRect(x - w / 2, y - h * 0.47, w, h * 0.12); }
    if (h > 5) text(ctx, label, x, y - h * 0.78, h * 0.55, fg, 900, w * 0.92);
  }

  function sign(ctx, x, y, s, label, bg, fg) {
    const w = 4.2 * s, h = 0.8 * s;
    if (w < 6) return;
    line(ctx, x - w * 0.4, y, x - w * 0.4, y - h * 2.6, max(1, s * 0.08), '#6a4d33');
    line(ctx, x + w * 0.4, y, x + w * 0.4, y - h * 2.6, max(1, s * 0.08), '#6a4d33');
    ctx.fillStyle = bg; rr(ctx, x - w / 2, y - h * 3.2, w, h, max(1, h * 0.15));
    if (h > 5) text(ctx, label, x, y - h * 2.7, h * 0.48, fg, 900, w * 0.92);
  }

  function cannon(ctx, x, y, s, dir, t) {
    const H = 4.2 * s;
    if (H < 4) return;
    line(ctx, x, y, x, y - H, max(1, 0.18 * s), '#8a929c');
    ctx.save(); ctx.translate(x, y - H); ctx.rotate(dir * 0.25);
    ctx.fillStyle = '#2e7d4f'; rr(ctx, -0.55 * s, -0.55 * s, 1.5 * s, 1.1 * s, 0.3 * s);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(-0.55 * s, -0.15 * s, 1.5 * s, 0.25 * s);
    ctx.fillStyle = '#222'; ell(ctx, dir * 0.95 * s, 0, 0.12 * s, 0.5 * s);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) { const u = (t * 0.9 + i / 6) % 1; circle(ctx, x + dir * (1.4 + u * 7) * s, y - H - (0.2 - u * 0.8) * s - sin(u * PI) * s * 0.8, (0.3 + u * 1.2) * s); }
  }

  function ratrak(ctx, x, y, s, t, rel) {
    const L = 7.6 * s, H = 2.6 * s;
    if (L < 8) return;
    const on = sin(t * 9) > 0;
    ctx.fillStyle = 'rgba(40,50,80,0.22)'; ell(ctx, x, y, L * 0.56, H * 0.07);
    ctx.fillStyle = '#f4f8fc'; ell(ctx, x - L * 0.5, y - H * 0.05, L * 0.09, H * 0.12);
    ctx.fillStyle = '#3a3d44'; rr(ctx, x + L * 0.34, y - H * 0.34, L * 0.15, H * 0.26, H * 0.05);
    ctx.fillStyle = '#e8eef4'; for (let i = 0; i < 6; i++) ctx.fillRect(x + L * 0.35 + i * L * 0.022, y - H * 0.1, L * 0.008, H * 0.1);
    ctx.fillStyle = '#1f2126'; rr(ctx, x - L * 0.37, y - H * 0.34, L * 0.72, H * 0.34, H * 0.17);
    ctx.fillStyle = '#3b3f48'; rr(ctx, x - L * 0.355, y - H * 0.31, L * 0.69, H * 0.28, H * 0.14);
    ctx.fillStyle = '#5b606b';
    for (let i = 0; i < 6; i++) { const wx = x - L * 0.3 + i * L * 0.118; circle(ctx, wx, y - H * 0.17, H * 0.1); }
    ctx.fillStyle = '#2b2e35';
    for (let i = 0; i < 6; i++) { const wx = x - L * 0.3 + i * L * 0.118; circle(ctx, wx, y - H * 0.17, H * 0.04); }
    ctx.fillStyle = '#16181c'; for (let i = 0; i < 18; i++) ctx.fillRect(x - L * 0.36 + i * L * 0.04, y - H * 0.035, L * 0.018, H * 0.035);
    ctx.fillStyle = '#d42b25'; rr(ctx, x - L * 0.36, y - H * 0.62, L * 0.7, H * 0.3, H * 0.05);
    ctx.fillStyle = '#a81f1b'; ctx.fillRect(x - L * 0.36, y - H * 0.38, L * 0.7, H * 0.05);
    ctx.fillStyle = '#c9252a'; rr(ctx, x + L * 0.02, y - H * 0.74, L * 0.3, H * 0.14, H * 0.04);
    ctx.fillStyle = '#f2f4f7'; rr(ctx, x - L * 0.34, y - H * 1.04, L * 0.34, H * 0.44, H * 0.06);
    ctx.fillStyle = '#5f8fb8'; rr(ctx, x - L * 0.31, y - H * 0.98, L * 0.13, H * 0.3, H * 0.03); rr(ctx, x - L * 0.165, y - H * 0.98, L * 0.135, H * 0.3, H * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - L * 0.3, y - H * 0.96, L * 0.04, H * 0.26);
    ctx.fillStyle = '#d42b25'; ctx.fillRect(x - L * 0.34, y - H * 1.06, L * 0.34, H * 0.06);
    ctx.fillStyle = '#2b2d33'; ctx.fillRect(x - L * 0.3, y - H * 1.1, L * 0.26, H * 0.04);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#fff6c8'; circle(ctx, x - L * 0.27 + i * L * 0.1, y - H * 1.12, H * 0.035); }
    ctx.fillStyle = on ? '#ffb020' : '#b66a00'; rr(ctx, x - L * 0.19, y - H * 1.2, L * 0.05, H * 0.09, H * 0.02);
    if (on) { ctx.fillStyle = 'rgba(255,176,32,0.28)'; circle(ctx, x - L * 0.165, y - H * 1.16, H * 0.22); }
    ctx.strokeStyle = '#6b707a'; ctx.lineWidth = max(1, H * 0.05);
    ctx.beginPath(); ctx.moveTo(x - L * 0.36, y - H * 0.45); ctx.lineTo(x - L * 0.44, y - H * 0.35); ctx.moveTo(x - L * 0.36, y - H * 0.25); ctx.lineTo(x - L * 0.44, y - H * 0.2); ctx.stroke();
    ctx.fillStyle = '#c9ced6';
    ctx.beginPath(); ctx.moveTo(x - L * 0.43, y - H * 0.62); ctx.quadraticCurveTo(x - L * 0.52, y - H * 0.32, x - L * 0.46, y); ctx.lineTo(x - L * 0.41, y); ctx.quadraticCurveTo(x - L * 0.46, y - H * 0.32, x - L * 0.4, y - H * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x - L * 0.465, y - H * 0.05, L * 0.06, H * 0.05);
    ctx.fillStyle = '#fff6c8'; circle(ctx, x - L * 0.355, y - H * 0.55, H * 0.05);
    ctx.fillStyle = 'rgba(255,240,170,0.3)'; circle(ctx, x - L * 0.355, y - H * 0.55, H * 0.13);
    if (H > 22) text(ctx, 'PISTEN', x + L * 0.12, y - H * 0.47, H * 0.12, '#fff', 900, L * 0.3);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + L * 0.03, y - H * 0.6, L * 0.025, H * 0.06);
  }

  function kid(ctx, x, y, s, t, i) {
    const wob = sin(t * 5 + i) * 0.04;
    ctx.save(); ctx.translate(x, y); ctx.rotate(wob);
    ctx.fillStyle = '#d94b2a'; ctx.fillRect(-0.45 * s, -0.04 * s, 0.9 * s, 0.06 * s);
    person(ctx, 0, 0, s, { h: 1.15, jacket: JACKETS[i % JACKETS.length], hat: '#f4f4f4', t, seed: i, vest: '#f6e32a', num: i, pants: '#3b4a6b' });
    ctx.restore();
  }

  function instructor(ctx, x, y, s, t) {
    person(ctx, x, y, s, { h: 1.75, jacket: '#d1262c', hat: '#d1262c', t, seed: 3, pants: '#1b1f2a', cheer: 0.6 });
    const h = 1.75 * s;
    if (h > 14) { ctx.fillStyle = '#f2c230'; circle(ctx, x + h * 0.05, y - h * 0.84, h * 0.025); }
  }

  function fallen(ctx, x, y, s, t) {
    if (s < 3) return;
    ctx.fillStyle = 'rgba(70,95,140,0.22)'; ell(ctx, x, y, 1.4 * s, 0.25 * s);
    ctx.fillStyle = '#e0d33a'; ctx.save(); ctx.translate(x - 0.3 * s, y - 0.05 * s); ctx.rotate(0.5); ctx.fillRect(-0.9 * s, -0.04 * s, 1.8 * s, 0.08 * s); ctx.restore();
    ctx.save(); ctx.translate(x + 0.3 * s, y - 0.05 * s); ctx.rotate(-0.4); ctx.fillStyle = '#e0d33a'; ctx.fillRect(-0.9 * s, -0.04 * s, 1.8 * s, 0.08 * s); ctx.restore();
    ctx.fillStyle = '#7b3fa8'; rr(ctx, x - 0.32 * s, y - 0.85 * s, 0.64 * s, 0.6 * s, 0.2 * s);
    ctx.fillStyle = '#2c3444'; rr(ctx, x - 0.4 * s, y - 0.3 * s, 0.8 * s, 0.28 * s, 0.1 * s);
    const pat = sin(t * 6);
    line(ctx, x - 0.3 * s, y - 0.7 * s, x - 0.7 * s, y - 0.12 * s + pat * 0.06 * s, 0.14 * s, '#7b3fa8');
    line(ctx, x + 0.3 * s, y - 0.7 * s, x + 0.72 * s, y - 0.14 * s - pat * 0.06 * s, 0.14 * s, '#7b3fa8');
    ctx.fillStyle = '#f0c8a8'; circle(ctx, x, y - 1.0 * s, 0.16 * s);
    ctx.fillStyle = '#2f8a4c'; ell(ctx, x, y - 1.08 * s, 0.17 * s, 0.11 * s);
    ctx.fillStyle = '#e86a1f'; rr(ctx, x + 0.9 * s, y - 0.12 * s, 0.34 * s, 0.12 * s, 0.05 * s);
    ctx.fillStyle = '#86c0e8'; rr(ctx, x + 0.94 * s, y - 0.1 * s, 0.26 * s, 0.07 * s, 0.03 * s);
    if (s > 12) { ctx.fillStyle = '#fff'; ctx.font = '800 ' + (0.3 * s).toFixed(1) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('?', x + 0.2 * s, y - 1.35 * s + sin(t * 3) * 0.05 * s); }
  }

  function booth(ctx, x, y, s, t, mic) {
    const w = 3.2 * s, h = 2.4 * s, up = 1.6 * s;
    if (w < 6) return;
    ctx.fillStyle = '#6a4d33'; ctx.fillRect(x - w * 0.42, y - up, w * 0.08, up); ctx.fillRect(x + w * 0.34, y - up, w * 0.08, up);
    ctx.fillStyle = '#8a643f'; ctx.fillRect(x - w / 2, y - up - h, w, h);
    ctx.fillStyle = '#7a5634'; for (let i = 0; i < 6; i++) ctx.fillRect(x - w / 2, y - up - h + i * h / 6, w, h * 0.02);
    ctx.fillStyle = '#f4f7fa'; poly(ctx, [x - w * 0.62, y - up - h, x + w * 0.62, y - up - h, x + w * 0.4, y - up - h * 1.35, x - w * 0.4, y - up - h * 1.35]);
    ctx.fillStyle = '#2b3b52'; ctx.fillRect(x - w * 0.36, y - up - h * 0.85, w * 0.72, h * 0.45);
    const talk = mic ? 1 : 0;
    ctx.fillStyle = '#f0c8a8'; circle(ctx, x, y - up - h * 0.6 - sin(t * 10) * talk * h * 0.01, h * 0.09);
    ctx.fillStyle = '#222'; ctx.fillRect(x - h * 0.11, y - up - h * 0.7, h * 0.22, h * 0.03);
    ctx.fillStyle = '#d1262c'; rr(ctx, x - w * 0.3, y - up - h * 1.18, w * 0.6, h * 0.2, h * 0.05);
    if (h > 12) text(ctx, ZS.LABELS.olymp.sign.live, x, y - up - h * 1.08, h * 0.13, '#fff', 900, w * 0.55);
    if (talk && h > 10) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 3; i++) circle(ctx, x + w * 0.45 + i * h * 0.1, y - up - h * (0.75 + i * 0.12) + sin(t * 8 + i) * 2, h * (0.03 + i * 0.015)); }
  }

  function stall(ctx, x, y, s, t) {
    const w = 3 * s, h = 2.5 * s;
    if (w < 6) return;
    ctx.fillStyle = '#8a643f'; ctx.fillRect(x - w / 2, y - h * 0.55, w, h * 0.55);
    ctx.fillStyle = '#d1262c'; poly(ctx, [x - w * 0.6, y - h * 0.9, x + w * 0.6, y - h * 0.9, x + w * 0.5, y - h * 1.15, x - w * 0.5, y - h * 1.15]);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i += 2) poly(ctx, [x - w * 0.6 + i * w * 0.2, y - h * 0.9, x - w * 0.6 + (i + 1) * w * 0.2, y - h * 0.9, x - w * 0.5 + (i + 1) * w * 0.167, y - h * 1.15, x - w * 0.5 + i * w * 0.167, y - h * 1.15]);
    line(ctx, x - w * 0.5, y - h * 0.55, x - w * 0.5, y - h * 0.9, max(1, s * 0.08), '#6a4d33'); line(ctx, x + w * 0.5, y - h * 0.55, x + w * 0.5, y - h * 0.9, max(1, s * 0.08), '#6a4d33');
    ctx.fillStyle = '#3a3f47'; ell(ctx, x, y - h * 0.58, w * 0.18, h * 0.06);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; circle(ctx, x + sin(u * 6 + i) * w * 0.05, y - h * (0.65 + u * 0.5), w * (0.05 + u * 0.06)); }
    if (h > 12) text(ctx, ZS.LABELS.olymp.sign.soup, x, y - h * 0.3, h * 0.12, '#fff', 900, w * 0.9);
  }

  function startHut(ctx, x, y, s, t, ph) {
    const w = 3.4 * s, h = 2.6 * s;
    if (w < 6) return;
    ctx.fillStyle = '#7a5634'; ctx.fillRect(x - w / 2, y - h, w * 0.08, h); ctx.fillRect(x + w / 2 - w * 0.08, y - h, w * 0.08, h);
    ctx.fillStyle = '#d1262c'; ctx.fillRect(x - w * 0.55, y - h * 1.15, w * 1.1, h * 0.2);
    text(ctx, ZS.LABELS.olymp.sign.start, x, y - h * 1.05, h * 0.11, '#fff', 900, w);
    const open = ph === 'ski' ? 1 : 0;
    ctx.save(); ctx.translate(x - w * 0.42, y - h * 0.32); ctx.rotate(-open * 1.3);
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, -h * 0.02, w * 0.84, h * 0.04); ctx.fillStyle = '#d1262c'; for (let i = 0; i < 4; i++) ctx.fillRect(i * w * 0.22, -h * 0.02, w * 0.1, h * 0.04);
    ctx.restore();
  }

  function arch(ctx, x, y, s, label, half) {
    const w = 2 * (half + 1) * s, h = 6 * s, th = 1.1 * s;
    if (w < 8) return;
    ctx.fillStyle = '#d1262c'; rr(ctx, x - w / 2 - th * 0.5, y - h, th, h, th * 0.4); rr(ctx, x + w / 2 - th * 0.5, y - h, th, h, th * 0.4);
    ctx.fillStyle = '#0b4ea2'; rr(ctx, x - w / 2 - th * 0.5, y - h - th * 0.4, w + th, th * 1.3, th * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, x - w / 2, y - h - th * 0.3, w, th * 0.3, th * 0.15);
    if (th > 4) text(ctx, label, x, y - h + th * 0.25, th * 0.72, '#fff', 900, w * 0.8);
  }

  function board(ctx, x, y, s, g, O) {
    const w = 7 * s, h = 3.4 * s, up = 3 * s;
    if (w < 10) return;
    ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - w * 0.3, y - up, w * 0.05, up); ctx.fillRect(x + w * 0.25, y - up, w * 0.05, up);
    ctx.fillStyle = '#14181f'; rr(ctx, x - w / 2, y - up - h, w, h, h * 0.06);
    if (h < 12) return;
    const c = O.c, L = ZS.LABELS.olymp.hud;
    ctx.fillStyle = '#d1262c'; ctx.fillRect(x - w / 2, y - up - h, w, h * 0.2);
    text(ctx, ZS.LABELS.olymp.sign.jasna, x, y - up - h * 0.9, h * 0.12, '#fff', 900, w * 0.9);
    const tm = O.stage === 'slalom' && c ? Math.max(0, c.clock + (c.pen || 0) - (c.bonus || 0)) : 0;
    text(ctx, L.you + '  ' + ZS.olympHud.clock(tm), x, y - up - h * 0.58, h * 0.16, '#ffd84a', 800, w * 0.9);
    text(ctx, L.record + ' ' + ZS.olympHud.clock(ZS.sim.olymp.RECORD), x, y - up - h * 0.28, h * 0.11, '#9fe08a', 700, w * 0.9);
  }

  function pylon(ctx, x, y, s) {
    const H = 13.5 * s;
    if (H < 8) return;
    ctx.fillStyle = '#8f98a3'; poly(ctx, [x - 0.4 * s, y, x + 0.4 * s, y, x + 0.18 * s, y - H, x - 0.18 * s, y - H]);
    ctx.fillStyle = '#6f7883'; ctx.fillRect(x - 2.6 * s, y - H, 5.2 * s, 0.35 * s);
    ctx.fillStyle = '#3a3f47'; circle(ctx, x - 2.2 * s, y - H, 0.22 * s); circle(ctx, x + 2.2 * s, y - H, 0.22 * s);
  }

  function lamp(ctx, x, y, s, t) {
    const H = 2.6 * s;
    if (H < 5) return;
    line(ctx, x, y, x, y - H, max(1, 0.1 * s), '#3a3f47');
    ctx.fillStyle = 'rgba(255,214,140,0.25)'; circle(ctx, x, y - H, 0.9 * s);
    ctx.fillStyle = '#ffe2a0'; circle(ctx, x, y - H, 0.18 * s);
    void t;
  }

  function judgeTower(ctx, x, y, s, t, tt) {
    const w = 6.5 * s, h = 2.2 * s, up = 3 * s;
    if (w < 8) return;
    ctx.fillStyle = '#6a4d33'; ctx.fillRect(x - w * 0.45, y - up, w * 0.06, up); ctx.fillRect(x + w * 0.39, y - up, w * 0.06, up);
    ctx.fillStyle = '#e9edf2'; ctx.fillRect(x - w / 2, y - up - h * 0.4, w, h * 0.4);
    ctx.fillStyle = '#0b4ea2'; ctx.fillRect(x - w / 2, y - up - h * 0.42, w, h * 0.06);
    for (let i = 0; i < 5; i++) {
      const jx = x - w * 0.4 + i * w * 0.2;
      ctx.fillStyle = ['#2c3444', '#7b3fa8', '#3a8f5a', '#1f8c9a', '#d1262c'][i]; rr(ctx, jx - h * 0.14, y - up - h * 0.75, h * 0.28, h * 0.4, h * 0.08);
      ctx.fillStyle = '#f0c8a8'; circle(ctx, jx, y - up - h * 0.83, h * 0.1);
      if (tt >= 0 && tt > 0.4 + i * 0.35) { ctx.fillStyle = '#fff'; rr(ctx, jx - h * 0.16, y - up - h * 1.25, h * 0.32, h * 0.22, h * 0.03); }
    }
  }

  function bar(ctx, x, y, s, t, rel) {
    const w = 15 * s, h = 6 * s;
    if (w < 10) return;
    ctx.fillStyle = 'rgba(40,40,60,0.18)'; ell(ctx, x, y, w * 0.6, h * 0.06);
    ctx.fillStyle = '#7a5634'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = '#6a4a2c'; for (let i = 0; i < 9; i++) ctx.fillRect(x - w / 2, y - h + i * h / 9, w, h * 0.015);
    ctx.fillStyle = '#f4f7fa'; poly(ctx, [x - w * 0.6, y - h, x + w * 0.6, y - h, x, y - h * 1.9]);
    ctx.fillStyle = '#5a3a20'; poly(ctx, [x - w * 0.56, y - h * 0.98, x + w * 0.56, y - h * 0.98, x, y - h * 1.8, x, y - h * 1.7, x + w * 0.48, y - h * 1.02, x - w * 0.48, y - h * 1.02, x, y - h * 1.7, x, y - h * 1.8]);
    for (const wx of [-0.36, -0.2, 0.2, 0.36]) { ctx.fillStyle = '#ffc860'; ctx.fillRect(x + wx * w - w * 0.05, y - h * 0.75, w * 0.1, h * 0.3); ctx.fillStyle = 'rgba(255,200,96,0.25)'; circle(ctx, x + wx * w, y - h * 0.6, w * 0.08); }
    ctx.fillStyle = '#ffd98a'; rr(ctx, x - w * 0.11, y - h * 0.8, w * 0.22, h * 0.8, w * 0.02);
    ctx.fillStyle = '#3a2412'; ctx.fillRect(x - w * 0.1, y - h * 0.78, w * 0.02, h * 0.78); ctx.fillRect(x + w * 0.08, y - h * 0.78, w * 0.02, h * 0.78);
    const glow = 0.75 + 0.25 * sin(t * 6);
    ctx.fillStyle = 'rgba(255,60,120,' + (0.25 * glow).toFixed(3) + ')'; rr(ctx, x - w * 0.36, y - h * 1.32, w * 0.72, h * 0.26, h * 0.06);
    if (h > 10) text(ctx, ZS.LABELS.olymp.sign.bar, x, y - h * 1.19, h * 0.15, 'rgba(255,' + floor(200 + 50 * glow) + ',' + floor(230 + 20 * glow) + ',1)', 900, w * 0.68);
    for (let i = 0; i < 16; i++) { const lx = x - w * 0.5 + (i / 15) * w, ly = y - h * 1.0 + sin((i / 15) * PI) * h * 0.08; ctx.fillStyle = ['#ff5a5a', '#ffd84a', '#5ad1ff', '#7cff7a'][i % 4]; ctx.globalAlpha = 0.6 + 0.4 * (sin(t * 4 + i) > 0 ? 1 : 0.3); circle(ctx, lx, ly, max(0.8, 0.12 * s)); ctx.globalAlpha = 1; }
    void rel;
  }

  function beer(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; rr(ctx, x - 0.07 * s, y - 0.2 * s, 0.14 * s, 0.2 * s, 0.025 * s);
    ctx.fillStyle = '#f2b23a'; ctx.fillRect(x - 0.055 * s, y - 0.15 * s, 0.11 * s, 0.13 * s);
    ctx.fillStyle = '#fffbe8'; ell(ctx, x, y - 0.19 * s, 0.08 * s, 0.035 * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = max(0.6, 0.02 * s); ctx.beginPath(); ctx.arc(x + 0.08 * s, y - 0.1 * s, 0.04 * s, -PI / 2, PI / 2); ctx.stroke();
  }

  function waiter(ctx, x, y, s, t, hit) {
    if (hit) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-1.35);
      waiter(ctx, 0, 0, s, 0, false);
      ctx.restore();
      ctx.fillStyle = 'rgba(242,178,58,0.55)'; ell(ctx, x + 0.7 * s, y - 0.03 * s, 0.9 * s, 0.12 * s);
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + (0.4 + i * 0.45) * s, y - (0.25 + 0.3 * abs(sin(t * 3 + i))) * s); ctx.rotate(1.2 + i); beer(ctx, 0, 0, s); ctx.restore(); }
      return;
    }
    const step = sin(t * 5) * 0.12 * s;
    ctx.fillStyle = 'rgba(60,80,120,0.22)'; ell(ctx, x, y, 0.45 * s, 0.08 * s);
    ctx.fillStyle = '#14171f'; rr(ctx, x - 0.18 * s + step * 0.3, y - 0.85 * s, 0.15 * s, 0.85 * s, 0.05 * s); rr(ctx, x + 0.03 * s - step * 0.3, y - 0.85 * s, 0.15 * s, 0.85 * s, 0.05 * s);
    ctx.fillStyle = '#0a0b0f'; rr(ctx, x - 0.2 * s + step * 0.3, y - 0.06 * s, 0.2 * s, 0.07 * s, 0.03 * s); rr(ctx, x + 0.02 * s - step * 0.3, y - 0.06 * s, 0.2 * s, 0.07 * s, 0.03 * s);
    ctx.fillStyle = '#f7f7f7'; rr(ctx, x - 0.26 * s, y - 1.45 * s, 0.52 * s, 0.68 * s, 0.14 * s);
    ctx.fillStyle = '#1b1f2a'; poly(ctx, [x - 0.26 * s, y - 1.4 * s, x - 0.06 * s, y - 1.4 * s, x - 0.02 * s, y - 0.8 * s, x - 0.26 * s, y - 0.8 * s]); poly(ctx, [x + 0.26 * s, y - 1.4 * s, x + 0.06 * s, y - 1.4 * s, x + 0.02 * s, y - 0.8 * s, x + 0.26 * s, y - 0.8 * s]);
    ctx.fillStyle = '#c0392b'; poly(ctx, [x - 0.08 * s, y - 1.44 * s, x, y - 1.4 * s, x - 0.08 * s, y - 1.36 * s]); poly(ctx, [x + 0.08 * s, y - 1.44 * s, x, y - 1.4 * s, x + 0.08 * s, y - 1.36 * s]);
    ctx.fillStyle = '#fff'; rr(ctx, x - 0.2 * s, y - 0.9 * s, 0.4 * s, 0.36 * s, 0.04 * s);
    line(ctx, x - 0.24 * s, y - 1.38 * s, x - 0.3 * s, y - 0.95 * s, 0.13 * s, '#f7f7f7');
    line(ctx, x + 0.24 * s, y - 1.38 * s, x + 0.5 * s, y - 1.5 * s, 0.13 * s, '#f7f7f7');
    ctx.fillStyle = '#f0c8a8'; circle(ctx, x + 0.52 * s, y - 1.52 * s, 0.06 * s); circle(ctx, x, y - 1.6 * s, 0.15 * s);
    ctx.fillStyle = '#2a1a10'; ell(ctx, x, y - 1.7 * s, 0.15 * s, 0.07 * s);
    ctx.fillStyle = '#3a2412'; ctx.fillRect(x - 0.07 * s, y - 1.55 * s, 0.14 * s, 0.025 * s);
    ctx.fillStyle = '#c9ced6'; ell(ctx, x + 0.52 * s, y - 1.58 * s, 0.38 * s, 0.05 * s);
    for (let i = 0; i < 3; i++) beer(ctx, x + (0.3 + i * 0.2) * s, y - 1.6 * s, s);
  }

  function thing(ctx, x, y, s, kind, t, hit) {
    if (s < 2) return;
    if (kind === 'mound') { ctx.fillStyle = '#e6edf5'; ell(ctx, x, y - (hit ? 0.05 : 0.15) * s, 0.9 * s, (hit ? 0.15 : 0.4) * s); ctx.fillStyle = '#c8d6e6'; ell(ctx, x + 0.25 * s, y - 0.08 * s, 0.6 * s, (hit ? 0.08 : 0.22) * s); ctx.fillStyle = '#fff'; ell(ctx, x - 0.2 * s, y - (hit ? 0.1 : 0.42) * s, 0.4 * s, 0.1 * s); return; }
    if (kind === 'glove') { ctx.save(); ctx.translate(x, y); if (hit) ctx.rotate(2.5); ctx.fillStyle = '#d1262c'; rr(ctx, -0.25 * s, -0.18 * s, 0.5 * s, 0.18 * s, 0.07 * s); ctx.fillRect(0.05 * s, -0.32 * s, 0.12 * s, 0.16 * s); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(-0.3 * s, -0.18 * s, 0.08 * s, 0.18 * s); ctx.restore(); return; }
    if (kind === 'waiter') { waiter(ctx, x, y, s, t, hit); return; }
    ctx.save(); ctx.translate(x, y); if (hit) ctx.rotate(1.3);
    person(ctx, 0, 0.1 * s, s, { h: 1.2, jacket: '#2a62c4', hat: '#f2c230', t, seed: 8, pants: '#3b4a6b' });
    ctx.restore();
  }

  function goggles(ctx, x, y, w, h) {
    ctx.fillStyle = '#1b1f2a'; rr(ctx, x - w / 2, y - h / 2, w, h, h * 0.45);
    const gr = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    gr.addColorStop(0, '#ffb347'); gr.addColorStop(0.5, '#ff5fa2'); gr.addColorStop(1, '#5fb7ff');
    ctx.fillStyle = gr; rr(ctx, x - w * 0.44, y - h * 0.36, w * 0.88, h * 0.72, h * 0.36);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(ctx, x - w * 0.36, y - h * 0.28, w * 0.3, h * 0.14, h * 0.07);
  }

  function skierBack(ctx, x, y, s, o) {
    const t = o.t, pp = o.pole >= 0 && o.pole < 1 ? o.pole : -1, bend = pp >= 0 ? sin(min(1, pp / 0.85) * PI) : 0;
    const tuck = max(o.tuck ? 1 : 0, bend * 0.9), ready = o.ready && pp < 0 ? 1 : 0;
    const blink = o.inv > 0 ? 0.55 + 0.45 * cos(t * 18) : 1;
    ctx.save();
    ctx.globalAlpha *= blink;
    ctx.translate(x, y);
    if (o.fall > 0) { const k = o.fall; ctx.rotate(sin(t * 11) * 0.8 * k); ctx.translate(0, -sin(k * PI) * 0.4 * s); }
    else ctx.rotate(o.lean * 0.55 + (o.stop ? 0.25 : 0));
    const yaw = clamp(o.phi || 0, -0.7, 0.7), wf = 1 - abs(yaw) * 0.22;
    const hip = (0.78 - tuck * 0.22 + ready * 0.08) * s, sh = (1.42 - tuck * 0.5 + ready * 0.08) * s, bw = 0.52 * s * wf;
    const lean = yaw * 0.25 * s, bob = sin(t * 7) * 0.012 * s * (o.v > 2 ? 1 : 0);
    ctx.fillStyle = 'rgba(30,40,70,0.0)';
    for (const sd of [-1, 1]) {
      const kx = sd * (0.2 - tuck * 0.02) * s + lean * 0.3, ky = -(0.42 - tuck * 0.12) * s;
      line(ctx, sd * 0.17 * s, -0.12 * s, kx, ky, 0.2 * s, SUIT.navy);
      line(ctx, kx, ky, sd * 0.2 * s + lean * 0.6, -hip + 0.05 * s, 0.24 * s, SUIT.navy);
      ctx.fillStyle = '#e9ecf0'; rr(ctx, sd * 0.17 * s - 0.12 * s, -0.3 * s, 0.24 * s, 0.3 * s, 0.06 * s);
      ctx.fillStyle = SUIT.red; ctx.fillRect(sd * 0.17 * s - 0.12 * s, -0.22 * s, 0.24 * s, 0.05 * s);
    }
    const hy = -hip + bob, sy = -sh + bob, cx = lean;
    ctx.fillStyle = SUIT.navy; ell(ctx, cx * 0.7, hy, bw * 0.95, 0.24 * s);
    ctx.fillStyle = FUR; ell(ctx, cx * 0.7, hy + 0.06 * s, 0.08 * s, 0.07 * s);
    ctx.fillStyle = SUIT.white;
    ctx.beginPath();
    ctx.moveTo(cx * 0.7 - bw, hy);
    ctx.bezierCurveTo(cx * 0.7 - bw * 1.08, hy - (hy - sy) * 0.5, cx - bw * 1.02, sy + 0.1 * s, cx - bw * 0.78, sy);
    ctx.lineTo(cx + bw * 0.78, sy);
    ctx.bezierCurveTo(cx + bw * 1.02, sy + 0.1 * s, cx * 0.7 + bw * 1.08, hy - (hy - sy) * 0.5, cx * 0.7 + bw, hy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = SUIT.blue; poly(ctx, [cx * 0.7 - bw, hy - 0.02 * s, cx - bw * 0.95, sy + (hy - sy) * 0.45, cx + bw * 0.95, sy + (hy - sy) * 0.15, cx * 0.7 + bw * 0.98, hy - (hy - sy) * 0.15, cx * 0.7 + bw, hy]);
    ctx.fillStyle = SUIT.red; poly(ctx, [cx * 0.7 - bw * 0.98, hy - (hy - sy) * 0.08, cx * 0.7 + bw, hy - (hy - sy) * 0.42, cx * 0.7 + bw * 0.99, hy - (hy - sy) * 0.3, cx * 0.7 - bw * 0.99, hy + 0.02 * s]);
    const bibY = sy + (hy - sy) * 0.22, bibH = (hy - sy) * 0.42;
    ctx.fillStyle = '#ffffff'; rr(ctx, cx - bw * 0.55, bibY, bw * 1.1, bibH, 0.05 * s);
    ctx.fillStyle = SUIT.red; ctx.fillRect(cx - bw * 0.55, bibY, bw * 1.1, bibH * 0.16);
    if (s > 10) { text(ctx, '7', cx, bibY + bibH * 0.6, bibH * 0.62, '#111', 900); text(ctx, 'SVK', cx, bibY + bibH * 0.09, bibH * 0.13, '#fff', 900); }
    for (const sd of [-1, 1]) {
      const shx = cx + sd * bw * 0.82, shy = sy + 0.08 * s;
      const plant = o.stop ? 0 : clamp(-sd * (o.lean || 0) * 2, 0, 1);
      let px = sd * (0.62 + tuck * 0.05) * s + cx * 0.4, py = -(0.95 - tuck * 0.4 + ready * 0.05) * s - plant * 0.1 * s, tip;
      if (pp >= 0) {
        const N = [sd * 0.62 * s, -0.95 * s, sd * 0.8 * s, -0.02 * s], A = [sd * 0.5 * s, -1.42 * s, sd * 0.66 * s, -0.34 * s], B = [sd * 1.0 * s, -0.5 * s, sd * 1.5 * s, 0.5 * s];
        const sm = (k) => k * k * (3 - 2 * k), mix = (P, Q, k) => P.map((v, i) => v + (Q[i] - v) * k);
        const P = pp < 0.3 ? mix(N, A, sm(pp / 0.3)) : pp < 0.8 ? mix(A, B, sm((pp - 0.3) / 0.5)) : mix(B, N, sm((pp - 0.8) / 0.2));
        const lift = pp < 0.3 ? sin(pp / 0.3 * PI) * 0.3 * s : 0;
        px = P[0] + cx * 0.4; py = P[1]; tip = [px, py, P[2] + cx * 0.4, P[3] - lift];
      }
      line(ctx, shx, shy, px, py, 0.2 * s, SUIT.white);
      line(ctx, shx, shy + 0.05 * s, (shx + px) / 2, (shy + py) / 2 + 0.03 * s, 0.07 * s, SUIT.blue);
      ctx.fillStyle = FUR2; circle(ctx, px, py, 0.1 * s);
      tip = tip || (tuck ? [px - sd * 0.1 * s + 0, py + 0.05 * s, px + sd * 0.25 * s, py + 0.75 * s] : [px, py, px + sd * (0.18 + plant * 0.1) * s, -0.02 * s]);
      line(ctx, tip[0], tip[1], tip[2], tip[3], max(0.8, 0.035 * s), '#c9ced6');
      ctx.fillStyle = '#20242c'; circle(ctx, tip[2], tip[3] - 0.08 * s, 0.05 * s);
      if (s > 16) { ctx.strokeStyle = CLAW; ctx.lineWidth = max(0.6, 0.015 * s); ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(px + i * 0.035 * s, py + 0.06 * s); ctx.lineTo(px + i * 0.04 * s, py + 0.12 * s); } ctx.stroke(); }
    }
    const hx = cx * 1.15, hd = sy - (0.24 - tuck * 0.06) * s, hr = 0.27 * s;
    ctx.fillStyle = FUR; ell(ctx, hx, sy - 0.02 * s, hr * 0.85, 0.1 * s);
    for (const sd of [-1, 1]) {
      ctx.fillStyle = FUR2; circle(ctx, hx + sd * hr * 0.88, hd - hr * 0.62, hr * 0.32);
      ctx.fillStyle = FUR; circle(ctx, hx + sd * hr * 0.88, hd - hr * 0.62, hr * 0.22);
    }
    ctx.fillStyle = FUR; ell(ctx, hx, hd + hr * 0.25, hr * 0.95, hr * 0.7);
    ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(hx, hd, hr * 1.02, PI * 1.02, PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SUIT.red; ctx.fillRect(hx - hr * 0.12, hd - hr * 1.0, hr * 0.24, hr * 0.98);
    ctx.fillStyle = '#1b1f2a'; ctx.fillRect(hx - hr * 1.0, hd + hr * 0.02, hr * 2.0, hr * 0.22);
    if (s > 12) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(hx - hr * 0.3, hd + hr * 0.06, hr * 0.6, hr * 0.14); }
    ctx.restore();
  }

  function skierSide(ctx, x, y, s, o) {
    const t = o.t, blink = o.inv > 0 ? 0.55 + 0.45 * cos(t * 18) : 1;
    ctx.save();
    ctx.globalAlpha *= blink;
    ctx.translate(x, y - 0.8 * s);
    ctx.rotate(o.flip || 0);
    const sp = o.spin || 0, cs = cos(sp);
    if (abs(cs) < 0.32) {
      ctx.translate(0, 0.8 * s);
      ctx.scale(1, 1);
      frontish(ctx, s, sin(sp) > 0, o);
      ctx.restore();
      return;
    }
    ctx.scale(cs >= 0 ? max(0.4, cs) : min(-0.4, cs), 1);
    const g = o.grab || 0, air = o.air ? 1 : 0;
    const crouch = 0.15 + air * 0.25 + g * 0.25;
    const footY = 0.8 * s - crouch * 0.2 * s;
    ctx.save(); ctx.translate(0, footY); ctx.rotate(air ? -0.08 : 0);
    ctx.fillStyle = '#c8302a'; rr(ctx, -0.95 * s, -0.04 * s, 1.95 * s, 0.07 * s, 0.03 * s);
    ctx.beginPath(); ctx.moveTo(1.0 * s, -0.04 * s); ctx.quadraticCurveTo(1.15 * s, -0.06 * s, 1.12 * s, -0.2 * s); ctx.lineTo(1.05 * s, -0.18 * s); ctx.quadraticCurveTo(1.06 * s, -0.07 * s, 0.95 * s, -0.01 * s); ctx.fill();
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(-0.1 * s, -0.035 * s, 0.4 * s, 0.035 * s);
    ctx.restore();
    const kx = 0.22 * s, ky = footY - (0.42 - crouch * 0.12) * s, hipX = -0.12 * s, hipY = footY - (0.85 - crouch * 0.35) * s;
    ctx.fillStyle = '#e9ecf0'; rr(ctx, -0.12 * s, footY - 0.3 * s, 0.26 * s, 0.28 * s, 0.06 * s);
    line(ctx, 0.02 * s, footY - 0.2 * s, kx, ky, 0.22 * s, SUIT.navy);
    line(ctx, kx, ky, hipX, hipY, 0.26 * s, SUIT.navy);
    const shX = 0.12 * s + crouch * 0.18 * s, shY = hipY - (0.6 - crouch * 0.12) * s;
    ctx.fillStyle = SUIT.white;
    ctx.beginPath(); ctx.moveTo(hipX - 0.3 * s, hipY + 0.05 * s); ctx.quadraticCurveTo(hipX - 0.36 * s, (hipY + shY) / 2, shX - 0.2 * s, shY - 0.02 * s);
    ctx.lineTo(shX + 0.22 * s, shY + 0.04 * s); ctx.quadraticCurveTo(hipX + 0.42 * s, (hipY + shY) / 2 + 0.1 * s, hipX + 0.22 * s, hipY + 0.12 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SUIT.blue; poly(ctx, [hipX - 0.32 * s, hipY, shX - 0.24 * s, shY + 0.18 * s, shX - 0.1 * s, shY + 0.1 * s, hipX - 0.12 * s, hipY + 0.06 * s]);
    ctx.fillStyle = SUIT.red; poly(ctx, [hipX - 0.12 * s, hipY + 0.07 * s, shX + 0.05 * s, shY + 0.06 * s, shX + 0.16 * s, shY + 0.1 * s, hipX + 0.06 * s, hipY + 0.1 * s]);
    ctx.fillStyle = FUR; ell(ctx, hipX - 0.33 * s, hipY + 0.02 * s, 0.07 * s, 0.06 * s);
    const handX = g ? 0.5 * s : shX + 0.45 * s, handY = g ? footY - 0.1 * s : shY + 0.3 * s;
    line(ctx, shX, shY + 0.06 * s, handX, handY, 0.18 * s, SUIT.white);
    ctx.fillStyle = FUR2; circle(ctx, handX, handY, 0.09 * s);
    if (!g) line(ctx, handX, handY, handX - 0.75 * s, handY + 0.25 * s, max(0.8, 0.035 * s), '#c9ced6');
    const hx = shX + 0.2 * s, hy = shY - 0.22 * s, hr = 0.25 * s;
    ctx.fillStyle = FUR; ell(ctx, hx + hr * 0.95, hy + hr * 0.25, hr * 0.6, hr * 0.38);
    ctx.fillStyle = MUZ; ell(ctx, hx + hr * 1.15, hy + hr * 0.3, hr * 0.42, hr * 0.26);
    ctx.fillStyle = '#1d1209'; ell(ctx, hx + hr * 1.52, hy + hr * 0.18, hr * 0.13, hr * 0.1);
    ctx.fillStyle = FUR; circle(ctx, hx, hy, hr);
    ctx.fillStyle = FUR2; circle(ctx, hx - hr * 0.55, hy - hr * 0.8, hr * 0.3);
    ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(hx, hy, hr * 1.04, PI * 1.05, PI * 2.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SUIT.red; ctx.fillRect(hx - hr * 1.0, hy - hr * 0.5, hr * 2.0, hr * 0.18);
    goggles(ctx, hx + hr * 0.62, hy + hr * 0.02, hr * 0.85, hr * 0.48);
    if (air && s > 12) { ctx.fillStyle = '#fff'; poly(ctx, [hx + hr * 1.32, hy + hr * 0.45, hx + hr * 1.5, hy + hr * 0.45, hx + hr * 1.42, hy + hr * 0.6]); }
    ctx.restore();
  }

  function frontish(ctx, s, front, o) {
    const sh = -1.3 * s, hip = -0.75 * s;
    ctx.fillStyle = '#c8302a'; rr(ctx, -0.32 * s, -0.08 * s, 0.14 * s, 0.1 * s, 0.03 * s); rr(ctx, 0.18 * s, -0.08 * s, 0.14 * s, 0.1 * s, 0.03 * s);
    for (const sd of [-1, 1]) line(ctx, sd * 0.2 * s, -0.08 * s, sd * 0.2 * s, hip, 0.24 * s, SUIT.navy);
    ctx.fillStyle = SUIT.white; rr(ctx, -0.48 * s, sh, 0.96 * s, hip - sh + 0.1 * s, 0.3 * s);
    ctx.fillStyle = SUIT.blue; ctx.fillRect(-0.48 * s, sh + 0.3 * s, 0.96 * s, 0.12 * s);
    ctx.fillStyle = SUIT.red; ctx.fillRect(-0.48 * s, sh + 0.42 * s, 0.96 * s, 0.08 * s);
    for (const sd of [-1, 1]) { line(ctx, sd * 0.46 * s, sh + 0.1 * s, sd * 0.75 * s, sh + 0.45 * s + (o.grab ? 0.5 * s : 0), 0.18 * s, SUIT.white); ctx.fillStyle = FUR2; circle(ctx, sd * 0.75 * s, sh + 0.45 * s + (o.grab ? 0.5 * s : 0), 0.09 * s); }
    const hy = sh - 0.25 * s, hr = 0.27 * s;
    for (const sd of [-1, 1]) { ctx.fillStyle = FUR2; circle(ctx, sd * hr * 0.88, hy - hr * 0.62, hr * 0.32); }
    ctx.fillStyle = FUR; circle(ctx, 0, hy, hr);
    ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(0, hy, hr * 1.04, PI * 1.02, PI * 1.98); ctx.closePath(); ctx.fill();
    if (front) {
      ctx.fillStyle = MUZ; ell(ctx, 0, hy + hr * 0.45, hr * 0.45, hr * 0.32);
      ctx.fillStyle = '#1d1209'; ell(ctx, 0, hy + hr * 0.32, hr * 0.15, hr * 0.1);
      goggles(ctx, 0, hy - hr * 0.08, hr * 1.5, hr * 0.5);
    } else { ctx.fillStyle = '#1b1f2a'; ctx.fillRect(-hr, hy - hr * 0.05, hr * 2, hr * 0.2); }
  }

  function sledBack(ctx, x, y, s, o) {
    const t = o.t, lie = o.lie ? 1 : 0, blink = o.inv > 0 ? 0.55 + 0.45 * cos(t * 18) : 1;
    ctx.save();
    ctx.globalAlpha *= blink;
    ctx.translate(x, y);
    if (o.fall > 0) ctx.rotate(sin(t * 12) * 0.6 * o.fall);
    const lean = o.lean * 0.18 * s;
    ctx.fillStyle = 'rgba(60,80,120,0.25)'; ell(ctx, 0, 0.02 * s, 0.62 * s, 0.1 * s);
    ctx.fillStyle = '#8a5a2b';
    rr(ctx, -0.48 * s, -0.12 * s, 0.07 * s, 0.12 * s, 0.02 * s); rr(ctx, 0.41 * s, -0.12 * s, 0.07 * s, 0.12 * s, 0.02 * s);
    ctx.fillStyle = '#a8743a'; rr(ctx, -0.52 * s, -0.3 * s, 1.04 * s, 0.16 * s, 0.04 * s);
    ctx.fillStyle = '#c08a4a'; for (let i = 0; i < 5; i++) ctx.fillRect(-0.48 * s + i * 0.2 * s, -0.3 * s, 0.12 * s, 0.05 * s);
    ctx.strokeStyle = '#7a5634'; ctx.lineWidth = max(0.8, 0.05 * s); ctx.beginPath(); ctx.moveTo(-0.5 * s, 0); ctx.quadraticCurveTo(-0.55 * s, -0.2 * s, -0.42 * s, -0.32 * s); ctx.moveTo(0.5 * s, 0); ctx.quadraticCurveTo(0.55 * s, -0.2 * s, 0.42 * s, -0.32 * s); ctx.stroke();
    const sh = (-1.05 + lie * 0.55) * s, hip = -0.36 * s;
    ctx.fillStyle = SUIT.navy; ell(ctx, lean * 0.5, hip, 0.5 * s, 0.17 * s);
    ctx.fillStyle = SUIT.white;
    ctx.beginPath(); ctx.moveTo(-0.5 * s + lean * 0.5, hip); ctx.bezierCurveTo(-0.56 * s, (hip + sh) / 2, -0.5 * s + lean, sh + 0.05 * s, -0.36 * s + lean, sh);
    ctx.lineTo(0.36 * s + lean, sh); ctx.bezierCurveTo(0.5 * s + lean, sh + 0.05 * s, 0.56 * s, (hip + sh) / 2, 0.5 * s + lean * 0.5, hip); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SUIT.blue; ctx.fillRect(-0.5 * s + lean * 0.5, (hip + sh) / 2, 1.0 * s, 0.1 * s * (1 - lie * 0.5));
    if (s > 10 && !lie) { ctx.fillStyle = '#fff'; rr(ctx, -0.22 * s + lean * 0.8, sh + 0.12 * s, 0.44 * s, 0.32 * s, 0.04 * s); text(ctx, '7', lean * 0.8, sh + 0.3 * s, 0.22 * s, '#111', 900); }
    for (const sd of [-1, 1]) {
      const px = sd * 0.5 * s, py = -0.3 * s;
      line(ctx, sd * 0.36 * s + lean, sh + 0.08 * s, px, py, 0.17 * s, SUIT.white);
      ctx.fillStyle = FUR2; circle(ctx, px, py, 0.085 * s);
    }
    const hr = 0.27 * s * (1 + lie * 0.25), hy = sh - 0.22 * s * (1 - lie * 0.5), hx = lean * 1.1;
    for (const sd of [-1, 1]) { ctx.fillStyle = FUR2; circle(ctx, hx + sd * hr * 0.88, hy - hr * 0.6, hr * 0.32); ctx.fillStyle = FUR; circle(ctx, hx + sd * hr * 0.88, hy - hr * 0.6, hr * 0.2); }
    ctx.fillStyle = FUR; ell(ctx, hx, hy + hr * 0.25, hr * 0.95, hr * 0.7);
    ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(hx, hy, hr * 1.02, PI * 1.02, PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SUIT.red; ctx.fillRect(hx - hr * 0.12, hy - hr, hr * 0.24, hr * 0.98);
    ctx.fillStyle = '#1b1f2a'; ctx.fillRect(hx - hr, hy + hr * 0.02, hr * 2, hr * 0.2);
    ctx.restore();
  }

  ZS.olympFig = { bearFan, bears, spruce, person, crowd, flag, banner, sign, cannon, ratrak, kid, instructor, fallen, booth, stall, startHut, arch, board, pylon, lamp, judgeTower, bar, thing, skierBack, skierSide, sledBack, goggles, text, poly, line, FUR, FUR2, MUZ, SUIT, JACKETS, HATS };
})();
