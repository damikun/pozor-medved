'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas } = require('./helpers/mock-canvas');

const KEY_MARKS = /[←→↑↓◀▶⤒␣]|<kbd>|(^|\s)[CX]\s/;
const PROMPTS = ['hideHint', 'hayHint', 'crawlHint', 'fenceHint', 'logHint', 'ladderDown', 'ladderUp', 'cornHint', 'interactStand', 'interactPose', 'interactStall', 'interactKnock',
  'interact', 'interactSelfie', 'interactLadder', 'tycoon.interact', 'lot.hint', 'alpine.hint', 'lift.banner', 'lift.dodge', 'signs.hide', 'signs.climb', 'signs.stomp', 'signs.lot', 'corn'];
const json = (v) => JSON.stringify(v);

function at(root, path) {
  return path.split('.').reduce((o, k) => o[k], root);
}

function stage(level, opts = {}) {
  const problems = [];
  const ZS = loadGame(Object.assign({ seed: 7, withRenderer: true, problems }, opts));
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 1300, level });
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = [];
  const ctx = createCanvas(1280, 720, problems).getContext('2d');
  ctx.setTransform(1280 / 1300, 0, 0, 1280 / 1300, 0, 0);
  const shown = [];
  const show = ZS.prompt.show;
  ZS.prompt.show = (...args) => { const box = show(...args); shown.push(box); return box; };
  const frame = (seconds = 0.3) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      ZS.sim.loop.step(g, 1 / 60);
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, 1300, 0);
    }
    return shown[shown.length - 1];
  };
  return { ZS, g, b: g.bear, problems, shown, frame };
}

test('prompt texts hold only the action, never the key, in every language', () => {
  const ZS = loadGame({ seed: 1 });
  for (const code of ZS.i18n.codes()) {
    const L = ZS.LANGS[code].LABELS, U = ZS.LANGS[code].UI;
    for (const path of PROMPTS) {
      for (const text of [].concat(at(L, path))) {
        assert.equal(typeof text, 'string', `${code} ${path}`);
        assert.ok(text.trim() && !KEY_MARKS.test(text), `${code} ${path}: "${text}"`);
      }
    }
    for (const id of Object.keys(U.tips)) assert.ok(!/<kbd>/.test(U.tips[id] + U.tipsTouch[id]), `${code} tips.${id} names keys with {Code}`);
    assert.match(U.tips.walk, /\{ShiftLeft\}/, code);
  }
});

test('keys read as keyboard names, and on touch as the icon of the matching touch button', () => {
  const icons = { ArrowDown: '🌲', ArrowUp: '⤒', KeyC: '🤗', KeyX: '🦷' };
  const document = { querySelector: (sel) => { const m = /data-key="(\w+)"/.exec(sel); return m && icons[m[1]] ? { textContent: ' ' + icons[m[1]] + ' ' } : null; } };
  const ZS = loadGame({ seed: 1, withRenderer: true, document });
  delete ZS.ICONS; delete ZS.icon;
  const P = ZS.prompt;
  assert.equal(P.glyph('KeyC', false), 'C');
  assert.equal(P.glyph('KeyC', true), '🤗');
  assert.equal(P.glyph('ArrowDown', true), '🌲');
  assert.equal(P.glyph('Space', true), '⤒', 'Space jumps, so on touch it shows the jump button');
  assert.equal(P.glyph('ShiftLeft', true), 'Shift', 'a key without a touch button keeps its keyboard name');
  assert.equal(P.html('KeyX', true), '<kbd data-k="KeyX">🦷</kbd>');
  assert.equal(P.fill('beh, {ShiftLeft} šprint', false), 'beh, <kbd data-k="ShiftLeft">Shift</kbd> šprint');
  assert.equal(P.fill('{Nope} ostane', false), '{Nope} ostane');
});

test('when the game has pictogram icons for touch buttons, key caps on touch use those instead of text', () => {
  const { ZS, g, b, problems, frame } = stage('summer');
  ZS.ICONS = { KeyC: 'M8 4h8v16H8z', ArrowUp: 'M12 2 21 12H3z' };
  ZS.icon = (code) => (ZS.ICONS[code] ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ZS.ICONS[code] + '"/></svg>' : '');
  assert.match(ZS.prompt.html('KeyC', true), /^<kbd data-k="KeyC"><svg [^>]*><path d="M8 4h8v16H8z"\/><\/svg><\/kbd>$/);
  assert.match(ZS.prompt.html('Space', true), /M12 2 21 12H3z/, 'Space falls back to the jump icon');
  assert.equal(ZS.prompt.html('KeyC', false), '<kbd data-k="KeyC">C</kbd>');
  g.touch = true;
  const post = g.level.posts[0];
  b.x = post.x - 10; b.trackX = b.x;
  assert.equal(frame(0.3), null, 'no prompt under the bear on touch');
  assert.deepEqual(problems.slice(0, 5), [], 'the signs still draw their pictograms cleanly');
});

test('the tutorial signs draw their key next to the text', () => {
  const ZS = loadGame({ seed: 1 });
  const keyOf = (level, text) => ZS.makeLevel(level, 3).signs.filter((s) => s.text === text).map((s) => s.key);
  assert.equal(json(keyOf('summer', ZS.LABELS.signs.hide)), json(['ArrowDown']));
  assert.equal(json(keyOf('summer', ZS.LABELS.signs.climb)), json(['ArrowUp']));
  assert.equal(json(keyOf('summer', ZS.LABELS.signs.stomp)), json(['Space']));
  assert.equal(json(keyOf('winter', ZS.LABELS.signs.hide)), json(['ArrowDown']));
  assert.equal(json(keyOf('winter', ZS.LABELS.signs.lot)), json(['ArrowDown']));
});

test('one prompt at a time: hiding from a hunter beats talking to the person next to you', () => {
  const { ZS, g, b } = stage('summer');
  const L = ZS.LABELS, tree = g.level.trees.find((t) => t.hide && t.x > 900);
  b.x = tree.x; b.trackX = b.x;
  const picker = ZS.sim.people.create(g, 'picker', { from: tree.x + 50, to: tree.x + 50 });
  picker.pause = 99;
  g.people = [picker];
  ZS.sim.loop.step(g, 1 / 60);
  b.reach = picker;
  assert.equal(json(ZS.render.cue(g)), json([['KeyC', L.interact[0]], ['KeyX', L.interact[1]]]));
  b.warn = true;
  assert.equal(json(ZS.render.cue(g)), json([['ArrowDown', L.hideHint]]));
});

test('the prompt sits under the bear, below every floating text, and stays on screen', () => {
  const { ZS, g, b, problems, shown, frame } = stage('summer');
  const post = g.level.posts[0];
  b.x = post.x - 10; b.trackX = b.x; b.dir = 1;
  const box = frame(0.4);
  assert.ok(box, 'a prompt is drawn at the stand');
  assert.ok(box.y > ZS.CFG.GROUND, 'below the ground line, clear of floaters and the speech bubble');
  assert.ok(box.x >= g.cam + 7 && box.x + box.w <= g.cam + 1300 - 7, `on screen: ${box.x.toFixed(0)}..${(box.x + box.w).toFixed(0)}`);
  assert.ok(shown.every((s) => s === null || s.y > ZS.CFG.GROUND));
  b.x = 30; b.trackX = b.x;
  const edge = frame(0.1);
  assert.ok(!edge || edge.x >= g.cam + 7, 'clamped at the left edge');
  assert.deepEqual(problems.slice(0, 5), []);
});

test('on touch nothing is drawn under the bear, the touch buttons carry the actions', () => {
  const button = (icon) => ({ textContent: icon, closest: () => null });
  const buttons = { ArrowUp: button('⤒'), KeyC: button('🤗'), KeyX: button('🦷') };
  const document = { querySelector: (sel) => buttons[(/data-key="(\w+)"/.exec(sel) || [])[1]] || null };
  const { ZS, g, b, frame } = stage('summer', { document });
  g.touch = true;
  const house = g.level.houses[0];
  b.x = house.x; b.trackX = b.x;
  assert.equal(frame(0.3), null, 'not drawn on a touch screen');
  assert.equal(json(ZS.render.cue(g)), json([['KeyC', ZS.LABELS.interactKnock]]), 'though it is the same prompt as on a keyboard');
  assert.equal(ZS.prompt.glyph('KeyC', g.touch), '🤗');
  const post = g.level.posts[0];
  b.x = post.x - 10; b.trackX = b.x;
  assert.equal(frame(0.3), null);
  assert.equal(json(ZS.render.cue(g)), json([['ArrowUp', ZS.LABELS.ladderUp]]));
  g.touch = false;
  assert.ok(frame(0.3), 'a keyboard still gets the prompt');
});

test('entering the corn shows the crouch prompt until the bear crouches', () => {
  const { ZS, g, b } = stage('summer');
  const F = g.level.corn;
  b.x = F.from - 60; b.trackX = b.x; b.dir = 1;
  ZS.ui.input.press('ArrowRight', true);
  for (let i = 0; i < 60 && !b.inCorn; i++) ZS.sim.loop.step(g, 1 / 60);
  ZS.ui.input.release('ArrowRight');
  assert.ok(b.inCorn);
  assert.equal(json(ZS.render.cue(g)), json([['ArrowDown', ZS.LABELS.cornHint]]));
  b.crouch = true;
  assert.equal(ZS.render.cue(g), null);
  b.crouch = false;
  g.time += 5;
  assert.equal(ZS.render.cue(g), null, 'gone after a few seconds');
});

test('a bear stuck at a log on the ground is told to jump, and the prompt goes once it is over', () => {
  const { ZS, g, b } = stage('summer');
  const log = g.level.logs.find((lg) => !lg.rock);
  const input = ZS.ui.input;
  b.x = log.x - 160; b.trackX = b.x; b.dir = 1;
  input.press('ArrowRight', true);
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) ZS.sim.loop.step(g, 1 / 60); };
  run(0.75);
  assert.ok(b.x < log.x && b.logT > 0, 'pushing against the log');
  assert.equal(ZS.render.cue(g), null, 'no flash right at the first touch');
  run(0.4);
  assert.equal(json(ZS.render.cue(g)), json([['ArrowUp', ZS.LABELS.logHint]]));
  input.press('Space', false);
  run(0.9);
  input.release('ArrowRight');
  assert.ok(b.x > log.x, 'jumped over');
  assert.equal(b.logT, 0);
  assert.equal(ZS.render.cue(g), null);
});

test('how-to demos keep the canvas free of prompts', () => {
  const ZS = loadGame({ seed: 1, withRenderer: true });
  const shown = [];
  const show = ZS.prompt.show;
  ZS.prompt.show = (...args) => { shown.push(args[2]); return show(...args); };
  const d = ZS.howto.create('hug', { touch: false });
  const ctx = createCanvas(800, 300, []).getContext('2d');
  for (let i = 0; i < 120; i++) { ZS.howto.advance(d, 1 / 30); ZS.howto.draw(d, ctx, 800, 300, 0.22); }
  assert.ok(shown.length > 0 && shown.every((c) => c === null));
});
