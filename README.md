# Za stromom

Satirická 2D hra v prehliadači o medveďovi z Liptova. Politici z neho robia vinníka všetkého, poľovníci po ňom
strieľajú aj tam, kde je chránený, a jediná istota je hrubý strom. Prejdi dolinou od jarného brlohu do zimného
a cestou nažer aspoň 85 % tuku.

Postavy, obec aj titulky sú vymyslené. Fakty na konci hry sú skutočné a majú zdroj.

**Hrať:** otvor `index.html` v prehliadači. Nič sa neinštaluje a nič sa neposiela na server.

## Ovládanie

| Kláves | Čo robí |
| --- | --- |
| ← → (A, D) | chôdza |
| Shift | šprint: pomôže ujsť, ale minie dych aj tuk a poľovníci ho počujú |
| ↓ (S) | schovať sa za hrubý strom; spolu s ← → zakrádanie |
| ↑ (W) | skok; pri hrubom kmeni lezenie na strom, na strome hore |
| medzerník | skok; na strome zoskok |
| P, Esc | pauza |

Na dotykovej obrazovke sú tlačidlá v spodnej časti.

## Spustenie

Hra je čisto statická, takže stačí dvojklik na `index.html`. Cez lokálny server:

```bash
python3 -m http.server 8000
```

a potom <http://localhost:8000>. S `?bot` na konci adresy (<http://localhost:8000/?bot>) hrá autopilot.

## Štruktúra

```
index.html            stránka: plátno, HUD, obrazovky a poradie skriptov
css/game.css          vzhľad HUD a obrazoviek
js/core/              konfigurácia a tabuľka jedla, všetky texty hry, pomocné funkcie
js/world/level.js     dolina: stromy, obec, salaš, rieka, hotel (zo semienka, vždy rovnaká)
js/sim/               simulácia bez DOM: medveď, poľovníci, ľudia, drony, zvieratá, pravidlá, politika, krok hry
js/render/            kreslenie: pomôcky, efekty, pozadie, rekvizity a skladanie scény
js/render/art/        animovaný medveď, ľudia a kulisy
js/ui/                klávesnica a dotyk, HUD, úvodná, pauzová a koncová obrazovka
js/dev/autoplay.js    autopilot pre ?bot a testy
js/main.js            spustenie: mierka plátna, herná slučka, štart, pauza a koniec hry
tests/                testy v Node
tools/                náhľady animácií medveďa, ľudí a kulís
archive/v1-zhora/     prvá verzia hry s pohľadom zhora
```

Ako to drží pokope:

- Klasické `<script>` bez modulov a bez buildu, aby hra išla aj z `file://`. Všetko visí na jednom globálnom
  mennom priestore `ZS` a poradie skriptov v `index.html` je poradie závislostí.
- Simulácia v `js/sim` nesiaha na DOM ani na plátno. Rozhranie ju počúva cez `ZS.sim.rules.onNews` a
  `ZS.sim.rules.onEnd`, takže celá hra beží aj v Node.
- `ZS.sim.loop.step` volá časti hry v pevnom poradí. Aj poradie volaní `Math.random` je súčasť správania: kto ho
  zmení, zmení priebeh hier so semienkom a testy to zachytia.
- Efekty v `js/render/fx.js` sú kreslenie, ale simulácia ich posúva v každom kroku (a spotrebúvajú
  `Math.random`), preto ich testy načítajú tiež.

## Testy

Treba Node 20 alebo novší, žiadne závislosti:

```bash
npm test
```

- `tests/bot-runs.test.js`: autopilot odohrá osem hier s pevným semienkom a každá musí skončiť presne tak ako
  v `tests/fixtures/bot-runs.json` (koniec, čas, tuk, životy, vzdialenosť, ukazovatele, politika, udalosti, zjedené
  jedlo). Po zámernej zmene hrateľnosti nové výsledky zapíše `UPDATE_FIXTURES=1 npm test`. Výsledky sú z Node:
  Chrome počíta `Math.sin`, `Math.cos` a podobné funkcie inak v poslednom bite, takže to isté semienko tam môže
  dopadnúť inak.
- `tests/bear-controls.test.js`: ovládanie snímku po snímke, najmä schovávanie, lezenie a skoky.
- `tests/render.test.js`: kreslí celé hry do náhradného plátna; nič nesmie spadnúť, na plátno nesmie prísť `NaN`
  a každé `save()` musí mať svoje `restore()`.

## Ladenie v konzole

| Príkaz | Čo robí |
| --- | --- |
| `ZS.dev.game()` | stav prebiehajúcej hry |
| `ZS.dev.restart()` | nová hra |
| `ZS.dev.step(10)` | posunie hru o 10 s bez čakania na snímky (aj v karte na pozadí) |
| `ZS.dev.bot.mode = 'runner'` | autopilot, ktorý sa neschováva a nestojí pri jedle |
| `ZS.dev.bot.reaction = 0.6` | ako často sa autopilot rozhliadne, v sekundách |

## English

A satirical side-view browser game about a brown bear in Slovakia's Liptov region, hiding behind trees from hunters
while politicians blame bears for everything. Open `index.html` to play; the game is in Slovak. Plain HTML, CSS and
classic scripts with no build step; `npm test` runs the Node tests (Node 20+, no dependencies).
