import { useState } from 'react';
import {
    Box,
    Flex,
    Text,
    Checkbox,
    Button,
    HStack,
    VStack,
} from '@chakra-ui/react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
} from 'recharts';

// CORREÇÃO 1: Importar tipos separadamente usando 'import type'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// Configuração das cores baseadas no design original
const DEPTH_COLORS = {
    depth10: "#82aaff", // 10cm
    depth20: "#79e2c6", // 20cm
    depth30: "#ffc98a", // 30cm
    depth40: "#c7a9ff", // 40cm
    depth50: "#ffa9a9", // 50cm
    depth60: "#ff7070", // 60cm
};

// Interface para os dados do gráfico
interface SoilData {
    time: string;
    depth10: number;
    depth20: number;
    depth30: number;
    depth40: number;
    depth50: number;
    depth60: number;
    [key: string]: string | number;
}

// Dados Mockados
const MOCK_DATA: SoilData[] = Array.from({ length: 30 }, (_, i) => ({
    time: `Day ${i + 1}`,
    depth10: 40 + Math.random() * 20,
    depth20: 35 + Math.random() * 15,
    depth30: 30 + Math.random() * 10,
    depth40: 25 + Math.random() * 10,
    depth50: 15 + Math.random() * 10,
    depth60: 20 + Math.random() * 5,
}));

// CORREÇÃO 2: Interface manual para evitar conflitos com TooltipProps do Recharts
// e resolver o erro de "implicit any" no map do payload
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: NameType;
        value: ValueType;
        color: string;
        dataKey: string | number;
    }>;
    label?: string | number;
}

// Componente Tooltip definido fora para performance
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <Box
                bg="#1C2A3A" // Cor sólida original do design (sem transparência)
                borderColor="rgba(59, 71, 84, 0.5)"
                borderWidth="1px"
                p={3}
                borderRadius="md"
                boxShadow="xl"
            >
                <Text color="gray.300" fontSize="sm" mb={2}>{label}</Text>
                {/* Agora 'entry' é tipado automaticamente pelo CustomTooltipProps */}
                {payload.map((entry) => (
                    <HStack key={entry.dataKey} spacing={2} fontSize="xs">
                        <Box w="8px" h="8px" borderRadius="full" bg={entry.color} />
                        <Text color="white" textTransform="capitalize">
                            {String(entry.name).replace('depth', '')}cm:
                        </Text>
                        <Text color="white" fontWeight="bold">
                            {Number(entry.value).toFixed(1)}%
                        </Text>
                    </HStack>
                ))}
            </Box>
        );
    }
    return null;
};

interface ChartProps {
    data?: SoilData[];
}

export function SoilMoistureChart({ data = MOCK_DATA }: ChartProps) {
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        depth10: true,
        depth20: true,
        depth30: true,
        depth40: true,
        depth50: true,
        depth60: true,
    });

    const toggleLine = (key: string) => {
        setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Box
            bg="#171d24"
            borderColor="rgba(59, 71, 84, 0.5)"
            borderWidth="1px"
            borderRadius="xl"
            p={4}
            m={4}
            color="white"
        >
            <VStack align="start" spacing={1} mb={4}>
                <Text fontSize="lg" fontWeight="medium">Soil Humidity Profile</Text>
                <Text color="gray.400" fontSize="sm">Last 30 Days</Text>
            </VStack>

            <Box h="250px" position="relative" w="100%">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3b4754" opacity={0.3} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <ReferenceArea y1={80} y2={100} fill="rgba(52,152,219,0.2)" strokeOpacity={0} />
                        <ReferenceArea y1={50} y2={80} fill="rgba(76,175,80,0.2)" strokeOpacity={0} />
                        <ReferenceArea y1={25} y2={50} fill="rgba(255,204,0,0.15)" strokeOpacity={0} />
                        <ReferenceArea y1={0} y2={25} fill="rgba(255,87,87,0.15)" strokeOpacity={0} />

                        {Object.entries(DEPTH_COLORS).map(([key, color]) => (
                            visibleLines[key] && (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                />
                            )
                        ))}
                    </LineChart>
                </ResponsiveContainer>

                <Flex
                    position="absolute"
                    inset={0}
                    direction="column"
                    pointerEvents="none"
                    justify="space-between"
                    pb={6}
                >
                    <Flex flex={1} justify="flex-end" pr={2} pt={1}><Text fontSize="10px" color="blue.300" opacity={0.6}>Saturated</Text></Flex>
                    <Flex flex={1} justify="flex-end" pr={2} pt={1}><Text fontSize="10px" color="green.300" opacity={0.6}>Ideal</Text></Flex>
                    <Flex flex={1} justify="flex-end" pr={2} pt={1}><Text fontSize="10px" color="yellow.300" opacity={0.6}>Alert</Text></Flex>
                    <Flex flex={1} justify="flex-end" pr={2} pt={1}><Text fontSize="10px" color="red.300" opacity={0.6}>Critical</Text></Flex>
                </Flex>
            </Box>

            <Flex direction="column" gap={4} pt={4}>
                <Flex gap={4} wrap="wrap">
                    {Object.entries(DEPTH_COLORS).map(([key, color]) => {
                        if (key === 'depth60') return null;
                        const label = `${key.replace('depth', '')}-${parseInt(key.replace('depth', '')) + 10} cm`;

                        return (
                            <Checkbox
                                key={key}
                                isChecked={visibleLines[key]}
                                onChange={() => toggleLine(key)}
                                colorScheme="blue"
                                iconColor="white"
                                sx={{
                                    '.chakra-checkbox__control': {
                                        borderColor: 'gray.600',
                                        bg: 'gray.700',
                                        _checked: {
                                            bg: 'transparent',
                                            borderColor: 'gray.600',
                                            color: '#137fec'
                                        }
                                    },
                                    '.chakra-checkbox__label': {
                                        fontSize: 'sm',
                                        color: visibleLines[key] ? 'gray.300' : 'gray.600'
                                    }
                                }}
                            >
                                <HStack spacing={2}>
                                    <Box w="12px" h="12px" borderRadius="full" bg={color} opacity={visibleLines[key] ? 1 : 0.4} />
                                    <Text>{label}</Text>
                                </HStack>
                            </Checkbox>
                        );
                    })}
                </Flex>

                <HStack spacing={2} w="100%">
                    <Button
                        flex={1}
                        size="sm"
                        variant="ghost"
                        bg="rgba(19, 127, 236, 0.2)"
                        color="#137fec"
                        _hover={{ bg: "rgba(19, 127, 236, 0.3)" }}
                        fontSize="sm"
                        fontWeight="medium"
                    >
                        Isolate Layer
                    </Button>
                    <Button
                        flex={1}
                        size="sm"
                        bg="#137fec"
                        color="white"
                        _hover={{ bg: "blue.600" }}
                        fontSize="sm"
                        fontWeight="medium"
                    >
                        View Root Activity
                    </Button>
                </HStack>
            </Flex>
        </Box>
    );
}