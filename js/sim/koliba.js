(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GY = CFG.GROUND;
  const { clamp, smooth } = ZS.util;
  const rules = () => ZS.sim.rules;

  const GEO = { door: -28, win: 16, sill: -31, hatch: 16, base: -89, lid: -101, perch: 38, chimney: 45, roof: (x) => -122 + (56 * Math.abs(x)) / 98 };
  const NEAR = 230, SPRINT = 300, AWAY = 520, QUIET = 430, REST = 12, LOOKS = 4, FOOD_MAX = 4;
  const DUR = { alarm: 0.4, dive: 0.9, jump: 0.7, fall: 0.42, lie: 0.55, rise: 0.9, lid: 0.25, up: 0.6, sink: 0.6, climb: 1.1, step: 0.6, back: 0.6, descend: 1, door: 0.12 };
  const ROUTE = {
    window: (o) => (o.style === 'dive' ? ['alarm', 'dive'] : ['alarm', 'jump', 'fall', 'lie', 'rise']),
    door: () => ['door'],
    hatch: () => ['lid', 'up', 'perch', 'sink'],
    chimney: () => ['lid', 'climb', 'step', 'cling', 'back', 'descend'],
  };
  const HATCH_BUSY = { lid: 1, up: 1, perch: 1, sink: 1, climb: 1, descend: 1 };

  const rnd = () => Math.random();
  const pick = (list) => list[Math.floor(rnd() * list.length)];

  function seat(look, mug) { return { look, mug, mode: 'sit', at: -9, refill: 0 }; }

  function create(g) {
    const x = g.level.salas.koliba;
    return {
      x, mode: 'calm', armed: true, readyAt: 0, visits: 0, last: '', newsAt: -99, ids: 0, food: 0, quiet: 0, waiter: false,
      guests: [], out: [], seats: [seat(1, true), seat(3, false)],
      door: { at: -99, shut: -99 }, win: { at: -99, shut: -99 }, lid: { at: -99, shut: -99 },
    };
  }

  const isOpen = (s) => s.at > s.shut;
  function open(s, t) { if (!isOpen(s)) s.at = t; }
  function shut(s, t) { if (isOpen(s)) s.shut = t; }

  function plan() {
    const r = rnd(), n = r < 0.2 ? 1 : r < 0.65 ? 2 : 3;
    const routes = ['window', 'door', 'roof'].sort(() => rnd() - 0.5).slice(0, n);
    const list = [];
    for (const route of routes) {
      if (route === 'roof') list.push(rnd() < 0.5 ? 'hatch' : 'chimney');
      else list.push(route);
    }
    if (list.length < 3) {
      const extra = rnd();
      if (list.includes('door') && extra < 0.4) list.push('door');
      else if (list.includes('window') && extra < 0.65) list.push('window');
      else if (list.includes('hatch') && extra < 0.8) list.push('chimney');
      else if (list.includes('chimney') && extra < 0.9) list.push('hatch');
    }
    return list.map((route) => ({
      route,
      style: route === 'window' ? (rnd() < 0.55 ? 'dive' : 'jump') : '',
      act: route === 'hatch' ? pick(['wave', 'film', 'peek']) : route === 'chimney' ? pick(['cling', 'wave', 'film']) : '',
    }));
  }

  const signature = (list) => list.map((o) => o.route + o.style + o.act).sort().join('|');

  function guest(k, o, delay) {
    const id = ++k.ids, look = Math.floor(rnd() * LOOKS), mug = o.route === 'door' && rnd() < 0.4;
    return Object.assign({
      id, kind: 'guest', look, mug, t: -delay, step: -1, ph: 'wait', pt: 0, dur: 0, x: k.x, y: GY, dir: 1, face: 1, k: 0,
      h: { aimAt: [0, 0], look }, seat: -1,
    }, o);
  }

  function schedule(k, list, away) {
    let t = 0.1 + rnd() * 0.2, winAt = -1, doorAt = -1, roofAt = -1, seatI = 0;
    const order = list.slice().sort((a, b) => (a.route === 'chimney' ? -1 : 0) - (b.route === 'chimney' ? -1 : 0));
    const guests = [], taken = new Set(k.seats.filter((s) => s.mode !== 'gone').map((s) => s.look));
    for (const o of order) {
      let d = t;
      if (o.route === 'window' && winAt >= 0) d = Math.max(d, winAt + 0.65);
      if (o.route === 'door' && doorAt >= 0) d = Math.max(d, doorAt + 0.28 + rnd() * 0.2);
      if ((o.route === 'hatch' || o.route === 'chimney') && roofAt >= 0) d = Math.max(d, roofAt + 2.2);
      const gst = guest(k, o, d);
      gst.dir = away;
      if (o.route === 'window') {
        winAt = d;
        while (seatI < k.seats.length && k.seats[seatI].mode === 'gone') seatI++;
        if (seatI < k.seats.length) { gst.seat = seatI++; gst.look = k.seats[gst.seat].look; gst.h.look = gst.look; }
      }
      if (o.route === 'door') {
        doorAt = d;
        if (!k.waiter && rnd() < 0.5) { k.waiter = true; gst.kind = 'waiter'; gst.mug = false; gst.trayAt = 0.25 + rnd() * 0.35; gst.drops = rnd() < 0.65; }
      }
      if (o.route === 'hatch' || o.route === 'chimney') roofAt = d;
      if (gst.seat < 0 && gst.kind === 'guest') {
        const free = [0, 1, 2, 3].filter((l) => !taken.has(l));
        if (free.length) { gst.look = pick(free); gst.h.look = gst.look; }
        taken.add(gst.look);
      }
      guests.push(gst);
      t = d + 0.25 + rnd() * 0.45;
    }
    return guests;
  }

  function trigger(g, k) {
    const b = g.bear, away = b.x < k.x ? 1 : -1;
    k.waiter = false;
    let list = plan();
    for (let i = 0; i < 4 && signature(list) === k.last; i++) list = plan();
    k.last = signature(list);
    k.visits++;
    k.mode = 'busy';
    k.armed = false;
    k.quiet = 0;
    k.guests = schedule(k, list, away);
    rules().onSound(g, 'koliba', k.x);
    k.seats.forEach((s, i) => { if (s.mode !== 'gone') { s.mode = 'alarm'; s.at = g.time + 0.05 + i * 0.08; } });
    rules().spotted(g, k.x + away * 30, GY - 150, pick(LABELS.koliba.shouts));
    const news = g.time - k.newsAt > 50 ? NEWS.koliba : null;
    if (news) k.newsAt = g.time;
    rules().addPanic(g, 4, news);
  }

  function enter(g, k, o) {
    o.ph = o.steps[o.step];
    o.dur = DUR[o.ph] || Infinity;
    const t = g.time, X = k.x;
    if (o.ph === 'alarm' && o.seat >= 0) k.seats[o.seat].mode = 'alarm';
    if (o.ph === 'dive' || o.ph === 'jump') {
      if (!isOpen(k.win)) rules().onSound(g, 'window', X + GEO.win);
      open(k.win, t);
      if (o.seat >= 0) { k.seats[o.seat].mode = 'gone'; k.seats[o.seat].at = t; }
      if (rnd() < 0.5) rules().float(g, X + GEO.win, GY - 92, pick(LABELS.koliba.window), COLORS.story);
    }
    if (o.ph === 'door') { if (!isOpen(k.door)) rules().onSound(g, 'door', X + GEO.door); open(k.door, t); k.doorUse = t; ZS.fx.dust(g, X + GEO.door + o.dir * 12, GY, 3, -o.dir); }
    if (o.ph === 'lid') open(k.lid, t);
    if (o.ph === 'perch' || o.ph === 'cling') {
      o.face = o.ph === 'cling' && o.act !== 'film' ? 1 : Math.sign(g.bear.x - o.x) || 1;
      if (o.act === 'film') {
        rules().addPanic(g, 3);
        rules().float(g, o.x, o.y - 96, LABELS.koliba.film, COLORS.seen);
      } else if (o.act === 'wave' && rnd() < 0.6) rules().float(g, o.x, o.y - 96, pick(LABELS.koliba.roof), COLORS.story);
    }
    if (o.ph === 'fall') { ZS.fx.dust(g, o.x, GY, 4); rules().onSound(g, 'thud', o.x, 0.6); }
  }

  function release(g, k, o) {
    const p = ZS.sim.people.create(g, o.kind, { from: o.x, to: o.x });
    Object.assign(o.h, { clip: null, slope: 0, balance: false, k: 0, size: 1 });
    Object.assign(p, { x: o.x, dir: o.dir, state: 'flee', h: o.h, empty: o.kind === 'guest' && !o.mug, koliba: true });
    g.people.push(p);
    o.p = p;
    if (o.kind === 'waiter') { o.trayAt += g.time; k.out.push(o); }
    o.done = true;
  }

  function place(g, k, o) {
    const X = k.x, u = clamp(o.pt / o.dur, 0, 1);
    o.k = u;
    if (o.ph === 'dive') {
      let dx = 0, dy = 0;
      if (u < 0.15) { const e = smooth(u / 0.15); dx = 4 * e; dy = 2 + (GEO.sill - 2) * e; }
      else if (u < 0.5) { const a = (u - 0.15) / 0.35; dx = 4 + 50 * a; dy = GEO.sill * (1 - a) - 16 * 4 * a * (1 - a); }
      else if (u < 0.84) dx = 54 + (50 * (u - 0.5)) / 0.34;
      else dx = 104 + (12 * (u - 0.84)) / 0.16;
      o.x = X + GEO.win + o.dir * dx;
      o.y = GY + dy;
    } else if (o.ph === 'jump') {
      let dx = 0, dy = 0;
      if (u < 0.15) { const e = smooth(u / 0.15); dx = 3 * e; dy = 2 + (GEO.sill - 2) * e; }
      else { const a = (u - 0.15) / 0.85; dx = 3 + 41 * a; dy = GEO.sill * (1 - a) - 12 * 4 * a * (1 - a); }
      o.x = X + GEO.win + o.dir * dx;
      o.y = GY + dy;
    } else if (o.ph === 'fall' || o.ph === 'lie' || o.ph === 'rise') {
      o.y = GY;
    } else if (o.ph === 'door') {
      o.x = X + GEO.door; o.y = GY;
    } else if (o.ph === 'up' || o.ph === 'perch' || o.ph === 'sink' || o.ph === 'lid') {
      o.x = X + GEO.hatch; o.y = GY + GEO.base;
      o.k = o.ph === 'up' ? u : o.ph === 'sink' ? 1 - u : o.ph === 'lid' ? 0 : 1;
    } else if (o.ph === 'climb' || o.ph === 'descend') {
      const c = o.ph === 'climb' ? u : 1 - u, e = c * c * (3 - 2 * c);
      o.k = c;
      o.x = X + GEO.hatch;
      o.y = GY + GEO.base + 58 - (58 - GEO.roof(GEO.hatch) + GEO.base) * e;
      o.face = o.ph === 'climb' ? 1 : -1;
    } else if (o.ph === 'step' || o.ph === 'back') {
      const e = u * u * (3 - 2 * u), from = o.ph === 'step' ? GEO.hatch : GEO.perch, to = o.ph === 'step' ? GEO.perch : GEO.hatch;
      const rx = from + (to - from) * e;
      o.x = X + rx; o.y = GY + GEO.roof(rx);
      o.face = o.ph === 'step' ? 1 : -1;
    } else if (o.ph === 'cling') {
      o.x = X + GEO.perch; o.y = GY + GEO.roof(GEO.perch);
    }
  }

  function leave(g, k, o) {
    if (o.ph === 'perch') return k.quiet > 1.8 && o.pt > 3;
    if (o.ph === 'cling') return k.quiet > 1.8 && o.pt > 3 && !k.guests.some((q) => q !== o && q.route === 'hatch' && !q.done && HATCH_BUSY[q.ph]);
    return o.pt >= o.dur;
  }

  function advance(g, k, o, dt) {
    if (o.done) return;
    o.t += dt;
    if (o.t < 0) return;
    if (o.step < 0) {
      o.steps = ROUTE[o.route](o);
      o.step = 0; o.pt = 0;
      if (o.route === 'window' || o.route === 'door') o.dir = Math.sign(o.x - g.bear.x) || o.dir;
      o.x = k.x + (o.route === 'door' ? GEO.door : o.route === 'window' ? GEO.win : GEO.hatch);
      enter(g, k, o);
    } else o.pt += dt;
    for (let n = 0; n < 4 && leave(g, k, o); n++) {
      o.pt = Math.max(0, o.pt - o.dur);
      o.step++;
      if (o.step >= o.steps.length) {
        place(g, k, o);
        if (o.route === 'window' || o.route === 'door') release(g, k, o);
        else o.done = true;
        return;
      }
      if (o.ph === 'alarm' && o.route === 'window') o.dir = Math.sign(o.x - g.bear.x) || o.dir;
      enter(g, k, o);
    }
    place(g, k, o);
  }

  function tray(g, k) {
    for (const o of k.out) {
      const p = o.p;
      if (o.dropped || !p || p.dead || p.empty || p.react || g.time < o.trayAt || p.hurdle || ZS.sim.pen.inside(g.level, p.x, 90)) continue;
      o.dropped = true;
      if (!o.drops) continue;
      const food = k.food < FOOD_MAX && !g.level.items.some((it) => it.type === 'halusky' && !it.eaten);
      if (food) k.food++;
      g.props.push({ kind: 'tray', x: p.x + p.dir * 10, y: GY - 58, vx: p.dir * (90 + rnd() * 40), vy: -240 - rnd() * 60, rot: 0, vr: p.dir * (7 + rnd() * 4), dir: p.dir, rest: false, food });
      p.empty = true;
      rules().float(g, p.x, GY - 120, pick(LABELS.koliba.waiter), COLORS.story);
    }
    k.out = k.out.filter((o) => !o.dropped && o.p && !o.p.dead);
    for (const pr of g.props) {
      if (!pr.food || pr.y < GY) continue;
      pr.food = false;
      const S = g.level.salas, edge = S.fences || S.pen, lo = edge[0] - 70, hi = edge[edge.length - 1] + 70;
      let x = clamp(pr.x + pr.dir * 16, 40, g.level.w - 40);
      if (x > lo && x < hi) x = pr.dir > 0 ? lo : hi;
      g.level.items.push({ type: 'halusky', x, eaten: false, locked: false });
    }
  }

  function settle(g, k) {
    const t = g.time;
    if (isOpen(k.door) && !k.guests.some((o) => !o.done && o.route === 'door') && t - (k.doorUse || 0) > 1.2) shut(k.door, t);
    if (isOpen(k.lid) && !k.guests.some((o) => !o.done && (o.route === 'hatch' || o.route === 'chimney') && o.step >= 0)) shut(k.lid, t);
    for (const s of k.seats) if (s.mode === 'alarm' && t - s.at > 0.45 && !k.guests.some((o) => !o.done && o.seat === k.seats.indexOf(s))) { s.mode = 'duck'; s.at = t; }
    if (k.mode !== 'busy' || k.guests.some((o) => !o.done)) return;
    k.mode = 'calm';
    k.readyAt = t + REST;
    k.guests = [];
    shut(k.win, t + 1.5);
    k.seats.forEach((s, i) => {
      if (s.mode === 'duck') { s.mode = 'back'; s.at = t + 1 + i * 0.7; }
      else if (s.mode === 'gone') s.refill = t + REST * 0.7 + i * 1.3;
    });
  }

  function seats(g, k) {
    for (const s of k.seats) {
      if (s.mode === 'back' && g.time >= s.at) s.mode = 'sit';
      if (s.mode === 'gone' && k.mode === 'calm' && s.refill && g.time >= s.refill && Math.abs(g.bear.x - k.x) > NEAR) {
        s.mode = 'sit'; s.at = g.time; s.refill = 0; s.look = Math.floor(rnd() * LOOKS); s.mug = rnd() < 0.5;
      }
    }
  }

  function update(g, dt) {
    if (!g.level.salas) return;
    const k = g.koliba || (g.koliba = create(g));
    const b = g.bear, d = Math.abs(b.x - k.x);
    k.bearX = b.x;
    k.quiet = d > QUIET ? k.quiet + dt : 0;
    if (d > AWAY) k.armed = true;
    const near = d < (b.running && b.moving ? SPRINT : NEAR);
    if (k.mode === 'calm' && k.armed && g.time >= k.readyAt && near && !b.covered) trigger(g, k);
    for (const o of k.guests) advance(g, k, o, dt);
    tray(g, k);
    settle(g, k);
    seats(g, k);
  }

  ZS.sim.koliba = { update, create, GEO };
})();
