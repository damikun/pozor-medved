'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;
const KEYS = ['cave', 'caved', 'funi', 'top', 'chata', 'ridge'];

function setup(seed = 5) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'chopok' });
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each && each(i) === false) return;
    }
  };
  const quiet = () => { g.shooters = []; g.people = []; g.dogs = []; g.deer = []; };
  const put = (x) => { Object.assign(g.bear, { x, trackX: x, dir: 1 }); };
  return { ZS, g, b: g.bear, L: g.level, input, run, quiet, put, hold: (key) => input.press(key, true), release: input.release };
}

test('the Ďumbier level is built from the dolina to the summit, with cover all the way and no trees in the landmarks', () => {
  const { ZS, L } = setup();
  assert.equal(L.id, 'chopok');
  assert.equal(L.w, ZS.LEVELS.chopok.w);
  assert.equal(L.goalDen, L.w - 300);
  assert.deepEqual([...L.checkpoints.map((c) => c.key)], KEYS);
  const xs = [...L.checkpoints.map((c) => c.x)];
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'checkpoints in walking order');
  assert.ok(xs.every((x) => x > L.startDen && x < L.goalDen));
  assert.ok(L.checkpoints.find((c) => c.key === 'cave').x < L.cave.door);
  assert.ok(L.checkpoints.find((c) => c.key === 'caved').x > L.cave.land);
  assert.ok(L.checkpoints.find((c) => c.key === 'funi').x < L.funi.door);
  assert.ok(L.checkpoints.find((c) => c.key === 'top').x > L.funi.land);
  for (const p of L.passes) assert.ok(p.from < p.to && p.wall < p.to && p.wall > p.from, p.key);
  const hiders = L.trees.filter((t) => t.hide).concat(L.covers);
  for (const t of L.trees) {
    for (const p of L.passes) assert.ok(t.x < p.from - 40 || t.x > p.to + 20, 'tree at ' + Math.round(t.x) + ' in the ' + p.key);
    assert.ok(t.x < L.chata.from - 40 || t.x > L.chata.to + 40, 'tree in the hut at ' + Math.round(t.x));
    for (const l of L.lots) assert.ok(t.x < l.from || t.x > l.to, 'tree on the car park at ' + Math.round(t.x));
  }
  const gaps = hiders.map((t) => t.x).concat(...L.passes.map((p) => [p.from, p.to])).sort((a, b) => a - b).map((x, i, a) => (i ? x - a[i - 1] : 0));
  assert.ok(Math.max(...gaps) < 1200, 'longest stretch without cover: ' + Math.round(Math.max(...gaps)));
  assert.ok(L.covers.filter((c) => c.rock).length >= 10, 'boulders and cairns on the ridge');
  assert.ok(L.covers.every((c) => c.hide && c.top < 450 && (c.lime || c.x > L.summit.from)));
  const natural = L.items.filter((it) => ZS.FOOD[it.type].natural);
  assert.ok(natural.length >= 20, natural.length + ' natural food items');
  for (const it of L.items) assert.ok(ZS.FOOD[it.type] && it.x > 40 && it.x < L.w - 40, it.type);
  for (const kind of ['bin', 'container']) assert.ok(L.items.some((it) => it.type === kind), kind);
  assert.ok(L.items.some((it) => it.labelKey === 'lingon' && it.x > L.crest.from), 'lingonberries on the ridge');
});

test('the third level is on the start screen and every new text exists in all four languages', () => {
  const { ZS } = setup();
  for (const code of ZS.i18n.codes()) {
    const T = ZS.LANGS[code];
    assert.match(T.LEVEL_TEXT.chopok.pick(75), /75/, code);
    for (const k of Object.keys(ZS.LEVEL_TEXT.chopok.seasons)) assert.ok(ZS.LEVELS.chopok.seasons.some((s) => s.key === k), k);
    for (const key of KEYS) {
      for (const t of [T.NEWS.cp[key], T.LABELS.cp[key], T.UI.resumeAt[key], T.UI.retryAt[key]]) assert.ok(typeof t === 'string' && t.trim(), code + ' ' + key);
    }
    assert.equal(T.CHOPOK_HEADLINES.length, ZS.LANGS.sk.CHOPOK_HEADLINES.length);
  }
  for (const k of Object.keys(ZS.NEWS)) if (!['cp', 'logging', 'tycoon'].includes(k)) assert.ok(ZS.NEWS_ICON[k] || typeof ZS.NEWS[k] === 'object', 'icon for ' + k);
});

function into(env, door) {
  const { g, run, put, hold, release } = env;
  put(door - 60);
  hold('ArrowRight');
  run(4, () => (g.chopok && g.chopok.pass && g.chopok.pass.phase === 'play' ? false : undefined));
  release('ArrowRight');
  return g.chopok.pass.play;
}

test('the cave is a sublevel of its own: the valley is put away, the bear follows the tour and comes out by the ice cave', () => {
  const env = setup();
  const { ZS, g, b, L, run, quiet, hold, release } = env;
  quiet();
  const main = g.level, people = [ZS.sim.people.create(g, 'tourist', { from: 1000, to: 1100 })];
  g.people = people;
  const c = into(env, L.cave.door);
  assert.ok(g.level.stage && g.level.cave && g.level !== main, 'inside the cave stage');
  assert.equal(g.people.length, 0, 'the valley people wait outside');
  assert.ok(ZS.sim.chopok.inside(g));
  g.bot = true;
  run(60, () => (g.chopok.pass ? undefined : false));
  g.bot = false;
  assert.equal(g.level, main);
  assert.ok(g.people.includes(people[0]), 'the valley people are back');
  assert.equal(g.once.cave, true);
  assert.equal(c.result, 'dragon', 'the careful bear stands next to the Liptov dragon');
  assert.equal(c.seen, 0);
  assert.ok(b.x >= L.cave.land, 'out of the cave at ' + Math.round(b.x));
  hold('ArrowLeft');
  run(2);
  release('ArrowLeft');
  assert.ok(b.x >= L.passes[0].wall - 1, 'the exit is one way: ' + Math.round(b.x));
});

test('in the cave, bumping into the group gets the bear seen and shooed back, and three sightings end the tour', () => {
  const env = setup();
  const { ZS, g, b, quiet } = env;
  quiet();
  const c = into(env, env.L.cave.door);
  const tail = ZS.sim.cave.tail(c);
  Object.assign(b, { x: tail + 10, trackX: tail + 10 });
  env.run(0.1);
  assert.equal(c.seen, 1);
  assert.ok(b.x < tail - 150, 'shooed back to ' + Math.round(b.x));
  assert.ok(g.stats.seen > 0 && g.panic > 0);
  for (let i = 0; i < 2; i++) { env.run(2.6); const t = ZS.sim.cave.tail(c); Object.assign(b, { x: t + 10, trackX: t + 10, stun: 0 }); env.run(0.05); }
  env.run(0.2);
  assert.equal(c.result, 'abort');
});

test('in the lit dome the dripstone pose fools the guide’s look, but not the torch, which only a stalagnate stops', () => {
  const env = setup();
  const { ZS, g, b, run, quiet, input } = env;
  quiet();
  const c = into(env, env.L.cave.door);
  const S = g.level, look = ZS.sim.cave.EVENTS[0], cone = ZS.sim.cave.EVENTS[1];
  const at = (t, x) => { c.t = t; Object.assign(b, { x, trackX: x, stun: 0, hiding: null }); };
  at(look.at + 0.1, 700);
  input.press('KeyC', true);
  run(0.6);
  assert.ok(ZS.sim.cave.lit(S, c, b.x), 'the bear stands in light');
  assert.equal(c.seen, 0, 'a dripstone is not a bear');
  input.release('KeyC');
  run(0.5);
  assert.equal(c.seen, 1, 'a dripstone that walks is');
  at(cone.at + 0.1, 1300);
  c.seenAt = -99;
  input.press('KeyC', true);
  run(0.3);
  input.release('KeyC');
  assert.equal(c.seen, 2, 'the torch sees through the pose');
  at(cone.at + 0.1, 1080);
  c.seenAt = -99;
  input.press('ArrowDown', true);
  run(0.6);
  input.release('ArrowDown');
  assert.equal(c.seen, 2, 'the stalagnate hides the bear from the torch');
});

test('the cabin is a sublevel too: a careful bear rides it hidden behind the rucksacks and gets out by the Rotunda', () => {
  const env = setup();
  const { ZS, g, b, L, run, quiet } = env;
  quiet();
  const lives = g.lives;
  const c = into(env, L.funi.door);
  assert.ok(g.level.cabin, 'inside the cabin');
  g.bot = true;
  run(50, () => (g.chopok.pass ? undefined : false));
  g.bot = false;
  assert.equal(g.once.funi, true);
  assert.equal(c.result, 'clean');
  assert.equal(g.lives, lives);
  assert.ok(b.x > L.funi.land - 1 && b.x < L.summit.rotunda, 'by the Rotunda at ' + Math.round(b.x));
  assert.ok(g.liftCalm > 0);
  void ZS;
});

test('in the cabin a passenger who sees the bear stops it and a hunter shoots from below; the mascot pose fools a child but not a granny', () => {
  const env = setup();
  const { ZS, g, b, run, quiet, input } = env;
  quiet();
  const c = into(env, env.L.funi.door);
  const lives = g.lives;
  const kid = c.people.find((p) => p.role === 'kid'), granny = c.people.find((p) => p.role === 'granny');
  for (const p of c.people) p.home = p.x = p === kid ? 400 : 900;
  c.t = 8; c.side = -1;
  Object.assign(b, { x: 300, trackX: 300 });
  c.pose = 1;
  input.press('KeyC', true);
  run(0.5);
  assert.equal(c.fooled, true, 'the child takes a selfie with the mascot');
  assert.ok(ZS.sim.rules.hugged(g), 'a selfie counts as a hug');
  assert.equal(c.shot, null);
  input.release('KeyC');
  granny.x = granny.home = 400; kid.x = kid.home = 900;
  c.seenAt = -99;
  input.press('KeyC', true);
  run(0.3);
  input.release('KeyC');
  assert.ok(c.shot, 'the granny is not fooled and the cabin stops');
  run(1.6);
  assert.equal(g.lives, lives - 1);
});

test('every checkpoint of the Ďumbier level survives packing and resumes on its side of the passages', () => {
  const { ZS, g, input, put } = setup();
  const { checkpoint } = ZS.sim;
  for (const c of g.level.checkpoints) {
    put(c.x + 4);
    if (c.after) g.once[c.after] = true;
    const s = checkpoint.unpack(checkpoint.pack(Object.assign(checkpoint.save(g, c.key), { tally: { trees: 0, stands: 0 } })));
    assert.ok(s, c.key);
    assert.equal(s.level, 'chopok');
    assert.equal(s.key, c.key);
    const r = checkpoint.resume(s, input.state, {});
    assert.equal(r.level.id, 'chopok');
    assert.equal(Math.round(r.bear.x), Math.round(c.x + 4));
    assert.equal(!!r.once.cave, g.level.checkpoints.findIndex((k) => k.key === c.key) >= 1, 'cave behind ' + c.key);
    assert.equal(!!r.once.funi, g.level.checkpoints.findIndex((k) => k.key === c.key) >= 3, 'cabin behind ' + c.key);
  }
});

test('in the hut queue, moving while the hut keeper looks sends the bear back to the door, and ordering behind his back serves cabbage soup', () => {
  const { ZS, g, b, L, run, quiet, put, input } = setup();
  quiet();
  run(0.1);
  const k = g.chopok.chata;
  const freeze = () => { k.cook.t = 99; for (const p of k.guests) { p.state = 'calm'; p.t = 99; } };
  put(L.chata.queue[1]);
  freeze();
  k.cook.state = 'look';
  input.press('ArrowRight', true);
  run(0.2);
  input.release('ArrowRight');
  assert.ok(b.x < L.chata.door, 'back at the door: ' + Math.round(b.x));
  assert.ok(g.stats.seen > 0);
  put(L.chata.counter);
  freeze();
  k.cook.state = 'pot';
  b.stun = 0;
  const fat = g.fat;
  input.press('KeyC', false);
  run(0.3);
  assert.equal(k.served, true);
  assert.ok(g.fat > fat + 10, 'a bowl of soup: ' + (g.fat - fat));
  assert.ok(k.bill > 0, 'the bill to the minister is shown');
  assert.equal(ZS.sim.chopok.atCounter(g), false, 'one bowl only');
});

test('thick fog on the ridge hides the bear from anyone further than arm’s length, and the hunters do not shoot into it', () => {
  const { ZS, g, b, L, run, quiet, put } = setup();
  quiet();
  put(L.crest.from + 600);
  run(0.1);
  const f = g.chopok.fog;
  f.phase = 'thick'; f.t = 99;
  const hunter = ZS.sim.hunters.create(g, 'walker', { x: b.x + 260, dir: -1, from: b.x + 200, to: b.x + 300 });
  hunter.cross = b.x; hunter.reload = 0;
  g.shooters = [hunter];
  run(3);
  assert.equal(b.fogged, true);
  assert.equal(b.covered, true);
  assert.equal(g.lives, ZS.CFG.LIVES, 'no shots in the fog');
  f.phase = 'clear'; f.t = 99;
  run(0.2);
  assert.equal(b.fogged, false);
  assert.equal(b.covered, false);
});

test('a gust pushes a standing bear back along the ridge, and a crouching one stays put', () => {
  const { g, b, L, run, quiet, put, hold, release } = setup();
  quiet();
  put(L.crest.from + 500);
  run(0.1);
  const w = g.chopok.wind;
  w.phase = 'gust'; w.t = 99;
  const x = b.x;
  run(1);
  assert.ok(b.x < x - 80, 'pushed back ' + Math.round(x - b.x));
  const y = b.x;
  hold('ArrowDown');
  run(1);
  release('ArrowDown');
  assert.ok(Math.abs(b.x - y) < 1, 'crouched');
});

test('a biker knocks over a standing bear, rings first, and hops over a crouching one', () => {
  const { ZS, g, b, L, run, quiet, put, hold, release } = setup();
  quiet();
  put(L.jasna.bikes[1] - 300);
  run(0.1);
  const c = g.chopok;
  c.bikeT = 0;
  run(DT * 2);
  assert.equal(c.bikes.length, 1);
  assert.ok(ZS.sim.chopok.bell(g), 'the bell rings before the biker arrives');
  assert.ok(c.bikes[0].x - b.x > 500, 'a warning of about two seconds');
  run(2.4);
  assert.ok(b.stun > 0 || g.floaters.some((f) => f.text === ZS.LABELS.chopok.bikeHit), 'knocked over');
  run(2);
  c.bikes = []; c.bikeT = 0;
  put(L.jasna.bikes[1] - 300);
  b.stun = 0;
  hold('ArrowDown');
  run(2.6);
  release('ArrowDown');
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.chopok.bikeHop), 'hopped over');
});

test('tourists next to the mascot think the bear is the mascot, and the rescuer on the ridge only asks if he is lost', () => {
  const { ZS, g, b, L, run, quiet, put } = setup();
  quiet();
  run(0.1);
  const m = g.chopok.mascot;
  m.pause = 99;
  put(m.x + 40);
  g.people = [ZS.sim.people.create(g, 'tourist', { from: b.x + 150, to: b.x + 150 })];
  Object.assign(g.people[0], { dir: -1, pause: 99 });
  const panic = g.panic;
  run(0.5);
  assert.equal(g.panic, panic, 'no panic next to the mascot');
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.chopok.mascot));
  put(L.crest.from + 1500);
  g.people = [ZS.sim.people.create(g, 'rescuer', { from: b.x + 100, to: b.x + 100 })];
  Object.assign(g.people[0], { dir: -1, pause: 99 });
  run(0.3);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.chopok.hello));
  assert.equal(g.shooters.length, 0, 'the rescuer does not shoot');
});

test('the minister on Ďumbier spots a bear in clear weather, misses him in the fog, and the summit book gets an entry', () => {
  const seen = setup();
  seen.quiet();
  seen.put(seen.L.dumbier.minister - 200);
  seen.run(0.1);
  seen.g.chopok.fog.phase = 'clear'; seen.g.chopok.fog.t = 99;
  seen.run(0.2);
  assert.equal(seen.g.chopok.minister.seen, true);
  assert.ok(seen.g.panic > 0);

  const { ZS, g, b, L, run, quiet, put, hold, release } = setup(6);
  quiet();
  put(L.dumbier.minister - 200);
  Object.assign(ZS.sim.chopok.state(g).fog, { phase: 'thick', t: 99, k: 1 });
  hold('ArrowRight');
  run(3);
  release('ArrowRight');
  assert.equal(g.chopok.minister.seen, false);
  assert.equal(g.chopok.minister.passed, true);
  assert.equal(g.once.book, true);
  assert.ok(b.x > L.dumbier.book);
});
