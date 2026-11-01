(function () {
  const ZS = window.ZS;

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

  ZS.POSES = ['stiff', 'peek', 'sweat', 'hug'];
  ZS.QUIPS = {
    stiff: ['Brucho dnu!', 'Nedýchať…', 'Ja som strom. Ja som strom.', 'Presne ako hovoril minister Strašiak.'],
    peek: ['Len kuknem…', 'Je tam ešte?', 'Kuk!', 'Minister mal pravdu: som za stromom.'],
    sweat: ['Hlavne nekýchnuť.', 'Pot mi tečie až do kožucha.', 'Ešte že to nie je breza.', 'Za každým stromom, vravel minister.'],
    hug: ['Objímam strom. Som ochranár.', 'Tento strom ma chráni lepšie ako zákon.', 'Strom je môj kamoš.', 'Postojačky za stromom, ako na bilborde.'],
    climb: ['Minister vravel za stromom. Ja som na strome.', 'Odtiaľto vidím až na Kriváň.', 'Hore ma nikto nehľadá.', 'Konárik, drž ma.'],
  };

  ZS.NEWS = {
    springStart: 'Začína jar. Medvede vychádzajú z brlohov, politici z tlačoviek.',
    summer: 'Leto: v lese dozreli čučoriedky.',
    mushrooms: 'Začala hubárska sezóna. V lese je plno košíkov.',
    readyForWinter: 'Medveď má dosť tuku na zimu. Zimný brloh je na konci doliny.',
    press: 'Minister Strašiak zvolal tlačovku: „Medveď je za každým stromom!“ Do lesa ide ďalší poľovník.',
    emergency: 'Vláda vyhlásila mimoriadnu situáciu. Poľovníci mieria rýchlejšie a pribudli ďalší.',
    drones: 'Armáda nasadila drony s reflektormi. Pred nimi ťa schová len kmeň.',
    cull: 'Mimoriadny zásah do populácie: 350 kusov. Strieľa sa aj v národnom parku.',
    problem: 'Ministerstvo: medveď pri Dolnom Strachu je problémový. Vyráža zásahový tím.',
    calm: 'Zásahový tím sa stiahol. Medveď sa vrátil do lesa.',
    treeHit: 'Poľovník trafil strom. Ministerstvo hlási úspešný zásah.',
    missed: 'Poľovník minul. Ministerstvo: medveď utekal nezákonne rýchlo.',
    hunterShot: 'Poľovník strieľal na medveďa. Zasiahol hlavne kríky.',
    poacherShot: 'V lese sa strieľalo. Polícia nič nevie.',
    hunterScared: 'Poľovník vrazil do medveďa za stromom a utiekol. Minister: taktický ústup.',
    pickerSeen: 'Hubárka: Videla som medveďa! Bol za stromom.',
    touristSeen: 'Turista natočil medveďa. Video sa šíri.',
    droneSeen: 'Dron zachytil medveďa. Armáda hlási úspech.',
    dogBark: 'Salašnícky čuvač hlási medveďa. Bača: ohradník aj pes fungujú. Minister: aj tak treba strieľať.',
    binEaten: 'Medveď vybral smetné koše. Minister: Dôkaz, že medveďov je priveľa.',
    hiveEaten: 'Včelár z Dolného Strachu prišiel o úľ.',
    containerEaten: 'Medveď vybral hotelový kontajner. Hotel Medvedí raj: vinný je les.',
    wrongbear: 'Biometrický dron identifikoval páchateľa. Zastrelili inú medvedicu. Minister: Problém vyriešený.',
    court: 'Súd: výnimka neurčila, ktorého medveďa. Odstrel je na 15 sekúnd zastavený.',
    meat: 'Štát povolil predaj medvedieho mäsa. Poľovníci zrýchlili krok.',
    feeding: 'Poľovníci založili nové vnadisko. Kukurica voňia až do lesa.',
    poacher: 'V lese sa pohybuje pytliak. Zákony ho nezaujímajú.',
    bins: 'Dolný Strach kúpil zabezpečené koše. Titulky to nezaujíma.',
    census: 'Poslanec Flinta zrátal medvede: 6 000. Rátal aj tiene.',
    constitution: 'Ústavný zákon o medveďovi: medveď sa nesmie odvolať.',
  };

  ZS.LABELS = {
    bang: 'PRÁSK!',
    treeHit: 'Trafil strom!',
    miss: 'Vedľa!',
    missSprint: 'Vedľa! Šprint ťa zachránil.',
    hit: (lives) => 'Zásah do kožucha! Zostáva ' + lives + ' ❤️',
    eaten: (food) => '+' + food.fat + ' ' + food.label,
    wrongBear: '✝ iná medvedica',
    birch: 'Breza ťa neschová!',
    hunterScared: 'Poľovník sa zľakol!',
    pickerSeen: 'Medveď!',
    touristFilm: '📱 Video!',
    droneSeen: 'Dron ťa vidí',
    dogBark: 'Haf! Haf!',
    hideHint: '↓ za strom',
    springDen: 'Jarný brloh',
    winterDen: 'Zimný brloh',
    billboard: ['Medveď je za', 'každým stromom!'],
  };

  ZS.UI = {
    title: 'Za stromom',
    subtitle: 'Satirická hra o medveďovi z Liptova',
    intro: 'Si medveď a musíš prejsť dolinou od jarného brlohu až do zimného. Cestou nažer aspoň 85 % tuku. '
      + 'Poľovníci po tebe mieria zameriavačom a najlepšia šanca je schovať sa za strom.',
    rules: [
      'Keď sa k tebe blíži zameriavač alebo nad tebou svieti <b>!</b>, drž <kbd>↓</kbd> pri hrubom strome. Breza ťa neschová.',
      'Alebo vylez na strom: <kbd>↑</kbd> pri hrubom kmeni. Kým lezieš, vidia ťa; v korune už nie. <kbd>↓</kbd> zlezieš, medzerníkom zoskočíš.',
      'Lesné dobroty zbieraš sám od seba, aj vo výskoku. V korunách starých bukov je divý med.',
      'Koše a úle musíš vybrať zámerne: zastav pri nich na pol sekundy. Práve vtedy si najzraniteľnejší.',
      'Šprint (<kbd>Shift</kbd>) ti pomôže ujsť, ale minie dych aj tuk a poľovníci ho počujú.',
      'Koše, úle a kukurica z vnadiska dajú veľa tuku, ale urobia z teba „problémového medveďa“ a vyrazí po tebe zásahový tím.',
      'Keď ťa niekto uvidí, rastie mediálna panika a s ňou prichádza politika: viac poľovníkov, drony, odstrel.',
    ],
    keys: '<kbd>←</kbd> <kbd>→</kbd> beh · <kbd>Shift</kbd> šprint · medzerník: skok · <kbd>↑</kbd> skok, pri strome lezenie · <kbd>↓</kbd> schovať sa · <kbd>P</kbd> pauza',
    play: 'Hrať',
    again: 'Znova',
    resume: 'Pokračovať',
    disclaimer: 'Postavy, obec aj titulky sú vymyslené. Fakty na konci hry sú skutočné a majú zdroj.',
    pauseTitle: 'Pauza',
    pauseText: 'Medveď čaká za stromom.',
    factsTitle: 'Fakty zo Slovenska',
    goulash: ' A keďže štát povolil predaj mäsa, skončil si ako guláš v tatranskej reštaurácii.',
    stats: { natural: 'jedlo z lesa', human: 'jedlo od ľudí', seen: 'krát ťa videli', fat: 'tuku' },
    untilWinter: 'do zimy',
    behindTree: 'za stromom',
    badges: {
      problem: 'Problémový medveď',
      cull: 'Odstrel 350 ks',
      emergency: 'Mimoriadna situácia',
      drones: 'Drony armády',
      court: (s) => 'Súd: odstrel stojí ' + s + ' s',
      meat: 'Mäso na predaj',
      binsLocked: 'Zabezpečené koše',
    },
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
  };

  ZS.ENDINGS = {
    win: { title: 'Prežil si zimu', text: 'Zaľahol si do brlohu s plným bruchom. Ministerstvo hlási, že medveďa pri Dolnom Strachu „úspešne vyriešilo“.', facts: ['food', 'opinion', 'pop'] },
    starve: { title: 'Zima prišla skôr ako tuk', text: 'Do brlohu si išiel hladný. Aspoň si nikomu nezavadzal.', facts: ['food', 'cull', 'media'] },
    problem: { title: 'Problémový medveď', text: 'Zjedol si od ľudí priveľa a stal sa z teba „problémový medveď“. Titulky sú spokojné, koše pri dedine zostali otvorené.', facts: ['bait', 'food', 'cull'] },
    hunted: { title: 'Vraj problémový medveď', text: 'Poľovník po výstrele vyhlásil, že si bol problémový medveď. Nikto to nekontroloval.', facts: ['court', 'wrong', 'cull'] },
    cull: { title: 'Jeden z 350', text: 'Mimoriadny zásah do populácie potreboval čísla. Bol si jedno z nich.', facts: ['cull', 'media', 'pop'] },
    poacher: { title: 'Pytliak', text: 'Zastrelil ťa pytliak. Polícia pátra, les mlčí.', facts: ['poach', 'cull', 'food'] },
  };
})();
