(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GROUND = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const pen = () => ZS.sim.pen;

  const GUN = { walker: 'hunt', ztmh: 'tac', poacher: 'old', posed: 'hunt' };
  const CARRIED = { picker: 'basket', tourist: 'phone', santa: 'sack', guest: 'mug', waiter: 'tray' };

  const SPILLED_FOOD = {
    picker:  { type: 'mushroom', labelKey: 'basket', count: 2 },
    santa:   { type: 'candy', count: 2 },
    tourist: { type: 'sandwich', count: 1 },
    waiter:  { type: 'halusky', count: 1 },
  };

  const BODY_SCALE = { ztmh: 1.04 };
  const CONTACT_AT = { bite: 0.16, hug: 0.3, selfie: 0.3, shake: 0.3 };
  const FREE_REACTIONS = ['fetch', 'pickup', 'flee', 'home'];

  const LEVEL_MARGIN = 40;
  const SHOUT_HEIGHT = 122;
  const VIRAL_FOR = 12;
  const ALERT_RADIUS = 1000;
  const WALK_SPEED = 62;

  const REACH = {
    behindWithin: 18,
    keepSlack: 40,
  };

  const STAND = {
    cabinHeight: 150,
    reach: 62,
    keepReach: 86,
    legSpread: 34,
    legNearest: 12,
    legFarthest: 52,
    legAhead: 30,
  };

  const HOLD = {
    hugDistance: 44,
    selfieDistance: 40,
    pull: 14,
  };

  const HUG = {
    throwSpeed: 30,
    throwLift: -80,
    firstCalming: 14,
    calmingFade: 4,
    leastCalming: 3,
    tiredAfter: 3,
    banAfter: 2,
    banDelay: 8,
    bannedLabelHeight: 140,
    bannedPanic: 10,
  };

  const BITE = {
    extraReach: 24,
    throwSpeed: 60,
    throwLift: -170,
    synanthropy: 25,
    pastProblem: 5,
    panic: 20,
  };

  const SELFIE = {
    snapAt: 1.2,
    synanthropy: 12,
    labelAhead: 58,
    shoutBehind: 40,
    shoutHeight: 116,
    calmingFirst: 2,
    calmingPanic: -8,
    annoyingPanic: 3,
    loudFirst: 3,
    mostTourists: 6,
    touristBeyondView: 200,
    touristBeforeEnd: 400,
    touristBeat: 300,
  };

  const SHAKE = {
    lasts: 1.5,
    rampUp: 0.3,
    rampDown: 0.6,
    swayAmplitude: 12,
    swayFrequency: 3.2,
    panic: 4,
  };

  const TOPPLE = {
    at: 1.2,
    throwSpeed: 60,
    throwSpeedExtra: 40,
    throwLift: -120,
    rifleAboveCabin: 20,
    labelAboveCabin: 60,
    shoutAboveCabin: 30,
    shoutAside: 30,
    panic: 6,
  };

  const FALL = {
    sideways: 34,
    boltThud: 0.7,
    thud: 1,
  };

  const STOMP = {
    headHeight: 78,
    overHead: 4,
    intoHead: 2,
    halfWidth: 36,
    bounce: -430,
    offCenter: 6,
    throwSpeed: 70,
    throwSpeedExtra: 60,
    throwLift: -260,
    throwLiftExtra: 80,
    labelHeight: 112,
    dustPuffs: 5,
    panic: 5,
    quipChance: 0.35,
  };

  const HEARTS = {
    count: 6,
    ahead: 20,
    aheadSpread: 30,
    height: 90,
    heightSpread: 20,
    drift: 40,
    rise: -40,
    riseSpread: 40,
    life: 1.1,
    lifeSpread: 0.6,
  };

  const DROP = {
    ahead: 8,
    height: 44,
    spin: 4,
    spinExtra: 5,
    fenceMargin: 60,
    previewSteps: 600,
    straightDownSpin: 0.3,
  };

  const SPILL = {
    ahead: 10,
    spacing: 26,
    fenceMargin: 36,
  };

  const FLIGHT = {
    gravity: 1500,
    bounceAbove: 220,
    rebound: -0.32,
    bounceSlowdown: 0.55,
    bounceSpin: 0.5,
    friction: 7,
    flatten: 9,
    restSpeed: 4,
    restTilt: 0.02,
  };

  const RIFLE = {
    armLength: 16,
    underFeet: 4,
    pickupWithin: 22,
    onSpot: 2,
    slideTime: 0.2,
    sweepPause: 0.4,
    reloadAtLeast: 1,
  };

  const LEAVE = {
    boltSpeed: 210,
    clutchSpeed: 150,
    calmSpeed: 80,
    goneBeyond: 1700,
  };

  const FLEE = {
    speed: 190,
    endsAt: 3.2,
  };

  const CLIMB = {
    arrivedWithin: 1,
    scaredWithin: 140,
    shoutHeight: 96,
    sweepPause: 0.6,
    reloadAtLeast: 1,
  };

  function humans(game) {
    const list = [];
    for (const person of game.people) {
      if (!person.dead) list.push(person);
    }
    for (const hunter of game.shooters) {
      if (!onStand(hunter) && !hunter.dead) list.push(hunter);
    }
    return list;
  }

  function onStand(hunter) {
    return hunter.kind === 'posed' && !hunter.react;
  }

  function free(human) {
    return !human.react || FREE_REACTIONS.includes(human.react);
  }

  function isHunter(human) {
    return !!GUN[human.kind];
  }

  function target(game) {
    const bear = game.bear;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const human of humans(game)) {
      if (!approachable(game, human) || outOfReach(bear, human)) continue;
      const distance = Math.abs(human.x - bear.x);
      if (distance < nearestDistance) {
        nearest = human;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function approachable(game, human) {
    if (!free(human) || human.leaving || human.hurdle || human.kind === 'forester') return false;
    return !fencedOff(game, human);
  }

  function fencedOff(game, human) {
    const level = game.level;
    return pen().inside(level, human.x, 0) || pen().between(level, game.bear.x, human.x);
  }

  function outOfReach(bear, human) {
    const offset = human.x - bear.x;
    const distance = Math.abs(offset);
    return distance > CFG.REACH || (distance > REACH.behindWithin && Math.sign(offset) !== bear.dir);
  }

  function stand(game) {
    const bear = game.bear;
    for (const post of game.level.posts) {
      if (Math.abs(post.x - bear.x) > postReach(bear, post)) continue;
      const hunter = game.shooters.find((shooter) => onStand(shooter) && shooter.home === post.x);
      if (!hunter) continue;
      return { post, shooter: hunter, legX: legToShake(bear, post) };
    }
    return null;
  }

  function postReach(bear, post) {
    return bear.reach && bear.reach.post === post ? STAND.keepReach : STAND.reach;
  }

  function legToShake(bear, post) {
    const legs = [post.x - STAND.legSpread, post.x + STAND.legSpread];
    const leg = legs.find((legX) => legInFront(bear, legX));
    return leg === undefined ? bear.x + bear.dir * STAND.legAhead : leg;
  }

  function legInFront(bear, legX) {
    const ahead = (legX - bear.x) * bear.dir;
    return ahead >= STAND.legNearest && ahead <= STAND.legFarthest;
  }

  function idle(bear) {
    return !bear.act && !bear.hiding && !bear.climbing && bear.onGround;
  }

  function findReach(game) {
    return target(game) || keptReach(game) || stand(game);
  }

  function keptReach(game) {
    const reach = game.bear.reach;
    return reach && stillInReach(game, reach) ? reach : null;
  }

  function stillInReach(game, reach) {
    if (reach.post || reach.kind === 'photographer' || reach.dead) return false;
    if (!approachable(game, reach)) return false;
    return Math.abs(reach.x - game.bear.x) <= CFG.REACH + REACH.keepSlack;
  }

  function begin(game, act) {
    if (act.kind === 'hug') grabForHug(game, act, act.target);
    else if (act.kind === 'selfie') poseForSelfie(act, act.target);
    else if (act.kind === 'shake') grabLeg(act, act.target);
  }

  function grabForHug(game, act, human) {
    dropRifleBeingPickedUp(game, human);
    human.react = 'hugged';
    human.reactT = 0;
    human.hugK = 0;
    human.hugBy = act;
    human.lock = 0;
    human.alertX = null;
    human.pause = 0;
    human.dir = Math.sign(game.bear.x - human.x) || -act.dir;
  }

  function poseForSelfie(act, human) {
    human.react = 'selfie';
    human.reactT = 0;
    human.selfieK = 0;
    human.hugBy = act;
    human.pause = 0;
    human.dir = act.dir;
  }

  function grabLeg(act, standInReach) {
    act.legX = standInReach.legX;
    act.sway = 0;
  }

  function dropRifleBeingPickedUp(game, human) {
    const rifle = human.rifle;
    if (!rifle || game.props.includes(rifle)) return;
    Object.assign(rifle, { x: human.x + human.dir * RIFLE.armLength, y: GROUND, vx: 0, vy: 0, rot: 0, rest: true });
    game.props.push(rifle);
  }

  function update(game, dt) {
    const bear = game.bear;
    const act = bear.act;
    if (act) playAct(game, act);
    holdHumans(game, dt);
    shakeStands(game, dt);
    stompOnHunters(game);
    flyProps(game, dt);
    bear.reach = idle(bear) ? findReach(game) : null;
  }

  function playAct(game, act) {
    if (!act.done && act.t >= CONTACT_AT[act.kind]) {
      act.done = true;
      makeContact(game, act);
    }
    if (act.kind === 'selfie' && act.hit && !act.snapped && act.t >= SELFIE.snapAt) {
      act.snapped = true;
      takeSelfie(game, act);
    }
    if (act.kind === 'shake' && act.hit && !act.toppled && act.t >= TOPPLE.at) {
      act.toppled = true;
      toppleStand(game, act);
    }
  }

  function makeContact(game, act) {
    const human = act.target;
    if (act.kind === 'hug' && stillHeld(human, act, 'hugged')) hugHuman(game, human);
    else if (act.kind === 'selfie' && stillHeld(human, act, 'selfie')) shoutForSelfie(game, act, human);
    else if (act.kind === 'shake' && act.target) startShakingStand(game, act);
    else if (act.kind === 'bite' && canBite(game, human)) biteHuman(game, act, human);
    else miss(game, act);
  }

  function stillHeld(human, act, reaction) {
    return !!human && human.react === reaction && human.hugBy === act;
  }

  function canBite(game, human) {
    return !!human && free(human) && Math.abs(human.x - game.bear.x) < CFG.REACH + BITE.extraReach;
  }

  function miss(game, act) {
    act.hit = false;
    rules().onSound(game, act.kind === 'bite' ? 'biteAir' : 'hugAir', game.bear.x);
    rules().quip(game, act.kind === 'hug' ? ZS.QUIPS.hugAir : ZS.QUIPS.biteAir);
  }

  const said = (map, human) => map[human.as || human.kind] || map.tourist;

  function hugHuman(game, human) {
    game.stats.hugs++;
    ZS.sim.capital.hugged(game, human);
    rules().onSound(game, 'hug', human.x);
    drop(game, human, -human.dir * HUG.throwSpeed, HUG.throwLift);
    rules().float(game, human.x, GROUND - SHOUT_HEIGHT, said(LABELS.shout.hug, human), COLORS.story);
    if (game.flags.hugBan) {
      reportBannedHug(game);
      return;
    }
    calmPanicWithHug(game, human);
    game.viralUntil = game.time + VIRAL_FOR;
    if (game.stats.hugs === HUG.banAfter && human.kind !== 'flinta') game.hugBanAt = game.time + HUG.banDelay;
    showHearts(game, game.bear);
    rules().quip(game, ZS.QUIPS.hugPerson, true);
  }

  function reportBannedHug(game) {
    rules().float(game, game.bear.x, GROUND - HUG.bannedLabelHeight, LABELS.hugBanned, COLORS.bad);
    rules().addPanic(game, HUG.bannedPanic, NEWS.hugBanned, true);
  }

  function calmPanicWithHug(game, human) {
    const hugs = game.stats.hugs;
    const calming = Math.max(HUG.leastCalming, HUG.firstCalming - HUG.calmingFade * (hugs - 1));
    const news = hugs > HUG.tiredAfter ? NEWS.hugTired : said(NEWS.hug, human);
    rules().addPanic(game, -calming, news, hugs <= HUG.tiredAfter);
  }

  function showHearts(game, bear) {
    for (let i = 0; i < HEARTS.count; i++) {
      game.particles.push({
        x: bear.x + bear.dir * (HEARTS.ahead + Math.random() * HEARTS.aheadSpread),
        y: GROUND - HEARTS.height - Math.random() * HEARTS.heightSpread,
        vx: (Math.random() - 0.5) * HEARTS.drift,
        vy: HEARTS.rise - Math.random() * HEARTS.riseSpread,
        t: HEARTS.life + Math.random() * HEARTS.lifeSpread,
        color: COLORS.love,
        heart: true,
      });
    }
  }

  function biteHuman(game, act, human) {
    dropRifleBeingPickedUp(game, human);
    getBitten(act, human);
    drop(game, human, act.dir * BITE.throwSpeed, BITE.throwLift);
    game.stats.bites++;
    rules().onSound(game, 'bite', human.x);
    game.lastHuman = game.time;
    game.syn = Math.min(100, Math.max(game.syn + BITE.synanthropy, CFG.PROBLEM + BITE.pastProblem));
    rules().float(game, human.x, GROUND - SHOUT_HEIGHT, said(LABELS.shout.bite, human), COLORS.bad);
    rules().addPanic(game, BITE.panic, said(NEWS.bite, human), true);
    rules().quip(game, ZS.QUIPS.bitePerson, true);
  }

  function getBitten(act, human) {
    human.react = 'bitten';
    human.reactT = 0;
    human.bitK = 0;
    human.lock = 0;
    human.alertX = null;
    human.pause = 0;
    human.dir = act.dir;
  }

  function shoutForSelfie(game, act, human) {
    const x = human.x - act.dir * SELFIE.shoutBehind;
    rules().float(game, x, GROUND - SELFIE.shoutHeight, LABELS.shout.selfie, COLORS.story);
  }

  function takeSelfie(game, act) {
    const human = act.target;
    if (!stillHeld(human, act, 'selfie')) return;
    const earlierSelfies = game.stats.selfies++;
    const promo = human.kind === 'tycoon';
    rules().onSound(game, 'selfie', human.x);
    game.syn = Math.min(100, game.syn + SELFIE.synanthropy);
    game.lastHuman = game.time;
    game.viralUntil = game.time + VIRAL_FOR;
    rules().float(game, human.x + act.dir * SELFIE.labelAhead, GROUND - SHOUT_HEIGHT, LABELS.selfie, COLORS.love);
    reportSelfie(game, earlierSelfies, promo);
    showHearts(game, game.bear);
    if (promo) rules().quip(game, ZS.QUIPS.tycoon, true);
    else if (touristCount(game) < SELFIE.mostTourists) inviteTourist(game);
  }

  function reportSelfie(game, earlierSelfies, promo) {
    const panic = earlierSelfies < SELFIE.calmingFirst ? SELFIE.calmingPanic : SELFIE.annoyingPanic;
    const news = promo ? NEWS.tycoon.promo : NEWS.selfie[Math.min(earlierSelfies, NEWS.selfie.length - 1)];
    rules().addPanic(game, panic, news, earlierSelfies < SELFIE.loudFirst || promo);
  }

  function touristCount(game) {
    return game.people.filter((person) => person.kind === 'tourist').length;
  }

  function inviteTourist(game) {
    const x = Math.min(game.level.w - SELFIE.touristBeforeEnd, game.bear.x + game.viewW + SELFIE.touristBeyondView);
    const beat = { from: x - SELFIE.touristBeat, to: x + SELFIE.touristBeat };
    game.people.push(ZS.sim.people.create(game, 'tourist', beat));
  }

  function startShakingStand(game, act) {
    const { post, shooter: hunter } = act.target;
    post.shakeT = 0;
    post.shakeBy = act;
    if (hunter && !hunter.react) hunter.dir = Math.sign(game.bear.x - post.x) || 1;
    alertHuntersAround(game, hunter);
    rules().onSound(game, 'shake', post.x);
    rules().addPanic(game, SHAKE.panic);
    rules().quip(game, ZS.QUIPS.shake, true);
  }

  function alertHuntersAround(game, hunterOnStand) {
    const bear = game.bear;
    for (const hunter of game.shooters) {
      if (Math.abs(hunter.x - bear.x) < ALERT_RADIUS && hunter !== hunterOnStand) hunter.alertX = bear.x;
    }
  }

  function toppleStand(game, act) {
    const { post, shooter: hunter } = act.target;
    if (!hunter || hunter.react || hunter.dead) return;
    const side = Math.sign(post.x - game.bear.x) || -act.dir;
    throwOffStand(hunter, post, side);
    const throwSpeed = side * (TOPPLE.throwSpeed + Math.random() * TOPPLE.throwSpeedExtra);
    drop(game, hunter, throwSpeed, TOPPLE.throwLift, GROUND - STAND.cabinHeight - TOPPLE.rifleAboveCabin);
    reportStandFall(game, post, side);
  }

  function throwOffStand(hunter, post, side) {
    hunter.react = 'drop';
    hunter.reactT = 0;
    hunter.dropK = 0;
    hunter.side = side;
    hunter.dir = -side;
    hunter.fy = GROUND - STAND.cabinHeight;
    hunter.fx = post.x;
    hunter.x = post.x;
    hunter.lock = 0;
    hunter.alertX = null;
    hunter.wobble = 0;
    hunter.sway = 0;
  }

  function reportStandFall(game, post, side) {
    const cabinFloor = GROUND - STAND.cabinHeight;
    const shoutX = post.x + side * TOPPLE.shoutAside;
    game.stats.stomps++;
    rules().onSound(game, 'standFall', post.x);
    rules().float(game, post.x, cabinFloor - TOPPLE.labelAboveCabin, LABELS.standFall, COLORS.story);
    rules().float(game, shoutX, cabinFloor - TOPPLE.shoutAboveCabin, LABELS.shout.fall, COLORS.story);
    rules().addPanic(game, TOPPLE.panic, NEWS.standFall[game.falls++ % NEWS.standFall.length], true);
  }

  function holdHumans(game, dt) {
    const act = game.bear.act;
    for (const human of humans(game)) {
      if (human.react !== 'hugged' && human.react !== 'selfie') continue;
      if (human.hugBy === act) pullIntoPose(game.bear, act, human, dt);
      else letGo(game, human);
    }
  }

  function pullIntoPose(bear, act, human, dt) {
    const progress = clamp(act.t / act.dur, 0, 1);
    if (human.react === 'hugged') human.hugK = progress;
    else human.selfieK = progress;
    const heldX = bear.x + act.dir * (human.react === 'hugged' ? HOLD.hugDistance : HOLD.selfieDistance);
    human.x += (heldX - human.x) * Math.min(1, dt * HOLD.pull);
  }

  function letGo(game, human) {
    human.reactT = 0;
    human.hugK = 1;
    human.hugBy = null;
    human.dir = Math.sign(human.x - game.bear.x) || 1;
    if (human.kind === 'tycoon') ZS.sim.tycoon.release(game, human);
    else if (ZS.sim.capital.release(game, human)) return;
    else if (human.react === 'selfie') walkOffTexting(human);
    else if (isHunter(human)) human.react = 'flee';
    else runAway(human);
  }

  function walkOffTexting(person) {
    person.react = null;
    person.selfieK = 1;
    person.state = 'walk';
    person.texting = true;
    person.leaving = true;
  }

  function runAway(person) {
    person.react = null;
    person.state = 'flee';
  }

  function shakeStands(game, dt) {
    const act = game.bear.act;
    for (const post of game.level.posts) {
      if (post.shakeT !== undefined) shakePost(game, post, act, dt);
    }
  }

  function shakePost(game, post, act, dt) {
    post.shakeT += dt;
    const shaking = act && act.kind === 'shake' && post.shakeBy === act && act.t < SHAKE.lasts;
    post.shake = shakeAmount(post, shaking, dt);
    post.sway = SHAKE.swayAmplitude * post.shake * Math.sin(post.shakeT * Math.PI * 2 * SHAKE.swayFrequency);
    if (shaking) act.sway = post.sway;
    const hunter = game.shooters.find((shooter) => shooter.kind === 'posed' && shooter.home === post.x);
    if (hunter && !hunter.react) {
      hunter.sway = post.sway;
      hunter.wobble = post.shake;
    }
    if (!shaking && post.shake === 0) stopShaking(post);
  }

  function shakeAmount(post, shaking, dt) {
    const amount = post.shake || 0;
    if (shaking) return Math.min(1, amount + dt / SHAKE.rampUp);
    return Math.max(0, amount - dt / SHAKE.rampDown);
  }

  function stopShaking(post) {
    post.shakeT = undefined;
    post.sway = 0;
    post.shakeBy = null;
  }

  function stompOnHunters(game) {
    const bear = game.bear;
    if (!comingDown(bear)) return;
    for (const hunter of game.shooters) {
      if (!stompable(hunter)) continue;
      const head = headTop(hunter);
      if (missesHead(bear, hunter, head)) continue;
      knockDown(game, hunter);
      bounceOffHead(bear, head);
      return;
    }
  }

  function comingDown(bear) {
    if (bear.onGround || bear.climbing || bear.vy <= 0) return false;
    return bear.prevY !== undefined;
  }

  function stompable(hunter) {
    if (onStand(hunter) || hunter.dead || hunter.react === 'gone') return false;
    return free(hunter);
  }

  function headTop(hunter) {
    return GROUND - STOMP.headHeight * (BODY_SCALE[hunter.kind] || 1);
  }

  function missesHead(bear, hunter, head) {
    if (bear.prevY > head + STOMP.overHead || bear.y < head - STOMP.intoHead) return true;
    return Math.abs(bear.x - hunter.x) > STOMP.halfWidth;
  }

  function bounceOffHead(bear, head) {
    bear.y = head;
    bear.vy = STOMP.bounce;
    bear.onGround = false;
    bear.coyote = 0;
    bear.jumpBuffer = 0;
    bear.stompT = 0;
  }

  function knockDown(game, hunter) {
    const bear = game.bear;
    const push = Math.abs(hunter.x - bear.x) > STOMP.offCenter ? Math.sign(hunter.x - bear.x) : bear.dir;
    hunter.dir = -push;
    goDown(hunter);
    hunter.lock = 0;
    hunter.alertX = null;
    hunter.scaredT = 0;
    hunter.pause = 0;
    dropRifleBeingPickedUp(game, hunter);
    if (hunter.armed) knockRifleAway(game, hunter, push);
    reportStomp(game, hunter);
  }

  function goDown(hunter) {
    hunter.react = 'down';
    hunter.reactT = 0;
    hunter.downPhase = 'fall';
    hunter.downK = 0;
  }

  function knockRifleAway(game, hunter, push) {
    const throwSpeed = push * (STOMP.throwSpeed + Math.random() * STOMP.throwSpeedExtra);
    const throwLift = STOMP.throwLift - Math.random() * STOMP.throwLiftExtra;
    drop(game, hunter, throwSpeed, throwLift);
  }

  function reportStomp(game, hunter) {
    game.stats.stomps++;
    rules().onSound(game, 'stomp', hunter.x);
    rules().float(game, hunter.x, GROUND - STOMP.labelHeight, LABELS.stomp, COLORS.story);
    ZS.fx.dust(game, hunter.x, GROUND - STOMP.headHeight, STOMP.dustPuffs);
    rules().addPanic(game, STOMP.panic, stompNews(game, hunter));
    if (game.stats.stomps === 1 || Math.random() < STOMP.quipChance) rules().quip(game, ZS.QUIPS.stomp, true);
  }

  function stompNews(game, hunter) {
    if (hunter.kind === 'ztmh') return NEWS.stompZtmh;
    return NEWS.stomp[(game.stats.stomps - 1) % NEWS.stomp.length];
  }

  function drop(game, human, vx, vy, startY) {
    const kind = droppedKind(human);
    if (!kind) return;
    const prop = droppedProp(human, kind, vx, vy, startY);
    keepOutOfPen(game, prop);
    game.props.push(prop);
    if (kind === 'rifle') {
      human.armed = false;
      human.rifle = prop;
    } else {
      spillFood(game, human);
      human.empty = true;
    }
  }

  function droppedKind(human) {
    if (isHunter(human)) return human.armed ? 'rifle' : null;
    const carried = CARRIED[human.kind];
    return carried && !human.empty ? carried : null;
  }

  function droppedProp(human, kind, vx, vy, startY) {
    const held = kind === 'rifle' && ZS.heldRifle ? ZS.heldRifle(human.h || human) : null;
    return {
      kind,
      gun: GUN[human.kind],
      x: held ? held.x : human.x + human.dir * DROP.ahead,
      y: held ? held.y : startY || GROUND - DROP.height,
      vx,
      vy,
      rot: held ? held.rot : 0,
      vr: (vx >= 0 ? 1 : -1) * (DROP.spin + Math.random() * DROP.spinExtra),
      dir: held ? held.dir : human.dir,
      rest: false,
    };
  }

  function keepOutOfPen(game, prop) {
    if (!pen().wires(game.level) || !landsFencedOff(game, prop)) return;
    prop.vx = -prop.vx;
    prop.vr = -prop.vr;
    if (!landsFencedOff(game, prop)) return;
    prop.vx = 0;
    prop.vr *= DROP.straightDownSpin;
  }

  function landsFencedOff(game, prop) {
    const preview = { x: prop.x, y: prop.y, vx: prop.vx, vy: prop.vy, rot: prop.rot, vr: prop.vr, rest: false };
    for (let i = 0; i < DROP.previewSteps && !preview.rest; i++) fly(game, preview, 1 / 60);
    const level = game.level;
    return pen().inside(level, preview.x, DROP.fenceMargin) || pen().between(level, prop.x, preview.x);
  }

  function spillFood(game, human) {
    const food = SPILLED_FOOD[human.kind];
    if (!food || human.empty) return;
    for (let i = 0; i < food.count; i++) {
      const item = spilledItem(game, human, food, i);
      game.level.items.push(item);
    }
  }

  function spilledItem(game, human, food, index) {
    const level = game.level;
    const spread = (index - (food.count - 1) / 2) * SPILL.spacing;
    let x = clamp(human.x + human.dir * SPILL.ahead + spread, LEVEL_MARGIN, level.w - LEVEL_MARGIN);
    if (pen().inside(level, x, SPILL.fenceMargin)) {
      x = pen().edge(level, human.x, SPILL.fenceMargin + index * SPILL.spacing);
    }
    const item = { type: food.type, x, eaten: false, locked: false };
    if (food.labelKey) item.labelKey = food.labelKey;
    return item;
  }

  function flyProps(game, dt) {
    for (const prop of game.props) {
      if (!prop.rest) fly(game, prop, dt);
    }
  }

  function fly(game, prop, dt) {
    prop.vy += FLIGHT.gravity * dt;
    prop.x += prop.vx * dt;
    prop.y += prop.vy * dt;
    prop.rot += prop.vr * dt;
    if (prop.y >= GROUND) hitGround(prop, dt);
    prop.x = clamp(prop.x, LEVEL_MARGIN, game.level.w - LEVEL_MARGIN);
  }

  function hitGround(prop, dt) {
    prop.y = GROUND;
    if (prop.vy > FLIGHT.bounceAbove) bounce(prop);
    else slideToRest(prop, dt);
  }

  function bounce(prop) {
    prop.vy *= FLIGHT.rebound;
    prop.vx *= FLIGHT.bounceSlowdown;
    prop.vr *= FLIGHT.bounceSpin;
  }

  function slideToRest(prop, dt) {
    prop.vy = 0;
    prop.vr = 0;
    prop.vx *= Math.max(0, 1 - dt * FLIGHT.friction);
    const flat = Math.round(prop.rot / (Math.PI * 2)) * Math.PI * 2;
    prop.rot += (flat - prop.rot) * Math.min(1, dt * FLIGHT.flatten);
    if (Math.abs(prop.vx) < FLIGHT.restSpeed && Math.abs(flat - prop.rot) < FLIGHT.restTilt) {
      prop.rot = 0;
      prop.rest = true;
    }
  }

  function reactShooter(game, hunter, dt) {
    hunter.reactT += dt;
    hunter.lock = 0;
    const time = hunter.reactT;
    const reaction = hunter.react;
    if (reaction === 'drop') fallFromStand(game, hunter, time);
    else if (reaction === 'down') fallLieAndRise(hunter, time);
    else if (reaction === 'bitten') recoilFromBite(hunter, time);
    else if (reaction === 'gone') leaveForGood(game, hunter, dt);
    else if (reaction === 'flee') flee(game, hunter, time, dt);
    else if (reaction === 'fetch') fetchRifle(game, hunter, dt);
    else if (reaction === 'pickup') pickUpRifle(game, hunter, time);
    else if (reaction === 'home') goHome(game, hunter, dt);
    else if (reaction === 'climb') climbStand(game, hunter, time);
  }

  function fallFromStand(game, hunter, time) {
    const progress = Math.min(1, time / CFG.DROP);
    hunter.dropK = progress;
    hunter.fy = GROUND - STAND.cabinHeight * (1 - progress * progress);
    hunter.x = hunter.fx + hunter.side * FALL.sideways * Math.sin(progress * Math.PI / 2);
    if (progress >= 1) landAfterFall(game, hunter);
  }

  function landAfterFall(game, hunter) {
    if (hunter.bolt) {
      hunter.react = 'gone';
      hunter.reactT = 0;
      hunter.dir = hunter.side;
      hunter.fy = undefined;
      rules().onSound(game, 'thud', hunter.x, FALL.boltThud);
      return;
    }
    goDown(hunter);
    hunter.fy = undefined;
    rules().onSound(game, 'thud', hunter.x, FALL.thud);
  }

  function fallLieAndRise(hunter, time) {
    if (time < CFG.FALL) {
      hunter.downPhase = 'fall';
      hunter.downK = time / CFG.FALL;
    } else if (time < CFG.FALL + CFG.LIE) {
      hunter.downPhase = 'lie';
      hunter.downK = (time - CFG.FALL) / CFG.LIE;
    } else if (time < CFG.FALL + CFG.LIE + CFG.RISE) {
      hunter.downPhase = 'rise';
      hunter.downK = (time - CFG.FALL - CFG.LIE) / CFG.RISE;
    } else {
      recover(hunter);
    }
  }

  function recover(hunter) {
    hunter.reactT = 0;
    if (hunter.rifle) {
      hunter.react = 'fetch';
      return;
    }
    hunter.armed = true;
    resumeDuty(hunter);
  }

  function resumeDuty(hunter) {
    hunter.react = hunter.kind === 'posed' ? 'home' : null;
  }

  function recoilFromBite(hunter, time) {
    hunter.bitK = Math.min(1, time / CFG.HOP);
    if (time >= CFG.HOP) {
      hunter.react = 'gone';
      hunter.reactT = 0;
      hunter.clutch = true;
    }
  }

  function leaveForGood(game, hunter, dt) {
    hunter.leaveT = (hunter.leaveT || 0) + dt;
    hunter.x += hunter.dir * leaveSpeed(hunter) * dt;
    if (outOfScene(game, hunter)) hunter.dead = true;
  }

  function leaveSpeed(hunter) {
    if (hunter.bolt) return LEAVE.boltSpeed;
    if (hunter.clutch) return LEAVE.clutchSpeed;
    return LEAVE.calmSpeed;
  }

  function outOfScene(game, hunter) {
    return (hunter.leaveT > 5 && rules().offScreen(game, hunter.x)) || Math.abs(hunter.x - game.bear.x) > LEAVE.goneBeyond || hunter.x < 0 || hunter.x > game.level.w;
  }

  function flee(game, hunter, time, dt) {
    hunter.x = clamp(hunter.x + hunter.dir * FLEE.speed * dt, LEVEL_MARGIN, game.level.w - LEVEL_MARGIN);
    if (time > FLEE.endsAt) recover(hunter);
  }

  function fetchRifle(game, hunter, dt) {
    const rifle = hunter.rifle;
    if (!rifle) {
      recover(hunter);
      return;
    }
    if (!rifle.rest) return;
    if (rifleFencedOff(game, hunter, rifle)) {
      abandonRifle(hunter);
      hunter.dir = pen().side(game.level, hunter.x);
    } else if (rifleInCorn(game, hunter, rifle)) {
      abandonRifle(hunter);
      hunter.dir = ZS.sim.corn.side(game.level, hunter.x);
    } else {
      walkToRifle(game, hunter, rifle, dt);
    }
  }

  function rifleFencedOff(game, hunter, rifle) {
    const level = game.level;
    return pen().inside(level, rifle.x, pen().KEEP.hunter) || pen().between(level, hunter.x, rifle.x);
  }

  function rifleInCorn(game, hunter, rifle) {
    const nearSide = rifle.x - Math.sign(rifle.x - hunter.x) * RIFLE.armLength;
    return ZS.sim.corn.blocks(game.level, hunter.x, nearSide);
  }

  function abandonRifle(hunter) {
    hunter.rifle = null;
    hunter.armed = false;
    hunter.react = 'gone';
    hunter.reactT = 0;
  }

  function walkToRifle(game, hunter, rifle, dt) {
    const side = sideToPickUpFrom(hunter, rifle);
    const spot = rifle.x - side * RIFLE.armLength;
    const gap = spot - hunter.x;
    if (reachedPickupSpot(gap, side)) {
      startPickingUp(game, hunter, rifle, side, spot);
      return;
    }
    hunter.dir = Math.sign(gap) || side;
    walkTowards(hunter, gap, dt);
  }

  function sideToPickUpFrom(hunter, rifle) {
    if (Math.abs(rifle.x - hunter.x) < RIFLE.underFeet) return hunter.dir;
    return Math.sign(rifle.x - hunter.x);
  }

  function reachedPickupSpot(gap, side) {
    const close = Math.abs(gap) < RIFLE.pickupWithin;
    return close && (Math.abs(gap) < RIFLE.onSpot || Math.sign(gap) !== side);
  }

  function walkTowards(hunter, gap, dt) {
    hunter.x += hunter.dir * Math.min(Math.abs(gap), WALK_SPEED * dt);
  }

  function startPickingUp(game, hunter, rifle, side, spot) {
    hunter.dir = side;
    hunter.react = 'pickup';
    hunter.reactT = 0;
    hunter.pickK = 0;
    hunter.pickFrom = hunter.x;
    hunter.pickTo = spot;
    hunter.rifleDir = rifle.dir;
    hunter.pickX = rifle.x;
    game.props.splice(game.props.indexOf(rifle), 1);
  }

  function pickUpRifle(game, hunter, time) {
    hunter.pickK = Math.min(1, time / CFG.PICKUP);
    hunter.x = hunter.pickFrom + (hunter.pickTo - hunter.pickFrom) * Math.min(1, time / RIFLE.slideTime);
    if (time >= CFG.PICKUP) rearm(game, hunter);
  }

  function rearm(game, hunter) {
    hunter.armed = true;
    hunter.rifle = null;
    hunter.pickK = 1;
    hunter.reactT = 0;
    resumeDuty(hunter);
    hunter.sweepPause = RIFLE.sweepPause;
    hunter.alertX = game.bear.x;
    hunter.reload = Math.max(hunter.reload, RIFLE.reloadAtLeast);
  }

  function goHome(game, hunter, dt) {
    if (bearOnLadderOf(game, hunter) && Math.abs(hunter.home - hunter.x) < CLIMB.scaredWithin) {
      boltFromLadder(game, hunter);
    } else {
      walkHome(hunter, dt);
    }
  }

  function walkHome(hunter, dt) {
    const gap = hunter.home - hunter.x;
    if (Math.abs(gap) > CLIMB.arrivedWithin) {
      hunter.dir = Math.sign(gap);
      walkTowards(hunter, gap, dt);
      return;
    }
    startClimbing(hunter);
  }

  function startClimbing(hunter) {
    hunter.x = hunter.home;
    hunter.react = 'climb';
    hunter.reactT = 0;
    hunter.climbK = 0;
    hunter.fy = GROUND;
  }

  function climbStand(game, hunter, time) {
    if (bearOnLadderOf(game, hunter)) {
      boltFromLadder(game, hunter);
      return;
    }
    hunter.climbK = Math.min(1, time / CFG.LADDER);
    hunter.fy = GROUND - STAND.cabinHeight * hunter.climbK;
    if (time >= CFG.LADDER) sitOnStand(hunter);
  }

  function sitOnStand(hunter) {
    hunter.react = null;
    hunter.fy = undefined;
    hunter.x = hunter.home;
    hunter.dir = -1;
    hunter.sweepPause = CLIMB.sweepPause;
    hunter.reload = Math.max(hunter.reload, CLIMB.reloadAtLeast);
  }

  function bearOnLadderOf(game, hunter) {
    const climbing = game.bear.climbing;
    return !!climbing && !!climbing.ladder && climbing.post.x === hunter.home;
  }

  function boltFromLadder(game, hunter) {
    const shouts = LABELS.shout.ladder;
    const away = Math.sign(hunter.x - game.bear.x) || 1;
    const shoutY = (hunter.fy === undefined ? GROUND : hunter.fy) - CLIMB.shoutHeight;
    rules().float(game, hunter.x, shoutY, shouts[Math.floor(Math.random() * shouts.length)], COLORS.story);
    rules().onSound(game, 'freeze', hunter.x);
    hunter.react = 'gone';
    hunter.reactT = 0;
    hunter.bolt = true;
    hunter.dir = away;
    hunter.fy = undefined;
    hunter.climbK = 0;
    hunter.lock = 0;
    hunter.alertX = null;
  }

  function reactPerson(game, person, dt) {
    person.reactT += dt;
    if (person.react !== 'bitten') return;
    person.bitK = Math.min(1, person.reactT / CFG.HOP);
    if (person.reactT >= CFG.HOP) runOffBitten(game, person);
  }

  function runOffBitten(game, person) {
    person.react = null;
    if (ZS.sim.capital.bitten(game, person)) return;
    if (person.kind === 'tycoon') {
      ZS.sim.tycoon.leave(game, person);
      return;
    }
    person.state = 'flee';
    person.clutch = true;
  }

  ZS.sim.encounters = { update, target, stand, begin, reactShooter, reactPerson, free, humans, drop };
})();
