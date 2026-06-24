import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  AspectRatio,
} from "@chakra-ui/react";
import { motion } from "framer-motion";

export default function VideosSection() {
  return (
    <Box
      id="videos"
      py={{ base: 16, md: 24 }}
      bg="#050B18"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        {/* Cabeçalho da Seção */}
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
              Na Prática
            </Text>
            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="white"
              maxW="3xl"
              lineHeight="1.2"
            >
              Veja o nosso trabalho no campo
            </Heading>
          </motion.div>
        </VStack>

        {/* Grelha dos Vídeos */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {/* Vídeo 1: Instalação da Sonda no RS */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Box
              rounded="2xl"
              overflow="hidden"
              shadow="2xl"
              border="1px"
              borderColor="whiteAlpha.200"
              bg="whiteAlpha.50"
              transition="transform 0.3s"
              _hover={{
                transform: "translateY(-4px)",
                borderColor: "brand.500",
              }}
            >
              <AspectRatio ratio={16 / 9}>
                <iframe
                  title="ELE VAI MUDAR O MANEJO DO RS NOS PIVÔS CENTRAIS"
                  src="https://www.youtube.com/embed/gC66v5JH6q8"
                  allowFullScreen
                  style={{ border: 0 }}
                />
              </AspectRatio>
            </Box>
          </motion.div>

          {/* Vídeo 2: Poço de Alta Vazão na Bahia */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box
              rounded="2xl"
              overflow="hidden"
              shadow="2xl"
              border="1px"
              borderColor="whiteAlpha.200"
              bg="whiteAlpha.50"
              transition="transform 0.3s"
              _hover={{
                transform: "translateY(-4px)",
                borderColor: "brand.500",
              }}
            >
              <AspectRatio ratio={16 / 9}>
                <iframe
                  title="POÇO ALTA VAZÃO DIRETO PARA PIVÔ GRANDE"
                  src="https://www.youtube.com/embed/N03EXBqwff0"
                  allowFullScreen
                  style={{ border: 0 }}
                />
              </AspectRatio>
            </Box>
          </motion.div>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
