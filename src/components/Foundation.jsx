import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CardFace, { EmptySlot, CARD_WIDTH } from './CardFace'
import DroppableZone from './DroppableZone'

export default function Foundation({ foundations, onTap, completingSlot, selectedCard }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, justifyContent: 'center' }}>
      {foundations.map((foundation, i) => (
        <DroppableZone
          key={i}
          id={`foundation-${i}`}
          onClick={() => onTap(`foundation-${i}`)}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {foundation && (
              <Typography sx={{
                fontSize: 9,
                color: '#fff',
                textAlign: 'center',
                mb: 0.3,
                maxWidth: CARD_WIDTH,
              }} noWrap>
                {foundation.categoryTitle} {foundation.cards.filter(c => c.itemName).length}/{foundation.totalItems}
              </Typography>
            )}
            <Box sx={{
              animation: completingSlot === i ? 'glitter 0.3s ease-in-out infinite alternate' : 'none',
              '@keyframes glitter': {
                '0%': { filter: 'brightness(1) hue-rotate(0deg)' },
                '100%': { filter: 'brightness(1.5) hue-rotate(40deg)' },
              },
            }}>
              {foundation ? (
                <CardFace card={foundation.cards[foundation.cards.length - 1]} />
              ) : (
                <EmptySlot label="Title" />
              )}
            </Box>
          </Box>
        </DroppableZone>
      ))}
    </Box>
  )
}
