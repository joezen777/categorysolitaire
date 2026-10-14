import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

export function WinDialog({ open, score, onPlayAgain }: { open: boolean; score: number; onPlayAgain: () => void }) {
  return (
    <Dialog open={open} aria-labelledby="win-title" aria-describedby="win-score">
      <DialogTitle id="win-title" sx={{ textAlign: 'center', fontWeight: 800 }}>
        Game Over - You Win!
      </DialogTitle>
      <DialogContent>
        <Typography id="win-score" sx={{ textAlign: 'center', fontSize: 20 }}>
          Final score: <strong>{score}</strong>
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" size="large" onClick={onPlayAgain} autoFocus>
          Play again
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function QuitScreen({ score, onNewGame }: { score: number; onNewGame: () => void }) {
  return (
    <Box component="section" aria-labelledby="quit-title" sx={{ textAlign: 'center', py: 8, px: 2 }}>
      <Typography id="quit-title" component="h2" sx={{ fontSize: 26, fontWeight: 800, mb: 1 }}>
        Game ended
      </Typography>
      <Typography sx={{ mb: 3 }}>
        You quit with a score of <strong>{score}</strong>.
      </Typography>
      <Button variant="contained" size="large" onClick={onNewGame} autoFocus>
        Start a new game
      </Button>
    </Box>
  );
}
