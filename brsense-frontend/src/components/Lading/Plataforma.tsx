import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Grid,
  GridItem,
  Image,
  Flex,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import PlataformaUmidade from "../../assets/plataforma-umidade.jpeg";
import PlataformaClima from "../../assets/plataforma-clima.jpeg";
import PlataformaMapa from "../../assets/plataforma-mapa.jpeg";

const platformCards = [
  "Veja a água entrar no solo",
  "Identifique a raiz ativa",
  "Evite percolação profunda",
  "Acompanhe tudo pelo celular",
  "Decida com dados reais",
];

export default function Plataforma() {
  const scrollRef = useAutoScroll(0.5); // Velocidade do carrossel

  return (
    <Box
      id="plataforma"
      py={{ base: 16, md: 24, lg: 32 }}
      bg="#081322"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Text
              color="#3084c9"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
              mb={2}
              fontSize="sm"
            >
              Plataforma online
            </Text>
            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="white"
              lineHeight="1.2"
            >
              Veja a água entrar no solo e decida com dados reais.
            </Heading>
          </motion.div>
        </VStack>

        {/* Correção da Grelha: repeat(2, 1fr) no base para colocar as fotos menores lado a lado */}
        <Grid
          templateColumns={{
            base: "repeat(2, 1fr)",
            lg: "1.25fr 0.85fr 0.85fr",
          }}
          gap={4}
        >
          {/* Foto Alta (Ocupa as 2 colunas no telemóvel) */}
          <GridItem colSpan={{ base: 2, lg: 1 }} rowSpan={{ base: 1, lg: 2 }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Box
                bg="#101a29"
                rounded="2xl"
                border="1px"
                borderColor="whiteAlpha.200"
                overflow="hidden"
                shadow="2xl"
                display="flex"
                justifyContent="center"
              >
                <Image
                  src={PlataformaUmidade}
                  maxH={{ base: "320px", md: "500px", lg: "700px" }}
                  w="full"
                  objectFit="contain"
                />
              </Box>
            </motion.div>
          </GridItem>

          {/* Foto Menor 1 (Ocupa 1 coluna no telemóvel, ficando ao lado da Foto 2) */}
          <GridItem colSpan={1}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Box
                bg="#101a29"
                rounded="2xl"
                border="1px"
                borderColor="whiteAlpha.200"
                overflow="hidden"
                shadow="2xl"
                display="flex"
                justifyContent="center"
              >
                <Image
                  src={PlataformaMapa}
                  maxH={{ base: "250px", md: "400px", lg: "100%" }}
                  w="full"
                  objectFit="contain"
                />
              </Box>
            </motion.div>
          </GridItem>

          {/* Foto Menor 2 */}
          <GridItem colSpan={1}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Box
                bg="#101a29"
                rounded="2xl"
                border="1px"
                borderColor="whiteAlpha.200"
                overflow="hidden"
                shadow="2xl"
                display="flex"
                justifyContent="center"
              >
                <Image
                  src={PlataformaClima}
                  maxH={{ base: "250px", md: "400px", lg: "100%" }}
                  w="full"
                  objectFit="contain"
                />
              </Box>
            </motion.div>
          </GridItem>

          {/* Carrossel de Tags */}
          <GridItem colSpan={{ base: 2, lg: 2 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Flex
                ref={scrollRef} // <- Hook aplicado aqui
                gap={3}
                overflowX="auto"
                flexWrap={{ base: "nowrap", md: "wrap" }}
                justify={{ base: "flex-start", md: "center" }}
                pb={{ base: 4, md: 0 }}
                css={{
                  "&::-webkit-scrollbar": { display: "none" },
                  scrollbarWidth: "none",
                }}
              >
                {platformCards.map((card, idx) => (
                  <Flex
                    key={idx}
                    flexShrink={0}
                    minW={{ base: "150px", sm: "180px" }}
                    align="center"
                    justify="center"
                    textAlign="center"
                    bg="whiteAlpha.100"
                    border="1px"
                    borderColor="whiteAlpha.300"
                    rounded="xl"
                    p={4}
                    minH="80px"
                    color="white"
                    fontWeight="semibold"
                    fontSize="sm"
                  >
                    {card}
                  </Flex>
                ))}
              </Flex>
            </motion.div>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
