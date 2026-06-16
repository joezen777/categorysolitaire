import React from 'react';
import { Box, Typography } from '@mui/material';
import { isTitleCard } from '../utils/gameLogic';

const CARD_WIDTH = 70;
const CARD_HEIGHT = 100;

// Category color mapping for visual distinction
const categoryColors = {
  King: '#7B1FA2',
  Chimera: '#C62828',
  Ceramic: '#AD1457',
  Jupiter: '#1565C0',
  Think: '#00695C',
  Smell: '#E65100',
  Winds: '#283593',
  Refuge: '#4E342E',
  Beds: '#1B5E20',
  Wine: '#880E4F',
  Neck: '#F57F17',
  Pirate: '#37474F',
  Aviation: '#0277BD',
};

function getCategoryColor(categoryTitle) {
  return categoryColors[categoryTitle] || '#424242';
}

// Card back design
export function CardBack({ style, onClick, className }) {
  return (
    <Box
      onClick={onClick}
      className={className}
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
        border: '2px solid #3949ab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Diamond pattern */}
      <Box
        sx={{
          width: '50px',
          height: '70px',
          border: '2px solid #5c6bc0',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(92,107,192,0.1) 5px, rgba(92,107,192,0.1) 10px)',
        }}
      >
        <Typography sx={{ fontSize: '18px', color: '#7986cb' }}>♦</Typography>
      </Box>
    </Box>
  );
}

// Card face (title or item)
export function CardFace({ card, compact, style, onClick, selected, className, dragging }) {
  const isTitle = isTitleCard(card);
  const color = getCategoryColor(card.categoryTitle);

  return (
    <Box
      onClick={onClick}
      className={className}
      sx={{
        width: CARD_WIDTH,
        height: compact ? 28 : CARD_HEIGHT,
        borderRadius: compact ? '6px 6px 0 0' : '8px',
        backgroundColor: '#fff',
        border: selected ? '3px solid #FFD600' : `2px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'center',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: dragging
          ? '0 8px 24px rgba(0,0,0,0.4)'
          : selected
          ? '0 0 12px rgba(255,214,0,0.6)'
          : '0 1px 4px rgba(0,0,0,0.2)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: dragging ? 'none' : 'box-shadow 0.2s',
        opacity: dragging ? 0.8 : 1,
        zIndex: dragging ? 1000 : 'auto',
        ...style,
      }}
    >
      {compact ? (
        <Typography
          sx={{
            fontSize: '9px',
            fontWeight: 600,
            color: color,
            textAlign: 'center',
            lineHeight: 1.1,
            px: 0.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
          }}
        >
          {isTitle ? `📋 ${card.categoryTitle}` : card.itemName}
        </Typography>
      ) : (
        <>
          {/* Category badge */}
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              right: 4,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: '8px',
                color: '#fff',
                backgroundColor: color,
                borderRadius: '3px',
                px: 0.5,
                py: 0.1,
                fontWeight: 600,
              }}
            >
              {card.categoryTitle}
            </Typography>
          </Box>

          {/* Main content */}
          <Box sx={{ mt: 1, textAlign: 'center', px: 0.5 }}>
            {isTitle ? (
              <>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: color, mb: 0.3 }}>
                  📋 TITLE
                </Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: color }}>
                  {card.categoryTitle}
                </Typography>
                <Typography sx={{ fontSize: '9px', color: '#666', mt: 0.5 }}>
                  ({card.totalItems} items)
                </Typography>
              </>
            ) : (
              <Typography
                sx={{
                  fontSize: card.itemName.length > 8 ? '11px' : '13px',
                  fontWeight: 600,
                  color: '#333',
                  wordBreak: 'break-word',
                }}
              >
                {card.itemName}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

// Empty card slot placeholder
export function EmptySlot({ onClick, label, style, selected, className }) {
  return (
    <Box
      onClick={onClick}
      className={className}
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: '8px',
        border: selected ? '3px dashed #FFD600' : '2px dashed rgba(255,255,255,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: 'rgba(255,255,255,0.05)',
        flexShrink: 0,
        ...style,
      }}
    >
      {label && (
        <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}

export { CARD_WIDTH, CARD_HEIGHT, getCategoryColor };
