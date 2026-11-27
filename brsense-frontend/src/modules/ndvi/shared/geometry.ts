import type { MultiPolygon, Polygon, Position } from "geojson";
import type { AreaGeometry, AreaType } from "./types";

const EARTH_RADIUS = 6378137;

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function same(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function closeRing(r: Position[]): Position[] {
  const clean = r
    .filter(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]),
    )
    .map((p) => [Number(p[0]), Number(p[1])]);
  if (clean.length < 3) {
    throw new Error("O contorno precisa de pelo menos 3 vértices.");
  }
  if (!same(clean[0], clean[clean.length - 1])) {
    clean.push([...clean[0]]);
  }
  if (clean.length < 4) {
    throw new Error("O contorno precisa formar uma área fechada.");
  }
  return clean;
}

function ringAreaM2(coords: Position[]): number {
  const n = coords.length - 1;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % n];
    const p3 = coords[(i + 2) % n];
    total += (rad(p3[0]) - rad(p1[0])) * Math.sin(rad(p2[1]));
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

export function geometryAreaM2(g: AreaGeometry): number {
  if (g.type === "Polygon") {
    if (!g.coordinates.length) return 0;
    let total = ringAreaM2(g.coordinates[0]);
    for (let i = 1; i < g.coordinates.length; i++) {
      total -= ringAreaM2(g.coordinates[i]);
    }
    return Math.max(0, total);
  }
  return g.coordinates.reduce(
    (acc, poly) =>
      acc + geometryAreaM2({ type: "Polygon", coordinates: poly }),
    0,
  );
}

function ccw(a: Position, b: Position, c: Position): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: Position, b: Position, p: Position): boolean {
  return (
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  );
}

function segmentsIntersect(
  a: Position,
  b: Position,
  c: Position,
  d: Position,
): boolean {
  const d1 = ccw(c, d, a);
  const d2 = ccw(c, d, b);
  const d3 = ccw(a, b, c);
  const d4 = ccw(a, b, d);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }
  if (d1 === 0 && onSegment(c, d, a)) return true;
  if (d2 === 0 && onSegment(c, d, b)) return true;
  if (d3 === 0 && onSegment(a, b, c)) return true;
  if (d4 === 0 && onSegment(a, b, d)) return true;
  return false;
}

function ringHasSelfIntersection(ring: Position[]): boolean {
  const segCount = ring.length - 1;
  for (let i = 0; i < segCount; i++) {
    const a1 = ring[i];
    const a2 = ring[i + 1];
    for (let j = i + 2; j < segCount; j++) {
      if (i === 0 && j === segCount - 1) continue;
      const b1 = ring[j];
      const b2 = ring[j + 1];
      if (same(a1, b1) || same(a1, b2) || same(a2, b1) || same(a2, b2)) {
        continue;
      }
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

function pointInRing(pt: [number, number], ring: Position[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(
  pt: [number, number],
  g: AreaGeometry,
): boolean {
  const checkPolygon = (rings: Position[][]): boolean => {
    if (!rings.length || !pointInRing(pt, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(pt, rings[i])) return false;
    }
    return true;
  };
  if (g.type === "Polygon") {
    return checkPolygon(g.coordinates);
  }
  return g.coordinates.some((rings) => checkPolygon(rings));
}

export function validateGeometry(input: unknown): AreaGeometry {
  if (!input || typeof input !== "object") {
    throw new Error("Geometria ausente.");
  }
  const g = input as AreaGeometry;
  const normalized: AreaGeometry =
    g.type === "Polygon"
      ? ({
          type: "Polygon",
          coordinates: g.coordinates.map(closeRing),
        } satisfies Polygon)
      : g.type === "MultiPolygon"
        ? ({
            type: "MultiPolygon",
            coordinates: g.coordinates.map((p) => p.map(closeRing)),
          } satisfies MultiPolygon)
        : (() => {
            throw new Error("Use apenas Polígono ou Multipolígono.");
          })();

  const pts =
    normalized.type === "Polygon"
      ? normalized.coordinates.flat()
      : normalized.coordinates.flat(2);
  if (pts.length > 5000) {
    throw new Error(
      "O contorno tem muitos vértices. Simplifique o arquivo KML.",
    );
  }
  for (const [lon, lat] of pts) {
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new Error("Coordenadas fora do padrão WGS84.");
    }
  }

  const rings =
    normalized.type === "Polygon"
      ? normalized.coordinates
      : normalized.coordinates.flat();
  for (const r of rings) {
    if (ringHasSelfIntersection(r)) {
      throw new Error("O contorno possui linhas que se cruzam.");
    }
  }

  const m2 = geometryAreaM2(normalized);
  if (m2 < 1000) {
    throw new Error("A área é muito pequena para leitura em 10 metros.");
  }
  if (m2 > 200_000_000) {
    throw new Error("A área excede o limite de 20.000 ha por consulta.");
  }
  return normalized;
}

export function hectaresOf(g: AreaGeometry): number {
  return Math.round((geometryAreaM2(g) / 10000) * 10) / 10;
}

export function boundsOf(g: AreaGeometry): [number, number, number, number] {
  const pts =
    g.type === "Polygon" ? g.coordinates.flat() : g.coordinates.flat(2);
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const p of pts) {
    if (p[0] < minLon) minLon = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[0] > maxLon) maxLon = p[0];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return [minLon, minLat, maxLon, maxLat];
}

export function inferAreaType(name: string, g: AreaGeometry): AreaType {
  if (/piv[oô]/i.test(name)) return "pivo";
  const ring =
    g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0];
  const b = boundsOf(g);
  const cx = (b[0] + b[2]) / 2;
  const cy = (b[1] + b[3]) / 2;
  const c = Math.cos((cy * Math.PI) / 180);
  const dists = ring
    .slice(0, -1)
    .map((p) => Math.hypot((p[0] - cx) * c, p[1] - cy));
  const avg = dists.reduce((a, v) => a + v, 0) / dists.length;
  const maxDev = Math.max(...dists.map((d) => Math.abs(d - avg) / avg));
  return ring.length >= 16 && maxDev < 0.14 ? "pivo" : "talhao";
}

