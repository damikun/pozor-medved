// Drawing. The static ground is painted once into an offscreen canvas; everything else every frame.
(function () {
  const { CFG } = ZS;
  const { dist, clamp } = ZS.util;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const emojiCache = new Map();

  function emoji(ctx, ch, x, y, size, alpha) {
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
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
    ctx.globalAlpha = 1;
  }

  function label(ctx, text, x, y, size, color) {
    ctx.font = '700 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#2a2f22';
    ctx.fillText(text, x, y);
  }

  function polyline(ctx, pts, width, color, dash) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ZS.buildGround = function (w) {
    const c = document.createElement('canvas');
    c.width = CFG.W; c.height = CFG.H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b8d48c'; ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.fillStyle = '#7da35a';
    for (const t of w.trees) { ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 2.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#c6de9a';
    for (const cl of w.clearings) { ctx.beginPath(); ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#dcd5b3';
    ctx.beginPath(); ctx.arc(w.village.x, w.village.y, w.village.core, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfe39f';
    ctx.beginPath(); ctx.arc(w.orchard.x, w.orchard.y, w.orchard.r, 0, Math.PI * 2); ctx.fill();

    polyline(ctx, w.river, 50, '#5d9bd1');
    polyline(ctx, w.river, 30, '#79b2e3');
    polyline(ctx, w.road, 28, '#8f8c84');
    polyline(ctx, w.branch, 20, '#8f8c84');
    polyline(ctx, w.road, 2, '#efe9d6', [18, 16]);

    for (const h of w.houses) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(h.x + 5, h.y + 6, h.w, h.h);
      ctx.fillStyle = '#b5543c'; ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.fillStyle = '#9c4430'; ctx.fillRect(h.x, h.y + h.h / 2, h.w, h.h / 2);
      ctx.fillStyle = '#7a3324'; ctx.fillRect(h.x, h.y + h.h / 2 - 1.5, h.w, 3);
    }

    const s = w.stand;
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(s.x - 15, s.y - 15, 30, 30);
    ctx.strokeStyle = '#4a321c'; ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 15, s.y - 15, 30, 30);
    ctx.beginPath(); ctx.moveTo(s.x - 15, s.y - 15); ctx.lineTo(s.x + 15, s.y + 15);
    ctx.moveTo(s.x + 15, s.y - 15); ctx.lineTo(s.x - 15, s.y + 15); ctx.stroke();

    ctx.fillStyle = '#3d2f22';
    ctx.beginPath(); ctx.ellipse(w.den.x, w.den.y, 34, 24, 0, 0, Math.PI * 2); ctx.fill();

    return c;
  };

  // Place names go above the tree crowns so the forest never hides them.
  function drawLabels(ctx, w) {
    label(ctx, CFG.VILLAGE_NAME, w.village.x, w.village.y - w.village.core + 10, 22);
    label(ctx, 'Brloh', w.den.x, w.den.y + 42, 16);
    label(ctx, 'Váh', 380, 1512, 16, '#24507a');
    label(ctx, 'posed a vnadisko', w.stand.x, w.stand.y - 34, 13);
    label(ctx, 'sad', w.orchard.x, w.orchard.y - w.orchard.r + 14, 13);
    label(ctx, 'úle', 1630, 925, 13);
  }

  ZS.camera = function (g, vw, vh) {
    const cx = vw >= CFG.W ? (CFG.W - vw) / 2 : clamp(g.bear.x - vw / 2, 0, CFG.W - vw);
    const cy = vh >= CFG.H ? (CFG.H - vh) / 2 : clamp(g.bear.y - vh / 2, 0, CFG.H - vh);
    return { x: cx, y: cy, w: vw, h: vh };
  };

  const inView = (cam, x, y, m) => x > cam.x - m && x < cam.x + cam.w + m && y > cam.y - m && y < cam.y + cam.h + m;

  function drawCone(ctx, g, s) {
    const trees = ZS.treesNear(g.w, s.x, s.y, s.range + 40);
    const n = 22, half = s.fov / 2;
    ctx.beginPath(); ctx.moveTo(s.x, s.y);
    for (let i = 0; i <= n; i++) {
      const a = s.ang - half + (s.fov * i) / n;
      const len = ZS.rayLength(trees, s.x, s.y, a, s.range);
      ctx.lineTo(s.x + Math.cos(a) * len, s.y + Math.sin(a) * len);
    }
    ctx.closePath();
    const lethal = ZS.shootReason(g, s);
    ctx.fillStyle = lethal ? 'rgba(214,48,39,0.24)' : 'rgba(255,196,60,0.22)';
    ctx.fill();
  }

  function drawShooter(ctx, s) {
    const colors = { hunter: '#e8590c', stand: '#e8590c', ztmh: '#1f5f3a', poacher: '#2b2b2b' };
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(s.ang) * 20, s.y + Math.sin(s.ang) * 20); ctx.stroke();
    ctx.fillStyle = colors[s.kind];
    ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3b26';
    ctx.beginPath(); ctx.arc(s.x, s.y, 5.5, 0, Math.PI * 2); ctx.fill();
    if (s.aim > 0) {
      ctx.strokeStyle = '#d62f27'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, 16, -Math.PI / 2, -Math.PI / 2 + (s.aim / s.aimTime) * Math.PI * 2); ctx.stroke();
      label(ctx, '!', s.x, s.y - 26, 18, '#d62f27');
    }
    if (s.kind !== 'hunter' && s.kind !== 'stand') label(ctx, s.label, s.x, s.y + 22, 11);
  }

  function drawTree(ctx, t, faded) {
    ctx.globalAlpha = faded ? 0.42 : 1;
    ctx.fillStyle = 'rgba(20,40,15,0.35)';
    ctx.beginPath(); ctx.arc(t.x + 5, t.y + 6, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.shade < 0.5 ? '#2f6b34' : '#3b7a3a';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.shade < 0.5 ? '#3f8243' : '#4d9148';
    ctx.beginPath(); ctx.arc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  ZS.render = function (g, ctx, vw, vh) {
    const cam = ZS.camera(g, vw, vh);
    const b = g.bear, w = g.w;
    ctx.fillStyle = '#2c3b22'; ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    ctx.drawImage(g.ground, 0, 0);

    if (g.flags.emergency) {
      const r = w.village.zone * g.flags.zoneScale;
      ctx.fillStyle = 'rgba(214,48,39,0.10)';
      ctx.beginPath(); ctx.arc(w.village.x, w.village.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(214,48,39,0.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      label(ctx, g.flags.zoneScale > 1 ? 'zóna 650 m' : 'zóna 500 m', w.village.x, w.village.y + r - 16, 14, '#a3261f');
    }
    if (g.fat >= 100) {
      ctx.strokeStyle = 'rgba(255,215,90,' + (0.5 + 0.4 * Math.sin(g.time * 5)) + ')'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(w.den.x, w.den.y, 46, 0, Math.PI * 2); ctx.stroke();
    }

    for (const it of w.items) {
      if (!it.active || !inView(cam, it.x, it.y, 30)) continue;
      const f = ZS.FOOD[it.type];
      if (f.seasons && !f.seasons.includes(g.seasonIdx)) continue;
      emoji(ctx, f.emoji, it.x, it.y, 22, it.locked ? 0.45 : 1);
      if (it.locked) emoji(ctx, '🔒', it.x + 10, it.y - 10, 13);
    }
    for (const dcy of g.decoys) emoji(ctx, '🐻', dcy.x, dcy.y, 30, Math.min(1, dcy.t));

    for (const s of g.shooters) if (inView(cam, s.x, s.y, s.range)) drawCone(ctx, g, s);
    for (const p of g.people) emoji(ctx, p.kind === 'tourist' ? '🤳' : '👵', p.x, p.y, 24);

    const blink = b.inv > 0 && Math.floor(g.time * 10) % 2 === 0;
    if (!blink) {
      if (g.problem) {
        ctx.strokeStyle = '#d62f27'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, 24, 0, Math.PI * 2); ctx.stroke();
      }
      if (b.sneak) {
        ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, 22, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      emoji(ctx, '🐻', b.x, b.y, 34);
    }
    for (const s of g.shooters) drawShooter(ctx, s);

    for (const t of w.trees) {
      if (!inView(cam, t.x, t.y, t.r + 10)) continue;
      drawTree(ctx, t, dist(t.x, t.y, b.x, b.y) < t.r + b.r);
    }
    drawLabels(ctx, w);

    for (const d of g.drones) {
      ctx.fillStyle = 'rgba(255,240,150,0.22)';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.light, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#30343a'; ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(d.x - Math.cos(a) * 12, d.y - Math.sin(a) * 12);
        ctx.lineTo(d.x + Math.cos(a) * 12, d.y + Math.sin(a) * 12); ctx.stroke();
      }
      ctx.fillStyle = '#30343a'; ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill();
    }

    for (const f of g.floaters) {
      ctx.globalAlpha = Math.min(1, f.t);
      label(ctx, f.text, f.x, f.y - (1.6 - f.t) * 30, 15, f.color);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    drawMinimap(ctx, g, vw, vh, cam);
  };

  function drawMinimap(ctx, g, vw, vh, cam) {
    const mw = Math.min(180, vw * 0.3), mh = mw * (CFG.H / CFG.W), s = mw / CFG.W;
    const x0 = vw - mw - 10, y0 = vh - mh - 48;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(g.ground, x0, y0, mw, mh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.strokeRect(x0 + cam.x * s, y0 + cam.y * s, cam.w * s, cam.h * s);
    ctx.strokeRect(x0, y0, mw, mh);
    const dot = (x, y, c, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0 + x * s, y0 + y * s, r, 0, Math.PI * 2); ctx.fill(); };
    for (const sh of g.shooters) dot(sh.x, sh.y, sh.kind === 'poacher' ? '#111' : '#e8590c', 2.5);
    if (g.fat >= 100) dot(g.w.den.x, g.w.den.y, '#ffd75a', 4);
    dot(g.bear.x, g.bear.y, '#5a3418', 3.5);
  }
})();
