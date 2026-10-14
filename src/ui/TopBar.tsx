import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { palette } from './theme';

function CogIcon() {
  return (
    <SvgIcon>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
    </SvgIcon>
  );
}

interface TopBarProps {
  score: number;
  muted: boolean;
  playing: boolean;
  onRestart: () => void;
  onQuit: () => void;
  onToggleSound: () => void;
}

export function TopBar({ score, muted, playing, onRestart, onQuit, onToggleSound }: TopBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Box
      component="header"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.5 }}
    >
      <Box sx={{ minWidth: 88 }}>
        <Typography component="p" sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>
          Score
        </Typography>
        <Typography component="p" aria-label={`Score ${score}`} sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: palette.titleAccent }}>
          {score}
        </Typography>
      </Box>
      <Typography component="h1" sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700, textAlign: 'center', flex: 1 }}>
        Category Solitaire
      </Typography>
      <Box sx={{ minWidth: 88, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          aria-label="Game menu"
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          aria-controls={anchor ? 'game-menu' : undefined}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ width: 44, height: 44, color: '#fff' }}
        >
          <CogIcon />
        </IconButton>
        <Menu id="game-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
          <MenuItem onClick={run(onRestart)}>
            <ListItemText>{playing ? 'Restart game' : 'New game'}</ListItemText>
          </MenuItem>
          <MenuItem role="menuitemcheckbox" aria-checked={!muted} onClick={run(onToggleSound)}>
            <ListItemText>{muted ? 'Sound: Off (turn on)' : 'Sound: On (turn off)'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={run(onQuit)} disabled={!playing}>
            <ListItemText>Quit game</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
