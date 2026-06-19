# Handoff: Wordsmith - oppgave 2 (scene-/tilstands-arkitektur)

**Skrevet:** 2026-06-19
**Fokus for neste økt:** Implementere oppgave 2 (scene-/tilstands-skjelettet). Planen er ferdig og godkjent i prinsippet; neste steg er implementasjon, startende på steg 1.

---

## Hva er Wordsmith
Norsk, enspiller, browserbasert ord-/bokstavspill. Ingen byggsteg, ingen ES-modules. JS-filer lastes som `<script src>` i rekkefølge og deler tilstand via window-scope. Statisk side servet med `npm start` (`npx serve`). Åpne aldri `index.html` som `file://` (eksterne CSS/JS lastes ikke). Repo-rot: `c:\Users\LevinLøssfelt\Documents\Github og kode\wordsmith`.

Les for kontekst (ikke duplisert her):
- `CLAUDE.md` - full arkitektur, fil-/CSS-konvensjoner, lasterekkefølge, status.
- `CONCEPT.txt` - spillkonseptet (mye er åpne "kanskje"-idéer, ikke beslutninger). Oppgave 2 bygger på seksjonene KJERNEKONSEPT, SCENER/SKJERMER, USER INTERFACE.
- `todo.txt` - oppgaveliste. Oppgave 1, 4, 5, 6(=6a) er `[x]`. Oppgave 2 er neste.
- Minne: `C:\Users\LevinLøssfelt\.claude\projects\c--Users-LevinL-ssfelt-Documents-Github-og-kode-wordsmith\memory\` (MEMORY.md + statusfiler).

## Status / hva er gjort nylig (alt committet av brukeren, untatt evt. oppgave 5)
- **Oppgave 4 (kamp):** `combat.js`, scene-veksling (`scenes.js` med `showScene`), delt `window.Inventory` (`inventory.js`).
- **Oppgave 6a (ordbok):** `dict.js` henter `words-no.txt` (~140k norske ord, CC-BY 4.0 fra Norsk ordbank - bokmål 2005). `window.Dict` (ready/onReady/isValid/randomEnemy/minLength/maxLength/size). Streng ordvalidering i kamp.
- **Oppgave 5 (letefase → kamp):** Naturlig slutt på letefasen utløser kamp via seamen `window.onSearchEnded`. Bevisst en *simulering* av endelig scene-flyt; oppgave 2 overtar denne koblingen. Manuell "Stopp letefasen" avbryter uten kamp. (Sjekk `git status` - oppgave 5 kan være ucommittet; spør bruker før commit.)

Dagens lasterekkefølge: `grid → lens → modes → inventory → scenes → dict → combat → letefase`.

## Brukerbeslutninger som styrer oppgave 2 (bekreftet)
1. Loop-graf: `start → (ny/fortsett) → base → velg sankested → samling → kamp → tilbake til base`. **Retur til basen = ny dag.**
2. "Fortsett gammelt spill" = **stubb** (ingen persistens/localStorage nå).
3. Helsemodell: **behold 100 HP**, game over ved 0.
4. Oppgave 2 bygges som **skjelett + kobling av eksisterende** (samling, kamp), ikke implementasjon av base/event-gameplay.
5. Ta med en **lett skive av oppgave 3** (en dev-seam), men utsett full dev/ferdig-separasjon.

---

## PLANEN FOR OPPGAVE 2 (ikke i noen fil ennå - dette er kilden)

### Ny `game.js` (router + spilltilstand), lastes SIST
Bygger på `showScene` fra `scenes.js` (den forblir lavnivå DOM-toggler; `game.js` er høynivå-router).
- `window.Game`: `scene`, `day`, `site`, `sites[]`, `goTo(name, {force})`, onEnter-hooks per scene.
- Helse beholdes i `window.player` (kampen bruker den); `Game` leser `player.health` for game over. Konsolidering kan komme senere.
- `goTo` kaller `showScene(name)` og kjører scenens onEnter. `TRANSITIONS`-map definerer gyldige overganger; ugyldige logges men blokkeres ikke (dev-vennlig). Dev-panel bruker `{force:true}`.

**onEnter-oppførsel:**
- `start`: statisk.
- `base`: ny dag (`day++`, eller `day=1` ved nytt spill), `resetGrid()`, behold inventory + helse.
- `site`: rull tre sankested-stubber.
- `search`: vis samling-kontroller (bruker trykker fortsatt "Start letefasen").
- `combat`: `startRandomCombat()` (trekker fiende + starter kamp).
- `gameover`: vis "Dag N".

**Seam-overtakelse (erstatter oppgave 5-simuleringen):**
- `game.js` setter `window.onSearchEnded = () => Game.goTo('combat')`.
- `game.js` setter `window.onCombatExit = () => player.health <= 0 ? Game.goTo('gameover') : Game.goTo('base')`.

### Nye scener i `index.html` (skjelett-innhold)
Alle scener skjult ved oppstart; `game.js` kaller `Game.goTo('start')` ved boot.
- `#scene-start`: "Start nytt spill" (→ base; nullstiller helse + `Inventory.clear()` + `resetGrid()`), "Fortsett" (deaktivert stubb). Hjem for språkvalg senere (oppgave 9).
- `#scene-base`: "Basen - Dag N", "Bygg (kommer senere)"-plassholder, "Dra ut og let" (→ site).
- `#scene-site`: "Velg sankested", tre stubb-knapper (→ search).
- `#scene-search`: finnes. onEnter nullstiller grid.
- `#scene-combat`: finnes.
- `#scene-event`: "Event (kommer senere)", "Fortsett" (→ base). Nåbar fra dev-panel.
- `#scene-gameover`: "Du tapte - Dag N", "Til startskjerm" (→ start).

### Endringer i eksisterende filer
- `grid.js`: ny `resetGrid()` (ny tilfeldig bokstav i hver celle, fjern `.picked`). Inventory nullstilles IKKE her (bokstaver beholdes mellom dager); kun ved nytt spill.
- `combat.js`: fjern `window.onSearchEnded = startRandomCombat` (game.js eier den nå). `btnCombatBack` kaller `window.onCombatExit?.()` med fallback `showScene('search')`. Behold `startCombat`/`startRandomCombat`/`readLenRange`. Flytt/avregistrer `btnTest`-wiring (se dev-seam).
- `scenes.js`: uendret.

### Lett dev-seam (skive av oppgave 3)
- `window.DEV = true` i toppen av `game.js` (flippes til `?dev=1` i oppgave 3).
- `.dev-panel` (fast hjørne, vises kun når `DEV`): scene-hopp-knapper (alle syv scener via `goTo(..., {force:true})`), "Test kamp"-knapp og fiendelengde-feltene `#enemyMinLen`/`#enemyMaxLen` (flyttes hit fra samling-kontrollene; `startRandomCombat` finner dem fortsatt via id).
- Variant A/B/C og fog blir IKKE dev-only - de er ekte samling-mekanikk (vær/lupe i konseptet), blir liggende i samling-scenen.

### Last + dokumentasjon
- Lasterekkefølge: `grid → lens → modes → inventory → scenes → dict → combat → letefase → game`.
- `style.css`: minimal stil for nye scener + dev-panel.
- `CLAUDE.md`: ny `game.js`-rad, scene-/router-seksjon, dev-seam, oppdatert lasterekkefølge + "Neste steg".

### Foreslått stegrekkefølge (commit-vennlig)
1. `game.js` med `Game` + router + `TRANSITIONS` + boot til `start`, tomme scene-containere i index.html, koble inn search/combat via de to seams. (Kjernen.)
2. `resetGrid()` + ny-dag/nytt-spill-nullstilling (så loopen kan kjøres flere runder).
3. Game over-ruting (helse ≤ 0).
4. Dev-panel (scene-hopp + flytt testkontroller hit).
5. CSS + CLAUDE.md.

### Utenfor scope (egne/senere oppgaver)
Gameplay i base/event/sankested-forskjeller (biom/vær/natt-dag): stubber. Persistens/"fortsett": stubb. Språk (9), kampmoduser (7), bokstavdød etter vanskelighet (8), fiendevalg på verdi (10), sikte-på-bokstav (11). Auto-start av letefase ved scene-inngang: behold manuell "Start letefasen" nå.

---

## Gotchas / ting å passe på
- **Redundant `showScene('combat')`:** `startCombat` kaller selv `showScene('combat')`. Når router-`goTo('combat')` også kaller `showScene` + onEnter→`startRandomCombat`→`startCombat`, blir det et harmløst dobbelt-kall. Akseptabelt for skjelettet; kan strippes senere (la evt. `startCombat` slutte å kalle `showScene`).
- **Hvem setter seams:** etter oppgave 2 er det `game.js` (ikke `combat.js`) som setter `onSearchEnded`. `letefase.js` bare KALLER den ved naturlig slutt (uendret). Pass på at `game.js` lastes etter `combat.js`/`letefase.js` så den overstyrer.
- **Grid bygges uansett synlighet:** `grid.js` populerer `#grid` ved init selv om search-scenen er skjult. Greit.
- **Inventory persisterer mellom dager** (det er poenget: verdi i å ikke bruke opp bokstaver). Kun grid resettes per dag; inventory + helse resettes kun ved nytt spill.
- **Norsk alfabet:** `CHARS = 'ABC...ÆØÅ'`, `VOWELS = 'AEIOUYÆØÅ'` i `grid.js`. Engelsk alfabet-bytte er oppgave 9, ikke nå.

## Arbeidskonvensjoner (viktig)
- **Språk: norsk** i all kommunikasjon, kommentarer, UI.
- **Aldri tankestrek (em-dash).**
- **Commit kun når bruker ber om det.** Bruker committer ofte selv. Spør før push.
- Ingen testsuite. Bruk `node --check <fil>` for syntaks. For logikk/integrasjon: liten DOM-stubb i en `vm`-kontekst fungerte godt i forrige økt (se mønster nedenfor).
- Bruk dedikerte verktøy (Read/Edit/Grep/Glob), ikke shell-ekvivalenter.
- Filreferanser i svar: markdown-lenker `[tekst](sti)`, ikke backticks.
- Scratchpad for midlertidige filer (session-spesifikk): `C:\Users\LEVINL~1\AppData\Local\Temp\claude\c--Users-LevinL-ssfelt-Documents-Github-og-kode-wordsmith\ff4a8d4e-29ca-4bd8-b7b9-e0fe5e5749f4\scratchpad`
- Oppdater `CLAUDE.md`, `todo.txt` og statusminnet når oppgaver fullføres.

### Mønster for integrasjonstest uten nettleser (brukt i oppgave 5)
Last skript-tekst i en `vm.createContext`-sandbox med stubber for `document.getElementById/createElement/querySelector`, `window` (= sandbox selv), `Inventory`, `Dict`, `showScene`, `setInterval` (fang callback), `CHARS`/`VOWELS`. Kjør `vm.runInContext` på filene i lasterekkefølge, simuler hendelser (f.eks. klikk-listeners, tikk ned timer), og assert på `showScene`-kall / tilstand. For oppgave 2 kan samme mønster verifisere router-overganger (goTo → riktig showScene + onEnter), ny-dag-inkrement, game over-ruting, og at `onSearchEnded`/`onCombatExit` ruter riktig.

## Suggested skills
- **`verify`** (built-in): kjør etter implementasjon for å bekrefte at endringene faktisk gjør det som påstås (router-overganger, ny dag, game over, grid-reset).
- **`code-review`** (built-in): kjør på diffen før bruker committer, særlig for seam-eierskap og lasterekkefølge.
- **`prototype`** (bruker-skill): vurder hvis det blir aktuelt å skissere scene-UI raskt - sjekk SKILL.md først for om den passer.
- IKKE bruk handoff/catchup med mindre bruker ber om ny handoff.

## Umiddelbart neste steg
Vent på "sett i gang"/go fra bruker (forrige melding endte med å tilby å starte steg 1). Når klarert: implementer **steg 1** (game.js-kjerne + tomme scener + koble inn search/combat), verifiser med node --check + vm-stubbtest, og fortsett gjennom stegene. Hold endringene commit-vennlige per steg.
