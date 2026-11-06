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

  function season(g) {
    return g.seasonKey === 'firstSnow' ? 'snow' : ZS.seasonLook(g.seasonKey) === 'autumn' ? 'autumn' : 'summer';
  }

  const SLOPE = { summer: ['#5f8f4a', '#4d7a3c', '#3c6534'], autumn: ['#9a8a4a', '#7d7a3e', '#5f6534'], snow: ['#8a8f6a', '#6f7a58', '#58654a'] };

  function view(ctx, g, c, vw, H, offY) {
    const k = season(g), up = c.climb, P = SLOPE[k];
    const gr = ctx.createLinearGradient(0, -offY, 0, GY + 60);
    gr.addColorStop(0, k === 'snow' ? '#93a5b6' : '#6fb3e6'); gr.addColorStop(1, k === 'autumn' ? '#f4e6cf' : '#e2f1fa');
    ctx.fillStyle = gr; ctx.fillRect(0, -offY - 10, vw, H + 40);
    const far = GY - 150 + up * 3.2;
    ctx.fillStyle = '#9fb3c6';
    ctx.beginPath(); ctx.moveTo(0, GY + 200);
    for (let x = -40; x <= vw + 40; x += 40) { const i = Math.floor((x + up * 2) / 40); ctx.lineTo(x, far - (i % 2 ? 50 + hash(i) * 60 : hash(i * 3) * 25)); }
    ctx.lineTo(vw + 40, GY + 200); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let x = -40; x <= vw + 40; x += 80) { const i = Math.floor((x + up * 2) / 40) | 1, y = far - 50 - hash(i) * 60; poly(ctx, [x - 8, y + 14, x, y, x + 10, y + 16]); }
    ctx.fillStyle = '#7fb0c8'; ell(ctx, vw * 0.35, GY - 40 + up * 4.6, vw * 0.3, 10);
    for (let l = 0; l < 3; l++) {
      const y0 = GY - 60 + l * 70 + up * (6 + l * 5), off = up * (20 + l * 14);
      ctx.fillStyle = P[l];
      ctx.beginPath(); ctx.moveTo(-20, GY + 400);
      for (let x = -20; x <= vw + 40; x += 30) ctx.lineTo(x, y0 - 30 * sin((x + off) * 0.008 + l) - 14 * sin((x + off) * 0.02));
      ctx.lineTo(vw + 40, GY + 400); ctx.closePath(); ctx.fill();
      ctx.fillStyle = l === 2 ? '#2e5639' : '#3c6a45';
      for (let x = -((off * 0.9) % 46); x < vw + 46; x += 46) {
        const i = Math.round((x + off * 0.9) / 46), y = y0 - 30 * sin((x + off) * 0.008 + l) - 14 * sin((x + off) * 0.02) + 8;
        if (hash(i * 1.3 + l) < 0.35) continue;
        const h = 22 + l * 10;
        poly(ctx, [x - h * 0.3, y, x, y - h, x + h * 0.3, y]);
      }
    }
    const pyl = ((up * 60) % 900) - 200, px = vw - pyl;
    ctx.fillStyle = '#5b6168';
    poly(ctx, [px - 14, GY + 400, px - 4, GY - 300 + up * 10 % 30, px + 4, GY - 300 + up * 10 % 30, px + 14, GY + 400]);
    ctx.fillRect(px - 40, GY - 310 + up * 10 % 30, 80, 8);
  }

  function hall(ctx, c, vw, H, offY, at) {
    ctx.fillStyle = '#c9ccd0'; ctx.fillRect(0, -offY - 10, vw, H + 40);
    ctx.fillStyle = '#9aa0a6'; for (let x = -((at * 40) % 120); x < vw; x += 120) ctx.fillRect(x, -offY, 10, H + 40);
    ctx.fillStyle = '#e8590c'; ctx.fillRect(0, GY - 380, vw, 30);
    ctx.fillStyle = '#fff'; ctx.font = '900 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.t > SIM().ARRIVE ? LABELS.chopok.board.top : LABELS.cabin.station, vw / 2, GY - 365);
    ctx.fillStyle = '#8d8f92'; ctx.fillRect(0, GY + 30, vw, H);
  }

  function cables(ctx, vw, offY, sway) {
    ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 2;
    for (const d of [-7, 7]) { ctx.beginPath(); ctx.moveTo(-20, BOX.top - 90 + d + 60); ctx.lineTo(vw + 20, BOX.top - 150 + d - 60); ctx.stroke(); }
    void offY; void sway;
  }

  function shell(ctx, c, g) {
    const L = BOX.left, R = BOX.right, T = BOX.top, B = BOX.bot, [w0, w1] = BOX.win, t = g.time;
    ctx.fillStyle = '#3c4048'; ctx.fillRect((L + R) / 2 - 8, T - 70, 16, 72);
    ctx.fillStyle = '#5b6168'; rr(ctx, (L + R) / 2 - 70, T - 84, 140, 20, 6);
    ctx.fillStyle = '#2b2d31'; circle(ctx, (L + R) / 2 - 46, T - 74, 10); circle(ctx, (L + R) / 2 + 46, T - 74, 10);
    ctx.fillStyle = '#e8590c';
    rr(ctx, L, T, R - L, w0 - T + 4, 22);
    ctx.fillRect(L, w1 - 2, R - L, B - w1 + 2);
    ctx.fillStyle = '#c4490a'; ctx.fillRect(L, w1 + 26, R - L, 6);
    ctx.fillStyle = '#d4520a';
    const n = 5, pw = 14;
    for (let i = 0; i <= n; i++) { const x = L + (i * (R - L)) / n - (i === n ? pw : i === 0 ? 0 : pw / 2); ctx.fillRect(x, w0, pw, w1 - w0); }
    ctx.fillStyle = 'rgba(180,220,240,0.12)';
    for (let i = 0; i < n; i++) { const x = L + (i * (R - L)) / n + pw; ctx.fillRect(x, w0, (R - L) / n - pw * 1.5, w1 - w0); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) { const x = L + (i * (R - L)) / n + pw + 10; ctx.beginPath(); ctx.moveTo(x, w0 + 12); ctx.lineTo(x + 26, w0 + 2); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = '900 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FUNITEL · VrcholPass', (L + R) / 2, T + 24);
    ctx.fillStyle = '#d7d9dc'; ctx.fillRect(L + 14, w1 + 2, R - L - 28, GY - w1 - 2);
    ctx.fillStyle = '#c3c6ca'; for (let x = L + 30; x < R - 30; x += 70) ctx.fillRect(x, w1 + 6, 2, GY - w1 - 10);
    ctx.fillStyle = '#4a4e55'; ctx.fillRect(L + 14, GY, R - L - 28, 14);
    ctx.fillStyle = '#5c6068'; ctx.fillRect(L + 14, w0 - 20, R - L - 28, 4);
    for (let x = L + 50; x < R - 40; x += 46) {
      const sw = sin(t * 2 + x) * 2 * (0.3 + c.speed);
      ctx.strokeStyle = '#3c4048'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, w0 - 16); ctx.lineTo(x + sw, w0 + 6); ctx.stroke();
      ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + sw, w0 + 11, 5, 0, TAU); ctx.stroke();
    }
    const d = c.door, dx = R - 70;
    ctx.fillStyle = '#c4490a'; ctx.fillRect(dx - 2, w0 - 2, 4, GY - w0 + 2);
    if (d > 0.01) {
      ctx.fillStyle = 'rgba(30,30,30,0.25)'; ctx.fillRect(dx, w0, 60 * d, GY - w0);
    }
  }

  function crowd(ctx, g, c) {
    const t = g.time, pt = c.pointa;
    for (const p of SIM().riders(c)) {
      person(ctx, p.id, p.kind, p.x, p.dir, p.walking || pt ? 'walk' : 'idle', t, { look: p.look, size: p.size || 1, empty: p.kind === 'porter' });
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
    if (bad || c.stop > 0) { ctx.fillStyle = sin(t * 14) > 0 ? '#ff3b30' : '#7a1f1a'; circle(ctx, BOX.left + 30, BOX.top + 24, 7); circle(ctx, BOX.right - 30, BOX.top + 24, 7); }
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
    const S = g.level, c = g.chopok.pass.play, H = g.viewH || 540, b = g.bear, t = g.time;
    const hurt = b.inv > 0 ? 0.45 + 0.35 * cos(t * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, t); ctx.globalAlpha = 1; };
    const sc = min(1, (viewW - 16) / (BOX.right - BOX.left + 40)), mid = (BOX.left + BOX.right) / 2;
    const shake = c.speed * 1.2 * sin(t * 13) + (c.stop > 0 ? 2 * sin(t * 40) : 0);
    const inHall = c.t > SIM().STATION[0] - 0.4 && c.t < SIM().STATION[1] + 0.4 ? 1 : c.t > SIM().ARRIVE - 0.4 ? 1 : 0;
    ctx.save();
    ctx.translate(0, offY);
    if (inHall) hall(ctx, c, viewW, H, offY, c.climb); else view(ctx, g, c, viewW, H, offY);
    cables(ctx, viewW, offY, shake);
    ctx.translate(viewW / 2, GY); ctx.scale(sc, sc); ctx.translate(-mid, -GY + shake);
    const hx = mid, hy = BOX.top - 74;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(c.tilt); ctx.translate(-hx, -hy);
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
    const f = (c.pointa && c.pointa.flash) || 0;
    if (f > 0) { ctx.fillStyle = 'rgba(255,255,250,' + (0.75 * f).toFixed(3) + ')'; ctx.fillRect(0, 0, viewW, H + 40); }
  }

  Object.assign(API, { draw, BOX });
})();
