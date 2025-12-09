import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { Header } from '../Header/Header';


type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <Box>
      <Header />
      <Box pt="4">{children}</Box>
    </Box>
  );
}
