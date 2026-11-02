(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const KNOCK = 0.75, DOOR = 24, EDGE = 6, SAID = 45, REST = 4;
  const T = { open: 1, scare: 1.35, act: 1.55, slam: 2.45, done: 2.7 };
  const WHO = ['granny', 'man', 'kid'];
  const VOICE = { granny: 'f', man: 'm', kid: 'kid' };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const winX = (h, side) => h.x + side * (h.w / 2 - 36);

  function create(g) {
    return { cd: 0, said: -99, last: '', n: 0, list: g.level.houses.map((h, i) => ({ h, i, mode: 'idle', t: 0, side: 1, door: false, who: '', shut: false })) };
  }

  const state = (g) => g.knock || (g.knock = create(g));
  const free = (b) => !b.act && !b.hiding && !b.climbing && b.onGround && !b.stun;

  function near(g) {
    const b = g.bear, k = state(g);
    if (k.cd > 0 || !free(b)) return null;
    for (const o of k.list) if (o.mode === 'idle' && Math.abs(b.x - o.h.x) < o.h.w / 2 - EDGE) return o;
    return null;
  }

  function act(g, b) {
    const o = near(g), k = state(g);
    if (!o) return null;
    const d = b.x - o.h.x;
    o.door = Math.abs(d) < DOOR;
    o.side = o.door ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(d) || 1;
    o.who = pick(WHO.filter((w) => w !== k.last));
    k.last = o.who;
    o.mode = 'knock'; o.t = 0;
    k.cd = REST;
    rules().onSound(g, 'knock', o.door ? o.h.x : winX(o.h, o.side), o.door ? 1 : 0.7);
    rules().quip(g, ZS.QUIPS.knock);
    return { kind: 'knock', t: 0, dur: KNOCK, dir: b.dir, hit: false, target: null, house: o, done: false };
  }

  function scare(g, o) {
    const k = state(g), x = winX(o.h, o.side);
    rules().onSound(g, 'scream', x, VOICE[o.who]);
    rules().spotted(g, x, GY - 132, pick(LABELS.knock[o.who]));
    ZS.sim.hunters.alert(g, g.bear.x);
    const news = g.time - k.said > SAID ? NEWS.knock : null;
    if (news) k.said = g.time;
    rules().addPanic(g, 3, news);
  }

  function slipper(g, o) {
    const b = g.bear, x = winX(o.h, o.side), y = GY - 70, land = b.x - 26 * (Math.sign(b.x - x) || 1), t = 0.47;
    g.props.push({ kind: 'slipper', x, y, vx: (land - x) / t, vy: -200, rot: 0, vr: (land > x ? 1 : -1) * 9, dir: land > x ? 1 : -1, rest: false });
    rules().onSound(g, 'throw', x);
  }

  function step(g, o, dt) {
    if (o.mode === 'idle' || o.mode === 'shut') return;
    const was = o.t;
    o.t += dt;
    const at = (s) => was < s && o.t >= s;
    if (at(T.open)) { o.mode = 'peek'; rules().onSound(g, 'creak', winX(o.h, o.side)); }
    if (at(T.scare)) scare(g, o);
    if (at(T.act) && o.who === 'man') slipper(g, o);
    if (at(T.slam)) { o.shut = true; rules().onSound(g, 'window', winX(o.h, o.side)); }
    if (o.t >= T.done) o.mode = 'shut';
  }

  function update(g, dt) {
    if (!g.level.houses.length) return;
    const k = state(g), b = g.bear;
    k.cd = Math.max(0, k.cd - dt);
    for (const o of k.list) step(g, o, dt);
    const o = near(g);
    if (o && !b.reach && !b.knock) b.knock = { kind: 'house', x: Math.abs(b.x - o.h.x) < DOOR ? o.h.x : winX(o.h, Math.sign(b.x - o.h.x) || 1), o };
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.knock = { update, act, near, create, winX, T, KNOCK };
})();
