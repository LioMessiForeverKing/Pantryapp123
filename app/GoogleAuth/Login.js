'use client';
import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Button, Container, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { gsap } from 'gsap';

const Root = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  backgroundColor: 'transparent', // Make the background transparent', // Optional: add a subtle blur effect
});

const Title = styled(Typography)({
  marginBottom: '32px',
  color: '#black',
  fontFamily: 'Times New Roman, sans-serif',
  fontSize: '4rem',
  fontWeight: 'bold',
  opacity: 0, // Start with an opacity of 0 for animation
});

const StyledButton = styled(Button)({
  padding: '16px 32px',
  fontSize: '1.2rem',
  opacity: 0, // Start with an opacity of 0 for animation
});

export default function Login() {
  useEffect(() => {
    // GSAP animations for the title and button
    gsap.to('.title', { opacity: 1, y: -20, duration: 1, ease: 'power3.out' });
    gsap.to('.button', { opacity: 1, y: -20, duration: 1, delay: 0.5, ease: 'power3.out' });
  }, []);

  return (
    <Root>
      <Title variant="h4" className="title">
        Welcome to My Pantry App
      </Title>
      <StyledButton 
        variant="contained" 
        color="primary" 
        className="button"
        onClick={() => signIn('google')}
      >
        Login with Google
      </StyledButton>
    </Root>
  );
}
