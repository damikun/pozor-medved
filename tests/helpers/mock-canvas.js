'use strict';

const PATH_METHODS = ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arcTo', 'arc', 'ellipse', 'rect', 'roundRect', 'closePath'];
const DRAW_METHODS = ['beginPath', 'fill', 'stroke', 'clip', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage', 'setLineDash'];
const PROPS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'font', 'textAlign', 'textBaseline', 'direction',
  'globalAlpha', 'globalCompositeOperation', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'lineDashOffset',
  'imageSmoothingEnabled', 'letterSpacing', 'filter'];
const RADII = { arc: [2], arcTo: [4], ellipse: [2, 3] };

const internals = new WeakMap();

function check(problems, label, method, args) {
  if (args.some((a) => typeof a === 'number' && !Number.isFinite(a))) problems.push(`${label}(${args.join(', ')}): not a finite number`);
  for (const i of RADII[method] || []) if (args[i] < 0) problems.push(`${label}(${args.join(', ')}): negative radius`);
}

function createContext(canvas, problems) {
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const props = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, globalAlpha: 1, font: '10px sans-serif' };
  const apply = (a, b, c, d, e, f) => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  };
  const api = {
    canvas,
    save() { stack.push({ m: m.slice(), props: { ...props } }); },
    restore() {
      const top = stack.pop();
      if (!top) { problems.push('restore() without save()'); return; }
      m = top.m;
      Object.assign(props, top.props);
    },
    translate(x, y) { check(problems, 'translate', 'translate', [x, y]); apply(1, 0, 0, 1, x, y); },
    scale(x, y) { check(problems, 'scale', 'scale', [x, y]); apply(x, 0, 0, y, 0, 0); },
    rotate(r) { check(problems, 'rotate', 'rotate', [r]); apply(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0); },
    transform(...t) { check(problems, 'transform', 'transform', t); apply(...t); },
    setTransform(...t) {
      if (typeof t[0] === 'object') { const o = t[0]; t = [o.a, o.b, o.c, o.d, o.e, o.f]; }
      check(problems, 'setTransform', 'setTransform', t);
      m = t;
    },
    resetTransform() { m = [1, 0, 0, 1, 0, 0]; },
    getTransform() { return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }; },
    measureText(text) { return { width: String(text).length * 7 }; },
    createLinearGradient(...a) { check(problems, 'createLinearGradient', '', a); return { addColorStop() {} }; },
    createRadialGradient(...a) { check(problems, 'createRadialGradient', '', a); return { addColorStop() {} }; },
  };
  for (const name of [...PATH_METHODS, ...DRAW_METHODS]) api[name] = (...a) => check(problems, name, name, a);

  const ctx = new Proxy(api, {
    get(target, key) {
      if (typeof key === 'symbol') return undefined;
      if (key in target) return target[key];
      if (PROPS.includes(key)) return props[key];
      throw new Error(`a 2D canvas context has no "${key}"`);
    },
    set(target, key, value) {
      if (!PROPS.includes(key)) throw new Error(`a 2D canvas context has no property "${String(key)}"`);
      if (typeof value === 'number' && !Number.isFinite(value)) problems.push(`${key} = ${value}`);
      if (key === 'globalAlpha' && !(value >= 0 && value <= 1)) problems.push(`globalAlpha = ${value}: outside 0..1, a browser ignores it`);
      props[key] = value;
      return true;
    },
  });
  internals.set(ctx, { stack });
  return ctx;
}

function createCanvas(width, height, problems) {
  const canvas = { width, height };
  const ctx = createContext(canvas, problems);
  canvas.getContext = () => ctx;
  return canvas;
}

function stackDepth(ctx) {
  return internals.get(ctx).stack.length;
}

function makePath2D(problems) {
  return class Path2D {
    constructor() {
      for (const name of PATH_METHODS) this[name] = (...a) => check(problems, 'Path2D.' + name, name, a);
    }
  };
}

module.exports = { createCanvas, stackDepth, makePath2D };
