(function () {
  const GY = ZS.CFG.GROUND;
  const TAU = Math.PI * 2;
  let wr = null;
  const rand = () => (wr ? wr() : Math.random());
  const rnd = (a, b) => a + rand() * (b - a);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const MAX = { ambient: 26, shaken: 5, birds: 9, dust: 16, total: 58, fall: 190, clumps: 10 };
  const BACK = 0.94, FRONT = 1.18;
  const KEYS = ['spring', 'summer', 'autumn'];
  const keyOf = (g) => ZS.seasonLook(g.seasonKey) || KEYS[g.seasonIdx | 0] || KEYS[0];
  const cold = (g) => !!(g.level && g.level.theme === 'winter');

  const TARGET = {
    spring: { bf: 4, pol: 14, gn: 0, lf: 0 },
    summer: { bf: 4, pol: 8, gn: 4, lf: 0 },
    autumn: { bf: 0, pol: 0, gn: 0, lf: 22 },
  };
  const KINDS = ['bf', 'pol', 'gn', 'lf'];
  const FALL = {
    advent: { dr: 52, wf: 12, fl: 0, cr: 0 },
    snow: { dr: 0, wf: 0, fl: 168, cr: 0 },
    frost: { dr: 0, wf: 0, fl: 0, cr: 42 },
  };
  const WKINDS = ['dr', 'wf', 'fl', 'cr'];
  const SEASONS = ['advent', 'snow', 'frost'];
  const GLINT = ['255,255,255', '214,240,255', '255,226,240', '230,255,250'];
  const BF_COLS = [['#f4d94a', '#c99a1c'], ['#f3f1e8', '#9aa0a6'], ['#78a8e8', '#2f4f9a'], ['#ee8a2e', '#5b2a12'], ['#e8c8f0', '#7a4a9a']];
  const LEAF_AUTUMN = ['#d8892f', '#c0392b', '#e6c34a', '#a8692c', '#b5532a'];
  const LEAF_GREEN = ['#6fae52', '#4f8a45', '#8cc152'];

  function ensure(g) { return g.fx || init(g); }
  function local(f) {
    if (!f.rng) { f.rng = ZS.util.mulberry32(20231); f.fall = f.fall || []; f.clumps = f.clumps || []; f.top = f.top || -40; }
    return f.rng;
  }
  function enter(f, g) { wr = cold(g) ? local(f) : null; }
  function setView(f, g, vw) {
    if (!vw || vw === f.viewW) return;
    const first = !f.vwKnown;
    f.vwKnown = true; f.viewW = vw;
    if (first) for (const p of f.parts) if (p.k !== 'gn') p.px = rnd(-30, vw + 30) + p.f * (g.cam || 0);
    if (first && f.fall) for (const p of f.fall) p.px = rnd(-30, vw + 30) + p.f * (g.cam || 0);
  }
  function total(f) { return f.parts.length + f.birds.length + f.dust.length; }

  function init(g) {
    const f = g.fx = {
      t: 0, wind: 14, flow: 0, camV: 0, lastCam: g.cam || 0, viewW: 900, spawnCd: 0,
      parts: [], birds: [], dust: [],
    };
    if (cold(g)) {
      wr = local(f);
      winterStart(f, g);
      return f;
    }
    wr = null;
    const tg = TARGET[keyOf(g)] || TARGET.spring;
    for (const k of KINDS) for (let i = 0; i < tg[k]; i++) addAmbient(f, g, k, 'init');
    return f;
  }

  function place(f, p, g, how) {
    const cam = g.cam || 0, vw = f.viewW;
    const sx = how === 'edge' ? (f.flow > 0 ? -rnd(20, 120) : vw + rnd(20, 120)) : rnd(-30, vw + 30);
    p.px = sx + p.f * cam;
    p.age = how === 'init' ? rnd(0.6, 1.2) : 0;
  }

  function addAmbient(f, g, k, how) {
    const front = rand() < 0.35;
    const p = {
      k, z: front ? 1 : 0, f: front ? FRONT : BACK, px: 0, y: 0, vx: 0, vy: 0, ph: rnd(0, TAU), age: 0, fade: 0,
      col: '#fff', col2: '#000', s: 1, rot: 0, vr: 0, by: 0, fl: rnd(0, TAU), dir: 1, cx: 0, cy: 0, sh: 0, land: 0, a: 1,
    };
    if (k === 'bf') {
      const c = pick(BF_COLS); p.col = c[0]; p.col2 = c[1]; p.s = rnd(0.85, 1.25);
      p.by = p.y = GY - rnd(30, 120); p.vx = rnd(10, 26) * (rand() < 0.5 ? -1 : 1); p.dir = p.vx < 0 ? -1 : 1;
    } else if (k === 'pol') {
      p.s = rnd(0.8, 1.5); p.y = GY - rnd(14, 300); p.vx = rnd(-4, 8); p.vy = rnd(-4, 3);
    } else if (k === 'gn') {
      p.s = rnd(0.7, 1); p.col = '#2a2a2a';
    } else {
      p.s = rnd(3.2, 5); p.col = pick(LEAF_AUTUMN); p.y = how === 'init' ? GY - rnd(30, 380) : GY - rnd(230, 400); p.vy = rnd(24, 44); p.vr = rnd(-2.2, 2.2); p.rot = rnd(0, TAU);
    }
    place(f, p, g, how);
    if (k === 'gn') {
      if (!f.swarm || f.swarm.n >= 4) f.swarm = { x: p.px, y: GY - rnd(40, 160), n: 0 };
      f.swarm.n++; p.cx = f.swarm.x; p.cy = f.swarm.y; p.px = p.cx; p.y = p.cy; p.s = rnd(8, 15);
    }
    f.parts.push(p);
    return p;
  }

  function addLeaf(f, g, x, y, color) {
    if (total(f) >= MAX.total) return;
    const p = addAmbient(f, g, 'lf', 'in');
    p.sh = 1; p.col = color; p.y = y; p.px = x + (p.f - 1) * (g.cam || 0);
    p.age = 0.4; p.vy = rnd(14, 34); p.vx = rnd(-30, 30);
  }

  function winterStart(f, g) {
    const key = FALL[g.seasonKey] ? g.seasonKey : 'snow', want = FALL[key];
    f.sw = { advent: 0, snow: 0, frost: 0 };
    f.sw[key] = 1;
    for (const k of WKINDS) for (let i = 0; i < want[k]; i++) addFall(f, g, k, 'init');
  }

  function addFall(f, g, k, how) {
    const front = rand() < 0.36;
    const p = { k, z: front ? 1 : 0, f: front ? FRONT : BACK, px: 0, y: 0, vy: 0, s: 1, ph: rnd(0, TAU), sw: 0, sf: 1, age: 0, fade: 0, a: 0, stop: 0, hit: 0, tw: 1, c: 0 };
    if (k === 'fl') { p.s = front ? rnd(2.1, 3.7) : rnd(1.05, 2.2); p.vy = front ? rnd(48, 72) : rnd(24, 42); p.sw = rnd(8, 22); p.sf = rnd(0.6, 1.4); }
    else if (k === 'wf') { p.s = front ? rnd(1.9, 2.8) : rnd(1.1, 1.8); p.vy = rnd(105, 150) * (front ? 1.15 : 0.82); p.sw = rnd(4, 9); p.sf = rnd(1, 2); }
    else if (k === 'dr') { p.s = front ? 1.3 : 0.85; p.vy = rnd(400, 520) * (front ? 1.12 : 0.86); }
    else { p.s = rnd(0.7, 1.5); p.vy = rnd(2, 8); p.sw = rnd(4, 12); p.sf = rnd(0.5, 1.6); p.tw = rnd(1.1, 2.6); p.c = Math.floor(rand() * GLINT.length); }
    const top = f.top, bot = GY + (front ? 20 : 0);
    if (how === 'init') { p.y = rnd(top, bot); p.age = 2; }
    else if (k === 'cr') p.y = rnd(top, GY - 8);
    else p.y = top - rnd(4, 70);
    p.px = rnd(-30, f.viewW + 30) + p.f * (g.cam || 0);
    f.fall.push(p);
  }

  function winterStep(f, g, dt, jump) {
    const cam = g.cam || 0, vw = f.viewW, key = FALL[g.seasonKey] ? g.seasonKey : 'snow', want = FALL[key];
    const ek = 1 - Math.exp(-dt * 0.7);
    for (const s of SEASONS) f.sw[s] += ((s === key ? 1 : 0) - f.sw[s]) * ek;
    const live = { dr: 0, wf: 0, fl: 0, cr: 0 };
    for (const p of f.fall) if (!p.stop) live[p.k]++;
    for (const k of WKINDS) {
      let extra = live[k] - want[k];
      for (let i = f.fall.length - 1; i >= 0 && extra > 0; i--) {
        const p = f.fall[i];
        if (p.k === k && !p.stop) { p.stop = 1; extra--; }
      }
      const need = Math.min(want[k] - live[k], k === 'cr' ? 1 : 3);
      for (let i = 0; i < need && f.fall.length < MAX.fall; i++) addFall(f, g, k, 'in');
    }
    const gust = 1 + 0.7 * f.sw.snow * (0.5 + 0.5 * Math.sin(f.t * 0.37 + 1));
    const wind = f.wind * gust + 6 * f.sw.snow, top = f.top;
    for (let i = f.fall.length - 1; i >= 0; i--) {
      const p = f.fall[i];
      p.age += dt; p.ph += dt;
      if (jump) p.px = rnd(-30, vw + 30) + p.f * cam;
      if (p.k === 'cr') {
        if (p.stop) p.fade += dt;
        if (p.fade > 1.2) { f.fall.splice(i, 1); continue; }
        p.px += (wind * 0.25 + Math.sin(p.ph * 0.5 * p.sf) * p.sw * 0.3) * dt;
        p.y += (p.vy + Math.sin(p.ph * 0.8) * 3) * dt;
        if (p.y > GY + 4) { p.y = top + rnd(0, 40); p.age = 0; }
      } else if (p.hit) {
        p.hit += dt;
        if (p.hit > 0.2) { if (p.stop) { f.fall.splice(i, 1); continue; } p.hit = 0; p.y = top - rnd(4, 60); p.px = rnd(-30, vw + 30) + p.f * cam; p.age = 0; }
        continue;
      } else {
        const lean = p.k === 'dr' ? 1.6 : p.k === 'wf' ? 0.7 : p.z ? 1.15 : 0.85;
        p.px += (wind * lean + Math.sin(p.ph * p.sf) * p.sw + (p.k === 'dr' ? 26 : 0)) * dt;
        p.y += p.vy * dt;
        const floor = p.z ? GY + 22 : GY - (p.k === 'fl' ? 2 : 0);
        if (p.y >= floor) {
          if (p.k === 'dr' && !p.z) { p.hit = 0.001; p.y = GY - 1 - rnd(0, 3); continue; }
          if (p.stop) { f.fall.splice(i, 1); continue; }
          p.y = top - rnd(4, 60); p.px = rnd(-30, vw + 30) + p.f * cam; p.age = 0;
        }
      }
      const sx = p.px - p.f * cam;
      if (sx < -40) p.px += vw + 80; else if (sx > vw + 40) p.px -= vw + 80;
      p.a = Math.min(1, p.age * 2.5) * (p.fade ? Math.max(0, 1 - p.fade / 1.2) : 1) * (p.z && p.k !== 'cr' ? Math.min(1, Math.max(0, (GY + 22 - p.y) / 26)) : 1);
    }
    for (let i = f.clumps.length - 1; i >= 0; i--) {
      const c = f.clumps[i];
      c.t += dt;
      if (c.t < 0) continue;
      if (c.k === 'p') {
        c.y += 16 * dt; c.x += wind * 0.35 * dt;
        if (c.t > c.life) f.clumps.splice(i, 1);
        continue;
      }
      c.vy += 520 * dt; c.vx *= 1 - Math.min(1, dt * 1.2);
      c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
      if (c.y >= GY - 3) {
        f.clumps.splice(i, 1);
        for (let k = 0; k < 2; k++) {
          if (f.dust.length >= MAX.dust) f.dust.shift();
          f.dust.push({ x: c.x + rnd(-5, 5), y: GY - rnd(0, 2), vx: rnd(-40, 40), vy: -rnd(8, 26), t: 0, life: rnd(0.5, 0.8), r0: c.r * 0.7, r1: c.r * 2 + rnd(2, 5) });
        }
      }
    }
  }

  function update(g, dt, viewW) {
    const f = ensure(g), w = cold(g);
    enter(f, g);
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

    if (w) {
      if (!f.sw) winterStart(f, g);
      if (f.parts.length) f.parts.length = 0;
      winterStep(f, g, dt, jump);
    } else {
      const tg = TARGET[keyOf(g)] || TARGET.spring, live = { bf: 0, pol: 0, gn: 0, lf: 0 };
      for (const p of f.parts) if (!p.sh && !p.fade) live[p.k]++;
      f.spawnCd -= dt;
      for (const k of KINDS) {
        while (live[k] > tg[k]) { const v = f.parts.find((p) => p.k === k && !p.sh && !p.fade); if (!v) break; v.fade = 0.001; live[k]--; }
        const ambient = f.parts.reduce((n, p) => n + (p.sh ? 0 : 1), 0);
        if (live[k] < tg[k] && f.spawnCd <= 0 && ambient < MAX.ambient && total(f) < MAX.total) { addAmbient(f, g, k, 'in'); f.spawnCd = 0.14; live[k]++; }
      }

      const wind = f.wind;
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

  function onShot(g, x) {
    const f = ensure(g);
    enter(f, g);
    if (cold(g)) { winterShot(f, g, x); return; }
    const n = Math.min(MAX.birds - f.birds.length, 4 + Math.floor(rand() * 3));
    const dirX = rand() < 0.5 ? -1 : 1;
    for (let i = 0; i < n && total(f) < MAX.total; i++) {
      f.birds.push({
        x: x + rnd(-80, 80), y: GY - rnd(190, 330), vx: dirX * rnd(30, 110) + rnd(-50, 50), vy: -rnd(120, 210),
        cv: dirX * rnd(115, 180), cy: -rnd(25, 70), ph: rnd(0, TAU), fr: rnd(11, 15), t: 0, life: rnd(3.2, 4.4),
        wait: i * 0.035 + rnd(0, 0.1), s: rnd(0.9, 1.3), dir: dirX,
      });
    }
    const green = keyOf(g) !== 'autumn';
    const shaken = f.parts.reduce((c, p) => c + p.sh, 0);
    for (let i = 0; shaken + i < MAX.shaken && i < 4; i++) addLeaf(f, g, x + rnd(-90, 90), GY - rnd(190, 330), pick(green ? LEAF_GREEN : LEAF_AUTUMN));
  }

  function winterShot(f, g, x) {
    const crows = rand() < 0.4, dirX = rand() < 0.5 ? -1 : 1;
    const n = Math.min(MAX.birds - f.birds.length, crows ? 2 + Math.floor(rand() * 2) : 4 + Math.floor(rand() * 3));
    for (let i = 0; i < n; i++) {
      f.birds.push({
        k: crows ? 'crow' : 'finch', x: x + rnd(-80, 80), y: GY - rnd(180, 320),
        vx: dirX * rnd(30, 100) + rnd(-40, 40), vy: -rnd(crows ? 90 : 120, crows ? 150 : 210),
        cv: dirX * (crows ? rnd(90, 135) : rnd(115, 175)), cy: -rnd(crows ? 18 : 25, crows ? 45 : 70), ph: rnd(0, TAU),
        fr: crows ? rnd(6.5, 8.5) : rnd(13, 17), t: 0, life: rnd(crows ? 4 : 3.2, crows ? 5.2 : 4.4),
        wait: i * (crows ? 0.12 : 0.04) + rnd(0, 0.12), s: crows ? rnd(1.45, 1.75) : rnd(0.95, 1.2), dir: dirX,
      });
    }
    for (let i = 0; i < 5 && f.clumps.length < MAX.clumps; i++) {
      f.clumps.push({ k: 'c', x: x + rnd(-95, 95), y: GY - rnd(170, 320), vx: rnd(-18, 18), vy: rnd(-12, 24), r: rnd(3, 6.5), rot: rnd(0, TAU), vr: rnd(-4, 4), t: -i * 0.07 - rnd(0, 0.15), life: 0 });
    }
    for (let i = 0; i < 3 && f.clumps.length < MAX.clumps; i++) {
      f.clumps.push({ k: 'p', x: x + rnd(-80, 80), y: GY - rnd(190, 310), vx: 0, vy: 0, r: rnd(14, 24), rot: 0, vr: 0, t: -i * 0.08, life: rnd(1.5, 2.2) });
    }
  }

  function dust(g, x, y, n, dir) {
    const f = ensure(g);
    enter(f, g);
    for (let i = 0; i < (n || 1); i++) {
      if (f.dust.length >= MAX.dust) f.dust.shift();
      f.dust.push({
        x: x + rnd(-6, 6), y: (y === undefined ? GY : y) - rnd(0, 3), vx: rnd(-50, 50) - (dir || 0) * rnd(10, 70), vy: -rnd(10, 34),
        t: 0, life: rnd(0.45, 0.8), r0: rnd(2.4, 3.8), r1: rnd(7, 11),
      });
    }
  }

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
    if (summer) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * tw).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * tw).toFixed(2) + ')'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = -2.2 + i * 0.55 + p.ph * 0.1; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 3.4, y + Math.sin(a) * r * 3.4); }
      ctx.stroke();
    } else {
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
    const f = g.fx, cam = g.cam || 0, summer = keyOf(g) === 'summer';
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

  function drawFall(ctx, g, viewW, layer) {
    const f = g.fx, cam = g.cam || 0, fs = f.fall;
    if (!fs || !fs.length) return;
    const vis = (p) => { const sx = p.px - p.f * cam; return sx > -12 && sx < viewW + 12; };
    let n = 0;
    ctx.beginPath();
    for (const p of fs) {
      if (p.z !== layer || p.k !== 'fl' || !vis(p)) continue;
      const x = p.px - (p.f - 1) * cam, r = p.s * p.a * (layer ? 1.9 : 1.6);
      if (r < 0.3) continue;
      ctx.moveTo(x + r, p.y); ctx.arc(x, p.y, r, 0, TAU); n++;
    }
    if (n) {
      ctx.fillStyle = layer ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)'; ctx.fill();
      ctx.beginPath();
      for (const p of fs) {
        if (p.z !== layer || p.k !== 'fl' || !vis(p)) continue;
        const x = p.px - (p.f - 1) * cam, r = p.s * p.a;
        if (r < 0.2) continue;
        ctx.moveTo(x + r, p.y); ctx.arc(x, p.y, r, 0, TAU);
      }
      ctx.fillStyle = layer ? 'rgba(255,255,255,0.96)' : 'rgba(250,252,255,0.86)'; ctx.fill();
    }
    n = 0;
    ctx.beginPath();
    for (const p of fs) {
      if (p.z !== layer || p.k !== 'dr' || p.hit || !vis(p)) continue;
      const x = p.px - (p.f - 1) * cam, l = 0.03 * p.a;
      ctx.moveTo(x, p.y); ctx.lineTo(x - (f.wind * 1.6 + 26) * l, p.y - p.vy * l); n++;
    }
    if (n) {
      ctx.strokeStyle = layer ? 'rgba(218,228,238,0.68)' : 'rgba(200,212,226,0.55)'; ctx.lineWidth = layer ? 1.4 : 0.95;
      ctx.stroke();
    }
    if (!layer) {
      ctx.strokeStyle = 'rgba(214,226,238,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      n = 0;
      for (const p of fs) {
        if (p.k !== 'dr' || !p.hit || p.z) continue;
        const x = p.px - (p.f - 1) * cam, u = p.hit / 0.2, r = 1.5 + u * 5;
        if (!vis(p)) continue;
        ctx.moveTo(x + r, p.y); ctx.ellipse(x, p.y, r, r * 0.28, 0, 0, TAU); n++;
      }
      if (n) ctx.stroke();
    }
    n = 0;
    ctx.beginPath();
    for (const p of fs) {
      if (p.z !== layer || p.k !== 'wf' || !vis(p)) continue;
      const x = p.px - (p.f - 1) * cam, r = p.s * p.a;
      if (r < 0.2) continue;
      ctx.moveTo(x + r * 0.8, p.y); ctx.ellipse(x, p.y, r * 0.8, r * 1.3, -0.12, 0, TAU); n++;
    }
    if (n) { ctx.fillStyle = layer ? 'rgba(236,240,242,0.9)' : 'rgba(226,231,234,0.8)'; ctx.fill(); }
    n = 0;
    ctx.beginPath();
    for (const p of fs) {
      if (p.z !== layer || p.k !== 'cr' || !vis(p)) continue;
      const x = p.px - (p.f - 1) * cam, r = p.s * 0.55;
      ctx.moveTo(x + r, p.y); ctx.arc(x, p.y, r, 0, TAU); n++;
    }
    if (n) { ctx.fillStyle = 'rgba(236,246,255,' + (0.5 * (layer ? 1 : 0.8)).toFixed(3) + ')'; ctx.fill(); }
    for (const p of fs) {
      if (p.z !== layer || p.k !== 'cr' || !vis(p)) continue;
      const gl = Math.pow(Math.max(0, Math.sin(f.t * p.tw + p.ph * 7)), 12) * p.a * (p.fade ? Math.max(0, 1 - p.fade / 1.2) : 1);
      if (gl < 0.04) continue;
      const x = p.px - (p.f - 1) * cam, l = (2 + 5.5 * gl) * p.s * (layer ? 1.25 : 1);
      ctx.fillStyle = 'rgba(' + GLINT[p.c] + ',' + gl.toFixed(3) + ')';
      ctx.fillRect(x - l, p.y - 0.45, l * 2, 0.9); ctx.fillRect(x - 0.45, p.y - l, 0.9, l * 2);
      ctx.fillRect(x - 1.1, p.y - 1.1, 2.2, 2.2);
    }
  }

  function measure(f, ctx) {
    const m = ctx.getTransform ? ctx.getTransform() : null;
    if (m && m.d > 0 && Number.isFinite(m.f)) f.top = Math.min(-30, -m.f / m.d - 10);
  }

  function shafts(ctx, g, viewW, frost) {
    const f = g.fx, cam = g.cam || 0, warm = !frost && keyOf(g) === 'autumn', par = 0.8, gap = 330, top = -240;
    ctx.fillStyle = frost ? 'rgb(236,244,255)' : warm ? 'rgb(255,208,140)' : 'rgb(255,247,200)';
    for (let i = Math.floor((cam * par - 300) / gap); i * gap - cam * par < viewW + 260; i++) {
      const h = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1;
      const a = ((warm ? 0.05 : 0.055) + 0.035 * Math.sin(f.t * 0.35 + i * 1.7)) * (frost || 1);
      if (a <= 0.005) continue;
      const x = i * gap + h * 150 - (par - 1) * cam, w = 26 + h * 36, sl = (frost ? 0.42 + h * 0.08 : 0.2 + h * 0.07) * (GY - top);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w + sl, GY); ctx.lineTo(x + sl, GY); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

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

  function finch(ctx, b) {
    const fly = Math.sin(b.ph), d = b.vx >= 0 ? 1 : -1;
    ctx.fillStyle = '#1f2126';
    ctx.beginPath(); ctx.moveTo(-3.6, -0.4); ctx.lineTo(-8.4, -1.4); ctx.lineTo(-8.2, 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#737c88'; ctx.beginPath(); ctx.ellipse(0, -0.3, 4.6, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e4533d'; ctx.beginPath(); ctx.ellipse(0.8, 0.9, 3.7, 1.7, 0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2f2ef'; ctx.beginPath(); ctx.ellipse(-3.4, -0.4, 1.2, 1.1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1c20'; ctx.beginPath(); ctx.arc(4.2, -0.9, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e4533d'; ctx.beginPath(); ctx.arc(4.6, 0.3, 1.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(5.9, -1.4); ctx.lineTo(7.6, -0.5); ctx.lineTo(5.9, 0.2); ctx.closePath(); ctx.fill();
    const tx = -1.6 - 2.4 * Math.abs(fly), ty = -0.8 - 9 * fly;
    ctx.fillStyle = '#25272c';
    ctx.beginPath(); ctx.moveTo(2.4, -0.8); ctx.quadraticCurveTo(tx + 3.4, ty * 0.55, tx, ty); ctx.quadraticCurveTo(tx - 2.8, ty * 0.45, -3.4, -0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,235,230,0.85)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(1.4, -0.9 + ty * 0.18); ctx.lineTo(-1.8, -0.9 + ty * 0.24); ctx.stroke();
    return d;
  }

  function crow(ctx, b) {
    const gl = 0.55 + 0.45 * Math.sin(b.t * 1.3 + b.ph * 0.05), fly = Math.sin(b.ph) * gl;
    ctx.fillStyle = '#1b1c21';
    ctx.beginPath(); ctx.moveTo(-5, -0.4); ctx.lineTo(-11, -2); ctx.lineTo(-11.6, 0.4); ctx.lineTo(-10.6, 2.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(5.6, -1, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#34363d'; ctx.beginPath(); ctx.moveTo(7.4, -1.9); ctx.lineTo(10.8, -0.7); ctx.lineTo(7.4, 0.2); ctx.closePath(); ctx.fill();
    const tx = -3 - 3.4 * Math.abs(fly), ty = -0.8 - 11.5 * fly;
    ctx.fillStyle = '#26282e';
    ctx.beginPath(); ctx.moveTo(3.4, -0.8);
    ctx.quadraticCurveTo(tx + 5, ty * 0.5, tx + 1.6, ty);
    ctx.lineTo(tx - 0.2, ty + (fly > 0 ? 1.4 : -1.4)); ctx.lineTo(tx - 1.8, ty + (fly > 0 ? 0.6 : -0.6)); ctx.lineTo(tx - 3, ty + (fly > 0 ? 2.2 : -2.2));
    ctx.quadraticCurveTo(tx - 3.6, ty * 0.4, -4.4, -0.8); ctx.closePath(); ctx.fill();
  }

  function wbird(ctx, b) {
    if (b.wait > 0) return;
    if (!b.k) { bird(ctx, b); return; }
    const d = b.vx >= 0 ? 1 : -1;
    ctx.globalAlpha = Math.max(0, Math.min(1, (b.life - b.t) / 0.7));
    ctx.save();
    ctx.translate(b.x, b.y); ctx.scale(d * b.s, b.s); ctx.rotate(Math.atan2(b.vy, Math.abs(b.vx) + 1) * 0.65);
    if (b.k === 'crow') crow(ctx, b); else finch(ctx, b);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function clumps(ctx, f) {
    for (const c of f.clumps) {
      if (c.t < 0) continue;
      if (c.k === 'p') {
        const k = c.t / c.life, r = c.r * (0.7 + k * 1.3), a = 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k);
        if (a < 0.01) continue;
        const gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
        gr.addColorStop(0, 'rgba(252,253,255,' + a.toFixed(3) + ')'); gr.addColorStop(0.55, 'rgba(252,253,255,' + (a * 0.45).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(252,253,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
        continue;
      }
      ctx.fillStyle = 'rgba(248,251,255,0.55)';
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath(); ctx.arc(c.x - c.vx * 0.025 * k + Math.sin(c.rot + k) * 1.5, c.y - c.vy * 0.03 * k, Math.max(0.4, c.r * (0.42 - k * 0.1)), 0, TAU); ctx.fill();
      }
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = 'rgba(150,172,200,0.75)';
      ctx.beginPath(); ctx.arc(0.6, 0.9, c.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fbfdff';
      ctx.beginPath(); ctx.arc(0, 0, c.r, 0, TAU); ctx.arc(c.r * 0.75, -c.r * 0.2, c.r * 0.62, 0, TAU); ctx.arc(-c.r * 0.6, c.r * 0.25, c.r * 0.55, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function puffs(ctx, f, snow) {
    if (snow) {
      for (const d of f.dust) {
        const k = d.t / d.life, r = d.r0 + (d.r1 - d.r0) * Math.sqrt(k), a = (1 - k) * (1 - k);
        ctx.fillStyle = 'rgba(160,180,206,' + (0.42 * a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d.x + r * 0.12, d.y - r * 0.3, r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d.x - r * 0.1, d.y - r * 0.52, r * 0.88, 0, TAU); ctx.fill();
      }
      return;
    }
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
      const f = ensure(g);
      enter(f, g);
      setView(f, g, viewW);
      if (cold(g)) {
        measure(f, ctx);
        if (f.sw && f.sw.frost > 0.01) shafts(ctx, g, viewW, f.sw.frost * 0.7);
        clumps(ctx, f);
        drawFall(ctx, g, viewW, 0);
        return;
      }
      if (!g.level.vychodna) shafts(ctx, g, viewW, 0);
      drawLayer(ctx, g, viewW, 0);
    },
    drawFront(ctx, g, viewW) {
      const f = ensure(g);
      enter(f, g);
      setView(f, g, viewW);
      if (cold(g)) {
        drawFall(ctx, g, viewW, 1);
        for (const b of f.birds) wbird(ctx, b);
        puffs(ctx, f, true);
        return;
      }
      drawLayer(ctx, g, viewW, 1);
      for (const b of f.birds) bird(ctx, b);
      puffs(ctx, f);
    },
  };
})();
