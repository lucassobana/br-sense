import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Stack,
  Image,
  Flex,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import PivoEquipe from "../../assets/pivo-equipe.jpeg";

const tags = [
  "Análise da área irrigável",
  "Disponibilidade hídrica",
  "Poços, rios, barragens",
  "Dimensionamento",
  "Adutoras e bombas",
  "Reservatórios",
  "Energia elétrica",
  "Custo de implantação",
  "Viabilidade",
  "Fornecedores",
  "Treinamento",
];

export default function Consultoria() {
  const scrollRef = useAutoScroll(0.5);

  return (
    <Box
      id="consultoria"
      py={{ base: 16, md: 24, lg: 32 }}
      bg="#050B18"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={16}
          align="center"
        >
          <VStack flex={1} align="start" spacing={6}>
            <Text
              color="#3084c9"
              fontWeight="bold"
              textTransform="uppercase"
              fontSize="sm"
            >
              Consultoria em pivô
            </Text>
            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="white"
              lineHeight="1.2"
            >
              Do estudo ao pivô a funcionar: projeto e operação.
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.700">
              A BR Sense auxilia o produtor desde a tomada de decisão até à
              execução do projeto.
            </Text>
          </VStack>

          <Box
            flex={1}
            w="full"
            h="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Image
                src={PivoEquipe}
                rounded="2xl"
                shadow="2xl"
                h={{ base: "280px", md: "500px" }}
                w="full"
                objectFit="cover"
              />
            </motion.div>
          </Box>
        </Stack>

        <Box mt={16}>
          {/* Carrossel de Tags */}
          <Flex
            ref={scrollRef}
            gap={3}
            overflowX="auto"
            pb={4}
            flexWrap={{ base: "nowrap", md: "wrap" }}
            justify={{ base: "flex-start", md: "center" }}
            css={{
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {tags.map((tag, i) => (
              <Box key={i} flexShrink={0}>
                <Box
                  px={5}
                  py={3}
                  bg="#3084c9"
                  border="1px"
                  borderColor="whiteAlpha.200"
                  rounded="lg"
                  color="white"
                  fontWeight="medium"
                  shadow="sm"
                  fontSize="sm"
                >
                  {tag}
                </Box>
              </Box>
            ))}
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
