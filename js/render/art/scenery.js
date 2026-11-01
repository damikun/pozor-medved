(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const API = (ZS.scenery = {});
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, sqrt = Math.sqrt, hypot = Math.hypot, atan2 = Math.atan2, exp = Math.exp;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(sin(n * 127.1 + 311.7) * 43758.5453);
  const hash2 = (a, b) => hash(a * 57.31 + b * 13.97 + 0.17);

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
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
  function line(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function txt(ctx, s, x, y, size, col, weight, spacing, maxW) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    const w = maxW ? ctx.measureText(s).width + (spacing || 0) * s.length : 0;
    if (w > maxW) ctx.font = (weight || 700) + ' ' + (size * maxW / w) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  const shadeCache = {};
  function dk(hex, k) {
    const key = hex + k;
    let v = shadeCache[key];
    if (!v) {
      const n = parseInt(hex.slice(1), 16), c = (s) => Math.min(255, Math.round(((n >> s) & 255) * k));
      v = shadeCache[key] = 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
    }
    return v;
  }
  function viewRange(ctx, pad) {
    const m = ctx.getTransform ? ctx.getTransform() : null;
    if (!m || !m.a) return [-1e9, 1e9];
    return [-m.e / m.a - pad, (ctx.canvas.width - m.e) / m.a + pad];
  }

  const stores = {};
  let objSeed = 0;
  function seedOf(v) {
    if (typeof v === 'number') return (abs(v) * 12.9898) % TAU;
    const s = String(v); let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 9973;
    return (n / 9973) * TAU;
  }
  function stateOf(kind, o, time, make) {
    const S = stores[kind] || (stores[kind] = { byId: new Map(), byObj: new WeakMap(), sweepAt: 0 });
    let st;
    if (o.id !== undefined && o.id !== null) {
      st = S.byId.get(o.id);
      if (!st) { st = make(seedOf(o.id)); S.byId.set(o.id, st); }
      st.seen = time;
      if (time < S.sweepAt - 1 || time > S.sweepAt + 8) {
        S.sweepAt = time;
        for (const [k, v] of S.byId) if (v !== st && (v.seen < time - 12 || v.seen > time + 1)) S.byId.delete(k);
      }
    } else {
      st = S.byObj.get(o);
      if (!st) { st = make((objSeed += 1.618) % TAU); S.byObj.set(o, st); }
    }
    return st;
  }

  function smoke(ctx, x, y, time, seed, k) {
    for (let i = 0; i < 7; i++) {
      const u = frac(time * 0.15 + i / 7);
      const a = 0.5 * sstep(0, 0.12, u) * (1 - sstep(0.5, 1, u));
      ctx.fillStyle = 'rgba(232,232,228,' + a.toFixed(3) + ')';
      circle(ctx, x + (sin(u * 6.6 + seed) * 6 + u * 24) * k, y - u * 78 * k, (3.4 + u * 9.5) * k);
    }
  }

  function snowCap(ctx, x0, x1, y, h, seed) {
    const n = Math.max(3, Math.round((x1 - x0) / 9)), p = [x0 - 1.5, y + 1.2];
    for (let i = 0; i <= n; i++) p.push(lerp(x0, x1, i / n), y - h * (0.35 + 0.65 * Math.pow(sin(PI * i / n), 0.4)) - (hash2(seed, i) - 0.5) * h * 0.4);
    p.push(x1 + 1.5, y + 1.2);
    ctx.fillStyle = 'rgba(150,176,204,0.55)'; ctx.save(); ctx.translate(0.6, 1.3); poly(ctx, p); ctx.restore();
    ctx.fillStyle = '#f5f8fb'; poly(ctx, p);
  }
  function icicles(ctx, x0, x1, y, n, len, seed) {
    ctx.fillStyle = 'rgba(200,228,245,0.92)';
    for (let i = 0; i < n; i++) { const ix = lerp(x0, x1, (i + 0.5) / n) + (hash(i * 2.9 + seed) - 0.5) * 3, il = len * (0.4 + hash(i * 3.3 + seed) * 0.6); poly(ctx, [ix - 1.1, y, ix + 1.1, y, ix + 0.15, y + il]); }
  }

  const LOG = ['#4a3122', '#553826', '#472e1f', '#5b3f2c', '#4e3424'];
  let roofGeo = null;
  function hutRoof() {
    if (roofGeo) return roofGeo;
    const g = roofGeo = { tone: [new Path2D(), new Path2D(), new Path2D(), new Path2D()], edge: new Path2D() };
    const eave = -66, apex = -122, rows = 9, rh = (eave - apex) / rows;
    for (let r = 0; r < rows; r++) {
      const yb = eave - r * rh, hw = 98 * (yb - apex) / (eave - apex), n = Math.ceil(hw / 10) + 1;
      for (let i = -n; i <= n; i++) {
        const sx = i * 10 + (r % 2) * 5 - 5;
        g.tone[Math.floor(hash2(r, i) * 4)].rect(sx, yb - rh, 10, rh);
        g.edge.rect(sx, yb - 1.3, 10, 1.3);
      }
    }
    return g;
  }

  const bang = (t) => (t <= 0 ? 0 : 1 - exp(-9 * t) * cos(13 * t));
  function swing(s, time) {
    if (!s || time < s.at) return 0;
    if (s.shut >= s.at && time >= s.shut) return bang(s.shut - s.at) * (1 - sstep(0, 0.55, time - s.shut));
    return bang(time - s.at);
  }
  const SEATS = [{ x: 8.5, face: 1 }, { x: 24, face: -1 }];
  const IDLE = [{ look: 1, mug: true, mode: 'sit', at: -9 }, { look: 3, mug: false, mode: 'sit', at: -9 }];
  const ROOM = [2.5, -59.5, 27, 24.1];

  function seatPose(s, time) {
    const u = time - s.at;
    if (s.mode === 'sit') return [sstep(0, 0.6, u), 0, s.mug ? 'drink' : 'eat'];
    if (s.mode === 'alarm') return [1, sstep(0, 0.22, u), 'alarm'];
    if (s.mode === 'duck') return [1 - sstep(0, 0.4, u), 1 - sstep(0, 0.3, u), 'alarm'];
    return null;
  }

  function door(ctx, time, st, fl) {
    const a = swing(st && st.door, time);
    ctx.fillStyle = '#2e1d12'; ctx.fillRect(-44, -64, 32, 64);
    if (a < 0.01) {
      ctx.fillStyle = '#6f4a2c'; ctx.fillRect(-41, -61, 26, 61);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 1; i < 4; i++) ctx.fillRect(-41 + i * 6.5, -61, 1.2, 61);
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-41, -52, 26, 2.4); ctx.fillRect(-41, -14, 26, 2.4);
      ctx.fillStyle = '#c9a64a'; circle(ctx, -20, -30, 1.9);
      return;
    }
    const k = Math.min(1, a);
    ctx.fillStyle = '#2a1a0f'; ctx.fillRect(-41, -61, 26, 61);
    ctx.fillStyle = 'rgba(255,186,96,' + (0.34 * fl * k).toFixed(3) + ')'; ctx.fillRect(-41, -61, 26, 61);
    ctx.fillStyle = 'rgba(255,226,150,' + (0.5 * fl * k).toFixed(3) + ')'; circle(ctx, -28, -52, 6);
    ctx.fillStyle = 'rgba(24,12,5,0.6)'; ctx.fillRect(-38, -27, 22, 2.6); ctx.fillRect(-36, -24.4, 2, 12); ctx.fillRect(-20, -24.4, 2, 12);
    ctx.fillStyle = 'rgba(192,57,43,0.75)'; for (let i = 0; i < 11; i += 2) ctx.fillRect(-38 + i * 2, -28.6, 2, 1.6);
    ctx.fillStyle = 'rgba(255,214,150,' + (0.2 * k).toFixed(3) + ')'; poly(ctx, [-41, 0, -15, 0, -9, 3.4, -47, 3.4]);
    const ang = PI * 0.8 * clamp(a, 0, 1.12), c = cos(ang), w = 26 * c, p = sin(ang) * 4, fx = -41 + w;
    ctx.fillStyle = c > 0 ? '#6f4a2c' : '#4f3420'; poly(ctx, [-41, -61, fx, -61 - p, fx, p * 0.25, -41, 0]);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) { const xi = -41 + (w * i) / 4, q = (p * i) / 4; ctx.moveTo(xi, -61 - q); ctx.lineTo(xi, q * 0.25); }
    ctx.stroke();
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const y of [-51, -13]) { ctx.moveTo(-41, y); ctx.lineTo(fx, y + (y / 61) * p); }
    ctx.stroke();
    if (c > 0.2) { ctx.fillStyle = '#c9a64a'; circle(ctx, -41 + w * 0.8, -30 - p * 0.4, 1.9); }
  }

  function pane(ctx, hx, side, a) {
    const ang = PI * 0.92 * clamp(a, 0, 1.12), c = cos(ang), w = 13.5 * c * side, p = sin(ang) * 2.4, fx = hx + w;
    const at = (t, y0, y1) => [hx + w * t, y0 - p * t, y1 + p * 0.5 * t];
    ctx.fillStyle = c > 0 ? '#2e1d12' : '#3b2617'; poly(ctx, [hx, -59.5, fx, -59.5 - p, fx, -33.5 + p * 0.5, hx, -33.5]);
    const i0 = at(0.12, -58, -35), i1 = at(0.88, -58, -35);
    ctx.fillStyle = c > 0 ? 'rgba(255,236,190,0.5)' : 'rgba(255,236,190,0.28)'; poly(ctx, [i0[0], i0[1], i1[0], i1[1], i1[0], i1[2], i0[0], i0[2]]);
    ctx.fillStyle = c > 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)';
    const r0 = at(0.2, -57, -50), r1 = at(0.42, -57, -50); poly(ctx, [r0[0], r0[1], r1[0], r1[1], r0[0], r0[2]]);
    const m0 = at(0, -47.6, -45.8), m1 = at(1, -47.6, -45.8);
    ctx.fillStyle = c > 0 ? '#2e1d12' : '#3b2617'; poly(ctx, [m0[0], m0[1] + 0, m1[0], m1[1] + p * 0.1, m1[0], m1[1] + 1.8, m0[0], m0[1] + 1.8]);
  }

  function windowRoom(ctx, x, time, st, fl) {
    const a = swing(st && st.win, time);
    ctx.fillStyle = '#5a3b27'; ctx.fillRect(-7, -61, 7, 29); ctx.fillRect(32, -61, 7, 29);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 5; i++) { ctx.fillRect(-7, -58 + i * 5.6, 7, 1); ctx.fillRect(32, -58 + i * 5.6, 7, 1); }
    ctx.fillStyle = '#2e1d12'; ctx.fillRect(0, -62, 32, 31);
    ctx.fillStyle = '#b8732c'; ctx.fillRect(2.5, -59.5, 27, 26);
    ctx.fillStyle = 'rgba(80,40,14,0.28)'; for (let i = 0; i < 3; i++) ctx.fillRect(2.5, -55 + i * 8, 27, 1.6);
    ctx.fillStyle = 'rgba(255,226,150,' + (0.55 * fl).toFixed(3) + ')'; circle(ctx, 16, -56.5, 7.5);
    ctx.fillStyle = '#3a2618'; ctx.fillRect(15.4, -59.5, 1.2, 2.4);
    ctx.fillStyle = '#ffe9a6'; circle(ctx, 16, -56.2, 1.6);
    const seats = st ? st.seats : IDLE;
    for (let i = Math.min(seats.length, SEATS.length) - 1; i >= 0; i--) {
      const s = seats[i], v = seatPose(s, time);
      if (!v || v[0] <= 0.001) continue;
      ZS.drawGuestBust(ctx, { x: SEATS[i].x, y: -36, face: SEATS[i].face, up: v[0], stand: v[1], act: v[2], kind: 'guest', look: s.look, seed: x + i * 7, scale: 0.8, clip: ROOM }, time);
    }
    if (st) {
      for (const o of st.guests) {
        if (o.done || o.ph !== 'alarm' || o.seat >= 0) continue;
        ZS.drawGuestBust(ctx, { x: 16, y: -36, face: o.dir, up: sstep(0, 0.15, o.pt), stand: sstep(0, 0.25, o.pt), act: 'alarm', kind: o.kind, look: o.look, seed: o.id, scale: 0.8, clip: ROOM }, time);
      }
    }
    ctx.fillStyle = '#f4efe6'; ctx.fillRect(2.5, -35.4, 27, 1.9);
    ctx.fillStyle = '#c0392b'; for (let i = 0; i < 9; i += 2) ctx.fillRect(2.5 + i * 3, -35.4, 3, 1.9);
    if (a < 0.02) {
      ctx.fillStyle = 'rgba(255,240,170,' + (0.3 * fl).toFixed(3) + ')'; ctx.fillRect(2.5, -59.5, 27, 26);
      ctx.fillStyle = 'rgba(255,255,255,0.13)'; poly(ctx, [6, -59.5, 11, -59.5, 2.5, -45, 2.5, -53]);
      ctx.fillStyle = '#2e1d12'; ctx.fillRect(15.1, -59.5, 1.8, 26); ctx.fillRect(2.5, -47.6, 27, 1.8);
    } else {
      pane(ctx, 2.5, 1, a);
      pane(ctx, 29.5, -1, a);
    }
    ctx.fillStyle = '#7a5534'; ctx.fillRect(-2, -31, 36, 2.5);
  }

  const GEO = () => ZS.sim.koliba.GEO;

  function hatch(ctx, time, st, front) {
    const hx = GEO().hatch, a = swing(st && st.lid, time);
    const ang = PI * 0.82 * clamp(a, 0, 1.15), lh = 12 * cos(ang), p = sin(ang) * 1.6;
    if (front) {
      if (a >= 0.01 && lh > 0) { ctx.fillStyle = '#6a4630'; poly(ctx, [hx - 7.5, -101, hx + 7.5, -101, hx + 7.5 + p, -101 + lh, hx - 7.5 - p, -101 + lh]); }
      return;
    }
    ctx.fillStyle = '#3a2618'; ctx.fillRect(hx - 9, -102.6, 18, 14.6);
    ctx.fillStyle = 'rgba(255,235,200,0.1)'; ctx.fillRect(hx - 9, -102.6, 18, 1);
    if (a < 0.01) {
      ctx.fillStyle = '#6a4630'; ctx.fillRect(hx - 7.5, -101, 15, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(hx - 2.8, -101, 0.9, 12); ctx.fillRect(hx + 2.2, -101, 0.9, 12);
      ctx.fillStyle = 'rgba(255,235,200,0.08)'; ctx.fillRect(hx - 7.5, -101, 15, 1);
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(hx, -91.8, 1.5, 0, TAU); ctx.stroke();
      return;
    }
    ctx.fillStyle = '#160d07'; ctx.fillRect(hx - 7.5, -101, 15, 12);
    ctx.fillStyle = 'rgba(255,180,90,0.18)'; ctx.fillRect(hx - 7.5, -93, 15, 4);
    if (lh <= 0) {
      ctx.fillStyle = '#4a2f1f'; poly(ctx, [hx - 7.5, -101, hx + 7.5, -101, hx + 7.5 + p, -101 + lh, hx - 7.5 - p, -101 + lh]);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(hx - 2.8, -101 + lh, 0.9, -lh); ctx.fillRect(hx + 2.2, -101 + lh, 0.9, -lh);
    }
  }

  function roofBusts(ctx, x, time, st) {
    if (!st) return;
    const G = GEO(), face = Math.sign((st.bearX === undefined ? x - 1 : st.bearX) - (x + G.hatch)) || 1;
    for (const o of st.guests) {
      if (o.done || o.route !== 'hatch' || (o.ph !== 'up' && o.ph !== 'perch' && o.ph !== 'sink')) continue;
      const act = o.ph === 'perch' ? (o.act === 'peek' ? 'peek' : o.act) : 'peek';
      ZS.drawGuestBust(ctx, { x: G.hatch, y: G.base, face, up: o.k, stand: 0, act, kind: o.kind, look: o.look, seed: o.id, scale: 0.78, hip: 2, clip: [G.hatch - 50, -190, 100, 190 + G.base] }, time);
    }
  }

  function guests(ctx, x, time, st) {
    if (!st) return;
    const G = GEO();
    for (const o of st.guests) {
      if (o.done || o.step < 0) continue;
      const ph = o.ph, h = o.h;
      const state = ph === 'dive' || ph === 'jump' ? ph : ph === 'fall' || ph === 'lie' || ph === 'rise' ? 'down'
        : ph === 'climb' || ph === 'descend' ? 'climbOut' : ph === 'step' || ph === 'back' ? 'walk' : ph === 'cling' ? 'cling' : '';
      if (!state) continue;
      const roof = state === 'climbOut' || state === 'walk' || state === 'cling';
      h.kind = o.kind; h.look = o.look; h.x = o.x; h.y = o.y; h.dir = roof ? o.face : o.dir; h.outfit = 'summer'; h.cold = 0;
      h.empty = o.kind === 'guest' ? !o.mug : false; h.armed = false; h.clutch = false; h.texting = false; h.kick = 0; h.scared = true;
      h.state = state; h.k = o.k; h.act = o.act; h.downPhase = ph; h.downK = o.k; h.grip = GY + G.lid; h.reach = G.chimney - G.perch;
      h.slope = state === 'walk' ? 56 / 98 : 0; h.balance = state === 'walk'; h.clip = null; h.size = roof ? 0.76 : 1;
      if ((state === 'dive' || state === 'jump') && o.k < 0.4) {
        const e = 360 * Math.pow(sstep(0.02, 0.3, o.k), 2);
        h.clip = [x + 2.5 - e, GY - 59.5 - e, 27 + 2 * e, 26 + 2 * e];
      }
      if (state === 'climbOut' && o.y > GY + G.base - 0.5) h.clip = [x + G.hatch - 60, GY - 320, 120, 320 + G.base];
      ZS.drawHuman(ctx, h, time);
    }
  }

  function koliba(ctx, x, time, st) {
    const fl = 0.86 + 0.14 * sin(time * 5.3) * sin(time * 2.1 + 1);
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.15)'; ell(ctx, 0, 1, 104, 4.5);
    ctx.fillStyle = '#8a857d'; ctx.fillRect(-84, -9, 168, 9);
    ctx.fillStyle = '#6c675f';
    for (let i = 0; i < 9; i++) ctx.fillRect(-82 + i * 19 + (i % 2) * 4, -9, 1.5, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-84, -9, 168, 2);
    for (let i = 0; i < 6; i++) {
      const y = -9 - (i + 1) * 10.2, o = (i % 2) * 2.2;
      ctx.fillStyle = LOG[i % 5]; rr(ctx, -80, y, 160, 10.2, 4.2);
      ctx.fillStyle = 'rgba(255,225,180,0.11)'; ctx.fillRect(-76, y + 1, 152, 2.2);
      ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fillRect(-76, y + 8, 152, 2.2);
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#a07c55'; ell(ctx, s * (81 + o), y + 5.1, 3.4, 5);
        ctx.fillStyle = '#86623f'; ell(ctx, s * (81.4 + o), y + 5.1, 1.7, 2.6);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-80, -70, 160, 8);
    door(ctx, time, st, fl);
    windowRoom(ctx, x, time, st, fl);
    ctx.fillStyle = '#8a6339'; ctx.fillRect(-11, -17, 52, 4); ctx.fillRect(-7, -13, 4, 13); ctx.fillRect(33, -13, 4, 13);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-11, -17, 52, 1.2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-10, -13, 50, 1.6);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5 - r; c++) {
        const lx = 50 + c * 9.2 + r * 4.6, ly = -4.7 - r * 8.4;
        ctx.fillStyle = r % 2 ? '#a98258' : '#b88f62'; circle(ctx, lx, ly, 4.6);
        ctx.fillStyle = '#7d5a39'; circle(ctx, lx, ly, 2.6);
        ctx.fillStyle = '#a98258'; circle(ctx, lx - 0.3, ly - 0.2, 1.1);
      }
    }
    const g = hutRoof(), tone = ['#6e4a33', '#613f2b', '#78533a', '#573826'];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-98, -66); ctx.lineTo(0, -122); ctx.lineTo(98, -66); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#5c3d29'; ctx.fillRect(-98, -122, 196, 56);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = tone[i]; ctx.fill(g.tone[i]); }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(g.edge);
    ctx.fillStyle = 'rgba(0,0,0,0.09)'; poly(ctx, [0, -122, 98, -66, 0, -66]);
    ctx.fillStyle = 'rgba(255,235,200,0.04)'; poly(ctx, [-98, -66, 0, -122, 0, -66]);
    ctx.restore();
    ctx.fillStyle = '#34231a'; ctx.fillRect(-100, -68, 200, 4);
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 4.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-100, -65); ctx.lineTo(0, -123); ctx.lineTo(100, -65); ctx.stroke();
    ctx.lineCap = 'round'; line(ctx, -6, -123, 5, -133, 2.6, '#3a2618'); line(ctx, 6, -123, -5, -133, 2.6, '#3a2618');
    hatch(ctx, time, st, false);
    roofBusts(ctx, x, time, st);
    hatch(ctx, time, st, true);
    ctx.fillStyle = '#7b756d'; poly(ctx, [45, -131, 59, -131, 59, -84, 45, -92]);
    ctx.fillStyle = '#625d56'; for (let i = 0; i < 5; i++) ctx.fillRect(45, -125 + i * 10, 14, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(53, -131, 6, 46);
    ctx.fillStyle = '#58534d'; ctx.fillRect(43, -135, 18, 5);
    ctx.save();
    ctx.translate(66, -67); ctx.rotate(0.035 * sin(time * 1.15));
    line(ctx, -16, 0, -16, 11, 1.4, '#2b2b2b'); line(ctx, 16, 0, 16, 11, 1.4, '#2b2b2b');
    ctx.fillStyle = '#b98c55'; rr(ctx, -24, 10, 48, 18, 2.5);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-24, 24, 48, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-22, 11.5, 44, 1.6);
    txt(ctx, ZS.LABELS.art.salas, 0, 19.5, 12.5, '#35200f', 800, 0.8, 44);
    ctx.restore();
    smoke(ctx, 52, -137, time, 1.7, 1);
    ctx.restore();
    guests(ctx, x, time, st);
  }

  const WIRE_H = [17, 33, 49];

  function pen(ctx, x1, x2, time) {
    if (x2 < x1) { const t = x1; x1 = x2; x2 = t; }
    x2 = Math.max(x2, x1 + 24);
    const vr = viewRange(ctx, 60);
    if (x2 < vr[0] || x1 - 30 > vr[1]) return;
    const n = Math.max(1, Math.round((x2 - x1) / 70)), sp = (x2 - x1) / n;
    const i0 = Math.max(0, Math.floor((vr[0] - x1) / sp)), i1 = Math.min(n, Math.ceil((vr[1] - x1) / sp));
    const beat = frac(time / 1.25), pulse = 1 - sstep(0, 0.16, beat);
    ctx.save(); ctx.translate(0, GY);
    for (let i = i0; i <= i1; i++) {
      const px = x1 + i * sp, end = i === 0 || i === n, h = end ? 62 : 53 + hash(i * 3.1) * 4;
      ctx.fillStyle = 'rgba(30,26,12,0.14)'; ell(ctx, px, 0.5, 5, 1.4);
      if (end) {
        ctx.fillStyle = '#7d5c3a'; ctx.fillRect(px - 2.8, -h, 5.6, h);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + 0.2, -h, 2.6, h);
        ctx.fillStyle = '#5f4429'; ctx.fillRect(px - 2.8, -h, 5.6, 1.6);
        line(ctx, px, -h + 10, px + (i === 0 ? 17 : -17), -3, 2.2, '#6a4b2e');
      } else {
        ctx.fillStyle = '#e6e3d8'; ctx.fillRect(px - 1.5, -h, 3, h);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(px + 0.1, -h, 1.4, h);
        poly(ctx, [px - 1.5, -h, px, -h - 3, px + 1.5, -h]);
        ctx.fillStyle = '#9ba2a8'; ctx.fillRect(px - 3.2, -6, 6.4, 1.3);
      }
      ctx.fillStyle = '#f2c230';
      for (const wh of WIRE_H) ctx.fillRect(px - 2.8, -wh - 1.6, 5.6, 3.2);
    }
    for (let w = 0; w < 3; w++) {
      const y = -WIRE_H[w], path = new Path2D();
      for (let i = i0; i < i1; i++) {
        const a = x1 + i * sp;
        path.moveTo(a, y); path.quadraticCurveTo(a + sp / 2, y + 2 * (2.4 + hash2(i, w) * 1.6), a + sp, y);
      }
      if (pulse > 0.02) { ctx.strokeStyle = 'rgba(140,215,255,' + (0.4 * pulse).toFixed(3) + ')'; ctx.lineWidth = 4; ctx.stroke(path); }
      ctx.strokeStyle = '#69747e'; ctx.lineWidth = 1.5; ctx.stroke(path);
      ctx.save(); ctx.translate(0, -0.55);
      ctx.strokeStyle = 'rgba(236,244,250,0.95)'; ctx.lineWidth = 0.7; ctx.stroke(path);
      ctx.restore();
      const gx = x1 + frac(time * 0.055 + w * 0.37) * (x2 - x1), gi = Math.min(n - 1, Math.floor((gx - x1) / sp));
      if (gx > vr[0] && gx < vr[1]) {
        const tt = (gx - (x1 + gi * sp)) / sp, sag = 2.4 + hash2(gi, w) * 1.6, tw = 0.55 + 0.45 * sin(time * 5 + w * 2);
        const gy = y + 4 * sag * tt * (1 - tt), sl = atan2(4 * sag * (1 - 2 * tt), sp);
        const ge = tw * sstep(0, 30, gx - x1) * sstep(0, 30, x2 - gx);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 * ge).toFixed(3) + ')'; circle(ctx, gx, gy - 0.4, 3.4);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * ge).toFixed(3) + ')'; ell(ctx, gx, gy - 0.5, 5.5, 0.9, sl);
      }
    }
    for (let i = n === 1 ? 0 : 1; i < n; i += 4) {
      const cx = x1 + (i + 0.5) * sp;
      if (cx < vr[0] - 20 || cx > vr[1] + 20) continue;
      ctx.save();
      ctx.translate(cx, -WIRE_H[2] + 2.4 + hash2(i, 2) * 1.6); ctx.rotate(0.05 * sin(time * 1.4 + i));
      ctx.fillStyle = '#1d1d1d'; rr(ctx, -9.5, -1, 19, 16.4, 2.6);
      ctx.fillStyle = '#f6c80c'; rr(ctx, -8.3, 0.2, 16.6, 14, 1.8);
      ctx.fillStyle = '#1d1d1d'; poly(ctx, [1.6, 1.8, -3.6, 8.2, -0.4, 8.2, -2.2, 13.2, 3.8, 6, 0.4, 6, 3.4, 1.8]);
      line(ctx, -5, -1, -5, 1, 1, '#555'); line(ctx, 5, -1, 5, 1, 1, '#555');
      ctx.restore();
    }
    ctx.restore();
  }

  const GATE = [15, 29, 43], NEAR = [-24, 15, 1.12], LANE = 8;
  const bolt = (ctx, x, y, k) => poly(ctx, [x + 1.1 * k, y - 3.6 * k, x - 2.4 * k, y + 0.6 * k, x - 0.2 * k, y + 0.6 * k, x - 1.4 * k, y + 3.8 * k,
    x + 2.4 * k, y - 0.8 * k, x + 0.2 * k, y - 0.8 * k, x + 1.3 * k, y - 3.6 * k]);

  function arc(ctx, x1, y1, x2, y2, seed, amp, n) {
    ctx.beginPath(); ctx.moveTo(x1, y1);
    const dx = x2 - x1, dy = y2 - y1, d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    for (let i = 1; i < n; i++) {
      const u = i / n, o = (hash2(seed, i) - 0.5) * 2 * amp * sin(PI * u);
      ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o);
    }
    ctx.lineTo(x2, y2);
  }

  function fenceSign(ctx, x, time) {
    const tl = -0.035 + 0.006 * sin(time * 0.9 + x);
    ctx.fillStyle = 'rgba(30,26,12,0.16)'; ell(ctx, x + 1, 1, 9, 1.8);
    ctx.save(); ctx.translate(x, 0); ctx.rotate(tl);
    ctx.fillStyle = '#6a4b2e'; ctx.fillRect(-2.2, -40, 4.4, 41);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0.2, -40, 2, 41);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, -26, -63, 54, 32, 3);
    ctx.fillStyle = '#1d1d1d'; rr(ctx, -27, -65, 54, 32, 3);
    ctx.fillStyle = '#f6c80c'; rr(ctx, -25.6, -63.6, 51.2, 29.2, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-24.5, -62.8, 49, 2);
    const [a, b, c] = ZS.LABELS.art.fence;
    txt(ctx, a, 0, -56.2, 9.4, '#c0221a', 900, 0.4, 46);
    txt(ctx, b, 0, -46.4, 6.4, '#1d1d1d', 800, 0.2, 46);
    txt(ctx, c, 0, -39.4, 6.4, '#1d1d1d', 800, 0.2, 46);
    ctx.fillStyle = '#1d1d1d'; poly(ctx, [0, -78.5, 8.6, -66.2, -8.6, -66.2]);
    ctx.fillStyle = '#f6c80c'; poly(ctx, [0, -76, 6.6, -67.3, -6.6, -67.3]);
    ctx.fillStyle = '#1d1d1d'; bolt(ctx, 0, -70.2, 0.8);
    ctx.fillStyle = '#9ba2a8'; circle(ctx, -22.6, -61, 0.9); circle(ctx, 22.6, -61, 0.9);
    ctx.restore();
  }

  function energiser(ctx, nx, ny, time) {
    const led = 1 - sstep(0.1, 0.26, frac(time / 1.25));
    line(ctx, nx - 21, ny + 4, nx - 21, ny - 21, 1.3, '#222');
    ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(nx - 12, ny - 22); ctx.quadraticCurveTo(nx - 16, ny - 6, nx - 9, ny + 5); ctx.stroke();
    line(ctx, nx - 9, ny + 6, nx - 9, ny - 2, 1.6, '#8d959b');
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(nx - 5, ny - 33); ctx.quadraticCurveTo(nx - 1, ny - 44, nx + 1.5, ny - 47.3); ctx.stroke();
    ctx.fillStyle = 'rgba(30,26,12,0.18)'; ell(ctx, nx - 26, ny + 5.4, 12, 1.8);
    ctx.fillStyle = '#30363b'; rr(ctx, nx - 35, ny - 6, 19, 11, 1.6);
    ctx.fillStyle = '#f1c232'; ctx.fillRect(nx - 35, ny - 2.2, 19, 2.6);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(nx - 32, ny - 7.8, 3, 1.8); ctx.fillStyle = '#222'; ctx.fillRect(nx - 23, ny - 7.8, 3, 1.8);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(nx - 30.5, ny - 7.6); ctx.quadraticCurveTo(nx - 28, ny - 18, nx - 21, ny - 21); ctx.stroke();
    ctx.fillStyle = '#3d474d'; rr(ctx, nx - 23, ny - 37, 18, 15, 2.2);
    ctx.fillStyle = '#566168'; rr(ctx, nx - 23, ny - 37, 18, 5, 2.2);
    ctx.fillStyle = '#f1c232'; ctx.fillRect(nx - 20, ny - 29.5, 8, 5.4);
    ctx.fillStyle = '#1d1d1d'; bolt(ctx, nx - 16, ny - 26.8, 0.62);
    ctx.fillStyle = 'rgba(255,70,60,' + (0.4 * led).toFixed(3) + ')'; circle(ctx, nx - 9.2, ny - 34.1, 5);
    ctx.fillStyle = led > 0.5 ? '#ff5a4d' : '#5a1a15'; circle(ctx, nx - 9.2, ny - 34.1, 1.6);
  }

  function gate(ctx, fx, time, layer, box) {
    const vr = viewRange(ctx, 120), x = fx + LANE;
    if (x < vr[0] || x > vr[1]) return;
    ctx.save(); ctx.translate(0, GY);
    if (!layer) {
      for (const h of GATE) { ctx.fillStyle = '#f2c230'; rr(ctx, x - 5.6, -h - 1.6, 3.8, 3.2, 1); }
      if (box) fenceSign(ctx, fx - 48, time);
      ctx.restore();
      return;
    }
    const nx = x + NEAR[0], ny = NEAR[1], top = ny - 72, pulse = 1 - sstep(0, 0.16, frac(time / 1.25));
    const ends = GATE.map((h) => [x - 3.6, -h, nx + 2.6, ny - h * NEAR[2]]);
    ctx.fillStyle = 'rgba(30,26,12,0.16)'; ell(ctx, nx + 1, ny + 0.8, 7, 1.8);
    for (const [ax, ay, bx, by] of ends) {
      const path = new Path2D();
      path.moveTo(ax, ay); path.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 1.4, bx, by);
      if (pulse > 0.02) { ctx.strokeStyle = 'rgba(140,215,255,' + (0.4 * pulse).toFixed(3) + ')'; ctx.lineWidth = 4; ctx.stroke(path); }
      ctx.strokeStyle = '#69747e'; ctx.lineWidth = 1.6; ctx.stroke(path);
      ctx.save(); ctx.translate(0, -0.6);
      ctx.strokeStyle = 'rgba(236,244,250,0.95)'; ctx.lineWidth = 0.75; ctx.stroke(path);
      ctx.restore();
    }
    ctx.fillStyle = '#5f4429'; ell(ctx, nx, ny + 0.6, 6, 1.8);
    ctx.fillStyle = '#7d5c3a'; ctx.fillRect(nx - 3.6, top, 7.2, ny - top);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(nx + 0.5, top, 3.1, ny - top);
    ctx.fillStyle = 'rgba(255,225,180,0.14)'; ctx.fillRect(nx - 2.9, top, 1.2, ny - top);
    ctx.fillStyle = '#5f4429'; poly(ctx, [nx - 3.6, top, nx, top - 3.8, nx + 3.6, top]);
    line(ctx, nx + 2, top + 12, nx + 15, ny - 2, 2.4, '#6a4b2e');
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 3; i++) ctx.fillRect(nx - 2.4 + hash(x + i) * 3, top + 10 + i * 19 + hash(x * 2 + i) * 8, 2.2, 1);
    for (const [, , bx, by] of ends) {
      ctx.fillStyle = '#f2c230'; rr(ctx, bx - 1.4, by - 1.9, 4.6, 3.8, 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx - 0.8, by - 1.5, 3.2, 1);
    }
    const [ax, ay, bx, by] = ends[2], mx = (ax + bx) / 2, my = (ay + by) / 2 + 1.1;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(0.07 * sin(time * 1.7 + x));
    line(ctx, -3.2, 0, -3.2, 3, 0.8, '#555'); line(ctx, 3.2, 0, 3.2, 3, 0.8, '#555');
    ctx.fillStyle = '#1d1d1d'; rr(ctx, -6.6, 2.4, 13.2, 10.4, 1.6);
    ctx.fillStyle = '#f6c80c'; rr(ctx, -5.8, 3.2, 11.6, 8.8, 1.2);
    ctx.fillStyle = '#1d1d1d'; bolt(ctx, 0, 7.6, 0.95);
    ctx.restore();
    if (box) energiser(ctx, nx, ny, time);
    const per = 3.4 + hash(x * 0.37) * 2.6, k = time / per + hash(x * 0.71), u = frac(k) * per;
    if (u < 0.16) {
      const e = ends[Math.floor(hash(Math.floor(k) * 1.31 + x) * 3)], sx = lerp(e[0], e[2], 0.15 + 0.7 * hash(Math.floor(k) * 2.7)), sy = lerp(e[1], e[3], 0.5) - 0.4;
      const a = (1 - u / 0.16) * (0.6 + 0.4 * hash(Math.floor(time * 40))), seed = Math.floor(time * 30);
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 15);
      gr.addColorStop(0, 'rgba(225,245,255,' + (0.9 * a).toFixed(3) + ')'); gr.addColorStop(0.35, 'rgba(150,215,255,' + (0.4 * a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(150,215,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(sx - 15, sy - 15, 30, 30);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        arc(ctx, sx, sy, sx + (hash2(seed, i + 5) - 0.5) * 16, sy - 2 - hash2(seed, i + 9) * 9, seed + i, 2, 4);
        ctx.strokeStyle = 'rgba(130,205,255,' + (0.5 * a).toFixed(3) + ')'; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,240,170,' + a.toFixed(3) + ')';
      for (let i = 0; i < 4; i++) circle(ctx, sx + (hash2(seed, i) - 0.5) * 10 * (u / 0.16 + 0.3), sy + (hash2(seed, i + 2) - 0.3) * 8 * (u / 0.16 + 0.3), 0.8);
    }
    ctx.restore();
  }

  function zap(ctx, b, time) {
    const t = b.zapT;
    if (!(t >= 0 && t < 1.4)) return;
    const cx = b.zapX - 4, cy = GY - 30, d = b.dir || 1, hx = b.x + d * 34, hy = b.y - 34, seed = Math.floor(time * 24);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (t < 0.32) {
      const a = 1 - t / 0.32, r = 26 + 30 * (1 - a);
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, 'rgba(235,248,255,' + (0.85 * a).toFixed(3) + ')'); gr.addColorStop(0.4, 'rgba(140,210,255,' + (0.35 * a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(140,210,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      for (let i = 0; i < 3; i++) {
        const tx = lerp(cx, hx, 0.55 + 0.45 * hash2(seed, i)) + (hash2(seed, i + 3) - 0.5) * 30, ty = hy + (hash2(seed, i + 6) - 0.5) * 34;
        arc(ctx, cx, cy, tx, ty, seed * 7 + i, 7, 7);
        ctx.strokeStyle = 'rgba(120,200,255,' + (0.45 * a).toFixed(3) + ')'; ctx.lineWidth = 4.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * a).toFixed(3) + ')'; ctx.lineWidth = 1.3; ctx.stroke();
      }
    }
    if (t < 0.6) {
      for (let i = 0; i < 16; i++) {
        const ang = -PI * (0.05 + 0.9 * hash(i * 3.17 + 0.5)), v = 90 + 150 * hash(i * 5.31 + 0.2), tt = t * (0.8 + 0.4 * hash(i * 1.7));
        const vx = cos(ang) * v, vy = sin(ang) * v, px = cx + vx * tt, py = cy + vy * tt + 420 * tt * tt;
        const a = 1 - t / 0.6;
        ctx.strokeStyle = i % 3 ? 'rgba(255,236,150,' + a.toFixed(3) + ')' : 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - vx * 0.025, py - (vy + 840 * tt) * 0.025); ctx.stroke();
      }
    }
    if (t < 0.75) {
      const a = (1 - sstep(0, 0.75, t)) * (0.55 + 0.45 * hash(seed));
      ctx.strokeStyle = 'rgba(255,214,60,' + a.toFixed(3) + ')'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ang = -PI * (0.12 + 0.25 * i) + 0.15 * sin(time * 9 + i), r = 48 + 6 * hash2(seed, i);
        const ox = b.x + cos(ang) * r * 1.15, oy = b.y - 30 + sin(ang) * r * 0.8;
        ctx.beginPath(); ctx.moveTo(ox - 4, oy - 5); ctx.lineTo(ox + 1, oy - 1); ctx.lineTo(ox - 2, oy + 1); ctx.lineTo(ox + 4, oy + 5); ctx.stroke();
      }
    }
    if (t > 0.18) {
      for (let i = 0; i < 4; i++) {
        const u = (t - 0.18 - i * 0.12) / 0.9;
        if (u <= 0 || u >= 1) continue;
        const a = 0.42 * sstep(0, 0.15, u) * (1 - u);
        ctx.fillStyle = 'rgba(96,92,88,' + a.toFixed(3) + ')';
        circle(ctx, b.x + (i - 1.5) * 11 - d * 6 + sin(u * 5 + i) * 4, b.y - 58 - u * 46 - i * 2, 3 + u * 9);
      }
    }
    ctx.restore();
  }

  const WOOD = ['#6e4c30', '#5f412a', '#7a5636', '#4f3824'];

  function hrudka(ctx, x, y, ang, time, i) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    line(ctx, 0, 0, 0, 4.5, 0.9, '#8a7a5c');
    ctx.fillStyle = '#efe7d2';
    ctx.beginPath(); ctx.moveTo(-1.6, 6.4); ctx.bezierCurveTo(-10.5, 8.5, -10, 20.5, 0, 20.5); ctx.bezierCurveTo(10, 20.5, 10.5, 8.5, 1.6, 6.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,128,80,0.22)';
    ctx.beginPath(); ctx.moveTo(2, 7.4); ctx.bezierCurveTo(9.5, 10, 9, 20, 0.5, 20.4); ctx.bezierCurveTo(5.6, 17, 5.4, 11, 2, 7.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(190,170,110,0.3)'; ell(ctx, 0, 18.6, 6.2, 1.9);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(ctx, -3.8, 12, 1.6, 3.2, 0.3);
    ctx.strokeStyle = 'rgba(120,100,60,0.3)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-1.2, 7.2); ctx.quadraticCurveTo(-5.5, 9.5, -6.8, 13.5); ctx.moveTo(1.2, 7.2); ctx.quadraticCurveTo(4, 9, 5.6, 11.6); ctx.stroke();
    ctx.fillStyle = '#ddd2b6'; poly(ctx, [-0.8, 6.8, -3.4, 3.9, -1.2, 4.9, 0, 4.2, 1.2, 4.9, 3.4, 3.9, 0.8, 6.8]);
    ctx.fillStyle = '#c9bc9a'; ell(ctx, 0, 6.2, 1.8, 1.3);
    ctx.restore();
    const u = frac(time * (0.35 + 0.08 * i) + i * 0.37);
    if (u < 0.55) {
      const dy = u < 0.2 ? 0 : (u - 0.2) * (u - 0.2) * 260, a = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.35;
      ctx.fillStyle = 'rgba(214,232,240,' + (0.85 * a).toFixed(3) + ')';
      ell(ctx, x + sin(ang) * -21, y + cos(ang) * 21.2 + dy, 0.9, 1.2 + (u < 0.2 ? u * 3 : 0.6));
    }
  }

  function strunga(ctx, st, time, layer, bear) {
    const x = st.x, hw = st.w / 2;
    const vr = viewRange(ctx, 40);
    if (x + hw + 30 < vr[0] || x - hw - 30 > vr[1]) return;
    ctx.save(); ctx.translate(x, GY);
    if (!layer) {
      ctx.fillStyle = 'rgba(28,22,10,0.16)'; ell(ctx, 0, 1, hw + 18, 4.5);
      ctx.fillStyle = 'rgba(40,26,10,0.2)'; ctx.fillRect(-hw + 4, -50, hw * 2 - 4, 46);
      for (const σ of [-1, 1]) {
        const px = σ * (hw - 9) + 5;
        ctx.fillStyle = '#4f3824'; ctx.fillRect(px - 3, -58, 6, 54);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px + 0.5, -58, 2.5, 54);
      }
      for (let i = 0; i < 9; i++) {
        const px = -hw + 6 + (i + 0.5) * (hw * 2 - 8) / 9 + 5;
        ctx.fillStyle = i % 2 ? '#6d5236' : '#634a31'; ctx.fillRect(px - 1.3, -47, 2.6, 43);
      }
      for (let r = 0; r < 6; r++) {
        const y = -9 - r * 6.6;
        ctx.strokeStyle = r % 2 ? '#94744c' : '#88693f'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-hw + 2, y);
        for (let i = 0; i <= 9; i++) ctx.lineTo(-hw + 6 + i * (hw * 2 - 8) / 9 + 5, y + ((i + r) % 2 ? 1.1 : -1.1));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,235,190,0.16)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,18,6,0.32)'; ctx.fillRect(-hw + 2, -52, hw * 2 + 2, 9);
      ctx.fillStyle = 'rgba(30,18,6,0.16)'; ctx.fillRect(-hw + 2, -43, hw * 2 + 2, 7);
      ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const sx = -hw + 4 + hash(i * 1.7 + x) * (hw * 2 - 8), sy = -1 - hash(i * 2.3) * 3, a = (hash(i * 4.1) - 0.5) * 1.2, l = 3 + hash(i * 3.3) * 4;
        line(ctx, sx - cos(a) * l, sy - sin(a) * l, sx + cos(a) * l, sy + sin(a) * l, 1.2, HAY[i % 3]);
      }
      ctx.fillStyle = '#7a5534'; ctx.fillRect(-hw + 14, -15, 15, 3); ctx.fillStyle = '#5f412a';
      line(ctx, -hw + 16, -12, -hw + 14, 0, 2, '#5f412a'); line(ctx, -hw + 27, -12, -hw + 29, 0, 2, '#5f412a'); line(ctx, -hw + 21.5, -12, -hw + 21.5, 0, 1.8, '#4f3824');
      const gx = hw - 22;
      ctx.fillStyle = '#9a7448'; poly(ctx, [gx - 8, -20, gx + 8, -20, gx + 6.4, 0, gx - 6.4, 0]);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; poly(ctx, [gx + 2, -20, gx + 8, -20, gx + 6.4, 0, gx + 1.6, 0]);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = -2; i <= 2; i++) ctx.fillRect(gx + i * 3 - 0.3, -20, 0.6, 20);
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(gx - 7.7, -17, 15.4, 1.6); ctx.fillRect(gx - 6.8, -5, 13.6, 1.6);
      ctx.fillStyle = '#f4f1e8'; ell(ctx, gx, -20, 7.6, 1.6);
      ctx.fillStyle = '#9a7448'; ctx.fillRect(gx + 5, -27, 3, 8); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(gx + 6.5, -27, 1.5, 8);
      ctx.restore();
      return;
    }
    const under = bear ? clamp(1 - abs(bear.x - x) / (hw + 30), 0, 1) * (bear.crawl ? 1 : 0.3) : 0;
    for (const σ of [-1, 1]) {
      const px = σ * (hw - 6);
      ctx.fillStyle = '#8a857d'; rr(ctx, px - 5.5, -3.5, 11, 4, 1.5);
      ctx.fillStyle = WOOD[0]; ctx.fillRect(px - 3.6, -54, 7.2, 51);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + 0.6, -54, 3, 51);
      ctx.fillStyle = 'rgba(255,225,180,0.14)'; ctx.fillRect(px - 3, -54, 1.2, 51);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, px - 0.6, -30 + σ * 6, 1.2, 2);
      line(ctx, px - σ * 3, -40, px - σ * 13, -52, 3, WOOD[1]);
    }
    const ex = hw + 9;
    ctx.fillStyle = '#5c3d29'; ctx.fillRect(-ex, -58, ex * 2, 7);
    ctx.fillStyle = 'rgba(255,225,180,0.14)'; ctx.fillRect(-ex, -58, ex * 2, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fillRect(-ex, -52.6, ex * 2, 1.6);
    for (const σ of [-1, 1]) { ctx.fillStyle = '#a07c55'; ell(ctx, σ * ex, -54.5, 2.6, 3.6); ctx.fillStyle = '#86623f'; ell(ctx, σ * (ex + 0.3), -54.5, 1.3, 1.9); }
    const ay = -130, gy = -57;
    ctx.fillStyle = '#2e2016'; poly(ctx, [-ex + 2, gy, 0, ay + 6, ex - 2, gy]);
    ctx.fillStyle = 'rgba(255,220,170,0.05)'; poly(ctx, [-ex + 2, gy, 0, ay + 6, 0, gy]);
    line(ctx, -36, -92, 36, -92, 3.2, WOOD[3]); line(ctx, 0, ay + 8, 0, gy, 3, WOOD[3]);
    line(ctx, -40, -76, 40, -76, 2.6, WOOD[1]);
    ctx.fillStyle = 'rgba(255,225,180,0.12)'; ctx.fillRect(-40, -77.4, 80, 0.8);
    for (let i = 0; i < 3; i++) {
      const hx = (i - 1) * 22, near = clamp(1 - abs(bear ? bear.x - x - hx : 99) / 40, 0, 1) * under;
      const sw = 0.05 * sin(time * 1.25 + i * 1.9) + 0.22 * near * sin(time * 6.3 + i * 1.3);
      hrudka(ctx, hx, -76, sw, time, i);
    }
    const tone = ['#6e4a33', '#613f2b', '#78533a', '#573826'];
    for (const σ of [-1, 1]) {
      const x0 = σ * (ex + 6), y0 = gy + 4, x1 = 0, y1 = ay - 2, len = hypot(x1 - x0, y1 - y0), ang = atan2(y1 - y0, x1 - x0);
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
      const b0 = σ > 0 ? 0 : -12, n = Math.ceil(len / 7.5);
      ctx.fillStyle = '#5c3d29'; ctx.fillRect(0, b0, len, 12);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = tone[Math.floor(hash2(i, σ + 3) * 4)];
        ctx.fillRect(i * 7.5, b0, 7.1, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(i * 7.5 + 7.1, b0, 0.4, 12);
      }
      ctx.fillStyle = 'rgba(255,235,200,0.08)'; ctx.fillRect(0, σ > 0 ? 9 : -12, len, 3);
      ctx.fillStyle = '#3a2618'; ctx.fillRect(-1, -2, len + 1, 4);
      ctx.restore();
    }
    ctx.lineCap = 'round'; line(ctx, -7, ay - 1, 6, ay - 13, 2.8, '#3a2618'); line(ctx, 7, ay - 1, -6, ay - 13, 2.8, '#3a2618');
    ctx.restore();
  }

  API.koliba = koliba; API.pen = pen; API.gate = gate; API.strunga = strunga; API.zap = zap;

  const newAnimal = (seed) => ({ t: -1, x: 0, phase: 0, amt: 0, runK: 0, gait: 0, v: 0, seed, seen: 0, head: 0.5, bark: 0 });

  function advance(st, x, dir, time, P) {
    const dt = time - st.t, S = () => lerp(P.sw, P.sr, st.runK);
    if (!(dt >= 0 && dt < 0.3) || abs(x - st.x) > 140) {
      st.runK = st.gait = P.wantRun ? 1 : 0; st.amt = P.hint ? 1 : 0; st.v = P.hint ? P.vmin * 2 : 0;
      st.phase = dir * x / S(); st.head = P.head; st.bark = P.bark || 0;
    } else if (dt > 1e-4) {
      const dx = x - st.x, vi = abs(dx) / dt, m = clamp(vi / P.vmin, 0, 1), want = (P.wantRun || st.v > P.vrun) ? 1 : 0;
      const cap = P.fmax * dt;
      st.phase += clamp(dx * dir / S(), -cap, cap);
      st.v += (vi - st.v) * Math.min(1, dt * (vi < st.v ? 30 : 10));
      st.amt += (clamp(st.v / P.vmin, 0, 1) - st.amt) * Math.min(1, dt * 14);
      st.runK += (want - st.runK) * Math.min(1, dt * 10) * m;
      st.gait += (want - st.gait) * Math.min(1, dt * 3.5) * m;
      st.head += (P.head - st.head) * (1 - exp(-dt * 6));
      st.bark += ((P.bark || 0) - st.bark) * (1 - exp(-dt * 12));
    }
    st.x = x; st.t = time;
  }
  const FT = { x: 0, y: 0 };
  function footAt(p, duty, half, lift) {
    p = frac(p);
    if (p < duty) { FT.x = half - 2 * half * (p / duty); FT.y = 0; }
    else { const v = (p - duty) / (1 - duty), e = v * v * (3 - 2 * v); FT.x = -half + 2 * half * e; FT.y = lift * sin(PI * Math.pow(v, 0.8)); }
  }
  const IK = { mx: 0, my: 0, ex: 0, ey: 0 };
  function ik(x0, y0, tx, ty, l1, l2, bend) {
    let dx = tx - x0, dy = ty - y0, d = hypot(dx, dy);
    const max = l1 + l2 - 0.05, min = abs(l1 - l2) + 0.3;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { if (d < 0.001) { dx = 0; dy = min; } else { dx *= min / d; dy *= min / d; } d = min; }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), t = atan2(dy, dx) - bend * a;
    IK.mx = x0 + cos(t) * l1; IK.my = y0 + sin(t) * l1; IK.ex = x0 + dx; IK.ey = y0 + dy;
  }

  const SH = { wool: '#f3f0e6', hi: '#fcfaf4', shade: '#e0dccf', deep: '#c9c4b6', skin: '#3a2f2a', skin2: '#4d3d36', nose: '#6d544b',
    leg: '#3f3530', far: '#2a2320', hoof: '#171211', ear: '#2f2622', ear2: '#241d1a', earIn: '#8a6a64' };
  const SLEG = [[-13, 0, 0, 0, 0.5, -1.5], [13, 1, 0, 0.25, 0, 1.5], [-13, 0, 1, 0.5, 0, -1], [13, 1, 1, 0.75, 0.5, 2]];
  const SHEAD = [[27, -10.5, 1.2], [28, -29.5, 0.14], [26.5, -39, -0.2]];
  const fx4 = [0, 0, 0, 0], fy4 = [0, 0, 0, 0];

  function sheepHead(ctx, hx, hy, ang, flick, flick2, chew) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.save(); ctx.translate(-3, -3.4); ctx.rotate(PI - 0.5 + flick2); ctx.fillStyle = SH.ear2; ell(ctx, 4.8, 0, 5.2, 2); ctx.restore();
    ctx.fillStyle = SH.skin; ell(ctx, 0, 0, 8.4, 5.6);
    ctx.fillStyle = SH.skin2; ell(ctx, 6.4, 1.5 + chew * 0.7, 4.6, 3.5);
    ctx.fillStyle = SH.nose; circle(ctx, 10.1, 1.5 + chew * 0.6, 1.7);
    ctx.fillStyle = SH.wool; circle(ctx, -4.6, -5.6, 3.7); circle(ctx, -0.4, -6.9, 3.3); circle(ctx, -7.2, -3.4, 3);
    ctx.fillStyle = SH.shade; circle(ctx, -3, -7.4, 1.6);
    ctx.fillStyle = '#e9e0c5'; circle(ctx, 2.9, -1.4, 1.7); ctx.fillStyle = '#16100d'; circle(ctx, 3.2, -1.3, 0.95);
    ctx.save(); ctx.translate(-3.6, -2.2); ctx.rotate(PI - 0.4 + flick); ctx.fillStyle = SH.ear; ell(ctx, 5, 0, 5.8, 2.4);
    ctx.fillStyle = SH.earIn; ell(ctx, 5.4, 0.3, 3.6, 1.1); ctx.restore();
    ctx.restore();
  }

  function sheep(ctx, s, time) {
    const st = stateOf('sheep', s, time, newAnimal), sd = st.seed;
    const mode = s.state === 'walk' || s.state === 'flee' ? s.state : 'graze', dir = s.dir < 0 ? -1 : 1;
    const u = frac(time / (8.5 + hash(sd) * 4) + hash(sd + 1)), glance = sstep(0.62, 0.7, u) - sstep(0.8, 0.88, u);
    advance(st, s.x, dir, time, { sw: 21, sr: 42, fmax: 3.3, vmin: 7, vrun: 70, wantRun: mode === 'flee', hint: mode !== 'graze',
      head: mode === 'flee' ? 1 : mode === 'walk' ? 0.5 : 0.03 + 0.8 * glance });
    const amt = st.amt, rk = st.runK, down = 1 - sstep(0.08, 0.35, st.head);
    const S = lerp(21, 42, rk), duty = lerp(0.64, 0.5, rk), half = S * duty / 1.8, lift = lerp(3.4, 7.2, rk), L1 = 10, L2 = 14, LM = L1 + L2 - 0.6;
    let H = 21.5;
    for (let i = 0; i < 4; i++) {
      const l = SLEG[i];
      footAt(st.phase + lerp(l[3], l[4], st.gait), duty, half, lift);
      fx4[i] = lerp(l[5], FT.x + (l[1] ? 0.8 : -0.8), amt); fy4[i] = lerp(0, FT.y, amt);
      H = Math.min(H, fy4[i] + sqrt(Math.max(0, LM * LM - fx4[i] * fx4[i])));
    }
    const nib = Math.pow(Math.max(0, sin(time * 7.4 + sd * 3)), 2) * sstep(-0.1, 0.4, sin(time * 0.9 + sd)) * down;
    const chew = sin(time * 12 + sd) * down, breath = 1 + 0.014 * sin(time * 2.4 + sd);
    const ef = frac(time / 4.3 + hash(sd + 2)), flick = ef < 0.1 ? sin(ef * 10 * PI) * 1.05 : 0;
    const ef2 = frac(time / 6.1 + hash(sd + 5)), flick2 = ef2 < 0.1 ? sin(ef2 * 10 * PI) * 0.9 : 0;
    const rock = rk * amt * 0.035 * sin(TAU * st.phase * 2 + 0.6);
    ctx.save(); ctx.translate(s.x, GY); ctx.scale(dir * 0.9, 0.9);
    ctx.fillStyle = 'rgba(25,25,12,0.17)'; ell(ctx, 1, 0.8, 25, 3.2);
    for (const i of [2, 3, 0, 1]) {
      const l = SLEG[i], hx = l[0], col = l[2] ? SH.far : SH.leg;
      ik(hx, -H, hx + fx4[i], -fy4[i], L1, L2, l[1] ? 1 : -1);
      limb(ctx, hx, -H, IK.mx, IK.my, 4.4, 3.2, col); limb(ctx, IK.mx, IK.my, IK.ex, IK.ey, 3.2, 2.4, col);
      ctx.fillStyle = SH.hoof; ell(ctx, IK.ex + 0.8, IK.ey - 1.1, 2.4, 1.5);
    }
    ctx.translate(0, 21.5 - H);
    ctx.translate(0, -26); ctx.rotate(rock); ctx.translate(0, 26);
    ctx.save(); ctx.translate(0, -14); ctx.scale(1, breath); ctx.translate(0, 14);
    const wag = sin(time * 2.6 + sd) * 0.15 + rk * amt * sin(TAU * st.phase * 2) * 0.25;
    ctx.fillStyle = SH.shade; ell(ctx, -23.5, -30 + wag * 6, 4.6, 4);
    ctx.fillStyle = SH.deep;
    for (const c of [[-15, -21, 7], [-7, -19.5, 7.2], [2, -19, 7.2], [10, -20, 7], [17, -23.5, 6.3]]) circle(ctx, c[0], c[1], c[2]);
    ctx.fillStyle = SH.shade; ell(ctx, 0, -27, 21, 11.5); circle(ctx, -21, -27, 6); circle(ctx, 20, -29, 6.6);
    ctx.fillStyle = SH.wool;
    for (const c of [[-14, -32.5, 8.2], [-6, -35.5, 8.6], [3, -36, 8.6], [12, -33, 8], [-18, -27, 7], [17, -28, 7.2], [-2, -28, 10], [8, -26, 8.5]]) circle(ctx, c[0], c[1], c[2]);
    ctx.fillStyle = SH.hi;
    for (const c of [[-8, -38, 4.4], [2, -39, 4.6], [10, -36.5, 4], [-15, -34, 3.8]]) circle(ctx, c[0], c[1], c[2]);
    ctx.restore();
    const k = clamp(st.head, 0, 1), a = k < 0.5 ? SHEAD[0] : SHEAD[1], b = k < 0.5 ? SHEAD[1] : SHEAD[2], tk = k < 0.5 ? k * 2 : k * 2 - 1;
    let hx = lerp(a[0], b[0], tk), hy = lerp(a[1], b[1], tk), ha = lerp(a[2], b[2], tk);
    hy += nib * 2.8 + sin(TAU * st.phase) * 1.1 * amt; ha += nib * 0.22;
    limb(ctx, 15, -30, hx - 4, hy - 1.5, 14, 9.5, SH.wool);
    ctx.fillStyle = SH.shade; circle(ctx, hx - 5, hy + 2, 4);
    sheepHead(ctx, hx, hy, ha, flick, flick2, chew);
    ctx.restore();
  }
  API.sheep = sheep;

  const DG = { coat: '#faf8f2', shade: '#e7e3d7', deep: '#d4cfc0', far: '#d9d5c8', ear: '#ebe7db', earIn: '#e9c4b9', nose: '#1d1816', eye: '#2a1a12',
    mouth: '#7a2230', tongue: '#e8707e' };
  const DLEG = [[-17, 0, 0, 0, 0.07, -1, -5], [14, 1, 0, 0.25, 0.47, 2, 6], [-17, 0, 1, 0.5, 0, 1, -10], [14, 1, 1, 0.75, 0.39, -2, 1]];
  const DHEAD = { idle: [26, -51, 0.02], walk: [28, -48, 0.1], run: [31, -44, 0.12] };
  const DBODY = [-27, -37, -21, -44.5, -8, -45.5, 6, -46, 18, -43.5, 25, -34, 24, -25.5, 14, -21.5, 2, -23, -9, -23, -19, -24.5, -28, -28.5];
  const DLIT = DBODY.map((v, i) => (i % 2 && v > -35 ? v - 2.6 : v));
  const BK = { p: 0, w: 0 };
  function barkAt(time, sd) {
    const u = frac(time / 1.9 + hash(sd + 7)) * 1.9, k = Math.floor(u / 0.38), w = (u - k * 0.38) / 0.2;
    BK.p = k < 3 && w < 1 ? sin(PI * w) : 0; BK.w = w;
  }

  function dogHead(ctx, hx, hy, ang, open, ears, blink, tongue, pp, pw) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.scale(1.12, 1.12);
    ctx.save(); ctx.translate(-3, -6.6); ctx.rotate(-0.1 - ears); ctx.fillStyle = DG.far; poly(ctx, [-4.4, 1.8, 4.2, 1, 6.6, -5.6, 3.4, -9.8, -1.4, -7]); ctx.restore();
    ctx.fillStyle = DG.shade; poly(ctx, [-6, 4.6, -11.4, 8, -5, 9.4]); poly(ctx, [-3, 6, -7.6, 10.4, -0.4, 9]);
    ctx.fillStyle = DG.coat; ell(ctx, 0, 0, 9.6, 8.4);
    blob(ctx, [3, -5.8, 10, -5, 17.4, -2.9, 20.2, 0.6, 17.6, 4.2, 7, 5.8]);
    ctx.fillStyle = DG.shade; ell(ctx, 3.4, 7.2, 5, 1.6, 0.1);
    if (open > 0.02) {
      ctx.fillStyle = DG.mouth; poly(ctx, [17.2, 3, 6.4, 3.6, 7.6, 3.6 + open * 9.5, 15.6, 3.2 + open * 8.5]);
      ctx.fillStyle = DG.tongue; ell(ctx, 11.6, 4 + open * 6.8 + tongue * 2.8, 3.8, 1.8 + tongue * 1.5, 0.15);
      ctx.save(); ctx.translate(6, 3.4); ctx.rotate(open * 0.7); ctx.fillStyle = DG.coat; poly(ctx, [0, 0, 11.2, -0.4, 10.8, 3, 1, 4.2]); ctx.restore();
    } else { ctx.fillStyle = 'rgba(40,30,25,0.4)'; ctx.fillRect(7.5, 3.6, 9.4, 1); }
    ctx.fillStyle = DG.nose; ell(ctx, 19.6, -0.6, 2.8, 2.3);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, 19, -1.4, 1.1, 0.6);
    ctx.save(); ctx.translate(-1.6, -6.8); ctx.rotate(0.1 - ears);
    ctx.fillStyle = DG.ear; poly(ctx, [-5.4, 2.2, 5.6, 1.2, 7, -5, 8.2, -9.2, 3, -10.8, -1.8, -8, -5.2, -1]);
    ctx.fillStyle = DG.coat; poly(ctx, [-5.4, 2.2, 5.6, 1.2, 5.6, -4.8, 2.6, -9.6, -1.8, -8, -5.2, -1]);
    ctx.fillStyle = DG.earIn; poly(ctx, [-2.2, 0.8, 3.2, 0.4, 2.4, -4.6, 0, -6]); ctx.restore();
    ctx.fillStyle = DG.deep; ell(ctx, 7.6, -4.8, 3, 0.9, -0.2);
    ctx.fillStyle = DG.eye;
    if (blink) ctx.fillRect(5.6, -2.4, 3.8, 1); else { ell(ctx, 7.6, -2.1, 1.9, 1.7); ctx.fillStyle = '#fff'; circle(ctx, 8.2, -2.7, 0.6); }
    if (pp > 0.05) {
      ctx.lineCap = 'round';
      for (const a of [-0.6, 0, 0.6]) {
        const r0 = 4 + pw * 9, r1 = r0 + 6, c = cos(a), sn = sin(a);
        ctx.strokeStyle = 'rgba(45,36,28,' + (0.55 * pp).toFixed(3) + ')'; ctx.lineWidth = 3.6;
        ctx.beginPath(); ctx.moveTo(22.5 + c * r0, 1.6 + sn * r0); ctx.lineTo(22.5 + c * r1, 1.6 + sn * r1); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,250,228,' + pp.toFixed(3) + ')'; ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.moveTo(22.5 + c * r0, 1.6 + sn * r0); ctx.lineTo(22.5 + c * r1, 1.6 + sn * r1); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function leapPose(lp) {
    const k = clamp(lp.k, 0, 1), P = LP;
    P.air = 0; P.crouch = 0; P.pitch = 0; P.fold = 0; P.reach = 0;
    if (lp.phase === 'gather') { P.crouch = sstep(0, 1, k); P.pitch = -0.16 * P.crouch; }
    else if (lp.phase === 'air') {
      P.air = 1; P.pitch = lerp(-0.34, 0.3, sstep(0.06, 0.94, k));
      P.fold = sstep(0.04, 0.42, k); P.reach = sstep(0.56, 0.92, k);
    } else { P.crouch = 1 - sstep(0, 1, k); P.pitch = 0.2 * P.crouch; }
    return P;
  }
  const LP = { air: 0, crouch: 0, pitch: 0, fold: 0, reach: 0 };

  function dog(ctx, d, time) {
    const st = stateOf('dog', d, time, newAnimal), sd = st.seed;
    const lp = d.state === 'leap' && d.leap ? leapPose(d.leap) : null;
    const mode = lp ? 'run' : d.state === 'walk' || d.state === 'run' || d.state === 'bark' ? d.state : 'idle', dir = d.dir < 0 ? -1 : 1;
    advance(st, d.x, dir, time, { sw: 34, sr: 96, fmax: 3.4, vmin: 9, vrun: 130, wantRun: mode === 'run', hint: mode === 'walk' || mode === 'run', head: 0, bark: mode === 'bark' ? 1 : 0 });
    const amt = st.amt, rk = st.runK, bk = st.bark, brace = bk * (1 - amt);
    barkAt(time, sd); const pulse = BK.p * bk, bw = BK.w;
    const S = lerp(34, 96, rk), duty = lerp(0.62, 0.34, rk), half = S * duty / 1.8, lift = lerp(5.5, 11, rk);
    const LM = [26.5, 27, 27, 27.5], REST = [26.4, 25.2];
    const drop = [0, 0];
    for (let i = 0; i < 4; i++) {
      const l = DLEG[i];
      footAt(st.phase + lerp(l[3], l[4], st.gait), duty, half, lift);
      fx4[i] = lerp(lerp(l[5], l[6], bk), FT.x + (l[1] ? 1.5 + rk * 4 : -1 + rk * 3), amt); fy4[i] = lerp(0, FT.y, amt);
      if (lp) {
        const tx = l[1] ? lerp(7, 13, lp.reach) : lerp(-15, -3, lp.fold) + 5 * lp.reach, ty = l[1] ? lerp(15, 5, lp.reach) : lerp(5, 13, lp.fold) - 4 * lp.reach;
        fx4[i] = lerp(fx4[i] + (l[1] ? 0 : 3 * lp.crouch), tx, lp.air); fy4[i] = lerp(fy4[i], ty, lp.air);
      }
      const lm = l[1] ? LM[1] : LM[2];
      drop[l[1]] = Math.max(drop[l[1]], REST[l[1]] - (fy4[i] + sqrt(Math.max(0, lm * lm - fx4[i] * fx4[i]))));
    }
    const dy = Math.max(drop[0], drop[1], 0) + brace * 1.2 + (lp ? lp.crouch * 5 : 0), lpt = lp ? lp.pitch : 0;
    const breath = 1 + 0.012 * sin(time * 2.2 + sd), pitch = rk * amt * (lp ? 0 : 0.06) * sin(TAU * (st.phase + 0.1)) + brace * 0.04 + lpt;
    ctx.save(); ctx.translate(d.x, GY); ctx.scale(dir * 0.9, 0.9);
    const up = Math.max(0, d.y || 0) / 0.9;
    if (up > 0.01) {
      const sk = 1 - clamp(up / 150, 0, 0.55);
      ctx.fillStyle = 'rgba(25,25,12,' + (0.17 * sk).toFixed(3) + ')'; ell(ctx, 1, 0.8, 37 * sk, 3.6 * sk);
      ctx.translate(0, -up);
    } else { ctx.fillStyle = 'rgba(25,25,12,0.17)'; ell(ctx, 1, 0.8, 37, 3.6); }
    const leg = (i) => {
      const l = DLEG[i], front = l[1], far = l[2];
      let hx = l[0], hy = -(REST[front] - dy);
      if (lpt) { const c = cos(lpt), sn = sin(lpt), ry = 34 - REST[front]; hx = l[0] * c - ry * sn; hy = l[0] * sn + ry * c - 34 + dy; }
      ik(hx, hy, hx + fx4[i], -fy4[i], front ? 16 : 14, front ? 11 : 13.5, front ? 1 : -1);
      const col = far ? DG.far : DG.coat;
      limb(ctx, hx, hy, IK.mx, IK.my, front ? 9 : 12, front ? 6.8 : 7, col); limb(ctx, IK.mx, IK.my, IK.ex, IK.ey, front ? 6.8 : 6.4, 5.2, col);
      ctx.fillStyle = far ? DG.deep : DG.shade; ell(ctx, IK.ex + 2.6, IK.ey - 1.7, 5.6, 2.8);
    };
    leg(2); leg(3);
    ctx.save();
    ctx.translate(-pulse * 1.2, dy - pulse * 0.8); ctx.translate(0, -34); ctx.rotate(pitch); ctx.translate(0, 34);
    ctx.translate(0, -23); ctx.scale(1, breath); ctx.translate(0, 23);
    ctx.fillStyle = DG.deep; blob(ctx, DBODY);
    ctx.fillStyle = DG.coat; blob(ctx, DLIT);
    ctx.fillStyle = DG.shade; ell(ctx, -19, -29, 9.5, 11.5, -0.2); ell(ctx, 13, -29, 6.5, 9.5, 0.1);
    ctx.fillStyle = DG.coat; ell(ctx, -20, -31, 8.4, 10, -0.2); ell(ctx, 14, -31, 5.4, 8.4, 0.1);
    ctx.fillStyle = DG.shade; poly(ctx, [-4, -22.4, -6, -17.4, 1.8, -21.8]); poly(ctx, [4, -22.4, 4.6, -17, 10, -21.6]);
    ctx.fillStyle = DG.coat; poly(ctx, [-4, -23.2, -5.6, -18.6, 1, -22.6]); poly(ctx, [4, -23.2, 4.6, -18.2, 9.2, -22.4]);
    ctx.fillStyle = DG.coat; ell(ctx, 22, -30, 6.4, 10.5, 0.2); poly(ctx, [19, -22.4, 21, -17.6, 26, -25.4]);
    const wag = sin(time * 3.4 + sd) * (1 - rk * amt) + sin(time * 11 + sd) * rk * amt * 0.5;
    const tm = [lerp(lerp(-34, -35, amt), -37, rk * amt), lerp(lerp(-36, -40, amt), -42, rk * amt), lerp(lerp(-37, -41, amt), -50, rk * amt), lerp(lerp(-24, -33, amt), -40, rk * amt)];
    const tx0 = -26, ty0 = -40, tmx = lerp(tm[0], -34, brace), tmy = lerp(tm[1], -43, brace), ttx = lerp(tm[2], -38, brace) + wag * 1.6, tty = lerp(tm[3], -49, brace) + wag * 2.2;
    const tcx = 2 * tmx - (tx0 + ttx) / 2, tcy = 2 * tmy - (ty0 + tty) / 2;
    for (let pass = 0; pass < 2; pass++) {
      const o = pass ? 0 : 1.3, col = pass ? DG.coat : DG.deep, fat = pass ? 0 : 1.4;
      let px = tx0, py = ty0 + o, pw0 = 8.4 + fat;
      for (let i = 1; i <= 6; i++) {
        const t = i / 6, u = 1 - t, qx = u * u * tx0 + 2 * u * t * tcx + t * t * ttx, qy = u * u * ty0 + 2 * u * t * tcy + t * t * tty + o, w1 = lerp(8.4, 5.2, t) + 2.2 * sin(PI * t) + fat;
        limb(ctx, px, py, qx, qy, pw0, w1, col); px = qx; py = qy; pw0 = w1;
      }
    }
    const hi = DHEAD.idle, hw = DHEAD.walk, hr = DHEAD.run, rm = rk * amt;
    let hx = lerp(lerp(hi[0], hw[0], amt), hr[0], rm), hy = lerp(lerp(hi[1], hw[1], amt), hr[1], rm), ha = lerp(lerp(hi[2], hw[2], amt), hr[2], rm);
    hx += -pulse * 1.6 + brace * 1.2; hy += -pulse * 3.4 + sin(TAU * st.phase) * 1.1 * amt + sin(time * 0.5 + sd * 2) * 0.8 * (1 - amt);
    ha += -pulse * 0.5 + sin(time * 0.7 + sd) * 0.04 * (1 - amt) + sin(TAU * st.phase + 1) * 0.03 * amt;
    const ef = frac(time / 5.3 + hash(sd + 3)), flick = ef < 0.08 ? sin(ef * 12.5 * PI) * 0.5 : 0;
    limb(ctx, 14, -37, hx - 4, hy + 3, 21, 16, DG.deep); limb(ctx, 14, -38.5, hx - 4, hy + 1.8, 20, 15.4, DG.coat);
    const open = Math.max(rm * (0.3 + 0.07 * sin(time * 14 + sd)), pulse * 0.85, (1 - amt) * (1 - bk) * 0.06 * sstep(0.9, 0.99, sin(time * 1.3 + sd)));
    dogHead(ctx, hx, hy, ha, open, rm * 0.55 - pulse * 0.25 + flick, frac(time / 3.1 + hash(sd + 9)) < 0.035, rm + pulse * 0.4, pulse, bw);
    ctx.restore();
    leg(0); leg(1);
    ctx.restore();
  }
  API.dog = dog;

  const WATER = GY - 6;
  const bankDepth = (d) => 0.0085 * d * d + 0.00006 * d * d * d;
  function wave(x, t) { return 0.8 * sin(x * 0.045 - t * 1.5) + 0.5 * sin(x * 0.11 - t * 2.3 + 1); }

  function river(ctx, x1, x2, time) {
    if (x2 < x1) { const t = x1; x1 = x2; x2 = t; }
    const vr = viewRange(ctx, 40), a = x1 - 16, b = x2 + 16;
    if (b < vr[0] || a > vr[1]) return;
    const xs = Math.max(a, Math.floor(vr[0] / 8) * 8), xe = Math.min(b, vr[1] + 8), BOT = GY + 2000;
    const edge = (x) => Math.min(sstep(a, a + 22, x), sstep(b, b - 22, x));
    const surf = (x) => { const e = edge(x); return lerp(GY - 1, WATER + wave(x, time), e); };
    ctx.save();
    const g = ctx.createLinearGradient(0, WATER, 0, WATER + 280);
    g.addColorStop(0, '#8dd0e0'); g.addColorStop(0.07, '#62b5d0'); g.addColorStop(0.28, '#3b8db1'); g.addColorStop(0.7, '#245f82'); g.addColorStop(1, '#1a4562');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(xs, BOT); ctx.lineTo(xs, surf(xs));
    for (let x = xs + 8; x < xe; x += 8) ctx.lineTo(x, surf(x));
    ctx.lineTo(xe, surf(xe)); ctx.lineTo(xe, BOT); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(xs, WATER - 4, xe - xs, 700); ctx.clip();
    ctx.lineCap = 'round';
    for (let j = 0; j < 7; j++) {
      const dj = [13, 23, 35, 50, 68, 90, 118][j], len = 24 + j * 7, per = 62 + j * 20, v = 24 - j * 2.6;
      ctx.strokeStyle = 'rgba(236,250,255,' + (0.5 - j * 0.055).toFixed(3) + ')'; ctx.lineWidth = 1.5 - j * 0.1;
      ctx.beginPath();
      for (let k = Math.floor((xs - len - time * v) / per) - 1; k <= Math.ceil((xe - time * v) / per); k++) {
        const sx = k * per + time * v + hash2(j, k) * per * 0.4, y = WATER + dj + sin(sx * 0.05 + time * 1.2 + j) * 1.2;
        ctx.moveTo(sx, y); ctx.quadraticCurveTo(sx + len / 2, y + sin(sx * 0.1 + j) * 1.6, sx + len, y);
      }
      ctx.stroke();
    }
    for (let i = 0, n = Math.ceil((x2 - x1) / 70); i < n; i++) {
      const c = time / 3.4 + hash(i * 1.7), k = Math.floor(c), age = c - k;
      const rx = x1 + 20 + hash2(i, k) * (x2 - x1 - 40) + age * 16, ry = WATER + 6 + hash2(k, i) * 26;
      if (rx < xs - 20 || rx > xe + 20) continue;
      ctx.strokeStyle = 'rgba(240,252,255,' + (0.5 * sin(PI * age) * (1 - age)).toFixed(3) + ')'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(rx, ry, 4 + age * 14, 0.9 + age * 2.4, 0, 0, TAU); ctx.stroke();
    }
    const fb = ctx.createLinearGradient(0, WATER, 0, WATER + 17);
    fb.addColorStop(0, 'rgba(10,52,64,0.62)'); fb.addColorStop(0.55, 'rgba(10,52,64,0.4)'); fb.addColorStop(1, 'rgba(10,52,64,0)');
    ctx.fillStyle = fb; ctx.fillRect(xs, WATER, xe - xs, 17);
    ctx.fillStyle = 'rgba(8,44,54,0.3)';
    for (let x = Math.floor(xs / 23) * 23; x < xe; x += 23) { const hh = 3 + hash(x) * 6; ctx.fillRect(x, WATER + 1, 2 + hash(x + 1) * 3, hh); }
    for (let i = 0, n = Math.ceil((x2 - x1) / 38); i < n; i++) {
      const gx = x1 + ((hash(i * 3.3) * (x2 - x1) + time * (6 + hash(i) * 5)) % (x2 - x1)), tw = Math.pow(Math.max(0, sin(time * (1.2 + hash(i + 5)) + i * 2.1)), 8);
      const ga = tw * sstep(0, 18, gx - x1) * sstep(0, 18, x2 - gx);
      if (ga < 0.03 || gx < xs - 6 || gx > xe + 6) continue;
      ctx.fillStyle = 'rgba(255,255,236,' + (0.85 * ga).toFixed(3) + ')'; ell(ctx, gx, WATER + 3 + hash(i + 9) * 22, 4 + tw * 2.4, 0.8);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(238,251,255,0.8)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(xs, surf(xs));
    for (let x = xs + 8; x < xe; x += 8) ctx.lineTo(x, surf(x));
    ctx.stroke();
    for (const into of [1, -1]) {
      const cx = into > 0 ? a : b;
      ctx.beginPath(); ctx.moveTo(cx, GY - 1);
      for (let d = 0; d <= 170; d += 8) ctx.lineTo(cx + into * d, GY + bankDepth(d));
      ctx.lineTo(cx + into * 170, BOT); ctx.lineTo(cx, BOT); ctx.closePath();
      ctx.fillStyle = '#6b4f35'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#86674a'; ctx.fillRect(cx - 200, GY + 24, 400, 14);
      ctx.strokeStyle = '#5f9a3e'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx, GY + 1);
      for (let d = 8; d <= 44; d += 8) ctx.lineTo(cx + into * d, GY + bankDepth(d) - 2);
      ctx.stroke();
      const t = ctx.createLinearGradient(0, GY - 2, 0, GY + 220);
      t.addColorStop(0, 'rgba(70,170,205,0.08)'); t.addColorStop(0.3, 'rgba(46,135,175,0.3)'); t.addColorStop(1, 'rgba(26,90,125,0.6)');
      ctx.fillStyle = t; ctx.fillRect(Math.min(cx, cx + into * 180), GY - 2, 180, 2200);
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * sin(time * 1.7 + i * 1.9 + into)).toFixed(3) + ')';
        circle(ctx, cx + into * (4 + i * 5.5) + sin(time + i) * 1.2, GY - 3.5 + i * 1.2 + sin(time * 1.3 + i * 2) * 0.6, 1.9 - i * 0.2);
      }
    }
    ctx.restore();
  }

  function stone(ctx, x, w, time) {
    const top = GY - 10, hw = w / 2, sd = hash(x * 0.37);
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const age = frac(time * 0.35 + k / 3 + sd), al = 0.55 * sstep(0, 0.12, age) * (1 - age);
      ctx.strokeStyle = 'rgba(240,252,255,' + al.toFixed(3) + ')'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(x + age * 3, WATER + 1.5, hw + 3 + age * 15, 1.2 + age * 2.4, 0, 0.05, PI - 0.05); ctx.stroke();
    }
    ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const al = 0.45 - k * 0.15 + 0.1 * sin(time * 2 + k * 3 + sd);
      ctx.strokeStyle = 'rgba(240,252,255,' + al.toFixed(3) + ')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x + hw - 2, WATER + 2 + k * 5); ctx.quadraticCurveTo(x + hw + 16, WATER + 3 + k * 5 + sin(time * 2 + k) * 1.5, x + hw + 34, WATER + 5 + k * 6); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - hw + 4, top); ctx.lineTo(x + hw - 4, top); ctx.quadraticCurveTo(x + hw + 1, top + 0.4, x + hw, top + 4.5);
    ctx.bezierCurveTo(x + hw + 0.5, GY, x + hw - 0.5, GY + 16, x + hw + 3, GY + 46); ctx.lineTo(x - hw - 3, GY + 46);
    ctx.bezierCurveTo(x - hw + 0.5, GY + 16, x - hw - 0.5, GY, x - hw, top + 4.5); ctx.quadraticCurveTo(x - hw - 1, top + 0.4, x - hw + 4, top);
    ctx.closePath();
    ctx.fillStyle = '#8f9893'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#aab3ae'; ctx.fillRect(x - hw, top, w, 3.2);
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(x + hw * 0.3, top, hw, 60);
    ctx.fillStyle = 'rgba(110,140,80,0.6)'; ell(ctx, x - hw * 0.45, top + 4.6, hw * 0.22, 1.5); ell(ctx, x + hw * 0.5, top + 3.4, hw * 0.16, 1.1);
    ctx.fillStyle = 'rgba(60,70,70,0.3)'; for (let i = 0; i < 5; i++) circle(ctx, x - hw * 0.6 + hash2(sd, i) * w * 0.8, top + 5 + hash2(i, sd) * 12, 0.7 + hash(i + sd) * 0.6);
    const tint = ctx.createLinearGradient(0, WATER, 0, WATER + 280);
    tint.addColorStop(0, 'rgba(141,208,224,0.38)'); tint.addColorStop(0.05, 'rgba(110,190,214,0.75)'); tint.addColorStop(0.1, 'rgba(92,175,203,1)');
    tint.addColorStop(0.28, '#3b8db1'); tint.addColorStop(1, '#1a4562');
    ctx.fillStyle = tint; ctx.fillRect(x - hw - 6, WATER + 0.5, w + 12, 300);
    ctx.fillStyle = 'rgba(30,50,60,0.3)'; ctx.fillRect(x - hw - 2, WATER - 1.2, w + 4, 2.4);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(ctx, x - hw * 0.32, top + 1.1, hw * 0.3, 0.9); ell(ctx, x + hw * 0.3, top + 1.2, hw * 0.12, 0.7);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.2 * sin(time * 2.4 + sd * 6)).toFixed(3) + ')'; circle(ctx, x - hw * 0.62, top + 2, 0.9);
    ctx.restore();
  }
  API.river = river; API.stone = stone;

  const FS = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9], FW = [0.8, 2.2, 3.1, 3.5, 3.3, 2.5, 1.5, 1.1];
  const newFish = (seed) => ({ t: -1, x: 0, y: 0, ang: 0, seed, seen: 0 });

  function fish(ctx, f, time) {
    const st = stateOf('fish', f, time, newFish), dir = f.dir < 0 ? -1 : 1, dt = time - st.t;
    let vx = f.vx, vy = f.vy;
    if (typeof f.angle === 'number') st.ang = f.angle;
    else {
      if (typeof vx !== 'number' || typeof vy !== 'number') {
        if (dt > 1e-4 && dt < 0.25) { vx = (f.x - st.x) / dt; vy = (f.y - st.y) / dt; } else { vx = vy = 0; }
      }
      if (vx * vx + vy * vy > 9) {
        const a = clamp(atan2(vy, vx * dir), -1.45, 1.45);
        st.ang = dt > 0 && dt < 0.25 ? st.ang + (a - st.ang) * Math.min(1, dt * 20) : a;
      }
    }
    st.x = f.x; st.y = f.y; st.t = time;
    const w = TAU * 4.2 * time + (typeof f.wiggle === 'number' ? f.wiggle : 0), A = 1.9;
    const px = [], py = [], pw = [];
    for (let i = 0; i < FS.length; i++) { px[i] = 13 - FS[i] * 26; py[i] = A * (0.15 + FS[i] * FS[i] * 1.15) * sin(w - 5.2 * FS[i]); pw[i] = FW[i]; }
    const tx = -13, ty = A * 1.3 * sin(w - 5.2);
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(dir, 1); ctx.rotate(st.ang);
    if (f.y < WATER - 3) {
      for (let i = 0; i < 4; i++) {
        const u = frac(time * 2.2 + i / 4);
        ctx.fillStyle = 'rgba(214,238,252,' + (0.85 * (1 - u)).toFixed(3) + ')'; circle(ctx, -14 - u * 13, sin(i * 2.4) * 2.4 + u * u * 13, 1.2 - u * 0.5);
      }
    }
    const n = FS.length - 1, bx = px[n], by = py[n];
    ctx.fillStyle = '#9c7d38'; poly(ctx, [bx + 1, by - 1.2, tx - 0.4, ty - 4.4, tx + 2.6, ty, tx - 0.4, ty + 4.4, bx + 1, by + 1.2]);
    ctx.fillStyle = '#5c4a22'; poly(ctx, [tx - 0.4, ty - 4.4, tx + 0.8, ty - 3.6, tx + 0.2, ty - 2.2]);
    ctx.fillStyle = '#5b5830'; poly(ctx, [px[3], py[3] - pw[3] + 0.4, px[4] + 1, py[4] - pw[4] - 3.4, px[4] - 3.4, py[4] - pw[4] + 0.4]);
    ctx.fillStyle = '#c9a85a'; poly(ctx, [px[5], py[5] + pw[5] - 0.4, px[5] - 1.6, py[5] + pw[5] + 2.4, px[5] - 3.6, py[5] + pw[5] - 0.4]);
    poly(ctx, [px[6] + 1, py[6] + pw[6] - 0.4, px[6] - 1, py[6] + pw[6] + 2.2, px[6] - 3, py[6] + pw[6] - 0.4]);
    const edge = (k, lo, hi) => {
      ctx.beginPath(); ctx.moveTo(px[0], py[0] + pw[0] * lo);
      for (let i = 1; i <= n; i++) ctx.lineTo(px[i], py[i] + pw[i] * lo);
      for (let i = n; i >= 0; i--) ctx.lineTo(px[i], py[i] + pw[i] * hi);
      ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = '#b99d57'; edge(0, -1, 1);
    ctx.fillStyle = '#6a6836'; edge(0, -1, -0.28);
    ctx.fillStyle = '#ecdfb4'; edge(0, 0.42, 1);
    ctx.strokeStyle = 'rgba(205,110,100,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let i = 2; i <= n; i++) { if (i === 2) ctx.moveTo(px[i], py[i] + pw[i] * 0.1); else ctx.lineTo(px[i], py[i] + pw[i] * 0.1); }
    ctx.stroke();
    ctx.fillStyle = '#2b2a1a';
    for (let i = 2; i <= 6; i++) { circle(ctx, px[i] + 1, py[i] - pw[i] * 0.62, 0.75); circle(ctx, px[i] - 1.6, py[i] - pw[i] * 0.2, 0.6); }
    for (let i = 2; i <= 6; i++) {
      const x = px[i] - 0.6, y = py[i] + pw[i] * (i % 2 ? 0.12 : 0.34);
      ctx.fillStyle = '#e4cf9a'; circle(ctx, x, y, 1.15); ctx.fillStyle = '#c9362a'; circle(ctx, x, y, 0.62);
    }
    ctx.fillStyle = '#d5b562'; poly(ctx, [px[2] + 0.6, py[2] + 1.2, px[2] - 3.4, py[2] + 4.4, px[2] - 1.2, py[2] + 0.4]);
    ctx.strokeStyle = 'rgba(70,52,20,0.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(px[2] + 0.6, py[2] + 0.1, pw[2] * 0.95, -1.15, 1.15); ctx.stroke();
    ctx.fillStyle = '#efe6c4'; circle(ctx, px[1] + 0.4, py[1] - 0.7, 1.35); ctx.fillStyle = '#14120a'; circle(ctx, px[1] + 0.7, py[1] - 0.7, 0.8);
    ctx.fillStyle = 'rgba(60,40,20,0.6)'; ctx.fillRect(px[0] - 3.6, py[0] + 0.9, 3.4, 0.5);
    ctx.restore();
  }
  API.fish = fish;

  let hotelG = null;
  function hotelGeo() {
    if (hotelG) return hotelG;
    const g = hotelG = { planks: new Path2D(), stones: new Path2D(), bal: new Path2D(), boards: new Path2D(), joints: new Path2D() };
    for (let y = -131; y < -70; y += 7) { g.planks.moveTo(-222, y); g.planks.lineTo(222, y); }
    for (let x = -226, i = 0; x < 222; i++) { g.stones.moveTo(x, -14); g.stones.lineTo(x, -7); const w = 12 + hash(i) * 14; g.stones.moveTo(x + w * 0.5, -7); g.stones.lineTo(x + w * 0.5, 0); x += w; }
    g.stones.moveTo(-226, -7); g.stones.lineTo(226, -7);
    for (let x = -226; x < 226; x += 8) g.bal.rect(x, -102, 2.2, 25);
    for (let x = -148; x < 150; x += 9) { g.boards.moveTo(x, -138); g.boards.lineTo(x, gableY(x)); }
    for (let x = -168; x < 0; x += 6.5) { g.joints.moveTo(x, -232 - 0.53 * x + 1.2); g.joints.lineTo(x, -221 - 0.53 * x - 1.2); }
    return g;
  }
  const gableY = (x) => -221 + 0.53 * Math.min(170, abs(x));

  function hwin(ctx, cx, top, w, h, mode, time, i, shut) {
    const x = cx - w / 2;
    if (shut) {
      ctx.fillStyle = '#3f5c42'; ctx.fillRect(x - 8.5, top - 1, 8, h + 2); ctx.fillRect(x + w + 0.5, top - 1, 8, h + 2);
      ctx.fillStyle = '#2a402d'; ell(ctx, x - 4.5, top + h * 0.3, 2, 2.6); ell(ctx, x + w + 4.5, top + h * 0.3, 2, 2.6);
    }
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x - 2.5, top - 2.5, w + 5, h + 5);
    if (mode === 'lit') {
      ctx.fillStyle = '#e9b64c'; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(255,238,170,' + (0.72 + 0.2 * sin(time * 0.9 + i * 2.3)).toFixed(3) + ')'; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(196,104,48,0.55)'; ctx.fillRect(x, top, w * 0.26, h); ctx.fillRect(x + w * 0.86, top, w * 0.14, h);
    } else if (mode === 'tv') {
      ctx.fillStyle = '#6c8ca6'; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(170,205,255,' + (0.45 + 0.3 * sin(time * 6.1) * sin(time * 2.3 + 1)).toFixed(3) + ')'; ctx.fillRect(x, top, w, h);
    } else {
      ctx.fillStyle = '#5d7e98'; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; poly(ctx, [x, top + h * 0.55, x + w * 0.6, top, x + w, top, x, top + h]);
    }
    ctx.fillStyle = '#4a3220'; ctx.fillRect(cx - 0.9, top, 1.8, h); ctx.fillRect(x, top + h * 0.42, w, 1.8);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x - 4, top + h + 2.5, w + 8, 3);
  }
  function flowerBox(ctx, cx, y, w, i) {
    ctx.fillStyle = '#6a4a2b'; ctx.fillRect(cx - w / 2, y, w, 5);
    ctx.fillStyle = '#3f7a38'; for (let k = 0; k < w / 4; k++) circle(ctx, cx - w / 2 + 2 + k * 4, y - 1, 2.4);
    ctx.fillStyle = '#d6372c'; for (let k = 0; k < w / 6; k++) circle(ctx, cx - w / 2 + 3 + k * 6 + (i % 2), y - 3 - (k % 2), 1.7);
  }

  function suv(ctx, cx, dir) {
    ctx.save(); ctx.translate(cx, 0); ctx.scale(dir * 1.12, 1.12);
    ctx.fillStyle = 'rgba(20,20,10,0.25)'; ell(ctx, 0, 0.5, 66, 3.6);
    ctx.fillStyle = '#34495e'; poly(ctx, [-60, -12, -60, -36, -55, -40, -50, -51, 12, -52, 30, -35, 52, -33, 60, -29, 61, -14, 54, -10]);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; poly(ctx, [-60, -36, -55, -40, -50, -51, 12, -52, 30, -35, 52, -33, 60, -29, 60, -33, 28, -37, 10, -54, -52, -53]);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-60, -19, 121, 9);
    ctx.fillStyle = '#8fb7d1'; poly(ctx, [-47, -48.5, 10.5, -49, 25.5, -36.5, -50, -36.5]);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; poly(ctx, [-30, -48.8, -22, -48.8, -35, -36.6, -43, -36.6]); poly(ctx, [-8, -48.9, -2, -48.9, -14, -36.6, -20, -36.6]);
    ctx.fillStyle = '#34495e'; ctx.fillRect(-17.5, -49.5, 4, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-18, -35, 1, 18); ctx.fillRect(13, -33, 1, 16);
    ctx.fillStyle = '#b9bfc5'; ctx.fillRect(-26, -33, 7, 1.8); ctx.fillRect(4, -33, 7, 1.8);
    ctx.strokeStyle = '#aab0b6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-42, -55); ctx.lineTo(6, -55.4); ctx.moveTo(-40, -52.5); ctx.lineTo(-40, -55); ctx.moveTo(4, -52.8); ctx.lineTo(4, -55.4); ctx.stroke();
    ctx.fillStyle = '#fff3bd'; poly(ctx, [55, -32, 61, -29.5, 61, -26, 55, -27]); ctx.fillStyle = '#c0392b'; ctx.fillRect(-60, -34, 2.6, 7);
    ctx.fillStyle = '#2b2f33'; ctx.fillRect(-61, -17, 4, 5); ctx.fillRect(57, -17, 5, 5); ctx.fillStyle = '#eee'; ctx.fillRect(-60.5, -23.5, 2, 4);
    for (const wx of [-36, 36]) {
      ctx.fillStyle = '#17191c'; circle(ctx, wx, -11, 13.2); ctx.fillStyle = '#26292d'; circle(ctx, wx, -11, 10.6);
      ctx.fillStyle = '#c3c8cd'; circle(ctx, wx, -11, 6); ctx.fillStyle = '#7a8086'; circle(ctx, wx, -11, 2.2);
      ctx.strokeStyle = '#8f959b'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k < 5; k++) { ctx.moveTo(wx, -11); ctx.lineTo(wx + cos(k * 1.2566 + 0.4) * 5.6, -11 + sin(k * 1.2566 + 0.4) * 5.6); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function hotel(ctx, x, time) {
    const g = hotelGeo();
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.15)'; ell(ctx, 0, 1, 238, 5);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#efe5d0'; poly(ctx, [s * 222, 0, s * 222, -70, s * 150, -70, s * 150, 0]);
      ctx.fillStyle = '#b98a58'; poly(ctx, [s * 222, -70, s * 222, -122.3, s * 150, -139, s * 150, -70]);
    }
    ctx.fillStyle = '#efe5d0'; ctx.fillRect(-150, -70, 300, 70);
    ctx.fillStyle = '#b98a58'; ctx.fillRect(-150, -138, 300, 68);
    ctx.fillStyle = '#c9a373'; poly(ctx, [-150, -138, -150, gableY(150), 0, gableY(0), 150, gableY(150), 150, -138]);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,40,18,0.22)'; ctx.stroke(g.boards);
    ctx.strokeStyle = 'rgba(70,40,18,0.28)'; ctx.stroke(g.planks);
    ctx.fillStyle = '#8b8780'; ctx.fillRect(-228, -14, 456, 14);
    ctx.strokeStyle = 'rgba(40,36,30,0.4)'; ctx.stroke(g.stones);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-228, -14, 456, 2);
    const GF = [[-186, 34, 'lit'], [-115, 28, 'dark'], [-70, 28, 'lit'], [70, 28, 'tv'], [115, 28, 'dark'], [186, 34, 'lit']];
    GF.forEach((w, i) => hwin(ctx, w[0], -54, w[1], 32, w[2], time, i, false));
    const FF = [[-186, 26, 'dark', 0], [-104, 22, 'lit', 1], [-40, 22, 'dark', 1], [40, 22, 'lit', 1], [104, 22, 'dark', 1], [186, 26, 'lit', 0]];
    FF.forEach((w, i) => hwin(ctx, w[0], w[3] ? -134 : -120, w[1], w[3] ? 46 : 32, w[2], time, i + 7, !!w[3]));
    for (const s of [-1, 1]) {
      const cx = s * 21;
      ctx.fillStyle = '#4a3220'; ctx.fillRect(cx - 12, -184, 24, 34); ctx.beginPath(); ctx.arc(cx, -184, 12, PI, 0); ctx.fill();
      ctx.fillStyle = s < 0 ? '#e9b64c' : '#5d7e98'; ctx.fillRect(cx - 9.5, -184, 19, 31); ctx.beginPath(); ctx.arc(cx, -184, 9.5, PI, 0); ctx.fill();
      if (s < 0) { ctx.fillStyle = 'rgba(255,238,170,' + (0.75 + 0.2 * sin(time * 0.8)).toFixed(3) + ')'; ctx.fillRect(cx - 9.5, -184, 19, 31); ctx.beginPath(); ctx.arc(cx, -184, 9.5, PI, 0); ctx.fill(); }
      ctx.fillStyle = '#4a3220'; ctx.fillRect(cx - 0.9, -193, 1.8, 40);
    }
    ctx.fillStyle = '#5a3d22'; circle(ctx, -3.6, -208, 4.2); circle(ctx, 3.6, -208, 4.2); poly(ctx, [-7.6, -206.4, 7.6, -206.4, 0, -197]);
    [-115, -70, 70, 115].forEach((cx, i) => flowerBox(ctx, cx, -20, 32, i));
    ctx.fillStyle = '#9a958d'; ctx.fillRect(-46, -4, 92, 4); ctx.fillRect(-40, -8, 80, 4);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-31, -68, 62, 60);
    ctx.fillStyle = '#e9b64c'; ctx.fillRect(-28, -65, 25.5, 57); ctx.fillRect(2.5, -65, 25.5, 57);
    ctx.fillStyle = 'rgba(255,238,170,0.7)'; ctx.fillRect(-28, -65, 25.5, 57); ctx.fillRect(2.5, -65, 25.5, 57);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-28, -40, 56, 1.8); ctx.fillRect(-15.5, -65, 1.4, 57); ctx.fillRect(15, -65, 1.4, 57);
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(-5, -38, 2, 12); ctx.fillRect(3, -38, 2, 12);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(s * 40 - 1, -56, 2, 6);
      ctx.fillStyle = 'rgba(255,214,120,0.25)'; circle(ctx, s * 40, -45, 8); ctx.fillStyle = '#ffd978'; ell(ctx, s * 40, -45, 3, 4.2);
      ctx.fillStyle = '#8a4b2d'; ctx.fillRect(s * 54 - 5, -9, 10, 9);
      ctx.fillStyle = '#2f6b3a'; poly(ctx, [s * 54 - 9, -8, s * 54, -34, s * 54 + 9, -8]); poly(ctx, [s * 54 - 7, -22, s * 54, -44, s * 54 + 7, -22]);
    }
    ctx.fillStyle = '#7a5534'; ctx.fillRect(-228, -76, 456, 6); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-228, -70, 456, 4);
    ctx.fillStyle = '#5a3d22'; ctx.fill(g.bal); ctx.fillStyle = '#6a4a2b'; ctx.fillRect(-228, -105.5, 456, 3.5);
    ctx.fillStyle = '#5b3f27'; ctx.fillRect(-137, -111, 274, 36);
    ctx.fillStyle = '#2f4a35'; ctx.fillRect(-134, -108, 268, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-134, -108, 268, 3);
    const msg = ZS.LABELS.art.hotel + ' ', stars = '****';
    ctx.font = '800 18px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const tw = ctx.measureText(msg + stars).width, k = Math.min(1, 236 / tw), w1 = ctx.measureText(msg).width * k;
    ctx.font = '800 ' + (18 * k) + 'px system-ui, sans-serif';
    ctx.fillStyle = '#f5edd2'; ctx.fillText(msg, -tw * k / 2, -92.5);
    ctx.fillStyle = '#f0c030'; ctx.fillText(stars, -tw * k / 2 + w1, -90.5);
    for (const s of [-1, 1]) { ctx.fillStyle = '#e0b23c'; circle(ctx, s * 125, -92, 3); for (let i = 0; i < 4; i++) circle(ctx, s * 125 + (i - 1.5) * 2.6, -97 + abs(i - 1.5) * 1.1, 1.1); }
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#4e3d35'; poly(ctx, [s * 232, -132, s * 146, -152, s * 146, -140, s * 232, -120]);
      ctx.fillStyle = '#392c26'; poly(ctx, [s * 232, -120, s * 146, -140, s * 146, -138, s * 232, -118]);
      ctx.fillStyle = 'rgba(255,235,200,0.14)'; poly(ctx, [s * 232, -132, s * 146, -152, s * 146, -150.6, s * 232, -130.6]);
    }
    ctx.fillStyle = '#4e3d35';
    poly(ctx, [-170, -130.9, 0, -221, 170, -130.9, 170, -141.9, 0, -232, -170, -141.9]);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke(g.joints);
    ctx.save(); ctx.scale(-1, 1); ctx.stroke(g.joints); ctx.restore();
    ctx.fillStyle = '#392c26'; poly(ctx, [-170, -130.9, 0, -221, 0, -219, -170, -128.9]); poly(ctx, [170, -130.9, 0, -221, 0, -219, 170, -128.9]);
    ctx.fillStyle = 'rgba(255,235,200,0.14)'; poly(ctx, [-170, -141.9, 0, -232, 0, -230.6, -170, -140.5]); poly(ctx, [170, -141.9, 0, -232, 0, -230.6, 170, -140.5]);
    ctx.fillStyle = '#7b756d'; poly(ctx, [-196, -186, -184, -186, -184, -140, -196, -137.5]);
    ctx.fillStyle = '#625d56'; for (let i = 0; i < 4; i++) ctx.fillRect(-196, -180 + i * 10, 12, 1.3);
    ctx.fillStyle = '#58534d'; ctx.fillRect(-198, -189, 16, 4);
    smoke(ctx, -190, -192, time, 0.6, 0.9);
    line(ctx, 200, -139, 200, -196, 2, '#cfd3d6'); ctx.fillStyle = '#cfd3d6'; circle(ctx, 200, -197, 2);
    const bands = ['#ffffff', '#0b4ea2', '#ee1c25'];
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = bands[b]; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const off = sin(time * 3.4 - i * 0.8) * 2.1 * (i / 8); if (i) ctx.lineTo(201 + i * 3.4, -195 + b * 5 + off); else ctx.moveTo(201, -195 + b * 5); }
      for (let i = 8; i >= 0; i--) { const off = sin(time * 3.4 - i * 0.8) * 2.1 * (i / 8); ctx.lineTo(201 + i * 3.4, -190 + b * 5 + off); }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ee1c25'; rr(ctx, 203, -194, 6, 8, 2); ctx.fillStyle = '#fff'; ctx.fillRect(205.6, -193, 0.9, 6); ctx.fillRect(204, -191.4, 4, 0.8); ctx.fillRect(204.4, -189.6, 3.2, 0.8);
    suv(ctx, 160, -1);
    ctx.restore();
  }
  API.hotel = hotel;

  const LIFT_H = 214, CHAIRS = ['#d2382b', '#e8b92a', '#2f6fb3'], JACKETS = ['#e8590c', '#2f86c8', '#7b5ea7', '#2f8f4e'], SKIS = ['#e8402f', '#2a6fd1', '#f6c624', '#7b2fbf'];

  function liftChair(ctx, k, face, far, time, dxp, a, snowy) {
    ctx.save(); ctx.globalAlpha = a;
    const sw = 0.06 * sin(time * 1.15 + k * 2.1) + 0.04 * sin(time * 2.3 + k * 0.7) + 0.05 * exp(-dxp * dxp / 900) * sin(dxp * 0.14);
    ctx.rotate(sw); ctx.scale(face * (far ? 0.88 : 1), far ? 0.88 : 1);
    const body = far ? dk(CHAIRS[k % 3], 0.78) : CHAIRS[k % 3];
    ctx.fillStyle = far ? '#2c3238' : '#1f252b'; rr(ctx, -3.6, -3.4, 7.2, 5.4, 1.4);
    line(ctx, 0, 1, 0, 25, 1.8, far ? '#323941' : '#3a4147');
    const rider = hash(k * 1.3 + (far ? 5 : 0)) > 0.3;
    if (rider) {
      const jc = JACKETS[(k + (far ? 1 : 0)) % 4];
      if (snowy) {
        const sb = hash(k * 2.7 + (far ? 3 : 0)) > 0.7, sw2 = 0.05 * sin(time * 1.7 + k * 1.3);
        ctx.save(); ctx.translate(18.8, 40.4); ctx.rotate(0.06 + sw2);
        if (sb) { ctx.fillStyle = far ? dk(SKIS[k % 4], 0.78) : SKIS[k % 4]; rr(ctx, -14, -1, 26, 3.2, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-11, -0.4, 18, 0.8); }
        else {
          ctx.fillStyle = far ? dk(SKIS[k % 4], 0.78) : SKIS[k % 4]; rr(ctx, -13, -0.6, 32, 2, 1);
          ctx.beginPath(); ctx.moveTo(18, -0.6); ctx.quadraticCurveTo(22, -0.6, 22.4, -3.4); ctx.lineTo(21, -3); ctx.quadraticCurveTo(20.4, 1.2, 17, 1.4); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      ctx.fillStyle = far ? dk(jc, 0.78) : jc; rr(ctx, -3.4, 8.5, 11, 17, 4);
      limb(ctx, 3, 25.4, 15, 25.4, 5.2, 4.6, snowy ? '#2b3340' : '#33415c'); limb(ctx, 15, 25.4, 17.4, 37.4, 4.4, 3.8, snowy ? '#2b3340' : '#33415c');
      ctx.fillStyle = '#1d1d1d'; ell(ctx, 18.8, 39, 4.4, 1.5);
      ctx.fillStyle = '#f0c8a0'; circle(ctx, 3.6, 4.2, 4.1);
      ctx.fillStyle = JACKETS[(k + 2) % 4]; ctx.beginPath(); ctx.arc(3.4, 3.8, 4.4, PI, TAU); ctx.fill();
      if (snowy) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ell(ctx, 2, 1.4, 2, 1, -0.3);
        ctx.fillStyle = '#26282c'; rr(ctx, 3.4, 2.6, 5, 2.6, 1.1);
        ctx.fillStyle = far ? '#b98a3c' : '#ffb347'; rr(ctx, 4.4, 3, 3.6, 1.6, 0.8);
      } else circle(ctx, 3.4, -0.9, 1.3);
    }
    ctx.fillStyle = body; rr(ctx, -6.5, 24, 25, 4.4, 1.6); rr(ctx, -8, 8, 4.8, 20, 1.8);
    ctx.strokeStyle = '#b9bfc5'; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(13, 12.5); ctx.lineTo(17, 26.5); ctx.stroke();
    if (snowy) {
      snowCap(ctx, -8.4, -2.8, 8, 2.2, k + 0.5);
      if (!rider) snowCap(ctx, -6.5, 18.5, 24, 3.2, k);
      snowCap(ctx, -3.8, 3.8, -3.4, 1.8, k + 0.2);
      icicles(ctx, -5, 17, 28.4, 3, 4, k);
    }
    ctx.restore();
  }

  const BULL = 64;

  function booth(ctx, time, snowy) {
    ctx.fillStyle = 'rgba(28,22,10,0.15)'; ell(ctx, -88, 0.5, 24, 2.6);
    ctx.fillStyle = '#b98a58'; ctx.fillRect(-106, -38, 36, 38);
    ctx.strokeStyle = 'rgba(70,40,18,0.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = -33; y < 0; y += 5) { ctx.moveTo(-106, y); ctx.lineTo(-70, y); }
    ctx.stroke();
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-101, -31, 26, 16);
    ctx.fillStyle = '#e9b64c'; ctx.fillRect(-99, -29, 22, 12);
    ctx.fillStyle = 'rgba(255,238,170,' + (0.7 + 0.15 * sin(time * 0.8)).toFixed(3) + ')'; ctx.fillRect(-99, -29, 22, 12);
    const nod = 0.6 * sin(time * 0.7) + Math.max(0, sin(time * 0.23));
    ctx.fillStyle = '#2f3a2a'; rr(ctx, -93, -22, 11, 6, 2);
    ctx.fillStyle = '#f0c8a0'; circle(ctx, -87.5, -24.5 + nod * 0.6, 2.7);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(-87.5, -25 + nod * 0.6, 2.9, PI, TAU); ctx.fill();
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(-84, -22.5, 6, 4.5);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-88.5, -29, 1.4, 12);
    ctx.fillStyle = '#6a4a2b'; ctx.fillRect(-103, -14, 30, 2.4);
    ctx.fillStyle = '#4e3d35'; poly(ctx, [-110, -37, -88, -50, -66, -37, -66, -34, -88, -47, -110, -34]);
    ctx.fillStyle = 'rgba(255,235,200,0.14)'; poly(ctx, [-110, -37, -88, -50, -88, -48.6, -110, -35.6]);
    if (snowy) { snowCap(ctx, -110, -88, -38, 3, 9.1); snowCap(ctx, -88, -66, -38, 3, 9.7); icicles(ctx, -108, -68, -34, 5, 5, 9.3); }
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(-100, -56, 1.6, 8); ctx.fillRect(-77.6, -56, 1.6, 8);
    ctx.fillStyle = '#2f4a35'; rr(ctx, -106, -64, 36, 10, 2);
    txt(ctx, ZS.LABELS.lift.ticket, -88, -58.6, 6.4, '#f5edd2', 800, 0.4, 32);
    if (snowy) snowCap(ctx, -106, -70, -64, 2.4, 9.9);
  }

  function terminal(ctx, time, snowy) {
    ctx.fillStyle = 'rgba(28,22,10,0.14)'; ell(ctx, 6, 0.5, 78, 4);
    ctx.fillStyle = '#a8a59d'; ctx.fillRect(-66, -8, 142, 8); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-66, -8, 142, 2);
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(4, -11, 74, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 9; i++) ctx.fillRect(6 + i * 8.2, -11, 1, 4);
    ctx.fillStyle = '#f0c030'; ctx.fillRect(30, -11.4, 3, 4.4);
    ctx.fillStyle = '#7c8791'; poly(ctx, [-36, -8, -27, -8, -29, -56, -35, -56]);
    ctx.fillStyle = '#66707a'; poly(ctx, [-21, -8, -12, -8, -16, -56, -22, -56]);
    line(ctx, -32, -12, -18, -50, 1.6, '#5c6770'); line(ctx, -16, -12, -32, -50, 1.6, '#5c6770');
    for (const px of [-4, 70]) { ctx.fillStyle = '#5a4630'; ctx.fillRect(px - 1.5, -98 - (px > 0 ? 6 : 0), 3, 88 + (px > 0 ? 6 : 0)); }
    ctx.fillStyle = '#c0392b'; poly(ctx, [-10, -96, 78, -108, 80, -102, -8, -90]);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; poly(ctx, [-8, -90, 80, -102, 80, -100, -8, -88]);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; poly(ctx, [-10, -96, 78, -108, 78, -106.6, -10, -94.6]);
    if (snowy) { ctx.save(); ctx.translate(0, 0); snowCap(ctx, -8, 78, -97 - 0.5, 3.4, 4.1); ctx.restore(); icicles(ctx, -6, 76, -90, 9, 6, 4.4); }
    ctx.save(); ctx.translate(0, -BULL);
    ctx.fillStyle = '#2b3138'; ell(ctx, -18, 9, 36, 4.4);
    ctx.fillStyle = '#4f5962'; rr(ctx, -64, -16, 86, 26, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, -60, -15, 78, 5, 3);
    ctx.fillStyle = '#e8b92a'; ctx.fillRect(-60, 4, 78, 3.4);
    ctx.fillStyle = '#2b3138'; rr(ctx, 14, -11, 10, 18, 4);
    txt(ctx, ZS.LABELS.lift.station, -22, -4, 8.6, '#f5f2e8', 800, 1, 62);
    if (snowy) snowCap(ctx, -62, 20, -15.5, 4, 3.3);
    ctx.restore();
  }

  function pylon(ctx, x, snowy, ang) {
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = '#a8a59d'; ctx.fillRect(-25, -10, 50, 10); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-25, -10, 50, 2.4);
    ctx.fillStyle = '#8f8c84'; ctx.fillRect(-19, -15, 38, 5);
    const legX = (h) => lerp(11.8, 5.2, h / 184);
    for (const s of [-1, 1]) {
      ctx.fillStyle = s < 0 ? '#7c8791' : '#66707a';
      poly(ctx, [s * 14.3, -15, s * 9.3, -15, s * 3.4, -199, s * 7.2, -199]);
    }
    ctx.strokeStyle = '#5c6770'; ctx.lineWidth = 1.7; ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const h0 = 15 + i * 20.5, h1 = h0 + 20.5, x0 = legX(h0 - 15) - 1, x1 = legX(h1 - 15) - 1;
      ctx.moveTo(-x0, -h0); ctx.lineTo(x1, -h1); ctx.moveTo(x0, -h0); ctx.lineTo(-x1, -h1); ctx.moveTo(-x1, -h1); ctx.lineTo(x1, -h1);
    }
    ctx.stroke();
    ctx.fillStyle = '#4f5962'; rr(ctx, -27, -207, 54, 9, 2); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-26, -207, 52, 1.6);
    for (const [off, far] of [[-3.5, true], [0, false]]) {
      ctx.save(); ctx.translate(0, -LIFT_H + 5 + off); ctx.rotate(ang);
      ctx.fillStyle = far ? '#363d44' : '#2b3138'; rr(ctx, -19, -4, 38, 8, 3.2);
      ctx.fillStyle = far ? '#59626b' : '#7a848d'; for (let i = -1.5; i <= 1.5; i++) circle(ctx, i * 9, -4.4, 3.8);
      ctx.restore();
    }
    ctx.fillStyle = '#e8b92a'; ctx.fillRect(-27, -206, 4, 7); ctx.fillRect(23, -206, 4, 7);
    if (snowy) {
      snowCap(ctx, -28, 28, -207, 4.2, x * 0.01);
      icicles(ctx, -25, 25, -198, 9, 9, x * 0.01);
      snowCap(ctx, -26, 26, -10, 3.4, x * 0.01 + 3); snowCap(ctx, -20, 20, -15, 2.4, x * 0.01 + 4);
      ctx.fillStyle = '#f5f8fb';
      for (let i = 0; i < 9; i++) { const h = 15 + i * 20.5 + 10.25; ell(ctx, 0, -h - 1.2, 2.6 - i * 0.12, 1.1); }
      ctx.fillStyle = 'rgba(150,176,204,0.55)'; ell(ctx, 0, -10, 30, 3);
      ctx.fillStyle = '#f5f8fb'; ell(ctx, 0, -10.6, 28, 2.4);
    }
    ctx.restore();
  }

  function skiLift(ctx, lift, time, snowy) {
    const x = lift.x, top = lift.tower, slope = (LIFT_H - BULL) / (top - x), vr = viewRange(ctx, 90);
    const cy = (wx) => GY - BULL - slope * (wx - x), x0 = x + 16, xr = vr[1], ang = -atan2(slope, 1);
    if (xr < x - 140 || vr[0] > x + 3200) return;
    ctx.save();
    const cable = (off, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x0, cy(x0) + off); ctx.lineTo(xr, cy(xr) + off); ctx.stroke(); };
    const chairs = (far) => {
      const LEN = 2160, face = far ? -1 : 1;
      for (let k = 0; k < 12; k++) {
        const pos = ((k * 180 + (far ? 90 : 0) + time * 30) % LEN + LEN) % LEN, wx = far ? x0 + LEN - pos : x0 + pos;
        if (wx < vr[0] - 40 || wx > vr[1] + 40) continue;
        const a = sstep(x + 14, x + 46, wx); if (a < 0.02) continue;
        ctx.save(); ctx.translate(wx, cy(wx) + (far ? -3.5 : 0));
        liftChair(ctx, k, face, far, time, wx - top, a * (far ? 0.92 : 1), snowy); ctx.restore();
      }
    };
    ctx.save(); ctx.translate(x - 62, GY); booth(ctx, time, snowy); ctx.restore();
    cable(-3.5, 'rgb(74,82,90)', 1.5);
    chairs(true);
    pylon(ctx, top, snowy, ang);
    cable(0, 'rgb(37,43,49)', 1.9); cable(-0.7, 'rgba(223,230,234,0.5)', 0.6);
    chairs(false);
    ctx.translate(x, GY);
    terminal(ctx, time, snowy);
    ctx.restore();
  }
  API.skiLift = skiLift;

  function container(ctx, x, locked, snowy) {
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(25,25,12,0.2)'; ell(ctx, 0, 0.8, 52, 3.4);
    ctx.fillStyle = '#1d2024'; circle(ctx, -35, -5.5, 5.5); circle(ctx, 35, -5.5, 5.5);
    ctx.fillStyle = '#8a9096'; circle(ctx, -35, -5.5, 2); circle(ctx, 35, -5.5, 2);
    ctx.fillStyle = '#2f7d4f'; poly(ctx, [-40, -8, 40, -8, 44, -58, -44, -58]);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; poly(ctx, [-40, -8, -33, -8, -37, -58, -44, -58]);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; poly(ctx, [30, -8, 40, -8, 44, -58, 33.5, -58]);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let i = 0; i < 4; i++) ctx.fillRect(-33 + i * 20, -56, 1.8, 44);
    ctx.fillStyle = '#1f5a38'; ctx.fillRect(-40, -13, 80, 5); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-44, -60, 88, 3);
    ctx.fillStyle = '#25663f'; rr(ctx, -48, -70, 96, 12, 3.6);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-45, -69, 90, 2.6); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-46, -60, 92, 2.4);
    ctx.fillStyle = '#17402a'; rr(ctx, -19, -65, 38, 4.6, 2.2);
    ctx.fillStyle = '#f4f1e6'; rr(ctx, -39, -51, 34, 17, 2.4);
    const [w1, w2] = ZS.LABELS.art.waste;
    txt(ctx, w1, -22, -46, 4.8, '#245a38', 800, 0, 31); txt(ctx, w2, -22, -39.2, 8, '#245a38', 900, 0.3, 31);
    if (locked) {
      ctx.fillStyle = '#f7d21e'; rr(ctx, 12, -54, 26, 26, 3.6);
      ctx.fillStyle = '#1d1d1d'; ell(ctx, 25, -37.5, 5.4, 4.4); circle(ctx, 19.2, -45, 2); circle(ctx, 23.4, -47.6, 2.1); circle(ctx, 27.8, -47.6, 2.1); circle(ctx, 32, -45, 2);
      ctx.strokeStyle = '#d22a1f'; ctx.lineWidth = 2.3; ctx.beginPath(); ctx.arc(25, -41, 10, 0, TAU); ctx.moveTo(17.9, -34); ctx.lineTo(32.1, -48); ctx.stroke();
      ctx.fillStyle = '#4a5158'; rr(ctx, -50.5, -68.5, 7, 14, 1.8); rr(ctx, 43.5, -68.5, 7, 14, 1.8);
      ctx.fillStyle = '#b5bec6'; ctx.fillRect(-47, -63.4, 94, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-47, -63.4, 94, 1.8); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-47, -58.6, 94, 2);
      ctx.fillStyle = '#80888f'; for (const bx of [-45, 45]) circle(ctx, bx, -61, 1.3);
      ctx.strokeStyle = '#8c969d'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(2, -57, 5, PI, 0); ctx.stroke();
      ctx.fillStyle = '#d9a82e'; rr(ctx, -5.5, -57, 15, 12, 2.6); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-4.5, -56, 13, 2);
      ctx.fillStyle = '#4a3410'; circle(ctx, 2, -52, 1.6); ctx.fillRect(1.4, -52, 1.2, 3.4);
    }
    if (snowy) {
      snowCap(ctx, -49, 49, -70, 5.2, x * 0.01);
      icicles(ctx, -44, 44, -58, 7, 5, x * 0.01);
      ctx.fillStyle = '#f5f8fb'; ctx.beginPath(); ctx.arc(-35, -5.5, 5.8, PI * 1.15, PI * 1.85); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(35, -5.5, 5.8, PI * 1.15, PI * 1.85); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(150,176,204,0.5)'; ell(ctx, 0, -0.4, 50, 2.6);
      ctx.fillStyle = '#f5f8fb'; blob(ctx, [-54, 1, -46, -4, -38, -1.6, -30, -3.4, 32, -3, 40, -4.6, 48, -2, 56, 1]);
    }
    ctx.restore();
  }
  API.container = container;

  const HAY = ['#d8b55b', '#c29d44', '#ecd28b'];
  let hayPaths = null;
  const hayW = (h) => 36 * (1 - Math.pow(clamp((h - 18) / 92, 0, 1), 1.6));
  function haystack(ctx, x, time, stir) {
    if (!hayPaths) {
      hayPaths = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < 130; i++) {
        const h = 4 + hash(i * 2.1) * 92, hw = hayW(h), px = (hash(i * 3.7) * 2 - 1) * hw * 0.95, sg = px < 0 ? -1 : 1, p = hayPaths[Math.floor(hash(i * 5.3) * 3)];
        p.moveTo(px, -h); p.lineTo(px + sg * (2.5 + hash(i * 7.1) * 4), -h + 5 + hash(i * 1.9) * 6);
      }
    }
    ctx.save(); ctx.translate(x, GY);
    const st = stir > 0 && Number.isFinite(time) ? stir : 0;
    if (st) { ctx.rotate(0.028 * st * sin(time * 19) * sin(time * 2.3 + 1)); ctx.scale(0.92 * (1 + 0.022 * st * sin(time * 23)), 1 - 0.016 * st * sin(time * 23)); }
    else ctx.scale(0.92, 1);
    ctx.fillStyle = 'rgba(40,30,10,0.2)'; ell(ctx, 0, 0.6, 42, 3.4);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-31, -5, 62, 5); ctx.fillStyle = '#4f361f'; ctx.fillRect(-31, -2, 62, 2);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-2.2, -108, 4.4, 20); ctx.fillStyle = '#8a6540'; circle(ctx, 0, -108, 2.6);
    ctx.beginPath(); ctx.moveTo(-35, -4);
    ctx.bezierCurveTo(-40, -22, -35, -48, -25, -66); ctx.bezierCurveTo(-17, -82, -8, -94, 0, -100);
    ctx.bezierCurveTo(8, -94, 17, -82, 25, -66); ctx.bezierCurveTo(35, -48, 40, -22, 35, -4); ctx.closePath();
    ctx.fillStyle = HAY[0]; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,240,170,0.2)'; ctx.fillRect(-44, -104, 38, 100);
    ctx.fillStyle = 'rgba(120,80,10,0.2)'; ctx.fillRect(8, -104, 40, 100); ctx.fillStyle = 'rgba(60,30,0,0.2)'; ctx.fillRect(-44, -9, 88, 9);
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.strokeStyle = HAY[1]; ctx.stroke(hayPaths[0]); ctx.strokeStyle = HAY[2]; ctx.stroke(hayPaths[1]); ctx.strokeStyle = '#9d7b30'; ctx.stroke(hayPaths[2]);
    for (const h of [36, 64]) {
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, -h, hayW(h) + 2, 5, 0, 0.05, PI - 0.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,160,0.4)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(0, -h - 0.9, hayW(h) + 2, 5, 0, 0.1, PI - 0.1); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = HAY[0];
    for (let i = 0, fx = -37; fx < 34; i++) { const w = 3.4 + hash(i * 1.9) * 3.4; poly(ctx, [fx, -9, fx + w * 0.5, -1 + hash(i) * 3.6, fx + w, -9]); fx += w * 0.82; }
    ctx.fillStyle = HAY[2]; ell(ctx, 0, -99.5, 9, 4.6); ell(ctx, -3, -102, 5, 3);
    ctx.restore();
  }
  API.haystack = haystack;

  function chapel(ctx, x, time) {
    const u = time % 16, ring = sstep(0, 0.4, u) * exp(-Math.max(0, u - 0.4) * 0.85);
    const swing = 0.55 * ring * sin(u * 6.6) + 0.012 * sin(time * 1.7);
    ctx.save(); ctx.translate(x, GY); ctx.scale(0.93, 1);
    ctx.fillStyle = 'rgba(28,24,12,0.16)'; ell(ctx, 0, 0.8, 54, 4);
    ctx.fillStyle = '#8d8a83'; ctx.fillRect(-44, -8, 88, 8); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-44, -8, 88, 2);
    ctx.fillStyle = '#f6f3ea'; ctx.fillRect(-40, -58, 80, 50);
    ctx.fillStyle = '#e6e1d4'; ctx.fillRect(-40, -17, 80, 9); ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(24, -58, 16, 50);
    for (const s of [-1, 1]) {
      const cx = s * 27;
      ctx.fillStyle = '#e9e4d6'; ctx.fillRect(cx - 7, -46, 14, 22); ctx.beginPath(); ctx.arc(cx, -46, 7, PI, 0); ctx.fill();
      ctx.fillStyle = '#5f84a6'; ctx.fillRect(cx - 5, -46, 10, 20); ctx.beginPath(); ctx.arc(cx, -46, 5, PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; poly(ctx, [cx - 5, -34, cx, -46, cx + 2.5, -46, cx - 5, -29]);
      ctx.fillStyle = '#e9e4d6'; ctx.fillRect(cx - 0.7, -51, 1.4, 25); ctx.fillRect(cx - 5, -38, 10, 1.4);
    }
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-12.5, -40, 25, 32); ctx.beginPath(); ctx.arc(0, -40, 12.5, PI, 0); ctx.fill();
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-10, -40, 20, 32); ctx.beginPath(); ctx.arc(0, -40, 10, PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = -1; i <= 1; i++) ctx.fillRect(i * 5 - 0.6, -48, 1.2, 40);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-10, -33, 20, 2); ctx.fillRect(-10, -17, 20, 2); ctx.fillStyle = '#c9a64a'; circle(ctx, 6, -24, 1.5);
    ctx.fillStyle = '#9a958d'; ctx.fillRect(-16, -3.5, 32, 3.5);
    const fl = 0.55 + 0.25 * sin(time * 9.1) * sin(time * 3.7 + 1) + 0.12 * sin(time * 17);
    line(ctx, -16.4, -51, -16.4, -42, 1.2, '#2b2b2b'); ctx.fillStyle = 'rgba(255,110,60,' + (0.28 * fl).toFixed(3) + ')'; circle(ctx, -16.4, -38, 7);
    ctx.fillStyle = '#d13a2c'; rr(ctx, -18.4, -42, 4, 7, 1.4); ctx.fillStyle = 'rgba(255,220,160,' + fl.toFixed(3) + ')'; ctx.fillRect(-17.4, -40, 2, 3.2);
    ctx.fillStyle = '#a34b36'; poly(ctx, [-47, -55, 0, -92, 47, -55]);
    ctx.strokeStyle = 'rgba(60,20,10,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = -61; y > -90; y -= 5) { const hw = 47 * (y + 92) / 37; ctx.moveTo(-hw, y); ctx.lineTo(hw, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; poly(ctx, [0, -92, 47, -55, 0, -55]);
    ctx.strokeStyle = '#5a2f22'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-48.5, -54); ctx.lineTo(0, -93.4); ctx.lineTo(48.5, -54); ctx.stroke();
    ctx.fillStyle = '#5a2f22'; ctx.fillRect(-49, -56, 98, 2.6);
    ctx.fillStyle = '#f8f5ec'; ctx.fillRect(-13, -114, 26, 56); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(5, -114, 8, 56);
    ctx.fillStyle = '#e1ddd0'; ctx.fillRect(-14, -60, 28, 3);
    ctx.fillStyle = '#d6d0c0'; ctx.fillRect(-16, -114, 32, 4);
    ctx.fillStyle = '#e9e4d6'; ctx.fillRect(-7.5, -105, 15, 24); ctx.beginPath(); ctx.arc(0, -105, 7.5, PI, 0); ctx.fill();
    ctx.fillStyle = '#2b2118'; ctx.fillRect(-6, -105, 12, 23); ctx.beginPath(); ctx.arc(0, -105, 6, PI, 0); ctx.fill();
    ctx.fillStyle = '#5a4630'; ctx.fillRect(-6, -109, 12, 2.4);
    ctx.save(); ctx.translate(0, -107); ctx.rotate(swing);
    ctx.fillStyle = '#d9a933'; poly(ctx, [-1.6, 0, 1.6, 0, 2.6, 8, 5.4, 15.4, -5.4, 15.4, -2.6, 8]); ctx.fillStyle = '#a77d1d'; ctx.fillRect(-5.4, 14.2, 10.8, 1.4);
    ctx.fillStyle = '#6b4a14'; circle(ctx, 0, 16.6, 1.5); ctx.restore();
    ctx.fillStyle = '#e1ddd0'; ctx.fillRect(-9, -81, 18, 2.4);
    ctx.fillStyle = '#3f4a55'; ctx.beginPath(); ctx.moveTo(-15, -114);
    ctx.bezierCurveTo(-21, -122, -14, -128, -6, -133); ctx.bezierCurveTo(-3, -135, -1.4, -137, 0, -139.4);
    ctx.bezierCurveTo(1.4, -137, 3, -135, 6, -133); ctx.bezierCurveTo(14, -128, 21, -122, 15, -114); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(-13, -116); ctx.bezierCurveTo(-17, -122, -11, -127, -5, -131); ctx.lineTo(-4, -124); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(3, -134); ctx.bezierCurveTo(12, -128, 19, -122, 14.4, -114); ctx.lineTo(4, -114); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a933'; circle(ctx, 0, -140.4, 2.3);
    line(ctx, 0, -142, 0, -151, 1.6, '#d9a933'); line(ctx, -3.6, -147.4, 3.6, -147.4, 1.6, '#d9a933');
    if (ring > 0.06) {
      ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        const rad = 22 + k * 8 + (1 - ring) * 3;
        for (const [a0, a1] of [[-0.5, 0.5], [PI - 0.5, PI + 0.5]]) {
          ctx.strokeStyle = 'rgba(50,50,60,' + (0.3 * ring).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -97, rad, a0, a1); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * ring).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -97, rad, a0, a1); ctx.stroke();
        }
      }
    }
    for (let i = 0; i < 12; i++) {
      const fx = -52 + hash(i * 1.7) * 104, fh = 3 + hash(i * 2.9) * 4;
      line(ctx, fx, 0, fx + (hash(i) - 0.5) * 2, -fh, 1.2, '#4f8a35');
      ctx.fillStyle = ['#f4d03f', '#f5f0f0', '#e57fa5', '#8e7cc3'][i % 4]; circle(ctx, fx + (hash(i) - 0.5) * 2, -fh - 0.8, 1.5);
    }
    ctx.restore();
  }
  API.chapel = chapel;
})();
