// The map of one Liptov valley and the geometry helpers the rest of the game uses.
(function () {
  const { W, H } = ZS.CFG;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  ZS.util = { dist, clamp, angDiff, mulberry32 };

  const CELL = 100;
  function gridKey(cx, cy) { return cx + ',' + cy; }

  ZS.makeWorld = function (seed) {
    const rng = mulberry32(seed || 7);
    const village = { x: 1900, y: 1120, core: 300, zone: 380 };
    const w = {
      rng, village,
      den: { x: 170, y: 170 },
      stand: { x: 1430, y: 925, ang: Math.PI / 2 },
      road: [[0, 1400], [800, 1390], [1600, 1395], [2400, 1380]],
      branch: [[1900, 1390], [1900, 880]],
      river: [[0, 1525], [700, 1505], [1500, 1535], [2400, 1495]],
      houses: [], trees: [], items: [], grid: new Map(),
      clearings: [
        { x: 420, y: 880, r: 120 }, { x: 900, y: 380, r: 110 }, { x: 1500, y: 300, r: 120 },
        { x: 700, y: 1160, r: 100 }, { x: 1180, y: 700, r: 95 }, { x: 2050, y: 430, r: 110 },
        { x: 170, y: 170, r: 85 },
      ],
      orchard: { x: 2210, y: 930, r: 110 },
      patrols: [
        [[1300, 1250], [1580, 880], [2080, 700], [2320, 1000], [2250, 1300], [1650, 1310]],
        [[600, 700], [1100, 560], [1320, 980], [820, 1220], [380, 1100]],
        [[450, 280], [1200, 200], [1820, 330], [1300, 480]],
        [[1600, 1000], [1900, 820], [2200, 1100], [1900, 1340]],
      ],
    };

    const housePos = [[1800, 975], [1995, 975], [1795, 1080], [2000, 1090], [1790, 1190],
      [2005, 1200], [1800, 1295], [2015, 1300], [2125, 1130], [1680, 1130]];
    for (const [x, y] of housePos) {
      w.houses.push({ x: x - 34, y: y - 24, w: 60 + Math.round(rng() * 14), h: 44 + Math.round(rng() * 8) });
    }

    const add = (type, x, y) => w.items.push({ type, x, y, active: true, t: 0, locked: false });
    [[1855, 1010], [1955, 1015], [1850, 1125], [1950, 1135], [1850, 1240], [1955, 1250]].forEach(([x, y]) => add('bin', x, y));
    [[1640, 960], [1612, 1000], [1650, 1035]].forEach(([x, y]) => add('hive', x, y));
    [[2180, 860], [2245, 895], [2200, 960], [2265, 1000], [2150, 1005]].forEach(([x, y]) => add('apple', x, y));
    [[1440, 1010], [1478, 1020], [1455, 1048]].forEach(([x, y]) => add('corn', x, y));

    for (const c of w.clearings) {
      if (c.x === w.den.x) continue;
      for (let i = 0; i < 6; i++) {
        const a = rng() * Math.PI * 2, d = 20 + rng() * (c.r - 30);
        add(i < 3 ? 'berry' : i < 5 ? 'herb' : 'ants', c.x + Math.cos(a) * d, c.y + Math.sin(a) * d);
      }
    }

    const blocked = (x, y, pad) => {
      if (dist(x, y, village.x, village.y) < village.core + 60 + pad) return true;
      if (y > 1325 - pad) return true;
      if (dist(x, y, w.orchard.x, w.orchard.y) < w.orchard.r + pad) return true;
      if (dist(x, y, 1450, 990) < 85 + pad) return true;
      return w.clearings.some((c) => dist(x, y, c.x, c.y) < c.r + pad);
    };

    for (let i = 0; i < 6000 && w.trees.length < 430; i++) {
      const x = 30 + rng() * (W - 60), y = 30 + rng() * (H - 60);
      if (blocked(x, y, 0)) continue;
      const r = 22 + rng() * 12;
      if (ZS.treesNear(w, x, y, 60).some((t) => dist(x, y, t.x, t.y) < (t.r + r) * 0.82)) continue;
      const tree = { x, y, r, shade: rng() };
      w.trees.push(tree);
      const k = gridKey(Math.floor(x / CELL), Math.floor(y / CELL));
      if (!w.grid.has(k)) w.grid.set(k, []);
      w.grid.get(k).push(tree);
    }

    for (let i = 0; i < 26; i++) {
      const p = ZS.forestPoint(w);
      add(rng() < 0.6 ? 'herb' : 'ants', p.x, p.y);
    }
    for (let i = 0; i < 16; i++) {
      const t = w.trees[Math.floor(rng() * w.trees.length)];
      add('nut', t.x + t.r * 0.9, t.y + t.r * 0.6);
    }
    return w;
  };

  ZS.treesNear = function (w, x, y, R) {
    const out = [];
    const x0 = Math.floor((x - R) / CELL), x1 = Math.floor((x + R) / CELL);
    const y0 = Math.floor((y - R) / CELL), y1 = Math.floor((y + R) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const list = w.grid.get(gridKey(cx, cy));
        if (list) for (const t of list) out.push(t);
      }
    }
    return out;
  };

  // A point somewhere in the forest: not in the village, a clearing or on the road.
  ZS.forestPoint = function (w) {
    for (let i = 0; i < 200; i++) {
      const x = 60 + w.rng() * (W - 120), y = 60 + w.rng() * 1240;
      if (dist(x, y, w.village.x, w.village.y) < w.village.zone + 40) continue;
      if (w.clearings.some((c) => dist(x, y, c.x, c.y) < c.r)) continue;
      return { x, y };
    }
    return { x: 600, y: 600 };
  };

  // Trees block sight with a slightly smaller circle than their crown.
  const BLOCK = 0.78;

  ZS.underCanopy = function (w, x, y) {
    for (const t of ZS.treesNear(w, x, y, 40)) {
      if (dist(x, y, t.x, t.y) < t.r * 0.9) return t;
    }
    return null;
  };

  function segCircle(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
    const u = clamp(((cx - ax) * dx + (cy - ay) * dy) / len2, 0, 1);
    return dist(ax + dx * u, ay + dy * u, cx, cy) < r;
  }

  // True when a tree stands between the viewer (a) and the target (b).
  ZS.sightBlocked = function (w, ax, ay, bx, by) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2, R = dist(ax, ay, bx, by) / 2 + 40;
    for (const t of ZS.treesNear(w, mx, my, R)) {
      if (dist(ax, ay, t.x, t.y) < t.r * BLOCK) continue;
      if (segCircle(ax, ay, bx, by, t.x, t.y, t.r * BLOCK)) return true;
    }
    return false;
  };

  // How far a ray travels before it hits a tree; used to draw view cones with shadows.
  ZS.rayLength = function (trees, x, y, ang, maxD) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best = maxD;
    for (const t of trees) {
      const r = t.r * BLOCK, ox = t.x - x, oy = t.y - y;
      if (ox * ox + oy * oy < r * r) continue;
      const along = ox * dx + oy * dy;
      if (along <= 0) continue;
      const d2 = ox * ox + oy * oy - along * along;
      if (d2 > r * r) continue;
      const hit = along - Math.sqrt(r * r - d2);
      if (hit < best) best = hit;
    }
    return best;
  };

  ZS.inHouse = function (w, x, y, pad) {
    return w.houses.find((h) => x > h.x - pad && x < h.x + h.w + pad && y > h.y - pad && y < h.y + h.h + pad);
  };
})();
