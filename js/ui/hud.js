(function () {
  const { UI } = ZS;
  const $ = (id) => document.getElementById(id);
  const NEWS_HOLD = 2;
  let badgeHtml = '', levelId = null, reachOn = null, icons = null;
  const tv = { hold: 0, next: null };

  const TOUCH = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'hide', ArrowUp: 'jump', KeyC: 'hug', KeyX: 'bite' };

  function bar(id, value) { $(id).querySelector('i').style.width = value + '%'; }

  function relabel() {
    const B = UI.bars;
    $('barFat').querySelector('span').textContent = B.fat;
    $('barSyn').querySelector('span').textContent = B.syn;
    $('barPanic').querySelector('span').textContent = B.panic;
    document.querySelectorAll('#touch [data-key]').forEach((btn) => btn.setAttribute('aria-label', UI.touch[TOUCH[btn.dataset.key]]));
    levelId = null;
  }

  function showPlaying(g) {
    $('hud').hidden = false;
    $('ticker').hidden = false;
    resetNews();
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
    $('lives').textContent = '❤️'.repeat(Math.max(0, g.lives)) + ' · ' + UI.hugGoal(g.stats.hugs + g.stats.selfies)
      + (b.hiding ? ' · ' + UI.behindTree : b.inSpray ? ' · ' + UI.inSpray : '');
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

  function iconOf(text) {
    if (!icons) {
      icons = new Map();
      const walk = (v, key) => {
        if (typeof v === 'string') icons.set(v, key);
        else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, key));
      };
      Object.keys(ZS.NEWS).forEach((k) => walk(ZS.NEWS[k], k));
    }
    if (text === UI.tv.slogan) return ZS.NEWS_ICON.tv;
    return ZS.NEWS_ICON[icons.get(text)] || ZS.NEWS_ICON.headline;
  }

  function fill(el, text) {
    const i = document.createElement('i');
    i.textContent = iconOf(text);
    el.replaceChildren(i, text);
    return el;
  }

  function resetNews() {
    icons = null;
    $('tvChannel').textContent = UI.tv.channel;
    $('tvNum').textContent = UI.tv.num;
    tv.next = null;
    put({ text: UI.tv.slogan, hot: false });
  }

  function put(item) {
    $('tvFlag').textContent = item.hot ? UI.tv.breaking : UI.tv.live;
    $('ticker').classList.toggle('hot', !!item.hot);
    $('tvText').replaceChildren(fill(document.createElement('p'), item.text));
    tv.hold = NEWS_HOLD;
  }

  function showNews(item) {
    if (tv.hold <= 0) { put(item); return; }
    if (!tv.next || item.hot || !tv.next.hot) tv.next = item;
  }

  function tick(dt) {
    if (tv.hold <= 0 || (tv.hold -= dt) > 0 || !tv.next) return;
    const item = tv.next;
    tv.next = null;
    put(item);
  }

  ZS.ui = ZS.ui || {};
  relabel();
  ZS.ui.hud = { showPlaying, hidePlaying, setTouch, update, showNews, tick, relabel, resetNews };
})();
