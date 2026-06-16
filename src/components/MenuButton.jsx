import React, { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import SettingsIcon from '@mui/icons-material/Settings'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

export default function MenuButton({ onRestart, soundEnabled, onToggleSound }) {
  const [anchorEl, setAnchorEl] = useState(null)

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: '#fff' }}>
        <SettingsIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { onRestart(); setAnchorEl(null) }}>
          <ListItemIcon><RestartAltIcon /></ListItemIcon>
          <ListItemText>Restart Game</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onToggleSound(); setAnchorEl(null) }}>
          <ListItemIcon>
            {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </ListItemIcon>
          <ListItemText>{soundEnabled ? 'Mute Sound' : 'Unmute Sound'}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
