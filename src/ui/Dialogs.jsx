import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

export function WinDialog({ open, score, onPlayAgain }) {
  return (
    <Dialog open={open} aria-labelledby="win-title" aria-describedby="win-score">
      <DialogTitle id="win-title">Game Over - You Win!</DialogTitle>
      <DialogContent>
        <Typography id="win-score" variant="h6">
          Final score: {score}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onPlayAgain} autoFocus>
          Play again
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Shown instead of the board after Quit. */
export function QuitScreen({ score, onNewGame }) {
  return (
    <Box
      role="region"
      aria-label="Game ended"
      sx={{ textAlign: 'center', mt: '15vh', px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
    >
      <Typography variant="h5" component="h1">
        You quit the game
      </Typography>
      <Typography>Final score: {score}</Typography>
      <Button variant="contained" size="large" onClick={onNewGame} autoFocus>
        New game
      </Button>
    </Box>
  );
}
