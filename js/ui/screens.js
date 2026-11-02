(function () {
  const { UI } = ZS;
  const $ = (id) => document.getElementById(id);
  const ORDER = ['summer', 'winter'];
  const GITHUB = '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

  const tips = () => ZS.ui.tips;

  function show(html, kind) {
    tips().stop();
    const card = $('screenCard');
    card.className = 'card' + (kind ? ' ' + kind : '');
    card.removeAttribute('aria-busy');
    $('screen').classList.toggle('with-corner', kind === 'start');
    card.innerHTML = html;
    $('screen').hidden = false;
    $('screen').scrollTop = 0;
    $('corner').hidden = true;
  }
  function hide() { tips().stop(); $('screen').hidden = true; $('corner').hidden = true; }

  function levelCard(id, i, done) {
    const T = ZS.LEVEL_TEXT[id];
    const tag = done[id] ? `<span class="tag done">${UI.levelDone}</span>` : id === 'winter' ? `<span class="tag">${UI.levelNew}</span>` : '';
    return `<button class="level ${id}" data-level="${id}">
      <span class="num">${i + 1}</span>
      <span class="body"><b>${T.name}</b>${tag}<small>${T.pick(ZS.LEVELS[id].fatGoal)}</small></span>
    </button>`;
  }

  function howTo(touch) {
    const T = touch ? UI.tipsTouch : UI.tips;
    const chips = ZS.howto.ids.map((id) => `<button type="button" class="chip" data-demo="${id}"><span class="k"></span><span class="t">${T[id]}</span></button>`).join('');
    return `<div class="stage"><canvas aria-hidden="true"></canvas><span class="hud"></span><div class="cue"></div></div><div class="chips">${chips}</div>`;
  }

  function langPicker() {
    const codes = ZS.i18n.codes();
    if (codes.length < 2) return '';
    const options = codes.map((c) => `<option value="${c}"${c === ZS.i18n.lang ? ' selected' : ''}>${ZS.LANG_NAMES[c]}</option>`).join('');
    return `<label class="lang"><span aria-hidden="true">🌐</span><select id="langSel" aria-label="${UI.language}">${options}</select></label>`;
  }

  function muteButton(cls) {
    return `<button class="${cls}" data-mute aria-pressed="false"></button>`;
  }

  function syncMute() {
    const off = !!(ZS.audio && ZS.audio.muted), S = UI.sound;
    document.querySelectorAll('[data-mute]').forEach((btn) => {
      const label = off ? S.unmute : S.mute;
      btn.textContent = off ? '🔇' : '🔊';
      btn.title = label + ' (M)';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-pressed', String(off));
      btn.onclick = () => { if (ZS.audio) ZS.audio.toggle(); };
    });
  }

  function corner(onLang) {
    const box = $('corner'), codes = ZS.i18n.codes();
    const langs = codes.map((c) => `<button data-lang="${c}"${c === ZS.i18n.lang ? ' class="on"' : ''}>${ZS.LANG_NAMES[c]}</button>`).join('');
    box.innerHTML = `<a class="round" href="${ZS.REPO_URL}" target="_blank" rel="noopener" title="${UI.about}" aria-label="${UI.about}">${GITHUB}</a>`
      + muteButton('round')
      + `<button class="round" id="btnSettings" title="${UI.language}" aria-label="${UI.language}" aria-expanded="false">⚙️</button>`
      + `<div class="menu" id="cornerMenu" hidden>${langs}<a href="${ZS.REPO_URL}" target="_blank" rel="noopener">${UI.about}</a></div>`;
    box.hidden = false;
    syncMute();
    const gear = $('btnSettings'), menu = $('cornerMenu');
    gear.onclick = () => {
      menu.hidden = !menu.hidden;
      gear.setAttribute('aria-expanded', String(!menu.hidden));
    };
    menu.querySelectorAll('[data-lang]').forEach((btn) => { btn.onclick = () => onLang(btn.dataset.lang); });
  }

  function showStart(done, onPlay, onPreview, touch, onLang) {
    show(`<div class="head"><h1>${UI.title}</h1><p class="sub">${UI.subtitle}</p>${langPicker()}</div>
      <p class="lead">${UI.lead}</p>
      <h3 class="pick">${UI.chooseLevel}</h3>
      <div class="levels">${ORDER.map((id, i) => levelCard(id, i, done)).join('')}</div>
      <h3 class="pick">${UI.howTo}</h3>
      <div class="howto">${howTo(touch)}</div>`, 'start');
    $('screenCard').querySelectorAll('[data-level]').forEach((btn) => {
      btn.onclick = () => onPlay(btn.dataset.level);
      btn.onmouseenter = btn.onfocus = () => onPreview(btn.dataset.level);
    });
    const sel = $('langSel');
    if (sel) sel.onchange = () => onLang(sel.value);
    corner(onLang);
    tips().mount($('screenCard').querySelector('.howto'), touch);
  }

  function showPause(onResume, onMenu) {
    show(`<h2>${UI.pauseTitle}</h2><p>${UI.pauseText}</p>
      <div class="row"><button id="btnResume">${UI.resume}</button><button id="btnMenu" class="ghost">${UI.menu}</button>${muteButton('ghost mute')}</div>`, 'pause');
    syncMute();
    $('btnResume').onclick = onResume;
    $('btnMenu').onclick = onMenu;
  }

  function ending(g) {
    const own = ZS.ENDINGS[g.level.id];
    return (own && own[g.ending]) || ZS.ENDINGS[g.ending];
  }

  function showEnd(g, { onAgain, onNext, onMenu, onRetry, retryKey }) {
    const e = ending(g), kind = g.ending, T = ZS.LEVEL_TEXT[g.level.id];
    let text = e.text;
    if (g.flags.meat && kind !== 'win' && kind !== 'starve') text += UI.goulash;
    if (kind === 'win' && g.level.id === 'summer') text += ' ' + UI.winterTeaser;
    const S = UI.stats, st = g.stats;
    const extra = [['hugs', st.hugs], ['selfies', st.selfies], ['bites', st.bites], ['stomps', st.stomps]].filter(([, n]) => n > 0)
      .map(([k, n]) => `<div class="stat"><b>${n}</b><span>${S[k]}</span></div>`).join('');
    const next = kind === 'win' && g.level.id === 'summer';
    const G = UI.goals, hugs = st.hugs + st.selfies, goal = g.def.fatGoal;
    const goals = `<p class="goals">${G.fat} ${Math.floor(g.fat)}\u00a0/ ${UI.pct(goal)} ${g.fat >= goal ? G.ok : G.no} · ${G.hug} ${Math.min(1, hugs)}\u00a0/ 1 ${hugs > 0 ? G.ok : G.no} · ${G.den} ${kind === 'win' ? G.ok : G.no}</p>`;
    show(`<h2>${e.title}</h2>
      <p>${text}</p>
      ${goals}
      <div class="stats">
        <div class="stat"><b>${st.natural}</b><span>${S.natural}</span></div>
        <div class="stat"><b>${st.human}</b><span>${S.human}</span></div>
        <div class="stat"><b>${st.seen}</b><span>${S.seen}</span></div>
        <div class="stat"><b>${UI.pct(Math.floor(g.fat))}</b><span>${S.fat(T.seasons[g.seasonKey])}</span></div>
        ${extra}
      </div>
      <div class="row">
        ${next ? `<button id="btnNext">${UI.next}</button><button id="btnAgain" class="ghost">${UI.again}</button>`
          : onRetry ? `<button id="btnRetry">${(UI.retryAt && UI.retryAt[retryKey]) || UI.retryLift}</button><button id="btnAgain" class="ghost">${UI.again}</button>` : `<button id="btnAgain">${UI.again}</button>`}
        <button id="btnMenu" class="ghost">${UI.menu}</button>
      </div>`);
    $('btnAgain').onclick = onAgain;
    $('btnMenu').onclick = onMenu;
    if (next) $('btnNext').onclick = onNext;
    else if (onRetry) $('btnRetry').onclick = onRetry;
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.screens = { showStart, showPause, showEnd, hide, syncMute };
})();
