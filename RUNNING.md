# Running Category Solitaire

Requires Node.js 18+ and npm.

```bash
npm install        # install dependencies
npm run dev        # development server (http://localhost:5173)
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm test           # run deck unit tests (vitest)
```

## Deck

The deck lives in `src/deck/starterDeck.json`: an array of
`{ "id", "categoryTitle", "itemName" }` item entries. `src/deck/index.js`
builds the cards from it, adding one title card per category (with its item
count). To use another deck, replace the JSON file or pass another array of the
same shape to `buildCards`.
