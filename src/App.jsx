import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  defaultDropAnimation,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { DECKS, DEFAULT_DECK_KEY } from './decks';
import { canMove, createGame, gameReducer, getMovingCards, isWon } from './game/engine';
import { playError, playSuccess, playTick, playWarning, setSoundEnabled } from './audio/sounds';
import TopBar from './components/TopBar';
import SourcePiles from './components/SourcePiles';
import Foundation from './components/Foundation';
import Tableau, { stackOffset } from './components/Tableau';
import PlayingCard from './components/PlayingCard';
import { QuitScreen, WinDialog } from './components/EndDialogs';

const GLITTER_MS = 1300;

const sameSource = (a, b) =>
  !!a && !!b && a.zone === b.zone && (a.zone === 'waste' || (a.col === b.col && a.index === b.index));

// True when `from` is part of the run that starts at `source` (cards below it move too).
const inRun = (source, from) =>
  !!source &&
  source.zone === from.zone &&
  (from.zone === 'waste' || (source.col === from.col && from.index >= source.index));

function collisionDetection(args) {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
}

export default function App() {
  const entries = DECKS[DEFAULT_DECK_KEY].entries;
  const [state, dispatch] = useReducer(gameReducer, entries, (e) => createGame(e));
  const [soundOn, setSoundOn] = useState(true);
  const [quit, setQuit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [shake, setShake] = useState(null);
  const [dropAnimation, setDropAnimation] = useState(defaultDropAnimation);
  const lastDragEnd = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // After the glitter animation, remove completed categories and award points.
  const completingKey = state.foundation.map((s) => (s?.completing ? '1' : '0')).join('');
  useEffect(() => {
    const timers = [];
    [...completingKey].forEach((flag, slot) => {
      if (flag === '1') timers.push(setTimeout(() => dispatch({ type: 'CLEAR_SLOT', slot }), GLITTER_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [completingKey]);

  const triggerShake = useCallback((from) => {
    setShake({ from, nonce: Date.now() });
  }, []);
  useEffect(() => {
    if (!shake) return undefined;
    const t = setTimeout(() => setShake(null), 450);
    return () => clearTimeout(t);
  }, [shake]);

  const attemptMove = useCallback(
    (from, to) => {
      if (!canMove(state, from, to)) {
        if (to.zone === 'foundation') playWarning();
        else playError();
        return false;
      }
      if (to.zone === 'foundation') {
        const slot = state.foundation[to.slot];
        const moving = getMovingCards(state, from);
        if (slot && slot.items.length + moving.length >= slot.title.total) playSuccess();
        else playTick();
      } else {
        playTick();
      }
      dispatch({ type: 'MOVE', from, to });
      return true;
    },
    [state],
  );

  const newGame = () => {
    dispatch({ type: 'NEW_GAME', entries });
    setSelected(null);
    setQuit(false);
  };

  // ----- Tap-to-move -----
  const recentlyDragged = () => Date.now() - lastDragEnd.current < 150;

  const tapTarget = (to, fromForShake) => {
    if (!selected) return;
    if (!attemptMove(selected, to)) triggerShake(fromForShake || selected);
    setSelected(null);
  };

  const onCardClick = (from) => {
    if (recentlyDragged()) return;
    if (selected) {
      if (sameSource(selected, from)) return setSelected(null);
      if (from.zone === 'tableau' && !(selected.zone === 'tableau' && selected.col === from.col)) {
        return tapTarget({ zone: 'tableau', col: from.col });
      }
    }
    setSelected(getMovingCards(state, from) ? from : null);
  };

  const onColumnClick = (col) => {
    if (recentlyDragged()) return;
    if (selected) tapTarget({ zone: 'tableau', col });
  };

  const onSlotClick = (slot) => {
    if (recentlyDragged()) return;
    if (selected) tapTarget({ zone: 'foundation', slot });
  };

  const onDraw = () => {
    setSelected(null);
    if (state.stock.length || state.waste.length) playTick();
    dispatch({ type: 'DRAW' });
  };

  // ----- Drag and drop -----
  const onDragStart = ({ active }) => {
    setSelected(null);
    setDropAnimation(defaultDropAnimation);
    setDragFrom(active.data.current.from);
  };

  const onDragEnd = ({ active, over }) => {
    const from = active.data.current.from;
    const to = over?.data.current?.to;
    let ok = false;
    const sameColumn = to && to.zone === 'tableau' && from.zone === 'tableau' && to.col === from.col;
    if (to && !sameColumn) ok = attemptMove(from, to);
    // Valid moves land instantly; invalid ones animate back to their origin.
    setDropAnimation(ok ? null : defaultDropAnimation);
    setDragFrom(null);
    lastDragEnd.current = Date.now();
  };

  const onDragCancel = () => {
    setDropAnimation(defaultDropAnimation);
    setDragFrom(null);
    lastDragEnd.current = Date.now();
  };

  const draggedCards = useMemo(() => (dragFrom ? getMovingCards(state, dragFrom) || [] : []), [dragFrom, state]);

  const pileHelpers = {
    isDragging: (from) => inRun(dragFrom, from),
    isSelected: (from) => inRun(selected, from),
    isShaking: (from) => inRun(shake?.from, from),
  };

  if (quit) return <QuitScreen score={state.score} onPlayAgain={newGame} />;

  return (
    <div className="app" onClick={() => !recentlyDragged() && setSelected(null)}>
      <TopBar
        score={state.score}
        completed={state.completedCategories}
        total={state.categoryCount}
        soundOn={soundOn}
        onRestart={newGame}
        onToggleSound={() => setSoundOn((s) => !s)}
        onQuit={() => setQuit(true)}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <main className="board" onClick={(e) => e.stopPropagation()}>
          <SourcePiles
            stock={state.stock}
            waste={state.waste}
            onDraw={onDraw}
            onWasteClick={() => onCardClick({ zone: 'waste' })}
            {...pileHelpers}
          />
          <Foundation slots={state.foundation} onSlotClick={onSlotClick} />
          <Tableau
            columns={state.tableau}
            canPick={(from) => !!getMovingCards(state, from)}
            onCardClick={onCardClick}
            onColumnClick={onColumnClick}
            {...pileHelpers}
          />
        </main>
        <DragOverlay dropAnimation={dropAnimation}>
          {draggedCards.length > 0 && (
            <div
              className="drag-stack"
              style={{ height: stackOffset(0, draggedCards.length - 1, 'var(--card-h)') }}
            >
              {draggedCards.map((card, i) => (
                <PlayingCard
                  key={card.id}
                  card={card}
                  className="card--dragging"
                  style={{ top: stackOffset(0, i), zIndex: i + 1 }}
                />
              ))}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <WinDialog open={isWon(state)} score={state.score} onPlayAgain={newGame} />
    </div>
  );
}
