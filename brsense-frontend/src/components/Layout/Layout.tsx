// brsense-frontend/src/components/Layout/Layout.tsx
import { useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { COLORS } from '../../colors/colors';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <Flex minH="100vh" bg={COLORS.background}>
      <Sidebar />

      {/* marginLeft fixo em 80px (tamanho da sidebar recolhida) 
          para que o conteúdo não se mova quando a sidebar expandir por cima 
      */}
      <Box
        flex="1"
        ml="80px"
        h="100vh"
        overflowY="auto"
        // p={{ base: 4, md: 6 }}
        p={0}
      >
        {children}
      </Box>
    </Flex>
  );
}