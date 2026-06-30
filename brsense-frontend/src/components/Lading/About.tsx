import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Stack,
  Image,
} from "@chakra-ui/react";
import LogoAzul from "../../assets/BRSense_logo.png";

export default function About() {
  return (
    <Box id="sobre" py={{ base: 10, md: 20 }} bg="#050B18">
      <Container maxW="container.xl">
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={16}
          align="center"
        >
          <Box flex={0.5} w="full" display="flex" justifyContent="center">
            <Box
              p={10}
              bg="whiteAlpha.50"
              border="1px"
              borderColor="whiteAlpha.100"
              rounded="2xl"
              shadow="xl"
            >
              <Image
                src={LogoAzul}
                alt="Logo BR Sense"
                w="full"
                maxW="300px"
                objectFit="contain"
              />
            </Box>
          </Box>

          <VStack flex={1} align="start" spacing={6}>
            <Text
              color="#3084c9"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              Sobre a BR Sense
            </Text>
            <Heading size="2xl" color="white" lineHeight="1.2" >
              Engenharia, tecnologia e manejo de irrigação em uma solução completa.
            </Heading>
            <Text fontSize="lg" color="text.secondary" lineHeight="tall" textAlign="justify">
              A BR Sense nasceu para unir engenharia, tecnologia e manejo de
              irrigação em uma solução completa para o produtor rural. A empresa
              atua desde o planejamento de projetos de pivô central até o
              monitoramento em tempo real do solo, da água e da atividade
              radicular.
            </Text>
            <Text fontSize="lg" color="text.secondary" lineHeight="tall" textAlign="justify">
              Nosso objetivo é simples: ajudar o produtor a irrigar melhor, com
              mais segurança, eficiência e rentabilidade. A equipe soma
              experiência nacional e internacional em irrigação, projetos
              agrícolas e tecnologia de sensores de solo.
            </Text>
          </VStack>
        </Stack>
      </Container>
    </Box>
  );
}
