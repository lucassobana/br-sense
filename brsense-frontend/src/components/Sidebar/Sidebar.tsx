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
import { useState, useMemo } from 'react';
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

// 1. Importe todas as logos necessárias
import brsenseLogo from '../../assets/BRSense_logo.png';
import copasulLogo from '../../assets/copasul_logo.jpeg';
import { COLORS } from '../../colors/colors';
import { parseJwt } from '../../services/auth'; // Importe sua função existente de decodificar token

interface SidebarProps {
    organization?: boolean;
}

// 2. Crie um Dicionário de Organizações para facilitar a escala
// A chave deve ser EXATAMENTE o nome da "role" lá no Keycloak
const ORG_CONFIG: Record<string, { name: string; subtitle: string; logo: string }> = {
    'copasul': {
        name: 'Copasul',
        subtitle: 'Cooperativa Agricola Sul Matogrossense',
        logo: copasulLogo
    },
    // Você pode adicionar infinitos revendedores aqui no futuro
    // 'revendedor_x': { name: 'Revendedor X', subtitle: 'Parceiro BR Sense', logo: logoX },

    // Configuração Padrão (Fallback)
    'default': {
        name: 'BR Sense',
        subtitle: 'Tecnologia Agrícola',
        logo: brsenseLogo
    }
};

// Função para descobrir qual organização o usuário pertence baseado no Token
const getUserOrganization = () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return ORG_CONFIG.default;

        const payload = parseJwt(token);
        const roles: string[] = payload?.realm_access?.roles || [];

        // Verifica se o usuário tem alguma role que corresponde às chaves do nosso Dicionário
        // Ignora o 'default' na busca
        const userOrgRole = Object.keys(ORG_CONFIG).find(
            orgRole => orgRole !== 'default' && roles.includes(orgRole)
        );

        if (userOrgRole) {
            return ORG_CONFIG[userOrgRole];
        }

        return ORG_CONFIG.default;
    } catch (error) {
        console.error("Erro ao ler organização do token:", error);
        return ORG_CONFIG.default;
    }
};

// --- SUB-COMPONENTE: Conteúdo Interno do Menu ---
const SidebarContent = ({
    isExpanded,
    onItemClick,
    organization = true // Mudado para true por padrão para exibir a logo
}: SidebarProps & {
    isExpanded: boolean;
    onItemClick?: () => void
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const userName = localStorage.getItem('user_name') || 'Usuário';

    // 3. Usa o useMemo para calcular a organização apenas 1x ao montar o componente
    const currentOrg = useMemo(() => getUserOrganization(), []);

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
                {/* Logo e Título (Desktop/Drawer) */}
                <Flex h="80px" align="center" px={4} overflow="hidden">
                    <HStack spacing={4} minW="200px">
                        <Box
                            w="55px"
                            h="55px"
                            bg="white"
                            borderRadius="lg"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexShrink={0}
                        >
                            {organization && (
                                // 4. Usa a logo dinâmica aqui
                                <Image src={currentOrg.logo} alt={`Logo ${currentOrg.name}`} w="50px" h="50px" objectFit="contain" />
                            )}
                        </Box>
                        <Box opacity={isExpanded ? 1 : 0} transition="opacity 0.2s">
                            <Text color="white" fontWeight="bold" fontSize="lg" lineHeight="1.2" noOfLines={1}>
                                {currentOrg.name}
                            </Text>
                            <Text color="gray.400" fontSize="xs" lineHeight="1.2" noOfLines={2} mt={0.5}>
                                {currentOrg.subtitle}
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
export function Sidebar({ organization = true }) {
    const [isHovered, setIsHovered] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Obtém a config da org também para o header mobile
    const currentOrg = useMemo(() => getUserOrganization(), []);

    const MOBILE_HEADER_HEIGHT = "64px";

    return (
        <>
            {/* 1. HEADER MOBILE (Barra superior fixa) */}
            <Flex
                as="header"
                display={{ base: "flex", md: "none" }}
                align="center"
                justify="space-between"
                w="100%"
                h={MOBILE_HEADER_HEIGHT}
                px={4}
                bg={COLORS.surface}
                borderBottom="1px solid"
                borderColor="#2D2D2D"
                position="fixed"
                top="0"
                left="0"
                zIndex={1000}
                boxShadow="md"
            >
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
                            {organization && (
                                <Image src={currentOrg.logo} alt={currentOrg.name} w="24px" h="24px" objectFit="contain" />
                            )}
                        </Box>
                        <Text color="white" fontWeight="bold" fontSize="md">
                            {currentOrg.name}
                        </Text>
                    </HStack>
                </HStack>
            </Flex>

            {/* 2. SIDEBAR DESKTOP */}
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
                <SidebarContent isExpanded={isHovered} organization={organization} />
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
                        <SidebarContent isExpanded={true} onItemClick={onClose} organization={organization} />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    );
}