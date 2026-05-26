// Forstørrelsesglasseffekt – oppdaterer scale/brightness per celle
// basert på gaussisk avstandsfunksjon fra musepeker

const MAX_SCALE  = 0.5;   // maks ekstra skalering i senter  (1 + 0.5 = 1.5×)
const SIGMA      = 52;    // gaussisk spredning i piksler (~1.2 cellebredder)
const MAX_BRIGHT = 0.6;   // maks ekstra lysstyrke i senter

let cellCenters = null;

function buildCellCenters() {
  const gridEl   = document.getElementById('grid');
  const gridRect = gridEl.getBoundingClientRect();
  cellCenters = cells.map(c => {
    const r = c.getBoundingClientRect();
    return {
      x: r.left - gridRect.left + r.width  / 2,
      y: r.top  - gridRect.top  + r.height / 2,
    };
  });
}

function updateLens(mouseX, mouseY) {
  if (!cellCenters) buildCellCenters();
  for (let i = 0; i < TOTAL; i++) {
    const dx = mouseX - cellCenters[i].x;
    const dy = mouseY - cellCenters[i].y;
    const g  = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
    cells[i].style.transform = `scale(${(1 + MAX_SCALE  * g).toFixed(4)})`;
    cells[i].style.filter    = `brightness(${(1 + MAX_BRIGHT * g).toFixed(4)})`;
    cells[i].style.zIndex    = Math.round(g * 30);
  }
}

function resetLens() {
  for (const c of cells) {
    c.style.transform = '';
    c.style.filter    = '';
    c.style.zIndex    = '';
  }
}

(function initLens() {
  const gridEl = document.getElementById('grid');
  gridEl.addEventListener('mousemove', e => {
    const rect = gridEl.getBoundingClientRect();
    updateLens(e.clientX - rect.left, e.clientY - rect.top);
  });
  gridEl.addEventListener('mouseleave', resetLens);
  window.addEventListener('resize', () => { cellCenters = null; });
})();
