// The autopilot plays eight seeded runs, and each must end exactly as recorded in fixtures/bot-runs.json: the same
// ending, time, fat, lives, distance, meters, political flags, news events and food eaten. Any change to how the
// game plays breaks this on purpose. After an intended change, record the new results with
//   UPDATE_FIXTURES=1 npm test
// The results are Node's: Chrome computes Math.sin, Math.cos and friends differently in the last bit, and a run is
// chaotic enough that the same seed can end differently there.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./helpers/load-game');

const FIXTURE = path.join(__dirname, 'fixtures', 'bot-runs.json');
// The width any upright window narrower than 480:540 shows, for example 770x994.
const VIEW_W = 480;
const runs = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const round = (value, digits) => Number(value.toFixed(digits));

function play({ seed, reaction, mode }) {
  const ZS = loadGame({ seed });
  const { rules, loop } = ZS.sim;
  Object.assign(ZS.dev.bot, { reaction, mode });
  const g = rules.create(ZS.ui.input.state, { viewW: VIEW_W, bot: true });
  g.running = true;
  rules.say(g, ZS.NEWS.springStart);
  // In half-second chunks, like ZS.dev.step(0.5) in the browser.
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
    test(`bot run, seed ${run.seed}, reaction ${run.reaction} s${run.mode ? ', ' + run.mode : ''}`, () => {
      assert.deepEqual(play(run), run.expected);
    });
  }
}
