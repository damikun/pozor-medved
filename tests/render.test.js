'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

function viewport(width, height, dpr) {
  const scale = Math.min(height / 540, width / (height > width ? 480 : 760));
  return { width: width * dpr, height: height * dpr, scale: dpr * scale, viewW: width / scale, offY: (height / scale - 540) * 0.45 };
}

const CASES = [
  { name: 'landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 2, mode: null },
  { name: 'portrait 770x994', width: 770, height: 994, dpr: 2, seed: 4, mode: null },
  { name: 'portrait, sprinting autopilot', width: 390, height: 844, dpr: 2, seed: 6, mode: 'runner' },
];

for (const c of CASES) {
  test(`a whole run draws cleanly, ${c.name}`, () => {
    const problems = [];
    const ZS = loadGame({ seed: c.seed, withRenderer: true, problems });
    ZS.dev.bot.mode = c.mode;
    const v = viewport(c.width, c.height, c.dpr);
    const ctx = createCanvas(v.width, v.height, problems).getContext('2d');
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: v.viewW, bot: true });
    g.running = true;
    let frames = 0;
    while (!g.over && frames < 1000) {
      ZS.sim.loop.advance(g, 0.5);
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, v.viewW, v.offY);
      frames++;
      assert.equal(stackDepth(ctx), 0, `save() without restore() after frame ${frames}`);
    }
    assert.ok(g.over, 'the run ended');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}
