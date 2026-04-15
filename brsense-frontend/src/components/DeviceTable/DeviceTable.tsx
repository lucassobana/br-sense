import {
    Box, Flex, Text, Badge, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
    Icon, Tooltip as ChakraTooltip, HStack, SimpleGrid, Hide, Show,
    Menu, MenuButton, MenuList, MenuItem, Button
} from '@chakra-ui/react';
import {
    MdArrowUpward, MdArrowDownward, MdSort
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

// Dicionário para traduzir as chaves de ordenação no Mobile
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

    // --- REGRAS DE NEGÓCIO E FORMATAÇÃO ---
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

        return `${Math.ceil(cv)}cv/(${kw}kW)`;
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
            {/* VISÃO MOBILE (Cards Totalmente Visíveis) */}
            <Hide above="md">

                {/* HEADER MOBILE COM BOTÃO DE ORDENAÇÃO */}
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
                                onClick={() => onRowClick(row.id)} // Clique em qualquer lugar do card abre o gráfico
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
                                {/* CABEÇALHO DO CARD */}
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

                                {/* DADOS DE CHUVA */}
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

                                {/* CORPO DO CARD SEMPRE A MOSTRA */}
                                <Box pt={4} mt={4} borderTop="1px" borderColor="gray.600" pl={2}>
                                    {/* DADOS DO PLANTIO */}
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

                                    {/* RODAPÉ DO CARD */}
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

            {/* VISÃO DESKTOP (Tabela - Mantida exatamente igual) */}
            <Show above="md">
                <TableContainer bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700" boxShadow="lg" overflowX="auto">
                    <Table variant="simple" colorScheme="whiteAlpha" size="md">
                        <Thead>
                            <Tr>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => onSort('name')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0}><Text>Nome</Text>{renderSortIcon('name')}</HStack>
                                </Th>
                                <Th colSpan={3} color="blue.300" borderColor="gray.600" textAlign="center" borderBottomWidth="1px" pt={2} px={{ base: 1, md: 2 }} textTransform="none">
                                    PRECIPITAÇÃO (mm)
                                </Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => onSort('status')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0}><Text>Status</Text>{renderSortIcon('status')}</HStack>
                                </Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => onSort('cultura')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0}><Text>Cultura</Text>{renderSortIcon('cultura')}</HStack>
                                </Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">DAP</Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">Pot (cv/kw)</Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => onSort('lastCommunicationTimestamp')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0}><Text>Último envio</Text>{renderSortIcon('lastCommunicationTimestamp')}</HStack>
                                </Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" textAlign="center" cursor="pointer" onClick={() => onSort('batteryLevel')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0} justify="center"><Text>Bateria (V)</Text>{renderSortIcon('batteryLevel')}</HStack>
                                </Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => onSort('esn')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0}><Text>ESN</Text>{renderSortIcon('esn')}</HStack>
                                </Th>
                                <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => onSort('farmName')} verticalAlign="bottom" pb={3} px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                    <HStack spacing={0}><Text>Fazenda</Text>{renderSortIcon('farmName')}</HStack>
                                </Th>
                            </Tr>
                            <Tr>
                                <Th color="blue.200" borderColor="gray.700" textAlign="center" fontSize="xs" py={1} px={{ base: 1, md: 2 }}>1h</Th>
                                <Th color="blue.300" borderColor="gray.700" textAlign="center" fontSize="xs" py={1} px={{ base: 1, md: 2 }}>24h</Th>
                                <Th color="blue.400" borderColor="gray.700" textAlign="center" fontSize="xs" py={1} px={{ base: 1, md: 2 }}>7d</Th>
                            </Tr>
                        </Thead>

                        <Tbody>
                            {data.map((row) => {
                                const batteryData = getBatteryStatus(row.batteryLevel);
                                return (
                                    <Tr
                                        key={row.id}
                                        onClick={() => onRowClick(row.id)}
                                        cursor="pointer"
                                        _hover={{ bg: 'whiteAlpha.100', transform: "translateY(-1px)", boxShadow: "sm" }}
                                        transition="all 0.2s"
                                    >
                                        <Td borderColor="gray.700" color="gray.300" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{row.name || '-'}</Td>
                                        <Td borderColor="gray.700" textAlign="center" fontWeight="bold" color="blue.200" px={{ base: 1, md: 2 }} whiteSpace="nowrap">{formatRain(row.rain_1h)}</Td>
                                        <Td borderColor="gray.700" textAlign="center" fontWeight="bold" color="blue.300" px={{ base: 1, md: 2 }} whiteSpace="nowrap">{formatRain(row.rain_24h)}</Td>
                                        <Td borderColor="gray.700" textAlign="center" color="blue.400" px={{ base: 1, md: 2 }} whiteSpace="nowrap">{formatRain(row.rain_7d)}</Td>

                                        <Td borderColor="gray.700">
                                            <Badge colorScheme={getStatusColor(row.status, 'desktop')} variant="subtle" borderRadius="md" px={2} fontSize="0.75rem">
                                                {getStatusLabel(row.status)}
                                            </Badge>
                                        </Td>

                                        <Td borderColor="gray.700" color="gray.300" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{row.cultura || '-'}</Td>
                                        <Td borderColor="gray.700" color="gray.300" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{row.data_plantio ? `${calcularDAP(row.data_plantio)} dias` : '-'}</Td>
                                        <Td borderColor="gray.700" color="gray.300" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{formatarPotencia(row.potencia_cv)}</Td>

                                        <Td borderColor="gray.700" color="gray.300" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{row.lastCommunicationFormatted}</Td>

                                        <Td borderColor="gray.700" textAlign="center" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">
                                            <ChakraTooltip label={row.batteryDate ? `Última leitura: ${row.batteryDate}` : 'Sem dados'} hasArrow bg="gray.700" color="white">
                                                <HStack justify="center" spacing={1.5}>
                                                    <Text fontSize="sm" fontWeight="bold" color={batteryData.color} fontFamily="mono">
                                                        {batteryData.text}
                                                    </Text>
                                                </HStack>
                                            </ChakraTooltip>
                                        </Td>

                                        <Td borderColor="gray.700" fontWeight="medium" color="white" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{row.esn}</Td>
                                        <Td borderColor="gray.700" color="gray.300" px={{ base: 1.5, md: 3 }} whiteSpace="nowrap">{row.farmName}</Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                </TableContainer>
            </Show>
        </>
    );
}