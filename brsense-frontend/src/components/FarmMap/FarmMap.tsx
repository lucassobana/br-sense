import React, { useState } from 'react';
import { Box, Image, Text } from '@chakra-ui/react';
import { FarmMapProbeMarker } from './FarmMapProbeMarker';
import { FarmMapPopup } from './FarmMapPopup';
import type { Probe } from '../../types';
// import mapBg from '../../assets/farm_map_bg.jpg'; 

interface FarmMapProps {
    probes: Probe[];
    onSelectProbe: (probe: Probe) => void;
}

export const FarmMap: React.FC<FarmMapProps> = ({ probes, onSelectProbe }) => {
    const [activeProbeId, setActiveProbeId] = useState<number | null>(null);

    const activeProbe = probes.find(p => p.id === activeProbeId);

    const handleMapClick = () => {
        setActiveProbeId(null);
    };

    return (
        <Box
            position="relative"
            w="100%"
            h="100%"
            bg="gray.900"
            overflow="hidden"
            onClick={handleMapClick}
        >
            {/* Imagem de Fundo */}
            <Image
                src="/src/assets/farm_map_bg.jpg" // Verifique se este caminho existe no seu projeto
                alt="Farm Map"
                w="100%"
                h="100%"
                objectFit="cover"
                opacity={0.8}
                _hover={{ opacity: 1 }}
                transition="opacity 0.5s"
            />

            {/* Camada de Marcadores */}
            {probes.map((probe) => {
                // CORREÇÃO: Removemos 'probe.position' que causava o erro.
                // Usamos uma lógica simples baseada no ID para espalhar os pontos na tela
                // (top e left em porcentagem)
                const topVal = 20 + (probe.id * 15) % 60;
                const leftVal = 20 + (probe.id * 25) % 60;

                return (
                    <FarmMapProbeMarker
                        key={probe.id}
                        top={`${topVal}%`}
                        left={`${leftVal}%`}
                        status={probe.status}
                        name={probe.name || probe.esn}
                        onClick={(e) => {
                            e.stopPropagation(); // Evita fechar ao clicar no marker
                            setActiveProbeId(probe.id);
                        }}
                    />
                );
            })}

            {/* Popup da Sonda Selecionada */}
            {activeProbe && (
                <FarmMapPopup
                    probe={activeProbe}
                    onClose={() => setActiveProbeId(null)}
                    onViewGraph={() => onSelectProbe(activeProbe)}
                />
            )}

            {!activeProbe && (
                <Box position="absolute" bottom="10px" left="10px" bg="blackAlpha.600" p={2} borderRadius="md">
                    <Text fontSize="xs" color="whiteAlpha.800">Clique em uma sonda para ver detalhes</Text>
                </Box>
            )}
        </Box>
    );
};