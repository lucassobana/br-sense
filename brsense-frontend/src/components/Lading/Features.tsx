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
import chartAnimation from '../../assets/lotties/chart.json';
import waterAnimation from '../../assets/lotties/water.json';
import mapAnimation from '../../assets/lotties/map.json';
import statusAnimation from '../../assets/lotties/status.json';

const features = [
  {
    lottieData: waterAnimation,
    title: "Pluviometria de Alta Precisão",
    desc: "Nossos pluviômetros físicos medem cada milímetro de chuva que cai na sua propriedade. Os dados de acúmulo são enviados em tempo real, gerando um histórico confiável e essencial para o manejo da irrigação.",
  },
  {
    lottieData: chartAnimation,
    title: "Gráficos de Umidade do Solo",
    desc: "Monitore a variação de umidade em diferentes níveis de profundidade (10cm a 60cm) com extrema exatidão, sabendo exatamente quando e quanto irrigar.",
  },
  {
    lottieData: rainAnimation,
    title: "Previsão Meteorológica",
    desc: "Cruze os dados reais do seu pluviômetro com nossa linha do tempo de previsão do tempo avançada, planejando pulverizações e colheitas de forma segura.",
  },
  {
    lottieData: mapAnimation,
    title: "Mapeamento via Satélite",
    desc: "Visualize os talhões das suas fazendas e a localização exata de cada sonda e pluviômetro com mapas interativos e atualizados.",
  },
  {
    lottieData: statusAnimation,
    title: "Telemetria Integrada",
    desc: "Acompanhe a saúde dos equipamentos no campo, verificando status de conexão, intensidade de sinal e nível de bateria em um painel unificado.",
  },
];

export default function Features() {
  return (
    <Box
      id="tecnologia"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      bg="#050B18"
      position="relative"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        <VStack spacing={4} mb={16} textAlign="center">
          <Heading size="xl" color="white">
            Toda a tecnologia em um só lugar
          </Heading>
          <Text color="text.secondary" maxW="2xl">
            Os hardwares e softwares necessários para ter controle total das
            variáveis agronômicas da sua lavoura.
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {features.map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -8 }}
            >
              <Box
                p={8}
                bg="#0A1226"
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
                  {/* CAIXA DE ANIMAÇÃO DO LOTTIE */}
                  <Box
                    w={16}
                    h={16} // Ajuste o tamanho da animação aqui
                    display="flex"
                    alignItems="center"
                    bg="brand.900"
                    rounded="xl"
                    p={2}
                    border="1px"
                    borderColor="whiteAlpha.50"
                  >
                    {/* Caso não tenha os JSONs ainda, este condicional evita quebrar a tela */}
                    {feat.lottieData ? (
                      <Lottie
                        animationData={feat.lottieData}
                        loop={true}
                        autoplay={true}
                      />
                    ) : (
                      <Box bg="brand.500" w={8} h={8} rounded="full" /> // Placeholder temporário
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
