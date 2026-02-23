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

    const frame = frames[frameIndex];

    return (
        <TileLayer
            key={frame.time}
            opacity={opacity}
            zIndex={1000}
            url={`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`}
            attribution="Radar © RainViewer"
            updateWhenIdle
            updateWhenZooming={false}
            keepBuffer={2}
        />
    );
}
