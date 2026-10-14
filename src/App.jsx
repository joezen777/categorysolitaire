import { useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import Board from './components/Board';
import { cards } from './deck';
import { dealGame } from './game/deal';
import { drawCard, recycleDraft } from './game/draw';
import { getMovingCards, moveCards } from './game/moves';

// Click-to-move: click a face-up card (or the top draft card) to select it,
// then click a column or foundation slot as the destination.
export default function App() {
  const [game, setGame] = useState(() => dealGame(cards));
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState(null);
  const [glitter, setGlitter] = useState(null);

  const reject = (reason) => {
    setError({ reason, key: Date.now() });
    setSelection(null);
  };

  const tryMove = (to) => {
    const result = moveCards(game, selection, to);
    if (!result.ok) return reject(result.reason);
    setGame(result.game);
    setSelection(null);
    if (result.completed) {
      const key = Date.now();
      setGlitter({ ...result.completed, key });
      setTimeout(() => setGlitter((g) => (g?.key === key ? null : g)), 1300);
    }
  };

  const select = (from) => {
    const moving = getMovingCards(game, from);
    if (moving.error) reject(moving.error);
    else setSelection(from);
  };

  const onDraw = () => { setSelection(null); setGame(drawCard); };
  const onRecycle = () => { setSelection(null); setGame(recycleDraft); };

  const onDraftClick = () => {
    if (selection?.type === 'draft') setSelection(null);
    else if (selection) reject('Cards cannot be moved onto the draft pile.');
    else select({ type: 'draft' });
  };

  // index: card index clicked, -1 for an empty column, null for column background
  const onColumnClick = (col, index) => {
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
    if (selection) tryMove({ type: 'foundation', slot });
  };

  return (
    <>
      <Board
        game={game}
        selection={selection}
        glitter={glitter}
        onDraw={onDraw}
        onRecycle={onRecycle}
        onDraftClick={onDraftClick}
        onColumnClick={onColumnClick}
        onFoundationClick={onFoundationClick}
      />
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
