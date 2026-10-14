import { Box, IconButton, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

// Wraps a card so it can be dragged (and still tapped) when `from` is a legal move source.
function Draggable({ id, from, disabled, children, sx, ...props }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { from }, disabled });
  return (
    <Box
      ref={setNodeRef}
      {...(disabled ? {} : { ...attributes, ...listeners })}
      sx={{ touchAction: disabled ? 'auto' : 'none', opacity: isDragging ? 0.35 : 1, ...sx }}
      {...props}
    >
      {children}
    </Box>
  );
}

// Only the top (last) draft card is shown and available for moves.
function Draft({ cards, selected, onSelect }) {
  const top = cards[cards.length - 1];
  return (
    <Box data-testid="draft" data-count={cards.length} onClick={top ? onSelect : undefined} sx={top ? clickable : undefined}>
      {top ? (
        <Draggable id="draft" from={{ type: 'draft' }}>
          <Card card={top} selected={selected} />
        </Draggable>
      ) : (
        <EmptySlot label="Draft" />
      )}
    </Box>
  );
}

const sparkle = keyframes`
  0% { opacity: 0; transform: scale(0.6) rotate(0deg); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.4) rotate(90deg); }
`;
const fadeOut = keyframes`
  0%, 60% { opacity: 1; }
  100% { opacity: 0; }
`;
const SPARKLES = [[10, 15], [70, 10], [40, 40], [15, 70], [75, 65], [50, 85], [85, 35]];

// Shown briefly over a slot whose category was just completed and cleared.
function Glitter({ categoryTitle }) {
  return (
    <Box
      data-testid="glitter"
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 1,
        bgcolor: 'rgba(255, 215, 0, 0.35)',
        border: '2px solid gold',
        pointerEvents: 'none',
        overflow: 'hidden',
        animation: `${fadeOut} 1.2s ease-out forwards`,
      }}
    >
      {SPARKLES.map(([x, y], i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            fontSize: 'clamp(12px, 4vw, 22px)',
            animation: `${sparkle} 0.9s ease-out ${i * 0.1}s infinite`,
          }}
        >
          ✨
        </Box>
      ))}
      <Typography align="center" fontWeight="bold" sx={{ fontSize: 'clamp(9px, 2.8vw, 14px)', mt: '40%' }}>
        {categoryTitle} complete!
      </Typography>
    </Box>
  );
}

function Foundation({ cards, slot, glitter, onClick }) {
  const progress = foundationProgress(cards);
  const { setNodeRef } = useDroppable({ id: `slot-${slot}`, data: { to: { type: 'foundation', slot } } });
  return (
    <Box ref={setNodeRef} data-testid="foundation" data-count={cards.length} onClick={() => onClick(slot)} sx={clickable}>
      <Typography
        data-testid="foundation-progress"
        align="center"
        sx={{ fontSize: 'clamp(8px, 2.4vw, 12px)', minHeight: '1.3em', lineHeight: 1.3, overflowWrap: 'anywhere' }}
      >
        {progress ? `${progress.categoryTitle} ${progress.collected}/${progress.total}` : ''}
      </Typography>
      <Box sx={{ position: 'relative' }}>
        {progress ? <Card card={cards[cards.length - 1]} /> : <EmptySlot label="Foundation" />}
        {glitter && <Glitter categoryTitle={glitter.categoryTitle} />}
      </Box>
    </Box>
  );
}

// Card geometry in container-width units (cqw): a card is 140 tall (5:7), and a covered
// card shows only its top strip so its label stays visible.
export const CARD_H = 140;
export const FACE_DOWN_STEP = 26;
export const FACE_UP_STEP = 44;

// Absolute `top` offsets for a stack; faceUpFlags[i] says whether card i is face up.
export function stackOffsets(faceUpFlags) {
  const tops = [];
  let top = 0;
  for (const up of faceUpFlags) {
    tops.push(top);
    top += up ? FACE_UP_STEP : FACE_DOWN_STEP;
  }
  const last = tops.length ? tops[tops.length - 1] : 0;
  return { tops, height: tops.length ? last + CARD_H : CARD_H };
}

// Static preview of a dragged unit, rendered in the drag overlay.
export function DragStack({ cards, width }) {
  const { tops, height } = stackOffsets(cards.map(() => true));
  return (
    <Box sx={{ width, containerType: 'inline-size' }}>
      <Box sx={{ position: 'relative', height: `${height}cqw` }}>
        {cards.map((card, i) => (
          <Box key={card.id} sx={{ position: 'absolute', left: 0, right: 0, top: `${tops[i]}cqw` }}>
            <Card card={card} compact={i < cards.length - 1} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Column({ cards, faceUpCount, index, selection, canDrag, onClick }) {
  const { setNodeRef } = useDroppable({ id: `col-${index}`, data: { to: { type: 'tableau', col: index } } });
  const firstFaceUp = cards.length - faceUpCount;
  const selectedFrom = selection?.type === 'tableau' && selection.col === index ? selection.index : Infinity;
  const { tops, height } = stackOffsets(cards.map((_, i) => i >= firstFaceUp));
  return (
    <Box
      ref={setNodeRef}
      data-testid="tableau-column"
      data-count={cards.length}
      data-column={index}
      onClick={() => onClick(index, cards.length === 0 ? -1 : null)}
      sx={{ containerType: 'inline-size', ...clickable }}
    >
      <Box sx={{ position: 'relative', height: `${height}cqw` }}>
        {cards.length === 0 && <EmptySlot label="Empty" />}
        {cards.map((card, i) => {
          const last = i === cards.length - 1;
          const faceUp = i >= firstFaceUp;
          const from = { type: 'tableau', col: index, index };
          return (
            <Draggable
              key={card.id}
              id={`tableau-${index}-${i}`}
              from={from}
              disabled={!faceUp || !canDrag(from)}
              data-testid="tableau-card"
              data-top={tops[i]}
              sx={{ position: 'absolute', left: 0, right: 0, top: `${tops[i]}cqw` }}
              onClick={(e) => {
                e.stopPropagation();
                onClick(index, i);
              }}
            >
              {faceUp ? <Card card={card} compact={!last} selected={i >= selectedFrom} /> : <CardBack />}
            </Draggable>
          );
        })}
      </Box>
    </Box>
  );
}

export default function Board({ game, selection, glitter, canDrag, onDraw, onRecycle, onDraftClick, onColumnClick, onFoundationClick }) {
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
          <Foundation key={i} cards={cards} slot={i} glitter={glitter?.slot === i ? glitter : null} onClick={onFoundationClick} />
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
            canDrag={canDrag}
            onClick={onColumnClick}
          />
        ))}
      </Box>
    </Box>
  );
}
