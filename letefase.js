// Letefase – tidsbegrenset samling. En test-knapp starter/stopper fasen.
// Mens fasen kjører skjules de andre kontrollene (variant, fog, stopp), og
// "Start letefasen" blir "Stopp letefasen". Fasen kjører videre med det
// mode/fog-oppsettet som var aktivt da man trykket start – letefasen rører
// ikke modes.js. En timer over griddet teller ned fra SEARCH_SECONDS; hver
// plukket bokstav trekker i tillegg PICK_PENALTY sekunder. Når timeren når
// null stopper fasen (senere: gå til neste fase).

// --- Parametere ---
const SEARCH_SECONDS = 60; // startverdi for nedtellingen
const PICK_PENALTY   = 5;  // sekunder som trekkes fra pr. plukket bokstav

(function initSearch() {
  const btnSearch = document.getElementById('btnSearch');
  const timerEl   = document.getElementById('timer');
  const controls  = document.querySelector('.controls');
  // Alle kontroller utenom selve letefase-knappen skjules under fasen.
  const others    = [...controls.children].filter(el => el !== btnSearch);

  let active   = false;
  let timeLeft = 0;
  let ticker   = null; // setInterval-håndtak for sekundnedtellingen

  function renderTimer() {
    timerEl.textContent = `${timeLeft} s`;
    timerEl.classList.toggle('low', timeLeft <= 10);
  }

  function startSearch() {
    active   = true;
    timeLeft = SEARCH_SECONDS;

    others.forEach(el => { el.style.display = 'none'; });
    btnSearch.textContent = 'Stopp letefasen';
    btnSearch.classList.add('active');

    timerEl.style.display = '';
    renderTimer();

    ticker = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        renderTimer();
        endSearch();
        return;
      }
      renderTimer();
    }, 1000);
  }

  function stopSearch() {
    active = false;
    if (ticker) clearInterval(ticker);
    ticker = null;

    others.forEach(el => { el.style.display = ''; });
    btnSearch.textContent = 'Start letefasen';
    btnSearch.classList.remove('active');
    timerEl.style.display = 'none';
  }

  // Naturlig slutt (timeren nådde 0): rydd UI og gå videre til neste fase.
  // Koblingen til kamp er en simulering (oppgave 5) som scene-loopen (oppgave 2)
  // overtar – konsumenten setter window.onSearchEnded. Manuell stopp bruker
  // stopSearch() direkte og utløser dermed ingen kamp.
  function endSearch() {
    stopSearch();
    if (typeof window.onSearchEnded === 'function') window.onSearchEnded();
  }

  // Trekk fra tid når en bokstav plukkes. Lander vi på/under null, settes
  // timeren til null og letefasen stoppes.
  window.onLetterPicked = function () {
    if (!active) return;
    timeLeft -= PICK_PENALTY;
    if (timeLeft <= 0) {
      timeLeft = 0;
      renderTimer();
      endSearch();
      return;
    }
    renderTimer();
  };

  btnSearch.addEventListener('click', () => {
    if (active) stopSearch();
    else startSearch();
  });
})();
