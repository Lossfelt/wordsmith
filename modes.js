// Modusstyr: variant A / B / C og tilhørende parametere

// --- Justerbare parametere ---
let intervalA = 1000;
let intervalB = 1000;
let ttlMin    = 1000;
let ttlMax    = 5000;

// --- Intern tilstand ---
let timer      = null;
let cellTimers = [];
let mode       = null;

// --- Hjelpefunksjoner ---
function randTTL() {
  return ttlMin + Math.random() * (ttlMax - ttlMin);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  for (const t of cellTimers) clearTimeout(t);
  cellTimers = [];
}

function scheduleCellC(idx) {
  cellTimers[idx] = setTimeout(() => {
    if (mode !== 'C') return;
    cells[idx].textContent = randChar();
    scheduleCellC(idx);
  }, randTTL());
}

function setMode(newMode) {
  stop();
  mode = newMode;

  document.getElementById('btnA').classList.toggle('active', mode === 'A');
  document.getElementById('btnB').classList.toggle('active', mode === 'B');
  document.getElementById('btnC').classList.toggle('active', mode === 'C');

  const statusEl = document.getElementById('status');

  if (mode === 'A') {
    statusEl.textContent = `Variant A: bytter alle hvert ${intervalA} ms`;
    timer = setInterval(() => {
      for (const c of cells) c.textContent = randChar();
    }, intervalA);

  } else if (mode === 'B') {
    statusEl.textContent = `Variant B: bytter ett tilfeldig hvert ${intervalB} ms`;
    timer = setInterval(() => {
      cells[Math.floor(Math.random() * TOTAL)].textContent = randChar();
    }, intervalB);

  } else if (mode === 'C') {
    statusEl.textContent = `Variant C: TTL ${ttlMin}–${ttlMax} ms per celle`;
    for (let i = 0; i < TOTAL; i++) scheduleCellC(i);

  } else {
    statusEl.textContent = 'Variant: ingen';
  }
}

// --- Slider-håndtering ---
(function initSliders() {
  function wire(sliderId, valId, getVar, setVar, onChange) {
    const slider = document.getElementById(sliderId);
    const label  = document.getElementById(valId);
    slider.addEventListener('input', () => {
      setVar(+slider.value);
      label.textContent = getVar();
      onChange();
    });
  }

  wire('aInterval', 'aIntervalVal',
    () => intervalA,
    v  => { intervalA = v; },
    () => { if (mode === 'A') setMode('A'); }
  );

  wire('bInterval', 'bIntervalVal',
    () => intervalB,
    v  => { intervalB = v; },
    () => { if (mode === 'B') setMode('B'); }
  );

  const sliderCMin = document.getElementById('cMin');
  const sliderCMax = document.getElementById('cMax');
  const valCMin    = document.getElementById('cMinVal');
  const valCMax    = document.getElementById('cMaxVal');

  sliderCMin.addEventListener('input', () => {
    ttlMin = +sliderCMin.value;
    if (ttlMax <= ttlMin) {
      ttlMax = Math.min(ttlMin + 100, 10000);
      sliderCMax.value = ttlMax;
      valCMax.textContent = ttlMax;
    }
    valCMin.textContent = ttlMin;
    if (mode === 'C') setMode('C');
  });

  sliderCMax.addEventListener('input', () => {
    ttlMax = +sliderCMax.value;
    if (ttlMin >= ttlMax) {
      ttlMin = Math.max(ttlMax - 100, 100);
      sliderCMin.value = ttlMin;
      valCMin.textContent = ttlMin;
    }
    valCMax.textContent = ttlMax;
    if (mode === 'C') setMode('C');
  });
})();

// --- Knapper ---
document.getElementById('btnA').addEventListener('click', () => setMode('A'));
document.getElementById('btnB').addEventListener('click', () => setMode('B'));
document.getElementById('btnC').addEventListener('click', () => setMode('C'));
document.getElementById('btnStop').addEventListener('click', () => setMode(null));
