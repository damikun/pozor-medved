(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, hypot = Math.hypot;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, sstep, clamp, lerp } = ZS.util;
  const API = (ZS.plenaryArt = {});
  const SIM = () => ZS.sim.plenary;
  const WOOD = { deep: '#4a2b18', dark: '#6b4024', mid: '#8f5a32', light: '#b27843', pale: '#d6a066', wall: '#a86f3e', wall2: '#b97d48' };
  const BLUE = { seat: '#2d5299', hi: '#4672c0', lo: '#1f3b73' };
  const GOLD = { base: '#c49a2c', hi: '#f3d779', lo: '#8d6a17' };
  const FUR = { deep: '#3e2414', dark: '#5a3620', mid: '#7a4a2a', light: '#9a6238', claw: '#efe2c4', clawLo: '#b9a57e' };
  const BTN = [{ face: '#2fa35a', hi: '#5fd486', lo: '#1c6b3a', lit: '#8cffb0', ink: '#ffffff' }, { face: '#c8372d', hi: '#ef6a5e', lo: '#7d1f19', lit: '#ffb0a6', ink: '#ffffff' }, { face: '#e9e6dc', hi: '#ffffff', lo: '#a8a397', lit: '#ffffff', ink: '#2a2a2a' }];
  const MPL = [
    { skin: '#efc6a2', hair: '#3a2c22', coat: '#26324a', shirt: '#eef0f4', hairdo: 'slick' },
    { skin: '#e9bd98', hair: '#c9c6c0', coat: '#4a4f57', shirt: '#f2efe6', hairdo: 'bald' },
    { skin: '#f3cfb3', hair: '#7a3a22', coat: '#5a2a3a', shirt: '#f6efe6', hairdo: 'bun' },
    { skin: '#e8b894', hair: '#2a201a', coat: '#3d4a3a', shirt: '#eef0e8', hairdo: 'slick' },
    { skin: '#f0c8a6', hair: '#2a201a', coat: '#1d2a3a', shirt: '#dfe8f2', hairdo: 'short' },
    { skin: '#f6d2b6', hair: '#c9873a', coat: '#2f6a6a', shirt: '#f6f2ec', hairdo: 'pony' },
  ];
  const MID = 690, DESK = 27, CEIL = 14;
  const ROWS = [{ floor: GY - 48, sc: 0.84, gap: 64, bow: 10, dim: 0.14 }, { floor: GY - 92, sc: 0.7, gap: 54, bow: 16, dim: 0.26 }];
  const BAL = { a: 1150, y: 238 };
  const GALLERY = [[-20, 540], [840, 1150]];
  const CAM = { x: 1222, y: 214 };
  const BOARDS = [388, 992];
  const FRONT = [[188, 652], [728, 1192]];
  const FROWS = [{ y: 40, k: 0.55, gap: 37, aisle: 70, bow: 10 }, { y: 82, k: 0.72, gap: 49, aisle: 88, bow: 16 }, { y: 128, k: 0.94, gap: 64, aisle: 110, bow: 24 }];
  const figures = new Map();
  const busts = new Map();
  const rowSeats = [];

  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  function person(ctx, id, kind, x, dir, state, time, extra) {
    let h = figures.get(id);
    if (!h) figures.set(id, (h = { aimAt: [0, 0], id }));
    Object.assign(h, { kind, x, y: GY, dir, state, outfit: 'summer', cold: 0, armed: false, empty: false, scared: false, kick: 0, texting: false, clutch: false, look: 0, size: 1 }, extra);
    ZS.drawHuman(ctx, h, time);
    return h;
  }

  function bust(ctx, id, x, y, look, face, sc, act, stand, time, kind) {
    let b = busts.get(id);
    if (!b) busts.set(id, (b = { id, kind: kind || 'mp', seed: id, up: 1, clip: null }));
    b.x = x; b.y = y; b.look = look; b.face = face; b.scale = sc; b.act = act; b.stand = stand;
    ZS.drawGuestBust(ctx, b, time);
  }

  function seatsOf(r) {
    if (rowSeats[r]) return rowSeats[r];
    const R = ROWS[r], list = [];
    for (let x = 64 + (r ? R.gap / 2 : 0); x < 1290; x += R.gap) {
      if (abs(x - MID) < 150 + r * 10) continue;
      const sd = 100 + r * 50 + list.length;
      list.push({ x, sd, look: Math.floor(hash(sd * 1.3) * 4), empty: hash(sd * 2.7) < 0.28 });
    }
    return (rowSeats[r] = list);
  }

  const rowY = (r, x) => { const u = (x - MID) / 720; return ROWS[r].floor - ROWS[r].bow * u * u; };

  function actOf(sd) {
    const h = hash(sd * 3.1);
    return h < 0.16 ? 'film' : h < 0.24 ? 'drink' : 'sit';
  }

  function wall(ctx, cam, viewW, offY) {
    const x0 = cam - 20, x1 = cam + viewW + 20;
    const gr = ctx.createLinearGradient(0, CEIL, 0, GY);
    gr.addColorStop(0, '#8e5a30'); gr.addColorStop(0.45, WOOD.wall); gr.addColorStop(1, '#93603a');
    ctx.fillStyle = gr; ctx.fillRect(x0, CEIL, x1 - x0, GY - CEIL + 2);
    for (let i = Math.floor(x0 / 12); i * 12 < x1; i++) {
      const x = i * 12;
      ctx.fillStyle = hash(i * 1.9) > 0.5 ? 'rgba(255,214,160,0.07)' : 'rgba(60,30,12,0.08)';
      ctx.fillRect(x, CEIL + 10, 6, GY - CEIL - 10);
      ctx.fillStyle = 'rgba(50,26,10,0.16)'; ctx.fillRect(x + 11, CEIL + 10, 1, GY - CEIL - 10);
    }
    ctx.fillStyle = 'rgba(60,30,14,0.22)'; ctx.fillRect(x0, CEIL + 168, x1 - x0, 4);
    const glow = ctx.createRadialGradient(MID, 170, 20, MID, 170, 520);
    glow.addColorStop(0, 'rgba(255,232,180,0.32)'); glow.addColorStop(1, 'rgba(255,232,180,0)');
    ctx.fillStyle = glow; ctx.fillRect(max(x0, MID - 520), CEIL, min(x1, MID + 520) - max(x0, MID - 520), GY - CEIL);
    const top = -offY - 20;
    ctx.fillStyle = WOOD.deep; ctx.fillRect(x0, top, x1 - x0, CEIL - top);
    if (CEIL - top > 30) {
      for (let i = Math.floor(x0 / 90); i * 90 < x1; i++) {
        for (let y = CEIL - 70; y > top - 60; y -= 70) {
          ctx.fillStyle = '#5a3520'; rr(ctx, i * 90 + 8, y + 8, 74, 54, 4);
          ctx.fillStyle = 'rgba(255,240,200,0.9)'; circle(ctx, i * 90 + 45, y + 35, 3);
          ctx.fillStyle = 'rgba(255,230,170,0.12)'; circle(ctx, i * 90 + 45, y + 35, 12);
        }
      }
    }
    ctx.fillStyle = WOOD.dark; ctx.fillRect(x0, CEIL - 6, x1 - x0, 14);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(x0, CEIL + 6, x1 - x0, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x0, CEIL + 9, x1 - x0, 5);
  }

  function emblem(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.moveTo(-30, -34); ctx.lineTo(32, -34); ctx.lineTo(32, 4); ctx.quadraticCurveTo(32, 30, 1, 42); ctx.quadraticCurveTo(-30, 30, -30, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8e2d4';
    ctx.beginPath(); ctx.moveTo(-32, -36); ctx.lineTo(32, -36); ctx.lineTo(32, 2); ctx.quadraticCurveTo(32, 28, 0, 40); ctx.quadraticCurveTo(-32, 28, -32, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d0312b';
    ctx.beginPath(); ctx.moveTo(-29, -33); ctx.lineTo(29, -33); ctx.lineTo(29, 2); ctx.quadraticCurveTo(29, 25, 0, 36.5); ctx.quadraticCurveTo(-29, 25, -29, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f4fa8';
    ctx.beginPath(); ctx.moveTo(-26, 18); ctx.quadraticCurveTo(-20, 8, -12, 12); ctx.quadraticCurveTo(-6, 2, 0, 4); ctx.quadraticCurveTo(6, 2, 12, 12); ctx.quadraticCurveTo(20, 8, 26, 18); ctx.quadraticCurveTo(14, 30, 0, 36); ctx.quadraticCurveTo(-14, 30, -26, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2.6, -26, 5.2, 32);
    ctx.fillRect(-12, -17, 24, 4.4);
    ctx.fillRect(-16, -7, 32, 4.8);
    ctx.restore();
  }

  function sideBoard(ctx, x, y, c) {
    const B = LABELS.plenary.board, w = 214, h = 96;
    ctx.fillStyle = WOOD.deep; rr(ctx, x - w / 2 - 7, y - 7, w + 14, h + 14, 6);
    ctx.fillStyle = '#0d0d0f'; rr(ctx, x - w / 2, y, w, h, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let yy = y + 3; yy < y + h; yy += 3) ctx.fillRect(x - w / 2 + 3, yy, w - 6, 1);
    const lines = [[B.present, String(c.present)], [B.za, '-'], [B.proti, '-'], [B.zdrzal, '-']];
    ctx.textBaseline = 'middle';
    lines.forEach(([k, v], n) => {
      const ly = y + 18 + n * 19;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left'; ctx.fillStyle = '#e0a53a';
      ctx.fillText(k, x - w / 2 + 10, ly, 130);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd84a';
      ctx.font = '800 15px ui-monospace, Menlo, monospace';
      ctx.fillText(v, x + w / 2 - 10, ly, 70);
    });
    ctx.fillStyle = 'rgba(255,216,74,0.08)'; ctx.fillRect(x - w / 2, y, w, 8);
  }

  function gallery(ctx, g, vis) {
    const t = g.time, y = BAL.y;
    for (const [a, z] of GALLERY) {
      if (!vis((a + z) / 2, (z - a) / 2 + 20)) continue;
      const sh = ctx.createLinearGradient(0, y - 64, 0, y);
      sh.addColorStop(0, 'rgba(50,26,12,0)'); sh.addColorStop(1, 'rgba(50,26,12,0.35)');
      ctx.fillStyle = sh; ctx.fillRect(a, y - 64, z - a, 64);
      for (let x = a + 34; x < z - 20; x += 58) {
        const sd = 300 + Math.round(x / 58);
        if (hash(sd * 1.7) < 0.45) continue;
        bust(ctx, sd, x, y - 6, Math.floor(hash(sd * 2.3) * 4), x < MID ? 1 : -1, 0.62, hash(sd * 3.9) < 0.3 ? 'film' : 'sit', 0, t);
      }
      railing(ctx, a, z, y);
    }
  }

  function railing(ctx, a, z, y) {
    ctx.fillStyle = WOOD.dark; ctx.fillRect(a, y, z - a, 40);
    ctx.fillStyle = WOOD.mid; ctx.fillRect(a + 6, y + 6, z - a - 12, 28);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = a + 30; x < z - 10; x += 40) ctx.fillRect(x, y + 6, 2, 28);
    ctx.fillStyle = GOLD.base; ctx.fillRect(a - 4, y - 4, z - a + 8, 6);
    ctx.fillStyle = GOLD.hi; ctx.fillRect(a - 4, y - 4, z - a + 8, 2);
    ctx.fillStyle = WOOD.deep;
    for (let x = a + 40; x < z - 30; x += 130) poly(ctx, [x, y + 40, x + 18, y + 40, x + 18, y + 44, x + 5, y + 62, x, y + 62]);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(a, y + 40, z - a, 10);
  }

  function balcony(ctx, g) {
    const t = g.time, y = BAL.y;
    const sh = ctx.createLinearGradient(0, y - 64, 0, y);
    sh.addColorStop(0, 'rgba(50,26,12,0)'); sh.addColorStop(1, 'rgba(50,26,12,0.35)');
    ctx.fillStyle = sh; ctx.fillRect(BAL.a, y - 64, 270, 64);
    ctx.save(); ctx.translate(0, y - GY);
    person(ctx, 'plenCam', 'reporter', 1286, -1, 'idle', t, { empty: true });
    ctx.restore();
    tripod(ctx, CAM.x, CAM.y, BAL.y, 1);
    camBody(ctx, CAM.x, CAM.y, -1, Math.atan2(GY - 60 - CAM.y, CAM.x - MID), 0, 1, 0, t);
    railing(ctx, BAL.a, BAL.a + 270, y);
  }

  function tripod(ctx, x, y, foot, k) {
    ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 3 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 8 * k); ctx.lineTo(x - 16 * k, foot); ctx.moveTo(x, y + 8 * k); ctx.lineTo(x + 16 * k, foot); ctx.moveTo(x, y + 8 * k); ctx.lineTo(x + 2 * k, foot); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function camBody(ctx, x, y, dir, a, turn, k, rec, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.save(); ctx.scale(dir, 1); ctx.rotate(a * (1 - turn)); ctx.scale(1 - 0.72 * turn, 1);
    ctx.fillStyle = '#2b2d31'; rr(ctx, -22, -12, 40, 22, 4);
    ctx.fillStyle = '#3c4048'; rr(ctx, -20, -10, 36, 7, 3);
    ctx.fillStyle = '#1a1b1e'; rr(ctx, 16, -8, 14, 15, 3);
    if (turn < 0.6) {
      ctx.fillStyle = '#6b717b'; circle(ctx, 30, -0.5, 7.5);
      ctx.fillStyle = '#9fc4e8'; circle(ctx, 31, -0.5, 4.5);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, 32.4, -2, 1.4);
    }
    ctx.fillStyle = '#2b2d31'; rr(ctx, -12, -18, 18, 7, 2);
    ctx.restore();
    if (turn > 0.3) {
      const u = smooth((turn - 0.3) / 0.7), R = 6 + 8 * u;
      ctx.globalAlpha = u;
      ctx.fillStyle = '#1a1b1e'; circle(ctx, 0, 0, R + 3);
      ctx.fillStyle = '#6b717b'; circle(ctx, 0, 0, R);
      ctx.fillStyle = '#2a4a6a'; circle(ctx, 0, 0, R * 0.68);
      ctx.fillStyle = '#9fc4e8'; circle(ctx, 0, 0, R * 0.42);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, -R * 0.25, -R * 0.25, R * 0.16);
      ctx.globalAlpha = 1;
    }
    const on = rec >= 1 || (rec > 0 && sin(t * 12) > 0), lx = -14 * dir * (1 - 0.5 * turn);
    ctx.fillStyle = on ? '#ff3b30' : '#5a1a16'; circle(ctx, lx, -17, 3);
    if (on) { ctx.fillStyle = 'rgba(255,59,48,0.3)'; circle(ctx, lx, -17, 7); }
    ctx.fillStyle = '#d0312b'; rr(ctx, -20, 12, 40, 12, 3);
    ctx.fillStyle = '#fff'; ctx.font = '900 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('STRACH 24', 0, 18.5, 36);
    ctx.restore();
  }

  function door(ctx, x, flip) {
    ctx.fillStyle = WOOD.deep; ctx.fillRect(x - 36, GY - 136, 72, 136);
    ctx.fillStyle = WOOD.dark; ctx.fillRect(x - 30, GY - 130, 29, 130); ctx.fillRect(x + 1, GY - 130, 29, 130);
    ctx.fillStyle = 'rgba(255,220,170,0.08)'; ctx.fillRect(x - 26, GY - 124, 21, 50); ctx.fillRect(x + 5, GY - 124, 21, 50); ctx.fillRect(x - 26, GY - 66, 21, 58); ctx.fillRect(x + 5, GY - 66, 21, 58);
    ctx.fillStyle = GOLD.base; ctx.fillRect(x - 6, GY - 72, 3, 16); ctx.fillRect(x + 3, GY - 72, 3, 16);
    if (!flip) return;
    const y = GY - 154;
    ctx.fillStyle = '#1f9d55'; rr(ctx, x - 22, y - 10, 44, 20, 3);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.strokeRect(x + 7, y - 6, 9, 13);
    ctx.fillStyle = '#fff'; circle(ctx, x - 5, y - 5.5, 2);
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 3); ctx.lineTo(x - 8, y + 2);
    ctx.moveTo(x - 8, y + 2); ctx.lineTo(x - 4, y + 4); ctx.lineTo(x - 3, y + 7);
    ctx.moveTo(x - 8, y + 2); ctx.lineTo(x - 11, y + 7);
    ctx.moveTo(x - 6, y - 2); ctx.lineTo(x - 2, y); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x - 11, y - 1);
    ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 5, y + 1);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function chair(ctx, x, top, sc, glow, t) {
    const w = 29 * sc, h = 31 * sc;
    if (glow) {
      const p = 0.5 + 0.5 * sin(t * 6);
      ctx.fillStyle = glow + (0.22 + 0.2 * p).toFixed(3) + ')'; ell(ctx, x, top + h * 0.55, w * 1.1, h * 0.9);
    }
    ctx.fillStyle = BLUE.lo; rr(ctx, x - w / 2 - 1, top - 1, w + 2, h + 2, 8 * sc);
    ctx.fillStyle = BLUE.seat; rr(ctx, x - w / 2, top, w, h, 7 * sc);
    ctx.fillStyle = BLUE.hi; rr(ctx, x - w / 2 + 3 * sc, top + 3 * sc, w - 6 * sc, 6 * sc, 3 * sc);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - 1, top + 10 * sc, 2, h - 14 * sc);
  }

  function curvedDesk(ctx, r, a, z) {
    const R = ROWS[r], d = DESK * R.sc, step = 16;
    const pts = [];
    for (let x = a; x < z; x += step) pts.push(x, rowY(r, x) - d);
    pts.push(z, rowY(r, z) - d);
    ctx.fillStyle = WOOD.mid;
    ctx.beginPath(); ctx.moveTo(a, rowY(r, a) + 2);
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(z, rowY(r, z) + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = WOOD.pale; ctx.lineWidth = 4 * R.sc;
    ctx.beginPath(); ctx.moveTo(pts[0] - 2, pts[1] - 1);
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1] - 1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(50,25,10,0.18)';
    for (let x = a + 10; x < z - 4; x += 10) ctx.fillRect(x, rowY(r, x) - d + 3, 1, d - 3);
  }

  function backRow(ctx, g, r, vis) {
    const R = ROWS[r], t = g.time, sc = R.sc;
    const segs = [[40, MID - 140 - r * 12], [MID + 140 + r * 12, 1300]];
    ctx.fillStyle = r ? '#7a4b2a' : '#835230';
    for (const [a, z] of segs) {
      ctx.beginPath(); ctx.moveTo(a, GY);
      for (let x = a; x <= z; x += 20) ctx.lineTo(x, rowY(r, x) + 2);
      ctx.lineTo(z, rowY(r, z) + 2); ctx.lineTo(z, GY); ctx.closePath(); ctx.fill();
    }
    for (const s of seatsOf(r)) {
      if (!vis(s.x, 60)) continue;
      const F = rowY(r, s.x);
      chair(ctx, s.x, F - 55 * sc, sc, null, t);
      if (s.empty) continue;
      const face = (s.x < MID ? 1 : -1) * (hash(s.sd * 7.7) < 0.18 ? -1 : 1);
      bust(ctx, s.sd, s.x, F - 30 * sc, s.look, face, sc, actOf(s.sd), 0, t);
    }
    for (const [a, z] of segs) curvedDesk(ctx, r, a, z);
    const dim = ctx.createLinearGradient(0, R.floor - 90 * sc, 0, R.floor + 4);
    dim.addColorStop(0, 'rgba(70,40,20,0)'); dim.addColorStop(1, 'rgba(70,40,20,' + R.dim + ')');
    ctx.fillStyle = dim;
    for (const [a, z] of segs) ctx.fillRect(a, R.floor - 90 * sc - R.bow, z - a, 94 * sc + R.bow);
  }

  function bell(ctx, x, y, ring, t, k) {
    const w = ring ? sin(t * 22) : 0, lift = ring ? 16 * k : 0;
    ctx.save(); ctx.translate(x, y - lift); ctx.scale(k, k); ctx.rotate(w * 0.5);
    ctx.fillStyle = GOLD.lo; rr(ctx, -1.6, -13, 3.2, 7, 1.4);
    ctx.fillStyle = GOLD.base;
    ctx.beginPath(); ctx.moveTo(-3, -7); ctx.quadraticCurveTo(-5, 0, -8, 4); ctx.lineTo(8, 4); ctx.quadraticCurveTo(5, 0, 3, -7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = GOLD.hi; ctx.fillRect(-3, -5, 1.6, 7);
    if (ring) { ctx.fillStyle = '#efc6a2'; circle(ctx, 0, -14, 3.6); }
    ctx.restore();
    if (!ring) return;
    ctx.strokeStyle = 'rgba(255,230,140,0.85)'; ctx.lineWidth = 2 * k; ctx.lineCap = 'round';
    for (let n = 0; n < 3; n++) {
      const u = (t * 2.4 + n / 3) % 1, rad = (12 + u * 26) * k;
      ctx.globalAlpha = 1 - u;
      ctx.beginPath(); ctx.arc(x, y - 6 * k - lift, rad, -1.1, -0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 6 * k - lift, rad, PI + 0.2, PI + 1.1); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }

  function presidium(ctx, g) {
    const t = g.time, top = GY - 126, a = MID - 132, z = MID + 132;
    ctx.fillStyle = '#6e4326'; ctx.fillRect(a - 20, GY - 66, z - a + 40, 66);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(a - 24, GY - 70, z - a + 48, 5);
    thrones(ctx, MID, top, 1);
    bust(ctx, 7, MID, top + 6, 1, 1, 0.95, 'sit', 0, t);
    dais(ctx, a, z, top, GY - 66, 1);
    bell(ctx, MID + 34, top, false, t, 1);
  }

  function thrones(ctx, x0, top, k) {
    for (const [x, hi] of [[x0 - 74 * k, 0], [x0 + 74 * k, 0], [x0, 1]]) {
      const w = (hi ? 50 : 42) * k, h = (hi ? 86 : 72) * k;
      ctx.fillStyle = '#5e1f22'; rr(ctx, x - w / 2, top - h + 24 * k, w, h, 10 * k);
      ctx.fillStyle = '#7d2a2e'; rr(ctx, x - w / 2 + 4 * k, top - h + 28 * k, w - 8 * k, h - 16 * k, 8 * k);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, x - w / 2 + 7 * k, top - h + 31 * k, w - 14 * k, 6 * k, 3 * k);
    }
  }

  function dais(ctx, a, z, top, bot, k) {
    ctx.fillStyle = WOOD.mid; ctx.fillRect(a, top, z - a, bot - top);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(a - 4 * k, top - 4 * k, z - a + 8 * k, 6 * k);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(a, top + 2 * k, z - a, 4 * k);
    ctx.fillStyle = 'rgba(50,25,10,0.2)'; for (let x = a + 12 * k; x < z - 4 * k; x += 12 * k) ctx.fillRect(x, top + 6 * k, max(1, k), bot - top - 6 * k);
    emblem(ctx, (a + z) / 2, top + 28 * k, 0.42 * k);
  }

  function pendant(ctx, x, y, n, t, sd) {
    for (let i = 0; i < n; i++) {
      const yy = y + i * 7, s = 1 - i * 0.12, glint = (t * 0.7 + sd + i * 0.3) % 1 < 0.06;
      ctx.fillStyle = glint ? '#ffffff' : i % 2 ? 'rgba(210,232,250,0.9)' : 'rgba(240,248,255,0.95)';
      poly(ctx, [x, yy, x + 2.6 * s, yy + 3.4 * s, x, yy + 7 * s, x - 2.6 * s, yy + 3.4 * s]);
    }
  }

  function tier(ctx, cy, rx, ry, n, drop, t, front, sd) {
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU, s = sin(th);
      if ((s >= 0) !== front) continue;
      pendant(ctx, rx * cos(th), cy + ry * s + 3, drop - (i % 2), t, sd + i * 0.37);
    }
  }

  function lustre(ctx, t, top) {
    ctx.fillStyle = GOLD.lo; ctx.fillRect(-2, top, 4, 132 - top);
    ctx.fillStyle = GOLD.base; ell(ctx, 0, 132, 20, 5);
    ctx.strokeStyle = GOLD.lo; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const x of [-112, -40, 40, 112]) { ctx.moveTo(x * 0.16, 134); ctx.lineTo(x, 160); }
    ctx.stroke();
    tier(ctx, 162, 122, 18, 28, 3, t, false, 0.1);
    tier(ctx, 200, 74, 11, 18, 3, t, false, 0.6);
    ctx.strokeStyle = GOLD.lo; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, 162, 122, 18, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = GOLD.base; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 161, 122, 18, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = GOLD.hi; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 158.5, 121, 17, 0, PI * 0.05, PI * 0.95); ctx.stroke();
    ctx.strokeStyle = GOLD.lo; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-60, 176); ctx.lineTo(-40, 196); ctx.moveTo(60, 176); ctx.lineTo(40, 196); ctx.moveTo(0, 180); ctx.lineTo(0, 189); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const th = (i / 10) * TAU + 0.3, x = 122 * cos(th), y = 161 + 18 * sin(th);
      ctx.fillStyle = 'rgba(255,236,180,0.25)'; circle(ctx, x, y - 9, 8);
      ctx.fillStyle = '#fff6da'; ell(ctx, x, y - 9, 2.6, 4);
      ctx.fillStyle = GOLD.base; ctx.fillRect(x - 3, y - 5, 6, 3);
    }
    ctx.strokeStyle = GOLD.lo; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 199, 74, 11, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = GOLD.base; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 198, 74, 11, 0, 0, TAU); ctx.stroke();
    tier(ctx, 162, 122, 18, 28, 3, t, true, 0.1);
    tier(ctx, 200, 74, 11, 18, 3, t, true, 0.6);
    ctx.fillStyle = GOLD.base; circle(ctx, 0, 214, 5);
    pendant(ctx, 0, 218, 4, t, 0.9);
  }

  function chandelier(ctx, t, offY) {
    ctx.save(); ctx.translate(MID, 0);
    lustre(ctx, t, -offY - 60);
    ctx.restore();
  }

  function frontSeats(ctx, g, c, S, vis) {
    const t = g.time, open = c.phase === 'walk';
    S.plenary.seats.forEach((x, k) => {
      if (!vis(x, 70)) return;
      chair(ctx, x, GY - 59, 1, k === 0 && open ? 'rgba(90,230,120,' : null, t);
      if (k === 0) return;
      const sd = 20 + k, face = (x < MID ? 1 : -1) * (hash(sd * 7.7) < 0.2 ? -1 : 1);
      bust(ctx, sd, x, GY - 30, Math.floor(hash(sd * 1.3) * 4), face, 1, actOf(sd), 0, t);
    });
  }

  function minister(ctx, g) {
    const t = g.time, dir = sin(t * 0.37) > 0.2 ? -1 : 1;
    ctx.fillStyle = WOOD.dark; ctx.fillRect(MID - 40, GY - 9, 80, 9);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(MID - 42, GY - 11, 84, 3);
    ctx.save(); ctx.translate(0, -9);
    person(ctx, 'plenMin', 'mp', MID, dir, 'idle', t, { look: 3 });
    ctx.restore();
  }

  function lectern(ctx, x, base, k, dir) {
    ctx.save(); ctx.translate(x, base); ctx.scale(k, k);
    ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(dir * 4, -48); ctx.quadraticCurveTo(dir * 4, -64, dir * 13, -67); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#1a1b1e'; ell(ctx, dir * 14, -67, 3, 2.4);
    ctx.fillStyle = WOOD.dark;
    poly(ctx, [-30, -48, 30, -48, 26, 0, -26, 0]);
    ctx.fillStyle = WOOD.light; ctx.fillRect(-33, -52, 66, 6);
    ctx.fillStyle = WOOD.mid; poly(ctx, [-24, -42, 24, -42, 21, -6, -21, -6]);
    ctx.restore();
    emblem(ctx, x, base - 26 * k, 0.3 * k);
  }

  function frontDesks(ctx, g, c, S, vis) {
    const t = g.time;
    for (const [a, z] of FRONT) {
      if (!vis((a + z) / 2, (z - a) / 2 + 40)) continue;
      ctx.fillStyle = WOOD.mid; ctx.fillRect(a, GY - DESK, z - a, DESK);
      ctx.fillStyle = 'rgba(50,25,10,0.16)'; for (let x = a + 8; x < z - 4; x += 8) ctx.fillRect(x, GY - DESK + 6, 1, DESK - 8);
      ctx.fillStyle = WOOD.dark; ctx.fillRect(a, GY - 5, z - a, 5);
      ctx.fillStyle = WOOD.pale; ctx.fillRect(a - 4, GY - DESK - 4, z - a + 8, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(a, GY - DESK + 2, z - a, 4);
    }
    S.plenary.seats.forEach((x, k) => {
      if (!vis(x, 60)) return;
      const y = GY - DESK - 6;
      ctx.fillStyle = '#2b2d31'; rr(ctx, x - 14, y - 1, 28, 5, 2);
      ctx.fillStyle = '#2f8f4a'; circle(ctx, x - 8, y + 1.5, 2.2);
      ctx.fillStyle = '#b8322a'; circle(ctx, x, y + 1.5, 2.2);
      ctx.fillStyle = '#e8e8e8'; circle(ctx, x + 8, y + 1.5, 2.2);
      ctx.fillStyle = '#1d2026'; poly(ctx, [x + 18, y + 4, x + 30, y + 4, x + 32, y - 6, x + 21, y - 6]);
      ctx.fillStyle = 'rgba(120,200,255,0.8)'; poly(ctx, [x + 20, y + 3, x + 29, y + 3, x + 30.5, y - 4.5, x + 22, y - 4.5]);
      if (k === 0 && c.phase === 'walk') {
        const p = 0.5 + 0.5 * sin(t * 6);
        ctx.fillStyle = 'rgba(93,255,122,' + (0.5 + 0.4 * p).toFixed(3) + ')'; ctx.fillRect(x - 40, GY - DESK + 8, 80, 3);
        const ay = GY - 132 - 6 * p;
        ctx.fillStyle = 'rgba(93,230,120,' + (0.75 + 0.25 * p).toFixed(3) + ')';
        poly(ctx, [x - 11, ay, x + 11, ay, x, ay + 14]); ctx.fillRect(x - 4, ay - 14, 8, 14);
      }
    });
  }

  function floor(ctx, cam, viewW, H, offY) {
    const x0 = cam - 20, x1 = cam + viewW + 20, bot = H - offY + 20;
    const gr = ctx.createLinearGradient(0, GY, 0, max(GY + 120, bot));
    gr.addColorStop(0, '#3a4a6e'); gr.addColorStop(1, '#232c44');
    ctx.fillStyle = gr; ctx.fillRect(x0, GY, x1 - x0, bot - GY);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = GY + 14, k = 0; y < bot; y += 12 + k * 4, k++) ctx.fillRect(x0, y, x1 - x0, 2);
    ctx.fillStyle = 'rgba(214,160,102,0.5)'; ctx.fillRect(x0, GY, x1 - x0, 3);
    ctx.fillStyle = 'rgba(196,154,44,0.35)'; ctx.fillRect(x0, GY + 26, x1 - x0, 2); ctx.fillRect(x0, GY + 70, x1 - x0, 2);
    ctx.fillStyle = 'rgba(160,40,40,0.25)'; ctx.fillRect(x0, GY + 28, x1 - x0, 42);
    const P = GY + 98;
    if (bot <= P) return;
    ctx.fillStyle = WOOD.dark; ctx.fillRect(x0, P, x1 - x0, bot - P);
    ctx.fillStyle = WOOD.mid;
    for (let i = Math.floor(x0 / 120); i * 120 < x1; i++) rr(ctx, i * 120 + 10, P + 22, 100, max(10, bot - P - 40), 6);
    ctx.fillStyle = 'rgba(50,25,10,0.18)'; for (let x = Math.floor(x0 / 10) * 10; x < x1; x += 10) ctx.fillRect(x, P + 24, 1, max(8, bot - P - 44));
    ctx.fillStyle = GOLD.base; ctx.fillRect(x0, P - 6, x1 - x0, 8);
    ctx.fillStyle = GOLD.hi; ctx.fillRect(x0, P - 6, x1 - x0, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0, P + 2, x1 - x0, 6);
  }

  function hint(ctx, g, c, S, viewW) {
    const b = g.bear, seat = S.plenary.seats[0], near = c.phase === 'walk' && abs(b.x - seat) < 90;
    const part = Object.assign(['KeyC', LABELS.plenary.sit], { skill: 'plenarySit', tip: true });
    ZS.prompt.show(ctx, g, near ? { parts: [part], x: seat, y: GY + 6 } : null, { hang: true, lo: g.cam + 8, hi: g.cam + viewW - 8 });
  }

  function overlays(ctx, g, viewW, offY) {
    const b = g.bear, P = ZS.render.props;
    for (const f of g.floaters) {
      ctx.globalAlpha = min(1, f.t);
      label(ctx, f.text, f.x, max(-offY + 12, f.y - (1.6 - f.t) * 30), 16, f.color);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) P.bubble(ctx, b.x, GY - 180, g.bubble.text, g.bubble.t, g.cam + 8, g.cam + viewW - 8);
  }

  function side(g, ctx, viewW, offY, H) {
    const S = g.level, c = g.pass.play, cam = g.cam, b = g.bear, t = g.time, I = SIM().INTRO;
    const vis = (x, m) => x > cam - m && x < cam + viewW + m;
    const z = c.phase === 'sit' ? sstep(I.sit, I.sit + I.zoom, c.t - c.sitAt) : 0;
    const px = b.x - cam, py = GY - 70 + offY;
    ctx.save();
    if (z > 0) { const k = 1 + 1.8 * z; ctx.translate(px, py); ctx.scale(k, k); ctx.translate(-px, -py); }
    ctx.translate(0, offY);
    ctx.translate(-Math.round(cam), 0);
    wall(ctx, cam, viewW, offY);
    for (const x of BOARDS) if (vis(x, 130)) sideBoard(ctx, x, 70, c);
    gallery(ctx, g, vis);
    if (vis(40, 60)) door(ctx, 40, false);
    if (vis(1362, 60)) door(ctx, 1362, true);
    floor(ctx, cam, viewW, H, offY);
    backRow(ctx, g, 1, vis);
    backRow(ctx, g, 0, vis);
    if (vis(MID, 200)) presidium(ctx, g);
    if (vis(MID, 160)) chandelier(ctx, t, offY);
    frontSeats(ctx, g, c, S, vis);
    if (vis(MID, 60)) minister(ctx, g);
    const sink = c.phase === 'sit' ? 8 * sstep(0, I.sit, c.t - c.sitAt) : 0;
    ctx.save();
    if (sink > 0) { ctx.beginPath(); ctx.rect(cam - 100, -offY - 100, viewW + 200, GY + offY + 100); ctx.clip(); ctx.translate(0, sink); }
    ZS.drawBear(ctx, b, t);
    ctx.restore();
    frontDesks(ctx, g, c, S, vis);
    if (vis(MID, 60)) lectern(ctx, MID, GY, 1, sin(t * 0.37) > 0.2 ? -1 : 1);
    if (vis(BAL.a + 130, 200)) balcony(ctx, g);
    overlays(ctx, g, viewW, offY);
    hint(ctx, g, c, S, viewW);
    ctx.restore();
    if (z > 0) {
      const R = max(0, hypot(viewW, H) * (1 - z));
      ctx.fillStyle = '#151b22';
      ctx.beginPath(); ctx.rect(-10, -10, viewW + 20, H + 20); ctx.moveTo(px + R, py); ctx.arc(px, py, R, 0, TAU, true); ctx.fill();
    }
  }

  function layout(g, viewW, H, c) {
    const W = viewW, port = H > W * 1.15, cx = W / 2;
    const s = port ? W / 520 : clamp(min(W / 960, H / 540), 0.6, 2);
    const ks = port ? W / 500 : 0.88 * s;
    const bs = port ? W / 400 : 0.88 * s;
    const deskY = port ? H - (g.touch ? 305 : 60) - 150 * ks : H - 178 * s;
    const hy = deskY - (port ? 120 : 132) * s;
    const dk = smooth(c.duck);
    const lift = dk * (port ? 200 : 150) * s;
    const bh = 132 * bs, boardY = port ? hy - 129 * s - 10 * s - bh : 70 * s, bx = port ? cx : cx + 300 * s;
    const camX = port ? W - 62 * s : cx - 330 * s, camY = port ? boardY - 70 * s : hy - 80 * s;
    const lampX = cx, lampY = port ? min(boardY - 90 * s, 110 * s) : 46 * s;
    return { W, H, port, s, ks, bs, cx, deskY, hy, dk, lift, bx, bh, boardY, camX, camY, lampX, lampY, sway: c.sway };
  }

  function hall(ctx, g, c, V, t) {
    const { W, H, s, cx, hy } = V;
    const gr = ctx.createLinearGradient(0, 0, 0, hy + 60 * s);
    gr.addColorStop(0, '#7e4e2a'); gr.addColorStop(0.5, WOOD.wall); gr.addColorStop(1, '#8a5834');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const step = 14 * s;
    for (let i = 0, x = cx % step - step; x < W; x += step, i++) {
      ctx.fillStyle = hash(i * 1.9) > 0.5 ? 'rgba(255,214,160,0.07)' : 'rgba(60,30,12,0.08)';
      ctx.fillRect(x, 0, step / 2, hy + 40 * s);
      ctx.fillStyle = 'rgba(50,26,10,0.16)'; ctx.fillRect(x + step - 1, 0, 1, hy + 40 * s);
    }
    const glow = ctx.createRadialGradient(cx, hy - 120 * s, 10, cx, hy - 120 * s, 420 * s);
    glow.addColorStop(0, 'rgba(255,232,180,0.4)'); glow.addColorStop(1, 'rgba(255,232,180,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, hy + 60 * s);
    const top = min(V.boardY - 40 * s, V.lampY - 60 * s);
    ctx.fillStyle = WOOD.deep; ctx.fillRect(0, 0, W, max(16 * s, top));
    for (let x = cx % (90 * s) - 90 * s; x < W; x += 90 * s) {
      for (let y = top - 70 * s; y > -70 * s; y -= 70 * s) {
        ctx.fillStyle = '#5a3520'; rr(ctx, x + 8 * s, y + 8 * s, 74 * s, 54 * s, 4 * s);
        ctx.fillStyle = 'rgba(255,240,200,0.9)'; circle(ctx, x + 45 * s, y + 35 * s, 3 * s);
        ctx.fillStyle = 'rgba(255,230,170,0.12)'; circle(ctx, x + 45 * s, y + 35 * s, 12 * s);
      }
    }
    ctx.fillStyle = WOOD.dark; ctx.fillRect(0, top - 6 * s, W, 14 * s);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(0, top + 6 * s, W, 3 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, top + 9 * s, W, 5 * s);
    const fl = ctx.createLinearGradient(0, hy, 0, H);
    fl.addColorStop(0, '#3a4a6e'); fl.addColorStop(1, '#1d2438');
    ctx.fillStyle = fl; ctx.fillRect(0, hy + 10 * s, W, H - hy);
    ctx.fillStyle = 'rgba(160,40,40,0.5)';
    poly(ctx, [cx - 40 * s, hy + 20 * s, cx + 40 * s, hy + 20 * s, cx + 170 * s, H, cx - 170 * s, H]);
    ctx.fillStyle = 'rgba(196,154,44,0.45)';
    poly(ctx, [cx - 40 * s, hy + 20 * s, cx - 37 * s, hy + 20 * s, cx - 162 * s, H, cx - 170 * s, H]);
    poly(ctx, [cx + 37 * s, hy + 20 * s, cx + 40 * s, hy + 20 * s, cx + 170 * s, H, cx + 162 * s, H]);
  }

  function board(ctx, c, V, t) {
    const P = SIM(), B = LABELS.plenary.board, L = LABELS.plenary, k = V.bs, i = max(0, c.round), R = P.ROUNDS[i];
    const w = 340 * k, h = V.bh, x = V.bx - w / 2, y = V.boardY;
    const st = c.round < 0 ? 'wait' : P.state(c, i), res = c.res[i];
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, x - 6 * k, y - 4 * k, w + 16 * k, h + 16 * k, 8 * k);
    ctx.fillStyle = WOOD.deep; rr(ctx, x - 8 * k, y - 8 * k, w + 16 * k, h + 16 * k, 8 * k);
    ctx.fillStyle = GOLD.base; ctx.fillRect(x - 8 * k, y - 8 * k, w + 16 * k, 3 * k);
    ctx.fillStyle = '#0d0d0f'; rr(ctx, x, y, w, h, 4 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let yy = y + 3 * k; yy < y + h; yy += 3 * k) ctx.fillRect(x + 3 * k, yy, w - 6 * k, max(0.6, k * 0.8));
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + (11 * k).toFixed(1) + 'px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = R.fast ? '#ff6b5a' : '#c98a2a';
    ctx.fillText(R.fast ? L.law : (i + 1) + '/' + P.ROUNDS.length, x + 10 * k, y + 13 * k, w * 0.5);
    if (c.round >= 0) { ctx.textAlign = 'right'; ctx.fillStyle = R.pick ? '#ff8a7a' : '#7dff9a'; ctx.fillText('🐻 ' + L.buttons[R.pick], x + w - 10 * k, y + 13 * k, w * 0.45); }
    const blink = st === 'bell' && sin(t * 10) < -0.2;
    if (!blink) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84a';
      ctx.font = '800 ' + (19 * k).toFixed(1) + 'px system-ui, sans-serif';
      ctx.fillText(L.bills[i], V.bx, y + 37 * k, w - 20 * k);
    }
    const tl = live(c, i, st);
    const cols = [[B.za, tl.za, '#7dff9a'], [B.proti, tl.proti, '#ff8a7a'], [B.zdrzal, tl.zdrzal, '#f2f2e8'], [B.present, tl.present, '#e0a53a']];
    const cw = (w - 20 * k) / 4;
    cols.forEach(([name, v, col], n) => {
      const mx = x + 10 * k + cw * (n + 0.5);
      ctx.textAlign = 'center';
      ctx.font = '700 ' + (10 * k).toFixed(1) + 'px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#b98a3a';
      ctx.fillText(name, mx, y + 62 * k, cw - 4 * k);
      const fresh = n === 0 && c.vote[i] === 0 && c.press && c.press.t < 1.2 ? 1 - c.press.t / 1.2 : 0;
      ctx.font = '800 ' + ((22 + 6 * fresh) * k).toFixed(1) + 'px ui-monospace, Menlo, monospace';
      ctx.fillStyle = fresh > 0 ? '#ffffff' : col;
      ctx.fillText(v, mx, y + 82 * k, cw - 4 * k);
    });
    const sy = y + 110 * k;
    if (st === 'open') {
      const left = clamp((R.close - c.ft) / (R.close - R.open), 0, 1), bw = w - 24 * k;
      ctx.fillStyle = '#222'; rr(ctx, x + 12 * k, sy + 4 * k, bw, 9 * k, 4 * k);
      ctx.fillStyle = left > 0.35 ? '#ffd84a' : sin(t * 14) > 0 ? '#ff5a4a' : '#ff9a3a'; rr(ctx, x + 12 * k, sy + 4 * k, max(2, bw * left), 9 * k, 4 * k);
      ctx.font = '800 ' + (11 * k).toFixed(1) + 'px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#ffd84a'; ctx.textAlign = 'center';
      ctx.fillText(B.open, V.bx, sy - 6 * k, w);
    } else {
      const done = st === 'done' && res, text = done ? (res.passed ? B.passed : B.failed) : B.wait;
      ctx.font = '900 ' + (15 * k).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = done ? (res.passed ? '#7dff9a' : '#ff6b5a') : st === 'bell' && sin(t * 10) > 0 ? '#ffd84a' : '#8a6a2a';
      ctx.fillText(text, V.bx, sy, w);
    }
    ctx.fillStyle = 'rgba(255,216,74,0.07)'; ctx.fillRect(x, y, w, 8 * k);
  }

  function live(c, i, st) {
    const P = SIM(), R = P.ROUNDS[i], none = LABELS.plenary.board.none;
    if (c.res[i]) { const r = c.res[i]; return { za: String(r.za), proti: String(r.proti), zdrzal: String(r.zdrzal), present: String(r.present) }; }
    const pres = String(i === 0 ? c.present : R.base + R.proti + R.zdrzal + (c.vote[i] >= 0 ? 1 : 0));
    if (st !== 'open' && !(st === 'done' && i === P.ROUNDS.length - 1)) return { za: none, proti: none, zdrzal: none, present: pres };
    const u = smooth(clamp((c.ft - R.open) / ((R.close - R.open) * (R.fast ? 0.3 : 0.55)), 0, 1)), v = c.vote[i];
    const n = (base, k) => String(Math.round(base * u) + (v === k ? 1 : 0));
    return { za: n(R.base, 0), proti: n(R.proti, 1), zdrzal: n(R.zdrzal, 2), present: pres };
  }

  function lamp(ctx, c, V, t) {
    const k = (V.port ? 0.62 : 0.5) * V.s, sw = V.sway * (0.11 * sin(t * 2.3) + 0.04 * sin(t * 5.1));
    ctx.save(); ctx.translate(V.lampX, -140 * V.s); ctx.rotate(sw); ctx.translate(0, V.lampY + 140 * V.s - 162 * k); ctx.scale(k, k);
    lustre(ctx, t, -(V.lampY + 160 * V.s) / k);
    ctx.restore();
  }

  function balconyFP(ctx, g, c, V, t, T) {
    const { s, camX, camY, W } = V, y = camY + 30 * s, right = camX > V.cx, a = right ? camX - 120 * s : -10, z = right ? W + 10 : camX + 150 * s, f = right ? -1 : 1;
    const sh = ctx.createLinearGradient(0, y - 70 * s, 0, y);
    sh.addColorStop(0, 'rgba(50,26,12,0)'); sh.addColorStop(1, 'rgba(50,26,12,0.4)');
    ctx.fillStyle = sh; ctx.fillRect(a, y - 70 * s, z - a, 70 * s);
    const turn = T && T.T.kind === 'camera' ? (T.on ? 1 : smooth(clamp(T.k * 1.4, 0, 1))) : 0;
    bust(ctx, 'fpOp', camX - f * 34 * s, y - 4 * s, 0, f, 1.05 * s, turn > 0.5 ? 'peek' : 'sit', 0, t, 'reporter');
    for (let x = right ? a + 30 * s : camX + 40 * s; x < (right ? camX - 30 * s : z - 20 * s); x += 52 * s) {
      const sd = 400 + Math.round(x / (52 * s));
      if (hash(sd * 1.7) < 0.4) continue;
      bust(ctx, sd, x, y - 4 * s, Math.floor(hash(sd * 2.3) * 4), f, 0.8 * s, hash(sd * 3.9) < 0.4 ? 'film' : 'sit', 0, t);
    }
    tripod(ctx, camX, camY, y, s);
    const aim = Math.atan2(V.hy - 40 * s - camY, abs(camX - V.cx));
    camBody(ctx, camX, camY, camX > V.cx ? -1 : 1, aim, turn, 1.25 * s, T && T.T.kind === 'camera' ? (T.on ? 1 : 0.5) : 0, t);
    railFP(ctx, a, z, y, s);
    if (T && T.T.kind === 'camera' && T.on) {
      const gl = ctx.createRadialGradient(camX, camY, 10 * s, camX, camY, 64 * s);
      gl.addColorStop(0, 'rgba(255,252,230,' + (0.35 + 0.1 * sin(t * 20)).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,252,230,0)');
      ctx.fillStyle = gl; circle(ctx, camX, camY, 64 * s);
    }
  }

  function railFP(ctx, a, z, y, s) {
    ctx.fillStyle = WOOD.dark; ctx.fillRect(a, y, z - a, 34 * s);
    ctx.fillStyle = WOOD.mid; ctx.fillRect(a + 6 * s, y + 6 * s, z - a - 12 * s, 22 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = a + 30 * s; x < z - 10 * s; x += 40 * s) ctx.fillRect(x, y + 6 * s, 2 * s, 22 * s);
    ctx.fillStyle = GOLD.base; ctx.fillRect(a - 4 * s, y - 4 * s, z - a + 8 * s, 6 * s);
    ctx.fillStyle = GOLD.hi; ctx.fillRect(a - 4 * s, y - 4 * s, z - a + 8 * s, 2 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(a, y + 34 * s, z - a, 8 * s);
  }

  function stage(ctx, g, c, V, t) {
    const { s, cx, hy } = V, P = SIM(), i = c.round, st = i >= 0 ? P.state(c, i) : 'wait';
    const top = hy - 64 * s, a = cx - 170 * s, z = cx + 170 * s;
    ctx.fillStyle = '#6e4326'; ctx.fillRect(a - 24 * s, hy - 10 * s, z - a + 48 * s, 30 * s);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(a - 28 * s, hy - 14 * s, z - a + 56 * s, 5 * s);
    thrones(ctx, cx, top, 1.05 * s);
    bust(ctx, 'fpChair', cx, top - 8 * s, 1, -1, 1.05 * s, 'sit', 0, t);
    bust(ctx, 'fpVice', cx - 78 * s, top + 8 * s, 4, 1, 0.92 * s, hash(9.1) < 0.5 ? 'film' : 'sit', 0, t);
    dais(ctx, a, z, top, hy - 10 * s, s);
    bell(ctx, cx + 40 * s, top, st === 'bell' || (c.pointa && c.pointa.t < P.POINTA.flash), t, 1.2 * s);
    const dir = sin(t * 0.37) > 0.2 ? -1 : 1, base = hy + 78 * s, mk = 1.2 * s;
    ctx.save(); ctx.translate(cx, base - 6 * s); ctx.scale(mk, mk); ctx.translate(-cx, -GY);
    person(ctx, 'fpMin', 'mp', cx, dir, 'idle', t, { look: 3 });
    ctx.restore();
    lectern(ctx, cx, base, 1.25 * s, dir);
    speech(ctx, c, V, t, cx + dir * 34 * s, base - 128 * s);
  }

  function speech(ctx, c, V, t, x, y) {
    const P = SIM(), list = LABELS.plenary.speech, i = c.round, st = i >= 0 ? P.state(c, i) : 'wait';
    if (c.pointa || st === 'open' || st === 'bell' || P.threat(c)) return;
    const u = (c.ft + 1.2) / 4.2, k = u - Math.floor(u), a = sstep(0, 0.08, k) * (1 - sstep(0.62, 0.72, k));
    if (a <= 0.01) return;
    const text = list[Math.floor(u) % list.length], fs = 13 * max(V.s, 0.9);
    ctx.globalAlpha = a;
    ctx.font = '700 ' + fs.toFixed(1) + 'px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 18, h = fs + 12, bx = clamp(x - w / 2, 6, V.W - w - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, bx + 2, y - h + 3, w, h, h / 2);
    ctx.fillStyle = '#fffaf0'; rr(ctx, bx, y - h, w, h, h / 2);
    poly(ctx, [x - 6, y - 2, x + 6, y - 2, x, y + 8]);
    ctx.fillStyle = '#3a2216'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, y - h / 2 + 1);
    ctx.globalAlpha = 1;
  }

  function mpBack(ctx, x, y, k, sd, t) {
    const L = MPL[Math.floor(hash(sd * 1.3) * MPL.length)], h = hash(sd * 3.1), bob = sin(t * 1.3 + sd) * 0.6 * k;
    const turn = sin(t * 0.4 + sd * 2) * (h > 0.7 ? 3 : 1) * k, sleep = h > 0.9;
    ctx.fillStyle = L.coat; rr(ctx, x - 24 * k, y - 20 * k + bob, 48 * k, 34 * k, 12 * k);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x - 0.8 * k, y - 12 * k + bob, 1.6 * k, 26 * k);
    ctx.fillStyle = L.shirt; rr(ctx, x - 7 * k, y - 23 * k + bob, 14 * k, 6 * k, 3 * k);
    ctx.fillStyle = L.skin; ctx.fillRect(x - 5 * k, y - 28 * k + bob, 10 * k, 7 * k);
    const hx = x + turn, hy = y - 37 * k + bob + (sleep ? 3 * k : 0);
    ctx.save(); ctx.translate(hx, hy); if (sleep) ctx.rotate(0.35);
    ctx.fillStyle = L.skin; ell(ctx, -11 * k, 1 * k, 2.6 * k, 4 * k); ell(ctx, 11 * k, 1 * k, 2.6 * k, 4 * k);
    if (L.hairdo === 'bald') {
      ctx.fillStyle = L.skin; ell(ctx, 0, 0, 11 * k, 12.5 * k);
      ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(0, 1 * k, 11 * k, 11.5 * k, 0, 0.15 * PI, 0.85 * PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(ctx, -3 * k, -6 * k, 4 * k, 2.6 * k);
    } else {
      ctx.fillStyle = L.hair; ell(ctx, 0, 0, 11.2 * k, 12.6 * k);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ell(ctx, -3 * k, -6 * k, 5 * k, 2.6 * k);
      if (L.hairdo === 'bun') { ctx.fillStyle = L.hair; circle(ctx, 0, -11 * k, 5 * k); }
      if (L.hairdo === 'pony') { ctx.fillStyle = L.hair; rr(ctx, -2.5 * k, 4 * k, 5 * k, 14 * k, 2.5 * k); }
    }
    ctx.restore();
    if (h < 0.22) {
      const px = x + 17 * k, py = y - 32 * k + bob;
      ctx.fillStyle = '#1a1b1e'; rr(ctx, px - 4 * k, py - 7 * k, 8 * k, 13 * k, 1.5 * k);
      ctx.fillStyle = 'rgba(150,210,255,0.9)'; ctx.fillRect(px - 3 * k, py - 6 * k, 6 * k, 10 * k);
      ctx.fillStyle = L.skin; circle(ctx, px, py + 6 * k, 3 * k);
    } else if (h < 0.3) {
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(x - 20 * k, y - 34 * k + bob, 40 * k, 18 * k);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let n = 0; n < 4; n++) ctx.fillRect(x - 16 * k, y - 30 * k + bob + n * 3.6 * k, 32 * k, 1.2 * k);
    }
  }

  function rowsFP(ctx, c, V, t) {
    const { s, cx, hy, W } = V;
    FROWS.forEach((R, r) => {
      const base = hy + R.y * s, k = R.k * s, gap = R.gap * s, aisle = R.aisle * s;
      const y = (x) => { const u = (x - cx) / (W / 2 + 60 * s); return base - R.bow * s * u * u; };
      const list = [];
      for (let n = 0; ; n++) {
        const off = aisle + gap * (n + 0.5);
        if (off > W / 2 + gap) break;
        list.push(cx - off, cx + off);
      }
      list.forEach((x, n) => {
        const sd = 600 + r * 80 + n, yy = y(x);
        ctx.fillStyle = BLUE.lo; rr(ctx, x - 21 * k, yy - 40 * k, 42 * k, 46 * k, 10 * k);
        if (hash(sd * 2.7) > 0.38) mpBack(ctx, x, yy, k, sd, t);
        ctx.fillStyle = BLUE.seat; rr(ctx, x - 20 * k, yy - 6 * k, 40 * k, 20 * k, 6 * k);
        ctx.fillStyle = BLUE.hi; rr(ctx, x - 16 * k, yy - 4 * k, 32 * k, 4 * k, 2 * k);
      });
      for (const sgn of [-1, 1]) {
        const a = cx + sgn * (aisle - 12 * s), z = cx + sgn * (W / 2 + 40 * s);
        ctx.fillStyle = WOOD.mid;
        ctx.beginPath(); ctx.moveTo(a, y(a) + 12 * k);
        for (let i = 0; i <= 12; i++) { const x = lerp(a, z, i / 12); ctx.lineTo(x, y(x) + 12 * k); }
        for (let i = 12; i >= 0; i--) { const x = lerp(a, z, i / 12); ctx.lineTo(x, y(x) + 34 * k); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = WOOD.pale; ctx.lineWidth = 3.5 * k;
        ctx.beginPath(); ctx.moveTo(a, y(a) + 12 * k);
        for (let i = 1; i <= 12; i++) { const x = lerp(a, z, i / 12); ctx.lineTo(x, y(x) + 12 * k); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(30,15,6,' + (0.22 - r * 0.05).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a, y(a) + 16 * k);
        for (let i = 0; i <= 12; i++) { const x = lerp(a, z, i / 12); ctx.lineTo(x, y(x) + 16 * k); }
        for (let i = 12; i >= 0; i--) { const x = lerp(a, z, i / 12); ctx.lineTo(x, y(x) + 34 * k); }
        ctx.closePath(); ctx.fill();
      }
    });
  }

  function neighbours(ctx, g, c, V, t, T) {
    const { s, W, deskY } = V, k = (V.port ? 1.75 : 2.4) * s, y = deskY + (V.port ? 0 : 58) * s, e = (V.port ? 36 : 58) * s;
    bust(ctx, 'fpLeft', e, y, 2, -1, k, 'drink', 0, t);
    const n = T && T.T.kind === 'neighbour' ? T : null, turn = n ? (n.on ? 1 : smooth(clamp((n.k - 0.35) / 0.5, 0, 1))) : 0;
    const caught = n && n.on && g.time - c.seenAt < 2.5 && c.seenAt > 0;
    const act = n ? (n.on ? (caught ? 'alarm' : 'peek') : turn > 0.5 ? 'sit' : 'film') : 'film';
    bust(ctx, 'fpRight', W - e - 22 * s * turn, y, 3, turn > 0.5 ? -1 : 1, k, act, 0, t);
    if (n && !n.on) {
      const a = 0.5 + 0.5 * sin(t * 9), x = W - e - 62 * k / 2.4 - 22 * s * turn, yy = y - 70 * k / 2.4;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * a).toFixed(3) + ')'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) { const o = ((t * 1.6 + j / 3) % 1) * 18 * s; ctx.beginPath(); ctx.moveTo(x - o, yy - 6 * s + j * 6 * s); ctx.quadraticCurveTo(x - o - 6 * s, yy + j * 6 * s, x - o - 12 * s, yy - 4 * s + j * 6 * s); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    if (n && n.on && !caught) {
      ctx.font = '900 ' + (30 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * s; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.fillStyle = '#5a3418';
      const qy = y - 150 * k / 2.4 - 6 * s * sin(t * 5), qx = W - e - 50 * k / 2.4;
      ctx.strokeText('?', qx, qy); ctx.fillText('?', qx, qy);
    }
  }

  function buttonX(V, n) {
    return V.cx + (n - 1) * 116 * V.ks;
  }

  function desk(ctx, g, c, V, t) {
    const { W, H, s, ks, cx } = V, top = V.deskY;
    const gr = ctx.createLinearGradient(0, top, 0, H);
    gr.addColorStop(0, '#9a6238'); gr.addColorStop(1, '#6b4024');
    ctx.fillStyle = WOOD.pale; ctx.fillRect(-10, top - 8 * s, W + 20, 10 * s);
    ctx.fillStyle = gr; ctx.fillRect(-10, top, W + 20, H - top + 10);
    ctx.fillStyle = 'rgba(50,25,10,0.14)';
    for (let n = -14; n <= 14; n++) { const x0 = cx + n * 34 * s, x1 = cx + n * 90 * s; poly(ctx, [x0, top, x0 + 1.2 * s, top, x1 + 3 * s, H + 10, x1, H + 10]); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-10, top, W + 20, 6 * s);
  }

  function panel(ctx, g, c, V, t) {
    const { ks, cx } = V, top = V.deskY;
    const P = SIM(), i = c.round, st = i >= 0 ? P.state(c, i) : 'wait', open = st === 'open' && c.vote[i] < 0;
    const pw = 400 * ks, ph = 132 * ks, px = cx - pw / 2, py = top + 16 * ks;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, px + 4 * ks, py + 8 * ks, pw, ph, 14 * ks);
    ctx.fillStyle = '#2b2d31'; rr(ctx, px, py, pw, ph, 14 * ks);
    ctx.fillStyle = '#3a3d44'; rr(ctx, px + 4 * ks, py + 4 * ks, pw - 8 * ks, ph - 8 * ks, 11 * ks);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px + 14 * ks, py + 5 * ks, pw - 28 * ks, 2 * ks);
    lcd(ctx, c, V, t, px + 20 * ks, py + 12 * ks, pw - 40 * ks, 30 * ks, st);
    const by = py + 56 * ks, bw = 104 * ks, bh = 58 * ks;
    for (let n = 0; n < 3; n++) {
      const x = buttonX(V, n), C = BTN[n], mine = i >= 0 && c.vote[i] === n, sel = c.sel === n;
      const down = c.press && c.press.k === n && c.press.t < 0.3 ? sin(PI * c.press.t / 0.3) : 0, dim = i >= 0 && c.vote[i] >= 0 && !mine;
      if (sel && (open || st !== 'done')) {
        const p = 0.5 + 0.5 * sin(t * 8);
        ctx.fillStyle = 'rgba(255,216,74,' + (open ? 0.5 + 0.4 * p : 0.3).toFixed(3) + ')'; rr(ctx, x - bw / 2 - 6 * ks, by - 6 * ks, bw + 12 * ks, bh + 14 * ks, 14 * ks);
      }
      ctx.fillStyle = '#16171a'; rr(ctx, x - bw / 2, by + 4 * ks, bw, bh, 12 * ks);
      const lift = (1 - down) * 6 * ks;
      ctx.globalAlpha = dim ? 0.45 : 1;
      ctx.fillStyle = C.lo; rr(ctx, x - bw / 2, by + 4 * ks - lift + 4 * ks, bw, bh - 4 * ks, 12 * ks);
      ctx.fillStyle = mine ? C.lit : C.face; rr(ctx, x - bw / 2, by + 4 * ks - lift, bw, bh - 6 * ks, 12 * ks);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(ctx, x - bw / 2 + 8 * ks, by + 8 * ks - lift, bw - 16 * ks, 8 * ks, 4 * ks);
      ctx.fillStyle = mine && n !== 2 ? '#1d2318' : C.ink; ctx.font = '900 ' + (17 * ks).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(LABELS.plenary.buttons[n], x, by + 30 * ks - lift, bw - 12 * ks);
      ctx.globalAlpha = 1;
      if (mine) { ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.2 * sin(t * 6)).toFixed(3) + ')'; rr(ctx, x - bw / 2 - 3 * ks, by + 1 * ks - lift, bw + 6 * ks, bh, 13 * ks); }
    }
  }

  function lcd(ctx, c, V, t, x, y, w, h, st) {
    const P = SIM(), L = LABELS.plenary, B = L.board, i = max(0, c.round), ks = V.ks;
    ctx.fillStyle = '#0f1a12'; rr(ctx, x, y, w, h, 5 * ks);
    ctx.fillStyle = 'rgba(120,255,160,0.06)'; for (let yy = y + 2; yy < y + h; yy += 3 * ks) ctx.fillRect(x + 2, yy, w - 4, 1);
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + (13 * ks).toFixed(1) + 'px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = '#7dffa0';
    ctx.fillText(c.round < 0 ? B.wait : L.bills[i], x + 10 * ks, y + h / 2, w * 0.62);
    ctx.textAlign = 'right';
    const v = c.vote[i];
    let r = '';
    if (v >= 0) r = '✓ ' + L.buttons[v];
    else if (st === 'open') r = Math.ceil(P.ROUNDS[i].close - c.ft) + ' s';
    else if (st === 'done') r = B.none;
    ctx.fillStyle = v >= 0 ? '#ffffff' : st === 'open' && sin(t * 8) > 0 ? '#ffd84a' : '#7dffa0';
    ctx.fillText(r, x + w - 10 * ks, y + h / 2, w * 0.34);
  }

  function arm(ctx, x0, y0, x1, y1, w, sgn) {
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -sin(a), ny = cos(a);
    ctx.fillStyle = FUR.dark;
    ctx.beginPath();
    ctx.moveTo(x0 + nx * w, y0 + ny * w);
    ctx.quadraticCurveTo((x0 + x1) / 2 + nx * w * 1.1, (y0 + y1) / 2 + ny * w * 1.1, x1 + nx * w * 0.8, y1 + ny * w * 0.8);
    ctx.lineTo(x1 - nx * w * 0.8, y1 - ny * w * 0.8);
    ctx.quadraticCurveTo((x0 + x1) / 2 - nx * w * 1.1, (y0 + y1) / 2 - ny * w * 1.1, x0 - nx * w, y0 - ny * w);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = FUR.mid; ctx.lineWidth = w * 0.18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + nx * w * 0.45 * sgn, y0 + ny * w * 0.45 * sgn); ctx.quadraticCurveTo((x0 + x1) / 2 + nx * w * 0.5 * sgn, (y0 + y1) / 2 + ny * w * 0.5 * sgn, x1 + nx * w * 0.35 * sgn, y1 + ny * w * 0.35 * sgn); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function paw(ctx, x, y, k, rot, grip) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, 3, 8, 40, 26);
    ctx.fillStyle = FUR.dark; ell(ctx, 0, 4, 40, 30);
    ctx.fillStyle = FUR.mid; ell(ctx, -2, 0, 34, 24);
    ctx.fillStyle = FUR.light; ell(ctx, -8, -8, 14, 7, -0.3);
    for (let n = 0; n < 4; n++) {
      const tx = -21 + n * 14, ty = -22 + abs(n - 1.5) * 3;
      ctx.fillStyle = FUR.mid; ell(ctx, tx, ty, 8, 8);
      ctx.fillStyle = FUR.clawLo;
      ctx.beginPath(); ctx.moveTo(tx - 3.6, ty - 4); ctx.quadraticCurveTo(tx - 2, ty - 16 - grip * 4, tx + 1, ty - 18 - grip * 6); ctx.quadraticCurveTo(tx + 3, ty - 12, tx + 3.6, ty - 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = FUR.claw;
      ctx.beginPath(); ctx.moveTo(tx - 2.6, ty - 4); ctx.quadraticCurveTo(tx - 1.4, ty - 14 - grip * 4, tx + 1, ty - 17 - grip * 6); ctx.quadraticCurveTo(tx + 1.4, ty - 11, tx + 2, ty - 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function paws(ctx, c, V, t) {
    const { H, ks, cx, s } = V, top = V.deskY, i = c.round, P = SIM();
    const u = smooth(clamp((c.ft - c.selAt) / 0.16, 0, 1)), rx = lerp(buttonX(V, c.selFrom), buttonX(V, c.sel), u);
    const press = c.press && c.press.t < 0.3 ? sin(PI * c.press.t / 0.3) : 0;
    const by = top + 16 * ks + 56 * ks;
    const open = i >= 0 && P.state(c, i) === 'open' && c.vote[i] < 0;
    const dy = V.dk * 300 * ks;
    const ry = by + (open ? 66 * ks + 4 * ks * sin(t * 4) : 78 * ks + 2 * ks * sin(t * 1.7)) - press * 34 * ks + dy;
    const lx = min(buttonX(V, 0) - 150 * ks, rx - 170 * ks), ly = by + 70 * ks + 2 * ks * sin(t * 2.1) + dy;
    arm(ctx, lx - 60 * ks, min(H + 80 * ks, ly + 280 * ks), lx, ly + 20 * ks, 46 * ks, 1);
    paw(ctx, lx, ly, 1.15 * ks, 0.22, 0);
    arm(ctx, rx + 70 * ks, min(H + 80 * ks, ry + 280 * ks), rx + 4 * ks, ry + 24 * ks, 46 * ks, -1);
    paw(ctx, rx, ry, 1.15 * ks * (1 - 0.05 * press), -0.1 + 0.06 * (c.sel - 1), press);
  }

  function front(ctx, V, t) {
    const { W, H, s, dk } = V;
    if (dk <= 0.01) return;
    const top = H - dk * (H - (V.deskY - V.lift) - 14 * s);
    ctx.fillStyle = WOOD.dark; ctx.fillRect(-10, top, W + 20, H - top + 10);
    ctx.fillStyle = WOOD.pale; ctx.fillRect(-10, top - 6 * s, W + 20, 9 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-10, top + 3 * s, W + 20, 6 * s);
    ctx.fillStyle = WOOD.mid;
    const pw = 150 * s;
    for (let x = (W / 2) % pw - pw; x < W; x += pw) rr(ctx, x + 12 * s, top + 26 * s, pw - 24 * s, max(10, H - top - 50 * s), 8 * s);
    ctx.fillStyle = 'rgba(50,25,10,0.18)'; for (let x = 0; x < W; x += 9 * s) ctx.fillRect(x, top + 28 * s, 1, max(8, H - top - 56 * s));
    ctx.fillStyle = GOLD.base; rr(ctx, W / 2 - 30 * s, top + 40 * s, 60 * s, 16 * s, 3 * s);
    ctx.fillStyle = WOOD.deep; ctx.font = '800 ' + (10 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('151', W / 2, top + 48.5 * s);
    if (dk > 0.4) {
      const a = smooth((dk - 0.4) / 0.6);
      ctx.globalAlpha = a;
      for (const [x, r] of [[W / 2 - 120 * s, 0.1], [W / 2 + 120 * s, -0.1]]) paw(ctx, x, top + 26 * s, 0.9 * s, PI + r, 1);
      ctx.globalAlpha = 1;
    }
  }

  function viewfinder(ctx, g, c, V, t, T) {
    if (!T || T.T.kind !== 'camera' || !T.on) return;
    const { W, H, s } = V, m = 16 * s, L = 34 * s;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
    ctx.moveTo(W - m - L, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + L);
    ctx.moveTo(m, H - m - L); ctx.lineTo(m, H - m); ctx.lineTo(m + L, H - m);
    ctx.moveTo(W - m - L, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - L);
    ctx.stroke();
    const caught = g.time - c.seenAt < 2.5 && c.seenAt > 0;
    if (caught) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, min(W, H) * 0.3, W / 2, H / 2, hypot(W, H) * 0.6);
      vg.addColorStop(0, 'rgba(200,30,20,0)'); vg.addColorStop(1, 'rgba(200,30,20,0.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  function anchor(V, at) {
    const { s, W, cx } = V;
    if (at === 'board') return [V.bx, V.boardY + V.bh + 40 * s];
    if (at === 'cam') return V.port ? [W - 130 * s, V.boardY + 4 * s] : [clamp(V.camX + 90 * s, 110 * s, W - 110 * s), V.camY + 110 * s];
    if (at === 'right') return [W - (V.port ? 120 : 170) * s, V.deskY - 120 * s];
    if (at === 'paws') return [cx, V.hy + 40 * s];
    return [cx, V.deskY - 60 * s];
  }

  function floatsFP(ctx, g, V) {
    const fs = 17 * max(1, V.s);
    for (const f of g.floaters) {
      const [x, y] = anchor(V, f.at);
      ctx.globalAlpha = min(1, f.t * 1.5);
      label(ctx, f.text, x, y - (1.6 - f.t) * 22 * V.s, fs, f.color, 800, V.W - 20);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) ZS.render.props.bubble(ctx, V.cx - (V.port ? 120 : 250) * V.s, V.deskY + 20 * V.s - V.lift, g.bubble.text, g.bubble.t, 8, V.W - 8);
  }

  function hints(ctx, g, c, V, t, T) {
    const L = LABELS.plenary, P = SIM(), i = c.round;
    if (c.pointa) return;
    const y = V.deskY - V.lift - 30 * V.s;
    if (T) {
      const a = T.on ? 1 : 0.65 + 0.35 * sin(t * 10);
      ZS.prompt.draw(ctx, g, [['ArrowDown', L.duck]], V.cx, y, { a, size: 15 });
      return;
    }
    if (i >= 0 && c.ft > 6.5 && P.state(c, i) === 'open' && c.vote[i] < 0) ZS.prompt.draw(ctx, g, [[['ArrowLeft', 'ArrowRight'], L.choose], ['KeyC', L.vote]], V.cx, y, { size: 14 });
  }

  function banner(ctx, g, c, V) {
    const show = c.ft < 7 ? 1 - smooth((c.ft - 5.5) / 1.5) : 0;
    if (show <= 0.01 || c.pointa) return;
    const text = g.touch ? LABELS.plenary.bannerTouch : LABELS.plenary.banner, s = max(1, V.s);
    ctx.globalAlpha = show;
    ctx.font = '700 ' + (15 * s).toFixed(1) + 'px system-ui, sans-serif';
    const w = min(V.W - 24, ctx.measureText(text).width + 32), y = V.port ? V.boardY + V.bh + 12 * V.s : 12 * V.s;
    ctx.fillStyle = 'rgba(20,16,26,0.82)'; rr(ctx, V.W / 2 - w / 2, y, w, 34 * s, 17 * s);
    ctx.fillStyle = '#f6e7c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, V.W / 2, y + 17 * s, w - 20);
    ctx.globalAlpha = 1;
  }

  function news(ctx, c, V) {
    const P = SIM(), p = c.pointa;
    if (!p || p.t < P.POINTA.flash) return;
    const r = c.res[P.ROUNDS.length - 1], L = LABELS.plenary, s = max(0.9, V.s), a = smooth((p.t - P.POINTA.flash) / 0.25);
    const w = min(V.W - 24, 520 * s), x = V.W / 2 - w / 2, y = V.port ? V.hy - 40 * s : V.hy - 30 * s;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, x + 3, y + 4, w, 64 * s, 6 * s);
    ctx.fillStyle = '#d0312b'; rr(ctx, x, y, w, 26 * s, 6 * s);
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + (13 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(L.live, x + 12 * s, y + 13 * s, w - 24 * s);
    ctx.fillStyle = '#fffaf0'; rr(ctx, x, y + 24 * s, w, 40 * s, 6 * s);
    ctx.fillStyle = '#1d1d1d'; ctx.font = '800 ' + (17 * s).toFixed(1) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(L.hot[r && r.passed ? 0 : 1], V.W / 2, y + 44 * s, w - 24 * s);
    ctx.globalAlpha = 1;
  }

  function fp(g, ctx, viewW, H) {
    const c = g.pass.play, P = SIM(), p = c.pointa;
    const t = g.time - (p ? max(0, p.t - P.POINTA.flash) : 0);
    const V = layout(g, viewW, H, c), T = P.threat(c);
    const jolt = c.press && c.press.t < 0.2 ? sin(c.press.t * 60) * 1.2 * (1 - c.press.t / 0.2) : 0;
    ctx.save();
    ctx.translate(0, -V.lift * 0.12 + jolt);
    hall(ctx, g, c, V, t);
    board(ctx, c, V, t);
    lamp(ctx, c, V, t);
    balconyFP(ctx, g, c, V, t, T);
    stage(ctx, g, c, V, t);
    rowsFP(ctx, c, V, t);
    ctx.restore();
    ctx.save();
    ctx.translate(0, -V.lift + jolt);
    desk(ctx, g, c, V, t);
    neighbours(ctx, g, c, V, t, T);
    panel(ctx, g, c, V, t);
    paws(ctx, c, V, t);
    ctx.restore();
    front(ctx, V, t);
    hints(ctx, g, c, V, t, T);
    viewfinder(ctx, g, c, V, t, T);
    if (T && T.T.kind === 'camera') {
      if (T.on && sin(t * 8) > -0.4) {
        const f = V.camX > V.cx ? -1 : 1, x = V.camX + f * 64 * V.s, y = V.camY - 30 * V.s;
        ctx.fillStyle = '#ff3b30'; circle(ctx, x - 22 * V.s, y, 6 * V.s); label(ctx, 'REC', x + 6 * V.s, y, 15 * V.s, '#ff3b30', 900);
      }
    }
    news(ctx, c, V);
    banner(ctx, g, c, V);
    floatsFP(ctx, g, V);
    const f = (p && p.flash) || 0;
    if (f > 0) { ctx.fillStyle = 'rgba(255,255,250,' + (0.8 * f).toFixed(3) + ')'; ctx.fillRect(0, 0, viewW, H + 40); }
    const o = clamp(c.ft / P.INTRO.open, 0, 1);
    if (o < 1) {
      const x = V.cx, y = V.deskY - 120 * V.s, R = hypot(viewW, H) * smooth(o);
      ctx.fillStyle = '#151b22';
      ctx.beginPath(); ctx.rect(-10, -10, viewW + 20, H + 20); ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU, true); ctx.fill();
    }
  }

  function draw(g, ctx, viewW, offY) {
    const c = g.pass.play, H = g.viewH || 540;
    if (SIM().fpv(c)) { fp(g, ctx, viewW, H); return; }
    side(g, ctx, viewW, offY, H);
  }

  Object.assign(API, { draw });
})();
