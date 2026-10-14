import { Card as MuiCard, CardContent, Typography } from '@mui/material';
import { CARD_TYPE } from '../deck';

export default function Card({ card }) {
  const isTitle = card.type === CARD_TYPE.TITLE;
  return (
    <MuiCard
      variant="outlined"
      sx={{
        width: 130,
        minHeight: 80,
        bgcolor: isTitle ? 'primary.main' : 'background.paper',
        color: isTitle ? 'primary.contrastText' : 'text.primary',
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        {isTitle ? (
          <>
            <Typography variant="subtitle1" fontWeight="bold">{card.categoryTitle}</Typography>
            <Typography variant="body2">{card.itemCount} items</Typography>
          </>
        ) : (
          <Typography variant="body1">{card.itemName}</Typography>
        )}
      </CardContent>
    </MuiCard>
  );
}
