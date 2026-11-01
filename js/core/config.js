// Game configuration: world size, timing, movement and balance numbers, and the food table.
// Every script hangs off the single global namespace `ZS`; this file must load first.
window.ZS = window.ZS || {};

/**
 * World units: the view is VIEW_H (540) high and the ground line sits at y = GROUND; y points down.
 * Speeds are units per second and times are seconds.
 */
ZS.CFG = {
  LEVEL_W: 12600, VIEW_H: 540, GROUND: 450, MIN_VIEW_W: 760,
  YEAR: 360,
  SEASONS: [
    { name: 'Jar', end: 110 },
    { name: 'Leto', end: 240 },
    { name: 'Jeseň', end: 360 },
  ],
  WALK: 165, RUN: 290, CREEP: 85, JUMP: 600, GRAVITY: 1600,
  METABOLISM: 0.1,
  SYN_DECAY: 0.2,
  PANIC_DECAY: 0.3,
  PROBLEM: 60, CALM: 40,
  FAT_GOAL: 85,
  LIVES: 5,
  START_FAT: 20,
  VILLAGE_NAME: 'Dolný Strach',
};

/** Colours of the floating texts. */
ZS.COLORS = {
  good: '#2f7d4f',     // forest food, misses, a shot that hit a tree
  bad: '#a3261f',      // human food, warnings
  seen: '#c0392b',     // someone spotted the bear
  shot: '#d62f27',     // gunfire and hits
  story: '#5a3418',    // satirical asides
};

/**
 * Food by type. natural: forest food, picked up on touch. Human food (natural absent) has to be raided on purpose.
 * syn: how much the bear gets used to people; panic: media panic when it is eaten.
 */
ZS.FOOD = {
  herb:      { emoji: '🌿', fat: 2,  syn: 0,  panic: 0,  natural: true, label: 'byliny' },
  ants:      { emoji: '🐜', fat: 3,  syn: 0,  panic: 0,  natural: true, label: 'mravenisko' },
  berry:     { emoji: '🫐', fat: 4,  syn: 0,  panic: 0,  natural: true, label: 'čučoriedky' },
  nut:       { emoji: '🌰', fat: 4,  syn: 0,  panic: 0,  natural: true, label: 'bukvice' },
  mushroom:  { emoji: '🍄', fat: 3,  syn: 0,  panic: 0,  natural: true, label: 'huby' },
  wildhoney: { emoji: '🍯', fat: 9,  syn: 0,  panic: 0,  natural: true, label: 'divý med z dutiny' },
  fish:      { emoji: '🐟', fat: 5,  syn: 0,  panic: 0,  natural: true, label: 'pstruh z Váhu' },
  container: { emoji: '🗑️', fat: 14, syn: 16, panic: 10, label: 'hotelový kontajner' },
  bin:       { emoji: '🗑️', fat: 10, syn: 14, panic: 8,  label: 'smetný kôš' },
  hive:      { emoji: '🍯', fat: 8,  syn: 12, panic: 8,  label: 'úľ' },
  apple:     { emoji: '🍎', fat: 5,  syn: 5,  panic: 2,  label: 'jablká zo sadu' },
  corn:      { emoji: '🌽', fat: 12, syn: 10, panic: 0,  label: 'kukurica z vnadiska' },
  sandwich:  { emoji: '🥪', fat: 6,  syn: 10, panic: 4,  label: 'desiata od turistov' },
};
