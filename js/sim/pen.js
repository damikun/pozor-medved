(function () {
  const { clamp } = ZS.util;
  const KEEP = { hunter: 26, person: 22 };
  const HURDLE = { reach: 64, land: 58, top: 36, speed: 245, inside: 1.2 };
  const LEAP = { reach: 78, top: 58, gather: 0.16, air: 0.62, land: 0.16, runup: 70 };

  function wires(L) {
    const s = L && L.salas;
    return s && s.fences && s.fences.length > 1 ? s.fences : null;
  }

  function band(L, m) {
    const f = wires(L);
    return f ? [f[0] - (m || 0), f[f.length - 1] + (m || 0)] : null;
  }

  function inside(L, x, m) {
    const b = band(L, m);
    return !!b && x > b[0] && x < b[1];
  }

  function side(L, x) {
    const f = wires(L);
    return !f || x < (f[0] + f[f.length - 1]) / 2 ? -1 : 1;
  }

  function edge(L, x, m) {
    const b = band(L, m);
    return side(L, x) < 0 ? b[0] : b[1];
  }

  function hold(L, prev, x, m) {
    const b = band(L, m);
    if (!b) return x;
    if (prev <= b[0] && x > b[0]) return b[0];
    if (prev >= b[1] && x < b[1]) return b[1];
    if (x > b[0] && x < b[1]) return edge(L, prev, m);
    return x;
  }

  function between(L, a, b) {
    const f = wires(L);
    return !!f && f.some((fx) => (fx - a) * (fx - b) < 0);
  }

  function ahead(L, x, dir) {
    const f = wires(L);
    if (!f) return null;
    let best = null;
    for (const fx of f) if ((fx - x) * dir > 0 && (best === null || Math.abs(fx - x) < Math.abs(best - x))) best = fx;
    return best;
  }

  function range(L, o, m, min) {
    const b = band(L, m);
    if (!b) return o;
    const s = side(L, o.x);
    if (inside(L, o.x, m)) o.x = s < 0 ? b[0] : b[1];
    if (o.from === null || o.from === undefined || o.to === null || o.to === undefined) return o;
    if (o.to <= b[0] || o.from >= b[1]) return o;
    const w = min || 160;
    if (s < 0) { o.to = Math.min(o.to, b[0]); o.from = Math.min(o.from, o.to - w); }
    else { o.from = Math.max(o.from, b[1]); o.to = Math.max(o.to, o.from + w); }
    o.x = clamp(o.x, o.from, o.to);
    return o;
  }

  function hurdleAt(p, fx, dir) {
    const e = Math.max(18, Math.abs(fx - p.x));
    p.hurdle = { x0: fx - dir * e, x1: fx + dir * HURDLE.land, fx, dir, e, l: HURDLE.land, k: 0, lift: 0 };
  }

  function hurdleStep(p, dt) {
    const h = p.hurdle;
    p.x = Math.min(Math.max(p.x + h.dir * HURDLE.speed * dt, Math.min(h.x0, h.x1)), Math.max(h.x0, h.x1));
    const d = (p.x - h.fx) * h.dir;
    h.k = clamp((d + h.e) / (h.e + h.l), 0, 1);
    const w = d < 0 ? d / h.e : d / h.l;
    h.lift = HURDLE.top * Math.max(0, 1 - w * w);
    p.fy = ZS.CFG.GROUND - h.lift;
    if ((p.x - h.x1) * h.dir >= 0) { p.x = h.x1; p.hurdle = null; p.fy = undefined; return true; }
    return false;
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.pen = { KEEP, HURDLE, LEAP, wires, band, inside, side, edge, hold, between, ahead, range, hurdleAt, hurdleStep };
})();
