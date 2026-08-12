import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Flex,
  List,
  ListItem,
} from "@chakra-ui/react";
import { RiCheckboxCircleLine } from "react-icons/ri";
import { motion } from "framer-motion";

const pillarA_items = [
  "Estudo de viabilidade",
  "Dimensionamento hidráulico e energético",
  "Análise de captação, reservatórios, bombas e adutoras",
  "Comparativo técnico de marcas e apoio na compra",
  "Acompanhamento da implantação",
  "Estratégia de operação e custo",
];

const pillarB_items = [
  "Sonda FDR instalada no solo",
  "Umidade a cada 10 cm, temperatura e atividade radicular",
  "Pluviômetro integrado e comunicação satelital",
  "Plataforma online com histórico e alertas",
  "Evapotranspiração e previsão climática",
  "Acompanhamento técnico durante a safra",
];

export default function Services() {
  return (
    <Box
      id="atuacao"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={10}
      bg="#050B18"
      position="relative"
    >
      <Container maxW="container.xl" position="relative" zIndex={2}>
        {/* Cabeçalho da Seção */}
        <VStack spacing={6} textAlign="center" mb={16}>
          <Text
            color="#3084c9"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            O que a BR Sense faz
          </Text>
          <Heading size="2xl" color="white" maxW="3xl" lineHeight="1.2" >
            Do projeto ao manejo: uma visão completa da irrigação.
          </Heading>
          <Text fontSize="xl" color="whiteAlpha.700" maxW="3xl" textAlign="justify">
            A BR Sense atua em duas frentes que se complementam: engenharia para
            projetar e implantar pivôs centrais com segurança, e tecnologia para
            monitorar o solo durante a safra.
          </Text>
        </VStack>

        <SimpleGrid
          columns={{ base: 1, lg: 2 }}
          spacing={8}
          maxW="5xl"
          mx="auto"
        >
          {/* Pillar Card A (Claro) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ height: "100%" }}
          >
            <Box
              bg="#3084c9ff"
              p={{ base: 8, md: 10 }}
              rounded="2xl"
              border="1px"
              borderColor="#3084c9ff"
              h="full"
              shadow="xl"
            >
              <VStack align="start" spacing={6}>
                <Flex
                  w="44px"
                  h="44px"
                  bg="#071321"
                  color="#4ea6ce"
                  rounded="full"
                  align="center"
                  justify="center"
                  fontWeight="900"
                  fontSize="lg"
                >
                  A
                </Flex>
                <Heading size="lg" color="#10202f" lineHeight="1.2">
                  Consultoria para projetos de pivô central
                </Heading>
                <List spacing={4} pt={2}>
                  {pillarA_items.map((item, idx) => (
                    <ListItem
                      key={idx}
                      display="flex"
                      alignItems="center"
                      color="#10202f"
                      fontWeight="medium"
                      lineHeight="1.4"
                    >
                      <Box mr="4px">
                        <RiCheckboxCircleLine color="#071321" size={20} />
                      </Box>
                      <Text>{item}</Text>
                    </ListItem>
                  ))}
                </List>
              </VStack>
            </Box>
          </motion.div>

          {/* Pillar Card B (Escuro) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ height: "100%" }}
          >
            <Box
              bg="#071321"
              p={{ base: 8, md: 10 }}
              rounded="2xl"
              border="1px"
              borderColor="#071321"
              h="full"
              shadow="2xl"
            >
              <VStack align="start" spacing={6}>
                <Flex
                  w="44px"
                  h="44px"
                  bg="rgba(8, 174, 234, 0.14)"
                  color="#08aeea"
                  rounded="full"
                  align="center"
                  justify="center"
                  fontWeight="900"
                  fontSize="lg"
                >
                  B
                </Flex>
                <Heading size="lg" color="white" lineHeight="1.2">
                  Tecnologia para manejo de irrigação
                </Heading>
                <List spacing={4} pt={2}>
                  {pillarB_items.map((item, idx) => (
                    <ListItem
                      key={idx}
                      display="flex"
                      alignItems="center"
                      color="whiteAlpha.800"
                      fontWeight="medium"
                      lineHeight="1.4"
                    >
                      <Box mr="4px">
                        <RiCheckboxCircleLine color="#3084c9ff" size={20} />
                      </Box>
                      <Text>{item}</Text>
                    </ListItem>
                  ))}
                </List>
              </VStack>
            </Box>
          </motion.div>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
