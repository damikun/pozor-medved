'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup(level) {
  const ZS = loadGame({ seed: 4 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level, viewW: 960 });
  g.running = true; g.nextEvent = 1e9; g.bear.waking = false;
  g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.shooters = [];
  const L = g.level;
  const birch = L.trees.find((t) => !t.hide && !L.trees.some((o) => o.hide && Math.abs(o.x - t.x) < o.w / 2 + 50)
    && !L.haystacks.some((x) => Math.abs(x - t.x) < 120) && !L.posts.some((p) => Math.abs(p.x - t.x) < 80));
  const said = [];
  const say = ZS.sim.rules.say;
  ZS.sim.rules.say = (gg, news, hot) => { said.push(news); return say(gg, news, hot); };
  const run = (s) => { for (let i = 0; i < Math.round(s / DT) && !g.over; i++) ZS.sim.loop.step(g, DT); };
  return { ZS, g, b: g.bear, birch, said, run, hold: (k) => input.press(k, true), release: input.release };
}

{
  const level = 'summer';
  test(`↓ at a thin birch squeezes the bear behind it, but it stays in plain sight and can be shot`, () => {
    const { ZS, g, b, birch, said, run, hold, release } = setup(level);
    assert.ok(birch, 'a lone birch exists');
    b.x = birch.x + 6; b.dir = 1;
    run(0.1);
    hold('ArrowDown');
    run(0.4);
    assert.equal(b.hiding, birch, 'squeezed behind the birch');
    assert.equal(b.covered, false, 'a birch gives no cover');
    assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.birch));
    assert.ok(ZS.QUIPS.birch.includes(g.bubble && g.bubble.text), 'a birch quip');
    const s = ZS.sim.hunters.create(g, 'walker', { x: b.x - 300, from: b.x - 600, to: b.x - 60 });
    s.dir = 1; s.cross = b.x;
    g.shooters = [s];
    const lives = g.lives;
    for (let i = 0; i < 6 && g.lives === lives; i++) run(2);
    release('ArrowDown');
    assert.ok(g.lives < lives, 'the hunter hit the bear behind the birch');
    assert.ok(said.includes(ZS.NEWS.birchHit), 'the news mocks the birch');
  });
}
