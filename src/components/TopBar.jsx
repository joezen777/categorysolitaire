import { useState } from 'react';
import { AppBar, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

export default function TopBar({ score, completed, total, soundOn, onRestart, onToggleSound, onQuit }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const run = (fn) => () => {
    close();
    fn();
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} className="topbar">
      <Toolbar variant="dense" sx={{ gap: 1, px: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }} aria-live="polite">
          Score: {score}
        </Typography>
        <Typography variant="body2" sx={{ flex: 1, textAlign: 'center', opacity: 0.8 }}>
          Categories {completed}/{total}
        </Typography>
        <IconButton aria-label="Menu" onClick={(e) => setAnchor(e.currentTarget)} color="inherit">
          <SettingsIcon />
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
          <MenuItem onClick={run(onRestart)}>
            <ListItemIcon><RestartAltIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Restart game</ListItemText>
          </MenuItem>
          <MenuItem onClick={run(onToggleSound)}>
            <ListItemIcon>
              {soundOn ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{soundOn ? 'Turn sound off' : 'Turn sound on'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={run(onQuit)}>
            <ListItemIcon><ExitToAppIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Quit</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
