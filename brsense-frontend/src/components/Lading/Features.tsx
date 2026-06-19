import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import rainAnimation from "../../assets/lotties/rain.json";
import chartAnimation from "../../assets/lotties/chart.json";
import waterAnimation from "../../assets/lotties/water.json";
import mapAnimation from "../../assets/lotties/map.json";
import statusAnimation from "../../assets/lotties/status.json";
import manageAnimation from "../../assets/lotties/manage.json"; // Usando animação extra

const features = [
  {
    lottieData: waterAnimation,
    title: "Água",
    desc: "Redução do desperdício de água e menor risco de excesso no perfil do solo.",
  },
  {
    lottieData: statusAnimation,
    title: "Energia",
    desc: "Menor custo de energia com melhor uso do pivô central e lâmina ajustada.",
  },
  {
    lottieData: mapAnimation,
    title: "Raiz",
    desc: "Melhor desenvolvimento radicular e menor risco de estresse hídrico.",
  },
  {
    lottieData: chartAnimation,
    title: "Decisão",
    desc: "Mais segurança na tomada de decisão com acompanhamento técnico especializado.",
  },
  {
    lottieData: rainAnimation,
    title: "Produtividade",
    desc: "Mais previsibilidade produtiva e melhor resposta da planta durante a safra.",
  },
  {
    lottieData: manageAnimation,
    title: "Manejo",
    desc: "Controle de chuva, irrigação, percolação, histórico e alertas em uma rotina simples.",
  },
];

export default function Features() {
  return (
    <Box
      id="plataforma"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      bg="#050B18"
    >
      <Container maxW="container.xl">
        <VStack spacing={4} textAlign="center" mb={16}>
          <Text
            color="#3084c9"
            fontWeight="bold"
            textTransform="uppercase"
            fontSize="sm"
            letterSpacing="wider"
          >
            Benefícios
          </Text>
          <Heading size="2xl" color="white" maxW="3xl">
            Irrigue com mais eficiência, previsibilidade e segurança.
          </Heading>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {features.map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Box
                bg="brand.900"
                p={8}
                rounded="2xl"
                border="1px"
                borderColor="whiteAlpha.100"
                h="full"
                transition="all 0.3s"
                _hover={{
                  borderColor: "brand.500",
                  transform: "translateY(-4px)",
                }}
              >
                <VStack align="start" spacing={5}>
                  <Box
                    w={16}
                    h={16}
                    display="flex"
                    alignItems="center"
                    bg="brand.900"
                    rounded="xl"
                    p={2}
                    border="1px"
                    borderColor="whiteAlpha.50"
                  >
                    {feat.lottieData ? (
                      <Lottie
                        animationData={feat.lottieData}
                        loop={true}
                        autoplay={true}
                      />
                    ) : (
                      <Box bg="brand.500" w={8} h={8} rounded="full" />
                    )}
                  </Box>

                  <Heading size="md" color="white">
                    {feat.title}
                  </Heading>
                  <Text color="text.secondary" lineHeight="tall">
                    {feat.desc}
                  </Text>
                </VStack>
              </Box>
            </motion.div>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
