'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame, pageScripts } = require('./helpers/load-game');
const { fakePage } = require('./helpers/fake-dom');

const ROOT = path.resolve(__dirname, '..');
const LAZY = ['js/ui/sounds.js'];

function boot(opts) {
  const page = fakePage(opts);
  const ZS = loadGame({ wholePage: true, document: page.document, localStorage: page.localStorage, location: page.location, globals: page.globals, problems: page.problems });
  return { ZS, page };
}

function scriptsOnDisk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = dir + '/' + e.name;
    return e.isDirectory() ? scriptsOnDisk(rel) : e.name.endsWith('.js') ? [rel] : [];
  });
}

test('index.html loads every game script exactly once', () => {
  const listed = pageScripts().filter((src) => src.startsWith('js/'));
  assert.deepEqual(listed.filter((s, i) => listed.indexOf(s) !== i), [], 'no script is listed twice');
  const missing = scriptsOnDisk('js').filter((f) => !listed.includes(f) && !LAZY.includes(f));
  assert.deepEqual(missing, [], 'every script on disk is in index.html');
  const gone = listed.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  assert.deepEqual(gone, [], 'every listed script exists');
});

test('the whole page boots into the menu and draws frames without errors', () => {
  const { ZS, page } = boot();
  assert.ok(ZS.dev && ZS.dev.game, 'main.js wired the dev hooks');
  page.tick(30);
  assert.equal(ZS.dev.game().running, false, 'the menu shows a still game');
  assert.deepEqual(page.problems, []);
});

for (const level of ['summer', 'winter']) {
  test(`a bot plays ${level} through the real frame loop, HUD and pause without errors`, () => {
    const { ZS, page } = boot({ search: '?bot' });
    ZS.dev.start(level);
    const g = ZS.dev.game();
    assert.equal(g.running, true);
    page.tick(900);
    assert.ok(g.time > 10, 'the frame loop moved the game on');
    assert.match(page.byId.get('barFat').querySelector('i').style.width, /^\d+(\.\d+)?%$/, 'the HUD shows the fat bar');
    page.fire('keydown', { code: 'KeyP', key: 'p' });
    assert.equal(g.paused, true, 'P pauses');
    const at = g.time;
    page.tick(60);
    assert.equal(g.time, at, 'a paused game stands still');
    page.fire('keydown', { code: 'KeyP', key: 'p' });
    assert.equal(g.paused, false, 'P resumes');
    page.document.hidden = true;
    page.fire('visibilitychange');
    assert.equal(g.paused, true, 'a hidden tab pauses');
    page.document.hidden = false;
    page.fire('keydown', { code: 'KeyP', key: 'p' });
    page.tick(900);
    assert.deepEqual(page.problems, []);
  });
}

test('switching the language relabels the HUD while a run goes on', () => {
  const { ZS, page } = boot({ search: '?bot' });
  ZS.dev.start('summer');
  page.tick(120);
  const fat = () => page.byId.get('barFat').querySelector('span').textContent;
  const seen = new Set();
  for (const code of ['en', 'de', 'es', 'sk']) {
    ZS.i18n.set(code);
    ZS.ui.hud.relabel();
    page.tick(60);
    assert.equal(fat(), ZS.UI.bars.fat);
    seen.add(fat());
  }
  assert.ok(seen.size > 1, 'the bar labels change with the language');
  assert.deepEqual(page.problems, []);
});

test('touch screens get their buttons and a run still plays', () => {
  const { ZS, page } = boot({ width: 844, height: 390 });
  ZS.dev.start('summer');
  const g = ZS.dev.game();
  g.touch = true;
  ZS.ui.hud.setTouch(true);
  page.tick(300);
  assert.ok(g.time > 3);
  assert.deepEqual(page.problems, []);
});
