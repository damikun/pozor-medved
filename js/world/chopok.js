(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;
  const { hash, sstep, mulberry32 } = ZS.util;

  const ROCKS = [[8830, 70, 34], [9800, 84, 40], [10290, 64, 32], [10700, 90, 42], [11070, 72, 36], [11510, 96, 44], [11830, 70, 34], [12210, 88, 40], [12580, 76, 38], [12940, 92, 44], [13210, 80, 38], [13480, 70, 34], [14010, 82, 38], [14270, 70, 34], [14630, 76, 36]];
  const CAIRNS = [11290, 12410];
  const DWARF = [[7330, 7470], [7640, 7770], [9920, 10050], [10830, 10980], [11980, 12120], [12680, 12800], [13840, 13970], [14100, 14230], [14390, 14530]];
  const LIMESTONE = [[2780, 54, 36], [3020, 70, 46], [3330, 60, 40], [4140, 66, 42], [4520, 52, 34]];

  function rock(x, w, h, cairn) {
    return { x, w, h, top: GY - h + 3, hide: true, logs: true, rock: true, cairn: !!cairn, shade: hash(x * 0.013) };
  }

  function rise(L) {
    const rng = L.rng;
    for (let mx = -200; mx < L.w * 0.15 + 3200; mx += 70 + rng() * 90) {
      const up = sstep(1500, 8200, mx / 0.15);
      L.mountains.push([mx, GY - 120 - rng() * 150 - up * 70]);
    }
    for (let rx = -200; rx < L.w * 0.35 + 3200; rx += 60 + rng() * 60) {
      const up = sstep(2600, 7600, rx / 0.35);
      L.ridge.push([rx, GY - 70 - rng() * 50 - (1 - up) * 120]);
    }
  }

  ZS.levelBuilders.chopok = function (rng) {
    const L = K.base('chopok', rng);
    const W = L.w, S = LABELS.signs, C = LABELS.chopok.signs;
    Object.assign(L, {
      startDen: -9999,
      road: { from: -200, to: 8070, bridge: 1880, climb: [4000, 5700] },
      lots: [{ from: 30, to: 1250, lines: true }, { from: 3150, to: 3420, lines: true }, { from: 5780, to: 6020, lines: true }],
      concrete: { from: 30, to: 1250, machine: 610, bus: 1060, cars: [150, 290, 470, 880, 1170] },
      cave: { booth: 3460, group: 3505, door: 3630, from: 3580, to: 4000, exit: 3970, land: 4040 },
      jasna: { from: 5700, to: 7950, hotel: { x: 6250, w: 420 }, bikes: [6980, 7800], mascot: [6560, 7120], slide: 6690 },
      funi: { station: 8000, door: 8055, from: 8090, to: 8370, top: 8310, land: 8410 },
      summit: { rotunda: 8690, from: 8370, to: 9650 },
      chata: { x: 9250, from: 9050, to: 9430, door: 9090, queue: [9136, 9174, 9212], counter: 9254, cook: 9300, exit: 9370 },
      fog: { from: 9600, to: W },
      wind: { from: 8390, to: W },
      crest: { from: 9650, to: 13050, saddle: 10100, krupova: 11700 },
      dumbier: { x: 13570, book: 13616, minister: 13350, crew: 13418 },
      descent: { from: 13750, to: W },
      wildlife: { chamois: [[10980, -1], [11045, 1], [12530, -1]], marmots: [[10350, 52], [12130, 44], [14150, 48]] },
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
    L.posts = [{ x: 2600 }, { x: 10450 }];
    L.logs = [{ x: 1640, w: 96, h: 30 }, { x: 4960, w: 100, h: 32 }];
    L.covers = ROCKS.map(([x, w, h]) => rock(x, w, h)).concat(CAIRNS.map((x) => rock(x, 46, 58, true)), LIMESTONE.map(([x, w, h]) => Object.assign(rock(x, w, h), { lime: true })));
    L.signs = [
      K.sign(1400, () => S.hide, { key: 'ArrowDown' }),
      K.sign(2080, () => S.climb, { key: 'ArrowUp' }),
      K.sign(140, () => C.parking),
      K.sign(1150, () => '', { billboard: true, poster: () => LABELS.chopok.billboard, by: () => LABELS.chopok.billboardBy }),
      K.sign(2600, () => C.cave),
      K.sign(4300, () => C.jasna),
      K.sign(5880, () => ZS.LEVEL_TEXT.chopok.village),
      K.sign(6930, () => C.bikes, { key: 'ArrowDown' }),
      K.sign(7830, () => C.funi),
      K.sign(8935, () => C.chata),
      K.sign(9610, () => C.fog, { key: 'ArrowDown' }),
      K.sign(L.crest.saddle + 120, () => C.saddle),
      K.sign(L.crest.krupova, () => C.krupova),
      K.sign(13790, () => C.descent),
      K.sign(W - 470, () => C.goal),
    ];

    [380, 720, 930].forEach((x) => K.add(L, 'bin', x));
    K.add(L, 'bin', 3290);
    K.add(L, 'container', L.jasna.hotel.x + L.jasna.hotel.w / 2 + 70);

    const open = (x, m) => L.lots.some((l) => x > l.from - m && x < l.to + m)
      || (x > L.cave.booth - 80 - m && x < L.cave.land + 40 + m)
      || (x > L.jasna.hotel.x - L.jasna.hotel.w / 2 - 40 - m && x < L.jasna.hotel.x + L.jasna.hotel.w / 2 + 120 + m)
      || (x > L.funi.station - 110 - m && x < L.summit.to + m)
      || Math.abs(x - L.road.bridge) < 110 + m;
    const blocked = (x) => x > 7280 || open(x, 30)
      || L.posts.some((p) => Math.abs(p.x - x) < 80)
      || L.logs.some((l) => Math.abs(l.x - x) < l.w / 2 + 80)
      || L.covers.some((c) => Math.abs(c.x - x) < c.w / 2 + 50)
      || L.signs.some((s) => Math.abs(s.x - x) < (s.billboard ? 150 : 95))
      || DWARF.some(([a, b]) => x > a - 50 && x < b + 50)
      || Math.abs(x - L.jasna.slide) < 90;
    const spruce = (x) => 0.3 + 0.6 * sstep(L.road.climb[0], L.jasna.from + 400, x);
    K.forest(L, blocked, (x) => {
      const r = rng(), s = spruce(x);
      return r < s ? 'smrek' : r < s + (1 - s) * 0.85 ? 'buk' : 'breza';
    }, (x) => (x > L.jasna.from ? 165 + rng() * 120 : 108 + rng() * 80));
    [[1295, 'buk'], [2045, 'buk'], [2240, 'smrek'], [3080, 'smrek'], [4120, 'smrek'], [5560, 'smrek']].forEach(([x, kind]) => L.trees.push(K.makeTree(rng, kind, x)));
    L.trees.push(Object.assign(K.makeTree(rng, 'smrek', 7880), { h: 250, r: 70 }));
    [[14330, 170, 0.4], [14480, 210, 0.2], [14660, 250, 0.1], [14210, 140, 0.5]].forEach(([x, h, lean]) => L.trees.push(Object.assign(K.makeTree(rng, 'smrek', x), { h, r: 40 + h * 0.13, w: 26 + h * 0.06, lean })));
    L.trees.sort((a, b) => a.x - b.x);
    L.calm = [[L.cave.booth - 100, L.cave.land + 100], [L.funi.station - 120, L.funi.land + 120], [L.chata.from - 120, L.chata.to + 120]];

    K.backTrees(L, (bx) => bx > 6900);
    for (const t of L.backTrees) if (hash(t.x * 0.37) < sstep(3500, 6500, t.x / 0.85)) t.kind = 'smrek';

    const noFood = (fx) => open(fx, 40) || (fx > L.chata.from - 60 && fx < L.chata.to + 60) || Math.abs(fx - L.dumbier.minister) < 120 || fx > L.goalDen - 120 || L.covers.some((c) => Math.abs(c.x - fx) < c.w / 2 + 20);
    K.scatter(L, noFood, 22, (r) => (r < 0.3 ? 'berry' : r < 0.45 ? 'herb' : r < 0.6 ? 'ants' : r < 0.8 ? 'mushroom' : 'nut'));
    L.items = L.items.filter((it) => !(ZS.FOOD[it.type].natural && it.x > L.summit.from && it.type !== 'berry'));
    [9710, 10210, 10910, 11370, 11910, 12310, 12770, 13110, 14070, 14550].forEach((fx, i) => K.add(L, 'berry', fx, i % 2 ? { labelKey: 'lingon' } : {}));
    [8540, 8910].forEach((fx) => K.add(L, 'herb', fx));
    K.honey(L, 4);
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'posed', x: L.posts[0].x, range: 470 },
      { kind: 'posed', x: L.posts[1].x, range: 470 },
      { kind: 'walker', from: 2880, to: 3130 },
      { kind: 'walker', from: 4700, to: 5300 },
      { kind: 'picker', from: 1500, to: 2150 },
      { kind: 'tourist', from: 420, to: 1150 },
      { kind: 'tourist', from: 1450, to: 2250 },
      { kind: 'tourist', from: 2600, to: 3300 },
      { kind: 'tourist', from: 4300, to: 5000 },
      { kind: 'tourist', from: 6080, to: 6700 },
      { kind: 'tourist', from: 8450, to: 8950 },
      { kind: 'tourist', from: 10550, to: 11350 },
      { kind: 'rescuer', from: 11150, to: 12350 },
      { kind: 'tourist', from: 11800, to: 12600 },
      { kind: 'tourist', from: 13950, to: 14600 },
    ];

    rise(L);
    return L;
  };

  const CAVE = { w: 2900, start: 110, domes: [[200, 920], [920, 1520], [1520, 2080], [2080, 2780]], bridge: [1560, 2040], bones: 2560, exit: 2820 };
  const STALAG = [[390, 50, 132], [660, 44, 110], [840, 56, 150], [1080, 48, 124], [1210, 54, 140], [1510, 46, 116], [2190, 52, 136], [2370, 46, 118]];

  function caveStage() {
    const L = K.base('chopok', mulberry32(3011));
    Object.assign(L, { w: CAVE.w, startDen: -9999, goalDen: Infinity, stage: true, cave: Object.assign({}, CAVE) });
    L.covers = STALAG.map(([x, w, h], i) => ({ x, w, h, hide: true, stalag: true, shade: hash(i * 3.7 + 0.2), id: i }));
    return L;
  }

  const CABIN = { w: 980, left: 150, right: 830, door: 180, packs: [[300, 46, 40], [520, 52, 44], [700, 44, 38]] };

  function cabinStage() {
    const L = K.base('chopok', mulberry32(4021));
    Object.assign(L, { w: CABIN.w, startDen: -9999, goalDen: Infinity, stage: true, cabin: Object.assign({}, CABIN) });
    L.covers = CABIN.packs.map(([x, w, h], i) => ({ x, w, h, top: GY - h + 3, hide: true, logs: true, pack: true, shade: hash(i * 5.1), id: i }));
    return L;
  }

  K.caveStage = caveStage;
  K.cabinStage = cabinStage;
  K.CAVE = CAVE;
  K.CABIN = CABIN;
})();
