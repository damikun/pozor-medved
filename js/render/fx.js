// Cheap ambient effects: butterflies and pollen in spring and summer, falling leaves in autumn, birds that burst out of the
// canopy at a shot, and dust puffs. All state lives in g.fx and stays near the camera (g.cam .. g.cam + viewW).
// Under about 60 live particles in total: ambient <= 26 (+ a few shaken leaves), birds <= 9, dust <= 16.
//
//   ZS.fx.init(g)                     set up g.fx (also done lazily by every other call)
//   ZS.fx.update(g, dt, viewW?)       needs g.cam and g.seasonIdx (0 spring, 1 summer, 2 autumn); pass viewW if you have it
//   ZS.fx.drawBack(ctx, g, viewW)     world coordinates, after the trees and before the characters
//   ZS.fx.drawFront(ctx, g, viewW)    world coordinates, on top
//   ZS.fx.onShot(g, x)                birds burst out of the canopy near world x, a few leaves shake loose
//   ZS.fx.dust(g, x, y, n, dir?)      n dust puffs at the feet; dir (+1/-1) throws them backwards, for sprinting
//   ZS.fx.count(g)                    live particles (for debugging)
//   g.fx.shafts = false               turns the soft light beams off
(function () {
  const GY = ZS.CFG.GROUND;
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const MAX = { ambient: 26, shaken: 5, birds: 9, dust: 16, total: 58 };
  const BACK = 0.94, FRONT = 1.18;   // parallax of the back and front layer (1 = moves with the ground)

  // How many of each ambient kind live in each season (0 spring, 1 summer, 2 autumn).
  // bf butterflies, pol pollen (spring) / dandelion seeds (summer), gn gnats, lf falling leaves.
  const TARGET = [
    { bf: 4, pol: 14, gn: 0, lf: 0 },
    { bf: 4, pol: 8, gn: 4, lf: 0 },
    { bf: 0, pol: 0, gn: 0, lf: 22 },
  ];
  const KINDS = ['bf', 'pol', 'gn', 'lf'];
  const BF_COLS = [['#f4d94a', '#c99a1c'], ['#f3f1e8', '#9aa0a6'], ['#78a8e8', '#2f4f9a'], ['#ee8a2e', '#5b2a12'], ['#e8c8f0', '#7a4a9a']];
  const LEAF_AUTUMN = ['#d8892f', '#c0392b', '#e6c34a', '#a8692c', '#b5532a'];
  const LEAF_GREEN = ['#6fae52', '#4f8a45', '#8cc152'];

  function ensure(g) { return g.fx || init(g); }
  // The view width is only known once update() or a draw call receives it: spread the particles over it the first time.
  function setView(f, g, vw) {
    if (!vw || vw === f.viewW) return;
    const first = !f.vwKnown;
    f.vwKnown = true; f.viewW = vw;
    if (first) for (const p of f.parts) if (p.k !== 'gn') p.px = rnd(-30, vw + 30) + p.f * (g.cam || 0);
  }
  function total(f) { return f.parts.length + f.birds.length + f.dust.length; }

  function init(g) {
    const f = g.fx = {
      t: 0, wind: 14, flow: 0, camV: 0, lastCam: g.cam || 0, viewW: 900, spawnCd: 0,
      parts: [], birds: [], dust: [],
    };
    const tg = TARGET[g.seasonIdx | 0] || TARGET[0];
    for (const k of KINDS) for (let i = 0; i < tg[k]; i++) addAmbient(f, g, k, 'init');
    return f;
  }

  // Puts an ambient particle on screen: 'init' anywhere (already faded in), 'in' anywhere (fades in), 'edge' on the side
  // where things drift in.
  function place(f, p, g, how) {
    const cam = g.cam || 0, vw = f.viewW;
    const sx = how === 'edge' ? (f.flow > 0 ? -rnd(20, 120) : vw + rnd(20, 120)) : rnd(-30, vw + 30);
    p.px = sx + p.f * cam;
    p.age = how === 'init' ? rnd(0.6, 1.2) : 0;
  }

  function addAmbient(f, g, k, how) {
    const front = Math.random() < 0.35;
    const p = {
      k, z: front ? 1 : 0, f: front ? FRONT : BACK, px: 0, y: 0, vx: 0, vy: 0, ph: rnd(0, TAU), age: 0, fade: 0,
      col: '#fff', col2: '#000', s: 1, rot: 0, vr: 0, by: 0, fl: rnd(0, TAU), dir: 1, cx: 0, cy: 0, sh: 0, land: 0, a: 1,
    };
    if (k === 'bf') {
      const c = pick(BF_COLS); p.col = c[0]; p.col2 = c[1]; p.s = rnd(0.85, 1.25);
      p.by = p.y = GY - rnd(30, 120); p.vx = rnd(10, 26) * (Math.random() < 0.5 ? -1 : 1); p.dir = p.vx < 0 ? -1 : 1;
    } else if (k === 'pol') {
      p.s = rnd(0.8, 1.5); p.y = GY - rnd(14, 300); p.vx = rnd(-4, 8); p.vy = rnd(-4, 3);
    } else if (k === 'gn') {
      p.s = rnd(0.7, 1); p.col = '#2a2a2a';
    } else {
      p.s = rnd(3.2, 5); p.col = pick(LEAF_AUTUMN); p.y = how === 'init' ? GY - rnd(30, 380) : GY - rnd(230, 400); p.vy = rnd(24, 44); p.vr = rnd(-2.2, 2.2); p.rot = rnd(0, TAU);
    }
    place(f, p, g, how);
    if (k === 'gn') {   // a swarm shares one centre
      if (!f.swarm || f.swarm.n >= 4) f.swarm = { x: p.px, y: GY - rnd(40, 160), n: 0 };
      f.swarm.n++; p.cx = f.swarm.x; p.cy = f.swarm.y; p.px = p.cx; p.y = p.cy; p.s = rnd(8, 15);
    }
    f.parts.push(p);
    return p;
  }

  // A leaf shaken loose at world x (not counted against the season's target).
  function addLeaf(f, g, x, y, color) {
    if (total(f) >= MAX.total) return;
    const p = addAmbient(f, g, 'lf', 'in');
    p.sh = 1; p.col = color; p.y = y; p.px = x + (p.f - 1) * (g.cam || 0);
    p.age = 0.4; p.vy = rnd(14, 34); p.vx = rnd(-30, 30);
  }

  function update(g, dt, viewW) {
    const f = ensure(g);
    setView(f, g, viewW);
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.1);
    f.t += dt;
    const cam = g.cam || 0, vw = f.viewW;
    const jump = Math.abs(cam - f.lastCam) > vw * 0.8;
    f.camV += (Math.max(-900, Math.min(900, (cam - f.lastCam) / dt)) - f.camV) * Math.min(1, dt * 6);
    f.lastCam = cam;
    f.wind = 14 + 12 * Math.sin(f.t * 0.23) + 6 * Math.sin(f.t * 0.61 + 1.3);
    f.flow = f.wind * 0.5 - f.camV;

    // Keep the number of ambient particles at the season's target: fade extras out, add missing ones slowly.
    const tg = TARGET[g.seasonIdx | 0] || TARGET[0], live = { bf: 0, pol: 0, gn: 0, lf: 0 };
    for (const p of f.parts) if (!p.sh && !p.fade) live[p.k]++;
    f.spawnCd -= dt;
    for (const k of KINDS) {
      while (live[k] > tg[k]) { const v = f.parts.find((p) => p.k === k && !p.sh && !p.fade); if (!v) break; v.fade = 0.001; live[k]--; }
      const ambient = f.parts.reduce((n, p) => n + (p.sh ? 0 : 1), 0);
      if (live[k] < tg[k] && f.spawnCd <= 0 && ambient < MAX.ambient && total(f) < MAX.total) { addAmbient(f, g, k, 'in'); f.spawnCd = 0.14; live[k]++; }
    }

    const wind = f.wind, camV = f.camV;
    for (let i = f.parts.length - 1; i >= 0; i--) {
      const p = f.parts[i];
      p.age += dt; p.ph += dt;
      if (p.fade) { p.fade += dt; if (p.fade > 1) { f.parts.splice(i, 1); continue; } }
      if (jump) p.px = rnd(-30, vw + 30) + p.f * cam;
      if (p.k === 'bf') {
        p.fl += dt * (13 + 4 * Math.sin(p.ph * 0.7));
        p.by += Math.sin(p.ph * 0.4) * 5 * dt; p.by = Math.max(GY - 150, Math.min(GY - 26, p.by));
        const vx = p.vx + Math.sin(p.ph * 1.3) * 16 + wind * 0.3;
        p.px += vx * dt; p.y = p.by + Math.sin(p.ph * 2.1) * 15 + Math.sin(p.ph * 0.9) * 7;
        if (Math.abs(vx) > 4) p.dir = vx < 0 ? -1 : 1;
      } else if (p.k === 'pol') {
        p.px += (p.vx + wind * 0.7 + Math.sin(p.ph * 0.9) * 8) * dt;
        p.y += (p.vy + Math.cos(p.ph * 0.8) * 6) * dt;
        if (p.y < GY - 330) p.y = GY - 330; else if (p.y > GY - 8) p.y = GY - 8;
      } else if (p.k === 'gn') {
        p.cx += wind * 0.15 * dt; p.cy += Math.sin(p.ph * 0.3) * 4 * dt;
        p.px = p.cx + Math.cos(p.ph * 3.1 + p.s) * p.s; p.y = p.cy + Math.sin(p.ph * 4.3 + p.s * 2) * p.s * 0.6;
      } else if (p.land) {
        p.land += dt; if (p.land > 2.2) { p.land = 0; if (p.sh) { f.parts.splice(i, 1); continue; } p.y = GY - rnd(300, 400); p.age = 0; p.px = (f.flow > 0 ? -rnd(0, vw * 0.4) : rnd(0, vw * 1.2)) + p.f * cam; }
      } else {
        p.px += (wind * 0.9 + Math.sin(p.ph * 1.4) * 26 + p.vx) * dt;
        p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y >= GY - rnd(0, 5)) { p.y = GY - rnd(0, 5); p.land = 0.001; }
      }
      // Left the view: come back in on the side where things drift in.
      const sx = p.px - p.f * cam;
      if (p.k !== 'gn' && (sx < -160 || sx > vw + 160)) {
        if (p.sh) { f.parts.splice(i, 1); continue; }
        place(f, p, g, 'edge');
        if (p.k === 'lf') { p.y = GY - rnd(220, 400); p.land = 0; }
      }
      if (p.k === 'gn' && (p.cx - p.f * cam < -200 || p.cx - p.f * cam > vw + 200)) {
        p.cx = (f.flow > 0 ? -80 : vw + 80) + p.f * cam; p.age = 0;
      }
      p.a = Math.min(1, p.age * 1.6) * (p.fade ? Math.max(0, 1 - p.fade) : 1) * (p.land > 1.2 ? Math.max(0, (2.2 - p.land)) : 1);
    }

    for (let i = f.birds.length - 1; i >= 0; i--) {
      const b = f.birds[i];
      if (b.wait > 0) { b.wait -= dt; continue; }
      b.t += dt; b.ph += dt * b.fr;
      const k = Math.min(1, dt * 1.9);
      if (b.t > 0.25) { b.vx += (b.cv - b.vx) * k; b.vy += (b.cy - b.vy) * k; }
      else b.vy += 140 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.t > b.life || Math.abs(b.x - (cam + vw / 2)) > vw * 0.9 + 200) f.birds.splice(i, 1);
    }
    for (let i = f.dust.length - 1; i >= 0; i--) {
      const d = f.dust[i];
      d.t += dt;
      if (d.t >= d.life) { f.dust.splice(i, 1); continue; }
      d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 1 - Math.min(1, 3 * dt); d.vy *= 1 - Math.min(1, 2.2 * dt);
    }
  }

  // A few birds burst out of the canopy near x and fly away; a handful of leaves shake loose.
  function onShot(g, x) {
    const f = ensure(g);
    const n = Math.min(MAX.birds - f.birds.length, 4 + Math.floor(Math.random() * 3));
    const dirX = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < n && total(f) < MAX.total; i++) {
      f.birds.push({
        x: x + rnd(-80, 80), y: GY - rnd(190, 330), vx: dirX * rnd(30, 110) + rnd(-50, 50), vy: -rnd(120, 210),
        cv: dirX * rnd(115, 180), cy: -rnd(25, 70), ph: rnd(0, TAU), fr: rnd(11, 15), t: 0, life: rnd(3.2, 4.4),
        wait: i * 0.035 + rnd(0, 0.1), s: rnd(0.9, 1.3), dir: dirX,
      });
    }
    const green = (g.seasonIdx | 0) < 2;
    const shaken = f.parts.reduce((c, p) => c + p.sh, 0);
    for (let i = 0; shaken + i < MAX.shaken && i < 4; i++) addLeaf(f, g, x + rnd(-90, 90), GY - rnd(190, 330), pick(green ? LEAF_GREEN : LEAF_AUTUMN));
  }

  // Small dust puffs, e.g. dust(g, bear.x, GY, 6) on a landing or dust(g, bear.x, GY, 1, bear.dir) while sprinting.
  function dust(g, x, y, n, dir) {
    const f = ensure(g);
    for (let i = 0; i < (n || 1); i++) {
      if (f.dust.length >= MAX.dust) f.dust.shift();
      f.dust.push({
        x: x + rnd(-6, 6), y: (y === undefined ? GY : y) - rnd(0, 3), vx: rnd(-50, 50) - (dir || 0) * rnd(10, 70), vy: -rnd(10, 34),
        t: 0, life: rnd(0.45, 0.8), r0: rnd(2.4, 3.8), r1: rnd(7, 11),
      });
    }
  }

  // --- Drawing ---------------------------------------------------------------------------------
  function butterfly(ctx, p, x, y) {
    const d = p.dir, s = p.s, w = 0.22 + 0.78 * Math.abs(Math.sin(p.fl));
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.ellipse(x - 0.8 * d, y - 2.2 * w * s, 2.5 * s, 3.1 * s * w, -0.3 * d, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 1.5 * d, y + (1 + 0.5 * w) * s, 2 * s, 2.2 * s * w, 0.4 * d, 0, TAU); ctx.fill();
    ctx.fillStyle = p.col2;
    ctx.beginPath(); ctx.arc(x - 1.8 * d, y - 3.4 * w * s, 0.9 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.ellipse(x, y, 2.7 * s, 0.8 * s, 0, 0, TAU); ctx.fill();
  }

  function pollen(ctx, p, x, y, summer) {
    const tw = 0.65 + 0.35 * Math.sin(p.ph * 3), r = p.s;
    if (summer) {   // dandelion seed: a dot with a few fine rays
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * tw).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * tw).toFixed(2) + ')'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = -2.2 + i * 0.55 + p.ph * 0.1; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 3.4, y + Math.sin(a) * r * 3.4); }
      ctx.stroke();
    } else {        // pollen: a pale dot in a soft halo
      ctx.fillStyle = 'rgba(244,236,140,' + (0.2 * tw).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(246,240,150,' + (0.9 * tw).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    }
  }

  function leaf(ctx, p, x, y) {
    const flat = p.land > 0, ry = flat ? p.s * 0.42 : p.s * 0.5 * Math.abs(Math.cos(p.ph * 1.9)) + 0.5;
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.ellipse(x, y, p.s, ry, p.rot, 0, TAU); ctx.fill();
    if (!flat && ry > 1.4) {
      ctx.strokeStyle = 'rgba(60,30,10,0.35)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(p.rot) * p.s, y - Math.sin(p.rot) * p.s); ctx.lineTo(x + Math.cos(p.rot) * p.s, y + Math.sin(p.rot) * p.s); ctx.stroke();
    }
  }

  function drawLayer(ctx, g, viewW, layer) {
    const f = g.fx, cam = g.cam || 0, summer = (g.seasonIdx | 0) === 1;
    for (const p of f.parts) {
      if (p.z !== layer || p.a <= 0.01) continue;
      const sx = p.px - p.f * cam;
      if (sx < -30 || sx > viewW + 30) continue;
      const x = p.px - (p.f - 1) * cam;
      ctx.globalAlpha = p.a;
      if (p.k === 'bf') butterfly(ctx, p, x, p.y);
      else if (p.k === 'pol') pollen(ctx, p, x, p.y, summer);
      else if (p.k === 'gn') { ctx.fillStyle = p.col; ctx.fillRect(x - 0.6, p.y - 0.6, 1.3, 1.3); }
      else leaf(ctx, p, x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // Soft slanted beams of light through the canopy, drawn over the trees and behind the characters. They start far above the
  // top of the view (the camera can show sky above y = 0) and end on the ground line.
  function shafts(ctx, g, viewW) {
    const f = g.fx, cam = g.cam || 0, s = g.seasonIdx | 0, par = 0.8, gap = 330, top = -240;
    ctx.fillStyle = s === 2 ? 'rgb(255,208,140)' : 'rgb(255,247,200)';
    for (let i = Math.floor((cam * par - 300) / gap); i * gap - cam * par < viewW + 260; i++) {
      const h = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1;
      const a = (s === 2 ? 0.05 : 0.055) + 0.035 * Math.sin(f.t * 0.35 + i * 1.7);
      if (a <= 0.005) continue;
      const x = i * gap + h * 150 - (par - 1) * cam, w = 26 + h * 36, sl = (0.2 + h * 0.07) * (GY - top);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w + sl, GY); ctx.lineTo(x + sl, GY); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // A jackdaw-like bird in profile; the wing sweeps from above the back to below the belly.
  function bird(ctx, b) {
    if (b.wait > 0) return;
    const fly = Math.sin(b.ph), d = b.vx >= 0 ? 1 : -1;
    ctx.globalAlpha = Math.max(0, Math.min(1, (b.life - b.t) / 0.7));
    ctx.save();
    ctx.translate(b.x, b.y); ctx.scale(d * b.s, b.s); ctx.rotate(Math.atan2(b.vy, Math.abs(b.vx) + 1) * 0.65);
    ctx.fillStyle = '#262a33';
    ctx.beginPath(); ctx.moveTo(-4, -0.2); ctx.lineTo(-8.6, -1.5); ctx.lineTo(-8.6, 1.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 4.7, 2.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4.4, -0.8, 1.9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.moveTo(5.8, -1.3); ctx.lineTo(8.2, -0.4); ctx.lineTo(5.8, 0.2); ctx.closePath(); ctx.fill();
    const tx = -1.8 - 2.6 * Math.abs(fly), ty = -0.8 - 9.5 * fly;
    ctx.fillStyle = '#3b4250';
    ctx.beginPath(); ctx.moveTo(2.4, -0.7); ctx.quadraticCurveTo(tx + 3.4, ty * 0.55, tx, ty); ctx.quadraticCurveTo(tx - 2.8, ty * 0.45, -3.4, -0.7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function puffs(ctx, f) {
    ctx.fillStyle = '#cdbb94';
    for (const d of f.dust) {
      const k = d.t / d.life, r = d.r0 + (d.r1 - d.r0) * Math.sqrt(k);
      ctx.globalAlpha = 0.62 * (1 - k) * (1 - k);
      ctx.beginPath(); ctx.arc(d.x, d.y - r * 0.4, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ZS.fx = {
    init,
    update,
    onShot,
    dust,
    drawBack(ctx, g, viewW) {
      const f = ensure(g); setView(f, g, viewW);
      shafts(ctx, g, viewW);
      drawLayer(ctx, g, viewW, 0);
    },
    drawFront(ctx, g, viewW) {
      const f = ensure(g); setView(f, g, viewW);
      drawLayer(ctx, g, viewW, 1);
      for (const b of f.birds) bird(ctx, b);
      puffs(ctx, f);
    },
  };
})();
