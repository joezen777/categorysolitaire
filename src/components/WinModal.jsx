import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useGame } from '../context/GameContext';

export default function WinModal() {
  const { gameWon, score, restartGame } = useGame();

  return (
    <Modal open={gameWon} onClose={() => {}}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fff',
          borderRadius: '16px',
          p: 4,
          textAlign: 'center',
          minWidth: 280,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <EmojiEventsIcon sx={{ fontSize: 64, color: '#FFD700', mb: 1 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1b5e20', mb: 1 }}>
          You Win!
        </Typography>
        <Typography variant="h6" sx={{ color: '#333', mb: 1 }}>
          Game Over
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1565C0', mb: 3 }}>
          Final Score: {score}
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={restartGame}
          sx={{
            backgroundColor: '#1b5e20',
            '&:hover': { backgroundColor: '#2e7d32' },
            borderRadius: '8px',
            px: 4,
          }}
        >
          Play Again
        </Button>
      </Box>
    </Modal>
  );
}
