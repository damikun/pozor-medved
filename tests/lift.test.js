'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup(level, seed = 3) {
  const ZS = loadGame({ seed });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level });
  g.running = true;
  g.nextEvent = 1e9;
  g.shooters = []; g.people = []; g.dogs = []; g.deer = [];
  g.bear.waking = false;
  const lift = ZS.sim.lift, x = lift.station(g.level);
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each) each(i);
    }
  };
  const until = (done, seconds) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      if (done()) return true;
      ZS.sim.loop.step(g, DT);
    }
    return done();
  };
  const place = (at, dir) => { g.bear.x = at; g.bear.trackX = at; g.bear.dir = dir; };
  const board = () => {
    place(x - 160, 1);
    input.press('ArrowRight', true);
    assert.ok(until(() => !!g.ride, 3), 'the walk reached the station');
    input.release('ArrowRight');
    assert.ok(until(() => g.ride && g.ride.phase === 'ride', 2), 'the chair left the station');
    return g.ride;
  };
  const telegraph = () => until(() => g.ride && g.ride.shots.some((s) => s.state === 'aim'), 20);
  return { ZS, g, b: g.bear, lift, x, input, run, until, place, board, telegraph };
}

for (const level of ['summer', 'winter']) {
  test(`walking into the lower station starts the chairlift once, ${level}`, () => {
    const { g, b, x, input, until, place, board } = setup(level);
    assert.equal(g.ride, null);
    const r = board();
    assert.equal(r.x, x);
    assert.ok(r.salvos.length >= 6 && r.salvos.length <= 8, r.salvos.length + ' salvos');
    g.lives = 99;
    assert.ok(until(() => !g.ride, 40), 'the ride ended');
    let again = 0;
    input.press('ArrowLeft', true);
    until(() => { if (g.ride) again++; return b.x < x - 300; }, 6);
    input.release('ArrowLeft');
    place(x - 120, 1);
    input.press('ArrowRight', true);
    until(() => { if (g.ride) again++; return b.x > x + 300; }, 6);
    input.release('ArrowRight');
    assert.equal(again, 0, 'walking past the station again does not start a second ride');
    assert.ok(b.x > x + 300);
  });
}

test('the ride takes about 27 s of game time, the clock and the seasons keep running and the bear does not get hungrier', () => {
  const { g, until, board } = setup('summer');
  g.time = 100;
  g.lives = 99;
  board();
  const t0 = g.time, fat = g.fat;
  assert.ok(until(() => !g.ride, 40));
  const took = g.time - t0;
  assert.ok(took > 25 && took < 28.5, 'took ' + took.toFixed(1) + ' s');
  assert.equal(g.seasonKey, 'summer', 'spring turned into summer during the ride');
  assert.ok(Math.abs(g.fat - fat) < 0.2, 'fat ' + fat + ' -> ' + g.fat);
});

test('a telegraphed shot hits a chair that stays in its zone and misses one swung out of it', () => {
  const still = setup('summer', 5);
  still.board();
  assert.ok(still.telegraph());
  const shot = still.g.ride.shots[0];
  assert.equal(shot.zone, 1, 'the hunters aim at the middle of a still chair');
  assert.ok(still.until(() => shot.state === 'done', 3));
  assert.equal(shot.result, 'hit');
  assert.equal(still.g.lives, 4);
  assert.ok(still.b.inv > 0, 'the bear blinks after the hit');
  assert.ok(still.g.floaters.some((f) => f.ride && f.text === still.ZS.LABELS.hit(4)));

  const swung = setup('summer', 5);
  swung.board();
  assert.ok(swung.telegraph());
  swung.input.press('ArrowLeft', true);
  const dodged = swung.g.ride.shots[0];
  assert.ok(swung.until(() => dodged.state === 'done', 3));
  assert.notEqual(dodged.result, 'hit');
  assert.equal(swung.g.lives, 5);
  assert.ok(swung.g.floaters.some((f) => f.ride && f.text === swung.ZS.LABELS.miss));
  assert.ok(swung.lift.sway(swung.g.ride) < -0.35, 'holding ← swings the chair to the left');

  assert.ok(swung.until(() => swung.g.ride.shots.length > 1, 6));
  const next = swung.g.ride.shots[1];
  assert.equal(next.zone, 0, 'the next shot aims at the left, where the chair now hangs');
  swung.input.release('ArrowLeft');
  assert.ok(swung.until(() => next.state === 'done', 3));
  assert.notEqual(next.result, 'hit', 'letting the chair swing back to the middle dodges it');
  assert.equal(swung.g.lives, 5);
});

function dodger(ZS, g, park = 0, react = 0.3, margin = 0.05, slack = 0.1) {
  const lift = ZS.sim.lift, keys = g.input.keys, wait = Math.round(react / DT), loose = Math.round(slack / DT);
  let plan = null, seen = '', held = 0;
  const live = (r) => r.shots.filter((s) => s.state !== 'done');
  function check(r, seq, due) {
    const q = { th: r.th, w: r.w, lean: r.lean };
    const last = Math.max(...due.map((d) => d.n)) + loose;
    let worst = Infinity;
    for (let j = 1; j <= last; j++) {
      lift.swing(q, seq(j), DT);
      for (const d of due) if (Math.abs(d.n - j) <= loose) worst = Math.min(worst, Math.abs(Math.sin(q.th) - d.u) - lift.HIT);
    }
    return worst;
  }
  function search(r) {
    const shots = live(r), due = shots.map((s) => {
      let t = r.t, n = 0;
      while (t < s.fire + lift.FLY) { t += DT; n++; }
      return { n, u: s.u };
    });
    const last = Math.max(...due.map((d) => d.n));
    let best = null, score = margin;
    const keep = held, consider = (go) => {
      const seq = (j) => (j <= wait ? keep : go(j - wait));
      const m = check(r, seq, due);
      if (m > score) { score = m; best = seq; }
    };
    for (const a of [-1, 0, 1]) consider(() => a);
    if (best) return best;
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (let s1 = 2; s1 < last; s1 += 2) consider((j) => (j <= s1 ? a : b));
    if (best) return best;
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) {
      for (let s1 = 3; s1 < last; s1 += 3) for (let s2 = s1 + 3; s2 < last; s2 += 3) consider((j) => (j <= s1 ? a : j <= s2 ? b : c));
    }
    return best;
  }
  return () => {
    const r = g.ride;
    keys.delete('ArrowLeft'); keys.delete('ArrowRight');
    if (!r || r.phase !== 'ride') return true;
    const shots = live(r), key = shots.map((s) => s.id).join(',');
    if (!shots.length) {
      plan = null; seen = '';
      held = park === 2 ? (Math.floor(r.t / 2.5) % 2 ? 1 : -1) : park;
      if (held > 0) keys.add('ArrowRight'); else if (held < 0) keys.add('ArrowLeft');
      return true;
    }
    if (key !== seen) { seen = key; plan = search(r); if (plan) plan.at = r.t; }
    if (!plan) return false;
    let j = 0, t = plan.at;
    while (t < r.t - 1e-9) { t += DT; j++; }
    const p = plan(j + 1);
    held = p;
    if (p > 0) keys.add('ArrowRight'); else if (p < 0) keys.add('ArrowLeft');
    return true;
  };
}

test('across seeds, seasons and both levels a dodger that waits at either edge, reacts 0.3 s late and times its swing only to 0.1 s is never hit', () => {
  let rides = 0, pairs = { twin: 0, chase: 0 };
  for (const level of ['summer', 'winter']) {
    for (let seed = 1; seed <= 24; seed++) {
      for (const season of [0, 1, 2]) {
        const { ZS, g, board } = setup(level, seed * 7 + season);
        g.lives = 99;
        g.seasonIdx = season;
        g.flags.drones = seed % 4 === 0;
        board();
        const park = [0, -1, 1, 2][(seed + season) % 4], r = g.ride, steer = dodger(ZS, g, park);
        let stuck = null;
        for (let i = 0; i < 40 * 60 && g.ride && !g.over; i++) {
          if (!steer() && stuck === null) stuck = r.t;
          ZS.sim.loop.step(g, DT);
        }
        rides++;
        for (const s of r.salvos) if (s.pair) pairs[s.pair]++;
        assert.equal(stuck, null, `${level}, seed ${seed}, season ${season}, park ${park}: no safe swing at ${stuck && stuck.toFixed(2)} s`);
        assert.equal(r.hits, 0, `${level}, seed ${seed}, season ${season}, park ${park}: ${r.hits} hits`);
        assert.equal(new Set(r.shots.map((s) => s.foe.salvo)).size, r.salvos.length, 'every salvo was fired before the top');
        assert.ok(r.shots.every((s) => s.state === 'done'));
      }
    }
  }
  assert.ok(rides >= 144 && pairs.twin > 5 && pairs.chase > 5, JSON.stringify(pairs));
});

test('telegraphs on different zones never overlap and the next one leaves time to swing across', () => {
  let close = 0;
  for (const level of ['summer', 'winter']) {
    for (let seed = 1; seed <= 30; seed++) {
      for (const style of ['idle', 'swing']) {
        const { ZS, g, board, input } = setup(level, seed * 3 + (style === 'idle' ? 0 : 1));
        g.lives = 99;
        g.seasonIdx = seed % 3;
        board();
        const r = g.ride;
        for (let i = 0; i < 40 * 60 && g.ride; i++) {
          if (style === 'swing') {
            input.release('ArrowLeft'); input.release('ArrowRight');
            const k = Math.floor(r.t / 0.7) % 4;
            if (k === 1) input.press('ArrowLeft', true); else if (k === 3) input.press('ArrowRight', true);
          }
          ZS.sim.loop.step(g, DT);
        }
        input.release('ArrowLeft'); input.release('ArrowRight');
        const win = r.shots.map((s) => ({ s, a: s.t0, b: s.fire + ZS.sim.lift.FLY }));
        for (const x of win) {
          assert.ok(x.b - x.a >= 0.9 + ZS.sim.lift.FLY - 1e-6, 'a warning of at least ' + (x.b - x.a).toFixed(2) + ' s');
          for (const y of win) {
            if (x === y || x.s.zone === y.s.zone || y.a < x.a) continue;
            assert.ok(y.a >= x.b + ZS.sim.lift.PACE.gap - 1e-6, `${level}, seed ${seed}: zone ${x.s.zone} until ${x.b.toFixed(2)}, zone ${y.s.zone} from ${y.a.toFixed(2)}`);
            if (y.a - x.b < 0.6) close++;
          }
        }
        for (const s of r.salvos.filter((o) => o.pair === 'twin')) {
          const two = r.shots.filter((o) => o.foe.salvo === r.salvos.indexOf(s));
          assert.equal(two.length, 2);
          assert.equal(two[0].zone, two[1].zone, 'a quick pair aims at one zone');
          assert.ok(Math.abs(two[1].fire - two[0].fire - ZS.sim.lift.PACE.twin) < 1e-6);
        }
      }
    }
  }
  assert.ok(close > 0, 'some shots come right after each other');
});

test('the chair swings like a pendulum: it overshoots the middle when released and settles', () => {
  const { g, input, run, board, lift } = setup('winter', 2);
  board();
  input.press('ArrowRight', true);
  let peak = 0;
  run(1.2, () => { peak = Math.max(peak, lift.sway(g.ride)); });
  input.release('ArrowRight');
  let low = 0;
  run(1.4, () => { low = Math.min(low, lift.sway(g.ride)); });
  assert.ok(peak > 0.5, 'holding → swings out to ' + peak.toFixed(2));
  assert.ok(low < -0.1, 'released, it swings past the middle to ' + low.toFixed(2));
  run(5);
  assert.ok(Math.abs(lift.sway(g.ride)) < 0.08, 'and then settles');
});

test('the careful autopilot reads the laser dots and gets through with at most one hit, a still chair gets hit by every salvo', () => {
  for (const level of ['summer', 'winter']) {
    for (let seed = 1; seed <= 6; seed++) {
      const careful = setup(level, seed);
      careful.ZS.dev.bot.reaction = 0.4;
      careful.g.bot = true;
      careful.g.lives = 99;
      careful.g.seasonIdx = seed % 3;
      careful.place(careful.x - 30, 1);
      careful.until(() => !!careful.g.ride, 1);
      const r = careful.g.ride;
      careful.until(() => !careful.g.ride, 40);
      assert.ok(r.hits <= 1, `${level}, seed ${seed}: ${r.hits} hits`);
      assert.ok(r.shots.length >= 6 && r.shots.length <= 10, r.shots.length + ' shots');

      const idle = setup(level, seed);
      idle.g.lives = 99;
      idle.board();
      const ride = idle.g.ride;
      idle.until(() => !idle.g.ride, 40);
      assert.equal(new Set(ride.shots.map((s) => s.foe.salvo)).size, ride.salvos.length, `${level}, seed ${seed}: every salvo fired`);
      const blinking = (s) => ride.shots.some((h) => h.result === 'hit' && s.at > h.at && s.at - h.at < 1.4 + 1e-6);
      assert.ok(ride.shots.every((s) => s.result === 'hit' || blinking(s)), `${level}, seed ${seed}: an idle chair was hit ${ride.hits} times by ${ride.shots.length} shots`);
      assert.ok(ride.hits >= ride.salvos.length);
    }
  }
});

for (const level of ['summer', 'winter']) {
  test(`after the top station the bear is back just past the lower station, facing on, and the valley hunters hold fire for a moment, ${level}`, () => {
    const { ZS, g, b, x, until, board } = setup(level);
    g.lives = 99;
    const walker = ZS.sim.hunters.create(g, 'walker', { x: x + 330, dir: -1, from: x + 200, to: x + 500 });
    walker.pause = 99; walker.cross = x + 110;
    g.shooters = [walker];
    board();
    assert.ok(until(() => g.ride && g.ride.phase === 'back', 40));
    assert.ok(b.x > x + 80 && b.x < x + 150, 'back at ' + Math.round(b.x - x) + ' px past the station');
    assert.equal(b.dir, 1);
    assert.ok(b.onGround && !b.hiding && !b.climbing);
    assert.ok(until(() => !g.ride, 2));
    const lives = g.lives;
    const calm = g.liftCalm - g.time;
    assert.ok(calm > 1, 'a calm moment of ' + calm.toFixed(2) + ' s');
    for (let i = 0; i < Math.round((calm - 0.05) / DT); i++) ZS.sim.loop.step(g, DT);
    assert.equal(g.lives, lives, 'nobody shot the bear right after it came back');
    assert.equal(walker.lock, 0);
  });
}

test('a bear that walks in from the right comes back on the left side, facing left', () => {
  const { g, b, x, input, until, place } = setup('summer');
  g.lives = 99;
  place(x + 330, -1);
  input.press('ArrowLeft', true);
  assert.ok(until(() => !!g.ride, 3));
  input.release('ArrowLeft');
  assert.ok(until(() => g.ride && g.ride.phase === 'back', 40));
  assert.ok(b.x < x - 80, 'back at ' + Math.round(b.x - x));
  assert.equal(b.dir, -1);
});

test('the valley hunters do not shoot while the bear boards the chair', () => {
  const { ZS, g, x, until, board } = setup('winter');
  const walker = ZS.sim.hunters.create(g, 'walker', { x: x + 260, dir: -1, from: x, to: x + 400 });
  walker.pause = 99; walker.cross = x;
  g.shooters = [walker];
  board();
  walker.lock = 0.5;
  const shots = g.shots.length;
  until(() => g.ride && g.ride.t > 5, 6);
  assert.equal(g.lives, 5 - g.ride.hits);
  assert.equal(walker.lock, 0.5, 'his aim froze while the bear rode');
  assert.equal(g.shots.length, shots);
});

test('pausing during the ride freezes the chair, the shots and the clock', () => {
  const { ZS, g, input, board, telegraph } = setup('summer', 4);
  board();
  telegraph();
  input.press('ArrowRight', true);
  ZS.sim.loop.advance(g, 0.3);
  const r = g.ride, snap = JSON.stringify([g.time, r.t, r.th, r.w, r.shots.map((s) => s.state), g.lives]);
  g.paused = true;
  ZS.sim.loop.advance(g, 4);
  assert.equal(JSON.stringify([g.time, r.t, r.th, r.w, r.shots.map((s) => s.state), g.lives]), snap);
  g.paused = false;
  ZS.sim.loop.advance(g, 0.5);
  assert.ok(r.t > JSON.parse(snap)[1] + 0.4, 'the ride goes on after the pause');
});

test('the last life lost on the chairlift ends the run with the usual hunted ending, or the cull one during the cull', () => {
  for (const [cull, ending] of [[false, 'hunted'], [true, 'cull']]) {
    const { g, until, board } = setup('winter', 6);
    g.lives = 1;
    g.flags.cull = cull;
    board();
    assert.ok(until(() => g.over, 10));
    assert.equal(g.ending, ending);
    assert.equal(g.lives, 0);
    assert.equal(g.ride.hits, 1);
  }
});

test('the year can run out during the ride and ends the level as usual', () => {
  const { g, until, board } = setup('summer');
  g.lives = 99;
  board();
  g.time = g.def.year - 2;
  assert.ok(until(() => g.over, 4));
  assert.equal(g.ending, 'starve');
});

test('the late season sends an army drone after the hunters and the news reports it', () => {
  const { ZS, g, until, board } = setup('summer', 8);
  const said = [];
  ZS.sim.rules.onNews = (item) => said.push(item.text);
  g.time = 250; g.lives = 99;
  board();
  const drone = g.ride.foes.find((f) => f.kind === 'drone');
  assert.ok(drone, 'a drone joins the ride in autumn');
  assert.ok(until(() => !g.ride, 40));
  assert.ok(g.tickerQueue.some((q) => q.text === ZS.NEWS.liftDrone) || said.includes(ZS.NEWS.liftDrone));
});
