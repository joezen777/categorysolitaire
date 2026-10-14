import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import ReplayIcon from '@mui/icons-material/Replay';
import Card from './Card';
import { DraggableWrap, DropZone } from './DnD';
import {
  FOUNDATION_SLOTS,
  applyMove,
  canMove,
  clearSlot,
  drawOrRecycle,
  getMovingCards,
} from '../game';
import { playError, playMove, playSuccess, playWarning } from '../audio';

const CLEAR_DELAY_MS = 1400;
const FACE_DOWN_STEP = 0.16; // vertical offset per face-down card, in card widths
const FACE_UP_STEP = 0.34; // vertical offset per face-up card, in card widths

const collision = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

const sameSrc = (a, b) =>
  a && b && a.type === b.type && (a.type === 'waste' || (a.col === b.col && a.idx === b.idx));

function offsets(col) {
  const out = [];
  let u = 0;
  col.forEach((e) => {
    out.push(u);
    u += e.up ? FACE_UP_STEP : FACE_DOWN_STEP;
  });
  return out;
}

function Glitter() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 0.8,
        size: 6 + Math.random() * 8,
        key: i,
      })),
    [],
  );
  return (
    <div className="glitter">
      {sparks.map((s) => (
        <span
          key={s.key}
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}
    </div>
  );
}

export default function Board({ state, setState }) {
  const [selected, setSelected] = useState(null);
  const [active, setActive] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  // Clear completed categories after the glitter plays.
  useEffect(() => {
    const timers = [];
    state.foundation.forEach((slot, i) => {
      if (slot && slot.complete) {
        timers.push(setTimeout(() => setState((s) => clearSlot(s, i)), CLEAR_DELAY_MS));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [state.foundation, setState]);

  const move = useCallback(
    (src, dest) => {
      const result = applyMove(state, src, dest);
      setSelected(null);
      if (!result) {
        if (dest.type === 'found') playWarning();
        playError();
        return false;
      }
      setState(result.state);
      if (result.completed) playSuccess();
      else playMove();
      return true;
    },
    [state, setState],
  );

  const draw = () => {
    setSelected(null);
    setState(drawOrRecycle(state));
    playMove();
  };

  const tapSource = (src) => {
    if (sameSrc(selected, src)) return setSelected(null);
    if (getMovingCards(state, src)) setSelected(src);
  };

  const tapCard = (col, idx) => {
    const src = { type: 'tab', col, idx };
    if (selected && !(selected.type === 'tab' && selected.col === col)) {
      if (!move(selected, { type: 'tab', col }) && getMovingCards(state, src)) setSelected(src);
      return;
    }
    tapSource(src);
  };

  const tapDest = (dest) => {
    if (selected) move(selected, dest);
  };

  const onDragStart = (e) => {
    setSelected(null);
    setActive(e.active.data.current.src);
  };
  const onDragEnd = (e) => {
    const src = e.active.data.current.src;
    setActive(null);
    const dest = e.over && e.over.data.current.dest;
    if (dest) move(src, dest);
  };

  const highlightSrc = active || selected;
  const valid = (dest) => !!highlightSrc && canMove(state, highlightSrc, dest);
  const activeCards = active ? getMovingCards(state, active) : null;
  const wasteTop = state.waste[state.waste.length - 1];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="board">
        <div className="row top-row">
          <div className="slot-wrap">
            <div className="label" />
            {state.stock.length ? (
              <Card className="stock" onClick={draw} />
            ) : (
              <div className="card empty-slot clickable" onClick={draw}>
                <ReplayIcon fontSize="small" />
              </div>
            )}
          </div>
          <div className="slot-wrap">
            <div className="label" />
            {wasteTop ? (
              <DraggableWrap
                id={wasteTop.id}
                src={{ type: 'waste' }}
                onClick={() => tapSource({ type: 'waste' })}
              >
                <Card
                  card={wasteTop}
                  faceUp
                  selected={selected && selected.type === 'waste'}
                  dim={active && active.type === 'waste'}
                />
              </DraggableWrap>
            ) : (
              <div className="card empty-slot" />
            )}
          </div>
        </div>

        <div className="row">
          {Array.from({ length: FOUNDATION_SLOTS }, (_, i) => {
            const slot = state.foundation[i];
            const dest = { type: 'found', slot: i };
            return (
              <DropZone
                key={i}
                id={`found-${i}`}
                dest={dest}
                highlight={valid(dest)}
                className="slot-wrap"
                onClick={() => tapDest(dest)}
              >
                <div className="label">{slot ? `${slot.category} ${slot.count}/${slot.total}` : ''}</div>
                {slot ? (
                  <div className={`found-pile ${slot.complete ? 'complete' : ''}`}>
                    <Card card={{ categoryTitle: slot.category, itemName: null, total: slot.total }} faceUp />
                    {slot.complete && <Glitter />}
                  </div>
                ) : (
                  <div className="card empty-slot" />
                )}
              </DropZone>
            );
          })}
        </div>

        <div className="row tableau">
          {state.tableau.map((col, ci) => {
            const dest = { type: 'tab', col: ci };
            const offs = offsets(col);
            const last = offs.length ? offs[offs.length - 1] : 0;
            return (
              <DropZone
                key={ci}
                id={`col-${ci}`}
                dest={dest}
                highlight={valid(dest)}
                className="column"
                style={{ height: `calc(var(--ch) + var(--cw) * ${last})` }}
                onClick={() => tapDest(dest)}
              >
                {!col.length && <div className="card empty-slot" />}
                {col.map((entry, idx) => {
                  const src = { type: 'tab', col: ci, idx };
                  const inSel = selected && selected.type === 'tab' && selected.col === ci && idx >= selected.idx;
                  const inDrag = active && active.type === 'tab' && active.col === ci && idx >= active.idx;
                  const style = { top: `calc(var(--cw) * ${offs[idx]})`, zIndex: idx + 1 };
                  const onClick = (ev) => {
                    ev.stopPropagation();
                    if (entry.up) tapCard(ci, idx);
                    else if (selected) tapDest(dest);
                  };
                  const card = <Card card={entry.card} faceUp={entry.up} selected={inSel} dim={inDrag} />;
                  return (
                    <DraggableWrap
                      key={entry.card.id}
                      id={entry.card.id}
                      src={src}
                      disabled={!getMovingCards(state, src)}
                      className="stacked"
                      style={style}
                      onClick={onClick}
                    >
                      {card}
                    </DraggableWrap>
                  );
                })}
              </DropZone>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 220 }}>
        {activeCards ? (
          <div className="board overlay-stack" style={{ height: `calc(var(--ch) + var(--cw) * ${FACE_UP_STEP * activeCards.length})` }}>
            {activeCards.map((c, i) => (
              <div key={c.id} className="stacked" style={{ top: `calc(var(--cw) * ${FACE_UP_STEP * i})`, zIndex: i + 1 }}>
                <Card card={c} faceUp />
              </div>
            ))}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
