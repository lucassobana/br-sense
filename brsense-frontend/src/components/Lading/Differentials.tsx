import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Flex,
  Image,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import SondaPivoImg from "../../assets/sonda-pivo.jpeg";
import TecnicoSondaImg from "../../assets/tecnico-sonda.jpeg";
import RaizesBatataImg from "../../assets/raizes-batata.png";

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

export default function Differentials() {
  const imagesScrollRef = useAutoScroll(0.5);
  const tagsScrollRef = useAutoScroll(0.5);

  return (
    <Box
      id="cases"
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

        {/* Carrossel de Imagens */}
        <Flex
          ref={imagesScrollRef}
          gap={{ base: 4, md: 6 }}
          overflowX="auto"
          flexWrap={{ base: "nowrap", md: "wrap" }}
          mb={12}
          pb={{ base: 4, md: 0 }}
          css={{
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          {[SondaPivoImg, TecnicoSondaImg, RaizesBatataImg].map(
            (imgSrc, idx) => (
              <Box
                key={idx}
                minW={{ base: "260px", md: "calc(33.333% - 16px)" }}
                flexShrink={0}
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
                  />
                </Box>
              </Box>
            ),
          )}
        </Flex>

        {/* Carrossel de Tags */}
        <Flex
          ref={tagsScrollRef}
          gap={4}
          overflowX="auto"
          flexWrap={{ base: "nowrap", md: "wrap" }}
          pb={{ base: 4, md: 0 }}
          css={{
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          {diffs.map((diff, idx) => (
            <Box
              key={idx}
              flexShrink={0}
              minW={{
                base: "220px",
                sm: "calc(50% - 8px)",
                md: "calc(33.333% - 11px)",
                lg: "calc(20% - 13px)",
              }}
            >
              <Flex
                align="center"
                justify="center"
                textAlign="center"
                p={4}
                bg="#0A1226"
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
            </Box>
          ))}
        </Flex>
      </Container>
    </Box>
  );
}
