'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;
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
  const saves = [];
  rules.onLand = (run) => saves.push({ snap: checkpoint.save(run), x: run.bear.x, fat: run.fat, time: run.time, lives: run.lives });
  const until = (done, seconds, run = g) => {
    for (let i = 0; i < Math.round(seconds / DT) && !run.over; i++) {
      if (done()) return true;
      loop.step(run, DT);
    }
    return done();
  };
  const ride = () => {
    g.bear.x = x - 160; g.bear.trackX = x - 160; g.bear.dir = 1;
    input.press('ArrowRight', true);
    assert.ok(until(() => !!g.ride, 3), 'the walk reached the station');
    input.release('ArrowRight');
    g.bear.inv = 1e9;
    assert.ok(until(() => !g.ride, 40), 'the ride ended');
    g.bear.inv = 0;
  };
  return { ZS, g, x, input, rules, loop, checkpoint, saves, until, ride };
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
  test(`the checkpoint is saved once, when the bear lands at the top of the chairlift, ${level}`, () => {
    const { g, x, saves, ride } = setup(level);
    prepare(g, x);
    ride();
    assert.equal(saves.length, 1);
    const { snap } = saves[0];
    assert.equal(snap.level, level);
    assert.equal(snap.x, saves[0].x);
    assert.ok(snap.x > x + 60, 'saved past the lower station');
    assert.equal(snap.fat, saves[0].fat);
    assert.equal(snap.time, saves[0].time);
    assert.equal(saves[0].lives, 2);
    assert.equal(snap.lives, 3, 'lives come back at three');
    assert.equal(snap.syn <= 12 && snap.syn > 0, true);
    assert.equal(snap.stats.hugs, 1);
    assert.equal(snap.flags.meat, true);
    assert.deepEqual([...snap.usedEvents], ['court']);
    assert.equal(snap.once.lift, true);
    assert.equal(snap.seasonIdx, g.seasonIdx);
    g.stats.hugs = 9; g.flags.cull = true;
    assert.equal(snap.stats.hugs, 1, 'the snapshot is a copy');
    assert.equal(snap.flags.cull, false);
  });

  test(`more lives than three at landing are kept, ${level}`, () => {
    const { g, x, saves, ride } = setup(level);
    prepare(g, x);
    g.lives = 5;
    ride();
    assert.equal(saves[0].snap.lives, 5);
  });

  test(`the retry from the chairlift is offered only for a loss after the ride, ${level}`, () => {
    const { ZS, g, x, saves, rules, checkpoint, ride } = setup(level);
    prepare(g, x);
    rules.end(g, 'hunted');
    assert.equal(checkpoint.offer(null, g), false, 'no checkpoint before the lift');
    const late = setup(level);
    prepare(late.g, late.x);
    late.ride();
    const snap = late.saves[0].snap;
    assert.equal(late.checkpoint.offer(snap, late.g), false, 'not while the game runs');
    late.rules.end(late.g, 'hunted');
    assert.equal(late.checkpoint.offer(snap, late.g), true);
    for (const ending of ['cull', 'poacher', 'problem', 'starve', 'lonely']) assert.equal(late.checkpoint.offer(snap, Object.assign({}, late.g, { ending })), true, ending);
    assert.equal(late.checkpoint.offer(snap, Object.assign({}, late.g, { ending: 'win' })), false, 'not after a win');
    const other = ZS.sim.rules.create(ZS.ui.input.state, { level: level === 'summer' ? 'winter' : 'summer' });
    other.over = true; other.ending = 'hunted';
    assert.equal(late.checkpoint.offer(snap, other), false, 'not on another level');
    assert.equal(saves.length, 0);
  });

  test(`a resumed game starts past the lift with the saved values and the same layout, ${level}`, () => {
    const { ZS, g, x, input, checkpoint, saves, until, ride } = setup(level);
    const { before, after } = prepare(g, x);
    ride();
    const { snap } = saves[0];
    const r = checkpoint.resume(snap, input.state, {});
    r.running = true;
    assert.equal(r.level.id, level);
    assert.deepEqual(r.level.trees.map((t) => [t.kind, t.x, t.h]), g.level.trees.map((t) => [t.kind, t.x, t.h]));
    assert.deepEqual(r.level.items.map((it) => [it.type, it.x]), g.level.items.map((it) => [it.type, it.x]));
    assert.deepEqual(r.level.spawns, ZS.makeLevel(level, 11).spawns);
    assert.equal(r.bear.x, snap.x);
    assert.equal(r.bear.waking, false);
    assert.equal(r.ride, null);
    assert.equal(r.once.lift, true);
    for (const k of ['fat', 'syn', 'panic', 'time', 'seasonIdx', 'seasonKey', 'lives']) assert.equal(r[k], snap[k], k);
    assert.equal(r.lives, 3);
    assert.deepEqual({ ...r.stats }, { ...snap.stats });
    assert.deepEqual({ ...r.flags }, { ...snap.flags });
    assert.deepEqual([...r.usedEvents], ['court']);
    assert.equal(r.level.items.find((it) => it.type === before.type && it.x === before.x).eaten, true, 'food eaten before the lift stays eaten');
    assert.equal(r.level.items.find((it) => it.type === after.type && it.x === after.x).eaten, false, 'food after the lift is fresh');
    r.stats.hugs = 7;
    assert.equal(checkpoint.resume(snap, input.state, {}).stats.hugs, 1, 'resuming again starts from the same snapshot');
    input.press('ArrowLeft', true);
    let rode = 0;
    until(() => { if (r.ride) rode++; return r.bear.x < x - 200; }, 8, r);
    input.release('ArrowLeft');
    r.bear.x = x - 120; r.bear.trackX = x - 120;
    input.press('ArrowRight', true);
    until(() => { if (r.ride) rode++; return r.bear.x > snap.x + 200; }, 8, r);
    input.release('ArrowRight');
    assert.equal(rode, 0, 'the bear does not ride again');
    assert.ok(r.bear.x > snap.x + 200);
    assert.equal(saves.length, 1);
  });
}

function botRun(run, hook) {
  const ZS = loadGame({ seed: run.seed });
  const { rules, loop, checkpoint } = ZS.sim;
  Object.assign(ZS.dev.bot, { reaction: run.reaction, mode: run.mode });
  const saved = [];
  if (hook) rules.onLand = (g) => saved.push(checkpoint.save(g));
  const level = run.level || 'summer';
  const g = rules.create(ZS.ui.input.state, { viewW: 480, bot: true, level });
  g.running = true;
  rules.say(g, level === 'winter' ? ZS.NEWS.winterStart : ZS.NEWS.springStart);
  for (let i = 0; i < 1500 && !g.over; i++) loop.advance(g, 0.5);
  return {
    saved: saved.map((s) => s.x > ZS.sim.lift.station(g.level)),
    end: JSON.stringify({ ending: g.ending, time: g.time, fat: g.fat, syn: g.syn, panic: g.panic, lives: g.lives, x: g.bear.x, stats: g.stats, flags: g.flags, events: [...g.usedEvents] }),
  };
}

test('saving at landing leaves seeded bot runs unchanged', () => {
  const pick = (level) => runs.find((r) => (r.level || 'summer') === level && r.expected.ending === 'win');
  for (const run of [pick('summer'), pick('winter')]) {
    const plain = botRun(run, false), saving = botRun(run, true);
    assert.deepEqual(saving.saved, [true], 'saved once past the lift');
    assert.equal(saving.end, plain.end);
  }
});

test('each level lists its checkpoints before the chairlift, in order and away from the lift', () => {
  for (const [level, keys] of [['summer', ['skanzen', 'koliba']], ['winter', ['market']]]) {
    const { g, x } = setup(level);
    const cps = g.level.checkpoints;
    assert.equal(cps.map((c) => c.key).join(), keys.join(), level);
    cps.forEach((c, i) => {
      assert.ok(c.x > 600 && c.x < x - 300, level + ' ' + c.key + ' ' + c.x);
      if (i) assert.ok(c.x > cps[i - 1].x);
    });
  }
});

for (const [level, key] of [['summer', 'skanzen'], ['summer', 'koliba'], ['winter', 'market']]) {
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
  for (const bad of [null, '', '{', '[]', 'null', JSON.stringify({ v: 99, s: snap }),
    text.replace('"level":"winter"', '"level":"moon"'), text.replace('"key":"market"', '"key":"koliba"'),
    text.replace(/"x":[\d.]+,"dir"/, '"x":-5,"dir"')]) {
    assert.equal(checkpoint.unpack(bad), null, String(bad).slice(0, 40));
  }
  assert.ok(checkpoint.unpack(text));
});
