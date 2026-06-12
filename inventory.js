// Plukking – klikk på celle sender bokstaven til inventory

(function initPicking() {
  const inventoryEl = document.getElementById('inventory');

  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      // En touch-dra (kun posisjonering av linsen) ender også i et click –
      // hopp over plukking i så fall. Flagget settes i lens.js.
      if (window.lensIgnoreClick) { window.lensIgnoreClick = false; return; }
      if (cell.classList.contains('picked')) return;
      const letter = cell.textContent.trim();
      if (!letter) return;

      cell.textContent = '';
      cell.classList.add('picked');

      const item = document.createElement('div');
      item.className = 'inventory-item';
      item.textContent = letter;
      inventoryEl.appendChild(item);
    });
  });
})();
