(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, sstep, clamp, lerp } = ZS.util;
  const API = (ZS.caveArt = {});
  const SIM = () => ZS.sim.cave;
  const ROOF = GY - 330;
  const ROCK = { deep: '#17121f', wall: '#2a2236', wall2: '#33293f', flow: '#4a3d52', floor: '#3f3443', floorTop: '#6b5a66', calcite: '#d9ccb4', calc2: '#bfae94', calc3: '#a08e78', wet: 'rgba(190,220,240,0.35)' };
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

  function floorY(x, S) {
    const B = S.cave.bridge;
    if (x > B[0] && x < B[1]) return GY + 70;
    return GY + 2 * sin(x * 0.05) + 1.5 * sin(x * 0.13 + 2);
  }

  function back(ctx, g, viewW, offY) {
    const cam = g.cam, H = g.viewH || 540;
    const gr = ctx.createLinearGradient(0, -offY, 0, GY + 60);
    gr.addColorStop(0, ROCK.deep); gr.addColorStop(0.55, ROCK.wall); gr.addColorStop(1, '#3a2f40');
    ctx.fillStyle = gr; ctx.fillRect(0, -offY - 10, viewW, H + 40);
    const px = cam * 0.55;
    ctx.save(); ctx.translate(-px, 0);
    const c0 = Math.floor((px - 120) / 90), c1 = Math.ceil((px + viewW + 120) / 90);
    for (let c = c0; c <= c1; c++) {
      const x = c * 90 + hash(c * 1.7) * 40, h = 120 + hash(c * 2.3) * 160, w = 40 + hash(c * 3.1) * 50;
      ctx.fillStyle = hash(c * 4.9) > 0.5 ? ROCK.wall2 : '#2f2639';
      ctx.beginPath(); ctx.moveTo(x - w, GY + 20); ctx.quadraticCurveTo(x - w * 0.7, GY - h, x, GY - h - 20); ctx.quadraticCurveTo(x + w * 0.7, GY - h, x + w, GY + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,100,130,0.18)';
      ell(ctx, x - w * 0.2, GY - h * 0.6, w * 0.25, h * 0.25);
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

  function roof(ctx, S, cam, viewW, offY, time) {
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
        const u = ((time * 0.6 + hash(c)) % 1);
        ctx.fillStyle = 'rgba(190,225,245,' + (0.8 * (1 - u)).toFixed(3) + ')'; circle(ctx, x, y + l + 2 + u * 120, 1.6);
      }
    }
  }

  function floor(ctx, S, cam, viewW, time) {
    const x0 = Math.floor((cam - 40) / 12) * 12, x1 = cam + viewW + 40, B = S.cave.bridge;
    if (x1 > B[0] && x0 < B[1]) {
      const a = max(x0, B[0]), b = min(x1, B[1]);
      ctx.fillStyle = '#0f1c26'; ctx.fillRect(a, GY + 8, b - a, 160);
      ctx.fillStyle = '#1d3a4c'; ctx.fillRect(a, GY + 50, b - a, 120);
      ctx.strokeStyle = 'rgba(150,200,230,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = Math.floor(a / 30) * 30; x < b; x += 30) { const u = ((time * 40 + x) % 30); ctx.moveTo(x + u, GY + 60 + (x % 3) * 8); ctx.lineTo(x + u + 14, GY + 60 + (x % 3) * 8); }
      ctx.stroke();
    }
    ctx.fillStyle = ROCK.floor;
    ctx.beginPath(); ctx.moveTo(x0, GY + 200);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, floorY(x, S) + (x > B[0] - 30 && x < B[0] ? (x - B[0] + 30) * 2.3 : x > B[1] && x < B[1] + 30 ? (B[1] + 30 - x) * 2.3 : 0));
    ctx.lineTo(x1, GY + 200); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ROCK.floorTop; ctx.lineWidth = 2.5;
    ctx.beginPath();
    let pen = false;
    for (let x = x0; x <= x1; x += 12) {
      if (x > B[0] - 10 && x < B[1] + 10) { pen = false; continue; }
      const y = floorY(x, S);
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
    for (let c = Math.floor(x0 / 53); c * 53 < x1; c++) {
      const x = c * 53 + hash(c * 3.3) * 30;
      if (x > B[0] - 20 && x < B[1] + 20) continue;
      const h = 6 + hash(c * 1.9) * 22, w = 4 + hash(c * 2.7) * 6;
      ctx.fillStyle = hash(c * 6.1) > 0.5 ? ROCK.calc2 : ROCK.calc3;
      poly(ctx, [x - w, GY + 2, x - w * 0.4, GY - h, x + w * 0.4, GY - h, x + w, GY + 2]);
      ctx.fillStyle = ROCK.calcite; ell(ctx, x, GY - h, w * 0.45, 2);
    }
  }

  function bridge(ctx, S) {
    const B = S.cave.bridge;
    ctx.fillStyle = '#5b6168'; ctx.fillRect(B[0] - 20, GY - 2, B[1] - B[0] + 40, 8);
    ctx.fillStyle = '#3b4046'; ctx.fillRect(B[0] - 20, GY + 6, B[1] - B[0] + 40, 4);
    ctx.strokeStyle = '#7a8088'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(B[0] - 20, GY - 46); ctx.lineTo(B[1] + 20, GY - 46); ctx.moveTo(B[0] - 20, GY - 24); ctx.lineTo(B[1] + 20, GY - 24); ctx.stroke();
    ctx.lineWidth = 3;
    for (let x = B[0] - 20; x <= B[1] + 20; x += 60) { ctx.beginPath(); ctx.moveTo(x, GY - 2); ctx.lineTo(x, GY - 48); ctx.stroke(); }
    ctx.strokeStyle = '#4b5056'; ctx.lineWidth = 4;
    for (let x = B[0] + 40; x < B[1]; x += 120) { ctx.beginPath(); ctx.moveTo(x, GY + 8); ctx.lineTo(x - 18, GY + 120); ctx.moveTo(x, GY + 8); ctx.lineTo(x + 18, GY + 120); ctx.stroke(); }
  }

  function lakes(ctx, x, time) {
    ctx.fillStyle = '#204a5a'; ell(ctx, x, GY + 4, 70, 7);
    ctx.fillStyle = 'rgba(160,220,235,' + (0.35 + 0.1 * sin(time * 2)).toFixed(3) + ')'; ell(ctx, x - 10, GY + 3, 40, 2.5);
    ctx.fillStyle = ROCK.calcite; ell(ctx, x - 70, GY + 2, 10, 4); ell(ctx, x + 72, GY + 2, 9, 4);
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
    ctx.fillStyle = 'rgba(40,30,30,0.25)'; ell(ctx, x, GY + 3, w * 0.7, 4);
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
    ctx.fillStyle = '#e9dfc9'; for (let i = 0; i < 3; i++) poly(ctx, [x + 50 + i * 4, GY - 58, x + 52 + i * 4, GY - 52, x + 54 + i * 4, GY - 58]);
    ctx.fillStyle = '#8a2b22'; ctx.fillRect(x - 54, GY - 140, 108, 22);
    ctx.fillStyle = '#f3e3c0'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LABELS.cave.dragon, x, GY - 129, 100);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.06 + 0.04 * sin(t * 2)).toFixed(3) + ')'; ctx.fillRect(x - 60, GY - 106, 24, 80);
  }

  function lamps(ctx, S, c, cam, viewW) {
    S.cave.domes.forEach((d, i) => {
      const k = c.lights[i] * (1 - c.dark);
      for (let x = d[0] + 60; x < d[1] - 20; x += 170) {
        if (x < cam - 80 || x > cam + viewW + 80) continue;
        const y = GY - 210 - (x % 3) * 20;
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 3, y - 2, 6, 8);
        ctx.fillStyle = k > 0.1 ? 'rgba(255,222,150,' + (0.4 + 0.6 * k).toFixed(3) + ')' : '#4a4038'; circle(ctx, x, y + 8, 4);
      }
    });
  }

  function guideDir(c) {
    const e = c.event || c.warn;
    if (c.pointa) return 1;
    if (e && (e.kind === 'look' || e.kind === 'cone')) return -1;
    return c.t < 3 ? -1 : 1;
  }

  function group(ctx, g, c) {
    const M = SIM().members(c), t = g.time, e = c.event || c.warn, flash = e && e.kind === 'flash';
    const walk = c.moving ? 'walk' : 'idle';
    for (let i = M.length - 1; i >= 0; i--) {
      const m = M[i];
      if (m.guide) {
        person(ctx, 'caveGuide', 'aide', m.x, guideDir(c), walk, t);
        if (c.warn && c.warn.kind !== 'flash') { ctx.strokeStyle = '#f2d3b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x + 2, GY - 60); ctx.lineTo(m.x - 6, GY - 92); ctx.stroke(); }
        ctx.fillStyle = '#f5e7a0'; circle(ctx, m.x - 2 * guideDir(c), GY - 82, 2.6);
        continue;
      }
      const last = m.i === SIM().GROUP.n - 1;
      if (last && flash) person(ctx, 'caveT' + m.i, 'tourist', m.x, -1, 'film', t, { aimAt: [m.x - 200, GY - 60], look: m.i });
      else person(ctx, 'caveT' + m.i, m.i % 3 === 1 ? 'tourist' : 'guest', m.x, c.pointa ? 1 : 1, walk, t, { look: m.i, size: 0.9 + (m.i % 3) * 0.05 });
    }
  }

  function strips(ctx, c) {
    const M = SIM().members(c), a = c.dark;
    if (a < 0.05) return;
    for (const m of M) {
      ctx.fillStyle = 'rgba(220,255,120,' + (0.9 * a).toFixed(3) + ')';
      ctx.fillRect(m.x - 5, GY - 22, 4, 3); ctx.fillRect(m.x + 2, GY - 20, 4, 3);
      ctx.fillStyle = 'rgba(255,240,160,' + (0.8 * a).toFixed(3) + ')'; ctx.fillRect(m.x - 6, GY - 58, 12, 2.5);
    }
    ctx.fillStyle = 'rgba(255,245,190,' + (0.95 * a).toFixed(3) + ')'; circle(ctx, M[0].x, GY - 82, 3);
  }

  function statue(ctx, g, c, b, withBear) {
    const s = c.statue || (c.statue = { spot: { x: 0, w: 34, hide: true, shade: 0.01 } });
    s.spot.x = b.x;
    const who = Object.assign(s.who || (s.who = {}), b, { hiding: s.spot, pose: 'stiff', hideT: 2, hideBlend: 1 });
    const p = c.pointa, puff = p ? 1 + 0.16 * sstep(SIM().POINTA.puff, SIM().POINTA.puff + 0.4, p.t) : 1;
    ctx.save();
    ctx.translate(b.x, GY); ctx.scale(puff, puff); ctx.translate(-b.x, -GY);
    withBear(ZS.drawBearBehindTree, who, c.pose);
    const k = c.pose, x = b.x, t = g.time;
    ctx.globalAlpha = k * 0.62;
    ctx.fillStyle = ROCK.calcite;
    ctx.beginPath(); ctx.moveTo(x - 30, GY + 2); ctx.bezierCurveTo(x - 26, GY - 50, x - 16, GY - 100, x - 8, GY - 128); ctx.lineTo(x + 8, GY - 128); ctx.bezierCurveTo(x + 16, GY - 100, x + 26, GY - 50, x + 30, GY + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,96,70,0.6)'; ctx.lineWidth = 1.3;
    for (let i = 1; i < 6; i++) { const y = GY - i * 21, w = 28 - i * 3.6; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + 5, x + w, y); ctx.stroke(); }
    ctx.globalAlpha = k;
    ctx.fillStyle = '#6b4626';
    for (const s2 of [-1, 1]) {
      ctx.save(); ctx.translate(x + s2 * 13, GY - 128); ctx.rotate(s2 * 0.25 + sin(t * 1.3) * 0.03);
      rr(ctx, -5, -24, 10, 26, 5);
      ctx.fillStyle = '#3a2614'; for (let j = -1; j <= 1; j++) poly(ctx, [j * 3 - 1.2, -24, j * 3 + 1.2, -24, j * 3, -29]);
      ctx.fillStyle = '#6b4626';
      ctx.restore();
    }
    const blink = ((t / 3.4) % 1) < 0.05;
    for (const s2 of [-1, 1]) {
      ctx.fillStyle = '#fff8ea'; ell(ctx, x + s2 * 5, GY - 112, 3.4, blink ? 0.6 : 3.4);
      if (!blink) { ctx.fillStyle = '#1b1b1b'; circle(ctx, x + s2 * 5 + 0.8, GY - 111.5, 1.7); }
    }
    ctx.fillStyle = ROCK.calcite;
    for (let i = 0; i < 5; i++) { const dx = x - 12 + i * 6; poly(ctx, [dx - 2, GY - 126, dx + 2, GY - 126, dx, GY - 120 + (i % 2) * 4]); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function bear(ctx, g, c, S, withBear) {
    const b = g.bear;
    for (const s of S.covers) {
      if (b.hideTree === s && b.hideBlend > 0) {
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: s }));
        withBear(ZS.drawBearBehindTree, who, b.hideBlend);
      }
    }
    if (c.pose > 0.02) statue(ctx, g, c, b, withBear);
    const rest = (1 - (b.hideBlend || 0)) * (1 - c.pose);
    if (rest > 0.01) withBear(ZS.drawBear, b, rest);
  }

  function shade(S, c, x, bx) {
    let a = 0.82;
    if (x < 200) a = lerp(0.3, 0.82, sstep(40, 200, x));
    S.cave.domes.forEach((d, i) => {
      const k = c.lights[i] * smooth(clamp((x - d[0] + 40) / 80, 0, 1)) * smooth(clamp((d[1] + 40 - x) / 80, 0, 1));
      a = min(a, lerp(0.82, 0.1, k));
    });
    a = lerp(a, 0.93, c.dark);
    return min(a, lerp(0.52, a, sstep(40, 140, abs(x - bx))));
  }

  function darkness(ctx, S, c, cam, viewW, offY, H, bx) {
    const n = 48, gr = ctx.createLinearGradient(cam, 0, cam + viewW, 0);
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = cam + u * viewW;
      gr.addColorStop(u, 'rgba(6,4,12,' + shade(S, c, x, bx).toFixed(3) + ')');
    }
    ctx.fillStyle = gr;
    ctx.fillRect(cam - 2, -offY - 10, viewW + 4, H + 40);
    S.cave.domes.forEach((d, i) => {
      const k = c.lights[i] * (1 - c.dark);
      if (k < 0.02 || d[1] < cam || d[0] > cam + viewW) return;
      ctx.fillStyle = 'rgba(255,190,110,' + (0.07 * k).toFixed(3) + ')';
      ell(ctx, (d[0] + d[1]) / 2, GY - 140, (d[1] - d[0]) / 2, 170);
    });
  }

  function cone(ctx, c) {
    const e = c.event, K = c.cone;
    if (!K) return;
    const y = K.kind === 'cone' ? GY - 80 : GY - 64, k = K.kind === 'flash' ? 0.55 : 0.32;
    const gr = ctx.createLinearGradient(K.from, 0, K.to, 0);
    gr.addColorStop(0, 'rgba(255,246,210,' + k + ')'); gr.addColorStop(1, 'rgba(255,246,210,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(K.from, y - 4); ctx.lineTo(K.to, GY - 190); ctx.lineTo(K.to, GY + 6); ctx.lineTo(K.from, y + 4); ctx.closePath(); ctx.fill();
    void e;
  }

  function warnCone(ctx, c, t) {
    const w = c.warn;
    if (!w || w.kind === 'look') return;
    const from = w.kind === 'cone' ? c.head - 10 : SIM().tail(c) - 4, to = from - w.len;
    ctx.setLineDash([8, 7]);
    ctx.strokeStyle = 'rgba(255,214,90,' + (0.35 + 0.25 * abs(sin(t * 6))).toFixed(3) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(from, GY - 70); ctx.lineTo(to, GY - 190); ctx.moveTo(from, GY - 70); ctx.lineTo(to, GY + 4); ctx.stroke();
    ctx.setLineDash([]);
  }

  function bats(ctx, S, g, cam, viewW) {
    const t = g.time;
    for (let c = Math.floor(cam / 210); c * 210 < cam + viewW; c++) {
      if (hash(c * 2.2) < 0.4) continue;
      const x = c * 210 + hash(c * 3.7) * 120, y = roofY(x) + 10;
      ctx.fillStyle = '#0c0a10'; ell(ctx, x, y + 6, 4, 7);
      const blink = ((t * 0.4 + hash(c)) % 1) < 0.04;
      if (!blink) { ctx.fillStyle = 'rgba(255,214,90,0.9)'; circle(ctx, x - 1.6, y + 9, 1.1); circle(ctx, x + 1.6, y + 9, 1.1); }
    }
  }

  function overlays(ctx, g, c, viewW, offY) {
    const b = g.bear, cam = g.cam, P = ZS.render.props;
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.min(1, f.t);
      label(ctx, f.text, f.x, Math.max(-offY + 12, f.y - (1.6 - f.t) * 30), 16, f.color);
      ctx.globalAlpha = 1;
    }
    if (b.warn) label(ctx, '!', b.x, GY - 100, 26, '#e03131');
    if (g.bubble) P.bubble(ctx, b.x, GY - 180, g.bubble.text, g.bubble.t, cam + 8, cam + viewW - 8);
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

  function draw(g, ctx, viewW, offY) {
    const S = g.level, c = g.chopok.pass.play, cam = g.cam, H = g.viewH || 540, b = g.bear, t = g.time;
    const vis = (x, m) => x > cam - m && x < cam + viewW + m;
    const hurt = b.inv > 0 ? 0.45 + 0.35 * Math.cos(t * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, t); ctx.globalAlpha = 1; };
    ctx.save();
    ctx.translate(0, offY);
    back(ctx, g, viewW, offY);
    ctx.translate(-Math.round(cam), 0);
    const D = S.cave.domes;
    if (vis(D[1][0] + 200, 200)) cascades(ctx, D[1][0] + 200, 150, t);
    if (vis(D[1][0] + 420, 200)) cascades(ctx, D[1][0] + 420, 110, t + 1);
    floor(ctx, S, cam, viewW, t);
    if (vis(S.cave.bridge[0], 600)) bridge(ctx, S);
    if (vis(D[3][0] + 120, 120)) lakes(ctx, D[3][0] + 120, t);
    if (vis(S.cave.bones, 120)) bones(ctx, S, g);
    lamps(ctx, S, c, cam, viewW);
    group(ctx, g, c);
    bear(ctx, g, c, S, withBear);
    for (const s of S.covers) if (vis(s.x, 80)) column(ctx, s);
    roof(ctx, S, cam, viewW, offY, t);
    darkness(ctx, S, c, cam, viewW, offY, H, b.x);
    cone(ctx, c);
    warnCone(ctx, c, t);
    strips(ctx, c);
    bats(ctx, S, g, cam, viewW);
    overlays(ctx, g, c, viewW, offY);
    ctx.restore();
    ctx.save(); ctx.translate(0, offY);
    banner(ctx, g, c, viewW, offY);
    ctx.restore();
    if (c.flash > 0) { ctx.fillStyle = 'rgba(255,255,250,' + (0.75 * c.flash).toFixed(3) + ')'; ctx.fillRect(0, 0, viewW, H + 40); }
  }

  Object.assign(API, { draw, roofY });
})();
