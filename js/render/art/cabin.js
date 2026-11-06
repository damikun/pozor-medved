(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, smooth, sstep, clamp, lerp } = ZS.util;
  const API = (ZS.cabinArt = {});
  const SIM = () => ZS.sim.cabin;
  const BOX = { left: 110, right: 870, top: GY - 262, bot: GY + 34, win: [GY - 214, GY - 92] };
  const figures = new Map();

  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  function person(ctx, id, kind, x, dir, state, time, extra) {
    let h = figures.get(id);
    if (!h) figures.set(id, (h = { aimAt: [0, 0], id }));
    Object.assign(h, { kind, x, y: GY, dir, state, outfit: 'summer', cold: 0, armed: false, empty: false, scared: false, kick: 0, texting: false, clutch: false, look: 0, size: 1 }, extra);
    ZS.drawHuman(ctx, h, time);
  }

  const CABLE = 0.13;
  const SPRUCE = { summer: ['#2f5a3a', '#3f7148'], autumn: ['#3a5a3a', '#4c6c45'], snow: ['#3a5546', '#4e6a58'] };
  const SLOPE = { summer: ['#6f9a50', '#5b8742'], autumn: ['#a08a4c', '#86753e'], snow: ['#c9d1d6', '#b3bdc4'] };

  function stops() {
    const R = SIM().RIDE;
    return [{ at: 0, a: -1500, z: 560, kind: 'start' }, { at: R.mid, a: -700, z: 700, kind: 'mid' }, { at: R.top, a: -560, z: 1500, kind: 'top' }];
  }

  function nearest(c) {
    let best = null;
    for (const s of stops()) { const off = s.at - c.ride; if (!best || abs(off) < abs(best.off)) best = Object.assign({ off }, s); }
    return best;
  }

  function stationName(kind) {
    const B = LABELS.chopok.board;
    return kind === 'start' ? B.bus + ' · ' + B.station : kind === 'mid' ? LABELS.cabin.station : B.top;
  }

  function spruce(ctx, x, y, h, P, snow) {
    ctx.fillStyle = '#4a3526'; ctx.fillRect(x - h * 0.04, y - h * 0.18, h * 0.08, h * 0.2);
    for (let i = 0; i < 3; i++) {
      const by = y - h * (0.12 + i * 0.26), w = h * (0.34 - i * 0.08), ty = by - h * 0.42;
      ctx.fillStyle = P[0]; poly(ctx, [x - w, by, x, ty, x + w, by]);
      ctx.fillStyle = P[1]; poly(ctx, [x - w, by, x, ty, x - w * 0.1, by]);
      if (snow) { ctx.fillStyle = 'rgba(245,248,250,0.9)'; poly(ctx, [x - w * 0.45, ty + h * 0.2, x, ty, x + w * 0.4, ty + h * 0.18]); }
    }
  }

  function view(ctx, g, c, vw, H, offY) {
    const key = ZS.chopokArt.look(g), u = clamp(c.ride / SIM().RIDE.top, 0, 1), snow = key === 'snow';
    ZS.chopokArt.skyline(ctx, key, c.ride * 0.6 + 2400, vw, offY, 40 + u * 220);
    for (let l = 0; l < 2; l++) {
      const base = GY + 70 + l * 120 + u * (110 + l * 150), off = c.ride * (0.55 + l * 0.4);
      const yAt = (x) => base - 30 * sin((x + off) * 0.005 + l * 2) - 12 * sin((x + off) * 0.017);
      ctx.fillStyle = SLOPE[key][l];
      ctx.beginPath(); ctx.moveTo(-20, GY + H + 400);
      for (let x = -20; x <= vw + 40; x += 24) ctx.lineTo(x, yAt(x));
      ctx.lineTo(vw + 40, GY + H + 400); ctx.closePath(); ctx.fill();
      const step = 34 + l * 12, dense = 1 - smooth((u - 0.55) / 0.3);
      for (let x = -((off % step) + step); x < vw + step; x += step) {
        const i = Math.round((x + off) / step), hsh = hash(i * 1.7 + l * 9.1);
        if (hsh > 0.25 + 0.7 * dense) {
          if (dense < 0.6 && hsh < 0.9) { ctx.fillStyle = l ? '#3d5c3a' : '#4b6b44'; ell(ctx, x, yAt(x) + 4, 16 + 6 * l, 7 + 2 * l); }
          continue;
        }
        spruce(ctx, x + hash(i * 3.3) * 12, yAt(x) + 10, (34 + l * 22) * (0.75 + 0.5 * hash(i * 5.1)), SPRUCE[key], snow);
      }
    }
  }

  function hall(ctx, c, s, hx, hy, t) {
    const x0 = hx + s.off + s.a, x1 = hx + s.off + s.z, top = -3000, bot = GY + 1200;
    const gr = ctx.createLinearGradient(0, BOX.top - 200, 0, GY + 60);
    gr.addColorStop(0, '#c4c9cd'); gr.addColorStop(1, '#dde0e2');
    ctx.fillStyle = gr; ctx.fillRect(x0, top, x1 - x0, bot - top);
    for (let x = x0 + 90; x < x1 - 40; x += 180) {
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x, top, 16, bot - top);
      ctx.fillStyle = '#b3b8bd'; ctx.fillRect(x, top, 5, bot - top);
    }
    ctx.fillStyle = '#e8590c'; ctx.fillRect(x0, GY - 206, x1 - x0, 44);
    ctx.fillStyle = '#c4490a'; ctx.fillRect(x0, GY - 166, x1 - x0, 4);
    ctx.fillStyle = '#fff'; ctx.font = '900 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = stationName(s.kind);
    for (let x = x0 + 260; x < x1 - 120; x += 520) ctx.fillText(name, x, GY - 184);
    for (let x = x0 + 60; x < x1 - 30; x += 150) {
      ctx.fillStyle = 'rgba(255,250,215,0.35)'; ell(ctx, x, BOX.top - 30, 34, 10);
      ctx.fillStyle = '#fffbe6'; ctx.fillRect(x - 22, BOX.top - 34, 44, 6);
    }
    ctx.fillStyle = '#4a4e55'; ctx.fillRect(x0, hy - 8, x1 - x0, 12);
    ctx.fillStyle = '#6d727a'; ctx.fillRect(x0, hy - 8, x1 - x0, 3);
    for (let x = x0 + 40; x < x1; x += 120) { ctx.fillStyle = '#3c4048'; ctx.fillRect(x, hy - 60, 8, 54); }
    ctx.fillStyle = '#8f9499'; ctx.fillRect(x0, BOX.bot + 6, x1 - x0, bot - BOX.bot);
    ctx.fillStyle = '#f0c030'; ctx.fillRect(x0, BOX.bot + 6, x1 - x0, 6);
    ctx.fillStyle = '#2b2d31'; for (let x = x0; x < x1; x += 40) poly(ctx, [x, BOX.bot + 6, x + 14, BOX.bot + 6, x + 6, BOX.bot + 12, x - 8, BOX.bot + 12]);
    ctx.fillStyle = '#5b6168'; ctx.fillRect(x0 - 30, top, 30, bot - top); ctx.fillRect(x1, top, 30, bot - top);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x0, top, 24, bot - top); ctx.fillRect(x1 - 24, top, 24, bot - top);
    void t;
  }

  function pylons(ctx, c, hx, hy, k) {
    for (const p of SIM().RIDE.pylons) {
      const x = hx + p - c.ride;
      if (abs(x - hx) > 1600) continue;
      const cy = hy - (x - hx) * k, bot = GY + 1200, top = cy + 46;
      ctx.fillStyle = '#6b7178';
      poly(ctx, [x - 90, bot, x - 22, top, x - 12, top, x - 72, bot]);
      poly(ctx, [x + 90, bot, x + 22, top, x + 12, top, x + 72, bot]);
      ctx.strokeStyle = '#6b7178'; ctx.lineWidth = 4;
      ctx.beginPath();
      for (let y = top + 30, i = 0; y < GY + 700; y += 70, i++) {
        const w0 = 17 + (y - top) * 0.2, w1 = 17 + (y + 70 - top) * 0.2;
        if (i % 2) { ctx.moveTo(x - w0, y); ctx.lineTo(x + w1, y + 70); } else { ctx.moveTo(x + w0, y); ctx.lineTo(x - w1, y + 70); }
      }
      ctx.stroke();
      ctx.fillStyle = '#585e66'; ctx.fillRect(x - 70, top - 8, 140, 12);
      ctx.save(); ctx.translate(x, cy); ctx.rotate(-Math.atan(k));
      ctx.fillStyle = '#4a4e55'; rr(ctx, -64, 6, 128, 10, 4);
      ctx.fillStyle = '#2b2d31'; for (let i = -3; i <= 3; i++) circle(ctx, i * 18, 5, 6);
      ctx.fillStyle = '#9aa0a6'; for (let i = -3; i <= 3; i++) circle(ctx, i * 18, 5, 2);
      ctx.fillStyle = '#e8590c'; ctx.fillRect(-4, 16, 8, 30);
      ctx.restore();
    }
  }

  function cables(ctx, hx, hy, k, lo, hi) {
    ctx.lineCap = 'round';
    for (const [d, col, w] of [[-3, '#3a3d42', 2.4], [3, '#22242a', 2.8]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(lo, hy + d - (lo - hx) * k); ctx.lineTo(hi, hy + d - (hi - hx) * k); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function carriage(ctx, hx, hy, k, c, t) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-Math.atan(k));
    ctx.fillStyle = '#5b6168'; rr(ctx, -86, -2, 172, 20, 7);
    ctx.fillStyle = '#6d737b'; ctx.fillRect(-80, 0, 160, 4);
    const spin = c.climb * 9;
    for (const x of [-62, -22, 22, 62]) {
      ctx.fillStyle = '#2b2d31'; circle(ctx, x, -2, 8);
      ctx.strokeStyle = '#8d939a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + cos(spin) * 5, -2 + sin(spin) * 5); ctx.lineTo(x - cos(spin) * 5, -2 - sin(spin) * 5); ctx.stroke();
    }
    ctx.fillStyle = '#e8590c'; ctx.fillRect(-30, 6, 60, 8);
    ctx.fillStyle = '#fff'; ctx.font = '800 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VRCHOLY', 0, 10.5);
    ctx.restore();
    void t;
  }

  function hanger(ctx, hx, hy) {
    const T = BOX.top;
    ctx.fillStyle = '#3c4048'; ctx.fillRect(hx - 7, hy + 14, 14, T - hy - 10);
    ctx.fillStyle = '#5b6168'; ctx.fillRect(hx - 3, hy + 14, 3, T - hy - 10);
    ctx.fillStyle = '#2b2d31'; rr(ctx, hx - 46, T - 8, 92, 10, 4);
  }

  function shell(ctx, c, g) {
    const L = BOX.left, R = BOX.right, T = BOX.top, B = BOX.bot, [w0, w1] = BOX.win, t = g.time;
    ctx.fillStyle = '#e8590c';
    rr(ctx, L, T, R - L, w0 - T + 4, 22);
    ctx.fillRect(L, w1 - 2, R - L, B - w1 + 2);
    ctx.fillStyle = '#ff7a2e'; ctx.fillRect(L + 18, T + 3, R - L - 36, 3);
    ctx.fillStyle = '#c4490a'; ctx.fillRect(L, w1 + 26, R - L, 6);
    ctx.fillStyle = '#d4520a';
    const n = 5, pw = 14;
    for (let i = 0; i <= n; i++) { const x = L + (i * (R - L)) / n - (i === n ? pw : i === 0 ? 0 : pw / 2); ctx.fillRect(x, w0, pw, w1 - w0); }
    ctx.fillStyle = 'rgba(180,220,240,0.14)';
    for (let i = 0; i < n; i++) { const x = L + (i * (R - L)) / n + pw; ctx.fillRect(x, w0, (R - L) / n - pw * 1.5, w1 - w0); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) { const x = L + (i * (R - L)) / n + pw + 10; ctx.beginPath(); ctx.moveTo(x, w0 + 12); ctx.lineTo(x + 26, w0 + 2); ctx.moveTo(x + 8, w0 + 22); ctx.lineTo(x + 46, w0 + 4); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = '900 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FUNITEL · VrcholPass', (L + R) / 2, T + 24);
    const R2 = SIM().RIDE, u = clamp(c.ride / R2.top, 0, 1), alt = Math.round(1110 + u * 894);
    ctx.fillStyle = '#1b1d21'; rr(ctx, L + 34, T + 12, 92, 24, 5);
    ctx.fillStyle = '#7cfc9a'; ctx.font = '700 13px ui-monospace, monospace'; ctx.fillText(String(alt).replace(/(\d)(\d{3})$/, '$1 $2') + ' m', L + 80, T + 24);
    const m0 = R - 240, m1 = R - 60, my = T + 24;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m0, my); ctx.lineTo(m1, my); ctx.stroke();
    for (const [f, on] of [[0, 1], [R2.mid / R2.top, c.leg > 0 || c.wait > 0 ? 1 : 0], [1, c.arrived > 0 ? 1 : 0]]) {
      ctx.fillStyle = on ? '#fff' : '#e8590c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(m0 + f * (m1 - m0), my, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#ffe066'; circle(ctx, m0 + u * (m1 - m0), my, 3 + 0.8 * sin(t * 5));
    ctx.fillStyle = '#d7d9dc'; ctx.fillRect(L + 14, w1 + 2, R - L - 28, GY - w1 - 2);
    ctx.fillStyle = '#c3c6ca'; for (let x = L + 134; x < R - 30; x += 122) ctx.fillRect(x, w1 + 6, 2, GY - w1 - 10);
    ctx.fillStyle = '#5c6068';
    rr(ctx, L + 22, GY - 58, 104, 9, 4); rr(ctx, L + 22, GY - 34, 104, 8, 3);
    rr(ctx, R - 230, GY - 58, 104, 9, 4); rr(ctx, R - 230, GY - 34, 104, 8, 3);
    ctx.fillStyle = '#2f6db0'; rr(ctx, L + 160, w1 + 10, 70, 46, 4);
    ctx.fillStyle = '#fff'; ctx.font = '800 8px system-ui, sans-serif'; ctx.fillText('VrcholPass', L + 195, w1 + 22); ctx.fillText('★ ★ ★', L + 195, w1 + 40);
    ctx.fillStyle = '#4a4e55'; ctx.fillRect(L + 14, GY, R - L - 28, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; for (let x = L + 18; x < R - 18; x += 9) ctx.fillRect(x, GY + 3, 4, 8);
    ctx.fillStyle = '#5c6068'; ctx.fillRect(L + 14, w0 - 20, R - L - 28, 4);
    ctx.fillStyle = 'rgba(255,250,220,0.9)'; ctx.fillRect(L + 40, w0 - 27, R - L - 80, 3);
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(L + 30, w0 - 8, R - L - 60, 3);
    const d = c.door, dc = R - 75;
    ctx.strokeStyle = '#a63d08'; ctx.lineWidth = 3;
    for (const [x, w] of [[dc - 54 - 46 * d, 54], [dc + 46 * d, 54]]) {
      ctx.fillStyle = 'rgba(170,205,225,0.22)'; ctx.fillRect(x, w0 + 4, w, GY - w0 - 4);
      ctx.strokeRect(x, w0 + 4, w, GY - w0 - 4);
    }
    if (d > 0.01) { ctx.fillStyle = 'rgba(30,30,30,0.18)'; ctx.fillRect(dc - 46 * d, w0 + 4, 92 * d, GY - w0 - 4); }
  }

  function crowd(ctx, g, c) {
    const t = g.time, pt = c.pointa;
    for (const p of SIM().riders(c)) {
      person(ctx, p.id, 'tourist', p.x, p.dir, p.walking || pt ? 'walk' : 'idle', t, { look: p.look, size: p.size || 1, hiker: true, empty: true });
    }
    const w = c.warn;
    if (w) {
      const list = SIM().riders(c), who = list[w.call.startsWith('kids') ? list.length - 1 : 1];
      if (who) { ctx.strokeStyle = '#f2d3b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(who.x, GY - 60 * (who.size || 1)); ctx.lineTo(who.x + w.side * 26, GY - 84 * (who.size || 1)); ctx.stroke(); }
    }
  }

  function level(ctx, c, t) {
    const x = (BOX.left + BOX.right) / 2, y = BOX.win[1] + 22, w = 200, k = clamp(c.tilt / 0.3, -1, 1), bad = abs(c.tilt) > SIM().LIMIT;
    ctx.fillStyle = '#2b2d31'; rr(ctx, x - w / 2 - 4, y - 10, w + 8, 20, 10);
    ctx.fillStyle = '#d8efe0'; rr(ctx, x - w / 2, y - 7, w, 14, 7);
    const zone = w * (SIM().LIMIT / 0.3);
    ctx.fillStyle = 'rgba(47,125,79,0.35)'; ctx.fillRect(x - zone / 2, y - 7, zone, 14);
    ctx.fillStyle = bad ? (sin(t * 16) > 0 ? '#e03131' : '#ff8a80') : '#f0c030';
    circle(ctx, x + k * (w / 2 - 8), y, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - zone / 2, y - 7); ctx.lineTo(x - zone / 2, y + 7); ctx.moveTo(x + zone / 2, y - 7); ctx.lineTo(x + zone / 2, y + 7); ctx.stroke();
    if (bad || c.fail) { ctx.fillStyle = sin(t * 14) > 0 ? '#ff3b30' : '#7a1f1a'; circle(ctx, BOX.left + 30, BOX.top + 24, 7); circle(ctx, BOX.right - 30, BOX.top + 24, 7); }
  }

  function overlays(ctx, g, c, lo, hi, offY) {
    const b = g.bear, P = ZS.render.props;
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.min(1, f.t);
      label(ctx, f.text, f.x, Math.max(-offY + 12, f.y - (1.6 - f.t) * 30), 16, f.color);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) P.bubble(ctx, b.x, GY - 180, g.bubble.text, g.bubble.t, lo, hi);
  }

  function banner(ctx, g, c, vw, offY) {
    const show = c.t < 7 ? 1 - smooth((c.t - 5.5) / 1.5) : 0;
    if (show <= 0.01) return;
    const text = g.touch ? LABELS.cabin.bannerTouch : LABELS.cabin.banner;
    ctx.globalAlpha = show;
    ctx.font = '700 15px system-ui, sans-serif';
    const w = min(vw - 24, ctx.measureText(text).width + 32);
    ctx.fillStyle = 'rgba(20,16,26,0.82)'; rr(ctx, vw / 2 - w / 2, -offY + 70, w, 34, 17);
    ctx.fillStyle = '#f6e7c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, vw / 2, -offY + 87, w - 20);
    ctx.globalAlpha = 1;
  }

  function draw(g, ctx, viewW, offY) {
    const c = g.chopok.pass.play, H = g.viewH || 540, b = g.bear, t = g.time;
    const hurt = b.inv > 0 ? 0.45 + 0.35 * cos(t * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, t); ctx.globalAlpha = 1; };
    const sc = min(1, (viewW - 16) / (BOX.right - BOX.left + 40)), mid = (BOX.left + BOX.right) / 2;
    const shake = c.speed * 0.6 * sin(t * 2.2);
    const st = nearest(c), k = CABLE * sstep(300, 1100, abs(st.off));
    const lo = mid - viewW / (2 * sc) - 40, hi = mid + viewW / (2 * sc) + 40;
    ctx.save();
    ctx.translate(0, offY);
    view(ctx, g, c, viewW, H, offY);
    ctx.translate(viewW / 2, GY); ctx.scale(sc, sc); ctx.translate(-mid, -GY + shake);
    const hx = mid, hy = BOX.top - 74;
    if (st.off + st.z > lo - hx && st.off + st.a < hi - hx) hall(ctx, c, st, hx, hy, t);
    pylons(ctx, c, hx, hy, k);
    cables(ctx, hx, hy, k, lo, hi);
    carriage(ctx, hx, hy, k, c, t);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(c.tilt); ctx.translate(-hx, -hy);
    hanger(ctx, hx, hy);
    shell(ctx, c, g);
    level(ctx, c, t);
    crowd(ctx, g, c);
    withBear(ZS.drawBear, b, 1);
    ctx.restore();
    overlays(ctx, g, c, mid - viewW / (2 * sc) + 8, mid + viewW / (2 * sc) - 8, offY);
    ctx.restore();
    ctx.save(); ctx.translate(0, offY);
    banner(ctx, g, c, viewW, offY);
    ctx.restore();
    const F = SIM().FAIL, dark = c.fail ? smooth((c.fail.t - F.shake) / (F.dark - F.shake)) : c.back || 0;
    if (dark > 0.01) { ctx.fillStyle = 'rgba(8,8,12,' + dark.toFixed(3) + ')'; ctx.fillRect(0, 0, viewW, H + 40); }
    const f = (c.pointa && c.pointa.flash) || 0;
    if (f > 0) { ctx.fillStyle = 'rgba(255,255,250,' + (0.75 * f).toFixed(3) + ')'; ctx.fillRect(0, 0, viewW, H + 40); }
  }

  Object.assign(API, { draw, BOX });
})();
