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

    // Pega o nome do usuário salvo
    const name = localStorage.getItem('name') || 'Usuário';

    // Variáveis de estilo solicitadas
    const activeColor = "#003d7a";
    const inactiveColor = "white";

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    // Função auxiliar para gerar o estilo do botão
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
            position="relative" // Necessário para o posicionamento absoluto funcionar
        >
            {/* Lado Esquerdo: Logo e Título */}
            <HStack spacing={4}>
                <Box w="70px" h="70px" bg="#2D2D2D" borderRadius="lg" display="flex" alignItems="center" justifyContent="center">
                    <Image src={brsenseLogo} alt="Logo" w="50px" h="50px" objectFit="contain" />
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

            {/* Centro: Botões de Navegação Centralizados */}
            <HStack
                as="nav"
                spacing={4}
                display={{ base: 'none', md: 'flex' }}
                position="absolute"
                left="50%"
                transform="translateX(-50%)"
            >
                <Button
                    as={RouterLink}
                    to="/"
                    {...getButtonStyle('/')}
                >
                    Gráficos
                </Button>
                <Button
                    as={RouterLink}
                    to="/farms"
                    {...getButtonStyle('/farms')}
                >
                    Fazendas
                </Button>
                <Button
                    as={RouterLink}
                    to="/probes"
                    {...getButtonStyle('/probes')}
                >
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
                            {name}
                        </Text>
                        <Avatar size="sm" name={name} bg="blue.600" color="white" />
                    </HStack>
                </MenuButton>

                <MenuList bg="#1C1C1C" borderColor="#2D2D2D">
                    <MenuItem
                        icon={<MdLogout size={18} />}
                        onClick={handleLogout}
                        bg="transparent"
                        color="red.300"
                        _hover={{ bg: 'rgba(255, 0, 0, 0.1)' }}
                    >
                        Sair do Sistema
                    </MenuItem>
                </MenuList>
            </Menu>
        </Flex>
    );
}