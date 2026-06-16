import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

export default function WinModal({ open, score, onRestart }) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle className="win-title">
        <EmojiEventsIcon />
        Game Over - You Win!
      </DialogTitle>
      <DialogContent>
        <Box className="win-score">
          <Typography variant="body2">Final score</Typography>
          <Typography variant="h1">{score}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onRestart} fullWidth>
          Play again
        </Button>
      </DialogActions>
    </Dialog>
  );
}
