import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';

/**
 * Wraps any card content to make it draggable.
 * The `data` prop is passed through to dnd-kit so drop targets can inspect it.
 */
export default function DraggableCard({ id, data, disabled, children, style }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
    zIndex: isDragging ? 9999 : undefined,
    ...style,
  };

  return (
    <Box
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
    >
      {children}
    </Box>
  );
}
