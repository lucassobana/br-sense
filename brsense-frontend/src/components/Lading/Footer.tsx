import {
  Box,
  Container,
  Flex,
  Text,
  VStack,
  HStack,
  Link,
  Icon,
} from "@chakra-ui/react";
import { FaInstagram, FaYoutube } from "react-icons/fa";

export default function Footer() {
  return (
    <Box bg="#050B18" py={12} borderTop="1px" borderColor="whiteAlpha.100">
      <Container maxW="container.xl">
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "center", md: "flex-start" }}
          gap={8}
        >
          <VStack align={{ base: "center", md: "flex-start" }} spacing={4}>
            <Text fontSize="xl" fontWeight="bold" color="white">
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

          <VStack align={{ base: "center", md: "flex-end" }} spacing={4}>
            <Text
              fontSize="sm"
              fontWeight="bold"
              color="whiteAlpha.900"
              textTransform="uppercase"
            >
              Acompanhe-nos
            </Text>
            <HStack spacing={5}>
              {/* Instagram: BR Sense */}
              <Link
                href="https://www.instagram.com/brsenseag/"
                isExternal
                color="whiteAlpha.600"
                transition="all 0.3s"
                _hover={{ color: "#E1306C", transform: "translateY(-2px)" }}
                aria-label="Instagram BR Sense"
              >
                <Icon as={FaInstagram} boxSize={6} />
              </Link>

              {/* Instagram: Pivô Central */}
              <Link
                href="https://www.instagram.com/pivo_central/"
                isExternal
                color="whiteAlpha.600"
                transition="all 0.3s"
                _hover={{ color: "#E1306C", transform: "translateY(-2px)" }}
                aria-label="Instagram Pivô Central"
              >
                <Icon as={FaInstagram} boxSize={6} />
              </Link>

              {/* YouTube: Mundo Irrigação */}
              <Link
                href="https://www.youtube.com/@MundoIrriga%C3%A7%C3%A3o"
                isExternal
                color="whiteAlpha.600"
                transition="all 0.3s"
                _hover={{ color: "#FF0000", transform: "translateY(-2px)" }}
                aria-label="YouTube Mundo Irrigação"
              >
                <Icon as={FaYoutube} boxSize={7} />{" "}
              </Link>
            </HStack>
          </VStack>
        </Flex>

        <Flex
          direction="column"
          align="center"
          mt={12}
          pt={8}
          borderTop="1px"
          borderColor="whiteAlpha.100"
        >
          <Text fontSize="sm" color="whiteAlpha.500" textAlign="center">
            © {new Date().getFullYear()} BR Sense. Todos os direitos reservados.
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}
