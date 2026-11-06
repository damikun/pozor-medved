(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;

  ZS.levelBuilders.winter = function (rng) {
    const L = K.base('winter', rng);
    const W = L.w, S = LABELS.signs;
    Object.assign(L, {
      village: { from: 4280, to: 5900 },
      ice: { from: 3620, to: 3980 },
      fisher: { x: 3852, catch: 3770, gone: false },
      park: { from: 9100, to: W - 300 },
      chata: { x: 6150 },
      lift: { x: 6960, tower: 7510 },
      tycoon: { x: 7345 },
      slope: { from: 6000, to: 7700 },
      lot: { from: 7950, to: 8470, front: [7990, 8042, 8094, 8146, 8198, 8250], rack: [7976, 8264], stands: [8020, 8122, 8224], barrel: 8298, seller: 8326, booth: 8394 },
      feeding: 2300,
    });
    L.cannons = [{ x: 410, dir: 1 }, { x: 6520, dir: 1 }];
    L.feeders = [{ x: L.feeding }];
    L.stalls = [{ x: 4830, kind: 'punch' }, { x: 4990, kind: 'lokse' }, { x: 5150, kind: 'sausage' }, { x: 5310, kind: 'cheese' }];
    L.checkpoints = [{ key: 'market', x: L.village.to + 40 }, { key: 'lift', x: L.lift.x - 120 }];
    L.snowmen = [{ x: 5800, nose: true }, { x: 7260, nose: true }];
    L.holes = [{ x: 3800 }];
    L.houses = [{ x: 4690, w: 160 }, { x: 5620, w: 170 }];
    L.posts = [{ x: 1550 }, { x: 2640 }, { x: 8650 }];
    L.logs = [{ x: 1180, w: 100, h: 32 }, { x: 2960, w: 96, h: 30 }, { x: 7820, w: 110, h: 34 }, { x: 9600, w: 100, h: 32 }];
    L.signs = [
      K.sign(900, () => S.cannon),
      K.sign(1330, () => S.hide, { key: 'ArrowDown', teach: 'hide' }),
      K.sign(2130, () => S.feeder),
      K.sign(3530, () => S.ice),
      K.sign(4380, () => '', { billboard: true }),
      K.sign(4540, () => ZS.LEVEL_TEXT.winter.village),
      K.sign(7100, () => S.lift),
      K.sign(7880, () => S.lot, { key: 'ArrowDown' }),
      K.sign(9150, () => S.quiet),
      K.sign(9950, () => S.cave),
      K.sign(W - 470, () => S.winterGoal),
    ];

    L.feeders.forEach((f) => K.add(L, 'feeder', f.x));
    L.stalls.forEach((s) => K.add(L, s.kind, s.x));
    L.snowmen.forEach((s) => K.add(L, 'carrot', s.x));
    K.add(L, 'chatabin', L.chata.x + 190);
    K.add(L, 'catch', L.fisher.catch);

    const xmas = Object.assign(K.makeTree(rng, 'smrek', 5440), { xmas: true, h: 250, r: 78, w: 40 });
    L.trees.push(xmas);
    const orchard = 3260;
    L.trees.push(K.makeTree(rng, 'jablon', orchard));
    K.add(L, 'frozenapple', orchard + 26);
    K.add(L, 'frozenapple', orchard - 30, { y: GY - 160 });
    K.add(L, 'frozenapple', orchard + 28, { y: GY - 148 });

    const spray = (x) => L.cannons.some((c) => {
      const a = c.x - 70, b = c.x + c.dir * 250;
      return x > Math.min(a, b) - 20 && x < Math.max(a, b) + 20;
    });
    const blocked = (x) => x < 300 || x > W - 480
      || spray(x)
      || Math.abs(x - L.feeding) < 120
      || (x > L.ice.from - 80 && x < L.ice.to + 80)
      || (x > L.village.from - 40 && x < L.village.to + 40)
      || (x > L.chata.x - 150 && x < L.chata.x + 260)
      || (x > L.lot.from - 60 && x < L.lot.to + 50)
      || Math.abs(x - L.lift.x) < 60
      || Math.abs(x - orchard) < 90
      || L.snowmen.some((s) => Math.abs(s.x - x) < 70)
      || L.posts.some((p) => Math.abs(p.x - x) < 80)
      || L.logs.some((l) => Math.abs(l.x - x) < l.w / 2 + 80)
      || L.signs.some((s) => Math.abs(s.x - x) < (s.billboard ? 150 : 95));
    K.forest(L, blocked, (x) => {
      if (x > L.park.from) return rng() < 0.85 ? 'smrek' : 'buk';
      const r = rng();
      return r < 0.62 ? 'smrek' : r < 0.93 ? 'buk' : 'breza';
    }, (x) => (x > L.park.from ? 150 + rng() * 100 : 115 + rng() * 85));
    const extra = [['smrek', 4105], ['buk', 4215], ['buk', 5975]];
    L.trees = L.trees.filter((t) => t.xmas || t.kind === 'jablon' || !extra.some(([, x]) => Math.abs(t.x - x) < 90));
    extra.forEach(([kind, x]) => L.trees.push(K.makeTree(rng, kind, x)));
    L.trees.sort((a, b) => a.x - b.x);

    K.backTrees(L, (bx) => (bx > L.village.from && bx < L.village.to) || (bx > L.chata.x - 120 && bx < L.chata.x + 120));

    K.scatter(L, (fx) => (fx > L.village.from - 60 && fx < L.village.to + 60)
      || (fx > L.ice.from - 40 && fx < L.ice.to + 40)
      || Math.abs(fx - L.feeding) < 140
      || (fx > L.chata.x - 160 && fx < L.chata.x + 260)
      || (fx > L.lot.from - 20 && fx < L.lot.to + 20)
      || spray(fx), 11,
    (r) => (r < 0.32 ? 'rosehip' : r < 0.7 ? 'snownut' : 'rowan'));
    K.honey(L, 4, 'stash');
    L.trees.push({ kind: 'smrek', x: L.lot.to + 75, w: 48, h: 320, r: 90, hide: true, shade: 0.37 });
    L.trees.sort((a, b) => a.x - b.x);
    L.holes.forEach((h) => K.add(L, 'fish', h.x, { y: GY + 30, hidden: true, jumpT: 1 + rng() * 2, jump: -1, label: LABELS.icefish }));
    L.items.sort((a, b) => a.x - b.x);

    L.spawns = [
      { kind: 'posed', x: 1550, range: 470 },
      { kind: 'posed', x: 2640, range: 480 },
      { kind: 'posed', x: 8650, range: 480 },
      { kind: 'walker', from: 3050, to: 3500 },
      { kind: 'walker', from: 7450, to: 8350 },
      { kind: 'walker', from: 8800, to: 9700 },
      { kind: 'tourist', from: 4420, to: 5300 },
      { kind: 'tourist', from: 4700, to: 5700 },
      { kind: 'santa', from: 4600, to: 5500 },
      { kind: 'tourist', from: 6000, to: 6900 },
      { kind: 'tourist', from: 6650, to: 7350 },
      { kind: 'tycoon', from: L.tycoon.x, to: L.tycoon.x },
    ];
    [2120, 2260, 2470].forEach((x, i) => L.spawns.push({ kind: 'deer', from: 1960, to: 2640, x, i }));

    K.hills(L);
    return L;
  };
})();
