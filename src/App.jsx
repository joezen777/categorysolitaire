import { useCallback, useMemo, useState } from 'react';
import { DECKS, DEFAULT_DECK_ID, buildDeck } from './decks/index.js';
import { createGame, drawCard, recycleDraft } from './game/state.js';
import Board from './components/Board.jsx';

export default function App({ deckData = DECKS[DEFAULT_DECK_ID], rng }) {
  const { cards } = useMemo(() => buildDeck(deckData), [deckData]);
  const cardsById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const [state, setState] = useState(() => createGame(cards, rng));

  const handleSourceClick = useCallback(() => {
    setState((s) => (s.source.length ? drawCard(s) : recycleDraft(s)));
  }, []);

  return <Board state={state} cardsById={cardsById} onSourceClick={handleSourceClick} />;
}
