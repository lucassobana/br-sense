import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Stack,
  Input,
  Select,
  Button,
  SimpleGrid,
  FormControl,
  FormLabel,
  Flex,
} from "@chakra-ui/react";
import { motion } from "framer-motion";

// Marcador verde para o card "O que você recebe"
const CustomCheckIcon = () => (
  <Box
    as="span"
    display="inline-block"
    minW="8px"
    w="8px"
    h="8px"
    borderRadius="50%"
    bg="#2ea764"
    boxShadow="0 0 0 4px rgba(46, 167, 100, 0.15)"
    mr={3}
    mt={1.5}
  />
);

export default function CTASection() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get("nome"),
      fazenda: formData.get("fazenda"),
      cidade: formData.get("cidade"),
      area: formData.get("area"),
      cultura: formData.get("cultura"),
      telefone: formData.get("telefone"),
      interesse: formData.get("interesse"),
    };

    const message = [
      "Olá, BR Sense. Quero falar sobre irrigação.",
      "",
      `Nome: ${data.nome}`,
      `Fazenda: ${data.fazenda}`,
      `Cidade/Estado: ${data.cidade}`,
      `Área irrigada: ${data.area}`,
      `Cultura: ${data.cultura}`,
      `Telefone/WhatsApp: ${data.telefone}`,
      `Interesse principal: ${data.interesse}`,
    ].join("\n");

    // Lembre-se de alterar este número para o WhatsApp real da BR Sense
    const WHATSAPP_NUMBER = "5500000000000";
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Box
      id="contato"
      py={{ base: 20, md: 32 }}
      bg="#050B18" // Mantendo o fundo escuro do projeto
      borderTop="1px"
      borderColor="whiteAlpha.100"
      position="relative"
      overflow="hidden"
    >
      <Container maxW="container.xl" position="relative" zIndex={2}>
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 12, lg: 16 }}
          align="flex-start"
        >
          {/* Lado Esquerdo: Textos e Contact Card */}
          <VStack flex={1} align="start" spacing={6} w="full">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ width: "100%" }}
            >
              <Text
                color="#3084c9"
                fontWeight="bold"
                textTransform="uppercase"
                fontSize="sm"
                letterSpacing="wider"
                mb={2}
              >
                Contato
              </Text>

              <Heading size="2xl" lineHeight="1.2" color="white" mb={4}>
                Pare de irrigar no escuro.
              </Heading>

              <Text
                fontSize="xl"
                color="whiteAlpha.700"
                lineHeight="tall"
                mb={8}
              >
                Envie os dados da fazenda e fale com a BR Sense pelo WhatsApp
                para avaliar projeto de pivô, sonda, acompanhamento técnico ou
                diagnóstico da irrigação.
              </Text>

              {/* Contact Card (.contact-card) */}
              <Box
                bg="#0A1226"
                p={8}
                rounded="2xl"
                border="1px"
                borderColor="whiteAlpha.100"
                shadow="xl"
                w="full"
              >
                <Text color="white" fontWeight="bold" fontSize="lg" mb={5}>
                  O que você recebe na conversa
                </Text>
                <VStack align="start" spacing={4}>
                  <Flex align="flex-start">
                    <CustomCheckIcon />
                    <Text
                      color="whiteAlpha.900"
                      fontWeight="medium"
                      lineHeight="1.3"
                    >
                      Entendimento técnico da área
                    </Text>
                  </Flex>
                  <Flex align="flex-start">
                    <CustomCheckIcon />
                    <Text
                      color="whiteAlpha.900"
                      fontWeight="medium"
                      lineHeight="1.3"
                    >
                      Próximo passo para diagnóstico
                    </Text>
                  </Flex>
                  <Flex align="flex-start">
                    <CustomCheckIcon />
                    <Text
                      color="whiteAlpha.900"
                      fontWeight="medium"
                      lineHeight="1.3"
                    >
                      Direcionamento para projeto, sonda ou manejo
                    </Text>
                  </Flex>
                </VStack>
              </Box>
            </motion.div>
          </VStack>

          {/* Lado Direito: Formulário (.lead-form) */}
          <Box flex={1.2} w="full">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Box
                bg="#071321"
                p={{ base: 6, md: 10 }}
                rounded="3xl"
                border="1px"
                borderColor="whiteAlpha.200"
                shadow="2xl"
              >
                <form id="leadForm" onSubmit={handleSubmit}>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={6}>
                    <FormControl isRequired>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Nome
                      </FormLabel>
                      <Input
                        name="nome"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        h="50px"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Fazenda
                      </FormLabel>
                      <Input
                        name="fazenda"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        h="50px"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Cidade/Estado
                      </FormLabel>
                      <Input
                        name="cidade"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        h="50px"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Área irrigada
                      </FormLabel>
                      <Input
                        name="area"
                        placeholder="Ex.: 120 ha"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        _placeholder={{ color: "whiteAlpha.400" }}
                        h="50px"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Cultura
                      </FormLabel>
                      <Input
                        name="cultura"
                        placeholder="Ex.: batata, soja, milho"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        _placeholder={{ color: "whiteAlpha.400" }}
                        h="50px"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Telefone/WhatsApp
                      </FormLabel>
                      <Input
                        name="telefone"
                        type="tel"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        h="50px"
                      />
                    </FormControl>

                    {/* Select Full Width */}
                    <FormControl isRequired gridColumn={{ sm: "span 2" }}>
                      <FormLabel color="whiteAlpha.800" fontSize="sm">
                        Interesse principal
                      </FormLabel>
                      <Select
                        name="interesse"
                        bg="#050B18"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        color="white"
                        _focus={{ borderColor: "brand.500", bg: "#0A1226" }}
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        h="50px"
                      >
                        <option value="" style={{ color: "black" }}>
                          Selecione
                        </option>
                        <option
                          value="Projeto de pivo central"
                          style={{ color: "black" }}
                        >
                          Projeto de pivô central
                        </option>
                        <option
                          value="Sonda BR Sense"
                          style={{ color: "black" }}
                        >
                          Sonda BR Sense
                        </option>
                        <option
                          value="Acompanhamento tecnico"
                          style={{ color: "black" }}
                        >
                          Acompanhamento técnico
                        </option>
                        <option
                          value="Diagnostico da irrigacao"
                          style={{ color: "black" }}
                        >
                          Diagnóstico da irrigação
                        </option>
                        <option value="Outro" style={{ color: "black" }}>
                          Outro
                        </option>
                      </Select>
                    </FormControl>

                    <Button
                      type="submit"
                      gridColumn={{ sm: "span 2" }}
                      size="lg"
                      h="60px"
                      bg="#2ea764"
                      color="white"
                      fontSize="md"
                      fontWeight="bold"
                      _hover={{ bg: "#23824e", transform: "translateY(-2px)" }}
                      boxShadow="0 8px 20px rgba(46, 167, 100, 0.2)"
                      mt={4}
                    >
                      Enviar pelo WhatsApp
                    </Button>
                  </SimpleGrid>
                </form>
              </Box>
            </motion.div>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
