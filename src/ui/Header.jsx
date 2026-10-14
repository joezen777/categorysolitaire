import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

export function Header({ score, muted, soundSupported, onToggleMute, onRestart, onQuit, menuEnabled }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const pick = (fn) => () => {
    close();
    fn();
  };

  return (
    <Box
      component="header"
      sx={{
        width: 'var(--board-w)',
        mx: 'auto',
        py: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography component="div" variant="h6" sx={{ fontWeight: 800 }}>
        Score: <span data-testid="score">{score}</span>
      </Typography>
      <IconButton
        aria-label="Game menu"
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={!menuEnabled}
        sx={{ width: 44, height: 44, color: '#fff', '&:focus-visible': { outline: '3px solid #fff' } }}
      >
        <SettingsIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={pick(onRestart)}>
          <ListItemIcon><RestartAltIcon /></ListItemIcon>
          <ListItemText>Restart</ListItemText>
        </MenuItem>
        <MenuItem onClick={pick(onToggleMute)} disabled={!soundSupported}>
          <ListItemIcon>{muted ? <VolumeUpIcon /> : <VolumeOffIcon />}</ListItemIcon>
          <ListItemText>
            {!soundSupported ? 'Sound unavailable' : muted ? 'Turn sound on' : 'Turn sound off'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={pick(onQuit)}>
          <ListItemIcon><ExitToAppIcon /></ListItemIcon>
          <ListItemText>Quit</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
