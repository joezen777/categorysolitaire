import { Box, Typography } from '@mui/material';
import { CARD_TYPE } from '../deck';

const frame = {
  width: '100%',
  aspectRatio: '5 / 7',
  borderRadius: 1,
  border: 1,
  borderColor: 'divider',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

export function CardBack(props) {
  return (
    <Box
      data-testid="card-back"
      sx={{
        ...frame,
        bgcolor: 'primary.dark',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 4px, transparent 4px 8px)',
      }}
      {...props}
    />
  );
}

export function EmptySlot({ label, ...props }) {
  return (
    <Box
      sx={{ ...frame, borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}
      {...props}
    >
      {label && <Typography sx={{ fontSize: 'clamp(8px, 2.4vw, 12px)' }}>{label}</Typography>}
    </Box>
  );
}

export default function Card({ card }) {
  const isTitle = card.type === CARD_TYPE.TITLE;
  return (
    <Box
      data-testid="card-face"
      data-card-id={card.id}
      sx={{
        ...frame,
        p: 0.5,
        bgcolor: isTitle ? 'primary.main' : 'background.paper',
        color: isTitle ? 'primary.contrastText' : 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
        overflowWrap: 'anywhere',
      }}
    >
      {isTitle ? (
        <>
          <Typography fontWeight="bold" sx={{ fontSize: 'clamp(9px, 2.8vw, 15px)', lineHeight: 1.15 }}>
            {card.categoryTitle}
          </Typography>
          <Typography sx={{ fontSize: 'clamp(8px, 2.4vw, 12px)' }}>{card.itemCount} items</Typography>
        </>
      ) : (
        <Typography sx={{ fontSize: 'clamp(9px, 2.8vw, 15px)', lineHeight: 1.15 }}>{card.itemName}</Typography>
      )}
    </Box>
  );
}
