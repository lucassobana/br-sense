import { TileLayer } from "react-leaflet";
import type { RadarFrame } from "../../types";

interface RainViewerRadarLayerProps {
    visible: boolean;
    opacity?: number;
    frameIndex: number;
    frames: RadarFrame[];
}

export function RainViewerRadarLayer({
    visible,
    opacity = 0.6,
    frames,
    frameIndex,
}: RainViewerRadarLayerProps) {
    if (!visible || frames.length === 0) return null;

    //! Cor ainda nao foi implementada, entao o valor é fixo = 2
    const colorScheme = 8;

    return (
        <>
            {frames.map((frame, index) => {
                const tileUrl = `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/${colorScheme}/1_1.png?v=${colorScheme}`;

                return (
                    <TileLayer
                        key={`${frame.time}-cor-${colorScheme}`}
                        opacity={index === frameIndex ? opacity : 0}
                        zIndex={1000}
                        url={tileUrl}
                        attribution="Radar © RainViewer"
                        className="radar-smooth-transition"
                        updateWhenZooming={false}
                        keepBuffer={4}
                    />
                );
            })}
        </>
    );
}