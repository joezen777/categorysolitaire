import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export default function WinModal({ open, score, onPlayAgain }) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
        Game Over - You Win!
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ my: 2 }}>
          {score} pts
        </Typography>
        <Typography>Congratulations! You sorted all categories!</Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" onClick={onPlayAgain} size="large">
          Play Again
        </Button>
      </DialogActions>
    </Dialog>
  )
}
