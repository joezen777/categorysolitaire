import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  styled,
} from '@mui/material';
import {
  Settings,
  Refresh,
  ExitToApp,
  VolumeUp,
  VolumeOff,
} from '@mui/icons-material';

interface MenuProps {
  onRestart: () => void;
  onQuit: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
}

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    minWidth: '200px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
  },
}));

const GameMenu: React.FC<MenuProps> = ({
  onRestart,
  onQuit,
  soundEnabled,
  onSoundToggle,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRestart = () => {
    onRestart();
    handleClose();
  };

  const handleQuit = () => {
    onQuit();
    handleClose();
  };

  const handleSoundToggle = () => {
    onSoundToggle();
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.3)',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
        }}
        size="large"
      >
        <Settings />
      </IconButton>

      <StyledMenu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleSoundToggle}>
          <ListItemIcon>
            {soundEnabled ? <VolumeUp fontSize="small" /> : <VolumeOff fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {soundEnabled ? 'Sound On' : 'Sound Off'}
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleRestart}>
          <ListItemIcon>
            <Refresh fontSize="small" />
          </ListItemIcon>
          <ListItemText>Restart Game</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleQuit}>
          <ListItemIcon>
            <ExitToApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Quit Game</ListItemText>
        </MenuItem>
      </StyledMenu>
    </>
  );
};

export default GameMenu;