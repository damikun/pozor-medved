(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;
  const { hash, mulberry32 } = ZS.util;

  const SITES = {
    hill: { from: 0, to: 930 },
    castle: { from: 930, to: 2520, gate: 1010, yard: [1060, 1700], palace: [1090, 1890], vitrine: 1770, garden: [1960, 2480] },
    square: { from: 2520, to: 3800, plane: 2650, flag: 3240, pen: [2720, 3130], reporter: 2860, interns: [2995, 3115], cordon: [3330, 3610], vans: [3420, 3550], gate: 3700, facade: 3640 },
    inside: { from: 3800, to: 6720 },
    hall: { from: 3800, to: 4150, frame: 3905, guard: 3975 },
    corridor: { from: 4150, to: 5060, flinta: 4880, door: 5080 },
    bar: { from: 5380, to: 6000, rack: 5440, tables: [5545, 5675, 5805], counter: 5905, cook: 5925, exit: 5990 },
    tunnel: { hatch: 5800, from: 6000, to: 6720, door: 6705, lift: 6675, exit: 6800, low: [[6110, 6290], [6460, 6620]], room: [6300, 6450], spy: 6405, cabinet: 6330 },
    town: { from: 6720, to: 8180, stairs: [6760, 7120], cumil: 7400, napoleon: 7650, stall: 7860, tram: [8000, 8090] },
    bank: { from: 8180, to: 8900, booth: 8380, board: 8470, pier: 8600 },
    luh: { from: 8900, to: 11200, beaver: 9600, river: [9840, 10260], cove: [8900, 9420], jetty: 9420 },
  };
  const HEDGES = [[2010, 2110], [2180, 2290], [2370, 2470]];
  const TRIPODS = [2790, 2925];
  const NICHES = [];
  const FICUS = [4250, 4720];
  const PILLARS = [4390, 4600];
  const MANHOLE = 7440;

  function cover(x, w, h, extra) {
    return Object.assign({ x, w, h, top: GY - h, hide: true, shade: hash(x * 0.021) }, extra);
  }

  ZS.levelBuilders.capital = function (rng) {
    const L = K.base('capital', rng);
    const W = L.w, C = LABELS.capital.signs;
    Object.assign(L, {
      startDen: -9999,
      capital: SITES,
      hedges: HEDGES,
      tripods: TRIPODS,
      niches: NICHES,
      manhole: MANHOLE,
      indoor: [SITES.inside.from, SITES.inside.to],
      river: { from: SITES.luh.river[0], to: SITES.luh.river[1] },
      stones: [{ x: 9930, w: 60 }, { x: 10050, w: 54 }, { x: 10170, w: 58 }],
    });
    L.passes = [
      { key: 'vote', from: SITES.corridor.door, to: SITES.corridor.door + 120, wall: SITES.corridor.door + 100 },
      { key: 'boat', from: SITES.bank.pier, to: SITES.luh.jetty - 30, wall: SITES.luh.jetty - 40, strand: true },
    ];
    L.checkpoints = [
      { key: 'hrad', x: 900 },
      { key: 'press', x: 2560 },
      { key: 'door', x: 4070 },
      { key: 'vote', x: 4990 },
      { key: 'voted', x: SITES.corridor.door + 180, after: 'vote' },
      { key: 'mesto', x: 6800 },
      { key: 'boat', x: 8250 },
      { key: 'luh', x: SITES.luh.jetty + 90, after: 'boat' },
    ];
    L.posts = [
      { x: 1380, kind: 'statue', hatch: 40, rise: 64, inT: 0.8, snack: false },
      { x: 1890, kind: 'scaffold', hatch: 48, rise: 112, snackKey: 'workerSnack' },
    ];
    L.covers = FICUS.map((x) => cover(x, 64, 150, { ficus: true }))
      .concat(PILLARS.map((x) => cover(x, 58, 220, { pillar: true })))
      .concat([cover(SITES.bar.rack, 60, 150, { rack: true })]);
    L.dwarf = HEDGES.concat(TRIPODS.map((x) => [x - 34, x + 34]), NICHES.map((x) => [x - 36, x + 36]), [[MANHOLE - 24, MANHOLE + 24], [SITES.town.napoleon - 40, SITES.town.napoleon + 40], [SITES.bar.counter - 70, SITES.bar.counter - 30], [SITES.castle.yard[0] + 140, SITES.castle.yard[0] + 200], [SITES.hall.guard - 34, SITES.hall.guard + 40], [SITES.tunnel.cabinet - 22, SITES.tunnel.cabinet + 22]]);
    L.cave = { low: [[SITES.tunnel.hatch - 50, SITES.tunnel.hatch + 30]].concat(SITES.tunnel.low) };
    L.signs = [];
    L.calm = [[SITES.square.pen[0] - 100, SITES.inside.to + 80], [SITES.bank.from, SITES.bank.to + 120]];

    const indoor = (x, m) => x > SITES.square.cordon[0] - m && x < SITES.inside.to + m;
    const blocked = (x) => indoor(x, 60)
      || (x > SITES.castle.gate - 90 && x < SITES.castle.yard[1] + 40)
      || (x > SITES.castle.vitrine - 80 && x < 1950)
      || (x > SITES.square.from - 60 && x < SITES.square.cordon[0])
      || (x > SITES.town.from - 40 && x < SITES.bank.pier + 380)
      || (x > SITES.luh.river[0] - 80 && x < SITES.luh.river[1] + 80)
      || (x > SITES.luh.cove[0] - 80 && x < SITES.luh.jetty + 60)
      || HEDGES.some(([a, z]) => x > a - 50 && x < z + 50)
      || L.posts.some((p) => Math.abs(p.x - x) < 80)
      || L.signs.some((s) => Math.abs(s.x - x) < 90)
      || x > W - 380;
    K.forest(L, blocked, (x) => (x < SITES.hill.to ? 'buk' : x < SITES.castle.to ? (rng() < 0.4 ? 'jablon' : 'buk') : rng() < 0.18 ? 'breza' : 'buk'),
      (x) => (x < SITES.hill.to ? 210 + rng() * 80 : x < SITES.castle.to ? 150 + rng() * 60 : 120 + rng() * 80));
    L.trees = L.trees.filter((t) => t.x > 300 || t.x < 200);
    [[SITES.square.plane, 'buk', 58, 270, 112], [380, 'buk', 54, 250, 100], [760, 'buk', 52, 240, 96], [6900, 'buk', 50, 230, 92], [8190, 'buk', 54, 250, 100], [SITES.luh.beaver, 'buk', 50, 290, 96]].forEach(([x, kind, w, h, r]) => {
      L.trees = L.trees.filter((t) => Math.abs(t.x - x) > 70);
      L.trees.push(Object.assign(K.makeTree(rng, kind, x), { w, h, r }));
    });
    L.trees.find((t) => t.x === SITES.luh.beaver).beaver = true;
    L.trees.push({ kind: 'pole', pole: true, x: SITES.square.flag, w: 12, h: 290, r: 40, hide: true, shade: 0.3 });
    L.trees.sort((a, b) => a.x - b.x);
    L.trees.sort((a, b) => a.x - b.x);
    K.backTrees(L, (bx) => indoor(bx / 0.85, 300) || (bx / 0.85 > SITES.castle.palace[0] - 100 && bx / 0.85 < SITES.square.to) || (bx / 0.85 > SITES.town.from - 100 && bx / 0.85 < SITES.bank.to + 100));

    [6900, 8150].forEach((x) => K.add(L, 'bin', x));
    K.add(L, 'jewels', SITES.castle.vitrine, { locked: true, vitrine: true, hidden: true });
    SITES.bar.tables.forEach((x, i) => K.add(L, i === 2 ? 'chlebicek' : 'chlebicek', x + 18, { plate: true, table: i }));
    [4320, 4810].forEach((x) => K.add(L, 'rozok', x, { dropped: true }));
    const noFood = (fx) => indoor(fx, 80) || (fx > SITES.castle.gate - 180 && fx < SITES.square.to) || (fx > SITES.town.from - 60 && fx < SITES.bank.to + 80)
      || (fx > SITES.luh.river[0] - 40 && fx < SITES.luh.river[1] + 40) || (fx > SITES.luh.cove[0] - 60 && fx < SITES.luh.jetty + 60) || fx > L.goalDen - 120 || fx < 250;
    K.scatter(L, noFood, 9, (r) => (r < 0.35 ? 'berry' : r < 0.55 ? 'nut' : r < 0.75 ? 'herb' : 'mushroom'));
    [9580, 9720, 10420, 10620, 10820].forEach((fx) => K.add(L, 'berry', fx, { labelKey: 'blackberry' }));
    [9960, 10100, 10220].forEach((fx) => K.add(L, 'fish', fx, { y: GY + 30, hidden: true, jumpT: 1 + rng() * 3, jump: -1, labelKey: 'danubeFish' }));
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'tourist', from: 420, to: 880, look: 1 },
      { kind: 'tourist', from: SITES.castle.yard[0] + 40, to: SITES.castle.yard[1] - 40, look: 2 },
      { kind: 'tourist', from: SITES.castle.yard[0] + 120, to: SITES.castle.yard[1], look: 3 },
      { kind: 'tourist', from: SITES.castle.garden[0], to: SITES.castle.garden[1], look: 6 },
      { kind: 'tourist', from: SITES.town.stairs[1], to: SITES.town.tram[0] - 80, look: 4 },
      { kind: 'tourist', from: SITES.town.cumil - 200, to: SITES.town.stall + 60, look: 5 },
      { kind: 'patrol', from: 10300, to: 10750 },
    ];
    L.signs.sort((a, b) => a.x - b.x);
    for (let mx = -200; mx < W * 0.15 + 3200; mx += 90 + rng() * 90) L.mountains.push([mx, GY - 130 - rng() * 70 - 60 * Math.max(0, 1 - Math.abs(mx - 300) / 600)]);
    for (let rx = -200; rx < W * 0.35 + 3200; rx += 70 + rng() * 60) L.ridge.push([rx, GY - 46 - rng() * 30]);
    return L;
  };

  const PLENARY = { w: 1400, start: 110, exit: 1330, seats: [250, 365, 480, 595, 785, 900, 1015, 1130], rostrum: 690, cam: 1240, lamp: 690 };

  function plenaryStage() {
    const L = K.base('capital', mulberry32(5111));
    Object.assign(L, { w: PLENARY.w, startDen: -9999, goalDen: Infinity, stage: true, plenary: Object.assign({}, PLENARY) });
    L.dwarf = PLENARY.seats.map((x) => [x - 40, x + 40]);
    return L;
  }

  const BOAT = { w: 12700, start: 200 };

  function boatStage() {
    const L = K.base('capital', mulberry32(6121));
    Object.assign(L, { w: BOAT.w, startDen: -9999, goalDen: Infinity, stage: true, boat: Object.assign({}, BOAT) });
    return L;
  }

  K.plenaryStage = plenaryStage;
  K.boatStage = boatStage;
  K.PLENARY = PLENARY;
  K.BOAT = BOAT;
})();
