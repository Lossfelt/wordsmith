// Kamp (oppgave 4). startCombat(enemyWord) viser kamp-scenen: du bygger et ord
// av bokstavene du eier og sammenligner ordverdi (Scrabble) mot fiendens styrke.
//
// Regler (v1):
//  - Spilleren har 100 helse (window.player).
//  - Vinn (ditt ord >= fiende): 1–2 av ordets bokstaver dør, resten beholdes,
//    du får 0–1 av fiendens bokstaver, ingen skade.
//  - Tap (ditt ord < fiende): 70–80 % av ordets bokstaver dør, du tar
//    (fiendestyrke − ordverdi) skade.
//  - Flykt: du mister ALLE bokstaver og tar max(0, fiendestyrke − inventarverdi).
//  - Uavgjort teller som seier (spillerfordel).
//
// Bygging bruker en arbeidskopi av inventaret (`pool`); ekte Inventory røres
// først ved resolusjon (kun døde bokstaver fjernes, ev. fiendebokstav legges
// til). Det bygde ordet valideres strengt mot ordboka (window.Dict) før angrep.

// --- Parametere ---
// Scrabble-verdier, norsk sett (Norsk Scrabbleforbund). Q/X/Z er ikke i det
// norske settet; de får høye verdier her siden de likevel kan dukke opp i grid.
const LETTER_VALUES = {
  A: 1, B: 4, C: 10, D: 1, E: 1, F: 2, G: 2, H: 3, I: 1, J: 4, K: 2, L: 1, M: 2,
  N: 1, O: 2, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 4, V: 4, W: 8, X: 8, Y: 6, Z: 10,
  Æ: 6, Ø: 5, Å: 4,
};
// --- Spillertilstand ---
window.player = { health: 100, maxHealth: 100 };

function letterValue(letter) { return LETTER_VALUES[letter] || 0; }
function wordValue(letters)  { return letters.reduce((sum, l) => sum + letterValue(l), 0); }

(function initCombat() {
  const player = window.player;

  // --- DOM ---
  const enemyWordEl     = document.getElementById('enemyWord');
  const enemyStrengthEl = document.getElementById('enemyStrength');
  const healthFillEl    = document.getElementById('healthFill');
  const healthNumEl     = document.getElementById('healthNum');
  const wordEl          = document.getElementById('combatWord');
  const wordValueEl     = document.getElementById('wordValue');
  const poolEl          = document.getElementById('combatPool');
  const sortEl          = document.getElementById('combatSort');
  const btnAttack       = document.getElementById('btnAttack');
  const btnFlee         = document.getElementById('btnFlee');
  const invalidEl       = document.getElementById('combatInvalid');
  const resultEl        = document.getElementById('combatResult');
  const resultTextEl    = document.getElementById('combatResultText');
  const changesEl       = document.getElementById('combatResultChanges');
  const btnBack         = document.getElementById('btnCombatBack');

  // --- Kamptilstand ---
  let enemy    = [];     // fiendeordets bokstaver
  let strength = 0;      // fiendens styrke (ordverdi)
  let pool     = {};     // arbeidskopi: bokstav -> tilgjengelig antall
  let built    = [];     // bokstavene i ordet du bygger (i rekkefølge)
  let resolved = false;  // true etter angrep/flykt – bygging er da låst
  let sortMode = 'alpha';// pool-sortering: 'alpha' | 'value' | 'split'
  let roster   = [];     // bokstaver som vises i poolen (eid ved start + vunnet)

  function randInt(min, max) { // inklusiv begge ender
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // --- Rendering ---
  function renderHealth() {
    const hp = Math.max(0, player.health);
    healthFillEl.style.width = (hp / player.maxHealth * 100) + '%';
    healthNumEl.textContent = `${hp} / ${player.maxHealth}`;
  }

  function makeTile(letter, withCount) {
    const tile = document.createElement('button');
    tile.className = 'combat-tile';
    let html = `<span class="combat-tile-letter">${letter}</span>` +
               `<span class="combat-tile-val">${letterValue(letter)}</span>`;
    if (withCount != null) html += `<span class="combat-tile-count">${withCount}</span>`;
    tile.innerHTML = html;
    return tile;
  }

  function renderPool() {
    poolEl.innerHTML = '';
    // Splitt-modus bryter konsonanter/vokaler på to linjer via flex-order (CSS).
    poolEl.classList.toggle('split', sortMode === 'split');

    // Behold alle bokstaver som har vært tilgjengelige i kampen (eid ved start
    // eller vunnet) i rosteret, så en brikke ikke forsvinner når antallet når
    // 0 – den gråes ut i stedet. Rosteret vokser, men tømmes aldri her.
    for (const letter of CHARS) {
      if ((pool[letter] || 0) > 0 && !roster.includes(letter)) roster.push(letter);
    }

    // CHARS-rekkefølgen er alfabetet (Æ/Ø/Å sist). 'alpha'/'split' følger den;
    // 'value' sorterer synkende på Scrabble-verdi med alfabetisk som tie-break.
    const alphaIdx = l => CHARS.indexOf(l);
    const letters = [...roster];
    if (sortMode === 'value') {
      letters.sort((a, b) => letterValue(b) - letterValue(a) || alphaIdx(a) - alphaIdx(b));
    } else {
      letters.sort((a, b) => alphaIdx(a) - alphaIdx(b));
    }

    for (const letter of letters) {
      const n = pool[letter] || 0;
      const tile = makeTile(letter, n);
      if (VOWELS.includes(letter)) tile.classList.add('vowel'); // brukes kun i splitt-modus
      // Tom (n=0) eller etter resolusjon: brikken låses. Tom gråes ut.
      if (n <= 0 || resolved) {
        tile.disabled = true;
        if (n <= 0) tile.classList.add('depleted');
      } else {
        tile.addEventListener('click', () => addToWord(letter));
      }
      poolEl.appendChild(tile);
    }
  }

  function renderWord() {
    wordEl.innerHTML = '';
    built.forEach((letter, i) => {
      const tile = makeTile(letter, null);
      tile.addEventListener('click', () => removeFromWord(i));
      wordEl.appendChild(tile);
    });
    wordValueEl.textContent = wordValue(built);
    btnAttack.disabled = built.length === 0;
  }

  // Inline-melding når ordet ikke er gyldig (vises ved angrepsforsøk, skjules
  // så snart ordet endres). Påvirker ikke poolen eller resolusjonen.
  function showInvalid(msg) {
    if (!invalidEl) return;
    invalidEl.textContent = msg;
    invalidEl.hidden = false;
  }
  function hideInvalid() {
    if (invalidEl) invalidEl.hidden = true;
  }

  // --- Bygging ---
  function addToWord(letter) {
    if (resolved) return;
    if ((pool[letter] || 0) <= 0) return;
    pool[letter] -= 1;
    built.push(letter);
    hideInvalid();
    renderPool();
    renderWord();
  }

  function removeFromWord(index) {
    if (resolved) return;
    const letter = built.splice(index, 1)[0];
    pool[letter] = (pool[letter] || 0) + 1;
    hideInvalid();
    renderPool();
    renderWord();
  }

  // Frisk arbeidskopi av inventaret (ekte Inventory røres ved resolusjon).
  function syncPool() {
    pool = {};
    for (const letter of CHARS) pool[letter] = Inventory.get(letter);
  }

  // Tydelige tapt/vunnet-linjer i resultatpanelet.
  function renderChanges(lost, gained) {
    changesEl.innerHTML = '';
    if (lost.length) {
      const el = document.createElement('div');
      el.className = 'combat-change lost';
      el.textContent = `Tapt: ${lost.join(', ')}`;
      changesEl.appendChild(el);
    }
    if (gained.length) {
      const el = document.createElement('div');
      el.className = 'combat-change gained';
      el.textContent = `Vunnet: ${gained.join(', ')}`;
      changesEl.appendChild(el);
    }
  }

  // Velg `count` tilfeldige indekser fra ordet (uten gjentakelse).
  function pickDeadIndices(count) {
    const idx = built.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, count);
  }

  function inventoryValue() {
    let sum = 0;
    for (const letter of CHARS) sum += Inventory.get(letter) * letterValue(letter);
    return sum;
  }

  // --- Resolusjon ---
  function attack() {
    if (!built.length) return;

    // Streng validering: ordet må være et gyldig ord i ordboka for å angripe.
    // Ved ugyldig ord blokkeres angrepet, ordet beholdes, og en melding vises.
    const word = built.join('');
    if (!Dict.isValid(word)) {
      showInvalid(`«${word}» er ikke et gyldig ord.`);
      return;
    }
    hideInvalid();

    const playerVal = wordValue(built);
    const win = playerVal >= strength;

    let deadCount, damage = 0, gained = null;

    if (win) {
      deadCount = Math.min(randInt(1, 2), built.length);
      if (randInt(0, 1) === 1 && enemy.length) {
        gained = enemy[Math.floor(Math.random() * enemy.length)];
      }
    } else {
      const frac = 0.7 + Math.random() * 0.1; // 70–80 %
      deadCount = Math.min(Math.max(1, Math.round(built.length * frac)), built.length);
      damage = Math.max(0, strength - playerVal);
    }

    // De døde bokstavene fjernes fra ekte inventar; resten ble aldri fjernet.
    const dead = pickDeadIndices(deadCount).map(i => built[i]);
    dead.forEach(letter => Inventory.remove(letter, 1));
    if (gained) Inventory.add(gained, 1);
    if (damage) player.health -= damage;

    finish(win, { playerVal, dead, damage, gained });
  }

  function flee() {
    const totalVal = inventoryValue();
    const left     = Inventory.total();
    const damage   = Math.max(0, strength - totalVal);
    Inventory.clear();
    if (damage) player.health -= damage;
    finish(null, { fled: true, totalVal, damage, left });
  }

  function plural(n) { return n === 1 ? '' : 'er'; }

  function finish(win, info) {
    resolved = true;
    renderHealth();
    btnAttack.disabled = true;
    btnFlee.disabled = true;

    let msg;
    if (info.fled) {
      msg = `Du flyktet og etterlot ${info.left} bokstav${plural(info.left)} (verdi ${info.totalVal}). `;
      msg += info.damage ? `Du tok ${info.damage} skade.` : 'Du slapp unna uten skade.';
    } else if (win) {
      msg = `Du vant! Ordet ditt (${info.playerVal}) slo fienden (${strength}).`;
    } else {
      msg = `Du tapte. Ordet ditt (${info.playerVal}) tapte mot fienden (${strength}). Du tok ${info.damage} skade.`;
    }

    if (player.health <= 0) {
      player.health = 0;
      renderHealth();
      msg += ' Du døde.';
      // TODO: game over-scene. Foreløpig friskmeldes spilleren ved neste kamp.
    }

    resultTextEl.textContent = msg;

    // Tapt/vunnet vises som fargede linjer (ikke for flykt – kan bli mange).
    renderChanges(info.fled ? [] : info.dead, info.gained ? [info.gained] : []);

    // Tegn poolen på nytt fra oppdatert inventar, så vunnet bokstav dukker opp
    // og døde er borte. Ordet tømmes og bygging er låst (resolved).
    syncPool();
    built = [];
    renderWord();
    renderPool();

    resultEl.hidden = false;
  }

  // --- Start / avslutt ---
  function startCombat(enemyWord) {
    const word = enemyWord.toUpperCase();
    enemy    = [...word];
    strength = wordValue(enemy);
    resolved = false;
    roster   = [];

    syncPool();
    built = [];

    enemyWordEl.textContent     = word;
    enemyStrengthEl.textContent = strength;

    if (player.health <= 0) player.health = player.maxHealth; // frisk start etter død (v1)
    renderHealth();
    renderPool();
    renderWord();

    btnFlee.disabled = false;
    resultEl.hidden  = true;
    hideInvalid();

    showScene('combat');
  }
  window.startCombat = startCombat;

  // --- Knapper ---
  btnAttack.addEventListener('click', attack);
  btnFlee.addEventListener('click', flee);
  btnBack.addEventListener('click', () => {
    Inventory.render();
    showScene('search');
  });

  // Sortering av poolen. Beholdes mellom kamper.
  sortEl.addEventListener('click', e => {
    const btn = e.target.closest('.combat-sort-btn');
    if (!btn) return;
    sortMode = btn.dataset.sort;
    [...sortEl.children].forEach(b => b.classList.toggle('active', b === btn));
    renderPool();
  });

  // Midlertidig test-knapp (til oppgave 5 kobler letefase -> kamp). Fienden
  // trekkes fra ordboka via Dict.randomEnemy med min/maks-lengde fra test-
  // kontrollene. Knappen er deaktivert til ordboka er lastet (Dict.ready).
  const btnTest = document.getElementById('btnTestCombat');
  const minLenEl = document.getElementById('enemyMinLen');
  const maxLenEl = document.getElementById('enemyMaxLen');

  function readLenRange() {
    let lo = parseInt(minLenEl && minLenEl.value, 10);
    let hi = parseInt(maxLenEl && maxLenEl.value, 10);
    if (!Number.isFinite(lo)) lo = Dict.minLength;
    if (!Number.isFinite(hi)) hi = Dict.maxLength;
    return { minLen: lo, maxLen: hi };
  }

  if (btnTest) {
    const baseLabel = btnTest.textContent;
    btnTest.disabled = true;
    btnTest.textContent = 'Laster ordbok…';
    Dict.onReady(() => {
      btnTest.disabled = false;
      btnTest.textContent = baseLabel;
    });
    btnTest.addEventListener('click', () => {
      if (!Dict.ready) return;
      const enemyWord = Dict.randomEnemy(readLenRange());
      if (!enemyWord) {
        alert('Fant ingen fiendeord i valgt lengdeintervall.');
        return;
      }
      startCombat(enemyWord);
    });
  }
})();
