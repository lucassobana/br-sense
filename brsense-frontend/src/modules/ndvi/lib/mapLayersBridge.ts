import type { MapLayer } from "../../../types";
import {
  hectaresOf,
  inferAreaType,
  validateGeometry,
} from "../shared/geometry";
import type { NdviArea } from "../shared/types";

const STORAGE_KEY = "brsense-ndvi-custom-areas-v1";

export function loadSavedCustomNdviAreas(): NdviArea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a: NdviArea) => {
      try {
        return (
          typeof a?.id === "string" &&
          typeof a?.name === "string" &&
          !!validateGeometry(a.geometry)
        );
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export function saveCustomNdviAreas(areas: NdviArea[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Converte camadas KML/KMZ já salvas no BR Sense (`MapLayer[]`) em áreas NDVI (`NdviArea[]`).
 */
export function mapLayersToNdviAreas(
  layers: MapLayer[],
  options?: {
    onlyVisible?: boolean;
    visibleLayerIds?: Set<number>;
    hiddenFeatures?: Map<number, Set<number>>;
  },
): NdviArea[] {
  const out: NdviArea[] = [];
  for (const layer of layers) {
    if (options?.onlyVisible && options.visibleLayerIds) {
      if (!options.visibleLayerIds.has(layer.id)) continue;
    } else if (options?.onlyVisible && layer.is_active === false) {
      continue;
    }

    const features = layer.geojson?.features ?? [];
    const hiddenSet =
      options?.hiddenFeatures?.get(layer.id) ??
      new Set<number>(layer.hidden_feature_indices ?? []);

    features.forEach((feature, idx) => {
      if (options?.onlyVisible && hiddenSet.has(idx)) return;
      const geom = feature.geometry;
      if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
        return;
      }
      try {
        // Strip Z coordinates if present in 3D KML rings
        const stripZ = (coords: GeoJSON.Position[]): GeoJSON.Position[] =>
          coords.map((pt) => [Number(pt[0]), Number(pt[1])]);

        const normalizedGeom =
          geom.type === "Polygon"
            ? {
                type: "Polygon" as const,
                coordinates: geom.coordinates.map(stripZ),
              }
            : {
                type: "MultiPolygon" as const,
                coordinates: geom.coordinates.map((poly) => poly.map(stripZ)),
              };

        const validated = validateGeometry(normalizedGeom);
        const propName =
          (feature.properties?.name as string | undefined) ||
          (feature.properties?.Name as string | undefined) ||
          "";
        const featureName = propName.trim()
          ? features.length > 1
            ? `${layer.name} · ${propName.trim()}`
            : propName.trim()
          : features.length > 1
            ? `${layer.name} · Área ${idx + 1}`
            : layer.name;

        out.push({
          id: `layer-${layer.id}-f-${idx}`,
          name: featureName,
          farmName: layer.farm_name || "Fazenda BR Sense",
          city: layer.user_name ? `Cliente: ${layer.user_name}` : "BR Sense",
          type: inferAreaType(featureName, validated),
          crop: "Monitoramento Satelital",
          hectares: hectaresOf(validated),
          geometry: validated,
          source: "sistema",
        });
      } catch {
        // Ignore non-valid or tiny/self-intersecting KML features
      }
    });
  }
  return out;
}

