import { useCallback, useMemo, useRef, useState } from 'react';
import { DECKS, DEFAULT_DECK_ID, buildDeck } from './decks/index.js';
import { createGame, drawCard, recycleDraft } from './game/state.js';
import { getMovingCards, moveCards } from './game/rules.js';
import Board from './components/Board.jsx';

export default function App({ deckData = DECKS[DEFAULT_DECK_ID], rng }) {
  const { cards } = useMemo(() => buildDeck(deckData), [deckData]);
  const cardsById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const [state, setState] = useState(() => createGame(cards, rng));
  const [selection, setSelection] = useState(null);
  const [rejection, setRejection] = useState(null);
  const rejectCount = useRef(0);

  const reject = useCallback((message) => {
    rejectCount.current += 1;
    setRejection({ key: rejectCount.current, message });
  }, []);

  const select = useCallback(
    (from) => {
      const moving = getMovingCards(state, cardsById, from);
      if (moving.error) {
        setSelection(null);
        reject(moving.error);
      } else {
        setSelection(from);
        setRejection(null);
      }
    },
    [state, cardsById, reject],
  );

  // Attempts to move the current selection; illegal moves leave state unchanged.
  const tryMove = useCallback(
    (to) => {
      if (!selection) return;
      const result = moveCards(state, cardsById, selection, to);
      if (result.ok) {
        setState(result.state);
        setSelection(null);
        setRejection(null);
      } else {
        reject(result.reason);
      }
    },
    [selection, state, cardsById, reject],
  );

  const handleSourceClick = useCallback(() => {
    setSelection(null);
    setState((s) => (s.source.length ? drawCard(s) : recycleDraft(s)));
  }, []);

  const handleDraftClick = useCallback(() => {
    if (selection?.type === 'draft') setSelection(null);
    else select({ type: 'draft' });
  }, [selection, select]);

  const handleTableauCardClick = useCallback(
    (col, index) => {
      if (selection?.type === 'tableau' && selection.col === col) {
        if (selection.index === index) setSelection(null);
        else select({ type: 'tableau', col, index });
      } else if (selection) {
        tryMove({ type: 'tableau', col });
      } else {
        select({ type: 'tableau', col, index });
      }
    },
    [selection, select, tryMove],
  );

  return (
    <Board
      state={state}
      cardsById={cardsById}
      selection={selection}
      rejection={rejection}
      onSourceClick={handleSourceClick}
      onDraftClick={handleDraftClick}
      onTableauCardClick={handleTableauCardClick}
      onTableauColumnClick={(col) => tryMove({ type: 'tableau', col })}
      onFoundationClick={(slot) => tryMove({ type: 'foundation', slot })}
      onDismissRejection={() => setRejection(null)}
    />
  );
}
