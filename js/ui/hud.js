(function () {
  const { UI } = ZS;
  const $ = (id) => document.getElementById(id);
  const NEWS_HOLD = 2;
  let levelId = null, reachOn = null, biteOn = null, actOn = null, icons = null, rideOn = null;
  const tv = { hold: 0, next: null }, shown = {};
  const JUST = 1.6;
  const TALLY = { hunters: '🎩', stands: '🪜', trees: '🌲', photos: '📸' };
  let tally = {};

  const TOUCH = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'hide', ArrowUp: 'jump', KeyC: 'hug', KeyX: 'bite', KeyP: 'pause' };
  const HOLD_KEY = { hide: 'ArrowDown', hidden: 'ArrowDown', down: 'ArrowDown', climb: 'ArrowUp' };
  const LOOK = { hide: 'Hide', hidden: 'Hide', down: 'Ladder', climb: 'Ladder' };

  function bar(id, value) { const v = value + '%'; if (shown[id] !== v) { shown[id] = v; $(id).querySelector('i').style.width = v; } }

  function relabel() {
    const B = UI.bars;
    $('barFat').querySelector('span').textContent = B.fat;
    $('barSyn').querySelector('span').textContent = B.syn;
    $('barPanic').querySelector('span').textContent = B.panic;
    document.querySelectorAll('#touch [data-key]').forEach((el) => {
      el.innerHTML = ZS.icon(el.dataset.look || el.dataset.key) + (el.id === 'act' ? '<span></span>' : '');
      el.setAttribute('aria-label', UI.touch[TOUCH[el.dataset.key]]);
    });
    actOn = null;
    trayRow();
    levelId = null;
  }

  function showPlaying(g) {
    $('hud').hidden = false;
    $('ticker').hidden = false;
    resetNews();
    trayRow();
    shown.lives = null; shown.livesN = undefined;
    setTouch(!!g.touch);
    setLevel(g);
  }

  function setLevel(g) {
    if (!g || levelId === g.level.id) return;
    levelId = g.level.id;
    $('barTrip').querySelector('span').textContent = ZS.LEVEL_TEXT[levelId].trip;
    $('barFat').querySelector('em').style.left = g.def.fatGoal + '%';
    $('tray').querySelector('[data-tally="photos"]').hidden = !g.level.photographer;
  }

  function hidePlaying() {
    rideOn = null;
    $('touch').classList.remove('ride');
    $('hud').classList.remove('ride');
    $('hud').hidden = true;
    $('ticker').hidden = true;
    setTouch(false);
  }

  function setTouch(visible) {
    $('touch').hidden = !visible;
    $('hud').classList.toggle('touch', visible);
  }

  function update(g) {
    setLevel(g);
    const b = g.bear;
    bar('barFat', g.fat);
    bar('barSyn', g.syn);
    bar('barPanic', g.panic);
    bar('barTrip', Math.min(100, (b.x / g.level.goalDen) * 100));
    hearts(g);
    counts(g);
    const free = !g.over && !g.ride, kind = free ? actOf(g, b) : null, reach = !!kind, bite = free && !!b.reach && !b.reach.post;
    if (reach !== reachOn) { reachOn = reach; $('act').classList.toggle('on', reach); if (!reach) $('act').setAttribute('aria-label', UI.touch.hug); }
    if (kind && kind !== actOn) { actOn = kind; dress(kind); }
    if (bite !== biteOn) { biteOn = bite; $('bite').classList.toggle('on', bite); }
    const ride = !!g.ride && !g.over;
    if (ride !== rideOn) { rideOn = ride; $('touch').classList.toggle('ride', ride); $('hud').classList.toggle('ride', ride); }
  }

  function dress(kind) {
    const el = $('act'), key = HOLD_KEY[kind] || 'KeyC', look = LOOK[kind] || 'KeyC';
    if (el.dataset.look !== look) { el.dataset.look = look; el.innerHTML = ZS.icon(look) + '<span></span>'; }
    el.dataset.key = key;
    el.querySelector('span').textContent = UI.touch.acts[kind];
    el.setAttribute('aria-label', UI.touch.acts[kind]);
  }

  function actOf(g, b) {
    const o = b.reach, k = b.knock, c = b.climbing;
    if (b.hiding) return 'hidden';
    if (c) return c.ladder && c.phase === 'seat' ? 'down' : null;
    if (o) return o.post ? 'shake' : o.kind === 'photographer' ? 'pose' : o.kind === 'tourist' || (o.kind === 'tycoon' && !o.promo) ? 'selfie' : 'hug';
    if (k && k.kind !== 'stall') return 'knock';
    if (k) {
      const it = g.level.items.find((i) => i.type === k.o.kind && Math.abs(i.x - k.o.x) < 1);
      return it && !it.locked ? 'taste' : 'knock';
    }
    if (b.ladderNear) return 'climb';
    return b.spot ? 'hide' : null;
  }

  function trayRow() {
    $('tray').innerHTML = Object.keys(TALLY).map((k) => `<span class="chip" data-tally="${k}" title="${UI.tally[k]}"><i>${TALLY[k]}</i><b>0</b></span>`).join('');
    tally = {};
    levelId = null;
  }

  function hearts(g) {
    const b = g.bear, n = Math.max(0, g.lives), total = Math.max(ZS.CFG.LIVES, n);
    const state = b.hiding ? (b.hiding.hay ? UI.inHay : UI.behindTree) : b.inSpray ? UI.inSpray : '';
    const key = n + '/' + total + '/' + state;
    if (shown.lives === key) return;
    const was = shown.livesN;
    shown.lives = key; shown.livesN = n;
    $('lives').innerHTML = (state ? `<b>${state}</b>` : '')
      + Array.from({ length: total }, (_, i) => `<i${i < n ? ' class="on"' : was !== undefined && i < was ? ' class="lost"' : ''}>❤️</i>`).join('');
  }

  function counts(g) {
    const now = ZS.tally.counts(g);
    for (const k of Object.keys(TALLY)) {
      const n = now[k] || 0;
      if (tally[k] === n) continue;
      const el = $('tray').querySelector(`[data-tally="${k}"]`);
      el.querySelector('b').textContent = n;
      if (tally[k] !== undefined && n > tally[k]) { el.classList.add('up'); setTimeout(() => el.classList.remove('up'), JUST * 1000); }
      tally[k] = n;
    }
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
    if (item.hot && ZS.audio) ZS.audio.news();
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
