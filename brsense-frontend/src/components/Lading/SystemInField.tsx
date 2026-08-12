import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Flex,
  Image,
  List,
  ListItem,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import PluviometroImg from "../../assets/pluviometro-campo.jpeg";
import InstalacaoSondaImg from "../../assets/instalacao.jpeg";
import { FaArrowAltCircleRight } from "react-icons/fa";
import { COLORS } from "../../colors/colors";

const medidas = [
  "Umidade do solo",
  "Temperatura do solo",
  "Atividade radicular",
  "Profundidade da água",
  "Percolação profunda",
  "Resposta da planta",
];
const profundidades = ["10 cm", "20 cm", "30 cm", "40 cm", "50 cm", "60 cm"];
const especificacoes = [
  "Sonda FDR de 60 cm",
  "Sensores a cada 10 cm",
  "Comunicação satelital",
  "Leituras na plataforma",
  "Pluviômetro integrado",
  "Painel solar",
  "Acesso pelo telemóvel",
  "Gráficos e alertas",
];

export default function SystemInField() {
  const scrollRef = useAutoScroll(0.6);

  return (
    <Box
      id="sonda"
      py={{ base: 10, md: 12 }}
      bg="#050B18"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        <VStack
          spacing={4}
          textAlign="center"
          mb={{ base: 10, md: 16 }}
          maxW="3xl"
          mx="auto"
        >
          <Text
            color="#3084c9"
            fontWeight="bold"
            textTransform="uppercase"
          >
            Sonda BR Sense
          </Text>
          <Heading
            size={{ base: "xl", md: "2xl" }}
            color="white"
            lineHeight="1.2"
          >
            Enxergue o que acontece dentro do solo.
          </Heading>
        </VStack>

        <SimpleGrid
          columns={{ base: 1, lg: 2 }}
          spacing={{ base: 8, md: 12 }}
          alignItems="stretch"
        >
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <SimpleGrid
              columns={{ base: 1, sm: 2 }}
              spacing={4}
              w="full"
              h="full"
            >
              <Box
                bg="whiteAlpha.50"
                rounded="2xl"
                p={2}
                h={{ base: "250px", sm: "full" }}
              >
                <Image
                  src={PluviometroImg}
                  rounded="xl"
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </Box>
              <Box
                bg="whiteAlpha.50"
                rounded="2xl"
                p={2}
                h={{ base: "250px", sm: "full" }}
              >
                <Image
                  src={InstalacaoSondaImg}
                  rounded="xl"
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </Box>
            </SimpleGrid>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Box
              bg="#071321"
              p={{ base: 5, md: 8 }}
              rounded="2xl"
              border="1px"
              borderColor="whiteAlpha.100"
              shadow="2xl"
              h="full"
            >
              <Heading size="md" color="white" mb={6}>
                Medições em múltiplas profundidades
              </Heading>

              <List
                display="grid"
                gridTemplateColumns={{ base: "1fr 1fr" }}
                gap={3}
                mb={8}
              >
                {medidas.map((item, idx) => (
                  <ListItem
                    key={idx}
                    display="flex"
                    alignItems="center"
                    color="whiteAlpha.900"
                    fontSize={{ base: "xs", md: "sm" }}
                    fontWeight="medium"
                  >
                    <Box mr={2}>
                      <FaArrowAltCircleRight color={COLORS.primary} size={16}/>
                    </Box>
                    <Text lineHeight="1.2">{item}</Text>
                  </ListItem>
                ))}
              </List>
                
              <Flex
                rounded="lg"
                overflow="hidden"
                border="1px"
                borderColor="whiteAlpha.200"
                mb={8}
                flexWrap={{ base: "wrap", sm: "nowrap" }}
              >
                {profundidades.map((prof, idx) => (
                  <Flex
                    key={idx}
                    flex={{ base: "1 1 33%", sm: 1 }}
                    h={{ base: "45px", sm: "70px" }}
                    align="center"
                    justify="center"
                    bgGradient="linear(to-b, rgba(8, 174, 234, 0.28), rgba(177, 111, 58, 0.34))"
                    borderRight="1px"
                    borderBottom={{
                      base: idx < 3 ? "1px" : "none",
                      sm: "none",
                    }}
                    borderColor="whiteAlpha.200"
                    color="white"
                    fontWeight="bold"
                    fontSize="xs"
                  >
                    {prof}
                  </Flex>
                ))}
              </Flex>

              {/* Carrossel de Especificações */}
              <Flex
                ref={scrollRef}
                gap={3}
                overflowX="auto"
                flexWrap={{ base: "nowrap", sm: "wrap" }}
                pb={{ base: 2, sm: 0 }}
                css={{
                  "&::-webkit-scrollbar": { display: "none" },
                  scrollbarWidth: "none",
                }}
              >
                {especificacoes.map((spec, idx) => (
                  <Box
                    key={idx}
                    flexShrink={0}
                    minW={{ base: "180px", sm: "calc(50% - 6px)" }}
                    p={3}
                    bg={COLORS.primaryDark}
                    border="1px"
                    borderColor="whiteAlpha.200"
                    rounded="md"
                    color="whiteAlpha.800"
                    fontSize="xs"
                    fontWeight="semibold"
                    display="flex"
                    alignItems="center"
                  >
                    {spec}
                  </Box>
                ))}
              </Flex>
            </Box>
          </motion.div>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
