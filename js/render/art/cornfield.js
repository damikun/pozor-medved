(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, exp = Math.exp;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(sin(n * 127.1 + 311.7) * 43758.5453);
  const R = 50, PUSH = 26, WOB = 15;

  const PAL = [
    { far: ['#93b978', '#86ad6b'], stem: '#6ba443', leaf: ['#62a23c', '#7cb84d', '#4f8f33'], front: ['#4d8b2f', '#62a03a', '#3e7a28'], fstem: '#57903a', tassel: '#c4cc7a', husk: '#8bbd57', silk: '#c9a25a', soil: '#6f5337', furrow: '#5c432c' },
    { far: ['#86ad69', '#79a25e'], stem: '#5f9236', leaf: ['#4f8f34', '#67a73f', '#3f7a2c'], front: ['#3f7c2a', '#539334', '#336a22'], fstem: '#4d8130', tassel: '#dcc47c', husk: '#80ae4b', silk: '#9c6a34', soil: '#6b4f33', furrow: '#573f29' },
    { far: ['#c2ad74', '#b39e66'], stem: '#a98d50', leaf: ['#c9ad62', '#b5974f', '#d8c07b'], front: ['#a8893f', '#bc9d54', '#94793a'], fstem: '#9a7f45', tassel: '#8a6a3a', husk: '#d4bb78', silk: '#6b4a2a', soil: '#6e5236', furrow: '#5a422b' },
  ];
  const KERNEL = '#f3c443', KERNEL_DARK = '#d29f22';

  const cache = new WeakMap();

  function row(F, from, to, gap, hMin, hMax, seed, leaves, size, cobs, skip) {
    const list = [];
    for (let x = from, i = 0; x < to; i++) {
      const s = seed + i * 1.37, at = x + (hash(s + 4) - 0.5) * gap * 0.4, edge = Math.min(at - F.from, F.to - at);
      x += gap * (0.8 + hash(s + 1) * 0.4);
      if (skip && skip(at)) continue;
      const h = (hMin + (hMax - hMin) * hash(s)) * (0.84 + 0.16 * clamp(edge / 50, 0, 1));
      const n = leaves + Math.floor(hash(s + 2) * 2), lv = [];
      for (let j = 0; j < n; j++) {
        lv.push({
          t: 0.14 + (0.7 * (j + hash(s + j * 3.1) * 0.6)) / n, side: (j + i) % 2 ? 1 : -1,
          len: (24 + hash(s + j * 5.7) * 20) * size, rise: 0.3 + hash(s + j * 7.3) * 0.4, c: Math.floor(hash(s + j * 9.1) * 3), ph: hash(s + j) * TAU,
        });
      }
      const side = edge < 30 ? (at - F.from < F.to - at ? -1 : 1) : 0;
      list.push({
        x: at, h, s, lv, w: 2.4 * size, lean: side * 5 + (hash(s + 6) - 0.5) * 4,
        cob: cobs && hash(s + 8) < 0.6 ? { t: 0.4 + hash(s + 9) * 0.12, side: hash(s + 10) < 0.5 ? -1 : 1 } : null,
      });
    }
    return list;
  }

  function build(F) {
    let A = cache.get(F);
    if (A) return A;
    A = {
      far: row(F, F.from + 4, F.to - 4, 9, 116, 140, 11.3, 3, 0.8, false),
      back: row(F, F.from + 8, F.to - 6, 15, 150, 182, 23.7, 5, 1, true),
      front: row(F, F.from + 14, F.to - 10, 32, 126, 160, 41.9, 5, 1.15, true),
      cobs: new Map(),
    };
    cache.set(F, A);
    return A;
  }

  function pushers(g, F) {
    const b = g.bear, list = [];
    if (!b.climbing && b.y > GY - 50 && b.x > F.from - R && b.x < F.to + R) list.push({ x: b.x, dir: b.dir || 1, k: b.crouch ? 0.65 : 1 });
    for (const s of g.shooters) if (s.kind !== 'posed' && s.x > F.from - R && s.x < F.to + R) list.push({ x: s.x, dir: s.dir || 1, k: 0.7 });
    for (const p of g.people) if (p.x > F.from - R && p.x < F.to + R) list.push({ x: p.x, dir: p.dir || 1, k: 0.7 });
    const o = g.boar;
    if (o && o.state !== 'gone' && o.x > F.from - R && o.x < F.to + R) list.push({ x: o.x, dir: o.dir || 1, k: o.state === 'flee' ? 0.9 : o.state === 'root' ? 0.25 : 0.45 });
    return list;
  }

  function bend(st, g, F, P, c) {
    const time = g.time;
    let dx = (3 * sin(time * 1.25 + st.x * 0.021) + 2 * sin(time * 0.63 - st.x * 0.013 + st.s)) * st.h / 170 + st.lean, stir = 0;
    for (const p of P) {
      const u = (st.x - p.x) / R;
      if (u > -1 && u < 1) { const f = (1 - u * u) * (1 - u * u); dx += p.dir * p.k * PUSH * f; stir = Math.max(stir, f * p.k); }
    }
    if (c) {
      const i = Math.floor((st.x - F.from) / ZS.sim.corn.SLOT);
      if (i >= 0 && i < c.n) {
        const age = time - c.hit[i];
        if (age > 0 && age < 3) { const e = exp(-age * 2.4); dx += c.k[i] * c.dir[i] * WOB * e * sin(age * 10); stir = Math.max(stir, c.k[i] * e); }
      }
    }
    st.dx = dx; st.stir = stir;
    return dx;
  }

  function at(st, t) {
    const u = 1 - t, cx = st.x + st.dx * 0.15, tx = st.x + st.dx, ty = GY - st.h + (st.dx * st.dx * 0.25) / st.h;
    return [u * u * st.x + 2 * u * t * cx + t * t * tx, u * u * GY + 2 * u * t * (GY - st.h * 0.55) + t * t * ty];
  }

  function stems(ctx, list, col, width) {
    ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const st of list) {
      const top = at(st, 1);
      ctx.moveTo(st.x, GY); ctx.quadraticCurveTo(st.x + st.dx * 0.15, GY - st.h * 0.55, top[0], top[1]);
    }
    ctx.stroke();
  }

  function leaves(ctx, list, cols, time) {
    for (let c = 0; c < cols.length; c++) {
      ctx.fillStyle = cols[c];
      ctx.beginPath();
      for (const st of list) {
        for (const l of st.lv) {
          if (l.c !== c) continue;
          const p = at(st, l.t), L = l.len, s = l.side, w = st.w;
          const fl = st.stir ? st.stir * 5 * sin(time * 19 + l.ph) : 0;
          const cx = p[0] + s * L * 0.45 + st.dx * l.t * 0.1, cy = p[1] - L * l.rise;
          const tx = p[0] + s * L + st.dx * l.t * 0.3, ty = p[1] - L * l.rise * 0.3 + L * 0.2 + 1.2 * sin(time * 1.7 + l.ph) + fl;
          ctx.moveTo(p[0], p[1] - w);
          ctx.quadraticCurveTo(cx, cy - w, tx, ty);
          ctx.quadraticCurveTo(cx, cy + w * 1.7, p[0], p[1] + w);
          ctx.closePath();
        }
      }
      ctx.fill();
    }
  }

  function tassels(ctx, list, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const st of list) {
      const [x, y] = at(st, 1), d = st.dx * 0.06;
      ctx.moveTo(x, y + 2); ctx.lineTo(x + d * 2, y - 13);
      for (let j = 0; j < 4; j++) {
        const s = j % 2 ? 1 : -1, r = 6 + j * 1.6;
        ctx.moveTo(x, y - 2 - j * 2); ctx.quadraticCurveTo(x + s * r * 0.7 + d, y - 8 - j * 2, x + s * r + d * 2, y - 2 - j * 1.5);
      }
    }
    ctx.stroke();
  }

  function husks(ctx, list, pal) {
    ctx.fillStyle = pal.husk;
    ctx.beginPath();
    for (const st of list) {
      if (!st.cob) continue;
      const [x, y] = at(st, st.cob.t), s = st.cob.side, cx = x + s * 4.5, cy = y - 7, rot = s * 0.42;
      ctx.moveTo(cx + 3.6 * cos(rot), cy + 3.6 * sin(rot));
      ctx.ellipse(cx, cy, 3.6, 9.5, rot, 0, TAU);
    }
    ctx.fill();
    ctx.strokeStyle = pal.silk; ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const st of list) {
      if (!st.cob) continue;
      const [x, y] = at(st, st.cob.t), s = st.cob.side, tx = x + s * 4.5 + s * 9.5 * sin(0.42), ty = y - 7 - 9.5 * cos(0.42);
      ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + s * 3, ty - 3, tx + s * 5, ty + 1);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + s * 1.5, ty - 4);
    }
    ctx.stroke();
  }

  function soil(ctx, F, A, pal) {
    const a = F.from - 16, b = F.to + 16;
    ctx.fillStyle = pal.soil;
    ctx.beginPath();
    ctx.moveTo(a, GY + 1); ctx.quadraticCurveTo(a + 6, GY - 3, a + 22, GY - 3);
    ctx.lineTo(b - 22, GY - 3); ctx.quadraticCurveTo(b - 6, GY - 3, b, GY + 1);
    ctx.lineTo(b - 8, GY + 7); ctx.lineTo(a + 8, GY + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.furrow;
    ctx.beginPath();
    for (const st of A.back) { ctx.moveTo(st.x + 7, GY - 1); ctx.ellipse(st.x, GY - 1, 7, 2.6, 0, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,200,0.14)';
    ctx.beginPath();
    for (const st of A.back) { ctx.moveTo(st.x + 4, GY - 2.4); ctx.ellipse(st.x - 1, GY - 2.4, 4, 1, 0, 0, TAU); }
    ctx.fill();
  }

  function cob(ctx, x, y, s, time, stir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s * 0.5 + stir * 0.12 * sin(time * 17));
    ctx.fillStyle = '#6e9e3e';
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(-11, 2, -6, -13); ctx.quadraticCurveTo(-4, -2, 0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#86b452';
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(11, 3, 7, -12); ctx.quadraticCurveTo(4, -1, 0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = KERNEL; ctx.beginPath(); ctx.ellipse(0, -3, 5, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = KERNEL_DARK;
    ctx.beginPath();
    for (let r = 0; r < 7; r++) for (let c = -1; c <= 1; c++) {
      const ky = -12 + r * 3.2, kx = c * 2.6 + (r % 2) * 0.8, lim = 5 * Math.sqrt(Math.max(0, 1 - ((ky + 3) / 12) ** 2));
      if (abs(kx) < lim - 0.8) { ctx.moveTo(kx + 0.8, ky); ctx.arc(kx, ky, 0.8, 0, TAU); }
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-2, -5, 1.4, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5e8f34';
    ctx.beginPath(); ctx.moveTo(-5, 6); ctx.quadraticCurveTo(-1, -1, 0, 12); ctx.quadraticCurveTo(1, -1, 5, 6); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(-3, -19, -5, -17); ctx.moveTo(0, -15); ctx.quadraticCurveTo(2, -20, 4, -19); ctx.stroke();
    ctx.restore();
  }

  function edible(ctx, F, A, g) {
    for (const it of g.level.items) {
      if (it.type !== 'cob' || it.eaten || it.x < F.from || it.x > F.to) continue;
      let st = A.cobs.get(it);
      if (!st) {
        st = A.back.reduce((m, q) => (abs(q.x - it.x) < abs(m.x - it.x) ? q : m), A.back[0]);
        A.cobs.set(it, st);
      }
      const p = at(st, 0.4), s = it.x >= st.x ? 1 : -1;
      cob(ctx, p[0] + s * 7, p[1] + 2, s, g.time, st.stir || 0);
    }
  }

  function view(ctx, list, pad) {
    const m = ctx.getTransform ? ctx.getTransform() : null;
    if (!m || !m.a) return list;
    const a = -m.e / m.a - pad, b = (ctx.canvas.width - m.e) / m.a + pad;
    return list.filter((st) => st.x > a && st.x < b);
  }

  function cornBack(ctx, F, g) {
    const A = build(F), pal = PAL[clamp(g.seasonIdx || 0, 0, 2)], P = pushers(g, F), c = g.corn;
    soil(ctx, F, A, pal);
    const far = view(ctx, A.far, 60), back = view(ctx, A.back, 60);
    for (const st of far) { st.dx = (2.4 * sin(g.time * 1.25 + st.x * 0.021 + 0.8) + 1.5 * sin(g.time * 0.63 - st.x * 0.013)) * 0.8 + st.lean * 0.5; st.stir = 0; }
    stems(ctx, far, pal.far[1], 1.8);
    leaves(ctx, far, pal.far, g.time);
    for (const st of A.back) bend(st, g, F, P, c);
    stems(ctx, back, pal.stem, 2.6);
    leaves(ctx, back, pal.leaf, g.time);
    husks(ctx, back, pal);
    if (g.seasonIdx > 0) tassels(ctx, back, pal.tassel);
    edible(ctx, F, A, g);
  }

  function cornFront(ctx, F, g) {
    const A = build(F), pal = PAL[clamp(g.seasonIdx || 0, 0, 2)], P = pushers(g, F), c = g.corn;
    const front = view(ctx, A.front, 70);
    if (!front.length) return;
    for (const st of front) bend(st, g, F, P, c);
    stems(ctx, front, pal.fstem, 3.2);
    leaves(ctx, front, pal.front, g.time);
    husks(ctx, front, pal);
    if (g.seasonIdx > 0) tassels(ctx, front, pal.tassel);
  }

  ZS.scenery.cornBack = cornBack;
  ZS.scenery.cornFront = cornFront;
})();
