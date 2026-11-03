(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const SEE = 200, SPRINT = 300, NOISE = 560, AWAY = 1300, BACK = 35, BRUSH = 22, FALL = 0.55, SAID = 30, AIM = 0.5, LOOK = 2;
  const { hash } = ZS.util;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function inside(L, x) {
    const o = L && L.lot;
    return !!o && x > o.front[0] - 30 && x < o.front[o.front.length - 1] + 30;
  }

  function create(g) {
    const o = g.level.lot;
    return {
      seller: 'calm', goneAt: -99, person: null, noise: null, said: {},
      front: o.front.map((x) => ({ x, h: 54 + 14 * hash(x * 0.37), sway: 0, v: 0, down: false, fall: 0, dir: 1, brushed: false })),
    };
  }

  function topple(g, k, t, dir) {
    t.down = true; t.dir = dir; t.fall = 0; t.sway = 0; t.v = 0;
    k.noise = t.x;
    rules().onSound(g, 'lotTopple', t.x);
    ZS.fx.dust(g, t.x + dir * 30, GY, 4);
    ZS.sim.hunters.alert(g, t.x);
    if (!(g.time - k.said.crash < 2)) { k.said.crash = g.time; rules().float(g, t.x, GY - 96, LABELS.lot.topple, COLORS.story); }
    if (!(g.time - k.said.topple < SAID)) { k.said.topple = g.time; rules().addPanic(g, 3, NEWS.lotTopple); }
  }

  function tree(g, k, t, b, dt) {
    if (t.down) { t.fall = Math.min(1, t.fall + dt / FALL); return; }
    const d = b.x - t.x, near = b.onGround && !b.climbing && Math.abs(d) < BRUSH;
    if (near && b.running && b.moving) { topple(g, k, t, b.dir); return; }
    const aim = near && b.moving ? b.dir * 0.3 * (1 - Math.abs(d) / BRUSH) : 0;
    t.v += (70 * (aim - t.sway) - 7 * t.v) * dt;
    t.sway += t.v * dt;
    if (near && b.moving && !t.brushed) rules().onSound(g, 'lotRustle', t.x);
    t.brushed = near && b.moving;
  }

  function flee(g, k, b) {
    const x = g.level.lot.seller, dir = Math.sign(x - b.x) || 1;
    const p = ZS.sim.people.create(g, 'guest', { from: x, to: x });
    Object.assign(p, { x, dir, state: 'flee', as: 'seller', h: { aimAt: [0, 0], look: LOOK } });
    g.people.push(p);
    k.person = p; k.seller = 'gone'; k.goneAt = g.time;
    rules().onSound(g, 'lotSeller', x);
    rules().spotted(g, x, GY - 120, pick(LABELS.lot.shout));
    ZS.sim.hunters.alert(g, b.x);
    rules().addPanic(g, 6, NEWS.lotSeller);
  }

  function restock(k) {
    k.seller = 'calm'; k.person = null;
    for (const t of k.front) Object.assign(t, { down: false, fall: 0, sway: 0, v: 0 });
  }

  function seller(g, k, b) {
    const x = g.level.lot.seller, heard = k.noise !== null && Math.abs(k.noise - x) < NOISE;
    k.noise = null;
    if (k.seller === 'gone') {
      if (g.time - k.goneAt > BACK && Math.abs(b.x - x) > AWAY && !g.people.includes(k.person)) restock(k);
      return;
    }
    if (!heard && (b.covered || Math.abs(b.x - x) > (b.running && b.moving ? SPRINT : SEE))) return;
    flee(g, k, b);
  }

  function update(g, dt) {
    const L = g.level;
    if (!L.lot) return;
    const k = g.lot || (g.lot = create(g)), b = g.bear;
    const on = inside(L, b.x) && b.onGround && !b.climbing && !b.act && !(b.stun > 0);
    if (on && b.crouch) b.covered = true;
    b.thicket = on && !b.covered;
    if (on && b.crouch && !g.once.lot) {
      g.once.lot = true;
      rules().float(g, b.x, GY - 110, LABELS.lot.cover, COLORS.good);
      rules().quip(g, ZS.QUIPS.lot, true);
      rules().say(g, NEWS.lot);
    }
    for (const t of k.front) tree(g, k, t, b, dt);
    seller(g, k, b);
  }

  function miss(g, fromX, fromY) {
    const k = g.lot, b = g.bear;
    if (!k || !b.thicket) return false;
    let t = null;
    for (const f of k.front) if (!f.down && (!t || Math.abs(f.x - b.x) < Math.abs(t.x - b.x))) t = f;
    const x = t ? t.x : b.x;
    g.shots.push({ x1: fromX, y1: fromY, x2: x, y2: GY - 34, t: 0.3 });
    if (t) t.v += (Math.sign(x - fromX) || 1) * 9;
    for (let i = 0; i < 12; i++) {
      g.particles.push({ x, y: GY - 34, vx: (Math.random() - 0.5) * 180, vy: -Math.random() * 210, t: 0.85, color: i % 3 ? '#2f5a3a' : '#f4f7fa' });
    }
    k.noise = x;
    rules().onSound(g, 'tree', x);
    rules().float(g, b.x, GY - 125, LABELS.lot.miss, COLORS.good);
    if (!(g.time - k.said.miss < SAID)) { k.said.miss = g.time; rules().say(g, NEWS.lotMiss); }
    return true;
  }

  ZS.sim.lot = { update, inside, miss, create, AIM, LOOK };
})();
