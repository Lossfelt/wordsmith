// Ordbok (oppgave 6a). Henter en norsk ordliste ved oppstart og eksponerer
// window.Dict for (1) streng validering av spillerens bygde ord og (2) uttrekk
// av fiendeord fra HELE ordboka via en konfigurerbar utvelgelseslogikk.
//
// Ordlistekilde: words-no.txt er filtrert fra «Norsk ordbank – bokmål 2005»
// (Universitetet i Bergen / Språkbanken), lisensiert under CC-BY 4.0. Kun rene
// bokstavord i spillalfabetet er beholdt (ingen bindestrek, tall eller tegnsetting).
//
// API:
//   Dict.ready                 – true når ordlista er lastet
//   Dict.onReady(cb)           – kall cb når klar (umiddelbart hvis allerede klar)
//   Dict.isValid(word)         – streng: er ordet et gyldig ord i ordboka?
//   Dict.randomEnemy(criteria) – trekk et fiendeord. criteria er et objekt så
//                                logikken kan vokse; nå støttes { minLen, maxLen }.
//   Dict.minLength/maxLength   – tilgjengelig lengdeintervall i ordboka
//   Dict.size                  – antall ord

// --- Parametere ---
const DICT_URL = 'words-no.txt';

window.Dict = (function initDict() {
  const words   = new Set();   // alle ord (STORE bokstaver) – brukes til validering
  const byLength = new Map();  // lengde -> array av ord (STORE) – fiendeuttrekk
  let ready = false;
  let minLength = 0, maxLength = 0;
  const readyCallbacks = [];

  function flushReady() {
    ready = true;
    while (readyCallbacks.length) readyCallbacks.shift()();
  }

  function ingest(text) {
    const lens = [];
    for (const line of text.split(/\r?\n/)) {
      const w = line.trim();
      if (!w) continue;
      const up = w.toUpperCase();
      if (words.has(up)) continue;
      words.add(up);
      const len = up.length;
      let bucket = byLength.get(len);
      if (!bucket) { bucket = []; byLength.set(len, bucket); lens.push(len); }
      bucket.push(up);
    }
    const allLens = [...byLength.keys()];
    minLength = allLens.length ? Math.min(...allLens) : 0;
    maxLength = allLens.length ? Math.max(...allLens) : 0;
  }

  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  // Streng validering: ordet må stå i ordboka (eksakt, store/små spiller ingen rolle).
  function isValid(word) {
    if (!ready || !word) return false;
    return words.has(String(word).toUpperCase());
  }

  // Trekk et tilfeldig fiendeord fra hele ordboka, begrenset av criteria.
  // Nå: { minLen, maxLen }. Utvidbar senere (bokstavtyper, boss = svært lange ord).
  // Vekting er jevn over ord (lengre lengdebøtter inneholder flere ord), slik at
  // hvert gyldige ord i intervallet er like sannsynlig. Returnerer null hvis ikke
  // klar eller ingen ord finnes i intervallet.
  function randomEnemy(criteria) {
    if (!ready) return null;
    const c = criteria || {};
    let lo = c.minLen != null ? c.minLen : minLength;
    let hi = c.maxLen != null ? c.maxLen : maxLength;
    if (lo > hi) { const t = lo; lo = hi; hi = t; }
    lo = Math.max(lo, minLength);
    hi = Math.min(hi, maxLength);

    // Samle aktuelle lengdebøtter og total ordmengde i intervallet.
    const buckets = [];
    let total = 0;
    for (let len = lo; len <= hi; len++) {
      const b = byLength.get(len);
      if (b && b.length) { buckets.push(b); total += b.length; }
    }
    if (!total) return null;

    // Velg ord jevnt fordelt over alle ord i intervallet.
    let r = randInt(0, total - 1);
    for (const b of buckets) {
      if (r < b.length) return b[r];
      r -= b.length;
    }
    return null; // skal ikke skje
  }

  function onReady(cb) {
    if (ready) cb();
    else readyCallbacks.push(cb);
  }

  // Last ordlista. Ved feil forblir ready=false (kallere holder kamp deaktivert).
  fetch(DICT_URL)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(text => {
      ingest(text);
      flushReady();
      console.log(`Dict: lastet ${words.size} ord (lengde ${minLength}–${maxLength}).`);
    })
    .catch(err => {
      console.error('Dict: klarte ikke å laste ordlista (' + DICT_URL + '):', err);
    });

  return {
    get ready()     { return ready; },
    get size()      { return words.size; },
    get minLength() { return minLength; },
    get maxLength() { return maxLength; },
    onReady,
    isValid,
    randomEnemy,
  };
})();
