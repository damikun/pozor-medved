// Composes one frame: backdrop, ground, river, landmarks, trees (with the bear in its tree's slot when it hides
// or climbs), props, people and animals, the bear, its cues, crosshairs, effects and floating texts.
(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { label, circle, ellipse } = ZS.gfx;
  const P = ZS.render.props;
  const B = ZS.render.backdrop;

  function landmarks(ctx, g, vis, span) {
    const L = g.level, S = ZS.scenery;
    for (const hx of L.haystacks) if (vis(hx, 80)) S.haystack(ctx, hx, g.time);
    if (span(L.salas.from, L.salas.to, 300)) {
      S.koliba(ctx, L.salas.koliba, g.time);
      for (const sh of g.sheep) S.sheep(ctx, sh, g.time);
      S.pen(ctx, L.salas.pen[0], L.salas.pen[1], g.time);
    }
    if (vis(L.hotel.x, L.hotel.w)) S.hotel(ctx, L.hotel.x, g.time);
    // The lift cable reaches far to the left of its pylon; the drawing culls itself.
    if (span(L.hotel.lift - 800, L.hotel.lift + 400, 0)) S.skiLift(ctx, L.hotel.lift, g.time);
    if (vis(L.hotel.chapel, 120)) S.chapel(ctx, L.hotel.chapel, g.time);
  }

  // A bear behind or on a tree is drawn in that tree's own slot, so the trees keep their order and nothing
  // jumps in front of anything when it hides. After a hit the bear fades in and out instead of blinking.
  function treesWithBear(ctx, g, vis, withBear) {
    const b = g.bear, season = g.seasonIdx;
    for (const t of g.level.trees) {
      if (!vis(t.x, 170)) continue;
      if (t === b.climbing) {
        P.trunk(ctx, t);
        withBear(ZS.drawBearClimbing);
        P.crown(ctx, t, season);
      } else if (t === b.hideTree && b.hideBlend > 0) {
        // While fading back out after ↓ is released, a stable stand-in keeps the hiding pose.
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: t }));
        withBear(ZS.drawBearBehindTree, who, b.hideBlend);
        P.tree(ctx, t, season);
        withBear(ZS.drawBearInFront, who, b.hideBlend);
      } else {
        P.tree(ctx, t, season);
      }
    }
  }

  // People and animals keep one descriptor each (p.h, s.h), so their animation eases between frames.
  function figures(ctx, g, vis) {
    const b = g.bear;
    for (const p of g.people) {
      if (!vis(p.x, 40)) continue;
      const h = p.h || (p.h = { aimAt: [0, 0] });
      h.x = p.x; h.dir = p.dir; h.kind = p.kind;
      h.state = p.state === 'flee' ? 'run' : p.kind === 'tourist' && p.filmCd > 7 ? 'film' : 'walk';
      h.aimAt[0] = b.x; h.aimAt[1] = GY - 50;
      ZS.drawHuman(ctx, h, g.time);
    }
    for (const d of g.dogs) if (vis(d.x, 60)) ZS.scenery.dog(ctx, d, g.time);
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
  }

  // Cues around the bear: water at its paws, the warning when a crosshair is close, breath and eating.
  function bearCues(ctx, g) {
    const b = g.bear, L = g.level;
    if (b.inWater) {
      ctx.fillStyle = 'rgba(79,143,192,0.62)'; ellipse(ctx, b.x, GY - 2, 66, 13);
      ctx.strokeStyle = 'rgba(230,245,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(b.x, GY - 6, 50 + Math.sin(g.time * 6) * 6, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (b.warn && !b.hiding) {
      const red = g.shooters.some((s) => s.lock > 0);
      label(ctx, '!', b.x, GY - 100 - Math.abs(Math.sin(g.time * 8)) * 6, 30, red ? '#e03131' : '#e8a400');
      if (L.trees.some((t) => t.hide && Math.abs(t.x - b.x) < t.w / 2 + 40)) label(ctx, LABELS.hideHint, b.x, GY - 134, 14, '#1d1d1d');
    }
    if (b.stamina < 0.99 && !b.hiding && !b.climbing) {
      ctx.fillStyle = 'rgba(20,26,16,0.55)'; ctx.fillRect(b.x - 26, GY - 82, 52, 6);
      ctx.fillStyle = b.tired ? '#e03131' : '#7cc4ef'; ctx.fillRect(b.x - 26, GY - 82, 52 * b.stamina, 6);
    }
    if (b.eating) {
      ctx.strokeStyle = '#2f7d4f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x + b.dir * 34, GY - 70, 11, -Math.PI / 2, -Math.PI / 2 + (b.eatT / 0.5) * Math.PI * 2); ctx.stroke();
    }
  }

  function overlays(ctx, g, vis, viewW) {
    const b = g.bear;
    for (const d of g.drones) P.drone(ctx, d, g.time);
    const aim = ZS.sim.hunters.aimFactor(g);
    for (const s of g.shooters) if (vis(s.cross, 60) && Math.abs(s.x - b.x) < 1500) P.crosshair(ctx, s, aim);
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
    if (g.bubble) P.bubble(ctx, b.x, b.climbing ? b.y - 128 : GY - 180, g.bubble.text, g.bubble.t);
  }

  /** Draws the whole frame. viewW is the visible width in world units; offY the extra sky on tall screens. */
  ZS.draw = function (g, ctx, viewW, offY) {
    const L = g.level, b = g.bear, cam = g.cam;
    const vis = (x, m) => x > cam - m && x < cam + viewW + m;
    const span = (a, z, m) => z > cam - m && a < cam + viewW + m;
    const hurt = b.inv > 0 ? 0.45 + 0.35 * Math.cos(g.time * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, g.time); ctx.globalAlpha = 1; };

    ctx.save();
    ctx.translate(0, offY);
    B.sky(ctx, g, viewW, offY);
    B.backForest(ctx, g, viewW, offY);
    ctx.translate(-Math.round(cam), 0);
    B.ground(ctx, cam, viewW);
    if (span(L.river.from, L.river.to, 60)) {
      ZS.scenery.river(ctx, L.river.from, L.river.to, g.time);
      for (const st of L.stones) ZS.scenery.stone(ctx, st.x, st.w, g.time);
    }
    P.den(ctx, L.startDen, false, LABELS.springDen, g.time);
    P.den(ctx, L.winterDen, g.fat >= CFG.FAT_GOAL, LABELS.winterDen, g.time);
    for (const h of L.houses) if (vis(h.x, 220)) P.house(ctx, h);
    landmarks(ctx, g, vis, span);
    treesWithBear(ctx, g, vis, withBear);
    for (const s of L.signs) if (vis(s.x, 160)) P.sign(ctx, s);
    for (const p of L.posts) if (vis(p.x, 80)) P.post(ctx, p);
    for (const lg of L.logs) if (vis(lg.x, 80)) P.log(ctx, lg);
    for (const it of L.items) if (!it.eaten && vis(it.x, 60)) P.item(ctx, it, g.time);
    ZS.fx.drawBack(ctx, g, viewW);
    figures(ctx, g, vis);
    if (!b.climbing && (b.hideBlend || 0) < 1) withBear(ZS.drawBear, b, 1 - (b.hideBlend || 0));
    bearCues(ctx, g);
    overlays(ctx, g, vis, viewW);
    ctx.restore();
  };
})();
