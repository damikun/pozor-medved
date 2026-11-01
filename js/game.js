// Game state, the loop, meters, politics, events, HUD and screens (side view).
(function () {
  const { CFG, NEWS } = ZS;
  const GY = CFG.GROUND;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  let g = null, vw = 0, vh = 0, viewW = 0, offY = 0, last = 0, hudT = 0, badgeHtml = '';

  // The world is 540 units high; it scales to the window and never gets narrower than MIN_VIEW_W.
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    if (!vw || !vh) { viewW = 0; offY = 0; return; }
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    // A phone held upright gets a narrower view and the ground sits higher, leaving room for the buttons.
    const minW = vh > vw ? 480 : CFG.MIN_VIEW_W;
    const scale = Math.min(vh / CFG.VIEW_H, vw / minW);
    viewW = vw / scale;
    offY = (vh / scale - CFG.VIEW_H) * 0.45;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const input = { keys: new Set(), jumpPressed: false };
  const JUMP_KEYS = ['ArrowUp', 'KeyW', 'Space'];
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'];
  // Some browsers and keyboard layouts leave e.code empty; fall back to e.key.
  const KEY_NAMES = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', ' ': 'Space', Spacebar: 'Space', Shift: 'ShiftLeft' };
  const codeOf = (e) => e.code || KEY_NAMES[e.key] || e.key;
  window.addEventListener('keydown', (e) => {
    const code = codeOf(e);
    if (code === 'KeyP' || code === 'Escape') { if (!e.repeat) togglePause(); return; }
    if (JUMP_KEYS.includes(code) && !e.repeat) { input.jumpPressed = true; input.jumpKey = code; }
    // Auto-repeat keeps re-adding a held key, so it comes back even after a lost focus cleared it.
    input.keys.add(code);
    if (GAME_KEYS.includes(code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const code = codeOf(e);
    input.keys.delete(code);
    // Remember the release itself, so a quick release-and-press within one frame still counts.
    if (code === 'ArrowDown' || code === 'KeyS') input.downReleased = true;
    // macOS sends no keyup for keys let go while ⌘ is held, so drop everything when ⌘ comes up.
    if (e.key === 'Meta') input.keys.clear();
  });
  window.addEventListener('blur', () => input.keys.clear());
  document.querySelectorAll('#touch button').forEach((btn) => {
    const key = btn.dataset.key;
    const down = (e) => { e.preventDefault(); input.keys.add(key); if (key === 'ArrowUp') { input.jumpPressed = true; input.jumpKey = key; } };
    const up = (e) => { e.preventDefault(); input.keys.delete(key); if (key === 'ArrowDown') input.downReleased = true; };
    btn.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, up));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && g && g.running && !g.paused) togglePause(); });

  function createState() {
    const level = ZS.makeLevel(11);
    const s = {
      level, bear: ZS.makeBear(), input,
      shooters: [], people: [], drones: [], dogs: [], sheep: [], floaters: [], shots: [], particles: [], bubble: null,
      time: 0, seasonIdx: 0, fat: 20, syn: 0, panic: 0, lives: CFG.LIVES, cam: 0,
      flags: { press: false, emergency: false, drones: false, cull: false, meat: false, binsLocked: false },
      courtUntil: 0, lastKnown: null, lastHuman: -99, problem: false, nextEvent: 30, usedEvents: new Set(),
      stats: { natural: 0, human: 0, seen: 0 }, running: false, over: false, paused: false,
      bot: /[?&]bot\b/.test(location.search),
      headlines: ZS.HEADLINES.slice().sort(() => Math.random() - 0.5), headlineIdx: 0,
      tickerT: 0, tickerQueue: [], tickerHot: false,
    };
    for (const sp of level.spawns) {
      if (sp.kind === 'posed') s.shooters.push(ZS.makeShooter(s, 'posed', { x: sp.x, range: sp.range }));
      else if (sp.kind === 'walker') s.shooters.push(ZS.makeShooter(s, 'walker', { x: sp.to, from: sp.from, to: sp.to, dir: -1 }));
      else if (sp.kind === 'dog') s.dogs.push(ZS.makeDog(sp));
      else if (sp.kind === 'sheep') s.sheep.push(ZS.makeSheep(sp, s.sheep.length));
      else s.people.push(ZS.makePerson(s, sp.kind, { from: sp.from, to: sp.to }));
    }
    ZS.fx.init(s);
    return s;
  }

  function start() {
    input.keys.clear();
    g = createState();
    g.running = true;
    $('hud').hidden = false; $('ticker').hidden = false;
    $('touch').hidden = !window.matchMedia('(pointer: coarse)').matches;
    hideScreen();
    if (document.activeElement) document.activeElement.blur();
    say('Začína jar. Medvede vychádzajú z brlohov, politici z tlačoviek.');
  }

  // --- Ticker ---------------------------------------------------------------

  function say(text, hot) {
    if (!g || g.tickerQueue.some((q) => q.text === text)) return;
    if (!hot && g.tickerQueue.length > 2) return;
    g.tickerQueue.push({ text, hot: !!hot });
    if (hot && !g.tickerHot) g.tickerT = 0;
  }

  function tickerUpdate(dt) {
    g.tickerT -= dt;
    if (g.tickerT > 0) return;
    const item = g.tickerQueue.shift() || { text: g.headlines[g.headlineIdx++ % g.headlines.length], hot: false };
    g.tickerHot = item.hot;
    g.tickerT = item.hot ? 7 : 6;
    const el = $('tickerText');
    el.classList.add('fade');
    setTimeout(() => { el.textContent = item.text; el.classList.toggle('hot', item.hot); el.classList.remove('fade'); }, 250);
  }

  // --- Hooks called from actors.js -----------------------------------------------

  ZS.float = function (s, x, y, text, color) { s.floaters.push({ x, y, text, color, t: 1.6 }); };
  ZS.addPanic = function (s, n, news, hot) { s.panic = Math.min(100, s.panic + n); if (news) say(news, hot); };
  ZS.spotted = function (s, x, y, text) { s.stats.seen++; ZS.float(s, x, y, text, '#c0392b'); };

  ZS.eat = function (s, it) {
    const f = ZS.FOOD[it.type];
    it.eaten = true;
    s.fat = Math.min(100, s.fat + f.fat);
    if (f.natural) s.stats.natural++; else { s.stats.human++; s.lastHuman = s.time; }
    if (f.syn) s.syn = Math.min(100, s.syn + f.syn);
    if (f.panic) s.panic = Math.min(100, s.panic + f.panic);
    ZS.float(s, it.x, GY - 80, '+' + f.fat + ' ' + f.label, f.natural ? '#2f7d4f' : '#a3261f');
    if (it.type === 'bin') say(NEWS.binEaten);
    if (it.type === 'hive') say(NEWS.hiveEaten);
    if (it.type === 'container') say(NEWS.containerEaten);
    if (s.fat >= CFG.FAT_GOAL && !s.readySaid) {
      s.readySaid = true;
      say('Medveď má dosť tuku na zimu. Zimný brloh je na konci doliny.', true);
    }
  };

  // at === 'tree' when the bear ducked behind a trunk at the last moment.
  ZS.fire = function (s, shooter, at) {
    if (s.over) return;
    const b = s.bear;
    ZS.fx.onShot(s, shooter.x);
    shooter.kick = 1;
    // Tracers start at the barrel as js/people.js last drew it.
    const mz = ZS.muzzle(shooter);
    const fromX = mz ? mz[0] : shooter.x;
    const fromY = mz ? mz[1] : shooter.kind === 'posed' ? GY - 178 : GY - 48;
    ZS.float(s, shooter.x, fromY - 26, 'PRÁSK!', '#d62f27');
    // Every shot gives the bear a breather: all crosshairs drop their aim for a moment.
    for (const o of s.shooters) { o.lock = 0; o.reload = Math.max(o.reload, 1.5); }
    if (at === 'tree') {
      s.shots.push({ x1: fromX, y1: fromY, x2: shooter.cross, y2: GY - 60, t: 0.3 });
      for (let i = 0; i < 12; i++) {
        s.particles.push({ x: shooter.cross, y: GY - 60, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, t: 0.9, color: '#8a6a48' });
      }
      ZS.float(s, b.x, GY - 125, 'Trafil strom!', '#2f7d4f');
      say(NEWS.treeHit);
      return;
    }
    // A sprinting bear is hard to hit.
    const sprinting = b.running && b.moving;
    if (Math.random() < (sprinting ? 0.5 : 0.15)) {
      s.shots.push({ x1: fromX, y1: fromY, x2: b.x + (Math.random() < 0.5 ? -1 : 1) * 80, y2: GY - 100, t: 0.3 });
      ZS.float(s, b.x, GY - 125, sprinting ? 'Vedľa! Šprint ťa zachránil.' : 'Vedľa!', '#2f7d4f');
      say(NEWS.missed);
      return;
    }
    s.shots.push({ x1: fromX, y1: fromY, x2: b.x, y2: b.y - 34, t: 0.3 });
    s.lives -= 1;
    if (s.lives <= 0) {
      endGame(shooter.kind === 'poacher' ? 'poacher' : shooter.kind === 'ztmh' ? 'problem' : s.flags.cull ? 'cull' : 'hunted');
      return;
    }
    s.bear.inv = 3;
    ZS.float(s, s.bear.x, GY - 115, 'Zásah do kožucha! Zostáva ' + s.lives + ' ❤️', '#d62f27');
    say(shooter.kind === 'poacher' ? 'V lese sa strieľalo. Polícia nič nevie.' : 'Poľovník strieľal na medveďa. Zasiahol hlavne kríky.', true);
  };

  // --- Politics: one-way escalation driven by media panic ---------------------------

  function spawnAhead(kind, extra) {
    let x = Math.min(CFG.LEVEL_W - 250, g.bear.x + viewW * 0.75 + Math.random() * 500);
    // New hunters keep their distance from the ones already in the forest.
    for (let i = 0; i < 6 && g.shooters.some((s) => Math.abs(s.x - x) < 500); i++) x = Math.min(CFG.LEVEL_W - 250, x + 450);
    g.shooters.push(ZS.makeShooter(g, kind, Object.assign({ x, from: x - 500, to: x + 200, dir: -1 }, extra)));
  }

  function politics() {
    const f = g.flags;
    if (!f.press && g.panic >= 25) { f.press = true; spawnAhead('walker'); say(NEWS.press, true); }
    if (!f.emergency && g.panic >= 45) { f.emergency = true; spawnAhead('walker'); say(NEWS.emergency, true); }
    if (!f.drones && g.panic >= 65) { f.drones = true; g.drones.push(ZS.makeDrone(g, 0), ZS.makeDrone(g, 3)); say(NEWS.drones, true); }
    if (!f.cull && g.panic >= 85) { f.cull = true; spawnAhead('walker'); spawnAhead('walker'); say(NEWS.cull, true); }
    if (!g.problem && g.syn >= CFG.PROBLEM) {
      g.problem = true;
      if (!g.shooters.some((s) => s.kind === 'ztmh')) g.shooters.push(ZS.makeShooter(g, 'ztmh', { x: g.cam - 150, dir: 1 }));
      say(NEWS.problem, true);
    }
    if (g.problem && g.syn < CFG.CALM) { g.problem = false; say(NEWS.calm); }
  }

  const EVENTS = {
    wrongbear() {
      g.panic = Math.max(0, g.panic - 25);
      ZS.float(g, g.bear.x + 260, GY - 150, '✝ iná medvedica', '#5a3418');
      say(NEWS.wrongbear, true);
    },
    court() { g.courtUntil = g.time + 15; say(NEWS.court, true); },
    meat() { g.flags.meat = true; say(NEWS.meat, true); },
    poacher() { spawnAhead('poacher', { life: 40 }); say(NEWS.poacher, true); },
    bins() { g.flags.binsLocked = true; g.level.items.forEach((it) => { if (it.type === 'bin') it.locked = true; }); say(NEWS.bins); },
    census() { g.panic = Math.min(100, g.panic + 6); say(NEWS.census); },
    constitution() { g.panic = Math.min(100, g.panic + 4); say(NEWS.constitution, true); },
    feeding() {
      const x = Math.min(CFG.LEVEL_W - 500, g.bear.x + viewW + 300);
      for (let i = 0; i < 2; i++) g.level.items.push({ type: 'corn', x: x + i * 40, eaten: false, locked: false });
      g.level.items.sort((a, b) => a.x - b.x);
      g.level.posts.push({ x: x + 170 });
      g.shooters.push(ZS.makeShooter(g, 'posed', { x: x + 170, range: 460 }));
      say(NEWS.feeding, true);
    },
  };

  function events(dt) {
    g.nextEvent -= dt;
    if (g.nextEvent > 0) return;
    g.nextEvent = 28 + Math.random() * 12;
    const pool = Object.keys(EVENTS).filter((k) => !g.usedEvents.has(k));
    if (!pool.length) return;
    const k = pool[Math.floor(Math.random() * pool.length)];
    g.usedEvents.add(k);
    EVENTS[k]();
  }

  // --- Update ------------------------------------------------------------------

  function update(dt) {
    if (g.bot && ZS.autopilot) ZS.autopilot(g, dt);
    g.time += dt;
    const si = CFG.SEASONS.findIndex((s) => g.time < s.end);
    if (si === -1) { endGame('starve'); return; }
    if (si !== g.seasonIdx) {
      g.seasonIdx = si;
      if (si === 1) say('Leto: v lese dozreli čučoriedky.');
      if (si === 2) {
        say(NEWS.mushrooms, true);
        const x = Math.min(CFG.LEVEL_W - 600, g.bear.x + 900);
        g.people.push(ZS.makePerson(g, 'picker', { from: x - 400, to: x + 400 }));
      }
    }
    ZS.updateBear(g, dt);
    g.cam = Math.max(0, Math.min(CFG.LEVEL_W - viewW, g.bear.x - viewW * 0.38));
    ZS.fx.update(g, dt, viewW);
    ZS.updateShooters(g, dt);
    if (g.over) return;
    ZS.updatePeople(g, dt);
    ZS.updateDrones(g, dt);
    ZS.updateDogs(g, dt);
    ZS.updateSheep(g, dt);
    ZS.updateFish(g, dt);

    g.fat = Math.max(0, g.fat - CFG.METABOLISM * dt * (g.bear.running && g.bear.moving ? 4 : 1));
    if (g.time - g.lastHuman > 8) g.syn = Math.max(0, g.syn - CFG.SYN_DECAY * dt);
    g.panic = Math.max(0, g.panic - CFG.PANIC_DECAY * dt);
    politics();
    events(dt);

    g.shots.forEach((sh) => { sh.t -= dt; });
    g.shots = g.shots.filter((sh) => sh.t > 0);
    g.particles.forEach((p) => { p.t -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    g.particles = g.particles.filter((p) => p.t > 0 && p.y < GY);
    g.floaters.forEach((f) => { f.t -= dt; });
    g.floaters = g.floaters.filter((f) => f.t > 0);
    if (g.bubble && (g.bubble.t -= dt) <= 0) g.bubble = null;

    if (g.bear.x >= g.level.winterDen - 20) { endGame(g.fat >= CFG.FAT_GOAL ? 'win' : 'starve'); return; }
    tickerUpdate(dt);
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.1; hud(); }
  }

  function hud() {
    $('barFat').querySelector('i').style.width = g.fat + '%';
    $('barSyn').querySelector('i').style.width = g.syn + '%';
    $('barPanic').querySelector('i').style.width = g.panic + '%';
    $('barTrip').querySelector('i').style.width = Math.min(100, (g.bear.x / g.level.winterDen) * 100) + '%';
    $('season').textContent = CFG.SEASONS[g.seasonIdx].name + ' · do zimy ' + Math.ceil(Math.max(0, CFG.YEAR - g.time)) + ' s';
    $('lives').textContent = '❤️'.repeat(Math.max(0, g.lives)) + (g.bear.hiding ? ' · za stromom' : '');
    const b = [];
    if (g.problem) b.push('<span class="badge">Problémový medveď</span>');
    if (g.flags.cull) b.push('<span class="badge">Odstrel 350 ks</span>');
    if (g.flags.emergency) b.push('<span class="badge">Mimoriadna situácia</span>');
    if (g.flags.drones) b.push('<span class="badge">Drony armády</span>');
    if (g.time < g.courtUntil) b.push('<span class="badge calm">Súd: odstrel stojí ' + Math.ceil(g.courtUntil - g.time) + ' s</span>');
    if (g.flags.meat) b.push('<span class="badge dark">Mäso na predaj</span>');
    if (g.flags.binsLocked) b.push('<span class="badge calm">Zabezpečené koše</span>');
    const html = b.join('');
    if (html !== badgeHtml) { badgeHtml = html; $('badges').innerHTML = html; }
  }

  // --- Screens -------------------------------------------------------------------

  function showScreen(html) { $('screenCard').innerHTML = html; $('screen').hidden = false; }
  function hideScreen() { $('screen').hidden = true; }

  function startScreen() {
    showScreen(`<h1>Za stromom</h1>
      <p class="sub">Satirická hra o medveďovi z Liptova</p>
      <p>Si medveď a musíš prejsť dolinou od jarného brlohu až do zimného. Cestou nažer aspoň 85 % tuku. Poľovníci po tebe mieria zameriavačom a najlepšia šanca je schovať sa za strom.</p>
      <ul>
        <li>Keď sa k tebe blíži zameriavač alebo nad tebou svieti <b>!</b>, drž <kbd>↓</kbd> pri hrubom strome. Breza ťa neschová.</li>
        <li>Alebo vylez na strom: <kbd>↑</kbd> pri hrubom kmeni. Kým lezieš, vidia ťa; v korune už nie. <kbd>↓</kbd> zlezieš, medzerníkom zoskočíš.</li>
        <li>Lesné dobroty zbieraš sám od seba, aj vo výskoku. V korunách starých bukov je divý med.</li>
        <li>Koše a úle musíš vybrať zámerne: zastav pri nich na pol sekundy. Práve vtedy si najzraniteľnejší.</li>
        <li>Šprint (<kbd>Shift</kbd>) ti pomôže ujsť, ale minie dych aj tuk a poľovníci ho počujú.</li>
        <li>Koše, úle a kukurica z vnadiska dajú veľa tuku, ale urobia z teba „problémového medveďa“ a vyrazí po tebe zásahový tím.</li>
        <li>Keď ťa niekto uvidí, rastie mediálna panika a s ňou prichádza politika: viac poľovníkov, drony, odstrel.</li>
      </ul>
      <p class="keys"><kbd>←</kbd> <kbd>→</kbd> beh · <kbd>Shift</kbd> šprint · medzerník: skok · <kbd>↑</kbd> skok, pri strome lezenie · <kbd>↓</kbd> schovať sa · <kbd>P</kbd> pauza</p>
      <div class="row"><button id="btnStart">Hrať</button><a class="alt" href="v1-zhora/">pôvodná verzia zhora</a></div>
      <p class="note">Postavy, obec aj titulky sú vymyslené. Fakty na konci hry sú skutočné a majú zdroj.</p>`);
    $('btnStart').onclick = start;
  }

  function endGame(kind) {
    if (g.over) return;
    g.over = true;
    hud();
    $('touch').hidden = true;
    const e = ZS.ENDINGS[kind];
    let text = e.text, facts = e.facts.slice();
    if (g.flags.meat && kind !== 'win' && kind !== 'starve') {
      text += ' A keďže štát povolil predaj mäsa, skončil si ako guláš v tatranskej reštaurácii.';
      facts = ['meat'].concat(facts.slice(0, 2));
    }
    const list = facts.map((id) => {
      const f = ZS.FACTS[id];
      return `<li>${f.text} <a href="${f.url}" target="_blank" rel="noopener">${f.src}</a></li>`;
    }).join('');
    showScreen(`<h2>${e.title}</h2>
      <p>${text}</p>
      <div class="stats">
        <div class="stat"><b>${g.stats.natural}</b><span>jedlo z lesa</span></div>
        <div class="stat"><b>${g.stats.human}</b><span>jedlo od ľudí</span></div>
        <div class="stat"><b>${g.stats.seen}</b><span>krát ťa videli</span></div>
        <div class="stat"><b>${Math.round(g.fat)} %</b><span>tuku · ${CFG.SEASONS[g.seasonIdx].name.toLowerCase()}</span></div>
      </div>
      <div class="facts"><h3>Fakty zo Slovenska</h3><ul>${list}</ul></div>
      <div class="row"><button id="btnAgain">Znova</button></div>`);
    $('btnAgain').onclick = start;
  }

  function togglePause() {
    if (!g || !g.running || g.over) return;
    g.paused = !g.paused;
    if (!g.paused) { hideScreen(); return; }
    showScreen('<h2>Pauza</h2><p>Medveď čaká za stromom.</p><div class="row"><button id="btnResume">Pokračovať</button></div>');
    $('btnResume').onclick = togglePause;
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (vw !== window.innerWidth || vh !== window.innerHeight) resize();
    if (g.running && !g.over && !g.paused) update(dt);
    g.cam = Math.max(0, Math.min(CFG.LEVEL_W - viewW, g.bear.x - viewW * 0.38));
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    requestAnimationFrame(frame);
  }

  g = createState();
  startScreen();
  requestAnimationFrame(frame);

  ZS.debug = () => g;
  ZS.restart = start;
  // Runs the simulation without waiting for animation frames (handy in a background tab).
  ZS.debugStep = (seconds) => {
    for (let t = 0; t < seconds && g.running && !g.over; t += 1 / 60) update(1 / 60);
    if (viewW) ZS.draw(g, ctx, viewW, offY);
    return g;
  };
})();
