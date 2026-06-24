import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Flex,
  Image,
  SimpleGrid,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import SondaPivoImg from "../../assets/sonda-pivo.jpeg";
import TecnicoSondaImg from "../../assets/tecnico-sonda.jpeg";
import RaizesBatataImg from "../../assets/raizes-batata.png";
import { COLORS } from "../../colors/colors";

const diffs = [
  "Experiência em pivô",
  "Monitorização própria",
  "Comunicação satelital",
  "Múltiplas profundidades",
  "Pluviômetro integrado",
  "Plataforma online",
  "Atividade radicular",
  "Acompanhamento na safra",
  "Implantação e manejo",
  "Experiência internacional",
];

// Vetor com as imagens
const images = [SondaPivoImg, TecnicoSondaImg, RaizesBatataImg];

export default function Differentials() {
  // Mantemos o hook de scroll APENAS para as tags
  const tagsScrollRef = useAutoScroll(0.5);

  return (
    <Box
      id="diferenciais"
      py={{ base: 16, md: 24, lg: 32 }}
      bg="#050B18"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        <VStack spacing={4} textAlign="center" mb={{ base: 10, md: 16 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Text
              color="#3084c9"
              fontWeight="bold"
              textTransform="uppercase"
              fontSize="sm"
              mb={2}
            >
              Diferenciais
            </Text>
            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="white"
              maxW="3xl"
              lineHeight="1.2"
            >
              Tecnologia, campo real e engenharia na mesma entrega.
            </Heading>
          </motion.div>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={12}>
          {images.map((imgSrc, idx) => (
            <motion.div
              key={`img-${idx}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <Box
                bg="whiteAlpha.50"
                p={2}
                rounded="2xl"
                shadow="xl"
                border="1px"
                borderColor="whiteAlpha.100"
              >
                <Image
                  src={imgSrc}
                  rounded="xl"
                  w="full"
                  h={{ base: "200px", md: "280px" }}
                  objectFit="cover"
                  objectPosition={
                    idx === 0 ? { base: "center 35%", md: "center" } : "center"
                  }
                />
              </Box>
            </motion.div>
          ))}
        </SimpleGrid>

        <Box w="full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Flex
              ref={tagsScrollRef}
              overflowX="auto"
              w="full"
              css={{
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {/* GRUPO 1: TAGS */}
              <Flex gap={4} pr={4} flexShrink={0}>
                {diffs.map((diff, idx) => (
                  <Flex
                    key={`tag1-${idx}`}
                    flexShrink={0}
                    minW={{ base: "220px", sm: "240px", md: "260px" }}
                    align="center"
                    justify="center"
                    textAlign="center"
                    p={4}
                    bg={COLORS.primaryDark}
                    border="1px"
                    borderColor="whiteAlpha.200"
                    rounded="xl"
                    color="whiteAlpha.900"
                    fontWeight="medium"
                    fontSize="sm"
                    h="100%"
                    minH="80px"
                    shadow="sm"
                  >
                    {diff}
                  </Flex>
                ))}
              </Flex>

              <Flex gap={4} pr={4} flexShrink={0}>
                {diffs.map((diff, idx) => (
                  <Flex
                    key={`tag2-${idx}`}
                    flexShrink={0}
                    minW={{ base: "220px", sm: "240px", md: "260px" }}
                    align="center"
                    justify="center"
                    textAlign="center"
                    p={4}
                    bg={COLORS.primaryDark}
                    border="1px"
                    borderColor="whiteAlpha.200"
                    rounded="xl"
                    color="whiteAlpha.900"
                    fontWeight="medium"
                    fontSize="sm"
                    h="100%"
                    minH="80px"
                    shadow="sm"
                  >
                    {diff}
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
}
