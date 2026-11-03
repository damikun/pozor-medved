'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup({ level = 'summer', seed = 4, draw = false } = {}) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer: draw, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level });
  const news = [], sounds = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  ZS.sim.rules.onSound = (gm, name, x, extra) => sounds.push(extra === undefined ? name : name + ':' + extra);
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.deer = []; g.drones = []; g.dogs = []; g.sheep = [];
  const ctx = draw ? createCanvas(1280, 720, problems).getContext('2d') : null;
  const run = (seconds) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (ctx) {
        ZS.draw(g, ctx, 960, 0);
        assert.equal(stackDepth(ctx), 0, 'save() without restore()');
      }
    }
  };
  const park = (x, dir = 1) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = dir; g.bear.vx = 0; };
  const said = () => news.concat(g.tickerQueue.map((q) => q.text));
  const M = ZS.util.mulberry32.constructor('return Math')();
  const knock = (pick) => {
    const real = M.random;
    if (pick !== undefined) M.random = () => pick;
    input.press('KeyC', false);
    run(DT);
    M.random = real;
  };
  return { ZS, g, b: g.bear, L: g.level, run, park, said, sounds, problems, knock };
}

test('C in front of a village house knocks, someone peeks out, gets scared and slams the shutters', () => {
  const { ZS, g, b, L, run, park, knock, sounds, said } = setup();
  const h = L.houses[1], T = ZS.sim.knock.T, win = ZS.sim.knock.winX(h, 1);
  park(win - 4);
  run(DT);
  assert.equal(b.knock && b.knock.kind, 'house');
  assert.equal(b.knock.x, win, 'the hint sits over the window');
  const panic = g.panic, seen = g.stats.seen;
  knock(0.1);
  const o = g.knock.list[1];
  assert.equal(b.act.kind, 'knock');
  assert.equal(o.mode, 'knock');
  assert.equal(o.side, 1);
  assert.equal(o.who, 'granny');
  assert.ok(sounds.some((n) => n.startsWith('knock')));
  run(T.open + 0.05);
  assert.equal(o.mode, 'peek');
  assert.equal(g.stats.seen, seen, 'nobody screams before the window opens');
  run(T.scare - T.open);
  assert.ok(sounds.includes('scream:f'));
  assert.equal(g.stats.seen, seen + 1);
  assert.ok(g.panic > panic && g.panic - panic <= 4, 'a little panic');
  assert.ok(g.floaters.some((f) => ZS.LABELS.knock.granny.includes(f.text)));
  assert.ok(said().some((t) => ZS.NEWS.knock.includes(t)));
  run(T.done - T.scare + 0.1);
  assert.equal(o.mode, 'shut');
  assert.ok(o.shut);
  assert.ok(sounds.includes('window'));
  assert.equal(b.act, null);
});

test('each house answers once; the next house can be knocked after a short rest, with someone else at the window', () => {
  const { ZS, g, b, L, run, park, knock } = setup();
  park(L.houses[0].x);
  run(DT);
  knock(0.5);
  const first = g.knock.list[0];
  assert.ok(first.door, 'knocked on the door');
  run(4.5);
  assert.equal(first.mode, 'shut');
  run(DT);
  assert.equal(ZS.sim.knock.near(g), null, 'a shut house stays shut');
  knock(0.5);
  assert.equal(b.act === null || b.act.kind !== 'knock', true);
  assert.equal(first.mode, 'shut');
  run(2);
  park(L.houses[2].x - 30);
  run(DT);
  assert.ok(ZS.sim.knock.near(g));
  knock(0.5);
  const second = g.knock.list[2];
  assert.equal(second.mode, 'knock');
  assert.notEqual(second.who, first.who);
  park(L.houses[3].x);
  run(DT);
  assert.equal(ZS.sim.knock.near(g), null, 'a cooldown between knocks');
});

test('the man in the undershirt throws a slipper that lands near the bear and does nothing else', () => {
  const { ZS, g, b, L, run, park, knock, sounds } = setup();
  const h = L.houses[2];
  park(ZS.sim.knock.winX(h, -1) + 6);
  run(DT);
  knock(0.5);
  const o = g.knock.list[2];
  assert.equal(o.who, 'man');
  const lives = g.lives, fat = g.fat;
  run(4);
  const p = g.props.find((q) => q.kind === 'slipper');
  assert.ok(p && p.rest, 'the slipper rests on the ground');
  assert.ok(Math.abs(p.x - b.x) < 90, `slipper at ${p.x.toFixed(0)}, bear at ${b.x.toFixed(0)}`);
  assert.equal(g.lives, lives);
  assert.ok(Math.abs(g.fat - fat) < 1);
  assert.ok(sounds.includes('throw'));
});

test('the winter houses take knocks too, a hug next to a person still hugs, and C on bare air does nothing', () => {
  const { ZS, g, b, L, run, park, knock } = setup({ level: 'winter' });
  const h = L.houses[1];
  park(h.x + 40);
  run(DT);
  knock(0.9);
  assert.equal(g.knock.list[1].who, 'kid');
  run(3);
  assert.equal(g.knock.list[1].mode, 'shut');
  const t = setup();
  t.g.people.push(t.ZS.sim.people.create(t.g, 'tourist', { from: t.L.houses[0].x, to: t.L.houses[0].x }));
  t.g.people[0].x = t.L.houses[0].x + 30;
  t.park(t.L.houses[0].x, 1);
  t.run(DT);
  t.knock(0.5);
  assert.equal(t.b.act.kind, 'selfie');
  assert.equal(t.g.knock.list[0].mode, 'idle');
  const u = setup();
  u.park(600);
  u.run(DT);
  u.knock();
  assert.ok(!u.b.act, 'nothing to hug, nothing happens');
  assert.equal(b.knock, null);
});

test('knocking, the peek, the slipper and the closed shutters draw cleanly in summer and winter', () => {
  for (const level of ['summer', 'winter']) {
    for (const pick of [0.1, 0.5, 0.9]) {
      const { L, park, run, knock, problems } = setup({ level, draw: true });
      park(L.houses[0].x + 30);
      run(0.1);
      knock(pick);
      run(3.2);
      assert.deepEqual(problems, []);
    }
  }
});
