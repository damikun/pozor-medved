// New scenery for the expanded level: shepherd's hut, electric sheep pen, sheep, dog, river with stepping stones and
// trout, mountain hotel, ski lift, waste container, haystack and wayside chapel. Side view in the style of draw.js:
// flat fills with subtle shading, no outlines, canvas paths only. Everything hangs on ZS.scenery.
//
// Call every function with the canvas already translated to world coordinates (as draw.js does). Each one saves and
// restores the context and draws standing on ZS.CFG.GROUND unless noted. `time` is game time in seconds and drives all
// animation (never the wall clock), smoothly. Long things (pen, river, ski cable) skip what is off screen by looking at the
// canvas transform; the rest should be culled by the caller, as draw.js does with vis().
//
//   ZS.scenery.koliba(ctx, x, time)          shepherd's hut, 202 x 137 (+ smoke up to ~215), x = centre
//   ZS.scenery.pen(ctx, x1, x2, time)        electric fence in the background, 62 tall, from x1 to x2 (+24 to the left of x1 for the energizer)
//   ZS.scenery.sheep(ctx, s, time)           s = { x, dir, state: 'graze' | 'walk' | 'flee', id }, ~60 x 42 with the head, x = centre of the body
//   ZS.scenery.dog(ctx, d, time)             d = { x, dir, state: 'idle' | 'walk' | 'run' | 'bark', id }, 71 long rump to nose, 64 tall, x = centre of the body
//   ZS.scenery.river(ctx, x1, x2, time)      channel from x1 to x2 (banks reach 16 further on both sides), water surface at GROUND - 6 down to the bottom
//   ZS.scenery.stone(ctx, x, w, time)        stepping stone, top at GROUND - 10, w wide, x = centre
//   ZS.scenery.fish(ctx, f, time)            f = { x, y, dir, wiggle, id? }, trout 26 long, (x, y) = centre of the body
//   ZS.scenery.hotel(ctx, x, time)           mountain hotel, 464 x 232, x = centre
//   ZS.scenery.skiLift(ctx, x, time)         pylon with its head 214 above the ground, cable rising to the right, chairs running
//   ZS.scenery.container(ctx, x, locked)     waste container, 96 x 70, x = centre
//   ZS.scenery.haystack(ctx, x)              kopa sena on a pole, 72 x 111, x = centre
//   ZS.scenery.chapel(ctx, x, time)          wayside chapel with a bell tower, 93 x 151, x = centre
//   ZS.scenery.SIZE                          the same numbers as data (w, h, left and right reach from the anchor)
//
// Animals: the legs follow the movement of x (feet do not slide), so move s.x / d.x a little every frame as the game does and
// keep one object (or one id) per animal: the private state (gait phase, head height, blends between states) hangs on it.
// The head and tail of the dog swing with the state, a barking dog throws its head up three times, rests, and starts again.
// Fish: keep one object (or id) per fish: it turns to follow the path of (x, y) from frame to frame. Instead you can give
// f.angle, or f.vx and f.vy, which win. wiggle is a phase offset in radians so that fish do not beat their tails in step.
// Draw order: river, then stones and fish, then the bear and people. The pen is meant to be drawn before the sheep.
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
  // Stable pseudo-random numbers in [0, 1): the same input always gives the same picture.
  const hash = (n) => frac(sin(n * 127.1 + 311.7) * 43758.5453);
  const hash2 = (a, b) => hash(a * 57.31 + b * 13.97 + 0.17);

  // --- Drawing primitives (fill with the current fillStyle, like draw.js) -------------------------------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  // A polygon from a flat list [x0, y0, x1, y1, ...].
  function poly(ctx, p) {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  // A smooth closed shape through the points (Catmull-Rom as Bezier curves), flat list like poly.
  function blob(ctx, p) {
    const n = p.length / 2, g = (i, k) => p[((i + n) % n) * 2 + k];
    ctx.beginPath(); ctx.moveTo(g(0, 0), g(0, 1));
    for (let i = 0; i < n; i++) {
      const x0 = g(i - 1, 0), y0 = g(i - 1, 1), x1 = g(i, 0), y1 = g(i, 1), x2 = g(i + 1, 0), y2 = g(i + 1, 1), x3 = g(i + 2, 0), y3 = g(i + 2, 1);
      ctx.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
    }
    ctx.closePath(); ctx.fill();
  }
  // A tapered limb with round ends.
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
  function txt(ctx, s, x, y, size, col, weight, spacing) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  // Darker (k < 1) or lighter (k > 1) version of a #rrggbb colour, memoised.
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
  // The world x range the canvas shows right now, so long things (river, fence, ski cable) can skip what is off screen.
  function viewRange(ctx, pad) {
    const m = ctx.getTransform ? ctx.getTransform() : null;
    if (!m || !m.a) return [-1e9, 1e9];
    return [-m.e / m.a - pad, (ctx.canvas.width - m.e) / m.a + pad];
  }

  // --- Private animation state of sheep, dogs and fish ---------------------------------------------------------
  // Keyed by o.id when it is given (a Map, swept now and then), otherwise by the object itself (a WeakMap).
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

  // A gentle plume of smoke rising from (x, y): puffs that grow, fade, drift right and curl a little.
  function smoke(ctx, x, y, time, seed, k) {
    for (let i = 0; i < 7; i++) {
      const u = frac(time * 0.15 + i / 7);
      const a = 0.5 * sstep(0, 0.12, u) * (1 - sstep(0.5, 1, u));
      ctx.fillStyle = 'rgba(232,232,228,' + a.toFixed(3) + ')';
      circle(ctx, x + (sin(u * 6.6 + seed) * 6 + u * 24) * k, y - u * 78 * k, (3.4 + u * 9.5) * k);
    }
  }

  // ============================================================================================================
  // Koliba: a shepherd's log hut with a steep shingle roof. 200 wide, 135 tall (chimney), centred on x.
  // ============================================================================================================
  const LOG = ['#4a3122', '#553826', '#472e1f', '#5b3f2c', '#4e3424'];
  let roofGeo = null;
  function hutRoof() {   // the shingles never change, so they are built once as Path2D batches (one per tone)
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

  function koliba(ctx, x, time) {
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(28,22,10,0.15)'; ell(ctx, 0, 1, 104, 4.5);
    // Stone footing and six courses of logs; the round log ends stick out at the corners.
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
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-80, -70, 160, 8);   // shadow under the eaves
    // Door, and a window lit by the stove with a flickering glow.
    ctx.fillStyle = '#2e1d12'; ctx.fillRect(-17, -64, 32, 64);
    ctx.fillStyle = '#6f4a2c'; ctx.fillRect(-14, -61, 26, 61);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 1; i < 4; i++) ctx.fillRect(-14 + i * 6.5, -61, 1.2, 61);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-14, -52, 26, 2.4); ctx.fillRect(-14, -14, 26, 2.4);
    ctx.fillStyle = '#c9a64a'; circle(ctx, 7, -30, 1.9);
    const fl = 0.86 + 0.14 * sin(time * 5.3) * sin(time * 2.1 + 1);
    ctx.fillStyle = '#5a3b27'; ctx.fillRect(-74, -61, 7, 29); ctx.fillRect(-35, -61, 7, 29);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 5; i++) { ctx.fillRect(-74, -58 + i * 5.6, 7, 1); ctx.fillRect(-35, -58 + i * 5.6, 7, 1); }
    ctx.fillStyle = '#2e1d12'; ctx.fillRect(-67, -62, 32, 31);
    ctx.fillStyle = '#e0982f'; ctx.fillRect(-64.5, -59.5, 27, 26);
    ctx.fillStyle = 'rgba(255,240,170,' + (0.8 * fl).toFixed(3) + ')'; ctx.fillRect(-64.5, -59.5, 27, 26);
    ctx.fillStyle = '#2e1d12'; ctx.fillRect(-52, -59.5, 1.8, 26); ctx.fillRect(-64.5, -47.6, 27, 1.8);
    ctx.fillStyle = '#7a5534'; ctx.fillRect(-69, -31, 36, 2.5);
    // A bench in front of the wall.
    ctx.fillStyle = '#8a6339'; ctx.fillRect(-78, -17, 52, 4); ctx.fillRect(-74, -13, 4, 13); ctx.fillRect(-34, -13, 4, 13);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-78, -17, 52, 1.2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-77, -13, 50, 1.6);
    // Firewood stacked against the wall.
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5 - r; c++) {
        const lx = 50 + c * 9.2 + r * 4.6, ly = -4.7 - r * 8.4;
        ctx.fillStyle = r % 2 ? '#a98258' : '#b88f62'; circle(ctx, lx, ly, 4.6);
        ctx.fillStyle = '#7d5a39'; circle(ctx, lx, ly, 2.6);
        ctx.fillStyle = '#a98258'; circle(ctx, lx - 0.3, ly - 0.2, 1.1);
      }
    }
    // Roof: a steep triangle of shingles in a dark frame, crossed boards at the ridge and a stone chimney.
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
    ctx.fillStyle = '#7b756d'; poly(ctx, [45, -131, 59, -131, 59, -84, 45, -92]);
    ctx.fillStyle = '#625d56'; for (let i = 0; i < 5; i++) ctx.fillRect(45, -125 + i * 10, 14, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(53, -131, 6, 46);
    ctx.fillStyle = '#58534d'; ctx.fillRect(43, -135, 18, 5);
    // A hanging sign that sways a little, and smoke from the chimney.
    ctx.save();
    ctx.translate(54, -67); ctx.rotate(0.035 * sin(time * 1.15));
    line(ctx, -16, 0, -16, 11, 1.4, '#2b2b2b'); line(ctx, 16, 0, 16, 11, 1.4, '#2b2b2b');
    ctx.fillStyle = '#b98c55'; rr(ctx, -24, 10, 48, 18, 2.5);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-24, 24, 48, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-22, 11.5, 44, 1.6);
    txt(ctx, 'SALAŠ', 0, 19.5, 12.5, '#35200f', 800, 0.8);
    ctx.restore();
    smoke(ctx, 52, -137, time, 1.7, 1);
    ctx.restore();
  }

  // ============================================================================================================
  // Pen: an electric fence (ohradník) from x1 to x2, 62 tall. The energizer sticks out 24 to the left of x1.
  // ============================================================================================================
  const WIRE_H = [17, 33, 49];

  function pen(ctx, x1, x2, time) {
    if (x2 < x1) { const t = x1; x1 = x2; x2 = t; }
    x2 = Math.max(x2, x1 + 24);
    const vr = viewRange(ctx, 60);
    if (x2 < vr[0] || x1 - 30 > vr[1]) return;
    const n = Math.max(1, Math.round((x2 - x1) / 70)), sp = (x2 - x1) / n;
    const i0 = Math.max(0, Math.floor((vr[0] - x1) / sp)), i1 = Math.min(n, Math.ceil((vr[1] - x1) / sp));
    const beat = frac(time / 1.25), pulse = 1 - sstep(0, 0.16, beat);   // the energizer ticks every 1.25 s
    ctx.save(); ctx.translate(0, GY);
    // Posts: wooden corner posts with a brace, thin white line posts between them, a yellow insulator for each wire.
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
    // Wires: three shiny strands with a slight sag, a bluish flash on every tick and a glint travelling along each.
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
    // Yellow warning signs with a lightning bolt, hanging from the top wire and swaying a little.
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
    // The energizer on the first post with a blinking LED, and its battery on the ground.
    if (x1 - 30 < vr[1] && x1 + 4 > vr[0]) {
      const led = 1 - sstep(0.1, 0.26, beat);
      line(ctx, x1 - 10, -10, x1 - 10, -31, 1.4, '#222'); line(ctx, x1 - 3, -38, x1, -49, 1.2, '#222');
      ctx.fillStyle = '#30363b'; rr(ctx, x1 - 24, -10, 17, 10, 1.6);
      ctx.fillStyle = '#f1c232'; ctx.fillRect(x1 - 24, -6.4, 17, 2.6);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x1 - 21, -11.8, 3, 1.8); ctx.fillStyle = '#222'; ctx.fillRect(x1 - 13, -11.8, 3, 1.8);
      ctx.fillStyle = '#3d474d'; rr(ctx, x1 - 20, -45.5, 18, 15, 2.2);
      ctx.fillStyle = '#566168'; rr(ctx, x1 - 20, -45.5, 18, 5, 2.2);
      ctx.fillStyle = '#f1c232'; ctx.fillRect(x1 - 17, -38, 8, 5.4);
      ctx.fillStyle = '#1d1d1d'; poly(ctx, [x1 - 12.2, -37.4, x1 - 15.2, -34.8, x1 - 13.2, -34.8, x1 - 14.4, -32.8, x1 - 10.6, -36, x1 - 12.6, -36, x1 - 11.4, -37.4]);
      ctx.fillStyle = 'rgba(255,70,60,' + (0.4 * led).toFixed(3) + ')'; circle(ctx, x1 - 6.2, -42.6, 5);
      ctx.fillStyle = led > 0.5 ? '#ff5a4d' : '#5a1a15'; circle(ctx, x1 - 6.2, -42.6, 1.6);
    }
    ctx.restore();
  }

  API.koliba = koliba; API.pen = pen;

  // ============================================================================================================
  // Walking animals. The leg phase follows the distance moved, so planted feet never slide on the ground.
  // ============================================================================================================
  const newAnimal = (seed) => ({ t: -1, x: 0, phase: 0, amt: 0, runK: 0, gait: 0, v: 0, seed, seen: 0, head: 0.5, bark: 0 });

  // Moves the gait on to `time`. P: sw / sr = world units per full stride when walking / running, fmax = the most strides per
  // second the legs ever make, vmin = the speed at which the legs move fully, vrun = the speed above which the running gait is
  // used whatever the state says, wantRun and hint come from
  // the state (hint only matters on the first frame, before any movement has been seen), head = where the head wants to be.
  function advance(st, x, dir, time, P) {
    const dt = time - st.t, S = () => lerp(P.sw, P.sr, st.runK);
    if (!(dt >= 0 && dt < 0.3) || abs(x - st.x) > 140) {
      st.runK = st.gait = P.wantRun ? 1 : 0; st.amt = P.hint ? 1 : 0; st.v = P.hint ? P.vmin * 2 : 0;
      st.phase = dir * x / S(); st.head = P.head; st.bark = P.bark || 0;
    } else if (dt > 1e-4) {
      // runK (stride length, duty, lift) follows the speed quickly; gait (which leg follows which) changes slowly, so no foot
      // jumps; both stand still while the animal does not move, so a sudden stop freezes the legs and they settle into the stance.
      const dx = x - st.x, vi = abs(dx) / dt, m = clamp(vi / P.vmin, 0, 1), want = (P.wantRun || st.v > P.vrun) ? 1 : 0;
      const cap = P.fmax * dt;   // the legs never cycle faster than this, so an instant jump of speed does not make them flail
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
  // Where one foot is at gait phase p: planted (sweeping back at the ground speed) while p < duty, then swung forward.
  const FT = { x: 0, y: 0 };
  function footAt(p, duty, half, lift) {
    p = frac(p);
    if (p < duty) { FT.x = half - 2 * half * (p / duty); FT.y = 0; }
    else { const v = (p - duty) / (1 - duty), e = v * v * (3 - 2 * v); FT.x = -half + 2 * half * e; FT.y = lift * sin(PI * Math.pow(v, 0.8)); }
  }
  // Two-bone IK: bend = +1 puts the middle joint on the +x side of the line (a forward knee), -1 behind.
  const IK = { mx: 0, my: 0, ex: 0, ey: 0 };
  function ik(x0, y0, tx, ty, l1, l2, bend) {
    let dx = tx - x0, dy = ty - y0, d = hypot(dx, dy);
    const max = l1 + l2 - 0.05, min = abs(l1 - l2) + 0.3;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { if (d < 0.001) { dx = 0; dy = min; } else { dx *= min / d; dy *= min / d; } d = min; }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), t = atan2(dy, dx) - bend * a;
    IK.mx = x0 + cos(t) * l1; IK.my = y0 + sin(t) * l1; IK.ex = x0 + dx; IK.ey = y0 + dy;
  }

  // ============================================================================================================
  // Sheep: s = { x, dir, state: 'graze' | 'walk' | 'flee', id }. About 50 long, 40 tall, standing on x.
  // ============================================================================================================
  const SH = { wool: '#f3f0e6', hi: '#fcfaf4', shade: '#e0dccf', deep: '#c9c4b6', skin: '#3a2f2a', skin2: '#4d3d36', nose: '#6d544b',
    leg: '#3f3530', far: '#2a2320', hoof: '#171211', ear: '#2f2622', ear2: '#241d1a', earIn: '#8a6a64' };
  // near hind, near fore, far hind, far fore: hip x, front leg?, far side?, phase offset walking / trotting, stance when still
  const SLEG = [[-13, 0, 0, 0, 0.5, -1.5], [13, 1, 0, 0.25, 0, 1.5], [-13, 0, 1, 0.5, 0, -1], [13, 1, 1, 0.75, 0.5, 2]];
  // Head centre and tilt with the nose in the grass (0), carried level while walking (0.5) and alert (1).
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
    // Grazing sheep now and then lift their head to look around, every 8 to 12 seconds.
    const u = frac(time / (8.5 + hash(sd) * 4) + hash(sd + 1)), glance = sstep(0.62, 0.7, u) - sstep(0.8, 0.88, u);
    advance(st, s.x, dir, time, { sw: 21, sr: 42, fmax: 3.3, vmin: 7, vrun: 70, wantRun: mode === 'flee', hint: mode !== 'graze',
      head: mode === 'flee' ? 1 : mode === 'walk' ? 0.5 : 0.03 + 0.8 * glance });
    const amt = st.amt, rk = st.runK, down = 1 - sstep(0.08, 0.35, st.head);
    // Legs: the foot positions come from the gait; the body sinks as the planted feet spread.
    // S is in world units; the sheep is drawn at 0.9 scale, so the sweep of a planted foot is S * duty / 0.9 in its own units.
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
    // Wool: the darker underside first, then the main clumps, then the lighter tops.
    ctx.fillStyle = SH.deep;
    for (const c of [[-15, -21, 7], [-7, -19.5, 7.2], [2, -19, 7.2], [10, -20, 7], [17, -23.5, 6.3]]) circle(ctx, c[0], c[1], c[2]);
    ctx.fillStyle = SH.shade; ell(ctx, 0, -27, 21, 11.5); circle(ctx, -21, -27, 6); circle(ctx, 20, -29, 6.6);
    ctx.fillStyle = SH.wool;
    for (const c of [[-14, -32.5, 8.2], [-6, -35.5, 8.6], [3, -36, 8.6], [12, -33, 8], [-18, -27, 7], [17, -28, 7.2], [-2, -28, 10], [8, -26, 8.5]]) circle(ctx, c[0], c[1], c[2]);
    ctx.fillStyle = SH.hi;
    for (const c of [[-8, -38, 4.4], [2, -39, 4.6], [10, -36.5, 4], [-15, -34, 3.8]]) circle(ctx, c[0], c[1], c[2]);
    ctx.restore();
    // Neck and head: head height blends between grazing, walking and alert.
    const k = clamp(st.head, 0, 1), a = k < 0.5 ? SHEAD[0] : SHEAD[1], b = k < 0.5 ? SHEAD[1] : SHEAD[2], tk = k < 0.5 ? k * 2 : k * 2 - 1;
    let hx = lerp(a[0], b[0], tk), hy = lerp(a[1], b[1], tk), ha = lerp(a[2], b[2], tk);
    hy += nib * 2.8 + sin(TAU * st.phase) * 1.1 * amt; ha += nib * 0.22;
    limb(ctx, 15, -30, hx - 4, hy - 1.5, 14, 9.5, SH.wool);
    ctx.fillStyle = SH.shade; circle(ctx, hx - 5, hy + 2, 4);
    sheepHead(ctx, hx, hy, ha, flick, flick2, chew);
    ctx.restore();
  }
  API.sheep = sheep;

  // ============================================================================================================
  // Dog: d = { x, dir, state: 'idle' | 'walk' | 'run' | 'bark', id }. A slovenský čuvač, 71 long from rump to nose, 64 tall.
  // ============================================================================================================
  const DG = { coat: '#faf8f2', shade: '#e7e3d7', deep: '#d4cfc0', far: '#d9d5c8', ear: '#ebe7db', earIn: '#e9c4b9', nose: '#1d1816', eye: '#2a1a12',
    mouth: '#7a2230', tongue: '#e8707e' };
  // near hind, near fore, far hind, far fore: hip x, front leg?, far side?, phase offset walking / galloping, stance still / barking
  const DLEG = [[-17, 0, 0, 0, 0.07, -1, -5], [14, 1, 0, 0.25, 0.47, 2, 6], [-17, 0, 1, 0.5, 0, 1, -10], [14, 1, 1, 0.75, 0.39, -2, 1]];
  const DHEAD = { idle: [26, -51, 0.02], walk: [28, -48, 0.1], run: [31, -44, 0.12] };
  const DBODY = [-27, -37, -21, -44.5, -8, -45.5, 6, -46, 18, -43.5, 25, -34, 24, -25.5, 14, -21.5, 2, -23, -9, -23, -19, -24.5, -28, -28.5];
  const DLIT = DBODY.map((v, i) => (i % 2 && v > -35 ? v - 2.6 : v));
  const BK = { p: 0, w: 0 };
  // Three barks, a pause, three barks...: p is the bark's strength (0..1), w how far into the bark we are.
  function barkAt(time, sd) {
    const u = frac(time / 1.9 + hash(sd + 7)) * 1.9, k = Math.floor(u / 0.38), w = (u - k * 0.38) / 0.2;
    BK.p = k < 3 && w < 1 ? sin(PI * w) : 0; BK.w = w;
  }

  function dogHead(ctx, hx, hy, ang, open, ears, blink, tongue, pp, pw) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.scale(1.12, 1.12);
    ctx.save(); ctx.translate(-3, -6.6); ctx.rotate(-0.1 - ears); ctx.fillStyle = DG.far; poly(ctx, [-4.4, 1.8, 4.2, 1, 6.6, -5.6, 3.4, -9.8, -1.4, -7]); ctx.restore();
    ctx.fillStyle = DG.shade; poly(ctx, [-6, 4.6, -11.4, 8, -5, 9.4]); poly(ctx, [-3, 6, -7.6, 10.4, -0.4, 9]);   // cheek fluff
    ctx.fillStyle = DG.coat; ell(ctx, 0, 0, 9.6, 8.4);
    blob(ctx, [3, -5.8, 10, -5, 17.4, -2.9, 20.2, 0.6, 17.6, 4.2, 7, 5.8]);
    ctx.fillStyle = DG.shade; ell(ctx, 3.4, 7.2, 5, 1.6, 0.1);
    if (open > 0.02) {                                                               // open mouth: dark inside, tongue, lower jaw
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
    if (pp > 0.05) {   // "haf!": three short strokes flying out from the mouth
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

  function dog(ctx, d, time) {
    const st = stateOf('dog', d, time, newAnimal), sd = st.seed;
    const mode = d.state === 'walk' || d.state === 'run' || d.state === 'bark' ? d.state : 'idle', dir = d.dir < 0 ? -1 : 1;
    advance(st, d.x, dir, time, { sw: 34, sr: 96, fmax: 3.4, vmin: 9, vrun: 130, wantRun: mode === 'run', hint: mode === 'walk' || mode === 'run', head: 0, bark: mode === 'bark' ? 1 : 0 });
    const amt = st.amt, rk = st.runK, bk = st.bark, brace = bk * (1 - amt);
    barkAt(time, sd); const pulse = BK.p * bk, bw = BK.w;
    // S is in world units and the dog is drawn at 0.9 scale, so a planted foot sweeps S * duty / 0.9 in the dog's own units.
    const S = lerp(34, 96, rk), duty = lerp(0.62, 0.34, rk), half = S * duty / 1.8, lift = lerp(5.5, 11, rk);
    const LM = [26.5, 27, 27, 27.5], REST = [26.4, 25.2];   // reach of fore / hind legs; hip height of fore / hind legs
    const drop = [0, 0];
    for (let i = 0; i < 4; i++) {
      const l = DLEG[i];
      footAt(st.phase + lerp(l[3], l[4], st.gait), duty, half, lift);
      fx4[i] = lerp(lerp(l[5], l[6], bk), FT.x + (l[1] ? 1.5 + rk * 4 : -1 + rk * 3), amt); fy4[i] = lerp(0, FT.y, amt);
      const lm = l[1] ? LM[1] : LM[2];
      drop[l[1]] = Math.max(drop[l[1]], REST[l[1]] - (fy4[i] + sqrt(Math.max(0, lm * lm - fx4[i] * fx4[i]))));
    }
    const dy = Math.max(drop[0], drop[1], 0) + brace * 1.2;
    const breath = 1 + 0.012 * sin(time * 2.2 + sd), pitch = rk * amt * 0.06 * sin(TAU * (st.phase + 0.1)) + brace * 0.04;
    ctx.save(); ctx.translate(d.x, GY); ctx.scale(dir * 0.9, 0.9);
    ctx.fillStyle = 'rgba(25,25,12,0.17)'; ell(ctx, 1, 0.8, 37, 3.6);
    const leg = (i) => {
      const l = DLEG[i], hx = l[0], front = l[1], hy = -(REST[front] - dy), far = l[2];
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
    // Tail: hangs low when still, streams back when running, goes up when barking; it wags all the time.
    const wag = sin(time * 3.4 + sd) * (1 - rk * amt) + sin(time * 11 + sd) * rk * amt * 0.5;
    const tm = [lerp(lerp(-34, -35, amt), -37, rk * amt), lerp(lerp(-36, -40, amt), -42, rk * amt), lerp(lerp(-37, -41, amt), -50, rk * amt), lerp(lerp(-24, -33, amt), -40, rk * amt)];
    const tx0 = -26, ty0 = -40, tmx = lerp(tm[0], -34, brace), tmy = lerp(tm[1], -43, brace), ttx = lerp(tm[2], -38, brace) + wag * 1.6, tty = lerp(tm[3], -49, brace) + wag * 2.2;
    const tcx = 2 * tmx - (tx0 + ttx) / 2, tcy = 2 * tmy - (ty0 + tty) / 2;   // a curve through root, mid and tip
    for (let pass = 0; pass < 2; pass++) {
      const o = pass ? 0 : 1.3, col = pass ? DG.coat : DG.deep, fat = pass ? 0 : 1.4;
      let px = tx0, py = ty0 + o, pw0 = 8.4 + fat;
      for (let i = 1; i <= 6; i++) {
        const t = i / 6, u = 1 - t, qx = u * u * tx0 + 2 * u * t * tcx + t * t * ttx, qy = u * u * ty0 + 2 * u * t * tcy + t * t * tty + o, w1 = lerp(8.4, 5.2, t) + 2.2 * sin(PI * t) + fat;
        limb(ctx, px, py, qx, qy, pw0, w1, col); px = qx; py = qy; pw0 = w1;
      }
    }
    // Neck and head. The head sits higher when still, lower and stretched when running and jerks up with every bark.
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

  // ============================================================================================================
  // River: a channel from x1 to x2 across the ground. The water surface is at GROUND - 6 and the water reaches down
  // past the bottom of the view; the banks slope away on both sides (they reach 16 beyond x1 and x2). Draw it before
  // the stones, the fish and the bear. Ripples and flow lines drift from left to right.
  // ============================================================================================================
  const WATER = GY - 6;
  const bankDepth = (d) => 0.0085 * d * d + 0.00006 * d * d * d;   // how far the bank is below the ground, d units into the channel
  function wave(x, t) { return 0.8 * sin(x * 0.045 - t * 1.5) + 0.5 * sin(x * 0.11 - t * 2.3 + 1); }

  function river(ctx, x1, x2, time) {
    if (x2 < x1) { const t = x1; x1 = x2; x2 = t; }
    const vr = viewRange(ctx, 40), a = x1 - 16, b = x2 + 16;
    if (b < vr[0] || a > vr[1]) return;
    const xs = Math.max(a, Math.floor(vr[0] / 8) * 8), xe = Math.min(b, vr[1] + 8), BOT = GY + 2000;
    const edge = (x) => Math.min(sstep(a, a + 22, x), sstep(b, b - 22, x));
    const surf = (x) => { const e = edge(x); return lerp(GY - 1, WATER + wave(x, time), e); };
    ctx.save();
    // The water body, with a bulge where it meets the banks, and a lighter shallow layer on top.
    const g = ctx.createLinearGradient(0, WATER, 0, WATER + 280);
    g.addColorStop(0, '#8dd0e0'); g.addColorStop(0.07, '#62b5d0'); g.addColorStop(0.28, '#3b8db1'); g.addColorStop(0.7, '#245f82'); g.addColorStop(1, '#1a4562');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(xs, BOT); ctx.lineTo(xs, surf(xs));
    for (let x = xs + 8; x < xe; x += 8) ctx.lineTo(x, surf(x));
    ctx.lineTo(xe, surf(xe)); ctx.lineTo(xe, BOT); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(xs, WATER - 4, xe - xs, 700); ctx.clip();
    // Flow lines: seven rows of dashes sliding right, quicker near the surface.
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
    // Ripple rings that open on the surface and float downstream.
    for (let i = 0, n = Math.ceil((x2 - x1) / 70); i < n; i++) {
      const c = time / 3.4 + hash(i * 1.7), k = Math.floor(c), age = c - k;
      const rx = x1 + 20 + hash2(i, k) * (x2 - x1 - 40) + age * 16, ry = WATER + 6 + hash2(k, i) * 26;
      if (rx < xs - 20 || rx > xe + 20) continue;
      ctx.strokeStyle = 'rgba(240,252,255,' + (0.5 * sin(PI * age) * (1 - age)).toFixed(3) + ')'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(rx, ry, 4 + age * 14, 0.9 + age * 2.4, 0, 0, TAU); ctx.stroke();
    }
    // The darker band of the far bank along the top, and a soft shade below the surface.
    const fb = ctx.createLinearGradient(0, WATER, 0, WATER + 17);
    fb.addColorStop(0, 'rgba(10,52,64,0.62)'); fb.addColorStop(0.55, 'rgba(10,52,64,0.4)'); fb.addColorStop(1, 'rgba(10,52,64,0)');
    ctx.fillStyle = fb; ctx.fillRect(xs, WATER, xe - xs, 17);
    ctx.fillStyle = 'rgba(8,44,54,0.3)';
    for (let x = Math.floor(xs / 23) * 23; x < xe; x += 23) { const hh = 3 + hash(x) * 6; ctx.fillRect(x, WATER + 1, 2 + hash(x + 1) * 3, hh); }
    // Glints: small flashes of light that wander downstream along the surface.
    for (let i = 0, n = Math.ceil((x2 - x1) / 38); i < n; i++) {
      const gx = x1 + ((hash(i * 3.3) * (x2 - x1) + time * (6 + hash(i) * 5)) % (x2 - x1)), tw = Math.pow(Math.max(0, sin(time * (1.2 + hash(i + 5)) + i * 2.1)), 8);
      const ga = tw * sstep(0, 18, gx - x1) * sstep(0, 18, x2 - gx);
      if (ga < 0.03 || gx < xs - 6 || gx > xe + 6) continue;
      ctx.fillStyle = 'rgba(255,255,236,' + (0.85 * ga).toFixed(3) + ')'; ell(ctx, gx, WATER + 3 + hash(i + 9) * 22, 4 + tw * 2.4, 0.8);
    }
    ctx.restore();
    // Surface line.
    ctx.strokeStyle = 'rgba(238,251,255,0.8)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(xs, surf(xs));
    for (let x = xs + 8; x < xe; x += 8) ctx.lineTo(x, surf(x));
    ctx.stroke();
    // Banks: earth seen through the water, sloping down; grass along the first stretch of each slope.
    for (const into of [1, -1]) {   // +1: the left bank (the channel lies to its right), -1: the right bank
      const cx = into > 0 ? a : b;
      ctx.beginPath(); ctx.moveTo(cx, GY - 1);
      for (let d = 0; d <= 170; d += 8) ctx.lineTo(cx + into * d, GY + bankDepth(d));
      ctx.lineTo(cx + into * 170, BOT); ctx.lineTo(cx, BOT); ctx.closePath();
      ctx.fillStyle = '#6b4f35'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#86674a'; ctx.fillRect(cx - 200, GY + 24, 400, 14);                 // the same strata as the ground
      ctx.strokeStyle = '#5f9a3e'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx, GY + 1);
      for (let d = 8; d <= 44; d += 8) ctx.lineTo(cx + into * d, GY + bankDepth(d) - 2);
      ctx.stroke();
      const t = ctx.createLinearGradient(0, GY - 2, 0, GY + 220);
      t.addColorStop(0, 'rgba(70,170,205,0.08)'); t.addColorStop(0.3, 'rgba(46,135,175,0.3)'); t.addColorStop(1, 'rgba(26,90,125,0.6)');
      ctx.fillStyle = t; ctx.fillRect(Math.min(cx, cx + into * 180), GY - 2, 180, 2200);
      ctx.restore();
      // Foam along the bank, breathing with the current.
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * sin(time * 1.7 + i * 1.9 + into)).toFixed(3) + ')';
        circle(ctx, cx + into * (4 + i * 5.5) + sin(time + i) * 1.2, GY - 3.5 + i * 1.2 + sin(time * 1.3 + i * 2) * 0.6, 1.9 - i * 0.2);
      }
    }
    ctx.restore();
  }

  // ============================================================================================================
  // Stone: a flat stepping stone in the river. Its top is at GROUND - 10 (4 above the water), w wide; below it dissolves into the water.
  // ============================================================================================================
  function stone(ctx, x, w, time) {
    const top = GY - 10, hw = w / 2, sd = hash(x * 0.37);
    ctx.save();
    // Swirls around the foot of the stone: rings that spread over the surface, a wake trailing downstream.
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
    // The stone: a flat top and rounded corners; below the surface it widens and dissolves into the deep water.
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
    // Under the surface the stone takes on the colour of the water until it matches it exactly.
    const tint = ctx.createLinearGradient(0, WATER, 0, WATER + 280);
    tint.addColorStop(0, 'rgba(141,208,224,0.38)'); tint.addColorStop(0.05, 'rgba(110,190,214,0.75)'); tint.addColorStop(0.1, 'rgba(92,175,203,1)');
    tint.addColorStop(0.28, '#3b8db1'); tint.addColorStop(1, '#1a4562');
    ctx.fillStyle = tint; ctx.fillRect(x - hw - 6, WATER + 0.5, w + 12, 300);
    ctx.fillStyle = 'rgba(30,50,60,0.3)'; ctx.fillRect(x - hw - 2, WATER - 1.2, w + 4, 2.4);
    ctx.restore();
    // Wet highlight on top.
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(ctx, x - hw * 0.32, top + 1.1, hw * 0.3, 0.9); ell(ctx, x + hw * 0.3, top + 1.2, hw * 0.12, 0.7);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.2 * sin(time * 2.4 + sd * 6)).toFixed(3) + ')'; circle(ctx, x - hw * 0.62, top + 2, 0.9);
    ctx.restore();
  }
  API.river = river; API.stone = stone;

  // ============================================================================================================
  // Fish: f = { x, y, dir, wiggle, id? }. A trout about 26 long, centred on (x, y), nose towards +x * dir. It turns to
  // follow its path: the heading comes from f.angle, else f.vx / f.vy, else from the movement since the last frame
  // (so keep one object or one id per fish). wiggle is a phase offset in radians so fish do not beat their tails in step.
  // ============================================================================================================
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
    // The spine: a wave that runs from the head to the tail and grows towards the tail.
    const px = [], py = [], pw = [];
    for (let i = 0; i < FS.length; i++) { px[i] = 13 - FS[i] * 26; py[i] = A * (0.15 + FS[i] * FS[i] * 1.15) * sin(w - 5.2 * FS[i]); pw[i] = FW[i]; }
    const tx = -13, ty = A * 1.3 * sin(w - 5.2);
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(dir, 1); ctx.rotate(st.ang);
    // Droplets shed behind it while it is in the air.
    if (f.y < WATER - 3) {
      for (let i = 0; i < 4; i++) {
        const u = frac(time * 2.2 + i / 4);
        ctx.fillStyle = 'rgba(214,238,252,' + (0.85 * (1 - u)).toFixed(3) + ')'; circle(ctx, -14 - u * 13, sin(i * 2.4) * 2.4 + u * u * 13, 1.2 - u * 0.5);
      }
    }
    // Tail fin first, so the body overlaps its root.
    const n = FS.length - 1, bx = px[n], by = py[n];
    ctx.fillStyle = '#9c7d38'; poly(ctx, [bx + 1, by - 1.2, tx - 0.4, ty - 4.4, tx + 2.6, ty, tx - 0.4, ty + 4.4, bx + 1, by + 1.2]);
    ctx.fillStyle = '#5c4a22'; poly(ctx, [tx - 0.4, ty - 4.4, tx + 0.8, ty - 3.6, tx + 0.2, ty - 2.2]);
    ctx.fillStyle = '#5b5830'; poly(ctx, [px[3], py[3] - pw[3] + 0.4, px[4] + 1, py[4] - pw[4] - 3.4, px[4] - 3.4, py[4] - pw[4] + 0.4]);   // dorsal fin
    ctx.fillStyle = '#c9a85a'; poly(ctx, [px[5], py[5] + pw[5] - 0.4, px[5] - 1.6, py[5] + pw[5] + 2.4, px[5] - 3.6, py[5] + pw[5] - 0.4]);   // belly fins
    poly(ctx, [px[6] + 1, py[6] + pw[6] - 0.4, px[6] - 1, py[6] + pw[6] + 2.2, px[6] - 3, py[6] + pw[6] - 0.4]);
    // Body: golden sides, a dark olive back and a pale belly.
    const edge = (k, lo, hi) => {   // a band of the body between two fractions of its half-width
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
    // Spots: dark ones on the back and sides, red ones with pale halos along the middle.
    ctx.fillStyle = '#2b2a1a';
    for (let i = 2; i <= 6; i++) { circle(ctx, px[i] + 1, py[i] - pw[i] * 0.62, 0.75); circle(ctx, px[i] - 1.6, py[i] - pw[i] * 0.2, 0.6); }
    for (let i = 2; i <= 6; i++) {
      const x = px[i] - 0.6, y = py[i] + pw[i] * (i % 2 ? 0.12 : 0.34);
      ctx.fillStyle = '#e4cf9a'; circle(ctx, x, y, 1.15); ctx.fillStyle = '#c9362a'; circle(ctx, x, y, 0.62);
    }
    // Pectoral fin, gill cover and eye.
    ctx.fillStyle = '#d5b562'; poly(ctx, [px[2] + 0.6, py[2] + 1.2, px[2] - 3.4, py[2] + 4.4, px[2] - 1.2, py[2] + 0.4]);
    ctx.strokeStyle = 'rgba(70,52,20,0.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(px[2] + 0.6, py[2] + 0.1, pw[2] * 0.95, -1.15, 1.15); ctx.stroke();
    ctx.fillStyle = '#efe6c4'; circle(ctx, px[1] + 0.4, py[1] - 0.7, 1.35); ctx.fillStyle = '#14120a'; circle(ctx, px[1] + 0.7, py[1] - 0.7, 0.8);
    ctx.fillStyle = 'rgba(60,40,20,0.6)'; ctx.fillRect(px[0] - 3.6, py[0] + 0.9, 3.4, 0.5);
    ctx.restore();
  }
  API.fish = fish;

  // ============================================================================================================
  // Hotel: a mountain chalet, 464 wide (460 and the roof edges), 232 tall, centred on x. The SUV stands in front of the
  // right wing; the left wing has a chimney and the right one a flag.
  // ============================================================================================================
  let hotelG = null;
  function hotelGeo() {   // the long repetitive parts (planks, stones, balusters, boards, roof joints) are built once
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
  // The underside of the main roof at x (the gable wall reaches up to it).
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
    } else if (mode === 'tv') {   // somebody watching the bear news
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
    // Walls: stucco on the ground floor, planks above, vertical boards in the gable; the wings are lower.
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
    // Windows: ground floor, first floor with shutters, and two arched ones in the gable. Some are lit.
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
    // Flower boxes under the ground floor windows.
    [-115, -70, 70, 115].forEach((cx, i) => flowerBox(ctx, cx, -20, 32, i));
    // Entrance: steps, glass doors, lanterns and two potted spruces.
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
    // Balcony across the whole front: slab, balusters, rail, and the big sign on the middle part.
    ctx.fillStyle = '#7a5534'; ctx.fillRect(-228, -76, 456, 6); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-228, -70, 456, 4);
    ctx.fillStyle = '#5a3d22'; ctx.fill(g.bal); ctx.fillStyle = '#6a4a2b'; ctx.fillRect(-228, -105.5, 456, 3.5);
    ctx.fillStyle = '#5b3f27'; ctx.fillRect(-137, -111, 274, 36);
    ctx.fillStyle = '#2f4a35'; ctx.fillRect(-134, -108, 268, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-134, -108, 268, 3);
    const msg = 'HOTEL MEDVEDÍ RAJ ', stars = '****';
    ctx.font = '800 18px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const tw = ctx.measureText(msg + stars).width, k = Math.min(1, 236 / tw), w1 = ctx.measureText(msg).width * k;
    ctx.font = '800 ' + (18 * k) + 'px system-ui, sans-serif';
    ctx.fillStyle = '#f5edd2'; ctx.fillText(msg, -tw * k / 2, -92.5);
    ctx.fillStyle = '#f0c030'; ctx.fillText(stars, -tw * k / 2 + w1, -90.5);
    for (const s of [-1, 1]) { ctx.fillStyle = '#e0b23c'; circle(ctx, s * 125, -92, 3); for (let i = 0; i < 4; i++) circle(ctx, s * 125 + (i - 1.5) * 2.6, -97 + abs(i - 1.5) * 1.1, 1.1); }
    // Roofs: a thick band along the gable edges, low shed roofs over the wings.
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
    // Chimney with smoke on the left wing, a waving Slovak flag on the right one.
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

  // ============================================================================================================
  // Ski lift: a steel pylon at x whose head is 214 above the ground. The cable passes through it, rises to the right at
  // 0.24 (leaves the screen off the top right) and sinks to the left, fading out about 760 away. Chairs run up the near
  // line and down the far one, looped and endless.
  // ============================================================================================================
  const LIFT_H = 214, LIFT_SLOPE = 0.24, CHAIRS = ['#d2382b', '#e8b92a', '#2f6fb3'], JACKETS = ['#e8590c', '#2f86c8', '#7b5ea7', '#2f8f4e'];

  function liftChair(ctx, k, face, far, time, dxp, a) {
    ctx.save(); ctx.globalAlpha = a;
    const sw = 0.06 * sin(time * 1.15 + k * 2.1) + 0.04 * sin(time * 2.3 + k * 0.7) + 0.05 * exp(-dxp * dxp / 900) * sin(dxp * 0.14);
    ctx.rotate(sw); ctx.scale(face * (far ? 0.88 : 1), far ? 0.88 : 1);
    const body = far ? dk(CHAIRS[k % 3], 0.78) : CHAIRS[k % 3];
    ctx.fillStyle = far ? '#2c3238' : '#1f252b'; rr(ctx, -3.6, -3.4, 7.2, 5.4, 1.4);
    line(ctx, 0, 1, 0, 25, 1.8, far ? '#323941' : '#3a4147');
    if (hash(k * 1.3 + (far ? 5 : 0)) > 0.3) {   // a skier on the chair: jacket, beanie, legs dangling
      const jc = JACKETS[(k + (far ? 1 : 0)) % 4];
      ctx.fillStyle = far ? dk(jc, 0.78) : jc; rr(ctx, -3.4, 8.5, 11, 17, 4);
      limb(ctx, 3, 25.4, 15, 25.4, 5.2, 4.6, '#33415c'); limb(ctx, 15, 25.4, 17.4, 37.4, 4.4, 3.8, '#33415c');
      ctx.fillStyle = '#1d1d1d'; ell(ctx, 18.8, 39, 4.4, 1.5);
      ctx.fillStyle = '#f0c8a0'; circle(ctx, 3.6, 4.2, 4.1);
      ctx.fillStyle = JACKETS[(k + 2) % 4]; ctx.beginPath(); ctx.arc(3.4, 3.8, 4.4, PI, TAU); ctx.fill(); circle(ctx, 3.4, -0.9, 1.3);
    }
    ctx.fillStyle = body; rr(ctx, -6.5, 24, 25, 4.4, 1.6); rr(ctx, -8, 8, 4.8, 20, 1.8);
    ctx.strokeStyle = '#b9bfc5'; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(13, 12.5); ctx.lineTo(17, 26.5); ctx.stroke();
    ctx.restore();
  }

  function skiLift(ctx, x, time) {
    const vr = viewRange(ctx, 90), cy = (wx) => GY - LIFT_H - LIFT_SLOPE * (wx - x), xl = Math.max(vr[0], x - 760), xr = vr[1];
    const fade = (wx) => sstep(x - 760, x - 440, wx), ang = -atan2(LIFT_SLOPE, 1);
    if (xr < x - 760 || xl > x + 3000) return;
    ctx.save();
    const cable = (off, rgb, al, w) => {   // one strand of the cable, fading out towards the far left
      const g = ctx.createLinearGradient(x - 760, 0, x - 440, 0);
      g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(1, 'rgba(' + rgb + ',' + al + ')');
      ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(xl, cy(xl) + off); ctx.lineTo(xr, cy(xr) + off); ctx.stroke();
    };
    const chairs = (far) => {
      const LEN = 2160, face = far ? -1 : 1;
      for (let k = 0; k < 12; k++) {
        const pos = ((k * 180 + (far ? 90 - time * 30 : time * 30)) % LEN + LEN) % LEN, wx = x - 1080 + pos;
        if (wx < vr[0] - 40 || wx > vr[1] + 40) continue;
        const a = fade(wx) * sstep(0, 60, pos) * sstep(0, 60, LEN - pos); if (a < 0.02) continue;
        ctx.save(); ctx.translate(wx, cy(wx) + (far ? -3.5 : 0));
        liftChair(ctx, k, face, far, time, wx - x, a * (far ? 0.92 : 1)); ctx.restore();
      }
    };
    // Far line (chairs coming down), pylon, near line (chairs going up).
    cable(-3.5, '74,82,90', 1, 1.5);
    chairs(true);
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = '#a8a59d'; ctx.fillRect(-25, -10, 50, 10); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-25, -10, 50, 2.4);
    ctx.fillStyle = '#8f8c84'; ctx.fillRect(-19, -15, 38, 5);
    const legX = (h) => lerp(11.8, 5.2, h / 184);   // the pylon is slimmer towards the top
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
    for (const [off, far] of [[-3.5, true], [0, false]]) {   // roller batteries tilted along the cable
      ctx.save(); ctx.translate(0, -LIFT_H + 5 + off); ctx.rotate(ang);
      ctx.fillStyle = far ? '#363d44' : '#2b3138'; rr(ctx, -19, -4, 38, 8, 3.2);
      ctx.fillStyle = far ? '#59626b' : '#7a848d'; for (let i = -1.5; i <= 1.5; i++) circle(ctx, i * 9, -4.4, 3.8);
      ctx.restore();
    }
    ctx.fillStyle = '#e8b92a'; ctx.fillRect(-27, -206, 4, 7); ctx.fillRect(23, -206, 4, 7);   // yellow-black marking on the crossarm
    ctx.restore();
    cable(0, '37,43,49', 1, 1.9); cable(-0.7, '223,230,234', 0.5, 0.6);
    chairs(false);
    ctx.restore();
  }
  API.skiLift = skiLift;

  // ============================================================================================================
  // Container: a big green municipal waste container (veľkoobjemový kontajner), 96 wide with its lid, 70 tall. When
  // locked it has a steel lock bar with a padlock across the lid and a "no bears" sticker.
  // ============================================================================================================
  function container(ctx, x, locked) {
    ctx.save(); ctx.translate(x, GY);
    ctx.fillStyle = 'rgba(25,25,12,0.2)'; ell(ctx, 0, 0.8, 52, 3.4);
    ctx.fillStyle = '#1d2024'; circle(ctx, -35, -5.5, 5.5); circle(ctx, 35, -5.5, 5.5);
    ctx.fillStyle = '#8a9096'; circle(ctx, -35, -5.5, 2); circle(ctx, 35, -5.5, 2);
    ctx.fillStyle = '#2f7d4f'; poly(ctx, [-40, -8, 40, -8, 44, -58, -44, -58]);            // the body is a little wider at the top
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; poly(ctx, [-40, -8, -33, -8, -37, -58, -44, -58]);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; poly(ctx, [30, -8, 40, -8, 44, -58, 33.5, -58]);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let i = 0; i < 4; i++) ctx.fillRect(-33 + i * 20, -56, 1.8, 44);   // pressed ribs
    ctx.fillStyle = '#1f5a38'; ctx.fillRect(-40, -13, 80, 5); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-44, -60, 88, 3);
    ctx.fillStyle = '#25663f'; rr(ctx, -48, -70, 96, 12, 3.6);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-45, -69, 90, 2.6); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-46, -60, 92, 2.4);
    ctx.fillStyle = '#17402a'; rr(ctx, -19, -65, 38, 4.6, 2.2);
    ctx.fillStyle = '#f4f1e6'; rr(ctx, -39, -51, 34, 17, 2.4);
    txt(ctx, 'KOMUNÁLNY', -22, -46, 4.8, '#245a38', 800, 0); txt(ctx, 'ODPAD', -22, -39.2, 8, '#245a38', 900, 0.3);
    if (locked) {
      ctx.fillStyle = '#f7d21e'; rr(ctx, 12, -54, 26, 26, 3.6);
      ctx.fillStyle = '#1d1d1d'; ell(ctx, 25, -37.5, 5.4, 4.4); circle(ctx, 19.2, -45, 2); circle(ctx, 23.4, -47.6, 2.1); circle(ctx, 27.8, -47.6, 2.1); circle(ctx, 32, -45, 2);
      ctx.strokeStyle = '#d22a1f'; ctx.lineWidth = 2.3; ctx.beginPath(); ctx.arc(25, -41, 10, 0, TAU); ctx.moveTo(17.9, -34); ctx.lineTo(32.1, -48); ctx.stroke();
      // The lock bar: a steel beam across the front of the lid, bolted to brackets at both ends, with a padlock.
      ctx.fillStyle = '#4a5158'; rr(ctx, -50.5, -68.5, 7, 14, 1.8); rr(ctx, 43.5, -68.5, 7, 14, 1.8);
      ctx.fillStyle = '#b5bec6'; ctx.fillRect(-47, -63.4, 94, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-47, -63.4, 94, 1.8); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-47, -58.6, 94, 2);
      ctx.fillStyle = '#80888f'; for (const bx of [-45, 45]) circle(ctx, bx, -61, 1.3);
      ctx.strokeStyle = '#8c969d'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(2, -57, 5, PI, 0); ctx.stroke();
      ctx.fillStyle = '#d9a82e'; rr(ctx, -5.5, -57, 15, 12, 2.6); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-4.5, -56, 13, 2);
      ctx.fillStyle = '#4a3410'; circle(ctx, 2, -52, 1.6); ctx.fillRect(1.4, -52, 1.2, 3.4);
    }
    ctx.restore();
  }
  API.container = container;

  // ============================================================================================================
  // Haystack: a traditional Slovak haystack (kopa sena) around a pole, 72 wide, 111 tall with the pole tip, centred on x.
  // ============================================================================================================
  const HAY = ['#d8b55b', '#c29d44', '#ecd28b'];
  let hayPaths = null;
  const hayW = (h) => 36 * (1 - Math.pow(clamp((h - 18) / 92, 0, 1), 1.6));   // half-width of the heap at height h
  function haystack(ctx, x) {
    if (!hayPaths) {
      hayPaths = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < 130; i++) {   // strands of hay lying outwards and down
        const h = 4 + hash(i * 2.1) * 92, hw = hayW(h), px = (hash(i * 3.7) * 2 - 1) * hw * 0.95, sg = px < 0 ? -1 : 1, p = hayPaths[Math.floor(hash(i * 5.3) * 3)];
        p.moveTo(px, -h); p.lineTo(px + sg * (2.5 + hash(i * 7.1) * 4), -h + 5 + hash(i * 1.9) * 6);
      }
    }
    ctx.save(); ctx.translate(x, GY); ctx.scale(0.92, 1);
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
    for (const h of [36, 64]) {   // two ropes round the heap
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, -h, hayW(h) + 2, 5, 0, 0.05, PI - 0.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,160,0.4)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(0, -h - 0.9, hayW(h) + 2, 5, 0, 0.1, PI - 0.1); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = HAY[0];   // frayed hay along the foot and a tuft round the pole
    for (let i = 0, fx = -37; fx < 34; i++) { const w = 3.4 + hash(i * 1.9) * 3.4; poly(ctx, [fx, -9, fx + w * 0.5, -1 + hash(i) * 3.6, fx + w, -9]); fx += w * 0.82; }
    ctx.fillStyle = HAY[2]; ell(ctx, 0, -99.5, 9, 4.6); ell(ctx, -3, -102, 5, 3);
    ctx.restore();
  }
  API.haystack = haystack;

  // ============================================================================================================
  // Chapel: a small white wayside chapel (kaplnka) with a bell tower, 91 wide (roof) and 151 tall (cross), centred on x.
  // The bell rings now and then (every 16 s, for a few seconds) and the vigil lamp by the door flickers.
  // ============================================================================================================
  function chapel(ctx, x, time) {
    const u = time % 16, ring = sstep(0, 0.4, u) * exp(-Math.max(0, u - 0.4) * 0.85);   // 0..1, swells at the start of each ring
    const swing = 0.55 * ring * sin(u * 6.6) + 0.012 * sin(time * 1.7);
    ctx.save(); ctx.translate(x, GY); ctx.scale(0.93, 1);
    ctx.fillStyle = 'rgba(28,24,12,0.16)'; ell(ctx, 0, 0.8, 54, 4);
    // Walls, plinth, windows, door.
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
    // The vigil lamp by the door: a red glass that flickers.
    const fl = 0.55 + 0.25 * sin(time * 9.1) * sin(time * 3.7 + 1) + 0.12 * sin(time * 17);
    line(ctx, -16.4, -51, -16.4, -42, 1.2, '#2b2b2b'); ctx.fillStyle = 'rgba(255,110,60,' + (0.28 * fl).toFixed(3) + ')'; circle(ctx, -16.4, -38, 7);
    ctx.fillStyle = '#d13a2c'; rr(ctx, -18.4, -42, 4, 7, 1.4); ctx.fillStyle = 'rgba(255,220,160,' + fl.toFixed(3) + ')'; ctx.fillRect(-17.4, -40, 2, 3.2);
    // Roof in front of the nave, with dark bargeboards.
    ctx.fillStyle = '#a34b36'; poly(ctx, [-47, -55, 0, -92, 47, -55]);
    ctx.strokeStyle = 'rgba(60,20,10,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = -61; y > -90; y -= 5) { const hw = 47 * (y + 92) / 37; ctx.moveTo(-hw, y); ctx.lineTo(hw, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; poly(ctx, [0, -92, 47, -55, 0, -55]);
    ctx.strokeStyle = '#5a2f22'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-48.5, -54); ctx.lineTo(0, -93.4); ctx.lineTo(48.5, -54); ctx.stroke();
    ctx.fillStyle = '#5a2f22'; ctx.fillRect(-49, -56, 98, 2.6);
    // Bell tower standing on the facade: a belfry with an arched opening and a bell that swings, an onion dome and a cross.
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
    // When the bell rings, sound arcs spread to both sides.
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
    // Wildflowers and grass at the foot.
    for (let i = 0; i < 12; i++) {
      const fx = -52 + hash(i * 1.7) * 104, fh = 3 + hash(i * 2.9) * 4;
      line(ctx, fx, 0, fx + (hash(i) - 0.5) * 2, -fh, 1.2, '#4f8a35');
      ctx.fillStyle = ['#f4d03f', '#f5f0f0', '#e57fa5', '#8e7cc3'][i % 4]; circle(ctx, fx + (hash(i) - 0.5) * 2, -fh - 0.8, 1.5);
    }
    ctx.restore();
  }
  API.chapel = chapel;

  // Footprints in world units. l / r: how far the drawing reaches left / right of the anchor x (negative l), h: height above the ground.
  API.SIZE = {
    koliba:    { l: -101, r: 101, h: 137, smokeH: 215, note: 'x = centre; the roof tips reach +-101, the chimney smoke goes up to about 215' },
    pen:       { l: -24, r: 3, h: 62, note: 'x1..x2 is the fence, the energizer box sticks out 24 left of x1, posts every ~70' },
    sheep:     { l: -26, r: 36, h: 42, note: 'x = centre of the body (about 50 long), the nose is up to 36 ahead when the head is up' },
    dog:       { l: -39, r: 48, h: 64, note: 'x = centre of the body; rump to nose 71, the tail adds up to ~13 behind, barking puffs reach +60, head up 71 tall' },
    river:     { l: -16, r: 16, h: 6, note: 'x1 - 16 .. x2 + 16 at the ground line, water surface at GROUND - 6, water and banks reach the bottom of the view' },
    stone:     { l: -35, r: 35, h: 10, note: 'x = centre, w = width, top at GROUND - 10, the stone fades into the water below, swirls reach w/2 + 20 and a wake 34 to the right' },
    fish:      { l: -13, r: 13, h: 13, note: '(x, y) = centre of the body, 26 long and about 13 high with the fins; spray trails ~13 behind it' },
    hotel:     { l: -232, r: 234, h: 232, note: 'x = centre; the SUV is in front of the right wing, the chimney smoke goes up to about 260' },
    skiLift:   { l: -25, r: 25, h: 214, note: 'x = centre of the pylon; the cable rises to the right (0.24) and sinks to the left, fading out 760 away' },
    container: { l: -48, r: 48, h: 70, note: 'x = centre; the lock bar brackets reach +-51 when locked' },
    haystack:  { l: -34, r: 36, h: 111, note: 'x = centre, the pole tip is the top' },
    chapel:    { l: -47, r: 46, h: 151, note: 'x = centre, the cross is the top; sound arcs reach +-53 while the bell rings' },
  };
})();
