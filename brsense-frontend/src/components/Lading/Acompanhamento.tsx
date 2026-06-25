import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Stack,
  Image,
  List,
  ListItem,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import EquipeCampoImg from "../../assets/equipe-campo.jpeg";
import { MdOutlineKeyboardArrowRight } from "react-icons/md";
import { COLORS } from "../../colors/colors";

const checklistItems = [
  "Interpretação dos gráficos",
  "Recomendação de manejo",
  "Ajuste de lâmina",
  "Análise da profundidade de irrigação",
  "Acompanhamento da atividade radicular",
  "Suporte para tomada de decisão",
  "Treinamento da equipe da fazenda",
  "Relatórios e orientações durante o ciclo",
];

export default function Acompanhamento() {
  return (
    <Box
      id="acompanhamento"
      py={{ base: 20, md: 32 }}
      bg="#050B18"
      borderTop="1px"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl">
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 12, lg: 16 }}
          align="center"
        >
          <Box flex={1} w="full">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Box
                bg="whiteAlpha.50"
                rounded="2xl"
                p={2}
                shadow="2xl"
                border="1px"
                borderColor="whiteAlpha.100"
              >
                <Image
                  src={EquipeCampoImg}
                  alt="Técnico BR Sense ao lado de equipamento instalado em lavoura"
                  rounded="xl"
                  w="full"
                  h="auto"
                  objectFit="contain"
                />
              </Box>
            </motion.div>
          </Box>

          <VStack flex={1} align="start" spacing={6}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Text
                color="#3084c9"
                fontWeight="bold"
                textTransform="uppercase"
                fontSize="sm"
                letterSpacing="wider"
                mb={2}
              >
                Acompanhamento técnico
              </Text>

              <Heading size="2xl" color="white" lineHeight="1.2" mb={4}>
                Não entregamos apenas sensores. Entregamos decisão.
              </Heading>

              <Text
                fontSize="xl"
                color="whiteAlpha.700"
                lineHeight="tall"
                mb={6}
              >
                A BR Sense acompanha o produtor durante a safra, interpreta os
                gráficos, ajusta a lâmina e transforma dados do solo em
                orientação prática para o campo.
              </Text>

              <Box
                p={5}
                borderLeft="6px solid"
                borderColor="#2e7fa7"
                bg="rgba(54, 153, 228, 0.356)"
                rounded="xl"
                mb={6}
              >
                <Text
                  color="white"
                  fontWeight="extrabold"
                  fontSize="md"
                  lineHeight="1.5"
                >
                  Tecnologia sem interpretação vira apenas número. A BR Sense
                  transforma dados do solo em decisão prática para o campo.
                </Text>
              </Box>

              <List
                display="grid"
                gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                w="full"
              >
                {checklistItems.map((item, idx) => (
                  <ListItem
                    key={idx}
                    display="flex"
                    alignItems="flex-start"
                    color="whiteAlpha.900"
                    fontWeight="medium"
                    fontSize="md"
                  >
                    <Box
                      mr="4px"
                      bg={COLORS.primary}
                      p="2px"
                      borderRadius="full"
                    >
                      <MdOutlineKeyboardArrowRight
                        color={COLORS.textPrimary}
                        size={20}
                      />
                    </Box>
                    <Text lineHeight="1.4">{item}</Text>
                  </ListItem>
                ))}
              </List>
            </motion.div>
          </VStack>
        </Stack>
      </Container>
    </Box>
  );
}
