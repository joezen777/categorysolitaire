# Running Category Solitaire

Requirements: Node.js 20+ and npm.

```bash
npm install        # install dependencies from package-lock.json
npm run dev        # start the dev server (http://localhost:5173)
npm test           # run rule-engine unit tests (Vitest)
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

## How to play

- Tap the face-down **source deck** to turn one card onto the **draft pile**. When the source is empty, tap the empty slot (↻ Flip) to turn the draft pile back over.
- Move a face-up card by **dragging** it (on touch screens, press and hold briefly, then drag), or **tap** it and then tap a destination. Valid destinations are outlined with a dashed border. Keyboard: Tab to a card, press Enter/Space, Tab to a destination, press Enter/Space.
- A category **title card** may go to an empty column, onto an item card of its own category, or into an empty category slot.
- An **item card** may go onto an item of the same category, into an empty column, or into the category slot holding its title. Stacks of same-category items move together.
- When a slot holds a title plus all of its items, it glitters, clears, and awards 100 points. Clear every category to win.
- The cog menu (top right) restarts, toggles sound, or quits.

## Swapping the deck

Deck data lives in `src/deck/starterDeck.json`: a flat array of `{ "id", "categoryTitle", "itemName" }`. An entry with `"itemName": null` is that category's title card; every other entry is an item card. To use another deck, add a JSON file in the same format and change the import in `src/deck/index.ts`. Item counts, completion and victory are all derived from the data. The deck must contain at least 30 cards (the initial tableau deal), unique ids, and exactly one title plus at least one item per category.

## Code layout

- `src/deck/` – deck data and validation (`buildDeck`).
- `src/game/engine.ts` – pure rules: deal, draw, recycle, move validation/application, completion, victory.
- `src/game/store.ts` – reducer holding the single authoritative game state plus selection/feedback events.
- `src/audio/` – procedural Web Audio sound effects.
- `src/ui/` – MUI presentation, layout metrics, and drag/tap input handling.
