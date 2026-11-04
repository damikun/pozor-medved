window.ZS = window.ZS || {};

ZS.CFG = {
  VIEW_H: 540, GROUND: 450, MIN_VIEW_W: 760,
  WALK: 165, RUN: 290, CREEP: 85, JUMP: 600, GRAVITY: 1600,
  METABOLISM: 0.1,
  SYN_DECAY: 0.2,
  PANIC_DECAY: 0.3,
  PROBLEM: 60, CALM: 40,
  LIVES: 5,
  REACH: 74,
  BITE: 0.42, HUG: 1.7, SELFIE: 2.2, SHAKE: 1.9,
  FALL: 0.42, LIE: 2.4, RISE: 0.9, PICKUP: 0.75, HOP: 0.55, DROP: 0.6, LADDER: 2.2,
};

ZS.LEVELS = {
  summer: {
    w: 16250, year: 360, fatGoal: 85, startFat: 20, metabolism: 0.1,
    seasons: [{ key: 'spring', end: 110 }, { key: 'summer', end: 240 }, { key: 'autumn', end: 360 }],
  },
  winter: {
    w: 10800, year: 270, fatGoal: 65, startFat: 38, metabolism: 0.11,
    seasons: [{ key: 'advent', end: 90 }, { key: 'snow', end: 180 }, { key: 'frost', end: 270 }],
  },
};

ZS.COLORS = {
  good: '#2f7d4f',
  bad: '#a3261f',
  seen: '#c0392b',
  shot: '#d62f27',
  story: '#5a3418',
  love: '#d6336c',
  zap: '#d18a00',
};

ZS.REPO_URL = 'https://github.com/damikun/pozor-medved';

ZS.FOOD = {
  herb:        { emoji: '🌿', fat: 2,  syn: 0,  panic: 0,  natural: true },
  ants:        { emoji: '🐜', fat: 3,  syn: 0,  panic: 0,  natural: true },
  berry:       { emoji: '🫐', fat: 4,  syn: 0,  panic: 0,  natural: true },
  nut:         { emoji: '🌰', fat: 4,  syn: 0,  panic: 0,  natural: true },
  mushroom:    { emoji: '🍄', fat: 3,  syn: 0,  panic: 0,  natural: true },
  wildhoney:   { emoji: '🍯', fat: 9,  syn: 0,  panic: 0,  natural: true },
  stash:       { emoji: '🌰', fat: 9,  syn: 0,  panic: 0,  natural: true },
  fish:        { emoji: '🐟', fat: 5,  syn: 0,  panic: 0,  natural: true },
  limba:       { emoji: '🌰', fat: 4,  syn: 0,  panic: 0,  natural: true },
  rosehip:     { emoji: '🔴', fat: 3,  syn: 0,  panic: 0,  natural: true },
  snownut:     { emoji: '🌰', fat: 4,  syn: 0,  panic: 0,  natural: true },
  rowan:       { emoji: '🔴', fat: 3,  syn: 0,  panic: 0,  natural: true },
  frozenapple: { emoji: '🍎', fat: 4,  syn: 0,  panic: 0,  natural: true },
  container:   { emoji: '🗑️', fat: 14, syn: 16, panic: 10 },
  bin:         { emoji: '🗑️', fat: 10, syn: 14, panic: 8 },
  hive:        { emoji: '🍯', fat: 8,  syn: 12, panic: 8 },
  apple:       { emoji: '🍎', fat: 5,  syn: 5,  panic: 2 },
  corn:        { emoji: '🌽', fat: 12, syn: 10, panic: 0 },
  cob:         { emoji: '🌽', fat: 3,  syn: 3,  panic: 0 },
  sandwich:    { emoji: '🥪', fat: 6,  syn: 10, panic: 4 },
  feeder:      { emoji: '🌾', fat: 11, syn: 12, panic: 2 },
  punch:       { emoji: '🍷', fat: 6,  syn: 14, panic: 8 },
  lokse:       { emoji: '🫓', fat: 9,  syn: 14, panic: 8 },
  sausage:     { emoji: '🌭', fat: 12, syn: 16, panic: 10 },
  cheese:      { emoji: '🧀', fat: 9,  syn: 14, panic: 8 },
  carrot:      { emoji: '🥕', fat: 2,  syn: 5,  panic: 6 },
  candy:       { emoji: '🍬', fat: 5,  syn: 8,  panic: 4 },
  chatabin:    { emoji: '🗑️', fat: 13, syn: 16, panic: 10 },
  halusky:     { emoji: '🥟', fat: 6,  syn: 10, panic: 4 },
  catch:       { emoji: '🐟', fat: 7,  syn: 10, panic: 4 },
};
