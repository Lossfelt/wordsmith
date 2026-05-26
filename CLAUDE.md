# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kjøre prosjektet

```bash
npm start        # starter lokal HTTP-server via npx serve
```

Siden serveres på en dynamisk port (se terminaloutput). Forhåndsvisningspanelet i Claude Code bruker `.claude/launch.json` og starter serveren automatisk. Åpne **ikke** `index.html` direkte som `file://` – eksterne CSS/JS vil ikke lastes.

## Arkitektur

Ingen byggsteg. Tre script-filer lastes i rekkefølge via `<script src="...">` i `index.html` og deler global tilstand:

| Fil | Ansvar |
|---|---|
| `grid.js` | Definerer `CHARS`, `SIZE`, `TOTAL`, `cells[]`, `randChar()`. Populerer `#grid` med 100 `.cell`-elementer ved innlasting. |
| `lens.js` | Forstørrelsesglasseffekt. Lytter på `mousemove` over `#grid` og beregner gaussisk skalering (`scale`, `brightness`, `z-index`) per celle basert på avstand til musepeker. Bruker `cells[]` og `TOTAL` fra `grid.js`. |
| `modes.js` | Modusstyr (A/B/C), parametervariable, slider-kobling og knapp-lyttere. Bruker `cells[]`, `TOTAL`, `randChar()` fra `grid.js`. |

**Lasterekkefølge er kritisk:** `grid.js` → `lens.js` → `modes.js`. `cells[]` må eksistere før de andre filene kjører.

## Legge til en ny variant

1. Legg til en `btn-wrap`-blokk med knapp og popover i `index.html`
2. Legg til parametervariable og slider-kobling i `modes.js`
3. Utvid `setMode()` med ny `else if`-gren
4. Legg til `classList.toggle('active', mode === 'X')` i `setMode()`

## Linseparametere

Juster øverst i `lens.js`:
- `MAX_SCALE` – maks zoom i senter (default `0.5` → 1.5×)
- `SIGMA` – gaussisk spredningsradius i piksler (default `52` ≈ 1.2 cellebredder)
- `MAX_BRIGHT` – maks lysstyrkeøkning i senter (default `0.6`)
