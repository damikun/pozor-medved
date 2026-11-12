(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const smoothUp = (u) => u * u * (3 - 2 * u);
  const sin = Math.sin;
  const rules = () => ZS.sim.rules;
  const T = () => LABELS.tanec;

  const WIN = { perfect: 0.09, good: 0.18 };
  const LEAD = 2.1;
  const ENTER = 2.6, POINTA = { flash: 0.5, end: 3.6 };
  const METER = { start: 60, perfect: 4, good: 2, miss: 9, stray: 2, reset: 50 };
  const STEP = 44, CENTER = 470, EDGE = [330, 610];
  const KEYS = { L: ['ArrowLeft', 'KeyA'], R: ['ArrowRight', 'KeyD'], D: ['ArrowDown', 'KeyS'], U: ['ArrowUp', 'KeyW', 'Space'] };

  const PULSE = [0.012, 0.731, 1.416, 2.101, 2.821, 3.529, 4.226, 4.923, 5.619, 6.351, 7.059, 7.732, 8.429, 9.149, 9.834, 10.542, 11.227, 11.912, 12.597, 13.27, 13.967, 14.71, 15.441, 16.138, 16.869, 17.578, 18.274, 18.959, 19.656, 20.341, 21.037, 21.734, 22.43, 23.127, 23.824, 24.509, 25.228, 25.89, 26.598, 27.307, 28.003, 28.688, 29.385, 30.058, 30.766, 31.451, 32.148, 32.833, 33.53, 34.215, 34.911, 35.585, 36.281, 36.989, 37.663, 38.348, 39.044, 39.729, 40.438, 41.157, 41.877, 42.539, 43.236, 43.921, 44.606, 45.291, 45.999, 46.695, 47.392, 48.077, 48.75, 49.435, 50.109, 50.782, 51.455, 52.14, 52.814, 53.522, 54.195, 54.869, 55.542, 56.216, 56.912, 57.574, 58.236, 58.921, 59.582, 60.244, 60.929, 61.626, 62.299, 62.961, 63.623, 64.308, 64.993, 65.678];

  const SECTIONS = [
    { key: 'slow', count: 4, beats: '. . R . L . R . L . D . . . D . R L D .', teach: true },
    { key: 'lively', count: 0, beats: 'U . . . R L R . C . . . D . U . C . R L D . U .', teach: true },
    { key: 'fast', count: 2, beats: 'R L R L D . U . C C D . R L U . D C R L U . . U', outage: true },
  ];

  function chart() {
    const notes = [], parts = [], seen = {};
    let k = 0;
    for (const S of SECTIONS) {
      const from = PULSE[k];
      k += S.count;
      const marks = S.beats.split(' '), at = PULSE[k];
      marks.forEach((m, i) => {
        if (m === '.') return;
        notes.push({ t: PULSE[k + i], k: m, sec: S.key, res: null, teach: !!S.teach && !seen[m] });
        seen[m] = true;
      });
      k += marks.length;
      parts.push({ key: S.key, from, play: at, to: PULSE[k], beat: (PULSE[k] - at) / marks.length, outage: !!S.outage });
    }
    notes[notes.length - 1].last = true;
    return { notes, parts, end: PULSE[k] };
  }

  const CHART = chart();

  function stage() {
    const S = ZS.levelKit.danceStage();
    S.start = S.dance.start;
    return S;
  }

  function start(g) {
    rules().say(g, NEWS.vychodna.danceStart, true);
    return {
      t: 0, song: -ENTER, phase: 'enter', meter: METER.start, notes: CHART.notes.map((n) => Object.assign({}, n)),
      held: {}, hits: 0, perfect: 0, good: 0, miss: 0, wrong: 0, points: 0, combo: 0, best: 0, fails: 0,
      move: null, said: {}, pointa: null, result: null, flash: 0, fx: [], cheer: 0, judge: null,
    };
  }

  function part(c) {
    let p = CHART.parts[0];
    for (const q of CHART.parts) if (c.song >= q.from) p = q;
    return p;
  }

  function beatOf(c) {
    const p = part(c);
    return (c.song - p.play) / p.beat;
  }

  function outage(c) {
    const p = CHART.parts[CHART.parts.length - 1];
    return c.song >= p.from && !c.pointa;
  }

  function edge(c, keys, k) {
    const on = KEYS[k].some((code) => keys.has(code)), was = !!c.held[k];
    c.held[k] = on;
    return on && !was;
  }

  function presses(g, c) {
    const keys = g.input.keys, out = [];
    for (const k of ['L', 'R', 'D']) if (edge(c, keys, k)) out.push(k);
    const up = edge(c, keys, 'U');
    if (up || g.input.jumpPressed) out.push('U');
    if (g.input.hugPressed) out.push('C');
    ZS.sim.passes.clearPresses(g);
    return out;
  }

  function pop(g, c, text, color, at) {
    rules().float(g, g.bear.x, GY - 170, text, color);
    g.floaters[g.floaters.length - 1].at = at || 'stage';
  }

  function moveBear(g, c, k) {
    const b = g.bear;
    c.move = { k, t: 0 };
    if (k === 'L' || k === 'R') {
      const d = k === 'L' ? -1 : 1;
      c.from = b.x; c.to = clamp(b.x + d * STEP, EDGE[0], EDGE[1]);
      if (Math.abs(c.to - c.from) < 2) c.to = clamp(b.x - d * STEP, EDGE[0], EDGE[1]);
    }
    rules().onSound(g, k === 'U' ? 'leap' : k === 'C' ? 'slap' : 'stamp', b.x);
  }

  function score(g, c, n, dt) {
    const a = Math.abs(dt), perfect = a <= WIN.perfect;
    n.res = perfect ? 'perfect' : 'good';
    c.hits++; c.combo++; c.best = Math.max(c.best, c.combo);
    if (perfect) { c.perfect++; c.points += 100; } else { c.good++; c.points += 60; }
    c.meter = clamp(c.meter + (perfect ? METER.perfect : METER.good), 0, 100);
    c.fx.push({ k: n.k, res: n.res, t: 0 });
    c.named = { k: n.k, at: g.time };
    if (c.combo && c.combo % 8 === 0) { pop(g, c, T().combo(c.combo), COLORS.good); c.cheer = 1; c.toss = g.time; rules().onSound(g, 'clap', null, 0.6); }
  }

  function fail(g, c, n, kind) {
    n.res = kind;
    c.combo = 0;
    c.fx.push({ k: n.k, res: kind, t: 0 });
    if (c.phase === 'play' && !c.pointa) c.move = { k: 'slip', t: 0 };
    if (n.teach || n.sec === 'slow') return;
    if (kind === 'wrong') c.wrong++; else c.miss++;
    c.meter = clamp(c.meter - METER.miss, 0, 100);
    if (c.meter <= 0) unmask(g, c);
  }

  function unmask(g, c) {
    const b = g.bear;
    c.fails++;
    c.meter = METER.reset;
    rules().spotted(g, b.x, GY - 190, T().real);
    g.floaters[g.floaters.length - 1].at = 'crowd';
    rules().onSound(g, 'scream', b.x);
    rules().addPanic(g, 6);
    if (g.lives > 1) { g.lives -= 1; rules().onSound(g, 'hit', b.x); pop(g, c, LABELS.hit(g.lives), COLORS.shot, 'paws'); b.inv = 1.6; }
    if (!c.said.real) { c.said.real = true; rules().say(g, NEWS.vychodna.danceReal, true); }
  }

  function judge(g, c, presses) {
    for (const k of presses) {
      let best = null;
      for (const n of c.notes) {
        if (n.res) continue;
        const d = c.song - n.t;
        if (d < -WIN.good) break;
        if (Math.abs(d) <= WIN.good) { best = n; break; }
      }
      moveBear(g, c, k);
      if (!best) {
        if (c.song > 0 && part(c).key !== 'slow') c.meter = clamp(c.meter - METER.stray, 0, 100);
        continue;
      }
      if (best.k === k) score(g, c, best, c.song - best.t);
      else fail(g, c, best, 'wrong');
    }
    for (const n of c.notes) {
      if (n.res) continue;
      if (c.song - n.t > WIN.good) fail(g, c, n, 'miss');
      else break;
    }
  }

  function animate(g, c, dt) {
    const b = g.bear, m = c.move;
    b.moving = false; b.crouch = false; b.onGround = true; b.y = GY; b.vy = 0; b.act = null; b.running = false;
    b.fest = { band: true, hat: true, kroj: true };
    c.rear = c.rear === undefined ? 0 : c.rear;
    let want = 0.92;
    b.inv = Math.max(0, b.inv - dt);
    if (m) {
      m.t += dt;
      if (m.k === 'L' || m.k === 'R') {
        const u = clamp(m.t / 0.22, 0, 1);
        b.x = c.from + (c.to - c.from) * u * u * (3 - 2 * u);
        b.moving = false; b.dir = 1;
        if (u >= 1) c.move = null;
      } else if (m.k === 'D') {
        if (m.t > 0.4) c.move = null;
      } else if (m.k === 'U') {
        const u = clamp(m.t / 0.46, 0, 1);
        b.y = GY - 92 * 4 * u * (1 - u); b.onGround = u >= 1; b.vy = u < 0.5 ? -400 : 400;
        if (u >= 1) c.move = null;
      } else if (m.k === 'slip') {
        want = 0.5 + 0.3 * clamp(m.t / 0.45, 0, 1);
        b.x = clamp(b.x + sin(m.t * 38) * 1.4, EDGE[0], EDGE[1]); b.moving = true; b.walkT += dt * 3;
        if (m.t > 0.45) c.move = null;
      } else if (m.k === 'C') {
        b.act = { kind: 'knock', t: m.t, dur: 0.32, dir: b.dir, hit: false, target: null, done: false };
        if (m.t > 0.32) { c.move = null; b.act = null; }
      }
    }
    const DK = { L: 'step', R: 'step', D: 'squat', U: 'jump', C: 'slap' }, DUR = { L: 0.22, R: 0.22, D: 0.4, U: 0.46, C: 0.32 };
    const mm = c.move;
    const pk = part(c).key, raw = c.phase === 'play' && !c.pointa ? Math.max(0, beatOf(c)) : g.time * 1.6, bt = pk === 'slow' ? raw / 2 : raw, half = Math.floor(bt) % 2;
    const flourish = c.toss !== undefined && g.time - c.toss < 0.9;
    b.dance = flourish ? { k: 'clap', u: clamp((g.time - c.toss) / 0.9, 0, 1) } : mm && DK[mm.k] ? { k: DK[mm.k], u: clamp(mm.t / DUR[mm.k], 0, 1), side: mm.k === 'L' ? -1 : 1 } : mm ? null : { k: pk === 'fast' && half ? 'clap' : 'step', u: bt - Math.floor(bt), side: half ? 1 : -1 };
    if (!mm) b.y = GY - 5 * Math.max(0, Math.sin(Math.PI * (bt - Math.floor(bt))));
    c.rear += (want - c.rear) * Math.min(1, dt * 14);
    b.rear = c.rear;
    b.trackX = b.x;
    for (const f of c.fx) f.t += dt;
    c.fx = c.fx.filter((f) => f.t < 0.7);
    c.cheer = Math.max(0, c.cheer - dt * 0.8);
  }

  function cues(g, c) {
    const p = part(c), b = g.bear;
    for (const q of CHART.parts) {
      const key = 'p' + q.key;
      if (c.song >= q.from && !c.said[key]) {
        c.said[key] = true;
        if (q.outage) {
          rules().onSound(g, 'outage', b.x);
          pop(g, c, T().outage, COLORS.bad, 'speaker');
          rules().say(g, NEWS.vychodna.danceOutage, true);
        }
      }
    }
    return p;
  }

  function finish(g, c) {
    const scored = c.notes.filter((n) => !n.teach);
    const pts = scored.reduce((s, n) => s + (n.res === 'perfect' ? 100 : n.res === 'good' ? 60 : 0), 0);
    const pct = Math.round(pts / Math.max(1, scored.length));
    const grade = pct >= 85 ? 'gold' : pct >= 60 ? 'silver' : 'crowd';
    c.result = { pct, grade };
    g.once.odzemok = { pct, grade, miss: c.miss + c.wrong, fails: c.fails, best: c.best };
    if (grade !== 'crowd') g.panic = Math.max(0, g.panic - (grade === 'gold' ? 10 : 5));
    return grade;
  }

  function pointa(g, c, dt) {
    const p = c.pointa, was = p.t, b = g.bear;
    p.t += dt;
    if (was < POINTA.flash && p.t >= POINTA.flash) {
      const grade = finish(g, c);
      p.flash = 1;
      rules().onSound(g, 'shutter', b.x);
      rules().onSound(g, 'cheer', b.x, grade === 'crowd' ? 0.6 : 1);
      rules().say(g, NEWS.vychodna.danceEnd[grade], true);
      rules().eat(g, { type: 'pagac', x: b.x, eaten: false });
    }
    p.flash = Math.max(0, (p.flash || 0) - dt * 1.8);
    return p.t >= POINTA.end;
  }

  function update(g, c, dt) {
    const b = g.bear;
    c.t += dt;
    if (c.phase === 'enter') {
      ZS.sim.passes.clearPresses(g);
      const left = CENTER - b.x, step = Math.min(left, Math.max(30, Math.min(110, left * 2.2)) * dt);
      b.x += step; b.dir = 1; b.moving = left > 1; b.walkT += step / 60; b.trackX = b.x; b.y = GY; b.onGround = true; b.vx = 0;
      if (left <= 1) { c.up = (c.up || 0) + dt; b.x = CENTER; }
      b.fest = { band: true, hat: true, kroj: true }; b.rear = c.rear = 0.92 * smoothUp(clamp((c.up || 0) / 0.45, 0, 1));
      if (c.t > 0.4 && !c.said.mc) { c.said.mc = true; pop(g, c, T().mc, COLORS.story, 'mc'); }
      if ((c.up || 0) >= 0.5) { c.phase = 'play'; c.song = 0; b.moving = false; }
      return false;
    }
    if (c.pointa) {
      ZS.sim.passes.clearPresses(g);
      animate(g, c, dt);
      return pointa(g, c, dt);
    }
    c.song += dt;
    cues(g, c);
    judge(g, c, presses(g, c));
    animate(g, c, dt);
    if (c.song >= CHART.end + 0.3) {
      c.pointa = { t: 0, flash: 0 };
      c.move = { k: 'U', t: 0 };
      rules().onSound(g, 'leap', b.x);
    }
    return false;
  }

  function idle(g, c, dt) {
    c.t += dt;
    if (c.pointa) c.pointa.t += dt;
  }

  function plan(g) {
    return ZS.sim.passes.playing(g, 'tanec');
  }

  function pilot(g, c) {
    if (c.phase !== 'play' || c.pointa) return;
    const keys = g.input.keys, sloppy = ZS.dev && ZS.dev.bot && ZS.dev.bot.mode === 'sloppy';
    for (const n of c.notes) {
      if (n.res) continue;
      const d = n.t - c.song;
      if (d > 0.02) break;
      if (sloppy && Math.floor(n.t * 7) % 5 === 0) continue;
      if (n.k === 'C') g.input.hugPressed = true;
      else if (n.k === 'U') { g.input.jumpPressed = true; keys.add('ArrowUp'); }
      else keys.add(KEYS[n.k][0]);
      return;
    }
  }

  ZS.sim.tanec = { PULSE, WIN, LEAD, ENTER, POINTA, METER, CHART, SECTIONS, KEYS, stage, start, update, idle, plan, pilot, part, beatOf, outage };
})();
