(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { emoji, label, rrect, circle, ellipse } = ZS.gfx;
  const BUK = ['#7cc35a', '#4f9a43', '#d8892f'];
  const BREZA = ['#a8d66a', '#8cc152', '#e6c34a'];
  const BARK = { buk: '#9b958b', smrek: '#6b4a32', breza: '#f1efe8', jablon: '#7a5534' };

  function trunk(ctx, t) {
    const top = t.kind === 'smrek' ? GY - t.h * 0.42 : GY - t.h;
    const half = t.w / 2;
    ctx.fillStyle = BARK[t.kind];
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
    ctx.fillStyle = t.kind === 'breza' ? BREZA[season] : t.kind === 'jablon' ? '#5aa548' : BUK[season];
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
      label(ctx, LABELS.billboard[0], s.x, GY - 146, 18, '#1d1d1d');
      label(ctx, LABELS.billboard[1], s.x, GY - 122, 18, '#1d1d1d');
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

  function den(ctx, x, glow, name, time) {
    ctx.fillStyle = '#6d5a46';
    ctx.beginPath(); ctx.moveTo(x - 150, GY); ctx.quadraticCurveTo(x, GY - 230, x + 150, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#241a12';
    ctx.beginPath(); ctx.moveTo(x - 40, GY); ctx.arc(x, GY, 40, Math.PI, 0); ctx.closePath(); ctx.fill();
    if (glow) {
      ctx.strokeStyle = 'rgba(255,215,90,' + (0.5 + 0.4 * Math.sin(time * 5)) + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, GY, 48, Math.PI, 0); ctx.stroke();
    }
    label(ctx, name, x, GY - 135, 15);
  }

  function item(ctx, it, time) {
    const x = it.x;
    if (it.hidden) return;
    if (it.type === 'fish') {
      const f = it.fd || (it.fd = { id: 'fish' + Math.round(it.x0 || it.x), wiggle: (it.x0 || it.x) % 6 });
      f.x = x; f.y = it.y; f.dir = it.dir || 1;
      ZS.scenery.fish(ctx, f, time);
      return;
    }
    if (it.type === 'container') { ZS.scenery.container(ctx, x, it.locked); return; }
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

  function crosshair(ctx, s, aimFactor) {
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
      ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, s.lock / (s.aimTime * aimFactor)) * Math.PI * 2); ctx.stroke();
    }
  }

  function drone(ctx, d, time) {
    ctx.fillStyle = 'rgba(255,240,150,0.2)';
    ctx.beginPath(); ctx.moveTo(d.x - 8, d.y + 6); ctx.lineTo(d.x + 8, d.y + 6); ctx.lineTo(d.x + d.beam, GY); ctx.lineTo(d.x - d.beam, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#30343a'; rrect(ctx, d.x - 16, d.y - 5, 32, 10, 4);
    ctx.fillRect(d.x - 24, d.y - 8, 48, 3);
    const w = 10 + Math.abs(Math.sin(time * 40)) * 6;
    ellipse(ctx, d.x - 24, d.y - 10, w, 2); ellipse(ctx, d.x + 24, d.y - 10, w, 2);
    ctx.fillStyle = Math.sin(time * 6) > 0 ? '#ff3b30' : '#7a1d18'; circle(ctx, d.x, d.y + 6, 2.5);
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

  ZS.render = ZS.render || {};
  ZS.render.props = { trunk, crown, tree, house, post, log, sign, den, item, crosshair, drone, bubble };
})();
