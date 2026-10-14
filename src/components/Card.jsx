import { Box, Typography } from '@mui/material';
import { CARD_KIND } from '../decks/index.js';

export const CARD_WIDTH = 'var(--card-w, clamp(52px, 17vw, 96px))';
export const CARD_ASPECT = '5 / 7';

const baseSx = {
  width: CARD_WIDTH,
  aspectRatio: CARD_ASPECT,
  borderRadius: 1,
  boxShadow: 2,
  position: 'relative',
  overflow: 'hidden',
  userSelect: 'none',
  color: '#1a1a1a',
};

export function CardBack() {
  return (
    <Box
      data-testid="card-back"
      sx={{
        ...baseSx,
        border: '3px solid #fff',
        background: 'repeating-linear-gradient(45deg, #1e3a8a 0 6px, #2b4fb3 6px 12px)',
      }}
    />
  );
}

// Small label along the top edge, visible when a card is overlapped by the next one.
function CoveredLabel({ children }) {
  return (
    <Typography
      data-testid="covered-label"
      noWrap
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        px: 0.5,
        pt: '1px',
        fontSize: 'clamp(9px, 2.4vw, 12px)',
        fontWeight: 600,
        lineHeight: 1.3,
        textAlign: 'left',
      }}
    >
      {children}
    </Typography>
  );
}

export function TitleCardFace({ card, covered = false }) {
  return (
    <Box
      data-testid="title-card"
      data-card-id={card.id}
      sx={{
        ...baseSx,
        bgcolor: '#fff8e1',
        border: '2px solid #b8860b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0.5,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 'clamp(10px, 2.6vw, 14px)', lineHeight: 1.1 }}>
        {card.categoryTitle}
      </Typography>
      <Typography data-testid="title-count" sx={{ fontSize: 'clamp(9px, 2.2vw, 12px)', color: 'text.secondary' }}>
        {card.itemCount} {card.itemCount === 1 ? 'card' : 'cards'}
      </Typography>
      {covered && <CoveredLabel>{`${card.categoryTitle} (${card.itemCount})`}</CoveredLabel>}
    </Box>
  );
}

export function ItemCardFace({ card, covered = false }) {
  return (
    <Box
      data-testid="item-card"
      data-card-id={card.id}
      sx={{
        ...baseSx,
        bgcolor: '#fff',
        border: '1px solid #999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0.5,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: 'clamp(10px, 2.6vw, 14px)', lineHeight: 1.1, wordBreak: 'break-word' }}>
        {card.itemName}
      </Typography>
      {covered && <CoveredLabel>{card.itemName}</CoveredLabel>}
    </Box>
  );
}

export function EmptySlot({ label, testId }) {
  return (
    <Box
      data-testid={testId}
      sx={{
        ...baseSx,
        boxShadow: 0,
        border: '2px dashed rgba(255,255,255,0.5)',
        color: 'rgba(255,255,255,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(9px, 2.2vw, 12px)',
        textAlign: 'center',
      }}
    >
      {label}
    </Box>
  );
}

export default function Card({ card, faceUp = true, covered = false }) {
  if (!faceUp) return <CardBack />;
  return card.kind === CARD_KIND.TITLE ? (
    <TitleCardFace card={card} covered={covered} />
  ) : (
    <ItemCardFace card={card} covered={covered} />
  );
}
