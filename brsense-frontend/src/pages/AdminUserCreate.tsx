// brsense-frontend/src/pages/AdminUserCreate.tsx
import { useState } from 'react';
import {
    Box,
    Flex,
    Heading,
    Input,
    Button,
    FormControl,
    FormLabel,
    Select,
    VStack,
    useToast,
    Container,
    Text
} from '@chakra-ui/react';
import { createUser } from '../services/api';
import type { CreateUserDTO } from '../services/api';
import { AxiosError } from 'axios';
import brsenseLogo from '../assets/BRSense_logo.png';

export function AdminUserCreate() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Estado do formulário
    const [formData, setFormData] = useState<CreateUserDTO>({
        name: '',
        login: '',
        password: '',
        role: 'FAZENDEIRO'
    });

    // --- PALETA DE CORES (Idêntica ao Login.tsx) ---
    const colors = {
        backgroundDark: '#0A0A0A',
        primary: '#003d7a',
        inputBorder: '#2D2D2D',
        textMain: '#F5F5F5',
        textPlaceholder: '#9aabbc',
        cardBg: '#111111', // Um pouco mais claro que o fundo para destacar o card
        iconBg: '#2D2D2D'
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.login || !formData.password) {
            toast({ title: 'Preencha todos os campos', status: 'warning', position: 'top' });
            return;
        }

        setIsLoading(true);
        try {
            await createUser(formData);
            toast({
                title: 'Usuário criado com sucesso!',
                description: `O acesso para ${formData.name} foi configurado.`,
                status: 'success',
                position: 'top',
                duration: 5000,
                isClosable: true,
            });
            // Limpa o formulário
            setFormData({ name: '', login: '', password: '', role: 'FAZENDEIRO' });
        } catch (err) {
            const error = err as AxiosError<{ detail: string }>;
            const msg = error.response?.data?.detail || 'Erro ao criar usuário';
            toast({ title: 'Erro', description: msg, status: 'error', position: 'top' });
        } finally {
            setIsLoading(false);
        }
    };

    // Estilo comum para os Inputs e Select para garantir consistência com o Login
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
            w="100%"
            minH="100vh" // Ajuste para descontar o Header do Layout
            justify="center"
            align="center"
            fontFamily="'Inter', sans-serif"
            bg={colors.backgroundDark} // Mantém o fundo escuro consistente
        >
            <Container maxW="container.md" p={4} display="flex" flexDirection="column">
                <Box
                    bg={colors.cardBg}
                    p={8}
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor={colors.inputBorder}
                    boxShadow="xl"
                >
                    <Flex flex="1" direction="column" justify="center" align="center" w="100%">
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
                    </Flex>
                    <Heading
                        as="h2"
                        color={colors.textMain}
                        fontSize="28px"
                        fontWeight="bold"
                        textAlign="center"
                        mb={2}
                    >
                        Criar Novo Usuário
                    </Heading>
                    <Text color={colors.textPlaceholder} textAlign="center" mb={8} fontSize="sm">
                        Preencha os dados para conceder acesso ao sistema
                    </Text>

                    <VStack spacing={5}>

                        <FormControl isRequired>
                            <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                Nome Completo
                            </FormLabel>
                            <Input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ex: João da Silva"
                                {...inputStyle}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                Login (Email)
                            </FormLabel>
                            <Input
                                name="login"
                                type="email"
                                value={formData.login}
                                onChange={handleChange}
                                placeholder="usuario@brsense.com"
                                {...inputStyle}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                Senha Provisória
                            </FormLabel>
                            <Input
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="********"
                                {...inputStyle}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel color={colors.textMain} fontSize="14px" fontWeight="medium">
                                Perfil de Acesso
                            </FormLabel>
                            <Select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                {...inputStyle}
                                // Ajuste específico para o ícone e opções no modo escuro
                                iconColor={colors.textPlaceholder}
                            >
                                {/* style={{ color: 'black' }} é necessário pois o <option> herda a cor branca do select */}
                                <option style={{ color: 'white', background: 'black'}} value="FAZENDEIRO">Fazendeiro (Padrão)</option>
                                <option style={{ color: 'white', background: 'black'}} value="ADMIN">Administrador</option>
                                <option style={{ color: 'white', background: 'black'}} value="PIVOZEIRO">Pivozeiro</option>
                            </Select>
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
                                onClick={handleSubmit}
                                isLoading={isLoading}
                                loadingText="Criando..."
                            >
                                Cadastrar Usuário
                            </Button>
                        </Box>

                    </VStack>
                </Box>
                <Flex justify="center" pb={4} pt={8}>
                    <Text fontSize="xs" color={colors.textPlaceholder}>
                        Powered by BR Sense - Soil & Climate Intelligence.
                    </Text>
                </Flex>
            </Container>
        </Flex>
    );
}