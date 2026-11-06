(function () {
  const { CFG, COLORS, LABELS, NEWS } = ZS;
  const GROUND = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;

  const FENCE = { top: 44, nose: 40, rump: 24, feet: 20, stun: 0.8, kick: 300, hop: 240, said: 40 };
  const ROOF = 44;
  const NO_FENCES = [];

  const START_X = 240;
  const LONG_AGO = 9;
  const HALF_WIDTH = 38;
  const KEEP_FROM_EDGE = 40;
  const GROUND_SLACK = 1;
  const SNAP_RATE = 12;
  const HIDE_FADE = 0.18;
  const BUBBLE_TIME = 2.4;
  const KICK_DECAY = 5;
  const FACE_PERSON_BEYOND = 18;

  const COLD = { advent: 0.35, snow: 0.7, frost: 1 };
  const ACT_DURATION = { bite: CFG.BITE, hug: CFG.HUG, selfie: CFG.SELFIE, shake: CFG.SHAKE };
  const LABEL_HEIGHT = { zap: 104, birch: 95, ice: 120, spray: 120 };

  const HAY = { width: 64, firstShade: 0.31, shadeStep: 0.618 };
  const SPOT = { reach: 40, keepHeld: 24 };

  const HIDING = {
    neverSaid: -99,
    newsEvery: 45,
    huntersWithin: 700,
    dangerWithin: 150,
    quipCooldown: 5,
    birchCooldown: 2,
  };

  const SWEAT = {
    every: 0.12,
    besideLowCover: 13,
    besideTree: 20,
    lowCoverTop: 50,
    aboveLowCover: 12,
    head: 134,
    speed: 40,
    speedExtra: 60,
    rise: 60,
    riseExtra: 60,
    life: 0.8,
    color: '#5bc0eb',
  };

  const CLIMB = {
    holdUp: 0.18,
    trunkReach: 30,
    firstStep: 6,
    upSpeed: 110,
    downSpeed: 170,
    leapClear: 24,
    leapUp: 150,
    quipCooldown: 6,
  };

  const TREE_COVER = { spruceShare: 0.3, spruceDrop: 25, apple: 70, crownShare: 0.55 };
  const TREE_TOP = { spruceShare: 0.55, apple: 100, crownShare: 0.1 };

  const STAMINA = { rested: 0.35, drain: 0.33, recovery: 0.22 };
  const STRIDE = { run: 1.5, creep: 0.6 };
  const TIPSY = { sway: 0.12, rate: 3.4 };
  const WATER = { speed: 0.6, jump: 0.8, bank: 15 };
  const ICE = { drifting: 1, grip: 2.4, glide: 0.9, slideFrom: 15, fullSlide: 110 };
  const JUMP = { coyote: 0.1, buffer: 0.14 };

  const LOG = {
    topSlack: 2,
    blockingBody: 0.6,
    standingBody: 0.5,
    pressedWithin: 1,
    aheadFrom: -10,
    aheadTo: 90,
  };

  const STONE = { height: 10, reach: 8 };
  const LANDING = { tolerance: 6, hard: 250, puffs: 6 };
  const SHED = { bump: 1.6, crawlMargin: 18 };
  const PUSH_OFF = { speed: 260, done: 0.01 };
  const WAKE_UP = { takes: 2.6, quipAfter: 0.9 };

  const SPLASH = {
    every: 0.1,
    spread: 60,
    height: 8,
    sideways: 90,
    rise: 90,
    riseExtra: 80,
    life: 0.6,
    color: '#bfe3f5',
  };

  const DUST = { every: 0.08, behind: 26, puffs: 1 };
  const SPRAY = { lowerThan: 60, from: 50, to: 230 };
  const TRACKS = { slack: 2, step: 30, kept: 150 };
  const NOISE = { every: 0.6, heardBeyondRange: 100 };
  const FOOD_REACH = { offGround: 28, sideways: 34, mouthHeight: 45, radius: 55 };
  const HUMAN_FOOD = { reach: 30, chewTime: 0.5 };

  function create(level) {
    return {
      x: START_X, y: GROUND, vy: 0, vx: 0, dir: 1, onGround: true, hiding: null, crouch: false, moving: false, running: false,
      inv: 0, walkT: 0, birchCd: 0, pose: 'stiff', hideT: 0, quipCd: 0, sweatT: 0, danger: false, peekSide: 1,
      stamina: 1, tired: false, noiseT: 0, eating: false, eatT: 0,
      climbing: null, climbV: 0, climbT: 0, inCanopy: false, covered: false, upT: 0, offTree: false,
      act: null, waking: !!level && level.theme === 'winter', wakeT: 0, slide: 0, cold: 0, tag: false, inSpray: false, onIce: false,
      trackD: 0, trackX: START_X, stun: 0, zapT: LONG_AGO, zapX: 0, kx: 0, crawl: false, bumpT: 0, logT: 0, push: 0, tipsy: 0,
      hicT: 0, hicAt: -LONG_AGO, knock: null,
    };
  }

  const fencesOf = (level) => (level.salas && level.salas.fences) || NO_FENCES;
  const shedOf = (level) => (level.salas && level.salas.strunga) || null;

  function hayOf(level) {
    if (!level.hayCover) level.hayCover = level.haystacks.map(haystackCover);
    return level.hayCover;
  }

  function haystackCover(x, index) {
    return { x, w: HAY.width, hay: true, hide: true, shade: (HAY.firstShade + index * HAY.shadeStep) % 1 };
  }

  function spots(level) {
    if (!level.coverSpots) level.coverSpots = collectSpots(level);
    return level.coverSpots;
  }

  function collectSpots(level) {
    const trees = level.trees.filter((tree) => tree.hide);
    const hay = hayOf(level);
    const covers = (level.covers || []).filter((cover) => cover.hide);
    return trees.concat(hay, covers).sort(byX);
  }

  function byX(first, second) {
    return first.x - second.x;
  }

  const onIce = (level, bear) => !!level.ice && bear.onGround && atGroundLevel(bear)
    && bear.x > level.ice.from && bear.x < level.ice.to;

  function atGroundLevel(bear) {
    return bear.y >= GROUND - GROUND_SLACK;
  }

  function underRoof(level, bear) {
    const shed = shedOf(level);
    return !!shed && bear.onGround && Math.abs(bear.x - shed.x) < shed.w / 2 + ROOF;
  }

  function crawlsUnderRoof(level, bear) {
    const shed = shedOf(level);
    return !!shed && bear.crouch && bear.onGround && Math.abs(bear.x - shed.x) < shed.w / 2 + ROOF + SHED.crawlMargin;
  }

  function update(game, dt) {
    const bear = game.bear;
    const controls = readControls(game.input);
    startFrame(game, bear, controls, dt);
    if (bear.climbing) {
      climbStep(game, bear, controls, dt);
      return;
    }
    advanceAct(bear, dt);
    if (freeToAct(bear) && (controls.bite || controls.hug) && !underRoof(game.level, bear)) {
      startAct(game, bear, controls.bite ? 'bite' : 'hug');
    }
    if (freeToAct(bear) && controls.rub && holdsNoDirection(controls)) rubTree(game, bear);
    if (bear.stun > 0) reelFromShock(game, bear, dt);
    else if (bear.act) stayPutDuringAct(game, bear, dt);
    else hideOrMove(game, bear, controls, dt);
    finishFrame(game, bear, dt);
  }

  function readControls(input) {
    const keys = input.keys;
    const controls = {
      left: keys.has('ArrowLeft') || keys.has('KeyA'),
      right: keys.has('ArrowRight') || keys.has('KeyD'),
      hide: keys.has('ArrowDown') || keys.has('KeyS'),
      up: keys.has('ArrowUp') || keys.has('KeyW'),
      run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      rub: keys.has('KeyC') || keys.has('KeyO'),
      jump: input.jumpPressed,
      bite: input.bitePressed,
      hug: input.hugPressed,
    };
    input.jumpPressed = false;
    input.bitePressed = false;
    input.hugPressed = false;
    return controls;
  }

  function steering(controls) {
    return (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  }

  function pressedAnything(controls) {
    return controls.left || controls.right || controls.hide || controls.jump || controls.bite || controls.hug;
  }

  function holdsNoDirection(controls) {
    return !controls.left && !controls.right && !controls.hide && !controls.up;
  }

  function startFrame(game, bear, controls, dt) {
    countUpHeld(bear, controls, game.input, dt);
    bear.prevY = bear.y;
    if (bear.stompT !== undefined) bear.stompT += dt;
    updateStamina(bear, controls, dt);
    tickTimers(bear, dt);
    bear.tag = game.problem;
    bear.cold = coldness(game);
    lookAround(game, bear);
    wakeUp(game, bear, pressedAnything(controls), dt);
  }

  function finishFrame(game, bear, dt) {
    pushOff(game, bear, dt);
    updatePhysics(game, bear, dt);
    zapIfOnWire(game, bear);
    bear.crawl = crawlsUnderRoof(game.level, bear);
    hideInSnowSpray(game, bear);
    leaveTracks(game, bear);
    makeNoise(game, bear, dt);
    if (bear.act) return;
    eatFoodInReach(game, bear);
    raidHumanFood(game, bear, dt);
  }

  function countUpHeld(bear, controls, input, dt) {
    if (!controls.up) bear.upT = 0;
    else if (controls.jump && input.jumpKey !== 'Space') bear.upT = 0;
    else bear.upT += dt;
  }

  function updateStamina(bear, controls, dt) {
    if (bear.tired && bear.stamina > STAMINA.rested) bear.tired = false;
    bear.running = controls.run && !bear.tired && (controls.left || controls.right) && !controls.hide && !bear.act;
    if (bear.running) bear.stamina = Math.max(0, bear.stamina - STAMINA.drain * dt);
    else bear.stamina = Math.min(1, bear.stamina + STAMINA.recovery * dt);
    if (bear.stamina === 0) bear.tired = true;
  }

  function tickTimers(bear, dt) {
    bear.inv = Math.max(0, bear.inv - dt);
    bear.birchCd -= dt;
    bear.quipCd -= dt;
    bear.zapT += dt;
    bear.bumpT = Math.max(0, bear.bumpT - dt);
  }

  function coldness(game) {
    if (game.level.theme !== 'winter') return 0;
    return COLD[game.seasonKey] || 0;
  }

  function lookAround(game, bear) {
    const onFoot = bear.onGround && !bear.climbing && !bear.act;
    bear.spot = onFoot ? nearestSpot(spots(game.level), bear, bear.spot) : null;
    bear.thin = onFoot && !bear.spot ? nearestSpot(game.level.trees, bear, bear.thin) : null;
    bear.ladderNear = ZS.sim.ladder.at(game);
  }

  function nearestSpot(list, bear, held) {
    let best = null;
    for (const spot of list) {
      const distance = Math.abs(spot.x - bear.x);
      const reach = spot.w / 2 + SPOT.reach + (spot === held ? SPOT.keepHeld : 0);
      if (distance < reach && (!best || distance < Math.abs(best.x - bear.x))) best = spot;
    }
    return best;
  }

  function wakeUp(game, bear, pressed, dt) {
    if (!bear.wakeSaid && game.level.theme === 'winter' && game.time > WAKE_UP.quipAfter) {
      bear.wakeSaid = true;
      rules().quip(game, ZS.QUIPS.wake, true);
    }
    if (!bear.waking) return;
    bear.wakeT += dt;
    if (pressed || bear.wakeT >= WAKE_UP.takes) bear.waking = false;
  }

  function climbStep(game, bear, controls, dt) {
    const climber = bear.climbing.ladder ? ZS.sim.ladder.climb : climb;
    const leap = controls.jump && game.input.jumpKey === 'Space';
    climber(game, bear, dt, controls.up, controls.hide, leap, steering(controls));
  }

  function climb(game, bear, dt, up, down, leap, direction) {
    const tree = bear.climbing;
    cling(bear);
    bear.climbT += dt;
    snapTo(bear, tree.x, dt);
    if (leap) {
      leapOffTree(game, bear, tree, direction);
      return;
    }
    moveAlongTrunk(bear, tree, up, down, dt);
    if (bear.y >= GROUND) {
      stepOffTree(bear);
      return;
    }
    const wasInCanopy = bear.inCanopy;
    bear.inCanopy = bear.y <= canopyY(tree);
    bear.covered = bear.inCanopy;
    eatFoodInReach(game, bear);
    if (bear.inCanopy && !wasInCanopy) enterCanopy(game, bear);
  }

  function cling(bear) {
    bear.running = false;
    bear.moving = false;
    bear.crouch = false;
    bear.hiding = null;
    bear.eating = false;
    bear.vx = 0;
  }

  function snapTo(bear, x, dt) {
    bear.x += (x - bear.x) * Math.min(1, dt * SNAP_RATE);
  }

  function moveAlongTrunk(bear, tree, up, down, dt) {
    bear.climbV = down ? 1 : up ? -1 : 0;
    if (bear.climbV < 0) bear.y = Math.max(treetopY(tree), bear.y - CLIMB.upSpeed * dt);
    if (bear.climbV > 0) bear.y += CLIMB.downSpeed * dt;
  }

  function leapOffTree(game, bear, tree, direction) {
    if (direction) bear.dir = direction;
    bear.climbing = null;
    bear.inCanopy = false;
    bear.covered = false;
    bear.offTree = true;
    bear.push = tree.x + bear.dir * (tree.w / 2 + CLIMB.leapClear) - bear.x;
    bear.vy = -CLIMB.leapUp;
    bear.onGround = false;
    rules().onSound(game, 'jump', bear.x);
  }

  function stepOffTree(bear) {
    bear.y = GROUND;
    bear.vy = 0;
    bear.onGround = true;
    bear.climbing = null;
    bear.inCanopy = false;
    bear.covered = false;
    bear.climbV = 0;
    bear.hideLatch = true;
  }

  function enterCanopy(game, bear) {
    if (!game.once.climb) {
      game.once.climb = true;
      rules().say(game, NEWS.climb);
    }
    if (bear.quipCd <= 0) {
      showQuip(game, ZS.QUIPS.climb);
      bear.quipCd = CLIMB.quipCooldown;
    }
  }

  function showQuip(game, list) {
    game.bubble = { text: list[Math.floor(Math.random() * list.length)], t: BUBBLE_TIME };
  }

  function canopyY(tree) {
    if (tree.kind === 'smrek') return GROUND - tree.h * TREE_COVER.spruceShare - TREE_COVER.spruceDrop;
    if (tree.kind === 'jablon') return GROUND - TREE_COVER.apple;
    return GROUND - tree.h + tree.r * TREE_COVER.crownShare;
  }

  function treetopY(tree) {
    if (tree.kind === 'smrek') return GROUND - tree.h * TREE_TOP.spruceShare;
    if (tree.kind === 'jablon') return GROUND - TREE_TOP.apple;
    return GROUND - tree.h - tree.r * TREE_TOP.crownShare;
  }

  function advanceAct(bear, dt) {
    if (!bear.act) return;
    bear.act.t += dt;
    if (bear.act.t >= bear.act.dur) bear.act = bear.act.next || null;
  }

  function freeToAct(bear) {
    return !bear.act && !bear.stun && bear.onGround && !bear.hiding;
  }

  function startAct(game, bear, key) {
    const act = chooseAct(game, bear, key);
    if (!act) return;
    bear.act = act;
    stopForAct(bear);
    if (bear.act.target) ZS.sim.encounters.begin(game, bear.act);
  }

  function chooseAct(game, bear, key) {
    const encounters = ZS.sim.encounters;
    const kept = keptPartner(bear);
    const person = encounters.target(game) || kept;
    const post = key === 'hug' && !person ? encounters.stand(game) : null;
    if (person) turnToFace(bear, person);
    const kind = actKind(key, person, post);
    const target = person || post;
    const door = !target && key === 'hug' ? knockOnDoor(game, bear) : null;
    return door
      || (!target && ZS.sim.photographer.act(game, bear, key))
      || ((target || key === 'bite') && encounterAct(bear, kind, target));
  }

  function keptPartner(bear) {
    const partner = bear.reach;
    return partner && !partner.post && partner.kind !== 'photographer' ? partner : null;
  }

  function turnToFace(bear, person) {
    if (Math.abs(person.x - bear.x) > FACE_PERSON_BEYOND) bear.dir = Math.sign(person.x - bear.x);
  }

  function actKind(key, person, post) {
    if (post) return 'shake';
    if (key === 'hug' && person && posesForSelfie(person)) return 'selfie';
    return key;
  }

  function posesForSelfie(person) {
    return person.kind === 'tourist' || (person.kind === 'tycoon' && !person.promo);
  }

  function knockOnDoor(game, bear) {
    return ZS.sim.chopok.act(game, bear) || ZS.sim.vendors.act(game, bear) || ZS.sim.knock.act(game, bear);
  }

  function encounterAct(bear, kind, target) {
    return { kind, t: 0, dur: ACT_DURATION[kind], dir: bear.dir, hit: !!target, target, done: false };
  }

  function stopForAct(bear) {
    bear.moving = false;
    bear.running = false;
    bear.crouch = false;
    bear.eating = false;
    bear.eatT = 0;
    bear.vx = 0;
  }

  function rubTree(game, bear) {
    const act = ZS.sim.logging.act(game, bear);
    if (!act) return;
    bear.act = act;
    bear.dir = act.dir;
    stopForAct(bear);
    rules().onSound(game, 'rub', act.tree.x);
  }

  function reelFromShock(game, bear, dt) {
    bear.stun = Math.max(0, bear.stun - dt);
    goLimp(bear);
    game.input.downReleased = false;
    bear.x = stepTowards(game, bear, bear.x + bear.kx * dt);
    bear.kx = bear.stun > 0 ? bear.kx * Math.exp(-dt * KICK_DECAY) : 0;
    fadeHide(bear, dt);
  }

  function goLimp(bear) {
    bear.moving = false;
    bear.running = false;
    bear.crouch = false;
    bear.hiding = null;
    bear.covered = false;
    bear.eating = false;
    bear.eatT = 0;
    bear.vx = 0;
    bear.slide = 0;
  }

  function stayPutDuringAct(game, bear, dt) {
    bear.moving = false;
    bear.crouch = false;
    bear.hiding = null;
    bear.covered = false;
    bear.eating = false;
    bear.eatT = 0;
    bear.vx = 0;
    bear.slide = 0;
    game.input.downReleased = false;
    fadeHide(bear, dt);
  }

  function hideOrMove(game, bear, controls, dt) {
    updateHiding(game, bear, controls.hide, dt);
    if (!bear.hiding && underRoof(game.level, bear)) {
      bear.crouch = true;
      bear.running = false;
    }
    if (bear.hiding) stayInCover(game, bear, dt);
    else walkClimbOrJump(game, bear, controls, dt);
  }

  function updateHiding(game, bear, hide, dt) {
    if (!hide || game.input.downReleased) bear.hideLatch = false;
    game.input.downReleased = false;
    const wantsCover = hide && bear.onGround && !bear.hideLatch;
    if (!wantsCover) bear.hiding = null;
    else if (!bear.hiding) takeCover(game, bear);
    bear.crouch = wantsCover && !bear.hiding;
    bear.covered = !!bear.hiding && !!bear.hiding.hide;
    if (bear.hiding) bear.hideTree = bear.hiding;
    fadeHide(bear, dt);
  }

  function takeCover(game, bear) {
    const spot = bear.spot;
    const birch = spot ? null : bear.thin;
    if (spot || birch) {
      bear.hiding = spot || birch;
      startHiding(game, bear, bear.hiding);
    }
    if (birch && bear.birchCd <= 0) {
      bear.birchCd = HIDING.birchCooldown;
      rules().float(game, bear.x, GROUND - LABEL_HEIGHT.birch, LABELS.birch, COLORS.bad);
    }
  }

  function startHiding(game, bear, cover) {
    bear.pose = hidingPose(cover);
    bear.hideT = 0;
    rules().onSound(game, coverSound(cover), cover.x);
    if (cover.hide && hideNewsDue(game) && huntersAround(game, bear)) {
      game.hideSaid = game.time;
      rules().say(game, hidingNews(cover));
    }
    if (bear.quipCd <= 0) {
      showQuip(game, ZS.QUIPS[cover.stalag ? 'stalag' : cover.hide ? bear.pose : 'birch']);
      bear.quipCd = HIDING.quipCooldown;
    }
  }

  function hidingPose(cover) {
    if (cover.hay) return 'hay';
    if (cover.rock) return 'rock';
    if (cover.pack) return 'pack';
    if (cover.logs) return 'pile';
    if (!cover.hide) return 'sweat';
    const poses = ZS.POSES;
    return poses[Math.floor(cover.shade * poses.length) % poses.length];
  }

  function coverSound(cover) {
    if (cover.hay) return 'hay';
    if (cover.logs) return 'pile';
    return 'leaves';
  }

  function hidingNews(cover) {
    if (cover.hay) return NEWS.hay;
    if (cover.rock) return NEWS.rockHide;
    if (cover.logs) return NEWS.pile;
    return NEWS.hide;
  }

  function hideNewsDue(game) {
    return game.time - (game.hideSaid || HIDING.neverSaid) > HIDING.newsEvery;
  }

  function huntersAround(game, bear) {
    return game.shooters.some((hunter) => Math.abs(hunter.x - bear.x) < HIDING.huntersWithin);
  }

  function stayInCover(game, bear, dt) {
    snapTo(bear, bear.hiding.x, dt);
    bear.moving = false;
    bear.vx = 0;
    bear.slide = 0;
    bear.hideT += dt;
    bear.peekSide = sideToPeek(game, bear);
    bear.danger = game.shooters.some((hunter) => hunter.lock > 0 || Math.abs(hunter.cross - bear.x) < HIDING.dangerWithin);
    sweat(game, bear, dt);
  }

  function sideToPeek(game, bear) {
    const hunter = closestHunter(game, bear);
    return hunter ? Math.sign(hunter.x - bear.x) || 1 : bear.dir;
  }

  function closestHunter(game, bear) {
    let closest = null;
    for (const hunter of game.shooters) {
      if (!closest || Math.abs(hunter.x - bear.x) < Math.abs(closest.x - bear.x)) closest = hunter;
    }
    return closest;
  }

  function sweat(game, bear, dt) {
    bear.sweatT -= dt;
    if ((bear.pose === 'sweat' || bear.danger) && bear.sweatT <= 0) {
      bear.sweatT = SWEAT.every;
      game.particles.push(sweatDrop(bear));
    }
  }

  function sweatDrop(bear) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const lowCover = !!bear.hiding.hay || !!bear.hiding.logs;
    return {
      x: bear.x + side * (lowCover ? SWEAT.besideLowCover : SWEAT.besideTree),
      y: lowCover ? (bear.hiding.top || GROUND - SWEAT.lowCoverTop) - SWEAT.aboveLowCover : GROUND - SWEAT.head,
      vx: side * (SWEAT.speed + Math.random() * SWEAT.speedExtra),
      vy: -SWEAT.rise - Math.random() * SWEAT.riseExtra,
      t: SWEAT.life,
      color: SWEAT.color,
      round: true,
    };
  }

  function fadeHide(bear, dt) {
    bear.hideBlend = clamp((bear.hideBlend || 0) + (bear.hiding ? dt : -dt) / HIDE_FADE, 0, 1);
    if (!bear.hiding && bear.hideBlend === 0) bear.hideTree = null;
  }

  function walkClimbOrJump(game, bear, controls, dt) {
    const direction = steering(controls);
    if (direction) bear.dir = direction;
    bear.moving = direction !== 0;
    if (bear.inWater) bear.running = false;
    const ice = onIce(game.level, bear);
    if (bear.moving || (ice && Math.abs(bear.vx) > ICE.drifting)) walk(game, bear, direction, ice, dt);
    else bear.vx = 0;
    bear.logT = bear.moving && pushingAgainstLog(game.level, bear) ? bear.logT + dt : 0;
    bear.slide = slideOnIce(bear, ice, direction);
    if (ice && !game.once.ice) firstTimeOnIce(game, bear);
    climbOrJump(game, bear, controls);
  }

  function walk(game, bear, direction, ice, dt) {
    const wanted = direction * gaitSpeed(bear) * wadingFactor(bear) * tipsyFactor(bear);
    if (ice) bear.vx += (wanted - bear.vx) * Math.min(1, dt * (direction ? ICE.grip : ICE.glide));
    else bear.vx = wanted;
    bear.x = stepTowards(game, bear, bear.x + bear.vx * dt);
    if (bear.moving) bear.walkT += dt * strideRate(bear);
  }

  function gaitSpeed(bear) {
    if (bear.crouch || bear.dark) return CFG.CREEP;
    if (bear.running) return CFG.RUN;
    return CFG.WALK;
  }

  function wadingFactor(bear) {
    return bear.inWater ? WATER.speed : 1;
  }

  function tipsyFactor(bear) {
    return bear.tipsy > 0 ? 1 + TIPSY.sway * Math.sin(bear.tipsy * TIPSY.rate) : 1;
  }

  function strideRate(bear) {
    if (bear.running) return STRIDE.run;
    if (bear.crouch) return STRIDE.creep;
    return 1;
  }

  function slideOnIce(bear, ice, direction) {
    const speed = Math.abs(bear.vx);
    return ice && !direction && speed > ICE.slideFrom ? Math.min(1, speed / ICE.fullSlide) : 0;
  }

  function firstTimeOnIce(game, bear) {
    game.once.ice = true;
    rules().float(game, bear.x, GROUND - LABEL_HEIGHT.ice, LABELS.ice, COLORS.story);
    rules().quip(game, ZS.QUIPS.ice, true);
    rules().say(game, NEWS.ice);
  }

  function climbOrJump(game, bear, controls) {
    const level = game.level;
    const trunk = trunkToClimb(level, bear, controls);
    const post = !trunk && !controls.left && !controls.right && !controls.hide ? ZS.sim.ladder.at(game) : null;
    if (post && bear.upT >= CLIMB.holdUp) {
      ZS.sim.ladder.grab(game, post);
    } else if (trunk) {
      startClimbing(game, bear, trunk);
    } else if (underRoof(level, bear) || (post && controls.jump && game.input.jumpKey !== 'Space')) {
      bear.jumpBuffer = 0;
    } else {
      jumpOrRemember(game, bear, controls.jump);
    }
  }

  function trunkToClimb(level, bear, controls) {
    const logAhead = level.logs.some((log) => logJustAhead(bear, log));
    const ready = bear.upT >= CLIMB.holdUp && !bear.offTree && !bear.slide
      && !controls.left && !controls.right && !controls.hide && !logAhead;
    return ready && level.trees.find((tree) => tree.hide && Math.abs(tree.x - bear.x) < tree.w / 2 + CLIMB.trunkReach);
  }

  function logJustAhead(bear, log) {
    const gap = bear.dir > 0 ? log.x - log.w / 2 - bear.x : bear.x - (log.x + log.w / 2);
    return gap > LOG.aheadFrom && gap < LOG.aheadTo;
  }

  function startClimbing(game, bear, trunk) {
    bear.climbing = trunk;
    bear.climbT = 0;
    bear.climbV = -1;
    bear.inCanopy = false;
    bear.onGround = false;
    bear.vy = 0;
    bear.vx = 0;
    bear.y = clamp(bear.y, treetopY(trunk), GROUND - CLIMB.firstStep);
    bear.jumpBuffer = 0;
    bear.coyote = 0;
    bear.hideBlend = 0;
    bear.hideTree = null;
    ZS.fx.onShot(game, trunk.x);
    rules().onSound(game, 'climb', trunk.x);
  }

  function jumpOrRemember(game, bear, jump) {
    if ((jump || bear.jumpBuffer > 0) && (bear.onGround || bear.coyote > 0)) jumpUp(game, bear);
    else if (jump) bear.jumpBuffer = JUMP.buffer;
  }

  function jumpUp(game, bear) {
    bear.vy = -CFG.JUMP * (bear.inWater ? WATER.jump : 1);
    bear.onGround = false;
    bear.coyote = 0;
    bear.jumpBuffer = 0;
    rules().onSound(game, 'jump', bear.x);
  }

  function pushOff(game, bear, dt) {
    if (!bear.push) return;
    if (bear.climbing || bear.hiding || bear.act || bear.stun > 0) {
      bear.push = 0;
      return;
    }
    const step = Math.sign(bear.push) * Math.min(Math.abs(bear.push), PUSH_OFF.speed * dt);
    bear.x = stepTowards(game, bear, bear.x + step);
    const remaining = bear.push - step;
    bear.push = Math.abs(remaining) < PUSH_OFF.done ? 0 : remaining;
  }

  function stepTowards(game, bear, wantedX) {
    const level = game.level;
    let x = stopAtLogs(level, bear, wantedX);
    x = stopAtShed(level, bear, x);
    x = stopAtFences(game, bear, x);
    return clamp(x, KEEP_FROM_EDGE, level.w - KEEP_FROM_EDGE);
  }

  function stopAtLogs(level, bear, wantedX) {
    for (const log of level.logs) {
      if (bear.y <= GROUND - log.h + LOG.topSlack) continue;
      const stop = wallStop(bear.x, wantedX, log.x, blockingDistance(log));
      if (stop !== null) return stop;
    }
    return wantedX;
  }

  function blockingDistance(log) {
    return log.w / 2 + HALF_WIDTH * LOG.blockingBody;
  }

  function pushingAgainstLog(level, bear) {
    return level.logs.some((log) => bear.y > GROUND - log.h + LOG.topSlack
      && Math.abs(bear.x - log.x + bear.dir * blockingDistance(log)) < LOG.pressedWithin);
  }

  function stopAtShed(level, bear, wantedX) {
    const shed = shedOf(level);
    if (!shed || (bear.crouch && bear.onGround)) return wantedX;
    const stop = wallStop(bear.x, wantedX, shed.x, shed.w / 2 + ROOF);
    if (stop === null) return wantedX;
    bear.bumpT = SHED.bump;
    return stop;
  }

  function wallStop(fromX, toX, center, halfWidth) {
    if (fromX <= center - halfWidth && toX > center - halfWidth) return center - halfWidth;
    if (fromX >= center + halfWidth && toX < center + halfWidth) return center + halfWidth;
    return null;
  }

  function stopAtFences(game, bear, wantedX) {
    let x = wantedX;
    for (const fenceX of fencesOf(game.level)) {
      if (touching(bear, bear.x, fenceX) || !touching(bear, x, fenceX)) continue;
      x = stopShortOfFence(bear, x, fenceX);
      shock(game, bear, fenceX);
    }
    return x;
  }

  function bodyReach(bear) {
    const front = bear.onGround ? FENCE.nose : FENCE.feet;
    const back = bear.onGround ? FENCE.rump : FENCE.feet;
    return bear.dir < 0 ? [-front, back] : [-back, front];
  }

  function touching(bear, x, fenceX) {
    if (bear.y <= GROUND - FENCE.top) return false;
    const [left, right] = bodyReach(bear);
    return fenceX > x + left && fenceX < x + right;
  }

  function stopShortOfFence(bear, wantedX, fenceX) {
    const [left, right] = bodyReach(bear);
    return wantedX > bear.x ? fenceX - right : fenceX - left;
  }

  function zapIfOnWire(game, bear) {
    if (bear.stun > 0 || bear.act || bear.climbing) return;
    for (const fenceX of fencesOf(game.level)) {
      if (touching(bear, bear.x, fenceX)) {
        shock(game, bear, fenceX);
        return;
      }
    }
  }

  function shock(game, bear, fenceX) {
    if (bear.stun > 0) return;
    throwBack(bear, fenceX);
    letGo(bear);
    reportZap(game, fenceX);
  }

  function throwBack(bear, fenceX) {
    const side = Math.sign(bear.x - fenceX) || -bear.dir;
    bear.stun = FENCE.stun;
    bear.zapT = 0;
    bear.zapX = fenceX;
    bear.kx = side * FENCE.kick;
    bear.vy = Math.min(bear.vy, -FENCE.hop);
    bear.onGround = false;
    bear.coyote = 0;
    bear.jumpBuffer = 0;
  }

  function letGo(bear) {
    bear.hiding = null;
    bear.crouch = false;
    bear.covered = false;
    bear.moving = false;
    bear.running = false;
    bear.eating = false;
    bear.eatT = 0;
    bear.vx = 0;
  }

  function reportZap(game, fenceX) {
    rules().onSound(game, 'zap', fenceX);
    rules().float(game, fenceX, GROUND - LABEL_HEIGHT.zap, LABELS.zap, COLORS.zap);
    rules().quip(game, ZS.QUIPS.zap, true);
    const saidLately = game.time - game.zapSaid < FENCE.said;
    if (!saidLately) {
      game.zapSaid = game.time;
      rules().say(game, NEWS.zap);
    }
  }

  function updatePhysics(game, bear, dt) {
    fallOrLand(game, bear, dt);
    bear.inWater = inRiver(game.level, bear);
    bear.onIce = onIce(game.level, bear);
    if (bear.inWater && bear.moving) splash(game, bear, dt);
    if (bear.running && bear.moving && bear.onGround && !bear.inWater) kickUpDust(game, bear, dt);
  }

  function fallOrLand(game, bear, dt) {
    bear.vy += CFG.GRAVITY * dt;
    const floor = floorUnder(game.level, bear);
    const wasOnGround = bear.onGround;
    bear.y += bear.vy * dt;
    if (bear.y >= floor) land(game, bear, floor);
    else bear.onGround = false;
    if (bear.onGround || (wasOnGround && bear.vy >= 0)) bear.coyote = JUMP.coyote;
    else bear.coyote = Math.max(0, (bear.coyote || 0) - dt);
    bear.jumpBuffer = Math.max(0, (bear.jumpBuffer || 0) - dt);
  }

  function floorUnder(level, bear) {
    let floor = GROUND;
    for (const log of level.logs) {
      if (aboveLog(bear, log)) floor = Math.min(floor, GROUND - log.h);
    }
    for (const stone of level.stones) {
      if (aboveStone(bear, stone)) floor = Math.min(floor, GROUND - STONE.height);
    }
    return floor;
  }

  function aboveLog(bear, log) {
    return Math.abs(bear.x - log.x) < log.w / 2 + HALF_WIDTH * LOG.standingBody
      && bear.y <= GROUND - log.h + LANDING.tolerance;
  }

  function aboveStone(bear, stone) {
    return Math.abs(bear.x - stone.x) < stone.w / 2 + STONE.reach
      && bear.y <= GROUND - STONE.height + LANDING.tolerance;
  }

  function land(game, bear, floor) {
    if (!bear.onGround && bear.vy > LANDING.hard) {
      ZS.fx.dust(game, bear.x, floor, LANDING.puffs);
      rules().onSound(game, 'land', bear.x, bear.vy);
    }
    bear.y = floor;
    bear.vy = 0;
    bear.onGround = true;
    bear.offTree = false;
  }

  function inRiver(level, bear) {
    const river = level.river;
    return !!river && bear.onGround && atGroundLevel(bear)
      && bear.x > river.from + WATER.bank && bear.x < river.to - WATER.bank;
  }

  function splash(game, bear, dt) {
    bear.splashT = (bear.splashT || 0) - dt;
    if (bear.splashT <= 0) {
      bear.splashT = SPLASH.every;
      game.particles.push(splashDrop(bear));
    }
  }

  function splashDrop(bear) {
    return {
      x: bear.x + (Math.random() - 0.5) * SPLASH.spread,
      y: GROUND - SPLASH.height,
      vx: (Math.random() - 0.5) * SPLASH.sideways,
      vy: -SPLASH.rise - Math.random() * SPLASH.riseExtra,
      t: SPLASH.life,
      color: SPLASH.color,
      round: true,
    };
  }

  function kickUpDust(game, bear, dt) {
    bear.dustT = (bear.dustT || 0) - dt;
    if (bear.dustT <= 0) {
      bear.dustT = DUST.every;
      ZS.fx.dust(game, bear.x - bear.dir * DUST.behind, bear.y, DUST.puffs, bear.dir);
    }
  }

  function hideInSnowSpray(game, bear) {
    bear.inSpray = !bear.act && bear.y > GROUND - SPRAY.lowerThan
      && game.level.cannons.some((cannon) => inSprayOf(cannon, bear));
    if (!bear.inSpray) return;
    bear.covered = true;
    if (!game.once.spray) firstTimeInSpray(game, bear);
  }

  function inSprayOf(cannon, bear) {
    const near = cannon.x + cannon.dir * SPRAY.from;
    const far = cannon.x + cannon.dir * SPRAY.to;
    return bear.x > Math.min(near, far) && bear.x < Math.max(near, far);
  }

  function firstTimeInSpray(game, bear) {
    game.once.spray = true;
    rules().float(game, bear.x, GROUND - LABEL_HEIGHT.spray, LABELS.spray, COLORS.good);
    rules().quip(game, ZS.QUIPS.spray, true);
    rules().say(game, NEWS.spray);
  }

  function leaveTracks(game, bear) {
    if (offTheSnow(game, bear)) {
      bear.trackX = bear.x;
      return;
    }
    bear.trackD += Math.abs(bear.x - bear.trackX);
    bear.trackX = bear.x;
    if (bear.trackD < TRACKS.step) return;
    bear.trackD = 0;
    game.tracks.push({ x: bear.x, t: game.time, dir: bear.dir, run: bear.running });
    if (game.tracks.length > TRACKS.kept) game.tracks.shift();
  }

  function offTheSnow(game, bear) {
    return game.level.theme !== 'winter' || !bear.onGround || bear.onIce || bear.y < GROUND - TRACKS.slack;
  }

  function makeNoise(game, bear, dt) {
    bear.noiseT -= dt;
    if (bear.running && bear.moving && bear.noiseT <= 0) {
      bear.noiseT = NOISE.every;
      alertHuntersInEarshot(game, bear);
    }
  }

  function alertHuntersInEarshot(game, bear) {
    for (const hunter of game.shooters) {
      if (Math.abs(hunter.x - bear.x) < hunter.range + NOISE.heardBeyondRange) hunter.alertX = bear.x;
    }
  }

  function eatFoodInReach(game, bear) {
    for (const item of game.level.items) {
      if (canPickUp(bear, item)) rules().eat(game, item);
    }
  }

  function canPickUp(bear, item) {
    if (item.eaten || item.hidden) return false;
    if (!ZS.FOOD[item.type].natural && item.y === undefined) return false;
    if (item.type === 'fish' && bear.moving && bear.onGround) return false;
    if (item.y === undefined) {
      return bear.y >= GROUND - FOOD_REACH.offGround && Math.abs(item.x - bear.x) < FOOD_REACH.sideways;
    }
    return Math.hypot(item.x - bear.x, item.y - (bear.y - FOOD_REACH.mouthHeight)) < FOOD_REACH.radius;
  }

  function raidHumanFood(game, bear, dt) {
    const food = canRaid(bear) ? humanFoodAt(game.level, bear) : null;
    bear.eating = !!food;
    if (!food) {
      bear.eatT = 0;
      return;
    }
    bear.eatT += dt;
    if (bear.eatT >= HUMAN_FOOD.chewTime) {
      rules().eat(game, food);
      bear.eatT = 0;
    }
  }

  function canRaid(bear) {
    return bear.onGround && !bear.moving && !bear.hiding && !bear.slide;
  }

  function humanFoodAt(level, bear) {
    return level.items.find((item) => !item.eaten && !item.locked && !ZS.FOOD[item.type].natural
      && Math.abs(item.x - bear.x) < HUMAN_FOOD.reach);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.bear = { create, update, onIce, spots, touching, hay: hayOf, fences: fencesOf, shed: shedOf, FENCE, ROOF };
})();
