# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kjøre prosjektet

```bash
npm start        # starter lokal HTTP-server via npx serve
```

Siden serveres på en dynamisk port (se terminaloutput). Forhåndsvisningspanelet i Claude Code bruker `.claude/launch.json` og starter serveren automatisk. Åpne **ikke** `index.html` direkte som `file://` – eksterne CSS/JS vil ikke lastes.

## Arkitektur

Ingen byggsteg. Script-filer lastes i rekkefølge via `<script src="...">` i `index.html` og deler global tilstand via window-scope:

| Fil | Ansvar | Eksponerer |
| --- | --- | --- |
| `grid.js` | Oppretter 100 `.cell`-elementer i `#grid` + nullstilling pr. dag | `CHARS`, `SIZE`, `TOTAL`, `cells[]`, `randChar()`, `resetGrid()` |
| `lens.js` | Avgrenset forstørrelsesglass (radius + bule + glassring) via pointer events | `toggleFog()`, `fogOfWar` |
| `modes.js` | Variant A/B/C, parametere, slider-kobling, knapper | `setMode()` |
| `inventory.js` | Plukking fra grid + delt bokstavbeholdning (mus-klikk + `pickCell` for touch) | `window.Inventory` (counts/get/add/remove/total/clear/render), `pickCell()`, kaller `window.onLetterPicked(letter)` ved vellykket plukk |
| `scenes.js` | Minimal skjermveksling mellom `.scene`-containere (lavnivå DOM-toggling) | `showScene(name)` |
| `dict.js` | Henter norsk ordliste (`words-no.txt`) ved oppstart; validering + fiendeuttrekk | `window.Dict` (ready/onReady/isValid/randomEnemy/minLength/maxLength/size) |
| `combat.js` | Kamp: bygg ord av inventory mot fiendeord, resolusjon, flykt | `startCombat(enemyWord)`, `startRandomCombat()`, `readLenRange()`, `window.player`, `wordValue()`, `letterValue()`, `LETTER_VALUES`; kaller `window.onCombatExit()` ved "Tilbake" |
| `letefase.js` | Tidsbegrenset letefase: start/stopp-knapp, nedtellingstimer, tidsstraff pr. plukk | setter `window.onLetterPicked` (lytter), kaller `window.onSearchEnded` ved naturlig slutt |
| `game.js` | Scene-/spill-router + overordnet tilstand (dag, sankested, loop); lett dev-seam | `window.Game` (scene/day/site/sites/goTo), `DEV`; setter `window.onSearchEnded`/`window.onCombatExit` |

**Lasterekkefølge er kritisk:** `grid.js` → `lens.js` → `modes.js` → `inventory.js` → `scenes.js` → `dict.js` → `combat.js` → `letefase.js` → `game.js`. `game.js` lastes sist så den overstyrer seamen `window.onSearchEnded` (combat.js setter den ikke lenger).

## Nåværende funksjonalitet

**Tre bytte-varianter** (velges med knapper, justeres via hover-popover):

- **A** – bytter alle celler hvert N ms (default 1000)
- **B** – bytter én tilfeldig celle hvert N ms (default 1000)
- **C** – hver celle har individuell TTL på 1–5 sek (min/maks justerbart)

**Forstørrelsesglass** – avgrenset, sirkulær linse: innenfor radiusen forstørres cellene (`scale`) og skyves mildt radielt utover (`disp = MAX_MAG * d * (1 - t)`, der `t = d/radius`), utenfor er de uberørt. Effekten faller lineært til 0 ved kanten (`g = 1 - t`). Radiusen beregnes i `buildCellCenters()` som `LENS_CELLS` × cellestørrelse, så lupen dekker like mange rader på desktop (~40px-celler) og mobil (~28px-celler). En synlig glassring (`.lens-ring`-element, ett barn av `#grid`) følger pekeren via `left`/`top` satt i JS, og endrer størrelse med radiusen. Drevet av pointer events, så det fungerer for både mus (hover) og touch. Pekerbevegelser koalesceres til én `updateLens()` per frame via `requestAnimationFrame`. Parametere øverst i `lens.js`: `LENS_CELLS`, `MAX_MAG`, `MAX_BRIGHT`.

**Touch-tilpasning** (mobil) – for `pointerType !== 'mouse'` løftes linsesentrum `TOUCH_OFFSET_Y` px over fingeren (klampet ved toppen) så fingeren ikke dekker det forstørrede området. Lupen vises fra `pointerdown` (med en gang fingeren settes ned) og blir stående etter `pointerup`. Mens fingeren er nede (`aiming`) markeres den plukkbare cellen nærmest lupesenteret med `.lens-target`, og glassringen får et trådkors (`.lens-ring.aiming::before/::after`) – dette er *siktet* som viser hva du plukker. `#grid` har `touch-action: none` så sikting ikke blir spist av scroll.

**Fog of war** (toggle-knapp, gul når aktiv) – alt *innenfor* lupen er helt klart, alt utenfor blir uskarpt. Implementert som **ett** `.fog-overlay`-element (barn av `#grid`) med `backdrop-filter: blur(4px)` og en sirkulær CSS-maske (`radial-gradient`) som lager et hull der lupen er. Det gir **én** GPU-blur-operasjon i stedet for blur per celle – avgjørende for flyt på mobil. `updateFog()` (i `lens.js`) flytter hullet ved å sette `--lx`/`--ly`/`--lr` på overlegget (`--lr = 0` → ingen hull, hele griddet blurres når lupen er inaktiv). Styres av `fogOfWar`-flagget og `toggleFog()`. Cellene blurres ikke lenger hver for seg; `.cell` har kun `will-change: transform`.

**Plukking** – `window.pickCell(cell)` (i `inventory.js`) markerer cellen som `.picked` (tom, stiplet kant) og teller opp bokstaven via `Inventory.add()`. Beholdningen ligger i `window.Inventory` (counts pr. bokstav + `get/add/remove/total/clear/render`); `render()` tegner inventory-linja fra counts, så forbruk i kamp speiles tilbake hit. Inventory-linja er hele alfabetet (`CHARS`); hver bokstav er grå (`.inventory-item`) til den plukkes, da markeres den (`.inventory-item.has`) og får en teller (`.inventory-count`). Alle varianter hopper over `.picked`-celler. **Mus**: klikk på cellen. **Touch**: `lens.js` kaller `pickCell(targetCell)` på `pointerup`, og setter `window.lensIgnoreClick` så det etterfølgende syntetiske click-eventet ikke plukker en gang til. Ved hvert vellykket plukk kaller `pickCell` `window.onLetterPicked(letter)` hvis en lytter er registrert (brukes av letefasen).

**Letefase** ("Start letefasen") – en tidsbegrenset fase. Når den startes skjules de andre kontrollene (variant A/B/C, fog, stopp), knappen blir "Stopp letefasen", og en nedtellingstimer (`.search-timer`, `#timer`) vises over griddet. Fasen rører ikke `modes.js`/fog – den kjører videre med oppsettet som var aktivt da man trykket start. Timeren starter på `SEARCH_SECONDS` (60) og teller ned ett sekund av gangen; hvert plukk trekker i tillegg `PICK_PENALTY` (5) sek via `window.onLetterPicked`. **Naturlig slutt** (timeren når 0, både nedtelling og plukk-straff): `endSearch()` rydder UI-et (`stopSearch()`) og kaller deretter `window.onSearchEnded()`-seamen (settes av `game.js` → går til kamp). **Manuell stopp** (knappen mens fasen kjører) kaller `stopSearch()` direkte og utløser ingen kamp – en ren avbryt. Letefasen startes fortsatt manuelt (ingen auto-start ved scene-inngang). Parametere øverst i `letefase.js`.

**Skjermveksling** – `showScene(name)` (i `scenes.js`) er lavnivå-toggleren: viser én `.scene`-container og skjuler resten via `hidden`-attributtet. Hver scene er selv en sentrert flex-kolonne (`.scene`-regelen) så body-layouten bevares. Høynivå-styringen (hvilken scene og hvilken onEnter-logikk) ligger i `game.js`.

**Scene-/spill-loop** (oppgave 2) – `game.js` definerer `window.Game` (router + tilstand) som bygger på `showScene`. Loopen er `start → base → velg sankested → samling → kamp → tilbake til base`, der **retur til basen = ny dag**. Scenene er `#scene-start`, `#scene-base`, `#scene-site`, `#scene-search`, `#scene-combat`, `#scene-event`, `#scene-gameover` (alle skjult ved oppstart; `game.js` booter til `start`). `Game.goTo(name, {force})` setter scene, kaller `showScene(name)` og kjører scenens onEnter-hook. `TRANSITIONS`-mappen definerer gyldige overganger; ugyldige logges (`console.warn`) men **blokkeres ikke** (dev-vennlig), og dev-panelet hopper fritt med `{force:true}`. onEnter: `base` gjør `day++` + `resetGrid()` (inventory og helse beholdes mellom dager), `site` ruller tre sankested-stubber (`SITE_POOL`), `combat` kaller `startRandomCombat()`, `gameover` viser dagen. **Nytt spill** (`#scene-start` → "Start nytt spill") nullstiller helse + `Inventory.clear()` og setter `day=0` (base løfter til dag 1). Helsemodellen eies fortsatt av `window.player` (combat.js); `Game` leser `player.health` for game over-ruting. **Seams:** `game.js` setter `window.onSearchEnded = () => Game.goTo('combat')` (naturlig slutt på letefasen → kamp) og `window.onCombatExit = () => Game.goTo(player.health <= 0 ? 'gameover' : 'base')` (etter kamp). Disse erstatter oppgave 5-simuleringen som combat.js eide. "Fortsett gammelt spill" og base-bygging/event-gameplay er bevisst **stubber** (ingen persistens nå).

**Dev-seam** (lett skive av oppgave 3) – `DEV`-flagget øverst i `game.js` (byttes til `?dev=1` i oppgave 3) viser `.dev-panel` (fast hjørne): scene-hopp-knapper for alle syv scener (`goTo(..., {force:true})`), "Test kamp"-knappen og fiendelengde-feltene `#enemyMinLen`/`#enemyMaxLen` (flyttet hit fra samling-kontrollene; `readLenRange` finner dem fortsatt via id). Variant A/B/C og fog er **ikke** dev-only – de er ekte samling-mekanikk og blir liggende i `#scene-search`.

**Kamp** (oppgave 4; "Test kamp"-knappen ligger nå i dev-panelet) – `startCombat(enemyWord)` (i `combat.js`) viser kamp-scenen. Fiendens styrke er Scrabble-verdien av ordet (`LETTER_VALUES`, norsk sett; Q/X/Z er ikke i settet og gis høye verdier). Du bygger et ord ved å klikke bokstaver fra en pool (`Inventory`-kopi) inn i ordet og tilbake; ordverdi vises live, og "Angrip" er deaktivert til minst én bokstav er lagt. Poolen kan sorteres (`sortMode`, beholdes mellom kamper): alfabetisk (default), etter verdi (synkende), eller konsonant/vokal på to linjer (`split` via flex-order, som inventory-linja). Selve ordet sorteres ikke (rekkefølgen er ordet). Poolbrikkene forsvinner ikke når man bruker dem opp: et `roster` (bokstaver eid ved start + vunnet) holder dem stående, telleren går nedover, og ved 0 igjen gråes brikken ut og deaktiveres (`.combat-tile.depleted`). **Bygging bruker en arbeidskopi** (`pool`) – ekte `Inventory` røres først ved resolusjon (kun døde bokstaver fjernes, ev. fiendebokstav legges til). Regler v1: vinn (ordverdi ≥ fiende) → 1–2 av ordets bokstaver dør, 0–1 fiendebokstav vinnes, ingen skade; tap → 70–80 % av ordets bokstaver dør + `fiendestyrke − ordverdi` skade; flykt → mister alle bokstaver + `max(0, fiendestyrke − inventarverdi)` skade; uavgjort teller som seier. Ved resolusjon låses bygging (`resolved`), resultatpanelet viser tapt/vunnet som fargede linjer (`.combat-change.lost`/`.gained`), og poolen tegnes på nytt fra oppdatert beholdning så vunnet bokstav synes med en gang. Spillerhelse i `window.player` (100). Helse ≤ 0 viser "Du døde"; etter "Tilbake" ruter `window.onCombatExit` (game.js) til game over-scenen (`startCombat` friskmelder helsa hvis den likevel kalles med helse ≤ 0, f.eks. via dev-panelet). **Streng ordvalidering** (oppgave 6a): det bygde ordet må stå i ordboka (`Dict.isValid`) for å kunne angripe; ugyldig ord blokkerer angrepet, beholder ordet og viser `.combat-invalid` ("«ORD» er ikke et gyldig ord."). Meldingen skjules så snart ordet endres.

**Ordbok** (oppgave 6a) – `dict.js` henter `words-no.txt` (én ordliste, ett ord per linje) ved oppstart og bygger `window.Dict`: et `Set` over alle ord (STORE bokstaver) for `isValid()`, og lengdebøtter (`byLength`) for `randomEnemy(criteria)`. `randomEnemy` trekker et fiendeord fra HELE ordboka, jevnt fordelt over alle ord i lengdeintervallet; `criteria` er et objekt så logikken kan vokse (nå `{ minLen, maxLen }`; senere bokstavtyper og boss = svært lange ord). `Dict.ready`/`onReady()` signaliserer at lasting er ferdig – "Test kamp" er deaktivert ("Laster ordbok…") til da. Fiendelengde styres midlertidig av test-kontrollene `#enemyMinLen`/`#enemyMaxLen` i dev-panelet (ekte lengde drives av spilllogikk senere). `startRandomCombat()` (i `combat.js`) samler fiende-uttrekk + lengdevalg + `startCombat` ett sted; både dev-panelets "Test kamp"-knapp og kamp-scenens onEnter bruker den. **Koblingen letefase → kamp eies nå av `game.js`** (oppgave 2 overtok oppgave 5-simuleringen): `game.js` setter `window.onSearchEnded = () => Game.goTo('combat')`, og kamp-scenens onEnter kaller `startRandomCombat()`. `words-no.txt` er filtrert fra «Norsk ordbank – bokmål 2005» (CC-BY 4.0): kun rene bokstavord i spillalfabetet, lengde 2–20, ~140k ord (~1,6 MB). Norsk-only inntil oppgave 9 (språk/engelsk).

## Neste steg (planlagt)

Kamp (oppgave 4), ordbok/validering (oppgave 6a), letefase → kamp (oppgave 5) og scene-/spill-loopen (oppgave 2) finnes nå. `game.js` ruter hele loopen `start → base → sankested → samling → kamp → base` med dag-telling, ny-dag-grid og game over; testkontrollene ligger i et `DEV`-styrt dev-panel (lett skive av oppgave 3). Gjenstår: full dev/ferdig-separasjon med `?dev=1` (oppgave 3), kampmoduser (oppgave 7), vanskelighetsavhengig bokstavdød (oppgave 8), språk NO/EN + grid-alfabet + engelsk ordbok (oppgave 9 / 6b), fiendevalg på verdi (oppgave 10) og sikte-på-bokstav (oppgave 11). Bevisste stubber som skal fylles ut: base-bygging, event-gameplay, sankested-forskjeller (biom/vær/natt-dag) og "fortsett gammelt spill" (persistens).

## Legge til en ny variant

1. Legg til `btn-wrap`-blokk med knapp og popover i `index.html`
2. Legg til parametervariable og slider-kobling i `modes.js`
3. Utvid `setMode()` med ny `else if`-gren og husk å hoppe over `.picked`-celler
4. Legg til `classList.toggle('active', mode === 'X')` i `setMode()`

## CSS-konvensjoner

- Celle-tilstander: `.cell` (normal), `.cell.picked` (plukket – tom, stiplet)
- Inventory: `.inventory` (container), `.inventory-label`, `.inventory-slots`, `.inventory-item` (én per bokstav i alfabetet), `.inventory-item.has` (plukket minst én gang), `.inventory-letter`, `.inventory-count`
- Knapp-tilstander: `.active` (grønn for varianter, gul for fog-of-war via `.btn-fog.active`)
- Forstørrelsesglass: `.lens-ring` (glassrand, absolutt plassert i `#grid`, vises/skjules via inline `display`)
- Fog of war: `.fog-overlay` (backdrop-filter-blur med sirkulær maske; hull-senter/-radius via CSS-variablene `--lx`/`--ly`/`--lr`)
- Letefase: `.search-timer` (nedtelling over griddet, `.low` når ≤ 10 sek igjen)
- Scener: `.scene` (sentrert flex-kolonne, én vises om gangen), skjules med `hidden`-attributtet (`.scene[hidden] { display:none }`)
- Skjelett-scener: `.title` (startskjerm-tittel), `.scene-lead`, `.scene-day` (dag-tekst, `span` grønn), `.scene-placeholder` (stiplet "kommer senere"-boks), `.scene-actions` (knapperad), `.btn-primary` (grønn hovedknapp), `.site-options` + `.site-option` (sankested-knapper)
- Dev-panel: `.dev-panel` (fast hjørne, kun synlig når `DEV`), `.dev-title`, `.dev-scenes` + `.dev-scene-btn` (scene-hopp), `.dev-row` (rad for testkontroller)
- Kamp: `.combat-health` (+ `-bar`/`-fill`/`-num`), `.combat-enemy` (+ `-word`/`-strength`), `.combat-build`, `.combat-word` (ordet du bygger), `.combat-pool` (dine bokstaver; `.split` bryter konsonant/vokal på to linjer via flex-order), `.combat-sort` (+ `.combat-sort-btn`, `.active`), `.combat-tile` (+ `-letter`/`-val`/`-count`; `.vowel` for splitt-modus; `.depleted` = 0 igjen, gråes ut; `:disabled` etter resolusjon), `.combat-actions`, `.combat-result` (+ `-text`, `-changes`), `.combat-change.lost` (rød "Tapt:"), `.combat-change.gained` (grønn "Vunnet:"), `.combat-invalid` (rød inline-melding ved ugyldig ord). Angrip = grønn (`#btnAttack`), Flykt = gul (`#btnFlee`)
- Test-kontroll: `.enemy-len-test` (fiendeordlengde min/maks, nå i dev-panelet, midlertidig)
