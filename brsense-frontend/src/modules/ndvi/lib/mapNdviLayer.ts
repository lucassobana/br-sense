import L from "leaflet";
import { boundsOf } from "../shared/geometry";
import type { NdviAnalysis, NdviArea } from "../shared/types";

export interface MapNdviLayerHandle {
  remove(): void;
  bringBelowMarkers(): void;
}

export function attachNdviToLeafletMap(
  map: L.Map,
  area: NdviArea,
  analysis: NdviAnalysis | null,
  options: { opacity?: number; showContour?: boolean } = {},
): MapNdviLayerHandle {
  const group = L.layerGroup().addTo(map);
  const opacity = options.opacity ?? 0.84;

  if (analysis?.pngUrl) {
    const b = analysis.bounds ?? boundsOf(area.geometry);
    L.imageOverlay(
      analysis.pngUrl,
      [
        [b[1], b[0]],
        [b[3], b[2]],
      ],
      {
        opacity,
        interactive: false,
        pane: "overlayPane",
        className: "ndvi-raster",
      },
    ).addTo(group);
  }

  let contour: L.GeoJSON | null = null;
  if (options.showContour !== false) {
    contour = L.geoJSON(
      {
        type: "Feature",
        properties: { id: area.id, name: area.name },
        geometry: area.geometry,
      } as GeoJSON.Feature,
      {
        interactive: false,
        pane: "overlayPane",
        style: {
          color: "#69c3ff",
          weight: 2.2,
          fillOpacity: 0,
        },
      },
    ).addTo(group);
    contour.bringToFront();
  }

  return {
    remove() {
      group.remove();
    },
    bringBelowMarkers() {
      contour?.bringToFront();
    },
  };
}

