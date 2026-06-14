// Plukking – sender bokstaven fra en celle til inventory.
// Mus: klikk på cellen. Touch: lens.js kaller window.pickCell() når fingeren
// løftes (cellen er den som var siktet på i lupen).

(function initPicking() {
  const inventoryEl = document.getElementById('inventory');

  function pickCell(cell) {
    if (!cell || cell.classList.contains('picked')) return;
    const letter = cell.textContent.trim();
    if (!letter) return;

    cell.textContent = '';
    cell.classList.add('picked');

    const item = document.createElement('div');
    item.className = 'inventory-item';
    item.textContent = letter;
    inventoryEl.appendChild(item);
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
