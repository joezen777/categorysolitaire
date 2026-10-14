import { Box, Container, Typography } from '@mui/material';
import Card from './components/Card';
import { cards, CARD_TYPE } from './deck';

export default function App() {
  const titleCount = cards.filter((c) => c.type === CARD_TYPE.TITLE).length;
  const itemCount = cards.length - titleCount;
  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>Category Solitaire</Typography>
      <Typography variant="body2" gutterBottom>
        Deck: {titleCount} title cards + {itemCount} item cards = {cards.length} cards
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </Box>
    </Container>
  );
}
