import { useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import starterDeck from './data/starterDeck.json';
import { buildDeck } from './game/deck.js';
import { useBoardController } from './hooks/useBoardController.js';
import { useGame } from './hooks/useGame.js';
import { useSfx } from './hooks/useSfx.js';
import { Board } from './ui/Board.jsx';
import { QuitScreen, WinDialog } from './ui/Dialogs.jsx';
import { Header } from './ui/Header.jsx';
import { BoardGlobals, theme } from './ui/theme.jsx';

// Swap the deck by pointing this at another JSON array of { id, categoryTitle, itemName }.
const deck = buildDeck(starterDeck);

export default function App() {
  const sfx = useSfx();
  const game = useGame(deck);
  const ctl = useBoardController({ game, sfx });
  const { state } = game;

  // Browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [sfx]);


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BoardGlobals />
      <Box sx={{ px: 'var(--pad)', pt: 'env(safe-area-inset-top)', color: '#fff' }}>
        <Header
          score={state.score}
          muted={sfx.muted}
          soundSupported={sfx.supported}
          onToggleMute={() => sfx.setMuted(!sfx.muted)}
          onRestart={game.restart}
          onQuit={game.quit}
          menuEnabled={state.phase !== 'quit'}
        />
        {state.phase === 'quit' ? (
          <QuitScreen score={state.score} onNewGame={game.restart} />
        ) : (
          <>
            <Typography
              role="status"
              aria-live="polite"
              sx={{
                width: 'var(--board-w)',
                mx: 'auto',
                minHeight: '2.6em',
                mb: '6px',
                fontSize: 13,
                lineHeight: 1.3,
                color: '#fff',
              }}
            >
              {ctl.status}
            </Typography>
            <Board state={state} ctl={ctl} />
          </>
        )}
      </Box>
      <WinDialog open={state.phase === 'won'} score={state.score} onPlayAgain={game.restart} />
    </ThemeProvider>
  );
}
