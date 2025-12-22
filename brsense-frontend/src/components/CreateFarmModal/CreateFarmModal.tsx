import { useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    VStack,
    FormControl,
    FormLabel,
    Input,
    useToast
} from '@chakra-ui/react';
import { createFarm } from '../../services/api';
import { COLORS } from '../../colors/colors';

interface CreateFarmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Callback para recarregar dados
}

export function CreateFarmModal({ isOpen, onClose, onSuccess }: CreateFarmModalProps) {
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleCreate = async () => {
        if (!name) {
            toast({ title: "Nome obrigatório", status: "warning" });
            return;
        }

        try {
            setLoading(true);
            await createFarm({ name, location });
            toast({ title: "Fazenda criada!", status: "success" });

            // Limpa e fecha
            setName("");
            setLocation("");
            onSuccess(); // Avisa o pai para recarregar
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao criar fazenda", status: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent bg={COLORS.surface} color="white">
                <ModalHeader borderBottomWidth="1px">Nova Fazenda</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Nome</FormLabel>
                            <Input
                                placeholder="Ex: Fazenda Santa Maria"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                bg={COLORS.background}
                                border="none"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Localização (Cidade/Estado)</FormLabel>
                            <Input
                                placeholder="Ex: Rio Verde - GO"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                bg={COLORS.background}
                                border="none"
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter borderTopWidth="1px">
                    <Button variant="ghost" mr={3} onClick={onClose} color={COLORS.textSecondary} _hover={{ bg: "whiteAlpha.100" }}>
                        Cancelar
                    </Button>
                    <Button 
                        bg={COLORS.primary}
                        onClick={handleCreate}
                        isLoading={loading}
                        color="white"
                        _hover={{ bg: COLORS.primaryDark }}
                    >
                        Criar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}