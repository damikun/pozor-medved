(function () {
  const ZS = window.ZS;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const sstep = (a, b, x) => smooth((x - a) / (b - a));
  const ease = (v, to, rate, dt) => v + (to - v) * (1 - Math.exp(-rate * dt));
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const hash2 = (a, b) => hash(a * 57.31 + b * 13.97 + 0.17);

  ZS.util = { mulberry32, clamp, lerp, smooth, sstep, ease, frac, hash, hash2 };
})();
