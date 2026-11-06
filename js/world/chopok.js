(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;

  const ROCKS = [[12360, 82, 38], [12620, 70, 34], [12980, 76, 36], [7180, 70, 34], [8150, 84, 40], [8640, 64, 32], [9050, 90, 42], [9420, 72, 36], [9860, 96, 44], [10180, 70, 34], [10560, 88, 40], [10930, 76, 38], [11290, 92, 44], [11560, 80, 38], [11830, 70, 34]];
  const CAIRNS = [9640, 10760];
  const DWARF = [[5640, 5790], [5960, 6090], [8270, 8400], [9180, 9330], [10330, 10470], [11030, 11150], [12190, 12320], [12450, 12580], [12740, 12880]];

  function rock(x, w, h, cairn) {
    return { x, w, h, top: GY - h + 3, hide: true, logs: true, rock: true, cairn: !!cairn, shade: ZS.util.hash(x * 0.013) };
  }

  ZS.levelBuilders.chopok = function (rng) {
    const L = K.base('chopok', rng);
    const W = L.w, S = LABELS.signs, C = LABELS.chopok.signs;
    Object.assign(L, {
      river: { from: 1300, to: 1560 },
      concrete: { from: 1700, to: 3380, machine: 1850, bus: 2720, hotels: [2050, 2650, 3150] },
      cave: { booth: 3420, group: 3480, door: 3590, from: 3560, to: 3960, exit: 3930, land: 3990 },
      jasna: { from: 4000, to: 6250, hotel: { x: 4520, w: 420 }, bikes: [5180, 6180], mascot: [4880, 5520], slide: 5000 },
      funi: { station: 6330, door: 6385, from: 6420, to: 6700, top: 6640, land: 6740 },
      summit: { rotunda: 7010, from: 6700, to: 8000 },
      chata: { x: 7600, from: 7400, to: 7780, door: 7440, queue: [7486, 7524, 7562], counter: 7604, cook: 7650, exit: 7720 },
      fog: { from: 7950, to: W },
      wind: { from: 6720, to: W },
      crest: { from: 8000, to: 11400, saddle: 8450, krupova: 10050 },
      dumbier: { x: 11920, book: 11966, minister: 11700, crew: 11768 },
      descent: { from: 12100, to: W },
      wildlife: { chamois: [[9330, -1], [9395, 1], [10880, -1]], marmots: [[8700, 52], [10480, 44], [12500, 48]] },
      dwarf: DWARF,
    });
    L.passes = [
      { key: 'cave', from: L.cave.door, to: L.cave.land, wall: L.cave.land - 20 },
      { key: 'funi', from: L.funi.door, to: L.funi.land, wall: L.funi.land - 20 },
    ];
    L.checkpoints = [
      { key: 'cave', x: L.cave.booth - 90 },
      { key: 'caved', x: L.cave.land + 60, after: 'cave' },
      { key: 'funi', x: L.funi.station - 190 },
      { key: 'top', x: L.funi.land + 60, after: 'funi' },
      { key: 'chata', x: L.chata.to + 110 },
      { key: 'ridge', x: L.crest.saddle - 60 },
    ];
    L.posts = [{ x: 800 }, { x: 8800 }];
    L.logs = [{ x: 590, w: 96, h: 30 }, { x: 4180, w: 100, h: 32 }];
    L.stones = [{ x: 1370, w: 60 }, { x: 1450, w: 56 }, { x: 1510, w: 62 }];
    L.covers = ROCKS.map(([x, w, h]) => rock(x, w, h)).concat(CAIRNS.map((x) => rock(x, 46, 58, true)));
    L.signs = [
      K.sign(420, () => S.hide, { key: 'ArrowDown' }),
      K.sign(1130, () => S.climb, { key: 'ArrowUp' }),
      K.sign(1735, () => C.parking),
      K.sign(3040, () => '', { billboard: true, poster: () => LABELS.chopok.billboard, by: () => LABELS.chopok.billboardBy }),
      K.sign(4120, () => ZS.LEVEL_TEXT.chopok.village),
      K.sign(5130, () => C.bikes, { key: 'ArrowDown' }),
      K.sign(6110, () => C.funi),
      K.sign(7285, () => C.chata),
      K.sign(7960, () => C.fog, { key: 'ArrowDown' }),
      K.sign(L.crest.saddle + 120, () => C.saddle),
      K.sign(L.crest.krupova, () => C.krupova),
      K.sign(12140, () => C.descent),
      K.sign(W - 470, () => C.goal),
    ];

    [1905, 2215, 2480].forEach((x) => K.add(L, 'bin', x));
    K.add(L, 'container', L.jasna.hotel.x + L.jasna.hotel.w / 2 + 70);
    [1340, 1420, 1480, 1540].forEach((fx) => K.add(L, 'fish', fx, { y: GY + 30, hidden: true, jumpT: 1 + rng() * 3, jump: -1, labelKey: 'trout' }));

    const open = (x, m) => (x > L.concrete.from - m && x < L.concrete.to + m)
      || (x > L.cave.booth - 80 - m && x < L.cave.land + 40 + m)
      || (x > L.jasna.hotel.x - L.jasna.hotel.w / 2 - 40 - m && x < L.jasna.hotel.x + L.jasna.hotel.w / 2 + 120 + m)
      || (x > L.funi.station - 110 - m && x < L.summit.to + m)
      || (x > L.river.from - 60 - m && x < L.river.to + 60 - m);
    const blocked = (x) => x < 230 || x > 5560 || open(x, 30)
      || L.posts.some((p) => Math.abs(p.x - x) < 80)
      || L.logs.some((l) => Math.abs(l.x - x) < l.w / 2 + 80)
      || L.signs.some((s) => Math.abs(s.x - x) < (s.billboard ? 150 : 95))
      || DWARF.some(([a, b]) => x > a - 50 && x < b + 50)
      || Math.abs(x - L.jasna.slide) < 90;
    K.forest(L, blocked, (x) => {
      if (x > 4000) return rng() < 0.85 ? 'smrek' : 'buk';
      const r = rng();
      return r < 0.6 ? 'buk' : r < 0.93 ? 'smrek' : 'breza';
    }, (x) => (x > 4000 ? 150 + rng() * 110 : 112 + rng() * 80));
    [2330, 2980, 3240, 4070, 4925].forEach((x) => L.trees.push(K.makeTree(rng, 'smrek', x)));
    L.trees.push(Object.assign(K.makeTree(rng, 'smrek', 6195), { h: 250, r: 70 }));
    [[12680, 170, 0.4], [12830, 210, 0.2], [13010, 250, 0.1], [12560, 140, 0.5]].forEach(([x, h, lean]) => L.trees.push(Object.assign(K.makeTree(rng, 'smrek', x), { h, r: 40 + h * 0.13, w: 26 + h * 0.06, lean })));
    L.trees.sort((a, b) => a.x - b.x);
    L.calm = [[L.cave.booth - 100, L.cave.land + 100], [L.funi.station - 120, L.funi.land + 120], [L.chata.from - 120, L.chata.to + 120]];

    K.backTrees(L, (bx) => bx > 5300 || (bx > L.concrete.from && bx < L.concrete.to));

    const noFood = (fx) => open(fx, 40) || (fx > L.chata.from - 60 && fx < L.chata.to + 60) || Math.abs(fx - L.dumbier.minister) < 120 || fx > L.goalDen - 120;
    K.scatter(L, noFood, 18, (r) => (r < 0.3 ? 'berry' : r < 0.45 ? 'herb' : r < 0.6 ? 'ants' : r < 0.8 ? 'mushroom' : 'nut'));
    L.items = L.items.filter((it) => !(ZS.FOOD[it.type].natural && it.x > L.summit.from && it.type !== 'berry' && it.type !== 'fish'));
    [8060, 8560, 9260, 9720, 10260, 10660, 11120, 11460, 12420, 12900].forEach((fx, i) => K.add(L, 'berry', fx, i % 2 ? { labelKey: 'lingon' } : {}));
    [6890, 7260].forEach((fx) => K.add(L, 'herb', fx));
    K.honey(L, 4);
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'posed', x: L.posts[0].x, range: 470 },
      { kind: 'posed', x: L.posts[1].x, range: 470 },
      { kind: 'walker', from: 2860, to: 3330 },
      { kind: 'walker', from: 5000, to: 5620 },
      { kind: 'picker', from: 900, to: 1250 },
      { kind: 'tourist', from: 1760, to: 2560 },
      { kind: 'tourist', from: 2300, to: 3200 },
      { kind: 'tourist', from: 4250, to: 4900 },
      { kind: 'tourist', from: 6800, to: 7300 },
      { kind: 'tourist', from: 8900, to: 9700 },
      { kind: 'rescuer', from: 9500, to: 10700 },
      { kind: 'tourist', from: 10150, to: 10950 },
      { kind: 'tourist', from: 12300, to: 12950 },
    ];

    K.hills(L);
    return L;
  };
})();
