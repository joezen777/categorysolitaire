import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

export function WinDialog({ open, score, onPlayAgain }) {
  return (
    <Dialog open={open} aria-labelledby="win-title">
      <DialogTitle id="win-title" sx={{ textAlign: 'center' }}>
        Game Over - You Win!
      </DialogTitle>
      <DialogContent>
        <Typography variant="h4" align="center" sx={{ fontWeight: 700 }}>
          {score}
        </Typography>
        <Typography align="center">Final score</Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" onClick={onPlayAgain} autoFocus>
          Play again
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function QuitScreen({ score, onPlayAgain }) {
  return (
    <div className="quit-screen">
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Thanks for playing!
      </Typography>
      <Typography sx={{ my: 2 }}>Final score: {score}</Typography>
      <Button variant="contained" onClick={onPlayAgain}>
        Start a new game
      </Button>
    </div>
  );
}
