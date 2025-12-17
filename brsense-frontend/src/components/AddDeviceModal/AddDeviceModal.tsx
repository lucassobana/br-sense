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
    Text,
    useToast
} from '@chakra-ui/react';
import { associateDevice } from '../../services/api';
import { COLORS } from '../../colors/colors';

interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    farmId: number | null; // ID da fazenda selecionada (obrigatório para vincular)
    onSuccess: () => void;
}

export function AddDeviceModal({ isOpen, onClose, farmId, onSuccess }: AddDeviceModalProps) {
    const [esn, setEsn] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleAssociate = async () => {
        if (!farmId) {
            toast({ title: "Nenhuma fazenda selecionada", status: "warning" });
            return;
        }
        if (!esn) {
            toast({ title: "ESN é obrigatório", status: "warning" });
            return;
        }

        try {
            setLoading(true);
            await associateDevice({
                esn,
                name,
                farm_id: farmId
            });

            toast({ title: "Sonda vinculada!", status: "success" });
            setEsn("");
            setName("");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao vincular sonda", description: "Verifique o ESN.", status: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent bg={COLORS.surface} color="white">
                <ModalHeader>Adicionar Sonda</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Text fontSize="sm" color={COLORS.textSecondary} mb={4}>
                        Insira o ESN (Número de Série Eletrônico) que está na etiqueta do dispositivo Globalstar.
                    </Text>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Nome Identificador</FormLabel>
                            <Input
                                placeholder="Ex: Pivô Central 01"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                bg={COLORS.background}
                                border="none"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>ESN do Dispositivo</FormLabel>
                            <Input
                                placeholder="Ex: 0-123456"
                                value={esn}
                                onChange={e => setEsn(e.target.value)}
                                bg={COLORS.background}
                                border="none"
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose} color={COLORS.textSecondary} _hover={{ bg: "whiteAlpha.100" }}>
                        Cancelar
                    </Button>
                    <Button bg={COLORS.primaryDark} onClick={handleAssociate} isLoading={loading}>
                        Vincular
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}