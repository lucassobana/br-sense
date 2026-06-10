import { Box, Container, Heading, SimpleGrid, Text, VStack, Flex, Image, Stack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import InstallPhoto from '../../assets/instalacao.jpeg';

const steps = [
  { title: 'Instalação das Sondas', desc: 'As sondas são posicionadas estrategicamente nas fazendas para coletar dados do solo e clima.' },
  { title: 'Transmissão Segura', desc: 'Os dados são transmitidos via satélite, garantindo cobertura mesmo em áreas remotas.' },
  { title: 'Análise Clara', desc: 'Visualize gráficos de umidade, previsões de chuva e status operacionais diretamente no aplicativo.' }
];

export default function HowItWorks() {
  return (
    <Box
      id="instalacao"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      bg="brand.900"
    >
      <Container maxW="container.xl">
        <Stack direction={{ base: 'column-reverse', lg: 'row' }} spacing={16} align="center">
          <VStack flex={1} spacing={8} align="start">
            <Heading size="xl" color="white">Como Funciona</Heading>
            <SimpleGrid columns={1} spacing={8} w="full">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Flex align="start" gap={5}>
                    <Flex minW={12} h={12} bg="brand.500" color="white" rounded="full" align="center" justify="center" fontSize="xl" fontWeight="bold">
                      {index + 1}
                    </Flex>
                    <VStack align="start" spacing={1} pt={1}>
                      <Heading size="md" color="white">{step.title}</Heading>
                      <Text color="text.secondary">{step.desc}</Text>
                    </VStack>
                  </Flex>
                </motion.div>
              ))}
            </SimpleGrid>
          </VStack>
          <Box flex={1} position="relative" w="full" maxW="lg">
             <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Image src={InstallPhoto} alt="Instalação da sonda BR Sense" rounded="2xl" shadow="2xl" />
            </motion.div>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}