// brsense-frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Flex,
    Text,
    Input,
    Button,
    FormControl,
    FormLabel,
    InputGroup,
    InputRightElement,
    Icon,
    VStack,
    Container,
    useToast,
    Image
} from '@chakra-ui/react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { loginKeycloak, parseJwt } from '../services/auth'; // Certifique-se de ter criado este arquivo
import brsenseLogo from '../assets/BRSense_logo.png';
import { COLORS } from '../colors/colors';

export function Login() {
    const navigate = useNavigate();
    const toast = useToast();

    // Estados do Formulário
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleTogglePassword = () => setShowPassword(!showPassword);

    const handleLogin = async () => {
        if (!email || !password) {
            toast({ title: 'Preencha todos os campos', status: 'warning', position: 'top' });
            return;
        }

        try {
            setIsLoading(true);

            // 1. Autentica diretamente no Keycloak via ROPC (Direct Grant)
            const data = await loginKeycloak(email, password);

            // 2. Salva os tokens no LocalStorage
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);

            // 3. Extrai dados do usuário do token para exibir na UI ou usar depois
            const userPayload = parseJwt(data.access_token);
            if (userPayload) {
                // Tenta pegar o nome de vários campos possíveis do Keycloak
                const nameToSave = userPayload.name || userPayload.given_name || userPayload.preferred_username || email;
                localStorage.setItem('user_name', nameToSave); // Chave usada no Header

                // Salvar roles se necessário
                // const roles = userPayload.realm_access?.roles || [];
                // localStorage.setItem('user_role', roles.includes('admin') ? 'Administrador' : 'Fazendeiro');
            } else {
                // Fallback caso o payload falhe
                localStorage.setItem('user_name', email);
            }

            toast({
                title: 'Login realizado com sucesso!',
                status: 'success',
                position: 'top',
                duration: 2000
            });

            // 4. Redireciona para o Dashboard
            navigate('/');

        } catch (error: unknown) {
            console.error(error);

            let msg = 'Erro ao conectar com o servidor';

            if (error instanceof Error) {
                msg = error.message;
            }

            toast({
                title: 'Erro no Login',
                description: msg,
                status: 'error',
                position: 'top'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Estilização ---
    const colors = {
        backgroundDark: '#0A0A0A',
        primary: '#003d7a',
        inputBorder: '#2D2D2D',
        textMain: '#F5F5F5',
        textPlaceholder: '#9aabbc',
        iconBg: '#2D2D2D',
        cardBg: '#111111'
    };

    const inputStyle = {
        height: "56px",
        bg: colors.backgroundDark,
        borderColor: colors.inputBorder,
        color: colors.textMain,
        borderRadius: "lg",
        fontSize: "16px",
        _placeholder: { color: colors.textPlaceholder },
        _hover: { borderColor: colors.primary },
        _focus: {
            borderColor: colors.primary,
            boxShadow: `0 0 0 1px ${colors.primary}`,
        }
    };

    return (
        <Flex
            minH="100vh"
            w="100%"
            bgGradient={{
                base: "radial(circle at 50% 35%, #0A2540 0%, #0A0A0A 70%)", // mobile
                md: "radial(circle at center, #0A2540 0%, #0A0A0A 60%)"    // desktop
            }}
            justify="center"
            align="center"
            fontFamily="'Inter', sans-serif"
        >
            <Container maxW="container.sm" p={4}>
                <Box
                    bg={COLORS.background}
                    p={8}
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor={colors.inputBorder}
                    boxShadow="xl"
                    w="100%"
                >
                    <Flex direction="column" justify="center" align="center" w="100%">

                        {/* Logo */}
                        <Flex
                            justify="center"
                            align="center"
                            bg="white"
                            w="200px"
                            h="200px"
                            borderRadius="2xl"
                            mb={6}
                            boxShadow="md"
                        >
                            <Image src={brsenseLogo} alt="BR Sense Logo" w="190px" h="190px" objectFit="contain" />
                        </Flex>

                        <VStack spacing={5} w="100%">
                            {/* Input de Login */}
                            <FormControl>
                                <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                    Login
                                </FormLabel>
                                <Input
                                    type="text" // Pode ser 'email' se seu Keycloak exigir email
                                    placeholder="Entre com seu usuário ou email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    {...inputStyle}
                                />
                            </FormControl>

                            {/* Input de Senha */}
                            <FormControl>
                                <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                    Senha
                                </FormLabel>
                                <InputGroup size="lg">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Entre com sua senha"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        {...inputStyle}
                                    />
                                    <InputRightElement height="56px" width="3.5rem">
                                        <Box
                                            as="button"
                                            onClick={handleTogglePassword}
                                            color={colors.textPlaceholder}
                                            _hover={{ color: colors.textMain }}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            <Icon as={showPassword ? MdVisibilityOff : MdVisibility} boxSize={6} />
                                        </Box>
                                    </InputRightElement>
                                </InputGroup>
                            </FormControl>

                            {/* Botão de Login */}
                            <Box w="100%" pt={4}>
                                <Button
                                    w="100%"
                                    height="48px"
                                    bg={colors.primary}
                                    color="white"
                                    fontSize="16px"
                                    fontWeight="bold"
                                    borderRadius="lg"
                                    _hover={{ bg: '#002a52' }}
                                    _active={{ bg: '#001a33' }}
                                    onClick={handleLogin}
                                    isLoading={isLoading}
                                    loadingText="Entrando..."
                                >
                                    Login
                                </Button>
                            </Box>
                        </VStack>
                    </Flex>
                </Box>

                <Flex justify="center" pt={6}>
                    <Text fontSize="xs" color={colors.textPlaceholder}>
                        Powered by BR Sense - Tecnologia Agrícola.
                    </Text>
                </Flex>
            </Container>
        </Flex>
    );
}