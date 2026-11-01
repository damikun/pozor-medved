'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

function viewport(width, height, dpr) {
  const scale = Math.min(height / 540, width / (height > width ? 480 : 760));
  return { width: width * dpr, height: height * dpr, scale: dpr * scale, viewW: width / scale, offY: (height / scale - 540) * 0.45 };
}

function stage(c) {
  const problems = [];
  const ZS = loadGame({ seed: c.seed, withRenderer: true, problems });
  ZS.dev.bot.mode = c.mode || null;
  const v = viewport(c.width, c.height, c.dpr);
  const ctx = createCanvas(v.width, v.height, problems).getContext('2d');
  ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: v.viewW, bot: !!c.bot, level: c.level });
  g.running = true;
  let frames = 0;
  const draw = () => {
    g.cam = ZS.sim.loop.cameraX(g);
    ZS.draw(g, ctx, v.viewW, v.offY);
    frames++;
    assert.equal(stackDepth(ctx), 0, `save() without restore() after frame ${frames}`);
  };
  return { ZS, g, problems, draw };
}

const CASES = [
  { name: 'summer, landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 2, level: 'summer' },
  { name: 'summer, portrait 770x994', width: 770, height: 994, dpr: 2, seed: 4, level: 'summer' },
  { name: 'summer, portrait, sprinting autopilot', width: 390, height: 844, dpr: 2, seed: 6, mode: 'runner', level: 'summer' },
  { name: 'winter, landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 3, level: 'winter' },
  { name: 'winter, portrait 390x844', width: 390, height: 844, dpr: 3, seed: 5, level: 'winter' },
  { name: 'winter, portrait, sprinting autopilot', width: 390, height: 844, dpr: 2, seed: 8, mode: 'runner', level: 'winter' },
];

for (const c of CASES) {
  test(`a whole run draws cleanly, ${c.name}`, () => {
    const { ZS, g, problems, draw } = stage(Object.assign({ bot: true }, c));
    let frames = 0;
    while (!g.over && frames < 1000) {
      ZS.sim.loop.advance(g, 0.5);
      draw();
      frames++;
    }
    assert.ok(g.over, 'the run ended');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}

for (const level of ['summer', 'winter']) {
  test(`stomps, hugs, selfies, bites and a shaken stand draw cleanly frame by frame, ${level}`, () => {
    const { ZS, g, problems, draw } = stage({ width: 1280, height: 720, dpr: 1, seed: 9, level });
    const { input } = ZS.ui;
    const b = g.bear;
    g.nextEvent = 1e9;
    b.waking = false;
    const play = (seconds) => {
      for (let i = 0; i < seconds * 60 && !g.over; i++) {
        ZS.sim.loop.step(g, 1 / 60);
        draw();
      }
    };
    const walker = ZS.sim.hunters.create(g, 'walker', { x: 1800, dir: -1, from: 1500, to: 2100 });
    const poacher = ZS.sim.hunters.create(g, 'poacher', { x: 2600, dir: 1, from: 2300, to: 2900 });
    g.shooters = [walker, poacher];
    g.people = ['tourist', level === 'winter' ? 'santa' : 'picker'].map((kind, i) => {
      const p = ZS.sim.people.create(g, kind, { from: 3900 + i * 500, to: 4300 + i * 500 });
      p.pause = 99;
      return p;
    });
    b.x = 1800 - 96; b.dir = 1;
    input.press('ArrowRight', true);
    input.press('Space', false);
    play(0.8);
    input.release('ArrowRight');
    assert.equal(walker.react, 'down');
    play(9);
    assert.equal(walker.armed, true, 'he picked the rifle up');
    b.x = poacher.x - 60; b.dir = 1; poacher.pause = 99;
    input.press('KeyX', false);
    play(1.5);
    assert.equal(poacher.react, 'gone');
    const ztmh = ZS.sim.hunters.create(g, 'ztmh', { x: 3300, dir: -1 });
    g.problem = true;
    g.shooters.push(ztmh);
    b.x = ztmh.x - 60; b.dir = 1;
    input.press('KeyC', false);
    play(2.2);
    for (const p of g.people) {
      b.x = p.x - 55; b.dir = 1;
      input.press(p.kind === 'tourist' ? 'KeyC' : 'KeyX', false);
      play(2.4);
    }
    const post = g.level.posts[0];
    const posed = ZS.sim.hunters.create(g, 'posed', { x: post.x, range: 480 });
    g.shooters = [posed];
    b.x = post.x - 30; b.dir = 1;
    input.press('KeyC', false);
    play(2);
    b.x = post.x + 1400;
    play(16);
    assert.equal(posed.react, null, 'back in the stand');
    assert.ok(g.stats.hugs >= 1 && g.stats.selfies >= 1 && g.stats.bites >= 1 && g.stats.stomps >= 2, JSON.stringify(g.stats));
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}
