# Running Category Solitaire

Requires Node.js 20+ and npm (developed with Node 24 / npm 11).

```bash
npm install        # install dependencies (uses package-lock.json)
npm run dev        # start the Vite dev server at http://localhost:5173/
npm test           # run the Vitest suite once
npm run build      # production build into dist/
npm run preview    # serve the production build locally (http://localhost:4173/)
```

## Decks

Deck data lives in `src/decks/` as a flat JSON array of
`{ "id", "categoryTitle", "itemName" }` objects. An entry with
`"itemName": null` is that category's title card; every other entry is an item
card. Title card counts are derived from the number of items in the data.

To use another deck, add its JSON file and register it in `DECKS` in
`src/decks/index.js` (or change `DEFAULT_DECK_ID`). `buildDeck` validates it:
ids must be unique, and each category needs exactly one title card and at least
one item.
