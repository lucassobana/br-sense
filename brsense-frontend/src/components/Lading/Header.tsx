import {
  Box,
  Flex,
  HStack,
  Link,
  Image,
  IconButton,
  VStack,
} from "@chakra-ui/react";
import { FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import Logo from "../../assets/BRSense_logo.png";

const navItems = [
  { label: "Início", href: "#inicio" },
  { label: "Instalação", href: "#instalacao" },
  { label: "Impacto", href: "#impacto" },
  { label: "Serviços", href: "#servicos" },
  { label: "Tecnologia", href: "#tecnologia" },
  { label: "Fale conosco", href: "#contato" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  const { scrollYProgress } = useScroll();

  return (
    <Box
      position="fixed"
      m={4}
      top={0}
      left={0}
      right={0}
      zIndex={100}
      bg="rgba(5, 11, 24, 0.95)"
      backdropFilter="blur(8px)"
      borderBottom={isOpen ? "none" : "1px"}
      borderColor="whiteAlpha.100"
      borderRadius={30}
      boxShadow="lg"
      transition="border-radius 0.3s ease" // Suaviza caso adicione mais alterações
    >
      <motion.div
        style={{
          scaleX: scrollYProgress,
          transformOrigin: "0%",
          position: "absolute",
          bottom: "-2px", // Fica colada na base do Header
          left: 0,
          right: 0,
          height: "2px",
          background: "#3084c9", // Cor primária (brand.500)
          zIndex: 101,
        }}
      />
      <Flex
        minH={{ base: "70px", md: "110px" }}
        px={{ base: 6, md: 8 }}
        py={{ base: 3, md: 0 }}
        align="center"
        justify="space-between"
      >
        {/* LADO ESQUERDO: Logo */}
        <Box minW={{ md: "160px" }} display="flex" justifyContent="flex-start">
          <Link
            href="#inicio"
            _hover={{ textDecoration: "none" }}
            onClick={closeMenu}
          >
            <Image
              src={Logo}
              alt="BR Sense"
              maxH={{ base: "38px", md: "60px" }}
              objectFit="contain"
            />
          </Link>
        </Box>

        {/* CENTRO: Menu Desktop */}
        <HStack
          display={{ base: "none", md: "flex" }} // Esconde no mobile
          spacing={10}
          justify="center"
        >
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              fontSize="sm"
              fontWeight="medium"
              color="#FFFFFF"
              _hover={{ color: "#FFFFFF", textDecoration: "none" }}
              transition="color 0.2s"
            >
              {item.label}
            </Link>
          ))}
        </HStack>

        {/* LADO DIREITO: Botão Hamburguer (Mobile) ou Espaçador (Desktop) */}
        <Box
          minW={{ base: "auto", md: "160px" }}
          display="flex"
          justifyContent="flex-end"
        >
          <IconButton
            display={{ base: "flex", md: "none" }}
            onClick={toggleMenu}
            icon={isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            variant="ghost"
            color="white"
            aria-label="Abrir menu"
            _hover={{ bg: "whiteAlpha.200" }}
            rounded="full"
          />
        </Box>
      </Flex>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <VStack
              display={{ base: "flex", md: "none" }}
              spacing={5}
              pb={8}
              pt={2}
              borderTop="1px"
              borderColor="whiteAlpha.100"
              mx={6}
            >
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  fontSize="md"
                  fontWeight="medium"
                  color="#FFFFFF"
                  _hover={{ color: "#3084c9", textDecoration: "none" }}
                  onClick={closeMenu} // Fecha o menu ao clicar
                >
                  {item.label}
                </Link>
              ))}
            </VStack>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
