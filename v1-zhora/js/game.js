// Game state, the loop, meters, politics, events, HUD and screens.
(function () {
  const { CFG, NEWS } = ZS;
  const { dist } = ZS.util;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  let g = null, vw = 0, vh = 0, last = 0, hudT = 0, badgeHtml = '';

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const input = { keys: new Set(), target: null, pointer: null, sneakToggle: false };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
    input.keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('pointerdown', (e) => { input.pointer = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (input.pointer) input.pointer = { x: e.clientX, y: e.clientY }; });
  const release = () => { input.pointer = null; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden && g && g.running && !g.paused) togglePause(); });

  function createState() {
    const w = ZS.makeWorld(7);
    const s = {
      w, ground: ZS.buildGround(w), bear: ZS.makeBear(), input,
      shooters: [], people: [], drones: [], floaters: [], decoys: [],
      time: 0, seasonIdx: 0, fat: 15, syn: 0, panic: 0, lives: CFG.LIVES, ready: false,
      flags: { press: false, emergency: false, drones: false, cull: false, meat: false, binsLocked: false, zoneScale: 1 },
      courtUntil: 0, lastKnown: null, lastHuman: -99, problem: false, nextEvent: 35, usedEvents: new Set(),
      stats: { natural: 0, human: 0, seen: 0 }, running: false, over: false, paused: false,
      headlines: ZS.HEADLINES.slice().sort(() => Math.random() - 0.5), headlineIdx: 0, tickerT: 0, tickerQueue: [], spawnT: 15,
    };
    s.shooters.push(ZS.makeShooter(s, 'hunter', { path: w.patrols[0] }));
    s.shooters.push(ZS.makeShooter(s, 'hunter', { path: w.patrols[1] }));
    s.shooters.push(ZS.makeShooter(s, 'stand', { x: w.stand.x, y: w.stand.y, ang: w.stand.ang }));
    for (let i = 0; i < 3; i++) s.people.push(ZS.makePerson(s, 'picker'));
    return s;
  }

  function start() {
    g = createState();
    g.running = true;
    $('hud').hidden = false; $('ticker').hidden = false;
    hideScreen();
    if (document.activeElement) document.activeElement.blur();
    say(NEWS.winter.replace('Prichádza zima', 'Začína jar').replace('idú do brlohov', 'vychádzajú z brlohov'));
  }

  // --- Ticker ---------------------------------------------------------------

  function say(text, hot) {
    if (!g) return;
    if (g.tickerQueue.some((q) => q.text === text)) return;
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

  // --- Hooks called from entities.js -------------------------------------------

  function float(x, y, text, color) { g.floaters.push({ x, y, text, color, t: 1.6 }); }

  ZS.addPanic = function (s, n, news, hot) { s.panic = Math.min(100, s.panic + n); if (news) say(news, hot); };
  ZS.spotted = function (s, x, y, text) { s.stats.seen++; float(x, y - 20, text, '#c0392b'); };

  ZS.eat = function (s, it) {
    const f = ZS.FOOD[it.type];
    it.active = false; it.t = f.respawn;
    s.fat = Math.min(100, s.fat + f.fat);
    if (f.natural) s.stats.natural++; else { s.stats.human++; s.lastHuman = s.time; }
    if (f.syn) s.syn = Math.min(100, s.syn + f.syn);
    if (f.panic) s.panic = Math.min(100, s.panic + f.panic);
    float(it.x, it.y, '+' + f.fat + ' ' + f.label, f.natural ? '#2f7d4f' : '#a3261f');
    if (it.type === 'bin') say(NEWS.binEaten);
    if (it.type === 'hive') say(NEWS.hiveEaten);
    if (s.fat >= 100 && !s.ready) {
      s.ready = true;
      float(s.bear.x, s.bear.y - 34, 'Plné brucho! Choď do brlohu', '#8a6d00');
      say('Medveď je pripravený na zimu. Brloh je vľavo hore.', true);
    }
  };

  ZS.shoot = function (s, shooter, why) {
    if (s.over) return;
    float(shooter.x, shooter.y - 20, 'PRÁSK!', '#d62f27');
    s.lives -= 1;
    if (s.lives <= 0) { endGame(why); return; }
    s.bear.inv = 2.5;
    float(s.bear.x, s.bear.y - 34, 'Tesne vedľa! Zostáva ' + s.lives + ' ❤️', '#d62f27');
    say(shooter.kind === 'poacher' ? 'V lese sa strieľalo. Polícia nič nevie.' : 'Poľovník strieľal na medveďa. Zasiahol hlavne kríky.', true);
  };

  ZS.report = function (s, shooter) {
    ZS.spotted(s, shooter.x, shooter.y, shooter.kind === 'ztmh' ? 'Vidíme ho!' : 'Hlásim medveďa!');
    ZS.addPanic(s, 4, NEWS.hunterSeen);
    ZS.alertShooters(s, s.bear.x, s.bear.y);
  };

  // --- Politics: one-way escalation driven by media panic ------------------------

  function politics() {
    const f = g.flags, w = g.w;
    if (!f.press && g.panic >= 25) { f.press = true; g.shooters.push(ZS.makeShooter(g, 'hunter', { path: w.patrols[2] })); say(NEWS.press, true); }
    if (!f.emergency && g.panic >= 45) { f.emergency = true; g.shooters.push(ZS.makeShooter(g, 'hunter', { path: w.patrols[3] })); say(NEWS.emergency, true); }
    if (!f.drones && g.panic >= 65) { f.drones = true; g.drones.push(ZS.makeDrone(g), ZS.makeDrone(g)); say(NEWS.drones, true); }
    if (!f.cull && g.panic >= 85) { f.cull = true; g.shooters.push(ZS.makeShooter(g, 'hunter', { path: w.patrols[1].slice().reverse() })); say(NEWS.cull, true); }
    if (!g.problem && g.syn >= CFG.PROBLEM) {
      g.problem = true;
      if (!g.shooters.some((s) => s.kind === 'ztmh')) g.shooters.push(ZS.makeShooter(g, 'ztmh', { x: w.village.x, y: w.village.y }));
      say(NEWS.problem, true);
    }
    if (g.problem && g.syn < CFG.CALM) { g.problem = false; say(NEWS.calm); }
  }

  const forestPath = () => [0, 1, 2, 3].map(() => { const p = ZS.forestPoint(g.w); return [p.x, p.y]; });

  const EVENTS = {
    wrongbear() {
      g.panic = Math.max(0, g.panic - 25);
      const a = Math.random() * Math.PI * 2;
      const x = Math.max(40, Math.min(CFG.W - 40, g.bear.x + Math.cos(a) * 260));
      const y = Math.max(40, Math.min(1300, g.bear.y + Math.sin(a) * 260));
      g.decoys.push({ x, y, t: 6 });
      float(x, y - 10, '✝ iná medvedica', '#5a3418');
      say(NEWS.wrongbear, true);
    },
    court() { g.courtUntil = g.time + 20; say(NEWS.court, true); },
    meat() { g.flags.meat = true; say(NEWS.meat, true); },
    feeding() {
      const p = ZS.forestPoint(g.w);
      for (let i = 0; i < 2; i++) g.w.items.push({ type: 'corn', x: p.x + i * 30, y: p.y, active: true, t: 0, locked: false });
      g.shooters.push(ZS.makeShooter(g, 'stand', { x: p.x + 15, y: p.y - 85, ang: Math.PI / 2 }));
      say(NEWS.feeding, true);
    },
    poacher() { g.shooters.push(ZS.makeShooter(g, 'poacher', { path: forestPath(), life: 35 })); say(NEWS.poacher, true); },
    bins() { g.flags.binsLocked = true; g.w.items.forEach((it) => { if (it.type === 'bin') it.locked = true; }); say(NEWS.bins); },
    census() { g.panic = Math.min(100, g.panic + 6); say(NEWS.census); },
    constitution() { g.flags.zoneScale = 1.3; say(NEWS.constitution, true); },
    tourists() { for (let i = 0; i < 3; i++) g.people.push(ZS.makePerson(g, 'tourist')); say(NEWS.tourists, true); },
    mushrooms() { for (let i = 0; i < 4; i++) g.people.push(ZS.makePerson(g, 'picker')); say(NEWS.mushrooms, true); },
  };

  function events(dt) {
    g.nextEvent -= dt;
    if (g.nextEvent > 0) return;
    g.nextEvent = 30 + Math.random() * 12;
    const pool = Object.keys(EVENTS).filter((k) => !g.usedEvents.has(k) && k !== 'tourists' && k !== 'mushrooms'
      && (k !== 'constitution' || g.flags.emergency));
    if (!pool.length) return;
    const k = pool[Math.floor(Math.random() * pool.length)];
    g.usedEvents.add(k);
    EVENTS[k]();
  }

  // --- Update ------------------------------------------------------------------

  function update(dt) {
    g.time += dt;
    const si = CFG.SEASONS.findIndex((s) => g.time < s.end);
    if (si === -1) { say(NEWS.winter, true); endGame(g.ready ? 'win' : 'starve'); return; }
    if (si !== g.seasonIdx) {
      g.seasonIdx = si;
      if (si === 1) { say('Leto: dozreli čučoriedky.'); EVENTS.tourists(); }
      if (si === 2) { say('Jeseň: bukvice, jablká a hubári.'); EVENTS.mushrooms(); }
    }
    if (input.pointer) {
      const cam = ZS.camera(g, vw, vh);
      input.target = { x: input.pointer.x + cam.x, y: input.pointer.y + cam.y };
    } else input.target = null;

    ZS.updateBear(g, dt);
    ZS.updateShooters(g, dt);
    if (g.over) return;
    ZS.updatePeople(g, dt);
    ZS.updateDrones(g, dt);

    if (!g.ready) g.fat = Math.max(0, g.fat - CFG.METABOLISM * dt);
    if (g.time - g.lastHuman > 8) g.syn = Math.max(0, g.syn - CFG.SYN_DECAY * dt);
    g.panic = Math.max(0, g.panic - CFG.PANIC_DECAY * dt);
    politics();
    events(dt);

    for (const it of g.w.items) {
      if (it.active) continue;
      it.t -= dt;
      if (it.t <= 0 && ZS.FOOD[it.type].respawn > 0) it.active = true;
    }
    g.w.items = g.w.items.filter((it) => it.active || ZS.FOOD[it.type].respawn > 0);

    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      g.spawnT = 15;
      if (g.people.filter((p) => p.kind === 'picker').length < 2) g.people.push(ZS.makePerson(g, 'picker'));
    }
    g.floaters.forEach((f) => { f.t -= dt; });
    g.floaters = g.floaters.filter((f) => f.t > 0);
    g.decoys.forEach((d) => { d.t -= dt; });
    g.decoys = g.decoys.filter((d) => d.t > 0);

    if (g.ready && dist(g.bear.x, g.bear.y, g.w.den.x, g.w.den.y) < 42) { endGame('win'); return; }
    tickerUpdate(dt);
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.1; hud(); }
  }

  function hud() {
    $('barFat').querySelector('i').style.width = g.fat + '%';
    $('barSyn').querySelector('i').style.width = g.syn + '%';
    $('barPanic').querySelector('i').style.width = g.panic + '%';
    const left = Math.max(0, CFG.YEAR - g.time);
    $('season').textContent = CFG.SEASONS[g.seasonIdx].name + ' · do zimy ' + Math.ceil(left) + ' s';
    $('lives').textContent = '❤️'.repeat(Math.max(0, g.lives)) + (g.bear.hidden ? ' · za stromom' : '');
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
      <p>Si medveď pri obci Dolný Strach a do zimy potrebuješ nabrať tuk. Jedlo v lese je pomalé, ale bezpečné. Jedlo pri ľuďoch je rýchle, ale urobí z teba „problémového medveďa“.</p>
      <ul>
        <li>Poľovníci a drony ťa nevidia, keď si <b>za stromom</b> alebo pod korunou.</li>
        <li>Kým si plachý, poľovníci ťa smú iba hlásiť. Strieľať môžu, keď si problémový alebo keď politici zmenia pravidlá.</li>
        <li>Každé spozorovanie zvyšuje mediálnu paniku a s ňou prichádza politika.</li>
        <li>S plným bruchom choď do brlohu vľavo hore.</li>
      </ul>
      <p class="keys"><kbd>WASD</kbd> alebo šípky: pohyb · <kbd>Shift</kbd>: plížiť sa · <kbd>P</kbd>: pauza · na mobile drž prst tam, kam chceš ísť</p>
      <div class="row"><button id="btnStart">Hrať</button></div>
      <p class="note">Postavy, obec aj titulky sú vymyslené. Fakty na konci hry sú skutočné a majú zdroj.</p>`);
    $('btnStart').onclick = start;
  }

  function endGame(kind) {
    if (g.over) return;
    g.over = true;
    hud();
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
        <div class="stat"><b>${CFG.SEASONS[g.seasonIdx].name}</b><span>${Math.round(g.fat)} % tuku</span></div>
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
    if (g.running && !g.over && !g.paused) update(dt);
    ZS.render(g, ctx, vw, vh);
    requestAnimationFrame(frame);
  }

  g = createState();
  startScreen();
  requestAnimationFrame(frame);
  ZS.debug = () => g;
  // Runs the simulation without waiting for animation frames (handy in a background tab).
  ZS.debugStep = (seconds) => {
    for (let t = 0; t < seconds && g.running && !g.over; t += 1 / 60) update(1 / 60);
    ZS.render(g, ctx, vw, vh);
    return g;
  };
})();
