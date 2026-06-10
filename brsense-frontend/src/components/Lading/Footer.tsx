import { Box, Container, Flex, Text } from '@chakra-ui/react';

export default function Footer() {
  return (
    <Box bg="#050B18" py={8} borderTop="1px" borderColor="whiteAlpha.100">
      <Container maxW="container.xl">
        <Flex direction={{ base: 'column', md: 'row' }} justify="center" align="center" gap={6}>
          
          <Text fontSize="sm" color="whiteAlpha.500">
            © {new Date().getFullYear()} BR Sense. Todos os direitos reservados.
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}