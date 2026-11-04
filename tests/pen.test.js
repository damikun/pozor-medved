'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');
const { createCanvas, stackDepth } = require('./helpers/mock-canvas');

const DT = 1 / 60;
const ARROW = { 1: 'ArrowRight', [-1]: 'ArrowLeft' };

function setup(seed = 6, withRenderer = false) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state);
  const news = [];
  ZS.sim.rules.onNews = (item) => news.push(item.text);
  g.running = true;
  g.nextEvent = 1e9;
  g.time = 130;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  const each = [() => { if (g.people.length) g.people = []; }];
  const run = (seconds, fn) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over && g.running; i++) {
      ZS.sim.loop.step(g, DT);
      for (const f of each) f();
      if (fn) fn(i);
    }
  };
  return {
    ZS, g, b: g.bear, L: g.level, run, news, each, problems, input,
    B: ZS.sim.bear, GY: ZS.CFG.GROUND,
    press: (key) => input.press(key, false),
    hold: (key) => input.press(key, true),
    release: input.release,
  };
}

const SIDES = [['left fence from outside', 0, 1], ['left fence from inside', 0, -1], ['right fence from inside', 1, 1], ['right fence from outside', 1, -1]];

for (const [name, i, dir] of SIDES) {
  test(`walking into the ${name} is blocked, shocks the bear and throws it back`, async (t) => {
    const { ZS, g, b, L, B, run, hold, news } = setup();
    const fx = L.salas.fences[i], ahead = () => (b.x - fx) * dir;
    b.x = fx - dir * 160; b.dir = dir;
    hold(ARROW[dir]);
    let furthest = -Infinity, buzz = false, shockAt = null;
    run(0.9, () => {
      furthest = Math.max(furthest, ahead());
      buzz = buzz || g.floaters.some((f) => f.text === ZS.LABELS.zap);
      if (shockAt === null && b.stun > 0) shockAt = ahead();
    });

    await t.test('the bear never gets past the wire and stops with its nose on it', () => {
      assert.ok(furthest <= -B.FENCE.nose + 0.01, 'got to ' + furthest.toFixed(1));
      assert.ok(shockAt !== null, 'no shock');
      assert.ok(shockAt > -B.FENCE.nose - 6, 'shocked too early, at ' + shockAt.toFixed(1));
    });

    await t.test('the shock buzzes, makes the bear say something and puts it in the news', () => {
      assert.ok(buzz);
      assert.ok(g.bubble && ZS.QUIPS.zap.includes(g.bubble.text), g.bubble && g.bubble.text);
      assert.ok(news.concat(g.tickerQueue.map((q) => q.text)).includes(ZS.NEWS.zap[0]), 'the shock is in the news');
      assert.equal(g.lives, ZS.CFG.LIVES, 'it costs no life');
    });

    await t.test('the bear is thrown back and cannot move for a moment', () => {
      b.stun = 0; b.zapT = 9;
      b.x = fx - dir * 120; b.dir = dir;
      let start = null, back = 0, frozen = 0, done = false;
      run(1.6, () => {
        if (b.stun > 0 && !done) {
          if (start === null) start = ahead();
          back = Math.max(back, start - ahead());
          frozen += DT;
        } else if (start !== null) {
          done = true;
        }
      });
      assert.ok(back >= 45, 'thrown back ' + back.toFixed(1));
      assert.ok(Math.abs(frozen - B.FENCE.stun) < 0.05, 'stunned for ' + frozen.toFixed(2) + ' s');
    });
  });
}

for (const [name, i, dir] of SIDES) {
  test(`a walking or running jump clears the ${name}`, () => {
    for (const [run1, d] of [[false, 64], [true, 64], [true, 110]]) {
      const { b, L, run, hold, press } = setup();
      const fx = L.salas.fences[i];
      b.x = fx - dir * d; b.dir = dir;
      if (run1) hold('ShiftLeft');
      hold(ARROW[dir]);
      press('Space');
      let shocked = false;
      run(1.0, () => { shocked = shocked || b.stun > 0; });
      assert.ok(!shocked, (run1 ? 'running' : 'walking') + ' jump from ' + d + ' px got shocked');
      assert.ok((b.x - fx) * dir > 30, 'landed on the other side: ' + (b.x - fx).toFixed(1));
    }
  });
}

test('a hop that comes down on the wire shocks the bear and throws it clear instead of sticking it to the fence', () => {
  for (const [i, dir] of [[0, 1], [1, -1]]) {
    const { b, L, B, run, hold, press, release } = setup();
    const fx = L.salas.fences[i];
    b.x = fx - dir * 135; b.dir = dir;
    hold(ARROW[dir]);
    press('Space');
    let inAir = null;
    run(1.0, () => { if (inAir === null && b.stun > 0) inAir = !b.onGround && b.vy < 0; });
    assert.ok(inAir, 'the bear came down on the wire and was thrown up');
    release(ARROW[dir]);
    run(0.6);
    assert.ok(b.onGround && b.stun === 0, 'back on its feet');
    assert.ok(!B.touching(b, b.x, fx), 'not touching the wire: ' + (b.x - fx).toFixed(1));
    const x0 = b.x;
    hold(ARROW[-dir]);
    run(0.5);
    assert.ok((x0 - b.x) * dir > 60, 'walks away freely');
  }
});

test('the strunga stops an upright bear and lets a crawling one through, both ways', async (t) => {
  for (const dir of [1, -1]) {
    const { ZS, g, b, L, B, run, hold, press, release } = setup(6, true);
    const s = L.salas.strunga, edge = s.x - dir * (s.w / 2 + B.ROOF);
    b.x = edge - dir * 70; b.dir = dir;
    hold(ARROW[dir]);
    run(1.2);

    await t.test(`walking upright ${dir > 0 ? '→' : '←'} stops at the low roof`, () => {
      assert.ok(Math.abs(b.x - edge) < 0.5, 'stopped at ' + (b.x - edge).toFixed(1));
      assert.ok(b.bumpT > 0, 'the crawl hint is up');
      assert.equal(JSON.stringify(ZS.render.cue(g)), JSON.stringify([['ArrowDown', ZS.LABELS.crawlHint]]));
    });

    await t.test('jumping does not get over it', () => {
      press('Space');
      run(1.0);
      assert.ok((b.x - edge) * dir <= 0.5, String(b.x - edge));
    });

    await t.test('↓ crawls under without hiding and the bear stays low until it is out', () => {
      hold('ArrowDown');
      let hid = false, upright = 0, jumped = false, released = false;
      run(4.5, (i) => {
        hid = hid || !!b.hiding;
        const inside = Math.abs(b.x - s.x) < s.w / 2 + B.ROOF;
        if (inside && !b.crouch) upright++;
        if (inside && !released && Math.abs(b.x - s.x) < 10) {
          released = true;
          release('ArrowDown');
          press('Space');
        }
        if (inside && !b.onGround) jumped = true;
      });
      assert.ok(released, 'reached the middle');
      assert.ok(!hid, 'no thick tree or hay near the strunga');
      assert.equal(upright, 0, 'frames upright under the roof');
      assert.ok(!jumped, 'no jumping under the roof');
      assert.ok((b.x - s.x) * dir > s.w / 2 + B.ROOF, 'out on the other side: ' + (b.x - s.x).toFixed(1));
    });
  }
});

test('hay hides the bear like a thick trunk: hunters and drones lose it and it comes out on release', async (t) => {
  const { ZS, g, b, L, B, run, hold, release } = setup();
  const hx = L.haystacks[1];
  b.x = hx + 30; b.dir = -1;
  hold('ArrowDown');
  run(0.6);

  await t.test('↓ at a haystack burrows in', () => {
    assert.ok(b.hiding && b.hiding.hay, 'hiding in hay');
    assert.equal(b.hiding.x, hx);
    assert.ok(b.covered);
    assert.equal(b.pose, 'hay');
    assert.ok(Math.abs(b.x - hx) < 1);
    assert.ok(B.spots(L).includes(b.hiding), 'haystacks are cover spots');
  });

  const s = ZS.sim.hunters.create(g, 'walker', { x: hx + 200, dir: -1, from: hx + 100, to: hx + 300 });
  s.pause = 99; s.cross = hx;
  g.shooters = [s];
  g.drones = [ZS.sim.drones.create(g, 0)];
  g.drones[0].x = hx;
  const seen = g.stats.seen;

  await t.test('a hunter with the crosshair on the stack and a drone overhead do not see the bear', () => {
    let lock = 0;
    run(4, () => { lock = Math.max(lock, s.lock); g.drones[0].x = hx; });
    assert.equal(lock, 0);
    assert.equal(g.lives, ZS.CFG.LIVES);
    assert.equal(g.stats.seen, seen);
  });

  await t.test('releasing ↓ comes out and the hunter can see the bear again', () => {
    g.drones = [];
    release('ArrowDown');
    run(DT * 2);
    assert.ok(!b.hiding && !b.covered);
    let lock = 0;
    s.cross = b.x;
    run(0.6, () => { lock = Math.max(lock, s.lock); });
    assert.ok(lock > 0, 'the hunter aims again');
  });

  await t.test('a shot fired at the stack hits the hay', () => {
    hold('ArrowDown');
    run(0.5);
    s.lock = s.aimTime * 0.9; s.reload = 0; s.cross = b.x;
    run(DT * 2);
    assert.ok(g.floaters.some((f) => f.text === ZS.LABELS.hayHit), g.floaters.map((f) => f.text).join(' | '));
    assert.equal(g.lives, ZS.CFG.LIVES);
  });
});

test('the bear never gets stuck at the pen, whatever keys are mashed', () => {
  const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ShiftLeft', 'Space', 'ArrowUp'];
  for (let seed = 1; seed <= 8; seed++) {
    const { ZS, g, b, L, B, run, hold, release, input } = setup(seed);
    const rnd = ZS.util.mulberry32(seed * 97);
    b.x = 9090 + rnd() * 850;
    let bad = null;
    const check = () => {
      if (b.stun > B.FENCE.stun + 1e-9) bad = 'stun ' + b.stun;
      if (!b.stun && b.onGround && !b.act && B.fences(L).some((fx) => B.touching(b, b.x, fx))) bad = 'standing on the wire at ' + b.x.toFixed(1);
      const s = L.salas.strunga;
      if (b.onGround && !b.crouch && !b.stun && Math.abs(b.x - s.x) < s.w / 2 + B.ROOF - 0.5) bad = 'upright under the roof at ' + b.x.toFixed(1);
    };
    for (let k = 0; k < 160 && !bad; k++) {
      for (const key of KEYS) if (rnd() < 0.35) hold(key); else release(key);
      if (rnd() < 0.3) input.press('Space', false);
      run(0.25, check);
    }
    assert.equal(bad, null, 'seed ' + seed);
    for (const key of KEYS) release(key);
    g.bot = true;
    g.pilot = { t: 0, danger: 0, wait: 0, bold: 0, alarm: -9, back: seed % 2 === 0 };
    const goal = seed % 2 === 0 ? (x) => x < 8990 : (x) => x > 10040;
    run(30, () => { check(); if (goal(b.x)) g.running = false; });
    g.bot = false;
    assert.ok(goal(b.x), `seed ${seed}: the autopilot got out of the pen, x = ${b.x.toFixed(1)}`);
    assert.equal(bad, null, 'seed ' + seed);
  }
});

test('the autopilot jumps both fences cleanly and crawls through the strunga, both ways', () => {
  for (const back of [false, true]) {
    for (const reaction of [0.25, 0.6]) {
      const { ZS, g, b, run } = setup(3);
      ZS.dev.bot.reaction = reaction;
      g.bot = true;
      g.pilot = { t: 0, danger: 0, wait: 0, bold: 0, alarm: -9, back };
      b.x = back ? 10040 : 8940; b.dir = back ? -1 : 1;
      let shocks = 0, crawled = false;
      run(14, () => {
        if (b.zapT === 0) shocks++;
        crawled = crawled || b.crawl;
        if (back ? b.x < 8940 : b.x > 10040) g.running = false;
      });
      assert.equal(shocks, 0, (back ? '←' : '→') + ' ' + reaction);
      assert.ok(crawled);
      assert.ok(back ? b.x < 8940 : b.x > 10040, 'through the pen: ' + b.x.toFixed(1));
    }
  }
});

test('the pen, a shock, the crawl and hiding in hay draw cleanly frame by frame', () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 3]]) {
    const { ZS, g, b, L, run, hold, release, problems, each } = setup(2, true);
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.viewW = viewW;
    each.push(() => {
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, viewW, offY);
      assert.equal(stackDepth(ctx), 0);
    });
    b.x = L.salas.fences[0] - 140; b.dir = 1;
    hold('ArrowRight');
    run(2.2);
    release('ArrowRight');
    run(0.4);
    b.x = L.salas.strunga.x - 140;
    hold('ArrowRight'); hold('ArrowDown');
    run(3.5);
    release('ArrowRight'); release('ArrowDown');
    b.x = L.haystacks[1] + 20;
    run(0.2);
    hold('ArrowDown');
    run(1.5);
    release('ArrowDown');
    hold('ArrowRight');
    run(1);
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});

function crowd(seed = 4, withRenderer = false) {
  const problems = [];
  const ZS = loadGame({ seed, withRenderer, problems });
  const { input } = ZS.ui;
  const g = ZS.sim.rules.create(input.state, { viewW: 960 });
  g.running = true;
  g.nextEvent = 1e9;
  g.time = 130;
  g.bear.waking = false;
  g.shooters = []; g.people = []; g.dogs = []; g.sheep = []; g.deer = []; g.drones = [];
  const P = ZS.sim.pen, L = g.level, F = L.salas.fences;
  const run = (seconds, fn) => {
    for (let i = 0; i < Math.round(seconds / DT) && !g.over; i++) {
      ZS.sim.loop.step(g, DT);
      if (fn && fn(i) === false) return;
    }
  };
  const park = (x) => { g.bear.x = x; g.bear.trackX = x; g.bear.dir = 1; };
  return { ZS, g, b: g.bear, L, P, F, run, park, input, problems, band: (m) => P.band(L, m) };
}

test('walking hunters whose beat crosses the pen stop at the wire, look over, turn back and never step in', () => {
  const { ZS, g, P, F, run, park, band } = crowd();
  const H = band(P.KEEP.hunter);
  park(9540);
  g.courtUntil = 1e9;
  const left = ZS.sim.hunters.create(g, 'walker', { x: 8940, from: 8740, to: 9740, dir: 1 });
  const right = ZS.sim.hunters.create(g, 'walker', { x: 10090, from: 9340, to: 10340, dir: -1 });
  assert.ok(left.to <= H[0] && right.from >= H[1], `beats ${left.from}-${left.to} and ${right.from}-${right.to}`);
  g.shooters = [left, right];
  const seen = new Map(g.shooters.map((s) => [s, { turns: 0, flips: [], last: s.dir, looked: 0 }]));
  run(120, () => {
    for (const s of g.shooters) {
      const o = seen.get(s);
      assert.ok(!P.inside(g.level, s.x, P.KEEP.hunter - 1e-6), 'a hunter stepped into the pen at ' + s.x.toFixed(1));
      const atWire = Math.abs(s.x - (s === left ? H[0] : H[1])) < 1;
      if (atWire && s.flip && s.dir === (s === left ? 1 : -1)) o.looked += DT;
      if (s.dir !== o.last) { o.flips.push(g.time); if (atWire) o.turns++; o.last = s.dir; }
    }
  });
  for (const [s, o] of seen) {
    assert.ok(o.turns >= 2, `${s === left ? 'left' : 'right'} hunter turned at the wire ${o.turns} times`);
    assert.ok(o.looked > 0.8, 'he stops and looks over the wire for ' + o.looked.toFixed(2) + ' s');
    for (let i = 1; i < o.flips.length; i++) assert.ok(o.flips[i] - o.flips[i - 1] > 0.3, 'no jitter: turns ' + o.flips.slice(i - 1, i + 1).map((t) => t.toFixed(2)).join(' → '));
  }
  assert.ok(F[0] - left.to >= P.KEEP.hunter && right.from - F[1] >= P.KEEP.hunter);
});

test('hunters sent ahead by politics, poachers and a feeding stand never land in or across the pen', () => {
  for (let seed = 1; seed <= 6; seed++) {
    for (let x = 7740; x <= 10240; x += 125) {
      const { ZS, g, L, P, park, band } = crowd(seed);
      const H = band(P.KEEP.hunter);
      park(x);
      g.panic = 90;
      ZS.sim.politics.escalate(g);
      g.usedEvents = new Set(['wrongbear', 'court', 'meat', 'bins', 'census', 'constitution', 'feeding']);
      g.nextEvent = 0;
      ZS.sim.politics.randomEvents(g, DT);
      g.usedEvents.delete('feeding'); g.usedEvents.add('poacher');
      g.nextEvent = 0;
      ZS.sim.politics.randomEvents(g, DT);
      const kinds = g.shooters.map((s) => s.kind).sort().join(',');
      assert.equal(kinds, 'poacher,posed,walker,walker,walker,walker', kinds);
      for (const s of g.shooters) {
        assert.ok(!P.inside(L, s.x, P.KEEP.hunter), `seed ${seed}, bear ${x}: ${s.kind} at ${s.x.toFixed(0)}`);
        if (s.from !== null) assert.ok(s.to <= H[0] || s.from >= H[1], `seed ${seed}, bear ${x}: beat ${s.from.toFixed(0)}-${s.to.toFixed(0)}`);
      }
      const post = L.posts[L.posts.length - 1];
      assert.ok(post.x < H[0] - 34 || post.x > H[1] + 34, 'the stand is out of the pen: ' + post.x);
      assert.ok(post.x + 34 < L.river.from || post.x - 34 > L.river.to, 'the stand is out of the river: ' + post.x);
    }
  }
});

test('hunters chasing, fleeing, scared or leaving stop at the wire without jitter and the ZTMH waits on its side', async (t) => {
  await t.test('the ZTMH stops at the wire facing the bear and leaves on its own side', () => {
    for (const [from, bear, side] of [[8740, 10240, -1], [10440, 8840, 1]]) {
      const { ZS, g, P, run, park, band } = crowd();
      const H = band(P.KEEP.hunter);
      park(bear);
      g.problem = true; g.syn = 90; g.courtUntil = 1e9;
      const s = ZS.sim.hunters.create(g, 'ztmh', { x: from, dir: -side });
      g.shooters = [s];
      let still = 0, moved = 0, last = s.x;
      run(10, () => {
        assert.ok(!P.inside(g.level, s.x, P.KEEP.hunter - 1e-6), 'the ZTMH stepped in at ' + s.x.toFixed(1));
        const wire = side < 0 ? H[0] : H[1];
        if (Math.abs(s.x - wire) < 0.01) { still += DT; if (Math.abs(last - wire) < 0.01 && Math.abs(s.x - last) > 1e-9) moved++; }
        last = s.x;
        g.syn = 90;
      });
      assert.ok(still > 5, 'waited at the wire ' + still.toFixed(1) + ' s');
      assert.equal(moved, 0, 'no jitter at the wire');
      assert.equal(s.dir, -side, 'it faces the bear across the pen');
      g.problem = false; g.syn = 0;
      run(12, () => { assert.ok(s.dead || !P.inside(g.level, s.x, P.KEEP.hunter - 1e-6)); return !s.dead; });
      assert.ok(s.dead, 'the ZTMH left the scene, x = ' + s.x.toFixed(0));
    }
  });

  await t.test('a scared, a fleeing and a leaving hunter turn at the wire instead of running in', () => {
    for (const mode of ['scared', 'flee', 'gone', 'poacher']) {
      const { ZS, g, P, run, park, band } = crowd();
      const H = band(P.KEEP.hunter);
      park(8340);
      g.courtUntil = 1e9;
      const s = ZS.sim.hunters.create(g, mode === 'poacher' ? 'poacher' : 'walker', { x: 9040, from: 8640, to: 9140, dir: 1 });
      if (mode === 'scared') s.scaredT = 4;
      if (mode === 'flee' || mode === 'gone') { s.react = mode; s.reactT = 0; }
      if (mode === 'poacher') { s.from = null; s.to = null; }
      g.shooters = [s];
      let stuck = 0;
      run(8, () => {
        assert.ok(s.dead || !P.inside(g.level, s.x, P.KEEP.hunter - 1e-6), mode + ' stepped in at ' + s.x.toFixed(1));
        if (Math.abs(s.x - H[0]) < 0.01) stuck += DT;
        return !s.dead;
      });
      assert.ok(stuck < 2.5, `${mode}: stood at the wire for ${stuck.toFixed(1)} s`);
      assert.ok(s.dead || s.x < H[0] - 20, `${mode}: walked away from the wire, x = ${s.x.toFixed(0)}`);
    }
  });
});

test('a rifle knocked toward the pen never lands inside and the hunter fetches it from his side', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const { ZS, g, b, L, P, run, band } = crowd(seed);
    const H = band(P.KEEP.hunter);
    g.courtUntil = 1e9;
    const s = ZS.sim.hunters.create(g, 'walker', { x: H[0], from: 8740, to: 9340, dir: 1 });
    s.pause = 99;
    g.shooters = [s];
    b.x = s.x - 22; b.trackX = b.x; b.dir = 1; b.onGround = false; b.prevY = ZS.CFG.GROUND - 120; b.y = ZS.CFG.GROUND - 76; b.vy = 300;
    ZS.sim.encounters.update(g, DT);
    assert.equal(s.react, 'down', 'the hunter went down');
    const rifle = g.props.find((p) => p.kind === 'rifle');
    assert.ok(rifle);
    b.x = 8240; b.trackX = 8240;
    run(14, () => {
      assert.ok(!P.inside(L, s.x, P.KEEP.hunter - 1e-6), 'the hunter stepped in at ' + s.x.toFixed(1));
      assert.ok(!P.inside(L, rifle.x, 0), 'the rifle flew into the pen');
      return !s.armed;
    });
    assert.ok(!P.inside(L, rifle.x, P.KEEP.hunter), `seed ${seed}: the rifle rests at ${rifle.x.toFixed(0)}`);
    assert.ok(s.armed || s.react === 'gone', `seed ${seed}: ${s.react}`);
  }
});

test('the sheepdog jumps the wire on its rounds, in and out of the pen, and never touches it', () => {
  const { g, P, F, run, park } = crowd();
  park(7540);
  const { ZS } = crowd();
  g.dogs = [ZS.sim.wildlife.createDog({ from: 9090, to: 9890 }, g.level)];
  const d = g.dogs[0];
  const over = [0, 0], peak = [0, 0];
  let prev = d.x, gathered = 0, ground = Infinity;
  run(150, () => {
    F.forEach((fx, i) => {
      if ((prev - fx) * (d.x - fx) < 0) over[i]++;
      if (Math.abs(d.x - fx) < 26) {
        assert.ok(d.y >= 50, `the dog touched the wire at ${(d.x - fx).toFixed(1)} px, ${d.y.toFixed(1)} px up`);
        peak[i] = Math.max(peak[i], d.y);
      }
      if (!d.leap) ground = Math.min(ground, Math.abs(d.x - fx));
    });
    if (d.leap && d.leap.phase === 'gather') gathered++;
    prev = d.x;
  });
  assert.ok(over[0] >= 4 && over[1] >= 4, 'crossed the wires ' + over.join(' and ') + ' times');
  assert.ok(peak[0] > 55 && peak[1] > 55, 'leaps up to ' + peak.map((v) => v.toFixed(0)).join(' and ') + ' px');
  assert.ok(gathered > 4, 'it crouches before the leap');
  assert.ok(ground >= P.LEAP.reach - 4, 'it never stands by the wire: ' + ground.toFixed(1));
});

test('the sheepdog still barks at the bear and follows it over the wire into the pen', () => {
  const { ZS, g, b, F, run, park } = crowd();
  park(9460);
  g.dogs = [ZS.sim.wildlife.createDog({ from: 9090, to: 9890 }, g.level)];
  const d = g.dogs[0];
  Object.assign(d, { x: 9080, dir: 1 });
  const seen = g.stats.seen;
  let leapt = false, barked = false;
  run(6, () => {
    leapt = leapt || !!d.leap;
    barked = barked || g.floaters.some((f) => f.text === ZS.LABELS.dogBark);
    if (Math.abs(d.x - F[0]) < 26) assert.ok(d.y >= 50);
  });
  assert.ok(leapt, 'the dog jumped the wire');
  assert.ok(barked && g.stats.seen > seen, 'it barked and the bear counts as seen');
  assert.ok(d.x > F[0] + 60 && Math.abs(d.x - b.x) < 170, 'it stands by the bear inside the pen at ' + d.x.toFixed(0));
});

test('koliba guests who run for the pen hurdle the wire, cross without stopping and hurdle out', () => {
  let crossed = 0, waiters = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const { ZS, g, b, L, P, F, run, park, input } = crowd(seed);
    park(8800);
    input.press('ArrowRight', true);
    run(0.4);
    input.release('ArrowRight');
    const track = new Map();
    run(12, () => {
      for (const p of g.people) {
        if (!p.koliba) continue;
        const o = track.get(p) || { inside: 0, enter: null, out: false, prev: p.x, air: false };
        track.set(p, o);
        for (const fx of F) {
          if (Math.abs(p.x - fx) < 14) assert.ok(p.hurdle && p.hurdle.lift >= 30, `seed ${seed}: ${p.kind} at the wire ${(p.x - fx).toFixed(1)} with lift ${p.hurdle ? p.hurdle.lift.toFixed(1) : 0}`);
        }
        if (P.inside(L, p.x, 0)) {
          if (o.enter === null) o.enter = g.time;
          o.inside += DT;
          if (!p.hurdle && !o.air) assert.ok(Math.abs(p.x - o.prev) / DT > 200, `seed ${seed}: ${p.kind} slowed down in the pen`);
          assert.ok(!p.react && p.state === 'flee', 'nobody stops in the pen');
        } else if (o.enter !== null && p.x > F[1]) o.out = true;
        o.prev = p.x; o.air = !!p.hurdle;
      }
      if (b.x > 8890) b.x = 8800;
    });
    for (const [p, o] of track) {
      if (o.enter === null) continue;
      crossed++;
      if (p.kind === 'waiter') waiters++;
      assert.ok(o.out, `seed ${seed}: ${p.kind} got out of the pen`);
      assert.ok(o.inside < 3.2, `seed ${seed}: ${p.kind} spent ${o.inside.toFixed(2)} s in the pen`);
    }
    const lo = F[0] - 70, hi = F[1] + 70;
    for (const it of L.items) if (it.type === 'halusky') assert.ok(it.x <= lo || it.x >= hi, `seed ${seed}: halušky at ${it.x.toFixed(0)}`);
  }
  assert.ok(crossed >= 10 && waiters >= 1, `${crossed} guests crossed, ${waiters} waiters`);
});

test('pickers fleeing toward the pen hurdle it too, while walking and leaving people turn at the wire', async (t) => {
  await t.test('a picker who sees the bear runs off and hurdles both wires', () => {
    const { ZS, g, P, F, run, park } = crowd();
    park(8440);
    const p = ZS.sim.people.create(g, 'picker', { from: 8640, to: 8840 });
    Object.assign(p, { x: 8690, dir: -1 });
    g.people = [p];
    let hurdles = 0, was = false;
    run(8, () => {
      if (p.hurdle && !was) hurdles++;
      was = !!p.hurdle;
      for (const fx of F) if (Math.abs(p.x - fx) < 14) assert.ok(p.hurdle && p.hurdle.lift >= 30);
      return !p.dead;
    });
    assert.equal(hurdles, 2);
    assert.ok(p.dead || p.x > F[1] + P.HURDLE.land - 1);
  });

  await t.test('tourists and pickers on a beat by the pen and a texting tourist walking off turn at the wire', () => {
    const { ZS, g, L, P, run, park, band } = crowd();
    const H = band(P.KEEP.person);
    park(8040);
    const a = ZS.sim.people.create(g, 'tourist', { from: 8840, to: 9640 });
    const c = ZS.sim.people.create(g, 'picker', { from: 9540, to: 10240 });
    const e = ZS.sim.people.create(g, 'tourist', { from: 8940, to: 9040 });
    Object.assign(e, { x: 9040, dir: 1, leaving: true, texting: true, state: 'walk' });
    assert.ok(a.to <= H[0] && c.from >= H[1], `beats ${a.from}-${a.to}, ${c.from}-${c.to}`);
    g.people = [a, c, e];
    let turned = false;
    run(60, () => {
      for (const p of g.people) assert.ok(!P.inside(L, p.x, P.KEEP.person - 1e-6), p.kind + ' walked into the pen at ' + p.x.toFixed(1));
      turned = turned || e.dir < 0;
      g.bear.x = 8040;
    });
    assert.ok(turned, 'the texting tourist turned at the wire');
  });

  await t.test('the bear cannot grab anybody across the wire or in mid-jump', () => {
    const { ZS, g, b, P, F, park } = crowd();
    const p = ZS.sim.people.create(g, 'tourist', { from: 8740, to: 9140 });
    Object.assign(p, { x: P.band(g.level, P.KEEP.person)[0], dir: 1, pause: 99 });
    g.people = [p];
    park(F[0] + 41); b.dir = -1;
    assert.ok(Math.abs(p.x - b.x) < ZS.CFG.REACH);
    assert.equal(ZS.sim.encounters.target(g), null);
    park(F[0] - 60); b.dir = 1;
    Object.assign(p, { x: F[0] - 20, state: 'flee' });
    P.hurdleAt(p, F[0], 1);
    assert.equal(ZS.sim.encounters.target(g), null);
  });
});

test('the dog leaping, a guest hurdling and a hunter turning at the wire draw cleanly', () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 3]]) {
    const { ZS, g, problems, run, park, input } = crowd(5, true);
    const scale = Math.min(h / 540, w / (h > w ? 480 : 760)), viewW = w / scale, offY = (h / scale - 540) * 0.45;
    const ctx = createCanvas(w * dpr, h * dpr, problems).getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.viewW = viewW;
    g.courtUntil = 1e9;
    g.dogs = [ZS.sim.wildlife.createDog({ from: 9090, to: 9890 }, g.level)];
    Object.assign(g.dogs[0], { x: 9100, dir: 1 });
    g.shooters = [ZS.sim.hunters.create(g, 'walker', { x: 9040, from: 8840, to: 9540, dir: 1 })];
    const picker = ZS.sim.people.create(g, 'picker', { from: 8930, to: 9040 });
    Object.assign(picker, { x: 8940, state: 'flee', dir: 1 });
    g.people = [picker];
    park(8800);
    input.press('ArrowRight', true);
    let leaps = 0, hurdles = 0;
    run(9, (i) => {
      if (i === 24) input.release('ArrowRight');
      if (g.bear.x > 8890) g.bear.x = 8800;
      if (g.dogs[0].leap) leaps++;
      if (g.people.some((p) => p.hurdle)) hurdles++;
      g.cam = ZS.sim.loop.cameraX(g);
      ZS.draw(g, ctx, viewW, offY);
      assert.equal(stackDepth(ctx), 0);
    });
    assert.ok(leaps > 10 && hurdles > 10, `${leaps} leap frames, ${hurdles} hurdle frames`);
    assert.deepEqual(problems.slice(0, 5), [], `${problems.length} bad canvas calls at ${w}x${h}`);
  }
});
