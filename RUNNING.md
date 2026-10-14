# Running Category Solitaire

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Swapping decks
Decks are JSON arrays of `{ "id", "categoryTitle", "itemName" }` in `src/decks/`.
A card whose `itemName` is `null` is the category title card. Point `src/decks/index.js`
at a different file to change the deck.

## Controls
- Drag a face-up card (or a same-category run) to a valid destination, or tap a card and then tap a destination.
- Tap the top deck to draw; tap the empty slot to recycle the draft pile.
- The cog menu has Restart, Sound toggle, and Quit.
