import { Box, IconButton, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import Card, { CardBack, EmptySlot } from './Card';

const GAP = 0.5;
const row = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: GAP };

function Pile({ cards, label, testId }) {
  return (
    <Box data-testid={testId} data-count={cards.length}>
      {cards.length ? <CardBack /> : <EmptySlot label={label} />}
    </Box>
  );
}

function Column({ cards, index }) {
  return (
    <Box data-testid="tableau-column" data-count={cards.length} data-column={index}>
      {cards.map((card, i) => {
        const exposed = i === cards.length - 1;
        return (
          <Box key={card.id} sx={{ mt: i === 0 ? 0 : exposed ? 0.5 : 'calc(-1 * (100vw - 32px) / 5 * 1.4 * 0.8)' }}>
            {exposed ? <Card card={card} /> : <CardBack />}
          </Box>
        );
      })}
    </Box>
  );
}

export default function Board({ game }) {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 2, boxSizing: 'border-box' }}>
      <Box component="header" data-testid="header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography data-testid="score" variant="h6">Score: {game.score}</Typography>
        <IconButton aria-label="Menu" data-testid="menu-button"><SettingsIcon /></IconButton>
      </Box>

      <Box data-testid="piles" sx={{ ...row, mb: 1 }}>
        <Pile cards={game.source} label="Source" testId="source" />
        <Pile cards={game.draft} label="Draft" testId="draft" />
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
