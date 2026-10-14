import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { DECKS, DEFAULT_DECK_ID, buildDeck } from './decks/index.js';
import Card from './components/Card.jsx';

// S01 placeholder: previews the active deck. The game board arrives in later specs.
export default function App({ deckData = DECKS[DEFAULT_DECK_ID] }) {
  const { cards, categories } = useMemo(() => buildDeck(deckData), [deckData]);

  return (
    <Box sx={{ p: 2, color: '#fff' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Category Solitaire
      </Typography>
      <Typography variant="body2" gutterBottom data-testid="deck-summary">
        {Object.keys(categories).length} categories, {cards.length} cards
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </Box>
    </Box>
  );
}
