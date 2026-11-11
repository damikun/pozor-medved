'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadGame } = require('./helpers/load-game');
const runs = require('./fixtures/bot-runs.json');

const VIEW_W = 480, STEP = 1 / 60;
const round = (value, digits) => Number(value.toFixed(digits));

function param(value) {
  return { value, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} };
}

function fakeAudio(log) {
  const node = (extra) => Object.assign({ connect() {}, disconnect() {} }, extra);
  const source = (extra) => { log.sources++; return node(Object.assign({ start() {}, stop() {} }, extra)); };
  return class {
    constructor() {
      this.state = 'running'; this.currentTime = 0; this.sampleRate = 4000; this.destination = node();
      log.ctx = this;
    }
    createGain() { return node({ gain: param(1) }); }
    createOscillator() { return source({ type: 'sine', frequency: param(440), detune: param(0) }); }
    createBufferSource() { return source({ buffer: null, loop: false, playbackRate: param(1) }); }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(350), Q: param(1) }); }
    createDynamicsCompressor() { return node({ threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) }); }
    createStereoPanner() { return node({ pan: param(0) }); }
    createConvolver() { return node({ buffer: null }); }
    createWaveShaper() { return node({ curve: null }); }
    decodeAudioData(data, ok) { log.decoded++; const b = { duration: 0.5 }; return Promise.resolve().then(() => { ok(b); return b; }); }
    createBuffer(channels, length, rate) { const data = new Float32Array(length); return { duration: length / rate, getChannelData: () => data }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  };
}

async function play({ seed, reaction, mode, level }, how) {
  const log = { sources: 0, decoded: 0, ctx: null };
  const atob = (text) => Buffer.from(text, 'base64').toString('latin1');
  const globals = how === 'fake' ? { AudioContext: fakeAudio(log), setTimeout: () => 0, clearTimeout: () => {}, atob } : {};
  const ZS = loadGame({ seed, withAudio: how !== 'none', globals });
  const { rules, loop } = ZS.sim;
  const audio = ZS.audio;
  if (audio) { rules.onSound = audio.event; audio.unlock(); await new Promise((done) => setImmediate(done)); }
  Object.assign(ZS.dev.bot, { reaction, mode });
  const g = rules.create(ZS.ui.input.state, { viewW: VIEW_W, bot: true, level });
  g.running = true;
  rules.say(g, level === 'winter' ? ZS.NEWS.winterStart : ZS.NEWS.springStart);
  for (let i = 0; i < 1500 && !g.over; i++) {
    for (let t = 0; t < 0.5 && g.running && !g.over && !g.paused; t += STEP) {
      loop.step(g, STEP);
      g.cam = loop.cameraX(g);
      if (audio) audio.frame(g, STEP);
      if (log.ctx) log.ctx.currentTime = g.time;
    }
  }
  if (audio && g.over) audio.end(g.ending);
  return {
    audio, log,
    summary: {
      ending: g.ending,
      time: round(g.time, 4), fat: round(g.fat, 4), lives: g.lives, x: round(g.bear.x, 3),
      syn: round(g.syn, 4), panic: round(g.panic, 4),
      stats: { ...g.stats },
      flags: Object.keys(g.flags).filter((k) => g.flags[k]),
      events: [...g.usedEvents],
      eaten: g.level.items.filter((it) => it.eaten).length,
    },
  };
}

const picked = [runs[0], runs[5], runs[9], runs[11]];

for (const run of picked) {
  test(`sound changes nothing in the ${run.level} run with seed ${run.seed}`, async () => {
    const plain = await play(run, 'none');
    const silent = await play(run, 'silent');
    const loud = await play(run, 'fake');
    assert.deepEqual(plain.summary, run.expected);
    assert.deepEqual(silent.summary, plain.summary);
    assert.deepEqual(loud.summary, plain.summary);
  });
}

test('without an AudioContext the sound module stays quiet and never throws', async () => {
  const { audio, summary } = await play(runs[0], 'silent');
  assert.equal(summary.ending, runs[0].expected.ending);
  assert.equal(audio.live(), false);
  assert.equal(audio.count, 0);
  assert.equal(audio.voices(), 0);
  assert.doesNotThrow(() => { audio.news(); audio.click(); audio.pause(true); audio.pause(false); audio.toggle(); audio.toggle(); });
});

test('with an AudioContext the game events turn into recorded sounds', async () => {
  const { audio, log } = await play(runs[9], 'fake');
  assert.equal(audio.live(), true);
  assert.ok(log.decoded > 50, 'only ' + log.decoded + ' recordings decoded');
  assert.ok(audio.count > 100, 'only ' + audio.count + ' sounds');
  for (const name of ['step.snow', 'cloth', 'bear.huff', 'eat.crunch', 'shot', 'impact.wood', 'hide.leaves', 'camera', 'impact.body', 'crash.wood', 'creak', 'gun.cock', 'pylon', 'note.gs4']) assert.ok(audio.played[name] > 0, name + ' never played: ' + Object.keys(audio.played).join(', '));
  const chat = ['chat.adults', 'chat.hikers', 'chat.kids'].reduce((n, k) => n + (audio.played[k] || 0), 0);
  assert.ok(chat > 0, 'nobody chatted');
  assert.ok(log.sources > audio.count);
  assert.ok(audio.voices() <= 24);
});

test('the recorded sounds are base64 MP3 clips or loops with a loop length', () => {
  const box = { window: {} };
  box.window = box;
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'sounds.js'), 'utf8'), box);
  const sounds = box.ZS.SOUNDS, names = Object.keys(sounds);
  assert.ok(names.length > 0);
  let size = 0;
  for (const name of names) {
    for (const item of [].concat(sounds[name])) {
      const data = typeof item === 'string' ? item : item.data;
      assert.match(data, /^[A-Za-z0-9+/]+=*$/, name);
      const head = Buffer.from(data.slice(0, 8), 'base64');
      assert.ok(head[0] === 0xff || head.toString('latin1', 0, 3) === 'ID3', name + ' is not MP3');
      if (typeof item !== 'string') assert.ok(item.loop > 1 && item.start >= 0, name);
      size += data.length;
    }
  }
  assert.ok(size < 2900000, 'sounds take ' + size + ' bytes');
});

test('every sound effect has its own name, so a level never replaces another one', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'audio.js'), 'utf8');
  const from = src.indexOf('const SFX = {'), to = src.indexOf('\n  };', from);
  const names = [...src.slice(from, to).matchAll(/^    (\w+)[(,]/gm)].map(m => m[1]);
  assert.ok(names.includes('jump') && names.includes('land'));
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
});
