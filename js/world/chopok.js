(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;
  const { hash, sstep, mulberry32 } = ZS.util;

  const ROCKS = [[7860, 72, 36], [9000, 84, 40], [9680, 64, 32], [9900, 90, 42], [10270, 72, 36], [10710, 96, 44], [11070, 70, 34], [11410, 88, 40], [11780, 76, 38], [12140, 92, 44], [12410, 80, 38], [13210, 82, 38], [13470, 70, 34], [13790, 76, 36]];
  const CAIRNS = [10490, 11610];
  const DWARF = [[6530, 6670], [6840, 6970], [9120, 9250], [10030, 10180], [11180, 11320], [11880, 12000], [13040, 13170], [13300, 13430], [13590, 13730]];
  const LIMESTONE = [[2780, 54, 36], [3020, 70, 46], [4500, 52, 34]];
  const PROFILE = [[0, 0], [900, -0.035], [7150, -0.035], [7650, -0.015], [7900, -0.015], [7980, 0.3], [8190, 0.3], [8290, 0], [8560, 0], [8900, -0.045], [12550, -0.045], [12760, 0], [12860, 0], [13060, 0.09], [13750, 0.09], [14100, 0.02], [14450, 0]];

  function rock(x, w, h, cairn) {
    return { x, w, h, top: GY - h + 3, hide: true, logs: true, rock: true, cairn: !!cairn, shade: hash(x * 0.013) };
  }

  function solid(c) {
    return { x: c.x, w: Math.round(c.cairn ? 24 : c.w * 0.8 - 14), h: Math.round(c.cairn ? 56 : c.h * 0.88 - 3), of: c };
  }

  function rise(L) {
    const rng = L.rng;
    for (let mx = -200; mx < L.w * 0.15 + 3200; mx += 70 + rng() * 90) {
      const up = sstep(1500, 7400, mx / 0.15);
      L.mountains.push([mx, GY - 120 - rng() * 150 - up * 70]);
    }
    for (let rx = -200; rx < L.w * 0.35 + 3200; rx += 60 + rng() * 60) {
      const up = sstep(2600, 6800, rx / 0.35);
      L.ridge.push([rx, GY - 70 - rng() * 50 - (1 - up) * 120]);
    }
  }

  ZS.levelBuilders.chopok = function (rng) {
    const L = K.base('chopok', rng);
    const W = L.w, S = LABELS.signs, C = LABELS.chopok.signs;
    Object.assign(L, {
      startDen: -9999,
      profile: PROFILE,
      road: { from: -200, to: 4450, bridge: 1880, climb: [4000, 4900] },
      trail: { from: 4450, to: 7180 },
      lots: [{ from: 30, to: 1250, lines: true }, { from: 3150, to: 3420, lines: true }],
      concrete: { from: 30, to: 1250, machine: 610, bus: 1060, cars: [150, 290, 470, 880, 1170] },
      cave: { booth: 3460, group: 3505, door: 3630, from: 3580, to: 4000, exit: 3970, land: 4040 },
      jasna: { from: 4900, to: 7150, hotels: [[5330, 300, 3, 'hotel', 1.3], [5820, 230, 2, 'apart', 2.1]] },
      funi: { station: 7200, door: 7255, from: 7290, to: 7570, top: 7510, land: 7610 },
      summit: { rotunda: 7790, from: 7570, to: 8850 },
      chata: { x: 8450, from: 8250, to: 8630, door: 8290, queue: [8336, 8374, 8412], counter: 8454, cook: 8500, exit: 8570 },
      fog: { from: 8800, to: W },
      wind: { from: 7590, to: W },
      crest: { from: 8850, to: 12250, saddle: 9300, krupova: 10900 },
      dumbier: { x: 12770, book: 12816 },
      tatier: { x: 13285 },
      descent: { from: 12950, to: W },
      wildlife: { chamois: [[10180, -1], [10245, 1], [11730, -1]], marmots: [[9550, 52], [11330, 44], [13350, 48]] },
      dwarf: DWARF,
    });
    L.passes = [
      { key: 'cave', from: L.cave.door, to: L.cave.land, wall: L.cave.land - 20 },
      { key: 'funi', from: L.funi.door, to: L.funi.land, wall: L.funi.land - 20 },
    ];
    L.checkpoints = [
      { key: 'cave', x: L.cave.booth - 110 },
      { key: 'caved', x: L.cave.land + 60, after: 'cave' },
      { key: 'funi', x: L.funi.station - 190 },
      { key: 'top', x: L.funi.land + 60, after: 'funi' },
      { key: 'chata', x: L.chata.to + 110 },
      { key: 'ridge', x: L.crest.saddle - 60 },
    ];
    L.posts = [{ x: 13600 }];
    L.covers = ROCKS.map(([x, w, h]) => rock(x, w, h)).concat(CAIRNS.map((x) => rock(x, 46, 58, true)), LIMESTONE.map(([x, w, h]) => Object.assign(rock(x, w, h), { lime: true })));
    L.logs = [{ x: 1640, w: 96, h: 30 }, { x: 4330, w: 100, h: 32 }].concat(L.covers.map(solid));
    L.signs = [
      K.sign(1400, () => S.hide, { key: 'ArrowDown', teach: 'hide' }),
      K.sign(2080, () => S.climb, { key: 'ArrowUp', teach: 'ladderUp' }),
      K.sign(140, () => C.parking),
      K.sign(1150, () => '', { billboard: true, poster: () => LABELS.chopok.billboard, by: () => LABELS.chopok.billboardBy }),
      K.sign(2440, () => C.cave),
      K.sign(5080, () => ZS.LEVEL_TEXT.chopok.village),
      K.sign(7030, () => C.funi),
      K.sign(8080, () => C.chata),
      K.sign(8810, () => C.fog, { key: 'ArrowDown' }),
      K.sign(L.crest.saddle + 120, () => C.saddle),
      K.sign(L.crest.krupova, () => C.krupova),
      K.sign(12990, () => C.descent),
      K.sign(W - 470, () => C.goal),
    ];

    [380, 720, 930].forEach((x) => K.add(L, 'bin', x));
    K.add(L, 'bin', 3290);
    K.add(L, 'container', L.jasna.hotels[0][0] + L.jasna.hotels[0][1] / 2 + 60);

    const open = (x, m) => L.lots.some((l) => x > l.from - m && x < l.to + m)
      || (x > L.cave.booth - 80 - m && x < L.cave.land + 40 + m)
      || L.jasna.hotels.some(([hx, hw]) => x > hx - hw / 2 - 40 - m && x < hx + hw / 2 + 100 + m)
      || (x > L.funi.station - 110 - m && x < L.summit.to + m)
      || Math.abs(x - L.road.bridge) < 110 + m;
    const blocked = (x) => x > 6960 || open(x, 30)
      || L.posts.some((p) => Math.abs(p.x - x) < 80)
      || L.logs.some((l) => Math.abs(l.x - x) < l.w / 2 + 80)
      || L.covers.some((c) => Math.abs(c.x - x) < c.w / 2 + 50)
      || L.signs.some((s) => Math.abs(s.x - x) < (s.billboard ? 150 : 95))
      || DWARF.some(([a, b]) => x > a - 50 && x < b + 50);
    const spruce = (x) => 0.3 + 0.6 * sstep(4000, 5300, x);
    K.forest(L, blocked, (x) => {
      const r = rng(), s = spruce(x);
      return r < s ? 'smrek' : r < s + (1 - s) * 0.85 ? 'buk' : 'breza';
    }, (x) => (x > L.jasna.from ? 165 + rng() * 120 : 108 + rng() * 80));
    [[1295, 'buk'], [2045, 'buk'], [2240, 'smrek'], [3080, 'smrek'], [4120, 'smrek'], [4760, 'smrek'], [5130, 'smrek'], [6010, 'smrek']].forEach(([x, kind]) => L.trees.push(K.makeTree(rng, kind, x)));
    L.trees.push(Object.assign(K.makeTree(rng, 'smrek', 7080), { h: 250, r: 70 }));
    [[13530, 170, 0.4], [13680, 210, 0.2], [13860, 250, 0.1], [13410, 140, 0.5]].forEach(([x, h, lean]) => L.trees.push(Object.assign(K.makeTree(rng, 'smrek', x), { h, r: 40 + h * 0.13, w: 26 + h * 0.06, lean })));
    L.trees.sort((a, b) => a.x - b.x);
    L.calm = [[L.cave.booth - 100, L.cave.land + 100], [L.funi.station - 120, L.funi.land + 120], [L.chata.from - 120, L.chata.to + 120]];

    K.backTrees(L, (bx) => bx > 6900);
    for (const t of L.backTrees) if (hash(t.x * 0.37) < sstep(3500, 5700, t.x / 0.85)) t.kind = 'smrek';

    const noFood = (fx) => open(fx, 40) || (fx > L.chata.from - 60 && fx < L.chata.to + 60) || Math.abs(fx - L.tatier.x) < 120 || fx > L.goalDen - 120 || L.covers.some((c) => Math.abs(c.x - fx) < c.w / 2 + 20);
    K.scatter(L, noFood, 22, (r) => (r < 0.3 ? 'berry' : r < 0.45 ? 'herb' : r < 0.6 ? 'ants' : r < 0.8 ? 'mushroom' : 'nut'));
    L.items = L.items.filter((it) => !(ZS.FOOD[it.type].natural && it.x > L.summit.from && it.type !== 'berry'));
    [8910, 9410, 10110, 10570, 11110, 11510, 11970, 12310, 13270, 13750].forEach((fx, i) => K.add(L, 'berry', fx, i % 2 ? { labelKey: 'lingon' } : {}));
    [7740, 8110].forEach((fx) => K.add(L, 'herb', fx));
    K.honey(L, 4);
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'posed', x: L.posts[0].x, range: 440 },
      { kind: 'patrol', from: 2260, to: 2720 },
      { kind: 'patrol', from: 4700, to: 5600 },
      { kind: 'picker', from: 1500, to: 2150 },
      { kind: 'tourist', from: 420, to: 1150 },
      { kind: 'tourist', from: 1450, to: 2250 },
      { kind: 'tourist', from: 2600, to: 3300 },
      { kind: 'tourist', from: 5000, to: 5600 },
      { kind: 'tourist', from: 5800, to: 6400 },
      { kind: 'tourist', from: 7650, to: 8150, hiker: 1 },
      { kind: 'tourist', from: 9750, to: 10550, hiker: 2 },
      { kind: 'rescuer', from: 10350, to: 11550 },
      { kind: 'tourist', from: 11000, to: 11800, hiker: 3 },
      { kind: 'tourist', from: 13150, to: 13800, hiker: 5 },
    ];

    rise(L);
    return L;
  };

  function slope(L, x) {
    const P = L.profile;
    if (!P) return 0;
    if (x <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) {
      const [x0, k0] = P[i - 1], [x1, k1] = P[i];
      if (x <= x1) return k0 + (k1 - k0) * ZS.util.smooth((x - x0) / (x1 - x0 || 1));
    }
    return P[P.length - 1][1];
  }

  function height(L, x) {
    if (!L.profile) return 0;
    let T = L.hmap;
    if (!T) {
      T = L.hmap = [];
      let h = 0;
      for (let u = 0; u <= L.w + 600; u += 25) { T.push(h); h -= slope(L, u + 12.5) * 25; }
    }
    const u = Math.max(0, x) / 25, i = Math.min(T.length - 2, Math.floor(u));
    return T[i] + (T[i + 1] - T[i]) * Math.min(1, u - i);
  }

  const CAVE = {
    w: 3320, start: 90, gap: 940, lamp: 860, bones: 3080, exit: 3260,
    walk: [0, 940], vault: [2960, 3320], hall: [2020, 2420],
    low: [[1080, 1260], [2470, 2650]], brook: [2470, 2650],
    water: [1830, 2110], stones: [1925, 2045],
    ledges: [[1490, 180, 70], [1670, 130, 92], [2880, 200, 64]],
    colonies: [[1490, 7], [2240, 8], [2880, 6]],
  };
  const STALAG = [[300, 84, 132], [520, 78, 118], [720, 88, 140], [2170, 60, 170], [2310, 56, 150]];

  function caveStage() {
    const L = K.base('chopok', mulberry32(3011));
    Object.assign(L, { w: CAVE.w, startDen: -9999, goalDen: Infinity, stage: true, cave: Object.assign({}, CAVE) });
    L.covers = STALAG.map(([x, w, h], i) => ({ x, w, h, hide: true, stalag: true, shade: hash(i * 3.7 + 0.2), id: i }));
    L.logs = CAVE.ledges.map(([x, w, h]) => ({ x, w, h, ledge: true }));
    return L;
  }

  const CABIN = { w: 980, left: 150, right: 830, door: 180 };

  function cabinStage() {
    const L = K.base('chopok', mulberry32(4021));
    Object.assign(L, { w: CABIN.w, startDen: -9999, goalDen: Infinity, stage: true, cabin: Object.assign({}, CABIN) });
    return L;
  }

  K.slope = slope;
  K.height = height;
  K.caveStage = caveStage;
  K.cabinStage = cabinStage;
  K.CAVE = CAVE;
  K.CABIN = CABIN;
})();
