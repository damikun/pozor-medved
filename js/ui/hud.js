(function () {
  const { UI } = ZS;
  const $ = (id) => document.getElementById(id);
  let badgeHtml = '', levelId = null, reachOn = null;

  function bar(id, value) { $(id).querySelector('i').style.width = value + '%'; }

  function showPlaying(g) {
    $('hud').hidden = false;
    $('ticker').hidden = false;
    $('tickerText').textContent = '';
    setTouch(window.matchMedia('(pointer: coarse)').matches);
    setLevel(g);
  }

  function setLevel(g) {
    if (!g || levelId === g.level.id) return;
    levelId = g.level.id;
    $('barTrip').querySelector('span').textContent = ZS.LEVEL_TEXT[levelId].trip;
    $('barFat').querySelector('em').style.left = g.def.fatGoal + '%';
  }

  function hidePlaying() {
    $('hud').hidden = true;
    $('ticker').hidden = true;
    setTouch(false);
  }

  function setTouch(visible) { $('touch').hidden = !visible; }

  function update(g) {
    setLevel(g);
    const T = ZS.LEVEL_TEXT[g.level.id], b = g.bear;
    bar('barFat', g.fat);
    bar('barSyn', g.syn);
    bar('barPanic', g.panic);
    bar('barTrip', Math.min(100, (b.x / g.level.goalDen) * 100));
    $('season').textContent = T.seasons[g.seasonKey] + ' · ' + T.until + ' ' + Math.ceil(Math.max(0, g.def.year - g.time)) + ' s';
    $('lives').textContent = '❤️'.repeat(Math.max(0, g.lives)) + (b.hiding ? ' · ' + UI.behindTree : b.inSpray ? ' · ' + UI.inSpray : '');
    const B = UI.badges, list = [];
    if (g.problem) list.push(badge(B.problem));
    if (g.flags.cull) list.push(badge(B.cull));
    if (g.flags.emergency) list.push(badge(B.emergency));
    if (g.flags.drones) list.push(badge(B.drones));
    if (g.time < g.courtUntil) list.push(badge(B.court(Math.ceil(g.courtUntil - g.time)), 'calm'));
    if (g.time < g.viralUntil) list.push(badge(B.viral, 'love'));
    if (g.flags.hugBan) list.push(badge(B.hugBan, 'dark'));
    if (g.flags.decree) list.push(badge(B.decree, 'dark'));
    if (g.flags.meat) list.push(badge(B.meat, 'dark'));
    if (g.flags.binsLocked) list.push(badge(B.binsLocked, 'calm'));
    if (g.flags.stallsLocked) list.push(badge(B.stallsLocked, 'calm'));
    const html = list.join('');
    if (html !== badgeHtml) { badgeHtml = html; $('badges').innerHTML = html; }
    const reach = !!b.reach && !g.over;
    if (reach !== reachOn) { reachOn = reach; $('act').classList.toggle('on', reach); }
  }

  function badge(text, variant) {
    return '<span class="badge' + (variant ? ' ' + variant : '') + '">' + text + '</span>';
  }

  function showNews(item) {
    const el = $('tickerText');
    el.classList.add('fade');
    setTimeout(() => { el.textContent = item.text; el.classList.toggle('hot', item.hot); el.classList.remove('fade'); }, 250);
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.hud = { showPlaying, hidePlaying, setTouch, update, showNews };
})();
