// Plukking – teller opp bokstaven fra en celle i inventory-linjen.
// Mus: klikk på cellen. Touch: lens.js kaller window.pickCell() når fingeren
// løftes (cellen er den som var siktet på i lupen).

(function initPicking() {
  const inventoryEl = document.getElementById('inventory');

  // Bygg én fast linje med hele alfabetet. Hver bokstav er grå til den plukkes.
  const letterItems = {}; // bokstav -> { item, countEl, count }

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

    letterItems[letter] = { item, countEl, count: 0 };
  }

  function pickCell(cell) {
    if (!cell || cell.classList.contains('picked')) return;
    const letter = cell.textContent.trim();
    if (!letter) return;

    cell.textContent = '';
    cell.classList.add('picked');

    const entry = letterItems[letter];
    if (!entry) return;
    entry.count += 1;
    entry.item.classList.add('has');
    entry.countEl.textContent = entry.count;

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
