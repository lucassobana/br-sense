import { useState } from "react";
import { Box, Flex, IconButton, Image, Link } from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";
import { useLocation } from "react-router-dom";
import brsenseLogo from '../../assets/BRSense_logo.png';

export function Header() {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen((prev) => !prev);
    const handleLinkClick = () => setMenuOpen(false);

    const activeColor = "#003d7a";
    const inactiveColor = "white";

    return (
        <Box as="header" bg="gray.800" color="white" w="100vw" px={6} py={2} boxShadow="md" position="relative">
            <Flex align="center" justify="space-between">
                {/* Logo */}
                <Image src={brsenseLogo} alt="BR Sense Logo" h="60px" />

                {/* Botões centralizados - desktop */}
                <Flex
                    position="absolute"
                    left="50%"
                    transform="translateX(-50%)"
                    display={{ base: "none", md: "flex" }}
                    gap={8}
                >
                    <Link href="/" onClick={handleLinkClick} color={location.pathname === "/" ? activeColor : inactiveColor}>
                        Gráficos
                    </Link>
                    <Link href="/about" onClick={handleLinkClick} color={location.pathname === "/about" ? activeColor : inactiveColor}>
                        Fazendas
                    </Link>
                    <Link href="/contact" onClick={handleLinkClick} color={location.pathname === "/contact" ? activeColor : inactiveColor}>
                        Sondas
                    </Link>
                </Flex>

                {/* Botão do menu mobile */}
                <IconButton
                    aria-label="Toggle Menu"
                    icon={menuOpen ? <CloseIcon /> : <HamburgerIcon />}
                    display={{ base: "block", md: "none" }}
                    onClick={toggleMenu}
                    variant="outline"
                    colorScheme="whiteAlpha"
                />
            </Flex>

            {/* Menu mobile - vertical à esquerda */}
            {menuOpen && (
                <Flex
                    direction="column"
                    mt={4}
                    align="flex-start"
                    display={{ base: "flex", md: "none" }}
                    gap={4}
                >
                    <Link href="/" onClick={handleLinkClick} color={location.pathname === "/" ? activeColor : inactiveColor}>
                        Gráficos
                    </Link>
                    <Link href="/about" onClick={handleLinkClick} color={location.pathname === "/about" ? activeColor : inactiveColor}>
                        Fazendas
                    </Link>
                    <Link href="/contact" onClick={handleLinkClick} color={location.pathname === "/contact" ? activeColor : inactiveColor}>
                        Sondas
                    </Link>
                </Flex>
            )}
        </Box>
    );
}
