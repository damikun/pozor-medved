(function () {
  const { CFG, LABELS, NEWS } = ZS;
  const GROUND = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const pen = () => ZS.sim.pen;

  const SPEED = { tourist: 25, santa: 22, picker: 35 };
  const SHY = { picker: 'pickerSeen', santa: 'santaSeen' };

  const WALK = {
    defaultSpeed: 30,
    shortestBeat: 200,
    waitAtBeatEnd: 2,
  };

  const FLEE = {
    leaveSpeedUp: 1.4,
    bittenSpeed: 170,
    runSpeed: 210,
    goneBeyond: 1600,
    offLevel: 200,
  };

  const SIGHT = {
    around: 110,
    ahead: 300,
    touristAhead: 380,
    hidingBearWithin: 55,
  };

  const ALARM = {
    shyPanic: 8,
    filmPanic: 12,
    labelHeight: 100,
  };

  const SANDWICH = {
    firstDropAfter: 8,
    dropEvery: 18,
    mostLyingAround: 3,
    dropAhead: 30,
    fenceMargin: 40,
  };

  function create(game, kind, options) {
    const person = Object.assign({
      kind, x: (options.from + options.to) / 2, dir: 1, speed: SPEED[kind] || WALK.defaultSpeed,
      state: 'walk', pause: 0, filmCd: 0, dropCd: SANDWICH.firstDropAfter,
      react: null, reactT: 0, empty: false, clutch: false, hurdle: null,
    }, options);
    if (options.from !== options.to) keepBeatOutsideFences(game && game.level, person);
    if (kind === 'tycoon') ZS.sim.tycoon.init(person);
    return person;
  }

  function keepBeatOutsideFences(level, person) {
    pen().range(level, person, pen().KEEP.person, WALK.shortestBeat);
    ZS.sim.corn.range(level, person, undefined, WALK.shortestBeat);
  }

  function update(game, dt) {
    for (const person of game.people) updatePerson(game, person, dt);
    game.people = game.people.filter((person) => !person.dead);
  }

  function updatePerson(game, person, dt) {
    person.filmCd -= dt;
    person.dropCd -= dt;
    if (person.kind === 'tycoon') ZS.sim.tycoon.update(game, person, dt);
    if (person.react) playReaction(game, person, dt);
    else if (person.state === 'flee' || person.leaving || person.hurdle) fleeUntilGone(game, person, dt);
    else if (person.kind === 'forester') ZS.sim.logging.forester(game, person, dt);
    else if (person.kind !== 'tycoon') goAboutBusiness(game, person, dt);
  }

  function playReaction(game, person, dt) {
    const previousX = person.x;
    ZS.sim.encounters.reactPerson(game, person, dt);
    person.x = ZS.sim.corn.hold(game.level, previousX, person.x);
  }

  function fleeUntilGone(game, person, dt) {
    flee(game, person, dt);
    if (farEnoughAway(game, person)) person.dead = true;
  }

  function farEnoughAway(game, person) {
    return Math.abs(person.x - game.bear.x) > FLEE.goneBeyond
      || person.x < -FLEE.offLevel
      || person.x > game.level.w + FLEE.offLevel;
  }

  function flee(game, person, dt) {
    if (person.hurdle) {
      pen().hurdleStep(person, dt);
      return;
    }
    const level = game.level;
    const nextX = person.x + person.dir * fleeSpeed(level, person) * dt;
    if (person.leaving) walkOff(level, person, nextX);
    else runOrHurdle(level, person, nextX, dt);
  }

  function fleeSpeed(level, person) {
    if (person.leaving) return person.speed * FLEE.leaveSpeedUp;
    const speed = person.clutch ? FLEE.bittenSpeed : FLEE.runSpeed;
    return speed * (pen().inside(level, person.x, 0) ? pen().HURDLE.inside : 1);
  }

  function walkOff(level, person, nextX) {
    stepOrTurnBack(person, nextX, stopAtFencesAndCorn(level, person.x, nextX));
  }

  function runOrHurdle(level, person, nextX, dt) {
    const fence = pen().ahead(level, person.x, person.dir);
    if (fence !== null && Math.abs(fence - nextX) <= pen().HURDLE.reach) {
      pen().hurdleAt(person, fence, person.dir);
      pen().hurdleStep(person, dt);
      return;
    }
    stepOrTurnBack(person, nextX, ZS.sim.corn.hold(level, person.x, nextX));
  }

  function stepOrTurnBack(person, wantedX, allowedX) {
    if (allowedX !== wantedX) person.dir *= -1;
    person.x = allowedX;
  }

  function stopAtFencesAndCorn(level, fromX, toX) {
    return ZS.sim.corn.hold(level, fromX, pen().hold(level, fromX, toX, pen().KEEP.person));
  }

  function goAboutBusiness(game, person, dt) {
    if (person.pause > 0) person.pause -= dt;
    else walkBeat(game.level, person, dt);
    reactToBear(game, person);
    if (person.kind === 'tourist' && person.dropCd <= 0) dropSandwich(game.level, person);
  }

  function walkBeat(level, person, dt) {
    const nextX = person.x + person.dir * person.speed * dt;
    const allowedX = stopAtFencesAndCorn(level, person.x, nextX);
    person.x = allowedX;
    if (allowedX !== nextX || person.x < person.from || person.x > person.to) turnAtBeatEnd(person);
  }

  function turnAtBeatEnd(person) {
    person.dir *= -1;
    person.x = clamp(person.x, person.from, person.to);
    person.pause = WALK.waitAtBeatEnd;
  }

  function reactToBear(game, person) {
    if (!seesBear(game.bear, person)) return;
    if (SHY[person.kind]) runOffScared(game, person);
    else if (person.filmCd <= 0) startFilming(game, person);
  }

  function seesBear(bear, person) {
    const distance = Math.abs(bear.x - person.x);
    const bearAhead = Math.sign(bear.x - person.x) === person.dir;
    const inView = !bear.covered || (bear.hiding && distance < SIGHT.hidingBearWithin);
    const aheadRange = person.kind === 'tourist' ? SIGHT.touristAhead : SIGHT.ahead;
    return inView && (distance < SIGHT.around || (bearAhead && distance < aheadRange));
  }

  function runOffScared(game, person) {
    const bear = game.bear;
    person.state = 'flee';
    person.dir = Math.sign(person.x - bear.x) || 1;
    rules().addPanic(game, ALARM.shyPanic, NEWS[SHY[person.kind]]);
    rules().spotted(game, person.x, GROUND - ALARM.labelHeight, LABELS.pickerSeen);
    ZS.sim.hunters.alert(game, bear.x);
  }

  function startFilming(game, person) {
    person.filmCd = Infinity;
    rules().addPanic(game, ALARM.filmPanic, NEWS.touristSeen);
    rules().spotted(game, person.x, GROUND - ALARM.labelHeight, LABELS.touristFilm);
  }

  function dropSandwich(level, person) {
    person.dropCd = SANDWICH.dropEvery;
    if (sandwichesLyingAround(level) < SANDWICH.mostLyingAround) {
      level.items.push({ type: 'sandwich', x: sandwichDropX(level, person), eaten: false, locked: false });
    }
  }

  function sandwichesLyingAround(level) {
    return level.items.filter((item) => item.type === 'sandwich' && !item.eaten).length;
  }

  function sandwichDropX(level, person) {
    const inFront = person.x + SANDWICH.dropAhead * person.dir;
    if (pen().inside(level, inFront, SANDWICH.fenceMargin)) return person.x - SANDWICH.dropAhead * person.dir;
    return inFront;
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.people = { create, update };
})();
