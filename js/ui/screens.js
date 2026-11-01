(function () {
  const { UI } = ZS;
  const $ = (id) => document.getElementById(id);
  const ORDER = ['summer', 'winter'];

  function show(html, kind) {
    const card = $('screenCard');
    card.className = 'card' + (kind ? ' ' + kind : '');
    card.innerHTML = html;
    $('screen').hidden = false;
    $('screen').scrollTop = 0;
  }
  function hide() { $('screen').hidden = true; }

  function levelCard(id, i, done) {
    const T = ZS.LEVEL_TEXT[id];
    const tag = done[id] ? `<span class="tag done">${UI.levelDone}</span>` : id === 'winter' ? `<span class="tag">${UI.levelNew}</span>` : '';
    return `<button class="level ${id}" data-level="${id}">
      <span class="num">${i + 1}</span>
      <span class="body"><b>${T.name}</b>${tag}<small>${T.pick(ZS.LEVELS[id].fatGoal)}</small></span>
    </button>`;
  }

  function showStart(done, onPlay, onPreview, touch) {
    show(`<div class="head"><h1>${UI.title}</h1><p class="sub">${UI.subtitle}</p></div>
      <p class="lead">${UI.lead}</p>
      <h3 class="pick">${UI.chooseLevel}</h3>
      <div class="levels">${ORDER.map((id, i) => levelCard(id, i, done)).join('')}</div>
      <h3 class="pick">${UI.howTo}</h3>
      <div class="tips">${(touch ? UI.tipsTouch : UI.tips).map(([k, t]) => `<div class="tip"><span class="ico">${k}</span><span class="txt">${t}</span></div>`).join('')}</div>
      <p class="note">${UI.disclaimer}</p>`, 'start');
    $('screenCard').querySelectorAll('[data-level]').forEach((btn) => {
      btn.onclick = () => onPlay(btn.dataset.level);
      btn.onmouseenter = btn.onfocus = () => onPreview(btn.dataset.level);
    });
  }

  function showPause(onResume, onMenu) {
    show(`<h2>${UI.pauseTitle}</h2><p>${UI.pauseText}</p>
      <div class="row"><button id="btnResume">${UI.resume}</button><button id="btnMenu" class="ghost">${UI.menu}</button></div>`, 'pause');
    $('btnResume').onclick = onResume;
    $('btnMenu').onclick = onMenu;
  }

  function ending(g) {
    const own = ZS.ENDINGS[g.level.id];
    return (own && own[g.ending]) || ZS.ENDINGS[g.ending];
  }

  function showEnd(g, { onAgain, onNext, onMenu }) {
    const e = ending(g), kind = g.ending, T = ZS.LEVEL_TEXT[g.level.id];
    let text = e.text, facts = e.facts.slice();
    if (g.flags.meat && kind !== 'win' && kind !== 'starve') {
      text += UI.goulash;
      facts = ['meat'].concat(facts.slice(0, 2));
    }
    if (kind === 'win' && g.level.id === 'summer') text += ' ' + UI.winterTeaser;
    const list = facts.map((id) => {
      const f = ZS.FACTS[id];
      return `<li>${f.text} <a href="${f.url}" target="_blank" rel="noopener">${f.src}</a></li>`;
    }).join('');
    const S = UI.stats, st = g.stats;
    const extra = [['hugs', st.hugs], ['selfies', st.selfies], ['bites', st.bites], ['stomps', st.stomps]].filter(([, n]) => n > 0)
      .map(([k, n]) => `<div class="stat"><b>${n}</b><span>${S[k]}</span></div>`).join('');
    const next = kind === 'win' && g.level.id === 'summer';
    show(`<h2>${e.title}</h2>
      <p>${text}</p>
      <div class="stats">
        <div class="stat"><b>${st.natural}</b><span>${S.natural}</span></div>
        <div class="stat"><b>${st.human}</b><span>${S.human}</span></div>
        <div class="stat"><b>${st.seen}</b><span>${S.seen}</span></div>
        <div class="stat"><b>${Math.round(g.fat)} %</b><span>${S.fat} · ${T.seasons[g.seasonKey].toLowerCase()}</span></div>
        ${extra}
      </div>
      <div class="facts"><h3>${UI.factsTitle}</h3><ul>${list}</ul></div>
      <div class="row">
        ${next ? `<button id="btnNext">${UI.next}</button><button id="btnAgain" class="ghost">${UI.again}</button>` : `<button id="btnAgain">${UI.again}</button>`}
        <button id="btnMenu" class="ghost">${UI.menu}</button>
      </div>`);
    $('btnAgain').onclick = onAgain;
    $('btnMenu').onclick = onMenu;
    if (next) $('btnNext').onclick = onNext;
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.screens = { showStart, showPause, showEnd, hide };
})();
