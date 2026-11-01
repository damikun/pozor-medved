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
    w: 12600, year: 360, fatGoal: 85, startFat: 20, metabolism: 0.1,
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
};

ZS.FOOD = {
  herb:        { emoji: '🌿', fat: 2,  syn: 0,  panic: 0,  natural: true, label: 'byliny' },
  ants:        { emoji: '🐜', fat: 3,  syn: 0,  panic: 0,  natural: true, label: 'mravenisko' },
  berry:       { emoji: '🫐', fat: 4,  syn: 0,  panic: 0,  natural: true, label: 'čučoriedky' },
  nut:         { emoji: '🌰', fat: 4,  syn: 0,  panic: 0,  natural: true, label: 'bukvice' },
  mushroom:    { emoji: '🍄', fat: 3,  syn: 0,  panic: 0,  natural: true, label: 'huby' },
  wildhoney:   { emoji: '🍯', fat: 9,  syn: 0,  panic: 0,  natural: true, label: 'divý med z dutiny' },
  fish:        { emoji: '🐟', fat: 5,  syn: 0,  panic: 0,  natural: true, label: 'pstruh z Belej' },
  rosehip:     { emoji: '🔴', fat: 3,  syn: 0,  panic: 0,  natural: true, label: 'šípky' },
  snownut:     { emoji: '🌰', fat: 4,  syn: 0,  panic: 0,  natural: true, label: 'bukvice spod snehu' },
  rowan:       { emoji: '🔴', fat: 3,  syn: 0,  panic: 0,  natural: true, label: 'jarabina' },
  frozenapple: { emoji: '🍎', fat: 4,  syn: 0,  panic: 0,  natural: true, label: 'mrazom zbité jablká' },
  container:   { emoji: '🗑️', fat: 14, syn: 16, panic: 10, label: 'hotelový kontajner' },
  bin:         { emoji: '🗑️', fat: 10, syn: 14, panic: 8,  label: 'smetný kôš' },
  hive:        { emoji: '🍯', fat: 8,  syn: 12, panic: 8,  label: 'úľ' },
  apple:       { emoji: '🍎', fat: 5,  syn: 5,  panic: 2,  label: 'jablká zo sadu' },
  corn:        { emoji: '🌽', fat: 12, syn: 10, panic: 0,  label: 'kukurica z vnadiska' },
  sandwich:    { emoji: '🥪', fat: 6,  syn: 10, panic: 4,  label: 'desiata od turistov' },
  feeder:      { emoji: '🌾', fat: 11, syn: 12, panic: 2,  label: 'repa z krmelca' },
  punch:       { emoji: '🍷', fat: 6,  syn: 14, panic: 8,  label: 'punč z trhov' },
  lokse:       { emoji: '🫓', fat: 9,  syn: 14, panic: 8,  label: 'lokše s makom' },
  sausage:     { emoji: '🌭', fat: 12, syn: 16, panic: 10, label: 'klobása zo stánku' },
  carrot:      { emoji: '🥕', fat: 2,  syn: 5,  panic: 6,  label: 'mrkva zo snehuliaka' },
  candy:       { emoji: '🍬', fat: 5,  syn: 8,  panic: 4,  label: 'cukríky z Mikulášovho vreca' },
  chatabin:    { emoji: '🗑️', fat: 13, syn: 16, panic: 10, label: 'kontajner pri chate' },
};
