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
|---|---|---|
| `grid.js` | Oppretter 100 `.cell`-elementer i `#grid` | `CHARS`, `SIZE`, `TOTAL`, `cells[]`, `randChar()` |
| `lens.js` | Avgrenset forstørrelsesglass (radius + bule + glassring) via pointer events | `toggleFog()`, `fogOfWar` |
| `modes.js` | Variant A/B/C, parametere, slider-kobling, knapper | `setMode()` |
| `inventory.js` | Klikk-plukking fra grid til inventory | – |

**Lasterekkefølge er kritisk:** `grid.js` → `lens.js` → `modes.js` → `inventory.js`

## Nåværende funksjonalitet

**Tre bytte-varianter** (velges med knapper, justeres via hover-popover):
- **A** – bytter alle celler hvert N ms (default 1000)
- **B** – bytter én tilfeldig celle hvert N ms (default 1000)
- **C** – hver celle har individuell TTL på 1–5 sek (min/maks justerbart)

**Forstørrelsesglass** – avgrenset, sirkulær linse: innenfor radiusen forstørres cellene (`scale`) og skyves mildt radielt utover (`disp = MAX_MAG * d * (1 - t)`, der `t = d/radius`), utenfor er de uberørt. Effekten faller lineært til 0 ved kanten (`g = 1 - t`). Radiusen beregnes i `buildCellCenters()` som `LENS_CELLS` × cellestørrelse, så lupen dekker like mange rader på desktop (~40px-celler) og mobil (~28px-celler). En synlig glassring (`.lens-ring`-element, ett barn av `#grid`) følger pekeren via `left`/`top` satt i JS, og endrer størrelse med radiusen. Drevet av pointer events, så det fungerer for både mus (hover) og touch. Parametere øverst i `lens.js`: `LENS_CELLS`, `MAX_MAG`, `MAX_BRIGHT`, `MAX_BLUR`, `FOG_EDGE`.

**Touch-tilpasning** (mobil) – for `pointerType !== 'mouse'` løftes linsesentrum `TOUCH_OFFSET_Y` px over fingeren (klampet ved toppen) så fingeren ikke dekker det forstørrede området, og linsen nullstilles **ikke** ved `pointerup` – den blir stående så du rekker å sikte og plukke. En dra (bevegelse > `DRAG_THRESHOLD`) setter `window.lensIgnoreClick` slik at draginga bare posisjonerer og ikke plukker; et separat trykk plukker. `#grid` har `touch-action: none` så draging ikke blir spist av scroll.

**Fog of war** (toggle-knapp, gul når aktiv) – alt *innenfor* lupen er helt klart, alt utenfor får `blur(MAX_BLUR)`, med et mykt overgangsbånd (`FOG_EDGE`) helt ytterst ved glasskanten. Implementert i `lens.js` via `fogOfWar`-flagget og `toggleFog()`.

**Plukking** – klikk på celle markerer den som `.picked` (tom, stiplet kant) og legger bokstaven som `.inventory-item` i `#inventory`. Alle varianter hopper over `.picked`-celler. På touch hopper klikk-handleren i `inventory.js` over plukking når `window.lensIgnoreClick` er satt (dvs. klikket kom fra en linse-dra, ikke et trykk).

## Neste steg (planlagt)

Plukking er grunnlaget for en mekanikk der spilleren samler bokstaver for å danne ord eller lignende. Inventory er foreløpig kun akkumulerende – ingen interaksjon tilbake til grid.

## Legge til en ny variant

1. Legg til `btn-wrap`-blokk med knapp og popover i `index.html`
2. Legg til parametervariable og slider-kobling i `modes.js`
3. Utvid `setMode()` med ny `else if`-gren og husk å hoppe over `.picked`-celler
4. Legg til `classList.toggle('active', mode === 'X')` i `setMode()`

## CSS-konvensjoner

- Celle-tilstander: `.cell` (normal), `.cell.picked` (plukket – tom, stiplet)
- Inventory: `.inventory` (container), `.inventory-label`, `.inventory-slots`, `.inventory-item`
- Knapp-tilstander: `.active` (grønn for varianter, gul for fog-of-war via `.btn-fog.active`)
- Forstørrelsesglass: `.lens-ring` (glassrand, absolutt plassert i `#grid`, vises/skjules via inline `display`)
