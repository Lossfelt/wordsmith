// Spillrouter og overordnet tilstand (oppgave 2). Bygger PÅ showScene fra
// scenes.js: showScene gjør lavnivå DOM-toggling, mens Game er høynivå-routeren
// som i tillegg holder spilltilstand (dag, sankested) og kjører onEnter-logikk
// per scene. Lastes SIST i index.html så den overstyrer seamen window.onSearchEnded
// som combat.js/letefase.js ellers ville koblet seg på.
//
// Loop: start → (nytt spill / fortsett) → base → velg sankested → samling →
// kamp → tilbake til base. Retur til basen = ny dag (day++ + nytt grid).
//
// Mye er bevisst skjelett/stubber (base-bygging, sankested-forskjeller, event,
// "fortsett gammelt spill"); de fylles ut i senere oppgaver.

// Lett dev-seam (skive av oppgave 3): et dev-panel med scene-hopp og
// testkontroller vises kun når DEV er på. Byttes til ?dev=1 i oppgave 3.
const DEV = true;

(function initGame() {
  const player = window.player; // helsemodellen eies fortsatt av combat.js

  // Scenene i loopen + gyldige overganger. Ugyldige overganger logges, men
  // blokkeres ikke (dev-vennlig); dev-panelet hopper fritt via {force:true}.
  const SCENES = ['start', 'base', 'site', 'search', 'combat', 'event', 'gameover'];
  const TRANSITIONS = {
    start:    ['base'],
    base:     ['site'],
    site:     ['search'],
    search:   ['combat'],
    combat:   ['base', 'gameover'],
    event:    ['base'],
    gameover: ['start'],
  };

  // Sankested-stubber: tre rulles hver dag. Biom/vær/natt-dag er senere oppgaver;
  // her er det bare navn som alle leder til samme samling-scene.
  const SITE_POOL = [
    'Skogkanten', 'Fjellpasset', 'Den øde stranden', 'Ruinbyen',
    'Myrlandet', 'Dryppsteinhulen', 'Elvedalen', 'Vindsletta',
  ];

  // --- DOM ---
  const baseDayEl     = document.getElementById('baseDay');
  const gameoverDayEl = document.getElementById('gameoverDay');
  const siteOptionsEl = document.getElementById('siteOptions');

  // --- Spilltilstand ---
  const Game = {
    scene: null,
    day:   0,      // base-onEnter gjør day++; nytt spill setter 0 → dag 1
    site:  null,
    sites: [],
    goTo,
  };
  window.Game = Game;

  // --- Router ---
  function goTo(name, opts = {}) {
    const from = Game.scene;
    const ok = from === null || opts.force || (TRANSITIONS[from] || []).includes(name);
    if (!ok) console.warn(`Game: uventet overgang ${from} → ${name} (tillates, men ikke i loop-grafen).`);
    Game.scene = name;
    showScene(name);
    const hook = onEnter[name];
    if (hook) hook();
  }

  // --- onEnter pr. scene ---
  const onEnter = {
    start() {},
    base() {
      Game.day += 1;       // retur til basen = ny dag
      resetGrid();         // friskt grid hver dag; inventory beholdes
      if (baseDayEl) baseDayEl.textContent = Game.day;
    },
    site() {
      Game.sites = rollSites();
      renderSites();
    },
    search() {},           // samling-kontrollene ligger statisk i scenen
    combat() {
      // Trekker fiende + viser kamp. startCombat kaller selv showScene('combat'),
      // så det blir et harmløst dobbelt-kall sammen med goTo over.
      startRandomCombat();
    },
    event() {},
    gameover() {
      if (gameoverDayEl) gameoverDayEl.textContent = Game.day;
    },
  };

  // --- Sankested ---
  function rollSites() {
    const pool = [...SITE_POOL];
    const out  = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  function renderSites() {
    if (!siteOptionsEl) return;
    siteOptionsEl.innerHTML = '';
    Game.sites.forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'site-option';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        Game.site = name;
        goTo('search');
      });
      siteOptionsEl.appendChild(btn);
    });
  }

  // --- Nytt spill ---
  // Nullstiller helse + inventory og setter dag = 0; base-onEnter løfter til dag 1.
  function newGame() {
    player.health = player.maxHealth;
    Inventory.clear();
    Game.day = 0;
    goTo('base');
  }

  // --- Seams: game.js eier dem nå (overstyrer combat.js' oppgave 5-simulering) ---
  // Naturlig slutt på letefasen → kamp. Manuell "Stopp letefasen" kaller ikke denne.
  window.onSearchEnded = () => goTo('combat');
  // Etter kamp: død → game over, ellers tilbake til basen (ny dag).
  window.onCombatExit  = () => goTo(player.health <= 0 ? 'gameover' : 'base');

  // --- Scene-knapper ---
  function wireClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }
  wireClick('btnNewGame', newGame);
  wireClick('btnGoSite', () => goTo('site'));
  wireClick('btnEventContinue', () => goTo('base'));
  wireClick('btnToStart', () => goTo('start'));

  // --- Dev-panel (lett skive av oppgave 3) ---
  function initDevPanel() {
    const panel = document.getElementById('devPanel');
    if (panel) panel.hidden = false;

    // Scene-hopp: én knapp pr. scene, tvinger overgangen (utenfor loop-grafen).
    const devScenes = document.getElementById('devScenes');
    if (devScenes) {
      SCENES.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'dev-scene-btn';
        btn.textContent = name;
        btn.addEventListener('click', () => goTo(name, { force: true }));
        devScenes.appendChild(btn);
      });
    }

    // "Test kamp": flyttet hit fra combat.js. Deaktivert til ordboka er lastet.
    const btnTest = document.getElementById('btnTestCombat');
    if (btnTest) {
      const baseLabel = btnTest.textContent;
      btnTest.disabled = true;
      btnTest.textContent = 'Laster ordbok…';
      Dict.onReady(() => {
        btnTest.disabled = false;
        btnTest.textContent = baseLabel;
      });
      btnTest.addEventListener('click', startRandomCombat);
    }
  }
  if (DEV) initDevPanel();

  // --- Boot ---
  goTo('start');
})();
