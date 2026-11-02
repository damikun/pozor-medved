'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

test('hunters and people never walk into the snow cannon spray, careful or running', () => {
  for (const [seed, mode] of [[1, ''], [3, ''], [4, 'runner'], [7, '']]) {
    const ZS = loadGame({ seed });
    Object.assign(ZS.dev.bot, { reaction: 0.4, mode });
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 480, bot: true, level: 'winter' });
    g.running = true;
    const Z = g.level.cannons.map((c) => [Math.min(c.x - c.dir * 60, c.x + c.dir * 370), Math.max(c.x - c.dir * 60, c.x + c.dir * 370)]);
    let worst = null, n = 0;
    for (let i = 0; i < 400 * 60 && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      for (const p of g.people.concat(g.shooters)) {
        if (p.kind === 'posed' && !p.react) continue;
        n++;
        if (!worst && Z.some(([a, b]) => p.x > a && p.x < b)) worst = p.kind + ' at ' + p.x.toFixed(1) + ', t ' + g.time.toFixed(1);
      }
    }
    assert.equal(worst, null, 'seed ' + seed);
    assert.ok(n > 1000);
  }
});

test('a hunter walking toward the spray turns at its edge', () => {
  const ZS = loadGame({ seed: 5 });
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 960, level: 'winter' });
  g.running = true; g.nextEvent = 1e9; g.bear.waking = false;
  g.people = []; g.dogs = []; g.deer = [];
  const c = g.level.cannons[1], to = c.x + c.dir * 370;
  const s = ZS.sim.hunters.create(g, 'walker', { x: to + 140, dir: -1 });
  s.from = null; s.to = null;
  g.shooters = [s];
  g.bear.x = c.x - 1200;
  let min = Infinity;
  for (let i = 0; i < 12 * 60; i++) { ZS.sim.loop.step(g, DT); min = Math.min(min, s.x); }
  assert.ok(min >= to + ZS.sim.corn.KEEP - 0.01, 'hunter ' + min);
});
