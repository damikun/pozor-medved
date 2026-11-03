(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, hypot = Math.hypot;
  const { clamp, sstep, frac, hash, hash2 } = ZS.util;
  const { circle, ellipse: ell, rrect: rr, text } = ZS.gfx;

  function trace(ctx, p) {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath();
  }
  function poly(ctx, p) { trace(ctx, p); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  const shades = {};
  function dk(hex, k) {
    const key = hex + k;
    let v = shades[key];
    if (!v) {
      const n = parseInt(hex.slice(1), 16), c = (s) => Math.min(255, Math.round(((n >> s) & 255) * k));
      v = shades[key] = 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
    }
    return v;
  }
  function viewRange(ctx, pad) {
    const m = ctx.getTransform ? ctx.getTransform() : null;
    if (!m || !m.a) return [-1e9, 1e9];
    return [-m.e / m.a - pad, (ctx.canvas.width - m.e) / m.a + pad];
  }

  const tileCache = new Map();
  function tiles(key, pts, rowH, tw, skew, seed) {
    let t = tileCache.get(key);
    if (t) return t;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
    }
    t = { tone: [new Path2D(), new Path2D(), new Path2D(), new Path2D()], edge: new Path2D(), lite: new Path2D(), box: [x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2] };
    const rows = Math.ceil((y1 - y0) / rowH);
    for (let r = 0; r < rows; r++) {
      const yb = y1 - r * rowH, shift = (y1 - yb) * skew + (r % 2) * tw * 0.5;
      const n0 = Math.floor((x0 - shift) / tw) - 1, n1 = Math.ceil((x1 - shift) / tw);
      for (let i = n0; i <= n1; i++) {
        const sx = i * tw + shift, sh = hash2(r + seed, i);
        t.tone[Math.floor(sh * 4)].rect(sx, yb - rowH, tw, rowH);
        t.edge.rect(sx, yb - 1.3, tw, 1.3);
        t.edge.rect(sx, yb - rowH, 0.8, rowH - 1.3);
        if (sh > 0.5) t.lite.rect(sx + 1.4, yb - rowH + 0.5, tw - 2.6, 0.9);
      }
    }
    tileCache.set(key, t);
    return t;
  }

  const ROOF = ['#7a6c5e', '#6d6053', '#877868', '#63574c'];
  function shingle(ctx, pts, t, k, shade) {
    ctx.save();
    trace(ctx, pts); ctx.clip();
    ctx.fillStyle = dk('#5b5047', k); ctx.fillRect(t.box[0], t.box[1], t.box[2], t.box[3]);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = dk(ROOF[i], k); ctx.fill(t.tone[i]); }
    ctx.fillStyle = 'rgba(30,20,12,0.36)'; ctx.fill(t.edge);
    ctx.fillStyle = 'rgba(255,240,214,0.1)'; ctx.fill(t.lite);
    if (shade) { ctx.fillStyle = 'rgba(24,16,8,' + shade + ')'; ctx.fillRect(t.box[0], t.box[1], t.box[2], t.box[3]); }
    ctx.restore();
  }

  function smoke(ctx, x, y, time, seed, k) {
    for (let i = 0; i < 7; i++) {
      const u = frac(time * 0.14 + i / 7);
      const a = 0.46 * sstep(0, 0.12, u) * (1 - sstep(0.45, 1, u));
      ctx.fillStyle = 'rgba(232,232,228,' + a.toFixed(3) + ')';
      circle(ctx, x + (sin(u * 6.6 + seed) * 5 + u * 22) * k, y - u * 74 * k, (3 + u * 9) * k);
    }
  }

  const LOGS = ['#3f2c1f', '#48321f', '#3a291c', '#4c3624'];
  const WALL = -74, BASE = -8, ROWS = 7, PITCH = 1.45, OVER = 11;

  function logWall(ctx, x0, w, k, seed) {
    const rh = (BASE - WALL) / ROWS;
    ctx.fillStyle = dk('#e8e0cf', k); ctx.fillRect(x0, WALL, w, BASE - WALL);
    for (let i = 0; i < ROWS; i++) {
      const y = BASE - (i + 1) * rh;
      ctx.fillStyle = dk(LOGS[(i + seed) % 4], k); rr(ctx, x0 - 0.5, y + 1.15, w + 1, rh - 2.3, (rh - 2.3) / 2);
      ctx.fillStyle = 'rgba(255,226,186,0.1)'; ctx.fillRect(x0 + 2, y + 1.9, w - 4, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fillRect(x0 + 2, y + rh - 3.1, w - 4, 1.4);
    }
  }

  function logEnds(ctx, x, k, side) {
    const rh = (BASE - WALL) / ROWS;
    for (let i = 0; i < ROWS; i++) {
      const y = BASE - (i + 0.5) * rh, o = (i % 2) * 1.5 * side;
      ctx.fillStyle = dk('#94704b', k); ell(ctx, x + o, y, 3.3, rh / 2 - 0.5);
      ctx.fillStyle = dk('#6d5035', k); ell(ctx, x + o + 0.5 * side, y, 1.5, rh / 4);
    }
  }

  function windowPane(ctx, cx, top, w, h, k) {
    const x = cx - w / 2;
    ctx.fillStyle = dk('#ece4d4', k); ctx.fillRect(x - 4.5, top - 4.5, w + 9, h + 9);
    ctx.fillStyle = dk('#faf7f0', k); ctx.fillRect(x - 1.8, top - 1.8, w + 3.6, h + 3.6);
    ctx.fillStyle = dk('#3c5266', k); ctx.fillRect(x, top, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; poly(ctx, [x, top + h * 0.55, x + w * 0.45, top, x + w * 0.72, top, x, top + h * 0.95]);
    ctx.fillStyle = 'rgba(252,249,240,0.72)';
    poly(ctx, [x, top, x + w * 0.42, top, x, top + h * 0.62]); poly(ctx, [x + w, top, x + w * 0.58, top, x + w, top + h * 0.62]);
    ctx.fillStyle = dk('#faf7f0', k); ctx.fillRect(cx - 0.7, top, 1.4, h); ctx.fillRect(x, top + h * 0.42, w, 1.4);
    ctx.fillStyle = dk('#5e412a', k); ctx.fillRect(x - 5, top + h + 3.4, w + 10, 2.4);
    ctx.fillStyle = dk('#7a5534', k); ctx.fillRect(x - 3, top + h + 5.8, w + 6, 4.4);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - 3, top + h + 8.8, w + 6, 1.4);
    ctx.fillStyle = dk('#3f7a38', k);
    for (let i = 0; i < 5; i++) circle(ctx, x - 1 + i * (w + 2) / 4, top + h + 5.2 - (i % 2), 2.3);
    ctx.fillStyle = dk('#d6372c', k);
    for (let i = 0; i < 4; i++) circle(ctx, x + 0.8 + i * (w - 1.6) / 3, top + h + 3.2 - ((i + 1) % 2) * 1.2, 1.6);
  }

  function guard(ctx, x, y, f, look) {
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = '#34463a'; rr(ctx, -7.4, 5.2, 14.8, 18, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(1.5, 6, 5.6, 16);
    ctx.fillStyle = '#c9a64a'; circle(ctx, 3.8, 10.4, 1.1);
    ctx.fillStyle = '#d4a882'; ctx.fillRect(-2.2, 2.4, 4.4, 4);
    ctx.fillStyle = '#ece6d8'; poly(ctx, [-3, 5.2, 3, 5.2, 0, 8.6]);
    ctx.fillStyle = '#efc4a0'; circle(ctx, 0, 0, 5.4);
    ctx.fillStyle = '#d4a882'; circle(ctx, -1.8, 0.8, 1.5);
    ctx.fillStyle = '#efc4a0'; circle(ctx, 5.1, 0.7, 1.5);
    ctx.fillStyle = '#8f877b'; ell(ctx, 3.4, 2.7, 2.6, 1.05);
    if (look === 2) {
      ctx.fillStyle = '#efc4a0'; circle(ctx, 6.4, 4.4, 1.7);
      ctx.fillStyle = '#1e2124'; rr(ctx, 3.6, -2.7, 5.4, 3.6, 1.2);
      ctx.fillStyle = '#2d3135'; circle(ctx, 9.2, -0.9, 1.9);
      ctx.fillStyle = 'rgba(170,210,255,0.7)'; circle(ctx, 9.6, -1.4, 0.6);
    } else if (look === 1) {
      ctx.fillStyle = '#fff'; circle(ctx, 2.9, -0.9, 1.4);
      ctx.fillStyle = '#2a1d12'; circle(ctx, 3.3, -0.8, 0.7);
    } else {
      ctx.fillStyle = '#2a1d12'; circle(ctx, 2.9, -0.8, 0.7);
    }
    ctx.fillStyle = '#2c3f31'; rr(ctx, -5.6, -8.8, 11.2, 5, 2); ell(ctx, -0.3, -8.4, 6, 2.1);
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(-5.6, -4.9, 11.2, 0.9); circle(ctx, 0.8, -6.6, 0.9);
    ctx.fillStyle = '#18221b'; ell(ctx, 4.7, -3.9, 3.4, 1, 0.12);
    ctx.restore();
  }

  function door(ctx, cx, k, open, who) {
    const w = 17, top = -57, x = cx - w / 2;
    ctx.fillStyle = dk('#ece4d4', k); ctx.fillRect(x - 3.6, top - 3.6, w + 7.2, BASE - top + 3.6);
    ctx.fillStyle = dk('#2f2016', k); ctx.fillRect(x - 1.6, top - 1.6, w + 3.2, BASE - top + 1.6);
    if (open < 0.02) {
      ctx.fillStyle = dk('#5d4029', k); ctx.fillRect(x, top, w, BASE - top);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 1; i < 3; i++) ctx.fillRect(x + (i * w) / 3 - 0.5, top, 1, BASE - top);
      ctx.fillStyle = dk('#74523a', k); ctx.fillRect(x, top + 6, w, 3); ctx.fillRect(x, BASE - 10, w, 3);
      poly(ctx, [x, BASE - 10, x + w, top + 9, x + w, top + 12.5, x + 3.2, BASE - 10]);
      ctx.fillStyle = '#2b2b2b'; circle(ctx, x + w - 3, top + 25, 1.1);
    } else {
      ctx.fillStyle = '#1b120b'; ctx.fillRect(x, top, w, BASE - top);
      ctx.fillStyle = 'rgba(255,200,130,0.08)'; ctx.fillRect(x, top, w, BASE - top);
      if (who) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, top, w, BASE - top); ctx.clip();
        who();
        ctx.restore();
      }
      const ang = 1.25 * open, pw = w * cos(ang), p = sin(ang) * 3.2;
      ctx.fillStyle = dk('#4f3622', k); poly(ctx, [x, top, x + pw, top - p, x + pw, BASE + p * 0.3, x, BASE]);
      ctx.fillStyle = 'rgba(255,230,190,0.08)'; poly(ctx, [x, top, x + pw * 0.3, top - p * 0.3, x + pw * 0.3, BASE, x, BASE]);
    }
    ctx.fillStyle = dk('#4a3424', k); ctx.fillRect(x - 4, top - 5.4, w + 8, 3.4);
  }

  function sunCarving(ctx, x, y, r, k) {
    ctx.fillStyle = dk('#dcc59c', k); circle(ctx, x, y, r);
    ctx.fillStyle = dk('#86674a', k); circle(ctx, x, y, r * 0.74);
    ctx.fillStyle = dk('#dcc59c', k);
    for (let i = 0; i < 8; i++) { const a = (i * PI) / 4; ell(ctx, x + cos(a) * r * 0.42, y + sin(a) * r * 0.42, r * 0.3, r * 0.11, a); }
    ctx.fillStyle = dk('#5f4329', k); circle(ctx, x, y, r * 0.17);
  }

  function horns(ctx, ax, ay, dx, dy, len, w, col) {
    const d = hypot(dx, dy) || 1, ux = (dx / d) * len, uy = (dy / d) * len;
    ctx.lineCap = 'round';
    line(ctx, ax - ux * 0.25, ay - uy * 0.25, ax + ux, ay + uy, w, col);
    line(ctx, ax + ux * 0.25, ay - uy * 0.25, ax - ux, ay + uy, w, col);
  }

  function house(ctx, h, time, bx) {
    const gw = h.gw, sw = h.sw, hw = gw / 2, f = h.flip ? -1 : 1;
    const ay = WALL - hw * PITCH, ey = WALL + OVER * PITCH, ex = hw + OVER;
    const kg = h.flip ? 0.86 : 1, ks = h.flip ? 1 : 0.84, kr = h.flip ? 1.04 : 0.94;
    const doorX = hw + 22, dw = h.x + f * doorX, d = abs(bx - dw);
    const peek = h.guard ? sstep(150, 235, d) : 0;
    ctx.save(); ctx.translate(h.x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.16)'; ell(ctx, f * (sw / 2), 1, hw + sw / 2 + 16, 4.6);
    ctx.scale(f, 1);
    ctx.fillStyle = '#8a857d'; ctx.fillRect(-hw - 2, BASE, gw + sw + 4, -BASE);
    ctx.fillStyle = '#6f6a63';
    for (let i = 0; i * 12 < gw + sw; i++) ctx.fillRect(-hw + 4 + i * 12 + (i % 2) * 3, BASE + 0.5, 1.2, -BASE - 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-hw - 2, BASE, gw + sw + 4, 1.6);
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; if (h.flip) ctx.fillRect(-hw - 2, BASE, gw + 2, -BASE); else ctx.fillRect(hw, BASE, sw + 2, -BASE);
    logWall(ctx, -hw, gw, kg, 0);
    logWall(ctx, hw, sw, ks, 1);
    windowPane(ctx, -gw * 0.25, -64, 13, 17, kg);
    windowPane(ctx, gw * 0.25, -64, 13, 17, kg);
    windowPane(ctx, hw + sw - 24, -64, 13, 17, ks);
    door(ctx, doorX, ks, peek, h.guard ? () => {
      const look = d > 330 ? 2 : 1;
      guard(ctx, doorX + 3, -45 + (1 - peek) * 18, (bx > dw ? 1 : -1) * f, look);
    } : null);
    if (h.braid) {
      const bxl = hw + sw - 50;
      line(ctx, bxl, ey + 2, bxl, ey + 24, 1, '#8a7a5a');
      for (let i = 0; i < 6; i++) {
        const yy = ey + 6 + i * 3.4, s = i % 2 ? 1 : -1;
        ctx.fillStyle = i % 3 === 2 ? '#c0392b' : '#efe6d2'; ell(ctx, bxl + s * 1.6, yy, 2.4, 2, s * 0.4);
      }
      ctx.fillStyle = '#c0392b'; poly(ctx, [bxl - 1.6, ey + 25, bxl + 1.6, ey + 25, bxl, ey + 31]);
    }
    logEnds(ctx, -hw - 0.5, kg, -1);
    logEnds(ctx, hw, 1, 1);
    logEnds(ctx, hw + sw + 0.5, ks, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.fillRect(hw, ey, sw + 2, 5);
    ctx.save();
    trace(ctx, [-hw, WALL, 0, ay, hw, WALL]); ctx.clip();
    ctx.fillStyle = dk('#88694a', kg); ctx.fillRect(-hw, ay, gw, WALL - ay);
    ctx.fillStyle = 'rgba(50,30,14,0.3)';
    for (let x = -hw + 5.2; x < hw; x += 5.4) ctx.fillRect(x, ay, 0.9, WALL - ay);
    ctx.fillStyle = 'rgba(255,236,200,0.07)'; ctx.fillRect(-hw, ay, hw, WALL - ay);
    ctx.restore();
    const oy = WALL + (ay - WALL) * (h.hip ? 0.4 : 0.46);
    sunCarving(ctx, 0, oy, 7, kg);
    ctx.fillStyle = dk('#2a1c12', kg); rr(ctx, -5.4, WALL - 17, 3, 8, 1.4); rr(ctx, 2.4, WALL - 17, 3, 8, 1.4);
    const pod = [-hw - 7, WALL + 5, hw + 7, WALL + 5, hw + 1.5, WALL - 6, -hw - 1.5, WALL - 6];
    shingle(ctx, pod, tiles('pod' + gw, pod, 5.5, 5, 0, 2), kg, 0);
    ctx.fillStyle = dk('#3d2d21', kg); ctx.fillRect(-hw - 7, WALL + 3.6, gw + 14, 1.8);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-hw, WALL + 5.4, gw, 3);
    const R = sw + 5, plane = [0, ay, R, ay, ex + R, ey, ex, ey];
    shingle(ctx, plane, tiles('roof' + gw + ',' + sw, plane, 7.6, 5.4, -ex / (ey - ay), 3), kr, h.flip ? 0 : 0.05);
    ctx.fillStyle = 'rgba(255,240,214,0.08)'; poly(ctx, [0, ay, R, ay, R + 6, ay + 9, 6, ay + 9]);
    ctx.fillStyle = dk('#3a2e25', kr); poly(ctx, [ex, ey, ex + R, ey, ex + R - 1.4, ey - 2.6, ex - 1.4, ey - 2.6]);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    line(ctx, R, ay, ex + R, ey, 3.2, dk('#3a2e25', kr));
    line(ctx, 0, ay - 0.5, R, ay - 0.5, 3.8, '#3d332b');
    line(ctx, 1, ay - 1.6, R - 1, ay - 1.6, 0.9, 'rgba(255,236,206,0.22)');
    if (h.smoke) {
      const cx = R * 0.58 + ex * 0.22, cy = ay + (ey - ay) * 0.22;
      ctx.fillStyle = '#3b332c'; ell(ctx, cx + 1, cy + 2.6, 8, 2.2);
      ctx.fillStyle = '#d9d2c4'; ctx.fillRect(cx - 5, cy - 22, 10, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(cx + 1.6, cy - 22, 3.4, 24);
      ctx.fillStyle = '#5a5049'; ctx.fillRect(cx - 6.5, cy - 25, 13, 3.6);
    }
    ctx.strokeStyle = dk('#3b2b20', 1); ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(-ex, ey); ctx.lineTo(0, ay); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,190,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-ex + 0.5, ey - 2); ctx.lineTo(0, ay - 2); ctx.stroke();
    if (h.hip) {
      const hh = 19, hx = hh / PITCH, hip = [0, ay - 1, -hx - 2.5, ay + hh + 1.5, hx + 2.5, ay + hh + 1.5];
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; poly(ctx, [-hx - 1, ay + hh + 1.5, hx + 1, ay + hh + 1.5, hx + 0.5, ay + hh + 4.5, -hx - 0.5, ay + hh + 4.5]);
      shingle(ctx, hip, tiles('hip' + gw, hip, 5, 4.6, 0, 5), kg, 0);
      ctx.fillStyle = dk('#3b2b20', 1); ctx.fillRect(-hx - 2.5, ay + hh + 0.6, 2 * hx + 5, 1.8);
      line(ctx, 0, ay - 1, -hx - 2.5, ay + hh + 1.5, 2.2, '#3b2b20'); line(ctx, 0, ay - 1, hx + 2.5, ay + hh + 1.5, 2.2, '#3b2b20');
    } else {
      horns(ctx, 0, ay, ex, ay - ey, 9, 2.6, '#3b2b20');
      horns(ctx, R, ay, ex, ay - ey, 6, 2, dk('#3b2b20', kr));
    }
    ctx.restore();
    if (h.smoke) {
      const cx = R * 0.58 + ex * 0.22, cy = ay + (ey - ay) * 0.22;
      smoke(ctx, h.x + f * cx, GY + cy - 26, time, h.x * 0.01, 0.9);
    }
  }

  function bell(ctx, time, sw, alarm) {
    ctx.save(); ctx.translate(0, -150); ctx.rotate(sw);
    ctx.fillStyle = '#3b2c20'; ctx.fillRect(-6, -3, 12, 3.4);
    ctx.fillStyle = '#d9a933'; poly(ctx, [-2.4, 0, 2.4, 0, 3.8, 9, 7.6, 19, -7.6, 19, -3.8, 9]);
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; poly(ctx, [-2.4, 0.6, -0.8, 0.6, -2.6, 18, -6, 18, -3, 9]);
    ctx.fillStyle = 'rgba(80,50,0,0.25)'; poly(ctx, [1.4, 0.6, 2.4, 0.6, 3.8, 9, 7.6, 19, 3.6, 19]);
    ctx.fillStyle = '#a77d1d'; ctx.fillRect(-7.8, 17.6, 15.6, 1.8);
    ctx.save(); ctx.translate(0, 4); ctx.rotate(-sw * (0.5 + 0.4 * alarm)); ctx.fillStyle = '#5a3d12'; ctx.fillRect(-0.5, 0, 1, 15); circle(ctx, 0, 16, 1.9); ctx.restore();
    ctx.restore();
  }

  let towerRoof = null;
  function towerGeo() {
    if (towerRoof) return towerRoof;
    const p = [], q = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c;
    for (let i = 0; i <= 8; i++) { const u = i / 8; p.push(q(-30, -12, -2, u), q(-150, -160, -207, u)); }
    for (let i = 8; i >= 0; i--) { const u = i / 8; p.push(-q(-30, -12, -2, u), q(-150, -160, -207, u)); }
    const skirt = [-30, -44, 30, -44, 20, -60, -20, -60];
    towerRoof = { roof: p, roofT: tiles('towerRoof', p, 6.2, 4.8, 0, 7), skirt, skirtT: tiles('towerSkirt', skirt, 5.6, 4.8, 0, 9) };
    return towerRoof;
  }

  function tower(ctx, x, time, bx) {
    const G = towerGeo(), alarm = 1 - sstep(170, 330, abs(bx - x));
    const sw = 0.05 * sin(time * 1.3) + 0.62 * alarm * sin(time * 5.4);
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.16)'; ell(ctx, 0, 1, 36, 3.6);
    ctx.fillStyle = '#8a857d'; ctx.fillRect(-24, -7, 48, 7);
    ctx.fillStyle = '#6f6a63'; for (let i = 0; i < 4; i++) ctx.fillRect(-20 + i * 12 + (i % 2) * 3, -6.5, 1.2, 6.5);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-24, -7, 48, 1.6);
    const body = [-19, -7, 19, -7, 15, -126, -15, -126];
    ctx.fillStyle = '#7b644f'; poly(ctx, body);
    ctx.save(); trace(ctx, body); ctx.clip();
    ctx.fillStyle = 'rgba(48,30,16,0.3)'; for (let bxp = -18; bxp < 19; bxp += 4.6) ctx.fillRect(bxp, -126, 0.9, 120);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; poly(ctx, [6, -7, 20, -7, 16, -126, 5, -126]);
    ctx.fillStyle = 'rgba(255,236,200,0.07)'; ctx.fillRect(-20, -126, 12, 120);
    ctx.restore();
    ctx.fillStyle = '#2f2016'; ctx.fillRect(-7, -33, 14, 26); ctx.beginPath(); ctx.arc(0, -33, 7, PI, 0); ctx.fill();
    ctx.fillStyle = '#5d4029'; ctx.fillRect(-5.6, -33, 11.2, 26); ctx.beginPath(); ctx.arc(0, -33, 5.6, PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-0.5, -38, 1, 31);
    ctx.fillStyle = '#2b2b2b'; circle(ctx, 2.6, -20, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-18, -44, 36, 3.2);
    shingle(ctx, G.skirt, G.skirtT, 1, 0);
    ctx.fillStyle = '#3b2f26'; ctx.fillRect(-30, -45.6, 60, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; poly(ctx, [0, -60, 20, -60, 30, -44, 0, -44]);
    ctx.fillStyle = '#2a1c12'; rr(ctx, -2.2, -100, 4.4, 13, 2);
    ctx.fillStyle = '#231a13'; ctx.fillRect(-15, -154, 30, 28);
    ctx.fillStyle = 'rgba(255,214,150,0.06)'; ctx.fillRect(-15, -154, 30, 28);
    bell(ctx, time, sw, alarm);
    ctx.fillStyle = '#5e4a38'; ctx.fillRect(-17, -156, 4, 31); ctx.fillRect(13, -156, 4, 31);
    poly(ctx, [-13, -154, -6, -154, -13, -147]); poly(ctx, [13, -154, 6, -154, 13, -147]);
    ctx.fillStyle = '#4b3a2c'; ctx.fillRect(-20, -128, 40, 4.6);
    ctx.fillStyle = '#6a5440'; ctx.fillRect(-17, -134.5, 34, 2.2);
    for (let i = -12; i <= 12; i += 6) ctx.fillRect(i - 0.9, -132.5, 1.8, 4.6);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-17, -154, 34, 3);
    shingle(ctx, G.roof, G.roofT, 1, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; poly(ctx, [0, -207, 2, -207, 12, -160, 30, -150, 0, -150]);
    ctx.fillStyle = 'rgba(255,236,206,0.07)'; poly(ctx, [-2, -207, 0, -207, 0, -150, -30, -150, -12, -160]);
    ctx.fillStyle = '#3a2f27'; ctx.fillRect(-31, -151.6, 62, 2.6);
    ctx.fillStyle = '#3b3b3b'; circle(ctx, 0, -208, 2.4);
    ctx.lineCap = 'round';
    line(ctx, 0, -209, 0, -224, 1.6, '#2f2f2f'); line(ctx, -4.4, -218.5, 4.4, -218.5, 1.6, '#2f2f2f');
    if (alarm > 0.04) {
      const u = frac((time * 5.4) / PI), a = alarm * (1 - u);
      for (let k = 0; k < 2; k++) {
        const rad = 24 + k * 8 + u * 12;
        for (const [a0, a1] of [[-0.55, 0.55], [PI - 0.55, PI + 0.55]]) {
          ctx.strokeStyle = 'rgba(50,50,60,' + (0.3 * a).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -140, rad, a0, a1); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -140, rad, a0, a1); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  let wellG = null;
  function well(ctx, x, time) {
    if (!wellG) { const roof = [-27, -82, 0, -104, 27, -82]; wellG = { roof, t: tiles('wellRoof', roof, 5.4, 4.8, 0, 11) }; }
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.16)'; ell(ctx, 0, 1, 26, 3);
    ctx.fillStyle = '#6a5340'; ctx.fillRect(-17.5, -84, 4.4, 84); ctx.fillRect(13.1, -84, 4.4, 84);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(15.3, -84, 2.2, 84);
    ctx.fillStyle = '#8a6a4a'; rr(ctx, -13.4, -64.5, 26.8, 7, 3.2);
    ctx.fillStyle = 'rgba(70,46,22,0.5)'; for (let i = 0; i < 6; i++) ctx.fillRect(-10 + i * 3.6, -64.5, 1, 7);
    ctx.lineCap = 'round';
    line(ctx, 17.5, -61, 22.5, -61, 1.8, '#4b4b4b'); line(ctx, 22.5, -61, 22.5, -53.5, 1.8, '#4b4b4b');
    ctx.fillStyle = '#6a5340'; rr(ctx, 21, -55, 3, 5, 1.2);
    ctx.save(); ctx.translate(-3, -58); ctx.rotate(0.06 * sin(time * 1.5) + 0.02 * sin(time * 3.1));
    line(ctx, 0, 0, 0, 18, 1, '#c8b48a');
    ctx.strokeStyle = '#3b3b3b'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 21.5, 4, PI * 1.08, PI * 1.92); ctx.stroke();
    ctx.fillStyle = '#6d5137'; poly(ctx, [-4.6, 19, 4.6, 19, 3.7, 27.5, -3.7, 27.5]);
    ctx.fillStyle = '#3b3b3b'; ctx.fillRect(-4.4, 20.4, 8.8, 1); ctx.fillRect(-3.9, 25.4, 7.8, 1);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const y = -8.6 * (i + 1);
      ctx.fillStyle = LOGS[i % 4]; rr(ctx, -19, y + 0.6, 38, 7.6, 3.8);
      ctx.fillStyle = 'rgba(255,226,186,0.1)'; ctx.fillRect(-16, y + 1.4, 32, 1.4);
      ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fillRect(-16, y + 5.8, 32, 1.4);
      for (const s of [-1, 1]) { ctx.fillStyle = '#94704b'; ell(ctx, s * (20 + (i % 2)), y + 4.4, 2.8, 3.6); ctx.fillStyle = '#6d5035'; ell(ctx, s * (20.3 + (i % 2)), y + 4.4, 1.3, 1.8); }
    }
    shingle(ctx, wellG.roof, wellG.t, 1, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; poly(ctx, [0, -104, 27, -82, 0, -82]);
    ctx.fillStyle = '#3b2f26'; ctx.fillRect(-28, -83, 56, 2.2);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3b2b20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-28.5, -81.5); ctx.lineTo(0, -104.5); ctx.lineTo(28.5, -81.5); ctx.stroke();
    horns(ctx, 0, -104.5, 28.5, -23, 6.5, 2.2, '#3b2b20');
    ctx.restore();
  }

  function fence(ctx, K, vr) {
    const segs = [[K.fence[0], K.gate - 61], [K.gate + 61, K.fence[1]]];
    ctx.save(); ctx.translate(0, GY);
    for (const [a, b] of segs) {
      const x0 = Math.max(a, vr[0]), x1 = Math.min(b, vr[1]);
      if (x1 <= x0) continue;
      ctx.fillStyle = 'rgba(30,24,12,0.13)'; ctx.fillRect(x0, -1.5, x1 - x0, 2.5);
      ctx.save(); ctx.beginPath(); ctx.rect(a, -33, b - a, 29); ctx.clip();
      const p = new Path2D(), q = new Path2D();
      for (let px = Math.floor((x0 - 30) / 13) * 13; px < x1 + 8; px += 13) { p.moveTo(px, -4); p.lineTo(px + 23, -33); q.moveTo(px - 0.9, -4.6); q.lineTo(px + 22.1, -33.6); }
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#5a4a3b'; ctx.lineWidth = 3.4; ctx.stroke(p);
      ctx.strokeStyle = '#86725d'; ctx.lineWidth = 2.4; ctx.stroke(p);
      ctx.strokeStyle = 'rgba(255,236,206,0.22)'; ctx.lineWidth = 0.8; ctx.stroke(q);
      ctx.restore();
      for (let sx = a + 4; sx <= b - 2; sx += 46) {
        if (sx < x0 - 8 || sx > x1 + 8) continue;
        for (const o of [-3.4, 1.2]) {
          ctx.fillStyle = '#5d4c3d'; ctx.fillRect(sx + o, -37, 2.6, 37);
          poly(ctx, [sx + o, -37, sx + o + 1.3, -40, sx + o + 2.6, -37]);
        }
        ctx.fillStyle = '#8a7a5a'; ctx.fillRect(sx - 4, -27, 8.4, 1.6); ctx.fillRect(sx - 4, -12, 8.4, 1.6);
      }
    }
    ctx.restore();
  }

  function gate(ctx, x, time) {
    const P = 56, N = ZS.LABELS.skanzen.name;
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.15)'; ell(ctx, 0, 1, 72, 3.6);
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -P + 4.5 : 0.8, x1 = s < 0 ? -0.8 : P - 4.5, n = 8, w = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        const cx = x0 + (i + 0.5) * w, u = abs(cx) / P, top = -58 - 10 * (1 - u * u);
        ctx.fillStyle = i % 2 ? '#86705a' : '#8f7962'; ctx.fillRect(cx - w / 2 + 0.5, top, w - 1, -4 - top);
        poly(ctx, [cx - w / 2 + 0.5, top, cx, top - 3.4, cx + w / 2 - 0.5, top]);
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(cx + w / 2 - 1.6, top, 1.1, -4 - top);
      }
      ctx.fillStyle = '#6a5441'; ctx.fillRect(x0, -22, x1 - x0, 4); ctx.fillRect(x0, -52, x1 - x0, 4);
      ctx.fillStyle = 'rgba(255,236,206,0.14)'; ctx.fillRect(x0, -22, x1 - x0, 1); ctx.fillRect(x0, -52, x1 - x0, 1);
      ctx.fillStyle = '#6a5441';
      if (s < 0) poly(ctx, [x0, -22, x0 + 4.5, -22, x1, -48, x1 - 4.5, -48]); else poly(ctx, [x1, -22, x1 - 4.5, -22, x0, -48, x0 + 4.5, -48]);
    }
    for (const s of [-1, 1]) {
      const px = s * P;
      ctx.fillStyle = '#5c4835'; ctx.fillRect(px - 4.5, -136, 9, 136);
      ctx.fillStyle = 'rgba(255,230,190,0.13)'; ctx.fillRect(px - 4.5, -136, 2.2, 136);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + 2, -136, 2.5, 136);
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(px - s * 5.5 - 1.5, -46, 3, 4); ctx.fillRect(px - s * 5.5 - 1.5, -16, 3, 4);
      ctx.fillStyle = '#5c4835'; poly(ctx, [px - s * 4.5, -104, px - s * 4.5, -97, px - s * 26, -126, px - s * 19, -126]);
      ctx.fillStyle = '#8a857d'; ctx.fillRect(px - 6.5, -5, 13, 5);
    }
    ctx.strokeStyle = '#8d959b'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9, cx = -13 + 26 * u, cy = -42 + 5 * 4 * u * (1 - u);
      ctx.beginPath(); ctx.ellipse(cx, cy, i % 2 ? 1.2 : 1.9, i % 2 ? 1.6 : 1.1, 0, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = '#8d959b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(6.8, -37, 3, PI, 0); ctx.stroke();
    ctx.fillStyle = '#c9a64a'; rr(ctx, 2.8, -37.4, 8, 7.4, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(3.6, -36.6, 6.4, 1.4);
    ctx.fillStyle = '#4a3410'; circle(ctx, 6.8, -33.8, 1.1); ctx.fillRect(6.3, -33.8, 1, 2.4);
    ctx.fillStyle = '#4f3d2e'; ctx.fillRect(-P - 9, -141, 2 * P + 18, 6);
    ctx.fillStyle = '#5a4331'; rr(ctx, -P + 3, -134, 2 * P - 6, 27, 2.6);
    ctx.fillStyle = '#c29760'; rr(ctx, -P + 5, -132, 2 * P - 10, 23, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-P + 6, -131, 2 * P - 12, 1.6);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-P + 5, -112, 2 * P - 10, 3);
    text(ctx, N[0], 0, -125.6, 7.4, '#3a2412', 800, 0.6, 2 * P - 18);
    text(ctx, N[1], 0, -116.2, 8.6, '#3a2412', 900, 0.4, 2 * P - 18);
    const roof = [-P - 17, -140, P + 17, -140, P + 4, -166, -P - 4, -166];
    shingle(ctx, roof, tiles('gateRoof', roof, 6.4, 5.2, 0, 13), 1, 0);
    ctx.fillStyle = 'rgba(255,236,206,0.08)'; poly(ctx, [-P - 4, -166, P + 4, -166, P + 8, -158, -P - 8, -158]);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-P - 14, -140, 2 * P + 28, 2.6);
    ctx.fillStyle = '#3b2f26'; ctx.fillRect(-P - 17, -141.6, 2 * P + 34, 2.2);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    line(ctx, -P - 4, -166, P + 4, -166, 3.6, '#3d332b');
    line(ctx, -P - 17, -140.5, -P - 4, -166, 2.6, '#3b2b20'); line(ctx, P + 17, -140.5, P + 4, -166, 2.6, '#3b2b20');
    for (const s of [-1, 1]) horns(ctx, s * (P + 4), -166, 6, -12, 6.5, 2.2, '#3b2b20');
    ctx.restore();
  }

  function notice(ctx, x) {
    const N = ZS.LABELS.skanzen.notice;
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.14)'; ell(ctx, 0, 1, 30, 2.4);
    ctx.fillStyle = '#5d4c3d'; ctx.fillRect(-25, -58, 3.4, 58); ctx.fillRect(21.6, -58, 3.4, 58);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-23.4, -58, 1.8, 58); ctx.fillRect(23.2, -58, 1.8, 58);
    ctx.save(); ctx.translate(0, -48); ctx.rotate(-0.025);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; rr(ctx, -31, -12, 63, 27, 2);
    ctx.fillStyle = '#6b4f36'; rr(ctx, -32, -14, 64, 27, 2);
    ctx.fillStyle = '#f5f1e6'; rr(ctx, -29.6, -11.6, 59.2, 22.2, 1.2);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-29.6, -11.6, 59.2, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; poly(ctx, [12, 10.6, 29.6, 10.6, 29.6, -2]);
    text(ctx, N[0], 0, -2.6, 7.6, '#1d1d1d', 800, 0, 54);
    text(ctx, N[1], 0, 5.6, 7.6, '#c0392b', 900, 0, 54);
    ctx.fillStyle = '#3a3a3a'; circle(ctx, -26.6, -6, 0.9); circle(ctx, 26.6, -6, 0.9);
    ctx.restore();
    ctx.restore();
  }

  function track(ctx, a, b, vr) {
    const x0 = Math.max(a, vr[0]), x1 = Math.min(b, vr[1]);
    if (x1 <= x0) return;
    ctx.save(); ctx.translate(0, GY);
    ctx.fillStyle = 'rgba(110,98,84,0.55)'; ctx.fillRect(x0, -2.4, x1 - x0, 3.4);
    for (let sx = Math.ceil((x0 - a) / 10) * 10 + a; sx < x1; sx += 10) { ctx.fillStyle = '#4e3b2a'; ctx.fillRect(sx, -3.2, 6.4, 3.2); ctx.fillStyle = 'rgba(255,230,190,0.12)'; ctx.fillRect(sx, -3.2, 6.4, 0.8); }
    ctx.fillStyle = '#6c7177'; ctx.fillRect(x0, -5.6, x1 - x0, 2.4);
    ctx.fillStyle = 'rgba(235,240,244,0.75)'; ctx.fillRect(x0, -5.6, x1 - x0, 0.7);
    if (b - 8 < vr[1] && b > vr[0]) {
      ctx.fillStyle = '#5c4835'; ctx.fillRect(b - 9, -15, 4, 15); poly(ctx, [b - 7, -12, b + 3, -1, b - 1, -1, b - 9, -8]);
      ctx.fillStyle = '#b8322a'; ctx.fillRect(b - 13, -17, 12, 6);
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(b - 10, -17, 3, 6);
    }
    ctx.restore();
  }

  function loco(ctx, x, time) {
    ctx.save(); ctx.translate(x, GY - 5.6);
    ctx.fillStyle = 'rgba(28,22,10,0.2)'; ell(ctx, 0, 4.5, 40, 2.6);
    ctx.fillStyle = '#26292c'; ctx.fillRect(-33, -16, 66, 6);
    ctx.fillStyle = '#b8322a'; ctx.fillRect(-36, -17, 4.4, 8); ctx.fillRect(31.6, -17, 4.4, 8);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-39, -14.6, 3, 2.6); ctx.fillRect(36, -14.6, 3, 2.6);
    ctx.fillStyle = '#35393d'; rr(ctx, 15, -14, 13, 7, 2.5);
    const wheels = [-17, -3, 11];
    for (const wx of wheels) {
      ctx.fillStyle = '#1e2022'; circle(ctx, wx, -6, 6.2);
      ctx.fillStyle = '#a8322a'; circle(ctx, wx, -6, 4.8);
      ctx.strokeStyle = '#6e1f18'; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let k = 0; k < 6; k++) { ctx.moveTo(wx, -6); ctx.lineTo(wx + cos(k * 1.047 + 0.3) * 4.6, -6 + sin(k * 1.047 + 0.3) * 4.6); }
      ctx.stroke();
      ctx.fillStyle = '#d9d6cf'; circle(ctx, wx, -6, 1.3);
    }
    ctx.lineCap = 'round';
    line(ctx, wheels[0] + 1.6, -8.4, wheels[2] + 1.6, -8.4, 2, '#b9bec4');
    line(ctx, wheels[2] + 1.6, -8.4, 21, -10.5, 1.8, '#9ca3a9');
    ctx.fillStyle = '#2f4a3a'; rr(ctx, -24, -33, 44, 17, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, -21, -31.6, 38, 3.2, 1.6);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-22, -20.5, 40, 3.4);
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(-12, -33, 1.6, 17); ctx.fillRect(4, -33, 1.6, 17);
    ctx.fillStyle = '#26292c'; rr(ctx, 15, -32, 12, 16.4, 4);
    ctx.fillStyle = '#3a3e42'; circle(ctx, 27.4, -24, 4.4);
    ctx.fillStyle = '#1e2022'; circle(ctx, 27.4, -24, 2.2);
    ctx.fillStyle = '#c9a64a'; ell(ctx, -3, -34.4, 4.6, 4); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -4.4, -36, 1.4, 1.6);
    ctx.fillStyle = '#26292c'; ctx.fillRect(18.6, -42, 5, 10);
    poly(ctx, [14.6, -53, 27.6, -53, 24, -42, 18.2, -42]);
    ctx.fillStyle = '#3a3e42'; ctx.fillRect(13.8, -55, 14.6, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(15.4, -52, 2, 9);
    ctx.fillStyle = '#c9a64a'; rr(ctx, 23, -40, 5, 4.4, 1.2); ctx.fillStyle = '#fff3bd'; circle(ctx, 28, -38, 1.5);
    ctx.fillStyle = '#2f4a3a'; ctx.fillRect(-34, -47, 18, 31);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-20, -47, 4, 31);
    ctx.fillStyle = '#1b1d1f'; rr(ctx, -31, -43, 11.6, 11, 1.6);
    ctx.fillStyle = 'rgba(170,205,230,0.35)'; poly(ctx, [-31, -36, -26, -43, -23, -43, -31, -33]);
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(-31, -27, 11.6, 4.4);
    ctx.fillStyle = '#26292c'; rr(ctx, -37, -51, 24, 4.6, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-36, -51, 22, 1);
    const u = frac(time / 7.3), a = u < 0.35 ? sstep(0, 0.06, u) * (1 - sstep(0.1, 0.35, u)) : 0;
    if (a > 0.01) {
      for (let i = 0; i < 3; i++) {
        const v = clamp(u / 0.35 - i * 0.12, 0, 1);
        ctx.fillStyle = 'rgba(240,242,244,' + (0.55 * a * (1 - v)).toFixed(3) + ')'; circle(ctx, 24 + v * 12 + i * 2, -8 - v * 10, 2.4 + v * 5);
      }
    }
    ctx.restore();
  }

  const hens = new WeakMap();
  function henMove(K, time, bx) {
    let s = hens.get(K);
    if (!s || !(time >= s.t - 1 && time <= s.t + 5)) { s = { x: K.hen, dir: -1, t: time, flee: false, tx: K.hen, moving: false, walk: 0 }; hens.set(K, s); }
    const dt = clamp(time - s.t, 0, 0.1), d = s.x - bx;
    s.t = time;
    if (abs(d) < 100) { s.tx = K.hen + (d < 0 ? -1 : 1) * 64; s.flee = true; }
    else if (s.flee && abs(s.x - s.tx) < 2) s.flee = false;
    if (!s.flee) s.tx = K.hen + (hash(Math.floor(time / 3.4) * 7.31 + 1) - 0.5) * 60;
    const v = s.flee ? 120 : 20, dx = s.tx - s.x;
    s.moving = abs(dx) > 1.2;
    if (s.moving) { s.dir = dx < 0 ? -1 : 1; const st = Math.min(abs(dx), v * dt); s.x += s.dir * st; s.walk += st; }
    return s;
  }

  function hen(ctx, s, time) {
    const run = s.moving, fl = s.flee && run, ph = s.walk * 0.55;
    const peck = run ? 0 : Math.pow(Math.max(0, sin(time * 4.6 + s.x * 0.05)), 3) * (frac(time * 0.23) < 0.62 ? 1 : 0);
    const hop = fl ? abs(sin(ph)) * 4 : 0;
    ctx.save(); ctx.translate(s.x, GY); ctx.scale(s.dir * 1.15, 1.15);
    ctx.fillStyle = 'rgba(28,22,10,0.2)'; ell(ctx, 0, 0.6, 8, 1.6);
    ctx.lineCap = 'round';
    for (const o of [0, PI]) {
      const a = run ? sin(ph + o) * 3.4 : 0;
      line(ctx, o ? -1 : 1, -6 - hop, (o ? -1 : 1) + a, -hop * 0.2, 1.3, '#d99b2b');
      line(ctx, (o ? -1 : 1) + a, -hop * 0.2, (o ? -1 : 1) + a + 2.2, -hop * 0.2, 1.1, '#d99b2b');
    }
    ctx.save(); ctx.translate(0, -10 - hop); ctx.rotate(peck * 0.5 + (fl ? -0.12 : 0));
    ctx.fillStyle = '#5a2e17'; poly(ctx, [-6, -1, -11.5, -9, -9.4, -2.6, -12, -6.4, -7.4, 1.6]);
    ctx.fillStyle = '#b5652f'; ell(ctx, 0, 0, 7.6, 5.4);
    ctx.fillStyle = '#c97a3e'; ell(ctx, 3, 1, 4, 3.6);
    const flap = fl ? sin(time * 30) : 0;
    ctx.fillStyle = '#8f4a22';
    ctx.save(); ctx.translate(-1, -0.6); ctx.rotate(-0.15 - flap * 0.7); ell(ctx, -1.8, 0, 5.2, 3, 0); ctx.restore();
    ctx.fillStyle = 'rgba(60,24,8,0.35)'; ctx.fillRect(-5, 1.6, 5, 0.7);
    const hx = 6.2 + peck * 1.8, hy = -5 - (fl ? 1 : 0) + peck * 9;
    ctx.fillStyle = '#b5652f'; ell(ctx, 4.8 + peck * 0.8, -2.4 + peck * 4, 2.6, 3.4, 0.5);
    circle(ctx, hx, hy, 2.9);
    ctx.fillStyle = '#d6372c'; circle(ctx, hx - 0.6, hy - 2.8, 1.1); circle(ctx, hx + 0.8, hy - 3, 1.1); circle(ctx, hx + 2, hy - 2.4, 0.9);
    ell(ctx, hx + 2, hy + 2.4, 0.9, 1.3);
    ctx.fillStyle = '#e8b23a'; poly(ctx, [hx + 2.4, hy - 0.8, hx + 5.2, hy + 0.2, hx + 2.4, hy + 1]);
    ctx.fillStyle = '#1d1d1d'; circle(ctx, hx + 0.9, hy - 0.6, 0.65);
    ctx.restore();
    ctx.restore();
  }

  function skanzen(ctx, K, g) {
    const time = g.time, bx = g.bear.x, vr = viewRange(ctx, 110);
    const seen = (a, b) => b > vr[0] && a < vr[1];
    for (const h of K.houses) {
      const l = h.flip ? h.x - h.gw / 2 - h.sw - 30 : h.x - h.gw / 2 - 30, r = h.flip ? h.x + h.gw / 2 + 30 : h.x + h.gw / 2 + h.sw + 60;
      if (seen(l, r)) house(ctx, h, time, bx);
    }
    if (seen(K.tower - 40, K.tower + 40)) tower(ctx, K.tower, time, bx);
    if (seen(K.well - 32, K.well + 32)) well(ctx, K.well, time);
    fence(ctx, K, vr);
    if (seen(K.gate - 76, K.gate + 76)) gate(ctx, K.gate, time);
    if (seen(K.notice - 34, K.notice + 34)) notice(ctx, K.notice);
    if (K.rail) {
      track(ctx, K.rail[0], K.rail[1], vr);
      if (seen(K.loco - 44, K.loco + 44)) loco(ctx, K.loco, time);
    }
    const s = henMove(K, time, bx);
    if (seen(s.x - 16, s.x + 16)) hen(ctx, s, time);
  }

  ZS.scenery.skanzen = skanzen;
})();
