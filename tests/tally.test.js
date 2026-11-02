'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;
const plain = (v) => JSON.parse(JSON.stringify(v));

function setup(level = 'summer', seed = 5) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const T = ZS.tally;
  const g = ZS.sim.rules.create(input.state, { level, viewW: 960 });
  g.running = true; g.nextEvent = 1e9; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = [];
  ZS.sim.rules.onSound = (gg, name) => T.hear(gg, name);
  T.watch(g);
  const run = (seconds) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) { ZS.sim.loop.step(g, DT); T.check(g); }
  };
  const place = (x, dir = 1) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = dir; };
  return { ZS, T, g, b: g.bear, L: g.level, input, run, place };
}

test('the checklist follows fat, the hug and the den', () => {
  const { T, g } = setup('winter');
  assert.deepEqual(plain(T.goals(g)), { fat: false, hug: false, den: false, ready: false });
  g.fat = g.def.fatGoal;
  assert.deepEqual(plain(T.goals(g)), { fat: true, hug: false, den: false, ready: false });
  g.stats.selfies = 1;
  assert.deepEqual(plain(T.goals(g)), { fat: true, hug: true, den: false, ready: true });
  g.over = true; g.ending = 'starve';
  assert.equal(T.goals(g).den, false);
  g.ending = 'win';
  assert.equal(T.goals(g).den, true);
});

test('reaching the den with fat and a hug ticks all three', () => {
  const { T, g, run, place, L } = setup('summer');
  g.fat = 95; g.stats.hugs = 1;
  place(L.goalDen - 10);
  run(1);
  assert.equal(g.ending, 'win');
  assert.deepEqual(plain(T.goals(g)), { fat: true, hug: true, den: true, ready: true });
});

test('a fresh run counts nothing, and a game nobody watches, like the menu preview, stays at zero', () => {
  const { ZS, T, g } = setup('summer');
  assert.deepEqual(plain(T.counts(g)), { hunters: 0, stands: 0, trees: 0, photos: 0 });
  const other = ZS.sim.rules.create(ZS.ui.input.state, { level: 'summer' });
  other.shooters[0].react = 'down';
  T.hear(other, 'climb');
  T.check(other);
  assert.deepEqual(plain(T.counts(other)), { hunters: 0, stands: 0, trees: 0, photos: 0 });
});

test('each hunter the bear deals with counts once, a hunter walking off on his own does not', () => {
  const { ZS, T, g } = setup('summer');
  const H = ZS.sim.hunters;
  const [a, b, c, d, e] = [0, 1, 2, 3, 4].map((i) => H.create(g, 'walker', { x: 5000 + i * 300, from: 4800, to: 6500, dir: -1 }));
  const stand = H.create(g, 'posed', { x: 1900, range: 480 });
  g.shooters = [a, b, c, d, e, stand];
  a.react = 'down';
  T.check(g);
  a.react = 'fetch';
  T.check(g);
  a.react = 'down';
  T.check(g);
  assert.equal(T.counts(g).hunters, 1, 'knocked down twice, counted once');
  b.react = 'bitten';
  stand.react = 'drop';
  T.check(g);
  c.react = 'flee';
  T.hear(g, 'hug');
  assert.equal(T.counts(g).hunters, 4);
  d.react = 'gone';
  T.check(g);
  assert.equal(T.counts(g).hunters, 4, 'his time ran out, the bear did nothing');
  e.react = 'gone'; e.bolt = true;
  T.check(g);
  assert.equal(T.counts(g).hunters, 5, 'scared off his stand');
});

test('a real jump on a hunter shows up in the counter', () => {
  const { ZS, T, g, b, L, run, input } = setup('summer');
  let x = 1400;
  for (; x < L.w - 1400; x += 5) {
    const clear = (a, m) => Math.abs(a - x) > m;
    if (L.trees.every((t) => clear(t.x, 200)) && L.logs.every((l) => clear(l.x, 260)) && L.items.every((it) => clear(it.x, 120))
      && L.posts.every((p) => clear(p.x, 700)) && clear((L.river.from + L.river.to) / 2, 600) && (x < L.salas.from - 600 || x > L.salas.to + 600)) break;
  }
  const s = ZS.sim.hunters.create(g, 'walker', { x, from: x - 400, to: x + 400, dir: -1 });
  Object.assign(s, { pause: 0, speed: 0, cross: x - 300 });
  g.shooters = [s];
  b.x = x - 96; b.trackX = b.x; b.dir = 1;
  input.press('ArrowRight', true);
  input.press('Space', false);
  run(0.75);
  input.release('ArrowRight');
  assert.equal(s.react, 'down');
  assert.equal(T.counts(g).hunters, 1);
});

test('climbing a thick tree counts once per climb, the ladder of a stand does not', () => {
  const { T, g, b, L, run, input, place } = setup('summer');
  const beech = L.trees.find((t) => t.hide && t.kind === 'buk' && t.x > 700);
  place(beech.x + 10);
  input.press('ArrowUp', true);
  run(1.2);
  assert.ok(b.climbing && !b.climbing.ladder, 'up the beech');
  input.release('ArrowUp');
  input.press('ArrowDown', true);
  run(3);
  input.release('ArrowDown');
  assert.ok(!b.climbing, 'back on the ground');
  assert.equal(T.counts(g).trees, 1, 'one climb, however long');
  place(L.posts[0].x);
  input.press('ArrowUp', true);
  run(1);
  input.release('ArrowUp');
  assert.ok(b.climbing && b.climbing.ladder, 'on the ladder');
  assert.equal(T.counts(g).trees, 1, 'the ladder is not a tree');
});

test('stands count a hunter shaken out and a stand taken over the ladder, photos count selfies and poses', () => {
  const { T, g } = setup('summer');
  T.hear(g, 'shake');
  T.hear(g, 'standFall');
  g.ladders = 1;
  g.stats.selfies = 3;
  assert.deepEqual(plain(T.counts(g)), { hunters: 0, stands: 2, trees: 0, photos: 3 });
});

for (const level of ['summer', 'winter']) {
  test(`counting changes nothing in a seeded autopilot run, ${level}`, () => {
    const play = (watch) => {
      const ZS = loadGame({ seed: 21 });
      const { rules, loop } = ZS.sim;
      Object.assign(ZS.dev.bot, { reaction: 0.3 });
      const g = rules.create(ZS.ui.input.state, { viewW: 480, bot: true, level });
      g.running = true;
      if (watch) { ZS.tally.watch(g); rules.onSound = (gg, name) => ZS.tally.hear(gg, name); }
      for (let i = 0; i < 6000 && !g.over; i++) { loop.advance(g, 0.1); if (watch) ZS.tally.check(g); }
      return { state: [g.ending, g.time, g.fat, g.lives, g.bear.x, g.syn, g.panic, JSON.stringify(g.stats)], counts: plain(ZS.tally.counts(g)) };
    };
    const alone = play(false), watched = play(true);
    assert.deepEqual(plain(watched.state), alone.state);
    assert.ok(Object.values(watched.counts).some((n) => n > 0), JSON.stringify(watched.counts));
  });
}
