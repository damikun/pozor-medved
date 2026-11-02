'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const STEP = 1 / 30;

function fakeAudio(log) {
  const param = (value) => ({ value, last: null, setValueAtTime(v) { this.last = v; }, linearRampToValueAtTime(v) { this.last = v; }, exponentialRampToValueAtTime(v) { this.last = v; }, setTargetAtTime(v) { this.last = v; }, cancelScheduledValues() {} });
  const node = (extra) => Object.assign({ to: [], connect(n) { this.to.push(n); return n; }, disconnect() {} }, extra);
  const source = (extra) => { const s = node(Object.assign({ start() {}, stop() {} }, extra)); log.sources.push(s); return s; };
  return class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 4000; this.destination = node(); log.ctx = this; }
    createGain() { return node({ gain: param(1) }); }
    createOscillator() { return source({ frequency: param(440), detune: param(0) }); }
    createBufferSource() { return source({ buffer: null, loop: false, playbackRate: param(1) }); }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(350), Q: param(1) }); }
    createDynamicsCompressor() { return node({ threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) }); }
    createStereoPanner() { return node({ pan: param(0) }); }
    createConvolver() { return node({ buffer: null }); }
    decodeAudioData(data, ok) {
      const b = { duration: 0.5, name: log.names.get(Buffer.from(data).toString('base64')) };
      return Promise.resolve().then(() => { ok(b); return b; });
    }
    createBuffer(channels, length, rate) { const data = new Float32Array(length); return { duration: length / rate, getChannelData: () => data }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  };
}

async function setup(level) {
  const log = { sources: [], ctx: null, names: new Map() };
  const atob = (text) => Buffer.from(text, 'base64').toString('latin1');
  const ZS = loadGame({ seed: 3, withAudio: true, globals: { AudioContext: fakeAudio(log), setTimeout: () => 0, clearTimeout: () => {}, atob } });
  for (const [name, list] of Object.entries(ZS.SOUNDS)) for (const item of [].concat(list)) log.names.set(typeof item === 'string' ? item : item.data, name);
  const audio = ZS.audio;
  audio.unlock();
  await new Promise((done) => setImmediate(done));
  const g = ZS.sim.rules.create(ZS.ui.input.state, { viewW: 480, level });
  g.running = true;
  const at = (x, seconds) => {
    g.bear.x = x;
    for (let t = 0; t < seconds; t += STEP) {
      g.time += STEP;
      g.cam = g.bear.x - g.viewW / 2;
      audio.frame(g, STEP);
      log.ctx.currentTime = g.time;
    }
  };
  const bed = (name) => {
    const s = log.sources.find((o) => o.loop && o.buffer && o.buffer.name === name);
    if (!s) return 0;
    const v = s.to[0].gain;
    return v.last === null ? v.value : v.last;
  };
  return { ZS, g, audio, at, bed, log };
}

test('the high Tatras swap the forest bed for wind over the ridge and answer their animals', async () => {
  const { g, audio, at, bed } = await setup('summer');
  const A = g.level.alpine;
  assert.ok(A && A.to > A.from);
  at(A.from - 900, 4);
  assert.ok(bed('loop.forest') > 0.005, 'no forest below the treeline');
  assert.equal(bed('loop.alpine'), 0);
  at(A.from + 700, 4);
  assert.ok(bed('loop.alpine') > 0.01, 'no mountain wind on the ridge');
  assert.ok(bed('loop.forest') < 0.0005, 'the forest still sings on the ridge');
  const x = g.bear.x + 120;
  for (const [name, extra] of [['marmot'], ['marmot', 'short'], ['chamois'], ['scree'], ['scree', 0.4], ['hut']]) {
    audio.event(g, name, x, extra);
    at(g.bear.x, 0.3);
  }
  for (const name of ['marmot', 'marmot.one', 'chamois', 'scree']) assert.ok(audio.played[name] > 0, name + ' never played');
  assert.ok(['chat.walla', 'chat.mumble'].some((n) => audio.played[n] > 0), 'the hut stayed silent');
  at(A.from - 900, 4);
  assert.ok(bed('loop.alpine') < 0.0005, 'the ridge wind follows the bear down');
});

test('levels without the high Tatras never start the mountain bed', async () => {
  const { g, audio, at, bed, log } = await setup('winter');
  assert.equal(g.level.alpine, undefined);
  for (const x of [600, g.level.w / 2, g.level.w - 400]) at(x, 3);
  assert.equal(bed('loop.alpine'), 0);
  assert.ok(!log.sources.some((s) => s.buffer && s.buffer.name === 'loop.alpine'));
  assert.ok(!(audio.played['bird.alpine'] > 0));
});
