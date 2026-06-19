import {
  Box,
  Flex,
  HStack,
  Link,
  Image,
  IconButton,
  VStack,
  Button,
} from "@chakra-ui/react";
import { FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "../../assets/BRSense_logo.png";

const navItems = [
  { label: "Início", href: "#inicio" },
  { label: "Consultoria", href: "#consultoria" },
  { label: "Sonda", href: "#sonda" },
  { label: "Plataforma", href: "#plataforma" },
  { label: "Acompanhamento", href: "#acompanhamento" },
  { label: "Contato", href: "#contato" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

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
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
    >
      <Flex h={16} alignItems="center" justify="space-between" px={6}>
        <Link href="#inicio" onClick={closeMenu}>
          <Image src={Logo} alt="BR Sense" h={8} />
        </Link>

        <HStack spacing={8} display={{ base: "none", md: "flex" }}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              fontSize="sm"
              fontWeight="bold"
              color="#FFFFFF"
              _hover={{ color: "#3084c9", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ))}
          <Button
            as="a"
            href="#contato"
            size="sm"
            bg="#2ea764"
            color="white"
            _hover={{ bg: "#23824e" }}
            fontWeight="bold"
            borderRadius="md"
          >
            Solicitar diagnóstico
          </Button>
        </HStack>

        <Box display={{ base: "flex", md: "none" }}>
          <IconButton
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
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
              <Button
                as="a"
                href="#contato"
                w="full"
                bg="#2ea764"
                color="white"
                _hover={{ bg: "#23824e" }}
                onClick={closeMenu}
              >
                Solicitar diagnóstico
              </Button>
            </VStack>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
