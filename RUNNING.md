# Running Category Solitaire

Requires Node.js 18+ and npm.

```bash
npm install        # install dependencies
npm run dev        # development server (http://localhost:5173)
npm run build      # production build into dist/
npm run preview    # serve the production build locally (http://localhost:4173)
npm test           # run all automated tests (vitest)
```

## How to play

- Tap or click the face-down source pile to draw one card onto the draft pile. When the
  source is empty, tap its empty slot to flip the draft back over (order inverted).
- Move a face-up card, a same-category stack of item cards, or the top draft card either
  by **dragging** it, or by **tapping** it and then tapping the destination.
- Title cards go on an empty column, a same-category item card, or an empty foundation slot.
  Item cards go on a same-category item card or an empty column, or onto a foundation slot
  whose title is the same category. A same-category stack moves together between tableau
  columns only. Illegal moves are rejected, the card returns, and an error/warning sound plays.
- A foundation slot shows `Category x/y` above its card. Completing a category plays a glitter
  animation and success sound, awards 100 points and frees the slot.
- Clearing all categories shows the "Game Over - You Win!" dialog with a Play Again button.
- The cog menu has **Restart**, **Turn sound off/on** and **Quit**. Quit ends the active game
  and shows a "Game quit" screen with the final score and a Start New Game button (a web page
  cannot close its own tab).

Sounds are generated with the Web Audio API; there are no audio files.

## Deck

The deck lives in `src/deck/starterDeck.json`: an array of
`{ "id", "categoryTitle", "itemName" }` item entries (73 items in 13 categories).
`src/deck/index.js` builds the cards from it, adding one title card per category
(86 cards total) whose item count is taken from the data. To use another deck, replace the
JSON file or pass another array of the same shape to `buildCards`. Item `id`s must be unique.
The initial deal needs at least 30 cards (4+5+6+7+8 in the tableau).
