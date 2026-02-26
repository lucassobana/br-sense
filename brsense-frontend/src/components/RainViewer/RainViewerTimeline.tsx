import { useState, useEffect } from "react";
import {
    Box,
    HStack,
    IconButton,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Text,
    VStack,
} from "@chakra-ui/react";
import { MdPlayArrow, MdPause } from "react-icons/md";
import type { RadarFrame } from "../../types";

interface RainViewerTimelineProps {
    frames: RadarFrame[];
    frameIndex: number;
    setFrameIndex: (v: number) => void;
    isPlaying: boolean;
    setIsPlaying: (v: boolean) => void;
}

export function RainViewerTimeline({
    frames,
    frameIndex,
    setFrameIndex,
    isPlaying,
    setIsPlaying,
}: RainViewerTimelineProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!frames || frames.length === 0) return null;

    const currentFrame = frames[frameIndex];
    const frameDate = new Date(currentFrame.time * 1000);
    
    const timeString = frameDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 3. Usa o estado 'now' no lugar de 'Date.now()'
    const diffMinutes = Math.round((now - frameDate.getTime()) / 60000);
    
    let timeAgo = '';
    if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        timeAgo = mins > 0 ? `- ${hours}h ${mins}m` : `- ${hours}h`;
    } else if (diffMinutes > 0) {
        timeAgo = `- ${diffMinutes} min`;
    } else {
        timeAgo = "Agora";
    }

    return (
        <Box
            position="absolute"
            bottom="20px"
            left="50%"
            transform="translateX(-50%)"
            zIndex={1000}
            bg="rgba(255,255,255,0.95)"
            px={4}
            py={3}
            borderRadius="lg"
            boxShadow="lg"
            minW="340px"
        >
            <HStack spacing={4}>
                <IconButton
                    aria-label="Play/Pause"
                    icon={isPlaying ? <MdPause /> : <MdPlayArrow />}
                    size="sm"
                    colorScheme="blue"
                    onClick={() => setIsPlaying(!isPlaying)}
                />

                <Slider
                    flex="1"
                    min={0}
                    max={frames.length - 1}
                    step={1}
                    value={frameIndex}
                    onChange={setFrameIndex}
                    colorScheme="blue"
                >
                    <SliderTrack>
                        <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                </Slider>

                <VStack spacing={0} align="flex-end" minW="70px">
                    <Text fontSize="sm" fontWeight="bold" color="gray.700" lineHeight="1">
                        {timeString}
                    </Text>
                    <Text fontSize="10px" fontWeight="bold" color="blue.500" mt={1}>
                        {timeAgo}
                    </Text>
                </VStack>
            </HStack>
        </Box>
    );
}