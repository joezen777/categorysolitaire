import React from 'react'
import Box from '@mui/material/Box'
import CardFace, { CardBack, EmptySlot } from './CardFace'
import DraggableCard from './DraggableCard'

export default function StockAndWaste({ stock, waste, onDraw, onTap, selectedCard }) {
  const topWaste = waste.length > 0 ? waste[waste.length - 1] : null

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
      <Box onClick={onDraw} sx={{ cursor: 'pointer' }}>
        {stock.length > 0 ? <CardBack /> : <EmptySlot onClick={onDraw} label="↻" />}
      </Box>

      <Box>
        {topWaste ? (
          <DraggableCard
            id="waste-top"
            isSelected={selectedCard?.id === 'waste-top'}
            onTap={() => onTap('waste-top', 'waste', {})}
          >
            <CardFace card={topWaste} />
          </DraggableCard>
        ) : (
          <EmptySlot label="" />
        )}
      </Box>
    </Box>
  )
}
