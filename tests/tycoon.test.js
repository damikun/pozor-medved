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
  const g = ZS.sim.rules.create(input.state, { level: 'winter' });
  const news = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.once.lift = true;
  const p = g.people.find((o) => o.kind === 'tycoon');
  g.shooters = []; g.people = [p]; g.deer = []; g.drones = [];
  const run = (seconds, fn) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over && g.running; i++) {
      ZS.sim.loop.step(g, DT);
      if (fn) fn(i);
    }
  };
  const said = () => news.concat(g.tickerQueue.map((q) => q.text));
  const floats = [];
  const watch = () => { for (const f of g.floaters) if (!floats.includes(f.text)) floats.push(f.text); };
  const park = (x, dir = 1) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = dir; g.bear.vx = 0; };
  const press = (key) => { input.press(key, false); ZS.sim.loop.step(g, DT); input.release(key); };
  return { ZS, g, b: g.bear, L: g.level, p, run, said, floats, watch, park, press, problems, input, math };
}

test('the Lord of the Tatras waits with his assistant just past the chairlift exit, clear of the snow cannon, only in winter', () => {
  const { ZS, L, p } = setup();
  const exit = L.lift.x + 110;
  assert.ok(p, 'he is in the winter level');
  assert.equal(p.x, L.tycoon.x);
  assert.ok(p.x > exit + 60 && p.x - exit < ZS.sim.tycoon.SEE, 'he sees the bear step off the chairlift');
  assert.ok(p.x < L.slope.to && p.aide.x < L.slope.to, 'both stand on the ski slope');
  for (const c of L.cannons) {
    const a = Math.min(c.x - c.dir * 60, c.x + c.dir * 370), z = Math.max(c.x - c.dir * 60, c.x + c.dir * 370);
    assert.ok(p.x > z || p.x < a, 'out of the spray');
    assert.ok(p.aide.x > z || p.aide.x < a, 'the assistant is out of the spray too');
  }
  assert.ok(!L.trees.some((t) => Math.abs(t.x - p.x) < t.w / 2 + 40), 'no tree hides him');
  assert.ok(!ZS.makeLevel('summer', 11).spawns.some((s) => s.kind === 'tycoon'));
});

test('he greets the bear with a season pass instead of running away, and nobody calls the hunters', async (t) => {
  const s = setup();
  const { ZS, g, b, p, run, said, floats, watch, park } = s;
  const hunter = ZS.sim.hunters.create(g, 'walker', { x: p.x + 600, dir: -1, from: p.x + 590, to: p.x + 610, pause: 1e9 });
  g.shooters = [hunter];
  g.panic = 30;
  park(p.x - 200);
  run(3, watch);

  await t.test('he stays put, turns to the bear and holds out the pass while the assistant films', () => {
    assert.equal(p.state, 'walk');
    assert.ok(!p.leaving && !p.react);
    assert.equal(p.x, p.home);
    assert.equal(p.dir, -1);
    assert.ok(p.offer > 0.99, 'offer ' + p.offer);
    assert.ok(p.aide.film);
    assert.equal(p.aide.dir, -1);
  });

  await t.test('the pitch starts with the season pass, makes the news and does not raise the panic', () => {
    assert.equal(floats.find((f) => ZS.LABELS.tycoon.pitch.includes(f)), ZS.LABELS.tycoon.pitch[0]);
    assert.ok(floats.includes(ZS.LABELS.tycoon.film));
    assert.ok(said().includes(ZS.NEWS.tycoon.seen));
    assert.ok(g.panic <= 30);
    assert.equal(g.stats.seen, 0);
    assert.equal(hunter.alertX, null);
  });

  run(ZS.sim.tycoon.PITCH * 2 + 1, watch);
  await t.test('he keeps pitching, the leaflet included, and the leaflet makes the news once', () => {
    for (const line of ZS.LABELS.tycoon.pitch.slice(0, 3)) assert.ok(floats.includes(line), line);
    assert.equal(said().filter((x) => x === ZS.NEWS.tycoon.leaflet).length, 1);
  });

  await t.test('a bear hiding behind a tree is not seen', () => {
    const q = setup();
    const tree = q.L.trees.find((x) => x.hide && x.x > q.p.x + 120 && x.x < q.p.x + 330) || q.L.trees.find((x) => x.hide);
    q.park(tree.x, -1);
    q.b.covered = true; q.b.hiding = tree;
    assert.equal(ZS.sim.tycoon.sees(q.g, q.p), Math.abs(tree.x - q.p.x) < 55);
  });
});

test('C next to him shoots a promo selfie that counts like a tourist selfie, then C hugs him; he never leaves', async (t) => {
  const { ZS, g, b, p, run, said, floats, watch, park, press } = setup();
  g.panic = 40;
  park(p.x - 60);
  run(0.3);
  assert.equal(b.reach, p);
  press('KeyC');

  await t.test('the first C is a promo selfie side by side', () => {
    assert.equal(b.act.kind, 'selfie');
    assert.equal(p.react, 'selfie');
  });

  run(ZS.CFG.SELFIE + 0.4, watch);
  await t.test('it counts toward the hug goal, calms the panic and makes the promo news', () => {
    assert.equal(g.stats.selfies, 1);
    assert.ok(ZS.sim.rules.hugged(g));
    assert.ok(g.panic < 40, 'panic ' + g.panic);
    assert.ok(said().includes(ZS.NEWS.tycoon.promo[0]));
    assert.ok(floats.includes(ZS.LABELS.tycoon.cut));
    assert.ok(ZS.QUIPS.tycoon.includes(g.bubble && g.bubble.text));
    assert.equal(g.people.filter((o) => o.kind === 'tourist').length, 0, 'no extra tourists for a promo');
  });

  await t.test('he stays, walks back to his spot and the next C is a hug', () => {
    assert.ok(p.promo && !p.leaving && p.state === 'walk' && !p.react);
    run(3);
    assert.ok(Math.abs(p.x - p.home) <= 2.01, 'back home ' + p.x);
    park(p.x - 60);
    run(0.2);
    press('KeyC');
    assert.equal(b.act.kind, 'hug');
    run(ZS.CFG.HUG + 0.4, watch);
    assert.equal(g.stats.hugs, 1);
    assert.ok(said().includes(ZS.NEWS.hug.tycoon[0]));
    assert.ok(floats.includes(ZS.LABELS.shout.hug.tycoon) && floats.includes(ZS.LABELS.tycoon.hugged));
    assert.ok(!p.leaving && p.state === 'walk' && !p.react);
  });
});

test('X bites him: a news line, a problem bear, and he walks off calmly with his assistant', async (t) => {
  const { ZS, g, b, p, run, said, floats, watch, park, press } = setup();
  park(p.x - 60);
  run(0.3);
  press('KeyX');
  run(ZS.CFG.HOP + 0.3, watch);

  await t.test('the bite is news about his jacket and makes the bear a problem', () => {
    assert.equal(g.stats.bites, 1);
    assert.ok(said().includes(ZS.NEWS.bite.tycoon[0]));
    assert.ok(floats.includes(ZS.LABELS.shout.bite.tycoon) && floats.includes(ZS.LABELS.tycoon.leave));
    assert.ok(g.syn >= ZS.CFG.PROBLEM);
  });

  await t.test('he walks away instead of running and cannot be reached any more', () => {
    assert.ok(p.leaving);
    assert.equal(p.state, 'walk');
    assert.ok(!p.clutch);
    assert.equal(p.dir, 1);
    const x0 = p.x;
    run(2);
    assert.ok(p.x - x0 > 50 && p.x - x0 < 90, 'walked ' + (p.x - x0));
    assert.ok(p.aide.x > p.x, 'the assistant leads the way');
    assert.notEqual(b.reach, p);
  });
});

test('the Lord of the Tatras and his assistant draw cleanly on a laptop and on a phone, without Math.random', () => {
  for (const [w, h, dpr] of [[1280, 720, 2], [390, 844, 3]]) {
    const { ZS, g, b, p, run, park, press, problems, math } = setup(5, true);
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.viewW = viewW;
    const random = math.random;
    const draw = () => {
      g.cam = ZS.sim.loop.cameraX(g);
      math.random = () => { throw new Error('Math.random while drawing'); };
      try { ZS.draw(g, ctx, viewW, offY); } finally { math.random = random; }
      assert.equal(stackDepth(ctx), 0, 'save() without restore() at ' + b.x.toFixed(0));
    };
    for (let x = p.x - 420; x <= p.x - 40; x += 19) { park(x); run(0.05); draw(); }
    park(p.x - 60); run(0.2);
    press('KeyC'); run(ZS.CFG.SELFIE + 1, draw);
    park(p.x - 60); run(0.2);
    press('KeyC'); run(ZS.CFG.HUG + 1, draw);
    park(p.x - 60); run(0.2);
    press('KeyX'); run(2.5, draw);
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});
