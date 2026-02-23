import {
    Box,
    HStack,
    IconButton,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Text,
} from "@chakra-ui/react";
import { MdPlayArrow, MdPause } from "react-icons/md";

interface RainViewerTimelineProps {
    framesCount: number;
    frameIndex: number;
    setFrameIndex: (v: number) => void;
    isPlaying: boolean;
    setIsPlaying: (v: boolean) => void;
}

export function RainViewerTimeline({
    framesCount,
    frameIndex,
    setFrameIndex,
    isPlaying,
    setIsPlaying,
}: RainViewerTimelineProps) {
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
            minW="320px"
        >
            <HStack spacing={3}>
                <IconButton
                    aria-label="Play/Pause"
                    icon={isPlaying ? <MdPause /> : <MdPlayArrow />}
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                />

                <Slider
                    flex="1"
                    min={0}
                    max={framesCount - 1}
                    step={1}
                    value={frameIndex}
                    onChange={setFrameIndex}
                >
                    <SliderTrack>
                        <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                </Slider>

                <Text fontSize="xs" minW="60px" textAlign="right">
                    {framesCount - frameIndex - 1} min
                </Text>
            </HStack>
        </Box>
    );
}
