'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, makePath2D } = require('./mock-canvas');

const ROOT = path.resolve(__dirname, '..', '..');
const HEADLESS = /^js\/(core|lang|world|sim|dev)\/|^js\/render\/fx\.js$|^js\/ui\/input\.js$/;
const RENDERER = /^js\/render\//;
const AUDIO = /^js\/ui\/(audio|sounds)\.js$/;

function pageScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
}

function loadGame({ seed, withRenderer = false, withAudio = false, globals = {}, problems = [], location, localStorage, document } = {}) {
  const sandbox = Object.assign({ console }, globals);
  sandbox.window = sandbox;
  if (location) sandbox.location = location;
  if (localStorage) sandbox.localStorage = localStorage;
  if (document) sandbox.document = document;
  if (withRenderer) {
    sandbox.Path2D = makePath2D(problems);
    sandbox.document = Object.assign(sandbox.document || {}, { createElement: () => createCanvas(16, 16, problems) });
  }
  vm.createContext(sandbox);
  const scripts = pageScripts().filter((src) => HEADLESS.test(src) || (withRenderer && RENDERER.test(src)) || (withAudio && AUDIO.test(src)));
  for (const src of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src });
  if (seed !== undefined) vm.runInContext(`Math.random = ZS.util.mulberry32(${Number(seed)});`, sandbox);
  return sandbox.ZS;
}

module.exports = { loadGame };
