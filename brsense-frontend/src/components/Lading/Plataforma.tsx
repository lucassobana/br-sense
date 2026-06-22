import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Image,
  Flex,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import PlataformaUmidade from "../../assets/content.png";
import { COLORS } from "../../colors/colors";

const platformCards = [
  "Veja a água entrar no solo",
  "Identifique a raiz ativa",
  "Evite percolação profunda",
  "Acompanhe tudo pelo celular",
  "Decida com dados reais",
];

export default function Plataforma() {
  const scrollRef = useAutoScroll(0.5);

  return (
    <Box
      id="plataforma"
      py={{ base: 16, md: 24, lg: 32 }}
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

        <VStack spacing={6} mb={12} w="full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ width: "100%" }}
          >
            <Box
              bg="#050B18"
              rounded="2xl"
              overflow="hidden"
              shadow="2xl"
              w="full"
            >
              <Image
                src={PlataformaUmidade}
                alt="Gráfico de perfil de umidade na plataforma BR Sense"
                w="full"
                h="auto"
                objectFit="contain"
              />
            </Box>
          </motion.div>
        </VStack>

        <Box w="full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Flex
              ref={scrollRef}
              overflowX="auto"
              w="full"
              css={{
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              <Flex gap={4} pr={4} flexShrink={0}>
                {platformCards.map((card, idx) => (
                  <Flex
                    key={`g1-${idx}`}
                    flexShrink={0}
                    minW={{ base: "180px", sm: "220px", md: "260px" }}
                    align="center"
                    justify="center"
                    textAlign="center"
                    bg={COLORS.primaryDark}
                    border="1px"
                    borderColor="whiteAlpha.300"
                    rounded="xl"
                    p={5}
                    minH="90px"
                    color="white"
                    fontWeight="semibold"
                    fontSize="sm"
                    boxShadow="md"
                  >
                    {card}
                  </Flex>
                ))}
              </Flex>

              <Flex gap={4} pr={4} flexShrink={0}>
                {platformCards.map((card, idx) => (
                  <Flex
                    key={`g2-${idx}`}
                    flexShrink={0}
                    minW={{ base: "180px", sm: "220px", md: "260px" }}
                    align="center"
                    justify="center"
                    textAlign="center"
                    bg={COLORS.primaryDark}
                    border="1px"
                    borderColor="whiteAlpha.300"
                    rounded="xl"
                    p={5}
                    minH="90px"
                    color="white"
                    fontWeight="semibold"
                    fontSize="sm"
                    boxShadow="md"
                  >
                    {card}
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
