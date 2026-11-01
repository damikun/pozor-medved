// The start, pause and end screens shown over the game.
(function () {
  const { CFG, UI } = ZS;
  const $ = (id) => document.getElementById(id);

  function show(html) { $('screenCard').innerHTML = html; $('screen').hidden = false; }
  function hide() { $('screen').hidden = true; }

  function showStart(onPlay) {
    show(`<h1>${UI.title}</h1>
      <p class="sub">${UI.subtitle}</p>
      <p>${UI.intro}</p>
      <ul>${UI.rules.map((r) => `<li>${r}</li>`).join('')}</ul>
      <p class="keys">${UI.keys}</p>
      <div class="row"><button id="btnStart">${UI.play}</button><a class="alt" href="archive/v1-zhora/">${UI.legacyLink}</a></div>
      <p class="note">${UI.disclaimer}</p>`);
    $('btnStart').onclick = onPlay;
  }

  function showPause(onResume) {
    show(`<h2>${UI.pauseTitle}</h2><p>${UI.pauseText}</p><div class="row"><button id="btnResume">${UI.resume}</button></div>`);
    $('btnResume').onclick = onResume;
  }

  /** The end screen: the ending, the run's numbers and three real facts with their sources. */
  function showEnd(g, onAgain) {
    const kind = g.ending, e = ZS.ENDINGS[kind];
    let text = e.text, facts = e.facts.slice();
    if (g.flags.meat && kind !== 'win' && kind !== 'starve') {
      text += UI.goulash;
      facts = ['meat'].concat(facts.slice(0, 2));
    }
    const list = facts.map((id) => {
      const f = ZS.FACTS[id];
      return `<li>${f.text} <a href="${f.url}" target="_blank" rel="noopener">${f.src}</a></li>`;
    }).join('');
    const S = UI.stats;
    show(`<h2>${e.title}</h2>
      <p>${text}</p>
      <div class="stats">
        <div class="stat"><b>${g.stats.natural}</b><span>${S.natural}</span></div>
        <div class="stat"><b>${g.stats.human}</b><span>${S.human}</span></div>
        <div class="stat"><b>${g.stats.seen}</b><span>${S.seen}</span></div>
        <div class="stat"><b>${Math.round(g.fat)} %</b><span>${S.fat} · ${CFG.SEASONS[g.seasonIdx].name.toLowerCase()}</span></div>
      </div>
      <div class="facts"><h3>${UI.factsTitle}</h3><ul>${list}</ul></div>
      <div class="row"><button id="btnAgain">${UI.again}</button></div>`);
    $('btnAgain').onclick = onAgain;
  }

  ZS.ui = ZS.ui || {};
  ZS.ui.screens = { showStart, showPause, showEnd, hide };
})();
