(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;
  const { hash, mulberry32 } = ZS.util;

  const SITES = {
    woods: { from: 0, to: 1000, brook: [560, 840], fisher: 970 },
    park: { from: 1000, to: 2000, booth: 1070, jam: [{ x: 1300, w: 136, h: 52, hood: 30, cab: [-0.3, 0.2], kind: 'sedan' }, { x: 1448, w: 152, h: 66, hood: 40, cab: [-0.34, 0.3], kind: 'suv' }, { x: 1612, w: 168, h: 88, hood: 50, cab: [-0.47, 0.32], kind: 'van' }], promo: 1840, picnic: 1930 },
    gate: { from: 2000, to: 2240, arch: 2120, steward: 2080, line: 2140 },
    obec: { from: 2240, to: 4000, houses: [2390, 2680, 3250, 3540, 3830], church: 2940, arches: [3090, 3395] },
    jarmok: { from: 4000, to: 4350, stalls: [], halusky: 4230, queue: 4 },
    back: { from: 4350, to: 5000, tents: [4415], rack: 4610, costumer: 4640, inspic: [4370, 4980], firemen: 4820, truck: 4910 },
    scena: { from: 5000, to: 5820, stage: [5090, 5400], benches: [5460, 5800], stairs: 5050, door: [5010, 5090], wall: 5090 },
    noc: { from: 5820, to: 7400, tent: [5920, 6300], etno: 6480, radio: 6690, camp: [6800, 7190], wc: 7280 },
    end: { from: 7400, to: 8340 },
  };
  const BACK_CARS = [1160, 1270, 1400, 1530, 1660, 1790, 1900];
  const TENTS = [6860, 7000, 7140];

  function cover(x, w, h, extra) {
    return Object.assign({ x, w, h, top: GY - h, hide: true, shade: hash(x * 0.021) }, extra);
  }

  ZS.levelBuilders.vychodna = function (rng) {
    const L = K.base('vychodna', rng);
    const W = L.w, S = SITES;
    Object.assign(L, {
      startDen: -9999,
      vychodna: SITES,
      backCars: BACK_CARS,
      tents: TENTS,
      river: { from: S.woods.brook[0], to: S.woods.brook[1] },
      stones: [{ x: 640, w: 58 }, { x: 760, w: 56 }],
      logs: [].concat(...S.park.jam.map((j, i) => [{ x: j.x, w: j.w - 8, h: j.hood, of: true, car: i }, { x: j.x + (j.cab[0] + j.cab[1]) / 2 * j.w, w: (j.cab[1] - j.cab[0]) * j.w, h: j.h, of: true, car: i }])),
    });
    L.passes = [{ key: 'tanec', from: S.scena.door[0], to: S.noc.from + 20, wall: S.noc.from, open: (g) => !!g.once.kroj }];
    L.checkpoints = [
      { key: 'parkovisko', x: S.park.from + 40 },
      { key: 'brana', x: S.gate.from - 60 },
      { key: 'sprievod', x: S.obec.from + 30 },
      { key: 'jarmok', x: S.jarmok.from + 20 },
      { key: 'zakulisie', x: S.back.from + 20 },
      { key: 'scena', x: S.scena.door[0] - 50 },
      { key: 'tanec', x: S.noc.from + 120, after: 'tanec' },
      { key: 'noc', x: S.end.from + 40 },
    ];
    L.covers = [cover(S.back.tents[0] + 70, 64, 140, { flap: true })];
    L.dwarf = [[S.noc.wc - 30, S.noc.wc + 30]]
      .concat(TENTS.map((x) => [x - 46, x + 46]));
    L.dwarf.sort((a, b) => a[0] - b[0]);
    L.signs = [];

    const blocked = (x) => (x > S.park.from - 60 && x < S.end.from + 40)
      || (x > S.woods.brook[0] - 70 && x < S.woods.brook[1] + 70)
      || x > W - 420 || x < 230;
    K.forest(L, blocked, (x) => 'smrek', (x) => 130 + rng() * 90);
    [[S.jarmok.from + 40, 'smrek', 54, 300, 86], [S.end.from + 20, 'smrek', 50, 320, 88]].forEach(([x, kind, w, h, r]) => {
      L.trees = L.trees.filter((t) => Math.abs(t.x - x) > 70);
      L.trees.push(Object.assign(K.makeTree(rng, kind, x), { w, h, r }));
    });
    L.trees.push(Object.assign(K.makeTree(rng, 'jablon', S.obec.houses[0] + 130), { x: S.obec.houses[0] + 130 }));
    L.trees.sort((a, b) => a.x - b.x);
    K.backTrees(L, (bx) => { const x = bx / 0.85; return (x > S.park.from - 100 && x < S.gate.to) || (x > S.scena.from - 200 && x < S.scena.to + 100); });

    K.add(L, 'rezen', S.park.picnic, { picnic: true });
    K.add(L, 'kolac', S.obec.houses[2] + 175, { dropped: true });
    K.add(L, 'lokse', S.noc.tent[1] + 60, { plate: true });
    K.add(L, 'sausage', S.gate.to + 70, { dropped: true });
    K.add(L, 'candy', S.obec.houses[1] + 170, { dropped: true });
    K.add(L, 'kolac', S.obec.houses[4] - 140, { dropped: true });
    K.add(L, 'cheese', S.jarmok.halusky - 150, { dropped: true });
    K.add(L, 'sausage', S.back.firemen + 70, { plate: true });
    K.add(L, 'pagac', S.noc.etno + 120, { plate: true });
    [S.park.from + 200, S.jarmok.to - 40, S.noc.camp[1] + 120].forEach((x) => K.add(L, 'bin', x));
    const noFood = (fx) => (fx > S.park.from - 40 && fx < S.end.from + 40) || (fx > S.woods.brook[0] - 40 && fx < S.woods.brook[1] + 40) || fx > L.goalDen - 120 || fx < 250;
    K.scatter(L, noFood, 14, (r) => (r < 0.35 ? 'berry' : r < 0.55 ? 'mushroom' : r < 0.75 ? 'herb' : 'nut'));
    [S.end.from + 260, S.end.from + 480, S.end.from + 700].forEach((fx) => K.add(L, 'berry', fx, { labelKey: 'blueberry' }));
    K.honey(L, 2);
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'walker', from: S.end.from + 300, to: W - 500 },
    ];
    for (let mx = -200; mx < W * 0.15 + 3200; mx += 90 + rng() * 90) L.mountains.push([mx, GY - 150 - rng() * 120]);
    for (let rx = -200; rx < W * 0.35 + 3200; rx += 60 + rng() * 60) L.ridge.push([rx, GY - 56 - rng() * 40]);
    return L;
  };

  const DANCE = { w: 1000, start: 300, stage: [140, 860], center: 470 };

  function danceStage() {
    const L = K.base('vychodna', mulberry32(7211));
    Object.assign(L, { w: DANCE.w, startDen: -9999, goalDen: Infinity, stage: true, dance: Object.assign({}, DANCE) });
    return L;
  }

  K.danceStage = danceStage;
  K.DANCE = DANCE;
  K.VYCHODNA = SITES;
})();
