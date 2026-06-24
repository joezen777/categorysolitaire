import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { getCategoryColor } from '../utils/gameLogic';

export default function SolitaireCard({
  card,
  index = 0,
  isStacked = false,
  selected = false,
  onTap = null,
  style = {},
  dragHandlers = {}
}) {
  const { isTitle, categoryTitle, itemName, faceUp } = card;
  const categoryColor = getCategoryColor(categoryTitle);

  // Card dimensions (responsive)
  // Stacked cards are shifted down based on index
  const topOffset = isStacked ? `${index * 28}px` : '0px';

  // Card face-down visual
  const renderCardBack = () => (
    <Paper
      elevation={4}
      onClick={onTap}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
        background: 'repeating-linear-gradient(135deg, #1e1b4b, #1e1b4b 8px, #312e81 8px, #312e81 16px)',
        position: 'relative',
        cursor: 'default',
        boxSizing: 'border-box',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '10%',
          left: '10%',
          right: '10%',
          bottom: '10%',
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: '4px',
        }
      }}
    />
  );

  // Card face-up visual
  const renderCardFront = () => (
    <Paper
      elevation={selected ? 12 : 3}
      onClick={onTap}
      {...dragHandlers}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        border: `2px solid ${categoryColor}`,
        boxShadow: selected 
          ? `0 0 16px ${categoryColor}, inset 0 0 8px ${categoryColor}`
          : `0 0 8px rgba(0, 0, 0, 0.5), inset 0 0 4px ${categoryColor}44`,
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 15, 0.98))',
        backdropFilter: 'blur(8px)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '6px 8px',
        position: 'relative',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        userSelect: 'none',
        touchAction: 'none',
        '&:hover': {
          transform: selected ? 'scale(1.05)' : 'translateY(-2px)',
          boxShadow: `0 0 14px ${categoryColor}, inset 0 0 6px ${categoryColor}66`,
        }
      }}
    >
      {/* Top Header - Always visible when cards are stacked */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '9px', 
            fontWeight: 'bold', 
            color: categoryColor, 
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '65%'
          }}
        >
          {categoryTitle}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '8px', 
            fontWeight: 'bold', 
            color: 'rgba(255, 255, 255, 0.4)',
            letterSpacing: '0.5px'
          }}
        >
          {isTitle ? 'TITLE' : 'ITEM'}
        </Typography>
      </Box>

      {/* Middle/Main Area - Shows the main card contents */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          textAlign: 'center',
          mt: 0.5,
          px: 0.5
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 'bold', 
            fontSize: isTitle ? '13px' : '11px',
            lineHeight: 1.2,
            textShadow: isTitle ? `0 0 6px ${categoryColor}88` : 'none',
            color: isTitle ? categoryColor : '#ffffff',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {itemName}
        </Typography>
        {isTitle && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '8px', 
              color: 'rgba(255,255,255,0.5)', 
              mt: 0.5 
            }}
          >
            ({card.totalItems} cards)
          </Typography>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box
      data-card-id={card.id}
      className="solitaire-card"
      sx={{
        width: { xs: '68px', sm: '80px', md: '90px' },
        height: { xs: '96px', sm: '112px', md: '126px' },
        position: isStacked ? 'absolute' : 'relative',
        top: topOffset,
        left: 0,
        zIndex: index + 1,
        ...style
      }}
    >
      {faceUp ? renderCardFront() : renderCardBack()}
    </Box>
  );
}
