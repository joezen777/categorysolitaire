# Category Solitaire - Setup Instructions

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

## Build for Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Game Features

- **Mobile-responsive design** - Works on phones, tablets, and desktops
- **Drag-and-drop** - Move cards by dragging them
- **Tap-to-move** - Select a card, then tap a destination
- **Procedural sound effects** - No external audio files needed
- **Multiple categories** - Easy to swap deck configurations
- **Win detection** - Celebrates when you complete the game
- **Score tracking** - Earn points for valid moves and completed categories

## Game Rules

1. Draw cards from the source deck to the draft pile
2. Move face-up cards from the draft pile or tableau
3. Build category stacks in the foundation (5 slots)
4. Stack item cards of the same category in the tableau
5. Complete categories by collecting all item cards
6. Win by clearing all cards from the play area

## Technology Stack

- React 18 with TypeScript
- Vite for fast development
- Material-UI (MUI) for beautiful components
- @dnd-kit for drag-and-drop functionality
- Web Audio API for procedural sound effects

## Customization

To add new card categories, edit `src/data/deckConfig.ts` and modify the `starterDeck` array.