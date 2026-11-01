'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup(level = 'summer') {
  const ZS = loadGame({ seed: 7 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level });
  const news = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each) each(i);
    }
  };
  return {
    ZS, g, b: g.bear, L: g.level, run, news,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

for (const level of ['summer', 'winter']) {
  test(`the den stays closed until the bear has hugged somebody (${level})`, async (t) => {
    const { ZS, g, b, L, run, news, press, hold, release } = setup(level);
    g.fat = g.def.fatGoal + 6;
    b.x = L.goalDen - 200; b.dir = 1;
    hold('ArrowRight');
    let stamp = false;
    run(4, () => { stamp = stamp || g.floaters.some((f) => f.text === ZS.LABELS.denRefuse); });

    await t.test('with enough fat but no hug the bear stops at the door and the news says why', () => {
      assert.equal(g.over, false);
      assert.ok(b.x < L.goalDen - 20, String(b.x));
      assert.equal(g.refusals, 1);
      assert.ok(stamp);
      assert.ok(news.includes(ZS.NEWS.denRefuse[0]), news.join(' | '));
    });

    await t.test('after a selfie with a tourist the same walk ends the level', () => {
      release('ArrowRight');
      run(0.3);
      const p = ZS.sim.people.create(g, 'tourist', { from: b.x - 300, to: b.x + 300 });
      Object.assign(p, { x: b.x - 50, pause: 99, filmCd: 99, dir: 1 });
      g.people = [p];
      b.dir = -1;
      press('KeyC');
      run(0.3);
      assert.equal(b.act.kind, 'selfie');
      run(ZS.CFG.SELFIE);
      assert.equal(g.stats.selfies, 1);
      hold('ArrowRight');
      run(2);
      assert.equal(g.ending, 'win');
    });
  });
}

test('a hug alone is not enough: reaching the den hungry ends the level as starving', () => {
  const { g, b, L, run, hold } = setup('winter');
  g.stats.hugs = 1;
  g.fat = g.def.fatGoal - 12;
  b.x = L.goalDen - 120; b.dir = 1;
  hold('ArrowRight');
  run(3);
  assert.equal(g.ending, 'starve');
});

test('when the year runs out, enough fat without a hug is a lonely ending and too little fat is starving', () => {
  for (const [fat, ending] of [[90, 'lonely'], [40, 'starve']]) {
    const { g, run } = setup();
    g.fat = fat;
    g.time = g.def.year - 0.2;
    run(0.5);
    assert.equal(g.ending, ending);
  }
});

test('the autopilot that reaches the den without a hug walks back, takes a selfie and then goes to sleep', () => {
  const { ZS, g, b, L } = setup('summer');
  Object.assign(ZS.dev.bot, { reaction: 0.25, mode: null });
  g.bot = true;
  g.fat = g.def.fatGoal + 10;
  const p = ZS.sim.people.create(g, 'tourist', { from: L.goalDen - 700, to: L.goalDen - 500 });
  Object.assign(p, { x: L.goalDen - 600, pause: 99, filmCd: 99 });
  g.people = [p];
  b.x = L.goalDen - 300; b.dir = 1;
  let turned = false;
  for (let i = 0; i < 900 && !g.over; i++) {
    ZS.sim.loop.advance(g, 0.1);
    turned = turned || (b.dir < 0 && !ZS.sim.rules.hugged(g));
  }
  assert.ok(turned);
  assert.equal(g.stats.selfies, 1);
  assert.equal(g.ending, 'win');
});
