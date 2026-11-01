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
    const { ZS, b, L, B, run, hold, press, release } = setup();
    const s = L.salas.strunga, edge = s.x - dir * (s.w / 2 + B.ROOF);
    b.x = edge - dir * 70; b.dir = dir;
    hold(ARROW[dir]);
    run(1.2);

    await t.test(`walking upright ${dir > 0 ? '→' : '←'} stops at the low roof`, () => {
      assert.ok(Math.abs(b.x - edge) < 0.5, 'stopped at ' + (b.x - edge).toFixed(1));
      assert.ok(b.bumpT > 0, 'the crawl hint is up');
      assert.ok(ZS.LABELS.crawlHint.includes('↓'));
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
    b.x = 7150 + rnd() * 850;
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
    const goal = seed % 2 === 0 ? (x) => x < 7050 : (x) => x > 8100;
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
      b.x = back ? 8150 : 7000; b.dir = back ? -1 : 1;
      let shocks = 0, crawled = false;
      run(14, () => {
        if (b.zapT === 0) shocks++;
        crawled = crawled || b.crawl;
        if (back ? b.x < 7000 : b.x > 8150) g.running = false;
      });
      assert.equal(shocks, 0, (back ? '←' : '→') + ' ' + reaction);
      assert.ok(crawled);
      assert.ok(back ? b.x < 7000 : b.x > 8150, 'through the pen: ' + b.x.toFixed(1));
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
