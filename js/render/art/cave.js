(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, sstep, lerp, clamp } = ZS.util;
  const API = (ZS.caveArt = {});
  const SIM = () => ZS.sim.cave;
  const ROCK = { deep: '#17121f', wall: '#2a2236', wall2: '#33293f', floor: '#3f3443', floorTop: '#6b5a66', calcite: '#d9ccb4', calc2: '#bfae94', calc3: '#a08e78' };
  const figures = new Map();
  const geo = new Map();

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
  }

  const roofY = (x) => SIM().roofY(x);

  function back(ctx, g, viewW, offY) {
    const cam = g.cam, H = g.viewH || 540;
    const gr = ctx.createLinearGradient(0, -offY, 0, GY + 60);
    gr.addColorStop(0, ROCK.deep); gr.addColorStop(0.55, ROCK.wall); gr.addColorStop(1, '#3a2f40');
    ctx.fillStyle = gr; ctx.fillRect(0, -offY - 10, viewW, H + 40);
    const px = cam * 0.55;
    ctx.save(); ctx.translate(-px, 0);
    for (let c = Math.floor((px - 120) / 90); c <= Math.ceil((px + viewW + 120) / 90); c++) {
      const x = c * 90 + hash(c * 1.7) * 40, h = 120 + hash(c * 2.3) * 160, w = 40 + hash(c * 3.1) * 50;
      ctx.fillStyle = hash(c * 4.9) > 0.5 ? ROCK.wall2 : '#2f2639';
      ctx.beginPath(); ctx.moveTo(x - w, GY + 20); ctx.quadraticCurveTo(x - w * 0.7, GY - h, x, GY - h - 20); ctx.quadraticCurveTo(x + w * 0.7, GY - h, x + w, GY + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,100,130,0.18)'; ell(ctx, x - w * 0.2, GY - h * 0.6, w * 0.25, h * 0.25);
    }
    ctx.restore();
  }

  function cascades(ctx, x, w, time) {
    for (let i = 0; i < 5; i++) {
      const y = GY - 40 - i * 34, hw = w * (1 - i * 0.16) / 2;
      ctx.fillStyle = i % 2 ? ROCK.calc2 : ROCK.calcite;
      ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.quadraticCurveTo(x, y - 14, x + hw, y); ctx.lineTo(x + hw - 6, y + 22); ctx.quadraticCurveTo(x, y + 30, x - hw + 6, y + 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,170,190,0.35)'; ell(ctx, x, y - 2, hw * 0.8, 3.5);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.2 * sin(time * 3 + i)).toFixed(3) + ')'; ell(ctx, x - hw * 0.3, y - 3, hw * 0.2, 1.4);
    }
  }

  function roof(ctx, cam, viewW, offY, time) {
    const x0 = Math.floor((cam - 60) / 14) * 14, x1 = cam + viewW + 60;
    ctx.fillStyle = '#120e18';
    ctx.beginPath(); ctx.moveTo(x0, -offY - 20);
    for (let x = x0; x <= x1; x += 14) ctx.lineTo(x, roofY(x));
    ctx.lineTo(x1, -offY - 20); ctx.closePath(); ctx.fill();
    for (let c = Math.floor(x0 / 37); c * 37 < x1; c++) {
      const x = c * 37 + hash(c * 1.3) * 20, l = 14 + hash(c * 2.9) * 46, w = 3 + hash(c * 5.1) * 6, y = roofY(x) - 4;
      ctx.fillStyle = hash(c * 7.7) > 0.5 ? ROCK.calc2 : ROCK.calc3;
      poly(ctx, [x - w, y, x + w, y, x + 1, y + l, x - 1, y + l]);
      ctx.fillStyle = ROCK.calcite; poly(ctx, [x - w * 0.3, y, x + w * 0.1, y, x + 0.3, y + l * 0.85]);
      if (hash(c * 9.1) > 0.7) {
        const u = (time * 0.6 + hash(c)) % 1;
        ctx.fillStyle = 'rgba(190,225,245,' + (0.8 * (1 - u)).toFixed(3) + ')'; circle(ctx, x, y + l + 2 + u * 120, 1.6);
      }
    }
  }

  function floor(ctx, S, cam, viewW, time) {
    const x0 = Math.floor((cam - 40) / 12) * 12, x1 = cam + viewW + 40, W = S.cave.water;
    if (x1 > W[0] && x0 < W[1]) {
      ctx.fillStyle = '#0f1c26'; ctx.fillRect(W[0], GY - 4, W[1] - W[0], 170);
      ctx.fillStyle = '#1d4a60'; ctx.fillRect(W[0], GY + 14, W[1] - W[0], 150);
      ctx.strokeStyle = 'rgba(150,210,240,0.45)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = W[0] + 6; x < W[1] - 6; x += 26) { const u = (time * 50 + x * 3) % 26; ctx.moveTo(x + u - 13, GY + 18 + (x % 3) * 6); ctx.lineTo(x + u, GY + 18 + (x % 3) * 6); }
      ctx.stroke();
      for (const s of S.cave.stones) {
        ctx.fillStyle = '#5e5463'; ell(ctx, s, GY + 6, 30, 12);
        ctx.fillStyle = '#7d7181'; ell(ctx, s - 4, GY + 1, 24, 7);
        ctx.fillStyle = 'rgba(220,240,255,0.5)'; ell(ctx, s, GY + 14, 34, 3);
      }
    }
    const inWater = (x) => x > W[0] && x < W[1];
    ctx.fillStyle = ROCK.floor;
    ctx.beginPath(); ctx.moveTo(x0, GY + 200);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, inWater(x) ? GY + 40 : GY + 2 * sin(x * 0.05) + 1.5 * sin(x * 0.13 + 2));
    ctx.lineTo(x1, GY + 200); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ROCK.floorTop; ctx.lineWidth = 2.5;
    ctx.beginPath();
    let pen = false;
    for (let x = x0; x <= x1; x += 12) {
      if (inWater(x)) { pen = false; continue; }
      const y = GY + 2 * sin(x * 0.05) + 1.5 * sin(x * 0.13 + 2);
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
    for (let c = Math.floor(x0 / 53); c * 53 < x1; c++) {
      const x = c * 53 + hash(c * 3.3) * 30;
      if (inWater(x) || x < S.cave.gap) continue;
      const h = 6 + hash(c * 1.9) * 22, w = 4 + hash(c * 2.7) * 6;
      ctx.fillStyle = hash(c * 6.1) > 0.5 ? ROCK.calc2 : ROCK.calc3;
      poly(ctx, [x - w, GY + 2, x - w * 0.4, GY - h, x + w * 0.4, GY - h, x + w, GY + 2]);
    }
  }

  function walkway(ctx, S, cam, viewW) {
    const [a, z] = S.cave.walk, x0 = max(a, cam - 40), x1 = min(z, cam + viewW + 40);
    if (x1 <= x0) return;
    ctx.fillStyle = '#6b6370'; ctx.fillRect(x0, GY - 2, x1 - x0, 8);
    ctx.fillStyle = '#857c89'; ctx.fillRect(x0, GY - 3, x1 - x0, 3);
    ctx.strokeStyle = '#9a9aa2'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x0, GY - 54); ctx.lineTo(x1, GY - 54); ctx.moveTo(x0, GY - 30); ctx.lineTo(x1, GY - 30); ctx.stroke();
    ctx.lineWidth = 3;
    for (let x = Math.ceil(x0 / 70) * 70; x < x1; x += 70) { ctx.beginPath(); ctx.moveTo(x, GY - 2); ctx.lineTo(x, GY - 56); ctx.stroke(); }
    for (let x = Math.ceil(x0 / 210) * 210 + 90; x < x1; x += 210) {
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 3, GY - 216, 6, 8);
      ctx.fillStyle = 'rgba(255,222,150,0.95)'; circle(ctx, x, GY - 204, 4.5);
    }
  }

  function gate(ctx, S, t) {
    const x = S.cave.gap;
    ctx.strokeStyle = '#9a9aa2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, GY - 2); ctx.lineTo(x, GY - 60); ctx.stroke();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, GY - 52); ctx.quadraticCurveTo(x + 30, GY - 34 + sin(t * 1.4) * 2, x + 60, GY - 50); ctx.stroke();
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(x + 66, GY - 92, 4, 92);
    ctx.fillStyle = '#c0392b'; rr(ctx, x + 18, GY - 116, 104, 26, 4);
    ctx.fillStyle = '#fff'; ctx.font = '900 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.cave.closed, x + 70, GY - 103, 96);
  }

  function lamp(ctx, S, c, t) {
    if (c.lamp) return;
    const x = S.cave.lamp, y = GY - 6;
    ctx.fillStyle = 'rgba(255,240,170,' + (0.25 + 0.2 * sin(t * 4)).toFixed(3) + ')'; ell(ctx, x, y, 26, 10);
    ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x - 2, y, 12, 5, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#f08c00'; rr(ctx, x + 6, y - 6, 12, 10, 3);
    ctx.fillStyle = '#fff3c4'; circle(ctx, x + 18, y - 1, 3);
    label(ctx, '✦', x + 22, y - 18 - abs(sin(t * 3)) * 4, 12, '#ffe066');
  }

  function bones(ctx, S, g) {
    const x = S.cave.bones, t = g.time;
    ctx.fillStyle = '#2c2531'; ctx.fillRect(x - 70, GY - 22, 140, 22);
    ctx.fillStyle = 'rgba(200,225,240,0.16)'; ctx.fillRect(x - 66, GY - 110, 132, 88);
    ctx.strokeStyle = 'rgba(220,235,245,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 66, GY - 110, 132, 88);
    ctx.strokeStyle = '#e9dfc9'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 46, GY - 62); ctx.quadraticCurveTo(x - 6, GY - 76, x + 34, GY - 60);
    for (let i = 0; i < 7; i++) { const rx = x - 36 + i * 10; ctx.moveTo(rx, GY - 66 - (i < 4 ? i : 7 - i)); ctx.quadraticCurveTo(rx + 3, GY - 52, rx - 2, GY - 44); }
    ctx.moveTo(x - 40, GY - 60); ctx.lineTo(x - 44, GY - 30); ctx.moveTo(x - 30, GY - 60); ctx.lineTo(x - 26, GY - 30);
    ctx.moveTo(x + 22, GY - 60); ctx.lineTo(x + 18, GY - 30); ctx.moveTo(x + 30, GY - 60); ctx.lineTo(x + 34, GY - 30);
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#e9dfc9';
    ctx.beginPath(); ctx.moveTo(x + 34, GY - 66); ctx.quadraticCurveTo(x + 52, GY - 78, x + 62, GY - 64); ctx.lineTo(x + 58, GY - 56); ctx.quadraticCurveTo(x + 46, GY - 54, x + 36, GY - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c2531'; circle(ctx, x + 48, GY - 67, 2.6);
    ctx.fillStyle = '#8a2b22'; ctx.fillRect(x - 54, GY - 140, 108, 22);
    ctx.fillStyle = '#f3e3c0'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.cave.dragon, x, GY - 129, 100);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.06 + 0.04 * sin(t * 2)).toFixed(3) + ')'; ctx.fillRect(x - 60, GY - 106, 24, 80);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(S.cave.exit - 40, GY - 70, 4, 70);
    ctx.fillStyle = '#f6f1e3'; ctx.fillRect(S.cave.exit - 110, GY - 88, 144, 20);
    ctx.fillStyle = '#2a2a2a'; ctx.font = '700 9px system-ui, sans-serif'; ctx.fillText(LABELS.cave.back, S.cave.exit - 38, GY - 78, 138);
  }

  function column(ctx, s) {
    const top = roofY(s.x), w = s.w, x = s.x;
    let G = geo.get(s);
    if (!G) {
      const body = new Path2D(), shine = new Path2D(), rings = new Path2D();
      body.moveTo(x - w / 2 - 8, GY + 4);
      body.bezierCurveTo(x - w / 2, GY - 40, x - w * 0.36, GY - s.h * 0.75, x - w * 0.33, GY - s.h);
      body.bezierCurveTo(x - w * 0.3, top + 80, x - w * 0.45, top + 30, x - w * 0.55, top - 6);
      body.lineTo(x + w * 0.55, top - 6);
      body.bezierCurveTo(x + w * 0.45, top + 30, x + w * 0.3, top + 80, x + w * 0.33, GY - s.h);
      body.bezierCurveTo(x + w * 0.36, GY - s.h * 0.75, x + w / 2, GY - 40, x + w / 2 + 8, GY + 4);
      body.closePath();
      shine.moveTo(x - w * 0.3, GY - 6); shine.quadraticCurveTo(x - w * 0.12, GY - s.h * 0.6, x - w * 0.08, top + 40);
      for (let i = 1; i < 6; i++) { const y = GY - i * (s.h / 6); rings.moveTo(x - w * (0.5 - i * 0.05), y); rings.quadraticCurveTo(x, y + 5, x + w * (0.5 - i * 0.05), y); }
      G = { body, shine, rings };
      geo.set(s, G);
    }
    ctx.fillStyle = ROCK.calc2; ctx.fill(G.body);
    ctx.strokeStyle = 'rgba(110,90,70,0.35)'; ctx.lineWidth = 1.4; ctx.stroke(G.rings);
    ctx.strokeStyle = 'rgba(255,248,230,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(G.shine); ctx.lineCap = 'butt';
  }

  function group(ctx, g, c) {
    const T = SIM().TOUR, t = g.time, A = c.alert, b = g.bear, st = A ? 'idle' : SIM().walking(c) ? 'walk' : 'idle';
    if (c.guide < T.gone) return;
    const look = A && !A.doubt, gd = A ? (look ? Math.sign(b.x - c.guide) || -1 : (sin(t * 1.7) > 0 ? -1 : 1)) : st === 'walk' ? -1 : 1;
    for (let i = 9; i >= 0; i--) {
      const x = c.guide + i * 23 + (i % 2) * 5;
      if (i === 0) {
        person(ctx, 'caveGuide', 'aide', x, gd, st, t, { scared: !!A });
        ctx.fillStyle = '#fff3c4'; circle(ctx, x + gd * 3, GY - 82, 2.8);
        continue;
      }
      const fd = look ? Math.sign(b.x - x) || -1 : A ? (hash(i * 3.7 + Math.floor(t * 0.8)) > 0.5 ? 1 : -1) : -1;
      person(ctx, 'caveT' + i, 'tourist', x, fd, look && i % 3 !== 1 ? 'film' : st, t, { look: i, hiker: true, empty: !look, scared: !!A });
    }
    if (A && A.expose > 0.15) {
      const k = Math.min(1, A.expose / SIM().ALERT.call), x = c.guide, y = GY - 128;
      ctx.fillStyle = 'rgba(20,16,26,0.85)'; rr(ctx, x - 30, y - 8, 60, 16, 8);
      ctx.fillStyle = '#e03131'; rr(ctx, x - 26, y - 4, 52 * k, 8, 4);
      label(ctx, '📞', x - 42, y + 1, 14, '#fff');
    }
  }

  function cover(ctx, g, c, S) {
    if (!c.warn) return;
    const b = g.bear, t = g.time;
    let best = null;
    for (const s of S.covers) if (s.x < S.cave.gap && (!best || abs(s.x - b.x) < abs(best.x - b.x))) best = s;
    if (!best) return;
    const p = 0.5 + 0.5 * sin(t * 7);
    ctx.fillStyle = 'rgba(255,226,140,' + (0.1 + 0.12 * p).toFixed(3) + ')';
    ell(ctx, best.x, GY - best.h * 0.6, best.w * 0.75, best.h * 0.75);
    ctx.fillStyle = 'rgba(255,226,140,' + (0.7 + 0.3 * p).toFixed(3) + ')';
    const y = GY - best.h - 34 - 6 * p;
    poly(ctx, [best.x - 11, y, best.x + 11, y, best.x, y + 14]);
    ctx.fillRect(best.x - 4, y - 14, 8, 14);
  }

  function passages(ctx, S, cam, viewW, offY) {
    for (const [a, z] of S.cave.low) {
      if (z + 60 < cam || a - 60 > cam + viewW) continue;
      const top = GY - 72;
      ctx.fillStyle = '#3a3043';
      ctx.beginPath(); ctx.moveTo(a - 50, -offY - 20);
      ctx.lineTo(a - 50, roofY(a - 50)); ctx.quadraticCurveTo(a - 30, top - 40, a, top + 4);
      for (let x = a; x <= z; x += 18) ctx.lineTo(x, top + 2 * sin(x * 0.11));
      ctx.quadraticCurveTo(z + 30, top - 40, z + 50, roofY(z + 50)); ctx.lineTo(z + 50, -offY - 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#a99cb4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(a, top + 4);
      for (let x = a; x <= z; x += 18) ctx.lineTo(x, top + 2 * sin(x * 0.11));
      ctx.stroke();
      for (let x = a + 14; x < z - 8; x += 26) {
        const l = 8 + hash(x * 0.3) * 10;
        ctx.fillStyle = ROCK.calc3; poly(ctx, [x - 4, top + 1, x + 4, top + 1, x, top + l]);
      }
    }
  }

  function ledges(ctx, S, vis) {
    for (const l of S.logs) {
      if (!vis(l.x, l.w)) continue;
      const a = l.x - l.w / 2, z = l.x + l.w / 2, top = GY - l.h;
      ctx.fillStyle = ROCK.floor;
      ctx.beginPath(); ctx.moveTo(a - 10, GY + 6); ctx.quadraticCurveTo(a - 4, top + 20, a + 6, top + 2);
      for (let x = a + 6; x <= z - 6; x += 14) ctx.lineTo(x, top + 1.5 * sin(x * 0.09));
      ctx.lineTo(z - 6, top + 2); ctx.quadraticCurveTo(z + 4, top + 20, z + 10, GY + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(a + 4, top + 16, l.w - 8, l.h - 16);
      ctx.strokeStyle = ROCK.floorTop; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(a + 6, top + 2); for (let x = a + 6; x <= z - 6; x += 14) ctx.lineTo(x, top + 1.5 * sin(x * 0.09)); ctx.stroke();
      ctx.strokeStyle = 'rgba(20,14,24,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < l.w / 50; i++) { const x = a + 20 + i * 50 + hash(l.x + i) * 20; ctx.moveTo(x, top + 14); ctx.lineTo(x + 6, top + 30); ctx.lineTo(x + 2, top + 44); }
      ctx.stroke();
      ctx.fillStyle = ROCK.calc3;
      for (let i = 0; i < l.w / 40; i++) { const x = a + 14 + i * 40 + hash(l.x * 2 + i) * 14; poly(ctx, [x - 4, top + 2, x + 4, top + 2, x, top - 6 - hash(i + l.x) * 6]); }
    }
  }

  function brook(ctx, S, b, t) {
    const [a, z] = S.cave.brook;
    ctx.fillStyle = 'rgba(70,140,180,0.55)'; ctx.fillRect(a - 30, GY - 3, z - a + 60, 7);
    ctx.strokeStyle = 'rgba(190,230,250,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = a - 24; x < z + 24; x += 22) { const u = (t * 40 + x * 2) % 22; ctx.moveTo(x + u - 8, GY + 1); ctx.lineTo(x + u, GY + 1); }
    ctx.stroke();
    if (b.crouch && b.moving && b.x > a - 30 && b.x < z + 30) {
      ctx.fillStyle = 'rgba(200,235,250,0.8)';
      for (let i = 0; i < 6; i++) {
        const k = (t * 3 + i / 6) % 1, h = hash(Math.floor(t * 3 + i / 6) * 7.1 + i);
        circle(ctx, b.x + (h - 0.5) * 60, GY - 4 - 18 * sin(k * PI), 1.6 + h);
      }
    }
  }

  function hall(ctx, S, t) {
    const [a, z] = S.cave.hall, m = (a + z) / 2;
    ctx.fillStyle = 'rgba(160,140,170,0.08)'; ell(ctx, m, GY - 200, (z - a) / 2, 190);
    for (const [x, w, h] of [[a + 70, 70, 230], [m + 40, 90, 280], [z - 60, 60, 200]]) {
      const top = roofY(x) - 6;
      ctx.fillStyle = 'rgba(217,204,180,0.55)';
      ctx.beginPath(); ctx.moveTo(x - w / 2, top);
      for (let i = 0; i <= 8; i++) { const u = i / 8; ctx.lineTo(x - w / 2 + u * w, top + h * (0.55 + 0.45 * sin(u * PI)) - (i % 2) * 18); }
      ctx.lineTo(x + w / 2, top); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 14; i++) {
      const x = a + 30 + hash(i * 4.1) * (z - a - 60), y = roofY(x) + 30 + hash(i * 2.3) * 60;
      ctx.fillStyle = 'rgba(200,230,255,' + (0.25 + 0.35 * abs(sin(t * 1.3 + i))).toFixed(3) + ')';
      circle(ctx, x, y, 1.6);
    }
  }

  function bat(ctx, x, y, s, sd, t) {
    const sway = sin(t * 1.4 + sd * 7) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway); ctx.scale(s, s);
    ctx.strokeStyle = '#1a1416'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 2); ctx.stroke();
    ctx.fillStyle = '#4a3a34'; ell(ctx, 0, 9, 4.2, 7);
    ctx.fillStyle = '#2f2420'; poly(ctx, [-4.2, 6, -5.6, 13, -2.4, 16, -1, 9]); poly(ctx, [4.2, 6, 5.6, 13, 2.4, 16, 1, 9]);
    ctx.fillStyle = '#5c4a42'; circle(ctx, 0, 16, 2.8);
    poly(ctx, [-2.4, 18, -2.2, 21.5, -0.6, 18.6]); poly(ctx, [2.4, 18, 2.2, 21.5, 0.6, 18.6]);
    ctx.restore();
  }

  function flyer(ctx, x, y, w, t, sd) {
    const f = sin(t * 22 + sd * 5);
    ctx.fillStyle = '#2b2026';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - w * 0.6, y - w * 0.4 * f - 2, x - w, y + w * 0.2 * f); ctx.quadraticCurveTo(x - w * 0.4, y + 2, x, y + 2);
    ctx.quadraticCurveTo(x + w * 0.4, y + 2, x + w, y + w * 0.2 * f); ctx.quadraticCurveTo(x + w * 0.6, y - w * 0.4 * f - 2, x, y); ctx.fill();
    circle(ctx, x, y + 1, 2.4);
  }

  function colonies(ctx, c, g) {
    const t = g.time;
    for (const o of c.bats) {
      const top = roofY(o.x) + 8;
      if (o.state === 'gone') continue;
      if (o.state === 'fly') {
        for (let i = 0; i < o.n - o.counted; i++) {
          const u = o.t + i * 0.08, sd = hash(o.id * 9 + i);
          flyer(ctx, o.x + (i - o.n / 2) * 10 + u * (160 + sd * 160) * (sd > 0.5 ? 1 : -1), top + 20 + sin(u * 4 + i) * 30 - u * 60, 9 + sd * 4, t, sd);
        }
        continue;
      }
      for (let i = 0; i < o.n; i++) {
        const bx = o.x + (i - (o.n - 1) / 2) * 17, by = top + (i % 2) * 7 + hash(o.id * 3 + i) * 4;
        bat(ctx, bx, by, 1.35, hash(o.id + i), t);
        if (i < o.counted) { ctx.fillStyle = '#7ad17a'; circle(ctx, bx, by + 35, 3); }
      }
      if (o.counted > 0 || c.count === o) label(ctx, o.counted + '/' + o.n, o.x, top + 58, 14, o.state === 'done' ? '#2f7d4f' : '#e8a400');
      if (o.state === 'sleep' && abs(g.bear.x - o.x) < 180) {
        ctx.fillStyle = 'rgba(240,240,255,' + (0.4 + 0.3 * sin(t * 2)).toFixed(3) + ')';
        ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('z z', o.x + o.n * 9, top + 4 - ((t * 8) % 10));
      }
    }
  }

  function head(b) {
    const d = b.dir < 0 ? -1 : 1, low = b.crouch ? 18 : 0;
    return [b.x + d * 46, b.y - 62 + low];
  }

  function headlamp(ctx, c, b) {
    if (!c.lamp || b.hiding || c.pose) return;
    const R = SIM().LAMP.range, L = ZS.bearLamp;
    let hx, hy, ux, uy;
    if (L && L.b === b && ctx.getTransform) {
      const m = ctx.getTransform(), det = m.a * m.d - m.b * m.c;
      hx = (m.d * (L.x - m.e) - m.c * (L.y - m.f)) / det; hy = (-m.b * (L.x - m.e) + m.a * (L.y - m.f)) / det;
      ux = (m.d * L.dx - m.c * L.dy) / det; uy = (-m.b * L.dx + m.a * L.dy) / det;
    } else {
      [hx, hy] = head(b); ux = b.dir < 0 ? -1 : 1; uy = 0;
    }
    const n = Math.hypot(ux, uy) || 1;
    ux /= n; uy /= n;
    const px = -uy, py = ux, ex = hx + ux * R, ey = hy + uy * R;
    const gr = ctx.createLinearGradient(hx, hy, ex, ey);
    gr.addColorStop(0, 'rgba(255,246,200,0.36)'); gr.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(hx + px * 2.5, hy + py * 2.5); ctx.lineTo(ex + px * 95, ey + py * 95); ctx.lineTo(ex - px * 95, ey - py * 95); ctx.lineTo(hx - px * 2.5, hy - py * 2.5); ctx.closePath(); ctx.fill();
  }

  function statue(ctx, g, c, b, withBear) {
    const s = c.statue || (c.statue = { who: {} }), d = b.dir < 0 ? -1 : 1, t = g.time;
    const who = Object.assign(s.who, b, { rear: 1, moving: false, running: false, hiding: null, crouch: false, vx: 0, dir: d });
    withBear(ZS.drawBear, who, 1);
    const x = b.x - d * 6, base = b.y + 4, top = b.y - 62;
    const gr = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
    gr.addColorStop(0, ROCK.calc3); gr.addColorStop(0.35, ROCK.calcite); gr.addColorStop(0.7, ROCK.calc2); gr.addColorStop(1, ROCK.calc3);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x - 52, base);
    ctx.bezierCurveTo(x - 44, base - 40, x - 30, top + 40, x - 24, top + 8);
    for (let i = 0; i <= 6; i++) { const u = i / 6, xx = x - 24 + u * 48; ctx.lineTo(xx, top + 8 + (i % 2 ? 10 : -4) + hash(i * 3.1) * 6); }
    ctx.bezierCurveTo(x + 30, top + 40, x + 44, base - 40, x + 52, base);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(110,90,70,0.32)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) { const y = base - i * 17, w = 50 - i * 7; ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + 6, x + w, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,230,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 20, base - 8); ctx.quadraticCurveTo(x - 12, top + 40, x - 10, top + 14); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(217,204,180,0.85)';
    for (let i = 0; i < 4; i++) { const xx = x - 18 + i * 12, l = 8 + hash(i * 2.7) * 10; poly(ctx, [xx - 3, top + 10, xx + 3, top + 10, xx, top + 10 + l]); }
    const k = (t * 0.7) % 1;
    ctx.fillStyle = 'rgba(190,225,245,' + (0.8 * (1 - k)).toFixed(3) + ')'; circle(ctx, x + 6, top + 18 + k * 40, 1.8);
  }



  function tallyMark(ctx, g, c, b) {
    const o = c.count, t = g.time, top = roofY(o.x) + 8;
    for (let i = 0; i < 3; i++) {
      const k = (o.k + i / 3) % 1;
      ctx.fillStyle = 'rgba(246,231,196,' + (0.5 * (1 - k)).toFixed(3) + ')';
      circle(ctx, o.x + (i - 1) * 16, top + 40 + k * 30, 1.5);
    }
    label(ctx, String(o.counted + 1), b.x + 34 * (b.dir < 0 ? -1 : 1), b.y - 178 - sin(t * 9) * 2, 15, '#f6e7c4');
  }

  function bear(ctx, g, c, S, withBear) {
    const b = g.bear;
    for (const s of S.covers) {
      if (b.hideTree === s && b.hideBlend > 0) {
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: s }));
        withBear(ZS.drawBearBehindTree, who, b.hideBlend);
      }
    }
    if (c.pose) { statue(ctx, g, c, b, withBear); return; }
    const rest = 1 - (b.hideBlend || 0);
    if (rest > 0.01) withBear(ZS.drawBear, b, rest);
    if (c.count) tallyMark(ctx, g, c, b);
  }

  function sink(ctx, S, c, b) {
    const k = c.sink, W = S.cave.water;
    if (!k) return;
    const u = clamp(k.t / SIM().SINK.t, 0, 1), x0 = max(W[0], k.x - 90), x1 = min(W[1], k.x + 90);
    ctx.fillStyle = 'rgba(29,74,96,0.88)'; ctx.fillRect(x0, GY + 6, x1 - x0, 40);
    ctx.fillStyle = 'rgba(15,28,38,0.6)'; ctx.fillRect(x0, GY + 6, x1 - x0, 5);
    for (let i = 0; i < 3; i++) {
      const r = (u * 1.4 + i * 0.3) % 1;
      ctx.strokeStyle = 'rgba(190,230,250,' + (0.7 * (1 - r)).toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(k.x, GY + 8, 20 + r * 70, 4 + r * 9, 0, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(205,235,250,0.9)';
    for (let i = 0; i < 16; i++) {
      const h = hash(k.x * 0.37 + i * 7.3), q = hash(i * 3.1 + k.x * 0.11), e = u * (1.1 + q * 0.6);
      if (e > 1) continue;
      const vx = (h - 0.5) * 220, vy = 260 + q * 240, y = GY + 6 - (vy * e * 0.55 - 210 * e * e);
      if (y < GY + 8) circle(ctx, k.x + vx * e * 0.55, y, 1.6 + 2.4 * (1 - e) * q);
    }
    for (let i = 0; i < 5; i++) {
      const r = (k.t * 1.6 + hash(i * 5.7)) % 1;
      ctx.fillStyle = 'rgba(205,235,250,' + (0.6 * (1 - r)).toFixed(3) + ')';
      circle(ctx, k.x + (hash(i * 2.9) - 0.5) * 50 + sin(k.t * 9 + i) * 3, GY + 40 - r * 32, 2 + hash(i * 1.3) * 2);
    }
  }

  function shade(S, c, x, b) {
    const V = S.cave.vault, L = SIM().LAMP;
    let a = lerp(0.22, 0.88, sstep(S.cave.gap - 40, S.cave.gap + 80, x));
    a = lerp(a, 0.42, sstep(V[0], V[0] + 160, x));
    if (c.lamp) {
      const d = (x - b.x) * (b.dir < 0 ? -1 : 1);
      if (d > -40 && d < L.range + 40) a = min(a, lerp(0.3, a, sstep(L.range * 0.6, L.range + 40, d)));
    }
    return min(a, lerp(0.45, a, sstep(40, 140, abs(x - b.x))));
  }

  function darkness(ctx, S, c, cam, viewW, offY, H, b) {
    const n = 60, gr = ctx.createLinearGradient(cam, 0, cam + viewW, 0);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      gr.addColorStop(u, 'rgba(6,4,12,' + shade(S, c, cam + u * viewW, b).toFixed(3) + ')');
    }
    ctx.fillStyle = gr;
    ctx.fillRect(cam - 2, -offY - 10, viewW + 4, H + 40);
    const T = SIM().TOUR, A = c.alert;
    if (c.guide > T.gone && c.guide < cam + viewW + 300 && SIM().walking(c)) {
      const x = c.guide + 6, y = GY - 80, len = T.light + (c.suspect ? SIM().ALERT.wider : 0);
      const ang = A && !A.doubt ? Math.atan2(b.y - 70 - y, b.x - x) : A ? PI - 0.25 + 0.5 * sin(c.t * 2.3) : PI + 0.12;
      const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, ex = x + ux * len, ey = y + uy * len, w = len * 0.42;
      const gl = ctx.createLinearGradient(x, y, ex, ey);
      gl.addColorStop(0, 'rgba(255,244,200,' + (A ? 0.42 : 0.34) + ')'); gl.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(x + px * 3, y + py * 3); ctx.lineTo(ex + px * w, ey + py * w); ctx.lineTo(ex - px * w, ey - py * w); ctx.lineTo(x - px * 3, y - py * 3); ctx.closePath(); ctx.fill();
    } else if (c.guide > T.gone && c.guide < cam + viewW + 300) {
      const x = c.guide + 6, y = GY - 84, top = roofY(x + 140) + 20;
      const gl = ctx.createLinearGradient(x, y, x + 140, top);
      gl.addColorStop(0, 'rgba(255,244,200,0.3)'); gl.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 70, top); ctx.lineTo(x + 230, top + 10); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill();
    }
  }

  function eyes(ctx, g, cam, viewW) {
    const t = g.time;
    for (let c = Math.floor(cam / 230); c * 230 < cam + viewW; c++) {
      if (hash(c * 2.2) < 0.55) continue;
      const x = c * 230 + hash(c * 3.7) * 120, y = roofY(x) + 12;
      if (((t * 0.4 + hash(c)) % 1) < 0.04) continue;
      ctx.fillStyle = 'rgba(255,214,90,0.85)'; circle(ctx, x - 1.6, y + 9, 1.1); circle(ctx, x + 1.6, y + 9, 1.1);
    }
  }

  const HINT = { crawl: ['ArrowDown', 'crouch'], jump: ['ArrowUp', 'jump'], climb: ['ArrowUp', 'jump'], count: ['KeyC', 'count'], hide: ['ArrowDown', 'hide'] };

  function hint(ctx, g, c, viewW) {
    const k = SIM().hint(g, c), b = g.bear;
    const one = (key, text, skill) => Object.assign([key, text], { skill, tip: true });
    const parts = k === 'hide' ? [one('ArrowDown', LABELS.cave.hint.hide, 'cavehide'), one('KeyC', LABELS.cave.hint.statue, 'cavestatue')]
      : k ? [one(HINT[k][0], LABELS.cave.hint[k], 'cave' + k)] : null;
    ZS.prompt.show(ctx, g, parts && { parts, x: b.x, y: GY + 6 }, { hang: true, lo: g.cam + 8, hi: g.cam + viewW - 8 });
  }

  function overlays(ctx, g, viewW, offY) {
    const b = g.bear, P = ZS.render.props;
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.min(1, f.t);
      label(ctx, f.text, f.x, Math.max(-offY + 12, f.y - (1.6 - f.t) * 30), 16, f.color);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) P.bubble(ctx, b.x, GY - 180, g.bubble.text, g.bubble.t, g.cam + 8, g.cam + viewW - 8);
  }

  function banner(ctx, g, c, viewW, offY) {
    c.warnA = clamp((c.warnA || 0) + (c.warn ? 0.08 : -0.05), 0, 1);
    const show = max(c.t < 9 ? 1 - smooth((c.t - 7.5) / 1.5) : 0, c.warnA);
    if (show <= 0.01) return;
    const text = c.warnA > 0.01 ? (g.touch ? LABELS.cave.warnTouch : LABELS.cave.warn) : g.touch ? LABELS.cave.bannerTouch : LABELS.cave.banner;
    ctx.globalAlpha = show;
    ctx.font = '700 15px system-ui, sans-serif';
    const w = min(viewW - 24, ctx.measureText(text).width + 32);
    ctx.fillStyle = c.warnA > 0.01 ? 'rgba(150,40,30,' + (0.82 + 0.12 * sin(g.time * 8)).toFixed(3) + ')' : 'rgba(20,16,26,0.82)'; rr(ctx, viewW / 2 - w / 2, -offY + 70, w, 34, 17);
    ctx.fillStyle = '#f6e7c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, viewW / 2, -offY + 87, w - 20);
    ctx.globalAlpha = 1;
  }

  function tally(ctx, c, viewW, offY) {
    const n = SIM().counted(c), text = LABELS.cave.tally(n, c.total);
    ctx.font = '800 15px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 30, x = viewW - w / 2 - 14, y = -offY + 96;
    ctx.fillStyle = 'rgba(20,16,26,0.8)'; rr(ctx, x - w / 2, y - 15, w, 30, 15);
    ctx.fillStyle = n >= c.total ? '#8fe08f' : '#f6e7c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function draw(g, ctx, viewW, offY) {
    const S = g.level, c = g.chopok.pass.play, cam = g.cam, H = g.viewH || 540, b = g.bear, t = g.time;
    const vis = (x, m) => x > cam - m && x < cam + viewW + m;
    const hurt = b.inv > 0 ? 0.45 + 0.35 * Math.cos(t * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, t); ctx.globalAlpha = 1; };
    ctx.save();
    ctx.translate(0, offY);
    back(ctx, g, viewW, offY);
    ctx.translate(-Math.round(cam), 0);
    if (vis(400, 200)) cascades(ctx, 400, 150, t);
    if (vis(640, 200)) cascades(ctx, 640, 110, t + 1);
    if (vis((S.cave.hall[0] + S.cave.hall[1]) / 2, 400)) hall(ctx, S, t);
    floor(ctx, S, cam, viewW, t);
    ledges(ctx, S, vis);
    if (vis(S.cave.brook[0], 300) || vis(S.cave.brook[1], 300)) brook(ctx, S, b, t);
    walkway(ctx, S, cam, viewW);
    if (vis(S.cave.gap, 200)) gate(ctx, S, t);
    if (vis(S.cave.bones, 160)) bones(ctx, S, g);
    roof(ctx, cam, viewW, offY, t);
    lamp(ctx, S, c, t);
    group(ctx, g, c);
    bear(ctx, g, c, S, withBear);
    sink(ctx, S, c, b);
    for (const s of S.covers) if (vis(s.x, 80)) column(ctx, s);
    cover(ctx, g, c, S);
    passages(ctx, S, cam, viewW, offY);
    darkness(ctx, S, c, cam, viewW, offY, H, b);
    headlamp(ctx, c, b);
    colonies(ctx, c, g);
    eyes(ctx, g, cam, viewW);
    overlays(ctx, g, viewW, offY);
    hint(ctx, g, c, viewW);
    ctx.restore();
    ctx.save(); ctx.translate(0, offY);
    banner(ctx, g, c, viewW, offY);
    tally(ctx, c, viewW, offY);
    ctx.restore();
    if (c.flash > 0) { ctx.fillStyle = 'rgba(255,255,250,' + (0.6 * c.flash).toFixed(3) + ')'; ctx.fillRect(0, 0, viewW, H + 40); }
  }

  Object.assign(API, { draw, roofY });
})();
