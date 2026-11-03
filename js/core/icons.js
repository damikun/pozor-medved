(function () {
  const ICONS = {
    ArrowLeft: 'M16 4.5 7 12l9 7.5z',
    ArrowRight: 'M8 4.5 17 12l-9 7.5z',
    ArrowUp: 'M12 2.5 21 12h-5.5v9h-7v-9H3z',
    ArrowDown: 'M4.5 8 12 17l7.5-9z',
    Hide: 'M12 2l5.5 7h-2.7l4.7 6h-6v6h-3v-6h-6l4.7-6H6.5z',
    Ladder: 'M6.5 2h2.4v20H6.5zM15.1 2h2.4v20h-2.4zM8.9 5.5h6.2v2.2H8.9zM8.9 10.9h6.2v2.2H8.9zM8.9 16.3h6.2v2.2H8.9z',
    KeyC: 'M8.2 12.5V5.2a1.35 1.35 0 0 1 2.7 0v7.3zM11.2 12.5V3.6a1.35 1.35 0 0 1 2.7 0v8.9zM14.2 12.5V4.6a1.35 1.35 0 0 1 2.7 0v7.9zM17.2 13V7a1.25 1.25 0 0 1 2.5 0v6zM8.2 11.5h11.5v4.3c0 3.6-2.7 6.2-6.1 6.2h-.6c-2.5 0-3.9-1.2-5-2.9L4.7 14.4a1.4 1.4 0 0 1 2.2-1.7l1.3 1.6z',
    KeyX: 'M3.5 20.5Q8.6 13.4 9.5 3.5q2.9 9.6-3.2 17.9zM8.1 21.3q5.1-7.1 6-17q2.9 9.6-3.2 17.9zM12.7 20.5q5.1-7.1 6-17q2.9 9.6-3.2 17.9z',
    KeyP: 'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z',
  };
  ICONS.Space = ICONS.ArrowUp;

  ZS.ICONS = ICONS;
  ZS.icon = (code) => (ICONS[code] ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[code] + '"/></svg>' : '');
})();
