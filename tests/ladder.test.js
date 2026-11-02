'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(level = 'summer', { seed = 6, renderer = false, post: at = 0 } = {}) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer: renderer, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level, viewW: 960 });
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.people = []; g.dogs = []; g.sheep = []; g.deer = [];
  const post = g.level.posts[at];
  const s = g.shooters.find((h) => h.kind === 'posed' && h.home === post.x);
  g.shooters = [s];
  const ctx = renderer ? createCanvas(960, 540, problems).getContext('2d') : null;
  const draw = () => {
    g.cam = ZS.sim.loop.cameraX(g);
    ZS.draw(g, ctx, 960, 0);
    assert.equal(stackDepth(ctx), 0);
  };
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (renderer) draw();
      if (each) each(i);
    }
  };
  return {
    ZS, g, b: g.bear, post, s, run, problems, GY: ZS.CFG.GROUND,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

for (const level of ['summer', 'winter']) {
  test(`holding ↑ at the ladder of a hunting stand climbs up to the hunter, who jumps out and runs off (${level})`, async (t) => {
    const { ZS, g, b, post, s, run, press, hold, release, GY } = setup(level);
    const news = [];
    ZS.sim.rules.onNews = (item) => news.push(item.text);
    s.cross = post.x - s.range; s.crossDir = -1;
    b.x = post.x; b.dir = 1;
    run(0.2);

    await t.test('at the foot of the stand the hint offers both the shake and the climb', () => {
      assert.ok(b.reach && b.reach.post === post);
      assert.equal(ZS.sim.ladder.at(g), post);
    });

    await t.test('the bear grabs the rungs, the stand creaks and the hunter turns his rifle to the ladder', () => {
      press('ArrowUp'); hold('ArrowUp');
      run(0.6);
      assert.ok(b.climbing && b.climbing.ladder, 'on the ladder');
      assert.ok(b.onGround === false && b.y < GY - 5, 'y ' + b.y);
      assert.equal(b.covered, false);
      assert.ok(post.shake > 0 && post.shake < 0.5, 'creak ' + post.shake);
      assert.ok(s.alertX !== null || Math.abs(s.cross - post.x) < 60, 'the hunter heard it');
      assert.equal(s.react, null);
    });

    await t.test('the climb is slow: the bear is still low on the ladder after a second', () => {
      run(0.7);
      assert.equal(b.climbing.phase, 'climb');
      assert.ok(GY - b.y < ZS.sim.ladder.HATCH, 'height ' + (GY - b.y));
    });

    await t.test('at the top the hunter panics, drops the rifle and jumps out of the window', () => {
      const fat = g.fat;
      run(1.3);
      assert.ok(s.react === 'drop' || s.react === 'gone', String(s.react));
      assert.ok(s.bolt);
      assert.ok(g.props.some((p) => p.kind === 'rifle'));
      assert.equal(g.stats.stomps, 1);
      assert.ok(news.some((text) => ZS.NEWS.standClimb.includes(text)), news.join(' | '));
      assert.ok(g.fat <= fat, 'the snack waits in the seat');
    });

    await t.test('the bear sits in his seat, hidden, and eats the snack he left behind', () => {
      const fat = g.fat;
      run(2.2);
      assert.equal(b.climbing.phase, 'seat');
      assert.equal(b.covered, true);
      assert.ok(g.fat > fat + 5, 'fat ' + (g.fat - fat));
      assert.equal(g.stats.human, 1);
      release('ArrowUp');
      run(3);
      assert.equal(b.climbing.phase, 'seat');
    });

    await t.test('the hunter never aims again and runs off for good', () => {
      assert.equal(s.react, 'gone');
      assert.equal(s.armed, false);
      assert.equal(g.shots.length, 0);
      run(8);
      assert.ok(!g.shooters.includes(s), 'he left the level');
    });

    await t.test('↓ climbs down to the ground, and the empty stand can be climbed again', () => {
      hold('ArrowDown');
      run(1.6);
      release('ArrowDown');
      run(0.2);
      assert.ok(!b.climbing && b.onGround && b.y === GY, 'back on the ground');
      assert.ok(!b.hiding);
      assert.equal(ZS.sim.ladder.at(g), post);
      assert.equal(post.sway, 0);
      assert.equal(g.stats.stomps, 1);
    });
  });
}

test('low on the ladder the stand’s own hunter can still shoot, and a hit knocks the bear off', () => {
  let hits = 0, shots = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const { g, b, post, s, run, press, hold, release, GY } = setup('summer', { seed });
    s.cross = post.x - 80; s.alertX = null;
    b.x = post.x; b.dir = 1;
    run(0.1);
    press('ArrowUp'); hold('ArrowUp');
    let low = 0;
    run(2.2, () => { if (g.shots.length && !shots) shots++; if (b.climbing && b.climbing.phase === 'climb' && s.lock > 0) low++; });
    release('ArrowUp');
    assert.ok(low > 30, 'aimed at the bear on the ladder ' + low);
    if (g.lives < 5) {
      hits++;
      assert.ok(!b.climbing, 'knocked off');
      run(1);
      assert.ok(b.onGround && b.y === GY);
      assert.equal(s.react, null);
    }
  }
  assert.ok(shots > 0 && hits > 0, `shots ${shots}, hits ${hits}`);
});

test('a careful bear that waits until the crosshair is far away reaches the seat unhurt', () => {
  for (let seed = 1; seed <= 6; seed++) {
    for (const at of [0, 1]) {
      const { g, b, post, s, run, press, hold } = setup('summer', { seed, post: at });
      b.x = post.x; b.dir = -1;
      run(0.1);
      run(12, () => { if (Math.abs(s.cross - post.x) > 330 && s.lock === 0 && !b.climbing && !g.input.keys.has('ArrowUp')) { press('ArrowUp'); hold('ArrowUp'); } });
      assert.equal(g.lives, 5, `seed ${seed}, post ${at}`);
      assert.equal(b.climbing && b.climbing.phase, 'seat');
    }
  }
});

test('at the ladder a tap of ↑ neither jumps nor climbs, C still shakes the stand, and the stand a hunter was shaken out of can still be climbed', () => {
  const { g, b, post, s, run, press, hold, release, GY } = setup();
  s.cross = post.x - s.range;
  b.x = post.x; b.dir = 1;
  run(0.2);
  press('ArrowUp'); hold('ArrowUp');
  run(0.08);
  release('ArrowUp');
  run(0.3);
  assert.ok(b.onGround && b.y === GY && !b.climbing, 'stayed on the ground');
  press('KeyC');
  run(0.5);
  assert.equal(b.act && b.act.kind, 'shake');
  assert.ok(post.shake > 0.5);
  run(2.5);
  b.x = post.x;
  press('ArrowUp'); hold('ArrowUp');
  run(0.6);
  release('ArrowUp');
  assert.ok(s.react, 'the hunter is out of his seat');
  assert.ok(b.climbing && b.climbing.ladder, 'climbs up to the empty seat');
  const stomps = g.stats.stomps;
  hold('ArrowUp');
  run(4);
  release('ArrowUp');
  assert.equal(b.climbing.phase, 'seat', 'sits in the empty seat');
  assert.equal(g.stats.stomps, stomps, 'an empty seat is no extra win');
});

test('Space jumps off the ladder and the bear lands beside the stand', () => {
  const { b, post, s, run, press, hold, release, GY } = setup('winter');
  s.cross = post.x - s.range;
  b.x = post.x; b.dir = 1;
  run(0.2);
  press('ArrowUp'); hold('ArrowUp');
  run(0.8);
  release('ArrowUp');
  assert.ok(b.climbing && b.climbing.ladder);
  press('Space');
  run(1.2);
  assert.ok(!b.climbing && b.onGround && b.y === GY);
  assert.ok(b.x > post.x + 30, 'x ' + (b.x - post.x));
  assert.equal(s.react, null);
});

for (const level of ['summer', 'winter']) {
  test(`the bear on the rungs, the creaking stand and the bear in the hunter’s seat draw cleanly (${level})`, () => {
    const { g, b, post, s, run, press, hold, release, problems } = setup(level, { renderer: true });
    s.cross = post.x - s.range;
    b.x = post.x; b.dir = level === 'winter' ? -1 : 1;
    run(0.1);
    press('ArrowUp'); hold('ArrowUp');
    run(3.4);
    release('ArrowUp');
    assert.equal(b.climbing.phase, 'seat');
    run(5);
    hold('ArrowDown');
    run(1.6);
    release('ArrowDown');
    assert.ok(!b.climbing);
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}

test('a hunter coming back to his stand finds the bear in his seat, gets scared and runs off instead of sitting down next to it', () => {
  const { g, b, post, s, run, press, hold, release } = setup();
  s.cross = post.x - s.range;
  b.x = post.x; b.dir = 1;
  run(0.2);
  press('KeyC');
  run(0.6);
  run(1.2);
  assert.ok(s.react, 'the hunter is out of his seat');
  b.x = post.x;
  press('ArrowUp'); hold('ArrowUp');
  run(4);
  release('ArrowUp');
  assert.equal(b.climbing && b.climbing.phase, 'seat');
  let together = 0;
  run(25, () => { if (!s.react && !s.dead && s.x === s.home) together++; });
  assert.equal(together, 0, 'never back in the seat while the bear sits there');
  assert.ok(s.dead || s.react === 'gone', 'he ran off, react ' + s.react);
  assert.equal(b.climbing && b.climbing.phase, 'seat', 'the bear still sits there');
});
