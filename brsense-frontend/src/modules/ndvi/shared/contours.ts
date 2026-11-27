import type { Polygon, Position } from "geojson";
import { hectaresOf, validateGeometry } from "./geometry";
import type { AreaGeometry, AreaType } from "./types";

export type LngLat = [number, number];

export interface ContourBuildResult {
  geometry: AreaGeometry;
  hectares: number;
  type: AreaType;
  radiusM?: number;
  center?: LngLat;
  edge?: LngLat;
}

const EARTH_RADIUS_M = 6371008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceMeters(a: LngLat, b: LngLat): number {
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const dLat = lat2 - lat1;
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return (
    2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(Math.max(0, h))))
  );
}

export function destinationPoint(
  center: LngLat,
  radiusM: number,
  bearingDeg: number,
): LngLat {
  const angular = radiusM / EARTH_RADIUS_M;
  const bearing = rad(bearingDeg);
  const lat1 = rad(center[1]);
  const lon1 = rad(center[0]);
  const sinLat2 =
    Math.sin(lat1) * Math.cos(angular) +
    Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
  const y = Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1);
  const x = Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2);
  const lon2 = lon1 + Math.atan2(y, x);
  return [((deg(lon2) + 540) % 360) - 180, deg(lat2)];
}

export function circlePolygonFromCenterAndEdge(
  center: LngLat,
  edge: LngLat,
  steps = 64,
): ContourBuildResult {
  const radiusM = distanceMeters(center, edge);
  if (!Number.isFinite(radiusM) || radiusM < 18) {
    throw new Error(
      "O raio do círculo é muito pequeno para leitura Sentinel-2 em 10 m.",
    );
  }
  const count = Math.max(24, Math.min(128, Math.round(steps)));
  const ring: Position[] = [];
  for (let i = 0; i < count; i++) {
    ring.push(destinationPoint(center, radiusM, (i * 360) / count));
  }
  ring.push([...ring[0]]);
  const geometry = validateGeometry({
    type: "Polygon",
    coordinates: [ring],
  } satisfies Polygon);
  return {
    geometry,
    hectares: hectaresOf(geometry),
    type: "pivo",
    radiusM: Math.round(radiusM),
    center,
    edge,
  };
}

export function polygonFromVertices(vertices: LngLat[]): ContourBuildResult {
  if (vertices.length < 3) {
    throw new Error("Marque pelo menos 3 pontos para fechar o polígono.");
  }
  const ring: Position[] = [...vertices.map((p) => [p[0], p[1]]), [...vertices[0]]];
  const geometry = validateGeometry({
    type: "Polygon",
    coordinates: [ring],
  } satisfies Polygon);
  return { geometry, hectares: hectaresOf(geometry), type: "talhao" };
}

