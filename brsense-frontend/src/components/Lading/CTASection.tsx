import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';

export default function CTASection() {
  return (
    <Box 
      id="contato"
      minH="100vh"
      display="flex"
      alignItems="center"
      bg="brand.900" 
      position="relative" 
      overflow="hidden" 
      borderTop="1px" 
      borderColor="whiteAlpha.100" 
      borderBottom="1px"
    >
      <Container maxW="container.md" position="relative" zIndex={2}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <VStack spacing={8} textAlign="center">
            <Heading size="2xl" lineHeight="1.3" color="white">Transforme a gestão da sua fazenda hoje mesmo</Heading>
            <Text fontSize="xl" color="text.secondary">
              Entre em contato para uma demonstração personalizada e veja como o BR Sense pode revolucionar sua produção agrícola.
            </Text>
          </VStack>
        </motion.div>
      </Container>
    </Box>
  );
}