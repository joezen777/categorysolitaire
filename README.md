# Category Solitaire

A unique mobile-responsive card game where you match category items to complete collections. Instead of traditional playing cards, this game uses category-based cards that you must organize and complete.

## 🎮 Game Features

- **Mobile-Responsive Design** - Works seamlessly on phones, tablets, and desktops
- **Dual Input Methods** - Both drag-and-drop and tap-to-move functionality
- **Procedural Sound Effects** - Generated using Web Audio API (no external files)
- **Modular Deck System** - Easy to customize with new categories
- **Beautiful UI** - Built with React, Vite, and Material-UI
- **Score Tracking** - Earn points for moves and completed categories
- **Win Detection** - Celebration when you complete the game

## 🚀 Quick Start

### Installation

**Windows:**
```bash
install.bat
```

**Linux/Mac:**
```bash
chmod +x install.sh
./install.sh
```

**Or manually:**
```bash
npm install
```

### Running the Game

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

## 🎯 How to Play

### Objective
Complete all categories by collecting all item cards for each category in the foundation slots.

### Game Layout
1. **Source Deck** (top-left) - Draw cards from here
2. **Draft Pile** (top-right of source) - Face-up cards ready to play
3. **Foundation** (top-right, 5 slots) - Complete categories here
4. **Tableau** (bottom, 5 columns) - Main play area

### Rules

**Drawing Cards:**
- Click the source deck to draw one card to the draft pile
- When the source deck is empty, click it to flip and reset the draft pile

**Moving Cards:**
- Only face-up cards can be moved
- Use drag-and-drop OR tap-to-move (select card, then tap destination)
- Valid moves:
  - **Title Cards**: Can go to empty foundation slots, empty tableau columns, or on item cards of the same category
  - **Item Cards**: Can go on item cards of the same category, on matching foundation slots, or empty tableau columns
  - **Sequences**: Valid item card sequences can be moved together

**Foundation Rules:**
- Only title cards can start a foundation slot
- Item cards can only be added to foundation slots with matching category
- Complete a category by collecting all item cards (earn 100 points!)

**Tableau Rules:**
- Stack cards by category
- Bottom card of each column starts face-up
- Moving a face-up card reveals the card beneath it

### Scoring
- +10 points per valid move
- +100 points per completed category
- Bonus points for winning!

### Controls
- **Menu (⚙️)**: Restart game, quit, or toggle sound
- **Sound**: Procedurally generated - no files needed!

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Material-UI** - Beautiful components
- **@dnd-kit** - Drag-and-drop functionality
- **Web Audio API** - Procedural sound effects

## 📁 Project Structure

```
categorysolitaire/
├── src/
│   ├── components/       # React components
│   │   ├── Card/        # Individual card component
│   │   ├── DraftPile/   # Draw pile component
│   │   ├── Foundation/  # Foundation slots component
│   │   ├── Game/        # Main game component
│   │   ├── Menu/        # Settings menu
│   │   ├── SourceDeck/  # Source deck component
│   │   ├── Tableau/     # Tableau columns component
│   │   ├── DraggableCard/ # Drag wrapper
│   │   └── DropZone/    # Drop zone wrapper
│   ├── data/            # Deck configuration
│   │   └── deckConfig.ts
│   ├── types/           # TypeScript types
│   │   └── game.ts
│   ├── utils/           # Game logic and utilities
│   │   ├── audioManager.ts
│   │   └── gameLogic.ts
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## 🎨 Customization

### Adding New Categories

Edit `src/data/deckConfig.ts`:

```typescript
export const starterDeck: CategoryConfig[] = [
  {
    title: "Your Category",
    items: ["Item 1", "Item 2", "Item 3"]
  },
  // Add more categories...
];
```

### Modifying Game Rules

Edit `src/utils/gameLogic.ts` to customize move validation and game rules.

### Customizing Sound

Edit `src/utils/audioManager.ts` to modify sound effects.

## 📱 Mobile Optimizations

- Touch-friendly interface
- Responsive card sizing
- Optimized drag-and-drop for touch
- Prevented text selection during gameplay
- Smooth animations and transitions

## 🏆 Winning the Game

Win by clearing all cards from the tableau and draft pile into the foundation slots. Each completed category earns you 100 points and frees up a foundation slot for another category.

## 🐛 Troubleshooting

**Audio not working?**
- Click anywhere on the page to initialize the AudioContext (browser requirement)
- Check that sound is enabled in the menu

**Drag-and-drop not working?**
- Try refreshing the page
- Check console for errors
- Ensure you're using a modern browser

**Cards not responding?**
- Make sure you're trying to move face-up cards
- Check that the move is valid (cards must match categories)

## 📄 License

See LICENSE file for details.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

Enjoy playing Category Solitaire! 🎴
