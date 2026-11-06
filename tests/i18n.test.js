'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers/load-game');

const OTHERS = ['en', 'de', 'es'];

function differences(ref, other, at, out) {
  if (typeof ref === 'function') {
    if (typeof other !== 'function') out.push(at + ' should be a function');
    else if (other.length !== ref.length) out.push(at + ' takes ' + other.length + ' arguments instead of ' + ref.length);
  } else if (Array.isArray(ref)) {
    if (!Array.isArray(other)) out.push(at + ' should be a list');
    else if (other.length !== ref.length) out.push(at + ' has ' + other.length + ' items instead of ' + ref.length);
    else ref.forEach((r, i) => differences(r, other[i], at + '[' + i + ']', out));
  } else if (ref && typeof ref === 'object') {
    if (!other || typeof other !== 'object' || Array.isArray(other)) { out.push(at + ' should be an object'); return out; }
    for (const k of Object.keys(ref)) if (!(k in other)) out.push(at + '.' + k + ' is missing');
    for (const k of Object.keys(other)) if (!(k in ref)) out.push(at + '.' + k + ' is extra');
    for (const k of Object.keys(ref)) if (k in other) differences(ref[k], other[k], at + '.' + k, out);
  } else if (typeof other !== typeof ref) {
    out.push(at + ' should be a ' + typeof ref);
  } else if (typeof ref === 'string' && ref.trim() && !other.trim()) {
    out.push(at + ' is empty');
  }
  return out;
}

test('the game offers Slovak, English, German and Spanish, with Slovak first', () => {
  const ZS = loadGame({ seed: 1 });
  assert.deepEqual([...ZS.i18n.codes()], ['sk', ...OTHERS]);
  assert.equal(ZS.i18n.lang, 'sk');
  for (const code of ZS.i18n.codes()) assert.ok(ZS.LANG_NAMES[code]);
});

for (const code of OTHERS) {
  test(`${code} has every Slovak text with the same shape`, async (t) => {
    const ZS = loadGame({ seed: 1 });
    const sk = ZS.LANGS.sk, lang = ZS.LANGS[code];

    await t.test('same keys, list lengths and function arguments', () => {
      const out = [];
      for (const table of ZS.i18n.tables) differences(sk[table], lang[table], table, out);
      assert.deepEqual(out, []);
    });

    await t.test('only the tables the language switch uses', () => {
      assert.deepEqual(Object.keys(lang).sort(), [...ZS.i18n.tables].sort());
    });

    await t.test('texts built from values return words', () => {
      const L = lang.LABELS, U = lang.UI, T = lang.LEVEL_TEXT;
      for (const text of [T.summer.blurb, T.winter.blurb, T.chopok.blurb, L.hit(3), L.eaten(4, L.food.berry), U.hugGoal(0), U.hugGoal(1), U.badges.court(4)]) {
        assert.equal(typeof text, 'string');
        assert.ok(text.trim().length > 0);
      }
      assert.match(L.eaten(4, 'x'), /4/);
    });
  });
}

test('switching the language swaps the texts in place and switching back restores Slovak', () => {
  const ZS = loadGame({ seed: 1 });
  const news = ZS.NEWS, labels = ZS.LABELS, headlines = ZS.HEADLINES, slovak = [...ZS.NEWS.hide];
  for (const code of OTHERS) {
    assert.equal(ZS.i18n.set(code), code);
    assert.equal(ZS.NEWS, news);
    assert.equal(ZS.LABELS, labels);
    assert.equal(ZS.HEADLINES, headlines);
    assert.deepEqual([...ZS.NEWS.hide], [...ZS.LANGS[code].NEWS.hide]);
    assert.equal(ZS.UI.title, ZS.LANGS[code].UI.title);
  }
  ZS.i18n.set('sk');
  assert.deepEqual([...ZS.NEWS.hide], slovak);
  assert.equal(ZS.i18n.set('xx'), 'sk');
});

test('a running game switches its signs, filler headlines and food names to the new language', () => {
  const ZS = loadGame({ seed: 4 });
  const g = ZS.sim.rules.create(ZS.ui.input.state, { level: 'summer' });
  const said = [];
  ZS.sim.rules.onNews = (item) => said.push(item.text);
  g.running = true;
  g.nextEvent = 1e9;
  ZS.i18n.set('de');
  const de = ZS.LANGS.de;
  assert.ok(g.level.signs.some((s) => s.text === de.LABELS.signs.hide));
  for (let i = 0; i < 60 * 14; i++) ZS.sim.loop.step(g, 1 / 60);
  const fillers = said.filter((text) => de.HEADLINES.includes(text));
  assert.ok(fillers.length >= 1, said.join(' | '));
  const it = g.level.items.find((x) => x.type === 'berry' && !x.eaten);
  ZS.sim.rules.eat(g, it);
  assert.ok(g.floaters.some((f) => f.text === de.LABELS.eaten(ZS.FOOD.berry.fat, de.LABELS.food.berry)));
  ZS.i18n.set('sk');
  assert.ok(g.level.signs.some((s) => s.text === ZS.LANGS.sk.LABELS.signs.hide));
});

function open({ url = '', saved, meta } = {}) {
  const store = new Map(saved === undefined ? [] : [['zaStromom.lang', saved]]);
  const root = { lang: 'sk' };
  const at = new URL(url, 'https://damikun.github.io/pozor-medved/');
  const ZS = loadGame({
    seed: 1,
    location: { search: at.search, hash: at.hash },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    document: {
      documentElement: root,
      querySelector: (sel) => (meta !== undefined && sel === 'meta[name="default-language"]' ? { getAttribute: () => meta } : null),
    },
  });
  return { ZS, root, store, shown: () => [ZS.i18n.lang, root.lang, ZS.UI.title === ZS.LANGS[ZS.i18n.lang].UI.title] };
}

test('the published page names Slovak as its default language', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<meta name="default-language" content="sk">/);
  assert.match(html, /<html lang="sk">/);
});

test('the start language comes from the link, then the saved choice, then the page default, then Slovak', () => {
  assert.deepEqual(open().shown(), ['sk', 'sk', true]);
  assert.deepEqual(open({ meta: 'en' }).shown(), ['en', 'en', true]);
  assert.deepEqual(open({ meta: 'en', saved: 'de' }).shown(), ['de', 'de', true]);
  assert.deepEqual(open({ meta: 'en', saved: 'de', url: '?lang=es' }).shown(), ['es', 'es', true]);
  assert.deepEqual(open({ meta: 'de', url: '?lang=sk' }).shown(), ['sk', 'sk', true]);
  assert.deepEqual(open({ meta: 'de', saved: 'sk' }).shown(), ['sk', 'sk', true]);
  assert.deepEqual(open({ url: '?bot&lang=EN' }).shown(), ['en', 'en', true]);
  assert.deepEqual(open({ url: '#lang=de' }).shown(), ['de', 'de', true]);
});

test('unknown languages are skipped at every step', () => {
  assert.deepEqual(open({ meta: 'xx' }).shown(), ['sk', 'sk', true]);
  assert.deepEqual(open({ meta: '' }).shown(), ['sk', 'sk', true]);
  assert.deepEqual(open({ meta: 'es', saved: 'zz' }).shown(), ['es', 'es', true]);
  assert.deepEqual(open({ meta: 'es', saved: 'de', url: '?lang=xx' }).shown(), ['de', 'de', true]);
  assert.deepEqual(open({ meta: 'es', url: '?lang=english' }).shown(), ['es', 'es', true]);
  assert.deepEqual(open({ meta: 'constructor', saved: 'toString' }).shown(), ['sk', 'sk', true]);
});

test('a language from the link is not saved, a language picked in the menu is', () => {
  const { ZS, store } = open({ saved: 'de', url: '?lang=en' });
  assert.equal(store.get('zaStromom.lang'), 'de');
  ZS.i18n.set('es', true);
  assert.equal(store.get('zaStromom.lang'), 'es');
  assert.equal(open({ url: '?lang=en' }).store.size, 0);
});
