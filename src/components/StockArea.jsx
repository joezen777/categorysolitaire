import React from 'react';
import { Box, Typography } from '@mui/material';
import { CardBack, CardFace, EmptySlot, CARD_WIDTH } from './Card';
import DraggableCard from './DraggableCard';
import { useGame } from '../context/GameContext';
import { useSelection } from '../context/SelectionContext';

export default function StockArea() {
  const { stockPile, wastePile, drawCard, resetStock } = useGame();
  const { selected, select, clearSelection } = useSelection();

  const handleStockClick = () => {
    if (stockPile.length > 0) {
      drawCard();
    } else if (wastePile.length > 0) {
      resetStock();
    }
  };

  const handleWasteClick = () => {
    if (wastePile.length === 0) return;

    if (selected && selected.type === 'waste') {
      clearSelection();
    } else {
      select({ type: 'waste' });
    }
  };

  const topWasteCard = wastePile.length > 0 ? wastePile[wastePile.length - 1] : null;
  const isWasteSelected = selected?.type === 'waste';

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      {/* Stock pile */}
      <Box sx={{ position: 'relative' }}>
        {stockPile.length > 0 ? (
          <Box sx={{ position: 'relative' }}>
            <CardBack onClick={handleStockClick} style={{ cursor: 'pointer' }} />
            <Typography
              sx={{
                position: 'absolute',
                bottom: -18,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {stockPile.length}
            </Typography>
          </Box>
        ) : (
          <EmptySlot onClick={handleStockClick} label="♻️" />
        )}
      </Box>

      {/* Waste pile - draggable top card */}
      <Box sx={{ position: 'relative' }}>
        {topWasteCard ? (
          <DraggableCard
            id="waste-top"
            data={{ type: 'waste' }}
            disabled={false}
          >
            <CardFace
              card={topWasteCard}
              onClick={handleWasteClick}
              selected={isWasteSelected}
            />
          </DraggableCard>
        ) : (
          <EmptySlot label="" />
        )}
      </Box>
    </Box>
  );
}
