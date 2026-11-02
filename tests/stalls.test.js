'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup({ level = 'winter', seed = 5, draw = false } = {}) {
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
  const run = (seconds, fn) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (ctx) {
        ZS.draw(g, ctx, 960, 0);
        assert.equal(stackDepth(ctx), 0, 'save() without restore()');
      }
      if (fn) fn(i);
    }
  };
  const park = (x, dir = 1) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = dir; g.bear.vx = 0; };
  const said = () => news.concat(g.tickerQueue.map((q) => q.text));
  const M = ZS.util.mulberry32.constructor('return Math')();
  const knock = (pick) => {
    const real = M.random;
    if (pick !== undefined) M.random = () => pick;
    input.press('KeyC', false);
    run(0.6);
    M.random = real;
  };
  return { ZS, g, b: g.bear, L: g.level, run, park, said, sounds, problems, input, knock };
}

const stallOf = (L, kind) => L.stalls.find((s) => s.kind === kind);
const itemAt = (L, s) => L.items.find((it) => it.type === s.kind && it.x === s.x);

test('the sheep cheese stall stands at the Christmas market and by the salaš, and sells human food', () => {
  const { ZS } = setup();
  const W = ZS.makeLevel('winter', 11), S = ZS.makeLevel('summer', 11);
  assert.equal(W.stalls.map((s) => s.kind).join(), 'punch,lokse,sausage,cheese');
  for (const [a, b] of W.stalls.slice(1).map((s, i) => [W.stalls[i], s])) assert.ok(b.x - a.x >= 150, 'the stalls do not overlap');
  const xmas = W.trees.find((t) => t.xmas), last = W.stalls[W.stalls.length - 1];
  assert.ok(xmas.x - last.x > 120, 'clear of the Christmas tree');
  assert.ok(W.stalls.every((s) => s.x > W.village.from && s.x < W.village.to));
  const salas = stallOf(S, 'cheese');
  assert.ok(salas && salas.salas && salas.x < S.salas.from && S.salas.from - salas.x < 150, 'a small stand on the way to the salaš');
  assert.ok(!S.trees.some((t) => Math.abs(t.x - salas.x) < t.w / 2 + 62), 'no tree trunk through the stand');
  for (const L of [W, S]) assert.ok(itemAt(L, stallOf(L, 'cheese')), 'a cheese item at the stall');
  const f = ZS.FOOD.cheese;
  assert.ok(f && !f.natural && f.fat > 0 && f.syn > 0);
  for (const code of ['sk', 'en', 'de', 'es']) {
    const T = ZS.LANGS[code];
    assert.ok(T.LABELS.food.cheese && T.LABELS.stallSigns.cheese && T.NEWS.cheeseEaten.length, code);
  }
});

test('raiding the cheese stall counts as human food, and the stall lock covers it too', () => {
  const { ZS, g, b, L, park, run, said } = setup();
  const s = stallOf(L, 'cheese'), it = itemAt(L, s), fat = g.fat;
  park(s.x + 10);
  run(0.8);
  assert.ok(it.eaten);
  assert.equal(g.stats.human, 1);
  assert.ok(g.fat > fat + ZS.FOOD.cheese.fat - 1);
  assert.ok(g.syn >= ZS.FOOD.cheese.syn - 1);
  assert.ok(said().some((t) => ZS.NEWS.cheeseEaten.includes(t)));
  assert.equal(g.vendors.list.find((v) => v.s === s).mode, 'hid', 'the vendor hides after the raid');
  assert.equal(ZS.sim.vendors.near(g), null, 'nothing left to knock on');
  const other = setup();
  other.g.usedEvents = new Set(['wrongbear', 'court', 'meat', 'poacher', 'census', 'decree', 'drive']);
  other.g.nextEvent = 0;
  other.run(DT);
  assert.ok(other.L.stalls.every((st) => itemAt(other.L, st).locked), 'every stall, the cheese one too');
  assert.equal(b.act, null);
});

test('C at a vendor pours a borovička and hands over the stall food, once, and the bear gets tipsy for a while', () => {
  const { ZS, g, b, L, park, run, knock, sounds, said, input } = setup();
  const s = stallOf(L, 'cheese'), it = itemAt(L, s);
  park(s.x - 20);
  run(DT);
  assert.equal(b.knock && b.knock.kind, 'stall');
  const fat = g.fat, human = g.stats.human;
  knock(0.1);
  const v = g.vendors.list.find((o) => o.s === s);
  assert.equal(v.mode, 'pour');
  assert.ok(sounds.includes('knock:0.5') && sounds.includes('pour'));
  assert.ok(g.floaters.some((f) => ZS.LABELS.vendor.pour.includes(f.text)));
  assert.ok(Math.abs(b.x - (s.x - 50)) < 8, 'the bear steps to the side of the counter');
  run(2.9);
  assert.ok(it.eaten && it.gift, 'the gift is the stall food');
  assert.equal(g.stats.human, human + 1);
  assert.ok(g.fat > fat + ZS.FOOD.cheese.fat - 1);
  assert.ok(b.tipsy > 0, 'tipsy after the shot');
  assert.ok(said().some((t) => ZS.NEWS.vendorPour.includes(t)));
  assert.equal(v.mode, 'done');
  run(1);
  assert.equal(ZS.sim.vendors.near(g), null, 'each vendor only once');
  input.press('KeyC', false);
  run(0.6);
  assert.equal(it.eaten, true);
  assert.equal(g.stats.human, human + 1, 'no second helping');
});

test('the tipsy sway ends after about six seconds, hiccups on the way and barely changes the walk', () => {
  const { ZS, g, b, L, park, run, knock, sounds } = setup();
  const s = stallOf(L, 'lokse');
  park(s.x + 5);
  knock(0.1);
  run(1.2);
  assert.ok(b.tipsy > 5 && b.tipsy <= ZS.sim.vendors.TIPSY);
  run(2);
  ZS.ui.input.press('ArrowRight', true);
  const x0 = b.x;
  run(2);
  const tipsyWalk = b.x - x0;
  ZS.ui.input.release('ArrowRight');
  run(3);
  assert.equal(b.tipsy, 0, 'sober again');
  assert.ok(sounds.filter((n) => n === 'hiccup').length >= 2);
  ZS.ui.input.press('ArrowRight', true);
  const x1 = b.x;
  run(2);
  ZS.ui.input.release('ArrowRight');
  const soberWalk = b.x - x1;
  assert.ok(Math.abs(tipsyWalk - soberWalk) / soberWalk < 0.08, `walked ${tipsyWalk.toFixed(0)} tipsy and ${soberWalk.toFixed(0)} sober`);
  assert.ok(g.time > 0);
});

test('a startled vendor ducks, slams the shutter and locks the food away, with a little panic', () => {
  const { ZS, g, b, L, park, run, knock, sounds, said } = setup();
  const s = stallOf(L, 'sausage'), it = itemAt(L, s);
  park(s.x + 30, -1);
  const panic = g.panic, seen = g.stats.seen;
  knock(0.9);
  const v = g.vendors.list.find((o) => o.s === s);
  assert.equal(v.mode, 'duck');
  assert.ok(sounds.includes('scream:m'));
  assert.ok(g.panic > panic && g.panic - panic < 6);
  assert.equal(g.stats.seen, seen + 1);
  assert.ok(it.locked && !it.eaten);
  run(1.2);
  assert.equal(v.mode, 'shut');
  assert.ok(sounds.includes('window'));
  assert.ok(said().some((t) => ZS.NEWS.vendorDuck.includes(t)));
  run(1);
  assert.equal(it.eaten, false, 'the bear cannot raid the shut stall');
  assert.equal(b.tipsy, 0);
  run(6);
  park(s.x + 5);
  run(DT);
  assert.equal(ZS.sim.vendors.near(g), null, 'the shut stall does not answer again');
});

test('the bot never knocks, and the vendor knocks do not open while the bear is busy or hidden', () => {
  const { ZS, g, b, L, park, run } = setup();
  const s = stallOf(L, 'punch');
  park(s.x);
  b.hiding = L.trees[0];
  run(DT);
  b.hiding = null;
  b.act = { kind: 'hug', t: 0, dur: 1, dir: 1, hit: false, target: null, done: false };
  assert.equal(ZS.sim.vendors.near(g), null);
  b.act = null;
  run(DT);
  assert.ok(ZS.sim.vendors.near(g));
  assert.equal(b.reach, null);
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'dev', 'autoplay.js'), 'utf8');
  assert.ok(!/knock|vendors/.test(src));
});

test('the stall, the pour, the shutter and the tipsy bear draw cleanly', () => {
  for (const pick of [0.1, 0.9]) {
    const { L, park, run, knock, problems } = setup({ draw: true });
    const s = stallOf(L, 'cheese');
    park(s.x + 12);
    run(0.2);
    knock(pick);
    run(3.5);
    assert.deepEqual(problems, []);
  }
  const { L, park, run, knock, problems } = setup({ level: 'summer', draw: true });
  park(stallOf(L, 'cheese').x - 8);
  knock(0.2);
  run(3);
  assert.deepEqual(problems, []);
});
