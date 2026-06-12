// Forstørrelsesglass – avgrenset, sirkulær linse som følger pekeren.
// Innenfor radiusen forstørres cellene og skyves litt utover (mild bule);
// utenfor er de uberørt. En synlig glassring tegnes på pekerposisjonen.

const LENS_CELLS  = 1.7;   // lupens radius målt i celler – skalerer med cellestørrelse
const MAX_MAG     = 0.6;   // maks forstørrelse i senter (scale 1 + 0.6 = 1.6×)
const MAX_BRIGHT  = 0.45;  // maks ekstra lysstyrke i senter
const MAX_BLUR    = 4;     // maks blur i piksler når fog of war er aktiv
const FOG_EDGE    = 10;    // px-bånd ved glasskanten der fog-blur tones inn

const TOUCH_OFFSET_Y = 90; // touch: hvor langt over fingeren linsesentrum legges (px)
const DRAG_THRESHOLD = 8;  // px bevegelse før en touch regnes som dra (ikke trykk)

let cellCenters    = null;
let fogOfWar       = false;
let lastMouseX     = null;
let lastMouseY     = null;
let gestureStartX  = 0;
let gestureStartY  = 0;
let didDrag        = false;
let lensRing       = null;
let lensRadius     = 78;   // px – beregnes fra cellestørrelse i buildCellCenters()

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
  // Skaler lupens radius med cellestørrelsen, så den dekker like mange rader
  // uansett skjerm (desktop ~40px-celler vs. mobil ~28px-celler).
  if (cellCenters.length > 1) {
    const step = cellCenters[1].x - cellCenters[0].x;  // cellebredde + gap
    if (step > 0) lensRadius = LENS_CELLS * step;
  }
  if (lensRing) {
    lensRing.style.width  = (lensRadius * 2) + 'px';
    lensRing.style.height = (lensRadius * 2) + 'px';
  }
}

function updateLens(cx, cy) {
  if (!cellCenters) buildCellCenters();
  lastMouseX = cx;
  lastMouseY = cy;
  const R = lensRadius;
  for (let i = 0; i < TOTAL; i++) {
    // Vektor fra linsesentrum ut til cellen.
    const dx = cellCenters[i].x - cx;
    const dy = cellCenters[i].y - cy;
    const d  = Math.sqrt(dx * dx + dy * dy);
    const t  = d / R;   // 0 i senter, 1 ved kanten, > 1 utenfor

    let g = 0, disp = 0;
    if (t < 1) {
      g = 1 - t;  // full effekt i senter, faller lineært til 0 ved kanten
      // Mild bule: 0 forskyvning i både senter og kant, endelig stigning i
      // senter (ingen «hopp» når nærmeste celle krysser sentrum).
      disp = MAX_MAG * d * (1 - t);
    }
    const mag = 1 + MAX_MAG * g;
    const ux  = d ? dx / d : 0;
    const uy  = d ? dy / d : 0;

    // Fog of war: alt INNENFOR glasset helt klart, full blur utenfor, med et
    // mykt overgangsbånd (FOG_EDGE) helt ytterst ved kanten.
    let blur = '';
    if (fogOfWar) {
      const bt = Math.min(1, Math.max(0, (d - (R - FOG_EDGE)) / FOG_EDGE));
      blur = ` blur(${(MAX_BLUR * bt).toFixed(2)}px)`;
    }

    cells[i].style.transform = `translate(${(ux * disp).toFixed(2)}px, ${(uy * disp).toFixed(2)}px) scale(${mag.toFixed(4)})`;
    cells[i].style.filter    = `brightness(${(1 + MAX_BRIGHT * g).toFixed(4)})${blur}`;
    cells[i].style.zIndex    = Math.round(g * 30);
  }
  if (lensRing) {
    lensRing.style.left    = cx + 'px';
    lensRing.style.top     = cy + 'px';
    lensRing.style.display = 'block';
  }
}

function resetLens() {
  lastMouseX = null;
  lastMouseY = null;
  for (const c of cells) {
    c.style.transform = '';
    c.style.zIndex    = '';
    c.style.filter    = fogOfWar ? `blur(${MAX_BLUR}px)` : '';
  }
  if (lensRing) lensRing.style.display = 'none';
}

function toggleFog() {
  fogOfWar = !fogOfWar;
  if (lastMouseX !== null) {
    updateLens(lastMouseX, lastMouseY);
  } else {
    resetLens();
  }
  return fogOfWar;
}

(function initLens() {
  const gridEl = document.getElementById('grid');

  // Glassringen tegnes som et absolutt plassert barn av grid (som er
  // position: relative). pointer-events: none så den ikke spiser klikk.
  lensRing = document.createElement('div');
  lensRing.className = 'lens-ring';
  lensRing.style.width  = (lensRadius * 2) + 'px';
  lensRing.style.height = (lensRadius * 2) + 'px';
  gridEl.appendChild(lensRing);

  // Pointer events dekker mus (hover), touch (drag) og penn i ett sett lyttere.
  // For mus fyrer pointermove ved hover; for touch kun mens fingeren er nede.

  gridEl.addEventListener('pointerdown', e => {
    gestureStartX = e.clientX;
    gestureStartY = e.clientY;
    didDrag = false;
    // Ny gest → nullstill et eventuelt hengit ignorer-flagg fra en dra
    // som aldri endte i et klikk.
    window.lensIgnoreClick = false;
  });

  gridEl.addEventListener('pointermove', e => {
    const rect = gridEl.getBoundingClientRect();
    let cx = e.clientX - rect.left;
    let cy = e.clientY - rect.top;
    if (e.pointerType !== 'mouse') {
      // Touch/penn: løft linsesentrum over fingeren så den ikke dekkes.
      // Klamp så toppraden fortsatt forstørres når fingeren er nær toppen.
      cy = Math.max(24, cy - TOUCH_OFFSET_Y);
      const dx = e.clientX - gestureStartX;
      const dy = e.clientY - gestureStartY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) didDrag = true;
    }
    updateLens(cx, cy);
  });

  // En touch-dra skal kun posisjonere linsen, ikke plukke. Marker at det
  // påfølgende click-eventet skal ignoreres av plukkingen (inventory.js).
  // Linsen blir stående (ingen reset) så du rekker å sikte og deretter trykke.
  gridEl.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse' && didDrag) window.lensIgnoreClick = true;
  });

  // Mus som forlater grid → nullstill. (For touch fyrer pointerleave også ved
  // løft, men da skal linsen bli stående, så vi nullstiller kun for mus.)
  gridEl.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') resetLens();
  });
  gridEl.addEventListener('pointercancel', resetLens);
  window.addEventListener('resize', () => { cellCenters = null; });
})();
