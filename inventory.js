// Inventory – delt tilstand for bokstavene spilleren eier. Letefasen plukker
// bokstaver hit (teller opp), og kampen (combat.js) leser og bruker dem opp.
// Tellingene ligger i window.Inventory.counts; render() tegner letefase-linja
// (hele alfabetet, grå til plukket) fra counts, slik at forbruk i kamp speiles
// tilbake hit.
//
// Mus: klikk på cellen. Touch: lens.js kaller window.pickCell() når fingeren
// løftes (cellen er den som var siktet på i lupen).

(function initInventory() {
  const inventoryEl = document.getElementById('inventory');

  const counts    = {}; // bokstav -> antall
  const letterEls = {}; // bokstav -> { item, countEl }
  for (const letter of CHARS) counts[letter] = 0;

  // Bygg én fast linje med hele alfabetet. Hver bokstav er grå til den plukkes.
  for (const letter of CHARS) {
    const item = document.createElement('div');
    item.className = 'inventory-item';
    // Vokaler havner på egen linje under konsonantene (styres i style.css).
    if (VOWELS.includes(letter)) item.classList.add('vowel');

    const letterEl = document.createElement('div');
    letterEl.className = 'inventory-letter';
    letterEl.textContent = letter;

    const countEl = document.createElement('div');
    countEl.className = 'inventory-count';

    item.appendChild(letterEl);
    item.appendChild(countEl);
    inventoryEl.appendChild(item);

    letterEls[letter] = { item, countEl };
  }

  // Tegner letefase-linja fra counts. Kalles ved hver endring.
  function render() {
    for (const letter of CHARS) {
      const n = counts[letter];
      const { item, countEl } = letterEls[letter];
      item.classList.toggle('has', n > 0);
      countEl.textContent = n > 0 ? n : '';
    }
  }

  // Delt API – combat.js leser/bruker, letefasen og pickCell legger til.
  const Inventory = {
    counts,
    get(letter) { return counts[letter] || 0; },
    add(letter, n = 1) {
      if (!(letter in counts)) return;
      counts[letter] += n;
      render();
    },
    remove(letter, n = 1) {
      if (!(letter in counts)) return;
      counts[letter] = Math.max(0, counts[letter] - n);
      render();
    },
    total() {
      let sum = 0;
      for (const letter of CHARS) sum += counts[letter];
      return sum;
    },
    clear() {
      for (const letter of CHARS) counts[letter] = 0;
      render();
    },
    render,
  };
  window.Inventory = Inventory;

  function pickCell(cell) {
    if (!cell || cell.classList.contains('picked')) return;
    const letter = cell.textContent.trim();
    if (!letter) return;

    cell.textContent = '';
    cell.classList.add('picked');

    Inventory.add(letter);

    // Varsle ev. lyttere (f.eks. letefasen, som trekker fra tid pr. plukk).
    if (window.onLetterPicked) window.onLetterPicked(letter);
  }
  // Eksponeres så lens.js kan plukke den siktede cellen ved touch-løft.
  window.pickCell = pickCell;

  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      // På touch plukkes det ved løft (lens.js), og det syntetiske click-eventet
      // etterpå skal ignoreres. Flagget settes i lens.js.
      if (window.lensIgnoreClick) { window.lensIgnoreClick = false; return; }
      pickCell(cell);
    });
  });
})();
