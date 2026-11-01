// Side-view drawing: parallax Tatras, the forest, the village, hunters with crosshairs and the bear.
(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const emojiCache = new Map();
  const SKY = [['#a7d8f5', '#eaf7ff'], ['#7cc4ef', '#d8f1ff'], ['#efb57c', '#fbe6c8']];
  const BUK = ['#7cc35a', '#4f9a43', '#d8892f'];
  const BREZA = ['#a8d66a', '#8cc152', '#e6c34a'];
  const PEOPLE = {
    walker:  { coat: '#e8590c', legs: '#4b5a3a', hat: '#3d4f2f' },
    posed:   { coat: '#e8590c', legs: '#4b5a3a', hat: '#3d4f2f' },
    ztmh:    { coat: '#2f4f3a', legs: '#26331f', hat: '#1f2f22' },
    poacher: { coat: '#2b2b2b', legs: '#1a1a1a', hat: '#111111' },
    picker:  { coat: '#7b5ea7', legs: '#3a3a5a', hat: '#c0392b' },
    tourist: { coat: '#2f86c8', legs: '#33415c', hat: null },
  };

  function emoji(ctx, ch, x, y, size) {
    const key = ch + size;
    let c = emojiCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = Math.ceil(size * 1.5);
      const e = c.getContext('2d');
      e.font = size + 'px ' + EMOJI_FONT;
      e.textAlign = 'center'; e.textBaseline = 'middle';
      e.fillText(ch, c.width / 2, c.height / 2 + size * 0.05);
      emojiCache.set(key, c);
    }
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
  }

  function label(ctx, text, x, y, size, color, weight) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#2a2f22';
    ctx.fillText(text, x, y);
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

  function background(ctx, g, viewW, offY) {
    const L = g.level, s = g.seasonIdx;
    const sky = ctx.createLinearGradient(0, -offY, 0, GY);
    sky.addColorStop(0, SKY[s][0]); sky.addColorStop(1, SKY[s][1]);
    ctx.fillStyle = sky; ctx.fillRect(0, -offY, viewW, GY + offY);

    const mx = g.cam * 0.15, pts = L.mountains;
    ctx.fillStyle = '#8399ae';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (const [x, y] of pts) { const sx = x - mx; if (sx > -250 && sx < viewW + 250) ctx.lineTo(sx, y); }
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f6f8';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], sx = x - mx;
      if (sx < -100 || sx > viewW + 100 || y > GY - 250 || y > pts[i - 1][1] || y > pts[i + 1][1]) continue;
      const l = pts[i - 1], r = pts[i + 1];
      ctx.beginPath(); ctx.moveTo(sx, y);
      ctx.lineTo(sx + (l[0] - x) * 0.25, y + (l[1] - y) * 0.25);
      ctx.lineTo(sx + (r[0] - x) * 0.25, y + (r[1] - y) * 0.25);
      ctx.closePath(); ctx.fill();
    }

    const rx = g.cam * 0.35;
    ctx.fillStyle = '#5c8a5f';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (const [x, y] of L.ridge) { const sx = x - rx; if (sx > -200 && sx < viewW + 200) ctx.lineTo(sx, y); }
    ctx.lineTo(viewW, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#46704b';
    for (let sx = -((rx % 26) + 26); sx < viewW + 26; sx += 26) {
      const y = ZS.silhouetteY(L.ridge, sx + rx);
      ctx.beginPath(); ctx.moveTo(sx - 10, y + 8); ctx.lineTo(sx, y - 24); ctx.lineTo(sx + 10, y + 8); ctx.closePath(); ctx.fill();
    }
  }

  // The back row moves a little slower than the main layer and sits in a light haze.
  function backForest(ctx, g, viewW, offY) {
    const px = g.cam * 0.85, season = g.seasonIdx;
    const leaf = ['#4f8a45', '#3d7238', '#a8692c'][season];
    ctx.save();
    ctx.translate(-Math.round(px), 0);
    for (const t of g.level.backTrees) {
      if (t.x < px - 120 || t.x > px + viewW + 120) continue;
      ctx.fillStyle = '#5e574d';
      ctx.fillRect(t.x - t.w / 2, GY - t.h * (t.kind === 'smrek' ? 0.4 : 1), t.w, t.h * (t.kind === 'smrek' ? 0.4 : 1));
      if (t.kind === 'smrek') {
        ctx.fillStyle = '#28503a';
        for (let i = 0; i < 3; i++) {
          const y0 = GY - t.h * 0.3 - i * t.h * 0.22, hw = t.r * (1 - i * 0.25);
          ctx.beginPath(); ctx.moveTo(t.x - hw, y0); ctx.lineTo(t.x, y0 - t.h * 0.36); ctx.lineTo(t.x + hw, y0); ctx.closePath(); ctx.fill();
        }
      } else {
        ctx.fillStyle = leaf;
        circle(ctx, t.x, GY - t.h - t.r * 0.3, t.r);
        circle(ctx, t.x - t.r * 0.7, GY - t.h + t.r * 0.1, t.r * 0.65);
        circle(ctx, t.x + t.r * 0.7, GY - t.h + t.r * 0.05, t.r * 0.7);
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(225,238,242,0.28)';
    ctx.fillRect(0, -offY, viewW, GY + offY);
  }

  function ground(ctx, cam, viewW) {
    ctx.fillStyle = '#6b4f35'; ctx.fillRect(cam - 10, GY, viewW + 20, 2000);
    ctx.fillStyle = '#5f9a3e'; ctx.fillRect(cam - 10, GY, viewW + 20, 14);
    ctx.fillStyle = '#86674a'; ctx.fillRect(cam - 10, GY + 24, viewW + 20, 14);
    ctx.strokeStyle = '#4f8a35'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = Math.floor(cam / 37) * 37; x < cam + viewW + 37; x += 37) {
      ctx.moveTo(x, GY + 2); ctx.lineTo(x - 4, GY - 8); ctx.moveTo(x, GY + 2); ctx.lineTo(x + 3, GY - 9);
    }
    ctx.stroke();
  }

  function trunk(ctx, t) {
    const top = t.kind === 'smrek' ? GY - t.h * 0.42 : GY - t.h;
    const half = t.w / 2;
    ctx.fillStyle = { buk: '#9b958b', smrek: '#6b4a32', breza: '#f1efe8', jablon: '#7a5534' }[t.kind];
    ctx.beginPath();
    ctx.moveTo(t.x - half - 7, GY); ctx.lineTo(t.x - half, GY - 16); ctx.lineTo(t.x - half + 2, top);
    ctx.lineTo(t.x + half - 2, top); ctx.lineTo(t.x + half, GY - 16); ctx.lineTo(t.x + half + 7, GY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.fillRect(t.x + t.w * 0.12, top, t.w * 0.34, GY - top - 16);
    if (t.kind === 'breza') {
      ctx.fillStyle = '#2b2b2b';
      for (let y = top + 18, i = 0; y < GY - 12; y += 24, i++) ctx.fillRect(t.x - half + (i % 2) * 4, y, t.w * 0.55, 3);
    }
  }

  function crown(ctx, t, season) {
    if (t.kind === 'smrek') {
      const base = GY - t.h * 0.3, top = GY - t.h, n = 4;
      ctx.fillStyle = t.shade < 0.5 ? '#2c5a37' : '#336540';
      for (let i = 0; i < n; i++) {
        const y0 = base - ((base - top) * i) / n, hw = t.r * (1 - i / (n + 0.8));
        ctx.beginPath(); ctx.moveTo(t.x - hw, y0); ctx.lineTo(t.x, y0 - ((base - top) / n) * 1.7); ctx.lineTo(t.x + hw, y0);
        ctx.closePath(); ctx.fill();
      }
      return;
    }
    const r = t.r, cy = GY - t.h - (t.kind === 'jablon' ? 26 : 0);
    const col = t.kind === 'breza' ? BREZA[season] : t.kind === 'jablon' ? '#5aa548' : BUK[season];
    ctx.fillStyle = col;
    circle(ctx, t.x, cy - r * 0.35, r);
    circle(ctx, t.x - r * 0.72, cy + r * 0.05, r * 0.66);
    circle(ctx, t.x + r * 0.7, cy, r * 0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    circle(ctx, t.x + r * 0.35, cy + r * 0.05, r * 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    circle(ctx, t.x - r * 0.3, cy - r * 0.6, r * 0.42);
    if (t.kind === 'jablon') {
      ctx.fillStyle = '#d63a2f';
      [[-30, -10], [12, -40], [34, 6], [-8, 14], [-44, -36]].forEach(([dx, dy]) => circle(ctx, t.x + dx, cy + dy, 6));
    }
  }

  function tree(ctx, t, season) { trunk(ctx, t); crown(ctx, t, season); }

  function house(ctx, h) {
    const x0 = h.x - h.w / 2, top = GY - 112;
    ctx.fillStyle = '#efe3c8'; ctx.fillRect(x0, top, h.w, 112);
    ctx.fillStyle = '#8d3f2d'; ctx.fillRect(h.x + h.w * 0.22, top - 54, 14, 32);
    ctx.fillStyle = '#b5543c';
    ctx.beginPath(); ctx.moveTo(x0 - 14, top + 4); ctx.lineTo(h.x, top - 62); ctx.lineTo(x0 + h.w + 14, top + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 18, top + 28, 36, 32); ctx.fillRect(x0 + h.w - 54, top + 28, 36, 32);
    ctx.fillStyle = '#a8d4ef'; ctx.fillRect(x0 + 21, top + 31, 30, 26); ctx.fillRect(x0 + h.w - 51, top + 31, 30, 26);
    ctx.fillStyle = '#7a4b2a'; ctx.fillRect(h.x - 15, GY - 54, 30, 54);
  }

  function post(ctx, p) {
    const top = GY - 150;
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x - 40, GY); ctx.lineTo(p.x - 26, top); ctx.moveTo(p.x + 40, GY); ctx.lineTo(p.x + 26, top);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = GY - 30; y > top; y -= 40) { ctx.moveTo(p.x - 36, y); ctx.lineTo(p.x + 36, y - 20); }
    ctx.stroke();
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(p.x - 36, top - 4, 72, 8);
    ctx.fillStyle = '#7a5534'; ctx.fillRect(p.x - 30, top - 54, 60, 50);
    ctx.fillStyle = '#2a1d12'; ctx.fillRect(p.x - 23, top - 45, 46, 18);
    ctx.fillStyle = '#4a321c';
    ctx.beginPath(); ctx.moveTo(p.x - 40, top - 52); ctx.lineTo(p.x, top - 78); ctx.lineTo(p.x + 40, top - 52); ctx.closePath(); ctx.fill();
  }

  function log(ctx, lg) {
    ctx.fillStyle = '#7a5534'; rrect(ctx, lg.x - lg.w / 2, GY - lg.h, lg.w, lg.h, lg.h / 2);
    ctx.fillStyle = '#c9a77a'; circle(ctx, lg.x + lg.w / 2 - lg.h / 2, GY - lg.h / 2, lg.h / 2 - 3);
    ctx.strokeStyle = '#9c7b52'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lg.x + lg.w / 2 - lg.h / 2, GY - lg.h / 2, lg.h / 4, 0, Math.PI * 2); ctx.stroke();
  }

  function sign(ctx, s) {
    ctx.fillStyle = '#5a3d22';
    if (s.billboard) {
      ctx.fillRect(s.x - 72, GY - 72, 8, 72); ctx.fillRect(s.x + 64, GY - 72, 8, 72);
      ctx.fillStyle = '#fff8e6'; ctx.fillRect(s.x - 100, GY - 176, 200, 106);
      ctx.strokeStyle = '#3b3b3b'; ctx.lineWidth = 3; ctx.strokeRect(s.x - 100, GY - 176, 200, 106);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(s.x - 100, GY - 176, 200, 8);
      label(ctx, 'Medveď je za', s.x, GY - 146, 18, '#1d1d1d');
      label(ctx, 'každým stromom!', s.x, GY - 122, 18, '#1d1d1d');
      label(ctx, s.by, s.x, GY - 92, 12, '#555', 500);
      return;
    }
    ctx.fillRect(s.x - 3, GY - 62, 6, 62);
    ctx.font = '700 14px system-ui, sans-serif';
    const bw = Math.max(124, ctx.measureText(s.text).width + 22);
    ctx.fillStyle = '#2f5d3a'; ctx.fillRect(s.x - bw / 2, GY - 88, bw, 28);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.text, s.x, GY - 74);
  }

  function den(ctx, x, glow, name, t) {
    ctx.fillStyle = '#6d5a46';
    ctx.beginPath(); ctx.moveTo(x - 150, GY); ctx.quadraticCurveTo(x, GY - 230, x + 150, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#241a12';
    ctx.beginPath(); ctx.moveTo(x - 40, GY); ctx.arc(x, GY, 40, Math.PI, 0); ctx.closePath(); ctx.fill();
    if (glow) {
      ctx.strokeStyle = 'rgba(255,215,90,' + (0.5 + 0.4 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, GY, 48, Math.PI, 0); ctx.stroke();
    }
    label(ctx, name, x, GY - 135, 15);
  }

  function item(ctx, it, time) {
    const x = it.x;
    if (it.hidden) return;
    if (it.type === 'fish') {
      // One descriptor per trout, so js/scenery.js can turn it along its jump arc.
      const f = it.fd || (it.fd = { id: 'fish' + Math.round(it.x0 || it.x), wiggle: (it.x0 || it.x) % 6 });
      f.x = x; f.y = it.y; f.dir = it.dir || 1;
      if (ZS.scenery) ZS.scenery.fish(ctx, f, time);
      else emoji(ctx, '🐟', x, it.y, 20);
      return;
    }
    if (it.type === 'container') {
      if (ZS.scenery) ZS.scenery.container(ctx, x, it.locked);
      else { ctx.fillStyle = '#3d6b45'; ctx.fillRect(x - 45, GY - 70, 90, 70); }
      return;
    }
    if (it.y !== undefined) {
      if (it.type === 'wildhoney') {
        ctx.fillStyle = '#2a1d12'; ellipse(ctx, x, it.y + 4, 9, 14);
        emoji(ctx, '🐝', x + 15, it.y - 15, 11);
      }
      emoji(ctx, ZS.FOOD[it.type].emoji, x, it.y, 18);
      return;
    }
    if (it.type === 'berry') {
      ctx.fillStyle = '#3f7f3a';
      circle(ctx, x, GY - 16, 20); circle(ctx, x - 15, GY - 9, 14); circle(ctx, x + 16, GY - 9, 14);
      emoji(ctx, '🫐', x, GY - 22, 16);
    } else if (it.type === 'ants') {
      ctx.fillStyle = '#8a6a48'; ctx.beginPath(); ctx.ellipse(x, GY, 24, 18, 0, Math.PI, 0); ctx.fill();
      emoji(ctx, '🐜', x, GY - 20, 14);
    } else if (it.type === 'corn') {
      ctx.fillStyle = '#d9b84a'; ctx.beginPath(); ctx.ellipse(x, GY, 24, 12, 0, Math.PI, 0); ctx.fill();
      emoji(ctx, '🌽', x, GY - 16, 20);
    } else if (it.type === 'hive') {
      ctx.fillStyle = '#d9a441'; ctx.fillRect(x - 15, GY - 38, 30, 38);
      ctx.fillStyle = '#b8862e'; ctx.fillRect(x - 15, GY - 26, 30, 3); ctx.fillRect(x - 15, GY - 14, 30, 3);
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 18, GY - 42, 36, 5);
      emoji(ctx, '🐝', x + 14, GY - 52, 13);
    } else if (it.type === 'bin') {
      emoji(ctx, '🗑️', x, GY - 18, 32);
      if (it.locked) emoji(ctx, '🔒', x + 12, GY - 38, 14);
    } else {
      emoji(ctx, ZS.FOOD[it.type].emoji, x, GY - 12, 22);
    }
  }

  function bear(ctx, b, hidden) {
    const fur = hidden ? '#3d2716' : '#6b4226', far = hidden ? '#33200f' : '#56351d', snout = hidden ? '#4f331f' : '#9a6a44';
    ctx.save();
    ctx.translate(b.x, b.y);
    const sc = hidden ? 0.9 : 1;
    ctx.scale(b.dir * sc, b.crouch ? sc * 0.78 : sc);
    const sw = b.moving ? Math.sin(b.walkT * 13) * 7 : 0;
    ctx.fillStyle = far; rrect(ctx, -30 - sw, -24, 12, 24, 4); rrect(ctx, 12 + sw, -24, 12, 24, 4);
    ctx.fillStyle = fur; rrect(ctx, -24 + sw, -24, 12, 24, 4); rrect(ctx, 20 - sw, -24, 12, 24, 4);
    ellipse(ctx, 0, -34, 40, 22);
    ellipse(ctx, 14, -46, 19, 13);
    circle(ctx, -39, -40, 5);
    circle(ctx, 38, -44, 15);
    circle(ctx, 31, -57, 6);
    ctx.fillStyle = snout; ellipse(ctx, 51, -40, 10, 7);
    ctx.fillStyle = '#1d1209'; circle(ctx, 59, -42, 3); circle(ctx, 42, -48, 2.2);
    ctx.restore();
  }

  // Behind a trunk the bear stands upright and is far wider than the tree.
  function bearUpright(ctx, b) {
    const t = b.hideT, w = b.hiding.w, fur = '#40250f';
    const breathe = b.pose === 'stiff' ? Math.max(0, Math.sin(t * 2.4)) : 0.3;
    const shiver = b.pose === 'sweat' || b.danger ? Math.sin(t * 55) * 1.3 : 0;
    const rx = w / 2 - 3 + breathe * 2;
    ctx.save();
    ctx.translate(b.x + shiver, GY);
    ctx.fillStyle = fur;
    rrect(ctx, -20, -28, 16, 28, 7); rrect(ctx, 4, -28, 16, 28, 7);
    ellipse(ctx, 0, -70, rx, 46);
    circle(ctx, 0, -126, 22);
    circle(ctx, -25, -142, 9); circle(ctx, 25, -142, 9);
    ctx.fillStyle = '#3b2414'; circle(ctx, -25, -142, 4.5); circle(ctx, 25, -142, 4.5);
    ctx.restore();
  }

  // Stand-in until js/bear.js provides ZS.drawBearClimbing.
  function bearClimbing(ctx, b) {
    const fur = '#5b3820', x = b.climbing.x, y = b.y;
    const sw = b.climbV ? Math.sin(b.climbT * 10) * 6 : 0;
    ctx.fillStyle = fur;
    ellipse(ctx, x, y - 48, 22, 44);
    circle(ctx, x + b.dir * 4, y - 96, 17);
    circle(ctx, x - 9, y - 110, 6); circle(ctx, x + 13, y - 110, 6);
    rrect(ctx, x - 27, y - 82 + sw, 54, 10, 5);
    rrect(ctx, x - 25, y - 26 - sw, 50, 10, 5);
    ctx.fillStyle = '#9a6a44'; ellipse(ctx, x + b.dir * 12, y - 92, 7, 6);
  }

  // The parts of each pose that come out in front of the trunk.
  function bearFront(ctx, b, time) {
    const t = b.hideT, w = b.hiding.w, x = b.x, fur = '#40250f';
    if (b.pose === 'peek') {
      const p = Math.max(0, Math.min(1, (Math.sin(t * 1.4 - 1) - 0.1) * 2.2));
      if (p < 0.02) return;
      const s = b.peekSide, hx = x + s * (w / 2 + 2) * p, hy = GY - 126;
      ctx.fillStyle = fur; ellipse(ctx, x + s * (w / 2 - 1), GY - 98, 8, 10);
      circle(ctx, hx, hy, 21); circle(ctx, hx + s * 9, hy - 18, 8);
      ctx.fillStyle = '#9a6a44'; ellipse(ctx, hx + s * 12, hy + 6, 11, 8);
      ctx.fillStyle = '#1d1209'; circle(ctx, hx + s * 21, hy + 3, 3.2);
      ctx.fillStyle = '#fff'; circle(ctx, hx + s * 4, hy - 6, 4.5);
      ctx.fillStyle = '#1d1209'; circle(ctx, hx + s * 6, hy - 6, 2.4);
    } else if (b.pose === 'hug') {
      ctx.fillStyle = fur;
      ellipse(ctx, x - w / 2 + 7, GY - 86, 10, 8); ellipse(ctx, x + w / 2 - 7, GY - 92, 10, 8);
      ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = 1.5;
      for (const [cx, cy, d] of [[x - w / 2 + 12, GY - 86, 1], [x + w / 2 - 12, GY - 92, -1]]) {
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) { ctx.moveTo(cx, cy + i * 4); ctx.lineTo(cx + d * 5, cy + i * 4); }
        ctx.stroke();
      }
      emoji(ctx, '❤️', x + w / 2 + 16, GY - 150 - Math.sin(time * 3) * 5, 16);
    } else if (b.pose === 'sweat') {
      emoji(ctx, '💦', x + 32, GY - 152, 16);
    }
  }

  function bubble(ctx, x, y, text, t) {
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.font = '600 15px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 24, h = 30, bx = x - w / 2, by = y - h;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rrect(ctx, bx + 2, by + 3, w, h, 12);
    ctx.fillStyle = '#fff'; rrect(ctx, bx, by, w, h, 12);
    ctx.beginPath(); ctx.moveTo(x - 8, y - 1); ctx.lineTo(x + 2, y + 12); ctx.lineTo(x + 8, y - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d1d1d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2 + 1);
    ctx.globalAlpha = 1;
  }

  function person(ctx, x, dir, kind, aim, walk) {
    const c = PEOPLE[kind], y = GY, sw = Math.sin(walk * 9) * 4;
    ctx.fillStyle = c.legs; ctx.fillRect(x - 6 + sw, y - 26, 5, 26); ctx.fillRect(x + 1 - sw, y - 26, 5, 26);
    ctx.fillStyle = c.coat; rrect(ctx, x - 9, y - 58, 18, 34, 5);
    ctx.fillStyle = '#f0c8a0'; circle(ctx, x, y - 66, 8);
    hat(ctx, x, y - 66, kind, c);
    if (kind === 'picker') { ctx.fillStyle = '#a0763f'; ctx.beginPath(); ctx.arc(x + dir * 14, y - 34, 8, 0, Math.PI); ctx.fill(); }
    if (kind === 'tourist') { ctx.fillStyle = '#222'; ctx.fillRect(x + dir * 12 - 2, y - 74, 5, 9); }
    if (aim) rifle(ctx, x + dir * 4, y - 48, aim);
  }

  function hat(ctx, x, y, kind, c) {
    ctx.fillStyle = c.hat;
    if (kind === 'walker' || kind === 'posed') {
      ellipse(ctx, x, y - 7, 12, 3); ctx.fillRect(x - 7, y - 15, 14, 8);
      ctx.strokeStyle = '#2e6b3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 5, y - 13); ctx.lineTo(x + 11, y - 22); ctx.stroke();
    } else if (kind === 'ztmh') {
      ctx.fillRect(x - 8, y - 12, 16, 6); ctx.fillRect(x, y - 8, 11, 3);
    } else if (kind === 'poacher') {
      ctx.beginPath(); ctx.arc(x, y - 2, 9, Math.PI, 0); ctx.fill();
    } else if (kind === 'picker') {
      ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x, y - 11); ctx.lineTo(x + 10, y + 2); ctx.closePath(); ctx.fill();
    }
  }

  function rifle(ctx, x, y, [ax, ay]) {
    const a = Math.atan2(ay - y, ax - x);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 36, y + Math.sin(a) * 36); ctx.stroke();
  }

  function postHunter(ctx, s) {
    const y = GY - 186;
    ctx.fillStyle = PEOPLE.posed.coat; rrect(ctx, s.x - 9, y + 4, 18, 14, 4);
    ctx.fillStyle = '#f0c8a0'; circle(ctx, s.x, y, 7);
    hat(ctx, s.x, y, 'posed', PEOPLE.posed);
    rifle(ctx, s.x, y + 8, [s.cross, GY - 30]);
  }

  function crosshair(ctx, s, quick) {
    const x = s.cross, y = GY - 30, locked = s.lock > 0;
    const from = s.kind === 'posed' ? [s.x, GY - 178] : [s.x + s.dir * 20, GY - 48];
    ctx.strokeStyle = locked ? 'rgba(224,49,49,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = s.blocked ? 'rgba(150,150,150,0.7)' : locked ? '#e03131' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.moveTo(x - 30, y); ctx.lineTo(x - 9, y); ctx.moveTo(x + 9, y); ctx.lineTo(x + 30, y);
    ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 9); ctx.moveTo(x, y + 9); ctx.lineTo(x, y + 30);
    ctx.stroke();
    if (locked) {
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, s.lock / (s.aimTime * quick)) * Math.PI * 2); ctx.stroke();
    }
  }

  function drone(ctx, d, t) {
    ctx.fillStyle = 'rgba(255,240,150,0.2)';
    ctx.beginPath(); ctx.moveTo(d.x - 8, d.y + 6); ctx.lineTo(d.x + 8, d.y + 6); ctx.lineTo(d.x + d.beam, GY); ctx.lineTo(d.x - d.beam, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#30343a'; rrect(ctx, d.x - 16, d.y - 5, 32, 10, 4);
    ctx.fillRect(d.x - 24, d.y - 8, 48, 3);
    const w = 10 + Math.abs(Math.sin(t * 40)) * 6;
    ellipse(ctx, d.x - 24, d.y - 10, w, 2); ellipse(ctx, d.x + 24, d.y - 10, w, 2);
    ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b30' : '#7a1d18'; circle(ctx, d.x, d.y + 6, 2.5);
  }

  // Plain shapes for the new scenery, used only until js/scenery.js provides the real drawings.
  const FALLBACK = {
    koliba(ctx, x) {
      ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 100, GY - 110, 200, 110);
      ctx.fillStyle = '#3d2a17'; ctx.beginPath(); ctx.moveTo(x - 115, GY - 105); ctx.lineTo(x, GY - 160); ctx.lineTo(x + 115, GY - 105); ctx.fill();
    },
    pen(ctx, x1, x2) {
      ctx.strokeStyle = '#a9b3b6'; ctx.lineWidth = 1.5;
      for (const y of [GY - 42, GY - 24]) { ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); }
      ctx.fillStyle = '#6b4a2b'; for (let x = x1; x <= x2; x += 70) ctx.fillRect(x - 2, GY - 50, 4, 50);
    },
    sheep(ctx, s) { ctx.fillStyle = '#f2efe6'; ellipse(ctx, s.x, GY - 22, 24, 14); ctx.fillStyle = '#333'; circle(ctx, s.x + s.dir * 22, GY - 26, 6); },
    dog(ctx, d) { ctx.fillStyle = '#f4f1ea'; ellipse(ctx, d.x, GY - 26, 30, 14); circle(ctx, d.x + d.dir * 28, GY - 36, 10); },
    river(ctx, x1, x2) { ctx.fillStyle = '#4f8fc0'; ctx.fillRect(x1, GY - 6, x2 - x1, 140); },
    stone(ctx, x, w) { ctx.fillStyle = '#8c8c86'; ellipse(ctx, x, GY - 4, w / 2, 8); },
    hotel(ctx, x) { ctx.fillStyle = '#e8dcc6'; ctx.fillRect(x - 230, GY - 230, 460, 230); },
    skiLift(ctx, x) { ctx.strokeStyle = '#555'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY - 260); ctx.stroke(); },
    haystack(ctx, x) { ctx.fillStyle = '#c9a54a'; ellipse(ctx, x, GY - 45, 32, 50); },
    chapel(ctx, x) { ctx.fillStyle = '#f5f2ea'; ctx.fillRect(x - 45, GY - 110, 90, 110); },
  };

  ZS.draw = function (g, ctx, viewW, offY) {
    const L = g.level, b = g.bear, cam = g.cam, season = g.seasonIdx;
    const vis = (x, m) => x > cam - m && x < cam + viewW + m;
    ctx.save();
    ctx.translate(0, offY);
    background(ctx, g, viewW, offY);
    backForest(ctx, g, viewW, offY);
    ctx.translate(-Math.round(cam), 0);
    ground(ctx, cam, viewW);
    const S = Object.assign({}, FALLBACK, ZS.scenery || {});
    const span = (a, z, m) => z > cam - m && a < cam + viewW + m;
    if (L.river && span(L.river.from, L.river.to, 60)) {
      S.river(ctx, L.river.from, L.river.to, g.time);
      for (const st of L.stones) S.stone(ctx, st.x, st.w, g.time);
    }
    den(ctx, L.startDen, false, 'Jarný brloh', g.time);
    den(ctx, L.winterDen, g.fat >= CFG.FAT_GOAL, 'Zimný brloh', g.time);
    for (const h of L.houses) if (vis(h.x, 220)) house(ctx, h);
    // The salaš, the hotel and the rest of the new scenery stand in the background, behind the trees.
    for (const hx of L.haystacks || []) if (vis(hx, 80)) S.haystack(ctx, hx, g.time);
    if (L.salas && span(L.salas.from, L.salas.to, 300)) {
      S.koliba(ctx, L.salas.koliba, g.time);
      for (const sh of g.sheep) S.sheep(ctx, sh, g.time);
      S.pen(ctx, L.salas.pen[0], L.salas.pen[1], g.time);
    }
    if (L.hotel) {
      if (vis(L.hotel.x, L.hotel.w)) S.hotel(ctx, L.hotel.x, g.time);
      // The lift cable reaches far to the left of its pylon; the drawing culls itself.
      if (span(L.hotel.lift - 800, L.hotel.lift + 400, 0)) S.skiLift(ctx, L.hotel.lift, g.time);
      if (vis(L.hotel.chapel, 120)) S.chapel(ctx, L.hotel.chapel, g.time);
    }
    // A bear behind or on a tree is drawn in that tree's own slot, so the trees keep their order
    // and nothing jumps in front of anything when it hides. After a hit it fades instead of blinking.
    const hurt = b.inv > 0 ? 0.45 + 0.35 * Math.cos(g.time * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, g.time); ctx.globalAlpha = 1; };
    for (const t of L.trees) {
      if (!vis(t.x, 170)) continue;
      if (t === b.climbing) {
        trunk(ctx, t);
        withBear(ZS.drawBearClimbing || bearClimbing);
        crown(ctx, t, season);
      } else if (t === b.hideTree && b.hideBlend > 0) {
        // While fading back out after ↓ is released, a stable stand-in keeps the hiding pose.
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: t }));
        withBear(ZS.drawBearBehindTree || bearUpright, who, b.hideBlend);
        tree(ctx, t, season);
        withBear(ZS.drawBearInFront || bearFront, who, b.hideBlend);
      } else {
        tree(ctx, t, season);
      }
    }
    for (const s of L.signs) if (vis(s.x, 160)) sign(ctx, s);
    for (const p of L.posts) if (vis(p.x, 80)) post(ctx, p);
    for (const lg of L.logs) if (vis(lg.x, 80)) log(ctx, lg);
    for (const it of L.items) if (!it.eaten && vis(it.x, 60)) item(ctx, it, g.time);
    // People come from js/people.js; each keeps one descriptor (p.h, s.h) so its animation eases between frames.
    ZS.fx.drawBack(ctx, g, viewW);
    for (const p of g.people) {
      if (!vis(p.x, 40)) continue;
      const h = p.h || (p.h = { aimAt: [0, 0] });
      h.x = p.x; h.dir = p.dir; h.kind = p.kind;
      h.state = p.state === 'flee' ? 'run' : p.kind === 'tourist' && p.filmCd > 7 ? 'film' : 'walk';
      h.aimAt[0] = b.x; h.aimAt[1] = GY - 50;
      ZS.drawHuman(ctx, h, g.time);
    }
    for (const d of g.dogs) if (vis(d.x, 60)) S.dog(ctx, d, g.time);
    for (const s of g.shooters) {
      if (!vis(s.x, 60)) continue;
      if (s.kind === 'posed') { ZS.drawPostHunter(ctx, s, g.time); continue; }
      const h = s.h || (s.h = { aimAt: [0, 0] });
      h.x = s.x; h.dir = s.dir; h.kind = s.kind;
      h.scared = s.scaredT > 0;
      h.state = s.scaredT > 0 ? 'run' : s.lock > 0 || s.kick > 0 ? 'aim' : 'walk';
      h.kick = s.kick || 0;
      h.aimAt[0] = s.cross; h.aimAt[1] = GY - 30;
      ZS.drawHuman(ctx, h, g.time);
    }
    // js/bear.js provides the animated bear; the simple shapes here are the fallback.
    if (!b.climbing && (b.hideBlend || 0) < 1) withBear(ZS.drawBear || ((c, bb) => bear(c, bb, false)), b, 1 - (b.hideBlend || 0));
    // Wading: the water closes over the bear's paws.
    if (b.inWater) {
      ctx.fillStyle = 'rgba(79,143,192,0.62)'; ellipse(ctx, b.x, GY - 2, 66, 13);
      ctx.strokeStyle = 'rgba(230,245,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(b.x, GY - 6, 50 + Math.sin(g.time * 6) * 6, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // A crosshair is close: warn the player and show where the next trunk is.
    if (b.warn && !b.hiding) {
      const red = g.shooters.some((s) => s.lock > 0);
      label(ctx, '!', b.x, GY - 100 - Math.abs(Math.sin(g.time * 8)) * 6, 30, red ? '#e03131' : '#e8a400');
      if (L.trees.some((t) => t.hide && Math.abs(t.x - b.x) < t.w / 2 + 40)) label(ctx, '↓ za strom', b.x, GY - 134, 14, '#1d1d1d');
    }
    // Breath after sprinting, and the half second it takes to eat.
    if (b.stamina < 0.99 && !b.hiding && !b.climbing) {
      ctx.fillStyle = 'rgba(20,26,16,0.55)'; ctx.fillRect(b.x - 26, GY - 82, 52, 6);
      ctx.fillStyle = b.tired ? '#e03131' : '#7cc4ef'; ctx.fillRect(b.x - 26, GY - 82, 52 * b.stamina, 6);
    }
    if (b.eating) {
      ctx.strokeStyle = '#2f7d4f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x + b.dir * 34, GY - 70, 11, -Math.PI / 2, -Math.PI / 2 + (b.eatT / 0.5) * Math.PI * 2); ctx.stroke();
    }
    for (const d of g.drones) drone(ctx, d, g.time);
    const quick = g.flags.cull ? 0.85 : g.flags.emergency ? 0.92 : 1;
    for (const s of g.shooters) if (vis(s.cross, 60) && Math.abs(s.x - b.x) < 1500) crosshair(ctx, s, quick);
    for (const sh of g.shots) {
      const a = sh.t / 0.3;
      ctx.strokeStyle = 'rgba(255,220,120,' + a + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sh.x1, sh.y1); ctx.lineTo(sh.x2, sh.y2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,190,80,' + a + ')'; circle(ctx, sh.x1, sh.y1, 9);
    }
    for (const p of g.particles) {
      ctx.fillStyle = p.color;
      if (p.round) circle(ctx, p.x, p.y, 2.6); else ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ZS.fx.drawFront(ctx, g, viewW);
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.min(1, f.t);
      label(ctx, f.text, f.x, f.y - (1.6 - f.t) * 30, 16, f.color);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) bubble(ctx, b.x, b.climbing ? b.y - 128 : GY - 180, g.bubble.text, g.bubble.t);
    ctx.restore();
  };
})();
