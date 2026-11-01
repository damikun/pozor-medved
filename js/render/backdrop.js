// The backdrop, drawn in screen space before the world: sky, parallax Tatras and ridge, a hazy back row
// of trees, and the ground strip under the main layer.
(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const { circle } = ZS.gfx;
  const SKY = [['#a7d8f5', '#eaf7ff'], ['#7cc4ef', '#d8f1ff'], ['#efb57c', '#fbe6c8']];

  function sky(ctx, g, viewW, offY) {
    const L = g.level, s = g.seasonIdx;
    const grad = ctx.createLinearGradient(0, -offY, 0, GY);
    grad.addColorStop(0, SKY[s][0]); grad.addColorStop(1, SKY[s][1]);
    ctx.fillStyle = grad; ctx.fillRect(0, -offY, viewW, GY + offY);

    // The Tatras, with snow on the peaks.
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

    // A nearer forested ridge.
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

  // Drawn in world space: soil, grass, the path and tufts of grass.
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

  ZS.render = ZS.render || {};
  ZS.render.backdrop = { sky, backForest, ground };
})();
