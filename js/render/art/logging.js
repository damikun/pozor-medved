(function () {
  const ZS = window.ZS;
  const GY = ZS.CFG.GROUND;
  const PI = Math.PI, TAU = PI * 2;
  const { sin, cos, abs, min, max, atan2, hypot } = Math;
  const { clamp, lerp, smooth, frac, hash } = ZS.util;
  const { rrect, circle, ellipse, text, rgba } = ZS.gfx;
  const SIM = () => ZS.sim.logging;

  const BARK = '#7d7266', BARK_D = '#5d5349', BRANCH = '#887d72', TWIG = '#9b9186';
  const WOOD = '#e7cd9b', RING = '#c7a26a', HEART = '#b48a52', OLD = '#cdbf9f', OLD_R = '#a99a7c', OLD_B = '#4f4740';
  const YEL = '#f2b51e', YEL_D = '#c88b0f', YEL_L = '#ffd45a', STEEL = '#3b4046', TIRE = '#1d2023', GLASS = '#9fcbe0';
  const FAR = { s: 0.6, y: 30 };
  const MACHINE = { s: 0.88, y: 9, l1: 92, l2: 104, pivot: [62, -78], rest: [104, -44] };
  const HEAD = { w: 22, h: 30 };

  const halfAt = (t, y) => lerp(t.w / 2, 3.2, clamp((GY - 18 - y) / (t.h - 26), 0, 1));

  function barkTrunk(ctx, x, h, w, sd, broken) {
    const half = w / 2, top = GY - h;
    ctx.fillStyle = BARK;
    ctx.beginPath();
    ctx.moveTo(x - half - 8, GY); ctx.quadraticCurveTo(x - half - 1, GY - 5, x - half, GY - 18);
    if (broken) {
      ctx.lineTo(x - 4.6, top + 14); ctx.lineTo(x - 2.4, top + 3); ctx.lineTo(x - 0.6, top + 9); ctx.lineTo(x + 1.6, top); ctx.lineTo(x + 3.2, top + 7); ctx.lineTo(x + 4.6, top + 13);
    } else {
      ctx.lineTo(x - 3.2, top + 10); ctx.quadraticCurveTo(x - 1.4, top + 1, x, top - 2); ctx.quadraticCurveTo(x + 1.4, top + 1, x + 3.2, top + 10);
    }
    ctx.lineTo(x + half, GY - 18); ctx.quadraticCurveTo(x + half + 1, GY - 5, x + half + 8, GY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.moveTo(x + half * 0.18, GY); ctx.lineTo(x + half + 8, GY); ctx.quadraticCurveTo(x + half + 1, GY - 5, x + half, GY - 18);
    ctx.lineTo(x + 3, top + 12); ctx.lineTo(x + 0.6, top + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(x - half * 0.75, GY - 4); ctx.lineTo(x - half * 0.35, GY - 4); ctx.lineTo(x - 1.2, top + 18); ctx.lineTo(x - 2.4, top + 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(58,50,42,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6 - 0.5, y0 = GY - 10 - hash(sd + i) * 30, y1 = lerp(y0 - 40, top + 30, 0.35 + 0.55 * hash(sd + i * 2.3));
      const hw0 = half * 0.85, xa = x + u * 2 * hw0;
      ctx.moveTo(xa, y0);
      for (let y = y0 - 14; y > y1; y -= 14) {
        const k = clamp((GY - 18 - y) / (h - 26), 0, 1), hw = lerp(half, 3.2, k) * 0.85;
        ctx.lineTo(x + u * 2 * hw + sin(y * 0.11 + sd + i) * 1.1, y);
      }
    }
    ctx.stroke();
  }

  function beetle(ctx, t, sd) {
    for (let k = 0; k < 2; k++) {
      const y = lerp(GY - 100, GY - t.h * 0.58, hash(sd + k * 4.1)), hw = halfAt(t, y), side = k ? 1 : -1;
      const cx = t.x + side * hw * 0.32, w = hw * (0.5 + 0.25 * hash(sd + k)), h = 18 + hash(sd + k * 2.9) * 22;
      ctx.fillStyle = '#968a7b';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, y); ctx.quadraticCurveTo(cx - w * 0.62, y - h * 0.5, cx - w * 0.2, y - h);
      ctx.quadraticCurveTo(cx + w * 0.4, y - h * 0.82, cx + w * 0.5, y - h * 0.35); ctx.quadraticCurveTo(cx + w * 0.3, y + 3, cx - w * 0.5, y);
      ctx.fill();
      ctx.strokeStyle = 'rgba(96,80,62,0.45)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.05, y - 2); ctx.quadraticCurveTo(cx + w * 0.12, y - h * 0.5, cx - w * 0.08, y - h + 3); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,30,22,0.5)';
    for (let k = 0; k < 9; k++) {
      const y = lerp(GY - 30, GY - t.h * 0.6, hash(sd + k * 1.9)), hw = halfAt(t, y);
      circle(ctx, t.x + (hash(sd + k * 3.3) - 0.5) * hw * 1.5, y, 0.8);
    }
  }

  function band(ctx, t, y0, y1, alpha, sd) {
    const n = 8, sag = 2.6, pts = (y, s1, s2) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, hw = halfAt(t, y);
        out.push([t.x - hw + 2 * hw * u, y + sag * sin(u * PI) + sin(u * 11 + s1) * 0.9 + (hash(s2 + i) - 0.5) * 1.2]);
      }
      return out;
    };
    const top = pts(y0, sd, sd + 3), bot = pts(y1, sd * 2, sd + 7);
    const path = (grow) => {
      ctx.beginPath();
      top.forEach(([x, y], i) => ctx.lineTo(x + (i === 0 ? -grow * 0.4 : i === n ? grow * 0.4 : 0), y - grow));
      for (let i = n; i >= 0; i--) ctx.lineTo(bot[i][0] + (i === 0 ? -grow * 0.4 : i === n ? grow * 0.4 : 0), bot[i][1] + grow);
      ctx.closePath();
    };
    ctx.fillStyle = rgba('255,120,30', alpha * 0.25); path(2.2); ctx.fill();
    ctx.fillStyle = rgba('255,115,20', alpha); path(0); ctx.fill();
    ctx.save(); path(0); ctx.clip();
    ctx.fillStyle = rgba('120,40,0', alpha * 0.28); ctx.fillRect(t.x + halfAt(t, y0) * 0.18, y0 - 6, halfAt(t, y0) * 1.2, y1 - y0 + 12);
    ctx.fillStyle = rgba('255,200,140', alpha * 0.35); ctx.fillRect(t.x - halfAt(t, y0) * 0.72, y0 - 4, halfAt(t, y0) * 0.38, y1 - y0 + 8);
    ctx.restore();
    ctx.fillStyle = rgba('255,115,20', alpha * 0.75);
    for (let i = 0; i < 10; i++) circle(ctx, t.x + (hash(sd + i * 5.1) - 0.5) * halfAt(t, y0) * 2.3, lerp(y0 - 5, y1 + 5, hash(sd + i * 2.7)), 0.5 + hash(sd + i) * 0.8);
    for (let k = 0; k < 2; k++) {
      const u = 0.25 + 0.5 * hash(sd * 1.3 + k), dx = t.x - halfAt(t, y1) + 2 * halfAt(t, y1) * u, dl = 4 + hash(sd * 2.1 + k) * 8, by = y1 + sag * sin(u * PI);
      ctx.fillRect(dx - 0.8, by - 1, 1.6, dl); circle(ctx, dx, by + dl, 1.15);
    }
  }

  function mark(ctx, t, g) {
    const sd = t.id * 9.7 + (t.remarked ? 3.3 : 0) + 0.4, y0 = GY - 78, y1 = GY - 62;
    if (t.wiped) {
      ctx.fillStyle = 'rgba(255,115,20,0.13)';
      ctx.beginPath(); ctx.ellipse(t.x - 2, (y0 + y1) / 2 + 1, halfAt(t, y0) * 0.86, (y1 - y0) * 0.42, 0.05, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(210,190,165,0.3)'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const y = y0 - 6 + i * 7 + hash(sd + i) * 3, hw = halfAt(t, y) * (0.5 + 0.3 * hash(sd + i * 9)); ctx.moveTo(t.x - hw, y); ctx.lineTo(t.x + hw * 0.8, y + 1.4); }
      ctx.stroke();
      ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const y = y0 + 4 + hash(sd + i * 2) * 14, x = t.x + (hash(sd + i * 4) - 0.5) * 18; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y + 1, x + 3.6 * (hash(sd + i) < 0.5 ? -1 : 1), y + 3.4); }
      ctx.stroke();
    }
    if (!t.mark) return;
    const r = clamp(t.rub || 0, 0, 1), fresh = t.markT === undefined ? 1 : clamp((g.time - t.markT) / 0.6, 0, 1);
    band(ctx, t, y0, y1, (1 - r * 0.88) * (0.25 + 0.75 * fresh), sd);
    if (r > 0.02) {
      ctx.strokeStyle = rgba('125,114,102', min(1, r * 1.6)); ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const y = y0 + 1 + i * 4.4, hw = halfAt(t, y); ctx.moveTo(t.x - hw, y + sin(g.time * 20 + i) * 0.8); ctx.lineTo(t.x - hw + hw * 2 * min(1, r * 1.4 + i * 0.08), y + 1.2); }
      ctx.stroke();
    }
  }

  function trunk(ctx, t, g) {
    const sd = t.id * 3.7 + 0.3, broken = hash(t.id * 5.3 + 1.7) < 0.35;
    barkTrunk(ctx, t.x, t.h, t.w, sd, broken);
    beetle(ctx, t, sd);
    mark(ctx, t, g);
  }

  function branches(ctx, x, h, r, id, lean) {
    const sd = id * 5.3 + 1.7, top = GY - h, broken = hash(sd) < 0.35, n = 17, L = lean || 0;
    const lo = GY - h * 0.36, hi = top + (broken ? 20 : 8);
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(150,140,128,0.14)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, lo + r * 0.32); ctx.quadraticCurveTo(x - r * 0.5, (lo + hi) / 2, x, hi - 6); ctx.quadraticCurveTo(x + r * 0.5, (lo + hi) / 2, x + r * 0.9, lo + r * 0.32); ctx.closePath(); ctx.fill();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, y = lerp(lo, hi, u), side = i % 2 ? 1 : -1;
      const len = r * (1.04 - u * 0.86) * (0.72 + 0.5 * hash(sd + i * 1.7)), snap = hash(sd + i * 3.1) < 0.2;
      const l = snap ? len * 0.35 : len, bx = x + side * (1.5 + 3.5 * (1 - u)) + L * (GY - y) * 0.12;
      const tx = bx + side * l, ty = y + l * (0.42 + 0.1 * hash(sd + i * 2)), cx = bx + side * l * 0.5, cy = y + l * 0.04;
      if (!snap && hash(sd + i * 4.3) < 0.3) {
        ctx.strokeStyle = 'rgba(150,92,46,0.5)'; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(lerp(bx, tx, 0.35), lerp(y, ty, 0.3)); ctx.quadraticCurveTo(lerp(cx, tx, 0.5), lerp(cy, ty, 0.5), tx, ty); ctx.stroke();
      }
      ctx.strokeStyle = BRANCH; ctx.lineWidth = lerp(2.1, 1, u);
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(cx, cy, tx, ty);
      if (!snap) ctx.lineTo(tx + side * 2.4, ty - 1.4);
      ctx.stroke();
      if (snap) continue;
      ctx.strokeStyle = TWIG; ctx.lineWidth = 0.75;
      ctx.beginPath();
      const m = 3 + Math.floor(hash(sd + i * 6.7) * 3);
      for (let j = 1; j <= m; j++) {
        const v = j / (m + 0.6), px = lerp(lerp(bx, cx, v), lerp(cx, tx, v), v), py = lerp(lerp(y, cy, v), lerp(cy, ty, v), v), d = 3 + l * 0.1 * (1 - v * 0.4);
        ctx.moveTo(px, py); ctx.lineTo(px + side * d * 0.35, py + d);
      }
      ctx.stroke();
    }
    if (broken) {
      ctx.fillStyle = '#d9c9a8';
      ctx.beginPath(); ctx.moveTo(x - 3.6, top + 13); ctx.lineTo(x - 1.6, top + 4); ctx.lineTo(x + 0.2, top + 9); ctx.lineTo(x + 1.8, top + 2); ctx.lineTo(x + 3.6, top + 12); ctx.closePath(); ctx.fill();
    }
  }

  function crown(ctx, t, season, g) {
    branches(ctx, t.x, t.h, t.r, t.id, 0);
  }

  function stump(ctx, s, g) {
    const x = s.x, hw = s.w / 2 - 1, h = 18 + (s.id % 3) * 2;
    ctx.fillStyle = BARK;
    ctx.beginPath(); ctx.moveTo(x - hw - 8, GY); ctx.quadraticCurveTo(x - hw - 1, GY - 5, x - hw, GY - h + 2); ctx.lineTo(x + hw, GY - h - 2); ctx.quadraticCurveTo(x + hw + 1, GY - 5, x + hw + 8, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + hw * 0.2, GY - h, hw * 0.8, h);
    ctx.save(); ctx.translate(x, GY - h); ctx.rotate(-0.09);
    ctx.fillStyle = WOOD; ellipse(ctx, 0, 0, hw, 4.4);
    ctx.strokeStyle = RING; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.68, 2.9, 0, 0, TAU); ctx.moveTo(hw * 0.36, 0); ctx.ellipse(0, 0, hw * 0.36, 1.6, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = HEART; circle(ctx, 0, 0, 1);
    ctx.restore();
    const fade = clamp(1 - (s.t || 0) / 25, 0.35, 1);
    ctx.fillStyle = rgba('236,212,160', 0.85 * fade);
    for (let i = 0; i < 14; i++) circle(ctx, x + (hash(s.id * 7 + i) - 0.5) * (s.w + 34), GY - 0.6 - hash(s.id + i * 3) * 2.4, 0.9 + hash(i + s.id) * 0.9);
  }

  function logEnd(ctx, x, y, r, wood, ring, bark) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; circle(ctx, x - r * 0.5, y - r * 0.32, r);
    ctx.fillStyle = bark; circle(ctx, x, y, r);
    ctx.fillStyle = wood; circle(ctx, x + 0.4, y - 0.3, r * 0.8);
    ctx.strokeStyle = ring; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(x + 0.4, y - 0.3, r * 0.52, 0, TAU); ctx.moveTo(x + 0.4 + r * 0.26, y - 0.3); ctx.arc(x + 0.4, y - 0.3, r * 0.26, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; circle(ctx, x - r * 0.25, y - r * 0.35, r * 0.25);
  }

  function heap(ctx, s) {
    const r = s.r, wood = s.old ? OLD : WOOD, ring = s.old ? OLD_R : RING, bark = s.old ? OLD_B : '#5e4d3c';
    if (s.n > 0) { ctx.fillStyle = 'rgba(30,26,20,0.2)'; ellipse(ctx, s.x, GY + 1, s.w * 0.56, 5); }
    let i = 0;
    for (let row = 0; row < s.rows && i < s.n; row++) {
      const n = max(1, s.base - row), sx = s.x - (n - 1) * r;
      for (let k = 0; k < n && i < s.n; k++, i++) {
        const sd = s.id * 17 + row * 7 + k;
        logEnd(ctx, sx + k * r * 2 + (hash(sd) - 0.5) * 1.6, GY - r + 1 - row * r * 1.72 + (hash(sd * 1.7) - 0.5) * 1.2, r - hash(sd * 3.1) * 1.1, wood, ring, bark);
      }
    }
  }

  function cover(ctx, g, s, withBear) {
    const b = g.bear;
    if (!withBear || b.hideTree !== s || !(b.hideBlend > 0)) { heap(ctx, s); return; }
    const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: s }));
    withBear(ZS.drawBearInHay, who, b.hideBlend);
    withBear(ZS.drawBearHayFront, who, b.hideBlend);
    heap(ctx, s);
  }

  function ruts(ctx, D, vis) {
    const [a, z] = D.ruts;
    ctx.fillStyle = 'rgba(104,80,52,0.42)';
    rrect(ctx, a, GY - 1.5, z - a, 9, 4);
    ctx.fillStyle = 'rgba(58,42,26,0.4)';
    for (let x = a + 14; x < z - 30; x += 46) {
      if (!vis(x, 60)) continue;
      const w = 26 + hash(x * 0.37) * 14;
      rrect(ctx, x, GY + 1, w, 2.2, 1.1);
      rrect(ctx, x + 12, GY + 5.2, w * 0.8, 2, 1);
    }
    ctx.fillStyle = 'rgba(236,212,160,0.55)';
    for (let x = a; x < z; x += 23) if (vis(x, 30)) circle(ctx, x + hash(x * 1.3) * 18, GY - 0.8 + hash(x * 0.7) * 4, 0.9 + hash(x) * 0.8);
  }

  function site(ctx, g, vis, span, withBear) {
    const D = g.level.clearing;
    if (!D || !span(D.from, D.to, 200)) return;
    ruts(ctx, D, vis);
    decor(ctx, g, D, vis);
    for (const s of D.stumps) if (vis(s.x, 60)) stump(ctx, s, g);
    for (const s of D.piles) if (vis(s.x, 90)) cover(ctx, g, s, withBear);
  }

  function pile(ctx, A, g) {
    const p = A.pile, x0 = p.x - p.w / 2, r = 9.6, base = Math.floor(p.w / (r * 2));
    ctx.fillStyle = 'rgba(30,26,20,0.18)'; ellipse(ctx, p.x, GY - FAR.y * 0.3 + 2, p.w * 0.6, 7);
    for (let row = 0; row < 4; row++) {
      const n = base - row, w = n * r * 2, sx = p.x - w / 2 + r;
      for (let i = 0; i < n; i++) {
        const sd = row * 13 + i;
        logEnd(ctx, sx + i * r * 2 + (hash(sd) - 0.5) * 2, GY - 9 - row * r * 1.72 + (hash(sd * 1.7) - 0.5) * 1.6, r - hash(sd * 3.1) * 1.4, OLD, OLD_R, OLD_B);
      }
    }
    const sx = x0 - 12, sy = GY - 34;
    ctx.fillStyle = '#6b5236'; ctx.fillRect(sx - 1.2, sy, 2.4, 40);
    ctx.fillStyle = '#f4f1e6'; rrect(ctx, sx - 26, sy - 22, 52, 24, 3);
    ctx.strokeStyle = '#2f5d3a'; ctx.lineWidth = 1.6; ctx.strokeRect(sx - 24, sy - 20, 48, 20);
    const N = ZS.LABELS.logging.notice;
    text(ctx, N[0], sx, sy - 14.5, 8, '#2f5d3a', 800, 0, 44);
    text(ctx, N[1], sx, sy - 6, 8, '#2f5d3a', 700, 0, 44);
  }

  function tape(ctx, A, g) {
    const y = GY - FAR.y * 0.45, posts = [];
    const n = Math.max(7, Math.round((A.to - A.from + 40) / 130));
    for (let x = A.from - 20; x <= A.to + 20.5; x += (A.to - A.from + 40) / n) posts.push(x);
    ctx.fillStyle = '#d8d2c4';
    for (const x of posts) { ctx.fillRect(x - 1.4, y - 44, 2.8, 44); ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 1.4, y - 44, 2.8, 5); ctx.fillStyle = '#d8d2c4'; }
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i], b = posts[i + 1], sag = 5 + 1.6 * sin(g.time * 1.7 + i);
      for (let s = 0; s < 2; s++) {
        ctx.strokeStyle = s ? '#f6f3ea' : '#d6332a'; ctx.lineWidth = 2.6;
        ctx.setLineDash([7, 7]); ctx.lineDashOffset = s * 7;
        ctx.beginPath(); ctx.moveTo(a, y - 34); ctx.quadraticCurveTo((a + b) / 2, y - 34 + sag * 2, b, y - 34); ctx.stroke();
      }
    }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }

  function wheel(ctx, x, y, r, spin) {
    ctx.fillStyle = TIRE; circle(ctx, x, y, r);
    ctx.strokeStyle = '#33383d'; ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = spin + (i * TAU) / 10; ctx.moveTo(x + cos(a) * (r - 3.2), y + sin(a) * (r - 3.2)); ctx.lineTo(x + cos(a) * r, y + sin(a) * r); }
    ctx.stroke();
    ctx.fillStyle = YEL_D; circle(ctx, x, y, r * 0.48);
    ctx.fillStyle = YEL; circle(ctx, x, y, r * 0.4);
    ctx.fillStyle = STEEL; circle(ctx, x, y, r * 0.16);
    ctx.fillStyle = '#2a2e33';
    for (let i = 0; i < 5; i++) { const a = spin * 0.5 + (i * TAU) / 5; circle(ctx, x + cos(a) * r * 0.28, y + sin(a) * r * 0.28, 1.3); }
  }

  function boom(ctx, ax, ay, bx, by, w, col) {
    const a = atan2(by - ay, bx - ax), l = hypot(bx - ax, by - ay);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = YEL_D; rrect(ctx, -w * 0.4, -w / 2 - 1, l + w * 0.8, w + 2, w * 0.4);
    ctx.fillStyle = col || YEL; rrect(ctx, -w * 0.4, -w / 2, l + w * 0.8, w, w * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, -w / 2 + 1, l, 1.4);
    ctx.fillStyle = STEEL; circle(ctx, 0, 0, w * 0.36); circle(ctx, l, 0, w * 0.32);
    ctx.restore();
  }

  function ram(ctx, ax, ay, bx, by, w) {
    const mx = lerp(ax, bx, 0.55), my = lerp(ay, by, 0.55);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2f34'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mx, my); ctx.stroke();
    ctx.strokeStyle = '#d7dde2'; ctx.lineWidth = w * 0.45; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
  }

  function solve(px, py, tx, ty, l1, l2) {
    let dx = tx - px, dy = ty - py, d = hypot(dx, dy);
    const lim = l1 + l2 - 0.5;
    if (d > lim) { dx *= lim / d; dy *= lim / d; d = lim; }
    const a = atan2(dy, dx), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), b = Math.acos(c);
    return [px + cos(a - b) * l1, py + sin(a - b) * l1, px + dx, py + dy];
  }

  function cab(ctx, m, g, film) {
    const on = m.on;
    ctx.fillStyle = '#2a2e33'; rrect(ctx, -6, -132, 62, 6, 2);
    ctx.fillStyle = YEL; rrect(ctx, -4, -128, 58, 74, 5);
    ctx.fillStyle = '#20252a'; rrect(ctx, 0, -124, 50, 48, 4);
    ctx.fillStyle = GLASS; rrect(ctx, 2, -122, 46, 44, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(6, -122); ctx.lineTo(16, -122); ctx.lineTo(6, -100); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, -122); ctx.lineTo(27, -122); ctx.lineTo(13, -90); ctx.lineTo(8, -90); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a37c'; circle(ctx, 30, -98, 6.4);
    ctx.fillStyle = '#ff7a1a'; rrect(ctx, 21, -91, 20, 13, 5);
    ctx.fillStyle = '#e8e9e4'; ctx.beginPath(); ctx.arc(30, -101, 7, PI, TAU); ctx.fill();
    ctx.fillRect(22.6, -101.4, 14.8, 1.6);
    ctx.fillStyle = '#2a1d12'; circle(ctx, 34, -98, 0.9);
    if (film) {
      ctx.fillStyle = '#d9a37c'; circle(ctx, 40.5, -97, 2.4);
      ctx.fillStyle = '#16181c'; rrect(ctx, 38.6, -105, 5.4, 9.4, 1);
      ctx.fillStyle = frac(g.time * 1.1) < 0.62 ? '#ff3b30' : '#7a1d18'; circle(ctx, 41.3, -106.6, 1.2);
    } else {
      ctx.strokeStyle = '#2a2e33'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(38, -84); ctx.lineTo(44, -90); ctx.stroke();
    }
    ctx.fillStyle = '#20252a'; ctx.fillRect(24, -124, 2.6, 46);
    const flash = on && frac(g.time * 1.6) < 0.5;
    ctx.fillStyle = flash ? '#ffb000' : '#a86c00'; rrect(ctx, 22, -140, 8, 8, 3);
    if (flash) { ctx.fillStyle = 'rgba(255,190,40,0.25)'; circle(ctx, 26, -136, 13); }
    ctx.fillStyle = '#e9e4d0'; rrect(ctx, 44, -138, 8, 5, 2); rrect(ctx, 0, -138, 8, 5, 2);
  }

  function body(ctx, m, g) {
    const t = g.time, spin = m.x * 0.045;
    ctx.fillStyle = 'rgba(20,24,16,0.22)'; ellipse(ctx, 0, 0, 132, 7);
    ctx.fillStyle = '#26292d'; rrect(ctx, -108, -30, 66, 12, 5); rrect(ctx, 44, -30, 64, 12, 5);
    for (const wx of [-92, -56]) wheel(ctx, wx, -21, 21, spin);
    ctx.fillStyle = YEL; rrect(ctx, -122, -74, 118, 46, 7);
    ctx.fillStyle = YEL_D; ctx.fillRect(-122, -38, 118, 10);
    ctx.fillStyle = '#2a2e33';
    for (let i = 0; i < 6; i++) ctx.fillRect(-116 + i * 6, -66, 3, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-118, -72, 110, 2.4);
    ctx.fillStyle = '#2a2e33'; rrect(ctx, -46, -106, 7, 36, 2);
    ctx.fillStyle = '#41464c'; rrect(ctx, -48.5, -110, 12, 6, 2);
    ctx.fillStyle = '#2a2e33'; rrect(ctx, -10, -64, 16, 30, 4);
    ctx.fillStyle = YEL; rrect(ctx, 0, -58, 118, 28, 6);
    ctx.fillStyle = YEL_D; ctx.fillRect(0, -38, 118, 8);
    ctx.fillStyle = '#2a2e33'; ctx.fillRect(104, -52, 10, 14);
    ctx.fillStyle = '#e9e4d0'; rrect(ctx, 108, -54, 7, 5, 2);
    for (const wx of [58, 94]) wheel(ctx, wx, -21, 21, spin);
    ctx.fillStyle = '#2a2e33'; rrect(ctx, MACHINE.pivot[0] - 9, -76, 18, 20, 4);
    ctx.fillStyle = '#1b1e22'; ctx.fillRect(-120, -48, 114, 2);
    if (m.on) {
      for (let i = 0; i < 4; i++) {
        const u = frac(t * 0.9 + i * 0.25), x = -42 - u * 18 + sin(t * 3 + i) * 3, y = -112 - u * 46;
        ctx.fillStyle = rgba('90,90,92', 0.32 * (1 - u)); circle(ctx, x, y, 4 + u * 10);
      }
    }
  }

  function grip(ctx, x, y, k, saw, g) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = STEEL; ctx.fillRect(-2, -HEAD.h / 2 - 12, 4, 12);
    ctx.fillStyle = '#2a2e33'; rrect(ctx, -5, -HEAD.h / 2 - 6, 10, 7, 2);
    ctx.fillStyle = YEL_D; rrect(ctx, -HEAD.w / 2 - 1, -HEAD.h / 2 - 1, HEAD.w + 2, HEAD.h + 2, 4);
    ctx.fillStyle = YEL; rrect(ctx, -HEAD.w / 2, -HEAD.h / 2, HEAD.w, HEAD.h, 4);
    ctx.fillStyle = YEL_L; ctx.fillRect(-HEAD.w / 2 + 2, -HEAD.h / 2 + 2, 3, HEAD.h - 8);
    ctx.fillStyle = '#2a2e33'; rrect(ctx, -4.6, -9, 9.2, 15, 3.4);
    ctx.fillStyle = '#4c5258'; for (let i = 0; i < 4; i++) ctx.fillRect(-4, -7.6 + i * 3.6 + frac(g.time * (k > 0.5 ? 3 : 0)) * 3.6 * (i < 3 ? 1 : 0), 8, 1.2);
    ctx.fillStyle = YEL_D; ctx.fillRect(-HEAD.w / 2, 7, HEAD.w, 2.4);
    ctx.strokeStyle = '#2a2e33'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const open = 1 - k;
    ctx.beginPath();
    ctx.moveTo(-HEAD.w / 2, -10); ctx.quadraticCurveTo(-HEAD.w / 2 - 8 - 6 * open, -2, -HEAD.w / 2 - 2 - 8 * open, 8);
    ctx.moveTo(HEAD.w / 2, -10); ctx.quadraticCurveTo(HEAD.w / 2 + 8 + 6 * open, -2, HEAD.w / 2 + 2 + 8 * open, 8);
    ctx.stroke();
    ctx.fillStyle = '#25282c'; rrect(ctx, -HEAD.w / 2 - 3 - saw * 10, HEAD.h / 2 - 4, 16 + saw * 18, 4.2, 2);
    if (saw > 0.2) {
      ctx.fillStyle = '#c6ccd2';
      for (let i = 0; i < 6; i++) ctx.fillRect(-HEAD.w / 2 - 3 - saw * 10 + frac(g.time * 9 + i / 6) * (16 + saw * 18), HEAD.h / 2 - 4.6, 1.4, 1);
    }
    ctx.restore();
  }

  function crane(ctx, m, g, A, tx, ty, local) {
    const P = MACHINE.pivot;
    const [ex, ey, hx, hy] = solve(P[0], P[1], tx, ty - HEAD.h / 2 - 8, MACHINE.l1, MACHINE.l2);
    ram(ctx, P[0] - 14, P[1] + 14, lerp(P[0], ex, 0.55), lerp(P[1], ey, 0.55), 5);
    boom(ctx, P[0], P[1], ex, ey, 11);
    ram(ctx, lerp(P[0], ex, 0.75), lerp(P[1], ey, 0.75) - 5, lerp(ex, hx, 0.35), lerp(ey, hy, 0.35) - 4, 4);
    boom(ctx, ex, ey, hx, hy, 8);
    ctx.strokeStyle = '#1b1e22'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(P[0] + 4, P[1] - 4); ctx.quadraticCurveTo(ex + 6, ey - 14, hx, hy - 3); ctx.stroke();
    local.hx = hx; local.hy = hy;
  }

  function sawdust(ctx, x, y, g, dir) {
    for (let i = 0; i < 12; i++) {
      const u = frac(g.time * 2.6 + i / 12), a = -PI / 2 + dir * (0.4 + hash(i) * 1.1);
      ctx.fillStyle = rgba(i % 3 ? '238,214,160' : '205,170,110', 0.9 * (1 - u));
      circle(ctx, x + cos(a) * u * 34, y + sin(a) * u * 26 + u * u * 30, 1 + hash(i * 3) * 1.2);
    }
  }

  function fallen(ctx, f, g) {
    const C = SIM().CUT, k = clamp(f.t / C.fall, 0, 1), s = clamp((f.t - C.fall) / C.strip, 0, 1);
    const a = f.dir * (1.27 * k * k + (k >= 1 ? 0.03 * sin(clamp(f.t - C.fall, 0, 0.6) * 18) * (1 - clamp((f.t - C.fall) / 0.6, 0, 1)) : 0));
    ctx.save();
    ctx.translate(f.x, GY - 18); ctx.rotate(a);
    ctx.beginPath(); ctx.rect(-f.r - 60, -f.h - 60, f.r * 2 + 120, f.h + 60 - 2); ctx.clip();
    ctx.translate(0, s * f.h * 0.92);
    ctx.translate(-f.x, -(GY - 18));
    barkTrunk(ctx, f.x, f.h, f.w, f.id * 3.7 + 0.3, hash(f.id * 5.3 + 1.7) < 0.35);
    branches(ctx, f.x, f.h, f.r * (1 - 0.6 * s), f.id, 0);
    ctx.restore();
    if (s > 0 && s < 1) {
      const base = [f.x + sin(a) * 6, GY - 18 - cos(a) * 6];
      for (let i = 0; i < 6; i++) {
        const u = frac(g.time * 3 + i / 6), dir = f.dir;
        ctx.strokeStyle = rgba('136,125,114', 1 - u); ctx.lineWidth = 1.6;
        const x = base[0] - dir * u * 30 + (hash(i) - 0.5) * 14, y = base[1] - 6 - u * 16 + u * u * 40;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5 * cos(i + u * 8), y + 5 * sin(i + u * 8)); ctx.stroke();
      }
    }
  }

  function machine(ctx, g, A) {
    const m = A.machine, C = SIM().CUT, sc = MACHINE.s, y0 = GY - MACHINE.y;
    const turn = m.turn === undefined ? m.face || -1 : m.turn, face = turn < 0 ? -1 : 1, sx = abs(turn) < 0.08 ? 0.08 * face : turn;
    const shake = m.on ? 0.5 * sin(g.time * 47) : 0;
    const t = m.tree, f = A.falls.find((o) => t && o.id === t.id);
    let tx, ty;
    if (t && (m.state === 'reach' || m.state === 'grip' || m.state === 'saw' || m.state === 'wait' || m.state === 'check' || m.state === 'back')) { tx = t.x; ty = GY - 24; }
    else if (f) {
      const k = clamp(f.t / C.fall, 0, 1), a = f.dir * 1.27 * k * k;
      tx = f.x + sin(a) * 26; ty = GY - 18 - cos(a) * 26;
    } else { tx = m.x + face * MACHINE.rest[0] * sc; ty = y0 + MACHINE.rest[1] * sc; }
    const want = [(tx - m.x) / (sc * sx), (ty - y0 - shake) / sc];
    const rest = MACHINE.rest, r = m.state === 'check' ? m.reach : clamp(m.reach, 0, 1);
    const lx = lerp(rest[0], want[0], r), ly = lerp(rest[1], want[1], r);
    ctx.save();
    ctx.translate(m.x, y0 + shake); ctx.scale(sc * sx, sc);
    body(ctx, m, g);
    cab(ctx, m, g, m.film > 0);
    const local = { hx: 0, hy: 0 };
    ctx.restore();
    if (f) fallen(ctx, f, g);
    ctx.save();
    ctx.translate(m.x, y0 + shake); ctx.scale(sc * sx, sc);
    crane(ctx, m, g, A, lx, ly, local);
    ctx.restore();
    const hx = m.x + local.hx * sc * sx, hy = y0 + shake + local.hy * sc;
    const hold = m.state === 'grip' || m.state === 'saw' || m.state === 'wait' || (!!f && f.t < C.fall + C.strip);
    const sawing = m.state === 'saw' ? 1 : 0;
    grip(ctx, hx, hy + HEAD.h / 2 + 4, hold ? 1 : m.state === 'reach' ? clamp(m.t / C.reach, 0, 1) * 0.3 : 0, sawing, g);
    if (sawing && t) sawdust(ctx, t.x, GY - 12, g, face);
  }

  function decor(ctx, g, A, vis) {
    for (const d of A.down) if (vis(d.x, d.len + 60)) windthrow(ctx, d);
    for (const t of A.deco) {
      if (!vis(t.x, 140)) continue;
      ctx.save();
      ctx.translate(t.x, GY); ctx.scale(0.92, 0.92); ctx.translate(-t.x, -GY + 14);
      barkTrunk(ctx, t.x, t.h, t.w, t.id * 3.7, hash(t.id * 5.3 + 1.7) < 0.35);
      branches(ctx, t.x, t.h, t.r, t.id, t.lean);
      ctx.restore();
    }
  }

  function windthrow(ctx, d) {
    const x = d.x, y = GY - 16, a = -d.dir * 0.08, sd = d.id * 2.3;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = BARK_D;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(d.dir * d.len, -3.5); ctx.lineTo(d.dir * d.len, 1.5); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(Math.min(0, d.dir * d.len), -7, d.len, 2.4);
    ctx.strokeStyle = BRANCH; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < 9; i++) {
      const u = i / 9, bx = d.dir * d.len * u, l = (1 - u) * 26 + 6;
      ctx.moveTo(bx, -4 + u * 3); ctx.lineTo(bx + d.dir * l * 0.5, -4 - l * (0.5 + 0.3 * hash(sd + i)));
      if (hash(sd + i * 2) < 0.5) { ctx.moveTo(bx, 2); ctx.lineTo(bx + d.dir * l * 0.4, 2 + l * 0.35); }
    }
    ctx.stroke();
    ctx.fillStyle = '#5a4532';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const th = (i / 12) * TAU, r = 30 + 9 * hash(sd + i * 1.3);
      ctx.lineTo(-d.dir * 6 + Math.cos(th) * r * 0.42, Math.sin(th) * r - 10);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6e5640'; ellipse(ctx, -d.dir * 4, -10, 10, 26);
    ctx.strokeStyle = '#3d2e20'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const th = -PI / 2 + (i - 3) * 0.42; ctx.moveTo(-d.dir * 4, -10); ctx.lineTo(-d.dir * 4 + Math.cos(th) * 8 * -d.dir, -10 + Math.sin(th) * 30); }
    ctx.stroke();
    ctx.restore();
  }

  function backdrop(ctx, g, viewW, offY) {
    const season = g.seasonKey || 'summer';
    const top = -offY, cam = g.cam;
    const S = { spring: ['#a7d8f5', '#eaf7ff'], summer: ['#7cc4ef', '#d8f1ff'], autumn: ['#efb57c', '#fbe6c8'] }[season] || ['#7cc4ef', '#d8f1ff'];
    const gr = ctx.createLinearGradient(0, top, 0, GY);
    gr.addColorStop(0, S[0]); gr.addColorStop(1, S[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, top, viewW, GY - top);
    const peak = (x, o) => {
      const u = x * 0.0017 + o, big = Math.max(0, sin(u)), crest = Math.pow(big, 1.6);
      return GY - 210 - 150 * crest * (0.7 + 0.3 * sin(u * 2.3 + 1)) - 34 * abs(sin(u * 4.1 + 2)) * (0.4 + crest) - 10 * hash(Math.floor(x / 26) + o * 7);
    };
    const px = cam * 0.08, step = 12;
    ctx.fillStyle = '#93a4b7';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (let sx = -24; sx <= viewW + 24; sx += step) ctx.lineTo(sx, peak(sx + px, 0.4));
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(70,82,100,0.18)';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (let sx = -24; sx <= viewW + 24; sx += step) { const y = peak(sx + px, 0.4); ctx.lineTo(sx, y + (sin((sx + px) * 0.031) > 0.2 ? 14 : 40)); }
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(247,249,251,0.92)';
    ctx.beginPath();
    const line = GY - 300;
    for (let sx = -24; sx <= viewW + 24; sx += step) {
      const y0 = peak(sx + px, 0.4), y1 = peak(sx + step + px, 0.4);
      if (y0 > line && y1 > line) continue;
      const k = Math.floor((sx + px) / step), d0 = clamp((line - y0) * 0.55, 0, 30) * (0.65 + 0.35 * hash(k)), d1 = clamp((line - y1) * 0.55, 0, 30) * (0.65 + 0.35 * hash(k + 1));
      ctx.moveTo(sx, y0); ctx.lineTo(sx + step, y1); ctx.lineTo(sx + step, y1 + d1); ctx.lineTo(sx + step * 0.5, (y0 + y1) / 2 + Math.max(d0, d1) * (0.4 + 0.6 * hash(k * 3.1))); ctx.lineTo(sx, y0 + d0); ctx.closePath();
    }
    ctx.fill();
    const rx = cam * 0.3, ridge = (x) => GY - 104 - 26 * sin(x * 0.004 + 1.2) - 12 * sin(x * 0.011);
    ctx.fillStyle = '#7e8a6e';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (let sx = -20; sx <= viewW + 20; sx += 16) ctx.lineTo(sx, ridge(sx + rx));
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    for (let sx = -((rx % 9) + 9); sx < viewW + 9; sx += 9) {
      const x = sx + rx, k = Math.floor(x / 9), y = ridge(x), h = 10 + 9 * hash(k * 1.7);
      if (hash(k * 3.9) < 0.28) {
        ctx.fillStyle = '#4b6b46';
        ctx.beginPath(); ctx.moveTo(sx - 4.5, y + 4); ctx.lineTo(sx, y - h - 4); ctx.lineTo(sx + 4.5, y + 4); ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = hash(k * 2.3) < 0.5 ? '#a39887' : '#8d8273'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx, y + 3); ctx.lineTo(sx + (hash(k) - 0.5) * 2, y - h); ctx.stroke();
      }
    }
    const fx = cam * 0.62, band = (x) => GY - 34 - 8 * sin(x * 0.009 + 0.4);
    ctx.fillStyle = '#93987f';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (let sx = -20; sx <= viewW + 20; sx += 16) ctx.lineTo(sx, band(sx + fx));
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    for (let sx = -((fx % 23) + 23); sx < viewW + 23; sx += 23) {
      const x = sx + fx, k = Math.floor(x / 23), y = band(x), h = 70 + 70 * hash(k * 4.1), green = hash(k * 6.7) < 0.18;
      const ox = (hash(k * 1.3) - 0.5) * 12;
      if (green) {
        ctx.fillStyle = '#3e6146';
        for (let i = 0; i < 3; i++) { const y0 = y - h * 0.25 - i * h * 0.22, hw = 12 - i * 3; ctx.beginPath(); ctx.moveTo(sx + ox - hw, y0); ctx.lineTo(sx + ox, y0 - h * 0.34); ctx.lineTo(sx + ox + hw, y0); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#5e574d'; ctx.fillRect(sx + ox - 1.5, y - h * 0.25, 3, h * 0.25);
        continue;
      }
      ctx.strokeStyle = '#8f8576'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(sx + ox, y + 2); ctx.lineTo(sx + ox, y - h); ctx.stroke();
      ctx.strokeStyle = '#a0968a'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let j = 1; j < 7; j++) { const yy = y - h * (0.3 + j * 0.1), l = (8 - j) * 1.6; ctx.moveTo(sx + ox, yy); ctx.lineTo(sx + ox - l, yy + l * 0.5); ctx.moveTo(sx + ox, yy); ctx.lineTo(sx + ox + l, yy + l * 0.5); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(225,236,240,0.32)';
    ctx.fillRect(0, top, viewW, GY - top);
  }

  function door(ctx, g, vis) {
    const D = g.level.clearing;
    if (!D) return;
    if (vis(D.x, 160)) gate(ctx, D.x + 34, 1, 1, g, true);
    if (vis(D.exit - 40, 160)) gate(ctx, D.exit - 74, 1, -1, g, false);
  }

  function iris(ctx, g, viewW, offY) {
    const c = g.cut, D = SIM().DOOR;
    if (!c || !D[c.phase]) return;
    const H = g.viewH || 540 + offY / 0.45, far = hypot(viewW, H), k = c.p / D[c.phase];
    const r = c.phase === 'in' ? 1 - smooth(k) : c.phase === 'open' ? smooth(k) : c.phase === 'out' ? 1 - smooth((c.p - 0.45) / (D.out - 0.45)) : smooth(k);
    if (r >= 1) return;
    const x = g.bear.x - g.cam, y = GY - 46 + offY, R = max(0, far * r);
    ctx.fillStyle = '#121a10';
    ctx.beginPath();
    ctx.rect(-10, -10, viewW + 20, H + 20);
    ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU, true);
    ctx.fill();
    if (R > 2) { ctx.strokeStyle = 'rgba(255,248,230,0.16)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); }
  }

  function back(ctx, g, vis, span, withBear) {
    const A = g.level.logging;
    decor(ctx, g, A, vis);
    tape(ctx, A, g);
    if (vis(A.pile.x, 160)) pile(ctx, A, g);
    if (span(A.machine.x - 300, A.machine.x + 300, 60)) machine(ctx, g, A);
    for (const s of A.stumps) if (vis(s.x, 60)) stump(ctx, s, g);
    for (const s of A.stacks) if (vis(s.x, 60)) cover(ctx, g, s, withBear);
  }

  function gate(ctx, x, open, side, g, sign) {
    const k = smooth(open), px = x - side * 34, y = GY - 50;
    if (!sign) side = -side;
    ctx.fillStyle = 'rgba(20,24,16,0.2)'; ellipse(ctx, px, GY + 1, 12, 3);
    ctx.fillStyle = '#e9e6dc'; rrect(ctx, px - 4, GY - 58, 8, 58, 2);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(px - 4, GY - 46, 8, 7); ctx.fillRect(px - 4, GY - 26, 8, 7);
    ctx.fillStyle = '#3b4046'; rrect(ctx, px - 7, y - 7, 14, 14, 3);
    ctx.save();
    ctx.translate(px, y); ctx.rotate(side * (PI / 2) * k * 0.96);
    const L = 86;
    ctx.fillStyle = '#3b4046'; rrect(ctx, side * 6 - 4 - (side < 0 ? 12 : 0), -4.5, 16, 9, 2);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#f4f1e6' : '#d6332a';
      const a = -side * (8 + (L * i) / 6), b = -side * (8 + (L * (i + 1)) / 6);
      ctx.fillRect(min(a, b), -3.2, abs(b - a), 6.4);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(min(-side * 8, -side * (8 + L)), 1.6, L, 1.6);
    ctx.restore();
    if (!sign) return;
    const S = ZS.LABELS.logging.sign, sx = px - side * 4, sy = GY - 104;
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(sx - 2, sy, 4, 48);
    ctx.fillStyle = '#ffd43b'; rrect(ctx, sx - 42, sy - 16, 84, 34, 4);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.strokeRect(sx - 39, sy - 13, 78, 28);
    text(ctx, S[0], sx, sy - 4, 10.5, '#1d1d1d', 900, 0.4, 72);
    text(ctx, S[1], sx, sy + 8, 8.5, '#c0392b', 800, 0.3, 72);
  }

  function front(ctx, g, vis) {
    const A = g.level.logging;
    if (!A) { door(ctx, g, vis); return; }
    if (vis(A.from, 160)) gate(ctx, A.from, A.gates[0].open, 1, g, true);
    if (vis(A.to, 160)) gate(ctx, A.to, A.gates[1].open, -1, g, false);
  }

  function reticle(ctx, g, A) {
    const c = g.cut, r = c && c.aim;
    if (!r || !(r.fx > 0.01) || r.state === 'off') return;
    const x = r.x, y = SIM().AIM.y, lock = r.state === 'lock', reload = r.state === 'reload', a = r.fx;
    const p = c.forester;
    if (!p || p.dead) return;
    const mz = p.h && ZS.muzzle(p), from = mz || [p.x + p.dir * 30, GY - 60];
    ctx.globalAlpha = a;
    if (!lock) ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(20,24,16,0.3)'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = lock ? 'rgba(255,70,70,0.85)' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = lock ? 1.6 : 1.1; ctx.stroke();
    ctx.setLineDash([]);
    const R = lock ? 24 - 3 * smooth(r.k) : 26;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU);
    ctx.moveTo(x - R - 12, y); ctx.lineTo(x - R * 0.42, y); ctx.moveTo(x + R * 0.42, y); ctx.lineTo(x + R + 12, y);
    ctx.moveTo(x, y - R - 12); ctx.lineTo(x, y - R * 0.42); ctx.moveTo(x, y + R * 0.42); ctx.lineTo(x, y + R + 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 5.2; ctx.stroke();
    ctx.strokeStyle = lock ? '#e03131' : reload ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.6;
    if (reload) ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (lock) {
      const pulse = 0.5 + 0.5 * sin(g.time * 16);
      ctx.beginPath(); ctx.arc(x, y, R + 7, -PI / 2, -PI / 2 + r.k * TAU);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 4.4; ctx.stroke();
      ctx.fillStyle = rgba('255,60,60', 0.25 + 0.25 * pulse); circle(ctx, x, y, 6);
      ctx.fillStyle = '#ff2b2b'; circle(ctx, x, y, 2.8);
    }
    ctx.globalAlpha = 1;
  }

  const AIMED = { drive: 1, reach: 1, grip: 1, saw: 1, wait: 1 };

  function target(ctx, g, A) {
    const m = A.machine, t = m.tree, C = SIM().CUT;
    if (!t || !t.mark || t.down || !AIMED[m.state]) return;
    const saw = m.state === 'saw' ? clamp(m.t / C.saw, 0, 1) : 0, x = t.x, y = GY - 116 + sin(g.time * 5) * 3, a = 0.78 + 0.22 * sin(g.time * 8);
    ctx.fillStyle = 'rgba(20,24,16,0.62)'; circle(ctx, x, y, 12.5);
    ctx.strokeStyle = rgba('255,170,90', 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 12.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba('255,122,26', a);
    ctx.beginPath(); ctx.moveTo(x - 6.5, y - 4.5); ctx.lineTo(x + 6.5, y - 4.5); ctx.lineTo(x, y + 5.5); ctx.closePath(); ctx.fill();
    if (saw > 0) {
      ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.arc(x, y, 12.5, -PI / 2, -PI / 2 + saw * TAU); ctx.stroke();
    }
  }

  function cues(ctx, g, viewW, top) {
    const c = g.cut, b = g.bear;
    if (!c || c.phase !== 'play') return;
    const cx = g.cam + viewW / 2, y = top + ((g.viewH || 540) > viewW ? 214 : 72), P = ZS.prompt, L = ZS.LABELS.logging, T = SIM().T;
    const opts = (a, size, wide) => ({ a, size, max: viewW - wide });
    const until = c.taught === null ? T.aim - 0.6 : min(c.taught + 1.4, T.aim - 0.6);
    const teach = smooth((c.t - 0.4) / 0.35) * (1 - smooth((c.t - until) / 0.5));
    const r = c.aim, lock = r.state === 'lock' && !b.covered;
    const intro = (t0) => (t0 === null ? 0 : smooth((c.t - t0) / 0.3) * (1 - smooth((c.t - t0 - 3.8) / 0.5)));
    const hunt = intro(c.aimAt), fore = intro(c.foreAt);
    if (teach > 0.01) {
      P.draw(ctx, g, [['KeyC', L.banner]], cx, y, opts(teach, 16, 40));
      P.draw(ctx, g, [[[], L.rule]], cx, y + 34, opts(teach * 0.92, 13, 60));
    } else if (!lock && hunt > 0.01) P.draw(ctx, g, [['ArrowDown', L.aim]], cx, y, opts(hunt, 16, 40));
    else if (!lock && fore > 0.01) P.draw(ctx, g, [['KeyC', L.forester]], cx, y, opts(fore, 16, 40));
    if (lock) {
      const a = smooth(r.k / 0.08) * (0.8 + 0.2 * abs(sin(g.time * 8)));
      const box = P.draw(ctx, g, [['ArrowDown', b.spot && b.spot.logs ? L.pile : L.duck]], cx + 14, y, opts(a, 17, 60));
      if (box) {
        const rx = box.x - 16, ry = box.y + box.h / 2;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(20,26,16,0.84)'; circle(ctx, rx, ry, 13);
        ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3.6;
        ctx.beginPath(); ctx.arc(rx, ry, 9, -PI / 2, -PI / 2 + r.k * TAU); ctx.stroke();
        ctx.fillStyle = '#ff2b2b'; circle(ctx, rx, ry, 2.6);
        ctx.globalAlpha = 1;
      }
    }
  }

  function badge(ctx, g, viewW) {
    const c = g.cut, p = c.forester, r = c.aim;
    if (!p || p.dead || p.state === 'flee' || c.phase !== 'play') return;
    const left = p.x < g.cam + 8, right = p.x > g.cam + viewW - 8;
    if (!left && !right) return;
    const hot = r.state === 'lock', warm = hot || r.state === 'seek' || p.job === 'turn' || p.job === 'look', s = left ? -1 : 1;
    const x = left ? g.cam + 26 : g.cam + viewW - 26, y = GY - 96, pulse = hot ? 0.5 + 0.5 * sin(g.time * 14) : 0;
    ctx.fillStyle = hot ? rgba('224,49,49', 0.8 + 0.2 * pulse) : 'rgba(20,24,16,0.74)'; circle(ctx, x, y, 17);
    ctx.strokeStyle = warm ? '#ffb347' : 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke();
    ctx.fillStyle = warm ? '#ffb347' : 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(x + s * 26, y); ctx.lineTo(x + s * 20, y - 6); ctx.lineTo(x + s * 20, y + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7a1a'; rrect(ctx, x - 6.5, y - 0.5, 13, 11, 3);
    ctx.fillStyle = '#e9be97'; circle(ctx, x, y - 5.5, 4.6);
    ctx.fillStyle = '#3f5a33'; ctx.fillRect(x - 5.2, y - 11.4, 10.4, 3.4);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 3, y + 4); ctx.lineTo(x - s * 14, y - 1); ctx.stroke();
  }

  function heed(ctx, g) {
    const c = g.cut, p = c.forester;
    if (!p || p.dead || p.react || p.state === 'flee' || c.phase !== 'play' || (p.job !== 'turn' && p.job !== 'aim')) return;
    const turn = p.job === 'turn', k = turn ? smooth(min(1, p.jobT / 0.25)) : 1, x = p.x, y = GY - 128 - 4 * k + sin(g.time * 9) * (turn ? 1.5 : 0);
    ctx.globalAlpha = k;
    ctx.fillStyle = turn ? '#fffdf5' : '#e03131';
    circle(ctx, x, y, 12);
    ctx.beginPath(); ctx.moveTo(x - 4, y + 10); ctx.lineTo(x + 2, y + 17); ctx.lineTo(x + 5, y + 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,16,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke();
    text(ctx, turn ? '?' : '!', x, y + 0.5, 15, turn ? '#1d2a18' : '#ffffff', 900, 0, 20);
    ctx.globalAlpha = 1;
  }

  function over(ctx, g, viewW, top) {
    const A = g.level.logging;
    if (!A || !g.cut || g.cut.phase === 'out') return;
    if (g.cut.phase === 'play') target(ctx, g, A);
    heed(ctx, g);
    badge(ctx, g, viewW);
    reticle(ctx, g, A);
    cues(ctx, g, viewW, top);
  }

  ZS.loggingArt = { trunk, crown, back, front, over, backdrop, iris, site };
})();
