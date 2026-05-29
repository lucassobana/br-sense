import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Flex,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import chartAnimation from '../../assets/lotties/chart_line.json';
import manageAnimation from '../../assets/lotties/manage.json';
import maintenanceAnimation from '../../assets/lotties/maintenance.json';

const services = [
  {
    lottieData: chartAnimation,
    title: "Acompanhamento de Safra",
    desc: "Unimos os dados coletados em campo com nossa expertise agronômica. Realizamos o monitoramento contínuo do ciclo fenológico da sua cultura, orientando a tomada de decisão para maximizar a produtividade e reduzir perdas.",
  },
  {
    lottieData: manageAnimation,
    title: "Projetos de Pivô Central",
    desc: "Engenharia completa e especializada em irrigação. Desenvolvemos o dimensionamento hidráulico e a adequação de pivôs centrais, focando em máxima eficiência hídrica e energética para a sua realidade topográfica.",
  },
  {
    lottieData: maintenanceAnimation,
    title: "Suporte e Manutenção",
    desc: "Nossa equipe técnica acompanha a saúde dos seus equipamentos de perto. Garantimos que os pluviômetros e sondas operem com 100% de precisão durante toda a janela da safra.",
  },
];

export default function Services() {
  return (
    <Box
      id="servicos"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      bg="#0A1226"
      position="relative"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        <VStack spacing={4} mb={16} textAlign="center">
          <Text
            color="brand.500"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            fontSize="sm"
          >
            Nossas Soluções
          </Text>
          <Heading size="xl" color="white">
            Muito além do Software
          </Heading>
          <Text color="text.secondary" fontSize="lg" maxW="2xl">
            Combinamos inteligência de dados com engenharia e agronomia de ponta
            para entregar resultados reais no campo.
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              whileHover={{ scale: 1.03, y: -8 }}
            >
              <Box
                p={8}
                bg="#050B18"
                rounded="2xl"
                border="1px"
                borderColor="whiteAlpha.100"
                h="full"
                transition="all 0.3s"
                _hover={{
                  borderColor: "brand.500",
                  transform: "translateY(-6px)",
                }}
              >
                <VStack align="start" spacing={5}>
                  <Flex
                    w={14}
                    h={14}
                    bg="#0A1226"
                    color="brand.500"
                    rounded="xl"
                    align="center"
                    justify="center"
                    border="1px"
                    borderColor="brand.500"
                  >
                    {service.lottieData ? (
                      <Lottie
                        animationData={service.lottieData}
                        loop={true}
                        autoplay={true}
                      />
                    ) : (
                      <Box bg="brand.500" w={8} h={8} rounded="full" /> // Placeholder temporário
                    )}
                  </Flex>
                  <Heading size="md" color="white">
                    {service.title}
                  </Heading>
                  <Text color="text.secondary" lineHeight="tall">
                    {service.desc}
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
