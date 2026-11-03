'use strict';
const { createCanvas } = require('./mock-canvas');

function makeElement(tag, problems, all) {
  const listeners = {};
  const classes = new Set();
  const attrs = {};
  const found = new Map();
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    hidden: false,
    style: {},
    dataset: {},
    textContent: '',
    innerHTML: '',
    title: '',
    children: [],
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, on) => { const v = on === undefined ? !classes.has(c) : !!on; if (v) classes.add(c); else classes.delete(c); return v; },
      contains: (c) => classes.has(c),
    },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener: (type, fn) => { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    dispatch: (type, event = {}) => (listeners[type] || []).forEach((fn) => fn(Object.assign({ type, target: el, preventDefault() {}, stopPropagation() {} }, event))),
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    removeAttribute: (k) => { delete attrs[k]; },
    hasAttribute: (k) => k in attrs,
    querySelector: (sel) => found.get(sel) || found.set(sel, makeElement('div', problems, all)).get(sel),
    querySelectorAll: () => [],
    appendChild: (c) => { el.children.push(c); return c; },
    append: (...c) => { el.children.push(...c); },
    replaceChildren: (...c) => { el.children = c; },
    remove() {},
    focus() {},
    blur() {},
    click: () => { if (el.onclick) el.onclick({ preventDefault() {} }); el.dispatch('click'); },
    contains: () => false,
    closest: () => null,
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 }),
  };
  if (el.tagName === 'CANVAS') {
    const canvas = createCanvas(16, 16, problems);
    el.getContext = () => canvas.getContext('2d');
    Object.defineProperty(el, 'width', { get: () => canvas.width, set: (v) => { canvas.width = v; } });
    Object.defineProperty(el, 'height', { get: () => canvas.height, set: (v) => { canvas.height = v; } });
  }
  if (all) all.push(el);
  return el;
}

function fakePage({ width = 1280, height = 720, search = '', storage = {}, problems = [] } = {}) {
  const byId = new Map();
  const frames = [];
  const listeners = {};
  const elements = [];
  const on = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
  const touch = ['ArrowUp', 'KeyC', 'KeyX', 'KeyP'].map((key) => {
    const b = makeElement('button', problems, elements);
    b.dataset.key = key;
    if (key === 'KeyC') b.id = 'act';
    if (key === 'KeyX') b.id = 'bite';
    return b;
  });
  const document = {
    hidden: false,
    head: makeElement('head', problems, elements),
    body: makeElement('body', problems, elements),
    activeElement: null,
    currentScript: null,
    documentElement: makeElement('html', problems, elements),
    getElementById(id) {
      if (!byId.has(id)) {
        const el = makeElement(id === 'game' ? 'canvas' : 'div', problems, elements);
        el.id = id;
        if (id === 'touch') el.querySelectorAll = (sel) => (/data-key/.test(sel) ? touch : []);
        byId.set(id, el);
      }
      return byId.get(id);
    },
    querySelector: () => null,
    querySelectorAll: (sel) => (/#touch/.test(sel) ? touch : []),
    createElement: (tag) => makeElement(tag, problems, elements),
    addEventListener: on,
    removeEventListener() {},
  };
  const localStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
  };
  const globals = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 2,
    navigator: { vibrate() {}, userAgent: 'node', language: 'sk' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    cancelAnimationFrame() {},
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout() {},
    performance: { now: () => 0 },
    addEventListener: on,
    removeEventListener() {},
  };
  let clock = 0;
  const tick = (n = 1, ms = 1000 / 60) => {
    for (let i = 0; i < n; i++) {
      clock += ms;
      const due = frames.splice(0);
      due.forEach((fn) => fn(clock));
    }
  };
  const fire = (type, event = {}) => (listeners[type] || []).forEach((fn) => fn(Object.assign({ type, preventDefault() {}, stopPropagation() {} }, event)));
  return { document, localStorage, globals, location: { search, hash: '', href: 'file:///index.html' + search }, tick, fire, byId, storage, problems };
}

module.exports = { fakePage };
