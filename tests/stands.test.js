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
  assert.equal(b.act.kind, 'hug');
  assert.equal(b.act.hit, false);
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
