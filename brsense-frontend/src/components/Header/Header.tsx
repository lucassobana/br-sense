// brsense-frontend/src/components/Header/Header.tsx
import {
    Flex,
    Text,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    HStack,
    Avatar,
    Box,
    Image
} from '@chakra-ui/react';
import { MdLogout, MdPerson } from 'react-icons/md';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import brsenseLogo from '../../assets/BRSense_logo.png';

export function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    // Tenta pegar o nome do usuário salvo
    const userName = localStorage.getItem('user_name') || 'Usuário';

    const handleLogout = () => {
        // Limpa a sessão manual
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_role');

        navigate('/login');
    };

    // Configuração de Cores dos Botões
    const activeColor = "#003d7a";
    const inactiveColor = "white";

    // Função auxiliar para estilo dos botões
    const getButtonStyle = (path: string) => {
        const isActive = location.pathname === path;
        return {
            bg: isActive ? activeColor : 'transparent',
            color: inactiveColor,
            variant: isActive ? 'solid' : 'ghost',
            _hover: {
                bg: isActive ? activeColor : 'rgba(255, 255, 255, 0.1)',
                opacity: isActive ? 0.9 : 1
            }
        };
    };

    return (
        <Flex
            as="header"
            w="100%"
            h="80px"
            bg="#111111"
            align="center"
            justify="space-between"
            px={8}
            borderBottom="1px solid"
            borderColor="#2D2D2D"
        >
            {/* Lado Esquerdo: Logo e Título */}
            <HStack spacing={4}>
                <Box w="50px" h="50px" bg="#2D2D2D" borderRadius="lg" display="flex" alignItems="center" justifyContent="center">
                    <Image src={brsenseLogo} alt="Logo" w="35px" h="35px" objectFit="contain" />
                </Box>
                <Box>
                    <Text color="white" fontWeight="bold" fontSize="lg" lineHeight="1.2">
                        BR Sense
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                        Soil Intelligence
                    </Text>
                </Box>
            </HStack>

            {/* --- CENTRO: Botões de Navegação (Reintegrados) --- */}
            <HStack
                as="nav"
                spacing={4}
                display={{ base: 'none', md: 'flex' }}
                position="absolute"
                left="50%"
                transform="translateX(-50%)"
            >
                <Button as={RouterLink} to="/" {...getButtonStyle('/')}>
                    Mapa
                </Button>
                <Button as={RouterLink} to="/farms" {...getButtonStyle('/farms')}>
                    Fazendas
                </Button>
                <Button as={RouterLink} to="/probes" {...getButtonStyle('/probes')}>
                    Sondas
                </Button>
            </HStack>

            {/* Lado Direito: Menu do Usuário */}
            <Menu>
                <MenuButton
                    as={Button}
                    rightIcon={<MdPerson size={20} />}
                    variant="ghost"
                    color="gray.300"
                    _hover={{ bg: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                    _active={{ bg: 'rgba(255, 255, 255, 0.2)' }}
                >
                    <HStack spacing={3}>
                        <Text fontWeight="medium" display={{ base: 'none', md: 'block' }}>
                            {userName}
                        </Text>
                        <Avatar size="sm" name={userName} bg="blue.600" color="white" />
                    </HStack>
                </MenuButton>

                {/* Adicionado zIndex e boxShadow para o menu não bugar */}
                <MenuList
                    bg="#1C1C1C"
                    borderColor="#2D2D2D"
                    zIndex={1001}
                    boxShadow="dark-lg"
                >
                    <MenuItem
                        icon={<MdLogout size={18} />}
                        onClick={handleLogout}
                        bg="transparent"
                        color="red.300"
                        _hover={{ bg: 'rgba(255, 0, 0, 0.1)' }}
                        _focus={{ bg: 'rgba(255, 0, 0, 0.1)' }} // Fix para manter escuro no foco
                    >
                        Sair do Sistema
                    </MenuItem>
                </MenuList>
            </Menu>
        </Flex>
    );
}