(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GROUND = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const pen = () => ZS.sim.pen;

  const KIND = {
    posed:   { aim: 1.25, sweep: 125, range: 480, speed: 0 },
    walker:  { aim: 1.1,  sweep: 115, range: 380, speed: 48 },
    ztmh:    { aim: 0.95, sweep: 150, range: 420, speed: 230 },
    poacher: { aim: 0.8,  sweep: 130, range: 400, speed: 70 },
  };

  const PLACING = {
    postHeight: 150,
    shortestBeat: 200,
    besideFence: 60,
    crosshairAhead: 200,
  };

  const PATROL = {
    meatSpeedUp: 1.25,
    beatSlack: 2,
    beatEndReach: 6,
    fenceNear: 8,
    waitBeforeHeadingHome: 0.6,
    waitAfterTurn: 0.35,
    waitAtBeatEnd: 1.5,
    waitAtFence: 1.1,
    waitWhenFenced: 0.9,
    stopsPerSecond: 0.12,
    shortestStop: 1,
    longestStopExtra: 2,
  };

  const SCARE = {
    bearWithin: 32,
    seconds: 4,
    runSpeedUp: 2.2,
    keepFromEdge: 40,
    waitAfterFence: 1.1,
    panic: 2,
    labelHeight: 110,
  };

  const CAR = {
    givesUpAfter: 14,
    leaveSpeed: 260,
    offscreen: 300,
    stopsWithin: 380,
  };

  const SWEEP = {
    nearEdge: 60,
    alertSpeed: 420,
    alertDone: 5,
    shortestRest: 0.8,
    restExtra: 1.2,
  };

  const TRACKS = {
    freshFor: 8,
    noticedWithin: 22,
    cooldown: 9,
    labelHeight: 104,
  };

  const SHOT = {
    ignoredBeyond: 1500,
    tooWobbly: 0.05,
    seesBehindWithin: 60,
    blindUnderPost: 70,
    pointBlank: 90,
    onCrosshair: 40,
    crosshairSnap: 8,
    reload: 3,
    kickRecovery: 4,
    aimDecay: 2,
    treeShotAim: 0.6,
    treeShotSpread: 60,
    warnSpread: 200,
  };

  const ALERT_RADIUS = 1000;
  const FLEE_ENDS_AT = 3.2;

  function create(game, kind, options) {
    const stats = KIND[kind];
    const hunter = Object.assign({
      kind, aimTime: stats.aim, sweep: stats.sweep, range: stats.range, speed: stats.speed,
      x: 0, dir: -1, from: null, to: null, crossDir: 1, lock: 0, reload: 0, life: Infinity, pause: 0, lost: 0, alertX: null,
      sweepPause: 0, scaredT: 0, react: null, reactT: 0, armed: true, rifle: null, trackCd: 0,
    }, options);
    const level = game && game.level;
    if (kind === 'posed') {
      hunter.y = GROUND - PLACING.postHeight;
      hunter.home = hunter.x;
      hunter.sway = 0;
      hunter.wobble = 0;
    } else {
      hunter.y = GROUND;
      placeOutsideFences(level, hunter);
      ZS.sim.corn.range(level, hunter, undefined, PLACING.shortestBeat);
    }
    hunter.cross = hunter.x + hunter.dir * PLACING.crosshairAhead;
    return hunter;
  }

  function placeOutsideFences(level, hunter) {
    const P = pen();
    if (hunter.kind === 'ztmh' && P.inside(level, hunter.x, P.KEEP.hunter)) {
      hunter.x = P.band(level, P.KEEP.hunter)[0] - PLACING.besideFence;
    } else {
      P.range(level, hunter, P.KEEP.hunter, PLACING.shortestBeat);
    }
  }

  function alert(game, x) {
    for (const hunter of game.shooters) {
      if (Math.abs(hunter.x - x) < ALERT_RADIUS) hunter.alertX = x;
    }
  }

  function aimFactor(game) {
    if (game.flags.cull) return 0.85;
    if (game.flags.emergency) return 0.92;
    return 1;
  }

  function move(game, hunter, dt) {
    if (hunter.scaredT > 0) runAwayScared(game, hunter, dt);
    else if (hunter.kind === 'walker' || hunter.kind === 'poacher' || hunter.patrol) patrol(game, hunter, dt);
    else if (hunter.kind === 'ztmh') drive(game, hunter, dt);
  }

  function runAwayScared(game, hunter, dt) {
    hunter.scaredT -= dt;
    const step = hunter.dir * hunter.speed * SCARE.runSpeedUp * dt;
    hunter.x = clamp(hunter.x + step, SCARE.keepFromEdge, game.level.w - SCARE.keepFromEdge);
  }

  function patrol(game, hunter, dt) {
    if (hunter.pause > 0) {
      waitThenTurn(hunter, dt);
      return;
    }
    if (strayedFromBeat(hunter)) {
      const homeward = hunter.x < hunter.from ? 1 : -1;
      if (hunter.dir !== homeward) {
        hunter.dir = homeward;
        hunter.pause = PATROL.waitBeforeHeadingHome;
        return;
      }
    }
    const speedUp = game.flags.meat ? PATROL.meatSpeedUp : 1;
    hunter.x += hunter.dir * hunter.speed * speedUp * dt;
    if (reachedBeatEnd(hunter)) turnAtBeatEnd(game.level, hunter);
    else if (game.level.rng() < dt * PATROL.stopsPerSecond) stopForAWhile(game.level, hunter);
  }

  function waitThenTurn(hunter, dt) {
    hunter.pause -= dt;
    if (hunter.pause <= 0 && hunter.flip) {
      hunter.dir = hunter.flip;
      hunter.flip = 0;
      hunter.pause = PATROL.waitAfterTurn;
    }
  }

  function strayedFromBeat(hunter) {
    if (hunter.from === null) return false;
    return hunter.x < hunter.from - PATROL.beatSlack || hunter.x > hunter.to + PATROL.beatSlack;
  }

  function reachedBeatEnd(hunter) {
    if (hunter.from === null) return false;
    const pastStart = hunter.x < hunter.from && hunter.dir < 0;
    const pastEnd = hunter.x > hunter.to && hunter.dir > 0;
    const nearBeat = hunter.x > hunter.from - PATROL.beatEndReach && hunter.x < hunter.to + PATROL.beatEndReach;
    return (pastStart || pastEnd) && nearBeat;
  }

  function turnAtBeatEnd(level, hunter) {
    hunter.x = clamp(hunter.x, hunter.from, hunter.to);
    const fence = pen().ahead(level, hunter.x, hunter.dir);
    const fenceRightThere = fence !== null && Math.abs(fence - hunter.x) <= pen().KEEP.hunter + PATROL.fenceNear;
    if (fenceRightThere) {
      hunter.pause = PATROL.waitAtFence;
      hunter.flip = -hunter.dir;
    } else {
      hunter.dir *= -1;
      hunter.pause = PATROL.waitAtBeatEnd;
    }
  }

  function stopForAWhile(level, hunter) {
    hunter.pause = PATROL.shortestStop + level.rng() * PATROL.longestStopExtra;
    if (level.rng() < 0.5) hunter.dir *= -1;
  }

  function drive(game, hunter, dt) {
    if (!game.problem || hunter.lost > CAR.givesUpAfter) {
      driveAway(game, hunter, dt);
      return;
    }
    hunter.out = 0;
    const target = game.lastKnown !== null ? game.lastKnown : game.bear.x;
    if (Math.abs(target - hunter.x) > CAR.stopsWithin) {
      hunter.dir = Math.sign(target - hunter.x);
      hunter.x += hunter.dir * hunter.speed * dt;
    } else {
      hunter.dir = Math.sign(game.bear.x - hunter.x) || hunter.dir;
    }
  }

  function driveAway(game, hunter, dt) {
    if (!hunter.out) {
      const fences = pen().band(game.level, pen().KEEP.hunter);
      const pastFences = fences && hunter.x >= fences[1] && game.cam - CAR.offscreen < fences[1];
      hunter.out = pastFences ? 1 : -1;
    }
    hunter.dir = hunter.out;
    hunter.x += hunter.out * CAR.leaveSpeed * dt;
    const gone = hunter.out < 0
      ? hunter.x < game.cam - CAR.offscreen
      : hunter.x > game.cam + game.viewW + CAR.offscreen;
    if (gone) hunter.dead = true;
  }

  function stopAtFences(game, hunter, previousX) {
    const P = pen(), corn = ZS.sim.corn, level = game.level;
    let x = P.hold(level, previousX, hunter.x, P.KEEP.hunter);
    let away = P.side(level, x);
    if (x === hunter.x) {
      x = corn.hold(level, previousX, hunter.x);
      away = corn.side(level, x);
    }
    if (x === hunter.x) return;
    hunter.x = x;
    turnAwayFromFence(hunter, away);
  }

  function turnAwayFromFence(hunter, away) {
    if (hunter.kind === 'ztmh' && hunter.out) hunter.out = away;
    if (hunter.react === 'gone') {
      hunter.dir = away;
    } else if (hunter.react === 'flee') {
      hunter.reactT = Math.max(hunter.reactT, FLEE_ENDS_AT);
    } else if (hunter.react) {
      return;
    } else if (hunter.scaredT > 0) {
      hunter.scaredT = 0;
      hunter.pause = SCARE.waitAfterFence;
      hunter.flip = away;
    } else if (hunter.kind !== 'ztmh' && !(hunter.pause > 0)) {
      hunter.pause = PATROL.waitWhenFenced;
      hunter.flip = away;
    }
  }

  function sweepLimits(hunter) {
    if (hunter.kind === 'posed') return [hunter.x - hunter.range, hunter.x + hunter.range];
    const near = hunter.x + hunter.dir * SWEEP.nearEdge;
    const far = hunter.x + hunter.dir * hunter.range;
    return near < far ? [near, far] : [far, near];
  }

  function sweepCrosshair(hunter, dt) {
    const [from, to] = sweepLimits(hunter);
    if (hunter.alertX !== null) {
      swingToAlert(hunter, from, to, dt);
    } else if (hunter.sweepPause > 0) {
      hunter.sweepPause -= dt;
    } else {
      hunter.cross += hunter.crossDir * hunter.sweep * dt;
      if (hunter.cross > to || hunter.cross < from) {
        hunter.cross = clamp(hunter.cross, from, to);
        hunter.crossDir *= -1;
        hunter.sweepPause = SWEEP.shortestRest + Math.random() * SWEEP.restExtra;
      }
    }
  }

  function swingToAlert(hunter, from, to, dt) {
    const target = clamp(hunter.alertX, from, to);
    const gap = target - hunter.cross;
    hunter.cross += Math.sign(gap) * Math.min(Math.abs(gap), SWEEP.alertSpeed * dt);
    if (Math.abs(target - hunter.cross) < SWEEP.alertDone) hunter.alertX = null;
  }

  function followTracks(game, hunter, dt) {
    if (hunter.kind !== 'walker' || !game.tracks.length) return;
    hunter.trackCd -= dt;
    if (hunter.trackCd > 0) return;
    const fresh = game.tracks.find((track) => game.time - track.t < TRACKS.freshFor
      && Math.abs(track.x - hunter.x) < TRACKS.noticedWithin);
    if (!fresh) return;
    const bear = game.bear;
    hunter.trackCd = TRACKS.cooldown;
    hunter.alertX = bear.x;
    hunter.dir = Math.sign(bear.x - hunter.x) || hunter.dir;
    rules().float(game, hunter.x, GROUND - TRACKS.labelHeight, LABELS.tracks, COLORS.seen);
    if (!game.once.tracks) {
      game.once.tracks = true;
      rules().say(game, NEWS.tracks);
    }
  }

  function getScaredByHidingBear(game, hunter) {
    const bear = game.bear;
    if (!bear.hiding || hunter.kind === 'posed' || hunter.scaredT > 0) return;
    if (Math.abs(bear.x - hunter.x) >= SCARE.bearWithin) return;
    hunter.scaredT = SCARE.seconds;
    hunter.dir = Math.sign(hunter.x - bear.x) || 1;
    hunter.lock = 0;
    hunter.pause = 0;
    rules().float(game, hunter.x, GROUND - SCARE.labelHeight, LABELS.hunterScared, COLORS.bad);
    rules().addPanic(game, SCARE.panic, NEWS.hunterScared);
  }

  function update(game, dt) {
    const bear = game.bear;
    if (game.ride) {
      bear.warn = false;
      return;
    }
    const frame = {
      aimFactor: aimFactor(game),
      courtPause: game.time < game.courtUntil,
      calm: game.time < (game.liftCalm || 0) || ZS.sim.logging.hold(game),
      aiming: game.shooters.find((hunter) => hunter.lock > 0) || null,
    };
    for (const hunter of game.shooters) updateHunter(game, hunter, frame, dt);
    game.shooters = game.shooters.filter((hunter) => !hunter.dead);
    bear.warn = !bear.covered && game.shooters.some((hunter) => watchesBear(bear, hunter));
  }

  function updateHunter(game, hunter, frame, dt) {
    tickTimers(game, hunter, dt);
    if (hunter.react) {
      playReaction(game, hunter, frame, dt);
      return;
    }
    if (hunter.kind !== 'ztmh' && Math.abs(hunter.x - game.bear.x) > SHOT.ignoredBeyond) return;
    if (hunter.wobble > SHOT.tooWobbly) {
      hunter.lock = 0;
      stopAiming(hunter, frame);
      return;
    }
    const previousX = hunter.x;
    move(game, hunter, dt);
    if (hunter.dead) return;
    stopAtFences(game, hunter, previousX);
    followTracks(game, hunter, dt);
    getScaredByHidingBear(game, hunter);
    hunt(game, hunter, frame, dt);
  }

  function tickTimers(game, hunter, dt) {
    hunter.reload -= dt;
    if (hunter.kick > 0) hunter.kick = Math.max(0, hunter.kick - dt * SHOT.kickRecovery);
    if (hunter.life === Infinity) return;
    hunter.life -= dt;
    if (hunter.life <= 0 && !hunter.react) {
      hunter.react = 'gone';
      hunter.reactT = 0;
      hunter.dir = Math.sign(hunter.x - game.bear.x) || 1;
    }
  }

  function playReaction(game, hunter, frame, dt) {
    const previousX = hunter.x;
    ZS.sim.encounters.reactShooter(game, hunter, dt);
    stopAtFences(game, hunter, previousX);
    stopAiming(hunter, frame);
  }

  function stopAiming(hunter, frame) {
    hunter.blocked = true;
    if (frame.aiming === hunter) frame.aiming = null;
  }

  function hunt(game, hunter, frame, dt) {
    const mayShoot = (hunter.kind === 'poacher' || !frame.courtPause) && hunter.scaredT <= 0 && !frame.calm;
    const nobodyElseAiming = !frame.aiming || frame.aiming === hunter;
    hunter.blocked = !mayShoot;
    if (mayShoot && nobodyElseAiming && seesBear(game, hunter)) {
      aimAndFire(game, hunter, frame, dt);
      return;
    }
    if (mayShoot && suspectsBearBehindTree(game, hunter, frame)) {
      rules().fire(game, hunter, 'tree');
      hunter.reload = SHOT.reload;
    }
    hunter.lock = Math.max(0, hunter.lock - dt * SHOT.aimDecay);
    if (frame.aiming === hunter && hunter.lock === 0) frame.aiming = null;
    if (hunter.kind === 'ztmh' && !hunter.patrol) hunter.lost += dt;
    sweepCrosshair(hunter, dt);
  }

  function seesBear(game, hunter) {
    const bear = game.bear;
    const distance = Math.abs(bear.x - hunter.x);
    const posed = hunter.kind === 'posed';
    const facing = posed || Math.sign(bear.x - hunter.x) === hunter.dir || distance < SHOT.seesBehindWithin;
    const blindUnderPost = posed && distance < SHOT.blindUnderPost && !ZS.sim.ladder.exposed(game, hunter);
    const pointBlank = !posed && distance < SHOT.pointBlank;
    const onCrosshair = Math.abs(hunter.cross - bear.x) < SHOT.onCrosshair;
    return !blindUnderPost && !bear.covered && facing && distance < hunter.range && bear.inv <= 0
      && (onCrosshair || pointBlank);
  }

  function aimAndFire(game, hunter, frame, dt) {
    const bear = game.bear;
    frame.aiming = hunter;
    hunter.cross += (bear.x - hunter.cross) * Math.min(1, dt * SHOT.crosshairSnap);
    hunter.lock += dt * aimSpeed(game);
    hunter.lost = 0;
    game.lastKnown = bear.x;
    if (hunter.lock >= hunter.aimTime * frame.aimFactor && hunter.reload <= 0) {
      rules().fire(game, hunter);
      hunter.lock = 0;
      hunter.reload = SHOT.reload;
      frame.aiming = null;
    }
  }

  function aimSpeed(game) {
    const thicket = game.bear.thicket ? ZS.sim.lot.AIM : 1;
    return ZS.sim.corn.aim(game) * thicket;
  }

  function suspectsBearBehindTree(game, hunter, frame) {
    const bear = game.bear;
    return bear.covered && !bear.fogged
      && hunter.lock > hunter.aimTime * frame.aimFactor * SHOT.treeShotAim
      && hunter.reload <= 0
      && Math.abs(hunter.cross - bear.x) < SHOT.treeShotSpread;
  }

  function watchesBear(bear, hunter) {
    if (hunter.react) return false;
    if (hunter.lock > 0) return true;
    return Math.abs(hunter.cross - bear.x) < SHOT.warnSpread && Math.abs(hunter.x - bear.x) < hunter.range;
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.hunters = { create, update, alert, aimFactor };
})();
