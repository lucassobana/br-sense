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
  const { pathname } = useLocation(); // Para detectar mudança de página
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Garante que o scroll volte ao topo ao mudar de página
  useEffect(() => {
    // Scroll da janela (Mobile)
    window.scrollTo(0, 0);
    // Scroll do container interno (Desktop)
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
        // --- AJUSTES RESPONSIVOS CRITICOS ---
        
        // Desktop: Margem esquerda de 80px para a Sidebar
        // Mobile: Sem margem lateral
        ml={{ base: 0, md: '80px' }}

        // Mobile: Margem superior de 64px para "limpar" o Header Fixo
        // Desktop: Sem margem superior
        mt={{ base: '64px', md: 0 }}

        // Desktop: Altura fixa da tela (100vh) com scroll interno
        // Mobile: Altura automática para usar o scroll nativo do navegador
        h={{ base: 'auto', md: '100vh' }}
        
        // Controla onde a barra de rolagem aparece
        overflowY={{ base: 'visible', md: 'auto' }}
        
        p={0}
        position="relative"
        zIndex={0} // Garante que o conteúdo fique abaixo do zIndex do Header (1000)
      >
        {children}
      </Box>
    </Flex>
  );
}