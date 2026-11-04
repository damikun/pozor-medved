'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(seed = 7, { draw = false } = {}) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer: draw, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'summer' });
  const news = [], sounds = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  ZS.sim.rules.onSound = (gg, name, x, k) => sounds.push({ name, x, k });
  g.running = true; g.nextEvent = 1e9; g.time = 130; g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  g.boar = Object.assign(ZS.sim.boar.create(g.level), { state: 'gone', t: 1e9 });
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) { ZS.sim.loop.step(g, DT); if (each) each(i); }
  };
  const said = () => news.concat(g.tickerQueue.map((q) => q.text));
  return { ZS, g, b: g.bear, F: g.level.corn, input, run, news, said, sounds, problems };
}

function hunter(t, x) {
  const s = t.ZS.sim.hunters.create(t.g, 'walker', { x, from: x, to: x, dir: -1 });
  s.speed = 0; s.cross = t.b.x; s.reload = 0;
  t.g.shooters = [s];
  return s;
}

test('the cornfield grows between Dolný Strach and the feeding station, with the stand and the skanzen moved along', () => {
  const { ZS, g, F } = setup();
  const L = g.level;
  assert.ok(F.from > L.village.to && F.to < L.feeding - 100, F.from + '–' + F.to);
  assert.ok(F.to - F.from >= 850, 'twice the old field');
  assert.ok(F.boar > F.from + 200 && F.boar < F.to - 200, 'the boar lives deep in the field');
  assert.equal(L.feeding, 4760);
  assert.ok(L.posts.some((p) => p.x === 5000));
  assert.ok(L.spawns.some((s) => s.kind === 'posed' && s.x === 5000 && s.range === 500));
  assert.equal(L.skanzen.from, 6720, 'the skanzen comes after the logging area');
  assert.ok(L.clearing.from > L.posts[1].x && L.clearing.to < L.skanzen.from, 'the logging area lies between the stand and the skanzen');
  assert.ok(!L.trees.some((t) => t.x > F.from - 50 && t.x < F.to + 40), 'no tree grows in the corn');
  assert.ok(!L.logs.some((l) => l.x + l.w / 2 > F.from && l.x - l.w / 2 < F.to), 'no log lies in the corn');
  const cobs = L.items.filter((it) => it.type === 'cob');
  assert.ok(cobs.length >= 5 && cobs.length <= 6);
  for (const it of cobs) assert.ok(it.x > F.from + 30 && it.x < F.to - 30 && !ZS.FOOD.cob.natural && it.y === undefined);
  assert.equal(ZS.makeLevel('winter', 11).corn, undefined);
});

test('walking into the corn rustles the stalks, puts it in the news and the bear says something', () => {
  const t = setup();
  const { ZS, g, b, F } = t;
  b.x = F.from - 80; b.dir = 1;
  t.input.press('ArrowRight', true);
  let entered = null, label = false;
  t.run(2.4, () => { if (entered === null && b.inCorn) entered = b.x; label = label || g.floaters.some((f) => f.text === ZS.LABELS.corn); });
  t.input.release('ArrowRight');
  assert.ok(entered !== null && entered < F.from + 40, 'entered at ' + entered);
  assert.ok(b.inCorn);
  assert.ok(t.said().includes(ZS.NEWS.corn[0]));
  assert.ok(label);
  assert.ok(ZS.QUIPS.corn.includes(g.bubble && g.bubble.text));
  const rustle = t.sounds.filter((s) => s.name === 'corn');
  assert.ok(rustle.length >= 4, rustle.length + ' rustles');
  const fresh = g.corn.hit.filter((h) => g.time - h < 1.5).length;
  assert.ok(fresh >= 10, fresh + ' stalks moved');
  const before = t.sounds.length;
  t.run(1);
  assert.equal(t.sounds.filter((s, i) => i >= before && s.name === 'corn').length, 0, 'a bear standing still is quiet');
});

test('in the corn a hunter takes twice as long to aim, and a crouching bear disappears', async (tt) => {
  const lockAfter = (x, crouch) => {
    const t = setup(9);
    t.b.x = x; t.b.dir = 1;
    if (crouch) t.input.press('ArrowDown', true);
    const s = hunter(t, x + 220);
    let fired = 0;
    t.ZS.sim.rules.fire = () => { fired++; };
    t.run(0.5, () => { s.cross = t.b.x; });
    return { lock: s.lock, fired, t };
  };
  const F = setup().F;
  const open = lockAfter(F.to + 60), corn = lockAfter(F.to - 260);

  await tt.test('walking among the stalks halves the aiming speed', () => {
    assert.ok(open.lock > 0.45, 'open ' + open.lock);
    assert.ok(Math.abs(corn.lock - open.lock / 2) < 0.03, 'corn ' + corn.lock + ' vs ' + open.lock);
  });

  await tt.test('crouching in the corn is cover: no aim, no warning, no shot', () => {
    const c = lockAfter(F.to - 260, true);
    assert.ok(c.t.b.crouch && c.t.b.covered && c.t.b.inCorn);
    assert.equal(c.lock, 0);
    assert.equal(c.fired, 0);
    assert.equal(c.t.b.warn, false);
  });

  await tt.test('outside the field crouching does not hide the bear', () => {
    const c = lockAfter(F.to + 60, true);
    assert.equal(c.t.b.covered, false);
    assert.ok(c.lock > 0.45);
  });
});

test('shots into the corn miss more often, and a shot at a crouching bear lands in the stalks', () => {
  const t = setup(11);
  const { ZS, g, b, F } = t;
  b.x = F.to - 160; b.dir = 1;
  ZS.sim.loop.step(g, DT);
  assert.ok(b.inCorn);
  const s = hunter(t, b.x + 200);
  let missed = 0;
  for (let i = 0; i < 400; i++) {
    g.lives = 5; b.inv = 0;
    const n = g.floaters.length;
    ZS.sim.rules.fire(g, s);
    if (g.floaters.slice(n).some((f) => f.text === ZS.LABELS.missCorn)) missed++;
  }
  assert.ok(missed > 120 && missed < 200, missed + ' of 400 missed');
  b.crouch = true; b.covered = true; g.tickerQueue = [];
  const n = g.floaters.length;
  ZS.sim.rules.fire(g, s, 'tree');
  assert.ok(g.floaters.slice(n).some((f) => f.text === ZS.LABELS.cornHit));
  assert.ok(t.said().includes(ZS.NEWS.cornHit));
  assert.ok(t.sounds.some((x) => x.name === 'hayHit'));
});

test('the bear stops to munch a cob straight off the field, like other food from people', () => {
  const t = setup();
  const { ZS, g, b } = t;
  const it = g.level.items.find((x) => x.type === 'cob');
  b.x = it.x + 6; b.dir = -1;
  const fat = g.fat, syn = g.syn;
  t.run(0.7);
  assert.ok(it.eaten);
  assert.ok(Math.abs(g.fat - (fat + ZS.FOOD.cob.fat)) < 0.2, String(g.fat - fat));
  assert.ok(g.syn > syn);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.eaten(ZS.FOOD.cob.fat, ZS.LABELS.food.cob)));
  assert.ok(t.said().includes(ZS.NEWS.cobEaten[0]));
  assert.ok(t.sounds.some((s) => s.name === 'eat' && s.k === 'cob'));
});

test('the cornfield draws cleanly in every season, on a phone and on a laptop, with the bear, the boar and a hunter at the edge', () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 3]]) {
    const problems = [];
    const ZS = loadGame({ seed: 5, withRenderer: true, problems });
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW, level: 'summer' });
    g.people = [];
    const F = g.level.corn;
    g.shooters = [ZS.sim.hunters.create(g, 'walker', { x: F.to + 60, from: F.to + 30, to: F.to + 300, dir: -1 })];
    const boar = g.boar = ZS.sim.boar.create(g.level);
    g.def.seasons.forEach((s, si) => {
      g.seasonIdx = si; g.seasonKey = s.key; g.time = s.end - 60;
      for (let x = F.from - 260; x <= F.to + 260; x += 7) {
        g.bear.x = x; g.bear.dir = 1; g.bear.moving = true; g.bear.crouch = si === 2;
        g.time += 1 / 30;
        const k = Math.floor((x - F.from) / 70) % 4;
        Object.assign(boar, { state: ['root', 'walk', 'flee', 'back'][(k + 4) % 4], x: F.boar + ((x * 3) % 400) - 200, dir: k % 2 ? 1 : -1, gruntAt: g.time - (x % 3) * 0.2, scaredAt: g.time - (x % 5) * 0.3 });
        ZS.sim.corn.update(g, 1 / 30);
        g.cam = ZS.sim.loop.cameraX(g);
        ZS.draw(g, ctx, viewW, offY);
        assert.equal(stackDepth(ctx), 0, `save() without restore() at x ${x}`);
      }
    });
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});

function boarSetup(seed) {
  const t = setup(seed);
  t.g.boar = t.ZS.sim.boar.create(t.g.level);
  t.b.x = t.F.from - 600; t.b.dir = 1;
  return t;
}

test('a wild boar roots in the middle of the field, munches the stalks and grunts now and then', () => {
  const t = boarSetup(3);
  const { g, F } = t;
  let far = 0, moved = 0;
  t.run(40, () => {
    far = Math.max(far, Math.abs(g.boar.x - F.boar));
    if (g.time - g.corn.hit[Math.floor((g.boar.x - F.from) / t.ZS.sim.corn.SLOT)] < 0.05) moved++;
  });
  assert.ok(['root', 'walk'].includes(g.boar.state), g.boar.state);
  assert.ok(far > 20 && far <= 151, 'roams ' + far);
  assert.ok(moved > 30, moved + ' frames with stalks moving');
  const grunts = t.sounds.filter((s) => s.name === 'boar' && s.k === 'grunt');
  assert.ok(grunts.length >= 4 && grunts.length <= 12, grunts.length + ' grunts');
  assert.ok(grunts.every((s) => s.x > F.from && s.x < F.to));
  assert.equal(t.sounds.filter((s) => s.k === 'squeal').length, 0);
});

test('when the bear comes close the boar squeals, bolts out of the field and the bear gets the blame', () => {
  const t = boarSetup(4);
  const { ZS, g, b, F } = t;
  const panic = g.panic, lives = g.lives;
  b.x = g.boar.x - 260;
  t.input.press('ArrowRight', true);
  let fled = null;
  t.run(1.6, () => { if (fled === null && g.boar.state === 'flee') fled = Math.abs(b.x - g.boar.x); });
  t.input.release('ArrowRight');
  assert.ok(fled !== null && fled <= ZS.sim.boar.NEAR + 8 && fled > 120, 'startled at ' + fled);
  assert.equal(g.boar.dir, 1);
  assert.ok(t.sounds.some((s) => s.name === 'boar' && s.k === 'squeal'));
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.boar));
  assert.ok(t.said().includes(ZS.NEWS.boar[0]));
  t.run(6);
  assert.equal(g.boar.state, 'gone');
  assert.ok(g.boar.x > F.to + 300, 'ran off to ' + g.boar.x);
  assert.equal(g.panic, panic);
  assert.equal(g.lives, lives);
});

test('a bear creeping through the stalks gets much closer before the boar notices', () => {
  const t = boarSetup(5);
  const { ZS, g, b } = t;
  b.x = g.boar.x - 220;
  t.input.press('ArrowDown', true);
  t.input.press('ArrowRight', true);
  let fled = null;
  t.run(3, () => { if (fled === null && g.boar.state === 'flee') fled = Math.abs(b.x - g.boar.x); });
  assert.ok(fled !== null && fled <= ZS.sim.boar.SNEAK + 8, 'startled at ' + fled);
});

test('the boar comes back to the field once the bear is long gone', () => {
  const t = boarSetup(6);
  const { g, b, F } = t;
  b.x = g.boar.x - 120;
  t.run(6);
  assert.equal(g.boar.state, 'gone');
  b.x = F.from - 1400;
  t.run(20);
  assert.equal(g.boar.state, 'gone', 'stays away for a while');
  t.run(25);
  assert.ok(['root', 'walk'].includes(g.boar.state), g.boar.state);
  assert.ok(Math.abs(g.boar.x - F.boar) < 151);
});

test('no person ever sets foot in the corn, all year, careful or running', () => {
  for (const [seed, mode] of [[1, ''], [2, ''], [6, 'runner'], [9, '']]) {
    const ZS = loadGame({ seed });
    Object.assign(ZS.dev.bot, { reaction: 0.4, mode });
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 480, bot: true, level: 'summer' });
    g.running = true;
    const F = g.level.corn;
    let worst = null, n = 0;
    for (let i = 0; i < 400 * 60 && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      for (const p of g.people.concat(g.shooters)) {
        n++;
        if (p.x > F.from && p.x < F.to && !worst) worst = p.kind + ' at ' + p.x.toFixed(1) + ', t ' + g.time.toFixed(1);
      }
    }
    assert.equal(worst, null, 'seed ' + seed);
    assert.ok(n > 1000);
  }
});

test('walkers, pickers and tourists that spawn across the field are moved to one side of it', () => {
  const { ZS, g, F } = setup();
  const L = g.level;
  for (const sp of L.spawns.filter((s) => s.from !== undefined)) assert.ok(sp.to <= F.from - ZS.sim.corn.KEEP || sp.from >= F.to + ZS.sim.corn.KEEP, sp.kind + ' ' + sp.from + '–' + sp.to);
  const w = ZS.sim.hunters.create(g, 'walker', { x: F.from + 300, from: F.from - 200, to: F.from + 500, dir: -1 });
  assert.ok(w.to <= F.from - ZS.sim.corn.KEEP && w.x <= w.to && w.to - w.from >= 200, w.from + '–' + w.to);
  const p = ZS.sim.people.create(g, 'tourist', { from: F.to - 200, to: F.to + 300 });
  assert.ok(p.from >= F.to + ZS.sim.corn.KEEP && p.x >= p.from, p.from + '–' + p.to);
});

test('a hunter or a tourist walking toward the field turns at its edge', () => {
  const t = setup(8);
  const { ZS, g, F } = t;
  const s = ZS.sim.hunters.create(g, 'walker', { x: F.to + 120, dir: -1 });
  s.from = null; s.to = null;
  const p = ZS.sim.people.create(g, 'picker', { from: F.from - 200, to: F.from - 20 });
  p.from = -1e9; p.to = 1e9; p.x = F.from - 80; p.dir = 1;
  g.shooters = [s]; g.people = [p];
  t.b.x = F.from - 900;
  let min = Infinity, max = -Infinity;
  t.run(12, () => { min = Math.min(min, s.x); max = Math.max(max, p.x); });
  assert.ok(min >= F.to + ZS.sim.corn.KEEP - 0.01, 'hunter ' + min);
  assert.ok(max <= F.from - ZS.sim.corn.KEEP + 0.01, 'picker ' + max);
});
