import React from 'react'
import Box from '@mui/material/Box'
import CardFace, { CardBack, EmptySlot, CARD_HEIGHT } from './CardFace'
import DraggableCard from './DraggableCard'
import DroppableZone from './DroppableZone'

const FACE_DOWN_OFFSET = 16
const FACE_UP_OFFSET = 28

export default function Tableau({ tableau, onTap, onTapEmpty, selectedCard }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
      {tableau.map((column, colIdx) => {
        let topOffset = 0
        const offsets = column.map((card, idx) => {
          const offset = topOffset
          topOffset += card.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET
          return offset
        })
        const totalHeight = column.length === 0
          ? CARD_HEIGHT
          : offsets[offsets.length - 1] + CARD_HEIGHT

        return (
          <DroppableZone
            key={colIdx}
            id={`tableau-${colIdx}`}
            onClick={() => {
              if (column.length === 0) onTapEmpty(`tableau-${colIdx}`)
            }}
          >
            <Box sx={{ position: 'relative', width: 72, minHeight: totalHeight }}>
              {column.length === 0 && <EmptySlot label="" />}
              {column.map((card, cardIdx) => {
                const isLastFaceUp = card.faceUp && (
                  cardIdx === column.length - 1 ||
                  !column.slice(cardIdx).every(c => c.faceUp) === false
                )
                const canDrag = card.faceUp
                const dragId = `tableau-${colIdx}-${cardIdx}`
                const isSelected = selectedCard?.id === dragId

                return (
                  <Box
                    key={card.id}
                    sx={{
                      position: 'absolute',
                      top: offsets[cardIdx],
                      left: 0,
                      zIndex: cardIdx,
                    }}
                  >
                    {card.faceUp ? (
                      <DraggableCard
                        id={dragId}
                        disabled={!canDrag}
                        isSelected={isSelected}
                        onTap={() => onTap(dragId, 'tableau', { col: colIdx, cardIdx })}
                      >
                        {cardIdx < column.length - 1 ? (
                          <CardFace card={card} compact />
                        ) : (
                          <CardFace card={card} />
                        )}
                      </DraggableCard>
                    ) : (
                      cardIdx < column.length - 1 ? (
                        <Box sx={{
                          width: 72,
                          height: FACE_DOWN_OFFSET,
                          borderRadius: '4px 4px 0 0',
                          border: '2px solid #555',
                          borderBottom: 'none',
                          bgcolor: '#b71c1c',
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)',
                        }} />
                      ) : (
                        <CardBack />
                      )
                    )}
                  </Box>
                )
              })}
            </Box>
          </DroppableZone>
        )
      })}
    </Box>
  )
}
