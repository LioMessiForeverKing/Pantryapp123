'use client'

import { useState } from 'react';
import { Box, TextField, Button, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

export default function AddRemoveItemBox({ pantry, onAddItem, onRemoveItem }) {
  const [newItem, setNewItem] = useState('');
  const [selectedItem, setSelectedItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      onAddItem(newItem.trim());
      setNewItem('');
    }
  };

  const handleRemoveItem = () => {
    if (selectedItem) {
      onRemoveItem(selectedItem);
      setSelectedItem('');
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2} p={2}>
      <FormControl fullWidth>
        <TextField
          label="Add New Item"
          variant="outlined"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddItem}
          sx={{ mt: 1 }}
        >
          Add Item
        </Button>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Remove Item</InputLabel>
        <Select
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value)}
          label="Remove Item"
        >
          {pantry.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="secondary"

          onClick={handleRemoveItem}
          sx={{ mt: 1 }}
        >
          Remove Item
        </Button>
      </FormControl>
    </Box>
  );
}
