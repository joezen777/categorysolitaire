import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import Box from '@mui/material/Box'

export default function DraggableCard({ id, children, disabled = false, isSelected = false, onTap }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (onTap) onTap()
  }

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      sx={{
        opacity: isDragging ? 0.4 : 1,
        cursor: disabled ? 'default' : 'grab',
        touchAction: 'none',
        outline: isSelected ? '3px solid #ffeb3b' : 'none',
        borderRadius: 1,
        zIndex: isDragging ? 1000 : 'auto',
      }}
    >
      {children}
    </Box>
  )
}
