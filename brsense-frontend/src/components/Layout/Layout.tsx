import { useEffect, useRef } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { COLORS } from '../../colors/colors';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const isMobileMapView =
    pathname === '/dashboard' && !new URLSearchParams(search).get('probeId');

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname, search]);

  return (
    <Flex
      minH="100dvh"
      h={{ base: isMobileMapView ? '100dvh' : 'auto', md: 'auto' }}
      overflow={{ base: isMobileMapView ? 'hidden' : 'visible', md: 'visible' }}
      bg={COLORS.background}
      direction="column"
    >
      <Sidebar />

      <Box
        ref={mainRef}
        as="main"
        flex="1"
        ml={{ base: 0, md: '80px' }}
        mt={0}
        pb={{
          base: isMobileMapView
            ? 0
            : 'calc(65px + env(safe-area-inset-bottom))',
          md: 0,
        }}
        h={{
          base: isMobileMapView
            ? 'calc(100dvh - 65px - env(safe-area-inset-bottom))'
            : 'auto',
          md: '100vh',
        }}
        maxH={{
          base: isMobileMapView
            ? 'calc(100dvh - 65px - env(safe-area-inset-bottom))'
            : 'none',
          md: '100vh',
        }}
        overflowY={{
          base: isMobileMapView ? 'hidden' : 'visible',
          md: 'auto',
        }}
        position="relative"
        zIndex={0}
      >
        {children}
      </Box>
    </Flex>
  );
}