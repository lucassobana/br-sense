// brsense-frontend/src/pages/Login.tsx
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
    useToast,
    Image
} from '@chakra-ui/react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
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

    const handleLogin = async () => {
        if (!email || !password) {
            toast({ title: 'Preencha todos os campos', status: 'warning', position: 'top' });
            return;
        }

        try {
            setIsLoading(true);
            // --- ALTERAÇÃO: Captura a resposta do login ---
            const response = await login(email, password);

            // Salva dados essenciais no LocalStorage
            if (response.user) {
                localStorage.setItem('user_id', response.user.id.toString()); // Salva o ID!
                localStorage.setItem('name', response.user.name);
                localStorage.setItem('user_role', response.user.role);
                localStorage.setItem('token', 'logged_in');
            }
            // ----------------------------------------------

            toast({ title: 'Login realizado com sucesso!', status: 'success', position: 'top', duration: 2000, isClosable: true });
            navigate('/');
        } catch (error: unknown) {
            let msg = 'Erro ao conectar com o servidor';

            if (error instanceof AxiosError) {
                msg = error.response?.data?.detail ?? msg;
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
            bg={colors.backgroundDark}
            direction="column"
            fontFamily="'Inter', sans-serif"
            justify="center"
            align="center"
        >
            <Container maxW="container.sm" p={4}>
                <Box
                    bg={colors.cardBg}
                    p={8}
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor={colors.inputBorder}
                    boxShadow="xl"
                    w="100%"
                >
                    <Flex direction="column" justify="center" align="center" w="100%">

                        <Flex
                            justify="center"
                            align="center"
                            bg={colors.iconBg}
                            w="100px"
                            h="100px"
                            borderRadius="2xl"
                            mb={6}
                            boxShadow="md"
                        >
                            <Image src={brsenseLogo} alt="BR Sense Logo" w="70px" h="70px" objectFit="contain" />
                        </Flex>

                        <Heading
                            as="h1"
                            color={colors.textMain}
                            fontSize="28px"
                            fontWeight="bold"
                            textAlign="center"
                            mb={8}
                        >
                            Bem-Vindo a BR Sense
                        </Heading>

                        <VStack spacing={5} w="100%">
                            <FormControl>
                                <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                    Login
                                </FormLabel>
                                <Input
                                    type="email"
                                    placeholder="Entre com seu login"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    {...inputStyle}
                                />
                            </FormControl>

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
                        Powered by BR Sense - Soil & Climate Intelligence.
                    </Text>
                </Flex>
            </Container>
        </Flex>
    );
}