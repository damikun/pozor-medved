'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(seed = 4, { draw = false, w = 1280, h = 720 } = {}) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer: draw, problems });
  const { input } = ZS.ui;
  const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale;
  const g = ZS.sim.rules.create(input.state, { viewW, level: 'summer' });
  const said = [], sounds = [];
  ZS.sim.rules.onNews = (item) => said.push(item.text);
  ZS.sim.rules.onSound = (gg, name, x, k) => sounds.push({ name, x, k, t: gg.time });
  g.running = true; g.nextEvent = 1e9; g.time = 130; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  const ctx = draw ? createCanvas(w, h, problems).getContext('2d') : null;
  if (ctx) ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const step = () => {
    ZS.sim.loop.step(g, DT);
    if (ctx) {
      ZS.draw(g, ctx, viewW, (h / scale - 540) * 0.45);
      assert.equal(stackDepth(ctx), 0, 'save() without restore()');
    }
  };
  const run = (seconds, each) => { for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) { step(); if (each) each(); } };
  const press = (key) => { input.press(key, false); step(); input.release(key); };
  return { ZS, g, b: g.bear, L: g.level, run, press, said, sounds, problems };
}

test('a wildlife photographer lies just beyond the Belá ford, with a stretch of forest before the tourists and the hotel, only in summer', () => {
  const ZS = loadGame({ seed: 1 });
  const L = ZS.makeLevel('summer', 11), P = L.photographer, H = L.hotel.x - L.hotel.w / 2;
  assert.ok(P.x - 60 > L.river.to && P.x + 450 < H, P.x + ' ' + H);
  assert.ok(L.spawns.filter((s) => s.kind === 'tourist' && s.from > P.x).every((s) => s.from > P.x + 450));
  const gap = L.trees.filter((t) => t.x > P.x + 80 && t.x < H - 20);
  assert.ok(gap.length >= 2 && gap.every((t) => ['buk', 'smrek', 'breza'].includes(t.kind)), gap.map((t) => t.kind + ' ' + Math.round(t.x)).join(', '));
  assert.equal(P.dir, -1, 'the lens points at the river');
  assert.equal(ZS.makeLevel('winter', 11).photographer, undefined);
});

test('standing in the river and pressing C, the bear poses with a trout for a long shutter burst that counts like a selfie', async (t) => {
  const s = setup();
  const { ZS, g, b, run, press, said, sounds } = s;
  b.x = 8920; b.dir = -1;
  run(0.5);
  const p = g.photographer, x0 = p.x, panic = (g.panic = 40);

  await t.test('the reach hint offers the pose while the bear is in the water', () => {
    assert.ok(b.inWater);
    assert.equal(b.reach, p);
    assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.photo.hello));
    assert.ok(said.concat(g.tickerQueue.map((q) => q.text)).includes(ZS.NEWS.photoWait));
  });

  press('KeyC');
  await t.test('the bear turns to the camera and poses instead of hugging the air', () => {
    assert.equal(b.act.kind, 'pose');
    assert.equal(b.dir, 1);
    assert.equal(b.act.target, p);
  });

  const before = sounds.filter((e) => e.name === 'shutter').length;
  let shout = false;
  run(ZS.sim.photographer.POSE, () => { shout = shout || g.floaters.some((f) => ZS.LABELS.photo.pose.includes(f.text)); });
  await t.test('the photographer fires a long burst, shouts and never moves', () => {
    const shots = sounds.filter((e) => e.name === 'shutter').length - before;
    assert.ok(shots >= 12, shots + ' frames');
    assert.equal(p.x, x0);
    assert.ok(shout);
  });

  await t.test('it counts toward the hug goal, calms the panic and makes the news', () => {
    assert.equal(g.stats.selfies, 1);
    assert.ok(ZS.sim.rules.hugged(g));
    assert.ok(g.panic < panic, 'panic ' + g.panic.toFixed(1));
    assert.ok(said.concat(g.tickerQueue.map((q) => q.text)).includes(ZS.NEWS.photo[0]));
  });

  await t.test('it cannot be farmed: during the cooldown the bear still poses and he still shoots, but nothing counts', () => {
    run(0.5);
    assert.equal(b.reach, p);
    const shots = sounds.filter((e) => e.name === 'shutter').length, syn = g.syn, news = said.length;
    press('KeyC');
    assert.equal(b.act.kind, 'pose');
    assert.equal(b.act.paid, false);
    run(ZS.sim.photographer.POSE);
    assert.ok(sounds.filter((e) => e.name === 'shutter').length - shots >= 12);
    assert.equal(g.stats.selfies, 1);
    assert.ok(g.syn <= syn);
    assert.ok(!g.floaters.some((f) => f.text === ZS.LABELS.photo.shot));
    assert.ok(!said.slice(news).concat(g.tickerQueue.map((q) => q.text)).some((x) => ZS.NEWS.photo.includes(x) && x !== ZS.NEWS.photo[0]));
  });

  await t.test('after the cooldown the bear can pose again', () => {
    run(ZS.sim.photographer.REST);
    assert.equal(b.reach, p);
    press('KeyC');
    run(ZS.sim.photographer.POSE);
    assert.equal(g.stats.selfies, 2);
  });
});

test('on land C makes the bear pose too, without a trout or a splash, and a bite still works', async (t) => {
  const s = setup(5);
  const { ZS, g, b, run, press, sounds } = s;
  const p = () => g.photographer;
  b.x = 9110; b.dir = 1;
  run(0.2);
  const x0 = p().x;
  let close = false;
  ZS.ui.input.press('ArrowRight', true);
  run(2, () => {
    if (Math.abs(b.x - x0) < 60) ZS.ui.input.release('ArrowRight');
    close = close || g.floaters.some((f) => f.text === ZS.LABELS.photo.close);
  });
  ZS.ui.input.release('ArrowRight');
  run(0.3);

  await t.test('the bear walking up does not scare him off, he just complains about the focus', () => {
    assert.equal(p().x, x0);
    assert.equal(p().react, null);
    assert.ok(close);
    assert.equal(b.reach, p());
  });

  await t.test('C on the bank is a pose, not a hug: no trout, no splash, a burst and the reward', () => {
    const shots = sounds.filter((e) => e.name === 'shutter').length;
    press('KeyC');
    assert.equal(b.act.kind, 'pose');
    assert.ok(b.act.land && b.act.paid);
    let splash = false;
    run(ZS.sim.photographer.POSE, () => { splash = splash || g.particles.some((q) => q.color === '#bfe3f5'); });
    assert.ok(!splash);
    assert.ok(!sounds.some((e) => e.name === 'eat' && e.k === 'fish'));
    assert.ok(sounds.filter((e) => e.name === 'shutter').length - shots >= 12);
    assert.equal(g.stats.selfies, 1);
    assert.equal(g.stats.hugs, 0);
    assert.equal(p().react, null);
    assert.equal(p().x, x0);
  });

  await t.test('from the far bank, within view, C still poses, but not behind his back', () => {
    run(0.5);
    b.x = x0 - 600; b.dir = -1;
    run(0.2);
    assert.equal(b.reach, p());
    press('KeyC');
    assert.equal(b.act.kind, 'pose');
    assert.equal(b.dir, 1);
    run(ZS.sim.photographer.POSE);
    assert.equal(g.stats.selfies, 1, 'still on cooldown');
    b.x = x0 - 900;
    run(0.3);
    press('KeyC');
    assert.notEqual(b.act && b.act.kind, 'pose');
    run(1);
    b.x = x0 + 120; b.dir = -1;
    run(0.3);
    assert.notEqual(b.reach, p());
    press('KeyC');
    assert.notEqual(b.act && b.act.kind, 'pose');
  });

  await t.test('a bite hurts the bear’s image, but the photographer stays put and shoots on', () => {
    run(2);
    b.x = x0 + 50; b.dir = -1;
    run(0.3);
    press('KeyX');
    run(0.3);
    assert.equal(g.stats.bites, 1);
    assert.equal(p().react, 'bitten');
    run(1.5);
    assert.equal(p().react, null);
    assert.equal(p().x, x0);
    assert.ok(g.syn >= ZS.CFG.PROBLEM);
  });
});

test('the photographer, the poses and the bite draw cleanly on a laptop and on a phone', () => {
  for (const [w, h] of [[1280, 720], [390, 844]]) {
    const s = setup(6, { draw: true, w, h });
    const { g, b, run, press, problems } = s;
    b.x = 8920; b.dir = 1;
    run(0.5);
    press('KeyC');
    run(3.2);
    b.x = 9140; b.dir = 1;
    g.photographer.readyAt = 0;
    run(0.3);
    press('KeyC');
    run(2);
    press('KeyX');
    run(1.2);
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});
