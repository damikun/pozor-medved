'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;
const KEYS = ['hrad', 'press', 'door', 'vote', 'voted', 'mesto', 'boat', 'luh'];

function setup(seed = 5) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'capital' });
  g.running = true;
  g.nextEvent = 1e9;
  g.bear.waking = false;
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each && each(i) === false) return;
    }
  };
  const put = (x) => { Object.assign(g.bear, { x, trackX: x, dir: 1 }); };
  return { ZS, g, b: g.bear, L: g.level, input, run, put, hold: (key) => input.press(key, true), release: input.release };
}

const only = (g, kinds) => { g.shooters = []; g.dogs = []; g.people = g.people.filter((p) => kinds.includes(p.kind)); };

test('Bratislava starts on the castle hill without a den and runs past the castle, the parliament, the Old Town and the Danube to a den in the floodplain forest', () => {
  const { ZS, L } = setup();
  assert.equal(L.id, 'capital');
  assert.equal(L.w, ZS.LEVELS.capital.w);
  assert.ok(L.startDen < 0, 'no den at the start');
  assert.deepEqual([...L.checkpoints.map((c) => c.key)], KEYS);
  const xs = [...L.checkpoints.map((c) => c.x)];
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'checkpoints in walking order');
  const vote = L.passes.find((p) => p.key === 'vote'), boat = L.passes.find((p) => p.key === 'boat');
  assert.ok(L.checkpoints.find((c) => c.key === 'vote').x < vote.from);
  assert.ok(L.checkpoints.find((c) => c.key === 'voted').x > vote.to);
  assert.ok(L.checkpoints.find((c) => c.key === 'boat').x < boat.from);
  assert.ok(L.checkpoints.find((c) => c.key === 'luh').x > boat.to);
  assert.equal(L.checkpoints.find((c) => c.key === 'voted').after, 'vote');
  assert.equal(L.checkpoints.find((c) => c.key === 'luh').after, 'boat');
  for (const p of L.passes) assert.ok(p.from < p.to && p.wall < p.to && p.wall > p.from, p.key);
  for (const t of L.trees) assert.ok(t.x < L.indoor[0] - 80 || t.x > L.indoor[1] + 40, 'tree indoors at ' + Math.round(t.x));
  const hiders = L.trees.filter((t) => t.hide).map((t) => t.x).concat(L.covers.map((c) => c.x), L.dwarf.map(([a, z]) => (a + z) / 2), L.posts.map((p) => p.x));
  const gaps = hiders.concat(...L.passes.map((p) => [p.from, p.to])).sort((a, b) => a - b).map((x, i, a) => (i ? x - a[i - 1] : 0));
  assert.ok(Math.max(...gaps) < 900, 'longest stretch without cover: ' + Math.round(Math.max(...gaps)));
  for (const it of L.items) assert.ok(ZS.FOOD[it.type] && it.x > 40 && it.x < L.w - 40, it.type);
  for (const k of ['statue', 'scaffold']) assert.ok(L.posts.some((p) => p.kind === k), k);
  assert.ok(L.trees.some((t) => t.pole), 'a flagpole to climb');
});

test('Bratislava is on the start screen after Ďumbier and every checkpoint has its text in all four languages', () => {
  const { ZS } = setup();
  for (const code of ZS.i18n.codes()) {
    const T = ZS.LANGS[code];
    assert.ok(T.LEVEL_TEXT.capital.blurb.length < 50, code);
    for (const k of Object.keys(ZS.LEVEL_TEXT.capital.seasons)) assert.ok(ZS.LEVELS.capital.seasons.some((s) => s.key === k), k);
    for (const key of KEYS) for (const t of [T.NEWS.cp[key], T.LABELS.cp[key], T.UI.resumeAt[key], T.UI.retryAt[key]]) assert.ok(typeof t === 'string' && t.trim(), code + ' ' + key);
    assert.equal(T.CAPITAL_HEADLINES.length, ZS.LANGS.sk.CAPITAL_HEADLINES.length);
    assert.equal(T.NEWS.capital.bill.length, 3);
  }
});

test('without a PRESS badge the police push the bear back from the cordon and never shoot, and the turnstile stays shut', () => {
  const { g, b, L, run, put, hold } = setup();
  run(0.1);
  only(g, ['police']);
  const lives = g.lives;
  put(L.capital.square.cordon[0] - 200);
  hold('ArrowRight');
  let pushed = false;
  run(30, () => { if (g.capital.shove > 0) pushed = true; });
  assert.ok(pushed, 'the police pushed the bear back');
  assert.ok(b.x < L.capital.square.gate, 'still outside at ' + Math.round(b.x));
  assert.equal(g.lives, lives);
  assert.equal(g.shooters.length, 0);
});

test('a hug for the STRACH 24 intern gives the PRESS badge and counts as the hug, and then the police wave the bear through', () => {
  const { g, b, L, run, put, hold, release, input } = setup();
  run(0.1);
  only(g, ['intern', 'police']);
  const it = g.people.find((p) => p.kind === 'intern');
  put(it.x - 40);
  b.dir = 1;
  input.state.hugPressed = true;
  run(1.5);
  assert.equal(g.once.badge, true);
  assert.equal(g.stats.hugs, 1);
  hold('ArrowRight');
  run(30, () => (b.x > L.capital.inside.from ? false : undefined));
  release('ArrowRight');
  assert.ok(b.x > L.capital.inside.from, 'inside the parliament at ' + Math.round(b.x));
});

test('a bite on the intern also drops the badge, so the level never gets stuck, but it costs panic', () => {
  const { g, b, run, put, input } = setup();
  run(0.1);
  only(g, ['intern']);
  const it = g.people.find((p) => p.kind === 'intern');
  put(it.x - 40);
  b.dir = 1;
  const panic = g.panic;
  input.state.bitePressed = true;
  run(1.5);
  assert.equal(g.once.badge, true);
  assert.ok(g.panic >= panic + 15);
});

test('MP Flinta cries when he sees the bear, a hug calms him and hands over his voting card without starting the hug ban, and ignoring him calls the guard', () => {
  const { ZS, g, b, L, run, put, input } = setup();
  const F = ZS.sim.capital.FLINTA;
  run(0.1);
  g.once.badge = true;
  only(g, ['flinta']);
  const f = g.people.find((p) => p.kind === 'flinta');
  f.x = L.capital.corridor.flinta; f.dir = -1;
  put(f.x - 200);
  run(3);
  assert.equal(f.phase, 'cry');
  run(F.sob * F.sobs + 0.5, () => (g.capital.shove > 0 ? false : undefined));
  assert.ok(g.capital.shove > 0, 'the guard pushes the bear back');
  run(2);
  g.stats.hugs = 1;
  put(f.x - 40);
  b.dir = 1;
  f.phase = 'cry'; f.seenAt = g.time; f.t = 9;
  input.state.hugPressed = true;
  run(1.5);
  assert.equal(g.once.flinta, 'hug');
  assert.equal(g.once.card, true);
  assert.equal(g.hugBanAt, 0, 'no hug ban for comforting Flinta');
});

test('in the plenary the bear sits down, makes the quorum, votes on four bills from the desk and the constitutional law passes with 90 votes', () => {
  const { ZS, g, b, L, run, put, hold, release } = setup();
  run(0.1);
  g.once.badge = true;
  only(g, []);
  const door = L.passes.find((p) => p.key === 'vote').from;
  put(door - 60);
  hold('ArrowRight');
  run(4, () => (g.pass && g.pass.phase === 'play' ? false : undefined));
  release('ArrowRight');
  const c = g.pass.play;
  assert.ok(g.level.plenary && g.level.stage);
  g.bot = true;
  run(10, () => (ZS.sim.plenary.fpv(c) ? false : undefined));
  assert.ok(ZS.sim.plenary.fpv(c), 'the bear sits down and the view switches to first person');
  run(60, () => (g.pass ? undefined : false));
  g.bot = false;
  assert.equal(g.level.id, 'capital');
  assert.ok(!g.level.stage);
  assert.equal(c.votes, 4);
  assert.equal(c.present, 76, 'the bear is the 76th member present');
  assert.equal(c.seen, 0, 'a careful bear ducks before the camera and the neighbour');
  assert.ok(c.res.every((r) => r.quorum));
  assert.equal(g.once.plenary.passed, true);
  assert.equal(g.once.vote, true);
  assert.ok(b.x >= door + 100, 'out of the hall at ' + Math.round(b.x));
  const R = ZS.sim.plenary.ROUNDS;
  assert.equal(R[R.length - 1].base + 1, 90);
});

test('a bear that never votes leaves the plenary with 89 votes, the law fails and nobody hunts the bear in the hall', () => {
  const { ZS, g, L, run, put, hold, release } = setup();
  run(0.1);
  g.once.badge = true;
  only(g, []);
  put(L.passes.find((p) => p.key === 'vote').from - 60);
  hold('ArrowRight');
  run(4, () => (g.pass && g.pass.phase === 'play' ? false : undefined));
  release('ArrowRight');
  const c = g.pass.play;
  g.lives = 2;
  run(60, () => (g.pass ? undefined : false));
  assert.equal(c.votes, 0);
  assert.equal(c.res[0].quorum, false, 'without the bear the house has no quorum');
  assert.equal(c.res[ZS.sim.plenary.ROUNDS.length - 1].za, 89);
  assert.equal(g.once.plenary.passed, false);
  assert.equal(c.seen, 0, 'no hiding in the hall');
  assert.equal(g.lives, 2);
});

test('at the buffet counter the cook refuses the bear while she looks, gives in after two tries, and serves goulash soup behind her back', () => {
  const { g, b, L, run, put, input } = setup();
  run(0.1);
  only(g, []);
  put(L.capital.bar.counter);
  run(0.1);
  const k = g.capital.bar, fat = g.fat;
  k.cook.state = 'look'; k.cook.t = 99;
  input.state.hugPressed = true; run(1);
  assert.equal(k.served, false);
  assert.equal(k.tries, 1);
  run(3);
  input.state.hugPressed = true; run(1);
  assert.equal(k.tries, 2);
  run(5);
  input.state.hugPressed = true; run(1);
  assert.equal(k.served, true, 'served after two refusals');
  assert.ok(g.fat > fat);
  assert.ok(!b.act || b.act.kind === 'knock');
});

function board(seed = 5) {
  const S = setup(seed);
  const { g, L, run, put, hold, release } = S;
  run(0.1);
  g.once.badge = true;
  only(g, []);
  const p = L.passes.find((o) => o.key === 'boat');
  put(p.from - 60);
  hold('ArrowRight');
  run(4, () => (g.pass && g.pass.phase === 'play' ? false : undefined));
  release('ArrowRight');
  return Object.assign(S, { p, c: g.pass && g.pass.play });
}

test('the bear steers the Dunajka motorboat from the port to the floodplain forest, a careful pilot without a scratch and with fish, and the pier cannot be used twice', () => {
  const { ZS, g, b, p, c, run, put, hold, release } = board();
  assert.ok(g.level.boat && g.level.stage);
  assert.ok(c && c.obs.length > 15, 'a whole river of traffic');
  const kinds = new Set(c.obs.map((o) => o.kind));
  for (const k of ['buoy', 'log', 'pier', 'barge', 'cruise', 'police', 'raketa']) assert.ok(kinds.has(k), k);
  g.bot = true;
  const t0 = g.time;
  run(90, () => (g.pass ? undefined : false));
  g.bot = false;
  const ride = g.time - t0;
  assert.ok(ride > 45 && ride < 72, 'the ride takes about a minute, not ' + ride.toFixed(1));
  assert.equal(g.once.boat, true);
  assert.equal(g.once.boatRide.hits, 0, 'the autopilot dodges everything');
  assert.ok(g.once.boatRide.snacks >= 3, 'and picks up the fish on the way');
  assert.equal(g.lives, ZS.CFG.LIVES);
  assert.ok(b.x >= p.to);
  put(p.wall - 60);
  hold('ArrowLeft');
  run(1);
  release('ArrowLeft');
  assert.ok(b.x >= p.wall, 'the pier is behind the bear');
  assert.equal(g.pass, null);
});

test('left and right slide the boat gently between lanes while it keeps its own speed, always seen from the helm', () => {
  const { ZS, g, c, run, hold, release } = board();
  const R = ZS.sim.boat.RIDE;
  c.obs.length = 0;
  run(1.5);
  assert.equal(c.lane, 0);
  assert.ok(c.v >= R.cruise - 1 && c.v <= R.fast + 1, 'the boat runs by itself');
  hold('ArrowLeft'); run(DT); release('ArrowLeft');
  assert.equal(c.lane, 1, 'a tap aims at the next lane');
  let jump = 0, last = c.ly, t = 0, half = 0;
  run(2, () => { jump = Math.max(jump, Math.abs(c.ly - last)); last = c.ly; t += DT; if (!half && c.ly >= 0.5) half = t; });
  assert.equal(c.ly, 1, 'and the boat settles in it');
  assert.ok(jump <= R.sway * DT + 1e-9, 'without jumps');
  assert.ok(half > 0.3, 'a lane change takes its time like a boat');
  hold('ArrowLeft'); run(2.5); release('ArrowLeft'); run(2);
  assert.equal(c.lane, 2, 'held left slides on to the last lane');
  assert.equal(c.ly, 2);
  hold('KeyD'); run(DT); release('KeyD'); run(2);
  assert.equal(c.ly, 1);
  const v = c.v;
  hold('ArrowUp'); run(1); release('ArrowUp');
  hold('ArrowDown'); run(1); release('ArrowDown');
  assert.ok(Math.abs(c.v - v) < 25, 'up and down do nothing to the speed');
  g.input.hugPressed = true; run(0.5);
  assert.equal(c.cam, undefined, 'there is no other camera');
});

test('a fish in the lane is a snack, not a crash', () => {
  const { g, b, c, run } = board();
  run(0.5);
  const fish = c.obs.find((o) => o.kind === 'snack');
  c.obs = [Object.assign(fish, { a: b.x + 200, lane: c.lane, live: true })];
  const fat = g.fat, lives = g.lives;
  run(2);
  assert.equal(fish.got, true);
  assert.equal(c.snacks, 1);
  assert.ok(g.fat > fat);
  assert.equal(g.lives, lives);
  assert.equal(c.hits, 0);
});

test('a bear that does not steer rams the moored cruise ship, loses a heart, is knocked into a free lane, and the river never takes the last heart', () => {
  const { g, b, c, run } = board();
  const lives = g.lives, panic = g.panic;
  run(5, () => (c.hits ? false : undefined));
  assert.equal(c.hits, 1);
  assert.equal(g.lives, lives - 1);
  assert.ok(g.panic > panic);
  assert.ok(b.inv > 0, 'a moment of grace');
  assert.equal(c.lane, 1, 'knocked away from the ship');
  const ship = c.obs.find((o) => o.kind === 'cruise');
  assert.equal(ship.hit, true);
  g.lives = 1;
  for (const o of c.obs) if (o.kind === 'buoy') { o.a = b.x + 140; o.lane = c.lane; o.hit = false; break; }
  b.inv = 0;
  run(2);
  assert.equal(g.lives, 1);
  assert.ok(c.hits >= 2);
});

test('the warning arrows announce what is coming, the police searchlight sweeps two lanes and the hydrofoil wake leaves one calm lane', () => {
  const { ZS, g, b, c, run } = board();
  const B = ZS.sim.boat;
  run(1);
  assert.ok(B.incoming(g, c).some((w) => w.o.kind === 'cruise' && w.t > 1), 'the ship in the lane is announced early');
  c.obs = c.obs.filter((o) => o.kind === 'police').slice(0, 1);
  const cop = c.obs[0];
  Object.assign(cop, { a: b.x + 700, lane: 0, d: 1, live: true });
  c.lane = 2; c.ly = 2; c.lv = 0;
  const lives = g.lives;
  run(5);
  assert.ok(!cop.seen && c.hits === 0, 'the far lane is out of the sweep');
  Object.assign(cop, { a: b.x + 700, seen: false, hit: false, lane: 1, d: 1 });
  run(5, () => (c.hits ? false : undefined));
  assert.equal(cop.seen, true, 'caught in the searchlight');
  assert.equal(g.lives, lives - 1);
  const raketa = { id: 99, kind: 'raketa', lane: 0, at: 0, len: B.SIZE.raketa, vx: 0, a: b.x + 3000, live: true, hit: false, surf: true, wet: false, waves: [0, 1], band: [b.x + 400, b.x + 820] };
  c.obs = [raketa];
  b.inv = 0;
  const hits = c.hits;
  c.lane = 2; c.ly = 2;
  run(4);
  assert.equal(raketa.wet, true);
  assert.equal(c.hits, hits, 'the calm lane is safe');
  const again = Object.assign({}, raketa, { wet: false, band: [b.x + 300, b.x + 720] });
  c.obs = [again];
  c.lane = 0; c.ly = 0;
  run(3);
  assert.equal(again.wet, true);
  assert.equal(c.hits, hits + 1, 'riding into the wake costs a heart');
});

test('the beaver fells the tree the bear hides behind, and a crouch in the manhole next to Čumil is a tourist photo that counts for the hug goal', () => {
  const { ZS, g, b, L, run, put, hold, release } = setup();
  run(0.1);
  only(g, []);
  const t = L.trees.find((o) => o.beaver);
  put(t.x);
  hold('ArrowDown');
  run(0.5);
  assert.equal(b.hiding, t);
  run(ZS.sim.capital.BEAVER.gnaw + ZS.sim.capital.BEAVER.warn + 0.5);
  release('ArrowDown');
  assert.ok(!L.trees.includes(t), 'the tree is down');
  assert.ok(b.hiding !== t);
  put(L.manhole);
  const selfies = g.stats.selfies;
  hold('ArrowDown');
  run(0.5);
  release('ArrowDown');
  assert.equal(g.stats.selfies, selfies + 1);
});

test('every checkpoint of Bratislava survives packing and resumes with the badge and on its side of the passages', () => {
  const { ZS, g, input, put } = setup();
  const { checkpoint } = ZS.sim;
  g.once.badge = true;
  for (const c of g.level.checkpoints) {
    put(c.x + 4);
    if (c.after) g.once[c.after] = true;
    const s = checkpoint.unpack(checkpoint.pack(Object.assign(checkpoint.save(g, c.key), { tally: { trees: 0, stands: 0 } })));
    assert.ok(s, c.key);
    const r = checkpoint.resume(s, input.state, {});
    assert.equal(r.level.id, 'capital');
    assert.equal(Math.round(r.bear.x), Math.round(c.x + 4));
    assert.equal(r.once.badge, true);
    const i = g.level.checkpoints.findIndex((k) => k.key === c.key);
    assert.equal(!!r.once.vote, i >= 4, 'plenary behind ' + c.key);
    assert.equal(!!r.once.boat, i >= 7, 'boat behind ' + c.key);
  }
});

test('a careful autopilot gets through Bratislava and a pure runner does not', () => {
  for (const [mode, seed] of [['careful', 3], ['runner', 6]]) {
    const ZS = loadGame({ seed });
    const g = ZS.sim.rules.create(ZS.ui.input.state, { level: 'capital', bot: true });
    g.running = true; g.bear.waking = false;
    ZS.dev.bot.mode = mode;
    ZS.dev.bot.reaction = 0.35;
    ZS.sim.loop.advance(g, 400);
    assert.ok(g.over, mode + ' run ended');
    assert.equal(g.ending === 'win', mode === 'careful', mode + ': ' + g.ending);
  }
});
