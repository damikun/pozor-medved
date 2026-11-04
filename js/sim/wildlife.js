(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GROUND = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const pen = () => ZS.sim.pen;

  const FISH = {
    jumpSeconds: 0.95,
    splashDepth: 8,
    jumpHeight: 92,
    jumpLength: 36,
    hiddenDepth: 30,
    shortestWait: 1.5,
    waitExtra: 2.5,
  };

  const DOG = {
    beatClearOfFence: 60,
    standClearOfFence: 14,
    seesAround: 150,
    seesAhead: 430,
    alertSeconds: 3.5,
    chasesBeyond: 160,
    chaseSpeed: 170,
    runUpSpeed: 130,
    walkSpeed: 42,
    barkCooldown: 4,
    barkPanic: 6,
    barkLabelHeight: 80,
    roamsPastBeat: 250,
  };

  const SHEEP = {
    firstChoiceWithin: 4,
    fleesWithin: 220,
    fleeSpeed: 95,
    walkSpeed: 22,
    shortestActivity: 2,
    activityExtra: 4,
    grazeChance: 0.6,
    turnChance: 0.4,
  };

  const DEER = {
    firstChoiceAfter: 1,
    choiceStagger: 1.3,
    fleesWithin: 280,
    fearSeconds: 3.5,
    fleeSpeed: 230,
    fleesPastRange: 900,
    walkSpeed: 30,
    straysBeyond: 40,
    shortestLookAfterFleeing: 2,
    lookAfterFleeingExtra: 1.5,
    lookCycle: 3,
    lookPartOfCycle: 1.4,
    shortestGraze: 3,
    grazeExtra: 2.5,
    lookSeconds: 1.6,
    walkSeconds: 2.2,
  };

  function updateFish(game, dt) {
    for (const item of game.level.items) {
      if (item.type !== 'fish' || item.eaten) continue;
      if (item.jump < 0) waitUnderwater(item, dt);
      else arcThroughAir(item, dt);
    }
  }

  function waitUnderwater(fish, dt) {
    fish.jumpT -= dt;
    if (fish.jumpT <= 0) jumpOut(fish);
  }

  function jumpOut(fish) {
    fish.jump = 0;
    fish.hidden = false;
    fish.dir = Math.random() < 0.5 ? -1 : 1;
    fish.x0 = fish.x0 || fish.x;
  }

  function arcThroughAir(fish, dt) {
    fish.jump += dt / FISH.jumpSeconds;
    const progress = Math.min(1, fish.jump);
    fish.y = GROUND + FISH.splashDepth - Math.sin(Math.PI * progress) * FISH.jumpHeight;
    fish.x = fish.x0 + fish.dir * (progress - 0.5) * FISH.jumpLength;
    if (fish.jump >= 1) splashBackIn(fish);
  }

  function splashBackIn(fish) {
    fish.jump = -1;
    fish.hidden = true;
    fish.y = GROUND + FISH.hiddenDepth;
    fish.jumpT = FISH.shortestWait + Math.random() * FISH.waitExtra;
  }

  function createDog(spawn, level) {
    const dog = {
      x: (spawn.from + spawn.to) / 2, from: spawn.from, to: spawn.to, dir: 1, state: 'walk',
      alert: 0, barkCd: 0, id: 'dog', y: 0, leap: null,
    };
    for (const fence of pen().wires(level) || []) keepClearOfFence(dog, fence);
    return dog;
  }

  function keepClearOfFence(dog, fence) {
    const reach = pen().LEAP.reach;
    pushClearOfFence(dog, 'from', fence, reach + DOG.beatClearOfFence);
    pushClearOfFence(dog, 'to', fence, reach + DOG.beatClearOfFence);
    pushClearOfFence(dog, 'x', fence, reach + DOG.standClearOfFence);
  }

  function pushClearOfFence(dog, key, fence, gap) {
    if (Math.abs(dog[key] - fence) < gap) dog[key] = dog[key] < fence ? fence - gap : fence + gap;
  }

  function updateDogs(game, dt) {
    for (const dog of game.dogs) updateDog(game, dog, dt);
  }

  function updateDog(game, dog, dt) {
    dog.barkCd -= dt;
    if (dog.leap) {
      dog.alert = Math.max(0, dog.alert - dt);
      continueLeap(dog, dt);
      return;
    }
    const bear = game.bear;
    const distance = Math.abs(bear.x - dog.x);
    const sees = dogSeesBear(bear, dog, distance);
    if (sees) dog.alert = DOG.alertSeconds;
    if (dog.alert > 0) chaseOrBark(game, dog, distance, sees, dt);
    else patrolBeat(game, dog, dt);
    if (!dog.leap) dog.x = clamp(dog.x, dog.from - DOG.roamsPastBeat, dog.to + DOG.roamsPastBeat);
  }

  function dogSeesBear(bear, dog, distance) {
    if (bear.covered) return false;
    const facingBear = Math.sign(bear.x - dog.x) === dog.dir;
    return distance < DOG.seesAround || (distance < DOG.seesAhead && facingBear);
  }

  function chaseOrBark(game, dog, distance, sees, dt) {
    dog.alert -= dt;
    dog.dir = Math.sign(game.bear.x - dog.x) || dog.dir;
    if (distance > DOG.chasesBeyond && sees) {
      dog.state = 'run';
      trot(game, dog, DOG.chaseSpeed, dt);
    } else {
      dog.state = 'bark';
    }
    if (sees && dog.barkCd <= 0) bark(game, dog);
  }

  function bark(game, dog) {
    dog.barkCd = DOG.barkCooldown;
    rules().onSound(game, 'bark', dog.x);
    rules().addPanic(game, DOG.barkPanic, NEWS.dogBark);
    rules().spotted(game, dog.x, GROUND - DOG.barkLabelHeight, LABELS.dogBark);
    ZS.sim.hunters.alert(game, game.bear.x);
  }

  function patrolBeat(game, dog, dt) {
    const runningUp = fenceCloseAhead(game, dog);
    dog.state = runningUp ? 'run' : 'walk';
    trot(game, dog, runningUp ? DOG.runUpSpeed : DOG.walkSpeed, dt);
    if (!dog.leap && (dog.x < dog.from || dog.x > dog.to)) turnAtBeatEnd(dog);
  }

  function turnAtBeatEnd(dog) {
    dog.dir *= -1;
    dog.x = clamp(dog.x, dog.from, dog.to);
  }

  function fenceCloseAhead(game, dog) {
    const fence = pen().ahead(game.level, dog.x, dog.dir);
    return fence !== null && Math.abs(fence - dog.x) < pen().LEAP.reach + pen().LEAP.runup;
  }

  function trot(game, dog, speed, dt) {
    const nextX = dog.x + dog.dir * speed * dt;
    const fence = pen().ahead(game.level, dog.x, dog.dir);
    if (fence !== null && Math.abs(fence - nextX) <= pen().LEAP.reach) startLeap(dog, fence);
    else dog.x = nextX;
  }

  function startLeap(dog, fence) {
    const landingX = fence + dog.dir * pen().LEAP.reach;
    dog.leap = { x0: dog.x, x1: landingX, fx: fence, dir: dog.dir, t: 0, phase: 'gather', k: 0 };
    dog.state = 'leap';
  }

  function continueLeap(dog, dt) {
    const leap = dog.leap;
    const { gather, air, land } = pen().LEAP;
    leap.t += dt;
    if (leap.t < gather) crouchBeforeLeap(dog, leap);
    else if (leap.t < gather + air) flyOverFence(dog, leap);
    else if (leap.t < gather + air + land) landAfterLeap(dog, leap);
    else finishLeap(dog, leap);
  }

  function crouchBeforeLeap(dog, leap) {
    leap.phase = 'gather';
    leap.k = leap.t / pen().LEAP.gather;
    dog.x = leap.x0;
    dog.y = 0;
  }

  function flyOverFence(dog, leap) {
    const { gather, air, top } = pen().LEAP;
    const progress = (leap.t - gather) / air;
    leap.phase = 'air';
    leap.k = progress;
    dog.x = leap.x0 + (leap.x1 - leap.x0) * progress;
    dog.y = top * 4 * progress * (1 - progress);
  }

  function landAfterLeap(dog, leap) {
    const { gather, air, land } = pen().LEAP;
    leap.phase = 'land';
    leap.k = (leap.t - (gather + air)) / land;
    dog.x = leap.x1;
    dog.y = 0;
  }

  function finishLeap(dog, leap) {
    dog.leap = null;
    dog.x = leap.x1;
    dog.y = 0;
    dog.state = 'run';
  }

  function createSheep(spawn, index) {
    return {
      x: spawn.x, from: spawn.from, to: spawn.to, dir: index % 2 ? -1 : 1, state: 'graze',
      t: Math.random() * SHEEP.firstChoiceWithin, id: 'sheep' + index,
    };
  }

  function updateSheep(game, dt) {
    const bear = game.bear;
    for (const sheep of game.sheep) {
      sheep.t -= dt;
      if (bearNearSheep(bear, sheep)) scatterFromBear(sheep, bear, dt);
      else wanderAbout(sheep, dt);
    }
  }

  function bearNearSheep(bear, sheep) {
    return Math.abs(bear.x - sheep.x) < SHEEP.fleesWithin && !bear.covered;
  }

  function scatterFromBear(sheep, bear, dt) {
    sheep.state = 'flee';
    sheep.dir = Math.sign(sheep.x - bear.x) || 1;
    sheep.x = clamp(sheep.x + sheep.dir * SHEEP.fleeSpeed * dt, sheep.from, sheep.to);
  }

  function wanderAbout(sheep, dt) {
    if (sheep.t <= 0) chooseSheepActivity(sheep);
    if (sheep.state === 'flee') sheep.state = 'walk';
    if (sheep.state === 'walk') walkSheep(sheep, dt);
  }

  function walkSheep(sheep, dt) {
    sheep.x = clamp(sheep.x + sheep.dir * SHEEP.walkSpeed * dt, sheep.from, sheep.to);
  }

  function chooseSheepActivity(sheep) {
    sheep.t = SHEEP.shortestActivity + Math.random() * SHEEP.activityExtra;
    sheep.state = Math.random() < SHEEP.grazeChance ? 'graze' : 'walk';
    if (Math.random() < SHEEP.turnChance) sheep.dir *= -1;
  }

  function createDeer(spawn) {
    return {
      x: spawn.x, from: spawn.from, to: spawn.to, dir: spawn.i % 2 ? -1 : 1, state: 'graze',
      t: DEER.firstChoiceAfter + spawn.i * DEER.choiceStagger, fear: 0, id: 'deer' + spawn.i,
    };
  }

  function updateDeer(game, dt) {
    const bear = game.bear;
    for (const deer of game.deer) {
      deer.t -= dt;
      if (deerNoticesBear(deer, bear)) startleDeer(deer, bear);
      if (deer.state === 'flee') bolt(deer, dt);
      else roam(deer, dt);
    }
  }

  function deerNoticesBear(deer, bear) {
    return Math.abs(bear.x - deer.x) < DEER.fleesWithin && !bear.covered && deer.state !== 'flee';
  }

  function startleDeer(deer, bear) {
    deer.state = 'flee';
    deer.fear = DEER.fearSeconds;
    deer.dir = Math.sign(deer.x - bear.x) || 1;
  }

  function bolt(deer, dt) {
    deer.fear -= dt;
    const nextX = deer.x + deer.dir * DEER.fleeSpeed * dt;
    deer.x = clamp(nextX, deer.from - DEER.fleesPastRange, deer.to + DEER.fleesPastRange);
    if (deer.fear <= 0) calmDown(deer);
  }

  function calmDown(deer) {
    deer.state = 'look';
    deer.t = DEER.shortestLookAfterFleeing + (deer.x % DEER.lookAfterFleeingExtra);
  }

  function roam(deer, dt) {
    if (deer.state === 'walk') walkDeer(deer, dt);
    if (deer.t <= 0) chooseDeerActivity(deer);
  }

  function walkDeer(deer, dt) {
    deer.x += deer.dir * DEER.walkSpeed * dt;
    if (deer.x < deer.from || deer.x > deer.to) deer.dir = homeward(deer);
  }

  function chooseDeerActivity(deer) {
    const strayed = deer.x < deer.from - DEER.straysBeyond || deer.x > deer.to + DEER.straysBeyond;
    deer.state = nextDeerState(deer, strayed);
    if (strayed) deer.dir = homeward(deer);
    deer.t = deerStateSeconds(deer);
  }

  function nextDeerState(deer, strayed) {
    if (strayed) return 'walk';
    if (deer.state !== 'graze') return 'graze';
    return deer.x % DEER.lookCycle < DEER.lookPartOfCycle ? 'look' : 'walk';
  }

  function deerStateSeconds(deer) {
    if (deer.state === 'graze') return DEER.shortestGraze + (deer.x % DEER.grazeExtra);
    if (deer.state === 'look') return DEER.lookSeconds;
    return DEER.walkSeconds;
  }

  function homeward(deer) {
    return deer.x < deer.from ? 1 : -1;
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.wildlife = { updateFish, createDog, updateDogs, createSheep, updateSheep, createDeer, updateDeer };
})();
