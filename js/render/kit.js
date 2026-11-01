// Small canvas helpers shared by the renderers.
(function () {
  const ZS = window.ZS;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const emojiCache = new Map();

  /** Draws an emoji centred at (x, y); each emoji and size is rendered once and then reused. */
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

  /** Centred bold text with a white outline, readable over any background. */
  function label(ctx, text, x, y, size, color, weight) {
    ctx.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#2a2f22';
    ctx.fillText(text, x, y);
  }

  /** Filled rounded rectangle. */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

  ZS.gfx = { emoji, label, rrect, circle, ellipse };
})();
