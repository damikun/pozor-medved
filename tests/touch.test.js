'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup() {
  const ZS = loadGame({ seed: 1 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state);
  g.bear.waking = false;
  const play = (frames) => {
    for (let i = 0; i < frames; i++) {
      g.time += DT;
      ZS.sim.bear.update(g, DT);
    }
  };
  const keys = () => [...input.state.keys].sort().join(',');
  return { b: g.bear, L: g.level, play, input, keys };
}

const thickBeech = (L) => L.trees.find((t) => t.hide && t.kind === 'buk' && t.x > 700);

function openGround(L) {
  for (let x = 300; x < 8000; x += 5) {
    if (!L.trees.some((t) => Math.abs(t.x - x) < 120) && !L.logs.some((l) => Math.abs(l.x - x) < 200)) return x;
  }
  throw new Error('no open ground in the level');
}

test('the joystick has a dead centre, walks, sprints near the rim, hides down and climbs up', () => {
  const { input } = setup();
  const aim = (...args) => ({ ...input.aim(...args) });
  const none = { dir: 0, fast: false, down: false, up: false };
  assert.deepEqual(aim(8, 0, 60, false), none);
  assert.deepEqual(aim(30, 0, 60, false), { ...none, dir: 1 });
  assert.deepEqual(aim(-58, 4, 60, false), { ...none, dir: -1, fast: true });
  assert.deepEqual(aim(40, 14, 60, false), { ...none, dir: 1 }, 'a thumb a little low still only walks');
  assert.deepEqual(aim(30, 30, 60, false), { ...none, dir: 1, down: true }, 'down and to the side sneaks');
  assert.deepEqual(aim(0, 40, 60, false), { ...none, down: true });
  assert.deepEqual(aim(0, -40, 60, false), { ...none, up: true });
  assert.equal(aim(46, 0, 60, false).fast, false, 'not yet a sprint');
  assert.equal(aim(46, 0, 60, true).fast, true, 'a sprint stays on a little way back');
});

test('the joystick and the jump button share ↑ and a held stick survives cleared keys', () => {
  const { input, keys } = setup();
  input.steer(input.aim(0, -40, 60, false));
  assert.equal(keys(), 'ArrowUp');
  input.jump(true);
  input.jump(false);
  assert.equal(keys(), 'ArrowUp', 'the stick still holds ↑ after the jump button is let go');
  input.steer(input.aim(-60, 0, 60, false));
  assert.equal(keys(), 'ArrowLeft,ShiftLeft');
  input.state.keys.clear();
  input.steer(input.aim(-40, 0, 60, false));
  assert.equal(keys(), 'ArrowLeft', 'a held stick comes back after the keys were cleared');
  input.steer(input.aim(0, 0, 60, false));
  assert.equal(keys(), '');
});

test('the joystick pushed up at a thick trunk climbs without jumping', () => {
  const { b, L, play, input } = setup();
  b.x = thickBeech(L).x + 12;
  input.steer(input.aim(0, -45, 60, false));
  play(3);
  assert.ok(b.onGround && !b.climbing, 'still on the ground');
  play(27);
  assert.ok(b.climbing, 'y = ' + Math.round(b.y));
});

test('the jump button held at a thick trunk climbs like ↑', () => {
  const { b, L, play, input } = setup();
  b.x = thickBeech(L).x + 12;
  input.jump(true);
  play(30);
  assert.ok(b.climbing, 'y = ' + Math.round(b.y));
  input.jump(false);
});

test('the jump button with an arrow held leaps off the tree like Space', () => {
  const { b, L, play, input } = setup();
  const tree = thickBeech(L);
  b.x = tree.x + 12;
  input.jump(true);
  play(60);
  input.jump(false);
  assert.ok(b.climbing);
  input.steer(input.aim(40, 0, 60, false));
  input.jump(true);
  play(1);
  input.jump(false);
  play(30);
  assert.ok(!b.climbing, 'off the tree');
  assert.ok(b.x > tree.x + tree.w / 2, 'to the right of the trunk, x = ' + Math.round(b.x - tree.x));
});

test('the jump button while walking jumps as high as ↑', () => {
  const peak = (go) => {
    const { b, L, play, input } = setup();
    b.x = openGround(L);
    input.steer(input.aim(40, 0, 60, false));
    play(5);
    const ground = b.y;
    go(input);
    let top = b.y;
    for (let i = 0; i < 60; i++) { play(1); top = Math.min(top, b.y); }
    return Math.round(ground - top);
  };
  const touch = peak((input) => input.jump(true));
  const key = peak((input) => input.press('ArrowUp', false));
  assert.ok(touch > 50, 'the bear left the ground');
  assert.equal(touch, key);
});
