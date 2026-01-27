// brsense-frontend/src/components/Sidebar/Sidebar.tsx
import {
    Box,
    Flex,
    Text,
    VStack,
    Icon,
    HStack,
    Image,
    Tooltip,
    Divider,
    Avatar,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    IconButton,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerBody,
    useDisclosure
} from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import {
    MdMap,
    MdAgriculture,
    MdSensors,
    MdLogout,
    MdPerson,
    MdMenu,
    MdClose
} from 'react-icons/md';
import brsenseLogo from '../../assets/BRSense_logo.png';
import { COLORS } from '../../colors/colors';

// --- SUB-COMPONENTE: Conteúdo Interno do Menu ---
const SidebarContent = ({
    isExpanded,
    onItemClick
}: {
    isExpanded: boolean;
    onItemClick?: () => void
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const userName = localStorage.getItem('user_name') || 'Usuário';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
        if (onItemClick) onItemClick();
    };

    const navItems = [
        { label: 'Mapa', icon: MdMap, path: '/' },
        { label: 'Fazendas', icon: MdAgriculture, path: '/farms' },
        { label: 'Sondas', icon: MdSensors, path: '/probes' },
    ];

    return (
        <Flex direction="column" h="100%" justify="space-between">
            <Box>
                {/* Logo e Título (Desktop) */}
                <Flex h="80px" align="center" px={4} overflow="hidden">
                    <HStack spacing={4} minW="200px">
                        <Box
                            w="50px"
                            h="50px"
                            bg="white"
                            borderRadius="lg"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexShrink={0}
                        >
                            <Image src={brsenseLogo} alt="Logo" w="40px" h="40px" objectFit="contain" />
                        </Box>
                        <Box opacity={isExpanded ? 1 : 0} transition="opacity 0.2s">
                            <Text color="white" fontWeight="bold" fontSize="lg" lineHeight="1.2" whiteSpace="nowrap">
                                BR Sense
                            </Text>
                            <Text color="gray.400" fontSize="xs" whiteSpace="nowrap">
                                Tecnologia Agrícola
                            </Text>
                        </Box>
                    </HStack>
                </Flex>

                <Divider borderColor="#2D2D2D" />

                <VStack mt={4} spacing={2} px={2} align="stretch">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Tooltip key={item.path} label={item.label} isDisabled={isExpanded} placement="right">
                                <Box
                                    as={RouterLink}
                                    to={item.path}
                                    onClick={onItemClick}
                                    px={4}
                                    py={3}
                                    borderRadius="lg"
                                    bg={isActive ? "#003d7a" : "transparent"}
                                    color={isActive ? "white" : "gray.400"}
                                    _hover={{
                                        bg: isActive ? "#003d7a" : "whiteAlpha.100",
                                        color: "white"
                                    }}
                                >
                                    <HStack spacing={4}>
                                        <Icon as={item.icon} boxSize={6} flexShrink={0} />
                                        <Text
                                            fontWeight="medium"
                                            opacity={isExpanded ? 1 : 0}
                                            transition="opacity 0.2s"
                                            whiteSpace="nowrap"
                                        >
                                            {item.label}
                                        </Text>
                                    </HStack>
                                </Box>
                            </Tooltip>
                        );
                    })}
                </VStack>
            </Box>

            <Box p={2}>
                <Divider borderColor="#2D2D2D" mb={2} />
                <Menu placement="right-end">
                    <MenuButton
                        as={Box}
                        w="100%"
                        p={2}
                        borderRadius="lg"
                        cursor="pointer"
                        _hover={{ bg: "whiteAlpha.100" }}
                    >
                        <HStack spacing={3}>
                            <Avatar size="sm" name={userName} bg="blue.600" flexShrink={0} />
                            <Box opacity={isExpanded ? 1 : 0} transition="opacity 0.2s" overflow="hidden">
                                <Text color="white" fontSize="sm" fontWeight="bold" noOfLines={1} whiteSpace="nowrap">
                                    {userName}
                                </Text>
                            </Box>
                        </HStack>
                    </MenuButton>
                    <MenuList bg="#1C1C1C" borderColor="#2D2D2D" boxShadow="dark-lg" zIndex={1001}>
                        <MenuItem
                            icon={<MdPerson size={18} />}
                            bg="transparent"
                            color="white"
                            _hover={{ bg: "whiteAlpha.200" }}
                        >
                            Meu Perfil
                        </MenuItem>
                        <MenuItem
                            icon={<MdLogout size={18} />}
                            onClick={handleLogout}
                            bg="transparent"
                            color="red.300"
                            _hover={{ bg: "rgba(255, 0, 0, 0.1)" }}
                        >
                            Sair do Sistema
                        </MenuItem>
                    </MenuList>
                </Menu>
            </Box>
        </Flex>
    );
};

// --- COMPONENTE PRINCIPAL ---
export function Sidebar() {
    const [isHovered, setIsHovered] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Altura da barra mobile para manter consistência
    const MOBILE_HEADER_HEIGHT = "64px";

    return (
        <>
            {/* 1. HEADER MOBILE (Barra superior fixa) */}
            <Flex
                as="header"
                display={{ base: "flex", md: "none" }} // Visível apenas no Mobile
                align="center"
                justify="space-between"
                w="100%"
                h={MOBILE_HEADER_HEIGHT}
                px={4}
                bg={COLORS.surface} // Mesma cor do sidebar
                borderBottom="1px solid"
                borderColor="#2D2D2D"
                position="fixed"
                top="0"
                left="0"
                zIndex={1000}
                boxShadow="md"
            >
                {/* Lado Esquerdo: Menu + Logo */}
                <HStack spacing={3}>
                    <IconButton
                        aria-label="Abrir menu"
                        icon={<MdMenu size={24} />}
                        onClick={onOpen}
                        variant="ghost"
                        color="white"
                        _hover={{ bg: "whiteAlpha.200" }}
                    />

                    {/* Logo Mobile */}
                    <HStack spacing={2}>
                        <Box w="32px" h="32px" bg="white" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                            <Image src={brsenseLogo} alt="BR Sense" w="24px" h="24px" objectFit="contain" />
                        </Box>
                        <Text color="white" fontWeight="bold" fontSize="md">
                            BR Sense
                        </Text>
                    </HStack>
                </HStack>

                {/* Lado Direito: (Opcional - Ex: Avatar ou Notificações) */}
                {/* Você pode colocar um Avatar aqui se quiser que ele fique visível sem abrir o menu */}
            </Flex>

            {/* 2. SIDEBAR DESKTOP (Inalterado) */}
            <Box
                as="nav"
                display={{ base: "none", md: "flex" }}
                pos="fixed"
                left="0"
                h="100vh"
                w={isHovered ? "240px" : "80px"}
                bg={COLORS.surface}
                borderRight="1px solid"
                borderColor="#2D2D2D"
                transition="width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                flexDirection="column"
                zIndex={1000}
                boxShadow="xl"
            >
                <SidebarContent isExpanded={isHovered} />
            </Box>

            {/* 3. DRAWER MOBILE */}
            <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
                <DrawerOverlay />
                <DrawerContent bg={COLORS.surface} borderRight="1px solid" borderColor="#2D2D2D">
                    <DrawerBody p={0}>
                        <Flex justify="flex-end" p={2}>
                            <IconButton
                                aria-label="Fechar menu"
                                icon={<MdClose />}
                                onClick={onClose}
                                variant="ghost"
                                color="white"
                            />
                        </Flex>
                        <SidebarContent isExpanded={true} onItemClick={onClose} />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    );
}