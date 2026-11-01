'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(seed, { draw = false, level = 'summer' } = {}) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer: draw, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level });
  const said = [];
  ZS.sim.rules.onNews = (item) => said.push(item.text);
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  const ctx = draw ? createCanvas(1280, 720, problems).getContext('2d') : null;
  let drawing = true;
  const step = () => {
    ZS.sim.loop.step(g, DT);
    if (ctx && drawing) {
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, 960, 0);
      assert.equal(stackDepth(ctx), 0, 'save() without restore()');
    }
  };
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      step();
      if (each) each(i);
    }
  };
  const until = (pred, seconds = 10) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      if (pred()) return true;
      step();
    }
    return pred();
  };
  const t = {
    ZS, g, b: g.bear, L: g.level, run, until, said, problems,
    K: g.level.salas ? g.level.salas.koliba : 0,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
  t.walkUp = (from = -420) => {
    const dir = from < 0 ? 1 : -1, key = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
    t.b.x = t.K + from; t.b.dir = dir;
    t.hold(key);
    t.until(() => g.koliba && g.koliba.mode === 'busy', 5);
    t.release(key);
    return g.koliba;
  };
  t.leave = (seconds = 10) => { t.b.x = t.K - 1000; drawing = false; t.run(seconds); drawing = true; };
  return t;
}

function find(want, from = -420) {
  for (let seed = 1; seed < 120; seed++) {
    const t = setup(seed);
    const k = t.walkUp(from);
    if (k && k.mode === 'busy' && want(k)) return { seed, t, k };
  }
  throw new Error('no seed found');
}

const ROOF = { hatch: 1, chimney: 1 };
const fleeing = (g) => g.people.filter((p) => p.koliba);

test('guests at the koliba take fright when the bear walks up and escape through the window, the door or onto the roof', async (t) => {
  const s = setup(3);
  const { g, b, K, ZS } = s;
  const panic = g.panic, seen = g.stats.seen;
  const k = s.walkUp(-420);
  const grounded = k.guests.filter((o) => !ROOF[o.route]).length;

  await t.test('the scene starts within a couple of hundred pixels', () => {
    assert.equal(k.mode, 'busy');
    const d = K - b.x;
    assert.ok(d > 150 && d < 260, 'started at ' + Math.round(d) + ' px');
    assert.ok(k.guests.length >= 1 && k.guests.length <= 3, k.guests.length + ' guests');
    for (const o of k.guests) assert.ok(['window', 'door', 'hatch', 'chimney'].includes(o.route), o.route);
  });

  await t.test('somebody shouts, the bear counts as seen and the panic rises a little', () => {
    assert.equal(g.stats.seen, seen + 1);
    assert.ok(g.floaters.some((f) => ZS.LABELS.koliba.shouts.includes(f.text)));
    assert.ok(g.panic > panic && g.panic - panic <= 10, 'panic +' + (g.panic - panic).toFixed(1));
  });

  await t.test('those who leave on the ground run away from the bear like other people', () => {
    s.run(3.5);
    const out = fleeing(g);
    assert.ok(grounded >= 1);
    assert.equal(out.length, grounded);
    for (const p of out) {
      assert.equal(p.state, 'flee');
      assert.equal(p.dir, 1);
      assert.ok(p.x > K - 60, 'at ' + Math.round(p.x - K));
    }
  });
});

test('a bear coming from the other side sends the guests running the other way', () => {
  const { t: s } = find((k) => k.guests.some((o) => o.route === 'door' || o.route === 'window'), 420);
  const { g, run } = s;
  run(3.5);
  const out = fleeing(g);
  assert.ok(out.length >= 1);
  for (const p of out) assert.equal(p.dir, -1);
});

test('every visit is different: other seeds give other escape mixes', () => {
  const mixes = new Set(), routes = new Set(), styles = new Set(), sizes = new Set();
  let waiters = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const k = setup(seed).walkUp();
    mixes.add(k.last);
    sizes.add(k.guests.length);
    for (const o of k.guests) {
      routes.add(o.route);
      if (o.style) styles.add(o.style);
      if (o.kind === 'waiter') waiters++;
    }
  }
  assert.ok(mixes.size >= 8, [...mixes].join(' / '));
  assert.deepEqual([...routes].sort(), ['chimney', 'door', 'hatch', 'window']);
  assert.deepEqual([...styles].sort(), ['dive', 'jump']);
  assert.ok(sizes.size >= 2, 'group sizes ' + [...sizes]);
  assert.ok(waiters >= 1);
});

test('guests on the roof stay up while the bear is near and come down once it has gone', async (t) => {
  const { t: s, k } = find((q) => q.guests.some((o) => o.route === 'hatch') && q.guests.some((o) => o.route === 'chimney'));
  const { g, run } = s;
  const roof = k.guests.filter((o) => ROOF[o.route]);
  run(8);

  await t.test('with the bear standing by they stay on the roof', () => {
    for (const o of roof) {
      assert.equal(o.done, undefined);
      assert.ok(o.ph === 'perch' || o.ph === 'cling', o.route + ' ' + o.ph);
    }
    assert.ok(k.lid.at > k.lid.shut, 'the hatch is open');
  });

  await t.test('after the bear leaves they climb back in and the hatch closes', () => {
    const seen = new Set();
    s.leave(12);
    for (const o of roof) assert.equal(o.done, true);
    assert.equal(k.mode, 'calm');
    assert.ok(k.lid.shut >= k.lid.at, 'the hatch is shut');
    assert.equal(fleeing(g).filter((p) => ROOF[p.route]).length, 0);
    run(1, () => seen.add(k.mode));
    assert.deepEqual([...seen], ['calm']);
  });

  await t.test('the window fills up with guests again', () => {
    run(14);
    assert.equal(k.seats.map((q) => q.mode).join(' '), 'sit sit');
    assert.ok(k.win.shut >= k.win.at);
  });
});

test('the koliba settles down and only reacts again after the bear has left and come back', () => {
  const { t: s, k } = find((q) => q.guests.every((o) => !ROOF[o.route]));
  const { g, b, K, run } = s;
  run(4);
  assert.equal(k.mode, 'calm');
  const first = k.last;
  for (let i = 0; i < 6; i++) { b.x = K - 200 + i * 60; run(2); }
  assert.equal(k.visits, 1, 'no second scene while the bear hangs around');
  s.leave(14);
  const again = s.walkUp();
  assert.equal(again.visits, 2);
  assert.equal(again.mode, 'busy');
  assert.notEqual(again.last, first);
  assert.ok(g.time > 10);
});

test('a waiter who drops his tray leaves bryndzové halušky, human food the bear can eat', async (t) => {
  const { t: s } = find((k) => k.guests.some((o) => o.kind === 'waiter' && o.drops));
  const { ZS, g, b, L, run, until, said } = s;

  await t.test('the tray flies and the halušky land on the ground', () => {
    assert.ok(until(() => L.items.some((it) => it.type === 'halusky'), 6));
    assert.ok(g.props.some((p) => p.kind === 'tray'));
    assert.ok(g.floaters.some((f) => ZS.LABELS.koliba.waiter.includes(f.text)));
  });

  await t.test('eating them adds fat and synanthropy like other food from people', () => {
    const it = L.items.find((x) => x.type === 'halusky');
    run(1);
    const fat = g.fat, syn = g.syn, human = g.stats.human;
    b.x = it.x; b.vx = 0;
    run(0.8);
    assert.equal(it.eaten, true);
    assert.equal(g.stats.human, human + 1);
    assert.ok(g.fat - fat > ZS.FOOD.halusky.fat - 0.5, 'fat +' + (g.fat - fat).toFixed(1));
    assert.ok(g.syn - syn > ZS.FOOD.halusky.syn - 1, 'syn +' + (g.syn - syn).toFixed(1));
    assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.eaten(ZS.FOOD.halusky.fat, ZS.LABELS.food.halusky)));
    run(8);
    assert.ok(said.some((text) => ZS.NEWS.haluskyEaten.includes(text)), said.join(' | '));
  });
});

test('a guest running out of the door can be hugged, and the hug counts for the den', () => {
  const { t: s } = find((k) => k.guests.some((o) => o.route === 'door' && o.kind === 'guest'));
  const { ZS, g, b, run, until, press } = s;
  assert.ok(until(() => fleeing(g).some((p) => p.kind === 'guest'), 4));
  const p = fleeing(g).find((q) => q.kind === 'guest');
  b.x = p.x - p.dir * 40; b.dir = p.dir; b.vx = 0;
  press('KeyC');
  run(DT);
  assert.equal(p.react, 'hugged');
  run(0.5);
  assert.equal(g.stats.hugs, 1);
  assert.ok(ZS.sim.rules.hugged(g));
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.shout.hug.guest));
  run(ZS.CFG.HUG);
  assert.equal(p.state, 'flee');
});

test('a hugged waiter drops the tray and the halušky spill', () => {
  const { t: s } = find((k) => k.guests.some((o) => o.kind === 'waiter' && !o.drops));
  const { ZS, g, b, L, run, until, press } = s;
  assert.ok(until(() => fleeing(g).some((p) => p.kind === 'waiter'), 4));
  const p = fleeing(g).find((q) => q.kind === 'waiter');
  b.x = p.x - p.dir * 40; b.dir = p.dir; b.vx = 0;
  press('KeyC');
  run(0.6);
  assert.equal(g.stats.hugs, 1);
  assert.equal(p.empty, true);
  assert.ok(g.props.some((q) => q.kind === 'tray'));
  assert.equal(L.items.filter((it) => it.type === 'halusky').length, 1);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.shout.hug.waiter));
});

test('many visits in a row stay sane and draw cleanly', () => {
  for (const seed of [2, 7, 11]) {
    const s = setup(seed, { draw: true });
    const { g, run } = s;
    for (let visit = 0; visit < 3; visit++) {
      const k = s.walkUp(visit % 2 ? 420 : -420);
      assert.equal(k.mode, 'busy', 'visit ' + visit);
      run(6, () => {
        for (const o of k.guests) assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.k), JSON.stringify([o.route, o.ph]));
      });
      s.leave(16);
      assert.equal(k.mode, 'calm');
    }
    assert.equal(g.koliba.visits, 3);
    assert.ok(g.people.length <= 9, g.people.length + ' people');
    assert.ok(g.level.items.filter((it) => it.type === 'halusky').length <= 4);
    assert.ok(g.panic < 40, 'panic ' + g.panic.toFixed(1));
    assert.deepEqual(s.problems.slice(0, 5), [], s.problems.length + ' bad canvas calls');
  }
});

test('winter has no koliba and nothing runs for it', () => {
  const s = setup(4, { level: 'winter' });
  s.b.x = 3000;
  s.run(3);
  assert.equal(s.g.koliba, undefined);
});
