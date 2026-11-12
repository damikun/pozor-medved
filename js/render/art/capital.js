(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, clamp, lerp, frac, sstep } = ZS.util;
  const API = (ZS.capitalArt = {});
  const SIM = () => ZS.sim.capital;
  const figures = new Map();
  const TOP = GY - 760;

  const SKY = { summer: ['#7fbde6', '#e4f1f8'], autumn: ['#9cb8d2', '#f2e2cc'] };
  const STONE = ['#d8d2c4', '#cfc8b8', '#e2dccf'];
  const PASTEL = ['#efe2c6', '#ead0c6', '#d6e0ea', '#e8e4d6', '#e0d4e6', '#eed8c0'];

  const look = (g) => (ZS.seasonLook(g.seasonKey) === 'autumn' ? 'autumn' : 'summer');
  const frost = (g) => g.seasonKey === 'recess';

  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  function text(ctx, s, x, y, size, col, w, weight) {
    ctx.fillStyle = col; ctx.font = (weight || 800) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y, w);
  }

  function person(ctx, id, kind, x, dir, state, time, extra) {
    let h = figures.get(id);
    if (!h) figures.set(id, (h = { aimAt: [0, 0], id }));
    Object.assign(h, { kind, x, y: GY, dir, state, outfit: 'summer', cold: 0, armed: false, empty: false, scared: false, kick: 0, texting: false, clutch: false, look: 0, size: 1 }, extra);
    ZS.drawHuman(ctx, h, time);
    return h;
  }

  function arms(ctx, x, y, s) {
    ctx.fillStyle = '#ffffff'; rr(ctx, x - 6.5 * s, y - 1 * s, 13 * s, 17 * s, 5 * s);
    ctx.fillStyle = '#d0312b'; rr(ctx, x - 5.5 * s, y, 11 * s, 15 * s, 4.5 * s);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 0.9 * s, y + 1.6 * s, 1.8 * s, 9 * s); ctx.fillRect(x - 3.6 * s, y + 4 * s, 7.2 * s, 1.5 * s); ctx.fillRect(x - 2.8 * s, y + 6.6 * s, 5.6 * s, 1.5 * s);
    ctx.fillStyle = '#1f4fa0'; ell(ctx, x, y + 12.6 * s, 4.6 * s, 2.4 * s);
  }

  function flagSk(ctx, x, y, w, h, t, ph) {
    const wv = (u) => sin(t * 3 + ph + u * 4) * h * 0.06;
    [['#ffffff', 0], ['#1f4fa0', 1], ['#d0312b', 2]].forEach(([col, i]) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x, y + i * h / 3 + wv(0));
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + w * k / 6, y + i * h / 3 + wv(k / 6));
      for (let k = 6; k >= 0; k--) ctx.lineTo(x + w * k / 6, y + (i + 1) * h / 3 + wv(k / 6) + 0.5);
      ctx.closePath(); ctx.fill();
    });
    arms(ctx, x + w * 0.3, y + h * 0.14 + wv(0.3), h / 22);
  }

  function mark(ctx, x, y, level, time) {
    if (!level) return;
    const red = level > 1, bob = abs(sin(time * 8)) * 4;
    label(ctx, '!', x, y - bob, red ? 24 : 20, red ? '#e03131' : '#e8a400');
  }

  function behind(ctx, g, c, withBear, draw) {
    const b = g.bear;
    if (withBear && b.hideTree === c && b.hideBlend > 0) {
      const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: c }));
      withBear(ZS.drawBearBehindTree, who, b.hideBlend);
      draw();
      withBear(ZS.drawBearInFront, who, b.hideBlend);
      return;
    }
    draw();
  }

  function haze(ctx, x, y, w, h, a) {
    ctx.fillStyle = 'rgba(214,228,238,' + a + ')'; ctx.fillRect(x, y, w, h);
  }

  const BLOCKS = [];
  for (let i = 0, u = -60; i < 34; i++) {
    const w = 52 + hash(i * 3.1) * 46, h = 46 + hash(i * 2.3) * 58, tone = hash(i * 5.7);
    BLOCKS.push({ u, w, h, tone, band: hash(i * 7.9) < 0.45 ? ['#c9a25a', '#b46a5a', '#6f9a8a', '#8a7ab0'][i % 4] : null });
    u += w + 8 + hash(i * 1.9) * 26;
  }

  function blocks(ctx, cam, viewW, k, base) {
    const far = cam * 0.1;
    for (const o of BLOCKS) {
      const x = o.u - far;
      if (x < -o.w - 20 || x > viewW + 20) continue;
      const y = base - o.h;
      ctx.fillStyle = k === 'autumn' ? (o.tone < 0.5 ? '#c8c6c0' : '#bdbcb8') : o.tone < 0.5 ? '#c6cdd4' : '#b9c2cb';
      ctx.fillRect(x, y, o.w, o.h);
      ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(x + o.w - 5, y, 5, o.h);
      if (o.band) { ctx.fillStyle = o.band; ctx.globalAlpha = 0.45; ctx.fillRect(x, y + 6, 6, o.h - 6); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(70,84,100,0.28)';
      for (let r = y + 7; r < base - 5; r += 7) ctx.fillRect(x + 4 + (o.band ? 5 : 0), r, o.w - 10 - (o.band ? 5 : 0), 2);
    }
  }

  function riverBand(ctx, g, viewW, k, top, bot) {
    const t = g.time, gr = ctx.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, k === 'autumn' ? '#8fa6b4' : '#7fa9c9'); gr.addColorStop(1, k === 'autumn' ? '#6e8796' : '#5d8bb0');
    ctx.fillStyle = gr; ctx.fillRect(0, top, viewW, bot - top);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 12; i++) { const x = frac(i * 0.137 + t * 0.006) * (viewW + 80) - 40; ctx.fillRect(x, top + 4 + (i % 3) * 6, 22 + (i % 4) * 8, 1.4); }
  }

  function bridge(ctx, cam, viewW, base) {
    const ux = 1360 - cam * 0.1, uy = base - 112;
    if (ux < -260 || ux > viewW + 300) return;
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(ux - 160, base - 10, 470, 5);
    ctx.fillStyle = '#8a939d'; for (let x = ux - 140; x < ux + 300; x += 60) ctx.fillRect(x, base - 6, 3, 10);
    ctx.strokeStyle = '#8d97a3'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ux - 40, base - 8); ctx.lineTo(ux, uy + 10); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(110,120,130,0.8)';
    for (let i = 1; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(ux - 6 - i * 2.4, uy + 20 + i * 5.5); ctx.lineTo(ux + 24 + i * 32, base - 9); ctx.stroke(); }
    ctx.fillStyle = '#7d8691'; ell(ctx, ux + 2, uy, 24, 7);
    ctx.fillStyle = '#a7b0ba'; ell(ctx, ux + 2, uy - 4, 18, 6);
    ctx.fillStyle = 'rgba(255,240,190,0.7)'; ctx.fillRect(ux - 14, uy - 1, 32, 2);
  }

  function shoreTrees(ctx, cam, viewW, base, k, f) {
    const near = cam * 0.32, step = 26;
    const leaf = k === 'autumn' ? ['#a8955a', '#9a7f4a', '#b49a5e'] : ['#7f9f6a', '#6f9160', '#8aa874'];
    for (let i = Math.floor(near / step) - 1; i * step - near < viewW + step; i++) {
      const x = i * step - near, h = 30 + hash(i * 1.7) * 26, r = 14 + hash(i * 2.9) * 8;
      ctx.fillStyle = leaf[i % 3];
      circle(ctx, x, base - h, r); circle(ctx, x + 10, base - h + 8, r * 0.8); circle(ctx, x - 9, base - h + 9, r * 0.75);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; circle(ctx, x + 4, base - h + 6, r * 0.6);
    }
    ctx.fillStyle = f; ctx.fillRect(0, base - 12, viewW, GY - base + 12);
  }

  const SKIES = { session: ['#7fbfe8', '#dcefff'], budget: ['#8db9dc', '#e9eef0'], recess: ['#9ab4cc', '#e4e9ec'] };

  function sky(ctx, g, viewW, offY) {
    const s = SKIES[g.seasonKey] || SKIES.session, gr = ctx.createLinearGradient(0, -offY, 0, GY);
    gr.addColorStop(0, s[0]); gr.addColorStop(1, s[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, -offY, viewW, GY + offY);
    const far = g.cam * 0.06;
    ctx.fillStyle = '#a3b4c4';
    ctx.beginPath(); ctx.moveTo(-20, GY);
    for (let i = Math.floor(far / 40) - 1; i * 40 - far <= viewW + 60; i++) { const u = i * 40; ctx.lineTo(u - far, GY - 170 - 40 * sin(u * 0.0021) - 18 * sin(u * 0.0063 + 1)); }
    ctx.lineTo(viewW + 20, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(220,232,240,0.35)'; ctx.fillRect(0, GY - 160, viewW, 160);
  }

  function backdrop(ctx, g, viewW, offY) {
    const cam = g.cam, L = g.level, C = L.capital, k = look(g);
    const mid = cam + viewW / 2;
    const city = 1 - sstep(C.luh.from - 300, C.luh.from + 500, mid);
    if (city > 0) {
      ctx.globalAlpha = city;
      const tx = 180 - cam * 0.1;
      if (tx > -60 && tx < viewW + 60) {
        ctx.fillStyle = '#9aa6b0'; poly(ctx, [tx - 7, GY - 150, tx + 7, GY - 150, tx + 3, GY - 290, tx - 3, GY - 290]);
        ctx.fillStyle = '#8b97a2'; ell(ctx, tx, GY - 268, 11, 9);
        ctx.fillStyle = '#c0392b'; ctx.fillRect(tx - 1, GY - 330, 2, 40);
      }
      blocks(ctx, cam, viewW, k, GY - 96);
      bridge(ctx, cam, viewW, GY - 92);
      riverBand(ctx, g, viewW, k, GY - 96, GY - 66);
      shoreTrees(ctx, cam, viewW, GY - 52, k, k === 'autumn' ? '#a39a7e' : '#93a37e');
      ctx.globalAlpha = 1;
    }
    if (city < 1) {
      ctx.globalAlpha = 1 - city;
      const near = cam * 0.3;
      ctx.fillStyle = k === 'autumn' ? '#9ea06a' : '#7e9f62';
      ctx.beginPath(); ctx.moveTo(-40, GY);
      for (let i = Math.floor(near / 20) - 1; i * 20 - near <= viewW + 40; i++) { const u = i * 20; ctx.lineTo(u - near, GY - 150 - 30 * sin(u * 0.006) - 20 * hash(i)); }
      ctx.lineTo(viewW + 40, GY); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function cobbles(ctx, x0, x1, col, dark) {
    ctx.fillStyle = col; ctx.fillRect(x0, GY - 2, x1 - x0, 900);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x0, GY + 90, x1 - x0, 810);
    ctx.fillStyle = dark;
    for (let r = 0; r < 6; r++) {
      const y = GY + r * 14, off = r % 2 ? 9 : 0;
      for (let x = Math.floor((x0 - off) / 18) * 18 + off; x < x1; x += 18) if (x > x0 - 18) ctx.fillRect(max(x0, x), y, 1.4, 12);
      ctx.fillRect(x0, y + 12, x1 - x0, 1.2);
    }
  }

  function interior(ctx, g, a, z, wall, low, floor, ceil) {
    ctx.fillStyle = ceil || '#d9cdb4'; ctx.fillRect(a, TOP, z - a, GY - 260 - TOP);
    ctx.fillStyle = 'rgba(0,0,0,0.07)'; for (let x = Math.ceil(a / 120) * 120; x < z; x += 120) ctx.fillRect(x, TOP, 6, GY - 260 - TOP);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(a, GY - 270, z - a, 8);
    ctx.fillStyle = wall; ctx.fillRect(a, GY - 262, z - a, 262);
    ctx.fillStyle = low; ctx.fillRect(a, GY - 92, z - a, 92);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(a, GY - 94, z - a, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(a, GY - 262, z - a, 4);
    ctx.fillStyle = floor; ctx.fillRect(a, GY - 2, z - a, 900);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(a, GY + 90, z - a, 810);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = Math.ceil(a / 64) * 64; x < z; x += 64) ctx.fillRect(x, GY, 1.5, 90);
  }

  function ground(ctx, g, cam, viewW) {
    const C = g.level.capital, x0 = cam - 20, x1 = cam + viewW + 20, f = frost(g);
    const seg = (a, z) => [max(a, x0), min(z, x1)];
    const o = off(g), up = above(g), T = C.tunnel;
    if (o) { ctx.save(); ctx.translate(0, -o); }
    let [a, z] = seg(C.hill.from, C.castle.garden[0]);
    if (a < z) {
      ctx.fillStyle = '#b9b2a2'; ctx.fillRect(a, GY - 2, z - a, 16);
      ctx.fillStyle = 'rgba(80,70,50,0.25)'; ctx.fillRect(a, GY + 14, z - a, 2);
    }
    [a, z] = seg(C.castle.gate - 40, C.castle.yard[1] + 60);
    if (a < z) cobbles(ctx, a, z, '#c9c0ae', 'rgba(90,80,60,0.28)');
    [a, z] = seg(C.castle.yard[1] + 60, C.square.from);
    if (a < z) {
      ctx.fillStyle = '#ddd1b4'; ctx.fillRect(a, GY - 2, z - a, 900);
      ctx.fillStyle = 'rgba(120,100,70,0.18)'; for (let x = Math.floor(a / 7) * 7; x < z; x += 7) circle(ctx, x + hash(x) * 5, GY + 6 + hash(x * 1.7) * 30, 1.1);
      ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(a, GY + 40, z - a, 2);
      const [ga, gz] = seg(C.castle.garden[0] + 8, C.castle.garden[1] - 8);
      if (ga < gz) beds(ctx, g, ga, gz);
    }
    [a, z] = seg(C.square.from, C.square.facade + 160);
    if (a < z) {
      ctx.fillStyle = '#d5d0c6'; ctx.fillRect(a, GY - 2, z - a, 900);
      ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(a, GY + 90, z - a, 810);
      ctx.fillStyle = 'rgba(120,110,95,0.22)';
      for (let x = Math.floor(a / 46) * 46; x < z; x += 46) ctx.fillRect(x, GY, 1.4, 90);
      for (let y = GY + 16; y < GY + 90; y += 18) ctx.fillRect(a, y, z - a, 1.2);
    }
    [a, z] = seg(C.inside.from, C.bar.from);
    if (a < z) {
      interior(ctx, g, a, z, '#e9dfc9', '#8a5a36', '#cdbb98');
      ctx.fillStyle = '#9b2c2c'; ctx.fillRect(a, GY - 1, z - a, 10);
      ctx.fillStyle = '#c9a647'; ctx.fillRect(a, GY + 9, z - a, 1.5);
    }
    [a, z] = seg(C.bar.from, C.bar.to);
    if (a < z && !up) {
      interior(ctx, g, a, z, '#d9e6d4', '#5e8f6a', '#c7c2b6', '#c4d2c0');
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let y = GY - 90; y < GY - 2; y += 12) ctx.fillRect(a, y, z - a, 1);
      for (let x = Math.ceil(a / 12) * 12; x < z; x += 12) ctx.fillRect(x, GY - 92, 1, 90);
    }
    [a, z] = seg(T.from, T.to);
    if (a < z && !up) upperOver(ctx, g, C, a, z);
    if (up) {
      [a, z] = seg(C.bar.from, T.to);
      if (a < z) {
        for (let x = Math.floor(C.bar.from / 150) * 150 + 75; x < T.to + 40; x += 150) if (x > x0 - 120 && x < x1 + 120) house(ctx, x, Math.round(x / 150) + 5);
        cobbles(ctx, a, z, '#b8ad98', 'rgba(70,60,45,0.3)');
      }
    }
    [a, z] = seg(C.town.from, C.bank.to);
    if (a < z) cobbles(ctx, a, z, '#b8ad98', 'rgba(70,60,45,0.3)');
    [a, z] = seg(C.bank.from + 120, C.bank.pier + 300);
    if (a < z) {
      ctx.fillStyle = '#c4c6c4'; ctx.fillRect(a, GY - 2, z - a, 30);
      ctx.fillStyle = '#5b7f9e'; ctx.fillRect(a, GY + 28, z - a, 900);
    }
    if (C.luh.cove && C.luh.cove[1] > x0 - 200 && C.luh.cove[0] < x1 + 200) cove(ctx, g, C);
    for (const [x, side] of [[C.castle.gate - 40, 1]]) if (x > x0 - 40 && x < x1 + 40) edge(ctx, x, side, g);
    for (const x of [C.castle.yard[1] + 60, C.square.from]) if (x > x0 - 40 && x < x1 + 40) curb(ctx, x);
    if (o) {
      ctx.restore();
      for (const [p, q] of [[x0, T.hatch - 50], [T.to, x1]]) { [a, z] = seg(p, q); if (a < z) { soil(ctx, a, z, GY - o + 12, GY + 900, true); ctx.fillStyle = '#5f4630'; ctx.fillRect(a, GY + DEEP - o - 40, z - a, 940); } }
    }
    [a, z] = seg(o > 0 ? T.hatch - 50 : T.from, T.to);
    if (a < z && !up) { ctx.save(); ctx.translate(0, DEEP - o); underground(ctx, g, C, a, z); ctx.restore(); }
    if (f) { ctx.fillStyle = 'rgba(240,246,250,0.35)'; ctx.fillRect(x0, GY - 2, x1 - x0, 5); }
  }

  const SPLIT = 6460, DEEP = 200;

  function off(g) {
    const C = g.level.capital, k = g.capital, b = g.bear;
    if (!C || !k || g.once.liftUp) return 0;
    const L = k.lift;
    if (L && (L.phase === 'rise' || L.phase === 'open')) return 0;
    const ch = k.chute;
    if (ch && ch.phase === 'down') return DEEP * smooth(clamp(1 - ch.t / SIM().CHUTE.down, 0, 1));
    return g.once.chute && b.x > C.tunnel.hatch - 60 && b.x < C.tunnel.to + 200 ? DEEP : 0;
  }

  function above(g) {
    const C = g.level.capital;
    return !!C && g.bear.x > C.tunnel.to && off(g) === 0;
  }

  function rise(g, x) {
    const T = g.level.capital.tunnel;
    if (above(g)) return 0;
    const o = off(g);
    return x >= T.from && x <= T.to ? DEEP - o : -o;
  }

  function soil(ctx, a, z, top, bot, bare) {
    ctx.fillStyle = '#7a5c40'; ctx.fillRect(a, top, z - a, bot - top);
    ctx.fillStyle = '#6a4e36'; ctx.fillRect(a, top + 40, z - a, 30); ctx.fillRect(a, top + 104, z - a, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = Math.floor(a / 37) * 37; x < z; x += 37) circle(ctx, x + hash(x) * 20, top + 20 + hash(x * 1.7) * (bot - top - 40), 2 + hash(x * 2.1) * 3);
    if (bare) return;
    ctx.fillStyle = '#b8ad98'; ctx.fillRect(a, top - 10, z - a, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = Math.floor(a / 18) * 18; x < z; x += 18) ctx.fillRect(x, top - 10, 1.4, 12);
  }



  function upperOver(ctx, g, C, a, z) {
    const pz = min(z, SPLIT), sa = max(a, SPLIT);
    if (a < pz) {
      ctx.fillStyle = '#e6dcc6'; ctx.fillRect(a, TOP, pz - a, GY - TOP);
      ctx.fillStyle = '#d9cdb2'; ctx.fillRect(a, GY - 330, pz - a, 8);
      ctx.fillStyle = '#7a4e2e'; ctx.fillRect(a, GY - 180, pz - a, 180);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = Math.ceil(a / 24) * 24; x < pz; x += 24) ctx.fillRect(x, GY - 180, 1.5, 180);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(a, GY - 180, pz - a, 3);
      ctx.fillStyle = '#5e3a20'; ctx.fillRect(a, GY - 184, pz - a, 5);
      ctx.fillStyle = '#9b2c2c'; ctx.fillRect(a, GY - 1, pz - a, 10);
      ctx.fillStyle = '#c9a647'; ctx.fillRect(a, GY + 9, pz - a, 1.5);
    }
    if (sa < z) { cobbles(ctx, sa, z, '#b8ad98', 'rgba(70,60,45,0.3)'); surface(ctx, g, sa, z, GY); }
  }

  function hallBack(ctx, g, C, vis) {
    const T = C.tunnel, t = g.time, k = g.capital ? g.capital.spy : { state: 'listen' };
    if (!vis((T.from + SPLIT) / 2, (SPLIT - T.from) / 2 + 100)) return;
    const cx = (T.from + SPLIT) / 2 - 20;
    ctx.fillStyle = '#c9a647'; rr(ctx, cx - 32, GY - 248, 64, 76, 8);
    ctx.fillStyle = '#ffffff'; rr(ctx, cx - 27, GY - 243, 54, 66, 6);
    arms(ctx, cx, GY - 238, 3.6);
    ctx.fillStyle = '#1b1f26'; rr(ctx, T.from + 40, GY - 240, 110, 60, 4);
    ctx.fillStyle = '#c9a647'; ctx.fillRect(T.from + 40, GY - 240, 110, 3);
    const B = LABELS.plenary.board, za = 76 + (frac(t * 0.3) < 0.5 ? 1 : 0);
    ctx.font = '700 11px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#7dff9a'; ctx.fillText(B.za, T.from + 50, GY - 222);
    ctx.fillStyle = '#ff8a7a'; ctx.fillText(B.proti, T.from + 50, GY - 198);
    ctx.textAlign = 'right'; ctx.fillStyle = '#7dff9a'; ctx.fillText(String(za), T.from + 140, GY - 222);
    ctx.fillStyle = '#ff8a7a'; ctx.fillText('41', T.from + 140, GY - 198);
    ctx.fillStyle = '#2f5d8a'; rr(ctx, SPLIT - 170, GY - 236, 140, 26, 3);
    text(ctx, LABELS.capital.board.hall, SPLIT - 100, GY - 223, 9, '#fff', 130, 800);
    ctx.fillStyle = '#a77a4c'; ctx.fillRect(T.from + 20, GY - 44, SPLIT - T.from - 40, 44);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(T.from + 20, GY - 44, SPLIT - T.from - 40, 3);
    seatRow(ctx, g, HALL.back, GY - 44, false, k, t);
    desks(ctx, HALL.back, GY - 44, false, k, t);
    seatRow(ctx, g, HALL.front, 0 + GY, true, k, t);
    desks(ctx, HALL.front, GY, true, k, t);
  }

  function pulledAt(k, t, i) {
    return k.state === 'listen' && frac(t * 0.9 + i * 0.27) < 0.5;
  }

  function seatRow(ctx, g, xs, floor, pup, k, t) {
    xs.forEach((mx, i) => {
      ctx.fillStyle = '#1f3f72'; rr(ctx, mx - 22, floor - 96, 30, 50, 9);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, mx - 19, floor - 92, 8, 40, 4);
      const pulled = pup && pulledAt(k, t, i);
      ZS.drawGuestBust(ctx, { x: mx, y: floor - 84, face: 1, up: 0.86, stand: 0, act: pulled ? 'wave' : pup ? 'eat' : ['drink', 'eat', 'alarm', 'drink', 'eat'][i % 5], kind: 'mp', look: (pup ? 11 : 6) + i, seed: (pup ? 60 : 40) + i, scale: 0.86 }, t);
    });
  }

  function desks(ctx, xs, floor, pup, k, t) {
    const a = xs[0] - 40, z = xs[xs.length - 1] + 46, top = floor - 54;
    ctx.fillStyle = '#5e3a20'; ctx.fillRect(a, top, z - a, 6);
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(a + 2, top + 6, z - a - 4, 48);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(a + 2, top + 6, z - a - 4, 2);
    xs.forEach((mx, i) => {
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(mx - 30, top + 10, 1.5, 40);
      ctx.fillStyle = '#f2ede2'; rr(ctx, mx - 2, top + 16, 26, 9, 1.5);
      ctx.fillStyle = '#7a6a52'; ctx.fillRect(mx + 2, top + 19, 18, 1.5);
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(mx + 26, top); ctx.quadraticCurveTo(mx + 28, top - 14, mx + 20, top - 18); ctx.stroke();
      ctx.fillStyle = '#2b2b2b'; circle(ctx, mx + 19, top - 18, 2.2);
      const on = pup ? pulledAt(k, t, i) : (i % 3 === 0);
      ctx.fillStyle = on ? '#3fd06a' : '#5a3a2a'; circle(ctx, mx + 32, top - 2, 2.6);
    });
  }


  const HALL = { back: [6070, 6140, 6210, 6280, 6350], front: [6300, 6360, 6420] };

  function strings(ctx, g, C, o) {
    const T = C.tunnel, t = g.time, k = g.capital ? g.capital.spy : { state: 'listen' };
    const bob = k.state === 'listen' ? sin(t * 5.6) * 4 : 0, bx = T.spy - 6, by = GY - 162 + bob + DEEP - o;
    ctx.strokeStyle = 'rgba(245,240,225,0.8)'; ctx.lineWidth = 1;
    HALL.front.forEach((mx, i) => {
      const pulled = pulledAt(k, t, i);
      ctx.beginPath(); ctx.moveTo(mx + 12, GY - (pulled ? 116 : 92) - o); ctx.lineTo(bx - 24 + i * 16, by); ctx.stroke();
    });
  }


  function cove(ctx, g, C) {
    const [a, z] = C.luh.cove, j = C.luh.jetty, t = g.time, pa = j - 190;
    ctx.fillStyle = '#5b7f9e'; poly(ctx, [a, GY + 4, z, GY + 4, z + 16, GY + 40, z + 16, GY + 900, a, GY + 900]);
    ctx.fillStyle = '#6b5a3a'; poly(ctx, [z - 4, GY - 2, z + 40, GY - 2, z + 40, GY + 900, z + 16, GY + 900, z + 16, GY + 40]);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = Math.ceil(a / 34) * 34; x < z; x += 34) ctx.fillRect(x + sin(t + x) * 4, GY + 14 + (x % 3) * 8, 14, 1.5);
    if (g.once.boat) {
      const x = pa - 110, bob = sin(t * 1.3) * 1.5, y = GY + 10 + bob;
      ctx.fillStyle = '#f4f6f8'; poly(ctx, [x - 70, y - 14, x + 66, y - 14, x + 84, y - 24, x + 60, y + 8, x - 64, y + 8]);
      ctx.fillStyle = '#2f6db0'; ctx.fillRect(x - 66, y - 8, 140, 4);
      ctx.fillStyle = '#c4262e'; ctx.fillRect(x - 62, y + 3, 120, 4);
      ctx.fillStyle = '#d9dee3'; poly(ctx, [x - 10, y - 14, x + 20, y - 14, x + 12, y - 36, x - 4, y - 36]);
      ctx.fillStyle = 'rgba(150,190,215,0.8)'; poly(ctx, [x - 2, y - 34, x + 10, y - 34, x + 16, y - 18, x - 6, y - 18]);
      text(ctx, LABELS.boat.name, x - 30, y - 6, 6, '#1f4fa0', 60, 900);
      ctx.strokeStyle = '#7a6a4a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 70, y - 16); ctx.quadraticCurveTo(x + 90, y - 2, pa + 6, GY - 2); ctx.stroke();
    }
    ctx.fillStyle = '#4a3a28'; for (let x = pa + 10; x < z - 10; x += 44) ctx.fillRect(x - 3, GY + 2, 6, 60);
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(pa, GY - 4, z - pa, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let x = Math.ceil(pa / 14) * 14; x < z; x += 14) ctx.fillRect(x, GY - 4, 1.2, 9);
    ctx.fillStyle = '#c4262e'; ctx.beginPath(); ctx.arc(pa + 40, GY - 22, 9, 0, PI * 2); ctx.fill(); ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.arc(pa + 40, GY - 22, 5, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(pa + 38, GY - 14, 4, 12);
  }


  function underground(ctx, g, C, a, z) {
    const T = C.tunnel, top = GY - DEEP, roof = GY - 150;
    const sa = a, sz = z;
    soil(ctx, a, z, top + 30, roof, true);
    ctx.fillStyle = '#8a857a'; ctx.fillRect(a, top + 8, z - a, 22);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(a, top + 28, z - a, 3);
    ctx.save(); ctx.beginPath(); ctx.rect(sa, top + 30, max(0, sz - sa), roof - top - 30); ctx.clip();
    ctx.fillStyle = '#6a4e36'; ctx.fillRect(a, top + 40, z - a, 30); ctx.fillRect(a, top + 104, z - a, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = Math.floor(a / 37) * 37; x < z; x += 37) circle(ctx, x + hash(x) * 20, top + 20 + hash(x * 1.7) * 110, 2 + hash(x * 2.1) * 3);
    ctx.fillStyle = '#8f969c'; ctx.fillRect(a, top + 80, z - a, 9); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(a, top + 80, z - a, 2);
    ctx.fillStyle = '#b8582a'; ctx.fillRect(a, top + 132, z - a, 5);
    ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 1.5;
    for (let x = Math.floor(a / 160) * 160 + 40; x < z; x += 160) { ctx.beginPath(); ctx.moveTo(x, top); ctx.quadraticCurveTo(x + 10, top + 30, x - 6, top + 56); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#6f6b62'; ctx.fillRect(a, roof, z - a, GY - roof);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let x = Math.ceil(a / 50) * 50; x < z; x += 50) ctx.fillRect(x, roof, 2, GY - roof);
    ctx.fillStyle = '#5a564e'; ctx.fillRect(a, roof, z - a, 8);
    const [r0, r1] = T.room;
    if (r1 > a && r0 < z) {
      ctx.fillStyle = '#b7ab88'; ctx.fillRect(r0, GY - 172, r1 - r0, 172);
      ctx.fillStyle = 'rgba(120,100,60,0.14)'; for (let x = r0 + 6; x < r1; x += 14) ctx.fillRect(x, GY - 172, 5, 172);
      ctx.fillStyle = '#5a564e'; ctx.fillRect(r0 - 8, GY - 180, r1 - r0 + 16, 10);
      ctx.fillStyle = '#7a6a4a'; ctx.fillRect(r0, GY - 46, r1 - r0, 46);
      ctx.fillStyle = '#e8e0c8'; ctx.fillRect(r0 + 60, GY - 150, 56, 30);
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1; ctx.strokeRect(r0 + 60, GY - 150, 56, 30);
      ctx.strokeStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(r0 + 66, GY - 160); ctx.lineTo(r0 + 82, GY - 176); ctx.lineTo(r0 + 98, GY - 166); ctx.lineTo(r0 + 110, GY - 178); ctx.stroke();
      ctx.fillStyle = '#c0392b'; circle(ctx, r0 + 82, GY - 176, 2); circle(ctx, r0 + 110, GY - 178, 2);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(r0 + 8, GY - 166, 70, 14);
      text(ctx, LABELS.capital.board.secret, r0 + 43, GY - 159, 7, '#fff', 66, 900);
    }
    for (const [l0, l1] of T.low) {
      if (l1 < a || l0 > z) continue;
      const lo = GY - 60;
      ctx.fillStyle = '#8c877b'; ctx.fillRect(l0, roof, l1 - l0, lo - roof);
      ctx.fillStyle = 'rgba(0,0,0,0.1)'; for (let x = l0 + 18; x < l1; x += 36) ctx.fillRect(x, roof, 3, lo - roof);
      ctx.fillStyle = '#6e6a60'; ctx.fillRect(l0, lo - 10, l1 - l0, 10);
      for (let x = l0, i = 0; x < l1; x += 14, i++) { ctx.fillStyle = i % 2 ? '#2b2b2b' : '#f2c230'; poly(ctx, [x, lo, x + 14, lo, x + 7, lo - 8, x - 7, lo - 8]); }
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(l0, lo - 30, l1 - l0, 7);
      ctx.fillStyle = '#b8582a'; ctx.fillRect(l0, lo - 42, l1 - l0, 5);
      ctx.fillStyle = '#5a5248'; ctx.fillRect(l0 - 6, roof, 6, lo - roof); ctx.fillRect(l1, roof, 6, lo - roof);
    }
    ctx.fillStyle = '#4f4b44'; ctx.fillRect(a, GY - 2, z - a, 900);
    if (C.tunnel.to < z + 40) { ctx.fillStyle = '#9b927f'; ctx.fillRect(C.tunnel.to - 24, top, 40, GY - top); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(C.tunnel.to - 24, top, 6, GY - top); }
  }

  function surface(ctx, g, a, z, y) {
    const t = g.time;
    for (let x = Math.floor(a / 260) * 260 + 60; x < z; x += 260) {
      const i = Math.round(x / 260) % 4;
      if (i === 0) { ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - 2, y - 90, 4, 90); ctx.fillRect(x - 10, y - 94, 20, 6); ctx.fillStyle = '#ffe9a0'; ell(ctx, x, y - 86, 8, 3); }
      else if (i === 1) {
        ctx.fillStyle = '#3a3f47';
        ctx.fillRect(x - 28, y - 18, 4, 18); ctx.fillRect(x + 24, y - 18, 4, 18);
        ctx.fillRect(x - 27, y - 40, 3, 22); ctx.fillRect(x + 24, y - 40, 3, 22);
        ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 32, y - 21, 64, 5);
        ctx.fillStyle = '#8a5f38'; ctx.fillRect(x - 32, y - 40, 64, 5); ctx.fillRect(x - 32, y - 31, 64, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x - 32, y - 40, 64, 1.2); ctx.fillRect(x - 32, y - 21, 64, 1.2);
      }
      else if (i === 2) { ctx.fillStyle = '#2f6db0'; rr(ctx, x - 44, y - 30, 88, 22, 6); rr(ctx, x - 26, y - 46, 50, 18, 6); ctx.fillStyle = '#a8c8e0'; rr(ctx, x - 20, y - 43, 18, 12, 2); rr(ctx, x + 2, y - 43, 18, 12, 2); ctx.fillStyle = '#1f2125'; circle(ctx, x - 26, y - 8, 8); circle(ctx, x + 26, y - 8, 8); }
      else { ctx.fillStyle = '#4a4a48'; ctx.fillRect(x - 18, y - 2, 36, 4); ctx.fillStyle = 'rgba(255,240,190,0.18)'; poly(ctx, [x - 16, y + 2, x + 16, y + 2, x + 30, y + 120, x - 30, y + 120]); }
    }
  }

  function liftCar(ctx, g, C, front) {
    const x = C.tunnel.lift, k = g.capital ? g.capital.lift : { phase: 'idle', t: 0 }, L = ZS.sim.capital.LIFT;
    const shut = k.phase === 'close' ? 1 - k.t / L.close : k.phase === 'up' ? 1 : 0;
    if (!front) {
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x - 46, GY - DEEP, 92, DEEP);
      ctx.strokeStyle = '#5a5248'; ctx.lineWidth = 2; for (const dx of [-30, 30]) { ctx.beginPath(); ctx.moveTo(x + dx, GY - DEEP); ctx.lineTo(x + dx, GY - 150); ctx.stroke(); }
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(x - 40, GY - 150, 80, 150);
      ctx.fillStyle = '#9aa1a8'; ctx.fillRect(x - 40, GY - 150, 80, 8);
      ctx.fillStyle = k.phase === 'idle' ? '#2f9e44' : '#e8a400'; circle(ctx, x + 48, GY - 90, 4);
      return;
    }
    const w = 40 * shut;
    ctx.fillStyle = '#8f969c'; ctx.fillRect(x - 40, GY - 142, w, 142); ctx.fillRect(x + 40 - w, GY - 142, w, 142);
    ctx.strokeStyle = '#6f767c'; ctx.lineWidth = 1;
    for (let y = GY - 136; y < GY; y += 10) { ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x - 40 + w, y); ctx.moveTo(x + 40 - w, y); ctx.lineTo(x + 40, y); ctx.stroke(); }
  }

  function podState(g, C) {
    const k = g.capital ? g.capital.lift : { phase: 'idle', t: 0 }, L = ZS.sim.capital.LIFT;
    if (k.phase === 'rise') return { r: smooth(clamp(1 - k.t / L.rise, 0, 1)), o: 0 };
    if (k.phase === 'open') return { r: 1, o: smooth(clamp(1 - k.t / L.open, 0, 1)) };
    if (!g.once.liftUp || k.sinkAt === undefined) return { r: 0, o: 0 };
    const u = g.time - k.sinkAt;
    if (u < 0.7) return { r: 1, o: 1 };
    if (u < 1.1) return { r: 1, o: 1 - smooth(clamp((u - 0.7) / 0.4, 0, 1)) };
    return { r: 1 - smooth(clamp((u - 1.1) / L.sink, 0, 1)), o: 0 };
  }

  function cloth(ctx, x, short) {
    const bot = short ? GY - 34 : GY - 6;
    ctx.fillStyle = '#e9e5db';
    ctx.beginPath(); ctx.moveTo(x - 48, GY - 56); ctx.lineTo(x + 48, GY - 56); ctx.lineTo(x + 50, bot); ctx.lineTo(x - 50, bot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = -36; i <= 36; i += 18) ctx.fillRect(x + i, GY - 54, 2, bot - GY + 54);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(x - 50, bot - 6, 100, 4);
  }


  function hallDoor(ctx, x) {
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 24, GY - 156, 48, 156);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - 0.75, GY - 156, 1.5, 156);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (const dx of [-20, 4]) { ctx.fillRect(x + dx, GY - 148, 16, 60); ctx.fillRect(x + dx, GY - 78, 16, 62); }
    ctx.fillStyle = '#d6ab42'; ctx.fillRect(x - 5, GY - 84, 3, 10); ctx.fillRect(x + 2, GY - 84, 3, 10);
  }

  function hatch(ctx, g, C, front) {
    const x = C.tunnel.hatch;
    if (!front) {
      const sh = off(g) > 0 ? DEEP - 152 : DEEP - 2;
      ctx.fillStyle = '#2e2a24'; ctx.fillRect(x - 30, GY - DEEP + 2, 60, sh);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 30, GY - DEEP + 2, 6, sh);
      ctx.fillStyle = '#6a6458'; ctx.fillRect(x - 34, GY - DEEP + 2, 4, sh); ctx.fillRect(x + 30, GY - DEEP + 2, 4, sh);
      ctx.fillStyle = '#9aa1a8'; for (const dx of [-18, 18]) ctx.fillRect(x + dx - 2, GY - DEEP - 26, 4, DEEP + 26);
      ctx.fillStyle = '#7d848b'; for (let y = GY - DEEP - 14; y < GY - 6; y += 20) ctx.fillRect(x - 18, y, 36, 3);
      return;
    }
    ctx.fillStyle = '#14110d'; ctx.fillRect(x - 26, GY - 1, 52, 10);
    ctx.fillStyle = '#9aa1a8'; for (const dx of [-16, 16]) { ctx.fillRect(x + dx - 2, GY - 16, 4, 16); circle(ctx, x + dx, GY - 16, 3); }
  }


  function kiosk(ctx, g, C, front) {
    const x = C.tunnel.exit, D = ZS.sim.capital.LIFT.depth, { r, o } = podState(g, C);
    const base = GY + D * (1 - r), top = base - D + 8;
    if (!front) {
      if (r <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 70, TOP, 140, GY - TOP); ctx.clip();
      ctx.fillStyle = '#3a3f47'; rr(ctx, x - 44, top, 88, D - 8, 16);
      ctx.fillStyle = '#56606b'; rr(ctx, x - 38, top + 10, 76, D - 26, 12);
      ctx.fillStyle = 'rgba(255,233,160,0.35)'; ell(ctx, x, top + 16, 26, 4);
      ctx.restore();
      return;
    }
    if (r > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 70, TOP, 140, GY - TOP); ctx.clip();
      const w = 38 * (1 - o);
      ctx.fillStyle = 'rgba(170,205,225,0.45)'; ctx.fillRect(x - 38, top + 10, w, D - 26); ctx.fillRect(x + 38 - w, top + 10, w, D - 26);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 34, top + 16, 3, D - 40);
      ctx.fillStyle = '#c9ced3'; rr(ctx, x - 48, top - 6, 96, 16, 8);
      ctx.fillStyle = '#9aa1a8'; ctx.fillRect(x - 44, top + 4, 88, 4);
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(x - 48, base - 18, 96, 10);
      ctx.restore();
    }
    if (r > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 60, GY - 2, 120, 900); ctx.clip();
      cobbles(ctx, x - 60, x + 60, '#b8ad98', 'rgba(70,60,45,0.3)');
      ctx.restore();
    }
    const gap = r > 0.02 ? 46 : 44 * (1 - r);
    ctx.fillStyle = '#5b6370'; ctx.fillRect(x - 50, GY - 2, 50 - gap, 4); ctx.fillRect(x + gap, GY - 2, 50 - gap, 4);
    if (r > 0.02) { ctx.fillStyle = '#1f2125'; ctx.fillRect(x - 46, GY - 1, 92, 3); }
    else { ctx.fillStyle = '#6f767c'; ctx.fillRect(x - 46, GY - 2, 92, 4); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 0.5, GY - 2, 1, 4); }
  }


  function spyRoom(ctx, g, C) {
    const T = C.tunnel, x = T.spy, t = g.time, k = g.capital ? g.capital.spy : { state: 'listen', snack: true };
    ctx.fillStyle = '#ffe9a0'; ell(ctx, x - 20, GY - 168, 12, 5);
    ctx.fillStyle = 'rgba(255,240,180,0.18)'; poly(ctx, [x - 30, GY - 168, x - 10, GY - 168, x + 60, GY - 60, x - 100, GY - 60]);
    ctx.fillStyle = '#2b2f36'; rr(ctx, x + 14, GY - 132, 46, 34, 3);
    ctx.fillStyle = '#5ac87a'; ctx.fillRect(x + 18, GY - 128, 38, 26);
    ctx.strokeStyle = '#1f6a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 0; i < 38; i += 2) ctx.lineTo(x + 18 + i, GY - 115 + sin(t * 9 + i * 0.7) * (k.state === 'listen' ? 6 : 1)); ctx.stroke();
    const face = k.state === 'look' ? -1 : 1, hy = GY - 142;
    ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - 24, GY - 110, 6, 110); rr(ctx, x - 26, GY - 150, 10, 46, 3);
    ZS.drawGuestBust(ctx, { x: x - 6, y: GY - 114, face, up: 1, stand: 0, act: k.state === 'look' ? 'alarm' : 'eat', kind: 'mp', look: 5, seed: 77, scale: 0.95 }, t);
    ctx.fillStyle = '#1f2125';
    if (k.state === 'listen') {
      const bob = sin(t * 5.6) * 4, by = GY - 162 + bob, bx = x - 6;
      ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 8, hy + 18); ctx.lineTo(bx - 14, by + 2); ctx.moveTo(bx + 8, hy + 18); ctx.lineTo(bx + 2, by + 2); ctx.stroke();
      ctx.fillStyle = '#6b4a2b'; rr(ctx, bx - 40, by - 2, 50, 5, 2); rr(ctx, bx - 17, by - 12, 5, 24, 2);
    } else { ctx.lineWidth = 2; ctx.strokeStyle = '#1f2125'; ctx.beginPath(); ctx.arc(x + 30, GY - 104, 6, PI, 0); ctx.stroke(); rr(ctx, x + 22, GY - 106, 4, 6, 1.5); rr(ctx, x + 34, GY - 106, 4, 6, 1.5); }
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 40, GY - 98, 120, 8);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 36, GY - 90, 8, 90); ctx.fillRect(x + 68, GY - 90, 8, 90);
    ctx.fillStyle = '#3a3f47'; rr(ctx, x + 22, GY - 96 - 18, 40, 18, 2);
    for (const dx of [32, 52]) { ctx.fillStyle = '#c9ced3'; circle(ctx, x + dx, GY - 105, 6); ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + dx, GY - 105); ctx.lineTo(x + dx + cos(t * 6) * 5, GY - 105 + sin(t * 6) * 5); ctx.stroke(); }
    if (k.snack) { ctx.fillStyle = '#e9c27a'; rr(ctx, x - 30, GY - 106, 22, 8, 3); ctx.fillStyle = '#7cb84a'; ctx.fillRect(x - 28, GY - 106, 18, 2); }
    mark(ctx, x - 6, GY - 150, k.state === 'turn' ? 1 : k.state === 'look' ? 2 : 0, t);
    const cx = T.cabinet;
    ctx.fillStyle = '#7d8a96'; ctx.fillRect(cx - 24, GY - 120, 48, 120);
  }

  function cabinetFront(ctx, C) {
    const cx = C.tunnel.cabinet;
    ctx.fillStyle = '#8b98a4'; ctx.fillRect(cx - 26, GY - 64, 52, 64);
    ctx.fillStyle = '#6f7c88'; ctx.fillRect(cx - 22, GY - 58, 44, 2); ctx.fillRect(cx - 22, GY - 30, 44, 2);
    ctx.fillStyle = '#c9ced3'; ctx.fillRect(cx - 6, GY - 50, 12, 3); ctx.fillRect(cx - 6, GY - 22, 12, 3);
  }

  function curb(ctx, x) {
    const gr = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
    gr.addColorStop(0, 'rgba(120,110,95,0)'); gr.addColorStop(0.5, 'rgba(120,110,95,0.22)'); gr.addColorStop(1, 'rgba(120,110,95,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 26, GY - 2, 52, 900);
    ctx.fillStyle = '#b4ab99'; ctx.fillRect(x - 5, GY - 3, 10, 900);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 5, GY - 3, 10, 2); ctx.fillRect(x - 5, GY - 3, 2, 900);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = GY + 14; y < GY + 200; y += 18) ctx.fillRect(x - 5, y, 10, 1.4);
  }

  function edge(ctx, x, side, g) {
    const k = look(g);
    ctx.fillStyle = '#a69f90'; ctx.fillRect(x - 4, GY - 3, 8, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 4, GY - 3, 8, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 4, GY + 7, 8, 2);
    ctx.strokeStyle = k === 'autumn' ? '#7f8a4a' : '#4f8a35'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const bx = x - side * (6 + i * 7) + side * hash(x + i) * 4, hgt = 6 + hash(x * 1.3 + i) * 7;
      ctx.moveTo(bx, GY + 1); ctx.lineTo(bx + side * 3 - 2, GY - hgt);
      ctx.moveTo(bx + 2, GY + 1); ctx.lineTo(bx + side * 5, GY - hgt * 0.7);
    }
    ctx.stroke(); ctx.lineCap = 'butt';
  }

  function gate(ctx, x, part) {
    const w = 120, h = 190;
    if (part === 0) {
      ctx.fillStyle = '#b3a990'; ctx.fillRect(x - w / 2 - 30, GY - h - 50, w + 60, h + 50);
      ctx.fillStyle = '#9d937b'; for (let r = 0; r < 12; r++) ctx.fillRect(x - w / 2 - 30, GY - h - 50 + r * 20, w + 60, 1.4);
      const arch = (r) => { ctx.beginPath(); ctx.moveTo(x - r, GY); ctx.lineTo(x - r, GY - 118); ctx.quadraticCurveTo(x - r, GY - 150 - r * 0.6, x, GY - 158 - r * 0.5); ctx.quadraticCurveTo(x + r, GY - 150 - r * 0.6, x + r, GY - 118); ctx.lineTo(x + r, GY); ctx.closePath(); };
      ctx.fillStyle = '#c9bfa4'; arch(52); ctx.fill();
      ctx.fillStyle = '#a89c80';
      for (let i = 0; i < 9; i++) { const k = i / 8, ang = PI + k * PI, rx = x + cos(ang) * 46, ry = GY - 130 + sin(ang) * 42; ctx.fillRect(rx - 3, ry - 3, 6, 6); }
      ctx.fillStyle = '#2e2922'; arch(38); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,180,0.12)'; ctx.fillRect(x - 38, GY - 40, 76, 40);
      ctx.strokeStyle = '#5a5248'; ctx.lineWidth = 2.4;
      ctx.beginPath(); for (let dx = -30; dx <= 30; dx += 12) { ctx.moveTo(x + dx, GY - 150 + abs(dx) * 0.6); ctx.lineTo(x + dx, GY - 120); } ctx.moveTo(x - 36, GY - 132); ctx.lineTo(x + 36, GY - 132); ctx.stroke();
      ctx.fillStyle = '#5a5248'; for (let dx = -30; dx <= 30; dx += 12) poly(ctx, [x + dx - 2, GY - 120, x + dx + 2, GY - 120, x + dx, GY - 114]);
      ctx.fillStyle = '#2e2922'; rr(ctx, x - 8, GY - 214, 16, 26, 7);
      ctx.fillStyle = 'rgba(255,230,160,0.35)'; rr(ctx, x - 5, GY - 210, 10, 18, 5);
      ctx.fillStyle = '#9a4a32'; poly(ctx, [x - w / 2 - 40, GY - h - 50, x + w / 2 + 40, GY - h - 50, x, GY - h - 100]);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 1; i < 6; i++) ctx.fillRect(x - w / 2 - 40 + i * 6, GY - h - 50 - i * 8, w + 80 - i * 12, 1.4);
    } else {
      ctx.fillStyle = '#b3a990';
      ctx.fillRect(x - w / 2 - 30, GY - h - 50, 22, h + 50);
      ctx.fillRect(x + w / 2 + 8, GY - h - 50, 22, h + 50);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - w / 2 - 8, GY - h - 50, 3, h + 50);
    }
  }

  function palace(ctx, g, C) {
    const [a, z] = C.castle.palace, w = z - a, top = GY - 300, t = g.time;
    ctx.fillStyle = 'rgba(40,36,26,0.15)'; ctx.fillRect(a - 20, GY - 8, w + 40, 8);
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(a, top, w, 300);
    ctx.fillStyle = '#e4dfd2'; ctx.fillRect(a, top + 140, w, 4); ctx.fillRect(a, top + 230, w, 4);
    for (let row = 0; row < 3; row++) {
      for (let x = a + 40; x < z - 30; x += 48) {
        const y = top + 34 + row * 90;
        ctx.fillStyle = '#5b6773'; rr(ctx, x, y, 20, 40, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2, y + 2, 7, 36);
        ctx.fillStyle = '#d9d3c4'; ctx.fillRect(x - 3, y + 40, 26, 3);
      }
    }
    ctx.fillStyle = '#b8402e'; poly(ctx, [a - 14, top, z + 14, top, z - 40, top - 70, a + 40, top - 70]);
    ctx.fillStyle = '#a3382a'; for (let x = a; x < z; x += 22) ctx.fillRect(x, top - 66, 1.4, 64);
    for (const tx of [a - 10, z - 80]) {
      ctx.fillStyle = '#f5f2ea'; ctx.fillRect(tx, top - 90, 90, 390);
      ctx.fillStyle = '#5b6773'; for (let y = top - 60; y < GY - 60; y += 70) rr(ctx, tx + 34, y, 22, 36, 3);
      ctx.fillStyle = '#b8402e'; poly(ctx, [tx - 8, top - 90, tx + 98, top - 90, tx + 45, top - 170]);
      ctx.fillStyle = '#d6ab42'; ctx.fillRect(tx + 44, top - 186, 2, 18); circle(ctx, tx + 45, top - 188, 3);
    }
    portal(ctx, a + w / 2);
    const fx = a + w / 2;
    ctx.strokeStyle = '#8b6f45'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx + 60, top - 100); ctx.lineTo(fx + 60, top - 30); ctx.stroke();
    flagSk(ctx, fx + 60, top - 100, 34, 22, t, 0);
  }

  function portal(ctx, x) {
    const stone = '#e6dfcf', dark = '#c9bfa8', wood = '#6b4429', wd = '#55341f';
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x - 74, GY - 168, 148, 168);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#d6cebd' : '#ddd5c4'; ctx.fillRect(x - 78 + i * 6, GY - 6 - i * 5, 156 - i * 12, 6); }
    for (const dx of [-62, 46]) {
      ctx.fillStyle = stone; ctx.fillRect(x + dx, GY - 150, 16, 136);
      ctx.fillStyle = dark; ctx.fillRect(x + dx + 12, GY - 150, 4, 136);
      ctx.fillStyle = '#efe9dc'; ctx.fillRect(x + dx - 3, GY - 156, 22, 8); ctx.fillRect(x + dx - 3, GY - 22, 22, 8);
    }
    ctx.fillStyle = stone; ctx.fillRect(x - 70, GY - 176, 140, 22);
    ctx.fillStyle = dark; ctx.fillRect(x - 70, GY - 158, 140, 4);
    ctx.fillStyle = '#efe9dc'; poly(ctx, [x - 78, GY - 176, x + 78, GY - 176, x + 66, GY - 186, x - 66, GY - 186]);
    ctx.fillStyle = '#efe9dc'; poly(ctx, [x - 40, GY - 186, x + 40, GY - 186, x, GY - 214]);
    ctx.fillStyle = dark; poly(ctx, [x - 30, GY - 188, x + 30, GY - 188, x, GY - 207]);
    arms(ctx, x, GY - 206, 0.95);
    ctx.fillStyle = '#3a2a1c';
    ctx.beginPath(); ctx.moveTo(x - 44, GY - 14); ctx.lineTo(x - 44, GY - 112); ctx.arc(x, GY - 112, 44, PI, 0); ctx.lineTo(x + 44, GY - 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = stone; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 47, GY - 14); ctx.lineTo(x - 47, GY - 112); ctx.arc(x, GY - 112, 47, PI, 0); ctx.lineTo(x + 47, GY - 14); ctx.stroke();
    ctx.fillStyle = stone; poly(ctx, [x - 6, GY - 164, x + 6, GY - 164, x + 8, GY - 150, x - 8, GY - 150]);
    ctx.fillStyle = 'rgba(170,200,220,0.55)';
    ctx.beginPath(); ctx.moveTo(x - 40, GY - 112); ctx.arc(x, GY - 112, 40, PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = wd; ctx.lineWidth = 1.6;
    for (let i = 1; i < 6; i++) { const a2 = PI + i * PI / 6; ctx.beginPath(); ctx.moveTo(x, GY - 112); ctx.lineTo(x + cos(a2) * 40, GY - 112 + sin(a2) * 40); ctx.stroke(); }
    ctx.fillStyle = wood; ctx.fillRect(x - 40, GY - 112, 80, 98);
    ctx.fillStyle = wd; ctx.fillRect(x - 1, GY - 112, 2, 98);
    for (const dx of [-34, 6]) for (const dy of [-104, -62]) { ctx.fillStyle = wd; ctx.fillRect(x + dx, GY + dy, 28, 36); ctx.fillStyle = 'rgba(255,220,170,0.12)'; ctx.fillRect(x + dx + 2, GY + dy + 2, 24, 3); }
    ctx.fillStyle = '#d6ab42'; circle(ctx, x - 6, GY - 58, 2.6); circle(ctx, x + 6, GY - 58, 2.6);
    for (const dx of [-90, 90]) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x + dx - 2, GY - 150, 4, 24); ctx.fillStyle = '#ffe9a0'; rr(ctx, x + dx - 6, GY - 160, 12, 14, 3); }
  }

  function statue(ctx, g, p) {
    const x = p.x, b = g.bear, on = b.climbing && b.climbing.post === p && b.climbing.phase !== 'climb';
    const br = '#5c4e3a', dk = '#4a3e2c', hi = 'rgba(255,240,210,0.16)';
    ctx.fillStyle = 'rgba(40,36,26,0.2)'; ell(ctx, x, GY + 2, 64, 6);
    ctx.fillStyle = '#9b9384'; ctx.fillRect(x - 48, GY - 60, 96, 60);
    ctx.fillStyle = '#b3ab9a'; ctx.fillRect(x - 54, GY - 66, 108, 8); ctx.fillRect(x - 52, GY - 8, 104, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 30, GY - 58, 14, 50);
    ctx.strokeStyle = br; ctx.lineCap = 'round'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x - 30, GY - 96); ctx.lineTo(x - 36, GY - 68); ctx.moveTo(x - 18, GY - 94); ctx.lineTo(x - 12, GY - 68);
    ctx.moveTo(x + 22, GY - 98); ctx.lineTo(x + 34, GY - 82); ctx.lineTo(x + 30, GY - 68); ctx.moveTo(x + 28, GY - 98); ctx.quadraticCurveTo(x + 48, GY - 104, x + 50, GY - 86); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = br;
    ctx.beginPath(); ctx.moveTo(x - 40, GY - 104); ctx.quadraticCurveTo(x - 40, GY - 126, x - 10, GY - 124); ctx.lineTo(x + 18, GY - 126);
    ctx.quadraticCurveTo(x + 36, GY - 128, x + 38, GY - 112); ctx.quadraticCurveTo(x + 36, GY - 92, x + 16, GY - 92); ctx.lineTo(x - 26, GY - 90); ctx.quadraticCurveTo(x - 42, GY - 92, x - 40, GY - 104); ctx.fill();
    poly(ctx, [x + 22, GY - 124, x + 38, GY - 160, x + 50, GY - 166, x + 46, GY - 148, x + 36, GY - 114]);
    ctx.beginPath(); ctx.moveTo(x + 40, GY - 168); ctx.quadraticCurveTo(x + 64, GY - 166, x + 68, GY - 152); ctx.lineTo(x + 62, GY - 146); ctx.quadraticCurveTo(x + 50, GY - 150, x + 42, GY - 146); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dk; poly(ctx, [x + 38, GY - 166, x + 42, GY - 176, x + 46, GY - 166]);
    poly(ctx, [x + 26, GY - 150, x + 36, GY - 166, x + 34, GY - 140]);
    ctx.beginPath(); ctx.moveTo(x - 38, GY - 112); ctx.quadraticCurveTo(x - 58, GY - 108, x - 54, GY - 80); ctx.lineTo(x - 48, GY - 82); ctx.quadraticCurveTo(x - 50, GY - 100, x - 38, GY - 104); ctx.fill();
    ctx.fillStyle = hi; ell(ctx, x - 6, GY - 118, 22, 4);
    if (!on) {
      ctx.fillStyle = br;
      poly(ctx, [x - 8, GY - 122, x + 8, GY - 122, x + 6, GY - 160, x - 6, GY - 160]);
      ctx.fillStyle = dk; poly(ctx, [x - 4, GY - 124, x + 10, GY - 124, x + 14, GY - 104, x + 4, GY - 104]);
      ctx.fillStyle = br; circle(ctx, x, GY - 168, 8);
      ctx.fillStyle = dk; poly(ctx, [x - 9, GY - 170, x + 9, GY - 170, x + 4, GY - 182, x - 4, GY - 182]);
      ctx.strokeStyle = dk; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 4, GY - 154); ctx.lineTo(x + 18, GY - 166); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 18, GY - 166); ctx.lineTo(x + 30, GY - 206); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = dk; poly(ctx, [x - 6, GY - 156, x - 22, GY - 132, x - 12, GY - 128, x, GY - 150]);
    }
  }

  function well(ctx, x, front) {
    if (!front) {
      ctx.fillStyle = 'rgba(40,36,26,0.2)'; ell(ctx, x, GY + 2, 46, 5);
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 36, GY - 130, 6, 130); ctx.fillRect(x + 30, GY - 130, 6, 130);
      ctx.fillStyle = '#9a4a32'; poly(ctx, [x - 50, GY - 124, x + 50, GY - 124, x, GY - 166]);
      ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 32, GY - 104, 64, 4);
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, GY - 102); ctx.lineTo(x, GY - 70); ctx.stroke();
      ctx.fillStyle = '#6b4a2b'; rr(ctx, x - 6, GY - 72, 12, 10, 2);
      return;
    }
    ctx.fillStyle = '#b3a990'; rr(ctx, x - 40, GY - 56, 80, 56, 6);
    ctx.fillStyle = '#9d937b'; for (let r = 0; r < 4; r++) ctx.fillRect(x - 40, GY - 56 + r * 14, 80, 1.4);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) ctx.fillRect(x - 40 + c * 20 + (r % 2) * 10, GY - 56 + r * 14, 1.4, 14);
    ctx.fillStyle = '#c9c0ae'; rr(ctx, x - 44, GY - 62, 88, 8, 3);
  }

  function desk(ctx, x) {
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 36, GY - 58, 78, 58);
    ctx.fillStyle = '#8a5f38'; ctx.fillRect(x - 40, GY - 62, 86, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 30, GY - 48, 66, 2);
    ctx.fillStyle = '#d6ab42'; circle(ctx, x + 2, GY - 30, 4);
  }

  function vitrine(ctx, g, C) {
    const x = C.castle.vitrine, it = g.level.items.find((o) => o.vitrine), open = !!it && it.eaten;
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(x - 90, GY - 330, 180, 330);
    ctx.fillStyle = '#b8402e'; poly(ctx, [x - 100, GY - 330, x + 100, GY - 330, x, GY - 420]);
    ctx.fillStyle = '#5b6773'; rr(ctx, x - 12, GY - 300, 24, 40, 3);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 36, GY - 52, 72, 52);
    ctx.fillStyle = 'rgba(200,225,240,0.5)'; ctx.fillRect(x - 32, GY - 100, 64, 48);
    ctx.strokeStyle = '#c9a647'; ctx.lineWidth = 2; ctx.strokeRect(x - 32, GY - 100, 64, 48);
    if (!open) {
      ctx.fillStyle = '#e0a020'; rr(ctx, x - 10, GY - 82, 20, 24, 5);
      ctx.fillStyle = '#c4851a'; ctx.fillRect(x - 11, GY - 84, 22, 4);
    }
    ctx.fillStyle = '#d6ab42';
    poly(ctx, [x + 14, GY - 64, x + 14, GY - 76, x + 18, GY - 70, x + 22, GY - 78, x + 26, GY - 70, x + 30, GY - 76, x + 30, GY - 64]);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 28, GY - 98, 6, 44);
    label(ctx, LABELS.capital.board.vitrine, x, GY - 116, 10, '#3a2f22');
  }

  function scaffold(ctx, g, p) {
    const x = p.x, top = GY - 210;
    ctx.strokeStyle = '#7b8a96'; ctx.lineWidth = 3;
    for (const dx of [-40, 40]) { ctx.beginPath(); ctx.moveTo(x + dx, GY); ctx.lineTo(x + dx, top); ctx.stroke(); }
    ctx.lineWidth = 2;
    for (let y = GY - 52; y > top; y -= 52) { ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x + 44, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 40, y + 52); ctx.lineTo(x + 40, y); ctx.stroke(); }
    ctx.fillStyle = '#c9a26a'; ctx.fillRect(x - 46, GY - 166, 92, 6);
    ctx.fillStyle = 'rgba(70,110,170,0.55)'; ctx.fillRect(x - 44, top - 20, 88, 30);
    ctx.fillStyle = '#e8590c'; ctx.fillRect(x - 44, top - 22, 88, 4);
    ctx.fillStyle = '#8a8f96';
    for (let y = GY - 18; y > GY - 160; y -= 25) ctx.fillRect(x - 6, y, 12, 2);
  }

  const LEAF = { summer: ['#2f5e2f', '#3e7a3a', '#4f8f45', '#63a253'], autumn: ['#4a5e2c', '#5f7436', '#73884a', '#8a9a58'] };

  function shrub(ctx, a, z, top, sd, cols, base) {
    for (let x = a + 8, i = 0; x < z - 6; x += 9, i++) {
      for (let y = top + 8; y < base - 4; y += 10) {
        const n = hash(sd + i * 7.3 + y * 0.31), r = 7 + n * 4;
        ctx.fillStyle = cols[Math.min(3, Math.floor((1 - (y - top) / (base - top)) * 2 + n * 2))];
        circle(ctx, x + (n - 0.5) * 5, y + (hash(sd + i) - 0.5) * 4, r);
      }
    }
  }

  function hedgeBack(ctx, h, g) {
    const [a, z] = h, cols = LEAF[look(g)];
    ctx.fillStyle = 'rgba(30,40,22,0.2)'; ell(ctx, (a + z) / 2, GY + 3, (z - a) / 2 + 14, 4);
    ctx.fillStyle = cols[0]; rr(ctx, a, GY - 66, z - a, 66, 8);
    for (const x of [a + 14, z - 14]) {
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 2, GY - 92, 4, 28);
      ctx.fillStyle = cols[1]; circle(ctx, x, GY - 98, 15);
      ctx.fillStyle = cols[2]; circle(ctx, x - 4, GY - 102, 8);
    }
  }

  function hedgeFront(ctx, h, g) {
    const [a, z] = h, cols = LEAF[look(g)];
    ctx.fillStyle = cols[1]; rr(ctx, a + 2, GY - 56, z - a - 4, 56, 6);
    shrub(ctx, a + 2, z - 2, GY - 58, a * 0.029, [cols[1], cols[1], cols[2], cols[2]], GY - 4);
    ctx.fillStyle = cols[3]; ctx.globalAlpha = 0.35; rr(ctx, a + 6, GY - 56, z - a - 12, 5, 2); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(a + 4, GY - 6, z - a - 8, 6);
  }

  function urn(ctx, x) {
    ctx.fillStyle = '#d8d0bd'; ctx.fillRect(x - 10, GY - 44, 20, 44); ctx.fillRect(x - 13, GY - 48, 26, 6);
    ctx.fillStyle = '#c9c0ab'; poly(ctx, [x - 12, GY - 48, x + 12, GY - 48, x + 8, GY - 66, x - 8, GY - 66]);
    ctx.fillStyle = '#d8d0bd'; ctx.fillRect(x - 14, GY - 70, 28, 5);
    ctx.fillStyle = '#c0392b'; circle(ctx, x - 5, GY - 74, 3); circle(ctx, x + 4, GY - 75, 3); ctx.fillStyle = '#4f8a45'; circle(ctx, x, GY - 72, 3);
  }

  function beds(ctx, g, a, z) {
    ctx.fillStyle = '#4f8a45'; ctx.fillRect(a, GY + 2, z - a, 5);
    for (let i = Math.floor(a / 9); i * 9 < z; i++) {
      const x = i * 9;
      if (x + 4 < a || x + 4 > z) continue;
      ctx.fillStyle = i % 3 === 0 ? '#e03131' : i % 3 === 1 ? '#f2c230' : '#f4f2ec'; circle(ctx, x + 4, GY + 3, 2.2);
    }
  }

  function fountain(ctx, g, x) {
    const t = g.time;
    ctx.fillStyle = 'rgba(30,30,20,0.18)'; ell(ctx, x, GY + 2, 38, 4);
    ctx.fillStyle = '#cfc6b2'; rr(ctx, x - 34, GY - 26, 68, 26, 6);
    ctx.fillStyle = '#bdb39d'; ctx.fillRect(x - 34, GY - 26, 68, 5);
    ctx.fillStyle = '#7fb0d6'; ell(ctx, x, GY - 26, 30, 4);
    ctx.fillStyle = '#c9c0ab'; ctx.fillRect(x - 5, GY - 62, 10, 38); ell(ctx, x, GY - 62, 14, 4);
    ctx.strokeStyle = 'rgba(200,230,250,0.85)'; ctx.lineWidth = 1.6;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, GY - 66); ctx.quadraticCurveTo(x + d * 14, GY - 92 - sin(t * 3) * 2, x + d * 26, GY - 28); ctx.stroke(); }
    ctx.fillStyle = 'rgba(220,240,252,0.8)';
    for (let i = 0; i < 6; i++) { const u = frac(t * 0.9 + i / 6); circle(ctx, x + (i % 2 ? 1 : -1) * 26 + sin(i) * 3, GY - 28 - u * 6, 1.6 * (1 - u)); }
  }

  function parliament(ctx, g, C) {
    const a = C.square.cordon[1] - 30, z = C.inside.from + 8, top = GY - 300, door = C.square.gate + 50;
    ctx.fillStyle = '#ebe5d7'; ctx.fillRect(a, top, z - a, 300);
    ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let y = top + 20; y < GY; y += 26) ctx.fillRect(a, y, z - a, 1.4);
    ctx.fillStyle = '#3f4a56'; ctx.fillRect(a, top + 36, z - a, 74);
    ctx.fillStyle = 'rgba(160,190,215,0.35)'; for (let x = a + 4; x < z - 4; x += 26) ctx.fillRect(x, top + 40, 20, 66);
    ctx.fillStyle = '#d2cbbb'; ctx.fillRect(a - 8, top - 14, z - a + 16, 16);
    ctx.fillStyle = '#c4bdac'; ctx.fillRect(a - 8, top + 110, z - a + 16, 8);
    text(ctx, LABELS.capital.board.nrsr, (a + z) / 2, top + 16, 15, '#3a3a3a', z - a - 20, 900);
    arms(ctx, (a + z) / 2, top + 124, 1.6);
    haze(ctx, a - 8, top - 14, z - a + 16, 150, 0.18);
    for (const px of [door - 82, door - 30, door + 30]) {
      ctx.fillStyle = '#d9d2c2'; ctx.fillRect(px - 5, GY - 176, 10, 176);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(px + 2, GY - 176, 3, 176);
    }
    ctx.fillStyle = '#a9a294'; ctx.fillRect(door - 104, GY - 186, 160, 12);
    ctx.fillStyle = '#8f887a'; ctx.fillRect(door - 104, GY - 174, 160, 3);
    ctx.fillStyle = '#29323b'; ctx.fillRect(door - 74, GY - 166, 96, 166);
    ctx.fillStyle = 'rgba(150,185,210,0.75)'; ctx.fillRect(door - 70, GY - 162, 42, 160); ctx.fillRect(door - 22, GY - 162, 40, 160);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(door - 64, GY - 156, 8, 150); ctx.fillRect(door - 16, GY - 156, 8, 150);
    ctx.fillStyle = '#c9a647'; ctx.fillRect(door - 32, GY - 90, 3, 22); ctx.fillRect(door - 20, GY - 90, 3, 22);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#bdb6a6' : '#cac3b3'; ctx.fillRect(a - 30 + i * 8, GY - 6 + i * 0 - (2 - i) * 4, z - a + 30 - i * 8, 4); }
  }

  function jamb(ctx, x, col, top) {
    const y = top || TOP;
    ctx.fillStyle = col; ctx.fillRect(x - 10, y, 20, GY - y);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 10, y, 4, GY - y);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 6, y, 4, GY - y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - 12, GY - 4, 24, 4);
  }

  function paw(ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ell(ctx, x, y + 3 * s, 7 * s, 5.5 * s);
    for (const [dx, dy] of [[-7, -5], [-2.5, -8.5], [2.5, -8.5], [7, -5]]) ell(ctx, x + dx * s, y + dy * s, 2.6 * s, 3 * s);
  }

  function bearFlag(ctx, x, y, w, h, t) {
    const wv = (u) => sin(t * 3 + 0.8 + u * 4) * h * 0.07;
    ctx.fillStyle = '#3f7d3a';
    ctx.beginPath(); ctx.moveTo(x, y + wv(0));
    for (let k = 1; k <= 6; k++) ctx.lineTo(x + w * k / 6, y + wv(k / 6));
    for (let k = 6; k >= 0; k--) ctx.lineTo(x + w * k / 6, y + h + wv(k / 6));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.78 + wv(0));
    for (let k = 1; k <= 6; k++) ctx.lineTo(x + w * k / 6, y + h * 0.78 + wv(k / 6));
    for (let k = 6; k >= 0; k--) ctx.lineTo(x + w * k / 6, y + h * 0.9 + wv(k / 6));
    ctx.closePath(); ctx.fill();
    paw(ctx, x + w * 0.5, y + h * 0.42 + wv(0.5), h / 40, '#6b4226');
  }

  function pole(ctx, t, g, withBear) {
    const x = t.x, h = t.h + 96, b = g.bear, time = g.time, on = b.climbing === t;
    ctx.fillStyle = 'rgba(40,36,26,0.2)'; ell(ctx, x, GY + 2, 22, 4);
    ctx.fillStyle = '#8f969c'; ctx.fillRect(x - 12, GY - 14, 24, 14);
    ctx.fillStyle = '#c9ced3'; poly(ctx, [x - 4, GY - 14, x + 4, GY - 14, x + 2, GY - h, x - 2, GY - h]);
    ctx.fillStyle = '#e6e9ec'; ctx.fillRect(x - 1, GY - h, 1, h - 14);
    ctx.fillStyle = '#d6ab42'; circle(ctx, x, GY - h - 4, 4);
    ctx.fillStyle = '#f4efe2'; rr(ctx, x - 30, GY - 40, 60, 16, 3);
    text(ctx, LABELS.capital.signs.flag, x, GY - 32, 6.4, '#3a2f22', 56, 800);
    const top = on && b.inCanopy;
    flagSk(ctx, x + 2, GY - h + 8, 100, 54, time, 0);
    if (g.once.flagTop) {
      const at = g.capital && g.capital.flagAt, k = at == null ? 1 : Math.min(1, (time - at) / 1.6), e = 1 - (1 - k) * (1 - k);
      const y0 = top ? b.y - 40 : GY - h + 140, y1 = GY - h + 70;
      ctx.fillStyle = '#9aa1a7'; ctx.fillRect(x + 1, y1 - 2, 3, 2);
      bearFlag(ctx, x + 2, y0 + (y1 - y0) * e, 84 * (0.4 + 0.6 * e), 46 * (0.4 + 0.6 * e), time);
    }
    if (on) withBear(ZS.drawBearClimbing);
  }

  function flag(ctx, g, p) {
    const x = p.x, t = g.time;
    for (const dx of [-70, 70]) {
      ctx.fillStyle = '#b0b6bb'; ctx.fillRect(x + dx - 1.5, GY - 160, 3, 160);
      if (dx > 0) { flagSk(ctx, x + dx + 2, GY - 158, 42, 27, t, 1.3); continue; }
      ctx.fillStyle = '#1f4fa0'; ctx.fillRect(x + dx + 2, GY - 158 + sin(t * 3 + dx) * 2, 42, 27);
      ctx.fillStyle = '#f2c230'; for (let i = 0; i < 12; i++) circle(ctx, x + dx + 23 + cos(i * PI / 6) * 8.5, GY - 144.5 + sin(t * 3 + dx) * 2 + sin(i * PI / 6) * 8.5, 1.3);
    }
  }

  function barrier(ctx, x) {
    ctx.strokeStyle = '#9aa1a8'; ctx.lineWidth = 2.4;
    ctx.strokeRect(x - 40, GY - 52, 80, 46);
    ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = -32; i <= 32; i += 8) { ctx.moveTo(x + i, GY - 52); ctx.lineTo(x + i, GY - 6); }
    ctx.stroke();
    ctx.fillStyle = '#7c838a'; ctx.fillRect(x - 44, GY - 6, 12, 6); ctx.fillRect(x + 32, GY - 6, 12, 6);
  }

  function van(ctx, x, t) {
    ctx.fillStyle = 'rgba(20,20,20,0.2)'; ell(ctx, x, GY + 2, 80, 5);
    ctx.fillStyle = '#e9ecef'; rr(ctx, x - 78, GY - 92, 156, 82, 10);
    ctx.fillStyle = '#1f3a7a'; ctx.fillRect(x - 78, GY - 52, 156, 14);
    ctx.fillStyle = '#d6f04a'; for (let i = 0; i < 8; i++) ctx.fillRect(x - 78 + i * 20, GY - 52 + (i % 2) * 7, 10, 7);
    text(ctx, LABELS.capital.board.police, x, GY - 70, 13, '#1f3a7a', 140, 900);
    ctx.fillStyle = '#5b6773'; rr(ctx, x + 40, GY - 86, 32, 24, 4);
    ctx.fillStyle = '#222'; circle(ctx, x - 48, GY - 10, 13); circle(ctx, x + 48, GY - 10, 13);
    ctx.fillStyle = '#888'; circle(ctx, x - 48, GY - 10, 5); circle(ctx, x + 48, GY - 10, 5);
    const u = frac(t * 1.6), on = u < 0.5, k = sin(u * 2 * PI) * 0.5 + 0.5;
    ctx.fillStyle = '#3a3f47'; rr(ctx, x - 26, GY - 96, 52, 5, 2);
    for (const [dx, lit] of [[-13, on], [13, !on]]) {
      const cx = x + dx, cy = GY - 101;
      if (lit) {
        const gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
        gr.addColorStop(0, 'rgba(90,140,255,' + (0.45 * (0.6 + 0.4 * k)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(90,140,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(cx - 26, cy - 26, 52, 52);
      }
      ctx.fillStyle = lit ? '#4f86ff' : '#1d3a8a'; rr(ctx, cx - 10, cy - 5, 20, 9, 4);
      ctx.fillStyle = lit ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)'; rr(ctx, cx - 6, cy - 4, 8, 3, 1.5);
    }
  }

  function tripodBack(ctx, x, t, live) {
    ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x, GY - 86); ctx.lineTo(x - 26, GY); ctx.moveTo(x, GY - 86); ctx.lineTo(x + 26, GY); ctx.moveTo(x, GY - 86); ctx.lineTo(x + 4, GY); ctx.stroke();
    ctx.fillStyle = '#23262c'; rr(ctx, x - 24, GY - 110, 48, 26, 4);
    ctx.fillStyle = '#3a3f47'; rr(ctx, x + 18, GY - 104, 16, 14, 3);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(x - 22, GY - 108, 18, 6);
    text(ctx, 'STRACH 24', x - 13, GY - 105, 4.6, '#fff', 18, 900);
    if (live) { ctx.fillStyle = frac(t * 2) < 0.5 ? '#ff3b30' : '#7a1d18'; circle(ctx, x + 18, GY - 112, 2.6); }
  }

  function tripodFront(ctx, x) {
    ctx.fillStyle = '#3a3f47'; rr(ctx, x - 34, GY - 56, 68, 56, 6);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(x - 34, GY - 56, 68, 10);
    text(ctx, 'STRACH 24', x, GY - 51, 7, '#fff', 60, 900);
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(x - 30, GY - 40, 60, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x - 30, GY - 44, 6, 40);
  }

  function crew(ctx, g, C) {
    const t = g.time, c = g.capital, k = c ? c.crew : { phase: 'talk', k: 0 }, x = C.square.reporter;
    const pan = k.phase === 'pan' || k.phase === 'warn';
    person(ctx, 'capReporter', 'reporter', x, -1, 'idle', t);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 18, GY - 66, 2, 12);
    ctx.fillStyle = '#c4262e'; rr(ctx, x - 22, GY - 72, 9, 8, 1.5);
    const cx = x + 74;
    person(ctx, 'capCamera', 'guest', cx + 14, -1, 'idle', t, { look: 3 });
    ctx.save(); ctx.translate(cx, GY - 78); ctx.rotate(pan ? -0.04 : 0.05);
    ctx.fillStyle = '#23262c'; rr(ctx, -30, -12, 46, 24, 4);
    ctx.fillStyle = '#3a3f47'; rr(ctx, -40, -8, 12, 16, 3);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(-26, -10, 20, 6);
    ctx.fillStyle = frac(t * 2) < 0.5 ? '#ff3b30' : '#7a1d18'; circle(ctx, 8, -9, 2.6);
    ctx.restore();
    label(ctx, LABELS.capital.board.live, x + 30, GY - 142, 10, '#c4262e');
    if (!c) return;
    if (k.phase === 'warn') mark(ctx, cx, GY - 130, 1, t);
    if (k.k > 0.01) {
      const reach = SIM().CREW.range;
      ctx.fillStyle = 'rgba(255,248,200,' + (0.2 * k.k).toFixed(3) + ')';
      poly(ctx, [cx - 40, GY - 80, x - 60 - reach, GY - 150, x - 60 - reach, GY, x - 40, GY]);
    }
  }

  function turnstile(ctx, g, C) {
    const x = C.square.gate, open = g.once.badge;
    ctx.fillStyle = '#7c838a'; ctx.fillRect(x - 6, GY - 66, 12, 66);
    ctx.fillStyle = '#5b6370'; rr(ctx, x - 18, GY - 74, 36, 12, 3);
    ctx.fillStyle = open ? '#2f9e44' : '#e03131'; circle(ctx, x, GY - 68, 3);
    ctx.strokeStyle = '#aeb5bb'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, GY - 50); ctx.lineTo(x - (open ? 10 : 42), GY - (open ? 20 : 50)); ctx.stroke();
  }

  function portrait(ctx, x, i) {
    const y = GY - 168;
    ctx.fillStyle = '#9a7040'; ctx.fillRect(x - 20, y, 40, 50);
    ctx.fillStyle = '#4a5560'; ctx.fillRect(x - 16, y + 4, 32, 42);
    ctx.fillStyle = '#c9b89a'; circle(ctx, x, y + 20, 7);
    ctx.fillStyle = '#2b2f36'; poly(ctx, [x - 12, y + 46, x - 9, y + 30, x + 9, y + 30, x + 12, y + 46]);
    ctx.fillStyle = '#7d8a96'; ell(ctx, x, y + 14, 6, 2.5 + (i % 2));
  }

  function door(ctx, x, w, sign, col) {
    const H = 112;
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - w / 2 - 5, GY - H - 5, w + 10, H + 5);
    ctx.fillStyle = col || '#8a5f38'; ctx.fillRect(x - w / 2, GY - H, w, H);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 1, GY - H, 2, H);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; for (const dx of [-w / 2 + 5, 4]) { ctx.fillRect(x + dx, GY - H + 8, w / 2 - 9, 42); ctx.fillRect(x + dx, GY - H + 58, w / 2 - 9, 44); }
    ctx.fillStyle = '#d6ab42'; circle(ctx, x - 6, GY - 54, 2); circle(ctx, x + 6, GY - 54, 2);
    if (sign) {
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(x - 50, GY - H - 28, 100, 18);
      ctx.strokeStyle = '#9a7040'; ctx.lineWidth = 1; ctx.strokeRect(x - 50, GY - H - 28, 100, 18);
      text(ctx, sign, x, GY - H - 19, 8, '#3a2f22', 94, 700);
    }
  }

  function lamp(ctx, x, warm) {
    ctx.fillStyle = 'rgba(255,240,200,0.18)'; poly(ctx, [x - 16, GY - 250, x + 16, GY - 250, x + 70, GY - 100, x - 70, GY - 100]);
    ctx.fillStyle = '#c9a647'; ctx.fillRect(x - 1, GY - 262, 2, 8);
    ctx.fillStyle = warm || '#fff4d6'; ell(ctx, x, GY - 250, 16, 6);
  }

  function frame(ctx, g, C) {
    const x = C.hall.frame, beep = g.once.frame && frac(g.time * 3) < 0.5 && g.bear.x - x < 140;
    ctx.fillStyle = '#9aa1a8'; ctx.fillRect(x - 38, GY - 190, 10, 190); ctx.fillRect(x + 28, GY - 190, 10, 190); ctx.fillRect(x - 38, GY - 198, 76, 14);
    ctx.fillStyle = beep ? '#e03131' : '#2f9e44'; circle(ctx, x, GY - 191, 3.5);
    const gx = C.hall.guard;
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(gx - 30, GY - 60, 70, 60);
    ctx.fillStyle = '#8a5f38'; ctx.fillRect(gx - 34, GY - 64, 78, 6);
    ctx.fillStyle = '#2b2f36'; rr(ctx, gx + 6, GY - 84, 24, 18, 2);
    ctx.fillStyle = '#7cc4ef'; ctx.fillRect(gx + 9, GY - 81, 18, 12);
    ZS.drawGuestBust(ctx, { x: gx - 4, y: GY - 64, face: -1, up: 1, stand: 0, act: 'film', kind: 'police', look: 0, seed: 4, scale: 0.95 }, g.time);
  }

  function ficus(ctx, c, g) {
    const x = c.x, t = g.time, sd = c.shade;
    ctx.fillStyle = 'rgba(30,30,20,0.2)'; ell(ctx, x, GY + 2, 34, 4);
    ctx.fillStyle = '#f2efe6'; poly(ctx, [x - 20, GY - 36, x + 20, GY - 36, x + 15, GY, x - 15, GY]);
    ctx.fillStyle = '#d9d3c4'; ctx.fillRect(x - 22, GY - 40, 44, 5);
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, GY - 38); ctx.quadraticCurveTo(x - 5, GY - 80, x + 2, GY - 112); ctx.stroke();
    for (let i = 0; i < 30; i++) {
      const a = hash(sd * 13 + i) * PI * 2, r = 8 + hash(sd * 7 + i) * 30, sway = sin(t * 1.2 + i) * 1.2;
      const lx = x + cos(a) * r * 0.9 + sway, ly = GY - 88 + sin(a) * r * 0.85;
      ctx.fillStyle = i % 3 ? '#2f6a34' : '#3f8a45';
      ell(ctx, lx, ly, 8, 4.4, a);
    }
  }

  function pillar(ctx, c) {
    const x = c.x;
    ctx.fillStyle = '#e4dccb'; ctx.fillRect(x - 24, GY - 262, 48, 262);
    ctx.fillStyle = '#d2c8b4'; ctx.fillRect(x - 30, GY - 262, 60, 12); ctx.fillRect(x - 30, GY - 14, 60, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 18, GY - 250, 6, 236);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 12, GY - 250, 8, 236);
  }

  function rack(ctx, c) {
    const x = c.x;
    ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY - 160); ctx.moveTo(x - 24, GY); ctx.lineTo(x, GY - 20); ctx.lineTo(x + 24, GY); ctx.stroke();
    const coats = ['#26324a', '#4a4f57', '#5a2a3a', '#3d4a3a'];
    coats.forEach((col, i) => {
      const dx = (i - 1.5) * 14;
      ctx.fillStyle = col; rr(ctx, x + dx - 14, GY - 154, 28, 104, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + dx - 1, GY - 150, 2, 96);
    });
    ctx.fillStyle = '#2b2f36'; ell(ctx, x - 6, GY - 166, 16, 4); ctx.fillRect(x - 14, GY - 176, 16, 10);
  }

  function corridor(ctx, g, C, vis) {
    for (let x = C.corridor.from + 70, i = 0; x < C.corridor.door - 80; x += 150, i++) {
      if (!vis(x, 80)) continue;
      if (i === 2) door(ctx, x, 54, LABELS.capital.board.club);
      else if (i === 4) door(ctx, x, 54, LABELS.capital.board.committee);
      else portrait(ctx, x, i);
      lamp(ctx, x + 75);
    }
    const px = C.corridor.from + 40;
    if (vis(px, 60)) {
      ctx.fillStyle = '#f4f6f8'; ctx.fillRect(px - 30, GY - 190, 60, 44);
      ctx.strokeStyle = '#4a6a9a'; ctx.lineWidth = 0.8; ctx.strokeRect(px - 26, GY - 186, 52, 30);
      ctx.beginPath(); ctx.moveTo(px - 20, GY - 170); ctx.lineTo(px + 10, GY - 170); ctx.lineTo(px + 10, GY - 160); ctx.stroke();
      ctx.save(); ctx.translate(px + 10, GY - 158); ctx.rotate(-0.2);
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.4; ctx.strokeRect(-18, -6, 36, 10);
      text(ctx, LABELS.capital.board.plan, 0, -1, 5.4, '#c0392b', 34, 900);
      ctx.restore();
    }
    const d = C.corridor.door;
    if (vis(d, 120)) {
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(d - 52, GY - 148, 104, 148);
      ctx.fillStyle = '#8a5f38'; ctx.fillRect(d - 45, GY - 141, 43, 141); ctx.fillRect(d + 2, GY - 141, 43, 141);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (const dx of [-38, 9]) { ctx.fillRect(d + dx, GY - 130, 29, 52); ctx.fillRect(d + dx, GY - 70, 29, 58); }
      ctx.fillStyle = '#d6ab42'; ctx.fillRect(d - 9, GY - 74, 3, 16); ctx.fillRect(d + 6, GY - 74, 3, 16);
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(d - 70, GY - 176, 140, 22);
      text(ctx, LABELS.capital.board.hall, d, GY - 165, 10, '#f2e8d0', 132, 800);
    }
  }

  function stairs(ctx, g, a, z) {
    ctx.fillStyle = '#b8ad98';
    for (let i = 0; i < 8; i++) ctx.fillRect(a + i * ((z - a) / 8), GY - 6 - i * 4, (z - a) / 8 + 1, 6 + i * 4);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect((a + z) / 2 - 40, GY - 230, 80, 22);
    text(ctx, LABELS.capital.board.bufet + ' ↓', (a + z) / 2, GY - 219, 11, '#f2e8d0', 76, 800);
  }

  function chair(ctx, x) {
    const w = '#6b4a2b', l = '#8a5f38';
    ctx.strokeStyle = w; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 14, GY - 2); ctx.lineTo(x - 12, GY - 44); ctx.quadraticCurveTo(x - 16, GY - 80, x - 22, GY - 104); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 16, GY - 2); ctx.lineTo(x + 14, GY - 44); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = l;
    for (const y of [GY - 62, GY - 76, GY - 90]) { ctx.beginPath(); ctx.moveTo(x - 14 - (GY - 44 - y) * 0.12, y); ctx.lineTo(x - 6 - (GY - 44 - y) * 0.12, y + 2); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.fillStyle = l; rr(ctx, x - 26, GY - 110, 10, 12, 4);
    ctx.fillStyle = '#9a2c2c'; rr(ctx, x - 16, GY - 48, 34, 7, 3);
    ctx.fillStyle = w; ctx.fillRect(x - 13, GY - 22, 28, 2.5);
  }

  function table(ctx, x, short) {
    const bot = short ? GY - 34 : GY - 6;
    ctx.fillStyle = 'rgba(30,30,20,0.18)'; ell(ctx, x, GY + 2, 52, 4);
    if (short) {
      ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 44, bot, 4, GY - bot); ctx.fillRect(x + 40, bot, 4, GY - bot);
      ctx.fillStyle = '#14110d'; ctx.fillRect(x - 26, GY - 1, 50, 8);
      ctx.fillStyle = '#9aa1a8'; for (const dx of [-15, 15]) { ctx.fillRect(x + dx - 2, GY - 22, 4, 22); circle(ctx, x + dx, GY - 22, 3); }
      ctx.fillStyle = '#7d848b'; ctx.fillRect(x - 15, GY - 12, 30, 3);
    }
    ctx.fillStyle = '#f4f2ec'; ctx.fillRect(x - 48, GY - 64, 96, 8);
    cloth(ctx, x, short);
    if (!short) { ctx.fillStyle = '#8a8f96'; ctx.fillRect(x - 40, GY - 6, 5, 6); ctx.fillRect(x + 35, GY - 6, 5, 6); }
  }


  function bar(ctx, g, C, vis) {
    const S = C.bar, t = g.time, c = g.capital, k = c && c.bar;
    if (!vis((S.from + S.to) / 2, (S.to - S.from) / 2 + 200)) return;
    const B = LABELS.capital.board;
    ctx.fillStyle = '#2f3a2c'; ctx.fillRect(S.from + 140, GY - 232, 150, 84);
    ctx.strokeStyle = '#8a5f38'; ctx.lineWidth = 4; ctx.strokeRect(S.from + 140, GY - 232, 150, 84);
    text(ctx, B.menu, S.from + 215, GY - 214, 11, '#f4f0e2', 140, 700);
    text(ctx, B.menu2, S.from + 215, GY - 196, 10, '#f4f0e2', 140, 600);
    text(ctx, B.menu3, S.from + 215, GY - 176, 10, '#f2c230', 140, 800);
    text(ctx, B.open, S.from + 215, GY - 140, 7, '#5a6b5a', 160, 700);
    const tvx = S.from + 400;
    ctx.fillStyle = '#1f2125'; rr(ctx, tvx - 50, GY - 240, 100, 64, 4);
    ctx.fillStyle = '#4a6a8a'; ctx.fillRect(tvx - 46, GY - 236, 92, 56);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(tvx - 46, GY - 192, 92, 12);
    const tvLine = g.once.flinta === 'bite' ? B.tvBite : g.once.plenary && g.once.plenary.seen ? B.tvSeen : B.tv;
    text(ctx, 'STRACH 24', tvx - 26, GY - 186, 6, '#fff', 40, 900);
    ctx.save(); ctx.beginPath(); ctx.rect(tvx - 46, GY - 192, 92, 12); ctx.clip();
    text(ctx, tvLine, tvx + 20, GY - 186, 5.4, '#fff', 400, 700);
    ctx.restore();
    ctx.fillStyle = '#26324a'; poly(ctx, [tvx - 20, GY - 192, tvx + 20, GY - 192, tvx + 14, GY - 210, tvx - 14, GY - 210]);
    ctx.fillStyle = '#eef0f4'; poly(ctx, [tvx - 4, GY - 210, tvx + 4, GY - 210, tvx, GY - 196]);
    ctx.fillStyle = '#e9bd98'; circle(ctx, tvx, GY - 220, 9);
    ctx.fillStyle = '#c9c6c0'; ell(ctx, tvx, GY - 228, 9, 3);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(tvx - 4, GY - 216 + (frac(t * 4) < 0.5 ? 0 : 1), 8, 1.6);
    ctx.fillStyle = '#c4262e'; rr(ctx, tvx + 16, GY - 214, 6, 7, 1.5); ctx.fillStyle = '#2b2b2b'; ctx.fillRect(tvx + 18, GY - 207, 2, 10);
    S.tables.forEach((x, i) => {
      const h = k && k.heads[i], st = h ? h.state : 'down';
      const up = 0.86;
      const sway = st === 'sleep' ? 0 : sin(t * 1.7 + i * 2) * 2;
      chair(ctx, x - 30);
      ZS.drawGuestBust(ctx, { x: x - 26 + sway, y: GY - 86, face: 1, up, stand: 0, act: st === 'sleep' ? 'eat' : st === 'look' ? 'alarm' : 'drink', kind: 'mp', look: [2, 3, 4][i], seed: 20 + i, scale: 0.95 }, t);
      table(ctx, x, i === 2 && !g.once.chute);
      ctx.fillStyle = '#2f5a2a'; ctx.fillRect(x + 22, GY - 82, 6, 18); ctx.fillRect(x + 23.5, GY - 90, 3, 8);
      ctx.save(); ctx.translate(x + 2, GY - 66); ctx.rotate(-1.45);
      ctx.fillStyle = '#6f2a3a'; ctx.fillRect(-3, -2, 6, 18); ctx.fillRect(-1.5, -9, 3, 8);
      ctx.restore();
      ctx.fillStyle = 'rgba(220,200,140,0.6)'; ctx.fillRect(x - 14, GY - 72, 6, 8);
      if (i === 1) { ctx.save(); ctx.translate(x + 40, GY - 4); ctx.rotate(1.3); ctx.fillStyle = '#2f5a2a'; ctx.fillRect(-3, -9, 6, 18); ctx.restore(); }
      if (st === 'sleep') { label(ctx, 'Zzz', x - 20, GY - 120 - frac(t * 0.6) * 14, 11, '#5a6b7a'); }
      else if (st === 'rise') mark(ctx, x - 28, GY - 132, 1, t);
      else if (st === 'look') mark(ctx, x - 28, GY - 132, 2, t);
      if (st === 'rise' && frac(t * 1.5) < 0.5) label(ctx, LABELS.vendor.hic, x - 10, GY - 112, 10, '#7a3b8a');
    });
    const cook = k ? k.cook : { state: 'pot' };
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(S.cook + 12, GY - 40, 50, 40);
    ctx.fillStyle = '#9aa0a6'; rr(ctx, S.cook + 16, GY - 72, 42, 32, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 3; i++) { const u = frac(t * 0.5 + i / 3); circle(ctx, S.cook + 28 + i * 8 + sin(t * 2 + i) * 4, GY - 80 - u * 36, 5 + u * 6); }
    person(ctx, 'capCook', 'clerk', S.cook, cook.state === 'look' ? -1 : 1, 'idle', t);
    mark(ctx, S.cook, GY - 112, cook.state === 'turn' ? 1 : cook.state === 'look' ? 2 : 0, t);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(S.counter - 40, GY - 246, 120, 22);
    text(ctx, B.bufet, S.counter + 20, GY - 235, 12, '#f2e8d0', 110, 800);
  }

  function counterFront(ctx, g, C) {
    const S = C.bar, x = S.counter;
    ctx.fillStyle = '#b8bec4'; ctx.fillRect(x - 74, GY - 58, 118, 58);
    ctx.fillStyle = '#d6dbe0'; ctx.fillRect(x - 78, GY - 62, 126, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 70, GY - 52, 110, 2);
    const k = g.capital && g.capital.bar;
    if (!k || !k.served) { ctx.fillStyle = '#f4f2ec'; ell(ctx, x + 6, GY - 64, 14, 4); ctx.fillStyle = '#b8582a'; ell(ctx, x + 6, GY - 66, 10, 3); }
  }

  function townHouses(ctx, g, C, vis) {
    const mx = C.town.stairs[1] + 340;
    if (vis(mx, 200)) {
      ctx.fillStyle = '#e8e2d4'; ctx.fillRect(mx - 24, GY - 420, 48, 330);
      ctx.fillStyle = '#86ab98'; poly(ctx, [mx - 30, GY - 420, mx + 30, GY - 420, mx + 14, GY - 470, mx, GY - 520, mx - 14, GY - 470]);
      ctx.fillStyle = '#5b6773'; rr(ctx, mx - 8, GY - 380, 16, 26, 3);
    }
    for (let x = C.town.stairs[1] + 40, i = 0; x < C.bank.from; x += 150, i++) if (vis(x, 120)) house(ctx, x, i);
  }





  function house(ctx, x, i) {
    {
      const h = 230 + hash(i * 3.3) * 60, w = 140;
      ctx.fillStyle = PASTEL[i % PASTEL.length]; ctx.fillRect(x - w / 2, GY - h, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x - w / 2, GY - h, 4, h);
      ctx.fillStyle = '#b07a66'; poly(ctx, [x - w / 2 - 6, GY - h, x + w / 2 + 6, GY - h, x + w / 2 - 20, GY - h - 50, x - w / 2 + 20, GY - h - 50]);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x - w / 2, GY - 96, w, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x - w / 2, GY - 100, w, 4);
      ctx.fillStyle = 'rgba(60,50,40,0.12)'; ctx.fillRect(x - w / 2, GY - 22, w, 22);
      for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) {
        const wx = x - 46 + c2 * 36, wy = GY - h + 26 + r * 60;
        if (wy > GY - 120) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(wx - 3, wy - 5, 24, 4);
        ctx.fillStyle = '#7d8a96'; rr(ctx, wx, wy, 18, 30, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(wx + 2, wy + 2, 6, 26);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(wx + 8, wy, 2, 30); ctx.fillRect(wx, wy + 12, 18, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(wx - 3, wy + 30, 24, 3);
      }
      if (i % 3 === 1) shopFront(ctx, x + 38, i);
      else { ctx.fillStyle = '#7d8a96'; rr(ctx, x + 30, GY - 80, 22, 36, 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 40, GY - 80, 2, 36); }
      houseDoor(ctx, x - 22, i, PASTEL[i % PASTEL.length]);
    }
  }

  const DOORS = ['#5a3d2a', '#2f4a3a', '#6b2737', '#2f3f5a'];

  function houseDoor(ctx, x, i, wall) {
    const w = 36, h = 66, top = GY - 8 - h, col = DOORS[i % DOORS.length];
    ctx.fillStyle = '#c9c0ab'; ctx.fillRect(x - w / 2 - 12, GY - 8, w + 24, 8);
    ctx.fillStyle = '#b5ab95'; ctx.fillRect(x - w / 2 - 12, GY - 2, w + 24, 2);
    ctx.fillStyle = '#ddd5c2';
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, GY - 8); ctx.lineTo(x - w / 2 - 8, top + 10); ctx.arc(x, top + 10, w / 2 + 8, PI, 0); ctx.lineTo(x + w / 2 + 8, GY - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + w / 2 + 4, top + 10, 4, GY - 18 - top);
    ctx.fillStyle = '#cfc6b0'; poly(ctx, [x - 5, top - 14, x + 5, top - 14, x + 4, top - 2, x - 4, top - 2]);
    ctx.fillStyle = '#2b3440';
    ctx.beginPath(); ctx.moveTo(x - w / 2, top + 22); ctx.lineTo(x - w / 2, top + 10); ctx.arc(x, top + 10, w / 2, PI, 0); ctx.lineTo(x + w / 2, top + 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,220,210,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (const a of [-0.75, -0.5, -0.25]) { ctx.moveTo(x, top + 10); ctx.lineTo(x + cos(a * PI) * w / 2, top + 10 + sin(a * PI) * w / 2); } ctx.stroke();
    ctx.fillStyle = '#ddd5c2'; ctx.fillRect(x - w / 2, top + 20, w, 3);
    ctx.fillStyle = col; ctx.fillRect(x - w / 2, top + 23, w, GY - 8 - top - 23);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 0.75, top + 23, 1.5, GY - 8 - top - 23);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (const dx of [-w / 2 + 3, 3]) { ctx.fillRect(x + dx, top + 27, w / 2 - 6, 16); ctx.fillRect(x + dx, top + 47, w / 2 - 6, 15); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (const dx of [-w / 2 + 3, 3]) { ctx.fillRect(x + dx, top + 41, w / 2 - 6, 2); ctx.fillRect(x + dx, top + 60, w / 2 - 6, 2); }
    ctx.fillStyle = '#d6ab42'; ctx.fillRect(x - 4, top + 44, 2, 6); ctx.fillRect(x + 2, top + 44, 2, 6);
    ctx.fillStyle = '#2f5d8a'; rr(ctx, x + w / 2 + 12, top + 18, 12, 9, 2);
    text(ctx, String(12 + i * 2), x + w / 2 + 18, top + 22.5, 6, '#ffffff', 12, 900);
  }

  function shopFront(ctx, x, i) {
    const awn = ['#2f6b4f', '#8a3b2a', '#2f4f7a'][i % 3];
    ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - 16, GY - 86, 40, 78);
    ctx.fillStyle = '#9fb7c8'; ctx.fillRect(x - 13, GY - 82, 34, 52);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [x - 13, GY - 82, x - 2, GY - 82, x - 13, GY - 60]);
    ctx.fillStyle = '#5b6370'; ctx.fillRect(x - 13, GY - 30, 34, 22);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#f2ede2' : awn; poly(ctx, [x - 20 + k * 12, GY - 96, x - 8 + k * 12, GY - 96, x - 6 + k * 12, GY - 84, x - 18 + k * 12, GY - 84]); }
  }

  function bronze(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#a7864f'); g.addColorStop(0.5, '#7a5c32'); g.addColorStop(1, '#4e3a20');
    return g;
  }

  function cumil(ctx, g, x) {
    const c = x - 70;
    ctx.fillStyle = 'rgba(30,24,16,0.2)'; ell(ctx, c, GY + 3, 34, 5);
    ctx.fillStyle = '#4a4a48'; ell(ctx, c, GY - 1, 30, 6);
    ctx.fillStyle = '#1f1f1f'; ell(ctx, c, GY - 1, 25, 4);
    ctx.fillStyle = bronze(ctx, c - 20, GY - 60, c + 20, GY);
    ctx.beginPath(); ctx.moveTo(c - 18, GY - 2); ctx.quadraticCurveTo(c - 20, GY - 30, c - 8, GY - 36); ctx.lineTo(c + 10, GY - 36); ctx.quadraticCurveTo(c + 20, GY - 30, c + 18, GY - 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c - 20, GY - 6, 14, 5, -0.15, 0, PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c + 18, GY - 6, 14, 5, 0.15, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#5c4524'; circle(ctx, c - 32, GY - 6, 4.5); circle(ctx, c + 30, GY - 6, 4.5);
    ctx.fillStyle = bronze(ctx, c - 12, GY - 64, c + 12, GY - 34);
    circle(ctx, c + 1, GY - 46, 11);
    ctx.fillStyle = '#5c4524'; ctx.beginPath(); ctx.arc(c + 1, GY - 50, 12.5, PI, 0); ctx.fill(); ctx.fillRect(c - 13, GY - 51, 28, 3);
    ctx.fillStyle = 'rgba(255,235,190,0.35)'; ell(ctx, c - 3, GY - 56, 5, 2);
    ctx.strokeStyle = '#3e2e16'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c - 4, GY - 46); ctx.lineTo(c - 1, GY - 46); ctx.moveTo(c + 4, GY - 46); ctx.lineTo(c + 7, GY - 46); ctx.stroke();
    ctx.beginPath(); ctx.arc(c + 2, GY - 41, 4, 0.2, PI - 0.2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#6b5530'; ell(ctx, c + 2, GY - 44, 2.4, 3.2);
    ctx.fillStyle = 'rgba(255,235,190,0.2)'; ell(ctx, c - 8, GY - 26, 3, 7);
    const sx = c + 50;
    ctx.fillStyle = '#7d848b'; ctx.fillRect(sx - 1.5, GY - 74, 3, 74);
    ctx.fillStyle = '#ffffff'; poly(ctx, [sx, GY - 100, sx + 15, GY - 74, sx - 15, GY - 74]);
    ctx.fillStyle = '#c4262e'; poly(ctx, [sx, GY - 96, sx + 12, GY - 76, sx - 12, GY - 76]);
    ctx.fillStyle = '#ffffff'; poly(ctx, [sx, GY - 91, sx + 7.5, GY - 79, sx - 7.5, GY - 79]);
    ctx.fillStyle = '#1f2125'; circle(ctx, sx - 1, GY - 87, 1.4); ctx.fillRect(sx - 3, GY - 85, 4, 1.4);
    ctx.fillStyle = '#4a4a48'; ell(ctx, x + 34, GY - 3, 22, 5);
    ctx.fillStyle = '#5a5a58'; ell(ctx, x + 34, GY - 5, 18, 3);
  }


  function cumilFront(ctx, g, x) {
    ctx.fillStyle = '#b8ad98'; ctx.fillRect(x - 32, GY - 14, 64, 22);
    ctx.fillStyle = '#4a4a48'; ell(ctx, x, GY - 14, 30, 6);
    ctx.fillStyle = '#2a2a2a'; ell(ctx, x, GY - 14, 24, 4);
  }

  function napoleon(ctx, g, x) {
    ctx.fillStyle = 'rgba(30,24,16,0.18)'; ell(ctx, x, GY + 3, 54, 5);
    ctx.fillStyle = bronze(ctx, x + 4, GY - 120, x + 40, GY);
    ctx.beginPath(); ctx.moveTo(x + 14, GY); ctx.lineTo(x + 18, GY - 44); ctx.lineTo(x + 30, GY - 44); ctx.lineTo(x + 32, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4e3a20'; ell(ctx, x + 16, GY - 1, 7, 3); ell(ctx, x + 33, GY - 1, 7, 3);
    ctx.fillStyle = bronze(ctx, x - 6, GY - 110, x + 40, GY - 40);
    ctx.beginPath(); ctx.moveTo(x + 34, GY - 40); ctx.quadraticCurveTo(x + 40, GY - 70, x + 22, GY - 92); ctx.lineTo(x + 4, GY - 84); ctx.quadraticCurveTo(x + 4, GY - 62, x + 12, GY - 40); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 34, GY - 42); ctx.lineTo(x + 42, GY - 30); ctx.lineTo(x + 28, GY - 36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5c4524'; ctx.beginPath(); ctx.moveTo(x + 6, GY - 84); ctx.quadraticCurveTo(x - 6, GY - 76, x - 16, GY - 66); ctx.lineTo(x - 10, GY - 62); ctx.quadraticCurveTo(x, GY - 70, x + 12, GY - 74); ctx.closePath(); ctx.fill();
    ctx.fillStyle = bronze(ctx, x - 6, GY - 112, x + 14, GY - 86);
    circle(ctx, x + 6, GY - 96, 9.5);
    ctx.fillStyle = '#3e2e16'; poly(ctx, [x - 14, GY - 100, x + 28, GY - 100, x + 20, GY - 106, x + 6, GY - 118, x - 6, GY - 106]);
    ctx.fillStyle = 'rgba(255,235,190,0.3)'; poly(ctx, [x - 8, GY - 102, x + 6, GY - 116, x + 2, GY - 104]);
    ctx.fillStyle = '#6b5530'; ell(ctx, x - 3, GY - 94, 2.2, 3);
    ctx.fillStyle = 'rgba(255,235,190,0.25)'; ell(ctx, x + 26, GY - 70, 3, 10, -0.4);
  }


  function napoleonFront(ctx, g, x) {
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x - 44, GY - 30, 5, 30); ctx.fillRect(x + 39, GY - 30, 5, 30); ctx.fillRect(x - 46, GY - 66, 4, 36); ctx.fillRect(x + 42, GY - 66, 4, 36);
    ctx.fillStyle = '#8a5f38'; for (const y of [GY - 64, GY - 54]) ctx.fillRect(x - 50, y, 100, 6);
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 50, GY - 34, 100, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x - 50, GY - 64, 100, 1.5);
    ctx.fillStyle = bronze(ctx, x - 20, GY - 70, x, GY - 56);
    ctx.beginPath(); ctx.ellipse(x - 12, GY - 66, 9, 4, -0.2, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#5c4524'; circle(ctx, x - 20, GY - 64, 3.5);
  }


  function stall(ctx, g, x) {
    const t = g.time, done = g.once.rozky, top = GY - 150;
    ctx.fillStyle = 'rgba(30,24,16,0.18)'; ell(ctx, x, GY + 2, 66, 5);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 58, top, 5, 150); ctx.fillRect(x + 53, top, 5, 150);
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(x - 56, top + 30, 112, 60);
    ctx.save(); ctx.translate(0, -30); person(ctx, 'capSeller', 'clerk', x - 4, 1, 'idle', t, { look: 1 }); ctx.restore();
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#f4efe2' : '#b8402e'; ctx.fillRect(x - 64 + i * 128 / 7, top, 128 / 7 + 0.5, 22); }
    for (let i = 0; i < 7; i++) {
      const cx = x - 64 + (i + 0.5) * 128 / 7;
      ctx.fillStyle = i % 2 ? '#f4efe2' : '#b8402e';
      ctx.beginPath(); ctx.moveTo(cx - 64 / 7, top + 22); ctx.arc(cx, top + 22, 64 / 7, PI, 0, true); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 64, top + 20, 128, 2);
    ctx.fillStyle = '#f4efe2'; rr(ctx, x - 52, top - 24, 104, 20, 3);
    ctx.strokeStyle = '#8a5f38'; ctx.lineWidth = 2; ctx.strokeRect(x - 52, top - 24, 104, 20);
    text(ctx, LABELS.capital.board.rozky, x, top - 14, 8.5, '#7a3b2a', 96, 900);
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 56, GY - 58, 112, 58);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let i = 1; i < 5; i++) ctx.fillRect(x - 56 + i * 22.4, GY - 54, 1.5, 54);
    ctx.fillStyle = '#9a6a40'; ctx.fillRect(x - 60, GY - 62, 120, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 60, GY - 62, 120, 1.5);
    ctx.fillStyle = '#c9b48a'; rr(ctx, x - 44, GY - 68, 60, 6, 2);
    if (!done) for (let i = 0; i < 5; i++) {
      const rx = x - 38 + i * 12;
      ctx.fillStyle = i % 2 ? '#d9a35a' : '#c48a42'; ctx.beginPath(); ctx.ellipse(rx, GY - 71, 7, 3.6, 0, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,30,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(rx - 3, GY - 73); ctx.lineTo(rx + 3, GY - 70); ctx.stroke();
    }
    ctx.fillStyle = '#f4efe2'; rr(ctx, x + 22, GY - 82, 26, 16, 2);
    text(ctx, '1,20 €', x + 35, GY - 74, 6, '#7a3b2a', 24, 800);
  }






  function bollard(ctx, x) {
    ctx.fillStyle = '#3a3f47'; rr(ctx, x - 6, GY - 16, 12, 16, 3); ctx.fillStyle = '#5b6370'; ell(ctx, x, GY - 16, 8, 3);
  }

  function bank(ctx, g, C, vis) {
    const B = C.bank, t = g.time;
    for (let x = B.from + 140; x < B.pier + 40; x += 110) if (vis(x, 30)) bollard(ctx, x);
    for (let x = B.from + 200; x < B.pier; x += 260) if (vis(x, 40)) { ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - 2, GY - 120, 4, 120); ctx.fillRect(x - 12, GY - 124, 24, 5); ctx.fillStyle = '#ffe9a0'; ell(ctx, x, GY - 116, 9, 3); }
    const x = B.booth;
    if (vis(x, 120)) {
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(x - 40, GY - 120, 80, 120);
      ctx.fillStyle = '#2f6db0'; ctx.fillRect(x - 46, GY - 130, 92, 14);
      text(ctx, LABELS.capital.board.booth, x, GY - 123, 9, '#fff', 86, 900);
      ctx.fillStyle = 'rgba(140,175,200,0.7)'; ctx.fillRect(x - 30, GY - 104, 60, 40);
      ZS.drawGuestBust(ctx, { x, y: GY - 66, face: -1, up: 1, stand: 0, act: 'wave', kind: 'clerk', look: 2, seed: 31, scale: 0.8, clip: [x - 30, GY - 104, 60, 40] }, t);
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(x - 40, GY - 62, 80, 6);
    }
    const bx = B.board;
    if (vis(bx, 80)) {
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(bx - 3, GY - 70, 6, 70);
      ctx.fillStyle = '#1f2430'; rr(ctx, bx - 46, GY - 140, 92, 72, 4);
      ctx.fillStyle = '#f2c230';
      ctx.font = '700 9px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      LABELS.capital.board.departures.forEach((line, i) => ctx.fillText(line, bx - 40, GY - 128 + i * 15, 82));
      if (frac(t * 0.8) < 0.5) { ctx.fillStyle = '#5ac87a'; circle(ctx, bx + 36, GY - 98, 3); }
    }
    for (const [dx, lk, dir] of [[-70, 7, 1], [-110, 8, 1]]) if (vis(B.pier + dx, 60)) person(ctx, 'capQueue' + dx, 'tourist', B.pier + dx, dir, 'idle', t, { look: lk });
    const p = B.pier;
    if (vis(p + 100, 260) && !g.once.boat) {
      const bob = sin(t * 1.4) * 2;
      ctx.fillStyle = '#7a5530'; ctx.fillRect(p - 10, GY - 6, 200, 8);
      ctx.fillStyle = '#f4f6f8'; poly(ctx, [p - 20, GY + 6 + bob, p + 260, GY + 6 + bob, p + 240, GY + 34 + bob, p, GY + 34 + bob]);
      ctx.fillStyle = '#1f4fa0'; ctx.fillRect(p - 10, GY + 18 + bob, 260, 5);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(p + 150, GY - 60 + bob, 90, 66);
      ctx.fillStyle = '#5b6773'; for (let i = 0; i < 3; i++) rr(ctx, p + 158 + i * 28, GY - 50 + bob, 20, 20, 3);
      text(ctx, LABELS.boat.name, p + 195, GY - 66 + bob, 9, '#1f4fa0', 86, 900);
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(p - 10, GY - 30, 3, 30); ctx.fillRect(p + 30, GY - 30, 3, 30); ctx.fillRect(p - 10, GY - 30, 43, 3);
    }
  }

  function beaver(ctx, g, C) {
    const c = g.capital, k = c && c.beaver, t = g.time, x = C.luh.beaver + 30;
    if (k && k.fell) {
      if (g.time - k.at < 6) label(ctx, '🦫', x + 30, GY - 20, 18, '#000');
      return;
    }
    const gnaw = k && (k.phase === 'gnaw' || k.phase === 'warn');
    ctx.fillStyle = '#6b4a2b'; ell(ctx, x, GY - 10, 16, 10);
    ctx.fillStyle = '#4a3420'; ell(ctx, x + 18, GY - 4, 14, 4, 0.2);
    ctx.fillStyle = '#7a5530'; circle(ctx, x - 12, GY - 16 + (gnaw ? sin(t * 20) : 0), 7);
    ctx.fillStyle = '#f2ede2'; ctx.fillRect(x - 19, GY - 13, 3, 3);
    ctx.fillStyle = '#111'; circle(ctx, x - 14, GY - 19, 1.2);
    if (gnaw) { ctx.fillStyle = '#d9b07a'; for (let i = 0; i < 3; i++) { const u = frac(t * 2 + i / 3); circle(ctx, x - 24 - u * 14, GY - 14 + u * 12, 1.6); } }
    if (k && k.phase === 'warn') mark(ctx, C.luh.beaver, GY - 160, 2, t);
  }

  function back(ctx, g, vis, span, withBear) {
    const L = g.level, C = L.capital, o = off(g), up = above(g);
    if (o) { ctx.save(); ctx.translate(0, -o); }
    if (vis(C.castle.gate, 200)) gate(ctx, C.castle.gate, 0);
    if (span(C.castle.palace[0], C.castle.palace[1], 200)) palace(ctx, g, C);
    if (vis(C.castle.vitrine, 140)) vitrine(ctx, g, C);
    if (vis(C.castle.yard[0] + 170, 80)) well(ctx, C.castle.yard[0] + 170, false);
    for (const p of L.posts) {
      if (!p.kind || !vis(p.x, 200)) continue;
      if (p.kind === 'statue') statue(ctx, g, p);
      else if (p.kind === 'scaffold') scaffold(ctx, g, p);
    }
    for (const h of L.hedges) if (span(h[0], h[1], 60)) hedgeBack(ctx, h, g);
    if (vis(2330, 80)) fountain(ctx, g, 2330);
    for (const x of [C.castle.garden[0] + 20, 2145, C.castle.garden[1] - 4]) if (vis(x, 40)) urn(ctx, x);
    if (vis(C.square.flag, 160)) flag(ctx, g, { x: C.square.flag });
    if (span(C.square.cordon[0], C.inside.from + 40, 200)) parliament(ctx, g, C);
    for (const x of C.square.vans) if (vis(x, 160)) van(ctx, x, g.time);
    for (let x = C.square.cordon[0]; x <= C.square.cordon[1] - 60; x += 90) if (vis(x, 60)) barrier(ctx, x);
    if (span(C.square.pen[0], C.square.pen[1], 100)) {
      for (let x = C.square.pen[0]; x <= C.square.pen[1]; x += 82) if (!L.tripods.some((tx) => Math.abs(tx - x) < 60)) { ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 2, GY - 44, 4, 44); ctx.fillStyle = '#f2ede2'; ctx.fillRect(x - 40, GY - 40, 82, 5); }
      for (const tx of L.tripods) tripodBack(ctx, tx, g.time, true);
      crew(ctx, g, C);
    }
    if (vis(C.square.gate, 120)) turnstile(ctx, g, C);
    if (span(C.hall.from, C.hall.to, 120)) frame(ctx, g, C);
    if (span(C.corridor.from, C.corridor.door + 120, 200)) corridor(ctx, g, C, vis);
    if (!up) bar(ctx, g, C, vis);
    for (const c of L.covers) {
      if (!vis(c.x, 120) || (up && c.x > C.bar.from)) continue;
      behind(ctx, g, c, withBear, () => (c.ficus ? ficus(ctx, c, g) : c.pillar ? pillar(ctx, c) : rack(ctx, c)));
    }
    if (!up) hallBack(ctx, g, C, vis);
    if (vis(C.tunnel.exit, 140)) kiosk(ctx, g, C, false);
    if (span(C.town.from, C.bank.from, 300)) townHouses(ctx, g, C, vis);
    if (vis(C.town.cumil, 140)) cumil(ctx, g, L.manhole);
    if (vis(C.town.napoleon, 120)) napoleon(ctx, g, C.town.napoleon);
    if (vis(C.town.stall, 140)) stall(ctx, g, C.town.stall);
    bank(ctx, g, C, vis);
    rolls(ctx, g, vis);
    if (vis(C.luh.beaver, 200)) beaver(ctx, g, C);
    if (o) ctx.restore();
    if (!up && span(C.tunnel.hatch - 60, C.tunnel.to, 200)) {
      ctx.save(); ctx.translate(0, DEEP - o);
      hatch(ctx, g, C, false);
      if (span(C.tunnel.room[0], C.tunnel.room[1], 120)) spyRoom(ctx, g, C);
      for (const x of [C.tunnel.from + 110, C.tunnel.to - 60]) if (vis(x, 60)) { ctx.fillStyle = '#ffe0a0'; ell(ctx, x, GY - 138, 10, 4); }
      if (vis(C.tunnel.lift, 140)) liftCar(ctx, g, C, false);
      ctx.restore();
      strings(ctx, g, C, o);
    }
  }

  function rolls(ctx, g, vis) {
    for (const it of g.level.items) {
      if (it.type !== 'rozok' || it.eaten || !vis(it.x, 30)) continue;
      ctx.fillStyle = 'rgba(40,30,20,0.18)'; ell(ctx, it.x, GY + 1, 9, 2);
      ctx.save(); ctx.translate(it.x, GY - 4); ctx.rotate(-0.15);
      ctx.fillStyle = '#c98a3e'; ell(ctx, 0, 0, 9, 4);
      ctx.fillStyle = '#e2a95a'; ell(ctx, -1, -1, 7, 2.6);
      ctx.strokeStyle = '#a86a2a'; ctx.lineWidth = 0.8; ctx.beginPath(); for (const dx of [-4, 0, 4]) { ctx.moveTo(dx, -3.6); ctx.lineTo(dx + 1.4, 3.4); } ctx.stroke();
      ctx.restore();
    }
  }

  function reeds(ctx, g, a, z) {
    const t = g.time, k = look(g);
    for (const [x0, x1] of [[a - 50, a + 40], [z - 40, z + 50]]) {
      for (let x = x0, i = 0; x < x1; x += 6, i++) {
        const h = 46 + hash(x * 0.7) * 40, sw = sin(t * 1.4 + x * 0.05) * 3;
        ctx.strokeStyle = k === 'autumn' ? (i % 2 ? '#9a9a4a' : '#8a8240') : (i % 2 ? '#4f8a35' : '#3f7a2c'); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, GY + 6); ctx.quadraticCurveTo(x + sw * 0.5, GY - h / 2, x + sw, GY - h); ctx.stroke();
        if (i % 4 === 0) { ctx.fillStyle = '#6b4429'; rr(ctx, x + sw - 2.5, GY - h - 4, 5, 14, 2.5); }
      }
    }
    for (let x = a + 60; x < z - 50; x += 70) { ctx.fillStyle = '#4f8a45'; ell(ctx, x + hash(x) * 20, GY + 4, 10, 3); ctx.fillStyle = '#f2f0e6'; circle(ctx, x + hash(x) * 20 + 3, GY + 2, 2); }
  }



  function handover(ctx, g) {
    const b = g.bear, at = g.capital && g.capital.badgeAt;
    if (at === undefined || at === null) return;
    const f = (g.time - at) / 0.7;
    if (f < 0 || f > 1) return;
    const x = b.x + b.dir * 30, y = GY - (b.crouch ? 34 : 46);
    ctx.fillStyle = 'rgba(255,236,150,' + (0.9 * (1 - f)).toFixed(3) + ')';
    for (let i = 0; i < 8; i++) { const a = i * PI / 4, r = 8 + f * 24; circle(ctx, x + cos(a) * r, y + sin(a) * r, 2.6 * (1 - f) + 0.6); }
  }




  function flintaCues(ctx, g) {
    const t = g.time;
    for (const p of g.people) {
      if (p.kind !== 'flinta') continue;
      if (p.phase === 'notice') mark(ctx, p.x, GY - 100, 1, t);
      if (p.phase === 'cry') {
        ctx.fillStyle = 'rgba(120,180,240,0.9)';
        for (let i = 0; i < 4; i++) { const u = frac(t * 1.6 + i / 4), s = i % 2 ? 1 : -1; circle(ctx, p.x + p.dir * 4 + s * (3 + u * 10), GY - 66 + u * 40, 2 - u); }
      }
    }
    for (const p of g.people) if (p.kind === 'police' && p.phase === 'whistle') mark(ctx, p.x, GY - 100, 2, t);
  }

  function front(ctx, g, vis, span) {
    const L = g.level, C = L.capital, up = above(g), o = off(g);
    if (o) { ctx.save(); ctx.translate(0, -o); }
    for (const h of L.hedges) if (span(h[0], h[1], 60)) hedgeFront(ctx, h, g);
    for (const tx of L.tripods) if (vis(tx, 60)) tripodFront(ctx, tx);
    if (!up && vis(C.bar.counter, 120)) counterFront(ctx, g, C);
    if (vis(C.castle.yard[0] + 170, 80)) well(ctx, C.castle.yard[0] + 170, true);
    if (vis(C.hall.guard, 80)) desk(ctx, C.hall.guard);
    if (vis(C.castle.gate, 200)) gate(ctx, C.castle.gate, 1);
    for (const [x, col] of [[C.inside.from, '#d9d2c2'], [C.bar.from, '#d9d2c2'], [C.bar.to, '#b9c7b4'], [SPLIT, '#d9d2c2']]) if (vis(x, 30) && !(up && x > C.bar.from)) jamb(ctx, x, col);
    if (vis(C.tunnel.exit, 80)) kiosk(ctx, g, C, true);
    if (vis(L.manhole, 60)) cumilFront(ctx, g, L.manhole);
    if (vis(C.town.napoleon, 80)) napoleonFront(ctx, g, C.town.napoleon);
    if (!up && !g.once.chute && vis(C.bar.to, 60)) hallDoor(ctx, C.bar.to);
    if (!up && vis(C.bar.tables[2], 80)) cloth(ctx, C.bar.tables[2], !g.once.chute);
    if (!up && !g.once.chute && Math.abs(g.bear.x - C.tunnel.hatch) < 220) { const bob = abs(sin(g.time * 4)) * 6; ctx.fillStyle = 'rgba(31,36,48,0.85)'; circle(ctx, C.tunnel.hatch, GY - 92 - bob, 13); label(ctx, '↓', C.tunnel.hatch, GY - 92 - bob, 16, '#ffe08a'); }
    flintaCues(ctx, g);
    handover(ctx, g);
    if (o) ctx.restore();
    if (!up && span(C.tunnel.from, C.tunnel.to, 100)) {
      ctx.save(); ctx.translate(0, DEEP - o);
      if (vis(C.tunnel.cabinet, 60)) cabinetFront(ctx, C);
      if (vis(C.tunnel.lift, 80)) liftCar(ctx, g, C, true);
      if (vis(C.tunnel.to, 30)) jamb(ctx, C.tunnel.to, '#9b927f', GY - DEEP);
      ctx.restore();
    }
    if (L.river && span(L.river.from, L.river.to, 80)) reeds(ctx, g, L.river.from, L.river.to);
    climber(ctx, g, C);
    dunk(ctx, g.capital && g.capital.sink, L.river);
  }

  function dunk(ctx, k, R) {
    if (!k || !R) return;
    const S = ZS.scenery, x = k.x, t = k.t, top = S.WATER, deep = k.deep || 80;
    ctx.save();
    S.waterPath(ctx, R.from, R.to, 0); ctx.clip();
    const gr = ctx.createRadialGradient(x, top + deep * 0.55, 6, x, top + deep * 0.55, 96);
    gr.addColorStop(0, 'rgba(46,128,166,0.62)'); gr.addColorStop(0.6, 'rgba(52,140,178,0.45)'); gr.addColorStop(1, 'rgba(60,150,190,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 100, top, 200, deep + 120);
    const sh = ctx.createLinearGradient(0, top, 0, top + 10);
    sh.addColorStop(0, 'rgba(160,220,236,0.75)'); sh.addColorStop(1, 'rgba(98,181,208,0)');
    ctx.fillStyle = sh; ctx.fillRect(x - 70, top, 140, 10);
    ctx.fillStyle = 'rgba(235,250,255,0.85)';
    for (let i = 0; i < 6; i++) { const u = frac(t * 1.1 + i * 0.37), bx = x + 10 * sin(i * 2.3 + t * 3) + (i - 2.5) * 5; circle(ctx, bx, top + deep * 0.7 - u * deep * 0.68, 1 + (i % 3) * 0.5); }
    ctx.restore();
    ctx.save();
    S.waterPath(ctx, R.from, R.to, 8); ctx.clip();
    ctx.strokeStyle = 'rgba(240,252,255,0.8)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) { const u = frac(t * 0.9 + i / 3); ctx.globalAlpha = 0.9 * (1 - u); ctx.beginPath(); ctx.ellipse(x, top + 1, 12 + u * 34, 1.6 + u * 2.4, 0, 0, PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (t < 0.4) { const f = t / 0.4; ctx.fillStyle = 'rgba(235,250,255,0.9)'; for (let i = 0; i < 8; i++) { const a = PI + (i / 7) * PI; circle(ctx, x + cos(a) * 26 * f, top - 22 * sin(f * PI) * (0.6 + (i % 3) * 0.2), 1.8 * (1 - f) + 0.6); } }
  }

  API.dunk = dunk;

  const CLIMB = { climbing: null, y: 0, x: 0, climbT: 1 };

  function climber(ctx, g, C) {
    const k = g.capital && g.capital.chute;
    if (!k || k.phase !== 'down') return;
    const b = g.bear, D = SIM().CHUTE.down, u = D - k.t, p = clamp(u / D, 0, 1), o = off(g);
    if (!CLIMB.climbing) CLIMB.climbing = { x: 0, w: 12, h: 300, kind: 'pole' };
    Object.assign(CLIMB, b, { climbing: CLIMB.climbing, hideBlend: 0, hiding: null, moving: false, crouch: false });
    CLIMB.climbing.x = C.tunnel.hatch;
    CLIMB.x = C.tunnel.hatch - 10; CLIMB.dir = 1;
    CLIMB.climbT = Math.min(0.3, Math.max(0, D - u - 0.05));
    CLIMB.y = GY + 70 * (1 - smooth(clamp((p - 0.75) / 0.25, 0, 1))) + DEEP * p - o + sin(u * 9) * 2;
    ctx.save(); ctx.beginPath(); ctx.rect(C.tunnel.hatch - 80, GY - o + 2, 160, 2000); ctx.clip();
    ZS.drawBearClimbing(ctx, CLIMB, g.time);
    ctx.restore();
  }




  function goal(g) {
    const G = LABELS.capital.goals, o = g.once;
    if (!o.badge) return G.badge;
    if (!o.vote) return G.hall;
    if (!o.liftUp) return G.tunnel;
    if (!o.boat) return G.boat;
    return g.fat < g.def.fatGoal ? G.eat : G.den;
  }

  function objective(ctx, g, viewW) {
    if (g.over || g.pass) return;
    const s = goal(g), x = g.cam + viewW / 2, y = GY - 404;
    if (s !== g.goalWas) { g.goalWas = s; g.goalAt = g.time; }
    const fresh = clamp(1 - (g.time - (g.goalAt || 0)) / 4, 0, 1);
    ctx.font = '800 ' + (13 + 3 * fresh) + 'px system-ui, sans-serif';
    const w = ctx.measureText(s).width + 28, h = 26 + 6 * fresh;
    ctx.fillStyle = 'rgba(20,16,26,' + (0.55 + 0.3 * fresh).toFixed(3) + ')'; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = fresh > 0 ? '#ffe08a' : '#f6e7c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 1);
  }

  function over(ctx, g, viewW) {
    objective(ctx, g, viewW);
    const C = g.level.capital, cam = g.cam, a = C.tunnel.from - cam, z = C.tunnel.to - cam, k = g.capital && g.capital.lift;
    if (k && k.phase !== 'idle') {
      const L = ZS.sim.capital.LIFT, f = k.phase === 'close' ? smooth(1 - k.t / L.close) * 0.6 : k.phase === 'up' ? 1 : k.phase === 'rise' ? smooth(clamp((k.t - L.rise + 0.45) / 0.45, 0, 1)) : 0;
      ctx.fillStyle = 'rgba(12,10,8,' + clamp(f, 0, 1).toFixed(3) + ')'; ctx.fillRect(cam - 10, TOP, viewW + 20, GY - TOP + 900);
    }
    if (z < 0 || a > viewW || above(g)) return;
    const d = DEEP - off(g), gr = ctx.createLinearGradient(0, GY - 150 + d, 0, GY + d);
    gr.addColorStop(0, 'rgba(10,8,6,0.3)'); gr.addColorStop(1, 'rgba(10,8,6,0.05)');
    ctx.fillStyle = gr; ctx.fillRect(max(a, 0) + cam, GY - 150 + d, min(z, viewW) - max(a, 0), 150);
  }

  API.pole = pole;
  API.rise = rise;
  API.sky = sky;
  API.backdrop = backdrop;
  API.ground = ground;
  API.back = back;
  API.front = front;
  API.over = over;
})();
