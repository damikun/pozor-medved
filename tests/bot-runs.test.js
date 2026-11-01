'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./helpers/load-game');

const FIXTURE = path.join(__dirname, 'fixtures', 'bot-runs.json');
const VIEW_W = 480;
const runs = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const round = (value, digits) => Number(value.toFixed(digits));

function play({ seed, reaction, mode, level = 'summer' }) {
  const ZS = loadGame({ seed });
  const { rules, loop } = ZS.sim;
  Object.assign(ZS.dev.bot, { reaction, mode });
  const g = rules.create(ZS.ui.input.state, { viewW: VIEW_W, bot: true, level });
  g.running = true;
  rules.say(g, level === 'winter' ? ZS.NEWS.winterStart : ZS.NEWS.springStart);
  for (let i = 0; i < 1500 && !g.over; i++) loop.advance(g, 0.5);
  return {
    ending: g.ending,
    time: round(g.time, 4), fat: round(g.fat, 4), lives: g.lives, x: round(g.bear.x, 3),
    syn: round(g.syn, 4), panic: round(g.panic, 4),
    stats: { ...g.stats },
    flags: Object.keys(g.flags).filter((k) => g.flags[k]),
    events: [...g.usedEvents],
    eaten: g.level.items.filter((it) => it.eaten).length,
  };
}

if (process.env.UPDATE_FIXTURES) {
  test('record the bot runs', () => {
    const recorded = runs.map((run) => ({ ...run, expected: play(run) }));
    fs.writeFileSync(FIXTURE, JSON.stringify(recorded, null, 2) + '\n');
  });
} else {
  for (const run of runs) {
    test(`bot run, ${run.level || 'summer'}, seed ${run.seed}, reaction ${run.reaction} s${run.mode ? ', ' + run.mode : ''}`, () => {
      assert.deepEqual(play(run), run.expected);
    });
  }
}
