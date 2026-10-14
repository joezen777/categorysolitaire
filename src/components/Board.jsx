import { Box, IconButton, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import Card, { CardBack, EmptySlot } from './Card';
import { foundationProgress } from '../game/moves';

const GAP = 0.5;
const row = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: GAP };
const clickable = { cursor: 'pointer' };

function Source({ cards, onDraw, onRecycle }) {
  const empty = cards.length === 0;
  return (
    <Box
      data-testid="source"
      data-count={cards.length}
      role="button"
      aria-label={empty ? 'Recycle draft into source' : 'Draw a card'}
      onClick={empty ? onRecycle : onDraw}
      sx={clickable}
    >
      {empty ? <EmptySlot label="Source" /> : <CardBack />}
    </Box>
  );
}

// Only the top (last) draft card is shown and available for moves.
function Draft({ cards, selected, onSelect }) {
  const top = cards[cards.length - 1];
  return (
    <Box data-testid="draft" data-count={cards.length} onClick={top ? onSelect : undefined} sx={top ? clickable : undefined}>
      {top ? <Card card={top} selected={selected} /> : <EmptySlot label="Draft" />}
    </Box>
  );
}

function Foundation({ cards, slot, onClick }) {
  const progress = foundationProgress(cards);
  return (
    <Box data-testid="foundation" data-count={cards.length} onClick={() => onClick(slot)} sx={clickable}>
      {progress ? <Card card={cards[cards.length - 1]} /> : <EmptySlot label="Foundation" />}
      {progress && (
        <Typography
          data-testid="foundation-progress"
          align="center"
          sx={{ fontSize: 'clamp(8px, 2.4vw, 12px)', mt: 0.25 }}
        >
          {progress.categoryTitle} {progress.collected}/{progress.total}
        </Typography>
      )}
    </Box>
  );
}

function Column({ cards, faceUpCount, index, selection, onClick }) {
  const firstFaceUp = cards.length - faceUpCount;
  const selectedFrom = selection?.type === 'tableau' && selection.col === index ? selection.index : Infinity;
  return (
    <Box
      data-testid="tableau-column"
      data-count={cards.length}
      data-column={index}
      onClick={() => onClick(index, cards.length === 0 ? -1 : null)}
      sx={{ minHeight: 40, ...clickable }}
    >
      {cards.length === 0 && <EmptySlot label="Empty" />}
      {cards.map((card, i) => {
        const last = i === cards.length - 1;
        const faceUp = i >= firstFaceUp;
        const sx = last
          ? { mt: i === 0 ? 0 : 0.5 }
          : { aspectRatio: faceUp ? '5 / 2.2' : '5 / 1.3', overflow: 'hidden', mb: 0.25 };
        return (
          <Box
            key={card.id}
            sx={sx}
            onClick={(e) => {
              e.stopPropagation();
              onClick(index, i);
            }}
          >
            {faceUp ? <Card card={card} compact={!last} selected={i >= selectedFrom} /> : <CardBack />}
          </Box>
        );
      })}
    </Box>
  );
}

export default function Board({ game, selection, onDraw, onRecycle, onDraftClick, onColumnClick, onFoundationClick }) {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 2, boxSizing: 'border-box' }}>
      <Box component="header" data-testid="header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography data-testid="score" variant="h6">Score: {game.score}</Typography>
        <IconButton aria-label="Menu" data-testid="menu-button"><SettingsIcon /></IconButton>
      </Box>

      <Box data-testid="piles" sx={{ ...row, mb: 1 }}>
        <Source cards={game.source} onDraw={onDraw} onRecycle={onRecycle} />
        <Draft cards={game.draft} selected={selection?.type === 'draft'} onSelect={onDraftClick} />
      </Box>

      <Box data-testid="foundations" sx={{ ...row, mb: 1, alignItems: 'start' }}>
        {game.foundations.map((cards, i) => (
          <Foundation key={i} cards={cards} slot={i} onClick={onFoundationClick} />
        ))}
      </Box>

      <Box data-testid="tableau" sx={{ ...row, alignItems: 'start' }}>
        {game.tableau.map((cards, i) => (
          <Column
            key={i}
            cards={cards}
            faceUpCount={game.faceUpCounts[i]}
            index={i}
            selection={selection}
            onClick={onColumnClick}
          />
        ))}
      </Box>
    </Box>
  );
}
