# Running Category Solitaire

Requires Node 20+ and npm.

```bash
npm install
npm run dev       # dev server (http://localhost:5173)
npm test          # rule-engine tests (vitest)
npm run build     # production build into dist/
npm run preview   # serve the production build (http://localhost:4173)
```

## Playing

- Tap/click the source pile (top left) to deal a card to the draft pile. When the source is empty, tap its empty slot to flip the draft pile back over.
- Move a face-up card (and any valid stack beneath it) by dragging, or tap it and then tap a highlighted destination. Keyboard: Tab to a card, Enter/Space to select, Tab to a destination, Enter/Space to move.
- Title cards go in an empty column, an empty foundation slot, or on an item of their category. Items go on items of the same category or an empty column; in a foundation slot they need that category's title card.
- Completing a category scores 100 points and frees the slot. Clear everything to win.
- The cog menu restarts, quits, or toggles sound (sounds are generated with Web Audio).

## Swapping the deck

`src/data/starterDeck.json` is an array of `{ "id", "categoryTitle", "itemName" }`. A card whose `itemName` is `null` is that category's title card; every category needs exactly one title and at least one item, and ids must be unique. Point the import in `src/App.jsx` at another file to change decks (at least 30 cards are needed to deal the tableau).
