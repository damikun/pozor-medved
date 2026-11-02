(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const rules = () => ZS.sim.rules;
  const SEE = 340, CLOSE = 55, PITCH = 6.5, AIDE = 42, LEAD = 34, WALK = 24, HOME = 2, LEAFLET = 2;

  function init(p) {
    Object.assign(p, {
      home: p.from, dir: -1, speed: WALK, promo: false, offer: 0, pitch: 0, pitchAt: -99, seen: false,
      aide: { x: p.from + AIDE, dir: -1, film: false, aim: p.from, rolled: false },
    });
    return p;
  }

  function sees(g, p) {
    const b = g.bear, d = Math.abs(b.x - p.x);
    return !g.ride && d < SEE && (!b.covered || (b.hiding && d < CLOSE));
  }

  function shout(g, x, text, y) {
    rules().float(g, x, GY - (y || 118), text, COLORS.story);
  }

  function follow(g, p, dt, near) {
    const a = p.aide, b = g.bear;
    const goal = p.leaving ? p.x + p.dir * LEAD : p.home + AIDE, dx = goal - a.x;
    const step = Math.min(Math.abs(dx), (p.leaving ? 50 : 40) * dt);
    a.x += Math.sign(dx) * step;
    const moving = Math.abs(dx) > 1.5;
    const busy = !!p.react || near;
    a.film = !moving && !p.leaving && busy;
    a.aim = near || p.react ? (b.x + p.x) / 2 : p.x;
    a.dir = moving ? Math.sign(dx) : Math.sign(a.aim - a.x) || -1;
    if (a.film && !a.rolled) { a.rolled = true; shout(g, a.x, LABELS.tycoon.film, 82); }
  }

  function pitch(g, p) {
    const list = LABELS.tycoon.pitch, i = p.pitch++ % list.length;
    p.pitchAt = g.time;
    shout(g, p.x, list[i]);
    if (i === LEAFLET && !g.once.tycoonLeaflet) { g.once.tycoonLeaflet = true; rules().say(g, NEWS.tycoon.leaflet); }
  }

  function update(g, p, dt) {
    if (!p.aide) init(p);
    const b = g.bear, near = !p.leaving && !p.react && sees(g, p);
    follow(g, p, dt, near);
    p.offer = Math.max(0, Math.min(1, p.offer + (near && !b.act ? dt : -dt) * 3));
    if (p.react || p.leaving) return;
    const off = p.home - p.x;
    if (Math.abs(off) > HOME && !b.act) { p.dir = Math.sign(off); p.x += p.dir * Math.min(Math.abs(off), p.speed * dt); }
    else if (Math.abs(b.x - p.x) < 640) p.dir = Math.sign(b.x - p.x) || p.dir;
    if (!near) return;
    if (!p.seen) { p.seen = true; rules().say(g, NEWS.tycoon.seen, true); }
    if (!b.act && g.time - p.pitchAt > PITCH) pitch(g, p);
  }

  function release(g, o) {
    const sel = o.react === 'selfie';
    o.react = null; o.reactT = 0; o.hugBy = null; o.hugK = 1; o.selfieK = 1; o.state = 'walk';
    if (sel) o.promo = true;
    o.pitchAt = g.time;
    shout(g, o.x, sel ? LABELS.tycoon.cut : LABELS.tycoon.hugged, 140);
  }

  function leave(g, p) {
    p.leaving = true; p.state = 'walk'; p.clutch = false; p.offer = 0;
    p.dir = Math.sign(p.x - g.bear.x) || 1;
    shout(g, p.x, LABELS.tycoon.leave, 140);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.tycoon = { init, update, release, leave, sees, SEE, PITCH };
})();
