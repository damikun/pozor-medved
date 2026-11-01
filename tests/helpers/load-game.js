'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, makePath2D } = require('./mock-canvas');

const ROOT = path.resolve(__dirname, '..', '..');
const HEADLESS = /^js\/(core|world|sim|dev)\/|^js\/render\/fx\.js$|^js\/ui\/input\.js$/;
const RENDERER = /^js\/render\//;

function pageScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
}

function loadGame({ seed, withRenderer = false, problems = [] } = {}) {
  const sandbox = { console };
  sandbox.window = sandbox;
  if (withRenderer) {
    sandbox.Path2D = makePath2D(problems);
    sandbox.document = { createElement: () => createCanvas(16, 16, problems) };
  }
  vm.createContext(sandbox);
  const scripts = pageScripts().filter((src) => HEADLESS.test(src) || (withRenderer && RENDERER.test(src)));
  for (const src of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src });
  if (seed !== undefined) vm.runInContext(`Math.random = ZS.util.mulberry32(${Number(seed)});`, sandbox);
  return sandbox.ZS;
}

module.exports = { loadGame };
