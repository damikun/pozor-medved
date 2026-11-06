'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;
const KEYS = ['cave', 'caved', 'funi', 'top', 'chata', 'ridge'];

function setup(seed = 5) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'chopok' });
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each && each(i) === false) return;
    }
  };
  const quiet = () => { g.shooters = []; g.people = []; g.dogs = []; g.deer = []; };
  const put = (x) => { Object.assign(g.bear, { x, trackX: x, dir: 1 }); };
  return { ZS, g, b: g.bear, L: g.level, input, run, quiet, put, hold: (key) => input.press(key, true), release: input.release };
}

test('the Ďumbier level is built from the dolina to the summit, with cover all the way and no trees in the landmarks', () => {
  const { ZS, L } = setup();
  assert.equal(L.id, 'chopok');
  assert.equal(L.w, ZS.LEVELS.chopok.w);
  assert.equal(L.goalDen, L.w - 300);
  assert.deepEqual([...L.checkpoints.map((c) => c.key)], KEYS);
  const xs = [...L.checkpoints.map((c) => c.x)];
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'checkpoints in walking order');
  assert.ok(xs.every((x) => x > L.startDen && x < L.goalDen));
  assert.ok(L.checkpoints.find((c) => c.key === 'cave').x < L.cave.door);
  assert.ok(L.checkpoints.find((c) => c.key === 'caved').x > L.cave.land);
  assert.ok(L.checkpoints.find((c) => c.key === 'funi').x < L.funi.door);
  assert.ok(L.checkpoints.find((c) => c.key === 'top').x > L.funi.land);
  for (const p of L.passes) assert.ok(p.from < p.to && p.wall < p.to && p.wall > p.from, p.key);
  const hiders = L.trees.filter((t) => t.hide).concat(L.covers);
  for (const t of L.trees) {
    for (const p of L.passes) assert.ok(t.x < p.from - 40 || t.x > p.to + 20, 'tree at ' + Math.round(t.x) + ' in the ' + p.key);
    assert.ok(t.x < L.chata.from - 40 || t.x > L.chata.to + 40, 'tree in the hut at ' + Math.round(t.x));
    for (const l of L.lots) assert.ok(t.x < l.from || t.x > l.to, 'tree on the car park at ' + Math.round(t.x));
  }
  const gaps = hiders.map((t) => t.x).concat(...L.passes.map((p) => [p.from, p.to])).sort((a, b) => a - b).map((x, i, a) => (i ? x - a[i - 1] : 0));
  assert.ok(Math.max(...gaps) < 1200, 'longest stretch without cover: ' + Math.round(Math.max(...gaps)));
  assert.ok(L.covers.filter((c) => c.rock).length >= 10, 'boulders and cairns on the ridge');
  assert.ok(L.covers.every((c) => c.hide && c.top < 450 && (c.lime || c.x > L.summit.from)));
  const natural = L.items.filter((it) => ZS.FOOD[it.type].natural);
  assert.ok(natural.length >= 20, natural.length + ' natural food items');
  for (const it of L.items) assert.ok(ZS.FOOD[it.type] && it.x > 40 && it.x < L.w - 40, it.type);
  for (const kind of ['bin', 'container']) assert.ok(L.items.some((it) => it.type === kind), kind);
  assert.ok(L.items.some((it) => it.labelKey === 'lingon' && it.x > L.crest.from), 'lingonberries on the ridge');
});

test('the third level is on the start screen and every new text exists in all four languages', () => {
  const { ZS } = setup();
  for (const code of ZS.i18n.codes()) {
    const T = ZS.LANGS[code];
    assert.ok(T.LEVEL_TEXT.chopok.blurb.length < 50, code);
    for (const k of Object.keys(ZS.LEVEL_TEXT.chopok.seasons)) assert.ok(ZS.LEVELS.chopok.seasons.some((s) => s.key === k), k);
    for (const key of KEYS) {
      for (const t of [T.NEWS.cp[key], T.LABELS.cp[key], T.UI.resumeAt[key], T.UI.retryAt[key]]) assert.ok(typeof t === 'string' && t.trim(), code + ' ' + key);
    }
    assert.equal(T.CHOPOK_HEADLINES.length, ZS.LANGS.sk.CHOPOK_HEADLINES.length);
  }
  for (const k of Object.keys(ZS.NEWS)) if (!['cp', 'logging', 'tycoon'].includes(k)) assert.ok(ZS.NEWS_ICON[k] || typeof ZS.NEWS[k] === 'object', 'icon for ' + k);
});

function into(env, door) {
  const { g, run, put, hold, release } = env;
  put(door - 60);
  hold('ArrowRight');
  run(4, () => (g.chopok && g.chopok.pass && g.chopok.pass.phase === 'play' ? false : undefined));
  release('ArrowRight');
  return g.chopok.pass.play;
}

test('the cave is a sublevel of its own: the valley is put away, the bear counts the bats and comes out by the ice cave', () => {
  const env = setup();
  const { ZS, g, b, L, run, quiet, hold, release } = env;
  quiet();
  const main = g.level, people = [ZS.sim.people.create(g, 'tourist', { from: 1000, to: 1100 })];
  g.people = people;
  const c = into(env, L.cave.door);
  assert.ok(g.level.stage && g.level.cave && g.level !== main, 'inside the cave stage');
  assert.equal(g.people.length, 0, 'the valley people wait outside');
  assert.ok(ZS.sim.chopok.inside(g));
  g.bot = true;
  run(90, () => (g.chopok.pass ? undefined : false));
  g.bot = false;
  assert.equal(g.level, main);
  assert.ok(g.people.includes(people[0]), 'the valley people are back');
  assert.equal(g.once.cave, true);
  assert.equal(c.result, 'all', 'a careful bear counts every bat');
  assert.deepEqual({ ...g.once.caveTour }, { counted: c.total, of: c.total });
  assert.equal(c.seen, 0);
  assert.ok(b.x >= L.cave.land, 'out of the cave at ' + Math.round(b.x));
  hold('ArrowLeft');
  run(2);
  release('ArrowLeft');
  assert.ok(b.x >= L.passes[0].wall - 1, 'the exit is one way: ' + Math.round(b.x));
});

test('in the cave the closed part needs the headlamp, holding C under a colony counts the bats one by one, and running there wakes them up', () => {
  const env = setup();
  const { ZS, g, b, run, quiet, input } = env;
  quiet();
  const c = into(env, env.L.cave.door);
  const S = g.level.cave;
  c.guide = ZS.sim.cave.TOUR.gone;
  Object.assign(b, { x: S.lamp + 40, trackX: S.lamp + 40 });
  input.press('ArrowRight', true);
  run(1);
  input.release('ArrowRight');
  assert.equal(c.lamp, false);
  assert.ok(b.x <= S.gap - 10, 'no further without light: ' + Math.round(b.x));
  Object.assign(b, { x: S.lamp, trackX: S.lamp });
  run(0.1);
  assert.equal(c.lamp, true, 'the headlamp is picked up on the way');
  const [first, , last] = c.bats;
  Object.assign(b, { x: first.x, trackX: first.x });
  input.press('KeyC', true);
  run(0.5);
  assert.ok(first.counted >= 2 && first.counted < first.n, 'counting: ' + first.counted);
  run(1.5);
  input.release('KeyC');
  assert.equal(first.state, 'done');
  assert.equal(ZS.sim.cave.counted(c), first.n);
  const after = S.low[1][1] + 30;
  Object.assign(b, { x: after, trackX: after });
  input.press('ArrowRight', true);
  input.press('ShiftLeft', true);
  run(0.6);
  input.release('ShiftLeft');
  input.release('ArrowRight');
  assert.equal(last.state, 'fly', 'a running bear wakes the colony');
  assert.equal(last.counted, 0);
  const F = ZS.sim.cave.FLOCK;
  run(F.fly + F.away + F.back + 0.3);
  assert.equal(last.state, 'sleep', 'the colony comes back after a while');

});

test('in the cave a low ceiling stops an upright bear like a wall, a crawling one passes, the rock stops a jump, and the wide river is crossed stone by stone or sinks the bear', () => {
  const env = setup();
  const { ZS, g, b, run, quiet, input } = env;
  quiet();
  const c = into(env, env.L.cave.door);
  const S = g.level.cave, T = ZS.sim.cave.TOUR;
  c.guide = T.gone;
  c.lamp = true;
  const [a, z] = S.low[0];
  Object.assign(b, { x: a - 120, trackX: a - 120 });
  input.press('ArrowRight', true);
  run(1);
  const xs = [];
  run(1, () => { xs.push(b.x); });
  assert.ok(b.x < a, 'stopped before the low ceiling: ' + Math.round(b.x));
  assert.ok(Math.max(...xs) - Math.min(...xs) < 0.5, 'no jitter at the edge');
  assert.equal(b.stun, 0, 'no bump');
  assert.ok(c.bats.every((o) => o.state === 'sleep'), 'the bats sleep on');
  assert.equal(ZS.sim.cave.hint(g, c), 'crawl');
  input.press('ArrowDown', true);
  run(1);
  input.release('ArrowDown');
  assert.ok(b.x > a && b.crouch, 'crawling under: ' + Math.round(b.x));
  input.press('Space', false);
  run(0.5);
  input.release('Space');
  assert.ok(b.onGround && b.crouch, 'no jumping under the rock');
  run((z - b.x + 80) / 85 + 0.5);
  input.release('ArrowRight');
  assert.ok(b.x > z, 'crawled through: ' + Math.round(b.x));
  Object.assign(b, { x: a - 70, trackX: a - 70, dir: 1 });
  run(0.3);
  const GY0 = b.y;
  let top = b.y;
  input.press('Space', false);
  run(0.8, () => { top = Math.min(top, b.y); });
  input.release('Space');
  assert.ok(top < GY0 - 20, 'a real jump: ' + Math.round(top));
  assert.ok(top - 90 >= ZS.sim.cave.ceiling(g.level, a - 30) - 1, 'the head stays under the rock: ' + Math.round(top));
  const W = S.water, CFG = ZS.CFG;
  assert.ok(W[1] - W[0] >= 260 && S.stones.length === 2, 'a wide river with two stones');
  assert.ok(W[1] - W[0] > (CFG.RUN * 2 * CFG.JUMP) / CFG.GRAVITY, 'not even a running jump clears it');
  for (const s of S.stones) assert.ok(!ZS.sim.cave.water(g.level, s) && s > W[0] && s < W[1], 'a dry stone in the river');
  const lives = g.lives;
  Object.assign(b, { x: W[0] - 20, trackX: W[0] - 20, y: GY0, stun: 0, dir: 1 });
  input.press('ArrowRight', true);
  run(1, () => (c.sink ? false : undefined));
  input.release('ArrowRight');
  assert.equal(c.wet, 1, 'walked into the water');
  const x0 = b.x;
  run(0.4);
  assert.ok(c.sink && b.y > GY0 + 5, 'sinking: ' + Math.round(b.y));
  assert.ok(Math.abs(b.x - x0) < 0.5 && g.lives === lives, 'no control and no life lost while it sinks');
  run(ZS.sim.cave.SINK.t);
  assert.ok(!c.sink && g.lives === lives - 1, 'a life lost');
  assert.ok(b.x < W[0] && b.x > W[0] - 80 && b.y === GY0, 'back on the near bank: ' + Math.round(b.x));
  assert.ok(c.safe > 0 && b.inv > 0, 'a short grace');
  g.lives = 1;
  const panic = g.panic;
  Object.assign(b, { x: W[0] + 10, trackX: W[0] + 10 });
  run(ZS.sim.cave.SINK.t + 0.2);
  assert.equal(c.wet, 2);
  assert.ok(g.lives === 1 && g.panic > panic, 'never the last life, panic instead');
  let jumps = 0;
  Object.assign(b, { x: W[0] - 150, trackX: W[0] - 150, y: GY0 });
  g.bot = true;
  run(4, () => { if (b.vy < 0 && b.onGround === false && b.vy < -CFG.JUMP + 30) jumps++; return b.x > W[1] + 40 ? false : undefined; });
  g.bot = false;
  assert.ok(b.x > W[1] + 40 && c.wet === 2, 'crossed dry: ' + Math.round(b.x));
  assert.ok(jumps >= 2, jumps + ' jumps');
});

test('in the cave the tour warns first, a meter over the guide fills while the bear is in sight and stops the tour, hiding (↓ or C) lets it drain and the tour walks on, and a full meter loses the cave and starts it again', () => {
  const env = setup();
  const { ZS, g, b, run, quiet, input } = env;
  quiet();
  const c = into(env, env.L.cave.door);
  const S = g.level.cave, T = ZS.sim.cave.TOUR, A = ZS.sim.cave.ALERT;
  assert.ok(g.level.covers.every((o) => o.x < S.gap), 'only the show part has columns to hide behind');
  Object.assign(b, { x: T.trigger + 10, trackX: T.trigger + 10 });
  run(DT * 2);
  assert.ok(c.go !== null && c.warn, 'the warning comes first');
  run(T.delay - 0.2);
  assert.equal(c.guide, T.from, 'the guide still talks at the gate');
  assert.equal(c.sus, 0);
  Object.assign(b, { x: 400, trackX: 400 });
  Object.assign(c, { go: c.t - T.delay - 1, guide: 560 });
  const panic = g.panic, lives = g.lives;
  run(1);
  assert.ok(c.sus > A.stop && c.alert, 'the meter fills and the tour stops: ' + c.sus.toFixed(2));
  const at = c.guide;
  input.press('ArrowRight', true);
  run(0.3);
  input.release('ArrowRight');
  assert.equal(c.guide, at, 'the tour waits while the bear is in sight');
  assert.ok(b.x <= at - A.block + 0.5, 'the group blocks the walkway: ' + Math.round(b.x));
  assert.ok(g.panic > panic, 'filming raises panic');
  const col = g.level.covers.filter((o) => o.x < b.x).pop();
  Object.assign(b, { x: col.x, trackX: col.x, stun: 0, hiding: null });
  input.press('ArrowDown', true);
  run(0.3);
  assert.ok(b.hiding && b.hiding.hide && c.alert, 'hidden, the tour still looks around');
  const was = c.sus;
  run(1);
  assert.ok(c.sus < was, 'the meter drains while hidden');
  run(c.sus / A.fall + 0.5);
  assert.ok(!c.alert && c.suspect, 'the tour moves on, now suspicious');
  const seen = c.seen;
  run(3);
  input.release('ArrowDown');
  assert.equal(c.seen, seen, 'the tour walks past the column');
  const col2 = g.level.covers[1];
  Object.assign(b, { x: col2.x, trackX: col2.x, hiding: null });
  Object.assign(c, { guide: T.gone, alert: null, sus: 0 });
  input.press('KeyC', true);
  run(0.3);
  assert.ok(b.hiding && b.hiding.hide, 'C hides behind the column too');
  c.guide = col2.x + 80;
  run(1.5);
  assert.equal(c.sus, 0, 'nobody notices a hidden bear');
  input.release('KeyC');
  c.bats[0].counted = 3; c.lamp = true;
  Object.assign(b, { x: 640, trackX: 640, hiding: null, stun: 0 });
  Object.assign(c, { guide: 700, alert: null });
  run(A.fill + 0.5, () => { if (c.lost) return false; });
  assert.ok(c.lost, 'a full meter loses the cave');
  run(A.lost + 0.1);
  assert.ok(!c.lost && c.restarts === 1, 'the cave starts again');
  assert.ok(Math.abs(b.x - g.level.start) < 30 && c.lamp === false && c.bats[0].counted === 0 && c.guide === T.from, 'from the very beginning');
  assert.equal(g.lives, lives, 'no life lost, only the cave');
  c.lamp = true; c.guide = T.gone;
  Object.assign(b, { x: S.exit - 2, trackX: S.exit - 2 });
  run(DT * 2);
  assert.ok(b.x < S.exit - 30 && c.result === null, 'no way out before the bats are counted');
  for (const o of c.bats) o.state = 'gone';
  Object.assign(b, { x: S.exit - 2, trackX: S.exit - 2 });
  run(DT * 2);
  assert.equal(b.helmet, false, 'the headlamp stays in the cave');
});

test('the cabin is a sublevel too: a careful bear balances it from the other side and gets out by the Rotunda', () => {
  const env = setup();
  const { g, b, L, run, quiet } = env;
  quiet();
  const c = into(env, L.funi.door);
  assert.ok(g.level.cabin, 'inside the cabin');
  g.bot = true;
  let leg = 0, kept = null, halt = null, done = null;
  run(50, () => {
    if (c.leg !== leg) { leg = c.leg; kept = { shift: c.shift, dirs: c.people.map((p) => p.dir) }; }
    if (halt === null && c.arrived > 0) halt = g.time;
    if (done === null && c.result) done = g.time;
    return g.chopok.pass ? undefined : false;
  });
  g.bot = false;
  assert.ok(kept && kept.shift && kept.shift.leg === 0, 'leaving Priehyba keeps the last call going');
  assert.ok(c.legT > c.legAt && c.legAt > 15, 'the ride clock runs on through the middle station');
  assert.ok(done - halt <= 1.1, 'off at Chopok right away: ' + (done - halt).toFixed(2) + ' s');
  assert.equal(g.once.funi, true);
  assert.equal(c.result, 'level');
  assert.equal(c.alarms, 0);
  assert.equal(c.seen, 0, 'balancing from the far side keeps the bear behind everyone’s back');
  assert.ok(b.x > L.funi.land - 1 && b.x < L.summit.rotunda, 'by the Rotunda at ' + Math.round(b.x));
});

test('in the cabin a crowd at one window tips it, and a bear on the same side sets off the overload alarm', () => {
  const env = setup();
  const { ZS, g, b, run, quiet } = env;
  quiet();
  const c = into(env, env.L.funi.door);
  const S = g.level, panic = g.panic;
  c.legT = 1;
  run(4);
  assert.equal(c.side, -1);
  assert.ok(ZS.sim.cabin.balance(c) > c.mid + 100, 'the counterweight belongs on the right');
  Object.assign(b, { x: S.cabin.left + 20, trackX: S.cabin.left + 20 });
  const lives = g.lives, ride = c.ride;
  run(2.5);
  assert.ok(c.alarms >= 1, 'overload');
  assert.ok(g.panic > panic);
  assert.equal(g.lives, lives - 1, 'an overload costs a life');
  assert.ok(c.ride > ride && c.leg === 0, 'the ride goes on, no restart');
  const alarms = c.alarms;
  run(1);
  assert.equal(c.alarms, alarms, 'a short pause before the next alarm');
  g.lives = 1;
  run(ZS.sim.cabin.JOLT.cool + 1.5);
  assert.equal(g.lives, 1, 'never the last life');
});

test('every checkpoint of the Ďumbier level survives packing and resumes on its side of the passages', () => {
  const { ZS, g, input, put } = setup();
  const { checkpoint } = ZS.sim;
  for (const c of g.level.checkpoints) {
    put(c.x + 4);
    if (c.after) g.once[c.after] = true;
    const s = checkpoint.unpack(checkpoint.pack(Object.assign(checkpoint.save(g, c.key), { tally: { trees: 0, stands: 0 } })));
    assert.ok(s, c.key);
    assert.equal(s.level, 'chopok');
    assert.equal(s.key, c.key);
    const r = checkpoint.resume(s, input.state, {});
    assert.equal(r.level.id, 'chopok');
    assert.equal(Math.round(r.bear.x), Math.round(c.x + 4));
    assert.equal(!!r.once.cave, g.level.checkpoints.findIndex((k) => k.key === c.key) >= 1, 'cave behind ' + c.key);
    assert.equal(!!r.once.funi, g.level.checkpoints.findIndex((k) => k.key === c.key) >= 3, 'cabin behind ' + c.key);
  }
});

test('in the hut queue, moving while the hut keeper looks gets the bear noticed and no soup for a while, the hut is always a way through, and ordering behind his back serves cabbage soup', () => {
  const { ZS, g, b, L, run, quiet, put, input } = setup();
  quiet();
  run(0.1);
  const k = g.chopok.chata;
  const freeze = () => { k.cook.t = 99; for (const p of k.guests) { p.state = 'calm'; p.t = 99; } };
  put(L.chata.from - 40);
  freeze();
  k.cook.state = 'look';
  input.press('ArrowRight', true);
  run(4);
  input.release('ArrowRight');
  assert.ok(b.x > L.chata.to, 'straight through the hut: ' + Math.round(b.x));
  assert.ok(k.caught >= 1 && g.stats.seen > 0, 'noticed on the way');
  put(L.chata.counter);
  k.cook.state = 'pot';
  input.press('KeyC', false);
  run(0.3);
  assert.equal(k.served, false, 'no soup right after being caught');
  run(0.5);
  g.time += 6;
  put(L.chata.counter);
  freeze();
  k.cook.state = 'pot';
  b.stun = 0;
  const fat = g.fat;
  input.press('KeyC', false);
  run(0.3);
  assert.equal(k.served, true);
  assert.ok(g.fat > fat + 10, 'a bowl of soup: ' + (g.fat - fat));
  assert.ok(k.bill > 0, 'the bill to the minister is shown');
  assert.equal(ZS.sim.chopok.atCounter(g), false, 'one bowl only');
});

test('thick fog on the ridge hides the bear from anyone further than arm’s length, and the hunters do not shoot into it', () => {
  const { ZS, g, b, L, run, quiet, put } = setup();
  quiet();
  put(L.crest.from + 600);
  run(0.1);
  const f = g.chopok.fog;
  f.phase = 'thick'; f.t = 99;
  const hunter = ZS.sim.hunters.create(g, 'walker', { x: b.x + 260, dir: -1, from: b.x + 200, to: b.x + 300 });
  hunter.cross = b.x; hunter.reload = 0;
  g.shooters = [hunter];
  run(3);
  assert.equal(b.fogged, true);
  assert.equal(b.covered, true);
  assert.equal(g.lives, ZS.CFG.LIVES, 'no shots in the fog');
  f.phase = 'clear'; f.t = 99;
  run(0.2);
  assert.equal(b.fogged, false);
  assert.equal(b.covered, false);
});

test('a gust pushes a standing bear back along the ridge, and a crouching one stays put', () => {
  const { g, b, L, run, quiet, put, hold, release } = setup();
  quiet();
  put(L.crest.from + 500);
  run(0.1);
  const w = g.chopok.wind;
  w.phase = 'gust'; w.t = 99;
  const x = b.x;
  run(1);
  assert.ok(b.x < x - 80, 'pushed back ' + Math.round(x - b.x));
  const y = b.x;
  hold('ArrowDown');
  run(1);
  release('ArrowDown');
  assert.ok(Math.abs(b.x - y) < 1, 'crouched');
});

test('the rescuer on the ridge only asks if the bear is lost', () => {
  const { ZS, g, b, L, run, quiet, put } = setup();
  quiet();
  run(0.1);
  put(L.crest.from + 1500);
  g.people = [ZS.sim.people.create(g, 'rescuer', { from: b.x + 100, to: b.x + 100 })];
  Object.assign(g.people[0], { dir: -1, pause: 99 });
  run(0.3);
  assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.chopok.hello));
  assert.equal(g.shooters.length, 0, 'the rescuer does not shoot');
});

test('the Lord of the Tatras below Ďumbier spots a bear in clear weather, misses him in the fog, and the summit book gets an entry on the way down', () => {
  const seen = setup();
  seen.quiet();
  seen.put(seen.L.tatier.x - 200);
  seen.run(0.1);
  seen.g.chopok.fog.phase = 'clear'; seen.g.chopok.fog.t = 99;
  seen.run(0.2);
  assert.equal(seen.g.chopok.tatier.seen, true);
  assert.ok(seen.g.panic > 0);
  assert.ok(seen.g.floaters.some((f) => f.text === seen.ZS.LABELS.chopok.inShot));

  const { ZS, g, b, L, input, run, quiet, put, hold, release } = setup(6);
  assert.ok(L.tatier.x > L.descent.from && L.tatier.x < L.goalDen, 'down below the summit');
  quiet();
  put(L.dumbier.x - 200);
  const c = ZS.sim.chopok.state(g);
  Object.assign(c.fog, { phase: 'thick', t: 99, k: 1 });
  Object.assign(c.wind, { phase: 'calm', t: 99, k: 0 });
  hold('ArrowRight');
  run(10, (i) => {
    if (i % 45 === 0) input.press('Space', false);
    else if (i % 45 === 6) input.release('Space');
    return b.x < L.tatier.x + 120;
  });
  release('ArrowRight');
  assert.equal(g.once.book, true);
  assert.equal(g.chopok.tatier.seen, false);
  assert.equal(g.chopok.tatier.passed, true);
  assert.ok(b.x > L.tatier.x + 60);
});
