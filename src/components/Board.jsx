import { Box, IconButton, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import Card, { CardBack, EmptySlot } from './Card';

const GAP = 0.5;
const row = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: GAP };

function Source({ cards, onDraw, onRecycle }) {
  const empty = cards.length === 0;
  return (
    <Box
      data-testid="source"
      data-count={cards.length}
      role="button"
      aria-label={empty ? 'Recycle draft into source' : 'Draw a card'}
      onClick={empty ? onRecycle : onDraw}
      sx={{ cursor: 'pointer' }}
    >
      {empty ? <EmptySlot label="Source" /> : <CardBack />}
    </Box>
  );
}

// Only the top (last) draft card is shown and available for later moves.
function Draft({ cards }) {
  const top = cards[cards.length - 1];
  return (
    <Box data-testid="draft" data-count={cards.length}>
      {top ? <Card card={top} /> : <EmptySlot label="Draft" />}
    </Box>
  );
}

function Column({ cards, index }) {
  return (
    <Box data-testid="tableau-column" data-count={cards.length} data-column={index}>
      {cards.map((card, i) => {
        const exposed = i === cards.length - 1;
        return (
          <Box
            key={card.id}
            sx={exposed ? { mt: i === 0 ? 0 : 0.5 } : { aspectRatio: '5 / 1.3', overflow: 'hidden', mb: 0.25 }}
          >
            {exposed ? <Card card={card} /> : <CardBack />}
          </Box>
        );
      })}
    </Box>
  );
}

export default function Board({ game, onDraw, onRecycle }) {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 2, boxSizing: 'border-box' }}>
      <Box component="header" data-testid="header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography data-testid="score" variant="h6">Score: {game.score}</Typography>
        <IconButton aria-label="Menu" data-testid="menu-button"><SettingsIcon /></IconButton>
      </Box>

      <Box data-testid="piles" sx={{ ...row, mb: 1 }}>
        <Source cards={game.source} onDraw={onDraw} onRecycle={onRecycle} />
        <Draft cards={game.draft} />
      </Box>

      <Box data-testid="foundations" sx={{ ...row, mb: 1 }}>
        {game.foundations.map((f, i) => (
          <EmptySlot key={i} label="Foundation" data-testid="foundation" />
        ))}
      </Box>

      <Box data-testid="tableau" sx={{ ...row, alignItems: 'start' }}>
        {game.tableau.map((cards, i) => (
          <Column key={i} cards={cards} index={i} />
        ))}
      </Box>
    </Box>
  );
}
