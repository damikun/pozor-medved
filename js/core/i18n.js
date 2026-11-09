(function () {
  const ZS = window.ZS;
  const TABLES = ['HEADLINES', 'WINTER_HEADLINES', 'CHOPOK_HEADLINES', 'CAPITAL_HEADLINES', 'LEVEL_TEXT', 'QUIPS', 'NEWS', 'LABELS', 'UI', 'ENDINGS'];
  const CODES = ['sk', 'en', 'de', 'es'];
  const KEY = 'zaStromom.lang';
  const LANGS = (ZS.LANGS = ZS.LANGS || {});
  const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const copy = (v) => (Array.isArray(v) ? v.map(copy) : plain(v) ? Object.fromEntries(Object.keys(v).map((k) => [k, copy(v[k])])) : v);

  LANGS.sk = Object.fromEntries(TABLES.map((t) => [t, copy(ZS[t])]));

  function fill(live, src) {
    if (Array.isArray(live)) { live.splice(0, live.length, ...src.map(copy)); return; }
    for (const k of Object.keys(src)) {
      if ((plain(src[k]) && plain(live[k])) || (Array.isArray(src[k]) && Array.isArray(live[k]))) fill(live[k], src[k]);
      else live[k] = copy(src[k]);
    }
  }

  function attempt(read) {
    try {
      return read();
    } catch (e) {
      return null;
    }
  }

  function wanted() {
    const asked = [
      attempt(() => {
        const at = window.location;
        const q = /[?&#]lang=([a-z]{2})\b/i.exec((at.search || '') + (at.hash || ''));
        return q && q[1];
      }),
      attempt(() => window.localStorage.getItem(KEY)),
      attempt(() => window.document.querySelector('meta[name="default-language"]').getAttribute('content')),
    ];
    return asked.map((c) => String(c || '').trim().toLowerCase()).find((c) => CODES.includes(c) && LANGS[c]) || 'sk';
  }

  function keep(lang) {
    try {
      window.localStorage.setItem(KEY, lang);
      return true;
    } catch (e) {
      return false;
    }
  }

  const i18n = {
    tables: TABLES,
    lang: 'sk',
    codes: () => CODES.filter((c) => LANGS[c]),
    set(code, remember) {
      const lang = LANGS[code] ? code : 'sk';
      for (const t of TABLES) {
        fill(ZS[t], LANGS.sk[t]);
        if (lang !== 'sk') fill(ZS[t], LANGS[lang][t]);
      }
      i18n.lang = lang;
      if (remember) keep(lang);
      const root = window.document && window.document.documentElement;
      if (root) root.lang = lang;
      const link = window.document && window.document.querySelector && window.document.querySelector('link[rel="canonical"]');
      if (link) link.href = link.href.split('?')[0] + (lang === 'sk' ? '' : '?lang=' + lang);
      if (window.document && ZS.UI.title) window.document.title = ZS.UI.title + ' – ' + ZS.UI.subtitle.split(' · ').pop();
      return lang;
    },
  };

  ZS.i18n = i18n;
  i18n.set(wanted(), false);
})();
