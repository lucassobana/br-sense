import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Flex,
  Image,
  Stack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
// IMAGEM: A imagem atual (instalacao.jpeg) funciona bem aqui, ou use equipe-campo.jpeg
import InstallPhoto from "../../assets/instalacao.jpeg";

const steps = [
  {
    title: "Diagnóstico da fazenda",
    desc: "Avaliação inicial das necessidades e características da sua área.",
  },
  {
    title: "Análise do sistema",
    desc: "Estudo do sistema de irrigação existente ou projeto novo.",
  },
  {
    title: "Instalação da sonda",
    desc: "Posicionamento da sonda FDR e pluviômetro no campo.",
  },
  {
    title: "Configuração da plataforma",
    desc: "Acesso liberado ao painel com dados via satélite.",
  },
  {
    title: "Treinamento da equipe",
    desc: "Capacitação para leitura e interpretação dos dados.",
  },
  {
    title: "Acompanhamento",
    desc: "Monitoramento contínuo dos gráficos durante a safra.",
  },
  {
    title: "Recomendações práticas",
    desc: "Ajuste de lâmina e orientações para melhorar o manejo.",
  },
];

export default function HowItWorks() {
  return (
    <Box
      id="acompanhamento"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      bg="brand.900"
    >
      <Container maxW="container.xl">
        <Stack
          direction={{ base: "column-reverse", lg: "row" }}
          spacing={16}
          align="center"
        >
          <VStack flex={1} spacing={8} align="start">
            <Text
              color="#3084c9"
              fontWeight="bold"
              textTransform="uppercase"
              fontSize="sm"
              letterSpacing="wider"
            >
              Como funciona
            </Text>
            <Heading size="xl" color="white" lineHeight="1.3">
              Um processo claro para sair do achismo e entrar no dado.
            </Heading>
            <SimpleGrid columns={1} spacing={6} w="full" pt={4}>
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Flex align="start" gap={5}>
                    <Flex
                      minW={12}
                      h={12}
                      bg="brand.500"
                      color="white"
                      rounded="full"
                      align="center"
                      justify="center"
                      fontSize="xl"
                      fontWeight="bold"
                    >
                      {index + 1}
                    </Flex>
                    <VStack align="start" spacing={1} pt={1}>
                      <Heading size="md" color="white">
                        {step.title}
                      </Heading>
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
              <Image
                src={InstallPhoto}
                alt="Equipe BR Sense em campo"
                rounded="2xl"
                shadow="2xl"
              />
            </motion.div>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
