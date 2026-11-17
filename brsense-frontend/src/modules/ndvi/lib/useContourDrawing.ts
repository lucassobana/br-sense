import { useEffect, useState } from "react";
import L from "leaflet";
import {
  circlePolygonFromCenterAndEdge,
  polygonFromVertices,
  type ContourBuildResult,
  type LngLat,
} from "../shared/contours";
import type { ContourDrawState, DrawMode } from "../components/NdviContourTools";

export function useContourDrawing(
  map: L.Map | null,
  enabled: boolean,
  initialMode: DrawMode = "pivo",
): ContourDrawState {
  const [mode, setMode] = useState<DrawMode>(initialMode);
  const [points, setPoints] = useState<LngLat[]>([]);
  const [cursor, setCursor] = useState<LngLat | null>(null);

  useEffect(() => {
    if (!map || !enabled) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      const pt: LngLat = [
        Number(e.latlng.lng.toFixed(6)),
        Number(e.latlng.lat.toFixed(6)),
      ];
      setPoints((current) =>
        mode === "pivo"
          ? current.length === 0
            ? [pt]
            : [current[0], pt]
          : [...current, pt],
      );
    };
    const onMove = (e: L.LeafletMouseEvent) => {
      setCursor([
        Number(e.latlng.lng.toFixed(6)),
        Number(e.latlng.lat.toFixed(6)),
      ]);
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
    };
  }, [enabled, map, mode]);

  let preview: ContourBuildResult | null = null;
  let error = "";
  try {
    if (mode === "pivo") {
      const center = points[0];
      const edge = points[1] ?? cursor;
      if (center && edge) {
        preview = circlePolygonFromCenterAndEdge(center, edge);
      }
    } else {
      const list =
        points.length >= 2 && cursor && points.length < 3
          ? [...points, cursor]
          : points;
      if (list.length >= 3) {
        preview = polygonFromVertices(list);
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Contorno inválido.";
  }

  let confirmed: ContourBuildResult | null = null;
  try {
    if (mode === "pivo" && points.length >= 2) {
      confirmed = circlePolygonFromCenterAndEdge(points[0], points[1]);
    }
    if (mode === "talhao" && points.length >= 3) {
      confirmed = polygonFromVertices(points);
    }
  } catch (e) {
    if (!error) {
      error = e instanceof Error ? e.message : "Contorno inválido.";
    }
  }

  return {
    mode,
    points,
    preview,
    confirmed,
    error,
    setMode(next) {
      setMode(next);
      setPoints([]);
      setCursor(null);
    },
    undo() {
      setPoints((p) => p.slice(0, -1));
    },
    clear() {
      setPoints([]);
      setCursor(null);
    },
  };
}

