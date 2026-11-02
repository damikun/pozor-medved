'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(seed = 8, withRenderer = false) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'winter' });
  const news = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.deer = []; g.drones = [];
  const run = (seconds, fn) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over && g.running; i++) {
      ZS.sim.loop.step(g, DT);
      if (fn) fn(i);
    }
  };
  const said = () => news.concat(g.tickerQueue.map((q) => q.text));
  const park = (x, dir = 1) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = dir; g.bear.vx = 0; };
  return {
    ZS, g, b: g.bear, L: g.level, O: g.level.lot, run, news, said, park, problems, input,
    hold: (key) => input.press(key, true),
    press: (key) => input.press(key, false),
    release: input.release,
  };
}

function hunter(ZS, g, x, cross) {
  const s = ZS.sim.hunters.create(g, 'walker', { x, dir: -1, from: x - 10, to: x + 10, pause: 1e9 });
  s.cross = cross;
  g.shooters = [s];
  return s;
}

test('the Christmas tree lot fills the gap behind the slope, with no thick trees inside and the old places untouched', () => {
  const { ZS, L, O } = setup();
  assert.ok(O.from > L.slope.to && O.from > L.logs.find((l) => l.x > L.slope.to).x + 60, 'after the slope and the log');
  const post = L.posts.find((p) => p.x > O.from);
  assert.ok(O.to < post.x - 120, 'clear of the hunting stand at ' + post.x);
  assert.deepEqual([L.chata.x, L.lift.x, L.lift.tower, L.slope.from, L.slope.to], [6150, 6960, 7510, 6000, 7700]);
  assert.ok(L.signs.some((s) => s.text === ZS.LABELS.signs.lot && s.x < O.from));
  assert.ok(!L.trees.some((t) => t.x > O.from - 40 && t.x < O.to + 40), 'no forest trees in the lot');
  assert.ok(O.front.every((x) => ZS.sim.lot.inside(L, x)));
  assert.ok(!ZS.sim.lot.inside(L, O.seller) && !ZS.sim.lot.inside(L, O.booth));
  assert.ok(!ZS.makeLevel('summer', 11).lot && !ZS.makeLevel('summer', 11).fisher);
  assert.ok(L.fisher.x > L.ice.from && L.fisher.x < L.ice.to && Math.abs(L.fisher.x - L.holes[0].x) < 80, 'the angler sits by the ice hole');
  assert.ok(L.items.some((it) => it.type === 'catch' && Math.abs(it.x - L.fisher.catch) < 1));
});

test('walking upright among the trees half hides the bear: a hunter takes twice as long to aim', () => {
  const aimAt = (x) => {
    const { ZS, g, b, park, run } = setup();
    park(x);
    const s = hunter(ZS, g, x + 200, x);
    let t = 0, shot = false;
    run(4, () => { shot = shot || g.shots.length > 0; if (!shot) t += DT; });
    return { t, thicket: b.thicket, covered: b.covered, s };
  };
  const { O } = setup();
  const open = aimAt(O.from - 300), lot = aimAt((O.front[2] + O.front[3]) / 2);
  assert.ok(lot.thicket && !lot.covered, 'half hidden, not covered');
  assert.ok(!open.thicket);
  assert.ok(lot.t > open.t * 1.8, `aimed ${open.t.toFixed(2)} s in the open and ${lot.t.toFixed(2)} s among the trees`);
});

test('crouching among the trees hides the bear completely, and the first time says so', () => {
  const { ZS, g, b, O, park, run, hold, said } = setup();
  park(O.front[1] + 20);
  hold('ArrowDown');
  run(0.3);
  assert.ok(b.crouch && b.covered && !b.thicket && !b.hiding);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.lot.cover));
  assert.ok(g.bubble && ZS.QUIPS.lot.includes(g.bubble.text));
  assert.ok(said().includes(ZS.NEWS.lot));
  const s = hunter(ZS, g, b.x + 150, b.x);
  let lock = 0;
  run(4, () => { lock = Math.max(lock, s.lock); });
  assert.equal(lock, 0);
  assert.equal(g.lives, ZS.CFG.LIVES);
  assert.ok(!b.warn);
});

test('shots that miss among the trees hit a Christmas tree and shake it', () => {
  const { ZS, g, b, O, park, run } = setup(3);
  g.lives = 99;
  park(O.front[3] + 6);
  run(0.1);
  let lot = 0, hits = 0;
  for (let i = 0; i < 30; i++) {
    const s = hunter(ZS, g, b.x + 180, b.x);
    const lives = g.lives, before = g.floaters.length;
    ZS.sim.rules.fire(g, s);
    const label = g.floaters.slice(before).map((f) => f.text);
    if (label.includes(ZS.LABELS.lot.miss)) lot++;
    if (g.lives < lives) hits++;
    b.inv = 0;
  }
  assert.ok(lot >= 8 && hits >= 8, `${lot} trees hit, ${hits} hits on the bear`);
  assert.ok(g.lot.front.some((t) => Math.abs(t.v) > 1 || Math.abs(t.sway) > 0.01), 'a tree shakes');
});

test('walking through brushes the trees aside and they spring back; running knocks them over and the noise carries', () => {
  const { ZS, g, b, O, park, run, hold, release, said } = setup();
  park(O.front[0] - 60);
  hold('ArrowRight');
  let bent = 0;
  run(1.2, () => { bent = Math.max(bent, ...g.lot.front.map((t) => Math.abs(t.sway))); });
  release('ArrowRight');
  run(3);
  assert.ok(bent > 0.1, 'bent ' + bent.toFixed(3));
  assert.ok(g.lot.front.every((t) => !t.down && Math.abs(t.sway) < 0.02), 'standing again');
  const s = hunter(ZS, g, O.to + 400, O.to + 600);
  park(O.front[0] - 60);
  hold('ShiftLeft'); hold('ArrowRight');
  run(0.9);
  release('ShiftLeft'); release('ArrowRight');
  assert.equal(g.floaters.filter((f) => f.text === ZS.LABELS.lot.topple).length, 1, 'one shout for the whole crash');
  const down = g.lot.front.filter((t) => t.down);
  assert.ok(down.length >= 4, down.length + ' trees down');
  assert.ok(down.every((t) => t.dir === 1));
  run(1);
  assert.ok(down.every((t) => t.fall === 1));
  assert.ok(s.alertX !== null || Math.abs(s.cross - b.x) < 300, 'the hunter heard it');
  assert.ok(said().some((t) => ZS.NEWS.lotTopple.includes(t)));
});

test('the seller warms himself by the barrel until he sees the bear, then runs and can be hugged on the way', () => {
  const { ZS, g, b, O, park, run, hold, release, press, said } = setup();
  park(O.front[2], 1);
  hold('ArrowDown'); hold('ArrowRight');
  run(1.5);
  assert.equal(g.lot.seller, 'calm', 'a crouching bear sneaks up unseen');
  release('ArrowDown'); release('ArrowRight');
  park(O.seller - 180);
  run(0.1);
  assert.equal(g.lot.seller, 'gone');
  const p = g.lot.person;
  assert.ok(g.people.includes(p) && p.state === 'flee' && p.as === 'seller' && p.dir === 1);
  assert.ok(g.floaters.some((f) => ZS.LABELS.lot.shout.includes(f.text)));
  assert.ok(said().some((t) => ZS.NEWS.lotSeller.includes(t)));
  b.x = p.x - 40; b.dir = 1; p.x = b.x + 40;
  p.speed = 0; p.state = 'walk'; p.from = p.to = p.x; p.pause = 9;
  press('KeyC');
  run(0.5);
  assert.equal(p.react, 'hugged');
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.shout.hug.seller));
  assert.ok(said().includes(ZS.NEWS.hug.seller[0]));
});

test('the seller comes back and stands the trees up once the bear is long gone', () => {
  const { g, O, park, run, hold, release } = setup();
  park(O.front[0] - 60);
  hold('ShiftLeft'); hold('ArrowRight');
  run(1.2);
  release('ShiftLeft'); release('ArrowRight');
  assert.equal(g.lot.seller, 'gone');
  park(O.from - 2000);
  run(20);
  assert.equal(g.lot.seller, 'gone', 'not too soon');
  run(25);
  assert.equal(g.lot.seller, 'calm');
  assert.ok(g.lot.front.every((t) => !t.down));
});

test('the ice angler runs off when the bear comes, and the bear steals his catch', () => {
  const { ZS, g, b, L, park, run, press, said } = setup();
  const F = L.fisher, it = L.items.find((i) => i.type === 'catch');
  park(F.x - 400);
  run(0.2);
  assert.ok(!F.gone);
  park(F.x - 200);
  run(0.1);
  assert.ok(F.gone);
  const p = g.people.find((q) => q.as === 'fisher');
  assert.ok(p && p.state === 'flee' && p.dir === 1 && p.h.look === ZS.sim.fisher.LOOK);
  assert.ok(said().some((t) => ZS.NEWS.fisher.includes(t)));
  b.x = p.x - 40; b.dir = 1; p.x = b.x + 40; b.vx = 0;
  p.state = 'walk'; p.from = p.to = p.x; p.pause = 9;
  press('KeyC');
  run(0.4);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.shout.hug.fisher));
  run(1.5);
  park(it.x);
  const fat = g.fat;
  run(1);
  assert.ok(it.eaten, 'the catch is eaten');
  assert.ok(g.fat > fat);
  assert.ok(g.floaters.some((f) => f.text.includes(ZS.LABELS.food.catch)));
  assert.ok(said().some((t) => ZS.NEWS.catchEaten.includes(t)));
});

test('the autopilot crouches among the trees when a hunter looks its way', () => {
  const { ZS, g, b, O, park, run } = setup(5);
  g.bot = true;
  g.pilot = { t: 0, danger: 0, wait: 0, bold: 0, alarm: -9 };
  park((O.front[1] + O.front[2]) / 2);
  const s = hunter(ZS, g, b.x + 260, b.x + 60);
  s.alertX = b.x;
  let crouched = 0;
  run(3, () => { if (b.crouch && b.covered && ZS.sim.lot.inside(g.level, b.x)) crouched++; });
  assert.ok(crouched > 30, crouched + ' frames crouched');
  assert.equal(g.lives, ZS.CFG.LIVES);
});

test('the tree lot and the ice angler draw cleanly in every season, on a phone and on a laptop', () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 3]]) {
    const { ZS, g, b, L, O, park, run, hold, release, problems } = setup(5, true);
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.viewW = viewW;
    const draw = () => {
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, viewW, offY);
      assert.equal(stackDepth(ctx), 0, 'save() without restore() at ' + b.x.toFixed(0));
    };
    g.def.seasons.forEach((s, si) => {
      g.seasonIdx = si; g.seasonKey = s.key; g.time = s.end - 60;
      for (const [from, to] of [[L.fisher.x - 400, L.fisher.x + 300], [O.from - 300, O.to + 300]]) {
        for (let x = from; x <= to; x += 23) { park(x); g.time += 1 / 30; draw(); }
      }
    });
    park(L.fisher.x - 240);
    run(1, draw);
    park(O.front[0] - 80);
    hold('ShiftLeft'); hold('ArrowRight');
    run(1.4, draw);
    release('ShiftLeft'); release('ArrowRight');
    hold('ArrowDown');
    run(0.6, draw);
    release('ArrowDown');
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});
