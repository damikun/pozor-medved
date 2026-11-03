(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const sim = ZS.sim;
  const STEP = 1 / 60, X = 1000;
  const { smooth, lerp } = ZS.util;
  const within = (t, a, b) => t >= a && t < b;
  const glide = (t, a, b, from, to) => lerp(from, to, smooth((t - a) / (b - a)));
  const TOUCH = { Space: 'ArrowUp' };
  const HELD = { ArrowUp: 0.12 };
  const panicAt = (t) => glide(t, 0.3, 2.3, 18, 72);

  let backdrop = null;
  function scenery() {
    if (backdrop) return backdrop;
    const K = ZS.levelKit, L = K.base('summer', ZS.util.mulberry32(23));
    L.w = 3000;
    K.hills(L);
    K.backTrees(L, () => false);
    backdrop = { mountains: L.mountains, ridge: L.ridge, backTrees: L.backTrees.filter((t, i) => i % 3 === 0) };
    return backdrop;
  }

  function world() {
    const L = Object.assign(ZS.levelKit.base('summer', ZS.util.mulberry32(5)), scenery(), { w: 3000, startDen: -4000, goalDen: 9000 });
    const input = { keys: new Set(), jumpPressed: false, jumpKey: null, downReleased: false, bitePressed: false, hugPressed: false };
    return {
      level: L, def: ZS.LEVELS.summer, bear: sim.bear.create(L), input, viewW: 400,
      shooters: [], people: [], drones: [], dogs: [], sheep: [], deer: [], props: [], tracks: [],
      floaters: [], shots: [], particles: [], bubble: null,
      time: 0, seasonIdx: 1, seasonKey: 'summer', fat: 30, syn: 0, panic: 0, lives: Infinity, cam: 0,
      flags: { press: false, emergency: false, drones: false, cull: false, meat: false, binsLocked: false, stallsLocked: false, hugBan: false, decree: false },
      courtUntil: 0, viralUntil: 0, hugBanAt: 0, lastKnown: null, lastHuman: -99, problem: false, nextEvent: Infinity, usedEvents: new Set(),
      stats: { natural: 0, human: 0, seen: 0, hugs: 0, bites: 0, stomps: 0, selfies: 0 }, falls: 0, refusals: 0, refusedAt: -99,
      running: false, over: true, paused: false, ending: null, bot: false, once: { climb: true, ice: true, spray: true, tracks: true },
      headlines: [], headlineIdx: 0, tickerT: Infinity, tickerQueue: [], tickerHot: false, cycle: new Map(), saidAt: {},
      cues: false, hideSaid: Infinity,
    };
  }

  const tree = (kind, x, w, h, r, shade) => ({ kind, x, w, h, r, hide: kind !== 'breza', shade });
  const item = (type, x) => ({ type, x, eaten: false, locked: false });
  const hunter = (g, kind, x, dir) => {
    const s = sim.hunters.create(g, kind, { x, dir });
    s.cross = 1e6;
    g.shooters.push(s);
    return s;
  };
  const person = (g, kind, x, dir) => {
    const p = sim.people.create(g, kind, { from: x, to: x });
    p.dir = dir; p.pause = 99;
    g.people.push(p);
    return p;
  };

  function shootTree(g, s) {
    g.over = false;
    try { sim.rules.fire(g, s, 'tree'); } finally { g.over = true; }
  }

  const SCENES = {
    walk: {
      sky: 152, dur: 2.9, still: 1.05,
      keys: ['ShiftLeft', 'ArrowLeft', 'ArrowRight'],
      setup(d, g) { g.bear.x = X - 105; },
      script(d, t) {
        const run = within(t, 2.0, 2.55);
        d.hold('ArrowRight', within(t, 0.35, 1.45));
        d.hold('ArrowLeft', run || (d.touch && within(t, 1.78, 1.86)));
        d.hold('ShiftLeft', run);
      },
    },
    hide: {
      sky: 144, dur: 3.3, still: 2.55,
      keys: ['ArrowRight', 'ArrowDown'],
      setup(d, g) {
        g.level.trees.push(tree('buk', X - 20, 60, 205, 96, 0.8));
        g.bear.x = X - 150;
        hunter(g, 'walker', X + 135, -1).cross = X + 75;
      },
      script(d, t, g) {
        d.hold('ArrowRight', within(t, 0.15, 0.7));
        d.hold('ArrowDown', within(t, 0.76, 4.15));
        const s = g.shooters[0];
        if (t < 2.4) {
          s.cross = glide(t, 0.9, 1.7, X + 75, X - 20);
          s.lock = t > 1.7 ? (t - 1.7) * 1.4 : 0;
        } else {
          s.cross = glide(t, 3.0, 3.9, X - 20, X + 75);
          s.lock = 0;
        }
        if (d.once('shot', t >= 2.4)) shootTree(g, s);
      },
    },
    climb: {
      sky: 188, dur: 2.5, still: 1.3,
      keys: ['ArrowRight', 'ArrowUp'],
      setup(d, g) {
        g.level.trees.push(tree('buk', X + 20, 56, 232, 100, 0.3));
        g.bear.x = X - 120;
      },
      script(d, t) {
        d.hold('ArrowRight', within(t, 0.2, 0.72));
        if (d.once('up', t >= 0.8)) d.tap('ArrowUp');
        d.hold('ArrowUp', within(t, 0.8, 2.95));
      },
      top(d, g) { return Math.min(GY - this.sky, g.bear.y - 150); },
    },
    stomp: {
      sky: 212, dur: 2.6, still: 1.3,
      keys: ['ArrowRight', 'Space'],
      setup(d, g) {
        hunter(g, 'walker', X + 70, -1);
        g.bear.x = X - 110;
      },
      script(d, t, g, dt) {
        const s = g.shooters[0], b = g.bear;
        if (!s.react) s.x -= 28 * dt;
        if (d.once('jump', !s.react && s.x - b.x <= 106)) d.tap('Space');
        d.hold('ArrowRight', within(t, 0.2, 3.4));
      },
    },
    hug: {
      sky: 152, dur: 3.2, still: 1.55,
      keys: ['ArrowRight', 'KeyC'],
      setup(d, g) {
        person(g, 'picker', X + 60, 1);
        g.bear.x = X - 120;
      },
      script(d, t, g) {
        const p = g.people[0], b = g.bear;
        const near = p.x - b.x <= 64;
        d.hold('ArrowRight', t >= 0.2 && !near && !d.done.hug);
        if (d.once('hug', near && !p.react)) d.tap('KeyC');
      },
      people(g) { return g.people.some((p) => p.state === 'flee'); },
      hud(g) { return { goal: ZS.UI.hugGoal(g.stats.hugs + g.stats.selfies) }; },
    },
    shake: {
      sky: 220, dur: 3.3, still: 2.55,
      keys: ['ArrowRight', 'KeyC'],
      x: X + 10,
      setup(d, g) {
        const x = X + 40;
        g.level.posts.push({ x });
        const s = sim.hunters.create(g, 'posed', { x, range: 480 });
        s.cross = x - 1e5;
        g.shooters.push(s);
        g.bear.x = X - 130;
      },
      script(d, t, g) {
        const p = g.level.posts[0], b = g.bear, near = b.x >= p.x - 60;
        d.hold('ArrowRight', t >= 0.2 && !near && !d.done.shake);
        if (d.once('shake', near)) d.tap('KeyC');
      },
    },
    bite: {
      sky: 152, dur: 2.6, still: 1.1,
      keys: ['ArrowRight', 'KeyX'],
      setup(d, g) {
        hunter(g, 'walker', X + 55, -1);
        g.bear.x = X - 115;
      },
      script(d, t, g) {
        const s = g.shooters[0], b = g.bear, near = s.x - b.x <= 68;
        d.hold('ArrowRight', t >= 0.2 && !near && !d.done.bite);
        if (d.once('bite', near && !s.react)) d.tap('KeyX');
        if (g.stats.bites) g.problem = true;
      },
      hud(g) { return { badge: g.problem ? ZS.UI.badges.problem : '' }; },
    },
    forage: {
      sky: 152, dur: 2.1, still: 1.25,
      keys: ['ArrowRight'],
      setup(d, g) {
        g.level.items.push(item('berry', X - 80), item('ants', X - 8), item('mushroom', X + 62));
        g.bear.x = X - 165;
        g.fat = 34;
      },
      script(d, t) { d.hold('ArrowRight', within(t, 0.2, 1.8)); },
      hud(g) { return { bar: 'fat', value: g.fat }; },
    },
    raid: {
      sky: 152, dur: 2.4, still: 1.45,
      keys: ['ArrowRight'],
      setup(d, g) {
        g.level.houses.push({ x: X + 150, w: 150 });
        g.level.items.push(item('bin', X + 5));
        person(g, 'tourist', X + 128, -1).filmCd = 1.15;
        g.bear.x = X - 140;
        g.syn = 12;
      },
      script(d, t, g) {
        const b = g.bear, at = b.x >= X - 8;
        if (at) d.done.stop = true;
        d.hold('ArrowRight', t >= 0.2 && !d.done.stop);
      },
      people() { return true; },
      hud(g) { return { bar: 'fat', value: g.fat }; },
    },
    panic: {
      sky: 184, dur: 3.8, still: 3.3,
      keys: [],
      setup(d, g) {
        person(g, 'tourist', X - 135, 1).filmCd = 0.3;
        person(g, 'tourist', X + 140, -1).filmCd = 0.9;
        g.bear.x = X - 60;
      },
      script(d, t, g) {
        d.hold('ArrowRight', within(t, 0.1, 0.45));
        g.panic = panicAt(t);
        if (d.once('drone', t >= 2.0)) {
          const dr = sim.drones.create(g, 0);
          dr.y = GY - 128;
          g.drones.push(dr);
        }
        for (const dr of g.drones) {
          dr.t = t;
          dr.x = glide(t, 2.0, 3.1, X + 300, g.bear.x + 6) + Math.sin(t * 1.7) * 10 * smooth((t - 3.1) / 0.5);
        }
      },
      people() { return true; },
      hud(g, t) { return { bar: 'panic', value: panicAt(t), badge: g.drones.length ? ZS.UI.badges.drones : '' }; },
    },
  };

  function press(inp, code) {
    if (code === 'Space' || code === 'ArrowUp') { inp.jumpPressed = true; inp.jumpKey = code; }
    if (code === 'KeyX') inp.bitePressed = true;
    if (code === 'KeyC') inp.hugPressed = true;
  }

  function reset(d) {
    d.t = 0; d.acc = 0; d.done = {}; d.flash = {}; d.until = {};
    d.g = world();
    d.def.setup(d, d.g);
    d.g.bear.waking = false;
    d.top = GY - d.def.sky;
    d.g.cam = (d.def.x || X) - d.viewW / 2;
  }

  function create(id, opts) {
    const def = SCENES[id];
    if (!def) return null;
    const d = {
      id, def, touch: !!(opts && opts.touch), t: 0, acc: 0, g: null, done: {}, flash: {}, until: {}, top: 0, viewW: def.sky * 2.4,
      hold(code, on) {
        const keys = d.g.input.keys;
        if (on) keys.add(code);
        else if (!(d.until[code] > d.t)) keys.delete(code);
      },
      tap(code) {
        const c = (d.touch && TOUCH[code]) || code;
        press(d.g.input, c);
        d.flash[c] = d.t + 0.28;
        if (HELD[c]) { d.g.input.keys.add(c); d.until[c] = d.t + HELD[c]; }
      },
      once(name, cond) {
        if (!cond || d.done[name]) return false;
        d.done[name] = true;
        return true;
      },
    };
    reset(d);
    return d;
  }

  function tick(d, dt) {
    const g = d.g, b = g.bear, def = d.def;
    d.t += dt;
    g.time += dt;
    for (const c in d.until) if (d.until[c] <= d.t) { delete d.until[c]; g.input.keys.delete(c); }
    def.script(d, d.t, g, dt);
    sim.bear.update(g, dt);
    sim.encounters.update(g, dt);
    g.cam = (def.x || X) - d.viewW / 2;
    ZS.fx.update(g, dt, d.viewW);
    if (g.fx.parts.length) g.fx.parts = g.fx.parts.filter((p) => p.sh);
    for (const s of g.shooters) {
      if (s.kick > 0) s.kick = Math.max(0, s.kick - dt * 4);
      if (s.react) sim.encounters.reactShooter(g, s, dt);
    }
    g.shooters = g.shooters.filter((s) => !s.dead);
    if (def.people && def.people(g)) sim.people.update(g, dt);
    sim.loop.ageEffects(g, dt);
    g.floaters.length = 0; g.tickerQueue.length = 0; g.bubble = null;
    b.warn = false; b.stamina = 1; b.tired = false;
    const top = def.top ? def.top.call(def, d, g) : GY - def.sky;
    d.top += (top - d.top) * Math.min(1, dt * 5);
  }

  function advance(d, dt) {
    d.acc += Math.min(0.25, Math.max(0, dt || 0));
    while (d.acc >= STEP) {
      d.acc -= STEP;
      tick(d, STEP);
    }
  }

  function seek(d, t) {
    reset(d);
    while (d.t + STEP / 2 < t) tick(d, STEP);
  }

  function still(d) {
    seek(d, d.def.still);
  }

  function draw(d, ctx, w, h, floor) {
    if (!(w > 0 && h > 0)) return;
    const g = d.g, k = (h * (1 - (floor >= 0 && floor < 0.6 ? floor : 0.2))) / d.def.sky, vw = w / k;
    d.viewW = vw;
    g.viewW = vw;
    g.cam = (d.def.x || X) - vw / 2;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ZS.draw(g, ctx, vw, -d.top);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function keysFor(id, touch) {
    const out = [];
    for (const code of SCENES[id].keys) {
      if (touch && code === 'ShiftLeft') continue;
      const c = (touch && TOUCH[code]) || code;
      if (!out.includes(c)) out.push(c);
    }
    return out;
  }

  const keysOf = (d) => keysFor(d.id, d.touch);

  function lit(d) {
    const on = new Set(d.g.input.keys);
    for (const c in d.flash) if (d.flash[c] > d.t) on.add(c);
    return on;
  }

  function hud(d) {
    return d.def.hud ? d.def.hud(d.g, d.t) : null;
  }

  ZS.howto = { ids: Object.keys(SCENES), create, advance, seek, still, draw, keysOf, keysFor, lit, hud };
})();
