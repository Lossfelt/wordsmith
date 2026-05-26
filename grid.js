// Initialiserer 10x10 celle-grid og eksponerer delt tilstand

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ';
const SIZE  = 10;
const TOTAL = SIZE * SIZE;

const cells = [];

function randChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

(function initCells() {
  const grid = document.getElementById('grid');
  for (let i = 0; i < TOTAL; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.textContent = randChar();
    grid.appendChild(c);
    cells.push(c);
  }
})();
