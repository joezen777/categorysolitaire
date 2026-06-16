import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import deckData from './data/deck'
import { initializeGame, isTitleCard, canMoveToTableauColumn, canMoveToFoundation, getCategoryItemCount } from './utils/gameLogic'
import { playError, playSuccess } from './utils/audio'
import StockAndWaste from './components/StockAndWaste'
import Foundation from './components/Foundation'
import Tableau from './components/Tableau'
import ScoreDisplay from './components/ScoreDisplay'
import MenuButton from './components/MenuButton'
import WinModal from './components/WinModal'
import CardFace from './components/CardFace'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4caf50' },
    background: { default: '#1b5e20' },
  },
})

export default function App() {
  const [game, setGame] = useState(() => initializeGame(deckData))
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [selectedCard, setSelectedCard] = useState(null)
  const [draggedCards, setDraggedCards] = useState(null)
  const [completingSlot, setCompletingSlot] = useState(null)
  const [gameWon, setGameWon] = useState(false)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  const checkWin = useCallback((state) => {
    const allTableauEmpty = state.tableau.every(col => col.length === 0)
    const stockEmpty = state.stock.length === 0
    const wasteEmpty = state.waste.length === 0
    if (allTableauEmpty && stockEmpty && wasteEmpty) {
      setGameWon(true)
    }
  }, [])

  const drawCard = useCallback(() => {
    setGame(prev => {
      if (prev.stock.length === 0) {
        if (prev.waste.length === 0) return prev
        const newStock = [...prev.waste].reverse().map(c => ({ ...c, faceUp: false }))
        return { ...prev, stock: newStock, waste: [] }
      }
      const card = { ...prev.stock[prev.stock.length - 1], faceUp: true }
      return {
        ...prev,
        stock: prev.stock.slice(0, -1),
        waste: [...prev.waste, card],
      }
    })
  }, [])

  const parseDropId = (id) => {
    if (!id) return null
    if (id.startsWith('foundation-')) return { zone: 'foundation', index: parseInt(id.split('-')[1]) }
    if (id.startsWith('tableau-')) return { zone: 'tableau', index: parseInt(id.split('-')[1]) }
    return null
  }

  const parseDragId = (id) => {
    if (!id) return null
    if (id === 'waste-top') return { zone: 'waste' }
    if (id.startsWith('tableau-')) {
      const parts = id.split('-')
      return { zone: 'tableau', col: parseInt(parts[1]), cardIdx: parseInt(parts[2]) }
    }
    if (id.startsWith('foundation-')) {
      const parts = id.split('-')
      return { zone: 'foundation', index: parseInt(parts[1]) }
    }
    return null
  }

  const getCardsFromSource = (source, state) => {
    if (source.zone === 'waste') {
      if (state.waste.length === 0) return null
      return [state.waste[state.waste.length - 1]]
    }
    if (source.zone === 'tableau') {
      const col = state.tableau[source.col]
      return col.slice(source.cardIdx)
    }
    if (source.zone === 'foundation') {
      const f = state.foundations[source.index]
      if (!f || f.cards.length === 0) return null
      return [f.cards[f.cards.length - 1]]
    }
    return null
  }

  const attemptMove = useCallback((sourceId, destId) => {
    const source = parseDragId(sourceId)
    const dest = parseDropId(destId)
    if (!source || !dest) return false

    let moved = false
    setGame(prev => {
      const cards = getCardsFromSource(source, prev)
      if (!cards || cards.length === 0) return prev

      if (dest.zone === 'foundation') {
        const fIndex = dest.index
        const foundation = prev.foundations[fIndex]

        if (!canMoveToFoundation(cards, foundation, deckData)) {
          if (soundEnabled) playError()
          return prev
        }

        const card = cards[0]
        const newFoundations = [...prev.foundations]

        if (foundation === null) {
          if (!isTitleCard(card)) {
            if (soundEnabled) playError()
            return prev
          }
          const totalItems = getCategoryItemCount(deckData, card.categoryTitle)
          newFoundations[fIndex] = { categoryTitle: card.categoryTitle, cards: [card], totalItems }
        } else {
          newFoundations[fIndex] = {
            ...foundation,
            cards: [...foundation.cards, card],
          }
        }

        let newState = { ...prev, foundations: newFoundations }
        newState = removeFromSource(source, newState, 1)
        newState = { ...newState, score: newState.score + 10 }

        const f = newFoundations[fIndex]
        if (f && !isTitleCard(card) && f.cards.filter(c => !isTitleCard(c)).length === f.totalItems) {
          newState = { ...newState, score: newState.score + 100 }
          setTimeout(() => {
            if (soundEnabled) playSuccess()
            setCompletingSlot(fIndex)
            setTimeout(() => {
              setCompletingSlot(null)
              setGame(g => {
                const nf = [...g.foundations]
                nf[fIndex] = null
                const updated = { ...g, foundations: nf }
                checkWin(updated)
                return updated
              })
            }, 1200)
          }, 100)
        } else {
          setTimeout(() => checkWin(newState), 50)
        }

        moved = true
        return newState
      }

      if (dest.zone === 'tableau') {
        const targetCol = prev.tableau[dest.index]

        if (!canMoveToTableauColumn(cards, targetCol)) {
          if (soundEnabled) playError()
          return prev
        }

        const newTableau = prev.tableau.map((col, i) => {
          if (i === dest.index) {
            return [...col, ...cards.map(c => ({ ...c, faceUp: true }))]
          }
          return col
        })

        let newState = { ...prev, tableau: newTableau }
        newState = removeFromSource(source, newState, cards.length)

        moved = true
        setTimeout(() => checkWin(newState), 50)
        return newState
      }

      return prev
    })

    return moved
  }, [soundEnabled, checkWin])

  const removeFromSource = (source, state, count) => {
    if (source.zone === 'waste') {
      return { ...state, waste: state.waste.slice(0, -1) }
    }
    if (source.zone === 'tableau') {
      const newTableau = state.tableau.map((col, i) => {
        if (i !== source.col) return col
        const newCol = col.slice(0, source.cardIdx)
        if (newCol.length > 0 && !newCol[newCol.length - 1].faceUp) {
          newCol[newCol.length - 1] = { ...newCol[newCol.length - 1], faceUp: true }
        }
        return newCol
      })
      return { ...state, tableau: newTableau }
    }
    if (source.zone === 'foundation') {
      const newFoundations = [...state.foundations]
      const f = newFoundations[source.index]
      newFoundations[source.index] = { ...f, cards: f.cards.slice(0, -1) }
      return { ...state, foundations: newFoundations }
    }
    return state
  }

  const handleDragStart = (event) => {
    const source = parseDragId(event.active.id)
    if (!source) return
    const cards = getCardsFromSource(source, game)
    setDraggedCards(cards)
  }

  const handleDragEnd = (event) => {
    setDraggedCards(null)
    const { active, over } = event
    if (!over) return
    attemptMove(active.id, over.id)
  }

  const handleTap = useCallback((cardId, zone, extra) => {
    if (selectedCard) {
      const destId = zone === 'foundation' ? `foundation-${extra.index}` : `tableau-${extra.index}`
      const success = attemptMove(selectedCard.id, destId)
      setSelectedCard(null)
      if (!success && zone !== 'empty') {
        setSelectedCard({ id: cardId, zone, ...extra })
      }
    } else {
      setSelectedCard({ id: cardId, zone, ...extra })
    }
  }, [selectedCard, attemptMove])

  const handleTapDestination = useCallback((destId) => {
    if (selectedCard) {
      attemptMove(selectedCard.id, destId)
      setSelectedCard(null)
    }
  }, [selectedCard, attemptMove])

  const restartGame = useCallback(() => {
    setGame(initializeGame(deckData))
    setGameWon(false)
    setSelectedCard(null)
    setCompletingSlot(null)
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Box sx={{
          minHeight: '100vh',
          p: 1,
          maxWidth: 600,
          mx: 'auto',
          position: 'relative',
          userSelect: 'none',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <ScoreDisplay score={game.score} />
            <MenuButton
              onRestart={restartGame}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(s => !s)}
            />
          </Box>

          <StockAndWaste
            stock={game.stock}
            waste={game.waste}
            onDraw={drawCard}
            onTap={handleTap}
            selectedCard={selectedCard}
          />

          <Foundation
            foundations={game.foundations}
            onTap={handleTapDestination}
            completingSlot={completingSlot}
            selectedCard={selectedCard}
          />

          <Tableau
            tableau={game.tableau}
            onTap={handleTap}
            onTapEmpty={handleTapDestination}
            selectedCard={selectedCard}
          />
        </Box>

        <DragOverlay dropAnimation={null}>
          {draggedCards && draggedCards.map((card, i) => (
            <Box key={card.id} sx={{ position: 'absolute', top: i * 28, left: 0 }}>
              <CardFace card={card} />
            </Box>
          ))}
        </DragOverlay>
      </DndContext>

      <WinModal open={gameWon} score={game.score} onPlayAgain={restartGame} />
    </ThemeProvider>
  )
}
