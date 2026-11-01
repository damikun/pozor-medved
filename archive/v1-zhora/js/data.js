// Constants and every piece of text in the game.
// Characters and headlines are invented satire; the facts at the end are real and sourced.
window.ZS = window.ZS || {};

ZS.CFG = {
  W: 2400, H: 1600,
  YEAR: 240,
  SEASONS: [
    { name: 'Jar', end: 60 },
    { name: 'Leto', end: 150 },
    { name: 'Jeseň', end: 240 },
  ],
  BEAR_R: 16, BEAR_SPEED: 160, SNEAK_SPEED: 85,
  METABOLISM: 0.12,
  SYN_DECAY: 0.22,
  PANIC_DECAY: 0.3,
  PROBLEM: 60, CALM: 40,
  LIVES: 3,
  VILLAGE_NAME: 'Dolný Strach',
};

// natural: from the forest. syn: how much the bear gets used to people. panic: media panic when eaten.
ZS.FOOD = {
  herb:     { emoji: '🌿', fat: 1.6, syn: 0,  panic: 0, natural: true, respawn: 18, label: 'byliny' },
  ants:     { emoji: '🐜', fat: 2.5, syn: 0,  panic: 0, natural: true, respawn: 28, label: 'mravenisko' },
  berry:    { emoji: '🫐', fat: 3.2, syn: 0,  panic: 0, natural: true, respawn: 24, seasons: [1, 2], label: 'čučoriedky' },
  nut:      { emoji: '🌰', fat: 4,   syn: 0,  panic: 0, natural: true, respawn: 26, seasons: [2], label: 'bukvice' },
  bin:      { emoji: '🗑️', fat: 8,   syn: 13, panic: 7, respawn: 40, label: 'smetný kôš' },
  corn:     { emoji: '🌽', fat: 10,  syn: 9,  panic: 0, respawn: 32, label: 'kukurica z vnadiska' },
  hive:     { emoji: '🍯', fat: 7,   syn: 11, panic: 8, respawn: 60, label: 'úľ' },
  apple:    { emoji: '🍎', fat: 5,   syn: 6,  panic: 3, respawn: 30, seasons: [1, 2], label: 'jablká zo sadu' },
  sandwich: { emoji: '🥪', fat: 6,   syn: 10, panic: 4, respawn: 0, label: 'desiata od turistov' },
  basket:   { emoji: '🧺', fat: 5,   syn: 8,  panic: 0, respawn: 0, label: 'košík hubárky' },
};

ZS.HEADLINES = [
  'Ceny masla opäť stúpli. Minister Strašiak: Za všetkým hľadajte medveďa.',
  'Diera na ceste pri Dolnom Strachu. Odborníci nevylučujú medveďa.',
  'Čakačky u lekára sa predĺžili. Vraj kvôli medveďom v čakárni.',
  'Poslanec Flinta: Medveďov je 20 000. Dôkaz? Videl stopy, aj svoje.',
  'Minister Strašiak: Medveď sa skrýva za stromom. Za každým!',
  'Vlak meškal 40 minút. Dopravca nevylučuje medveďa na trati.',
  'Deficit rastie. Vláda zvažuje zdaniť medvede.',
  'Hokejisti prehrali. Tréner: Na ľade boli medvede.',
  'Poslanec Flinta navrhol medveďom rodné čísla a GPS obojky.',
  'Tlačová správa: Les je nebezpečný, lebo sú v ňom stromy. A za stromami medvede.',
  'Opozícia: Problém sú smetné koše. Vláda: Koše nevolia.',
  'Internet v obci spadol. Starosta: Medveď prehrýzol kábel. Kábel je v Bratislave.',
  'Pivo zdražie o 20 centov. Krčmár ukazuje na les.',
  'Minister Strašiak sčítal medvede z helikoptéry. Rátal aj kopy sena.',
  'Prieskum: 9 z 10 politikov sa bojí medveďa. Desiaty prieskum nečítal.',
];

ZS.NEWS = {
  press: 'Minister Strašiak zvolal tlačovku: „Medveď je za každým stromom!“ Do lesa ide ďalší poľovník.',
  emergency: 'Vláda vyhlásila mimoriadnu situáciu. V 500 m zóne okolo Dolného Strachu sa strieľa.',
  drones: 'Armáda nasadila drony s reflektormi. Pod korunami stromov ťa nevidia.',
  cull: 'Mimoriadny zásah do populácie: 350 kusov. Poľovníci môžu strieľať všade.',
  wrongbear: 'Biometrický dron identifikoval páchateľa. Zastrelili inú medvedicu. Minister: Problém vyriešený.',
  court: 'Súd: výnimka neurčila, ktorého medveďa. Legálny odstrel je na 20 sekúnd zastavený.',
  meat: 'Štát povolil predaj medvedieho mäsa. Poľovníci zrýchlili krok.',
  feeding: 'Poľovníci založili nové vnadisko. Kukurica voňia až do lesa.',
  poacher: 'V lese sa pohybuje pytliak. Zákony ho nezaujímajú.',
  bins: 'Dolný Strach kúpil zabezpečené koše. Titulky to nezaujíma.',
  census: 'Poslanec Flinta zrátal medvede: 6 000. Rátal aj tiene.',
  tourists: 'Turisti pri ceste kŕmia medvede desiatou. Video má milión pozretí.',
  mushrooms: 'Začala hubárska sezóna. V lese je plno košíkov.',
  constitution: 'Ústavný zákon o medveďovi: zóna sa rozširuje a medveď sa nesmie odvolať.',
  hunterSeen: 'Poľovník hlási medveďa pri Dolnom Strachu.',
  pickerSeen: 'Hubárka: Videla som medveďa! Bol za stromom.',
  touristSeen: 'Turista natočil medveďa. Video sa šíri.',
  droneSeen: 'Dron zachytil medveďa. Armáda hlási úspech.',
  problem: 'Ministerstvo: medveď pri Dolnom Strachu je problémový. Vyráža zásahový tím.',
  calm: 'Zásahový tím sa stiahol. Medveď sa vrátil do lesa.',
  binEaten: 'Medveď vybral smetné koše. Minister: Dôkaz, že medveďov je priveľa.',
  hiveEaten: 'Včelár z Dolného Strachu prišiel o úľ.',
  clash: 'Stret v lese! Hubárka utiekla, košík nechala.',
  winter: 'Prichádza zima. Medvede idú do brlohov, politici do volebnej kampane.',
};

ZS.FACTS = {
  cull: { text: 'Na Slovensku usmrtili 10 medveďov v roku 2023, 93 v roku 2024 a 213 v roku 2025.', src: 'DEKK Inštitút, MŽP SR', url: 'https://www.noviny.sk/slovensko/1242992-od-zaciatku-roka-bolo-usmrtenych-28-medvedov-envirorezort-hlasi-pokles-utokov' },
  media: { text: 'V roku 2011 vyšlo o medveďoch 25 článkov, v roku 2023 až 1 449.', src: 'TU Zvolen cez DEKK', url: 'https://www.noviny.sk/slovensko/1099444-menej-oblubeny-viac-kontroverzny-len-tretina-slovakov-stale-povazuje-medveda-za-prirodne-bohatstvo' },
  opinion: { text: 'Za prírodné bohatstvo považovalo medveďa 61 % ľudí v roku 2021 a už len 33 % v roku 2025.', src: 'DEKK Inštitút', url: 'https://www.noviny.sk/slovensko/1099444-menej-oblubeny-viac-kontroverzny-len-tretina-slovakov-stale-povazuje-medveda-za-prirodne-bohatstvo' },
  food: { text: 'Podľa zoológa ŠOP nezávisí počet útokov od počtu medveďov, ale od ich správania. Ochranári hovoria hlavne o jedle pri ľuďoch.', src: 'TASR', url: 'https://www.teraz.sk/slovensko/sop-utoky-na-cloveka-nesuvisia-s-po/731843-clanok.html' },
  bait: { text: 'Pri Hybe na Liptove našli aktivisti poľovnícke vnadisko 700 m od miesta smrteľného útoku medveďa (2024).', src: 'Startitup', url: 'https://www.startitup.sk/alarmujuce-zistenie-aktivistov-len-700-metrov-od-smrtelneho-utoku-medveda-nasli-vnadisko-sop-o-nicom-nevedela/' },
  court: { text: 'Vo februári 2026 súd uznal, že výnimka na odstrel na Liptove neurčila, ktorého medveďa smú zastreliť.', src: 'STVR', url: 'https://enrsi.stvr.sk/articles/news/434877/environment-ministry-has-to-pay-for-killed-bears' },
  meat: { text: 'V roku 2025 štát povolil predaj mäsa z odstrelených medveďov.', src: 'AFP / RTÉ', url: 'https://www.rte.ie/news/europe/2025/0528/1515521-slovakia-bears' },
  wrong: { text: 'Po útoku v Liptovskom Mikuláši (2024) opozícia tvrdila, že zastrelili inú medvedicu, než ktorá útočila.', src: 'CBS', url: 'https://www.cbsnews.com/news/bear-that-injured-5-shot-dead-slovakia-critics-wrong-bear-killed' },
  poach: { text: 'Spoločenská hodnota medveďa je najmenej 5 000 € a nelegálne zastrelených medveďov pribúda.', src: 'Noviny.sk', url: 'https://www.noviny.sk/krimi/712054-spolocenska-hodnota-medveda-je-minimalne-5-000-eur-pripady-nelegalne-zastrelenych-zvierat-pribudaju' },
  pop: { text: 'Genetická štúdia z roku 2023 odhadla na Slovensku asi 1 056 medveďov (1 012 – 1 275).', src: 'TASR / Startitup', url: 'https://www.startitup.sk/stat-ukazal-pravdu-o-medvedoch-nie-su-vobec-premnozene-ukazala-velka-studia/' },
  bins: { text: 'Obce s veľkými šelmami musia mať zabezpečené kontajnerové stojiská a inšpekcia už pokutovala šesť obcí.', src: 'SITA', url: 'https://sita.sk/nasvidiek/kontajnerove-stojiska-su-pred-medvedmi-lepsie-zabezpecene-ako-minule-roky-uviedla-inspekcia/' },
};

ZS.ENDINGS = {
  win: { title: 'Prežil si zimu', text: 'Zaľahol si do brlohu s plným bruchom. Ministerstvo hlási, že medveďa pri Dolnom Strachu „úspešne vyriešilo“.', facts: ['food', 'opinion', 'pop'] },
  starve: { title: 'Zima prišla skôr ako tuk', text: 'Do brlohu si išiel hladný. Aspoň si nikomu nezavadzal.', facts: ['food', 'cull', 'media'] },
  problem: { title: 'Problémový medveď', text: 'Zjedol si od ľudí priveľa a stal sa z teba „problémový medveď“. Titulky sú spokojné, koše pri dedine zostali otvorené.', facts: ['bait', 'food', 'cull'] },
  zone: { title: 'Zóna 500 metrov', text: 'Stačilo podísť k dedine počas mimoriadnej situácie. Kto si bol, nikto nezisťoval.', facts: ['court', 'wrong', 'cull'] },
  cull: { title: 'Jeden z 350', text: 'Mimoriadny zásah do populácie potreboval čísla. Bol si jedno z nich.', facts: ['cull', 'media', 'pop'] },
  poacher: { title: 'Pytliak', text: 'Zastrelil ťa pytliak. Polícia pátra, les mlčí.', facts: ['poach', 'cull', 'food'] },
};
