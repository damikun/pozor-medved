(function () {
  const root = typeof window === 'undefined' ? {} : window;
  const AC = root.AudioContext || root.webkitAudioContext || null;
  const KEY = 'zaStromom.mute';
  const HERE = root.document && root.document.currentScript ? root.document.currentScript.src : '';
  const MAX = 24, AMB_MAX = 8, LOW = 0.0001;
  const MIX = { master: 0.8, sfx: 0.75, amb: 0.7, beds: 0.8, verb: 0.32, send: 0.12, warm: 9000, warmWinter: 6200 };
  const LEVEL = {
    walk: 0.45, creep: 0.3, run: 0.6, wind: 0.007, windWinter: 0.01, windFrost: 0.014,
    forest: 0.0151, stream: 0.0472, spruce: 0.0166, crickets: 0.0079, bells: 0.0262, church: 0.0312, spray: 0.0615, drone: 0.0388, cable: 0.0141,
    murmur: 0.0245, market: 0.03, alpine: 0.02, machine: 0.05, saw: 0.035, hiss: 0.05,
  };
  const TRIM = {
    'voice.scream.f': 0.0495, 'voice.yell.m': 0.0431, 'voice.gasp.f': 0.0204, 'voice.oof.f': 0.0403, 'voice.oof.m': 0.0389, 'voice.yelp.m': 0.0473,
    'chat.adults': 0.0129, 'chat.hikers': 0.0217, 'chat.kids': 0.0114,
    'deer.call': 0.0221,
    'deer.grunt': 0.0273,
    'ski.swish': 0.0191,
    'ricochet': 0.0842,
    'claw': 0.0344,
    'hay': 0.0342,
    'lift.tower': 0.0305,
    'voice.hm': 0.0231,
    'chat.mumble': 0.0141,
    'chat.walla': 0.0144,
    'voice.grunt.m': 0.0285, 'voice.sigh': 0.018, 'voice.laugh': 0.024, 'voice.hoho': 0.0272, 'bear.growl': 0.0452, 'bear.huff': 0.0153,
    'step.grass': 0.0268, 'step.snow': 0.0203, 'step.water': 0.0351, 'step.ice': 0.0282, 'step.crawl': 0.0186, 'hide.leaves': 0.0381,
    'flee.grass': 0.0491, 'flee.snow': 0.0489, 'eat.munch': 0.05, 'eat.crunch': 0.04, 'eat.wrapper': 0.0947, 'eat.lick': 0.0521, 'eat.bees': 0.0146,
    'eat.plate': 0.0489, 'bin.lid': 0.0421, 'bin.rummage': 0.0308, 'market.clatter': 0.0403, 'shot': 0.2624, 'gun.cock': 0.1346,
    'impact.wood': 0.0603, 'impact.dirt': 0.0626, 'impact.body': 0.2545, 'fall.body': 0.0581, 'whoosh': 0.0294, 'zap': 0.1159, 'zap.spark': 0.03,
    'creak': 0.0355, 'crash.wood': 0.0568, 'bang.window': 0.0416, 'door.creak': 0.0139, 'camera': 0.0288, 'cloth': 0.0414, 'pylon': 0.0548,
    'loco.hiss': 0.0217, 'dog': 0.0476, 'sheep': 0.0208, 'cow': 0.0151, 'hen': 0.0298, 'bird.blackbird': 0.0173, 'bird.robin': 0.0142,
    'bird.crow': 0.0203, 'note.gs4': 0.0346, 'note.cs5': 0.0375, 'note.f5': 0.035, 'note.gs5': 0.0406, 'mbira.c5': 0.069, 'mbira.f5': 0.0555,
    'mbira.gs5': 0.0723, 'boar.grunt': 0.03, 'boar.squeal': 0.037, 'corn.rustle': 0.0355,
    'marmot': 0.026, 'marmot.one': 0.026, 'chamois': 0.034, 'scree': 0.045, 'bird.alpine': 0.0135,
  };
  const VARIANT = {
    'chat.kids': [-0.5, 0.7, -1.7, -1.2, 0.2, -1.8, 1.3, 2.0, 0.8],
    'chat.walla': [0.2, -0.6, 1.1, 0.4, 0.4, -0.5, -1.6, 2.5, -0.9, -1.4, 0.4, 0.6, -0.1, -0.7],
    'chat.mumble': [2.2, 2.4, 1.8, -0.4, 1.0, -0.7, -2.5, -1.9, -1.3, -0.5, -0.5, 0.3, -0.0, 0.7, -0.5],
    'hay': [0.9, 1.1, -2.0],
    'claw': [-3.2, -4.6, 3.6, 4.2],
    'ricochet': [-2.5, -3.9, 1, -9.9],
    'chat.hikers': [1.8, 0.2, -1.4, -0.6],
    'step.grass': [2.6, -1.4, 0.2, -1.5], 'step.water': [2.8, -2.1, -0.6], 'step.ice': [-0.6, -0.8, 1.5], 'flee.grass': [-1.4, 1.4],
    'eat.munch': [5.5, -5.9, 0.4], 'eat.crunch': [5.1, -1.5, -3.5], 'eat.wrapper': [3.2, -3.2], 'eat.lick': [1.5, -1.4],
    'market.clatter': [1.0, -3.9, 3.0], 'shot': [2.6, 1.1, -3.7], 'gun.cock': [2.4, -2.4], 'impact.wood': [1.1, -1.6, 0.6],
    'impact.body': [-0.5, -1.3, 1.9], 'fall.body': [-1.2, 0.2, 1.0], 'zap': [-1.9, 1.9], 'creak': [-2.7, -2.7, 5.5], 'bang.window': [1.8, -1.8],
    'camera': [2.6, -2.6], 'cloth': [0.2, 1.1, -1.4], 'bird.crow': [1.0, -1.1],
    'scree': [0.1, -0.5, -0.8, 1.9, -1.2, 0.4],
  };
  const rnd = ZS.util.mulberry32(0x5a7e11);
  const { clamp } = ZS.util;
  const rr = (a, b) => a + (b - a) * rnd();
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const LICK = { wildhoney: 1, hive: 1, punch: 1 };
  const BINS = { bin: 1, container: 1, chatabin: 1 };
  const CRUNCH = { carrot: 1, apple: 1, frozenapple: 1, nut: 1, snownut: 1, corn: 1, cob: 1, feeder: 1 };
  const SHOOTERS = { posed: 1, walker: 1, ztmh: 1, poacher: 1 };
  const TALK = {
    tourist: ['chat.mumble', 'chat.walla', 'chat.adults', 'chat.hikers'], picker: ['chat.mumble', 'chat.hikers', 'chat.walla'],
    guest: ['chat.mumble', 'chat.walla', 'chat.adults'], waiter: ['chat.mumble', 'chat.walla'], santa: ['chat.mumble'],
  };
  const SONG = {
    spring: [['bird.blackbird', 3], ['bird.robin', 3], ['bird.crow', 1]],
    summer: [['bird.blackbird', 2], ['bird.robin', 2], ['bird.crow', 1]],
    autumn: [['bird.crow', 2], ['bird.robin', 1]],
    winter: [['bird.crow', 1]],
    alpine: [['bird.alpine', 4], ['bird.crow', 1]],
  };

  let ctx = null, sfx = null, ambBus = null, bedBus = null, verbIn = null, warm = null, out = null;
  let brown = null, white = null, rooms = {}, panOk = false;
  let hidden = false, paused = false, sleepT = 0, game = null, beds = null, base = 0, studio = false, loading = false;
  const samples = {}, loops = {}, lastClip = {};
  const ends = new Float64Array(MAX), ambEnds = new Float64Array(AMB_MAX);
  const spot = { pan: 0, vol: 1 };
  const people = new WeakMap();
  const w = {
    g: null, ride: null, lastX: 0, stepD: 0, stepLen: 48, paw: 0, breath: 0, climbT: 0, baa: 9, baaCd: 0, flee: 0,
    rideW: 0, jolt: 0, seen: new Uint8Array(64), active: false, drone: null, droneD: 0,
    bird: 3, dog: 8, place: 3, stag: 20, ski: 4, deer: 0, chatCd: 0, clank: 6, hen: 4, hiss: 3, cow: 12, clatter: 2, gust: 0.6, gustT: 0, rum: 0, shoutCd: 0, voiceCd: 0, theme: '',
  };

  function readMuted() {
    try { return root.localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function keep(v) {
    try { root.localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { return; }
  }

  function quietly(fn) {
    try { const p = fn(); if (p && p.catch) p.catch(() => {}); } catch (e) { return; }
  }

  const api = {
    muted: readMuted(), count: 0, played: {}, onChange: () => {}, levels: { mix: MIX, beds: LEVEL, trim: TRIM },
    unlock, toggle, setMuted, pause, event, frame, news, end, click, bounce,
    live: () => !!ctx && ctx.state === 'running',
    samples: () => Object.keys(samples),
    voices,
  };

  function want() { return !api.muted && !hidden && !paused; }

  function noise(c, seconds) {
    const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const fade = Math.min(n >> 1, Math.floor(c.sampleRate * 0.01));
    for (let i = 0; i < fade; i++) { const k = i / fade; d[i] *= k; d[n - 1 - i] *= k; }
    return buf;
  }

  function hiss(c, seconds) {
    const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
    return buf;
  }

  function impulse(c, seconds) {
    const rate = c.sampleRate, n = Math.floor(rate * seconds), buf = c.createBuffer(2, n, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / rate, k = 0.25 + 0.7 * Math.min(1, t / 1.2);
        lp += (1 - k) * ((rnd() * 2 - 1) - lp);
        const early = t < 0.08 && rnd() < 0.004 ? (rnd() * 2 - 1) * 0.8 : 0;
        d[i] = (lp * Math.exp(-t / 0.42) + early * Math.exp(-t / 0.05)) * Math.min(1, i / (rate * 0.004));
      }
    }
    return buf;
  }

  function chain(c) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    const wf = c.createBiquadFilter();
    wf.type = 'lowpass'; wf.frequency.value = MIX.warm; wf.Q.value = 0.5;
    const master = c.createGain(); master.gain.value = MIX.master;
    const s = c.createGain(); s.gain.value = MIX.sfx;
    const a = c.createGain(); a.gain.value = MIX.amb;
    const bb = c.createGain(); bb.gain.value = MIX.beds;
    s.connect(wf); a.connect(wf); bb.connect(wf); wf.connect(comp); comp.connect(master);
    let send = null;
    if (typeof c.createConvolver === 'function') {
      const conv = c.createConvolver(), ret = c.createGain();
      conv.buffer = rooms[c.sampleRate] || (rooms[c.sampleRate] = impulse(c, 2.2));
      ret.gain.value = MIX.verb;
      send = c.createGain(); send.gain.value = 1;
      send.connect(conv); conv.connect(ret); ret.connect(wf);
    }
    return { sfx: s, amb: a, beds: bb, master, send, warm: wf };
  }

  function adopt(c, ch) {
    ctx = c; sfx = ch.sfx; ambBus = ch.amb; bedBus = ch.beds; verbIn = ch.send; warm = ch.warm;
    panOk = typeof c.createStereoPanner === 'function';
    brown = brown || noise(c, 4);
    white = white || hiss(c, 1.5);
  }

  function build() {
    let c = null;
    try { c = new AC(); } catch (e) { return; }
    const ch = chain(c);
    out = c.createGain(); out.gain.value = 0;
    ch.master.connect(out); out.connect(c.destination);
    adopt(c, ch);
    loadSamples();
  }

  function bytesOf(b64) {
    if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(b64);
    const bin = root.atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function decode(b64) {
    return new Promise((done) => {
      let over = false;
      const finish = (buf) => { if (!over) { over = true; done(buf || null); } };
      try {
        const p = ctx.decodeAudioData(bytesOf(b64).buffer, finish, () => finish(null));
        if (p && p.then) p.then(finish, () => finish(null));
      } catch (e) { finish(null); }
    });
  }

  function loadSamples() {
    const src = ZS.SOUNDS;
    if (loading || !src || typeof ctx.decodeAudioData !== 'function' || typeof root.atob !== 'function') return;
    loading = true;
    for (const name of Object.keys(src)) {
      [].concat(src[name]).forEach((item, i) => {
        const data = typeof item === 'string' ? item : item && item.data;
        if (typeof data !== 'string' || !data) return;
        if (item.loop) loops[name] = [item.start || 0, item.loop];
        decode(data).then((buf) => { if (buf) (samples[name] || (samples[name] = []))[i] = buf; });
      });
    }
  }

  function clip(name, x, vol, o) {
    const list = samples[name];
    if (!ctx || !list || !list.length) return false;
    let i = Math.floor(rnd() * list.length);
    if (list.length > 1 && i === lastClip[name]) i = (i + 1) % list.length;
    for (let n = 0; n < list.length && !list[i]; n++) i = (i + 1) % list.length;
    if (!list[i]) return false;
    lastClip[name] = i;
    const V = VARIANT[name], opt = V ? Object.assign({}, o, { gain: ((o && o.gain) || 1) * Math.pow(10, (V[i] || 0) / 20) }) : o || NO, buf = list[i], rate = (opt.rate || 1) * rr(0.95, 1.05), d = voice(name, buf.duration / rate + 0.1, x, vol, opt);
    if (d) {
      const s = ctx.createBufferSource();
      s.buffer = buf; s.playbackRate.value = rate;
      s.connect(d); s.start(ctx.currentTime + base + (opt.delay || 0));
    }
    return d;
  }

  function makeLoop(name, dest, send) {
    const L = loops[name], list = samples[name];
    if (!L || !list || !list.length) return null;
    const s = ctx.createBufferSource(), g = ctx.createGain(), p = panOk ? ctx.createStereoPanner() : null;
    s.buffer = list.find(Boolean); s.loop = true; s.loopStart = L[0]; s.loopEnd = L[0] + L[1];
    g.gain.value = 0;
    s.connect(g);
    const tail = p ? (g.connect(p), p) : g;
    tail.connect(dest || ambBus);
    if (verbIn && send !== 0) { const sg = ctx.createGain(); sg.gain.value = send || 0.2; tail.connect(sg); sg.connect(verbIn); }
    s.start(0, L[0] + rnd() * L[1]);
    return { g, p, s, v: 0, pan: 0, rate: 1 };
  }

  function sync() {
    if (!ctx) return;
    const on = want(), t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(on ? 1 : 0, t, on ? 0.04 : 0.03);
    clearTimeout(sleepT);
    if (on) { if (ctx.state === 'suspended') quietly(() => ctx.resume()); return; }
    sleepT = setTimeout(() => { if (!want() && ctx.state === 'running') quietly(() => ctx.suspend()); }, 220);
  }

  function fetchSounds() {
    const d = root.document;
    if (ZS.SOUNDS || fetchSounds.sent || !d || !d.createElement || !HERE) return;
    fetchSounds.sent = true;
    const s = d.createElement('script');
    s.src = HERE.replace(/audio\.js(\?.*)?$/, 'sounds.js');
    s.async = true;
    s.onload = () => { if (ctx) loadSamples(); };
    s.onerror = () => { fetchSounds.sent = false; };
    d.head.appendChild(s);
  }

  function unlock() {
    fetchSounds();
    if (!AC || api.muted) return;
    if (!ctx) { build(); sync(); return; }
    if (want() && ctx.state === 'suspended') sync();
  }

  function setMuted(v) {
    api.muted = !!v;
    keep(api.muted);
    if (!api.muted) unlock();
    sync();
    api.onChange(api.muted);
  }

  function toggle() { setMuted(!api.muted); }

  function pause(on) {
    if (paused === !!on) return;
    paused = !!on;
    sync();
  }

  function voices() {
    if (!ctx) return 0;
    let n = 0;
    for (let i = 0; i < MAX; i++) if (ends[i] > ctx.currentTime) n++;
    for (let i = 0; i < AMB_MAX; i++) if (ambEnds[i] > ctx.currentTime) n++;
    return n;
  }

  function place(x, reach, pan) {
    spot.pan = 0; spot.vol = 1;
    if (x !== null && x !== undefined && game) {
      const half = (game.viewW || 760) / 2, rel = (x - (game.cam + half)) / half;
      const over = Math.abs(rel) - 1, limit = 1.2 * (reach || 1);
      if (over >= limit) return false;
      if (over > 0) spot.vol = (1 - over / limit) * (1 - over / limit);
      spot.pan = clamp(rel * 0.8, -0.9, 0.9);
    }
    if (typeof pan === 'number') spot.pan = pan;
    return true;
  }

  function slot(list, size, dur, must) {
    const now = ctx.currentTime;
    let free = -1, soonest = 0;
    for (let i = 0; i < size; i++) {
      if (list[i] <= now) { free = i; break; }
      if (list[i] < list[soonest]) soonest = i;
    }
    if (free < 0 && !must) return false;
    list[free < 0 ? soonest : free] = now + dur;
    return true;
  }

  const NO = {};

  function voice(name, dur, x, vol, o) {
    const opt = o || NO;
    vol *= (TRIM[name] || 1) * (opt.gain || 1);
    if (studio) { place(null, 1, opt.pan); return sink(vol, opt); }
    if (!ctx || !want() || ctx.state !== 'running' || !place(x, opt.reach, opt.pan)) return null;
    if (!(opt.amb ? slot(ambEnds, AMB_MAX, dur, false) : slot(ends, MAX, dur, opt.must))) return null;
    const g = sink(vol * spot.vol, opt);
    setTimeout(() => { quietly(() => g.tail.disconnect()); if (g.send) quietly(() => g.send.disconnect()); }, (dur + 0.5) * 1000);
    api.count++;
    api.played[name] = (api.played[name] || 0) + 1;
    return g;
  }

  function sink(vol, opt) {
    const far = 1 - spot.vol, g = ctx.createGain();
    g.gain.value = vol;
    let tail = g;
    const lp = opt.lp || (far > 0.05 ? 5200 - 3200 * far : 0);
    if (lp) { const f = filter('lowpass', lp, 0.6); tail.connect(f); tail = f; }
    if (panOk && spot.pan) { const p = ctx.createStereoPanner(); p.pan.value = spot.pan; tail.connect(p); tail = p; }
    tail.connect(opt.amb ? ambBus : sfx);
    const amount = (opt.send === undefined ? MIX.send : opt.send) + 0.3 * far;
    if (verbIn && amount > 0) { g.send = ctx.createGain(); g.send.gain.value = amount; tail.connect(g.send); g.send.connect(verbIn); }
    g.tail = tail;
    return g;
  }

  function filter(type, f, q) {
    const n = ctx.createBiquadFilter();
    n.type = type; n.frequency.value = f; n.Q.value = q || 0.7;
    return n;
  }

  function play(name, x, vol, o) { return clip(name, x, vol === undefined ? 1 : vol, o); }

  function stepSurface(kind) {
    return kind === 'snow' ? 'step.snow' : kind === 'water' ? 'step.water' : kind === 'ice' ? 'step.ice' : kind === 'crawl' ? 'step.crawl' : 'step.grass';
  }

  const SFX = {
    jump(x) {
      play('cloth', x, 1);
      play('bear.huff', x, 0.8);
    },
    land(x, vy) {
      const k = clamp(((vy || 400) - 250) / 600, 0.4, 1);
      play(stepSurface(w.surface), x, 1.2 + 0.4 * k, { rate: 0.9, send: 0.05 });
      if ((vy || 0) > 600) play('bear.huff', x, 0.5);
    },
    climb(x) { play('claw', x, 1); },
    leaves(x) { play('hide.leaves', x, 1); },
    hay(x) { play('hay', x, 1); },
    pile(x) { play('impact.wood', x, 0.4, { rate: 1.55 }); play('cloth', x, 0.7, { delay: 0.04 }); },
    corn(x, k) {
      const v = 0.35 + 0.45 * (k || 0.6);
      if (rnd() < 0.6) play('corn.rustle', x, v, { rate: rr(0.92, 1.12) });
      else play('hide.leaves', x, v, { rate: rr(1.05, 1.25), lp: 4200 });
    },
    boar(x, k) {
      if (k === 'squeal') { play('boar.squeal', x, 1, { reach: 1.6, send: 0.2 }); scurry(x, 0.8); }
      else play('boar.grunt', x, rr(0.75, 1), { reach: 1.3, rate: rr(0.92, 1.06) });
    },
    eat(x, type) {
      const f = ZS.FOOD[type];
      if (type === 'fish' || type === 'catch') { play('step.water', x, 1); play('eat.munch', x, 1, { delay: 0.25 }); }
      else if (LICK[type]) { play('eat.lick', x, 1); if (type === 'hive') play('eat.bees', x, 1); }
      else if (BINS[type]) { play('bin.lid', x, 1); play('bin.rummage', x, 1, { delay: 0.15 }); }
      else if (CRUNCH[type]) play('eat.crunch', x, 1);
      else if (type === 'halusky') { play('eat.plate', x, 1); play('eat.munch', x, 1, { delay: 0.2 }); }
      else if (f && !f.natural) { play('eat.wrapper', x, 1); play('eat.munch', x, 0.9, { delay: 0.25 }); }
      else { play('hide.leaves', x, 0.5, { rate: 1.2 }); play('eat.munch', x, 1, { delay: 0.12 }); }
    },
    shot(x) { play('shot', x, 1, { reach: 3, send: 0.3 }); },
    miss(x) { play('ricochet', x, 1, { reach: 1.5 }); play('impact.dirt', x, 0.6, { reach: 1.5 }); },
    tree(x) { play('impact.wood', x, 1, { reach: 1.5 }); },
    hayHit(x) { play('impact.dirt', x, 1, { reach: 1.5, lp: 2200 }); },
    hit(x) { play('impact.body', x, 1, { reach: 1.5, must: true }); play('bear.growl', x, 0.7, { delay: 0.05 }); },
    hug(x) {
      play('note.gs4', x, 1);
      play('note.cs5', x, 0.9, { delay: 0.14 });
      play('note.f5', x, 0.8, { delay: 0.28 });
    },
    selfie(x) { play('camera', x, 1); },
    shutter(x, k) { play('camera', x, 0.55 * (k || 1), { rate: rr(1.15, 1.3), send: 0.05 }); },
    bite(x) { play('impact.body', x, 0.3); play('bear.growl', x, 0.6); },
    biteAir(x) { play('whoosh', x, 0.5, { rate: 0.8 }); },
    hugAir(x) { play('cloth', x, 0.8); },
    stomp(x) { play('impact.body', x, 0.35); play('bear.huff', x, 0.6); },
    shake(x) {
      play('bear.growl', x, 1);
      for (let i = 0; i < 3; i++) play('creak', x, 1, { delay: i * 0.45 });
    },
    standFall(x) { play('crash.wood', x, 1, { reach: 1.5 }); },
    rung(x) { play('creak', x, 0.45, { rate: rr(0.85, 1.2) }); play('claw', x, 0.55, { rate: rr(0.9, 1.1) }); },
    hatch(x) { play('creak', x, 0.8, { rate: 0.75 }); play('bear.huff', x, 0.7, { delay: 0.1 }); play('impact.wood', x, 0.4, { delay: 0.25 }); },
    freeze(x) { play('voice.yelp.m', x, 1, { reach: 1.4 }); },
    thud(x, k) { play('fall.body', x, k || 1, { reach: 1.5 }); },
    zap(x) { play('zap', x, 1); play('zap.spark', x, 1); },
    bark(x) { play('dog', x, 1, { reach: 1.5 }); play('dog', x, 0.9, { reach: 1.5, delay: rr(0.16, 0.24) }); },
    baa(x) { play('sheep', x, 1); },
    koliba(x) { play('market.clatter', x, 1, { reach: 1.5 }); play('creak', x, 0.7, { reach: 1.5, delay: 0.1, rate: 1.2 }); },
    window(x) { play('bang.window', x, 1, { reach: 1.5 }); },
    door(x) { play('door.creak', x, 1, { reach: 1.5 }); },
    knock(x, k) { for (let i = 0; i < 3; i++) play('impact.wood', x, 0.75 * (k || 1), { delay: i * 0.15, rate: rr(1.35, 1.5) }); },
    creak(x) { play('door.creak', x, 0.7, { rate: 1.2 }); },
    scream(x, v) {
      if (v === 'f') play('voice.scream.f', x, 1, { reach: 1.4 });
      else if (v === 'kid') play('voice.scream.f', x, 0.9, { reach: 1.4, rate: 1.3 });
      else play('voice.yell.m', x, 1, { reach: 1.4 });
    },
    whistle(x) { play('note.f5', x, 0.7, { rate: 1.9, reach: 1.6 }); play('note.f5', x, 0.6, { rate: 1.9, delay: 0.22, reach: 1.6 }); },
    sob(x) { play('voice.yelp.m', x, 0.8, { rate: rr(1.3, 1.45), reach: 1.4 }); play('voice.yelp.m', x, 0.5, { rate: rr(1.4, 1.55), delay: 0.35, reach: 1.4 }); },
    gasp(x) { play('voice.yell.m', x, 0.9, { rate: 1.25, reach: 1.4 }); },
    tram(x) { play('note.cs5', x, 0.6, { rate: 1.5, reach: 2.2 }); play('note.cs5', x, 0.5, { rate: 1.5, delay: 0.3, reach: 2.2 }); },
    bell(x) { for (let i = 0; i < 4; i++) play('note.gs5', x, 0.45, { rate: 1.8, delay: i * 0.11, reach: 3 }); },
    clap(x, k) { for (let i = 0; i < 6; i++) play('impact.wood', x === null || x === undefined ? null : x + rr(-300, 300), 0.22 * (k || 1), { rate: rr(2.2, 2.8), delay: i * rr(0.07, 0.12), reach: 3 }); play('chat.walla', x, 0.4 * (k || 1), { reach: 3 }); },
    horn(x) { play('pylon', x, 1, { rate: 0.45, reach: 3, send: 0.3 }); },
    beep(x) { play('note.gs5', x, 0.6, { rate: 2.2 }); },
    pour(x) { play('eat.plate', x, 0.5, { rate: 1.45 }); play('eat.lick', x, 0.35, { delay: 0.2, rate: 1.3 }); },
    gulp(x) { play('eat.lick', x, 0.7, { rate: 0.8 }); play('bear.huff', x, 0.5, { delay: 0.3 }); },
    hiccup(x) { play('bear.huff', x, 0.5, { rate: 1.7 }); },
    throw(x) { play('whoosh', x, 0.7, { rate: 1.2 }); play('cloth', x, 0.6, { delay: 0.5 }); },
    lotRustle(x) { play('hide.leaves', x, 0.5, { rate: 1.15 }); },
    lotTopple(x) { play('crash.wood', x, 0.6, { reach: 1.5, rate: 1.3 }); play('hide.leaves', x, 0.9, { delay: 0.04 }); },
    lotSeller(x) { play('voice.yell.m', x, 1, { reach: 1.4 }); scurry(x, 1); },
    fisher(x) { play('voice.yell.m', x, 1, { reach: 1.4, rate: 1.08 }); play('bin.lid', x, 0.5, { delay: 0.12, rate: 1.3 }); scurry(x, 1); },
    marmot(x, k) {
      if (k === 'short') { play('marmot.one', x, 0.8, { reach: 2, send: 0.35 }); return; }
      play('marmot', x, 1, { reach: 2.2, send: 0.4 });
      if (rnd() < 0.6) play('marmot.one', x === null || x === undefined ? null : x + rr(-420, 420), rr(0.35, 0.55), { amb: true, reach: 2.4, send: 0.6, delay: rr(0.8, 1.6) });
    },
    chamois(x) {
      play('chamois', x, 1, { reach: 1.8, send: 0.35, rate: rr(1.08, 1.2) });
      play('scree', x, 0.45, { reach: 1.5, delay: rr(0.35, 0.5), rate: rr(1.1, 1.3) });
    },
    scree(x, k) { play('scree', x, typeof k === 'number' ? clamp(k, 0.2, 1) : 0.8, { reach: 1.5, send: 0.25, rate: rr(0.9, 1.2) }); },
    gate(x) { play('pylon', x, 0.45, { rate: 1.7, reach: 1.4 }); play('creak', x, 0.35, { rate: 1.35, delay: 0.06, reach: 1.4 }); },
    rub(x) { play('claw', x, 0.55, { rate: 0.75 }); play('bear.huff', x, 0.45, { rate: 0.85, delay: 0.12 }); },
    wipe(x) { play('bear.huff', x, 0.85, { rate: 0.8 }); play('hide.leaves', x, 0.4, { rate: 0.75, delay: 0.05 }); },
    fell(x) { saw(x, 0.55, 1); play('creak', x, 1, { rate: 0.55, delay: 0.3, reach: 1.6 }); },
    crash(x) {
      play('crash.wood', x, 1, { rate: 0.68, reach: 1.8, send: 0.25 });
      play('impact.dirt', x, 0.9, { rate: 0.55, reach: 1.8, delay: 0.02 });
      play('hide.leaves', x, 0.8, { rate: 0.7, delay: 0.06, reach: 1.6 });
    },
    spray,
    splash,
    push() { play('ski.swish', null, 0.9, { rate: 0.85 }); play('bear.huff', null, 0.6, { delay: 0.1 }); },
    plant() { play('step.snow', null, 0.9, { rate: 1.6 }); play('step.ice', null, 0.35, { rate: 1.8, delay: 0.03 }); play('ski.swish', null, 0.45, { rate: 1.2, delay: 0.16 }); play('bear.huff', null, 0.25, { rate: 1.2, delay: 0.12 }); },
    skiGate() { play('impact.wood', null, 0.3, { rate: 2.4 }); },
    pole() { play('impact.wood', null, 0.75, { rate: 1.7 }); play('cloth', null, 0.6, { rate: 1.2 }); },
    skiMiss() { play('note.gs4', null, 0.55, { rate: 0.5 }); play('note.gs4', null, 0.45, { rate: 0.47, delay: 0.18 }); },
    net(x, k) { play('cloth', null, 0.5 + 0.5 * (k || 0), { rate: 0.75 }); play('impact.dirt', null, 0.3 * (k || 0.5), { rate: 1.4 }); },
    tumble() { play('fall.body', null, 1, { must: true }); play('flee.snow', null, 0.9, { delay: 0.05 }); play('bear.growl', null, 0.45, { delay: 0.15 }); },
    finish() { ['note.cs5', 'note.f5', 'note.gs5'].forEach((n, i) => play(n, null, 0.7, { delay: i * 0.12, must: true })); },
    cheer(x, k) { const v = k || 1; play('chat.walla', null, 0.9 * v, { gain: 3, send: 0.3 }); play('chat.walla', null, 0.7 * v, { gain: 3, delay: 0.25, send: 0.3 }); for (let i = 0; i < 7; i++) play('note.f5', null, 0.25 * v, { rate: rr(1.3, 1.5), delay: i * rr(0.08, 0.14), amb: true }); },
    pop(x, k) { play('whoosh', null, 0.6 + 0.4 * (k || 0), { rate: 0.85 }); play('ski.swish', null, 0.7, { rate: 1.2 }); },
    skiLand(x, k) { play('fall.body', null, 0.5 * (k || 1), { rate: 1.35 }); play('step.snow', null, 1, { rate: 0.8 }); play('ski.swish', null, 0.6, { delay: 0.05 }); },
    trick() { play('whoosh', null, 0.45, { rate: 1.45 }); },
    whoosh() { play('whoosh', null, 0.55, { rate: 1.15 }); },
    judge() { for (let i = 0; i < 5; i++) play('note.cs5', null, 0.4, { rate: 1.5, delay: 0.4 + i * 0.35 }); },
    anthem() { const N = ['note.gs4', 'note.cs5', 'note.f5', 'note.cs5', 'note.gs5', 'note.f5', 'note.cs5', 'note.gs4', 'note.cs5', 'note.f5', 'note.gs5', 'note.gs5']; N.forEach((n, i) => play(n, null, 0.6, { delay: 0.1 + i * 0.42 + (i > 7 ? 0.2 : 0), send: 0.35, must: true })); },
    camera() { play('camera', null, 1, { must: true }); },
    lock(x) { play('gun.cock', x, 1, { reach: 2 }); },
    hut(x) {
      play(rnd() < 0.5 ? 'chat.walla' : 'chat.mumble', x, 0.8, { amb: true, reach: 1.4, send: 0.3, rate: rr(0.94, 1.06) });
      if (rnd() < 0.6) play(rnd() < 0.5 ? 'market.clatter' : 'eat.plate', x, 0.5, { amb: true, reach: 1.4, send: 0.25, delay: rr(0.1, 0.6), rate: rr(1, 1.15) });
    },
  };

  function spray(x, k) {
    const dur = 0.25 + 0.75 * (k || 1), d = voice('spray', dur + 0.15, x, LEVEL.hiss * 10, { send: 0.04 });
    if (!d) return;
    const t = ctx.currentTime + base, s = ctx.createBufferSource(), f = filter('bandpass', 5600, 0.9), h = filter('highpass', 2600, 0.7), g = ctx.createGain();
    s.buffer = white;
    g.gain.setValueAtTime(LOW, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.03);
    g.gain.setValueAtTime(0.42, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(LOW, t + dur + 0.08);
    s.connect(h); h.connect(f); f.connect(g); g.connect(d);
    s.start(t, rnd() * 0.5); s.stop(t + dur + 0.12);
    play('impact.wood', x, 0.25, { rate: 2.2, delay: 0.01 });
  }

  function saw(x, dur, vol) {
    const d = voice('saw', dur + 0.2, x, vol, { send: 0.08 });
    if (!d) return;
    const t = ctx.currentTime + base, g = ctx.createGain(), f = filter('bandpass', 1300, 1.2), lfo = ctx.createOscillator(), lg = ctx.createGain();
    const a = ctx.createOscillator(), b = ctx.createOscillator();
    a.type = 'sawtooth'; b.type = 'sawtooth';
    a.frequency.setValueAtTime(118, t); a.frequency.linearRampToValueAtTime(152, t + 0.18); a.frequency.setValueAtTime(152, t + dur - 0.15); a.frequency.linearRampToValueAtTime(96, t + dur + 0.1);
    b.frequency.setValueAtTime(121, t); b.frequency.linearRampToValueAtTime(155.5, t + 0.18); b.frequency.setValueAtTime(155.5, t + dur - 0.15); b.frequency.linearRampToValueAtTime(98, t + dur + 0.1);
    lfo.frequency.value = 31; lg.gain.value = 0.12;
    g.gain.setValueAtTime(LOW, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.06);
    g.gain.setValueAtTime(0.3, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(LOW, t + dur + 0.12);
    lfo.connect(lg); lg.connect(g.gain);
    a.connect(f); b.connect(f); f.connect(g); g.connect(d);
    for (const o of [a, b, lfo]) { o.start(t); o.stop(t + dur + 0.15); }
  }

  function makeMachine() {
    const g = ctx.createGain(), f = filter('lowpass', 240, 1.1), p = panOk ? ctx.createStereoPanner() : null, a = ctx.createOscillator(), b = ctx.createOscillator(), mix = ctx.createGain();
    const n = ctx.createBufferSource(), nf = filter('lowpass', 420, 0.6), ng = ctx.createGain();
    a.type = 'sawtooth'; b.type = 'square';
    a.frequency.value = 44; b.frequency.value = 88.6; mix.gain.value = 0.35;
    n.buffer = brown; n.loop = true; ng.gain.value = 0.9;
    g.gain.value = 0;
    a.connect(f); b.connect(mix); mix.connect(f); n.connect(nf); nf.connect(ng); ng.connect(f); f.connect(g);
    (p ? (g.connect(p), p) : g).connect(bedBus);
    a.start(0); b.start(0); n.start(0, rnd() * 3);
    return { g, p, v: 0, pan: 0, a, b, f, hz: 44 };
  }

  function makeEngine() {
    const g = ctx.createGain(), f = filter('lowpass', 320, 0.9), p = panOk ? ctx.createStereoPanner() : null, a = ctx.createOscillator(), b = ctx.createOscillator(), mix = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain(), chug = ctx.createGain();
    a.type = 'triangle'; b.type = 'sawtooth';
    a.frequency.value = 52; b.frequency.value = 104.6; mix.gain.value = 0.18;
    lfo.type = 'sine'; lfo.frequency.value = 13; lg.gain.value = 0.22; chug.gain.value = 0.78;
    g.gain.value = 0;
    a.connect(chug); b.connect(mix); mix.connect(chug); lfo.connect(lg); lg.connect(chug.gain); chug.connect(f); f.connect(g);
    (p ? (g.connect(p), p) : g).connect(bedBus);
    a.start(0); b.start(0); lfo.start(0);
    return { g, p, v: 0, pan: 0, a, b, f, lfo, hz: 52 };
  }

  function splash(x, k) {
    play('step.water', x, 0.9 * (k || 1), { rate: 0.62, send: 0.2 });
    play('step.water', x, 0.6 * (k || 1), { rate: 0.85, delay: 0.09, send: 0.2 });
  }

  function scurry(x, vol) {
    play(game && game.level.theme === 'winter' ? 'flee.snow' : 'flee.grass', x, vol, { reach: 1.2 });
  }

  function bird(season) {
    const list = SONG[season] || SONG.summer;
    let sum = 0;
    for (const s of list) sum += s[1];
    let r = rnd() * sum, name = list[0][0];
    for (const s of list) { r -= s[1]; if (r <= 0) { name = s[0]; break; } }
    const far = rr(0, 1);
    play(name, null, 1 - 0.6 * far, { amb: true, pan: rr(-0.8, 0.8), send: 0.3 + 0.35 * far, lp: 7000 - 3500 * far });
    return name;
  }

  function lock(side) { play('gun.cock', null, 1, { pan: side * 0.6 }); }

  function liftShot(side) { play('shot', null, 0.8, { pan: side * 0.6, send: 0.35 }); }

  function liftResult(result, side) {
    const o = { pan: side * 0.4, must: result === 'hit' };
    if (result === 'hit') { play('impact.body', null, 1, o); play('bear.growl', null, 0.6, o); }
    else if (result === 'spark') play('ricochet', null, 1, o);
    else play('whoosh', null, 1, o);
  }

  function news() {}

  function end(kind) {
    const o = { must: true, send: 0.2 };
    if (kind === 'win') {
      ['note.gs4', 'note.cs5', 'note.f5', 'note.gs5'].forEach((n, i) => play(n, null, 0.8, Object.assign({ delay: 0.6 + i * 0.16 }, o)));
      return;
    }
    ['mbira.gs5', 'mbira.f5', 'mbira.c5'].forEach((n, i) => play(n, null, 1, Object.assign({ delay: 0.6 + i * 0.38 }, o)));
  }

  function click() {
    const d = voice('click', 0.05, null, 1, { must: true, send: 0 });
    if (!d) return;
    const t = ctx.currentTime + base, s = ctx.createBufferSource(), f = filter('lowpass', 2400, 0.7), g = ctx.createGain();
    s.buffer = brown;
    g.gain.setValueAtTime(LOW, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.002);
    g.gain.exponentialRampToValueAtTime(LOW, t + 0.02);
    s.connect(f); f.connect(g); g.connect(d);
    s.start(t, rnd() * 3); s.stop(t + 0.05);
  }

  function event(g, name, x, k) {
    if (!ctx || g !== game || !g.running || g.paused) return;
    const fn = SFX[name];
    if (fn) fn(x, k);
  }

  function makeWind() {
    const g = ctx.createGain(), f = filter('lowpass', 600, 0.5), s = ctx.createBufferSource();
    g.gain.value = 0;
    s.buffer = brown; s.loop = true;
    s.connect(f); f.connect(g); g.connect(ambBus);
    s.start(0, rnd() * brown.duration);
    return { g, p: null, v: 0, pan: 0 };
  }

  function level(b, v, pan, at, tau) {
    if (!b) return;
    const t = at === undefined ? ctx.currentTime : at;
    if (Math.abs(v - b.v) > 0.0004 || (v === 0 && b.v !== 0)) { b.v = v; b.g.gain.setTargetAtTime(v, t, tau || 0.25); }
    if (b.p && typeof pan === 'number' && Math.abs(pan - b.pan) > 0.03) { b.pan = pan; b.p.pan.setTargetAtTime(pan, t, 0.2); }
  }

  function rate(b, r, at) {
    if (!b || !b.s || Math.abs(r - b.rate) < 0.004) return;
    b.rate = r;
    b.s.playbackRate.setTargetAtTime(r, at === undefined ? ctx.currentTime : at, 0.3);
  }

  const LOOPS = {
    forest: ['loop.forest', 0.15], stream: ['loop.stream', 0.15], spruce: ['loop.wind', 0.1], crickets: ['loop.crickets', 0.2], bells: ['loop.bells', 0.25],
    church: ['loop.church', 0.3], spray: ['loop.spray', 0.1], drone: ['loop.drone', 0.1], cable: ['loop.cable', 0], murmur: ['loop.murmur', 0.35], market: ['loop.market', 0.35],
    alpine: ['loop.alpine', 0.25], river: ['loop.stream', 0.15],
  };

  function bed(key) {
    if (beds[key]) return beds[key];
    const L = LOOPS[key];
    if (!L || !loops[L[0]] || !samples[L[0]]) return null;
    beds[key] = makeLoop(L[0], key === 'drone' || key === 'cable' || key === 'spray' ? bedBus : ambBus, L[1]);
    return beds[key];
  }

  function loopLevel(key, v, pan, tau) {
    const b = v > 0 ? bed(key) : beds[key];
    if (b) level(b, v, pan, undefined, tau);
  }

  function makeBeds() { beds = { wind: makeWind() }; }

  function silence() {
    if (!beds) return;
    for (const k of Object.keys(beds)) level(beds[k], 0);
    w.drone = null;
  }

  function relPan(x) {
    const half = (game.viewW || 760) / 2;
    return clamp((x - (game.cam + half)) / half * 0.8, -0.9, 0.9);
  }

  function surface(g, b) {
    if (b.crawl) return 'crawl';
    if (b.inWater) return 'water';
    if (b.onIce) return 'ice';
    if (g.level.theme === 'winter' && g.seasonKey !== 'advent') return 'snow';
    return 'grass';
  }

  function walkSounds(g, b, dt) {
    const dx = Math.abs(b.x - w.lastX);
    w.lastX = b.x;
    w.surface = surface(g, b);
    if (g.ride || !b.onGround || b.climbing || b.hiding || !b.moving || b.act || dx > 60) { w.stepD = Math.min(w.stepD, w.stepLen * 0.6); }
    else {
      w.stepD += dx;
      if (w.stepD >= w.stepLen) {
        const gait = b.running && !b.crouch ? 'run' : b.crouch ? 'creep' : 'walk';
        w.stepD = 0;
        w.paw ^= 1;
        w.stepLen = (b.crawl ? 30 : gait === 'creep' ? 32 : gait === 'run' ? 58 : 46) * rr(0.9, 1.1) * (w.paw ? 1.06 : 0.94);
        const vol = (gait === 'run' ? LEVEL.run : gait === 'creep' ? LEVEL.creep : LEVEL.walk) * (w.paw ? 1 : 0.85);
        play(stepSurface(w.surface), b.x, vol, { send: 0.05, lp: gait === 'run' ? 3400 : 2600, rate: w.paw ? 0.94 : 1.04 });
        if (gait === 'run' && w.paw && (w.breath = (w.breath + 1) % 3) === 0) play('bear.huff', b.x, 0.35);
      }
    }
    if (b.climbing && b.climbV && !b.climbing.ladder) {
      w.climbT += dt;
      if (w.climbT >= (b.climbV < 0 ? 0.32 : 0.22)) { w.climbT = 0; SFX.climb(b.x); }
    } else w.climbT = 0.1;
  }

  function rummage(g, b, dt) {
    if (!b.eating || (w.rum -= dt) > 0) return;
    w.rum = rr(0.45, 0.65);
    let it = null;
    for (const i of g.level.items) if (!i.eaten && Math.abs(i.x - b.x) < 30 && !ZS.FOOD[i.type].natural) { it = i; break; }
    play(it && BINS[it.type] ? 'bin.rummage' : it && it.type === 'cob' ? 'corn.rustle' : 'eat.wrapper', b.x, 0.5);
  }

  function rec(o) {
    let r = people.get(o);
    if (!r) {
      const kind = o.kind;
      r = {
        state: o.state, react: o.react, scared: o.scaredT || 0, ph: o.ph, cd: 0, vcd: 0, alert: o.alertX, lock: o.lock || 0, film: o.filmCd || 0,
        female: kind === 'waiter' || kind === 'tycoon' || !!SHOOTERS[kind] ? false : kind === 'picker' ? rnd() < 0.75 : rnd() < 0.5, santa: kind === 'santa',
      };
      people.set(o, r);
    }
    return r;
  }

  function cue(o, r, vol) {
    if (w.shoutCd > 0 || r.cd > 0) return;
    scurry(o.x, vol);
    w.shoutCd = 0.2; r.cd = 2;
  }

  function react(o, r, kind, vol, delay) {
    if (w.voiceCd > 0 || r.vcd > 0) return false;
    let name;
    if (kind === 'fright') name = r.santa ? 'voice.hoho' : r.female ? (rnd() < 0.35 ? 'voice.scream.f' : 'voice.gasp.f') : 'voice.yell.m';
    else if (kind === 'notice') name = r.santa ? 'voice.hoho' : r.female ? (rnd() < 0.5 ? 'voice.gasp.f' : 'voice.hm') : rnd() < 0.5 ? 'voice.hm' : 'voice.grunt.m';
    else if (kind === 'pain') name = r.female ? 'voice.oof.f' : 'voice.yelp.m';
    else if (kind === 'hug') name = r.santa ? 'voice.hoho' : 'voice.sigh';
    else name = kind;
    if (!clip(name, o.x, vol, { reach: 1.4, delay: delay || 0, send: 0.18 })) return false;
    w.voiceCd = 0.6; r.vcd = 4;
    return true;
  }

  function crowdCues(g, dt) {
    w.shoutCd -= dt; w.voiceCd -= dt;
    for (const p of g.people) {
      const r = rec(p);
      r.cd -= dt; r.vcd -= dt;
      if (p.react !== r.react) {
        if (p.react === 'bitten') { r.vcd = 0; react(p, r, 'pain', 1); }
        else if (p.react === 'hugged') { r.vcd = 0; react(p, r, 'hug', 1, 0.35); }
        else if (r.react === 'selfie' && !p.react) { r.vcd = 0; react(p, r, 'voice.laugh', 1, 0.1); }
        if (r.react === 'hugged' || r.react === 'selfie' || r.react === 'bitten') { r.cd = 3; r.vcd = Math.max(r.vcd, 3); }
      }
      if (p.state !== r.state && p.state === 'flee' && !p.leaving) { cue(p, r, 1); react(p, r, 'fright', 1); }
      const film = p.filmCd || 0;
      if (film > r.film + 5) react(p, r, 'notice', 0.7);
      r.film = film; r.state = p.state; r.react = p.react;
    }
    for (const s of g.shooters) {
      const r = rec(s);
      r.cd -= dt; r.vcd -= dt;
      if (s.react !== r.react) {
        if (s.react === 'flee' || s.react === 'gone') cue(s, r, 1);
        if (s.react === 'drop') { r.vcd = 0; react(s, r, 'voice.yell.m', 1); }
        else if (s.react === 'down') { r.vcd = 0; w.voiceCd = Math.min(w.voiceCd, 0); react(s, r, 'voice.oof.m', 1, r.react === 'drop' ? 0.05 : 0.12); }
        else if (s.react === 'bitten') { r.vcd = 0; react(s, r, 'voice.yelp.m', 1); }
        else if (s.react === 'hugged') { r.vcd = 0; react(s, r, 'voice.sigh', 1, 0.35); }
        else if (s.react === 'flee') react(s, r, 'voice.yell.m', 0.8);
      }
      const scared = s.scaredT || 0;
      if (scared > r.scared + 2) { cue(s, r, 1); react(s, r, 'voice.yell.m', 0.8); }
      if (!s.react && r.vcd <= 0) {
        const alerted = s.alertX !== null && s.alertX !== undefined && (r.alert === null || r.alert === undefined);
        if (s.lock > 0 && r.lock <= 0) { play('gun.cock', s.x, 0.8, { reach: 1.2 }); if (react(s, r, 'voice.grunt.m', 0.8)) r.vcd = 6; }
        else if (alerted && react(s, r, rnd() < 0.5 ? 'voice.hm' : 'voice.grunt.m', 0.8)) r.vcd = 6;
      }
      r.scared = scared; r.react = s.react; r.alert = s.alertX; r.lock = s.lock || 0;
    }
    const k = g.koliba;
    if (k) for (const o of k.guests) {
      const r = rec(o);
      r.vcd -= dt;
      if (o.ph !== r.ph && (o.ph === 'door' || o.ph === 'dive' || o.ph === 'jump')) { cue(o, r, 0.8); react(o, r, 'fright', 0.9, rr(0.02, 0.15)); }
      r.ph = o.ph;
    }
    const ph = g.photographer;
    if (ph) {
      const r = rec(ph), act = g.bear.act, posing = !!act && act.target === ph && act.kind === 'pose' && act.t > 0.6;
      r.vcd -= dt;
      if (ph.react !== r.react && ph.react === 'bitten') { r.vcd = 0; react(ph, r, 'voice.yelp.m', 1); }
      else if (ph.react !== r.react && ph.react === 'hugged') { r.vcd = 0; react(ph, r, 'voice.laugh', 0.9, 0.4); }
      else if (posing && !r.state) { r.vcd = 0; react(ph, r, 'voice.laugh', 0.8, 0.1); }
      r.react = ph.react; r.state = posing;
    }
  }

  function indoor(g, b) {
    const L = g.level, I = L.indoor;
    if (L.plenary) return 1;
    if (!I || L.stage) return 0;
    return sstep(I[0] - 150, I[0] + 50, b.x) * (1 - sstep(I[1] - 50, I[1] + 150, b.x));
  }

  function crowdLoops(g, b, dt) {
    const L = g.level, k = g.koliba;
    let mv = 0, mp = 0;
    if (L.salas && k && k.mode === 'calm') {
      let sit = 0;
      for (const s of k.seats) if (s.mode === 'sit' || s.mode === 'back') sit++;
      const near = Math.max(0, 1 - Math.abs(b.x - k.x) / 900);
      mv = LEVEL.murmur * (sit / k.seats.length) * near * near; mp = relPan(k.x);
    }
    const inside = indoor(g, b);
    if (inside > mv / LEVEL.murmur) { mv = LEVEL.murmur * inside * 0.8; mp = 0; }
    loopLevel('murmur', g.ride ? 0 : mv, mp, 0.25);
    let kv = 0, kp = 0;
    if (L.theme === 'winter' && L.stalls && L.stalls.length) {
      const a = L.stalls[0].x, z = L.stalls[L.stalls.length - 1].x, c = (a + z) / 2;
      const d = Math.max(0, Math.abs(b.x - c) - (z - a) / 2 - 60), near = Math.max(0, 1 - d / 900);
      kv = LEVEL.market * near * near; kp = relPan(clamp(b.x, a, z));
      if (near > 0.3 && !g.ride && (w.clatter -= dt) <= 0) { w.clatter = rr(2.5, 6); play('market.clatter', a + rnd() * (z - a), 0.7, { amb: true, reach: 1.5, send: 0.3 }); }
    }
    loopLevel('market', g.ride ? 0 : kv, kp, 0.4);
  }

  function zonesOf(g) {
    const L = g.level, z = [];
    const add = (from, to, kinds, rate, extra) => z.push(Object.assign({ x: (from + to) / 2, w: to - from, kinds, rate }, extra));
    if (L.village) add(L.village.from, L.village.to, ['chat.walla', 'chat.mumble', 'chat.adults', 'chat.kids'], 1, { dog: true });
    if (L.skanzen) add(L.skanzen.from, L.skanzen.to, ['chat.walla', 'chat.mumble', 'chat.kids'], 0.8);
    if (L.hotel) add(L.hotel.x - L.hotel.w / 2, L.hotel.x + L.hotel.w / 2 + 200, ['chat.walla', 'chat.adults'], 0.8);
    if (L.park) add(L.park.from, L.park.to, ['chat.hikers', 'chat.mumble'], 0.35);
    if (L.salas) add(L.salas.from, L.salas.koliba + 200, ['chat.mumble', 'chat.adults'], 0.5, { koliba: true });
    if (L.chata) add(L.chata.x - 150, L.chata.x + 350, ['chat.walla', 'chat.mumble'], 0.9);
    if (L.slope) add(L.slope.from, L.slope.to, ['chat.walla', 'chat.kids'], 0.5, { ski: true });
    return z;
  }

  function chatter(g, dt) {
    w.chatCd -= dt;
    const half = (g.viewW || 760) / 2, cx = g.cam + half;
    for (const p of g.people) {
      const list = TALK[p.kind];
      if (!list) continue;
      const r = rec(p);
      if (p.react || p.state === 'flee' || p.leaving || p.hurdle) {
        if (r.talk) { const node = r.talk; quietly(() => node.gain.setTargetAtTime(0, ctx.currentTime, 0.05)); r.talk = null; }
        r.chat = rr(5, 9);
        continue;
      }
      if (r.chat === undefined) r.chat = rr(1, 7);
      if ((r.chat -= dt) > 0) continue;
      r.chat = rr(3.5, 8);
      if (Math.abs(p.x - cx) > half * 1.3 || w.chatCd > 0) continue;
      r.talk = clip(list[Math.floor(rnd() * list.length)], p.x, 1, { amb: true, reach: 1.3, send: 0.25, rate: r.female ? rr(1, 1.06) : rr(0.92, 0.98) });
      if (r.talk) w.chatCd = rr(0.6, 1.2);
    }
  }

  function placeSounds(g, b, dt) {
    if (w.zones) {
      for (const z of w.zones) {
        const d = Math.max(0, Math.abs(b.x - z.x) - z.w / 2);
        if (d < 700 && z.dog && (w.dog -= dt) <= 0) {
          w.dog = rr(10, 22);
          play('dog', null, 0.45 * (1 - d / 1400), { amb: true, pan: rr(-0.8, 0.8), send: 0.6, lp: 1600 });
        }
        if (z.ski && d < 600 && (w.ski -= dt) <= 0) {
          w.ski = rr(4, 9);
          play('ski.swish', z.x + rr(-z.w / 2, z.w / 2), 0.8 * (1 - d / 900), { amb: true, reach: 1.5, send: 0.3, rate: rr(0.9, 1.1) });
        }
        const calm = !z.koliba || !g.koliba || g.koliba.mode === 'calm';
        if (d < 500 && calm && w.chatCd <= 0 && (w.place -= dt) <= 0) {
          w.place = rr(2.5, 5) / z.rate;
          const x = z.x + rr(-z.w / 2, z.w / 2);
          if (Math.abs(x - b.x) > 140 && clip(z.kinds[Math.floor(rnd() * z.kinds.length)], x, 0.75 * (1 - d / 700), { amb: true, reach: 1.4, send: 0.35, rate: rr(0.94, 1.06) })) w.chatCd = rr(0.6, 1.2);
        }
      }
    }
    const L = g.level, S = L.salas;
    let bv = 0, bp = 0;
    if (S && S.pen && g.sheep.length) {
      const c = (S.pen[0] + S.pen[1]) / 2, d = Math.max(0, Math.abs(b.x - c) - (S.pen[1] - S.pen[0]) / 2), near = Math.max(0, 1 - d / 1000);
      bv = LEVEL.bells * near * near * (w.flee ? 1.4 : 1); bp = relPan(clamp(b.x, S.pen[0], S.pen[1]));
      if (near > 0.2 && (w.cow -= dt) <= 0) { w.cow = rr(16, 32); play('cow', null, 0.6 * near, { amb: true, pan: rr(-0.7, 0.7), send: 0.6, lp: 2500 }); }
    }
    loopLevel('bells', bv, bp, 0.5);
    const K = L.skanzen;
    if (K) {
      if (K.hen && Math.abs(b.x - K.hen) < 650 && (w.hen -= dt) <= 0) { w.hen = rr(4, 10); play('hen', K.hen, 1, { amb: true }); }
      if (K.loco && Math.abs(b.x - K.loco) < 600 && (w.hiss -= dt) <= 0) { w.hiss = rr(6, 12); play('loco.hiss', K.loco, 1, { amb: true, send: 0.25 }); }
    }
    const lift = L.lift;
    if (L.theme === 'winter' && lift && Math.abs(b.x - lift.x) < 1300 && (w.clank -= dt) <= 0) {
      w.clank = rr(6, 13);
      play('pylon', null, 0.4, { amb: true, pan: relPan(lift.x), send: 0.7, lp: 1800 });
    }
  }

  function bellSounds(g, b) {
    const K = g.level.skanzen;
    if (!K) return;
    const alarm = 1 - sstep(170, 330, Math.abs(b.x - K.tower));
    loopLevel('church', LEVEL.church * alarm, relPan(K.tower), 0.3);
  }

  function sheepSounds(g, b, dt) {
    if (!g.sheep.length) return;
    let flee = 0, near = null;
    for (const s of g.sheep) {
      if (s.state === 'flee') flee++;
      if (!near || Math.abs(s.x - b.x) < Math.abs(near.x - b.x)) near = s;
    }
    w.baaCd -= dt;
    if (flee > w.flee && w.baaCd <= 0) { w.baaCd = 3; SFX.baa(near.x); }
    w.flee = flee;
    if (Math.abs(near.x - b.x) > g.viewW) return;
    if ((w.baa -= dt) <= 0) { w.baa = rr(9, 18); if (w.baaCd <= 0) { w.baaCd = 3; SFX.baa(g.sheep[Math.floor(rnd() * g.sheep.length)].x); } }
  }

  function rideSounds(g) {
    const r = g.ride;
    if (r !== w.ride) { w.ride = r; w.seen.fill(0); w.rideW = 0; w.jolt = 0; }
    const on = !!r && (r.phase === 'ride' || r.phase === 'arrive');
    loopLevel('cable', on ? LEVEL.cable : 0, 0, 0.4);
    if (!on) return;
    if (r.jolt > w.jolt + 0.2) { play('lift.tower', null, 1, { send: 0.2 }); play('pylon', null, 0.5, { send: 0.25 }); }
    w.jolt = r.jolt;
    if (Math.sign(r.w) !== Math.sign(w.rideW) && Math.abs(r.th) > 0.14) play('creak', null, 0.5 * clamp(Math.abs(r.th) / 0.6, 0.3, 1), { rate: 1.1 });
    w.rideW = r.w;
    for (const s of r.shots) {
      if (s.id >= w.seen.length) continue;
      const code = s.state === 'aim' ? 1 : s.state === 'fly' ? 2 : 3, was = w.seen[s.id], side = s.foe ? s.foe.side : 0;
      if (code === was) continue;
      w.seen[s.id] = code;
      if (was < 1) lock(side);
      if (code >= 2 && was < 2) liftShot(side);
      if (code === 3) liftResult(s.result, side);
    }
  }

  function machineSounds(g, b) {
    const A = g.level.logging, D = g.level.clearing;
    let v = 0, x = 0, work = 0, saw0 = false;
    if (A) {
      const m = A.machine;
      x = m.x; work = m.state === 'saw' || m.state === 'strip' || m.state === 'fell' ? 1 : m.state === 'drive' || m.state === 'reach' ? 0.5 : 0;
      v = m.on ? LEVEL.machine * (0.75 + 0.25 * work) : m.state === 'fell' || m.state === 'strip' ? LEVEL.machine * 0.5 : 0;
      saw0 = m.state === 'saw';
      if (g.cut && g.cut.still) v *= 0.35;
    } else if (D && !g.once.logging && !g.ride) {
      const d = Math.abs(D.x + 300 - b.x);
      x = D.x + 300; v = LEVEL.machine * 0.55 * Math.max(0, 1 - d / 1100);
    }
    if (!beds.machine && v > 0) beds.machine = makeMachine();
    const m = beds.machine;
    if (!m) return;
    level(m, v, relPan(x), undefined, 0.35);
    const hz = 44 + 9 * work, t = ctx.currentTime;
    if (Math.abs(hz - m.hz) > 0.5) { m.hz = hz; m.a.frequency.setTargetAtTime(hz, t, 0.35); m.b.frequency.setTargetAtTime(hz * 2.013, t, 0.35); m.f.frequency.setTargetAtTime(240 + 160 * work, t, 0.35); }
    if (saw0 && !w.saw) { w.saw = true; saw(x, 0.85, 1.2); } else if (!saw0) w.saw = false;
  }

  function boatSounds(g) {
    const P = g.pass, on = !!P && P.key === 'boat' && !!g.level.boat && (P.phase === 'open' || P.phase === 'play') && !!P.play;
    const c = on ? P.play : null, out = on && c.dock && c.v < 1 ? 0.3 : 1;
    if (!beds.engine && on) beds.engine = makeEngine();
    const e = beds.engine;
    loopLevel('river', on ? LEVEL.stream * 0.75 : 0, 0, 0.5);
    if (!e) return;
    level(e, on ? LEVEL.machine * 0.55 * out : 0, on ? clamp(-(c.lv || 0) * 0.08, -0.2, 0.2) : 0, undefined, on ? 0.3 : 0.4);
    if (!on) return;
    const v = clamp(c.v / 245, 0, 1.1), turn = Math.min(1, Math.abs(c.lv || 0) / 2.6), hz = 40 + 18 * v + 4 * turn, t = ctx.currentTime;
    if (Math.abs(hz - e.hz) > 0.3) {
      e.hz = hz;
      e.a.frequency.setTargetAtTime(hz, t, 0.3); e.b.frequency.setTargetAtTime(hz * 2.012, t, 0.3);
      e.lfo.frequency.setTargetAtTime(hz / 4, t, 0.3); e.f.frequency.setTargetAtTime(260 + 140 * v + 90 * turn, t, 0.3);
    }
    rate(beds.river, 0.85 + 0.25 * v);
  }

  function droneSounds(g, b, dt) {
    let near = null;
    if (!g.ride) for (const d of g.drones) if (!near || Math.abs(d.x - b.x) < Math.abs(near.x - b.x)) near = d;
    if (!near) { if (w.drone) loopLevel('drone', 0); w.drone = null; return; }
    const dist = Math.abs(near.x - b.x);
    if (near !== w.drone) { w.drone = near; w.droneD = dist; }
    const closing = dt > 0 ? (w.droneD - dist) / dt : 0;
    w.droneD = dist;
    const fade = Math.max(0, 1 - dist / ((g.viewW || 760) * 1.1));
    loopLevel('drone', LEVEL.drone * fade * fade, relPan(near.x), 0.3);
    if (beds.drone) rate(beds.drone, clamp(1 + closing * 0.0009, 0.94, 1.06));
  }

  function natureSounds(g, b, dt) {
    const winter = g.level.theme === 'winter', t = g.time, season = winter ? 'winter' : ZS.seasonLook(g.seasonKey);
    if ((w.gustT -= dt) <= 0) { w.gustT = rr(1.5, 4.5); w.gust = rr(0.25, 1); }
    const wind = winter ? (g.seasonKey === 'frost' ? LEVEL.windFrost : LEVEL.windWinter) : LEVEL.wind;
    const A = g.level.alpine, high = A ? sstep(A.from - 250, A.from + 250, b.x) * (1 - sstep(A.to, A.to + 400, b.x)) : 0, roof = 1 - indoor(g, b);
    level(beds.wind, wind * (0.6 + 0.4 * w.gust) * (1 + 0.5 * high), undefined, undefined, 1.2);
    loopLevel('forest', winter ? 0 : LEVEL.forest * (season === 'autumn' ? 0.8 : 1) * (1 - high) * roof, 0, 1);
    loopLevel('spruce', winter ? LEVEL.spruce * (0.6 + 0.4 * w.gust) : 0, 0, 1.4);
    loopLevel('crickets', !winter && season !== 'spring' && !g.ride ? LEVEL.crickets * (season === 'autumn' ? 0.6 : 1) * (1 - 0.7 * high) * roof : 0, 0, 1);
    loopLevel('alpine', LEVEL.alpine * high * (0.8 + 0.2 * w.gust), 0, 1);
    const R = g.level.river;
    let creek = 0, cp = 0;
    if (R && !g.ride) {
      const d = Math.max(0, Math.abs(b.x - (R.from + R.to) / 2) - (R.to - R.from) / 2), k = Math.max(0, 1 - d / 750);
      creek = LEVEL.stream * k * k; cp = relPan(clamp(b.x, R.from, R.to));
    }
    loopLevel('stream', creek, cp, 0.4);
    let sv = 0, sp = 0;
    for (const c of g.level.cannons || []) {
      const cx = c.x + c.dir * 140, k = Math.max(0, 1 - Math.abs(cx - b.x) / 650), v = LEVEL.spray * k * k * (0.85 + 0.15 * Math.sin(t * 1.3 + c.x));
      if (v > sv) { sv = v; sp = relPan(cx); }
    }
    loopLevel('spray', g.ride ? 0 : sv, sp, 0.3);
    droneSounds(g, b, dt);
    if ((w.bird -= dt) <= 0) {
      w.bird = high > 0.5 ? rr(12, 24) : winter ? rr(16, 30) : rr(9, 18) * (season === 'autumn' ? 1.6 : 1);
      if ((!g.ride || rnd() < 0.5) && roof > 0.5) bird(high > 0.5 ? 'alpine' : season);
    }
    if (season === 'autumn' && !g.ride && roof > 0.5 && (w.stag -= dt) <= 0) {
      w.stag = rr(25, 50);
      play('deer.call', null, rr(0.4, 0.8), { amb: true, pan: rr(-0.8, 0.8), send: 0.6, lp: 2200 });
    }
    deerSounds(g, b, dt);
  }

  function deerSounds(g, b, dt) {
    if (!g.deer || !g.deer.length || g.ride) return;
    let flee = 0, near = null;
    for (const d of g.deer) {
      if (d.state === 'flee') flee++;
      if (!near || Math.abs(d.x - b.x) < Math.abs(near.x - b.x)) near = d;
    }
    if (flee > w.deer) play('deer.grunt', near.x, 1, { reach: 1.4 });
    w.deer = flee;
    if (!flee && Math.abs(near.x - b.x) < g.viewW && (w.stag -= dt) <= 0) {
      w.stag = rr(20, 40);
      play('deer.call', near.x, 0.7, { amb: true, reach: 1.6, send: 0.4 });
    }
  }

  function olympSounds(g) {
    const O = g.olymp || null, c = (O && O.c) || null;
    if (!c) { silence(); return; }
    if (!beds.air) {
      const mk = (buf, type, f, q) => { const gg = ctx.createGain(), fl = filter(type, f, q), src = ctx.createBufferSource(); gg.gain.value = 0; src.buffer = buf; src.loop = true; src.connect(fl); fl.connect(gg); gg.connect(bedBus); src.start(0, rnd()); return { g: gg, f: fl, v: 0, p: null, pan: 0 }; };
      beds.air = mk(brown, 'bandpass', 500, 0.6);
      beds.edge = mk(white, 'bandpass', 3200, 1.4);
    }
    const run = !!c && !O.fadeTo && ((O.stage === 'slalom' && O.phase === 'ski') || (O.stage === 'skok' && (O.phase === 'in' || O.phase === 'air' || O.phase === 'out')) || (O.stage === 'sane' && O.phase === 'run'));
    const v = run ? c.v : 0, t = ctx.currentTime, sled = O && O.stage === 'sane', air = O && O.phase === 'air';
    level(beds.air, run ? 0.05 * clamp(0.15 + v / 26, 0, 1.3) : 0, 0, undefined, 0.2);
    beds.air.f.frequency.setTargetAtTime(300 + v * 38, t, 0.3);
    const edge = !run || air ? 0 : sled ? 0.012 * clamp(v / 20, 0, 1) * (0.5 + Math.abs(c.w || 0)) : 0.022 * (c.edge || 0) + 0.01 * (c.spray || 0);
    level(beds.edge, edge, 0, undefined, 0.08);
    beds.edge.f.frequency.setTargetAtTime(sled ? 1800 : 2600 + 900 * (c.edge || 0), t, 0.2);
    const near = O && O.stage === 'slalom' && c ? ((c.s > 380 && c.s < 520) || (c.s > 660 && c.s < 780) || c.s > g.level.olymp.slalom.finish - 160 || c.s < 60 ? 1 : 0.35) : O && O.stage === 'skok' && O.phase !== 'top' && O.phase !== 'in' ? 1 : 0.3;
    loopLevel('bells', O && O.phase !== 'podium' && O.phase !== 'doping' && O.phase !== 'bar' ? LEVEL.bells * near : 0, 0, 0.6);
    loopLevel('murmur', O && (O.phase === 'bar' || O.phase === 'stop' || O.phase === 'judges' || O.phase === 'podium') ? LEVEL.murmur * 1.6 : O && O.phase === 'view' ? LEVEL.murmur * 0.6 : 0, 0, 0.5);
    loopLevel('market', O && O.phase === 'bar' ? LEVEL.market * 1.2 : 0, 0, 0.4);
  }

  function begin(g) {
    w.g = g; w.zones = zonesOf(g); w.bird = rr(3, 6);
    const theme = g.level.theme;
    if (warm && theme !== w.theme) { w.theme = theme; warm.frequency.setTargetAtTime(theme === 'winter' ? MIX.warmWinter : MIX.warm, ctx.currentTime, 0.5); }
  }

  function frame(g, dt) {
    game = g;
    if (!ctx || ctx.state !== 'running') return;
    if (!beds) makeBeds();
    const active = !!g && g.running && !g.over && !g.paused;
    if (!active) {
      if (w.active) { silence(); w.active = false; }
      return;
    }
    const b = g.bear;
    if (g !== w.g) begin(g);
    if (!w.active) { w.active = true; w.lastX = b.x; w.stepD = 0; }
    if (g.level.olymp) { olympSounds(g); return; }
    walkSounds(g, b, dt);
    rideSounds(g);
    machineSounds(g, b);
    natureSounds(g, b, dt);
    boatSounds(g);
    if (g.ride) { loopLevel('murmur', 0); loopLevel('market', 0); loopLevel('bells', 0); loopLevel('church', 0); return; }
    rummage(g, b, dt);
    crowdCues(g, dt);
    chatter(g, dt);
    crowdLoops(g, b, dt);
    placeSounds(g, b, dt);
    bellSounds(g, b);
    sheepSounds(g, b, dt);
  }

  function bounce(name, seconds, a, b, c) {
    const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!OAC) return Promise.resolve(null);
    const off = new OAC(2, Math.ceil(44100 * seconds), 44100);
    const saved = [ctx, sfx, ambBus, bedBus, verbIn, warm, brown, panOk, game];
    try {
      const ch = chain(off);
      ch.master.connect(off.destination);
      adopt(off, ch);
      game = null; studio = true; base = 0.05;
      if (name === 'clip') {
        const list = samples[a];
        if (list && list[b || 0]) { const d = sink((c === undefined ? TRIM[a] || 1 : c), NO), s = off.createBufferSource(); s.buffer = list[b || 0]; s.connect(d); s.start(base); }
      } else if (name === 'loop') {
        const L = LOOPS[a], bedNode = L && loops[L[0]] && samples[L[0]] ? makeLoop(L[0], a === 'drone' || a === 'cable' || a === 'spray' ? bedBus : ambBus, L[1]) : null;
        if (bedNode) level(bedNode, c === undefined ? LEVEL[a] : c, 0, 0);
      } else if (name === 'walk') {
        for (let i = 0; i < 8; i++) { base = 0.05 + i * (b === 'run' ? 0.2 : 0.3); w.paw ^= 1; play(stepSurface(a || 'grass'), null, (b === 'run' ? LEVEL.run : LEVEL.walk) * (w.paw ? 1 : 0.85), { rate: w.paw ? 0.94 : 1.04 }); }
      } else if (SFX[name]) SFX[name](null, a);
      else if (name === 'end') end(a);
      else if (name === 'click') click();
      else if (name === 'scurry') scurry(null, 1);
    } finally {
      studio = false; base = 0;
      [ctx, sfx, ambBus, bedBus, verbIn, warm, brown, panOk, game] = saved;
    }
    return off.startRendering();
  }

  if (root.addEventListener) {
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) root.addEventListener(ev, unlock, { capture: true, passive: true });
  }
  if (root.document && root.document.addEventListener) {
    root.document.addEventListener('DOMContentLoaded', () => setTimeout(fetchSounds, 500));
    hidden = !!root.document.hidden;
    root.document.addEventListener('visibilitychange', () => { hidden = !!root.document.hidden; sync(); });
    root.document.addEventListener('click', (e) => {
      const el = e.target && e.target.closest ? e.target.closest('button, a') : null;
      if (el && !el.closest('#touch')) click();
    });
  }

  ZS.audio = api;
})();
