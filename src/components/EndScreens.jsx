import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

export function WinDialog({ open, score, onPlayAgain }) {
  return (
    <Dialog open={open} aria-labelledby="win-title" data-testid="win-dialog">
      <DialogTitle id="win-title" sx={{ textAlign: 'center', fontWeight: 700 }}>
        Game Over - You Win!
      </DialogTitle>
      <DialogContent>
        <Typography data-testid="final-score" sx={{ textAlign: 'center' }}>
          Final score: {score}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" data-testid="play-again" onClick={onPlayAgain}>
          Play Again
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Shown after Quit: the game is over and nothing is playable until a new game starts.
export function QuitScreen({ score, onNewGame }) {
  return (
    <Box
      data-testid="quit-screen"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: '#fff',
        textAlign: 'center',
        px: 2,
      }}
    >
      <Typography variant="h5" component="h1">
        Category Solitaire
      </Typography>
      <Typography>Game ended. Thanks for playing!</Typography>
      <Typography data-testid="quit-score">Final score: {score}</Typography>
      <Button variant="contained" data-testid="new-game" onClick={onNewGame}>
        New Game
      </Button>
    </Box>
  );
}
