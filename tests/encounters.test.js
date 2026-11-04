'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const DT = 1 / 60;

function setup(level = 'summer') {
  const ZS = loadGame({ seed: 5 });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level });
  g.running = true;
  g.nextEvent = 1e9;
  g.dogs = []; g.sheep = []; g.deer = [];
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (each) each(i);
    }
  };
  return {
    ZS, g, b: g.bear, L: g.level, run, CFG: ZS.CFG,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

function openGround(L) {
  for (let x = 1400; x < L.w - 1400; x += 5) {
    const clear = (a, m) => Math.abs(a - x) > m;
    if (L.trees.every((t) => clear(t.x, 200)) && L.logs.every((l) => clear(l.x, 260)) && L.items.every((it) => clear(it.x, 120))
      && L.posts.every((p) => clear(p.x, 700)) && (!L.river || clear((L.river.from + L.river.to) / 2, 600))
      && (!L.salas || x < L.salas.from - 600 || x > L.salas.to + 600)
      && (!L.corn || x < L.corn.from - 300 || x > L.corn.to + 300)
      && (!L.clearing || x < L.clearing.from - 300 || x > L.clearing.to + 300)) return x;
  }
  throw new Error('no open ground in the level');
}

function lonelyHunter(g, x, dir) {
  const s = g.shooters.find((h) => h.kind === 'walker');
  g.shooters = [s];
  g.people = [];
  Object.assign(s, { x, dir, from: x - 400, to: x + 400, pause: 99, cross: x + dir * 300 });
  return s;
}

function lonelyPerson(g, kind, x) {
  const p = g.people.find((h) => h.kind === kind);
  g.people = [p];
  g.shooters = [];
  Object.assign(p, { x, from: x - 400, to: x + 400, pause: 99, filmCd: 99, dir: -1 });
  return p;
}

test('a jump onto a walking hunter knocks him down, his rifle flies away and he gets up and picks it up', async (t) => {
  const { g, b, L, run, hold, press, release, CFG } = setup();
  const x = openGround(L);
  const s = lonelyHunter(g, x, -1);
  s.pause = 0; s.speed = 0;
  b.x = x - 96; b.dir = 1;
  hold('ArrowRight');
  press('Space');
  let bounce = null;
  run(0.75, () => { if (bounce === null && b.stompT !== undefined) bounce = b.vy; });
  release('ArrowRight');

  await t.test('he goes down and the bear bounces off his head', () => {
    assert.equal(s.react, 'down');
    assert.equal(g.stats.stomps, 1);
    assert.ok(bounce < -300, 'bounce velocity ' + bounce);
    assert.equal(s.armed, false);
  });

  const rifle = g.props.find((p) => p.kind === 'rifle');
  await t.test('the rifle lands on the ground away from him', () => {
    assert.ok(rifle, 'a dropped rifle');
    run(1.2);
    assert.ok(rifle.rest, 'it came to rest');
    assert.equal(rifle.y, CFG.GROUND);
    assert.ok(Math.abs(rifle.x - s.x) > 40, 'distance ' + Math.round(Math.abs(rifle.x - s.x)));
  });

  await t.test('while he is down he cannot aim at a bear standing right in front of him', () => {
    b.x = s.x + s.dir * 60; b.dir = -s.dir;
    const lives = g.lives;
    let aimed = 0;
    run(CFG.FALL + CFG.LIE + CFG.RISE - 2, () => { if (s.lock > 0) aimed++; });
    assert.equal(aimed, 0);
    assert.equal(g.lives, lives);
  });

  await t.test('he gets up, walks to the rifle and picks it up', () => {
    b.x = s.x - 900;
    const seen = [s.react];
    run(9, () => { if (seen[seen.length - 1] !== s.react) seen.push(s.react); });
    assert.deepEqual(seen.slice(0, 4), ['down', 'fetch', 'pickup', null]);
    assert.equal(s.armed, true);
    assert.equal(g.props.length, 0, 'the rifle left the ground');
  });
});

test('walking into a hunter or landing short of him does not knock him down', () => {
  const { g, b, L, run, hold, press } = setup();
  const x = openGround(L);
  const s = lonelyHunter(g, x, 1);
  b.x = x - 120; b.dir = 1;
  hold('ArrowRight');
  run(1.2);
  assert.ok(b.x > x + 40, 'the bear walked past him');
  assert.equal(s.react, null);

  b.x = x - 210; b.vx = 0;
  press('Space');
  run(0.9);
  assert.equal(s.react, null);
  assert.equal(g.stats.stomps, 0);
});

test('C next to a mushroom picker hugs her: the video calms the panic, she drops her basket and runs away', async (t) => {
  const { g, b, L, run, press, CFG } = setup();
  const x = openGround(L);
  const p = lonelyPerson(g, 'picker', x);
  b.x = x - 50; b.dir = 1;
  g.panic = 50;
  press('KeyC');
  run(0.2);

  await t.test('she is held in front of the upright bear', () => {
    assert.equal(b.act.kind, 'hug');
    assert.equal(p.react, 'hugged');
    run(0.4);
    assert.ok(Math.abs(p.x - (b.x + 44)) < 4, 'held at ' + Math.round(p.x - b.x));
    assert.equal(g.stats.hugs, 1);
    assert.ok(g.panic < 40, 'panic ' + g.panic.toFixed(1));
    assert.ok(g.props.some((o) => o.kind === 'basket'));
    assert.equal(L.items.filter((it) => it.type === 'mushroom' && it.labelKey === 'basket' && Math.abs(it.x - x) < 80).length, 2);
  });

  await t.test('after the hug she runs away', () => {
    run(CFG.HUG);
    assert.equal(b.act, null);
    assert.equal(p.state, 'flee');
    const x0 = p.x;
    run(1);
    assert.ok(p.x - x0 > 150);
  });
});

test('after the second hug the parliament bans hugging and hugs start to raise the panic', () => {
  const { g, b, L, run, press, ZS } = setup();
  const x = openGround(L);
  const picker = () => {
    const p = ZS.sim.people.create(g, 'picker', { from: x - 400, to: x + 400 });
    Object.assign(p, { x: b.x + 50, pause: 99 });
    g.people = [p]; g.shooters = [];
    return p;
  };
  for (let i = 0; i < 2; i++) {
    b.x = x; b.dir = 1;
    picker();
    press('KeyC');
    run(2);
  }
  assert.equal(g.stats.hugs, 2);
  assert.equal(g.flags.hugBan, false);
  run(8);
  assert.equal(g.flags.hugBan, true);
  picker();
  g.panic = 30;
  press('KeyC');
  run(0.5);
  assert.ok(g.panic > 35, 'panic ' + g.panic.toFixed(1));
});

test('C next to a tourist takes a selfie: the photo goes viral, he walks off with his phone and more tourists come', async (t) => {
  const { g, b, L, run, press, CFG } = setup();
  const x = openGround(L);
  const p = lonelyPerson(g, 'tourist', x);
  b.x = x - 50; b.dir = 1;
  g.panic = 50;
  press('KeyC');
  run(0.5);

  await t.test('he turns the same way as the bear and poses in front of it', () => {
    assert.equal(b.act.kind, 'selfie');
    assert.equal(p.react, 'selfie');
    assert.equal(p.dir, b.dir);
    assert.ok(Math.abs(p.x - (b.x + 40)) < 4, 'stands at ' + Math.round(p.x - b.x));
    assert.equal(g.stats.selfies, 0, 'the photo is taken later');
  });

  await t.test('the photo is taken, the panic drops, the bear gets used to people and a new tourist turns up', () => {
    const tourists = g.people.length, syn = g.syn;
    run(0.9);
    assert.equal(g.stats.selfies, 1);
    assert.equal(g.stats.hugs, 0);
    assert.ok(g.panic < 45, 'panic ' + g.panic.toFixed(1));
    assert.ok(g.syn > syn, 'synanthropy rises');
    assert.equal(g.people.length, tourists + 1);
    assert.ok(!p.empty, 'he keeps his phone');
    assert.equal(g.props.length, 0);
  });

  await t.test('afterwards he walks off calmly looking at the phone', () => {
    run(CFG.SELFIE);
    assert.equal(b.act, null);
    assert.ok(p.texting && p.leaving);
    assert.notEqual(p.state, 'flee');
    const x0 = p.x;
    run(1);
    assert.ok(p.x - x0 > 20 && p.x - x0 < 60, 'walked ' + Math.round(p.x - x0));
  });
});

test('X next to a tourist still bites and C next to a hunter still hugs', () => {
  const { g, b, L, run, press, ZS } = setup();
  const x = openGround(L);
  const p = lonelyPerson(g, 'tourist', x);
  b.x = x - 50; b.dir = 1;
  press('KeyX');
  run(0.3);
  assert.equal(b.act.kind, 'bite');
  assert.equal(g.stats.bites, 1);
  assert.equal(p.react, 'bitten');
  run(1);
  const s = ZS.sim.hunters.create(g, 'walker', { x: x + 900, dir: -1, from: x + 600, to: x + 1200, pause: 99 });
  g.shooters = [s];
  b.x = s.x - 50; b.dir = 1;
  press('KeyC');
  run(0.4);
  assert.equal(b.act.kind, 'hug');
  assert.equal(s.react, 'hugged');
  assert.equal(g.stats.selfies, 0);
});

test('X behind a hunter bites him: he drops the rifle, runs off for good and the bear becomes a problem bear', () => {
  const { g, b, L, run, press, CFG } = setup();
  const x = openGround(L);
  const s = lonelyHunter(g, x, 1);
  b.x = x - 60; b.dir = 1;
  press('KeyX');
  run(0.25);
  assert.equal(s.react, 'bitten');
  assert.equal(g.stats.bites, 1);
  assert.ok(g.syn >= CFG.PROBLEM);
  assert.ok(g.props.some((o) => o.kind === 'rifle'));
  run(0.5);
  assert.equal(s.react, 'gone');
  assert.ok(s.clutch);
  assert.ok(g.problem);
  assert.ok(g.shooters.some((h) => h.kind === 'ztmh'), 'the police team is on its way');
  g.shooters = g.shooters.filter((h) => h.kind !== 'ztmh');
  run(14);
  assert.ok(!g.shooters.includes(s), 'he left');
});

test('with nobody around C does nothing and the bear keeps walking, while X still snaps at the air', () => {
  const { g, b, L, run, press, hold } = setup();
  b.x = openGround(L); b.dir = 1;
  g.shooters = []; g.people = [];
  hold('ArrowRight');
  press('KeyC');
  run(0.05);
  const x0 = b.x;
  assert.ok(!b.act, 'no hug on thin air');
  run(0.5);
  assert.ok(b.x - x0 > 40, 'kept walking');
  assert.equal(g.stats.hugs, 0);
  press('KeyX');
  run(0.05);
  assert.equal(b.act && b.act.kind, 'bite');
  assert.equal(b.act.hit, false);
  run(0.6);
  assert.equal(g.stats.bites, 0, 'a bite on air bites nobody');
});

test('a hunter hugged while picking up his rifle drops it again and still gets it back afterwards', () => {
  const { g, b, L, run, press } = setup();
  const x = openGround(L);
  const s = lonelyHunter(g, x, -1);
  const other = { kind: 'basket', x: x - 300, y: 450, vx: 0, vy: 0, rot: 0, vr: 0, dir: 1, rest: true };
  s.react = 'fetch'; s.armed = false;
  s.rifle = { kind: 'rifle', gun: 'hunt', x: x - 20, y: 450, vx: 0, vy: 0, rot: 0, vr: 0, dir: 1, rest: true };
  g.props.push(other, s.rifle);
  b.x = x - 900;
  let picking = false;
  run(2, () => { if (s.react === 'pickup') picking = true; });
  assert.ok(picking, 'he started picking it up');
  b.x = s.x - 55; b.dir = 1;
  s.react = 'pickup'; s.reactT = 0.1;
  press('KeyC');
  run(0.4);
  assert.equal(s.react, 'hugged');
  assert.ok(g.props.includes(s.rifle), 'the rifle is back on the ground');
  assert.ok(g.props.includes(other), 'other dropped things stay');
  b.x = s.x - 900;
  run(12);
  assert.equal(s.armed, true);
  assert.equal(g.props.length, 1);
  assert.equal(g.props[0], other);
});
