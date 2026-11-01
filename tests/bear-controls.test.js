'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup() {
  const ZS = loadGame({ seed: 1 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state);
  const play = (frames, each) => {
    for (let i = 0; i < frames; i++) {
      g.time += DT;
      ZS.sim.bear.update(g, DT);
      if (each) each(i);
    }
  };
  return {
    b: g.bear, L: g.level, play,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

const thickBeech = (L) => L.trees.find((t) => t.hide && t.kind === 'buk' && t.x > 700);

function openGround(L) {
  for (let x = 300; x < 8000; x += 5) {
    if (!L.trees.some((t) => Math.abs(t.x - x) < 120) && !L.logs.some((l) => Math.abs(l.x - x) < 200)) return x;
  }
  throw new Error('no open ground in the level');
}

test('hiding and climbing at one trunk', async (t) => {
  const { b, L, play, press, release } = setup();
  b.x = thickBeech(L).x + 12;

  await t.test('holding ↓ for 6 s never drops the hide', () => {
    press('ArrowDown');
    let gaps = 0;
    play(360, (i) => { if (i > 1 && !b.hiding) gaps++; });
    assert.equal(gaps, 0, 'frames not hidden');
    assert.equal(b.hideBlend, 1, 'the hiding pose has faded in fully');
  });

  await t.test('↑ while hiding does not climb', () => {
    press('ArrowUp');
    play(10);
    assert.ok(!b.climbing);
  });

  await t.test('releasing ↓ with ↑ held climbs', () => {
    release('ArrowDown');
    play(20);
    assert.ok(b.climbing, 'y = ' + Math.round(b.y));
  });

  await t.test('↑ and ↓ together on the tree move the bear down', () => {
    play(90);
    press('ArrowDown');
    const y0 = b.y;
    play(10);
    assert.ok(b.y > y0);
  });

  await t.test('landing with ↓ still held does not hide', () => {
    release('ArrowUp');
    for (let i = 0; i < 120 && b.climbing; i++) play(1);
    play(30);
    assert.ok(!b.climbing && b.onGround, 'landed');
    assert.ok(!b.hiding);
  });

  await t.test('↓ released and pressed again within one frame hides', () => {
    release('ArrowDown');
    press('ArrowDown');
    play(3);
    assert.ok(b.hiding);
  });

  await t.test('releasing ↓ fades the hiding pose out over a few frames', () => {
    release('ArrowDown');
    play(2);
    const mid = b.hideBlend;
    play(20);
    assert.ok(mid > 0 && mid < 1, 'half way: ' + mid.toFixed(2));
    assert.equal(b.hideBlend, 0);
    assert.ok(!b.hideTree);
  });
});

test('↑ in the open jumps', () => {
  const { b, L, play, press } = setup();
  b.x = openGround(L);
  press('ArrowRight');
  play(5);
  press('ArrowUp');
  play(1);
  assert.ok(!b.climbing && !b.onGround);
});

test('↓ with → creeps and slips behind the first thick trunk it reaches', () => {
  const { b, L, play, hold } = setup();
  b.x = thickBeech(L).x - 140;
  hold('ArrowDown');
  hold('ArrowRight');
  const x0 = b.x;
  play(30);
  const speed = (b.x - x0) / 0.5;
  assert.ok(b.crouch, 'crouching');
  assert.ok(speed > 70 && speed < 100, 'creeping speed ' + speed.toFixed(0));
  play(120);
  assert.ok(b.hiding);
});

for (const [arrow, key, dir] of [['→', 'ArrowRight', 1], ['←', 'ArrowLeft', -1]]) {
  test(`${arrow} and ↑ held together walk past thick trunks without climbing any`, () => {
    const { b, L, play, press, hold } = setup();
    const x0 = L.logs[0].x + dir * 100;
    b.x = x0;
    hold(key);
    press('ArrowUp');
    let climbed = 0;
    play(480, () => { if (b.climbing) climbed++; });
    const passed = L.trees.filter((t) => t.hide && (t.x - x0) * dir > 0 && (b.x - t.x) * dir > 0).length;
    assert.equal(climbed, 0, 'frames on a trunk');
    assert.ok(passed >= 3, 'thick trunks passed: ' + passed);
  });

  test(`letting go of ${arrow} at a thick trunk with ↑ still held stops the bear and climbs`, () => {
    const { b, L, play, hold, release } = setup();
    const tree = thickBeech(L);
    b.x = tree.x - dir * 100;
    hold(key);
    hold('ArrowUp');
    for (let i = 0; i < 120 && (tree.x - b.x) * dir > 10; i++) play(1);
    assert.ok(!b.climbing && b.onGround, 'walked up to the trunk');
    release(key);
    play(1);
    assert.equal(b.climbing, tree);
  });
}

test('letting go of → in a jump over a thick trunk with ↑ held grabs it in the air', () => {
  const { b, L, play, press, hold, release } = setup();
  const tree = thickBeech(L);
  const ground = b.y;
  b.x = tree.x - 100;
  hold('ArrowRight');
  press('ArrowUp');
  for (let i = 0; i < 120 && b.x < tree.x; i++) play(1);
  assert.ok(!b.climbing && !b.onGround, 'in the air over the trunk');
  release('ArrowRight');
  play(1);
  assert.equal(b.climbing, tree);
  assert.ok(ground - b.y > 30, 'grabbed at ' + Math.round(ground - b.y) + ' px');
});

test('↑ pressed for a jump on the way and kept held climbs the moment the bear stops at a thick trunk', () => {
  const { b, L, play, press, hold, release } = setup();
  const tree = thickBeech(L);
  b.x = tree.x - 220;
  hold('ArrowRight');
  play(2);
  press('ArrowUp');
  play(1);
  assert.ok(!b.onGround, 'jumped');
  for (let i = 0; i < 120 && b.x < tree.x - 10; i++) play(1);
  assert.ok(!b.climbing && b.onGround, 'walked up to the trunk');
  release('ArrowRight');
  play(1);
  assert.equal(b.climbing, tree);
});

test('turning around at a thick trunk with ↑ held walks back instead of climbing', () => {
  const { b, L, play, press, hold, release } = setup();
  const tree = thickBeech(L);
  b.x = tree.x - 100;
  hold('ArrowRight');
  hold('ArrowUp');
  for (let i = 0; i < 120 && b.x < tree.x - 5; i++) play(1);
  press('ArrowLeft');
  play(3);
  release('ArrowRight');
  play(20);
  assert.ok(!b.climbing && b.x < tree.x - 40, 'x = ' + Math.round(b.x - tree.x));
});

test('↑ pressed while walking past a thick trunk jumps', () => {
  const { b, L, play, press, hold } = setup();
  b.x = thickBeech(L).x - 10;
  hold('ArrowRight');
  play(2);
  press('ArrowUp');
  play(1);
  assert.ok(!b.climbing && !b.onGround);
});

function standAtTrunk() {
  const s = setup();
  const tree = thickBeech(s.L);
  s.b.x = tree.x - 100;
  s.hold('ArrowRight');
  for (let i = 0; i < 120 && s.b.x < tree.x - 10; i++) s.play(1);
  s.release('ArrowRight');
  s.play(10);
  assert.ok(!s.b.climbing && s.b.onGround, 'standing at the trunk');
  return { ...s, tree };
}

test('a tap of ↑ at a thick trunk only jumps, for taps up to 150 ms', () => {
  for (let held = 1; held <= 9; held++) {
    const { b, play, press, release } = standAtTrunk();
    const x0 = b.x, ground = b.y;
    press('ArrowUp');
    let top = 0, climbed = 0;
    for (let i = 0; i < 60; i++) {
      if (i === held) release('ArrowUp');
      play(1);
      if (i === 0) assert.ok(!b.onGround && b.vy < 0, 'jumped on the first frame');
      if (b.climbing) climbed++;
      top = Math.max(top, ground - b.y);
    }
    assert.equal(climbed, 0, `frames on the trunk after a ${held}-frame tap`);
    assert.ok(top > 100 && b.onGround && b.x === x0, 'a whole jump straight up and down');
  }
});

test('holding ↑ at a thick trunk jumps at once and grabs the trunk between 150 and 200 ms', () => {
  const { b, tree, play, press } = standAtTrunk();
  press('ArrowUp');
  play(1);
  assert.ok(!b.onGround && b.vy < 0, 'the jump is not delayed');
  play(8);
  assert.ok(!b.climbing, 'still only a jump after 150 ms');
  play(3);
  assert.equal(b.climbing, tree, 'on the trunk after 200 ms');
});

test('holding ↑ through a jump beside a thick trunk grabs it in the air and climbs on from that height', () => {
  const { b, tree, play, press } = standAtTrunk();
  const ground = b.y;
  b.x = tree.x - tree.w / 2 - 20;
  press('ArrowUp');
  let before = b.y;
  for (let i = 0; i < 30 && !b.climbing; i++) { before = b.y; play(1); }
  assert.equal(b.climbing, tree);
  const grab = ground - b.y;
  assert.ok(grab > 60 && grab < 100, 'grabbed at ' + Math.round(grab) + ' px');
  assert.ok(Math.abs(b.y - before) < 3, 'no jump in height when grabbing');
  play(30);
  assert.ok(ground - b.y > grab + 40, 'climbed on to ' + Math.round(ground - b.y) + ' px');
  assert.ok(Math.abs(b.x - tree.x) < 3, 'on the trunk');
});

test('Space at a thick trunk only jumps even when held, ↑ held in that jump grabs the trunk', () => {
  const { b, tree, play, press } = standAtTrunk();
  const ground = b.y;
  press('Space');
  let climbed = 0;
  play(60, () => { if (b.climbing) climbed++; });
  assert.equal(climbed, 0, 'frames on the trunk');
  assert.ok(b.onGround);
  press('Space');
  play(4);
  press('ArrowUp');
  for (let i = 0; i < 20 && !b.climbing; i++) play(1);
  assert.equal(b.climbing, tree);
  assert.ok(ground - b.y > 60, 'grabbed in the air');
});

test('a quick tap of ↓ at a thick trunk ducks behind it and comes straight back out', () => {
  const { b, tree, play, press, release } = standAtTrunk();
  press('ArrowDown');
  play(4);
  assert.equal(b.hiding, tree);
  release('ArrowDown');
  play(20);
  assert.ok(!b.hiding && !b.crouch && !b.climbing && b.onGround, 'standing at the trunk again');
  assert.equal(b.hideBlend, 0);
  assert.ok(!b.hideTree);
  press('ArrowUp');
  play(1);
  release('ArrowUp');
  assert.ok(!b.onGround && !b.climbing, 'the next tap of ↑ jumps');
  for (let i = 0; i < 60 && !b.onGround; i++) play(1);
  press('ArrowDown');
  play(2);
  assert.equal(b.hiding, tree, 'the next ↓ hides again');
});

test('↓ pressed in a jump at a thick trunk beats the held ↑: the bear lands behind the trunk and letting go of ↓ climbs', () => {
  const { b, tree, play, press, release } = standAtTrunk();
  press('ArrowUp');
  play(2);
  press('ArrowDown');
  let climbed = 0;
  for (let i = 0; i < 90 && !b.hiding; i++) {
    play(1);
    if (b.climbing) climbed++;
  }
  assert.equal(climbed, 0, 'frames on the trunk');
  assert.equal(b.hiding, tree, 'hiding after landing');
  release('ArrowDown');
  play(1);
  assert.equal(b.climbing, tree);
});

test('jumping off a tree with ↑ still held drops to the ground without grabbing the trunk again in the air', () => {
  const { b, tree, play, press } = standAtTrunk();
  press('ArrowUp');
  play(60);
  assert.equal(b.climbing, tree);
  press('Space');
  let grabbed = 0;
  for (let i = 0; i < 120 && !b.onGround; i++) {
    play(1);
    if (b.climbing) grabbed++;
  }
  assert.equal(grabbed, 0, 'frames on the trunk in the air');
  assert.ok(b.onGround, 'landed');
});

test('on the ice ↑ held does not grab a thick trunk while sliding, only once the bear stops at it', () => {
  const { b, L, play, hold, release } = setup();
  const tree = thickBeech(L);
  L.ice = { from: tree.x - 700, to: tree.x + 400 };
  b.x = tree.x - 600;
  hold('ArrowRight');
  for (let i = 0; i < 300 && b.x < tree.x - 150; i++) play(1);
  hold('ArrowUp');
  release('ArrowRight');
  let slid = 0;
  for (let i = 0; i < 300 && !b.climbing; i++) {
    play(1);
    if (b.slide && Math.abs(b.x - tree.x) < tree.w / 2) slid++;
  }
  assert.ok(slid > 0, 'slid along the trunk');
  assert.equal(b.climbing, tree);
});

test('↑ right before a log jumps it, even next to a tree', () => {
  const { b, L, play, press, hold } = setup();
  const log = L.logs[0];
  b.x = log.x - log.w / 2 - 40;
  hold('ArrowRight');
  play(2);
  press('ArrowUp');
  play(1);
  assert.ok(!b.climbing && !b.onGround);
});

test('C and X fire once per key press, held keys do not repeat the move', () => {
  const ZS = loadGame({ seed: 1 });
  const { input } = ZS.ui;
  input.press('KeyC', false);
  assert.equal(input.state.hugPressed, true);
  input.state.hugPressed = false;
  input.press('KeyC', true);
  assert.equal(input.state.hugPressed, false, 'auto-repeat does not hug again');
  input.press('KeyX', false);
  assert.equal(input.state.bitePressed, true);
  input.release('KeyC');
  input.release('KeyX');
  assert.equal(input.state.keys.size, 0);
});
