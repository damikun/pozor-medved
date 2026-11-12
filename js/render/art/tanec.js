(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
  const { circle, ellipse: ell, rrect: rr, label } = ZS.gfx;
  const { hash, clamp, lerp, frac, sstep, smooth } = ZS.util;
  const API = (ZS.tanecArt = {});
  const SIM = () => ZS.sim.tanec;
  const T = () => LABELS.tanec;
  const CODE = { L: 'ArrowLeft', R: 'ArrowRight', D: 'ArrowDown', U: 'ArrowUp', C: 'KeyC' };
  const TINT = { L: '#4dabf7', R: '#4dabf7', D: '#f2c230', U: '#51cf66', C: '#ff6b9a' };
  const RES = { perfect: '#51cf66', good: '#f2c230', miss: '#ff6b6b', wrong: '#ff6b6b' };
  const SHOW = { x: 0, y: 0, k: 1 };

  function text(ctx, s, x, y, size, col, w, weight) {
    ctx.fillStyle = col; ctx.font = (weight || 800) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y, w);
  }

  function view(g, viewW) {
    const W = viewW, H = g.viewH || 540, s = clamp(min(W / 1000, H / 560), 0.86, 1.5);
    const flat = g.touch && W > H && H < 500, floor = H * (flat ? 0.6 : H > W * 1.1 ? 0.62 : 0.68), cx = W * 0.5;
    return { W, H, s, floor, cx, flat, k: (flat ? 1.0 : 1.3) * s };
  }

  function backdrop(ctx, g, V, c) {
    const { W, H, floor } = V, t = g.time, out = SIM().outage(c) && !c.pointa;
    const gr = ctx.createLinearGradient(0, 0, 0, floor);
    gr.addColorStop(0, '#141a3a'); gr.addColorStop(0.6, '#3a3a6a'); gr.addColorStop(1, '#c9785a');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, floor);
    ctx.fillStyle = 'rgba(255,255,240,0.7)';
    for (let i = 0; i < 40; i++) circle(ctx, hash(i * 3.1) * W, hash(i * 5.7) * floor * 0.5, 0.6 + hash(i) * 0.8);
    const kx = W * 0.68, base = floor - 60 * V.s;
    ctx.fillStyle = '#2a2f52';
    ctx.beginPath(); ctx.moveTo(-10, base);
    for (let x = -10; x <= W + 10; x += 10) {
      const d = x - kx, kr = d < 0 ? max(0, 1 + d / (260 * V.s)) : max(0, 1 - d / (320 * V.s));
      const h = 50 * V.s + 30 * V.s * sin(x * 0.013) + 230 * V.s * Math.pow(kr, d < 0 ? 1.5 : 1.2);
      ctx.lineTo(x, base - h);
    }
    ctx.lineTo(W + 10, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,230,0.5)';
    ctx.beginPath(); ctx.moveTo(kx, base - 280 * V.s); ctx.lineTo(kx + 16 * V.s, base - 230 * V.s); ctx.lineTo(kx + 4 * V.s, base - 236 * V.s); ctx.lineTo(kx - 10 * V.s, base - 220 * V.s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d2a28';
    ctx.beginPath(); ctx.moveTo(-10, floor);
    for (let x = -10; x <= W + 10; x += 14) ctx.lineTo(x, base + 10 * V.s - 14 * V.s * abs(sin(x * 0.09)) - 6 * V.s * hash(Math.floor(x / 14)));
    ctx.lineTo(W + 10, floor); ctx.closePath(); ctx.fill();
    const roofY = floor - 300 * V.s;
    ctx.fillStyle = '#4a2a14';
    ctx.beginPath(); ctx.moveTo(-20, roofY + 40 * V.s); ctx.quadraticCurveTo(W / 2, roofY - 70 * V.s, W + 20, roofY + 40 * V.s); ctx.lineTo(W + 20, roofY + 64 * V.s); ctx.quadraticCurveTo(W / 2, roofY - 40 * V.s, -20, roofY + 64 * V.s); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 22; k++) { const u = k / 21, x = u * W, y = roofY + 52 * V.s - sin(u * PI) * 106 * V.s; ctx.fillStyle = ['#c4262e', '#f2c230', '#2f9e44', '#f7f3ea'][k % 4]; circle(ctx, x, y + 14 * V.s, 4 * V.s); }
    ctx.fillStyle = '#6a4024';
    for (const px of [W * 0.06, W * 0.94]) ctx.fillRect(px - 9 * V.s, roofY + 40 * V.s, 18 * V.s, floor - roofY);
    const flick = out && c.song - SIM().CHART.parts[2].from < 0.5 ? (frac(t * 12) < 0.5 ? 0.4 : 1) : 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, col] of [[W * 0.2, '255,230,170'], [W * 0.5, '255,240,210'], [W * 0.8, '255,200,170']]) {
      const g2 = ctx.createLinearGradient(0, roofY, 0, floor);
      g2.addColorStop(0, 'rgba(' + col + ',' + (0.2 * flick * (out ? 0.55 : 1)).toFixed(3) + ')'); g2.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(x - 10, roofY + 50 * V.s); ctx.lineTo(x - 160 * V.s, floor); ctx.lineTo(x + 160 * V.s, floor); ctx.lineTo(x + 10, roofY + 50 * V.s); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function stage(ctx, g, V) {
    const { W, H, floor, s } = V;
    ctx.fillStyle = '#a8784a'; ctx.fillRect(0, floor - 4, W, 30 * s);
    ctx.fillStyle = 'rgba(60,36,18,0.35)'; for (let x = 0; x < W; x += 26 * s) ctx.fillRect(x, floor - 4, 1.4, 30 * s);
    ctx.fillStyle = '#6a4024'; ctx.fillRect(0, floor + 26 * s, W, 40 * s);
    for (let k = 0; k < 18; k++) { if (abs((k + 0.5) / 18 - 0.5) < 0.17) continue; ctx.fillStyle = ['#c4262e', '#f2c230', '#2f9e44'][k % 3]; circle(ctx, (k + 0.5) * W / 18, floor + 44 * s, 4 * s); }
    ctx.fillStyle = '#f7f3ea'; rr(ctx, W / 2 - 150 * s, floor + 32 * s, 300 * s, 24 * s, 5 * s);
    text(ctx, T().board.stage + ' · ' + T().board.ensemble, W / 2, floor + 44.5 * s, 13 * s, '#5a1f24', 290 * s);
    ctx.fillStyle = '#1a1612'; ctx.fillRect(0, floor + 66 * s, W, H - floor);
  }

  function band(ctx, g, V, c) {
    const t = g.time, s = V.s, y = V.floor, beat = SIM().beatOf(c), pt = c.phase === 'play' && !c.pointa ? max(0, beat * 0.5) : t;
    const out = SIM().outage(c);
    const tall = V.H > V.W * 1.1, gap = tall ? [0.1, 0.22] : [0.27, 0.36];
    const L = [['cimbal', 0.5 - gap[1], 3, 1], ['fiddle', 0.5 - gap[0], 1, 1], ['fiddle', 0.5 + gap[0], 2, -1], ['bass', 0.5 + gap[1], 0, -1]];
    for (const [instr, u, look, dir] of L) ZS.folk.figure(ctx, { x: V.W * u, y, dir, sex: 'm', look, seed: look * 1.7, scale: 1.12 * s, pose: instr === 'cimbal' ? 'sit' : 'stand', instr, t: pt + look * 0.13 }, t);
    for (const [x, side] of [[V.W * 0.04, 1], [V.W * 0.96, -1]]) {
      ctx.fillStyle = '#1c1c1e'; rr(ctx, x - 18 * s, V.floor - 120 * s, 36 * s, 110 * s, 4 * s);
      ctx.fillStyle = '#3a3a3e'; circle(ctx, x, V.floor - 96 * s, 11 * s); circle(ctx, x, V.floor - 52 * s, 13 * s);
      if (out && !c.pointa) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x - 12 * s, V.floor - 108 * s); ctx.lineTo(x + 12 * s, V.floor - 84 * s); ctx.moveTo(x + 12 * s, V.floor - 108 * s); ctx.lineTo(x - 12 * s, V.floor - 84 * s); ctx.stroke(); }
      else if (c.phase === 'play') { const p = 1 + 0.08 * max(0, 1 - frac(max(0, beat)) * 3); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, V.floor - 52 * s, 13 * s * p + 4, 0, TAU); ctx.stroke(); }
    }
  }

  function jury(ctx, g, V, c) {
    if (V.flat || g.touch) return;
    const s = V.s, x = V.W * 0.83, y = V.floor + 120 * s, t = g.time;
    for (let i = 0; i < 3; i++) ZS.folk.figure(ctx, { x: x - 50 * s + i * 50 * s, y: y + 20 * s, dir: -1, sex: 'civ', look: [7, 2, 3][i], seed: 20 + i, scale: 1.05 * s, pose: c.pointa && c.pointa.t > 0.5 ? 'clap' : 'stand', t }, t);
    ctx.fillStyle = '#6a4024'; ctx.fillRect(x - 90 * s, y - 20 * s, 180 * s, 60 * s);
    ctx.fillStyle = '#c4262e'; ctx.fillRect(x - 90 * s, y - 20 * s, 180 * s, 8 * s);
    text(ctx, T().jury, x, y + 12 * s, 14 * s, '#f7f3ea', 170 * s);
  }

  function crowd(ctx, g, V, c) {
    const { W, H, s, floor } = V, t = g.time, out = SIM().outage(c), clap = out || (c.pointa && c.pointa.t > 0.4) || c.cheer > 0.2;
    const beat = c.phase === 'play' ? SIM().beatOf(c) : t * 2;
    for (let r = 0; r < 3; r++) {
      const y = floor + (96 + r * 46) * s, sc = (1.1 + r * 0.25) * s;
      for (let x = (r % 2) * 22 * s; x < W * 0.68; x += 44 * s) {
        const n = Math.floor(x / (44 * s)) + r * 31;
        if (y > H + 30) continue;
        const level = out ? 1 : c.pointa ? clamp((c.pointa.t - 0.4) / 0.6, 0, 1) : c.cheer;
        const me = clap && hash(n * 3.7) < 0.75 && level > 0.2 + hash(n * 5.1) * 0.5, tempo = 0.85 + hash(n * 7.3) * 0.3;
        const bob = me ? -abs(sin((beat * tempo + hash(n)) * PI)) * 3 : sin(t * (0.8 + hash(n * 9.1)) + n) * 0.8, lit = !me && hash(n * 1.7) < 0.3;
        ZS.folk.head(ctx, x + hash(n) * 10, y + bob, sc, Math.floor(hash(n * 2.3) * 9), t, n, lit);
        if (me) {
          const u = abs(sin((beat * tempo + hash(n)) * PI)), hy = y - 25 * sc + bob, hx = x + hash(n) * 10;
          ctx.fillStyle = ZS.folk.SKIN[n % 6];
          circle(ctx, hx - (1.5 + 4 * u) * sc, hy, 2.6 * sc); circle(ctx, hx + (1.5 + 4 * u) * sc, hy, 2.6 * sc);
        }
      }
    }
  }

  function valaska(ctx, V, x, show) {
    if (show <= 0) return;
    const s = V.s, y = V.floor + 2;
    ctx.globalAlpha = show;
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.08);
    ctx.fillStyle = '#7a5030'; ctx.fillRect(-34 * s, -3 * s, 62 * s, 5 * s);
    ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.moveTo(28 * s, -8 * s); ctx.lineTo(40 * s, -6 * s); ctx.lineTo(38 * s, 5 * s); ctx.lineTo(28 * s, 3 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d6ab42'; for (let k = 0; k < 5; k++) ctx.fillRect(-28 * s + k * 10 * s, -3 * s, 2 * s, 5 * s);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function bear(ctx, g, V, c) {
    const b = g.bear, k = V.k;
    SHOW.x = V.cx + (b.x - 470) * k * 0.9; SHOW.y = V.floor; SHOW.k = k;
    const lively = c.song >= SIM().CHART.parts[1].from || c.pointa;
    valaska(ctx, V, SHOW.x + 4 * V.s, lively ? 1 : 0);
    ctx.save();
    ctx.translate(SHOW.x - b.x * k, SHOW.y - GY * k);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, b.x, GY + 2, 40 - (GY - b.y) * 0.1, 6);
    ctx.globalAlpha = b.inv > 0 ? 0.55 + 0.35 * cos(g.time * 14) : 1;
    ZS.drawBear(ctx, b, g.time);
    ZS.drawBearHugFront(ctx, b, g.time);
    ctx.globalAlpha = 1;
    if (c.toss !== undefined && g.time - c.toss < 1.1) {
      const u = (g.time - c.toss) / 1.1, vx = b.x + 4, vy = b.y - 70 - 160 * 4 * u * (1 - u);
      ctx.save(); ctx.translate(vx, vy); ctx.rotate(u * 14);
      ctx.fillStyle = '#6a4024'; ctx.fillRect(-22, -2, 44, 4); ctx.fillStyle = '#d6d9dd'; ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(28, -9); ctx.lineTo(30, 5); ctx.lineTo(18, 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (c.named && g.time - c.named.at < 0.7 && c.phase === 'play' && !c.pointa) {
      const u = (g.time - c.named.at) / 0.7, name = T().moves[c.named.k] + '!';
      ctx.globalAlpha = 1 - u * u;
      ctx.font = '900 ' + 16 * V.s + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4 * V.s; ctx.strokeStyle = 'rgba(30,14,18,0.85)'; ctx.strokeText(name, SHOW.x, SHOW.y - 190 * V.s - u * 14 * V.s);
      ctx.fillStyle = '#ffe08a'; ctx.fillText(name, SHOW.x, SHOW.y - 190 * V.s - u * 14 * V.s);
      ctx.globalAlpha = 1;
    }
  }

  function lane(V) {
    const s = V.s, tall = V.H > V.W * 1.1, top = tall ? V.H * 0.2 : 18 * s, y = top + 40 * s, h = 62 * s;
    const x0 = tall ? 52 * s : max(V.W * 0.16, V.flat ? 230 : 90), x1 = V.W - (tall ? 18 : 120);
    return { y, h, x0, x1, mid: y + h / 2 };
  }

  function cues(ctx, g, V, c) {
    if (c.phase !== 'play' || c.pointa) return;
    const P = SIM(), s = V.s, R = lane(V), out = P.outage(c), beat = P.beatOf(c), pulse = 1 - frac(max(0, beat));
    const speed = (R.x1 - R.x0) / P.LEAD, r = 24 * s;
    ctx.fillStyle = 'rgba(20,14,24,0.62)'; rr(ctx, R.x0 - 44 * s, R.y, R.x1 - R.x0 + 44 * s, R.h, R.h / 2);
    ctx.strokeStyle = 'rgba(255,240,200,0.18)'; ctx.lineWidth = 1;
    const p = P.part(c);
    for (let k = Math.ceil(beat); ; k++) {
      const bx = R.x0 + (p.play + k * p.beat - c.song) * speed;
      if (bx > R.x1) break;
      if (bx < R.x0) continue;
      ctx.beginPath(); ctx.moveTo(bx, R.y + 8 * s); ctx.lineTo(bx, R.y + R.h - 8 * s); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,240,200,' + (0.12 + 0.2 * pulse).toFixed(3) + ')'; circle(ctx, R.x0, R.mid, r + 6 * s + pulse * 3 * s);
    ctx.strokeStyle = '#fff4d6'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(R.x0, R.mid, r + 4 * s, 0, TAU); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(R.x0 - r - 8 * s, R.y, R.x1 - R.x0 + r + 8 * s, R.h); ctx.clip();
    for (let i = c.notes.length - 1; i >= 0; i--) {
      const n = c.notes[i], dt = n.t - c.song;
      if (dt > P.LEAD + 0.2 || (n.res && n.res !== 'miss' && n.res !== 'wrong') || dt < -0.4) continue;
      const x = R.x0 + dt * speed, a = n.res ? 0.35 : out ? 0.55 + 0.45 * pulse : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = TINT[n.k]; circle(ctx, x, R.mid, r);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, R.mid, r, 0, TAU); ctx.stroke();
      ZS.prompt.draw(ctx, g, [[CODE[n.k], '']], x, R.mid, { a, size: 15 * s });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    const first = c.notes.find((n) => !n.res && n.t - c.song > -P.WIN.good);
    if (first && first.teach && first.t - c.song < P.LEAD) {
      const x = R.x0 + (first.t - c.song) * speed;
      ctx.font = '800 ' + 12 * s + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(20,14,24,0.9)'; ctx.strokeText(T().moves[first.k], x, R.y + R.h + 12 * s);
      ctx.fillStyle = TINT[first.k]; ctx.fillText(T().moves[first.k], x, R.y + R.h + 12 * s);
    }
    for (const f of c.fx) {
      const u = f.t / 0.7;
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = RES[f.res]; ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.arc(R.x0, R.mid, (r + 6 * s) + u * 26 * s, 0, TAU); ctx.stroke();
      if (f !== c.fx[c.fx.length - 1]) { ctx.globalAlpha = 1; continue; }
      ctx.font = '900 ' + 15 * s + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(20,14,24,0.9)'; ctx.strokeText(T().judge[f.res], R.x0, R.y + R.h + 14 * s + u * 10 * s);
      ctx.fillStyle = RES[f.res]; ctx.fillText(T().judge[f.res], R.x0, R.y + R.h + 14 * s + u * 10 * s);
      ctx.globalAlpha = 1;
    }
  }

  function meter(ctx, g, V, c) {
    if (c.phase !== 'play' && c.phase !== 'enter') return;
    const s = V.s, w = min(240 * s, V.W * 0.5), x = V.cx - w / 2, y = max(16, V.H > V.W * 1.1 ? V.H * 0.2 : 18 * s), m = c.meter / 100;
    ctx.fillStyle = 'rgba(20,14,24,0.7)'; rr(ctx, x, y, w, 22 * s, 11 * s);
    const col = m > 0.6 ? '#51cf66' : m > 0.3 ? '#f2c230' : '#ff6b6b';
    ctx.fillStyle = col; rr(ctx, x + 3 * s, y + 3 * s, (w - 6 * s) * m, 16 * s, 8 * s);
    const done = c.notes.filter((n) => !n.teach && n.res), pts = done.reduce((a, n) => a + (n.res === 'perfect' ? 100 : n.res === 'good' ? 60 : 0), 0);
    const pct = done.length ? Math.round(pts / done.length) : 100;
    const label = '🐻 ' + T().meter + ' · ' + T().score(pct) + (c.combo >= 4 ? '  ×' + c.combo : '');
    ctx.font = '800 ' + 12 * s + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * s; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,14,24,0.85)'; ctx.strokeText(label, V.cx, y + 11.5 * s, w - 12);
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, V.cx, y + 11.5 * s, w - 12);
  }

  function partTag(ctx, g, V, c) {
    if (c.phase !== 'play' || c.pointa) return;
    const p = SIM().part(c), s = V.s, k = clamp((c.song - p.from) / 0.4, 0, 1) * clamp((p.from + 2.6 - c.song) / 0.5, 0, 1);
    if (k <= 0) return;
    ctx.globalAlpha = k;
    const name = T().part[p.key];
    ctx.font = '900 ' + (26 * s).toFixed(1) + 'px system-ui, sans-serif';
    const w = ctx.measureText(name).width + 40 * s, L = lane(V), y = L.y + L.h + 36 * s;
    ctx.fillStyle = 'rgba(122,31,36,0.9)'; rr(ctx, V.cx - w / 2, y - 22 * s, w, 44 * s, 22 * s);
    text(ctx, name, V.cx, y, 26 * s, '#fff4d6', w, 900);
    ctx.globalAlpha = 1;
  }

  function anchor(V, at) {
    const s = V.s;
    if (at === 'band') return [V.W * 0.26, V.floor - 160 * s];
    if (at === 'speaker') return [V.W * 0.5, V.floor - 250 * s];
    if (at === 'jury') return [V.W * 0.5, V.floor - 220 * s];
    if (at === 'crowd') return [V.W * 0.35, V.floor + 70 * s];
    if (at === 'mc') return [V.W * 0.5, V.floor - 250 * s];
    if (at === 'paws') return [SHOW.x, SHOW.y - 150 * s];
    return [SHOW.x, SHOW.y - 190 * s];
  }

  function floats(ctx, g, V) {
    const fs = 18 * V.s;
    for (const f of g.floaters) {
      const [x, y] = anchor(V, f.at);
      ctx.globalAlpha = min(1, f.t * 1.5);
      label(ctx, f.text, clamp(x, 140, V.W - 140), y - (1.6 - f.t) * 22 * V.s, fs, f.color, 800, V.W - 20);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) ZS.render.props.bubble(ctx, SHOW.x, SHOW.y - 180 * V.s, g.bubble.text, g.bubble.t, 8, V.W - 8);
  }

  function pointa(ctx, g, V, c) {
    const p = c.pointa;
    if (!p) return;
    const s = V.s, r = c.result, t = g.time;
    if (p.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * p.flash).toFixed(3) + ')'; ctx.fillRect(0, 0, V.W, V.H); }
    if (!r) return;
    const k = smooth(clamp((p.t - 0.6) / 0.5, 0, 1)), x = SHOW.x, y = SHOW.y - 230 * s - k * 10 * s;
    ctx.globalAlpha = k;
    const gold = r.grade === 'gold', silver = r.grade === 'silver', label = T().grade[r.grade] + ' · ' + T().score(r.pct);
    ctx.font = '900 ' + 15 * s + 'px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 52 * s;
    ctx.fillStyle = 'rgba(30,14,18,0.82)'; rr(ctx, x - w / 2, y - 16 * s, w, 32 * s, 16 * s);
    ZS.folk.krpec(ctx, x - w / 2 + 20 * s, y + 4 * s, 0.45, gold ? '#f2c230' : silver ? '#d0d5dc' : '#c9a26a');
    text(ctx, label, x + 14 * s, y, 15 * s, gold ? '#ffe08a' : '#f7f3ea', w - 40 * s, 900);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 24 && k > 0; i++) {
      const u = frac(t * 0.4 + hash(i)), x = hash(i * 3.3) * V.W, yy = -20 + u * V.floor;
      ctx.fillStyle = ['#c4262e', '#f2c230', '#2f9e44', '#f7f3ea'][i % 4];
      ctx.save(); ctx.translate(x + sin(t * 2 + i) * 20, yy); ctx.rotate(t * 3 + i); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
  }

  function draw(g, ctx, viewW, offY) {
    const c = g.pass.play, V = view(g, viewW);
    backdrop(ctx, g, V, c);
    band(ctx, g, V, c);
    stage(ctx, g, V);
    bear(ctx, g, V, c);
    crowd(ctx, g, V, c);
    jury(ctx, g, V, c);
    meter(ctx, g, V, c);
    cues(ctx, g, V, c);
    partTag(ctx, g, V, c);
    floats(ctx, g, V);
    pointa(ctx, g, V, c);
  }

  Object.assign(API, { draw, view });
})();
