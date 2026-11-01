'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

test('the Pribylina skanzen stands by the closed-museum sign, behind the path, with thick trees still in reach', () => {
  const ZS = loadGame({ seed: 3 });
  const L = ZS.makeLevel('summer', 11), K = L.skanzen;
  assert.ok(K.from < K.gate && K.gate < K.to);
  assert.ok(L.signs.some((s) => s.x === K.gate && s.text === ZS.LABELS.signs.skanzen));
  assert.ok(!L.trees.some((t) => Math.abs(t.x - K.tower) < 70), 'the bell tower stands in the open');
  const cover = L.trees.filter((t) => t.hide && t.x > K.from - 200 && t.x < K.to + 100).map((t) => t.x);
  assert.ok(cover.length >= 4, cover.join(', '));
  for (let i = 1; i < cover.length; i++) assert.ok(cover[i] - cover[i - 1] < 600, cover.join(', '));
  assert.equal(ZS.makeLevel('winter', 11).skanzen, undefined);
});

test('the bear walks from the gate past the bell tower and the well without bumping into the museum', () => {
  const ZS = loadGame({ seed: 4 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'summer' });
  g.running = true; g.nextEvent = 1e9; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.drones = [];
  const K = g.level.skanzen, b = g.bear;
  b.x = K.gate - 120; b.dir = 1;
  input.press('ArrowRight', true);
  let last = b.x, stuck = 0;
  for (let i = 0; i < 6 / DT && b.x < K.well + 60; i++) {
    ZS.sim.loop.step(g, DT);
    if (!b.eating && b.x <= last) stuck++;
    last = b.x;
  }
  input.release('ArrowRight');
  assert.ok(b.x >= K.well + 60, String(b.x));
  assert.ok(stuck < 40, stuck + ' frames without moving');
});

test('the skanzen draws cleanly in every season, on a phone and on a laptop, with the bear anywhere along it', () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 3]]) {
    const problems = [];
    const ZS = loadGame({ seed: 5, withRenderer: true, problems });
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW, level: 'summer' });
    g.shooters = []; g.people = [];
    const K = g.level.skanzen;
    g.def.seasons.forEach((s, si) => {
      g.seasonIdx = si; g.seasonKey = s.key; g.time = s.end - 60;
      for (let x = K.from - 300; x <= K.to + 300; x += 9) {
        g.bear.x = x; g.bear.dir = 1;
        g.time += 1 / 30;
        g.cam = ZS.sim.loop.cameraX(g);
        ZS.draw(g, ctx, viewW, offY);
        assert.equal(stackDepth(ctx), 0, `save() without restore() at x ${x}`);
      }
    });
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});
