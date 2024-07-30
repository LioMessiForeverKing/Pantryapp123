// HeaderBox.js
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { signOut } from 'next-auth/react';

const HeaderBox = ({ session }) => {
  return (
    <Box display="flex" justifyContent="flex-end" alignItems="center" p={2} mb={4}>
      <Typography variant="h6" sx={{ mr: 2 }}>
        {session?.user?.name}
      </Typography>
      <Button variant="contained" className="logout-button" onClick={() => signOut()} sx={{ backgroundColor: 'red' }}>
        <Typography variant="h6" color="white">Logout</Typography>
      </Button>
    </Box>
  );
};

export default HeaderBox;
