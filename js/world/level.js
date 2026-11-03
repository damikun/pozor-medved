(function () {
  const { CFG, LEVELS, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { mulberry32 } = ZS.util;

  function makeTree(rng, kind, x) {
    const s = rng();
    if (kind === 'buk') return { kind, x, w: 46 + rng() * 14, h: 220 + rng() * 60, r: 92 + rng() * 24, hide: true, shade: s };
    if (kind === 'smrek') return { kind, x, w: 42 + rng() * 12, h: 300 + rng() * 60, r: 84 + rng() * 16, hide: true, shade: s };
    if (kind === 'jablon') return { kind, x, w: 42, h: 110, r: 74, hide: true, shade: s };
    return { kind, x, w: 16 + rng() * 5, h: 220 + rng() * 40, r: 56, hide: false, shade: s };
  }

  function base(id, rng) {
    const def = LEVELS[id];
    return {
      rng, id, theme: id, w: def.w, startDen: 110, goalDen: def.w - 300,
      trees: [], items: [], logs: [], houses: [], signs: [], posts: [], spawns: [], stones: [], haystacks: [],
      mountains: [], ridge: [], backTrees: [], cannons: [], feeders: [], stalls: [], snowmen: [], holes: [],
      river: null, ice: null, village: null, salas: null, hotel: null, park: null, chata: null, lift: null, slope: null,
    };
  }

  function sign(x, text, extra) {
    return Object.defineProperty(Object.assign({ x }, extra), 'text', { get: text, enumerable: true });
  }

  function add(L, type, x, extra) {
    L.items.push(Object.assign({ type, x, eaten: false, locked: false }, extra));
  }

  function forest(L, blocked, pick, gap) {
    let x = 240;
    while (x < L.w - 480) {
      if (!blocked(x)) L.trees.push(makeTree(L.rng, pick(x), x));
      x += gap(x);
    }
  }

  function backTrees(L, skip) {
    const rng = L.rng;
    for (let bx = 60; bx < L.w; bx += 55 + rng() * 70) {
      if (skip(bx)) continue;
      L.backTrees.push({ x: bx, kind: rng() < 0.55 ? 'smrek' : 'buk', h: 170 + rng() * 120, r: 55 + rng() * 25, w: 20 + rng() * 10 });
    }
  }

  function scatter(L, noFood, want, pick) {
    const rng = L.rng;
    for (let i = 0; i < 120 && L.items.filter((it) => ZS.FOOD[it.type].natural).length < want; i++) {
      const fx = 300 + rng() * (L.w - 900);
      if (noFood(fx) || L.items.some((it) => Math.abs(it.x - fx) < 60)) continue;
      add(L, pick(rng()), fx);
    }
  }

  function honey(L, n, type) {
    L.trees.filter((t) => t.kind === 'buk' && t.h > 235 && t.x > 600).filter((t, i) => i % 2 === 0).slice(0, n)
      .forEach((t) => add(L, type || 'wildhoney', t.x + 6, { y: GY - t.h + 14 }));
  }

  function hills(L) {
    const rng = L.rng;
    for (let mx = -200; mx < L.w * 0.15 + 3200; mx += 70 + rng() * 90) L.mountains.push([mx, GY - 150 - rng() * 170]);
    for (let rx = -200; rx < L.w * 0.35 + 3200; rx += 60 + rng() * 60) L.ridge.push([rx, GY - 60 - rng() * 60]);
  }

  const WIDE = 440, GAP = 300;
  const at = (x) => x + (x >= 4170 ? WIDE : 0) + (x >= 8900 ? GAP : 0);

  function summer(rng) {
    const L = base('summer', rng);
    const W = L.w, S = LABELS.signs;
    Object.assign(L, {
      village: { from: 2300, to: 3520 },
      salas: { from: at(6900), to: at(8000), koliba: at(7120), pen: [at(7300), at(7900)], fences: [at(7292), at(7892)], strunga: { x: at(7550), w: 104 } },
      river: { from: at(8200), to: at(8660) },
      photographer: { x: at(8762), dir: -1 },
      hotel: { x: at(9300), w: 460, lift: at(9930), chapel: at(10180) },
      park: { from: at(10350), to: at(11850) },
      feeding: at(4320),
      feedSlots: [at(6060), at(10910)],
      corn: { from: 3730, to: at(4170), boar: 4180 },
      haystacks: [at(6960), at(8040)],
      skanzen: {
        from: at(4780), to: at(6010), gate: at(5100), tower: at(5398), well: at(5470), notice: at(5202), hen: at(5214), fence: [at(4792), at(5826)], rail: [at(5838), at(6008)], loco: at(5884),
        houses: [{ x: at(4846), gw: 84, sw: 92, hip: true, guard: true, smoke: true }, { x: at(5772), gw: 86, sw: 90, flip: true, braid: true }],
      },
    });
    L.houses = [{ x: 2420, w: 160 }, { x: 2700, w: 180 }, { x: 2990, w: 150 }, { x: 3260, w: 170 }];
    L.posts = [{ x: 1900 }, { x: at(4560) }];
    L.logs = [
      { x: 1200, w: 96, h: 30 }, { x: 3640, w: 110, h: 34 }, { x: at(4880), w: 90, h: 30 },
      { x: at(5650), w: 100, h: 32 }, { x: at(6350), w: 96, h: 30 },
      { x: at(10700), w: 110, h: 34 },
    ];
    L.stones = [{ x: at(8300), w: 64 }, { x: at(8425), w: 58 }, { x: at(8550), w: 66 }];
    L.signs = [
      sign(420, () => S.hide, { key: 'ArrowDown' }),
      sign(800, () => S.climb, { key: 'ArrowUp' }),
      sign(2305, () => ZS.LEVEL_TEXT.summer.village),
      sign(2130, () => '', { billboard: true }),
      sign(3580, () => S.stomp, { key: 'Space' }),
      sign(at(5100), () => S.skanzen),
      sign(L.feeding - 70, () => S.feeding),
      sign(at(8110), () => S.ford),
      sign(at(10300), () => S.park),
      sign(W - 470, () => S.goal),
    ];

    [2510, 2800, 3075, 3350].forEach((x) => add(L, 'bin', x));
    [3430, 3500].forEach((x) => add(L, 'hive', x));
    [L.feeding - 40, L.feeding, L.feeding + 40].forEach((x) => add(L, 'corn', x));
    [3800, 3905, 4040, 4310, 4440, 4550].forEach((x) => add(L, 'cob', x));
    add(L, 'container', L.hotel.x + L.hotel.w / 2 + 70);
    [2560, 2855, 3135, 3405].forEach((x) => {
      L.trees.push(makeTree(rng, 'jablon', x));
      add(L, 'apple', x + 26);
      add(L, 'apple', x - 30, { y: GY - 160 });
      add(L, 'apple', x + 28, { y: GY - 148 });
    });

    const H = L.hotel;
    L.lift = { x: H.lift, tower: H.lift + 625 };
    L.checkpoints = [{ key: 'skanzen', x: L.skanzen.gate + 40 }, { key: 'koliba', x: L.salas.to + 60 }];
    const A = ZS.levelKit.alpine.zone(L);
    const blocked = (x) => (x > L.village.from - 40 && x < L.village.to + 40)
      || (x > L.salas.from && x < L.salas.to)
      || (x > L.river.from - 70 && x < L.river.to + 70)
      || (x > H.x - H.w / 2 - 30 && x < H.x + H.w / 2 + 110)
      || Math.abs(x - H.lift) < 50 || Math.abs(x - H.chapel) < 60
      || L.haystacks.some((h) => Math.abs(h - x) < 70)
      || L.posts.some((p) => Math.abs(p.x - x) < 80)
      || L.logs.some((l) => Math.abs(l.x - x) < l.w / 2 + 80)
      || Math.abs(x - L.feeding) < 90
      || L.feedSlots.some((f) => x > f - 70 && x < f + 250)
      || Math.abs(x - 2130) < 150
      || L.signs.some((s) => !s.billboard && Math.abs(s.x - x) < 95)
      || x < 230 || x > W - 480 || x > A.from;
    const birchGrove = (x) => x > at(5820) && x < at(6080);
    forest(L, blocked, (x) => {
      if (birchGrove(x)) return 'breza';
      if (x >= L.park.to) return 'smrek';
      if (x > L.park.from) return rng() < 0.7 ? 'smrek' : 'buk';
      const r = rng();
      return r < 0.5 ? 'buk' : r < 0.92 ? 'smrek' : 'breza';
    }, (x) => (birchGrove(x) ? 85 + rng() * 40 : x >= L.park.to ? 170 + rng() * 110 : 115 + rng() * 85));
    L.trees = L.trees.filter((t) => Math.abs(t.x - at(5950)) > 70 && (t.x < L.corn.from - 50 || t.x > L.corn.to + 40));
    L.trees.push(makeTree(rng, 'buk', at(5950)), makeTree(rng, 'buk', at(7040)), makeTree(rng, 'buk', at(7760)));
    for (const t of L.trees) if (Math.abs(t.x - L.skanzen.tower) < 70) t.x = L.skanzen.tower + 142;
    L.trees.sort((a, b) => a.x - b.x);

    backTrees(L, (bx) => (bx > L.village.from && bx < L.village.to) || (bx > H.x - H.w / 2 && bx < H.x + H.w / 2)
      || (bx - 55) / 0.85 > A.from + (A.line - A.from) * rng());

    scatter(L, (fx) => (fx > L.village.from - 60 && fx < L.village.to + 60)
      || (fx > L.river.from - 40 && fx < L.river.to + 40)
      || (fx > H.x - H.w / 2 - 40 && fx < H.x + H.w / 2 + 160)
      || Math.abs(fx - L.feeding) < 120 || fx > A.from - 40, 20,
    (r) => (r < 0.3 ? 'berry' : r < 0.48 ? 'herb' : r < 0.62 ? 'ants' : r < 0.8 ? 'mushroom' : 'nut'));
    honey(L, 7);
    const stand = L.posts[1].x;
    L.trees = L.trees.filter((t) => Math.abs(t.x - (stand - 100)) > 60);
    L.trees.push({ kind: 'buk', x: stand - 130, w: 54, h: 250, r: 104, hide: true, shade: 0.42 });
    L.trees.sort((a, b) => a.x - b.x);
    L.haystacks.push(at(6465));
    L.haystacks.sort((a, b) => a - b);
    L.signs.push(sign(1670, () => S.stand));
    L.stalls = [{ x: 7230, kind: 'cheese', salas: true }];
    L.stalls.forEach((s) => add(L, s.kind, s.x));
    [8245, 8365, 8490, 8610].map(at).forEach((fx) => add(L, 'fish', fx, { y: GY + 30, hidden: true, jumpT: 1 + rng() * 3, jump: -1 }));
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'posed', x: 1900, range: 480 },
      { kind: 'posed', x: at(4560), range: 500 },
      { kind: 'walker', from: 3260, to: 3700 },
      { kind: 'walker', from: at(4250), to: at(4950) },
      { kind: 'walker', from: at(5250), to: at(6650) },
      { kind: 'walker', from: at(9750), to: at(10300) },
      { kind: 'picker', from: 1250, to: 2150 },
      { kind: 'picker', from: at(5300), to: at(6600) },
      { kind: 'picker', from: at(10450), to: at(11000) },
      { kind: 'tourist', from: 2600, to: 3300 },
      { kind: 'tourist', from: 2380, to: 3150 },
      { kind: 'tourist', from: at(9050), to: at(9850) },
      { kind: 'tourist', from: at(9250), to: at(10150) },
      { kind: 'dog', from: at(7150), to: at(7950) },
    ];
    for (let i = 0; i < 5; i++) L.spawns.push({ kind: 'sheep', from: at(7340), to: at(7860), x: at(7380) + i * 105 });

    ZS.levelKit.alpine.build(L);
    hills(L);
    return L;
  }

  ZS.levelKit = { makeTree, base, sign, add, forest, backTrees, scatter, honey, hills };
  ZS.levelBuilders = { summer };

  ZS.makeLevel = function (id, seed) {
    return ZS.levelBuilders[id || 'summer'](mulberry32(seed || 11));
  };

  ZS.silhouetteY = function (pts, x) {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] >= x) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
      }
    }
    return pts[pts.length - 1][1];
  };
})();
