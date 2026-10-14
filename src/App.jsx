import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DECKS, DEFAULT_DECK_ID, buildDeck, CARD_KIND } from './decks/index.js';
import { createGame, drawCard, recycleDraft, isWon } from './game/state.js';
import { getMovingCards, moveCards } from './game/rules.js';
import { createSoundPlayer } from './audio/sounds.js';
import Board, { GLITTER_MS } from './components/Board.jsx';
import { QuitScreen, WinDialog } from './components/EndScreens.jsx';

// The card a move source refers to (draft top or the picked tableau card).
function cardAt(state, from) {
  if (from?.type === 'draft') return state.draft[state.draft.length - 1];
  if (from?.type === 'tableau') return state.tableau[from.col]?.[from.index];
  return undefined;
}

export default function App({ deckData = DECKS[DEFAULT_DECK_ID], rng, soundPlayer }) {
  const { cards } = useMemo(() => buildDeck(deckData), [deckData]);
  const cardsById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const [state, setState] = useState(() => createGame(cards, rng));
  const [selection, setSelection] = useState(null);
  const [rejection, setRejection] = useState(null);
  const [celebrations, setCelebrations] = useState([]);
  const [quit, setQuit] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [player] = useState(() => soundPlayer ?? createSoundPlayer());
  const won = isWon(state);

  const playSound = useCallback(
    (name) => {
      if (soundOn) player.play(name);
    },
    [soundOn, player],
  );
  const rejectCount = useRef(0);
  const celebrationCount = useRef(0);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const celebrate = useCallback((completed) => {
    playSound('success');
    celebrationCount.current += 1;
    const key = celebrationCount.current;
    setCelebrations((list) => [...list.filter((c) => c.slot !== completed.slot), { ...completed, key }]);
    timers.current.push(
      setTimeout(() => setCelebrations((list) => list.filter((c) => c.key !== key)), GLITTER_MS),
    );
  }, [playSound]);

  // `from` identifies the card/group that bounces back with a shake. Illegal
  // title-card moves play the error sound; illegal item-card moves the warning.
  const reject = useCallback(
    (message, from) => {
      const entry = cardAt(state, from);
      playSound(entry && cardsById[entry.id]?.kind === CARD_KIND.TITLE ? 'error' : 'warning');
      rejectCount.current += 1;
      setRejection({ key: rejectCount.current, message, from });
    },
    [state, cardsById, playSound],
  );

  // Restart, play again, and new game after quitting all deal a fresh game.
  const newGame = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState(createGame(cards, rng));
    setSelection(null);
    setRejection(null);
    setCelebrations([]);
    setQuit(false);
  }, [cards, rng]);

  const toggleSound = useCallback(() => {
    player.setEnabled(!soundOn);
    setSoundOn(!soundOn);
  }, [player, soundOn]);

  // Quit ends the current game and leaves the board for an end screen.
  const handleQuit = useCallback(() => {
    setSelection(null);
    setRejection(null);
    setQuit(true);
  }, []);

  const select = useCallback(
    (from) => {
      const moving = getMovingCards(state, cardsById, from);
      if (moving.error) {
        setSelection(null);
        reject(moving.error, from);
      } else {
        setSelection(from);
        setRejection(null);
      }
    },
    [state, cardsById, reject],
  );

  // Shared by tap and drag: illegal moves leave state unchanged and bounce back.
  const attemptMove = useCallback(
    (from, to) => {
      const result = moveCards(state, cardsById, from, to);
      if (result.ok) {
        setState(result.state);
        setSelection(null);
        setRejection(null);
        if (result.completed) celebrate(result.completed);
      } else {
        reject(result.reason, from);
      }
    },
    [state, cardsById, reject, celebrate],
  );

  const tryMove = useCallback(
    (to) => {
      if (selection) attemptMove(selection, to);
    },
    [selection, attemptMove],
  );

  const canDrag = useCallback((from) => !getMovingCards(state, cardsById, from).error, [state, cardsById]);

  const handleDrop = useCallback(
    (from, to) => {
      setSelection(null);
      if (!to) reject('Cards cannot be placed there.', from);
      else if (to.type === 'tableau' && from.type === 'tableau' && to.col === from.col) setRejection(null);
      else attemptMove(from, to);
    },
    [attemptMove, reject],
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

  if (quit) return <QuitScreen score={state.score} onNewGame={newGame} />;

  return (
    <>
      <Board
        state={state}
        cardsById={cardsById}
        selection={selection}
        rejection={rejection}
        celebrations={celebrations}
        canDrag={canDrag}
        onDrop={handleDrop}
        onSourceClick={handleSourceClick}
        onDraftClick={handleDraftClick}
        onTableauCardClick={handleTableauCardClick}
        onTableauColumnClick={(col) => tryMove({ type: 'tableau', col })}
        onFoundationClick={(slot) => tryMove({ type: 'foundation', slot })}
        onDismissRejection={() => setRejection(null)}
        soundOn={soundOn}
        onRestart={newGame}
        onQuit={handleQuit}
        onToggleSound={toggleSound}
      />
      <WinDialog open={won} score={state.score} onPlayAgain={newGame} />
    </>
  );
}
