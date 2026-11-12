'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;
const KEYS = ['parkovisko', 'brana', 'sprievod', 'jarmok', 'zakulisie', 'scena', 'tanec', 'noc'];

function setup(seed = 5, opts) {
  const ZS = loadGame(Object.assign({ seed }, opts));
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'vychodna' });
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
  return { ZS, g, b: g.bear, L: g.level, S: g.level.vychodna, input, run, put };
}

const quiet = (g) => { g.shooters = []; g.people = []; g.dogs = []; };

test('Východná runs from the forest under Kriváň over the car park, the village, the craft fair, backstage and the Big Stage to a den in the forest', () => {
  const { ZS, L, S } = setup();
  assert.equal(L.id, 'vychodna');
  assert.equal(L.w, ZS.LEVELS.vychodna.w);
  assert.deepEqual([...L.checkpoints.map((c) => c.key)], KEYS);
  const xs = [...L.checkpoints.map((c) => c.x)];
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'checkpoints in walking order');
  const dance = L.passes.find((p) => p.key === 'tanec');
  assert.ok(dance && dance.from === S.scena.door[0] && dance.to > S.scena.stage[1]);
  assert.ok(L.checkpoints.find((c) => c.key === 'zakulisie').x < dance.from);
  assert.ok(L.checkpoints.find((c) => c.key === 'tanec').x > dance.to);
  for (const [a, z] of [[S.park.from, S.park.to], [S.gate.from, S.gate.to], [S.obec.from, S.obec.to], [S.jarmok.from, S.jarmok.to], [S.back.from, S.back.to], [S.scena.from, S.scena.to], [S.noc.from, S.noc.to]]) assert.ok(a < z);
  for (const it of L.items) assert.ok(ZS.FOOD[it.type] && it.x > 40 && it.x < L.w - 40, it.type);
  for (const t of L.trees) assert.ok(t.x < S.park.from + 20 || t.x > S.end.from - 40 || [S.obec.houses[0] + 130, S.jarmok.from + 40].includes(t.x), 'tree in the festival at ' + Math.round(t.x));
  assert.ok(L.dwarf.length >= 4, 'tents and the toilet to crouch behind');
  assert.equal(L.logs.filter((l) => l.car !== undefined).length, 6, 'three cars bumper to bumper, each a hood and a cabin');
});

const strings = (o) => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [];

test('Východná texts are short: goals of a few words, bubbles and quips one line, news one sentence or two', () => {
  const { ZS } = setup();
  for (const code of ZS.i18n.codes()) {
    const T = ZS.LANGS[code], V = T.LABELS.vychodna;
    for (const goal of strings(V.goals)) {
      assert.ok(goal.length <= 28, code + ' goal: ' + goal);
      if (code === 'sk') assert.ok(goal.split(' ').length <= 5, code + ' goal: ' + goal);
    }
    const { goals, board, signs, ...said } = V;
    const quips = Object.keys(T.QUIPS).filter((k) => k.startsWith('vy')).map((k) => T.QUIPS[k]);
    for (const line of strings([said, T.LABELS.tanec, quips])) assert.ok(line.length <= 30, code + ': ' + line);
    for (const news of strings(T.NEWS.vychodna)) assert.ok(news.length <= 100, code + ' news: ' + news);
  }
});

test('Východná is on the start screen after the Olympics and every new text exists in all four languages', () => {
  const { ZS } = setup();
  for (const code of ZS.i18n.codes()) {
    const T = ZS.LANGS[code];
    assert.ok(T.LEVEL_TEXT.vychodna.blurb.length < 50, code);
    for (const k of Object.keys(T.LEVEL_TEXT.vychodna.seasons)) assert.ok(ZS.LEVELS.vychodna.seasons.some((s) => s.key === k), k);
    for (const key of KEYS) for (const t of [T.NEWS.cp[key], T.LABELS.cp[key], T.UI.resumeAt[key], T.UI.retryAt[key]]) assert.ok(typeof t === 'string' && t.trim(), code + ' ' + key);
    for (const k of Object.keys(ZS.LANGS.sk.LABELS.vychodna.goals)) assert.ok(T.LABELS.vychodna.goals[k], code + ' goal ' + k);
    for (const k of ['rezen', 'medovnik', 'kolac', 'porcia', 'pagac']) assert.ok(T.LABELS.food[k], code + ' food ' + k);
    assert.equal(T.VYCHODNA_HEADLINES.length, ZS.LANGS.sk.VYCHODNA_HEADLINES.length);
    assert.match(T.LABELS.tanec.score(87), /87/);
  }
});

test('the brook pulls under a bear that misses the stones and it swims out on the far bank with some panic, hopping stone to stone gets across dry', () => {
  const { ZS, g, b, L, input, run, put } = setup();
  quiet(g);
  const R = L.river;
  put(R.from + 40);
  b.y = ZS.CFG.GROUND;
  run(0.1);
  assert.ok(g.vychodna.sink, 'goes under');
  run(2);
  assert.ok(!g.vychodna.sink && b.x > R.to, 'out on the far bank at ' + Math.round(b.x));
  assert.ok(g.panic > 0, 'wet bear, some panic');
  assert.equal(g.lives, 5, 'no heart lost, only panic like the backwater in Parliament');
  put(R.from - 30);
  let wet = false;
  run(12, () => {
    const keys = input.state.keys;
    keys.clear();
    if (b.stun > 0) return;
    if (ZS.sim.vychodna.hop(g)) input.press('ArrowUp', false);
    keys.add('ArrowRight');
    if (g.vychodna.sink) wet = true;
    return b.x < R.to + 60;
  });
  input.state.keys.clear();
  assert.ok(!wet, 'dry feet');
  assert.ok(b.x > R.to, 'across at ' + Math.round(b.x));
});

test('the cars stand bumper to bumper, the white SUV howls when the bear lands on it, a steward hangs a performer pass on the bear behind the cars', () => {
  const { ZS, g, b, S, input, run, put } = setup();
  quiet(g);
  const V = ZS.sim.vychodna, J = S.park.jam, GY = ZS.CFG.GROUND;
  put(J[0].x - 160);
  input.press('ArrowRight', true);
  let top = 0;
  run(8, () => { top = Math.max(top, GY - b.y); return b.x < J[1].x; });
  assert.ok(top > J[0].h - 4, 'climbed the sedan');
  run(1);
  assert.equal(g.vychodna.jam.car, 1, 'the SUV alarm');
  assert.ok(g.vychodna.jam.alarm > 0);
  run(10, () => !g.once.naramok);
  input.release('ArrowRight');
  assert.ok(g.once.naramok, 'the steward hung a pass on the bear');
  assert.equal(g.vychodna.promo.phase, 'done');
  assert.ok(b.x > J[2].x && b.x < S.gate.from, 'behind the cars at ' + Math.round(b.x));
  run(0.1);
  assert.ok(b.fest && b.fest.band);
});

test('without a wristband the steward sends the bear back from the gate, with one the bear walks in', () => {
  const { g, b, S, input, run, put } = setup();
  quiet(g);
  run(0.1);
  g.vychodna.promo.phase = 'done';
  put(S.gate.from - 200);
  input.press('ArrowRight', true);
  run(6);
  assert.ok(b.x < S.gate.line, 'stopped at ' + Math.round(b.x));
  assert.equal(g.lives, 5, 'nobody shoots');
  g.once.naramok = true;
  run(4);
  input.release('ArrowRight');
  assert.ok(b.x > S.gate.line + 40, 'inside at ' + Math.round(b.x));
});

test('the procession sets off on its own, walks without stops and gives a feathered hat to a bear that walks along', () => {
  const { ZS, g, b, S, input, run, put } = setup();
  quiet(g);
  g.once.naramok = true;
  const P = ZS.sim.vychodna.PROC;
  put(S.obec.from + 20);
  run(1);
  const p = g.vychodna.proc;
  assert.equal(p.phase, 'walk', 'sets off without waiting for the bear');
  put(p.head + P.slot[0] + 20);
  let stops = 0;
  run(80, () => {
    const slot = ZS.sim.vychodna.member(p).slot;
    if (p.phase === 'stop' || p.phase === 'warn') stops++;
    const keys = input.state.keys;
    keys.clear();
    if (p.phase === 'walk' && b.x < (slot[0] + slot[1]) / 2 - 20) keys.add('ArrowRight');
    return !g.once.klobuk;
  });
  input.state.keys.clear();
  assert.equal(stops, 0, 'no stops');
  assert.ok(g.once.klobuk, 'the hat');
});

test('a bear can overtake the procession, then it walks on to the end of the village and dances there, and the hat is gone', () => {
  const { ZS, g, b, S, input, run, put } = setup();
  quiet(g);
  g.once.naramok = true;
  put(S.obec.from + 20);
  run(1);
  const p = g.vychodna.proc;
  run(30, () => {
    const keys = input.state.keys;
    keys.clear(); keys.add('ArrowRight');
    return b.x < S.jarmok.from;
  });
  input.state.keys.clear();
  assert.ok(b.x >= S.jarmok.from, 'nothing held the bear');
  assert.ok(g.once.predbehol && !g.once.klobuk);
  assert.notEqual(ZS.sim.vychodna.goal(g), 'proc');
  run(60);
  assert.equal(p.phase, 'rest', 'the procession dances on at the end of the village');
  assert.ok(p.head <= S.obec.to, 'it stays in the village');
});

test('the halušky queue is only scenery: the bear walks past the people and can grab a portion at the window', () => {
  const { ZS, g, b, S, input, run, put } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, klobuk: true });
  put(S.jarmok.halusky - 600);
  run(0.2);
  input.press('ArrowRight', true);
  run(8, () => b.x < S.jarmok.halusky + 80);
  input.release('ArrowRight');
  assert.ok(b.x >= S.jarmok.halusky + 80, 'nothing held the bear at ' + Math.round(b.x));
  assert.equal(g.vychodna.shove, 0);
  put(S.jarmok.halusky - ZS.sim.vychodna.QUEUE.window);
  run(0.2);
  assert.ok(ZS.sim.vychodna.atWindow(g));
  const fat = g.fat;
  input.press('KeyC', false);
  run(1);
  assert.ok(g.vychodna.queue.served && g.once.halusky);
  assert.ok(g.fat > fat + 10, 'a big portion');
  assert.notEqual(ZS.sim.vychodna.goal(g), 'queue');
});

test('backstage the costumer dresses a bear that walks past the rack and only a bear in a folk costume gets on the Big Stage', () => {
  const { g, b, S, input, run, put } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, klobuk: true });
  put(S.scena.wall - 40);
  input.press('ArrowRight', true);
  run(3);
  input.release('ArrowRight');
  assert.ok(b.x <= S.scena.wall + 0.5 && !g.pass, 'no stage without a costume');
  put(S.back.rack - 120);
  input.press('ArrowRight', true);
  run(4, () => !g.once.kroj);
  const at = b.x;
  run(0.5);
  assert.ok(b.x > at + 30, 'keeps walking while the costumer dresses it');
  assert.ok(g.once.kroj && b.fest.kroj && b.fest.hat, 'dressed on the way');
  run(8, () => !g.pass);
  input.release('ArrowRight');
  assert.ok(g.pass && g.pass.key === 'tanec', 'into the dance');
});

test('the odzemok judges steps by timing, the sound cuts out in the fast part and the bear ends with a prize and pagáče', () => {
  const { ZS, g, input, run } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, klobuk: true, halusky: true, kroj: true });
  g.bear.x = g.level.vychodna.scena.door[0] + 10;
  run(2.5);
  const T = ZS.sim.tanec;
  const c = g.pass.play;
  assert.equal(c.phase, 'enter');
  let outage = false;
  const fat = g.fat;
  run(70, () => {
    input.state.keys.clear();
    if (c.phase === 'play' && !c.pointa) T.pilot(g, c);
    if (T.outage(c)) outage = true;
    return !!g.pass;
  });
  input.state.keys.clear();
  assert.ok(outage, 'the sound went out');
  assert.equal(g.pass, null);
  assert.ok(g.once.tanec, 'the dance is done');
  assert.equal(g.once.odzemok.grade, 'gold');
  assert.equal(g.once.odzemok.pct, 100);
  assert.ok(g.fat > fat, 'pagáče');
  assert.ok(g.bear.x >= g.level.vychodna.noc.from, 'behind the stage');
});

test('a bear that does not dance loses the faithful mask, gets unmasked once in a while but never fails the level on stage', () => {
  const { ZS, g, input, run } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, klobuk: true, halusky: true, kroj: true });
  g.bear.x = g.level.vychodna.scena.door[0] + 10;
  run(2.5);
  const c = g.pass.play;
  run(70, () => { input.state.keys.clear(); return !!g.pass; });
  assert.ok(c.fails >= 1, 'unmasked');
  assert.ok(g.lives >= 1 && !g.over);
  assert.equal(g.once.odzemok.grade, 'crowd');
  assert.ok(g.once.odzemok.pct < 20);
});

test('pressing the wrong key on a note is a wrong step and a stray press without a note costs a little', () => {
  const { ZS, g, input, run } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, klobuk: true, halusky: true, kroj: true });
  g.bear.x = g.level.vychodna.scena.door[0] + 10;
  run(2.5);
  const T = ZS.sim.tanec, c = g.pass.play;
  run(4);
  const n = c.notes.find((o) => !o.teach && o.sec === 'lively' && o.k !== 'L');
  run(n.t - c.song - 0.03);
  input.press('ArrowLeft', true);
  run(0.1);
  input.release('ArrowLeft');
  assert.equal(n.res, 'wrong');
  assert.ok(c.wrong >= 1);
  assert.ok(T.WIN.good > T.WIN.perfect);
});

test('every C hint in Východná does what it promises, also with people around, and the touch button names it', () => {
  const { ZS, g, b, S, input, run, put } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, klobuk: true, kroj: true });
  const V = ZS.sim.vychodna, A = ZS.UI.touch.acts;
  const cases = [
    ['fish', S.woods.fisher + 26, () => g.vychodna.fishing.angryAt > 0],
    ['order', S.jarmok.halusky - V.QUEUE.window, () => g.once.halusky],
    ['firemen', S.back.firemen, () => g.once.hasici],
    ['radio', S.noc.radio - 62, () => g.once.radio && g.vychodna.radio > 0],
    ['cardas', S.noc.tent[0] + 190, () => g.once.cardas],
  ];
  for (const [key, x, done] of cases) {
    g.once.tanec = x > S.scena.to;
    put(x);
    run(0.3);
    g.people = [{ kind: 'tourist', x: x + 30, y: ZS.CFG.GROUND, dir: -1, react: null, look: 1 }];
    assert.equal(V.cue(g), key, key + ' hint at ' + Math.round(x));
    assert.ok(A[{ fish: 'steal', order: 'order', firemen: 'taste', radio: 'talk', cardas: 'dance' }[key]], key + ' touch label');
    input.press('KeyC', false);
    run(0.2);
    assert.ok(done(), key + ' did what the hint says');
    assert.ok(b.act === null || b.act.kind === 'knock' || (key === 'order' && b.act.kind === 'taste' && b.act.bowl), key + ' no stray hug');
    g.people = [];
    run(2.5);
  }
});

test('dancers hold crossed axes high over the village street: the bear walks under them and the crowd cheers, nothing blocks', () => {
  const { g, b, S, input, run, put } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, predbehol: true });
  const x = S.obec.arches[0];
  put(x - 140);
  g.panic = 10;
  input.press('ArrowRight', true);
  run(2.5);
  input.release('ArrowRight');
  assert.ok(b.x > x + 60, 'walked straight under at ' + Math.round(b.x));
  assert.ok(g.vychodna.arch[0].done, 'the crowd cheered');
  assert.ok(g.panic < 10, 'cheering calms the panic');
});

test('in the tent field a bear walking into the guy ropes wakes the camper who shouts (no knockback), and the toilet hides it from the stewards patrol', () => {
  const { ZS, g, b, S, input, run, put } = setup();
  quiet(g);
  Object.assign(g.once, { naramok: true, kroj: true, klobuk: true, tanec: true });
  const C = ZS.sim.vychodna.CAMP, x = g.level.tents[0];
  put(x - C.rope - 60);
  run(0.2);
  input.press('ArrowRight', true);
  run(1.2);
  input.release('ArrowRight');
  assert.ok(g.vychodna.camp.woke[0], 'the camper woke up');
  assert.ok(b.x > x, 'kept walking');
  const p0 = g.panic;
  assert.ok(p0 > 0);
  g.vychodna.patrol.x = S.noc.wc + 150; g.vychodna.patrol.dir = -1; g.vychodna.patrol.seenAt = -99;
  put(S.noc.wc);
  input.press('ArrowDown', true);
  run(1.5);
  assert.ok(b.covered, 'inside the toilet');
  assert.ok(g.once.vyToi, 'the patrol walked past');
  input.release('ArrowDown');
});

test('a runner holding right, never jumping, never stands still for more than a second outside the dance', () => {
  const { ZS, g, b, input } = setup(4);
  g.shooters = []; g.dogs = [];
  let lastX = b.x, still = 0;
  const stops = [];
  for (let i = 0; i < 60 * 240 && !g.over && b.x < g.level.goalDen - 30; i++) {
    input.state.keys.clear(); input.state.keys.add('ArrowRight');
    ZS.sim.loop.step(g, DT);
    if (g.pass || Math.abs(b.x - lastX) >= 0.5) { if (still > 1) stops.push(Math.round(lastX)); still = 0; } else still += DT;
    lastX = b.x;
  }
  input.state.keys.clear();
  assert.deepEqual(stops, [], 'stood still at ' + stops.join(', '));
  assert.ok(b.x > g.level.goalDen - 60 || g.over, 'neither reached the den area nor got caught, stopped at ' + Math.round(b.x));
});

test('nobody pops in or vanishes in the middle of the screen: queue people and the patrol come and go off screen', () => {
  const ZS = loadGame({ seed: 3 });
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 1280, bot: true, level: 'vychodna' });
  g.running = true;
  const seen = new Map(), bad = [];
  const view = () => [g.cam - 40, g.cam + 1280 + 40];
  for (let i = 0; i < 1500 && !g.over; i++) {
    ZS.sim.loop.advance(g, 0.5);
    g.cam = ZS.sim.loop.cameraX(g);
    const c = g.vychodna;
    if (!c || g.pass) continue;
    const [a, z] = view();
    const now = new Set(c.queue.people);
    for (const p of now) if (!seen.has(p)) { seen.set(p, true); if (i > 0 && p.x > a && p.x < z) bad.push('queue person appeared at ' + Math.round(p.x)); }
    for (const p of seen.keys()) if (!now.has(p) && seen.get(p)) { seen.set(p, false); if (p.x > a && p.x < z) bad.push('queue person vanished at ' + Math.round(p.x)); }
    if (!c.patrol || typeof c.patrol.x !== 'number') bad.push('patrol missing');
  }
  assert.deepEqual(bad, []);
});

test('festival hunters stay out of the village, the fair and the stage', () => {
  const { ZS, g, S, run } = setup();
  const s = ZS.sim.hunters.create(g, 'walker', { x: S.jarmok.from + 300, dir: -1, from: S.jarmok.from, to: S.jarmok.to });
  g.shooters = [s];
  g.people = [];
  run(0.1);
  assert.ok(s.x < S.gate.from - 200 || s.x > S.noc.to + 200, 'moved to ' + Math.round(s.x));
});

test('a checkpoint after the dance keeps the result and the costume stays at the festival', () => {
  const { ZS, g, input } = setup();
  Object.assign(g.once, { naramok: true, klobuk: true, halusky: true, kroj: true, tanec: true, odzemok: { pct: 90, grade: 'gold', miss: 1, fails: 0, best: 20 } });
  g.bear.x = g.level.checkpoints.find((c) => c.key === 'tanec').x;
  const s = JSON.parse(JSON.stringify(ZS.sim.checkpoint.save(g, 'tanec')));
  const h = ZS.sim.checkpoint.resume(s, input.state, {});
  ZS.sim.loop.step(h, DT);
  assert.equal(h.once.odzemok.grade, 'gold');
  assert.ok(!h.bear.fest, 'the costume and the pass stay at the festival after the dance');
  assert.equal(h.vychodna.proc.phase, 'rest');
  assert.ok(h.vychodna.queue.served);
});

test('the careful autopilot wins Východná with a golden dance and a pure runner is never held up but does not win', () => {
  for (const [mode, seed] of [[null, 3], ['runner', 4]]) {
    const ZS = loadGame({ seed });
    ZS.dev.bot.mode = mode;
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 760, bot: true, level: 'vychodna' });
    g.running = true;
    for (let i = 0; i < 1500 && !g.over; i++) ZS.sim.loop.advance(g, 0.5);
    if (mode) { assert.notEqual(g.ending, 'win'); assert.ok(g.bear.x > g.level.vychodna.gate.line, 'runner held up at ' + Math.round(g.bear.x)); }
    else { assert.equal(g.ending, 'win'); assert.equal(g.once.odzemok.grade, 'gold'); }
  }
});

test('a whole Východná run with the dance draws cleanly on desktop and on a phone in portrait', () => {
  for (const [w, h, seed] of [[1280, 720, 6], [390, 844, 7]]) {
    const problems = [];
    const ZS = loadGame({ seed, withRenderer: true, problems });
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, viewH = h / scale;
    const ctx = createCanvas(w * 2, h * 2, problems).getContext('2d');
    ctx.setTransform(2 * scale, 0, 0, 2 * scale, 0, 0);
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW, bot: true, level: 'vychodna' });
    g.running = true; g.viewH = viewH; g.touch = h > w;
    let frames = 0, danced = 0;
    while (!g.over && frames < 900) {
      ZS.sim.loop.advance(g, 0.4);
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, viewW, viewH >= 540 ? (viewH - 540) * 0.45 : viewH - 540);
      if (g.pass) danced++;
      assert.equal(stackDepth(ctx), 0, 'save without restore at frame ' + frames);
      frames++;
    }
    assert.equal(g.ending, 'win');
    assert.ok(danced > 50, 'drew the dance');
    assert.deepEqual(problems.slice(0, 5), []);
  }
});

test('the bear comes to Východná well fed, the festival leads the way and a bear that skips the snacks before the dance still makes it home', () => {
  const ZS = loadGame({ seed: 5 });
  const eat = ZS.sim.rules.eat;
  ZS.sim.rules.eat = function (g) { const f = g.fat; const r = eat.apply(this, arguments); if (!g.once.tanec) g.fat = Math.min(g.fat, f); return r; };
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 760, bot: true, level: 'vychodna' });
  g.running = true;
  assert.equal(g.fat, 60);
  const goals = new Set();
  let danced = null;
  for (let i = 0; i < 3000 && !g.over; i++) {
    ZS.sim.loop.advance(g, 0.25);
    if (!g.once.tanec) goals.add(ZS.sim.vychodna.goal(g));
    if (g.once.tanec && danced === null) danced = g.fat;
  }
  assert.ok(!goals.has('eat'), 'no hunt for food before the dance');
  assert.ok(danced > 50 && danced < g.def.fatGoal, 'fat after the dance ' + danced);
  assert.equal(g.ending, 'win');
});
