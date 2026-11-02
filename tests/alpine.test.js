'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(seed = 6, withRenderer = false) {
  const problems = [], math = Object.create(Math);
  const ZS = loadGame({ seed, withRenderer, problems, globals: { Math: math } });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'summer' });
  const news = [], sounds = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  ZS.sim.rules.onSound = (gg, name, x, k) => sounds.push({ name, x, k, t: gg.time });
  g.running = true; g.nextEvent = 1e9; g.time = 130; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  const run = (seconds, fn) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (fn) fn(i);
    }
  };
  const said = () => news.concat(g.tickerQueue.map((q) => q.text));
  const park = (x, dir = 1) => { Object.assign(g.bear, { x, trackX: x, dir, vx: 0, y: ZS.CFG.GROUND, vy: 0, onGround: true }); };
  return {
    ZS, g, b: g.bear, L: g.level, A: g.level.alpine, run, said, sounds, park, problems, input, math,
    hold: (key) => input.press(key, true),
    press: (key) => input.press(key, false),
    release: input.release,
  };
}

test('above the chairlift the forest thins into dwarf pine up to the hut by Zelené pleso, with the den in the pines past the lake', () => {
  const ZS = loadGame({ seed: 1 });
  const L = ZS.makeLevel('summer', 11), A = L.alpine;
  assert.ok(A.from > L.lift.tower && A.from < A.line, A.from + ' ' + A.line);
  assert.ok(A.line - L.lift.tower < 1000, 'the tree line comes soon after the chairlift');
  assert.ok(A.hut.x - A.hut.w / 2 > A.line + 1000, 'the hut is well above the tree line');
  assert.ok(L.goalDen > A.hut.x + A.hut.w / 2 + 150, 'the den lies past the hut');
  assert.ok(A.thickets.some((t) => t[1] < L.goalDen && t[1] > L.goalDen - 350), 'dwarf pines just before the den');
  const above = L.trees.filter((t) => t.x > A.line);
  assert.ok(above.filter((t) => t.kind === 'limba').length >= 2 && above.every((t) => t.kind === 'limba' || (t.kind === 'smrek' && t.h < 190)), above.map((t) => t.kind + t.h).join(','));
  assert.ok(L.trees.some((t) => t.kind === 'smrek' && t.x > A.hut.x && Math.abs(t.x - L.goalDen) < 250), 'a stunted spruce by the den');
  assert.ok(A.lake.from > A.hut.x && A.lake.to < L.goalDen && A.lake.to > L.goalDen - 200, 'the lake lies between the hut and the den');
  assert.ok(A.marmots.every((m) => m.h >= 40), 'marmots sit up on high rocks');
  const dwarfs = L.trees.filter((t) => t.kind === 'smrek' && t.x > A.from && t.x < A.line);
  assert.ok(dwarfs.length >= 2 && dwarfs.some((t) => t.lean > 0.4 && t.h < 180), 'wind-bent dwarf spruces at the tree line');
  assert.ok(L.trees.filter((t) => t.kind === 'limba').every((t) => t.hide), 'every stone pine hides and can be climbed');
  assert.ok(L.spawns.every((s) => !['walker', 'posed', 'picker'].includes(s.kind) || (s.to || s.x) < A.line), 'no hunters or pickers planned above the tree line');
  assert.ok(L.feedSlots.every((f) => f + 400 < A.line) && L.haystacks.every((x) => x < A.from));
  assert.equal(L.spawns.filter((s) => s.kind === 'tourist' && s.from > A.line).length, 2, 'hikers at the hut');
  assert.ok(L.signs.some((s) => s.text === ZS.LABELS.signs.tatras && s.x > L.lift.tower && s.x < A.line));
  const rocks = L.logs.filter((l) => l.rock);
  assert.ok(rocks.length >= 2 && rocks.every((r) => r.x > A.line && r.x < A.hut.x && r.h <= 34), 'granite slabs to step up on');
  assert.equal(ZS.makeLevel('winter', 11).alpine, undefined);
});

test('stone pine cones are natural food: on the ground and up in the crown', () => {
  const s = setup();
  const { ZS, g, b, L, run, hold, release, park } = s;
  assert.deepEqual([ZS.FOOD.limba.natural, ZS.FOOD.limba.fat], [true, ZS.FOOD.nut.fat]);
  const cones = L.items.filter((it) => it.type === 'limba');
  assert.ok(cones.length >= 6 && cones.some((c) => c.y === undefined) && cones.some((c) => c.y !== undefined));
  const ground = cones.find((c) => c.y === undefined && c.x > L.alpine.line);
  park(ground.x - 60);
  hold('ArrowRight'); run(0.6); release('ArrowRight');
  assert.ok(ground.eaten, 'walked over a fallen cone');
  assert.ok(g.stats.natural >= 1);
  const tree = L.trees.find((t) => t.kind === 'limba' && t.x > L.alpine.line);
  const up = cones.filter((c) => c.y !== undefined && Math.abs(c.x - tree.x) < 20);
  assert.equal(up.length, 2);
  park(tree.x); run(0.1);
  const fat = g.fat;
  hold('ArrowUp'); run(2.5); release('ArrowUp');
  assert.ok(b.climbing === tree, 'climbing the stone pine');
  assert.ok(up.every((c) => c.eaten), 'both cones from the crown');
  assert.ok(g.fat > fat + 7);
  assert.ok(g.saidAt.limba > 0, 'the news noticed');
});

test('a marmot whistles at the bear, dives behind its rock and peeks out again once the bear has gone', () => {
  const { g, b, A, run, park, sounds, ZS } = setup();
  const m0 = A.marmots[0];
  park(m0.x - 420);
  run(0.2);
  const m = g.alpine.marmots[0], n = g.alpine.marmots[1];
  assert.equal(m.k, 1);
  park(m0.x - 200);
  run(0.2);
  assert.equal(m.state, 'alarm');
  assert.ok(sounds.some((e) => e.name === 'marmot' && e.x === m.x), 'alarm whistle');
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.alpine.whistle));
  run(1.5);
  assert.equal(m.state, 'hidden');
  assert.equal(n.state, 'hidden', 'the neighbour heard it too');
  assert.equal(sounds.filter((e) => e.name === 'marmot').length, 1, 'one whistle for the colony');
  assert.equal(g.lives, ZS.CFG.LIVES);
  park(m0.x - 700);
  let peek = false;
  run(8, () => { peek = peek || m.state === 'peek'; });
  assert.ok(peek, 'peeked out first');
  assert.ok(['sit', 'graze'].includes(m.state) && m.k > 0.9, m.state + ' ' + m.k);
});

test('chamois snort at the bear and bound up the crag in real leaps, then come back down later', () => {
  const { g, A, run, park, sounds } = setup();
  park(A.crag.from - 300);
  run(0.2);
  const herd = g.alpine.chamois, home = herd.map((c) => c.h), x0 = herd.map((c) => c.x);
  assert.ok(herd.length >= 3 && herd.every((c) => c.state === 'graze'));
  park(herd[0].x - 220);
  let air = 0, peak = 0;
  run(5, () => { if (herd.some((c) => c.leap && c.leap.wait <= 0)) air++; peak = Math.max(peak, ...herd.map((c) => c.h)); });
  assert.equal(sounds.filter((e) => e.name === 'chamois').length, 1, 'one snort for the herd');
  assert.ok(sounds.some((e) => e.name === 'scree'), 'stones rattle under the hooves');
  assert.ok(air > 20, 'airborne frames ' + air);
  assert.ok(herd.every((c) => c.state === 'perch'), herd.map((c) => c.state).join(','));
  assert.ok(herd.every((c, i) => c.h > home[i] + 40 && c.x > x0[i]), 'up and away');
  assert.ok(peak > 150);
  park(A.crag.from - 1200);
  run(14);
  assert.ok(herd.every((c, i) => c.state === 'graze' && c.h === home[i]), herd.map((c) => c.state + c.h).join(','));
});

test('a crouch in the dwarf pines hides the bear, standing in them makes it harder to aim', () => {
  const { ZS, g, b, A, run, park, hold, release, said } = setup();
  const t = A.thickets[1], x = (t[0] + t[1]) / 2;
  park(x);
  run(0.1);
  assert.ok(ZS.sim.alpine.thicket(g.level, b.x));
  assert.ok(b.thicket && !b.covered, 'standing: only harder to hit');
  hold('ArrowDown'); run(0.3);
  assert.ok(b.covered && !b.thicket, 'crouched: hidden');
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.alpine.cover));
  assert.ok(said().includes(ZS.NEWS.kosodrevina));
  const s = ZS.sim.hunters.create(g, 'walker', { x: x + 260, dir: -1, from: x + 250, to: x + 270, pause: 1e9 });
  s.cross = x; g.shooters = [s];
  run(4);
  release('ArrowDown');
  assert.equal(g.lives, ZS.CFG.LIVES);
});

test('the porter keeps hauling his load up to the hut whatever the bear does', () => {
  const { ZS, g, b, A, run, park, said } = setup();
  run(0.1);
  const p = g.alpine.porter, x0 = p.x;
  park(p.x + 40, -1);
  run(1);
  assert.equal(p.state, 'up');
  assert.ok(p.x > x0 + 15, 'still walking');
  assert.ok(g.floaters.some((f) => ZS.LABELS.alpine.porter.includes(f.text)));
  assert.ok(said().includes(ZS.NEWS.porter));
  assert.equal(g.panic, 0);
  p.x = A.porter.to - 5;
  park(A.hut.x + 400);
  run(1);
  assert.equal(p.state, 'unload');
  assert.equal(p.load, false);
  run(ZS.sim.alpine.PORTER.unload + 1);
  assert.equal(p.state, 'down');
});

test('the hut terrace films the bear and chatters, the hikers there still pose for a selfie', () => {
  const { ZS, g, b, A, run, park, sounds, said, press, L } = setup();
  for (const sp of L.spawns.filter((s) => s.kind === 'tourist' && s.from > A.line)) g.people.push(ZS.sim.people.create(g, 'tourist', { from: sp.from, to: sp.to }));
  g.once.alpine = true;
  park(A.hut.x - 600);
  run(0.5);
  assert.ok(sounds.some((e) => e.name === 'hut'), 'chatter and cutlery');
  g.tickerQueue.length = 0;
  park(A.hut.x - 300);
  run(1);
  assert.ok(g.alpine.hut.alarm > 0.9);
  assert.ok(said().includes(ZS.NEWS.hut));
  assert.ok(g.panic > 0);
  const p = g.people[0];
  Object.assign(p, { pause: 99, filmCd: 99 });
  park(p.x - 60);
  run(0.2);
  press('KeyC');
  run(ZS.CFG.SELFIE + 0.5);
  assert.ok(g.stats.selfies >= 1);
});

test('the rock den above the hut still needs a hug, then lets a fat bear in for the winter', () => {
  const { ZS, g, b, L, run, park, hold, release, said } = setup();
  g.fat = g.def.fatGoal + 5;
  park(L.goalDen - 160);
  hold('ArrowRight'); run(2.5);
  assert.ok(!g.over);
  assert.ok(said().includes(ZS.NEWS.altitude), 'vertically overpopulated');
  assert.ok(b.x <= L.goalDen - 22 + 0.01);
  g.stats.hugs = 1;
  run(1.5);
  release('ArrowRight');
  assert.equal(g.ending, 'win');
});

test('the careful autopilot climbs the stone pines and the runner does not eat them all', () => {
  for (const [mode, seed] of [[null, 3], ['runner', 3]]) {
    const ZS = loadGame({ seed });
    Object.assign(ZS.dev.bot, { reaction: 0.4, mode });
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 480, bot: true, level: 'summer' });
    g.running = true;
    for (let i = 0; i < 60 * 400 && !g.over; i++) ZS.sim.loop.step(g, DT);
    const up = g.level.items.filter((it) => it.type === 'limba' && it.y !== undefined);
    if (!mode) { assert.equal(g.ending, 'win'); assert.ok(up.every((c) => c.eaten), 'all crown cones'); }
    else assert.ok(up.some((c) => !c.eaten), 'a runner never climbs');
  }
});

test('the alpine climb draws cleanly on a laptop and on a phone, without Math.random', () => {
  for (const [w, h, dpr] of [[1280, 720, 2], [390, 844, 3]]) {
    const { ZS, g, b, A, L, run, park, problems, math, hold, release } = setup(5, true);
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.viewW = viewW;
    for (const sp of L.spawns.filter((s) => s.kind === 'tourist' && s.from > A.line)) g.people.push(ZS.sim.people.create(g, 'tourist', { from: sp.from, to: sp.to }));
    const random = math.random;
    const draw = () => {
      g.cam = ZS.sim.loop.cameraX(g);
      math.random = () => { throw new Error('Math.random while drawing'); };
      try { ZS.draw(g, ctx, viewW, offY); } finally { math.random = random; }
      assert.equal(stackDepth(ctx), 0, 'save() without restore() at ' + b.x.toFixed(0));
    };
    for (let x = L.lift.tower - 200; x <= L.w - 60; x += 47) { park(x); run(0.05); draw(); }
    park(A.crag.from - 200);
    hold('ArrowRight'); run(3, draw); release('ArrowRight');
    const tree = L.trees.find((t) => t.kind === 'limba' && t.x > A.line);
    park(tree.x); run(0.1);
    hold('ArrowUp'); run(1.5, draw); release('ArrowUp');
    g.stats.hugs = 1; g.fat = 99;
    park(L.goalDen - 120);
    hold('ArrowRight'); run(1.5, draw); release('ArrowRight');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});
