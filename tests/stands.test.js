'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup(level = 'summer') {
  const ZS = loadGame({ seed: 6 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level });
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.people = []; g.dogs = []; g.sheep = []; g.deer = [];
  const post = g.level.posts[0];
  const s = g.shooters.find((h) => h.kind === 'posed' && h.home === post.x);
  g.shooters = [s];
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each) each(i);
    }
  };
  return {
    ZS, g, b: g.bear, post, s, run, CFG: ZS.CFG,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

for (const level of ['summer', 'winter']) {
  test(`C under a hunting stand shakes it, the hunter falls out, then climbs back up (${level})`, async (t) => {
    const { g, b, post, s, run, press } = setup(level);
    b.x = post.x - 30; b.dir = 1;
    press('KeyC');
    run(0.7);

    await t.test('the bear grabs a leg, the stand sways and the hunter holds on instead of aiming', () => {
      assert.equal(b.act.kind, 'shake');
      assert.ok(post.shake > 0.5, 'shake ' + post.shake);
      assert.ok(Math.abs(post.sway) <= 12);
      assert.ok(s.wobble > 0.5);
      assert.equal(s.lock, 0);
      assert.equal(s.react, null);
    });

    await t.test('he falls out of the window and loses the rifle', () => {
      run(0.7);
      assert.ok(s.react === 'drop' || s.react === 'down', String(s.react));
      assert.ok(g.props.some((p) => p.kind === 'rifle'));
      assert.equal(g.stats.stomps, 1);
    });

    await t.test('on the ground he cannot aim; he fetches the rifle, walks back and climbs into the stand', () => {
      b.x = post.x + 1700;
      const seen = [s.react];
      let aimed = 0;
      run(25, () => {
        if (s.react && s.lock > 0) aimed++;
        if (seen[seen.length - 1] !== s.react) seen.push(s.react);
      });
      assert.equal(aimed, 0);
      assert.ok(seen.includes('pickup') && seen.includes('climb'), seen.join(' > '));
      assert.equal(seen[seen.length - 1], null);
      assert.equal(s.x, s.home);
      assert.equal(s.armed, true);
      assert.equal(g.props.length, 0);
      assert.equal(post.sway, 0);
    });
  });
}

test('sprinting under a stand, C away from it or X under it never shakes the stand', () => {
  const { g, b, post, s, run, press, hold, release } = setup();
  b.x = post.x - 300; b.dir = 1;
  hold('ArrowRight'); hold('ShiftLeft');
  run(2.2);
  release('ArrowRight'); release('ShiftLeft');
  assert.ok(b.x > post.x + 100, 'ran under it');
  assert.ok(!(post.shake > 0));
  b.x = post.x - 160; b.vx = 0;
  press('KeyC');
  run(0.4);
  assert.ok(!b.act, 'C away from the stand does nothing');
  run(1.6);
  b.x = post.x - 30;
  press('KeyX');
  run(0.6);
  assert.ok(!(post.shake > 0));
  assert.equal(s.react, null);
  assert.equal(g.stats.stomps, 0);
});

test('with a person in reach under the stand, C goes to the person', () => {
  const { ZS, g, b, post, run, press } = setup();
  const p = ZS.sim.people.create(g, 'picker', { from: post.x - 300, to: post.x + 300 });
  Object.assign(p, { x: post.x + 10, pause: 99 });
  g.people = [p];
  b.x = post.x - 30; b.dir = 1;
  press('KeyC');
  run(0.4);
  assert.equal(b.act.kind, 'hug');
  assert.equal(p.react, 'hugged');
  assert.ok(!(post.shake > 0));
});

test('a new feeding station only ever gets its stand on a fixed forest slot ahead of the bear, never anywhere else', () => {
  let placed = 0, skipped = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const ZS = loadGame({ seed });
    const g = ZS.sim.rules.create(ZS.ui.input.state, { level: 'summer' });
    const L = g.level, fixed = new Set(L.posts.map((p) => p.x)), slots = new Set(L.feedSlots.map((f) => f + 170));
    g.running = true; g.bear.waking = false; g.people = []; g.dogs = []; g.sheep = [];
    for (let k = 0; k < 6; k++) {
      g.bear.x = 300 + Math.random() * (L.w - 900);
      g.usedEvents = new Set(['wrongbear', 'court', 'meat', 'poacher', 'bins', 'census', 'constitution']);
      g.nextEvent = 0;
      const n = L.posts.length;
      ZS.sim.loop.step(g, DT);
      if (L.posts.length > n) {
        placed++;
        const x = L.posts[L.posts.length - 1].x;
        assert.ok(x - 170 > g.cam + g.viewW, 'stand at ' + x + ' is on screen');
      } else skipped++;
    }
    for (const p of L.posts) assert.ok(fixed.has(p.x) || slots.has(p.x), 'seed ' + seed + ': stand at ' + p.x);
    for (const s of g.shooters.filter((h) => h.kind === 'posed')) assert.ok(fixed.has(s.home) || slots.has(s.home), 'hunter on a stand at ' + s.home);
    assert.equal(new Set(L.posts.map((p) => p.x)).size, L.posts.length, 'two stands on one slot');
  }
  assert.ok(placed > 20 && skipped > 20, placed + ' placed, ' + skipped + ' with only the news');
});

test('the feeding slots sit in the open forest, clear of every landmark, with room for the bait and the stand', () => {
  const ZS = loadGame({ seed: 1 });
  const L = ZS.makeLevel('summer', 11), H = L.hotel;
  const busy = [
    [L.village.from, L.village.to], [L.corn.from, L.corn.to], [L.skanzen.from, L.skanzen.to], [L.salas.from, L.salas.to],
    [L.river.from, L.river.to], [L.photographer.x - 80, L.photographer.x + 80], [H.x - H.w / 2, H.x + H.w / 2],
    [H.lift - 120, H.lift + 120], [L.lift.tower - 120, L.lift.tower + 120], [H.chapel - 100, H.chapel + 100],
    [L.feeding - 60, L.feeding + 60], [L.goalDen - 200, L.w], [0, L.startDen + 400],
  ].concat(L.posts.map((p) => [p.x - 100, p.x + 100]), L.logs.map((l) => [l.x - l.w / 2, l.x + l.w / 2]), L.haystacks.map((x) => [x - 60, x + 60]));
  assert.ok(L.feedSlots.length >= 2 && L.feedSlots.length <= 3);
  for (const f of L.feedSlots) {
    for (const [a, b] of busy) assert.ok(f + 230 < a || f - 40 > b, f + ' clashes with ' + a + '–' + b);
    assert.ok(!L.trees.some((t) => t.x > f - 40 && t.x < f + 230), 'tree on slot ' + f);
  }
  assert.equal(ZS.makeLevel('winter', 11).feedSlots, undefined);
});
