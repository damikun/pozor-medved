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

test('↑ held while walking up to a trunk climbs it on arrival', () => {
  const { b, L, play, hold } = setup();
  b.x = thickBeech(L).x - 140;
  hold('ArrowRight');
  hold('ArrowUp');
  play(90);
  assert.ok(b.climbing);
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
