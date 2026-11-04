(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GROUND = CFG.GROUND;
  const rules = () => ZS.sim.rules;

  const MARMOT = { see: 250, sneak: 115, calm: 320, alarm: 0.6, dive: 0.3, hide: 2.6, peek: 2.4, rise: 0.5 };
  const CHAMOIS = { see: 320, sneak: 160, far: 820, leap: 0.5, rest: 5 };
  const PORTER = { up: 22, down: 44, unload: 7, load: 5, near: 120, said: 14 };

  const LONG_AGO = -99;
  const NEWS_REPEAT_AFTER = 45;
  const THICKET_MARGIN = 12;
  const RUNNING_VISIBILITY = 1.3;

  const RANDOM = {
    multiplier: 16807,
    modulus: 2147483647,
    range: 2147483646,
  };

  const SEED = {
    marmot: 7919,
    marmotOffset: 3,
    chamois: 4111,
    chamoisOffset: 2,
    terrace: 7577,
  };

  const START = {
    marmotWait: 1,
    marmotWaitStep: 1.7,
    chamoisWait: 1.2,
    chamoisWaitStep: 0.9,
    chamoisStandAside: 6,
    chamoisLandAside: 7,
    porterAlongTrail: 0.18,
  };

  const LABEL_HEIGHT = {
    whistle: 62,
    snort: 120,
    porter: 150,
    terrace: 170,
    cover: 110,
  };

  const BASKING = {
    poseShortest: 2,
    poseExtra: 4,
    turnChance: 0.4,
    afterPeekShortest: 2.5,
    afterPeekExtra: 2,
  };

  const WHISTLE = {
    sitUpAtLeast: 0.6,
    heardWithin: 420,
    echoShortest: 0.2,
    echoExtra: 0.35,
    quietFor: 3,
  };

  const BURROW = {
    holdWhileBearNear: 0.5,
    peekHeight: 0.42,
    peekEase: 6,
    peekSight: 0.8,
  };

  const HERD = {
    grazeShortest: 2,
    grazeExtra: 3,
    leaderStare: 0.35,
    stareShortest: 0.3,
    stareExtra: 0.45,
    followerStare: 0.35,
    followerStareExtra: 0.5,
    skipChance: 0.3,
    homeGrazeShortest: 1,
    homeGrazeExtra: 2,
  };

  const LEAP = {
    homewardDuration: 0.62,
    paceFrom: 0.92,
    paceSpread: 0.16,
    clearance: 14,
    risePerWidth: 0.14,
    fleeCrouch: 0.06,
    fleeCrouchExtra: 0.12,
    homewardCrouch: 0.5,
    homewardCrouchExtra: 0.6,
  };

  const HUT = {
    see: 340,
    hear: 700,
    panic: 5,
    chatShortest: 6,
    chatExtra: 4,
    terraceOffset: 210,
    labelOffset: 60,
    alarmRise: 2.5,
    alarmFade: 0.4,
  };

  const SCREE = {
    quietFor: 1.6,
    hooves: 0.6,
    offSlab: 0.8,
    running: 0.5,
  };

  const SLAB = {
    reach: 10,
    standsAbove: 4,
    stepsDown: 0.5,
  };

  function seededRandom(owner) {
    owner.seed = (owner.seed * RANDOM.multiplier) % RANDOM.modulus;
    return (owner.seed - 1) / RANDOM.range;
  }

  function inThicket(level, x) {
    const zone = level && level.alpine;
    if (!zone) return false;
    return zone.thickets.some((thicket) => x > thicket[0] - THICKET_MARGIN && x < thicket[1] + THICKET_MARGIN);
  }

  function cragRoute(zone) {
    return zone.crag.ledges.concat(zone.crag.perch);
  }

  function create(level) {
    const zone = level.alpine;
    return {
      marmots: zone.marmots.map(newMarmot),
      chamois: zone.crag.ledges.map((ledge, index) => newChamois(zone, ledge, index)),
      porter: newPorter(zone.porter),
      hut: { alarm: 0, seen: false, chat: 0, seed: SEED.terrace },
      said: {},
      screeAt: LONG_AGO,
    };
  }

  function newMarmot(rock, index) {
    return {
      id: 'marmot' + index,
      x: rock.x,
      h: rock.h,
      dir: index % 2 ? -1 : 1,
      state: 'sit',
      pose: 'sit',
      t: START.marmotWait + index * START.marmotWaitStep,
      k: 1,
      seed: SEED.marmot * (index + SEED.marmotOffset),
      whistleAt: LONG_AGO,
    };
  }

  function newChamois(zone, ledge, index) {
    const ledgeCount = zone.crag.ledges.length;
    return {
      id: 'chamois' + index,
      x: ledge[0] + (index % 2 ? START.chamoisStandAside : -START.chamoisStandAside),
      h: ledge[1],
      at: index,
      home: index,
      top: ledgeCount + (index % zone.crag.perch.length),
      dir: index % 2 ? 1 : -1,
      state: 'graze',
      t: START.chamoisWait + index * START.chamoisWaitStep,
      leap: null,
      seed: SEED.chamois * (index + SEED.chamoisOffset),
      kid: index === ledgeCount - 1,
      off: index % 2 ? START.chamoisLandAside : -START.chamoisLandAside,
      calm: 0,
      snortAt: LONG_AGO,
    };
  }

  function newPorter(trail) {
    return {
      id: 'porter',
      x: trail.from + (trail.to - trail.from) * START.porterAlongTrail,
      dir: 1,
      state: 'up',
      t: 0,
      load: true,
      saidAt: LONG_AGO,
      met: false,
    };
  }

  function update(game, dt) {
    const level = game.level;
    const zone = level.alpine;
    if (!zone) return;
    const alpine = game.alpine || (game.alpine = create(level));
    const bear = game.bear;
    if (bear.x > zone.line) announceOnce(game, 'alpine', NEWS.alpine, ZS.QUIPS.alpine);
    if (bear.x > zone.lake.from) announceOnce(game, 'altitude', NEWS.altitude, ZS.QUIPS.altitude);
    hideInDwarfPines(game);
    rattleFootsteps(game);
    for (const marmot of alpine.marmots) updateMarmot(game, marmot, dt);
    const route = cragRoute(zone);
    for (const chamois of alpine.chamois) updateChamois(game, chamois, dt, route);
    updatePorter(game, alpine.porter, dt);
    updateTerrace(game, alpine.hut, dt);
  }

  function announceOnce(game, flag, news, quip) {
    if (game.once[flag] || game.ride) return;
    game.once[flag] = true;
    rules().say(game, news);
    rules().quip(game, quip, true);
  }

  function sayNowAndThen(game, topic, news) {
    const said = game.alpine.said;
    if (game.time - said[topic] < NEWS_REPEAT_AFTER) return;
    said[topic] = game.time;
    rules().say(game, news);
  }

  function hideInDwarfPines(game) {
    const bear = game.bear;
    const inPines = inThicket(game.level, bear.x) && standsFree(bear);
    if (inPines && bear.crouch) bear.covered = true;
    bear.thicket = inPines && !bear.covered;
    if (inPines && bear.crouch && !game.once.kosodrevina) findCoverInPines(game);
  }

  function standsFree(bear) {
    return bear.onGround && !bear.climbing && !bear.act && !(bear.stun > 0);
  }

  function findCoverInPines(game) {
    game.once.kosodrevina = true;
    rules().float(game, game.bear.x, GROUND - LABEL_HEIGHT.cover, LABELS.alpine.cover, COLORS.good);
    rules().quip(game, ZS.QUIPS.kosodrevina, true);
    rules().say(game, NEWS.kosodrevina);
  }

  function rattleFootsteps(game) {
    const bear = game.bear;
    const level = game.level;
    if (game.ride || bear.x < level.alpine.line || !bear.onGround || bear.climbing) return;
    if (stepsOffSlab(level, bear)) rattleScree(game, bear.x, SCREE.offSlab);
    else if (bear.moving && bear.running && !inThicket(level, bear.x)) rattleScree(game, bear.x, SCREE.running);
  }

  function stepsOffSlab(level, bear) {
    const slab = level.logs.find((log) => log.rock && Math.abs(bear.x - log.x) < log.w / 2 + SLAB.reach);
    if (!slab) return false;
    return bear.y < GROUND - SLAB.standsAbove && bear.prevY !== undefined && bear.prevY < bear.y - SLAB.stepsDown;
  }

  function rattleScree(game, x, loudness) {
    const alpine = game.alpine;
    if (game.time - alpine.screeAt < SCREE.quietFor) return;
    alpine.screeAt = game.time;
    rules().onSound(game, 'scree', x, loudness);
  }

  function seesBear(bear, distance, senses) {
    if (bear.covered) return false;
    return distance < sightRange(bear, senses);
  }

  function sightRange(bear, senses) {
    if (bear.crouch && !bear.running) return senses.sneak;
    if (bear.running && bear.moving) return senses.see * RUNNING_VISIBILITY;
    return senses.see;
  }

  function turnToward(animal, x) {
    animal.dir = Math.sign(x - animal.x) || animal.dir;
  }

  function updateMarmot(game, marmot, dt) {
    const bear = game.bear;
    const distance = Math.abs(bear.x - marmot.x);
    const threat = !game.ride && seesBear(bear, distance, MARMOT);
    marmot.t -= dt;
    if (isAtEase(marmot)) sitOrGraze(game, marmot, threat, dt);
    else if (marmot.state === 'alarm') stayAlarmed(marmot, dt);
    else if (marmot.state === 'dive') diveIntoBurrow(marmot, dt);
    else if (marmot.state === 'hidden') waitInBurrow(bear, marmot, distance);
    else if (marmot.state === 'peek') peekOut(game, marmot, distance, threat, dt);
  }

  function isAtEase(marmot) {
    return marmot.state === 'sit' || marmot.state === 'graze';
  }

  function sitOrGraze(game, marmot, threat, dt) {
    standUp(marmot, dt);
    if (threat) {
      whistle(game, marmot);
      return;
    }
    if (marmot.t <= 0) switchBetweenSitAndGraze(marmot);
  }

  function standUp(marmot, dt) {
    marmot.k = Math.min(1, marmot.k + dt / MARMOT.rise);
  }

  function switchBetweenSitAndGraze(marmot) {
    marmot.state = marmot.state === 'sit' ? 'graze' : 'sit';
    marmot.pose = marmot.state;
    marmot.t = BASKING.poseShortest + seededRandom(marmot) * BASKING.poseExtra;
    if (seededRandom(marmot) < BASKING.turnChance) marmot.dir *= -1;
  }

  function whistle(game, marmot) {
    sitUpAlarmed(game.bear, marmot, false);
    marmot.whistleAt = game.time;
    rules().onSound(game, 'marmot', marmot.x);
    rules().float(game, marmot.x, GROUND - marmot.h - LABEL_HEIGHT.whistle, LABELS.alpine.whistle, COLORS.story);
    sayNowAndThen(game, 'marmot', NEWS.marmot);
    for (const neighbour of game.alpine.marmots) {
      if (hearsWhistle(neighbour, marmot)) sitUpAlarmed(game.bear, neighbour, true);
    }
  }

  function hearsWhistle(neighbour, whistler) {
    return neighbour !== whistler && Math.abs(neighbour.x - whistler.x) < WHISTLE.heardWithin && isAtEase(neighbour);
  }

  function sitUpAlarmed(bear, marmot, echoing) {
    marmot.state = 'alarm';
    marmot.pose = 'sit';
    marmot.k = Math.max(marmot.k, WHISTLE.sitUpAtLeast);
    marmot.t = MARMOT.alarm + (echoing ? WHISTLE.echoShortest + seededRandom(marmot) * WHISTLE.echoExtra : 0);
    turnToward(marmot, bear.x);
  }

  function stayAlarmed(marmot, dt) {
    standUp(marmot, dt);
    if (marmot.t <= 0) {
      marmot.state = 'dive';
      marmot.t = 0;
    }
  }

  function diveIntoBurrow(marmot, dt) {
    marmot.k = Math.max(0, marmot.k - dt / MARMOT.dive);
    if (marmot.k <= 0) {
      marmot.state = 'hidden';
      marmot.t = MARMOT.hide + seededRandom(marmot);
    }
  }

  function waitInBurrow(bear, marmot, distance) {
    const bearInSight = distance < MARMOT.calm && !bear.covered;
    if (bearInSight) marmot.t = Math.max(marmot.t, MARMOT.hide * BURROW.holdWhileBearNear);
    if (marmot.t <= 0) {
      marmot.state = 'peek';
      marmot.t = MARMOT.peek + seededRandom(marmot);
    }
  }

  function peekOut(game, marmot, distance, threat, dt) {
    marmot.k += (BURROW.peekHeight - marmot.k) * Math.min(1, dt * BURROW.peekEase);
    turnToward(marmot, game.bear.x);
    if (threat && distance < MARMOT.see * BURROW.peekSight) {
      duckBack(game, marmot);
      return;
    }
    if (marmot.t <= 0) comeOut(marmot);
  }

  function duckBack(game, marmot) {
    marmot.state = 'dive';
    if (game.time - marmot.whistleAt > WHISTLE.quietFor) {
      marmot.whistleAt = game.time;
      rules().onSound(game, 'marmot', marmot.x, 'short');
    }
  }

  function comeOut(marmot) {
    marmot.state = 'sit';
    marmot.pose = 'sit';
    marmot.t = BASKING.afterPeekShortest + seededRandom(marmot) * BASKING.afterPeekExtra;
  }

  function updateChamois(game, chamois, dt, route) {
    chamois.t -= dt;
    if (chamois.leap) {
      continueLeap(game, chamois, dt);
      return;
    }
    const bear = game.bear;
    const distance = Math.abs(bear.x - chamois.x);
    const threat = !game.ride && seesBear(bear, distance, CHAMOIS);
    if (chamois.state === 'graze') graze(game, chamois, threat);
    else if (chamois.state === 'look') stareThenFlee(chamois);
    else if (chamois.state === 'flee') climbAway(bear, chamois, route);
    else if (chamois.state === 'perch') watchFromPerch(game, chamois, distance, dt);
    else if (chamois.state === 'back') headHome(chamois, route, distance, threat);
  }

  function graze(game, chamois, threat) {
    if (threat) {
      startle(game, chamois);
      return;
    }
    if (chamois.t <= 0) {
      chamois.t = HERD.grazeShortest + seededRandom(chamois) * HERD.grazeExtra;
      chamois.dir *= seededRandom(chamois) < 0.5 ? -1 : 1;
    }
  }

  function startle(game, chamois) {
    const firstToNotice = !game.alpine.chamois.some(isOnAlert);
    chamois.state = 'look';
    chamois.t = firstToNotice ? HERD.leaderStare : HERD.stareShortest + seededRandom(chamois) * HERD.stareExtra;
    turnToward(chamois, game.bear.x);
    if (firstToNotice) snort(game, chamois);
  }

  function isOnAlert(chamois) {
    return chamois.state === 'look' || chamois.state === 'flee';
  }

  function snort(game, chamois) {
    chamois.snortAt = game.time;
    rules().onSound(game, 'chamois', chamois.x);
    rules().float(game, chamois.x, GROUND - chamois.h - LABEL_HEIGHT.snort, LABELS.alpine.chamois, COLORS.story);
    sayNowAndThen(game, 'chamois', NEWS.chamois);
    for (const other of game.alpine.chamois) {
      if (other !== chamois && other.state === 'graze' && !other.leap) lookUp(game.bear, other);
    }
  }

  function lookUp(bear, chamois) {
    chamois.state = 'look';
    chamois.t = HERD.followerStare + seededRandom(chamois) * HERD.followerStareExtra;
    turnToward(chamois, bear.x);
  }

  function stareThenFlee(chamois) {
    if (chamois.t <= 0) chamois.state = 'flee';
  }

  function climbAway(bear, chamois, route) {
    if (chamois.at >= chamois.top) {
      settleOnPerch(bear, chamois);
      return;
    }
    leapTo(chamois, route, nextSpotUp(chamois), false);
  }

  function settleOnPerch(bear, chamois) {
    chamois.state = 'perch';
    chamois.calm = 0;
    chamois.dir = Math.sign(bear.x - chamois.x) || -1;
  }

  function nextSpotUp(chamois) {
    if (chamois.at + 1 < chamois.top) return chamois.at + 1 + (skipsASpot(chamois) ? 1 : 0);
    return chamois.top;
  }

  function skipsASpot(chamois) {
    return chamois.at + 2 < chamois.top && seededRandom(chamois) < HERD.skipChance;
  }

  function watchFromPerch(game, chamois, distance, dt) {
    turnToward(chamois, game.bear.x);
    const safe = distance > CHAMOIS.far || game.ride;
    chamois.calm = safe ? chamois.calm + dt : 0;
    if (chamois.calm > CHAMOIS.rest) chamois.state = 'back';
  }

  function headHome(chamois, route, distance, threat) {
    if (threat && distance < CHAMOIS.see) {
      chamois.state = 'flee';
      return;
    }
    if (chamois.at <= chamois.home) {
      chamois.state = 'graze';
      chamois.t = HERD.homeGrazeShortest + seededRandom(chamois) * HERD.homeGrazeExtra;
      return;
    }
    leapTo(chamois, route, nextSpotDown(chamois), true);
  }

  function nextSpotDown(chamois) {
    return chamois.at - 1 > chamois.home ? chamois.at - 1 : chamois.home;
  }

  function leapTo(chamois, route, spotIndex, homeward) {
    const spot = route[spotIndex];
    const landingX = spot[0] + chamois.off;
    const landingHeight = spot[1];
    chamois.leap = {
      x0: chamois.x,
      h0: chamois.h,
      x1: landingX,
      h1: landingHeight,
      t: 0,
      dur: leapDuration(chamois, homeward),
      top: peakHeight(chamois, landingX, landingHeight),
      wait: crouchTime(chamois, homeward),
      to: spotIndex,
    };
    turnToward(chamois, landingX);
  }

  function leapDuration(chamois, homeward) {
    const duration = homeward ? LEAP.homewardDuration : CHAMOIS.leap;
    return duration * (LEAP.paceFrom + LEAP.paceSpread * seededRandom(chamois));
  }

  function peakHeight(chamois, landingX, landingHeight) {
    return Math.max(chamois.h, landingHeight) + LEAP.clearance + Math.abs(landingX - chamois.x) * LEAP.risePerWidth;
  }

  function crouchTime(chamois, homeward) {
    if (homeward) return LEAP.homewardCrouch + seededRandom(chamois) * LEAP.homewardCrouchExtra;
    return LEAP.fleeCrouch + seededRandom(chamois) * LEAP.fleeCrouchExtra;
  }

  function continueLeap(game, chamois, dt) {
    const leap = chamois.leap;
    if (leap.wait > 0) {
      leap.wait -= dt;
      chamois.crouch = 1;
      return;
    }
    chamois.crouch = 0;
    leap.t += dt / leap.dur;
    const progress = Math.min(1, leap.t);
    chamois.x = leap.x0 + (leap.x1 - leap.x0) * progress;
    chamois.h = arcHeight(leap, progress);
    chamois.air = progress < 1 ? 1 : 0;
    if (progress >= 1) land(game, chamois, leap);
  }

  function arcHeight(leap, progress) {
    const remaining = 1 - progress;
    return remaining * remaining * leap.h0 + 2 * progress * remaining * leap.top + progress * progress * leap.h1;
  }

  function land(game, chamois, leap) {
    chamois.at = leap.to;
    chamois.h = leap.h1;
    chamois.leap = null;
    chamois.land = game.time;
    rattleScree(game, chamois.x, SCREE.hooves);
  }

  function updatePorter(game, porter, dt) {
    porter.t -= dt;
    walkTrail(game.level.alpine.porter, porter, dt);
    if (canGreetBear(game, porter)) greetBear(game, porter);
  }

  function walkTrail(trail, porter, dt) {
    if (porter.state === 'up') carryLoadUp(trail, porter, dt);
    else if (porter.state === 'unload') finishUnloading(porter);
    else if (porter.state === 'down') walkDown(trail, porter, dt);
    else if (porter.state === 'load') finishLoading(porter);
  }

  function carryLoadUp(trail, porter, dt) {
    porter.dir = 1;
    porter.x += PORTER.up * dt;
    if (porter.x >= trail.to) {
      porter.x = trail.to;
      porter.state = 'unload';
      porter.t = PORTER.unload;
      porter.load = false;
    }
  }

  function finishUnloading(porter) {
    if (porter.t <= 0) {
      porter.state = 'down';
      porter.dir = -1;
    }
  }

  function walkDown(trail, porter, dt) {
    porter.x -= PORTER.down * dt;
    if (porter.x <= trail.from) {
      porter.x = trail.from;
      porter.state = 'load';
      porter.t = PORTER.load;
    }
  }

  function finishLoading(porter) {
    if (porter.t <= 0) {
      porter.state = 'up';
      porter.load = true;
    }
  }

  function canGreetBear(game, porter) {
    const bear = game.bear;
    const near = Math.abs(bear.x - porter.x) < PORTER.near;
    return near && !bear.covered && !game.ride && game.time - porter.saidAt > PORTER.said;
  }

  function greetBear(game, porter) {
    porter.saidAt = game.time;
    const lines = porter.load ? LABELS.alpine.porter : LABELS.alpine.porterFree;
    rules().float(game, porter.x, GROUND - LABEL_HEIGHT.porter, pickLine(lines), COLORS.story);
    if (!porter.met) meetPorter(game, porter);
  }

  function pickLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function meetPorter(game, porter) {
    porter.met = true;
    rules().say(game, NEWS.porter);
    rules().quip(game, ZS.QUIPS.porter, true);
  }

  function updateTerrace(game, terrace, dt) {
    const hut = game.level.alpine.hut;
    const bear = game.bear;
    const distance = Math.abs(bear.x - hut.x);
    terrace.chat -= dt;
    if (terrace.chat <= 0 && distance < HUT.hear && !game.ride) chatter(game, terrace, hut);
    const bearInView = !bear.covered && distance < HUT.see && !game.ride;
    const change = bearInView ? dt * HUT.alarmRise : -dt * HUT.alarmFade;
    terrace.alarm = Math.max(0, Math.min(1, terrace.alarm + change));
    if (bearInView && !terrace.seen) filmBear(game, terrace, hut);
  }

  function chatter(game, terrace, hut) {
    terrace.chat = HUT.chatShortest + seededRandom(terrace) * HUT.chatExtra;
    rules().onSound(game, 'hut', hut.x - HUT.terraceOffset);
  }

  function filmBear(game, terrace, hut) {
    terrace.seen = true;
    rules().spotted(game, hut.x - HUT.labelOffset, GROUND - LABEL_HEIGHT.terrace, LABELS.alpine.terrace);
    rules().addPanic(game, HUT.panic, NEWS.hut);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.alpine = { update, thicket: inThicket, create, route: cragRoute, MARMOT, CHAMOIS, PORTER };
})();
