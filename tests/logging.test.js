'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { fakePage } = require('./helpers/fake-dom');

const DT = 1 / 60;

function setup(seed = 3, opts = {}) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'summer', bot: !!opts.bot, viewW: opts.viewW || 960 });
  g.running = true;
  g.nextEvent = 1e9;
  g.time = opts.time || 125;
  g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
  g.bear.waking = false;
  const S = ZS.sim.logging, D = g.level.clearing;
  const step = () => ZS.sim.loop.step(g, DT);
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) { step(); if (each) each(i); }
  };
  const until = (done, seconds) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      if (done()) return true;
      step();
    }
    return done();
  };
  const place = (x, dir) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = dir; };
  const enter = () => {
    place(D.x - 60, 1);
    input.press('ArrowRight', true);
    assert.ok(until(() => !!g.cut && g.cut.phase === 'play', 5), 'the bear walked into the clearing');
    input.release('ArrowRight');
    return g.cut;
  };
  const A = () => g.level.logging;
  const trail = (gap = 300) => {
    const f = g.cut && g.cut.forester, L = g.level.logging;
    if (!f || f.dead || !L) return;
    place(Math.max(L.from + 40, Math.min(L.to - 40, f.x - gap)), 1);
  };
  return { ZS, g, b: g.bear, S, D, input, step, run, until, place, enter, A, trail };
}

function hideAt(ctx, t) {
  const { g, input, until } = ctx;
  ctx.place(t.x - t.w / 2 - 6, 1);
  input.press('ArrowDown', true);
  assert.ok(until(() => g.bear.hiding === t, 1), 'hidden behind the tree at ' + t.x);
}

test('walking through the barrier in the logging area opens the clearing once, as a place of its own, and lets the bear out at the far end of the area', () => {
  const ctx = setup(3);
  const { g, b, D, input, until, place, enter } = ctx;
  const main = g.level, shooters = [ZS_walker(ctx)];
  g.shooters = shooters;
  assert.equal(g.cut, null);
  enter();
  assert.equal(g.level.stage, true, 'the clearing is its own level');
  assert.notEqual(g.level, main);
  assert.equal(g.shooters.length, 0, 'the valley hunters stay in the valley');
  assert.ok(g.level.logging.trees.every((t) => g.level.trees.includes(t)));
  assert.ok(main.trees.filter((t) => t.dry).every((t) => t.x > D.from && t.x < D.to), 'dry spruces grow only in the logging area of the valley');
  g.lives = 99;
  assert.ok(until(() => !g.cut, 60), 'the piece ended');
  assert.equal(g.level, main);
  assert.deepEqual(g.shooters, shooters, 'the valley hunters are back');
  assert.ok(b.x > D.exit - 80 && b.x <= D.exit + 10, 'back at ' + Math.round(b.x) + ', the way out is at ' + D.exit);
  assert.equal(b.dir, 1);
  assert.ok(b.onGround && !b.hiding && !b.climbing);
  assert.ok(g.once.logging && typeof g.once.logging === 'object');
  let again = 0;
  place(D.x + 300, -1);
  input.press('ArrowLeft', true);
  until(() => { if (g.cut) again++; return b.x < D.x - 200; }, 8);
  input.release('ArrowLeft');
  input.press('ArrowRight', true);
  until(() => { if (g.cut) again++; return b.x > D.x + 400; }, 8);
  input.release('ArrowRight');
  assert.equal(again, 0, 'walking past the sign again does not open the clearing a second time');
});

function ZS_walker(ctx) {
  return ctx.ZS.sim.hunters.create(ctx.g, 'walker', { x: ctx.D.x - 400, dir: 1, from: ctx.D.x - 600, to: ctx.D.x - 200 });
}

test('the clearing takes 40–45 s from the door back to the valley, the clock and seasons run on and the bear does not get hungrier', () => {
  const { g, D, place, input, until } = setup(4, { time: 100 });
  g.lives = 99;
  place(D.x - 10, 1);
  input.press('ArrowRight', true);
  assert.ok(until(() => !!g.cut, 1));
  input.release('ArrowRight');
  const t0 = g.time, fat = g.fat;
  assert.ok(until(() => !g.cut, 70));
  const took = g.time - t0;
  assert.ok(took > 40 && took < 46, 'took ' + took.toFixed(1) + ' s');
  assert.equal(g.seasonKey, 'summer', 'spring turned into summer on the clearing');
  assert.ok(Math.abs(g.fat - fat) < 0.2, 'fat ' + fat + ' -> ' + g.fat);
});

test('rubbing a marked tree for about a second wipes the mark, the harvester leaves it standing and a tree hug is no hug', () => {
  const ctx = setup(5);
  const { ZS, g, b, input, run, until, enter, A } = ctx;
  enter();
  const t = A().trees[0];
  assert.equal(t.mark, true, 'the first tree is marked from the start');
  ctx.place(t.x - t.w / 2 - 20, 1);
  input.press('KeyC', true);
  run(0.5);
  assert.equal(b.act && b.act.kind, 'rub');
  assert.equal(b.covered, false, 'a rubbing bear is not hidden');
  input.release('KeyC');
  run(0.2);
  assert.equal(t.mark, true, 'let go too early, the mark stays');
  assert.ok(t.rub > 0.3 && t.rub < 1, 'but the paint is half gone: ' + t.rub.toFixed(2));
  input.press('KeyC', true);
  assert.ok(until(() => !t.mark, 1));
  input.release('KeyC');
  assert.equal(g.stats.hugs, 0, 'a tree is not a person');
  assert.ok(g.tickerQueue.some((q) => q.text === ZS.NEWS.logging.notPerson) || g.once.treeHug);
  ctx.place(t.x + 400, 1);
  run(14);
  assert.ok(ctx.S.standing(g, t), 'the rubbed tree still stands');
  assert.ok(A().stumps.length === 0 || !A().stumps.some((s) => s.id === t.id));
});

test('holding the action key while walking up to a marked tree starts rubbing when the bear stops, and a step cancels it', () => {
  const ctx = setup(6);
  const { b, input, run, enter, A } = ctx;
  enter();
  const t = A().trees[0];
  ctx.place(t.x - 140, 1);
  input.press('KeyC', true);
  input.press('ArrowRight', true);
  run(0.6);
  assert.notEqual(b.act && b.act.kind, 'rub', 'no rubbing on the move');
  input.release('ArrowRight');
  run(0.3);
  assert.equal(b.act && b.act.kind, 'rub', 'a held key applies when the bear stops at the tree');
  input.press('ArrowLeft', true);
  run(0.1);
  assert.notEqual(b.act && b.act.kind, 'rub', 'walking away stops rubbing');
  input.release('ArrowLeft');
  input.release('KeyC');
  input.press('ArrowDown', true);
  run(0.1);
});

test('the harvester fells a marked tree nobody saves, but never one the bear stands at, hides behind, climbs or rubs', () => {
  for (let seed = 1; seed <= 16; seed++) {
    const ctx = setup(seed);
    const { g, input, step, enter, A, S } = ctx;
    enter();
    g.lives = 99;
    const trees = A().trees;
    const plan = seed % 4;
    let felled = 0;
    const at = new Map(trees.map((t) => [t, false]));
    for (let i = 0; i < 60 * 60 && g.cut && g.cut.phase === 'play'; i++) {
      if (plan === 1 && i % 240 === 0) {
        const marked = trees.filter((t) => t.mark && S.standing(g, t));
        const t = marked[(i / 240 + seed) % Math.max(1, marked.length) | 0];
        if (t) { input.release('ArrowDown'); ctx.place(t.x + (seed % 2 ? 1 : -1) * (t.w / 2 + 10), 1); input.press('ArrowDown', true); }
      } else if (plan === 2 && i === 0) {
        input.press('ArrowRight', true);
      } else if (plan === 3 && i % 300 === 0) {
        const t = trees[(i / 300 + seed) % trees.length];
        if (S.standing(g, t)) { input.release('ArrowDown'); ctx.place(t.x - t.w / 2 - 22, 1); input.press('KeyC', true); }
      }
      for (const t of trees) at.set(t, S.standing(g, t) && S.bearAt(g, t));
      step();
      for (const t of trees) {
        if (!t.down) continue;
        if (at.get(t)) assert.fail(`seed ${seed}, plan ${plan}: tree ${t.id} was felled with the bear at it`);
        at.set(t, false);
      }
      felled = trees.filter((t) => t.down).length;
    }
    input.release('ArrowDown'); input.release('ArrowRight'); input.release('KeyC');
    if (plan === 2) assert.ok(felled >= 2, `seed ${seed}: a bear waiting at the far gate lets the harvester fell ${felled} trees`);
    assert.ok(g.cut, 'the piece ran to the end of the shift');
  }
});

test('a bear hidden behind a thick tree or a log pile is never hit, even when the reticle had already started to fill', () => {
  let locks = 0, trees = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const ctx = setup(seed);
    const { ZS, g, b, input, until, run, enter, A, S } = ctx;
    enter();
    const lives = g.lives;
    const near = () => {
      const f = g.cut.forester, list = ZS.sim.bear.spots(g.level).filter((o) => o.x < f.x - 150 - (seed % 3) * 60 && o.x > A().from + 40);
      return list[list.length - 1] || ZS.sim.bear.spots(g.level)[0];
    };
    let pick = near();
    assert.ok(until(() => { if (g.cut.aim.state !== 'lock') { pick = near(); ctx.place(pick.x - pick.w / 2 - 8, 1); } return g.cut.aim.state === 'lock'; }, 34), 'seed ' + seed + ': the reticle locked on the open bear');
    locks++;
    const r = g.cut.aim, wait = (seed % 6) * 0.3;
    run(Math.min(wait, r.fill - 0.2));
    if (!pick.logs && !S.standing(g, pick)) { ctx.place(A().trees.find((t) => S.standing(g, t)).x - 30, 1); }
    input.press('ArrowDown', true);
    assert.ok(until(() => r.state !== 'lock', 4));
    input.release('ArrowDown');
    assert.ok(r.result === 'tree' || r.result === 'pile', `seed ${seed}: hid ${wait.toFixed(1)} s into the fill, ${r.result}`);
    trees++;
    assert.equal(g.lives, lives, 'seed ' + seed);
    assert.ok(b.inv === 0);
  }
  assert.ok(locks === 24 && trees === 24);
});

test('every reticle fills for at least 2.1 s, only one aims at a time, and after a hit the next ones fill longer', () => {
  const locks = (help) => {
    const { g, run, enter, trail } = setup(7);
    enter();
    g.lives = 99;
    g.cut.help = help;
    const out = [];
    let start = null;
    run(36, () => {
      trail();
      const r = g.cut && g.cut.aim;
      if (!r) return;
      assert.ok(!g.shooters.some((s) => s.lock > 0), 'nobody else aims meanwhile');
      if (r.state === 'lock' && start === null) start = { t: g.cut.t, help: g.cut.help };
      if (r.state !== 'lock' && start !== null) { out.push({ took: g.cut.t - start.t, help: start.help, result: r.result }); start = null; }
    });
    return out;
  };
  const plain = locks(0);
  assert.ok(plain.length >= 2, plain.length + ' locks on an idle bear');
  for (const f of plain) assert.ok(f.took >= 2.1 - 1e-6, 'a lock took ' + f.took.toFixed(2) + ' s');
  assert.equal(plain[0].result, 'hit');
  assert.equal(plain[1].help, 1);
  assert.ok(plain[1].took >= plain[0].took * 1.2, JSON.stringify(plain));
  const late = locks(2);
  assert.ok(late.length >= 1 && late[0].took >= plain[0].took * 1.45 && late[0].took >= 2.1 * 1.5, JSON.stringify(late));
  assert.ok(late.length < plain.length + 1, 'fewer threats after two hits');
});

function pass(seed, reaction) {
  const ZS = loadGame({ seed });
  Object.assign(ZS.dev.bot, { reaction, mode: null });
  const g = ZS.sim.rules.create(ZS.ui.input.state, { level: 'summer', bot: true, viewW: 480 });
  g.running = true; g.bear.waking = false; g.time = 120 + (seed % 5) * 9; g.nextEvent = 1e9;
  g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
  const D = g.level.clearing;
  g.bear.x = D.x - 30; g.bear.trackX = D.x - 30;
  let started = false;
  for (let i = 0; i < 80 * 60 && !g.over; i++) {
    ZS.sim.loop.step(g, DT);
    if (g.cut) started = true;
    if (started && !g.cut) break;
  }
  return { g, out: g.once.logging };
}

test('the careful autopilot gets through the clearing at reactions 0.25/0.6/1.0/1.6 s with at most 0.1/0.1/0.2/1.0 hits per pass and never dies there', () => {
  const gate = [[0.25, 0.1], [0.6, 0.1], [1.0, 0.2], [1.6, 1.0]];
  for (const [reaction, most] of gate) {
    let hits = 0, saved = 0;
    const n = 10;
    for (let seed = 1; seed <= n; seed++) {
      const { g, out } = pass(seed, reaction);
      assert.equal(g.over, false, `reaction ${reaction}, seed ${seed}: the bear died on the clearing`);
      assert.ok(out && typeof out === 'object', `reaction ${reaction}, seed ${seed}: the clearing finished`);
      hits += out.hits; saved += out.saved;
    }
    assert.ok(hits / n <= most, `reaction ${reaction}: ${(hits / n).toFixed(2)} hits per pass`);
    assert.ok(saved / n >= 2, `reaction ${reaction}: saved only ${(saved / n).toFixed(1)} trees per pass`);
  }
});

test('a bear trailing the forester in the open gets shot, a sprinting runner too, and both still get out', () => {
  for (const mode of ['trail', 'runner']) {
    const ZS = loadGame({ seed: 9 });
    const { input } = ZS.ui;
    Object.assign(ZS.dev.bot, { reaction: 0.25, mode: mode === 'runner' ? 'runner' : null });
    const g = ZS.sim.rules.create(input.state, { level: 'summer', bot: mode === 'runner', viewW: 960 });
    g.running = true; g.time = 125; g.nextEvent = 1e9; g.bear.waking = false;
    g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
    const D = g.level.clearing;
    g.bear.x = D.x + 2; g.bear.trackX = D.x + 2;
    for (let i = 0; i < 80 * 60 && !g.over && (!g.once.logging || g.cut); i++) {
      ZS.sim.loop.step(g, DT);
      const f = g.cut && g.cut.phase === 'play' && g.cut.forester;
      if (mode === 'trail' && f && !f.dead) { g.bear.x = Math.max(g.level.logging.from + 40, f.x - 300); g.bear.trackX = g.bear.x; g.bear.dir = 1; }
    }
    assert.ok(g.once.logging && g.once.logging.hits >= (mode === 'trail' ? 2 : 1), mode + ': ' + JSON.stringify(g.once.logging));
    assert.ok(g.lives <= (mode === 'trail' ? 3 : 4), mode + ' lost lives: ' + g.lives);
  }
});

test('a bear that stays far behind is out of the forester\'s sight, but the harvester takes the trees it does not save', () => {
  const ctx = setup(9);
  const { g, run, enter, A } = ctx;
  enter();
  g.lives = 99;
  run(36);
  assert.equal(g.cut.aim.shots, 0, 'nobody shot at a bear he never saw');
  assert.ok(A().trees.filter((t) => t.down).length >= 2, 'the harvester felled the marked trees');
});

test('the forester cannot be hugged or bitten: the act button never offers him and C or X next to him do nothing to him', () => {
  const ctx = setup(8);
  const { ZS, g, b, input, until, run, enter } = ctx;
  enter();
  g.lives = 99;
  assert.ok(until(() => { const f = g.cut.forester; return !!f && f.spray > 0.6; }, 30), 'the forester sprays a tree');
  const f = g.cut.forester;
  ctx.place(f.x - f.dir * 50, f.dir);
  run(0.2);
  assert.notEqual(b.reach, f, 'he is not a hug target');
  input.press('KeyC', false);
  run(0.6);
  input.press('KeyX', false);
  run(0.6);
  assert.equal(f.react, null);
  assert.equal(g.stats.hugs, 0);
  assert.equal(g.stats.bites, 0);
  assert.ok(!g.props.length, 'he drops nothing');
  assert.ok(!f.dead, 'and keeps working');
});

test('the forester walks ahead and marks the planned trees in order, stops with a question mark before he looks back and shoots only a bear he sees in the open', () => {
  const ctx = setup(9);
  const { ZS, g, b, until, step, enter, A, S } = ctx;
  enter();
  g.lives = 99;
  const f = g.cut.forester;
  assert.ok(f && f.x > b.x + 150 && f.dir === 1, 'he starts ahead of the bear, walking on');
  const order = [];
  let turned = null, looked = null;
  for (let i = 0; i < 14 * 60 && g.cut.aim.state !== 'lock'; i++) {
    step();
    for (const t of A().trees) if (t.mark && t.planned && !order.includes(t.id) && t.id !== 0) order.push(t.id);
    if (f.job === 'turn' && turned === null) turned = g.cut.t;
    if (f.job === 'look' && looked === null) looked = g.cut.t;
  }
  assert.deepEqual(order, order.slice().sort((x, y) => x - y), 'marked one after another as he walked: ' + order);
  assert.ok(order.length >= 3 && order.every((id) => A().trees[id].plan), 'only planned trees');
  assert.ok(turned !== null && turned >= S.T.aim && looked - turned >= S.LOOK.tell - 1e-6, 'a warning before he looks back');
  assert.equal(g.cut.aim.shots, 0, 'a bear far behind him is not seen');
  ctx.place(f.x - 250, 1);
  const lives = g.lives;
  assert.ok(until(() => f.job === 'look' || f.job === 'turn', 12), 'he looks back again');
  assert.ok(until(() => g.cut.aim.state === 'lock', 4), 'and aims at the bear in the open');
  const t0 = g.cut.t;
  assert.ok(until(() => g.cut.aim.state !== 'lock', 4));
  assert.ok(g.cut.t - t0 >= S.AIM.fill - 1e-6);
  assert.equal(g.lives, lives - 1);
  assert.equal(f.job, 'walk', 'after the shot he walks on');
});

test('the shift ends on time: the forester walks off, the gate opens, the bear walks out and STRACH 24 reports the saved trees', () => {
  const ctx = setup(10);
  const { ZS, g, b, until, enter, A, S } = ctx;
  const said = [];
  ZS.sim.rules.onNews = (item) => said.push(item.text);
  enter();
  g.lives = 99;
  const f = g.cut.forester;
  assert.ok(until(() => g.cut.t >= S.T.quiet + 0.5, 50));
  assert.equal(g.cut.aim.state, 'done', 'no more shots once the shift is over');
  assert.equal(f.job, 'home', 'the forester goes home');
  assert.ok(until(() => g.cut.phase === 'out', 6), 'the shift ends');
  assert.ok(A().gates[1].open > 0 || until(() => A().gates[1].open > 0, 1), 'the far gate opens');
  const end = ZS.NEWS.logging.end;
  assert.ok(said.concat(g.tickerQueue.map((q) => q.text)).some((text) => end.includes(text)), 'STRACH 24 reports the result');
  assert.ok(g.floaters.some((o) => o.text === ZS.LABELS.logging.saved(g.cut.saved, A().trees.filter((t) => t.plan).length)));
  assert.ok(!g.level.trees.some((t) => t.sapling), 'nobody plants anything');
  assert.ok(until(() => !g.cut, 8));
  assert.ok(b.onGround);
});

test('the forester looks back after every tree he marks and every few seconds in between', () => {
  const ctx = setup(12);
  const { g, step, enter, S } = ctx;
  enter();
  g.lives = 99;
  const f = g.cut.forester, turns = [], marks = [];
  let was = f.job, sprayed = 0;
  for (let i = 0; i < 30 * 60; i++) {
    step();
    if (f.job === 'turn' && was !== 'turn') turns.push(g.cut.t);
    if (f.spray > 0) sprayed = g.cut.t; else if (sprayed && f.pause > 0 && marks[marks.length - 1] !== sprayed) marks.push(sprayed);
    was = f.job;
  }
  assert.ok(turns.length >= 4, turns.length + ' looks back in 30 s');
  for (let i = 1; i < turns.length; i++) assert.ok(turns[i] - turns[i - 1] < 7, 'never long without a look: ' + turns.map((t) => t.toFixed(1)).join(' '));
  for (const m of marks.filter((m) => m > S.T.aim)) assert.ok(turns.some((t) => t > m && t - m < 1.2), 'a look right after the mark at ' + m.toFixed(1));
});

test('pausing on the clearing freezes the harvester, the reticle and the clock', () => {
  const { ZS, g, until, enter, A, trail } = setup(11);
  enter();
  assert.ok(until(() => { trail(); return g.cut.aim.state === 'lock'; }, 30));
  const m = A().machine, snap = () => JSON.stringify([g.time, g.cut.t, g.cut.aim.x, g.cut.aim.k, m.x, m.state, m.t, g.bear.x, g.lives]);
  const before = snap();
  g.paused = true;
  ZS.sim.loop.advance(g, 4);
  assert.equal(snap(), before);
  g.paused = false;
  ZS.sim.loop.advance(g, 0.5);
  assert.notEqual(snap(), before);
});

test('the last life lost on the clearing ends the run with the hunted ending, or the cull one during the cull', () => {
  for (const [cull, ending] of [[false, 'hunted'], [true, 'cull']]) {
    const { g, until, enter, trail } = setup(12);
    enter();
    g.lives = 1;
    g.flags.cull = cull;
    assert.ok(until(() => { trail(); return g.over; }, 40));
    assert.equal(g.ending, ending);
    assert.equal(g.lives, 0);
  }
});

test('the year can run out on the clearing and ends the level as usual', () => {
  const { g, until, enter } = setup(13);
  enter();
  g.lives = 99;
  g.time = g.def.year - 2;
  assert.ok(until(() => g.over, 4));
  assert.equal(g.ending, 'starve');
});

test('a run resumed from the logging checkpoint walks into the clearing again and a loss there offers that checkpoint again', () => {
  const ZS = loadGame({ seed: 3 });
  const { input } = ZS.ui;
  const { rules, loop, checkpoint } = ZS.sim;
  const g = rules.create(input.state, { level: 'summer' });
  g.running = true; g.nextEvent = 1e9; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
  const until = (run, done, seconds) => { for (let i = 0; i < Math.round(seconds / DT) && !run.over; i++) { if (done()) return true; loop.step(run, DT); } return done(); };
  const D = g.level.clearing, cp = g.level.checkpoints.find((c) => c.key === 'logging');
  g.bear.x = cp.x + 4; g.bear.trackX = cp.x + 4; g.bear.dir = 1;
  const snap = checkpoint.unpack(checkpoint.pack(Object.assign(checkpoint.save(g, 'logging'), { tally: { trees: 0, stands: 0 } })));
  assert.ok(snap, 'the checkpoint survives storage');
  assert.ok(snap.x < D.x, 'saved before the barrier');
  assert.ok(!snap.once.logging, 'the clearing is still ahead in the checkpoint');
  const r = checkpoint.resume(snap, input.state, {});
  r.running = true; r.nextEvent = 1e9; r.shooters = []; r.people = []; r.dogs = []; r.deer = [];
  assert.ok(!r.level.stage && r.level.clearing);
  input.press('ArrowRight', true);
  assert.ok(until(r, () => !!r.cut, 4), 'the resumed bear walks into the clearing');
  input.release('ArrowRight');
  r.lives = 1;
  assert.ok(until(r, () => {
    const f = r.cut && r.cut.forester;
    if (f && !f.dead) { r.bear.x = Math.max(r.level.logging.from + 40, f.x - 300); r.bear.trackX = r.bear.x; }
    return r.over;
  }, 50));
  assert.equal(checkpoint.offer(snap, r), true, 'the retry from the logging checkpoint is offered');
  assert.equal(r.level.id, 'summer');
});

test('the logging area lies between the hunting stand and the skanzen, far from the chairlift and the koliba, with its own checkpoint before the barrier', () => {
  const ZS = loadGame({ seed: 3 });
  const L = ZS.makeLevel('summer', 11), D = L.clearing, cp = L.checkpoints.find((c) => c.key === 'logging');
  assert.ok(D.from > L.posts[1].x && D.to < L.skanzen.from, D.from + '–' + D.to);
  assert.ok(ZS.sim.lift.station(L) - D.exit > 4000, 'far from the chairlift');
  assert.ok(L.salas.from - D.exit > 1500, 'and from the koliba');
  assert.ok(cp && cp.x > D.from && cp.x < D.x - 100, 'the checkpoint comes before the barrier: ' + (cp && cp.x));
  const dry = L.trees.filter((t) => t.dry);
  assert.ok(dry.length >= 4 && dry.every((t) => t.hide && t.x > D.from && t.x < D.to));
  assert.ok(D.piles.length >= 2 && D.piles.every((p) => p.hide && p.logs && L.covers.includes(p)));
  assert.ok(D.piles.some((p) => p.x < cp.x), 'a log pile to hide behind on the way in');
  assert.ok(ZS.sim.bear.spots(L).some((s) => s.logs), 'the piles are cover spots');
  assert.ok(L.signs.some((s) => s.text === ZS.LABELS.signs.logging && s.x > D.from && s.x < cp.x));
  assert.ok(!L.items.some((it) => it.x > D.x && it.x < D.exit), 'no food behind the barrier');
  assert.ok(D.stumps.length >= 6 && D.exit > D.x + 400 && D.exit < D.to);
});

test('in the valley a log pile hides the bear like a haystack and a shot hits the wood', () => {
  const ZS = loadGame({ seed: 4 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'summer' });
  g.running = true; g.nextEvent = 1e9; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
  const p = g.level.clearing.piles[0], b = g.bear;
  b.x = p.x - 6; b.trackX = b.x; b.dir = 1;
  input.press('ArrowDown', true);
  for (let i = 0; i < 30; i++) ZS.sim.loop.step(g, DT);
  assert.equal(b.hiding, p);
  assert.equal(b.covered, true);
  assert.equal(b.pose, 'pile');
  const lives = g.lives, s = ZS.sim.hunters.create(g, 'walker', { x: p.x - 300, dir: 1, from: p.x - 500, to: p.x - 200 });
  s.cross = b.x;
  ZS.sim.rules.fire(g, s, 'tree');
  assert.equal(g.lives, lives);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.logging.pileHit), 'the wood took the shot');
  input.release('ArrowDown');
});

test('on the clearing a log pile is cover too: a bear ducking behind it when the reticle locks is not hit', () => {
  for (const seed of [3, 4, 5]) {
    const ctx = setup(seed);
    const { g, b, input, until, enter, A } = ctx;
    enter();
    const p = A().stacks.find((s) => s.hide);
    ctx.place(p.x - 6, 1);
    assert.ok(until(() => g.cut.aim.state === 'lock', 40), 'seed ' + seed + ': the reticle locked on the open bear');
    const r = g.cut.aim, lives = g.lives;
    input.press('ArrowDown', true);
    assert.ok(until(() => r.state !== 'lock', 4));
    input.release('ArrowDown');
    assert.equal(r.result, 'pile', 'seed ' + seed);
    assert.equal(g.lives, lives);
  }
});

test('a felled tree leaves a stack of logs that becomes cover once the last log lies on it', () => {
  const ctx = setup(6);
  const { ZS, g, run, enter, A } = ctx;
  enter();
  g.lives = 99;
  ctx.place(A().from + 40, 1);
  let seen = null;
  run(34, () => {
    const s = A().stacks.find((o) => !o.old);
    if (!s) return;
    if (!seen) { seen = s; assert.equal(s.hide, false, 'a stack still growing hides nobody'); }
    if (s.n >= s.full) assert.ok(s.hide && ZS.sim.bear.spots(g.level).includes(s));
  });
  assert.ok(seen, 'a stack appeared by a stump');
  assert.equal(seen.n, seen.full);
});

test('the harvester waits at the first marked tree for the bear to learn the hug, then saws it if nobody comes', () => {
  const ctx = setup(7);
  const { g, run, until, enter, A, S } = ctx;
  enter();
  g.lives = 99;
  const t = A().trees.find((o) => o.teach);
  ctx.place(A().to - 70, -1);
  assert.ok(until(() => g.cut.t >= S.T.teach - 0.3, 12));
  assert.ok(S.standing(g, t), 'the first tree still stands while the bear learns');
  assert.equal(A().machine.tree, t);
  run(3);
  assert.ok(!S.standing(g, t), 'then the harvester saws it');
  assert.ok(g.cut.taught !== null);
});

test('the act button reads Zotri at a marked tree and the page runs the clearing frame by frame without errors', () => {
  const page = fakePage();
  const ZS = loadGame({ wholePage: true, document: page.document, localStorage: page.localStorage, location: page.location, globals: page.globals, problems: page.problems });
  ZS.dev.start('summer');
  const g = ZS.dev.game();
  g.nextEvent = 1e9;
  const D = g.level.clearing;
  ZS.dev.teleport(D.x - 30);
  ZS.ui.input.press('ArrowRight', true);
  for (let i = 0; i < 240 && !(g.cut && g.cut.phase === 'play'); i++) page.tick(1);
  ZS.ui.input.release('ArrowRight');
  assert.equal(ZS.dev.game().cut.phase, 'play');
  const t = g.level.logging.trees[0];
  ZS.dev.teleport(t.x - t.w / 2 - 20);
  page.tick(12);
  const label = page.byId.get('act').querySelector('span').textContent;
  assert.equal(label, ZS.UI.touch.acts.rub);
  assert.equal(label, 'Zotri');
  assert.ok(page.byId.get('touch').classList.contains('cut'), 'no bite button on the clearing');
  const hud = page.byId.get('hud'), panel = page.byId.get('trees');
  assert.ok(hud.classList.contains('cut'), 'the clearing swaps the HUD');
  assert.equal(panel.hidden, false);
  const plan = g.level.logging.trees.filter((o) => o.plan).length;
  assert.match(panel.innerHTML, new RegExp('>' + (plan - 1) + '<small>/' + plan + '</small>'), 'all but the first marked tree are safe');
  assert.ok(panel.innerHTML.includes(ZS.UI.clearing.saved));
  assert.equal((panel.innerHTML.match(/<i class="/g) || []).length, plan, 'one icon per planned tree');
  g.lives = 99;
  for (let i = 0; i < 60 * 50 && g.cut; i++) page.tick(1);
  assert.equal(g.cut, null, 'the clearing ended in the real frame loop');
  page.tick(12);
  assert.ok(!hud.classList.contains('cut') && panel.hidden, 'the valley HUD is back');
  assert.deepEqual(page.problems, []);
});
