import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import StockArea from './StockArea';
import Foundation from './Foundation';
import Tableau from './Tableau';
import SettingsMenu from './SettingsMenu';
import WinModal from './WinModal';
import { CardFace, CARD_HEIGHT } from './Card';
import { useGame } from '../context/GameContext';
import { useSelection } from '../context/SelectionContext';
import { getMovableSequence } from '../utils/gameLogic';

const STACK_OFFSET_FACEUP = 28;

export default function GameBoard() {
  const { score, tableau, wastePile, moveCard } = useGame();
  const { clearSelection } = useSelection();
  const [activeData, setActiveData] = useState(null);

  // Configure sensors with activation constraints for touch vs click distinction
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveData(active.data.current);
    clearSelection();
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveData(null);

    if (!over || !active.data.current) return;

    const source = active.data.current;
    const destination = over.data.current;

    if (!destination) return;

    // Don't move to same location
    if (
      source.type === 'tableau' &&
      destination.type === 'tableau' &&
      source.colIndex === destination.colIndex
    ) {
      return;
    }

    moveCard(source, destination);
  };

  const handleDragCancel = () => {
    setActiveData(null);
  };

  // Build the drag overlay content
  const renderDragOverlay = () => {
    if (!activeData) return null;

    if (activeData.type === 'waste') {
      const card = wastePile[wastePile.length - 1];
      if (!card) return null;
      return <CardFace card={card} dragging />;
    }

    if (activeData.type === 'tableau') {
      const column = tableau[activeData.colIndex];
      const sequence = getMovableSequence(column, activeData.cardIndex);
      if (!sequence) return null;

      return (
        <Box sx={{ position: 'relative' }}>
          {sequence.map((card, i) => (
            <Box
              key={card.id}
              sx={{
                position: i === 0 ? 'relative' : 'absolute',
                top: i * STACK_OFFSET_FACEUP,
                left: 0,
                zIndex: i,
              }}
            >
              <CardFace
                card={card}
                compact={i < sequence.length - 1}
                dragging
              />
            </Box>
          ))}
          {/* Spacer for height */}
          {sequence.length > 1 && (
            <Box sx={{ height: (sequence.length - 1) * STACK_OFFSET_FACEUP + CARD_HEIGHT, visibility: 'hidden' }} />
          )}
        </Box>
      );
    }

    return null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          padding: '8px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {/* Header: Score + Settings */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 1,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            Score: {score}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Category Solitaire
          </Typography>
          <SettingsMenu />
        </Box>

        {/* Stock + Waste area */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 1 }}>
          <StockArea />
        </Box>

        {/* Foundation (5 slots) */}
        <Box sx={{ px: 0.5 }}>
          <Foundation />
        </Box>

        {/* Tableau (play area) */}
        <Box sx={{ flex: 1, px: 0.5, pb: 2 }}>
          <Tableau />
        </Box>

        {/* Win Modal */}
        <WinModal />
      </Box>

      {/* Drag Overlay - renders the floating card during drag */}
      <DragOverlay dropAnimation={null}>
        {renderDragOverlay()}
      </DragOverlay>
    </DndContext>
  );
}
