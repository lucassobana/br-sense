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
            <Text color="#3084c9" fontWeight="bold" textTransform="uppercase">
              Consultoria em pivô
            </Text>
            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="white"
              lineHeight="1.2"
            >
              Do estudo ao pivô a funcionar: projeto e operação.
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.700" textAlign="justify">
              A BR Sense desenvolve projetos completos de irrigação por pivô central, atuando desde o diagnóstico inicial da área até o acompanhamento da implantação. Nossa engenharia contempla o dimensionamento dos pivôs, estudos topográficos, análise da disponibilidade hídrica, projetos de captação, reservatórios, adutoras e estações de bombeamento. Também realizamos o dimensionamento elétrico, definição de dispositivos de proteção, análise de custos operacionais e estudos de viabilidade econômica com indicadores como VPL, TIR e Payback. Além disso, padronizamos e comparamos propostas de diferentes fabricantes para garantir uma tomada de decisão técnica e imparcial. O resultado é um projeto seguro, eficiente e economicamente sustentável, que reduz riscos de implantação, otimiza o uso da água e da energia e proporciona maior retorno sobre o investimento ao produtor rural.
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
          <Flex
            ref={scrollRef}
            overflowX="auto"
            pb={4}
            css={{
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            <Flex gap={3} pr={3} flexShrink={0}>
              {tags.map((tag, i) => (
                <Box key={`tag1-${i}`} flexShrink={0}>
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

            <Flex gap={3} pr={3} flexShrink={0}>
              {tags.map((tag, i) => (
                <Box key={`tag2-${i}`} flexShrink={0}>
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
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
