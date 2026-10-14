import { useEffect, useState } from 'react';
import {
  AppBar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Toolbar,
  Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ReplayIcon from '@mui/icons-material/Replay';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import Board from './components/Board';
import { newGame } from './game';
import { setSoundEnabled, playSuccess } from './audio';

export default function App() {
  const [state, setState] = useState(() => newGame());
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [sound, setSound] = useState(true);
  const [quit, setQuit] = useState(false);
  const [gameId, setGameId] = useState(0);

  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => {
    if (state.won) playSuccess();
  }, [state.won]);

  const restart = () => {
    setState(newGame());
    setGameId((g) => g + 1);
    setQuit(false);
    setMenuAnchor(null);
  };

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={2}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Score: {state.score}
          </Typography>
          <IconButton color="inherit" aria-label="menu" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <SettingsIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={restart}>
              <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon>
              Restart
            </MenuItem>
            <MenuItem onClick={() => setSound((s) => !s)}>
              <ListItemIcon>{sound ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}</ListItemIcon>
              Sound: {sound ? 'On' : 'Off'}
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); setQuit(true); }}>
              <ListItemIcon><ExitToAppIcon fontSize="small" /></ListItemIcon>
              Quit
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {quit ? (
        <div className="quit-screen">
          <Typography variant="h4" gutterBottom>Thanks for playing!</Typography>
          <Typography gutterBottom>Final score: {state.score}</Typography>
          <Button variant="contained" onClick={restart}>New Game</Button>
        </div>
      ) : (
        <Board key={gameId} state={state} setState={setState} />
      )}

      <Dialog open={state.won && !quit}>
        <DialogTitle>Game Over - You Win!</DialogTitle>
        <DialogContent>
          <Typography>Final score: {state.score}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={restart}>Play Again</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
