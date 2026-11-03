(function () {
  const { rrect, circle } = ZS.gfx;
  const FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const INK = '#1d2318', FACE = '#fffaf0', LIP = '#a39c86', LIT = '#f0c030', LIT_INK = '#3a2a00';
  const PLATE = 'rgba(20,26,16,0.84)', RIM = 'rgba(255,250,240,0.3)', SHADE = 'rgba(0,0,0,0.2)', TEXT = '#ffffff';
  const ALT = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD', KeyC: 'KeyO', KeyX: 'KeyK' };
  const TOUCH = { Space: 'ArrowUp' };
  const SIZE = 13, MIN_PX = 15, IN = 0.15, OUT = 0.12, ARROWS = '←→↑↓';
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const codes = (part) => (Array.isArray(part[0]) ? part[0] : [part[0]]);
  const paths = new Map();
  const SAVE = 'zaStromom.hints', LIMIT = 2, AGAIN = 3;
  const memo = load();

  function load() {
    try {
      const m = JSON.parse(localStorage.getItem(SAVE)) || {};
      return { done: new Set(m.done || []), seen: m.seen || {} };
    } catch (e) { return { done: new Set(), seen: {} }; }
  }

  function save() {
    try { localStorage.setItem(SAVE, JSON.stringify({ done: [...memo.done], seen: memo.seen })); } catch (e) { return; }
  }

  function learn(skill) {
    if (!skill || memo.done.has(skill)) return;
    memo.done.add(skill);
    save();
  }

  function showing(g, skill) {
    const f = g && g.cueFx;
    return !!f && g.time - (f.last[skill] || -Infinity) < AGAIN;
  }

  function known(skill, g) {
    return !!skill && (memo.done.has(skill) || (!showing(g, skill) && (memo.seen[skill] || 0) >= LIMIT));
  }

  function count(g, f, parts) {
    let more = false;
    for (const p of parts) {
      if (!p.skill) continue;
      if (!showing(g, p.skill)) { memo.seen[p.skill] = (memo.seen[p.skill] || 0) + 1; more = true; }
      f.last[p.skill] = g.time;
    }
    if (more) save();
  }

  function button(code) {
    if (typeof document === 'undefined' || !document.querySelector) return null;
    const find = (c) => document.querySelector('#touch [data-key="' + c + '"]');
    return find(code) || (TOUCH[code] ? find(TOUCH[code]) : null);
  }

  function labeled(code) {
    const a = typeof document !== 'undefined' && document.getElementById ? document.getElementById('act') : null;
    return !!a && a.classList.contains('on') && (a.dataset.key === code || a.dataset.key === TOUCH[code]);
  }

  function icon(code) {
    const I = ZS.ICONS;
    return (I && (I[code] || I[TOUCH[code]])) || null;
  }

  function path(d) {
    if (!paths.has(d)) paths.set(d, new Path2D(d));
    return paths.get(d);
  }

  function glyph(code, touch) {
    const btn = touch ? button(code) : null;
    return (btn && btn.textContent.trim()) || ZS.UI.keys[code] || code;
  }

  function usable(code, touch) {
    const btn = touch ? button(code) : null;
    return !(btn && btn.closest && btn.closest('.act:not(.on)'));
  }

  function held(g, code) {
    const keys = g && g.input && g.input.keys;
    return !!keys && (keys.has(code) || keys.has(ALT[code]));
  }

  function face(ctx, g, code, h) {
    const touch = !!(g && g.touch), svg = touch ? icon(code) : null, round = !!svg || (touch && !!button(code));
    const ch = svg ? '' : glyph(code, touch);
    ctx.font = '800 ' + (h * (round ? 0.56 : ARROWS.includes(ch) ? 0.72 : 0.62)).toFixed(1) + 'px ' + FONT;
    return { ch, svg, round, w: round ? h : Math.max(code === 'Space' ? h * 1.7 : h, ctx.measureText(ch).width + h * 0.56) };
  }

  function width(ctx, g, code, h) {
    return face(ctx, g, code, h).w;
  }

  function cap(ctx, g, code, x, y, h, on) {
    const f = face(ctx, g, code, h), lip = h * 0.12, top = y - (h + lip) / 2, dip = on ? lip * 0.7 : 0;
    const shape = (yy) => (f.round ? circle(ctx, x + h / 2, yy + h / 2, h / 2) : rrect(ctx, x, yy, f.w, h, h * 0.24));
    ctx.fillStyle = LIP;
    shape(top + lip);
    ctx.fillStyle = on ? LIT : FACE;
    shape(top + dip);
    ctx.fillStyle = on ? LIT_INK : INK;
    if (f.svg) {
      const k = (h * 0.62) / 24;
      ctx.save();
      ctx.translate(x + h * 0.19, top + dip + h * 0.19);
      ctx.scale(k, k);
      ctx.fill(path(f.svg));
      ctx.restore();
      return f.w;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.ch, x + f.w / 2, top + dip + h * 0.53);
    return f.w;
  }

  function measure(ctx, g, parts, s) {
    const h = s * 1.55, lip = h * 0.12, pad = s * 0.3, gap = s * 0.22;
    const items = parts.map((p) => {
      const keys = codes(p).map((c) => width(ctx, g, c, h));
      ctx.font = '700 ' + s.toFixed(1) + 'px ' + FONT;
      return { keys, tw: p[1] ? ctx.measureText(p[1]).width : 0 };
    });
    const inner = items.reduce((sum, it, i) => sum + it.keys.reduce((a, b) => a + b, 0) + (it.keys.length - 1) * gap
      + (it.tw ? s * 0.4 + it.tw : 0) + (i ? s * 0.9 : 0), 0);
    return { s, h, lip, pad, gap, items, H: h + lip + pad * 2, w: pad + inner + (items[items.length - 1].tw ? s * 0.7 : pad) };
  }

  function unit(ctx) {
    const m = ctx.getTransform(), c = ctx.canvas;
    return Math.hypot(m.a, m.b) * (c && c.clientWidth ? c.clientWidth / c.width : 1) || 1;
  }

  function plate(ctx, w, H) {
    const r = H / 2, e = Math.max(0.8, H * 0.045);
    ctx.fillStyle = SHADE; rrect(ctx, -w / 2, -H / 2 + e * 2, w, H, r);
    ctx.fillStyle = RIM; rrect(ctx, -w / 2 - e, -H / 2 - e, w + e * 2, H + e * 2, r + e);
    ctx.fillStyle = PLATE; rrect(ctx, -w / 2, -H / 2, w, H, r);
  }

  function draw(ctx, g, parts, x, y, opts) {
    const o = opts || {}, a = o.a === undefined ? 1 : o.a;
    if (!parts || !parts.length || !(a > 0.01)) return null;
    let m = measure(ctx, g, parts, Math.max(o.size || SIZE, MIN_PX / unit(ctx)));
    if (o.max && m.w > o.max) m = measure(ctx, g, parts, m.s * o.max / m.w);
    const lo = o.lo === undefined ? -Infinity : o.lo + m.w / 2, hi = o.hi === undefined ? Infinity : o.hi - m.w / 2;
    const cx = lo > hi ? (o.lo + o.hi) / 2 : Math.max(lo, Math.min(hi, x)), cy = o.hang ? y + m.H / 2 : y, k = 0.86 + 0.14 * a;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    plate(ctx, m.w, m.H);
    let px = -m.w / 2 + m.pad;
    parts.forEach((p, i) => {
      if (i) px += m.s * 0.9;
      codes(p).forEach((c) => { px += cap(ctx, g, c, px, 0, m.h, held(g, c)) + m.gap; });
      px -= m.gap;
      if (!p[1]) return;
      ctx.font = '700 ' + m.s.toFixed(1) + 'px ' + FONT;
      ctx.fillStyle = TEXT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(p[1], px + m.s * 0.4, -m.lip / 2 + m.s * 0.06);
      px += m.s * 0.4 + m.items[i].tw;
    });
    ctx.restore();
    return { x: cx - (m.w * k) / 2, y: cy - (m.H * k) / 2, w: m.w * k, h: m.H * k };
  }

  function show(ctx, g, cue, opts) {
    const f = g.cueFx || (g.cueFx = { id: '', a: 0, t: g.time, cue: null, last: {} });
    const parts = cue ? cue.parts.filter((p) => codes(p).every((c) => usable(c, g.touch)) && !(g.touch && codes(p).every(labeled))) : [];
    const dt = Math.max(0, Math.min(0.1, g.time - f.t)), id = parts.map((p) => codes(p).join('+') + ' ' + p[1]).join(' | ');
    const short = parts.map((p) => (known(p.skill, g) ? [p[0], ''] : p));
    count(g, f, parts);
    f.t = g.time;
    if (id) f.cue = Object.assign({}, cue, { parts: short });
    f.id = id;
    f.a = id ? Math.min(1, f.a + dt / IN) : Math.max(0, f.a - dt / OUT);
    return f.cue && f.a > 0 ? draw(ctx, g, f.cue.parts, f.cue.x, f.cue.y, Object.assign({}, opts, { a: smooth(f.a) })) : null;
  }

  function html(code, touch) {
    const svg = touch && ZS.icon && icon(code) ? ZS.icon(ZS.ICONS[code] ? code : TOUCH[code]) : '';
    return '<kbd data-k="' + code + '">' + (svg || glyph(code, touch)) + '</kbd>';
  }

  function fill(text, touch) {
    return String(text).replace(/\{(\w+)\}/g, (m, code) => (ZS.UI.keys[code] ? html(code, touch) : m));
  }

  ZS.prompt = { glyph, width, cap, draw, show, html, fill, learn, known };
})();
