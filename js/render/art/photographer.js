(function () {
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2, sin = Math.sin, cos = Math.cos;
  const { clamp, lerp, smooth, frac } = ZS.util;
  const { ellipse: ell, circle, rrect: rr } = ZS.gfx;

  const C = {
    jacket: '#6d7846', jacketD: '#58623a', pants: '#5b653b', pantsD: '#4a5330', boot: '#3b2d1e', sole: '#1e150c',
    skin: '#e7bf98', skinD: '#cf9f78', hair: '#5a4028', hat: '#737c4a', hatD: '#565f35', band: '#4a4f2c',
    body: '#26282c', bodyL: '#3c3f45', lens: '#7c8651', lensD: '#5f6a3c', hood: '#2b2d29', glass: '#1c2c38',
    bag: '#9c8657', bagD: '#7a6842', net: 'rgba(72,86,44,0.86)', mesh: 'rgba(30,38,18,0.38)', grass: '#4f8a35',
  };
  const SPOTS = [[-1, -9, 5, 3, 0.4, '#47532c'], [9, -12, 6, 2.6, -0.3, '#9a8c5c'], [16, -7, 4, 2.4, 0.6, '#47532c'], [4, -5, 3.6, 2, 0.1, '#5a4a30'], [21, -13, 3, 2, 0.2, '#9a8c5c']];
  const LENS_SPOTS = [[48, -20, 3.2, 1.8, '#5f6a3c'], [54, -15.5, 2.6, 1.6, '#9a8c5c'], [59, -20.5, 2.8, 1.5, '#47532c'], [63, -15, 2.4, 1.4, '#5f6a3c']];
  const LEAVES = ['#5f7b35', '#7d8b3f', '#4b6229', '#8c7b47', '#6b8a3a'];
  const NET = [[-39, 0], [-37, -6], [-31, -11], [-21, -14.5], [-10, -17], [0, -19.5], [9, -21.5], [17, -22], [22, -19.5], [23.5, -13], [25, -6], [23, 0]];
  const TUFTS = [[-33, -10, 0.5], [-24, -14, -0.4], [-15, -16.5, 0.9], [-6, -18.5, -0.2], [3, -20.6, 0.5], [11, -22, -0.7], [18, -22, 0.3], [-28, -6, 1.2], [-10, -9, -1], [8, -12, 0.8]];

  function bone(ctx, pts, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  }
  function star(ctx, x, y, r, a) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const q = i % 2 ? r * 0.28 : r, t = a + (i * PI) / 4; ctx.lineTo(x + cos(t) * q, y + sin(t) * q); }
    ctx.closePath(); ctx.fill();
  }

  function leg(ctx, far, kick) {
    const hy = far ? -7.5 : -6, kx = -21, ky = far ? -5 : -4, a = 1.3 * kick;
    const ax = kx - 17 * cos(a), ay = ky - 17 * sin(a);
    bone(ctx, [-1, hy, kx, ky], 8.6, far ? C.pantsD : C.pants);
    bone(ctx, [kx, ky, ax, ay], 7.4, far ? C.pantsD : C.pants);
    ctx.save();
    ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = far ? '#2e2317' : C.boot; rr(ctx, -6.5, -6, 7.5, 10, 2.6);
    ctx.fillStyle = C.sole; rr(ctx, -7.6, -5.6, 2.6, 9.4, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-4, -4.8, 3, 1);
    ctx.restore();
  }

  function torso(ctx, breath) {
    ctx.save();
    ctx.fillStyle = C.jacket;
    ctx.beginPath();
    ctx.moveTo(-8, -1);
    ctx.bezierCurveTo(-10, -9, -6, -15.5 - breath, 2, -15 - breath);
    ctx.bezierCurveTo(10, -17.5 - breath, 20, -19 - breath, 25, -14);
    ctx.bezierCurveTo(28, -10, 27, -3, 24, -1);
    ctx.closePath(); ctx.fill();
    ctx.clip();
    for (const s of SPOTS) { ctx.fillStyle = s[5]; ell(ctx, s[0], s[1], s[2], s[3], s[4]); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-12, -4, 42, 6);
    ctx.restore();
  }

  function arm(ctx, far, hand, press) {
    const sx = far ? 22 : 20.5, sy = far ? -13 : -11, ex = far ? 27 : 29.5, ey = far ? -2 : -1.5;
    bone(ctx, [sx, sy, ex, ey], 6.4, far ? C.jacketD : C.jacket);
    bone(ctx, [ex, ey, hand[0], hand[1] + press], 5.2, far ? C.jacketD : C.jacket);
    ctx.fillStyle = far ? C.skinD : C.skin; circle(ctx, hand[0] + 1.2, hand[1] + press - 0.4, 2.4);
    if (!far) { ctx.fillStyle = C.skin; ell(ctx, hand[0] + 2.6, hand[1] - 3 + press * 1.6, 1, 1.9, 0.3); }
  }

  function head(ctx, thrill, shoot, time) {
    const hx = 25, hy = -21.5;
    ctx.fillStyle = C.skinD; rr(ctx, 21, -19, 5, 6, 2);
    ctx.fillStyle = C.hair; ell(ctx, hx - 4, hy + 1.8, 3.2, 3.8);
    ctx.fillStyle = C.skin; circle(ctx, hx, hy, 6.3);
    ctx.fillStyle = 'rgba(70,48,30,0.28)'; ell(ctx, hx + 2.6, hy + 4.2, 3.6, 2, 0.2);
    ctx.fillStyle = C.skinD; ell(ctx, hx - 1.4, hy + 0.6, 1.6, 2.1);
    ctx.fillStyle = C.skin; circle(ctx, hx + 6.1, hy + 1.2, 1.7);
    ctx.fillStyle = '#7a3b32';
    if (thrill > 0.15) ell(ctx, hx + 4.6, hy + 4.2, 1.1, 0.6 + 1.1 * thrill * (0.7 + 0.3 * sin(time * 17)));
    else ctx.fillRect(hx + 3.4, hy + 3.9, 2.2, 0.7);
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx + 1.6, hy - 3.6 - 1.4 * thrill); ctx.lineTo(hx + 4.4, hy - 3.3 - 1.2 * thrill); ctx.stroke();
    ctx.save();
    ctx.translate(hx - 0.5, hy - 4.6); ctx.rotate(-0.06 + 0.04 * shoot);
    ctx.fillStyle = C.hatD; ell(ctx, 0.6, 1.8, 10.4, 2.3, 0.05);
    ctx.fillStyle = C.hat; ctx.beginPath(); ctx.ellipse(0, 0.4, 6.6, 5, 0, PI, TAU); ctx.fill();
    ctx.fillStyle = C.band; ctx.fillRect(-6.4, -0.2, 12.8, 1.5);
    ctx.fillStyle = '#9a8c5c'; ell(ctx, -2.4, -2.6, 2, 1.1, 0.3); ctx.fillStyle = '#47532c'; ell(ctx, 2.2, -3, 1.8, 1, -0.4);
    ctx.fillStyle = LEAVES[0]; ell(ctx, -5.6, -1.6, 3, 1.1, -0.9); ctx.fillStyle = LEAVES[2]; ell(ctx, -4, -3.8, 2.6, 1, -1.4);
    ctx.fillStyle = LEAVES[1]; ell(ctx, 4.8, -2.2, 2.4, 0.9, 0.8);
    ctx.restore();
  }

  function bag(ctx) {
    ctx.fillStyle = C.bag; ell(ctx, 52, -5, 10.5, 5.2);
    ctx.fillStyle = C.bagD; ell(ctx, 52, -2.6, 9.6, 2.4);
    ctx.strokeStyle = 'rgba(60,48,26,0.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(43, -6); ctx.quadraticCurveTo(52, -3.4, 61, -6); ctx.stroke();
  }

  function camera(ctx, glint, kick) {
    ctx.save();
    ctx.translate(kick, 0);
    ctx.fillStyle = C.body; rr(ctx, 50, -14, 3, 6, 1);
    ctx.fillStyle = C.body; rr(ctx, 32.5, -25.5, 11, 13.5, 2.2);
    ctx.fillStyle = C.bodyL; rr(ctx, 35, -29, 6, 4.4, 1.4);
    ctx.fillStyle = '#111214'; rr(ctx, 31.6, -24, 2.4, 4.4, 1);
    ctx.fillStyle = C.bodyL; ctx.fillRect(33.6, -14.2, 9, 1.4);
    ctx.fillStyle = glint > 0.4 ? '#ff5a4a' : '#7a2420'; circle(ctx, 41.2, -27, 0.8);
    ctx.fillStyle = C.lens; rr(ctx, 43, -23.5, 23, 11, 2.4);
    ctx.save(); ctx.beginPath(); ctx.rect(43, -23.5, 23, 11); ctx.clip();
    for (const s of LENS_SPOTS) { ctx.fillStyle = s[4]; ell(ctx, s[0], s[1], s[2], s[3]); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(43, -22.5, 23, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(43, -15, 23, 2.5);
    ctx.restore();
    ctx.fillStyle = C.hood; ctx.fillRect(43, -21.5, 2, 7);
    ctx.beginPath(); ctx.moveTo(65, -24); ctx.lineTo(74, -25.5); ctx.lineTo(74, -10.5); ctx.lineTo(65, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(65.5, -24, 8, 1.4);
    ctx.fillStyle = C.glass; ell(ctx, 74, -18, 1.3, 7.2);
    ctx.fillStyle = 'rgba(160,210,240,0.55)'; ell(ctx, 74.3, -21, 0.6, 1.6);
    ctx.restore();
    if (glint > 0.02) {
      ctx.fillStyle = 'rgba(255,255,240,' + (0.35 * glint).toFixed(3) + ')'; circle(ctx, 75 + kick, -18, 4 + 6 * glint);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * glint).toFixed(3) + ')'; star(ctx, 75 + kick, -18, 3 + 7 * glint, 0.3);
    }
  }

  function net(ctx, flat, time) {
    const k = 1 - 0.75 * flat, sway = 0.6 * sin(time * 1.3);
    const pt = (p) => [p[0] - 4 * flat * (p[0] > 10 ? 1 : 0), p[1] * k];
    ctx.save();
    ctx.fillStyle = C.net;
    ctx.beginPath();
    NET.forEach((p, i) => { const q = pt(p); if (i) ctx.lineTo(q[0], q[1] + (i > 1 && i < 9 ? sway * 0.3 : 0)); else ctx.moveTo(q[0], q[1]); });
    for (let x = 23; x > -39; x -= 5) ctx.quadraticCurveTo(x - 2.5, -2.4 * k, x - 5, 0);
    ctx.closePath(); ctx.fill();
    ctx.clip();
    ctx.strokeStyle = C.mesh; ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = -60; x < 40; x += 3.4) { ctx.moveTo(x, 0); ctx.lineTo(x + 24, -24); ctx.moveTo(x, -24); ctx.lineTo(x + 24, 0); }
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < TUFTS.length; i++) {
      const t = TUFTS[i], q = pt(t), w = 0.12 * sin(time * 1.7 + i * 1.9);
      ctx.fillStyle = LEAVES[i % LEAVES.length]; ell(ctx, q[0], q[1], 3.6, 1.5, t[2] + w);
      ctx.fillStyle = LEAVES[(i + 2) % LEAVES.length]; ell(ctx, q[0] + 2.2, q[1] + 0.6, 2.6, 1.2, -t[2] * 0.7 + w);
    }
  }

  function grass(ctx, x0) {
    ctx.strokeStyle = C.grass; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, h, l] of [[x0 - 46, 6, -2], [x0 - 30, 5, 1.5], [x0 + 6, 5, 2], [x0 + 36, 6, -1.5], [x0 + 44, 4, 2], [x0 + 63, 6, 1]]) {
      ctx.moveTo(x, GY + 1); ctx.lineTo(x + l, GY - h); ctx.moveTo(x + 2, GY + 1); ctx.lineTo(x + 2 + l * 0.4, GY - h * 0.7);
    }
    ctx.stroke();
  }

  function sparks(ctx, glint, thrill, time, n) {
    if (thrill < 0.05 || glint < 0.05) return;
    for (let i = 0; i < 3; i++) {
      const a = -1.9 + i * 0.55 + 0.2 * sin(n * 1.7 + i), r = 13 + 6 * (1 - glint);
      ctx.fillStyle = 'rgba(255,224,102,' + (glint * thrill).toFixed(3) + ')';
      star(ctx, 30 + cos(a) * r, -30 + sin(a) * r, 2.6 * glint + 0.8, time * 3 + i);
    }
  }

  ZS.drawPhotographer = function (ctx, p, time) {
    const F = ZS.sim.photographer, gap = F ? F.GAP : 0.11, face = p.face < 0 ? -1 : 1;
    const n = Math.floor(p.burstT / gap), on = n < p.frames, ph = frac(p.burstT / gap);
    const glint = on ? Math.pow(1 - ph, 3) * (p.loud ? 1 : 0.55) : 0;
    const press = on ? 0.9 * (1 - ph) : 0, thrill = clamp(p.thrill || 0, 0, 1);
    const ht = (p.react === 'hugged' ? p.hugK || 0 : 0) * ZS.CFG.HUG, lift = smooth((ht - 0.12) / 0.22) * (1 - smooth((ht - 1.38) / 0.24));
    const bit = p.react === 'bitten' ? sin(PI * clamp(p.bitK || 0, 0, 1)) : 0;
    const wig = thrill * (0.5 + 0.5 * sin(time * 13));
    const kickN = clamp(Math.max(wig, bit, 0.12 * Math.pow(Math.max(0, sin(time * 0.9)), 12)), 0, 1);
    const kickF = clamp(Math.max(thrill * (0.5 + 0.5 * sin(time * 13 + PI)), bit * 0.8), 0, 1);
    const cx = lerp(p.x, p.liftX === undefined ? p.x : p.liftX, lift), breath = 0.5 * sin(time * 1.6);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + (0.14 * (1 - 0.6 * lift)).toFixed(3) + ')';
    ell(ctx, p.x + face * 16, GY + 1, 64, 4);
    if (lift > 0.01) ell(ctx, cx, GY + 1, 22 * lift, 3.2);
    ctx.translate(p.x, GY); ctx.scale(face, 1);
    bag(ctx);
    if (lift > 0.01) net(ctx, lift, time);
    ctx.restore();
    ctx.save();
    ctx.translate(cx, GY - 44 * lift - 5 * bit); ctx.scale(face, 1); ctx.rotate(-1.2 * lift - 0.07 * bit);
    leg(ctx, true, kickF);
    arm(ctx, true, [45, -13.5], 0);
    torso(ctx, breath);
    leg(ctx, false, kickN);
    if (lift <= 0.01) net(ctx, 0, time);
    head(ctx, thrill, press, time);
    camera(ctx, glint, -0.6 * press);
    arm(ctx, false, [37.5, -12.5], press);
    sparks(ctx, glint, Math.max(thrill, bit), time, n);
    ctx.restore();
    if (lift < 0.5) {
      ctx.save(); ctx.translate(p.x, 0); ctx.scale(face, 1);
      grass(ctx, 0);
      ctx.restore();
    }
  };
})();
