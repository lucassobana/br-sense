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
import { useNavigate } from 'react-router-dom';
import brsenseLogo from '../../assets/BRSense_logo.png'; // Verifique se o caminho do logo está correto

export function Header() {
  const navigate = useNavigate();
  
  // Tenta pegar o nome do usuário salvo (se houver)
  const name = localStorage.getItem('name') || 'Usuário';

  const handleLogout = () => {
    // Limpa os dados de autenticação
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    
    // Redireciona para o login
    navigate('/login');
  };

  return (
    <Flex
      as="header"
      w="100%"
      h="80px"
      bg="#111111" // Cor escura do card/tema
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