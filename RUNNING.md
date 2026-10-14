# Running Category Solitaire

Requires Node.js 20+ (tested with Node 24) and npm.

```bash
npm install
npm run dev       # start the Vite dev server (http://localhost:5173)
npm test          # run the game-engine unit tests (Vitest)
npm run build     # production build into dist/
npm run preview   # serve the production build
```

To try it on a phone on the same network, run `npm run dev -- --host` and open the
printed network URL.

## How to play

- Tap the face-down source deck to deal one card onto the draft pile. When the
  deck is empty, tap the empty slot to flip the draft pile back over.
- Move cards by dragging them, or tap a card and then tap a destination.
- Category title cards (gold) can go to an empty column, onto an item card of the
  same category, or into an empty foundation slot.
- Item cards can go onto items of the same category, into an empty column, or into
  the foundation slot holding their category's title card. Runs of same-category
  items move together.
- Filling a category in the foundation clears it for 100 points. Clear every
  category to win. The cog menu restarts, quits, or toggles sound.

## Swapping decks

Decks live in `src/decks/`. A deck is a JSON array of item cards:

```json
[
  { "id": "king-1", "categoryTitle": "King", "itemName": "Scepter" },
  { "id": "king-2", "categoryTitle": "King", "itemName": "Orb" }
]
```

Title cards (with their item counts) are generated automatically from the unique
`categoryTitle` values. Register a new deck in `src/decks/index.js` and point
`DEFAULT_DECK_KEY` at it.
