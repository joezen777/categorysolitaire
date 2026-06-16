import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { isTitleCard } from '../utils/gameLogic'

const CARD_WIDTH = 72
const CARD_HEIGHT = 100

export { CARD_WIDTH, CARD_HEIGHT }

export default function CardFace({ card, compact = false }) {
  if (!card) return null

  const isTitle = isTitleCard(card)

  return (
    <Box sx={{
      width: CARD_WIDTH,
      height: compact ? 28 : CARD_HEIGHT,
      borderRadius: 1,
      border: '2px solid #555',
      bgcolor: isTitle ? '#1a237e' : '#fff',
      color: isTitle ? '#fff' : '#333',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: compact ? 'center' : 'center',
      overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      position: 'relative',
    }}>
      {compact ? (
        <Typography sx={{ fontSize: 9, fontWeight: 600, textAlign: 'center', px: 0.3, lineHeight: 1.1 }} noWrap>
          {card.itemName || card.categoryTitle}
        </Typography>
      ) : (
        <>
          <Typography sx={{
            fontSize: isTitle ? 11 : 9,
            fontWeight: 700,
            textAlign: 'center',
            px: 0.5,
            pt: 0.5,
            color: isTitle ? '#90caf9' : '#666',
          }}>
            {card.categoryTitle}
          </Typography>
          <Typography sx={{
            fontSize: isTitle ? 13 : 12,
            fontWeight: 600,
            textAlign: 'center',
            px: 0.5,
            mt: isTitle ? 1 : 0.5,
          }}>
            {isTitle ? `📋 ${card.categoryTitle}` : card.itemName}
          </Typography>
          {isTitle && (
            <Typography sx={{ fontSize: 9, mt: 0.5, opacity: 0.7 }}>
              (Title Card)
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}

export function CardBack() {
  return (
    <Box sx={{
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 1,
      border: '2px solid #555',
      bgcolor: '#b71c1c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)',
    }}>
      <Box sx={{
        width: 50,
        height: 70,
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: 20 }}>♦</Typography>
      </Box>
    </Box>
  )
}

export function EmptySlot({ onClick, label }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 1,
        border: '2px dashed rgba(255,255,255,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {label && (
        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          {label}
        </Typography>
      )}
    </Box>
  )
}
