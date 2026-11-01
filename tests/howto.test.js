'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const EXPECT = {
  walk: (g, seen) => seen.ran && seen.right,
  hide: (g, seen) => seen.hidden && seen.treeShot,
  climb: (g, seen) => seen.covered,
  stomp: (g) => g.stats.stomps === 1,
  hug: (g) => g.stats.hugs === 1,
  shake: (g, seen) => seen.toppled,
  bite: (g) => g.stats.bites === 1 && g.problem,
  forage: (g) => g.stats.natural === 3,
  raid: (g) => g.stats.human === 1 && g.stats.seen >= 1,
  panic: (g) => g.drones.length === 1 && g.stats.seen >= 2,
};

function watch(g, seen) {
  const b = g.bear;
  if (b.running && b.moving) seen.ran = true;
  if (b.moving && b.dir > 0) seen.right = true;
  if (b.hiding) seen.hidden = true;
  if (g.shots.length) seen.treeShot = true;
  if (b.climbing && b.covered) seen.covered = true;
  if (g.shooters.some((s) => s.react === 'drop')) seen.toppled = true;
}

function play(ZS, id, touch, problems) {
  const H = ZS.howto, d = H.create(id, { touch });
  const ctx = createCanvas(1624, 420, problems).getContext('2d');
  const first = d.g, lit = new Set(), seen = {};
  let shown = false;
  for (let frame = 0; frame < (d.def.dur + 0.7) * 60; frame++) {
    H.advance(d, 1 / 60);
    H.draw(d, ctx, 1624, 420, 0.22);
    assert.equal(stackDepth(ctx), 0, `${id}: save() without restore() at frame ${frame}`);
    watch(d.g, seen);
    for (const k of H.lit(d)) lit.add(k);
    if (!shown && d.t >= d.def.dur) shown = EXPECT[id](d.g, seen);
  }
  return { d, first, seen, lit, shown };
}

for (const touch of [false, true]) {
  test(`every how-to scene plays its move with the real game and draws cleanly, ${touch ? 'touch' : 'keyboard'}`, () => {
    const problems = [];
    const ZS = loadGame({ seed: 3, withRenderer: true, problems });
    const ended = [], news = [];
    ZS.sim.rules.onEnd = (g) => ended.push(g);
    ZS.sim.rules.onNews = (item) => news.push(item);
    for (const id of ZS.howto.ids) {
      const { d, first, lit, shown } = play(ZS, id, touch, problems);
      assert.equal(d.g, first, `${id} plays once and holds its last frame`);
      assert.ok(shown, `${id} shows its move within ${d.def.dur} s`);
      for (const k of ZS.howto.keysOf(d)) assert.ok(lit.has(k), `${id} lights ${k}`);
      if (touch) assert.ok(!ZS.howto.keysOf(d).includes('Space') && !ZS.howto.keysOf(d).includes('ShiftLeft'), `${id} shows touch buttons`);
    }
    assert.deepEqual(ended, [], 'a scene never ends a run');
    assert.deepEqual(news, [], 'a scene never reaches the news ticker');
    assert.equal(ZS.ui.input.state.keys.size, 0, 'the player keys are untouched');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}

test('a still frame for reduced motion shows the move in progress', () => {
  const problems = [];
  const ZS = loadGame({ seed: 5, withRenderer: true, problems });
  const ctx = createCanvas(222, 120, problems).getContext('2d');
  for (const id of ZS.howto.ids) {
    const d = ZS.howto.create(id, { touch: false });
    ZS.howto.still(d);
    assert.ok(Math.abs(d.t - d.def.still) < 0.02, id);
    ZS.howto.draw(d, ctx, 222, 120);
  }
  assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
});

test('every scene has a caption in every language, for keys and for touch', () => {
  const ZS = loadGame({ seed: 1, withRenderer: true });
  for (const code of ZS.i18n.codes()) {
    const UI = ZS.LANGS[code].UI;
    assert.deepEqual(Object.keys(UI.tips), [...ZS.howto.ids], code);
    assert.deepEqual(Object.keys(UI.tipsTouch), [...ZS.howto.ids], code);
    for (const id of ZS.howto.ids) {
      const d = ZS.howto.create(id, { touch: false });
      for (const k of ZS.howto.keysOf(d)) assert.ok(UI.keys[k], `${code} names the ${k} key`);
    }
  }
});
