import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

export default function MenuCog({ soundEnabled, onToggleSound, onRestart, onQuit }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);
  const [confirmQuitOpen, setConfirmQuitOpen] = useState(false);

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSoundClick = (e) => {
    // Prevent menu close when toggling switch
    e.stopPropagation();
    onToggleSound();
  };

  const handleRestartClick = () => {
    setAnchorEl(null);
    setConfirmRestartOpen(true);
  };

  const handleQuitClick = () => {
    setAnchorEl(null);
    setConfirmQuitOpen(true);
  };

  const confirmRestart = () => {
    setConfirmRestartOpen(false);
    onRestart();
  };

  const confirmQuit = () => {
    setConfirmQuitOpen(false);
    onQuit();
  };

  return (
    <>
      <IconButton
        id="settings-button"
        aria-controls={open ? 'settings-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        sx={{
          color: '#ffffff',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            transform: 'rotate(45deg)',
          },
          transition: 'transform 0.3s ease, background-color 0.2s',
        }}
      >
        <SettingsIcon />
      </IconButton>

      <Menu
        id="settings-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'settings-button',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(25, 25, 35, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: 180,
          }
        }}
      >
        <MenuItem onClick={handleSoundClick}>
          <ListItemIcon sx={{ color: '#fff' }}>
            {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </ListItemIcon>
          <ListItemText primary="Sound FX" />
          <Switch
            edge="end"
            checked={soundEnabled}
            onChange={onToggleSound}
            onClick={(e) => e.stopPropagation()}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#a855f7',
                '& + .MuiSwitch-track': {
                  backgroundColor: '#a855f7',
                },
              },
            }}
          />
        </MenuItem>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <MenuItem onClick={handleRestartClick}>
          <ListItemIcon sx={{ color: '#38bdf8' }}>
            <RestartAltIcon />
          </ListItemIcon>
          <ListItemText primary="Restart" />
        </MenuItem>

        <MenuItem onClick={handleQuitClick}>
          <ListItemIcon sx={{ color: '#f43f5e' }}>
            <ExitToAppIcon />
          </ListItemIcon>
          <ListItemText primary="Quit Game" />
        </MenuItem>
      </Menu>

      {/* Restart Confirmation */}
      <Dialog
        open={confirmRestartOpen}
        onClose={() => setConfirmRestartOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1b4b',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Restart Game?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to restart? Your current score and progress will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmRestartOpen(false)} sx={{ color: '#fff' }}>
            Cancel
          </Button>
          <Button onClick={confirmRestart} sx={{ color: '#38bdf8', fontWeight: 'bold' }} autoFocus>
            Restart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quit Confirmation */}
      <Dialog
        open={confirmQuitOpen}
        onClose={() => setConfirmQuitOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1b4b',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Quit Game?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to quit the game and return to the main title screen?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmQuitOpen(false)} sx={{ color: '#fff' }}>
            Cancel
          </Button>
          <Button onClick={confirmQuit} sx={{ color: '#f43f5e', fontWeight: 'bold' }} autoFocus>
            Quit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
