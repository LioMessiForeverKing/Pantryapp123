import { authOptions } from '../pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import './globals.css';
import { Inter } from 'next/font/google';
import SessionProvider from './GoogleAuth/SessionProvider';
import Login from './GoogleAuth/Login';
import Home from './page';
import { CssBaseline, Container, Box } from '@mui/material';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <Box component="body" className={inter.className} sx={{ margin: 0, padding: 0 }}>
        <CssBaseline />
        <Container maxWidth="lg">
          <SessionProvider session={session}>
            {!session ? <Login /> : <Home />}
          </SessionProvider>
        </Container>
      </Box>
    </html>
  );
}
