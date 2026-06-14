// Forstørrelsesglass – avgrenset, sirkulær linse som følger pekeren.
// Innenfor radiusen forstørres cellene og skyves litt utover (mild bule);
// utenfor er de uberørt. En synlig glassring tegnes på pekerposisjonen.

const LENS_CELLS  = 1.7;   // lupens radius målt i celler – skalerer med cellestørrelse
const MAX_MAG     = 0.6;   // maks forstørrelse i senter (scale 1 + 0.6 = 1.6×)
const MAX_BRIGHT  = 0.45;  // maks ekstra lysstyrke i senter

const TOUCH_OFFSET_Y = 90; // touch: hvor langt over fingeren linsesentrum legges (px)

let cellCenters    = null;
let fogOfWar       = false;
let lastMouseX     = null;
let lastMouseY     = null;
let lensRing       = null;
let fogOverlay     = null;  // ett backdrop-filter-overlegg som blurrer alt utenfor lupen
let lensRadius     = 78;   // px – beregnes fra cellestørrelse i buildCellCenters()
let aiming         = false; // true mens en touch sikter (viser sikte i lupen)
let targetCell     = null;  // cellen som plukkes når fingeren løftes
let affectedCells  = null;  // Set av celler lupen rørte forrige frame (ytelse)
let rafId          = null;  // requestAnimationFrame-id for å koalescere pointermove
let pendingX       = 0;
let pendingY       = 0;

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

// Hvileverdi på ALLE celler (transform/zIndex/filter nullstilt). Cellene blurres
// ikke lenger hver for seg – fog håndteres av ett backdrop-filter-overlegg.
function applyRestingAll() {
  for (const c of cells) {
    c.style.transform = '';
    c.style.zIndex    = '';
    c.style.filter    = '';
  }
  affectedCells = null;
}

// Plasser/oppdater fog-overlegget. Hullet (CSS-maske) ligger på lupesenteret når
// lupen er aktiv; uten aktiv lupe settes hull-radius til 0 så hele griddet blurres.
function updateFog() {
  if (!fogOverlay) return;
  if (!fogOfWar) { fogOverlay.style.display = 'none'; return; }
  fogOverlay.style.display = 'block';
  if (lastMouseX !== null) {
    fogOverlay.style.setProperty('--lx', lastMouseX + 'px');
    fogOverlay.style.setProperty('--ly', lastMouseY + 'px');
    fogOverlay.style.setProperty('--lr', lensRadius + 'px');
  } else {
    fogOverlay.style.setProperty('--lr', '0px');
  }
}

function updateLens(cx, cy) {
  if (!cellCenters) buildCellCenters();
  lastMouseX = cx;
  lastMouseY = cy;
  const R  = lensRadius;
  const R2 = R * R;
  let nearestIdx = -1, nearestD = Infinity;
  const active = new Set();

  for (let i = 0; i < TOTAL; i++) {
    // Vektor fra linsesentrum ut til cellen.
    const dx = cellCenters[i].x - cx;
    const dy = cellCenters[i].y - cy;
    const d2 = dx * dx + dy * dy;
    // Celler utenfor lupen er identiske med hvileverdien (g=0, full/ingen blur)
    // og røres ikke her – det er nettopp det som gjør fog flytende på mobil.
    if (d2 >= R2) continue;
    const d = Math.sqrt(d2);
    const t = d / R;   // 0 i senter, 1 ved kanten

    // Sikte: hold rede på nærmeste plukkbare celle til lupesenteret.
    if (aiming && d < nearestD && !cells[i].classList.contains('picked') && cells[i].textContent.trim()) {
      nearestD = d;
      nearestIdx = i;
    }

    const g = 1 - t;  // full effekt i senter, faller lineært til 0 ved kanten
    // Mild bule: 0 forskyvning i både senter og kant, endelig stigning i
    // senter (ingen «hopp» når nærmeste celle krysser sentrum).
    const disp = MAX_MAG * d * (1 - t);
    const mag  = 1 + MAX_MAG * g;
    const ux   = d ? dx / d : 0;
    const uy   = d ? dy / d : 0;

    cells[i].style.transform = `translate(${(ux * disp).toFixed(2)}px, ${(uy * disp).toFixed(2)}px) scale(${mag.toFixed(4)})`;
    cells[i].style.filter    = `brightness(${(1 + MAX_BRIGHT * g).toFixed(4)})`;
    cells[i].style.zIndex    = Math.round(g * 30);
    active.add(i);
  }

  // Tilbakestill kun cellene som forlot lupen siden forrige frame.
  if (affectedCells) {
    affectedCells.forEach(i => {
      if (!active.has(i)) {
        cells[i].style.transform = '';
        cells[i].style.zIndex    = '';
        cells[i].style.filter    = '';
      }
    });
  }
  affectedCells = active;

  // Flytt fog-hullet til lupesenteret (ett stilskriv, ikke per celle).
  updateFog();

  // Oppdater sikte-markeringen (kun under touch-sikting).
  const newTarget = (aiming && nearestIdx >= 0) ? cells[nearestIdx] : null;
  if (targetCell && targetCell !== newTarget) targetCell.classList.remove('lens-target');
  if (newTarget) newTarget.classList.add('lens-target');
  targetCell = newTarget;

  if (lensRing) {
    lensRing.style.left    = cx + 'px';
    lensRing.style.top     = cy + 'px';
    lensRing.style.display = 'block';
    lensRing.classList.toggle('aiming', aiming);
  }
}

function resetLens() {
  lastMouseX = null;
  lastMouseY = null;
  aiming = false;
  if (targetCell) { targetCell.classList.remove('lens-target'); targetCell = null; }
  applyRestingAll();
  if (lensRing) {
    lensRing.style.display = 'none';
    lensRing.classList.remove('aiming');
  }
  // Uten aktiv lupe: hele griddet blurres hvis fog er på, ellers skjules overlegget.
  updateFog();
}

function toggleFog() {
  fogOfWar = !fogOfWar;
  updateFog();
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

  // Ett overlegg som blurrer hele griddet (én GPU-operasjon via backdrop-filter),
  // med et sirkulært hull (CSS-maske) der lupen er. Mye billigere enn å blurre
  // hver celle for seg. pointer-events: none så det ikke spiser klikk.
  fogOverlay = document.createElement('div');
  fogOverlay.className = 'fog-overlay';
  gridEl.appendChild(fogOverlay);

  // Pointer events dekker mus (hover), touch (sikting) og penn i ett sett lyttere.
  // For mus fyrer pointermove ved hover; for touch fra fingeren settes ned til
  // den løftes. Mus plukker ved klikk; touch plukker når fingeren løftes.

  // Regn ut lupesentrum fra et peker-event. For touch/penn løftes sentrum over
  // fingeren (klampet ved toppen) så fingeren ikke dekker det forstørrede.
  function lensCenter(e, rect) {
    const cx = e.clientX - rect.left;
    let   cy = e.clientY - rect.top;
    if (e.pointerType !== 'mouse') cy = Math.max(24, cy - TOUCH_OFFSET_Y);
    return [cx, cy];
  }

  // Koalescér pekerbevegelser til én oppdatering per frame (touch kan fyre
  // oftere enn skjermen oppdaterer).
  function scheduleUpdate(cx, cy) {
    pendingX = cx;
    pendingY = cy;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => { rafId = null; updateLens(pendingX, pendingY); });
    }
  }

  gridEl.addEventListener('pointerdown', e => {
    // Touch: vis lupe + sikte med en gang fingeren settes ned, så man ser hva
    // man kommer til å plukke før man løfter.
    if (e.pointerType !== 'mouse') {
      aiming = true;
      const [cx, cy] = lensCenter(e, gridEl.getBoundingClientRect());
      updateLens(cx, cy);
    }
  });

  gridEl.addEventListener('pointermove', e => {
    aiming = e.pointerType !== 'mouse';
    const [cx, cy] = lensCenter(e, gridEl.getBoundingClientRect());
    scheduleUpdate(cx, cy);
  });

  // Touch: plukk cellen vi siktet på når fingeren løftes. Sett lensIgnoreClick
  // så det syntetiske click-eventet etterpå ikke plukker en gang til. Lupen blir
  // stående (ingen reset), men siktet slås av til neste gang fingeren settes ned.
  gridEl.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse') return;
    if (window.pickCell && targetCell) window.pickCell(targetCell);
    window.lensIgnoreClick = true;
    if (targetCell) { targetCell.classList.remove('lens-target'); targetCell = null; }
    aiming = false;
    if (lensRing) lensRing.classList.remove('aiming');
  });

  // Mus som forlater grid → nullstill. (For touch fyrer pointerleave også ved
  // løft, men da skal lupen bli stående, så vi nullstiller kun for mus.)
  gridEl.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') resetLens();
  });
  gridEl.addEventListener('pointercancel', resetLens);
  window.addEventListener('resize', () => { cellCenters = null; });
})();
