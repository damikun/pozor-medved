(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, hypot = Math.hypot, atan2 = Math.atan2, exp = Math.exp;
  const { clamp, lerp, frac, hash } = ZS.util;
  const { circle, ellipse: ell } = ZS.gfx;

  function poly(ctx, p) {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function blob(ctx, p) {
    const n = p.length / 2, g = (i, k) => p[((i + n) % n) * 2 + k];
    ctx.beginPath(); ctx.moveTo(g(0, 0), g(0, 1));
    for (let i = 0; i < n; i++) {
      const x0 = g(i - 1, 0), y0 = g(i - 1, 1), x1 = g(i, 0), y1 = g(i, 1), x2 = g(i + 1, 0), y2 = g(i + 1, 1), x3 = g(i + 2, 0), y3 = g(i + 2, 1);
      ctx.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
    }
    ctx.closePath(); ctx.fill();
  }
  function limb(ctx, ax, ay, bx, by, wa, wb, col) {
    const dx = bx - ax, dy = by - ay, d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
    ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
    ctx.closePath(); ctx.fill();
    circle(ctx, ax, ay, wa / 2); circle(ctx, bx, by, wb / 2);
  }
  const IK = { mx: 0, my: 0, ex: 0, ey: 0 };
  function ik(x0, y0, tx, ty, l1, l2, bend) {
    let dx = tx - x0, dy = ty - y0, d = hypot(dx, dy);
    const max = l1 + l2 - 0.05, min = abs(l1 - l2) + 0.3;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { if (d < 0.001) { dx = 0; dy = min; } else { dx *= min / d; dy *= min / d; } d = min; }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), t = atan2(dy, dx) - bend * a;
    IK.mx = x0 + cos(t) * l1; IK.my = y0 + sin(t) * l1; IK.ex = x0 + dx; IK.ey = y0 + dy;
  }

  const C = {
    coat: '#4a3c32', shade: '#382d26', dark: '#271f1a', hi: '#66554a', grizzle: '#8f7b66', belly: '#3f332b',
    leg: '#3a2f28', far: '#2a221d', hoof: '#17120f', snout: '#5a4842', disc: '#7d6259', nostril: '#2a1c18',
    tusk: '#efe5cf', tuskSh: '#c9bba0', ear: '#3c3029', earIn: '#6d5448', eye: '#120d0a',
  };
  const BODY = [-29, -23, -28, -31, -21, -36.5, -9, -38.5, 3, -42, 12, -43.5, 19.5, -39, 22, -29, 18, -19, 7, -14.5, -8, -14, -20, -15, -27, -17.5];
  const BACK = [-26, -33, -21, -36.2, -14, -37.8, -8, -38.5, -2, -40, 3, -41.8, 8, -43, 12, -43.6, 16, -42.4, 19, -39.6];
  const HEAD = [-6, -9.5, 5, -11, 14, -8.6, 24, -5.2, 31.5, -3.8, 33.6, -2.4, 33.8, 2.4, 31.5, 3.6, 24, 5.4, 12, 8.8, 0, 10, -7, 4];
  const LEGS = [[-18, -18, 0, 0, 0.5], [11, -18, 1, 0, 0], [-18, -18, 0, 1, 0], [11, -18, 1, 1, 0.5]];
  const fx = [0, 0, 0, 0], fy = [0, 0, 0, 0];
  const mem = new WeakMap();

  function track(o, time) {
    let st = mem.get(o);
    if (!st) { st = { x: o.x, t: time, phase: 0, v: 0, face: o.dir < 0 ? -1 : 1 }; mem.set(o, st); }
    const dt = time - st.t;
    if (!(dt >= 0 && dt < 0.3) || abs(o.x - st.x) > 120) { st.phase = 0; st.v = 0; st.face = o.dir < 0 ? -1 : 1; }
    else if (dt > 1e-4) {
      const dx = o.x - st.x, run = o.state === 'flee';
      st.phase += abs(dx) / (run ? 62 : 24);
      st.v += (abs(dx) / dt - st.v) * Math.min(1, dt * 10);
      st.face += ((o.dir < 0 ? -1 : 1) - st.face) * (1 - exp(-dt * (run ? 20 : 8)));
    }
    st.x = o.x; st.t = time;
    return st;
  }

  function bristles(ctx, up, time, sd) {
    const n = BACK.length / 2;
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    for (let i = 0; i < n - 1; i++) {
      const x0 = BACK[i * 2], y0 = BACK[i * 2 + 1], x1 = BACK[i * 2 + 2], y1 = BACK[i * 2 + 3];
      for (let j = 0; j < 3; j++) {
        const u = j / 3, x = lerp(x0, x1, u), y = lerp(y0, y1, u), k = i + u, ridge = sin(PI * clamp((k + 1) / n, 0, 1));
        const len = (2.6 + 2.2 * ridge + 1.4 * hash(sd + k * 7.3)) * (1 + up * (0.9 + 0.5 * ridge)), tilt = -0.55 + 0.35 * up + 0.12 * sin(time * 3 + k);
        ctx.moveTo(x - 1.3, y + 1); ctx.lineTo(x + sin(tilt) * len, y - cos(tilt) * len); ctx.lineTo(x + 1.3, y + 1);
      }
    }
    ctx.fill();
    ctx.strokeStyle = C.grizzle; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < n - 1; i += 1) {
      const x = BACK[i * 2], y = BACK[i * 2 + 1], len = (2.4 + 1.6 * hash(sd + i)) * (1 + up * 0.8);
      ctx.moveTo(x + 0.6, y - len * 0.55); ctx.lineTo(x + 0.6 + (up - 0.5) * 1.2, y - len * 0.95);
    }
    ctx.stroke();
  }

  function coat(ctx, sd) {
    ctx.strokeStyle = 'rgba(150,128,104,0.45)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const x = -24 + hash(sd + i * 3.1) * 42, y = -36 + hash(sd + i * 5.7) * 18 + (x > 4 ? -3 : 0);
      ctx.moveTo(x, y); ctx.lineTo(x - 2.4, y + 2.2);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,14,10,0.35)';
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const x = -22 + hash(sd + i * 9.3) * 38, y = -28 + hash(sd + i * 4.1) * 12;
      ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 2.6);
    }
    ctx.stroke();
  }

  function head(ctx, hx, hy, ang, open, blink, ear, sd) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.save(); ctx.translate(3, -8); ctx.rotate(-0.5 + ear * 0.5);
    ctx.fillStyle = C.far; poly(ctx, [-3, 1, 0, -9, 3.4, 0.6]);
    ctx.restore();
    ctx.fillStyle = C.shade; blob(ctx, HEAD);
    ctx.fillStyle = C.coat; ctx.save(); ctx.translate(0, -0.8); ctx.scale(1, 0.86); blob(ctx, HEAD); ctx.restore();
    ctx.fillStyle = C.hi; ell(ctx, 9, -7, 8, 1.6, 0.14);
    ctx.fillStyle = C.snout; poly(ctx, [21, -5, 31.5, -3.8, 33.6, -2.4, 33.8, 2.4, 31.5, 3.6, 22, 5.2 + open]);
    if (open > 0.2) { ctx.fillStyle = '#5b2e2a'; poly(ctx, [16, 4.6, 27, 4, 25, 4.8 + open, 16, 5.8 + open * 0.5]); }
    ctx.fillStyle = C.shade; poly(ctx, [10, 6.8, 25, 4.8 + open, 24, 6.8 + open, 11, 9]);
    ctx.fillStyle = C.disc; ell(ctx, 33.6, 0, 1.8, 3.4);
    ctx.fillStyle = C.nostril; ell(ctx, 34, -1.2, 0.55, 0.85); ell(ctx, 34, 1.2, 0.55, 0.85);
    ctx.fillStyle = C.tuskSh;
    ctx.beginPath(); ctx.moveTo(24.5, 4); ctx.quadraticCurveTo(27.8, 1.6, 25.6, -2.6); ctx.quadraticCurveTo(26, 1.2, 23.2, 3.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.tusk;
    ctx.beginPath(); ctx.moveTo(24.2, 3.8); ctx.quadraticCurveTo(26.9, 1.6, 25.4, -2.2); ctx.quadraticCurveTo(25.2, 1.4, 23.4, 3.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,128,104,0.5)'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const x = 2 + i * 2.6, y = -7 + hash(sd + i) * 2; ctx.moveTo(x, y); ctx.lineTo(x - 1.6, y + 1.4); }
    ctx.moveTo(-2, 5); ctx.lineTo(-5, 8.4); ctx.moveTo(1, 7); ctx.lineTo(-1.4, 10); ctx.moveTo(4, 8); ctx.lineTo(2.4, 10.6);
    ctx.stroke();
    if (blink) { ctx.fillStyle = C.eye; ctx.fillRect(10.4, -4.4, 3, 0.8); }
    else { ctx.fillStyle = '#2e241e'; ell(ctx, 12, -4, 1.9, 1.5, 0.2); ctx.fillStyle = C.eye; circle(ctx, 12.2, -4, 1.15); ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(ctx, 12.6, -4.5, 0.45); }
    ctx.save(); ctx.translate(0, -8.6); ctx.rotate(-0.25 + ear);
    ctx.fillStyle = C.ear; poly(ctx, [-3.6, 1.4, -0.4, -10, 3.8, 0.8]);
    ctx.fillStyle = C.earIn; poly(ctx, [-1.6, 0.4, -0.3, -6.8, 1.8, 0]);
    ctx.fillStyle = C.dark; poly(ctx, [-1.4, -8, -0.4, -12.4, 0.8, -8.2]);
    ctx.restore();
    ctx.restore();
  }

  function clods(ctx, x, y, k, time, sd) {
    if (k < 0.05) return;
    for (let i = 0; i < 5; i++) {
      const u = frac(time * 1.3 + hash(sd + i * 3.3)), h = hash(sd + i * 7.1);
      if (u > 0.6) continue;
      const v = u / 0.6;
      ctx.fillStyle = 'rgba(' + (i % 2 ? '92,66,42' : '120,88,58') + ',' + (k * (1 - v)).toFixed(3) + ')';
      circle(ctx, x - v * (8 + h * 12), y - sin(PI * v) * (7 + h * 8), 0.9 + h * 0.9);
    }
  }

  function draw(ctx, o, g) {
    if (!o || o.state === 'gone') return;
    const time = g.time, st = track(o, time), sd = 3.17;
    const run = o.state === 'flee', moving = o.state === 'walk' || o.state === 'back' || run;
    const amt = clamp(st.v / 18, 0, 1), rootK = o.state === 'root' ? 1 : 0;
    const since = time - o.scaredAt, jolt = since >= 0 && since < 0.35 ? sin(PI * since / 0.35) : 0;
    const up = clamp(run ? 1 : since >= 0 && since < 3 ? 1 - since / 3 : 0, 0, 1);
    const gr = time - o.gruntAt, grunt = gr >= 0 && gr < 0.6 ? sin(PI * gr / 0.6) : 0;
    const p = frac(st.phase), bob = run ? abs(sin(PI * p)) * 5 : amt * abs(sin(TAU * p)) * 0.8;
    const pitch = run ? -0.07 * sin(TAU * p) : 0.05 * rootK;
    const chew = rootK * Math.pow(Math.max(0, sin(time * 7 + sd)), 2);
    const nod = rootK * (0.5 + 0.5 * sin(time * 1.6 + sd * 2));
    const sc = Math.sign(st.face) || 1, fs = 0.2 + 0.8 * Math.min(1, abs(st.face));
    const dy = -bob - jolt * 7;
    ctx.save();
    ctx.translate(o.x, GY + 1);
    ctx.scale(sc * fs * 1.05, 1.05);
    ctx.fillStyle = 'rgba(40,28,18,' + (0.22 * (1 - clamp(-dy / 12, 0, 0.6))).toFixed(3) + ')'; ell(ctx, 0, 0, 26, 3);
    const stride = run ? 13 : 5.5, lift = run ? 9 : 3.4;
    for (let i = 0; i < 4; i++) {
      const L = LEGS[i], ph = st.phase + L[4] + (run ? (L[2] ? 0.12 : 0) : 0), w = TAU * ph;
      const sx = moving ? cos(w) * stride * amt : (L[2] ? 1.5 : -1) * (1 - rootK * 0.4), sy = moving ? Math.max(0, sin(w)) * lift * amt : 0;
      fx[i] = L[0] + sx + (rootK && L[2] ? 3 : 0); fy[i] = -sy;
    }
    const leg = (i) => {
      const L = LEGS[i], front = L[2], far = !L[3];
      const rx = L[0] * cos(pitch) - L[1] * sin(pitch), ry = L[0] * sin(pitch) + L[1] * cos(pitch) + dy;
      ik(rx, ry, fx[i] + (far ? 1.5 : 0), fy[i] - 0.4, front ? 9.2 : 10, front ? 9.6 : 9.4, front ? 1 : -1);
      const col = far ? C.far : C.leg;
      limb(ctx, rx, ry, IK.mx, IK.my, front ? 8 : 9.4, 4.2, col);
      limb(ctx, IK.mx, IK.my, IK.ex, IK.ey, 3.8, 2.8, col);
      ctx.save(); ctx.translate(IK.ex, IK.ey); ctx.rotate(atan2(IK.ey - IK.my, IK.ex - IK.mx) - PI / 2);
      ctx.fillStyle = C.hoof; poly(ctx, [-1.5, -1.4, 1.6, -1.4, 2.8, 1.5, -1.4, 1.7]);
      ctx.restore();
    };
    leg(0); leg(1);
    ctx.save();
    ctx.translate(0, dy); ctx.rotate(pitch);
    const tw = run ? -1.25 + 0.2 * sin(time * 18) : 0.15 + 0.35 * sin(time * 2.3 + sd) * (0.4 + grunt), tl = run ? 13 : 11;
    ctx.save(); ctx.translate(-27.5, -28); ctx.rotate(PI / 2 + 0.5 + tw);
    ctx.strokeStyle = C.dark; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(tl * 0.5, 1.4, tl, 0); ctx.stroke();
    ctx.fillStyle = C.dark; poly(ctx, [tl - 1, -1.2, tl + 4.2, -2.2, tl + 4.6, 1.8, tl - 1, 1.2]);
    ctx.restore();
    ctx.fillStyle = C.shade; blob(ctx, BODY);
    ctx.fillStyle = C.coat; ctx.save(); ctx.translate(-0.6, -1.6); ctx.scale(0.97, 0.92); blob(ctx, BODY); ctx.restore();
    ctx.fillStyle = C.hi; ell(ctx, 6, -37, 12, 3.4, -0.12);
    ctx.fillStyle = 'rgba(102,85,74,0.6)'; ell(ctx, -14, -33.4, 10, 2.4, 0.06);
    ctx.fillStyle = C.belly; ell(ctx, -4, -16.6, 17, 2.8, 0.02);
    ctx.fillStyle = 'rgba(39,31,26,0.5)'; ell(ctx, 13, -25, 6, 9, -0.2);
    coat(ctx, sd);
    bristles(ctx, up, time, sd);
    const ha = run ? 0.32 + 0.06 * sin(TAU * p) : lerp(0.6, 1.05, rootK * (0.8 + 0.2 * nod)) - grunt * 0.32 - jolt * 0.4 + chew * 0.06;
    const hx = 17.5, hy = -33 + rootK * 3 + chew * 0.8;
    limb(ctx, 12, -31, hx + 2, hy + 1, 15, 12, C.coat);
    head(ctx, hx, hy, ha, grunt * 1.8 + chew * 0.7, frac(time / 3.9 + 0.3) < 0.03, up * -0.35 + 0.1 * sin(time * 2.1 + sd), sd);
    const snx = hx + cos(ha) * 34, sny = hy + sin(ha) * 34;
    clods(ctx, snx, Math.min(sny, -1) + 1, rootK * clamp((ha - 0.85) / 0.2, 0, 1), time, sd);
    ctx.restore();
    leg(2); leg(3);
    if (run || since < 0.8) {
      ctx.fillStyle = 'rgba(150,120,86,0.4)';
      for (let i = 0; i < 4; i++) {
        const u = frac(time * 2.6 + i / 4);
        circle(ctx, -24 - u * 22, -2 - u * 6 - i, (1.6 + u * 3.6) * (run ? 1 : 1 - since / 0.8));
      }
    }
    ctx.restore();
  }

  ZS.boarArt = { draw };
})();
