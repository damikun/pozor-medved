'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;
const BOARD = 30;
const runs = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'bot-runs.json'), 'utf8'));

function setup(level, seed = 3) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const { rules, loop, lift, checkpoint } = ZS.sim;
  const g = rules.create(input.state, { level });
  g.running = true;
  g.nextEvent = 1e9;
  g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
  g.bear.waking = false;
  const x = lift.station(g.level);
  const until = (done, seconds, run = g) => {
    for (let i = 0; i < Math.round(seconds / DT) && !run.over; i++) {
      if (done()) return true;
      loop.step(run, DT);
    }
    return done();
  };
  const ride = (run = g) => {
    input.press('ArrowRight', true);
    assert.ok(until(() => !!run.ride, 6, run), 'the walk reached the station');
    input.release('ArrowRight');
    run.bear.inv = 1e9;
    assert.ok(until(() => !run.ride, 40, run), 'the ride ended');
    run.bear.inv = 0;
  };
  const at = (run, key) => {
    const cp = run.level.checkpoints.find((c) => c.key === key);
    run.bear.x = cp.x + 4; run.bear.trackX = cp.x + 4; run.bear.dir = 1;
    return cp;
  };
  return { ZS, g, x, input, rules, loop, checkpoint, until, ride, at };
}

function prepare(g, x) {
  Object.assign(g, { fat: 47, syn: 12, panic: 20, time: 140, lives: 2 });
  g.stats.hugs = 1; g.stats.natural = 4;
  g.flags.meat = true;
  g.usedEvents.add('court');
  const before = g.level.items.find((it) => it.x < x - 400);
  const after = g.level.items.find((it) => it.x > x + 400);
  before.eaten = true; after.eaten = true;
  return { before, after };
}

for (const level of ['summer', 'winter']) {
  test(`the chairlift checkpoint waits just before the lower station, so a ride lost is a ride again, ${level}`, () => {
    const { g, x, checkpoint, at } = setup(level);
    const cp = at(g, 'lift');
    assert.ok(cp.x < x - BOARD && cp.x > x - 300, 'before the boarding zone: ' + cp.x + ' vs ' + x);
    prepare(g, x);
    const snap = checkpoint.save(g, 'lift');
    assert.equal(snap.level, level);
    assert.equal(snap.key, 'lift');
    assert.ok(Math.abs(snap.x - (cp.x + 4)) < 1);
    assert.equal(snap.lives, 3, 'lives come back at three');
    assert.equal(snap.once.lift, undefined, 'the ride is still ahead');
    assert.equal(snap.stats.hugs, 1);
    assert.equal(snap.flags.meat, true);
    assert.deepEqual([...snap.usedEvents], ['court']);
    g.stats.hugs = 9; g.flags.cull = true;
    assert.equal(snap.stats.hugs, 1, 'the snapshot is a copy');
    assert.equal(snap.flags.cull, false);
  });

  test(`more lives than three at the chairlift checkpoint are kept, ${level}`, () => {
    const { g, x, checkpoint, at } = setup(level);
    at(g, 'lift');
    prepare(g, x);
    g.lives = 5;
    assert.equal(checkpoint.save(g, 'lift').lives, 5);
  });

  test(`a loss on the chairlift or after it offers the retry from the lower station, ${level}`, () => {
    const { ZS, g, x, rules, checkpoint, ride, at } = setup(level);
    at(g, 'lift');
    prepare(g, x);
    const snap = checkpoint.save(g, 'lift');
    assert.equal(checkpoint.offer(snap, g), false, 'not while the game runs');
    ride();
    rules.end(g, 'hunted');
    assert.equal(checkpoint.offer(snap, g), true);
    for (const ending of ['cull', 'poacher', 'problem', 'starve', 'lonely']) assert.equal(checkpoint.offer(snap, Object.assign({}, g, { ending })), true, ending);
    assert.equal(checkpoint.offer(snap, Object.assign({}, g, { ending: 'win' })), false, 'not after a win');
    const other = ZS.sim.rules.create(ZS.ui.input.state, { level: level === 'summer' ? 'winter' : 'summer' });
    other.over = true; other.ending = 'hunted';
    assert.equal(checkpoint.offer(snap, other), false, 'not on another level');
  });

  test(`a game resumed from the chairlift checkpoint starts before the station with the saved values, the same layout and the ride ahead, ${level}`, () => {
    const { ZS, g, x, input, checkpoint, ride, at } = setup(level);
    at(g, 'lift');
    const { before, after } = prepare(g, x);
    const snap = checkpoint.save(g, 'lift');
    const r = checkpoint.resume(snap, input.state, {});
    r.running = true; r.nextEvent = 1e9; r.shooters = []; r.people = []; r.dogs = []; r.deer = [];
    assert.equal(r.level.id, level);
    assert.deepEqual(r.level.trees.map((t) => [t.kind, t.x, t.h]), g.level.trees.map((t) => [t.kind, t.x, t.h]));
    assert.deepEqual(r.level.items.map((it) => [it.type, it.x]), g.level.items.map((it) => [it.type, it.x]));
    assert.deepEqual(r.level.spawns, ZS.makeLevel(level, 11).spawns);
    assert.equal(r.bear.x, snap.x);
    assert.ok(r.bear.x < x - BOARD);
    assert.equal(r.bear.waking, false);
    assert.equal(r.ride, null);
    assert.ok(!r.once.lift);
    for (const k of ['fat', 'syn', 'panic', 'time', 'seasonIdx', 'seasonKey', 'lives']) assert.equal(r[k], snap[k], k);
    assert.equal(r.lives, 3);
    assert.deepEqual({ ...r.stats }, { ...snap.stats });
    assert.deepEqual({ ...r.flags }, { ...snap.flags });
    assert.deepEqual([...r.usedEvents], ['court']);
    assert.equal(r.level.items.find((it) => it.type === before.type && it.x === before.x).eaten, true, 'food eaten before the checkpoint stays eaten');
    assert.equal(r.level.items.find((it) => it.type === after.type && it.x === after.x).eaten, false, 'food after the checkpoint is fresh');
    r.stats.hugs = 7;
    assert.equal(checkpoint.resume(snap, input.state, {}).stats.hugs, 1, 'resuming again starts from the same snapshot');
    ride(r);
    assert.equal(r.once.lift, true, 'the resumed bear rides the chairlift');
  });
}


function botRun(run, hook) {
  const ZS = loadGame({ seed: run.seed });
  const { rules, loop, checkpoint } = ZS.sim;
  Object.assign(ZS.dev.bot, { reaction: run.reaction, mode: run.mode });
  const saved = [];
  const level = run.level || 'summer';
  const g = rules.create(ZS.ui.input.state, { viewW: 480, bot: true, level });
  g.running = true;
  rules.say(g, level === 'winter' ? ZS.NEWS.winterStart : ZS.NEWS.springStart);
  const cps = g.level.checkpoints;
  for (let i = 0; i < 1500 && !g.over; i++) {
    loop.advance(g, 0.5);
    if (!hook || g.ride || g.cut) continue;
    for (const c of cps) if (!saved.some((s) => s.key === c.key) && g.bear.x >= c.x) saved.push(checkpoint.save(g, c.key));
  }
  return {
    saved: saved.map((s) => s.key + (s.key === 'lift' ? (s.once.lift ? ' after' : ' before') : '')),
    end: JSON.stringify({ ending: g.ending, time: g.time, fat: g.fat, syn: g.syn, panic: g.panic, lives: g.lives, x: g.bear.x, stats: g.stats, flags: g.flags, events: [...g.usedEvents] }),
  };
}

test('saving every checkpoint on the way leaves seeded bot runs unchanged', () => {
  const pick = (level) => runs.find((r) => (r.level || 'summer') === level && r.expected.ending === 'win');
  for (const [run, keys] of [[pick('summer'), ['logging', 'skanzen', 'koliba', 'lift before']], [pick('winter'), ['market', 'lift before']]]) {
    const plain = botRun(run, false), saving = botRun(run, true);
    assert.deepEqual(saving.saved, keys);
    assert.equal(saving.end, plain.end);
  }
});

test('each level lists its checkpoints in order, the chairlift one right before the lower station and the others away from it', () => {
  for (const [level, keys] of [['summer', ['logging', 'skanzen', 'koliba', 'lift']], ['winter', ['market', 'lift']]]) {
    const { g, x } = setup(level);
    const cps = g.level.checkpoints;
    assert.equal(cps.map((c) => c.key).join(), keys.join(), level);
    cps.forEach((c, i) => {
      if (c.key === 'lift') assert.ok(c.x < x - BOARD && c.x > x - 300, level + ' lift ' + c.x);
      else assert.ok(c.x > 600 && c.x < x - 300, level + ' ' + c.key + ' ' + c.x);
      if (i) assert.ok(c.x > cps[i - 1].x);
    });
  }
});

for (const [level, key] of [['summer', 'logging'], ['summer', 'skanzen'], ['summer', 'koliba'], ['summer', 'lift'], ['winter', 'market'], ['winter', 'lift']]) {
  test(`a checkpoint at the ${key} resumes before the chairlift, with the ride still ahead (${level})`, () => {
    const { ZS, g, x, input, checkpoint, until } = setup(level);
    const cp = g.level.checkpoints.find((c) => c.key === key);
    g.bear.x = cp.x + 4; g.bear.trackX = cp.x + 4;
    Object.assign(g, { fat: 33, time: 90, lives: 1 });
    g.stats.selfies = 1;
    const snap = checkpoint.save(g, key);
    assert.equal(snap.key, key);
    g.over = true; g.ending = 'hunted';
    assert.ok(checkpoint.offer(snap, g));
    const r = checkpoint.resume(snap, input.state, {});
    assert.equal(r.level.id, level);
    assert.ok(Math.abs(r.bear.x - (cp.x + 4)) < 1);
    assert.equal(r.fat, 33); assert.equal(r.time, 90); assert.equal(r.stats.selfies, 1);
    assert.equal(r.lives, checkpoint.LIVES);
    assert.ok(!r.once.lift, 'the chairlift ride is still ahead');
    r.running = true; r.nextEvent = 1e9; r.shooters = []; r.people = []; r.dogs = []; r.deer = [];
    r.bear.x = x - 160; r.bear.trackX = x - 160; r.bear.dir = 1; r.bear.inv = 1e9;
    input.press('ArrowRight', true);
    assert.ok(until(() => !!r.ride, 3, r), 'the resumed bear can still ride the chairlift');
    input.release('ArrowRight');
  });
}

test('a checkpoint survives a round trip through storage text, hunters that never leave included', () => {
  const ZS = loadGame({ seed: 3 });
  const { input } = ZS.ui;
  const { rules, checkpoint } = ZS.sim;
  const g = rules.create(input.state, { level: 'summer' });
  const cp = g.level.checkpoints.find((c) => c.key === 'koliba');
  g.bear.x = cp.x + 4; g.bear.trackX = cp.x + 4;
  Object.assign(g, { fat: 41, time: 150 });
  g.stats.hugs = 2;
  assert.ok(g.shooters.some((s) => s.life === Infinity), 'the level has a hunter that stays');
  const snap = Object.assign(checkpoint.save(g, 'koliba'), { tally: { trees: 3, stands: 1 } });
  const back = checkpoint.unpack(checkpoint.pack(snap));
  assert.ok(back);
  assert.deepEqual({ ...back.tally }, { ...snap.tally });
  const r = checkpoint.resume(back, input.state, {}), d = checkpoint.resume(snap, input.state, {});
  assert.equal(r.fat, 41); assert.equal(r.stats.hugs, 2);
  assert.ok(Math.abs(r.bear.x - (cp.x + 4)) < 1);
  assert.deepEqual(r.shooters.map((s) => [s.x, s.life]), d.shooters.map((s) => [s.x, s.life]));
  assert.deepEqual(r.level.items.map((it) => it.eaten), d.level.items.map((it) => it.eaten));
  assert.deepEqual(r.flags, d.flags); assert.deepEqual(r.once, d.once); assert.deepEqual([...r.usedEvents], [...d.usedEvents]);
});

test('broken or foreign storage text gives no checkpoint', () => {
  const ZS = loadGame({ seed: 3 });
  const { input } = ZS.ui;
  const { rules, checkpoint } = ZS.sim;
  const g = rules.create(input.state, { level: 'winter' });
  const cp = g.level.checkpoints[0];
  g.bear.x = cp.x + 4;
  const snap = Object.assign(checkpoint.save(g, cp.key), { tally: { trees: 0, stands: 0 } });
  const text = checkpoint.pack(snap);
  for (const bad of [null, '', '{', '[]', 'null', JSON.stringify({ v: 99, s: snap }), JSON.stringify({ v: 1, s: snap }),
    text.replace('"level":"winter"', '"level":"moon"'), text.replace('"key":"market"', '"key":"koliba"'),
    text.replace(/"x":[\d.]+,"dir"/, '"x":-5,"dir"')]) {
    assert.equal(checkpoint.unpack(bad), null, String(bad).slice(0, 40));
  }
  assert.ok(checkpoint.unpack(text));
});
