(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const REACH = 56, SIDE = 50, SPOT = 22, KNOCK = 0.62, BEAT = 0.42, TASTE = 2.6, SIP = 0.78, BITE = 1.7, REST = 6, TIPSY = 6, HIC = 1.45, SAID = 40;
  const DUCK = { alarm: 0.35, sink: 0.75, shut: 1.05 };
  const VOICE = { punch: 'f', lokse: 'f', sausage: 'm', cheese: 'm' };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function create(g) {
    return { cd: 0, said: -99, list: g.level.stalls.map((s, i) => ({ s, i, kind: s.kind, x: s.x, mode: 'calm', t: 0, face: -1, gift: false })) };
  }

  const state = (g) => g.vendors || (g.vendors = create(g));
  const itemOf = (g, v) => g.level.items.find((it) => it.type === v.kind && Math.abs(it.x - v.x) < 1);
  const free = (b) => !b.act && !b.hiding && !b.climbing && b.onGround && !b.stun;

  function open(g, v) {
    const it = itemOf(g, v);
    return v.mode === 'calm' && !!it && !it.eaten;
  }

  function near(g) {
    const b = g.bear, k = state(g);
    if (k.cd > 0 || !free(b)) return null;
    for (const v of k.list) if (Math.abs(v.x - b.x) < REACH && open(g, v)) return v;
    return null;
  }

  function act(g, b) {
    const v = near(g);
    if (!v) return null;
    const side = Math.sign(b.x - v.x) || -b.dir;
    v.mode = 'wait'; v.t = 0; v.face = side; v.spot = -side * SPOT;
    b.dir = -side;
    state(g).cd = REST;
    rules().onSound(g, 'knock', v.x, 0.5);
    return { kind: 'knock', t: 0, dur: KNOCK, dir: b.dir, hit: false, target: null, stall: v, done: false, to: v.x + side * SIDE };
  }

  function pour(g, v, a) {
    const b = g.bear, k = state(g), it = itemOf(g, v);
    if (it) it.locked = false;
    v.mode = 'pour'; v.t = 0;
    a.next = { kind: 'taste', t: 0, dur: TASTE, dir: b.dir, hit: false, target: null, stall: v, done: false, food: v.kind, to: a.to };
    rules().onSound(g, 'pour', v.x);
    rules().float(g, v.x, GY - 128, pick(LABELS.vendor.pour), COLORS.story);
    if (g.time - k.said > SAID) { k.said = g.time; rules().say(g, NEWS.vendorPour); }
  }

  function duck(g, v) {
    const k = state(g), it = itemOf(g, v);
    v.mode = 'duck'; v.t = 0;
    if (it) it.locked = true;
    rules().onSound(g, 'scream', v.x, VOICE[v.kind]);
    rules().spotted(g, v.x, GY - 128, pick(LABELS.vendor.duck));
    ZS.sim.hunters.alert(g, g.bear.x);
    const news = g.time - k.said > SAID ? NEWS.vendorDuck : null;
    if (news) k.said = g.time;
    rules().addPanic(g, 4, news);
  }

  function taste(g, v, a) {
    const b = g.bear;
    if (!a.sipped && a.t >= SIP) {
      a.sipped = true;
      b.tipsy = TIPSY; b.hicT = HIC * 0.6;
      rules().onSound(g, 'gulp', b.x);
      rules().quip(g, ZS.QUIPS.tipsy, true);
    }
    if (!a.bit && a.t >= BITE) {
      a.bit = true;
      const it = itemOf(g, v);
      if (it && !it.eaten) { it.gift = true; rules().eat(g, it); }
    }
  }

  function step(g, v, dt) {
    const b = g.bear, a = b.act;
    v.t += dt;
    if (a && a.stall === v && a.to !== undefined) b.x += (a.to - b.x) * Math.min(1, dt * 9);
    if (v.mode === 'wait') {
      if (v.t >= BEAT) { if (Math.random() < 0.5 && a && a.stall === v) pour(g, v, a); else duck(g, v); }
    } else if (v.mode === 'pour') {
      if (a && a.kind === 'taste' && a.stall === v) taste(g, v, a);
      else if (v.t > KNOCK + 0.2) v.mode = 'done';
    } else if (v.mode === 'duck') {
      if (v.t >= DUCK.shut && !v.slam) { v.slam = true; rules().onSound(g, 'window', v.x); ZS.fx.dust(g, v.x, GY - 50, 3); }
      if (v.t >= DUCK.shut + 0.2) v.mode = 'shut';
    } else if (v.mode === 'calm') {
      const it = itemOf(g, v);
      if (it && it.eaten) { v.mode = 'hid'; v.t = 0; rules().onSound(g, 'scream', v.x, VOICE[v.kind]); }
    }
  }

  function tipsy(g, b, dt) {
    if (!(b.tipsy > 0)) return;
    b.tipsy = Math.max(0, b.tipsy - dt);
    b.hicT -= dt;
    if (b.hicT <= 0 && b.tipsy > 0.4) { b.hicT = HIC; b.hicAt = g.time; rules().onSound(g, 'hiccup', b.x); }
  }

  function update(g, dt) {
    const b = g.bear;
    b.knock = null;
    tipsy(g, b, dt);
    if (g.level.id === 'winter' && !g.once.map && b.x > g.level.village.from) { g.once.map = true; rules().say(g, NEWS.mikulasMap); }
    if (!g.level.stalls.length) return;
    const k = state(g);
    k.cd = Math.max(0, k.cd - dt);
    for (const v of k.list) step(g, v, dt);
    const v = near(g);
    if (v && !b.reach) b.knock = { kind: 'stall', x: v.x, o: v };
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.vendors = { update, act, near, create, REACH, TIPSY, DUCK, BEAT, SIP, BITE, TASTE };
})();
