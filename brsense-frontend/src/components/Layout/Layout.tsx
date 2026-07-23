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
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);

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
  }, [pathname]);

  return (
    <Flex minH="100vh" bg={COLORS.background} direction="column">
      <Sidebar />

      <Box
        ref={mainRef}
        as="main"
        flex="1"
        ml={{ base: 0, md: '80px' }}
        
        // ZERADO: Como o Mobile não tem mais Header no topo, não precisamos de margem
        mt={0} 

        // NOVO: Adiciona um respiro no fundo apenas no Mobile igual ao tamanho da BottomNav (65px)
        // Isso impede que as listas da tela "Sondas" fiquem atrás da barra
        pb={{ base: 'calc(65px + env(safe-area-inset-bottom))', md: 0 }}
        
        h={{ base: 'auto', md: '100vh' }}
        overflowY={{ base: 'visible', md: 'auto' }}
        position="relative"
        zIndex={0}
      >
        {children}
      </Box>
    </Flex>
  );
}