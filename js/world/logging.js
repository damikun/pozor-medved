(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { hash, mulberry32 } = ZS.util;
  const K = ZS.levelKit;
  const SPOTS = [[95, 'now'], [210, ''], [320, 'plan'], [440, 'plan'], [555, ''], [665, 'plan'], [785, 'plan'], [900, ''], [1010, 'plan'], [1130, ''], [1245, 'plan'], [1350, 'plan']];
  const STAGE = { w: 2300, from: 390, width: 1400, piles: [152, 497, 843, 1188], off: 165 };
  const SITE = { cp: 430, door: 560, exit: 170 };
  const PILE = { r: 9.6, base: 3, rows: 3 };

  function tree(x, i, kind) {
    const s = hash(i * 7.3 + 1.1), h = 268 + Math.round(hash(i * 3.1 + 0.4) * 56), now = kind === 'now';
    return { kind: 'smrek', x, w: 42 + Math.round(s * 6), h, r: 64 + Math.round(hash(i * 5.7) * 14), hide: true, shade: s, dry: true, plan: !!kind, mark: now, planned: now, teach: now, rub: 0, id: i };
  }

  function pile(x, id, opts) {
    const o = Object.assign({ r: PILE.r, base: PILE.base, rows: PILE.rows, old: true }, opts);
    let n = 0;
    for (let k = 0; k < o.rows; k++) n += Math.max(1, o.base - k);
    const h = 2 * o.r + (o.rows - 1) * o.r * 1.72;
    return Object.assign(o, { x, id, n: o.n === undefined ? n : o.n, full: n, w: o.base * o.r * 2 + 6, top: GY - h + 3, hide: o.n === undefined, logs: true, shade: hash(id * 1.9 + 0.3) });
  }

  function site(L, from, w) {
    const to = from + w, door = from + SITE.door, exit = to - SITE.exit;
    const dry = (dx, i, mark) => ({
      kind: 'smrek', x: from + dx, w: 38 + Math.round(hash(i * 4.1 + 2) * 8), h: 240 + Math.round(hash(i * 2.3 + 1) * 60), r: 60 + Math.round(hash(i * 5.9) * 14),
      hide: true, shade: hash(i * 7.7 + 0.6), dry: true, mark: !!mark, planned: !!mark, rub: 0, id: 60 + i,
    });
    [[210, 0], [372, 1, true], [668, 2, true], [1108, 3], [1216, 4, true], [w - 62, 5]].forEach(([dx, i, mark]) => L.trees.push(dry(dx, i, mark)));
    const piles = [pile(from + 292, 80), pile(from + 772, 81, { base: 5, rows: 4, r: 10 }), pile(from + 1004, 82, { base: 4, rows: 3 })];
    L.covers = (L.covers || []).concat(piles);
    L.clearing = {
      from, to, x: door, exit, cp: from + SITE.cp, piles,
      stumps: [44, 152, 446, 626, 718, 846, 922, 1062, 1162, 1262, w - 118].map((dx, i) => ({ x: from + dx, w: 30 + Math.round(hash(i * 3.3 + 0.7) * 16), id: 90 + i, t: 30 })),
      down: [{ x: from + 880, dir: 1, len: 84, id: 70 }],
      deco: [[86, 236, 0.08], [536, 268, -0.06], [960, 250, 0.1], [w - 150, 230, -0.08]].map(([dx, h, lean], i) => ({ x: from + dx, h, w: 30 + (i % 3) * 3, r: 56 + (i % 4) * 5, id: 30 + i, lean })),
      ruts: [from + SITE.cp - 40, exit + 40],
    };
    L.signs.push(K.sign(from + 120, () => LABELS.signs.logging));
    return L.clearing;
  }

  function stage() {
    const rng = mulberry32(2004), L = K.base('summer', rng);
    const from = STAGE.from, to = from + STAGE.width, trees = SPOTS.map(([dx, kind], i) => tree(from + dx, i, kind));
    Object.assign(L, { w: STAGE.w, startDen: -9999, goalDen: Infinity, stage: true, trees: trees.slice() });
    const deco = [];
    for (const [x, h, lean] of [[96, 300, 0], [212, 250, 0.1], [300, 318, 0], [to + 80, 296, 0], [to + 180, 262, -0.12], [to + 285, 306, 0]]) {
      deco.push({ x, h, w: 40 + (x % 7), r: 66 + (x % 11), id: 20 + deco.length, lean });
    }
    const down = [[150, 1, 250], [to + 130, -1, 230], [to + 340, 1, 200]].map(([x, dir, len], i) => ({ x, dir, len, id: 40 + i }));
    const stacks = STAGE.piles.map((dx, i) => pile(from + dx, 50 + i));
    L.covers = stacks;
    L.logging = {
      from, to, trees, deco, down, stumps: [], stacks, falls: [],
      pile: { x: to - 40, w: 124, h: 64 },
      machine: { x: trees[0].x - STAGE.off, face: 1, turn: 1, reach: 0.15, state: 'park', t: 0, film: 0, filmCd: 0, tree: null, on: false },
      gates: [{ x: from, open: 1 }, { x: to, open: 0 }],
    };
    return L;
  }

  K.clearing = site;
  K.pile = pile;
  K.stage = stage;
  K.STAGE = STAGE;
  K.SITE = SITE;
})();
