import {
  Box,
  Container,
  Heading,
  Stack,
  Text,
  Button,
  LightMode,
  SimpleGrid,
} from "@chakra-ui/react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import HeroBg from "../../assets/hero-sonda-campo.jpeg";
import { FiChevronDown } from "react-icons/fi";
import { COLORS } from "../../colors/colors";

const MotionBox = motion.create(Box);

export default function Hero() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const yParallax = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <Box
      id="inicio"
      ref={ref}
      position="relative"
      minH="100vh"
      display="flex"
      alignItems="center"
      pt={{ base: "120px", lg: "100px" }}
      pb={{ base: 20, md: 32 }}
      overflow="hidden"
    >
      <MotionBox
        position="absolute"
        top="-10%"
        left={0}
        w="full"
        h="130%"
        bgImage={`url(${HeroBg})`}
        bgSize="cover"
        bgPosition={{
          base: "70% center",
          md: "center",
        }}
        bgRepeat="no-repeat"
        style={{ y: yParallax }}
        zIndex={0}
      />

      <Box
        position="absolute"
        top={0}
        left={0}
        w="full"
        h="full"
        bg="blackAlpha.800"
        zIndex={1}
      />

      <Container maxW="container.xl" position="relative" zIndex={2}>
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 12, lg: 8 }}
          align={{ base: "center", lg: "flex-end" }}
          justify="space-between"
        >
          <Stack
            direction="column"
            spacing={6}
            align={{ base: "center", lg: "flex-start" }}
            textAlign={{ base: "center", lg: "left" }}
            maxW="2xl"
          >
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Text
                color="#3084c9"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Consultoria, sensores e decisão técnica para irrigação
              </Text>
            </MotionBox>

            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Heading
                as="h1"
                size={{ base: "2xl", md: "3xl" }}
                fontWeight="bold"
                lineHeight="1.15"
                color="#FFFFFF"
              >
                Você não precisa mais irrigar no{" "}
                <Text as="span" color="#3084c9">
                  escuro.
                </Text>
              </Heading>
            </MotionBox>

            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Text
                fontSize={{ base: "lg", md: "xl" }}
                color="#A0AEC0"
                lineHeight="tall"
                fontWeight="medium"
                textAlign="justify"
              >
                Unimos consultoria especializada em projetos de pivô central com
                tecnologia de monitoramento em tempo real do solo, da água, da
                chuva e da atividade radicular.
              </Text>
            </MotionBox>

            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <LightMode>
                <Stack
                  direction={{ base: "column", sm: "row" }}
                  spacing={4}
                  mt={2}
                >
                  <Button
                    size="lg"
                    bg={COLORS.primary}
                    color="white"
                    _hover={{ bg: COLORS.primaryDark, transform: "translateY(-1px)" }}
                    boxShadow="0 10px 20px rgba(41, 126, 179, 0.431)"
                    as="a"
                    href="#contato"
                  >
                    Quero iniciar o meu projeto
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    color="white"
                    _hover={{
                      bg: "whiteAlpha.200",
                      transform: "translateY(-1px)",
                    }}
                    as="a"
                    href="#sonda"
                  >
                    Conhecer a tecnologia
                  </Button>
                </Stack>
              </LightMode>
            </MotionBox>
          </Stack>

          <MotionBox
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            w="full"
            maxW={{ base: "full", lg: "480px" }}
          >
            <Box
              aria-label="Indicadores BR Sense"
              p={6}
              border="1px solid"
              borderColor="whiteAlpha.300"
              borderRadius="xl"
              bg="rgba(6, 19, 33, 0.7)"
              boxShadow="2xl"
              color="white"
            >
              <Text
                as="strong"
                display="block"
                mb={4}
                fontSize="lg"
                fontWeight="bold"
              >
                Visão completa da irrigação
              </Text>

              <SimpleGrid columns={2} spacing={3}>
                <Box
                  p={4}
                  borderRadius="lg"
                  bg="whiteAlpha.100"
                  minH="84px"
                  display="flex"
                  flexDirection="column"
                  justifyContent={{ base: "center", lg: "flex-start" }}
                >
                  <Text
                    as="b"
                    display="block"
                    color="white"
                    fontSize="2xl"
                    mb={1}
                    fontWeight="extrabold"
                  >
                    60 cm
                  </Text>
                  <Text color="whiteAlpha.700" fontSize="xs">
                    Sonda FDR
                  </Text>
                </Box>

                <Box
                  p={4}
                  borderRadius="lg"
                  bg="whiteAlpha.100"
                  minH="84px"
                  display="flex"
                  flexDirection="column"
                  justifyContent={{ base: "center", lg: "flex-start" }}
                >
                  <Text
                    as="b"
                    display="block"
                    color="white"
                    fontSize="2xl"
                    mb={1}
                    fontWeight="extrabold"
                  >
                    10 cm
                  </Text>
                  <Text color="whiteAlpha.700" fontSize="xs">
                    Leitura por camada
                  </Text>
                </Box>

                <Box
                  p={4}
                  borderRadius="lg"
                  bg="whiteAlpha.100"
                  minH="84px"
                  display="flex"
                  flexDirection="column"
                  justifyContent={{ base: "center", lg: "flex-start" }}
                >
                  <Text
                    as="b"
                    display="block"
                    color="white"
                    fontSize="2xl"
                    mb={1}
                    fontWeight="extrabold"
                  >
                    24/7
                  </Text>
                  <Text color="whiteAlpha.700" fontSize="xs">
                    Dados no campo
                  </Text>
                </Box>

                <Box
                  p={4}
                  borderRadius="lg"
                  bg="whiteAlpha.100"
                  minH="84px"
                  display="flex"
                  flexDirection="column"
                  justifyContent={{ base: "center", lg: "flex-start" }}
                >
                  <Text
                    as="b"
                    display="block"
                    color="white"
                    fontSize="2xl"
                    mb={1}
                    fontWeight="extrabold"
                  >
                    Satelital
                  </Text>
                  <Text color="whiteAlpha.700" fontSize="xs">
                    Comunicação
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>
          </MotionBox>
        </Stack>
      </Container>

      <Box
        position="absolute"
        bottom="5%"
        left="50%"
        transform="translateX(-50%)"
        zIndex={3}
        display={{ base: "none", md: "block" }}
      >
        <motion.div
          animate={{
            y: [0, 15, 0],
            opacity: [0.7, 1.5, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <FiChevronDown size={40} color="#FFFFFF" opacity={0.7} />
        </motion.div>
      </Box>
    </Box>
  );
}
