import { Alert, Box, ButtonBase, IconButton, Snackbar, SvgIcon, Typography, keyframes } from '@mui/material';
import Card, { CardBack, EmptySlot } from './Card.jsx';
import { foundationProgress } from '../game/rules.js';

// Vertical offsets between overlapping tableau cards, as multiples of card width.
const FACE_DOWN_OFFSET = 0.18;
const FACE_UP_OFFSET = 0.3;
const CARD_HEIGHT_RATIO = 7 / 5;
export const GLITTER_MS = 1200;

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

const glitter = keyframes`
  0% { opacity: 1; transform: scale(1); filter: brightness(1); }
  25% { filter: brightness(1.6) drop-shadow(0 0 8px #fff59d); }
  60% { opacity: 1; transform: scale(1.08) rotate(-3deg); filter: brightness(1.8) drop-shadow(0 0 14px #ffd54f); }
  100% { opacity: 0; transform: scale(0.4) rotate(8deg); filter: brightness(2); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const SPARKLES = [
  [10, 15], [70, 8], [40, 45], [85, 60], [15, 75], [55, 88], [30, 30], [75, 35],
];

// Completed category: the finished stack glitters, then shrinks and fades away.
function CompletionGlitter({ celebration, cardsById }) {
  const top = celebration.cards[celebration.cards.length - 1];
  return (
    <Box
      data-testid={`foundation-glitter-${celebration.slot}`}
      aria-label={`${celebration.categoryTitle} complete`}
      sx={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        pointerEvents: 'none',
        animation: `${glitter} ${GLITTER_MS}ms ease-in forwards`,
        zIndex: 2,
      }}
    >
      <Card card={cardsById[top.id]} faceUp />
      {SPARKLES.map(([x, y], i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff 0%, #ffeb3b 40%, transparent 70%)',
            animation: `${sparkle} 0.4s ease-in-out ${i * 60}ms infinite`,
          }}
        />
      ))}
    </Box>
  );
}

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
`;

// Highlight for selected cards and a shake animation for rejected moves.
function interactionSx(selected, rejected) {
  return {
    borderRadius: 1,
    outline: selected ? '3px solid #ffeb3b' : 'none',
    outlineOffset: 1,
    animation: rejected ? `${shake} 0.35s ease-in-out` : 'none',
  };
}

function SourcePile({ source, canRecycle, onClick }) {
  const label = source.length ? 'Draw a card' : canRecycle ? 'Recycle draft pile' : 'Source empty';
  return (
    <ButtonBase
      data-testid="source"
      data-count={source.length}
      aria-label={label}
      onClick={onClick}
      disabled={!source.length && !canRecycle}
      sx={{ borderRadius: 1 }}
    >
      {source.length ? <CardBack /> : <EmptySlot testId="source-empty" label={canRecycle ? '↻' : 'Empty'} />}
    </ButtonBase>
  );
}

function DraftPile({ draft, cardsById, selected, rejectKey, onClick }) {
  const top = draft[draft.length - 1];
  return (
    <Box data-testid="draft" data-count={draft.length}>
      {top ? (
        <Box
          key={rejectKey}
          data-testid="draft-top"
          data-card-id={top.id}
          data-selected={selected}
          onClick={onClick}
          sx={{ cursor: 'pointer', ...interactionSx(selected, rejectKey != null) }}
        >
          <Card card={cardsById[top.id]} faceUp />
        </Box>
      ) : (
        <EmptySlot testId="draft-empty" label="Draft" />
      )}
    </Box>
  );
}

function TableauColumn({ column, cardsById, index, selectedIndex, rejectKey, onCardClick, onColumnClick }) {
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
      {column.length === 0 && (
        <Box data-testid={`tableau-empty-${index}`} onClick={onColumnClick} sx={{ cursor: 'pointer' }}>
          <EmptySlot />
        </Box>
      )}
      {column.map((entry, i) => {
        const selected = selectedIndex != null && i >= selectedIndex;
        return (
          <Box
            key={selected && rejectKey != null ? `${entry.id}-${rejectKey}` : entry.id}
            data-card-id={entry.id}
            data-face-up={entry.faceUp}
            data-selected={selected}
            onClick={() => onCardClick(i)}
            sx={{
              position: 'absolute',
              left: 0,
              top: `calc(var(--card-w) * ${tops[i]})`,
              cursor: 'pointer',
              ...interactionSx(selected, selected && rejectKey != null),
            }}
          >
            <Card card={cardsById[entry.id]} faceUp={entry.faceUp} />
          </Box>
        );
      })}
    </Box>
  );
}

function FoundationSlot({ slot, index, cardsById, celebration, onClick }) {
  const progress = foundationProgress(slot, cardsById);
  const top = slot?.cards[slot.cards.length - 1];
  return (
    <Box
      data-testid={`foundation-${index}`}
      data-empty={!slot}
      data-category={slot?.categoryTitle ?? ''}
      data-collected={progress?.collected ?? 0}
      onClick={onClick}
      sx={{ cursor: 'pointer', width: 'var(--card-w)', position: 'relative' }}
    >
      <Typography
        data-testid={`foundation-progress-${index}`}
        noWrap
        sx={{ fontSize: 'clamp(9px, 2.2vw, 12px)', textAlign: 'center', minHeight: '1.5em' }}
      >
        {progress ? `${progress.categoryTitle} ${progress.collected}/${progress.total}` : ''}
      </Typography>
      {top ? <Card card={cardsById[top.id]} faceUp /> : <EmptySlot />}
      {celebration && <CompletionGlitter key={celebration.key} celebration={celebration} cardsById={cardsById} />}
    </Box>
  );
}

const rowSx = { display: 'flex', justifyContent: 'space-between', gap: 'var(--gap)' };

export default function Board({
  state,
  cardsById,
  selection,
  rejection,
  celebrations,
  onSourceClick,
  onDraftClick,
  onTableauCardClick,
  onTableauColumnClick,
  onFoundationClick,
  onDismissRejection,
}) {
  const rejectKey = rejection?.key;
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
        <SourcePile source={state.source} canRecycle={state.draft.length > 0} onClick={onSourceClick} />
        <DraftPile
          draft={state.draft}
          cardsById={cardsById}
          selected={selection?.type === 'draft'}
          rejectKey={selection?.type === 'draft' ? rejectKey : undefined}
          onClick={onDraftClick}
        />
        <Box sx={{ flex: 1 }} />
      </Box>

      <Box data-testid="foundations" sx={rowSx}>
        {state.foundations.map((slot, i) => (
          <FoundationSlot
            key={i}
            index={i}
            slot={slot}
            cardsById={cardsById}
            celebration={celebrations?.find((c) => c.slot === i)}
            onClick={() => onFoundationClick(i)}
          />
        ))}
      </Box>

      <Box data-testid="tableau" sx={{ ...rowSx, alignItems: 'flex-start' }}>
        {state.tableau.map((column, i) => {
          const isSelectedCol = selection?.type === 'tableau' && selection.col === i;
          return (
            <TableauColumn
              key={i}
              index={i}
              column={column}
              cardsById={cardsById}
              selectedIndex={isSelectedCol ? selection.index : null}
              rejectKey={isSelectedCol ? rejectKey : undefined}
              onCardClick={(cardIndex) => onTableauCardClick(i, cardIndex)}
              onColumnClick={() => onTableauColumnClick(i)}
            />
          );
        })}
      </Box>

      <Snackbar
        open={!!rejection}
        autoHideDuration={2500}
        onClose={onDismissRejection}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert data-testid="rejection" severity="warning" variant="filled" onClose={onDismissRejection}>
          {rejection?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
