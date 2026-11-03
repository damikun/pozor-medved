(function () {
  const { CFG, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { label, circle, ellipse } = ZS.gfx;
  const P = ZS.render.props;
  const B = ZS.render.backdrop;
  const OWN_ART = { feeder: 1, punch: 1, lokse: 1, sausage: 1, cheese: 1, carrot: 1, cob: 1, catch: 1 };
  const CORN = 3, LOG = 0.3;

  function eatenAt(L, type, x) {
    return L.items.some((it) => it.type === type && it.x === x && it.eaten);
  }

  function haystack(ctx, g, hx, withBear) {
    const b = g.bear, t = b.hideTree;
    if (!t || !t.hay || t.x !== hx || !(b.hideBlend > 0)) { ZS.scenery.haystack(ctx, hx, g.time, 0); return; }
    const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: t }));
    const stir = b.hiding ? Math.max(1 - Math.min(1, (b.hideT || 0) / 0.6), b.danger ? 0.35 : 0) : 1 - b.hideBlend;
    withBear(ZS.drawBearInHay, who, b.hideBlend);
    ZS.scenery.haystack(ctx, hx, g.time, stir);
    withBear(ZS.drawBearHayFront, who, b.hideBlend);
  }

  function penFront(ctx, g, span) {
    const s = g.level.salas;
    if (!s || !s.fences || !span(s.from, s.to, 300)) return;
    if (s.strunga) ZS.scenery.strunga(ctx, s.strunga, g.time, 1, g.bear);
    s.fences.forEach((fx, i) => ZS.scenery.gate(ctx, fx, g.time, 1, i === 0));
  }

  function landmarks(ctx, g, vis, span, withBear) {
    const L = g.level, S = ZS.scenery, A = ZS.winterArt;
    for (const hx of L.haystacks) if (vis(hx, 80)) haystack(ctx, g, hx, withBear);
    if (L.skanzen && span(L.skanzen.from, L.skanzen.to, 260)) S.skanzen(ctx, L.skanzen, g);
    if (L.corn && span(L.corn.from, L.corn.to, 140)) S.cornBack(ctx, L.corn, g);
    if (g.boar && vis(g.boar.x, 60)) ZS.boarArt.draw(ctx, g.boar, g);
    if (L.salas && span(L.salas.from, L.salas.to, 300)) {
      S.koliba(ctx, L.salas.koliba, g.time, g.koliba);
      S.pen(ctx, L.salas.pen[0], L.salas.pen[1], g.time);
      if (L.salas.fences) L.salas.fences.forEach((fx, i) => S.gate(ctx, fx, g.time, 0, i === 0));
      if (L.salas.strunga) S.strunga(ctx, L.salas.strunga, g.time, 0);
      for (const sh of g.sheep) S.sheep(ctx, sh, g.time);
    }
    if (L.hotel && vis(L.hotel.x, L.hotel.w)) S.hotel(ctx, L.hotel.x, g.time);
    if (L.lift && span(L.lift.x - 160, L.lift.tower + 3200, 0)) S.skiLift(ctx, L.lift, g.time, L.theme === 'winter');
    if (L.hotel && vis(L.hotel.chapel, 120)) S.chapel(ctx, L.hotel.chapel, g.time);
    for (const c of L.cannons) if (vis(c.x, 320)) A.cannon(ctx, c, g.time);
    for (const f of L.feeders) {
      if (!vis(f.x, 140)) continue;
      f.eaten = eatenAt(L, 'feeder', f.x);
      A.feeder(ctx, f, g.time);
    }
    for (const s of L.stalls) {
      if (!vis(s.x, 140)) continue;
      const it = L.items.find((i) => i.type === s.kind && i.x === s.x);
      s.eaten = !!it && it.eaten && !it.gift;
      s.shut = !!it && it.locked;
      A.stall(ctx, s, g.time, g);
    }
    if (L.chata && vis(L.chata.x, 240)) A.chata(ctx, L.chata.x, g.time);
    for (const s of L.snowmen) if (vis(s.x, 90)) A.snowman(ctx, s, g.time);
    if (L.lot && span(L.lot.from, L.lot.to, 200)) A.lot(ctx, L.lot, g);
    if (L.fisher && vis(L.fisher.x, 160)) A.fisher(ctx, L.fisher, g);
    if (L.alpine && span(L.alpine.from, L.alpine.to, 400)) ZS.alpineArt.back(ctx, g, vis, span);
  }

  function treesWithBear(ctx, g, vis, withBear) {
    const b = g.bear, season = g.seasonIdx;
    for (const t of g.level.trees) {
      if (!vis(t.x, 170)) continue;
      if (t === b.climbing) {
        P.trunk(ctx, t, g);
        withBear(ZS.drawBearClimbing);
        P.crown(ctx, t, season, g);
      } else if (t === b.hideTree && b.hideBlend > 0) {
        const who = b.hiding ? b : (b.fadeBear = Object.assign(b.fadeBear || {}, b, { hiding: t }));
        withBear(ZS.drawBearBehindTree, who, b.hideBlend);
        P.tree(ctx, t, season, g);
        withBear(ZS.drawBearInFront, who, b.hideBlend);
      } else {
        P.tree(ctx, t, season, g);
      }
    }
  }

  function view(g, o, shooter) {
    const b = g.bear, r = o.react;
    const h = o.h || (o.h = { aimAt: [0, 0] });
    h.x = o.x; h.y = o.fy; h.dir = o.dir; h.kind = o.kind === 'posed' ? 'walker' : o.kind; h.outfit = g.level.theme; h.cold = b.cold;
    h.armed = !shooter || o.armed !== false; h.empty = !!o.empty; h.clutch = !!o.clutch; h.texting = !!o.texting;
    h.scared = false; h.kick = 0; h.rifleDir = o.rifleDir; h.rifleX = o.pickX; h.offer = o.offer || 0;
    h.aimAt[0] = b.x; h.aimAt[1] = GY - 50;
    if (r === 'down') { h.state = 'down'; h.downPhase = o.downPhase; h.downK = o.downK; }
    else if (r === 'drop') { h.state = 'drop'; h.dropK = o.dropK; }
    else if (r === 'climb') { h.state = 'climbStand'; h.climbK = o.climbK; }
    else if (r === 'home') h.state = 'walk';
    else if (r === 'selfie') { h.state = 'selfie'; h.selfieK = o.selfieK; }
    else if (r === 'hugged') { h.state = 'hugged'; h.hugK = o.hugK; }
    else if (r === 'bitten') { h.state = 'bitten'; h.bitK = o.bitK; }
    else if (r === 'pickup') { h.state = 'pickup'; h.pickK = o.pickK; }
    else if (r === 'flee') { h.state = 'run'; h.scared = true; }
    else if (r === 'gone') { h.state = o.clutch || o.bolt ? 'run' : 'walk'; h.scared = !!(o.clutch || o.bolt); }
    else if (r === 'fetch') h.state = o.rifle && o.rifle.rest ? 'walk' : 'idle';
    else if (shooter) {
      h.scared = o.scaredT > 0;
      h.state = o.scaredT > 0 ? 'run' : o.lock > 0 || o.kick > 0 ? 'aim' : 'walk';
      h.kick = o.kick || 0;
      h.aimAt[0] = o.cross; h.aimAt[1] = GY - 30;
    } else {
      h.scared = o.state === 'flee';
      h.state = o.state === 'flee' ? 'run' : o.kind === 'tourist' && o.filmCd > 7 && !o.texting ? 'film' : 'walk';
    }
    if (o.hurdle) { h.state = 'hurdle'; h.hurdleK = o.hurdle.k; }
    return h;
  }

  function figures(ctx, g, vis, held) {
    const ph = g.photographer;
    if (ph && ph !== held && vis(ph.x, 120)) ZS.drawPhotographer(ctx, ph, g.time);
    for (const p of g.people) if (p.aide && vis(p.aide.x, 40)) ZS.drawAide(ctx, p, g);
    for (const p of g.people) if (p !== held && vis(p.x, 40)) ZS.drawHuman(ctx, view(g, p, false), g.time);
    for (const d of g.dogs) if (vis(d.x, 60)) ZS.scenery.dog(ctx, d, g.time);
    for (const d of g.deer) if (vis(d.x, 70)) ZS.winterArt.deer(ctx, d, g.time);
    for (const s of g.shooters) {
      if (s === held || !vis(s.x, 60)) continue;
      if (s.kind === 'posed' && !s.react) { s.outfit = g.level.theme; s.cold = g.bear.cold; ZS.drawPostHunter(ctx, s, g.time); continue; }
      ZS.drawHuman(ctx, view(g, s, true), g.time);
    }
  }

  function bearCues(ctx, g) {
    const b = g.bear;
    if (b.inWater) {
      ctx.fillStyle = 'rgba(79,143,192,0.62)'; ellipse(ctx, b.x, GY - 2, 66, 13);
      ctx.strokeStyle = 'rgba(230,245,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(b.x, GY - 6, 50 + Math.sin(g.time * 6) * 6, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (b.warn && !b.hiding && !b.inSpray) {
      const red = g.shooters.some((s) => s.lock > 0);
      label(ctx, '!', b.x, GY - 100 - Math.abs(Math.sin(g.time * 8)) * 6, 30, red ? '#e03131' : '#e8a400');
    }
    if (b.stamina < 0.99 && !b.hiding && !b.climbing) {
      ctx.fillStyle = 'rgba(20,26,16,0.55)'; ctx.fillRect(b.x - 26, GY - 82, 52, 6);
      ctx.fillStyle = b.tired ? '#e03131' : '#7cc4ef'; ctx.fillRect(b.x - 26, GY - 82, 52 * b.stamina, 6);
    }
    if (b.eating) {
      ctx.strokeStyle = '#2f7d4f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x + b.dir * 34, GY - 70, 11, -Math.PI / 2, -Math.PI / 2 + (b.eatT / 0.5) * Math.PI * 2); ctx.stroke();
    }
    const hic = g.time - (b.hicAt || -9);
    if (b.tipsy > 0 && hic >= 0 && hic < 0.9 && !b.hiding && !b.climbing) {
      const hx = b.x + b.dir * 34, hy = GY - 96 - hic * 26;
      ctx.globalAlpha = Math.min(1, (0.9 - hic) * 3);
      ctx.fillStyle = 'rgba(214,236,250,0.85)'; circle(ctx, hx - b.dir * 6, hy + 14, 2.2 + hic * 2); circle(ctx, hx + b.dir * 4, hy + 20, 1.6 + hic);
      label(ctx, LABELS.vendor.hic, hx, hy, 12, '#7a3b8a');
      ctx.globalAlpha = 1;
    }
  }

  function cover(g) {
    const b = g.bear, L = g.level;
    if ((b.spot && !b.spot.hay) || L.trees.some((t) => t.hide && Math.abs(t.x - b.x) < t.w / 2 + 40)) return LABELS.hideHint;
    if ((b.spot && b.spot.hay) || L.haystacks.some((x) => Math.abs(x - b.x) < 72)) return LABELS.hayHint;
    if (ZS.sim.lot.inside(L, b.x)) return LABELS.lot.hint;
    return ZS.sim.alpine.thicket(L, b.x) ? LABELS.alpine.hint : null;
  }

  const aimed = (g) => g.shooters.some((s) => !s.react && s.lock > 0);
  const use = (code, text, skill) => Object.assign([code, text], { skill });
  const tip = (code, text, skill) => Object.assign([code, text], { skill, tip: true });
  const fresh = (g, skill) => !ZS.prompt.known(skill, g);

  function interact(g, o) {
    if (o.post) {
      return ZS.sim.ladder.at(g) === o.post && fresh(g, 'ladderUp')
        ? [use('KeyC', LABELS.interactLadder[0], 'shake'), tip('ArrowUp', LABELS.interactLadder[1], 'ladderUp')]
        : [use('KeyC', LABELS.interactStand, 'shake')];
    }
    if (o.kind === 'photographer') return [use('KeyC', LABELS.interactPose, 'pose')];
    const selfie = o.kind === 'tourist' || (o.kind === 'tycoon' && !o.promo);
    const two = o.kind === 'tourist' ? LABELS.interactSelfie : selfie ? LABELS.tycoon.interact : LABELS.interact;
    return [use('KeyC', two[0], selfie ? 'selfie' : 'hug'), use('KeyX', two[1], 'bite')];
  }

  function knock(g, b) {
    const k = b.knock;
    if (!k || b.reach || aimed(g) || !(k.kind === 'stall' || !(g.knock && g.knock.last))) return null;
    const open = k.kind === 'stall' && !(g.level.items.find((it) => it.type === k.o.kind && Math.abs(it.x - k.o.x) < 1) || {}).locked;
    return [use('KeyC', open ? LABELS.interactStall : LABELS.interactKnock, open ? 'stall' : 'knock')];
  }

  function cue(g) {
    const b = g.bear;
    if (b.warn && !b.hiding && !b.inSpray) {
      const hide = fresh(g, 'hide') && cover(g);
      if (hide) return [tip('ArrowDown', hide, 'hide')];
    } else if (b.onGround && !b.hiding && !b.act) {
      if (b.bumpT > 0 && !b.crouch && fresh(g, 'crouch')) return [tip('ArrowDown', LABELS.crawlHint, 'crouch')];
      if (b.zapT > 0.8 && b.zapT < 3.5 && fresh(g, 'jump')) return [tip('ArrowUp', LABELS.fenceHint, 'jump')];
      if (b.logT > LOG && fresh(g, 'jump')) return [tip('ArrowUp', LABELS.logHint, 'jump')];
    }
    const seat = b.climbing && b.climbing.ladder && b.climbing.phase === 'seat' ? b.climbing : null;
    if (seat) return seat.t > 0.7 && fresh(g, 'ladderDown') ? [tip('ArrowDown', LABELS.ladderDown, 'ladderDown')] : null;
    if (b.reach && !aimed(g)) return interact(g, b.reach);
    if (!b.reach && !b.climbing && ZS.sim.ladder.at(g) && fresh(g, 'ladderUp')) return [tip('ArrowUp', LABELS.ladderUp, 'ladderUp')];
    if (b.inCorn && !b.crouch && g.time - b.cornAt < CORN && fresh(g, 'crouch')) return [tip('ArrowDown', LABELS.cornHint, 'crouch')];
    return knock(g, b);
  }

  function practice(g) {
    const b = g.bear, P = ZS.prompt, w = g.cueWas || (g.cueWas = { ground: true, ladder: false });
    const ladder = !!(b.climbing && b.climbing.ladder), a = b.act;
    if (b.hiding) P.learn('hide');
    if (b.crouch) P.learn('crouch');
    if (w.ground && !b.onGround && b.vy < 0 && !b.stun && !b.climbing) P.learn('jump');
    if (ladder) P.learn('ladderUp');
    if (w.ladder && !ladder) P.learn('ladderDown');
    if (a && (a.target || a.stall || a.house)) P.learn(a.stall ? 'stall' : a.kind);
    w.ground = b.onGround; w.ladder = ladder;
  }

  function drawCue(ctx, g, viewW) {
    if (g.cues !== false) practice(g);
    const b = g.bear, parts = g.cues === false || g.touch ? null : cue(g);
    ZS.prompt.show(ctx, g, parts && { parts, x: b.x, y: (b.climbing ? b.y : GY) + 6 }, { hang: true, lo: g.cam + 8, hi: g.cam + viewW - 8 });
  }

  function heart(ctx, x, y, r, a) {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function denStamp(ctx, g, hungry) {
    const x = g.level.goalDen, k = 0.5 + 0.5 * Math.sin(g.time * 2.4), [big, small] = hungry ? LABELS.denStampFat : LABELS.denStamp;
    ctx.save();
    ctx.translate(x, GY - 96);
    ctx.rotate(-0.12 + 0.015 * Math.sin(g.time * 1.3));
    ctx.globalAlpha = 0.86 + 0.1 * k;
    ctx.font = '900 17px system-ui, sans-serif';
    const wBig = ctx.measureText(big).width;
    ctx.font = '700 9.5px system-ui, sans-serif';
    const half = Math.max(64, Math.max(wBig, ctx.measureText(small).width) / 2 + 12);
    ctx.fillStyle = 'rgba(255,248,236,0.82)';
    ctx.fillRect(-half, -21, half * 2, 40);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3;
    ctx.strokeRect(-half, -21, half * 2, 40);
    ctx.lineWidth = 1; ctx.strokeRect(-half + 4, -17, half * 2 - 8, 32);
    ctx.fillStyle = '#c0392b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(small, 0, 10);
    ctx.font = '900 17px system-ui, sans-serif';
    ctx.fillText(big, 0, -5);
    ctx.restore();
  }

  function overlays(ctx, g, vis, viewW) {
    const b = g.bear;
    for (const d of g.drones) P.drone(ctx, d, g.time);
    const aim = ZS.sim.hunters.aimFactor(g);
    for (const s of g.shooters) if (!s.react && vis(s.cross, 60) && Math.abs(s.x - b.x) < 1500) P.crosshair(ctx, s, aim, g);
    for (const sh of g.shots) {
      const a = sh.t / 0.3;
      ctx.strokeStyle = 'rgba(255,220,120,' + a + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sh.x1, sh.y1); ctx.lineTo(sh.x2, sh.y2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,190,80,' + a + ')'; circle(ctx, sh.x1, sh.y1, 9);
    }
    for (const p of g.particles) {
      ctx.fillStyle = p.color;
      if (p.heart) heart(ctx, p.x, p.y, 5 + Math.min(1, p.t) * 2, Math.min(1, p.t * 1.5));
      else if (p.round) circle(ctx, p.x, p.y, 2.6); else ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ZS.fx.drawFront(ctx, g, viewW);
    for (const f of g.floaters) {
      if (f.ride) continue;
      ctx.globalAlpha = Math.min(1, f.t);
      label(ctx, f.text, f.x, f.y - (1.6 - f.t) * 30, 16, f.color);
      ctx.globalAlpha = 1;
    }
    if (g.bubble) P.bubble(ctx, b.x, b.climbing || b.offTree ? Math.min(b.y - 128, GY - 180) : GY - 180, g.bubble.text, g.bubble.t, g.cam + 8, g.cam + viewW - 8);
  }

  ZS.draw = function (g, ctx, viewW, offY) {
    const lift = ZS.render.lift;
    if (g.ride && lift.inside(g)) { lift.draw(g, ctx, viewW, offY); return; }
    const L = g.level, b = g.bear, cam = g.cam, T = ZS.LEVEL_TEXT[L.id], zoom = g.ride ? lift.zoom(g) : null;
    const vis = (x, m) => x > cam - m && x < cam + viewW + m;
    const span = (a, z, m) => z > cam - m && a < cam + viewW + m;
    const hurt = b.inv > 0 ? 0.45 + 0.35 * Math.cos(g.time * 14) : 1;
    const withBear = (fn, who = b, alpha = 1) => { ctx.globalAlpha = hurt * alpha; fn(ctx, who, g.time); ctx.globalAlpha = 1; };
    const t = b.act && b.act.target;
    const held = t && ((b.act.kind === 'hug' && t.react === 'hugged') || (b.act.kind === 'selfie' && t.react === 'selfie')) ? t : null;

    ctx.save();
    ctx.translate(0, offY);
    if (zoom) { ctx.translate(zoom.x, zoom.y); ctx.scale(zoom.k, zoom.k); ctx.translate(-zoom.x, -zoom.y); }
    B.sky(ctx, g, viewW, offY);
    if (L.alpine) ZS.alpineArt.backdrop(ctx, g, viewW, offY);
    if (L.slope) ZS.winterArt.slope(ctx, g, viewW, offY);
    B.backForest(ctx, g, viewW, offY);
    ctx.translate(-Math.round(cam), 0);
    B.ground(ctx, cam, viewW, g);
    if (L.alpine) ZS.alpineArt.ground(ctx, g, cam, viewW);
    if (g.tracks.length) B.tracks(ctx, g, viewW);
    if (L.river && span(L.river.from, L.river.to, 60)) {
      ZS.scenery.river(ctx, L.river.from, L.river.to, g.time);
      for (const st of L.stones) ZS.scenery.stone(ctx, st.x, st.w, g.time);
    }
    if (L.ice && span(L.ice.from, L.ice.to, 80)) ZS.winterArt.ice(ctx, L.ice.from, L.ice.to, g.time);
    for (const h of L.holes) if (vis(h.x, 60)) ZS.winterArt.hole(ctx, h.x, g.time);
    if (vis(L.startDen, 240)) P.den(ctx, L.startDen, false, T.startDen, g.time, g);
    const hugged = ZS.sim.rules.hugged(g), fed = g.fat >= g.def.fatGoal;
    if (vis(L.goalDen, 240)) (L.alpine ? ZS.alpineArt.den : P.den)(ctx, L.goalDen, hugged && fed, T.goalDen, g.time, g);
    if (!(hugged && fed) && vis(L.goalDen, 120)) denStamp(ctx, g, hugged);
    for (const h of L.houses) if (vis(h.x, 220)) P.house(ctx, h, g);
    landmarks(ctx, g, vis, span, withBear);
    treesWithBear(ctx, g, vis, withBear);
    for (const s of L.signs) if (vis(s.x, 160)) P.sign(ctx, s, g);
    for (const p of L.posts) if (vis(p.x, 80)) P.post(ctx, p, g);
    if (b.climbing && b.climbing.ladder) withBear(ZS.drawBearOnLadder);
    for (const lg of L.logs) if (vis(lg.x, 80)) (lg.rock ? ZS.alpineArt.slab : P.log)(ctx, lg, g);
    for (const it of L.items) if ((!it.eaten || P.left(it)) && !OWN_ART[it.type] && vis(it.x, 60)) P.item(ctx, it, g.time, g);
    for (const p of g.props) if (vis(p.x, 60)) ZS.drawDropped(ctx, p, g.time);
    ZS.fx.drawBack(ctx, g, viewW);
    figures(ctx, g, vis, held);
    if (!b.climbing && (b.hideBlend || 0) < 1) withBear(ZS.drawBear, b, 1 - (b.hideBlend || 0));
    if (held && held === g.photographer) ZS.drawPhotographer(ctx, held, g.time);
    else if (held) ZS.drawHuman(ctx, view(g, held, g.shooters.includes(held)), g.time);
    if (!b.climbing) withBear(ZS.drawBearHugFront);
    penFront(ctx, g, span);
    if (L.alpine && span(L.alpine.from, L.alpine.to, 200)) ZS.alpineArt.front(ctx, g, span);
    if (L.corn && span(L.corn.from, L.corn.to, 140)) ZS.scenery.cornFront(ctx, L.corn, g);
    if (L.lot && span(L.lot.from, L.lot.to, 160)) ZS.winterArt.lotFront(ctx, L.lot, g);
    if (b.zapT < 1.4) ZS.scenery.zap(ctx, b, g.time);
    for (const c of L.cannons) if (vis(c.x, 320)) ZS.winterArt.spray(ctx, c, g.time);
    bearCues(ctx, g);
    overlays(ctx, g, vis, viewW);
    drawCue(ctx, g, viewW);
    ctx.restore();
    if (zoom) lift.cover(g, ctx, viewW, offY);
  };

  ZS.render.cue = cue;
})();
