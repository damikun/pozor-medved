(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, sstep, lerp } = ZS.util;
  const API = (ZS.caveArt = {});
  const SIM = () => ZS.sim.cave;
  const ROOF = GY - 330;
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

  function roofY(x) {
    return ROOF + 26 * sin(x * 0.006) + 18 * sin(x * 0.017 + 1.3) + 10 * sin(x * 0.043);
  }

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
      body.bezierCurveTo(x - w / 2, GY - 40, x - w * 0.22, GY - s.h * 0.75, x - w * 0.18, GY - s.h);
      body.bezierCurveTo(x - w * 0.16, top + 80, x - w * 0.45, top + 30, x - w * 0.55, top - 6);
      body.lineTo(x + w * 0.55, top - 6);
      body.bezierCurveTo(x + w * 0.45, top + 30, x + w * 0.16, top + 80, x + w * 0.18, GY - s.h);
      body.bezierCurveTo(x + w * 0.22, GY - s.h * 0.75, x + w / 2, GY - 40, x + w / 2 + 8, GY + 4);
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
    const T = SIM().TOUR, t = g.time;
    if (c.t < T.start || c.guide < T.gone) return;
    for (let i = 9; i >= 0; i--) {
      const x = c.guide + i * 23 + (i % 2) * 5;
      if (i === 0) {
        person(ctx, 'caveGuide', 'aide', x, -1, 'walk', t);
        ctx.fillStyle = '#fff3c4'; circle(ctx, x - 3, GY - 82, 2.8);
        continue;
      }
      person(ctx, 'caveT' + i, 'tourist', x, -1, 'walk', t, { look: i, hiker: true, empty: true });
    }
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
    if (!c.lamp || b.hiding || c.count) return;
    const [hx, hy] = head(b), d = b.dir < 0 ? -1 : 1, R = SIM().LAMP.range;
    const gr = ctx.createLinearGradient(hx, 0, hx + d * R, 0);
    gr.addColorStop(0, 'rgba(255,246,200,0.34)'); gr.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(hx, hy - 3); ctx.lineTo(hx + d * R, hy - 110); ctx.lineTo(hx + d * R, hy + 70); ctx.lineTo(hx, hy + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2d31'; ctx.fillRect(hx - d * 18 - 3, hy - 6, 22, 4);
    ctx.fillStyle = '#f08c00'; rr(ctx, hx - 4, hy - 8, 9, 8, 2);
    ctx.fillStyle = '#fff8d6'; circle(ctx, hx + d * 4, hy - 4, 3);
  }

  function counting(ctx, g, c, b, withBear) {
    const s = c.statue || (c.statue = { spot: { x: 0, w: 34, hide: true, shade: 0.01 } });
    s.spot.x = b.x;
    const who = Object.assign(s.who || (s.who = {}), b, { hiding: s.spot, pose: 'stiff', hideT: 2, hideBlend: 1 });
    withBear(ZS.drawBearBehindTree, who, 1);
    const t = g.time, k = c.count.k;
    ctx.save(); ctx.translate(b.x + 12, GY - 116); ctx.rotate(-0.35 + sin(k * PI) * 0.25);
    ctx.fillStyle = '#6b4626'; rr(ctx, -5, -30, 10, 32, 5);
    ctx.fillStyle = '#3a2614'; for (let j = -1; j <= 1; j++) poly(ctx, [j * 3 - 1.2, -30, j * 3 + 1.2, -30, j * 3, -35]);
    ctx.restore();
    if (c.lamp) { ctx.fillStyle = '#f08c00'; rr(ctx, b.x - 5, GY - 140, 10, 8, 2); ctx.fillStyle = '#fff8d6'; circle(ctx, b.x, GY - 136, 3); }
    label(ctx, String(c.count.counted + 1), b.x + 26, GY - 172 - sin(t * 9) * 2, 15, '#f6e7c4');
  }

  function bear(ctx, g, c, S, withBear) {
    const b = g.bear;
    for (const s of S.covers) {
      if (b.hideTree === s && b.hideBlend > 0) {
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: s }));
        withBear(ZS.drawBearBehindTree, who, b.hideBlend);
      }
    }
    if (c.count) { counting(ctx, g, c, b, withBear); return; }
    const rest = 1 - (b.hideBlend || 0);
    if (rest > 0.01) withBear(ZS.drawBear, b, rest);
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
    const T = SIM().TOUR;
    if (c.t >= T.start && c.guide > T.gone && c.guide < cam + viewW + 300) {
      const gl = ctx.createLinearGradient(c.guide + 10, 0, c.guide - T.light, 0);
      gl.addColorStop(0, 'rgba(255,244,200,0.34)'); gl.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(c.guide + 6, GY - 84); ctx.lineTo(c.guide - T.light, GY - 170); ctx.lineTo(c.guide - T.light, GY); ctx.lineTo(c.guide + 6, GY - 76); ctx.closePath(); ctx.fill();
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

  const HINT = { crawl: ['ArrowDown', 'crouch'], jump: ['ArrowUp', 'jump'], count: ['KeyC', 'count'], hide: ['ArrowDown', 'hide'] };

  function hint(ctx, g, c, viewW) {
    const k = SIM().hint(g, c), b = g.bear;
    const parts = k ? [Object.assign([HINT[k][0], LABELS.cave.hint[k]], { skill: 'cave' + k, tip: true })] : null;
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
    const show = c.t < 9 ? 1 - smooth((c.t - 7.5) / 1.5) : 0;
    if (show <= 0.01) return;
    const text = g.touch ? LABELS.cave.bannerTouch : LABELS.cave.banner;
    ctx.globalAlpha = show;
    ctx.font = '700 15px system-ui, sans-serif';
    const w = min(viewW - 24, ctx.measureText(text).width + 32);
    ctx.fillStyle = 'rgba(20,16,26,0.82)'; rr(ctx, viewW / 2 - w / 2, -offY + 70, w, 34, 17);
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
    floor(ctx, S, cam, viewW, t);
    walkway(ctx, S, cam, viewW);
    if (vis(S.cave.gap, 200)) gate(ctx, S, t);
    if (vis(S.cave.bones, 160)) bones(ctx, S, g);
    roof(ctx, cam, viewW, offY, t);
    lamp(ctx, S, c, t);
    group(ctx, g, c);
    bear(ctx, g, c, S, withBear);
    for (const s of S.covers) if (vis(s.x, 80)) column(ctx, s);
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
