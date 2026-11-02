(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const K = ZS.levelKit;

  function zone(L) {
    const T = L.lift.tower, W = L.w;
    const hut = { x: W - 755, w: 330 };
    L.alpine = {
      from: T + 150, line: T + 900, to: W, hut,
      thickets: [[T + 935, T + 1065], [T + 1585, T + 1745], [T + 2275, T + 2385], [W - 590, W - 480]],
      marmots: [{ x: T + 1265, h: 60 }, { x: T + 1365, h: 44 }, { x: T + 2190, h: 56 }],
      crag: { from: T + 1640, to: T + 2160, ledges: [[T + 1800, 26], [T + 1870, 40], [T + 1935, 30], [T + 2005, 46]], perch: [[T + 2080, 92], [T + 2125, 134], [T + 2150, 176], [T + 2110, 210]] },
      porter: { from: T + 920, to: hut.x - 120 },
      post: T + 2245,
      lake: { from: hut.x + 40, to: W - 330 },
      boulders: [],
    };
    return L.alpine;
  }

  function build(L) {
    const A = L.alpine, T = L.lift.tower, rng = L.rng;
    L.trees = L.trees.filter((t) => t.x < A.from);
    const spruce = (x, h, lean) => {
      const t = K.makeTree(rng, 'smrek', x);
      t.h = h; t.r = 40 + h * 0.13; t.w = 26 + h * 0.06; t.lean = lean;
      t.hide = true;
      L.trees.push(t);
    };
    const limba = (x, h) => {
      const t = { kind: 'limba', x, w: 30, h, r: 60 + (h - 170) * 0.3, hide: true, shade: rng() };
      L.trees.push(t);
      K.add(L, 'limba', x - 13, { y: GY - h - 4 });
      K.add(L, 'limba', x + 15, { y: GY - h + 14 });
      return t;
    };
    spruce(T + 200, 290, 0);
    limba(T + 620, 200);
    spruce(T + 725, 210, 0.3);
    spruce(T + 810, 175, 0.5);
    spruce(T + 885, 140, 0.7);
    limba(T + 1120, 180);
    limba(T + 1845, 190);
    spruce(T + 1420, 172, 0.4);
    spruce(L.goalDen + 175, 175, 0.25);
    L.trees.sort((a, b) => a.x - b.x);
    [T + 655, T + 1150, T + 1880].forEach((x) => K.add(L, 'limba', x));
    K.add(L, 'berry', T + 1000);
    K.add(L, 'berry', T + 2330);
    K.add(L, 'herb', T + 1460);
    L.items.sort((a, b) => a.x - b.x);
    L.logs.push({ x: T + 1515, w: 112, h: 24, rock: true }, { x: T + 2040, w: 124, h: 30, rock: true });
    L.signs.push(K.sign(T + 290, () => LABELS.signs.tatras));
    L.spawns.push({ kind: 'tourist', from: A.hut.x - 260, to: A.hut.x + 200 }, { kind: 'tourist', from: A.hut.x - 120, to: A.hut.x + 260 });
    let s = 7;
    for (let x = A.line - 260; x < L.goalDen - 190; x += 70 + ((s = (s * 16807) % 2147483647) % 90)) {
      if (Math.abs(x - A.hut.x) < A.hut.w / 2 + 40 || L.logs.some((l) => Math.abs(l.x - x) < l.w / 2 + 30)) continue;
      A.boulders.push({ x, w: 26 + (s % 37), h: 14 + (s % 23), sd: (s % 1000) / 1000 });
    }
  }

  K.alpine = { zone, build };
})();
