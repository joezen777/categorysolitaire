import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import Box from '@mui/material/Box'

export default function DroppableZone({ id, children, onClick }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <Box
      ref={setNodeRef}
      onClick={onClick}
      sx={{
        position: 'relative',
        outline: isOver ? '2px solid #ffeb3b' : 'none',
        borderRadius: 1,
      }}
    >
      {children}
    </Box>
  )
}
