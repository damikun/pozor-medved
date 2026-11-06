'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

function viewport(width, height, dpr, touch) {
  let band = touch && width > height ? Math.min(64, height * 0.15) : 0;
  let scale = Math.min((height - band) / 540, width / (height > width ? 480 : 760));
  if (band && width / scale > 1000) { band = 0; scale = Math.min(height / 420, width / 1000); }
  const viewH = (height - band) / scale;
  return { width: width * dpr, height: height * dpr, scale: dpr * scale, viewW: width / scale, viewH, offY: viewH >= 540 ? (viewH - 540) * 0.45 : viewH - 540 };
}

function stage(c) {
  const problems = [];
  const ZS = loadGame({ seed: c.seed, withRenderer: true, problems });
  ZS.dev.bot.mode = c.mode || null;
  const v = viewport(c.width, c.height, c.dpr, c.touch);
  const ctx = createCanvas(v.width, v.height, problems).getContext('2d');
  ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: v.viewW, bot: !!c.bot, level: c.level });
  g.running = true;
  g.viewH = v.viewH;
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
  { name: 'summer, phone landscape 932x410 on touch', width: 932, height: 410, dpr: 3, seed: 10, level: 'summer', touch: true },
  { name: 'winter, phone landscape 844x390 on touch', width: 844, height: 390, dpr: 3, seed: 11, level: 'winter', touch: true },
  { name: 'Ďumbier, landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 12, level: 'chopok' },
  { name: 'Ďumbier, portrait 390x844', width: 390, height: 844, dpr: 3, seed: 13, level: 'chopok' },
  { name: 'Ďumbier, portrait, sprinting autopilot', width: 390, height: 844, dpr: 2, seed: 14, mode: 'runner', level: 'chopok' },
  { name: 'Ďumbier, phone landscape 932x410 on touch', width: 932, height: 410, dpr: 3, seed: 15, level: 'chopok', touch: true },
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

const RIDES = [
  { name: 'summer, landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 3, level: 'summer', time: 20 },
  { name: 'summer autumn with the drone, portrait 390x844', width: 390, height: 844, dpr: 3, seed: 4, level: 'summer', time: 250 },
  { name: 'winter, landscape 1280x720', width: 1280, height: 720, dpr: 2, seed: 5, level: 'winter', time: 100 },
  { name: 'winter frost with the drone, portrait 390x844', width: 390, height: 844, dpr: 2, seed: 6, level: 'winter', time: 200 },
  { name: 'summer, phone landscape 932x410 on touch', width: 932, height: 410, dpr: 3, seed: 7, level: 'summer', time: 20, touch: true },
];

for (const c of RIDES) {
  test(`the chairlift ride draws cleanly from the station to the top and back, ${c.name}`, () => {
    const { ZS, g, problems, draw } = stage(c);
    const { input } = ZS.ui;
    g.nextEvent = 1e9;
    g.time = c.time;
    g.lives = 99;
    g.problem = c.seed % 2 === 0;
    g.bear.waking = false;
    const x = ZS.sim.lift.station(g.level);
    g.bear.x = x - 120; g.bear.dir = 1;
    input.press('ArrowRight', true);
    const seen = new Set(), results = new Set();
    let frames = 0;
    for (let i = 0; i < 60 * 34 && !g.over; i++) {
      if (g.ride && g.ride.phase === 'ride') {
        const right = g.ride.t > 5 && g.ride.t % 2.5 < 1;
        input.release(right ? 'ArrowLeft' : 'ArrowRight');
        if (g.ride.t > 5) input.press(right ? 'ArrowRight' : 'ArrowLeft', true);
        else input.release('ArrowLeft');
      }
      ZS.sim.loop.step(g, 1 / 60);
      if (g.ride) { seen.add(g.ride.phase); for (const s of g.ride.shots) if (s.result) results.add(s.result); }
      if (i % 2 === 0) { draw(); frames++; }
      if (seen.has('back') && !g.ride) break;
    }
    input.release('ArrowLeft'); input.release('ArrowRight');
    for (let i = 0; i < 30; i++) { ZS.sim.loop.step(g, 1 / 60); draw(); }
    assert.deepEqual([...seen], ['board', 'ride', 'arrive', 'back']);
    assert.ok(results.has('hit') && (results.has('spark') || results.has('miss')), [...results].join(','));
    assert.ok(frames > 700, frames + ' frames');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}

const CLEARINGS = [
  { name: 'landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 3, time: 130 },
  { name: 'portrait 390x844', width: 390, height: 844, dpr: 3, seed: 4, time: 250 },
  { name: 'phone landscape 844x390 on touch', width: 844, height: 390, dpr: 3, seed: 5, time: 130, touch: true },
  { name: 'phone landscape 932x410 on touch, a bear in the open behind the forester', width: 932, height: 410, dpr: 2, seed: 6, time: 60, touch: true, idle: true },
];

for (const c of CLEARINGS) {
  test(`the logging clearing draws cleanly from the door and back, ${c.name}`, () => {
    const { ZS, g, problems, draw } = stage(Object.assign({ level: 'summer', bot: !c.idle }, c));
    ZS.dev.bot.reaction = 0.6;
    g.nextEvent = 1e9;
    g.time = c.time;
    g.lives = 99;
    g.touch = !!c.touch;
    g.bear.waking = false;
    g.shooters = []; g.people = [];
    const D = g.level.clearing;
    g.bear.x = D.x - 40; g.bear.trackX = D.x - 40;
    const seen = new Set(), results = new Set();
    let frames = 0;
    for (let i = 0; i < 60 * 60 && !g.over; i++) {
      if (c.idle && !g.cut) ZS.ui.input.press('ArrowRight', true);
      if (c.idle && g.cut) ZS.ui.input.release('ArrowRight');
      const f = c.idle && g.cut && g.cut.phase === 'play' && g.cut.forester;
      if (f && !f.dead) { g.bear.x = Math.max(g.level.logging.from + 40, f.x - 260); g.bear.trackX = g.bear.x; }
      ZS.sim.loop.step(g, 1 / 60);
      if (g.cut) { seen.add(g.cut.phase); if (g.cut.aim.result) results.add(g.cut.aim.result); }
      if (i % 2 === 0) { draw(); frames++; }
      if (seen.has('back') && !g.cut) break;
    }
    ZS.ui.input.release('ArrowRight');
    for (let i = 0; i < 30; i++) { ZS.sim.loop.step(g, 1 / 60); draw(); }
    assert.deepEqual([...seen], ['in', 'open', 'play', 'out', 'back']);
    if (c.idle) assert.ok(results.has('hit'), [...results].join(','));
    assert.ok(frames > 1000, frames + ' frames');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}

const SCENES = [
  { name: 'landscape 1280x720', width: 1280, height: 720, dpr: 1, seed: 16 },
  { name: 'portrait 390x844', width: 390, height: 844, dpr: 3, seed: 17 },
];

for (const c of SCENES) {
  test(`the cave, the cabin, the hut queue, the bikers, the fog, the wind and the minister draw cleanly frame by frame on the way to Ďumbier, ${c.name}`, () => {
    const { ZS, g, problems, draw } = stage(Object.assign({ level: 'chopok' }, c));
    const { input } = ZS.ui;
    const L = g.level, b = g.bear;
    g.nextEvent = 1e9;
    g.lives = 99;
    b.waking = false;
    g.shooters = []; g.people = [];
    const play = (seconds, each) => {
      for (let i = 0; i < seconds * 60 && !g.over; i++) {
        if (each) each(i);
        ZS.sim.loop.step(g, 1 / 60);
        if (i % 2 === 0) draw();
      }
    };
    const at = (x, season) => { b.x = x; b.trackX = x; b.dir = 1; b.stun = 0; if (season) g.seasonKey = season; };
    const seen = new Set();
    const through = (door) => {
      at(door - 80);
      g.bot = true;
      for (let i = 0; i < 60 * 70 && !g.over; i++) {
        ZS.sim.loop.step(g, 1 / 60);
        const p = g.chopok && g.chopok.pass;
        if (p) seen.add(p.key + ':' + p.phase);
        if (i % 3 === 0) draw();
        if (i > 60 && !p) break;
      }
      g.bot = false;
    };
    through(L.cave.door);
    at(L.jasna.bikes[1] - 400);
    g.chopok.bikeT = 0;
    play(3);
    through(L.funi.door);
    input.press('ArrowRight', true);
    at(L.chata.door - 20);
    play(2);
    at(L.chata.counter);
    input.release('ArrowRight');
    g.chopok.chata.cook.state = 'pot'; g.chopok.chata.cook.t = 9;
    input.press('KeyC', false);
    play(1.5);
    at(L.crest.from + 800, 'autumn');
    Object.assign(g.chopok.fog, { phase: 'coming', t: 1 });
    Object.assign(g.chopok.wind, { phase: 'warn', t: 0.5 });
    play(4);
    input.press('ArrowRight', true);
    at(L.dumbier.minister - 300, 'firstSnow');
    play(4);
    input.release('ArrowRight');
    assert.deepEqual([...seen], ['cave:close', 'cave:open', 'cave:play', 'cave:shut', 'cave:back', 'funi:close', 'funi:open', 'funi:play', 'funi:shut', 'funi:back']);
    assert.ok(g.once.caveTour && g.once.caveTour.counted > 0, 'bats counted');
    assert.equal(g.chopok.chata.served, true);
    assert.ok(g.once.book, 'the summit book');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls`);
  });
}
