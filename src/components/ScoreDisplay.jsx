import React from 'react'
import Typography from '@mui/material/Typography'

export default function ScoreDisplay({ score }) {
  return (
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
      Score: {score}
    </Typography>
  )
}
