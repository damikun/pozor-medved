(function () {
  const ZS = window.ZS;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const emojiCache = new Map();
  const TAU = Math.PI * 2;

  function emoji(ctx, ch, x, y, size) {
    const key = ch + size;
    let c = emojiCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = Math.ceil(size * 1.5);
      const e = c.getContext('2d');
      e.font = size + 'px ' + EMOJI_FONT;
      e.textAlign = 'center'; e.textBaseline = 'middle';
      e.fillText(ch, c.width / 2, c.height / 2 + size * 0.05);
      emojiCache.set(key, c);
    }
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
  }

  function label(ctx, text, x, y, size, color, weight, maxW) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    const w = maxW ? ctx.measureText(text).width : 0;
    if (w > maxW) ctx.font = (weight || 700) + ' ' + (size * maxW / w) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#2a2f22';
    ctx.fillText(text, x, y);
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }

  const widths = new Map();
  function measure(ctx, s, font) {
    const key = font + '|' + s;
    let w = widths.get(key);
    if (w === undefined) { ctx.font = font; w = ctx.measureText(s).width; widths.set(key, w); }
    return w;
  }

  const fontOf = (weight, size) => weight + ' ' + size + 'px system-ui, sans-serif';

  function fit(ctx, s, size, weight, maxW) {
    const w = measure(ctx, s, fontOf(weight, size));
    return w > maxW ? size * maxW / w : size;
  }

  function text(ctx, s, x, y, size, col, weight, spacing, maxW) {
    const wt = weight || 700, font = fontOf(wt, size);
    const w = maxW ? measure(ctx, s, font) + (spacing || 0) * s.length : 0;
    ctx.font = w > maxW ? fontOf(wt, size * maxW / w) : font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  const tones = {};
  function rgba(rgb, a) {
    const i = a <= 0 ? 0 : a >= 1 ? 1000 : Math.round(a * 1000), row = tones[rgb] || (tones[rgb] = []);
    return row[i] || (row[i] = 'rgba(' + rgb + ',' + (i / 1000).toFixed(3) + ')');
  }

  ZS.gfx = { emoji, label, rrect, circle, ellipse, text, fit, rgba };
})();
