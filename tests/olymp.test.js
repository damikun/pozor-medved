'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;

function setup(seed = 5, opts = {}) {
  const ZS = loadGame(Object.assign({ seed }, opts));
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { level: 'olymp', bot: !!opts.bot });
  g.running = true;
  ZS.sim.olymp.init(g);
  const run = (seconds, each) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      if (each && each(i) === false) return;
      ZS.sim.loop.step(g, DT);
    }
  };
  const until = (cond, limit = 120) => { run(limit, () => !cond()); return cond(); };
  return { ZS, g, O: () => g.olymp, c: () => g.olymp.c, L: g.level, input, run, until, hold: (key) => input.press(key, true), release: (key) => input.release(key) };
}

function toSki(t) {
  t.until(() => t.O().phase === 'ski', 10);
}

function skipGates(t, upTo) {
  for (const q of t.L.olymp.slalom.gates) if (q.s < upTo) q.done = true;
}

test('the Olympics in Jasná is the fifth level, new on the start screen, with checkpoints before the jump and the sled run', () => {
  const { ZS, L } = setup();
  assert.equal(L.id, 'olymp');
  assert.ok(L.olymp && L.olymp.slalom && L.olymp.jump && L.olymp.sled);
  assert.equal(JSON.stringify(L.checkpoints.map((c) => [c.key, c.x])), JSON.stringify([['skok', 1000], ['sane', 2000]]));
  assert.ok(L.startDen < 0);
  assert.ok(L.olymp.slalom.gates.length >= 20, 'a giant slalom has many gates');
  assert.ok(L.olymp.slalom.gates.every((q, i, a) => i === 0 || Math.sign(q.u) !== Math.sign(a[i - 1].u)), 'gates alternate left and right');
  for (const code of ZS.i18n.codes()) {
    const T = ZS.LANGS[code];
    assert.ok(T.LEVEL_TEXT.olymp.blurb.length < 50, code);
    for (const key of ['skok', 'sane']) for (const s of [T.NEWS.cp[key], T.LABELS.cp[key], T.UI.resumeAt[key], T.UI.retryAt[key]]) assert.ok(typeof s === 'string' && s.trim(), code + ' ' + key);
    assert.equal(T.OLYMP_HEADLINES.length, ZS.LANGS.sk.OLYMP_HEADLINES.length);
    for (const k of ['gold', 'silver', 'bronze', 'disq', 'gates']) assert.ok(T.ENDINGS.olymp[k].title && T.ENDINGS.olymp[k].text, code + ' ending ' + k);
    assert.ok(T.UI.nextOlymp && T.UI.olympTeaser, code);
  }
});

test('the run starts at the Chopok lookout, counts down and sets off, and a key skips the view', () => {
  const t = setup();
  assert.equal(t.O().stage, 'slalom');
  assert.equal(t.O().phase, 'view');
  t.run(1);
  t.input.state.jumpPressed = true;
  t.run(0.1);
  assert.equal(t.O().phase, 'ready');
  assert.equal(t.c().v, 0, 'standing in the start gate');
  t.run(3.1);
  assert.equal(t.O().phase, 'ski');
  assert.ok(t.c().v > 5, 'pushed off');
});

test('left and right carve smoothly: the skis turn gradually, the bear drifts across the slope and steering costs a little speed', () => {
  const t = setup();
  toSki(t);
  t.run(1.5);
  const s0 = t.c().s, u0 = t.c().u;
  t.hold('ArrowRight');
  t.run(0.05);
  const early = t.c().phi;
  t.run(0.45);
  const later = t.c().phi;
  t.release('ArrowRight');
  assert.ok(early > 0 && early < 0.25, 'the turn starts gently: ' + early);
  assert.ok(later > early * 2, 'and keeps carving: ' + later);
  assert.ok(t.c().u > u0, 'the bear moved right');
  assert.ok(t.c().s > s0, 'and kept going down');
  const phi = t.c().phi;
  t.run(0.6);
  assert.ok(Math.abs(t.c().phi) < Math.abs(phi), 'letting go straightens the skis');
});

test('the analog stick on a phone steers in proportion to how far it is pushed', () => {
  const a = setup(), b = setup();
  toSki(a); toSki(b);
  a.run(1); b.run(1);
  a.input.state.stickOn = true; a.input.state.stickX = 0.3;
  b.input.state.stickOn = true; b.input.state.stickX = 0.8;
  a.run(0.6); b.run(0.6);
  assert.ok(a.c().phi > 0.05 && b.c().phi > a.c().phi * 1.6, a.c().phi + ' vs ' + b.c().phi);
});

test('passing between the poles counts the gate, a missed gate adds three seconds, and too many missed gates disqualify', () => {
  const t = setup();
  toSki(t);
  const G = t.L.olymp.slalom.gates;
  t.c().u = G[0].u;
  t.c().phi = 0;
  t.until(() => G[0].done, 20);
  assert.equal(G[0].hit, true);
  assert.equal(t.c().passed, 1);
  t.c().u = -G[1].u;
  t.until(() => G[1].done, 20);
  assert.equal(G[1].missed, true);
  assert.equal(t.c().pen, 3);
  for (let i = 2; i < 7 && !t.g.over; i++) {
    t.run(0.01, () => { t.c().u = -G[i].u; t.c().phi = 0; });
    t.until(() => { t.c().u = -G[i].u; t.c().phi = 0; return G[i].done || t.g.over; }, 20);
  }
  assert.equal(t.g.over, true);
  assert.equal(t.g.ending, 'gates');
});

test('a soft touch of the safety net only slows the bear, a hard crash into it costs a heart', () => {
  const t = setup();
  toSki(t);
  t.run(3);
  const C2 = t.L.olymp.slalom, lives = t.g.lives;
  Object.assign(t.c(), { u: C2.half - 0.5, phi: 0.12 });
  t.run(0.2);
  assert.equal(t.g.lives, lives, 'a soft touch');
  t.run(1);
  Object.assign(t.c(), { u: C2.half - 3, phi: 0.95, v: 22 });
  t.run(0.4);
  assert.equal(t.g.lives, lives - 1, 'a hard crash');
  assert.ok(t.c().fall > 0, 'the bear tumbles');
});

test('the ski school crosses the course in a line: running into the kids costs a heart, going around them does not', () => {
  const t = setup();
  toSki(t);
  const S = t.L.olymp.slalom.school;
  skipGates(t, S.s + 30);
  t.c().s = S.s - 120; t.c().u = 0; t.c().v = 20;
  t.run(0.1);
  assert.ok(t.c().schoolT !== undefined, 'the instructor whistles and the line sets off');
  t.until(() => t.c().s > S.s - 3, 20);
  const k = t.ZS.sim.olymp.school(t.L.olymp.slalom, t.c().schoolT);
  const lives = t.g.lives;
  t.c().u = (k.head + k.tail) / 2; t.c().phi = 0;
  t.run(0.4);
  assert.equal(t.g.lives, lives - 1);
  const u = setup();
  toSki(u);
  skipGates(u, S.s + 30);
  u.c().s = S.s - 120; u.c().u = 0; u.c().v = 20;
  u.until(() => u.c().s > S.s - 3, 20);
  const k2 = u.ZS.sim.olymp.school(u.L.olymp.slalom, u.c().schoolT);
  const lives2 = u.g.lives;
  u.c().u = k2.head + 4; u.c().phi = 0;
  u.run(0.4);
  assert.equal(u.g.lives, lives2);
});

function toJump(seed) {
  const t = setup(seed);
  t.g.bear.x = 1000;
  t.g.olymp = null;
  t.ZS.sim.olymp.init(t.g);
  t.g.olymp.fade = 0;
  return t;
}

test('on the kicker a pop right at the lip flies higher and longer than rolling off without one', () => {
  const a = toJump(), b = toJump();
  const J = a.L.olymp.jump;
  for (const t of [a, b]) t.until(() => t.O().phase === 'in', 5);
  a.until(() => J.lip - a.c().s < 1.5, 30);
  a.input.state.jumpPressed = true;
  a.until(() => a.O().phase === 'out', 15);
  b.until(() => b.O().phase === 'out', 30);
  assert.ok(a.c().q > 0.9, 'a perfect pop');
  assert.equal(b.c().q, 0);
  const ra = a.g.once.olymp.jump, rb = b.g.once.olymp.jump;
  assert.ok(ra.height > rb.height + 1.5, ra.height + ' vs ' + rb.height);
  assert.equal(ra.land, 'sweet');
});

test('a bear that does nothing in the air still makes a backflip at the end and lands it, and the judges always give Poland 9.8 and Slovakia 10', () => {
  const t = toJump();
  t.until(() => t.O().phase === 'in', 5);
  t.until(() => t.O().phase === 'out', 30);
  const r = t.g.once.olymp.jump;
  assert.equal(r.auto, true, 'the automatic backflip');
  assert.notEqual(r.land, 'crash');
  assert.ok(Math.abs(t.c().flip + Math.PI * 2) < 0.2 || Math.abs(t.c().flip) < 0.2, 'a full turn');
  assert.equal(JSON.stringify(r.marks.filter((m) => m.nat === 'POL' || m.nat === 'SVK').map((m) => m.v)), '[9.8,10]');
  t.until(() => t.O().phase === 'judges', 20);
  assert.equal(t.O().phase, 'judges');
});

test('tricks chain in the air from keys, and a flip still turning at the landing is a crash that costs a heart', () => {
  const t = toJump();
  const J = t.L.olymp.jump;
  t.until(() => t.O().phase === 'in', 5);
  t.until(() => J.lip - t.c().s < 1.5, 30);
  t.input.state.jumpPressed = true;
  t.until(() => t.O().phase === 'air', 5);
  t.run(0.1);
  t.input.state.hugPressed = true;
  t.run(0.05);
  t.hold('ArrowRight'); t.run(0.05); t.release('ArrowRight');
  t.until(() => t.O().phase === 'out', 10);
  const r = t.g.once.olymp.jump;
  assert.ok(r.name.includes(t.ZS.LABELS.olymp.trick.grab) && r.name.includes(t.ZS.LABELS.olymp.trick.spinR), r.name);
  const u = toJump();
  u.until(() => u.O().phase === 'air', 40);
  const lives = u.g.lives;
  u.run(0.6);
  u.until(() => { if (u.ZS.sim.olymp.flightLeft(J, u.c()) < 0.4 && !u.c().late) { u.c().late = true; u.hold('ArrowDown'); } return u.O().phase !== 'air'; }, 10);
  u.release('ArrowDown');
  assert.equal(u.g.once.olymp.jump.land, 'crash');
  assert.equal(u.g.lives, lives - 1);
});

function toSled(seed) {
  const t = setup(seed);
  t.g.bear.x = 2000;
  t.g.olymp = null;
  t.ZS.sim.olymp.init(t.g);
  t.g.olymp.fade = 0;
  t.until(() => t.O().phase === 'run', 5);
  return t;
}

test('the icy chute is empty inside, the sled swings up the outer wall in banked turns, and leaning the wrong way throws the bear out', () => {
  assert.equal(setup().L.olymp.sled.things.length, 0);
  const t = toSled();
  const S = t.L.olymp.sled;
  let high = 0;
  t.until(() => { high = Math.max(high, Math.abs(t.c().a)); return t.c().s > 300; }, 40);
  assert.ok(high > 0.35, 'the bank pushes the sled up the wall: ' + high);
  const u = toSled();
  const lives = u.g.lives;
  const turn = S.T.S.find((p) => p.s > 160 && Math.abs(p.k) > 0.008);
  const out = turn.k > 0 ? 'ArrowLeft' : 'ArrowRight';
  u.until(() => u.c().s > turn.s - 40, 20);
  u.c().v = 26;
  u.hold('ArrowDown'); u.hold(out);
  u.until(() => u.g.lives < lives, 6);
  u.release(out); u.release('ArrowDown');
  assert.equal(u.g.lives, lives - 1);
  assert.ok(u.c().flies >= 1);
});

test('the sled run ends in the après-ski bar, then the podium and the doping control by a hunter, and the run is won with a medal', () => {
  const t = toSled();
  t.until(() => t.O().phase === 'bar' || t.g.over, 120);
  assert.equal(t.O().phase, 'bar');
  assert.ok(t.g.once.olymp.sled.time > 20);
  t.until(() => t.O().phase === 'podium', 10);
  assert.ok(['gold', 'silver', 'bronze'].includes(t.g.medal));
  t.until(() => t.O().phase === 'doping', 12);
  t.until(() => t.g.over, 10);
  assert.equal(t.g.ending, 'win');
});

test('both checkpoints survive packing and resume in the right discipline with the earlier results kept', () => {
  const { ZS, g } = setup();
  const CP = ZS.sim.checkpoint;
  g.once.olymp.slalom = { time: 64.2, pen: 3, total: 67.2, rank: 3, pts: 85, missed: 1, crashes: 0, record: false };
  for (const [key, x, stage] of [['skok', 1000, 'skok'], ['sane', 2000, 'sane']]) {
    g.bear.x = x;
    const s = CP.unpack(CP.pack(Object.assign(CP.save(g, key), { tally: {} })));
    assert.ok(s, key);
    const r = CP.resume(s, ZS.ui.input.state, {});
    ZS.sim.loop.step(r, DT);
    assert.equal(r.olymp.stage, stage, key);
    assert.equal(r.once.olymp.slalom.pts, 85);
    assert.ok(r.lives >= 3);
  }
});

test('a careful autopilot skis, jumps and sleds to a medal, and a pure runner is disqualified', () => {
  for (const [mode, seed] of [['careful', 3], ['runner', 6]]) {
    const ZS = loadGame({ seed });
    const g = ZS.sim.rules.create(ZS.ui.input.state, { level: 'olymp', bot: true });
    g.running = true;
    ZS.dev.bot.mode = mode;
    ZS.dev.bot.reaction = 0.35;
    ZS.sim.loop.advance(g, 400);
    assert.ok(g.over, mode + ' run ended');
    assert.equal(g.ending === 'win', mode === 'careful', mode + ': ' + g.ending);
    if (mode === 'careful') {
      const R = g.once.olymp;
      assert.equal(R.slalom.missed, 0);
      assert.equal(R.jump.land, 'sweet');
      assert.equal(g.lives, ZS.CFG.LIVES, 'not a scratch');
      assert.equal(g.medal, 'gold');
    }
  }
});

function viewport(width, height, touch) {
  let band = touch && width > height ? Math.min(64, height * 0.15) : 0;
  let scale = Math.min((height - band) / 540, width / (height > width ? 480 : 760));
  if (band && width / scale > 1000) { band = 0; scale = Math.min(height / 420, width / 1000); }
  const viewH = (height - band) / scale;
  return { scale, viewW: width / scale, viewH, offY: viewH >= 540 ? (viewH - 540) * 0.45 : viewH - 540 };
}

for (const [name, w, h, touch] of [['landscape 1280x720', 1280, 720, false], ['portrait 390x844', 390, 844, true], ['phone landscape 844x390', 844, 390, true]]) {
  test(`the whole Olympics draws cleanly frame by frame, ${name}`, () => {
    const problems = [];
    const ZS = loadGame({ seed: 4, withRenderer: true, problems });
    const v = viewport(w, h, touch);
    const ctx = createCanvas(w, h, problems).getContext('2d');
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: v.viewW, bot: true, level: 'olymp' });
    g.running = true; g.viewH = v.viewH; g.touch = touch;
    const phases = new Set();
    let frames = 0;
    while (!g.over && frames < 1400) {
      ZS.sim.loop.advance(g, 0.25);
      ZS.draw(g, ctx, v.viewW, v.offY);
      phases.add(g.olymp.stage + ':' + g.olymp.phase);
      assert.equal(stackDepth(ctx), 0, 'save() without restore() after frame ' + frames);
      frames++;
    }
    assert.equal(g.ending, 'win');
    for (const p of ['slalom:view', 'slalom:ski', 'slalom:stop', 'skok:air', 'skok:judges', 'sane:run', 'sane:bar', 'sane:podium', 'sane:doping']) assert.ok(phases.has(p), 'never drew ' + p);
    assert.deepEqual(problems.slice(0, 5), [], problems.length + ' bad canvas calls');
  });
}

test('the Olympics sound like a race: wind, ski edges, cowbells, the crowd and the anthem, without changing the run', async () => {
  const log = { sources: 0 };
  const param = (value) => ({ value, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = (extra) => Object.assign({ connect() {}, disconnect() {} }, extra);
  const source = (extra) => { log.sources++; return node(Object.assign({ start() {}, stop() {} }, extra)); };
  class Ctx {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 4000; this.destination = node(); log.ctx = this; }
    createGain() { return node({ gain: param(1) }); }
    createOscillator() { return source({ type: 'sine', frequency: param(440), detune: param(0) }); }
    createBufferSource() { return source({ buffer: null, loop: false, playbackRate: param(1) }); }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(350), Q: param(1) }); }
    createDynamicsCompressor() { return node({ threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) }); }
    createStereoPanner() { return node({ pan: param(0) }); }
    createConvolver() { return node({ buffer: null }); }
    decodeAudioData(data, ok) { const b = { duration: 0.5 }; return Promise.resolve().then(() => { ok(b); return b; }); }
    createBuffer(channels, length, rate) { const data = new Float32Array(length); return { duration: length / rate, getChannelData: () => data }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  const atob = (text) => Buffer.from(text, 'base64').toString('latin1');
  const ZS = loadGame({ seed: 3, withAudio: true, globals: { AudioContext: Ctx, setTimeout: () => 0, clearTimeout: () => {}, atob } });
  const { rules, loop } = ZS.sim, audio = ZS.audio;
  rules.onSound = audio.event;
  audio.unlock();
  await new Promise((done) => setImmediate(done));
  ZS.dev.bot.reaction = 0.35;
  const g = rules.create(ZS.ui.input.state, { level: 'olymp', bot: true });
  g.running = true;
  audio.frame(g, DT);
  for (let i = 0; i < 400 * 60 && !g.over; i++) { audio.frame(g, DT); loop.step(g, DT); log.ctx.currentTime = g.time; }
  assert.equal(g.ending, 'win');
  for (const name of ['ski.swish', 'whoosh', 'impact.wood', 'chat.walla', 'note.f5', 'note.gs4', 'fall.body', 'step.snow', 'camera']) assert.ok(audio.played[name] > 0, name + ' never played: ' + Object.keys(audio.played).join(', '));
  assert.ok(audio.voices() <= 24);
});

test('Space hops the skier over the fallen tourist', () => {
  const t = setup();
  toSki(t);
  const C2 = t.L.olymp.slalom, F = C2.fallen;
  skipGates(t, F.s + 20);
  t.c().s = F.s - 30; t.c().u = F.u; t.c().phi = 0; t.c().v = 18;
  const lives = t.g.lives;
  t.until(() => F.s - t.c().s < 4.5, 5);
  t.input.state.jumpPressed = true;
  t.run(0.05);
  assert.ok(t.c().hy > 0, 'in the air');
  t.until(() => t.c().s > F.s + 2, 3);
  assert.equal(t.g.lives, lives, 'the hop cleared the tourist');
  t.until(() => !(t.c().hy > 0), 2);
  assert.equal(t.c().hy, 0, 'landed');
});

test('the up arrow at the start pushes off with the poles at once, faster than waiting for the countdown', () => {
  const wait = setup();
  wait.run(0.5);
  wait.input.state.jumpPressed = true;
  wait.until(() => wait.O().phase === 'ski', 10);
  const waited = wait.g.time;
  const t = setup();
  t.run(0.5);
  t.hold('ArrowUp');
  t.run(DT * 2);
  assert.equal(t.O().phase, 'ski', 'up skips the countdown');
  assert.ok(t.g.time < waited - 1.5, 'the race starts sooner');
  assert.ok(t.c().v > 6.5 + 1.5, 'the first push is faster than the slope alone');
  assert.ok(t.c().pole > 0, 'the push is animated');
  t.run(1.2);
  assert.ok(t.c().pushes >= 2, 'holding up keeps pushing');
  t.release('ArrowUp');
});

test('a slowed bear gets going again with pole pushes, but at full speed the poles add nothing', () => {
  const t = setup();
  toSki(t);
  t.c().v = 1;
  t.c().phi = 0;
  const slow = setup();
  toSki(slow);
  slow.c().v = 1;
  slow.c().phi = 0;
  t.hold('ArrowUp');
  t.run(1.5);
  slow.run(1.5);
  assert.ok(t.c().v > slow.c().v + 3, 'pushing gets the bear up to speed');
  assert.ok(t.c().pushes >= 3);
  t.c().v = t.ZS.sim.olymp.POLE.max + 4;
  const n = t.c().pushes;
  t.run(0.6);
  assert.equal(t.c().pushes, n, 'no pushes at full speed');
  t.hold('ArrowDown');
  t.c().v = 3;
  t.run(0.6);
  assert.equal(t.c().pushes, n, 'no pushes in a tuck');
  t.release('ArrowUp');
  t.release('ArrowDown');
});

function onRamp(t, kind, v) {
  toSki(t);
  const C = t.L.olymp.slalom, r = C.ramps.find((x) => x.kind === kind);
  skipGates(t, r.s + 60);
  Object.assign(t.c(), { s: r.s - r.len - 4, u: r.u, phi: 0, steer: 0, v });
  return { C, r };
}

test('a snow kicker in front of the groomer launches a fast bear right over it for a time bonus and a cheer', () => {
  const t = setup();
  const { C, r } = onRamp(t, 'big', 20);
  assert.ok(Math.abs(C.ratrak.u - r.u) < 1 && C.ratrak.s - C.ratrak.d / 2 > r.s, 'the groomer stands right behind the kicker');
  let top = 0, over = 0;
  t.run(2.5, () => { const c = t.c(); top = Math.max(top, c.hy); if (Math.abs(c.s - C.ratrak.s) < C.ratrak.d / 2) over = Math.min(over || 99, c.hy); });
  assert.ok(top > C.ratrak.h + 0.5, 'real air');
  assert.ok(over > C.ratrak.h, 'clear of the groomer roof');
  assert.equal(t.g.lives, 5);
  assert.equal(t.c().fall <= 0, true);
  assert.equal(t.c().bonus, t.ZS.sim.olymp.RAMP.big.bonus);
  assert.equal(t.c().jumps, 1);
  assert.ok(t.O().cheer > 0, 'the crowd cheers');
  assert.ok(!t.g.over);
});

test('too slow over the kicker hits the groomer: a heart lost, a short tumble, then the run goes on', () => {
  const t = setup();
  const { C } = onRamp(t, 'big', 10);
  t.run(1.6);
  assert.equal(t.g.lives, 4, 'one heart');
  assert.equal(t.c().bonus, 0, 'no bonus for a crash');
  assert.ok(!t.g.over, 'the run is not over');
  t.run(2.5);
  assert.ok(t.c().fall <= 0, 'back on the skis');
  const s = t.c().s;
  t.run(1);
  assert.ok(t.c().s > s + 3, 'skiing on');
  assert.ok(Math.abs(t.c().u - C.ratrak.u) > C.ratrak.w / 2 || t.c().s > C.ratrak.s + C.ratrak.d / 2, 'not stuck inside the groomer');
});

test('going around the groomer is safe, and the small rollers give a little air and a small bonus', () => {
  const t = setup();
  const { C } = onRamp(t, 'big', 18);
  t.c().u = C.ratrak.u - C.ratrak.w / 2 - 2.5;
  t.run(1.5);
  assert.equal(t.g.lives, 5);
  assert.equal(t.c().bonus, 0);
  const r2 = setup();
  onRamp(r2, 'roll', 18);
  let top = 0;
  r2.run(1.5, () => { top = Math.max(top, r2.c().hy); });
  assert.ok(top > 0.8, 'a little air');
  assert.equal(r2.c().bonus, r2.ZS.sim.olymp.RAMP.roll.bonus);
  assert.equal(r2.g.lives, 5);
});

test('bear fans cheer along the slalom, the jump and the sled run and on the podium, away from the gates', () => {
  const t = setup();
  const L = t.L.olymp;
  for (const list of [L.slalom.bears, L.jump.bears, L.sled.bears]) assert.ok(list.length >= 3);
  for (const gr of L.slalom.bears) if (gr.s < L.slalom.finish) assert.ok(Math.abs(gr.u) > L.slalom.half, 'fans stand behind the net');
  for (const q of L.slalom.gates) for (const gr of L.slalom.bears) if (Math.abs(gr.s - q.s) < 25) assert.ok(Math.abs(gr.u - q.u) > 12, 'fans never block a gate');
  const problems = [];
  const ZS = loadGame({ seed: 4, withRenderer: true, problems });
  const ctx = createCanvas(1280, 720, problems).getContext('2d');
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 1280, bot: true, level: 'olymp' });
  g.running = true; g.viewH = 720;
  const seen = {}, F = ZS.olympFig, orig = F.bears;
  let mood = { hype: 0, gasp: 0 };
  F.bears = function (cx, x, y, s, gr, time, hype, gasp) {
    const k = g.olymp.stage + ':' + g.olymp.phase;
    seen[k] = (seen[k] || 0) + 1;
    mood = { hype: Math.max(mood.hype, hype), gasp: Math.max(mood.gasp, gasp) };
    return orig.apply(this, arguments);
  };
  let frames = 0;
  while (!g.over && frames < 1400) { ZS.sim.loop.advance(g, 0.25); ZS.draw(g, ctx, 1280, 0); frames++; }
  F.bears = orig;
  const stages = Object.keys(seen).map((k) => k.split(':')[0]);
  for (const st of ['slalom', 'skok', 'sane']) assert.ok(stages.includes(st), 'bear fans in ' + st);
  assert.ok(seen['sane:podium'] > 0, 'bear fans at the podium');
  assert.ok(mood.hype > 0.9, 'they get excited');
  assert.deepEqual(problems.slice(0, 5), []);
  const c = setup();
  toSki(c);
  c.c().u = c.L.olymp.slalom.half + 5; c.c().phi = 1.2; c.c().v = 20;
  c.run(0.5);
  assert.ok(c.O().gasp > 0.5, 'a crash makes the fans grab their heads');
});
