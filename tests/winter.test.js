'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup() {
  const ZS = loadGame({ seed: 7 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'winter' });
  g.running = true;
  g.nextEvent = 1e9;
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each) each(i);
    }
  };
  const quiet = () => { g.shooters = []; g.people = []; g.deer = []; };
  return {
    ZS, g, b: g.bear, L: g.level, run, quiet,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

test('the winter level keeps trees out of the landmarks and has food on the way', () => {
  const { L, ZS } = setup();
  assert.equal(L.theme, 'winter');
  assert.equal(L.goalDen, L.w - 300);
  const hiders = L.trees.filter((t) => t.hide);
  const inside = (x, a, b) => x > a && x < b;
  for (const t of hiders) {
    for (const c of L.cannons) assert.ok(!inside(t.x, c.x - 80, c.x + 260), 'tree at ' + Math.round(t.x) + ' in the cannon');
    assert.ok(!inside(t.x, L.ice.from - 60, L.ice.to + 60), 'tree on the ice at ' + Math.round(t.x));
    for (const f of L.feeders) assert.ok(Math.abs(t.x - f.x) > 100, 'tree in the feeder');
    if (!t.xmas) assert.ok(!inside(t.x, L.village.from, L.village.to), 'tree in the village at ' + Math.round(t.x));
  }
  assert.equal(hiders.filter((t) => t.xmas).length, 1, 'one Christmas tree');
  const gaps = hiders.map((t) => t.x).sort((a, b) => a - b).map((x, i, a) => (i ? x - a[i - 1] : 0));
  assert.ok(Math.max(...gaps) < 1300, 'longest stretch without a hiding tree: ' + Math.round(Math.max(...gaps)));
  const natural = L.items.filter((it) => ZS.FOOD[it.type].natural);
  assert.ok(natural.length >= 12, natural.length + ' natural food items');
  for (const it of L.items) assert.ok(it.x > 40 && it.x < L.w - 40);
  for (const kind of ['feeder', 'punch', 'lokse', 'sausage', 'carrot', 'chatabin']) assert.ok(L.items.some((it) => it.type === kind), kind);
});

test('the bear wakes up yawning at the den, and the first arrow key ends the yawn and walks', () => {
  const { b, run, hold, quiet } = setup();
  quiet();
  assert.ok(b.waking);
  run(1);
  assert.ok(b.waking);
  assert.ok(b.wakeT > 0.9);
  hold('ArrowRight');
  const x0 = b.x;
  run(0.5);
  assert.ok(!b.waking);
  assert.ok(b.x - x0 > 70, 'walked ' + Math.round(b.x - x0));
});

test('on the ice the bear keeps sliding after the key is released, and a held key turns it back', () => {
  const { b, L, run, hold, release, quiet } = setup();
  quiet();
  b.waking = false;
  b.x = L.ice.from + 20; b.dir = 1;
  hold('ArrowRight');
  run(0.8);
  release('ArrowRight');
  const x0 = b.x;
  run(0.5);
  assert.ok(b.onIce);
  assert.ok(b.x - x0 > 30, 'slid ' + Math.round(b.x - x0));
  assert.ok(b.slide > 0);
  hold('ArrowLeft');
  let turned = false;
  run(1.2, () => { if (b.vx < 0) turned = true; });
  release('ArrowLeft');
  assert.ok(turned, 'the held key reversed the slide');
  assert.equal(b.dir, -1);
});

test('inside the snow cannon cloud a hunter right next to the bear cannot see it', () => {
  const { g, b, L, run, quiet, ZS } = setup();
  quiet();
  b.waking = false;
  const c = L.cannons[0];
  b.x = c.x + 140;
  const s = ZS.sim.hunters.create(g, 'walker', { x: b.x + 70, dir: -1, from: b.x, to: b.x + 300, pause: 99 });
  g.shooters = [s];
  let aimed = 0;
  run(2, () => { if (s.lock > 0) aimed++; });
  assert.ok(b.inSpray && b.covered);
  assert.equal(aimed, 0);
  b.x = c.x + 360; s.x = b.x + 70;
  run(0.5, () => { if (s.lock > 0) aimed++; });
  assert.ok(aimed > 0, 'outside the cloud he aims');
});

test('the bear leaves tracks in the snow, none on the ice, and a hunter who finds fresh ones looks for the bear', () => {
  const { g, b, L, run, hold, release, quiet, ZS } = setup();
  quiet();
  b.waking = false;
  b.x = 1500;
  hold('ArrowRight');
  run(2);
  release('ArrowRight');
  assert.ok(g.tracks.length >= 8, g.tracks.length + ' tracks');
  g.tracks.length = 0;
  b.x = L.ice.from + 10; b.vx = 0;
  hold('ArrowRight');
  run(1.2);
  release('ArrowRight');
  assert.equal(g.tracks.filter((t) => t.x > L.ice.from + 20 && t.x < L.ice.to - 20).length, 0);
  b.x = 2900; b.trackX = b.x; b.vx = 0;
  hold('ArrowRight');
  run(1);
  release('ArrowRight');
  const s = ZS.sim.hunters.create(g, 'walker', { x: 2905, dir: -1, from: 2700, to: 3100 });
  g.shooters = [s];
  run(0.1);
  assert.ok(s.alertX !== null || Math.abs(s.cross - b.x) < 60, 'he follows the tracks');
});

test('the Christmas market, the snowman and the après-ski bins feed the bear and turn it into a problem bear', () => {
  const { g, b, L, run, quiet } = setup();
  quiet();
  b.waking = false;
  for (const s of L.stalls) {
    b.x = s.x;
    run(0.7);
  }
  assert.ok(L.items.filter((it) => ['punch', 'lokse', 'sausage'].includes(it.type)).every((it) => it.eaten));
  assert.ok(g.syn > 30 && !g.problem, 'synanthropy ' + Math.round(g.syn));
  const sm = L.snowmen[0];
  b.x = sm.x;
  run(0.7);
  assert.equal(sm.nose, false, 'the snowman lost its carrot');
  b.x = L.items.find((it) => it.type === 'chatabin').x;
  run(0.7);
  assert.ok(g.problem, 'problem bear');
});

test('a hug knocks the sack out of Mikuláš\'s hands and the sweets spill on the snow', () => {
  const { g, b, ZS, run, press } = setup();
  g.shooters = []; g.deer = [];
  const p = g.people.find((h) => h.kind === 'santa');
  g.people = [p];
  b.waking = false;
  Object.assign(p, { x: 1500, from: 1100, to: 1900, pause: 99 });
  b.x = 1450; b.dir = 1;
  press('KeyC');
  run(0.6);
  assert.equal(p.react, 'hugged');
  assert.ok(p.empty);
  assert.ok(g.props.some((o) => o.kind === 'sack'));
  assert.equal(g.level.items.filter((it) => it.type === 'candy').length, 2);
  assert.ok(ZS.NEWS.hug.santa);
});
