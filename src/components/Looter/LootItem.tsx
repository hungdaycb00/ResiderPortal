import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface LootItemProps {
  item: {
    id: string;
    name: string;
    rarity: string;
  };
  onLoot: (id: string) => void;
  disabled?: boolean;
}

export const LootItem: React.FC<LootItemProps> = ({ item, onLoot, disabled }) => {
  return (
    <Paper sx={{ 
      p: 2, 
      m: 1,
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      height: 'calc(100% - 16px)' // Adjust for margin
    }}>
      <Box>
        <Typography variant="subtitle1" noWrap sx={{ maxWidth: 150 }}>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.rarity}
        </Typography>
      </Box>
      <Button 
        variant="contained" 
        size="small"
        onClick={() => onLoot(item.id)}
        disabled={disabled}
      >
        Loot
      </Button>
    </Paper>
  );
};
