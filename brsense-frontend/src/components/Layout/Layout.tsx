// brsense-frontend/src/components/Layout/Layout.tsx
import { useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // REGRA DE SEGURANÇA:
    // Verifica se o usuário tem o token de acesso.
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    if (!token) {
      // Se não estiver logado, redireciona imediatamente para o login
      navigate('/login'); // Garanta que a rota de login é '/login'
    }
  }, [navigate]);

  return (
    <Flex direction="column" minH="100vh" bg="#0A0A0A">
      {/* Removemos o 'onOpen={...}' pois o Header não precisa mais dele */}
      <Header />

      {/* O conteúdo da página */}
      <Box flex="1" p={{ base: 4, md: 6 }}>
        {children}
      </Box>
    </Flex>
  );
}