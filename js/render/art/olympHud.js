(function () {
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, min = Math.min, max = Math.max, abs = Math.abs, floor = Math.floor;
  const { clamp, lerp, smooth, hash } = ZS.util;
  const { circle, ellipse: ell, rrect: rr } = ZS.gfx;
  const SIM = () => ZS.sim.olymp;
  const F = () => ZS.olympFig;
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const INK = 'rgba(14,22,40,0.82)', GOLD = '#ffd84a';
  const NAT = { SVK: ['#ffffff', '#0b4ea2', '#ee1c25'], AUT: ['#ed2939', '#ffffff', '#ed2939'], SUI: ['#d52b1e', '#d52b1e', '#d52b1e'], NOR: ['#ba0c2f', '#ffffff', '#00205b'], FRA: ['#0055a4', '#ffffff', '#ef4135'], POL: ['#ffffff', '#ffffff', '#dc143c'], CZE: ['#ffffff', '#d7141a', '#11457e'] };

  function clock(t) {
    const all = Math.round(max(0, t || 0) * 100), m = floor(all / 6000), ss = floor((all % 6000) / 100), cc = all % 100, sep = ZS.i18n && ZS.i18n.lang === 'en' ? '.' : ',';
    return m + ':' + (ss < 10 ? '0' : '') + ss + sep + (cc < 10 ? '0' : '') + cc;
  }

  function txt(ctx, t, x, y, size, col, weight, align, maxW) {
    ctx.font = (weight || 700) + ' ' + max(1, size).toFixed(1) + 'px ' + FONT;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
    if (maxW) { const w = ctx.measureText(t).width; if (w > maxW) ctx.font = (weight || 700) + ' ' + max(1, size * maxW / w).toFixed(1) + 'px ' + FONT; }
    ctx.fillText(t, x, y);
  }

  function width(ctx, t, size, weight) { ctx.font = (weight || 700) + ' ' + max(1, size).toFixed(1) + 'px ' + FONT; return ctx.measureText(t).width; }

  function flag(ctx, nat, x, y, w, h) {
    const c = NAT[nat] || NAT.SVK;
    if (nat === 'SUI') { ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.42, y + h * 0.18, w * 0.16, h * 0.64); ctx.fillRect(x + w * 0.25, y + h * 0.42, w * 0.5, h * 0.16); return; }
    if (nat === 'FRA') { for (let i = 0; i < 3; i++) { ctx.fillStyle = c[i]; ctx.fillRect(x + (w / 3) * i, y, w / 3 + 0.5, h); } return; }
    if (nat === 'NOR') { ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.27, y, w * 0.2, h); ctx.fillRect(x, y + h * 0.38, w, h * 0.24); ctx.fillStyle = c[2]; ctx.fillRect(x + w * 0.31, y, w * 0.12, h); ctx.fillRect(x, y + h * 0.44, w, h * 0.12); return; }
    if (nat === 'POL') { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h / 2); ctx.fillStyle = c[2]; ctx.fillRect(x, y + h / 2, w, h / 2); return; }
    if (nat === 'CZE') { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h / 2); ctx.fillStyle = c[1]; ctx.fillRect(x, y + h / 2, w, h / 2); ctx.fillStyle = c[2]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.5, y + h / 2); ctx.lineTo(x, y + h); ctx.fill(); return; }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = c[i]; ctx.fillRect(x, y + (h / 3) * i, w, h / 3 + 0.5); }
    if (nat === 'SVK') arms(ctx, x + w * 0.33, y + h * 0.5, h * 0.62);
  }

  function arms(ctx, cx, cy, h) {
    const w = h * 0.78, t = cy - h * 0.5;
    const shield = (k) => { ctx.beginPath(); ctx.moveTo(cx - w * k / 2, t + h * (1 - k) / 2); ctx.lineTo(cx + w * k / 2, t + h * (1 - k) / 2); ctx.lineTo(cx + w * k / 2, t + h * 0.55); ctx.quadraticCurveTo(cx + w * k / 2, t + h * (0.5 + k * 0.42), cx, t + h * (0.5 + k * 0.5)); ctx.quadraticCurveTo(cx - w * k / 2, t + h * (0.5 + k * 0.42), cx - w * k / 2, t + h * 0.55); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = '#fff'; shield(1);
    ctx.fillStyle = '#ee1c25'; shield(0.86);
    if (h < 7) return;
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - w * 0.43, t + h * 0.07); ctx.lineTo(cx + w * 0.43, t + h * 0.07); ctx.lineTo(cx + w * 0.43, t + h * 0.55); ctx.quadraticCurveTo(cx + w * 0.43, t + h * 0.86, cx, t + h * 0.93); ctx.quadraticCurveTo(cx - w * 0.43, t + h * 0.86, cx - w * 0.43, t + h * 0.55); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#0b4ea2';
    for (const [dx, r, dy] of [[-0.27, 0.2, 0.86], [0.27, 0.2, 0.86], [0, 0.23, 0.8]]) { ctx.beginPath(); ctx.arc(cx + dx * w, t + h * dy, r * w, PI, 0); ctx.lineTo(cx + (dx + r) * w, t + h); ctx.lineTo(cx + (dx - r) * w, t + h); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#fff';
    const bw = max(0.8, w * 0.09);
    ctx.fillRect(cx - bw / 2, t + h * 0.16, bw, h * 0.5);
    ctx.fillRect(cx - w * 0.16, t + h * 0.25, w * 0.32, bw * 0.95);
    ctx.fillRect(cx - w * 0.23, t + h * 0.4, w * 0.46, bw);
  }

  function px(V) {
    const ih = typeof innerHeight === 'number' && innerHeight > 0 ? innerHeight : 0;
    return ih ? V.h / ih : 1;
  }

  function topY(g, V) {
    const k = px(V);
    return V.top + (g.touch && V.h > V.w ? 92 : g.touch ? 56 : 54) * k;
  }

  function panel(ctx, g, O, V) {
    const L = ZS.LABELS.olymp.hud, c = O.c, k = clamp(V.k, 0.75, 1.25), y0 = topY(g, V), w = min(V.w - 24, 270 * k), x0 = V.cx - w / 2;
    let title = L[O.stage], big = '', row = [];
    if (O.stage === 'slalom') {
      big = clock(max(0, c.clock + c.pen - (c.bonus || 0)));
      const n = g.level.olymp.slalom.gates.length;
      row = [L.gates + ' ' + c.passed + '/' + n, c.pen ? '+' + c.pen + ' s' : '', c.bonus ? '−' + String(c.bonus).replace('.', ZS.i18n && ZS.i18n.lang === 'en' ? '.' : ',') + ' s' : '', Math.round(c.v * 3.6) + ' ' + L.speed];
    } else if (O.stage === 'skok') {
      big = O.phase === 'air' || O.phase === 'out' || O.phase === 'judges' ? L.height + ' ' + (max(0, (c.top || 0) - (c.y0 || 0))).toFixed(1).replace('.', ZS.i18n && ZS.i18n.lang === 'en' ? '.' : ',') + ' m' : Math.round(c.v * 3.6) + ' ' + L.speed;
      row = [];
    } else {
      if (O.phase === 'podium' || O.phase === 'doping') return;
      big = clock(c.clock);
      row = [Math.round(c.v * 3.6) + ' ' + L.speed, c.flies ? L.flies + ' ' + c.flies : ''];
    }
    const h = (row.filter(Boolean).length ? 72 : 52) * k;
    ctx.fillStyle = INK; rr(ctx, x0, y0, w, h, 12 * k);
    ctx.fillStyle = '#d1262c'; rr(ctx, x0, y0, 6 * k, h, 3 * k);
    txt(ctx, title.toUpperCase(), x0 + 16 * k, y0 + 13 * k, 11 * k, 'rgba(255,255,255,0.7)', 800, 'left', w * 0.5);
    flag(ctx, 'SVK', x0 + w - 34 * k, y0 + 7 * k, 22 * k, 14 * k);
    txt(ctx, L.you, x0 + w - 40 * k, y0 + 14 * k, 10 * k, 'rgba(255,255,255,0.75)', 700, 'right', w * 0.4);
    txt(ctx, big, x0 + 16 * k, y0 + 35 * k, 24 * k, '#fff', 800, 'left', w - 32 * k);
    if (O.stage === 'slalom' && O.phase === 'ready') { const n = floor(O.t / 0.8); for (let i = 0; i < 3; i++) { ctx.fillStyle = i <= n ? '#ff3b30' : 'rgba(255,255,255,0.18)'; circle(ctx, x0 + w - (78 - i * 26) * k, y0 + 36 * k, 9 * k); } }
    if (row.filter(Boolean).length) {
      let x = x0 + 16 * k;
      for (const r of row) {
        if (!r) continue;
        const pen = r[0] === '+';
        txt(ctx, r, x, y0 + 59 * k, 12 * k, pen ? '#ff8a7a' : 'rgba(255,255,255,0.85)', 700, 'left');
        x += width(ctx, r, 12 * k) + 16 * k;
      }
    }
    return y0 + h;
  }

  function mic(ctx, g, O, V, y) {
    const m = O.mic;
    if (!m) return y;
    const k = clamp(V.k, 0.75, 1.2), a = clamp(min(m.t * 2, 1), 0, 1), w = min(V.w - 24, 420 * k);
    const name = '🎙️ ' + ZS.LABELS.olymp.mic.name;
    ctx.globalAlpha = a;
    const lines = wrap(ctx, m.text, w - 24 * k, 13 * k);
    const h = (26 + lines.length * 17) * k;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; rr(ctx, V.cx - w / 2, y + 8 * k, w, h, 10 * k);
    txt(ctx, name, V.cx - w / 2 + 12 * k, y + 20 * k, 11 * k, '#d1262c', 800, 'left');
    lines.forEach((l, i) => txt(ctx, l, V.cx - w / 2 + 12 * k, y + (37 + i * 17) * k, 13 * k, '#1b2333', 600, 'left'));
    ctx.globalAlpha = 1;
    return y + 8 * k + h;
  }

  function wrap(ctx, t, w, size) {
    ctx.font = '600 ' + size.toFixed(1) + 'px ' + FONT;
    const words = String(t).split(' '), out = [];
    let cur = '';
    for (const wd of words) {
      const tr = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(tr).width > w && cur) { out.push(cur); cur = wd; } else cur = tr;
    }
    if (cur) out.push(cur);
    return out.slice(0, 3);
  }

  function floaters(ctx, g, V, y) {
    let i = 0;
    for (const f of g.floaters) {
      ctx.globalAlpha = clamp(f.t, 0, 1);
      ZS.gfx.label(ctx, f.text, V.cx, y + (30 + i * 26) * clamp(V.k, 0.8, 1.2) + (1.6 - f.t) * 10, 17 * clamp(V.k, 0.8, 1.2), f.color);
      ctx.globalAlpha = 1; i++;
    }
  }

  const part = (code, text, skill) => Object.assign([code, text], { skill });
  const tallTouch = (g, V) => g.touch && V.h > V.w;
  const promptY = (g, V, low) => (tallTouch(g, V) && !low ? V.top + V.h * 0.33 : V.bot - (g.touch ? (V.h > V.w ? 0.36 : 0.13) : low ? 0.1 : 0.2) * V.h);

  function prompts(ctx, g, O, V) {
    const c = O.c, L = ZS.LABELS.olymp.prompt, P = ZS.prompt, cer = O.phase === 'podium' || O.phase === 'doping' || O.phase === 'stop' || O.phase === 'judges', y = promptY(g, V, cer);
    let parts = null;
    if (O.stage === 'slalom') {
      const F2 = g.level.olymp.slalom.fallen, df = c ? F2.s - c.s : 99;
      if (O.phase === 'ski' && df > 3 && df < c.v * 2.4 && Math.abs(c.u - F2.u) < 3 && !(c.hy > 0)) parts = [part('Space', L.hop, 'olympHop')];
      else if (O.phase === 'view' && O.t > 0.4 || O.phase === 'ready') parts = [part('ArrowUp', L.pole, 'olympPole'), part(['ArrowLeft', 'ArrowRight'], L.steer, 'olympSteer')];
      else if (O.phase === 'ski' && O.t < 7) parts = [part(['ArrowLeft', 'ArrowRight'], L.steer, 'olympSteer'), part('ArrowDown', L.tuck, 'olympTuck')];
      else if (O.phase === 'ski' && c.fall <= 0 && c.v < 6 && !(c.hy > 0)) parts = [part('ArrowUp', L.pole)];
      else if (O.phase === 'stop' && O.t > 1.2) parts = [part('Space', L.next)];
    } else if (O.stage === 'skok') {
      if (O.phase === 'top') parts = [part('ArrowUp', L.pole, 'olympPole'), part('Space', L.pop, 'olympPop')];
      else if (O.phase === 'in' && c.press === null) parts = [part('Space', L.pop, 'olympPop')];
      else if (O.phase === 'air' && c.air < 1.6) parts = [part('ArrowUp', L.flip, 'olympTrick'), part(['ArrowLeft', 'ArrowRight'], L.spin, 'olympTrick'), part('KeyC', L.grab, 'olympTrick')];
      else if (O.phase === 'judges' && O.t > 1.6) parts = [part('Space', L.next)];
    } else if (O.phase === 'run' && c && g.level.olymp.sled.things.some((t) => !t.hit && (t.kind === 'mound' || t.kind === 'glove') && t.s - c.s > 2 && t.s - c.s < c.v * 1.8 && Math.abs(t.a - c.a) < 0.35)) parts = [part('Space', L.hop, 'olympHop')];
    else if (O.phase === 'top' || (O.phase === 'run' && O.t < 6)) parts = [part(['ArrowLeft', 'ArrowRight'], L.lean, 'olympLean'), part('ArrowDown', L.lie, 'olympLie')];
    else if (O.phase === 'podium' && O.t > 2) parts = [part('Space', L.next)];
    if (c && c.tuck) P.learn('olympTuck');
    if (O.stage === 'sane' && c && c.tuck) P.learn('olympLie');
    P.show(ctx, g, parts && { parts, x: V.cx, y }, { size: clamp(15 * V.k, 13, 18), lo: 8, hi: V.w - 8 });
  }

  function countdown(ctx, g, O, V, y) {
    if (O.stage !== 'slalom') return;
    const k = clamp(V.k, 0.8, 1.3);

    if (O.phase === 'ski' && O.t < 1) {
      ctx.globalAlpha = clamp(1 - O.t, 0, 1);
      ZS.gfx.label(ctx, ZS.LABELS.olymp.hud.go, V.cx, y + 44 * k, 40 * k, '#2f7d4f');
      ctx.globalAlpha = 1;
    }
    if (O.phase === 'view') {
      const a = clamp(O.t * 2, 0, 1) * (1 - smooth((O.t - 2.2) / 0.4));
      ctx.globalAlpha = clamp(a, 0, 1);
      const T = ZS.LEVEL_TEXT.olymp;
      const ty = topY(g, V) + 20 * k, tw = min(V.w - 24, max(width(ctx, T.name, 30 * k, 900), width(ctx, ZS.LABELS.olymp.hud.view, 15 * k)) + 40 * k);
      ctx.fillStyle = INK; rr(ctx, V.cx - tw / 2, ty - 26 * k, tw, 76 * k, 14 * k);
      txt(ctx, T.name, V.cx, ty, 30 * k, '#fff', 900, 'center', V.w - 40);
      txt(ctx, ZS.LABELS.olymp.hud.view, V.cx, ty + 30 * k, 15 * k, 'rgba(255,255,255,0.92)', 700, 'center', V.w - 40);
      ctx.globalAlpha = 1;
    }
  }

  function gateMark(ctx, g, O, V) {
    if (O.stage !== 'slalom' || O.phase !== 'ski') return;
    const C2 = g.level.olymp.slalom, c = O.c, q = C2.gates.find((x) => !x.done && x.s > c.s + 3);
    if (!q || q.s - c.s > 90 || q.s - c.s < 16) return;
    const A = ZS.olympArt, p = A.P(...A.wpt(C2.T, q.s, q.u, 2.6, [0, 0, 0]), [0, 0, 0]);
    if (p[2] < 1) return;
    const s = clamp(V.f / p[2] * 0.5, 4, 11), bob = sin(V.t * 6) * s * 0.15, col = q.i % 2 ? '#2f5fd0' : '#d8352a';
    ctx.globalAlpha = clamp((90 - (q.s - c.s)) / 20, 0, 1) * 0.9;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(p[0] - s, p[1] - s * 1.4 + bob); ctx.lineTo(p[0] + s, p[1] - s * 1.4 + bob); ctx.lineTo(p[0], p[1] + bob); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function hazardSigns(ctx, g, O, V) {
    if (O.stage !== 'slalom' || O.phase !== 'ski') return;
    const C2 = g.level.olymp.slalom, c = O.c, A = ZS.olympArt;
    for (const h of SIM().slalomHazards(g, c)) {
      const d = h.s0 - c.s, tt = d / max(c.v, 5);
      if (d < 4 || tt > 2.8) continue;
      const lane = Math.abs(c.u - clamp(c.u, h.u0 - 1, h.u1 + 1)) < 0.01;
      const p = A.P(...A.wpt(C2.T, h.s0, (h.u0 + h.u1) / 2, 3.4, [0, 0, 0]), [0, 0, 0]);
      if (p[2] < 1) continue;
      const s = max(0.8, V.k) * (1 + 0.06 * sin(V.t * 8));
      ctx.globalAlpha = smooth((2.8 - tt) / 0.5);
      warn(ctx, clamp(p[0], 24, V.w - 24), p[1] - 24 * s, s, lane ? '#e0321f' : '#e09a1e');
      ctx.globalAlpha = 1;
    }
  }

  function warn(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(20,16,26,0.82)'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(19, 14); ctx.lineTo(-19, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(15, 11); ctx.lineTo(-15, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-1.6, -6, 3.2, 10); ctx.fillRect(-1.6, 6, 3.2, 3);
    ctx.restore();
  }

  function meter(ctx, g, O, V) {
    if (O.stage !== 'skok' || O.phase !== 'in') return;
    const J = g.level.olymp.jump, c = O.c, A = SIM().AIR, d = J.lip - c.s;
    if (d > 60) return;
    const k = clamp(V.k, 0.8, 1.3), w = min(V.w - 40, 300 * k), h = 14 * k, x0 = V.cx - w / 2, y0 = promptY(g, V) + (tallTouch(g, V) ? 40 : g.touch ? -64 : 34) * k;
    const span = 60, at = (dd) => x0 + w * (1 - dd / span);
    ctx.fillStyle = INK; rr(ctx, x0 - 6 * k, y0 - 6 * k, w + 12 * k, h + 12 * k, 10 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, x0, y0, w, h, h / 2);
    ctx.fillStyle = '#f0b429'; rr(ctx, at(A.zone), y0, at(0) - at(A.zone), h, h / 2);
    ctx.fillStyle = '#3ecf6a'; rr(ctx, at(A.sweet), y0, at(0) - at(A.sweet), h, h / 2);
    const mx = at(clamp(d, 0, span));
    ctx.fillStyle = '#fff'; rr(ctx, mx - 3 * k, y0 - 5 * k, 6 * k, h + 10 * k, 3 * k);
    if (c.press !== null) { const pxx = at(J.lip - c.press); ctx.fillStyle = '#1b2333'; rr(ctx, pxx - 2 * k, y0 - 3 * k, 4 * k, h + 6 * k, 2 * k); }
  }

  function gauge(ctx, g, O, V) {
    if (O.stage !== 'sane' || O.phase !== 'run') return;
    const S = g.level.olymp.sled, c = O.c, k = clamp(V.k, 0.8, 1.3), R = 46 * k, wideTouch = g.touch && V.w > V.h, cx = wideTouch ? V.w - 90 * k : V.cx, cy = wideTouch ? V.top + V.h * 0.34 : V.bot - (g.touch ? 0.2 : 0.16) * V.h;
    const p = ZS.olympTrack.at(S.T, c.s), tl = SIM().wallTop(S, p, -1), tr = SIM().wallTop(S, p, 1);
    const ang = (a) => PI / 2 + a;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, R + 10 * k, PI * 0.0, PI * 1.0); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 8 * k; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(190,220,245,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(-tr + 0.18) , ang(tl - 0.18)); ctx.stroke();
    ctx.strokeStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(-tr), ang(-tr + 0.18)); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, ang(tl - 0.18), ang(tl)); ctx.stroke();
    ctx.lineCap = 'butt';
    const a = ang(-c.a), danger = abs(c.a) > (c.a > 0 ? tr : tl) - 0.25;
    ctx.fillStyle = danger ? '#ff3b30' : GOLD; circle(ctx, cx + cos(a) * R, cy + sin(a) * R, 7 * k);
    ctx.fillStyle = '#fff'; circle(ctx, cx, cy, 3 * k);
  }

  function tricksNow(ctx, g, O, V) {
    if (O.stage !== 'skok' || O.phase !== 'air') return;
    const c = O.c, L = ZS.LABELS.olymp.trick, k = clamp(V.k, 0.8, 1.3);
    const names = c.tricks.map((t) => L[t.kind]);
    if (!names.length) return;
    ZS.gfx.label(ctx, names.join(' + '), V.cx, promptY(g, V) + (tallTouch(g, V) ? 50 : -52) * k, 20 * k, '#1f4fa8', 800, V.w - 40);
  }

  function slalomBoard(ctx, g, O, V, top) {
    if (O.stage !== 'slalom' || O.phase !== 'stop' || O.t < 0.3) return;
    const r = g.once.olymp.slalom, L = ZS.LABELS.olymp.hud, U = ZS.UI.olymp, k = clamp(V.k, 0.75, 1.2);
    const list = SIM().RIVALS.map((x) => ({ name: x.name, nat: x.nat, t: x.slalom * SIM().PAR.slalom })).concat([{ name: L.you, nat: 'SVK', t: r.total, me: true }]).sort((a, b) => a.t - b.t);
    const w = min(V.w - 24, 330 * k), rowH = 22 * k, h = (88 + list.length * 22) * k, x0 = V.cx - w / 2, y0 = max(top + 8 * k, min(V.top + V.h * 0.5 - h / 2 + 30 * k, V.bot - h - 8));
    ctx.globalAlpha = clamp((O.t - 0.3) * 4, 0, 1);
    ctx.fillStyle = 'rgba(12,18,32,0.9)'; rr(ctx, x0, y0, w, h, 14 * k);
    ctx.fillStyle = '#d1262c'; rr(ctx, x0, y0, w, 30 * k, 14 * k); ctx.fillRect(x0, y0 + 16 * k, w, 14 * k);
    txt(ctx, L.finish + ' · ' + L.slalom.toUpperCase(), V.cx, y0 + 15 * k, 13 * k, '#fff', 900, 'center', w - 20);
    txt(ctx, clock(r.time) + (r.pen ? '  ' + U.pen(r.pen) : ''), V.cx, y0 + 50 * k, 22 * k, GOLD, 900, 'center', w - 20);
    txt(ctx, L.record + ' ' + clock(SIM().RECORD) + (r.record ? ' → ' + L.you : ''), V.cx, y0 + 74 * k, 11 * k, r.record ? '#9fe08a' : 'rgba(255,255,255,0.7)', 700, 'center', w - 20);
    list.forEach((e, i) => {
      const y = y0 + (96 + i * 22) * k;
      if (e.me) { ctx.fillStyle = 'rgba(255,216,74,0.18)'; ctx.fillRect(x0 + 6 * k, y - rowH / 2, w - 12 * k, rowH); }
      txt(ctx, (i + 1) + '.', x0 + 16 * k, y, 12 * k, '#fff', 800, 'left');
      flag(ctx, e.nat, x0 + 38 * k, y - 6 * k, 18 * k, 12 * k);
      txt(ctx, e.name + ' ' + e.nat, x0 + 62 * k, y, 12 * k, e.me ? GOLD : '#fff', e.me ? 800 : 600, 'left', w * 0.55);
      txt(ctx, clock(e.t), x0 + w - 14 * k, y, 12 * k, e.me ? GOLD : '#fff', 700, 'right');
    });
    ctx.globalAlpha = 1;
  }

  function judgesBoard(ctx, g, O, V, top) {
    if (O.stage !== 'skok' || O.phase !== 'judges') return;
    const r = g.once.olymp.jump, L = ZS.LABELS.olymp, k = clamp(V.k, 0.75, 1.2);
    const w = min(V.w - 24, 360 * k), h = (96 + r.marks.length * 30) * k, x0 = V.cx - w / 2, y0 = max(top + 8 * k, min(V.top + V.h * 0.5 - h / 2 + 24 * k, V.bot - h - 8));
    ctx.globalAlpha = clamp(O.t * 3, 0, 1);
    ctx.fillStyle = 'rgba(12,18,32,0.9)'; rr(ctx, x0, y0, w, h, 14 * k);
    ctx.fillStyle = '#0b4ea2'; rr(ctx, x0, y0, w, 30 * k, 14 * k); ctx.fillRect(x0, y0 + 16 * k, w, 14 * k);
    txt(ctx, L.hud.judges.toUpperCase(), V.cx, y0 + 15 * k, 13 * k, '#fff', 900, 'center', w - 20);
    txt(ctx, r.name, V.cx, y0 + 46 * k, 14 * k, '#fff', 800, 'center', w - 20);
    r.marks.forEach((m, i) => {
      const y = y0 + (72 + i * 30) * k, on = O.t > 0.25 + i * 0.2;
      flag(ctx, m.nat, x0 + 14 * k, y - 8 * k, 24 * k, 16 * k);
      txt(ctx, m.nat, x0 + 46 * k, y, 12 * k, 'rgba(255,255,255,0.8)', 800, 'left');
      if (m.note) txt(ctx, L.judge[m.note], x0 + 88 * k, y, 11 * k, 'rgba(255,255,255,0.65)', 600, 'left', w - 150 * k);
      if (on) { ctx.fillStyle = '#fff'; rr(ctx, x0 + w - 62 * k, y - 11 * k, 50 * k, 22 * k, 5 * k); txt(ctx, m.v.toFixed(1).replace('.', ZS.i18n && ZS.i18n.lang === 'en' ? '.' : ','), x0 + w - 37 * k, y, 15 * k, '#111', 900); }
    });
    if (O.t > 1.35) txt(ctx, L.hud.total + ' ' + r.sum.toFixed(1).replace('.', ZS.i18n && ZS.i18n.lang === 'en' ? '.' : ',') + ' · ' + L.hud.rank(r.rank), V.cx, y0 + h - 14 * k, 14 * k, GOLD, 900, 'center', w - 20);
    ctx.globalAlpha = 1;
  }

  function bubble(ctx, g, V) {
    if (!g.bubble) return;
    ZS.render.props.bubble(ctx, V.cx + 70 * V.k, V.top + V.h * 0.62, g.bubble.text, g.bubble.t, 8, V.w - 8);
  }

  function draw(ctx, g, O, V) {
    if (O.stage === 'sane' && (O.phase === 'podium' || O.phase === 'doping')) { prompts(ctx, g, O, V); return; }
    gateMark(ctx, g, O, V);
    hazardSigns(ctx, g, O, V);
    const quiet = O.phase === 'view' || O.phase === 'bar', board = O.phase === 'stop' || O.phase === 'judges';
    const y = (quiet ? null : panel(ctx, g, O, V)) || topY(g, V);
    const y2 = quiet || (board && V.h < 640) ? y : mic(ctx, g, O, V, y);
    countdown(ctx, g, O, V, O.phase === 'view' ? y : y2);
    meter(ctx, g, O, V);
    gauge(ctx, g, O, V);
    tricksNow(ctx, g, O, V);
    slalomBoard(ctx, g, O, V, y2);
    judgesBoard(ctx, g, O, V, y2);
    floaters(ctx, g, V, y2);
    bubble(ctx, g, V);
    prompts(ctx, g, O, V);
  }

  function mug(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(ctx, x - 0.11 * s, y - 0.26 * s, 0.22 * s, 0.26 * s, 0.03 * s);
    ctx.fillStyle = '#f2b23a'; ctx.fillRect(x - 0.09 * s, y - 0.2 * s, 0.18 * s, 0.18 * s);
    ctx.fillStyle = '#fffbe8'; ell(ctx, x, y - 0.24 * s, 0.12 * s, 0.05 * s);
  }

  function chamois(ctx, x, y, s) {
    ctx.fillStyle = '#6a4a2c'; rr(ctx, x - 0.5 * s, y - 0.1 * s, 1.0 * s, 0.7 * s, 0.1 * s);
    ctx.fillStyle = '#8a643f'; ell(ctx, x, y + 0.25 * s, 0.32 * s, 0.4 * s);
    ctx.fillStyle = '#efe6d6'; ell(ctx, x, y + 0.3 * s, 0.14 * s, 0.3 * s);
    ctx.fillStyle = '#2a1a0e'; ell(ctx, x - 0.12 * s, y + 0.12 * s, 0.05 * s, 0.08 * s); ell(ctx, x + 0.12 * s, y + 0.12 * s, 0.05 * s, 0.08 * s);
    ctx.strokeStyle = '#1b120a'; ctx.lineWidth = 0.06 * s; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * 0.1 * s, y - 0.1 * s); ctx.quadraticCurveTo(x + sd * 0.14 * s, y - 0.55 * s, x + sd * 0.02 * s, y - 0.55 * s); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }

  function barScene(ctx, g, O, V) {
    const a = smooth(O.t / 0.7), k = clamp(V.k, 0.7, 1.4), t = V.t, P = F();
    ctx.save();
    ctx.globalAlpha = a;
    const gr = ctx.createLinearGradient(0, V.top, 0, V.bot);
    gr.addColorStop(0, '#2c1a0e'); gr.addColorStop(0.55, '#5e3a1e'); gr.addColorStop(1, '#2a1a0e');
    ctx.fillStyle = gr; ctx.fillRect(-10, V.top - 10, V.w + 20, V.h + 20);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 16; i++) ctx.fillRect(-10, V.top + i * V.h / 16, V.w + 20, 2);
    const s = min(V.h * 0.2, V.w * 0.22), floorY = V.top + V.h * 0.78;
    for (const wx of [0.12, 0.88]) {
      const x = V.w * wx, y = V.top + V.h * 0.24, w = s * 0.9, h = s * 0.7;
      ctx.fillStyle = '#1d2a4a'; ctx.fillRect(x - w / 2, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 12; i++) circle(ctx, x - w / 2 + hash(i * 3 + wx) * w, y + ((t * 0.15 + hash(i * 7 + wx)) % 1) * h, 1.6 * k);
      ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 6 * k; ctx.strokeRect(x - w / 2, y, w, h); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.stroke();
    }
    chamois(ctx, V.cx, V.top + V.h * 0.27, s * 0.55);
    for (let i = 0; i < 26; i++) { const x = (i / 25) * V.w, y = V.top + V.h * 0.07 + sin((i / 25) * PI) * V.h * 0.05; ctx.fillStyle = ['#ff5a5a', '#ffd84a', '#5ad1ff', '#7cff7a'][i % 4]; ctx.globalAlpha = a * (sin(t * 5 + i) > -0.2 ? 1 : 0.35); circle(ctx, x, y, 4 * k); }
    ctx.globalAlpha = a;
    const glow = 0.8 + 0.2 * sin(t * 7);
    ctx.fillStyle = 'rgba(255,60,140,' + (0.18 * glow).toFixed(3) + ')'; rr(ctx, V.cx - min(V.w * 0.45, 260 * k), V.top + V.h * 0.12, min(V.w * 0.9, 520 * k), 44 * k, 12 * k);
    txt(ctx, ZS.LABELS.olymp.sign.bar, V.cx, V.top + V.h * 0.12 + 22 * k, 26 * k, '#ff8ac4', 900, 'center', min(V.w * 0.86, 500 * k));
    const cX = V.w * 0.8, cY = floorY - s * 0.55;
    ctx.fillStyle = '#7a4a24'; rr(ctx, cX - s * 0.9, cY, s * 1.9, s * 0.6, 6 * k);
    ctx.fillStyle = '#a8743a'; ctx.fillRect(cX - s * 0.95, cY - 0.06 * s, s * 2.0, 0.08 * s);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c9ced6'; ctx.fillRect(cX - s * 0.3 + i * 0.25 * s, cY - 0.3 * s, 0.05 * s, 0.25 * s); ctx.fillStyle = '#d1262c'; circle(ctx, cX - s * 0.28 + i * 0.25 * s, cY - 0.32 * s, 0.05 * s); }
    P.person(ctx, cX + s * 0.5, cY, s, { h: 1.2, jacket: '#1b1f2a', hat: '#d1262c', t, seed: 77, cheer: 0.3 });
    ctx.fillStyle = '#3a2412'; ctx.fillRect(-10, floorY, V.w + 20, V.bot - floorY + 10);
    ctx.fillStyle = '#6a4224'; ctx.fillRect(-10, floorY, V.w + 20, 6 * k);
    const n = max(4, floor(V.w / (90 * k)));
    for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
      const x = (i + 0.5 + row * 0.5) * V.w / n, sd = i * 3.7 + row * 11;
      if (abs(x - V.cx) < s * 0.85 || (row === 0 && abs(x - cX) < s)) continue;
      const ss = s * (row ? 0.8 : 0.66), y = floorY + (row ? s * 0.12 : -s * 0.06);
      P.person(ctx, x, y, ss, { h: 1.6 + hash(sd) * 0.2, jacket: P.JACKETS[(i + row * 3) % P.JACKETS.length], hat: P.HATS[(i + row) % P.HATS.length], t, seed: sd, cheer: 1 });
      const ax = x + ss * 0.27 * 0.55 * 1.7, up = 0.5 + 0.5 * sin(t * 7 + sd * 3);
      mug(ctx, ax + ss * 0.1, y - ss * (0.85 + 0.45 * up) * 1.0, ss);
    }
    const slide = 1 - smooth(O.t / 1.4);
    ctx.save(); ctx.translate(V.cx - slide * V.w * 0.6, floorY + s * 0.05);
    ctx.fillStyle = '#a8743a'; rr(ctx, -0.6 * s, -0.22 * s, 1.2 * s, 0.14 * s, 0.04 * s);
    ctx.strokeStyle = '#7a5634'; ctx.lineWidth = 0.05 * s; ctx.beginPath(); ctx.moveTo(-0.65 * s, 0); ctx.lineTo(0.55 * s, 0); ctx.quadraticCurveTo(0.75 * s, 0, 0.7 * s, -0.2 * s); ctx.stroke();
    bearFront(ctx, 0, -0.18 * s, s * 0.95, { t, wave: O.t > 1.2, smile: true });
    ctx.restore();
    const r = g.once.olymp.sled;
    if (r && O.t > 1) {
      ctx.globalAlpha = a * clamp((O.t - 1) * 2, 0, 1);
      const w = min(V.w - 40, 300 * k), wide = V.w > 700, x0 = (wide ? V.w * 0.27 : V.cx) - w / 2, y0 = V.top + V.h * (wide ? 0.24 : 0.36);
      ctx.fillStyle = '#1e2a22'; rr(ctx, x0, y0, w, 70 * k, 6 * k);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 5 * k; ctx.strokeRect(x0, y0, w, 70 * k);
      txt(ctx, ZS.LABELS.olymp.hud.sane + ' · ' + ZS.LABELS.olymp.hud.finish, x0 + w / 2, y0 + 18 * k, 12 * k, 'rgba(255,255,255,0.8)', 700, 'center', w - 20);
      txt(ctx, clock(r.time) + '  ·  ' + ZS.LABELS.olymp.hud.rank(r.rank), x0 + w / 2, y0 + 46 * k, 20 * k, '#fff', 800, 'center', w - 20);
      ZS.gfx.label(ctx, ZS.LABELS.olymp.bar.cheer, V.cx, V.top + V.h * 0.5, 18 * k, '#c2410c', 800, V.w - 40);
    }
    ctx.restore();
  }

  function bearFront(ctx, x, y, s, o) {
    const FUR = F().FUR, FUR2 = F().FUR2, MUZ = F().MUZ, S = F().SUIT, t = o.t;
    ctx.save(); ctx.translate(x, y);
    for (const sd of [-1, 1]) { ctx.fillStyle = S.navy; ctx.fillRect(sd * 0.1 * s - 0.1 * s, -0.75 * s, 0.2 * s, 0.7 * s); ctx.fillStyle = '#e9ecf0'; rr(ctx, sd * 0.12 * s - 0.13 * s, -0.12 * s, 0.26 * s, 0.14 * s, 0.04 * s); }
    ctx.fillStyle = S.white; rr(ctx, -0.48 * s, -1.42 * s, 0.96 * s, 0.8 * s, 0.32 * s);
    ctx.fillStyle = S.blue; ctx.fillRect(-0.48 * s, -1.08 * s, 0.96 * s, 0.13 * s);
    ctx.fillStyle = S.red; ctx.fillRect(-0.48 * s, -0.95 * s, 0.96 * s, 0.08 * s);
    ctx.fillStyle = '#fff'; rr(ctx, -0.22 * s, -0.86 * s, 0.44 * s, 0.24 * s, 0.03 * s);
    F().text(ctx, '7', 0, -0.74 * s, 0.18 * s, '#111', 900);
    const wave = o.wave ? sin(t * 6) * 0.35 : 0;
    ctx.save(); ctx.translate(-0.45 * s, -1.32 * s); ctx.rotate(o.wave ? -2.4 + wave : 0.25);
    ctx.fillStyle = S.white; rr(ctx, -0.09 * s, 0, 0.18 * s, 0.55 * s, 0.09 * s); ctx.fillStyle = FUR2; circle(ctx, 0, 0.58 * s, 0.1 * s);
    ctx.restore();
    ctx.save(); ctx.translate(0.45 * s, -1.32 * s); ctx.rotate(o.honey ? -1.1 : -0.25);
    ctx.fillStyle = S.white; rr(ctx, -0.09 * s, 0, 0.18 * s, 0.55 * s, 0.09 * s); ctx.fillStyle = FUR2; circle(ctx, 0, 0.58 * s, 0.1 * s);
    if (o.honey) { ctx.fillStyle = '#c98a2b'; rr(ctx, -0.14 * s, 0.6 * s, 0.28 * s, 0.26 * s, 0.06 * s); ctx.fillStyle = '#f2c230'; ctx.fillRect(-0.14 * s, 0.64 * s, 0.28 * s, 0.05 * s); ctx.fillStyle = '#7a4a1a'; ctx.fillRect(-0.1 * s, 0.56 * s, 0.2 * s, 0.05 * s); }
    ctx.restore();
    if (o.medal) {
      const col = o.medal === 'gold' ? '#f5c518' : o.medal === 'silver' ? '#d9dde3' : '#cd7f32';
      ctx.strokeStyle = '#0b4ea2'; ctx.lineWidth = 0.06 * s; ctx.beginPath(); ctx.moveTo(-0.18 * s, -1.42 * s); ctx.lineTo(0, -0.98 * s); ctx.lineTo(0.18 * s, -1.42 * s); ctx.stroke();
      ctx.fillStyle = col; circle(ctx, 0, -0.92 * s, 0.13 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(ctx, -0.04 * s, -0.96 * s, 0.04 * s);
    }
    const hy = -1.68 * s, hr = 0.3 * s;
    for (const sd of [-1, 1]) { ctx.fillStyle = FUR2; circle(ctx, sd * hr * 0.88, hy - hr * 0.62, hr * 0.32); ctx.fillStyle = MUZ; circle(ctx, sd * hr * 0.88, hy - hr * 0.62, hr * 0.16); }
    ctx.fillStyle = FUR; circle(ctx, 0, hy, hr);
    ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(0, hy - hr * 0.1, hr * 1.04, PI * 1.08, PI * 1.92); ctx.closePath(); ctx.fill();
    F().goggles(ctx, 0, hy - hr * 0.62, hr * 1.3, hr * 0.42);
    ctx.fillStyle = '#1d1209'; circle(ctx, -hr * 0.36, hy - hr * 0.08, hr * 0.09); circle(ctx, hr * 0.36, hy - hr * 0.08, hr * 0.09);
    ctx.fillStyle = MUZ; ell(ctx, 0, hy + hr * 0.38, hr * 0.48, hr * 0.34);
    ctx.fillStyle = '#1d1209'; ell(ctx, 0, hy + hr * 0.22, hr * 0.17, hr * 0.11);
    ctx.strokeStyle = '#1d1209'; ctx.lineWidth = max(1, 0.025 * s); ctx.beginPath(); ctx.moveTo(-hr * 0.18, hy + hr * 0.52); ctx.quadraticCurveTo(0, hy + hr * (o.smile ? 0.68 : 0.58), hr * 0.18, hy + hr * 0.52); ctx.stroke();
    ctx.restore();
  }

  function rival(ctx, x, y, s, nat, t, seed) {
    const c = NAT[nat] || NAT.AUT;
    F().person(ctx, x, y, s, { h: 1.78, jacket: c[0] === '#ffffff' ? c[1] : c[0], hat: '#f4f4f4', t, seed, cheer: 0.5, pants: '#1b1f2a' });
  }

  function hunter(ctx, x, y, s, t, walk) {
    const step = walk ? sin(t * 8) : 0;
    ctx.save(); ctx.translate(x, y);
    for (const sd of [-1, 1]) { ctx.fillStyle = '#3f4a2c'; ctx.fillRect(sd * 0.12 * s - 0.08 * s + sd * step * 0.04 * s, -0.8 * s, 0.16 * s, 0.78 * s); ctx.fillStyle = '#3a2412'; rr(ctx, sd * 0.12 * s - 0.11 * s + sd * step * 0.04 * s, -0.08 * s, 0.22 * s, 0.1 * s, 0.03 * s); }
    ctx.fillStyle = '#4c5a36'; rr(ctx, -0.36 * s, -1.5 * s, 0.72 * s, 0.75 * s, 0.18 * s);
    ctx.fillStyle = '#f7f8fa'; ctx.beginPath(); ctx.moveTo(-0.42 * s, -1.5 * s); ctx.lineTo(-0.1 * s, -1.5 * s); ctx.lineTo(-0.06 * s, -0.55 * s); ctx.lineTo(-0.48 * s, -0.55 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.42 * s, -1.5 * s); ctx.lineTo(0.1 * s, -1.5 * s); ctx.lineTo(0.06 * s, -0.55 * s); ctx.lineTo(0.48 * s, -0.55 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 0.05 * s; ctx.beginPath(); ctx.moveTo(-0.3 * s, -1.48 * s); ctx.lineTo(0.32 * s, -0.7 * s); ctx.stroke();
    ctx.fillStyle = '#4a3020'; ctx.save(); ctx.rotate(0.55); ctx.fillRect(-0.05 * s, -1.9 * s, 0.07 * s, 1.0 * s); ctx.restore();
    ctx.fillStyle = '#f7f8fa'; rr(ctx, -0.55 * s, -1.42 * s, 0.17 * s, 0.6 * s, 0.08 * s);
    ctx.save(); ctx.translate(0.46 * s, -1.4 * s); ctx.rotate(-0.9);
    ctx.fillStyle = '#f7f8fa'; rr(ctx, -0.08 * s, 0, 0.17 * s, 0.55 * s, 0.08 * s);
    ctx.fillStyle = '#f0c8a8'; circle(ctx, 0, 0.6 * s, 0.08 * s);
    ctx.fillStyle = 'rgba(220,235,250,0.9)'; rr(ctx, -0.07 * s, 0.62 * s, 0.14 * s, 0.18 * s, 0.03 * s);
    ctx.restore();
    ctx.fillStyle = '#f0c8a8'; circle(ctx, 0, -1.68 * s, 0.2 * s);
    ctx.fillStyle = '#6a4a2c'; ell(ctx, 0, -1.6 * s, 0.14 * s, 0.05 * s);
    ctx.fillStyle = '#1d1209'; circle(ctx, -0.07 * s, -1.72 * s, 0.025 * s); circle(ctx, 0.07 * s, -1.72 * s, 0.025 * s);
    ctx.fillStyle = '#2f3b24'; ell(ctx, 0, -1.83 * s, 0.32 * s, 0.07 * s); rr(ctx, -0.18 * s, -2.02 * s, 0.36 * s, 0.2 * s, 0.07 * s);
    ctx.fillStyle = '#8a3a2a'; ctx.fillRect(-0.18 * s, -1.9 * s, 0.36 * s, 0.04 * s);
    ctx.strokeStyle = '#2b5a3a'; ctx.lineWidth = 0.03 * s; ctx.beginPath(); ctx.moveTo(0.14 * s, -1.95 * s); ctx.quadraticCurveTo(0.3 * s, -2.2 * s, 0.22 * s, -2.32 * s); ctx.stroke();
    ctx.restore();
  }

  function ceremony(ctx, g, O, V) {
    const t = V.t, k = clamp(V.k, 0.6, 1.5), med = g.medal || 'bronze', L = ZS.LABELS.olymp.ceremony;
    const gr = ctx.createLinearGradient(0, V.top, 0, V.bot);
    gr.addColorStop(0, '#1d2a5a'); gr.addColorStop(0.5, '#6b5a8f'); gr.addColorStop(0.8, '#e3a07a'); gr.addColorStop(1, '#f2c7a2');
    ctx.fillStyle = gr; ctx.fillRect(-10, V.top - 10, V.w + 20, V.h + 20);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * sin(t * 2 + i)).toFixed(3) + ')'; circle(ctx, hash(i * 3.1) * V.w, V.top + hash(i * 7.7) * V.h * 0.35, 1 + hash(i) * 1.2); }
    const tall = V.h > V.w * 1.2, base = V.top + V.h * (tall ? 0.5 : 0.62);
    ctx.fillStyle = '#4a5a86';
    ctx.beginPath(); ctx.moveTo(-10, base);
    for (let x = -10; x <= V.w + 10; x += 10) { const u = x / V.w; ctx.lineTo(x, base - (40 + 50 * sin(u * 9 + 1) * 0.5 + 60 * Math.pow(abs(sin(u * 5.3)), 3)) * k); }
    ctx.lineTo(V.w + 10, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8eef6'; ctx.fillRect(-10, base, V.w + 20, V.bot - base + 10);
    const s = min(V.h * 0.17, V.w * 0.2) / 1.9 * (tall ? 1.2 : 1), cx = V.cx, py = V.top + V.h * (tall ? 0.66 : 0.82);
    ctx.save(); ctx.globalAlpha = 0.85; F().bar(ctx, V.w * (tall ? 0.82 : 0.85), base + s * 0.4, s * (tall ? 0.28 : 0.45), t, 0); ctx.restore();
    for (let i = 0; i < 2; i++) {
      const bx0 = V.w * (0.2 + i * 0.6), sw = sin(t * 0.6 + i * 2) * 0.25;
      const beam = ctx.createLinearGradient(bx0, V.bot, bx0, V.top);
      beam.addColorStop(0, 'rgba(255,240,200,0.22)'); beam.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(bx0 - 10, V.bot); ctx.lineTo(bx0 + 10, V.bot); ctx.lineTo(bx0 + V.h * (sw + 0.18), V.top); ctx.lineTo(bx0 + V.h * (sw - 0.18), V.top); ctx.closePath(); ctx.fill();
    }
    const steps = { 1: [cx, 0.62], 2: [cx - 1.25 * s * 1.15, 0.42], 3: [cx + 1.25 * s * 1.15, 0.3] };
    const myPlace = med === 'gold' ? 1 : med === 'silver' ? 2 : 3;
    const others = [1, 2, 3].filter((p) => p !== myPlace), nats = ['AUT', 'SUI'];
    for (const p of [1, 2, 3]) {
      const [x, hh] = steps[p], bw = 1.15 * s * 1.1, bh = hh * s * 1.6;
      ctx.fillStyle = p === 1 ? '#f2f2f2' : '#e0e4ea'; ctx.fillRect(x - bw / 2, py - bh, bw, bh);
      ctx.fillStyle = '#0b4ea2'; ctx.fillRect(x - bw / 2, py - bh, bw, 0.08 * s);
      txt(ctx, String(p), x, py - bh / 2 + 0.05 * s, 0.5 * s, '#1b2333', 900);
    }
    const phase = O.phase, tt = O.t;
    others.forEach((p, i) => { const [x, hh] = steps[p]; rival(ctx, x, py - hh * s * 1.6, s, nats[i], t, i + 2); });
    const [bx, bh] = steps[myPlace];
    const doping = phase === 'doping';
    bearFront(ctx, bx, py - bh * s * 1.6, s, { t, medal: med, wave: !doping, honey: doping && tt > 1.2, smile: true });
    for (let i = 0; i < 3; i++) {
      const p = [2, 1, 3][i], fx = cx + (i - 1) * 1.4 * s, top = V.top + V.h * 0.03 + topOff(g, V) + 92 * k, rise = phase === 'podium' ? smooth(tt / 6) : 1;
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(fx - 1, top, 2, py - top - 2.2 * s);
      const nat = p === myPlace ? 'SVK' : nats[others.indexOf(p)];
      const fy = lerp(py - 2.6 * s, top + 4, p === 1 ? rise : rise * 0.92);
      flag(ctx, nat, fx + 1, fy, 0.7 * s, 0.46 * s);
    }
    if (phase === 'podium') {
      for (let i = 0; i < 40; i++) {
        const u = (t * (0.15 + hash(i) * 0.1) + hash(i * 3.3)) % 1, x = hash(i * 9.1) * V.w + sin(t * 2 + i) * 20, y = V.top + u * V.h;
        ctx.fillStyle = ['#ffd84a', '#ff5a5a', '#5ad1ff', '#7cff7a', '#ffffff'][i % 5];
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i); ctx.fillRect(-3 * k, -1.5 * k, 6 * k, 3 * k); ctx.restore();
      }
      for (let i = 0; i < 4; i++) { const u = (t * 0.4 + i / 4) % 1; ctx.globalAlpha = 1 - u; txt(ctx, i % 2 ? '♪' : '♫', cx - 2.5 * s + i * 1.6 * s, V.top + V.h * 0.45 - u * V.h * 0.2, 22 * k, '#fff', 700); ctx.globalAlpha = 1; }
    }
    const n = max(6, floor(V.w / (34 * k)));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * V.w / n, sd = i * 5.3, hb = abs(sin(t * 5 + sd)) * 4 * k;
      ctx.fillStyle = F().JACKETS[i % F().JACKETS.length]; rr(ctx, x - 13 * k, V.bot - 34 * k - hb, 26 * k, 40 * k, 9 * k);
      if (i % 3 === 1) {
        const fur = ['#7a4a26', '#a8743f', '#4f2f1a'][i % 3 === 1 ? (i >> 1) % 3 : 0], hy = V.bot - 42 * k - hb;
        ctx.fillStyle = fur; circle(ctx, x - 7 * k, hy - 7 * k, 4 * k); circle(ctx, x + 7 * k, hy - 7 * k, 4 * k); circle(ctx, x, hy, 10 * k);
        ctx.fillStyle = '#c4935e'; ell(ctx, x, hy + 3.5 * k, 5 * k, 3.6 * k);
        ctx.fillStyle = '#1d1209'; ell(ctx, x, hy + 2 * k, 1.8 * k, 1.2 * k); circle(ctx, x - 3.6 * k, hy - 1.5 * k, 1 * k); circle(ctx, x + 3.6 * k, hy - 1.5 * k, 1 * k);
      } else {
        ctx.fillStyle = '#f0c8a8'; circle(ctx, x, V.bot - 40 * k - hb, 8 * k);
        ctx.fillStyle = F().HATS[i % F().HATS.length]; ell(ctx, x, V.bot - 45 * k - hb, 9 * k, 6 * k);
      }
      if (i % 4 === 1) F().flag(ctx, x + 10 * k, V.bot - 60 * k - hb, 24 * k, t + i);
    }
    const fan = s * 0.62, gasp = doping && tt > 2 ? 1 : 0;
    for (const sd of [-1, 1]) {
      const fx = cx + sd * (tall ? 2.25 : 3.3) * s * 1.15;
      if (fx < fan * 1.2 || fx > V.w - fan * 1.2) continue;
      F().bears(ctx, fx, py + 0.05 * s, fan, { n: tall ? 2 : 3, seed: sd > 0 ? 61 : 11, label: 'SVK!' }, t, phase === 'podium' ? 1 : 0.6, gasp);
    }
    const title = L.title, medName = L[med];
    ctx.fillStyle = 'rgba(12,18,32,0.75)'; rr(ctx, cx - min(V.w - 24, 360 * k) / 2, V.top + V.h * 0.03 + topOff(g, V), min(V.w - 24, 360 * k), 62 * k, 12 * k);
    txt(ctx, title, cx, V.top + V.h * 0.03 + topOff(g, V) + 18 * k, 12 * k, 'rgba(255,255,255,0.8)', 700, 'center', V.w - 40);
    txt(ctx, (med === 'gold' ? '🥇 ' : med === 'silver' ? '🥈 ' : '🥉 ') + medName + ' · ' + ZS.LABELS.olymp.hud.you, cx, V.top + V.h * 0.03 + topOff(g, V) + 42 * k, 20 * k, med === 'gold' ? GOLD : '#fff', 900, 'center', V.w - 40);
    if (doping) {
      const walk = clamp(tt / 1.0, 0, 1), hx = lerp(V.w + s, bx + 0.8 * s, smooth(walk)), hy = py + 0.4 * s;
      hunter(ctx, hx, hy, s * 1.05, t, walk < 1);
      if (tt > 0.45 && tt < 1.6) ZS.render.props.bubble(ctx, hx + 0.6 * s, hy - 2.6 * s, L.doping, min(1, 1.6 - tt) * 3, 8, V.w - 8);
      if (tt > 1.4 && tt < 2.6) ZS.render.props.bubble(ctx, bx - 0.5 * s, py - bh * s * 1.6 - 2.3 * s, L.honey, min(1, 2.6 - tt) * 3, 8, V.w - 8);
      if (tt > 2.0) {
        const f = clamp(1 - (tt - 2.0) * 3, 0, 1);
        if (f > 0) { ctx.fillStyle = 'rgba(255,255,255,' + f.toFixed(3) + ')'; ctx.fillRect(-10, V.top - 10, V.w + 20, V.h + 20); }
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 6 * k; ctx.strokeRect(10 * k, V.top + 10 * k, V.w - 20 * k, V.h - 20 * k);
        ctx.fillStyle = '#c0392b'; rr(ctx, 18 * k, V.bot - 70 * k, 150 * k, 26 * k, 4 * k);
        txt(ctx, 'STRACH 24 · ' + ZS.LABELS.olymp.sign.live, 18 * k + 75 * k, V.bot - 57 * k, 12 * k, '#fff', 900, 'center', 140 * k);
        if (tt > 2.4) ZS.render.props.bubble(ctx, hx + 0.7 * s, hy - 3.1 * s, L.notice, 3, 8, V.w - 8);
      }
    }
  }

  function topOff(g, V) { return (g.touch && V.h > V.w ? 70 : 34) * px(V); }

  ZS.olympHud = { draw, clock, ceremony, barScene, flag, arms, bearFront, hunter };
})();
