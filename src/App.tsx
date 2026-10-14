import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback, useReducer, useState } from 'react';
import { useSoundEffects } from './audio/useSoundEffects';
import { activeDeck } from './deck';
import { dealGame, isWon } from './game/engine';
import { initStore, reducer } from './game/store';
import { QuitScreen, WinDialog } from './ui/EndScreens';
import { BOARD_MAX_WIDTH, GameBoard } from './ui/GameBoard';
import { StatusLine } from './ui/StatusLine';
import { TopBar } from './ui/TopBar';
import { useFeedbackEffects } from './ui/useFeedbackEffects';

export default function App() {
  const [store, dispatch] = useReducer(reducer, undefined, () => initStore(dealGame(activeDeck)));
  const [muted, setMuted] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const sound = useSoundEffects(muted);
  const { shakingIds, bursts } = useFeedbackEffects(store, sound.play, reducedMotion);

  const newGame = useCallback(() => dispatch({ type: 'newGame', game: dealGame(activeDeck) }), []);
  const toggleSound = () => {
    if (muted) sound.unlock();
    setMuted(!muted);
  };

  const { game, status, selected } = store;
  const playing = status === 'playing';
  const won = playing && isWon(game);
  const selectionText = selected ? `Selected ${game.deck.byId[selected.cardId].label}. Choose a highlighted destination.` : null;

  return (
    <Box sx={{ maxWidth: BOARD_MAX_WIDTH + 32, mx: 'auto', px: { xs: 1, sm: 2 }, pt: 'max(4px, env(safe-area-inset-top))' }}>
      <TopBar
        score={game.score}
        muted={muted}
        playing={playing}
        onRestart={newGame}
        onQuit={() => dispatch({ type: 'quit' })}
        onToggleSound={toggleSound}
      />
      <main>
        {playing ? (
          <>
            <StatusLine feedback={store.feedback} selectionText={selectionText} />
            <GameBoard store={store} dispatch={dispatch} shakingIds={shakingIds} bursts={bursts} reducedMotion={reducedMotion} />
          </>
        ) : (
          <QuitScreen score={game.score} onNewGame={newGame} />
        )}
      </main>
      <WinDialog open={won} score={game.score} onPlayAgain={newGame} />
    </Box>
  );
}
