import {
    Box, Flex, Text, Table, Thead, Tbody, Tr, Th, Td, Icon, HStack, SimpleGrid, Hide, Show,
    Menu, MenuButton, MenuList, MenuItem, Button, VStack,
    Badge
} from '@chakra-ui/react';
import {
    MdArrowUpward, MdArrowDownward, MdSort,
    MdSensors, MdLocationOn, MdBatteryFull
} from 'react-icons/md';
import type { Probe } from '../../types';

export interface TableRowData extends Probe {
    farmName: string;
    status: string;
    batteryLevel: number | undefined;
    batteryDate: string;
    lastCommunicationFormatted: string;
    lastCommunicationTimestamp: number;
}

export type SortKey = 'esn' | 'name' | 'farmName' | 'status' | 'batteryLevel' | 'lastCommunicationTimestamp' | 'cultura';

interface DeviceTableProps {
    data: TableRowData[];
    onRowClick: (id: number) => void;
    sortConfig: { key: SortKey; direction: 'asc' | 'desc' };
    onSort: (key: SortKey) => void;
}

const sortLabels: Record<SortKey, string> = {
    name: 'Nome',
    status: 'Status',
    cultura: 'Cultura',
    lastCommunicationTimestamp: 'Último envio',
    batteryLevel: 'Bateria',
    esn: 'ESN',
    farmName: 'Fazenda'
};

export function DeviceTable({ data, onRowClick, sortConfig, onSort }: DeviceTableProps) {

    const formatRain = (val?: number) => {
        if (val === undefined || val === null) return '-';
        return `${val.toFixed(1)}`;
    };

    const calcularDAP = (dataPlantio?: string | null) => {
        if (!dataPlantio) return '-';
        const hoje = new Date();
        const dataInicial = new Date(dataPlantio);
        const diffInMs = hoje.getTime() - dataInicial.getTime();
        const dias = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        return dias < 0 ? 0 : dias;
    };

    const formatarPotencia = (cv?: number | null) => {
        if (cv === null || cv === undefined) return '-';

        const kw = Math.ceil(cv * 0.7355);

        return `${Math.ceil(cv)}cv/${kw}kw`;
    };

    const getStatusColor = (status: string, version: string) => {
        if (version === 'desktop') {
            if (status.includes('status_critical')) return 'red';
            if (status.includes('status_alert')) return 'yellow';
            if (status.includes('status_ok')) return 'green';
            if (status.includes('status_saturated')) return 'blue';
        }
        else {
            if (status.includes('status_critical')) return 'red.400';
            if (status.includes('status_alert')) return 'yellow.400';
            if (status.includes('status_ok')) return 'green.400';
            if (status.includes('status_saturated')) return 'blue.400';
        }
        return 'gray.400';
    };

    const getStatusLabel = (status: string) => {
        if (status.includes('status_critical')) return 'Crítico';
        if (status.includes('status_alert')) return 'Atenção';
        if (status.includes('status_ok')) return 'Ideal';
        if (status.includes('status_saturated')) return 'Saturado';
        return 'Offline';
    };

    const getBatteryStatus = (voltage: number | null | undefined) => {
        if (voltage === null || voltage === undefined) return { color: "gray.500", text: "--" };
        const isPercentage = voltage > 10;
        const isGood = isPercentage ? voltage > 40 : voltage >= 3.7;
        const isWarn = isPercentage ? voltage > 15 : voltage >= 3.4;
        if (isGood) return { color: "green.400", text: isPercentage ? `${voltage.toFixed(0)}%` : `${voltage.toFixed(1)}` };
        if (isWarn) return { color: "yellow.400", text: isPercentage ? `${voltage.toFixed(0)}%` : `${voltage.toFixed(1)}` };
        return { color: "red.400", text: isPercentage ? `${voltage.toFixed(0)}%` : `${voltage.toFixed(1)}` };
    };

    const renderSortIcon = (column: SortKey) => {
        if (sortConfig.key !== column) return null;
        return <Icon as={sortConfig.direction === 'asc' ? MdArrowUpward : MdArrowDownward} ml={1} />;
    };

    if (data.length === 0) {
        return <Text color="gray.500" fontStyle="italic">Nenhuma sonda encontrada.</Text>;
    }

    return (
        <>
            {/* VISÃO MOBILE (Intacta) */}
            <Hide above="md">
                <Flex justify="space-between" align="center" mb={4} px={1}>
                    <Menu>
                        <MenuButton
                            as={Button}
                            size="sm"
                            variant="outline"
                            colorScheme="blue"
                            color="white"
                            borderColor="gray.600"
                            bg="gray.800"
                            leftIcon={<Icon as={MdSort} />}
                            rightIcon={<Icon as={sortConfig.direction === 'asc' ? MdArrowUpward : MdArrowDownward} />}
                            _hover={{ bg: "gray.700" }}
                            _active={{ bg: "gray.600" }}
                        >
                            {sortLabels[sortConfig.key]}
                        </MenuButton>
                        <MenuList bg="gray.800" borderColor="gray.600" zIndex={10} shadow="xl">
                            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                                <MenuItem
                                    key={key}
                                    bg="gray.800"
                                    _hover={{ bg: 'gray.700' }}
                                    onClick={() => onSort(key)}
                                    display="flex"
                                    justifyContent="space-between"
                                    color="white"
                                >
                                    <Text>{sortLabels[key]}</Text>
                                    {sortConfig.key === key && (
                                        <Icon as={sortConfig.direction === 'asc' ? MdArrowUpward : MdArrowDownward} color="blue.400" />
                                    )}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Flex>

                <SimpleGrid gridTemplateColumns="1fr" gap={4} w="100%">
                    {data.map((row) => {
                        const batteryData = getBatteryStatus(row.batteryLevel);

                        return (
                            <Box
                                key={`mobile-card-${row.id}`}
                                position="relative"
                                bg="gray.800"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="gray.700"
                                p={4}
                                cursor="pointer"
                                onClick={() => onRowClick(row.id)}
                                overflow="hidden"
                                transition="all 0.25s ease"
                                boxShadow="lg"
                                _hover={{ bg: 'whiteAlpha.100', borderColor: 'blue.500' }}
                                _before={{
                                    content: '""',
                                    position: 'absolute',
                                    top: '8px',
                                    bottom: '8px',
                                    left: '0',
                                    width: '5px',
                                    borderRadius: '0 6px 6px 0',
                                    bg: getStatusColor(row.status, 'mobile'),
                                }}
                            >
                                <Flex justify="space-between" align="center" gap={2} mb={3} pl={2}>
                                    <Box flex="1" minW={0}>
                                        <Text fontSize="lg" fontWeight="bold" color="white" noOfLines={1}>{row.name || row.esn}</Text>
                                        {row.name && <Text fontSize="xs" color="gray.400" noOfLines={1}>ESN: {row.esn}</Text>}
                                    </Box>

                                    <Flex align="center" gap={1}>
                                        <Badge backgroundColor={getStatusColor(row.status, 'mobile')} variant="subtle" borderRadius="full" px={2} py={1} whiteSpace="nowrap">
                                            {getStatusLabel(row.status)}
                                        </Badge>
                                    </Flex>
                                </Flex>

                                <SimpleGrid columns={3} gap={2} pl={2}>
                                    <Box bg="gray.900" borderRadius="md" p={2} textAlign="center" border="1px solid" borderColor="gray.700">
                                        <Text fontSize="xs" color="gray.500" mb={1}>1h</Text>
                                        <Text fontSize="md" fontWeight="bold" color="blue.200">{formatRain(row.rain_1h)}<Text as="span" fontSize="10px" color="gray.500" ml={0.5}>mm</Text></Text>
                                    </Box>
                                    <Box bg="gray.900" borderRadius="md" p={2} textAlign="center" border="1px solid" borderColor="gray.700">
                                        <Text fontSize="xs" color="gray.500" mb={1}>24h</Text>
                                        <Text fontSize="md" fontWeight="bold" color="blue.300">{formatRain(row.rain_24h)}<Text as="span" fontSize="10px" color="gray.500" ml={0.5}>mm</Text></Text>
                                    </Box>
                                    <Box bg="gray.900" borderRadius="md" p={2} textAlign="center" border="1px solid" borderColor="gray.700">
                                        <Text fontSize="xs" color="gray.500" mb={1}>7d</Text>
                                        <Text fontSize="md" fontWeight="bold" color="blue.400">{formatRain(row.rain_7d)}<Text as="span" fontSize="10px" color="gray.500" ml={0.5}>mm</Text></Text>
                                    </Box>
                                </SimpleGrid>

                                <Box pt={4} mt={4} borderTop="1px" borderColor="gray.600" pl={2}>
                                    <SimpleGrid columns={3} gap={2} mb={4}>
                                        <Box textAlign="center">
                                            <Text fontSize="xs" color="gray.500" mb={0.5}>Cultura</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="gray.200" noOfLines={1}>{row.cultura || '-'}</Text>
                                        </Box>
                                        <Box textAlign="center">
                                            <Text fontSize="xs" color="gray.500" mb={0.5}>DAP</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="gray.200">{row.data_plantio ? `${calcularDAP(row.data_plantio)} d` : '-'}</Text>
                                        </Box>
                                        <Box textAlign="center">
                                            <Text fontSize="xs" color="gray.500" mb={0.5}>Potência</Text>
                                            <Text fontSize="xs" fontWeight="medium" color="gray.200">{formatarPotencia(row.potencia_cv)}</Text>
                                        </Box>
                                    </SimpleGrid>

                                    <Flex justify="space-between" align="center" bg="blackAlpha.400" p={3} borderRadius="md" border="1px solid" borderColor="gray.700">
                                        <Box minW={0}>
                                            <Text color="gray.400" fontSize="xs" noOfLines={1} mb={1}>Fazenda: <Text as="span" color="white" fontWeight="medium">{row.farmName}</Text></Text>
                                            <Text color="gray.400" fontSize="xs" noOfLines={1}>Envio: <Text as="span" color="white" fontWeight="medium">{row.lastCommunicationFormatted}</Text></Text>
                                        </Box>
                                        <Box textAlign="right" pl={2}>
                                            <Text fontSize="10px" color="gray.500" textTransform="uppercase" mb={0.5}>Bateria</Text>
                                            <Text fontSize="lg" fontWeight="bold" color={batteryData.color} whiteSpace="nowrap" fontFamily="mono" lineHeight={1}>
                                                {batteryData.text}
                                            </Text>
                                        </Box>
                                    </Flex>
                                </Box>
                            </Box>
                        );
                    })}
                </SimpleGrid>
            </Hide>

            {/* VISÃO DESKTOP ATUALIZADA */}
            <Show above="md">
                <Box bg="gray.800" borderRadius="2rem" overflow="hidden" boxShadow="2xl">
                    <Table variant="unstyled" w="full" textAlign="left" sx={{ borderCollapse: 'collapse' }}>
                        <Thead bg="whiteAlpha.50">
                            <Tr color="gray.400" fontSize="10px" textTransform="uppercase" letterSpacing="0.2em" fontWeight="bold">
                                {/* Ordenação por Status vinculada ao cabeçalho de Nome */}
                                <Th py={4} px={4} minW="260px" cursor="pointer" onClick={() => onSort('status')} color="gray.400">
                                    <HStack spacing={1}>
                                        <Text>Nome do Dispositivo</Text>
                                        {renderSortIcon('status')}
                                    </HStack>
                                </Th>
                                <Th py={4} px={4} textAlign="center" borderLeft="1px solid" borderColor="whiteAlpha.100" color="gray.400" textTransform="none">
                                    PRECIPITAÇÃO (mm) <Text as="span" display="block" fontSize="10px" fontWeight="normal" color="whiteAlpha.600">(1h | 24h | 7d)</Text>
                                </Th>
                                <Th py={4} px={4} borderLeft="1px solid" borderColor="whiteAlpha.100" cursor="pointer" onClick={() => onSort('cultura')} color="gray.400">
                                    <HStack spacing={1}><Text>Dados Agronômicos</Text>{renderSortIcon('cultura')}</HStack>
                                </Th>
                                <Th py={4} px={4} borderLeft="1px solid" borderColor="whiteAlpha.100" color="gray.400">
                                    Dados Operacionais
                                </Th>
                                <Th py={4} px={4} borderLeft="1px solid" borderColor="whiteAlpha.100" cursor="pointer" onClick={() => onSort('lastCommunicationTimestamp')} color="gray.400">
                                    <HStack spacing={1}><Text>Dados de Sistema</Text>{renderSortIcon('lastCommunicationTimestamp')}</HStack>
                                </Th>
                            </Tr>
                        </Thead>

                        <Tbody sx={{ '& tr': { borderBottom: '1px solid', borderColor: 'rgba(255, 255, 255, 0.05)' } }}>
                            {data.map((row) => {
                                const batteryData = getBatteryStatus(row.batteryLevel);
                                const rawStatusColor = getStatusColor(row.status, 'desktop');
                                const accentColor = rawStatusColor === 'gray.400' ? 'gray.500' : `${rawStatusColor}.500`;

                                let badgeBg, badgeColor, badgeDot;
                                if (rawStatusColor.includes('green')) { badgeBg = 'green.900'; badgeColor = 'green.300'; badgeDot = 'green.400'; }
                                else if (rawStatusColor.includes('red')) { badgeBg = 'red.900'; badgeColor = 'red.300'; badgeDot = 'red.400'; }
                                else if (rawStatusColor.includes('blue')) { badgeBg = 'blue.900'; badgeColor = 'blue.300'; badgeDot = 'blue.400'; }
                                else if (rawStatusColor.includes('yellow')) { badgeBg = 'yellow.900'; badgeColor = 'yellow.300'; badgeDot = 'yellow.400'; }
                                else { badgeBg = 'whiteAlpha.200'; badgeColor = 'gray.300'; badgeDot = 'gray.400'; }

                                return (
                                    <Tr key={`desktop-row-${row.id}`} onClick={() => onRowClick(row.id)} role="group" cursor="pointer" _hover={{ bg: 'whiteAlpha.50' }} transition="colors 0.2s" position="relative">
                                        <Td py={4} px={4} position="relative" borderBottom="none">
                                            {/* Accent Lateral Fixo (estilo mobile) */}
                                            <Box position="absolute" left={0} top={0} bottom={0} w="4px" bg={accentColor} />
                                            
                                            <Flex align="center" gap={3} ml={2}>
                                                <Flex h={8} w={8} minW={8} rounded="xl" bg="blue.900" color="blue.300" align="center" justify="center">
                                                    <Icon as={MdSensors} boxSize={4} />
                                                </Flex>
                                                <VStack align="start" spacing={1}>
                                                    <Text fontFamily="heading" fontWeight="bold" fontSize="md" color="white" lineHeight="short" noOfLines={1}>
                                                        {row.name || row.esn}
                                                    </Text>
                                                    <HStack spacing={1} fontSize="10px" color="gray.400">
                                                        <Icon as={MdLocationOn} boxSize={3} />
                                                        <Text noOfLines={1}>{row.farmName || 'Sem fazenda'}</Text>
                                                    </HStack>
                                                    {/* Status agora abaixo da fazenda */}
                                                    <Flex display="inline-flex" align="center" px={2} py={0.5} rounded="full" bg={badgeBg} color={badgeColor} fontSize="10px" fontWeight="bold" letterSpacing="wider" textTransform="uppercase">
                                                        <Box h={1.5} w={1.5} rounded="full" bg={badgeDot} mr={1} />
                                                        {getStatusLabel(row.status)}
                                                    </Flex>
                                                </VStack>
                                            </Flex>
                                        </Td>

                                        {/* Precipitação sem "mm" nos valores azuis */}
                                        <Td py={4} px={4} textAlign="center" borderLeft="1px solid" borderColor="whiteAlpha.100" borderBottom="none">
                                            <HStack spacing={3} justify="center" whiteSpace="nowrap">
                                                <Text color="blue.400" fontWeight="bold" fontSize="md">{formatRain(row.rain_1h)}</Text>
                                                <Text color="whiteAlpha.400" fontSize="md">|</Text>
                                                <Text color="blue.400" fontWeight="bold" fontSize="md">{formatRain(row.rain_24h)}</Text>
                                                <Text color="whiteAlpha.400" fontSize="md">|</Text>
                                                <Text color="blue.400" fontWeight="bold" fontSize="md">{formatRain(row.rain_7d)}</Text>
                                            </HStack>
                                        </Td>

                                        <Td py={4} px={4} borderLeft="1px solid" borderColor="whiteAlpha.100" borderBottom="none">
                                            <Flex direction="column" gap={0.5} fontSize="xs">
                                                <HStack spacing={1}>
                                                    <Text color="gray.400">Cultura:</Text>
                                                    <Text fontWeight="semibold" color="white">{row.cultura || '-'}</Text>
                                                </HStack>
                                                <HStack spacing={1}>
                                                    <Text color="gray.400">DAP:</Text>
                                                    <Text fontWeight="semibold" color="white">
                                                        {row.data_plantio ? calcularDAP(row.data_plantio) : '-'} <Text as="span" fontSize="10px" fontWeight="normal" color="whiteAlpha.600">dias</Text>
                                                    </Text>
                                                </HStack>
                                            </Flex>
                                        </Td>

                                        <Td py={4} px={4} borderLeft="1px solid" borderColor="whiteAlpha.100" borderBottom="none">
                                            <VStack align="start" spacing={0} fontSize="sm">
                                                <Text fontWeight="bold" color="white">{row.potencia_cv ? Math.ceil(row.potencia_cv) : '-'} <Text as="span" fontSize="10px" fontWeight="normal" color="whiteAlpha.600">cv</Text></Text>
                                                <Text fontWeight="bold" color="white">{row.potencia_cv ? Math.ceil(row.potencia_cv * 0.7355) : '-'} <Text as="span" fontSize="10px" fontWeight="normal" color="whiteAlpha.600">kW</Text></Text>
                                            </VStack>
                                        </Td>

                                        <Td py={4} px={4} borderLeft="1px solid" borderColor="whiteAlpha.100" borderBottom="none" minW="170px">
                                            <SimpleGrid columns={2} columnGap={2} rowGap={1.5} fontSize="12px">
                                                <Box>
                                                    <Text fontSize="12px" color="gray.400" fontWeight="bold" textTransform="uppercase" mb={0.5}>Último Envio</Text>
                                                    <Text color="white" whiteSpace="nowrap">{row.lastCommunicationFormatted}</Text>
                                                </Box>
                                                <Box textAlign="right">
                                                    <Text fontSize="12px" color="gray.400" fontWeight="bold" textTransform="uppercase" mb={0.5}>Bateria</Text>
                                                    <HStack justify="flex-end" spacing={1} color={batteryData.color}>
                                                        <Text>{batteryData.text}</Text>
                                                        <Icon as={MdBatteryFull} fontSize="xs" />
                                                    </HStack>
                                                </Box>
                                                <Box gridColumn="span 2" mt={0.5} pt={0.5} borderTop="1px solid" borderColor="whiteAlpha.200">
                                                    <Text fontSize="12px" color="whiteAlpha.600">ESN: {row.esn}</Text>
                                                </Box>
                                            </SimpleGrid>
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                </Box>
            </Show>
        </>
    );
}