import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mui/material';

/**
 * Wraps any area to make it a drop target.
 * The `data` prop is passed through so the DndContext onDragEnd handler can read it.
 */
export default function DroppableZone({ id, data, children, style }) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data,
  });

  return (
    <Box
      ref={setNodeRef}
      style={{
        outline: isOver ? '2px solid rgba(255,214,0,0.7)' : 'none',
        borderRadius: '8px',
        transition: 'outline 0.15s',
        ...style,
      }}
    >
      {children}
    </Box>
  );
}
