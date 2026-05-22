import { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
    ModalBody, ModalCloseButton, Button, VStack, FormControl,
    FormLabel, Input, Select, useToast
} from '@chakra-ui/react';
import { createFarm, updateFarm, getUsers, type User } from '../../services/api'; 
import type { Farm } from '../../types';
import { COLORS } from '../../colors/colors';

interface CreateFarmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Farm | null;
}

export function CreateFarmModal({ isOpen, onClose, onSuccess, initialData }: CreateFarmModalProps) {
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [userId, setUserId] = useState(""); 
    const [users, setUsers] = useState<User[]>([]); 
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const isEditMode = !!initialData;

    useEffect(() => {
        if (isOpen) {
            getUsers()
                .then(data => {
                    const response = data as { users?: User[] };
                    if (response && Array.isArray(response.users)) {
                        setUsers(response.users);
                    } else if (Array.isArray(data)) {
                        setUsers(data);
                    }
                })
                .catch(err => console.error("Erro ao carregar usuários:", err));

            if (initialData) {
                setName(initialData.name);
                setLocation(initialData.location);
                setUserId(initialData.user_id ? String(initialData.user_id) : "");
            } else {
                setName("");
                setLocation("");
                setUserId("");
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async () => {
        if (!name) {
            toast({ title: "Nome obrigatório", status: "warning" });
            return;
        }

        try {
            setLoading(true);
            const payload = userId 
                ? { name, location, user_id: Number(userId) } 
                : { name, location };

            if (isEditMode && initialData) {
                await updateFarm(initialData.id, payload);
                toast({ title: "Fazenda atualizada!", status: "success" });
            } else {
                await createFarm(payload);
                toast({ title: "Fazenda criada!", status: "success" });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: `Erro ao ${isEditMode ? 'atualizar' : 'criar'} fazenda`, status: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: "sm", md: "md" }}>
            <ModalOverlay />
            {/* mx={4} garante que o modal não fique colado nas bordas do celular */}
            <ModalContent bg={COLORS.surface} color="white" mx={4}>
                <ModalHeader borderBottomWidth="1px" borderColor="#2D2D2D">
                    {isEditMode ? `Editar Fazenda` : 'Nova Fazenda'}
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody py={{ base: 4, md: 6 }}>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel fontSize="sm">Nome</FormLabel>
                            <Input placeholder="Ex: Fazenda Santa Maria" value={name} onChange={e => setName(e.target.value)} bg={COLORS.background} border="none" />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm">Localização (Cidade/Estado)</FormLabel>
                            <Input placeholder="Ex: Rio Verde - GO" value={location} onChange={e => setLocation(e.target.value)} bg={COLORS.background} border="none" />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm">Vincular ao Usuário</FormLabel>
                            <Select placeholder="Selecione um usuário (Opcional)" value={userId} onChange={(e) => setUserId(e.target.value)} bg={COLORS.background} border="none">
                                {users.map(user => (
                                    <option key={user.id} value={user.id} style={{ color: 'black' }}>
                                        {user.name || user.username || user.email || `ID: ${user.id}`}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter borderTopWidth="1px" borderColor="#2D2D2D" gap={2}>
                    <Button variant="ghost" onClick={onClose} color={COLORS.textSecondary} _hover={{ bg: "whiteAlpha.100" }} flex={{ base: 1, md: "initial" }}>
                        Cancelar
                    </Button>
                    <Button bg={COLORS.primary} onClick={handleSubmit} isLoading={loading} color="white" _hover={{ bg: COLORS.primaryDark }} flex={{ base: 1, md: "initial" }}>
                        {isEditMode ? 'Salvar' : 'Criar'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}