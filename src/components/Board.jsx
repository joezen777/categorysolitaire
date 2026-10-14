import { Box, IconButton, SvgIcon, Typography } from '@mui/material';
import Card, { EmptySlot } from './Card.jsx';

// Vertical offsets between overlapping tableau cards, as multiples of card width.
const FACE_DOWN_OFFSET = 0.18;
const FACE_UP_OFFSET = 0.3;
const CARD_HEIGHT_RATIO = 7 / 5;

function SettingsIcon() {
  return (
    <SvgIcon>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </SvgIcon>
  );
}

function TopBar({ score }) {
  return (
    <Box data-testid="top-bar" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography data-testid="score" sx={{ fontWeight: 700 }}>
        Score: {score}
      </Typography>
      <IconButton aria-label="menu" data-testid="menu-cog" sx={{ color: 'inherit' }}>
        <SettingsIcon />
      </IconButton>
    </Box>
  );
}

function Pile({ pile, cardsById, testId, emptyLabel }) {
  const top = pile[pile.length - 1];
  return (
    <Box data-testid={testId} data-count={pile.length}>
      {top ? <Card card={cardsById[top.id]} faceUp={top.faceUp} /> : <EmptySlot label={emptyLabel} />}
    </Box>
  );
}

function TableauColumn({ column, cardsById, index }) {
  let top = 0;
  const tops = column.map((entry) => {
    const t = top;
    top += entry.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
    return t;
  });
  const lastTop = tops.length ? tops[tops.length - 1] : 0;
  return (
    <Box
      data-testid={`tableau-column-${index}`}
      data-count={column.length}
      sx={{
        position: 'relative',
        width: 'var(--card-w)',
        height: `calc(var(--card-w) * ${lastTop + CARD_HEIGHT_RATIO})`,
      }}
    >
      {column.length === 0 && <EmptySlot />}
      {column.map((entry, i) => (
        <Box
          key={entry.id}
          data-card-id={entry.id}
          data-face-up={entry.faceUp}
          sx={{ position: 'absolute', left: 0, top: `calc(var(--card-w) * ${tops[i]})` }}
        >
          <Card card={cardsById[entry.id]} faceUp={entry.faceUp} />
        </Box>
      ))}
    </Box>
  );
}

const rowSx = { display: 'flex', justifyContent: 'space-between', gap: 'var(--gap)' };

export default function Board({ state, cardsById }) {
  return (
    <Box
      sx={{
        '--card-w': 'min(96px, calc((100vw - 16px - 4 * var(--gap)) / 5))',
        '--gap': 'clamp(4px, 1.5vw, 12px)',
        maxWidth: 560,
        mx: 'auto',
        px: 1,
        py: 1,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <TopBar score={state.score} />

      <Box data-testid="pile-row" sx={rowSx}>
        <Pile pile={state.source} cardsById={cardsById} testId="source" emptyLabel="Empty" />
        <Pile pile={state.draft} cardsById={cardsById} testId="draft" emptyLabel="Draft" />
        <Box sx={{ flex: 1 }} />
      </Box>

      <Box data-testid="foundations" sx={rowSx}>
        {state.foundations.map((slot, i) => (
          <Box key={i} data-testid={`foundation-${i}`} data-empty={!slot}>
            <EmptySlot />
          </Box>
        ))}
      </Box>

      <Box data-testid="tableau" sx={{ ...rowSx, alignItems: 'flex-start' }}>
        {state.tableau.map((column, i) => (
          <TableauColumn key={i} index={i} column={column} cardsById={cardsById} />
        ))}
      </Box>
    </Box>
  );
}
