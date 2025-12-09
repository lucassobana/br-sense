import { useState } from 'react';
import {
    Box,
    Flex,
    Heading,
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
    useToast
} from '@chakra-ui/react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

// Importe as funções da API (certifique-se que o caminho está correto)
import { login } from '../services/api';
import brsenseLogo from '../assets/BRSense_logo.png';

export function Login() {
    const navigate = useNavigate();
    const toast = useToast();

    // Estados de Login
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleTogglePassword = () => setShowPassword(!showPassword);

    // --- LÓGICA DE LOGIN ---
    const handleLogin = async () => {
        if (!email || !password) {
            toast({ title: 'Preencha todos os campos', status: 'warning', position: 'top' });
            return;
        }

        try {
            setIsLoading(true);
            await login(email, password);

            toast({ title: 'Login realizado com sucesso!', status: 'success', position: 'top' });
            navigate('/');
        } catch (error: unknown) {
            let msg = 'Erro ao conectar com o servidor';

            // Verifica se error é um objeto
            if (typeof error === 'object' && error !== null) {
                // Se tiver a propriedade response e data
                // @ts-expect-error TS não consegue inferir, mas é seguro
                msg = error.response?.data?.detail || msg;
            }

            toast({ title: 'Erro no Login', description: msg, status: 'error', position: 'top' });
        } finally {
            setIsLoading(false);
        }
    };

    const colors = {
        backgroundDark: '#0A0A0A',
        primary: '#003d7a',
        inputBorder: '#2D2D2D',
        textMain: '#F5F5F5',
        textPlaceholder: '#9aabbc',
        iconBg: '#2D2D2D',
    };

    return (
        <Flex
            minH="100vh"
            w="100%"
            bg={colors.backgroundDark}
            direction="column"
            fontFamily="'Inter', sans-serif"
        >
            <Container maxW="container.sm" h="100vh" display="flex" flexDirection="column" p={6}>
                {/* Área Principal Centralizada */}
                <Flex flex="1" direction="column" justify="center" align="center" w="100%">
                    {/* Logo / Ícone */}
                    <Flex
                        justify="center"
                        align="center"
                        bg={colors.iconBg}
                        w="120px"
                        h="120px"
                        borderRadius="2xl"
                        mb={8}
                    >
                        <img src={brsenseLogo} alt="BR Sense Logo" style={{ width: '100px', height: '100px' }} />
                    </Flex>

                    {/* Título */}
                    <Heading
                        as="h1"
                        color={colors.textMain}
                        fontSize="32px"
                        fontWeight="bold"
                        textAlign="center"
                        mb={8}
                        lineHeight="tight"
                    >
                        Bem-Vindo a BR Sense
                    </Heading>

                    {/* Formulário de Login */}
                    <VStack spacing={4} w="100%" maxW="480px">
                        {/* Campo de Email */}
                        <FormControl>
                            <FormLabel color={colors.textMain} fontSize="16px" fontWeight="medium" mb={2}>
                                Login
                            </FormLabel>
                            <Input
                                type="email"
                                placeholder="Entre com seu login"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                height="56px"
                                bg={colors.backgroundDark}
                                borderColor={colors.inputBorder}
                                color={colors.textMain}
                                _placeholder={{ color: colors.textPlaceholder }}
                                borderRadius="lg"
                                fontSize="16px"
                                _hover={{ borderColor: colors.primary }}
                                _focus={{
                                    borderColor: colors.primary,
                                    boxShadow: `0 0 0 1px ${colors.primary}`,
                                }}
                            />
                        </FormControl>

                        {/* Campo de Senha */}
                        <FormControl>
                            <FormLabel color={colors.textMain} fontSize="16px" fontWeight="medium" mb={2}>
                                Senha
                            </FormLabel>
                            <InputGroup size="lg">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Entre com sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    height="56px"
                                    bg={colors.backgroundDark}
                                    borderColor={colors.inputBorder}
                                    color={colors.textMain}
                                    _placeholder={{ color: colors.textPlaceholder }}
                                    borderRadius="lg"
                                    fontSize="16px"
                                    _hover={{ borderColor: colors.primary }}
                                    _focus={{
                                        borderColor: colors.primary,
                                        boxShadow: `0 0 0 1px ${colors.primary}`,
                                    }}
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
                        <Box w="100%" pt={2}>
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

                {/* Footer */}
                <Flex justify="center" pb={4} pt={8}>
                    <Text fontSize="xs" color={colors.textPlaceholder}>
                        Powered by BR Sense - Soil & Climate Intelligence.
                    </Text>
                </Flex>
            </Container>
        </Flex>
    );
}