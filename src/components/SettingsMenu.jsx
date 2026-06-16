import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useGame } from '../context/GameContext';
import { setSoundEnabled, isSoundEnabled } from '../utils/sound';

export default function SettingsMenu() {
  const { restartGame } = useGame();
  const [anchorEl, setAnchorEl] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const open = Boolean(anchorEl);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRestart = () => {
    restartGame();
    handleClose();
  };

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit?')) {
      restartGame();
    }
    handleClose();
  };

  const handleSoundToggle = () => {
    const newVal = !soundOn;
    setSoundOn(newVal);
    setSoundEnabled(newVal);
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: '#fff' }} size="small">
        <SettingsIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleRestart}>
          <ListItemIcon>
            <RestartAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Restart Game</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleQuit}>
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Quit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSoundToggle}>
          <ListItemIcon>
            {soundOn ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>Sound</ListItemText>
          <Switch checked={soundOn} size="small" />
        </MenuItem>
      </Menu>
    </>
  );
}
