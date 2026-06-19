import {
  Box,
  Container,
  Heading,
  Text,
  Wrap,
  WrapItem,
  VStack,
  Stack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";

const publicTags = [
  "Produtores irrigantes",
  "Fazendas com pivô central",
  "Projetos novos de irrigação",
  "Áreas com alto custo de energia",
  "Áreas com solo arenoso",
  "Culturas de alto valor",
  "Consultores agrícolas",
  "Revendas e empresas do agro",
  "Grupos agrícolas",
];

export default function Audience() {
  return (
    <Box py={{ base: 16, md: 24 }} bg="#050B18">
      <Container maxW="container.xl">
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={12}
          align="center"
        >
          <VStack
            flex={1}
            align={{ base: "center", lg: "start" }}
            textAlign={{ base: "center", lg: "left" }}
            spacing={4}
          >
            <Text
              color="#3084c9"
              fontWeight="bold"
              textTransform="uppercase"
              fontSize="sm"
              letterSpacing="wider"
            >
              Para quem é
            </Text>
            <Heading size="xl" color="white">
              Feito para quem precisa tirar mais decisão do sistema de
              irrigação.
            </Heading>
          </VStack>

          <Box flex={1.5}>
            <Wrap spacing={3} justify={{ base: "center", lg: "start" }}>
              {publicTags.map((tag, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <WrapItem>
                    <Box
                      px={5}
                      py={2}
                      bg="white"
                      color="#10202f"
                      rounded="full"
                      fontWeight="bold"
                      fontSize="sm"
                      shadow="sm"
                    >
                      {tag}
                    </Box>
                  </WrapItem>
                </motion.div>
              ))}
            </Wrap>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
