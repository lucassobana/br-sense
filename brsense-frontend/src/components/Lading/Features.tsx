import type { ElementType } from "react";
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
import { useAutoScroll } from "../../hooks/useAutoScroll";
import { FaBolt, FaChartLine } from "react-icons/fa";
import { GiTreeRoots } from "react-icons/gi";
import { IoWater } from "react-icons/io5";
import { MdManageAccounts } from "react-icons/md";
import { COLORS } from "../../colors/colors";
import { PiLeafFill } from "react-icons/pi";

interface FeatureItem {
  icon: ElementType;
  title: string;
  desc: string;
}

const features: FeatureItem[] = [
  {
    icon: IoWater,
    title: "Água",
    desc: "Redução do desperdício de água e menor risco de excesso no perfil do solo.",
  },
  {
    icon: FaBolt,
    title: "Energia",
    desc: "Menor custo de energia com melhor uso do pivô central e lâmina ajustada.",
  },
  {
    icon: GiTreeRoots,
    title: "Raiz",
    desc: "Melhor desenvolvimento radicular e menor risco de estresse hídrico.",
  },
  {
    icon: FaChartLine,
    title: "Decisão",
    desc: "Mais segurança na tomada de decisão com acompanhamento técnico especializado.",
  },
  {
    icon: PiLeafFill,
    title: "Produtividade",
    desc: "Mais previsibilidade produtiva e melhor resposta da planta durante a safra.",
  },
  {
    icon: MdManageAccounts,
    title: "Manejo",
    desc: "Controle de chuva, irrigação, percolação, histórico e alertas em uma rotina simples.",
  },
];

export default function Features() {
  const scrollRef = useAutoScroll(0.5);

  const FeatureCard = ({ feat }: { feat: FeatureItem }) => (
    <Box
      bg="brand.900"
      p={6}
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
        <Box
          w={14}
          h={14}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={COLORS.primaryDark}
          rounded="xl"
          border="1px"
          borderColor="whiteAlpha.50"
        >
          <Box as={feat.icon} color="white" boxSize={6} />
        </Box>

        <Heading size="md" color="white">
          {feat.title}
        </Heading>
        <Text color="text.secondary" lineHeight="tall" fontSize="sm">
          {feat.desc}
        </Text>
      </VStack>
    </Box>
  );

  return (
    <Box
      id="beneficios"
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      bg="#050B18"
    >
      <Container maxW="container.xl">
        <VStack spacing={4} textAlign="center" mb={16}>
          <Text
            color="#3084c9"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Benefícios
          </Text>
          <Heading size="2xl" color="white" maxW="3xl">
            Irrigue com mais eficiência, previsibilidade e segurança.
          </Heading>
        </VStack>

        <Box display={{ base: "none", md: "block" }}>
          <SimpleGrid columns={{ md: 2, lg: 3 }} spacing={8}>
            {features.map((feat, index) => (
              <motion.div
                key={`grid-${index}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{ height: "100%" }}
              >
                <FeatureCard feat={feat} />
              </motion.div>
            ))}
          </SimpleGrid>
        </Box>

        <Box display={{ base: "block", md: "none" }} w="full">
          <Flex
            ref={scrollRef}
            overflowX="auto"
            w="full"
            css={{
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {/* GRUPO 1 */}
            <Flex gap={4} pr={4} flexShrink={0}>
              {features.map((feat, index) => (
                <Box
                  key={`carousel1-${index}`}
                  w={{ base: "250px", sm: "280px" }}
                  flexShrink={0}
                >
                  <FeatureCard feat={feat} />
                </Box>
              ))}
            </Flex>

            <Flex gap={4} pr={4} flexShrink={0}>
              {features.map((feat, index) => (
                <Box
                  key={`carousel2-${index}`}
                  w={{ base: "250px", sm: "280px" }}
                  flexShrink={0}
                >
                  <FeatureCard feat={feat} />
                </Box>
              ))}
            </Flex>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
