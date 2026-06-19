import { Box, Container, Flex, Text, VStack } from "@chakra-ui/react";
// IMAGEM: Caso tenha logo branca, você pode importá-la aqui e adicionar um <Image src={LogoBranco} h={10} />
// import LogoBranco from '../../assets/logo-brsense-branco.jpg';

export default function Footer() {
  return (
    <Box bg="#050B18" py={12} borderTop="1px" borderColor="whiteAlpha.100">
      <Container maxW="container.xl">
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align="center"
          gap={6}
        >
          <VStack align={{ base: "center", md: "flex-start" }} spacing={2}>
            {/* <Image src={LogoBranco} alt="BR Sense" h={8} /> */}
            <Text fontSize="lg" fontWeight="bold" color="white">
              BR Sense
            </Text>
            <Text
              fontSize="sm"
              color="whiteAlpha.700"
              textAlign={{ base: "center", md: "left" }}
              maxW="sm"
            >
              Irrigue com dados reais do solo. Veja onde a água chegou. Entenda
              onde a raiz está ativa.
            </Text>
          </VStack>

          <Text fontSize="sm" color="whiteAlpha.500">
            © {new Date().getFullYear()} BR Sense. Todos os direitos reservados.
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}
