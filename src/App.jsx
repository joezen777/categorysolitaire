import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { GameProvider } from './context/GameContext';
import { SelectionProvider } from './context/SelectionContext';
import GameBoard from './components/GameBoard';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GameProvider>
        <SelectionProvider>
          <GameBoard />
        </SelectionProvider>
      </GameProvider>
    </ThemeProvider>
  );
}
