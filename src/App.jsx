import { useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, Snackbar, Typography } from '@mui/material';
import Board, { DragStack } from './components/Board';
import { createSfx } from './audio/sfx';
import { cards, CARD_TYPE } from './deck';
import { dealGame } from './game/deal';
import { drawCard, recycleDraft } from './game/draw';
import { getMovingCards, moveCards } from './game/moves';
import { isWon } from './game/status';

const sfx = createSfx();

// Two input modes share one move path (tryMove -> moveCards):
//  - tap/click: select a face-up card (or the top draft card), then tap a destination.
//  - drag and drop (@dnd-kit): drag a legal source onto a column or foundation slot.
// An illegal drop or tap is rejected and the card/group returns to where it started.
//
// Menu: Restart deals a fresh game; Sound toggles all effects; Quit ends the active game and
// shows a "Game quit" screen with the final score and a button to start a new game (a web page
// cannot close its own tab, so quitting returns to a start screen instead).
export default function App() {
  const [game, setGame] = useState(() => dealGame(cards));
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState(null);
  const [glitter, setGlitter] = useState(null);
  const [drag, setDrag] = useState(null); // { cards, width } while dragging
  const [phase, setPhase] = useState('playing'); // 'playing' | 'quit'
  const [soundOn, setSoundOn] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const justDragged = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const play = (kind) => {
    if (soundOn) sfx[kind]();
  };

  // Illegal title-card moves get the error buzz; other illegal moves get the warning beeps.
  const reject = (reason, from) => {
    const moving = from && getMovingCards(game, from).cards;
    play(moving && moving[0].type === CARD_TYPE.ITEM ? 'warning' : 'error');
    setError({ reason, key: Date.now() });
    setSelection(null);
  };

  const newGame = () => {
    setGame(dealGame(cards));
    setSelection(null);
    setError(null);
    setGlitter(null);
    setDrag(null);
    setMenuAnchor(null);
    setPhase('playing');
  };

  const tryMove = (to, from = selection) => {
    const result = moveCards(game, from, to);
    if (!result.ok) return reject(result.reason, from);
    setGame(result.game);
    setSelection(null);
    if (result.completed) {
      play('success');
      const key = Date.now();
      setGlitter({ ...result.completed, key });
      setTimeout(() => setGlitter((g) => (g?.key === key ? null : g)), 1300);
    }
  };

  const select = (from) => {
    const moving = getMovingCards(game, from);
    if (moving.error) reject(moving.error, from);
    else setSelection(from);
  };

  const canDrag = (from) => !getMovingCards(game, from).error;

  const onDragStart = ({ active }) => {
    setSelection(null);
    const { cards: moving } = getMovingCards(game, active.data.current.from);
    setDrag({ cards: moving, width: active.rect.current.initial?.width ?? 80 });
  };

  const onDragEnd = ({ active, over }) => {
    setDrag(null);
    // A drag can emit a trailing click on a shared ancestor; ignore it.
    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 100);
    const to = over?.data.current?.to;
    if (!to) return reject('Dropped outside a valid destination.', active.data.current.from);
    tryMove(to, active.data.current.from);
  };

  const onDraw = () => { setSelection(null); setGame(drawCard); };
  const onRecycle = () => { setSelection(null); setGame(recycleDraft); };

  const onDraftClick = () => {
    if (justDragged.current) return;
    if (selection?.type === 'draft') setSelection(null);
    else if (selection) reject('Cards cannot be moved onto the draft pile.');
    else select({ type: 'draft' });
  };

  // index: card index clicked, -1 for an empty column, null for column background
  const onColumnClick = (col, index) => {
    if (justDragged.current) return;
    if (!selection) {
      if (index !== null && index >= 0) select({ type: 'tableau', col, index });
      return;
    }
    if (selection.type === 'tableau' && selection.col === col && index !== null && index >= selection.index) {
      setSelection(null); // clicking the selected card again deselects
      return;
    }
    tryMove({ type: 'tableau', col });
  };

  const onFoundationClick = (slot) => {
    if (justDragged.current) return;
    if (selection) tryMove({ type: 'foundation', slot });
  };

  if (phase === 'quit') {
    return (
      <Box data-testid="quit-screen" sx={{ textAlign: 'center', mt: 10, px: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>Game quit</Typography>
        <Typography gutterBottom>Final score: {game.score}</Typography>
        <Button variant="contained" onClick={newGame}>Start New Game</Button>
      </Box>
    );
  }

  const won = isWon(game, cards.length);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDrag(null)}
      >
        <Board
          game={game}
          canDrag={canDrag}
          selection={selection}
          glitter={glitter}
          onMenuClick={(e) => setMenuAnchor(e.currentTarget)}
          onDraw={onDraw}
          onRecycle={onRecycle}
          onDraftClick={onDraftClick}
          onColumnClick={onColumnClick}
          onFoundationClick={onFoundationClick}
        />
        <DragOverlay>{drag && <DragStack cards={drag.cards} width={drag.width} />}</DragOverlay>
      </DndContext>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={newGame}>Restart</MenuItem>
        <MenuItem
          onClick={() => {
            setSoundOn((on) => !on);
            setMenuAnchor(null);
          }}
        >
          {soundOn ? 'Turn sound off' : 'Turn sound on'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setPhase('quit');
          }}
        >
          Quit
        </MenuItem>
      </Menu>
      <Dialog open={won} data-testid="win-modal">
        <DialogTitle>Game Over - You Win!</DialogTitle>
        <DialogContent>
          <Typography data-testid="final-score">Final score: {game.score}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={newGame}>Play Again</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        key={error?.key}
        open={Boolean(error)}
        autoHideDuration={2500}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" data-testid="illegal-move">
          Illegal move: {error?.reason}
        </Alert>
      </Snackbar>
    </>
  );
}
