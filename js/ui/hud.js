// The HUD over the canvas: meters, season and lives, political badges, the news ticker and touch buttons.
(function () {
  const { CFG, UI } = ZS;
  const $ = (id) => document.getElementById(id);
  let badgeHtml = '';

  function bar(id, value) { $(id).querySelector('i').style.width = value + '%'; }

  /** Shows the HUD and ticker for a new run; touch buttons only on touch screens. */
  function showPlaying() {
    $('hud').hidden = false;
    $('ticker').hidden = false;
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }

  function setTouch(visible) { $('touch').hidden = !visible; }

  function update(g) {
    bar('barFat', g.fat);
    bar('barSyn', g.syn);
    bar('barPanic', g.panic);
    bar('barTrip', Math.min(100, (g.bear.x / g.level.winterDen) * 100));
    $('season').textContent = CFG.SEASONS[g.seasonIdx].name + ' · ' + UI.untilWinter + ' ' + Math.ceil(Math.max(0, CFG.YEAR - g.time)) + ' s';
    $('lives').textContent = '❤️'.repeat(Math.max(0, g.lives)) + (g.bear.hiding ? ' · ' + UI.behindTree : '');
    const B = UI.badges, b = [];
    if (g.problem) b.push(badge(B.problem));
    if (g.flags.cull) b.push(badge(B.cull));
    if (g.flags.emergency) b.push(badge(B.emergency));
    if (g.flags.drones) b.push(badge(B.drones));
    if (g.time < g.courtUntil) b.push(badge(B.court(Math.ceil(g.courtUntil - g.time)), 'calm'));
    if (g.flags.meat) b.push(badge(B.meat, 'dark'));
    if (g.flags.binsLocked) b.push(badge(B.binsLocked, 'calm'));
    const html = b.join('');
    if (html !== badgeHtml) { badgeHtml = html; $('badges').innerHTML = html; }
  }

  function badge(text, variant) {
    return '<span class="badge' + (variant ? ' ' + variant : '') + '">' + text + '</span>';
  }

  /** Cross-fades the ticker to the next line; hot lines are highlighted. */
  function showNews(item) {
    const el = $('tickerText');
    el.classList.add('fade');
    setTimeout(() => { el.textContent = item.text; el.classList.toggle('hot', item.hot); el.classList.remove('fade'); }, 250);
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.hud = { showPlaying, setTouch, update, showNews };
})();
