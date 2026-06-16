import { useState } from "react";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

export default function GameMenu({ muted, onRestart, onQuit, onToggleMute }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const close = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Menu">
        <IconButton
          color="inherit"
          size="small"
          aria-label="Open menu"
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={close}>
        <MenuItem
          onClick={() => {
            close();
            onRestart();
          }}
        >
          <ListItemIcon>
            <RestartAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Restart</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onToggleMute();
          }}
        >
          <ListItemIcon>
            {muted ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{muted ? "Turn sound on" : "Turn sound off"}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onQuit();
          }}
        >
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Quit</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
