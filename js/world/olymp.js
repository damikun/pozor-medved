(function () {
  const K = ZS.levelKit;
  const { hash, mulberry32, smooth, clamp, lerp } = ZS.util;
  const DS = 2;

  function track(parts, opts) {
    const o = opts || {}, raw = [];
    const real = parts.reduce((a, p) => a + Math.max(1, Math.round(p.len / DS)), 0) * DS;
    for (const p of o.ext ? parts.concat(o.ext) : parts) {
      const n = Math.max(1, Math.round(p.len / DS));
      for (let i = 0; i < n; i++) raw.push({ k: (p.turn || 0) / p.len, gr: p.gr, bank: p.bank || 0 });
    }
    const N = raw.length, R = o.blur || 12, S = [];
    let x = 0, y = 0, z = 0, h = o.h0 || 0;
    for (let i = 0; i <= N; i++) {
      let k = 0, gr = 0, bank = 0, wsum = 0;
      for (let j = -R; j <= R; j++) {
        const q = raw[clamp(i + j, 0, N - 1)], w = R + 1 - Math.abs(j);
        k += q.k * w; gr += q.gr * w; bank += q.bank * w; wsum += w;
      }
      k /= wsum; gr /= wsum; bank /= wsum;
      if (o.ground) gr = o.ground(i * DS);
      S.push({ s: i * DS, x, y, z, h, k, gr, bank });
      x += Math.sin(h) * DS; z += Math.cos(h) * DS; y -= gr * DS; h += k * DS;
    }
    return { S, len: real, end: N * DS };
  }

  function at(T, s) {
    const S = T.S, f = clamp(s / DS, 0, S.length - 1.001), i = Math.floor(f), t = f - i, a = S[i], b = S[i + 1];
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), h: lerp(a.h, b.h, t), k: lerp(a.k, b.k, t), gr: lerp(a.gr, b.gr, t), bank: lerp(a.bank, b.bank, t) };
  }

  function place(T, s, u, y) {
    const p = at(T, s), c = Math.cos(p.h), sn = Math.sin(p.h);
    return [p.x + c * u, p.y + (y || 0), p.z - sn * u];
  }

  const SLALOM = [
    { len: 40, gr: 0.04 }, { len: 90, gr: 0.3 }, { len: 150, turn: 0.32, gr: 0.33 }, { len: 120, turn: -0.36, gr: 0.27 },
    { len: 110, gr: 0.42 }, { len: 140, turn: 0.4, gr: 0.31 }, { len: 120, gr: 0.17 }, { len: 150, turn: -0.34, gr: 0.36 },
    { len: 130, turn: 0.3, gr: 0.3 }, { len: 110, gr: 0.32 }, { len: 90, gr: 0.14 }, { len: 90, gr: -0.04 },
  ];

  function slalom() {
    const T = track(SLALOM, { blur: 14, ext: [{ len: 500, gr: 0.22 }, { len: 900, gr: 0.12 }, { len: 4600, gr: 0.015 }] });
    const finish = T.len - 80, rng = mulberry32(7301);
    const gates = [];
    let s = 112, side = -1, i = 0;
    const kidsAt = 712;
    while (s < finish - 36) {
      if (Math.abs(s - kidsAt) < 24) s = kidsAt + 24;
      const steep = at(T, s).gr, off = (i < 3 ? 4 : steep > 0.38 ? 5 : 6.5 + rng() * 2.2) * side;
      const kids = s > kidsAt && s < kidsAt + 60;
      gates.push({ s, u: kids ? off * 0.5 : off, side, hit: false, missed: false, i });
      s += (steep > 0.38 ? 40 : 46) + rng() * 8;
      side = -side; i++;
    }
    const crowd = [];
    for (let cs = 30; cs < T.len; cs += 9 + rng() * 9) {
      const near = cs > finish - 140 || (cs > 400 && cs < 520) || (cs > 680 && cs < 760) || cs < 70;
      if (!near && rng() < 0.62) continue;
      for (const sd of [-1, 1]) if (near || rng() < 0.6) crowd.push({ s: cs + rng() * 4, u: sd * (23.5 + rng() * 2.2), n: 2 + Math.floor(rng() * (near ? 4 : 3)), seed: rng() * 100, flag: rng() < 0.3 });
    }
    const trees = [];
    for (let ts = -40; ts < T.len + 260; ts += 3.2 + rng() * 4.5) {
      if (ts < 300 && rng() < 0.85) continue;
      for (const sd of [-1, 1]) {
        if (rng() < 0.25) continue;
        const u = sd * (27 + Math.pow(rng(), 0.7) * 70), dwarf = ts < 560;
        trees.push({ s: ts + rng() * 2, u, h: dwarf ? 1.4 + rng() * 1.2 : 8 + rng() * 9, dwarf, seed: rng() });
      }
    }
    for (let ts = 430; ts < T.len + 200; ts += 5 + rng() * 6) for (const sd of [-1, 1]) if (rng() < 0.55) trees.push({ s: ts, u: sd * (27.5 + rng() * 5), h: 7 + rng() * 8, dwarf: false, seed: rng() });
    const banners = [
      { s: 150, u: -22.6, text: 'hop' }, { s: 330, u: 22.6, text: 'svk' }, { s: 520, u: -22.6, text: 'tree' },
      { s: 760, u: 22.6, text: 'holding' }, { s: 980, u: -22.6, text: 'hop' }, { s: finish - 60, u: 22.6, text: 'svk' },
    ];
    return {
      T, finish, gates, crowd, trees, banners, half: 21,
      start: { s: 22 },
      cannons: [{ s: 380, u: -24, dir: 1 }, { s: 830, u: 24, dir: -1 }, { s: 1090, u: -24, dir: 1 }],
      ratrak: { s: 911.5, u: 1.2, w: 7.6, d: 3.4, h: 2.2 },
      bears: [{ s: 40, u: -24.6, n: 4, seed: 3 }, { s: 236, u: 24.8, n: 3, seed: 17 }, { s: 450, u: -24.8, n: 3, seed: 29 }, { s: 640, u: 24.8, n: 3, seed: 41 }, { s: 918, u: -24.6, n: 4, seed: 53 }, { s: 1100, u: 24.8, n: 3, seed: 67 }, { s: finish - 30, u: -24.4, n: 5, seed: 79 }, { s: finish + 12, u: 17, n: 6, seed: 91 }],
      ramps: [{ s: 533, u: -0.5, w: 4.2, len: 4, h: 0.6, kind: 'roll' }, { s: 905, u: 1.2, w: 5.2, len: 7, h: 1.8, kind: 'big' }, { s: 1054, u: 0.1, w: 4.2, len: 4, h: 0.6, kind: 'roll' }],
      school: { s: 712, from: -26, to: 26, kids: 8, gap: 1.6, speed: 2.8, lead: 9.5 },
      fallen: { s: 1140, u: -1.5, w: 2.4 },
      booths: [{ s: 470, u: -27, kind: 'booth' }, { s: finish + 18, u: 27, kind: 'booth' }],
      stall: { s: 740, u: 27.5 },
      lift: { u: -60 },
      board: { s: finish + 26, u: -12 },
    };
  }

  function jumpGround(s) {
    if (s < 18) return 0.02;
    if (s < 150) return 0.4;
    if (s < 166) return lerp(0.4, -0.45, smooth((s - 150) / 16));
    if (s < 172) return -0.45;
    if (s < 175) return 1.6;
    if (s < 196) return 0.02;
    if (s < 202) return lerp(0.02, 0.62, (s - 196) / 6);
    if (s < 258) return 0.62;
    if (s < 290) return lerp(0.62, 0, smooth((s - 258) / 32));
    return -0.01;
  }

  function jump() {
    const T = track([{ len: 380, gr: 0 }], { ground: (s) => (s > 1100 ? 0.015 : s > 380 ? 0.12 : jumpGround(s)), blur: 0, ext: [{ len: 6000, gr: 0 }] });
    const rng = mulberry32(8811), crowd = [], trees = [];
    for (let cs = 186; cs < 372; cs += 5 + rng() * 5) for (const sd of [-1, 1]) crowd.push({ s: cs, u: sd * (15 + rng() * 3), n: 3 + Math.floor(rng() * 3), seed: rng() * 100, flag: rng() < 0.35 });
    for (let ts = -20; ts < 420; ts += 4 + rng() * 5) for (const sd of [-1, 1]) if (rng() < 0.8) trees.push({ s: ts, u: sd * (24 + Math.pow(rng(), 0.7) * 60), h: 8 + rng() * 9, seed: rng() });
    const bears = [{ s: 150, u: -9, n: 3, seed: 5 }, { s: 214, u: 16.5, n: 4, seed: 13 }, { s: 262, u: -16.5, n: 4, seed: 23 }, { s: 330, u: 16.8, n: 5, seed: 37 }];
    return { T, lip: 172, table: [175, 198], land: [200, 258], stop: 350, half: 4.2, wide: 14, crowd, bears, trees, judges: { s: 300, u: -17 }, start: { s: 72 } };
  }

  const SLED = [
    { len: 40, gr: 0.06 }, { len: 70, gr: 0.22 }, { len: 90, turn: 1.3, gr: 0.18, bank: 1 }, { len: 60, gr: 0.24 },
    { len: 80, turn: -1.4, gr: 0.17, bank: -1 }, { len: 50, gr: 0.24 }, { len: 110, turn: 2.1, gr: 0.14, bank: 1 }, { len: 60, gr: 0.26 },
    { len: 70, turn: -1.2, gr: 0.19, bank: -1 }, { len: 70, turn: 1.2, gr: 0.19, bank: 1 }, { len: 70, gr: 0.22 },
    { len: 100, turn: -1.8, gr: 0.15, bank: -1 }, { len: 70, gr: 0.17 }, { len: 70, gr: 0.03 }, { len: 70, gr: 0.0 },
  ];

  function sled() {
    const T = track(SLED, { blur: 10, ext: [{ len: 700, gr: 0.08 }, { len: 5400, gr: 0.012 }] });
    const rng = mulberry32(9127), trees = [], crowd = [], lamps = [];
    for (let ts = -20; ts < T.len + 80; ts += 3 + rng() * 5) for (const sd of [-1, 1]) if (rng() < 0.75) trees.push({ s: ts, u: sd * (7 + Math.pow(rng(), 0.6) * 55), h: 6 + rng() * 10, seed: rng() });
    for (let cs = 60; cs < T.len - 40; cs += 22 + rng() * 30) crowd.push({ s: cs, u: (rng() < 0.5 ? -1 : 1) * (5.6 + rng()), n: 1 + Math.floor(rng() * 3), seed: rng() * 100, flag: rng() < 0.3 });
    for (let ls = 30; ls < T.len; ls += 24) lamps.push({ s: ls, u: (Math.floor(ls / 24) % 2 ? -1 : 1) * 4.8 });
    const bar = T.len - 60;
    const things = [];
    const bears = [{ s: 120, u: 1, n: 3, seed: 7 }, { s: 330, u: -1, n: 3, seed: 19 }, { s: 560, u: 1, n: 3, seed: 31 }, { s: T.len - 70, u: -1, n: 4, seed: 43 }];
    return { T, R: 2.6, wall: 1.12, out: 1.34, bar, stop: T.len - 30, trees, crowd, bears, lamps, things, start: { s: 6 } };
  }

  ZS.levelBuilders.olymp = function (rng) {
    const L = K.base('olymp', rng);
    Object.assign(L, {
      startDen: -9999, goalDen: 3000, olymp: { slalom: slalom(), jump: jump(), sled: sled() },
    });
    L.checkpoints = [{ key: 'skok', x: 1000 }, { key: 'sane', x: 2000 }];
    L.spawns = [];
    L.calm = [[0, L.w]];
    return L;
  };

  ZS.olympTrack = { at, place, DS };
})();
